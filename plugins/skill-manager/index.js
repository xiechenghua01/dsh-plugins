/**
 * Skill Manager — Host half.
 *
 * Registers every `/skill-manager/api` route (implementation contract §4) on
 * `ctx.webServer`, behind the `ctx.connection` trust fence. Route handlers are
 * deliberately thin: scanning lives in `lib/scan.mjs`, frontmatter rules in
 * `lib/frontmatter.mjs`, and the market / state / install / write / update
 * business in the H2/H3 modules imported below.
 *
 * Wire contract:
 *   success -> `{ ok: true, data }`
 *   failure -> `{ ok: false, error: { code, message, path?, file? } }`
 *
 * Only `node:` builtins and relative modules are imported.
 */
import { Buffer } from 'node:buffer'
import { readFile, realpath } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve, sep } from 'node:path'
import { homedir } from 'node:os'

import { ApiError, fail, methodNotAllowed, queryOf, readBody, rejected, sendJson } from './lib/http.mjs'
import { parseSkillFile, validateFrontmatter } from './lib/frontmatter.mjs'
import {
  agentsHome,
  dshHome,
  invalidateScanCache,
  projectRootOf,
  readSkillDetail,
  resolveCwd,
  scanAll,
} from './lib/scan.mjs'
import { MAX_SKILL_MD_BYTES, MarketIndexError, localizedPair, validateIndex } from './lib/market-index.mjs'
import { createIndexFetcher } from './lib/fetch-index.mjs'
import { compareVersions, satisfiesRange } from './lib/compat.mjs'
import { defaultVersionOf as defaultMarketVersion, searchBySource } from './lib/search.mjs'
import { createState } from './lib/state.mjs'
import { createInstaller } from './lib/install.mjs'
import { createWriter } from './lib/write.mjs'
import { createUpdateChecker } from './lib/update.mjs'

export const name = 'skill-manager'

export const inject = ['webServer', 'connection', 'timer']

const API_PREFIX = '/skill-manager/api'
// The host only routes `prefix + '/'` to a prefix handler, so the registered
// prefix must not itself end in a slash; the handler parses the sub-path.
const SOURCE_PREFIX = `${API_PREFIX}/sources`

const DEFAULTS = {
  cwd: '',
  fontSize: null,
  dshVersion: null,
  maxBodyBytes: 1024 * 1024,
  autoCheck: true,
  checkIntervalMs: 6 * 60 * 60 * 1000,
  checkStartupDelayMs: 15 * 1000,
  home: '',
}

const SKILL_CATEGORIES = ['mine', 'shared', 'project', 'system']

/**
 * Client-facing market sort names (`recommend` / `updated` / `name`) map onto the index
 * sort keys understood by `search.mjs`.
 */
