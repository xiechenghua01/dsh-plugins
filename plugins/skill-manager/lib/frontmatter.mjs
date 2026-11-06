/**
 * `SKILL.md` frontmatter parsing, validation and serialization.
 *
 * The rules mirror the DSH filesystem skill provider exactly, because a skill
 * that passes this module but fails the provider is silently dropped from the
 * model catalog (research/skill-subsystem.md §3.3):
 *
 *   - the first line must be `---` and a later standalone `---` closes the block;
 *   - the YAML document must be a mapping;
 *   - `name` is required, kebab-case, at most 64 characters;
 *   - `description` is required, non-empty, at most 500 characters;
 *   - `whenToUse` is optional, at most 200 characters;
 *   - `disable-model-invocation` / `user-invocable` accept a real boolean or
 *     `true/false/yes/no/on/off/1/0`;
 *   - the legacy keys `disableModelInvocation` / `modelInvocable` /
 *     `userInvocable` make the whole skill invalid.
 *
 * A deliberately tiny YAML subset is implemented here (no npm dependency):
 * `key: value`, quoted values, inline comments (` #`), one nested `metadata:`
 * mapping, simple `[a, b]` lists and `|` / `>` block scalars.
 */

export const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MAX_NAME_LENGTH = 64
export const MAX_DESCRIPTION_LENGTH = 500
export const MAX_WHEN_TO_USE_LENGTH = 200

const LEGACY_KEYS = ['disableModelInvocation', 'modelInvocable', 'userInvocable']
const BOOLEAN_TRUE = new Set(['true', 'yes', 'on', '1'])
const BOOLEAN_FALSE = new Set(['false', 'no', 'off', '0'])

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Count leading spaces; tabs are not valid YAML indentation. */
function indentOf(line) {
  let count = 0
  while (count < line.length && line[count] === ' ') count += 1
  if (count < line.length && line[count] === '\t') {
    throw new Error('tabs are not allowed for YAML indentation')
  }
  return count
}

/** Remove an inline ` #` comment, respecting single/double quoted strings. */
function stripComment(text) {
  let quote = null
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote === "'") {
      if (char === "'") {
        if (text[index + 1] === "'") {
          index += 1
          continue
        }
        quote = null
      }
      continue
    }
    if (quote === '"') {
      if (char === '\\') {
        index += 1
        continue
      }
      if (char === '"') quote = null
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === '#' && (index === 0 || /\s/u.test(text[index - 1]))) {
      return text.slice(0, index).trimEnd()
    }
  }
  return text
}

/** Split on top-level commas (inside `[]` / `{}` and quotes is preserved). */
function splitTopLevel(text, separator = ',') {
  const parts = []
  let quote = null
  let depth = 0
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote !== null) {
      if (quote === '"' && char === '\\') {
        index += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === '[' || char === '{') {
      depth += 1
      continue
    }
    if (char === ']' || char === '}') {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (char === separator && depth === 0) {
      parts.push(text.slice(start, index))
      start = index + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/** Find the first mapping colon outside quotes. */
function colonIndex(text) {
  let quote = null
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote !== null) {
      if (quote === '"' && char === '\\') {
        index += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === ':' && (index + 1 === text.length || /\s/u.test(text[index + 1]))) {
      return index
    }
  }
  return -1
}

function parseQuoted(text) {
  if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
    try {
      return JSON.parse(text)
    } catch {
      return text.slice(1, -1).replace(/\\(.)/gu, '$1')
    }
  }
  if (text.length >= 2 && text[0] === "'" && text[text.length - 1] === "'") {
    return text.slice(1, -1).replace(/''/gu, "'")
  }
  return undefined
}

/** Parse one scalar (already comment-stripped). */
function parseScalar(raw) {
  const text = raw.trim()
  if (text === '') return ''
  const quoted = parseQuoted(text)
  if (quoted !== undefined) return quoted
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim()
    if (inner === '') return []
    return splitTopLevel(inner).map((part) => parseScalar(part))
  }
  if (text.startsWith('{') && text.endsWith('}')) {
    const inner = text.slice(1, -1).trim()
    const result = {}
    if (inner === '') return result
    for (const part of splitTopLevel(inner)) {
      const index = colonIndex(part)
      if (index <= 0) throw new Error(`invalid inline mapping entry: ${part.trim()}`)
      const key = parseScalar(part.slice(0, index).trim())
      result[String(key)] = parseScalar(part.slice(index + 1))
    }
    return result
  }
  if (/^(?:null|Null|NULL|~)$/u.test(text)) return null
  if (/^(?:true|True|TRUE)$/u.test(text)) return true
  if (/^(?:false|False|FALSE)$/u.test(text)) return false
  if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/u.test(text)) return Number(text)
  return text
}

