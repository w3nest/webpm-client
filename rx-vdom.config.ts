type AllTags = keyof HTMLElementTagNameMap
export type Configuration = {
    TypeCheck: 'strict'
    SupportedHTMLTags: 'Dev' extends 'Prod' ? AllTags : DevTags
}

type DevTags = 'img' | 'div' | 'i' | 'button'
