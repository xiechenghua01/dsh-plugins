/**
 * Live MCP handshake probe — the pure helper behind the Settings page's `测试` action.
 *
 * `probeServer(config, options)` speaks the MCP handshake (initialize →
 * notifications/initialized → tools/list) directly over stdio or Streamable HTTP and
 * returns a `ProbeResult` (CONTRACT §5). It never throws: every failure becomes
 * `{ ok: false, ..., error: { kind, message } }`.
 *
 * Invariants this file keeps, because the repository checks and `selftest.mjs` rely on
 * them:
 *   - imports only `node:` builtins;
 *   - no Cordis context, no `process.cwd()`, no top-level side effects, so the module
 *     can be imported by the plugin self-test in CI;
 *   - every spawned child is killed and reaped on success, failure, timeout and abort,
 *     so a probe never leaves an orphan server process behind.
 *
 * The wire details (protocol version, env scrubbing, SSE handling, session headers)
 * mirror what the real MCP client bridge does, without importing it.
 */
import { spawn } from 'node:child_process'
import { once } from 'node:events'

/** Default probe budget in milliseconds (CONTRACT §5). */
export const DEFAULT_TIMEOUT_MS = 20000

/** Protocol revision this probe asks for; the server's answer is accepted as-is. */
const PROTOCOL_VERSION = '2026-07-28'

/** `clientInfo` defaults; `index.js` may override them through `options`. */
const CLIENT_NAME = 'dsh-mcp-manager'
const CLIENT_VERSION = '0.1.0'

/** ProbeResult caps (CONTRACT §5). */
const MAX_TOOL_NAMES = 50
const MAX_INSTRUCTIONS = 500

/** Defensive caps so a misbehaving server cannot grow the probe's memory forever. */
const MAX_FRAME_BUFFER = 8 * 1024 * 1024
const MAX_STDERR_BYTES = 8192
const MAX_TOOLS_PAGES = 20
const MAX_ERROR_SNIPPET = 300

/** Child shutdown grace periods: SIGTERM first, SIGKILL only when that is ignored. */
const EXIT_GRACE_MS = 1500
const KILL_GRACE_MS = 750

/** Ambient environment names the real client drops before spawning a stdio server. */
const SCRUBBED_ENV = /KEY|PASSWORD|SECRET|TOKEN/i

const ACCEPT = 'application/json, text/event-stream'

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * A classified probe failure. `kind` is one of the ProbeResult error kinds; `status`
 * (HTTP status), `code` (JSON-RPC error code) and `hint` (actionable advice) are
 * optional and only `kind`/`message` reach the wire.
 */
class ProbeError extends Error {
  constructor(kind, message, extra = {}) {
    super(message)
    this.name = 'ProbeError'
    this.kind = kind
    if (typeof extra.status === 'number') this.status = extra.status
    if (typeof extra.hint === 'string' && extra.hint !== '') this.hint = extra.hint
    if (extra.code !== undefined) this.code = extra.code
  }
}

function probeError(kind, message, extra) {
  return new ProbeError(kind, message, extra)
}

function invalidConfig(message) {
  return probeError('invalid-config', message, {
    hint: 'check the server configuration: transport, command/url and their companion fields.',
  })
}

function abortError() {
  const error = new Error('aborted')
  error.name = 'AbortError'
  error.code = 'ABORT_ERR'
  return error
}

function isAbortError(error) {
  return Boolean(error) && (error.name === 'AbortError' || error.code === 'ABORT_ERR')
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Collapse whitespace so stderr / HTTP bodies fit on one line of an error message. */
function oneLine(text) {
  return text.replace(/\s+/gu, ' ').trim()
}

function snippet(text) {
  return truncate(oneLine(text), MAX_ERROR_SNIPPET)
}

/** Resolve/reject with `promise`, but reject early when `signal` aborts. */
function withAbort(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(abortError())
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(abortError())
    }
    const cleanup = () => signal.removeEventListener('abort', onAbort)
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error) => {
        cleanup()
        reject(error)
      },
    )
  })
}

