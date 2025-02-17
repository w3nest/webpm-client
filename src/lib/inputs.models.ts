import { CdnEvent, CdnFetchEvent } from './events.models'

/**
 * A FileLocationString is a string that specifies location in the files structure of a module using the format:
 * `{moduleName}#{version}~{rest-of-path}`
 *
 * Where:
 * *  `moduleName` is the name of the module containing the script
 * *  `version` is the semver query
 * *  `rest-of-path` is the path of the script from the root module directory
 *
 *
 * E.g.: `codemirror#5.52.0~mode/javascript.min.js`
 *
 */
export type FileLocationString = string

/**
 * A `LightLibraryQueryString` is a string format used to specify a library installation request.
 *
 * The format can be one of the following:
 *
 * - `string`: The library name, implicitly targeting the latest available version.
 * - `${string}#${string}`: A library name followed by a `#` and a **semantic versioning range**.
 *
 * **Example Usage:**
 *
 * ```ts
 * "codemirror#^5.52.0"
 * ```
 *
 * In this example, `codemirror` is requested with the latest compatible version matching `^5.52.0`.
 *
 * <note level="warning">
 * When specifying a semantic versioning range, it is strongly recommended to use an API-compatible range
 * (i.e., using the `^` operator).
 *
 * This ensures that only a **single version** of the library is installed for a given API version (determined by
 * the left-most non-zero digit), as multiple versions of the same API are **not allowed**.
 * </note>
 * @inline
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type LightLibraryQueryString = string | `${string}#${string}`

/**
 * A `LightLibraryWithAliasQueryString` extends {@link LightLibraryQueryString} by allowing an optional alias.
 *
 * The expected format:
 * ```
 * {moduleName}#{semver} as {alias}
 * ```
 *
 * **Example Usage:**
 * ```ts
 * "codemirror#^5.52.0 as CM"
 * ```
 *
 * - `codemirror#^5.52.0`: Specifies the module and its semantic versioning range.
 * - `as CM`: Assigns an alias (`CM`) for easier reference.
 * @inline
 */
export type LightLibraryWithAliasQueryString =
    | LightLibraryQueryString
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | `${LightLibraryQueryString} as ${string}`

/**
 * A string interpreted as a python module specification.
 *
 * They are forwarded to <a target="_blank" href="https://pyodide.org/en/stable/usage/loading-packages.html#micropip">
 * micropip.install</a> for installation within the Pyodide environment.
 */
export type PyModule = string

/**
 * Specifies the installation of various components in the environment.
 *
 * This is the input for the method {@link install}.
 */
export interface InstallInputs {
    /**
     * Specifies the ESM modules to install, using one of the following:
     * *  {@link LightLibraryWithAliasQueryString} for a simpler specification with limited control.
     * *  {@link EsmInputs} for a comprehensive specification.
     */
    esm?: LightLibraryWithAliasQueryString[] | EsmInputs

    /**
     * Specifies the backend modules to install, using one of the following:
     * *  {@link LightLibraryWithAliasQueryString} for a simpler specification with limited control.
     * *  {@link EsmInputs} for a comprehensive specification.
     */
    backends?: LightLibraryWithAliasQueryString[] | BackendInputs

    /**
     * Specifies the pyodide (python running in the browser) modules to install, using one of the following:
     * *  {@link PyModule} for a simpler specification with limited control.
     * *  {@link PyodideInputs} for a comprehensive specification.
     */
    pyodide?: PyModule[] | PyodideInputs

    /**
     * Specify a list of stylesheets to install.
     */
    css?: CssInput[]

    /**
     * Window global in which installation occurs. If not provided, `window` is used.
     *
     * If the client is running in a Web Worker, it is the worker's global scope.
     */
    executingWindow?: WindowOrWorkerGlobalScope

    /**
     * If provided, any {@link CdnEvent} emitted are forwarded to this callback.
     *
     * @param event event emitted
     */
    onEvent?: (event: CdnEvent) => void

    /**
     * If `true`: loading screen is displayed and cover the all screen
     *
     * For a granular control of the loading screen display see {@link LoadingScreenView}
     */
    displayLoadingScreen?: boolean
}
/**
 * Specifies the installation of ESM modules.
 */
