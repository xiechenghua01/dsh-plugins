// Synthetic latency-contract tests for the MCP Manager plugin.
//
// These tests read the plugin's own client fragments (helpers, row, locale, styles) and
// execute the production functions with a tiny element shim. They are not a renderer:
// browser paint, real hover and real assistive technology stay covered by the lead against
// the running Harness. No user files, network or MCP server is touched.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = join(HERE, '..')
const CLIENT_DIR = join(PLUGIN_DIR, 'src', 'client')
const DESIGN_PATH = join(PLUGIN_DIR, 'DESIGN.md')

function expect(report, condition, message) {
  if (!condition) report(message)
}

function sourceOf(name) {
  return readFileSync(join(CLIENT_DIR, name), 'utf8')
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/gu, (match, name) => {
    if (params === undefined || !Object.prototype.hasOwnProperty.call(params, name)) return match
    return String(params[name])
  })
}

function makeT(dict) {
  return (key, params) => {
    if (!Object.prototype.hasOwnProperty.call(dict, key)) throw new Error('missing locale key: ' + key)
    return interpolate(dict[key], params)
  }
}

function loadLocale() {
  const factory = new Function(sourceOf('00-locale.js') + '\nreturn { zh: zh, en: en }\n')
  return factory()
}

/** Load production helpers, tooltip handlers, row actions and ServerRow into one scope. */
function loadClient() {
  const h = (type, props, ...children) => ({
    type: type,
    props: props === null || props === undefined ? {} : Object.assign({}, props),
    children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false),
  })
  function LinkButton() {}
  function Svg() {}
  function IconButton() {}
  const factory = new Function(
    'h', 'LinkButton', 'Svg', 'IconButton',
    'ICON_CHEVRON', 'ICON_POWER', 'ICON_EDIT', 'ICON_TRASH', 'DASH',
    'JS_MARKER_PREFIX', 'STR_ESCAPE_PREFIX', 'JS_MARKER_PATTERN',
    sourceOf('01-helpers.js')
      + '\n' + sourceOf('02-tooltip.js')
      + '\n' + sourceOf('31-row-actions.js')
      + '\n' + sourceOf('30-row.js')
      + '\nreturn { ServerRow, RowActions, latencyOf, latencyToneOf, tooltip, hideTooltip }\n',
  )
  return factory(
    h, LinkButton, Svg, IconButton,
    'M19 9l-7 7-7-7', 'M0 0', 'M0 1', 'M0 2', '—',
    '@@js:', '@@str:', /^@@js:([\s\S]*)@@$/u,
  )
}

function walk(node, visit) {
  if (node === null || node === undefined || node === false) return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (typeof node !== 'object') return
  visit(node)
  for (const child of node.children || []) walk(child, visit)
}

function nodesByClass(tree, name) {
  const found = []
  walk(tree, (node) => {
    const className = node.props !== undefined && typeof node.props.className === 'string' ? node.props.className : ''
    if (className.split(/\s+/u).includes(name)) found.push(node)
  })
  return found
}

function classesOf(node) {
  const className = node.props !== undefined && typeof node.props.className === 'string' ? node.props.className : ''
  return className.split(/\s+/u).filter((entry) => entry !== '')
}

function textOfNode(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOfNode).join('')
  return textOfNode(node.children)
}

function renderRow(client, t, row, extra) {
  return client.ServerRow(Object.assign({
    t: t,
    row: row,
    testing: false,
    testingAll: false,
    busy: false,
    expanded: false,
    onToggleExpand: () => {},
    onToggleEnabled: () => {},
    onEdit: () => {},
    onDelete: () => {},
  }, extra))
}

function httpRow(probe) {
  return {
    id: 'mcp-w-alpha',
    serverName: 'alpha',
    config: { serverName: 'alpha', transport: 'streamable-http', url: 'https://example.com/mcp' },
    lastProbe: probe,
  }
}