/** Wait for the child's `exit`/`close`; `false` means it is still alive after `timeoutMs`. */
function waitForChildClose(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true)
  return new Promise((resolve) => {
    let settled = false
    let timer = null
    const finish = (value) => {
      if (settled) return
      settled = true
      if (timer !== null) clearTimeout(timer)
      child.removeListener('close', onClose)
      child.removeListener('exit', onExit)
      resolve(value)
    }
    const onClose = () => finish(true)
    const onExit = () => finish(true)
    timer = setTimeout(() => finish(false), timeoutMs)
    child.once('close', onClose)
    child.once('exit', onExit)
  })
}

function destroyChildStreams(child) {
  for (const stream of [child.stdin, child.stdout, child.stderr]) {
    if (!stream) continue
    try {
      stream.destroy()
    } catch {
      // Already destroyed or never opened: nothing to release.
    }
  }
}

/**
 * Terminate a stdio server and wait for it to be gone. Called from every path —
 * success, protocol failure, timeout and abort — so no orphan process survives.
 */
async function stopChild(child) {
  if (!child) return
  try {
    if (child.stdin) child.stdin.end()
  } catch {
    // stdin already closed.
  }
  if (child.pid === undefined) {
    // spawn() never produced a process (ENOENT and friends); nothing to signal.
    destroyChildStreams(child)
    return
  }
  if (child.exitCode === null && child.signalCode === null) {
    try {
      child.kill('SIGTERM')
    } catch {
      // Process already gone.
    }
    const exited = await waitForChildClose(child, EXIT_GRACE_MS)
    if (!exited && child.exitCode === null && child.signalCode === null) {
      try {
        child.kill('SIGKILL')
      } catch {
        // Process already gone.
      }
      await waitForChildClose(child, KILL_GRACE_MS)
    }
  }
  destroyChildStreams(child)
}

// ---------------------------------------------------------------------------
// Configuration and options normalization
// ---------------------------------------------------------------------------

function normalizeStringMap(value, field) {
  if (value === undefined || value === null) return {}
  if (!isPlainObject(value)) throw invalidConfig(`${field} must be a plain object of string values`)
  const result = {}
  for (const [name, entry] of Object.entries(value)) {
    if (entry === undefined || entry === null) continue
    result[name] = typeof entry === 'string' ? entry : String(entry)
  }
  return result
}

function normalizeConfig(config) {
  if (!isPlainObject(config)) throw invalidConfig('config must be a plain object')
  const transport = config.transport
  if (transport !== 'stdio' && transport !== 'streamable-http') {
    throw invalidConfig('transport must be "stdio" or "streamable-http"')
  }
  const serverName = isNonEmptyString(config.serverName) ? config.serverName.trim() : null
  if (transport === 'stdio') {
    if (!isNonEmptyString(config.command)) throw invalidConfig('command is required for stdio transport')
    let args = []
    if (config.args !== undefined && config.args !== null) {
      if (!Array.isArray(config.args)) throw invalidConfig('args must be an array of strings')
      args = config.args.map((argument) => (typeof argument === 'string' ? argument : String(argument)))
    }
    let cwd = null
    if (config.cwd !== undefined && config.cwd !== null) {
      if (typeof config.cwd !== 'string') throw invalidConfig('cwd must be a string')
      cwd = config.cwd.trim() === '' ? null : config.cwd
    }
    return {
      transport,
      serverName,
      command: config.command,
      args,
      env: normalizeStringMap(config.env, 'env'),
      cwd,
    }
  }
  if (!isNonEmptyString(config.url)) throw invalidConfig('url is required for streamable-http transport')
  let parsed
  try {
    parsed = new URL(config.url)
  } catch {
    throw invalidConfig('url is not a valid absolute URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw invalidConfig('url must start with http:// or https://')
  }
  return {
    transport,
    serverName,
    url: config.url,
    headers: normalizeStringMap(config.headers, 'headers'),
  }
}

function normalizeTimeout(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value)
  return DEFAULT_TIMEOUT_MS
}

function isAbortSignalLike(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.aborted === 'boolean' && typeof value.addEventListener === 'function'
}

