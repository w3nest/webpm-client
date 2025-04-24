import {
    CdnEvent,
    isErrorEvent,
    isCdnEvent,
    StartInstallEvent,
    CdnLoadingGraphResolvedEvent,
} from './events.models'
import { installViewsModule } from './views.installer'
import type { InstallView as DetailsView } from './views'
import { LoadingGraph } from './inputs.models'

import {
    AllEvents,
    BackendErrorEvent,
    CdnLoadingGraphErrorEvent,
    ErrorEventType,
    ParseErrorEvent,
    UnauthorizedEvent,
} from './events.models'
import { CircularDependencies, DependenciesError } from './errors.models'

/**
 * Specifies loading screen display options, see {@link LoadingScreen}.
 */
export interface DisplayOptions {
    /**
     * Container in which the loading screen's HTMLDivElement is appended
     * (when calling {@link LoadingScreen.render}).
     *
     * Default to `document.body`.
     */
    container?: HTMLElement

    /**
     * ID of the loading screen's HTMLDivElement wrapper.
     *
     * Default to `loading-screen`.
     */
    id?: string

    /**
     * URL to the logo.
     */
    logo: string

    /**
     * Application name.
     */
    name: string

    /**
     * Description.
     */
    description: string

    /**
     * Style to apply on the loading screen's HTMLDivElement wrapper.
     */
    wrapperStyle?: Record<string, string>

    /**
     * Fading timeout (ms).
     *
     * Default to `500ms`.
     */
    fadingTimeout?: number

    /**
     * Minimum time the screen is displayed (ms).
     *
     * Default to `1000ms`.
     */
    minimumDisplayTime?: number

    /**
     * If true, render the view when created.
     *
     * Default to `true`.
     */
    autoRender?: boolean
}

/**
 * Component displaying a loading screen with logo, app name & description.
 * Progresses are reported and an additional 'info' button can be toggled to display the installation logs.
 */
export class LoadingScreen {
    /**
     * The actual display options used by the class.
     */
    public readonly options: Required<DisplayOptions>

    /**
     * The HTMLDivElement encapsulating the view.
     */
    public readonly wrapperDiv: HTMLDivElement

    private contentDiv: HTMLDivElement
    private progressBarDiv: HTMLDivElement
    private detailsDiv: HTMLDivElement

    private installedCount = 1
    private events: CdnEvent[] = []
    private startEvent: StartInstallEvent
    private loadingGraph: LoadingGraph
    private detailsView?: DetailsView = undefined
    private t0: number

    /**
     * @param options see {@link DisplayOptions}.
     */
    constructor(options: DisplayOptions) {
        const defaultDisplayOptions: Omit<
            Required<DisplayOptions>,
            'logo' | 'name' | 'description'
        > = {
            id: 'loading-screen',
            fadingTimeout: 500,
            container: document.body,
            minimumDisplayTime: 1000,
            wrapperStyle: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                padding: 'inherit',
                'font-weight': 'bolder',
                'z-index': '10',
            },
            autoRender: true,
        }

