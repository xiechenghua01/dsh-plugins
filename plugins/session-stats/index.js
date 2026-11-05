/**
 * Session Stats — Host half of the `@xiechenghua01/dsh-session-stats` bundle.
 *
 * Routes (registered on `ctx.webServer`, behind the `ctx.connection` trust fence):
 *   GET /session-stats/overview?days=N   -> the `overview` payload (CONTRACT §4)
 *   GET /session-stats/system            -> the `system` payload   (CONTRACT §5)
 *
 * The two exported `compute*` helpers are pure: they take every fact they need as
 * arguments (no Cordis context, no I/O, no `Date.now()`, no `process.env`), so they
 * can be exercised in plain Node.
 *
 *   computeOverview({ records, eventsById?, summaries?, unreadable?, titles?, sizes?,
 *                     archivedIds?, now, days?, config? })
 *     records    SessionRecord[] from `sessionQuery.listSessions()` (newest first)
 *     eventsById Map|object sessionId -> SessionEvent[] from `sessionQuery.readSession()`
 *     summaries  Map|object sessionId -> pre-folded per-session summary (cache path)
 *     unreadable Set|array of session ids whose log could not be read
 *     titles     `readTitleSnapshots()` result, or Map|object sessionId -> title
 *     sizes      `sessionPersistence.list()` result, or Map|object sessionId -> size facts
 *     archivedIds Set|array of archived session ids from `storages/workspace.json`
 *     now        epoch ms
 *     days       timeline window (1..365), defaults to config.days
 *     config     the plugin row config (merged over DEFAULTS)
 *
 *   computeSystem({ now, home?, logs?, history?|samples?, previous?, process?, cpus?,
 *                   memory?, loadavg?, uptime?, totalmem?, freemem?, cpu? })
 *     history    [{ t, process, system }] ring-buffer samples (`samples` is also accepted)
 *     previous   raw prior snapshot { t, process: { user, system }, cpus } to derive deltas
 *     process    raw process.cpuUsage() { user, system } in microseconds
 *     cpus       raw cpus() array; loadavg is the raw [l1, l5, l15]
 *     uptime/totalmem/freemem   raw node:os values
 *     memory     raw process.memoryUsage() { rss, heapUsed, heapTotal, external }
 *     cpu        optional normalized override { process, system, memory, systemMemory, uptimeSeconds }
 *     logs       { available, sessionLog, storage, attachments, spill, totalBytes }
 *
 * Both helpers never throw, sanitize every number, and never emit NaN/Infinity/-0.
 */
import { cpus, freemem, homedir, loadavg, totalmem, uptime } from 'node:os'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Cordis function-plugin name. */
export const name = 'session-stats'

/** The route carrier, the trust fence, the session corpus, the stored-log facts, and timers. */
export const inject = ['webServer', 'connection', 'sessionQuery', 'sessionPersistence', 'timer']

const OVERVIEW_PATH = '/session-stats/overview'
const SYSTEM_PATH = '/session-stats/system'

const DAY_MS = 86_400_000
const MAX_DAYS = 365
const MAX_HISTORY = 60
const MAX_LARGEST = 5
const LOG_READ_CONCURRENCY = 4
const WALK_MAX_ENTRIES = 20_000
const WALK_BUDGET_MS = 2_000
const BUDGET_PERIODS = new Set(['monthly', 'weekly', 'daily', 'total'])

/** Per-million-token USD rates used when the row config names none. */
const DEFAULT_RATES = { input: 0.28, output: 0.42, cacheRead: 0.028, cacheWrite: 0.28 }

/** Documented Host config defaults (CONTRACT §6); the row config is merged over these. */
const DEFAULTS = {
  days: 30,
  budget: { amount: 10, currency: 'USD', period: 'monthly' },
  pricing: { default: { ...DEFAULT_RATES }, models: {} },
  overviewCacheMs: 5_000,
  systemCacheMs: 1_000,
  logCacheMs: 5_000,
  sampleMs: 2_000,
}

// ---------------------------------------------------------------------------
// Small pure primitives
// ---------------------------------------------------------------------------

/** A plain JSON object (not null, not an array). */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A finite number, or the fallback. */
function num(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** A finite, non-negative integer count. */
function toCount(value) {
  const n = num(value, 0)
  if (n <= 0) return 0
  return Math.round(n)
}

/** A finite epoch-ms integer. */
function toEpoch(value, fallback = 0) {
  const n = num(value, fallback)
  return Math.trunc(n)
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value))
}

/** Round to `decimals` places, folding `-0` into `0`. */
function roundTo(value, decimals) {
  const n = num(value, 0)
  const factor = 10 ** decimals
  const rounded = Math.round(n * factor) / factor
  return rounded === 0 ? 0 : rounded
}

/** Money / cost / ratio: 6 decimals, never `-0`. */
function money(value) {
  return roundTo(value, 6)
}

/** A percentage clamped to 0..100 and rounded to 2 decimals. */
function percent(value) {
  return roundTo(clamp(num(value, 0), 0, 100), 2)
}

/** A percentage that is `null` when the input is not a finite number. */
function nullablePercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return percent(value)
}

function pad2(value) {
  return value < 10 ? `0${value}` : String(value)
}

/** Local `YYYY-MM-DD` key for a Date. */
function dayKeyOf(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Local midnight epoch ms for a Date. */
function localMidnightOf(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** ISO-8601 week label (`YYYY-Www`) for a Date. */
function isoWeekLabel(date) {
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = (thursday.getDay() + 6) % 7 // Monday = 0
  thursday.setDate(thursday.getDate() - weekday + 3) // Thursday of this ISO week
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  const firstWeekday = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstWeekday + 3)
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS))
  return `${thursday.getFullYear()}-W${pad2(week)}`
}

/** A fresh zeroed token vector. */
function emptyTokens() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0 }
}

/** Sanitize a token vector and derive `total` when the source omits it. */
function normalizeTokens(value) {
  const tokens = emptyTokens()
  if (!isPlainObject(value)) return tokens
  tokens.input = toCount(value.input)
  tokens.output = toCount(value.output)
  tokens.cacheRead = toCount(value.cacheRead)
  tokens.cacheWrite = toCount(value.cacheWrite)
  tokens.reasoning = toCount(value.reasoning)
  const declared = toCount(value.total)
  const components = tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite
  // The reported total is the component sum so the vector is always self-consistent;
  // an externally folded summary that only carries a total keeps it.
  tokens.total = components > 0 ? components : declared
  return tokens
}

/** Add one token vector into another (in place), sanitizing both sides. */
function addTokens(target, source) {
  const sourceTokens = normalizeTokens(source)
  target.input += sourceTokens.input
  target.output += sourceTokens.output
  target.cacheRead += sourceTokens.cacheRead
  target.cacheWrite += sourceTokens.cacheWrite
  target.reasoning += sourceTokens.reasoning
  target.total += sourceTokens.total
  return target
}

