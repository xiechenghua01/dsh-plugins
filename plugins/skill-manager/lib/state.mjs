/**
 * Skill Manager state store.
 *
 * Persists the market source list and the market install records in
 * `$DSH_HOME/skills-manager/state.json` (profile-level, never inside a skill scan root).
 *
 * Invariants:
 *   - one writer at a time inside this process (a Promise chain);
 *   - every write is atomic (`state.json.tmp-*` → fsync → rename);
 *   - the previous good document is copied to `state.json.bak` before each write;
 *   - a corrupt document is moved aside (`state.corrupt-<ts>.json`) and the backup is
 *     used when it still parses;
 *   - reads and writes return deep clones, so callers cannot mutate the cache by accident.
 *
 * The module is pure Node: no Cordis context, no top-level I/O.
 */

import { randomBytes } from 'node:crypto'
import { chmod, copyFile, mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'

/** Document version written to `state.json`. */
export const STATE_VERSION = 1

/** Directory name under the DSH home. */
export const STATE_DIR_NAME = 'skills-manager'

/** Error codes used by this plugin (contract §4). */
export const ERROR_CODES = Object.freeze([
  'E_UNAUTHORIZED',
  'E_PATH_OUTSIDE_ROOT',
  'E_READONLY_LOCATION',
  'E_NAME_TAKEN',
  'E_FRONTMATTER',
  'E_NAME_INVALID',
  'E_NAME_MISMATCH',
  'E_NOT_FOUND',
  'E_CONFLICT_MTIME',
  'E_SOURCE_UNREACHABLE',
  'E_SOURCE_SCHEMA',
  'E_CHECKSUM',
  'E_NOT_ENOUGH_SPACE',
  'E_CANCELED',
  'E_TOO_LARGE',
  'E_BAD_REQUEST',
  'E_INTERNAL',
])

/**
 * Build an Error carrying a stable `code` (and any extra fields).
 * @param {string} code
 * @param {string} [message]
 * @param {object} [extra]
 * @returns {Error & { code: string }}
 */
export function skillError(code, message, extra = {}) {
  const error = new Error(message || code)
  error.name = 'SkillManagerError'
  error.code = code
  if (extra !== null && typeof extra === 'object') {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) error[key] = value
    }
  }
  return error
}

/** Ensure every failure leaving this module carries an `E_*` code. */
function ensureErrorCode(error, fallback = 'E_INTERNAL') {
  if (error !== null && typeof error === 'object' && typeof error.code === 'string' && error.code.startsWith('E_')) {
    return error
  }
  const wrapped = skillError(fallback, error !== null && typeof error === 'object' && error.message ? error.message : String(error))
  if (error !== null && typeof error === 'object') wrapped.cause = error
  return wrapped
}

/** The OS home directory, or `''` when the platform cannot provide one. */
function osHome() {
  try {
    return homedir()
  } catch {
    return ''
  }
}

/**
 * Expand a leading `~` (or `~/`) against the given home directory.
 * @param {string} value
 * @param {string} [home]
 * @returns {string}
 */
export function expandHome(value, home = osHome()) {
  const input = String(value ?? '')
  if (input === '~') return home
  if (input.startsWith('~/') || input.startsWith('~\\')) {
    return home === '' ? input.slice(2) : join(home, input.slice(2))
  }
  return input
}

/**
 * Abbreviate an absolute path under the OS home as `~/...` for display.
 * Paths outside the home directory are returned unchanged.
 * @param {string} value
 * @param {string} [home]
 * @returns {string}
 */
export function abbreviateHome(value, home = osHome()) {
  const input = String(value ?? '')
  if (input === '') return ''
  if (home === '') return input
  const base = resolve(home)
  const target = resolve(input)
  if (target === base) return '~'
  if (target.startsWith(base + sep)) {
    return `~/${target.slice(base.length + 1).split(sep).join('/')}`
  }
  return input
}

/**
 * Resolve the DSH home: explicit argument → `$DSH_HOME` → `~/.dsh`.
 * @param {string} [home]
 * @returns {string}
 */
export function resolveDshHome(home) {
  const explicit = typeof home === 'string' && home.trim() !== '' ? home.trim() : ''
  const env = typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME.trim() !== '' ? process.env.DSH_HOME.trim() : ''
  const raw = explicit || env || join(osHome(), '.dsh')
  return resolve(expandHome(raw))
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function toSeconds(value, fallback = 0) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return fallback
  return Math.floor(number)
}