function normalizeMarketSort(value) {
  switch (typeof value === 'string' ? value : '') {
    case 'recommend':
    case 'relevance':
      return 'relevance'
    case 'updated':
    case 'published':
      return 'published'
    case 'name':
      return 'name'
    case 'index':
      return 'index'
    default:
      return 'relevance'
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function message(error) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error')
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function clampInt(value, minimum, maximum, fallback) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(minimum, Math.min(maximum, Math.round(number)))
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function truthyFlag(value) {
  return value === '1' || value === 'true' || value === true
}

function parseInteger(value, fallback) {
  const number = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(number) ? Math.trunc(number) : fallback
}

function mergeConfig(raw) {
  const input = isObject(raw) ? raw : {}
  return {
    cwd: typeof input.cwd === 'string' ? input.cwd : DEFAULTS.cwd,
    fontSize: Number.isFinite(input.fontSize) ? Math.round(input.fontSize) : DEFAULTS.fontSize,
    dshVersion: typeof input.dshVersion === 'string' && input.dshVersion !== '' ? input.dshVersion : DEFAULTS.dshVersion,
    maxBodyBytes: clampInt(input.maxBodyBytes, 1024, 32 * 1024 * 1024, DEFAULTS.maxBodyBytes),
    autoCheck: input.autoCheck !== false,
    checkIntervalMs: clampInt(input.checkIntervalMs, 60_000, 7 * 86_400_000, DEFAULTS.checkIntervalMs),
    checkStartupDelayMs: clampInt(input.checkStartupDelayMs, 0, 3_600_000, DEFAULTS.checkStartupDelayMs),
    home: typeof input.home === 'string' && input.home !== '' ? input.home : DEFAULTS.home,
  }
}

/**
 * Contract §4.2: keep the persisted order for known ids, then append every source that is
 * not listed in creation (`addedAt`) order. Unknown/duplicate/non-string ids are dropped.
 *
 * @param {unknown} value persisted `sourceOrder`
 * @param {object[]} sources live source list (each with `id` and `addedAt`)
 * @returns {string[]}
 */
export function normalizeSourceOrder(value, sources) {
  const list = Array.isArray(sources)
    ? sources.filter((source) => isObject(source) && typeof source.id === 'string' && source.id !== '')
    : []
  const byId = new Map(list.map((source) => [source.id, source]))
  const order = []
  const seen = new Set()
  if (Array.isArray(value)) {
    for (const id of value) {
      if (typeof id !== 'string' || id === '' || !byId.has(id) || seen.has(id)) continue
      seen.add(id)
      order.push(id)
    }
  }
  const missing = list.filter((source) => !seen.has(source.id))
  missing.sort((left, right) => {
    const leftAt = Number.isFinite(left.addedAt) ? left.addedAt : 0
    const rightAt = Number.isFinite(right.addedAt) ? right.addedAt : 0
    return leftAt - rightAt || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  })
  for (const source of missing) order.push(source.id)
  return order
}

function emptyUpdateState() {
  return { checking: false, checkedAt: 0, errors: [], updates: [] }
}

/** Running DSH version: loader config wins, then `DSH_VERSION`; `null` = unknown. */
function runningDshVersion(settings) {
  if (typeof settings?.dshVersion === 'string' && settings.dshVersion !== '') return settings.dshVersion
  if (typeof process.env.DSH_VERSION === 'string' && process.env.DSH_VERSION !== '') return process.env.DSH_VERSION
  return null
}

async function realOrResolve(path) {
  try {
    return await realpath(path)
  } catch {
    return resolve(path)
  }
}

/**
 * The H3 writer addresses a skill by its *entry* (`<root>/<name>` or
 * `<root>/<name>.md`), while the API exposes the SKILL.md file path.
 */
function skillEntryPath(path) {
  return basename(path).toLowerCase() === 'skill.md' ? dirname(path) : path
}

/**
 * The fixed writable-root table the H3 writer/installer expect, for one cwd.
 * Roots are realpath-normalised so H3's realpath comparison succeeds on
 * platforms where the temp/home prefix is itself a symlink (macOS `/var`).
 */
async function rootsFor(ctx, cwd) {
  // Writes must land in the same project root the scanner uses (nearest `.git`
  // ancestor), not whatever sub-directory the request happened to come from.
  const projectRoot = await projectRootOf(cwd)
  const [project, dsh, agents] = await Promise.all([
    realOrResolve(projectRoot),
    realOrResolve(dshHome()),
    realOrResolve(agentsHome()),
  ])
  const roots = {
    'project-dsh': join(project, '.dsh', 'skills'),
    'project-agents': join(project, '.agents', 'skills'),
    'user-dsh': join(dsh, 'skills'),
    'user-agents': join(agents, 'skills'),
  }
  // The custom root is only discoverable through a preset snapshot; add the
  // first writable one so create/install can target it when the UI offers it.
  try {
    const scan = await scanAll(ctx, cwd)
    const custom = scan.locations.find((location) => location.id === 'custom')
    if (custom !== undefined && custom.writable === true && custom.absPath !== '' && custom.exists) {
      roots.custom = custom.absPath
    }
  } catch {
    /* no custom root is a valid state */
  }
  return roots
}

const ALLOWED_ERROR_STATUSES = new Set([400, 403, 404, 409, 500, 502])

/**
 * Contract §4.4 error-code → HTTP status table. The code mapping wins over any upstream
 * status: a source answering HTTP 404 must surface as `502 E_SOURCE_HTTP`, not `404`.
 */
const STATUS_BY_CODE = Object.freeze({
  E_BAD_REQUEST: 400,
  E_NAME_INVALID: 400,
  E_NAME_MISMATCH: 400,
  E_FRONTMATTER: 400,
  E_TOO_LARGE: 400,
  // Per the v1.3 table this is the one `E_SOURCE_*` code that is a client input error.
  E_SOURCE_URL_INVALID: 400,
  E_SKILL_UNKNOWN: 400,
  E_VERSION_UNKNOWN: 400,
  E_VERSION_YANKED: 400,
  E_NO_COMPATIBLE: 400,
  E_UNAUTHORIZED: 403,
  E_PATH_OUTSIDE_ROOT: 403,
  E_READONLY_LOCATION: 403,
  E_NOT_FOUND: 404,
  E_NAME_TAKEN: 409,
  E_CONFLICT_MTIME: 409,
  E_CANCELED: 409,
  E_STALE_PAGE: 409,
  E_VERSION_MUTATED: 409,
  E_SOURCE_UNREACHABLE: 502,
  E_SOURCE_SCHEMA: 502,
  E_SOURCE_HTTP: 502,
  E_SOURCE_TOO_LARGE: 502,
  E_INDEX_INVALID: 502,
  E_INDEX_VERSION: 502,
  E_CHECKSUM: 502,
  E_NOT_ENOUGH_SPACE: 500,
  E_INTERNAL: 500,
})

function statusFor(error) {
  const code = typeof error?.code === 'string' ? error.code : ''
  if (Object.prototype.hasOwnProperty.call(STATUS_BY_CODE, code)) return STATUS_BY_CODE[code]
  // Any other source-fetch code is a bad gateway, never the upstream's own status.
  if (code.startsWith('E_SOURCE_')) return 502
  // Only an unknown code may fall back to an upstream status, and only inside the
  // contract's whitelist; everything else is an internal error.
  if (typeof error?.status === 'number' && Number.isFinite(error.status)) {
    const explicit = Math.trunc(error.status)
    if (ALLOWED_ERROR_STATUSES.has(explicit)) return explicit
  }
  return 500
}

function respondError(res, error) {
  if (res.writableEnded === true) return
  const known = error instanceof ApiError
    || (typeof MarketIndexError === 'function' && error instanceof MarketIndexError)
  const code = known && typeof error.code === 'string' && error.code !== ''
    ? error.code
    : (typeof error?.code === 'string' && error.code !== '' ? error.code : 'E_INTERNAL')
  const extra = {}
  if (isObject(error?.extra)) Object.assign(extra, error.extra)
  if (typeof error?.path === 'string') extra.path = error.path
  if (typeof error?.file === 'string') extra.file = error.file
  fail(res, statusFor(error), code, message(error).slice(0, 1000), extra)
}

async function readJsonBody(req, limit) {
  const raw = await readBody(req, limit)
  if (raw.trim() === '') return {}
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ApiError('E_BAD_REQUEST', 'request body must be valid JSON', {}, 400)
  }
  if (!isObject(parsed)) {
    throw new ApiError('E_BAD_REQUEST', 'request body must be a JSON object', {}, 400)
  }
  return parsed
}

function requireString(value, field) {
  const result = text(value)
  if (result === '') throw new ApiError('E_BAD_REQUEST', `${field} is required`, {}, 400)
  return result
}

// ---------------------------------------------------------------------------
// Market view mapping
// ---------------------------------------------------------------------------

function localized(value) {
  if (typeof value === 'string') return value
  if (isObject(value)) {
    if (typeof value.zh === 'string' && value.zh !== '') return value.zh
    if (typeof value.en === 'string' && value.en !== '') return value.en
    for (const candidate of Object.values(value)) {
      if (typeof candidate === 'string' && candidate !== '') return candidate
    }
  }
  return ''
}

/**
 * Optional `descriptionByLocale` spread for a market view. Legacy plain-string
 * descriptions carry no locale information, so the field is omitted entirely.
 */
function descriptionByLocaleField(value) {
  const pair = localizedPair(value)
  return pair === null ? {} : { descriptionByLocale: pair }
}

function titleByLocaleField(value) {
  const pair = localizedPair(value)
  return pair === null ? {} : { titleByLocale: pair }
}

/**
 * Resolve one index `icon` value into an absolute URL the browser can load.
 * `data:image/*` passes through; a relative reference resolves against the index
 * URL. The result must be https, or same-origin with the index (spec §10).
 */
function iconField(value, indexUrl) {
  if (typeof value !== 'string' || value.trim() === '') return {}
  const raw = value.trim()
  if (/^data:image\//iu.test(raw)) return { icon: raw }
  let base = null
  if (typeof indexUrl === 'string' && indexUrl !== '') {
    try { base = new URL(indexUrl) } catch { base = null }
  }
  let resolved
  try { resolved = new URL(raw, base ?? undefined) } catch { return {} }
  if (resolved.protocol === 'https:') return { icon: resolved.href }
  if (base !== null && resolved.origin === base.origin) return { icon: resolved.href }
  return {}
}

function indexOfResult(result) {
  if (!isObject(result)) return result
  if (result.index !== undefined) return result.index
  if (result.document !== undefined) return result.document
  if (result.data !== undefined) return result.data
  return result
}

function warningsOf(result) {
  return Array.isArray(result?.warnings) ? result.warnings.filter((entry) => typeof entry === 'string') : []
}

function normalizeIndex(result, url) {
  const candidate = indexOfResult(result)
  if (isObject(candidate) && Array.isArray(candidate.skills)) return candidate
  if (typeof validateIndex === 'function') {
    const checked = validateIndex(candidate, url)
    return checked?.index ?? checked
  }
  return candidate
}

/**
 * The version the UI installs by default: the highest compatible stable version, falling
 * back to the highest compatible prerelease, and `null` when nothing is compatible with
 * the running DSH (`search.mjs` implements the selection). Compatibility is advisory when
 * the running version is unknown, which is handled inside `defaultMarketVersion`.
 */
function defaultVersionOf(entry, dshVersion) {
  return defaultMarketVersion(entry, dshVersion ?? null) ?? null
}

function versionOf(entry, wanted, dshVersion) {
  if (typeof wanted === 'string' && wanted !== '') {
    const versions = Array.isArray(entry?.versions) ? entry.versions : []
    return versions.find((version) => version?.version === wanted) ?? null
  }
  return defaultVersionOf(entry, dshVersion)
}

function sourceNameOf(source, index) {
  if (typeof source?.name === 'string' && source.name !== '') return source.name
  const title = localized(index?.title)
  return title !== '' ? title : text(source?.url)
}

function marketSkillView(entry, context) {
  const version = context.version ?? defaultVersionOf(entry, context.dshVersion)
  const metadata = isObject(entry?.metadata) ? entry.metadata : {}
  const labels = Array.isArray(metadata.labels) ? metadata.labels.filter((label) => typeof label === 'string') : []
  const tags = [...new Set([
    ...(typeof metadata.category === 'string' && metadata.category !== '' ? [metadata.category] : []),
    ...labels,
  ])]
  // Same-name skills from different sources are distinct: only match a record
  // from this source. Legacy records without `sourceId` fall back to name.
  const installed = Array.isArray(context.installed)
    ? context.installed.find((record) => {
        if (record?.name !== entry?.name) return false
        const recordSourceId = typeof record?.sourceId === 'string' ? record.sourceId : ''
        return recordSourceId === '' || recordSourceId === context.source?.id
      })
    : undefined
  // P2-7: an update only applies to a skill installed from the same source. Without an
  // install record for this source there is no update to offer, and a same-name row from
  // another source must never leak across.
  const updateSourceId = typeof context.source?.id === 'string' ? context.source.id : ''
  const update = (installed !== undefined && Array.isArray(context.updates?.updates))
    ? context.updates.updates.find((row) => (
      row?.name === entry?.name
      && row?.sourceId === updateSourceId
      && row?.location === installed.location
      // Cross-project isolation: an update row belongs to one install root only.
      && String(row?.rootPath ?? '') === String(installed?.rootPath ?? '')
    ))
    : undefined

  return {
    id: `${context.source.id}:${entry?.name ?? ''}`,
    name: typeof entry?.name === 'string' ? entry.name : '',
    title: localized(entry?.title) || (typeof entry?.name === 'string' ? entry.name : ''),
    ...titleByLocaleField(entry?.title),
    description: localized(entry?.description),
    ...descriptionByLocaleField(entry?.description),
    ...iconField(entry?.icon, context.source?.url),
    version: typeof version?.version === 'string' ? version.version : '',
    tags,
    author: typeof entry?.author === 'string' ? entry.author : '',
    license: typeof entry?.license === 'string' ? entry.license : '',
    homepage: typeof entry?.homepage === 'string' ? entry.homepage : '',
    sourceId: context.source.id,
    sourceName: sourceNameOf(context.source, context.index),
    sourceUrl: text(context.source.url),
    commit: typeof version?.source?.commit === 'string' ? version.source.commit : '',
    files: Array.isArray(version?.files)
      ? version.files.map((file) => ({
          path: typeof file?.path === 'string' ? file.path : '',
          sha256: typeof file?.sha256 === 'string' ? file.sha256 : '',
          size: Number.isFinite(file?.size) ? file.size : 0,
        }))
      : [],
    publishTimestamp: Number.isFinite(version?.publishTimestamp) ? version.publishTimestamp : 0,
    enginesDsh: typeof version?.engines?.dsh === 'string' ? version.engines.dsh : '',
    ...(installed === undefined ? {} : {
      installed: {
        location: installed.location,
        version: typeof installed.version === 'string' ? installed.version : '',
        modified: installed.localModified === true,
        ...(typeof update?.available === 'string' ? { updateAvailable: update.available } : {}),
      },
    }),
  }
}

/**
 * The market-list projection (contract §3.4 `MarketSkillView`). The richer
 * `marketSkillView` above stays reserved for `GET /market/skill` details.
 */
function marketListView(entry, context) {
  const version = defaultVersionOf(entry, context.dshVersion)
  const metadata = isObject(entry?.metadata) ? entry.metadata : {}
  const labels = Array.isArray(metadata.labels) ? metadata.labels.filter((label) => typeof label === 'string') : []
  const tags = [...new Set([
    ...(typeof metadata.category === 'string' && metadata.category !== '' ? [metadata.category] : []),
    ...labels,
  ])]
  // Same-name skills from different sources are distinct: only match a record
  // from this source. Legacy records without `sourceId` fall back to name.
  const installed = Array.isArray(context.installed)
    ? context.installed.find((record) => {
        if (record?.name !== entry?.name) return false
        const recordSourceId = typeof record?.sourceId === 'string' ? record.sourceId : ''
        return recordSourceId === '' || recordSourceId === context.sourceId
      })
    : undefined
  // P2-7: `updateAvailable` requires the same name *and* the same source id *and* an
  // install record. A same-name skill from another source never produces an update.
  const update = (installed !== undefined && Array.isArray(context.updates?.updates))
    ? context.updates.updates.find((row) => (
      row?.name === entry?.name
      && row?.sourceId === context.sourceId
      && row?.location === installed.location
      // Cross-project isolation: an update row belongs to one install root only.
      && String(row?.rootPath ?? '') === String(installed?.rootPath ?? '')
    ))
    : undefined
  const installedVersion = installed !== undefined && typeof installed.version === 'string' && installed.version !== ''
    ? installed.version
    : null
  return {
    sourceId: context.sourceId,
    name: typeof entry?.name === 'string' ? entry.name : '',
    version: typeof version?.version === 'string' ? version.version : '',
    description: localized(entry?.description),
    ...titleByLocaleField(entry?.title),
    ...descriptionByLocaleField(entry?.description),
    ...iconField(entry?.icon, context.source?.url),
    tags,
    installed: installed !== undefined,
    installedVersion,
    updateAvailable: typeof update?.available === 'string' && update.available !== '' ? update.available : null,
  }
}

// ---------------------------------------------------------------------------
// SKILL.md body fetching (market detail)
// ---------------------------------------------------------------------------

/** Overall timeout for one SKILL.md download (headers + body). */
const SKILL_MD_TIMEOUT_MS = 15_000
/** Upper bound on cached bodies; one body is at most `MAX_SKILL_MD_BYTES`. */
const SKILL_MD_CACHE_MAX = 64
/** A failed download is remembered briefly so a dead URL does not retry on every open. */
const SKILL_MD_ERROR_TTL_MS = 60_000

/** Validate a file URL from the index: absolute http(s), no credentials, no fragment. */
function checkSkillMarkdownUrl(url) {
  if (typeof url !== 'string' || url === '') throw new Error('SKILL.md URL is missing')
  if (url.length > 2048) throw new Error('SKILL.md URL is too long')
  if (/\s/.test(url)) throw new Error('SKILL.md URL contains whitespace')

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('SKILL.md URL is not absolute')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('SKILL.md URL must use http(s)')
  }
  if (parsed.username || parsed.password) throw new Error('SKILL.md URL must not contain credentials')
  if (parsed.hash || url.includes('#')) throw new Error('SKILL.md URL must not contain a fragment')
  return parsed.href
}

/** Read a response body with a hard byte cap, then decode it as strict UTF-8. */
async function readSkillMarkdownBody(response) {
  const contentLength = Number(response.headers?.get?.('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_SKILL_MD_BYTES) {
    throw new Error(`SKILL.md exceeds ${MAX_SKILL_MD_BYTES} bytes`)
  }

  const chunks = []
  let total = 0
  const push = (chunk) => {
    total += chunk.byteLength
    if (total > MAX_SKILL_MD_BYTES) throw new Error(`SKILL.md exceeds ${MAX_SKILL_MD_BYTES} bytes`)
    chunks.push(chunk)
  }

  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue
        try {
          push(Buffer.from(value))
        } catch (error) {
          try {
            await reader.cancel()
          } catch {
            /* ignore cancellation errors */
          }
          throw error
        }
      }
    } finally {
      try {
        reader.releaseLock?.()
      } catch {
        /* ignore */
      }
    }
  } else if (typeof response.arrayBuffer === 'function') {
    push(Buffer.from(await response.arrayBuffer()))
  } else {
    throw new Error('SKILL.md response has no readable body')
  }

  let body
  try {
    body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
  } catch {
    throw new Error('SKILL.md body is not valid UTF-8')
  }
  if (body.charCodeAt(0) === 0xfeff) body = body.slice(1)
  return body
}

