import { renderBullets, slugify, titleize } from './markdown-toc.js'
import type {
    TocHeading,
    TocOptions,
    TocResult,
    TocToken,
} from './types.js'

/**
 * Something we can read headings from: an element, a document, or a
 * ref object like the one returned by preact's `useRef`.
 */
export type TocTarget = ParentNode|{ readonly current:ParentNode|null }

export const HEADINGS = 'h1, h2, h3, h4, h5, h6'

/**
 * Create a table of contents from the headings inside `target`.
 * Headings without an `id` get one, so the generated links work.
 */
export function domToc (
    target:TocTarget,
    options:Readonly<TocOptions> = {},
):TocResult {
    const root = resolveTarget(target)
    return headingsToc(Array.from(root.querySelectorAll(HEADINGS)), options)
}

/**
 * Create a table of contents from a list of heading elements.
 */
export function headingsToc (
    elements:ReadonlyArray<Element>,
    options:Readonly<TocOptions> = {},
):TocResult {
    const maxdepth = options.maxdepth ?? 6
    const headings = elements.filter(el => headingLevel(el) <= maxdepth)
    const used = new Set(headings.map(el => el.id).filter(Boolean))
    const seen:Record<string, number> = {}
    const json:Array<TocHeading> = []
    const tokens:Array<TocToken> = []

    headings.forEach((el, i) => {
        const content = (el.textContent ?? '').trim()
        const seenCount = seen[content] ?? 0
        seen[content] = seenCount + 1

        if (!el.id) {
            el.id = uniqueSlug(content, seenCount, used, options)
            used.add(el.id)
        }

        const slug = el.id
        const lvl = headingLevel(el)
        const text = titleize(content, options)
        json.push({ content, slug, lvl, i, seen:seenCount })
        tokens.push({
            type:'inline',
            content:`[${text}](#${encodeURIComponent(slug)})`,
            lvl,
            i,
            seen:seenCount,
            slug,
        })
    })

    const highest = tokens.reduce((min, token) => {
        return Math.min(min, token.lvl ?? 0)
    }, tokens.length ? Number.POSITIVE_INFINITY : 0)
    const content = renderBullets(
        options.firsth1 === false ? tokens.slice(1) : tokens,
        { ...options, highest }
    ) + (options.append ?? '')

    return { content, highest, json, tokens }
}

/**
 * Get the heading level from the tag name, `h3` -> 3.
 */
export function headingLevel (el:Element):number {
    return Number(el.tagName.slice(1))
}

function resolveTarget (target:TocTarget):ParentNode {
    if ('current' in target) {
        if (!target.current) {
            throw new TypeError('toc: the ref has no element yet')
        }
        return target.current
    }
    return target
}

/**
 * Slugify the heading text, then bump the number suffix until the slug
 * does not collide with an id that is already in use.
 */
function uniqueSlug (
    content:string,
    seenCount:number,
    used:ReadonlySet<string>,
    options:Readonly<TocOptions>,
):string {
    let num = seenCount
    let slug = slugify(content, { ...options, num })
    while (used.has(slug)) {
        num++
        const next = slugify(content, { ...options, num })
        // a custom slugify, or `slugify:false`, may ignore `num`
        if (next === slug) break
        slug = next
    }
    return slug
}