function stdioRow(probe) {
  return {
    id: 'mcp-w-beta',
    serverName: 'beta',
    config: { serverName: 'beta', transport: 'stdio', command: 'npx', args: ['-y', 'pkg'] },
    lastProbe: probe,
  }
}

/** Boundaries include the lower bound; only `stdio` uses the slower pair. */
function testLatencyTone(report, client) {
  const tone = client.latencyToneOf

  expect(report, tone(199) === 'good', 'http 199ms must be good')
  expect(report, tone(200) === 'good', 'http 200ms must be good (lower bound inclusive)')
  expect(report, tone(201) === 'fair', 'http 201ms must be fair')
  expect(report, tone(599) === 'fair', 'http 599ms must be fair')
  expect(report, tone(600) === 'fair', 'http 600ms must be fair (upper bound inclusive)')
  expect(report, tone(601) === 'poor', 'http 601ms must be poor')
  expect(report, tone(200, 'streamable-http') === 'good', 'streamable-http uses the http pair')
  expect(report, tone(201, 'sse') === 'fair', 'sse uses the http pair')
  expect(report, tone(601, null) === 'poor', 'a missing transport defaults to the http pair')
  expect(report, tone(201, undefined) === 'fair', 'an undefined transport defaults to the http pair')

  expect(report, tone(199, 'stdio') === 'good', 'stdio 199ms must be good')
  expect(report, tone(799, 'stdio') === 'good', 'stdio 799ms must be good')
  expect(report, tone(800, 'stdio') === 'good', 'stdio 800ms must be good (lower bound inclusive)')
  expect(report, tone(801, 'stdio') === 'fair', 'stdio 801ms must be fair')
  expect(report, tone(2499, 'stdio') === 'fair', 'stdio 2499ms must be fair')
  expect(report, tone(2500, 'stdio') === 'fair', 'stdio 2500ms must be fair (upper bound inclusive)')
  expect(report, tone(2501, 'stdio') === 'poor', 'stdio 2501ms must be poor')

  for (const value of [NaN, Infinity, -Infinity, -1, null, undefined, '200']) {
    expect(report, tone(value) === null, `latencyToneOf(${String(value)}) must return null`)
    expect(report, tone(value, 'stdio') === null, `latencyToneOf(${String(value)}, 'stdio') must return null`)
  }

  expect(report, client.latencyOf({ lastProbe: { ok: true, durationMs: 123.4 } }) === 123, 'latencyOf rounds to whole ms')
  expect(report, client.latencyOf({ lastProbe: { ok: false, durationMs: 100 } }) === null, 'latencyOf ignores failed probes')
  expect(report, client.latencyOf({ lastProbe: { ok: true } }) === null, 'latencyOf requires durationMs')
  expect(report, client.latencyOf({ lastProbe: { ok: true, durationMs: NaN } }) === null, 'latencyOf rejects NaN')
  expect(report, client.latencyOf({ lastProbe: { ok: true, durationMs: Infinity } }) === null, 'latencyOf rejects Infinity')
  expect(report, client.latencyOf({ lastProbe: { ok: true, durationMs: -1 } }) === null, 'latencyOf rejects negative durations')
  expect(report, client.latencyOf({}) === null, 'latencyOf tolerates a row without a probe')
  expect(report, client.latencyOf(null) === null, 'latencyOf tolerates null rows')
}

/** Tooltip and aria-label must be the same readable string, not hover-only information. */
function testTooltipAndAria(report, client, badge, tip) {
  expect(report, badge.props['aria-label'] === tip, `latency badge aria-label must be ${tip}`)
  expect(report, typeof badge.props.onMouseEnter === 'function', 'latency badge must wire the shared tooltip handlers')
  badge.props.onMouseEnter({ currentTarget: {} })
  expect(report, client.tooltip.label === badge.props['aria-label'], 'tooltip text must match the aria-label')
  client.hideTooltip()
}

