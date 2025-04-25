import { render, VirtualDOM, ChildrenLike } from 'rx-vdom'
import { navigation } from './navigation'
import { Router, DefaultLayout, MdWidgets } from 'mkdocs-ts'
import { createRootContext, inMemReporter } from './common'
import { BehaviorSubject } from 'rxjs'
import { AuthBadge } from '@w3nest/ui-tk/Badges'

const ctx = createRootContext({
    threadName: 'App',
    labels: [],
})

console.log('In memory logs reporter', inMemReporter)

export const router = new Router({
    navigation,
})

const bookmarks$ = new BehaviorSubject(['/', '/how-to', '/tutorials', '/api'])

export const companionNodes$ = new BehaviorSubject([])

const pageVertPadding = '3rem'

export class NavHeaderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center justify-content-center'
    public readonly children: ChildrenLike
    public readonly style = {
        height: pageVertPadding,
    }

    constructor() {
        this.children = [
            {
                tag: 'a',
                class: 'mx-2',
                href: 'https://github.com/w3nest/webpm-client',
                children: [
                    {
                        ...MdWidgets.githubIcon,
                        style: {
                            filter: 'invert(1)',
                        },
                    },
                ],
            },
            {
                tag: 'a',
                class: 'mx-2',
                href: 'https://www.npmjs.com/package/@w3nest/webpm-client',
                children: [MdWidgets.npmIcon],
            },
            {
                tag: 'a',
                class: 'mx-2',
                href: 'https://github.com/w3nest/webpm-client/blob/main/LICENSE',
                children: [MdWidgets.mitIcon],
            },
        ]
    }
}

const app = new DefaultLayout.LayoutWithCompanion(
    {
        router,
        bookmarks$,
        displayOptions: {
            pageVertPadding: '3rem',
        },
        sideNavHeader: () => new NavHeaderView(),
        sideNavFooter: () =>
            new DefaultLayout.FooterView({
                sourceName: '@webpm-client/doc',
                sourceUrl:
                    'https://github.com/w3nest/webpm-client/tree/main/doc',
            }),
        companionNodes$,
        favoritesFooter: new AuthBadge(),
    },
    ctx,
)

document.body.appendChild(render(app))
