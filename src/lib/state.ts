import { LoadingGraph, FetchedScript } from './inputs.models'
import { gt, gte, satisfies } from 'semver'
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
 * Singleton object that gathers history of fetched modules, scripts & CSS.
 * It also acts as a cache store.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StateImplementation {
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
            setup.name,
            [
                {
                    version: setup.version,
                    apiKey: setup.apiVersion,
                    exportPath: [setup.name],
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
        if (name === setup.name) {
            const symbol = `${setup.name}_APIv${setup.apiVersion}`
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
                    return
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
                    return
                }

                const path = version.exportPath
                pointed = path.reduce(
                    (acc: MaybeModule, e: string) => (acc ? acc[e] : undefined),
                    executingWindow,
                ) as MaybeModule
            } else {
                pointed = original(executingWindow) as MaybeModule
            }
            if (!pointed) {
                console.warn('can not create alias', { alias, original })
                return
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