function asString(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeSource(value) {
  if (!isObject(value)) return null
  const url = asString(value.url)
  if (url === '') return null
  return {
    id: asString(value.id),
    url,
    name: asString(value.name),
    enabled: value.enabled !== false,
    addedAt: toSeconds(value.addedAt),
    lastCheckedAt: toSeconds(value.lastCheckedAt),
    lastError: typeof value.lastError === 'string' && value.lastError !== '' ? value.lastError : null,
  }
}

function normalizeFiles(value) {
  if (!Array.isArray(value)) return []
  const files = []
  for (const file of value) {
    if (!isObject(file)) continue
    const path = asString(file.path)
    const sha256 = asString(file.sha256).toLowerCase()
    const size = Number(file.size)
    if (path === '' || sha256 === '' || !Number.isFinite(size)) continue
    files.push({ path, sha256, size: Math.max(0, Math.floor(size)) })
  }
  return files
}

function normalizeInstall(value) {
  if (!isObject(value)) return null
  const name = asString(value.name)
  const location = asString(value.location)
  if (name === '' || location === '') return null
  return {
    location,
    rootPath: asString(value.rootPath),
    name,
    version: asString(value.version),
    sourceId: asString(value.sourceId),
    sourceName: asString(value.sourceName),
    sourceUrl: asString(value.sourceUrl),
    commit: asString(value.commit),
    files: normalizeFiles(value.files),
    installedAt: toSeconds(value.installedAt),
    localModified: value.localModified === true,
  }
}

/**
 * Coerce an arbitrary document into the current state shape.
 * Unknown fields are dropped; duplicate sources/records keep the last entry.
 * @param {unknown} value
 * @returns {{ version: number, sources: object[], installed: object[] }}
 */
export function normalizeState(value) {
  const document = isObject(value) ? value : {}
  const sources = []
  const sourceIds = new Map()
  if (Array.isArray(document.sources)) {
    for (const entry of document.sources) {
      const source = normalizeSource(entry)
      if (source === null) continue
      if (source.id === '') source.id = `src_${randomBytes(4).toString('hex')}`
      if (sourceIds.has(source.id)) sources[sourceIds.get(source.id)] = source
      else {
        sourceIds.set(source.id, sources.length)
        sources.push(source)
      }
    }
  }
  const installed = []
  const installKeys = new Map()
  if (Array.isArray(document.installed)) {
    for (const entry of document.installed) {
      const record = normalizeInstall(entry)
      if (record === null) continue
      const key = `${record.location}\u0000${record.name}`
      if (installKeys.has(key)) installed[installKeys.get(key)] = record
      else {
        installKeys.set(key, installed.length)
        installed.push(record)
      }
    }
  }
  return { version: STATE_VERSION, sources, installed }
}

/** An empty state document. */
export function emptyState() {
  return { version: STATE_VERSION, sources: [], installed: [] }
}

/**
 * Normalize a URL used as a market source. Rejects non-http(s), credentials and fragments.
 * @param {unknown} value
 * @returns {string} canonical href
 */
export function validateSourceUrl(value) {
  let url
  try {
    url = new URL(String(value ?? ''))
  } catch {
    throw skillError('E_BAD_REQUEST', 'Invalid source URL')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw skillError('E_BAD_REQUEST', 'Source URL must use http(s)')
  }
  if (url.username !== '' || url.password !== '') {
    throw skillError('E_BAD_REQUEST', 'Source URL must not contain credentials')
  }
  if (url.hash !== '') {
    throw skillError('E_BAD_REQUEST', 'Source URL must not contain a fragment')
  }
  return url.href
}

function sourceUrlKey(value) {
  try {
    return new URL(String(value)).href
  } catch {
    return String(value)
  }
}

/**
 * Create the state store.
 *
 * @param {object} [options]
 * @param {string} [options.home] DSH home (the directory that contains `profiles/`).
 * @param {string} [options.dir] explicit state directory (tests).
 * @param {() => number} [options.now] clock returning ms (or seconds); defaults to `Date.now`.
 */
export function createState(options = {}) {
  const dshHome = resolveDshHome(options.home)
  const stateDir = typeof options.dir === 'string' && options.dir !== ''
    ? resolve(expandHome(options.dir))
    : join(dshHome, STATE_DIR_NAME)
  const file = join(stateDir, 'state.json')
  const backupFile = `${file}.bak`
  const backupsDir = join(stateDir, 'backups')
  const tmpDir = join(stateDir, 'tmp')
  const clock = typeof options.now === 'function' ? options.now : Date.now

  function currentSeconds() {
    const value = Number(clock())
    if (!Number.isFinite(value)) return Math.floor(Date.now() / 1000)
    return Math.floor(value > 1e11 ? value / 1000 : value)
  }

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  async function readDocument(path) {
    let text
    try {
      text = await readFile(path, 'utf8')
    } catch (error) {
      if (error !== null && typeof error === 'object' && error.code === 'ENOENT') {
        return { missing: true }
      }
      throw error
    }
    try {
      const parsed = JSON.parse(text)
      if (!isObject(parsed)) throw new Error('state document is not an object')
      return { state: normalizeState(parsed) }
    } catch (error) {
      return { corrupt: true, error }
    }
  }

  async function quarantineCorrupt() {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '')
    let destination = join(stateDir, `state.corrupt-${stamp}.json`)
    for (let index = 1; index < 100; index += 1) {
      try {
        await rename(file, destination)
        return destination
      } catch (error) {
        if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return null
        if (error !== null && typeof error === 'object' && error.code === 'EEXIST') {
          destination = join(stateDir, `state.corrupt-${stamp}-${index}.json`)
          continue
        }
        // Renaming failed for a reason other than an existing target: leave the file in place.
        return null
      }
    }
    return null
  }

  async function persist(state) {
    await mkdir(stateDir, { recursive: true, mode: 0o700 })
    // Keep the previous good document. A missing file is fine (first write).
    try {
      await copyFile(file, backupFile)
      await chmod(backupFile, 0o600).catch(() => {})
    } catch (error) {
      if (!(error !== null && typeof error === 'object' && error.code === 'ENOENT')) throw error
    }
    const temporary = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`
    const payload = `${JSON.stringify(state, null, 2)}\n`
    let handle = null
    try {
      handle = await open(temporary, 'w', 0o600)
      await handle.writeFile(payload, 'utf8')
      await handle.sync().catch(() => {})
      await handle.close()
      handle = null
      await rename(temporary, file)
      await chmod(file, 0o600).catch(() => {})
    } finally {
      if (handle !== null) await handle.close().catch(() => {})
      await rm(temporary, { force: true }).catch(() => {})
    }
  }

  async function loadState() {
    const primary = await readDocument(file)
    if (primary.state !== undefined) return primary.state
    if (primary.missing) return emptyState()
    // Corrupt: move the broken document aside, then try the backup.
    await quarantineCorrupt()
    const backup = await readDocument(backupFile)
    if (backup.state !== undefined) {
      // Restore the backup as the live document so later reads are consistent.
      await persist(backup.state)
      return backup.state
    }
    return emptyState()
  }

  // -----------------------------------------------------------------------
  // Single write queue
  // -----------------------------------------------------------------------

  let queue = Promise.resolve()

  function enqueue(task) {
    const run = queue.then(task, task).catch((error) => {
      throw ensureErrorCode(error)
    })
    queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  async function read() {
    return enqueue(async () => clone(await loadState()))
  }

  /**
   * Read-modify-write under the single-writer queue.
   * The mutator receives a draft clone; it may mutate it or return a full state document.
   * @param {(state: object) => (object | void | Promise<object | void>)} mutator
   * @returns {Promise<object>} the persisted state
   */
  async function write(mutator) {
    if (typeof mutator !== 'function') throw skillError('E_INTERNAL', 'state.write requires a function')
    return enqueue(async () => {
      const current = await loadState()
      const draft = clone(current)
      const returned = await mutator(draft)
      const candidate = isObject(returned) && Array.isArray(returned.sources) && Array.isArray(returned.installed)
        ? returned
        : draft
      const next = normalizeState(candidate)
      await persist(next)
      return clone(next)
    })
  }

  /**
   * Add a market source.
   * @param {{ url: string, name?: string, enabled?: boolean, id?: string } | string} input
   */
  async function addSource(input) {
    const payload = typeof input === 'string' ? { url: input } : (isObject(input) ? input : {})
    let created = null
    await write((state) => {
      const url = validateSourceUrl(payload.url)
      const key = sourceUrlKey(url)
      if (state.sources.some((source) => sourceUrlKey(source.url) === key)) {
        throw skillError('E_BAD_REQUEST', 'This source URL is already configured')
      }
      const used = new Set(state.sources.map((source) => source.id))
      let id = asString(payload.id)
      while (id === '' || used.has(id)) id = `src_${randomBytes(4).toString('hex')}`
      created = {
        id,
        url,
        name: asString(payload.name),
        enabled: payload.enabled !== false,
        addedAt: currentSeconds(),
        lastCheckedAt: 0,
        lastError: null,
      }
      state.sources.push(created)
    })
    return clone(created)
  }

  /**
   * Patch one source. A URL change keeps the id but must not duplicate another source.
   * @param {string} id
   * @param {{ url?: string, name?: string, enabled?: boolean, lastCheckedAt?: number, lastError?: string | null }} patch
   */
  async function updateSource(id, patch = {}) {
    const sourceId = asString(id)
    const changes = isObject(patch) ? patch : {}
    let updated = null
    await write((state) => {
      const index = state.sources.findIndex((source) => source.id === sourceId)
      if (index === -1) throw skillError('E_NOT_FOUND', 'Source not found')
      const next = { ...state.sources[index] }
      if (changes.url !== undefined) {
        const url = validateSourceUrl(changes.url)
        const key = sourceUrlKey(url)
        if (state.sources.some((source) => source.id !== sourceId && sourceUrlKey(source.url) === key)) {
          throw skillError('E_BAD_REQUEST', 'This source URL is already configured')
        }
        next.url = url
      }
      if (changes.name !== undefined) next.name = asString(changes.name)
      if (changes.enabled !== undefined) next.enabled = changes.enabled === true
      if (changes.lastCheckedAt !== undefined) next.lastCheckedAt = toSeconds(changes.lastCheckedAt, next.lastCheckedAt)
      if (changes.lastError !== undefined) {
        next.lastError = typeof changes.lastError === 'string' && changes.lastError !== '' ? changes.lastError : null
      }
      state.sources[index] = next
      updated = next
    })
    return clone(updated)
  }

  /** Remove a source. Install records keep their source metadata. */
  async function removeSource(id) {
    const sourceId = asString(id)
    let removed = false
    await write((state) => {
      const before = state.sources.length
      state.sources = state.sources.filter((source) => source.id !== sourceId)
      removed = state.sources.length !== before
    })
    return { removed }
  }

  /**
   * Insert or replace the install record for `(location, name)`.
   * @param {object} record
   */
  async function recordInstall(record) {
    const entry = normalizeInstall(record)
    if (entry === null) throw skillError('E_BAD_REQUEST', 'Invalid install record')
    if (entry.installedAt === 0) entry.installedAt = currentSeconds()
    await write((state) => {
      state.installed = state.installed.filter(
        (item) => !(item.location === entry.location && item.name === entry.name),
      )
      state.installed.push(entry)
    })
    return clone(entry)
  }

  /**
   * Remove an install record.
   * @param {{ name: string, location: string } | string} input
   * @param {string} [location]
   */
  async function removeInstall(input, location) {
    const name = typeof input === 'string' ? input : asString(input?.name)
    const where = typeof input === 'string' ? asString(location) : asString(input?.location)
    let removed = false
    await write((state) => {
      const before = state.installed.length
      state.installed = state.installed.filter((item) => !(item.name === name && item.location === where))
      removed = state.installed.length !== before
    })
    return { removed }
  }

  /** @returns {Promise<object[]>} */
  async function listInstalled() {
    const state = await read()
    return state.installed
  }

  /** @returns {Promise<object[]>} */
  async function listSources() {
    const state = await read()
    return state.sources
  }

  return {
    read,
    write,
    addSource,
    updateSource,
    removeSource,
    recordInstall,
    removeInstall,
    listInstalled,
    listSources,
    // Exposed for install/update modules and tests.
    home: dshHome,
    dir: stateDir,
    file,
    backupFile,
    backupsDir,
    tmpDir,
  }
}
