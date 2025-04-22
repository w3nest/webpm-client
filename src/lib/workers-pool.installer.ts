import * as webpmClient from '.'
import { backendConfiguration } from '.'
import { InWorkerAction } from './workers-pool'
import pkgJson from '../../package.json'
/**
 * Type definition of the module {@link WorkersPoolModule}.
 */
export type WorkersModule = typeof import('./workers-pool')

export type TestUtilsModule = typeof import('./test-utils')

function setupWorkersPoolModule(module: WorkersModule) {
    let config = {
        ...webpmClient.Client.BackendConfiguration,
    }
    if (config.origin === '') {
        /**
         * In worker, it is not possible to use relative URL for request => we make it explicit here
         * from the window's location.
         * This is only when the cdnClient lib is used with 'standard' configuration.
         */
        config = backendConfiguration({
            pathLoadingGraph: config.urlLoadingGraph,
            pathResource: config.urlResource,
            origin:
                window.location.origin === 'null'
                    ? window.location.ancestorOrigins[0]
                    : window.location.origin,
        })
    }
    module.WorkersPool.backendsPartitionId =
        webpmClient.Client.backendsPartitionId
    module.WorkersPool.BackendConfiguration = config
    module.WorkersPool.FrontendConfiguration =
        webpmClient.Client.FrontendConfiguration
}
// noinspection JSValidateJSDoc
/**
 * Install {@link WorkersPoolModule}.
 *
 * @category WorkersPool
 */
export async function installWorkersPoolModule(): Promise<WorkersModule> {
    return await webpmClient
        .install<{ wpModule: WorkersModule }>({
            esm: [`${pkgJson.name}/workersPool#${pkgJson.version} as wpModule`],
        })
        .then(({ wpModule }) => {
            setupWorkersPoolModule(wpModule)
            return wpModule
        })
}

export async function installTestWorkersPoolModule({
    onBeforeWorkerInstall,
    onAfterWorkerInstall,
}: {
    onBeforeWorkerInstall?: InWorkerAction
    onAfterWorkerInstall?: InWorkerAction
} = {}): Promise<WorkersModule> {
    return await Promise.all([
        installWorkersPoolModule(),
        webpmClient
            .install<{ testModule: TestUtilsModule }>({
                esm: [
                    `${pkgJson.name}/testUtils#${pkgJson.version} as testModule`,
                ],
            })
            .then(({ testModule }) => testModule),
    ]).then(([module, test]: [WorkersModule, TestUtilsModule]) => {
        module.WorkersPool.webWorkersProxy = new test.WebWorkersJest({
            globalEntryPoint: module.entryPointWorker,
            cdnClient: webpmClient,
            onBeforeWorkerInstall: onBeforeWorkerInstall,
            onAfterWorkerInstall: onAfterWorkerInstall,
        })
        return module
    })
}
