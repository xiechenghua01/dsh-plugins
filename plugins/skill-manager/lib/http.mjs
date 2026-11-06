/**
 * Small HTTP helpers shared by every `/skill-manager/api` route.
 *
 * The wire envelope is fixed by the implementation contract (§4):
 *
 *   success -> `{ ok: true, data }`
 *   failure -> `{ ok: false, error: { code, message, path?, file? } }`
 *
 * Every response is JSON with `cache-control: no-store`; every route first runs
 * the `connection.requestRejection` trust fence.
 */

/** An error carrying a contract error code and (optionally) an HTTP status. */
export class ApiError extends Error {
  /**
   * @param {string} code contract error code (`E_*`)
   * @param {string} message human readable message
   * @param {object} [extra] extra `error` members (`path`, `file`, ...)
   * @param {number} [status] explicit HTTP status; otherwise derived by the caller
   */
  constructor(code, message, extra = {}, status = undefined) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.extra = extra
    if (typeof status === 'number') this.status = status
  }
}

/** Write one JSON payload with the contract headers. */
export function sendJson(res, status, payload) {
  if (res.writableEnded === true) return
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Write the failure envelope.
 * @param {object} res Node ServerResponse
 * @param {number} status HTTP status
 * @param {string} code contract error code
 * @param {string} message human readable message
 * @param {object} [extra] extra members merged into `error` (path/file/...)
 */
export function fail(res, status, code, message, extra = undefined) {
  const error = {
    code: typeof code === 'string' && code !== '' ? code : 'E_INTERNAL',
    message: typeof message === 'string' && message !== '' ? message : 'internal error',
  }
  if (extra !== null && typeof extra === 'object' && !Array.isArray(extra)) {
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined) continue
      error[key] = value
    }
  }
  sendJson(res, status, { ok: false, error })
}

/**
 * Run the trust fence. Returns true when the request was already answered with
 * `401`/`403`; false when the route may continue.
 */
export function rejected(ctx, req, res) {
  let connection
  try {
    connection = Reflect.get(ctx, 'connection')
  } catch {
    connection = undefined
  }
  if (connection === null || connection === undefined || typeof connection.requestRejection !== 'function') {
    return false
  }
  const rejection = connection.requestRejection(req)
  if (rejection === undefined) return false
  const status = typeof rejection === 'number' && Number.isFinite(rejection) ? Math.trunc(rejection) : 403
  fail(res, status, 'E_UNAUTHORIZED', 'request rejected by the connection trust fence')
  return true
}

/**
 * Read the raw request body as UTF-8 text, bounded by `limit` bytes.
 * Rejects with `E_TOO_LARGE` when the limit is exceeded.
 */
export function readBody(req, limit = 1024 * 1024) {
  const maximum = Number.isFinite(limit) && limit > 0 ? limit : 1024 * 1024
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false
    const finish = (error) => {
      if (settled) return
      settled = true
      if (error !== undefined) reject(error)
      else resolve(Buffer.concat(chunks).toString('utf8'))
    }
    req.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > maximum) {
        finish(new ApiError('E_TOO_LARGE', `request body exceeds ${maximum} bytes`, {}, 413))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => finish())
    req.on('error', (error) => finish(error instanceof Error ? error : new Error(String(error))))
  })
}

/**
 * Parse the request query string into a null-prototype plain object.
 * Repeated keys keep the first value (the routes never need duplicates).
 */
export function queryOf(req) {
  const query = Object.create(null)
  try {
    const url = new URL(String(req?.url ?? ''), 'http://localhost')
    for (const [key, value] of url.searchParams) {
      if (query[key] === undefined) query[key] = value
    }
  } catch {
    /* a malformed URL simply has no query */
  }
  return query
}

/** Answer `405 Method Not Allowed` with the supported `allow` header. */
export function methodNotAllowed(res, allow) {
  if (res.writableEnded === true) return
  if (typeof allow === 'string' && allow !== '') res.setHeader('allow', allow)
  fail(res, 405, 'E_BAD_REQUEST', 'method not allowed')
}
