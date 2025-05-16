import {
    ModuleSideEffectCallback,
    ModuleInput,
    FetchedScript,
    ScriptSideEffectCallback,
    LightLibraryWithAliasQueryString,
    BackendInputs,
    EsmInputs,
    InstallInputs,
    QueryLoadingGraphInputs,
    PyodideInputs,
    CssSideEffectCallback,
    Library,
    defaultEsmInput,
} from './inputs.models'
import {
    CdnEvent,
    ConsoleEvent,
    CssLoadingEvent,
    CssParsedEvent,
    ParseErrorEvent,
    SourceLoadedEvent,
    SourceParsedEvent,
    UnauthorizedEvent,
    UrlNotFoundEvent,
} from './events.models'
import { UrlNotFound, SourceParsingFailed, Unauthorized } from './errors.models'
import { StateImplementation } from './state'
import { Client } from './client'
import pkgJson from '../../package.json'

const Status200 = 200
const Status401 = 401
const Status403 = 403
const Status404 = 404

export function onHttpRequestLoad(
    req: XMLHttpRequest,
    event: ProgressEvent<XMLHttpRequestEventTarget>,
    resolve: (args: unknown) => void,
    reject: (args: unknown) => void,
    {
        url,
        name,
        assetId,
        version,
    }: { url: string; name: string; assetId: string; version: string },
    onEvent?: (ev: CdnEvent) => void,
) {
    if (req.status === Status200) {
        const content = req.responseText + `\n//# sourceMappingURL=${url}.map`
        onEvent?.(new SourceLoadedEvent(name, assetId, url, version, event))
        resolve({
            name,
            version,
            assetId,
            url,
            content,
            progressEvent: event,
        } as FetchedScript)
    }
    if (req.status === Status401 || req.status === Status403) {
        const unauthorized = new UnauthorizedEvent(name, assetId, url, version)
        onEvent?.(unauthorized)
        reject(new Unauthorized({ assetId, name, url }))
    }
    if (req.status === Status404) {
        const urlNotFound = new UrlNotFoundEvent(name, assetId, url, version)
        onEvent?.(urlNotFound)
        reject(new UrlNotFound({ assetId, name, url }))
    }
}

export function sanitizeModules(
    modules: (ModuleInput | string)[],
): { name: string; version: string; sideEffects?: ModuleSideEffectCallback }[] {
    interface T {
        name: string
        version: string
        sideEffects?: ModuleSideEffectCallback
    }
    return modules.reduce((acc: T[], e: ModuleInput | string) => {
        if (typeof e !== 'string') {
            return [...acc, e]
        }
        const base = e.split(' as ')[0]
        return [
            ...acc,
            {
                name: base.includes('#') ? base.split('#')[0] : base,
                version: base.includes('#')
                    ? base.split('#')[1].replace('latest', '*')
                    : '*',
            },
        ]
    }, [])
}

/**
 * Parse a resource id in the form `{libraryName}#{version}~{rest-of-path}` where:
 * -    libraryName is the name of the library
 * -    version is the target version
 * -    rest-of-path is the partial url from the package's directory to the target CSS
 *
 * @param resourceId resource id in the form `{libraryName}#{version}~{rest-of-path}`
 * @category Helpers
 */
export function parseResourceId(resourceId: string): {
    name: string
    version: string
    path: string
    assetId: string
    url: string
} {
    const name = resourceId.split('#')[0]
    const version = resourceId.split('#')[1].split('~')[0]
    const path = resourceId.split('#')[1].split('~')[1]
    const assetId = getAssetId(name)
    const url = `${getUrlBase(name, version)}/${path}`
    return { name, version, path, assetId, url }
}

