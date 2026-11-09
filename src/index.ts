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
import { domToc, type TocTarget } from './dom.js'
import type { TocOptions, TocResult, TocUtils } from './types.js'

export type * from './types.js'
export type { TocTarget }
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
export { renderBullets as bullets }

/**
 * Create a table of contents from a markdown string, or, in a browser,
 * from the headings inside an element (or a ref to an element).
 */
export function toc (
    markdown:string,
    options?:Readonly<TocOptions>,
):TocResult
export function toc (
    target:TocTarget,
    options?:Readonly<TocOptions>,
):TocResult
export function toc (
    source:string|TocTarget,
    options:Readonly<TocOptions> = {},
):TocResult {
    return typeof source === 'string' ?
        generateToc(source, options) :
        domToc(source, options)
}

export const utils:TocUtils = {
    Remarkable,
    getTitle,
    slugify:slugifyHeading,
    strip:stripHeading,
    titleize:titleizeHeading,
}
