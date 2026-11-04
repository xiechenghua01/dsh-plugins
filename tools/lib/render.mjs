/**
 * Headless renderer for the plugin's browser half: a tiny React hook shim plus a tree
 * walker. It renders the production components outside a browser so tests and the
 * static preview can inspect them; no DOM is created.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Positions of the values a hook preset feeds, in the order the components consume
 * them: StatsPage takes three useState (refresh token, overview state, system state)
 * before TrendSection takes its mode and hidden-series state. Tests and the preview
 * use these names so adding a hook above the chart fails visibly instead of silently
 * shifting the preset.
 */
export const PRESET_INDEX = {
  refreshToken: 0,
  overviewState: 1,
  systemState: 2,
  chartMode: 3,
  hiddenSeries: 4,
}

export function makeReact(preset) {
  let hookIndex = 0
  const noop = () => {}
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false) }),
    Fragment: 'Fragment',
    useState(initial) {
      const index = hookIndex++
      if (index < preset.length) return [preset[index], noop]
      return [typeof initial === 'function' ? initial() : initial, noop]
    },
    useEffect() { hookIndex += 0 },
    useMemo(fn) { return fn() },
    useCallback(fn) { return fn },
    useRef(value) { return { current: value } },
  }
  return { React, reset: () => { hookIndex = 0 } }
}

/** Visit every host element, calling `visit` with either `{ text }` or the element node. */
export function walk(node, visit) {
  if (node === null || node === undefined || node === false) return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (typeof node === 'string' || typeof node === 'number') {
    visit({ text: String(node) })
    return
  }
  if (typeof node.type === 'function') {
    walk(node.type(Object.assign({}, node.props, { children: node.children })), visit)
    return
  }
  visit(node)
  for (const child of node.children || []) walk(child, visit)
}

/** Concatenated text and aria-labels of one node's subtree. */
export function textOf(node) {
  const parts = []
  walk(node, (visited) => {
    if (visited.text !== undefined) parts.push(visited.text)
    else if (visited.props && visited.props['aria-label']) parts.push(String(visited.props['aria-label']))
  })
  return parts.join(' ')
}

/** Elements whose className contains one exact class. */
export function elementsByClass(tree, className) {
  const found = []
  walk(tree, (node) => {
    if (node.props && typeof node.props.className === 'string' && node.props.className.split(/\s+/).includes(className)) found.push(node)
  })
  return found
}

/** Aggregate element tags, class names, roles and text of a rendered tree. */
export function collect(tree) {
  const classes = new Set()
  const classCounts = new Map()
  const tags = []
  const roles = []
  const texts = []
  walk(tree, (node) => {
    if (node.text !== undefined) {
      texts.push(node.text)
      return
    }
    if (typeof node.type === 'string') tags.push(node.type)
    const className = node.props && node.props.className
    if (typeof className === 'string') {
      for (const name of className.split(/\s+/).filter(Boolean)) {
        classes.add(name)
        classCounts.set(name, (classCounts.get(name) || 0) + 1)
      }
    }
    const role = node.props && node.props.role
    if (typeof role === 'string') roles.push(role)
    if (node.props && node.props['aria-label']) texts.push(String(node.props['aria-label']))
  })
  return { classes, classCounts, tags, roles, text: texts.join(' ') }
}

/** Load client.js with a fake module loader and return its registration definition. */
export function buildClientDefinition(pluginDir) {
  const code = readFileSync(join(pluginDir, 'client.js'), 'utf8')
  let definition = null
  const fakeWindow = { __ModuleLoader__: { load: (entry) => { definition = entry } } }
  new Function('window', code)(fakeWindow)
  if (definition === null) throw new Error('client.js did not register a module')
  return definition
}

/**
 * Register the plugin on the shim and return its main panel plus a bound `t`.
 * The shim's hook sequence is shared by `renderPage` and `renderStaticTree`, so hooks
 * keep the same order as in the browser.
 */
function mount(definition, preset) {
  const { React, reset } = makeReact(preset)
  reset()
  let dictionaries = null
  const t = (key, params) => {
    const dict = dictionaries ? (dictionaries.zh || {}) : {}
    let text = typeof dict[key] === 'string' ? dict[key] : key
    if (params) for (const [name, value] of Object.entries(params)) text = text.replaceAll('{' + name + '}', String(value))
    return text
  }
  const registrations = []
  const ctx = {
    effect(callback) {
      const disposer = callback()
      return () => { if (typeof disposer === 'function') disposer() }
    },
    locale: {
      register: (namespace, dicts) => { dictionaries = dicts; return () => {} },
      bind: () => t,
      getSnapshot: () => ({ active: 'zh' }),
    },
    slots: {
      inject: (name, callback) => callback(),
      register: (options, component) => { registrations.push({ options, component }); return () => {} },
    },
  }
  const mod = definition.factory((id) => {
    if (id === 'react') return React
    throw new Error('unexpected require: ' + id)
  })
  mod.apply(ctx)
  const page = registrations.find((entry) => entry.options.name === 'main')
  return { page, t, registrations, dictionaries }
}

/**
 * Render one plugin page with preset hook values and the Chinese dictionaries.
 * @returns {{ page: object, t: (key: string, params?: object) => string, registrations: object[], dictionaries: object }}
 */
export function renderPage(definition, preset) {
  return mount(definition, preset)
}

/**
 * Render the page once and materialize every component into a plain host-element tree.
 * Materializing must not render components twice: a second pass would continue the hook
 * sequence instead of replaying it, so `collect()` and the serializer see the same tree.
 * @returns {{ tree: object, t: Function, dictionaries: object }}
 */
export function renderStaticTree(definition, preset) {
  const { page, t, dictionaries } = mount(definition, preset)
  const element = page.component({ t, load: () => new Promise(() => {}), getLocaleTag: () => 'zh' })
  const expand = (node) => {
    if (node === null || node === undefined || node === false) return node
    if (Array.isArray(node)) return node.map(expand)
    if (typeof node === 'string' || typeof node === 'number') return node
    if (typeof node.type === 'function') return expand(node.type(Object.assign({}, node.props, { children: node.children })))
    return { type: node.type, props: node.props, children: (node.children || []).map(expand) }
  }
  return { tree: expand(element), t, dictionaries }
}

/** Ready-state hook presets for a rendered page (refresh token + overview + system). */
export function readyPreset(payloads) {
  return [
    0,
    { status: 'ready', data: payloads.overview, error: null, unauthorized: false, updatedAt: Date.now() },
    { status: 'ready', data: payloads.system, error: null, unauthorized: false, updatedAt: Date.now() },
  ]
}
