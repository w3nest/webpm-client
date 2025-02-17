/** @format */

import { BehaviorSubject, forkJoin, Observable, of, Subject } from 'rxjs'
import { filter, last, map, take, takeWhile, tap } from 'rxjs/operators'
import { CdnEvent, getAssetId, isCdnEvent } from '..'
import {
    InWorkerAction,
    IWWorkerProxy,
    WebWorkersBrowser,
    WWorkerTrait,
} from './web-worker.proxy'
import { setup } from '../../auto-generated'
import { BackendConfiguration } from '../backend-configuration'
import { FrontendConfiguration } from '../frontend-configuration'
import {
    InstallInputsDeprecated,
    isDeprecatedInputs,
    upgradeInstallInputs,
} from '../inputs.models.deprecated'
import { InstallInputs } from '../inputs.models'
import type * as WebpmClient from '../../lib'

type WorkerId = string

/**
 * Interface specification for `Context` object.
 */
export interface ContextTrait {
    /**
     * Append a child context, usually wrapping a function call.
     *
     * @param name Name (usually the function name).
     * @param cb The callback triggering the action.
     * @returns The callback's return
     */
    withChild: <T>(name: string, cb: (ctx: ContextTrait) => T) => T
    info: (text: string, data?: unknown) => void
}

/**
 * Empty implementation of {@link ContextTrait}.
 */
export class NoContext implements ContextTrait {
    withChild<T>(_name: string, cb: (ctx: ContextTrait) => T): T {
        return cb(this)
    }
    info(text: string, data?: unknown) {
        /** no op*/
        console.log(text, data)
    }
}

// noinspection JSValidateJSDoc
/**
 * Any {@link MainModule.CdnEvent} emitted from a Worker ({@link WWorkerTrait}).
 */
export type CdnEventWorker = CdnEvent & {
    workerId: string
}

export function implementEventWithWorkerTrait(
    event: unknown,
): event is CdnEventWorker {
    return isCdnEvent(event) && 'workerId' in event
}

/**
 * A special type of {@link MessageData} for {@link MainModule.CdnEvent}.
 */
export interface MessageCdnEvent {
    type: 'CdnEvent'
    workerId: string
    taskId: string
    event: CdnEvent
}

function isCdnEventMessage(message: Message): undefined | CdnEventWorker {
    if (message.type !== 'Data') {
        return undefined
    }
    const data = message.data
    if (!('type' in data) || !('event' in data)) {
        return undefined
    }
    if (data.type === 'CdnEvent' && typeof data.event === 'object') {
        return { ...data.event, workerId: data.workerId } as CdnEventWorker
    }
    return undefined
}

export interface WorkerFunction<T> {
    id: string
    target: T
}

export interface WorkerVariable<T> {
    id: string
    value: T
}

/**
 * Task specification.
 *
 * @typeParam TArgs Type of the entry point's arguments
 * @typeParam TReturn Type of the entry point's return
 * (emitted afterward using {@link MessageExit}).
 */
export interface Task<TArgs = unknown, TReturn = unknown> {
    /**
     * Title of the task.
     */
    title: string
    /**
     * Entry point implementation.
     *
     * <note level="warning">
     * All variables referenced by the entry point should be available within the workers environment.
     * </note>
     *
     * @param args arguments of the entrypoint, see {@link Task.args}.
     * @returns the value returned must follow
     * [structured clone algo](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
     */
    entryPoint: (args: TArgs) => TReturn | Promise<TReturn>
    /**
     * Arguments to forward to the entry point upon execution.
     *
     * Must follow
     * [structured clone algo](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
     */
    args: TArgs
}

/**
 * Specifies worker environment.
 */
export interface WorkerEnvironment {
    /**
     * Global variables accessible in worker environment.
     */
    variables: WorkerVariable<unknown>[]
    /**
     * Global functions  accessible in worker environment.
     */
    functions: WorkerFunction<unknown>[]
    /**
     * Installation instruction to be executed in worker environment.
     */
    cdnInstallation: InstallInputs
    /**
     * Tasks to realized after installation is done and before marking a worker as ready.
     */
    postInstallTasks?: Task[]
}

/**
 * Context available in {@link WWorkerTrait} to log info or send data.
 * All data must follow
 * [structured clone algo](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).
 *
 */
export interface WorkerContext {
    /**
     * The info logged are send from the workers to the main thread as
     * {@link MessageLog}.
     *
     * @param text title of the log
     * @param data data associated.
     */
    info: (text: string, data?: unknown) => void
    /**
     * The data logged are send from the workers to the main thread as
     * {@link MessageData}.
     *
     * @param data data to send.
     */
    sendData: (data: Record<string, unknown>) => void

    /**
     * If defined by the developer in its worker's implementation,
     * every message send using {@link WorkersPool.sendData} (from the main thread) will
     * be intercepted by this callback.
     */
    onData?: (message: unknown) => void
}

