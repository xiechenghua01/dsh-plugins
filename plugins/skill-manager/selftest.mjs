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
import { mergeLocalizedPair, normalizeIconPath, skillDisplayMeta } from './lib/scan.mjs'
import { readdirSync, readFileSync } from 'node:fs'
import {
  isCanceledMarketIndexError,
  marketIndexCopyOf,
  marketIndexFromCache,
  planMarketIndexRead,
  shouldRetryCanceledMarketIndexRead,
} from './index.js'

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
  // Descriptions are model-facing trigger text; there is no product length cap.
  if (validateFrontmatter({ name: 'ok', description: 'x'.repeat(5000) }).ok !== true) {
    report('frontmatter: rejected a long description')
  }

  // --- market index ------------------------------------------------------
  let validated = null
  try {
    validated = validateIndex(clone(INDEX), 'https://example.com/index.json')
  } catch (error) {
    report(`index: rejected the reference index: ${error.message}`)
  }
  if (validated !== null && validated.index.skills.length !== 1) report('index: lost the skill entry')
  if (validated !== null && validated.index.skills[0].versions.length !== 2) report('index: lost a version entry')

  // Market descriptions have no length cap: a publisher may reuse the long
  // model-facing trigger description instead of writing a short summary.
  const longDescription = clone(INDEX)
  longDescription.skills[0].description = { en: 'x'.repeat(5000), zh: '长'.repeat(5000) }
  try {
    validateIndex(longDescription, 'https://example.com/index.json')
  } catch (error) {
    report(`index: rejected a long description: ${error.message}`)
  }

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

  // --- display metadata (SKILL.md frontmatter) ----------------------------
  const meta = skillDisplayMeta({
    display_name_zh: '  提交改动  ',
    display_name_en: 'Git Commit',
    description_zh: '中文描述',
    description_en: 'English description',
    icon: 'assets/icon.svg',
  })
  if (meta.displayNameByLocale?.zh !== '提交改动') report('display: zh name was not trimmed/preserved')
  if (meta.displayNameByLocale?.en !== 'Git Commit') report('display: en name missing')
  if (meta.descriptionByLocale?.zh !== '中文描述') report('display: zh description missing')
  if (meta.iconPath !== 'assets/icon.svg') report('display: icon path missing')

  const dropped = skillDisplayMeta({
    display_name_zh: '   ',
    display_name_en: 'x'.repeat(121),
    description_en: 42,
    icon: '../escape.svg',
  })
  if (dropped.displayNameByLocale !== undefined) report('display: blank/oversized name was kept')
  if (dropped.descriptionByLocale !== undefined) report('display: non-string description was kept')
  if (dropped.iconPath !== undefined) report('display: escaping icon path was kept')

  if (normalizeIconPath('/abs.svg') !== '') report('display: absolute icon path accepted')
  if (normalizeIconPath('a\\b.svg') !== '') report('display: windows icon path accepted')
  if (normalizeIconPath('assets/ok.svg') !== 'assets/ok.svg') report('display: valid icon path rejected')

  // local wins, index fills only the missing language
  const merged = mergeLocalizedPair({ zh: '本地中文' }, { zh: '索引中文', en: 'Index EN' })
  if (merged?.zh !== '本地中文') report('display: local zh did not win')
  if (merged?.en !== 'Index EN') report('display: index en was not used as fallback')
  const legacy = mergeLocalizedPair(undefined, 'Legacy copy')
  if (legacy?.en !== 'Legacy copy') report('display: legacy string was not mapped to en')
  if (mergeLocalizedPair(undefined, undefined) !== null) report('display: empty pair should be null')

  // --- installed-view market metadata policy (regression ①) ----------------
  // `check-updates` drops the index fetch cache and reloads `/installed` in the same
  // breath. The view must keep display names / descriptions / icons through that window,
  // so a wait budget may only end the *wait* — never the fallback or the source's health.
  const REFRESH_BUDGET = planMarketIndexRead({ refresh: true })
  if (REFRESH_BUDGET.action !== 'read') report('policy: an explicit refresh must always read')
  if (REFRESH_BUDGET.budgetMs < 1500) report('policy: an explicit refresh needs a real budget')

  // Nothing read yet: waiting beats rendering a list without market metadata.
  const cold = planMarketIndexRead({})
  if (cold.action !== 'read') report('policy: a cold source must read')
  if (cold.budgetMs <= 150) report('policy: a cold source needs more than the old 150 ms budget')
  if (cold.budgetMs >= REFRESH_BUDGET.budgetMs) report('policy: an explicit refresh must wait longer than a cold read')

  // A previous index covers the view: a short wait still prefers fresh data.
  const warm = planMarketIndexRead({ hasPrevious: true })
  if (warm.action !== 'read') report('policy: a warm source should still try for fresh data')
  if (warm.budgetMs <= 0 || warm.budgetMs > cold.budgetMs) report('policy: a warm read must be short but non-zero')
  if (warm.budgetMs === cold.budgetMs) report('policy: a warm read should be cheaper than a cold one')

  // Backing off with a previous index: reuse it, do not wait on the network at all.
  const stale = planMarketIndexRead({ hasPrevious: true, failedAt: 1000, now: 1000 + 5_000 })
  if (stale.action !== 'stale') report('policy: a backing-off source must serve its previous index')
  if (stale.budgetMs !== 0) report('policy: reusing a previous index must not spend a budget')
  // A refresh overrides the back-off: the user asked for new data explicitly.
  if (planMarketIndexRead({ hasPrevious: true, refresh: true, failedAt: 1000, now: 1000 + 5_000 }).action !== 'read') {
    report('policy: refresh must override the back-off')
  }
  // An aged-out failure retries again.
  if (planMarketIndexRead({ hasPrevious: true, failedAt: 1000, now: 1000 + 10 * 60_000 }).action !== 'read') {
    report('policy: an expired back-off must retry')
  }
  // Cold + backing off has no copy to serve, so it must still read: `stale` there would
  // return `null` and the list would render every skill without its market icon until the
  // back-off expires. This is the regression `检查更新后 iconUrl 全丢` reproduced when a
  // source's only `/installed` read failed and `check-updates` then cleared its cache.
  const coldStale = planMarketIndexRead({ failedAt: 1000, now: 1000 + 5_000 })
  if (coldStale.action !== 'read') {
    report('policy: a failed cold source must still read instead of skipping to nothing')
  }
  if (coldStale.budgetMs !== cold.budgetMs) {
    report('policy: a failed cold source must use the same cold budget')
  }
  // The same applies with a refresh: an explicit refresh always reads.
  if (planMarketIndexRead({ refresh: true, failedAt: 1000, now: 1000 + 5_000 }).action !== 'read') {
    report('policy: a refresh must read even for a failing cold source')
  }

  // The fallback entry itself: it carries the source id, URL and skills the scanner reads.
  const cachedSkills = [{ name: 'code-review' }]
  const fallback = marketIndexFromCache({ url: 'https://example.com/index.json', skills: cachedSkills }, {
    sourceId: 'src-1',
    url: 'https://example.com/index.json',
  })
  if (fallback?.sourceId !== 'src-1' || fallback?.url !== 'https://example.com/index.json') {
    report('policy: the previous index lost its source identity')
  }
  if (fallback?.skills !== cachedSkills) report('policy: the previous index lost its skills')
  // A source whose URL changed must not inherit another index's metadata.
  if (marketIndexFromCache({ url: 'https://old.example.com/index.json', skills: cachedSkills }, {
    sourceId: 'src-1',
    url: 'https://new.example.com/index.json',
  }) !== null) report('policy: a previous index leaked across a changed source URL')
  for (const [label, input, target] of [
    ['missing entry', undefined, { sourceId: 'src-1', url: 'https://example.com/index.json' }],
    ['no skills', { url: 'https://example.com/index.json', skills: 'nope' }, { sourceId: 'src-1', url: 'https://example.com/index.json' }],
    ['no source id', { url: 'https://example.com/index.json', skills: cachedSkills }, { url: 'https://example.com/index.json' }],
    ['no url', { url: 'https://example.com/index.json', skills: cachedSkills }, { sourceId: 'src-1' }],
  ]) {
    if (marketIndexFromCache(input, target) !== null) report(`policy: accepted an unusable fallback (${label})`)
  }

  // Cancellations are not source failures. `check-updates` aborts the in-flight index
  // fetches when it drops the cache, and that abort used to start a 60 s back-off and so
  // hide the metadata right after every check.
  if (isCanceledMarketIndexError({ code: 'E_CANCELED' }) !== true) report('policy: a canceled fetch must not count as a failure')
  if (isCanceledMarketIndexError({ code: 'E_SOURCE_UNREACHABLE' }) !== false) report('policy: a network failure must count as a failure')
  if (isCanceledMarketIndexError({ code: 'E_INDEX_INVALID' }) !== false) report('policy: an invalid index must count as a failure')
  for (const quiet of [null, undefined, 'boom', 42]) {
    if (isCanceledMarketIndexError(quiet) !== false) report('policy: a non-error must not count as a cancellation')
  }

  // A canceled read with nothing to fall back on gets exactly one retry. `check-updates`
  // aborts in-flight index reads a moment before the client reloads `/installed`, and
  // giving up there cost the list every icon; the fallback already covers the view when a
  // previous index exists, so retrying then would only spend a second round trip.
  if (shouldRetryCanceledMarketIndexRead({ error: { code: 'E_CANCELED' } }) !== true) {
    report('policy: a canceled read without a previous index must retry')
  }
  if (shouldRetryCanceledMarketIndexRead({ error: { code: 'E_CANCELED' }, hasPrevious: true }) !== false) {
    report('policy: a canceled read with a previous index must serve that copy instead of retrying')
  }
  for (const [label, input] of [
    ['unreachable', { error: { code: 'E_SOURCE_UNREACHABLE' } }],
    ['invalid index', { error: { code: 'E_INDEX_INVALID' } }],
    ['no error', {}],
    ['a string error', { error: 'boom' }],
    ['null error', { error: null }],
  ]) {
    if (shouldRetryCanceledMarketIndexRead(input) !== false) {
      report(`policy: only a cancellation may retry (${label})`)
    }
  }

  // --- `check-updates` prewarms the fallback copy (regression ①-c) ----------
  // `POST /check-updates` invalidates the fetch cache and aborts in-flight reads right
  // before the client reloads `/installed`. A warm process survives that window because
  // `lastGoodIndexes` already holds a copy — but a freshly started Host holds nothing, so
  // the reload had to start its own read, blew the cold budget and returned a list without
  // icons. The route therefore takes a copy of every healthy source *before* invalidating,
  // and starts that read alongside the check so the route does not get slower.
  const copySkills = [{ name: 'code-review', icon: 'icons/code-review.svg' }]
  const copy = marketIndexCopyOf({ skills: copySkills }, { sourceId: 'src-1', url: 'https://example.com/index.json' })
  if (copy === null) report('copy: a read index must produce a fallback copy')
  if (copy?.url !== 'https://example.com/index.json') report('copy: the copy lost the URL it was read from')
  if (copy?.skills !== copySkills) report('copy: the copy lost the skills it serves')
  // The copy must be usable exactly the way `readMarketIndexes` reads it back.
  const copyBack = marketIndexFromCache(copy, { sourceId: 'src-1', url: 'https://example.com/index.json' })
  if (copyBack === null) report('copy: a fresh copy must be a usable fallback')
  if (copyBack?.skills !== copySkills) report('copy: the round trip lost the skills')
  // An unusable read must produce no copy at all, so the caller keeps the one it had.
  for (const [label, index, target] of [
    ['no skills', {}, { sourceId: 'src-1', url: 'https://example.com/index.json' }],
    ['skills not an array', { skills: 'nope' }, { sourceId: 'src-1', url: 'https://example.com/index.json' }],
    ['null index', null, { sourceId: 'src-1', url: 'https://example.com/index.json' }],
    ['no source id', { skills: copySkills }, { url: 'https://example.com/index.json' }],
    ['no url', { skills: copySkills }, { sourceId: 'src-1' }],
  ]) {
    if (marketIndexCopyOf(index, target) !== null) report(`copy: accepted an unusable copy (${label})`)
  }
  // A copy must never leak across a changed source URL.
  const movedCopy = marketIndexCopyOf({ skills: copySkills }, { sourceId: 'src-1', url: 'https://new.example.com/index.json' })
  if (marketIndexFromCache(movedCopy, { sourceId: 'src-1', url: 'https://old.example.com/index.json' }) !== null) {
    report('copy: a copy leaked across a changed source URL')
  }

  // --- card structure: the two pages must not fork (regression ②) ----------
  // The skills page (`11-skills-actions.js`) and the market page
  // (`21-market-cards.js`) render the same card. Historically each new market
  // feature was implemented by copying the skills-page code and editing the
  // copy, so the two drifted apart four times: the icon box, the status dot,
  // the title row (a market-only version badge squeezed a Chinese name into an
  // ellipsis), and the display-name getter. `00-5-helpers.js` now owns every
  // shared card element; these checks fail when the two card renderers stop
  // going through those helpers.
  //
  // Two layers, both matching construction sites only, never a whole body:
  //   ① the shared card renderers must call the helpers;
  //   ② no fragment may define a second copy of a shared helper.
  checkCardStructure(report)
}

