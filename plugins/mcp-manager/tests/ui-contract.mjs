// Synthetic UI contract tests for the MCP Manager plugin.
//
// These tests only read this plugin's own client fragments and exercise the production
// functions with a tiny React hook shim and fake geometry. They are not a renderer:
// browser behavior (layout, paint, real focus) is verified by the lead against the
// running Harness. No user files, network or MCP server is touched.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = join(HERE, '..', 'src', 'client')
const SOURCES = new Map()

function sourceOf(name) {
  if (!SOURCES.has(name)) SOURCES.set(name, readFileSync(join(CLIENT_DIR, name), 'utf8'))
  return SOURCES.get(name)
}

function expect(report, condition, message) {
  if (!condition) report(message)
}

function sameDeps(left, right) {
  if (left === undefined || right === undefined) return false
  if (left.length !== right.length) return false
  return left.every((value, index) => Object.is(value, right[index]))
}

/** Minimal hook runtime: state slots, refs and effects with cleanup on deps change/unmount. */
function createHooks() {
  const stateSlots = []
  const refSlots = []
  const effectSlots = []
  let cursor = 0
  let effectCursor = 0
  let layoutQueue = []
  let passiveQueue = []
  let dirty = false
  let writes = 0

  function useState(initial) {
    const index = cursor++
    let slot = stateSlots[index]
    if (slot === undefined) {
      slot = { value: typeof initial === 'function' ? initial() : initial, set: null }
      slot.set = (next) => {
        writes += 1
        const value = typeof next === 'function' ? next(slot.value) : next
        if (Object.is(value, slot.value)) return
        slot.value = value
        dirty = true
      }
      stateSlots[index] = slot
    }
    return [slot.value, slot.set]
  }

  function useRef(initial) {
    const index = cursor++
    if (refSlots[index] === undefined) refSlots[index] = { current: initial }
    return refSlots[index]
  }

  function register(kind, callback, deps) {
    const index = effectCursor++
    const previous = effectSlots[index]
    if (previous !== undefined && previous.kind === kind && sameDeps(previous.deps, deps)) return previous
    const record = {
      kind: kind,
      callback: callback,
      deps: deps === undefined ? undefined : deps.slice(),
      cleanup: undefined,
      previousCleanup: previous === undefined ? undefined : previous.cleanup,
    }
    effectSlots[index] = record
    if (kind === 'layout') layoutQueue.push(record)
    else passiveQueue.push(record)
    return record
  }

  function beginRender() {
    cursor = 0
    effectCursor = 0
    layoutQueue = []
    passiveQueue = []
    dirty = false
  }

  function runQueue(queue) {
    for (const record of queue) {
      if (typeof record.previousCleanup === 'function') record.previousCleanup()
      record.previousCleanup = undefined
      const cleanup = record.callback()
      record.cleanup = typeof cleanup === 'function' ? cleanup : undefined
    }
  }

  function flushEffects() {
    runQueue(layoutQueue)
    runQueue(passiveQueue)
    layoutQueue = []
    passiveQueue = []
  }

  function unmount() {
    for (let index = effectSlots.length - 1; index >= 0; index -= 1) {
      const record = effectSlots[index]
      if (record !== undefined && typeof record.cleanup === 'function') {
        record.cleanup()
        record.cleanup = undefined
      }
    }
  }

  return {
    useState: useState,
    useRef: useRef,
    useEffect: (callback, deps) => register('effect', callback, deps),
    useLayoutEffect: (callback, deps) => register('layout', callback, deps),
    beginRender: beginRender,
    flushEffects: flushEffects,
    unmount: unmount,
    isDirty: () => dirty,
    writes: () => writes,
  }
}

function listenerCapture(options) {
  return options === true || (options !== null && typeof options === 'object' && options.capture === true)
}

function makeHost(rect) {
  return {
    isConnected: true,
    rect: rect,
    reads: 0,
    getBoundingClientRect() {
      this.reads += 1
      return this.rect
    },
  }
}

