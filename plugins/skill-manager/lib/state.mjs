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
import { realpathSync } from 'node:fs'
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

/** Memoised logical → canonical root mapping (bounded; roots rarely change). */
const rootKeyCache = new Map()

/**
 * Canonical key for a location root used in install-record matching.
 *
 * New records store the absolute install root; records written before the round-1 fix
 * store it home-abbreviated (`~/...`). Both forms collapse to the same key, so an
 * upgraded record can still be found. An empty value marks a legacy record that has
 * no root information at all.
 * @param {unknown} value
 * @returns {string}
 */
function rootPathKey(value) {
  const raw = asString(value)
  if (raw === '') return ''
  const absolute = resolve(expandHome(raw))
  let canonical = rootKeyCache.get(absolute)
  if (canonical === undefined) {
    try {
      // The installer realpaths its roots while the scanner reports the logical project
      // root; canonicalising here makes both forms compare equal (e.g. macOS /var →
      // /private/var). A root that does not exist yet simply falls back to `resolve`.
      canonical = abbreviateHome(realpathSync(absolute))
      if (rootKeyCache.size >= 1024) rootKeyCache.clear()
      rootKeyCache.set(absolute, canonical)
    } catch {
      canonical = abbreviateHome(absolute)
    }
  }
  return canonical
}

/** Matching key `(location, name, rootPath)` for install records. */
function installKeyOf(record) {
  return `${record.location}\u0000${record.name}\u0000${rootPathKey(record.rootPath)}`
}

/**
 * Find the install record for `(location, name, rootPath)`.
 *
 * Round-1 fix P1-1 matching rules:
 *   1. an exact `(location, name, rootPath)` match wins, so the same skill installed
 *      in two projects resolves to two independent records;
 *   2. a legacy record without `rootPath` is adopted only when it is the single
 *      `(location, name)` record missing a root;
 *   3. when `rootPath` is omitted, the previous first-match-by-`(location, name)`
 *      behavior is preserved for callers that have not been updated yet.
 *
 * @param {object[]} records install records (from `state.listInstalled()`)
 * @param {string} location
 * @param {string} name
 * @param {string} [rootPath] absolute or home-abbreviated location root
 * @returns {object | undefined}
 */
export function findInstallRecord(records, location, name, rootPath) {
  const list = Array.isArray(records) ? records : []
  const where = asString(location)
  const wanted = asString(name)
  if (where === '' || wanted === '') return undefined
  const candidates = list.filter((record) => (
    record !== null && typeof record === 'object' && record.location === where && record.name === wanted
  ))
  if (candidates.length === 0) return undefined
  const wantRoot = rootPathKey(rootPath)
  // No root given: keep the pre-fix behavior (first record for the location+name).
  if (wantRoot === '') return candidates[0]
  const exact = candidates.find((record) => rootPathKey(record.rootPath) === wantRoot)
  if (exact !== undefined) return exact
  const legacy = candidates.filter((record) => rootPathKey(record.rootPath) === '')
  return legacy.length === 1 ? legacy[0] : undefined
}

/**
 * Reconcile a persisted `sourceOrder` with the live source list (contract §4.2):
 * keep known ids in their saved order, drop stale/duplicate entries, and append any
 * source that is not listed yet (creation order) so a newly added source lands last.
 * @param {unknown} value
 * @param {object[]} sources
 * @returns {string[]}
 */
function normalizeSourceOrder(value, sources) {
  const ids = sources.map((source) => source.id)
  const known = new Set(ids)
  const order = []
  const seen = new Set()
  if (Array.isArray(value)) {
    for (const id of value) {
      if (typeof id !== 'string' || id === '' || !known.has(id) || seen.has(id)) continue
      seen.add(id)
      order.push(id)
    }
  }
  // Contract §4.2 / P2-3: sources missing from the stored order append by creation time.
  const byAddedAt = sources.slice().sort((a, b) => {
    const ta = Number(a?.addedAt) || 0
    const tb = Number(b?.addedAt) || 0
    return ta - tb || String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
  })
  for (const source of byAddedAt) {
    const id = source?.id
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue
    seen.add(id)
    order.push(id)
  }
  return order
}

