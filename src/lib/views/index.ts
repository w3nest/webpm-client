/**
 * This module provides UI components for visualizing installed resources and tracking real-time
 * installation progress.
 *
 * <note level="warning">
 * This module is **not included by default** in the main library.
 * It must be explicitly installed using {@link MainModule.installViewsModule}.
 * </note>
 *
 *
 * Key components include:
 * - {@link installWithUI}: A convenient wrapper around {@link MainModule.install} that integrates a visual progress
 *   indicator.
 * - {@link RuntimeView}: Displays a snapshot of currently installed resources.
 * - {@link WorkersPoolView}: Provides a dynamic visualization of a {@link WorkersPoolModule.WorkersPool}.
 *
 * Additionally, this module offers components for building **custom views**, allowing tailored
 * monitoring and interaction with installed resources.
 *
 * @module ViewsModule
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
export * from './runtime.view'
export * from './loading-graph.view'

/**
 * Dependencies of this sub-module (set by the main module of the library).
 */
export interface Dependencies {
    /**
     * Point to the main module instance.
     */
    webpm?: typeof WebPM
}
/**
 * Dependencies instance.
 */
export const Dependencies: Dependencies = {}

/**
 * Installs dependencies while displaying a real-time installation progress UI.
 *
 * **Functionality Overview:**
 * - Creates an {@link InstallView} to visualize and respond to {@link MainModule.CdnEvent} updates.
 * - Calls the user-provided `display` callback with the generated view.
 *   - The consumer is responsible for inserting this view into the DOM,
 *     optionally converting it into a standard `HTMLElement` using {@link rx-vdom.render}.
 * - Invokes {@link MainModule.install}, forwarding the provided `inputs` argument.
 *
 * @param inputs The standard installation inputs, extended with a `display` attribute.
 * @param inputs.display A callback that receives the generated view (as a VirtualDOM)
 *   before the installation process starts.
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