export async function applyModuleSideEffects({
    origin,
    htmlScriptElement,
    lib,
    executingWindow,
    userSideEffects,
    onEvent,
}: {
    origin: FetchedScript
    htmlScriptElement?: HTMLScriptElement
    lib: Library
    executingWindow: WindowOrWorkerGlobalScope
    userSideEffects: ModuleSideEffectCallback[]
    onEvent: (CdnEvent) => void
}) {
    type Module = Record<string, unknown>
    type MaybeModule = Module | undefined
    const module = lib.exportPath.reduce(
        (acc: MaybeModule, e) => (acc ? acc[e] : undefined),
        executingWindow,
    ) as MaybeModule
    if (!module) {
        console.error(`Module ${origin.name} not found`, {
            executingWindow,
            exportPath: lib.exportPath,
        })
        return
    }

    StateImplementation.registerEsmModules(
        [
            {
                name: origin.name,
                version: lib.version,
                exportPath: lib.exportPath,
                aliases: lib.aliases,
                versionNumber: lib.versionNumber,
                apiKey: lib.apiKey,
            },
        ],
        executingWindow,
    )

    // This is when this instance of webpm-client is installing
    // => the configuration needs to be propagated
    // The configuration is initially set by the root script of '@w3nest/webpm-client'.
    if ([pkgJson.name].includes(origin.name)) {
        const installedClient = (module as { Client: typeof Client }).Client
        installedClient.FrontendConfiguration = Client.FrontendConfiguration
        installedClient.BackendConfiguration = Client.BackendConfiguration
    }
    for (const sideEffectFct of userSideEffects) {
        const args = {
            module,
            origin,
            htmlScriptElement,
            executingWindow,
            onEvent,
        }
        if (sideEffectFct.constructor.name === 'AsyncFunction') {
            await sideEffectFct(args)
            // noinspection ContinueStatementJS
            continue
        }
        const r = sideEffectFct(args)
        if (r instanceof Promise) {
            r.then(
                () => {
                    /*No OP*/
                },
                () => {
                    throw Error(
                        `Error while applying side effects for ${origin.name}#${origin.version} (${origin.url})`,
                    )
                },
            )
        }
    }
}

export function importScriptMainWindow({
    url,
    assetId,
    version,
    name,
    content,
    executingWindow,
}: {
    url: string
    assetId: string
    version: string
    name: string
    content: string
    executingWindow: Window
}): HTMLScriptElement | ErrorEvent {
    const head = document.getElementsByTagName('head')[0]
    if (executingWindow.document.getElementById(url)) {
        return executingWindow.document.getElementById(url) as HTMLScriptElement
    }
    const script = document.createElement('script')
    if (Client.FrontendConfiguration.crossOrigin !== undefined) {
        script.crossOrigin = Client.FrontendConfiguration.crossOrigin
    }
    const classes = [assetId, name, version].map((key) => sanitizeCssId(key))
    script.classList.add(...classes)
    script.innerHTML = content
    let error: ErrorEvent | undefined = undefined
    const onErrorParsing = (d: ErrorEvent) => {
        executingWindow.removeEventListener('error', onErrorParsing)
        error = d
    }
    executingWindow.addEventListener('error', onErrorParsing)
    head.appendChild(script)
    executingWindow.removeEventListener('error', onErrorParsing)
    //script.src = url
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return error ?? script
}

export function importScriptWebWorker({
    url,
}: {
    url: string
}): undefined | Error {
    const cacheKey = 'cdnClientImportedScriptUrls'
    const importedScripts = (self[cacheKey] || []) as unknown as string[]
    if (importedScripts.includes(url)) {
        return
    }
    try {
        // The way scripts are imported into workers depend on FrontendConfiguration.crossOrigin attribute.
        // It is implemented in the function 'entryPointInstall'

        // @ts-expect-error To be refactored
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        self.customImportScripts(url)
        self[cacheKey] = [...importedScripts, url]
    } catch (error: unknown) {
        console.error(`Failed to import script ${url} in WebWorker`, error)
        return new Error(`Failed to import script ${url} in WebWorker`)
    }
}

