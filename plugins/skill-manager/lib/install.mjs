/**
 * Market skill installer.
 *
 * Flow (spec §13 / implementation §8):
 *   resolve location → conflict check → download into `<root>/.skill-manager-tmp/<name>-<rand>/`
 *   → verify size/sha256/paths/frontmatter → back up the old directory (if any)
 *   → atomic rename into `<root>/<name>` → write the install record.
 *
 * Safety:
 *   - the target root must come from the fixed location table; `preset`/`bundled` are refused;
 *   - every file path is validated against the spec §8 rules and resolved below the temp root;
 *   - redirects are rejected, each download is capped at 30s / 4 MiB, a version at 20 MiB;
 *   - `node:crypto` hashes the stream while it is written, never buffering whole resources;
 *   - a failed install removes its temp directory and restores the backup.
 *
 * Pure Node module: imports only `node:` builtins and relative files.
 */

import { createHash, randomBytes } from 'node:crypto'
import {
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
} from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

import { compareVersions, parseVersion, satisfiesRange } from './compat.mjs'
import { parseSkillFile, validateFrontmatter } from './frontmatter.mjs'
import { abbreviateHome, resolveDshHome, skillError } from './state.mjs'
import {
  assertSkillName,
  assertSkillPath,
  defaultSkillRoots,
  isInside,
  READONLY_LOCATIONS,
  resolveRootInfo,
  WRITABLE_LOCATIONS,
} from './write.mjs'

/** Spec §8.3 limits. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024
export const MAX_SKILL_MD_BYTES = 256 * 1024
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024
export const MAX_FILES = 200
export const DOWNLOAD_TIMEOUT_MS = 30000
export const BACKUP_KEEP = 3

function report(callback, payload) {
  if (typeof callback !== 'function') return
  try {
    callback(payload)
  } catch {
    /* progress callbacks must never break an install */
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error')
}

function ensureErrorCode(error, fallback = 'E_INTERNAL') {
  if (error !== null && typeof error === 'object' && typeof error.code === 'string' && error.code.startsWith('E_')) {
    return error
  }
  const wrapped = skillError(fallback, error !== null && typeof error === 'object' && error.message ? error.message : String(error))
  if (error !== null && typeof error === 'object') wrapped.cause = error
  return wrapped
}

async function pathExists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return false
    throw error
  }
}

async function lstatOrNull(path) {
  try {
    return await lstat(path)
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return null
    throw error
  }
}

/** Create `path` as a real directory; refuse a symlink or a non-directory at that path. */
async function ensureDirectory(path) {
  const info = await lstatOrNull(path)
  if (info === null) {
    await mkdir(path, { recursive: true })
    return
  }
  if (info.isSymbolicLink()) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `Directory is a symbolic link: ${path}`)
  }
  if (!info.isDirectory()) {
    throw skillError('E_BAD_REQUEST', `Not a directory: ${path}`)
  }
}

/**
 * Refuse to delete through a symbolic link.
 *
 * Every component between the (canonical) root and the target is lstat'ed; a
 * symlink anywhere in the chain — including the target itself — is treated as an
 * escape attempt. When the target exists its realpath must still resolve inside
 * the root (defends against exotic bind-mount style redirects as well).
 */
async function assertSafeDeleteTarget(root, target, label) {
  const canonicalRoot = resolve(root)
  const canonicalTarget = resolve(target)
  if (!isInside(canonicalRoot, canonicalTarget)) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `${label} is outside the skill root`)
  }
  const rootInfo = await lstatOrNull(canonicalRoot)
  if (rootInfo === null || rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `Skill root is not a real directory: ${canonicalRoot}`)
  }

  const parts = relative(canonicalRoot, canonicalTarget).split(/[\\/]+/u).filter((part) => part !== '')
  let current = canonicalRoot
  let existingTarget = true
  for (const part of parts) {
    current = join(current, part)
    const info = await lstatOrNull(current)
    if (info === null) {
      existingTarget = false
      break
    }
    if (info.isSymbolicLink()) {
      throw skillError('E_PATH_OUTSIDE_ROOT', `${label} traverses a symbolic link: ${current}`)
    }
  }

  const realRoot = await realpath(canonicalRoot).catch(() => canonicalRoot)
  const probe = existingTarget ? canonicalTarget : dirname(canonicalTarget)
  const realProbe = await realpath(probe).catch(() => null)
  if (realProbe !== null && realProbe !== realRoot && !isInside(realRoot, realProbe)) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `${label} resolves outside the skill root`)
  }
}

