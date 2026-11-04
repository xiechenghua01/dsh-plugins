#!/usr/bin/env node
/**
 * Local render + payload smoke test for the Session Stats plugin.
 *
 * Reads this machine's real session logs, independently re-folds them, drives the
 * production Host half to build real `overview`/`system` payloads, and renders the
 * production browser half with a tiny hook shim. It catches crashes, wiring mistakes,
 * contract drift and structural regressions in both halves without a browser. CI cannot
 * run it (no local session corpus); run:
 *
 *   node tools/verify-render.mjs
 *
 * Requires `zstd` on PATH.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DSH_HOME, PLUGIN_DIR, loadPayloads } from './lib/local-corpus.mjs'
import {
  PRESET_INDEX,
  buildClientDefinition,
  collect,
  elementsByClass,
  readyPreset,
  renderPage,
  renderStaticTree,
  textOf,
} from './lib/render.mjs'

const PACKAGE_NAME = JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf8')).name
const MODEL_ID_SEP = '\u0000'
const modelIdOf = (provider, model) => 'model:' + provider + MODEL_ID_SEP + model

let failures = 0
const ok = (label, detail = '') => console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`)
const bad = (label, detail = '') => {
  failures += 1
  console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
}
const check = (label, condition, detail = '') => (condition ? ok(label, detail) : bad(label, detail))

/** Archived session ids straight from the machine's workspace store (never throws). */
function readArchivedIds() {
  try {
    const parsed = JSON.parse(readFileSync(join(DSH_HOME, 'storages', 'workspace.json'), 'utf8'))
    const ids = parsed && parsed.global && parsed.global.archivedSessionIds
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function pad2(value) {
  return value < 10 ? `0${String(value)}` : String(value)
}

function dayKeyOf(ms) {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * Fold the raw corpus the way a reader would: token sums per assistant message,
 * restricted to the timeline window, plus the share that names no model.
 */
function independentFold(payloads) {
  const buckets = payloads.overview.timeline.buckets
  const first = buckets[0].key
  const last = buckets[buckets.length - 1].key
  const createdAtById = new Map()
  for (const record of payloads.corpus.records) createdAtById.set(record.header.id, record.header.createdAt)
  let total = 0
  let modelLess = 0
  for (const [id, events] of payloads.corpus.eventsById) {
    const createdAt = createdAtById.get(id) ?? 0
    for (const event of events) {
      if (event.type !== 'assistant/message') continue
      const time = typeof event.time === 'number' && Number.isFinite(event.time) ? event.time : createdAt
      const key = dayKeyOf(time)
      if (key < first || key > last) continue
      const usage = event.data && typeof event.data.usage === 'object' && event.data.usage !== null ? event.data.usage : {}
      const tokens = (Number(usage.inputTokens) || 0) + (Number(usage.outputTokens) || 0)
        + (Number(usage.cacheReadTokens) || 0) + (Number(usage.cacheWriteTokens) || 0)
      total += tokens
      const model = event.data && event.data.message && event.data.message.source
        ? event.data.message.source.model
        : undefined
      if (typeof model !== 'string' || model === '') modelLess += tokens
    }
  }
  return { total, modelLess }
}

/** Split client.js into the source without its two inline dictionaries and the key lists. */
function readDictionaries() {
  const source = readFileSync(join(PLUGIN_DIR, 'client.js'), 'utf8')
  const zhStart = source.indexOf('const zh = {')
  const enStart = source.indexOf('const en = {')
  if (zhStart === -1 || enStart === -1) return null
  const endOf = (start) => {
    const end = source.indexOf('\n    }\n', start)
    if (end === -1) throw new Error('cannot find the end of an inline dictionary')
    return end
  }
  const zhEnd = endOf(zhStart)
  const enEnd = endOf(enStart)
  const keysOf = (block) => [...block.matchAll(/^\s*'([^']+)':/gm)].map((match) => match[1])
  return {
    zh: keysOf(source.slice(zhStart, zhEnd)),
    en: keysOf(source.slice(enStart, enEnd)),
    withoutDictionaries: source.slice(0, zhStart) + source.slice(enEnd),
  }
}

/** All numeric pairs of a `d` attribute, in order, so control points can be bounds-checked. */
function pathPoints(d) {
  const numbers = [...d.matchAll(/-?\d+(?:\.\d+)?/gu)].map((match) => Number(match[0]))
  const points = []
  for (let index = 0; index + 1 < numbers.length; index += 2) points.push({ x: numbers[index], y: numbers[index + 1] })
  return points
}

/** Window-scoped rows, "other" need, and series count exactly as the client derives them. */
function expectedModelSeries(overview) {
  const buckets = overview.timeline.buckets
  const rows = overview.models
    .filter((model) => model.window.tokens > 0)
    .sort((left, right) => (
      (right.window.tokens - left.window.tokens)
      || (right.window.cost - left.window.cost)
      || (left.provider + '/' + left.model).localeCompare(right.provider + '/' + right.model)
    ))
  const top = rows.slice(0, 6)
  const rest = rows.slice(6)
  const attributed = buckets.map(() => 0)
  for (const row of rows) row.daily.forEach((day, index) => { attributed[index] += day.tokens })
  let otherTokens = 0
  buckets.forEach((bucket, index) => {
    otherTokens += Math.max(0, bucket.tokens.total - attributed[index])
    for (const row of rest) otherTokens += row.daily[index].tokens
  })
  const ids = top.map((row) => modelIdOf(row.provider, row.model))
  if (otherTokens > 0) ids.push('other')
  return { count: ids.length, ids, top: top.map((row) => modelIdOf(row.provider, row.model)) }
}

function renderState(definition, preset) {
  return renderStaticTree(definition, preset).tree
}

/** Body rows of the session table (the header row is excluded). */
function sessionRowCount(tree) {
  const table = elementsByClass(tree, 'ss-table')[0]
  if (table === undefined) return -1
  let rows = 0
  const visit = (node) => {
    if (node === null || node === undefined || node === false) return
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    if (typeof node !== 'object') return
    if (node.type === 'tr') rows += 1
    for (const child of node.children || []) visit(child)
  }
  visit(table)
  return rows - 1
}

async function main() {
  console.log('== 1. real payloads from the production Host half')
  const payloads = await loadPayloads()
  const overview = payloads.overview
  const buckets = overview.timeline.buckets
  check('overview payload built', overview.totals.sessions === payloads.sessions, `${payloads.sessions} sessions`)
  check('system payload built', payloads.system.logs.sessionLog.bytes > 0)
  check('timeline has one bucket per day', buckets.length === overview.days, `${buckets.length} buckets`)
  check('every model row has an aligned daily series', overview.models.every((model) => Array.isArray(model.daily) && model.daily.length === buckets.length))
  check(
    'model window totals equal their daily sums',
    overview.models.every((model) => model.daily.reduce((sum, day) => sum + day.tokens, 0) === model.window.tokens),
  )
  check('model daily keys match the timeline buckets', overview.models.every((model) => model.daily.every((day, index) => day.key === buckets[index].key)))

  const archivedIds = readArchivedIds()
  check(
    'overview flags exactly the workspace archived sessions',
    overview.sessions.every((session) => session.archived === archivedIds.has(session.id)),
    `${archivedIds.size} archived ids`,
  )

  const timelineTotal = buckets.reduce((sum, bucket) => sum + bucket.tokens.total, 0)
  const folded = independentFold(payloads)
  check('timeline total equals an independent corpus fold', timelineTotal === folded.total, `${timelineTotal} vs ${folded.total}`)
  const modelWindowSum = overview.models.reduce((sum, model) => sum + model.window.tokens, 0)
  check(
    'model window sums plus model-less events equal the timeline',
    timelineTotal === modelWindowSum + folded.modelLess,
    `${modelWindowSum} + ${folded.modelLess} vs ${timelineTotal}`,
  )

  console.log('\n== 2. load and register the production browser half')
  const definition = buildClientDefinition(PLUGIN_DIR)
  check('loader definition captured', definition.id === PACKAGE_NAME, definition.id)
  const ready = renderPage(definition, readyPreset(payloads))
  check('main panel registered', ready.page !== undefined && typeof ready.page.component === 'function')

  const dictionaries = readDictionaries()
  if (dictionaries === null) {
    bad('inline client dictionaries found')
  } else {
    check('zh/en dictionaries have the same key set', dictionaries.zh.length === dictionaries.en.length && dictionaries.zh.every((key) => dictionaries.en.includes(key)), `${dictionaries.zh.length} keys`)
    const unreferenced = dictionaries.zh.filter((key) => !dictionaries.withoutDictionaries.includes(`'${key}'`))
    check('every locale key is used outside the dictionaries', unreferenced.length === 0, unreferenced.join(', '))
    check(
      'no dictionary value is empty',
      Object.values(ready.dictionaries.zh).every((value) => typeof value === 'string' && value.trim() !== '')
        && Object.values(ready.dictionaries.en).every((value) => typeof value === 'string' && value.trim() !== ''),
    )
  }

  console.log('\n== 3. render with real payloads')
  const expected = expectedModelSeries(overview)
  let tree
  try {
    tree = renderState(definition, readyPreset(payloads))
    ok('renders without throwing')
  } catch (error) {
    bad('renders without throwing', error.message)
  }
  if (tree) {
    const found = collect(tree)
    check('page shell rendered', found.classes.has('ss-page') && found.classes.has('ss-content'))
    check('summary cards rendered', (found.classCounts.get('ss-summary') || 0) === 4, `${found.classCounts.get('ss-summary') || 0} cards`)
    check('summary sparklines rendered', (found.classCounts.get('ss-mini-trend') || 0) === 2)
    check('trend card rendered', found.classes.has('ss-trend') && found.classes.has('ss-plot'))
    check('trend y-axis labels rendered', (found.classCounts.get('ss-yaxis-label') || 0) === 5)
    check('trend x-axis labels rendered', (found.classCounts.get('ss-xlabel') || 0) >= 2, `${found.classCounts.get('ss-xlabel') || 0} labels`)
    check('one hit region per day', (found.classCounts.get('ss-hit') || 0) === buckets.length, `${found.classCounts.get('ss-hit') || 0} hits`)
    check('one tooltip per day', (found.classCounts.get('ss-tip') || 0) === buckets.length)
    check('series lines rendered', (found.classCounts.get('ss-series-line') || 0) === expected.count, `${found.classCounts.get('ss-series-line') || 0} lines, expected ${expected.count}`)
    check('legend entries rendered', (found.classCounts.get('ss-legend-button') || 0) === expected.count)
    check('model rows and sparklines rendered', (found.classCounts.get('ss-model') || 0) === expected.count && (found.classCounts.get('ss-model-spark') || 0) === expected.count)
    check('session table starts with five rows', sessionRowCount(tree) === Math.min(5, payloads.sessions), `${sessionRowCount(tree)} rows of ${payloads.sessions}`)
    check(
      'collapsed table offers show-more only when more rows exist',
      (found.classCounts.get('ss-more') || 0) === (payloads.sessions > 5 ? 1 : 0),
    )
    check('session token bars rendered', (found.classCounts.get('ss-row-bar') || 0) > 0)
    check('the retired live dot is gone', (found.classCounts.get('ss-live-dot') || 0) === 0)
    check('log footprint bars rendered', (found.classCounts.get('ss-log-bar') || 0) >= 1)
    check('progress bars (budget/share) rendered', found.roles.includes('progressbar'))

    // A smoothed path must stay inside its viewBox; unclamped Catmull-Rom control
    // points used to overshoot the plot band (review finding 1).
    const lines = elementsByClass(tree, 'ss-series-line')
    const outOfBand = lines.flatMap((line) => pathPoints(line.props.d).filter((point) => point.y < 0 || point.y > 100))
    check('every series path point stays inside the plot band', outOfBand.length === 0, `${outOfBand.length} out-of-band points`)

    // Keyboard users reach the daily values through the focusable hit regions.
    const hits = elementsByClass(tree, 'ss-hit')
    check('hit regions are focusable buttons', hits.every((hit) => hit.type === 'button') && hits.some((hit) => hit.props.tabIndex === 0))
    check('hit regions carry an accessible daily summary', hits.every((hit) => typeof hit.props['aria-label'] === 'string' && hit.props['aria-label'].includes('总计')))
    const tooltipText = elementsByClass(tree, 'ss-tip').map(textOf).join(' ')
    check('tooltips name the models', expected.top.every((id) => tooltipText.includes(id.slice(id.indexOf(MODEL_ID_SEP) + 1))))
    check('tooltips show the total label', tooltipText.includes('总计'))
    check('no untranslated key leaked into the DOM', !/\b(panel|summary|chart|models|table|runtime|logs)\.[a-zA-Z]+\b/.test(found.text), (found.text.match(/\b(panel|summary|chart|models|table|runtime|logs)\.[a-zA-Z]+\b/) || [''])[0])
    check('no NaN / undefined / [object Object] in text', !/NaN|undefined|\[object Object\]/.test(found.text))
  }

  console.log('\n== 4. expanded session table')
  const expandedPreset = readyPreset(payloads)
  expandedPreset[PRESET_INDEX.chartMode] = 'model'
  expandedPreset[PRESET_INDEX.hiddenSeries] = []
  expandedPreset[PRESET_INDEX.sessionsSortKey] = 'cost'
  expandedPreset[PRESET_INDEX.sessionsDescending] = true
  expandedPreset[PRESET_INDEX.sessionsExpanded] = true
  try {
    const expandedTree = renderState(definition, expandedPreset)
    const found = collect(expandedTree)
    const expectedRows = Math.min(50, payloads.sessions)
    check('expanded table renders every session up to the table limit', sessionRowCount(expandedTree) === expectedRows, `${sessionRowCount(expandedTree)} rows of ${payloads.sessions}`)
    check('expanded table becomes the ten-row scroll window', found.classes.has('ss-table-window'))
    check('expanded window is a focusable region', found.roles.includes('region'))
    check('show-more affordance disappears once expanded', (found.classCounts.get('ss-more') || 0) === 0)
    check('expanded table keeps its sorting controls', (found.classCounts.get('ss-segment') || 0) >= 3)

    // The client sorts cost desc then createdAt desc and caps at 50 rows; mirror that
    // order so the expected badge count comes from real data, not a hard-coded 1.
    const expandedRows = overview.sessions
      .slice()
      .sort((left, right) => (right.cost - left.cost) || (right.createdAt - left.createdAt))
      .slice(0, 50)
    const expectedBadges = expandedRows.filter((session) => session.archived === true).length
    const badges = elementsByClass(expandedTree, 'ss-archived-badge')
    check('archived sessions render exactly one badge each', badges.length === expectedBadges, `${badges.length} badges, expected ${expectedBadges}`)
    check('archived badges read 已归档', badges.every((badge) => textOf(badge) === '已归档'))
  } catch (error) {
    bad('expanded session table renders', error.message)
  }

  console.log('\n== 5. chart modes and legend toggles')
  const typePreset = readyPreset(payloads)
  typePreset[PRESET_INDEX.chartMode] = 'type'
  try {
    const typeTree = renderState(definition, typePreset)
    const found = collect(typeTree)
    check('type mode renders three series', (found.classCounts.get('ss-series-line') || 0) === 3, `${found.classCounts.get('ss-series-line') || 0} lines`)
    const typeLegend = elementsByClass(typeTree, 'ss-legend-button').map((node) => String(node.props.title))
    check('type mode legend lists input/output/cache', typeLegend.join('|') === '输入|输出|缓存读取', typeLegend.join('|'))
    const typeTooltipText = elementsByClass(typeTree, 'ss-tip').map(textOf).join(' ')
    check('type mode tooltip shows the day cost', typeTooltipText.includes('成本'))
  } catch (error) {
    bad('type mode renders', error.message)
  }

  const allHiddenPreset = readyPreset(payloads)
  allHiddenPreset[PRESET_INDEX.chartMode] = 'model'
  allHiddenPreset[PRESET_INDEX.hiddenSeries] = expected.ids
  try {
    const hiddenTree = renderState(definition, allHiddenPreset)
    const found = collect(hiddenTree)
    check('hiding every line shows the all-hidden hint', found.text.includes('所有曲线已隐藏'))
    check('all-hidden state renders no line', (found.classCounts.get('ss-series-line') || 0) === 0)
  } catch (error) {
    bad('all-hidden render', error.message)
  }

  if (expected.ids.length > 0) {
    const hiddenPreset = readyPreset(payloads)
    hiddenPreset[PRESET_INDEX.chartMode] = 'model'
    hiddenPreset[PRESET_INDEX.hiddenSeries] = [expected.ids[0]]
    try {
      const hiddenTree = renderState(definition, hiddenPreset)
      const found = collect(hiddenTree)
      check('hiding one legend entry removes one line', (found.classCounts.get('ss-series-line') || 0) === expected.count - 1, `${found.classCounts.get('ss-series-line') || 0} lines`)
      check('hidden legend entry is marked off', found.classes.has('ss-legend-off'))
    } catch (error) {
      bad('hidden-series render', error.message)
    }
  }

  console.log('\n== 6. loading, unauthorized and error states render')
  for (const [label, state] of [
    ['loading', { status: 'loading', data: null, error: null, unauthorized: false, updatedAt: 0 }],
    ['unauthorized', { status: 'unauthorized', data: null, error: null, unauthorized: true, updatedAt: 0 }],
    ['error', { status: 'error', data: null, error: new Error('x'), unauthorized: false, updatedAt: 0 }],
  ]) {
    try {
      const rendered = renderState(definition, [0, state, state])
      const found = collect(rendered)
      check(`${label} state renders an affordance`, found.tags.includes('button'), `${found.text.length} chars`)
    } catch (error) {
      bad(`${label} state renders`, error.message)
    }
  }

  console.log(`\n${failures === 0 ? 'RESULT: PASS' : `RESULT: ${String(failures)} FAILURE(S)`}`)
  process.exitCode = failures === 0 ? 0 : 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