/* ================================================================
 * Card structure guard
 *
 * The two card pages are the only place a shared card element could be
 * re-implemented, so the checks below read *inside* `renderSkillCard` and
 * `renderMarketCard`. A class name that appears anywhere else (a skeleton, a
 * source-block header, a stylesheet) is out of scope on purpose: those are
 * different elements that happen to reuse a class, and matching them would
 * turn this guard into a brittle whole-file string search.
 * ================================================================ */

/** The only fragment allowed to own a shared card element. */
const HELPERS_FRAGMENT = '00-5-helpers.js'

/**
 * A shared card renderer: the page fragment, the function that builds that
 * page's card, and the helpers it must call. Re-implementing a shared element
 * inside one of these functions is exactly the fork this guard forbids.
 */
const CARD_RENDERERS = [
  {
    file: '11-skills-actions.js',
    function: 'renderSkillCard',
    page: 'skills page',
    displayNameGetter: 'smSkillDisplayName',
  },
  {
    file: '21-market-cards.js',
    function: 'renderMarketCard',
    page: 'market page',
    displayNameGetter: 'smSkillDisplayName',
  },
]

/** Shared card elements: class name -> the helper call that must replace it. */
const SHARED_CARD_ELEMENTS = [
  { className: 'sm-card-title-row', helpers: ['renderCardTitleRow()', 'renderCardMain()'], what: 'the card title row' },
  { className: 'sm-card-icon', helpers: ['renderSkillIconBox()'], what: 'the card icon box' },
  { className: 'sm-card-main', helpers: ['renderCardMain()'], what: 'the card body column' },
  { className: 'sm-card-desc', helpers: ['renderCardMain()'], what: 'the card description line' },
  { className: 'sm-tagbar', helpers: ['renderCardMetaRow()', 'renderCardMain()'], what: 'the card badge row' },
]

