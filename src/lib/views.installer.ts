import * as webpmClient from '.'
import pkgJson from '../../package.json'
/**
 * Type definition of the module {@link ViewsModule}.
 */
export type ViewsModule = typeof import('./views')

/**
 * Install the {@link ViewsModule}.
 *
 */
export async function installViewsModule(): Promise<ViewsModule> {
    const { viewsModule } = await webpmClient.install<{
        viewsModule: ViewsModule
    }>({
        esm: [`${pkgJson.name}/views#${pkgJson.version} as viewsModule`],
        css: [`${pkgJson.name}#${pkgJson.version}~assets/style.css`],
    })
    viewsModule.Dependencies.webpm = webpmClient
    return viewsModule
}
