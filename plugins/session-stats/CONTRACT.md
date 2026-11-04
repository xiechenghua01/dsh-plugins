# Session Stats plugin — implementation contract

This document records the implementation contract and the platform facts this plugin was verified
against: DeepSeek Harness `0.2.1-rc.5` (the shipped `dsh` packages inside the desktop app) and real
session data on the development machine. Read it before changing `index.js` or `client.js`: the
wire contracts in sections 4 and 5 are what the host and browser halves agree on.

The package is `@xiechenghua01/dsh-session-stats`, served from this repository's plugin market
index. Paths below are relative to this plugin directory.

---

## 1. Hard rules (from the plugin-development skill references)

- Host half: `export function apply(ctx, config)`, optional `export const inject = [...]`,
  `export const name = '...'`. Register **every** resource inside `apply` through
  `ctx.effect(...)` and return its disposer.
- **No `Config` export.** The bundle declares no npm dependencies (a `@deepseek-ai/*`
  dependency would not resolve from the profile). Read tunables from the `config`
  object the Loader passes to `apply` and merge over defaults yourself. Never throw on
  unknown config keys.
- Client half: a lazy factory registered on `window.__ModuleLoader__.load({ id, factory })`;
  `factory(require)` returns `{ inject, apply }`. Keep the factory free of side effects.
- Client: do **not** import any `@deepseek-ai/*` module (`@deepseek-ai/dsh-client-ui-primitives`
  included). Only `require('react')`. No second React, no CDN, no `document.body` writes,
  no iframe, no DOM reads of other plugins.
- Style **only** with `--dsw-*` theme tokens (list below). No literal colors except inside
  SVG artwork/icon paths, which may use `currentColor` and one brand accent, and the eight
  `--ss-series-1..8` data-visualization colors defined on `.ss-page`: a multi-model chart
  needs several distinguishable hues in both light and dark mode.
- Every visible string goes through the client locale service; no hard-coded UI text.
- Do not append session events. Do not write to `document` outside your own component/style.

## 2. Theme tokens available (`--dsw-alias-*` / `--dsw-specific-*`)

```
--dsw-alias-bg-base            --dsw-alias-bg-layer-1         --dsw-alias-bg-layer-2
--dsw-alias-bg-overlay         --dsw-alias-border-l1          --dsw-alias-border-l2
--dsw-alias-brand-primary      --dsw-alias-label-primary      --dsw-alias-label-secondary
--dsw-alias-state-error-primary--dsw-alias-state-idle-primary --dsw-alias-state-success-primary
--dsw-alias-state-warn-primary --dsw-specific-sidebar-fill
```
Host pages also use these non-alias tokens freely (they are theme-defined):
`--dsw-alias-label-tertiary`, `--dsw-alias-label-caption`, `--dsw-alias-border-l3`,
`--dsw-alias-border-l4`, `--dsw-alias-interactive-bg-hover`,
`--dsw-alias-state-business-primary`, `--dsw-focus-ring-color`, `--dsw-radius-sm`,
`--dsw-font-family`, `--dsh-frame-top-clearance`. Prefer the `--dsw-alias-*` ones.

## 3. Host half (`index.js`) — required shape

```js
import { cpus, freemem, homedir, loadavg, totalmem, uptime } from 'node:os'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export const name = 'session-stats'
export const inject = ['webServer', 'connection', 'sessionQuery', 'sessionPersistence']

export function apply(ctx, config) { /* ... */ }
// plus exported pure helpers for offline verification of the payload builders:
export function computeOverview(input) { /* ... */ }
export function computeSystem(input) { /* ... */ }
```

### 3.1 Routes (registered on `ctx.webServer`, behind the connection trust fence)

Two `kind: 'exact'` routes. Mirror `@deepseek-ai/dsh-host-open-in-app/lib/index.js`
(lines ~1160-1404) exactly for the fence and JSON helpers:

```js
const connectionOf = (ctx) => Reflect.get(ctx, 'connection')
const rejected = (req, res) => {                      // true => already answered
  const rejection = connectionOf(ctx).requestRejection(req)
  if (rejection === undefined) return false
  res.statusCode = rejection; res.end(); return true
}
```

| Method | Path | Body |
|---|---|---|
| GET | `/session-stats/overview` | `overview` payload (§4) |
| GET | `/session-stats/system` | `system` payload (§5) |

Both: `content-type: application/json; charset=utf-8`, `cache-control: no-store`;
non-GET → `405` + `allow: GET`. Wrap the computation in try/catch → `500` with
`{ code, message }`. A route must never throw out of the handler.

