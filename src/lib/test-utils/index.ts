import {
    EntryPointArguments,
    entryPointWorker,
    IWWorkerProxy,
    Message,
    MessageExit,
    WWorkerTrait,
} from '../workers-pool'
import { InWorkerAction } from '../workers-pool'
import type * as cdnClient from '../workers-pool.installer'

export class NotCloneableData {
    public readonly notCloneable = true
}

/**
 * Implementation of {@link WWorkerTrait} for testing purpose using Jest.
 */
export class WebWorkerJest implements WWorkerTrait {
    public readonly uid: string
    public readonly messages: Message[] = []
    public readonly globalEntryPoint: typeof entryPointWorker
    onMessageWorker: (message: { data: Message }) => unknown
    onMessageMain: (message: { data: Message }) => unknown

    constructor(params: {
        uid: string
        onMessageWorker: (message) => unknown
        onMessageMain: (message) => unknown
        globalEntryPoint: typeof entryPointWorker
    }) {
        Object.assign(this, params)
    }

    execute<T>({
        taskId,
        entryPoint,
        args,
    }: {
        taskId: string
        entryPoint: (args: EntryPointArguments<T>) => unknown
        args: T
    }) {
        const message = {
            type: 'Execute',
            data: {
                taskId,
                workerId: this.uid,
                args,
                entryPoint,
            },
        }
        setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- testing workaround
            // @ts-ignore
            this.globalEntryPoint({ data: message })
        }, 0)
    }
    send({ taskId, data }: { taskId: string; data: unknown }) {
        const messageToWorker = {
            type: 'MainToWorkerMessage',
            data: {
                taskId,
                workerId: this.uid,
                data,
            },
        }
        setTimeout(() => {
            this.globalEntryPoint({ data: messageToWorker } as MessageEvent)
        }, 0)
    }
    sendBackToMain(message: Message) {
        this.messages.push(message)
        this.onMessageMain({ data: message })
    }
    terminate() {
        /*no op*/
    }
}

/**
 * Implementation of {@link IWWorkerProxy} for testing purpose using Jest.
 */
export class WebWorkersJest implements IWWorkerProxy {
    public readonly type = 'WebWorkersJest'
    static workers: Record<string, WebWorkerJest> = {}
    public readonly globalEntryPoint: typeof entryPointWorker

    public readonly onBeforeWorkerInstall?: InWorkerAction
    public readonly onAfterWorkerInstall?: InWorkerAction

    constructor(params: {
        globalEntryPoint: typeof entryPointWorker
        cdnClient: typeof cdnClient
        onBeforeWorkerInstall?: InWorkerAction
        onAfterWorkerInstall?: InWorkerAction
    }) {
        Object.assign(this, params)

        globalThis.importScripts = () => {
            // this is only called when 'installing' cdnClient in worker
            window['@youwol/webpm-client'] = params.cdnClient
        }

        globalThis.postMessage = (
            message: Message & {
                data: {
                    notCloneable: boolean
                    result: { notCloneable: boolean }
                } & MessageExit
            },
        ) => {
            if (message.data.notCloneable || message.data.result.notCloneable) {
                throw Error('Data can not be cloned to be sent to worker')
            }
            //setTimeout because in worker 'postMessage' let the eventLoop to process the next task
            setTimeout(() => {
                const workerId = message.data.workerId
                const worker = WebWorkersJest.workers[workerId]
                worker.sendBackToMain(message)
            }, 0)
        }
    }
    createWorker({
        onMessageWorker,
        onMessageMain,
    }: {
        onMessageWorker: (message: Message) => unknown
        onMessageMain: (message: Message) => unknown
    }) {
        const worker = new WebWorkerJest({
            uid: `w${String(Math.floor(Math.random() * Math.pow(10, 6)))}`,
            onMessageWorker,
            onMessageMain,
            globalEntryPoint: this.globalEntryPoint,
        })
        WebWorkersJest.workers[worker.uid] = worker
        return worker
    }

    serializeFunction(fct: (...unknown: unknown[]) => unknown) {
        // In test env, serialization is skipped, this is workaround
        return fct as unknown as string
    }
}

export function isInstanceOfWebWorkersJest(
    instance: unknown,
): instance is WebWorkersJest {
    if (instance === null || typeof instance !== 'object') {
        return false
    }
    return 'type' in instance && instance.type === 'WebWorkersJest'
}
