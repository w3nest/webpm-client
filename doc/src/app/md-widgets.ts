import { ChildrenLike, VirtualDOM } from 'rx-vdom'

export class ApiLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            install: '@nav/api/MainModule.install',
            LightLibraryWithAliasQueryString:
                '@nav/api/MainModule.LightLibraryWithAliasQueryString',
            EsmInputs: '@nav/api/MainModule.EsmInputs',
            ModuleSideEffectCallback:
                '@nav/api/MainModule.ModuleSideEffectCallback',
            PyodideInputs: '@nav/api/MainModule.PyodideInputs',
            'PyodideInputs.version':
                '@nav/api/MainModule.PyodideInputs.version',
            'PyodideInputs.indexUrl':
                '@nav/api/MainModule.PyodideInputs.indexUrl',
            'PyodideInputs.micropipConstraints':
                '@nav/api/MainModule.PyodideInputs.micropipConstraints',
            BackendInputs: '@nav/api/MainModule.BackendInputs',
            PyModule: '@nav/api/MainModule.PyModule',
            InstallInputs: '@nav/api/MainModule.InstallInputs',
            'InstallInputs.esm': '@nav/api/MainModule.InstallInputs.esm',
            'InstallInputs.pyodide':
                '@nav/api/MainModule.InstallInputs.pyodide',
            'InstallInputs.backends':
                '@nav/api/MainModule.InstallInputs.backends',
            queryLoadingGraph: '@nav/api/MainModule.queryLoadingGraph',
            ViewsModule: '@nav/api/ViewsModule',
            installWithUI: '@nav/api/ViewsModule.installWithUI',
            BackendClient: '@nav/api/MainModule.BackendClient',
            'BackendClient.urlW3Lab':
                '@nav/api/MainModule.BackendClient.urlW3Lab',
            WorkersPoolModule: '@nav/api/WorkersPoolModule',
            WWorkerTrait: '@nav/api/WorkersPoolModule.WWorkerTrait',
            WorkersPool: '@nav/api/WorkersPoolModule.WorkersPool',
            'WorkersPool.workers$':
                '@nav/api/WorkersPoolModule.WorkersPool.workers$',
            'WorkersPool.startedWorkers$':
                '@nav/api/WorkersPoolModule.WorkersPool.startedWorkers$',
            'WorkersPool.busyWorkers$':
                '@nav/api/WorkersPoolModule.WorkersPool.busyWorkers$',
            'WorkersPool.runningTasks$':
                '@nav/api/WorkersPoolModule.WorkersPool.runningTasks$',
            WorkersPoolInput: '@nav/api/WorkersPoolModule.WorkersPoolInput',
            'WorkersPoolInput.globals':
                '@nav/api/WorkersPoolModule.WorkersPoolInput.globals',
            'WorkersPool.schedule':
                '@nav/api/WorkersPoolModule.WorkersPool.schedule',
            Message: '@nav/api/WorkersPoolModule.Message',
            MessageStart: '@nav/api/WorkersPoolModule.MessageStart',
            MessageExit: '@nav/api/WorkersPoolModule.MessageExit',
            MessageLog: '@nav/api/WorkersPoolModule.MessageLog',
            MessageData: '@nav/api/WorkersPoolModule.MessageData',
            WorkerContext: '@nav/api/WorkersPoolModule.WorkerContext',
            EntryPointArguments:
                '@nav/api/WorkersPoolModule.EntryPointArguments',
            'EntryPointArguments.context':
                '@nav/api/WorkersPoolModule.EntryPointArguments.context',
            installWorkersPoolModule:
                '@nav/api/MainModule.installWorkersPoolModule',
        }

        const classes = {
            install: 'mkapi-role-function',
            LightLibraryWithAliasQueryString: 'mkapi-role-type-alias',
            EsmInputs: 'mkapi-role-interface',
            ModuleSideEffectCallback: 'mkapi-role-type-alias',
            PyodideInputs: 'mkapi-role-interface',
            'PyodideInputs.version': 'mkapi-role-attribute',
            'PyodideInputs.indexUrl': 'mkapi-role-attribute',
            'PyodideInputs.micropipConstraints': 'mkapi-role-attribute',
            BackendInputs: 'mkapi-role-interface',
            PyModule: 'mkapi-role-type-alias',
            InstallInputs: 'mkapi-role-interface',
            'InstallInputs.esm': 'mkapi-role-attribute',
            'InstallInputs.pyodide': 'mkapi-role-attribute',
            'InstallInputs.backends': 'mkapi-role-attribute',
            queryLoadingGraph: 'mkapi-role-function',
            ViewsModule: 'mkapi-role-module',
            installWithUI: 'mkapi-role-function',
            BackendClient: 'mkapi-role-interface',
            'BackendClient.urlW3Lab': 'mkapi-role-attribute',
            WorkersPoolModule: 'mkapi-role-module',
            WWorkerTrait: 'mkapi-role-interface',
            WorkersPool: 'mkapi-role-class',
            'WorkersPool.workers$': 'mkapi-role-attribute',
            'WorkersPool.startedWorkers$': 'mkapi-role-attribute',
            'WorkersPool.busyWorkers$': 'mkapi-role-attribute',
            'WorkersPool.runningTasks$': 'mkapi-role-attribute',
            WorkersPoolInput: 'mkapi-role-interface',
            'WorkersPoolInput.globals': 'mkapi-role-attribute',
            'WorkersPool.schedule': 'mkapi-role-method',
            Message: 'mkapi-role-type-alias',
            MessageStart: 'mkapi-role-interface',
            MessageExit: 'mkapi-role-interface',
            MessageLog: 'mkapi-role-interface',
            MessageData: 'mkapi-role-interface',
            WorkerContext: 'mkapi-role-interface',
            EntryPointArguments: 'mkapi-role-interface',
            'EntryPointArguments.context': 'mkapi-role-attribute',
            installWorkersPoolModule: 'mkapi-role-function',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent === '' ? target : elem.textContent,
                class: `mkapi-semantic-flag ${classes[target]}`,
            },
            {
                tag: 'i',
                class: 'fas fa-code',
                style: { transform: 'scale(0.6)' },
            },
        ]
    }
}