/**
 * Coerce an arbitrary document into the current state shape.
 * Unknown fields are dropped; duplicate sources/records keep the last entry.
 * @param {unknown} value
 * @returns {{ version: number, sources: object[], installed: object[], sourceOrder: string[] }}
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
      // Duplicate records are per root: the same (location, name) may legitimately
      // exist in several project roots. Legacy records (no rootPath) still collapse
      // onto the old (location, name) key.
      const key = installKeyOf(record)
      if (installKeys.has(key)) installed[installKeys.get(key)] = record
      else {
        installKeys.set(key, installed.length)
        installed.push(record)
      }
    }
  }
  return {
    version: STATE_VERSION,
    sources,
    installed,
    sourceOrder: normalizeSourceOrder(document.sourceOrder, sources),
  }
}

/** An empty state document. */
export function emptyState() {
  return { version: STATE_VERSION, sources: [], installed: [], sourceOrder: [] }
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
   * Insert or replace the install record for `(location, name, rootPath)`.
   *
   * Records for the same `(location, name)` under a different root are kept, so two
   * projects can install the same skill independently. A legacy record without
   * `rootPath` is migrated away when the new record carries a root.
   * @param {object} record
   */
  async function recordInstall(record) {
    const entry = normalizeInstall(record)
    if (entry === null) throw skillError('E_BAD_REQUEST', 'Invalid install record')
    if (entry.installedAt === 0) entry.installedAt = currentSeconds()
    const entryRoot = rootPathKey(entry.rootPath)
    await write((state) => {
      state.installed = state.installed.filter((item) => {
        if (item.location !== entry.location || item.name !== entry.name) return true
        const itemRoot = rootPathKey(item.rootPath)
        // A legacy write only replaces other legacy records; a rooted write replaces
        // the record for its own root and migrates the unique legacy record.
        if (entryRoot === '') return itemRoot !== ''
        return itemRoot !== entryRoot && itemRoot !== ''
      })
      state.installed.push(entry)
    })
    return clone(entry)
  }

  /**
   * Remove an install record.
   *
   * With a `rootPath` only that root's record is removed (a legacy record without a
   * root is adopted when it is the single candidate). Without one the old behavior is
   * kept: every record for `(location, name)` is removed.
   * @param {{ name: string, location: string, rootPath?: string } | string} input
   * @param {string} [location]
   * @param {string} [rootPath]
   */
  async function removeInstall(input, location, rootPath) {
    const byString = typeof input === 'string'
    const name = byString ? input : asString(input?.name)
    const where = byString ? asString(location) : asString(input?.location)
    const requestedRoot = byString ? rootPath : (input?.rootPath ?? rootPath)
    const wantRoot = rootPathKey(requestedRoot)
    let removed = false
    await write((state) => {
      const before = state.installed.length
      if (wantRoot === '') {
        state.installed = state.installed.filter((item) => !(item.name === name && item.location === where))
        removed = state.installed.length !== before
        return
      }
      let matched = false
      state.installed = state.installed.filter((item) => {
        if (item.name !== name || item.location !== where) return true
        if (rootPathKey(item.rootPath) !== wantRoot) return true
        matched = true
        return false
      })
      if (!matched) {
        // The record may predate root tracking: adopt the unique legacy record.
        const legacy = state.installed.filter((item) => (
          item.name === name && item.location === where && rootPathKey(item.rootPath) === ''
        ))
        if (legacy.length === 1) {
          state.installed = state.installed.filter((item) => item !== legacy[0])
          matched = true
        }
      }
      removed = matched || state.installed.length !== before
    })
    return { removed }
  }

  /** @returns {Promise<object[]>} */
  async function listInstalled() {
    const state = await read()
    return state.installed
  }

  /**
   * Compatibility lookup for callers that only know `(location, name)`.
   * Passing `rootPath` scopes the lookup to one project root (round-1 fix P1-1);
   * omitting it keeps the pre-fix first-match behavior.
   * @param {string} location
   * @param {string} name
   * @param {string} [rootPath]
   * @returns {Promise<object | undefined>}
   */
  async function findRecord(location, name, rootPath) {
    const state = await read()
    return findInstallRecord(state.installed, location, name, rootPath)
  }

  /** @returns {Promise<object[]>} */
  async function listSources() {
    const state = await read()
    return state.sources
  }

  /**
   * The persisted source display order. Missing entries are filled in creation order,
   * so this always lists exactly the current source ids (contract §4.2).
   * @returns {Promise<string[]>}
   */
  async function getSourceOrder() {
    const state = await read()
    return state.sourceOrder
  }

  /**
   * Persist a full permutation of the current source ids.
   * Missing, unknown, duplicate or non-string ids are rejected with `E_BAD_REQUEST`.
   * @param {string[]} order
   * @returns {Promise<string[]>} the persisted order
   */
  async function setSourceOrder(order) {
    let saved = []
    await write((state) => {
      if (!Array.isArray(order)) {
        throw skillError('E_BAD_REQUEST', 'source order must be an array of source ids')
      }
      const ids = state.sources.map((source) => source.id)
      const known = new Set(ids)
      if (order.length !== ids.length) {
        throw skillError('E_BAD_REQUEST', 'source order must list every source exactly once')
      }
      const seen = new Set()
      for (const id of order) {
        if (typeof id !== 'string' || id === '' || !known.has(id) || seen.has(id)) {
          throw skillError('E_BAD_REQUEST', 'source order must list every source exactly once')
        }
        seen.add(id)
      }
      state.sourceOrder = [...order]
      saved = [...order]
    })
    return saved
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
    findRecord,
    listSources,
    getSourceOrder,
    setSourceOrder,
    // Exposed for install/update modules and tests.
    home: dshHome,
    dir: stateDir,
    file,
    backupFile,
    backupsDir,
    tmpDir,
  }
}
