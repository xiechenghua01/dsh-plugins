// Skill market index format 1 validator.
//
// Pure functions only: no filesystem, no network, no npm dependencies. The reader passes the
// parsed JSON document plus the URL it was fetched from; `validateIndex` implements rules R1–R23
// from `docs/plugins/skill-manager/product/skill-market-index-spec.md` §15 and throws a
// `MarketIndexError` carrying `{ code, path, reason }` on the first violation.
//
// Unknown fields are ignored (R23) rather than rejected, so format 1 stays forward compatible.
// The returned `index` is the original document; `warnings` contains human-readable notes for
// unknown top-level fields and for an unusable index URL.

import { Buffer } from 'node:buffer'
import { isValidRange, isValidVersion } from './compat.mjs'

/** Maximum index document size (5 MiB). */
export const MAX_INDEX_BYTES = 5 * 1024 * 1024
/** Maximum number of skills in one index. */
export const MAX_SKILLS = 5000
/** Maximum number of versions per skill. */
export const MAX_VERSIONS_PER_SKILL = 100
/** Maximum number of files per version. */
export const MAX_FILES_PER_VERSION = 200
/** Maximum size of one file (4 MiB). */
export const MAX_FILE_BYTES = 4 * 1024 * 1024
/** Maximum total size of one version's files (20 MiB). */
export const MAX_VERSION_BYTES = 20 * 1024 * 1024
/** Maximum size of the root `SKILL.md` (256 KiB). */
export const MAX_SKILL_MD_BYTES = 256 * 1024
/** Maximum decoded size of an inline icon data URL (32 KiB). */
export const MAX_ICON_BYTES = 32 * 1024
/** Maximum length of a file path in the manifest. */
export const MAX_PATH_LENGTH = 200
/** Maximum length of a URL. */
export const MAX_URL_LENGTH = 2048
/** Maximum number of languages in a LocalizedText object. */
export const MAX_LANGUAGES = 20
/** Maximum length of each localized string. */
export const MAX_LOCALIZED_LENGTH = 500
/** Maximum number of keywords on one skill. */
export const MAX_KEYWORDS = 20
/** Maximum author string length. */
export const MAX_AUTHOR_LENGTH = 120
/** Maximum license string length. */
export const MAX_LICENSE_LENGTH = 64

// Friendly aliases for callers that prefer the shorter names.
export const MAX_VERSIONS = MAX_VERSIONS_PER_SKILL
export const MAX_FILES = MAX_FILES_PER_VERSION
export const MAX_FILE_SIZE = MAX_FILE_BYTES
export const MAX_VERSION_TOTAL_SIZE = MAX_VERSION_BYTES
export const MAX_SKILL_MD_SIZE = MAX_SKILL_MD_BYTES

