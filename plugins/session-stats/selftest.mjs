/**
 * Plugin self-test: runs in CI (through scripts/check-plugins.mjs) with no local data.
 *
 * It feeds `computeOverview` a synthetic corpus (models, providers, several days, an
 * unreadable session, model-less usage) and checks the published overview contract,
 * including the model daily series the trend chart reads.
 */
import { computeOverview, computeSystem } from './index.js'

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
  const now = new Date(2026, 10, 4, 12, 0, 0).getTime() // local noon, 2026-11-04
  const input = corpus(now)
  const overview = computeOverview({ ...input, now, days: 30, config: {} })

  sameNumber(overview.days, 30, 'days', report)
  sameNumber(overview.totals.sessions, 3, 'totals.sessions', report)
  sameNumber(overview.timeline.buckets.length, 30, 'timeline length', report)
  sameNumber(overview.timeline.buckets[29].key, '2026-11-04', 'last bucket key', report)

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

  const empty = computeOverview({ records: [], eventsById: new Map(), now, days: 7, config: {} })
  sameNumber(empty.totals.sessions, 0, 'empty corpus sessions', report)
  sameNumber(empty.timeline.buckets.length, 7, 'empty corpus timeline length', report)
  sameNumber(empty.models.length, 0, 'empty corpus models', report)

  const degenerate = computeOverview({ records: [{ header: { id: 'x', createdAt: 'nope' } }, null, 42], eventsById: new Map(), now: Number.NaN, days: 'bad', config: { budget: { amount: -5 } } })
  if (!Number.isFinite(degenerate.generatedAt)) report('degenerate input must not produce a non-finite generatedAt')
  if (!Array.isArray(degenerate.models)) report('degenerate input must still produce a models array')

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
