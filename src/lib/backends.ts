import { BackendConfig, LoadingGraph } from './inputs.models'
import { BackendException, LocalYouwolRequired } from './errors.models'
import { StateImplementation } from './state'
import { Client, install } from './client'
import { setup } from '../auto-generated'
import {
    BackendErrorEvent,
    BackendEvent,
    CdnEvent,
    ConsoleEvent,
    DownloadBackendEvent,
    InstallBackendEvent,
    StartBackendEvent,
} from './events.models'
import type * as rxjsModuleType from 'rxjs'
import { getLocalCookie } from './backend-configuration'

import type * as HttpClients from '@w3nest/http-clients'

export interface BackendInstallResponse {
    clientBundle: string
    name: string
    version: string
    exportedClientSymbol: string
}

export interface BackendsGraphInstallResponse {
    backends: BackendInstallResponse[]
}

interface Install {
    http: { WebSocketClient: (d: unknown) => void }
}
export async function installBackendClientDeps(): Promise<{
    http: typeof HttpClients
}> {
    const { http } = (await install({
        modules: [
            `@w3nest/http-clients#${setup.runTimeDependencies.externals['@w3nest/http-clients']} as http`,
        ],
    })) as unknown as Install
    return { http } as unknown as { http: typeof HttpClients }
}

type ContextMessage<T> = HttpClients.ContextMessage<T>

export async function installBackends({
    graph,
    backendsConfig,
    backendsPartitionId,
    onEvent,
    webpmClient,
    executingWindow,
}: {
    graph: LoadingGraph
    backendsConfig: Record<string, BackendConfig>
    backendsPartitionId: string
    onEvent: (event: CdnEvent) => void
    webpmClient: Client
    executingWindow: WindowOrWorkerGlobalScope
}) {
    function log(text: string) {
        onEvent(new ConsoleEvent('Info', 'Backend', text))
    }

    const isEmpty =
        graph.definition.filter((layer) => layer.length > 0).length === 0
    if (isEmpty) {
        log('No backend to install')
        return
    }
    const ywLocalCookie = getLocalCookie()
    if (!ywLocalCookie || ywLocalCookie.type !== 'local') {
        log(
            'No cookie for local backend installation found, abort installation',
        )
        throw new LocalYouwolRequired(
            'Backends installation requires the local youwol server',
        )
    }
    const wsDataUrl = `ws://localhost:${String(ywLocalCookie.port)}/${ywLocalCookie.wsDataUrl}`
    const wsData$ = await StateImplementation.getWebSocket(wsDataUrl)

    const wsLogUrl = `ws://localhost:${String(ywLocalCookie.port)}/${ywLocalCookie.wsLogsUrl}`
    const wsLog$ = await StateImplementation.getWebSocket(wsLogUrl)
    const installId = `webpm-${String(Math.floor(Math.random() * Math.pow(10, 9)))}`
    const installKey = `${setup.name}-${setup.version}:${installId}`
    let error: BackendErrorEvent | undefined

    const { rxjs } = (await install({
        esm: [`rxjs#${setup.runTimeDependencies.externals.rxjs} as rxjs`],
    })) as unknown as { rxjs: typeof rxjsModuleType }

    interface Message {
        name: string
        version: string
        event: string
    }

    const allData$ = wsData$.pipe(
        rxjs.filter((m) => m.attributes?.[installKey] === installId),
        rxjs.map((m) => m as ContextMessage<Message>),
        rxjs.shareReplay({ bufferSize: 1, refCount: true }),
    )
    const allLogs$ = wsLog$.pipe(
        rxjs.filter((m) => m.attributes?.[installKey] === installId),
        rxjs.map((m) => m as ContextMessage<Message>),
        rxjs.shareReplay({ bufferSize: 1, refCount: true }),
    )
    type EventKind =
        | 'DownloadBackendEvent'
        | 'InstallBackendEvent'
        | 'StartBackendEvent'

    const factory: Record<
        EventKind,
        { constructor: new (m: Message) => BackendEvent; topic: string }
    > = {
        DownloadBackendEvent: {
            constructor: DownloadBackendEvent,
            topic: 'downloading',
        },
        InstallBackendEvent: {
            constructor: InstallBackendEvent,
            topic: 'installing',
        },
        StartBackendEvent: {
            constructor: StartBackendEvent,
            topic: 'starting',
        },
    }

    const isDone = (m: ContextMessage<Message>) =>
        (m.labels?.includes('StartBackendEvent') &&
            m.data?.event === 'listening') ??
        m.attributes?.event === 'failed'

    const filterEvent = (kind: EventKind) =>
        allData$.pipe(
            rxjs.filter((m) => m.labels?.includes(kind) ?? false),
            rxjs.tap((m) => {
                log(`${m.text} : ${m.data?.event ?? ''}`)
                if (m.data?.event === 'failed') {
                    const event = new BackendErrorEvent({
                        ...m.data,
                        detail: `error while ${factory[kind].topic}`,
                    })
                    error = event
                    onEvent(event)
                    return
                }
                if (m.data) {
                    onEvent(new factory[kind].constructor(m.data))
                }
            }),
        )

    const download$ = filterEvent('DownloadBackendEvent')
    const install$ = filterEvent('InstallBackendEvent')
    const start$ = filterEvent('StartBackendEvent')
    const shellLabels = [
        'Label.START_BACKEND_SH',
        'Label.INSTALL_BACKEND_SH',
    ] as const
    const logsInstall$ = allLogs$.pipe(
        rxjs.filter(
            (m) => shellLabels.find((l) => m.labels?.includes(l)) !== undefined,
        ),
        rxjs.tap((m) => {
            onEvent(new ConsoleEvent('Info', 'Backend', m.text))
        }),
    )
    rxjs.merge(download$, install$, start$, logsInstall$)
        .pipe(rxjs.takeWhile((m) => !isDone(m)))
        .subscribe()

    const body = {
        ...graph,
        backendsConfig,
        partitionId: backendsPartitionId,
    }
    await fetch(ywLocalCookie.webpm.pathBackendInstall, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-trace-attributes': `{"${installKey}": "${installId}"}`,
            'x-install-id': installId,
        },
        body: JSON.stringify(body),
    })
        .then((resp) => {
            return resp.json()
        })
        .then(async ({ backends }: BackendsGraphInstallResponse) => {
            if (error) {
                console.error(
                    'An error occurred while preparing the backends',
                    error,
                )
                throw new BackendException(error)
            }
            return Promise.all(
                backends.map((backend) => {
                    // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
                    return new Function(backend.clientBundle)()({
                        window: executingWindow,
                        webpmClient,
                        wsData$,
                    }) as BackendClient
                }),
            )
        })
        .then((backends) => {
            StateImplementation.registerEsmModules(backends, executingWindow)
        })
}

