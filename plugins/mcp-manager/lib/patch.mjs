// YAML patch-text reader/editor for the MCP Manager plugin.
//
// A DSH patch layer (`cordis.patch.yml`) is a top-level YAML array of Loader
// patch entries. This module reads those entries, edits the `insert` rows that
// belong to MCP servers, and leaves every other byte of the file alone: the
// edit is text-surgical (line ranges), never a full re-serialization, so
// comments, other plugins' rows and hand-written formatting survive.
//
// Pure: no ctx, no I/O at import time. `readPatchFile` / `writePatchFile` are
// the only functions that touch the filesystem.
//
// Supported YAML subset: block maps, block sequences, quoted/plain scalars,
// booleans, numbers, null, and `!!js` tagged values (kept as `{ $js: source }`).
// Anything else (flow collections, anchors, aliases, block scalars) makes the
// affected row unparseable instead of throwing: the row is listed read-only and
// never rewritten.

import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Marker key for a `!!js` tagged value. */
const JS_KEY = '$js'

/** Matches the `- ` sequence indicator at the start of a line. */
const SEQ_LINE = /^(\s*)-(\s|$)/

/** A key that may start an inline block map. */
const MAP_ENTRY = /^([A-Za-z_$][\w.$-]*|'[^']*'|"[^"]*")\s*:(\s|$)/

/** Line splitter that tolerates CRLF and a trailing newline. */
function splitLines(text) {
  const value = typeof text === 'string' ? text : ''
  return value.replace(/\r\n?/gu, '\n').split('\n')
}

function isBlank(line) {
  const trimmed = line.trim()
  return trimmed === '' || trimmed.startsWith('#')
}

