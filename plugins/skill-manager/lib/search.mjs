// Skill market search, filtering, sorting, and pagination.
//
// The index is small enough (≤ 5 MiB / 5000 skills) for a linear scan per query, so this module
// deliberately avoids building an inverted index. Text is normalised with NFKC + lowercasing,
// split on whitespace/punctuation, and CJK runs are expanded to adjacent bigrams plus the final
// character so partial Chinese/Japanese/Korean queries match.
//
// Scoring: name/title weight 3, keywords weight 2, everything else weight 1. A word-prefix match
// beats a substring match. Per query token only the best field contributes, which keeps a long
// description from drowning out a title hit. Ties fall back to index order.

import { compareVersions, parseVersion, satisfiesRange } from './compat.mjs'
import { localizedText, localizedValues } from './market-index.mjs'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const WORD_CHAR_RE = /[\p{L}\p{N}]/u
const WORD_SPLIT_RE = /[^\p{L}\p{N}]+/u

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase()
}

/**
 * Tokenize a query string.
 *
 * Latin runs become whole words. CJK runs become adjacent bigrams plus the last character, so
 * `代码审查` yields `代码`, `码审`, `审查`, `查`.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
function tokenizeText(value) {
  const text = normalizeText(value)
  const tokens = []
  let latin = ''
  let cjk = ''

  const flushLatin = () => {
    if (latin !== '') {
      tokens.push(latin)
      latin = ''
    }
  }
  const flushCjk = () => {
    if (cjk === '') return
    const chars = Array.from(cjk)
    if (chars.length === 1) {
      tokens.push(chars[0])
    } else {
      for (let index = 0; index < chars.length - 1; index += 1) {
        tokens.push(chars[index] + chars[index + 1])
      }
      tokens.push(chars[chars.length - 1])
    }
    cjk = ''
  }

  for (const char of text) {
    if (CJK_RE.test(char)) {
      flushLatin()
      cjk += char
    } else if (WORD_CHAR_RE.test(char)) {
      flushCjk()
      latin += char
    } else {
      flushLatin()
      flushCjk()
    }
  }
  flushLatin()
  flushCjk()
  return [...new Set(tokens)]
}

function matchScore(field, token) {
  if (field.normalized === '' || token === '') return 0
  if (field.normalized.startsWith(token)) return 2
  if (field.words === undefined) {
    field.words = field.normalized.split(WORD_SPLIT_RE).filter(Boolean)
  }
  for (const word of field.words) {
    if (word.startsWith(token)) return 2
  }
  return field.normalized.includes(token) ? 1 : 0
}

function addField(fields, text, weight) {
  if (typeof text !== 'string' || text === '') return
  fields.push({ normalized: normalizeText(text), weight })
}

function buildFields(skill, index) {
  const fields = []
  addField(fields, skill.name, 3)

  for (const title of localizedValues(skill.title)) addField(fields, title, 3)

  const keywords = skill.metadata?.keywords
  if (Array.isArray(keywords)) {
    for (const keyword of keywords) addField(fields, keyword, 2)
  }

  for (const description of localizedValues(skill.description)) addField(fields, description, 1)
  addField(fields, skill.author, 1)

  const category = skill.metadata?.category
  if (typeof category === 'string') {
    const declarations = index?.metadata?.categories
    if (declarations && Object.prototype.hasOwnProperty.call(declarations, category)) {
      for (const title of localizedValues(declarations[category]?.title)) addField(fields, title, 1)
    }
  }

  const labels = skill.metadata?.labels
  if (Array.isArray(labels)) {
    const declarations = index?.metadata?.labels
    for (const label of labels) {
      if (declarations && Object.prototype.hasOwnProperty.call(declarations, label)) {
        for (const title of localizedValues(declarations[label]?.title)) addField(fields, title, 1)
      }
    }
  }

  return fields
}

function normalizeLabels(value) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return raw
    .map((label) => (typeof label === 'string' ? label.trim() : ''))
    .filter((label) => label !== '' && label !== 'all')
}

function toNonNegativeInteger(value, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(0, Math.trunc(number))
}

function toLimit(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(number)))
}

function parseSort(sort, declarations) {
  const fallback = { kind: 'relevance', direction: 'desc' }
  if (typeof sort !== 'string' || sort.trim() === '') return fallback

  const raw = sort.trim()
  let base = raw
  let direction = null
  const match = /^(.+?)(?::|\.)(asc|desc)$/i.exec(raw)
  if (match) {
    base = match[1]
    direction = match[2].toLowerCase()
  }

  if (base === 'index') return { kind: 'index', direction: direction || 'asc' }
  if (base === 'relevance') return { kind: 'relevance', direction: direction || 'desc' }
  if (base === 'published') return { kind: 'published', direction: direction || 'desc' }
  if (base === 'name') return { kind: 'name', direction: direction || 'asc' }

  if (declarations && Object.prototype.hasOwnProperty.call(declarations, base)) {
    const declaration = declarations[base]
    const declaredDirection = declaration?.order === 'desc' ? 'desc' : 'asc'
    return { kind: 'key', key: base, direction: direction || declaredDirection }
  }
  return fallback
}

function sortValue(skill, key) {
  const value = skill?.metadata?.sortKeys?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function compareOptionalNumbers(left, right, direction, leftPosition, rightPosition) {
  const leftMissing = left === null || left === undefined || !Number.isFinite(left)
  const rightMissing = right === null || right === undefined || !Number.isFinite(right)
  if (leftMissing && rightMissing) return leftPosition - rightPosition
  if (leftMissing) return 1
  if (rightMissing) return -1
  if (left === right) return leftPosition - rightPosition
  return direction === 'desc' ? right - left : left - right
}

function publishedTimestamp(skill, dshVersion) {
  const version = defaultVersionOf(skill, dshVersion)
  return version && Number.isFinite(version.publishTimestamp) ? version.publishTimestamp : null
}

function compareEntries(left, right, sort, dshVersion) {
  if (sort.kind === 'index') {
    const order = left.position - right.position
    return sort.direction === 'desc' ? -order : order
  }

  if (sort.kind === 'relevance') {
    if (left.score !== right.score) {
      const order = right.score - left.score
      return sort.direction === 'asc' ? -order : order
    }
    return left.position - right.position
  }

  if (sort.kind === 'published') {
    return compareOptionalNumbers(
      publishedTimestamp(left.skill, dshVersion),
      publishedTimestamp(right.skill, dshVersion),
      sort.direction,
      left.position,
      right.position,
    )
  }

  if (sort.kind === 'name') {
    const order = String(left.skill?.name ?? '').localeCompare(String(right.skill?.name ?? ''))
    return sort.direction === 'desc' ? -order : order
  }

  if (sort.kind === 'key') {
    return compareOptionalNumbers(
      sortValue(left.skill, sort.key),
      sortValue(right.skill, sort.key),
      sort.direction,
      left.position,
      right.position,
    )
  }

  return left.position - right.position
}

function isCompatibleVersion(version, dshVersion) {
  const range = version?.engines?.dsh
  if (typeof range !== 'string' || range === '') return true
  // Without a known running DSH version every declared range is treated as compatible; the spec
  // keeps compatibility advisory until the Host can read the runtime version reliably. An
  // unparseable version string is treated the same way rather than silently hiding every skill.
  if (dshVersion === undefined || dshVersion === null || dshVersion === '') return true
  if (parseVersion(dshVersion) === null) return true
  // `engines.dsh` constrains the *runtime* DSH version, not the skill's own version.
  const result = satisfiesRange(dshVersion, range)
  if (result && typeof result === 'object') return true
  return result === true
}

function highestVersion(versions) {
  let best = null
  let bestParsed = null
  for (const version of versions) {
    const parsed = parseVersion(version?.version)
    if (!parsed) continue
    if (!best) {
      best = version
      bestParsed = parsed
      continue
    }
    if (!bestParsed || compareVersions(parsed, bestParsed) > 0) {
      best = version
      bestParsed = parsed
    }
  }
  return best
}

/**
 * Choose the default version for a skill.
 *
 * Candidates are non-yanked versions compatible with `dshVersion`. The highest stable version
 * wins; when no stable candidate exists, the highest compatible prerelease wins. Returns `null`
 * when there is no compatible version (or when `dshVersion` is unknown and a range is present,
 * which is treated as compatible).
 *
 * @param {object} skill
 * @param {string | null | undefined} [dshVersion]
 * @returns {object | null}
 */
