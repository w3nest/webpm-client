/**
 * @category Events
 */
import { LoadingGraphError } from './errors.models'

export interface AllEvents {
    CdnMessageEvent: CdnMessageEvent
    CdnLoadingGraphErrorEvent: CdnLoadingGraphErrorEvent
    InstallDoneEvent: InstallDoneEvent
    InstallErrorEvent: InstallErrorEvent
    StartEvent: StartEvent
    SourceLoadingEvent: SourceLoadingEvent
    SourceLoadedEvent: SourceLoadedEvent
    SourceParsedEvent: SourceParsedEvent
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
const esmEventTypes = [
    'StartEvent',
    'SourceLoadingEvent',
    'SourceLoadedEvent',
    'SourceParsedEvent',
    'UnauthorizedEvent',
    'UrlNotFoundEvent',
    'ParseErrorEvent',
] as const

export type EsmEventType = (typeof esmEventTypes)[number]

export function isEsmEvent(event: CdnEvent): event is AllEvents[EsmEventType] {
    return esmEventTypes.includes(event.step as EsmEventType)
}

const pyEventTypes = [
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

export type PyEventType = (typeof pyEventTypes)[number]

export function isPyEvent(event: CdnEvent): event is AllEvents[PyEventType] {
    return pyEventTypes.includes(event.step as PyEventType)
}

const backendEventTypes = [
    'DownloadBackendEvent',
    'InstallBackendEvent',
    'StartBackendEvent',
    'BackendErrorEvent',
] as const
export type BackendEventType = (typeof backendEventTypes)[number]

export function isBackendEvent(
    event: CdnEvent,
): event is AllEvents[BackendEventType] {
    return backendEventTypes.includes(event.step as BackendEventType)
}

const eventTypes = [
    'CdnMessageEvent',
    'CdnLoadingGraphErrorEvent',
    'InstallDoneEvent',
    'InstallErrorEvent',
    'ConsoleEvent',
    ...esmEventTypes,
    ...pyEventTypes,
    ...backendEventTypes,
] as const

export type EventType = (typeof eventTypes)[number]

/**
 * @category Events
 */
export type EventStatus = 'Pending' | 'Succeeded' | 'Failed' | 'None'
/**
 * Base class of events.
 *
 * @category Events
 */
export interface CdnEvent {
    step: EventType
    id: string
    text: string
    status: EventStatus
}

/**
 * @category Events
 */
export function isCdnEvent(event: unknown): event is CdnEvent {
    return eventTypes.includes((event as CdnEvent).step)
}

/**
 * Generic custom CDN event.
 *
 * @category Events
 */
export class CdnMessageEvent implements CdnEvent {
    public readonly step = 'CdnMessageEvent'
    constructor(
        public readonly id: string,
        public readonly text: string,
        public readonly status: EventStatus = 'None',
    ) {}
}

/**
 * Base class for CDN's HTTP request event
 *
 * @category Events
 */
export type CdnFetchEvent = CdnEvent & {
    id: string
    assetId: string
    targetName: string
    url: string
    version: string
}

/**
 * Event emitted when starting to fetch a script.
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 * Event emitted when an {@link Unauthorized} error occurred.
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 * Event emitted when an {@link LoadingGraphError} error occurred.
 *
 * @category Events
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
 *
 * @category Events
 */
export class InstallDoneEvent implements CdnEvent {
    public readonly id = 'InstallDoneEvent'
    public readonly step = 'InstallDoneEvent'
    public readonly text = 'Installation successful'
    public readonly status = 'Succeeded'
}

/**
 * Event emitted when an installation failed ({@link install}).
 *
 * @category Events
 */
export class InstallErrorEvent implements CdnEvent {
    public readonly id = 'InstallErrorEvent'
    public readonly step = 'InstallErrorEvent'
    public readonly text = 'Installation error'
    public readonly status = 'Failed'
}

/**
 * Base class for events related to backend.
 *
 * @category Events
 */
export class BackendEvent implements CdnEvent {
    public readonly id: string
    public readonly text: string
    public readonly status: 'Pending' | 'Failed'
    constructor(
        public readonly step:
            | 'DownloadBackendEvent'
            | 'InstallBackendEvent'
            | 'StartBackendEvent'
            | 'BackendErrorEvent',
        public readonly name: string,
        public readonly version: string,
        public readonly title: string,
        public readonly event: string,
    ) {
        this.id = `${name}_${version.replace('.', '-')}`
        this.text = `${name}#${version}: ${title}`
        this.status = event === 'failed' ? 'Failed' : 'Pending'
    }
}

/**
 * Events emitted when a backend is downloaded.
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
 */
export type CdnPyEvent = CdnEvent
/**
 * Event emitted when starting to fetch Pyodide runtime.
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
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
 *
 * @category Events
 */
export class ConsoleEvent implements CdnPyEvent {
    public readonly id: string
    public readonly step = 'ConsoleEvent'
    public readonly status = 'Pending'
    constructor(
        public readonly level: 'Info' | 'Warning' | 'Error',
        public readonly component: 'ESM' | 'Backend' | 'Python',
        public readonly text: string,
    ) {
        this.id = String(Math.floor(Math.random() * 1e6))
    }
}
