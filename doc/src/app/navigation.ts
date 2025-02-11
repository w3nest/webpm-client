import { AppNav, icon, NotebookModule, notebookOptions, url } from './common'

import { navigation as navHowTo } from './how-to'
import { navigation as navTutorial } from './tutorials'
import { apiNav } from './api'

export const navigation: AppNav = {
    name: 'Home',
    header: {
        icon: icon('fa-home'),
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
