import {
    Navigation,
    DefaultLayout,
    fromMarkdown,
    Context,
    Label,
    NoContext,
    ContextTrait,
    ConsoleReporter,
    InMemoryReporter,
    GlobalMarkdownViews,
} from 'mkdocs-ts'
import { AnyVirtualDOM, child$ } from 'rx-vdom'
import { DebugMode } from './config.debug'
import { companionNodes$, router } from './on-load'
import { SearchView } from './how-to/search.view'
import { from } from 'rxjs'
import pkgJson from '../../package.json'
// Register links
import './md-widgets'

import * as webpm from '@w3nest/webpm-client'
import type * as NotebookModule from '@mkdocs-ts/notebook'

export const project = {
    name: 'webpm-client',
    docBasePath: `../assets/api`,
}

export const url = (restOfPath: string) =>
    webpm.resolveUrlWithFP({
        package: pkgJson.name,
        version: pkgJson.version,
        path: `assets/${restOfPath}`,
    })

export const placeholders = {
    '{{project}}': project.name,
    '{{webpm-version}}': pkgJson.version,
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
export async function installNotebookModule() {
    const notebookVersion = pkgJson.webpm.dependencies['@mkdocs-ts/notebook']
    const { Notebook } = await webpm.install<{
        Notebook: typeof NotebookModule
    }>({
        esm: [`@mkdocs-ts/notebook#${notebookVersion} as Notebook`],
        css: [`@mkdocs-ts/notebook#${notebookVersion}~assets/notebook.css`],
    })
    return Notebook
}

GlobalMarkdownViews.factory = {
    ...GlobalMarkdownViews.factory,
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
    runTimeView: () => {
        return {
            tag: 'div' as const,
            children: [
                child$({
                    source$: from(installNotebookModule()),
                    vdomMap: (mdle) => {
                        return new mdle.NotebookSection({
                            src: `<js-cell cell-id="monitoring">
const { RuntimeView } = await webpm.installViewsModule()
display(new RuntimeView())
</js-cell>
`,
                            router,
                        })
                    },
                }),
            ],
        }
    },
    confettiExample: () => {
        return {
            tag: 'div' as const,
            children: [
                child$({
                    source$: from(installNotebookModule()),
                    vdomMap: (mdle) => {
                        return new mdle.NotebookSection({
                            src: `<js-cell cell-id="monitoring">
const { JSConfetti } = await webpm.install({
    esm:["js-confetti#^0.12.0 as JSConfetti"]
})
new JSConfetti().addConfetti({
    emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸']
})
</js-cell>
`,
                            router,
                        })
                    },
                }),
            ],
        }
    },
}
