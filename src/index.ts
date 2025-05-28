// noinspection JSValidateJSDoc

/**
 * The main module of this library is responsible for resource installation within the main thread of the browser,
 * using the {@link install} function.
 *
 * @module MainModule
 */
export * from './lib'
import { getW3NestCookie, Client, backendConfiguration } from './lib'
import * as allModule from './lib'
import pkgJson from '../package.json'

const defaultConfig = {
    type: 'remote',
    webpm: {
        pathLoadingGraph:
            'https://w3nest.org/api/assets-gateway/webpm/queries/loading-graph',
        pathResource: 'https://w3nest.org/api/assets-gateway/webpm/resources',
    },
}
// In a worker, globalThis.document is undefined
//      -> no config initialization here.
//      -> it is propagated when calling 'installWorkersPoolModule'.
// In Node environment (e.g. jest tests) `globalThis.document.currentScript` is undefined
//      -> it has to be set as `Client.BackendConfiguration` static member.
// When this package is installed using another instance of webpm-client
//      -> 'globalThis.document?.currentScript' is defined, but not the 'src' attribute
//      -> it is the responsibility of the parent installer to propagate the configurations (see
//      {@link applyModuleSideEffects})
const scriptSrc = (
    globalThis as { document?: Document }
).document?.currentScript?.getAttribute('src')

if (scriptSrc) {
    const cookie = getW3NestCookie()

    if (cookie) {
        Client.BackendConfiguration = backendConfiguration({
            origin: cookie.origin,
            ...cookie.webpm,
        })
        // We are not sure whether backends have been installed under the auto-generated default partition ID.
        // Worst case scenario we got a 404.
        if (cookie.webpm.pathBackendUninstall) {
            const url = cookie.webpm.pathBackendUninstall.replace(
                '%UID%',
                Client.backendsPartitionId,
            )
            window.addEventListener('beforeunload', () => {
                fetch(url, { method: 'DELETE', keepalive: true }).catch(() => {
                    /*No OP*/
                })
            })
        }
    } else {
        Client.BackendConfiguration = backendConfiguration({
            ...defaultConfig.webpm,
        })
    }
    const crossOrigin = document.currentScript?.getAttribute('crossorigin')
    if (crossOrigin != null) {
        Client.FrontendConfiguration = {
            crossOrigin,
        }
    }
}

if (!globalThis[pkgJson.name]) {
    globalThis[pkgJson.name] = allModule
    globalThis.webpm = allModule
}
