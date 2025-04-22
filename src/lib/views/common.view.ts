import { attr$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Observable, Subject } from 'rxjs'
import pkgJson from '../../../package.json'
import type { Topic } from '..'
/**
 * Toggle button to display `items` or `logs` view within {@link InstallView}.
 */
export class ToggleViewMode implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'webpm-ToggleViewMode'
    public readonly tag = 'div'
    public readonly class = `${ToggleViewMode.CssSelector} d-flex align-items-center`
    public readonly children: ChildrenLike
    public readonly style = {
        fontWeight: 'bolder' as const,
    }
    constructor({ mode$ }: { mode$: Subject<'events' | 'logs'> }) {
        const btn = (target: 'events' | 'logs', icon: string) => {
            return {
                tag: 'button' as const,
                class: attr$({
                    source$: mode$,
                    vdomMap: (mode): string =>
                        mode === target ? 'btn-dark' : 'btn-light',
                    wrapper: (d) => `${d} btn btn-sm fas ${icon} mx-1`,
                }),
                onclick: () => {
                    mode$.next(target)
                },
            }
        }
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    btn('events', 'fa-list-ul'),
                    btn('logs', 'fa-newspaper'),
                ],
            },
        ]
    }
}

export type PhaseStatus =
    | 'started'
    | 'failed'
    | 'failed401'
    | 'failed404'
    | 'succeeded'
export interface Phase {
    source$: Observable<PhaseStatus>
    icon: string
}
const webpmPath = `/api/assets-gateway/webpm/resources/${window.btoa(pkgJson.name)}/${pkgJson.version}`

export const imageTopics: Record<Topic, string> = {
    LoadingGraph: `${webpmPath}/assets/fa-thumbtack.svg`,
    ESM: `${webpmPath}/assets/JavaScript-logo.png`,
    Python: `${webpmPath}/assets/Python-logo-notext.svg`,
    Backend: `${webpmPath}/assets/fa-network-wired.svg`,
    CSS: `${webpmPath}/assets/fa-css3-alt.svg`,
    Worker: `${webpmPath}/assets/fa-cog.svg`,
}
/**
 * Generic view for a given target (ESM module, backend, CSS resource, pyodide module, *etc.*).
 */
export class ItemView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'webpm-ItemView'

    public readonly tag = 'div'
    public readonly class = `${ItemView.CssSelector} d-flex align-items-center`
    public readonly children: ChildrenLike

    constructor({
        name,
        topic,
        version,
        target,
        phases,
    }: {
        name: string
        topic: Topic
        version?: string
        target?: string
        phases: Phase[]
    }) {
        const icons: Record<PhaseStatus, string> = {
            started: 'webpm-pulse',
            succeeded: 'text-success',
            failed: 'text-danger',
            failed401: 'fas text-danger fa-ban',
            failed404: 'fas text-danger fa-search',
        }
        if (version) {
            name += `#${version}`
        }
        if (target) {
            name += `~${target}`
        }
        this.children = [
            {
                tag: 'img',
                src: imageTopics[topic],
                width: 25,
            },
            { tag: 'div', class: 'mx-2' },
            {
                tag: 'div',
                innerText: name,
            },
            ...phases.map((phase) => {
                return {
                    tag: 'i' as const,
                    class: attr$({
                        source$: phase.source$,
                        vdomMap: (event) => {
                            if (
                                event === 'failed401' ||
                                event === 'failed404'
                            ) {
                                return icons[event]
                            }
                            return `${phase.icon} ${icons[event]}`
                        },
                        wrapper: (d) => `${d} mx-1`,
                    }),
                }
            }),
        ]
    }
}
