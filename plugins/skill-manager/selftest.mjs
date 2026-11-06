/**
 * Pure synthetic checks for the skill-manager plugin.
 *
 * `pnpm test` imports this file and calls `run(report)`; every check uses
 * in-memory input only — no filesystem, no network, no Harness runtime — so it
 * also runs in CI.
 */
import { parseSkillFile, serializeSkillFile, validateFrontmatter, validateName } from './lib/frontmatter.mjs'
import { validateIndex } from './lib/market-index.mjs'
import { searchIndex, defaultVersionOf } from './lib/search.mjs'
import { compareVersions, isValidRange, isValidVersion, satisfiesRange } from './lib/compat.mjs'

const SKILL_MD = `---
name: code-review
description: Review a diff and propose actionable changes.
whenToUse: When the user asks for a code review.
---

# Code review

1. Read the diff.
2. Report findings.
`

const INDEX = {
  format: 1,
  title: { en: 'Acme Skills', zh: 'Acme 技能库' },
  description: { en: 'Curated skills.' },
  metadata: {
    categories: { coding: { title: { en: 'Coding' } } },
    labels: { review: { title: { en: 'Review' } } },
  },
  skills: [
    {
      name: 'code-review',
      title: { en: 'Code Review', zh: '代码审查' },
      description: { en: 'Review a diff.', zh: '审查代码变更。' },
      author: 'acme',
      metadata: { category: 'coding', labels: ['review'], keywords: ['review'] },
      versions: [
        {
          version: '1.2.0',
          publishTimestamp: 1762300000,
          engines: { dsh: '>=0.2.1-rc.5 <0.3.0' },
          files: [
            {
              path: 'SKILL.md',
              url: 'https://raw.githubusercontent.com/acme/skills/0123456789abcdef0123456789abcdef01234567/skills/code-review/SKILL.md',
              sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
              size: 2314,
            },
            {
              path: 'references/checklist.md',
              url: 'https://raw.githubusercontent.com/acme/skills/0123456789abcdef0123456789abcdef01234567/skills/code-review/references/checklist.md',
              sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
              size: 1024,
            },
          ],
        },
        {
          version: '1.1.0',
          publishTimestamp: 1761000000,
          yanked: true,
          files: [
            {
              path: 'SKILL.md',
              url: 'https://raw.githubusercontent.com/acme/skills/0fedcba9876543210fedcba9876543210fedcba/skills/code-review/SKILL.md',
              sha256: '3f79bb7b435b05321651daefd374cdc681dc06faa65e374e38337b88ca046dea',
              size: 2100,
            },
          ],
        },
      ],
    },
  ],
}

/** A shallow clone so a mutation in one check cannot leak into the next. */
const clone = (value) => JSON.parse(JSON.stringify(value))

/** Expect `validateIndex` to reject a mutation of the base index. */
function rejects(report, label, mutate) {
  const candidate = clone(INDEX)
  mutate(candidate)
  try {
    validateIndex(candidate, 'https://example.com/index.json')
    report(`${label}: expected rejection but the index validated`)
  } catch {
    /* expected */
  }
}