function indentOf(line) {
  return line.length - line.trimStart().length
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function isSequenceLine(content) {
  return content === '-' || content.startsWith('- ')
}

function isJsMarker(value) {
  return value !== null && typeof value === 'object' && typeof value[JS_KEY] === 'string'
}

// ---------------------------------------------------------------------------
// YAML subset parsing
// ---------------------------------------------------------------------------

/**
 * Parse a block-style YAML subset into plain JavaScript values.
 * @param {string} text
 * @returns {unknown}
 */
export function parseYamlSubset(text) {
  const nodes = []
  splitLines(text).forEach((raw, line) => {
    if (isBlank(raw)) return
    nodes.push({ raw, indent: indentOf(raw), content: raw.trim(), line })
  })
  if (nodes.length === 0) return null
  const result = parseNode(nodes, 0)
  if (result.next !== nodes.length) {
    throw new Error(`unexpected content at line ${nodes[result.next].line + 1}`)
  }
  return result.value
}

function parseNode(nodes, start) {
  const node = nodes[start]
  if (isSequenceLine(node.content)) return parseSequence(nodes, start, node.indent)
  return parseMapping(nodes, start, node.indent)
}

function parseSequence(nodes, start, indent) {
  const items = []
  let i = start
  while (i < nodes.length) {
    const node = nodes[i]
    if (node.indent !== indent || !isSequenceLine(node.content)) break
    const rest = node.content === '-' ? '' : node.content.slice(2).trim()
    if (rest === '') {
      if (i + 1 < nodes.length && nodes[i + 1].indent > indent) {
        const child = parseNode(nodes, i + 1)
        items.push(child.value)
        i = child.next
      } else {
        items.push(null)
        i += 1
      }
      continue
    }
    if (MAP_ENTRY.test(rest)) {
      // `- key: value` starts a block map whose keys sit two columns deeper.
      const virtual = { raw: `${' '.repeat(indent + 2)}${rest}`, indent: indent + 2, content: rest, line: node.line }
      const child = parseNode([virtual, ...nodes.slice(i + 1)], 0)
      items.push(child.value)
      i += child.next
      continue
    }
    items.push(parseScalar(rest))
    i += 1
  }
  return { value: items, next: i }
}

function parseMapping(nodes, start, indent) {
  const out = {}
  let i = start
  while (i < nodes.length) {
    const node = nodes[i]
    if (node.indent !== indent || isSequenceLine(node.content)) break
    const match = /^([^:]+?)\s*:(\s*)(.*)$/u.exec(node.content)
    if (match === null) throw new Error(`expected "key: value" at line ${node.line + 1}`)
    const key = unquote(match[1].trim())
    const inline = match[3].trim()
    if (inline === '') {
      if (i + 1 < nodes.length && nodes[i + 1].indent > indent) {
        const child = parseNode(nodes, i + 1)
        out[key] = child.value
        i = child.next
      } else {
        out[key] = null
        i += 1
      }
      continue
    }
    out[key] = parseInlineValue(inline, node.line)
    i += 1
  }
  return { value: out, next: i }
}

function parseInlineValue(inline, line) {
  if (inline.startsWith('!!js')) {
    const rest = inline.slice(4).trim()
    if (rest.startsWith('"') || rest.startsWith("'")) return { [JS_KEY]: unquote(rest) }
    return { [JS_KEY]: stripTrailingComment(rest).trim() }
  }
  if (inline.startsWith('{') || inline.startsWith('[')) throw new Error(`flow collections are not supported (line ${line + 1})`)
  if (inline.startsWith('|') || inline.startsWith('>')) throw new Error(`block scalars are not supported (line ${line + 1})`)
  if (inline.startsWith('&') || inline.startsWith('*')) throw new Error(`anchors and aliases are not supported (line ${line + 1})`)
  return parseScalar(inline)
}

/** Cut a YAML comment: a `#` preceded by whitespace, which ends a plain scalar. */
function stripTrailingComment(raw) {
  const match = /[ \t]#/u.exec(raw)
  return match === null ? raw : raw.slice(0, match.index)
}

function parseScalar(raw) {
  const trimmed = raw.trim()
  // Quoted scalars own their content (including `#`); `unquote` strips any real comment.
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) return unquote(trimmed)
  // A bare scalar that starts with `#` carries no value at all.
  if (trimmed.startsWith('#')) return null
  // A plain scalar ends at a whitespace + `#` comment marker.
  const withoutComment = stripTrailingComment(trimmed)
  const value = withoutComment.trim()
  if (value === '') return null
  if (value === '' || value === '~' || value === 'null' || value === 'Null' || value === 'NULL') return null
  if (value === 'true' || value === 'True' || value === 'TRUE') return true
  if (value === 'false' || value === 'False' || value === 'FALSE') return false
  if (value.startsWith('!!js')) {
    const rest = value.slice(4).trim()
    if (rest.startsWith('"') || rest.startsWith("'")) return { [JS_KEY]: unquote(rest) }
    return { [JS_KEY]: stripTrailingComment(rest).trim() }
  }
  if (/^-?\d+$/u.test(value)) return Number(value)
  if (/^-?\d+\.\d+$/u.test(value)) return Number(value)
  return unquote(value)
}

/** Slice a double-quoted scalar up to its closing quote, honoring backslash escapes. */
function sliceDoubleQuoted(text) {
  let index = 1
  while (index < text.length) {
    const char = text[index]
    if (char === '\\') {
      index += 2
      continue
    }
    if (char === '"') return text.slice(0, index + 1)
    index += 1
  }
  return null
}

/** Slice a single-quoted scalar up to its closing quote, honoring the doubled `''` escape. */
function sliceSingleQuoted(text) {
  let index = 1
  while (index < text.length) {
    if (text[index] === "'") {
      if (text[index + 1] === "'") {
        index += 2
        continue
      }
      return text.slice(0, index + 1)
    }
    index += 1
  }
  return null
}

/** Reject text after a closing quote unless it is a YAML comment. */
function assertOnlyComment(rest, original) {
  const tail = rest.trim()
  if (tail !== '' && !tail.startsWith('#')) {
    throw new Error(`unexpected text after a quoted scalar: ${original.slice(0, 40)}`)
  }
}

function unquote(value) {
  const text = value.trim()
  if (text.startsWith('"')) {
    const quoted = sliceDoubleQuoted(text)
    if (quoted === null) throw new Error(`unterminated double-quoted scalar ${text.slice(0, 40)}`)
    assertOnlyComment(text.slice(quoted.length), text)
    try {
      return JSON.parse(quoted)
    } catch {
      // YAML-only escapes (`\x41`, `\e`, …) cannot be decoded exactly with JSON semantics.
      // Refusing the parse keeps that row read-only instead of silently rewriting its value.
      throw new Error(`unsupported escape in the double-quoted scalar ${quoted.slice(0, 40)}`)
    }
  }
  if (text.startsWith("'")) {
    const quoted = sliceSingleQuoted(text)
    if (quoted === null) throw new Error(`unterminated single-quoted scalar ${text.slice(0, 40)}`)
    assertOnlyComment(text.slice(quoted.length), text)
    return quoted.slice(1, -1).replace(/''/gu, "'")
  }
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/gu, "'")

  return text
}

