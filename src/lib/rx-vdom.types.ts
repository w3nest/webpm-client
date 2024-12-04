// Below is minimal mock-up of required rx-vdom types.

export type ChildrenLike = unknown
export interface VirtualDOM<_T> {
    tag: _T
    children?: ChildrenLike
    class?: string
}
export interface RxVDom {
    render: (vdom: VirtualDOM<unknown>) => HTMLElement
}
