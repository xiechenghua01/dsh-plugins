// Synthetic copy-contract tests for the MCP Manager plugin.
//
// These tests read the production locale dictionary and the production DeleteDialog
// fragment, then execute them with tiny shims. They are not a renderer: browser layout
// and focus behavior stay covered by ui-contract.mjs and the lead's running Harness.
// No user files, network or Host API is touched.

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

function loadLocale() {
  const factory = new Function(sourceOf('00-locale.js') + '\nreturn { zh: zh, en: en }\n')
  return factory()
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

function loadDeleteDialog() {
  const h = (type, props, ...children) => ({
    type: type,
    props: props === null || props === undefined ? {} : props,
    children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false),
  })
  const Fragment = function Fragment() {}
  const Dialog = function Dialog() {}
  const Button = function Button() {}
  const useRef = (initial) => ({ current: initial })
  const factory = new Function(
    'h', 'Fragment', 'useRef', 'Dialog', 'Button',
    sourceOf('50-delete.js') + '\nreturn DeleteDialog\n',
  )
  return { DeleteDialog: factory(h, Fragment, useRef, Dialog, Button) }
}

function textOf(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return textOf(node.children)
}

function renderDelete(dict, row) {
  const loaded = loadDeleteDialog()
  const onClose = () => {}
  const onConfirm = () => {}
  const tree = loaded.DeleteDialog({
    t: makeT(dict),
    row: row,
    busy: false,
    returnFocus: null,
    onClose: onClose,
    onConfirm: onConfirm,
  })
  return { tree: tree, desc: tree.children[0], footer: tree.props.footer, text: textOf(tree.children[0]), onClose: onClose, onConfirm: onConfirm }
}

/** Locale dictionaries must keep identical, non-empty key sets in both languages. */
function testLocaleShape(report, locale) {
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
}

/** page.help must not claim every setting is written to the current Profile. */
function testPageHelp(report, locale) {
  const zh = locale.zh['page.help']
  const en = locale.en['page.help']
  expect(report, !zh.includes('所有配置写入当前 Profile'), 'zh page.help still claims all settings go to the current Profile')
  expect(report, !en.includes('All settings are written to the current Profile'), 'en page.help still claims all settings go to the current Profile')
  expect(report, zh.includes('新增配置写入当前 Profile'), 'zh page.help must state that new settings go to the current Profile')
  expect(report, /按所属配置层更新或删除/u.test(zh), 'zh page.help must say existing rows update/delete in their own layer')
  expect(report, /工作区会话共享/u.test(zh), 'zh page.help must keep the profile workspace sharing note')
  expect(report, en.includes('New settings are written to the current Profile'), 'en page.help must state that new settings go to the current Profile')
  expect(report, /updated or deleted in their own config layer/u.test(en), 'en page.help must say existing rows update/delete in their own layer')
  expect(report, /workspace session/u.test(en), 'en page.help must keep the profile workspace sharing note')
}

/** Tool tooltips must not promise a full/all tool list, and must keep the unread-field caveat. */
function testToolCopy(report, locale) {
  const stale = [/全量/u, /\bfull\b/iu, /\ball\b/iu]
  for (const lang of ['zh', 'en']) {
    for (const key of ['action.probeTip', 'editor.toolsTip']) {
      for (const pattern of stale) {
        expect(report, !pattern.test(locale[lang][key]), `${lang} ${key} still promises a full/all tool list`)
      }
    }
  }
  expect(report, locale.zh['action.probeTip'].includes('工具列表'), 'zh action.probeTip must mention the tool list')
  expect(report, locale.en['action.probeTip'].includes('tool list'), 'en action.probeTip must mention the tool list')
  expect(report, locale.zh['editor.toolsTip'].includes('工具列表') && locale.zh['editor.toolsTip'].includes('说明'), 'zh editor.toolsTip must mention the tool list and descriptions')
  expect(report, locale.en['editor.toolsTip'].includes('tool list') && locale.en['editor.toolsTip'].includes('descriptions'), 'en editor.toolsTip must mention the tool list and descriptions')
  expect(report, /autoApprove/.test(locale.zh['editor.toolsTip']) && /disabledTools/.test(locale.zh['editor.toolsTip']) && locale.zh['editor.toolsTip'].includes('尚未读取'), 'zh editor.toolsTip must keep the autoApprove/disabledTools caveat')
  expect(report, /autoApprove/.test(locale.en['editor.toolsTip']) && /disabledTools/.test(locale.en['editor.toolsTip']) && locale.en['editor.toolsTip'].includes('does not read'), 'en editor.toolsTip must keep the autoApprove/disabledTools caveat')
}

