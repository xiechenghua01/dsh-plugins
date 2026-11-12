// Synthetic self-test for the MCP Manager plugin.
//
// `pnpm test` runs `run(report)` with synthetic input only: no user files, no network, no
// Harness runtime. Payload/parsing logic and UI contracts must both hold in CI.

import { nextRowId, normalizeConfig, parseImportJson, toDesktopEntry } from './index.js'
import {
  insertRows,
  parsePatch,
  removeInsert,
  renderInsertRow,
  setInsertDisabled,
  upsertInsert,
} from './lib/patch.mjs'
import { emptyLibrary, removeServer, syncLibrary, upsertServer } from './lib/library.mjs'
import { runUiContract } from './tests/ui-contract.mjs'
import { runCopyContract } from './tests/copy-contract.mjs'

function expect(report, condition, message) {
  if (!condition) report(message)
}

function expectThrows(report, fn, message) {
  try {
    fn()
    report(message)
  } catch {
    /* expected */
  }
}

const DOCUMENT = `# hand-written layer
- id: ui-theme
  name: '@deepseek-ai/dsh-client-ui-theme'
  config:
    preference: dark
- insert:
    - id: mcp-w-github
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: github
        transport: stdio
        command: npx
        args:
          - '-y'
          - '@modelcontextprotocol/server-github'
        env:
          GITHUB_TOKEN: ghp_example
        reconnect:
          enabled: true
          maxAttempts: 3
`

