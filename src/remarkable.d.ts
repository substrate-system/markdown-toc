declare module 'remarkable' {
    import type {
        RemarkableInstance,
        RemarkablePlugin,
    } from './types.js'

    export default class Remarkable {
        readonly renderer: RemarkableInstance['renderer']

        constructor(...options: ReadonlyArray<unknown>)

        use(plugin: RemarkablePlugin): this

        render(markdown: string, environment?: unknown): unknown
    }
}