/**
 * Message send from the workers to the main thread when a task is started.
 *
 */
export interface MessageExecute {
    /**
     * ID of the task
     */
    taskId: string
    /**
     * ID of the worker
     */
    workerId: string
    /**
     * Serialized entry point
     */
    entryPoint: string
    /**
     * Arguments provided
     */
    args: unknown
}

/**
 * Message emitted from workers when a task is started.
 */
export interface MessageStart {
    taskId: string
    workerId: string
}

/**
 * Message emitted from workers when a task is terminated.
 */
export type MessageExit = {
    /**
     * Task ID.
     */
    taskId: string
    /**
     * Worker ID.
     */
    workerId: string
} & (
    | {
          error: true
          /**
           * Data structure for failure.
           */
          result: Error
      }
    | {
          error: false
          /**
           * Data structure for successful processing.
           */
          result: unknown
      }
)

/**
 * Message emitted from workers when a log is sent (see {@link WorkerContext}).
 */
export interface MessageLog {
    workerId: string
    taskId: string
    text: string
    json: unknown // Json
}

/**
 * Message emitted from workers when a data is sent (see {@link WorkerContext}).
 */
export interface MessageData {
    taskId: string
    workerId: string
    [k: string]: unknown
}

/**
 * Message emitted from workers when an error occurred.
 */
export interface MessagePostError {
    taskId: string
    workerId: string
    error: Error
}

/**
 * Message send from the main thread to a worker for a particular task.
 * See {@link WorkersPool.sendData}.
 */
export interface MainToWorkerMessage {
    /**
     * ID of the task
     */
    taskId: string

    /**
     * ID of the worker
     */
    workerId: string

    /**
     * Data forwarded
     */
    data: unknown
}

/**
 * Represents the available `type` in {@link Message}.
 */
export type MessageType =
    | 'Execute'
    | 'Exit'
    | 'Start'
    | 'Log'
    | 'Data'
    | 'MainToWorkerMessage'
    | 'PostError'
    | 'CdnEvent'

/**
 * Type mapping between {@link MessageType} and associated data structure.
 */
export type MessageContent = {
    Execute: MessageExecute
    Exit: MessageExit
    Start: MessageStart
    Log: MessageLog
    Data: MessageData
    MainToWorkerMessage: MainToWorkerMessage
    PostError: MessagePostError
    CdnEvent: MessageCdnEvent
}
/**
 * Messages exchanged between the main and the workers' thread.
 *
 * Emitted from the worker thread to the main thread:
 * *  {@link MessageExecute}
 * *  {@link MessageStart}
 * *  {@link MessageCdnEvent}
 * *  {@link MessageLog}
 * *  {@link MessageData}
 * *  {@link MessagePostError}
 * *  {@link MessageExit}
 *
 * Emitted from the main thread to the worker thread:
 * *  {@link MainToWorkerMessage}
 */
export type Message =
    | { type: 'Execute'; data: MessageExecute }
    | { type: 'Exit'; data: MessageExit }
    | { type: 'Start'; data: MessageStart }
    | { type: 'Log'; data: MessageLog }
    | { type: 'Data'; data: MessageData }
    | { type: 'MainToWorkerMessage'; data: MainToWorkerMessage }
    | { type: 'PostError'; data: MessagePostError }
    | { type: 'CdnEvent'; data: MessageCdnEvent }

/**
 * Encapsulates arguments to be sent to a task's entry point (implementation function).
 */
export interface EntryPointArguments<TArgs> {
    /**
     * The arguments with witch the entry point is called.
     *
     * Should follow the
     * [structured clone algo](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).
     */
    args: TArgs
    /**
     * The task ID.
     */
    taskId: string
    /**
     * The worker ID.
     */
    workerId: string
    /**
     * The context, used for logging or sending data back to the main thread.
     */
    context: WorkerContext
    /**
     * The worker scope.
     */
    workerScope: Record<string, unknown>
}

