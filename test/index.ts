import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from '@substrate-system/tapzero'
import {
    Remarkable,
    toc,
    plugin,
    slugify,
    titleize,
    insertMarkdown as insert
} from '../src/index.js'
import type { TocResult } from '../src/index.js'

function readFixture (path:string):string {
    return readFileSync(path, 'utf8').trim()
}

test('generates a table of contents', async t => {
    const result = toc('# One\n## Two')

    t.equal(result.content,
        '- [One](#one)\n  * [Two](#two)',
        'renders markdown links')
    t.equal(result.highest, 1, 'reports the highest heading level')
    t.equal(result.json[1]?.slug, 'two', 'reports raw heading data')
    t.equal(result.tokens[1]?.lvl, 1, 'annotates heading tokens')
})

test('preserves the plugin API', async t => {
    const result = new Remarkable()
        .use(plugin({ slugify:false }))
        .render('# One') as TocResult

    t.equal(result.content, '- [One](#One)',
        'works as a Remarkable plugin')
    assert.equal(slugify('A heading'), 'a-heading')
    assert.equal(titleize('<em>Title</em>'), 'Title')
})

test('inserts a table of contents', async t => {
    const markdown = '<!-- toc -->\n\n## One\n\n## Two\n'
    const result = insert(markdown)
    const custom = insert(markdown, {
        toc:'- Custom',
        linkify:false,
    })

    t.ok(/- \[One\]\(#one\)/.test(result), 'inserts generated links')
    t.ok(/<!-- tocstop -->/.test(result), 'adds a closing marker')
    t.ok(custom.includes('- Custom'), 'accepts a custom table of contents')
    t.ok(custom.includes('## One'), 'preserves content after the marker')
})

test('supports heading and slug options', async t => {
    t.equal(
        toc('# AAA\n## BBB\n### CCC', { maxdepth:2 }).content,
        '- [AAA](#aaa)\n  * [BBB](#bbb)',
        'limits heading depth',
    )
    t.equal(
        toc('# AAA\n## BBB\n### CCC', { firsth1:false }).content,
        '- [BBB](#bbb)\n  * [CCC](#ccc)',
        'removes the first h1',
    )
    t.equal(
        toc('# <test> Foo </test>').content,
        '- [Foo](#-foo-)',
        'strips heading tags from slugs',
    )
    t.equal(
        toc('# <test> Foo </test>', { stripHeadingTags:false }).content,
        '- [Foo](#test-foo-test)',
        'can preserve heading tags in slugs',
    )
})

test('supports duplicate headings and custom bullets', async t => {
    const duplicate = toc('# AAA\n# BBB\n# BBB\n# CCC')
    const custom = toc('# AAA\n## BBB\n### CCC', { bullets:['?'] })

    t.equal(duplicate.json[2]?.slug, 'bbb-1', 'increments duplicate slugs')
    t.equal(
        custom.content,
        '? [AAA](#aaa)\n  ? [BBB](#bbb)\n    ? [CCC](#ccc)',
        'rotates a single custom bullet',
    )
})

test('supports custom slug and title functions', async t => {
    const custom = toc('# Some Article', {
        slugify:text => `!${text.replace(/[^\w]/g, '-')}!`,
    })
    const stripped = toc('# foo AAA', {
        slugify:false,
        strip:text => `~${text.slice(4)}~`,
    })

    t.equal(custom.content, '- [Some Article](#!Some-Article!)',
        'uses a custom slugifier')
    t.equal(stripped.content, '- [~AAA~](#foo%20AAA)',
        'uses a custom title stripper')
})

test('matches the existing fixture output', async t => {
    const levels = readFixture('test/fixtures/levels.md')
    const fenced = readFixture('test/fixtures/fenced-code-blocks.md')
    const nested = [
        '- [AAA](#aaa)',
        '  * [a.1](#a1)',
        '    + [a.2](#a2)',
        '      - [a.3](#a3)',
    ].join('\n')

    t.equal(
        toc(levels).content,
        nested,
        'renders nested levels',
    )
    t.equal(
        toc(fenced).content,
        [
            nested,
            '- [BBB](#bbb)',
            '- [CCC](#ccc)',
            '- [DDD](#ddd)',
            '- [EEE](#eee)',
            '  * [FFF](#fff)',
        ].join('\n'),
        'ignores fenced headings',
    )
    t.equal(
        toc(readFixture('test/fixtures/repeated-headings.md')).content,
        readFixture('test/expected/repeated-headings.md'),
        'handles repeated headings',
    )
})

test('preserves front matter while inserting', async t => {
    const markdown = readFileSync('test/fixtures/insert.md', 'utf8')
    const expected = readFileSync('test/expected/insert.md', 'utf8')

    assert.equal(insert(markdown).trim(), expected.trim())
    t.ok(insert(markdown).startsWith('---'),
        'keeps the front-matter block')
})