/** Fake window/document/DOM node factory used by the dialog fragment. */
function createEnv(options) {
  const withObserver = options === undefined || options.withObserver !== false
  const env = {
    host: null,
    observers: [],
    listeners: [],
    window: null,
    document: null,
    ResizeObserver: undefined,
    parent: null,
  }
  env.window = {
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener(type, fn, capture) {
      env.listeners.push({ type: type, fn: fn, capture: listenerCapture(capture) })
    },
    removeEventListener(type, fn, capture) {
      const index = env.listeners.findIndex((entry) => entry.type === type && entry.fn === fn && entry.capture === listenerCapture(capture))
      if (index !== -1) env.listeners.splice(index, 1)
    },
  }
  env.document = {
    body: { style: { overflow: '' } },
    activeElement: null,
    addEventListener() {},
    removeEventListener() {},
  }
  // The parent chain is stable; only whether `closest` finds a host changes.
  env.parent = { closest: (selector) => (selector === '[role="dialog"]' ? env.host : null) }
  env.setHost = (host) => {
    env.host = host
  }
  const makeNode = () => ({
    isConnected: true,
    parentElement: env.parent,
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    focus: () => {},
  })
  env.h = (type, props, ...children) => {
    const normalized = Object.assign({}, props === null || props === undefined ? {} : props)
    const ref = normalized.ref
    if (ref !== null && ref !== undefined && typeof ref === 'object') ref.current = makeNode()
    return {
      type: type,
      props: normalized,
      children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false),
    }
  }
  env.listenerCount = (type) => env.listeners.filter((entry) => entry.type === type).length
  env.emit = (type) => {
    for (const entry of env.listeners.slice()) {
      if (entry.type === type) entry.fn({ type: type })
    }
  }
  if (withObserver) {
    env.ResizeObserver = class MockResizeObserver {
      constructor(callback) {
        this.callback = callback
        this.observed = []
        this.disconnected = false
        env.observers.push(this)
      }

      observe(target) {
        this.observed.push(target)
      }

      disconnect() {
        this.disconnected = true
      }

      trigger() {
        if (this.disconnected !== true) this.callback([], this)
      }
    }
  }
  env.setHost(null)
  return env
}

function loadDialog(env) {
  const hooks = createHooks()
  const factory = new Function(
    'h', 'useRef', 'useState', 'useEffect', 'useLayoutEffect',
    'window', 'document', 'ResizeObserver', 'IconButton', 'ICON_X', 'hideTooltip',
    sourceOf('16-dialog.js')
      + '\nreturn { Dialog, dialogModeOf, clampDialogAxis, coverHostRectOf, coverHostOf }\n',
  )
  const module = factory(
    env.h,
    hooks.useRef,
    hooks.useState,
    hooks.useEffect,
    hooks.useLayoutEffect,
    env.window,
    env.document,
    env.ResizeObserver,
    (props) => env.h('button', { 'aria-label': props.label }),
    'M0 0',
    () => {},
  )
  return { hooks: hooks, module: module }
}

function mountDialog(loaded, props) {
  let current = Object.assign({
    title: 'Contract',
    closeLabel: 'Close',
    closeTooltip: 'Close',
    onClose: () => {},
  }, props)
  let tree = null
  let renders = 0

  function settle() {
    let guard = 0
    do {
      loaded.hooks.beginRender()
      tree = loaded.module.Dialog(current)
      loaded.hooks.flushEffects()
      renders += 1
      guard += 1
    } while (loaded.hooks.isDirty() && guard < 20)
  }

  settle()
  return {
    get tree() {
      return tree
    },
    get renders() {
      return renders
    },
    rerender(patch) {
      current = Object.assign({}, current, patch)
      settle()
    },
    flush() {
      settle()
    },
    unmount() {
      loaded.hooks.unmount()
    },
  }
}

function dialogNodeOf(tree) {
  const children = tree !== null && tree !== undefined && Array.isArray(tree.children) ? tree.children : []
  return children.find((child) => child !== null && child !== undefined
    && child.props !== undefined
    && typeof child.props.className === 'string'
    && child.props.className.split(/\s+/).includes('mm-dialog')) || null
}