export async function run(report) {
  // ---- patch document parsing -------------------------------------------
  const parsed = parsePatch(DOCUMENT)
  expect(report, parsed.errors.length === 0, `patch parse reported errors: ${parsed.errors.join('; ')}`)
  expect(report, parsed.items.length === 2, `expected 2 top-level items, got ${parsed.items.length}`)
  expect(report, parsed.items[0].kind === 'override', 'the first item should classify as an override')
  expect(report, parsed.items[1].kind === 'insert', 'the second item should classify as an insert')

  const rows = insertRows(DOCUMENT)
  expect(report, rows.length === 1, `expected one MCP row, got ${rows.length}`)
  const github = rows[0] ?? {}
  expect(report, github.id === 'mcp-w-github', 'the MCP row id should be mcp-w-github')
  expect(report, github.config?.serverName === 'github', 'the MCP row serverName should parse')
  expect(report, github.config?.transport === 'stdio', 'the MCP row transport should parse')
  expect(report, Array.isArray(github.config?.args) && github.config.args.length === 2, 'the MCP row args should parse')
  expect(report, github.config?.env?.GITHUB_TOKEN === 'ghp_example', 'the MCP row env should parse')
  expect(report, github.config?.reconnect?.maxAttempts === 3, 'the nested reconnect value should parse')

  // ---- text-surgical editing --------------------------------------------
  const added = upsertInsert(DOCUMENT, {
    id: 'mcp-w-fs',
    name: '@deepseek-ai/dsh-mcp-client',
    config: { serverName: 'fs', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'] },
  })
  expect(report, added.action === 'inserted', `upsertInsert should insert, got ${added.action}`)
  expect(report, added.text.includes('# hand-written layer'), 'the leading comment must survive an insert')
  expect(report, added.text.includes("name: '@deepseek-ai/dsh-client-ui-theme'"), 'an unrelated row must survive an insert')
  expect(report, insertRows(added.text).length === 2, 'the inserted document should hold two MCP rows')

  const updated = upsertInsert(DOCUMENT, {
    id: 'mcp-w-github',
    name: '@deepseek-ai/dsh-mcp-client',
    disabled: true,
    config: { serverName: 'github', transport: 'stdio', command: 'node', args: ['server.js'] },
  })
  expect(report, updated.action === 'updated', `upsertInsert should update, got ${updated.action}`)
  const updatedRows = insertRows(updated.text)
  expect(report, updatedRows.length === 1, 'an update must not duplicate the row')
  expect(report, updatedRows[0]?.config?.command === 'node', 'an update must replace the config')
  expect(report, updatedRows[0]?.disabled === true, 'an update must write disabled: true')

  const disabled = setInsertDisabled(DOCUMENT, 'mcp-w-github', true)
  expect(report, disabled.action === 'updated', 'setInsertDisabled(true) should update')
  expect(report, insertRows(disabled.text)[0]?.disabled === true, 'setInsertDisabled(true) must persist')
  const enabled = setInsertDisabled(disabled.text, 'mcp-w-github', false)
  expect(report, insertRows(enabled.text)[0]?.disabled === undefined, 'setInsertDisabled(false) must clear the flag')

  const removed = removeInsert(DOCUMENT, 'mcp-w-github')
  expect(report, removed.removed === true, 'removeInsert should report a removal')
  expect(report, insertRows(removed.text).length === 0, 'removeInsert must drop the row')
  expect(report, removed.text.includes("name: '@deepseek-ai/dsh-client-ui-theme'"), 'removeInsert must keep unrelated rows')
  expect(report, removeInsert(DOCUMENT, 'mcp-w-missing').removed === false, 'removeInsert must report a missing row')

  // A hand-written comment after the insert item belongs to the file, not the row.
  const commented = removeInsert(`${DOCUMENT}# keep me\n`, 'mcp-w-github')
  expect(report, commented.text.includes('# keep me'), 'removeInsert must keep a trailing comment')

  // A file with no insert item gains one on the first write.
  const fresh = upsertInsert('[]\n', { id: 'mcp-g-web', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'web', transport: 'streamable-http', url: 'http://127.0.0.1:3000/mcp' } })
  expect(report, fresh.action === 'inserted', 'upsertInsert must create an insert item on an empty document')
  expect(report, insertRows(fresh.text).length === 1, 'the created item must parse back')
  expect(report, !fresh.text.trimStart().startsWith('[]'), 'a `[]` document must be replaced, not prefixed')

  // Removing the last row leaves a valid top-level array rather than an empty file.
  const emptied = removeInsert(fresh.text, 'mcp-g-web')
  expect(report, emptied.text.trim() === '[]', `the emptied document must stay a YAML array, got ${JSON.stringify(emptied.text)}`)

  // Round-trip: serialization keeps `!!js` markers and quoting safe.
  const jsRow = renderInsertRow({
    id: 'mcp-w-x',
    name: '@deepseek-ai/dsh-mcp-client',
    config: { serverName: 'x', transport: 'stdio', command: 'npx', env: { TOKEN: { $js: 'process.env.TOKEN' } } },
  })
  expect(report, jsRow.includes("name: '@deepseek-ai/dsh-mcp-client'"), 'the package name must be quoted (leading @)')
  expect(report, jsRow.includes('TOKEN: !!js "process.env.TOKEN"'), 'a !!js marker must serialize back as a quoted !!js scalar')

  // Multi-line args and !!js expressions survive a write/read round-trip.
  const multiline = renderInsertRow({
    id: 'mcp-w-multi',
    name: '@deepseek-ai/dsh-mcp-client',
    config: { serverName: 'multi', transport: 'stdio', command: 'node', args: ['line1\nline2', { $js: '(\n1 + 2\n)' }] },
  })
  expect(report, multiline.includes('"line1\\nline2"'), 'a multi-line arg must be quoted and escaped')
  const multiRows = insertRows(`- insert:\n${multiline.split('\n').map((line) => `    ${line}`).join('\n')}\n`)
  expect(report, multiRows[0]?.config?.args?.[0] === 'line1\nline2', 'a multi-line arg must parse back unchanged')
  expect(report, multiRows[0]?.config?.args?.[1]?.$js === '(\n1 + 2\n)', 'a multi-line !!js expression must parse back unchanged')

  // A !!js expression keeps its own quotes and newlines through a round-trip.
  const quotedJs = renderInsertRow({
    id: 'mcp-w-js',
    name: '@deepseek-ai/dsh-mcp-client',
    config: { serverName: 'js', transport: 'stdio', command: 'node', args: [{ $js: '"token"' }, { $js: '(\n1 + 2\n)' }] },
  })
  const quotedRows = insertRows(`- insert:\n${quotedJs.split('\n').map((line) => `    ${line}`).join('\n')}\n`)
  expect(report, quotedRows[0]?.config?.args?.[0]?.$js === '"token"', 'a quoted !!js expression must keep its quotes')
  expect(report, quotedRows[0]?.config?.args?.[1]?.$js === '(\n1 + 2\n)', 'a multi-line !!js expression must keep its newlines')

  // ---- config normalization ---------------------------------------------
  const stdio = normalizeConfig({ serverName: 'fs', transport: 'stdio', command: 'npx', args: ['a'], env: { A: '1' } })
  expect(report, stdio.command === 'npx', 'normalizeConfig must keep the command')
  expect(report, stdio.args?.[0] === 'a', 'normalizeConfig must keep args')
  expect(report, stdio.env?.A === '1', 'normalizeConfig must keep env')
  expect(report, stdio.toolCallTimeoutMs === undefined, 'unset advanced fields must stay unset')

  const http = normalizeConfig({ serverName: 'web', url: 'http://127.0.0.1:3000/mcp', headers: { A: 'b' } })
  expect(report, http.transport === 'streamable-http', 'normalizeConfig must infer streamable-http from url')
  expect(report, http.headers?.A === 'b', 'normalizeConfig must keep headers')

  expectThrows(report, () => normalizeConfig({ serverName: 'x', transport: 'stdio' }), 'stdio without a command must be rejected')
  expectThrows(report, () => normalizeConfig({ serverName: 'bad name!', transport: 'stdio', command: 'x' }), 'an invalid serverName must be rejected')
  expectThrows(report, () => normalizeConfig({ serverName: 'x', transport: 'sse', url: 'http://a' }), 'the legacy sse transport must be rejected')
  expectThrows(report, () => normalizeConfig({ serverName: 'x', transport: 'stdio', command: 'x', toolCallTimeoutMs: -1 }), 'an out-of-range timeout must be rejected')

  // ---- JSON interchange --------------------------------------------------
  const claude = parseImportJson(JSON.stringify({ mcpServers: { github: { command: 'npx', args: ['-y', 'server'], env: { A: 'b' } } } }))
  expect(report, claude.length === 1, 'Claude Desktop shape must yield one entry')
  expect(report, claude[0]?.serverName === 'github', 'the mcpServers key must become the serverName')
  expect(report, normalizeConfig(claude[0].config).transport === 'stdio', 'command must imply the stdio transport')

  const claudeHttp = parseImportJson(JSON.stringify({ mcpServers: { web: { type: 'http', url: 'http://127.0.0.1:3000/mcp' } } }))
  expect(report, normalizeConfig(claudeHttp[0].config).transport === 'streamable-http', 'type: http must map to streamable-http')

  const arrayShape = parseImportJson(JSON.stringify([{ serverName: 'a', transport: 'stdio', command: 'x' }]))
  expect(report, arrayShape.length === 1 && arrayShape[0].serverName === 'a', 'the array shape must parse')

  const fullShape = parseImportJson(JSON.stringify({ version: 1, servers: [{ serverName: 'a', transport: 'stdio', command: 'x' }] }))
  expect(report, fullShape.length === 1, 'the full export shape must parse')

  const single = parseImportJson(JSON.stringify({ serverName: 'a', transport: 'stdio', command: 'x' }))
  expect(report, single.length === 1, 'a bare object must parse as one entry')
  expectThrows(report, () => parseImportJson('not json'), 'invalid JSON must be rejected')

  const desktop = toDesktopEntry({ serverName: 'web', transport: 'streamable-http', url: 'http://a', headers: { A: 'b' } })
  expect(report, desktop.type === 'streamable-http' && desktop.url === 'http://a', 'toDesktopEntry must keep type and url')
  expect(report, desktop.command === undefined, 'toDesktopEntry must not emit stdio fields for http')

  // ---- row ids -----------------------------------------------------------
  const taken = [{ id: 'mcp-w-github' }]
  expect(report, nextRowId('workspace', 'github', taken) === 'mcp-w-github-2', 'nextRowId must avoid a taken id')
  expect(report, nextRowId('global', 'GitHub Server', []) === 'mcp-g-github-server', 'nextRowId must slugify the server name')

  // ---- library -----------------------------------------------------------
  let library = emptyLibrary()
  const first = upsertServer(library, { serverName: 'github', config: { serverName: 'github' }, origin: 'workspace:desktop', workspaces: ['/tmp/a'] }, 1)
  expect(report, first.action === 'inserted', 'the first library write must insert')
  library = first.library
  expect(report, library.servers.github?.workspaces?.[0] === '/tmp/a', 'upsertServer must persist the workspace attachment')
  const synced = syncLibrary(library, [{ serverName: 'github', config: { serverName: 'github' }, origin: 'global' }], 2)
  expect(report, synced.library.servers.github?.workspaces?.[0] === '/tmp/a', 'syncLibrary must not erase the workspace attachment')
  const reattached = upsertServer(synced.library, { serverName: 'github', config: { serverName: 'github' }, workspaces: ['/tmp/b', '/tmp/c'] }, 3)
  expect(report, reattached.library.servers.github?.workspaces?.length === 2, 'an explicit workspaces array must replace the attachment')
  expect(report, synced.changed === true, 'syncLibrary must record a new origin')
  expect(report, synced.library.servers.github?.origins.includes('global') === true, 'the global origin must be recorded')
  const dropped = syncLibrary(synced.library, [], 3)
  expect(report, dropped.library.servers.github?.origins.length === 0, 'a server with no layer must keep the entry with empty origins')
  const gone = removeServer(dropped.library, 'github', 4)
  expect(report, gone.removed === true && Object.keys(gone.library.servers).length === 0, 'removeServer must drop the entry')

  // ---- UI contract: dialog geometry + full list rendering ----------------
  await runUiContract(report)

  // ---- copy contract: locale, delete scopes, DESIGN §3 --------------------
  runCopyContract(report)
}
