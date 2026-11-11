#!/usr/bin/env node
/**
 * Static checks for every plugin package in `plugins/`.
 *
 * These are the invariants the repository and the DeepSeek Harness plugin loader rely on:
 * a valid package identity, a bundle patch that inserts the package, `engines.dsh` so the plugin
 * market can report compatibility, host code importing only `node:` builtins, a browser half whose
 * module-loader registration id equals the package name and requires only `react`, matching locale
 * dictionaries, market metadata whose category and labels are declared, and no absolute home paths.
 */
import { spawnSync } from 'node:child_process'
import { access, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import semver from 'semver'
import { ROOT, listPlugins, readJson, readMarketConfig } from './lib/repo.mjs'

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u
const HOME_PATH = /(?:\/Users\/[^/\s'"]+|\/home\/[^/\s'"]+)/u

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

/**
 * The client's inline zh/en dictionaries, which are the actual UI text (the
 * `locale/*.json` files only carry plugin-manager metadata).
 * @returns {{ zh: Map<string, string>, en: Map<string, string>, withoutDictionaries: string } | null}
 */
function inlineDictionaries(source) {
  const zhStart = source.indexOf('const zh = {')
  const enStart = source.indexOf('const en = {')
  if (zhStart === -1 || enStart === -1) return null
  const endOf = (start) => {
    const end = source.indexOf('\n    }\n', start)
    return end === -1 ? -1 : end
  }
  const zhEnd = endOf(zhStart)
  const enEnd = endOf(enStart)
  if (zhEnd === -1 || enEnd === -1) return null
  const entriesOf = (block) => {
    const entries = new Map()
    for (const match of block.matchAll(/^\s*'([^']+)':\s*'((?:[^'\\]|\\.)*)',?/gmu)) entries.set(match[1], match[2])
    return entries
  }
  return {
    zh: entriesOf(source.slice(zhStart, zhEnd)),
    en: entriesOf(source.slice(enStart, enEnd)),
    withoutDictionaries: source.slice(0, zhStart) + source.slice(enEnd),
  }
}

/** Every locale dictionary key, including nested ones, as a dot path. */
function localeKeys(value, prefix = '') {
  const keys = []
  for (const [key, member] of Object.entries(value)) {
    const path = prefix === '' ? key : `${prefix}.${key}`
    keys.push(path)
    if (typeof member === 'object' && member !== null && !Array.isArray(member)) keys.push(...localeKeys(member, path))
  }
  return keys
}

/** Import specifiers of a host module; relative specifiers stay allowed for future multi-file plugins. */
function importSpecifiers(source) {
  const specifiers = []
  for (const match of source.matchAll(/\b(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/gu)) specifiers.push(match[1])
  for (const match of source.matchAll(/\bimport\s*['"]([^'"]+)['"]/gu)) specifiers.push(match[1])
  for (const match of source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu)) specifiers.push(match[1])
  return specifiers
}

async function checkPlugin(plugin, config, report) {
  const { manifest, market, dir, relDir } = plugin

  if (!PACKAGE_NAME.test(manifest.name)) report(`package name ${JSON.stringify(manifest.name)} is not a valid npm package name`)
  if (semver.valid(manifest.version) === null) report(`version ${JSON.stringify(manifest.version)} is not an exact SemVer version`)
  if (manifest.private === true) report('package.json must not be "private": true; plugins are published to npm and installed from there')
  if (manifest.publishConfig?.access !== 'public') {
    report('package.json publishConfig.access must be "public"; scoped packages default to restricted')
  }

  if (typeof manifest.exports?.['.'] !== 'string') report('package.json exports["."] must name the host entry file')

  const patchFile = join(dir, manifest.dsh.bundle.patch)
  if (!(await exists(patchFile))) {
    report(`dsh.bundle.patch ${JSON.stringify(manifest.dsh.bundle.patch)} does not exist`)
  } else {
    const patch = await readFile(patchFile, 'utf8')
    if (!patch.includes(manifest.name)) report(`cordis.patch.yml inserts no row named ${JSON.stringify(manifest.name)}`)
    if (!/^\s*- id:/mu.test(patch)) report('cordis.patch.yml declares no row id')
  }

  const range = manifest.engines?.dsh
  if (typeof range !== 'string' || semver.validRange(range) === null) {
    report('package.json engines.dsh must be a SemVer range; the plugin market reads it to report compatibility')
  }

  const hostFile = join(dir, manifest.exports?.['.'] ?? 'index.js')
  const clientFile = join(dir, 'client.js')
  for (const [label, file] of [['host entry', hostFile], ['client entry', clientFile]]) {
    if (!(await exists(file))) continue
    const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
    if (checked.status !== 0) report(`${label} ${JSON.stringify(file.slice(ROOT.length))} fails to parse: ${checked.stderr.trim()}`)
  }

  if (await exists(hostFile)) {
    const source = await readFile(hostFile, 'utf8')
    const unsupported = importSpecifiers(source).filter(
      (specifier) => !specifier.startsWith('node:') && !specifier.startsWith('./') && !specifier.startsWith('../'),
    )
    if (unsupported.length > 0) {
      report(`host entry imports ${unsupported.join(', ')}; a bundle's host half may import only node: builtins and relative files`)
    }
    const host = await import(pathToFileURL(hostFile).href)
    if (typeof host.name !== 'string' || host.name === '') report('host entry must export a non-empty `name`')
    if (!Array.isArray(host.inject)) report('host entry must export an `inject` array')
    if (typeof host.apply !== 'function') report('host entry must export `apply(ctx, config)`')
  }

  if (await exists(clientFile)) {
    const source = await readFile(clientFile, 'utf8')
    if (!source.includes('window.__ModuleLoader__.load(')) report('client entry must register through window.__ModuleLoader__.load()')
    const id = /\bid:\s*['"]([^'"]+)['"]/u.exec(source)?.[1]
    if (id !== manifest.name) report(`client entry registers module id ${JSON.stringify(id)}, expected the package name ${JSON.stringify(manifest.name)}`)
    const requires = [...source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/gu)].map((match) => match[1])
    const unexpected = requires.filter((specifier) => specifier !== 'react')
    if (unexpected.length > 0) report(`client entry requires ${unexpected.join(', ')}; only 'react' is available from the module loader`)
    if (source.includes('@deepseek-ai/')) report('client entry must not import @deepseek-ai packages; only react is available')

    const inline = inlineDictionaries(source)
    if (inline !== null) {
      const zhKeys = [...inline.zh.keys()]
      const enKeys = [...inline.en.keys()]
      if (zhKeys.length === 0 || enKeys.length === 0) report('client dictionaries must not be empty')
      if (zhKeys.length !== enKeys.length || zhKeys.some((key) => !inline.en.has(key))) {
        report('client zh/en dictionaries must have the same key set')
      }
      const empty = [...inline.zh, ...inline.en].filter(([, value]) => value.trim() === '')
      if (empty.length > 0) report(`client dictionary values must be non-empty: ${empty.map(([key]) => key).join(', ')}`)
      const unreferenced = zhKeys.filter((key) => !inline.withoutDictionaries.includes(`'${key}'`))
      if (unreferenced.length > 0) {
        report(`client dictionary keys are not used outside the dictionaries: ${unreferenced.join(', ')}`)
      }
    }
  }

  const buildScript = join(dir, 'scripts', 'build-client.mjs')
  if (await exists(buildScript)) {
    const checked = spawnSync(process.execPath, [buildScript, '--check'], { cwd: dir, encoding: 'utf8' })
    if (checked.status !== 0) {
      report(`client.js is out of date with src/client: ${checked.stderr.trim()}`)
    }
  }

  const localeDir = join(dir, 'locale')
  if (await exists(localeDir)) {
    const files = (await readdir(localeDir)).filter((name) => name.endsWith('.json')).sort()
    const dictionaries = new Map()
    for (const file of files) dictionaries.set(file, await readJson(join(localeDir, file)))
    if (!dictionaries.has('en.json')) report('locale/en.json is missing')
    if (!dictionaries.has('zh.json')) report('locale/zh.json is missing')
    const reference = localeKeys(dictionaries.get('en.json') ?? {})
    for (const [file, dictionary] of dictionaries) {
      const keys = localeKeys(dictionary)
      const missing = reference.filter((key) => !keys.includes(key))
      const extra = keys.filter((key) => !reference.includes(key))
      if (missing.length > 0) report(`locale/${file} is missing keys: ${missing.join(', ')}`)
      if (extra.length > 0) report(`locale/${file} has keys absent from en.json: ${extra.join(', ')}`)
      for (const key of keys) {
        const value = key.split('.').reduce((node, part) => node?.[part], dictionary)
        if (typeof value === 'object') continue
        if (typeof value !== 'string' || value.trim() === '') report(`locale/${file} key ${key} must be a non-empty string`)
      }
    }
  }

  for (const field of ['title', 'description']) {
    const value = market[field]
    if (typeof value === 'string') continue
    if (typeof value !== 'object' || value === null || typeof value.en !== 'string' || value.en.trim() === '') {
      report(`market.json ${field} must be a string or an object with an "en" string`)
    }
  }
  if (market.category !== undefined && config.categories?.[market.category] === undefined) {
    report(`market.json category ${JSON.stringify(market.category)} is not declared in the root market.json`)
  }
  for (const label of market.labels ?? []) {
    if (config.labels?.[label] === undefined) report(`market.json label ${JSON.stringify(label)} is not declared in the root market.json`)
  }
  for (const keyword of market.keywords ?? []) {
    if (typeof keyword !== 'string' || keyword === '') report('market.json keywords must be non-empty strings')
  }
  if (typeof market.icon !== 'string' || market.icon === '') {
    report('market.json icon must name an icon file relative to the repository root')
  } else if (!(await exists(join(ROOT, market.icon)))) {
    report(`market.json icon ${JSON.stringify(market.icon)} does not exist`)
  }

  for (const file of ['index.js', 'client.js', 'cordis.patch.yml', 'package.json', 'market.json', 'README.md']) {
    const path = join(dir, file)
    if (!(await exists(path))) continue
    const pathMatch = HOME_PATH.exec(await readFile(path, 'utf8'))
    if (pathMatch !== null) report(`${file} contains an absolute home path (${pathMatch[0]}); use a relative or placeholder path`)
  }

  // Optional plugin self-test: pure, synthetic input only, so it also runs in CI.
  const selftestFile = join(dir, 'selftest.mjs')
  if (await exists(selftestFile)) {
    try {
      const module = await import(pathToFileURL(selftestFile).href)
      if (typeof module.run !== 'function') {
        report('selftest.mjs must export `run(report)`')
      } else {
        await module.run((message) => report(`selftest: ${message}`))
      }
    } catch (error) {
      report(`selftest failed to run: ${error.message}`)
    }
  }
}

async function main() {
  const config = await readMarketConfig()
  const plugins = await listPlugins()
  let failed = false
  for (const plugin of plugins) {
    const problems = []
    await checkPlugin(plugin, config, (message) => problems.push(message))
    if (problems.length === 0) {
      console.log(`✓ ${plugin.relDir}: ${plugin.manifest.name}@${plugin.manifest.version}`)
      continue
    }
    failed = true
    console.error(`✗ ${plugin.relDir}: ${plugin.manifest.name}`)
    for (const problem of problems) console.error(`    ${problem}`)
  }
  if (failed) throw new Error('plugin checks failed')
  console.log(`${String(plugins.length)} plugin(s) checked`)
}

main().catch((error) => {
  console.error(`check: ${error.message}`)
  process.exit(1)
})
