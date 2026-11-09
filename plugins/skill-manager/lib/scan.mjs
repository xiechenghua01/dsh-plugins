/**
 * Installed-skill scanner.
 *
 * It scans the seven contract locations (`LocationView[]`), parses every
 * `SKILL.md` / `<name>.md` candidate, derives `SkillView[]`, raises the
 * diagnostics the provider itself keeps silent about (`IssueView[]`), and
 * resolves per-preset visibility (`PresetView[]`).
 *
 * Provider facts mirrored here (research/skill-subsystem.md §3):
 *   - roots and ranks: project `.dsh` 100, project `.agents` 200, custom 300,
 *     user `.dsh` 400, user `.agents` 500, bundled 600;
 *   - only one level is scanned: `<root>/<name>/SKILL.md` or `<root>/<name>.md`;
 *   - hidden entries (including `.disabled`) are not discovered by the provider;
 *   - broken links / bad frontmatter / invalid names are dropped silently;
 *   - `.disabled/` is this plugin's own enable/disable convention.
 *
 * The scan is cached for one second per cwd + home signature. Market metadata
 * is attached on every call from the caller-supplied install records.
 */
import { createHash } from 'node:crypto'
import { lstat, readdir, readFile, realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { ApiError } from './http.mjs'
import { parseSkillFile, validateFrontmatter } from './frontmatter.mjs'

const CACHE_MS = 1000
const MAX_SKILL_BYTES = 1024 * 1024
const OVERSIZE_BYTES = 256 * 1024
const MAX_RESOURCE_FILES = 200
const LOCAL_SOURCES = new Set(['project-dsh', 'project-agents', 'custom', 'user-dsh', 'user-agents'])
const MOUNTED_PRESETS = new Set(['cordis', 'standard', 'ptc'])
const STATIC_PRESETS = [
  { id: 'cordis', mounted: true },
  { id: 'standard', mounted: true },
  { id: 'ptc', mounted: true },
  { id: 'minimal', mounted: false },
]

const LOCATION_DEFS = [
  { id: 'project-dsh', label: '项目技能', rank: 100, layer: 'preset', writable: true, order: 0 },
  { id: 'project-agents', label: '项目共享', rank: 200, layer: 'preset', writable: true, order: 1 },
  { id: 'custom', label: '自定义目录', rank: 300, layer: 'preset', writable: true, order: 2 },
  { id: 'preset', label: '预设内置', rank: 300, layer: 'preset', writable: false, order: 3 },
  { id: 'user-dsh', label: '用户技能', rank: 400, layer: 'preset', writable: true, order: 4 },
  { id: 'user-agents', label: '用户共享', rank: 500, layer: 'preset', writable: true, order: 5 },
  { id: 'bundled', label: '插件内置', rank: 600, layer: 'global', writable: false, order: 6 },
]

/**
 * Contract §3.1: the Host owns the category mapping, the Client only consumes it.
 * `custom` is split by writability: a writable custom root is "mine", a read-only one
 * (usually a package-mounted root) is "system".
 */
const CATEGORY_BY_LOCATION = Object.freeze({
  'project-dsh': 'project',
  'project-agents': 'project',
  'preset': 'system',
  'user-dsh': 'mine',
  'user-agents': 'shared',
  'bundled': 'system',
})

function categoryOf(location, writable) {
  if (location === 'custom') return writable === true ? 'mine' : 'system'
  return CATEGORY_BY_LOCATION[location] ?? (writable === true ? 'mine' : 'system')
}

let cache = { key: '', at: 0, value: null }

function message(error) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error')
}

function isMissing(error) {
  return error !== null
    && typeof error === 'object'
    && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
}

function hashId(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 16)
}

function pad2(value) {
  return value < 10 ? `0${value}` : String(value)
}

function toPosix(path) {
  return path.split(sep).join('/')
}

/** `$DSH_HOME` or `~/.dsh`. */
export function dshHome() {
  const configured = typeof process.env.DSH_HOME === 'string' ? process.env.DSH_HOME.trim() : ''
  return configured === '' ? join(homedir(), '.dsh') : resolve(configured)
}

/** `$DSH_AGENTS_HOME` or `~/.agents`. */
export function agentsHome() {
  const configured = typeof process.env.DSH_AGENTS_HOME === 'string' ? process.env.DSH_AGENTS_HOME.trim() : ''
  return configured === '' ? join(homedir(), '.agents') : resolve(configured)
}

/** Display path with the home directory abbreviated to `~`. */
export function abbreviate(path) {
  if (typeof path !== 'string' || path === '') return ''
  const home = homedir()
  if (path === home) return '~'
  if (path.startsWith(`${home}${sep}`)) return `~${path.slice(home.length)}`
  return path
}

/** Human relative time for a Unix-seconds mtime. */
function relativeLabel(seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return '未知'
  const diff = Math.max(0, Date.now() / 1000 - value)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86_400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 30 * 86_400) return `${Math.floor(diff / 86_400)} 天前`
  const date = new Date(value * 1000)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** The default working directory of the composition, or `process.cwd()`. */
export function defaultCwd(ctx) {
  try {
    const workingDirectory = ctx?.get?.('workingDirectory')
    if (workingDirectory !== null && workingDirectory !== undefined) {
      const value = typeof workingDirectory.defaultDirectory === 'function'
        ? workingDirectory.defaultDirectory()
        : workingDirectory.defaultDirectory
      if (typeof value === 'string' && value !== '') return resolve(value)
    }
  } catch {
    /* fall through to process.cwd() */
  }
  return process.cwd()
}

/** Resolve a request `cwd` (absolute, or relative to the composition default). */
export async function resolveCwd(ctx, requested) {
  const raw = typeof requested === 'string' ? requested.trim() : ''
  if (raw === '') return defaultCwd(ctx)
  return isAbsolute(raw) ? resolve(raw) : resolve(defaultCwd(ctx), raw)
}

/** The nearest ancestor of `cwd` containing `.git`; `cwd` itself when none. */
export async function projectRootOf(cwd) {
  const start = resolve(cwd)
  let current = start
  for (;;) {
    try {
      const info = await stat(join(current, '.git'))
      if (info.isDirectory() || info.isFile()) return current
    } catch {
      /* keep walking up */
    }
    const parent = dirname(current)
    if (parent === current) return start
    current = parent
  }
}

