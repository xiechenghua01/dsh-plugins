# MCP Manager plugin — implementation contract

`@chengze/dsh-mcp-manager` adds one Settings page (`设置 → MCP 服务`) that owns the MCP
server rows of this Harness. Read this document before touching `index.js`, `lib/*.mjs` or
`client.js`: the wire contracts below are what the Host and browser halves agree on, and what the
parallel work splits rely on.

Verified against DeepSeek Harness `0.2.1-rc.5` (the `dsh` tree shipped inside the desktop app).

---

## 1. Domain facts this plugin is built on

- An MCP server is an ordinary Loader row named `@deepseek-ai/dsh-mcp-client`, one row per server,
  with a `config` object. Its fields are exactly:

  | Field | Type | Default | Meaning |
  |---|---|---|---|
  | `serverName` | string, `[A-Za-z0-9_-]{1,32}` | required | Namespace of the tools (`mcp__<serverName>__<tool>`) |
  | `transport` | `'stdio' \| 'streamable-http'` | required | Wire transport |
  | `command` | string | — | stdio executable |
  | `args` | string[] | — | stdio arguments |
  | `env` | `Record<string,string>` | — | stdio extra env merged over a scrubbed ambient env |
  | `cwd` | string | — | stdio working directory |
  | `url` | string | — | streamable-http endpoint |
  | `headers` | `Record<string,string>` | — | streamable-http extra request headers |
  | `toolCallTimeoutMs` | number | `60000` | Per `tools/call` timeout |
  | `maxInstructionBytes` | number | `32768` | Cap on server instructions |
  | `failOnStartupError` | boolean | `false` | Reject activation when the first connection fails |
  | `reconnect.enabled` | boolean | `true` | Auto reconnect |
  | `reconnect.initialDelayMs` | number | `500` | First reconnect delay |
  | `reconnect.maxDelayMs` | number | `30000` | Backoff ceiling |
  | `reconnect.maxAttempts` | number | `10` | Consecutive failed attempts per outage |

  Two rows with the same `serverName` in one registration scope: the later one fails to load.

- Two writable patch layers, both YAML arrays of Loader patch entries:

  | Scope | File | Effect |
  |---|---|---|
  | `global` | `$DSH_HOME/cordis.patch.yml` | Every profile on this machine (outranks the profile layer) |
  | `workspace` | `$DSH_PROFILE_DIR/cordis.patch.yml` | The current profile only |

  `$DSH_HOME` defaults to `~/.dsh`; `$DSH_PROFILE_DIR` is the profile directory the Host was
  launched with. Both patches are watched by HMR, so writing one recomposes the composition within
  a second or two — no restart, no explicit reload call.

- A patch entry is either an `insert` list item (a new row) or an override (same `id` as an
  existing row). This plugin only ever writes `insert` items, plus `disabled` overrides on its own
  inserts.

- Loader row ids are globally unique in the composition. This plugin names its rows
  `mcp-g-<slug>` (global) and `mcp-w-<slug>` (workspace), where `<slug>` is the lowercased
  `serverName` with non `[a-z0-9-]` characters replaced by `-`. The prefixes also keep the two
  layers from shadowing each other through the home-over-profile override rule.

- The browser half may `require('react')` only; the Host half may import `node:` builtins and
  relative files only. Neither half may import a `@deepseek-ai/*` package.

---

## 2. Files

```
plugins/mcp-manager/
  package.json          package identity, dsh.bundle.patch, dsh.client
  cordis.patch.yml      inserts the `mcp-manager` Host row
  market.json           Discover metadata
  icon.svg
  locale/{en,zh}.json   plugin-manager metadata only (key `meta.*`)
  index.js              Host: HTTP API + row/library orchestration
  lib/patch.mjs         YAML patch text reader/editor (pure, no ctx)
  lib/library.mjs       machine-wide server library file (pure, no ctx)
  lib/probe.mjs         live MCP handshake probe (pure, no ctx)
  client.js             browser half: the Settings page
  selftest.mjs          synthetic checks over the pure helpers
  README.md, CONTRACT.md
```