function expectNoGeometry(report, env, node, label) {
  expect(report, node !== null, `${label}: dialog element missing`)
  if (node === null) return
  expect(report, node.props['data-measured'] === undefined, `${label}: must not render measured geometry`)
  expect(report, node.props.style.left === undefined && node.props.style.top === undefined, `${label}: must not inline left/top`)
  expect(report, node.props.style.width === undefined && node.props.style.height === undefined, `${label}: must not inline width/height`)
  expect(report, env.observers.every((observer) => observer.disconnected === true), `${label}: must not keep an active ResizeObserver`)
  expect(report, env.listenerCount('resize') === 0 && env.listenerCount('scroll') === 0, `${label}: must not install geometry listeners`)
}

function testDialogModes(report) {
  const env = createEnv()
  const loaded = loadDialog(env)
  const module = loaded.module
  expect(report, module.dialogModeOf({}) === 'standard', 'mode defaults to standard')
  expect(report, module.dialogModeOf({ mode: 'unknown' }) === 'standard', 'unknown mode falls back to standard')
  expect(report, module.dialogModeOf({ mode: 'cover-host' }) === 'cover-host', 'cover-host is opt-in')
  expect(report, module.dialogModeOf({ size: 'confirm', mode: 'cover-host' }) === 'standard', 'confirm is always standard')
  // Width tiers live in production CSS, not a duplicated JS calculation. See
  // testCssContract; actual used widths and viewport clamping are checked in ego lite.

  env.setHost(makeHost({ left: 90, top: 70, width: 620, height: 500 }))
  const standard = mountDialog(loaded, { size: 'editor' })
  const standardNode = dialogNodeOf(standard.tree)
  expect(report, standardNode !== null && standardNode.props['data-mode'] === 'standard', 'standard dialog renders data-mode=standard')
  expect(report, env.host.reads === 0, 'standard dialog does not measure the host')
  expectNoGeometry(report, env, standardNode, 'standard')
  standard.unmount()

  const confirmEnv = createEnv()
  confirmEnv.setHost(makeHost({ left: 90, top: 70, width: 620, height: 500 }))
  const confirmLoaded = loadDialog(confirmEnv)
  const confirm = mountDialog(confirmLoaded, { size: 'confirm', mode: 'cover-host' })
  const confirmNode = dialogNodeOf(confirm.tree)
  expect(report, confirmNode !== null && confirmNode.props['data-mode'] === 'standard', 'confirm renders as standard even with mode=cover-host')
  expect(report, confirmNode !== null && confirmNode.props.className.includes('mm-dialog-confirm'), 'confirm keeps .mm-dialog-confirm')
  expect(report, confirmEnv.host.reads === 0, 'confirm dialog does not measure the host')
  expectNoGeometry(report, confirmEnv, confirmNode, 'confirm')
  confirm.unmount()

  const editorSource = sourceOf('44-editor-dialog.js')
  expect(report, /size:\s*'editor'[\s\S]{0,160}?mode:\s*'cover-host'/.test(editorSource), 'EditorDialog explicitly passes mode=cover-host')
  const deleteSource = sourceOf('50-delete.js')
  expect(report, deleteSource.includes("size: 'confirm'") && !deleteSource.includes("mode: 'cover-host'"), 'DeleteDialog stays on the standard confirm tier')
}