        this.options = {
            ...defaultDisplayOptions,
            ...options,
        }
        const wrapperStyle = {
            ...this.options.wrapperStyle,
            ...(options.wrapperStyle ?? {}),
        }
        this.wrapperDiv = document.createElement('div')
        Object.entries(wrapperStyle).forEach(([k, v]) => {
            this.wrapperDiv.style.setProperty(k, v)
        })
        this.wrapperDiv.innerHTML = `
        <div id='${String(this.options.id)}' style='display: flex;justify-content: space-around; background-color: #0f172a;
        width:100%; height:100%; opacity:1;
        transition: opacity 1s;'>
            <div style='margin-top: auto;margin-bottom: auto; padding:40px; border-radius: 25px;min-width: 50%; max-height:75%;max-width:75%; overflow: auto;
            display: flex;flex-direction: column'
            >
                <div  style='display: flex;justify-content: space-around;' >
                    <img src='${this.options.logo}' style='width: clamp(80px, 20vw, 140px)'></img>
                </div> 
                <div style='margin-left: auto;margin-right: auto; text-align: center; margin-top: 1rem;'>
                
                    <h2 style='color:#f4f4f5'>
                    ${this.options.name}
                    </h2>
                    
                    <h3 style='color:#94a3b8'>
                    ${this.options.description}
                    </h3>
                </div>
                <div style='width: 100%; display: flex;'>
                    <div id="webpm-client-pbar" style='margin-top:5px;margin-bottom:5px; width: 0%; display: flex; background-color:green'></div>
                    <div style='flex-grow: 1; margin-top:5px;margin-bottom:5px; min-width:0px, height: 100%; background-color:gray'></div>
                    <div id="webpm-client-details-btn" style="margin-left:5px;font-size:smaller;cursor:pointer">ℹ️</div>
                </div>
                <div id="webpm-client-details">Details</div>
                <div  class='screen-messages-container' style='color: green; font-family: monospace;font-size:small; margin-left: auto;margin-right: auto; '>
    
                </div>
            </div>
        </div>
        `
        if (this.options.autoRender) {
            this.render()
        }
    }

    /**
     * Actualize the view given a new {@link CdnEvent} (provided that {@link LoadingScreen.render}
     * has been called before).
     *
     * @param event event to account for
     */
    next(event: CdnEvent) {
        if (!isCdnEvent(event)) {
            return
        }
        if (!this.detailsView) {
            this.events.push(event)
        } else {
            this.detailsView.onEvent(event)
        }
        if (event.step === 'CdnLoadingGraphResolvedEvent') {
            this.loadingGraph = (event as CdnLoadingGraphResolvedEvent).resp
        }
        if (event.step === 'StartInstallEvent') {
            this.startEvent = event as StartInstallEvent
        }
        if (isErrorEvent(event)) {
            displayError(this.contentDiv, event)
        }
        if (
            [
                'SourceParsedEvent',
                'PyModuleLoadedEvent',
                'StartBackendEvent',
            ].includes(event.step)
        ) {
            const total =
                this.loadingGraph.lock.length +
                this.startEvent.pyodide.modules.length

            this.installedCount++
            const progress = Math.floor((100 * this.installedCount) / total)
            this.progressBarDiv.style.width = `${String(progress)}%`
        }
    }

    /**
     * Render the view.
     */
    render() {
        if (this.t0) {
            return
        }
        this.t0 = Date.now()
        this.options.container.appendChild(this.wrapperDiv)

        this.contentDiv = this.wrapperDiv.querySelector(
            '.screen-messages-container',
        ) as unknown as HTMLDivElement
        this.progressBarDiv = document.getElementById(
            'webpm-client-pbar',
        ) as HTMLDivElement

        this.detailsDiv = document.getElementById(
            'webpm-client-details',
        ) as HTMLDivElement

        const button = document.getElementById(
            'webpm-client-details-btn',
        ) as HTMLButtonElement

        button.onclick = () => {
            void installViewsModule().then((mdle) => {
                const detailsView = new mdle.InstallView({
                    expandedMode: 'expanded',
                })
                this.detailsView = detailsView
                this.events.forEach((ev) => {
                    detailsView.onEvent(ev)
                })
                this.detailsDiv.append(detailsView.toHTML())
            })
        }
    }

    /**
     * Remove the loading screen (see {@link DisplayOptions.fadingTimeout}).
     */
    done() {
        const elapsed = Date.now() - this.t0
        setTimeout(() => {
            this.wrapperDiv.style.setProperty(
                'transition',
                `opacity ${String(this.options.fadingTimeout)}ms`,
            )
            this.wrapperDiv.style.setProperty('opacity', '0')
            setTimeout(() => {
                this.wrapperDiv.remove()
            }, 1000)
        }, this.options.minimumDisplayTime - elapsed)
    }
}

export function displayError(
    contentDiv: HTMLDivElement,
    event: AllEvents[ErrorEventType],
) {
    contentDiv.style.setProperty('font-size', 'larger')
    contentDiv.style.setProperty('color', 'orange')
    if (event instanceof CdnLoadingGraphErrorEvent) {
        if (event.error instanceof DependenciesError) {
            contentDiv.appendChild(dependenciesErrorView(event.error))
        }
        if (event.error instanceof CircularDependencies) {
            contentDiv.appendChild(circularDependenciesView(event.error))
        }
        return
    }
    const errorDiv = document.createElement('div')
    if (event instanceof UnauthorizedEvent) {
        errorDiv.textContent = `> ${event.id} : You don't have permission to access this resource.`
    }
    if (event instanceof ParseErrorEvent) {
        errorDiv.textContent = `> ${event.id} : an error occurred while parsing the source`
    }
    if (event instanceof BackendErrorEvent) {
        errorDiv.textContent = `> ${event.id} : ${event.detail}`
    }
    contentDiv.appendChild(errorDiv)
}

export function dependenciesErrorView(error: DependenciesError) {
    const errorDiv = document.createElement('div')
    const innerHTML = error.detail.errors
        .map(({ query }) => {
            return `
        <li> <b>${query}</b></li>
        `
        })
        .reduce((acc, e) => acc + e, '')
    errorDiv.innerHTML = `Dependencies not found:
    ${innerHTML}
    `
    return errorDiv
}

export function circularDependenciesView(error: CircularDependencies) {
    const errorDiv = document.createElement('div')
    const innerHTML = Object.entries(error.detail.packages)
        .map(([name, dependenciesError]) => {
            return `
        <li> <b>${name}</b>: problem with following dependencies 
        <ul>
        ${listView(dependenciesError.map((d) => `${d.name}#${d.version}`))}
        </ul>
        </li>
        `
        })
        .reduce((acc, e) => acc + e, '')
    errorDiv.innerHTML = `Circular dependencies found
    ${innerHTML}
    `
    return errorDiv
}

function listView(list: string[]) {
    return list
        .map((path) => {
            return `<li> ${path}</li>`
        })
        .reduce((acc, e) => acc + e, '')
}
