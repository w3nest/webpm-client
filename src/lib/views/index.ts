/**
 * This module gathers view related components to display real time progress of installation.
 *
 * @module Views
 */
import type { InstallInputs } from '../inputs.models'
import type { AnyVirtualDOM } from 'rx-vdom'
import type * as WebPM from '..'
import { InstallView } from './install.view'

export * from './install.view'
export * from './backend.view'
export * from './common.view'
export * from './css.view'
export * from './esm.view'
export * from './logs.view'
export * from './pyodide.view'
export * from './events-manager'
export * from './workers-pool.views'

interface Dependencies {
    webpm?: typeof WebPM
}
export const Dependencies: Dependencies = {}

/**
 * Installs dependencies while displaying a real-time installation progress UI.
 *
 * @param inputs An object containing installation parameters along with a display callback to render the
 * installation UI.
 * @returns A Promise resolving to an object containing the installed modules.
 */
export function installWithUI(
    inputs: InstallInputs & { display: (v: AnyVirtualDOM) => void },
) {
    if (!Dependencies.webpm) {
        throw Error(
            "The webpm's `Views` module should be installed using `webpm.installViewsModule`",
        )
    }
    const view = new InstallView()
    inputs.display(view)
    return Dependencies.webpm.install({
        ...inputs,
        onEvent: (ev) => {
            if (inputs.onEvent) {
                inputs.onEvent(ev)
            }
            view.onEvent(ev)
        },
    })
}
