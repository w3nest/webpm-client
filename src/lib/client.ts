import {
    InstallModulesInputs,
    LoadingGraph,
    InstallScriptsInputs,
    InstallStyleSheetsInputs,
    InstallLoadingGraphInputs,
    FetchScriptInputs,
    QueryLoadingGraphInputs,
    FetchedScript,
    Library,
    BackendConfig,
    InstallInputs,
} from './inputs.models'
import {
    InstallInputsDeprecated,
    isDeprecatedInputs,
    upgradeInstallInputs,
} from './inputs.models.deprecated'
import {
    SourceLoadedEvent,
    SourceLoadingEvent,
    StartEvent,
    CdnLoadingGraphErrorEvent,
    InstallDoneEvent,
    CdnEvent,
    InstallErrorEvent,
    ConsoleEvent,
    SourceParsedEvent,
    CssParsedEvent,
    CdnLoadingGraphQueryEvent,
    CdnLoadingGraphResolvedEvent,
} from './events.models'
import {
    CdnError,
    errorFactory,
    FetchErrors,
    LoadingGraphError,
} from './errors.models'
import { StateImplementation } from './state'
import { LoadingScreenView } from './loader.view'
import { satisfies } from 'semver'
import {
    addScriptElements,
    applyModuleSideEffects,
    onHttpRequestLoad,
    sanitizeModules,
    parseResourceId,
    installAliases,
    isInstanceOfWindow,
    extractInlinedAliases,
    extractModulesToInstall,
    normalizeBackendInputs,
    PARTITION_PREFIX,
    normalizeEsmInputs,
    normalizePyodideInputs,
    normalizeLoadingGraphInputs,
    appendStyleSheet,
} from './utils'
import { BackendConfiguration } from './backend-configuration'
import { FrontendConfiguration } from './frontend-configuration'
import { installBackends } from './backends'
import { installPython } from './python'

export function getBackendsPartitionUID() {
    const uid = String(Math.floor(Math.random() * Math.pow(10, 6)))
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!globalThis.document) {
        // This branch is executed within web worker.
        // The initial value returned here will be overridden from the one forwarded from the
        // 'master' module running in the main thread.
        // See {@link setupWorkersPoolModule} & {@link WorkersModule.entryPointInstall}
        return uid
    }
    const key = 'backendsPartitionID'
    const generateTabId = () => `${document.title}~${uid}`
    const item = generateTabId()
    if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, item)
    }
    return item
}

/**
 *
 * Install resources; see documentation provided for {@link InstallInputs}.
 *
 * @category Getting Started
 * @category Entry Points
 * @param inputs
 *
 */
export function install(
    inputs: InstallInputsDeprecated | InstallInputs,
): Promise<WindowOrWorkerGlobalScope> {
    return new Client().install(inputs)
}

/**
 * Query the loading graph of modules, the direct & indirect dependencies as well as their relation.
 *
 * @param inputs Query inputs.
 * @returns The loading graph response from the server.
 */
export function queryLoadingGraph(
    inputs: QueryLoadingGraphInputs,
): Promise<LoadingGraph> {
    return new Client().queryLoadingGraph(inputs)
}

export function fetchScript(inputs: FetchScriptInputs): Promise<FetchedScript> {
    /**
     * Deprecated.
     */
    return new Client().fetchScript(inputs)
}

export function installLoadingGraph(inputs: InstallLoadingGraphInputs) {
    /**
     * Deprecated
     */
    return new Client().installLoadingGraph(inputs)
}

/**
 *
 * The client.
 *
 * @hidden
 */
export class Client {
    static backendsPartitionId = getBackendsPartitionUID()

    /**
     * Backend configuration.
     */
    public static BackendConfiguration: BackendConfiguration

    /**
     * Frontend configuration
     */
    public static FrontendConfiguration: FrontendConfiguration = {}

    static Headers: Record<string, string> = {}
    /**
     * Default static hostname (if none provided at instance construction).
     *
     * Empty string leads to relative resolution.
     */
    static HostName = ''

    /**
     * Headers used when doing HTTP requests.
     *
     * `this.headers =  headers ? {...Client.Headers, ...headers } : Client.Headers`
     */
    public readonly headers: Record<string, string> = {}

    /**
     * @param params options setting up HTTP requests
     * @param params.headers headers forwarded by every request, in addition to {@link Client.Headers}.
     */
    constructor(
        params: {
            headers?: Record<string, string>
        } = {},
    ) {
        this.headers = { ...Client.Headers, ...(params.headers ?? {}) }
    }

