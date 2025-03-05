import { generateApiFiles } from './../node_modules/mkdocs-ts/src/mkapi-backends/mkapi-typescript'

const missingRefs = {
    LightLibraryWithAliasQueryString:
        '@nav/api/MainModule.LightLibraryWithAliasQueryString',
    LightLibraryQueryString: '@nav/api/MainModule.LightLibraryQueryString',
    PyModule: '@nav/api/MainModule.PyModule',
}
generateApiFiles({
    projectFolder: `${__dirname}/../../`,
    outputFolder: `${__dirname}/../assets/api`,
    baseNav: '/api',
    externals: {
        rxjs: ({ name }: { name: string }) => {
            const urls = {
                Subject: 'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
                BehaviorSubject:
                    'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
                ReplaySubject:
                    'https://www.learnrxjs.io/learn-rxjs/subjects/replaysubject',
                Observable: 'https://rxjs.dev/guide/observable',
            }
            if (!(name in urls)) {
                console.warn(`Can not find URL for rxjs ${name} symbol`)
            }
            return urls[name]
        },
        'rx-vdom': ({ name }: { name: string }) => {
            return `/apps/@rx-vdom/doc/latest?nav=/api.${name}`
        },
    },
    extraDeclarationReferences: {
        'webpm-client/MainModule.InstallInputs.esm': missingRefs,
        'webpm-client/MainModule.InstallInputs.backends': missingRefs,
        'webpm-client/MainModule.InstallInputs.pyodide': missingRefs,
        'webpm-client/MainModule.EsmInputs.modules': missingRefs,
        'webpm-client/MainModule.EsmInputs.modulesSideEffects': missingRefs,
        'webpm-client/MainModule.EsmInputs.usingDependencies': missingRefs,
        'webpm-client/MainModule.PyodideInputs.modules': missingRefs,
        'webpm-client/MainModule.QueryLoadingGraphInputs.modules': missingRefs,
        'webpm-client/MainModule.QueryLoadingGraphInputs.usingDependencies':
            missingRefs,
    },
})
