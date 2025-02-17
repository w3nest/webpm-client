import {
    Navigation,
    DefaultLayout,
    fromMarkdown,
    installNotebookModule,
    Context,
    Label,
    NoContext,
    ContextTrait,
    ConsoleReporter,
    InMemoryReporter,
    GlobalMarkdownViews,
} from 'mkdocs-ts'
import { AnyVirtualDOM } from 'rx-vdom'
import { setup } from '../auto-generated'
import { DebugMode } from './config.debug'
import { ApiLink, CrossLink, ExtLink, GitHubLink } from './md-widgets'
import { companionNodes$ } from './on-load'
import { SearchView } from './how-to/search.view'

export const project = {
    name: 'webpm-client',
    docBasePath: `../assets/api`,
}

export const url = (restOfPath: string) => `../assets/${restOfPath}`

export const placeholders = {
    '{{project}}': project.name,
    '{{webpm-version}}': setup.version,
    '{{webpm-client}}': '**`@w3nest/webpm-client`**',
}

export function fromMd(file: string) {
    return fromMarkdown({
        url: url(file),
        placeholders,
    })
}

export const icon = (faClass: string): AnyVirtualDOM => ({
    tag: 'i',
    class: `fas ${faClass}`,
    style: { width: '30px' },
})

export type AppNav = Navigation<
    DefaultLayout.NavLayout,
    DefaultLayout.NavHeader
>

export const NotebookModule = await installNotebookModule()
export const notebookOptions = {
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

Context.Enabled = DebugMode
export const inMemReporter = new InMemoryReporter()
const consoleReporter = new ConsoleReporter()
const reporters = [consoleReporter, inMemReporter]

export function createRootContext({
    threadName,
    labels,
}: {
    threadName: string
    labels: Label[]
}): ContextTrait {
    if (!DebugMode) {
        return new NoContext()
    }
    return new Context({
        threadName,
        reporters,
        labels,
        callstack: [],
    })
}

GlobalMarkdownViews.factory = {
    ...GlobalMarkdownViews.factory,
    'api-link': (elem: HTMLElement) => new ApiLink(elem),
    'ext-link': (elem: HTMLElement) => new ExtLink(elem),
    'cross-link': (elem: HTMLElement) => new CrossLink(elem),
    'github-link': (elem: HTMLElement) => new GitHubLink(elem),
    'split-api': () => ({
        tag: 'i',
        class: 'mkdocs-inv',
        children: [
            DefaultLayout.splitCompanionAction({
                path: '/api',
                companionNodes$,
            }),
        ],
    }),
    'search-resource': () => new SearchView(),
}
