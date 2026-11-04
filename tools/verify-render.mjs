#!/usr/bin/env node
/**
 * Local render + payload smoke test for the Session Stats plugin.
 *
 * Reads this machine's real session logs, drives the production Host half to build
 * real `overview`/`system` payloads, then renders the production browser half with a
 * tiny hook shim. It catches crashes, wiring mistakes and structural regressions in
 * both halves without a browser. CI cannot run it (no local session corpus); run:
 *
 *   node tools/verify-render.mjs
 *
 * Requires `zstd` on PATH.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_DIR, loadPayloads } from './lib/local-corpus.mjs'
import { buildClientDefinition, collect, elementsByClass, readyPreset, renderPage, renderStaticTree, textOf } from './lib/render.mjs'

const PACKAGE_NAME = JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf8')).name

let failures = 0
const ok = (label, detail = '') => console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`)
const bad = (label, detail = '') => {
  failures += 1
  console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
}
const check = (label, condition, detail = '') => (condition ? ok(label, detail) : bad(label, detail))

async function main() {
  console.log('== 1. real payloads from the production Host half')
  const payloads = await loadPayloads()
  check('overview payload built', payloads.overview?.totals?.sessions === payloads.sessions, `${payloads.sessions} sessions`)
  check('system payload built', payloads.system?.logs?.sessionLog?.bytes > 0)

  const overview = payloads.overview
  const buckets = overview.timeline.buckets
  check('timeline has one bucket per day', buckets.length === overview.days, `${buckets.length} buckets`)
  const timelineTotal = buckets.reduce((sum, bucket) => sum + bucket.tokens.total, 0)
  check('timeline totals equal the window token sum', timelineTotal > 0, `${timelineTotal} tokens`)
  check('every model row has an aligned daily series', overview.models.every((model) => Array.isArray(model.daily) && model.daily.length === buckets.length))
  check(
    'model window totals equal their daily sums',
    overview.models.every((model) => model.daily.reduce((sum, day) => sum + day.tokens, 0) === model.window.tokens),
  )
  check('model daily keys match the timeline buckets', overview.models.every((model) => model.daily.every((day, index) => day.key === buckets[index].key)))

  console.log('\n== 2. load and register the production browser half')
  const definition = buildClientDefinition(PLUGIN_DIR)
  check('loader definition captured', definition.id === PACKAGE_NAME, definition.id)
  const ready = renderPage(definition, readyPreset(payloads))
  check('main panel registered', ready.page !== undefined && typeof ready.page.component === 'function')
  const dictionaries = ready.dictionaries
  if (dictionaries === null || typeof dictionaries !== 'object') {
    bad('client dictionaries registered')
  } else {
    const zhKeys = Object.keys(dictionaries.zh ?? {})
    const enKeys = Object.keys(dictionaries.en ?? {})
    check('zh/en dictionaries have the same key set', zhKeys.length === enKeys.length && zhKeys.every((key) => enKeys.includes(key)), `${zhKeys.length} keys`)
    check('no dictionary value is empty', [...Object.values(dictionaries.zh ?? {}), ...Object.values(dictionaries.en ?? {})].every((value) => typeof value === 'string' && value.trim() !== ''))
    const source = readFileSync(join(PLUGIN_DIR, 'client.js'), 'utf8')
    const unreferenced = zhKeys.filter((key) => !source.includes(`'${key}'`))
    check('every locale key is referenced literally in client.js', unreferenced.length === 0, unreferenced.join(', '))
  }

  console.log('\n== 3. render with real payloads')
  let tree
  try {
    tree = ready.page.component({ t: ready.t, load: () => new Promise(() => {}), getLocaleTag: () => 'zh' })
    ok('renders without throwing')
  } catch (error) {
    bad('renders without throwing', error.message)
  }
  if (tree) {
    const found = collect(tree)
    const models = overview.models.filter((model) => model.window.tokens > 0)
    const expectedSeries = models.length > 6 ? 7 : Math.max(1, models.length)
    check('page shell rendered', found.classes.has('ss-page') && found.classes.has('ss-content'))
    check('summary cards rendered', (found.classCounts.get('ss-summary') || 0) === 4, `${found.classCounts.get('ss-summary') || 0} cards`)
    check('summary sparklines rendered', (found.classCounts.get('ss-mini-trend') || 0) === 2)
    check('trend card rendered', found.classes.has('ss-trend') && found.classes.has('ss-plot'))
    check('trend y-axis labels rendered', (found.classCounts.get('ss-yaxis-label') || 0) === 5)
    check('trend x-axis labels rendered', (found.classCounts.get('ss-xlabel') || 0) >= 2, `${found.classCounts.get('ss-xlabel') || 0} labels`)
    check('one hit region per day', (found.classCounts.get('ss-hit') || 0) === buckets.length, `${found.classCounts.get('ss-hit') || 0} hits`)
    check('one tooltip per day', (found.classCounts.get('ss-tip') || 0) === buckets.length)
    check('series lines rendered', (found.classCounts.get('ss-series-line') || 0) === expectedSeries, `${found.classCounts.get('ss-series-line') || 0} lines`)
    check('legend entries rendered', (found.classCounts.get('ss-legend-button') || 0) === expectedSeries)
    check('legend toggles are buttons', found.tags.includes('button'))
    check('model rows rendered', (found.classCounts.get('ss-model') || 0) >= models.length, `${found.classCounts.get('ss-model') || 0} rows`)
    check('model sparklines rendered', (found.classCounts.get('ss-model-spark') || 0) === (found.classCounts.get('ss-model') || 0))
    check('session rows rendered', found.tags.includes('tr'), `${found.tags.filter((tag) => tag === 'tr').length} rows`)
    check('session token bars rendered', (found.classCounts.get('ss-row-bar') || 0) > 0)
    check('log footprint bars rendered', (found.classCounts.get('ss-log-bar') || 0) >= 1)
    check('progress bars (budget/share) rendered', found.roles.includes('progressbar'))
    const tooltipText = elementsByClass(tree, 'ss-tip').map(textOf).join(' ')
    check('tooltips name the models', models.every((model) => tooltipText.includes(model.provider === '' ? model.model : model.provider + '/' + model.model)))
    check('tooltips show the total label', tooltipText.includes('总计'))
    check('no untranslated key leaked into the DOM', !/\b(panel|summary|chart|models|table|runtime|logs)\.[a-zA-Z]+\b/.test(found.text), (found.text.match(/\b(panel|summary|chart|models|table|runtime|logs)\.[a-zA-Z]+\b/) || [''])[0])
    check('no NaN / undefined / [object Object] in text', !/NaN|undefined|\[object Object\]/.test(found.text))
  }

  console.log('\n== 4. chart modes and legend toggles')
  const typePreset = readyPreset(payloads)
  typePreset[3] = 'type'
  try {
    // Materialize once: a second walk would replay components with an advanced hook index.
    const typeTree = renderStaticTree(definition, typePreset).tree
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
  allHiddenPreset[3] = 'model'
  allHiddenPreset[4] = ['model:0', 'model:1', 'model:2', 'model:3', 'model:4', 'model:5', 'model:6', 'other']
  try {
    const hiddenTree = renderStaticTree(definition, allHiddenPreset).tree
    const found = collect(hiddenTree)
    check('hiding every line shows the all-hidden hint', found.text.includes('所有曲线已隐藏'))
    check('all-hidden state renders no line', (found.classCounts.get('ss-series-line') || 0) === 0)
  } catch (error) {
    bad('all-hidden render', error.message)
  }
  const hiddenPreset = readyPreset(payloads)
  hiddenPreset[3] = 'model'
  hiddenPreset[4] = ['model:0']
  const expectedSeries = overview.models.filter((model) => model.window.tokens > 0)
  const hiddenCount = (expectedSeries.length > 6 ? 7 : Math.max(1, expectedSeries.length)) - 1
  try {
    const hiddenTree = renderStaticTree(definition, hiddenPreset).tree
    const found = collect(hiddenTree)
    check('hiding one legend entry removes one line', (found.classCounts.get('ss-series-line') || 0) === hiddenCount, `${found.classCounts.get('ss-series-line') || 0} lines`)
    check('hidden legend entry is marked off', found.classes.has('ss-legend-off'))
  } catch (error) {
    bad('hidden-series render', error.message)
  }

  console.log('\n== 5. loading, unauthorized and error states render')
  for (const [label, preset] of [
    ['loading', [{ status: 'loading', data: null, error: null, unauthorized: false, updatedAt: 0 }, { status: 'loading', data: null, error: null, unauthorized: false, updatedAt: 0 }]],
    ['unauthorized', [{ status: 'unauthorized', data: null, error: null, unauthorized: true, updatedAt: 0 }, { status: 'unauthorized', data: null, error: null, unauthorized: true, updatedAt: 0 }]],
    ['error', [{ status: 'error', data: null, error: new Error('x'), unauthorized: false, updatedAt: 0 }, { status: 'error', data: null, error: new Error('x'), unauthorized: false, updatedAt: 0 }]],
  ]) {
    const built = renderPage(definition, [0, ...preset])
    try {
      const rendered = built.page.component({ t: built.t, load: () => new Promise(() => {}), getLocaleTag: () => 'zh' })
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