/** Parse a block scalar body (`|`, `|-`, `>`, `>-`, ...). */
function parseBlockScalar(header, entries, start, parentIndent) {
  const folded = header.startsWith('>')
  const chomping = header.includes('-') ? 'strip' : header.includes('+') ? 'keep' : 'clip'
  const lines = []
  let index = start
  while (index < entries.length && entries[index].indent > parentIndent) {
    lines.push(entries[index].text)
    index += 1
  }
  let text = folded ? lines.join(' ') : lines.join('\n')
  if (chomping === 'clip' && text !== '') text += '\n'
  if (chomping === 'strip') text = text.replace(/\n+$/u, '')
  return [text, index]
}

function parseBlock(entries, start, indent) {
  if (start >= entries.length) return [null, start]
  if (entries[start].text.startsWith('- ') || entries[start].text === '-') {
    return parseSequence(entries, start, indent)
  }
  return parseMapping(entries, start, indent)
}

function parseSequence(entries, start, indent) {
  const list = []
  let index = start
  while (index < entries.length && entries[index].indent === indent) {
    const entry = entries[index]
    if (!entry.text.startsWith('- ') && entry.text !== '-') break
    const rest = entry.text === '-' ? '' : entry.text.slice(2).trim()
    if (rest === '') {
      index += 1
      if (index < entries.length && entries[index].indent > indent) {
        const [value, next] = parseBlock(entries, index, entries[index].indent)
        list.push(value)
        index = next
      } else {
        list.push(null)
      }
      continue
    }
    // `- key: value` starts an inline mapping item; continuation lines must be
    // indented deeper than the dash.
    const separator = colonIndex(rest)
    if (separator > 0 && !/^["']/u.test(rest)) {
      const itemIndent = indent + 2
      const itemEntries = [{ indent: itemIndent, text: rest, line: entry.line }]
      let cursor = index + 1
      while (cursor < entries.length && entries[cursor].indent > indent) {
        itemEntries.push(entries[cursor])
        cursor += 1
      }
      const [value, consumed] = parseMapping(itemEntries, 0, itemIndent)
      list.push(value)
      // `consumed` counts the dash line itself plus its continuation lines.
      index += consumed
      continue
    }
    list.push(parseScalar(stripComment(rest)))
    index += 1
  }
  return [list, index]
}

function parseMapping(entries, start, indent) {
  const result = {}
  let index = start
  while (index < entries.length) {
    const entry = entries[index]
    if (entry.indent < indent) break
    if (entry.indent > indent) throw new Error(`unexpected indentation on line ${entry.line}`)
    if (entry.text.startsWith('- ') || entry.text === '-') break
    const separator = colonIndex(entry.text)
    if (separator <= 0) throw new Error(`expected "key: value" on line ${entry.line}`)
    const key = parseScalar(entry.text.slice(0, separator).trim())
    const rawValue = entry.text.slice(separator + 1)
    const valueText = stripComment(rawValue).trim()
    index += 1
    if (valueText === '') {
      if (index < entries.length && entries[index].indent > indent) {
        const [value, next] = parseBlock(entries, index, entries[index].indent)
        result[String(key)] = value
        index = next
      } else {
        result[String(key)] = null
      }
      continue
    }
    if (/^[|>][+-]?\d*$/u.test(valueText)) {
      const [value, next] = parseBlockScalar(valueText, entries, index, indent)
      result[String(key)] = value
      index = next
      continue
    }
    result[String(key)] = parseScalar(valueText)
  }
  return [result, index]
}

/** Parse the YAML subset used by SKILL.md frontmatter. */
function parseYamlSubset(source) {
  const lines = source.replace(/\r\n?/gu, '\n').split('\n')
  const entries = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const indent = indentOf(line)
    entries.push({ indent, text: line.slice(indent).trimEnd(), line: index + 1 })
  }
  if (entries.length === 0) return {}
  const [value, consumed] = parseBlock(entries, 0, entries[0].indent)
  if (consumed < entries.length) {
    throw new Error(`unexpected content on line ${entries[consumed].line}`)
  }
  if (!isPlainObject(value)) throw new Error('frontmatter must be a YAML mapping')
  return value
}