export interface EsmInputs {
    /**
     * List of modules to install.
     */
    modules: LightLibraryWithAliasQueryString[]

    /**
     * Specifies standalone scripts to install in the browser.
     * By opposition to `modules`, a script is installed as a standalone element:
     * there is no direct or indirect dependencies' installation triggered.
     *
     * They are installed after all modules have been installed.
     */
    scripts?: ScriptInput[]

    /**
     * Override the 'natural' version used for some libraries coming from the dependency graph when resolving
     * the installation. Items are provided in the form {@link LightLibraryQueryString}.
     *
     * Whenever a library is required in the dependency graph, the version(s) will be replaced by the (only) one
     * coming from the relevant element (if any).
     * This in turn disables multiple versions installation for the provided library
     *
     * Here is a fictive example of installing a module `@youwol/fictive-package` with 2 versions `0.x` & `1.x`:
     * *  the version `0.x` linked to `rxjs#6.x`
     * *  the version `1.x` linked to `rxjs#7.x`
     *
     * When executed, the following snippet overrides the actual versions resolution of rxjs and always uses `rxjs#6.5.5`
     * (which will probably break at installation of `@youwol/fictive-package#1.x` as the two versions of RxJS are not
     * compatible).
     * ```
     * import {install} from `@youwol/webpm-client`
     *
     * await install({
     *     esm:{
     *         modules: [`@youwol/fictive-package#0.x`, `@youwol/fictive-package#1.x`],
     *         usingDependencies: ['rxjs#6.5.5']
     *     }
     * })
     * ```
     */
    usingDependencies?: LightLibraryQueryString[]
    /**
     * Specify side effects to execute when modules are installed.
     *
     * The key is in the form `{libraryName}#{semver}`:
     * any module installed matching some keys will trigger execution
     * of associated side effects.
     *
     */
    modulesSideEffects?: Record<
        LightLibraryQueryString,
        ModuleSideEffectCallback
    >

    /**
     * Provide aliases to exported symbols name of module.
     */
    aliases?: Record<string, string | ((Window) => unknown)>
}

/**
 * Specifies configuration for a backend.
 *
 */
export interface BackendConfig {
    /**
     * Arguments regarding the build stage provided as key-value pairs.
     *
     * The available keys and values are backend specifics and should be documented by them.
     */
    buildArgs: Record<string, string>
}

/**
 * Specifies the installation of backends.
 */
export interface BackendInputs {
    /**
     * List of modules to install.
     */
    modules: LightLibraryWithAliasQueryString[]
    /**
     * Configuration of the backend.
     *
     * A mapping with:
     * *  Keys: backends names.
     * *  Values: associated configuration.
     */
    configurations?: Record<string, BackendConfig>
    /**
     * Partition ID in which the backends are installed.
     */
    partition?: string
}

/**
 * Installer description for the pyodide runtime environment.
 */
export interface PyodideInputs {
    /**
     * Pyodide target version (no semver allowed).
     *
     * If not provided, get the latest release tag from:
     *
     * `https://api.github.com/repos/pyodide/pyodide/releases/latest`.
     *
     * <note level="warning">
     * It is not possible to install multiple Pyodide versions, only a single one is allowed.
     * </note>
     */
    version?: string
    /**
     * Modules to install.
     */
    modules?: PyModule[]

    /**
     * Alias for the pyodide runtime (exposed as `pyodide`).
     */
    pyodideAlias?: string
}

/**
 * Specification of a module.
 */
export type ModuleInput =
    | {
          name: string
          version: string
          sideEffects?: (Window) => void
      }
    | string

/**
 * specification of a CSS resource, either:
 * *  the reference to a location
 * *  an object with
 *     *  'location': reference of the location
 *     *  'sideEffects': the sideEffects to execute after the HTMLLinkElement has been loaded,
 *     see {@link CssSideEffectCallback}
 *
 */
export type CssInput =
    | FileLocationString
    | { location: FileLocationString; sideEffects?: CssSideEffectCallback }

/**
 * specification of a Script resource, either:
 * *  the reference to a location
 * *  an object with
 *     *  'location': reference of the location
 *     *  'sideEffects': the sideEffects to execute after the HTMLScriptElement has been loaded,
 *     see {@link ScriptSideEffectCallback}
 *
 */
