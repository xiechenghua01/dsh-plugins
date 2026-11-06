// Minimal SemVer 2.0.0 implementation for the skill market index.
//
// The Host half of a DSH bundle may only import `node:` builtins and relative files, so this
// module deliberately avoids the `semver` npm package. It implements exactly what the index
// format needs: parsing, precedence comparison, and the range syntax allowed by
// `engines.dsh`:
//
//   - comparators: `=`, `>`, `>=`, `<`, `<=` (attached or separated from the version);
//   - `^` (caret) and `~` (tilde) ranges, including partial versions (`^0.2`, `~1.2`);
//   - wildcards `*`, `x`, `X`, and partial versions (`1`, `1.2`, `1.x`, `1.2.x`);
//   - OR groups separated by `||`; comparators inside one group are ANDed;
//   - hyphen ranges (`1.2.3 - 2.0.0`).
//
// `isValidRange` only checks syntax. `satisfiesRange` evaluates the range and returns `false`
// for invalid/unsupported syntax; the index validator rejects such ranges for `engines.dsh`.

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

// Partial version as accepted inside a range: `1`, `1.2`, `1.2.3`, `1.x`, `1.x.x`, `1.2.x`,
// `x.x.x`, `*`. Prerelease identifiers follow SemVer: numeric identifiers must not have
// leading zeros (`1.2.3-01` is invalid); alphanumeric identifiers may.
const PARTIAL_RE =
  /^[vV]?(0|[1-9]\d*|[xX*])(?:\.(0|[1-9]\d*|[xX*]))?(?:\.(0|[1-9]\d*|[xX*]))?(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

const COMPARATOR_ONLY_RE = /^(>=|<=|>|<|=|\^|~)$/

function isParsedVersion(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Number.isInteger(value.major) &&
    Number.isInteger(value.minor) &&
    Number.isInteger(value.patch) &&
    Array.isArray(value.prerelease)
  )
}

/**
 * Parse an exact SemVer 2.0.0 string.
 *
 * @param {unknown} input
 * @returns {{ major: number, minor: number, patch: number, prerelease: string[], build: string[], raw: string } | null}
 */
export function parseVersion(input) {
  if (isParsedVersion(input)) return input
  if (typeof input !== 'string') return null
  const match = SEMVER_RE.exec(input)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
    build: match[5] ? match[5].split('.') : [],
    raw: input,
  }
}

/** True when `input` is an exact SemVer 2.0.0 version string. */
export function isValidVersion(input) {
  return parseVersion(input) !== null
}

function isNumericIdentifier(value) {
  return /^\d+$/.test(value)
}

function compareNumericIdentifiers(left, right) {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1
  if (left === right) return 0
  return left < right ? -1 : 1
}

function compareIdentifiers(left, right) {
  const leftNumeric = isNumericIdentifier(left)
  const rightNumeric = isNumericIdentifier(right)
  if (leftNumeric && rightNumeric) return compareNumericIdentifiers(left, right)
  if (leftNumeric) return -1
  if (rightNumeric) return 1
  if (left === right) return 0
  return left < right ? -1 : 1
}

function comparePrerelease(left, right) {
  if (left.length === 0 && right.length === 0) return 0
  if (left.length === 0) return 1
  if (right.length === 0) return -1
  const shared = Math.min(left.length, right.length)
  for (let index = 0; index < shared; index += 1) {
    const order = compareIdentifiers(left[index], right[index])
    if (order !== 0) return order
  }
  if (left.length === right.length) return 0
  return left.length < right.length ? -1 : 1
}

/**
 * Compare two SemVer versions by precedence (build metadata is ignored).
 *
 * Accepts strings or values returned by `parseVersion`. Throws `TypeError` when either side is
 * not a valid exact version; index validation should have rejected that already.
 *
 * @param {string | object} left
 * @param {string | object} right
 * @returns {-1 | 0 | 1}
 */
export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (!a || !b) throw new TypeError(`Invalid SemVer version: ${!a ? String(left) : String(right)}`)
  if (a.major !== b.major) return a.major < b.major ? -1 : 1
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1
  return comparePrerelease(a.prerelease, b.prerelease)
}

function isWildcardPart(value) {
  return value === undefined || value === '*' || value === 'x' || value === 'X'
}