export function entryPointWorker(messageEvent: MessageEvent) {
    // The following interface avoid the interpreter to interpret self as 'Window':
    // in a worker 'self' is of type DedicatedWorkerGlobalScope.
    // We can get a proper type definition for DedicatedWorkerGlobalScope from typescript:
    //   * add 'webworker' in 'compilerOptions.lib'
    //   * **BUT** typedoc then fails to run, complaining about duplicated declaration.
    // Not sure how to fix this, we keep the documentation working for now using this workaround
    // In TypeScript, the 'Worker' type refers to the global object that represents a web worker.
    // The 'DedicatedWorkerGlobalScope' interface is a subset of the global object that is available to
    // dedicated workers, which are a type of web worker that runs in a single thread.
    interface DedicatedWorkerGlobalScope {
        // message type: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
        postMessage: (message: unknown) => void
    }

    const message = messageEvent.data as unknown as Message
    const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope & {
        window: unknown
    }

    // contextByTasks allows to communicate from main to worker after tasks have started execution.
    // In worker's implementation, the developer has to define the property `onMessage` of the received `context`.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    globalThis.contextByTasks = globalThis.contextByTasks || {}
    const contextByTasks = globalThis.contextByTasks as Record<
        string,
        WorkerContext
    >

    const postMessage = (message: { type: string; data: unknown }) => {
        try {
            workerScope.postMessage(message)
        } catch (e: unknown) {
            console.error(
                `Failed to post message from worker to main thread.`,
                message,
            )
            if (message.type === 'Exit') {
                const data = message.data as MessageExit
                if (data.taskId in contextByTasks) {
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                    delete contextByTasks[data.taskId]
                }
                workerScope.postMessage({
                    type: 'Exit',
                    data: {
                        taskId: data.taskId,
                        workerId: data.workerId,
                        error: true,
                    },
                })
            }
            const data = message.data as MessageData | MessageLog
            workerScope.postMessage({
                type: 'PostError',
                data: {
                    taskId: data.taskId,
                    workerId: data.workerId,
                    error: e,
                },
            })
        }
    }

    if (message.type === 'MainToWorkerMessage') {
        const messageContent: MainToWorkerMessage =
            message.data as unknown as MainToWorkerMessage
        const { taskId, data } = messageContent
        if (contextByTasks[taskId].onData) {
            contextByTasks[taskId].onData(data)
        }
    }
    // Following is a workaround to allow installing libraries using 'window' instead of 'globalThis' or 'self'.
    workerScope.window = globalThis
    if (message.type === 'Execute') {
        const data: MessageExecute = message.data as unknown as MessageExecute
        const context: WorkerContext = {
            info: (text, json) => {
                postMessage({
                    type: 'Log',
                    data: {
                        taskId: data.taskId,
                        workerId: data.workerId,
                        logLevel: 'info',
                        text,
                        json: json,
                    },
                })
            },
            sendData: (consumerData) => {
                postMessage({
                    type: 'Data',
                    data: {
                        ...consumerData,
                        ...{ taskId: data.taskId, workerId: data.workerId },
                    },
                })
            },
        }

        contextByTasks[data.taskId] = context
        type EntryPointFunc = (args: unknown) => unknown
        const entryPoint =
            // The first branch is to facilitate test environment
            typeof data.entryPoint == 'function'
                ? (data.entryPoint as EntryPointFunc)
                : // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
                  (new Function(data.entryPoint)() as EntryPointFunc)

        postMessage({
            type: 'Start',
            data: {
                taskId: data.taskId,
                workerId: data.workerId,
            },
        })
        try {
            const resultOrPromise = entryPoint({
                args: data.args,
                taskId: data.taskId,
                workerId: data.workerId,
                workerScope: workerScope,
                context,
            })
            if (resultOrPromise instanceof Promise) {
                resultOrPromise
                    .then((result: unknown) => {
                        postMessage({
                            type: 'Exit',
                            data: {
                                taskId: data.taskId,
                                workerId: data.workerId,
                                error: false,
                                result: result,
                            },
                        })
                    })
                    .catch((error: unknown) => {
                        postMessage({
                            type: 'Exit',
                            data: {
                                taskId: data.taskId,
                                workerId: data.workerId,
                                error: true,
                                result: error,
                            },
                        })
                    })
                return
            }

            postMessage({
                type: 'Exit',
                data: {
                    taskId: data.taskId,
                    workerId: data.workerId,
                    error: false,
                    result: resultOrPromise,
                },
            })
        } catch (e: unknown) {
            postMessage({
                type: 'Exit',
                data: {
                    taskId: data.taskId,
                    workerId: data.workerId,
                    error: true,
                    result: e,
                },
            })
            return
        }
    }
}

/**
 * Message sent from the main thread to the workers to request installation of the {@link WorkerEnvironment}.
 */
export interface MessageInstall {
    backendsPartitionId: string
    backendConfiguration: BackendConfiguration
    frontendConfiguration: FrontendConfiguration
    cdnUrl: string
    variables: WorkerVariable<unknown>[]
    functions: { id: string; target: string }[]
    cdnInstallation: InstallInputs
    postInstallTasks: {
        title: string
        entryPoint: string
        args: unknown
    }[]
    onBeforeInstall?: InWorkerAction | string
    onAfterInstall?: InWorkerAction | string
}

