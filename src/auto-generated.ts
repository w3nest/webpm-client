/* eslint-disable */
const runTimeDependencies = {
    "externals": {
        "@w3nest/http-clients": "^0.1.0",
        "rxjs": "^7.5.6"
    },
    "includedInBundle": {
        "semver": "^7.3.4"
    }
}
const externals = {
    "@w3nest/http-clients": {
        "commonjs": "@w3nest/http-clients",
        "commonjs2": "@w3nest/http-clients",
        "root": "@w3nest/http-clients_APIv01"
    },
    "rxjs": {
        "commonjs": "rxjs",
        "commonjs2": "rxjs",
        "root": "rxjs_APIv7"
    },
    "rxjs/operators": {
        "commonjs": "rxjs/operators",
        "commonjs2": "rxjs/operators",
        "root": [
            "rxjs_APIv7",
            "operators"
        ]
    }
}
const exportedSymbols = {
    "@w3nest/http-clients": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/http-clients"
    },
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./index.ts",
    "loadDependencies": []
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {
    "testUtils": {
        "entryFile": "./lib/test-utils/index.ts",
        "loadDependencies": [],
        "name": "testUtils"
    },
    "workersPool": {
        "entryFile": "./lib/workers-pool/index.ts",
        "loadDependencies": [
            "rxjs"
        ],
        "name": "workersPool"
    }
}

const entries = {
     '@w3nest/webpm-client': './index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@w3nest/webpm-client/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@w3nest/webpm-client',
        assetId:'QHczbmVzdC93ZWJwbS1jbGllbnQ=',
    version:'0.1.1',
    shortDescription:"Library for dynamic npm's libraries installation from W3 Nest ecosystem.",
    developerDocumentation:'https://platform.youwol.com/apps/@youwol/cdn-explorer/latest?package=@w3nest/webpm-client&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@w3nest/webpm-client',
    sourceGithub:'https://github.com/w3nest/webpm-client',
    userGuide:'',
    apiVersion:'01',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{
        cdnClient:{install:(_:unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@w3nest/webpm-client_APIv01`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{
        name: string,
        cdnClient:{install:(_:unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@w3nest/webpm-client#0.1.1~dist/@w3nest/webpm-client/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@w3nest/webpm-client/${entry.name}_APIv01`]
        })
    },
    getCdnDependencies(name?: string){
        if(name && !secondaryEntries[name]){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const deps = name ? secondaryEntries[name].loadDependencies : mainEntry.loadDependencies

        return deps.map( d => `${d}#${runTimeDependencies.externals[d]}`)
    }
}