`index.js` imports `./lib/patch.mjs`, `./lib/library.mjs` and `./lib/probe.mjs`. Keep those three
modules free of `ctx`, `process.cwd()` and top-level side effects so `selftest.mjs` can import them
directly.

---

## 3. Patch text format (`lib/patch.mjs`)

The file is a top-level YAML array. Only two shapes matter here:

```yaml
- insert:
    - id: mcp-w-github
      name: '@deepseek-ai/dsh-mcp-client'
      disabled: false
      config:
        serverName: github
        transport: stdio
        command: npx
        args:
          - '-y'
          - '@modelcontextprotocol/server-github'
        env:
          GITHUB_TOKEN: ghp_xxx
```

and the same item without `disabled` / with an override-shaped sibling (`- id: ...` directly at
the top level, used by other tools). Rules:

- Parse the text into items by indentation: an item starts at a line whose first non-space content
  is `- ` at the array's own indent (the file's top-level array indent, normally 0), and runs until
  the next such line or EOF.
- Classify each item: `insert` (has an `insert:` key), `override` (has a direct `id:` key), or
  `other` (neither, keep verbatim).
- A `insert` item's rows are the list items under `insert:`; each row has `id`, `name`, optional
  `disabled`, optional `config`. Nested lists/maps are indented further.
- Parse `config` into a plain JS object with a small YAML subset parser: block maps, block
  sequences, single/double quoted scalars, plain scalars, booleans, numbers, `null`/`~`, `!!js`
  tagged values (keep as an opaque marker — never evaluate), and empty values. Anything else
  (`{a: b}` flow collections, anchors, multi-line block scalars) must make that row
  `parseable: false` instead of throwing: the row is then listed read-only and never rewritten.
- Editing is **text-surgical**: every untouched byte of the file is preserved, including comments
  and other plugins' rows. Only the item text of the row being created, updated or removed is
  replaced/inserted/removed.
- Serialization of one inserted row is deterministic: 4-space indent for the row under
  `insert:`, 6-space indent for its keys, block sequences for `args`, one `key: value` line per
  map entry, quote strings only when needed. `name` is written last before `config`? No: write
  `id`, `name`, `disabled` (only when true), `config` — in that order.
- Empty file or a file with no items: create the top-level array with a leading comment preserved.
- Atomic write: write `path.tmp` then `rename` over the target. Before the rename, copy the
  previous content to `<path>.bak` (single rolling backup). Create parent directories when missing.

Exports (keep these exact signatures — `index.js` and `selftest.mjs` call them):

```js
export function parsePatch(text)             // -> { items: PatchItem[], errors: string[] }
export function renderInsertRow(row)         // -> string (one row's YAML text, no leading indent)
export function upsertInsert(text, row)      // -> { text, action: 'inserted' | 'updated' | 'unchanged', id }
export function removeInsert(text, id)       // -> { text, removed: boolean }
export function setInsertDisabled(text, id, disabled) // -> { text, action: 'updated' | 'unchanged' | 'missing' }
export function findInsert(text, id)         // -> PatchItem | undefined
export function insertRows(text)             // -> PatchItem[] (only parseable MCP rows)
export function stringifyConfig(config)      // -> string (block YAML for the config value, no key)
```

`PatchItem`:

```js
{
  id, name, disabled,          // booleans/strings as parsed; undefined when absent
  config,                      // parsed object or null
  parseable,                   // false when the row cannot be safely rewritten
  reason,                      // parse failure reason when !parseable
  raw,                         // exact source text of the row (used for read-only display)
  index,                       // item index in the file
  rowIndex,                    // row index inside the insert list
}
```

Round-trip requirement: `upsertInsert(removeInsert(text, id).text, row)` produces a file whose
other items are byte-identical to the original. `selftest.mjs` covers this.

---

## 4. Machine-wide server library (`lib/library.mjs`)

File: `$DSH_HOME/mcp-manager/library.json` (create the directory on first write).