/**
 * A frontmatter delimiter is a line containing only `---`; surrounding whitespace is allowed,
 * but any other content (including a trailing comment) makes it a normal YAML line.
 */
function isDelimiterLine(line) {
  return line.trim() === '---'
}

/**
 * Parse a whole SKILL.md file.
 * @param {string} text
 * @returns {{ ok: boolean, frontmatter: object|null, body: string, error: string|null }}
 */
export function parseSkillFile(text) {
  const source = typeof text === 'string' ? text.replace(/^﻿/u, '') : ''
  const lines = source.replace(/\r\n?/gu, '\n').split('\n')
  if (lines.length === 0 || !isDelimiterLine(lines[0])) {
    return { ok: false, frontmatter: null, body: '', error: 'missing YAML frontmatter' }
  }
  let closing = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (isDelimiterLine(lines[index])) {
      closing = index
      break
    }
  }
  if (closing === -1) {
    return { ok: false, frontmatter: null, body: '', error: 'unterminated YAML frontmatter' }
  }
  const body = lines.slice(closing + 1).join('\n').trim()
  let frontmatter
  try {
    frontmatter = parseYamlSubset(lines.slice(1, closing).join('\n'))
  } catch (error) {
    return {
      ok: false,
      frontmatter: null,
      body,
      error: `invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
  if (!isPlainObject(frontmatter)) {
    return { ok: false, frontmatter: null, body, error: 'frontmatter must be a YAML object' }
  }
  return { ok: true, frontmatter, body, error: null }
}

/** Validate a skill name against the provider rule. */
export function validateName(name) {
  if (typeof name !== 'string') return { ok: false, error: 'name must be a string' }
  if (name.length === 0) return { ok: false, error: 'name is required' }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `name must be at most ${MAX_NAME_LENGTH} characters` }
  }
  if (!SKILL_NAME_RE.test(name)) {
    return { ok: false, error: 'name must be kebab-case: lowercase letters, digits and single hyphens' }
  }
  return { ok: true, error: null }
}

/** Boolean shorthand for `validateName`. */
export function isSkillName(name) {
  return validateName(name).ok
}

/**
 * Parse one invocation boolean. Only real booleans and the whitelist strings are accepted;
 * `null`, numbers, arrays and objects are invalid.
 */
function parseInvocationBoolean(value) {
  if (typeof value === 'boolean') return { ok: true, value }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (BOOLEAN_TRUE.has(normalized)) return { ok: true, value: true }
    if (BOOLEAN_FALSE.has(normalized)) return { ok: true, value: false }
  }
  return { ok: false, value: null }
}

/**
 * Validate a parsed frontmatter object and normalize its invocation policy.
 * @param {object} frontmatter
 * @returns {{ ok: boolean, error: string|null, frontmatter: object|null }}
 */
export function validateFrontmatter(frontmatter) {
  if (!isPlainObject(frontmatter)) {
    return { ok: false, error: 'frontmatter must be a YAML object', frontmatter: null }
  }
  const legacy = LEGACY_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(frontmatter, key))
  if (legacy.length > 0) {
    return {
      ok: false,
      error: `legacy frontmatter key(s) are not supported: ${legacy.join(', ')}`,
      frontmatter: null,
    }
  }

  const name = frontmatter.name
  if (name === undefined || name === null || name === '') {
    return { ok: false, error: 'frontmatter requires name', frontmatter: null }
  }
  const nameCheck = validateName(name)
  if (!nameCheck.ok) return { ok: false, error: nameCheck.error, frontmatter: null }

  const description = frontmatter.description
  if (typeof description !== 'string' || description.trim() === '') {
    return { ok: false, error: 'frontmatter requires a non-empty description', frontmatter: null }
  }
  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
      frontmatter: null,
    }
  }

  let whenToUse
  if (frontmatter.whenToUse !== undefined && frontmatter.whenToUse !== null) {
    if (typeof frontmatter.whenToUse !== 'string') {
      return { ok: false, error: 'whenToUse must be a string', frontmatter: null }
    }
    const trimmed = frontmatter.whenToUse.trim()
    if (trimmed.length > MAX_WHEN_TO_USE_LENGTH) {
      return {
        ok: false,
        error: `whenToUse must be at most ${MAX_WHEN_TO_USE_LENGTH} characters`,
        frontmatter: null,
      }
    }
    if (trimmed !== '') whenToUse = trimmed
  }

  let metadata
  if (frontmatter.metadata !== undefined && frontmatter.metadata !== null) {
    if (!isPlainObject(frontmatter.metadata)) {
      return { ok: false, error: 'metadata must be a mapping', frontmatter: null }
    }
    metadata = frontmatter.metadata
  }

  const disableRaw = frontmatter['disable-model-invocation']
  let modelInvocable = true
  if (disableRaw !== undefined) {
    const parsed = parseInvocationBoolean(disableRaw)
    if (!parsed.ok) {
      return { ok: false, error: 'disable-model-invocation must be a boolean', frontmatter: null }
    }
    modelInvocable = !parsed.value
  }

  const userRaw = frontmatter['user-invocable']
  let userInvocable = true
  if (userRaw !== undefined) {
    const parsed = parseInvocationBoolean(userRaw)
    if (!parsed.ok) {
      return { ok: false, error: 'user-invocable must be a boolean', frontmatter: null }
    }
    userInvocable = parsed.value
  }

  const normalized = { ...frontmatter, name, description }
  if (whenToUse !== undefined) normalized.whenToUse = whenToUse
  if (metadata !== undefined) normalized.metadata = metadata
  normalized.invocation = { modelInvocable, userInvocable }
  return { ok: true, error: null, frontmatter: normalized }
}

function looksLikeSpecialString(text) {
  if (text === '') return true
  if (text !== text.trim()) return true
  if (/^(?:null|Null|NULL|~|true|True|TRUE|false|False|FALSE)$/u.test(text)) return true
  if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/u.test(text)) return true
  return false
}

/** Serialize one scalar for the YAML subset. */
function yamlScalar(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (Array.isArray(value)) return `[${value.map((item) => yamlScalar(item)).join(', ')}]`
  if (isPlainObject(value)) return JSON.stringify(value)
  const text = String(value)
  if (text.includes('\n')) return JSON.stringify(text)
  if (looksLikeSpecialString(text) || /[:#{}[\],&*?|>'"%@`]/u.test(text)) {
    return JSON.stringify(text)
  }
  return text
}