export function defaultVersionOf(skill, dshVersion) {
  const versions = Array.isArray(skill?.versions)
    ? skill.versions.filter((version) => version && version.yanked !== true)
    : []
  if (versions.length === 0) return null

  const compatible = versions.filter((version) => isCompatibleVersion(version, dshVersion))
  if (compatible.length === 0) return null

  const stable = compatible.filter((version) => {
    const parsed = parseVersion(version.version)
    return parsed !== null && parsed.prerelease.length === 0
  })
  return highestVersion(stable.length > 0 ? stable : compatible)
}

/**
 * Search one validated index.
 *
 * @param {object} index
 * @param {{
 *   text?: string,
 *   category?: string,
 *   labels?: string[] | string,
 *   sort?: string,
 *   offset?: number,
 *   limit?: number,
 *   dshVersion?: string | null,
 *   lang?: string,
 * }} [query]
 * @returns {{ total: number, skills: Array<object> }} `skills` are shallow copies of index
 *   entries with `score` and `defaultVersion` added for the caller.
 */
export function searchIndex(index, query = {}) {
  const skills = Array.isArray(index?.skills) ? index.skills : []
  const tokens = tokenizeText(query.text)
  const category =
    typeof query.category === 'string' && query.category !== '' && query.category !== 'all'
      ? query.category
      : null
  const labels = normalizeLabels(query.labels)
  const dshVersion = typeof query.dshVersion === 'string' ? query.dshVersion : null

  const matches = []
  for (let position = 0; position < skills.length; position += 1) {
    const skill = skills[position]
    if (!isObject(skill)) continue

    if (category !== null && skill.metadata?.category !== category) continue
    if (labels.length > 0) {
      const skillLabels = Array.isArray(skill.metadata?.labels) ? skill.metadata.labels : []
      if (!labels.every((label) => skillLabels.includes(label))) continue
    }

    let score = 0
    if (tokens.length > 0) {
      const fields = buildFields(skill, index)
      for (const token of tokens) {
        let best = 0
        for (const field of fields) {
          const match = matchScore(field, token)
          if (match === 0) continue
          const value = field.weight * match
          if (value > best) best = value
        }
        score += best
      }
      if (score === 0) continue
    }

    matches.push({ skill, score, position })
  }

  const sort = parseSort(query.sort, index?.metadata?.sortKeys)
  matches.sort((left, right) => compareEntries(left, right, sort, dshVersion))

  const total = matches.length
  const offset = toNonNegativeInteger(query.offset, 0)
  const limit = toLimit(query.limit)
  const page = matches.slice(offset, offset + limit)

  return {
    total,
    skills: page.map(({ skill, score }) => ({
      ...skill,
      score,
      defaultVersion: defaultVersionOf(skill, dshVersion),
    })),
  }
}