function testGeometryMath(report) {
  const env = createEnv()
  const module = loadDialog(env).module

  const aligned = module.coverHostRectOf({ left: 100, top: 64, width: 600, height: 480 }, 1200, 800)
  expect(report, aligned !== null
    && aligned.left === 100 && aligned.top === 64
    && aligned.width === 600 && aligned.height === 480, 'an offset host keeps left/top and equal width/height')

  const narrow = module.coverHostRectOf({ left: 0, top: 0, width: 600, height: 500 }, 300, 200)
  expect(report, narrow !== null
    && narrow.left === 16 && narrow.top === 16
    && narrow.width === 268 && narrow.height === 168, 'a narrow viewport clamps the host into the 16px gutters')

  const invalid = [
    { left: NaN, top: 0, width: 600, height: 400 },
    { left: 0, top: 0, width: Infinity, height: 400 },
    { left: 0, top: 0, width: 0, height: 400 },
    { left: -4000, top: 0, width: 600, height: 400 },
  ]
  expect(report, invalid.every((rect) => module.coverHostRectOf(rect, 1200, 800) === null), 'non-finite, zero-size and off-screen hosts are invalid')
  expect(report, module.coverHostRectOf({ left: 0, top: 0, width: 600, height: 400 }, NaN, 800) === null, 'a non-finite viewport is invalid')
  expect(report, module.coverHostRectOf({ left: 0, top: 0, width: 100, height: 100 }, 10, 10) === null, 'a tiny viewport has no positive measured area')
  const axis = module.clampDialogAxis(-20, 100, 40)
  expect(report, Number.isFinite(axis.start) && Number.isFinite(axis.size) && axis.start >= 0 && axis.size >= 0, 'axis clamping is finite and non-negative')
}

function testMeasuredLifecycle(report) {
  const env = createEnv()
  const host = makeHost({ left: 100, top: 64, width: 600, height: 480 })
  env.setHost(host)
  const loaded = loadDialog(env)
  const view = mountDialog(loaded, { size: 'editor', mode: 'cover-host' })

  let node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === 'true', 'cover-host renders measured state')
  expect(report, node !== null
    && node.props.style.left === '100px' && node.props.style.top === '64px'
    && node.props.style.width === '600px' && node.props.style.height === '480px', 'measured dialog follows the offset host rect')
  expect(report, env.observers.length === 1 && env.observers[0].observed[0] === host, 'cover-host observes the host element')
  expect(report, env.listenerCount('resize') === 1 && env.listenerCount('scroll') === 1, 'cover-host installs resize and scroll listeners')

  const writes = loaded.hooks.writes()
  env.emit('resize')
  view.flush()
  env.emit('scroll')
  view.flush()
  expect(report, loaded.hooks.writes() === writes, 'the same rect does not call setState again')

  host.rect = { left: 200, top: 120, width: 500, height: 300 }
  env.emit('resize')
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null
    && node.props.style.left === '200px' && node.props.style.top === '120px'
    && node.props.style.width === '500px' && node.props.style.height === '300px', 'window resize remeasures the host')

  host.rect = { left: 40, top: 30, width: 700, height: 500 }
  env.observers[0].trigger()
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null
    && node.props.style.left === '40px' && node.props.style.width === '700px', 'ResizeObserver remeasures the host')

  view.rerender({ mode: 'standard' })
  node = dialogNodeOf(view.tree)
  expectNoGeometry(report, env, node, 'mode change to standard')
  expect(report, env.observers[0].disconnected === true, 'mode change disconnects the host observer')

  view.rerender({ mode: 'cover-host', size: 'confirm' })
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-mode'] === 'standard' && node.props['data-measured'] === undefined, 'size=confirm disposes cover-host measurement')

  view.rerender({ mode: 'cover-host', size: 'editor' })
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === 'true', 'returning to cover-host arms measurement again')
  expect(report, env.observers.length === 2, 're-arming creates a fresh host observer')

  view.unmount()
  expect(report, env.observers[1].disconnected === true, 'unmount disconnects the active host observer')
  expect(report, env.listenerCount('resize') === 0 && env.listenerCount('scroll') === 0, 'unmount removes all geometry listeners')
  expect(report, env.document.body.style.overflow === '', 'unmount restores the background scroll lock')
}