/**
 * Create the in-memory SKILL.md reader used by `GET /market/skill`.
 *
 * The cache key is `sourceId + skill name + version + sha256`: the digest identifies the
 * immutable file content, so a hit never needs the network. Successes stay cached (LRU,
 * bounded); failures are kept for `SKILL_MD_ERROR_TTL_MS` and always resolve to
 * `{ content: '', error }` so a missing body never fails the detail request.
 *
 * `fetchImpl` and `now` are injectable for tests.
 *
 * @param {{ fetchImpl?: typeof fetch, now?: () => number }} [options]
 * @returns {{
 *   read: (file: { sourceId: string, name: string, version: string, sha256: string, url: string }) =>
 *     Promise<{ content: string, error: string }>,
 *   invalidate: (key: string) => void,
 *   dispose: () => void,
 * }}
 */
export function createSkillMarkdownReader({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('createSkillMarkdownReader requires a fetch implementation')

  /** @type {Map<string, { content: string, error: string, failedAt: number }>} */
  const cache = new Map()
  /** @type {Map<string, Promise<{ content: string, error: string }>>} */
  const inflight = new Map()

  const keyOf = ({ sourceId, name, version, sha256 }) => (
    `${sourceId ?? ''}\u0000${name ?? ''}\u0000${version ?? ''}\u0000${sha256 ?? ''}`
  )

  const readCache = (key) => {
    const entry = cache.get(key)
    if (entry === undefined) return undefined
    if (entry.error !== '' && now() - entry.failedAt >= SKILL_MD_ERROR_TTL_MS) {
      cache.delete(key)
      return undefined
    }
    // Refresh recency so the bound below drops the least recently used entry.
    cache.delete(key)
    cache.set(key, entry)
    return entry
  }

  const writeCache = (key, entry) => {
    cache.delete(key)
    cache.set(key, entry)
    while (cache.size > SKILL_MD_CACHE_MAX) {
      const oldest = cache.keys().next()
      if (oldest.done) break
      cache.delete(oldest.value)
    }
  }

  async function download(url) {
    const href = checkSkillMarkdownUrl(url)
    const timeoutSignal = AbortSignal.timeout(SKILL_MD_TIMEOUT_MS)
    let response
    try {
      response = await fetchImpl(href, {
        redirect: 'error',
        signal: timeoutSignal,
        headers: { accept: 'text/markdown, text/plain;q=0.9, */*;q=0.1' },
      })
    } catch (error) {
      if (timeoutSignal.aborted) throw new Error(`SKILL.md download timed out after ${SKILL_MD_TIMEOUT_MS} ms`)
      const reason = String(error?.message || error || 'fetch failed')
      if (/redirect/i.test(reason)) throw new Error('redirects are not allowed')
      throw new Error(reason)
    }

    if (!response || typeof response !== 'object') throw new Error('fetch returned no response')
    if (response.status !== 200) throw new Error(`unexpected HTTP status ${response.status}`)
    return readSkillMarkdownBody(response)
  }

  async function load(key, url) {
    let result
    try {
      result = { content: await download(url), error: '' }
    } catch (error) {
      result = { content: '', error: message(error) }
    }
    writeCache(key, { ...result, failedAt: result.error === '' ? 0 : now() })
    return result
  }

  const read = (file) => {
    const key = keyOf(isObject(file) ? file : {})
    const cached = readCache(key)
    if (cached !== undefined) return Promise.resolve({ content: cached.content, error: cached.error })
    const url = typeof file?.url === 'string' ? file.url : ''
    if (url === '') return Promise.resolve({ content: '', error: 'SKILL.md file has no URL' })

    const existing = inflight.get(key)
    if (existing !== undefined) return existing
    const promise = load(key, url).finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key)
    })
    inflight.set(key, promise)
    return promise
  }

  return {
    read,
    invalidate: (key) => { cache.delete(key) },
    dispose: () => { cache.clear(); inflight.clear() },
  }
}

/** Locate the root-level `SKILL.md` file record in a version entry. */
function skillMarkdownFileOf(version) {
  const files = Array.isArray(version?.files) ? version.files : []
  return files.find((file) => isObject(file) && file.path === 'SKILL.md')
}

/**
 * Resolve the `tag` query parameter against one index. A tag is a declared label or
 * category; a source that declares neither contributes no rows (contract v1 §4).
 * Returns `null` when the source must contribute nothing.
 */
function tagQueryFor(index, tag) {
  if (tag === '' || tag === 'all') return {}
  const categories = isObject(index?.metadata?.categories) ? index.metadata.categories : {}
  const labels = isObject(index?.metadata?.labels) ? index.metadata.labels : {}
  const tagIsCategory = Object.prototype.hasOwnProperty.call(categories, tag)
  const tagIsLabel = Object.prototype.hasOwnProperty.call(labels, tag)
  if (!tagIsCategory && !tagIsLabel) return null
  return {
    ...(tagIsLabel ? { labels: [tag] } : {}),
    ...(tagIsCategory ? { category: tag } : {}),
  }
}

/**
 * The market cursor is opaque to the client: a base64url JSON map of
 * `sourceId -> next offset`, so every block pages independently.
 */
