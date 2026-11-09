import { test } from '@substrate-system/tapzero'
import { h, render, type FunctionComponent } from 'preact'
import { html } from 'htm/preact'
import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { toc, type TocHeading } from '../src/index.js'
import { TOC } from '../src/preact.js'

function mount ():HTMLElement {
    const el = document.createElement('div')
    document.body.appendChild(el)
    return el
}

function unmount (el:HTMLElement):void {
    render(null, el)
    el.remove()
}

function fixture (markup:string):HTMLElement {
    const el = mount()
    el.innerHTML = markup
    return el
}

async function waitFor (check:() => boolean, ms = 2000):Promise<boolean> {
    const start = Date.now()
    while (!check()) {
        if (Date.now() - start > ms) return false
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    return true
}

function hrefs (el:Element):string[] {
    return Array.from(el.querySelectorAll('a'))
        .map(a => a.getAttribute('href') ?? '')
}

function ids (headings:Element[]):string[] {
    return headings.map(heading => '#' + heading.id)
}

test('toc(element) adds an id to each heading', async t => {
    const el = fixture('<h2>One</h2><h3>Two</h3><h2>Three</h2>')
    const result = toc(el)
    const headings = Array.from(el.querySelectorAll('h2, h3'))

    t.ok(headings.every(heading => heading.id), 'every heading has an id')
    t.deepEqual(
        result.json.map(item => item.slug),
        headings.map(heading => heading.id),
        'json slugs match the heading ids, in document order'
    )
    t.deepEqual(
        result.json.map(item => item.lvl),
        [2, 3, 2],
        'json levels come from the heading tag'
    )
    unmount(el)
})

test('toc(element) only reads headings inside the element', async t => {
    const outside = fixture('<h2>Outside</h2>')
    const el = fixture('<h2>Inside</h2>')
    const result = toc(el)

    t.equal(result.json.length, 1, 'one heading')
    t.equal(outside.querySelector('h2')!.id, '',
        'does not touch headings outside the element')
    unmount(outside)
    unmount(el)
})

test('toc accepts a preact ref', async t => {
    const el = fixture('<h2>One</h2><h2>Two</h2>')
    const result = toc({ current:el })

    t.equal(result.json.length, 2, 'reads headings from ref.current')
    unmount(el)
})

test('toc throws if the ref is empty', async t => {
    try {
        toc({ current:null })
        t.fail('should throw')
    } catch (_err) {
        t.ok(true, 'throws an error')
    }
})

test('toc(element) respects maxdepth', async t => {
    const el = fixture('<h2>A</h2><h3>B</h3><h4>C</h4>')
    const result = toc(el, { maxdepth:3 })

    t.deepEqual(result.json.map(item => item.lvl), [2, 3],
        'leaves out headings deeper than maxdepth')
    t.equal(el.querySelector('h4')!.id, '',
        'does not add an id to an excluded heading')
    unmount(el)
})

test('toc(element) keeps existing heading ids', async t => {
    const el = fixture('<h2 id="custom">One</h2><h2>Two</h2>')
    const result = toc(el)

    t.equal(el.querySelector('h2')!.id, 'custom', 'id is unchanged')
    t.equal(result.json[0]!.slug, 'custom', 'json uses the existing id')
    t.ok(result.content.includes('(#custom)'),
        'markdown content links to the existing id')
    unmount(el)
})

test('toc(element) gives duplicate headings unique ids', async t => {
    const el = fixture('<h2>Same</h2><h2>Same</h2><h2 id="x">X</h2>' +
        '<h2>x</h2>')
    toc(el)
    const all = Array.from(el.querySelectorAll('h2')).map(hd => hd.id)

    t.equal(new Set(all).size, all.length, 'all ids are unique')
    unmount(el)
})

test('toc(element) returns markdown links for every heading', async t => {
    const el = fixture('<h2>One</h2><h3>Two</h3>')
    const result = toc(el)

    t.ok(result.json.every(item => {
        return result.content.includes(`(#${item.slug})`)
    }), 'content links to each slug')
    unmount(el)
})

/**
 * The SPA example from the README.
 */
const SpaExample:FunctionComponent = function () {
    const div = useRef<HTMLDivElement>(null)
    const [tocJson, setTocJson] = useState<TocHeading[]>([])

    useLayoutEffect(() => {
        if (!div.current) return
        setTocJson(toc(div, { maxdepth:3 }).json)
    }, [])

    return html`<div ref=${div} class="example">
        <h2>Contents</h2>
        <ul>
            ${tocJson.map(t => {
                return html`<li><a href="#${t.slug}">${t.content}</a></li>`
            })}
        </ul>
        <h2>Example</h2>
        <h3>Level 3</h3>
        hello
        <h4>Level 4</h4>
    </div>`
}

test('the README SPA example renders working links', async t => {
    const el = mount()
    render(h(SpaExample, null), el)
    const ok = await waitFor(() => el.querySelectorAll('a').length > 0)
    const headings = Array.from(el.querySelectorAll('h2, h3'))

    t.ok(ok, 'renders links')
    t.deepEqual(hrefs(el), ids(headings),
        'each link points at a heading id, h4 left out')
    unmount(el)
})

/**
 * The preact example from the README.
 */
const PreactExample:FunctionComponent = function () {
    return h('main', null,
        h('details', { open:true },
            h('summary', null, h('h2', null, 'Contents')),
            h(TOC, { maxdepth:3 })
        ),
        h('h2', null, 'Hello Table of Contents'),
        h('h3', null, 'more testing'),
        h('h4', null, 'too deep')
    )
}

test('<TOC> links to the headings after it', async t => {
    const el = mount()
    render(h(PreactExample, null), el)
    const ok = await waitFor(() => el.querySelectorAll('a').length > 0)
    const after = Array.from(el.querySelectorAll('main > h2, main > h3'))

    t.ok(ok, 'renders links')
    t.deepEqual(hrefs(el), ids(after),
        'links match the headings after the TOC, h4 left out')
    t.equal(el.querySelector('summary h2')!.id, '',
        'the heading before the TOC is not included')
    unmount(el)
})

test('<TOC> nests links by heading level', async t => {
    const el = mount()
    render(h(PreactExample, null), el)
    await waitFor(() => el.querySelectorAll('a').length > 0)
    const nested = el.querySelector('details li ul a')
    const h3 = el.querySelector('main > h3')!

    t.ok(nested, 'there is a nested list')
    t.equal(nested?.getAttribute('href'), '#' + h3.id,
        'the h3 link is nested under the h2 item')
    unmount(el)
})

test('<TOC> updates when headings are added', async t => {
    const el = mount()
    render(h(PreactExample, null), el)
    await waitFor(() => el.querySelectorAll('a').length > 0)
    const before = el.querySelectorAll('a').length

    const added = document.createElement('h2')
    added.textContent = 'Added later'
    el.querySelector('main')!.appendChild(added)

    const ok = await waitFor(() => {
        return el.querySelectorAll('a').length === before + 1
    })

    t.ok(ok, 'renders a link for the new heading')
    t.ok(hrefs(el).includes('#' + added.id),
        'the new link points at the new heading')
    unmount(el)
})
