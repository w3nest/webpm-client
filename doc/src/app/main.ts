import './style.css'
export {}
import * as webpmClient from '@w3nest/webpm-client'

import { DebugMode } from './config.debug'

import pkgJson from '../../package.json'
// eslint-disable-next-line @typescript-eslint/dot-notation
window['mkdocsConfig'] = { enableContextual: DebugMode }

const mkdocsVersion = pkgJson.dependencies['mkdocs-ts']

await webpmClient.install({
    esm: [`${pkgJson.name}#${pkgJson.version}`],
    css: [
        'bootstrap#^5.3.3~bootstrap.min.css',
        'fontawesome#^5.12.1~css/all.min.css',
        `mkdocs-ts#${mkdocsVersion}~assets/mkdocs-light.css`,
        `mkdocs-ts#${mkdocsVersion}~assets/notebook.css`,
        `mkdocs-ts#${mkdocsVersion}~assets/ts-typedoc.css`,
    ],
    displayLoadingScreen: true,
})

await import('./on-load')
