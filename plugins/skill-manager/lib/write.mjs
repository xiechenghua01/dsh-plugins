/**
 * Local skill file operations.
 *
 * The writer is the only code that creates, edits, disables, deletes or imports files in a
 * skill scan root. Everything it touches must resolve inside one of the writable locations
 * from the fixed location table (`project-dsh`, `project-agents`, `custom`, `user-dsh`,
 * `user-agents`); read-only locations (`preset`, `bundled`) are refused.
 *
 * Safety rules:
 *   - `path.resolve` + prefix check against the real root;
 *   - no symbolic links anywhere below the root (a link could escape the root);
 *   - frontmatter is validated before any write, using the same rules as the DSH provider;
 *   - directory writes go through `<root>/.skill-manager-tmp/<name>-<rand>/` and a rename,
 *     so a failure never leaves a half-written skill behind.
 *
 * Pure Node module: imports only `node:` builtins and `./state.mjs`.
 */

import { randomBytes } from 'node:crypto'
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  unlink,
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { homedir } from 'node:os'

import { expandHome, resolveDshHome, skillError } from './state.mjs'
import { parseSkillFile, validateFrontmatter as validateSkillFrontmatter } from './frontmatter.mjs'

/** Locations that accept writes. */
export const WRITABLE_LOCATIONS = Object.freeze([
  'project-dsh',
  'project-agents',
  'custom',
  'user-dsh',
  'user-agents',
])

/** Locations that are always read-only (bundled / preset package content). */
export const READONLY_LOCATIONS = Object.freeze(['preset', 'bundled'])

/** Import limits (spec §8.3). */
export const MAX_IMPORT_FILES = 200
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024
export const MAX_SKILL_MD_BYTES = 256 * 1024

const RESERVED_SEGMENTS = new Set([
  '.disabled',
  '.skill-manager',
  '.skill-manager-tmp',
  '.git',
  'node_modules',
])

const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function ensureErrorCode(error, fallback = 'E_INTERNAL') {
  if (error !== null && typeof error === 'object' && typeof error.code === 'string' && error.code.startsWith('E_')) {
    return error
  }
  const wrapped = skillError(fallback, error !== null && typeof error === 'object' && error.message ? error.message : String(error))
  if (error !== null && typeof error === 'object') wrapped.cause = error
  return wrapped
}

function guarded(operation) {
  return async (...args) => {
    try {
      return await operation(...args)
    } catch (error) {
      throw ensureErrorCode(error)
    }
  }
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** True when `target` is strictly below `base`. */
export function isInside(base, target) {
  const from = resolve(base)
  const to = resolve(target)
  if (from === to) return false
  const rel = relative(from, to)
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

/**
 * Validate an index-style relative skill path (spec §8.1).
 * @param {unknown} value
 * @returns {string}
 */
export function assertSkillPath(value) {
  const path = String(value ?? '')
  if (path.length < 1 || path.length > 200) {
    throw skillError('E_BAD_REQUEST', 'File path must be 1–200 characters')
  }
  if (path.startsWith('/') || path.endsWith('/') || path.includes('\\') || path.includes(':')) {
    throw skillError('E_BAD_REQUEST', `Invalid file path: ${path}`)
  }
  const segments = path.split('/')
  if (segments.some((segment) => segment === '')) {
    throw skillError('E_BAD_REQUEST', `Invalid file path: ${path}`)
  }
  for (const segment of segments) {
    if (!/^[A-Za-z0-9_@+-][A-Za-z0-9._@+-]*$/.test(segment)) {
      throw skillError('E_BAD_REQUEST', `Invalid file path segment: ${segment}`)
    }
    if (RESERVED_SEGMENTS.has(segment)) {
      throw skillError('E_BAD_REQUEST', `Reserved file path segment: ${segment}`)
    }
  }
  return path
}

/**
 * Validate a skill name (kebab-case, ≤64 characters).
 * @param {unknown} value
 * @returns {string}
 */
export function assertSkillName(value) {
  const name = String(value ?? '').trim()
  if (name.length < 1 || name.length > 64 || !SKILL_NAME_PATTERN.test(name)) {
    throw skillError('E_NAME_INVALID', 'Skill name must be kebab-case (a-z, 0-9, -), 1–64 characters')
  }
  return name
}

/** Resolve a relative POSIX path below `base`; refuses escapes. */
export function safeJoin(base, rel) {
  const target = resolve(base, ...String(rel).split('/'))
  if (!isInside(base, target)) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `Path escapes its root: ${rel}`)
  }
  return target
}