function entryPointInstall(input: EntryPointArguments<MessageInstall>) {
    const markerInstallDone = '@w3nest/webpm-client:worker-install-done'
    if (self[markerInstallDone]) {
        // The environment is already installed
        return Promise.resolve()
    }

    type InstallFunc = (args: unknown) => unknown
    const deserializeFunction = (fct: string | InstallFunc) =>
        typeof fct === 'string'
            ? // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
              (new Function(fct)() as InstallFunc)
            : fct

    if (input.args.onBeforeInstall) {
        deserializeFunction(input.args.onBeforeInstall as unknown as string)({
            message: input.args,
            workerScope: input.workerScope,
        })
    }

    /**
     * The function 'importScriptsXMLHttpRequest' is used in place of
     * [importScripts](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts)
     * when 'FrontendConfiguration.crossOrigin' is "anonymous". Using 'importScripts' fails in this case
     * (request are blocked).
     */
    function importScriptsXMLHttpRequest(...urls: string[]) {
        urls.forEach((url) => {
            const request = new XMLHttpRequest()
            request.open('GET', url, false)
            request.send(null)
            eval(request.responseText)
        })
    }
    // @ts-expect-error need refactoring
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    self.customImportScripts = ['', 'anonymous'].includes(
        input.args.frontendConfiguration.crossOrigin ?? '',
    )
        ? importScriptsXMLHttpRequest
        : self['importScripts']

    console.log('Install environment in worker', input)

    // @ts-expect-error need refactoring
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    self.customImportScripts(input.args.cdnUrl)
    const webpm = self['@w3nest/webpm-client'] as typeof WebpmClient

    webpm.Client.BackendConfiguration = input.args.backendConfiguration
    webpm.Client.backendsPartitionId = input.args.backendsPartitionId
    const onEvent = (cdnEvent: WebpmClient.CdnEvent) => {
        const message = { type: 'CdnEvent', event: cdnEvent }
        input.context.sendData(message)
    }
    input.args.cdnInstallation.onEvent = onEvent
    const log = (text: string) => {
        onEvent(new webpm.ConsoleEvent('Info', 'Worker', text))
    }

    const install = webpm.install(input.args.cdnInstallation)

    log(`Start install in worker ${input.workerId}`)

    return install
        .then(() => {
            log(
                `Expose ${String(input.args.functions.length)} functions & ${String(input.args.variables.length)} variables.`,
            )

            input.args.functions.forEach((f) => {
                self[f.id] = deserializeFunction(f.target)
            })
            // @ts-expect-error need refactoring
            self.deserializeFunction = deserializeFunction
            input.args.variables.forEach((v) => {
                self[v.id] = v.value
            })
        })
        .then(() => {
            const donePromises = input.args.postInstallTasks.map((task) => {
                log(`Execute post-install task '${task.title}'`)
                // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
                const entryPoint = new Function(
                    task.entryPoint,
                )() as InstallFunc
                const r = entryPoint({
                    args: task.args,
                    context: input.context,
                    taskId: input.taskId,
                    workerScope: input.workerScope,
                })
                return r instanceof Promise ? r : Promise.resolve(r)
            })
            return Promise.all(donePromises)
        })
        .then(() => {
            input.context.info('Post install tasks done')
            input.context.sendData({
                type: 'installEvent',
                value: 'install done',
            })
            log(`Install done`)

            if (input.args.onAfterInstall) {
                log(`Trigger static 'onAfterInstall'`)
                deserializeFunction(
                    input.args.onAfterInstall as unknown as string,
                )({
                    message: input.args,
                    workerScope: input.workerScope,
                })
            }
            self[markerInstallDone] = true
        })
}

/**
 * A process is an abstraction managing lifecycle of a particular task.
 * Not doing much for now besides gathering callbacks to call at different stage of the task (logging into console).
 */
export class Process {
    /**
     * Task's id.
     */
    public readonly taskId: string
    /**
     * Task's title.
     */
    public readonly title: string
    /**
     * Associated context.
     */
    public readonly context: ContextTrait

    constructor(params: {
        taskId: string
        title: string
        context: ContextTrait
    }) {
        Object.assign(this, params)
    }

    schedule() {
        this.context.info(`Schedule task  ${this.title} (${this.taskId})`)
    }

    start() {
        this.context.info(`Start task  ${this.title} (${this.taskId})`)
    }

    fail(error: unknown) {
        console.error('An error occurred in a worker', error)
        this.context.info(`Task failed  ${this.title} (${this.taskId})`, {
            error,
        })
    }

    succeed() {
        this.context.info(`Task succeeded  ${this.title} (${this.taskId})`)
    }

    log(text: string) {
        this.context.info(`${this.title} (${this.taskId}): ${text}`)
    }
}

/**
 * Pool size specification.
 */
export interface PoolSize {
    /**
     * Initial number of workers to get ready before {@link WorkersPool.ready} is fulfilled.
     * Set to `1` by default.
     */
    startAt: number
    /**
     * Maximum number of workers.
     * Set to `max(1, navigator.hardwareConcurrency - 1)` by default.
     */
    stretchTo: number
}
/**
 * Input for {@link WorkersPool.constructor}.
 *
 */