/** Render DeleteDialog for each layer and check the interpolated scope sentence. */
function testDeleteCopy(report, locale, lang) {
  const dict = locale[lang]
  const t = makeT(dict)
  const irreversible = lang === 'zh' ? '不可撤销' : 'cannot be undone'
  const cases = [
    { level: 'global', scope: 'delete.scopeGlobal', other: 'delete.scopeProfile', label: 'global/home' },
    { level: 'workspace', scope: 'delete.scopeProfile', other: 'delete.scopeGlobal', label: 'workspace/profile' },
    { level: undefined, scope: 'delete.scopeProfile', other: 'delete.scopeGlobal', label: 'missing level/profile default' },
  ]
  for (const item of cases) {
    const rendered = renderDelete(dict, { serverName: 'github', level: item.level })
    expect(report, rendered.text.includes('github'), `${lang} ${item.label}: dialog must contain the server name`)
    expect(report, rendered.text.includes(t(item.scope)), `${lang} ${item.label}: dialog must contain ${item.scope}`)
    expect(report, !rendered.text.includes(t(item.other)), `${lang} ${item.label}: dialog must not claim ${item.other}`)
    expect(report, rendered.text.includes('cordis.patch.yml'), `${lang} ${item.label}: dialog must name cordis.patch.yml`)
    expect(report, rendered.text.includes(irreversible), `${lang} ${item.label}: dialog must stay irreversible`)
    expect(report, !/\{\w+\}/u.test(rendered.text), `${lang} ${item.label}: dialog must not leave placeholders unresolved`)

    const children = rendered.desc.children
    expect(report, children.length === 3, `${lang} ${item.label}: description must stay prefix + serverName + suffix`)
    expect(report, children[0] === dict['delete.descPrefix'], `${lang} ${item.label}: description must start with delete.descPrefix`)
    expect(report, children[1].type === 'code' && textOf(children[1]) === 'github', `${lang} ${item.label}: serverName must stay between prefix and suffix`)
    expect(report, children[2] === t('delete.descSuffix', { scope: t(item.scope) }), `${lang} ${item.label}: suffix must interpolate the layer scope`)

    const footer = rendered.footer.children
    expect(report, footer[0].props.className === 'mm-foot-left' && footer[1].props.className === 'mm-foot-right', `${lang} ${item.label}: footer layout must stay unchanged`)
    const cancel = footer[1].children[0]
    const confirm = footer[1].children[1]
    expect(report, cancel.props.variant === 'ghost' && textOf(cancel) === dict['delete.cancel'], `${lang} ${item.label}: cancel must stay the first ghost button`)
    expect(report, cancel.props.onClick === rendered.onClose, `${lang} ${item.label}: cancel must keep its onClose handler`)
    expect(report, rendered.tree.props.initialFocus === cancel.props.buttonRef, `${lang} ${item.label}: cancel must keep focus priority`)
    expect(report, confirm.props.variant === 'danger' && textOf(confirm) === dict['delete.confirm'], `${lang} ${item.label}: delete must stay the danger button`)
    expect(report, confirm.props.onClick === rendered.onConfirm, `${lang} ${item.label}: delete must keep its onConfirm handler`)
  }
}

function designRowOf(design, key) {
  const prefix = '| `' + key + '` |'
  const line = design.split(/\r?\n/u).find((entry) => entry.trimStart().startsWith(prefix))
  if (line === undefined) return null
  const cells = line.split('|').map((cell) => cell.trim())
  return { zh: cells[2], en: cells[3] }
}

/** DESIGN.md §3 must quote the new zh/en strings verbatim. */
function testDesignTable(report) {
  const locale = loadLocale()
  const design = readFileSync(DESIGN_PATH, 'utf8')
  const exact = ['page.help', 'action.probeTip', 'editor.toolsTip', 'delete.scopeGlobal', 'delete.scopeProfile']
  for (const key of exact) {
    const row = designRowOf(design, key)
    expect(report, row !== null, `DESIGN.md §3 is missing the ${key} row`)
    if (row === null) continue
    expect(report, row.zh === locale.zh[key], `DESIGN.md zh copy for ${key} must match 00-locale.js`)
    expect(report, row.en === locale.en[key], `DESIGN.md en copy for ${key} must match 00-locale.js`)
  }
  // The table note explicitly omits the edge spaces kept by the dictionary.
  for (const key of ['delete.descPrefix', 'delete.descSuffix']) {
    const row = designRowOf(design, key)
    expect(report, row !== null, `DESIGN.md §3 is missing the ${key} row`)
    if (row === null) continue
    expect(report, row.zh === locale.zh[key].trim(), `DESIGN.md zh copy for ${key} must match 00-locale.js (ignoring edge spaces)`)
    expect(report, row.en === locale.en[key].trim(), `DESIGN.md en copy for ${key} must match 00-locale.js (ignoring edge spaces)`)
  }
}

/**
 * Entry point called from `selftest.run(report)`. Kept dependency-free and synthetic.
 * @param {(message: string) => void} report
 */
export function runCopyContract(report) {
  const locale = loadLocale()
  testLocaleShape(report, locale)
  testPageHelp(report, locale)
  testToolCopy(report, locale)
  testDeleteCopy(report, locale, 'zh')
  testDeleteCopy(report, locale, 'en')
  testDesignTable(report)
}