const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SHA256_RE = /^[0-9a-f]{64}$/
const LANGUAGE_ID_RE = /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/
const PATH_SEGMENT_RE = /^[A-Za-z0-9_@+-][A-Za-z0-9._@+-]*$/
const GIT_PATH_SEGMENT_RE = /^[A-Za-z0-9._@+-]+$/
const ICON_DATA_RE = /^data:image\/(svg\+xml|png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/
const RESERVED_SEGMENTS = new Set(['.disabled', '.skill-manager', '.git', 'node_modules'])

const TOP_LEVEL_FIELDS = new Set([
  '$schema',
  'format',
  'title',
  'description',
  'homepage',
  'repository',
  'author',
  'icon',
  'metadata',
  'skills',
])

/** Validation failure with a JSON path and a stable error code. */
export class MarketIndexError extends Error {
  /**
   * @param {string} code `E_INDEX_INVALID` or `E_INDEX_VERSION`
   * @param {string} path JSONPath-style location, e.g. `$.skills[0].versions[1].files[2].path`
   * @param {string} reason human-readable explanation
   */
  constructor(code, path, reason) {
    super(`${path}: ${reason}`)
    this.name = 'MarketIndexError'
    this.code = code
    this.path = path
    this.reason = reason
  }
}

/**
 * Backwards-compatible alias for Host modules written against the design document's
 * `MarketError` name.
 */
export const MarketError = MarketIndexError

function fail(path, reason, code = 'E_INDEX_INVALID') {
  throw new MarketIndexError(code, path, reason)
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

/**
 * Select a localized string by language.
 *
 * Order: exact language match → primary language (`zh` for `zh-cn`) → `en` → first entry.
 * Plain strings are returned as-is.
 *
 * @param {unknown} value LocalizedText
 * @param {string} [lang]
 * @returns {string}
 */
export function localizedText(value, lang = 'en') {
  if (typeof value === 'string') return value
  if (!isObject(value)) return ''
  const entries = Object.entries(value).filter(([, text]) => typeof text === 'string' && text !== '')
  if (entries.length === 0) return ''
  const wanted = typeof lang === 'string' && lang !== '' ? lang.toLowerCase() : 'en'
  const exact = entries.find(([key]) => key.toLowerCase() === wanted)
  if (exact) return exact[1]
  const primary = wanted.split('-')[0]
  const samePrimary = entries.find(([key]) => key.toLowerCase() === primary)
  if (samePrimary) return samePrimary[1]
  const samePrefix = entries.find(([key]) => key.toLowerCase().startsWith(`${primary}-`))
  if (samePrefix) return samePrefix[1]
  const english = entries.find(([key]) => key.toLowerCase() === 'en')
  if (english) return english[1]
  return entries[0][1]
}

/** All non-empty string values of a LocalizedText (used by search). */
export function localizedValues(value) {
  if (typeof value === 'string') return value === '' ? [] : [value]
  if (!isObject(value)) return []
  return Object.values(value).filter((text) => typeof text === 'string' && text !== '')
}

function checkLocalized(value, path, required = false) {
  if (value === undefined) {
    if (required) fail(path, 'is required')
    return
  }
  if (typeof value === 'string') {
    if (value.length === 0) fail(path, 'must be a non-empty string')
    if (value.length > MAX_LOCALIZED_LENGTH) fail(path, `must be at most ${MAX_LOCALIZED_LENGTH} characters`)
    return
  }
  if (!isObject(value)) fail(path, 'must be a string or an object of language strings')
  const keys = Object.keys(value)
  if (keys.length === 0) fail(path, 'must contain at least one language')
  if (keys.length > MAX_LANGUAGES) fail(path, `must contain at most ${MAX_LANGUAGES} languages`)
  for (const key of keys) {
    if (!LANGUAGE_ID_RE.test(key)) fail(`${path}.${key}`, 'is not a valid language id')
    const text = value[key]
    if (typeof text !== 'string') fail(`${path}.${key}`, 'must be a string')
    if (text.length === 0) fail(`${path}.${key}`, 'must be a non-empty string')
    if (text.length > MAX_LOCALIZED_LENGTH) fail(`${path}.${key}`, `must be at most ${MAX_LOCALIZED_LENGTH} characters`)
  }
  if (!hasOwn(value, 'en')) fail(path, 'must contain an "en" translation')
}

function checkOptionalString(value, path, max) {
  if (value === undefined) return
  if (typeof value !== 'string') fail(path, 'must be a string')
  if (value.length === 0) fail(path, 'must be a non-empty string')
  if (value.length > max) fail(path, `must be at most ${max} characters`)
}

function parseBaseUrl(indexUrl) {
  if (indexUrl instanceof URL) {
    if (indexUrl.protocol !== 'http:' && indexUrl.protocol !== 'https:') return null
    if (indexUrl.username || indexUrl.password || indexUrl.hash) return null
    return indexUrl
  }
  if (typeof indexUrl !== 'string' || indexUrl === '') return null
  try {
    const url = new URL(indexUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password || url.hash) return null
    return url
  } catch {
    return null
  }
}

function checkAbsoluteHttpUrl(value, path) {
  if (typeof value !== 'string' || value === '') fail(path, 'must be a non-empty string')
  if (value.length > MAX_URL_LENGTH) fail(path, `must be at most ${MAX_URL_LENGTH} characters`)
  if (/\s/.test(value)) fail(path, 'must not contain whitespace')
  let url
  try {
    url = new URL(value)
  } catch {
    fail(path, 'must be an absolute URL')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') fail(path, 'must use http(s)')
  if (url.username || url.password) fail(path, 'must not contain credentials')
  return url
}

function checkUrlLike(value, path, base, { allowQueryFragment = false } = {}) {
  if (typeof value !== 'string' || value === '') fail(path, 'must be a non-empty string')
  if (value.length > MAX_URL_LENGTH) fail(path, `must be at most ${MAX_URL_LENGTH} characters`)
  if (/\s/.test(value)) fail(path, 'must not contain whitespace')

  let url
  try {
    url = new URL(value, base ? base.href : undefined)
  } catch {
    fail(path, 'must be an absolute URL or a URL relative to the index')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') fail(path, 'must resolve to http(s)')
  if (url.username || url.password) fail(path, 'must not contain credentials')
  if (!allowQueryFragment) {
    if (url.search || url.hash || value.includes('?') || value.includes('#')) {
      fail(path, 'must not contain a query or fragment')
    }
  }
  if (url.protocol !== 'https:' && !(base && url.origin === base.origin)) {
    fail(path, 'must resolve to https or the same origin as the index')
  }
  return url
}

function checkFilePath(value, path) {
  if (typeof value !== 'string') fail(path, 'must be a string')
  if (value.length === 0) fail(path, 'must be a non-empty string')
  if (value.length > MAX_PATH_LENGTH) fail(path, `must be at most ${MAX_PATH_LENGTH} characters`)
  if (value.startsWith('/')) fail(path, 'must be a relative path')
  if (value.endsWith('/')) fail(path, 'must not end with "/"')
  if (value.includes('\\')) fail(path, 'must use "/" as the separator')
  if (value.includes(':')) fail(path, 'must not contain ":"')
  if (value.includes('?')) fail(path, 'must not contain "?"')
  if (value.includes('#')) fail(path, 'must not contain "#"')
  if (value.includes('%')) fail(path, 'must not contain "%"')

  const segments = value.split('/')
  for (const segment of segments) {
    if (segment === '') fail(path, 'must not contain empty path segments')
    if (!PATH_SEGMENT_RE.test(segment)) fail(path, `contains an invalid path segment: ${segment}`)
    if (RESERVED_SEGMENTS.has(segment.toLowerCase())) fail(path, `uses a reserved path segment: ${segment}`)
  }
}

function checkIcon(value, path, base) {
  if (typeof value !== 'string' || value === '') fail(path, 'must be a non-empty string')
  if (value.startsWith('data:')) {
    const match = ICON_DATA_RE.exec(value)
    if (!match) fail(path, 'must be a data:image/(svg+xml|png|jpeg|webp);base64 URL')
    const payload = match[2]
    // A base64 length of 4n+1 can never decode.
    if (payload.length % 4 === 1) fail(path, 'contains invalid base64 data')
    const decoded = Buffer.from(payload, 'base64')
    if (decoded.length === 0) fail(path, 'data URL is empty')
    if (decoded.length > MAX_ICON_BYTES) fail(path, `icon data URL must decode to at most ${MAX_ICON_BYTES} bytes`)
    return
  }
  checkUrlLike(value, path, base, { allowQueryFragment: true })
}

function checkGitUrl(value, path) {
  if (typeof value !== 'string' || value === '') fail(path, 'must be a non-empty string')
  if (value.length > MAX_URL_LENGTH) fail(path, `must be at most ${MAX_URL_LENGTH} characters`)
  if (/\s/.test(value)) fail(path, 'must not contain whitespace')
  let url
  try {
    url = new URL(value)
  } catch {
    fail(path, 'must be an absolute URL')
  }
  if (url.protocol !== 'https:') fail(path, 'must use https')
  if (url.username || url.password) fail(path, 'must not contain credentials')
  if (url.search || url.hash) fail(path, 'must not contain a query or fragment')
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length < 2) fail(path, 'must include at least two path segments')
  if (/\.(?:tar\.gz|tgz|tar|zip)$/i.test(url.pathname)) fail(path, 'must not point to an archive')
}

function checkGitPath(value, path) {
  if (typeof value !== 'string' || value === '') fail(path, 'must be a non-empty string')
  if (value.length > MAX_PATH_LENGTH) fail(path, `must be at most ${MAX_PATH_LENGTH} characters`)
  if (value.startsWith('/') || value.endsWith('/')) fail(path, 'must be a relative directory path')
  if (value.includes('\\') || value.includes(':')) fail(path, 'must not contain "\\" or ":"')
  for (const segment of value.split('/')) {
    if (segment === '') fail(path, 'must not contain empty path segments')
    if (!GIT_PATH_SEGMENT_RE.test(segment)) fail(path, `contains an invalid path segment: ${segment}`)
    if (segment === '.' || segment === '..') fail(path, 'must not contain "." or ".." segments')
  }
}

function checkMetadata(metadata, path) {
  const declared = {
    categories: new Set(),
    labels: new Set(),
    sortKeys: new Set(),
  }
  if (metadata === undefined) return declared
  if (!isObject(metadata)) fail(path, 'must be an object')

  const checkDeclarations = (value, declarationPath, target, needsOrder) => {
    if (value === undefined) return
    if (!isObject(value)) fail(declarationPath, 'must be an object')
    for (const [id, declaration] of Object.entries(value)) {
      if (id.length === 0) fail(declarationPath, 'declaration ids must be non-empty')
      if (/\s/.test(id)) fail(`${declarationPath}.${id}`, 'declaration ids must not contain whitespace')
      if (!isObject(declaration)) fail(`${declarationPath}.${id}`, 'must be an object')
      checkLocalized(declaration.title, `${declarationPath}.${id}.title`, true)
      if (needsOrder && declaration.order !== 'asc' && declaration.order !== 'desc') {
        fail(`${declarationPath}.${id}.order`, 'must be "asc" or "desc"')
      }
      target.add(id)
    }
  }

  checkDeclarations(metadata.categories, `${path}.categories`, declared.categories, false)
  checkDeclarations(metadata.labels, `${path}.labels`, declared.labels, false)
  checkDeclarations(metadata.sortKeys, `${path}.sortKeys`, declared.sortKeys, true)
  return declared
}

function checkSkillMetadata(metadata, path, declared) {
  if (!isObject(metadata)) fail(path, 'must be an object')

  if (metadata.category !== undefined) {
    if (typeof metadata.category !== 'string' || metadata.category === '') {
      fail(`${path}.category`, 'must be a non-empty string')
    }
    if (!declared.categories.has(metadata.category)) {
      fail(`${path}.category`, `references undeclared category: ${metadata.category}`)
    }
  }

  if (metadata.keywords !== undefined) {
    if (!Array.isArray(metadata.keywords)) fail(`${path}.keywords`, 'must be an array')
    if (metadata.keywords.length > MAX_KEYWORDS) {
      fail(`${path}.keywords`, `must contain at most ${MAX_KEYWORDS} keywords`)
    }
    metadata.keywords.forEach((keyword, index) => {
      if (typeof keyword !== 'string') fail(`${path}.keywords[${index}]`, 'must be a string')
      if (keyword.length === 0) fail(`${path}.keywords[${index}]`, 'must be a non-empty string')
      if (keyword.length > 64) fail(`${path}.keywords[${index}]`, 'must be at most 64 characters')
    })
  }

  if (metadata.labels !== undefined) {
    if (!Array.isArray(metadata.labels)) fail(`${path}.labels`, 'must be an array')
    const seen = new Set()
    metadata.labels.forEach((label, index) => {
      if (typeof label !== 'string' || label === '') {
        fail(`${path}.labels[${index}]`, 'must be a non-empty string')
      }
      if (!declared.labels.has(label)) fail(`${path}.labels[${index}]`, `references undeclared label: ${label}`)
      if (seen.has(label)) fail(`${path}.labels[${index}]`, `duplicate label: ${label}`)
      seen.add(label)
    })
  }

  if (metadata.sortKeys !== undefined) {
    if (!isObject(metadata.sortKeys)) fail(`${path}.sortKeys`, 'must be an object')
    for (const [key, value] of Object.entries(metadata.sortKeys)) {
      if (!declared.sortKeys.has(key)) fail(`${path}.sortKeys.${key}`, `references undeclared sortKey: ${key}`)
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        fail(`${path}.sortKeys.${key}`, 'must be a finite number')
      }
    }
  }
}

function checkEngines(engines, path) {
  if (!isObject(engines)) fail(path, 'must be an object')
  if (engines.dsh === undefined) return
  if (typeof engines.dsh !== 'string') fail(`${path}.dsh`, 'must be a string')
  if (engines.dsh.length === 0 || engines.dsh.length > 256) {
    fail(`${path}.dsh`, 'must be between 1 and 256 characters')
  }
  if (engines.dsh.startsWith('workspace:')) fail(`${path}.dsh`, 'must not use a workspace: range')
  if (!isValidRange(engines.dsh)) fail(`${path}.dsh`, `unsupported SemVer range: ${engines.dsh}`)
}

function checkGitSource(source, path) {
  if (!isObject(source)) fail(path, 'must be an object')
  if (source.type !== 'git') fail(`${path}.type`, 'must be "git"')
  checkGitUrl(source.url, `${path}.url`)
  if (typeof source.commit !== 'string' || !/^[0-9a-f]{40}$/.test(source.commit)) {
    fail(`${path}.commit`, 'must be a 40-character lowercase hex commit')
  }
  if (source.path !== undefined) checkGitPath(source.path, `${path}.path`)
}

function checkVersion(version, path, base, seenVersions) {
  if (!isObject(version)) fail(path, 'must be an object')

  if (typeof version.version !== 'string') fail(`${path}.version`, 'must be a string')
  if (!isValidVersion(version.version)) fail(`${path}.version`, `must be an exact SemVer version: ${version.version}`)
  if (seenVersions.has(version.version)) fail(`${path}.version`, `duplicate version: ${version.version}`)
  seenVersions.add(version.version)

  if (
    !Number.isInteger(version.publishTimestamp) ||
    version.publishTimestamp < 0 ||
    version.publishTimestamp >= 100000000000
  ) {
    fail(`${path}.publishTimestamp`, 'must be an integer in [0, 100000000000)')
  }

  if (version.engines !== undefined) checkEngines(version.engines, `${path}.engines`)
  if (version.source !== undefined) checkGitSource(version.source, `${path}.source`)
  if (version.yanked !== undefined && typeof version.yanked !== 'boolean') {
    fail(`${path}.yanked`, 'must be a boolean')
  }
  if (version.readme !== undefined) checkAbsoluteHttpUrl(version.readme, `${path}.readme`)

  if (!Array.isArray(version.files)) fail(`${path}.files`, 'must be an array')
  if (version.files.length === 0) fail(`${path}.files`, 'must contain at least one file')
  if (version.files.length > MAX_FILES_PER_VERSION) {
    fail(`${path}.files`, `must contain at most ${MAX_FILES_PER_VERSION} files`)
  }

  const seenPaths = new Set()
  let totalSize = 0
  let skillMdCount = 0

  version.files.forEach((file, index) => {
    const filePath = `${path}.files[${index}]`
    if (!isObject(file)) fail(filePath, 'must be an object')

    checkFilePath(file.path, `${filePath}.path`)
    if (seenPaths.has(file.path)) fail(`${filePath}.path`, `duplicate file path: ${file.path}`)
    seenPaths.add(file.path)
    if (file.path === 'SKILL.md') skillMdCount += 1

    checkUrlLike(file.url, `${filePath}.url`, base, { allowQueryFragment: false })

    if (typeof file.sha256 !== 'string' || !SHA256_RE.test(file.sha256)) {
      fail(`${filePath}.sha256`, 'must be a 64-character lowercase hex SHA-256')
    }
    if (!Number.isInteger(file.size) || file.size < 1 || file.size > MAX_FILE_BYTES) {
      fail(`${filePath}.size`, `must be an integer between 1 and ${MAX_FILE_BYTES}`)
    }
    if (file.path === 'SKILL.md' && file.size > MAX_SKILL_MD_BYTES) {
      fail(`${filePath}.size`, `SKILL.md must be at most ${MAX_SKILL_MD_BYTES} bytes`)
    }
    totalSize += file.size
  })

  if (skillMdCount !== 1) fail(`${path}.files`, 'must contain exactly one root-level SKILL.md')
  if (totalSize > MAX_VERSION_BYTES) {
    fail(`${path}.files`, `total size must be at most ${MAX_VERSION_BYTES} bytes`)
  }
}

function checkSkill(skill, path, declared, base, seenNames) {
  if (!isObject(skill)) fail(path, 'must be an object')

  if (typeof skill.name !== 'string') fail(`${path}.name`, 'must be a string')
  if (skill.name.length < 1 || skill.name.length > 64) fail(`${path}.name`, 'must be 1-64 characters')
  if (!SKILL_NAME_RE.test(skill.name)) fail(`${path}.name`, 'must be kebab-case (a-z0-9, single hyphens)')
  if (seenNames.has(skill.name)) fail(`${path}.name`, `duplicate skill name: ${skill.name}`)
  seenNames.add(skill.name)

  if (skill.title !== undefined) checkLocalized(skill.title, `${path}.title`, false)
  checkLocalized(skill.description, `${path}.description`, true)
  checkOptionalString(skill.author, `${path}.author`, MAX_AUTHOR_LENGTH)
  checkOptionalString(skill.license, `${path}.license`, MAX_LICENSE_LENGTH)
  if (skill.homepage !== undefined) checkAbsoluteHttpUrl(skill.homepage, `${path}.homepage`)
  if (skill.repository !== undefined) checkAbsoluteHttpUrl(skill.repository, `${path}.repository`)
  if (skill.icon !== undefined) checkIcon(skill.icon, `${path}.icon`, base)
  if (skill.metadata !== undefined) checkSkillMetadata(skill.metadata, `${path}.metadata`, declared)
  if (skill.deprecated !== undefined && typeof skill.deprecated !== 'boolean') {
    fail(`${path}.deprecated`, 'must be a boolean')
  }

  if (!Array.isArray(skill.versions)) fail(`${path}.versions`, 'must be an array')
  if (skill.versions.length === 0) fail(`${path}.versions`, 'must contain at least one version')
  if (skill.versions.length > MAX_VERSIONS_PER_SKILL) {
    fail(`${path}.versions`, `must contain at most ${MAX_VERSIONS_PER_SKILL} versions`)
  }
  const seenVersions = new Set()
  skill.versions.forEach((version, index) => {
    checkVersion(version, `${path}.versions[${index}]`, base, seenVersions)
  })
}

/**
 * Validate a parsed skill market index document.
 *
 * @param {unknown} value Parsed JSON document.
 * @param {string | URL} [indexUrl] URL the document was fetched from; used to resolve relative
 *   file/icon URLs and to enforce the "https or same origin" rule.
 * @returns {{ index: object, warnings: string[] }}
 * @throws {MarketIndexError}
 */
export function validateIndex(value, indexUrl) {
  if (!isObject(value)) fail('$', 'must be an object')

  if (value.format === undefined) fail('$.format', 'is required')
  if (value.format !== 1) {
    fail('$.format', `unsupported format: ${String(value.format)}`, 'E_INDEX_VERSION')
  }

  const warnings = []
  const base = parseBaseUrl(indexUrl)
  if (indexUrl !== undefined && base === null) {
    warnings.push('$: index URL is not a usable absolute http(s) URL; relative asset URLs cannot be resolved')
  }

  checkLocalized(value.title, '$.title', true)
  if (value.description !== undefined) checkLocalized(value.description, '$.description', false)
  if (value.homepage !== undefined) checkAbsoluteHttpUrl(value.homepage, '$.homepage')
  if (value.repository !== undefined) checkAbsoluteHttpUrl(value.repository, '$.repository')
  checkOptionalString(value.author, '$.author', MAX_AUTHOR_LENGTH)
  if (value.icon !== undefined) checkIcon(value.icon, '$.icon', base)
  const declared = checkMetadata(value.metadata, '$.metadata')

  if (!Array.isArray(value.skills)) fail('$.skills', 'must be an array')
  if (value.skills.length > MAX_SKILLS) fail('$.skills', `must contain at most ${MAX_SKILLS} skills`)

  const seenNames = new Set()
  value.skills.forEach((skill, index) => {
    checkSkill(skill, `$.skills[${index}]`, declared, base, seenNames)
  })

  for (const key of Object.keys(value)) {
    if (!TOP_LEVEL_FIELDS.has(key)) warnings.push(`$.${key}: unknown field ignored`)
  }

  return { index: value, warnings }
}
