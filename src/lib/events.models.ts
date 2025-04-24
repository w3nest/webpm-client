import { LoadingGraphError } from './errors.models'
import {
    BackendInputs,
    EsmInputs,
    CssInput,
    LoadingGraph,
    PyodideInputs,
} from './inputs.models'

/**
 * Available topics when installing components.
 */
export type Topic =
    | 'LoadingGraph'
    | 'ESM'
    | 'Python'
    | 'Backend'
    | 'CSS'
    | 'Worker'

/**
 * Type map for all events.
 */
export interface AllEvents {
    CdnMessageEvent: CdnMessageEvent
    CdnLoadingGraphQueryEvent: CdnLoadingGraphQueryEvent
    CdnLoadingGraphResolvedEvent: CdnLoadingGraphResolvedEvent
    CdnLoadingGraphErrorEvent: CdnLoadingGraphErrorEvent
    InstallDoneEvent: InstallDoneEvent
    InstallErrorEvent: InstallErrorEvent
    StartEvent: StartEvent
    SourceLoadingEvent: SourceLoadingEvent
    SourceLoadedEvent: SourceLoadedEvent
    SourceParsedEvent: SourceParsedEvent
    CssLoadingEvent: CssLoadingEvent
    CssParsedEvent: CssParsedEvent
    UnauthorizedEvent: UnauthorizedEvent
    UrlNotFoundEvent: UrlNotFoundEvent
    ParseErrorEvent: ParseErrorEvent
    FetchPyRuntimeEvent: FetchPyRuntimeEvent
    FetchedPyRuntimeEvent: FetchedPyRuntimeEvent
    StartPyRuntimeEvent: StartPyRuntimeEvent
    PyRuntimeReadyEvent: PyRuntimeReadyEvent
    StartPyEnvironmentInstallEvent: StartPyEnvironmentInstallEvent
    InstallPyModuleEvent: InstallPyModuleEvent
    PyModuleLoadedEvent: PyModuleLoadedEvent
    PyModuleErrorEvent: PyModuleErrorEvent
    PyEnvironmentReadyEvent: PyEnvironmentReadyEvent
    PyEnvironmentErrorEvent: PyEnvironmentErrorEvent
    ConsoleEvent: ConsoleEvent
    DownloadBackendEvent: DownloadBackendEvent
    InstallBackendEvent: InstallBackendEvent
    StartBackendEvent: StartBackendEvent
    BackendErrorEvent: BackendErrorEvent
}
/**
 * Events related to loading graph resolution.
 */
export const loadingGraphEventTypes = [
    'CdnLoadingGraphQueryEvent',
    'CdnLoadingGraphResolvedEvent',
    'CdnLoadingGraphErrorEvent',
] as const

/**
 * {@link loadingGraphEventTypes} as type literal union.
 */
export type LoadingGraphEventType = (typeof loadingGraphEventTypes)[number]
/**
 * Type guard for {@link LoadingGraphEventType}.
 */
export function isLoadingGraphEvent(
    event: CdnEvent,
): event is AllEvents[LoadingGraphEventType] {
    return loadingGraphEventTypes.includes(event.step as LoadingGraphEventType)
}
/**
 * Events related to CSS installation.
 */
export const esmEventTypes = [
    'StartEvent',
    'SourceLoadingEvent',
    'SourceLoadedEvent',
    'SourceParsedEvent',
    'UnauthorizedEvent',
    'UrlNotFoundEvent',
    'ParseErrorEvent',
] as const
/**
 * {@link esmEventTypes} as type literal union.
 */
export type EsmEventType = (typeof esmEventTypes)[number]
/**
 * Type guard for {@link EsmEventType}.
 */
export function isEsmEvent(event: CdnEvent): event is AllEvents[EsmEventType] {
    if (['UnauthorizedEvent', 'UrlNotFoundEvent'].includes(event.step)) {
        return (event as UnauthorizedEvent | UrlNotFoundEvent).url.endsWith(
            '.js',
        )
    }
    return esmEventTypes.includes(event.step as EsmEventType)
}
/**
 * Events related to CSS installation.
 */
