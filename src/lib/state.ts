import {
    LoadingGraph,
    FetchedScript,
    LightLibraryQueryString,
} from './inputs.models'
import { lt, gt, gte } from 'semver'
import {
    getInstalledFullExportedSymbol,
    getFullExportedSymbolAlias,
    getExpectedFullExportedSymbol,
    PARTITION_PREFIX,
} from './utils'

import { setup } from '../auto-generated'
import { installBackendClientDeps } from './backends'

import type { Observable } from 'rxjs'
import type { ContextMessage } from '@w3nest/http-clients'
import type * as HttpClients from '@w3nest/http-clients'
import { CdnError } from './errors.models'

/**
 * Type alias for string used as library name.
 */
export type LibraryName = string
/**
 * Type alias for string used as version.
 */
export type Version = string

/**
 * Provides extra-controls regarding dependencies and URL resolution.
 *
 * None of the methods exposed should be used in regular scenario.
 *
 *  @category State
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class State {
    /**
     * Pin some dependencies to use whenever a loading graph is resolved,
     * it will over-ride natural resolution from packages description.
     *
     */
    static pinDependencies(dependencies: LightLibraryQueryString[]) {
        StateImplementation.pinDependencies(dependencies)
    }

    /**
     * Register a 'patcher' for URLs to fetch resource: any time a request is done to the target resource,
     * the URL is actually replaced by the registered patch.
     *
     * This is provided if somehow a saved loading graph reference resources that have been moved to other location.
     * @param patcher function that takes `{ name, version, assetId, url }` as argument and return the patched URLs
     * (which should be the original if no transformation is required).
     */
    static registerUrlPatcher(
        patcher: ({ name, version, assetId, url }) => string,
    ) {
        StateImplementation.registerUrlPatcher(patcher)
    }

    /**
     * Remove installed modules & reset the cache.
     * It makes its best to clear modules & associated side effects, but it is not perfect.
     * It is mostly intended at helping 'tear down' methods in tests.
     *
     * @param executingWindow where the resources have been installed
     */
    static clear(executingWindow?: Window) {
        StateImplementation.clear(executingWindow)
    }
}
/**
 * Singleton object that gathers history of fetched modules, scripts & CSS.
 * It also acts as a cache store.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StateImplementation {
    /**
     * Dictionary of `${libName}#${libVersion}` -> `{ symbol: string; apiKey: string }`
     *
     */
    static exportedSymbolsDict: Record<
        string,
        { symbol: string; apiKey: string; aliases?: string[] }
    > = {
        [`${setup.name}#${setup.version}`]: {
            symbol: setup.name,
            apiKey: setup.apiVersion,
            aliases: ['webpmClient'],
        },
    }

    /**
     * Return the exported symbol name of a library.
     *
     * For now implementation is based on a hard coded dictionary.
     *
     * @param name name of the library
     * @param version version of the library
     */
    static getExportedSymbol(
        name: string,
        version: string,
    ): { symbol: string; apiKey: string; aliases: string[] } {
        const exported =
            StateImplementation.exportedSymbolsDict[`${name}#${version}`]
        if (exported.aliases === undefined) {
            // This case can happen when installing a saved loading graph that did not included aliases at that time.
            return { ...exported, aliases: [] }
        }
        return { aliases: [], ...exported }
    }

    static updateExportedSymbolsDict(
        modules: {
            name: string
            version: string
            exportedSymbol: string
            apiKey: string
            aliases: string[]
            type: 'js/wasm' | 'backend'
        }[],
        backendPartitionId: string,
    ) {
        const newEntries = modules.reduce((acc, e) => {
            const suffix =
                e.type === 'js/wasm'
                    ? ''
                    : `${PARTITION_PREFIX}${backendPartitionId}`
            return {
                ...acc,
                [`${e.name}${suffix}#${e.version}`]: {
                    symbol: `${e.exportedSymbol}${suffix}`,
                    apiKey: e.apiKey,
                    aliases: e.aliases,
                },
            }
        }, {})
        StateImplementation.exportedSymbolsDict = {
            ...StateImplementation.exportedSymbolsDict,
            ...newEntries,
        }
    }
    /**
     * Imported modules: mapping between {@link LibraryName} and list of installed {@link Version}.
     */
    static importedBundles = new Map<LibraryName, Version[]>([
        [setup.name, [setup.version]],
    ])

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

    static importedPyModules: string[] = []

    /**
     * Latest version of modules installed: mapping between library name and latest version
     */
    static latestVersion = new Map<string, Version>([
        [setup.name, setup.version],
    ])

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
     * Return whether a library at particular version hase been already installed with a compatible version.
     * Compatible version means a greater version with same major.
     *
     * @param libName library name
     * @param version version
     */
    static isCompatibleVersionInstalled(
        libName: string,
        version: string,
    ): boolean {
        if (libName === '@youwol/webpm-client') {
            const symbol = getExpectedFullExportedSymbol(libName, version)
            const alreadyHere = (window as unknown as never)[symbol] as
                | {
                      setup: { version: string }
                  }
                | undefined
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const compatibleInstalled: boolean | undefined =
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                alreadyHere && gte(alreadyHere.setup.version, version)
            return compatibleInstalled ?? false
        }
        const installedVersions =
            StateImplementation.importedBundles.get(libName)
        if (!installedVersions) {
            return false
        }

        if (installedVersions.includes(version)) {
            return true
        }

        const compatibleVersion = installedVersions
            .filter(
                (installedVersion) =>
                    StateImplementation.getExportedSymbol(
                        libName,
                        installedVersion,
                    ).apiKey ===
                    StateImplementation.getExportedSymbol(libName, version)
                        .apiKey,
            )
            .find((installedVersion) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                return gt(installedVersion, version)
            })

        if (compatibleVersion) {
            console.log(
                `${libName}: a greater compatible version is already installed (${compatibleVersion}), skip install`,
                {
                    libName,
                    queriedVersion: version,
                    compatibleVersion,
                    apiKey: StateImplementation.getExportedSymbol(
                        libName,
                        version,
                    ).apiKey,
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
    static installAliases(
        aliases: Record<string, string | ((Window) => unknown)>,
        executingWindow: WindowOrWorkerGlobalScope,
    ) {
        Object.entries(aliases).forEach(([alias, original]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const pointed: { __yw_aliases__?: Set<string> } | undefined =
                typeof original == 'string'
                    ? executingWindow[original]
                    : original(executingWindow)
            if (!pointed) {
                console.warn('can not create alias', { alias, original })
                return
            }

            executingWindow[alias] = pointed

            if (!pointed.__yw_aliases__) {
                pointed.__yw_aliases__ = new Set()
            }

            pointed.__yw_aliases__.add(alias)
        })
    }

    /**
     * Reset the cache, but keep installed modules.
     * @hidden
     */
    static resetCache() {
        StateImplementation.importedBundles = new Map<LibraryName, Version[]>()
        StateImplementation.importedLoadingGraphs = new Map<
            string,
            Promise<Window>
        >()
        StateImplementation.importedScripts = new Map<
            string,
            Promise<FetchedScript>
        >()
        StateImplementation.latestVersion = new Map<string, string>()
        StateImplementation.exportedSymbolsDict = {}
    }

    /**
     * Remove installed modules & reset the cache.
     * It makes its best to clear modules & associated side effects, but it is not perfect.
     * It is not expose anyway and serves at helping tests mostly.
     *
     * @param executingWindow where the resources have been installed
     * @hidden
     */
    static clear(executingWindow?: Window) {
        executingWindow ??= window
        Array.from(StateImplementation.importedBundles.entries())
            .map(([lib, versions]) => {
                return versions.map((version) => [lib, version])
            })
            .flat()
            .map(([lib, version]) => {
                const symbolName = this.getExportedSymbol(lib, version).symbol
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const aliases: Set<string> =
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    executingWindow[symbolName]?.__yw_aliases__ || new Set()
                return [
                    symbolName,
                    getInstalledFullExportedSymbol(lib, version),
                    getFullExportedSymbolAlias(lib, version),
                    ...aliases,
                ]
            })
            .flat()
            .forEach((toDelete) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions,@typescript-eslint/no-dynamic-delete
                executingWindow[toDelete] && delete executingWindow[toDelete]
            })

        StateImplementation.resetCache()
    }

    /**
     * Update the various properties after new modules have been imported.
     *
     * @param modules modules installed
     * @param executingWindow the executing window (where to expose the latest version if change need be).
     * @hidden
     */
    static registerImportedModules(
        modules: { name: string; version: string }[],
        executingWindow: WindowOrWorkerGlobalScope,
    ) {
        modules.forEach(({ name, version }) => {
            const existingVersions =
                StateImplementation.importedBundles.get(name) ?? []
            StateImplementation.importedBundles.set(name, [
                ...existingVersions,
                version,
            ])
        })
        StateImplementation.updateLatestBundleVersion(modules, executingWindow)
    }
    /**
     * Register imported python modules.
     *
     * @param pyModules Name of the python modules.
     * @hidden
     */
    static registerImportedPyModules(pyModules: string[]) {
        StateImplementation.importedPyModules = [
            ...StateImplementation.importedPyModules,
            ...pyModules,
        ]
    }

    /**
     * Update {@link StateImplementation.latestVersion} given a provided installed {@link LoadingGraph}.
     * It also exposes the latest version in `executingWindow` using original symbol name if need be.
     *
     * @param modules installed {@link LoadingGraph}
     * @param executingWindow where to expose the latest version if change need be
     * @hidden
     */
    private static updateLatestBundleVersion(
        modules: { name: string; version: string }[],
        executingWindow: WindowOrWorkerGlobalScope,
    ) {
        const toConsiderForUpdate = modules.filter(({ name, version }) => {
            return !(
                StateImplementation.latestVersion.has(name) &&
                StateImplementation.latestVersion.get(name) === version
            )
        })
        toConsiderForUpdate.forEach(({ name, version }) => {
            if (
                StateImplementation.latestVersion.has(name) &&
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                lt(version, StateImplementation.latestVersion.get(name))
            ) {
                return
            }
            const { symbol, aliases } = StateImplementation.getExportedSymbol(
                name,
                version,
            )
            const exportedName = getInstalledFullExportedSymbol(name, version)

            if (!executingWindow[exportedName]) {
                console.error(
                    `Problem with package "${name}" & export symbol "${exportedName}"`,
                    {
                        name,
                        version,
                        symbol,
                        exportedName,
                    },
                )
            }
            const prevLatestVersion =
                StateImplementation.latestVersion.get(name)
            if (prevLatestVersion) {
                const { symbol, aliases } =
                    StateImplementation.getExportedSymbol(
                        name,
                        prevLatestVersion,
                    )
                const toRemove = [symbol, ...aliases]
                toRemove.forEach((alias) => {
                    if (alias.includes(':')) {
                        const baseName = alias.split(':')[0]
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete executingWindow[baseName]
                        return
                    }
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                    delete executingWindow[alias]
                })
            }
            const toAdd = [symbol, ...aliases]
            toAdd.forEach((alias) => {
                if (alias.includes(':')) {
                    const baseName = alias.split(':')[0]
                    const property = alias.split(':')[1]
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    executingWindow[baseName] =
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        executingWindow[exportedName][property]
                    return
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                executingWindow[alias] = executingWindow[exportedName]
            })
            StateImplementation.latestVersion.set(name, version)
        })
    }

    private static pinedDependencies: LightLibraryQueryString[] = []

    /**
     * return the (static) list of pined dependencies.
     */
    static getPinedDependencies() {
        return [...StateImplementation.pinedDependencies]
    }
    /**
     * Pin some dependencies to use whenever a loading graph is resolved,
     * it will over-ride natural resolution from packages description.
     *
     */
    static pinDependencies(dependencies: LightLibraryQueryString[]) {
        StateImplementation.pinedDependencies = [
            ...StateImplementation.pinedDependencies,
            ...dependencies,
        ]
    }

    /**
     *
     * @hidden
     */
    private static urlPatcher: ({
        name,
        version,
        assetId,
        url,
    }: {
        name: string
        version: string
        assetId: string
        url: string
    }) => string = ({ url }) => url

    /**
     *
     * @param _p
     * @param _p.name name of the asset
     * @param _p.version version of the asset
     * @param _p.assetId id of the asset
     * @param _p.url original URL
     */
    static getPatchedUrl({
        name,
        version,
        assetId,
        url,
    }: {
        name: string
        version: string
        assetId: string
        url: string
    }) {
        return StateImplementation.urlPatcher({ name, version, assetId, url })
    }
    /**
     * Register a 'patcher' for URLs to fetch resource: any time a request is done to the target resource,
     * the URL is actually replaced by the registered patch.
     *
     * This is provided if somehow a saved loading graph reference resources that have been moved to other location.
     */
    static registerUrlPatcher(
        patcher: ({ name, version, assetId, url }) => string,
    ) {
        StateImplementation.urlPatcher = patcher
    }
}
