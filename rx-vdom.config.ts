type AllTags = keyof HTMLElementTagNameMap
export type Configuration = {
    TypeCheck: 'strict'
    SupportedHTMLTags: 'Prod' extends 'Prod' ? AllTags : DevTags
}

type DevTags = 'a' | 'b' | 'blockquote' | 'div'