/** Status dots: the tone classes are passed in, the shell must come from the helper. */
const STATUS_DOT = {
  classPattern: /^sm-dot(?:$|\s)/u,
  helpers: ["renderStatusDot(cx('sm-dot …'), tip)", "renderSkillStatusDot(skill)"],
  what: 'a status dot',
}

/**
 * The shared helpers and the fragment that must define them. A second
 * definition anywhere is a silent fork: the pages would call whichever copy
 * the build order puts last.
 */
const SHARED_HELPERS = [
  'renderStatusDot',
  'renderSkillStatusDot',
  'renderSkillIconBox',
  'renderCardTitleRow',
  'renderCardMetaRow',
  'renderCardMain',
]

/** `selftest.mjs` sits at the plugin root, next to `src/`. */
function fragmentsDir() {
  return new URL('./src/client/', import.meta.url)
}

/** Read every `src/client/*.js` fragment in build order; `node:fs` only. */
function readFragments() {
  return readdirSync(fragmentsDir())
    .filter((name) => name.endsWith('.js'))
    .sort()
    .map((name) => ({ name, text: readFileSync(new URL(name, fragmentsDir()), 'utf8') }))
}

/**
 * Blank comments and string bodies while keeping offsets and newlines, so an
 * offset into the mask is still that offset in the source. Template literals
 * keep their `${...}` contents: an interpolation is code.
 */