/** Merge one config layer over DEFAULTS; tolerant of missing or garbage input. */
function mergeConfig(raw) {
  const input = isPlainObject(raw) ? raw : {}

  const rawBudget = isPlainObject(input.budget) ? input.budget : {}
  const amount = num(rawBudget.amount, DEFAULTS.budget.amount)
  const currency = typeof rawBudget.currency === 'string' && rawBudget.currency.trim() !== ''
    ? rawBudget.currency.trim()
    : DEFAULTS.budget.currency
  const period = typeof rawBudget.period === 'string' && BUDGET_PERIODS.has(rawBudget.period)
    ? rawBudget.period
    : DEFAULTS.budget.period

  const rawPricing = isPlainObject(input.pricing) ? input.pricing : {}
  const rawDefault = isPlainObject(rawPricing.default) ? rawPricing.default : {}
  const defaultRates = {
    input: num(rawDefault.input, DEFAULT_RATES.input),
    output: num(rawDefault.output, DEFAULT_RATES.output),
    cacheRead: num(rawDefault.cacheRead, DEFAULT_RATES.cacheRead),
    cacheWrite: num(rawDefault.cacheWrite, DEFAULT_RATES.cacheWrite),
  }
  const models = {}
  const rawModels = isPlainObject(rawPricing.models) ? rawPricing.models : {}
  for (const [modelId, rate] of Object.entries(rawModels)) {
    if (typeof modelId !== 'string' || modelId === '' || !isPlainObject(rate)) continue
    models[modelId] = {
      input: num(rate.input, defaultRates.input),
      output: num(rate.output, defaultRates.output),
      cacheRead: num(rate.cacheRead, defaultRates.cacheRead),
      cacheWrite: num(rate.cacheWrite, defaultRates.cacheWrite),
    }
  }

  return {
    days: normalizeDays(input.days, DEFAULTS.days),
    budget: { amount: amount > 0 ? amount : 0, currency, period },
    pricing: { default: defaultRates, models },
    overviewCacheMs: Math.max(0, num(input.overviewCacheMs, DEFAULTS.overviewCacheMs)),
    systemCacheMs: Math.max(0, num(input.systemCacheMs, DEFAULTS.systemCacheMs)),
    logCacheMs: Math.max(0, num(input.logCacheMs, DEFAULTS.logCacheMs)),
    sampleMs: clamp(Math.round(num(input.sampleMs, DEFAULTS.sampleMs)), 250, 600_000),
  }
}

/** Clamp a requested timeline window to 1..365 days. */
function normalizeDays(value, fallback) {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return fallback
  return clamp(Math.trunc(parsed), 1, MAX_DAYS)
}

/** Per-event USD cost for one token vector under one rate row. */
function eventCost(tokens, rate) {
  const inCost = tokens.input * rate.input
  const outCost = tokens.output * rate.output
  const readCost = tokens.cacheRead * rate.cacheRead
  const writeCost = tokens.cacheWrite * rate.cacheWrite
  return (inCost + outCost + readCost + writeCost) / 1_000_000
}

/** The effective rate row for one model id (config override over the default row). */
function rateFor(pricing, model) {
  if (typeof model === 'string' && model !== '' && isPlainObject(pricing.models[model])) {
    return pricing.models[model]
  }
  return pricing.default
}

/** Read a Map, an array of records, or a plain object into a Map keyed by session id. */
function toLookup(value) {
  const lookup = new Map()
  if (value instanceof Map) {
    for (const [key, entry] of value) lookup.set(String(key), entry)
    return lookup
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!isPlainObject(entry)) continue
      const id = entry.header?.id ?? entry.sessionId ?? entry.id
      if (typeof id === 'string' && id !== '') lookup.set(id, entry)
    }
    return lookup
  }
  if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) lookup.set(key, entry)
  }
  return lookup
}

/** A Set of ids from a Set or an array. */
function toIdSet(value) {
  const ids = new Set()
  if (value instanceof Set) {
    for (const id of value) if (typeof id === 'string') ids.add(id)
    return ids
  }
  if (Array.isArray(value)) {
    for (const id of value) if (typeof id === 'string') ids.add(id)
  }
  return ids
}

/** The logical id of one SessionRecord (or a bare header). */
function recordId(record) {
  if (!isPlainObject(record)) return null
  const id = record.header?.id ?? record.id
  return typeof id === 'string' && id !== '' ? id : null
}

/** The header of one SessionRecord (or the record itself when it is a header). */
function recordHeader(record) {
  if (!isPlainObject(record)) return {}
  return isPlainObject(record.header) ? record.header : record
}

/** One title snapshot's display text, or null. */
function titleText(value) {
  if (typeof value === 'string') {
    const text = value.trim()
    return text === '' ? null : text
  }
  if (!isPlainObject(value)) return null
  const inner = value.title
  if (typeof inner === 'string') {
    const text = inner.trim()
    return text === '' ? null : text
  }
  if (isPlainObject(inner)) {
    const text = typeof inner.title === 'string' ? inner.title.trim() : ''
    if (text !== '') return text
  }
  if (isPlainObject(value.value)) return titleText(value.value)
  return null
}

/** `readTitleSnapshots()` result (or a Map/object) as sessionId -> title|null. */
function titleLookup(titles) {
  const lookup = new Map()
  if (Array.isArray(titles)) {
    for (const entry of titles) {
      if (!isPlainObject(entry)) continue
      const id = typeof entry.sessionId === 'string' ? entry.sessionId : null
      if (id === null) continue
      lookup.set(id, entry.status === 'rejected' ? null : titleText(entry.value))
    }
    return lookup
  }
  if (titles instanceof Map) {
    for (const [key, value] of titles) lookup.set(String(key), titleText(value))
    return lookup
  }
  if (isPlainObject(titles)) {
    for (const [key, value] of Object.entries(titles)) lookup.set(key, titleText(value))
  }
  return lookup
}

/** Persistence size facts for one session, normalized. */
function sizeInfoOf(sizes, id) {
  const entry = sizes.get(id)
  if (entry === undefined) return { sizeBytes: null, eventCount: null }
  if (typeof entry === 'number') return { sizeBytes: toCount(entry), eventCount: null }
  if (!isPlainObject(entry)) return { sizeBytes: null, eventCount: null }
  return {
    sizeBytes: typeof entry.sizeBytes === 'number' && Number.isFinite(entry.sizeBytes) ? toCount(entry.sizeBytes) : null,
    eventCount: typeof entry.eventCount === 'number' && Number.isFinite(entry.eventCount) ? toCount(entry.eventCount) : null,
  }
}

/** A zeroed per-session summary (used when a log cannot be read). */
function emptySummary(id, createdAt) {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    turns: 0,
    requests: 0,
    tokens: emptyTokens(),
    cost: 0,
    models: [],
    perModel: {},
    perModelDay: {},
    perDay: {},
    eventCount: 0,
    title: null,
    logBytes: 0,
    error: null,
  }
}

/**
 * Fold one session log into a compact summary.
 *
 * Only `assistant/message` events carry usage; `turn/start` counts turns. Cost is
 * attributed per `data.message.source.model` through the merged pricing table.
 */
