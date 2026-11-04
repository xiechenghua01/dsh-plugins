// Machine-wide MCP server library.
//
// The library is the catalog behind "A 工作区配好的服务器，B 工作区一键复用": every MCP
// server row found in either patch layer is mirrored here (config included, verbatim), and any
// other layer can copy an entry back out without the user retyping it.
//
// It lives at `$DSH_HOME/mcp-manager/library.json`, next to the patch files that already hold the
// same secrets. Pure module: no ctx, no I/O at import time.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Library document version. */
export const LIBRARY_VERSION = 1

/** An empty library document. */
export function emptyLibrary() {
  return { version: LIBRARY_VERSION, updatedAt: 0, servers: {} }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeOrigins(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((entry) => typeof entry === 'string' && entry !== ''))]
}

/** Workspace directory paths attached to one server (deduplicated, non-empty strings). */
export function normalizeWorkspaces(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((entry) => typeof entry === 'string' && entry.trim() !== '').map((entry) => entry.trim()))]
}

/**
 * Read the library document; a missing or unreadable file reads as empty.
 * @param {string} file
 */
export async function readLibrary(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return emptyLibrary()
    throw error
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return emptyLibrary()
  }
  if (!isObject(parsed)) return emptyLibrary()
  const servers = {}
  const source = isObject(parsed.servers) ? parsed.servers : {}
  for (const [key, value] of Object.entries(source)) {
    if (!isObject(value)) continue
    const serverName = typeof value.serverName === 'string' && value.serverName !== '' ? value.serverName : key
    servers[serverName] = {
      serverName,
      config: isObject(value.config) ? value.config : {},
      createdAt: Number.isFinite(value.createdAt) ? value.createdAt : 0,
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
      origins: normalizeOrigins(value.origins),
      workspaces: normalizeWorkspaces(value.workspaces),
    }
  }
  return {
    version: LIBRARY_VERSION,
    updatedAt: Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : 0,
    servers,
  }
}

/** Write the library document atomically, creating its directory. */
export async function writeLibrary(file, library) {
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.tmp`
  await writeFile(temporary, `${JSON.stringify(library, null, 2)}\n`, 'utf8')
  await rename(temporary, file)
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function mergeOriginList(current, origin) {
  if (typeof origin !== 'string' || origin === '') return current
  return current.includes(origin) ? current : [...current, origin]
}

/**
 * Insert or refresh one library entry.
 *
 * `workspaces` is the user's workspace-directory attachment. Omitted means "keep what the entry
 * already has"; an explicit array replaces it. `syncLibrary` never touches it, so a reconciling
 * `state` call cannot erase a user's choice.
 *
 * @param {object} library
 * @param {{ serverName: string, config: object, origin?: string, workspaces?: string[] }} server
 * @param {number} now
 * @returns {{ library: object, action: 'inserted'|'updated'|'unchanged' }}
 */
export function upsertServer(library, server, now = Date.now()) {
  const serverName = typeof server.serverName === 'string' ? server.serverName : ''
  if (serverName === '') return { library, action: 'unchanged' }
  const config = isObject(server.config) ? server.config : {}
  const workspaces = Array.isArray(server.workspaces) ? normalizeWorkspaces(server.workspaces) : undefined
  const existing = library.servers[serverName]
  if (existing === undefined) {
    const origins = mergeOriginList([], server.origin)
    return {
      library: {
        ...library,
        version: LIBRARY_VERSION,
        updatedAt: now,
        servers: {
          ...library.servers,
          [serverName]: { serverName, config, createdAt: now, updatedAt: now, origins, workspaces: workspaces ?? [] },
        },
      },
      action: 'inserted',
    }
  }
  const origins = mergeOriginList(existing.origins, server.origin)
  const nextWorkspaces = workspaces === undefined ? normalizeWorkspaces(existing.workspaces) : workspaces
  if (
    sameValue(existing.config, config)
    && sameValue(existing.origins, origins)
    && sameValue(normalizeWorkspaces(existing.workspaces), nextWorkspaces)
  ) {
    return { library, action: 'unchanged' }
  }
  return {
    library: {
      ...library,
      version: LIBRARY_VERSION,
      updatedAt: now,
      servers: {
        ...library.servers,
        [serverName]: { ...existing, config, updatedAt: now, origins, workspaces: nextWorkspaces },
      },
    },
    action: 'updated',
  }
}

/**
 * Remove one library entry.
 * @returns {{ library: object, removed: boolean }}
 */
export function removeServer(library, serverName, now = Date.now()) {
  if (!Object.hasOwn(library.servers, serverName)) return { library, removed: false }
  const servers = { ...library.servers }
  delete servers[serverName]
  return { library: { ...library, version: LIBRARY_VERSION, updatedAt: now, servers }, removed: true }
}

/**
 * Reconcile the library with the rows currently configured in the patch layers.
 *
 * Configured servers are inserted or refreshed; their `origins` become exactly the layers that
 * currently hold them. Entries that no longer appear anywhere stay in the catalog with empty
 * `origins` (the library is a catalog, not a mirror of the patches).
 *
 * @param {object} library
 * @param {Array<{ serverName: string, config: object, origin: string }>} entries
 * @param {number} now
 * @returns {{ library: object, changed: boolean }}
 */
export function syncLibrary(library, entries, now = Date.now()) {
  const nextOrigins = new Map()
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object') continue
    if (typeof entry.serverName !== 'string' || entry.serverName === '') continue
    const list = nextOrigins.get(entry.serverName) ?? []
    nextOrigins.set(entry.serverName, mergeOriginList(list, entry.origin))
  }
  let servers = library.servers
  let changed = false
  for (const [serverName, origins] of nextOrigins) {
    const entry = entries.find((candidate) => candidate.serverName === serverName)
    const existing = servers[serverName]
    const config = isObject(entry.config) ? entry.config : {}
    if (existing === undefined) {
      servers = { ...servers, [serverName]: { serverName, config, createdAt: now, updatedAt: now, origins, workspaces: [] } }
      changed = true
      continue
    }
    if (sameValue(existing.config, config) && sameValue(existing.origins, origins)) continue
    servers = { ...servers, [serverName]: { ...existing, config, updatedAt: now, origins } }
    changed = true
  }
  for (const [serverName, existing] of Object.entries(servers)) {
    if (nextOrigins.has(serverName)) continue
    if (existing.origins.length === 0) continue
    servers = { ...servers, [serverName]: { ...existing, origins: [] } }
    changed = true
  }
  if (!changed) return { library, changed: false }
  return { library: { ...library, version: LIBRARY_VERSION, updatedAt: now, servers }, changed: true }
}

/** Sorted library entries for the wire. */
export function listServers(library) {
  return Object.values(library.servers).sort((left, right) => (left.serverName < right.serverName ? -1 : left.serverName > right.serverName ? 1 : 0))
}
