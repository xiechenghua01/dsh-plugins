#!/usr/bin/env node
/**
 * Concatenate `src/client/*.js` into the single browser half `client.js`.
 *
 * The DSH module loader serves one file per plugin and only provides `react`,
 * so the browser half cannot import sibling modules at runtime. Authoring it as
 * ordered fragments keeps each source file small while the shipped artifact
 * stays one file.
 *
 *   node scripts/build-client.mjs [--check]
 *
 * `--check` exits non-zero when the committed client.js differs from the build.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLUGIN = resolve(HERE, '..')
const SRC = join(PLUGIN, 'src', 'client')
const OUT = join(PLUGIN, 'client.js')

const HEADER = `// MCP manager — browser half for DeepSeek Harness 0.2.x.
//
// One Settings section (\`设置 → MCP 服务\`) owns every MCP server row of the current profile.
// The page talks to the host over the same-origin route \`mcp-manager/api\` (relative URL, POST,
// \`{ op, args }\` envelope). All rows are written to the current profile layer; the list shows
// every row the host returns, including rows that already live in the home layer.
// Visible strings go through the client locale service; colors use \`--dsw-*\` tokens only.

window.__ModuleLoader__.load({
  id: '@chengze/dsh-mcp-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const Fragment = React.Fragment
    const useCallback = React.useCallback
    const useEffect = React.useEffect
    const useLayoutEffect = React.useLayoutEffect
    const useRef = React.useRef
    const useState = React.useState

`

const FOOTER = `  },
})
`

async function build() {
  const names = (await readdir(SRC)).filter((name) => name.endsWith('.js')).sort()
  if (names.length === 0) throw new Error(`no fragments in ${SRC}`)
  const parts = [HEADER]
  for (const name of names) {
    const body = await readFile(join(SRC, name), 'utf8')
    // Match real module syntax only: `import x`, `import {`, `import(`, `export x`,
    // `export {`, `export default`. Object keys such as `import: [...]` are legal.
    const moduleSyntax = /^\s*(?:import\s+[\w{*'"]|import\s*\(|export\s+[\w{*'"]|export\s*\{|export\s+default)/m
    if (moduleSyntax.test(body)) {
      throw new Error(`${name}: fragments must not use import/export; they share the factory scope`)
    }
    parts.push(body.endsWith('\n') ? body : `${body}\n`)
  }
  parts.push(FOOTER)
  return { names, source: parts.join('') }
}

const { names, source } = await build()
const check = process.argv.includes('--check')
const current = await readFile(OUT, 'utf8').catch(() => '')

if (check) {
  if (current !== source) {
    console.error(`client.js is out of date with src/client (${names.join(', ')}); run node scripts/build-client.mjs`)
    process.exit(1)
  }
  console.log(`client.js matches ${String(names.length)} fragment(s)`)
} else {
  await writeFile(OUT, source)
  console.log(`client.js <- ${String(names.length)} fragment(s): ${names.join(', ')}`)
}
