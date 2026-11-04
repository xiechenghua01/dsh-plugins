/**
 * Reading the repository's market configuration and its plugin packages.
 *
 * The market declaration (`market.json` at the repository root) is the source of truth for the
 * index title, its categories and labels, and the Git address the index points installs at.
 * Each `plugins/<slug>/` directory is one installable DSH bundle with its own display metadata
 * (`market.json`) next to the package manifest.
 */
import { spawnSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Repository root, resolved from this file's location. */
export const ROOT = fileURLToPath(new URL('../../', import.meta.url))
/** Directory holding one subdirectory per plugin package. */
export const PLUGINS_DIR = join(ROOT, 'plugins')

/** Read and parse one JSON file, naming it in read and parse errors. */
export async function readJson(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    throw new Error(`cannot read ${file}: ${error.message}`)
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`invalid JSON in ${file}: ${error.message}`)
  }
}

/** Read the root market declaration. */
export async function readMarketConfig() {
  const config = await readJson(join(ROOT, 'market.json'))
  for (const field of ['repository', 'indexUrl', 'branch', 'author']) {
    if (typeof config[field] !== 'string' || config[field] === '') {
      throw new Error(`market.json: "${field}" must be a non-empty string`)
    }
  }
  for (const field of ['repository', 'indexUrl']) {
    if (!config[field].startsWith('https://')) {
      throw new Error(`market.json: "${field}" must be an https URL`)
    }
  }
  return config
}

/**
 * List every plugin package, sorted by directory name.
 * @returns {Promise<Array<{ slug: string, dir: string, relDir: string, manifest: object, market: object }>>}
 */
export async function listPlugins() {
  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true })
  const plugins = []
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const dir = join(PLUGINS_DIR, entry.name)
    const manifest = await readJson(join(dir, 'package.json'))
    const market = await readJson(join(dir, 'market.json'))
    if (typeof manifest.name !== 'string' || manifest.name === '') {
      throw new Error(`${entry.name}/package.json: missing package name`)
    }
    if (manifest.dsh?.bundle?.patch === undefined) {
      throw new Error(`${entry.name}/package.json: missing dsh.bundle.patch; a plugin must be an installable bundle`)
    }
    plugins.push({ slug: entry.name, dir, relDir: `plugins/${entry.name}`, manifest, market })
  }
  if (plugins.length === 0) throw new Error('no plugin package found under plugins/')
  return plugins
}

/** The Git install source of one plugin at one commit. */
export function pluginSource(config, plugin, commit) {
  return { type: 'git', url: config.repository, commit, path: plugin.relDir }
}

/** Run one command synchronously and return its trimmed stdout; throws with stderr on failure. */
export function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.error !== undefined) {
    if (allowFailure) return undefined
    throw new Error(`${command} ${args.join(' ')}: ${result.error.message}`)
  }
  if (result.status !== 0) {
    if (allowFailure) return undefined
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`)
  }
  return result.stdout.trim()
}

/** The current HEAD commit of the repository. */
export function gitHead() {
  const head = run('git', ['rev-parse', 'HEAD'])
  if (!/^[0-9a-f]{40}$/u.test(head)) throw new Error(`git rev-parse HEAD returned "${head}"`)
  return head
}

/** Whether the working tree has no uncommitted change. */
export function gitClean() {
  return run('git', ['status', '--porcelain']) === ''
}

/** Whether one commit exists in this repository. */
export function hasCommit(commit) {
  return run('git', ['cat-file', '-e', `${commit}^{commit}`], { allowFailure: true }) !== undefined
}