/**
 * Search a set of per-source indexes and paginate each source independently.
 *
 * This is the grouped-market counterpart of `searchIndex`: the same text/sort rules apply
 * inside every source, but offsets and page sizes are per source so one block's "load more"
 * never shifts another block's page.
 *
 * @param {Array<{
 *   sourceId?: string,
 *   name?: string,
 *   index?: object | null,
 *   error?: string | null,
 *   empty?: boolean,
 *   query?: object,
 * }>} sources one entry per market source, in display order
 * @param {{ text?: string, category?: string, labels?: string[] | string, dshVersion?: string | null }} [query]
 *   query shared by every source; an entry's own `query` overrides these fields
 * @param {string} [sort] sort key (`relevance` / `index` / `published` / `name`)
 * @param {Record<string, number> | null} [cursor] per-source offsets keyed by source id
 * @param {number} [limit] page size, applied to each source
 * @returns {Array<{
 *   sourceId: string,
 *   name: string,
 *   total: number,
 *   skills: Array<object>,
 *   cursor: number | null,
 *   error: string | null,
 * }>} one block per input source; `cursor` is that source's next offset
 */
export function searchBySource(sources, query = {}, sort = 'relevance', cursor = null, limit = DEFAULT_LIMIT) {
  const list = Array.isArray(sources) ? sources : []
  const baseQuery = isObject(query) ? query : {}
  const offsets = isObject(cursor) ? cursor : {}
  const size = toLimit(limit)

  return list.map((item) => {
    const entry = isObject(item) ? item : {}
    const source = isObject(entry.source) ? entry.source : {}
    const sourceId = typeof entry.sourceId === 'string' && entry.sourceId !== ''
      ? entry.sourceId
      : (typeof source.id === 'string' ? source.id : '')
    const name = typeof entry.name === 'string' && entry.name !== ''
      ? entry.name
      : (typeof source.name === 'string' ? source.name : '')
    const error = typeof entry.error === 'string' && entry.error !== '' ? entry.error : null
    const index = isObject(entry.index) ? entry.index : null

    // A stale index is still searchable; `error` only reports the failed refresh.
    if (entry.empty === true || index === null) {
      return { sourceId, name, total: 0, skills: [], cursor: null, error }
    }

    const overrides = isObject(entry.query) ? entry.query : {}
    const offset = toNonNegativeInteger(offsets[sourceId], 0)
    const result = searchIndex(index, { ...baseQuery, ...overrides, sort, offset, limit: size })
    const next = offset + size < result.total ? offset + size : null
    return { sourceId, name, total: result.total, skills: result.skills, cursor: next, error }
  })
}

