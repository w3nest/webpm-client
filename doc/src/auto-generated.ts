/* eslint-disable */
const runTimeDependencies = {
    "externals": {
        "@w3nest/webpm-client": "^0.1.4",
        "mkdocs-ts": "^0.3.0",
        "rxjs": "^7.5.6"
    },
    "includedInBundle": {}
}
const externals = {
    "@w3nest/webpm-client": "window['@w3nest/webpm-client_APIv01']",
    "mkdocs-ts": "window['mkdocs-ts_APIv03']",
    "rxjs": "window['rxjs_APIv7']"
}
const exportedSymbols = {
    "@w3nest/webpm-client": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/webpm-client"
    },
    "mkdocs-ts": {
        "apiKey": "03",
        "exportedSymbol": "mkdocs-ts"
    },
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    }
}

const mainEntry: { entryFile: string; loadDependencies: string[] } =
    {
    "entryFile": "./main.ts",
    "loadDependencies": [
        "mkdocs-ts",
        "@w3nest/webpm-client",
        "rxjs"
    ]
}

const secondaryEntries: {
    [k: string]: { entryFile: string; name: string; loadDependencies: string[] }
} = {}

const entries = {
    '@webpm-client/doc': './main.ts',
    ...Object.values(secondaryEntries).reduce(
        (acc, e) => ({ ...acc, [e.name]: e.entryFile }),
        {},
    ),
}
export const setup = {
    name: '@webpm-client/doc',
    assetId: 'QHdlYnBtLWNsaWVudC9kb2M=',
    version: '0.1.4',
    webpmPath: '/api/assets-gateway/webpm/resources/QHdlYnBtLWNsaWVudC9kb2M=/0.1.4',
    apiVersion: '01',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module: string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({
        cdnClient,
        installParameters,
    }: {
        cdnClient: {
            install: (_: unknown) => Promise<WindowOrWorkerGlobalScope>
        }
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map(
                (d) => `${d}#${runTimeDependencies.externals[d]}`,
            ),
        ]
        return cdnClient
            .install({
                ...parameters,
                modules,
                scripts,
            })
            .then(() => {
                return window[`@webpm-client/doc_APIv01`]
            })
    },
    installAuxiliaryModule: ({
        name,
        cdnClient,
        installParameters,
    }: {
        name: string
        cdnClient: {
            install: (_: unknown) => Promise<WindowOrWorkerGlobalScope>
        }
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if (!entry) {
            throw Error(
                `Can not find the secondary entry '${name}'. Referenced in template.py?`,
            )
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@webpm-client/doc#0.1.4~dist/${entry.name}.js`,
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map(
                (d) => `${d}#${runTimeDependencies.externals[d]}`,
            ),
        ]
        return cdnClient
            .install({
                ...parameters,
                modules,
                scripts,
            })
            .then(() => {
                return window[`@webpm-client/doc_APIv01`][`${entry.name}`]
            })
    },
    getCdnDependencies(name?: string) {
        if (name && !secondaryEntries[name]) {
            throw Error(
                `Can not find the secondary entry '${name}'. Referenced in template.py?`,
            )
        }
        const deps = name
            ? secondaryEntries[name].loadDependencies
            : mainEntry.loadDependencies

        return deps.map((d) => `${d}#${runTimeDependencies.externals[d]}`)
    },
}