function testServerRowRendering(report, client, locale) {
  const t = makeT(locale.zh)
  const graded = [
    { ms: 200, tone: 'good', tip: '最近一次探测耗时 200ms · 良好' },
    { ms: 201, tone: 'fair', tip: '最近一次探测耗时 201ms · 一般' },
    { ms: 601, tone: 'poor', tip: '最近一次探测耗时 601ms · 慢' },
  ]
  for (const item of graded) {
    const badges = nodesByClass(renderRow(client, t, httpRow({ ok: true, durationMs: item.ms })), 'mm-latency')
    expect(report, badges.length === 1, `http ${item.ms}ms must render exactly one latency badge`)
    if (badges.length !== 1) continue
    const badge = badges[0]
    expect(report, classesOf(badge).includes('mm-latency-' + item.tone), `http ${item.ms}ms must use .mm-latency-${item.tone}`)
    expect(report, textOfNode(badge) === item.ms + 'ms', `http ${item.ms}ms must render through list.latency`)
    testTooltipAndAria(report, client, badge, item.tip)
  }

  const stdioCases = [
    { ms: 800, tone: 'good', label: '良好' },
    { ms: 801, tone: 'fair', label: '一般' },
    { ms: 2501, tone: 'poor', label: '慢' },
  ]
  for (const item of stdioCases) {
    const badges = nodesByClass(renderRow(client, t, stdioRow({ ok: true, durationMs: item.ms })), 'mm-latency')
    expect(report, badges.length === 1, `stdio ${item.ms}ms must render exactly one latency badge`)
    if (badges.length !== 1) continue
    expect(report, classesOf(badges[0]).includes('mm-latency-' + item.tone), `stdio ${item.ms}ms must use .mm-latency-${item.tone}`)
    expect(report, badges[0].props['aria-label'] === `最近一次探测耗时 ${item.ms}ms · ${item.label}`, `stdio ${item.ms}ms tooltip must carry its level`)
  }

  const fallbackTransport = { id: 'mcp-w-gamma', serverName: 'gamma', transport: 'stdio', lastProbe: { ok: true, durationMs: 801 } }
  const fallbackBadges = nodesByClass(renderRow(client, t, fallbackTransport), 'mm-latency')
  expect(report, fallbackBadges.length === 1 && classesOf(fallbackBadges[0]).includes('mm-latency-fair'), 'a row without config uses its declared transport for thresholds')

  const hiddenCases = [
    ['a failed probe', httpRow({ ok: false, durationMs: 120 })],
    ['a missing probe', httpRow(undefined)],
    ['a disabled row', Object.assign(httpRow({ ok: true, durationMs: 200 }), { disabled: true })],
    ['a non-finite duration', httpRow({ ok: true, durationMs: NaN })],
    ['an infinite duration', httpRow({ ok: true, durationMs: Infinity })],
    ['a negative duration', httpRow({ ok: true, durationMs: -1 })],
  ]
  for (const [label, row] of hiddenCases) {
    expect(report, nodesByClass(renderRow(client, t, row), 'mm-latency').length === 0, `${label} must not render a latency badge`)
  }

  const testing = nodesByClass(renderRow(client, t, httpRow({ ok: true, durationMs: 200 }), { testing: true }), 'mm-latency')
  expect(report, testing.length === 1, 'a row under test renders one latency placeholder')
  if (testing.length === 1) {
    expect(report, classesOf(testing[0]).includes('mm-latency-neutral'), 'the row under test uses .mm-latency-neutral')
    expect(report, textOfNode(testing[0]) === '…', 'the row under test shows … instead of the old value')
    expect(report, !textOfNode(testing[0]).includes('200'), 'the row under test must not show the stale latency')
  }

  const testingAll = nodesByClass(renderRow(client, t, httpRow({ ok: true, durationMs: 200 }), { testingAll: true }), 'mm-latency')
  expect(report, testingAll.length === 1 && classesOf(testingAll[0]).includes('mm-latency-neutral'), 'testingAll covers enabled rows with the neutral placeholder')

  const testingAllDisabled = nodesByClass(renderRow(client, t, Object.assign(httpRow({ ok: true, durationMs: 200 }), { disabled: true }), { testingAll: true }), 'mm-latency')
  expect(report, testingAllDisabled.length === 0, 'testingAll leaves disabled rows without a latency placeholder')

  const testingDisabledSingle = nodesByClass(renderRow(client, t, Object.assign(httpRow({ ok: true, durationMs: 200 }), { disabled: true }), { testing: true }), 'mm-latency')
  expect(report, testingDisabledSingle.length === 0, 'a disabled row must not show a testing placeholder even when testing is true')

  const tree = renderRow(client, t, httpRow({ ok: true, durationMs: 200 }))
  const main = nodesByClass(tree, 'mm-row-main')
  expect(report, main.length === 1 && main[0].children.length === 2, 'the row keeps its main layout: left block + actions')
  if (main.length === 1) {
    const actionsElement = main[0].children[1]
    expect(report, actionsElement.type === client.RowActions, 'row actions stay the last main-block child')
    const actions = client.RowActions(actionsElement.props)
    expect(report, actions.props.className === 'mm-actions', 'row actions keep .mm-actions')
    expect(report, actions.children.length === 3, 'the row keeps exactly three inline actions')
    const labels = actions.children.map((child) => child.props.label)
    expect(report, labels[0] === t('action.toggleDisable') && labels[1] === t('action.edit') && labels[2] === t('action.delete'), 'the three actions keep toggle/edit/delete order')
    expect(report, actions.children.every((child) => child.props.disabled === false), 'enabled rows keep all three actions actionable')
    expect(report, nodesByClass(actions, 'mm-latency').length === 0, 'the latency badge must not move into the actions slot')
  }

  const disabledTree = renderRow(client, t, Object.assign(httpRow({ ok: true, durationMs: 200 }), { disabled: true }))
  const disabledMain = nodesByClass(disabledTree, 'mm-row-main')
  if (disabledMain.length === 1) {
    const disabledActions = client.RowActions(disabledMain[0].children[1].props)
    expect(report, disabledActions.children.length === 3 && disabledActions.children[0].props.label === t('action.toggleEnable'), 'disabled rows keep exactly three actions with the enable label')
  }
}