    /**
     * Query a loading graph provided a list of modules, see {@link QueryLoadingGraphInputs}.
     *
     * @param inputs
     *
     * @hidden
     */
    async queryLoadingGraph(
        inputs: QueryLoadingGraphInputs,
    ): Promise<LoadingGraph> {
        inputs = normalizeLoadingGraphInputs(inputs)
        const key = JSON.stringify(inputs)
        const usingDependencies = inputs.usingDependencies ?? []
        const body = {
            libraries: sanitizeModules(inputs.modules),
            using: usingDependencies.reduce((acc, dependency) => {
                return {
                    ...acc,
                    [dependency.split('#')[0]]: dependency.split('#')[1],
                }
            }, {}),
            extraIndex: inputs.extraIndex,
        }
        const finalize = async () => {
            const content =
                await StateImplementation.fetchedLoadingGraph.get(key)
            if (content !== undefined && 'lock' in content) {
                return content
            }
            throw errorFactory(content as unknown as CdnError)
        }
        if (key in StateImplementation.fetchedLoadingGraph) {
            return finalize()
        }
        const request = new Request(
            Client.BackendConfiguration.urlLoadingGraph,
            {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    ...this.headers,
                    'content-type': 'application/json',
                },
            },
        )
        StateImplementation.fetchedLoadingGraph.set(
            key,
            fetch(request)
                .then((resp) => resp.json())
                .then((resp: LoadingGraph | CdnError) => {
                    if ('lock' in resp) {
                        resp.lock.forEach((lock) => {
                            lock.exportedSymbol = lock.name
                        })
                    }
                    return resp
                }),
        )
        return finalize()
    }

    /**
     * Fetch content of a javascript file.
     *
     * @param inputs
     */
    async fetchScript(inputs: FetchScriptInputs): Promise<FetchedScript> {
        let { url, name } = inputs
        const onEvent = inputs.onEvent
        if (!url.startsWith(Client.BackendConfiguration.urlResource)) {
            url = url.startsWith('/') ? url : `/${url}`
            url = `${Client.BackendConfiguration.urlResource}${url}`
        }

        const parts = url
            .substring(Client.BackendConfiguration.urlResource.length)
            .split('/')
        const assetId = parts[1]
        const version = parts[2]
        name ??= parts[parts.length - 1]
        url = StateImplementation.getPatchedUrl({
            name,
            version,
            assetId,
            url,
        })
        const importedScript = StateImplementation.importedScripts.get(url)
        if (importedScript) {
            const { progressEvent } = await importedScript
            onEvent?.(
                new SourceLoadedEvent(
                    name,
                    assetId,
                    url,
                    version,
                    progressEvent,
                ),
            )
            return importedScript
        }
        if (!isInstanceOfWindow(globalThis)) {
            // In a web-worker the script will be imported using self.importScripts(url).
            // No need to pre-fetch the source file in this case.
            return Promise.resolve({
                name,
                version,
                assetId,
                url,
                content: '',
                progressEvent: new ProgressEvent(
                    '',
                ) as ProgressEvent<XMLHttpRequestEventTarget>,
            })
        }
        const scriptPromise = new Promise<FetchedScript>((resolve, reject) => {
            const req = new XMLHttpRequest()
            // report progress events
            req.addEventListener(
                'progress',
                function (event) {
                    onEvent?.(
                        new SourceLoadingEvent(
                            name,
                            assetId,
                            url,
                            version,
                            event,
                        ),
                    )
                },
                false,
            )

            req.addEventListener(
                'load',
                function (event: ProgressEvent<XMLHttpRequestEventTarget>) {
                    onHttpRequestLoad(
                        req,
                        event,
                        resolve,
                        reject,
                        { url, name, assetId, version },
                        onEvent,
                    )
                },
                false,
            )
            req.open('GET', url)
            req.responseType = 'text' // Client.responseParser ? 'blob' : 'text'
            req.send()
            onEvent?.(new StartEvent(name, assetId, url, version))
        })
        StateImplementation.importedScripts.set(url, scriptPromise)
        return scriptPromise
    }

    /**
     * Install a various set of modules, scripts & stylesheets; see documentation in {@link InstallInputsDeprecated}.
     *
     * @param inputs
     */
    install(
        inputs: InstallInputs | InstallInputsDeprecated,
    ): Promise<WindowOrWorkerGlobalScope> {
        const sanitizedInputs = isDeprecatedInputs(inputs)
            ? upgradeInstallInputs(inputs)
            : inputs

        const css = inputs.css ?? []
        const executingWindow = inputs.executingWindow ?? globalThis
        const display = sanitizedInputs.displayLoadingScreen ?? false
        let loadingScreen: LoadingScreenView | undefined = undefined
        if (display) {
            loadingScreen = new LoadingScreenView()
            loadingScreen.render()
        }
        const onEvent = (ev: CdnEvent) => {
            if (loadingScreen) {
                loadingScreen.next(ev)
            }
            sanitizedInputs.onEvent?.(ev)
        }
        const esmInputs = normalizeEsmInputs(sanitizedInputs)
        const esmInlinedAliases = extractInlinedAliases(esmInputs.modules)
        const pyodideInputs = normalizePyodideInputs(sanitizedInputs)
        const backendInputs = normalizeBackendInputs(sanitizedInputs)

        const pyodidePromise = sanitizedInputs.pyodide
            ? installPython({
                  ...pyodideInputs,
                  urlPyodide: Client.BackendConfiguration.urlPyodide,
                  urlPypi: Client.BackendConfiguration.urlPypi,
                  onEvent,
              })
            : Promise.resolve()

        const backendPartition =
            backendInputs.partition ?? Client.backendsPartitionId
        const backendInlinedAliases = extractInlinedAliases(
            backendInputs.modules,
            `${PARTITION_PREFIX}${backendPartition}`,
        )

        const modulesPromise = this.installModules({
            modules: [...esmInputs.modules, ...backendInputs.modules],
            backendsConfig: backendInputs.configurations ?? {},
            backendsPartitionId: backendPartition,
            modulesSideEffects: esmInputs.modulesSideEffects,
            usingDependencies: esmInputs.usingDependencies,
            aliases: {
                ...esmInputs.aliases,
                ...esmInlinedAliases,
                ...backendInlinedAliases,
            },
            executingWindow,
            onEvent,
        })

        const cssPromise = isInstanceOfWindow(executingWindow)
            ? this.installStyleSheets({
                  css,
                  renderingWindow: executingWindow,
                  onEvent: inputs.onEvent,
              })
            : Promise.resolve()

        const scriptsPromise = modulesPromise.then(() => {
            return this.installScripts({
                scripts: esmInputs.scripts ?? [],
                executingWindow,
                aliases: esmInputs.aliases,
            })
        })

        return Promise.all([scriptsPromise, cssPromise, pyodidePromise]).then(
            () => {
                onEvent(new InstallDoneEvent())
                if (loadingScreen) {
                    loadingScreen.done()
                }
                return executingWindow
            },
            (error: unknown) => {
                onEvent(new InstallErrorEvent())
                throw error
            },
        )
    }

    /**
     * Install a loading graph; see {@link InstallLoadingGraphInputs}.
     *
     * Loading graph can be retrieved using {@link Client.queryLoadingGraph} or
     * {@link queryLoadingGraph}.
     *
     * @param inputs
     */
    async installLoadingGraph(inputs: InstallLoadingGraphInputs) {
        const onEvent =
            inputs.onEvent ??
            (() => {
                /*No OP*/
            })
        const log = (text: string, level: 'Info' | 'Error' = 'Info') => {
            onEvent(new ConsoleEvent(level, 'LoadingGraph', text))
        }
        const all = inputs.loadingGraph.lock
            .map((pack) => [pack.id, pack])
            .reduce<
                Record<string, Library>
            >((acc, [k, v]: [string, Library]) => ({ ...acc, [k]: v }), {})
        inputs.backendsPartitionId ??= Client.backendsPartitionId
        inputs.backendsConfig ??= {}

        inputs.loadingGraph.definition.forEach((layer, index) => {
            log(
                `Layer ${String(index)} includes ${String(layer.length)} modules`,
            )
        })
        const graph_fronts = inputs.loadingGraph.definition.map((layer) =>
            layer.filter((l) => all[l[0]].type !== 'backend'),
        )
        const graph_backs = inputs.loadingGraph.definition.map((layer) =>
            layer.filter((l) => all[l[0]].type === 'backend'),
        )
        const executingWindow = inputs.executingWindow ?? window

        StateImplementation.updateExportedSymbolsDict(
            inputs.loadingGraph.lock,
            inputs.backendsPartitionId,
        )

        const packagesSelected = graph_fronts
            .flat()
            .map(([assetId, cdn_url]) => {
                const version = cdn_url.split('/')[1]
                const asset = inputs.loadingGraph.lock.find(
                    (asset) =>
                        asset.id === assetId && asset.version === version,
                )
                if (!asset) {
                    throw Error(
                        `Can not find expected asset ${assetId} in loading graph`,
                    )
                }
                const url = `${Client.BackendConfiguration.urlResource}/${cdn_url}`
                log(`Entry point ${asset.name}#${asset.version} : ${url}`)
                return {
                    assetId,
                    url,
                    name: asset.name,
                    version: asset.version,
                }
            })
            .filter(({ name, version, url, assetId }) => {
                const existCompatible =
                    StateImplementation.isCompatibleVersionInstalled(
                        name,
                        version,
                    )
                log(
                    `Compatible version found in runtime for ${name}#${version}: ${String(existCompatible)}`,
                )
                if (existCompatible) {
                    onEvent(new SourceParsedEvent(name, assetId, url, version))
                }
                return !existCompatible
            })
        const errors: unknown[] = []
        const futures = packagesSelected.map(
            ({ name, url }: { name: string; url: string }) => {
                return this.fetchScript({
                    name,
                    url,
                    onEvent: inputs.onEvent,
                }).catch((error: unknown) => {
                    log(`Error while fetching script at ${url}`, 'Error')
                    errors.push(error)
                })
            },
        )
        const sourcesOrErrors = await Promise.all([
            ...futures,
            this.installBackends(
                {
                    ...inputs.loadingGraph,
                    definition: graph_backs,
                },
                inputs.backendsConfig,
                inputs.backendsPartitionId,
                inputs.onEvent ??
                    (() => {
                        /*No OP*/
                    }),
                inputs.executingWindow ?? window,
            ),
        ])
        if (errors.length > 0) {
            throw new FetchErrors({ errors })
        }
        const sources = sourcesOrErrors
            .filter((d) => d !== undefined)
            .map((d) => d)
            .map((origin: FetchedScript) => {
                const userSideEffects = Object.entries(
                    inputs.modulesSideEffects ?? {},
                )
                    .filter(([key]) => {
                        const query = key.includes('#') ? key : `${key}#*`
                        if (query.split('#')[0] !== origin.name) {
                            return false
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                        return satisfies(
                            origin.version.replace('-wip', ''),
                            query.split('#')[1],
                        )
                    })
                    .map(([, value]) => value)
                return {
                    ...origin,
                    sideEffect: async ({
                        htmlScriptElement,
                    }: {
                        htmlScriptElement?: HTMLScriptElement
                    }) => {
                        await applyModuleSideEffects({
                            origin,
                            htmlScriptElement,
                            executingWindow,
                            userSideEffects,
                            onEvent:
                                inputs.onEvent ??
                                (() => {
                                    /*No OP*/
                                }),
                        })
                    },
                }
            })

        await addScriptElements(sources, executingWindow, inputs.onEvent)
        if (inputs.aliases) {
            installAliases(inputs.aliases, executingWindow)
        }
    }

    private async installBackends(
        graph: LoadingGraph,
        backendsConfig: Record<string, BackendConfig>,
        backendsPartitionId: string,
        onEvent: (event: CdnEvent) => void,
        executingWindow: WindowOrWorkerGlobalScope,
    ) {
        await installBackends({
            graph,
            backendsConfig,
            backendsPartitionId,
            onEvent,
            executingWindow,
            webpmClient: this,
        })
    }

    private async installModules(
        inputs: InstallModulesInputs,
    ): Promise<LoadingGraph | undefined> {
        const onEvent =
            inputs.onEvent ??
            (() => {
                /*No OP*/
            })
        const usingDependencies = [
            ...StateImplementation.getPinedDependencies(),
            ...(inputs.usingDependencies ?? []),
        ]
        inputs.modules ??= []

        const inputsModules = extractModulesToInstall(inputs.modules)
        const modules = sanitizeModules(inputsModules)
        const alreadyInstalled = modules.every(({ name, version }) => {
            const latestInstalled = StateImplementation.latestVersion.get(name)
            return latestInstalled
                ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                  satisfies(latestInstalled.replace('-wip', ''), version)
                : false
        })

        if (alreadyInstalled) {
            if (inputs.aliases) {
                installAliases(inputs.aliases, inputs.executingWindow ?? window)
            }
            return undefined
        }

        const body = {
            modules: inputsModules,
            usingDependencies,
        }
        const modulesSideEffects = modules.reduce((acc, dependency) => {
            if (dependency.sideEffects === undefined) {
                return acc
            }
            return {
                ...acc,
                [`${dependency.name}#${dependency.version}`]:
                    dependency.sideEffects,
            }
        }, inputs.modulesSideEffects ?? {})
        try {
            onEvent(new CdnLoadingGraphQueryEvent())
            const loadingGraph = await this.queryLoadingGraph(body)
            onEvent(new CdnLoadingGraphResolvedEvent())
            await this.installLoadingGraph({
                loadingGraph,
                modulesSideEffects,
                backendsConfig: inputs.backendsConfig,
                backendsPartitionId: inputs.backendsPartitionId,
                executingWindow: inputs.executingWindow,
                onEvent: inputs.onEvent,
                aliases: inputs.aliases,
            })
            return loadingGraph
        } catch (error: unknown) {
            onEvent(
                new ConsoleEvent(
                    'Error',
                    'LoadingGraph',
                    'Failed to retrieve the loading graph: HTTP request failed. See console for details.',
                ),
            )
            onEvent(new CdnLoadingGraphErrorEvent(error as LoadingGraphError))
            throw error
        }
    }

    private async installScripts(
        inputs: InstallScriptsInputs,
    ): Promise<
        { assetName: string; assetId: string; url: string; src: string }[]
    > {
        const client = new Client()
        const executingWindow = inputs.executingWindow ?? window
        const scripts = inputs.scripts
            .map((elem) =>
                typeof elem == 'string'
                    ? { location: elem, sideEffects: undefined }
                    : elem,
            )
            .map((elem) => ({ ...elem, ...parseResourceId(elem.location) }))

        const futures = scripts.map(({ name, url, sideEffects }) =>
            client
                .fetchScript({
                    name,
                    url,
                    onEvent: inputs.onEvent,
                })
                .then((fetchedScript) => {
                    return { ...fetchedScript, sideEffects }
                }),
        )

        const sourcesOrErrors = await Promise.all(futures)
        const sources = sourcesOrErrors.filter(
            (d) => !(d instanceof ErrorEvent),
        )

        await addScriptElements(sources, inputs.executingWindow, inputs.onEvent)
        if (inputs.aliases) {
            installAliases(inputs.aliases, executingWindow)
        }
        return sources.map(({ assetId, url, name, content }) => {
            return { assetId, url, assetName: name, src: content }
        })
    }

    private installStyleSheets(
        inputs: InstallStyleSheetsInputs,
    ): Promise<HTMLLinkElement[]> {
        const onEvent =
            inputs.onEvent ??
            (() => {
                /*No OP*/
            })
        const logCss = (text: string) => {
            onEvent(new ConsoleEvent('Info', 'CSS', text))
        }
        const css = inputs.css

        const renderingWindow = inputs.renderingWindow ?? window
        const installedUrls = [
            ...renderingWindow.document.head.querySelectorAll('link'),
        ].map((e) => decodeURIComponent(e.href))

        const getLinkElement = (url: string) => {
            return installedUrls.find((existUrl) => existUrl === url)
        }

        const futures = css
            .map((elem) => {
                return typeof elem == 'string'
                    ? {
                          location: elem,
                      }
                    : elem
            })
            .map((elem) => ({ ...elem, ...parseResourceId(elem.location) }))
            .map(({ assetId, version, name, url, sideEffects }) => {
                url = StateImplementation.getPatchedUrl({
                    name,
                    version,
                    assetId,
                    url,
                })
                return { assetId, version, name, url, sideEffects }
            })
            .filter(({ assetId, version, name, url }) => {
                const alreadyInstalled = getLinkElement(url)
                if (alreadyInstalled) {
                    logCss(
                        `Stylesheet already installed for ${name}#${version} (${url})`,
                    )
                    onEvent(new CssParsedEvent(name, assetId, url, version))
                }
                return alreadyInstalled === undefined
            })
            .map(({ assetId, version, name, url, sideEffects }) => {
                return appendStyleSheet({
                    assetId,
                    version,
                    name,
                    url,
                    sideEffects,
                    renderingWindow,
                    onEvent,
                })
            })
        return Promise.all(futures)
    }
}
