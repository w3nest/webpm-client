require('./style.css')
export {}
import * as webpmClient from '@w3nest/webpm-client'

import { setup } from '../auto-generated'

await setup.installMainModule({
    cdnClient: webpmClient,
    installParameters: {
        css: [
            'bootstrap#4.4.1~bootstrap.min.css',
            'fontawesome#5.12.1~css/all.min.css',
            `mkdocs-ts#${setup.runTimeDependencies.externals['mkdocs-ts']}~assets/mkdocs-light.css`,
            `mkdocs-ts#${setup.runTimeDependencies.externals['mkdocs-ts']}~assets/notebook.css`,
        ],
        displayLoadingScreen: true,
    },
})

await import('./on-load')