export interface WorkersPoolInput {
    /**
     * If provided, all events regarding installation are forwarded here.
     * Otherwise {@link WorkersPool.cdnEvent$} is initialized and used.
     */
    cdnEvent$?: Subject<CdnEventWorker>
    /**
     * Globals variable to be copied in workers' environment, can be variables or functions.
     * Variables must be serializable using the structured clone algorithm, and functions can only reference
     * symbols available within the workers.
     */
    globals?: Record<string, unknown>
    /**
     * Installation to proceed in the workers.
     */
    install?: InstallInputs | InstallInputsDeprecated
    /**
     * A list of tasks to execute in workers after installation is completed.
     */
    postInstallTasks?: Task[]
    /**
     * A factory that create a `Context` objects used for logging purposes.
     *
     * @param name Name of the root node of the context.
     * @returns a `Context` object implementing {@link ContextTrait}.
     */
    ctxFactory?: (name: string) => ContextTrait

    /**
     * Constraints on the workers pool size.
     */
    pool?: PoolSize
}

/**
 * Input for {@link WorkersPool.schedule}.
 *
 * @typeParam TArgs type of the entry point's argument.
 */
export interface ScheduleInput<TArgs> {
    /**
     * Title of the task
     */
    title: string
    /**
     * Entry point of the task
     */
    entryPoint: (input: EntryPointArguments<TArgs>) => void
    /**
     * Arguments to forward to the entry point when executed
     */
    args: TArgs
    /**
     * If provided, schedule the task on this particular worker.
     */
    targetWorkerId?: string
}
/**
 * Entry point to create workers pool.
 *
 * It is constructed using {@link WorkersPool.constructor}, then task scheduling is achieved using
 * {@link WorkersPool.schedule}.
 *
 * The Workers Pool Module efficiently manages Web Workers by dynamically allocating and scheduling tasks based
 * on availability and resource constraints.
 *
 * **Task Scheduling:**
 *
 * *  When a task is submitted, the pool checks for **available workers**.
 * *  If a worker is **idle**, it immediately picks up the task.
 *
 * **Worker Allocation:**
 *
 * *  If no workers are available but the pool has **not reached its maximum limit**, a new worker is created
 *    to handle the task.
 * *  If the pool has already **stretched to its maximum capacity**, the task is queued until a worker becomes
 *    available.
 *
 * **Execution & Cleanup:**
 *
 * *  Once a worker completes a task, it is **either reused** for the next pending task or **remains idle**
 *    until needed.
 */
export class WorkersPool {
    static backendsPartitionId: string
    static BackendConfiguration: BackendConfiguration
    static FrontendConfiguration: FrontendConfiguration = {}
    static webWorkersProxy: IWWorkerProxy = new WebWorkersBrowser()

    /**
     * Constraints on workers' pool size.
     * @group Immutable Constants
     */
    public readonly pool: PoolSize

    private requestedWorkersCount = 0

    /**
     * All the {@link Message | messages } from all workers.
     *
     * @group Observables
     */
    public readonly mergedChannel$ = new Subject<Message>()
    /**
     * Observable that emit the list of started workers as soon as one or more is starting creation.
     *
     * @group Observables
     */
    public readonly startedWorkers$ = new BehaviorSubject<string[]>([])
    /**
     * Observable that emit a dictionary `workerId -> {worker, channel$}` each time new workers
     * are ready to be used (installation & post-install tasks achieved).
     *
     * The `channel$` object is streaming all associated worker's {@link Message}.
     *
     * @group Observables
     */
    public readonly workers$ = new BehaviorSubject<
        Record<
            string,
            {
                worker: WWorkerTrait
                channel$: Observable<Message>
            }
        >
    >({})
    /**
     * Observable that emit the list of running tasks each time one or more are created or stopped.
     *
     * @group Observables
     */
    public readonly runningTasks$ = new BehaviorSubject<
        { workerId: string; taskId: string; title: string }[]
    >([])
    /**
     * Observable that emits the id of workers that are currently running a tasks each time a task is started
     * or stopped.
     *
     * @group Observables
     */
    public readonly busyWorkers$ = new BehaviorSubject<string[]>([])
    /**
     * Observable that emits `{taskId, workerId}` each time a worker finished processing a task.
     *
     * @group Observables
     */
    public readonly workerReleased$ = new Subject<{
        workerId: WorkerId
        taskId: string
    }>()

    /**
     * If `CtxFactory` is provided in constructor's argument ({@link WorkersPoolInput}),
     * main thread logging information is available here.
     */
    public readonly backgroundContext: ContextTrait | undefined

    /**
     * Observable that gathers all the {@link CdnEventWorker} emitted by the workers.
     *
     * @group Observables
     */
    public readonly cdnEvent$: Subject<CdnEventWorker>