function resolveFetcher(fetcher) {
  if (typeof fetcher === 'function') return fetcher
  if (fetcher !== null && typeof fetcher === 'object' && typeof fetcher.fetch === 'function') {
    return fetcher.fetch.bind(fetcher)
  }
  if (typeof globalThis.fetch === 'function') return globalThis.fetch.bind(globalThis)
  throw skillError('E_INTERNAL', 'No fetch implementation is available')
}

function createTimeoutSignal(milliseconds, external) {
  const controller = new AbortController()
  const state = { timedOut: false }
  const onAbort = () => {
    try {
      controller.abort(external?.reason)
    } catch {
      controller.abort()
    }
  }
  if (external !== undefined && external !== null) {
    if (external.aborted) onAbort()
    else if (typeof external.addEventListener === 'function') external.addEventListener('abort', onAbort, { once: true })
  }
  const timer = setTimeout(() => {
    state.timedOut = true
    try {
      controller.abort(new Error('timeout'))
    } catch {
      controller.abort()
    }
  }, milliseconds)
  if (typeof timer.unref === 'function') timer.unref()
  return {
    signal: controller.signal,
    get timedOut() {
      return state.timedOut
    },
    dispose() {
      clearTimeout(timer)
      if (external !== null && external !== undefined && typeof external.removeEventListener === 'function') {
        external.removeEventListener('abort', onAbort)
      }
    },
  }
}

/**
 * Resolve a file URL from the index.
 * The result must be https, or share protocol+host with the index URL; credentials,
 * query strings and fragments are rejected so downloads stay cacheable and immutable.
 */
function resolveFileUrl(raw, sourceUrl) {
  let url
  try {
    url = new URL(String(raw ?? ''), sourceUrl === undefined || sourceUrl === null || sourceUrl === '' ? undefined : String(sourceUrl))
  } catch {
    throw skillError('E_BAD_REQUEST', 'Invalid file URL')
  }
  if (url.username !== '' || url.password !== '') {
    throw skillError('E_BAD_REQUEST', 'File URL must not contain credentials')
  }
  if (url.search !== '' || url.hash !== '') {
    throw skillError('E_BAD_REQUEST', 'File URL must not contain a query or fragment')
  }
  if (url.protocol !== 'https:') {
    let base
    try {
      base = new URL(String(sourceUrl ?? ''))
    } catch {
      throw skillError('E_BAD_REQUEST', 'File URL must be https or same-origin with the index')
    }
    if ((base.protocol !== 'https:' && base.protocol !== 'http:') || url.protocol !== base.protocol || url.host !== base.host) {
      throw skillError('E_BAD_REQUEST', 'File URL must be https or same-origin with the index')
    }
  }
  return url.href
}

async function consumeBody(response, onChunk) {
  const body = response?.body
  if (body !== null && body !== undefined && typeof body.getReader === 'function') {
    const reader = body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value !== undefined && value !== null) await onChunk(Buffer.from(value))
      }
    } catch (error) {
      await reader.cancel().catch(() => {})
      throw error
    }
    return
  }
  if (typeof response?.arrayBuffer === 'function') {
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > 0) await onChunk(buffer)
    return
  }
  if (body !== null && body !== undefined && typeof body[Symbol.asyncIterator] === 'function') {
    for await (const value of body) await onChunk(Buffer.from(value))
    return
  }
  if (typeof response?.text === 'function') {
    const buffer = Buffer.from(await response.text())
    if (buffer.length > 0) await onChunk(buffer)
    return
  }
  throw skillError('E_INTERNAL', 'Response body is not readable')
}