```json
{
  "version": 1,
  "updatedAt": 1793698687874,
  "servers": {
    "github": {
      "serverName": "github",
      "description": "跨业务共享的代码仓库查询服务",
      "config": { "serverName": "github", "transport": "stdio", "command": "npx", "args": [] },
      "extra": {
        "capabilities": { "tools": true, "resources": true, "prompts": false },
        "autoApprove": ["list_issues"],
        "disabledTools": ["delete_repository"],
        "oauth": { "enabled": false, "clientId": "", "scopes": "" },
        "maxRetries": 3
      },
      "createdAt": 1793698687874,
      "updatedAt": 1793698687874,
      "origins": ["workspace:desktop"],
      "workspaces": ["/…/Codes/xch/dsh-plugins", "/…/Codes/knowledge"]
    }
  }
}
```

- `origins` records where the server is currently configured: `global` and/or
  `workspace:<profileName>`. `state` recomputes them from the two patch layers on every call, so a
  server removed from every layer stays in the library with an empty `origins` array (the library is
  a catalog, not a mirror).
- `workspaces` is the user's workspace-directory attachment (absolute paths taken from the
  `workspaceRegistry`). It is **organizational metadata**, not a Loader scope: an MCP row is
  profile-scoped and takes effect for every session of the profile. `syncLibrary` never rewrites
  it; `create` / `update` / `libraryApply` / `setWorkspaces` write it (an omitted value keeps the
  catalog value).
- `description` and `extra` are **catalog-only metadata** the DSH MCP client does not accept in its
  Loader config (`capabilities`, `autoApprove`, `disabledTools`, `oauth`, `maxRetries`). They exist
  so the UI can round-trip the full prototype form; only `config` reaches the Loader. `syncLibrary`
  preserves both.
- Configurations are stored **verbatim**, including env/header values, because the library is what
  makes "A 工作区配好的，B 工作区一键复用" possible. It lives under `$DSH_HOME`, next to the
  patches that already contain the same secrets.

Exports:

```js
export async function readLibrary(file)              // -> library object; missing file -> empty library
export async function writeLibrary(file, library)    // atomic write, creates the directory
export function upsertServer(library, server)        // -> { library, action: 'inserted' | 'updated' | 'unchanged' }
export function removeServer(library, serverName)    // -> { library, removed: boolean }
export function mergeOrigins(library, entries)       // -> new library with origins recomputed from [{ serverName, origin }]
```

---

## 5. Live connection probe (`lib/probe.mjs`)

Implements the MCP handshake directly over `node:child_process` (stdio) and `fetch`
(streamable-http). It must not import `@modelcontextprotocol/client`.

```js
export const DEFAULT_TIMEOUT_MS = 20000
export async function probeServer(config, options)   // -> ProbeResult
// options: { timeoutMs?: number, signal?: AbortSignal, clientName?: string, clientVersion?: string }
```

Protocol steps, in order:

