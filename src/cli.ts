#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { stdin, stderr, stdout } from 'node:process'
import { insertMarkdown, toc } from './index.js'
import type { TocOptions } from './types.js'

type CliArgs = TocOptions&{
    readonly _:Array<string>
    readonly i?:boolean
    readonly json?:boolean
}

export async function main ():Promise<void> {
    const args = parseArguments(process.argv.slice(2))

    if (args._.length !== 1) {
        stderr.write(`${usage()}\n`)
        process.exitCode = 1
        return
    }

    if (args.i && args.json) {
        stderr.write('markdown-toc: you cannot use both --json and -i\n')
        process.exitCode = 1
        return
    }

    if (args.i && args._[0] === '-') {
        stderr.write(
            'markdown-toc: you cannot use -i with "-" (stdin) for input\n',
        )
        process.exitCode = 1
        return
    }

    const input = args._[0] === '-'
        ? await readStdin()
        : readFileSync(args._[0] ?? '', 'utf8')

    if (args.i) {
        const path = args._[0] ?? ''
        writeFileSync(path, insertMarkdown(input, args))
        return
    }

    const parsed = toc(input, args)
    if (args.json) {
        stdout.write(`${JSON.stringify(parsed.json, null, 2)}\n`)
    } else {
        stdout.write(parsed.content)
    }
}

function parseArguments (argumentsList:ReadonlyArray<string>):CliArgs {
    const values:{
        _:Array<string>
        i?:boolean
        json?:boolean
        append?:string
        bullets?:Array<string>
        indent?:string
        maxdepth?:number
        firsth1?:boolean
        stripHeadingTags?:boolean
    } = {
        _:[],
        firsth1:true,
        stripHeadingTags:true,
    }

    for (let index = 0; index < argumentsList.length; index++) {
        const argument = argumentsList[index]
        const next = argumentsList[index + 1]

        if (argument === '-i') values.i = true
        else if (argument === '--json') values.json = true
        else if (argument === '--no-firsth1') values.firsth1 = false
        else if (argument === '--no-stripHeadingTags') {
            values.stripHeadingTags = false
        } else if (argument === '--append' && next) {
            values.append = next
            index++
        } else if (argument === '--bullets' && next) {
            values.bullets = [...(values.bullets ?? []), next]
            index++
        } else if (argument === '--indent' && next) {
            values.indent = next
            index++
        } else if (argument === '--maxdepth' && next) {
            values.maxdepth = Number.parseInt(next, 10)
            index++
        } else if (argument === '-') {
            values._.push(argument)
        } else if (argument?.startsWith('-')) {
            continue
        } else if (argument) {
            values._.push(argument)
        }
    }

    return values
}

function readStdin ():Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks:Array<Buffer> = []
        stdin.on('data', chunk => chunks.push(Buffer.from(chunk)))
        stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        stdin.on('error', reject)
    })
}

function usage ():string {
    return [
        'Usage: markdown-toc [options] <input>',
        '',
        '  input:        The Markdown file to parse, or "-" for stdin.',
        '  -i:           Edit the input file and inject the TOC.',
        '  --json:       Print the TOC in JSON format.',
        '  --append:     Append a string to the TOC.',
        '  --bullets:    Set the bullet; may be repeated.',
        '  --maxdepth:   Limit heading depth (default: 6).',
        '  --no-firsth1: Include the first h1 heading.',
        '  --no-stripHeadingTags: Keep HTML tags while slugifying.',
        '  --indent:     Set the indentation string (default: two spaces).',
    ].join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        stderr.write(`${String(error)}\n`)
        process.exitCode = 1
    })
}
