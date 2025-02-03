import { setup } from '../auto-generated'
import * as webpmClient from '.'

export type ViewsModule = typeof import('./views')

/**
 * Install the {@link ViewsModule}.
 *
 */
export async function installViewsModule(): Promise<ViewsModule> {
    const viewsModule = (await setup.installAuxiliaryModule({
        name: 'views',
        cdnClient: webpmClient,
        installParameters: {
            executingWindow: window,
            css: [`${setup.name}#${setup.version}~assets/style.css`],
        },
    })) as unknown as ViewsModule
    viewsModule.Dependencies.webpm = webpmClient
    return viewsModule
}
