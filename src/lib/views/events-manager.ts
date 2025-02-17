import {
    CdnEvent,
    EsmEventType,
    PyEventType,
    AllEvents,
    ConsoleEvent,
    BackendEventType,
    CssEventType,
    LoadingGraphEventType,
} from '..'

import {
    isLoadingGraphEvent,
    isEsmEvent,
    isCssEvent,
    isPyEvent,
    isBackendEvent,
} from '../events.models'
import { filter, map, Observable, ReplaySubject, scan, take } from 'rxjs'

/**
 * Events related to pyodide module installation.
 */
export const pyModuleEvents = [
    'InstallPyModuleEvent',
    'PyModuleLoadedEvent',
    'PyModuleErrorEvent',
] as const

/**
 * {@link pyModuleEvents} as type literal union.
 */
export type PyModuleEventType = (typeof pyModuleEvents)[number]
/**
 * {@link pyModuleEvents} as type union of {@link AllEvents}.
 */
export type PyModuleEvent = AllEvents[PyModuleEventType]

/**
 * Type guard for {@link PyModuleEvent}.
 */
function isPyModuleEvent(event: CdnEvent): event is PyModuleEvent {
    return pyModuleEvents.includes(event.step as PyModuleEventType)
}
/**
 * Events related to pyodide runtime installation.
 */
export const pyPyRuntimeEvents = [
    'FetchPyRuntimeEvent',
    'FetchedPyRuntimeEvent',
    'StartPyRuntimeEvent',
    'PyRuntimeReadyEvent',
] as const

/**
 * {@link pyModuleEvents} as type literal union.
 */
export type PyRuntimeEventType = (typeof pyPyRuntimeEvents)[number]

/**
 * {@link pyPyRuntimeEvents} as type union of {@link AllEvents}.
 */
export type PyRuntimeEvent = AllEvents[PyRuntimeEventType]

/**
 * Type guard for {@link PyRuntimeEvent}.
 */
export function isPyRuntimeEvent(event: CdnEvent): event is PyRuntimeEvent {
    return pyPyRuntimeEvents.includes(event.step as PyRuntimeEventType)
}

/**
 * Type guard for {@link ConsoleEvent}.
 */
export function isConsoleEvent(event: CdnEvent): event is ConsoleEvent {
    return event.step === 'ConsoleEvent'
}

/**
 * Events related to installation done.
 */
export const doneEvents = ['InstallDoneEvent', 'InstallErrorEvent'] as const
/**
 * {@link doneEvents} as type literal union.
 */
export type DoneEventType = (typeof doneEvents)[number]
/**
 * {@link doneEvents} as type union of {@link AllEvents}.
 */
export type DoneEvents = AllEvents[DoneEventType]

/**
 * Type guard for {@link DoneEvents}.
 */
export function isInstallDoneEvent(event: CdnEvent): event is DoneEvents {
    return doneEvents.includes(event.step as DoneEventType)
}

/**
 * Installation related events manager.
 */
export class EventsManager {
    public readonly event$ = new ReplaySubject<CdnEvent>()

    public readonly consoleEvent$: Observable<AllEvents['ConsoleEvent']>
    public readonly loadingGraphEvent$: Observable<
        AllEvents[LoadingGraphEventType]
    >
    public readonly esmEvent$: Observable<AllEvents[EsmEventType]>
    public readonly esmStore$: Observable<
        { name: string; version: string; url: string }[]
    >

    public readonly backendEvent$: Observable<AllEvents[BackendEventType]>
    public readonly backendsStore$: Observable<
        { name: string; version: string }[]
    >

    public readonly pyEvent$: Observable<AllEvents[PyEventType]>
    public readonly pyRuntimeEvent$: Observable<AllEvents[PyRuntimeEventType]>
    public readonly pyModuleEvent$: Observable<AllEvents[PyModuleEventType]>
    public readonly pyModulesStore$: Observable<string[]>

    public readonly cssEvent$: Observable<AllEvents[CssEventType]>
    public readonly cssStyleSheetStore$: Observable<
        { name: string; version: string; url: string }[]
    >
    public readonly installDoneEvent$: Observable<AllEvents[DoneEventType]>

    constructor() {
        const scanCbNameVersion = <T extends { name: string; version: string }>(
            acc: T[],
            e: T,
        ) => {
            return acc.some(
                (prev) => prev.name === e.name && prev.version === e.version,
            )
                ? acc
                : [...acc, e]
        }
        const scanCbUrl = <T extends { url: string }>(acc: T[], e: T) => {
            return acc.some((prev) => prev.url === e.url) ? acc : [...acc, e]
        }

        this.consoleEvent$ = this.event$.pipe(filter(isConsoleEvent))
        this.loadingGraphEvent$ = this.event$.pipe(filter(isLoadingGraphEvent))
        this.esmEvent$ = this.event$.pipe(filter(isEsmEvent))
        this.esmStore$ = this.esmEvent$.pipe(
            map((ev) => ({
                name: ev.targetName,
                url: ev.url,
                version: ev.version,
            })),
            scan(
                scanCbUrl,
                [] as { name: string; version: string; url: string }[],
            ),
        )

        this.backendEvent$ = this.event$.pipe(filter(isBackendEvent))
        this.backendsStore$ = this.backendEvent$.pipe(
            map((ev) => ({ name: ev.name, version: ev.version })),
            scan(scanCbNameVersion, [] as { name: string; version: string }[]),
        )

        this.pyEvent$ = this.event$.pipe(filter(isPyEvent))
        this.pyRuntimeEvent$ = this.event$.pipe(filter(isPyRuntimeEvent))
        this.pyModuleEvent$ = this.event$.pipe(filter(isPyModuleEvent))
        this.pyModulesStore$ = this.pyModuleEvent$.pipe(
            map((ev) => ev.name),
            scan(
                (acc, e) => (acc.includes(e) ? acc : [...acc, e]),
                [] as string[],
            ),
        )

        this.cssEvent$ = this.event$.pipe(filter(isCssEvent))
        this.cssStyleSheetStore$ = this.cssEvent$.pipe(
            map((ev) => ({
                name: ev.targetName,
                version: ev.version,
                url: ev.url,
            })),
            scan(
                scanCbUrl,
                [] as { name: string; version: string; url: string }[],
            ),
        )
        this.installDoneEvent$ = this.event$.pipe(
            filter(isInstallDoneEvent),
            take(1),
        )
    }
}
