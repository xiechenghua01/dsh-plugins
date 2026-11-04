/**
 * Local-only helpers: read this machine's real DeepSeek Harness session logs and build
 * the plugin's real Host payloads from them. Used by tools/verify-render.mjs and
 * tools/preview.mjs; neither runs in CI.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))
export const PLUGIN_DIR = join(REPO_ROOT, 'plugins', 'session-stats')
export const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')

function readLog(file) {
  const out = execFileSync('zstd', ['-d', '-c', file], { maxBuffer: 512 * 1024 * 1024 })
  return out.toString('utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

/** Every readable session log under $DSH_HOME/sessions, as the Host halves consume them. */
export function readCorpus(home = DSH_HOME) {
  const sessionsDir = join(home, 'sessions')
  const records = []
  const eventsById = new Map()
  const titles = []
  const snapshots = []
  if (!existsSync(sessionsDir)) return { records, eventsById, titles, snapshots }
  for (const dir of readdirSync(sessionsDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const cwdDir = join(sessionsDir, dir.name)
    for (const entry of readdirSync(cwdDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const logFile = join(cwdDir, entry.name, 'session.v4.jsonl.zstd')
      if (!existsSync(logFile)) continue
      let events
      try {
        events = readLog(logFile)
      } catch {
        continue
      }
      const header = events.find((event) => event.type === 'session')
      if (!header) continue
      eventsById.set(header.id, events.filter((event) => event.type !== 'session'))
      records.push({ header, live: false, persisted: true })
      snapshots.push({ header, revision: `rev-${String(statSync(logFile).size)}`, eventCount: events.length, sizeBytes: statSync(logFile).size })
      const titleEvent = events.filter((event) => event.type === 'session/title').at(-1)
      titles.push({ sessionId: header.id, status: 'fulfilled', value: { session: header, title: titleEvent?.data?.title ? { title: titleEvent.data.title } : undefined } })
    }
  }
  records.sort((left, right) => right.header.createdAt - left.header.createdAt)
  return { records, eventsById, titles, snapshots }
}

/** Build the production Host payloads by mounting the real Host half on a stub Cordis context. */
export async function loadPayloads(pluginDir = PLUGIN_DIR, corpus = readCorpus()) {
  if (corpus.records.length === 0) throw new Error(`no session logs under ${join(DSH_HOME, 'sessions')}`)
  const host = await import(join(pluginDir, 'index.js') + '?v=' + String(Date.now()))
  const routes = new Map()
  const ctx = {
    effect(callback) { callback(); return () => {} },
    interval() { return () => {} },
    get(name) {
      if (name === 'sessionQuery') {
        return {
          listSessions: async () => corpus.records,
          readSession: async (id) => ({ events: corpus.eventsById.get(id) ?? [] }),
          readTitleSnapshots: async () => corpus.titles,
        }
      }
      if (name === 'sessionPersistence') return { list: async () => corpus.snapshots }
      return undefined
    },
    get webServer() { return { register: (route) => { routes.set(route.path, route); return () => {} } } },
    get connection() { return { requestRejection: () => undefined } },
    get sessionQuery() { return this.get('sessionQuery') },
    get sessionPersistence() { return this.get('sessionPersistence') },
  }
  host.apply(ctx, { days: 30, budget: { amount: 10, currency: 'USD', period: 'monthly' } })
  const call = async (path) => {
    const res = { statusCode: 0, headers: {}, body: '', setHeader(name, value) { this.headers[name] = value }, end(chunk) { if (chunk !== undefined) this.body += String(chunk) } }
    await routes.get(path).handler({ method: 'GET', url: path, headers: {} }, res)
    return JSON.parse(res.body)
  }
  return {
    overview: await call('/session-stats/overview'),
    system: await call('/session-stats/system'),
    sessions: corpus.records.length,
    corpus,
  }
}
