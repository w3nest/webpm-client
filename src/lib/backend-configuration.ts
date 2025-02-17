function computeOrigin(
    origin:
        | {
              secure?: boolean
              hostname?: string
              port?: number
          }
        | undefined,
) {
    if (origin === undefined) {
        return ''
    }

    const secure = origin.secure ?? 'hostname' in origin

    const hostname = origin.hostname ?? 'localhost'

    const port = origin.port ?? ('hostname' in origin ? '' : 8080)

    return `http${secure ? 's' : ''}://${hostname}${port ? ':' : ''}${String(port)}`
}

/**
 * Backend configuration, retrieved from w3nest cookie.
 * See {@link backendConfiguration}.
 *
 */
export interface BackendConfiguration {
    /**
     * Origin of the backend, use empty string for relative resolution
     */
    readonly origin: string
    /**
     * Backend's URL to resolve the loading graph
     */
    readonly urlLoadingGraph: string
    /**
     * Backend's URL used to fetch the raw content of a package
     */
    readonly urlResource: string
    /**
     * Backend's URL to resolve pypi python modules. If not provided, fallback to
     * `https://pypi.org/`.
     */
    readonly urlPypi: string
    /**
     * Backend's URL to resolve pyodide python modules. If not provided, fallback to
     * `https://cdn.jsdelivr.net/pyodide/v$VERSION/full` where $VERSION is the pyodide target version.
     */
    readonly urlPyodide: string

    /**
     * id of the configuration
     */
    readonly id?: string
}

/**
 * Cookie model set by W3Nest (either the local server or the remote one).
 */
export interface Cookie {
    /**
     * *  `local` : W3Nest local server
     * *  `remote` : W3Nest remote server (`https://w3nest.org`).
     */
    type: 'local' | 'remote'
    /**
     * Web Socket URL for data.
     */
    wsDataUrl: string
    /**
     * Web Socket URL for logs.
     */
    wsLogsUrl: string
    /**
     * Port (if applicable).
     */
    port: number
    /**
     * Server Origin.
     */
    origin: string

    /**
     * WebPM paths definition.
     */
    webpm: {
        pathLoadingGraph: string
        pathResource: string
        pathPyodide: string
        pathPypi: string
        pathBackendInstall: string
        pathBackendUninstall: string
    }
}

export function getLocalCookie(): Cookie | undefined {
    const name = 'w3nest'
    const regex = new RegExp(`(^| )${name}=([^;]+)`)
    const match = regex.exec(document.cookie)
    if (match) {
        try {
            const decoded = decodeURIComponent(match[2]).slice(1, -1)
            return JSON.parse(decoded) as Cookie
        } catch (error) {
            console.error('Can not retrieved local cookie', error)
            return undefined
        }
    }
}
/**
 * Construct a backend configuration.
 *
 * @param _p
 * @param _p.pathLoadingGraph Path of the end-point to query the loading graph.
 * @param _p.pathResource Path of the end-point to fetch the bundle of a package.
 * @param _p.origin Origin of the backend.
 * @param _p.id Id associated to the configuration.
 * @param _p.pathPypi Path to fetch PyPi module.
 * @param _p.pathPyodide Path to fetch Pyodide resources.
 */
export function backendConfiguration({
    pathLoadingGraph,
    pathResource,
    origin,
    id,
    pathPypi,
    pathPyodide,
}: {
    id?: string
    pathLoadingGraph: string
    pathResource: string
    origin?: { secure?: boolean; hostname?: string; port?: number } | string
    pathPypi?: string
    pathPyodide?: string
}): BackendConfiguration {
    if (typeof origin !== 'string') {
        origin = computeOrigin(origin)
    }
    return {
        id,
        origin,
        urlLoadingGraph: `${origin}${pathLoadingGraph}`,
        urlResource: `${origin}${pathResource}`,
        urlPypi: pathPypi ? `${origin}${pathPypi}` : 'https://pypi.org/',
        urlPyodide: pathPyodide
            ? `${origin}${pathPyodide}/$VERSION`
            : `https://cdn.jsdelivr.net/pyodide/v$VERSION/full`,
    }
}