function testFallbackAndInvalidHosts(report) {
  const env = createEnv()
  env.setHost(null)
  const loaded = loadDialog(env)
  const view = mountDialog(loaded, { size: 'editor', mode: 'cover-host' })
  let node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-mode'] === 'cover-host', 'hostless cover-host keeps its mode')
  expect(report, node !== null && node.props['data-measured'] === undefined && node.props.style.left === undefined, 'hostless cover-host falls back instead of rendering geometry')
  expect(report, env.observers.length === 0, 'hostless cover-host has no observer to attach')

  const host = makeHost({ left: 80, top: 40, width: 500, height: 400 })
  env.setHost(host)
  env.emit('resize')
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === 'true', 'a host appearing later is measured on resize')
  expect(report, env.observers.length === 1 && env.observers[0].observed[0] === host, 'a host appearing later gets a ResizeObserver')

  host.rect = { left: 0, top: 0, width: 0, height: 0 }
  env.emit('resize')
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === undefined && node.props.style.left === undefined, 'a hidden 0×0 host clears the stale measurement')

  host.rect = { left: 80, top: 40, width: 500, height: 400 }
  env.emit('resize')
  view.flush()
  host.isConnected = false
  env.emit('resize')
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === undefined, 'a disconnected host clears the stale measurement')

  host.isConnected = true
  host.rect = { left: NaN, top: 40, width: 500, height: 400 }
  env.emit('resize')
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === undefined, 'a non-finite host rect clears the stale measurement')

  host.rect = { left: 80, top: 40, width: 500, height: 400 }
  env.emit('resize')
  view.flush()
  env.window.innerWidth = NaN
  env.emit('resize')
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === undefined, 'a non-finite viewport clears the stale measurement')

  env.window.innerWidth = 1200
  env.emit('resize')
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === 'true', 'finite geometry recovers after invalid input')

  env.setHost(null)
  env.emit('resize')
  view.flush()
  node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props['data-measured'] === undefined, 'a disappearing host falls back again')
  expect(report, env.observers.every((observer) => observer.disconnected === true), 'a disappearing host disconnects its observer')
  view.unmount()
}

function testResizeObserverFallback(report) {
  const env = createEnv({ withObserver: false })
  const host = makeHost({ left: 60, top: 50, width: 400, height: 300 })
  env.setHost(host)
  const loaded = loadDialog(env)
  const view = mountDialog(loaded, { size: 'editor', mode: 'cover-host' })
  expect(report, env.observers.length === 0, 'missing ResizeObserver does not throw')
  host.rect = { left: 70, top: 60, width: 420, height: 320 }
  env.emit('resize')
  view.flush()
  const node = dialogNodeOf(view.tree)
  expect(report, node !== null && node.props.style.left === '70px' && node.props.style.width === '420px', 'without ResizeObserver, resize still remeasures')
  view.unmount()
}

function testCssContract(report) {
  const css = new Function(sourceOf('90-styles.js') + '\nreturn CSS\n')()
  const ruleOf = (selector) => css.split('\n').find((line) => line.startsWith(selector)) || ''
  const base = ruleOf('.mm-dialog{')
  const confirm = ruleOf('.mm-dialog-confirm{')
  const cover = ruleOf('.mm-dialog[data-mode="cover-host"]{')
  const measured = ruleOf('.mm-dialog[data-measured="true"]{')
  expect(report, base.includes('max-width:min(488px,calc(100vw - 32px))'), 'base dialog keeps the 488px standard form tier')
  expect(report, base.includes('border-radius:var(--dsw-radius-panel)'), 'base dialog uses radius-panel')
  expect(report, base.includes('max-height:calc(100vh - 96px)'), 'standard dialog caps height at viewport - 96px')
  expect(report, !base.includes('640px'), 'the base dialog must not default to the 640px cover fallback')
  expect(report, confirm.includes('max-width:min(480px,calc(100vw - 32px))'), 'confirm dialog keeps the 480px tier')
  expect(report, confirm.includes('border-radius:var(--dsw-radius-xl)'), 'confirm dialog uses radius-xl')
  expect(report, cover.includes('max-width:min(640px,calc(100vw - 32px))'), 'cover-host fallback is 640px wide')
  expect(report, cover.includes('border-radius:var(--dsw-radius-lg)'), 'cover-host uses radius-lg')
  expect(report, cover.includes('max-height:calc(100vh - 96px)'), 'cover-host fallback caps height at viewport - 96px')
  expect(report, measured.includes('position:fixed') && measured.includes('max-width:none') && measured.includes('max-height:none'), 'measured geometry is viewport-fixed and escapes fallback caps')
  expect(report, css.includes('.mm-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;background:transparent}'), 'backdrop stays transparent and centers the fallback dialog')
  expect(report, css.includes('.mm-list{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow-y:auto;padding-right:2px;scrollbar-gutter:stable}'), 'the list remains the single scrolling container')
}

