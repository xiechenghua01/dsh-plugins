// Market index fetching, caching, and single-flight.
//
// Behaviour follows `skill-market-index-implementation.md` §4 and the reader contract in the
// format 1 spec §12.2:
//
//   - redirects are rejected (`redirect: 'error'`)
//   - the whole request (headers + body) has a 15 s timeout
//   - the response body is limited to 5 MiB while streaming
//   - bytes must decode as strict UTF-8 and parse as JSON
//   - every document runs through `validateIndex`
//   - successful documents are cached for 10 minutes; `refresh` bypasses the cache
//   - concurrent requests for the same URL share one in-flight promise
//   - a failed refresh keeps the last successful document and marks it stale
//
// No npm dependencies; the fetch implementation is injectable for tests.

import { Buffer } from 'node:buffer'
import { MAX_INDEX_BYTES, MarketIndexError, validateIndex } from './market-index.mjs'

export { MAX_INDEX_BYTES }

/** How long a successful index document stays fresh. */
export const INDEX_CACHE_TTL_MS = 10 * 60 * 1000
/** Overall timeout for one index fetch (headers + body). */
export const FETCH_TIMEOUT_MS = 15000

/** Network/protocol/parsing failure for an index source. */
export class IndexFetchError extends Error {
  /**
   * @param {string} code One of the `E_SOURCE_*` / `E_INDEX_*` / `E_CANCELED` codes.
   * @param {string} message
   * @param {{ url?: string, status?: number, cause?: unknown }} [options]
   */
  constructor(code, message, options = {}) {
    super(message)
    this.name = 'IndexFetchError'
    this.code = code
    this.url = options.url
    this.status = options.status
    if (options.cause !== undefined) this.cause = options.cause
  }
}

function checkIndexUrl(url) {
  if (typeof url !== 'string' || url === '') {
    throw new IndexFetchError('E_SOURCE_URL_INVALID', 'index URL must be a non-empty string', { url })
  }
  if (url.length > 2048) {
    throw new IndexFetchError('E_SOURCE_URL_INVALID', 'index URL must be at most 2048 characters', { url })
  }
  if (/\s/.test(url)) {
    throw new IndexFetchError('E_SOURCE_URL_INVALID', 'index URL must not contain whitespace', { url })
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new IndexFetchError('E_SOURCE_URL_INVALID', 'index URL must be absolute', { url })
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new IndexFetchError('E_SOURCE_URL_INVALID', 'index URL must use http(s)', { url })
  }
  if (parsed.username || parsed.password) {
    throw new IndexFetchError('E_SOURCE_URL_INVALID', 'index URL must not contain credentials', { url })
  }
  if (parsed.hash || url.includes('#')) {
    throw new IndexFetchError('E_SOURCE_URL_INVALID', 'index URL must not contain a fragment', { url })
  }
  return parsed
}

function cacheKeyFor(url) {
  if (typeof url !== 'string') return String(url)
  try {
    return new URL(url).href
  } catch {
    return url
  }
}

function classifyFetchError(error, { url, timeoutSignal, callerSignal, controller }) {
  if (error instanceof IndexFetchError) return error
  if (callerSignal?.aborted) {
    return new IndexFetchError('E_CANCELED', 'request aborted', { url, cause: error })
  }
  if (controller?.signal.aborted) {
    return new IndexFetchError('E_CANCELED', 'request canceled', { url, cause: error })
  }
  if (timeoutSignal?.aborted) {
    return new IndexFetchError('E_SOURCE_UNREACHABLE', `request timed out after ${FETCH_TIMEOUT_MS} ms`, {
      url,
      cause: error,
    })
  }
  const message = String(error?.message || error || 'fetch failed')
  const causeMessage = String(error?.cause?.message || '')
  if (/redirect/i.test(message) || /redirect/i.test(causeMessage)) {
    return new IndexFetchError('E_SOURCE_UNREACHABLE', 'redirects are not allowed', { url, cause: error })
  }
  return new IndexFetchError('E_SOURCE_UNREACHABLE', message, { url, cause: error })
}

function isCancellation(error, { callerSignal, controller, disposed }) {
  if (disposed) return true
  if (callerSignal?.aborted) return true
  if (controller?.signal.aborted) return true
  return error?.code === 'E_CANCELED'
}

async function readBody(response, url) {
  const chunks = []
  let total = 0

  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue
        const chunk = Buffer.from(value)
        total += chunk.byteLength
        if (total > MAX_INDEX_BYTES) {
          try {
            await reader.cancel()
          } catch {
            /* ignore cancellation errors */
          }
          throw new IndexFetchError('E_SOURCE_TOO_LARGE', `index body exceeds ${MAX_INDEX_BYTES} bytes`, { url })
        }
        chunks.push(chunk)
      }
    } finally {
      try {
        reader.releaseLock?.()
      } catch {
        /* ignore */
      }
    }
  } else if (typeof response.arrayBuffer === 'function') {
    const buffer = Buffer.from(await response.arrayBuffer())
    total = buffer.byteLength
    if (total > MAX_INDEX_BYTES) {
      throw new IndexFetchError('E_SOURCE_TOO_LARGE', `index body exceeds ${MAX_INDEX_BYTES} bytes`, { url })
    }
    chunks.push(buffer)
  } else {
    throw new IndexFetchError('E_SOURCE_UNREACHABLE', 'response has no readable body', { url })
  }

  return Buffer.concat(chunks)
}

/**
 * Create a cached index fetcher.
 *
 * @param {{
 *   fetchImpl?: typeof fetch,
 *   now?: () => number,
 * }} [options] `fetchImpl` defaults to the process-wide fetch; `now` returns milliseconds and is
 *   injectable so cache/TTL behaviour can be tested deterministically.
 * @returns {{
 *   fetchIndex: (url: string, options?: { signal?: AbortSignal, refresh?: boolean }) =>
 *     Promise<{ index: object, fetchedAt: number, warnings: string[], stale: boolean, error?: Error }>,
 *   invalidate: (url: string) => void,
 *   dispose: () => void,
 * }}
 */
