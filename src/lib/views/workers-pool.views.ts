import { VirtualDOM, ChildrenLike } from '../rx-vdom.types'
import { filter, map } from 'rxjs/operators'
import type { WorkersPool } from '../workers-pool'
import { combineLatest } from 'rxjs'
import { InstallView } from './install.view'

/**
 * Displays installation progress in {@link WorkersPool}.
 *
 * @category View
 */
export class WorkersPoolView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static CssSelector = 'webpm-WorkersPoolView'

    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public class = `${WorkersPoolView.CssSelector} w-100 h-100 d-flex flex-column`

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor(params: { workersPool: WorkersPool }) {
        this.children = [
            {
                tag: 'div',
                class: 'w-100 d-flex flex-grow-1 p-2 flex-wrap overflow-auto',
                children: {
                    policy: 'replace',
                    source$: params.workersPool.startedWorkers$,
                    vdomMap: (workerIds: string[]) => {
                        return [...workerIds].map((workerId) => {
                            return new WorkerCard({
                                workerId,
                                workersPool: params.workersPool,
                            })
                        })
                    },
                },
            },
        ]
    }
}

/**
 * Component representing a particular worker.
 *
 * @category View
 */
export class WorkerCard implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static CssSelector = 'webpm-WorkerCard'
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = `${WorkerCard.CssSelector} p-2 m-2 rounded border`

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        height: 'fit-content',
        width: 'fit-content',
        maxWidth: '100%',
    }

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable Constants
     */
    public readonly workerId: string

    /**
     * @group States
     */
    public readonly workersPool: WorkersPool

    constructor(params: { workerId: string; workersPool: WorkersPool }) {
        Object.assign(this, params)

        const installView = new InstallView()
        this.workersPool.cdnEvent$
            .pipe(filter((ev) => ev.workerId === this.workerId))
            .subscribe((ev) => {
                installView.onEvent(ev)
            })
        this.children = [new WorkerCardTitleView(params), installView]
    }
}

type WorkerStatus = 'Pending' | 'Created' | 'Busy'
/**
 * Component representing the title of a {@link WorkerCard}.
 *
 * @category View
 */
export class WorkerCardTitleView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static CssSelector = 'webpm-WorkerCardTitleView'
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = `${WorkerCardTitleView.CssSelector} d-flex align-items-center`

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable Constants
     */
    public readonly workerId: string

    /**
     * @group States
     */
    public readonly workersPool: WorkersPool

    constructor(params: { workerId: string; workersPool: WorkersPool }) {
        Object.assign(this, params)
        const wp = this.workersPool
        const classes: Record<WorkerStatus, string> = {
            Pending: 'fa-cloud-download-alt',
            Created: '',
            Busy: 'fa-play',
        }
        const statusWorker$ = combineLatest([
            wp.workers$.pipe(map((workers) => Object.keys(workers))),
            wp.busyWorkers$,
        ]).pipe(
            map(([ready, busy]) => {
                const readyStatus = ready.includes(this.workerId)
                    ? 'Created'
                    : 'Pending'
                return busy.includes(this.workerId) ? 'Busy' : readyStatus
            }),
        )
        this.children = [
            {
                tag: 'div',
                style: {
                    fontWeight: 'bolder',
                    fontSize: 'larger',
                },
                innerText: `Worker ${this.workerId}`,
            },
            {
                tag: 'div',
                class: {
                    source$: statusWorker$,
                    vdomMap: (status: WorkerStatus): string => classes[status],
                    wrapper: (d: string) =>
                        `fas ${d} text-success fa-fade mx-2`,
                },
            },
        ]
    }
}