function normalizeOptions(options) {
  const source = isPlainObject(options) ? options : {}
  return {
    timeoutMs: normalizeTimeout(source.timeoutMs),
    signal: isAbortSignalLike(source.signal) ? source.signal : null,
    clientName: isNonEmptyString(source.clientName) ? source.clientName.trim() : CLIENT_NAME,
    clientVersion: isNonEmptyString(source.clientVersion) ? source.clientVersion.trim() : CLIENT_VERSION,
  }
}

/**
 * One abort controller covering both the total budget and the caller's signal. The
 * probe's budget is a whole-handshake deadline: when it fires, the in-flight request
 * and the child teardown both observe it.
 */
function createControl(timeoutMs, externalSignal) {
  const controller = new AbortController()
  const state = { timedOut: false, cancelled: false, timeoutMs }
  const timer = setTimeout(() => {
    state.timedOut = true
    controller.abort()
  }, timeoutMs)
  const onExternalAbort = () => {
    state.cancelled = true
    controller.abort()
  }
  if (externalSignal) {
    if (externalSignal.aborted) onExternalAbort()
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  }
  return {
    signal: controller.signal,
    state,
    dispose() {
      clearTimeout(timer)
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
    },
  }
}

// ---------------------------------------------------------------------------
// Initialize response projection (shared by both transports)
// ---------------------------------------------------------------------------

function pickServerInfo(value) {
  if (!isPlainObject(value)) return null
  const info = {}
  if (typeof value.name === 'string') info.name = value.name
  if (typeof value.version === 'string') info.version = value.version
  return Object.keys(info).length > 0 ? info : null
}

function capInstructions(value) {
  if (typeof value !== 'string') return null
  if (value.trim() === '') return null
  const characters = Array.from(value)
  return characters.length > MAX_INSTRUCTIONS ? characters.slice(0, MAX_INSTRUCTIONS).join('') : value
}

function summarizeInitialize(result) {
  if (!isPlainObject(result)) throw probeError('protocol', 'initialize response carries no result object')
  return {
    protocolVersion: isNonEmptyString(result.protocolVersion) ? result.protocolVersion : null,
    serverInfo: pickServerInfo(result.serverInfo),
    capabilities: isPlainObject(result.capabilities) ? result.capabilities : null,
    instructions: capInstructions(result.instructions),
  }
}

/**
 * Collect the tool names of one `tools/list` page into the shared accumulator.
 * `toolCount` counts every tool the server reports; `toolNames` stops at the cap.
 */
function collectTools(result, accumulator) {
  if (!isPlainObject(result)) throw probeError('protocol', 'tools/list response carries no result object')
  if (!Array.isArray(result.tools)) throw probeError('protocol', 'tools/list result carries no tools array')
  accumulator.toolCount += result.tools.length
  for (const tool of result.tools) {
    if (accumulator.toolNames.length >= MAX_TOOL_NAMES) break
    if (isPlainObject(tool) && isNonEmptyString(tool.name)) {
      accumulator.toolNames.push(tool.name)
      accumulator.tools.push({
        name: tool.name,
        description: typeof tool.description === 'string' ? tool.description.slice(0, 240) : '',
      })
    }
  }
  return isNonEmptyString(result.nextCursor) ? result.nextCursor : undefined
}

// ---------------------------------------------------------------------------
// stdio transport
// ---------------------------------------------------------------------------

