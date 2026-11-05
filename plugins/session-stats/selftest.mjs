/**
 * Plugin self-test: runs in CI (through scripts/check-plugins.mjs) with no local data.
 *
 * It feeds `computeOverview` a synthetic corpus (models, providers, several days, an
 * unreadable session, model-less usage) and checks the published overview contract,
 * including the model daily series the trend chart reads.
 */
import { computeOverview, computeSystem, inject } from './index.js'

const DAY = 86_400_000

function event(type, time, data) {
  return { type, time, data }
}

function message(time, model, provider, usage) {
  return event('assistant/message', time, {
    usage,
    message: { source: { model, provider } },
  })
}

function corpus(now) {
  const today = new Date(now)
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const records = [
    { header: { id: 's1', createdAt: now - 3 * DAY, cwd: '/tmp/one' }, live: false, persisted: true },
    { header: { id: 's2', createdAt: now - 1 * DAY, cwd: '/tmp/two' }, live: true, persisted: true },
    { header: { id: 's3', createdAt: now - 2 * DAY, cwd: '/tmp/three' }, live: false, persisted: true },
  ]
  const eventsById = new Map([
    ['s1', [
      event('turn/start', now - 3 * DAY, {}),
      message(now - 3 * DAY + 60_000, 'model-a', 'prov', { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 300, cacheWriteTokens: 0 }),
      message(now - 2 * DAY + 60_000, 'model-b', 'prov', { inputTokens: 500, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 }),
    ]],
    ['s2', [
      event('turn/start', now - 1 * DAY, {}),
      event('turn/start', now - 1 * DAY + 1000, {}),
      message(now - 1 * DAY + 60_000, 'model-a', 'other', { inputTokens: 2000, outputTokens: 400, cacheReadTokens: 100, cacheWriteTokens: 0 }),
      message(now - 1 * DAY + 70_000, 'model-c', '', { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 }),
      // No model source: still counts toward the day total, but in no model row.
      event('assistant/message', now - 1 * DAY + 80_000, { usage: { inputTokens: 50, outputTokens: 50 } }),
      message(midnight + 5_000, 'model-a', 'prov', { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 }),
    ]],
  ])
  return {
    records,
    eventsById,
    titles: [{ sessionId: 's1', status: 'fulfilled', value: { title: { title: 'First' } } }],
    sizes: [
      { header: { id: 's1' }, revision: 'r1', sizeBytes: 1234, eventCount: 2 },
      { header: { id: 's2' }, revision: 'r2', sizeBytes: 5678, eventCount: 5 },
      { header: { id: 's3' }, revision: 'r3', sizeBytes: 90, eventCount: 0 },
    ],
    unreadable: new Set(['s3']),
  }
}

function sameNumber(actual, expected, label, report) {
  if (actual !== expected) report(`${label}: expected ${String(expected)}, got ${String(actual)}`)
}

/**
 * @param {(message: string) => void} report - called with one problem per failed check.
 */
