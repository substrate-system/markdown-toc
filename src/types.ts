export type SlugifyFn = (text: string, options: Readonly<TocOptions>) => string

export type TitleizeFn = (
    text: string,
    options: Readonly<TocOptions>,
) => string

export type StripFn = (text: string, options: Readonly<TocOptions>) => string

export type FilterFn = (
    text: string,
    token: TocToken,
    tokens: ReadonlyArray<TocToken>,
) => boolean

export type LinkifyFn = (
    token: TocToken,
    text: string,
    slug: string,
    options: Readonly<TocOptions>,
) => TocToken

export type TocOptions = {
    readonly append?: string
    readonly bullets?: string | ReadonlyArray<string>
    readonly chars?: string | ReadonlyArray<string>
    readonly close?: string
    readonly filter?: FilterFn
    readonly firsth1?: boolean
    readonly indent?: string
    readonly linkify?: boolean | LinkifyFn
    readonly maxdepth?: number
    readonly num?: number
    readonly open?: string
    readonly regex?: RegExp
    readonly slugify?: false | SlugifyFn
    readonly strip?: ReadonlyArray<string> | StripFn
    readonly stripHeadingTags?: boolean
    readonly titleize?: false | TitleizeFn
    readonly toc?: string
    readonly highest?: number
}

export type TocToken = {
    readonly type: string
    readonly content: string
    readonly hLevel?: number
    readonly lines?: ReadonlyArray<number> | null
    readonly children?: ReadonlyArray<TocToken> | null
    readonly lvl?: number
    readonly i?: number
    readonly seen?: number
    readonly slug?: string
}

export type TocHeading = {
    readonly content: string
    readonly slug: string
    readonly lvl: number
    readonly i: number
    readonly seen: number
}

export type TocResult = {
    readonly content: string
    readonly highest: number
    readonly json: Array<TocHeading>
    readonly tokens: Array<TocToken>
}

export type RemarkableRenderer = {
    render: (
        tokens: Array<TocToken>,
        options?: unknown,
        environment?: unknown,
    ) => unknown
}

export type RemarkableInstance = {
    renderer: RemarkableRenderer
    use: (plugin: RemarkablePlugin) => RemarkableInstance
    render: (markdown: string, environment?: unknown) => unknown
}

export type RemarkablePlugin = (instance: RemarkableInstance) => void

export type RemarkableConstructor = new (
    ...options: ReadonlyArray<unknown>
) => RemarkableInstance

export type TocUtils = {
    readonly Remarkable: RemarkableConstructor
    readonly getTitle: (text: string) => string
    readonly slugify: SlugifyFn
    readonly strip: (
        text: string,
        options?: Readonly<TocOptions>,
    ) => string
    readonly titleize: (
        text: string,
        options?: Readonly<TocOptions>,
    ) => string
}