/** Ambient env minus secrets and harness-internal names, then the configured env on top. */
function scrubEnvironment(extra) {
  const environment = {}
  for (const [name, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue
    if (name.startsWith('DSH_')) continue
    if (SCRUBBED_ENV.test(name)) continue
    environment[name] = value
  }
  for (const [name, value] of Object.entries(extra)) environment[name] = value
  return environment
}

function describeExit(exitInfo, stderr) {
  const code = exitInfo ? exitInfo.code : null
  const signal = exitInfo ? exitInfo.signal : null
  const reason = code !== null && code !== undefined ? `code ${code}` : signal ? `signal ${signal}` : 'unknown reason'
  const head = `the server process exited before completing the handshake (${reason})`
  const detail = stderr.trim()
  return detail === '' ? head : `${head}: ${snippet(detail)}`
}

/**
 * Run the full handshake against a stdio server.
 * @returns {Promise<{protocolVersion: string|null, serverInfo: object|null, capabilities: object|null, instructions: string|null, toolCount: number, toolNames: string[]}>}
 */
async function probeStdio(config, control, settings) {
  const environment = scrubEnvironment(config.env)
  let child
  try {
    child = spawn(config.command, config.args, {
      cwd: config.cwd ?? undefined,
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    })
  } catch (error) {
    throw probeError('spawn', `failed to start "${config.command}": ${error.message}`, {
      hint: 'the command may not exist or may not be executable; check command, args and PATH.',
    })
  }

  const state = {
    buffer: '',
    pending: new Map(),
    nextId: 1,
    stderr: '',
    noise: 0,
    exitInfo: null,
  }

  // A rejected spawn shows up as an `error` event; `once(child, 'spawn')` below turns it
  // into a rejection, and this listener keeps later errors (kill races) from going
  // unhandled.
  child.on('error', () => {})

  child.once('close', (code, signal) => {
    state.exitInfo = { code, signal }
    if (state.pending.size === 0) return
    const reason = probeError('spawn', describeExit(state.exitInfo, state.stderr), {
      hint: 'the server process stopped early; run its command manually and check its stderr.',
    })
    for (const entry of state.pending.values()) entry.reject(reason)
    state.pending.clear()
  })

  if (child.stdout) {
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => handleStdout(chunk))
  }
  if (child.stderr) {
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      if (state.stderr.length >= MAX_STDERR_BYTES) return
      state.stderr += chunk.length > MAX_STDERR_BYTES ? chunk.slice(0, MAX_STDERR_BYTES) : chunk
    })
  }
  if (child.stdin) {
    child.stdin.on('error', () => {})
  }

  function writeFrame(message) {
    if (!child.stdin || child.stdin.destroyed || child.stdin.writableEnded) return
    try {
      child.stdin.write(`${JSON.stringify(message)}\n`)
    } catch {
      // The child closed its stdin; the pending request will fail through `close`.
    }
  }

  function handleLine(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      state.noise += 1
      return
    }
    if (!isPlainObject(message)) {
      state.noise += 1
      return
    }
    if (message.method !== undefined) {
      // Server-initiated request (sampling, roots, ...): answer method-not-found instead
      // of leaving the server waiting. Notifications need no answer.
      if (message.id !== undefined && message.id !== null) {
        writeFrame({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } })
      }
      return
    }
    if (message.id === undefined || message.id === null) return
    const entry = state.pending.get(String(message.id))
    if (!entry) return
    state.pending.delete(String(message.id))
    if (message.error !== undefined && message.error !== null) {
      const code = isPlainObject(message.error) ? message.error.code : undefined
      const text = isPlainObject(message.error) ? message.error.message : String(message.error)
      entry.reject(probeError('protocol', `the server returned a JSON-RPC error${code !== undefined ? ` (${code})` : ''}: ${text ?? 'unknown error'}`, { code }))
      return
    }
    entry.resolve(message)
  }

  function handleStdout(chunk) {
    state.buffer += chunk
    if (state.buffer.length > MAX_FRAME_BUFFER) {
      state.buffer = ''
      state.noise += 1
      return
    }
    let index = state.buffer.indexOf('\n')
    while (index !== -1) {
      const line = state.buffer.slice(0, index).replace(/\r$/u, '')
      state.buffer = state.buffer.slice(index + 1)
      if (line.trim() !== '') handleLine(line)
      index = state.buffer.indexOf('\n')
    }
  }

  function request(method, params) {
    const id = state.nextId
    state.nextId += 1
    return new Promise((resolve, reject) => {
      const key = String(id)
      let settled = false
      const settle = (callback, value) => {
        if (settled) return
        settled = true
        control.signal.removeEventListener('abort', onAbort)
        callback(value)
      }
      const onAbort = () => {
        state.pending.delete(key)
        settle(reject, abortError())
      }
      state.pending.set(key, {
        resolve: (message) => settle(resolve, message),
        reject: (error) => settle(reject, error),
      })
      control.signal.addEventListener('abort', onAbort, { once: true })
      if (control.signal.aborted) {
        onAbort()
        return
      }
      const message = { jsonrpc: '2.0', id, method }
      if (params !== undefined) message.params = params
      writeFrame(message)
    })
  }

  try {
    try {
      await withAbort(once(child, 'spawn'), control.signal)
    } catch (error) {
      if (isAbortError(error)) throw error
      const detail = error instanceof Error && error.message ? error.message : String(error)
      throw probeError('spawn', detail.includes(config.command) ? detail : `failed to start "${config.command}": ${detail}`, {
        hint: 'the command may not exist or may not be executable; check command, args and PATH.',
      })
    }
    const initialize = await request('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: settings.clientName, version: settings.clientVersion },
    })
    const summary = summarizeInitialize(initialize.result)
    writeFrame({ jsonrpc: '2.0', method: 'notifications/initialized' })

    const accumulator = { toolCount: 0, toolNames: [], tools: [] }
    let cursor
    try {
      for (let page = 0; page < MAX_TOOLS_PAGES; page += 1) {
        const listed = await request('tools/list', cursor === undefined ? {} : { cursor })
        cursor = collectTools(listed.result, accumulator)
        if (cursor === undefined) break
      }
    } catch (error) {
      // A server that does not advertise the tools capability may answer -32601. That
      // is a valid "zero tools" answer, not a failed probe.
      if (!(error instanceof ProbeError) || error.code !== -32601) throw error
      accumulator.toolCount = 0
      accumulator.toolNames = []
      accumulator.tools = []
    }

    return { ...summary, ...accumulator }
  } finally {
    await stopChild(child)
  }
}

