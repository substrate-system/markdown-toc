import diacritics from 'diacritics-map'
import Remarkable from 'remarkable'
import type {
    RemarkablePlugin,
    TocHeading,
    TocOptions,
    TocResult,
    TocToken,
} from './types.js'

const TOC_MARKER = /<!--[ \t]*toc[ \t]*-->/
const DEFAULT_BULLETS = ['-', '*', '+']
const CJK_PUNCTUATION = new RegExp(
    '[。？！，、；：“”【】（）' +
    '〔〕［］﹃﹄“ ”‘’﹁﹂—…－～《》〈〉「」]',
)

export function generateToc (
    markdown:string,
    options:Readonly<TocOptions> = {},
):TocResult {
    const renderer = new Remarkable()
        .use(generatePlugin(options))

    return renderer.render(markdown) as TocResult
}

export function generatePlugin (
    options:Readonly<TocOptions> = {},
):RemarkablePlugin {
    const configuredOptions:TocOptions = {
        firsth1:true,
        maxdepth:6,
        ...options,
        linkify:options.linkify ?? true,
    }

    return function registerRenderer (instance):void {
        instance.renderer.render = function renderTokens (
            tokens:Array<TocToken>,
        ):TocResult {
            const tokensWithMetadata = tokens.slice()
            const headings:Array<TocToken> = []
            let tocStart = -1
            let headingIndex = 0

            for (let index = 0; index < tokens.length; index++) {
                const token = tokens[index]

                if (token.content && TOC_MARKER.test(token.content)) {
                    tocStart = token.lines?.[1] ?? tocStart
                }

                if (token.type !== 'heading_open') continue

                const heading = tokensWithMetadata[index + 1]
                if (!heading) continue

                const headingWithMetadata = {
                    ...heading,
                    lvl:token.hLevel ?? 0,
                    i:headingIndex,
                }
                tokensWithMetadata[index + 1] = headingWithMetadata
                headings.push(headingWithMetadata)
                headingIndex++
            }

            const seen:Record<string, number> = {}
            const linkedHeadings:Array<TocToken> = []
            const json:Array<TocHeading> = []

            for (const heading of headings) {
                if (!heading.lines || heading.lines[0] <= tocStart) {
                    continue
                }

                const content = getTitle(heading.content)
                const seenCount = seen[content] ?? 0
                seen[content] = seenCount + 1
                const headingOptions = {
                    ...configuredOptions,
                    num:seenCount,
                }
                const slug = slugify(content, headingOptions)
                const nextHeading:TocToken = {
                    ...heading,
                    content,
                    seen:seenCount,
                    slug,
                }

                json.push({
                    content,
                    slug,
                    lvl:nextHeading.lvl ?? 0,
                    i:nextHeading.i ?? 0,
                    seen:seenCount,
                })
                linkedHeadings.push(
                    configuredOptions.linkify
                        ? linkify(nextHeading, headingOptions)
                        : nextHeading,
                )
            }

            const highest = getHighest(linkedHeadings)
            const headingsForOutput = configuredOptions.firsth1 === false
                ? linkedHeadings.slice(1)
                : linkedHeadings
            const content = renderBullets(headingsForOutput, {
                ...configuredOptions,
                highest,
            }) + (configuredOptions.append ?? '')
            const linkedByIndex:Record<number, TocToken> = {}

            for (const heading of linkedHeadings) {
                if (heading.i !== undefined) {
                    linkedByIndex[heading.i] = heading
                }
            }
            const outputTokens = tokensWithMetadata.map(token => {
                if (token.i === undefined) return token
                return linkedByIndex[token.i] ?? token
            })

            return {
                content,
                highest,
                json,
                tokens:outputTokens,
            }
        }
    }
}