export async function run(report) {
  // --- frontmatter -------------------------------------------------------
  const parsed = parseSkillFile(SKILL_MD)
  if (parsed.ok !== true) report(`frontmatter: expected a valid file, got ${parsed.error}`)
  if (parsed.ok === true && parsed.frontmatter.name !== 'code-review') report('frontmatter: name was not parsed')
  if (parsed.ok === true && parsed.frontmatter.whenToUse !== 'When the user asks for a code review.') {
    report('frontmatter: whenToUse was not parsed')
  }
  if (parsed.ok === true && !parsed.body.startsWith('# Code review')) report('frontmatter: body was not trimmed')

  const roundTrip = parsed.ok === true ? parseSkillFile(serializeSkillFile(parsed.frontmatter, parsed.body)) : null
  if (roundTrip !== null && (roundTrip.ok !== true || roundTrip.frontmatter.name !== 'code-review')) {
    report('frontmatter: serialize/parse round trip lost the name')
  }

  // `parseSkillFile` only parses; the semantic rules live in `validateFrontmatter`.
  // A file is usable only when both accept it, which is what writers/installers do.
  const usable = (text) => {
    const file = parseSkillFile(text)
    if (file.ok !== true) return false
    return validateFrontmatter(file.frontmatter).ok === true
  }
  if (usable(SKILL_MD) !== true) report('frontmatter: rejected the reference SKILL.md')
  for (const [label, text] of [
    ['missing frontmatter', '# no frontmatter\n'],
    ['missing description', '---\nname: ok-name\n---\n\nbody\n'],
    ['bad name', '---\nname: Not_Kebab\ndescription: x\n---\n\nbody\n'],
    ['legacy key', '---\nname: ok-name\ndescription: x\ndisableModelInvocation: true\n---\n\nbody\n'],
    ['empty description', '---\nname: ok-name\ndescription: "   "\n---\n\nbody\n'],
  ]) {
    if (usable(text) === true) report(`frontmatter: accepted ${label}`)
  }
  if (validateName('code-review').ok !== true) report('frontmatter: rejected a valid kebab-case name')
  if (validateName('Code_Review').ok === true) report('frontmatter: accepted an invalid name')
  if (validateFrontmatter({ name: 'ok', description: '' }).ok === true) report('frontmatter: accepted an empty description')

  // --- market index ------------------------------------------------------
  let validated = null
  try {
    validated = validateIndex(clone(INDEX), 'https://example.com/index.json')
  } catch (error) {
    report(`index: rejected the reference index: ${error.message}`)
  }
  if (validated !== null && validated.index.skills.length !== 1) report('index: lost the skill entry')
  if (validated !== null && validated.index.skills[0].versions.length !== 2) report('index: lost a version entry')

  rejects(report, 'index format', (doc) => { doc.format = 2 })
  rejects(report, 'index title', (doc) => { delete doc.title })
  rejects(report, 'index en title', (doc) => { doc.title = { zh: '仅中文' } })
  rejects(report, 'duplicate skill', (doc) => { doc.skills.push(clone(doc.skills[0])) })
  rejects(report, 'duplicate version', (doc) => { doc.skills[0].versions.push(clone(doc.skills[0].versions[0])) })
  rejects(report, 'bad semver', (doc) => { doc.skills[0].versions[0].version = '1.2' })
  rejects(report, 'missing SKILL.md', (doc) => {
    doc.skills[0].versions[0].files = doc.skills[0].versions[0].files.filter((file) => file.path !== 'SKILL.md')
  })
  rejects(report, 'nested SKILL.md', (doc) => { doc.skills[0].versions[0].files[0].path = 'nested/SKILL.md' })
  rejects(report, 'path traversal', (doc) => { doc.skills[0].versions[0].files[1].path = '../escape.md' })
  rejects(report, 'hidden path', (doc) => { doc.skills[0].versions[0].files[1].path = '.hidden/x.md' })
  rejects(report, 'reserved path', (doc) => { doc.skills[0].versions[0].files[1].path = '.disabled/x.md' })
  rejects(report, 'bad sha256', (doc) => { doc.skills[0].versions[0].files[0].sha256 = 'xyz' })
  rejects(report, 'oversize file', (doc) => { doc.skills[0].versions[0].files[0].size = 5 * 1024 * 1024 })
  rejects(report, 'undeclared category', (doc) => { doc.skills[0].metadata.category = 'unknown' })
  rejects(report, 'undeclared label', (doc) => { doc.skills[0].metadata.labels = ['nope'] })
  rejects(report, 'file url query', (doc) => { doc.skills[0].versions[0].files[0].url += '?x=1' })
  rejects(report, 'bad engines', (doc) => { doc.skills[0].versions[0].engines = { dsh: 'workspace:*' } })

  // --- semver / compatibility -------------------------------------------
  if (compareVersions('1.2.0', '1.10.0') >= 0) report('compat: 1.2.0 must sort before 1.10.0')
  if (compareVersions('1.2.0', '1.2.0-rc.1') <= 0) report('compat: a release must sort after its prerelease')
  if (satisfiesRange('0.2.1-rc.5', '>=0.2.1-rc.5 <0.3.0') !== true) report('compat: the current DSH version must satisfy the plugin range')
  if (satisfiesRange('0.3.0', '>=0.2.1-rc.5 <0.3.0') !== false) report('compat: 0.3.0 must fall outside the range')
  if (isValidRange('>=0.2.1-rc.5 <0.3.0') !== true) report('compat: rejected a valid range')
  if (isValidVersion('1.2.3-rc.1') !== true) report('compat: rejected a valid prerelease version')

  // --- default version selection ----------------------------------------
  const skill = validated === null ? null : validated.index.skills[0]
  if (skill !== null) {
    const picked = defaultVersionOf(skill, '0.2.1-rc.5')
    if (picked === null || picked.version !== '1.2.0') report(`search: default version should be 1.2.0, got ${picked === null ? 'null' : picked.version}`)
    const incompatible = defaultVersionOf(skill, '0.3.0')
    if (incompatible !== null) report('search: expected no compatible version for 0.3.0')
  }

  // --- search ------------------------------------------------------------
  if (validated !== null) {
    const byEnglish = searchIndex(validated.index, { text: 'review' })
    if (byEnglish.total < 1) report('search: english text found nothing')
    const byChinese = searchIndex(validated.index, { text: '代码审查' })
    if (byChinese.total < 1) report('search: chinese text found nothing')
    const byCategory = searchIndex(validated.index, { category: 'coding' })
    if (byCategory.total < 1) report('search: category filter found nothing')
    const byLabel = searchIndex(validated.index, { labels: ['review'] })
    if (byLabel.total < 1) report('search: label filter found nothing')
    const paged = searchIndex(validated.index, { offset: 0, limit: 1 })
    if (paged.total !== 1 || paged.skills.length !== 1) report('search: pagination returned the wrong page')
    const missing = searchIndex(validated.index, { text: 'definitely-not-present' })
    if (missing.total !== 0) report('search: unknown text matched something')
  }
}