async function downloadFile({ url, destination, declared, fetcher, signal, timeoutMs = DOWNLOAD_TIMEOUT_MS }) {
  const doFetch = resolveFetcher(fetcher)
  const timeout = createTimeoutSignal(timeoutMs, signal)
  try {
    let response
    try {
      response = await doFetch(url, {
        redirect: 'error',
        signal: timeout.signal,
        headers: { accept: '*/*' },
      })
    } catch (error) {
      if (timeout.timedOut) {
        throw skillError('E_SOURCE_UNREACHABLE', `Timed out downloading ${declared.path}`)
      }
      if (signal !== undefined && signal !== null && signal.aborted) {
        throw skillError('E_CANCELED', 'Install canceled')
      }
      throw skillError('E_SOURCE_UNREACHABLE', `Failed to download ${declared.path}`, { cause: error })
    }

    const ok = typeof response?.ok === 'boolean' ? response.ok : (response?.status >= 200 && response?.status < 300)
    if (!ok) {
      throw skillError('E_SOURCE_UNREACHABLE', `Download failed with HTTP ${response?.status ?? 'unknown'} for ${declared.path}`, {
        status: response?.status,
      })
    }

    await mkdir(dirname(destination), { recursive: true })
    const hash = createHash('sha256')
    let size = 0
    let handle = null
    try {
      handle = await open(destination, 'wx', 0o644)
      await consumeBody(response, async (chunk) => {
        size += chunk.length
        if (size > declared.size) {
          throw skillError('E_CHECKSUM', `Size mismatch for ${declared.path}`)
        }
        if (size > MAX_FILE_BYTES) {
          throw skillError('E_TOO_LARGE', `${declared.path} is larger than 4 MiB`)
        }
        hash.update(chunk)
        await handle.write(chunk)
      })
      await handle.sync().catch(() => {})
    } finally {
      if (handle !== null) await handle.close().catch(() => {})
    }
    if (size !== declared.size) {
      throw skillError('E_CHECKSUM', `Size mismatch for ${declared.path}`)
    }
    const digest = hash.digest('hex')
    if (digest !== declared.sha256) {
      throw skillError('E_CHECKSUM', `SHA-256 mismatch for ${declared.path}`)
    }
  } finally {
    timeout.dispose()
  }
}

function safeJoin(base, relativePath) {
  const target = resolve(base, ...String(relativePath).split('/'))
  if (!isInside(base, target)) {
    throw skillError('E_PATH_OUTSIDE_ROOT', `File path escapes the install directory: ${relativePath}`)
  }
  return target
}

function resolveSkillName(skill) {
  if (typeof skill === 'string') return assertSkillName(skill)
  if (skill !== null && typeof skill === 'object') return assertSkillName(skill.name)
  throw skillError('E_BAD_REQUEST', 'Skill is required')
}

/**
 * Pick the spec default version: the highest compatible stable SemVer, falling back to the
 * highest compatible prerelease. Compatibility with `engines.dsh` is unknown at this layer
 * (the running DSH version is not injected), so — as implementation §7 prescribes — an
 * unknown engine constraint is treated as compatible.
 */
function selectDefaultVersion(skill) {
  const versions = Array.isArray(skill?.versions) ? skill.versions : []
  const candidates = versions.filter((candidate) => (
    candidate !== null
    && typeof candidate === 'object'
    && typeof candidate.version === 'string'
    && candidate.version !== ''
    && candidate.yanked !== true
  ))
  if (candidates.length === 0) return null
  const stable = candidates.filter((candidate) => (parseVersion(candidate.version)?.prerelease.length ?? 0) === 0)
  const pool = stable.length > 0 ? stable : candidates
  return [...pool].sort((left, right) => {
    try {
      return compareVersions(right.version, left.version)
    } catch {
      return 0
    }
  })[0]
}