export const cssEventTypes = [
    'CssLoadingEvent',
    'CssParsedEvent',
    'UnauthorizedEvent',
    'UrlNotFoundEvent',
] as const
/**
 * {@link cssEventTypes} as type literal union.
 */
export type CssEventType = (typeof cssEventTypes)[number]
/**
 * Type guard for {@link CssEventType}.
 */
export function isCssEvent(event: CdnEvent): event is AllEvents[CssEventType] {
    if (['UnauthorizedEvent', 'UrlNotFoundEvent'].includes(event.step)) {
        return (event as UnauthorizedEvent | UrlNotFoundEvent).url.endsWith(
            '.css',
        )
    }
    return cssEventTypes.includes(event.step as CssEventType)
}
/**
 * Events related to pyodide installation.
 */
export const pyEventTypes = [
    'FetchPyRuntimeEvent',
    'FetchedPyRuntimeEvent',
    'StartPyRuntimeEvent',
    'PyRuntimeReadyEvent',
    'StartPyEnvironmentInstallEvent',
    'InstallPyModuleEvent',
    'PyModuleLoadedEvent',
    'PyModuleErrorEvent',
    'PyEnvironmentReadyEvent',
    'PyEnvironmentErrorEvent',
] as const

/**
 * {@link pyEventTypes} as type literal union.
 */
export type PyEventType = (typeof pyEventTypes)[number]

/**
 * Type guard for {@link PyEventType}.
 */
export function isPyEvent(event: CdnEvent): event is AllEvents[PyEventType] {
    return pyEventTypes.includes(event.step as PyEventType)
}

/**
 * Events related to backend installation.
 */
export const backendEventTypes = [
    'DownloadBackendEvent',
    'InstallBackendEvent',
    'StartBackendEvent',
    'BackendErrorEvent',
] as const

/**
 * {@link backendEventTypes} as type literal union.
 */
export type BackendEventType = (typeof backendEventTypes)[number]

/**
 * Type guard for {@link BackendEventType}.
 */
export function isBackendEvent(
    event: CdnEvent,
): event is AllEvents[BackendEventType] {
    return backendEventTypes.includes(event.step as BackendEventType)
}

/**
 * All events.
 */
export const eventTypes = [
    'CdnMessageEvent',
    'StartInstallEvent',
    'InstallDoneEvent',
    'InstallErrorEvent',
    'ConsoleEvent',
    ...loadingGraphEventTypes,
    ...cssEventTypes,
    ...esmEventTypes,
    ...pyEventTypes,
    ...backendEventTypes,
] as const

/**
 * {@link eventTypes} as type literal union.
 */
export type EventType = (typeof eventTypes)[number]

/**
 * Error events.
 */
export const errorEventTypes = [
    'UnauthorizedEvent',
    'UrlNotFoundEvent',
    'ParseErrorEvent',
    'PyModuleErrorEvent',
    'BackendErrorEvent',
    'InstallErrorEvent',
    'CdnLoadingGraphErrorEvent',
] as const

/**
 * {@link errorEventTypes} as type literal union.
 */
export type ErrorEventType = (typeof errorEventTypes)[number]

/**
 * Type guard for {@link ErrorEventType}.
 */
export function isErrorEvent(
    event: CdnEvent,
): event is AllEvents[ErrorEventType] {
    return errorEventTypes.includes(event.step as ErrorEventType)
}

/**
 * Type literal for event's status.
 */
export type EventStatus = 'Pending' | 'Succeeded' | 'Failed' | 'None'

/**
 * Base structure for all events.
 */
export interface CdnEvent {
    /**
     * The step.
     */
    step: EventType
    /**
     * Event's ID.
     */
    id: string
    /**
     * Custom text.
     */
    text: string
    /**
     * Event's status.
     */
    status: EventStatus
}

/**
 * Type guard for {@link CdnEvent}.
 */
export function isCdnEvent(event: unknown): event is CdnEvent {
    return eventTypes.includes((event as CdnEvent).step)
}

/**
 * Generic custom CDN event.
 */
