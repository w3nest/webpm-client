import {
    AppNav,
    fromMd,
    icon,
    url,
    NotebookModule,
    notebookOptions,
} from '../common'

export const navigation: AppNav = {
    name: 'Tutorials',
    header: {
        icon: icon('fa-graduation-cap'),
    },
    layout: fromMd('tutorials.md'),
    routes: {
        '/esm': {
            name: 'ESM Modules',
            header: {
                icon: { tag: 'i', class: 'fab fa-js' },
            },
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.esm.md'),
                    router,
                    options: notebookOptions,
                }),
        },
        '/pyodide': {
            name: 'Pyodide',
            header: {
                icon: { tag: 'i', class: 'fab fa-python' },
            },
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.pyodide.md'),
                    router,
                    options: notebookOptions,
                }),
        },
        '/backends': {
            name: 'Backends',
            header: {
                icon: { tag: 'i', class: 'fas fa-network-wired' },
            },
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.backends.md'),
                    router,
                    options: notebookOptions,
                }),
        },
        '/workers': {
            name: 'Workers Pool',
            header: {
                icon: { tag: 'i', class: 'fas fa-cogs' },
            },
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.workers.md'),
                    router,
                    options: notebookOptions,
                }),
        },
        /* '/events': {
            name: 'Events & Loading Screen',
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.events.md'),
                    router,
                    options: notebookOptions,
                }),
        }, */
    },
}