function summarizeSession(record, events, pricing) {
  const header = recordHeader(record)
  const createdAt = toEpoch(header.createdAt, 0)
  const summary = emptySummary(typeof header.id === 'string' ? header.id : '', createdAt)
  const list = Array.isArray(events) ? events : []
  const seenModels = new Set()

  for (const event of list) {
    if (!isPlainObject(event)) continue
    const time = toEpoch(event.time, createdAt)
    if (time > summary.updatedAt) summary.updatedAt = time
    if (event.type === 'turn/start') {
      summary.turns += 1
      continue
    }
    if (event.type !== 'assistant/message') continue

    const data = isPlainObject(event.data) ? event.data : {}
    const usage = isPlainObject(data.usage) ? data.usage : {}
    const tokens = emptyTokens()
    tokens.input = toCount(usage.inputTokens)
    tokens.output = toCount(usage.outputTokens)
    tokens.cacheRead = toCount(usage.cacheReadTokens)
    tokens.cacheWrite = toCount(usage.cacheWriteTokens)
    tokens.reasoning = toCount(usage.reasoningTokens)
    // CONTRACT §3.2: totalTokens already equals input + output + cacheRead when present,
    // so the component sum is the canonical total (and keeps the vector consistent).
    tokens.total = tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite

    const message = isPlainObject(data.message) ? data.message : {}
    const source = isPlainObject(message.source) ? message.source : {}
    const model = typeof source.model === 'string' && source.model !== '' ? source.model : null
    const provider = typeof source.provider === 'string' ? source.provider : ''

    const cost = eventCost(tokens, rateFor(pricing, model))
    addTokens(summary.tokens, tokens)
    summary.cost += cost
    summary.requests += 1

    const date = new Date(time)
    const key = dayKeyOf(date)
    let day = summary.perDay[key]
    if (day === undefined) {
      day = { start: localMidnightOf(date), tokens: emptyTokens(), cost: 0, requests: 0 }
      summary.perDay[key] = day
    }
    addTokens(day.tokens, tokens)
    day.cost += cost
    day.requests += 1

    if (model !== null) {
      const modelKey = `${provider}\u0000${model}`
      let aggregate = summary.perModel[modelKey]
      if (aggregate === undefined) {
        aggregate = { provider, model, requests: 0, tokens: emptyTokens(), cost: 0 }
        summary.perModel[modelKey] = aggregate
      }
      aggregate.requests += 1
      addTokens(aggregate.tokens, tokens)
      aggregate.cost += cost
      // Per-model per-local-day fold for the daily token trend; the client reads it
      // through `models[].daily`, aligned with `timeline.buckets`.
      let modelDay = summary.perModelDay[modelKey]
      if (modelDay === undefined) {
        modelDay = {}
        summary.perModelDay[modelKey] = modelDay
      }
      let dayForModel = modelDay[key]
      if (dayForModel === undefined) {
        dayForModel = { start: localMidnightOf(date), tokens: emptyTokens(), cost: 0, requests: 0 }
        modelDay[key] = dayForModel
      }
      addTokens(dayForModel.tokens, tokens)
      dayForModel.cost += cost
      dayForModel.requests += 1
      if (!seenModels.has(model)) {
        seenModels.add(model)
        summary.models.push(model)
      }
    }
  }

  summary.eventCount = list.length
  return summary
}

/** The last `days` local days, oldest first, as zeroed timeline buckets. */
function buildBuckets(now, days) {
  const today = new Date(now)
  const year = today.getFullYear()
  const month = today.getMonth()
  const date = today.getDate()
  const buckets = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(year, month, date - offset)
    buckets.push({
      key: dayKeyOf(day),
      start: day.getTime(),
      tokens: emptyTokens(),
      cost: 0,
      requests: 0,
      sessionIds: new Set(),
    })
  }
  return buckets
}

/** The start (local midnight) and label of the current budget period. */
function budgetPeriodOf(now, period) {
  const date = new Date(now)
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  switch (period) {
    case 'daily': {
      const start = new Date(year, month, day)
      return { start: start.getTime(), label: dayKeyOf(start) }
    }
    case 'weekly': {
      const offset = (date.getDay() + 6) % 7 // Monday = 0
      const start = new Date(year, month, day - offset)
      return { start: start.getTime(), label: isoWeekLabel(start) }
    }
    case 'total':
      return { start: 0, label: 'all' }
    case 'monthly':
    default: {
      const start = new Date(year, month, 1)
      return { start: start.getTime(), label: `${year}-${pad2(month + 1)}` }
    }
  }
}

/** The end of the current budget period (exclusive), or null for the all-time period. */
function budgetPeriodEndOf(now, period) {
  const date = new Date(now)
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  switch (period) {
    case 'daily':
      return new Date(year, month, day + 1).getTime()
    case 'weekly': {
      const offset = (date.getDay() + 6) % 7 // Monday = 0
      return new Date(year, month, day - offset + 7).getTime()
    }
    case 'total':
      return null
    case 'monthly':
    default:
      return new Date(year, month + 1, 1).getTime()
  }
}

/** Complete days left in the current budget period (0 on its last day); null for `total`. */
function remainingPeriodDaysOf(now, period) {
  const end = budgetPeriodEndOf(now, period)
  if (end === null) return null
  return Math.max(0, Math.floor((end - now) / DAY_MS))
}

/** Mean daily cost of the last `window` complete days (today excluded). */
function recentDailyAverage(buckets, now, window = 7) {
  const todayKey = dayKeyOf(new Date(now))
  const completed = []
  for (const bucket of buckets) {
    if (bucket.key === todayKey) continue
    completed.push(bucket)
  }
  const recent = completed.slice(-window)
  if (recent.length === 0) return 0
  let total = 0
  for (const bucket of recent) total += num(bucket.cost, 0)
  return total / recent.length
}

/** The exact §4 payload shape with every number zeroed (last-resort fallback). */
function emptyOverview(now, days, config) {
  const currency = config.budget.currency
  let buckets = []
  try {
    buckets = buildBuckets(now, days).map((bucket) => ({
      key: bucket.key,
      start: bucket.start,
      tokens: emptyTokens(),
      cost: 0,
      requests: 0,
      sessions: 0,
    }))
  } catch {
    buckets = []
  }
  const period = budgetPeriodOf(now, config.budget.period)
  return {
    generatedAt: toEpoch(now, 0),
    currency,
    days,
    pricing: {
      currency,
      per: 'millionTokens',
      default: { ...config.pricing.default },
      models: { ...config.pricing.models },
    },
    totals: {
      sessions: 0,
      liveSessions: 0,
      turns: 0,
      requests: 0,
      tokens: emptyTokens(),
      cost: 0,
    },
    budget: {
      amount: config.budget.amount,
      configuredAmount: config.budget.amount,
      currency,
      period: config.budget.period,
      used: 0,
      ratio: 0,
      remaining: config.budget.amount > 0 ? money(config.budget.amount) : 0,
      estimate: null,
      dailyAverage: 0,
      remainingDays: null,
      dynamic: false,
      periodStart: period.start,
      periodLabel: period.label,
      withinPeriodTokens: emptyTokens(),
      withinPeriodCost: 0,
    },
    timeline: { granularity: 'day', buckets },
    models: [],
    sessions: [],
  }
}

// ---------------------------------------------------------------------------
// computeOverview — pure (CONTRACT §4)
// ---------------------------------------------------------------------------

/**
 * Build the `overview` payload from already-read session facts.
 * @param {object} input - see the module header; every fact is passed in.
 * @returns the exact §4 payload, never throwing.
 */