function codeMask(text) {
  const mask = []
  let index = 0
  let inBlockComment = false
  const blank = (char) => (char === '\n' ? '\n' : ' ')
  while (index < text.length) {
    if (inBlockComment) {
      if (text.startsWith('*/', index)) {
        mask.push(' ', ' ')
        index += 2
        inBlockComment = false
        continue
      }
      mask.push(blank(text[index]))
      index += 1
      continue
    }
    if (text.startsWith('/*', index)) {
      mask.push(' ', ' ')
      index += 2
      inBlockComment = true
      continue
    }
    if (text.startsWith('//', index)) {
      while (index < text.length && text[index] !== '\n') {
        mask.push(' ')
        index += 1
      }
      continue
    }
    const char = text[index]
    if (char === "'" || char === '"' || char === '`') {
      const isTemplate = char === '`'
      mask.push(char)
      index += 1
      while (index < text.length) {
        if (text[index] === '\\') {
          mask.push(' ', text[index + 1] === '\n' ? '\n' : ' ')
          index += 2
          continue
        }
        if (isTemplate && text.startsWith('${', index)) {
          let cursor = index + 2
          let level = 1
          mask.push('$', '{')
          while (cursor < text.length && level > 0) {
            if (text[cursor] === '{') level += 1
            else if (text[cursor] === '}') level -= 1
            mask.push(level > 0 ? text[cursor] : '}')
            cursor += 1
          }
          index = cursor
          continue
        }
        if (text[index] === char) {
          mask.push(char)
          index += 1
          break
        }
        mask.push(blank(text[index]))
        index += 1
      }
      continue
    }
    mask.push(char)
    index += 1
  }
  return mask.join('')
}

