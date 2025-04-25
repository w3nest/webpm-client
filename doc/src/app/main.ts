import './style.css'
export {}
import { install, LoadingScreen } from '@w3nest/webpm-client'

import { DebugMode } from './config.debug'

import pkgJson from '../../package.json'
// eslint-disable-next-line @typescript-eslint/dot-notation
window['mkdocsConfig'] = { enableContextual: DebugMode }

const loadingScreen = new LoadingScreen({
    logo: '../assets/favicon.svg',
    name: pkgJson.name,
    description: pkgJson.description,
})

const mkdocsVersion = pkgJson.webpm.dependencies['mkdocs-ts']

await install({
    esm: [`${pkgJson.name}#${pkgJson.version}`],
    css: [
        'bootstrap#^5.3.3~bootstrap.min.css',
        'fontawesome#^5.12.1~css/all.min.css',
        `mkdocs-ts#${mkdocsVersion}~assets/mkdocs-light.css`,
        `mkdocs-ts#${mkdocsVersion}~assets/notebook.css`,
        `mkdocs-ts#${mkdocsVersion}~assets/ts-typedoc.css`,
    ],
    onEvent: (ev) => loadingScreen.next(ev),
})
loadingScreen.done()
await import('./on-load')
