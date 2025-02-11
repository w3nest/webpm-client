import { installCodeApiModule, MdWidgets } from 'mkdocs-ts'
import { AppNav, createRootContext, placeholders } from '../common'
import { firstValueFrom } from 'rxjs'

export async function apiNav(): Promise<AppNav> {
    const context = createRootContext({
        threadName: `CodeAPI`,
        labels: ['CodeApi'],
    })

    const CodeApiModule = await installCodeApiModule()
    // This is to preload for javascript snippets included in the API documentation, such that the `scrollTo` is
    // working well.
    await firstValueFrom(
        MdWidgets.CodeSnippetView.fetchCmDependencies$('javascript'),
    )
    return CodeApiModule.codeApiEntryNode(
        {
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
        },
        context,
    )
}