export async function run(report) {
  // The CPU sampler registers through `ctx.timer`; a missing inject entry makes the
  // host throw at registration, silently leaving the CPU trend empty forever.
  if (!Array.isArray(inject) || !inject.includes('timer')) {
    report('inject must declare the timer service used by the CPU sampler')
  }

  const now = new Date(2026, 10, 4, 12, 0, 0).getTime() // local noon, 2026-11-04
  const input = corpus(now)
  const overview = computeOverview({ ...input, now, days: 30, config: {} })

  sameNumber(overview.days, 30, 'days', report)
  sameNumber(overview.totals.sessions, 3, 'totals.sessions', report)
  sameNumber(overview.timeline.buckets.length, 30, 'timeline length', report)
  sameNumber(overview.timeline.buckets[29].key, '2026-11-04', 'last bucket key', report)

  // Archive state is passed in (never read from disk by the pure function): only the
  // listed ids are flagged, and omitting the input leaves every session unarchived.
  if (overview.sessions.some((session) => session.archived !== false)) {
    report('sessions must default to archived: false without archivedIds')
  }
  const archivedOverview = computeOverview({ ...input, archivedIds: ['s2'], now, days: 30, config: {} })
  const archivedById = new Map(archivedOverview.sessions.map((session) => [session.id, session.archived]))
  if (archivedById.get('s2') !== true) report('an archived session id must set sessions[].archived = true')
  if (archivedById.get('s1') !== false) report('a session outside archivedIds must stay archived: false')
  if (archivedById.get('s3') !== false) report('an unreadable session outside archivedIds must stay archived: false')
  sameNumber(archivedOverview.totals.sessions, 3, 'archived corpus sessions', report)

  const timelineTotal = overview.timeline.buckets.reduce((sum, bucket) => sum + bucket.tokens.total, 0)
  sameNumber(overview.totals.tokens.total, timelineTotal, 'totals equal the timeline sum', report)
  if (!(timelineTotal > 0)) report('timeline total must be positive')

  // 11/01 .. 11/04 are the last four buckets; everything else is empty.
  sameNumber(overview.timeline.buckets[26].tokens.total, 1500, '11/01 total', report)
  sameNumber(overview.timeline.buckets[27].tokens.total, 600, '11/02 total', report)
  sameNumber(overview.timeline.buckets[28].tokens.total, 2750, '11/03 total (incl. a model-less message)', report)
  sameNumber(overview.timeline.buckets[29].tokens.total, 120, '11/04 total', report)
  sameNumber(timelineTotal, 4970, 'timeline total', report)

  const byModel = new Map(overview.models.map((row) => [`${row.provider}\u0000${row.model}`, row]))
  sameNumber(byModel.size, 4, 'model row count', report)

  const rows = [
    ['prov\u0000model-a', [1500, 0, 0, 120], 1620],
    ['prov\u0000model-b', [0, 600, 0, 0], 600],
    ['other\u0000model-a', [0, 0, 2500, 0], 2500],
    ['\u0000model-c', [0, 0, 150, 0], 150],
  ]
  for (const [key, lastFour, windowTokens] of rows) {
    const row = byModel.get(key)
    if (row === undefined) {
      report(`model row ${key} missing`)
      continue
    }
    sameNumber(row.daily.length, 30, `${key} daily length`, report)
    sameNumber(row.window.tokens, windowTokens, `${key} window tokens`, report)
    sameNumber(row.window.tokens, row.daily.reduce((sum, day) => sum + day.tokens, 0), `${key} window equals daily sum`, report)
    sameNumber(row.tokens.total, windowTokens, `${key} all-time tokens`, report)
    const dailyCost = row.daily.reduce((sum, day) => sum + day.cost, 0)
    if (Math.abs(row.window.cost - dailyCost) > 1e-6 * row.daily.length) report(`${key} window cost diverges from its daily sum`)
    sameNumber(row.window.requests, row.daily.reduce((sum, day) => sum + day.requests, 0), `${key} window requests equals daily sum`, report)
    for (let offset = 0; offset < lastFour.length; offset += 1) {
      const bucket = overview.timeline.buckets[26 + offset]
      sameNumber(row.daily[26 + offset].tokens, lastFour[offset], `${key} daily ${bucket.key}`, report)
      if (row.daily[26 + offset].key !== bucket.key) report(`${key} daily keys must align with timeline buckets`)
    }
  }

  // The model rows do not include the model-less message, so their window sum is
  // below the timeline total by exactly that message's tokens.
  const modelWindowSum = overview.models.reduce((sum, row) => sum + row.window.tokens, 0)
  sameNumber(timelineTotal - modelWindowSum, 100, 'model-less tokens stay in the timeline only', report)

  const budget = overview.budget
  if (budget.amount > 0) {
    sameNumber(budget.used, budget.withinPeriodCost, 'budget.used equals withinPeriodCost', report)
  }
  // The budget is a live estimate: used + remainingDays * recentDailyAverage, never
  // below `used`, so remaining cannot stay negative across days.
  sameNumber(budget.configuredAmount, 10, 'budget.configuredAmount keeps the config value', report)
  if (budget.dynamic !== true) report('a corpus with recent spend must produce a dynamic budget')
  if (!(budget.remaining >= 0)) report('budget.remaining must never be negative')
  if (!(budget.amount >= budget.used)) report('budget.amount must not fall below budget.used')
  if (budget.remainingDays === null || budget.remainingDays < 0) report('a monthly budget must report its remaining days')
  if (budget.dailyAverage <= 0) report('a corpus with recent spend must report a positive daily average')
  const estimateDrift = Math.abs(budget.amount - (budget.used + budget.remainingDays * budget.dailyAverage))
  if (estimateDrift > 1e-6) report(`budget.amount must equal used + remainingDays * dailyAverage (drift ${String(estimateDrift)})`)
  sameNumber(budget.remaining, budget.amount - budget.used, 'budget.remaining equals amount - used', report)

  const empty = computeOverview({ records: [], eventsById: new Map(), now, days: 7, config: {} })
  sameNumber(empty.totals.sessions, 0, 'empty corpus sessions', report)
  sameNumber(empty.timeline.buckets.length, 7, 'empty corpus timeline length', report)
  sameNumber(empty.models.length, 0, 'empty corpus models', report)
  if (empty.budget.dynamic !== false) report('a corpus without history must fall back to the configured budget')
  sameNumber(empty.budget.amount, 10, 'empty corpus keeps the configured budget', report)
  sameNumber(empty.budget.remaining, 10, 'empty corpus keeps the configured remaining', report)

  // A pre-folded summary (the apply() cache path) must work with and without the
  // per-model-day fold; without it the model still lists its all-time totals.
  const today = new Date(now)
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const dayTokens = { input: 10, output: 5, cacheRead: 2, cacheWrite: 0, reasoning: 0, total: 17 }
  const baseSummary = {
    id: 's9', createdAt: now - 1000, updatedAt: now - 500, turns: 1, requests: 1,
    tokens: { ...dayTokens }, cost: 0.25, models: ['m1'],
    perModel: { 'p1\u0000m1': { provider: 'p1', model: 'm1', requests: 1, tokens: { ...dayTokens }, cost: 0.25 } },
    perDay: { [todayKey]: { start: todayStart, tokens: { ...dayTokens }, cost: 0.25, requests: 1 } },
    eventCount: 2, title: 'summary-only', logBytes: 12, error: null,
  }
  const summaryRecord = { header: { id: 's9', createdAt: now - 1000 } }
  const withFold = computeOverview({
    records: [summaryRecord],
    summaries: new Map([['s9', {
      ...baseSummary,
      perModelDay: { 'p1\u0000m1': { [todayKey]: { start: todayStart, tokens: { ...dayTokens }, cost: 0.25, requests: 1 } } },
    }]]),
    now,
    days: 7,
    config: {},
  })
  sameNumber(withFold.timeline.buckets.reduce((sum, bucket) => sum + bucket.tokens.total, 0), 17, 'summary-only timeline total', report)
  const foldedRow = withFold.models.find((row) => row.model === 'm1')
  if (foldedRow === undefined) report('summary-only model row missing')
  else {
    sameNumber(foldedRow.window.tokens, 17, 'summary-only window tokens', report)
    sameNumber(foldedRow.window.requests, 1, 'summary-only window requests', report)
    sameNumber(foldedRow.window.cost, 0.25, 'summary-only window cost', report)
    sameNumber(foldedRow.daily[foldedRow.daily.length - 1].tokens, 17, 'summary-only last day tokens', report)
  }
  const withoutFold = computeOverview({
    records: [summaryRecord],
    summaries: new Map([['s9', { ...baseSummary, perModelDay: {} }]]),
    now,
    days: 7,
    config: {},
  })
  const noFoldRow = withoutFold.models.find((row) => row.model === 'm1')
  if (noFoldRow === undefined) report('a summary without perModelDay must still list the model')
  else {
    sameNumber(noFoldRow.window.tokens, 0, 'fold-less summary window tokens', report)
    sameNumber(noFoldRow.daily.reduce((sum, day) => sum + day.tokens, 0), 0, 'fold-less summary daily tokens', report)
    sameNumber(noFoldRow.tokens.total, 17, 'fold-less summary keeps all-time tokens', report)
  }

  // The catch-all fallback must still return a well-formed payload for garbage input.
  const degenerate = computeOverview({ records: [{ header: { id: 'x', createdAt: 'nope' } }, null, 42], eventsById: new Map(), now: Number.NaN, days: 'bad', config: { budget: { amount: -5 } } })
  sameNumber(degenerate.days, 30, 'degenerate days falls back to the default', report)
  sameNumber(degenerate.timeline.buckets.length, 30, 'degenerate timeline length', report)
  sameNumber(degenerate.generatedAt, 0, 'degenerate now becomes 0', report)
  sameNumber(degenerate.totals.sessions, 1, 'degenerate records count only the object record', report)
  sameNumber(degenerate.totals.requests, 0, 'degenerate record has no events', report)
  sameNumber(Array.isArray(degenerate.models) ? degenerate.models.length : -1, 0, 'degenerate corpus has no models', report)

  const system = computeSystem({
    now,
    cpu: { process: { percent: 1.234 }, system: { percent: null }, memory: {}, history: [{ t: now, process: 1, system: 2 }] },
    logs: { totalBytes: 100, sessionLog: { bytes: 60, count: 2 }, storage: { bytes: 20 }, attachments: { bytes: 10 }, spill: { bytes: 10 } },
  })
  sameNumber(system.logs.totalBytes, 100, 'system logs total', report)
  if (system.cpu === null || typeof system.cpu !== 'object') report('system cpu snapshot missing')

  // Every daily entry must be finite and non-negative.
  for (const row of overview.models) {
    for (const day of row.daily) {
      if (!Number.isFinite(day.tokens) || day.tokens < 0) report(`model ${row.model} has an invalid daily token count`)
    }
  }
}