/**
 * Resolve one location from the roots table. Accepts:
 *   - a function `(location) => info | string`
 *   - a Map
 *   - an array of `{ id | location | key, path | absPath | root | dir, writable, readonly }`
 *   - a plain object keyed by location, or `{ locations: [...] | { id: info } }`
 * @param {unknown} roots
 * @param {string} location
 * @returns {null | { id: string, path: string, writable: boolean, readonly: boolean }}
 */
export function resolveRootInfo(roots, location) {
  const id = String(location ?? '')
  if (id === '') return null
  let value
  try {
    if (typeof roots === 'function') value = roots(id)
    else if (roots instanceof Map) value = roots.get(id)
    else if (Array.isArray(roots)) {
      value = roots.find((entry) => entry && (entry.id === id || entry.location === id || entry.key === id))
    } else if (roots !== null && typeof roots === 'object') {
      if (Array.isArray(roots.locations)) {
        value = roots.locations.find((entry) => entry && (entry.id === id || entry.location === id || entry.key === id))
      } else if (roots.locations !== null && typeof roots.locations === 'object') {
        value = roots.locations[id]
      } else {
        value = roots[id]
      }
    }
  } catch {
    value = undefined
  }
  if (value === undefined || value === null) return null
  return normalizeRootInfo(value, id)
}

function normalizeRootInfo(value, id) {
  if (typeof value === 'string') {
    return {
      id,
      path: resolve(expandHome(value)),
      writable: !READONLY_LOCATIONS.includes(id),
      readonly: READONLY_LOCATIONS.includes(id),
    }
  }
  if (value === null || typeof value !== 'object') return null
  const rawPath = value.path ?? value.absPath ?? value.root ?? value.dir
  if (typeof rawPath !== 'string' || rawPath.trim() === '') return null
  const readonly = value.readonly === true || value.readOnly === true || value.writable === false
    || READONLY_LOCATIONS.includes(id)
  return {
    ...value,
    id: typeof value.id === 'string' && value.id !== '' ? value.id : id,
    path: resolve(expandHome(rawPath)),
    writable: !readonly,
    readonly,
  }
}

/** All roots in the table, de-duplicated by id. */
export function listRootInfos(roots) {
  const ids = new Set([...WRITABLE_LOCATIONS, ...READONLY_LOCATIONS])
  if (Array.isArray(roots)) {
    for (const entry of roots) {
      const id = entry?.id ?? entry?.location ?? entry?.key
      if (typeof id === 'string' && id !== '') ids.add(id)
    }
  } else if (roots !== null && typeof roots === 'object' && !(roots instanceof Map) && typeof roots !== 'function') {
    if (Array.isArray(roots.locations)) {
      for (const entry of roots.locations) {
        const id = entry?.id ?? entry?.location ?? entry?.key
        if (typeof id === 'string' && id !== '') ids.add(id)
      }
    } else if (roots.locations !== null && typeof roots.locations === 'object') {
      for (const id of Object.keys(roots.locations)) ids.add(id)
    } else {
      for (const id of Object.keys(roots)) ids.add(id)
    }
  }
  const infos = []
  for (const id of ids) {
    const info = resolveRootInfo(roots, id)
    if (info !== null) infos.push(info)
  }
  return infos
}

/**
 * Default roots derived from the environment. `custom` is deliberately absent: its
 * directories come from preset configuration, which the caller supplies.
 */
export function defaultSkillRoots() {
  const dshHome = resolveDshHome()
  const agentsHome = typeof process.env.DSH_AGENTS_HOME === 'string' && process.env.DSH_AGENTS_HOME.trim() !== ''
    ? process.env.DSH_AGENTS_HOME.trim()
    : join(homedir(), '.agents')
  const cwd = process.cwd()
  return {
    'project-dsh': join(cwd, '.dsh', 'skills'),
    'project-agents': join(cwd, '.agents', 'skills'),
    'user-dsh': join(dshHome, 'skills'),
    'user-agents': join(expandHome(agentsHome), 'skills'),
  }
}

async function realRoot(root) {
  try {
    return await realpath(root)
  } catch {
    return resolve(root)
  }
}

async function pathExists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return false
    throw error
  }
}

async function lstatOrNull(path) {
  try {
    return await lstat(path)
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return null
    throw error
  }
}