function encodeMarketCursor(offsets) {
  const entries = Object.entries(offsets).filter(([, offset]) => (
    Number.isFinite(offset) && Number(offset) > 0
  ))
  if (entries.length === 0) return null
  const payload = { v: 1, o: Object.fromEntries(entries.map(([id, offset]) => [id, Math.trunc(offset)])) }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeMarketCursor(value) {
  if (typeof value !== 'string' || value === '') return {}
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (!isObject(parsed) || !isObject(parsed.o)) return {}
    const offsets = {}
    for (const [id, offset] of Object.entries(parsed.o)) {
      const number = Number(offset)
      if (Number.isFinite(number) && number >= 0) offsets[id] = Math.trunc(number)
    }
    return offsets
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// Installed view mapping (contract §3.1 / §3.2)
// ---------------------------------------------------------------------------

/** Category mapping is Host-owned; the scanner may already provide it. */
function categoryForSkill(skill) {
  if (typeof skill?.category === 'string' && SKILL_CATEGORIES.includes(skill.category)) return skill.category
  const location = typeof skill?.location === 'string' ? skill.location : ''
  const writable = skill?.writable === true
  switch (location) {
    case 'user-dsh':
      return 'mine'
    case 'custom':
      return writable ? 'mine' : 'system'
    case 'user-agents':
      return 'shared'
    case 'project-dsh':
    case 'project-agents':
      return 'project'
    case 'preset':
    case 'bundled':
    default:
      return 'system'
  }
}

function sourceFieldsOf(skill) {
  const market = isObject(skill?.market) ? skill.market : {}
  const sourceId = typeof skill?.sourceId === 'string' && skill.sourceId !== ''
    ? skill.sourceId
    : (typeof market.sourceId === 'string' && market.sourceId !== '' ? market.sourceId : null)
  const sourceName = typeof skill?.sourceName === 'string' && skill.sourceName !== ''
    ? skill.sourceName
    : (typeof market.sourceName === 'string' && market.sourceName !== '' ? market.sourceName : null)
  return { sourceId, sourceName }
}

/**
 * Normalise one scanner skill into the contract's `SkillView`. H1's scanner is the
 * primary producer; this fills any field it has not added yet so the wire shape stays
 * stable during the parallel rollout.
 */
function skillView(skill) {
  const market = isObject(skill?.market) ? skill.market : {}
  const { sourceId, sourceName } = sourceFieldsOf(skill)
  const updateAvailable = typeof skill?.updateAvailable === 'string' && skill.updateAvailable !== ''
    ? skill.updateAvailable
    : (typeof market.updateAvailable === 'string' && market.updateAvailable !== '' ? market.updateAvailable : null)
  const version = typeof skill?.version === 'string' && skill.version !== ''
    ? skill.version
    : (typeof market.version === 'string' && market.version !== '' ? market.version : null)
  return {
    ...skill,
    id: typeof skill?.id === 'string' ? skill.id : '',
    name: typeof skill?.name === 'string' ? skill.name : '',
    description: typeof skill?.description === 'string' ? skill.description : '',
    whenToUse: typeof skill?.whenToUse === 'string' && skill.whenToUse !== '' ? skill.whenToUse : null,
    category: categoryForSkill(skill),
    location: typeof skill?.location === 'string' ? skill.location : '',
    sourceId,
    sourceName,
    version,
    author: typeof skill?.author === 'string' && skill.author !== '' ? skill.author : null,
    path: typeof skill?.path === 'string' && skill.path !== '' ? skill.path : null,
    mtime: Number.isFinite(skill?.mtime) ? skill.mtime : 0,
    status: typeof skill?.status === 'string' ? skill.status : 'active',
    writable: skill?.writable === true,
    updateAvailable,
    brokenReason: typeof skill?.brokenReason === 'string' && skill.brokenReason !== '' ? skill.brokenReason : null,
  }
}

function categoryCounts(skills) {
  const counts = { mine: 0, shared: 0, project: 0, system: 0 }
  for (const skill of skills) {
    if (counts[skill.category] !== undefined) counts[skill.category] += 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// State / update service adapters (tolerant of a service returning promises)
// ---------------------------------------------------------------------------

async function readSources(store) {
  if (store === null || store === undefined || typeof store.listSources !== 'function') return []
  try {
    const sources = await store.listSources()
    return Array.isArray(sources) ? sources : []
  } catch {
    return []
  }
}

async function readInstalled(store) {
  if (store === null || store === undefined || typeof store.listInstalled !== 'function') return []
  try {
    const installed = await store.listInstalled()
    return Array.isArray(installed) ? installed : []
  } catch {
    return []
  }
}

function updateStateOf(checker) {
  if (checker === null || checker === undefined || typeof checker.getState !== 'function') {
    return emptyUpdateState()
  }
  try {
    const state = checker.getState()
    return isObject(state) ? state : emptyUpdateState()
  } catch {
    return emptyUpdateState()
  }
}

async function checkUpdatesOf(checker, options) {
  if (checker === null || checker === undefined || typeof checker.check !== 'function') {
    throw new ApiError('E_INTERNAL', 'the update module does not expose check()', {}, 500)
  }
  const state = await checker.check(isObject(options) ? options : {})
  return isObject(state) ? state : emptyUpdateState()
}

/**
 * How long a transient "checking" mark stays visible. The mark is written before a route
 * awaits its index read and cleared when that read settles; this deadline is only the
 * safety net for the paths a `finally` cannot reach (a handler whose promise was abandoned
 * mid-await because the client navigated away, a request dropped with its response stream).
 *
 * It has to sit *above* the fetch budget the guarded read can spend, otherwise a slow but
 * healthy source would stop looking busy while it is still being checked. `fetchIndex`
 * bounds one read at `FETCH_TIMEOUT_MS` (15 s), so the window is that plus one round trip.
 */
const SOURCE_CHECKING_TTL_MS = 20_000

/**
 * Per-process source health that is not persisted in `state.json`
 * (skill counts, the transient "checking" flag and the latest fetch error).
 *
 * `checking` is a `Map<id, deadline>` rather than a `Set`: a visible "checking" state is a
 * debt every caller must be able to pay back, and a mark left by an abandoned request used
 * to stay truthy forever — the client then kept painting the source as "检查中" (a yellow
 * dot) for the rest of the process lifetime. Storing the deadline lets `view()` expire a
 * stale mark lazily (no timer, no polling) so the mark always heals on its own, while the
 * routes below still clear it deterministically the moment the read settles.
 */
function createSourceTracker() {
  const counts = new Map()
  const errors = new Map()
  const checkedAt = new Map()
  /** @type {Map<string, number>} source id -> wall-clock ms when the mark lapses */
  const checking = new Map()

  const isChecking = (id) => {
    const deadline = checking.get(id)
    if (deadline === undefined) return false
    if (Date.now() < deadline) return true
    // Lazily expire: an expired mark must never be observable again.
    checking.delete(id)
    return false
  }

  const view = (source) => {
    if (!isObject(source)) return null
    const id = typeof source.id === 'string' ? source.id : ''
    const error = errors.has(id)
      ? errors.get(id)
      : (typeof source.lastError === 'string' && source.lastError !== '' ? source.lastError : null)
    const checked = checkedAt.has(id)
      ? checkedAt.get(id)
      : (Number.isFinite(source.lastCheckedAt) ? source.lastCheckedAt : 0)
    return {
      id,
      type: 'index',
      name: typeof source.name === 'string' ? source.name : '',
      url: typeof source.url === 'string' ? source.url : '',
      enabled: source.enabled !== false,
      status: isChecking(id) ? 'checking' : (error !== null ? 'error' : 'ok'),
      skillCount: counts.get(id) ?? 0,
      lastCheckedAt: checked,
      error,
      stale: error !== null && checked > 0,
    }
  }

  return {
    view,
    viewAll: (sources) => (Array.isArray(sources) ? sources.map(view).filter((entry) => entry !== null) : []),
    markOk: (id, skillCount, at) => {
      if (typeof id !== 'string' || id === '') return
      counts.set(id, Number.isFinite(skillCount) ? skillCount : 0)
      checkedAt.set(id, Number.isFinite(at) ? at : nowSeconds())
      errors.delete(id)
      checking.delete(id)
    },
    markError: (id, text) => {
      if (typeof id !== 'string' || id === '') return
      errors.set(id, typeof text === 'string' && text !== '' ? text : 'unknown error')
      checking.delete(id)
    },
    markChecking: (id) => {
      if (typeof id === 'string' && id !== '') checking.set(id, Date.now() + SOURCE_CHECKING_TTL_MS)
    },
    markIdle: (id) => {
      if (typeof id === 'string' && id !== '') checking.delete(id)
    },
  }
}

function requireStoreMethod(store, name) {
  if (store === null || store === undefined || typeof store[name] !== 'function') {
    throw new ApiError('E_INTERNAL', `the state module does not expose ${name}()`, {}, 500)
  }
  return store[name].bind(store)
}

// ---------------------------------------------------------------------------
// Write results -> fresh SkillView
// ---------------------------------------------------------------------------

async function resolveWrittenSkill(ctx, cwd, result, hint = {}) {
  invalidateScanCache()
  if (
    isObject(result?.skill)
    && typeof result.skill.id === 'string'
    && typeof result.skill.name === 'string'
    && typeof result.skill.location === 'string'
  ) {
    return result.skill
  }

  const scan = await scanAll(ctx, cwd, { force: true })
  const wantedPath = typeof hint.path === 'string' && hint.path !== ''
    ? hint.path
    : (typeof result?.path === 'string' && result.path !== ''
      ? result.path
      : (typeof result?.skillPath === 'string' ? result.skillPath : ''))

  let found
  if (wantedPath !== '') {
    const absolute = resolve(wantedPath)
    found = scan.skills.find((skill) => skill.path !== '' && (
      skill.path === wantedPath || resolve(skill.path) === absolute
    ))
  }
  const wantedName = typeof hint.name === 'string' && hint.name !== ''
    ? hint.name
    : (typeof result?.name === 'string' ? result.name : '')
  const wantedLocation = typeof hint.location === 'string' && hint.location !== ''
    ? hint.location
    : (typeof result?.location === 'string' ? result.location : '')
  if (found === undefined && wantedName !== '') {
    found = scan.skills.find((skill) => (
      skill.name === wantedName && (wantedLocation === '' || skill.location === wantedLocation)
    ))
  }
  if (found === undefined) {
    throw new ApiError(
      'E_NOT_FOUND',
      'the written skill was not found by the scanner',
      { path: wantedPath || wantedName },
      404,
    )
  }
  return found
}

// ---------------------------------------------------------------------------
// Installed-view market metadata: read budget, fallback and failure policy
// ---------------------------------------------------------------------------

/**
 * A wait budget is *not* a failure. `/installed` is raced against a budget so a slow
 * source never delays the list; when the budget expires the reader serves the last index
 * it managed to read and the still-running fetch warms that copy. Four numbers describe
 * the whole policy:
 *
 *   - `QUICK`  a previously-read index already covers the view, so a short wait is enough
 *              to prefer a fresh copy without making the request slow;
 *   - `COLD`   nothing to fall back on: waiting for the index is strictly better than
 *              rendering the list without its display metadata;
 *   - `REFRESH` an explicit refresh asks for new data, so it waits longer;
 *   - `RETRY`  only a source that genuinely failed backs off for this long.
 */
const MARKET_INDEX_WAIT_QUICK_MS = 250
const MARKET_INDEX_WAIT_COLD_MS = 1200
const MARKET_INDEX_WAIT_REFRESH_MS = 2500
const MARKET_INDEX_RETRY_MS = 60_000
/** Sentinel resolved by the wait budget; never an error and never cached. */
const MARKET_INDEX_TIMEOUT = Symbol('skill-manager:market-index-timeout')

/**
 * Decide how one source's market index read behaves for the current request.
 *
 * A timeout only ends the *wait*: the caller still serves the previously-read index, so an
 * expired budget can never make `/installed` drop display names, descriptions or icons.
 * Only a genuine failure (network, HTTP, schema) is remembered as a back-off — a canceled
 * fetch does not count either, because `check-updates` invalidates the fetch cache (and
 * aborts its in-flight requests) right before the client reloads `/installed`; treating
 * that cancellation as a failure is exactly what used to hide the metadata for 60 s.
 *
 * Pure and exported so the selftest can pin the policy.
 *
 * @param {{ hasPrevious?: boolean, refresh?: boolean, failedAt?: number, now?: number }} [input]
 * @returns {{ action: 'read' | 'stale', budgetMs: number }} `stale` means "serve the last
 *   index that was read without waiting on the network" (`budgetMs` is then 0).
 */
export function planMarketIndexRead(input = {}) {
  const hasPrevious = input.hasPrevious === true
  const refresh = input.refresh === true
  const now = Number.isFinite(input.now) ? input.now : Date.now()
  const backingOff = Number.isFinite(input.failedAt) && now - input.failedAt < MARKET_INDEX_RETRY_MS
  // An explicit refresh asks for new data, so it always waits and never reuses quietly.
  if (refresh) return { action: 'read', budgetMs: MARKET_INDEX_WAIT_REFRESH_MS }
  // A previous index already covers the view: a short wait prefers a fresh copy, and a
  // timed-out read still returns that previous index, so the view never loses metadata.
  if (hasPrevious) {
    return backingOff
      ? { action: 'stale', budgetMs: 0 }
      : { action: 'read', budgetMs: MARKET_INDEX_WAIT_QUICK_MS }
  }
  // Nothing to fall back on: waiting is strictly better than rendering the list without
  // its display metadata — and that holds *even* for a source that failed before. A
  // back-off only pays off when there is a copy to serve, so it must never turn a cold
  // view into an instant, permanently empty one: with no previous index, `stale` would
  // return `null` and the list would render without icons until the back-off expired.
  return { action: 'read', budgetMs: MARKET_INDEX_WAIT_COLD_MS }
}

/**
 * The copy to remember for one source, built from a freshly read index. `null` means the
 * read produced nothing usable, in which case the caller keeps the copy it already had.
 *
 * The copy keeps the URL it was read from. That is what stops a source whose URL was
 * edited from serving the previous source's metadata, and it is the same identity
 * `marketIndexFromCache` checks on the way back out.
 *
 * Pure and exported so the selftest can pin the shape.
 *
 * @param {unknown} index a normalized market index
 * @param {{ sourceId?: unknown, url?: unknown }} [target]
 * @returns {{ url: string, skills: object[] } | null}
 */
export function marketIndexCopyOf(index, target = {}) {
  const sourceId = target.sourceId
  const url = target.url
  if (typeof sourceId !== 'string' || sourceId === '') return null
  if (typeof url !== 'string' || url === '') return null
  if (index === null || typeof index !== 'object') return null
  if (!Array.isArray(index.skills)) return null
  return { url, skills: index.skills }
}

/**
 * A previously-read index as a `marketIndexes` entry. It only applies to the source URL it
 * was read from, so editing a source URL never serves another index's metadata. `null`
 * means "no usable fallback", which keeps the entry out of the scan options entirely.
 *
 * @param {unknown} cached the entry remembered for this source id
 * @param {{ sourceId?: unknown, url?: unknown }} [target]
 * @returns {{ sourceId: string, url: string, skills: object[] } | null}
 */
export function marketIndexFromCache(cached, target = {}) {
  if (cached === null || typeof cached !== 'object') return null
  const sourceId = target.sourceId
  const url = target.url
  if (typeof sourceId !== 'string' || sourceId === '') return null
  if (typeof url !== 'string' || url === '') return null
  if (cached.url !== url) return null
  if (!Array.isArray(cached.skills)) return null
  return { sourceId, url, skills: cached.skills }
}

/**
 * Whether a failed index read was a cancellation rather than a source failure. The index
 * fetcher aborts in-flight requests when `check-updates` drops the cache; that abort says
 * nothing about the source's health, so it must not start a back-off.
 *
 * @param {unknown} error
 */
export function isCanceledMarketIndexError(error) {
  if (error === null || typeof error !== 'object') return false
  return error.code === 'E_CANCELED'
}

/**
 * Whether one canceled index read deserves a second attempt.
 *
 * `check-updates` drops the index fetch cache — aborting the requests that are in flight —
 * immediately before the client reloads `/installed`. That abort is not the source's fault,
 * and the read it interrupted was probably mid-flight when it happened. With no previous
 * index to serve, giving up would render the whole list without its market icons; one
 * retry settles the race with a fresh request instead of an empty view.
 *
 * A retry is pointless when a previous index exists (the caller serves that copy) because
 * the fallback already covers the view.
 *
 * Pure and exported so the selftest can pin the policy.
 *
 * @param {{ error?: unknown, hasPrevious?: boolean }} [input]
 * @returns {boolean} true when a canceled read should be attempted once more
 */
export function shouldRetryCanceledMarketIndexRead(input = {}) {
  if (input.hasPrevious === true) return false
  return isCanceledMarketIndexError(input.error)
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * 读取宿主「设置 → 通用设置 → 字号大小」：ui-theme 在 patch 层声明 fontSize，
 * profile 层优先、home 层兜底。patch 里可能有 {{SECRET_x}} 等无法解析的写法，
 * 因此用文本正则定位，而不是整文件 YAML 解析。
 */
async function themeFontSize() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  const files = []
  if (process.env.DSH_PROFILE_DIR) files.push(join(process.env.DSH_PROFILE_DIR, 'cordis.patch.yml'))
  if (process.env.DSH_PROFILE) files.push(join(home, 'profiles', process.env.DSH_PROFILE, 'cordis.patch.yml'))
  /* 当前 profile 之后直接回退 home，再退到其它 profile，避免串读无关 profile 的字号。 */
  files.push(join(home, 'cordis.patch.yml'))
  for (const name of ['desktop', 'web', 'headless']) files.push(join(home, 'profiles', name, 'cordis.patch.yml'))
  for (const file of files) {
    const raw = await readFile(file, 'utf8').catch(() => '')
    if (raw.trim() === '') continue
    /* 去掉整行注释，避免匹配到被注释掉的 fontSize。 */
    const content = raw.split(/\r?\n/u).filter((line) => !/^\s*#/u.test(line)).join('\n')
    /* 只取 `- id: ui-theme` 到下一个 `- id:` 之间的配置段，精确匹配 ID（不吞 ui-theme-extra）。 */
    const blockRe = /(?:^|\n)[ \t]*-[ \t]+id:[ \t]*['"]?ui-theme['"]?[ \t]*(?:\r?\n([\s\S]*?))?(?=\n[ \t]*-[ \t]+id:|$)/u
    const block = blockRe.exec(content)
    if (block === null) continue
    const match = /\bfontSize:[ \t]*(\d{1,3})\b/u.exec(block[1] ?? '')
    if (match === null) continue
    const size = Number(match[1])
    if (Number.isInteger(size) && size >= 10 && size <= 24) return size
  }
  return null
}

/**
 * @param {object} ctx owning Cordis context (`webServer`, `connection`, `timer`)
 * @param {object} [config] the Loader row config, merged over DEFAULTS
 */
export function apply(ctx, config) {
  const settings = mergeConfig(config)
  const dshVersion = runningDshVersion(settings)
  const state = createState({ home: settings.home !== '' ? settings.home : undefined })
  const indexFetcher = createIndexFetcher()
  const fetchIndex = indexFetcher.fetchIndex
  const skillMarkdown = createSkillMarkdownReader()

  /**
   * Installed views need each install record's market index entries to expose the optional
   * `displayNameByLocale` / `descriptionByLocale` / `iconUrl`. Indexes come from the same
   * 10-minute cache `/market` uses, so the usual case is a memory hit.
   *
   * A slow source must not delay `/installed`, but a budget expiry must also never cost the
   * view its metadata. Two properties give that guarantee:
   *
   *   - every source keeps the last index it read (`lastGoodIndexes`), and a read that times
   *     out serves that copy instead of nothing (stale-while-revalidate). The still-running
   *     fetch warms the cache and the copy for the next request;
   *   - only a genuine source failure starts the back-off. A canceled fetch does not,
   *     because `check-updates` drops the fetch cache (aborting in-flight reads) right
   *     before the client reloads `/installed`.
   *
   * The policy numbers live next to `planMarketIndexRead`, the pure decision helper.
   */
  /** @type {Map<string, { url: string, skills: object[], fetchedAt: number }>} */
  const lastGoodIndexes = new Map()
  /** @type {Map<string, number>} source id -> when a genuine failure was last seen */
  const descriptionIndexFailures = new Map()

  const readMarketIndexes = async (sources, refresh = false) => {
    const list = Array.isArray(sources) ? sources : []
    const now = Date.now()
    const results = await Promise.all(list.map(async (source) => {
      if (!isObject(source) || typeof source.id !== 'string' || source.id === '') return null
      if (typeof source.url !== 'string' || source.url === '') return null
      const sourceId = source.id
      const sourceUrl = source.url
      const fallback = () => marketIndexFromCache(lastGoodIndexes.get(sourceId), { sourceId, url: sourceUrl })
      const plan = planMarketIndexRead({
        hasPrevious: fallback() !== null,
        refresh,
        failedAt: descriptionIndexFailures.get(sourceId),
        now,
      })
      if (plan.action === 'stale') return fallback()

      const remember = (index) => {
        if (!isObject(index) || !Array.isArray(index.skills)) return null
        lastGoodIndexes.set(sourceId, { url: sourceUrl, skills: index.skills, fetchedAt: Date.now() })
        descriptionIndexFailures.delete(sourceId)
        return { sourceId, url: sourceUrl, skills: index.skills }
      }
      const recordFailure = (error) => {
        if (!isCanceledMarketIndexError(error)) descriptionIndexFailures.set(sourceId, Date.now())
      }

      /**
       * One bounded read. A budget expiry resolves the sentinel instead of rejecting, so the
       * caller can tell "the wait ended" apart from "the source failed".
       */
      const readWithBudget = (attemptRefresh, budgetMs) => {
        let timer
        const timeout = new Promise((resolve) => {
          timer = setTimeout(() => resolve(MARKET_INDEX_TIMEOUT), budgetMs)
          if (typeof timer.unref === 'function') timer.unref()
        })
        const pending = fetchIndex(sourceUrl, { refresh: attemptRefresh })
        // Whatever the wait did, the settled fetch updates the shared state exactly the same
        // way: a late success warms the copy the next `/installed` falls back on, a late
        // failure starts the back-off. Recording it twice is harmless and keeps the code
        // flat. This observer must never throw: a rejected normalizeIndex would otherwise
        // surface as an unhandled rejection because the race has already returned.
        pending.then(
          (result) => {
            try { remember(normalizeIndex(result, sourceUrl)) } catch { /* the next read retries */ }
          },
          (error) => {
            try { recordFailure(error) } catch { /* back-off bookkeeping only */ }
          },
        ).catch(() => { /* the observer is best-effort; the request path owns failures */ })
        return Promise.race([pending, timeout]).finally(() => { clearTimeout(timer) })
      }

      try {
        const result = await readWithBudget(refresh, plan.budgetMs)
        // The budget expiring is not a failure: serve the last index that was read, and let
        // the fetch that is still running refresh it for the next request.
        if (result === MARKET_INDEX_TIMEOUT) return fallback()
        // `fetchIndex` keeps the last good index when a refresh fails; that is still the
        // best metadata we have, so only the index shape decides.
        return remember(normalizeIndex(result, sourceUrl)) ?? fallback()
      } catch (error) {
        // A canceled read says nothing about the source's health, and it is exactly what
        // `check-updates` causes: it drops the fetch cache (aborting in-flight requests) a
        // moment before the client reloads `/installed`. Without a copy to fall back on, one
        // retry is what keeps that window from costing every icon in the list.
        if (shouldRetryCanceledMarketIndexRead({ error, hasPrevious: fallback() !== null })) {
          try {
            const retried = await readWithBudget(false, MARKET_INDEX_WAIT_COLD_MS)
            if (retried !== MARKET_INDEX_TIMEOUT) {
              const index = remember(normalizeIndex(retried, sourceUrl))
              if (index !== null) return index
            }
          } catch (retryError) {
            recordFailure(retryError)
          }
        }
        recordFailure(error)
        // A failed read is exactly when the last good index matters most.
        return fallback()
      }
    }))
    return results.filter((entry) => entry !== null)
  }

  /**
   * Re-read every source's index without a budget and remember it as the fallback copy.
   *
   * `POST /check-updates` ends by calling `indexFetcher.invalidate(url)` on every healthy
   * source — it drops the 10-minute fetch cache *and* aborts the reads that are in flight —
   * and only then does the client reload `/installed`. On a warm process the previous copy
   * in `lastGoodIndexes` covers that window, but on a cold one (`lastGoodIndexes` empty,
   * which is every freshly started Host) the reload had nothing to fall back on: it
   * started a brand-new 15 s-bounded fetch and gave up after the cold budget, so the list
   * came back without icons.
   *
   * Taking the copy *before* the invalidation is what closes that hole, and starting it
   * alongside the check (not after it) is what keeps the route as fast as it was: the
   * checker keeps its own index cache, so a sequential read would pay the source twice.
   *
   * A copy is only bookkeeping: a failed or canceled read simply leaves the map untouched,
   * so the caller keeps whatever copy it already had and the next `/installed` retries.
   * Deliberately not exported — it is cache maintenance for this route, not policy.
   *
   * @param {object[]} sources
   * @returns {Promise<void>} settles once every source has been tried
   */
  const rememberIndexCopies = async (sources) => {
    const list = Array.isArray(sources) ? sources : []
    await Promise.all(list.map(async (source) => {
      if (!isObject(source) || typeof source.id !== 'string' || source.id === '') return
      if (typeof source.url !== 'string' || source.url === '') return
      try {
        // No `refresh`: the check is pulling this URL at the same time, so whichever read
        // finishes first serves the other from the 10-minute cache.
        const result = await fetchIndex(source.url)
        const copy = marketIndexCopyOf(normalizeIndex(result, source.url), { sourceId: source.id, url: source.url })
        if (copy === null) return
        lastGoodIndexes.set(source.id, { ...copy, fetchedAt: Date.now() })
        descriptionIndexFailures.delete(source.id)
      } catch {
        /* no copy is better than a wrong one; the next `/installed` retries */
      }
    }))
  }

  // Automatic update checks must use the same compatibility rules as installs, otherwise
  // they would prompt for versions the installer refuses (and vice versa).
  const updateChecker = createUpdateChecker({
    state,
    compat: { satisfiesRange, compareVersions },
    dshVersion,
  })
  const sourceTracker = createSourceTracker()

  // Contract §4.2: ids missing from the persisted order append in creation (`addedAt`)
  // order. `state.getSourceOrder()` fills them in array order, so read the persisted
  // document when the store exposes it and reconcile here.
  const persistedSourceOrder = async () => {
    if (typeof state?.file === 'string' && state.file !== '') {
      try {
        const document = JSON.parse(await readFile(state.file, 'utf8'))
        if (isObject(document) && Array.isArray(document.sourceOrder)) return document.sourceOrder
      } catch {
        /* fall through to the store accessor */
      }
    }
    if (typeof state.getSourceOrder === 'function') {
      try {
        const order = await state.getSourceOrder()
        if (Array.isArray(order)) return order
      } catch {
        /* fall through to the source list order */
      }
    }
    return []
  }
  const readSourceOrder = async () => normalizeSourceOrder(await persistedSourceOrder(), await readSources(state))
  const writeSourceOrder = async (order) => {
    const setOrder = requireStoreMethod(state, 'setSourceOrder')
    await setOrder(order)
  }

  // `/check-updates` is single-flight per scope: an all-sources check and a
  // single-source check never swallow each other, and a repeat of the same scope
  // reuses the in-flight result (contract §4.3).
  const checkUpdatesInflight = new Map()
  // Sources whose last update check failed. `/market` keeps serving their last good cache
  // but must report `stale: true` until a later check (or explicit refresh) succeeds.
  const staleSources = new Set()

  ctx.effect(() => () => {
    indexFetcher.dispose()
    skillMarkdown.dispose()
  }, 'skill-manager: index fetcher')

  /** The H3 writer/installer are cheap closures bound to the request's cwd. */
  const writerFor = async (cwd) => createWriter({ roots: await rootsFor(ctx, cwd) })
  const installerFor = async (cwd) => createInstaller({
    state,
    roots: await rootsFor(ctx, cwd),
    dshVersion,
  })

  // Load the state document once at activation (a missing file is a valid empty state).
  Promise.resolve()
    .then(() => state.read())
    .catch((error) => {
      try {
        ctx.logger?.warn?.(`skill-manager: state init failed: ${message(error)}`)
      } catch {
        /* logging must never break activation */
      }
    })

  if (settings.autoCheck) {
    try {
      // `createUpdateChecker().start(ctx)` registers its own ctx.effect and timers.
      updateChecker.start(ctx)
    } catch (error) {
      try {
        ctx.logger?.warn?.(`skill-manager: update scheduler failed: ${message(error)}`)
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Register an exact route behind the trust fence. The web server dedupes by
   * `(kind, path)`, so every method sharing a path is folded into one handler.
   */
  const routes = new Map()
  const route = (method, path, handler) => {
    let entry = routes.get(path)
    if (entry === undefined) {
      entry = { handlers: Object.create(null) }
      routes.set(path, entry)
      ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path,
        handler: async (req, res) => {
          try {
            if (rejected(ctx, req, res)) return
            const requested = String(req.method ?? '').toUpperCase()
            const target = entry.handlers[requested]
            if (typeof target !== 'function') {
              methodNotAllowed(res, Object.keys(entry.handlers).join(', '))
              return
            }
            const data = await target(req, res)
            if (res.writableEnded !== true) sendJson(res, 200, { ok: true, data: data === undefined ? null : data })
          } catch (error) {
            respondError(res, error)
          }
        },
      }), `skill-manager: ${path}`)
    }
    entry.handlers[method] = handler
  }

  /** Register the dynamic `/sources/:id` family. */
  const sourceRoute = () => {
    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: SOURCE_PREFIX,
      handler: async (req, res) => {
        try {
          if (rejected(ctx, req, res)) return
          const method = String(req.method ?? '').toUpperCase()
          let subpath = ''
          try {
            subpath = new URL(String(req.url ?? ''), 'http://localhost').pathname
              .slice(SOURCE_PREFIX.length)
              .replace(/^\/+/u, '')
              .replace(/\/+$/u, '')
          } catch {
            subpath = ''
          }
          const parts = subpath.split('/').filter((part) => part !== '')
          const id = parts.length > 0 ? decodeURIComponent(parts[0]) : ''
          const action = parts.length > 1 ? parts[1] : ''

          if (id === '') {
            methodNotAllowed(res, 'GET, POST')
            return
          }
          if (id === 'validate' && parts.length === 1) {
            if (method !== 'POST') {
              methodNotAllowed(res, 'POST')
              return
            }
            const body = await readJsonBody(req, settings.maxBodyBytes)
            const url = requireString(body.url, 'url')
            const result = await fetchIndex(url, { refresh: true, allowUnconfigured: true })
            const index = normalizeIndex(result, url)
            const skills = Array.isArray(index?.skills) ? index.skills : []
            sendJson(res, 200, {
              ok: true,
              data: {
                title: localized(index?.title) || url,
                description: localized(index?.description),
                skillCount: skills.length,
                sample: skills.slice(0, 5).map((entry) => ({
                  name: typeof entry?.name === 'string' ? entry.name : '',
                  description: localized(entry?.description),
                  version: defaultVersionOf(entry, dshVersion)?.version ?? '',
                })),
                warnings: warningsOf(result),
              },
            })
            return
          }
          if (parts.length === 1 && method === 'PUT') {
            const body = await readJsonBody(req, settings.maxBodyBytes)
            const update = requireStoreMethod(state, 'updateSource')
            const source = await update(id, {
              url: body.url === undefined ? undefined : text(body.url),
              name: body.name === undefined ? undefined : text(body.name),
              enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
            })
            sendJson(res, 200, { ok: true, data: { source: sourceTracker.view(source) } })
            return
          }
          if (parts.length === 1 && method === 'DELETE') {
            const remove = requireStoreMethod(state, 'removeSource')
            await remove(id)
            sourceTracker.markIdle(id)
            sendJson(res, 200, { ok: true, data: { removed: true } })
            return
          }
          if (parts.length === 2 && action === 'refresh' && method === 'POST') {
            const sources = await readSources(state)
            const source = sources.find((entry) => entry?.id === id)
            if (source === undefined) {
              throw new ApiError('E_NOT_FOUND', `no source with id "${id}"`, {}, 404)
            }
            sourceTracker.markChecking(id)
            try {
              const result = await fetchIndex(source.url, { refresh: true })
              if (result?.error) throw result.error
              const index = normalizeIndex(result, source.url)
              const count = Array.isArray(index?.skills) ? index.skills.length : 0
              const checkedAt = nowSeconds()
              const update = requireStoreMethod(state, 'updateSource')
              const updated = await update(id, { lastCheckedAt: checkedAt, lastError: null })
              sourceTracker.markOk(id, count, checkedAt)
              staleSources.delete(id)
              sendJson(res, 200, { ok: true, data: { source: sourceTracker.view(updated) } })
            } catch (error) {
              sourceTracker.markError(id, message(error))
              try {
                const update = requireStoreMethod(state, 'updateSource')
                await update(id, { lastError: message(error) })
              } catch {
                /* keep the original failure */
              }
              throw error
            } finally {
              // Both branches above already settle the mark; this covers the paths they
              // cannot — an aborted response, a throw from `sendJson`, a store write that
              // never resolves. `markOk`/`markError` run first, so this is a no-op then.
              sourceTracker.markIdle(id)
            }
            return
          }
          methodNotAllowed(res, 'PUT, DELETE, POST')
        } catch (error) {
          respondError(res, error)
        }
      },
    }), `skill-manager: ${SOURCE_PREFIX}:id`)
  }

  // ---- installed / diagnostics -------------------------------------------

  route('GET', `${API_PREFIX}/installed`, async (req) => {
    const query = queryOf(req)
    const cwd = await resolveCwd(ctx, query.cwd || settings.cwd)
    const sources = await readSources(state)
    const [installed, updates, storedOrder, marketIndexes] = await Promise.all([
      readInstalled(state),
      Promise.resolve(updateStateOf(updateChecker)),
      readSourceOrder(),
      readMarketIndexes(sources, truthyFlag(query.refresh)),
    ])
    const scan = await scanAll(ctx, cwd, {
      force: truthyFlag(query.refresh),
      installed,
      sources,
      updates,
      marketIndexes,
    })
    const skills = scan.skills.map(skillView)
    return {
      categories: categoryCounts(skills),
      skills,
      sources: sourceTracker.viewAll(sources),
      sourceOrder: storedOrder,
      diagnostics: { issues: scan.issues, checkedAt: Date.now() },
      updates,
    }
  })

  route('GET', `${API_PREFIX}/diagnostics`, async (req) => {
    const query = queryOf(req)
    const cwd = await resolveCwd(ctx, query.cwd || settings.cwd)
    const scan = await scanAll(ctx, cwd, { force: true })
    return { issues: scan.issues, checkedAt: Date.now() }
  })

  // ---- authored skill icons ----------------------------------------------

  const ICON_CONTENT_TYPES = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }
  const ICON_MAX_BYTES = 256 * 1024

  /**
   * `GET /skill/icon?path=<SKILL.md>&cwd=<project>`: the icon an author declared
   * in SKILL.md (`icon: assets/icon.svg`). Binary response, behind the trust fence.
   * The target must stay inside the skill directory (realpath checked), use a known
   * image extension and stay under 256 KiB.
   */
  const skillIconRoute = () => {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: `${API_PREFIX}/skill/icon`,
      handler: async (req, res) => {
        try {
          if (rejected(ctx, req, res)) return
          if (String(req.method ?? '').toUpperCase() !== 'GET') {
            methodNotAllowed(res, 'GET')
            return
          }
          const query = queryOf(req)
          const cwd = await resolveCwd(ctx, query.cwd || settings.cwd)
          const path = requireString(query.path, 'path')
          const [installed, sources] = await Promise.all([readInstalled(state), readSources(state)])
          const detail = await readSkillDetail(ctx, path, cwd, {
            installed,
            sources,
            updates: updateStateOf(updateChecker),
            marketIndexes: [],
          })
          const skill = detail !== null && typeof detail === 'object' ? detail.skill : null
          const iconPath = typeof skill?.iconPath === 'string' ? skill.iconPath : ''
          if (iconPath === '') {
            throw new ApiError('E_NOT_FOUND', 'this skill declares no icon', {}, 404)
          }
          const skillDir = dirname(skill.path)
          let rootReal
          try {
            rootReal = await realpath(skillDir)
          } catch {
            rootReal = skillDir
          }
          let targetReal
          try {
            targetReal = await realpath(resolve(skillDir, iconPath))
          } catch {
            throw new ApiError('E_NOT_FOUND', 'icon file not found', {}, 404)
          }
          if (targetReal !== rootReal && !targetReal.startsWith(rootReal + sep)) {
            throw new ApiError('E_FORBIDDEN', 'icon escapes the skill directory', {}, 403)
          }
          const contentType = ICON_CONTENT_TYPES[extname(targetReal).toLowerCase()]
          if (contentType === undefined) {
            throw new ApiError('E_UNSUPPORTED', 'unsupported icon format', {}, 415)
          }
          const data = await readFile(targetReal)
          if (data.length > ICON_MAX_BYTES) {
            throw new ApiError('E_TOO_LARGE', 'icon exceeds 256 KiB', {}, 413)
          }
          res.statusCode = 200
          res.setHeader('content-type', contentType)
          res.setHeader('cache-control', 'no-store')
          res.setHeader('x-content-type-options', 'nosniff')
          res.setHeader('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'")
          res.end(data)
        } catch (error) {
          respondError(res, error)
        }
      },
    }), 'skill-manager: skill icon')
  }

  skillIconRoute()

  // ---- installed skill CRUD ----------------------------------------------

  route('GET', `${API_PREFIX}/skill`, async (req) => {
    const query = queryOf(req)
    const cwd = await resolveCwd(ctx, query.cwd || settings.cwd)
    const path = requireString(query.path, 'path')
    const [installed, sources] = await Promise.all([readInstalled(state), readSources(state)])
    const marketIndexes = await readMarketIndexes(sources)
    const detail = await readSkillDetail(ctx, path, cwd, {
      installed,
      sources,
      updates: updateStateOf(updateChecker),
      marketIndexes,
    })
    // Contract §3.2: the detail route returns the same key set as `GET /installed`,
    // including the `author` / `whenToUse` `string | null` placeholders.
    return { ...detail, skill: skillView(detail.skill) }
  })

  route('POST', `${API_PREFIX}/skill`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const cwd = await resolveCwd(ctx, body.cwd || settings.cwd)
    const location = requireString(body.location, 'location')
    const name = requireString(body.name, 'name')
    const description = requireString(body.description, 'description')
    const writer = await writerFor(cwd)
    const result = await writer.create({
      location,
      name,
      description,
      whenToUse: typeof body.whenToUse === 'string' ? body.whenToUse : undefined,
      body: typeof body.body === 'string' ? body.body : '',
    })
    return { skill: await resolveWrittenSkill(ctx, cwd, result, { location, name }) }
  })

  route('PUT', `${API_PREFIX}/skill`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const cwd = await resolveCwd(ctx, body.cwd || settings.cwd)
    const path = requireString(body.path, 'path')
    const content = requireString(body.content, 'content')
    if (!Number.isFinite(body.mtime)) {
      throw new ApiError('E_BAD_REQUEST', 'mtime is required', {}, 400)
    }
    const writer = await writerFor(cwd)
    const result = await writer.update({ path: await realOrResolve(path), mtime: body.mtime, content })
    return { skill: await resolveWrittenSkill(ctx, cwd, result, { path }) }
  })

  route('POST', `${API_PREFIX}/skill/state`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const cwd = await resolveCwd(ctx, body.cwd || settings.cwd)
    const path = requireString(body.path, 'path')
    if (typeof body.enabled !== 'boolean') {
      throw new ApiError('E_BAD_REQUEST', 'enabled must be a boolean', {}, 400)
    }
    const writer = await writerFor(cwd)
    const result = await writer.setEnabled({
      path: skillEntryPath(await realOrResolve(path)),
      enabled: body.enabled,
    })
    return { skill: await resolveWrittenSkill(ctx, cwd, result, { path }) }
  })

  route('DELETE', `${API_PREFIX}/skill`, async (req) => {
    const query = queryOf(req)
    const cwd = await resolveCwd(ctx, query.cwd || settings.cwd)
    const path = requireString(query.path, 'path')
    const writer = await writerFor(cwd)
    await writer.remove({ path: skillEntryPath(await realOrResolve(path)) })
    invalidateScanCache()
    return { removed: true }
  })

  route('POST', `${API_PREFIX}/import`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const cwd = await resolveCwd(ctx, body.cwd || settings.cwd)
    const mode = requireString(body.mode, 'mode')
    if (mode !== 'paste' && mode !== 'dir') {
      throw new ApiError('E_BAD_REQUEST', 'mode must be "paste" or "dir"', {}, 400)
    }
    const location = requireString(body.location, 'location')
    if (mode === 'paste' && typeof body.content !== 'string') {
      throw new ApiError('E_BAD_REQUEST', 'content is required for paste mode', {}, 400)
    }
    if (mode === 'dir' && text(body.dirPath) === '') {
      throw new ApiError('E_BAD_REQUEST', 'dirPath is required for dir mode', {}, 400)
    }
    const writer = await writerFor(cwd)
    const result = await writer.importSkill({
      mode,
      location,
      content: typeof body.content === 'string' ? body.content : '',
      dirPath: text(body.dirPath),
    })
    const skill = await resolveWrittenSkill(ctx, cwd, result, {
      location,
      name: typeof result?.name === 'string' ? result.name : undefined,
    })
    const files = Number.isFinite(result?.files)
      ? result.files
      : (Array.isArray(result?.files) ? result.files.length : 0)
    return { skill, files }
  })

  // ---- sources ------------------------------------------------------------

  route('GET', `${API_PREFIX}/sources`, async () => {
    const [sources, storedOrder] = await Promise.all([readSources(state), readSourceOrder()])
    return {
      sources: sourceTracker.viewAll(sources),
      sourceOrder: storedOrder,
    }
  })

  // Contract §4.2: `order` must be a permutation of every current source id.
  route('PUT', `${API_PREFIX}/sources/order`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const order = body.order
    if (!Array.isArray(order)) {
      throw new ApiError('E_BAD_REQUEST', 'order must be an array of source ids', {}, 400)
    }
    const ids = []
    for (const value of order) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError('E_BAD_REQUEST', 'order must contain non-empty source ids', {}, 400)
      }
      ids.push(value.trim())
    }
    const sources = await readSources(state)
    const known = new Set(
      sources.map((source) => source?.id).filter((id) => typeof id === 'string' && id !== ''),
    )
    const seen = new Set()
    for (const id of ids) {
      if (!known.has(id)) throw new ApiError('E_BAD_REQUEST', `unknown source id "${id}"`, {}, 400)
      if (seen.has(id)) throw new ApiError('E_BAD_REQUEST', `duplicate source id "${id}"`, {}, 400)
      seen.add(id)
    }
    if (seen.size !== known.size) {
      const missing = [...known].filter((id) => !seen.has(id))
      throw new ApiError('E_BAD_REQUEST', `order is missing source ids: ${missing.join(', ')}`, {}, 400)
    }
    await writeSourceOrder(ids)
    return { order: ids }
  })

  route('POST', `${API_PREFIX}/sources`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const url = requireString(body.url, 'url')
    const add = requireStoreMethod(state, 'addSource')
    const source = await add({ url, name: text(body.name) })
    return { source: sourceTracker.view(source) }
  })

  route('POST', `${API_PREFIX}/sources/validate`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const url = requireString(body.url, 'url')
    const result = await fetchIndex(url, { refresh: true })
    if (result?.error) throw result.error
    const index = normalizeIndex(result, url)
    const skills = Array.isArray(index?.skills) ? index.skills : []
    return {
      title: localized(index?.title) || url,
      description: localized(index?.description),
      skillCount: skills.length,
      sample: skills.slice(0, 5).map((entry) => ({
        name: typeof entry?.name === 'string' ? entry.name : '',
        description: localized(entry?.description),
        version: defaultVersionOf(entry, dshVersion)?.version ?? '',
      })),
      warnings: warningsOf(result),
    }
  })

  sourceRoute()

  /** Resolve one configured source's index entry for install/update/detail. */
  const resolveMarketEntry = async (sourceId, name, refresh) => {
    const sources = await readSources(state)
    const source = sources.find((entry) => entry?.id === sourceId)
    if (source === undefined) {
      throw new ApiError('E_NOT_FOUND', `no source with id "${sourceId}"`, {}, 404)
    }
    const result = await fetchIndex(source.url, { refresh: refresh === true })
    if (result?.error) {
      sourceTracker.markError(source.id, message(result.error))
      throw result.error
    }
    const index = normalizeIndex(result, source.url)
    const entries = Array.isArray(index?.skills) ? index.skills : []
    const entry = entries.find((candidate) => candidate?.name === name)
    if (entry === undefined) {
      throw new ApiError('E_NOT_FOUND', `skill "${name}" is not in source "${sourceId}"`, {}, 404)
    }
    sourceTracker.markOk(
      source.id,
      entries.length,
      nowSeconds(),
    )
    return { source, index, entry }
  }

  // ---- market -------------------------------------------------------------

  route('GET', `${API_PREFIX}/market`, async (req) => {
    const query = queryOf(req)
    const sources = await readSources(state)
    const sourceId = text(query.sourceId) || 'all'
    const selected = sourceId === 'all'
      ? sources.filter((source) => source?.enabled !== false)
      : sources.filter((source) => source?.id === sourceId)
    if (sourceId !== 'all' && selected.length === 0) {
      throw new ApiError('E_NOT_FOUND', `no source with id "${sourceId}"`, {}, 404)
    }

    const sort = normalizeMarketSort(query.sort)
    const limit = clampInt(parseInteger(query.limit, 50), 1, 100, 50)
    const offsets = decodeMarketCursor(text(query.cursor))
    const tag = text(query.tag)
    const q = text(query.q)
    const installed = await readInstalled(state)
    const updates = updateStateOf(updateChecker)

    // Fetch every source first; search/sort/pagination below stay per source.
    const inputs = []
    let stale = false
    for (const source of selected) {
      const blockName = sourceNameOf(source, null) || source.id
      // A failed `/check-updates` marks the source stale even while its cached index is
      // still within the fetch TTL, so the client can show the "last good" hint.
      if (staleSources.has(source.id)) stale = true
      // `/market` deliberately does *not* publish the `checking` transient. The source
      // status the page paints comes from `GET /sources`, and the client caches that
      // answer: `/check-updates` reloads `/installed`, `/sources` and `/market` together,
      // so a `/sources` reply taken while this loop is awaiting an index read would
      // capture `status: 'checking'` and never be refreshed again — the yellow dot stayed
      // until a page reload. This route is a listing read (the page shows its own loading
      // state), so the transient belongs to the explicit `POST /sources/:id/refresh`
      // instead, which the client awaits *before* reloading `/sources`. The health marks
      // this loop still owes the tracker are the settled ones below.
      try {
        const result = await fetchIndex(source.url, { refresh: truthyFlag(query.refresh) })
        const index = normalizeIndex(result, source.url)
        if (result?.stale === true) stale = true
        let error = null
        if (result?.error) {
          error = message(result.error)
          sourceTracker.markError(source.id, error)
          stale = true
        } else {
          const count = Array.isArray(index?.skills) ? index.skills.length : 0
          sourceTracker.markOk(source.id, count, nowSeconds())
          // An explicit refresh that succeeds clears an earlier check failure.
          if (truthyFlag(query.refresh)) staleSources.delete(source.id)
        }
        // `tag` is a label in the common case; accept a declared category too.
        // A source that declares neither contributes an empty block.
        const tagQuery = tagQueryFor(index, tag)
        inputs.push({
          sourceId: source.id,
          name: sourceNameOf(source, index) || blockName,
          index,
          error,
          ...(tagQuery === null ? { empty: true } : { query: tagQuery }),
        })
      } catch (error) {
        const reason = message(error)
        sourceTracker.markError(source.id, reason)
        stale = true
        inputs.push({ sourceId: source.id, name: blockName, index: null, error: reason })
      }
    }

    const blocks = searchBySource(inputs, { text: q }, sort, offsets, limit).map((block) => ({
      sourceId: block.sourceId,
      name: block.name,
      total: block.total,
      skills: block.skills.map((entry) => marketListView(entry, {
        sourceId: block.sourceId,
        installed,
        updates,
        dshVersion,
      })),
      cursor: block.cursor === null
        ? null
        : encodeMarketCursor({ ...offsets, [block.sourceId]: block.cursor }),
      error: block.error,
    }))
    return { sources: blocks, stale }
  })

  route('GET', `${API_PREFIX}/market/skill`, async (req) => {
    const query = queryOf(req)
    const sourceId = requireString(query.sourceId, 'sourceId')
    const name = requireString(query.name, 'name')
    const { source, index, entry } = await resolveMarketEntry(sourceId, name, truthyFlag(query.refresh))
    const wanted = text(query.version)
    const version = versionOf(entry, wanted, dshVersion)
    if (version === null) {
      if (wanted === '') {
        throw new ApiError(
          'E_NO_COMPATIBLE',
          `no version of "${name}" is compatible with DSH ${dshVersion ?? 'unknown'}`,
          {},
          400,
        )
      }
      throw new ApiError('E_VERSION_UNKNOWN', `version "${wanted}" is not available for "${name}"`, {}, 400)
    }
    const installed = await readInstalled(state)
    const updates = updateStateOf(updateChecker)
    const versions = (Array.isArray(entry.versions) ? entry.versions : [])
      .filter((candidate) => isObject(candidate))
      .map((candidate) => ({
        version: typeof candidate.version === 'string' ? candidate.version : '',
        publishTimestamp: Number.isFinite(candidate.publishTimestamp) ? candidate.publishTimestamp : 0,
        enginesDsh: typeof candidate.engines?.dsh === 'string' ? candidate.engines.dsh : '',
        yanked: candidate.yanked === true,
      }))
    // The detail view shows the SKILL.md *text*, not the index's `readme` URL. A network
    // failure must never fail the request: `content` becomes `''` and `contentError`
    // carries the reason. `readme` stays for backward compatibility.
    const skillMdFile = skillMarkdownFileOf(version)
    // An installed copy already sits on disk: read it instead of downloading again.
    // This is what makes opening an installed skill from the market list instant.
    const localRecord = (Array.isArray(installed) ? installed : []).find((record) => (
      record !== null && typeof record === 'object'
      && record.sourceId === sourceId && record.name === name
      && typeof record.path === 'string' && record.path !== ''
    ))
    let skillMd
    if (localRecord !== undefined) {
      try {
        skillMd = { content: await readFile(localRecord.path, 'utf8'), error: '' }
      } catch (error) {
        skillMd = { content: '', error: message(error) }
      }
    } else {
      skillMd = await skillMarkdown.read({
        sourceId,
        name,
        version: typeof version.version === 'string' ? version.version : '',
        sha256: typeof skillMdFile?.sha256 === 'string' ? skillMdFile.sha256 : '',
        url: typeof skillMdFile?.url === 'string' ? skillMdFile.url : '',
      })
    }
    return {
      skill: marketSkillView(entry, { source, index, version, installed, updates, dshVersion }),
      versions,
      readme: typeof version.readme === 'string' ? version.readme : '',
      content: skillMd.content,
      contentError: skillMd.error,
    }
  })

  route('POST', `${API_PREFIX}/market/install`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const cwd = await resolveCwd(ctx, body.cwd || settings.cwd)
    const sourceId = requireString(body.sourceId, 'sourceId')
    const name = requireString(body.name, 'name')
    const location = requireString(body.location, 'location')
    const { source, index, entry } = await resolveMarketEntry(sourceId, name, false)
    const wanted = text(body.version)
    const chosen = versionOf(entry, wanted, dshVersion)
    if (chosen === null) {
      if (wanted === '') {
        throw new ApiError(
          'E_NO_COMPATIBLE',
          `no version of "${name}" is compatible with DSH ${dshVersion ?? 'unknown'}`,
          {},
          400,
        )
      }
      throw new ApiError('E_VERSION_UNKNOWN', `version "${wanted}" is not available for "${name}"`, {}, 400)
    }
    const installer = await installerFor(cwd)
    const result = await installer.install({
      sourceId: source.id,
      sourceName: sourceNameOf(source, index),
      sourceUrl: source.url,
      skill: entry,
      version: chosen.version,
      location,
      conflict: body.conflict === 'overwrite' || body.conflict === 'skip' ? body.conflict : undefined,
    })
    return {
      skill: await resolveWrittenSkill(ctx, cwd, result, { location, name }),
      record: result?.record ?? null,
    }
  })

  route('POST', `${API_PREFIX}/market/update`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const cwd = await resolveCwd(ctx, body.cwd || settings.cwd)
    const sourceId = requireString(body.sourceId, 'sourceId')
    const name = requireString(body.name, 'name')
    const location = requireString(body.location, 'location')
    const { source, index, entry } = await resolveMarketEntry(sourceId, name, false)
    const wanted = text(body.version)
    const chosen = versionOf(entry, wanted, dshVersion)
    if (chosen === null) {
      if (wanted === '') {
        throw new ApiError(
          'E_NO_COMPATIBLE',
          `no version of "${name}" is compatible with DSH ${dshVersion ?? 'unknown'}`,
          {},
          400,
        )
      }
      throw new ApiError('E_VERSION_UNKNOWN', `version "${wanted}" is not available for "${name}"`, {}, 400)
    }
    const installer = await installerFor(cwd)
    const result = await installer.update({
      sourceId: source.id,
      sourceName: sourceNameOf(source, index),
      sourceUrl: source.url,
      skill: entry,
      version: chosen.version,
      location,
    })
    return {
      skill: await resolveWrittenSkill(ctx, cwd, result, { location, name }),
      record: result?.record ?? null,
    }
  })

  route('POST', `${API_PREFIX}/market/uninstall`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const cwd = await resolveCwd(ctx, body.cwd || settings.cwd)
    const name = requireString(body.name, 'name')
    const location = requireString(body.location, 'location')
    const installer = await installerFor(cwd)
    await installer.uninstall({
      name,
      location,
      preserveBackup: body.preserveBackup === true,
    })
    invalidateScanCache()
    return { removed: true }
  })

  // ---- updates ------------------------------------------------------------

  route('GET', `${API_PREFIX}/updates`, async () => updateStateOf(updateChecker))

  route('POST', `${API_PREFIX}/check-updates`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    const requestedSourceId = text(body.sourceId)
    const scopeKey = requestedSourceId === '' ? '*' : requestedSourceId
    const inflight = checkUpdatesInflight.get(scopeKey)
    if (inflight !== undefined) return inflight

    const force = body.force === true
    const cwd = typeof body.cwd === 'string' && body.cwd !== '' ? body.cwd : settings.cwd
    const run = async () => {
      const allSources = (await readSources(state)).filter((source) => source?.enabled !== false)
      const sources = requestedSourceId === ''
        ? allSources
        : allSources.filter((source) => source?.id === requestedSourceId)
      if (requestedSourceId !== '' && sources.length === 0) {
        throw new ApiError('E_NOT_FOUND', `no enabled source with id "${requestedSourceId}"`, {}, 404)
      }
      // Start the copy read *alongside* the check, not after it. The two reads use different
      // caches (`updateChecker` has its own), so running them sequentially would double the
      // route's latency on a cold process — 2.2 s for the check plus 2.2 s for the copy.
      // Started together they share the source's response time instead of adding to it.
      // Nothing awaits this promise here: `rememberIndexCopies` swallows every failure, and
      // the settled copy is only needed once the route returns (the client reloads
      // `/installed` afterwards).
      const copies = rememberIndexCopies(sources)
      // Contract §4.3: re-pull every enabled index (or just the requested one),
      // recompute updates and refresh the scan.
      const checked = await checkUpdatesOf(updateChecker, {
        force,
        refreshIndexes: true,
        ...(requestedSourceId === '' ? {} : { sourceIds: [requestedSourceId] }),
      })
      // P2-5: only a source whose check succeeded may have its market cache dropped. On
      // failure the last good index is retained (the checker marks it stale), so `/market`
      // can still render cached cards instead of losing them.
      const errors = Array.isArray(checked.errors) ? checked.errors : []
      const failedSources = new Set()
      let globalFailure = false
      for (const entry of errors) {
        const id = typeof entry?.sourceId === 'string' ? entry.sourceId : ''
        if (id === '') globalFailure = true
        else failedSources.add(id)
      }
      // Regression ①-b: a successful check is *evidence* that the source is healthy again,
      // so the 60 s failure back-off recorded by an earlier `/installed` read is now stale
      // information. Leaving it in place makes the very next cold `/installed` skip the
      // network and render every skill without its market icon until the back-off expires.
      // Only a forced check actually re-read the index (`ensureIndex` serves its own TTL
      // cache otherwise), so only a forced check may clear the failure record.
      if (!globalFailure && force) {
        for (const source of sources) {
          const sourceId = typeof source?.id === 'string' ? source.id : ''
          if (sourceId === '' || failedSources.has(sourceId)) continue
          descriptionIndexFailures.delete(sourceId)
        }
      }
      if (!globalFailure) {
        // Wait for the copy read that was started above, *before* `invalidate()` drops the
        // fetch cache. A failing source keeps its old copy instead of taking a new one.
        await copies
        for (const source of sources) {
          if (typeof source?.url !== 'string' || source.url === '') continue
          if (failedSources.has(source.id)) continue
          try {
            indexFetcher.invalidate(source.url)
          } catch {
            /* invalidation is best-effort */
          }
        }
      }
      // Observation fix P2: a failed check keeps the last good market cache but must be
      // visible as `stale: true` on `/market` until a later successful check clears it.
      for (const source of sources) {
        if (typeof source?.id !== 'string' || source.id === '') continue
        if (globalFailure || failedSources.has(source.id)) staleSources.add(source.id)
        else staleSources.delete(source.id)
      }
      // P2-4: `/check-updates` always refreshes the installed scan, even with zero enabled
      // sources (contract §4.3), so a stale `GET /installed` cache cannot survive the check.
      invalidateScanCache()
      try {
        await scanAll(ctx, await resolveCwd(ctx, cwd), { force: true })
      } catch {
        /* the next GET /installed retries the scan */
      }
      return {
        sources: Number.isFinite(checked.sources) ? checked.sources : sources.length,
        updates: Array.isArray(checked.updates)
          ? checked.updates.length
          : (Number.isFinite(checked.updates) ? checked.updates : 0),
        errors,
      }
    }
    const promise = run().finally(() => {
      checkUpdatesInflight.delete(scopeKey)
    })
    checkUpdatesInflight.set(scopeKey, promise)
    return promise
  })

  // ---- validation / settings ---------------------------------------------

  route('POST', `${API_PREFIX}/validate`, async (req) => {
    const body = await readJsonBody(req, settings.maxBodyBytes)
    if (typeof body.content !== 'string') {
      throw new ApiError('E_BAD_REQUEST', 'content is required', {}, 400)
    }
    const parsed = parseSkillFile(body.content)
    if (!parsed.ok) return { valid: false, error: parsed.error }
    const checked = validateFrontmatter(parsed.frontmatter)
    if (!checked.ok) return { valid: false, error: checked.error }
    return {
      valid: true,
      name: checked.frontmatter.name,
      description: checked.frontmatter.description,
    }
  })

  route('GET', `${API_PREFIX}/settings`, async () => ({
    fontSize: (await themeFontSize()) ?? settings.fontSize,
    cwd: await resolveCwd(ctx, settings.cwd),
    dshVersion,
  }))

  // Disk changes invalidate the short scan cache. The event may not be declared
  // in every composition, so registration is best-effort.
  try {
    if (typeof ctx.on === 'function') {
      ctx.effect(() => ctx.on('skills/change', () => invalidateScanCache()), 'skill-manager: skills change')
    }
  } catch {
    /* the event is optional */
  }
}