/**
 * Serialize a frontmatter object and body back into SKILL.md text.
 * Known keys are written in the provider's canonical order; unknown keys are
 * preserved after them so editing never loses provider-ignored metadata.
 */
export function serializeSkillFile(frontmatter, body) {
  const source = isPlainObject(frontmatter) ? frontmatter : {}
  const known = new Set([
    'name',
    'description',
    'whenToUse',
    'metadata',
    'disable-model-invocation',
    'user-invocable',
    'invocation',
  ])
  const lines = []
  const push = (key, value) => {
    lines.push(`${key}: ${yamlScalar(value)}`)
  }

  if (source.name !== undefined) push('name', source.name)
  if (source.description !== undefined) push('description', source.description)
  if (typeof source.whenToUse === 'string' && source.whenToUse.trim() !== '') {
    push('whenToUse', source.whenToUse.trim())
  }
  if (isPlainObject(source.metadata) && Object.keys(source.metadata).length > 0) {
    lines.push('metadata:')
    for (const [key, value] of Object.entries(source.metadata)) {
      lines.push(`  ${key}: ${yamlScalar(value)}`)
    }
  }

  const invocation = isPlainObject(source.invocation) ? source.invocation : null
  const disable = invocation !== null
    ? invocation.modelInvocable === false
    : source['disable-model-invocation'] === true
  const user = invocation !== null
    ? invocation.userInvocable !== false
    : source['user-invocable'] !== false
  if (disable) push('disable-model-invocation', true)
  if (!user) push('user-invocable', false)

  for (const [key, value] of Object.entries(source)) {
    if (known.has(key) || LEGACY_KEYS.includes(key)) continue
    if (value === undefined) continue
    if (isPlainObject(value) && Object.keys(value).length > 0) {
      lines.push(`${key}:`)
      for (const [innerKey, innerValue] of Object.entries(value)) {
        lines.push(`  ${innerKey}: ${yamlScalar(innerValue)}`)
      }
      continue
    }
    push(key, value)
  }

  const trimmedBody = typeof body === 'string' ? body.trim() : ''
  return `---\n${lines.join('\n')}\n---\n${trimmedBody === '' ? '' : `\n${trimmedBody}\n`}`
}
