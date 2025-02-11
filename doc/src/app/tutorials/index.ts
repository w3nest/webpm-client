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
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.esm.md'),
                    router,
                    options: notebookOptions,
                }),
        },
        '/pyodide': {
            name: 'Pyodide',
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.pyodide.md'),
                    router,
                    options: notebookOptions,
                }),
        },
        '/backends': {
            name: 'Backends',
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.backends.md'),
                    router,
                    options: notebookOptions,
                }),
        },
        '/workers': {
            name: 'Workers Pool',
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.workers.md'),
                    router,
                    options: notebookOptions,
                }),
        },
        '/events': {
            name: 'Events & Loading Screen',
            layout: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.events.md'),
                    router,
                    options: notebookOptions,
                }),
        },
    },
}