function testLocale(report, locale) {
  const zhKeys = Object.keys(locale.zh)
  const enKeys = Object.keys(locale.en)
  expect(report, zhKeys.length === enKeys.length, `zh/en locale key counts differ: ${zhKeys.length} vs ${enKeys.length}`)
  for (const key of zhKeys) {
    expect(report, Object.prototype.hasOwnProperty.call(locale.en, key), `en locale is missing key ${key}`)
    expect(report, typeof locale.zh[key] === 'string' && locale.zh[key].trim() !== '', `zh locale key ${key} must be a non-empty string`)
  }
  for (const key of enKeys) {
    expect(report, Object.prototype.hasOwnProperty.call(locale.zh, key), `zh locale is missing key ${key}`)
    expect(report, typeof locale.en[key] === 'string' && locale.en[key].trim() !== '', `en locale key ${key} must be a non-empty string`)
  }

  const added = ['list.latencyTip', 'list.latencyLevelGood', 'list.latencyLevelFair', 'list.latencyLevelPoor']
  for (const key of added) {
    expect(report, Object.prototype.hasOwnProperty.call(locale.zh, key), `zh locale is missing the new key ${key}`)
    expect(report, Object.prototype.hasOwnProperty.call(locale.en, key), `en locale is missing the new key ${key}`)
  }
  expect(report, locale.zh['list.latencyLevelGood'] === '良好' && locale.zh['list.latencyLevelFair'] === '一般' && locale.zh['list.latencyLevelPoor'] === '慢', 'zh latency levels must be 良好/一般/慢')
  expect(report, locale.en['list.latencyLevelGood'] === 'Good' && locale.en['list.latencyLevelFair'] === 'Fair' && locale.en['list.latencyLevelPoor'] === 'Slow', 'en latency levels must be Good/Fair/Slow')
  for (const lang of ['zh', 'en']) {
    expect(report, locale[lang]['list.latencyTip'].includes('{ms}') && locale[lang]['list.latencyTip'].includes('{level}'), `${lang} list.latencyTip must interpolate {ms} and {level}`)
  }
}