async function assertNoSymlinkBelow(base, target) {
  const rel = relative(base, target)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return
  let current = base
  for (const segment of rel.split(sep)) {
    current = join(current, segment)
    const info = await lstatOrNull(current)
    if (info === null) continue
    if (info.isSymbolicLink()) {
      throw skillError('E_PATH_OUTSIDE_ROOT', `Path contains a symbolic link: ${current}`)
    }
  }
}

async function ensureDirectory(path) {
  const info = await lstatOrNull(path)
  if (info === null) {
    await mkdir(path, { recursive: true })
    return
  }
  if (info.isSymbolicLink()) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `Directory is a symbolic link: ${path}`)
  }
  if (!info.isDirectory()) {
    throw skillError('E_BAD_REQUEST', `Not a directory: ${path}`)
  }
}

async function resolveWritableLocation(roots, location) {
  const id = String(location ?? '')
  if (READONLY_LOCATIONS.includes(id)) {
    throw skillError('E_READONLY_LOCATION', `Location "${id}" is read-only`)
  }
  if (!WRITABLE_LOCATIONS.includes(id)) {
    throw skillError('E_BAD_REQUEST', `Unknown skill location: ${id}`)
  }
  const info = resolveRootInfo(roots, id)
  if (info === null) throw skillError('E_BAD_REQUEST', `Skill location is not configured: ${id}`)
  if (info.readonly || info.writable === false) {
    throw skillError('E_READONLY_LOCATION', `Location "${id}" is read-only`)
  }
  try {
    await mkdir(info.path, { recursive: true })
  } catch (error) {
    throw skillError('E_BAD_REQUEST', `Cannot create skill root: ${info.path}`, { cause: error })
  }
  // A root itself may be a symlink (users relocate roots); resolve it so every operation
  // below uses the real directory. Links *below* the root are still refused.
  const root = await realRoot(info.path)
  return { info, root }
}

/**
 * Resolve an absolute path to its containing writable root, refusing symlink escapes.
 * @returns {Promise<{ info: object, root: string, declaredRoot: string, target: string, rel: string }>}
 */
async function resolvePathInRoots(roots, target, { writable = true } = {}) {
  const declared = resolve(String(target ?? ''))
  const matches = []
  for (const info of listRootInfos(roots)) {
    if (writable && (info.readonly || info.writable === false)) continue
    // Compare against both the declared root and its real path: callers may pass a path
    // produced by us (already realpath'd) or the configured display path.
    const base = await realRoot(info.path)
    if (isInside(info.path, declared)) {
      matches.push({ info, base, rel: relative(info.path, declared) })
    } else if (isInside(base, declared)) {
      matches.push({ info, base, rel: relative(base, declared) })
    }
  }
  if (matches.length === 0) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `Path is outside the known skill roots: ${declared}`)
  }
  matches.sort((left, right) => right.base.length - left.base.length)
  const match = matches[0]
  const realTarget = join(match.base, match.rel)
  await assertNoSymlinkBelow(match.base, realTarget)
  return { info: match.info, root: match.base, declaredRoot: match.info.path, target: realTarget, rel: match.rel }
}

function classifySkillTarget(rel) {
  const parts = rel.split(sep)
  if (parts.length === 1) {
    const fileName = parts[0]
    if (fileName.endsWith('.md')) {
      return { disabled: false, flat: true, fileName, name: fileName.slice(0, -3) }
    }
    return { disabled: false, flat: false, fileName, name: fileName }
  }
  if (parts.length === 2 && parts[0] === '.disabled') {
    const fileName = parts[1]
    if (fileName.endsWith('.md')) {
      return { disabled: true, flat: true, fileName, name: fileName.slice(0, -3) }
    }
    return { disabled: true, flat: false, fileName, name: fileName }
  }
  return null
}

async function resolveSkillTarget(roots, path) {
  const resolved = await resolvePathInRoots(roots, path, { writable: true })
  const classification = classifySkillTarget(resolved.rel)
  if (classification === null) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `Not a skill path: ${resolved.target}`)
  }
  assertSkillName(classification.name)
  return { ...resolved, ...classification }
}