/**
 * Parse a (possibly partial) version used inside a range.
 *
 * @param {string} text
 * @returns {null | { any: true } | { any: false, major: number, minor: number, patch: number, precision: number, prerelease: string[] }}
 */
function parsePartial(text) {
  const match = PARTIAL_RE.exec(text)
  if (!match) return null

  const majorWildcard = isWildcardPart(match[1])
  const minorWildcard = isWildcardPart(match[2])
  const patchWildcard = isWildcardPart(match[3])

  if (majorWildcard) {
    // `*` / `x` may fill any segment, but a wildcard major makes the whole version wild;
    // a numeric segment after a wildcard (`x.2.3`) is not a meaningful range.
    if (!minorWildcard || !patchWildcard || match[4] !== undefined || match[5] !== undefined) return null
    return { any: true }
  }
  const major = Number(match[1])
  if (minorWildcard) {
    if (!patchWildcard || match[4] !== undefined || match[5] !== undefined) return null
    return { any: false, major, minor: 0, patch: 0, precision: 1, prerelease: [] }
  }
  const minor = Number(match[2])
  if (patchWildcard) {
    if (match[4] !== undefined || match[5] !== undefined) return null
    return { any: false, major, minor, patch: 0, precision: 2, prerelease: [] }
  }
  return {
    any: false,
    major,
    minor,
    patch: Number(match[3]),
    precision: 3,
    prerelease: match[4] ? match[4].split('.') : [],
  }
}

function versionOf(major, minor, patch, prerelease = []) {
  return { major, minor, patch, prerelease }
}

function lowerBound(partial) {
  return versionOf(partial.major, partial.minor, partial.patch, partial.prerelease)
}

/** Exclusive upper bound for a partial version (`1` → 2.0.0, `1.2` → 1.3.0). */
function upperBound(partial) {
  if (partial.precision === 1) return versionOf(partial.major + 1, 0, 0)
  return versionOf(partial.major, partial.minor + 1, 0)
}

/** Expand `^1.2.3`, `^0.2`, `^0.0.3`, ... into comparators. */
function expandCaret(partial) {
  if (partial.any) return []
  const lower = lowerBound(partial)
  let upper
  if (partial.precision === 1) {
    upper = versionOf(partial.major + 1, 0, 0)
  } else if (partial.major > 0) {
    upper = versionOf(partial.major + 1, 0, 0)
  } else if (partial.minor > 0) {
    upper = versionOf(0, partial.minor + 1, 0)
  } else if (partial.precision === 2) {
    upper = versionOf(0, 1, 0)
  } else if (partial.patch > 0) {
    upper = versionOf(0, 0, partial.patch + 1)
  } else {
    upper = versionOf(0, 0, 1)
  }
  return [
    { op: '>=', version: lower },
    { op: '<', version: upper },
  ]
}

/** Expand `~1`, `~1.2`, `~1.2.3` into comparators. */
function expandTilde(partial) {
  if (partial.any) return []
  return [
    { op: '>=', version: lowerBound(partial) },
    { op: '<', version: upperBound(partial) },
  ]
}

/** Expand a plain (or wildcard) version with an explicit comparator operator. */
function expandPlain(partial, op) {
  if (partial.any) return []
  if (partial.precision === 3) {
    return [{ op, version: lowerBound(partial) }]
  }
  const lower = lowerBound(partial)
  const upper = upperBound(partial)
  switch (op) {
    case '=':
      return [{ op: '>=', version: lower }, { op: '<', version: upper }]
    case '>=':
      return [{ op: '>=', version: lower }]
    case '>':
      return [{ op: '>=', version: upper }]
    case '<':
      return [{ op: '<', version: lower }]
    case '<=':
      return [{ op: '<', version: upper }]
    default:
      return null
  }
}

/** Parse one comparator token (`>=1.2.3`, `^0.2`, `1.x`, `*`, ...). */
function parseComparator(token) {
  let op = '='
  let text = token
  let explicitOperator = false
  const operator = /^(>=|<=|>|<|=|\^|~)/.exec(token)
  if (operator) {
    op = operator[1]
    text = token.slice(operator[1].length)
    explicitOperator = true
  }
  if (text === '') return null
  const partial = parsePartial(text)
  if (partial === null) return null
  // A bare wildcard (`*`, `x`, `X`) means "any version". Combined with an explicit
  // comparator (`>*`, `<*`, `>=*`, `<=*`, `=*`, `^*`, `~*`) it has no defined meaning,
  // so treat it as an invalid range rather than an empty (match-everything) comparator.
  if (partial.any) return explicitOperator ? null : []
  if (op === '^') return expandCaret(partial)
  if (op === '~') return expandTilde(partial)
  return expandPlain(partial, op)
}