export class CdnMessageEvent implements CdnEvent {
    public readonly step = 'CdnMessageEvent'
    public readonly id: string
    public readonly text: string
    public readonly status: EventStatus = 'None'
    constructor(id: string, text: string, status: EventStatus = 'None') {
        this.id = id
        this.status = status
        this.text = text
    }
}

/**
 * Base class for CDN's HTTP request event.
 */
export type CdnFetchEvent = CdnEvent & {
    id: string
    assetId: string
    targetName: string
    url: string
    version: string
}

/**
 * Event emitted when starting to install.
 */
export class StartInstallEvent implements CdnEvent {
    public readonly step = 'StartInstallEvent'
    public readonly id = 'StartInstallEvent'
    public readonly text = 'Start install'
    public readonly status = 'None'
    constructor(
        public readonly esm: EsmInputs,
        public readonly pyodide: PyodideInputs,
        public readonly backends: BackendInputs,
        public readonly css: CssInput[],
    ) {}
}
/**
 * Event emitted when starting to fetch a script.
 */
export class StartEvent implements CdnFetchEvent {
    public readonly step = 'StartEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
    ) {
        this.id = targetName
        this.text = `${targetName}: start importing`
    }
}

/**
 * Event emitted when a script's content is transferring over HTTP network.
 */
export class SourceLoadingEvent implements CdnFetchEvent {
    public readonly step = 'SourceLoadingEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
        public readonly progress: ProgressEvent<XMLHttpRequestEventTarget>,
    ) {
        this.id = targetName
        this.text = `${targetName}: fetching over HTTP`
    }
}

/**
 * Event emitted when a script's content transfer over HTTP network has completed.
 */
export class SourceLoadedEvent implements CdnFetchEvent {
    public readonly step = 'SourceLoadedEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
        public readonly progress?: ProgressEvent<XMLHttpRequestEventTarget>,
    ) {
        this.id = targetName
        this.text = `${targetName}: source fetched`
    }
}

/**
 * Event emitted when a script's content has been parsed (installed).
 */
export class SourceParsedEvent implements CdnFetchEvent {
    public readonly step = 'SourceParsedEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Succeeded'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
    ) {
        this.id = targetName
        this.text = `${targetName}: module/script imported`
    }
}

/**
 * Event emitted when starting to install a style sheet.
 */
export class CssLoadingEvent implements CdnFetchEvent {
    public readonly step = 'CssLoadingEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
    ) {
        this.id = targetName
        this.text = `${targetName}: fetching over HTTP`
    }
}

/**
 * Event emitted when a style sheet has been added to the document.
 */
export class CssParsedEvent implements CdnFetchEvent {
    public readonly step = 'CssParsedEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Succeeded'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
    ) {
        this.id = targetName
        this.text = `${targetName}: module/script imported`
    }
}

/**
 * Event emitted when an {@link Unauthorized} error occurred.
 */
export class UnauthorizedEvent implements CdnFetchEvent {
    public readonly step = 'UnauthorizedEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Failed'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
    ) {
        this.id = targetName
        this.text = `${targetName}: unauthorized to access the resource`
    }
}

/**
 * Event emitted when an {@link UrlNotFound} error occurred.
 */
export class UrlNotFoundEvent implements CdnFetchEvent {
    public readonly step = 'UrlNotFoundEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Failed'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
    ) {
        this.id = targetName
        this.text = `${targetName}: resource not found at ${url}`
    }
}

/**
 * Event emitted when an {@link SourceParsingFailed} error occurred.
 */
export class ParseErrorEvent implements CdnFetchEvent {
    public readonly step = 'ParseErrorEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Failed'
    constructor(
        public readonly targetName: string,
        public readonly assetId: string,
        public readonly url: string,
        public readonly version: string,
    ) {
        this.id = targetName
        this.text = `${targetName}: parsing the module/script failed`
    }
}

/**
 * Event emitted when querying the loading graph occurred.
 */
export class CdnLoadingGraphQueryEvent implements CdnEvent {
    public readonly id = 'loading-graph-query'
    public readonly step = 'CdnLoadingGraphQueryEvent'
    public readonly text = 'Retrieve the loading graph'
    public readonly status = 'Pending'
}