export class ExtLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string
    public readonly target = '_blank'

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            w3nest: '/apps/@w3nest/doc/latest',
            'w3nest/how-to/publish':
                '/apps/@w3nest/doc/latest?nav=/how-to/publish',
            pyodide: 'https://pyodide.org/en/stable/',
            'pyodide-packages':
                'https://pyodide.org/en/stable/usage/packages-in-pyodide.html',
            'pyodide-publish':
                'https://pyodide.org/en/stable/development/new-packages.html',
            micropip:
                'https://micropip.pyodide.org/en/stable/project/usage.html',
            pypi: 'https://pypi.org/',
            semver: 'https://docs.npmjs.com/cli/v6/using-npm/semver',
            pyrun_backend:
                '/apps/@mkdocs-ts/doc/0.3.0-wip?nav=/api/Interpreters/pyrun_backend',
            'mkdocs-ts': '/apps/@mkdocs-ts/doc/0.3.0-wip?nav=/',
            'mkdocs-ts.notebook-tuto':
                '/apps/@mkdocs-ts/doc/0.3.0-wip?nav=/tutorials/notebook',
            'structured-clone':
                'https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm',
            'pi-approx':
                'https://fr.wikipedia.org/wiki/M%C3%A9thode_de_Monte-Carlo',
            Observable: 'https://rxjs.dev/guide/observable',
            Subject: 'https://rxjs.dev/guide/subject',
            'torus-knot':
                'https://threejs.org/docs/#api/en/geometries/TorusKnotGeometry',
            pmp: 'https://www.pmp-library.org/',
            wasm: 'https://webassembly.org/',
            three: 'https://threejs.org/',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent,
            },
            {
                tag: 'i',
                class: 'fas fa-external-link-alt',
                style: { transform: 'scale(0.6)' },
            },
        ]
    }
}

export class GitHubLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string
    public readonly target = '_blank'

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            'webpm-doc': 'https://github.com/w3nest/webpm/blob/main/doc',
            'webpm-externals': 'https://github.com/w3nest/webpm-externals',
            'publish-package':
                'https://github.com/youwol/cdn-externals/issues/new?template=request_package_integration.yml',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent,
            },
            {
                tag: 'i',
                class: 'fab fa-github',
                style: { transform: 'scale(0.8)' },
            },
        ]
    }
}

export class CrossLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            tutorials: '@nav/tutorials',
            'how-to': '@nav/how-to',
            'how-to/install': '@nav/how-to/install',
            'how-to/publish': '@nav/how-to/publish',
            api: '@nav/api',
            workers: '@nav/tutorials/workers',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent,
            },
            {
                tag: 'i',
                class: 'fas fa-book-open',
                style: { transform: 'scale(0.6)' },
            },
        ]
    }
}