export function createIndexFetcher({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('createIndexFetcher requires a fetch implementation')
  }

  /** @type {Map<string, { index: object, warnings: string[], fetchedAt: number, cachedAtMs: number, stale: boolean, error: Error | null }>} */
  const cache = new Map()
  /** @type {Map<string, Promise<any>>} */
  const inflight = new Map()
  /** @type {Map<string, Set<AbortController>>} */
  const controllers = new Map()
  let disposed = false

  function addController(key, controller) {
    let set = controllers.get(key)
    if (!set) {
      set = new Set()
      controllers.set(key, set)
    }
    set.add(controller)
  }

  function removeController(key, controller) {
    const set = controllers.get(key)
    if (!set) return
    set.delete(controller)
    if (set.size === 0) controllers.delete(key)
  }

  function abortControllers(key) {
    const set = controllers.get(key)
    if (!set) return
    for (const controller of [...set]) controller.abort()
  }

  async function load(parsed, key, signal, { controller, timeoutSignal, callerSignal }) {
    const url = parsed.href
    try {
      let response
      try {
        response = await fetchImpl(url, {
          redirect: 'error',
          signal,
          headers: { accept: 'application/json' },
        })
      } catch (error) {
        throw classifyFetchError(error, { url, timeoutSignal, callerSignal, controller })
      }

      if (!response || typeof response !== 'object') {
        throw new IndexFetchError('E_SOURCE_UNREACHABLE', 'fetch returned no response', { url })
      }
      if (response.status !== 200) {
        throw new IndexFetchError('E_SOURCE_HTTP', `unexpected HTTP status ${response.status}`, {
          url,
          status: response.status,
        })
      }

      const contentLength = Number(response.headers?.get?.('content-length'))
      if (Number.isFinite(contentLength) && contentLength > MAX_INDEX_BYTES) {
        throw new IndexFetchError('E_SOURCE_TOO_LARGE', `index body exceeds ${MAX_INDEX_BYTES} bytes`, { url })
      }

      let bytes
      try {
        bytes = await readBody(response, url)
      } catch (error) {
        if (error instanceof IndexFetchError) throw error
        throw classifyFetchError(error, { url, timeoutSignal, callerSignal, controller })
      }

      let text
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch (error) {
        throw new IndexFetchError('E_INDEX_INVALID', 'index body is not valid UTF-8', { url, cause: error })
      }
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

      let json
      try {
        json = JSON.parse(text)
      } catch (error) {
        throw new IndexFetchError('E_INDEX_INVALID', 'index body is not valid JSON', { url, cause: error })
      }

      let validated
      try {
        validated = validateIndex(json, url)
      } catch (error) {
        if (error instanceof MarketIndexError) throw error
        throw new IndexFetchError('E_INDEX_INVALID', error?.message || 'index validation failed', {
          url,
          cause: error,
        })
      }

      const fetchedAtMs = now()
      const entry = {
        index: validated.index,
        warnings: validated.warnings,
        fetchedAt: Math.floor(fetchedAtMs / 1000),
        cachedAtMs: fetchedAtMs,
        stale: false,
        error: null,
      }
      cache.set(key, entry)
      return {
        index: entry.index,
        fetchedAt: entry.fetchedAt,
        warnings: entry.warnings,
        stale: false,
      }
    } catch (error) {
      const cached = cache.get(key)
      const canceled = isCancellation(error, { callerSignal, controller, disposed })
      if (cached && !canceled && error?.code !== 'E_SOURCE_URL_INVALID') {
        cached.stale = true
        cached.error = error
        return {
          index: cached.index,
          fetchedAt: cached.fetchedAt,
          warnings: cached.warnings,
          stale: true,
          error,
        }
      }
      throw error
    }
  }

  function fetchIndex(url, { signal, refresh = false } = {}) {
    if (disposed) {
      return Promise.reject(new IndexFetchError('E_CANCELED', 'index fetcher is disposed', { url }))
    }

    let parsed
    try {
      parsed = checkIndexUrl(url)
    } catch (error) {
      return Promise.reject(error)
    }
    const key = parsed.href

    if (!refresh) {
      const cached = cache.get(key)
      if (cached && now() - cached.cachedAtMs < INDEX_CACHE_TTL_MS) {
        return Promise.resolve({
          index: cached.index,
          fetchedAt: cached.fetchedAt,
          warnings: cached.warnings,
          stale: cached.stale,
          ...(cached.error ? { error: cached.error } : {}),
        })
      }
    }

    const existing = inflight.get(key)
    if (existing) return existing

    const controller = new AbortController()
    addController(key, controller)

    const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
    const signals = [controller.signal, timeoutSignal]
    if (signal) signals.push(signal)
    const combined = signals.length === 1 ? signals[0] : AbortSignal.any(signals)

    const promise = load(parsed, key, combined, { controller, timeoutSignal, callerSignal: signal }).finally(() => {
      removeController(key, controller)
      if (inflight.get(key) === promise) inflight.delete(key)
    })

    inflight.set(key, promise)
    return promise
  }

  function invalidate(url) {
    const key = cacheKeyFor(url)
    cache.delete(key)
    abortControllers(key)
    inflight.delete(key)
  }

  function dispose() {
    disposed = true
    for (const set of controllers.values()) {
      for (const controller of set) controller.abort()
    }
    controllers.clear()
    inflight.clear()
    cache.clear()
  }

  return { fetchIndex, invalidate, dispose }
}
