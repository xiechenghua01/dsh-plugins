#!/usr/bin/env node
/**
 * Build a standalone HTML preview of the Session Stats panel from this machine's real
 * session data, without a running Harness.
 *
 * The preview inlines the installed Harness theme tokens (read from its app.asar when
 * available, with an approximate fallback), the plugin's own stylesheet and the server
 * payloads of the production Host half, then renders the production browser half with
 * the headless React shim. One chart tooltip is forced visible so the hover card can be
 * checked in the screenshot; everything else is the real component output.
 *
 *   node tools/preview.mjs [--theme dark|light] [--out path] [--hover N]
 *
 * Output defaults to .preview/session-stats.html (ignored by Git). Requires `zstd`.
 */
import { readFileSync } from 'node:fs'
import { open, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { PRESET_INDEX, buildClientDefinition, collect, elementsByClass, readyPreset, renderStaticTree, textOf } from './lib/render.mjs'
import { PLUGIN_DIR, REPO_ROOT, loadPayloads } from './lib/local-corpus.mjs'

const FALLBACK_DARK = {
  'alias-bg-base': '#111214',
  'alias-bg-layer-1': '#1b1c1f',
  'alias-bg-layer-2': '#26272b',
  'alias-bg-overlay': '#2c2d31',
  'alias-border-l1': '#3a3c41',
  'alias-border-l2': '#34363b',
  'alias-border-l3': '#2c2e33',
  'alias-border-l4': '#23252a',
  'alias-label-primary': '#f2f3f5',
  'alias-label-secondary': '#c4c6cb',
  'alias-label-tertiary': '#9a9ca2',
  'alias-label-caption': '#7c7e84',
  'alias-brand-primary': '#ffffff',
  'alias-state-success-primary': '#22c55e',
  'alias-state-business-primary': '#4176e6',
  'alias-state-warn-primary': '#f59e0b',
  'alias-state-error-primary': '#ec1313',
  'alias-interactive-bg-hover': '#ffffff14',
}
const FALLBACK_LIGHT = {
  'alias-bg-base': '#f7f8fa',
  'alias-bg-layer-1': '#ffffff',
  'alias-bg-layer-2': '#f1f2f4',
  'alias-bg-overlay': '#ffffff',
  'alias-border-l1': '#d5d7dc',
  'alias-border-l2': '#dfe1e5',
  'alias-border-l3': '#e7e9ec',
  'alias-border-l4': '#eef0f2',
  'alias-label-primary': '#141518',
  'alias-label-secondary': '#4c4f55',
  'alias-label-tertiary': '#74777d',
  'alias-label-caption': '#96999f',
  'alias-brand-primary': '#111111',
  'alias-state-success-primary': '#22c55e',
  'alias-state-business-primary': '#4176e6',
  'alias-state-warn-primary': '#f59e0b',
  'alias-state-error-primary': '#ec1313',
  'alias-interactive-bg-hover': '#0000000a',
}

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}
const theme = option('--theme', 'dark') === 'light' ? 'light' : 'dark'
const mode = option('--mode', 'model') === 'type' ? 'type' : 'model'
const outPath = resolve(option('--out', join(REPO_ROOT, '.preview', 'session-stats.html')))

