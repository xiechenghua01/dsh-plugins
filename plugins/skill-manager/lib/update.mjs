/**
 * Automatic update checking.
 *
 * The checker is deliberately read-only with respect to skills: it refreshes market indexes
 * into an in-memory cache, compares each install record with the best compatible version in
 * its source, and optionally re-hashes the installed files to flag local edits. It never
 * downloads skill files, never writes a skill directory and never changes an install record.
 *
 * Scheduling (implementation §8.6 / PRD §8.5):
 *   - first check 15 s after start;
 *   - every 6 hours afterwards, registered through `ctx.effect` + `ctx.timer`;
 *   - manual `check({ force: true })` runs immediately;
 *   - non-forced checks within 30 minutes of the last completed check reuse the cached state;
 *   - only one check runs at a time; a second caller receives the in-flight state;
 *   - a failed source is not retried automatically for 30 minutes (its last good index is
 *     still used when available).
 *
 * Pure Node module: imports only `node:` builtins and `./state.mjs`.
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'

import { expandHome, skillError } from './state.mjs'
import { validateIndex } from './market-index.mjs'

/** First automatic check delay. */
export const FIRST_CHECK_DELAY_MS = 15000
/** Automatic check period. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
/** Index cache TTL (spec §12.2). */
export const INDEX_CACHE_TTL_MS = 10 * 60 * 1000
/** A manual page check closer than this reuses the cached state. */
export const MIN_CHECK_INTERVAL_MS = 30 * 60 * 1000
/** Back-off after a source fetch failure. */
export const SOURCE_RETRY_MS = 30 * 60 * 1000
/** Index body limit. */
export const MAX_INDEX_BYTES = 5 * 1024 * 1024
/** Index request timeout. */
export const INDEX_TIMEOUT_MS = 15000

// ---------------------------------------------------------------------------
// SemVer fallback (used when no compat module is injected)
// ---------------------------------------------------------------------------

function parseVersion(value) {
  const text = String(value ?? '').trim()
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(text)
  if (match === null) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] === undefined ? [] : match[4].split('.'),
    raw: text,
  }
}

function compareIdentifiers(left, right) {
  const leftNumeric = /^\d+$/.test(left)
  const rightNumeric = /^\d+$/.test(right)
  if (leftNumeric && rightNumeric) {
    const a = Number(left)
    const b = Number(right)
    return a === b ? 0 : a < b ? -1 : 1
  }
  if (leftNumeric) return -1
  if (rightNumeric) return 1
  return left === right ? 0 : left < right ? -1 : 1
}

/** Compare two SemVer strings. Invalid versions sort below valid ones. */
export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (a === null && b === null) {
    const l = String(left)
    const r = String(right)
    return l === r ? 0 : l < r ? -1 : 1
  }
  if (a === null) return -1
  if (b === null) return 1
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0
  if (a.prerelease.length === 0) return 1
  if (b.prerelease.length === 0) return -1
  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    if (a.prerelease[index] === undefined) return -1
    if (b.prerelease[index] === undefined) return 1
    const comparison = compareIdentifiers(a.prerelease[index], b.prerelease[index])
    if (comparison !== 0) return comparison
  }
  return 0
}

/** Minimal comparator-range check. Unknown syntax is treated as compatible. */
export function satisfiesRange(version, range) {
  const text = String(range ?? '').trim()
  if (text === '' || text === '*' || text.toLowerCase() === 'x') return true
  for (const token of text.split(/\s+/)) {
    if (token === '') continue
    const match = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(token)
    if (match === null) return true
    const operator = match[1] ?? '='
    const target = match[2]
    if (/^[~^]/.test(target)) return true // unsupported by the spec; do not block
    const comparison = compareVersions(version, target)
    if (operator === '>=' && comparison < 0) return false
    if (operator === '>' && comparison <= 0) return false
    if (operator === '<=' && comparison > 0) return false
    if (operator === '<' && comparison >= 0) return false
    if (operator === '=' && comparison !== 0) return false
  }
  return true
}

