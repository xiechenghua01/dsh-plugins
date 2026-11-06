// MCP manager — browser half for DeepSeek Harness 0.2.x.
//
// One Settings section (`设置 → MCP 服务`) owns every MCP server row of the current profile.
// The page talks to the host over the same-origin route `mcp-manager/api` (relative URL, POST,
// `{ op, args }` envelope). All rows are written to the current profile layer; the list shows
// every row the host returns, including rows that already live in the home layer.
// Visible strings go through the client locale service; colors use `--dsw-*` tokens only.

window.__ModuleLoader__.load({
  id: '@xiechenghua01/dsh-mcp-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const Fragment = React.Fragment
    const useCallback = React.useCallback
    const useEffect = React.useEffect
    const useLayoutEffect = React.useLayoutEffect
    const useRef = React.useRef
    const useState = React.useState

    const NS = 'mcp-manager'
    const API_PATH = 'mcp-manager/api'
    const POLL_MS = 4000
    const DEFAULT_TIMEOUT_MS = 60000
    const DEFAULT_MAX_RETRIES = 3
    const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/u
    const HTTP_URL_PATTERN = /^https?:\/\//iu
    const DASH = '—'

    const JS_MARKER_PREFIX = '@@js:'
    const STR_ESCAPE_PREFIX = '@@str:'
    const JS_MARKER_PATTERN = /^@@js:([\s\S]*)@@$/u

    const ICON_HELP = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    const ICON_ZAP = 'M13 10V3L4 14h7v7l9-11h-7z'
    const ICON_PLUS = 'M12 4v16m8-8H4'
    const ICON_SEARCH = 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
    const ICON_POWER = 'M12 3v9m6.364-5.364a9 9 0 11-12.728 0'
    const ICON_REFRESH = 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
    const ICON_EDIT = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
    const ICON_TRASH = 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
    const ICON_CHEVRON = 'M19 9l-7 7-7-7'
    const ICON_X = 'M6 18L18 6M6 6l12 12'

    /** Sample shared JSON; deliberately free of machine-specific paths. */
    const JSON_SAMPLE = {
      mcpServers: {
        playwright: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', '@executeautomation/playwright-mcp-server'],
          autoApprove: ['playwright_navigate', 'playwright_screenshot'],
        },
      },
    }

    /* ------------------------------------------------------------------ *
     * Locale dictionaries: flat key -> string, identical key sets.       *
     * Placeholders are interpolated as {name} by the locale service.     *
     * ------------------------------------------------------------------ */

    const zh = {
      'section.title': 'MCP 服务',
      'page.title': 'MCP 服务',
      'page.help': '所有配置写入当前 Profile (cordis.patch.yml)，自动在全部工作区会话中共享生效',
      'page.searchPlaceholder': '搜索服务...',
      'page.testAll': '测试所有启用的 MCP 服务器',
      'page.add': '新增',
      'page.loading': '正在加载 MCP 服务器…',
      'page.unauthorized': '当前页面未获授权，无法读取 MCP 服务器',
      'page.error': '加载失败',
      'page.retry': '重试',
      'page.warnings': '注意',
      'status.disabled': '已停用',
      'status.testing': '正在测试连通性...',
      'status.failed': '连接失败',
      'status.running': '运行中',
      'status.runningMs': '运行中 ({ms}ms)',
      'list.empty': '暂无匹配的 MCP 服务',
      'list.tools': '{count} 工具',
      'list.toolsTip': '点击展开查看工具与权限状态',
      'list.noTools': '尚未获取工具列表，可点击「连接获取工具」探测',
      'list.readOnly': '只读',
      'list.readOnlyTip': '该行无法安全改写，只能查看',
      'list.latency': '{ms}ms',
      'tool.stateDefault': '未写入配置，沿用宿主工具审批策略',
      'tool.stateAuto': '配置为自动允许 (autoApprove)；当前 DSH 版本的 MCP 客户端尚未读取该字段',
      'tool.stateDisabled': '配置为禁用 (disabledTools)；当前 DSH 版本的 MCP 客户端尚未读取该字段',
      'tool.default': '默认',
      'tool.auto': '自动允许',
      'tool.disabled': '禁用',
      'tool.defaultTip': '不写入配置文件，沿用宿主当前的工具审批策略（可能直接允许）',
      'tool.autoTip': '仅在配置文件中写入 autoApprove；当前 DSH 版本的 MCP 客户端尚未读取该字段，暂不改变实际调用行为',
      'tool.disabledTip': '仅在配置文件中写入 disabledTools；当前 DSH 版本的 MCP 客户端尚未读取该字段，暂不改变实际调用行为',
      'action.toggleEnable': '启用 MCP 服务器',
      'action.toggleDisable': '停用 MCP 服务器',
      'action.test': '测试连通性',
      'action.edit': '更新配置',
      'action.delete': '删除服务器',
      'action.close': '关闭',
      'action.cancel': '取消',
      'action.save': '保存',
      'action.probe': '连接获取工具',
      'action.probeTip': '尝试连接当前配置的 MCP 服务并刷新全量工具列表',
      'action.allAuto': '全设为自动允许',
      'action.resetDefault': '重置默认',
      'action.pasteSample': '粘贴社区分享 JSON 示例',
      'action.copyConfig': '复制配置',
      'action.add': '+ 添加',
      'action.removeRow': '移除此项',
      'action.jsonTip': '仅写入非空与非默认字段，支持直接粘贴外部分享的 JSON',
      'toast.enabled': '{name} 已启用',
      'toast.disabled': '{name} 已停用',
      'toast.testOk': '{name} 连通正常（{ms}ms · {tools} 个工具）',
      'toast.testFail': '{name} 测试失败：{message}',
      'toast.testAllNone': '暂无已启用的 MCP 服务',
      'toast.testAllDone': '已完成 {count} 个启用服务的连通性测试',
      'toast.created': '已添加 {name}',
      'toast.updated': '已更新 {name}',
      'toast.deleted': '已删除 {name}',
      'toast.probeOk': '已连接 MCP 服务并拉取到 {count} 个工具',
      'toast.probeFail': '获取工具失败：{message}',
      'toast.copied': '已复制配置',
      'toast.copyFailed': '无法写入剪贴板，请手动复制',
      'toast.jsonSample': '已填入示例 JSON',
      'toast.operationFailed': '操作失败：{message}',
      'toast.saveFailed': '保存失败：{message}',
      'editor.addTitle': '新增 MCP 服务',
      'editor.editTitle': '更新 MCP 服务',
      'editor.tabForm': '表单',
      'editor.tabJson': 'JSON',
      'editor.name': '名称',
      'editor.nameTip': '插件注册作用域内的唯一标识 (serverName)，模型侧工具前缀为 mcp__<名称>__',
      'editor.namePlaceholder': '例如: filesystem 或 github',
      'editor.transport': '类型',
      'editor.transportTip': 'stdio: 本地子进程通信；streamable-http: 远程流式 HTTP；sse: 远程事件流',
      'editor.command': '命令 (Command)',
      'editor.commandTip': '启动本地 MCP 进程的可执行程序，如 npx、uvx、node、python、docker',
      'editor.commandPlaceholder': 'npx',
      'editor.args': '参数 (Args)',
      'editor.argsTip': '传递给命令的启动参数，每行填写一个参数；未填写则不写入配置文件',
      'editor.argsPlaceholder': '-y\n@modelcontextprotocol/server-filesystem',
      'editor.env': '环境变量 (Env)',
      'editor.envTip': '传递给子进程的环境变量键值对；未添加或为空时不写入配置文件',
      'editor.url': '服务地址 (URL)',
      'editor.urlTip': '远程 MCP 服务器的完整 HTTP/SSE 端点地址',
      'editor.urlPlaceholder': 'https://example.com/mcp',
      'editor.headers': '请求头 (Headers)',
      'editor.headersTip': '附带在远程请求中的自定义 HTTP Header；为空时不写入配置文件',
      'editor.advanced': '高级设置',
      'editor.customized': '已自定义',
      'editor.cwd': '工作目录 (cwd)',
      'editor.cwdTip': '子进程启动的工作目录；留空则使用默认运行目录且不写入配置文件',
      'editor.cwdPlaceholder': '默认当前目录 (不写入配置)',
      'editor.timeout': '超时 (ms)',
      'editor.timeoutTip': '单次调用超时时间，系统合理默认值为 60000ms (60秒)；未修改时不写入配置文件',
      'editor.timeoutPlaceholder': '默认 60000',
      'editor.retries': '重连次数',
      'editor.retriesTip': '连接意外断开时的最大自动重连次数，系统合理默认值为 3 次；未修改时不写入配置文件',
      'editor.retriesPlaceholder': '默认 3',
      'editor.oauthClientId': 'OAuth Client ID',
      'editor.oauthClientIdTip': '远程服务启用 OAuth 2.1 时的客户端 ID；留空则不写入配置文件',
      'editor.oauthClientIdPlaceholder': '选填 (未填不写入)',
      'editor.oauthScopes': 'OAuth Scopes',
      'editor.oauthScopesTip': 'OAuth 授权范围（空格分隔）；留空则不写入配置文件',
      'editor.oauthScopesPlaceholder': '选填，空格分隔',
      'editor.kvKeyEnv': 'KEY',
      'editor.kvValEnv': 'VALUE',
      'editor.kvKeyHeader': 'Header',
      'editor.kvValHeader': 'Value',
      'editor.toolsTitle': '工具权限配置 (autoApprove / disabledTools)',
      'editor.toolsTip': '底层尝试连接 MCP 服务拉取全量工具与说明。设为「自动允许」写入 autoApprove，设为「禁用」写入 disabledTools，保持「默认」则不写入配置文件；当前 DSH 版本的 MCP 客户端尚未读取 autoApprove/disabledTools',
      'editor.toolsIdle': '未获取工具列表',
      'editor.toolsProbing': '正在连接服务获取工具...',
      'editor.toolsProbed': '已连接获取 {count} 个工具',
      'editor.toolsProbedTotal': '已获取 {count} 个工具（服务器共 {total} 个，仅展示前 {count} 个）',
      'editor.toolsFailed': '获取失败：{message}',
      'editor.filterTools': '过滤工具名或说明...',
      'editor.toolSummary': '自动允许: {auto} · 禁用: {disabled}',
      'editor.toolsEmpty': '未找到匹配的工具，可点击右上角「连接获取工具」刷新',
      'editor.jsonHint': '未填写的选填项与未修改的默认值不会写入配置文件',
      'editor.jsonEmpty': '请粘贴 JSON 内容',
      'editor.jsonValid': '✓ JSON 格式正确（已自动省去未填项与默认参数）',
      'editor.jsonInvalid': 'JSON 语法错误: {message}',
      'editor.jsonParsed': '✓ 已解析 "{name}" 并同步至表单与工具列表',
      'editor.jsonShape': 'JSON 中找不到服务器对象',
      'editor.testing': '连接并同步工具列表中...',
      'editor.testOk': '✓ 连通正常 ({ms}ms · 已同步 {tools} 个工具)',
      'editor.testFail': '✗ {message}',
      'editor.validationName': '请填写合法的服务名称（1–32 位字母、数字、下划线或短横线）',
      'editor.validationCommand': '请填写可执行命令',
      'editor.validationUrl': '请填写合法的 http(s) 远程 URL',
      'editor.validationTimeout': '超时必须是 1000–3600000 的整数',
      'editor.validationRetries': '重连次数必须是 1–1000 的整数',
      'editor.sseBlocked': 'DSH 当前版本不支持 SSE',
      'editor.sseHint': 'DSH 当前版本不支持 SSE，保存时会被拦截',
      'editor.jsonBlocked': '请先修正 JSON 语法错误',
      'editor.required': '必填',
      'delete.title': '删除 MCP 服务',
      'delete.descPrefix': '确定要删除 ',
      'delete.descSuffix': ' 吗？此操作会从当前 Profile 的 cordis.patch.yml 中移除该行，不可撤销。',
      'delete.confirm': '删除',
      'delete.cancel': '取消',
      'common.unknownError': '未知错误',
      'common.requestFailed': '请求失败，请检查网络或宿主状态',
      'common.invalidResponse': '宿主返回了无效响应',
    }

    const en = {
      'section.title': 'MCP servers',
      'page.title': 'MCP servers',
      'page.help': 'All settings are written to the current Profile (cordis.patch.yml) and shared by every workspace session',
      'page.searchPlaceholder': 'Search services...',
      'page.testAll': 'Test all enabled MCP servers',
      'page.add': 'Add',
      'page.loading': 'Loading MCP servers…',
      'page.unauthorized': 'This page is not authorized to read MCP servers',
      'page.error': 'Failed to load',
      'page.retry': 'Retry',
      'page.warnings': 'Warnings',
      'status.disabled': 'Disabled',
      'status.testing': 'Testing connectivity...',
      'status.failed': 'Connection failed',
      'status.running': 'Running',
      'status.runningMs': 'Running ({ms}ms)',
      'list.empty': 'No matching MCP servers',
      'list.tools': '{count} tools',
      'list.toolsTip': 'Click to expand tools and permission states',
      'list.noTools': 'No tool list yet; click "Connect and fetch tools" to probe',
      'list.readOnly': 'Read-only',
      'list.readOnlyTip': 'This row cannot be rewritten safely and is view-only',
      'list.latency': '{ms}ms',
      'tool.stateDefault': 'Not written to config; follows the host tool approval policy',
      'tool.stateAuto': 'Configured as auto-allow (autoApprove); the current DSH MCP client does not read this field yet',
      'tool.stateDisabled': 'Configured as disabled (disabledTools); the current DSH MCP client does not read this field yet',
      'tool.default': 'Default',
      'tool.auto': 'Auto-allow',
      'tool.disabled': 'Disable',
      'tool.defaultTip': 'Not written to the config; the current host tool approval policy applies (calls may be allowed directly)',
      'tool.autoTip': 'Writes autoApprove to the config only; the current DSH MCP client does not read this field, so call behavior is unchanged for now',
      'tool.disabledTip': 'Writes disabledTools to the config only; the current DSH MCP client does not read this field, so call behavior is unchanged for now',
      'action.toggleEnable': 'Enable MCP server',
      'action.toggleDisable': 'Disable MCP server',
      'action.test': 'Test connectivity',
      'action.edit': 'Update config',
      'action.delete': 'Delete server',
      'action.close': 'Close',
      'action.cancel': 'Cancel',
      'action.save': 'Save',
      'action.probe': 'Connect and fetch tools',
      'action.probeTip': 'Try to connect to the configured MCP service and refresh the full tool list',
      'action.allAuto': 'Set all to auto-allow',
      'action.resetDefault': 'Reset to default',
      'action.pasteSample': 'Paste shared JSON sample',
      'action.copyConfig': 'Copy config',
      'action.add': '+ Add',
      'action.removeRow': 'Remove this row',
      'action.jsonTip': 'Only non-empty and non-default fields are written; paste shared JSON directly',
      'toast.enabled': '{name} enabled',
      'toast.disabled': '{name} disabled',
      'toast.testOk': '{name} is reachable ({ms}ms · {tools} tools)',
      'toast.testFail': '{name} test failed: {message}',
      'toast.testAllNone': 'No enabled MCP servers to test',
      'toast.testAllDone': 'Finished testing {count} enabled services',
      'toast.created': 'Added {name}',
      'toast.updated': 'Updated {name}',
      'toast.deleted': 'Deleted {name}',
      'toast.probeOk': 'Connected and fetched {count} tools',
      'toast.probeFail': 'Failed to fetch tools: {message}',
      'toast.copied': 'Config copied',
      'toast.copyFailed': 'Could not write to the clipboard; copy manually',
      'toast.jsonSample': 'Filled the sample JSON',
      'toast.operationFailed': 'Operation failed: {message}',
      'toast.saveFailed': 'Save failed: {message}',
      'editor.addTitle': 'Add MCP server',
      'editor.editTitle': 'Update MCP server',
      'editor.tabForm': 'Form',
      'editor.tabJson': 'JSON',
      'editor.name': 'Name',
      'editor.nameTip': 'Unique identifier in the plugin scope (serverName); model tool prefix is mcp__<name>__',
      'editor.namePlaceholder': 'e.g. filesystem or github',
      'editor.transport': 'Type',
      'editor.transportTip': 'stdio: local subprocess; streamable-http: remote streaming HTTP; sse: remote event stream',
      'editor.command': 'Command',
      'editor.commandTip': 'Executable that starts the local MCP process, such as npx, uvx, node, python, or docker',
      'editor.commandPlaceholder': 'npx',
      'editor.args': 'Arguments',
      'editor.argsTip': 'Startup arguments, one per line; omitted from the config when empty',
      'editor.argsPlaceholder': '-y\n@modelcontextprotocol/server-filesystem',
      'editor.env': 'Environment variables',
      'editor.envTip': 'Key-value pairs passed to the subprocess; omitted from the config when empty',
      'editor.url': 'URL',
      'editor.urlTip': 'Full HTTP or SSE endpoint of the remote MCP server',
      'editor.urlPlaceholder': 'https://example.com/mcp',
      'editor.headers': 'Headers',
      'editor.headersTip': 'Custom HTTP headers for remote requests; omitted from the config when empty',
      'editor.advanced': 'Advanced settings',
      'editor.customized': 'Customized',
      'editor.cwd': 'Working directory (cwd)',
      'editor.cwdTip': 'Working directory for the subprocess; leave empty to use the default and omit it from the config',
      'editor.cwdPlaceholder': 'Default current directory (not written)',
      'editor.timeout': 'Timeout (ms)',
      'editor.timeoutTip': 'Per-call timeout. The sensible default is 60000ms (60s); omitted from the config when unchanged',
      'editor.timeoutPlaceholder': 'Default 60000',
      'editor.retries': 'Reconnect attempts',
      'editor.retriesTip': 'Maximum automatic reconnect attempts after a disconnect. The sensible default is 3; omitted when unchanged',
      'editor.retriesPlaceholder': 'Default 3',
      'editor.oauthClientId': 'OAuth Client ID',
      'editor.oauthClientIdTip': 'OAuth 2.1 client ID for remote services; omitted from the config when empty',
      'editor.oauthClientIdPlaceholder': 'Optional (not written when empty)',
      'editor.oauthScopes': 'OAuth Scopes',
      'editor.oauthScopesTip': 'OAuth scopes separated by spaces; omitted from the config when empty',
      'editor.oauthScopesPlaceholder': 'Optional, space separated',
      'editor.kvKeyEnv': 'KEY',
      'editor.kvValEnv': 'VALUE',
      'editor.kvKeyHeader': 'Header',
      'editor.kvValHeader': 'Value',
      'editor.toolsTitle': 'Tool permissions (autoApprove / disabledTools)',
      'editor.toolsTip': 'Connect to the MCP service to fetch all tools and descriptions. Auto-allow writes autoApprove, Disable writes disabledTools, and Default writes nothing; the current DSH MCP client does not read autoApprove/disabledTools',
      'editor.toolsIdle': 'Tool list not fetched',
      'editor.toolsProbing': 'Connecting to fetch tools...',
      'editor.toolsProbed': 'Connected; fetched {count} tools',
      'editor.toolsProbedTotal': 'Fetched {count} tools ({total} reported; showing the first {count})',
      'editor.toolsFailed': 'Fetch failed: {message}',
      'editor.filterTools': 'Filter tools by name or description...',
      'editor.toolSummary': 'Auto-allow: {auto} · Disabled: {disabled}',
      'editor.toolsEmpty': 'No matching tools. Click "Connect and fetch tools" to refresh',
      'editor.jsonHint': 'Empty optional fields and unchanged defaults are not written to the config',
      'editor.jsonEmpty': 'Paste JSON content',
      'editor.jsonValid': '✓ Valid JSON (empty and default fields are omitted automatically)',
      'editor.jsonInvalid': 'JSON syntax error: {message}',
      'editor.jsonParsed': '✓ Parsed "{name}" into the form and tool list',
      'editor.jsonShape': 'No server object found in the JSON',
      'editor.testing': 'Connecting and syncing the tool list...',
      'editor.testOk': '✓ Reachable ({ms}ms · synced {tools} tools)',
      'editor.testFail': '✗ {message}',
      'editor.validationName': 'Enter a valid server name (1–32 letters, digits, underscores, or hyphens)',
      'editor.validationCommand': 'Enter a command',
      'editor.validationUrl': 'Enter a valid http(s) URL',
      'editor.validationTimeout': 'Timeout must be an integer from 1000 to 3600000',
      'editor.validationRetries': 'Reconnect attempts must be an integer from 1 to 1000',
      'editor.sseBlocked': 'SSE is not supported by this DSH version',
      'editor.sseHint': 'SSE is not supported by this DSH version and will be blocked on save',
      'editor.jsonBlocked': 'Fix the JSON syntax before saving',
      'editor.required': 'Required',
      'delete.title': 'Delete MCP server',
      'delete.descPrefix': 'Delete ',
      'delete.descSuffix': '? This removes the row from the current Profile cordis.patch.yml and cannot be undone.',
      'delete.confirm': 'Delete',
      'delete.cancel': 'Cancel',
      'common.unknownError': 'Unknown error',
      'common.requestFailed': 'Request failed; check the network or host',
      'common.invalidResponse': 'The host returned an invalid response',
    }

    /** Bound translator, assigned by `apply`; used when the slot passes no `t`. */
    let activeT = null

    /* ------------------------------------------------------------------ *
     * Small helpers.                                                     *
     * ------------------------------------------------------------------ */

    function textOf(value) {
      if (typeof value === 'string') return value
      if (typeof value === 'number' && Number.isFinite(value)) return String(value)
      return ''
    }

    function messageOf(error) {
      if (error !== null && error !== undefined && typeof error.message === 'string' && error.message !== '') return error.message
      return ''
    }

    function isObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    }

    function isJsMarker(value) {
      return isObject(value) && typeof value.$js === 'string'
    }

    /** Render one value for a structured control, keeping `!!js` expressions. */
    function displayValueOf(value) {
      if (isJsMarker(value)) return JS_MARKER_PREFIX + value.$js + '@@'
      const raw = textOf(value)
      if (raw.startsWith(JS_MARKER_PREFIX) || raw.startsWith(STR_ESCAPE_PREFIX)) return STR_ESCAPE_PREFIX + raw
      return raw
    }

    /** Restore a control value: `@@str:` is a literal, `@@js:...@@` the opaque host marker. */
    function valueFromText(text) {
      const raw = textOf(text)
      if (raw.startsWith(STR_ESCAPE_PREFIX)) return raw.slice(STR_ESCAPE_PREFIX.length)
      const match = JS_MARKER_PATTERN.exec(raw)
      return match !== null ? { $js: match[1] } : raw
    }

    function entriesToRows(object) {
      if (!isObject(object)) return []
      return Object.keys(object).map((key) => ({ key: key, value: displayValueOf(object[key]) }))
    }

    function rowsToObject(rows) {
      const out = {}
      if (!Array.isArray(rows)) return out
      for (const row of rows) {
        if (!isObject(row)) continue
        const key = textOf(row.key).trim()
        const value = textOf(row.value).trim()
        if (key !== '' && value !== '') out[key] = valueFromText(value)
      }
      return out
    }

    function parseIntStrict(text) {
      const raw = textOf(text).trim()
      if (raw === '') return null
      if (!/^-?\d+$/u.test(raw)) return NaN
      return Number(raw)
    }

    function transportOf(config) {
      if (!isObject(config)) return 'stdio'
      const declared = textOf(config.transport !== undefined ? config.transport : config.type).toLowerCase()
      if (declared === 'streamable-http' || declared === 'http') return 'streamable-http'
      if (declared === 'sse') return 'sse'
      if (declared === 'stdio') return 'stdio'
      return textOf(config.url) !== '' ? 'streamable-http' : 'stdio'
    }

    function targetOfConfig(config) {
      if (!isObject(config)) return ''
      if (transportOf(config) === 'stdio') {
        const parts = [textOf(config.command)]
        if (Array.isArray(config.args)) {
          for (const entry of config.args) {
            const value = displayValueOf(entry)
            if (value !== '') parts.push(value)
          }
        }
        return parts.filter((part) => part !== '').join(' ')
      }
      return textOf(config.url)
    }

    function toolListsOf(row) {
      const config = isObject(row) && isObject(row.config) ? row.config : {}
      const extra = isObject(row) && isObject(row.extra) ? row.extra : {}
      const autoSource = Array.isArray(config.autoApprove) ? config.autoApprove : (Array.isArray(extra.autoApprove) ? extra.autoApprove : [])
      const disabledSource = Array.isArray(config.disabledTools) ? config.disabledTools : (Array.isArray(extra.disabledTools) ? extra.disabledTools : [])
      const clean = (list) => {
        const out = []
        for (const item of list) {
          const name = textOf(item)
          if (name !== '' && out.indexOf(name) === -1) out.push(name)
        }
        return out
      }
      return { auto: clean(autoSource), disabled: clean(disabledSource) }
    }

    function toolNamesOf(row) {
      const probe = isObject(row) ? row.lastProbe : null
      if (!isObject(probe)) return []
      const names = []
      const seen = {}
      const push = (name) => {
        if (name !== '' && seen[name] !== true) {
          seen[name] = true
          names.push(name)
        }
      }
      if (Array.isArray(probe.tools)) {
        for (const tool of probe.tools) if (isObject(tool)) push(textOf(tool.name))
      }
      if (Array.isArray(probe.toolNames)) {
        for (const name of probe.toolNames) push(textOf(name))
      }
      const lists = toolListsOf(row)
      for (const name of lists.auto) push(name)
      for (const name of lists.disabled) push(name)
      return names
    }

    function toolDescriptionsOf(row) {
      const probe = isObject(row) ? row.lastProbe : null
      const out = {}
      if (!isObject(probe) || !Array.isArray(probe.tools)) return out
      for (const tool of probe.tools) {
        if (!isObject(tool)) continue
        const name = textOf(tool.name)
        if (name !== '') out[name] = textOf(tool.description)
      }
      return out
    }

    function toolCountOf(row) {
      if (isObject(row) && typeof row.toolCount === 'number' && Number.isFinite(row.toolCount)) return row.toolCount
      const probe = isObject(row) ? row.lastProbe : null
      if (isObject(probe) && typeof probe.toolCount === 'number' && Number.isFinite(probe.toolCount)) return probe.toolCount
      // Unknown (disabled or never connected) stays unknown instead of claiming zero tools.
      const names = toolNamesOf(row)
      return names.length > 0 ? names.length : null
    }

    function statusOf(t, row, testing) {
      if (testing === true) return { tone: 'warn', text: t('status.testing'), pulse: true }
      if (row.disabled === true) return { tone: 'muted', text: t('status.disabled'), pulse: false }
      const probe = isObject(row.lastProbe) ? row.lastProbe : null
      if (isObject(probe) && probe.ok === false) return { tone: 'err', text: t('status.failed'), pulse: false }
      if (isObject(probe) && probe.ok === true) {
        const ms = typeof probe.durationMs === 'number' && Number.isFinite(probe.durationMs) ? Math.round(probe.durationMs) : null
        return { tone: 'ok', text: ms !== null ? t('status.runningMs', { ms: ms }) : t('status.running'), pulse: false }
      }
      if (isObject(row.live) && row.live.phase === 'failed') return { tone: 'err', text: t('status.failed'), pulse: false }
      return { tone: 'ok', text: t('status.running'), pulse: false }
    }

    function describeError(t, error) {
      if (error !== null && error !== undefined) {
        if (error.code === 'unauthorized') return t('page.unauthorized')
        if (error.code === 'protocol') return t('common.invalidResponse')
        if (error.code === 'transport') return t('common.requestFailed')
      }
      const message = messageOf(error)
      return message !== '' ? message : t('common.unknownError')
    }

    async function copyText(text) {
      try {
        if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined && navigator.clipboard !== null && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch (error) {
        /* fall through: the caller shows a manual-copy hint */
      }
      return false
    }

    /* ------------------------------------------------------------------ *
     * 300ms delayed tooltip engine, also available on click.                                     *
     * ------------------------------------------------------------------ */

    const tooltip = { timer: null, target: null, label: '', node: null }

    function ensureTooltipNode() {
      if (typeof document === 'undefined' || document === null) return null
      if (tooltip.node !== null && document.body.contains(tooltip.node)) return tooltip.node
      const node = document.createElement('div')
      node.className = 'mm-tooltip'
      node.setAttribute('role', 'tooltip')
      node.style.left = '0px'
      node.style.top = '0px'
      node.style.visibility = 'hidden'
      // The tooltip lives on <body>, outside the page's --mm-fs scope; copy the current scale
      // so its size keeps stepping with the Settings font size.
      const root = document.querySelector('.mm-root')
      if (root !== null) {
        const scale = getComputedStyle(root).getPropertyValue('--mm-fs').trim()
        if (scale !== '') node.style.setProperty('--mm-fs', scale)
      }
      document.body.appendChild(node)
      tooltip.node = node
      return node
    }

    function hideTooltip() {
      if (tooltip.timer !== null) {
        clearTimeout(tooltip.timer)
        tooltip.timer = null
      }
      tooltip.target = null
      tooltip.label = ''
      if (tooltip.node !== null) {
        tooltip.node.classList.remove('mm-tooltip-show')
        tooltip.node.style.visibility = 'hidden'
      }
    }

    function placeTooltip() {
      const target = tooltip.target
      if (target === null || target === undefined || typeof target.getBoundingClientRect !== 'function') {
        hideTooltip()
        return
      }
      if (typeof document === 'undefined' || document === null || !document.body.contains(target)) {
        hideTooltip()
        return
      }
      const node = ensureTooltipNode()
      if (node === null) return
      node.textContent = tooltip.label
      node.style.visibility = 'hidden'
      node.classList.add('mm-tooltip-show')
      const rect = target.getBoundingClientRect()
      const tipRect = node.getBoundingClientRect()
      const viewWidth = typeof window !== 'undefined' && window !== null ? window.innerWidth : 0
      let left = rect.left + rect.width / 2 - tipRect.width / 2
      let top = rect.top - tipRect.height - 8
      if (left < 8) left = 8
      if (viewWidth > 0 && left + tipRect.width > viewWidth - 8) left = viewWidth - tipRect.width - 8
      if (top < 8) top = rect.bottom + 8
      node.style.left = Math.round(left) + 'px'
      node.style.top = Math.round(top) + 'px'
      node.style.visibility = 'visible'
    }

    const TOOLTIP_DELAY_MS = 300

    function scheduleTooltip(label, target, delay) {
      hideTooltip()
      const text = textOf(label)
      if (text === '' || target === null || target === undefined) return
      tooltip.target = target
      tooltip.label = text
      tooltip.timer = setTimeout(() => {
        tooltip.timer = null
        placeTooltip()
      }, typeof delay === 'number' ? delay : TOOLTIP_DELAY_MS)
    }

    function tooltipHandlers(label) {
      const text = textOf(label)
      if (text === '') return {}
      return {
        onMouseEnter: (event) => {
          scheduleTooltip(text, event.currentTarget)
        },
        onMouseLeave: () => {
          hideTooltip()
        },
        onMouseDown: () => {
          hideTooltip()
        },
      }
    }

    /* ------------------------------------------------------------------ *
     * HTTP API.                                                          *
     * ------------------------------------------------------------------ */

    async function callApi(op, args) {
      let response
      try {
        response = await fetch(API_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ op: op, args: args !== undefined && args !== null ? args : {} }),
        })
      } catch (failure) {
        const transport = new Error(messageOf(failure) || 'request failed')
        transport.code = 'transport'
        throw transport
      }
      if (response.status === 401) {
        const unauthorized = new Error('unauthorized')
        unauthorized.code = 'unauthorized'
        unauthorized.status = 401
        throw unauthorized
      }
      let payload = null
      try {
        payload = await response.json()
      } catch (error) {
        const invalid = new Error('invalid response from the host')
        invalid.code = 'protocol'
        throw invalid
      }
      if (payload === null || typeof payload !== 'object') {
        const invalid = new Error('invalid response from the host')
        invalid.code = 'protocol'
        throw invalid
      }
      if (payload.ok !== true) {
        const failure = new Error(typeof payload.error === 'string' && payload.error !== '' ? payload.error : 'request failed')
        failure.code = typeof payload.code === 'string' ? payload.code : 'unknown'
        throw failure
      }
      return payload
    }

    /* ------------------------------------------------------------------ *
     * Draft helpers and the clean-config serializers.                    *
     * ------------------------------------------------------------------ */

    function emptyDraft() {
      return {
        serverName: '',
        transport: 'stdio',
        command: '',
        argsText: '',
        argsRaw: [],
        argsDirty: false,
        envRows: [],
        url: '',
        headersRows: [],
        cwd: '',
        timeoutText: '',
        retriesText: '',
        oauthClientId: '',
        oauthScopes: '',
      }
    }

    function draftFromRow(row) {
      const config = isObject(row.config) ? row.config : {}
      const extra = isObject(row.extra) ? row.extra : {}
      const reconnect = isObject(config.reconnect) ? config.reconnect : {}
      const oauth = isObject(config.oauth) ? config.oauth : (isObject(extra.oauth) ? extra.oauth : {})
      const timeout = typeof config.toolCallTimeoutMs === 'number' && config.toolCallTimeoutMs !== DEFAULT_TIMEOUT_MS
        ? String(config.toolCallTimeoutMs)
        : ''
      const retries = typeof reconnect.maxAttempts === 'number' && reconnect.maxAttempts !== DEFAULT_MAX_RETRIES
        ? String(reconnect.maxAttempts)
        : ''
      return {
        serverName: textOf(row.serverName),
        transport: transportOf(config),
        command: textOf(config.command),
        argsText: Array.isArray(config.args) ? config.args.map(displayValueOf).join('\n') : '',
        argsRaw: Array.isArray(config.args) ? config.args.slice() : [],
        argsDirty: false,
        envRows: entriesToRows(config.env),
        url: textOf(config.url),
        headersRows: entriesToRows(config.headers),
        cwd: textOf(config.cwd),
        timeoutText: timeout,
        retriesText: retries,
        oauthClientId: textOf(oauth.clientId),
        oauthScopes: textOf(oauth.scopes),
      }
    }

    function policyFromRow(row) {
      const lists = toolListsOf(row)
      const policy = {}
      for (const name of lists.auto) policy[name] = 'auto'
      for (const name of lists.disabled) policy[name] = 'disabled'
      return policy
    }

    function probedToolsFromRow(row) {
      const probe = isObject(row) ? row.lastProbe : null
      const out = []
      const seen = {}
      const push = (name, description) => {
        if (name === '' || seen[name] === true) return
        seen[name] = true
        out.push({ name: name, description: description })
      }
      if (isObject(probe) && Array.isArray(probe.tools)) {
        for (const tool of probe.tools) {
          if (isObject(tool)) push(textOf(tool.name), textOf(tool.description))
        }
      }
      if (isObject(probe) && Array.isArray(probe.toolNames)) {
        for (const name of probe.toolNames) push(textOf(name), '')
      }
      const lists = toolListsOf(row)
      for (const name of lists.auto) push(name, '')
      for (const name of lists.disabled) push(name, '')
      return out
    }

    function mergeTools(tools, existing, policy) {
      const out = []
      const seen = {}
      const push = (name, description) => {
        if (name === '' || seen[name] === true) return
        seen[name] = true
        out.push({ name: name, description: description })
      }
      if (Array.isArray(tools)) {
        for (const tool of tools) {
          if (isObject(tool)) push(textOf(tool.name), textOf(tool.description))
        }
      }
      if (Array.isArray(existing)) {
        for (const tool of existing) {
          if (isObject(tool)) push(textOf(tool.name), textOf(tool.description))
        }
      }
      if (isObject(policy)) {
        for (const name of Object.keys(policy)) push(name, '')
      }
      return out
    }

    function draftValues(draft, policy) {
      // JSON-originated args stay as the original array until the textarea is actually edited,
      // so a legal multi-line string argument is never split into several arguments.
      const args = draft.argsDirty === true
        ? draft.argsText
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter((line) => line !== '')
          .map(valueFromText)
        : (Array.isArray(draft.argsRaw) ? draft.argsRaw.slice() : [])
      const autoApprove = []
      const disabledTools = []
      if (isObject(policy)) {
        for (const name of Object.keys(policy)) {
          if (policy[name] === 'auto') autoApprove.push(name)
          else if (policy[name] === 'disabled') disabledTools.push(name)
        }
      }
      autoApprove.sort()
      disabledTools.sort()
      return {
        serverName: draft.serverName.trim(),
        transport: draft.transport,
        command: draft.command.trim(),
        args: args,
        env: rowsToObject(draft.envRows),
        cwd: draft.cwd.trim(),
        url: draft.url.trim(),
        headers: rowsToObject(draft.headersRows),
        timeout: parseIntStrict(draft.timeoutText),
        retries: parseIntStrict(draft.retriesText),
        oauthClientId: draft.oauthClientId.trim(),
        oauthScopes: draft.oauthScopes.trim(),
        autoApprove: autoApprove,
        disabledTools: disabledTools,
      }
    }

    /** Prototype-shaped, clean JSON node: no empty strings/arrays/objects and no defaults. */
    function cleanJsonNode(values) {
      const node = { transport: values.transport }
      if (values.transport === 'stdio') {
        if (values.command !== '') node.command = values.command
        if (values.args.length > 0) node.args = values.args
        if (values.cwd !== '') node.cwd = values.cwd
        if (Object.keys(values.env).length > 0) node.env = values.env
      } else {
        if (values.url !== '') node.url = values.url
        if (Object.keys(values.headers).length > 0) node.headers = values.headers
        if (values.oauthClientId !== '' || values.oauthScopes !== '') {
          node.oauth = {}
          if (values.oauthClientId !== '') node.oauth.clientId = values.oauthClientId
          if (values.oauthScopes !== '') node.oauth.scopes = values.oauthScopes
        }
      }
      if (Number.isFinite(values.timeout) && values.timeout !== DEFAULT_TIMEOUT_MS) node.timeout = values.timeout
      if (Number.isFinite(values.retries) && values.retries !== DEFAULT_MAX_RETRIES) node.maxRetries = values.retries
      if (values.autoApprove.length > 0) node.autoApprove = values.autoApprove
      if (values.disabledTools.length > 0) node.disabledTools = values.disabledTools
      return node
    }

    function cleanJsonObject(values) {
      const name = values.serverName !== '' ? values.serverName : 'mcp-server'
      return { mcpServers: { [name]: cleanJsonNode(values) } }
    }

    /** Host config: `timeout` -> toolCallTimeoutMs, `maxRetries` -> reconnect.maxAttempts. */
    function cleanHostConfig(values) {
      const config = { serverName: values.serverName, transport: values.transport }
      if (values.transport === 'stdio') {
        config.command = values.command
        if (values.args.length > 0) config.args = values.args
        if (values.cwd !== '') config.cwd = values.cwd
        if (Object.keys(values.env).length > 0) config.env = values.env
      } else {
        config.url = values.url
        if (Object.keys(values.headers).length > 0) config.headers = values.headers
        if (values.oauthClientId !== '' || values.oauthScopes !== '') {
          config.oauth = {}
          if (values.oauthClientId !== '') config.oauth.clientId = values.oauthClientId
          if (values.oauthScopes !== '') config.oauth.scopes = values.oauthScopes
        }
      }
      if (Number.isFinite(values.timeout) && values.timeout !== DEFAULT_TIMEOUT_MS) config.toolCallTimeoutMs = values.timeout
      if (Number.isFinite(values.retries) && values.retries !== DEFAULT_MAX_RETRIES) config.reconnect = { maxAttempts: values.retries }
      if (values.autoApprove.length > 0) config.autoApprove = values.autoApprove
      if (values.disabledTools.length > 0) config.disabledTools = values.disabledTools
      return config
    }

    /** Catalog metadata the host persists alongside the row (the DSH client ignores it). */
    function cleanExtra(values, baseExtra) {
      const extra = {}
      if (isObject(baseExtra) && isObject(baseExtra.capabilities)) extra.capabilities = baseExtra.capabilities
      extra.autoApprove = values.autoApprove
      extra.disabledTools = values.disabledTools
      if (values.transport !== 'stdio' && (values.oauthClientId !== '' || values.oauthScopes !== '')) {
        extra.oauth = { enabled: true, clientId: values.oauthClientId, scopes: values.oauthScopes }
      }
      return extra
    }

    function extractServerNode(parsed) {
      if (!isObject(parsed) && !Array.isArray(parsed)) return null
      if (Array.isArray(parsed)) {
        if (parsed.length === 0 || !isObject(parsed[0])) return null
        const node = parsed[0]
        return { id: textOf(node.serverName) || textOf(node.name), node: node }
      }
      if (isObject(parsed.mcpServers)) {
        const keys = Object.keys(parsed.mcpServers)
        if (keys.length > 0 && isObject(parsed.mcpServers[keys[0]])) return { id: keys[0], node: parsed.mcpServers[keys[0]] }
        return null
      }
      if (Array.isArray(parsed.mcpServers) && parsed.mcpServers.length > 0 && isObject(parsed.mcpServers[0])) {
        const node = parsed.mcpServers[0]
        return { id: textOf(node.serverName) || textOf(node.name), node: node }
      }
      const looksLikeNode = parsed.command !== undefined
        || parsed.url !== undefined
        || parsed.transport !== undefined
        || parsed.type !== undefined
        || parsed.serverName !== undefined
        || parsed.name !== undefined
        || parsed.args !== undefined
      if (looksLikeNode) {
        return { id: textOf(parsed.serverName) || textOf(parsed.name), node: parsed }
      }
      const keys = Object.keys(parsed)
      if (keys.length === 1 && keys[0] !== 'mcpServers' && keys[0] !== 'servers' && isObject(parsed[keys[0]])) {
        return { id: keys[0], node: parsed[keys[0]] }
      }
      return null
    }

    function applyParsedNode(baseDraft, node) {
      const declared = textOf(node.transport !== undefined ? node.transport : node.type).toLowerCase()
      let transport = 'stdio'
      if (declared === 'sse') transport = 'sse'
      else if (declared === 'streamable-http' || declared === 'http') transport = 'streamable-http'
      else if (declared === 'stdio') transport = 'stdio'
      else if (textOf(node.command) !== '') transport = 'stdio'
      else if (textOf(node.url) !== '') transport = 'streamable-http'
      const oauth = isObject(node.oauth) ? node.oauth : {}
      const reconnect = isObject(node.reconnect) ? node.reconnect : {}
      const timeout = typeof node.timeout === 'number'
        ? node.timeout
        : (typeof node.toolCallTimeoutMs === 'number' ? node.toolCallTimeoutMs : null)
      const retries = typeof node.maxRetries === 'number'
        ? node.maxRetries
        : (typeof reconnect.maxAttempts === 'number' ? reconnect.maxAttempts : null)
      const policy = {}
      if (Array.isArray(node.autoApprove)) {
        for (const raw of node.autoApprove) {
          const name = textOf(raw)
          if (name !== '') policy[name] = 'auto'
        }
      }
      if (Array.isArray(node.disabledTools)) {
        for (const raw of node.disabledTools) {
          const name = textOf(raw)
          if (name !== '') policy[name] = 'disabled'
        }
      }
      return {
        draft: {
          serverName: textOf(node.serverName) !== '' ? textOf(node.serverName) : baseDraft.serverName,
          transport: transport,
          command: textOf(node.command),
          argsText: Array.isArray(node.args) ? node.args.map(displayValueOf).join('\n') : '',
          argsRaw: Array.isArray(node.args) ? node.args.slice() : [],
          argsDirty: false,
          envRows: entriesToRows(node.env),
          url: textOf(node.url),
          headersRows: entriesToRows(node.headers),
          cwd: textOf(node.cwd),
          timeoutText: timeout !== null && timeout !== DEFAULT_TIMEOUT_MS ? String(timeout) : '',
          retriesText: retries !== null && retries !== DEFAULT_MAX_RETRIES ? String(retries) : '',
          oauthClientId: textOf(oauth.clientId),
          oauthScopes: textOf(oauth.scopes),
        },
        policy: policy,
      }
    }

    /* ------------------------------------------------------------------ *
     * Presentation primitives.                                           *
     * ------------------------------------------------------------------ */

    function Svg(props) {
      return h('svg', {
        className: 'mm-icon' + (props.className !== undefined && props.className !== '' ? ' ' + props.className : ''),
        viewBox: '0 0 24 24',
        width: props.size !== undefined ? props.size : 16,
        height: props.size !== undefined ? props.size : 16,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: props.strokeWidth !== undefined ? props.strokeWidth : 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      }, h('path', { d: props.d }))
    }

    function IconButton(props) {
      const className = 'mm-icon-btn'
        + (props.tone !== undefined && props.tone !== '' ? ' mm-icon-btn-' + props.tone : '')
        + (props.spin === true ? ' mm-icon-btn-spin' : '')
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      return h(
        'button',
        Object.assign({
          type: 'button',
          className: className,
          disabled: props.disabled === true,
          onClick: props.onClick,
          'aria-label': props.label,
        }, tooltipHandlers(props.tooltip)),
        h(Svg, { d: props.icon, size: props.size !== undefined ? props.size : 16, strokeWidth: props.strokeWidth }),
      )
    }

    function HelpDot(props) {
      return h(
        'span',
        Object.assign({
          className: 'mm-help',
          role: 'img',
          'aria-label': props.tip,
        }, tooltipHandlers(props.tip)),
        h(Svg, { d: ICON_HELP, size: 14 }),
      )
    }

    function Field(props) {
      return h(
        'label',
        { className: 'mm-field' + (props.small === true ? ' mm-field-sm' : '') },
        h(
          'span',
          { className: 'mm-field-label' },
          h('span', null, props.label),
          props.tip !== undefined && props.tip !== null ? h(HelpDot, { tip: props.tip }) : null,
          props.required === true ? h('span', { className: 'mm-required', title: props.requiredLabel }, '*') : null,
        ),
        props.children,
      )
    }

    function ToastHost(props) {
      const toasts = Array.isArray(props.toasts) ? props.toasts : []
      if (toasts.length === 0) return null
      return h(
        'div',
        { className: 'mm-toasts', 'aria-live': 'polite' },
        toasts.map((toast) => h(
          'div',
          { key: toast.id, className: 'mm-toast mm-toast-' + toast.kind },
          h('span', { className: 'mm-toast-dot' }),
          h('span', { className: 'mm-toast-text' }, toast.text),
        )),
      )
    }

    function StatePanel(props) {
      return h(
        'div',
        { className: 'mm-state' },
        h('p', { className: 'mm-state-title' }, props.title),
        props.hint !== undefined && props.hint !== null && props.hint !== '' ? h('p', { className: 'mm-state-hint' }, props.hint) : null,
        props.actionLabel !== undefined && props.actionLabel !== null
          ? h('button', { type: 'button', className: 'mm-btn', onClick: props.onAction }, props.actionLabel)
          : null,
      )
    }

    /** Open dialogs stack in mount order; only the topmost reacts to Escape / backdrop clicks. */
    const dialogStack = []

    function focusQuietly(node) {
      if (node === null || node === undefined || typeof node.focus !== 'function') return
      try {
        node.focus({ preventScroll: true })
      } catch (error) {
        try {
          node.focus()
        } catch (inner) {
          /* the invoking element may be gone */
        }
      }
    }

    /**
     * Fixed-size modal with a transparent backdrop. The body scrolls; the frame never changes
     * size. Escape, the close icon and a backdrop click all dismiss the topmost dialog.
     */
    function Dialog(props) {
      const boxRef = useRef(null)
      const stackToken = useRef({})
      const onCloseRef = useRef(props.onClose)
      onCloseRef.current = props.onClose

      useEffect(() => {
        const token = stackToken.current
        dialogStack.push(token)
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          if (dialogStack[dialogStack.length - 1] !== token) return
          event.preventDefault()
          event.stopPropagation()
          hideTooltip()
          const close = onCloseRef.current
          if (typeof close === 'function') close()
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown, true)
          hideTooltip()
          const index = dialogStack.indexOf(token)
          if (index !== -1) dialogStack.splice(index, 1)
        }
      }, [])

      useEffect(() => {
        const node = boxRef.current
        if (node !== null && typeof node.querySelector === 'function') {
          focusQuietly(node.querySelector('input, select, textarea') || node.querySelector('button'))
        }
        const returnFocus = props.returnFocus
        return () => {
          focusQuietly(returnFocus)
        }
      }, [])

      // The prototype dialog covers the layer beneath: size it to the enclosing settings panel.
      const [hostBox, setHostBox] = useState(null)
      useLayoutEffect(() => {
        if (props.size === 'confirm') return undefined
        const measure = () => {
          const node = boxRef.current
          if (node === null || node.parentElement === null) return
          const host = node.parentElement.closest('[role="dialog"]')
          if (host === null) return
          const rect = host.getBoundingClientRect()
          const width = Math.round(Math.min(rect.width, window.innerWidth - 32))
          const height = Math.round(Math.min(rect.height, window.innerHeight - 32))
          if (width > 0 && height > 0) setHostBox({ width: width, height: height })
        }
        measure()
        window.addEventListener('resize', measure)
        return () => {
          window.removeEventListener('resize', measure)
        }
      }, [])

      return h(
        'div',
        {
          className: 'mm-backdrop',
          onMouseDown: (event) => {
            if (event.target !== event.currentTarget) return
            if (dialogStack[dialogStack.length - 1] !== stackToken.current) return
            hideTooltip()
            const close = onCloseRef.current
            if (typeof close === 'function') close()
          },
        },
        h(
          'div',
          {
            className: 'mm-dialog' + (props.size === 'confirm' ? ' mm-dialog-confirm' : ''),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            ref: boxRef,
            style: hostBox === null
              ? { boxShadow: 'none' }
              : { width: hostBox.width + 'px', height: hostBox.height + 'px', maxWidth: 'none', maxHeight: 'none', boxShadow: 'none' },
          },
          h(
            'div',
            { className: 'mm-dialog-head' },
            h('h3', { className: 'mm-dialog-title' }, props.title),
            h(
              'div',
              { className: 'mm-dialog-head-actions' },
              props.headerExtra !== undefined && props.headerExtra !== null ? props.headerExtra : null,
              h(IconButton, {
                icon: ICON_X,
                size: 16,
                label: props.closeLabel,
                tooltip: props.closeTooltip,
                onClick: () => {
                  hideTooltip()
                  if (typeof props.onClose === 'function') props.onClose()
                },
              }),
            ),
          ),
          h('div', { className: 'mm-dialog-body' }, props.children),
          props.footer !== undefined && props.footer !== null
            ? h('div', { className: 'mm-dialog-foot' }, props.footer)
            : null,
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * Server row.                                                        *
     * ------------------------------------------------------------------ */

    function ToolBadge(props) {
      const tone = props.state === 'disabled' ? ' mm-tool-badge-disabled' : props.state === 'auto' ? ' mm-tool-badge-auto' : ''
      return h(
        'span',
        Object.assign({
          className: 'mm-tool-badge' + tone,
        }, tooltipHandlers(props.tip)),
        props.name,
      )
    }

    function ServerRow(props) {
      const t = props.t
      const row = props.row
      const enabled = row.disabled !== true
      const readOnly = row.readOnly === true
      const testing = props.testing === true || (props.testingAll === true && enabled)
      const status = statusOf(t, row, testing)
      const config = isObject(row.config) ? row.config : {}
      const transport = isObject(row.config) ? transportOf(row.config) : (textOf(row.transport) !== '' ? textOf(row.transport) : 'stdio')
      const target = textOf(row.target) !== '' ? textOf(row.target) : targetOfConfig(config)
      const count = toolCountOf(row)
      const names = toolNamesOf(row)
      const descriptions = toolDescriptionsOf(row)
      const lists = toolListsOf(row)
      const probe = isObject(row.lastProbe) ? row.lastProbe : null
      const latency = isObject(probe) && probe.ok === true && typeof probe.durationMs === 'number' && Number.isFinite(probe.durationMs)
        ? Math.round(probe.durationMs)
        : null
      const blocked = props.busy === true || readOnly === true
      return h(
        'div',
        { className: 'mm-row' },
        h(
          'div',
          { className: 'mm-row-main' },
          h(
            'div',
            { className: 'mm-row-left' },
            h(
              'div',
              { className: 'mm-row-line1' },
              h('span', Object.assign({
                className: 'mm-dot mm-dot-' + status.tone + (status.pulse === true ? ' mm-dot-pulse' : ''),
                role: 'img',
                'aria-label': status.text,
              }, tooltipHandlers(status.text))),
              h('span', Object.assign({
                className: 'mm-name' + (enabled === true ? '' : ' mm-name-dim'),
              }, tooltipHandlers(target !== '' ? target : DASH)), row.serverName),
              h('span', { className: 'mm-chip mm-chip-mono' }, transport),
              readOnly === true
                ? h('span', Object.assign({ className: 'mm-chip mm-chip-warn' }, tooltipHandlers(t('list.readOnlyTip'))), t('list.readOnly'))
                : null,
              enabled === true && latency !== null
                ? h('span', { className: 'mm-latency' }, t('list.latency', { ms: latency }))
                : null,
              h(
                'button',
                Object.assign({
                  type: 'button',
                  className: 'mm-tools-btn',
                  'aria-expanded': props.expanded === true ? 'true' : 'false',
                  onClick: props.onToggleExpand,
                }, tooltipHandlers(t('list.toolsTip'))),
                h('span', null, t('list.tools', { count: count === null ? DASH : String(count) })),
                h(Svg, { d: ICON_CHEVRON, size: 12, className: 'mm-chevron' + (props.expanded === true ? ' mm-chevron-open' : '') }),
              ),
            ),
            h('div', { className: 'mm-summary' }, target !== '' ? target : DASH),
          ),
          h(
            'div',
            { className: 'mm-actions' },
            h(IconButton, {
              icon: ICON_POWER,
              label: enabled === true ? t('action.toggleDisable') : t('action.toggleEnable'),
              tooltip: enabled === true ? t('action.toggleDisable') : t('action.toggleEnable'),
              tone: enabled === true ? 'ok' : '',
              disabled: blocked,
              onClick: () => {
                if (typeof props.onToggleEnabled === 'function') props.onToggleEnabled(row)
              },
            }),
            h(IconButton, {
              icon: ICON_REFRESH,
              label: t('action.test'),
              tooltip: t('action.test'),
              tone: testing === true ? 'warn' : '',
              spin: testing === true,
              disabled: blocked,
              onClick: () => {
                if (typeof props.onTest === 'function') props.onTest(row)
              },
            }),
            h(IconButton, {
              icon: ICON_EDIT,
              label: t('action.edit'),
              tooltip: t('action.edit'),
              disabled: blocked,
              onClick: () => {
                if (typeof props.onEdit === 'function') props.onEdit(row)
              },
            }),
            h(IconButton, {
              icon: ICON_TRASH,
              label: t('action.delete'),
              tooltip: t('action.delete'),
              tone: 'danger',
              disabled: blocked,
              onClick: () => {
                if (typeof props.onDelete === 'function') props.onDelete(row)
              },
            }),
          ),
        ),
        props.expanded === true
          ? h(
            'div',
            { className: 'mm-expand' },
            names.length === 0
              ? h('span', { className: 'mm-muted' }, t('list.noTools'))
              : names.map((name) => {
                const isAuto = lists.auto.indexOf(name) !== -1
                const isDisabled = lists.disabled.indexOf(name) !== -1
                const description = descriptions[name] !== undefined ? descriptions[name] : ''
                const stateText = isDisabled ? t('tool.stateDisabled') : isAuto ? t('tool.stateAuto') : t('tool.stateDefault')
                const tip = (description !== '' ? description + ' · ' : '') + stateText
                return h(ToolBadge, {
                  key: name,
                  name: name,
                  state: isDisabled ? 'disabled' : isAuto ? 'auto' : 'default',
                  tip: tip,
                })
              }),
          )
          : null,
      )
    }

    /* ------------------------------------------------------------------ *
     * Editor dialog.                                                     *
     * ------------------------------------------------------------------ */

    function EditorDialog(props) {
      const t = props.t
      const mode = props.mode
      const row = props.row
      const pushToast = props.pushToast

      const initialTools = mode === 'edit' && isObject(row) ? probedToolsFromRow(row) : []
      const initialProbe = mode === 'edit' && isObject(row) && isObject(row.lastProbe) ? row.lastProbe : null
      const initialHasProbe = isObject(initialProbe)
        && ((Array.isArray(initialProbe.tools) && initialProbe.tools.length > 0)
          || (Array.isArray(initialProbe.toolNames) && initialProbe.toolNames.length > 0))
      const [draft, setDraft] = useState(() => (mode === 'edit' && isObject(row) ? draftFromRow(row) : emptyDraft()))
      const [policy, setPolicyState] = useState(() => (mode === 'edit' && isObject(row) ? policyFromRow(row) : {}))
      const policyRef = useRef(policy)
      const [probedTools, setProbedTools] = useState(initialTools)
      const [probeState, setProbeState] = useState(() => (initialHasProbe
        ? { phase: 'ok', message: t('editor.toolsProbed', { count: initialTools.length }) }
        : { phase: 'idle', message: t('editor.toolsIdle') }))
      const [toolFilter, setToolFilter] = useState('')
      const [advancedOpen, setAdvancedOpen] = useState(false)
      const [tab, setTab] = useState('form')
      const [jsonText, setJsonText] = useState('')
      const [jsonFeedback, setJsonFeedback] = useState({ kind: 'ok', text: '' })
      const [testing, setTesting] = useState(false)
      const [testResult, setTestResult] = useState({ kind: 'idle', text: '' })
      const [saving, setSaving] = useState(false)

      // Mirror every policy write into a ref synchronously so an in-flight probe merges its
      // response against the policy as it is now, not the one captured when the probe started.
      function setPolicy(next) {
        const value = typeof next === 'function' ? next(policyRef.current) : next
        policyRef.current = value
        setPolicyState(value)
      }

      function setField(key, value) {
        setDraft((prev) => {
          const next = Object.assign({}, prev)
          next[key] = value
          return next
        })
      }

      function setArgsText(value) {
        setDraft((prev) => Object.assign({}, prev, { argsText: value, argsDirty: true }))
      }

      function updateRow(listKey, index, field, value) {
        setDraft((prev) => {
          const rows = prev[listKey].slice()
          if (rows[index] === undefined) return prev
          rows[index] = Object.assign({}, rows[index], { [field]: value })
          const next = Object.assign({}, prev)
          next[listKey] = rows
          return next
        })
      }

      function addRow(listKey) {
        setDraft((prev) => {
          const next = Object.assign({}, prev)
          next[listKey] = prev[listKey].concat([{ key: '', value: '' }])
          return next
        })
      }

      function removeRow(listKey, index) {
        setDraft((prev) => {
          const next = Object.assign({}, prev)
          next[listKey] = prev[listKey].filter((entry, position) => position !== index)
          return next
        })
      }

      function setToolPolicy(name, next) {
        setPolicy((prev) => {
          const copy = Object.assign({}, prev)
          if (next === 'default') delete copy[name]
          else copy[name] = next
          return copy
        })
      }

      function syncJsonFromForm() {
        const text = JSON.stringify(cleanJsonObject(draftValues(draft, policy)), null, 2)
        setJsonText(text)
        setJsonFeedback({ kind: 'ok', text: t('editor.jsonValid') })
        return text
      }

      function parseJsonValues(text, baseDraft) {
        const raw = textOf(text).trim()
        if (raw === '') return { ok: false, message: t('editor.jsonEmpty') }
        let parsed
        try {
          parsed = JSON.parse(raw)
        } catch (error) {
          return { ok: false, message: t('editor.jsonInvalid', { message: messageOf(error) }) }
        }
        const extracted = extractServerNode(parsed)
        if (extracted === null) return { ok: false, message: t('editor.jsonShape') }
        const applied = applyParsedNode(baseDraft, extracted.node)
        const nextDraft = extracted.id !== '' ? Object.assign({}, applied.draft, { serverName: extracted.id }) : applied.draft
        return { ok: true, draft: nextDraft, policy: applied.policy, name: nextDraft.serverName }
      }

      function parseJsonText(text) {
        const result = parseJsonValues(text, draft)
        if (result.ok !== true) {
          setJsonFeedback({ kind: 'err', text: result.message })
          return false
        }
        setDraft(result.draft)
        setPolicy(result.policy)
        setProbedTools((prev) => mergeTools([], prev, result.policy))
        setJsonFeedback({ kind: 'ok', text: t('editor.jsonParsed', { name: result.name !== '' ? result.name : 'mcp-server' }) })
        return true
      }

      function handleJsonChange(text) {
        setJsonText(text)
        if (textOf(text).trim() === '') {
          setJsonFeedback({ kind: 'err', text: t('editor.jsonEmpty') })
          return
        }
        parseJsonText(text)
      }

      function switchTab(next) {
        if (next === tab) return
        if (next === 'json') {
          syncJsonFromForm()
          setTab('json')
          return
        }
        if (parseJsonText(jsonText)) setTab('form')
      }

      async function copyJson() {
        const text = tab === 'json' ? jsonText : syncJsonFromForm()
        const ok = await copyText(text)
        pushToast(ok === true ? 'ok' : 'err', ok === true ? t('toast.copied') : t('toast.copyFailed'))
      }

      function fillSample() {
        const text = JSON.stringify(JSON_SAMPLE, null, 2)
        setJsonText(text)
        if (parseJsonText(text)) pushToast('ok', t('toast.jsonSample'))
      }

      /** Report fetched tools, noting the server-reported total when it differs. */
      function probeMessage(count) {
        const known = isObject(props.row) && Number.isFinite(props.row.toolCount) ? props.row.toolCount : null
        if (known !== null && known > count) return t('editor.toolsProbedTotal', { count: count, total: known })
        return t('editor.toolsProbed', { count: count })
      }

      async function runProbe(silent) {
        const values = draftValues(draft, policy)
        let validation = ''
        if (values.transport === 'sse') validation = t('editor.sseBlocked')
        else if (values.transport === 'stdio' && values.command === '') validation = t('editor.validationCommand')
        else if (values.transport !== 'stdio' && values.url === '') validation = t('editor.validationUrl')
        if (validation !== '') {
          if (silent !== true) {
            setProbeState({ phase: 'error', message: validation })
            pushToast('err', validation)
          }
          return { ok: false, error: { message: validation } }
        }
        const name = values.serverName !== '' ? values.serverName : 'probe-server'
        setProbeState({ phase: 'probing', message: '' })
        try {
          // Prefer the harness's own live connection: some MCP servers (searxng among them)
          // allow a single concurrent session and answer a second one with 503 "Server busy".
          let live = null
          try {
            live = await callApi('connectedTools', { serverName: name })
          } catch {
            live = null
          }
          if (isObject(live) && live.connected === true && Array.isArray(live.tools) && live.tools.length > 0) {
            const mergedLive = mergeTools(live.tools, [], policyRef.current)
            setProbedTools(mergedLive)
            setProbeState({ phase: 'ok', message: probeMessage(mergedLive.length) })
            if (silent !== true) pushToast('ok', t('toast.probeOk', { count: mergedLive.length }))
            return { ok: true, tools: live.tools, toolCount: live.tools.length }
          }
          const config = cleanHostConfig(values)
          config.serverName = name
          const payload = await callApi('probe', { config: config })
          const result = isObject(payload.result) ? payload.result : {}
          if (result.ok === true) {
            const tools = Array.isArray(result.tools) ? result.tools : []
            // Replace the previous probe result; only tools that still carry a custom policy
            // in the *latest* policy (it may have been reset while probing) but were not
            // returned this time survive (same rule as the prototype).
            const merged = mergeTools(tools, [], policyRef.current)
            setProbedTools(merged)
            setProbeState({ phase: 'ok', message: probeMessage(merged.length) })
            if (silent !== true) pushToast('ok', t('toast.probeOk', { count: merged.length }))
            return result
          }
          const message = isObject(result.error) && textOf(result.error.message) !== '' ? textOf(result.error.message) : t('common.unknownError')
          setProbeState({ phase: 'error', message: t('editor.toolsFailed', { message: message }) })
          if (silent !== true) pushToast('err', t('toast.probeFail', { message: message }))
          return result
        } catch (error) {
          const message = describeError(t, error)
          setProbeState({ phase: 'error', message: t('editor.toolsFailed', { message: message }) })
          if (silent !== true) pushToast('err', t('toast.probeFail', { message: message }))
          return { ok: false, error: { message: message } }
        }
      }

      function toggleAdvanced() {
        const next = !advancedOpen
        setAdvancedOpen(next)
        if (next === true && probeState.phase !== 'ok' && probeState.phase !== 'probing') {
          runProbe(true)
        }
      }

      async function handleTest() {
        if (testing === true) return
        setTesting(true)
        setTestResult({ kind: 'busy', text: t('editor.testing') })
        const result = await runProbe(true)
        if (isObject(result) && result.ok === true) {
          const ms = typeof result.durationMs === 'number' && Number.isFinite(result.durationMs) ? Math.round(result.durationMs) : 0
          const tools = Array.isArray(result.tools) ? result.tools.length : (typeof result.toolCount === 'number' ? result.toolCount : 0)
          setTestResult({ kind: 'ok', text: t('editor.testOk', { ms: ms, tools: tools }) })
        } else {
          const message = isObject(result) && isObject(result.error) && textOf(result.error.message) !== ''
            ? textOf(result.error.message)
            : t('common.unknownError')
          setTestResult({ kind: 'err', text: t('editor.testFail', { message: message }) })
        }
        setTesting(false)
      }

      async function handleSave() {
        if (saving === true) return
        let valuesDraft = draft
        let valuesPolicy = policy
        if (tab === 'json') {
          const parsed = parseJsonValues(jsonText, draft)
          if (parsed.ok !== true) {
            setJsonFeedback({ kind: 'err', text: parsed.message })
            pushToast('err', t('editor.jsonBlocked'))
            return
          }
          valuesDraft = parsed.draft
          valuesPolicy = parsed.policy
          setDraft(valuesDraft)
          setPolicy(valuesPolicy)
        }
        const values = draftValues(valuesDraft, valuesPolicy)
        if (!SERVER_NAME_PATTERN.test(values.serverName)) {
          pushToast('err', t('editor.validationName'))
          return
        }
        if (values.transport === 'sse') {
          pushToast('err', t('editor.sseBlocked'))
          return
        }
        if (values.transport === 'stdio' && values.command === '') {
          pushToast('err', t('editor.validationCommand'))
          return
        }
        if (values.transport !== 'stdio' && (values.url === '' || !HTTP_URL_PATTERN.test(values.url))) {
          pushToast('err', t('editor.validationUrl'))
          return
        }
        if (valuesDraft.timeoutText.trim() !== '' && (!Number.isFinite(values.timeout) || values.timeout < 1000 || values.timeout > 3600000)) {
          pushToast('err', t('editor.validationTimeout'))
          return
        }
        if (valuesDraft.retriesText.trim() !== '' && (!Number.isFinite(values.retries) || values.retries < 1 || values.retries > 1000)) {
          pushToast('err', t('editor.validationRetries'))
          return
        }
        const config = cleanHostConfig(values)
        const extra = cleanExtra(values, mode === 'edit' && isObject(row) ? row.extra : null)
        setSaving(true)
        try {
          if (mode === 'edit' && isObject(row)) {
            await callApi('update', { id: row.id, level: row.level, config: config, extra: extra })
            pushToast('ok', t('toast.updated', { name: values.serverName }))
          } else {
            await callApi('create', { level: 'workspace', config: config, extra: extra })
            pushToast('ok', t('toast.created', { name: values.serverName }))
          }
          if (typeof props.onSaved === 'function') props.onSaved()
        } catch (error) {
          pushToast('err', t('toast.saveFailed', { message: describeError(t, error) }))
        } finally {
          setSaving(false)
        }
      }

      const values = draftValues(draft, policy)
      let autoCount = 0
      let disabledCount = 0
      for (const name of Object.keys(policy)) {
        if (policy[name] === 'auto') autoCount += 1
        else if (policy[name] === 'disabled') disabledCount += 1
      }
      const timeoutValue = parseIntStrict(draft.timeoutText)
      const retriesValue = parseIntStrict(draft.retriesText)
      const customized = (draft.transport === 'stdio' && draft.cwd.trim() !== '')
        || (Number.isFinite(timeoutValue) && timeoutValue !== DEFAULT_TIMEOUT_MS)
        || (Number.isFinite(retriesValue) && retriesValue !== DEFAULT_MAX_RETRIES)
        || (draft.transport !== 'stdio' && (draft.oauthClientId.trim() !== '' || draft.oauthScopes.trim() !== ''))
        || Object.keys(policy).length > 0
      const filterQuery = toolFilter.trim().toLowerCase()
      const filteredTools = filterQuery === ''
        ? probedTools
        : probedTools.filter((tool) => tool.name.toLowerCase().includes(filterQuery) || tool.description.toLowerCase().includes(filterQuery))
      const statusClass = probeState.phase === 'ok'
        ? ' mm-tools-status-ok'
        : probeState.phase === 'error'
          ? ' mm-tools-status-err'
          : probeState.phase === 'probing' ? ' mm-tools-status-warn' : ''
      const statusText = probeState.phase === 'probing'
        ? t('editor.toolsProbing')
        : probeState.message !== '' ? probeState.message : t('editor.toolsIdle')

      const tabs = h(
        'div',
        { className: 'mm-tabs', role: 'group' },
        h('button', {
          type: 'button',
          className: 'mm-tab' + (tab === 'form' ? ' mm-tab-active' : ''),
          'aria-pressed': tab === 'form' ? 'true' : 'false',
          onClick: () => switchTab('form'),
        }, t('editor.tabForm')),
        h(
          'button',
          Object.assign({
            type: 'button',
            className: 'mm-tab' + (tab === 'json' ? ' mm-tab-active' : ''),
            'aria-pressed': tab === 'json' ? 'true' : 'false',
            onClick: () => switchTab('json'),
          }, tooltipHandlers(t('action.jsonTip'))),
          t('editor.tabJson'),
        ),
      )

      function kvEditor(listKey, label, tip, keyPlaceholder, valuePlaceholder) {
        return h(
          'div',
          null,
          h(
            'div',
            { className: 'mm-label-row' },
            h(
              'span',
              { className: 'mm-field-label' },
              h('span', null, label),
              h(HelpDot, { tip: tip }),
            ),
            h('button', { type: 'button', className: 'mm-link-btn', onClick: () => addRow(listKey) }, t('action.add')),
          ),
          h(
            'div',
            { className: 'mm-kv' },
            draft[listKey].map((entry, index) => h(
              'div',
              { className: 'mm-kv-row', key: index },
              h('input', {
                className: 'mm-input mm-mono mm-kv-key',
                value: entry.key,
                placeholder: keyPlaceholder,
                spellCheck: false,
                onChange: (event) => updateRow(listKey, index, 'key', event.target.value),
              }),
              h('input', {
                className: 'mm-input mm-mono mm-kv-val',
                value: entry.value,
                placeholder: valuePlaceholder,
                spellCheck: false,
                onChange: (event) => updateRow(listKey, index, 'value', event.target.value),
              }),
              h(
                'button',
                Object.assign({
                  type: 'button',
                  className: 'mm-kv-del',
                  'aria-label': t('action.removeRow'),
                  onClick: () => removeRow(listKey, index),
                }, tooltipHandlers(t('action.removeRow'))),
                h(Svg, { d: ICON_X, size: 14 }),
              ),
            )),
          ),
        )
      }

      function toolRow(tool) {
        const current = policy[tool.name] !== undefined ? policy[tool.name] : 'default'
        const nameClass = current === 'auto' ? ' mm-tool-name-auto' : current === 'disabled' ? ' mm-tool-name-disabled' : ''
        const seg = (value, label, tip) => h(
          'button',
          Object.assign({
            type: 'button',
            className: 'mm-seg-btn mm-seg-btn-' + value + (current === value ? ' mm-seg-btn-active' : ''),
            'aria-pressed': current === value ? 'true' : 'false',
            onClick: () => setToolPolicy(tool.name, value),
          }, tooltipHandlers(tip)),
          label,
        )
        return h(
          'div',
          { className: 'mm-tool-row', key: tool.name },
          h(
            'div',
            { className: 'mm-tool-info' },
            h('span', { className: 'mm-tool-name' + nameClass }, tool.name),
            tool.description !== '' ? h('span', { className: 'mm-tool-desc' }, tool.description) : null,
          ),
          h(
            'div',
            { className: 'mm-seg' },
            seg('default', t('tool.default'), t('tool.defaultTip')),
            seg('auto', t('tool.auto'), t('tool.autoTip')),
            seg('disabled', t('tool.disabled'), t('tool.disabledTip')),
          ),
        )
      }

      const toolsPanel = h(
        'div',
        { className: 'mm-tools-panel' },
        h(
          'div',
          { className: 'mm-tools-head' },
          h(
            'div',
            { className: 'mm-tools-title' },
            h('span', null, t('editor.toolsTitle')),
            h(HelpDot, { tip: t('editor.toolsTip') }),
            h('span', { className: 'mm-tools-status' + statusClass }, statusText),
          ),
          h(
            'button',
            Object.assign({
              type: 'button',
              className: 'mm-btn mm-btn-sm',
              disabled: probeState.phase === 'probing',
              onClick: () => runProbe(false),
            }, tooltipHandlers(t('action.probeTip'))),
            h(Svg, { d: ICON_REFRESH, size: 12, className: probeState.phase === 'probing' ? 'mm-spin-icon' : '' }),
            h('span', null, t('action.probe')),
          ),
        ),
        h(
          'div',
          { className: 'mm-tools-toolbar' },
          h('input', {
            className: 'mm-tools-filter',
            value: toolFilter,
            placeholder: t('editor.filterTools'),
            spellCheck: false,
            onChange: (event) => setToolFilter(event.target.value),
          }),
          h(
            'div',
            { className: 'mm-tools-batch' },
            h('span', null, t('editor.toolSummary', { auto: autoCount, disabled: disabledCount })),
            h('span', { className: 'mm-divider', 'aria-hidden': 'true' }),
            h('button', { type: 'button', className: 'mm-link-btn', onClick: () => {
              setPolicy((prev) => {
                const copy = Object.assign({}, prev)
                for (const tool of probedTools) copy[tool.name] = 'auto'
                return copy
              })
            } }, t('action.allAuto')),
            h('button', { type: 'button', className: 'mm-link-btn', onClick: () => setPolicy({}) }, t('action.resetDefault')),
          ),
        ),
        h(
          'div',
          { className: 'mm-tools-list' },
          filteredTools.length === 0
            ? h('div', { className: 'mm-tools-empty' }, t('editor.toolsEmpty'))
            : filteredTools.map(toolRow),
        ),
      )

      const stdioPanel = h(
        Fragment,
        null,
        h(
          Field,
          { label: t('editor.command'), tip: t('editor.commandTip'), required: true, requiredLabel: t('editor.required') },
          h('input', {
            className: 'mm-input mm-mono',
            value: draft.command,
            placeholder: t('editor.commandPlaceholder'),
            spellCheck: false,
            onChange: (event) => setField('command', event.target.value),
          }),
        ),
        h(
          Field,
          { label: t('editor.args'), tip: t('editor.argsTip') },
          h('textarea', {
            className: 'mm-input mm-mono mm-textarea',
            rows: 2,
            value: draft.argsText,
            placeholder: t('editor.argsPlaceholder'),
            spellCheck: false,
            onChange: (event) => setArgsText(event.target.value),
          }),
        ),
        kvEditor('envRows', t('editor.env'), t('editor.envTip'), t('editor.kvKeyEnv'), t('editor.kvValEnv')),
      )

      const remotePanel = h(
        Fragment,
        null,
        h(
          Field,
          { label: t('editor.url'), tip: t('editor.urlTip'), required: true, requiredLabel: t('editor.required') },
          h('input', {
            className: 'mm-input mm-mono',
            value: draft.url,
            placeholder: t('editor.urlPlaceholder'),
            spellCheck: false,
            onChange: (event) => setField('url', event.target.value),
          }),
        ),
        kvEditor('headersRows', t('editor.headers'), t('editor.headersTip'), t('editor.kvKeyHeader'), t('editor.kvValHeader')),
      )

      const advancedFields = draft.transport === 'stdio'
        ? h(
          'div',
          { className: 'mm-adv-grid' },
          h(
            Field,
            { label: t('editor.cwd'), tip: t('editor.cwdTip'), small: true },
            h('input', {
              className: 'mm-input mm-mono',
              value: draft.cwd,
              placeholder: t('editor.cwdPlaceholder'),
              spellCheck: false,
              onChange: (event) => setField('cwd', event.target.value),
            }),
          ),
          h(
            Field,
            { label: t('editor.timeout'), tip: t('editor.timeoutTip'), small: true },
            h('input', {
              className: 'mm-input mm-mono',
              type: 'number',
              value: draft.timeoutText,
              placeholder: t('editor.timeoutPlaceholder'),
              min: 1000,
              max: 3600000,
              step: 1000,
              onChange: (event) => setField('timeoutText', event.target.value),
            }),
          ),
          h(
            Field,
            { label: t('editor.retries'), tip: t('editor.retriesTip'), small: true },
            h('input', {
              className: 'mm-input mm-mono',
              type: 'number',
              value: draft.retriesText,
              placeholder: t('editor.retriesPlaceholder'),
              min: 1,
              max: 1000,
              step: 1,
              onChange: (event) => setField('retriesText', event.target.value),
            }),
          ),
        )
        : h(
          Fragment,
          null,
          h(
            'div',
            { className: 'mm-adv-grid mm-adv-grid-2' },
            h(
              Field,
              { label: t('editor.timeout'), tip: t('editor.timeoutTip'), small: true },
              h('input', {
                className: 'mm-input mm-mono',
                type: 'number',
                value: draft.timeoutText,
                placeholder: t('editor.timeoutPlaceholder'),
                min: 1000,
                max: 3600000,
                step: 1000,
                onChange: (event) => setField('timeoutText', event.target.value),
              }),
            ),
            h(
              Field,
              { label: t('editor.retries'), tip: t('editor.retriesTip'), small: true },
              h('input', {
                className: 'mm-input mm-mono',
                type: 'number',
                value: draft.retriesText,
                placeholder: t('editor.retriesPlaceholder'),
                min: 1,
                max: 1000,
                step: 1,
                onChange: (event) => setField('retriesText', event.target.value),
              }),
            ),
          ),
          h(
            'div',
            { className: 'mm-adv-grid mm-adv-grid-2' },
            h(
              Field,
              { label: t('editor.oauthClientId'), tip: t('editor.oauthClientIdTip'), small: true },
              h('input', {
                className: 'mm-input mm-mono',
                value: draft.oauthClientId,
                placeholder: t('editor.oauthClientIdPlaceholder'),
                spellCheck: false,
                onChange: (event) => setField('oauthClientId', event.target.value),
              }),
            ),
            h(
              Field,
              { label: t('editor.oauthScopes'), tip: t('editor.oauthScopesTip'), small: true },
              h('input', {
                className: 'mm-input mm-mono',
                value: draft.oauthScopes,
                placeholder: t('editor.oauthScopesPlaceholder'),
                spellCheck: false,
                onChange: (event) => setField('oauthScopes', event.target.value),
              }),
            ),
          ),
        )

      const advanced = h(
        'div',
        { className: 'mm-adv' },
        h(
          'button',
          {
            type: 'button',
            className: 'mm-adv-toggle',
            'aria-expanded': advancedOpen === true ? 'true' : 'false',
            onClick: toggleAdvanced,
          },
          h(
            'span',
            { className: 'mm-adv-title' },
            h('span', null, t('editor.advanced')),
            customized === true ? h('span', { className: 'mm-badge' }, t('editor.customized')) : null,
          ),
          h(Svg, { d: ICON_CHEVRON, size: 16, className: 'mm-chevron' + (advancedOpen === true ? ' mm-chevron-open' : '') }),
        ),
        advancedOpen === true
          ? h('div', { className: 'mm-adv-panel' }, advancedFields, toolsPanel)
          : null,
      )

      const formPanel = h(
        'div',
        { className: 'mm-form' },
        h(
          'div',
          { className: 'mm-grid-name' },
          h(
            Field,
            { label: t('editor.name'), tip: t('editor.nameTip'), required: true, requiredLabel: t('editor.required') },
            h('input', {
              className: 'mm-input mm-mono',
              value: draft.serverName,
              placeholder: t('editor.namePlaceholder'),
              spellCheck: false,
              onChange: (event) => setField('serverName', event.target.value),
            }),
          ),
          h(
            Field,
            { label: t('editor.transport'), tip: t('editor.transportTip') },
            h(
              'select',
              {
                className: 'mm-input mm-mono mm-select',
                value: draft.transport,
                onChange: (event) => setField('transport', event.target.value),
              },
              h('option', { value: 'stdio' }, 'stdio'),
              h('option', { value: 'streamable-http' }, 'streamable-http'),
              h('option', { value: 'sse' }, 'sse'),
            ),
          ),
        ),
        draft.transport === 'sse' ? h('p', { className: 'mm-hint mm-hint-warn' }, t('editor.sseHint')) : null,
        draft.transport === 'stdio' ? stdioPanel : remotePanel,
        advanced,
      )

      const jsonPanel = h(
        'div',
        { className: 'mm-json' },
        h(
          'div',
          { className: 'mm-json-toolbar' },
          h('span', null, t('editor.jsonHint')),
          h(
            'div',
            { className: 'mm-json-actions' },
            h('button', { type: 'button', className: 'mm-btn mm-btn-sm', onClick: fillSample }, t('action.pasteSample')),
            h('button', { type: 'button', className: 'mm-btn mm-btn-sm', onClick: copyJson }, t('action.copyConfig')),
          ),
        ),
        h('textarea', {
          className: 'mm-input mm-mono mm-textarea mm-json-area',
          value: jsonText,
          spellCheck: false,
          onChange: (event) => handleJsonChange(event.target.value),
        }),
        jsonFeedback.text !== ''
          ? h('div', { className: 'mm-feedback mm-feedback-' + (jsonFeedback.kind === 'ok' ? 'ok' : 'err') }, jsonFeedback.text)
          : null,
      )

      const footer = h(
        Fragment,
        null,
        h(
          'div',
          { className: 'mm-foot-left' },
          h('button', {
            type: 'button',
            className: 'mm-btn mm-btn-sm mm-test-btn',
            disabled: testing === true,
            onClick: handleTest,
          }, t('action.test')),
          testResult.text !== ''
            ? h('span', { className: 'mm-test-result mm-test-' + testResult.kind }, testResult.text)
            : null,
        ),
        h(
          'div',
          { className: 'mm-foot-right' },
          h('button', { type: 'button', className: 'mm-btn mm-btn-ghost', onClick: props.onClose }, t('action.cancel')),
          h('button', { type: 'button', className: 'mm-btn mm-btn-primary', disabled: saving === true, onClick: handleSave }, t('action.save')),
        ),
      )

      return h(
        Dialog,
        {
          title: mode === 'edit' ? t('editor.editTitle') : t('editor.addTitle'),
          size: 'editor',
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          closeLabel: t('action.close'),
          closeTooltip: t('action.close'),
          headerExtra: tabs,
          footer: footer,
        },
        tab === 'json' ? jsonPanel : formPanel,
      )
    }

    /* ------------------------------------------------------------------ *
     * Delete confirmation.                                               *
     * ------------------------------------------------------------------ */

    function DeleteDialog(props) {
      const t = props.t
      const row = props.row
      const footer = h(
        Fragment,
        null,
        h('div', { className: 'mm-foot-left' }),
        h(
          'div',
          { className: 'mm-foot-right' },
          h('button', { type: 'button', className: 'mm-btn mm-btn-ghost', onClick: props.onClose }, t('delete.cancel')),
          h('button', { type: 'button', className: 'mm-btn mm-btn-danger', disabled: props.busy === true, onClick: props.onConfirm }, t('delete.confirm')),
        ),
      )
      return h(
        Dialog,
        {
          title: t('delete.title'),
          size: 'confirm',
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          closeLabel: t('action.close'),
          closeTooltip: t('action.close'),
          footer: footer,
        },
        h(
          'p',
          { className: 'mm-delete-desc' },
          t('delete.descPrefix'),
          h('code', { className: 'mm-mono mm-delete-name' }, row.serverName),
          t('delete.descSuffix'),
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * Settings page.                                                     *
     * ------------------------------------------------------------------ */

    function McpPage(props) {
      const bound = props !== null && props !== undefined && typeof props.t === 'function' ? props.t : activeT
      const t = typeof bound === 'function' ? bound : function fallback(key) { return key }
      const tRef = useRef(t)
      tRef.current = t

      const [data, setData] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [unauthorized, setUnauthorized] = useState(false)
      const [query, setQuery] = useState('')
      const [expanded, setExpanded] = useState({})
      const [testingIds, setTestingIds] = useState({})
      const [testingAll, setTestingAll] = useState(false)
      const [busy, setBusy] = useState(false)
      const [editor, setEditor] = useState(null)
      const [deleteTarget, setDeleteTarget] = useState(null)
      const [deleting, setDeleting] = useState(false)
      const [toasts, setToasts] = useState([])
      const toastSeq = useRef(0)
      const returnFocus = useRef(null)

      const pushToast = useCallback((kind, text) => {
        toastSeq.current += 1
        const id = toastSeq.current
        setToasts((prev) => prev.concat([{ id: id, kind: kind, text: text }]))
        setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id))
        }, 2600)
      }, [])

      const load = useCallback(async () => {
        try {
          const payload = await callApi('state', {})
          setData(payload)
          setError(null)
          setUnauthorized(false)
        } catch (failure) {
          if (failure !== null && failure !== undefined && failure.code === 'unauthorized') {
            setUnauthorized(true)
            setError(null)
          } else {
            setError(describeError(tRef.current, failure))
          }
        } finally {
          setLoading(false)
        }
      }, [])

      useEffect(() => {
        load()
        const timer = setInterval(load, POLL_MS)
        return () => {
          clearInterval(timer)
        }
      }, [load])

      const rows = isObject(data) && Array.isArray(data.rows) ? data.rows : []
      const warnings = isObject(data) && Array.isArray(data.warnings) ? data.warnings.map((entry) => textOf(entry)).filter((entry) => entry !== '') : []
      const trimmedQuery = query.trim().toLowerCase()
      const filteredRows = trimmedQuery === ''
        ? rows
        : rows.filter((row) => {
          const config = isObject(row.config) ? row.config : {}
          const target = textOf(row.target) !== '' ? textOf(row.target) : targetOfConfig(config)
          const transport = isObject(row.config) ? transportOf(row.config) : textOf(row.transport)
          const haystack = [textOf(row.serverName), target, textOf(row.id), transport].join(' ').toLowerCase()
          return haystack.includes(trimmedQuery)
        })

      async function toggleEnabled(row) {
        if (busy === true) return
        const nextEnabled = row.disabled === true
        setBusy(true)
        try {
          await callApi('setEnabled', { id: row.id, level: row.level, enabled: nextEnabled })
          pushToast('ok', nextEnabled === true ? t('toast.enabled', { name: row.serverName }) : t('toast.disabled', { name: row.serverName }))
          await load()
        } catch (failure) {
          pushToast('err', t('toast.operationFailed', { message: describeError(t, failure) }))
        } finally {
          setBusy(false)
        }
      }

      async function testOne(row) {
        if (testingIds[row.id] === true) return
        setTestingIds((prev) => {
          const next = Object.assign({}, prev)
          next[row.id] = true
          return next
        })
        try {
          const payload = await callApi('probe', { id: row.id, level: row.level })
          const result = isObject(payload.result) ? payload.result : {}
          if (result.ok === true) {
            const ms = typeof result.durationMs === 'number' && Number.isFinite(result.durationMs) ? Math.round(result.durationMs) : 0
            const tools = typeof result.toolCount === 'number' ? result.toolCount : (Array.isArray(result.tools) ? result.tools.length : 0)
            pushToast('ok', t('toast.testOk', { name: row.serverName, ms: ms, tools: tools }))
          } else {
            const message = isObject(result.error) && textOf(result.error.message) !== '' ? textOf(result.error.message) : t('common.unknownError')
            pushToast('err', t('toast.testFail', { name: row.serverName, message: message }))
          }
          await load()
        } catch (failure) {
          pushToast('err', t('toast.testFail', { name: row.serverName, message: describeError(t, failure) }))
        } finally {
          setTestingIds((prev) => {
            const next = Object.assign({}, prev)
            delete next[row.id]
            return next
          })
        }
      }

      async function testAll() {
        if (testingAll === true) return
        const enabledRows = rows.filter((row) => row.disabled !== true && row.readOnly !== true)
        if (enabledRows.length === 0) {
          pushToast('info', t('toast.testAllNone'))
          return
        }
        setTestingAll(true)
        try {
          await callApi('probeAll', {})
          pushToast('ok', t('toast.testAllDone', { count: enabledRows.length }))
          await load()
        } catch (failure) {
          pushToast('err', t('toast.operationFailed', { message: describeError(t, failure) }))
        } finally {
          setTestingAll(false)
        }
      }

      function openEditor(mode, row) {
        returnFocus.current = typeof document !== 'undefined' && document !== null ? document.activeElement : null
        setEditor({ mode: mode, row: row })
      }

      function closeEditor() {
        setEditor(null)
      }

      function handleSaved() {
        setEditor(null)
        load()
      }

      function requestDelete(row) {
        returnFocus.current = typeof document !== 'undefined' && document !== null ? document.activeElement : null
        setDeleteTarget(row)
      }

      async function confirmDelete() {
        if (deleteTarget === null || deleting === true) return
        setDeleting(true)
        try {
          await callApi('remove', { id: deleteTarget.id, level: deleteTarget.level })
          pushToast('ok', t('toast.deleted', { name: deleteTarget.serverName }))
          setDeleteTarget(null)
          await load()
        } catch (failure) {
          pushToast('err', t('toast.operationFailed', { message: describeError(t, failure) }))
        } finally {
          setDeleting(false)
        }
      }

      function toggleExpanded(row) {
        setExpanded((prev) => {
          const next = Object.assign({}, prev)
          if (next[row.id] === true) delete next[row.id]
          else next[row.id] = true
          return next
        })
      }

      const header = h(
        'div',
        { className: 'mm-head' },
        h(
          'div',
          { className: 'mm-head-left' },
          h('h2', { className: 'mm-title' }, t('page.title')),
          h(HelpDot, { tip: t('page.help') }),
        ),
        h(
          'div',
          { className: 'mm-head-actions' },
          h(
            'div',
            { className: 'mm-search' },
            h(Svg, { d: ICON_SEARCH, size: 14, className: 'mm-search-icon' }),
            h('input', {
              className: 'mm-search-input',
              value: query,
              placeholder: t('page.searchPlaceholder'),
              'aria-label': t('page.searchPlaceholder'),
              spellCheck: false,
              onChange: (event) => setQuery(event.target.value),
            }),
          ),
          h(IconButton, {
            icon: ICON_ZAP,
            label: t('page.testAll'),
            tooltip: t('page.testAll'),
            className: 'mm-toolbar-btn',
            spin: testingAll === true,
            disabled: busy === true,
            onClick: testAll,
          }),
          h(
            'button',
            { type: 'button', className: 'mm-btn mm-btn-primary', onClick: () => openEditor('create', null) },
            h(Svg, { d: ICON_PLUS, size: 15, strokeWidth: 2 }),
            h('span', null, t('page.add')),
          ),
        ),
      )

      const warningsBanner = warnings.length > 0
        ? h(
          'div',
          { className: 'mm-warn-banner' },
          h('span', { className: 'mm-warn-label' }, t('page.warnings')),
          h('span', null, warnings.join(' · ')),
        )
        : null

      const errorBanner = error !== null && data !== null
        ? h('div', { className: 'mm-error-banner' }, error)
        : null

      let content
      if (unauthorized === true) {
        content = h(StatePanel, { title: t('page.unauthorized'), actionLabel: t('page.retry'), onAction: load })
      } else if (error !== null && data === null) {
        content = h(StatePanel, { title: t('page.error'), hint: error, actionLabel: t('page.retry'), onAction: load })
      } else if (loading === true && data === null) {
        content = h('div', { className: 'mm-loading' }, t('page.loading'))
      } else if (filteredRows.length === 0) {
        content = h('div', { className: 'mm-empty' }, t('list.empty'))
      } else {
        content = h(
          'div',
          { className: 'mm-list' },
          filteredRows.map((row) => h(ServerRow, {
            key: textOf(row.level) + ':' + textOf(row.id),
            t: t,
            row: row,
            busy: busy,
            testing: testingIds[row.id] === true,
            testingAll: testingAll,
            expanded: expanded[row.id] === true,
            onToggleExpand: () => toggleExpanded(row),
            onToggleEnabled: toggleEnabled,
            onTest: testOne,
            onEdit: (target) => openEditor('edit', target),
            onDelete: requestDelete,
          })),
        )
      }

      const fontSize = isObject(data) && Number.isFinite(data.fontSize) ? data.fontSize : null
      return h(
        'div',
        { className: 'mm-root', style: fontSize === null ? undefined : { '--mm-fs': fontSize + 'px' } },
        header,
        warningsBanner,
        errorBanner,
        content,
        editor !== null
          ? h(EditorDialog, {
            key: 'editor:' + editor.mode + ':' + (isObject(editor.row) ? textOf(editor.row.id) : 'new'),
            t: t,
            mode: editor.mode,
            row: editor.row,
            returnFocus: returnFocus.current,
            pushToast: pushToast,
            onClose: closeEditor,
            onSaved: handleSaved,
          })
          : null,
        deleteTarget !== null
          ? h(DeleteDialog, {
            t: t,
            row: deleteTarget,
            busy: deleting,
            returnFocus: returnFocus.current,
            onClose: () => setDeleteTarget(null),
            onConfirm: confirmDelete,
          })
          : null,
        h(ToastHost, { toasts: toasts }),
      )
    }

    /* ------------------------------------------------------------------ *
     * Styles.                                                            *
     * ------------------------------------------------------------------ */

    const CSS = [
      '.mm-root,.mm-root *,.mm-root *::before,.mm-root *::after{box-sizing:border-box}',
      '.mm-root{display:flex;flex-direction:column;width:100%;height:100%;min-height:0;--mm-fs:var(--dsh-content-font-size,14px);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif);font-size:calc(var(--mm-fs) - 1px);line-height:20px}',
      '.mm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
      '.mm-muted{color:var(--dsw-alias-label-tertiary)}',
      '.mm-icon{display:block;flex:none}',
      '.mm-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}',
      '.mm-head-left{display:flex;align-items:center;gap:8px;min-width:0}',
      '.mm-title{margin:0;font-size:calc(var(--mm-fs) + 2px);font-weight:500;letter-spacing:-0.01em}',
      '.mm-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex:1 1 auto;min-width:0}',
      '.mm-head-actions>.mm-btn{flex:none}',
      '.mm-help{display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);cursor:help;flex:none;transition:color .15s ease}',
      '.mm-help:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-search{position:relative;flex:1 1 0;min-width:0;max-width:200px}',
      '.mm-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--dsw-alias-label-tertiary);pointer-events:none}',
      '.mm-search-input{width:100%;height:36px;padding:0 12px 0 30px;border-radius:9px;border:1px solid transparent;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:calc(var(--mm-fs) - 1px);font-family:inherit;outline:none;transition:border-color .15s ease}',
      '.mm-search-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.mm-search-input:focus{border-color:var(--dsw-alias-border-l2)}',
      '.mm-list{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow-y:auto;padding-right:2px}',
      '.mm-list::-webkit-scrollbar,.mm-tools-list::-webkit-scrollbar,.mm-dialog-body::-webkit-scrollbar{width:5px;height:5px}',
      '.mm-list::-webkit-scrollbar-thumb,.mm-tools-list::-webkit-scrollbar-thumb,.mm-dialog-body::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 45%,transparent);border-radius:9999px}',
      '.mm-row{padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:8px}',
      '.mm-row:last-child{border-bottom:none}',
      '.mm-row-main{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:0}',
      '.mm-row-left{min-width:0;flex:1 1 auto}',
      '.mm-row-line1{display:flex;align-items:center;gap:10px;min-width:0}',
      '.mm-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary);cursor:help}',
      '.mm-dot-ok{background:var(--dsw-alias-state-success-primary)}',
      '.mm-dot-warn{background:var(--dsw-alias-state-warn-primary)}',
      '.mm-dot-err{background:var(--dsw-alias-state-error-primary)}',
      '.mm-dot-muted{background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 55%,transparent)}',
      '.mm-dot-pulse{animation:mm-pulse 1.4s ease-in-out infinite}',
      '.mm-name{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:calc(var(--mm-fs) + 0.5px);font-weight:500;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
      '.mm-name-dim{color:var(--dsw-alias-label-tertiary)}',
      '.mm-chip{display:inline-flex;align-items:center;gap:4px;padding:1px 6px;border-radius:4px;font-size:calc(var(--mm-fs) - 3px);line-height:16px;white-space:nowrap;border:1px solid transparent;flex:none}',
      '.mm-chip-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l1)}',
      '.mm-chip-warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 28%,transparent)}',
      '.mm-latency{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:calc(var(--mm-fs) - 2.5px);color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.mm-tools-btn{display:inline-flex;align-items:center;gap:2px;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:calc(var(--mm-fs) - 2.5px);font-family:inherit;cursor:pointer;white-space:nowrap}',
      '.mm-tools-btn:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-chevron{transition:transform .18s ease}',
      '.mm-chevron-open{transform:rotate(180deg)}',
      '.mm-summary{margin-top:4px;padding-left:18px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:calc(var(--mm-fs) - 2px);color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.mm-actions{display:flex;align-items:center;gap:6px;flex:none}',
      '.mm-expand{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding-left:18px;padding-top:2px}',
      '.mm-tool-badge{padding:2px 8px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:calc(var(--mm-fs) - 3px);line-height:16px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border:1px solid transparent;cursor:default}',
      '.mm-tool-badge-auto{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 25%,transparent)}',
      '.mm-tool-badge-disabled{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 25%,transparent);text-decoration:line-through}',
      '.mm-icon-btn{width:32px;height:32px;padding:0;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease}',
      '.mm-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.mm-icon-btn:disabled{opacity:.4;cursor:default}',
      '.mm-icon-btn-ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 30%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.mm-icon-btn-ok:hover{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 20%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.mm-icon-btn-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-icon-btn-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 15%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.mm-icon-btn-spin .mm-icon{animation:mm-spin .8s linear infinite}',
      '.mm-toolbar-btn{width:36px;height:36px;flex:none;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}',
      '.mm-toolbar-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.mm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:calc(var(--mm-fs) - 1px);font-weight:500;font-family:inherit;cursor:pointer;transition:background .15s ease,border-color .15s ease}',
      '.mm-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.mm-btn:disabled{opacity:.5;cursor:default}',
      '.mm-btn-primary{background:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base)}',
      '.mm-btn-primary:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 86%,transparent)}',
      '.mm-btn-danger{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}',
      '.mm-btn-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 85%,transparent)}',
      '.mm-btn-ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}',
      '.mm-btn-ghost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.mm-btn-sm{height:28px;padding:0 10px;font-size:calc(var(--mm-fs) - 2px)}',
      '.mm-empty{padding:48px 0;text-align:center;font-size:calc(var(--mm-fs) - 1px);color:var(--dsw-alias-label-tertiary)}',
      '.mm-loading{padding:32px 0;text-align:center;font-size:calc(var(--mm-fs) - 1px);color:var(--dsw-alias-label-tertiary)}',
      '.mm-warn-banner{margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 10%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:calc(var(--mm-fs) - 2px);line-height:18px;display:flex;gap:8px;flex-wrap:wrap}',
      '.mm-warn-label{font-weight:600}',
      '.mm-error-banner{margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);font-size:calc(var(--mm-fs) - 2px);line-height:18px}',
      '.mm-state{padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}',
      '.mm-state-title{margin:0;font-size:calc(var(--mm-fs) - 1px);color:var(--dsw-alias-label-secondary)}',
      '.mm-state-hint{margin:0;font-size:calc(var(--mm-fs) - 2px);color:var(--dsw-alias-label-tertiary)}',
      '.mm-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;background:transparent}',
      '.mm-dialog{width:100%;max-width:640px;max-height:88vh;display:flex;flex-direction:column;font-size:var(--mm-fs);background:var(--dsw-static-neutral-bluish-850,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:none;overflow:hidden}',
      '.mm-dialog-confirm{max-width:360px;max-height:none;border-radius:14px}',
      '.mm-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}',
      '.mm-dialog-title{margin:0;font-size:calc(var(--mm-fs) + 1px);font-weight:600}',
      '.mm-dialog-head-actions{display:flex;align-items:center;gap:10px}',
      '.mm-dialog-body{padding:20px 24px;overflow-y:auto;flex:1 1 auto;min-height:0}',
      '.mm-dialog-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px;border-top:1px solid var(--dsw-alias-border-l1);flex:none}',
      '.mm-foot-left{display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 auto}',
      '.mm-foot-right{display:flex;align-items:center;gap:8px;flex:none}',
      '.mm-tabs{display:inline-flex;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}',
      '.mm-tab{height:24px;padding:0 12px;border-radius:6px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:calc(var(--mm-fs) - 2px);font-weight:500;font-family:inherit;cursor:pointer}',
      '.mm-tab-active{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}',
      '.mm-form{display:flex;flex-direction:column;gap:16px}',
      '.mm-grid-name{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px}',
      '.mm-field{display:flex;flex-direction:column;gap:6px;min-width:0}',
      '.mm-field-label{display:flex;align-items:center;gap:6px;font-size:var(--mm-fs);color:var(--dsw-alias-label-secondary);line-height:20px}',
      '.mm-field-sm .mm-field-label{font-size:calc(var(--mm-fs) - 2px)}',
      '.mm-required{color:var(--dsw-alias-state-error-primary);font-size:calc(var(--mm-fs) - 2px);cursor:help}',
      '.mm-input{width:100%;height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:var(--mm-fs);font-family:inherit;outline:none;transition:border-color .15s ease}',
      '.mm-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.mm-input:focus{border-color:var(--dsw-alias-border-l2)}',
      '.mm-input.mm-mono,.mm-select.mm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
      '.mm-field-sm .mm-input{height:32px;font-size:calc(var(--mm-fs) - 2px);padding:0 10px}',
      '.mm-select{cursor:pointer;padding-right:8px}',
      '.mm-textarea{height:auto;min-height:64px;padding:9px 12px;line-height:1.6;resize:vertical}',
      '.mm-label-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}',
      '.mm-link-btn{padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:calc(var(--mm-fs) - 2.5px);font-family:inherit;cursor:pointer;white-space:nowrap}',
      '.mm-link-btn:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-kv{display:flex;flex-direction:column;gap:8px}',
      '.mm-kv-row{display:flex;align-items:center;gap:8px}',
      '.mm-kv-row .mm-input{width:auto;height:32px;font-size:calc(var(--mm-fs) - 2px);padding:0 10px}',
      '.mm-kv-key{flex:0 0 40%}',
      '.mm-kv-val{flex:1 1 auto}',
      '.mm-kv-del{width:28px;height:32px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;flex:none}',
      '.mm-kv-del:hover{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}',
      '.mm-hint{margin:0;font-size:calc(var(--mm-fs) - 2px);line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-hint-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-adv{border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px}',
      '.mm-adv-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:calc(var(--mm-fs) - 1px);font-family:inherit;cursor:pointer}',
      '.mm-adv-toggle:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-adv-title{display:flex;align-items:center;gap:8px;font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.mm-badge{padding:1px 6px;border-radius:4px;font-size:calc(var(--mm-fs) - 3px);line-height:16px;font-weight:400;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2)}',
      '.mm-adv-panel{padding-top:14px;display:flex;flex-direction:column;gap:16px}',
      '.mm-adv-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
      '.mm-adv-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '.mm-tools-panel{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}',
      '.mm-tools-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex-wrap:wrap}',
      '.mm-tools-title{display:flex;align-items:center;gap:8px;font-size:calc(var(--mm-fs) - 1.5px);font-weight:500;color:var(--dsw-alias-label-secondary);min-width:0;flex-wrap:wrap}',
      '.mm-tools-status{font-size:calc(var(--mm-fs) - 3px);padding:1px 8px;border-radius:9999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.mm-tools-status-ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 28%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.mm-tools-status-warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 28%,transparent);color:var(--dsw-alias-state-warn-primary)}',
      '.mm-tools-status-err{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 28%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.mm-tools-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:calc(var(--mm-fs) - 2.5px);color:var(--dsw-alias-label-secondary);flex-wrap:wrap}',
      '.mm-tools-filter{height:26px;padding:0 8px;width:180px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:calc(var(--mm-fs) - 2.5px);font-family:inherit;outline:none}',
      '.mm-tools-filter::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.mm-tools-filter:focus{border-color:var(--dsw-alias-border-l2)}',
      '.mm-tools-batch{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.mm-divider{width:1px;height:12px;background:var(--dsw-alias-border-l1);flex:none}',
      '.mm-tools-list{max-height:210px;overflow-y:auto}',
      '.mm-tool-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.mm-tool-row:last-child{border-bottom:none}',
      '.mm-tool-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.mm-tool-info{min-width:0;flex:1 1 auto;display:flex;align-items:baseline;gap:8px;overflow:hidden}',
      '.mm-tool-name{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:calc(var(--mm-fs) - 1.5px);font-weight:500;color:var(--dsw-alias-label-primary);white-space:nowrap}',
      '.mm-tool-name-auto{color:var(--dsw-alias-state-success-primary)}',
      '.mm-tool-name-disabled{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}',
      '.mm-tool-desc{font-size:calc(var(--mm-fs) - 2px);color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
      '.mm-tools-empty{padding:28px 14px;text-align:center;font-size:calc(var(--mm-fs) - 2px);color:var(--dsw-alias-label-tertiary)}',
      '.mm-seg{display:inline-flex;padding:2px;border-radius:7px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);flex:none}',
      '.mm-seg-btn{height:22px;padding:0 8px;border-radius:5px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--mm-fs) - 3px);font-family:inherit;cursor:pointer;white-space:nowrap}',
      '.mm-seg-btn:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-seg-btn-active{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-weight:500}',
      '.mm-seg-btn-auto.mm-seg-btn-active{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 20%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 35%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.mm-seg-btn-disabled.mm-seg-btn-active{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.mm-json{display:flex;flex-direction:column;gap:12px}',
      '.mm-json-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:calc(var(--mm-fs) - 2px);color:var(--dsw-alias-label-secondary);flex-wrap:wrap}',
      '.mm-json-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.mm-json-area{min-height:320px}',
      '.mm-feedback{font-size:calc(var(--mm-fs) - 2px);line-height:18px}',
      '.mm-feedback-ok{color:var(--dsw-alias-state-success-primary)}',
      '.mm-feedback-err{color:var(--dsw-alias-state-error-primary)}',
      '.mm-test-result{font-size:calc(var(--mm-fs) - 2px);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}',
      '.mm-test-busy{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-test-ok{color:var(--dsw-alias-state-success-primary)}',
      '.mm-test-err{color:var(--dsw-alias-state-error-primary)}',
      '.mm-delete-desc{margin:0;font-size:calc(var(--mm-fs) - 1px);line-height:1.7;color:var(--dsw-alias-label-secondary)}',
      '.mm-delete-name{color:var(--dsw-alias-label-primary)}',
      '.mm-tooltip{position:fixed;z-index:2000;max-width:290px;padding:6px 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:calc(var(--mm-fs) - 4px);line-height:16px;box-shadow:none;pointer-events:none;opacity:0;transform:translateY(2px);transition:opacity .14s ease,transform .14s ease;white-space:normal}',
      '.mm-tooltip-show{opacity:1;transform:translateY(0)}',
      '.mm-toasts{position:fixed;right:20px;bottom:20px;z-index:2100;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:min(420px,calc(100vw - 32px))}',
      '.mm-toast{display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:calc(var(--mm-fs) - 1.5px);line-height:18px;box-shadow:0 10px 30px color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent);animation:mm-toast-in .18s ease;pointer-events:auto}',
      '.mm-toast-dot{width:6px;height:6px;border-radius:50%;margin-top:6px;flex:none;background:var(--dsw-alias-brand-primary)}',
      '.mm-toast-ok{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent)}',
      '.mm-toast-ok .mm-toast-dot{background:var(--dsw-alias-state-success-primary)}',
      '.mm-toast-err{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent)}',
      '.mm-toast-err .mm-toast-dot{background:var(--dsw-alias-state-error-primary)}',
      '.mm-toast-info .mm-toast-dot{background:var(--dsw-alias-brand-primary)}',
      '.mm-toast-text{min-width:0;word-break:break-word}',
      '.mm-spin-icon{animation:mm-spin .8s linear infinite}',
      '@keyframes mm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@keyframes mm-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:.45}}',
      '@keyframes mm-toast-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
      '@media (max-width:720px){.mm-head{flex-wrap:wrap}.mm-head-actions{width:100%;flex:1 1 100%;justify-content:flex-end}.mm-search{flex:1 1 0;min-width:0;max-width:none;width:auto}.mm-grid-name{grid-template-columns:1fr}.mm-adv-grid,.mm-adv-grid-2{grid-template-columns:1fr}.mm-dialog-head{padding:14px 16px}.mm-dialog-body{padding:16px}.mm-dialog-foot{padding:12px 16px}}',
      '@media (max-width:520px){.mm-search{flex:1 1 100%;width:100%}.mm-row-main{gap:8px}.mm-actions{gap:2px}.mm-name{font-size:calc(var(--mm-fs) - 1px)}.mm-tools-toolbar{align-items:flex-start;flex-direction:column}.mm-tools-filter{width:100%}}',
    ].join('\n')

    /* ------------------------------------------------------------------ *
     * Registration. All side effects live inside apply and ctx.effect.   *
     * ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        activeT = t

        ctx.effect(() => ctx.locale.register(NS, { zh: zh, en: en }), 'mcp-manager: dictionaries')

        ctx.effect(() => {
          if (typeof document === 'undefined' || document === null) return () => {}
          const style = document.createElement('style')
          style.dataset.plugin = '@xiechenghua01/dsh-mcp-manager'
          style.textContent = CSS
          const head = document.head !== undefined && document.head !== null ? document.head : document.documentElement
          if (head === undefined || head === null) return () => {}
          head.appendChild(style)
          return () => {
            if (typeof style.remove === 'function') style.remove()
            else if (style.parentNode !== null && style.parentNode !== undefined) style.parentNode.removeChild(style)
          }
        }, 'mcp-manager: styles')

        ctx.effect(() => () => {
          hideTooltip()
          if (tooltip.node !== null && tooltip.node.parentNode !== null && tooltip.node.parentNode !== undefined) {
            tooltip.node.parentNode.removeChild(tooltip.node)
          }
          tooltip.node = null
        }, 'mcp-manager: tooltip')

        ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'mcp-manager',
          order: 16,
          label: () => t('section.title'),
          locale: NS,
        }, McpPage)), 'mcp-manager: settings section')
      },
    }
  },
})