export async function addScriptElements(
    sources: (FetchedScript & { sideEffect?: ScriptSideEffectCallback })[],
    executingWindow?: WindowOrWorkerGlobalScope,
    onEvent?: (event: CdnEvent) => void,
) {
    if (sources.length === 0) {
        return
    }
    executingWindow ??= window
    const sideEffects = sources
        .map(
            ({
                name,
                assetId,
                version,
                url,
                content,
                progressEvent,
                sideEffect,
            }) => {
                const scriptOrError = isInstanceOfWindow(executingWindow)
                    ? importScriptMainWindow({
                          url,
                          assetId,
                          version,
                          name,
                          content,
                          executingWindow: executingWindow,
                      })
                    : importScriptWebWorker({ url })

                if (
                    scriptOrError instanceof Error ||
                    scriptOrError instanceof ErrorEvent
                ) {
                    console.error(
                        `Failed to parse source code of ${name}#${version}: ${scriptOrError.message}`,
                    )
                    onEvent?.(new ParseErrorEvent(name, assetId, url, version))
                    throw new SourceParsingFailed({
                        assetId,
                        name,
                        url,
                        message: scriptOrError.message,
                    })
                }
                onEvent?.(new SourceParsedEvent(name, assetId, url, version))
                if (sideEffect) {
                    return sideEffect({
                        origin: {
                            name,
                            assetId,
                            version,
                            url,
                            content,
                            progressEvent,
                        },
                        // If the script has been imported in web-worker, scriptOrError is undefined.
                        // It can't be anything else as there is no concept of DOM in web-worker.
                        htmlScriptElement: scriptOrError,
                        executingWindow,
                    })
                }
            },
        )
        .filter((sideEffect) => sideEffect !== undefined)
    await Promise.all(sideEffects)
}

/**
 * Returns the assetId from a name.
 * It does not imply that the asset exist.
 *
 * @param name name of the package (as defined in package.json)
 * @returns assetId used in the assets store
 * @category Helpers
 */
export function getAssetId(name: string) {
    return window.btoa(name)
}

/**
 * Returns the base url to access a CDN asset from its name & version.
 * It does not imply that the asset exist.
 *
 * @param name name of the package (as defined in package.json).
 * @param version version of the package (as defined in package.json).
 * @returns base url to access the resource.
 * @category Helpers
 */
export function getUrlBase(name: string, version: string) {
    const assetId = getAssetId(name)
    return `${Client.BackendConfiguration.urlResource}/${assetId}/${version}`
}

export function isInstanceOfWindow(
    scope: WindowOrWorkerGlobalScope,
): scope is Window {
    return (scope as { document?: unknown }).document !== undefined
}

export function extractInlinedAliases(
    modules: LightLibraryWithAliasQueryString[],
    suffix = '',
) {
    return modules
        .filter((module) => module.includes(' as '))
        .reduce((acc, module) => {
            const alias = module.split(' as ')[1].trim()
            const pointer = module.split(' as ')[0].trim()
            const name = pointer.split('#')[0]
            const semver = pointer.includes('#') ? pointer.split('#')[1] : '*'
            return {
                ...acc,
                [alias]: `${name}${suffix}#${semver}`,
            }
        }, {})
}

export const PARTITION_PREFIX = '%p-'

export function normalizeBackendInputs(inputs: InstallInputs): BackendInputs {
    const emptyInstaller = {
        modules: [],
        configurations: {},
        partition: Client.backendsPartitionId,
    }
    if (!inputs.backends) {
        return emptyInstaller
    }
    if (Array.isArray(inputs.backends)) {
        return {
            ...emptyInstaller,
            modules: inputs.backends,
        }
    }
    return {
        ...emptyInstaller,
        ...inputs.backends,
    }
}

export function normalizeEsmInputs(inputs: InstallInputs): EsmInputs {
    const emptyInstaller = {
        modules: [],
        ...defaultEsmInput,
    }
    if (!inputs.esm) {
        return emptyInstaller
    }
    if (Array.isArray(inputs.esm)) {
        return {
            ...emptyInstaller,
            modules: inputs.esm,
        }
    }
    return {
        ...emptyInstaller,
        ...inputs.esm,
    }
}

export function normalizePyodideInputs(inputs: InstallInputs): PyodideInputs {
    const emptyInstaller = {
        modules: [],
    }
    if (!inputs.pyodide) {
        return emptyInstaller
    }
    if (Array.isArray(inputs.pyodide)) {
        return {
            ...emptyInstaller,
            modules: inputs.pyodide,
        }
    }
    return {
        ...emptyInstaller,
        ...inputs.pyodide,
    }
}