/**
 * The `{ start, end }` offsets of `function <name>(...) { ... }` in `text`, or
 * null. Braces are counted on the code mask, so brace characters inside
 * comments and strings cannot end the body early.
 */
function functionRange(text, name) {
  const mask = codeMask(text)
  const match = new RegExp(`function\\s+${name}\\s*\\(`, 'u').exec(mask)
  if (match === null) return null
  let index = match.index + match[0].length - 1
  let depth = 0
  for (; index < mask.length; index += 1) {
    const char = mask[index]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return { start: match.index, end: index }
    }
  }
  return null
}

/** 1-based line number of an offset. */
function lineAt(text, offset) {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (text[index] === '\n') line += 1
  }
  return line
}

/** The source line containing `offset`, trimmed, for the report message. */
function sourceLine(text, offset) {
  const line = lineAt(text, offset)
  const start = text.lastIndexOf('\n', offset) + 1
  const end = text.indexOf('\n', offset)
  return `L${line}: ${text.slice(start, end === -1 ? text.length : end).trim()}`
}

/** Does `text` call `name(`? Word-bounded, so a longer name never matches. */
function callsHelper(text, name) {
  return new RegExp(`\\b${name}\\s*\\(`, 'u').test(text)
}

/**
 * Report every `className` construction inside `body` that lists `className`.
 * Matches `className: 'x y'` and `className: cx('x y', …)` — the two shapes the
 * fragments use — and returns the offset of the match for reporting.
 *
 * Scanned on the code mask, so a comment or a doc line that merely *mentions*
 * `className: 'sm-card-tile-row'` is not a construction site and never fails
 * the check. Offsets survive masking, so the reported line stays exact.
 */
function findClassConstruction(body, className) {
  const mask = codeMask(body)
  const pattern = new RegExp(`className\\s*:\\s*(?:cx\\s*\\(\\s*)?'([^'\\n]*)'`, 'gu')
  let match
  while ((match = pattern.exec(body)) !== null) {
    /* Ignore a head that the mask blanked out: that is prose, not markup. */
    if (mask.slice(match.index, match.index + match[0].length).trim() === '') continue
    const names = match[1].split(/\s+/u).filter(Boolean)
    if (names.includes(className)) return match.index + match[0].indexOf("'") + 1
  }
  return -1
}

/**
 * The card structure guard. Both layers read the two card renderers; nothing
 * outside them is judged, so a skeleton or a source-block header that reuses a
 * class name cannot trip the check.
 */
