// MCP Manager — Host half.
//
// One Settings page (`设置 → MCP 服务`) owns the MCP server rows of this Harness:
//
//   * global  → `$DSH_HOME/cordis.patch.yml` (every profile on this machine)
//   * workspace → `$DSH_PROFILE_DIR/cordis.patch.yml` (the current profile)
//
// The browser half talks to the same-origin route `POST /mcp-manager/api` with a
// `{ op, args }` envelope. Rows are ordinary `@deepseek-ai/dsh-mcp-client` loader
// entries; the plugin never imports that package, it only edits the YAML patch
// text (see `lib/patch.mjs`) and lets HMR recompose the composition.
//
// A machine-wide catalog (`lib/library.mjs`, `$DSH_HOME/mcp-manager/library.json`)
// makes one configured server reusable from any other layer without retyping it.
//
// Connection tests (`lib/probe.mjs`) speak the MCP handshake directly, so a test
// never depends on the row's loader state.

import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { access, readFile } from 'node:fs/promises'

import {
  MCP_CLIENT_NAME,
  insertRows,
  readPatchFile,
  removeInsert,
  setInsertDisabled,
  upsertInsert,
  writePatchFile,
} from './lib/patch.mjs'
import {
  emptyLibrary,
  listServers,
  normalizeWorkspaces,
  readLibrary,
  removeServer,
  syncLibrary,
  upsertServer,
  writeLibrary,
} from './lib/library.mjs'
import { probeServer } from './lib/probe.mjs'

export const name = 'mcp-manager'
export const inject = ['webServer', 'connection', 'tools']

const API_PATH = '/mcp-manager/api'
const PLUGIN_HEADER = 'mcp-manager'
const MAX_BODY = 1024 * 1024
const PROBE_CONCURRENCY = 4
const PROBE_CACHE_LIMIT = 200
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
const LEVELS = ['global', 'workspace']

const DEFAULTS = {
  probeTimeoutMs: 20000,
  maxProbeTimeoutMs: 120000,
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function message(error) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error')
}

