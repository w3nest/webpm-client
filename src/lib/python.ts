import {
    CdnEvent,
    PyRuntimeReadyEvent,
    StartPyRuntimeEvent,
    StartPyEnvironmentInstallEvent,
    InstallPyModuleEvent,
    PyModuleLoadedEvent,
    PyEnvironmentReadyEvent,
    FetchPyRuntimeEvent,
    FetchedPyRuntimeEvent,
    ConsoleEvent,
    PyEnvironmentErrorEvent,
    PyModuleErrorEvent,
} from './events.models'
import { addScriptElements } from './utils'
import { StateImplementation } from './state'
import { PyodideInputs } from './inputs.models'

export interface PythonIndexes {
    standardUrlPyodide: string
    standardUrlPypi: string
}

function log(text: string, onEvent: (ev: CdnEvent) => void) {
    onEvent(new ConsoleEvent('Info', 'Python', text))
}

interface Pyodide {
    loadPackage: (...modules: string[]) => Promise<void>
    runPythonAsync: (src: string) => Promise<unknown>
    version: string
    _api: {
        repodata_packages: Record<string, { name: string; version: string }>
    }
}
export async function installPython(
    pyodideInputs: PyodideInputs & {
        onEvent?: (cdnEvent: CdnEvent) => void
    } & PythonIndexes,
) {
    const modulesRequired = (pyodideInputs.modules ?? []).filter(
        (module) => !StateImplementation.importedPyModules.includes(module),
    )

    const onEvent =
        pyodideInputs.onEvent ??
        (() => {
            /*no op*/
        })
    if (globalThis.pyodide) {
        log(
            `Pyodide runtime already available at ${(globalThis.pyodide as Pyodide).version}`,
            onEvent,
        )
    }
    if (!globalThis.pyodide) {
        log(`No Pyodide runtime available, proceed to installation`, onEvent)
        let pyodideVersion = pyodideInputs.version
        if (!pyodideVersion) {
            const urlLatestTag =
                'https://api.github.com/repos/pyodide/pyodide/releases/latest'
            log(
                `No Pyodide version provided, fetch the latest from tag from ${urlLatestTag}`,
                onEvent,
            )
            const latest = (await fetch(urlLatestTag).then((resp) =>
                resp.json(),
            )) as { tag_name: string }
            pyodideVersion = latest.tag_name
            log(`Found latest Pyodide version: ${pyodideVersion}`, onEvent)
        }
        const indexURLBase = pyodideInputs.indexUrl
            ? pyodideInputs.indexUrl
            : pyodideInputs.standardUrlPyodide

        const indexURL = indexURLBase.replace('$VERSION', pyodideVersion)

        log(`Install Pyodide from '${indexURL}'`, onEvent)
        onEvent(
            new FetchPyRuntimeEvent(pyodideVersion, `${indexURL}/pyodide.js`),
        )
        const content = await fetch(`${indexURL}/pyodide.js`).then((resp) =>
            resp.text(),
        )
        onEvent(
            new FetchedPyRuntimeEvent(pyodideVersion, `${indexURL}/pyodide.js`),
        )
        onEvent(new StartPyRuntimeEvent(pyodideVersion))
        await addScriptElements([
            {
                name: 'pyodide',
                version: pyodideVersion,
                assetId: '',
                url: `${indexURL}/pyodide.js`,
                content,
                progressEvent: undefined,
            },
        ])
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const pyodide = (await globalThis.loadPyodide({
            indexURL,
        })) as unknown as Pyodide
        globalThis.pyodide = pyodide
    }
    if (pyodideInputs.pyodideAlias) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        globalThis[pyodideInputs.pyodideAlias] = globalThis.pyodide
    }

    const pyodide = globalThis.pyodide as Pyodide
    const pyodideVersion = pyodide.version
    onEvent(new PyRuntimeReadyEvent(pyodideVersion))
    onEvent(new StartPyEnvironmentInstallEvent())
    onEvent(new InstallPyModuleEvent('micropip'))
    await pyodide.loadPackage('micropip')

    onEvent(new PyModuleLoadedEvent('micropip'))
    modulesRequired.forEach((module) => {
        onEvent(new InstallPyModuleEvent(module))
    })

    const piPyUrl = pyodideInputs.standardUrlPypi
    const installModule = (module: string) => {
        if (module in pyodide._api.repodata_packages) {
            log(
                `Package ${module} part of Pyodide distribution, load using pyodide.loadPackage`,
                onEvent,
            )
            return pyodide.loadPackage(module)
        }
        const parameters = `, index_urls='${piPyUrl}'`
        const cmd = `await micropip.install(requirements='${module}'${parameters})`
        log(`> ${cmd}`, onEvent)
        return pyodide.runPythonAsync(`
import micropip
${cmd}`)
    }

    try {
        await Promise.all(
            modulesRequired.map((module) => {
                return installModule(module).then(
                    () => {
                        StateImplementation.registerImportedPyModules([module])
                        onEvent(new PyModuleLoadedEvent(module))
                    },
                    (error: unknown) => {
                        onEvent(new PyModuleErrorEvent(module))
                        throw error
                    },
                )
            }),
        )
    } catch (error) {
        onEvent(new PyEnvironmentErrorEvent(String(error)))
        throw error
    }

    onEvent(new PyEnvironmentReadyEvent())

    const lock = await pyodide.runPythonAsync(
        'import micropip\nmicropip.freeze()',
    )
    return { pyodide, loadingGraph: lock }
}
