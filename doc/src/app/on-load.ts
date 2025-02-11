import { render, AnyVirtualDOM } from 'rx-vdom'
import { navigation } from './navigation'
import { Router, DefaultLayout } from 'mkdocs-ts'

export const router = new Router({
    navigation,
})

export const logo: AnyVirtualDOM = {
    tag: 'div',
    class: 'd-flex align-items-center',
    children: [
        {
            tag: 'div',
            innerText: '<',
            style: {
                color: 'white',
                fontWeight: 'bolder',
                fontSize: 'x-large',
            },
        },
        {
            tag: 'img',
            class: 'mx-1',
            style: {
                width: '30px',
                height: '30px',
            },
            src: '../assets/logo.svg',
        },
        {
            tag: 'div',
            innerText: '>',
            style: {
                color: 'white',
                fontWeight: 'bolder',
                fontSize: 'x-large',
            },
        },
    ],
}
document.getElementById('content').appendChild(
    render(
        new DefaultLayout.Layout({
            router,
        }),
    ),
)