### 3.2 Reading real session data

```js
const records = await ctx.sessionQuery.listSessions()   // SessionRecord[] newest-first
// SessionRecord = { header: {id, createdAt, cwd?, parentSession?, origin?, agentPreset?},
//                   live: boolean, persisted: boolean, formatStatus? }
const snapshot = await ctx.sessionQuery.readSession(record.header.id)
// { session: header, inheritedEventCount, events: SessionEvent[] }
// SessionEvent = { type, seq, time, data, ignorable? }
```
Token usage lives on `assistant/message` events only:
```js
event.type === 'assistant/message'
event.data.usage = { inputTokens, outputTokens, totalTokens?,
                     cacheReadTokens?, cacheWriteTokens?, reasoningTokens? }
event.data.message.source = { kind: 'model', provider, model }
event.time // epoch ms
```
`totalTokens` already equals input + output + cacheRead when present; when absent compute
`inputTokens + outputTokens + (cacheReadTokens||0) + (cacheWriteTokens||0)`.

Titles: `await ctx.sessionQuery.readTitleSnapshots(ids)` →
`[{ sessionId, status: 'fulfilled', value: { session, title? } } | { sessionId, status: 'rejected', reason }]`.
`title` is `{ title, ... }`. Missing/rejected ⇒ `title: null` (client falls back to the id).

Log sizes: `await ctx.sessionPersistence.list()` → `[{ header, revision, eventCount?, sizeBytes? }]`.
Also `stat(id)` for a single revision. Use `sizeBytes` when present.

**Model-day fold.** `summarizeSession` also records `perModelDay` (model key → local day
key → token vector, cost, requests). `computeOverview` folds it per timeline bucket into
`models[].daily`, keeping the cached per-session summary a set of aggregates only.

**Cost/caching.** Reading every log on every request is too slow. Keep a per-session cache
keyed by session id, validated by `revision` from `sessionPersistence.list()` (its documented
purpose: "equal revisions may be treated as an unchanged log"). Cache shape
`{ revision, summary }`. Cache the whole overview for `overviewCacheMs` (default 15000) and
the system payload for `systemCacheMs` (default 1000). Purge cache entries for ids that
disappeared.

**Resilience.** One unreadable session must not fail the payload: catch per session and
emit `error: 'unreadable'` with zeroed tokens. If `sessionPersistence` is absent at runtime
(`ctx.get('sessionPersistence')` undefined) still return data with `logs.available = false`.

### 3.3 CPU / memory sampling

`process.cpuUsage()` and `cpus()` are deltas, so keep a sampler started in `apply`:

```js
export const inject = ['webServer', 'connection', 'sessionQuery', 'sessionPersistence', 'timer']
const sample = () => { /* compute deltas vs previous sample, push into a ring buffer */ }
ctx.effect(() => ctx.timer.interval(sample, 2000), 'session-stats: cpu sampler')  // returns disposer
```
`ctx.timer.interval(cb, ms)` is the `timer` service (`@deepseek-ai/cordis-plugin-timer`); the
service is only readable when `timer` is declared in `inject` — reading `ctx.timer` or the
mixed-in `ctx.interval` otherwise throws `cannot get property "timer" without inject`.
`interval()` returns the disposer of the effect it registers; the outer `ctx.effect` also
disposes it when the bundle is unloaded or reloaded. Compute:
- process percent = `(deltaUser + deltaSystem) / (deltaWallMicros) * 100` (one core = 100%),
  clamp 0..100.
- system percent from summed `cpus()` times deltas (idle vs total), clamp 0..100.
- keep the last 60 samples (`{t, process, system}`) as `history`.
The first sample after activation has no previous snapshot: report `null` for percent and
fill history only once a delta exists.

### 3.4 Log footprint

Resolve the DSH home once: `process.env.DSH_HOME || join(homedir(), '.dsh')`.
Best-effort recursive byte walk (bounded: max 20k entries, 2s budget) over existing
subdirectories: `sessions`, `storages`, `attachments`, `spill` — missing dirs contribute 0.
The session-log number comes from `sessionPersistence` (`sizeBytes` sum); the walk's
`sessions` figure is only a cross-check. Never throw: on any fs error mark that entry
`available: false`.

## 4. `overview` payload (exact wire contract — the client depends on it)