/**
 * Event emitted when querying the loading graph occurred.
 */
export class CdnLoadingGraphResolvedEvent implements CdnEvent {
    public readonly id = 'loading-graph-resolved'
    public readonly step = 'CdnLoadingGraphResolvedEvent'
    public readonly text = 'Loading graph resolved'
    public readonly status = 'Pending'
    public readonly response: LoadingGraph

    constructor(public readonly resp: LoadingGraph) {
        this.response = resp
    }
}

/**
 * Event emitted when an {@link LoadingGraphError} error occurred.
 */
export class CdnLoadingGraphErrorEvent implements CdnEvent {
    public readonly id = 'loading-graph'
    public readonly step = 'CdnLoadingGraphErrorEvent'
    public readonly text = 'Failed to retrieve the loading graph'
    public readonly status = 'Failed'
    constructor(public readonly error: LoadingGraphError) {}
}

/**
 * Event emitted when an installation is done ({@link install}).
 */
export class InstallDoneEvent implements CdnEvent {
    public readonly id = 'InstallDoneEvent'
    public readonly step = 'InstallDoneEvent'
    public readonly text = 'Installation successful'
    public readonly status = 'Succeeded'
}

/**
 * Event emitted when an installation failed ({@link install}).
 */
export class InstallErrorEvent implements CdnEvent {
    public readonly id = 'InstallErrorEvent'
    public readonly step = 'InstallErrorEvent'
    public readonly text = 'Installation error'
    public readonly status = 'Failed'
}

/**
 * Base class for events related to backend.
 */
export class BackendEvent implements CdnEvent {
    public readonly id: string
    public readonly text: string
    public readonly status: 'Pending' | 'Failed'
    public readonly step:
        | 'DownloadBackendEvent'
        | 'InstallBackendEvent'
        | 'StartBackendEvent'
        | 'BackendErrorEvent'
    public readonly name: string
    public readonly version: string
    public readonly title: string
    public readonly event: string

    constructor(
        step:
            | 'DownloadBackendEvent'
            | 'InstallBackendEvent'
            | 'StartBackendEvent'
            | 'BackendErrorEvent',
        name: string,
        version: string,
        title: string,
        event: string,
    ) {
        this.id = `${name}_${version.replace('.', '-')}`
        this.text = `${name}#${version}: ${title}`
        this.status = event === 'failed' ? 'Failed' : 'Pending'
        Object.assign(this, { step, name, version, title, event })
    }
}

/**
 * Events emitted when a backend is downloaded.
 */
export class DownloadBackendEvent extends BackendEvent {
    public readonly event: 'started' | 'succeeded' | 'failed'

    constructor(params: {
        name: string
        version: string
        event: 'started' | 'succeeded' | 'failed'
    }) {
        super(
            'DownloadBackendEvent',
            params.name,
            params.version,
            'downloading...',
            params.event,
        )
    }
}
/**
 * Events emitted when a backend is installed.
 */
export class InstallBackendEvent extends BackendEvent {
    public readonly event: 'started' | 'succeeded' | 'failed'
    constructor(params: {
        name: string
        version: string
        event: 'started' | 'succeeded' | 'failed'
    }) {
        super(
            'InstallBackendEvent',
            params.name,
            params.version,
            'installing...',
            params.event,
        )
    }
}
/**
 * Events emitted when a backend is started.
 */
export class StartBackendEvent extends BackendEvent {
    public readonly event: 'starting' | 'listening' | 'failed'
    constructor(params: {
        name: string
        version: string
        event: 'starting' | 'listening' | 'failed'
    }) {
        super(
            'StartBackendEvent',
            params.name,
            params.version,
            'starting...',
            params.event,
        )
    }
}
/**
 * Events emitted when a backend error has been caught.
 */
export class BackendErrorEvent extends BackendEvent {
    public readonly detail: string
    constructor(params: {
        name: string
        version: string
        detail: string
        event: string
    }) {
        super(
            'BackendErrorEvent',
            params.name,
            params.version,
            params.detail,
            params.event,
        )
        this.detail = params.detail
    }
}

/**
 * Base class for Pyodide related event.
 */
