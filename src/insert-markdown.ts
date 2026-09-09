import matter from 'gray-matter'
import { generateToc } from './markdown-toc.js'
import type { TocOptions } from './types.js'

export function insertMarkdown (
    markdown:string,
    options:Readonly<TocOptions> = {},
):string {
    const regex = options.regex ?? /(?:<!-- toc(?:\s*stop)? -->)/g
    const open = typeof options.open === 'string' ?
        options.open :
        '<!-- toc -->\n\n'
    const close = typeof options.close === 'string' ?
        options.close :
        '<!-- tocstop -->'
    const trailingNewlines = /\n+$/.exec(markdown)?.[0] ?? ''
    const hasMatter = /^---/.test(markdown)
    const parsed = hasMatter ? matter(markdown) : null
    const content = parsed?.content ?? markdown
    const sections = content.split(regex).map(section => section.trim())

    if (sections.length > 3) {
        throw new Error(
            'markdown-toc only supports one Table of Contents per file.',
        )
    }

    const updated = sections.slice()
    const last = updated[updated.length - 1] ?? ''
    const generated = options.toc ?? generateToc(last, options).content

    if (updated.length === 3) {
        updated.splice(1, 1, `${open}${generated}`)
        updated.splice(2, 0, close)
    } else if (updated.length === 2) {
        updated.splice(1, 0, `${open}${generated}\n\n${close}`)
    }

    const result = updated.join('\n\n') + trailingNewlines
    return parsed ? matter.stringify(result, parsed.data) : result
}