```jsonc
{
  "generatedAt": 1793698687874,
  "currency": "USD",
  "days": 30,
  "pricing": {
    "currency": "USD",
    "per": "millionTokens",
    "default": { "input": 0.28, "output": 0.42, "cacheRead": 0.028, "cacheWrite": 0.28 },
    "models": { "group/deepseek-v4.1-flash": { "input": 0.28, "output": 0.42, "cacheRead": 0.028, "cacheWrite": 0.28 } }
  },
  "totals": {
    "sessions": 3, "liveSessions": 1, "turns": 5, "requests": 74,
    "tokens": { "input": 390792, "output": 38326, "cacheRead": 3908352,
                "cacheWrite": 0, "reasoning": 0, "total": 4337470 },
    "cost": 1.234567
  },
  "budget": {
    "amount": 10, "currency": "USD", "period": "monthly",
    "used": 1.234567, "ratio": 0.1234567, "remaining": 8.765433,
    "periodStart": 1793462400000, "periodLabel": "2026-11",
    "withinPeriodTokens": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0,
                            "reasoning": 0, "total": 0 },
    "withinPeriodCost": 0
  },
  "timeline": {
    "granularity": "day",
    "buckets": [ { "key": "2026-11-03", "start": 1793462400000,
                   "tokens": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0,
                               "reasoning": 0, "total": 0 },
                   "cost": 0.4, "requests": 3, "sessions": 2 } ]
  },
  "models": [ { "provider": "magpie", "model": "group/deepseek-v4.1-flash",
                "requests": 40,
                "tokens": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0,
                            "reasoning": 0, "total": 0 },
                "cost": 0.9,
                "window": { "tokens": 1234567, "cost": 0.31, "requests": 12 },
                "daily": [ { "key": "2026-11-03", "start": 1793462400000,
                             "tokens": 0, "cost": 0, "requests": 0 } ] } ],
  "sessions": [ {
    "id": "session-...", "title": "…" , "createdAt": 1793697469184,
    "updatedAt": 1793757595111, "live": false,
    "turns": 2, "requests": 33,
    "tokens": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0,
                "reasoning": 0, "total": 0 },
    "cost": 0.5, "logBytes": 123456, "eventCount": 386,
    "models": ["group/deepseek-v4.1-flash"], "error": null
  } ]
}
```

Rules:
- `timeline.buckets` covers exactly the last `days` **local** days, oldest → newest,
  including empty days, so the client can render a fixed axis. `days` comes from the
  `days` query parameter (1..365, default from config `days`, default 30).
- Bucket `key` = local `YYYY-MM-DD`; `start` = local midnight epoch ms.
- A session appears in `sessions` even when it has no usage (`requests: 0`).
- `sessions` sorted by `cost` desc, then `tokens.total` desc, then `createdAt` desc.
- `totals` sums **all** sessions ever, not just the timeline window.
- `budget.used` / `withinPeriod*` count only events inside the budget period
  (`period: 'monthly' | 'weekly' | 'daily' | 'total'`), where `monthly` starts at local
  midnight of the 1st. `ratio = used / amount` (0 when `amount <= 0`).
- Round money to 6 decimals, `ratio` to 6 decimals. Never emit `NaN`/`Infinity`/`-0`;
  sanitize every number (`Number.isFinite(x) ? x : 0`).
- `pricing.models` is the merged effective table (config overrides over defaults), so the
  client can show which rate was applied.
- `models[]` carries all-time totals (`requests`, `tokens`, `cost`) **and** the window
  view: `window` is the sum over exactly the timeline buckets and `daily` is one entry per
  bucket, aligned index-for-index with `timeline.buckets` (same `key`/`start`), so the
  trend chart can plot one series per model without re-deriving days client-side.
- `models[].daily[].tokens` is a plain token count (not a vector). Model-less
  `assistant/message` events stay in the timeline/totals but belong to no model row; the
  client folds that remainder, plus any model beyond the top six, into its "other" series.

## 5. `system` payload

```jsonc
{
  "generatedAt": 0,
  "cpu": {
    "process": { "percent": 3.2, "userMs": 120, "systemMs": 40 },
    "system": { "percent": 12.4, "cores": 10, "load1": 1.2, "load5": 1.0, "load15": 0.8 },
    "memory": { "rssBytes": 0, "heapUsedBytes": 0, "heapTotalBytes": 0, "externalBytes": 0 },
    "systemMemory": { "totalBytes": 0, "freeBytes": 0, "usedRatio": 0.6 },
    "uptimeSeconds": 0,
    "history": [ { "t": 0, "process": 3.2, "system": 12.4 } ]
  },
  "logs": {
    "home": "/Users/…/.dsh",
    "available": true,
    "sessionLog": { "bytes": 420000, "count": 3, "eventCount": 1000,
                    "largest": [ { "id": "session-…", "title": null, "bytes": 200000 } ] },
    "storage":  { "bytes": 24000, "entries": [ { "name": "session_projcache", "bytes": 24576 } ] },
    "attachments": { "bytes": 0 },
    "spill": { "bytes": 0, "files": 0 },
    "totalBytes": 444000
  }
}
```
`cpu.process.percent` / `cpu.system.percent` may be `null` before the first delta.
`logs.largest` = top 5 sessions by `sizeBytes`.