// ---------------------------------------------------------------------------
// YAML subset serialization (one insert row)
// ---------------------------------------------------------------------------

/** Quote a string only when a plain scalar would be ambiguous. */
function renderScalar(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value === null || value === undefined) return 'null'
  if (isJsMarker(value)) {
    // Always quote the expression: it may contain quotes or newlines of its own, and an
    // unquoted scalar would lose them on the way back (`unquote` restores the exact text).
    return `!!js ${JSON.stringify(value[JS_KEY])}`
  }
  const text = String(value)
  if (text === '') return "''"
  // Multi-line or control-character values use a double-quoted scalar whose escapes are
  // JSON-compatible; `unquote` reads it back with JSON.parse, so `args` entries that contain
  // newlines survive a write/read round-trip.
  if (/[\u0000-\u001f\u007f]/u.test(text)) return JSON.stringify(text)
  // A plain scalar may not start with a YAML indicator (`@ - * & ! % # ? : , [ ] { } | > ' "`),
  // so only a conservative leading set stays unquoted.
  const plain = /^[A-Za-z0-9_./+][A-Za-z0-9_./@+ -]*$/u.test(text)
  const reserved = /^(?:true|false|null|~|yes|no|on|off|\d+(?:\.\d+)?)$/iu.test(text)
  if (plain && !reserved && !text.endsWith(' ')) return text
  return `'${text.replace(/'/gu, "''")}'`
}

function renderMapEntries(map, indent, lines) {
  for (const [key, value] of Object.entries(map)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      lines.push(`${indent}${key}:`)
      for (const entry of value) lines.push(`${indent}  - ${renderScalar(entry)}`)
      continue
    }
    if (value !== null && typeof value === 'object' && !isJsMarker(value)) {
      if (Object.values(value).every((member) => member === undefined)) continue
      lines.push(`${indent}${key}:`)
      renderMapEntries(value, `${indent}  `, lines)
      continue
    }
    lines.push(`${indent}${key}: ${renderScalar(value)}`)
  }
}

/** Serialize one MCP config object as the body of a `config:` key. */
export function stringifyConfig(config) {
  const lines = []
  renderMapEntries(config ?? {}, '', lines)
  return lines.join('\n')
}

/**
 * Render one insert row. The returned text has no leading indentation on its
 * first line; the caller adds the list indentation.
 * @param {{ id: string, name: string, disabled?: boolean, config: object }} row
 * @returns {string}
 */