    /**
     * Workers' environment.
     *
     * @group Immutable Constants
     */
    public readonly environment: WorkerEnvironment

    private tasksQueue: {
        taskId: string
        title: string
        targetWorkerId?: string
        args: unknown
        channel$: Observable<Message>
        entryPoint: (d: EntryPointArguments<unknown>) => unknown
    }[] = []

    /**
     * Create an instance of worker pool.
     *
     * @param params Environment setup.
     */
    constructor(params: WorkersPoolInput) {
        this.backgroundContext = params.ctxFactory?.('background management')
        this.cdnEvent$ = params.cdnEvent$ ?? new Subject<CdnEventWorker>()
        // Need to manage lifecycle of following subscription
        this.workerReleased$.subscribe(({ workerId, taskId }) => {
            this.busyWorkers$.next(
                this.busyWorkers$.value.filter((wId) => wId !== workerId),
            )
            this.runningTasks$.next(
                this.runningTasks$.value.filter(
                    (task) => task.taskId !== taskId,
                ),
            )

            this.pickTask(workerId, this.backgroundContext)
        })
        const installArgs = params.install ?? {}
        this.environment = {
            variables: Object.entries(params.globals ?? {})
                .filter(([, value]) => typeof value != 'function')
                .map(([id, value]) => ({
                    id,
                    value,
                })),
            functions: Object.entries(params.globals ?? {})
                .filter(([, value]) => typeof value == 'function')
                .map(([id, target]) => ({
                    id,
                    target,
                })),
            cdnInstallation: isDeprecatedInputs(installArgs)
                ? upgradeInstallInputs(installArgs)
                : installArgs,
            postInstallTasks: params.postInstallTasks ?? [],
        }
        this.pool = {
            startAt: params.pool?.startAt ?? 0,
            stretchTo:
                params.pool?.stretchTo ??
                Math.max(1, navigator.hardwareConcurrency - 1),
        }
        this.reserve({ workersCount: this.pool.startAt ?? 0 }).subscribe()
    }

    /**
     * Reserve a particular amount of worker.
     * No workers are deleted, and the number of worker can not exceed `pool.stretchTo` property.
     * @param workersCount
     */
    reserve({ workersCount }: { workersCount: number }) {
        return forkJoin(
            new Array(workersCount)
                .fill(undefined)
                .map(() =>
                    this.createWorker$(this.backgroundContext).pipe(
                        map(({ channel$ }) => channel$),
                    ),
                ),
        )
    }

    /**
     * When this method is awaited, it ensures that `pool.startAt` workers are ready to be used
     * (installation & post-install tasks achieved).
     */
    async ready(): Promise<void> {
        if (Object.entries(this.workers$.value).length >= this.pool.startAt) {
            return
        }
        return new Promise<void>((resolve) => {
            this.workers$
                .pipe(
                    takeWhile(
                        (workers) =>
                            Object.entries(workers).length <
                            (this.pool.startAt ?? 1),
                    ),
                    last(),
                )
                .subscribe(() => {
                    resolve()
                })
        })
    }

    /**
     * Schedule a task.
     *
     * @param input task description
     * @param context context to log run-time info
     * @returns Observable on the {@link Message} emitted during task execution. In any case, the last message sent is
     * {@link MessageExit}.
     * @typeParam TArgs type of the entry point's argument
     */
    schedule<TArgs = unknown>(
        input: ScheduleInput<TArgs>,
        context = new NoContext(),
    ): Observable<Message> {
        const { title, entryPoint, args, targetWorkerId } = input
        return context.withChild('schedule', (ctx) => {
            const taskId = `t${String(Math.floor(Math.random() * Math.pow(10, 6)))}`
            const p = new Process({
                taskId,
                title,
                context: ctx,
            })
            const taskChannel$ = this.getTaskChannel$(p, taskId, ctx)

            if (targetWorkerId && !(targetWorkerId in this.workers$.value)) {
                throw Error('Provided workerId not known')
            }
            if (targetWorkerId && targetWorkerId in this.workers$.value) {
                ctx.info('Target worker already created, enqueue task')
                p.schedule()
                this.tasksQueue.push({
                    entryPoint,
                    args,
                    taskId,
                    title,
                    channel$: taskChannel$,
                    targetWorkerId,
                })

                if (!this.busyWorkers$.value.includes(targetWorkerId)) {
                    ctx.info('Target worker IDLE, pick task')
                    this.pickTask(targetWorkerId, ctx)
                }

                return taskChannel$
            }
            const worker$ = this.getIdleWorkerOrCreate$(ctx)
            if (!worker$) {
                ctx.info('No worker available & max worker count reached')
                p.schedule()
                this.tasksQueue.push({
                    entryPoint,
                    args,
                    taskId,
                    title,
                    channel$: taskChannel$,
                })
                return taskChannel$
            }
            worker$
                .pipe(
                    map(({ workerId }) => {
                        ctx.info(`Got a worker ready ${workerId}`)
                        p.schedule()
                        this.tasksQueue.push({
                            entryPoint,
                            args,
                            taskId,
                            title,
                            channel$: taskChannel$,
                        })
                        this.pickTask(workerId, ctx)
                        return workerId
                    }),
                )
                .subscribe()

            return taskChannel$
        })
    }