function enginesRange(version) {
  if (version === null || typeof version !== 'object') return null
  const value = version.engines?.dsh ?? version.enginesDsh ?? version.dsh
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function compareWith(left, right, compat) {
  if (compat !== null && compat !== undefined && typeof compat.compareVersions === 'function') {
    try {
      return compat.compareVersions(left, right)
    } catch {
      /* fall through to the local implementation */
    }
  }
  return compareVersions(left, right)
}

/**
 * `engines.dsh` is a range over the *running* DSH version, not over the skill version.
 * When the running version is unknown (implementation §7) every version is compatible.
 */
function isCompatible(version, { compat, dshVersion }) {
  if (dshVersion === null) return true
  const range = enginesRange(version)
  if (range === null) return true
  if (compat !== null && compat !== undefined && typeof compat.satisfiesRange === 'function') {
    try {
      return compat.satisfiesRange(dshVersion, range) === true
    } catch {
      return true
    }
  }
  return satisfiesRange(dshVersion, range)
}

/** Highest compatible stable version, falling back to the highest compatible prerelease. */
function selectDefaultVersion(skill, context) {
  let versions = Array.isArray(skill?.versions) ? skill.versions : []
  if (versions.length === 0 && typeof skill?.version === 'string') versions = [skill]
  const candidates = versions.filter((version) => (
    version !== null
    && typeof version === 'object'
    && typeof version.version === 'string'
    && version.version !== ''
    && version.yanked !== true
    && isCompatible(version, context)
  ))
  if (candidates.length === 0) return null
  const stable = candidates.filter((version) => (parseVersion(version.version)?.prerelease.length ?? 0) === 0)
  const pool = stable.length > 0 ? stable : candidates
  return [...pool].sort((left, right) => compareWith(right.version, left.version, context.compat))[0]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureErrorCode(error, fallback = 'E_INTERNAL') {
  if (error !== null && typeof error === 'object' && typeof error.code === 'string' && error.code.startsWith('E_')) {
    return error
  }
  const wrapped = skillError(fallback, error !== null && typeof error === 'object' && error.message ? error.message : String(error))
  if (error !== null && typeof error === 'object') wrapped.cause = error
  return wrapped
}

function resolveFetcher(fetcher) {
  if (typeof fetcher === 'function') return fetcher
  if (fetcher !== null && typeof fetcher === 'object' && typeof fetcher.fetch === 'function') {
    return fetcher.fetch.bind(fetcher)
  }
  if (typeof globalThis.fetch === 'function') return globalThis.fetch.bind(globalThis)
  throw skillError('E_INTERNAL', 'No fetch implementation is available')
}

function createTimeoutSignal(milliseconds, external) {
  const controller = new AbortController()
  const state = { timedOut: false }
  const onAbort = () => {
    try {
      controller.abort(external?.reason)
    } catch {
      controller.abort()
    }
  }
  if (external !== undefined && external !== null) {
    if (external.aborted) onAbort()
    else if (typeof external.addEventListener === 'function') external.addEventListener('abort', onAbort, { once: true })
  }
  const timer = setTimeout(() => {
    state.timedOut = true
    try {
      controller.abort(new Error('timeout'))
    } catch {
      controller.abort()
    }
  }, milliseconds)
  if (typeof timer.unref === 'function') timer.unref()
  return {
    signal: controller.signal,
    get timedOut() {
      return state.timedOut
    },
    dispose() {
      clearTimeout(timer)
      if (external !== null && external !== undefined && typeof external.removeEventListener === 'function') {
        external.removeEventListener('abort', onAbort)
      }
    },
  }
}

function asIndex(value) {
  if (value === null || typeof value !== 'object') return null
  if (Array.isArray(value.skills)) return value
  if (value.index !== null && typeof value.index === 'object' && Array.isArray(value.index.skills)) return value.index
  if (value.document !== null && typeof value.document === 'object' && Array.isArray(value.document.skills)) return value.document
  return null
}

async function readLimitedBody(response, limit) {
  const chunks = []
  let total = 0
  const push = (buffer) => {
    total += buffer.length
    if (total > limit) throw skillError('E_SOURCE_SCHEMA', 'Index is larger than 5 MiB')
    chunks.push(buffer)
  }
  const body = response?.body
  if (body !== null && body !== undefined && typeof body.getReader === 'function') {
    const reader = body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value !== undefined && value !== null) push(Buffer.from(value))
      }
    } catch (error) {
      await reader.cancel().catch(() => {})
      throw error
    }
  } else if (typeof response?.arrayBuffer === 'function') {
    const buffer = Buffer.from(await response.arrayBuffer())
    push(buffer)
  } else if (typeof response?.json === 'function') {
    const buffer = Buffer.from(JSON.stringify(await response.json()))
    push(buffer)
  } else if (typeof response?.text === 'function') {
    push(Buffer.from(await response.text()))
  } else {
    throw skillError('E_SOURCE_SCHEMA', 'Index response body is not readable')
  }
  return Buffer.concat(chunks)
}

