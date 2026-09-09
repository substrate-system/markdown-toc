declare module 'gray-matter' {
    type MatterFile = {
        readonly content: string
        readonly data: Record<string, unknown>
    }

    type Matter = {
        (input: string): MatterFile
        stringify(
            input: string,
            data: Readonly<Record<string, unknown>>,
        ): string
    }

    const matter: Matter

    export default matter
}
