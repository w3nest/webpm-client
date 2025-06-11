import { LoadingGraph, FetchedScript, Library } from './inputs.models'
import { gt, gte, satisfies } from 'semver'
import pkgJson from '../../package.json'
import { installBackendClientDeps } from './backends'

import type { Observable } from 'rxjs'
import type { ContextMessage } from '@w3nest/http-clients'
import type * as HttpClients from '@w3nest/http-clients'
import { CdnError } from './errors.models'
import { getUrlBase } from './utils'

/**
 * Type alias for string used as library name.
 */
export type LibraryName = string
/**
 * Type alias for string used as version.
 */
export type Version = string

/**
 * Resolves the full URL for a package asset, optionally appending a fingerprint
 * query parameter if a lock entry exists for the specified package and version.
 *
 * This function is typically used to construct browser-safe URLs for
 * fingerprinted (cache-busted) JavaScript bundles, ensuring that republished
 * versions can bypass browser caching when necessary.
 *
 * @param params An object containing:
 * @param params.package The name of the library or package.
 * @param params.version The specific version of the package.
 * @param params.path The relative path to the asset within the package.
 *
 * @returns A URL string combining the base URL, asset path, and optionally
 * a `?fp=<fingerprint>` query parameter if a matching fingerprint is found.
 */
