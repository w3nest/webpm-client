import { AppNav, icon, NotebookModule, notebookOptions, url } from './common'

import { navigation as navHowTo } from './how-to'
import { navigation as navTutorial } from './tutorials'
import { apiNav } from './api'

import { AnyVirtualDOM } from 'rx-vdom'

export const logo: AnyVirtualDOM = {
    tag: 'img',
    style: {
        width: '25px',
        height: '25px',
    },
    src: '../assets/favicon.svg',
}

export const navigation: AppNav = {
    name: 'WebPM',
    header: {
        icon: logo,
    },
    layout: ({ router }) =>
        new NotebookModule.NotebookPage({
            url: url('index.md'),
            router,
            options: notebookOptions,
        }),
    routes: {
        '/how-to': navHowTo,
        '/tutorials': navTutorial,
        '/api': apiNav(),
    },
}