async function fetchIndex(source, { fetcher, signal }) {
  const url = String(source?.url ?? '')
  if (url === '') throw skillError('E_BAD_REQUEST', 'Source URL is empty')
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw skillError('E_SOURCE_SCHEMA', 'Source URL is invalid')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw skillError('E_SOURCE_SCHEMA', 'Source URL must use http(s)')
  }
  if (parsed.username !== '' || parsed.password !== '' || parsed.hash !== '') {
    throw skillError('E_SOURCE_SCHEMA', 'Source URL must not contain credentials or a fragment')
  }

  const doFetch = resolveFetcher(fetcher)
  const timeout = createTimeoutSignal(INDEX_TIMEOUT_MS, signal)
  try {
    let response
    try {
      response = await doFetch(url, {
        redirect: 'error',
        signal: timeout.signal,
        headers: { accept: 'application/json' },
      })
    } catch (error) {
      if (timeout.timedOut) throw skillError('E_SOURCE_UNREACHABLE', 'Index fetch timed out')
      if (signal !== undefined && signal !== null && signal.aborted) throw skillError('E_CANCELED', 'Update check stopped')
      throw skillError('E_SOURCE_UNREACHABLE', `Index fetch failed: ${url}`, { cause: error })
    }

    const direct = asIndex(response)
    if (direct !== null) return direct

    const ok = typeof response?.ok === 'boolean' ? response.ok : (response?.status >= 200 && response?.status < 300)
    if (!ok) {
      throw skillError('E_SOURCE_UNREACHABLE', `Index fetch failed with HTTP ${response?.status ?? 'unknown'}`, {
        status: response?.status,
      })
    }
    const bytes = await readLimitedBody(response, MAX_INDEX_BYTES)
    let text
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      throw skillError('E_SOURCE_SCHEMA', 'Index is not valid UTF-8')
    }
    let index
    try {
      index = JSON.parse(text)
    } catch {
      throw skillError('E_SOURCE_SCHEMA', 'Index is not valid JSON')
    }
    if (index === null || typeof index !== 'object' || !Array.isArray(index.skills)) {
      throw skillError('E_SOURCE_SCHEMA', 'Index does not contain a skills array')
    }
    return index
  } finally {
    timeout.dispose()
  }
}

