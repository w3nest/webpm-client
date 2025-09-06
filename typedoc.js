/* eslint-env node -- eslint-comment add exception because the running context is node environment */
module.exports = {
    // The order below is intentional, it is related to symbols being re-exported.
    entryPoints: [
        './src/lib/workers-pool/index.ts', 
        './src/index.ts',
        './src/lib/views/index.ts', 
    ],
    exclude: ['src/tests'],
    readme: './assets/indexAPIdoc.md',
    out: 'tooling/typedoc-html',
    theme: 'default',
    categorizeByGroup: false,
}