/** Parse one AND group (no `||`). Returns `null` when the syntax is invalid. */
function parseRangeGroup(text) {
  const hyphen = /^(\S+)\s+-\s+(\S+)$/u.exec(text)
  if (hyphen !== null) {
    const from = parsePartial(hyphen[1])
    const to = parsePartial(hyphen[2])
    if (from === null || to === null || from.any || to.any) return null
    const comparators = [{ op: '>=', version: lowerBound(from) }]
    if (to.precision === 3) comparators.push({ op: '<=', version: lowerBound(to) })
    else comparators.push({ op: '<', version: upperBound(to) })
    return comparators
  }

  const tokens = text.split(/\s+/u).filter((token) => token !== '')
  if (tokens.length === 0) return null
  const comparators = []
  for (let index = 0; index < tokens.length; index += 1) {
    let token = tokens[index]
    if (COMPARATOR_ONLY_RE.test(token)) {
      if (index + 1 >= tokens.length) return null
      token += tokens[index + 1]
      index += 1
    }
    const expanded = parseComparator(token)
    if (expanded === null) return null
    comparators.push(...expanded)
  }
  return comparators
}

/**
 * Parse a SemVer range into OR groups of AND-ed comparators.
 *
 * @param {unknown} range
 * @returns {{ supported: true, groups: Array<Array<{ op: string, version: object }>> } | { supported: false }}
 */
function parseRange(range) {
  if (typeof range !== 'string') return { supported: false }
  const text = range.trim()
  if (text === '') return { supported: false }
  if (text.startsWith('workspace:')) return { supported: false }

  const groups = []
  for (const part of text.split('||')) {
    const group = part.trim()
    if (group === '') return { supported: false }
    const comparators = parseRangeGroup(group)
    if (comparators === null) return { supported: false }
    groups.push(comparators)
  }
  if (groups.length === 0) return { supported: false }
  return { supported: true, groups }
}

/** True when `range` is syntactically valid (it does not check whether a version matches). */
export function isValidRange(range) {
  return parseRange(range).supported
}

function satisfiesComparator(version, comparator) {
  const order = compareVersions(version, comparator.version)
  switch (comparator.op) {
    case '>=':
      return order >= 0
    case '>':
      return order > 0
    case '<=':
      return order <= 0
    case '<':
      return order < 0
    case '=':
      return order === 0
    default:
      return false
  }
}

/**
 * True when `version` satisfies one AND-ed comparator set.
 *
 * SemVer §11: a prerelease version is only allowed to satisfy a comparator set when at
 * least one comparator in that set names a prerelease on the same `major.minor.patch`
 * tuple. This is what keeps `0.3.0-rc.1` out of `^0.2.0` (`>=0.2.0 <0.3.0`), even though
 * `0.3.0-rc.1` sorts below `0.3.0`.
 */
function satisfiesGroup(version, group) {
  if (!group.every((comparator) => satisfiesComparator(version, comparator))) return false
  if (version.prerelease.length === 0) return true
  return group.some((comparator) => (
    comparator.version.prerelease.length > 0
    && comparator.version.major === version.major
    && comparator.version.minor === version.minor
    && comparator.version.patch === version.patch
  ))
}

/**
 * Evaluate a version against a SemVer range.
 *
 * Valid syntax returns a boolean. Invalid/unsupported syntax (including an invalid exact
 * version inside the range, such as `1.2.3-01`) also returns `false`; the index validator
 * rejects such ranges for `engines.dsh`, so this only matters for defensive callers.
 *
 * @param {unknown} version
 * @param {unknown} range
 * @returns {boolean}
 */
export function satisfiesRange(version, range) {
  const parsedRange = parseRange(range)
  if (!parsedRange.supported) return false

  const parsedVersion = parseVersion(version)
  if (!parsedVersion) return false

  return parsedRange.groups.some((group) => satisfiesGroup(parsedVersion, group))
}