export type CdnPyEvent = CdnEvent
/**
 * Event emitted when starting to fetch Pyodide runtime.
 */
export class FetchPyRuntimeEvent implements CdnPyEvent {
    public readonly step = 'FetchPyRuntimeEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor(
        public readonly pyodideVersion: string,
        public readonly url: string,
    ) {
        this.id = `fetch-pyodide-${pyodideVersion}`
        this.text = `Fetch pyodide runtime`
    }
}
/**
 * Event emitted when Pyodide runtime's installation failed.
 */
export class FetchedPyRuntimeEvent implements CdnPyEvent {
    public readonly step = 'FetchedPyRuntimeEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Succeeded'
    constructor(
        public readonly pyodideVersion: string,
        public readonly url: string,
    ) {
        this.id = `fetch-pyodide-${pyodideVersion}`
        this.text = `Fetch pyodide runtime`
    }
}
/**
 * Event emitted when starting to install Pyodide runtime.
 */
export class StartPyRuntimeEvent implements CdnPyEvent {
    public readonly step = 'StartPyRuntimeEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor(public readonly pyodideVersion: string) {
        this.id = `start-pyodide-${pyodideVersion}`
        this.text = `Start pyodide runtime`
    }
}

/**
 * Event emitted when the Pyodide runtime is ready.
 */
export class PyRuntimeReadyEvent implements CdnPyEvent {
    public readonly step = 'PyRuntimeReadyEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Succeeded'
    constructor(public readonly pyodideVersion: string) {
        this.id = `ready-pyodide-${pyodideVersion}`
        this.text = `Pyodide runtime ready`
    }
}

/**
 * Event emitted when starting to install Pyodide environment.
 */
export class StartPyEnvironmentInstallEvent implements CdnPyEvent {
    public readonly step = 'StartPyEnvironmentInstallEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor() {
        this.id = `install-pyodide-dependencies`
        this.text = `Install dependencies`
    }
}

/**
 * Event emitted when starting to install a module.
 */
export class InstallPyModuleEvent implements CdnPyEvent {
    public readonly step = 'InstallPyModuleEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor(public readonly name: string) {
        this.id = `install-pyodide-module-${name}`
        this.text = `Installing ${this.name}`
    }
}

/**
 * Event emitted when a Pyodide module has been loaded.
 */
export class PyModuleLoadedEvent implements CdnPyEvent {
    public readonly step = 'PyModuleLoadedEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor(public readonly name: string) {
        this.id = `install-pyodide-module-${name}`
        this.text = `Installing ${this.name}`
    }
}

/**
 * Event emitted when loading a Pyodide module failed.
 */
export class PyModuleErrorEvent implements CdnPyEvent {
    public readonly step = 'PyModuleErrorEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Failed'
    constructor(public readonly name: string) {
        this.id = `error-pyodide-module-${name}`
        this.text = `Error loading ${this.name}`
    }
}

/**
 * Event emitted when the Pyodide environment is ready.
 */
export class PyEnvironmentReadyEvent implements CdnPyEvent {
    public readonly step = 'PyEnvironmentReadyEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Pending'
    constructor() {
        this.id = `pyodide-environment-ready`
        this.text = `Environment installed`
    }
}

/**
 * Event emitted when installation of Pyodide environment failed.
 */
export class PyEnvironmentErrorEvent implements CdnPyEvent {
    public readonly step = 'PyEnvironmentErrorEvent'
    public readonly id: string
    public readonly text: string
    public readonly status = 'Failed'
    constructor(public readonly detail: string) {
        this.id = `pyodide-environment-error`
        this.text = detail
    }
}

/**
 * An event representing a log entry.
 */
export class ConsoleEvent implements CdnPyEvent {
    public readonly id: string
    public readonly step = 'ConsoleEvent'
    public readonly status = 'Pending'
    constructor(
        public readonly level: 'Info' | 'Warning' | 'Error',
        public readonly topic: Topic,
        public readonly text: string,
    ) {
        this.id = String(Math.floor(Math.random() * 1e6))
        if (level === 'Error') {
            console.error(text)
        }
    }
}