function loadServerList() {
  function ServerRow() {}
  function StatePanel() {}
  const h = (type, props, ...children) => ({
    type: type,
    props: props === null || props === undefined ? {} : props,
    children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false),
  })
  const factory = new Function(
    'h', 'useState', 'useEffect', 'StatePanel', 'ServerRow', 'ICON_PLUG',
    'JS_MARKER_PREFIX', 'STR_ESCAPE_PREFIX', 'JS_MARKER_PATTERN',
    sourceOf('01-helpers.js') + '\n' + sourceOf('62-server-list.js') + '\nreturn { ServerList }\n',
  )
  let stateIndex = 0
  const useState = () => [stateIndex++ === 0 ? {} : false, () => {}]
  const module = factory(h, useState, () => {}, StatePanel, ServerRow, 'M0 0', '@@js:', '@@str:', /^@@js:([\s\S]*)@@$/u)
  return { module: module, ServerRow: ServerRow }
}

function elementsOfType(node, type, found) {
  if (node === null || node === undefined || node === false) return found
  if (Array.isArray(node)) {
    for (const child of node) elementsOfType(child, type, found)
    return found
  }
  if (typeof node !== 'object') return found
  if (node.type === type) found.push(node)
  for (const child of node.children || []) elementsOfType(child, type, found)
  return found
}

function testServerListFullResults(report) {
  const loaded = loadServerList()
  const rows = []
  for (let index = 0; index < 12; index += 1) {
    rows.push({
      id: 'synthetic-' + index,
      serverName: 'server-' + index,
      level: 'global',
      config: { serverName: 'server-' + index, transport: 'stdio', command: 'npx', args: ['-y', 'pkg-' + index] },
    })
  }
  const props = {
    t: (key) => key,
    rows: rows,
    query: '',
    loading: false,
    hasData: true,
    error: null,
    unauthorized: false,
    busy: false,
    testingAll: false,
    onRetry: () => {},
    onToggleEnabled: () => {},
    onEdit: () => {},
    onDelete: () => {},
  }
  const tree = loaded.module.ServerList(props)
  const rendered = elementsOfType(tree, loaded.ServerRow, [])
  expect(report, rendered.length === 12, `ServerList must render all 12 synthetic rows, got ${rendered.length}`)
  const names = rendered.map((element) => element.props.row.serverName)
  expect(report, names[0] === 'server-0' && names[11] === 'server-11', 'all synthetic rows stay reachable in order')

  const filtered = elementsOfType(loaded.module.ServerList(Object.assign({}, props, { query: 'server-7' })), loaded.ServerRow, [])
  expect(report, filtered.length === 1 && filtered[0].props.row.serverName === 'server-7', 'search filters the complete synthetic result set')

  const listSource = sourceOf('62-server-list.js')
  expect(report, !/\.slice\s*\(/.test(listSource), 'ServerList must not slice the result set')
  expect(report, !/viewMore|viewAll|查看更多/.test(listSource), 'ServerList must not add a view-more affordance')
}

/**
 * Entry point called from `selftest.run(report)`. Kept dependency-free and synthetic.
 * @param {(message: string) => void} report
 */
export async function runUiContract(report) {
  testDialogModes(report)
  testGeometryMath(report)
  testMeasuredLifecycle(report)
  testFallbackAndInvalidHosts(report)
  testResizeObserverFallback(report)
  testCssContract(report)
  testServerListFullResults(report)
}