async function resolveSkillFile(roots, path) {
  const resolved = await resolvePathInRoots(roots, path, { writable: true })
  const parts = resolved.rel.split(sep)
  let name
  let flat
  if (parts.length === 2 && parts[1] === 'SKILL.md') {
    name = parts[0]
    flat = false
  } else if (parts.length === 1 && parts[0].endsWith('.md')) {
    name = parts[0].slice(0, -3)
    flat = true
  } else {
    throw skillError('E_PATH_OUTSIDE_ROOT', `Not a skill file: ${resolved.target}`)
  }
  assertSkillName(name)
  return { ...resolved, name, flat, dir: flat ? resolved.root : dirname(resolved.target) }
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

/**
 * Parse a `SKILL.md` document into frontmatter data and body.
 *
 * Delegates to `./frontmatter.mjs`, the single source of truth shared with `/validate`, the
 * scanner and the installer. Syntax errors (bad indentation, a line without `key: value`,
 * a non-mapping document, ...) fail the whole parse instead of being skipped.
 *
 * @param {unknown} text
 * @returns {{ data: object, body: string }}
 */
export function parseFrontmatter(text) {
  const parsed = parseSkillFile(String(text ?? ''))
  if (!parsed.ok) {
    throw skillError('E_FRONTMATTER', parsed.error ?? 'invalid YAML frontmatter')
  }
  return { data: parsed.frontmatter, body: parsed.body }
}

/**
 * Validate provider-compatible frontmatter.
 *
 * Delegates to `./frontmatter.mjs` so the writer accepts exactly what the DSH provider (and
 * `/validate`) accepts: strict booleans, no legacy keys, string-only description.
 *
 * @param {object} data
 * @returns {{ name: string, description: string, whenToUse?: string }}
 */
export function validateFrontmatter(data) {
  const checked = validateSkillFrontmatter(data)
  if (!checked.ok) {
    throw skillError('E_FRONTMATTER', checked.error ?? 'invalid YAML frontmatter')
  }
  const frontmatter = checked.frontmatter
  return {
    name: frontmatter.name,
    description: frontmatter.description.trim(),
    whenToUse: frontmatter.whenToUse,
  }
}

function yamlValue(value) {
  return JSON.stringify(String(value))
}

/**
 * Serialize a generated SKILL.md.
 * @param {{ name: string, description: string, whenToUse?: string, body: string }} fields
 */
export function serializeSkillMarkdown(fields) {
  const lines = ['---', `name: ${yamlValue(fields.name)}`, `description: ${yamlValue(fields.description)}`]
  if (fields.whenToUse !== undefined && fields.whenToUse !== '') {
    lines.push(`whenToUse: ${yamlValue(fields.whenToUse)}`)
  }
  lines.push('---', '')
  let body = String(fields.body ?? '').replace(/^\n+/, '')
  if (!body.endsWith('\n')) body += '\n'
  return `${lines.join('\n')}${body}`
}

// ---------------------------------------------------------------------------
// Atomic file writes
// ---------------------------------------------------------------------------

async function writeFileAtomic(file, content, mode = 0o644) {
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`
  let handle = null
  try {
    handle = await open(temporary, 'wx', mode)
    await handle.writeFile(content, 'utf8')
    await handle.sync().catch(() => {})
    await handle.close()
    handle = null
    await rename(temporary, file)
  } finally {
    if (handle !== null) await handle.close().catch(() => {})
    await rm(temporary, { force: true }).catch(() => {})
  }
}

async function writeDirectoryAtomic(root, name, files, { skillMdContent } = {}) {
  const target = join(root, name)
  if (await pathExists(target)) throw skillError('E_NAME_TAKEN', `A skill named "${name}" already exists here`)
  if (await pathExists(`${target}.md`)) throw skillError('E_NAME_TAKEN', `A skill named "${name}" already exists here`)
  const temporary = join(root, '.skill-manager-tmp', `${name}-${randomBytes(6).toString('hex')}`)
  // `.skill-manager-tmp` must be a real directory: a pre-existing symlink would redirect
  // the temporary write outside the root.
  await ensureDirectory(join(root, '.skill-manager-tmp'))
  await mkdir(temporary)
  let committed = false
  try {
    if (skillMdContent !== undefined) {
      await writeFileAtomic(join(temporary, 'SKILL.md'), skillMdContent)
    }
    for (const file of files ?? []) {
      const destination = safeJoin(temporary, file.rel)
      await mkdir(dirname(destination), { recursive: true })
      await copyFile(file.abs, destination)
    }
    await rename(temporary, target)
    committed = true
    return target
  } finally {
    if (!committed) await rm(temporary, { recursive: true, force: true }).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

/**
 * Create the local skill writer.
 *
 * @param {object} [options]
 * @param {object} [options.state] state store (reserved for record cleanup)
 * @param {unknown} [options.roots] fixed location table; defaults to `defaultSkillRoots()`
 */
export function createWriter(options = {}) {
  const roots = options.roots === undefined || options.roots === null ? defaultSkillRoots() : options.roots

  async function create({ location, name, description, whenToUse, body } = {}) {
    const skillName = assertSkillName(name)
    const summary = String(description ?? '').trim()
    if (summary === '') throw skillError('E_FRONTMATTER', 'Description is required')
    if (summary.length > 500) throw skillError('E_BAD_REQUEST', 'Description must be at most 500 characters')
    const when = whenToUse === undefined || whenToUse === null ? undefined : String(whenToUse).trim()
    if (when !== undefined && when.length > 200) {
      throw skillError('E_BAD_REQUEST', 'whenToUse must be at most 200 characters')
    }
    const content = String(body ?? '').trim()
    if (content === '') throw skillError('E_BAD_REQUEST', 'Body is required')

    const { info, root } = await resolveWritableLocation(roots, location)
    const markdown = serializeSkillMarkdown({ name: skillName, description: summary, whenToUse: when, body: content })
    // Validate the generated document with the same parser the installer uses.
    validateFrontmatter(parseFrontmatter(markdown).data)
    const target = await writeDirectoryAtomic(root, skillName, [], { skillMdContent: markdown })
    return {
      location: info.id,
      name: skillName,
      description: summary,
      whenToUse: when,
      path: join(target, 'SKILL.md'),
    }
  }

  async function update({ path, mtime, content } = {}) {
    const resolved = await resolveSkillFile(roots, path)
    if (resolved.info.readonly || resolved.info.writable === false) {
      throw skillError('E_READONLY_LOCATION', `Location "${resolved.info.id}" is read-only`)
    }
    const before = await stat(resolved.target).catch((error) => {
      if (error !== null && typeof error === 'object' && error.code === 'ENOENT') {
        throw skillError('E_NOT_FOUND', 'Skill file not found')
      }
      throw error
    })
    if (!before.isFile()) throw skillError('E_BAD_REQUEST', 'Skill path is not a regular file')
    if (mtime === undefined || mtime === null) throw skillError('E_BAD_REQUEST', 'mtime is required')
    const currentMtime = Math.floor(before.mtimeMs / 1000)
    if (Math.floor(Number(mtime)) !== currentMtime) {
      throw skillError('E_CONFLICT_MTIME', 'The file was modified outside the manager; reload and retry')
    }
    const text = String(content ?? '')
    const { data } = parseFrontmatter(text)
    const fields = validateFrontmatter(data)
    if (fields.name !== resolved.name) {
      throw skillError('E_FRONTMATTER', `Frontmatter name must match the skill directory name "${resolved.name}"`)
    }
    await writeFileAtomic(resolved.target, text.endsWith('\n') ? text : `${text}\n`)
    const after = await stat(resolved.target)
    return {
      path: resolved.target,
      mtime: Math.floor(after.mtimeMs / 1000),
      name: fields.name,
      location: resolved.info.id,
      description: fields.description,
      whenToUse: fields.whenToUse,
      size: after.size,
    }
  }

  async function setEnabled({ path, enabled } = {}) {
    if (typeof enabled !== 'boolean') throw skillError('E_BAD_REQUEST', 'enabled must be a boolean')
    const resolved = await resolveSkillTarget(roots, path)
    if (resolved.info.readonly || resolved.info.writable === false) {
      throw skillError('E_READONLY_LOCATION', `Location "${resolved.info.id}" is read-only`)
    }
    const info = await lstatOrNull(resolved.target)
    if (info === null) throw skillError('E_NOT_FOUND', 'Skill not found')
    if (info.isSymbolicLink()) throw skillError('E_PATH_OUTSIDE_ROOT', 'Skill path is a symbolic link')
    const disabledRoot = join(resolved.root, '.disabled')

    const identity = { name: resolved.name, location: resolved.info.id }
    if (resolved.disabled) {
      if (!enabled) return { ...identity, path: resolved.target, enabled: false }
      const target = join(resolved.root, resolved.fileName)
      if (await pathExists(target)) throw skillError('E_NAME_TAKEN', `A skill named "${resolved.name}" is already active`)
      await rename(resolved.target, target)
      return { ...identity, path: target, enabled: true, previousPath: resolved.target }
    }

    if (enabled) return { ...identity, path: resolved.target, enabled: true }
    await ensureDirectory(disabledRoot)
    const target = join(disabledRoot, resolved.fileName)
    if (await pathExists(target)) throw skillError('E_NAME_TAKEN', `A disabled copy of "${resolved.name}" already exists`)
    await rename(resolved.target, target)
    return { ...identity, path: target, enabled: false, previousPath: resolved.target }
  }

  async function remove({ path } = {}) {
    const resolved = await resolveSkillTarget(roots, path)
    if (resolved.info.readonly || resolved.info.writable === false) {
      throw skillError('E_READONLY_LOCATION', `Location "${resolved.info.id}" is read-only`)
    }
    const info = await lstatOrNull(resolved.target)
    if (info === null) throw skillError('E_NOT_FOUND', 'Skill not found')
    if (info.isSymbolicLink()) throw skillError('E_PATH_OUTSIDE_ROOT', 'Skill path is a symbolic link')
    if (info.isDirectory()) await rm(resolved.target, { recursive: true, force: true })
    else await unlink(resolved.target)
    return { removed: true, path: resolved.target }
  }

  async function importPaste({ location, content } = {}) {
    const text = String(content ?? '')
    const { data } = parseFrontmatter(text)
    const fields = validateFrontmatter(data)
    const { info, root } = await resolveWritableLocation(roots, location)
    const target = await writeDirectoryAtomic(root, fields.name, [], {
      skillMdContent: text.endsWith('\n') ? text : `${text}\n`,
    })
    return {
      name: fields.name,
      location: info.id,
      path: join(target, 'SKILL.md'),
      skill: {
        location: info.id,
        name: fields.name,
        description: fields.description,
        whenToUse: fields.whenToUse,
        path: join(target, 'SKILL.md'),
      },
      files: 1,
    }
  }

  async function importDirectory({ location, dirPath } = {}) {
    const source = resolve(String(dirPath ?? ''))
    const sourceStat = await stat(source).catch((error) => {
      if (error !== null && typeof error === 'object' && error.code === 'ENOENT') {
        throw skillError('E_NOT_FOUND', 'Import directory not found')
      }
      throw error
    })
    if (!sourceStat.isDirectory()) throw skillError('E_BAD_REQUEST', 'Import path is not a directory')
    const realSource = await realpath(source)

    const files = []
    let totalBytes = 0
    async function walk(directory, prefix) {
      const entries = await readdir(directory, { withFileTypes: true })
      entries.sort((left, right) => left.name.localeCompare(right.name))
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const absolute = join(directory, entry.name)
        const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
        if (entry.isSymbolicLink()) {
          throw skillError('E_PATH_OUTSIDE_ROOT', `Symbolic links cannot be imported: ${rel}`)
        }
        if (entry.isDirectory()) {
          await walk(absolute, rel)
          continue
        }
        if (!entry.isFile()) continue
        const info = await stat(absolute)
        if (files.length + 1 > MAX_IMPORT_FILES) {
          throw skillError('E_TOO_LARGE', `Import contains more than ${MAX_IMPORT_FILES} files`)
        }
        totalBytes += info.size
        if (totalBytes > MAX_IMPORT_BYTES) {
          throw skillError('E_TOO_LARGE', 'Import is larger than 20 MiB')
        }
        files.push({ abs: absolute, rel, size: info.size })
      }
    }
    await walk(realSource, '')

    const skillMd = files.find((file) => file.rel === 'SKILL.md')
    if (skillMd === undefined) {
      throw skillError('E_FRONTMATTER', 'SKILL.md is required at the root of the imported directory')
    }
    if (skillMd.size > MAX_SKILL_MD_BYTES) {
      throw skillError('E_TOO_LARGE', 'SKILL.md is larger than 256 KiB')
    }
    const markdown = await readFile(skillMd.abs, 'utf8')
    const fields = validateFrontmatter(parseFrontmatter(markdown).data)

    const { info, root } = await resolveWritableLocation(roots, location)
    const target = await writeDirectoryAtomic(root, fields.name, files)
    return {
      name: fields.name,
      location: info.id,
      path: join(target, 'SKILL.md'),
      skill: {
        location: info.id,
        name: fields.name,
        description: fields.description,
        whenToUse: fields.whenToUse,
        path: join(target, 'SKILL.md'),
      },
      files: files.length,
    }
  }

  async function importSkill({ mode, location, content, dirPath } = {}) {
    if (mode === 'paste') return importPaste({ location, content })
    if (mode === 'dir') return importDirectory({ location, dirPath })
    throw skillError('E_BAD_REQUEST', 'Import mode must be "paste" or "dir"')
  }

  return {
    create: guarded(create),
    update: guarded(update),
    setEnabled: guarded(setEnabled),
    remove: guarded(remove),
    importSkill: guarded(importSkill),
  }
}