function resolveVersion(skill, version) {
  const versions = Array.isArray(skill?.versions) ? skill.versions : []
  let entry
  if (version !== null && typeof version === 'object') entry = version
  else if (typeof version === 'string') {
    entry = versions.find((candidate) => candidate?.version === version)
    if (entry === undefined) throw skillError('E_NOT_FOUND', `Version "${version}" is not available`)
  } else if (version === undefined || version === null) {
    entry = selectDefaultVersion(skill)
    if (entry === null) throw skillError('E_NOT_FOUND', 'No installable version is available')
  }
  if (entry === undefined || entry === null) throw skillError('E_BAD_REQUEST', 'Version not found')
  if (entry.yanked === true) throw skillError('E_BAD_REQUEST', 'This version is yanked')
  const label = String(entry.version ?? '')
  if (label === '') throw skillError('E_BAD_REQUEST', 'Version is required')
  const files = Array.isArray(entry.files)
    ? entry.files
    : Array.isArray(skill?.files)
      ? skill.files
      : []
  const commit = entry?.source?.commit ?? entry?.commit ?? skill?.commit ?? ''
  return { entry, version: label, files, commit: String(commit) }
}

function enginesRangeOf(entry) {
  const value = entry?.engines?.dsh ?? entry?.enginesDsh ?? entry?.dsh
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * Refuse a version whose `engines.dsh` range excludes the running DSH.
 * An unknown running version (or an unsupported range syntax) is compatible.
 */
function assertCompatible(entry, version, dshVersion) {
  if (dshVersion === null || dshVersion === undefined || dshVersion === '') return
  const range = enginesRangeOf(entry)
  if (range === null) return
  const result = satisfiesRange(dshVersion, range)
  if (result === false) {
    throw skillError(
      'E_NO_COMPATIBLE',
      `Version ${version} requires DSH ${range}, but the running DSH is ${dshVersion}`,
      { status: 400 },
    )
  }
}

/** Compare the persisted sha256 manifest with the version being installed. */
function sameFileManifest(previous, next) {
  if (!Array.isArray(previous) || previous.length !== next.length) return false
  const signature = (files) => JSON.stringify(
    files
      .map((file) => [String(file?.path ?? ''), String(file?.sha256 ?? '').toLowerCase()])
      .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0)),
  )
  return signature(previous) === signature(next)
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw skillError('E_BAD_REQUEST', 'Version has no files')
  }
  if (files.length > MAX_FILES) {
    throw skillError('E_TOO_LARGE', `Version contains more than ${MAX_FILES} files`)
  }
  const seen = new Set()
  const normalized = []
  let total = 0
  let skillMdCount = 0
  for (const file of files) {
    if (file === null || typeof file !== 'object') {
      throw skillError('E_BAD_REQUEST', 'Invalid file entry')
    }
    const path = assertSkillPath(file.path)
    if (seen.has(path)) throw skillError('E_BAD_REQUEST', `Duplicate file path: ${path}`)
    seen.add(path)
    const size = Number(file.size)
    if (!Number.isInteger(size) || size < 1 || size > MAX_FILE_BYTES) {
      throw skillError('E_TOO_LARGE', `Invalid or oversized file: ${path}`)
    }
    const sha256 = String(file.sha256 ?? '').toLowerCase()
    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      throw skillError('E_CHECKSUM', `Invalid sha256 for ${path}`)
    }
    const url = String(file.url ?? '')
    if (url === '') throw skillError('E_BAD_REQUEST', `Missing URL for ${path}`)
    if (path === 'SKILL.md') {
      skillMdCount += 1
      if (size > MAX_SKILL_MD_BYTES) throw skillError('E_TOO_LARGE', 'SKILL.md is larger than 256 KiB')
    }
    total += size
    if (total > MAX_TOTAL_BYTES) throw skillError('E_TOO_LARGE', 'Version is larger than 20 MiB')
    normalized.push({ path, url, sha256, size })
  }
  if (skillMdCount !== 1) {
    throw skillError('E_FRONTMATTER', 'Version must contain exactly one root SKILL.md')
  }
  return { files: normalized, total }
}