function isInside(base, target) {
  const from = resolve(base)
  const to = resolve(target)
  if (from === to) return false
  const rel = relative(from, to)
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

async function computeLocalModified(record) {
  const files = Array.isArray(record?.files) ? record.files : []
  if (files.length === 0) return false
  const rawRoot = record.absRootPath || record.rootPath
  if (typeof rawRoot !== 'string' || rawRoot === '') return true
  // `rootPath` is the *location* root (often abbreviated as `~`); the skill lives in a
  // directory named after the record.
  const name = typeof record?.name === 'string' ? record.name : ''
  if (name === '' || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) return true
  const expanded = expandHome(rawRoot)
  if (!isAbsolute(expanded)) return true
  const root = resolve(expanded)
  for (const file of files) {
    if (file === null || typeof file !== 'object' || typeof file.path !== 'string' || typeof file.sha256 !== 'string') {
      return true
    }
    const segments = file.path.split('/')
    if (file.path.startsWith('/') || file.path.includes('\\') || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
      return true
    }
    const target = resolve(root, name, ...segments)
    if (!isInside(root, target)) return true
    let data
    try {
      data = await readFile(target)
    } catch {
      return true
    }
    if (data.length !== Number(file.size)) return true
    if (createHash('sha256').update(data).digest('hex') !== file.sha256.toLowerCase()) return true
  }
  return false
}

function disposeTimer(handle) {
  if (handle === undefined || handle === null) return
  if (typeof handle === 'function') {
    try {
      handle()
    } catch {
      /* ignore */
    }
    return
  }
  if (typeof handle.dispose === 'function') {
    try {
      handle.dispose()
    } catch {
      /* ignore */
    }
    return
  }
  if (typeof handle.clear === 'function') {
    try {
      handle.clear()
    } catch {
      /* ignore */
    }
    return
  }
  try {
    clearTimeout(handle)
  } catch {
    /* ignore */
  }
  try {
    clearInterval(handle)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Checker
// ---------------------------------------------------------------------------

/**
 * Create the automatic update checker.
 *
 * @param {object} [options]
 * @param {object} options.state state store from `createState()`
 * @param {Function} [options.fetcher] fetch-compatible function
 * @param {Function | object} [options.installedProvider] optional override for install records
 * @param {object} [options.compat] optional `{ compareVersions, satisfiesRange }` implementation
 * @param {string} [options.dshVersion] running DSH version; unknown means "all compatible"
 * @param {() => number} [options.now] clock returning ms (or seconds)
 */
export function createUpdateChecker(options = {}) {
  const state = options.state
  const fetcher = options.fetcher
  const installedProvider = options.installedProvider
  const compat = options.compat
  const envVersion = typeof process.env.DSH_VERSION === 'string' && process.env.DSH_VERSION.trim() !== ''
    ? process.env.DSH_VERSION.trim()
    : null
  const dshVersion = typeof options.dshVersion === 'string' && options.dshVersion.trim() !== ''
    ? options.dshVersion.trim()
    : envVersion
  const clock = () => {
    const raw = typeof options.now === 'function' ? Number(options.now()) : Date.now()
    if (!Number.isFinite(raw)) return Date.now()
    return raw < 1e11 ? raw * 1000 : raw
  }
  const nowSeconds = () => Math.floor(clock() / 1000)

  const cache = new Map()
  let view = { checking: false, checkedAt: 0, errors: [], updates: [] }
  let inflight = null
  let lastCheckMs = 0
  let lastSourceCount = 0
  let abortController = null
  let effectDispose = null
  let timers = []

  function getState() {
    return {
      checking: view.checking,
      checkedAt: view.checkedAt,
      errors: view.errors.map((entry) => ({ ...entry })),
      updates: view.updates.map((entry) => ({ ...entry })),
      ...(view.skipped === true ? { skipped: true } : {}),
    }
  }

  async function listSources() {
    if (state === null || state === undefined || typeof state.listSources !== 'function') return []
    return await state.listSources()
  }

  async function listInstalled() {
    if (typeof installedProvider === 'function') {
      const value = await installedProvider()
      if (Array.isArray(value)) return value
      if (Array.isArray(value?.installed)) return value.installed
      return []
    }
    if (installedProvider !== null && installedProvider !== undefined) {
      if (typeof installedProvider.listInstalled === 'function') return await installedProvider.listInstalled()
      if (typeof installedProvider.list === 'function') return await installedProvider.list()
    }
    if (state === null || state === undefined || typeof state.listInstalled !== 'function') return []
    return await state.listInstalled()
  }

  async function ensureIndex(source, force, signal) {
    const url = String(source?.url ?? '')
    const key = typeof source?.id === 'string' && source.id !== '' ? source.id : url
    let entry = cache.get(key)
    if (entry !== undefined && entry.url !== url) entry = undefined
    const nowMs = clock()

    if (!force && entry !== undefined && entry.retryAtMs > nowMs) {
      return { index: entry.index ?? null, error: entry.error ?? null, stale: Boolean(entry.index) }
    }
    if (!force && entry !== undefined && entry.index !== undefined && nowMs - entry.fetchedAtMs < INDEX_CACHE_TTL_MS) {
      return { index: entry.index, error: null, stale: false }
    }

    try {
      const fetched = await fetchIndex(source, { fetcher, signal })
      // P2-5: validate *before* replacing the cache. A structurally invalid new index must
      // not evict the last good one; the previous index stays usable and is marked stale.
      let validated
      try {
        validated = validateIndex(fetched, url)
      } catch (error) {
        const detail = error !== null && typeof error === 'object' && typeof error.message === 'string'
          ? error.message
          : String(error)
        const previous = entry?.index ?? null
        const failure = `invalid index: ${detail}`
        cache.set(key, {
          url,
          index: previous,
          fetchedAtMs: entry?.fetchedAtMs ?? 0,
          error: failure,
          retryAtMs: nowMs + SOURCE_RETRY_MS,
          stale: previous !== null,
        })
        return { index: previous, error: failure, stale: previous !== null }
      }
      const index = validated?.index ?? fetched
      cache.set(key, { url, index, fetchedAtMs: nowMs, error: null, retryAtMs: 0, stale: false })
      return { index, error: null, stale: false }
    } catch (error) {
      const message = error !== null && typeof error === 'object' && typeof error.message === 'string'
        ? error.message
        : String(error)
      const previous = entry?.index ?? null
      cache.set(key, {
        url,
        index: previous,
        fetchedAtMs: entry?.fetchedAtMs ?? 0,
        error: message,
        retryAtMs: nowMs + SOURCE_RETRY_MS,
        stale: previous !== null,
      })
      return { index: previous, error: message, stale: previous !== null }
    }
  }

  function dedupeErrors(errors) {
    const seen = new Set()
    const result = []
    for (const error of errors) {
      const key = `${error.sourceId}\u0000${error.message}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push(error)
    }
    return result
  }

  async function runCheck(force, refreshIndexes) {
    view = { ...view, checking: true }
    abortController = new AbortController()
    const errors = []
    const updates = []
    try {
      const sources = (await listSources()).filter((source) => source !== null && typeof source === 'object' && source.enabled !== false)
      const records = (await listInstalled()).filter((record) => (
        record !== null && typeof record === 'object' && typeof record.sourceId === 'string' && record.sourceId !== ''
      ))
      lastSourceCount = sources.length

      // Without install records there is nothing to compare. `/check-updates` still asks for a
      // refresh of every enabled source's index, so `refreshIndexes` keeps the fetch loop alive.
      if (sources.length === 0 || (records.length === 0 && refreshIndexes !== true)) {
        view = { checking: false, checkedAt: nowSeconds(), errors: [], updates: [], skipped: true }
        return { ...getState(), sources: sources.length, refreshNeeded: false }
      }

      for (const source of sources) {
        const sourceKey = typeof source.id === 'string' && source.id !== '' ? source.id : String(source.url ?? '')
        const result = await ensureIndex(source, force, abortController.signal)
        if (result.error !== null && result.error !== undefined) {
          errors.push({ sourceId: sourceKey, message: result.error })
        }
        const index = result.index
        if (index === null || index === undefined) continue
        // `ensureIndex` validates before caching, so this index is structurally sound (and on
        // failure it is the last good index, not the invalid new one).
        const skills = Array.isArray(index.skills) ? index.skills : []
        const byName = new Map()
        for (const skill of skills) {
          if (skill !== null && typeof skill === 'object' && typeof skill.name === 'string') byName.set(skill.name, skill)
        }
        for (const record of records) {
          if (record.sourceId !== sourceKey) continue
          const skill = byName.get(record.name)
          if (skill === undefined) continue
          const candidate = selectDefaultVersion(skill, { compat, dshVersion })
          if (candidate === null) continue
          if (compareWith(candidate.version, record.version, compat) <= 0) continue
          const localModified = await computeLocalModified(record)
          updates.push({
            name: record.name,
            location: record.location,
            // P2-7: consumers must be able to require the same source, not just the same name.
            sourceId: sourceKey,
            // Cross-project isolation: the install root is part of the record identity, so
            // project A's up-to-date copy never produces an update row for project B's copy.
            rootPath: typeof record.rootPath === 'string' ? record.rootPath : '',
            current: String(record.version ?? ''),
            available: String(candidate.version),
            localModified,
          })
        }
      }

      const seen = new Set()
      const deduped = []
      for (const update of updates) {
        // P2-7 + cross-project isolation: the source *and* the install root are part of
        // the identity, so neither another source nor another project can shadow a row.
        const key = `${update.sourceId}\u0000${update.location}\u0000${update.name}\u0000${update.rootPath ?? ''}`
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(update)
      }
      deduped.sort((left, right) => {
        if (left.name !== right.name) return left.name < right.name ? -1 : 1
        if (left.location !== right.location) return left.location < right.location ? -1 : 1
        const leftRoot = left.rootPath ?? ''
        const rightRoot = right.rootPath ?? ''
        return leftRoot === rightRoot ? 0 : leftRoot < rightRoot ? -1 : 1
      })

      view = {
        checking: false,
        checkedAt: nowSeconds(),
        errors: dedupeErrors(errors),
        updates: deduped,
      }
      lastCheckMs = clock()
      return { ...getState(), sources: sources.length, refreshNeeded: true }
    } catch (error) {
      const failure = ensureErrorCode(error)
      errors.push({ sourceId: '', message: failure.message })
      view = {
        checking: false,
        checkedAt: nowSeconds(),
        errors: dedupeErrors(errors),
        updates: [],
      }
      lastCheckMs = clock()
      return { ...getState(), sources: lastSourceCount, refreshNeeded: true }
    } finally {
      abortController = null
    }
  }

  /**
   * Run one check.
   *
   * `force` bypasses the index-cache TTL and the 30-minute manual-check window.
   * `refreshIndexes` makes the check fetch every enabled source even when there are no install
   * records, which is what `/check-updates` needs (contract §4.3). A second caller while a check
   * is running receives the in-flight result instead of queueing.
   *
   * The returned document is the usual update state plus `sources` (number of enabled sources
   * checked) and `refreshNeeded` (whether `GET /installed` should drop its scan cache).
   */
  async function check(checkOptions = {}) {
    const force = checkOptions.force === true
    const refreshIndexes = checkOptions.refreshIndexes === true
    if (inflight !== null) return inflight
    if (!force && !refreshIndexes && lastCheckMs > 0 && clock() - lastCheckMs < MIN_CHECK_INTERVAL_MS) {
      return { ...getState(), sources: lastSourceCount, refreshNeeded: false }
    }
    inflight = runCheck(force, refreshIndexes).finally(() => {
      inflight = null
    })
    return inflight
  }

  function start(ctx) {
    if (effectDispose !== null || timers.length > 0) return
    const timer = ctx?.timer
    const run = () => {
      check().catch(() => {})
    }
    const setup = () => {
      const handles = []
      const first = timer !== null && timer !== undefined && typeof timer.timeout === 'function'
        ? timer.timeout(run, FIRST_CHECK_DELAY_MS)
        : setTimeout(run, FIRST_CHECK_DELAY_MS)
      handles.push(first)
      const interval = timer !== null && timer !== undefined && typeof timer.interval === 'function'
        ? timer.interval(run, CHECK_INTERVAL_MS)
        : setInterval(run, CHECK_INTERVAL_MS)
      handles.push(interval)
      timers = handles
      return () => {
        for (const handle of handles) disposeTimer(handle)
        timers = []
        if (abortController !== null) {
          try {
            abortController.abort(skillError('E_CANCELED', 'Update check stopped'))
          } catch {
            /* ignore */
          }
        }
      }
    }
    if (ctx !== null && ctx !== undefined && typeof ctx.effect === 'function') {
      const dispose = ctx.effect(setup)
      effectDispose = typeof dispose === 'function' ? dispose : null
    } else {
      setup()
    }
  }

  function stop() {
    if (effectDispose !== null) {
      try {
        effectDispose()
      } catch {
        /* ignore */
      }
      effectDispose = null
    }
    for (const handle of timers) disposeTimer(handle)
    timers = []
    if (abortController !== null) {
      try {
        abortController.abort(skillError('E_CANCELED', 'Update check stopped'))
      } catch {
        /* ignore */
      }
      abortController = null
    }
  }

  return { start, stop, getState, check }
}