export type ScriptInput =
    | FileLocationString
    | { location: FileLocationString; sideEffects: ScriptSideEffectCallback }

export interface InstallStyleSheetsInputs {
    /**
     * See {@link InstallInputs.css}
     */
    css: CssInput[]

    /**
     * Window global in which css elements are added. If not provided, `window` is used.
     */
    renderingWindow?: Window

    /**
     * See `onEvent` from {@link InstallInputs}
     */
    onEvent?: (event: CdnEvent) => void
}

export interface InstallLoadingGraphInputs {
    /**
     * Specification of the loading graph, usually retrieved from {@link queryLoadingGraph}.
     */
    loadingGraph: LoadingGraph

    /**
     * Backends configuration, keys are backend names.
     */
    backendsConfig?: Record<string, BackendConfig>

    /**
     * Partition ID.
     */
    backendsPartitionId?: string

    /**
     * See `modulesSideEffects` of {@link InstallInputs}
     */
    modulesSideEffects?: Record<string, ModuleSideEffectCallback>

    /**
     * See `executingWindow` from {@link InstallInputs}
     */
    executingWindow?: WindowOrWorkerGlobalScope

    /**
     * See `aliases` from {@link InstallInputs}
     */
    aliases?: Record<string, string | ((WindowOrWorkerGlobalScope) => unknown)>

    /**
     * See `onEvent` from {@link InstallInputs}
     */
    onEvent?: (event: CdnEvent) => void
}

export interface FetchScriptInputs {
    /**
     * url of the script, see {@link getUrlBase}.
     */
    url: string

    /**
     * Preferred displayed name when referencing the script (exposed in {@link CdnFetchEvent})
     */
    name?: string

    /**
     * If provided, any {@link CdnFetchEvent} emitted are forwarded to this callback.
     *
     * @param event event emitted
     */
    onEvent?: (event: CdnFetchEvent) => void
}

export interface InstallModulesInputs {
    /**
     * See {@link EsmInputs.modules}
     */
    modules?: LightLibraryWithAliasQueryString[]

    /**
     * See {@link EsmInputs.modulesSideEffects}
     */
    modulesSideEffects?: Record<string, ModuleSideEffectCallback>

    /**
     * See {@link EsmInputs.usingDependencies}
     */
    usingDependencies?: LightLibraryQueryString[]

    /**
     * See {@link EsmInputs.aliases}
     */
    aliases?: Record<string, string | ((Window) => unknown)>

    backendsConfig: Record<string, BackendConfig>

    backendsPartitionId: string

    /**
     * See {@link InstallInputs.executingWindow}
     */
    executingWindow?: WindowOrWorkerGlobalScope

    /**
     * See {@link InstallInputs.onEvent}
     */
    onEvent?: (event: CdnEvent) => void
}

export interface InstallScriptsInputs {
    /**
     * See {@link EsmInputs.scripts}
     */
    scripts: ScriptInput[]
    /**
     * See {@link InstallInputs.executingWindow}
     */
    executingWindow?: WindowOrWorkerGlobalScope
    /**
     * See {@link InstallInputs.onEvent}
     */
    onEvent?: (ev: CdnEvent) => void

    /**
     * See {@link EsmInputs.aliases}
     */
    aliases?: Record<string, string | ((WindowOrWorkerGlobalScope) => unknown)>
}

/**
 * Argument type for {@link ModuleSideEffectCallback}
 */
export interface ModuleSideEffectCallbackArgument {
    /**
     * The installed module
     */
    module: unknown
    /**
     * Origin of the module
     */
    origin: FetchedScript
    /**
     * HTML script element added
     */
    htmlScriptElement?: HTMLScriptElement
    /**
     * Window instance in which the HTML script element has been added
     */
    executingWindow: WindowOrWorkerGlobalScope
}
/**
 * Type definition of a module installation side effects:
 * a callback taking an instance of {@link ModuleSideEffectCallbackArgument} as argument.
 */
export type ModuleSideEffectCallback = (
    argument: ModuleSideEffectCallbackArgument,
) => void | Promise<void>

/**
 * Argument type for {@link CssSideEffectCallback}
 */