export function computeOverview(input) {
  const source = isPlainObject(input) ? input : {}
  const config = mergeConfig(source.config)
  const now = toEpoch(source.now, 0)
  const days = normalizeDays(source.days, config.days)
  const currency = config.budget.currency

  try {
    const records = Array.isArray(source.records) ? source.records : []
    const eventsById = toLookup(source.eventsById)
    const summariesById = toLookup(source.summaries)
    const titles = titleLookup(source.titles)
    const sizes = toLookup(source.sizes)
    const unreadable = toIdSet(source.unreadable)
    const archivedIds = toIdSet(source.archivedIds)

    const payloadSessions = []
    const folds = []
    const observedModels = new Set()
    const totals = {
      sessions: 0,
      liveSessions: 0,
      turns: 0,
      requests: 0,
      tokens: emptyTokens(),
      cost: 0,
    }

    for (const record of records) {
      const id = recordId(record)
      if (id === null) continue
      const header = recordHeader(record)
      const createdAt = toEpoch(header.createdAt, 0)
      const live = record.live === true
      const sizeInfo = sizeInfoOf(sizes, id)

      let summary = summariesById.get(id)
      if (!isPlainObject(summary)) {
        const events = eventsById.get(id)
        if (events !== undefined) {
          summary = summarizeSession({ header }, events, config.pricing)
        } else {
          summary = emptySummary(id, createdAt)
          summary.error = 'unreadable'
        }
      }
      if (unreadable.has(id) && summary.error !== 'unreadable') {
        summary = { ...summary, error: 'unreadable' }
      }

      const summaryTitle = typeof summary.title === 'string' && summary.title.trim() !== ''
        ? summary.title.trim()
        : null
      const title = summaryTitle ?? titles.get(id) ?? null
      const tokens = normalizeTokens(summary.tokens)
      const cost = num(summary.cost, 0)
      const eventCount = Number.isFinite(summary.eventCount)
        ? toCount(summary.eventCount)
        : (sizeInfo.eventCount ?? 0)
      const logBytes = sizeInfo.sizeBytes !== null
        ? sizeInfo.sizeBytes
        : toCount(summary.logBytes)

      const entry = {
        id,
        title,
        createdAt,
        updatedAt: toEpoch(summary.updatedAt, createdAt),
        live,
        archived: archivedIds.has(id),
        turns: toCount(summary.turns),
        requests: toCount(summary.requests),
        tokens,
        cost: money(cost),
        logBytes,
        eventCount,
        models: Array.isArray(summary.models)
          ? summary.models.filter((model) => typeof model === 'string' && model !== '')
          : [],
        error: summary.error === 'unreadable' ? 'unreadable' : null,
      }
      payloadSessions.push(entry)
      folds.push({ entry, summary })

      totals.sessions += 1
      if (live) totals.liveSessions += 1
      totals.turns += entry.turns
      totals.requests += entry.requests
      addTokens(totals.tokens, tokens)
      totals.cost += cost
    }

    // Timeline: exactly `days` local buckets, oldest -> newest, including empty days.
    const buckets = buildBuckets(now, days)
    const bucketByKey = new Map()
    for (const bucket of buckets) bucketByKey.set(bucket.key, bucket)

    // Model breakdown, per-model pricing usage, and the budget window.
    const modelAggregates = new Map()
    const period = budgetPeriodOf(now, config.budget.period)
    const withinPeriodTokens = emptyTokens()
    let withinPeriodCost = 0

    for (const fold of folds) {
      const perDay = isPlainObject(fold.summary.perDay) ? fold.summary.perDay : {}
      for (const [key, value] of Object.entries(perDay)) {
        if (!isPlainObject(value)) continue
        const dayTokens = normalizeTokens(value.tokens)
        const dayCost = num(value.cost, 0)
        const dayRequests = toCount(value.requests)
        const bucket = bucketByKey.get(key)
        if (bucket !== undefined) {
          addTokens(bucket.tokens, dayTokens)
          bucket.cost += dayCost
          bucket.requests += dayRequests
          if (dayRequests > 0) bucket.sessionIds.add(fold.entry.id)
        }
        const start = num(value.start, -1)
        if (start >= 0 && start >= period.start) {
          addTokens(withinPeriodTokens, dayTokens)
          withinPeriodCost += dayCost
        }
      }

      const perModel = isPlainObject(fold.summary.perModel) ? fold.summary.perModel : {}
      const perModelDay = isPlainObject(fold.summary.perModelDay) ? fold.summary.perModelDay : {}
      for (const [modelKey, value] of Object.entries(perModel)) {
        if (!isPlainObject(value)) continue
        const model = typeof value.model === 'string' ? value.model : ''
        if (model === '') continue
        const provider = typeof value.provider === 'string' ? value.provider : ''
        let aggregate = modelAggregates.get(modelKey)
        if (aggregate === undefined) {
          aggregate = { provider, model, requests: 0, tokens: emptyTokens(), cost: 0, daily: new Map() }
          modelAggregates.set(modelKey, aggregate)
        }
        aggregate.requests += toCount(value.requests)
        addTokens(aggregate.tokens, value.tokens)
        aggregate.cost += num(value.cost, 0)
        const byDay = isPlainObject(perModelDay[modelKey]) ? perModelDay[modelKey] : {}
        for (const [dayKey, dayValue] of Object.entries(byDay)) {
          if (!isPlainObject(dayValue)) continue
          let cell = aggregate.daily.get(dayKey)
          if (cell === undefined) {
            cell = { tokens: 0, cost: 0, requests: 0 }
            aggregate.daily.set(dayKey, cell)
          }
          cell.tokens += normalizeTokens(dayValue.tokens).total
          cell.cost += num(dayValue.cost, 0)
          cell.requests += toCount(dayValue.requests)
        }
        observedModels.add(model)
      }
    }

    // `pricing.models` is the merged effective table: configured overrides first,
    // then every model observed in the logs at the default rate (so the client can
    // show which rate was applied even with an empty `pricing.models` config).
    const effectiveModels = {}
    for (const [modelId, rate] of Object.entries(config.pricing.models)) {
      effectiveModels[modelId] = { ...rate }
    }
    for (const model of observedModels) {
      if (effectiveModels[model] === undefined) effectiveModels[model] = { ...config.pricing.default }
    }

    payloadSessions.sort((left, right) => (
      (right.cost - left.cost)
      || (right.tokens.total - left.tokens.total)
      || (right.createdAt - left.createdAt)
    ))

    // One entry per model with its all-time totals plus a windowed daily series:
    // `daily` is aligned index-for-index with `timeline.buckets` (same `days` window),
    // and `window` is the sum over exactly those buckets. The client's model trend and
    // model list read the window fields, so both stay consistent with the chart axis.
    const modelRows = [...modelAggregates.values()]
      .map((aggregate) => {
        const daily = buckets.map((bucket) => {
          const cell = aggregate.daily.get(bucket.key)
          return {
            key: bucket.key,
            start: bucket.start,
            tokens: cell === undefined ? 0 : toCount(cell.tokens),
            cost: money(cell === undefined ? 0 : cell.cost),
            requests: cell === undefined ? 0 : toCount(cell.requests),
          }
        })
        let windowTokens = 0
        let windowCost = 0
        let windowRequests = 0
        for (const day of daily) {
          windowTokens += day.tokens
          windowCost += day.cost
          windowRequests += day.requests
        }
        return {
          provider: aggregate.provider,
          model: aggregate.model,
          requests: toCount(aggregate.requests),
          tokens: normalizeTokens(aggregate.tokens),
          cost: money(aggregate.cost),
          window: {
            tokens: toCount(windowTokens),
            cost: money(windowCost),
            requests: toCount(windowRequests),
          },
          daily,
        }
      })
      .sort((left, right) => (
        (right.cost - left.cost)
        || (right.tokens.total - left.tokens.total)
        || left.model.localeCompare(right.model)
      ))

    const timelineBuckets = buckets.map((bucket) => ({
      key: bucket.key,
      start: bucket.start,
      tokens: normalizeTokens(bucket.tokens),
      cost: money(bucket.cost),
      requests: toCount(bucket.requests),
      sessions: bucket.sessionIds.size,
    }))

    const configuredAmount = money(config.budget.amount)
    const used = money(withinPeriodCost)
    // The budget is a live estimate rather than a fixed cap: month-to-date plus the
    // recent daily pace over the days the period still has. The configured amount is
    // only the initial fallback (no history yet, or the all-time period, which has no
    // end to estimate toward). The reported amount never drops below `used`, so the
    // remaining figure stays non-negative and a stale over-budget state cannot persist.
    const dailyAverage = money(recentDailyAverage(timelineBuckets, now))
    const remainingDays = remainingPeriodDaysOf(now, config.budget.period)
    const estimate = configuredAmount > 0 && remainingDays !== null && dailyAverage > 0
      ? money(used + remainingDays * dailyAverage)
      : null
    const amount = configuredAmount <= 0
      ? 0
      : Math.max(estimate !== null ? estimate : configuredAmount, used)
    // Derived from the reported `used`, so ratio === used / amount and
    // remaining === amount - used hold exactly, with remaining never negative.
    const ratio = amount > 0 ? money(used / amount) : 0
    const remaining = amount > 0 ? money(amount - used) : 0

    return {
      generatedAt: toEpoch(now, 0),
      currency,
      days,
      pricing: {
        currency,
        per: 'millionTokens',
        default: { ...config.pricing.default },
        models: effectiveModels,
      },
      totals: {
        sessions: totals.sessions,
        liveSessions: totals.liveSessions,
        turns: toCount(totals.turns),
        requests: toCount(totals.requests),
        tokens: normalizeTokens(totals.tokens),
        cost: money(totals.cost),
      },
      budget: {
        amount: money(amount),
        configuredAmount,
        currency,
        period: config.budget.period,
        used,
        ratio,
        remaining,
        estimate,
        dailyAverage,
        remainingDays,
        dynamic: estimate !== null,
        periodStart: toEpoch(period.start, 0),
        periodLabel: period.label,
        withinPeriodTokens: normalizeTokens(withinPeriodTokens),
        withinPeriodCost: used,
      },
      timeline: { granularity: 'day', buckets: timelineBuckets },
      models: modelRows,
      sessions: payloadSessions,
    }
  } catch {
    return emptyOverview(now, days, config)
  }
}