export function normalizeLoadingGraphInputs(
    inputs: QueryLoadingGraphInputs,
): QueryLoadingGraphInputs {
    return {
        usingDependencies: [],
        ...inputs,
    }
}

export interface InstallInputsNormalized {
    esm: EsmInputs
    backends: BackendInputs
    pyodide: PyodideInputs
    css?: InstallInputs['css']
    executingWindow?: InstallInputs['executingWindow']
    onEvent?: InstallInputs['onEvent']
}

export function normalizeInstallInputs(
    inputs: InstallInputs,
): InstallInputsNormalized {
    const sanitizedInputs = inputs

    return {
        ...sanitizedInputs,
        backends: normalizeBackendInputs(sanitizedInputs),
        esm: normalizeEsmInputs(sanitizedInputs),
        pyodide: normalizePyodideInputs(sanitizedInputs),
    }
}

export function appendStyleSheet({
    assetId,
    version,
    name,
    url,
    sideEffects,
    renderingWindow,
    onEvent,
}: {
    assetId: string
    version: string
    name: string
    url: string
    sideEffects?: CssSideEffectCallback
    renderingWindow: Window
    onEvent: (ev: CdnEvent) => void
}) {
    const logError = (text: string) => {
        onEvent(new ConsoleEvent('Error', 'CSS', text))
    }
    return new Promise<HTMLLinkElement>((resolveCb, rejectCb) => {
        onEvent(new CssLoadingEvent(name, assetId, url, version))
        const link = renderingWindow.document.createElement('link')
        link.id = url
        if (Client.FrontendConfiguration.crossOrigin !== undefined) {
            link.crossOrigin = Client.FrontendConfiguration.crossOrigin
        }
        const classes = [assetId, name, version].map((key) =>
            sanitizeCssId(key),
        )
        link.classList.add(...classes)
        link.setAttribute('type', 'text/css')
        link.href = url
        link.rel = 'stylesheet'
        renderingWindow.document
            .getElementsByTagName('head')[0]
            .appendChild(link)

        link.onerror = (e) => {
            console.error('Failed to append style sheet', e)
            logError(`Failed to install stylesheet from ${url}`)
            fetch(url, { method: 'HEAD', credentials: 'include' }).then(
                (response) => {
                    logError(
                        `Status: ${String(response.status)} ${response.statusText}`,
                    )
                    if (response.status === 401) {
                        onEvent(
                            new UnauthorizedEvent(name, assetId, url, version),
                        )
                        rejectCb(new Error(`Unauthorized: ${url}`))
                        return
                    } else if ([404, 405].includes(response.status)) {
                        onEvent(
                            new UrlNotFoundEvent(name, assetId, url, version),
                        )
                        rejectCb(new Error(`Not Found: ${url}`))
                        return
                    }
                    rejectCb(new Error(`Unknown Error: ${url}`))
                },
                (e: unknown) => {
                    console.error("Call to 'fetch' failed", e)
                    logError(`Failed to trigger fetch on ${url}`)
                },
            )
        }
        link.onload = () => {
            const se = sideEffects?.({
                origin: {
                    moduleName: name,
                    version,
                    assetId,
                    url,
                },
                htmlLinkElement: link,
                renderingWindow,
            })
            if (se instanceof Promise) {
                se.then(
                    () => {
                        /*No OP*/
                    },
                    () => {
                        throw Error(
                            `Failed to apply side effects for ${name}#${version}`,
                        )
                    },
                )
            }
            onEvent(new CssParsedEvent(name, assetId, url, version))
            resolveCb(link)
        }
    })
}

function sanitizeCssId(id: string) {
    return (
        'webpm-client_' +
        id
            .replace(/\//g, '-') // replace all '/' with '-'
            .replace(/\./g, '-') // replace all '.' with '-'
            .replace(/@/g, '') // remove all '@'
    )
}