async function validateSkillMd(directory, expectedName) {
  const file = join(directory, 'SKILL.md')
  const info = await stat(file).catch((error) => {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') {
      throw skillError('E_FRONTMATTER', 'SKILL.md is missing')
    }
    throw error
  })
  if (!info.isFile()) throw skillError('E_FRONTMATTER', 'SKILL.md is not a regular file')
  if (info.size > MAX_SKILL_MD_BYTES) throw skillError('E_TOO_LARGE', 'SKILL.md is larger than 256 KiB')
  const text = await readFile(file, 'utf8')
  // Use the same parser/validator as `POST /validate` and the scanner so an
  // install can never accept frontmatter the rest of the plugin rejects.
  const parsed = parseSkillFile(text)
  if (!parsed.ok) {
    throw skillError('E_FRONTMATTER', parsed.error ?? 'Invalid SKILL.md frontmatter')
  }
  const checked = validateFrontmatter(parsed.frontmatter)
  if (!checked.ok) {
    throw skillError('E_FRONTMATTER', checked.error ?? 'Invalid SKILL.md frontmatter')
  }
  const fields = checked.frontmatter
  if (fields.name !== expectedName) {
    throw skillError('E_NAME_MISMATCH', `SKILL.md name "${fields.name}" does not match index name "${expectedName}"`, {
      status: 400,
    })
  }
  return fields
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Create the installer.
 *
 * @param {object} [options]
 * @param {object} options.state state store from `createState()`
 * @param {Function} [options.fetcher] fetch-compatible function (tests inject a fake)
 * @param {unknown} [options.roots] fixed location table; defaults to `defaultSkillRoots()`
 * @param {string|null} [options.dshVersion] running DSH version; unknown disables the check
 */
