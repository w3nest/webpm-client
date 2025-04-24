export { Client, install, queryLoadingGraph } from './client'
export { StateImplementation, LibraryName, Version } from './state'
export * from './loading-screen.view'
export * from './inputs.models'
export {
    backendConfiguration,
    BackendConfiguration,
    getLocalCookie,
    Cookie,
} from './backend-configuration'
export { FrontendConfiguration } from './frontend-configuration'
export * from './errors.models'
export * from './events.models'
export {
    getAssetId,
    getUrlBase,
    parseResourceId,
    normalizeInstallInputs,
    InstallInputsNormalized,
} from './utils'

export { BackendClient } from './backends'
export * as WorkersPoolTypes from './workers-pool/index-types'
export * as TestUtilsTypes from './test-utils/index-types'
export { installViewsModule, ViewsModule } from './views.installer'
export * from './workers-pool.installer'
import pkgJson from '../../package.json'

export const version = pkgJson.version
