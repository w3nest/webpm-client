import {
    fromMarkdown,
    DefaultLayout,
    installNotebookModule,
    Navigation,
    installCodeApiModule,
    Router,
    MdWidgets,
} from 'mkdocs-ts'
import { setup } from '../auto-generated'
import { AnyVirtualDOM } from 'rx-vdom'
import { firstValueFrom } from 'rxjs'

const project = {
    name: 'webpm-client',
    docBasePath: `/api/assets-gateway/raw/package/${setup.assetId}/${setup.version}/assets/api`,
}

const url = (restOfPath: string) =>
    `/api/assets-gateway/raw/package/${setup.assetId}/${setup.version}/assets/${restOfPath}`

const placeholders = {
    '{{project}}': project.name,
    '{{webpm-version}}': setup.version,
}
function fromMd(file: string) {
    return fromMarkdown({
        url: url(file),
        placeholders,
    })
}
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
await NotebookModule.SnippetEditorView.fetchCmDependencies$('javascript')

const icon = (faClass: string): AnyVirtualDOM => ({
    tag: 'i',
    class: `fas ${faClass}`,
    style: { width: '30px' },
})

export type AppNav = Navigation<
    DefaultLayout.NavLayout,
    DefaultLayout.NavHeader
>

export const navigation: AppNav = {
    name: 'Home',
    header: {
        icon: icon('fa-home'),
    },
    layout: ({ router }) =>
        new NotebookModule.NotebookPage({
            url: url('index.md'),
            router,
            options: notebookOptions,
        }),
    routes: {
        '/how-to': {
            name: 'How-To',
            header: {
                icon: icon('fa-file-medical-alt'),
            },
            layout: fromMd('how-to.md'),
            routes: {
                '/install': {
                    name: 'Install',
                    layout: fromMd('how-to.install.md'),
                },
                '/publish': {
                    name: 'Publish',
                    layout: fromMd('how-to.publish.md'),
                },
                '/py-youwol': {
                    name: 'Py YouWol',
                    layout: fromMd('how-to.py-youwol.md'),
                },
            },
        },
        '/tutorials': {
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
        },
        '/api': apiNav(),
    },
}

async function apiNav(): Promise<AppNav> {
    const CodeApiModule = await installCodeApiModule()
    // This is to preload for javascript snippets included in the API documentation, such that the `scrollTo` is
    // working well.
    await firstValueFrom(
        MdWidgets.CodeSnippetView.fetchCmDependencies$('javascript'),
    )
    return CodeApiModule.codeApiEntryNode({
        name: 'API',
        header: {
            icon: {
                tag: 'i' as const,
                class: `fas fa-code`,
            },
        },
        entryModule: 'webpm-client',
        docBasePath: '../assets/api',
        configuration: {
            ...CodeApiModule.configurationTsTypedoc,
            notebook: {
                options: {
                    runAtStart: true,
                    markdown: {
                        placeholders,
                    },
                },
            },
            mdParsingOptions: {
                placeholders,
            },
        },
    })
}
