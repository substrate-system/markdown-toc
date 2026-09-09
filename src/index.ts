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
export { renderBullets as bullets }

export function toc (
    markdown:string,
    options:Readonly<TocOptions> = {},
):TocResult {
    return generateToc(markdown, options)
}

export const utils:TocUtils = {
    Remarkable,
    getTitle,
    slugify:slugifyHeading,
    strip:stripHeading,
    titleize:titleizeHeading,
}
