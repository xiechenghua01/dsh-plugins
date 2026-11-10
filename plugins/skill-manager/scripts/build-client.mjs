#!/usr/bin/env node
/**
 * Concatenate `src/client/*.js` into the single browser half `client.js`.
 *
 * The DSH module loader serves one file per plugin and only provides `react`,
 * so the browser half cannot import sibling modules at runtime. Authoring it as
 * ordered fragments keeps several agents able to work in parallel while the
 * shipped artifact stays one file.
 *
 *   node scripts/build-client.mjs [--check]
 *
 * `--check` exits non-zero when the committed client.js differs from the build,
 * which is what CI uses.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLUGIN = resolve(HERE, '..')
const SRC = join(PLUGIN, 'src', 'client')
const OUT = join(PLUGIN, 'client.js')

const PACKAGE_NAME = '@chengze/dsh-skill-manager'
const HEADER = `window.__ModuleLoader__.load({
  id: '${PACKAGE_NAME}',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect
    const useLayoutEffect = React.useLayoutEffect
    const useMemo = React.useMemo
    const useCallback = React.useCallback
    const useRef = React.useRef
    const Fragment = React.Fragment
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
    parts.push(`// ===== ${name} =====\n`)
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