export function resolveUrlWithFP(params: {
    package: LibraryName
    version: string
    path: string
}) {
    const urlBase = `${getUrlBase(params.package, params.version)}/${params.path}`
    const lock = StateImplementation.locks.find(
        ({ name, version }) =>
            name === params.package && version === params.version,
    )
    if (!lock) {
        return urlBase
    }
    return `${urlBase}?fp=${lock.fingerprint}`
}
/**
 * Singleton object that gathers history of fetched modules, scripts & CSS.
 * It also acts as a cache store.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StateImplementation {
    /**
     * Union of all elements retrieved from `locks` attribute of installed loading graph.
     */
    static locks: Library[] = []
    /**
     * ES modules installed.
     */
    static esModules = new Map<
        LibraryName,
        {
            version: Version
            versionNumber: number
            exportPath: string[]
            apiKey: string
        }[]
    >([
        [
            pkgJson.name,
            [
                {
                    version: pkgJson.version,
                    apiKey: pkgJson.webpack.apiVersion,
                    exportPath: [pkgJson.name],
                    versionNumber: 0,
                },
            ],
        ],
    ])
    /**
     * Pyodide modules installed.
     */
    static pyModules: string[] = []

    /**
     * Fetched loading graph: mapping between a loading graph's body uid and corresponding computed loading graph.
     * @hidden
     */
    static fetchedLoadingGraph = new Map<
        string,
        Promise<LoadingGraph | CdnError>
    >()

    /**
     * Installed loading graph: mapping between a loading graph's body uid and window state
     */
    static importedLoadingGraphs = new Map<string, Promise<Window>>()

    /**
     * Installed script: mapping between a script's uid and a {@link FetchedScript}.
     * @hidden
     */
    static importedScripts = new Map<string, Promise<FetchedScript>>()

    static webSocketsStore: Record<
        string,
        Promise<Observable<ContextMessage>>
    > = {}

    static getWebSocket(wsUrl: string): Promise<Observable<ContextMessage>> {
        if (wsUrl in StateImplementation.webSocketsStore) {
            return StateImplementation.webSocketsStore[wsUrl]
        }
        StateImplementation.webSocketsStore[wsUrl] =
            installBackendClientDeps().then(
                ({ http }: { http: typeof HttpClients }) => {
                    return new http.WebSocketClient<ContextMessage>(
                        wsUrl,
                    ).connectWs()
                },
            )
        return StateImplementation.webSocketsStore[wsUrl]
    }

    /**
     * Return whether an ESM already installed match a given semver query.
     *
     * @param name Module's name.
     * @param semver Semantic versioning query.
     */

    static isEsmSatisfied(name: string, semver: string) {
        const versions = StateImplementation.esModules.get(name)
        if (!versions) {
            return false
        }
        return versions.find((v) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            satisfies(
                v.version.replace('-wip', ''),
                semver.replace('-wip', ''),
            ),
        )
    }
    /**
     * Return whether a library at given version is already installed with a compatible version.
     * Compatible version means a greater version with same API key.
     *
     * @param name library name
     * @param version version
     */
    static isCompatibleEsmInstalled(
        name: string,
        version: string,
        apiKey: string,
    ): boolean {
        if (name === pkgJson.name) {
            const symbol = `${pkgJson.name}_APIv${pkgJson.webpack.apiVersion}`
            const alreadyHere = (window as unknown as never)[symbol] as
                | { version: string }
                | undefined
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const compatibleInstalled: boolean | undefined =
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                alreadyHere && gte(alreadyHere.version, version)
            return compatibleInstalled ?? false
        }
        const module = StateImplementation.esModules.get(name)
        if (!module) {
            return false
        }
        const versions = module.map((item) => item.version)
        if (versions.includes(version)) {
            return true
        }

        const compatibleVersion = module
            .filter((v) => v.apiKey === apiKey)
            .find((installedVersion) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                return gt(installedVersion, version)
            })

        if (compatibleVersion) {
            console.log(
                `${name}: a greater compatible version is already installed (${compatibleVersion.version}), skip install`,
                {
                    libName: name,
                    queriedVersion: version,
                    compatibleVersion,
                },
            )
        }
        return compatibleVersion !== undefined
    }

    /**
     * @param aliases
     * @param executingWindow
     * @hidden
     */
    static extractAliases(
        aliases: Record<string, string | ((Window) => unknown)>,
        unwrapDefault: boolean,
        executingWindow: WindowOrWorkerGlobalScope,
    ) {
        type Module = Record<string, unknown>
        type MaybeModule = Module | undefined
        return Object.entries(aliases).reduce((acc, [alias, original]) => {
            let pointed: MaybeModule = undefined
            if (typeof original == 'string') {
                const name = original.split('#')[0]
                const semver = original
                    .split('#')[1]
                    .replace('-wip', '')
                    .replace('latest', 'x')
                const versions = StateImplementation.esModules.get(name)
                if (!versions) {
                    console.warn(
                        `Can not create alias: target module '${name}' is not installed`,
                    )
                    return acc
                }
                const version = versions.find((v) =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    satisfies(v.version.replace('-wip', ''), semver),
                )
                if (!version) {
                    console.warn(
                        `Can not create alias: no versions of '${name}' match the target semver ${semver}`,
                        { versions },
                    )
                    return acc
                }

                const path = version.exportPath
                pointed = path.reduce((acc: MaybeModule, e: string) => {
                    if (!acc) {
                        return undefined
                    }
                    if (unwrapDefault) {
                        return unwrapPreserveDefault(acc[e])
                    }
                    return acc[e]
                }, executingWindow) as MaybeModule
            } else {
                pointed = original(executingWindow) as MaybeModule
            }
            if (!pointed) {
                console.warn('can not create alias', { alias, original })
                return acc
            }
            return { ...acc, [alias]: pointed }
        }, {})
    }

    /**
     * Update the various properties after new modules have been imported.
     *
     * @param modules modules installed
     * @param executingWindow the executing window (where to expose the latest version if change need be).
     * @hidden
     */
    static registerEsmModules(
        modules: {
            name: string
            version: string
            exportPath: string[]
            aliases?: string[]
            apiKey: string
            versionNumber: number
        }[],
        executingWindow: WindowOrWorkerGlobalScope,
    ) {
        type Module = Record<string, unknown>
        type MaybeModule = Module | undefined
        modules.forEach(
            ({ name, version, exportPath, apiKey, versionNumber, aliases }) => {
                const existingVersions =
                    StateImplementation.esModules.get(name) ?? []
                const item = {
                    version,
                    exportPath,
                    aliases,
                    apiKey,
                    versionNumber,
                }
                const versions = [...existingVersions, item].sort(
                    (a, b) => b.versionNumber - a.versionNumber,
                )
                StateImplementation.esModules.set(name, versions)
                const exported = exportPath.reduce(
                    (acc: MaybeModule, e: string) => (acc ? acc[e] : undefined),
                    executingWindow,
                ) as MaybeModule
                if (!exported) {
                    console.error(
                        `Can not find exported symbol of '${name}#${version}' at export: ${String(exportPath)}`,
                    )
                    return
                }
                if (!aliases) {
                    return
                }
                aliases.forEach((alias) => {
                    if (alias.includes(':')) {
                        const baseName = alias.split(':')[0]
                        const property = alias.split(':')[1]
                        executingWindow[baseName] = exported[property]
                        return
                    }
                    executingWindow[alias] = exported
                })
            },
        )
    }
    /**
     * Register imported python modules.
     *
     * @param pyModules Name of the python modules.
     * @hidden
     */
    static registerImportedPyModules(pyModules: string[]) {
        StateImplementation.pyModules = [
            ...StateImplementation.pyModules,
            ...pyModules,
        ]
    }
}

interface DefaultOnly<T = unknown> {
    default: T
}

function isDefaultOnly<T>(mod: unknown): mod is DefaultOnly<T> {
    return (
        typeof mod === 'object' &&
        mod !== null &&
        'default' in mod &&
        mod.default !== null &&
        mod.default !== undefined &&
        Object.keys(mod as object).length === 1
    )
}

function unwrapPreserveDefault(mod: unknown) {
    if (isDefaultOnly<object>(mod)) {
        const unwrapped = mod.default
        return new Proxy(unwrapped, {
            get(target, prop, receiver) {
                if (prop === 'default') return unwrapped
                return Reflect.get(target, prop, receiver) as unknown
            },
        })
    }
    return mod
}