export function renderInsertRow(row) {
  const lines = [`- id: ${renderScalar(row.id)}`, `  name: ${renderScalar(row.name)}`]
  if (row.disabled === true) lines.push('  disabled: true')
  if (row.config !== undefined && row.config !== null) {
    lines.push('  config:')
    for (const line of stringifyConfig(row.config).split('\n')) lines.push(`    ${line}`)
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Patch document scanning
// ---------------------------------------------------------------------------

/**
 * Split a patch document into its top-level array items.
 * @param {string} text
 */
function scanDocument(text) {
  const lines = splitLines(text)
  const items = []
  let arrayIndent = null
  let current = null
  for (let i = 0; i < lines.length; i += 1) {
    if (isBlank(lines[i])) continue
    const match = SEQ_LINE.exec(lines[i])
    if (match === null) continue
    const indent = match[1].length
    if (arrayIndent === null) arrayIndent = indent
    if (indent !== arrayIndent) continue
    if (current !== null) items.push(current)
    current = { start: i, end: lines.length - 1, indent }
  }
  if (current !== null) items.push(current)
  for (let k = 0; k < items.length; k += 1) {
    const nextStart = k + 1 < items.length ? items[k + 1].start : lines.length
    let end = nextStart - 1
    // Trailing blank lines and standalone comments belong to the file, not to the
    // item: a removal must not take a hand-written comment down with it.
    while (end > items[k].start && (lines[end].trim() === '' || lines[end].trim().startsWith('#'))) end -= 1
    items[k].end = end
  }
  return { lines, items, arrayIndent: arrayIndent ?? 0 }
}

function itemText(lines, item) {
  const first = lines[item.start]
  const dash = first.indexOf('-')
  const rest = first.slice(dash + 1).trim()
  const body = lines.slice(item.start + 1, item.end + 1).join('\n')
  if (rest === '') return body
  return `${' '.repeat(item.indent + 2)}${rest}\n${body}`
}

function toPlain(value) {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.map(toPlain)
  if (typeof value === 'object') {
    const out = {}
    for (const [key, member] of Object.entries(value)) out[key] = toPlain(member)
    return out
  }
  return value
}

function normalizeConfig(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object' || Array.isArray(value)) return null
  return toPlain(value)
}

/**
 * Parse one top-level item into a classified record.
 * @returns {{ kind: 'insert'|'override'|'other', value: unknown, rows: object[], parseError: string|null }}
 */
function classifyItem(text, item) {
  let value
  try {
    value = parseYamlSubset(itemText(scanDocument(text).lines, item))
  } catch (error) {
    return { kind: 'other', value: null, rows: [], parseError: error instanceof Error ? error.message : String(error) }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { kind: 'other', value, rows: [], parseError: null }
  }
  if (Array.isArray(value.insert)) {
    const rows = []
    for (const entry of value.insert) {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        rows.push({ id: null, name: null, disabled: undefined, config: null, parseable: false, reason: 'row is not a mapping' })
        continue
      }
      const id = typeof entry.id === 'string' ? entry.id : null
      rows.push({
        id,
        name: typeof entry.name === 'string' ? entry.name : null,
        disabled: entry.disabled === true ? true : undefined,
        config: normalizeConfig(entry.config),
        parseable: id !== null && (entry.config === undefined || entry.config === null || (typeof entry.config === 'object' && !Array.isArray(entry.config))),
        reason: id === null ? 'row has no string id' : null,
        rawValue: entry,
      })
    }
    return { kind: 'insert', value, rows, parseError: null }
  }
  if (typeof value.id === 'string') {
    return { kind: 'override', value, rows: [], parseError: null }
  }
  return { kind: 'other', value, rows: [], parseError: null }
}

/**
 * Parse a whole patch document.
 * @param {string} text
 * @returns {{ items: object[], errors: string[] }}
 */
export function parsePatch(text) {
  const { lines, items } = scanDocument(text)
  const errors = []
  const parsed = []
  items.forEach((item, index) => {
    const classified = classifyItem(text, item)
    if (classified.parseError !== null) errors.push(`item ${index + 1}: ${classified.parseError}`)
    parsed.push({
      index,
      start: item.start,
      end: item.end,
      indent: item.indent,
      kind: classified.kind,
      value: classified.value,
      rows: classified.rows,
      parseError: classified.parseError,
      raw: lines.slice(item.start, item.end + 1).join('\n'),
    })
  })
  return { items: parsed, errors }
}

/** Every insert row that names an MCP server, with its item context. */
export function insertRows(text) {
  const { items } = parsePatch(text)
  const rows = []
  for (const item of items) {
    if (item.kind !== 'insert') {
      // An `insert` item whose YAML could not be parsed still owns rows: list each one as
      // read-only (by id) so it never disappears from the page or looks free to re-create.
      if (item.parseError !== null && /\binsert\s*:/u.test(item.raw)) {
        // Scan the broken item row by row: only rows whose `name` is the MCP client package are
        // ours, and a `serverName` found below the row keeps duplicate detection accurate.
        const recovered = []
        let current = null
        let listWidth = null
        for (const line of item.raw.split('\n')) {
          if (listWidth === null) {
            const listMatch = /^(\s*)-\s+/u.exec(line)
            if (listMatch !== null && !/^\s*-\s+insert\s*:/u.test(line)) listWidth = listMatch[1].length
          }
          const idMatch = /^(\s*)-\s+id:\s*['"]?([^'"\s#]+)['"]?/u.exec(line)
          if (idMatch !== null && (listWidth === null || idMatch[1].length === listWidth)) {
            // Row keys sit two columns right of the `- ` indicator; `config:` children two more.
            current = { id: idMatch[2], name: null, serverName: null, keyIndent: idMatch[1].length + 2 }
            recovered.push(current)
            continue
          }
          if (current === null) continue
          const indent = line.length - line.trimStart().length
          if (indent === current.keyIndent) {
            const nameMatch = /^\s+name:\s*['"]?([^'"\s#]+)['"]?/u.exec(line)
            if (nameMatch !== null) current.name = nameMatch[1]
            continue
          }
          if (indent === current.keyIndent + 2) {
            const serverMatch = /^\s+serverName:\s*['"]?([^'"\s#]+)['"]?/u.exec(line)
            if (serverMatch !== null) current.serverName = serverMatch[1]
          }
        }
        for (const entry of recovered) {
          if (entry.name !== MCP_CLIENT_NAME) continue
          rows.push({
            id: entry.id,
            serverName: entry.serverName,
            name: MCP_CLIENT_NAME,
            disabled: undefined,
            config: null,
            parseable: false,
            reason: item.parseError,
            rawValue: null,
            item,
          })
        }
      }
      continue
    }
    for (const row of item.rows) {
      if (row.id === null || row.name !== MCP_CLIENT_NAME) continue
      rows.push({ ...row, item })
    }
  }
  return rows
}

/** The loader module name of one MCP server row. */
export const MCP_CLIENT_NAME = '@deepseek-ai/dsh-mcp-client'

/**
 * Find one insert row by id.
 * @param {string} text
 * @param {string} id
 */
export function findInsert(text, id) {
  return insertRows(text).find((row) => row.id === id)
}

// ---------------------------------------------------------------------------
// Text-level row location and editing
// ---------------------------------------------------------------------------

/** Locate the line range of one `- id: <id>` row inside an item. */
function locateRow(lines, item, id) {
  // Only a row directly under `insert:` (the list's own indentation) can be the target: a nested
  // `- id:` inside another plugin's config must never be matched.
  const width = listIndent(lines, item)
  const pattern = new RegExp(`^\\s{${width}}-\\s+id:\\s*['"]?${escapeRegExp(id)}['"]?\\s*(?:#.*)?$`, 'u')
  for (let i = item.start; i <= item.end; i += 1) {
    if (indentOf(lines[i]) !== width || !pattern.test(lines[i])) continue
    const rowIndent = indentOf(lines[i])
    let end = i
    for (let j = i + 1; j <= item.end; j += 1) {
      const body = lines[j].trim()
      if (body === '' || body.startsWith('#')) continue
      if (indentOf(lines[j]) <= rowIndent) break
      end = j
    }
    return { start: i, end, rowIndent }
  }
  return null
}

/** Indentation of the insert list inside one item. */
function listIndent(lines, item) {
  for (let i = item.start + 1; i <= item.end; i += 1) {
    if (lines[i].trim() === '') continue
    const match = SEQ_LINE.exec(lines[i])
    if (match !== null) return match[1].length
  }
  return item.indent + 4
}

function indented(text, width) {
  const pad = ' '.repeat(width)
  return text
    .split('\n')
    .map((line) => (line === '' ? '' : `${pad}${line}`))
    .join('\n')
}

/**
 * Insert or replace one MCP insert row.
 * @param {string} text
 * @param {{ id: string, name: string, disabled?: boolean, config: object }} row
 * @returns {{ text: string, action: 'inserted'|'updated'|'unchanged', id: string }}
 */
export function upsertInsert(text, row) {
  const { lines, items, arrayIndent } = scanDocument(text)
  for (const item of items) {
    if (classifyItem(text, item).kind !== 'insert') continue
    const located = locateRow(lines, item, row.id)
    if (located === null) continue
    const rendered = indented(renderInsertRow(row), located.rowIndent).split('\n')
    const before = lines.slice(0, located.start)
    const after = lines.slice(located.end + 1)
    const nextText = [...before, ...rendered, ...after].join('\n')
    return { text: nextText, action: nextText === text ? 'unchanged' : 'updated', id: row.id }
  }
  // No existing row: append to the last insert item when there is one, so new
  // servers accumulate under one `insert:` list instead of one item each.
  const lastInsert = [...items].reverse().find((item) => classifyItem(text, item).kind === 'insert')
  const rendered = renderInsertRow(row)
  if (lastInsert !== undefined) {
    const width = listIndent(lines, lastInsert)
    const before = lines.slice(0, lastInsert.end + 1)
    const after = lines.slice(lastInsert.end + 1)
    const nextText = [...before, ...indented(rendered, width).split('\n'), ...after].join('\n')
    return { text: nextText, action: 'inserted', id: row.id }
  }
  const width = arrayIndent + 4
  const block = `${' '.repeat(arrayIndent)}- insert:\n${indented(rendered, width)}`
  // A document that is empty or holds only the `[]` literal gains the new item
  // in place of that literal, so the result stays a valid top-level array.
  const existing = text.trim()
  const base = existing === '' || existing === '[]' ? '' : text.replace(/\n*$/u, '\n')
  return { text: `${base}${block}\n`, action: 'inserted', id: row.id }
}

/**
 * Remove one MCP insert row; removes its `insert:` item when the list empties.
 * @param {string} text
 * @param {string} id
 * @returns {{ text: string, removed: boolean }}
 */
export function removeInsert(text, id) {
  const { lines, items } = scanDocument(text)
  for (const item of items) {
    if (classifyItem(text, item).kind !== 'insert') continue
    const located = locateRow(lines, item, id)
    if (located === null) continue
    const remaining = []
    for (let i = item.start; i <= item.end; i += 1) {
      if (i < located.start || i > located.end) remaining.push(lines[i])
    }
    const hasRow = remaining.some((line) => SEQ_LINE.test(line) && indentOf(line) > item.indent)
    const before = lines.slice(0, item.start)
    const after = lines.slice(item.end + 1)
    const replacement = hasRow ? remaining : []
    const nextText = [...before, ...replacement, ...after].join('\n')
    // Removing the last item must leave a valid top-level array, not an empty file.
    return { text: nextText.trim() === '' ? '[]\n' : nextText, removed: true }
  }
  return { text, removed: false }
}

/**
 * Set or clear `disabled` on one insert row.
 * @param {string} text
 * @param {string} id
 * @param {boolean} disabled
 */
export function setInsertDisabled(text, id, disabled) {
  const { lines, items } = scanDocument(text)
  for (const item of items) {
    if (classifyItem(text, item).kind !== 'insert') continue
    const located = locateRow(lines, item, id)
    if (located === null) continue
    const block = lines.slice(located.start, located.end + 1)
    const disabledIndex = block.findIndex((line) => /^\s*disabled\s*:/u.test(line))
    let next
    if (disabled) {
      if (disabledIndex !== -1) {
        const indent = indentOf(block[disabledIndex])
        block[disabledIndex] = `${' '.repeat(indent)}disabled: true`
      } else {
        const nameIndex = block.findIndex((line) => /^\s*name\s*:/u.test(line))
        const anchor = nameIndex === -1 ? 0 : nameIndex
        const indent = indentOf(block[anchor])
        block.splice(anchor + 1, 0, `${' '.repeat(indent)}disabled: true`)
      }
      next = block
    } else if (disabledIndex !== -1) {
      block.splice(disabledIndex, 1)
      next = block
    } else {
      return { text, action: 'unchanged' }
    }
    const nextText = [...lines.slice(0, located.start), ...next, ...lines.slice(located.end + 1)].join('\n')
    return { text: nextText, action: nextText === text ? 'unchanged' : 'updated' }
  }
  return { text, action: 'missing' }
}

// ---------------------------------------------------------------------------
// Filesystem helpers (atomic write with one rolling backup)
// ---------------------------------------------------------------------------

/** Read a patch file; a missing file reads as an empty document. */
export async function readPatchFile(file) {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return ''
    throw error
  }
}

/** Write a patch file atomically, keeping the previous content as `<file>.bak`. */
export async function writePatchFile(file, text) {
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.tmp`
  await writeFile(temporary, text, 'utf8')
  try {
    await copyFile(file, `${file}.bak`)
  } catch (error) {
    if (!(error !== null && typeof error === 'object' && error.code === 'ENOENT')) throw error
  }
  await rename(temporary, file)
}

/** Render a whole document from a list of rows (used by selftest and recovery). */
export function renderDocument(rows) {
  const body = rows.map((row) => indented(renderInsertRow(row), 4)).join('\n')
  return `- insert:\n${body}\n`
}