export function renderBullets (
    tokens:ReadonlyArray<TocToken>,
    options:Readonly<TocOptions> = {},
):string {
    const indent = options.indent ?? '  '
    const bullets = getBullets(options)
    const highest = options.highest ?? getHighest(tokens)
    const unindent = options.firsth1 === false ? 1 : 0
    const filter = options.filter
    const result:Array<string> = []

    for (const token of tokens) {
        const level = (token.lvl ?? 0) - unindent
        const adjusted = { ...token, lvl:level }

        if (filter && !filter(adjusted.content, adjusted, tokens)) {
            continue
        }

        if (level > (options.maxdepth ?? 6)) continue

        const relativeLevel = level - highest
        result.push(renderListItem(
            relativeLevel,
            adjusted.content,
            bullets,
            indent,
        ))
    }

    return result.join('\n')
}

export function linkify (
    token:TocToken|null,
    options:Readonly<TocOptions> = {},
):TocToken {
    if (!token || !token.content) return token ?? emptyToken()

    const headingOptions = { ...options, num:token.seen }
    const text = titleize(token.content, headingOptions)
    const slug = encodeURIComponent(slugify(token.content, headingOptions))
    const customLinkify = options.linkify

    if (typeof customLinkify === 'function') {
        return customLinkify(token, text, slug, headingOptions)
    }

    return {
        ...token,
        content:`[${text}](#${slug})`,
    }
}

export function slugify (
    text:string,
    options:Readonly<TocOptions> = {},
):string {
    if (options.slugify === false) return text
    if (typeof options.slugify === 'function') {
        return options.slugify(text, options)
    }

    let slug = getTitle(text)
    slug = stripColor(slug).toLowerCase()
    slug = slug.split(' ').join('-')
    slug = slug.split(/\t/).join('--')

    if (options.stripHeadingTags !== false) {
        slug = slug.split(/<\/?[^>]+>/).join('')
    }

    slug = slug.split(/[|$&`~=\\\u002f@+*!?({[\]})<>=.,;:'"^]/).join('')
    slug = slug.split(CJK_PUNCTUATION).join('')
    slug = replaceDiacritics(slug)

    if (options.num) slug += `-${options.num}`
    return slug
}

export function titleize (
    text:string,
    options:Readonly<TocOptions> = {},
):string {
    if (options.strip) return strip(text, options)
    if (options.titleize === false) return text
    if (typeof options.titleize === 'function') {
        return options.titleize(text, options)
    }

    return getTitle(text)
        .split(/<\/?[^>]+>/).join('')
        .split(/[ \t]+/).join(' ')
        .trim()
}

export function strip (
    text:string,
    options:Readonly<TocOptions> = {},
):string {
    const words = options.strip
    if (!words) return text
    if (typeof words === 'function') return words(text, options)
    if (!words.length) return text

    const expression = new RegExp(words.join('|'), 'g')
    return text.trim().replace(expression, '').replace(/^-|-$/g, '')
}

export function getTitle (text:string):string {
    const match = /^\[[^\]]+\]\(/.test(text)
        ? /^\[([^\]]+)\]/.exec(text)
        : null

    return match?.[1] ?? text
}

export function getHighest (tokens:ReadonlyArray<TocToken>):number {
    if (!tokens.length) return 0

    return tokens.reduce((highest, token) => {
        const level = token.lvl ?? 0
        return level < highest ? level : highest
    }, Number.POSITIVE_INFINITY)
}

function getBullets (options:Readonly<TocOptions>):ReadonlyArray<string> {
    const configured = options.chars ?? options.bullets
    if (typeof configured === 'string') return [configured]
    return configured?.length ? configured : DEFAULT_BULLETS
}

function renderListItem (
    level:number,
    content:string,
    bullets:ReadonlyArray<string>,
    indent:string,
):string {
    const safeLevel = Math.max(0, level)
    const bullet = bullets[safeLevel % bullets.length] ?? '-'
    return `${indent.repeat(safeLevel)}${bullet} ${content}`
}

function replaceDiacritics (text:string):string {
    return text.replace(/[À-ž]/g, character => {
        return diacritics[character] ?? character
    })
}

function stripColor (text:string):string {
    /* eslint-disable-next-line */
    return text.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '')
}

function emptyToken ():TocToken {
    return { type:'', content:'' }
}