/** Read the installed Harness theme's alias tokens; falls back to the local palette. */
async function readThemeTokens() {
  const asar = process.env.DSH_ASAR || '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar'
  try {
    const handle = await open(asar, 'r')
    try {
      const head = Buffer.alloc(16)
      await handle.read(head, 0, 16, 0)
      const headerLength = head.readUInt32LE(12)
      const headerBuffer = Buffer.alloc(headerLength)
      await handle.read(headerBuffer, 0, headerLength, 16)
      const dataStart = 8 + head.readUInt32LE(4)
      const header = JSON.parse(headerBuffer.toString('utf8'))
      const entry = header.files.dsh.files.node_modules.files['@deepseek-ai'].files['dsh-client-ui-theme'].files.lib.files['client.js']
      const buffer = Buffer.alloc(entry.size)
      await handle.read(buffer, 0, entry.size, dataStart + Number(entry.offset))
      const text = buffer.toString('utf8')
      const statics = new Map()
      for (const match of text.matchAll(/--dsw-static-([a-z0-9-]+):(#[0-9a-fA-F]{3,8})/g)) statics.set(match[1], match[2])
      const readBlock = (selector) => {
        let index = text.indexOf(selector)
        while (index !== -1) {
          const body = text.slice(text.indexOf('{', index) + 1, text.indexOf('}', index))
          if (body.includes('--dsw-alias-bg-base')) {
            const tokens = new Map()
            for (const match of body.matchAll(/--dsw-([a-z0-9-]+):([^;]+)/g)) tokens.set(match[1], match[2].trim())
            return tokens
          }
          index = text.indexOf(selector, index + 1)
        }
        return new Map()
      }
      const resolveToken = (tokens, name, depth = 0) => {
        if (depth > 10) return undefined
        const value = tokens.get(name)
        if (value === undefined) return undefined
        const reference = /^var\(--dsw-([a-z0-9-]+)\)$/.exec(value)
        if (reference) return resolveToken(tokens, reference[1], depth + 1)
        const staticReference = /var\(--dsw-static-([a-z0-9-]+)\)/.exec(value)
        if (staticReference) return statics.get(staticReference[1])
        return value.startsWith('#') ? value : undefined
      }
      const tokens = readBlock(theme === 'dark' ? 'body[data-ds-dark-theme]{' : 'body{')
      const resolved = {}
      for (const name of tokens.keys()) {
        const value = resolveToken(tokens, name)
        if (value !== undefined) resolved[name] = value
      }
      if (Object.keys(resolved).length > 10) return resolved
    } finally {
      await handle.close()
    }
  } catch {
    /* fall through to the built-in palette */
  }
  return theme === 'dark' ? FALLBACK_DARK : FALLBACK_LIGHT
}

/** The plugin's own stylesheet, read from the source constant. */
function readPluginCss() {
  const source = readFileSync(join(PLUGIN_DIR, 'client.js'), 'utf8')
  const match = /const CSS = `([\s\S]*?)`\n/u.exec(source)
  if (!match) throw new Error('client.js has no CSS template')
  return match[1]
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'path', 'line', 'rect', 'circle', 'ellipse', 'polyline', 'polygon', 'use', 'stop'])
const SKIPPED_PROPS = new Set(['key', 'ref', 'children', 'onClick', 'onChange', 'onPointerMove', 'onPointerLeave', 'dangerouslySetInnerHTML'])

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function cssProperty(name) {
  return name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())
}

/** React writes these SVG props as kebab-case attributes; the static HTML must too. */
const SVG_ATTRIBUTE_NAMES = {
  vectorEffect: 'vector-effect',
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeOpacity: 'stroke-opacity',
  fillOpacity: 'fill-opacity',
  textAnchor: 'text-anchor',
  fontWeight: 'font-weight',
  fontSize: 'font-size',
  clipPath: 'clip-path',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  markerEnd: 'marker-end',
}

function styleText(style) {
  const parts = []
  for (const [name, value] of Object.entries(style)) {
    if (value === null || value === undefined || value === false) continue
    parts.push(`${cssProperty(name)}:${String(value)}`)
  }
  return parts.join(';')
}

function attributesOf(node) {
  const parts = []
  for (const [name, value] of Object.entries(node.props || {})) {
    if (SKIPPED_PROPS.has(name) || value === null || value === undefined || value === false) continue
    if (name === 'className') {
      parts.push(`class="${escapeAttribute(value)}"`)
      continue
    }
    if (name === 'style') {
      const text = styleText(value)
      if (text !== '') parts.push(`style="${escapeAttribute(text)}"`)
      continue
    }
    if (typeof value === 'function') continue
    if (value === true) {
      parts.push(name)
      continue
    }
    parts.push(`${SVG_ATTRIBUTE_NAMES[name] || name}="${escapeAttribute(value)}"`)
  }
  return parts.length === 0 ? '' : ' ' + parts.join(' ')
}

function toHtml(node) {
  if (node === null || node === undefined || node === false) return ''
  if (Array.isArray(node)) return node.map(toHtml).join('')
  if (typeof node === 'string' || typeof node === 'number') return escapeText(node)
  if (typeof node.type === 'function') return toHtml(node.type(Object.assign({}, node.props, { children: node.children })))
  const tag = node.type
  if (typeof tag !== 'string') return ''
  const open = `<${tag}${attributesOf(node)}`
  const children = (node.children || []).map(toHtml).join('')
  if (children === '' && VOID_TAGS.has(tag)) return open + ' />'
  return `${open}>${children}</${tag}>`
}

async function main() {
  const payloads = await loadPayloads()
  const definition = buildClientDefinition(PLUGIN_DIR)
  const preset = readyPreset(payloads)
  preset[PRESET_INDEX.chartMode] = mode
  const { tree } = renderStaticTree(definition, preset)
  const found = collect(tree)
  // Guard the preset contract: the rendered chart must be the requested mode.
  const activeSegment = elementsByClass(tree, 'ss-segment-active').map(textOf).join('|')
  const expectedSegment = mode === 'type' ? '按类型' : '按模型'
  if (!activeSegment.includes(expectedSegment)) {
    throw new Error(`preview mode mismatch: requested ${mode}, rendered ${activeSegment}`)
  }

  const buckets = payloads.overview.timeline.buckets
  const hoverValue = option('--hover', '')
  const hoverOption = Number.parseInt(hoverValue, 10)
  const forcedHover = hoverValue !== 'none'
  const hoverIndex = Number.isInteger(hoverOption) && hoverOption >= 0
    ? Math.min(hoverOption, buckets.length - 1)
    : buckets.reduce((best, bucket, index) => (bucket.tokens.total > buckets[best].tokens.total ? index : best), 0)

  const tokens = await readThemeTokens()
  const tokenCss = Object.entries(tokens).map(([name, value]) => `--dsw-${name}:${value};`).join('')
  const pluginCss = readPluginCss()
  const colorScheme = theme === 'dark' ? 'dark' : 'light'
  const themeAttribute = theme === 'dark' ? ' data-ds-dark-theme' : ''
  const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Session Stats preview</title>
<style>
:root{color-scheme:${colorScheme}}
html,body{height:100%;margin:0}
body[data-ds-dark-theme],body{${tokenCss}--dsw-font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;--dsh-frame-top-clearance:0px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:14px/1.6 var(--dsw-font-family)}
${pluginCss}
${forcedHover ? `body.preview .ss-hit:nth-child(${String(hoverIndex + 1)}) .ss-guide,
body.preview .ss-hit:nth-child(${String(hoverIndex + 1)}) .ss-dot,
body.preview .ss-hit:nth-child(${String(hoverIndex + 1)}) .ss-tip{opacity:1;visibility:visible}` : ''}
</style>
</head>
<body${themeAttribute} class="preview">
${toHtml(tree)}
<script>
console.log(${JSON.stringify({ sessions: payloads.sessions, series: found.classCounts.get('ss-series-line'), hoverIndex })})
</script>
</body>
</html>
`
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, html)
  console.log(`preview written: ${outPath}`)
  console.log(`theme: ${theme} · mode: ${mode} · sessions: ${String(payloads.sessions)} · series: ${String(found.classCounts.get('ss-series-line') || 0)} · forced tooltip: ${forcedHover ? `day ${String(hoverIndex + 1)} of ${String(buckets.length)}` : 'none'}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