    /**
     * Send a message from main thread to the worker processing a target task.
     * The function running in the worker has to instrument the received `context`
     * argument in order to process the messages.
     * E.g.
     * ```
     * async function functionInWorker({
     *     args,
     *     workerScope,
     *     workerId,
     *     taskId,
     *     context,
     * }){
     *     context.onData = (args) => {
     *         console.log('Received data from main thread', args)
     *     }
     * }
     * ```
     * @param _p
     * @param _p.taskId Target taskId.
     * @param _p.data Data to send, should be valid regarding the
     * [structured clone algo](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).
     */
    sendData({ taskId, data }: { taskId: string; data: unknown }) {
        const runningTask = this.runningTasks$.value.find(
            (t) => t.taskId === taskId,
        )
        if (!runningTask) {
            console.error(`WorkersPool.sendMessage: no task #${taskId} running`)
            return
        }
        const worker = this.workers$.value[runningTask.workerId].worker
        worker.send({ taskId, data })
    }

    /**
     * @returns The Web Workers proxy ({@link WebWorkersBrowser} in real usage).
     */
    getWebWorkersProxy(): IWWorkerProxy {
        return WorkersPool.webWorkersProxy
    }

    private getTaskChannel$(
        exposedProcess: Process,
        taskId: string,
        context: ContextTrait = new NoContext(),
    ): Observable<Message> {
        return context.withChild('getTaskChannel$', (ctx) => {
            const channel$ = this.mergedChannel$.pipe(
                filter((message) => message.data.taskId === taskId),
                takeWhile((message) => message.type !== 'Exit', true),
            )

            channel$
                .pipe(
                    filter((message) => message.type === 'Start'),
                    take(1),
                )
                .subscribe((message) => {
                    ctx.info(`worker started on task ${taskId}`, message)
                    exposedProcess.start()
                })

            channel$
                .pipe(
                    filter((message) => message.type === 'Exit'),
                    take(1),
                )
                .subscribe((message) => {
                    const data = message.data as unknown as MessageExit
                    if (data.error) {
                        ctx.info(
                            `worker exited abnormally on task ${taskId}`,
                            message,
                        )
                        exposedProcess.fail(data.result)
                        return
                    }
                    exposedProcess.succeed()
                    ctx.info(
                        `worker exited normally on task ${taskId}`,
                        message,
                    )
                })
            channel$
                .pipe(filter((message) => message.type === 'Log'))
                .subscribe((message) => {
                    const data = message.data as unknown as MessageLog
                    exposedProcess.log(data.text)
                    ctx.info(data.text, data.json)
                })

            return channel$
        })
    }

    private getIdleWorkerOrCreate$(context: ContextTrait = new NoContext()):
        | Observable<{
              workerId: string
              worker: WWorkerTrait
              channel$: Observable<Message>
          }>
        | undefined {
        return context.withChild('getIdleWorkerOrCreate$', (ctx) => {
            const idleWorkerId = Object.keys(this.workers$.value).find(
                (workerId) => !this.busyWorkers$.value.includes(workerId),
            )

            if (idleWorkerId) {
                ctx.info(`return idle worker ${idleWorkerId}`)
                return of({
                    workerId: idleWorkerId,
                    worker: this.workers$.value[idleWorkerId].worker,
                    channel$: this.workers$.value[idleWorkerId].channel$,
                })
            }
            if (this.requestedWorkersCount < (this.pool.stretchTo ?? 1)) {
                return this.createWorker$(ctx)
            }
            return undefined
        }) as
            | Observable<{
                  workerId: string
                  worker: WWorkerTrait
                  channel$: Observable<Message>
              }>
            | undefined
    }