1. `initialize` request with
   `{"protocolVersion":"2026-07-28","capabilities":{},"clientInfo":{"name":"dsh-mcp-manager","version":"<pkg>"}}`.
   Accept any protocol version the server answers with (do not fail on a version mismatch; the
   server's answer is reported).
2. `notifications/initialized` notification.
3. `tools/list` request; count the tools.
4. Close the transport (kill the child; send nothing more over HTTP).
5. Report timing from spawn/POST to the final response.

stdio framing: one JSON object per line on stdin/stdout (newline-delimited JSON), stderr captured
for the error message. `streamable-http`: POST with
`accept: application/json, text/event-stream`, `content-type: application/json`; parse either a
JSON body or an SSE stream (`data:` lines); carry `Mcp-Session-Id` from the initialize response
into later requests; send `MCP-Protocol-Version` after initialize. Non-2xx answers report
`kind: 'http'` with `status`.

Child environment for stdio: the ambient environment minus names matching
`/KEY|PASSWORD|SECRET|TOKEN/i` and names starting with `DSH_` (this mirrors what the real client
does), then the configured `env` merged on top.

`ProbeResult` (exact wire shape; the client renders it):

```json
{
  "ok": true,
  "transport": "stdio",
  "serverName": "github",
  "durationMs": 1234,
  "protocolVersion": "2026-07-28",
  "serverInfo": { "name": "github-mcp", "version": "1.2.3" },
  "capabilities": { "tools": {}, "resources": {} },
  "instructions": null,
  "toolCount": 12,
  "toolNames": ["create_issue", "search"],
  "error": null
}
```

Failure: `ok: false`, all nullable fields `null`, and

```json
{ "error": { "kind": "timeout", "message": "no response within 20000 ms", "status": 401, "hint": "..." } }
```

`kind` ∈ `'invalid-config' | 'spawn' | 'timeout' | 'http' | 'protocol' | 'unknown'`. Never throw
out of `probeServer`; a rejected promise from a sub-step becomes `ok: false`. The child process
must be killed on every path (success, error, timeout, abort) and its `exit`/`close` awaited
briefly so no orphan process survives.

`toolNames` is capped at 50 entries. `instructions` is capped at 500 characters. A failed probe
keeps `durationMs` from the attempt and reports `null` for every unknown field (`toolCount`,
`protocolVersion`, `serverInfo`, `capabilities`, `instructions`), `toolNames: []`, and a classified
`error`; a server that answers `tools/list` with `-32601` is reachable with `toolCount: 0`.

---

## 6. HTTP API (`index.js`)

One route, same-origin, behind the connection trust fence exactly like
`@deepseek-ai/dsh-host-open-in-app` (see `plugins/session-stats/CONTRACT.md` §3.1):

| Method | Path |
|---|---|
| POST | `/mcp-manager/api` |

Request: `{ "op": "<name>", "args": { ... } }`, `content-type: application/json`, body capped at
1 MiB. Response: `{ "ok": true, ... }` or `{ "ok": false, "error": "<message>", "code": "<code>" }`
with `content-type: application/json; charset=utf-8` and `cache-control: no-store`. Non-POST →
`405` + `allow: POST`; rejected trust → the connection's status (401). Never throw out of the
handler; wrap every op in try/catch.

`code` ∈ `'duplicate' | 'invalid' | 'not-found' | 'read-only' | 'conflict' | 'io' | 'unsupported'`.

### `state`

```jsonc
{
  "ok": true,
  "scope": {
    "profile": "desktop", "home": "/…/.dsh",
    "profilePatch": "/…/.dsh/profiles/desktop/cordis.patch.yml",
    "homePatch": "/…/.dsh/cordis.patch.yml",
    "profilePatchExists": true, "homePatchExists": false
  },
  "workspaces": [ { "id": "workspace-…", "path": "/…/Codes/xch/dsh-plugins", "title": "dsh-plugins" } ],
  "rows": [Row],
  "library": [LibraryEntry],
  "warnings": ["global: home patch is not readable: …"],
  "fontSize": 16,                    // fallback only; the client prefers ctx.theme.getTheme().fontSizes.text
  "generatedAt": 1793698687874
}
```

`Row`:

```jsonc
{
  "id": "mcp-w-github",
  "serverName": "github",
  "level": "workspace",              // 'global' | 'workspace'
  "disabled": false,
  "readOnly": false,
  "readOnlyReason": null,            // 'unparseable' when the row's YAML cannot be safely rewritten
  "config": { /* normalized McpConfig */ },
  "transport": "stdio",
  "target": "npx -y @modelcontextprotocol/server-github",   // one-line display target
  "live": { "enabled": true, "phase": "active", "addressable": true },
  "workspaces": ["/…/Codes/xch/dsh-plugins"],   // catalog attachment, [] when unset
  "description": "跨业务共享的代码仓库查询服务",  // catalog-only, '' when unset
  "extra": { "capabilities": {}, "autoApprove": [], "disabledTools": [], "oauth": {}, "maxRetries": 3 },
  "toolCount": 12,                   // number | null: null means "not known yet", not zero
  "registeredTools": [               // derived from the tools DSH already registered; [] when unavailable
    { "name": "create_issue", "description": "Create a repository issue…" }
  ],
  "lastProbe": null,                 // ProbeResult from the in-memory cache; wins over registeredTools
  "updatedAt": 1793698687874
}
```

Rows are ordered `level` (global first) then `serverName`. `live` comes from
`ctx.pluginManager.listPlugins()` filtered by `moduleName === '@deepseek-ai/dsh-mcp-client'`, matched
by `patchId`/`entryId` tail; when the service is unavailable `live` is `null`. `registeredTools` is
derived from `ctx.get('tools') ?? ctx.tools`'s `schemas()`: only `mcp__<serverName>__<tool>` entries
are taken, the prefix is stripped from the name, and descriptions are truncated to 240 characters;
a missing or throwing tool runtime yields `[]`. `toolCount` prefers a **successful** probe's
`toolCount` (a real handshake); otherwise it uses `registeredTools.length` when greater than zero;
when neither is available it is `null` and the client omits the count instead of claiming zero. The
client's expanded row merges `lastProbe` tools first and then `registeredTools`, so a connectivity
test that reuses the live connection (`connectedTools`, no `probeCache` write) still lists tools.
The probe cache is in memory, so a Host reload clears it.

### `create`

args `{ level, config, enabled?, workspaces?, description?, extra? }` → `{ ok: true, row: Row }`.
`workspaces` is an array of absolute workspace directory paths (see §4); an omitted value keeps the
catalog value. `description` / `extra` are catalog-only metadata (see §4).
Validation: `serverName` matches `[A-Za-z0-9_-]{1,32}`, unique across **both** layers (a duplicate
in either layer is `code: 'duplicate'`), `transport` valid, `command` required for stdio, `url`
required and `http(s)://` for streamable-http, `args`/`env`/`headers` shapes correct, numbers
finite and within range, `reconnect` a plain object of the four fields. The row is written to the
`level`'s patch; the config is normalized (trim strings, drop empty optional fields, keep explicit
`false`/`0`). The library is updated in the same call.