function designRowOf(design, key) {
  const prefix = '| `' + key + '` |'
  const line = design.split(/\r?\n/u).find((entry) => entry.trimStart().startsWith(prefix))
  if (line === undefined) return null
  const cells = line.split('|').map((cell) => cell.trim())
  return { zh: cells[2], en: cells[3] }
}

/** DESIGN.md §3 must quote the new zh/en latency strings verbatim. */
function testDesignTable(report, locale) {
  const design = readFileSync(DESIGN_PATH, 'utf8')
  for (const key of ['list.latencyTip', 'list.latencyLevelGood', 'list.latencyLevelFair', 'list.latencyLevelPoor']) {
    const row = designRowOf(design, key)
    expect(report, row !== null, `DESIGN.md §3 is missing the ${key} row`)
    if (row === null) continue
    expect(report, row.zh === locale.zh[key], `DESIGN.md zh copy for ${key} must match 00-locale.js`)
    expect(report, row.en === locale.en[key], `DESIGN.md en copy for ${key} must match 00-locale.js`)
  }
}

/** The 18px data badge and its three semantic tones are a fixed visual contract. */
/** Parse one CSS rule into effective declarations, flagging redeclared properties. */
function declarationsOf(rule) {
  const body = rule.slice(rule.indexOf('{') + 1, rule.lastIndexOf('}'))
  const map = new Map()
  const duplicates = []
  for (const segment of body.split(';')) {
    const declaration = segment.trim()
    if (declaration === '') continue
    const at = declaration.indexOf(':')
    if (at === -1) continue
    const name = declaration.slice(0, at).trim()
    const value = declaration.slice(at + 1).trim()
    if (map.has(name)) duplicates.push(name)
    map.set(name, value)
  }
  return { map, duplicates }
}