// ---------------------------------------------------------------------------
// computeSystem — pure (CONTRACT §5)
// ---------------------------------------------------------------------------

/**
 * Build the `system` payload from runtime and log-footprint facts passed in by the
 * caller: the normalized `cpu` snapshot produced by the Host sampler and/or the raw
 * `process`/`cpus`/`loadavg`/`uptime`/`totalmem`/`freemem`/`memory` facts, plus an
 * optional `previous` raw snapshot from which the CPU deltas are derived.
 * @param {object} input - see the module header; every fact is passed in.
 * @returns the exact §5 payload, never throwing.
 */
export function computeSystem(input) {
  const source = isPlainObject(input) ? input : {}
  const now = toEpoch(source.now, 0)
  // A caller may pass either the normalized cpu snapshot (the Host route) or the raw
  // os/process facts; explicit normalized fields win, raw facts fill the gaps, and
  // deltas are derived from `previous`.
  const cpuInput = isPlainObject(source.cpu) ? source.cpu : {}
  const processInput = isPlainObject(cpuInput.process) ? cpuInput.process : {}
  const systemInput = isPlainObject(cpuInput.system) ? cpuInput.system : {}
  const memoryInput = isPlainObject(cpuInput.memory) ? cpuInput.memory : {}
  const systemMemoryInput = isPlainObject(cpuInput.systemMemory) ? cpuInput.systemMemory : {}
  const processFacts = isPlainObject(source.process) ? source.process : {}
  const memoryFacts = isPlainObject(source.memory) ? source.memory : {}
  const cpusFacts = Array.isArray(source.cpus) ? source.cpus : []
  const loadFacts = Array.isArray(source.loadavg) ? source.loadavg : []
  const previousFacts = isPlainObject(source.previous) ? source.previous : null
  const logsInput = isPlainObject(source.logs) ? source.logs : {}
  const home = typeof source.home === 'string'
    ? source.home
    : (typeof logsInput.home === 'string' ? logsInput.home : '')

  /** Summed cpu times of one `cpus()` snapshot, or null when it has no usable core. */
  const sumCpuTimes = (list) => {
    if (!Array.isArray(list) || list.length === 0) return null
    let user = 0
    let nice = 0
    let sys = 0
    let idle = 0
    let irq = 0
    let cores = 0
    for (const core of list) {
      const times = isPlainObject(core?.times) ? core.times : null
      if (times === null) continue
      user += num(times.user)
      nice += num(times.nice)
      sys += num(times.sys)
      idle += num(times.idle)
      irq += num(times.irq)
      cores += 1
    }
    return cores === 0 ? null : { total: user + nice + sys + idle + irq, idle, cores }
  }

  try {
    const historyInput = Array.isArray(source.history)
      ? source.history
      : (Array.isArray(source.samples)
        ? source.samples
        : (Array.isArray(cpuInput.history) ? cpuInput.history : []))
    const history = []
    for (const entry of historyInput) {
      if (!isPlainObject(entry)) continue
      history.push({
        t: toEpoch(entry.t, 0),
        process: percent(entry.process),
        system: percent(entry.system),
      })
      if (history.length >= MAX_HISTORY) break
    }

    // CPU deltas over the previous raw snapshot (one core = 100%), when one is supplied.
    const sampledAt = toEpoch(source.sampledAt, now)
    let computedProcessPercent = null
    let computedSystemPercent = null
    if (previousFacts !== null) {
      const elapsedMs = sampledAt - toEpoch(previousFacts.t, 0)
      if (elapsedMs > 0) {
        const previousProcess = isPlainObject(previousFacts.process) ? previousFacts.process : {}
        const busyMicros = (num(processFacts.user) - num(previousProcess.user))
          + (num(processFacts.system) - num(previousProcess.system))
        computedProcessPercent = percent((busyMicros / (elapsedMs * 1000)) * 100)
      }
      const currentTimes = sumCpuTimes(cpusFacts)
      const previousTimes = sumCpuTimes(previousFacts.cpus)
      if (currentTimes !== null && previousTimes !== null) {
        const totalDelta = currentTimes.total - previousTimes.total
        const idleDelta = currentTimes.idle - previousTimes.idle
        if (totalDelta > 0) computedSystemPercent = percent(((totalDelta - idleDelta) / totalDelta) * 100)
      }
    }

    const totalBytes = Number.isFinite(systemMemoryInput.totalBytes)
      ? toCount(systemMemoryInput.totalBytes)
      : toCount(source.totalmem)
    const freeBytes = Number.isFinite(systemMemoryInput.freeBytes)
      ? toCount(systemMemoryInput.freeBytes)
      : toCount(source.freemem)
    const usedRatio = Number.isFinite(systemMemoryInput.usedRatio)
      ? roundTo(clamp(num(systemMemoryInput.usedRatio), 0, 1), 4)
      : (totalBytes > 0 ? roundTo(clamp((totalBytes - freeBytes) / totalBytes, 0, 1), 4) : 0)

    const sessionLogInput = isPlainObject(logsInput.sessionLog) ? logsInput.sessionLog : {}
    const largest = []
    if (Array.isArray(sessionLogInput.largest)) {
      for (const entry of sessionLogInput.largest) {
        if (!isPlainObject(entry)) continue
        const id = typeof entry.id === 'string' ? entry.id : null
        if (id === null) continue
        largest.push({
          id,
          title: typeof entry.title === 'string' && entry.title.trim() !== '' ? entry.title.trim() : null,
          bytes: toCount(entry.bytes),
        })
        if (largest.length >= MAX_LARGEST) break
      }
    }

    const storageInput = isPlainObject(logsInput.storage) ? logsInput.storage : {}
    const storageEntries = []
    if (Array.isArray(storageInput.entries)) {
      for (const entry of storageInput.entries) {
        if (!isPlainObject(entry)) continue
        const name = typeof entry.name === 'string' ? entry.name : null
        if (name === null) continue
        storageEntries.push({ name, bytes: toCount(entry.bytes) })
      }
      storageEntries.sort((left, right) => right.bytes - left.bytes)
    }

    const attachmentsInput = isPlainObject(logsInput.attachments) ? logsInput.attachments : {}
    const spillInput = isPlainObject(logsInput.spill) ? logsInput.spill : {}
    const logsAvailable = isPlainObject(source.logs) && logsInput.available !== false

    const sessionLogBytes = toCount(sessionLogInput.bytes)
    const storageBytes = toCount(storageInput.bytes)
    const attachmentBytes = toCount(attachmentsInput.bytes)
    const spillBytes = toCount(spillInput.bytes)
    const computedTotal = sessionLogBytes + storageBytes + attachmentBytes + spillBytes

    return {
      generatedAt: now,
      cpu: {
        process: {
          percent: nullablePercent(processInput.percent) ?? computedProcessPercent,
          userMs: Math.round(Number.isFinite(processInput.userMs)
            ? num(processInput.userMs)
            : num(processFacts.user) / 1000),
          systemMs: Math.round(Number.isFinite(processInput.systemMs)
            ? num(processInput.systemMs)
            : num(processFacts.system) / 1000),
        },
        system: {
          percent: nullablePercent(systemInput.percent) ?? computedSystemPercent,
          cores: Number.isFinite(systemInput.cores)
            ? toCount(systemInput.cores)
            : (sumCpuTimes(cpusFacts)?.cores ?? cpusFacts.length),
          load1: roundTo(Number.isFinite(systemInput.load1) ? systemInput.load1 : loadFacts[0], 2),
          load5: roundTo(Number.isFinite(systemInput.load5) ? systemInput.load5 : loadFacts[1], 2),
          load15: roundTo(Number.isFinite(systemInput.load15) ? systemInput.load15 : loadFacts[2], 2),
        },
        memory: {
          rssBytes: toCount(Number.isFinite(memoryInput.rssBytes) ? memoryInput.rssBytes : memoryFacts.rss),
          heapUsedBytes: toCount(Number.isFinite(memoryInput.heapUsedBytes) ? memoryInput.heapUsedBytes : memoryFacts.heapUsed),
          heapTotalBytes: toCount(Number.isFinite(memoryInput.heapTotalBytes) ? memoryInput.heapTotalBytes : memoryFacts.heapTotal),
          externalBytes: toCount(Number.isFinite(memoryInput.externalBytes) ? memoryInput.externalBytes : memoryFacts.external),
        },
        systemMemory: { totalBytes, freeBytes, usedRatio },
        uptimeSeconds: Number.isFinite(cpuInput.uptimeSeconds) ? toCount(cpuInput.uptimeSeconds) : toCount(source.uptime),
        history,
      },
      logs: {
        home,
        available: logsAvailable,
        sessionLog: {
          bytes: sessionLogBytes,
          count: toCount(sessionLogInput.count),
          eventCount: toCount(sessionLogInput.eventCount),
          largest,
          available: sessionLogInput.available !== false && logsAvailable,
          walkBytes: toCount(sessionLogInput.walkBytes),
        },
        storage: {
          bytes: storageBytes,
          entries: storageEntries,
          available: storageInput.available !== false && logsAvailable,
        },
        attachments: {
          bytes: attachmentBytes,
          available: attachmentsInput.available !== false && logsAvailable,
        },
        spill: {
          bytes: spillBytes,
          files: toCount(spillInput.files),
          available: spillInput.available !== false && logsAvailable,
        },
        totalBytes: Number.isFinite(logsInput.totalBytes) ? toCount(logsInput.totalBytes) : computedTotal,
      },
    }
  } catch {
    return {
      generatedAt: now,
      cpu: {
        process: { percent: null, userMs: 0, systemMs: 0 },
        system: { percent: null, cores: 0, load1: 0, load5: 0, load15: 0 },
        memory: { rssBytes: 0, heapUsedBytes: 0, heapTotalBytes: 0, externalBytes: 0 },
        systemMemory: { totalBytes: 0, freeBytes: 0, usedRatio: 0 },
        uptimeSeconds: 0,
        history: [],
      },
      logs: {
        home,
        available: false,
        sessionLog: { bytes: 0, count: 0, eventCount: 0, largest: [], available: false, walkBytes: 0 },
        storage: { bytes: 0, entries: [], available: false },
        attachments: { bytes: 0, available: false },
        spill: { bytes: 0, files: 0, available: false },
        totalBytes: 0,
      },
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers (mirroring dsh-host-open-in-app)
// ---------------------------------------------------------------------------

/** The composition's connection service (typed locally: its package is browser-side). */
function connectionOf(ctx) {
  return Reflect.get(ctx, 'connection')
}

/** JSON response (`no-store`: every payload is a live fact). */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/** 405 with the route's one supported method. */
function sendMethodNotAllowed(res, allow) {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

/** Answer an untrusted/unauthenticated request; true when it was already answered. */
function rejected(ctx, req, res) {
  const rejection = connectionOf(ctx).requestRejection(req)
  if (rejection === undefined) return false
  res.statusCode = rejection
  res.end()
  return true
}

/** A 500 JSON body that never throws out of the handler. */
function sendFailure(res, error) {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown error')
  try {
    sendJson(res, 500, { code: 'internal-error', message: message.slice(0, 500) })
  } catch {
    try {
      res.statusCode = 500
      res.end()
    } catch {
      /* the socket is already gone */
    }
  }
}

/** The `days` query parameter, clamped to 1..365, falling back to the configured default. */
function daysFromRequest(req, fallback) {
  try {
    const url = new URL(String(req.url ?? ''), 'http://localhost')
    return normalizeDays(url.searchParams.get('days'), fallback)
  } catch {
    return fallback
  }
}

/** Whether the request asks to bypass every response cache (`refresh=1`). */
function forceFromRequest(req) {
  try {
    const url = new URL(String(req.url ?? ''), 'http://localhost')
    const value = url.searchParams.get('refresh')
    return value === '1' || value === 'true'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Host-only runtime facts (I/O is allowed here; the pure helpers above stay pure)
// ---------------------------------------------------------------------------

/** Run `worker` over `items` with a bounded number of concurrent callers. */
async function mapLimit(items, limit, worker) {
  const queue = [...items]
  const width = Math.max(1, Math.min(limit, queue.length))
  const runners = []
  for (let index = 0; index < width; index += 1) {
    runners.push((async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        await worker(item)
      }
    })())
  }
  await Promise.all(runners)
}

function isMissingEntry(error) {
  return error !== null
    && typeof error === 'object'
    && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
}

/**
 * Best-effort recursive byte walk of one directory tree.
 * Bounded by a shared entry counter and wall-clock deadline; never throws.
 */
async function walkTree(root, budget) {
  const result = { bytes: 0, files: 0, dirs: 0, available: true, truncated: false }
  const stack = [root]
  while (stack.length > 0) {
    if (budget.entries >= WALK_MAX_ENTRIES || Date.now() > budget.deadline) {
      result.truncated = true
      break
    }
    const directory = stack.pop()
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (!isMissingEntry(error)) result.available = false
      continue
    }
    for (const entry of entries) {
      if (budget.entries >= WALK_MAX_ENTRIES || Date.now() > budget.deadline) {
        result.truncated = true
        break
      }
      budget.entries += 1
      const full = join(directory, entry.name)
      if (entry.isDirectory()) {
        result.dirs += 1
        stack.push(full)
        continue
      }
      if (entry.isSymbolicLink() || !entry.isFile()) continue
      try {
        const info = await lstat(full)
        result.bytes += toCount(info.size)
        result.files += 1
      } catch {
        result.available = false
      }
    }
  }
  return result
}

/** One `storages` directory: per-child bytes, largest first. */
async function walkStorage(root, budget) {
  const entries = []
  let bytes = 0
  let available = true
  let children
  try {
    children = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (!isMissingEntry(error)) available = false
    return { bytes: 0, entries, available }
  }
  for (const child of children) {
    if (budget.entries >= WALK_MAX_ENTRIES || Date.now() > budget.deadline) break
    budget.entries += 1
    const full = join(root, child.name)
    if (child.isDirectory()) {
      const walked = await walkTree(full, budget)
      entries.push({ name: child.name, bytes: toCount(walked.bytes) })
      bytes += toCount(walked.bytes)
      if (!walked.available) available = false
      continue
    }
    if (child.isSymbolicLink() || !child.isFile()) continue
    try {
      const info = await lstat(full)
      const size = toCount(info.size)
      entries.push({ name: child.name, bytes: size })
      bytes += size
    } catch {
      available = false
    }
  }
  entries.sort((left, right) => right.bytes - left.bytes)
  return { bytes, entries, available }
}

/**
 * A CPU/memory sampler with a previous-sample delta and a 60-sample ring buffer.
 * `percent` stays `null` until a delta exists (the first sample after activation).
 */
function createCpuSampler() {
  let previous = null
  let latest = null
  const history = []

  const sample = () => {
    try {
      const now = Date.now()
      const usage = process.cpuUsage()
      const cores = cpus()
      let user = 0
      let nice = 0
      let sys = 0
      let idle = 0
      let irq = 0
      for (const core of cores) {
        const times = core?.times
        if (!isPlainObject(times)) continue
        user += num(times.user)
        nice += num(times.nice)
        sys += num(times.sys)
        idle += num(times.idle)
        irq += num(times.irq)
      }
      const total = user + nice + sys + idle + irq
      const memory = process.memoryUsage()
      const [load1, load5, load15] = loadavg()

      let processPercent = null
      let systemPercent = null
      if (previous !== null) {
        const wallMicros = (now - previous.t) * 1000
        const busyMicros = (num(usage.user) - previous.user) + (num(usage.system) - previous.system)
        if (wallMicros > 0) processPercent = percent((busyMicros / wallMicros) * 100)
        const totalDelta = total - previous.total
        const idleDelta = idle - previous.idle
        if (totalDelta > 0) systemPercent = percent(((totalDelta - idleDelta) / totalDelta) * 100)
        history.push({
          t: now,
          process: processPercent === null ? 0 : processPercent,
          system: systemPercent === null ? 0 : systemPercent,
        })
        while (history.length > MAX_HISTORY) history.shift()
      }

      previous = {
        t: now,
        user: num(usage.user),
        system: num(usage.system),
        total,
        idle,
      }

      const totalMemory = toCount(totalmem())
      const freeMemory = toCount(freemem())
      latest = {
        process: {
          percent: processPercent,
          userMs: num(usage.user) / 1000,
          systemMs: num(usage.system) / 1000,
        },
        system: {
          percent: systemPercent,
          cores: cores.length,
          load1: num(load1),
          load5: num(load5),
          load15: num(load15),
        },
        memory: {
          rssBytes: num(memory.rss),
          heapUsedBytes: num(memory.heapUsed),
          heapTotalBytes: num(memory.heapTotal),
          externalBytes: num(memory.external),
        },
        systemMemory: {
          totalBytes: totalMemory,
          freeBytes: freeMemory,
          usedRatio: totalMemory > 0 ? (totalMemory - freeMemory) / totalMemory : 0,
        },
        uptimeSeconds: num(uptime()),
      }
    } catch {
      /* sampling must never break the plugin */
    }
  }

  return {
    sample,
    latest: () => latest,
    history: () => history,
  }
}

/** A per-session cache entry is fresh when its revision still matches the stored log. */
function isCacheFresh(entry, revision, now, ttlMs) {
  if (!isPlainObject(entry)) return false
  if (revision !== null) return entry.revision === revision
  // No persistence listing to validate against: fall back to the overview TTL.
  return entry.revision === null && now - toEpoch(entry.at, 0) < ttlMs
}

// ---------------------------------------------------------------------------
// Cordis plugin entry point
// ---------------------------------------------------------------------------

/**
 * Register the two routes and the CPU sampler.
 * @param {object} ctx - owning Cordis context (webServer + connection + sessionQuery + sessionPersistence).
 * @param {object} config - the plugin row config, merged over DEFAULTS.
 */
export function apply(ctx, config) {
  const settings = mergeConfig(config)
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')

  /** sessionId -> { revision, at, summary } */
  const sessionCache = new Map()
  /** Whole-overview TTL cache, keyed by the requested `days` window. */
  const overviewCache = { at: 0, days: -1, payload: null }
  /** Whole-system TTL cache. */
  const systemCache = { at: 0, payload: null }
  /** Log-footprint cache: a bounded on-disk walk must not run on every 2 s CPU poll. */
  const logCache = { at: 0, payload: null, inFlight: null }
  /** In-flight overview build (a cold start should not build twice). */
  let overviewInFlight = null

  const sampler = createCpuSampler()
  sampler.sample()

  /** The session-log footprint plus the bounded on-disk walk. */
  const readLogFootprint = async () => {
    const budget = { entries: 0, deadline: Date.now() + WALK_BUDGET_MS }
    const persistence = ctx.get('sessionPersistence')
    let stored = null
    if (persistence !== null && persistence !== undefined) {
      try {
        stored = await persistence.list()
      } catch {
        stored = null
      }
    }

    const sessionLog = {
      bytes: 0,
      count: 0,
      eventCount: 0,
      largest: [],
      available: Array.isArray(stored),
      walkBytes: 0,
    }
    if (Array.isArray(stored)) {
      const sized = []
      for (const entry of stored) {
        if (!isPlainObject(entry)) continue
        const id = typeof entry.header?.id === 'string' ? entry.header.id : null
        if (id === null) continue
        const bytes = toCount(entry.sizeBytes)
        sessionLog.bytes += bytes
        sessionLog.count += 1
        // Backends may omit `eventCount` from `list()`; fall back to the folded summary.
        sessionLog.eventCount += Number.isFinite(entry.eventCount)
          ? toCount(entry.eventCount)
          : toCount(sessionCache.get(id)?.summary?.eventCount)
        sized.push({ id, bytes })
      }
      sized.sort((left, right) => right.bytes - left.bytes)
      const largest = sized.slice(0, MAX_LARGEST)
      // Fold the titles from the corpus observation rather than the overview summary
      // cache: a renamed session must show its new title even before its folded
      // summary is rebuilt.
      let liveTitles = new Map()
      const query = ctx.get('sessionQuery')
      if (query !== null && query !== undefined && largest.length > 0) {
        try {
          const snapshots = await query.readTitleSnapshots(largest.map((item) => item.id))
          if (Array.isArray(snapshots)) liveTitles = titleLookup(snapshots)
        } catch {
          liveTitles = new Map()
        }
      }
      sessionLog.largest = largest.map((item) => {
        const live = liveTitles.get(item.id)
        const cached = sessionCache.get(item.id)?.summary?.title
        const title = typeof live === 'string' && live.trim() !== ''
          ? live.trim()
          : (typeof cached === 'string' && cached.trim() !== '' ? cached.trim() : null)
        return {
          id: item.id,
          title,
          bytes: item.bytes,
        }
      })
    }

    // The walk's `sessions` figure is only a cross-check against the persistence sum.
    const sessionsWalk = await walkTree(join(home, 'sessions'), budget)
    sessionLog.walkBytes = toCount(sessionsWalk.bytes)
    const storage = await walkStorage(join(home, 'storages'), budget)
    const attachments = await walkTree(join(home, 'attachments'), budget)
    const spill = await walkTree(join(home, 'spill'), budget)

    return {
      home,
      available: sessionLog.available,
      sessionLog,
      storage: { bytes: toCount(storage.bytes), entries: storage.entries, available: storage.available },
      attachments: { bytes: toCount(attachments.bytes), available: attachments.available },
      spill: { bytes: toCount(spill.bytes), files: toCount(spill.files), available: spill.available },
      totalBytes: sessionLog.bytes + storage.bytes + attachments.bytes + spill.bytes,
    }
  }

  /**
   * Best-effort archived-session ids from `storages/workspace.json`.
   * A missing or malformed file (or an older schema) simply yields an empty set.
   */
  const readArchivedSessionIds = async () => {
    try {
      const raw = await readFile(join(home, 'storages', 'workspace.json'), 'utf8')
      const parsed = JSON.parse(raw)
      return toIdSet(parsed?.global?.archivedSessionIds)
    } catch {
      return new Set()
    }
  }

  /** Build (or serve from cache) the §4 overview payload for one timeline window. */
  const buildOverview = async (days, force = false) => {
    const now = Date.now()
    if (
      !force
      && overviewCache.payload !== null
      && overviewCache.days === days
      && now - overviewCache.at < settings.overviewCacheMs
    ) {
      return overviewCache.payload
    }
    if (overviewInFlight !== null && overviewInFlight.days === days) return overviewInFlight.promise

    const promise = (async () => {
      const query = ctx.get('sessionQuery')
      let records = []
      if (query !== null && query !== undefined) {
        try {
          const listed = await query.listSessions()
          if (Array.isArray(listed)) records = listed
        } catch {
          records = []
        }
      }

      const persistence = ctx.get('sessionPersistence')
      let stored = null
      if (persistence !== null && persistence !== undefined) {
        try {
          stored = await persistence.list()
        } catch {
          stored = null
        }
      }
      const sizes = new Map()
      if (Array.isArray(stored)) {
        for (const entry of stored) {
          if (!isPlainObject(entry)) continue
          const id = typeof entry.header?.id === 'string' ? entry.header.id : null
          if (id === null) continue
          sizes.set(id, {
            revision: typeof entry.revision === 'string' ? entry.revision : null,
            sizeBytes: toCount(entry.sizeBytes),
            eventCount: Number.isFinite(entry.eventCount) ? toCount(entry.eventCount) : null,
          })
        }
      }

      // Purge cached folds for sessions that disappeared from the corpus.
      const liveIds = new Set()
      for (const record of records) {
        const id = recordId(record)
        if (id !== null) liveIds.add(id)
      }
      for (const id of [...sessionCache.keys()]) {
        if (!liveIds.has(id)) sessionCache.delete(id)
      }

      const summaries = new Map()
      const stale = []
      for (const record of records) {
        const id = recordId(record)
        if (id === null) continue
        const cached = sessionCache.get(id)
        const revision = sizes.get(id)?.revision ?? null
        if (cached !== undefined && isCacheFresh(cached, revision, now, settings.overviewCacheMs)) {
          summaries.set(id, cached.summary)
        } else {
          stale.push({ record, id })
        }
      }

      if (stale.length > 0 && query !== null && query !== undefined) {
        let titleSnapshots = []
        try {
          const titles = await query.readTitleSnapshots(stale.map((item) => item.id))
          if (Array.isArray(titles)) titleSnapshots = titles
        } catch {
          titleSnapshots = []
        }
        const titles = titleLookup(titleSnapshots)

        await mapLimit(stale, LOG_READ_CONCURRENCY, async ({ record, id }) => {
          let summary
          try {
            const snapshot = await query.readSession(id)
            summary = summarizeSession(record, snapshot?.events, settings.pricing)
            summary.title = titles.get(id) ?? null
            summary.logBytes = toCount(sizes.get(id)?.sizeBytes)
          } catch {
            summary = emptySummary(id, toEpoch(recordHeader(record).createdAt, 0))
            summary.error = 'unreadable'
            summary.title = titles.get(id) ?? null
          }
          sessionCache.set(id, {
            revision: sizes.get(id)?.revision ?? null,
            at: now,
            summary,
          })
          summaries.set(id, summary)
        })
      }

      // Archive state is not part of the log revision, so it must not live in the
      // per-session summary cache; re-read it on every overview build.
      const archivedIds = await readArchivedSessionIds()

      const payload = computeOverview({
        records,
        summaries,
        sizes,
        archivedIds,
        now,
        days,
        config: settings,
      })
      overviewCache.at = Date.now()
      overviewCache.days = days
      overviewCache.payload = payload
      return payload
    })()

    overviewInFlight = { days, promise }
    try {
      return await promise
    } finally {
      if (overviewInFlight !== null && overviewInFlight.promise === promise) overviewInFlight = null
    }
  }

  /** Build (or serve from cache) the §5 system payload. */
  const buildSystem = async (force = false) => {
    const now = Date.now()
    if (!force && systemCache.payload !== null && now - systemCache.at < settings.systemCacheMs) {
      return systemCache.payload
    }
    let logs
    if (!force && logCache.payload !== null && now - logCache.at < settings.logCacheMs) {
      logs = logCache.payload
    } else if (logCache.inFlight !== null) {
      logs = await logCache.inFlight
    } else {
      const walk = readLogFootprint()
      logCache.inFlight = walk
      try {
        logs = await walk
        logCache.payload = logs
        logCache.at = Date.now()
      } finally {
        logCache.inFlight = null
      }
    }
    const payload = computeSystem({
      now,
      config: settings,
      home,
      cpu: sampler.latest() ?? {},
      history: sampler.history(),
      logs,
    })
    systemCache.at = Date.now()
    systemCache.payload = payload
    return payload
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: OVERVIEW_PATH,
    handler: async (req, res) => {
      try {
        if (rejected(ctx, req, res)) return
        if (req.method !== 'GET') {
          sendMethodNotAllowed(res, 'GET')
          return
        }
        sendJson(res, 200, await buildOverview(daysFromRequest(req, settings.days), forceFromRequest(req)))
      } catch (error) {
        sendFailure(res, error)
      }
    },
  }), `session-stats: GET ${OVERVIEW_PATH}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: SYSTEM_PATH,
    handler: async (req, res) => {
      try {
        if (rejected(ctx, req, res)) return
        if (req.method !== 'GET') {
          sendMethodNotAllowed(res, 'GET')
          return
        }
        sendJson(res, 200, await buildSystem(forceFromRequest(req)))
      } catch (error) {
        sendFailure(res, error)
      }
    },
  }), `session-stats: GET ${SYSTEM_PATH}`)

  // `timer.interval` returns the disposer of the effect it registers; wrapping it in
  // this plugin's effect also disposes the sampler when the bundle is unloaded or
  // reloaded, so a stale sampler cannot outlive its row.
  try {
    ctx.effect(() => ctx.timer.interval(sampler.sample, settings.sampleMs), 'session-stats: cpu sampler')
  } catch {
    /* no timer service in this composition: the system route reports null percents */
  }
}