/**
 * Build the Host's `MarketSkillView` payload for one skill.
 *
 * @param {object} skill
 * @param {{
 *   sourceId?: string,
 *   sourceName?: string,
 *   sourceUrl?: string,
 *   dshVersion?: string | null,
 *   lang?: string,
 *   installed?: object,
 *   version?: object | string | null,
 * }} [options]
 * @returns {object}
 */
export function toMarketSkillView(skill, options = {}) {
  const sourceId = typeof options.sourceId === 'string' ? options.sourceId : ''
  const sourceName = typeof options.sourceName === 'string' ? options.sourceName : ''
  const sourceUrl = typeof options.sourceUrl === 'string' ? options.sourceUrl : ''
  const lang = typeof options.lang === 'string' && options.lang !== '' ? options.lang : 'en'

  let version = null
  if (options.version && typeof options.version === 'object') {
    version = options.version
  } else if (typeof options.version === 'string') {
    version = (Array.isArray(skill?.versions) ? skill.versions : []).find(
      (entry) => entry?.version === options.version,
    ) || null
  } else {
    version = defaultVersionOf(skill, options.dshVersion)
  }

  const labels = Array.isArray(skill?.metadata?.labels) ? [...skill.metadata.labels] : []

  const view = {
    id: sourceId ? `${sourceId}:${skill.name}` : skill.name,
    name: skill.name,
    title: localizedText(skill.title, lang) || skill.name,
    description: localizedText(skill.description, lang),
    version: version?.version || '',
    tags: labels,
    author: typeof skill.author === 'string' ? skill.author : '',
    license: typeof skill.license === 'string' ? skill.license : '',
    homepage: typeof skill.homepage === 'string' ? skill.homepage : '',
    sourceId,
    sourceName,
    sourceUrl,
    commit: version?.source?.commit || '',
    files: Array.isArray(version?.files)
      ? version.files.map((file) => ({ path: file.path, sha256: file.sha256, size: file.size }))
      : [],
    publishTimestamp: Number.isFinite(version?.publishTimestamp) ? version.publishTimestamp : 0,
    enginesDsh: version?.engines?.dsh || '',
  }

  if (options.installed !== undefined) view.installed = options.installed
  return view
}
