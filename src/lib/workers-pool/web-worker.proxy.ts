import { EntryPointArguments } from './workers-factory'

/**
 * Trait for abstracting the concept of Web Worker; default implementation is based on
 * the WebWorker API provided by the browser, see {@link WebWorkerBrowser}.
 */
export interface WWorkerTrait {
    /**
     * Worker's UID
     */
    uid: string

    /**
     * Send a task execution request to the worker.
     *
     * @param params.taskId Task ID.
     * @param params.entryPoint Function to execute.
     * @param params.args Arguments to provide.
     */
    execute<T>(params: {
        taskId: string
        entryPoint: (args: EntryPointArguments<T>) => unknown
        args: T
    })

    /**
     * Send to the worker some data in the channel associated to `taskId`.
     *
     * @param params.taskId task ID
     * @param params.data arguments to send
     */
    send(params: { taskId: string; data: unknown })

    /**
     * Terminate the worker.
     */
    terminate()
}

export type InWorkerAction = ({ message, workerScope }) => void
/**
 * Proxy interface for Web Workers creation.
 *
 * The default implementation used is the one provided by the browser ({@link WebWorkersBrowser}).
 */
export interface IWWorkerProxy {
    type: string

    /**
     * Create a worker.
     */
    createWorker({
        onMessageWorker,
        onMessageMain,
    }: {
        onMessageWorker: (message) => unknown
        onMessageMain: (message) => unknown
    }): WWorkerTrait

    /**
     * Prepare a function to be send in a worker.
     */
    serializeFunction(fct?: (...unknown: unknown[]) => unknown): string

    /**
     * Optional action to trigger before installing environment in a worker.
     */
    onBeforeWorkerInstall?: InWorkerAction
    /**
     * Optional action to trigger after installing environment in a worker.
     */
    onAfterWorkerInstall?: InWorkerAction
}

/**
 * Implementation of {@link WWorkerTrait} for Web Workers provided by browsers.
 */
export class WebWorkerBrowser implements WWorkerTrait {
    /**
     * Immutable Constants
     */
    public readonly uid: string
    /**
     * Immutable Constants
     */
    public readonly worker: Worker

    constructor(params: { uid: string; worker: Worker }) {
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
                entryPoint: `return ${String(entryPoint)}`,
            },
        }
        this.worker.postMessage(message)
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
        this.worker.postMessage(messageToWorker)
    }

    terminate() {
        this.worker.terminate()
    }
}

/**
 * Implementation of {@link IWWorkerProxy} for browser environment.
 */
export class WebWorkersBrowser implements IWWorkerProxy {
    type = 'WebWorkersBrowser'
    createWorker({
        onMessageWorker,
        onMessageMain,
    }: {
        onMessageWorker: (message) => unknown
        onMessageMain: (message) => unknown
    }) {
        const blob = new Blob(
            ['self.onmessage = ', onMessageWorker.toString()],
            {
                type: 'text/javascript',
            },
        )
        const url = URL.createObjectURL(blob)
        const worker = new Worker(url)

        worker.onmessage = onMessageMain
        return new WebWorkerBrowser({
            uid: `w${String(Math.floor(Math.random() * Math.pow(10, 6)))}`,
            worker,
        })
    }

    /**
     * Serialize a given function as string.
     *
     * @param fct Function to serialize
     * @returns Implementation
     */
    serializeFunction(fct?: (...unknown) => unknown): string {
        return `return ${String(fct)}`
    }
}
