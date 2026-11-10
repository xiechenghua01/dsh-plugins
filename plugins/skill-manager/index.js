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
import { basename, dirname, join, resolve } from 'node:path'

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
    description: localized(entry?.description),
    ...descriptionByLocaleField(entry?.description),
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
    ...descriptionByLocaleField(entry?.description),
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
    `${sourceId ?? ''} ${name ?? ''} ${version ?? ''} ${sha256 ?? ''}`
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
 * Per-process source health that is not persisted in `state.json`
 * (skill counts, the transient "checking" flag and the latest fetch error).
 */
function createSourceTracker() {
  const counts = new Map()
  const errors = new Map()
  const checkedAt = new Map()
  const checking = new Set()

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
      status: checking.has(id) ? 'checking' : (error !== null ? 'error' : 'ok'),
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
      if (typeof id === 'string' && id !== '') checking.add(id)
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
// Plugin
// ---------------------------------------------------------------------------

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
   * Installed views need each install record's market index entry to expose the optional
   * `descriptionByLocale`. Indexes come from the same 10-minute cache `/market` uses, so
   * the usual case is a memory hit. A slow source must not delay `/installed`: the read is
   * raced against a 150ms budget, while the underlying fetch keeps running and warms the
   * cache for the next request. When the index is missing we return without the optional
   * `descriptionByLocale` — the client falls back to `description`. A source that failed
   * is retried after a short back-off.
   */
  const DESCRIPTION_WAIT_MS = 150
  const DESCRIPTION_RETRY_MS = 60_000
  const DESCRIPTION_TIMEOUT = Symbol('skill-manager:description-timeout')
  const descriptionIndexFailures = new Map()

  const readMarketIndexes = async (sources, refresh = false) => {
    const list = Array.isArray(sources) ? sources : []
    const now = Date.now()
    const results = await Promise.all(list.map(async (source) => {
      if (!isObject(source) || typeof source.id !== 'string' || source.id === '') return null
      if (typeof source.url !== 'string' || source.url === '') return null
      const failedAt = descriptionIndexFailures.get(source.id)
      if (!refresh && failedAt !== undefined && now - failedAt < DESCRIPTION_RETRY_MS) return null

      let timer
      const timeout = new Promise((resolve) => {
        timer = setTimeout(() => resolve(DESCRIPTION_TIMEOUT), DESCRIPTION_WAIT_MS)
        if (typeof timer.unref === 'function') timer.unref()
      })
      const pending = fetchIndex(source.url, { refresh })
      // Track a failure that happens *after* the short wait gave up, so a dead source
      // backs off instead of costing every later `/installed` its full budget.
      pending.then(
        () => descriptionIndexFailures.delete(source.id),
        () => descriptionIndexFailures.set(source.id, Date.now()),
      )
      try {
        const result = await Promise.race([pending, timeout])
        if (result === DESCRIPTION_TIMEOUT) return null
        // `fetchIndex` keeps the last good index when a refresh fails; that is still the
        // best description we have, so only the index shape decides.
        const index = normalizeIndex(result, source.url)
        if (!isObject(index) || !Array.isArray(index.skills)) return null
        descriptionIndexFailures.delete(source.id)
        return { sourceId: source.id, skills: index.skills }
      } catch {
        descriptionIndexFailures.set(source.id, Date.now())
        return null
      } finally {
        clearTimeout(timer)
      }
    }))
    return results.filter((entry) => entry !== null)
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

  // `/check-updates` is single-flight at the route level so the index-cache/scan refresh
  // around the update check also runs at most once (contract §4.3).
  let checkUpdatesInflight = null
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
      sourceTracker.markChecking(source.id)
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
    if (checkUpdatesInflight !== null) return checkUpdatesInflight

    const force = body.force === true
    const cwd = typeof body.cwd === 'string' && body.cwd !== '' ? body.cwd : settings.cwd
    const run = async () => {
      const sources = (await readSources(state)).filter((source) => source?.enabled !== false)
      // Contract §4.3: re-pull every enabled index, recompute updates, refresh the scan.
      const checked = await checkUpdatesOf(updateChecker, { force, refreshIndexes: true })
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
      if (!globalFailure) {
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
    checkUpdatesInflight = run().finally(() => {
      checkUpdatesInflight = null
    })
    return checkUpdatesInflight
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
    fontSize: settings.fontSize,
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
