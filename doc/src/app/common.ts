import {
    Navigation,
    DefaultLayout,
    fromMarkdown,
    installNotebookModule,
} from 'mkdocs-ts'
import { AnyVirtualDOM } from 'rx-vdom'
import { setup } from '../auto-generated'

export const project = {
    name: 'webpm-client',
    docBasePath: `../assets/api`,
}

export const url = (restOfPath: string) => `../assets/${restOfPath}`

export const placeholders = {
    '{{project}}': project.name,
    '{{webpm-version}}': setup.version,
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
