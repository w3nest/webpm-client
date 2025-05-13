import { installNotebookModule, Router } from 'mkdocs-ts'
import { AppNav, fromMd, icon, url, placeholders } from '../common'
import { firstValueFrom } from 'rxjs'

async function notebookPage(path: string, router: Router) {
    const NotebookModule = await installNotebookModule()
    const notebookOptions = {
        runAtStart: true,
        defaultCellAttributes: {
            lineNumbers: false,
        },
        markdown: {
            latex: true,
            placeholders,
        },
    }
    await firstValueFrom(
        NotebookModule.SnippetEditorView.fetchCmDependencies$('javascript'),
    )
    return new NotebookModule.NotebookPage({
        url: url(path),
        router,
        options: notebookOptions,
    })
}
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
            layout: ({ router }) => notebookPage('tutorials.esm.md', router),
        },
        '/pyodide': {
            name: 'Pyodide',
            header: {
                icon: { tag: 'i', class: 'fab fa-python' },
            },
            layout: ({ router }) =>
                notebookPage('tutorials.pyodide.md', router),
        },
        '/backends': {
            name: 'Backends',
            header: {
                icon: { tag: 'i', class: 'fas fa-network-wired' },
            },
            layout: ({ router }) =>
                notebookPage('tutorials.backends.md', router),
        },
        '/workers': {
            name: 'Workers Pool',
            header: {
                icon: { tag: 'i', class: 'fas fa-cogs' },
            },
            layout: ({ router }) =>
                notebookPage('tutorials.workers.md', router),
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
