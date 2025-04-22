import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import pkgJson from '../../../package.json'
import { imageTopics } from './common.view'
import { Dependencies } from '.'

/**
 * Display the current run time with installed components.
 */
export class RuntimeView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor() {
        this.children = [
            {
                tag: 'div',
                class: 'w-100 text-center',
                style: { fontSize: 'larger', fontWeight: 'bolder' },
                innerText: `${pkgJson.name}#${pkgJson.version}`,
            },
            new EsmView(),
        ]
    }
}

class EsmView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor() {
        if (!Dependencies.webpm) {
            return
        }
        const sep = { tag: 'div' as const, class: 'mx-2' }

        const versionView = (v: string): AnyVirtualDOM => {
            return {
                tag: 'div',
                class: 'd-flex align-items-center px-1 border rounded',
                style: {
                    fontSize: 'medium',
                },
                children: [
                    {
                        tag: 'i',
                        class: 'fas fa-bookmark',
                        style: { transform: 'scale(0.5)' },
                    },
                    {
                        tag: 'div',
                        innerText: v,
                    },
                ],
            }
        }
        this.children = Array.from(
            Dependencies.webpm.StateImplementation.esModules.entries(),
        ).map(([k, versions]) => {
            return {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'img',
                        src: imageTopics.ESM,
                        width: 25,
                    },
                    sep,
                    {
                        tag: 'div',
                        innerText: k,
                        style: {
                            fontWeight: 'bolder',
                        },
                    },
                    sep,
                    {
                        tag: 'div',
                        class: 'd-flex align-items-center',
                        children: versions.map((v) => versionView(v.version)),
                    },
                ],
            }
        })
    }
}