export function createInstaller(options = {}) {
  const state = options.state
  const fetcher = options.fetcher
  const roots = options.roots === undefined || options.roots === null ? defaultSkillRoots() : options.roots
  const dshVersion = typeof options.dshVersion === 'string' && options.dshVersion.trim() !== ''
    ? options.dshVersion.trim()
    : null

  function requireState() {
    if (state === null || state === undefined || typeof state.recordInstall !== 'function') {
      throw skillError('E_INTERNAL', 'Installer requires a state store')
    }
    return state
  }

  async function backupsDirectory() {
    if (state !== null && state !== undefined) {
      if (typeof state.backupsDir === 'string' && state.backupsDir !== '') return state.backupsDir
      if (typeof state.dir === 'string' && state.dir !== '') return join(state.dir, 'backups')
    }
    return join(resolveDshHome(), 'skills-manager', 'backups')
  }

  async function makeBackupPath(name, extension = '') {
    const directory = await backupsDirectory()
    await ensureDirectory(directory)
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '')
    let candidate = join(directory, `${name}-${stamp}${extension}`)
    for (let index = 1; index < 1000; index += 1) {
      if (!(await pathExists(candidate))) return candidate
      candidate = join(directory, `${name}-${stamp}-${index}${extension}`)
    }
    throw skillError('E_INTERNAL', 'Could not allocate a backup path')
  }

  /**
   * Move a path, falling back to copy+remove across filesystems.
   *
   * EXDEV safety: the move is only complete once `rm(source)` fully succeeds. If the
   * removal fails, the complete copy at `destination` is kept (it may be the only
   * intact copy) and the error is thrown; the caller can then restore from it.
   */
  async function movePath(source, destination) {
    try {
      await rename(source, destination)
      return
    } catch (error) {
      if (error === null || typeof error !== 'object' || error.code !== 'EXDEV') throw error
    }

    const destinationBefore = await lstatOrNull(destination)
    try {
      await cp(source, destination, { recursive: true, force: true, errorOnExist: false })
    } catch (error) {
      // The copy itself failed: drop the partial copy only when nothing existed there
      // before (a restore may legitimately target an existing path).
      if (destinationBefore === null) {
        await rm(destination, { recursive: true, force: true }).catch(() => {})
      }
      throw error
    }

    try {
      await rm(source, { recursive: true, force: true })
    } catch (error) {
      throw skillError(
        'E_INTERNAL',
        `Copied "${source}" to "${destination}" but could not remove the source: ${errorMessage(error)}`,
        { cause: error, source, destination },
      )
    }
  }

  async function pruneBackups(name) {
    const directory = await backupsDirectory()
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return
      throw error
    }
    const pattern = new RegExp(`^${escapeRegExp(name)}-\\d{17}(?:-\\d+)?(?:\\.md)?$`)
    const matches = []
    for (const entry of entries) {
      if (!pattern.test(entry.name)) continue
      const path = join(directory, entry.name)
      const info = await stat(path).catch(() => null)
      matches.push({ path, mtime: info?.mtimeMs ?? 0, name: entry.name })
    }
    matches.sort((left, right) => right.mtime - left.mtime || (left.name < right.name ? 1 : left.name > right.name ? -1 : 0))
    for (const stale of matches.slice(BACKUP_KEEP)) {
      await rm(stale.path, { recursive: true, force: true }).catch(() => {})
    }
  }

  async function resolveWritableRoot(location) {
    const id = String(location ?? '')
    if (READONLY_LOCATIONS.includes(id)) {
      throw skillError('E_READONLY_LOCATION', `Location "${id}" is read-only`)
    }
    if (!WRITABLE_LOCATIONS.includes(id)) {
      throw skillError('E_BAD_REQUEST', `Unknown skill location: ${id}`)
    }
    const info = resolveRootInfo(roots, id)
    if (info === null) throw skillError('E_BAD_REQUEST', `Skill location is not configured: ${id}`)
    if (info.readonly || info.writable === false) {
      throw skillError('E_READONLY_LOCATION', `Location "${id}" is read-only`)
    }
    await mkdir(info.path, { recursive: true })
    const root = await realpath(info.path).catch(() => resolve(info.path))
    return { info, root }
  }

  function buildRecord({ info, root, name, version, sourceId, sourceName, sourceUrl, commit, files }) {
    return {
      location: info.id,
      rootPath: abbreviateHome(root),
      name,
      version,
      sourceId: String(sourceId ?? ''),
      sourceName: String(sourceName ?? ''),
      sourceUrl: String(sourceUrl ?? ''),
      commit: String(commit ?? ''),
      files: files.map((file) => ({ path: file.path, sha256: file.sha256, size: file.size })),
      installedAt: Math.floor(Date.now() / 1000),
      localModified: false,
    }
  }

  async function performInstall(args, mode) {
    const store = requireState()
    const {
      sourceId,
      sourceName,
      sourceUrl,
      skill,
      version,
      location,
      conflict,
      onProgress,
      signal,
    } = args

    const name = resolveSkillName(skill)
    const resolvedVersion = resolveVersion(skill, version)
    assertCompatible(resolvedVersion.entry, resolvedVersion.version, dshVersion)
    const { files } = validateFiles(resolvedVersion.files)
    const { info, root } = await resolveWritableRoot(location)
    const target = join(root, name)
    const flatTarget = `${target}.md`

    const records = typeof store.listInstalled === 'function' ? await store.listInstalled() : []
    const recordBefore = records.find((record) => record.location === info.id && record.name === name) ?? null
    if (mode === 'update' && recordBefore === null) {
      throw skillError('E_NOT_FOUND', 'Install record not found')
    }

    const existing = await lstatOrNull(target)
    const existingFlat = await lstatOrNull(flatTarget)

    if (mode === 'update') {
      if (existing === null || !existing.isDirectory()) {
        throw skillError('E_NOT_FOUND', 'Installed skill directory not found')
      }
    } else if (existing !== null || existingFlat !== null) {
      if (conflict === 'skip') {
        return { skipped: true, name, location: info.id, path: target, version: resolvedVersion.version }
      }
      if (conflict === undefined || conflict === null) {
        throw skillError('E_NAME_TAKEN', `A skill named "${name}" already exists at this location`)
      }
      if (conflict !== 'overwrite') {
        throw skillError('E_BAD_REQUEST', 'conflict must be "overwrite" or "skip"')
      }
    }
    if (existing?.isSymbolicLink() === true || existingFlat?.isSymbolicLink() === true) {
      throw skillError('E_PATH_OUTSIDE_ROOT', 'Install target is a symbolic link')
    }

    // Defensive check (index spec §7): a version label must be immutable. When the
    // persisted record already carries this version, its sha256 manifest must match.
    if (
      recordBefore !== null
      && recordBefore.version === resolvedVersion.version
      && !sameFileManifest(recordBefore.files, files)
    ) {
      throw skillError(
        'E_VERSION_MUTATED',
        `Version ${resolvedVersion.version} of "${name}" no longer matches the installed content`,
        { status: 409 },
      )
    }

    const effectiveSourceUrl = sourceUrl ?? recordBefore?.sourceUrl ?? ''
    const effectiveSourceId = sourceId ?? recordBefore?.sourceId ?? ''
    const effectiveSourceName = sourceName ?? recordBefore?.sourceName ?? ''

    const temporaryParent = join(root, '.skill-manager-tmp')
    // A pre-existing symlink here would redirect the temporary write outside the root.
    await ensureDirectory(temporaryParent)
    const temporary = join(temporaryParent, `${name}-${randomBytes(6).toString('hex')}`)
    await mkdir(temporary)

    let committed = false
    let backup = null
    let flatBackup = null

    /**
     * Undo the moves performed while preparing the backup. Every failure is collected
     * and thrown: a silent restore failure can leave the user without the previous copy.
     */
    const restoreBackups = async () => {
      const failures = []
      if (flatBackup !== null) {
        const from = flatBackup
        try {
          await movePath(from, flatTarget)
          flatBackup = null
        } catch (error) {
          failures.push({ from, to: flatTarget, error })
        }
      }
      if (backup !== null) {
        const from = backup
        try {
          await movePath(from, target)
          backup = null
        } catch (error) {
          failures.push({ from, to: target, error })
        }
      }
      if (failures.length > 0) {
        const detail = failures
          .map((failure) => `${failure.from} -> ${failure.to}: ${errorMessage(failure.error)}`)
          .join('; ')
        throw skillError('E_INTERNAL', `Failed to restore backup(s): ${detail}`, {
          cause: failures[0].error,
          restoreFailures: failures.map((failure) => errorMessage(failure.error)),
        })
      }
    }

    /** Restore backups, then rethrow the original failure (surfacing any restore failure). */
    const failAfterRestore = async (primary) => {
      try {
        await restoreBackups()
      } catch (restoreError) {
        throw skillError(
          'E_INTERNAL',
          `${primary.message} (additionally, restoring the previous skill failed: ${restoreError.message})`,
          { cause: primary, restoreError },
        )
      }
      throw primary
    }

    try {
      let completed = 0
      for (const file of files) {
        const url = resolveFileUrl(file.url, effectiveSourceUrl)
        await downloadFile({
          url,
          destination: safeJoin(temporary, file.path),
          declared: file,
          fetcher,
          signal,
        })
        completed += 1
        report(onProgress, {
          phase: 'download',
          file: file.path,
          completed,
          total: files.length,
          bytes: file.size,
        })
      }

      await validateSkillMd(temporary, name)
      report(onProgress, { phase: 'verify', total: files.length })

      // Moving the old copies aside is part of the same rollback scope: a failure
      // halfway through (e.g. the flat backup) must restore whatever already moved.
      try {
        if (existing !== null) {
          backup = await makeBackupPath(name)
          await movePath(target, backup)
        }
        if (existingFlat !== null) {
          flatBackup = await makeBackupPath(name, '.md')
          await movePath(flatTarget, flatBackup)
        }
      } catch (error) {
        await failAfterRestore(ensureErrorCode(error))
      }

      try {
        await rename(temporary, target)
        committed = true
      } catch (error) {
        await failAfterRestore(skillError(
          'E_INTERNAL',
          `Failed to move the verified skill into place: ${name}`,
          { cause: error },
        ))
      }

      const record = buildRecord({
        info,
        root,
        name,
        version: resolvedVersion.version,
        sourceId: effectiveSourceId,
        sourceName: effectiveSourceName,
        sourceUrl: effectiveSourceUrl,
        commit: resolvedVersion.commit,
        files,
      })

      try {
        await store.recordInstall(record)
      } catch (error) {
        // Roll the directory back so the record and the filesystem never disagree.
        const primary = ensureErrorCode(error)
        let cleanupError = null
        try {
          await rm(target, { recursive: true, force: true })
        } catch (failure) {
          cleanupError = failure
        }
        let restoreError = null
        try {
          await restoreBackups()
        } catch (failure) {
          restoreError = failure
        }
        if (recordBefore !== null) {
          try {
            await store.recordInstall(recordBefore)
          } catch (failure) {
            restoreError = restoreError ?? failure
          }
        }
        if (restoreError !== null) {
          throw skillError(
            'E_INTERNAL',
            `${primary.message} (additionally, restoring the previous install failed: ${errorMessage(restoreError)})`,
            { cause: primary, restoreError, ...(cleanupError !== null ? { cleanupError } : {}) },
          )
        }
        if (cleanupError !== null) {
          throw skillError(
            'E_INTERNAL',
            `${primary.message} (additionally, the incomplete new copy could not be removed: ${errorMessage(cleanupError)})`,
            { cause: primary, cleanupError },
          )
        }
        throw primary
      }

      report(onProgress, { phase: 'done', files: files.length })
      if (backup !== null || flatBackup !== null) await pruneBackups(name)
      return {
        skipped: false,
        name,
        location: info.id,
        path: target,
        rootPath: abbreviateHome(root),
        version: resolvedVersion.version,
        record,
      }
    } finally {
      if (!committed) await rm(temporary, { recursive: true, force: true }).catch(() => {})
    }
  }

  async function install(args = {}) {
    try {
      return await performInstall(args, 'install')
    } catch (error) {
      throw ensureErrorCode(error)
    }
  }

  async function update(args = {}) {
    try {
      return await performInstall(args, 'update')
    } catch (error) {
      throw ensureErrorCode(error)
    }
  }

  async function uninstall(args = {}) {
    try {
      const store = requireState()
      const name = assertSkillName(args.name)
      const { info, root } = await resolveWritableRoot(args.location)
      const records = await store.listInstalled()
      const record = records.find((item) => item.location === info.id && item.name === name)
      if (record === undefined) throw skillError('E_NOT_FOUND', 'Install record not found')

      const target = join(root, name)
      const flatTarget = `${target}.md`
      const disabledDirectory = join(root, '.disabled', name)
      const disabledFlat = join(root, '.disabled', `${name}.md`)

      // A symlinked `.disabled` directory (or entry) would make the deletions
      // below reach outside the skill root. Validate before touching anything so
      // a rejected uninstall leaves the tree unchanged.
      await assertSafeDeleteTarget(root, disabledDirectory, 'Disabled skill copy')
      await assertSafeDeleteTarget(root, disabledFlat, 'Disabled skill copy')

      const existing = await lstatOrNull(target)
      if (existing?.isSymbolicLink() === true) throw skillError('E_PATH_OUTSIDE_ROOT', 'Install target is a symbolic link')
      if (existing !== null) {
        if (args.preserveBackup === true) {
          const backup = await makeBackupPath(name)
          await movePath(target, backup)
        } else {
          await rm(target, { recursive: true, force: true })
        }
      }

      const existingFlat = await lstatOrNull(flatTarget)
      if (existingFlat?.isSymbolicLink() === true) throw skillError('E_PATH_OUTSIDE_ROOT', 'Install target is a symbolic link')
      if (existingFlat !== null) {
        if (args.preserveBackup === true) {
          const backup = await makeBackupPath(name, '.md')
          await movePath(flatTarget, backup)
        } else {
          await rm(flatTarget, { force: true })
        }
      }

      // A disabled copy must not survive an uninstall. When it is the only copy left and the
      // caller asked for a backup, preserve it instead of deleting it.
      if (await pathExists(disabledDirectory)) {
        if (args.preserveBackup === true && existing === null) {
          const backup = await makeBackupPath(name)
          await movePath(disabledDirectory, backup)
        } else {
          await rm(disabledDirectory, { recursive: true, force: true })
        }
      }
      if (await pathExists(disabledFlat)) {
        if (args.preserveBackup === true && existingFlat === null) {
          const backup = await makeBackupPath(name, '.md')
          await movePath(disabledFlat, backup)
        } else {
          await rm(disabledFlat, { force: true })
        }
      }

      await store.removeInstall({ name, location: info.id })
      if (args.preserveBackup === true) await pruneBackups(name)
      return { removed: true }
    } catch (error) {
      throw ensureErrorCode(error)
    }
  }

  return { install, update, uninstall }
}
