import { VirtualDOM, child$, ChildrenLike, attr$ } from 'rx-vdom'
import { AssetsGateway, onHTTPErrors } from '@w3nest/http-clients'
import { Observable, Subject, switchMap, BehaviorSubject } from 'rxjs'

export class SearchInput implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'd-flex w-100 justify-content-center my-auto align-items-center'
    public readonly children: ChildrenLike

    constructor(item$: Subject<string>) {
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center p-2 w-100 fv-text-primary',
                style: {
                    backgroundColor: '#f2f2f2',
                },
                children: [
                    {
                        tag: 'div',
                        class: 'fas fa-search fv-text-background',
                    },
                    {
                        tag: 'input',
                        type: 'text',
                        value: attr$({
                            source$: item$,
                            vdomMap: (text) => text,
                        }),
                        style: {
                            background: 'none',
                            fontFamily:
                                "'Fira Mono', 'Andale Mono', 'Consolas', monospace",
                            fontSize: '16px',
                            letterSpacing: '0px',
                            border: 'none',
                            outline: 'unset',
                            height: '25px',
                            paddingLeft: '10px',
                            borderRadius: '0',
                        },
                        class: 'flex-grow-1',
                        placeholder: 'Search packages',
                        onchange: (ev: MouseEvent) => {
                            const target = ev.target as HTMLInputElement
                            item$.next(target.value)
                        },
                    },
                ],
            },
        ]
    }
}

export class SearchView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'w-100 flex-grow-1 d-flex flex-column fv-text-primary fv-bg-background'
    public readonly style = {
        minHeight: '0px',
        fontFamily: 'Lexend, sans-serif',
    }
    public readonly children: ChildrenLike

    constructor() {
        const item$ = new BehaviorSubject<string>('@w3nest/webpm-client')
        this.children = [new SearchInput(item$), new ResultsView(item$)]
    }
}

function isUnauthorized(resp: unknown): boolean {
    interface T {
        status: number
    }
    return (resp as T).status === 403
}
function isNotFound(resp: unknown): boolean {
    interface T {
        status: number
    }
    return (resp as T).status === 404
}
export class ResultsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 flex-grow-1 overflow-auto'

    public readonly children: ChildrenLike

    constructor(items$: Observable<string>) {
        const client = new AssetsGateway.Client()
        this.children = [
            child$({
                source$: items$.pipe(
                    switchMap((item) =>
                        client.webpm.getLibraryInfo$({
                            libraryId: window.btoa(item),
                        }),
                    ),
                    onHTTPErrors((error) => error),
                ),
                vdomMap: (resp) => {
                    if (isNotFound(resp)) {
                        return new NotFoundView()
                    }

                    if (isUnauthorized(resp)) {
                        return new UnauthorizedView()
                    }
                    if ('versions' in resp) {
                        return new PackageView(resp.versions)
                    }
                    return { tag: 'div' }
                },
            }),
        ]
    }
}

export class UnauthorizedView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly children: ChildrenLike
    public readonly class =
        'mkdocs-bg-warning mkdocs-text-warning rounded my-1 p-2'
    constructor() {
        this.children = [
            {
                tag: 'div',
                innerText: `The requested package exists in the database but is currently part of a private group.
Access to this package is restricted, and it may require specific permissions to use.`,
            },
        ]
    }
}

export class NotFoundView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly children: ChildrenLike
    public readonly class = 'mkdocs-bg-hint rounded my-1 p-2'
    constructor() {
        this.children = [
            {
                tag: 'div',
                innerText: `The requested package was not found in the database. `,
            },
        ]
    }
}
export class PackageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'mkdocs-bg-success rounded my-1 p-2'
    public readonly children: ChildrenLike

    constructor(versions: string[]) {
        this.children = [
            {
                tag: 'div',
                innerText:
                    'The package is found in the database, the following releases are available:',
            },
            {
                tag: 'ul',
                children: versions
                    .filter((v) => !v.endsWith('-wip'))
                    .map((v) => ({ tag: 'li', innerText: v })),
            },
        ]
    }
}