function testCssContract(report) {
  const css = new Function(sourceOf('90-styles.js') + '\nreturn CSS\n')()
  const lines = css.split('\n')
  const ruleOf = (selector) => lines.find((line) => line.startsWith(selector + '{')) || ''

  const base = ruleOf('.mm-latency')
  expect(report, base !== '', '90-styles.js must define .mm-latency')
  const baseDecl = declarationsOf(base)
  expect(report, baseDecl.duplicates.length === 0, `.mm-latency must not redeclare properties: ${baseDecl.duplicates.join(', ')}`)
  const expected = [
    ['display', 'inline-flex'],
    ['align-items', 'center'],
    ['justify-content', 'center'],
    ['min-height', 'calc(var(--ds-fs) + 2px)'],
    ['min-width', '52px'],
    ['padding', '0 5px'],
    ['border-radius', 'var(--dsw-radius-xs)'],
    ['font-size', 'calc(var(--ds-fs) - 2px)'],
    ['line-height', 'normal'],
    ['white-space', 'nowrap'],
    ['border', '.5px solid transparent'],
    ['font-variant-numeric', 'tabular-nums'],
    ['flex', 'none'],
  ]
  for (const [name, value] of expected) {
    expect(report, baseDecl.map.get(name) === value, `.mm-latency must set ${name}:${value} (got ${String(baseDecl.map.get(name))})`)
  }

  const tones = [
    ['good', 'success-primary'],
    ['fair', 'warn-primary'],
    ['poor', 'error-primary'],
  ]
  for (const [tone, token] of tones) {
    const rule = ruleOf('.mm-latency-' + tone)
    expect(report, rule !== '', `90-styles.js must define .mm-latency-${tone}`)
    const decl = declarationsOf(rule)
    expect(report, decl.duplicates.length === 0, `.mm-latency-${tone} must not redeclare properties: ${decl.duplicates.join(', ')}`)
    expect(report, decl.map.get('background') === 'color-mix(in srgb,var(--dsw-alias-state-' + token + ') 12%,transparent)', `.mm-latency-${tone} must use a 12% semantic background`)
    expect(report, decl.map.get('border-color') === 'color-mix(in srgb,var(--dsw-alias-state-' + token + ') 28%,transparent)', `.mm-latency-${tone} must use a 28% semantic border`)
    expect(report, decl.map.get('color') === 'var(--dsw-alias-state-' + token + ')', `.mm-latency-${tone} must use the semantic text color`)
  }

  const neutral = ruleOf('.mm-latency-neutral')
  expect(report, neutral !== '', '90-styles.js must define .mm-latency-neutral')
  const neutralDecl = declarationsOf(neutral)
  expect(report, neutralDecl.duplicates.length === 0, `.mm-latency-neutral must not redeclare properties: ${neutralDecl.duplicates.join(', ')}`)
  expect(report, neutralDecl.map.get('background') === 'color-mix(in srgb,var(--dsw-alias-label-tertiary) 10%,transparent)', 'the neutral placeholder must use a 10% label-tertiary background')
  expect(report, neutralDecl.map.get('border-color') === 'color-mix(in srgb,var(--dsw-alias-label-tertiary) 24%,transparent)', 'the neutral placeholder must use a 24% label-tertiary border')
  expect(report, neutralDecl.map.get('color') === 'var(--dsw-alias-label-tertiary)', 'the neutral placeholder must use the label-tertiary text color')
  expect(report, !/state-(?:success|warn|error)/u.test(neutral), 'the neutral placeholder must not use a state color')
}

/**
 * Every badge shrinks its text by 2px against `--ds-fs`. A fixed `height` and the
 * matching fixed `line-height` therefore clip the label once the host font-size
 * grows, so each badge must scale both with the token instead.
 */
function testBadgeVerticalFit(report) {
  const css = new Function(sourceOf('90-styles.js') + '\nreturn CSS\n')()
  const lines = css.split('\n')
  const ruleOf = (selector) => lines.find((line) => line.startsWith(selector + '{')) || ''
  const badges = [
    ['.mm-chip', 4],
    ['.mm-latency', 2],
    ['.mm-tool-badge', 4],
    ['.mm-badge', 4],
    ['.mm-tools-status', 4],
  ]
  for (const [selector, slack] of badges) {
    const rule = ruleOf(selector)
    expect(report, rule !== '', `90-styles.js must define ${selector}`)
    if (rule === '') continue
    const decl = declarationsOf(rule)
    expect(report, decl.duplicates.length === 0, `${selector} must not redeclare properties: ${decl.duplicates.join(', ')}`)
    expect(report, decl.map.get('font-size') === 'calc(var(--ds-fs) - 2px)', `${selector} must keep the auxiliary font size`)
    expect(report, decl.map.get('min-height') === `calc(var(--ds-fs) + ${slack}px)`, `${selector} min-height must scale with --ds-fs (got ${String(decl.map.get('min-height'))})`)
    expect(report, decl.map.get('line-height') === 'normal', `${selector} must not pin line-height (got ${String(decl.map.get('line-height'))})`)
  }
}

/**
 * Entry point called from `selftest.run(report)`. Kept dependency-free and synthetic.
 * @param {(message: string) => void} report
 */
export function runLatencyContract(report) {
  const locale = loadLocale()
  const client = loadClient()
  testLatencyTone(report, client)
  testServerRowRendering(report, client, locale)
  testLocale(report, locale)
  testDesignTable(report, locale)
  testCssContract(report)
  testBadgeVerticalFit(report)
}