    private createWorker$(context: ContextTrait = new NoContext()): Observable<{
        workerId: string
        worker: WWorkerTrait
        channel$: Observable<Message>
    }> {
        return context.withChild('createWorker$', (ctx) => {
            this.requestedWorkersCount++
            const workerChannel$ = new Subject<Message>()

            const workerProxy = WorkersPool.webWorkersProxy.createWorker({
                onMessageWorker: entryPointWorker,
                onMessageMain: ({ data }: { data: Message }) => {
                    workerChannel$.next(data)
                    this.mergedChannel$.next(data)
                },
            })
            const workerId = workerProxy.uid
            ctx.info(`New raw worker ${workerId} created`)
            this.startedWorkers$.next([...this.startedWorkers$.value, workerId])
            const taskId = `t${String(Math.floor(Math.random() * Math.pow(10, 6)))}`
            const title = 'Install environment'
            const p = new Process({
                taskId,
                title,
                context: ctx,
            })
            const taskChannel$ = this.getTaskChannel$(p, taskId, context)
            const cdnPackage = '@w3nest/webpm-client'
            const cdnUrl = `${
                WorkersPool.BackendConfiguration.urlResource
            }/${getAssetId(cdnPackage)}/${setup.version}/dist/${cdnPackage}.js`

            const proxy = WorkersPool.webWorkersProxy
            const staticOnBefore = proxy.onBeforeWorkerInstall
            const staticOnAfter = proxy.onAfterWorkerInstall
            const argsInstall: MessageInstall = {
                backendsPartitionId: WorkersPool.backendsPartitionId,
                backendConfiguration: WorkersPool.BackendConfiguration,
                frontendConfiguration: WorkersPool.FrontendConfiguration,
                cdnUrl: cdnUrl,
                variables: this.environment.variables,
                functions: this.environment.functions.map(
                    ({
                        id,
                        target,
                    }: {
                        id: string
                        target: (...unknown: unknown[]) => unknown
                    }) => ({
                        id,
                        target: proxy.serializeFunction(target),
                    }),
                ),
                cdnInstallation: this.environment.cdnInstallation,
                postInstallTasks: (this.environment.postInstallTasks ?? []).map(
                    (task) => {
                        return {
                            title: task.title,
                            args: task.args,
                            entryPoint: proxy.serializeFunction(
                                task.entryPoint,
                            ),
                        }
                    },
                ),
                onBeforeInstall:
                    staticOnBefore && proxy.serializeFunction(staticOnBefore),
                onAfterInstall:
                    staticOnAfter && proxy.serializeFunction(staticOnAfter),
            }

            p.schedule()
            workerProxy.execute({
                taskId,
                entryPoint: entryPointInstall,
                args: argsInstall,
            })

            return workerChannel$.pipe(
                tap((message: Message) => {
                    const cdnEvent = isCdnEventMessage(message)
                    if (cdnEvent) {
                        this.cdnEvent$.next(cdnEvent)
                    }
                }),
                filter((message) => message.type === 'Exit'),
                take(1),
                tap(() => {
                    ctx.info(`New worker ready (${workerId}), pick task if any`)
                    this.workers$.next({
                        ...this.workers$.value,
                        [workerId]: {
                            worker: workerProxy,
                            channel$: workerChannel$,
                        },
                    })
                }),
                map(() => ({
                    workerId,
                    worker: workerProxy,
                    channel$: taskChannel$,
                })),
            )
        })
    }

    /**
     * Start a worker with first task in its queue
     */
    private pickTask(
        workerId: string,
        context: ContextTrait = new NoContext(),
    ) {
        context.withChild('pickTask', (ctx) => {
            if (this.tasksQueue.length === 0) {
                ctx.info(`No tasks in queue`)
                return
            }
            if (
                this.tasksQueue.filter(
                    (task) =>
                        task.targetWorkerId === undefined ||
                        task.targetWorkerId === workerId,
                ).length === 0
            ) {
                ctx.info(
                    `No tasks in queue match fo target worker (${workerId})`,
                )
                return
            }

            if (this.busyWorkers$.value.includes(workerId)) {
                throw Error(
                    `Can not pick task by ${workerId}: worker already busy. Please report a bug for @youwol/webpm-client.`,
                )
            }
            this.busyWorkers$.next([...this.busyWorkers$.value, workerId])
            const task = this.tasksQueue.find((t) =>
                t.targetWorkerId ? t.targetWorkerId === workerId : true,
            )
            if (!task) {
                ctx.info(
                    `No tasks in queue match fo target worker (${workerId})`,
                )
                return
            }
            const { taskId, title, entryPoint, args, channel$ } = task
            ctx.info(`Pick task ${taskId} by ${workerId}`)
            this.tasksQueue = this.tasksQueue.filter((t) => t.taskId !== taskId)

            this.runningTasks$.next([
                ...this.runningTasks$.value,
                { workerId, taskId, title },
            ])
            const worker = this.workers$.value[workerId].worker

            channel$
                .pipe(
                    filter((message) => {
                        return message.type === 'Exit'
                    }),
                )
                .subscribe((message) => {
                    const exitData = message.data as unknown as MessageExit
                    this.workerReleased$.next({
                        taskId: exitData.taskId,
                        workerId,
                    })
                })
            worker.execute({ taskId, entryPoint, args })
        })
    }

    /**
     * Terminate all the workers.
     */
    terminate() {
        Object.values(this.workers$.value).forEach(({ worker }) => {
            worker.terminate()
        })
    }
}