## 6. Host config defaults (merge over the row's `config`)

```js
const DEFAULTS = {
  days: 30,
  budget: { amount: 10, currency: 'USD', period: 'monthly' },
  pricing: {
    default: { input: 0.28, output: 0.42, cacheRead: 0.028, cacheWrite: 0.28 },
    models: {},                     // exact model id -> partial rate override
  },
  overviewCacheMs: 15000,
  systemCacheMs: 1000,
  logCacheMs: 10000,     // the bounded on-disk walk, separate from the 2 s CPU poll
  sampleMs: 2000,
}
```
Deep-merge `config` over `DEFAULTS` (shallow per sub-object is fine). Accept
`budget.amount: 0` to mean "no budget" (`ratio: 0`, `remaining: 0`).

## 7. Client half (`client.js`) — required shape

```js
window.__ModuleLoader__.load({
  id: '@xiechenghua01/dsh-session-stats',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    // ...components...
    return { inject: ['slots', 'locale'], apply(ctx) { /* ... */ } }
  },
})
```

`apply(ctx)` must, inside `ctx.effect(...)`:
1. `ctx.locale.register('session-stats', { zh, en })` — flat `key: string` dicts, same key
   set in both. Placeholder interpolation is `{name}`.
2. Insert one `<style>` element (create it in `apply`, remove in the disposer) holding all
   CSS. Class names prefixed `ss-`.
3. `const t = ctx.locale.bind('session-stats')`.
4. Register the page:
```js
ctx.slots.inject('main', () => ctx.slots.register({
  name: 'main', key: 'session-stats', locale: 'session-stats',
  inject: () => ({ t, load: fetchJson }),
}, StatsPage))
```
5. Register the sidebar-foot entry (id **must** equal the main key). The account menu
   (`settings.launcher`) has no list extension point, so the entry lives in
   `sidebar.footer.action`, directly above the account menu at the sidebar foot:
```js
ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
  name: 'sidebar.footer.action', id: 'session-stats', order: 10,
  locale: 'session-stats', label: () => t('panel.title'),
  inject: () => ({ t, openPanel: () => ctx.layout.selectPanel('session-stats') }),
}, FooterEntry))
```
The client plugin therefore injects `layout` in addition to `slots` and `locale`.
`FooterEntry` receives the owner's `{ wide }` plus `{ t, openPanel }`: wide renders the
icon and the panel title, the 56px rail renders the icon only; clicking selects the main
panel through `ctx.layout.selectPanel`.

Data loading: `fetch('session-stats/overview?days=' + days)` — **relative** URL, no leading
slash (the document mount prefix is preserved), `headers: { accept: 'application/json' }`.
Same for `session-stats/system`. Never throw from render: keep `{status, data, error}` state.
Poll `system` every 2000 ms while mounted, `overview` every 30000 ms, and expose a manual
Refresh button. Clear every timer in the effect cleanup. Abort in-flight requests on unmount.
If `response.status === 401` show the localized "not authorized" state instead of a raw error.

### 7.1 Page layout (copy the host page shell)

```
section.ss-page  (width:100%; min-width:0; height:100%; min-height:0; display:flex;
                  overflow:hidden; background:var(--dsw-alias-bg-base);
                  color:var(--dsw-alias-label-primary); font-size:14px; line-height:1.6)
  div.ss-scroll (flex:1; min-height:0; overflow:auto; scrollbar-gutter:stable)
    div.ss-content (max-width:1040px; margin:0 auto; padding:0 clamp(24px,4vw,48px) 48px)
      header.ss-heading (display:flex; justify-content:space-between; align-items:center;
                         gap:16px; flex-wrap:wrap; padding-top:28px; margin-bottom:24px)
        h1 (font-size:20px; font-weight:500; line-height:28px; margin:0)
        right side: last-updated text + Refresh button
      ...sections...
```
Add `[data-platform=darwin]` top clearance exactly like the host page:
`@media` is not needed — a plain rule
`[data-platform='darwin'] .ss-heading { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)) }`.

