import { h, type FunctionComponent, type VNode } from 'preact'
import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { HEADINGS, headingsToc } from './dom.js'
import { titleize } from './markdown-toc.js'
import type { TocHeading, TocOptions } from './types.js'

export type TocProps = TocOptions&{
    class?:string;
}

type TocNode = {
    heading:TocHeading;
    children:TocNode[];
}

/**
 * Render a nested list of links to the headings that come after this
 * component in the document. Headings without an `id` get one. The list
 * updates when the document changes.
 */
export const TOC:FunctionComponent<TocProps> = function TOC (props) {
    const { class:className, children:_children, ...options } = props
    const nav = useRef<HTMLElement>(null)
    const latestOptions = useRef<TocOptions>(options)
    latestOptions.current = options
    const update = useRef<() => void>(() => {})
    const [headings, setHeadings] = useState<TocHeading[]>([])

    useLayoutEffect(() => {
        const el = nav.current
        if (!el) return

        update.current = () => {
            const next = headingsToc(
                headingsAfter(el),
                latestOptions.current
            ).json
            setHeadings(prev => isSame(prev, next) ? prev : next)
        }

        // Watch structure and text only. Adding an `id` is an attribute
        // change, so it does not trigger another update.
        const observer = new MutationObserver(() => update.current())
        observer.observe(el.ownerDocument.body, {
            childList:true,
            subtree:true,
            characterData:true,
        })

        return () => {
            observer.disconnect()
            update.current = () => {}
        }
    }, [])

    // re-check after every render, in case the options changed
    useLayoutEffect(() => update.current())

    return h('nav', {
        ref:nav,
        class:className,
        'aria-label':'Table of contents',
    }, headings.length ? renderList(toTree(headings)) : null)
}

/**
 * Headings that come after `el` in document order.
 */
function headingsAfter (el:Element):Element[] {
    const all = Array.from(el.ownerDocument.querySelectorAll(HEADINGS))
    return all.filter(heading => {
        const position = el.compareDocumentPosition(heading)
        return Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING) &&
            !el.contains(heading)
    })
}

/**
 * Nest each heading under the closest previous heading with a lower
 * level.
 */
function toTree (headings:ReadonlyArray<TocHeading>):TocNode[] {
    const roots:TocNode[] = []
    const stack:TocNode[] = []

    for (const heading of headings) {
        const node:TocNode = { heading, children:[] }
        while (stack.length && stack[stack.length - 1]!.heading.lvl >=
            heading.lvl) {
            stack.pop()
        }
        const parent = stack[stack.length - 1]
        if (parent) parent.children.push(node)
        else roots.push(node)
        stack.push(node)
    }

    return roots
}

function renderList (nodes:ReadonlyArray<TocNode>):VNode {
    return h('ul', null, nodes.map(({ heading, children }) => {
        return h('li', { key:heading.slug },
            h('a', { href:'#' + encodeURIComponent(heading.slug) },
                titleize(heading.content)),
            children.length ? renderList(children) : null
        )
    }))
}

function isSame (
    a:ReadonlyArray<TocHeading>,
    b:ReadonlyArray<TocHeading>,
):boolean {
    return a.length === b.length && a.every((heading, i) => {
        const other = b[i]!
        return heading.slug === other.slug &&
            heading.content === other.content &&
            heading.lvl === other.lvl
    })
}
