import { DefaultLayout } from 'mkdocs-ts'
import { AppNav, createRootContext, placeholders } from '../common'
import { companionNodes$ } from '../on-load'
import type * as CodeApiModule from '@mkdocs-ts/code-api'
import * as webpm from '@w3nest/webpm-client'
import * as pkgJson from '../../../package.json'

export async function installCodeApiModule() {
    const codeApiVersion = pkgJson.webpm.dependencies['@mkdocs-ts/code-api']
    const { CodeApi } = await webpm.install<{
        CodeApi: typeof CodeApiModule
    }>({
        esm: [`@mkdocs-ts/code-api#${codeApiVersion} as CodeApi`],
        css: [`@mkdocs-ts/code-api#${codeApiVersion}~assets/ts-typedoc.css`],
    })
    return CodeApi
}

export async function apiNav(): Promise<AppNav> {
    const context = createRootContext({
        threadName: `CodeAPI`,
        labels: ['CodeApi'],
    })

    const CodeApiModule = await installCodeApiModule()

    const baseUrl = webpm.getUrlBase(pkgJson.name, pkgJson.version)
    return CodeApiModule.codeApiEntryNode(
        {
            name: 'API',
            header: {
                icon: {
                    tag: 'i' as const,
                    class: `fas fa-code`,
                },
                actions: [
                    DefaultLayout.splitCompanionAction({
                        path: '/api',
                        companionNodes$,
                    }),
                ],
            },
            entryModule: 'webpm-client',
            dataFolder: `${baseUrl}/assets/api`,
            rootModulesNav: {
                'webpm-client': '@nav/api',
            },
            configuration: {
                ...CodeApiModule.configurationTsTypedoc,
                mdParsingOptions: {
                    placeholders,
                },
            },
        },
        context,
    )
}