/**
 * Backend client.
 */
export interface BackendClient {
    /**
     * Backend's name.
     */
    name: string

    /**
     * Base URL of the service.
     */
    urlBase: string

    /**
     * Version of the service
     */
    version: string

    /**
     * Version's number.
     */
    versionNumber: number

    /**
     * API key.
     */
    apiKey: string

    /**
     * Relative path of the W3Lab page pointing to the backend.
     */
    urlW3Lab: string

    /**
     * Configuration.
     */
    config: {
        // Build configuration (command line options).
        build: Record<string, string>
    }

    /**
     * The export path pointing to the client.
     */
    exportPath: string[]

    /**
     * Encapsulating partition Id.
     */
    partitionId: string

    /**
     * Proxy the standard <a target='_blank' href="https://developer.mozilla.org/en-US/docs/Web/API/fetch"> fetch </a>
     * function.
     *
     * @param endPoint Target end-point.
     * @param fetchOptions <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/RequestInit">
     * Fetch options </a>.
     */
    fetch(endPoint: string, fetchOptions: RequestInit): Promise<Response>

    /**
     * Same as `fetch` with an additional call to `.then((resp) => resp.json())`.
     *
     * @param endPoint Target end-point.
     * @param fetchOptions <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/RequestInit">
     * Fetch options </a>.
     */
    fetchJson(endPoint: string, fetchOptions: RequestInit): Promise<JSON>

    /**
     * Same as `fetch` with an additional call to `.then((resp) => resp.text())`.
     *
     * @param endPoint Target end-point.
     * @param fetchOptions <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/RequestInit">
     * Fetch options </a>.
     */
    fetchText(endPoint: string, fetchOptions: RequestInit): Promise<string>

    /**
     * Same as `fetch` but returning an RxJS Observable.
     *
     * @param endPoint Target end-point.
     * @param fetchOptions <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/RequestInit">
     * Fetch options </a>.
     */
    fromFetch(
        endPoint: string,
        fetchOptions: RequestInit,
    ): rxjsModuleType.Observable<Response>

    /**
     * Same as `fetchJson` but returning an RxJS Observable.
     *
     * @param endPoint Target end-point.
     * @param fetchOptions <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/RequestInit">
     * Fetch options </a>.
     */
    fromFetchJson(
        endPoint: string,
        fetchOptions: RequestInit,
    ): rxjsModuleType.Observable<JSON>

    /**
     * Same as `fetchText` but returning an RxJS Observable.
     *
     * @param endPoint Target end-point.
     * @param fetchOptions <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/RequestInit">
     * Fetch options </a>.
     */
    fromFetchText(
        endPoint: string,
        fetchOptions: RequestInit,
    ): rxjsModuleType.Observable<string>
}
