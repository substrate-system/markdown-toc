// pattern: Functional Core

import Remarkable from 'remarkable'
import {
    generatePlugin,
    generateToc,
    getHighest,
    getTitle,
    linkify as linkifyHeading,
    renderBullets,
    slugify as slugifyHeading,
    strip as stripHeading,
    titleize as titleizeHeading,
} from './markdown-toc.js'
import { insertMarkdown } from './insert-markdown.js'
import type { TocOptions, TocResult, TocUtils } from './types.js'

export type * from './types.js'
export { Remarkable }
export {
    generatePlugin as plugin,
    generateToc,
    getHighest,
    getTitle,
    insertMarkdown,
    linkifyHeading as linkify,
    renderBullets,
    slugifyHeading as slugify,
    stripHeading as strip,
    titleizeHeading as titleize,
}

export function toc (
    markdown: string,
    options: Readonly<TocOptions> = {},
): TocResult {
    return generateToc(markdown, options)
}

const tocUtils: TocUtils = {
    Remarkable,
    getTitle,
    slugify: slugifyHeading,
    strip: stripHeading,
    titleize: titleizeHeading,
}

export namespace toc {
    export const bullets = renderBullets
    export const insert = insertMarkdown
    export const linkify = linkifyHeading
    export const plugin = generatePlugin
    export const slugify = slugifyHeading
    export const strip = stripHeading
    export const titleize = titleizeHeading
    export const utils = tocUtils
}