/** An API failure carrying a wire error code. */
function apiError(code, text) {
  const error = new Error(text)
  error.code = code
  return error
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function text(value) {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

function headerOf(req, key) {
  const value = req !== null && typeof req === 'object' && req.headers !== undefined ? req.headers[key] : undefined
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function jsonResponse(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function isJsMarker(value) {
  return isObject(value) && typeof value.$js === 'string'
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

// ---------------------------------------------------------------------------
// Config normalization
// ---------------------------------------------------------------------------

/** Validate a strict `[A-Za-z0-9_-]{1,32}` server name. */
function assertServerName(value) {
  const name = text(value)
  if (!SERVER_NAME.test(name)) throw apiError('invalid', 'serverName must be 1-32 characters of [A-Za-z0-9_-]')
  return name
}

/** Best-effort server name for imported entries. */
function sanitizeServerName(value) {
  const raw = text(value)
  const cleaned = raw.replace(/[^A-Za-z0-9_-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 32)
  return cleaned
}

function normalizeTransport(value) {
  const raw = text(value).toLowerCase()
  if (raw === 'stdio') return 'stdio'
  if (raw === 'streamable-http' || raw === 'streamablehttp' || raw === 'http') return 'streamable-http'
  if (raw === 'sse') throw apiError('unsupported', 'the legacy SSE transport is not supported; use streamable-http')
  throw apiError('invalid', 'transport must be "stdio" or "streamable-http"')
}

function stringList(value) {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) return value.map((entry) => (isJsMarker(entry) ? entry : String(entry ?? ''))).filter((entry) => entry !== '')
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
  }
  throw apiError('invalid', 'args must be an array of strings')
}

function stringMap(value, field) {
  if (value === undefined || value === null) return {}
  const out = {}
  if (typeof value === 'string') {
    for (const line of value.split('\n')) {
      const trimmed = line.trim()
      if (trimmed === '') continue
      const index = trimmed.indexOf('=')
      if (index <= 0) throw apiError('invalid', `${field} lines must be key=value`)
      out[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1)
    }
    return out
  }
  if (!isObject(value)) throw apiError('invalid', `${field} must be an object`)
  for (const [key, member] of Object.entries(value)) {
    const name = text(key)
    if (name === '') continue
    if (isJsMarker(member)) out[name] = { $js: member.$js }
    else if (typeof member === 'string' || typeof member === 'number' || typeof member === 'boolean') out[name] = String(member)
    else throw apiError('invalid', `${field}.${name} must be a string`)
  }
  return out
}

function boundedInt(value, minimum, maximum, field) {
  const number = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(number)) throw apiError('invalid', `${field} must be a number`)
  const rounded = Math.round(number)
  if (rounded < minimum || rounded > maximum) throw apiError('invalid', `${field} must be between ${minimum} and ${maximum}`)
  return rounded
}

/**
 * Normalize one MCP client config. Throws an `apiError` on invalid input.
 * @param {object} input
 * @returns {object}
 */
export function normalizeConfig(input) {
  if (!isObject(input)) throw apiError('invalid', 'config must be an object')
  const declared = text(input.transport)
  const transport = normalizeTransport(declared === '' ? (input.command !== undefined ? 'stdio' : input.url !== undefined ? 'streamable-http' : '') : declared)
  const serverName = assertServerName(input.serverName)
  const config = { serverName, transport }
  if (transport === 'stdio') {
    const command = text(input.command)
    if (command === '') throw apiError('invalid', 'command is required for stdio')
    config.command = command
    const args = stringList(input.args)
    if (args.length > 0) config.args = args
    const env = stringMap(input.env, 'env')
    if (Object.keys(env).length > 0) config.env = env
    const cwd = text(input.cwd)
    if (cwd !== '') config.cwd = cwd
  } else {
    const url = text(input.url)
    if (url === '') throw apiError('invalid', 'url is required for streamable-http')
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      throw apiError('invalid', 'url must be an absolute URL')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw apiError('invalid', 'url must use http or https')
    config.url = url
    const headers = stringMap(input.headers, 'headers')
    if (Object.keys(headers).length > 0) config.headers = headers
  }
  if (input.toolCallTimeoutMs !== undefined && input.toolCallTimeoutMs !== null && input.toolCallTimeoutMs !== '') {
    config.toolCallTimeoutMs = boundedInt(input.toolCallTimeoutMs, 1000, 3600000, 'toolCallTimeoutMs')
  }
  if (input.maxInstructionBytes !== undefined && input.maxInstructionBytes !== null && input.maxInstructionBytes !== '') {
    config.maxInstructionBytes = boundedInt(input.maxInstructionBytes, 1024, 1048576, 'maxInstructionBytes')
  }
  if (input.failOnStartupError === true) config.failOnStartupError = true
  if (isObject(input.reconnect)) {
    const reconnect = {}
    if (typeof input.reconnect.enabled === 'boolean') reconnect.enabled = input.reconnect.enabled
    if (input.reconnect.initialDelayMs !== undefined && input.reconnect.initialDelayMs !== null && input.reconnect.initialDelayMs !== '') {
      reconnect.initialDelayMs = boundedInt(input.reconnect.initialDelayMs, 50, 600000, 'reconnect.initialDelayMs')
    }
    if (input.reconnect.maxDelayMs !== undefined && input.reconnect.maxDelayMs !== null && input.reconnect.maxDelayMs !== '') {
      reconnect.maxDelayMs = boundedInt(input.reconnect.maxDelayMs, 100, 3600000, 'reconnect.maxDelayMs')
    }
    if (input.reconnect.maxAttempts !== undefined && input.reconnect.maxAttempts !== null && input.reconnect.maxAttempts !== '') {
      reconnect.maxAttempts = boundedInt(input.reconnect.maxAttempts, 1, 1000, 'reconnect.maxAttempts')
    }
    if (Object.keys(reconnect).length > 0) config.reconnect = reconnect
  }
  return config
}

/** One-line display target for a row. */
function displayTarget(config) {
  if (!isObject(config)) return ''
  if (config.transport === 'streamable-http') return text(config.url)
  const args = Array.isArray(config.args) ? config.args.map((entry) => (isJsMarker(entry) ? `!!js ${entry.$js}` : String(entry))).join(' ') : ''
  return `${text(config.command)}${args === '' ? '' : ` ${args}`}`.trim()
}

/** Replace `!!js` expressions with an empty value so a probe can run. */
function sanitizeForProbe(config) {
  const copy = cloneJson(config)
  const scrub = (map) => {
    for (const [key, value] of Object.entries(map)) {
      if (isJsMarker(value)) map[key] = ''
    }
  }
  if (isObject(copy.env)) scrub(copy.env)
  if (isObject(copy.headers)) scrub(copy.headers)
  if (Array.isArray(copy.args)) copy.args = copy.args.map((entry) => (isJsMarker(entry) ? '' : entry))
  return copy
}

// ---------------------------------------------------------------------------
// JSON interchange
// ---------------------------------------------------------------------------

function entryFromValue(defaultName, value) {
  if (!isObject(value)) throw apiError('invalid', 'entry must be an object')
  const config = { ...value }
  delete config.name
  delete config.id
  const type = config.type
  delete config.type
  if (config.transport === undefined && type !== undefined) config.transport = type
  if (config.serverName === undefined) {
    const fallback = text(value.name) || text(defaultName) || text(value.id)
    if (fallback !== '') config.serverName = fallback
  }
  if (config.serverName !== undefined) config.serverName = sanitizeServerName(config.serverName)
  if (config.transport === undefined) {
    if (config.command !== undefined) config.transport = 'stdio'
    else if (config.url !== undefined) config.transport = 'streamable-http'
  }
  return { serverName: text(config.serverName), config }
}

/**
 * Parse any supported JSON interchange shape into `{ serverName, config }` entries.
 * @param {string} raw
 * @returns {Array<{ serverName: string, config: object }>}
 */
export function parseImportJson(raw) {
  let parsed
  try {
    parsed = JSON.parse(String(raw))
  } catch {
    throw apiError('invalid', 'the pasted text is not valid JSON')
  }
  const entries = []
  if (Array.isArray(parsed)) {
    for (const item of parsed) entries.push(entryFromValue(undefined, item))
    return entries
  }
  if (!isObject(parsed)) throw apiError('invalid', 'JSON must be an object or an array')
  if (isObject(parsed.mcpServers)) {
    for (const [key, value] of Object.entries(parsed.mcpServers)) {
      if (Array.isArray(value)) {
        for (const item of value) entries.push(entryFromValue(key, item))
      } else {
        entries.push(entryFromValue(key, value))
      }
    }
    return entries
  }
  if (Array.isArray(parsed.mcpServers)) {
    for (const item of parsed.mcpServers) entries.push(entryFromValue(undefined, item))
    return entries
  }
  if (Array.isArray(parsed.servers)) {
    for (const item of parsed.servers) entries.push(entryFromValue(undefined, item))
    return entries
  }
  entries.push(entryFromValue(undefined, parsed))
  return entries
}

/** One Claude Desktop compatible `mcpServers` entry. */
export function toDesktopEntry(config) {
  const entry = { type: config.transport }
  if (config.transport === 'stdio') {
    entry.command = config.command
    if (Array.isArray(config.args) && config.args.length > 0) entry.args = config.args
    if (isObject(config.env) && Object.keys(config.env).length > 0) entry.env = config.env
    if (config.cwd !== undefined) entry.cwd = config.cwd
  } else {
    entry.url = config.url
    if (isObject(config.headers) && Object.keys(config.headers).length > 0) entry.headers = config.headers
  }
  for (const key of ['toolCallTimeoutMs', 'maxInstructionBytes', 'failOnStartupError']) {
    if (config[key] !== undefined) entry[key] = config[key]
  }
  if (isObject(config.reconnect) && Object.keys(config.reconnect).length > 0) entry.reconnect = config.reconnect
  return entry
}

/** Row id for a new server; never reuses an id already present. */
export function nextRowId(level, serverName, rows) {
  const prefix = level === 'global' ? 'mcp-g-' : 'mcp-w-'
  const slug = serverName.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '')
  const base = `${prefix}${slug === '' ? 'server' : slug}`
  const taken = new Set(rows.map((row) => row.id))
  if (!taken.has(base)) return base
  let index = 2
  while (taken.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * @param {object} ctx owning Cordis context (`webServer`, `connection`)
 * @param {object} [config] the Loader row config
 */
export function apply(ctx, config) {
  const settings = { ...DEFAULTS }
  if (isObject(config)) {
    if (Number.isFinite(config.probeTimeoutMs)) settings.probeTimeoutMs = Math.max(1000, Math.min(120000, Math.round(config.probeTimeoutMs)))
    if (Number.isFinite(config.maxProbeTimeoutMs)) settings.maxProbeTimeoutMs = Math.max(settings.probeTimeoutMs, Math.min(600000, Math.round(config.maxProbeTimeoutMs)))
  }

  let pathsCache = null
  let writeChain = Promise.resolve()
  const probeCache = new Map()

  function withWriteLock(operation) {
    const run = writeChain.then(operation, operation)
    writeChain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  async function resolvePaths() {
    if (pathsCache !== null) return pathsCache
    let home = text(process.env.DSH_HOME)
    let profileDir = text(process.env.DSH_PROFILE_DIR)
    let profileName = text(process.env.DSH_PROFILE)
    if (profileDir === '') {
      const settingsService = ctx.get('settings')
      if (settingsService !== undefined && settingsService !== null && typeof settingsService.prepareDocument === 'function') {
        try {
          const document = await settingsService.prepareDocument()
          if (typeof document === 'string' && document !== '') {
            profileDir = dirname(document)
            profileName = profileName === '' ? basename(profileDir) : profileName
            home = home === '' ? dirname(dirname(profileDir)) : home
          }
        } catch {
          /* fall through to the directory scan */
        }
      }
    }
    if (home === '') home = join(homedir(), '.dsh')
    if (profileDir === '') {
      const candidates = ['desktop', 'web', 'headless']
      if (profileName !== '' && !candidates.includes(profileName)) candidates.unshift(profileName)
      for (const candidate of candidates) {
        const directory = join(home, 'profiles', candidate)
        if (await exists(join(directory, 'cordis.patch.yml'))) {
          profileDir = directory
          profileName = candidate
          break
        }
      }
    }
    if (profileDir === '') {
      profileName = profileName === '' ? 'desktop' : profileName
      profileDir = join(home, 'profiles', profileName)
    }
    if (profileName === '') profileName = basename(profileDir)
    pathsCache = {
      home,
      profileDir,
      profileName,
      profilePatch: join(profileDir, 'cordis.patch.yml'),
      homePatch: join(home, 'cordis.patch.yml'),
      libraryFile: join(home, 'mcp-manager', 'library.json'),
    }
    return pathsCache
  }

  function patchFileFor(paths, level) {
    return level === 'global' ? paths.homePatch : paths.profilePatch
  }

  function normalizeLevel(value) {
    const level = text(value)
    if (!LEVELS.includes(level)) throw apiError('invalid', 'level must be "global" or "workspace"')
    return level
  }

  function normalizeLevels(value) {
    if (value === undefined || value === null) return [...LEVELS]
    if (!Array.isArray(value) || value.length === 0) return [...LEVELS]
    const levels = value.map((entry) => normalizeLevel(entry))
    return LEVELS.filter((level) => levels.includes(level))
  }

  function clampTimeout(value) {
    const raw = Number(value)
    if (!Number.isFinite(raw)) return settings.probeTimeoutMs
    return Math.max(1000, Math.min(settings.maxProbeTimeoutMs, Math.round(raw)))
  }

  let clientVersionCache = null
  async function clientVersion() {
    if (clientVersionCache !== null) return clientVersionCache
    try {
      const manifest = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))
      clientVersionCache = typeof manifest.version === 'string' && manifest.version !== '' ? manifest.version : '0.0.0'
    } catch {
      clientVersionCache = '0.0.0'
    }
    return clientVersionCache
  }

  function cacheProbe(key, result) {
    probeCache.delete(key)
    probeCache.set(key, result)
    while (probeCache.size > PROBE_CACHE_LIMIT) {
      const oldest = probeCache.keys().next()
      if (oldest.done === true) break
      probeCache.delete(oldest.value)
    }
  }

  async function collectRows(warnings) {
    const paths = await resolvePaths()
    const rows = []
    for (const level of LEVELS) {
      const file = patchFileFor(paths, level)
      let document = ''
      try {
        document = await readPatchFile(file)
      } catch (error) {
        warnings.push(`${level}: cannot read ${file}: ${message(error)}`)
        continue
      }
      if (document.trim() === '') continue
      let parsed
      try {
        parsed = insertRows(document)
      } catch (error) {
        warnings.push(`${level}: cannot parse ${file}: ${message(error)}`)
        continue
      }
      for (const row of parsed) {
        if (typeof row.id !== 'string' || row.id === '') continue
        const config = isObject(row.config) ? row.config : null
        const serverName = text(config?.serverName) || row.id
        rows.push({
          id: row.id,
          serverName,
          level,
          disabled: row.disabled === true,
          readOnly: row.parseable !== true,
          readOnlyReason: row.parseable === true ? null : 'unparseable',
          config,
          transport: config?.transport === 'streamable-http' ? 'streamable-http' : 'stdio',
          target: displayTarget(config),
          workspaces: [],
          live: null,
          toolCount: 0,
          lastProbe: probeCache.get(`${level}:${row.id}`) ?? null,
          updatedAt: 0,
        })
      }
    }
    // The same server name in both layers makes the later row fail to load: surface it.
    const seen = new Map()
    for (const row of rows) {
      const previous = seen.get(row.serverName)
      if (previous !== undefined) {
        warnings.push(`serverName "${row.serverName}" is configured in both layers (${previous.level} and ${row.level}); only one can load`)
      } else {
        seen.set(row.serverName, row)
      }
    }
    rows.sort((left, right) => {
      if (left.level !== right.level) return left.level === 'global' ? -1 : 1
      return left.serverName < right.serverName ? -1 : left.serverName > right.serverName ? 1 : 0
    })
    return rows
  }

  async function liveEntries() {
    const manager = ctx.get('pluginManager')
    if (manager === undefined || manager === null || typeof manager.listPlugins !== 'function') return []
    try {
      const entries = await manager.listPlugins()
      return Array.isArray(entries) ? entries.filter((entry) => isObject(entry) && (entry.moduleName === MCP_CLIENT_NAME || entry.name === MCP_CLIENT_NAME)) : []
    } catch {
      return []
    }
  }

  function liveFor(row, live) {
    const match = live.find((entry) => entry.patchId === row.id)
    if (match !== undefined) return match
    return live.find((entry) => typeof entry.entryId === 'string' && (entry.entryId === row.id || entry.entryId.endsWith(`:${row.id}`)))
  }

  function toolCounts() {
    const counts = {}
    const tools = ctx.get('tools') ?? ctx.tools
    if (tools === undefined || tools === null || typeof tools.schemas !== 'function') return counts
    try {
      const schemas = tools.schemas()
      if (!Array.isArray(schemas)) return counts
      for (const schema of schemas) {
        const match = /^mcp__([A-Za-z0-9_-]+)__/u.exec(String(schema?.name ?? ''))
        if (match === null) continue
        counts[match[1]] = (counts[match[1]] ?? 0) + 1
      }
    } catch {
      /* a composition without the tool runtime simply reports zero tools */
    }
    return counts
  }

  async function decorateRows(rows) {
    const live = await liveEntries()
    const counts = toolCounts()
    for (const row of rows) {
      const entry = liveFor(row, live)
      row.live =
        entry === undefined
          ? null
          : {
              enabled: entry.enabled !== false,
              phase: typeof entry.fiberPhase === 'string' ? entry.fiberPhase : 'unknown',
              addressable: typeof entry.patchId === 'string' && entry.patchId !== '',
            }
      // The live tool count comes from a probe when one ran (a real handshake), otherwise from
      // the tool registry when this scope can see it; `null` means "not known" and the client
      // simply omits the count instead of claiming zero.
      const probed = probeCache.get(`${row.level}:${row.id}`)
      const registered = counts[row.serverName]
      const count = probed !== undefined && probed.ok === true && typeof probed.toolCount === 'number' ? probed.toolCount : registered
      row.toolCount = typeof count === 'number' && Number.isFinite(count) ? count : null
      row.updatedAt = Number.isFinite(entry?.updatedAt) ? entry.updatedAt : 0
    }
    return rows
  }

  async function readLibraryOrEmpty(paths, warnings) {
    try {
      return await readLibrary(paths.libraryFile)
    } catch (error) {
      warnings.push(`library: ${message(error)}`)
      return emptyLibrary()
    }
  }

  /** Registered workspace directories, as the client's 工作目录 multi-select shows them. */
  function workspaceList() {
    const registry = ctx.get('workspaceRegistry')
    if (registry === undefined || registry === null || typeof registry.list !== 'function') return []
    try {
      const list = registry.list()
      if (!Array.isArray(list)) return []
      return list
        .map((workspace) => ({ id: text(workspace?.id), path: text(workspace?.path), title: text(workspace?.title) }))
        .filter((workspace) => workspace.path !== '')
    } catch {
      return []
    }
  }

  async function statePayload() {
    const warnings = []
    const paths = await resolvePaths()
    const rows = await collectRows(warnings)
    const library = await readLibraryOrEmpty(paths, warnings)
    let synced = library
    try {
      const result = syncLibrary(
        library,
        rows
          .filter((row) => row.readOnly !== true && isObject(row.config))
          .map((row) => ({ serverName: row.serverName, config: row.config, origin: row.level === 'global' ? 'global' : `workspace:${paths.profileName}` })),
      )
      synced = result.library
      if (result.changed) await writeLibrary(paths.libraryFile, synced)
    } catch (error) {
      warnings.push(`library: ${message(error)}`)
    }
    // Workspace attachments live in the catalog, not in the Loader config: the MCP row is
    // profile-scoped, so the attachment organizes and filters servers instead of scoping them.
    for (const row of rows) {
      const entry = synced.servers[row.serverName]
      row.workspaces = Array.isArray(entry?.workspaces) ? [...entry.workspaces] : []
    }
    await decorateRows(rows)
    return {
      ok: true,
      scope: {
        profile: paths.profileName,
        home: paths.home,
        profilePatch: paths.profilePatch,
        homePatch: paths.homePatch,
        profilePatchExists: await exists(paths.profilePatch),
        homePatchExists: await exists(paths.homePatch),
        libraryFile: paths.libraryFile,
      },
      workspaces: workspaceList(),
      rows,
      library: listServers(synced),
      warnings,
      generatedAt: Date.now(),
    }
  }

  async function rowById(level, id) {
    const rows = await collectRows([])
    const row = rows.find((candidate) => candidate.level === level && candidate.id === id)
    if (row === undefined) throw apiError('not-found', `no ${level} row with id "${id}"`)
    return row
  }

  async function writeRow(level, row) {
    const paths = await resolvePaths()
    const file = patchFileFor(paths, level)
    const document = await readPatchFile(file)
    const next = upsertInsert(document, row)
    if (next.action !== 'unchanged') await writePatchFile(file, next.text)
    return next
  }

  async function saveLibraryServer(serverName, config, origin, workspaces) {
    const paths = await resolvePaths()
    const warnings = []
    const library = await readLibraryOrEmpty(paths, warnings)
    const result = upsertServer(library, { serverName, config, origin, workspaces })
    if (result.action !== 'unchanged') await writeLibrary(paths.libraryFile, result.library)
  }

  /** The workspace attachment an operation carries; `undefined` keeps the catalog value. */
  function workspacesFromArgs(args) {
    return Array.isArray(args.workspaces) ? normalizeWorkspaces(args.workspaces) : undefined
  }

  // ---- operations --------------------------------------------------------

  async function opState() {
    return statePayload()
  }

  async function opRefresh() {
    const payload = await statePayload()
    return { ok: true, rows: payload.rows, warnings: payload.warnings, scope: payload.scope, library: payload.library, generatedAt: payload.generatedAt }
  }

  async function opCreate(args) {
    const level = normalizeLevel(args.level)
    const config = normalizeConfig(args.config)
    return withWriteLock(async () => {
      const paths = await resolvePaths()
      const rows = await collectRows([])
      const clash = rows.find((row) => row.serverName === config.serverName)
      if (clash !== undefined) throw apiError('duplicate', `serverName "${config.serverName}" already exists in the ${clash.level} layer`)
      const id = nextRowId(level, config.serverName, rows)
      await writeRow(level, {
        id,
        name: MCP_CLIENT_NAME,
        disabled: args.enabled === false ? true : undefined,
        config,
      })
      await saveLibraryServer(config.serverName, config, level === 'global' ? 'global' : `workspace:${paths.profileName}`, workspacesFromArgs(args))
      const created = await rowById(level, id)
      return { ok: true, row: created }
    })
  }

  async function opUpdate(args) {
    const level = normalizeLevel(args.level)
    const id = text(args.id)
    if (id === '') throw apiError('invalid', 'id is required')
    const config = normalizeConfig(args.config)
    return withWriteLock(async () => {
      const paths = await resolvePaths()
      const current = await rowById(level, id)
      if (current.readOnly) throw apiError('read-only', `row "${id}" cannot be parsed and is read-only`)
      const rows = await collectRows([])
      const clash = rows.find((row) => row.id !== id && row.serverName === config.serverName)
      if (clash !== undefined) throw apiError('duplicate', `serverName "${config.serverName}" already exists in the ${clash.level} layer`)
      const disabled = typeof args.enabled === 'boolean' ? args.enabled !== true : current.disabled
      await writeRow(level, {
        id,
        name: MCP_CLIENT_NAME,
        disabled: disabled ? true : undefined,
        config,
      })
      await saveLibraryServer(config.serverName, config, level === 'global' ? 'global' : `workspace:${paths.profileName}`, workspacesFromArgs(args))
      const updated = await rowById(level, id)
      return { ok: true, row: updated }
    })
  }

  async function opRemove(args) {
    const level = normalizeLevel(args.level)
    const id = text(args.id)
    if (id === '') throw apiError('invalid', 'id is required')
    return withWriteLock(async () => {
      const paths = await resolvePaths()
      const current = await rowById(level, id)
      if (current.readOnly) throw apiError('read-only', `row "${id}" cannot be parsed and is read-only`)
      const file = patchFileFor(paths, level)
      const document = await readPatchFile(file)
      const next = removeInsert(document, id)
      if (!next.removed) throw apiError('not-found', `no ${level} row with id "${id}"`)
      await writePatchFile(file, next.text)
      return { ok: true, removed: true }
    })
  }

  async function opSetEnabled(args) {
    const level = normalizeLevel(args.level)
    const id = text(args.id)
    if (id === '') throw apiError('invalid', 'id is required')
    if (typeof args.enabled !== 'boolean') throw apiError('invalid', 'enabled must be a boolean')
    return withWriteLock(async () => {
      const paths = await resolvePaths()
      const current = await rowById(level, id)
      if (current.readOnly) throw apiError('read-only', `row "${id}" cannot be parsed and is read-only`)
      const file = patchFileFor(paths, level)
      const document = await readPatchFile(file)
      const next = setInsertDisabled(document, id, args.enabled !== true)
      if (next.action === 'missing') throw apiError('not-found', `no ${level} row with id "${id}"`)
      if (next.action === 'updated') await writePatchFile(file, next.text)
      const updated = await rowById(level, id)
      return { ok: true, row: updated }
    })
  }

  async function opProbe(args) {
    let config
    let key = null
    if (isObject(args.config)) {
      config = normalizeConfig(args.config)
    } else {
      const level = normalizeLevel(args.level)
      const id = text(args.id)
      if (id === '') throw apiError('invalid', 'id or config is required')
      const row = await rowById(level, id)
      if (row.config === null) throw apiError('read-only', `row "${id}" has no parseable config`)
      config = row.config
      key = `${level}:${id}`
    }
    const result = await probeServer(sanitizeForProbe(config), { timeoutMs: clampTimeout(args.timeoutMs), clientVersion: await clientVersion() })
    if (key !== null) cacheProbe(key, result)
    return { ok: true, result }
  }

  async function opProbeAll(args) {
    const levels = normalizeLevels(args.levels)
    const timeoutMs = clampTimeout(args.timeoutMs)
    const version = await clientVersion()
    const rows = (await collectRows([])).filter((row) => row.disabled !== true && row.readOnly !== true && isObject(row.config) && levels.includes(row.level))
    const queue = [...rows]
    const results = []
    const startedAt = Date.now()
    const worker = async () => {
      while (queue.length > 0) {
        const row = queue.shift()
        if (row === undefined) return
        const result = await probeServer(sanitizeForProbe(row.config), { timeoutMs, clientVersion: version })
        cacheProbe(`${row.level}:${row.id}`, result)
        results.push({ id: row.id, level: row.level, serverName: row.serverName, result })
      }
    }
    await Promise.all(Array.from({ length: Math.min(PROBE_CONCURRENCY, queue.length) }, worker))
    results.sort((left, right) => (left.serverName < right.serverName ? -1 : left.serverName > right.serverName ? 1 : 0))
    return { ok: true, results, startedAt, finishedAt: Date.now() }
  }

  async function opImport(args) {
    const level = normalizeLevel(args.level)
    const entries = parseImportJson(args.json)
    const overwrite = args.overwrite === true
    const dryRun = args.dryRun === true
    return withWriteLock(async () => {
      const paths = await resolvePaths()
      const rows = await collectRows([])
      const file = patchFileFor(paths, level)
      let document = await readPatchFile(file)
      const added = []
      const updated = []
      const skipped = []
      for (const entry of entries) {
        try {
          const config = normalizeConfig({ ...entry.config, serverName: entry.serverName })
          const existing = rows.find((row) => row.serverName === config.serverName)
          if (existing !== undefined) {
            if (!overwrite || existing.level !== level || existing.readOnly) {
              skipped.push({ serverName: config.serverName, reason: existing.level === level ? 'duplicate' : `duplicate-in-${existing.level}` })
              continue
            }
            const next = upsertInsert(document, { id: existing.id, name: MCP_CLIENT_NAME, disabled: existing.disabled ? true : undefined, config })
            document = next.text
            updated.push(config.serverName)
            continue
          }
          const id = nextRowId(level, config.serverName, rows)
          const next = upsertInsert(document, { id, name: MCP_CLIENT_NAME, config })
          document = next.text
          rows.push({ id, serverName: config.serverName, level, disabled: false, readOnly: false, config, transport: config.transport, target: displayTarget(config), live: null, toolCount: 0, lastProbe: null, updatedAt: 0 })
          added.push(config.serverName)
        } catch (error) {
          skipped.push({ serverName: text(entry.serverName) || '?', reason: message(error) })
        }
      }
      if (!dryRun && (added.length > 0 || updated.length > 0)) await writePatchFile(file, document)
      const payload = dryRun ? { ok: true, added, updated, skipped, dryRun: true } : { ...(await statePayload()), added, updated, skipped }
      return payload
    })
  }

  async function opExport(args) {
    const format = args.format === 'full' ? 'full' : 'mcpServers'
    const levels = normalizeLevels(args.levels)
    const rows = (await collectRows([])).filter((row) => levels.includes(row.level) && isObject(row.config) && row.serverName !== '')
    if (format === 'full') {
      const servers = rows.map((row) => ({ serverName: row.serverName, ...row.config }))
      return { ok: true, json: JSON.stringify({ version: 1, exportedAt: Date.now(), servers }, null, 2) }
    }
    const servers = {}
    for (const row of rows) servers[row.serverName] = toDesktopEntry(row.config)
    return { ok: true, json: JSON.stringify({ mcpServers: servers }, null, 2) }
  }

  async function opLibraryApply(args) {
    const level = normalizeLevel(args.level)
    const serverName = text(args.serverName)
    if (serverName === '') throw apiError('invalid', 'serverName is required')
    const targetName = text(args.serverNameOverride) === '' ? serverName : assertServerName(args.serverNameOverride)
    return withWriteLock(async () => {
      const paths = await resolvePaths()
      const warnings = []
      const library = await readLibraryOrEmpty(paths, warnings)
      const entry = library.servers[serverName]
      if (entry === undefined) throw apiError('not-found', `"${serverName}" is not in the server library`)
      const rows = await collectRows([])
      const clash = rows.find((row) => row.serverName === targetName)
      if (clash !== undefined) throw apiError('duplicate', `serverName "${targetName}" already exists in the ${clash.level} layer`)
      const config = normalizeConfig({ ...entry.config, serverName: targetName })
      const id = nextRowId(level, targetName, rows)
      await writeRow(level, { id, name: MCP_CLIENT_NAME, disabled: args.enabled === false ? true : undefined, config })
      const workspaces = Array.isArray(args.workspaces) ? normalizeWorkspaces(args.workspaces) : normalizeWorkspaces(entry.workspaces)
      await saveLibraryServer(targetName, config, level === 'global' ? 'global' : `workspace:${paths.profileName}`, workspaces)
      const created = await rowById(level, id)
      return { ok: true, row: created }
    })
  }

  async function opLibraryRemove(args) {
    const serverName = text(args.serverName)
    if (serverName === '') throw apiError('invalid', 'serverName is required')
    return withWriteLock(async () => {
      const paths = await resolvePaths()
      const warnings = []
      const library = await readLibraryOrEmpty(paths, warnings)
      const result = removeServer(library, serverName)
      if (result.removed) await writeLibrary(paths.libraryFile, result.library)
      return { ok: true, removed: result.removed }
    })
  }

  const handlers = {
    state: opState,
    refresh: opRefresh,
    create: opCreate,
    update: opUpdate,
    remove: opRemove,
    setEnabled: opSetEnabled,
    probe: opProbe,
    probeAll: opProbeAll,
    import: opImport,
    export: opExport,
    libraryApply: opLibraryApply,
    libraryRemove: opLibraryRemove,
  }

  // ---- HTTP route --------------------------------------------------------

  function sameOrigin(origin, req) {
    let actual
    try {
      actual = new URL(origin)
    } catch {
      return false
    }
    const host = headerOf(req, 'host')
    if (host !== '' && actual.host === host) return true
    const server = ctx.get('webServer')
    if (server !== undefined && server !== null && typeof server.getOrigin === 'function') {
      try {
        const expected = new URL(server.getOrigin())
        if (actual.origin === expected.origin) return true
        const loopback = (hostname) => /^(?:localhost|127\.0\.0\.1|\[::1\])$/iu.test(hostname)
        if (actual.protocol === expected.protocol && actual.port === expected.port && loopback(actual.hostname) && loopback(expected.hostname)) return true
      } catch {
        /* fall through */
      }
    }
    return false
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = []
      let size = 0
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > MAX_BODY) {
          reject(apiError('invalid', 'request body is too large'))
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', (error) => reject(error))
    })
  }

  async function handleApi(req, res) {
    try {
      const connection = ctx.get('connection')
      if (connection !== undefined && connection !== null && typeof connection.requestRejection === 'function') {
        const rejection = connection.requestRejection(req)
        if (rejection !== undefined) {
          res.statusCode = rejection
          res.end()
          return
        }
      }
      if (String(req.method ?? '').toUpperCase() !== 'POST') {
        res.statusCode = 405
        res.setHeader('allow', 'POST')
        res.end()
        return
      }
      const origin = headerOf(req, 'origin')
      if (origin !== '' && !sameOrigin(origin, req)) {
        jsonResponse(res, 403, { ok: false, error: 'cross-origin request rejected', code: 'forbidden' })
        return
      }
      // A cross-site simple request cannot set this content type, and the page's
      // same-origin fetch always does; the plugin header is a second gate for
      // scripts that deliberately identify themselves.
      const contentType = headerOf(req, 'content-type')
      if (!contentType.toLowerCase().includes('application/json')) {
        jsonResponse(res, 415, { ok: false, error: 'content-type must be application/json', code: 'invalid' })
        return
      }
      const pluginHeader = headerOf(req, 'x-dsh-plugin')
      if (pluginHeader !== '' && pluginHeader !== PLUGIN_HEADER) {
        jsonResponse(res, 403, { ok: false, error: 'unexpected plugin header', code: 'forbidden' })
        return
      }
      let payload
      try {
        payload = JSON.parse(await readBody(req))
      } catch (error) {
        jsonResponse(res, 400, { ok: false, error: message(error), code: 'invalid' })
        return
      }
      const op = text(payload?.op)
      const args = isObject(payload?.args) ? payload.args : {}
      const handler = handlers[op]
      if (handler === undefined) {
        jsonResponse(res, 400, { ok: false, error: `unknown op: ${op}`, code: 'invalid' })
        return
      }
      const result = await handler(args)
      jsonResponse(res, 200, result ?? { ok: true })
    } catch (error) {
      const code = typeof error?.code === 'string' ? error.code : 'internal'
      jsonResponse(res, 200, { ok: false, error: message(error), code })
    }
  }

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: API_PATH,
        handler: handleApi,
      }),
    `mcp-manager: POST ${API_PATH}`,
  )
}