function checkCardStructure(report) {
  let fragments
  try {
    fragments = readFragments()
  } catch (error) {
    report(`structure: cannot read src/client fragments: ${error.message}`)
    return
  }
  const byName = new Map(fragments.map((fragment) => [fragment.name, fragment]))
  const helpers = byName.get(HELPERS_FRAGMENT)
  if (helpers === undefined) {
    report(`structure: src/client/${HELPERS_FRAGMENT} is missing — it owns every shared card element`)
    return
  }

  /* ① Each shared helper is defined once, in the helper fragment. */
  for (const helper of SHARED_HELPERS) {
    const definition = new RegExp(`function\\s+${helper}\\s*\\(`, 'gu')
    for (const fragment of fragments) {
      const count = (fragment.text.match(definition) || []).length
      if (fragment.name === HELPERS_FRAGMENT) {
        if (count === 0) {
          report(`structure: ${HELPERS_FRAGMENT} no longer defines ${helper}() — both card pages call it, so restore the shared helper`)
        }
      } else if (count > 0) {
        report(`structure: ${fragment.name} defines ${helper}() a second time — ${HELPERS_FRAGMENT} owns it; call the shared helper instead of copying it (a duplicate silently wins or loses by build order)`)
      }
    }
  }

  /* ② The helper fragment must build the card body through its own parts. */
  if (/function\s+renderCardMain\s*\(/u.test(helpers.text)) {
    for (const part of ['renderCardTitleRow', 'renderCardMetaRow']) {
      if (!callsHelper(helpers.text, part)) {
        report(`structure: renderCardMain() in ${HELPERS_FRAGMENT} no longer calls ${part}() — the card body would fork inside the helper`)
      }
    }
  }

  /* ③ Each card renderer calls the helpers and builds no shared element itself. */
  for (const renderer of CARD_RENDERERS) {
    const fragment = byName.get(renderer.file)
    if (fragment === undefined) {
      report(`structure: src/client/${renderer.file} is missing — the ${renderer.page} card renderer is the other half of the pair this guard keeps in sync`)
      continue
    }
    const range = functionRange(fragment.text, renderer.function)
    if (range === null) {
      report(`structure: ${renderer.file} no longer defines ${renderer.function}() — this guard reads that function to prove the ${renderer.page} card still uses the shared helpers`)
      continue
    }
    const body = fragment.text.slice(range.start, range.end)

    /* The card body itself must come from the shared helper. */
    if (!callsHelper(body, 'renderCardMain')) {
      report(`structure: ${renderer.file}:${renderer.function}() does not call renderCardMain() — the ${renderer.page} card body must come from ${HELPERS_FRAGMENT} instead of markup written in this page`)
    }

    /* No shared element may be hand-built in the card body. */
    for (const element of SHARED_CARD_ELEMENTS) {
      const offset = findClassConstruction(body, element.className)
      if (offset === -1) continue
      const site = range.start + offset
      report(`structure: ${renderer.file}:${lineAt(fragment.text, site)} builds '${element.className}' in ${renderer.function}() — that is ${element.what}; call ${element.helpers.join(' or ')} from ${HELPERS_FRAGMENT} instead (${sourceLine(fragment.text, site)})`)
    }

    /* A status dot carries role/aria-label/title/data-tip; only the helper may shape it. */
    const dotMask = codeMask(body)
    const dotPattern = /className\s*:\s*(?:cx\s*\(\s*)?'([^'\n]*)'/gu
    let dotMatch
    while ((dotMatch = dotPattern.exec(body)) !== null) {
      /* Prose that mentions the class is not a construction site. */
      if (dotMask.slice(dotMatch.index, dotMatch.index + dotMatch[0].length).trim() === '') continue
      const names = dotMatch[1].split(/\s+/u).filter(Boolean)
      if (!names.some((name) => STATUS_DOT.classPattern.test(name))) continue
      const site = range.start + dotMatch.index
      report(`structure: ${renderer.file}:${lineAt(fragment.text, site)} builds ${STATUS_DOT.what} in ${renderer.function}() — call ${STATUS_DOT.helpers.join(' or ')} from ${HELPERS_FRAGMENT}, which owns role/aria-label/title/data-tip (${sourceLine(fragment.text, site)})`)
      break
    }

    /* The display name has one getter. Reading the technical `.name` field is
     * legitimate — both pages show it as a small mono label — so the check is
     * that the *display* name comes from the shared getter, not that the raw
     * field is never touched. `smSkillDisplayName` owns the locale fallback. */
    if (!callsHelper(body, renderer.displayNameGetter)) {
      report(`structure: ${renderer.file}:${renderer.function}() does not call ${renderer.displayNameGetter}() — the ${renderer.page} must take the display name from the shared getter in ${HELPERS_FRAGMENT}, not from a local copy`)
    }
  }
}