export interface CssSideEffectCallbackArgument {
    /**
     * Origin of the style-sheet
     */
    origin: {
        moduleName: string
        version: string
        assetId: string
        url: string
    }

    /**
     * HTML script element added
     */
    htmlLinkElement: HTMLLinkElement
    /**
     * Window instance in which the HTML link element has been added
     */
    renderingWindow: Window
}

/**
 * Type definition of a css installation side effects:
 * a callback taking an instance of {@link CssSideEffectCallbackArgument} as argument.
 */
export type CssSideEffectCallback = (
    argument: CssSideEffectCallbackArgument,
) => void | Promise<void>

/**
 * Argument type for {@link CssSideEffectCallback}
 */
export interface ScriptSideEffectCallbackArgument {
    /**
     * Origin of the style-sheet
     */
    origin: FetchedScript

    /**
     * HTML script element added
     */
    htmlScriptElement?: HTMLScriptElement

    /**
     * Window instance in which the HTML script element has been added
     */
    executingWindow: WindowOrWorkerGlobalScope
}

/**
 * Type definition of a script installation side effects:
 * a callback taking an instance of {@link ScriptSideEffectCallbackArgument} as argument.
 */
export type ScriptSideEffectCallback = (
    argument: ScriptSideEffectCallbackArgument,
) => void | Promise<void>

/**
 * Inputs for the method {@link queryLoadingGraph}.
 *
 */
export interface QueryLoadingGraphInputs {
    /**
     * See `modules` of {@link InstallInputs}
     */
    modules: LightLibraryQueryString[]

    /**
     * See `usingDependencies` of {@link InstallInputs}
     */
    usingDependencies?: LightLibraryQueryString[]

    /**
     * This property allows to resolve loading graph, including some libraries that may not exist
     * in target database.
     *
     * Essentially used within py-youwol to couple loading graphs local/remote.
     * See py-youwol source code regarding the generation of this property from a list of libraries.
     */
    extraIndex?: string
}

export interface Library {
    /**
     * id of the library in the asset store
     */
    id: string

    /**
     * name of the library, e.g. @youwol/webpm-client
     */
    name: string

    /**
     * Version of the library, e.g. 0.0.0
     */
    version: string

    /**
     * Type of the library.
     */
    type: 'js/wasm' | 'backend'

    /**
     * Name of the exported symbol
     */
    exportedSymbol: string

    /**
     * Uid of the API version
     */
    apiKey: string

    /**
     * List of aliases
     */
    aliases: string[]
}

/**
 * Provides necessary information to correctly install & link a set of resources.
 * It serves a purpose similar to the usual [lockFiles](https://developerexperience.io/articles/lockfile)
 * found in packages managers.
 *
 * Loading graphs can be:
 *  *  retrieved ({@link queryLoadingGraph})
 *  *  used to import runtimes ({@link installLoadingGraph})
 *
 */
export interface LoadingGraph {
    /**
     *
     * List of javascript libraries to fetch by batch:
     *
     * *  `definition[i]` defines a batch of libraries that can be fetched in any order (or at the same time), provided
     * that all the libraries for the batches `j<i` have already been fetched
     * *  `definition[i][j]` defines the j'th library for the batch i:
     * a tuple of [`id`, `cdn-url`] where `id` is the asset id and `cdn-url` the associated URL
     */
    definition: [string, string][][]

    /**
     *
     * Describes the libraries included in the loading graph
     */
    lock: Library[]

    /**
     * Type of the graph (versioning to be able to change the fetching mechanism)
     */
    graphType: string
}

/**
 * Output when a script has been fetched, see e.g. {@link Client.fetchScript}.
 *
 * @hidden
 */
export interface FetchedScript {
    /**
     * name: module name if the script correspond to a module,
     * can be defined by the user when using {@link Client.fetchScript}.
     */
    name: string

    /**
     * Version of the module used
     */
    version: string

    /**
     * asset id
     */
    assetId: string

    /**
     * full URL of the script element
     */
    url: string

    /**
     * content of the script element
     */
    content: string

    /**
     * Completed progress event
     */
    progressEvent?: ProgressEvent<XMLHttpRequestEventTarget>
}