// ---------------------------------------------------------------------------
// streamable-http transport
// ---------------------------------------------------------------------------

function httpHint(status) {
  if (status === 401 || status === 403) {
    return 'the server rejected the request; check the authentication headers (Authorization, tokens).'
  }
  if (status === 404) return 'the URL answered 404; check the endpoint path (usually ends in /mcp).'
  if (status === 405) return 'the endpoint does not accept POST; confirm it is a Streamable HTTP MCP endpoint.'
  if (status >= 500) return 'the server failed internally; check its logs.'
  return 'the endpoint answered with an HTTP error; check the URL and the server configuration.'
}

/** Extract the `data:` payloads of one SSE event block; returns parsed JSON or undefined. */
function parseSseEvent(raw) {
  const data = []
  for (const line of raw.split(/\r?\n/u)) {
    if (line === '' || line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    if (field !== 'data') continue
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    data.push(value)
  }
  if (data.length === 0) return undefined
  const payload = data.join('\n')
  if (payload.trim() === '') return undefined
  try {
    return JSON.parse(payload)
  } catch {
    return undefined
  }
}

/** Find the earliest SSE event boundary (`\n\n` or `\r\n\r\n`). */
function findEventBoundary(text) {
  const lf = text.indexOf('\n\n')
  const crlf = text.indexOf('\r\n\r\n')
  if (lf === -1 && crlf === -1) return null
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return { index: crlf, length: 4 }
  return { index: lf, length: 2 }
}

/** Locate the JSON-RPC response matching `expectedId` inside a parsed SSE/JSON message. */
function matchResponse(parsed, expectedId) {
  const candidates = Array.isArray(parsed) ? parsed : [parsed]
  for (const candidate of candidates) {
    if (!isPlainObject(candidate)) continue
    if (candidate.id === undefined || candidate.id === null) {
      // A JSON-RPC parse/transport error may arrive without an id; treat it as ours.
      if (candidate.error !== undefined && candidate.error !== null) return candidate
      continue
    }
    if (String(candidate.id) === String(expectedId)) return candidate
  }
  return null
}

function unwrapResponse(message, label) {
  if (message.error !== undefined && message.error !== null) {
    const code = isPlainObject(message.error) ? message.error.code : undefined
    const text = isPlainObject(message.error) ? message.error.message : String(message.error)
    throw probeError('protocol', `the server returned a JSON-RPC error for ${label}${code !== undefined ? ` (${code})` : ''}: ${text ?? 'unknown error'}`, { code })
  }
  if (!isPlainObject(message.result)) throw probeError('protocol', `the ${label} response carries no result object`)
  return message
}

async function readSseResponse(response, expectedId, label) {
  if (!response.body) throw probeError('protocol', `empty SSE response for ${label}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary = findEventBoundary(buffer)
      while (boundary !== null) {
        const raw = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary.length)
        const message = parseSseEvent(raw)
        if (message !== undefined) {
          const matched = matchResponse(message, expectedId)
          if (matched !== null) return unwrapResponse(matched, label)
        }
        boundary = findEventBoundary(buffer)
      }
    }
    buffer += decoder.decode()
    if (buffer.trim() !== '') {
      const message = parseSseEvent(buffer)
      if (message !== undefined) {
        const matched = matchResponse(message, expectedId)
        if (matched !== null) return unwrapResponse(matched, label)
      }
    }
  } finally {
    try {
      await reader.cancel()
    } catch {
      // The stream already ended or was aborted; nothing to cancel.
    }
  }
  throw probeError('protocol', `the SSE stream ended without a ${label} response`, {
    hint: 'the server closed the event stream before answering; check its MCP implementation.',
  })
}

async function readResponseMessage(response, expectedId, label) {
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
  if (contentType.includes('text/event-stream')) return readSseResponse(response, expectedId, label)
  if (!response.body) throw probeError('protocol', `empty response body for ${label}`)
  const text = await response.text()
  if (text.trim() === '') throw probeError('protocol', `empty response body for ${label}`)
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw probeError('protocol', `the ${label} response is not JSON (content-type: ${contentType || 'unknown'})`, {
      hint: 'the endpoint answered with something that is not an MCP JSON-RPC response; check the URL.',
    })
  }
  const matched = matchResponse(parsed, expectedId)
  if (matched === null) throw probeError('protocol', `the ${label} response does not answer the probe request`)
  return unwrapResponse(matched, label)
}

/**
 * Run the full handshake against a Streamable HTTP endpoint.
 * @returns {Promise<{protocolVersion: string|null, serverInfo: object|null, capabilities: object|null, instructions: string|null, toolCount: number, toolNames: string[]}>}
 */
async function probeHttp(config, control, settings) {
  if (typeof fetch !== 'function') {
    throw probeError('unknown', 'this Node.js runtime has no global fetch()', {
      hint: 'run the Harness on a Node.js version that provides fetch (18 or newer).',
    })
  }
  const state = {
    url: config.url,
    headers: config.headers,
    sessionId: null,
    protocolVersion: null,
    signal: control.signal,
    nextId: 1,
  }

  async function postMessage(message, label, isNotification) {
    const headers = { 'content-type': 'application/json', accept: ACCEPT, ...state.headers }
    if (state.sessionId !== null) headers['mcp-session-id'] = state.sessionId
    if (state.protocolVersion !== null) headers['mcp-protocol-version'] = state.protocolVersion
    let response
    try {
      response = await fetch(state.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: state.signal,
        redirect: 'follow',
      })
    } catch (error) {
      if (isAbortError(error)) throw error
      const cause = error && typeof error === 'object' ? error.cause : undefined
      const detail = (cause && (cause.code || cause.message)) || (error && error.message) || String(error)
      throw probeError('unknown', `request to ${state.url} failed: ${detail}`, {
        hint: 'the endpoint is unreachable; check the URL, the network and any proxy settings.',
      })
    }
    if (!response.ok) {
      let body = ''
      try {
        body = await response.text()
      } catch {
        // The error body is optional; the status alone is already diagnostic.
      }
      const detail = body.trim() === '' ? '' : `: ${snippet(body)}`
      throw probeError('http', `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}${detail}`, {
        status: response.status,
        hint: httpHint(response.status),
      })
    }
    const sessionId = response.headers.get('mcp-session-id')
    if (isNonEmptyString(sessionId)) state.sessionId = sessionId
    if (isNotification) {
      try {
        await response.text()
      } catch {
        // Notifications carry no response body worth reading.
      }
      return null
    }
    return readResponseMessage(response, message.id, label)
  }

  async function request(method, params) {
    const message = { jsonrpc: '2.0', id: state.nextId, method }
    state.nextId += 1
    if (params !== undefined) message.params = params
    return postMessage(message, method, false)
  }

  const initialize = await request('initialize', {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: settings.clientName, version: settings.clientVersion },
  })
  const summary = summarizeInitialize(initialize.result)
  state.protocolVersion = summary.protocolVersion ?? PROTOCOL_VERSION

  await postMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, 'notifications/initialized', true)

  const accumulator = { toolCount: 0, toolNames: [], tools: [] }
  let cursor
  try {
    for (let page = 0; page < MAX_TOOLS_PAGES; page += 1) {
      const listed = await request('tools/list', cursor === undefined ? {} : { cursor })
      cursor = collectTools(listed.result, accumulator)
      if (cursor === undefined) break
    }
  } catch (error) {
    if (!(error instanceof ProbeError) || error.code !== -32601) throw error
    accumulator.toolCount = 0
    accumulator.toolNames = []
  }

  return { ...summary, ...accumulator }
}

// ---------------------------------------------------------------------------
// Failure mapping
// ---------------------------------------------------------------------------

function mapFailure(error, control) {
  if (error instanceof ProbeError) return error
  if (isAbortError(error)) {
    if (control && control.state.timedOut) {
      return probeError('timeout', `no response within ${control.state.timeoutMs} ms`, {
        hint: 'the server did not finish the MCP handshake in time; raise timeoutMs or check the server logs.',
      })
    }
    return probeError('unknown', 'the probe was aborted', {
      hint: 'the caller aborted the probe before the handshake completed.',
    })
  }
  if (control && control.state.timedOut) {
    return probeError('timeout', `no response within ${control.state.timeoutMs} ms`, {
      hint: 'the server did not finish the MCP handshake in time; raise timeoutMs or check the server logs.',
    })
  }
  const message = error instanceof Error ? error.message : String(error)
  return probeError('unknown', message === '' ? 'unknown probe failure' : message)
}

function toProbeFailure(error, control) {
  const classified = mapFailure(error, control)
  const failure = { kind: classified.kind, message: classified.message }
  if (typeof classified.status === 'number') failure.status = classified.status
  if (typeof classified.hint === 'string' && classified.hint !== '') failure.hint = classified.hint
  return failure
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

function emptyResult(config) {
  const transport =
    isPlainObject(config) && (config.transport === 'stdio' || config.transport === 'streamable-http') ? config.transport : null
  const serverName = isPlainObject(config) && isNonEmptyString(config.serverName) ? config.serverName.trim() : null
  return {
    ok: false,
    transport,
    serverName,
    durationMs: 0,
    protocolVersion: null,
    serverInfo: null,
    capabilities: null,
    instructions: null,
    toolCount: null,
    toolNames: [],
    error: null,
  }
}

/**
 * Probe one MCP server and report the handshake outcome.
 *
 * @param {object} config  MCP server config (CONTRACT §1): transport plus either
 *   command/args/env/cwd (stdio) or url/headers (streamable-http).
 * @param {{ timeoutMs?: number, signal?: AbortSignal, clientName?: string, clientVersion?: string }} [options]
 * @returns {Promise<object>} a ProbeResult (CONTRACT §5); never rejects.
 */
export async function probeServer(config, options = {}) {
  const startedAt = Date.now()
  const result = emptyResult(config)
  const settings = normalizeOptions(options)
  let control = null
  try {
    const normalized = normalizeConfig(config)
    result.transport = normalized.transport
    result.serverName = normalized.serverName
    control = createControl(settings.timeoutMs, settings.signal)
    const fields =
      normalized.transport === 'stdio' ? await probeStdio(normalized, control, settings) : await probeHttp(normalized, control, settings)
    return {
      ...result,
      ok: true,
      durationMs: Math.max(0, Date.now() - startedAt),
      protocolVersion: fields.protocolVersion,
      serverInfo: fields.serverInfo,
      capabilities: fields.capabilities,
      instructions: fields.instructions,
      toolCount: fields.toolCount,
      toolNames: fields.toolNames,
      tools: Array.isArray(fields.tools) ? fields.tools : [],
      error: null,
    }
  } catch (error) {
    return {
      ...result,
      ok: false,
      durationMs: Math.max(0, Date.now() - startedAt),
      error: toProbeFailure(error, control),
    }
  } finally {
    if (control !== null) control.dispose()
  }
}