### `update`

args `{ id, level, config, enabled?, workspaces?, description?, extra? }` → `{ ok: true, row: Row }`.
The row id never changes. An omitted `workspaces` keeps the catalog value; an explicit array
replaces it; `description` / `extra` behave the same way.
Renaming `serverName` is allowed when the new name is unique across both layers.

### `remove`

args `{ id, level, purge? }` → `{ ok: true }`. Refuses `readOnly` rows with `code: 'read-only'`.
`purge: true` also drops the catalog entry (the prototype's "delete from all workspaces").

### `setEnabled`

args `{ id, level, enabled }` → `{ ok: true, row: Row }`. Writes `disabled: true` (or removes the
`disabled` key) on the insert.

### `setWorkspaces`

args `{ id, level, workspaces }` → `{ ok: true, row: Row }`. Replaces the catalog workspace
attachment of one configured row (the prototype's "管理生效工作区" dialog). The Loader row itself is
untouched.

### `moveLevel`

args `{ id, level, targetLevel }` → `{ ok: true, row: Row }`. Re-creates one configured server in the
other patch layer (fresh row id, same config and disabled state), removes the source row, and keeps
the catalog entry. Refuses when the target layer already holds that `serverName`
(`code: 'duplicate'`) or the source row is read-only. A failed target write restores the source
document.

### `configText`

args `{ level }` → `{ ok: true, level, path, exists, text }`. Returns the raw YAML patch text of one
layer for the read-only config viewer (comments and other plugins' rows included).

### `probe`

args `{ id?, level?, config?, timeoutMs? }` → `{ ok: true, result: ProbeResult }`.
`ProbeResult.tools` is `[{ name, description }]` (description truncated to 240 chars) so the editor's
tool-permission selector can list real tool names without a second round-trip.

> 单层直管：界面不再区分全局/工作区。新增行写入当前 profile 层（`level: 'workspace'`），
> 编辑/删除沿用行自身的 `level`（home 层里已有的行仍可管理）。

### `probe`

args `{ id?, level?, config?, timeoutMs? }` → `{ ok: true, result: ProbeResult }`. With `config`
it probes an unsaved draft; otherwise it probes the stored row. The result is cached in memory
keyed by `${level}:${id}` and returned as `lastProbe` by later `state` calls.

### `probeAll`

args `{ levels?, timeoutMs? }` → `{ ok: true, results: [{ id, level, serverName, result }], startedAt, finishedAt }`.
Probes every **enabled** row (both layers unless `levels` narrows it) with a concurrency of 4 and a
per-probe timeout. Never fails the whole call because one server failed.

### `import`

args `{ level, json, overwrite?, dryRun? }` →
`{ ok: true, added: string[], updated: string[], skipped: [{ serverName, reason }], rows: [Row] }`.
Accepts the JSON shapes in §7. `overwrite: true` replaces an existing row with the same
`serverName` in the target level; otherwise a duplicate is skipped with `reason: 'duplicate'`.
Invalid entries are skipped with their reason, never aborting the batch. `dryRun` validates and
reports without writing.

### `export`

args `{ format?, levels? }` → `{ ok: true, json: string }`. `format` is `'mcpServers'` (default) or
`'full'`; see §7.

### `libraryApply`

args `{ level, serverName, serverNameOverride?, enabled?, workspaces? }` → `{ ok: true, row: Row }`.
Copies a library entry into a layer, including the entry's `workspaces` attachment unless the
caller overrides it. `serverNameOverride` lets the same server be added under a different name
(still unique across both layers).

### `libraryRemove`

args `{ serverName }` → `{ ok: true }`. Removes the catalog entry only; configured rows stay.

### `refresh`

args `{}` → `{ ok: true, rows: [Row], warnings }`. Cheap re-read used by the page's poll.

---

## 7. JSON interchange

Accepted import shapes (all are merged into a normalized `McpConfig` list):

1. `{ "mcpServers": { "github": { "command": "npx", "args": ["-y", "…"], "env": {} } } }`
   (Claude Desktop / Cursor style; `command` ⇒ stdio, `url` ⇒ streamable-http)
2. `{ "mcpServers": { "web": { "type": "streamable-http", "url": "http://…", "headers": {} } } }`
3. `{ "mcpServers": [ { "serverName": "github", "transport": "stdio", … } ] }`
4. `[ { "serverName": "github", … } ]`
5. `{ "servers": [ { "serverName": "github", … } ] }` (this plugin's `format: 'full'` export)
6. one bare `{ "serverName": "github", … }` object

Name resolution: `serverName` → `name` → the `mcpServers` key → `id`. Transport resolution:
explicit `transport`/`type` (`http` ⇒ `streamable-http`, `sse` ⇒ skipped as
`unsupported-transport`), else `command` ⇒ stdio, else `url` ⇒ streamable-http. Names are
normalized to `[A-Za-z0-9_-]{1,32}` (invalid characters become `-`, longer names are truncated);
an empty result is skipped with `invalid-name`.

Export `format: 'mcpServers'`:

```json
{ "mcpServers": { "github": { "type": "stdio", "command": "npx", "args": ["-y", "…"], "env": {} } } }
```

and `format: 'full'`:

```json
{ "version": 1, "exportedAt": 1793698687874, "servers": [ { "serverName": "github", "transport": "stdio", "command": "npx" } ] }
```

Both carry the extended fields (`cwd`, `toolCallTimeoutMs`, `maxInstructionBytes`,
`failOnStartupError`, `reconnect`) when set.

---

## 8. Browser half (`client.js`)

Module shape required by the repository checks:

```js
window.__ModuleLoader__.load({
  id: '@chengze/dsh-mcp-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    // … inline `const zh = { … }` and `const en = { … }` dictionaries (single quotes,
    //    one key per line, each key referenced outside the dictionaries via t('key')) …
    return { inject: ['slots', 'locale', 'theme'], apply(ctx) { /* … */ } }
  },
})
```

`apply(ctx)` registers one Settings section inside `ctx.effect`:

```js
ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section',
  id: 'mcp-manager',
  order: 16,
  label: () => t('section.title'),
  locale: NS,
}, McpPage)), 'mcp-manager: settings section')
```

Data flow: `fetch('mcp-manager/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op, args }) })`
— a **relative** URL (no leading slash). Every call returns the envelope from §6; a `401` renders
the localized unauthorized state. Poll `state` every 4 s while the section is mounted (the live
phase changes when HMR applies a patch), and refetch immediately after every mutation.

### 8.1 Theme and font size

- `inject` must include `theme`. The client reads the live font size from
  `ctx.theme.getTheme().fontSizes.text` (rounded, clamped to 10–24, default 14).
- While the page is mounted, subscribe with `ctx.on('theme/change', (snapshot) => …)` and update
  the page when `snapshot.fontSizes.text` changes; dispose the subscription on unmount. A font
  change must apply without reopening the page.
- The Host `state.fontSize` (read from the `ui-theme` patch row) is a **fallback only**: use it
  when the theme service or `fontSizes.text` is unavailable.
- The page root sets `--ds-fs: <fontSize>px`. Every font size in the plugin derives from
  `--ds-fs` via the seven-step scale in design.md §3.3; `--dsh-content-font-size` may only appear
  as the fallback in the `--ds-fs` definition.
- Detached layers (the tooltip layer and any future overlay) copy the current `--ds-fs` when
  created and keep following the plugin's current font size while visible (design.md §3.7).

### 8.2 UI surfaces

- Page: settings-embedded content column (design.md §4.4). Header = title + help + search +
  "refresh" icon button + "test all" icon button + "add" primary button; warning/error banners;
  list; toasts.
- The page is **single-profile**: no scope filter, workspace binding, server library, or
  import/export UI.
- Row: status dot, `serverName`, transport chip, optional read-only chip, optional latency, tool
  count, one-line target, and exactly **3** inline icon buttons: enable/disable, edit, delete.
  There is **no** per-row test button; testing is available from the editor's "test connectivity"
  button and the header's "test all".
- Editor dialog (create/edit): form and JSON tabs; fields, validation, clean-config and tool
  permission rules live in DESIGN.md §1.3 / §2.5. It uses the settings-page-embedded dialog tier:
  **640px** max width, clamped to the viewport.
- Delete confirmation: confirm dialog tier: **480px** max width, clamped to the viewport.
- Tooltip: one page-wide instance; hover or keyboard focus, **300ms** delay; hidden on
  leave/press/scroll/view switch. Visual specs: design.md §7.7.
- Dialog stacking, Escape and focus return: design.md §7.6 / §9.3.

Visual specs (colors, radii, spacing, icon sizes, hover/pressed states) are **not** part of this
contract: see design.md §2, §7, §9 and DESIGN.md for the business mapping.

### 8.3 Shared rules

- Every visible string goes through `t()`; the inline `zh` / `en` dictionaries must have
  identical key sets and no unreferenced keys. The authoritative copy mapping is DESIGN.md §3.
- Prefix every class with `mm-`; inject one `<style>` element inside `apply` and remove it in the
  disposer.
- Use only `--dsw-*` tokens for color, border and radius; no literal color values.
- Keep the component free of side effects outside its own state and the API calls.

---

## 9. Verification

```bash
node --check plugins/mcp-manager/index.js
node --check plugins/mcp-manager/client.js
node --check plugins/mcp-manager/lib/patch.mjs
node --check plugins/mcp-manager/lib/probe.mjs
node --check plugins/mcp-manager/lib/library.mjs
pnpm test                      # repository checks + this plugin's selftest
```

Live check (needs the desktop app): install with
`plugin_manager action=install_bundle target=<repo>/plugins/mcp-manager`, refresh the GUI, open
`设置 → MCP 服务`. A `curl -i -X POST http://127.0.0.1:<port>/mcp-manager/api` without the
authenticated cookie must answer `401`; with the page open, every mutation must show up in the list
after the automatic refetch.

Never write a real home path into a committed file (the repository check rejects `/Users/…` and
`/home/…`); use placeholders like `/…/.dsh` in docs.