/** Whether `path` is a strict descendant of `root`. */
export function isPathInside(root, path) {
  const rel = relative(resolve(root), resolve(path))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

function inferRootFromSkillPath(path) {
  if (typeof path !== 'string' || path === '') return null
  const base = basename(path).toLowerCase()
  return base === 'skill.md' ? dirname(dirname(path)) : dirname(path)
}

function isPackagePath(path) {
  if (typeof path !== 'string') return false
  return path.includes(`${sep}node_modules${sep}`) || path.includes('.asar')
}

function isLocalSkillEntry(entry) {
  if (entry === null || typeof entry !== 'object') return false
  return LOCAL_SOURCES.has(entry.source) || entry.provider === 'filesystem'
}

function samePath(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left === '' || right === '') return false
  return resolve(left) === resolve(right)
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

function makeIssue(kind, severity, path, name, text, fix) {
  const display = abbreviate(path)
  const issue = {
    id: hashId(`${kind}\0${display}\0${text}`),
    severity,
    kind,
    ...(typeof name === 'string' && name !== '' ? { name } : {}),
    path: display,
    message: text,
  }
  if (fix !== undefined) issue.fix = fix
  return issue
}

// ---------------------------------------------------------------------------
// Preset / global snapshots
// ---------------------------------------------------------------------------

async function disposeLease(lease) {
  if (lease === null || lease === undefined) return
  try {
    if (typeof lease[Symbol.asyncDispose] === 'function') {
      await lease[Symbol.asyncDispose]()
      return
    }
    if (typeof lease.dispose === 'function') {
      await lease.dispose()
      return
    }
    if (typeof lease.release === 'function') {
      await lease.release()
    }
  } catch {
    /* a failed release must not break the scan */
  }
}

async function globalSnapshot(ctx, cwd) {
  const skills = ctx?.get?.('skills')
  if (skills === null || skills === undefined || typeof skills.snapshot !== 'function') {
    return { available: false, skills: [], complete: false }
  }
  try {
    const snapshot = await skills.snapshot({ cwd })
    return {
      available: true,
      skills: Array.isArray(snapshot?.skills) ? snapshot.skills : [],
      complete: snapshot?.complete !== false,
    }
  } catch {
    return { available: false, skills: [], complete: false }
  }
}

async function presetSnapshots(ctx, cwd) {
  const presets = ctx?.get?.('agentPresets')
  const skills = ctx?.get?.('skills')
  if (
    presets === null || presets === undefined
    || typeof presets.list !== 'function'
    || typeof presets.acquireScope !== 'function'
    || skills === null || skills === undefined
    || typeof skills.snapshot !== 'function'
  ) {
    return { available: false, list: [] }
  }

  let listed
  try {
    listed = await presets.list()
  } catch {
    return { available: false, list: [] }
  }
  if (!Array.isArray(listed) || listed.length === 0) return { available: false, list: [] }

  const result = []
  for (const preset of listed) {
    const id = typeof preset === 'string'
      ? preset
      : (preset?.id ?? preset?.name ?? preset?.key)
    if (typeof id !== 'string' || id === '') continue
    let lease = null
    try {
      lease = await presets.acquireScope(id)
      const scope = lease?.key ?? lease
      const snapshot = await skills.snapshot({ cwd, scope })
      result.push({
        id,
        skills: Array.isArray(snapshot?.skills) ? snapshot.skills : [],
        complete: snapshot?.complete !== false,
        error: null,
      })
    } catch (error) {
      result.push({ id, skills: [], complete: false, error: message(error) })
    } finally {
      await disposeLease(lease)
    }
  }
  return { available: result.length > 0, list: result }
}

function inferCustomRoots(presetInfo) {
  const custom = new Set()
  const preset = new Set()
  for (const entry of presetInfo.list) {
    for (const skill of entry.skills) {
      if (skill?.source !== 'custom') continue
      const root = inferRootFromSkillPath(skill.path)
      if (root === null) continue
      if (isPackagePath(root)) preset.add(root)
      else custom.add(root)
    }
  }
  return { custom: [...custom], preset: [...preset] }
}

// ---------------------------------------------------------------------------
// Root discovery and file scanning
// ---------------------------------------------------------------------------

function buildRootSpecs(projectRoot, inferred) {
  const specs = [
    {
      id: 'project-dsh',
      label: '项目技能',
      path: join(projectRoot, '.dsh', 'skills'),
      rank: 100,
      layer: 'preset',
      writable: true,
      sourceType: 'filesystem',
      order: 0,
    },
    {
      id: 'project-agents',
      label: '项目共享',
      path: join(projectRoot, '.agents', 'skills'),
      rank: 200,
      layer: 'preset',
      writable: true,
      sourceType: 'filesystem',
      order: 1,
    },
  ]
  let order = 2
  for (const path of inferred.custom) {
    specs.push({
      id: 'custom',
      label: '自定义目录',
      path,
      rank: 300,
      layer: 'preset',
      writable: true,
      sourceType: 'filesystem',
      order: order++,
    })
  }
  for (const path of inferred.preset) {
    specs.push({
      id: 'preset',
      label: '预设内置',
      path,
      rank: 300,
      layer: 'preset',
      writable: false,
      sourceType: 'preset',
      order: order++,
    })
  }
  specs.push({
    id: 'user-dsh',
    label: '用户技能',
    path: join(dshHome(), 'skills'),
    rank: 400,
    layer: 'preset',
    writable: true,
    sourceType: 'filesystem',
    order: order++,
  })
  specs.push({
    id: 'user-agents',
    label: '用户共享',
    path: join(agentsHome(), 'skills'),
    rank: 500,
    layer: 'preset',
    writable: true,
    sourceType: 'filesystem',
    order: order++,
  })
  for (const spec of specs) spec.display = abbreviate(spec.path)
  return specs
}

function makeSkill(input) {
  return {
    id: hashId(`${input.spec.id}\0${input.real}`),
    name: input.name,
    description: input.description,
    ...(typeof input.whenToUse === 'string' && input.whenToUse !== '' ? { whenToUse: input.whenToUse } : {}),
    category: categoryOf(input.spec.id, input.spec.writable === true),
    location: input.spec.id,
    rootPath: input.spec.display,
    path: input.real,
    provider: 'filesystem',
    sourceType: input.spec.sourceType,
    rank: input.spec.rank,
    writable: input.spec.writable,
    status: input.status,
    visiblePresets: [],
    invocation: input.invocation,
    sizeBytes: input.sizeBytes,
    mtime: input.mtime,
    updatedAtLabel: relativeLabel(input.mtime),
    _baseName: input.baseName,
    _layout: input.layout,
    _valid: input.valid,
    _order: input.spec.order,
    // Registry layer, not the display layer: every direct root scan is preset-layer,
    // while skills contributed by the unscoped (global) snapshot are global-layer.
    _layer: input.spec.layer === 'global' ? 'global' : 'preset',
    _root: input.spec,
  }
}

async function readSkillFile(spec, file, baseName, disabled, layout) {
  const skills = []
  const issues = []

  let real
  try {
    real = await realpath(file)
  } catch (error) {
    issues.push(makeIssue(
      'broken-link',
      'error',
      file,
      baseName,
      `无法解析文件真实路径：${message(error)}`,
      { action: 'remove-link', hint: '移除失效链接或修复目标路径' },
    ))
    return { skills, issues }
  }

  let info
  try {
    info = await stat(real)
  } catch (error) {
    issues.push(makeIssue(
      'broken-link',
      'error',
      real,
      baseName,
      `符号链接目标不存在：${message(error)}`,
      { action: 'remove-link', hint: '移除失效链接或修复目标路径' },
    ))
    return { skills, issues }
  }
  if (!info.isFile()) return { skills, issues }

  const sizeBytes = Number.isFinite(info.size) ? info.size : 0
  const mtime = Number.isFinite(info.mtimeMs) ? Math.floor(info.mtimeMs / 1000) : 0
  const baseInvocation = { modelInvocable: true, userInvocable: true }

  if (sizeBytes > MAX_SKILL_BYTES) {
    issues.push(makeIssue(
      'oversize',
      'info',
      real,
      baseName,
      `技能文件超过 ${Math.round(MAX_SKILL_BYTES / 1024)} KiB，可能不会被完整加载`,
      { action: 'open-file', hint: '打开文件并压缩正文' },
    ))
    skills.push(makeSkill({
      spec,
      name: baseName,
      description: '',
      real,
      baseName,
      status: disabled ? 'disabled' : 'invalid',
      invocation: baseInvocation,
      sizeBytes,
      mtime,
      layout,
      valid: false,
    }))
    return { skills, issues }
  }
  if (sizeBytes > OVERSIZE_BYTES) {
    issues.push(makeIssue(
      'oversize',
      'info',
      real,
      baseName,
      `技能文件 ${Math.round(sizeBytes / 1024)} KiB，超过建议阈值 ${Math.round(OVERSIZE_BYTES / 1024)} KiB`,
      { action: 'open-file', hint: '考虑拆分资源文件或压缩正文' },
    ))
  }

  let text
  try {
    text = await readFile(real, 'utf8')
  } catch (error) {
    issues.push(makeIssue(
      'unreadable',
      'error',
      real,
      baseName,
      `无法读取文件：${message(error)}`,
      { action: 'retry', hint: '检查文件权限后重试' },
    ))
    return { skills, issues }
  }

  const parsed = parseSkillFile(text)
  let name = baseName
  let description = ''
  let whenToUse
  let invocation = baseInvocation
  let valid = false

  if (!parsed.ok) {
    issues.push(makeIssue(
      'frontmatter',
      'error',
      real,
      baseName,
      parsed.error ?? 'invalid frontmatter',
      { action: 'open-file', hint: '修正 SKILL.md 的 frontmatter' },
    ))
  } else {
    const checked = validateFrontmatter(parsed.frontmatter)
    if (!checked.ok) {
      const kind = typeof checked.error === 'string' && checked.error.startsWith('name') ? 'name' : 'frontmatter'
      issues.push(makeIssue(
        kind,
        'error',
        real,
        typeof parsed.frontmatter?.name === 'string' ? parsed.frontmatter.name : baseName,
        checked.error ?? 'invalid frontmatter',
        { action: 'open-file', hint: '修正 frontmatter 后保存' },
      ))
      if (typeof parsed.frontmatter?.name === 'string') name = parsed.frontmatter.name
      if (typeof parsed.frontmatter?.description === 'string') description = parsed.frontmatter.description
      if (typeof parsed.frontmatter?.whenToUse === 'string') whenToUse = parsed.frontmatter.whenToUse
    } else {
      const frontmatter = checked.frontmatter
      valid = true
      name = frontmatter.name
      description = frontmatter.description
      if (typeof frontmatter.whenToUse === 'string') whenToUse = frontmatter.whenToUse
      invocation = frontmatter.invocation
      if (layout === 'bundle' && name !== baseName) {
        valid = false
        issues.push(makeIssue(
          'name',
          'error',
          real,
          name,
          `frontmatter name "${name}" 与目录名 "${baseName}" 不一致`,
          { action: 'rename', hint: `将名称改为 "${baseName}"，或重命名目录` },
        ))
      }
    }
  }

  const status = disabled ? 'disabled' : (valid ? 'active' : 'invalid')
  skills.push(makeSkill({
    spec,
    name,
    description,
    whenToUse,
    real,
    baseName,
    status,
    invocation,
    sizeBytes,
    mtime,
    layout,
    valid,
  }))
  return { skills, issues }
}

async function scanEntry(spec, dirent, baseDir, disabled) {
  const full = join(baseDir, dirent.name)
  let target = null
  let targetError = null

  if (dirent.isSymbolicLink()) {
    try {
      target = await stat(full)
    } catch (error) {
      targetError = error
    }
  } else if (dirent.isDirectory()) {
    target = { isDirectory: () => true, isFile: () => false }
  } else if (dirent.isFile()) {
    target = { isDirectory: () => false, isFile: () => true }
  }

  if (targetError !== null) {
    return {
      skills: [],
      issues: [makeIssue(
        'broken-link',
        'error',
        full,
        dirent.name,
        `符号链接目标不存在：${message(targetError)}`,
        { action: 'remove-link', hint: '移除失效链接或修复目标路径' },
      )],
    }
  }
  if (target === null) return { skills: [], issues: [] }

  if (target.isDirectory()) {
    const candidate = join(full, 'SKILL.md')
    let linkInfo
    try {
      linkInfo = await lstat(candidate)
    } catch (error) {
      if (isMissing(error)) return { skills: [], issues: [] }
      return {
        skills: [],
        issues: [makeIssue(
          'unreadable',
          'error',
          candidate,
          dirent.name,
          `无法读取 SKILL.md：${message(error)}`,
          { action: 'retry', hint: '检查文件权限后重试' },
        )],
      }
    }
    if (linkInfo.isSymbolicLink()) {
      try {
        const followed = await stat(candidate)
        if (!followed.isFile()) return { skills: [], issues: [] }
      } catch (error) {
        return {
          skills: [],
          issues: [makeIssue(
            'broken-link',
            'error',
            candidate,
            dirent.name,
            `SKILL.md 符号链接目标不存在：${message(error)}`,
            { action: 'remove-link', hint: '修复或移除失效链接' },
          )],
        }
      }
    } else if (!linkInfo.isFile()) {
      return { skills: [], issues: [] }
    }
    return readSkillFile(spec, candidate, dirent.name, disabled, 'bundle')
  }

  if (target.isFile()) {
    if (!dirent.name.toLowerCase().endsWith('.md')) return { skills: [], issues: [] }
    return readSkillFile(spec, full, dirent.name.slice(0, -3), disabled, 'flat')
  }
  return { skills: [], issues: [] }
}

async function scanRoot(spec) {
  const skills = []
  const issues = []
  let dirents
  try {
    dirents = await readdir(spec.path, { withFileTypes: true })
  } catch (error) {
    if (isMissing(error)) return { spec, exists: false, readable: true, skills, issues }
    issues.push(makeIssue(
      'unreadable',
      'error',
      spec.path,
      null,
      `目录不可读：${message(error)}`,
      { action: 'retry', hint: '检查目录权限后重试' },
    ))
    return { spec, exists: true, readable: false, skills, issues }
  }

  for (const dirent of dirents) {
    if (dirent.name.startsWith('.')) continue
    const found = await scanEntry(spec, dirent, spec.path, false)
    skills.push(...found.skills)
    issues.push(...found.issues)
  }

  const disabledRoot = join(spec.path, '.disabled')
  try {
    const disabledDirents = await readdir(disabledRoot, { withFileTypes: true })
    for (const dirent of disabledDirents) {
      if (dirent.name.startsWith('.')) continue
      const found = await scanEntry(spec, dirent, disabledRoot, true)
      skills.push(...found.skills)
      issues.push(...found.issues)
    }
  } catch (error) {
    if (!isMissing(error)) {
      issues.push(makeIssue(
        'unreadable',
        'error',
        disabledRoot,
        null,
        `停用目录不可读：${message(error)}`,
        { action: 'retry', hint: '检查目录权限后重试' },
      ))
    }
  }

  return { spec, exists: true, readable: true, skills, issues }
}

// ---------------------------------------------------------------------------
// Global-layer skills (bundled + filesystem providers registered globally)
// ---------------------------------------------------------------------------

const WRITABLE_LOCATION_IDS = new Set(['project-dsh', 'project-agents', 'custom', 'user-dsh', 'user-agents'])
const LOCATION_BY_ID = new Map(LOCATION_DEFS.map((definition) => [definition.id, definition]))

function entryInvocation(entry) {
  return entry.invocation !== null && typeof entry.invocation === 'object'
    ? {
        modelInvocable: entry.invocation.modelInvocable !== false,
        userInvocable: entry.invocation.userInvocable !== false,
      }
    : { modelInvocable: true, userInvocable: true }
}

/** Best-effort location for a global filesystem entry. */
function locationOfGlobalEntry(entry, specs) {
  if (typeof entry.path === 'string' && entry.path !== '') {
    const real = resolve(entry.path)
    let best = null
    for (const spec of specs) {
      if (isPathInside(spec.path, real) || resolve(spec.path) === real) {
        if (best === null || spec.path.length > best.path.length) best = spec
      }
    }
    if (best !== null) return best.id
    const root = inferRootFromSkillPath(entry.path)
    // A filesystem provider scanning a package root reports `source: "custom"`; present it
    // as the read-only preset location instead of a writable user directory.
    if (root !== null && isPackagePath(root)) return 'preset'
  }
  if (typeof entry.source === 'string' && LOCATION_BY_ID.has(entry.source)) return entry.source
  return 'custom'
}

/**
 * Build the global-layer skills from the unscoped snapshot.
 *
 * Only `source === 'bundled'` or non-filesystem providers are presented as bundled. A
 * filesystem provider registered globally keeps its real source/location/writable fields;
 * entries whose file was already found by the direct root scan are de-duplicated.
 */
async function globalSkills(globalInfo, specs, scannedPaths) {
  const skills = []
  const issues = []
  if (!globalInfo.available) return { skills, issues }

  for (const entry of globalInfo.skills) {
    if (entry === null || typeof entry !== 'object') continue
    if (typeof entry.name !== 'string' || entry.name === '') continue
    const sourcePath = typeof entry.path === 'string' ? entry.path : ''
    let sizeBytes = 0
    let mtime = 0
    if (sourcePath !== '') {
      try {
        const info = await stat(sourcePath)
        if (info.isFile()) {
          sizeBytes = Number.isFinite(info.size) ? info.size : 0
          mtime = Number.isFinite(info.mtimeMs) ? Math.floor(info.mtimeMs / 1000) : 0
        }
      } catch {
        /* a bundled resource may live inside an asar; keep the summary */
      }
    }
    const invocation = entryInvocation(entry)
    const provider = typeof entry.provider === 'string' && entry.provider !== '' ? entry.provider : 'bundled'
    const isBundled = entry.source === 'bundled' || provider !== 'filesystem'

    if (isBundled) {
      skills.push({
        id: hashId(`bundled\0${entry.name}\0${provider}`),
        name: entry.name,
        description: typeof entry.description === 'string' ? entry.description : '',
        ...(typeof entry.whenToUse === 'string' && entry.whenToUse !== '' ? { whenToUse: entry.whenToUse } : {}),
        category: 'system',
        location: 'bundled',
        rootPath: '插件内置',
        // Contract §3: bundled skills may have no file path (asar/provider assets).
        path: '',
        provider,
        sourceType: 'bundled',
        rank: 600,
        writable: false,
        status: 'active',
        visiblePresets: [],
        invocation,
        sizeBytes,
        mtime,
        updatedAtLabel: relativeLabel(mtime),
        _baseName: entry.name,
        _layout: 'bundled',
        _valid: true,
        _order: 6,
        _layer: 'global',
        _root: null,
      })
      continue
    }

    if (sourcePath !== '') {
      let realSource = resolve(sourcePath)
      try {
        realSource = await realpath(sourcePath)
      } catch {
        /* asar/opaque paths may not be resolvable; fall back to the reported path */
      }
      if (scannedPaths.has(realSource) || scannedPaths.has(resolve(sourcePath))) continue
    }

    const location = locationOfGlobalEntry(entry, specs)
    const definition = LOCATION_BY_ID.get(location) ?? LOCATION_BY_ID.get('custom')
    const resolvedPath = sourcePath !== '' ? resolve(sourcePath) : null
    const spec = specs.find((candidate) => (
      candidate.id === location
      && (resolvedPath === null || isPathInside(candidate.path, resolvedPath) || resolve(candidate.path) === resolvedPath)
    )) ?? specs.find((candidate) => candidate.id === location)
    const inferredRoot = inferRootFromSkillPath(sourcePath)
    const root = spec !== null && spec !== undefined
      ? spec
      : {
          id: location,
          path: inferredRoot ?? '',
          display: inferredRoot !== null ? abbreviate(inferredRoot) : '',
          rank: definition.rank,
          writable: WRITABLE_LOCATION_IDS.has(location),
          order: definition.order,
        }
    skills.push({
      id: hashId(`${location}\0${sourcePath !== '' ? sourcePath : entry.name}`),
      name: entry.name,
      description: typeof entry.description === 'string' ? entry.description : '',
      ...(typeof entry.whenToUse === 'string' && entry.whenToUse !== '' ? { whenToUse: entry.whenToUse } : {}),
      category: categoryOf(location, root.writable === true),
      location,
      rootPath: root.display ?? abbreviate(root.path ?? ''),
      path: sourcePath,
      provider,
      sourceType: 'filesystem',
      rank: root.rank,
      writable: root.writable === true,
      status: 'active',
      visiblePresets: [],
      invocation,
      sizeBytes,
      mtime,
      updatedAtLabel: relativeLabel(mtime),
      _baseName: entry.name,
      _layout: sourcePath.toLowerCase().endsWith('skill.md') ? 'bundle' : 'flat',
      _valid: true,
      _order: root.order,
      _layer: 'global',
      _root: root,
    })
  }
  return { skills, issues }
}

// ---------------------------------------------------------------------------
// Shadowing / visibility / views
// ---------------------------------------------------------------------------

/**
 * One shadowing scope per preset. A scope contains exactly the roots that preset's own
 * snapshot returned candidates for (inferred from each candidate `path`); a mounted preset
 * is *not* given the default roots wholesale, because a preset may mount only one of them.
 * Presets never compete with each other.
 */
function buildShadowScopes(presetInfo, specs) {
  if (!presetInfo.available) {
    return [{ id: '__all__', roots: new Set(specs.map((spec) => resolve(spec.path))) }]
  }
  return presetInfo.list.map((preset) => {
    const roots = new Set()
    for (const entry of preset.skills) {
      if (!isLocalSkillEntry(entry)) continue
      const root = inferRootFromSkillPath(entry.path)
      if (root !== null) roots.add(resolve(root))
    }
    return { id: preset.id, roots }
  })
}

/** Lower wins. Preset-layer skills shadow global-layer skills before rank is considered. */
function layerOrder(skill) {
  return skill._layer === 'global' ? 1 : 0
}

/** Scope ids a skill participates in. Global-layer skills participate in every scope. */
function scopeIdsOf(skill, scopes) {
  if (skill._layer === 'global' || skill.location === 'bundled' || skill._root === null || skill._root === undefined) {
    return scopes.map((scope) => scope.id)
  }
  const rootPath = typeof skill._root.path === 'string' && skill._root.path !== ''
    ? resolve(skill._root.path)
    : null
  if (rootPath === null) return scopes.map((scope) => scope.id)
  return scopes.filter((scope) => scope.roots.has(rootPath)).map((scope) => scope.id)
}

function applyShadows(skills, issues, scopes) {
  const lostIn = new Map()
  const winners = new Map()
  const applicable = new Map()

  for (const skill of skills) {
    if (skill.status !== 'active') continue
    applicable.set(skill, scopeIdsOf(skill, scopes))
  }

  for (const scope of scopes) {
    const groups = new Map()
    for (const skill of skills) {
      if (skill.status !== 'active') continue
      if (!applicable.get(skill)?.includes(scope.id)) continue
      let group = groups.get(skill.name)
      if (group === undefined) {
        group = []
        groups.set(skill.name, group)
      }
      group.push(skill)
    }
    for (const [name, group] of groups) {
      if (group.length < 2) continue
      // Layer first: a preset-layer skill always beats a global-layer skill, regardless of
      // rank. Rank only orders conflicts inside the same layer (registry `collectFresh`).
      group.sort((left, right) => (
        (layerOrder(left) - layerOrder(right))
        || (left.rank - right.rank)
        || (left._order - right._order)
        || left.path.localeCompare(right.path)
      ))
      const winner = group[0]
      for (const loser of group.slice(1)) {
        let lost = lostIn.get(loser)
        if (lost === undefined) {
          lost = new Set()
          lostIn.set(loser, lost)
        }
        lost.add(scope.id)
        winners.set(loser, { winner, name })
      }
    }
  }

  for (const skill of skills) {
    if (skill.status !== 'active') continue
    const ids = applicable.get(skill) ?? []
    if (ids.length === 0) continue
    const lost = lostIn.get(skill)
    // Only mark a skill shadowed when it loses in *every* scope it belongs to; winning in one
    // preset keeps it active there and must not be hidden by another preset's ranking.
    if (lost === undefined || lost.size < ids.length) continue
    const entry = winners.get(skill)
    if (entry === undefined) continue
    const winner = entry.winner
    const crossLayer = skill._layer !== winner._layer
    skill.status = 'shadowed'
    skill.shadowedBy = winner.path
    issues.push(makeIssue(
      crossLayer ? 'cross-layer-shadow' : 'same-layer-shadow',
      crossLayer ? 'info' : 'warning',
      skill.path !== '' ? skill.path : `插件内置/${skill.name}`,
      skill.name,
      crossLayer
        ? `预设层同名技能 "${skill.name}" 覆盖了插件内置版本`
        : `同名技能 "${skill.name}" 被更高优先级的 ${winner.rootPath} 覆盖`,
      { action: 'view-active', hint: '查看当前生效的技能' },
    ))
  }
}

async function applyVisibility(skills, presetInfo, presetViews) {
  const all = presetViews.map((preset) => preset.id)
  if (!presetInfo.available) {
    const mounted = presetViews.filter((preset) => preset.mounted).map((preset) => preset.id)
    for (const skill of skills) {
      if (skill.status !== 'active') skill.visiblePresets = []
      else if (skill.location === 'bundled') skill.visiblePresets = all
      else skill.visiblePresets = mounted
    }
    return
  }

  // Snapshot paths are realpaths in the provider, but normalise defensively so a
  // platform-level symlink (macOS `/var` -> `/private/var`) cannot hide a match.
  // Bundled entries are matched by name *and* provider: two providers may expose the
  // same name in different presets, and a name-only match would leak visibility.
  const bundledKeys = new Map()
  const paths = new Map()
  for (const preset of presetInfo.list) {
    const bundledSet = new Set()
    const pathSet = new Set()
    for (const entry of preset.skills) {
      if (entry === null || typeof entry !== 'object' || typeof entry.name !== 'string') continue
      const provider = typeof entry.provider === 'string' && entry.provider !== '' ? entry.provider : 'bundled'
      bundledSet.add(`${entry.name}\0${provider}`)
      if (typeof entry.path === 'string' && entry.path !== '') {
        let real = entry.path
        try {
          real = await realpath(entry.path)
        } catch {
          real = resolve(entry.path)
        }
        pathSet.add(`${entry.name}\0${real}`)
      }
    }
    bundledKeys.set(preset.id, bundledSet)
    paths.set(preset.id, pathSet)
  }

  for (const skill of skills) {
    if (skill.status !== 'active') {
      skill.visiblePresets = []
      continue
    }
    if (skill.location === 'bundled') {
      const key = `${skill.name}\0${skill.provider}`
      skill.visiblePresets = presetInfo.list
        .filter((preset) => bundledKeys.get(preset.id)?.has(key) === true)
        .map((preset) => preset.id)
      continue
    }
    skill.visiblePresets = presetInfo.list
      .filter((preset) => paths.get(preset.id)?.has(`${skill.name}\0${skill.path}`) === true)
      .map((preset) => preset.id)
  }
}

function buildPresetViews(presetInfo, specs, scans, skills) {
  if (presetInfo.available) {
    return presetInfo.list.map((preset) => {
      const localEntries = preset.skills.filter((entry) => isLocalSkillEntry(entry))
      const roots = new Set()
      for (const entry of localEntries) {
        const root = inferRootFromSkillPath(entry.path)
        if (root !== null) roots.add(root)
      }
      const mounted = localEntries.length > 0 ? true : MOUNTED_PRESETS.has(preset.id)
      return {
        id: preset.id,
        mounted,
        presetSkills: localEntries.length,
        localRoots: roots.size,
        desc: `${mounted ? '本地发现已挂载' : '未挂载本地发现'} · ${localEntries.length} 个预设技能`,
      }
    })
  }

  const existingRoots = scans.filter((scan) => scan.exists).length
  const localSkills = skills.filter((skill) => skill.location !== 'bundled' && skill.status !== 'disabled')
  return STATIC_PRESETS.map((preset) => ({
    id: preset.id,
    mounted: preset.mounted,
    presetSkills: preset.mounted ? localSkills.length : 0,
    localRoots: preset.mounted ? existingRoots : 0,
    desc: `${preset.mounted ? '本地发现已挂载' : '未挂载本地发现'} · 静态规则`,
  }))
}

function locationPresets(definition, specs, presetInfo, presetViews) {
  const all = presetViews.map((preset) => preset.id)
  const mounted = presetViews.filter((preset) => preset.mounted).map((preset) => preset.id)
  if (definition.id === 'bundled') return all
  if (['project-dsh', 'project-agents', 'user-dsh', 'user-agents'].includes(definition.id)) {
    return mounted
  }
  if (!presetInfo.available) return specs.length > 0 ? mounted : []

  const roots = new Set(specs.map((spec) => spec.path))
  const seen = new Set()
  for (const preset of presetInfo.list) {
    for (const entry of preset.skills) {
      if (!isLocalSkillEntry(entry)) continue
      const root = inferRootFromSkillPath(entry.path)
      if (root !== null && roots.has(root)) seen.add(preset.id)
    }
  }
  return [...seen]
}

function buildLocations(scans, skills, presetInfo, presetViews, globalInfo) {
  const byId = new Map()
  for (const scan of scans) {
    let group = byId.get(scan.spec.id)
    if (group === undefined) {
      group = { specs: [], scans: [] }
      byId.set(scan.spec.id, group)
    }
    group.specs.push(scan.spec)
    group.scans.push(scan)
  }

  return LOCATION_DEFS.map((definition) => {
    if (definition.id === 'bundled') {
      const bundled = skills.filter((skill) => skill.location === 'bundled')
      return {
        id: 'bundled',
        label: definition.label,
        path: '',
        absPath: '',
        rank: 600,
        layer: 'global',
        writable: false,
        exists: bundled.length > 0,
        readable: true,
        skillCount: bundled.filter((skill) => skill.status !== 'disabled').length,
        disabledCount: 0,
        presets: presetViews.map((preset) => preset.id),
      }
    }

    const group = byId.get(definition.id)
    if (group === undefined) {
      // A globally registered filesystem provider may report a location whose root we do not
      // scan directly; still surface the entries it contributed.
      const entries = skills.filter((skill) => skill.location === definition.id)
      return {
        id: definition.id,
        label: definition.label,
        path: entries.length > 0 ? entries[0].rootPath : '',
        absPath: '',
        rank: definition.rank,
        layer: definition.layer,
        writable: definition.writable,
        exists: entries.length > 0,
        readable: true,
        skillCount: entries.filter((skill) => skill.status !== 'disabled').length,
        disabledCount: entries.filter((skill) => skill.status === 'disabled').length,
        presets: locationPresets(definition, [], presetInfo, presetViews),
      }
    }

    const first = group.specs[0]
    const entries = group.scans.flatMap((scan) => scan.skills)
    return {
      id: definition.id,
      label: definition.label,
      path: first.display,
      absPath: first.path,
      rank: definition.rank,
      layer: definition.layer,
      writable: definition.writable,
      exists: group.scans.some((scan) => scan.exists),
      readable: group.scans.every((scan) => !scan.exists || scan.readable),
      skillCount: entries.filter((skill) => skill.status !== 'disabled').length,
      disabledCount: entries.filter((skill) => skill.status === 'disabled').length,
      presets: locationPresets(definition, group.specs, presetInfo, presetViews),
    }
  })
}

// ---------------------------------------------------------------------------
// Market metadata (attached per call, never cached)
// ---------------------------------------------------------------------------

function attachMarket(skills, options) {
  const installed = Array.isArray(options?.installed) ? options.installed : []
  const sourceNames = new Map()
  if (Array.isArray(options?.sources)) {
    for (const source of options.sources) {
      if (source !== null && typeof source === 'object' && typeof source.id === 'string') {
        sourceNames.set(source.id, typeof source.name === 'string' ? source.name : '')
      }
    }
  }
  const updates = new Map()
  if (Array.isArray(options?.updates?.updates)) {
    for (const update of options.updates.updates) {
      if (update !== null && typeof update === 'object') {
        updates.set(`${update.location}:${update.name}`, update)
      }
    }
  }

  for (const skill of skills) {
    // Contract §3.2: every view carries its market origin; `null` means local/builtin.
    skill.sourceId = null
    skill.sourceName = null
    if (installed.length === 0) continue
    const record = installed.find((entry) => (
      entry !== null && typeof entry === 'object'
      && entry.name === skill.name && entry.location === skill.location
    ))
    if (record === undefined) continue
    const sourceId = typeof record.sourceId === 'string' && record.sourceId !== '' ? record.sourceId : ''
    const listed = sourceId === '' ? '' : sourceNames.get(sourceId)
    const sourceName = sourceId === ''
      ? ''
      : (typeof listed === 'string' && listed !== ''
          ? listed
          : (typeof record.sourceName === 'string' ? record.sourceName : ''))
    if (sourceId !== '') skill.sourceId = sourceId
    if (sourceName !== '') skill.sourceName = sourceName
    const update = updates.get(`${skill.location}:${skill.name}`)
    skill.market = {
      sourceId,
      sourceName,
      version: typeof record.version === 'string' ? record.version : '',
      ...(typeof record.commit === 'string' && record.commit !== '' ? { commit: record.commit } : {}),
      ...(update !== undefined && typeof update.available === 'string' ? { updateAvailable: update.available } : {}),
      localModified: record.localModified === true || update?.localModified === true,
      installedAt: Number.isFinite(record.installedAt) ? record.installedAt : 0,
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Contract §3.2: only a `broken` skill carries a user-facing reason. */
function brokenReasonOf(skill) {
  if (skill === null || typeof skill !== 'object' || skill.status !== 'broken') return null
  if (typeof skill.brokenReason === 'string' && skill.brokenReason !== '') return skill.brokenReason
  if (typeof skill.path !== 'string' || skill.path === '') return '技能文件不存在'
  return '指向的位置不存在'
}

function publicSkill(skill) {
  const {
    _baseName,
    _layout,
    _valid,
    _order,
    _layer,
    _root,
    ...rest
  } = skill
  return {
    ...rest,
    category: typeof rest.category === 'string'
      ? rest.category
      : categoryOf(rest.location, rest.writable === true),
    sourceId: typeof rest.sourceId === 'string' && rest.sourceId !== '' ? rest.sourceId : null,
    sourceName: typeof rest.sourceName === 'string' && rest.sourceName !== '' ? rest.sourceName : null,
    brokenReason: brokenReasonOf(skill),
  }
}

/**
 * Group skill views by market origin (contract §3.3).
 *
 * Source groups follow `sourceOrder`; the `local` group (skills without a `sourceId`, or
 * whose `sourceId` no longer exists in `sourceOrder`) is always last. Empty groups are
 * omitted. `system`-category skills are never grouped: the Client renders that category
 * flat, so they are excluded from the returned groups.
 *
 * @param {object[]} skills
 * @param {string[]} [sourceOrder]
 * @returns {Array<{ key: string, kind: 'source' | 'local', sourceId: string | null, label: string, count: number, skills: object[] }>}
 */
export function groupSkillsBySource(skills, sourceOrder = []) {
  const list = Array.isArray(skills) ? skills : []
  const order = []
  const seen = new Set()
  if (Array.isArray(sourceOrder)) {
    for (const id of sourceOrder) {
      if (typeof id !== 'string' || id === '' || seen.has(id)) continue
      seen.add(id)
      order.push(id)
    }
  }

  const buckets = new Map(order.map((id) => [id, []]))
  const local = []
  for (const skill of list) {
    if (skill === null || typeof skill !== 'object') continue
    if (skill.category === 'system') continue
    const sourceId = typeof skill.sourceId === 'string' && skill.sourceId !== '' ? skill.sourceId : null
    const bucket = sourceId === null ? undefined : buckets.get(sourceId)
    // A record whose source was removed has nowhere to render: fold it into `local`.
    if (bucket === undefined) local.push(skill)
    else bucket.push(skill)
  }

  const groups = []
  for (const id of order) {
    const items = buckets.get(id)
    if (items.length === 0) continue
    const named = items.find((skill) => typeof skill.sourceName === 'string' && skill.sourceName !== '')
    groups.push({
      key: `source:${id}`,
      kind: 'source',
      sourceId: id,
      label: named !== undefined ? named.sourceName : id,
      count: items.length,
      skills: items,
    })
  }
  if (local.length > 0) {
    groups.push({
      key: 'local',
      kind: 'local',
      sourceId: null,
      label: '本地创建',
      count: local.length,
      skills: local,
    })
  }
  return groups
}

function sortIssues(issues) {
  const severity = { error: 0, warning: 1, info: 2 }
  return issues.sort((left, right) => (
    (severity[left.severity] ?? 9) - (severity[right.severity] ?? 9)
    || left.path.localeCompare(right.path)
    || left.message.localeCompare(right.message)
  ))
}

async function computeScan(ctx, cwd) {
  const projectRoot = await projectRootOf(cwd)
  const [presetInfo, globalInfo] = await Promise.all([
    presetSnapshots(ctx, cwd),
    globalSnapshot(ctx, cwd),
  ])
  const inferred = inferCustomRoots(presetInfo)
  const specs = buildRootSpecs(projectRoot, inferred)
  const scans = await Promise.all(specs.map((spec) => scanRoot(spec)))

  const skills = []
  const issues = []
  for (const scan of scans) {
    skills.push(...scan.skills)
    issues.push(...scan.issues)
  }

  const scannedPaths = new Set(skills.filter((skill) => skill.path !== '').map((skill) => resolve(skill.path)))
  const global = await globalSkills(globalInfo, specs, scannedPaths)
  skills.push(...global.skills)
  issues.push(...global.issues)

  const presetViews = buildPresetViews(presetInfo, specs, scans, skills)
  await applyVisibility(skills, presetInfo, presetViews)
  const shadowScopes = buildShadowScopes(presetInfo, specs)
  applyShadows(skills, issues, shadowScopes)
  // A shadowed skill is not active in any scope; keep the contract's "empty when inactive".
  for (const skill of skills) {
    if (skill.status !== 'active') skill.visiblePresets = []
  }
  const locations = buildLocations(scans, skills, presetInfo, presetViews, globalInfo)

  const order = new Map(LOCATION_DEFS.map((definition) => [definition.id, definition.order]))
  skills.sort((left, right) => (
    (order.get(left.location) ?? 9) - (order.get(right.location) ?? 9)
    || left.name.localeCompare(right.name)
    || left.path.localeCompare(right.path)
  ))

  return {
    locations,
    skills,
    issues: sortIssues(issues),
    presets: presetViews,
  }
}

/**
 * Scan every location and return the installed view.
 * @param {object} ctx owning Cordis context (optional `skills` / `agentPresets`)
 * @param {string} cwd working directory (absolute, or relative to the default)
 * @param {{ force?: boolean, installed?: object[], sources?: object[], updates?: object }} [options]
 * @returns {Promise<{ locations: object[], skills: object[], issues: object[], presets: object[] }>}
 */
export async function scanAll(ctx, cwd, options = {}) {
  const rootCwd = await resolveCwd(ctx, cwd)
  const key = `${rootCwd}\0${dshHome()}\0${agentsHome()}`
  const now = Date.now()
  let raw
  if (options.force !== true && cache.value !== null && cache.key === key && now - cache.at < CACHE_MS) {
    raw = cache.value
  } else {
    raw = await computeScan(ctx, rootCwd)
    cache = { key, at: Date.now(), value: raw }
  }

  const skills = raw.skills.map((skill) => ({ ...skill }))
  attachMarket(skills, options)
  return {
    locations: raw.locations.map((location) => ({ ...location, presets: [...location.presets] })),
    skills: skills.map(publicSkill),
    issues: raw.issues.map((issue) => ({ ...issue })),
    presets: raw.presets.map((preset) => ({ ...preset })),
  }
}

/** Drop the one-second scan cache (called after every write). */
export function invalidateScanCache() {
  cache = { key: '', at: 0, value: null }
}

function typeOf(path) {
  const extension = extname(path).toLowerCase()
  if (extension === '.md' || extension === '.mdx' || extension === '.txt') return 'markdown'
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(extension)) return 'image'
  if (['.js', '.mjs', '.cjs', '.ts', '.sh', '.bash', '.zsh', '.py', '.rb', '.ps1'].includes(extension)) return 'script'
  if (['.json', '.yml', '.yaml', '.toml'].includes(extension)) return 'config'
  return 'file'
}

async function listResources(filePath) {
  const bundle = basename(filePath).toLowerCase() === 'skill.md'
  if (!bundle) {
    try {
      const info = await stat(filePath)
      return [{ path: basename(filePath), size: Number.isFinite(info.size) ? info.size : 0, type: typeOf(filePath) }]
    } catch {
      return []
    }
  }

  const root = dirname(filePath)
  const files = []
  const stack = [root]
  while (stack.length > 0 && files.length < MAX_RESOURCE_FILES) {
    const current = stack.pop()
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (files.length >= MAX_RESOURCE_FILES) break
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }
      if (!entry.isFile() && !entry.isSymbolicLink()) continue
      try {
        const info = await stat(full)
        if (!info.isFile()) continue
        files.push({
          path: toPosix(relative(root, full)),
          size: Number.isFinite(info.size) ? info.size : 0,
          type: typeOf(full),
        })
      } catch {
        /* an unreadable resource is omitted from the listing */
      }
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path))
  return files
}

/**
 * Read one skill's SKILL.md, metadata and resource listing.
 * @param {object} ctx
 * @param {string} filePath absolute path to SKILL.md / <name>.md
 * @param {string} cwd working directory
 * @param {object} [options] forwarded to `scanAll` (installed/sources/updates)
 */
export async function readSkillDetail(ctx, filePath, cwd, options = {}) {
  const requested = typeof filePath === 'string' ? filePath.trim() : ''
  if (requested === '') {
    throw new ApiError('E_BAD_REQUEST', 'path is required', {}, 400)
  }
  let absolute = resolve(requested)
  try {
    const info = await stat(absolute)
    if (info.isDirectory()) absolute = join(absolute, 'SKILL.md')
  } catch {
    /* the path may be a flat file or a stale entry */
  }
  let realAbsolute = null
  try {
    realAbsolute = await realpath(absolute)
  } catch {
    realAbsolute = null
  }

  const find = (scan) => {
    const direct = scan.skills.find((skill) => skill.path === absolute)
    if (direct !== undefined) return direct
    if (realAbsolute !== null) {
      const real = scan.skills.find((skill) => skill.path === realAbsolute)
      if (real !== undefined) return real
    }
    return scan.skills.find((skill) => skill.path !== '' && samePath(skill.path, absolute))
  }

  let scan = await scanAll(ctx, cwd, options)
  let skill = find(scan)
  if (skill === undefined) {
    scan = await scanAll(ctx, cwd, { ...options, force: true })
    skill = find(scan)
  }
  if (skill === undefined) {
    throw new ApiError(
      'E_NOT_FOUND',
      `skill file not found: ${abbreviate(absolute)}`,
      { path: abbreviate(absolute) },
      404,
    )
  }
  if (skill.path === '') {
    throw new ApiError('E_NOT_FOUND', `skill "${skill.name}" has no readable file path`, { path: skill.name }, 404)
  }

  let content
  try {
    content = await readFile(skill.path, 'utf8')
  } catch (error) {
    throw new ApiError(
      'E_NOT_FOUND',
      `cannot read skill file: ${message(error)}`,
      { path: abbreviate(skill.path) },
      404,
    )
  }
  return {
    skill,
    content,
    files: await listResources(skill.path),
  }
}