Sections required (each a `section.ss-card` or heading + grid):
1. **Summary cards** (responsive grid, 4 cards): 总 token / 会话数 / 估算成本 / 预算.
   Budget card shows `used / amount`, a progress bar (`width: ratio*100%` clamped 0..100),
   remaining, period label; bar turns `--dsw-alias-state-warn-primary` at ≥80 % and
   `--dsw-alias-state-error-primary` at ≥100 %.
2. **Token timeline**: pure-SVG bar chart, one bar per day (last `days`), stacked
   input/output/cacheRead, `viewBox` sized to the bucket count, `preserveAspectRatio="none"`
   for the plot only (keep text un-stretched by rendering labels as HTML below the SVG).
   Each bar carries `<title>` with the localized date + token count + cost. Empty state when
   every bucket is zero.
3. **Per-session table**: title (fallback = short id), created date, requests, total tokens,
   in/out/cache split, cost, log size. Sortable by cost / tokens / size via a small
   segmented control; default cost desc. Cap the rendered rows at 50 with a localized
   "showing N of M" note.
4. **Model breakdown**: rows of provider/model, requests, tokens, cost, share bar.
5. **Runtime (CPU)**: process % / system % / cores / load average / RSS / heap / uptime,
   plus a small SVG sparkline of `cpu.history`.
6. **Log footprint**: total bytes, session-log bytes + count + largest 5, storage entries,
   attachments, spill. Human-readable sizes (B/KiB/MiB/GiB).
Show a localized skeleton/loading state, and a localized error state with Retry.

Number formatting: use `Intl.NumberFormat` from the current locale (`ctx.locale.getSnapshot()`
gives the active id — or just use `document.documentElement.lang` fallback `zh-CN`); compact
token counts (`1.2M`), 2-4 decimals for USD (`$0.0123`).

### 7.2 Accessibility / behaviour
- The page is a `section` with `aria-label={t('panel.title')}`.
- The Refresh button is a real `<button type="button">` with `aria-label`.
- Trend hit regions are focusable `<button>`s carrying an `aria-label` with the day total
  and per-series values, so the daily detail is keyboard reachable; the visual tooltip
  stays `aria-hidden`. The chart itself is a `role="img"` with a title/window label.
- Progress bars use `role="progressbar"` with `aria-valuenow/min/max`.
- No keyboard traps; no focus stealing on poll.
- Light and dark must both work: only tokens, no literal colors.

## 8. Locale keys

The `locale/*.json` files feed the plugin manager's metadata only; the client registers its own
dictionaries in `client.js`. Both halves must use the same key set. Use these keys:

```
panel.title  panel.description  action.refresh  state.loading  state.error
state.retry  state.unauthorized  state.empty  updated.at  summary.tokens
summary.tokensHint  summary.tokensSpark  summary.costSpark  summary.sessions
summary.sessionsHint  summary.cost  summary.costHint  summary.budget
summary.budgetHint  summary.remaining  summary.noBudget  chart.title  chart.window
chart.modeModel  chart.modeType  chart.total  chart.other  chart.legend  chart.hint
chart.empty  chart.allHidden  chart.input  chart.output  chart.cacheRead
sessions.title  sessions.empty  sessions.showing  sessions.more  table.session  table.created
table.requests  table.tokens  table.split  table.cost  table.logSize  table.sortCost
table.sortTokens  table.sortSize  table.untitled  models.title  models.empty
models.share  models.window  models.shareTokens  models.sparkline  runtime.title
runtime.process  runtime.system  runtime.cores  runtime.load  runtime.rss
runtime.heap  runtime.uptime  runtime.sparkline  runtime.peak  runtime.unavailable
logs.title  logs.total  logs.sessionLog  logs.sessions  logs.largest  logs.storage
logs.attachments  logs.spill  logs.available  logs.unavailable  unit.tokens  unit.ms
unit.seconds
```

## 9. Verification

```bash
node --check index.js
node --check client.js
node -e "import('./index.js').then(m => console.log(Object.keys(m).sort()))"
pnpm test                # repository: plugin checks + this plugin's synthetic selftest
node tools/verify-render.mjs   # local: real session logs, full payload + render checks
node tools/preview.mjs         # local: static panel preview at .preview/session-stats.html
```

`computeOverview({ records, eventsById, titles, sizes, now, config })` must be callable
without a Cordis context and must return the §4 shape. Keep it pure: no `ctx`, no I/O,
no `Date.now()` (take `now`), no `process.env`.

The repository's `pnpm run check` repeats the structural checks that apply to every plugin
(`node --check`, host exports, client module id and `require` set, locale parity);
`pnpm run validate` checks the published plugin market index.
