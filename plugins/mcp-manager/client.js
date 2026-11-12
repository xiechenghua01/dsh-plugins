// MCP manager — browser half for DeepSeek Harness 0.2.x.
//
// One Settings section (`设置 → MCP 服务`) owns every MCP server row of the current profile.
// The page talks to the host over the same-origin route `mcp-manager/api` (relative URL, POST,
// `{ op, args }` envelope). All rows are written to the current profile layer; the list shows
// every row the host returns, including rows that already live in the home layer.
// Visible strings go through the client locale service; colors use `--dsw-*` tokens only.

window.__ModuleLoader__.load({
  id: '@chengze/dsh-mcp-manager',
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
    const ICON_PLUG = 'M9 7V4m6 3V4M7 7h10v3a5 5 0 01-10 0V7Zm5 8v5'

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
      'page.refresh': '刷新列表',
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
      'page.refresh': 'Refresh list',
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

    /** Plugin context and the host theme service, assigned by `apply`. */
    let pluginCtx = null
    let themeService = null

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
      const names = []
      const seen = {}
      const push = (name) => {
        if (name !== '' && seen[name] !== true) {
          seen[name] = true
          names.push(name)
        }
      }
      const probe = isObject(row) ? row.lastProbe : null
      if (isObject(probe)) {
        if (Array.isArray(probe.tools)) {
          for (const tool of probe.tools) if (isObject(tool)) push(textOf(tool.name))
        }
        if (Array.isArray(probe.toolNames)) {
          for (const name of probe.toolNames) push(textOf(name))
        }
      }
      if (isObject(row) && Array.isArray(row.registeredTools)) {
        for (const tool of row.registeredTools) if (isObject(tool)) push(textOf(tool.name))
      }
      const lists = toolListsOf(row)
      for (const name of lists.auto) push(name)
      for (const name of lists.disabled) push(name)
      return names
    }

    function toolDescriptionsOf(row) {
      const probe = isObject(row) ? row.lastProbe : null
      const out = {}
      // Probe descriptions win; registered tools only fill names the probe did not cover.
      if (isObject(probe) && Array.isArray(probe.tools)) {
        for (const tool of probe.tools) {
          if (!isObject(tool)) continue
          const name = textOf(tool.name)
          if (name !== '') out[name] = textOf(tool.description)
        }
      }
      if (isObject(row) && Array.isArray(row.registeredTools)) {
        for (const tool of row.registeredTools) {
          if (!isObject(tool)) continue
          const name = textOf(tool.name)
          if (name !== '' && Object.prototype.hasOwnProperty.call(out, name) !== true) out[name] = textOf(tool.description)
        }
      }
      return out
    }

    function toolCountOf(row) {
      if (isObject(row) && typeof row.toolCount === 'number' && Number.isFinite(row.toolCount)) return row.toolCount
      const probe = isObject(row) ? row.lastProbe : null
      if (isObject(probe) && probe.ok === true && typeof probe.toolCount === 'number' && Number.isFinite(probe.toolCount)) return probe.toolCount
      const registered = isObject(row) && Array.isArray(row.registeredTools) ? row.registeredTools : []
      if (registered.length > 0) return registered.length
      // Unknown (disabled or never connected) stays unknown instead of claiming zero tools.
      // Permission lists (`autoApprove` / `disabledTools`) are configuration, not a tool count.
      return null
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
     * Tooltip：全页面单例，300ms，悬停/键盘聚焦触发（§7.7）。            *
     * ------------------------------------------------------------------ */

    const TOOLTIP_DELAY_MS = 300
    const TOOLTIP_GAP = 8
    const TOOLTIP_MARGIN = 8

    const tooltip = {
      timer: null,
      target: null,
      label: '',
      node: null,
      host: null,
      root: null,
      observer: null,
      suppressFocusUntil: 0,
    }

    /** Rebind the observer whenever the page remounts (theme switch / settings nav). */
    function bindTooltipRoot() {
      if (tooltip.observer !== null && tooltip.observer !== undefined) {
        tooltip.observer.disconnect()
        tooltip.observer = null
      }
      const root = typeof document !== 'undefined' && document !== null ? document.querySelector('.mm-root') : null
      tooltip.root = root
      if (root !== null && typeof MutationObserver === 'function') {
        tooltip.observer = new MutationObserver(syncTooltipFontSize)
        tooltip.observer.observe(root, { attributes: true, attributeFilter: ['style'] })
      }
    }

    function tooltipFontSize() {
      let root = tooltip.root
      if (root === null || root === undefined || root.isConnected !== true) {
        bindTooltipRoot()
        root = tooltip.root
      }
      if (root !== null && root !== undefined && typeof getComputedStyle === 'function') {
        const value = getComputedStyle(root).getPropertyValue('--ds-fs').trim()
        if (value !== '') return value
      }
      return '14px'
    }

    /** 每次显示前同步字号；显示期间由 MutationObserver 继续同步（§3.7）。 */
    function syncTooltipFontSize() {
      if (tooltip.host === null || tooltip.host === undefined) return
      tooltip.host.style.setProperty('--ds-fs', tooltipFontSize())
    }

    function ensureTooltipNode() {
      if (typeof document === 'undefined' || document === null) return null
      if (tooltip.host !== null && document.body.contains(tooltip.host)) return tooltip.node
      const host = document.createElement('div')
      host.className = 'mm-tooltip-host'
      host.setAttribute('data-plugin', 'mcp-manager')
      const node = document.createElement('div')
      node.className = 'mm-tooltip'
      node.setAttribute('role', 'tooltip')
      host.appendChild(node)
      document.body.appendChild(host)
      tooltip.host = host
      tooltip.node = node
      bindTooltipRoot()
      syncTooltipFontSize()
      return node
    }

    function hideTooltip() {
      if (tooltip.timer !== null) {
        clearTimeout(tooltip.timer)
        tooltip.timer = null
      }
      tooltip.target = null
      tooltip.label = ''
      if (tooltip.node !== null && tooltip.node !== undefined) {
        tooltip.node.classList.remove('mm-tooltip-show')
        tooltip.node.style.visibility = 'hidden'
      }
    }

    function tooltipClamp(value, min, max) {
      if (max < min) return min
      if (value < min) return min
      if (value > max) return max
      return value
    }

    function tooltipCandidate(side, anchor, tip, viewWidth, viewHeight) {
      let left
      let top
      if (side === 'top' || side === 'bottom') {
        left = tooltipClamp(anchor.left + anchor.width / 2 - tip.width / 2, TOOLTIP_MARGIN, viewWidth - tip.width - TOOLTIP_MARGIN)
        top = side === 'top' ? anchor.top - tip.height - TOOLTIP_GAP : anchor.bottom + TOOLTIP_GAP
      } else {
        top = tooltipClamp(anchor.top + anchor.height / 2 - tip.height / 2, TOOLTIP_MARGIN, viewHeight - tip.height - TOOLTIP_MARGIN)
        left = side === 'right' ? anchor.right + TOOLTIP_GAP : anchor.left - tip.width - TOOLTIP_GAP
      }
      return { left: left, top: top }
    }

    function tooltipFits(candidate, tip, viewWidth, viewHeight) {
      return candidate.left >= TOOLTIP_MARGIN
        && candidate.top >= TOOLTIP_MARGIN
        && candidate.left + tip.width <= viewWidth - TOOLTIP_MARGIN
        && candidate.top + tip.height <= viewHeight - TOOLTIP_MARGIN
    }

    function tooltipVisibleArea(candidate, tip, viewWidth, viewHeight) {
      const width = Math.max(0, Math.min(candidate.left + tip.width, viewWidth) - Math.max(candidate.left, 0))
      const height = Math.max(0, Math.min(candidate.top + tip.height, viewHeight) - Math.max(candidate.top, 0))
      return width * height
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
      syncTooltipFontSize()
      node.textContent = tooltip.label
      node.style.visibility = 'hidden'
      node.classList.add('mm-tooltip-show')
      const rect = target.getBoundingClientRect()
      const tipRect = node.getBoundingClientRect()
      const viewWidth = typeof window !== 'undefined' && window !== null ? window.innerWidth : 0
      const viewHeight = typeof window !== 'undefined' && window !== null ? window.innerHeight : 0
      if (viewWidth <= 0 || viewHeight <= 0) {
        node.style.left = Math.round(rect.left + rect.width / 2 - tipRect.width / 2) + 'px'
        node.style.top = Math.round(rect.top - tipRect.height - TOOLTIP_GAP) + 'px'
        node.style.visibility = 'visible'
        return
      }
      const sides = ['top', 'bottom', 'right', 'left']
      let chosen = null
      for (let index = 0; index < sides.length; index += 1) {
        const candidate = tooltipCandidate(sides[index], rect, tipRect, viewWidth, viewHeight)
        if (tooltipFits(candidate, tipRect, viewWidth, viewHeight)) {
          chosen = candidate
          break
        }
      }
      if (chosen === null) {
        let bestArea = -1
        for (let index = 0; index < sides.length; index += 1) {
          const candidate = tooltipCandidate(sides[index], rect, tipRect, viewWidth, viewHeight)
          const area = tooltipVisibleArea(candidate, tipRect, viewWidth, viewHeight)
          if (area > bestArea) {
            bestArea = area
            chosen = candidate
          }
        }
      }
      node.style.left = Math.round(chosen.left) + 'px'
      node.style.top = Math.round(chosen.top) + 'px'
      node.style.visibility = 'visible'
    }

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

    /** 点击带来的 focus 不重新触发；键盘聚焦仍按 300ms 显示。 */
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
          tooltip.suppressFocusUntil = Date.now() + 400
          hideTooltip()
        },
        onFocus: (event) => {
          if (Date.now() < tooltip.suppressFocusUntil) return
          scheduleTooltip(text, event.currentTarget)
        },
        onBlur: () => {
          hideTooltip()
        },
      }
    }

    /** 目标被卸载时 mouseout 不会触发：渲染提交后核对一次。 */
    function hideTooltipIfTargetGone() {
      const target = tooltip.target
      if (target === null || target === undefined) return
      if (typeof document === 'undefined' || document === null) {
        hideTooltip()
        return
      }
      if (document.body.contains(target)) return
      hideTooltip()
    }

    /** 滚动、视图切换和卸载时的统一清理。 */
    function TooltipLayer() {
      useEffect(() => {
        const onScroll = () => {
          hideTooltip()
        }
        window.addEventListener('scroll', onScroll, true)
        return () => {
          window.removeEventListener('scroll', onScroll, true)
          hideTooltip()
        }
      }, [])
      useEffect(() => {
        hideTooltipIfTargetGone()
      })
      return null
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
      if (isObject(row) && Array.isArray(row.registeredTools)) {
        for (const tool of row.registeredTools) {
          if (isObject(tool)) push(textOf(tool.name), textOf(tool.description))
        }
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
      const size = props.size === 20 ? 20 : 16
      return h('svg', {
        className: 'mm-icon' + (props.className !== undefined && props.className !== '' ? ' ' + props.className : ''),
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: props.strokeWidth !== undefined ? props.strokeWidth : 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      }, h('path', { d: props.d }))
    }

    const BUTTON_VARIANTS = { primary: true, secondary: true, ghost: true, danger: true }
    const BUTTON_SIZES = { lg: true, md: true, sm: true }

    function Button(props) {
      const variant = BUTTON_VARIANTS[props.variant] === true ? props.variant : 'secondary'
      const size = BUTTON_SIZES[props.size] === true ? props.size : 'lg'
      const className = 'mm-btn'
        + (variant !== 'secondary' ? ' mm-btn-' + variant : '')
        + (size !== 'lg' ? ' mm-btn-' + size : '')
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      return h(
        'button',
        {
          type: 'button',
          className: className,
          disabled: props.disabled === true,
          'aria-busy': props.loading === true ? 'true' : undefined,
          onClick: props.onClick,
          ref: props.buttonRef,
        },
        props.icon !== undefined && props.icon !== null ? h(Svg, { d: props.icon, size: 16 }) : null,
        props.children,
      )
    }

    function Tabs(props) {
      const items = Array.isArray(props.items) ? props.items : []
      return h(
        'div',
        { className: 'mm-tabs', role: 'group' },
        items.map((item) => h(
          'button',
          Object.assign({
            key: item.value,
            type: 'button',
            className: 'mm-tab' + (props.value === item.value ? ' mm-tab-active' : ''),
            'aria-pressed': props.value === item.value ? 'true' : 'false',
            onClick: () => {
              if (typeof props.onChange === 'function') props.onChange(item.value)
            },
          }, tooltipHandlers(item.tip)),
          item.label,
        )),
      )
    }

    function Segmented(props) {
      const items = Array.isArray(props.items) ? props.items : []
      return h(
        'div',
        { className: 'mm-seg', role: 'group' },
        items.map((item) => h(
          'button',
          Object.assign({
            key: item.value,
            type: 'button',
            className: 'mm-seg-btn mm-seg-btn-' + item.value + (props.value === item.value ? ' mm-seg-btn-active' : ''),
            'aria-pressed': props.value === item.value ? 'true' : 'false',
            onClick: () => {
              if (typeof props.onChange === 'function') props.onChange(item.value)
            },
          }, tooltipHandlers(item.tip)),
          item.label,
        )),
      )
    }

    function IconButton(props) {
      const className = 'mm-icon-btn'
        + (props.tone !== undefined && props.tone !== '' ? ' mm-icon-btn-' + props.tone : '')
        + (props.spin === true ? ' mm-icon-btn-spin' : '')
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      const tip = props.tooltip !== undefined && props.tooltip !== null ? props.tooltip : props.label
      return h(
        'button',
        Object.assign({
          type: 'button',
          className: className,
          disabled: props.disabled === true,
          onClick: props.onClick,
          'aria-label': props.label,
        }, tooltipHandlers(tip)),
        h(Svg, { d: props.icon, size: props.size, strokeWidth: props.strokeWidth }),
      )
    }

    /**
     * Link-style text button (§7.1). `className` only appends to the base class;
     * `tip` and `expanded` are optional so disclosure-style links keep their ARIA state.
     */
    function LinkButton(props) {
      const className = 'mm-link-btn'
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      const attrs = {
        type: 'button',
        className: className,
        onClick: props.onClick,
      }
      if (props.expanded !== undefined) attrs['aria-expanded'] = props.expanded === true ? 'true' : 'false'
      return h('button', Object.assign(attrs, tooltipHandlers(props.tip)), props.children)
    }

    /** Disclosure header (§7.1): the chevron rotation follows `open`. */
    function DisclosureButton(props) {
      return h(
        'button',
        {
          type: 'button',
          className: 'mm-adv-toggle',
          'aria-expanded': props.open === true ? 'true' : 'false',
          onClick: props.onClick,
        },
        props.children,
        h(Svg, {
          d: ICON_CHEVRON,
          size: 16,
          className: 'mm-chevron' + (props.open === true ? ' mm-chevron-open' : ''),
        }),
      )
    }

    /** Icon-only delete control for key/value rows (§7.2). */
    function KvDeleteButton(props) {
      return h(
        'button',
        Object.assign({
          type: 'button',
          className: 'mm-kv-del',
          'aria-label': props.label,
          onClick: props.onClick,
        }, tooltipHandlers(props.label)),
        h(Svg, { d: ICON_X, size: 16 }),
      )
    }

    function HelpDot(props) {
      return h(
        'button',
        Object.assign({
          type: 'button',
          className: 'mm-help',
          'aria-label': props.tip,
        }, tooltipHandlers(props.tip)),
        h(Svg, { d: ICON_HELP, size: 16 }),
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
        props.error !== undefined && props.error !== null && props.error !== ''
          ? h('p', { className: 'mm-hint mm-feedback-err' }, props.error)
          : null,
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
          h('button', {
            type: 'button',
            className: 'mm-toast-close',
            'aria-label': props.dismissLabel,
            onClick: () => {
              if (typeof props.onDismiss === 'function') props.onDismiss(toast.id)
            },
          }, h(Svg, { d: ICON_X, size: 16 })),
        )),
      )
    }

    function StatePanel(props) {
      return h(
        'div',
        { className: 'mm-state' },
        props.icon !== undefined && props.icon !== null ? h(Svg, { d: props.icon, size: 20, className: 'mm-state-icon' }) : null,
        h('p', { className: 'mm-state-title' }, props.title),
        props.hint !== undefined && props.hint !== null && props.hint !== '' ? h('p', { className: 'mm-state-hint' }, props.hint) : null,
        props.actionLabel !== undefined && props.actionLabel !== null
          ? h(Button, { variant: 'secondary', onClick: props.onAction }, props.actionLabel)
          : null,
      )
    }

    /** Open dialogs stack in mount order; only the topmost reacts to Escape / backdrop clicks. */
    const dialogStack = []

    /** Body scroll lock shared by the whole dialog stack. */
    let bodyScrollLocks = 0
    let savedBodyOverflow = ''

    function lockBodyScroll() {
      if (typeof document === 'undefined' || document === null) return
      if (bodyScrollLocks === 0) {
        savedBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      }
      bodyScrollLocks += 1
    }

    function unlockBodyScroll() {
      if (typeof document === 'undefined' || document === null) return
      bodyScrollLocks = Math.max(0, bodyScrollLocks - 1)
      if (bodyScrollLocks === 0) document.body.style.overflow = savedBodyOverflow
    }

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

    function focusableIn(node) {
      if (node === null || node === undefined || typeof node.querySelectorAll !== 'function') return []
      const list = node.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
      return Array.prototype.slice.call(list).filter((item) => item.getAttribute('aria-hidden') !== 'true')
    }

    /**
     * Fixed-size modal (§7.6). Width comes from the size tier, never from the host panel.
     * The body is the only scroll region; Escape and the backdrop dismiss the topmost dialog.
     */
    function Dialog(props) {
      const boxRef = useRef(null)
      const stackToken = useRef({})
      const onCloseRef = useRef(props.onClose)
      onCloseRef.current = props.onClose

      useEffect(() => {
        const token = stackToken.current
        dialogStack.push(token)
        lockBodyScroll()
        const onKeyDown = (event) => {
          if (dialogStack[dialogStack.length - 1] !== token) return
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopImmediatePropagation()
            hideTooltip()
            const close = onCloseRef.current
            if (typeof close === 'function') close()
            return
          }
          if (event.key !== 'Tab') return
          const node = boxRef.current
          const list = focusableIn(node)
          if (list.length === 0) {
            event.preventDefault()
            return
          }
          const first = list[0]
          const last = list[list.length - 1]
          const active = document.activeElement
          if (event.shiftKey && (active === first || node.contains(active) !== true)) {
            event.preventDefault()
            focusQuietly(last)
          } else if (!event.shiftKey && (active === last || node.contains(active) !== true)) {
            event.preventDefault()
            focusQuietly(first)
          }
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown, true)
          unlockBodyScroll()
          hideTooltip()
          const index = dialogStack.indexOf(token)
          if (index !== -1) dialogStack.splice(index, 1)
        }
      }, [])

      useEffect(() => {
        const node = boxRef.current
        if (node === null || typeof node.querySelector !== 'function') return undefined
        const requested = props.initialFocus
        let next = null
        if (requested !== null && requested !== undefined && typeof requested === 'object' && requested.current !== undefined) next = requested.current
        else if (typeof requested === 'string') next = node.querySelector(requested)
        if (next === null || next === undefined) next = node.querySelector('input, select, textarea') || node.querySelector('button')
        focusQuietly(next)
        const returnFocus = props.returnFocus
        return () => {
          focusQuietly(returnFocus)
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
            tabIndex: -1,
            ref: boxRef,
            style: { boxShadow: 'none' },
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
                LinkButton,
                {
                  className: 'mm-tools-btn',
                  expanded: props.expanded === true,
                  tip: t('list.toolsTip'),
                  onClick: props.onToggleExpand,
                },
                h('span', null, t('list.tools', { count: count === null ? DASH : String(count) })),
                h(Svg, { d: ICON_CHEVRON, size: 12, className: 'mm-chevron' + (props.expanded === true ? ' mm-chevron-open' : '') }),
              ),
            ),
            h('div', { className: 'mm-summary' }, target !== '' ? target : DASH),
          ),
          h(RowActions, {
            t: t,
            row: row,
            enabled: enabled,
            disabled: blocked,
            onToggleEnabled: props.onToggleEnabled,
            onEdit: props.onEdit,
            onDelete: props.onDelete,
          }),
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
     * Row actions: enable/disable, edit, delete.                         *
     * ------------------------------------------------------------------ */

    function RowActions(props) {
      const t = props.t
      const row = props.row
      const enabled = props.enabled === true
      const blocked = props.disabled === true
      const toggleLabel = enabled === true ? t('action.toggleDisable') : t('action.toggleEnable')
      const call = (handler) => {
        if (typeof handler === 'function') handler(row)
      }
      return h(
        'div',
        { className: 'mm-actions' },
        h(IconButton, {
          icon: ICON_POWER,
          label: toggleLabel,
          tooltip: toggleLabel,
          tone: enabled === true ? 'ok' : '',
          disabled: blocked,
          onClick: () => call(props.onToggleEnabled),
        }),
        h(IconButton, {
          icon: ICON_EDIT,
          label: t('action.edit'),
          tooltip: t('action.edit'),
          disabled: blocked,
          onClick: () => call(props.onEdit),
        }),
        h(IconButton, {
          icon: ICON_TRASH,
          label: t('action.delete'),
          tooltip: t('action.delete'),
          tone: 'danger',
          disabled: blocked,
          onClick: () => call(props.onDelete),
        }),
      )
    }
    /* ------------------------------------------------------------------ *
     * Editor state.                                                      *
     *                                                                    *
     * One hook per concern (§6.3): draft, policy, probe, JSON tab, test  *
     * and save. The dialog in 44-editor-dialog.js only composes them.    *
     * ------------------------------------------------------------------ */

    function useEditorDraft(initializer) {
      const [draft, setDraft] = useState(initializer)

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

      return {
        draft: draft,
        setDraft: setDraft,
        setField: setField,
        setArgsText: setArgsText,
        updateRow: updateRow,
        addRow: addRow,
        removeRow: removeRow,
      }
    }

    function useEditorPolicy(initializer) {
      const [policy, setPolicyState] = useState(initializer)
      const policyRef = useRef(policy)

      // Mirror every policy write into a ref synchronously so an in-flight probe merges its
      // response against the policy as it is now, not the one captured when the probe started.
      function setPolicy(next) {
        const value = typeof next === 'function' ? next(policyRef.current) : next
        policyRef.current = value
        setPolicyState(value)
      }

      function setToolPolicy(name, next) {
        setPolicy((prev) => {
          const copy = Object.assign({}, prev)
          if (next === 'default') delete copy[name]
          else copy[name] = next
          return copy
        })
      }

      return { policy: policy, policyRef: policyRef, setPolicy: setPolicy, setToolPolicy: setToolPolicy }
    }

    /** Report fetched tools, noting the server-reported total when it differs. */
    function probeMessageOf(t, row, count) {
      const known = isObject(row) && Number.isFinite(row.toolCount) ? row.toolCount : null
      if (known !== null && known > count) return t('editor.toolsProbedTotal', { count: count, total: known })
      return t('editor.toolsProbed', { count: count })
    }

    function useEditorProbe(options) {
      const t = options.t
      const pushToast = options.pushToast
      const [probedTools, setProbedTools] = useState(options.initialTools)
      const [probeState, setProbeState] = useState(() => (options.initialHasProbe
        ? { phase: 'ok', message: t('editor.toolsProbed', { count: options.initialTools.length }) }
        : { phase: 'idle', message: t('editor.toolsIdle') }))
      const [toolFilter, setToolFilter] = useState('')
      const [advancedOpen, setAdvancedOpen] = useState(false)

      async function runProbe(silent) {
        const values = draftValues(options.draft, options.policy)
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
            const mergedLive = mergeTools(live.tools, [], options.policyRef.current)
            setProbedTools(mergedLive)
            setProbeState({ phase: 'ok', message: probeMessageOf(t, options.row, mergedLive.length) })
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
            const merged = mergeTools(tools, [], options.policyRef.current)
            setProbedTools(merged)
            setProbeState({ phase: 'ok', message: probeMessageOf(t, options.row, merged.length) })
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

      return {
        probedTools: probedTools,
        setProbedTools: setProbedTools,
        probeState: probeState,
        toolFilter: toolFilter,
        setToolFilter: setToolFilter,
        advancedOpen: advancedOpen,
        toggleAdvanced: toggleAdvanced,
        runProbe: runProbe,
      }
    }

    function parseEditorJsonValues(t, text, baseDraft) {
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

    function useEditorJson(options) {
      const t = options.t
      const [tab, setTab] = useState('form')
      const [jsonText, setJsonText] = useState('')
      const [jsonFeedback, setJsonFeedback] = useState({ kind: 'ok', text: '' })

      function syncJsonFromForm() {
        const text = JSON.stringify(cleanJsonObject(draftValues(options.draft, options.policy)), null, 2)
        setJsonText(text)
        setJsonFeedback({ kind: 'ok', text: t('editor.jsonValid') })
        return text
      }

      function parseJsonText(text) {
        const result = parseEditorJsonValues(t, text, options.draft)
        if (result.ok !== true) {
          setJsonFeedback({ kind: 'err', text: result.message })
          return false
        }
        options.setDraft(result.draft)
        options.setPolicy(result.policy)
        options.setProbedTools((prev) => mergeTools([], prev, result.policy))
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
        options.pushToast(ok === true ? 'ok' : 'err', ok === true ? t('toast.copied') : t('toast.copyFailed'))
      }

      function fillSample() {
        const text = JSON.stringify(JSON_SAMPLE, null, 2)
        setJsonText(text)
        if (parseJsonText(text)) options.pushToast('ok', t('toast.jsonSample'))
      }

      return {
        tab: tab,
        jsonText: jsonText,
        jsonFeedback: jsonFeedback,
        setJsonFeedback: setJsonFeedback,
        switchTab: switchTab,
        handleJsonChange: handleJsonChange,
        copyJson: copyJson,
        fillSample: fillSample,
      }
    }

    function useEditorTest(t, runProbe) {
      const [testing, setTesting] = useState(false)
      const [testResult, setTestResult] = useState({ kind: 'idle', text: '' })

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

      return { testing: testing, testResult: testResult, handleTest: handleTest }
    }

    function editorValidationMessage(t, values, draft) {
      if (!SERVER_NAME_PATTERN.test(values.serverName)) return t('editor.validationName')
      if (values.transport === 'sse') return t('editor.sseBlocked')
      if (values.transport === 'stdio' && values.command === '') return t('editor.validationCommand')
      if (values.transport !== 'stdio' && (values.url === '' || !HTTP_URL_PATTERN.test(values.url))) return t('editor.validationUrl')
      if (draft.timeoutText.trim() !== '' && (!Number.isFinite(values.timeout) || values.timeout < 1000 || values.timeout > 3600000)) return t('editor.validationTimeout')
      if (draft.retriesText.trim() !== '' && (!Number.isFinite(values.retries) || values.retries < 1 || values.retries > 1000)) return t('editor.validationRetries')
      return ''
    }

    function useEditorSave(options) {
      const t = options.t
      const [saving, setSaving] = useState(false)

      async function handleSave() {
        if (saving === true) return
        let valuesDraft = options.draft
        let valuesPolicy = options.policy
        if (options.tab === 'json') {
          const parsed = parseEditorJsonValues(t, options.jsonText, options.draft)
          if (parsed.ok !== true) {
            options.setJsonFeedback({ kind: 'err', text: parsed.message })
            options.pushToast('err', t('editor.jsonBlocked'))
            return
          }
          valuesDraft = parsed.draft
          valuesPolicy = parsed.policy
          options.setDraft(valuesDraft)
          options.setPolicy(valuesPolicy)
        }
        const values = draftValues(valuesDraft, valuesPolicy)
        const validation = editorValidationMessage(t, values, valuesDraft)
        if (validation !== '') {
          options.pushToast('err', validation)
          return
        }
        const config = cleanHostConfig(values)
        const extra = cleanExtra(values, options.mode === 'edit' && isObject(options.row) ? options.row.extra : null)
        setSaving(true)
        try {
          if (options.mode === 'edit' && isObject(options.row)) {
            await callApi('update', { id: options.row.id, level: options.row.level, config: config, extra: extra })
            options.pushToast('ok', t('toast.updated', { name: values.serverName }))
          } else {
            await callApi('create', { level: 'workspace', config: config, extra: extra })
            options.pushToast('ok', t('toast.created', { name: values.serverName }))
          }
          if (typeof options.onSaved === 'function') options.onSaved()
        } catch (error) {
          options.pushToast('err', t('toast.saveFailed', { message: describeError(t, error) }))
        } finally {
          setSaving(false)
        }
      }

      return { saving: saving, handleSave: handleSave }
    }

    /** Counts and the "customized" badge condition for the advanced section. */
    function editorSummaryOf(draft, policy) {
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
      return { autoCount: autoCount, disabledCount: disabledCount, customized: customized }
    }

    /* ------------------------------------------------------------------ *
     * Editor form view: identity, transport and connection fields.       *
     * ------------------------------------------------------------------ */

    function EditorInput(props) {
      const attrs = {
        className: props.className,
        value: props.value,
        placeholder: props.placeholder,
        onChange: props.onChange,
      }
      if (props.type !== undefined) attrs.type = props.type
      if (props.min !== undefined) attrs.min = props.min
      if (props.max !== undefined) attrs.max = props.max
      if (props.step !== undefined) attrs.step = props.step
      if (props.spellCheck === false) attrs.spellCheck = false
      return h('input', attrs)
    }

    function EditorInputField(props) {
      return h(
        Field,
        {
          label: props.label,
          tip: props.tip,
          small: props.small === true,
          required: props.required === true,
          requiredLabel: props.requiredLabel,
        },
        h(EditorInput, {
          className: props.className,
          value: props.value,
          placeholder: props.placeholder,
          type: props.type,
          min: props.min,
          max: props.max,
          step: props.step,
          spellCheck: props.spellCheck,
          onChange: props.onChange,
        }),
      )
    }

    /** Key/value rows (env / headers); the add and remove affordances are link-style controls. */
    function EditorKvEditor(props) {
      const t = props.t
      const rows = Array.isArray(props.rows) ? props.rows : []
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'mm-label-row' },
          h(
            'span',
            { className: 'mm-field-label' },
            h('span', null, props.label),
            h(HelpDot, { tip: props.tip }),
          ),
          h(LinkButton, { onClick: () => props.onAdd(props.listKey) }, t('action.add')),
        ),
        h(
          'div',
          { className: 'mm-kv' },
          rows.map((entry, index) => h(
            'div',
            { className: 'mm-kv-row', key: index },
            h('input', {
              className: 'mm-input mm-mono mm-kv-key',
              value: entry.key,
              placeholder: props.keyPlaceholder,
              spellCheck: false,
              onChange: (event) => props.onUpdate(props.listKey, index, 'key', event.target.value),
            }),
            h('input', {
              className: 'mm-input mm-mono mm-kv-val',
              value: entry.value,
              placeholder: props.valuePlaceholder,
              spellCheck: false,
              onChange: (event) => props.onUpdate(props.listKey, index, 'value', event.target.value),
            }),
            h(KvDeleteButton, {
              label: t('action.removeRow'),
              onClick: () => props.onRemove(props.listKey, index),
            }),
          )),
        ),
      )
    }

    function EditorStdioFields(props) {
      const t = props.t
      const draft = props.draft
      return h(
        Fragment,
        null,
        h(
          Field,
          { label: t('editor.command'), tip: t('editor.commandTip'), required: true, requiredLabel: t('editor.required') },
          h(EditorInput, {
            className: 'mm-input mm-mono',
            value: draft.command,
            placeholder: t('editor.commandPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('command', event.target.value),
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
            onChange: (event) => props.setArgsText(event.target.value),
          }),
        ),
        h(EditorKvEditor, {
          t: t,
          listKey: 'envRows',
          label: t('editor.env'),
          tip: t('editor.envTip'),
          keyPlaceholder: t('editor.kvKeyEnv'),
          valuePlaceholder: t('editor.kvValEnv'),
          rows: draft.envRows,
          onAdd: props.addRow,
          onUpdate: props.updateRow,
          onRemove: props.removeRow,
        }),
      )
    }

    function EditorRemoteFields(props) {
      const t = props.t
      const draft = props.draft
      return h(
        Fragment,
        null,
        h(
          Field,
          { label: t('editor.url'), tip: t('editor.urlTip'), required: true, requiredLabel: t('editor.required') },
          h(EditorInput, {
            className: 'mm-input mm-mono',
            value: draft.url,
            placeholder: t('editor.urlPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('url', event.target.value),
          }),
        ),
        h(EditorKvEditor, {
          t: t,
          listKey: 'headersRows',
          label: t('editor.headers'),
          tip: t('editor.headersTip'),
          keyPlaceholder: t('editor.kvKeyHeader'),
          valuePlaceholder: t('editor.kvValHeader'),
          rows: draft.headersRows,
          onAdd: props.addRow,
          onUpdate: props.updateRow,
          onRemove: props.removeRow,
        }),
      )
    }

    function EditorForm(props) {
      const t = props.t
      const draft = props.draft
      return h(
        'div',
        { className: 'mm-form' },
        h(
          'div',
          { className: 'mm-grid-name' },
          h(EditorInputField, {
            label: t('editor.name'),
            tip: t('editor.nameTip'),
            required: true,
            requiredLabel: t('editor.required'),
            className: 'mm-input mm-mono',
            value: draft.serverName,
            placeholder: t('editor.namePlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('serverName', event.target.value),
          }),
          h(
            Field,
            { label: t('editor.transport'), tip: t('editor.transportTip') },
            h(
              'select',
              {
                className: 'mm-input mm-mono mm-select',
                value: draft.transport,
                onChange: (event) => props.setField('transport', event.target.value),
              },
              h('option', { value: 'stdio' }, 'stdio'),
              h('option', { value: 'streamable-http' }, 'streamable-http'),
              h('option', { value: 'sse' }, 'sse'),
            ),
          ),
        ),
        draft.transport === 'sse' ? h('p', { className: 'mm-hint mm-hint-warn' }, t('editor.sseHint')) : null,
        draft.transport === 'stdio'
          ? h(EditorStdioFields, {
            t: t,
            draft: draft,
            setField: props.setField,
            setArgsText: props.setArgsText,
            addRow: props.addRow,
            updateRow: props.updateRow,
            removeRow: props.removeRow,
          })
          : h(EditorRemoteFields, {
            t: t,
            draft: draft,
            setField: props.setField,
            addRow: props.addRow,
            updateRow: props.updateRow,
            removeRow: props.removeRow,
          }),
        props.advanced,
      )
    }

    /* ------------------------------------------------------------------ *
     * Editor advanced view: tuning fields and tool permissions.          *
     * ------------------------------------------------------------------ */

    function toolStatusOf(t, probeState) {
      const statusClass = probeState.phase === 'ok'
        ? ' mm-tools-status-ok'
        : probeState.phase === 'error'
          ? ' mm-tools-status-err'
          : probeState.phase === 'probing' ? ' mm-tools-status-warn' : ''
      const statusText = probeState.phase === 'probing'
        ? t('editor.toolsProbing')
        : probeState.message !== '' ? probeState.message : t('editor.toolsIdle')
      return { statusClass: statusClass, statusText: statusText }
    }

    function EditorTimeoutRetries(props) {
      const t = props.t
      return h(
        Fragment,
        null,
        h(EditorInputField, {
          label: t('editor.timeout'),
          tip: t('editor.timeoutTip'),
          small: true,
          className: 'mm-input mm-mono',
          type: 'number',
          value: props.draft.timeoutText,
          placeholder: t('editor.timeoutPlaceholder'),
          min: 1000,
          max: 3600000,
          step: 1000,
          onChange: (event) => props.setField('timeoutText', event.target.value),
        }),
        h(EditorInputField, {
          label: t('editor.retries'),
          tip: t('editor.retriesTip'),
          small: true,
          className: 'mm-input mm-mono',
          type: 'number',
          value: props.draft.retriesText,
          placeholder: t('editor.retriesPlaceholder'),
          min: 1,
          max: 1000,
          step: 1,
          onChange: (event) => props.setField('retriesText', event.target.value),
        }),
      )
    }

    function EditorStdioAdvancedFields(props) {
      const t = props.t
      return h(
        'div',
        { className: 'mm-adv-grid' },
        h(EditorInputField, {
          label: t('editor.cwd'),
          tip: t('editor.cwdTip'),
          small: true,
          className: 'mm-input mm-mono',
          value: props.draft.cwd,
          placeholder: t('editor.cwdPlaceholder'),
          spellCheck: false,
          onChange: (event) => props.setField('cwd', event.target.value),
        }),
        h(EditorTimeoutRetries, { t: t, draft: props.draft, setField: props.setField }),
      )
    }

    function EditorRemoteAdvancedFields(props) {
      const t = props.t
      return h(
        Fragment,
        null,
        h(
          'div',
          { className: 'mm-adv-grid mm-adv-grid-2' },
          h(EditorTimeoutRetries, { t: t, draft: props.draft, setField: props.setField }),
        ),
        h(
          'div',
          { className: 'mm-adv-grid mm-adv-grid-2' },
          h(EditorInputField, {
            label: t('editor.oauthClientId'),
            tip: t('editor.oauthClientIdTip'),
            small: true,
            className: 'mm-input mm-mono',
            value: props.draft.oauthClientId,
            placeholder: t('editor.oauthClientIdPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('oauthClientId', event.target.value),
          }),
          h(EditorInputField, {
            label: t('editor.oauthScopes'),
            tip: t('editor.oauthScopesTip'),
            small: true,
            className: 'mm-input mm-mono',
            value: props.draft.oauthScopes,
            placeholder: t('editor.oauthScopesPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('oauthScopes', event.target.value),
          }),
        ),
      )
    }

    function EditorAdvancedFields(props) {
      return props.draft.transport === 'stdio'
        ? h(EditorStdioAdvancedFields, { t: props.t, draft: props.draft, setField: props.setField })
        : h(EditorRemoteAdvancedFields, { t: props.t, draft: props.draft, setField: props.setField })
    }

    function EditorToolRow(props) {
      const t = props.t
      const current = props.policy[props.tool.name] !== undefined ? props.policy[props.tool.name] : 'default'
      const nameClass = current === 'auto' ? ' mm-tool-name-auto' : current === 'disabled' ? ' mm-tool-name-disabled' : ''
      return h(
        'div',
        { className: 'mm-tool-row' },
        h(
          'div',
          { className: 'mm-tool-info' },
          h('span', { className: 'mm-tool-name' + nameClass }, props.tool.name),
          props.tool.description !== '' ? h('span', { className: 'mm-tool-desc' }, props.tool.description) : null,
        ),
        h(Segmented, {
          value: current,
          onChange: (value) => props.onPolicyChange(props.tool.name, value),
          items: [
            { value: 'default', label: t('tool.default'), tip: t('tool.defaultTip') },
            { value: 'auto', label: t('tool.auto'), tip: t('tool.autoTip') },
            { value: 'disabled', label: t('tool.disabled'), tip: t('tool.disabledTip') },
          ],
        }),
      )
    }

    function EditorToolsHead(props) {
      const t = props.t
      const status = toolStatusOf(t, props.probeState)
      const probing = props.probeState.phase === 'probing'
      return h(
        'div',
        { className: 'mm-tools-head' },
        h(
          'div',
          { className: 'mm-tools-title' },
          h('span', null, t('editor.toolsTitle')),
          h(HelpDot, { tip: t('editor.toolsTip') }),
          h('span', { className: 'mm-tools-status' + status.statusClass }, status.statusText),
        ),
        h(
          'span',
          tooltipHandlers(t('action.probeTip')),
          h(
            Button,
            { size: 'sm', disabled: probing, onClick: props.onProbe },
            h(Svg, { d: ICON_REFRESH, size: 12, className: probing ? 'mm-spin-icon' : '' }),
            h('span', null, t('action.probe')),
          ),
        ),
      )
    }

    function EditorToolsToolbar(props) {
      const t = props.t
      return h(
        'div',
        { className: 'mm-tools-toolbar' },
        h('input', {
          className: 'mm-tools-filter',
          value: props.toolFilter,
          placeholder: t('editor.filterTools'),
          spellCheck: false,
          onChange: (event) => props.onFilterChange(event.target.value),
        }),
        h(
          'div',
          { className: 'mm-tools-batch' },
          h('span', null, t('editor.toolSummary', { auto: props.autoCount, disabled: props.disabledCount })),
          h('span', { className: 'mm-divider', 'aria-hidden': 'true' }),
          h(LinkButton, { onClick: props.onAllAuto }, t('action.allAuto')),
          h(LinkButton, { onClick: props.onResetDefault }, t('action.resetDefault')),
        ),
      )
    }

    function EditorToolsPanel(props) {
      const t = props.t
      const filterQuery = props.toolFilter.trim().toLowerCase()
      const filteredTools = filterQuery === ''
        ? props.probedTools
        : props.probedTools.filter((tool) => tool.name.toLowerCase().includes(filterQuery) || tool.description.toLowerCase().includes(filterQuery))
      return h(
        'div',
        { className: 'mm-tools-panel' },
        h(EditorToolsHead, { t: t, probeState: props.probeState, onProbe: props.onProbe }),
        h(EditorToolsToolbar, {
          t: t,
          toolFilter: props.toolFilter,
          onFilterChange: props.onFilterChange,
          autoCount: props.autoCount,
          disabledCount: props.disabledCount,
          onAllAuto: props.onAllAuto,
          onResetDefault: props.onResetDefault,
        }),
        h(
          'div',
          { className: 'mm-tools-list' },
          filteredTools.length === 0
            ? h('div', { className: 'mm-tools-empty' }, t('editor.toolsEmpty'))
            : filteredTools.map((tool) => h(EditorToolRow, {
              key: tool.name,
              t: t,
              tool: tool,
              policy: props.policy,
              onPolicyChange: props.onPolicyChange,
            })),
        ),
      )
    }

    function EditorAdvanced(props) {
      const t = props.t
      return h(
        'div',
        { className: 'mm-adv' },
        h(
          DisclosureButton,
          { open: props.open === true, onClick: props.onToggle },
          h(
            'span',
            { className: 'mm-adv-title' },
            h('span', null, t('editor.advanced')),
            props.customized === true ? h('span', { className: 'mm-badge' }, t('editor.customized')) : null,
          ),
        ),
        props.open === true
          ? h(
            'div',
            { className: 'mm-adv-panel' },
            h(EditorAdvancedFields, { t: t, draft: props.draft, setField: props.setField }),
            h(EditorToolsPanel, {
              t: t,
              probeState: props.probeState,
              onProbe: props.onProbe,
              probedTools: props.probedTools,
              toolFilter: props.toolFilter,
              onFilterChange: props.onFilterChange,
              autoCount: props.autoCount,
              disabledCount: props.disabledCount,
              onAllAuto: props.onAllAuto,
              onResetDefault: props.onResetDefault,
              policy: props.policy,
              onPolicyChange: props.onPolicyChange,
            }),
          )
          : null,
      )
    }

    /* ------------------------------------------------------------------ *
     * Editor JSON view: paste, sample and copy.                          *
     * ------------------------------------------------------------------ */

    function EditorJson(props) {
      const t = props.t
      return h(
        'div',
        { className: 'mm-json' },
        h(
          'div',
          { className: 'mm-json-toolbar' },
          h('span', null, t('editor.jsonHint')),
          h(
            'div',
            { className: 'mm-json-actions' },
            h(Button, { size: 'sm', onClick: props.onFillSample }, t('action.pasteSample')),
            h(Button, { size: 'sm', onClick: props.onCopy }, t('action.copyConfig')),
          ),
        ),
        h('textarea', {
          className: 'mm-input mm-mono mm-textarea mm-json-area',
          value: props.text,
          spellCheck: false,
          onChange: (event) => props.onChange(event.target.value),
        }),
        props.feedback.text !== ''
          ? h('div', { className: 'mm-feedback mm-feedback-' + (props.feedback.kind === 'ok' ? 'ok' : 'err') }, props.feedback.text)
          : null,
      )
    }

    /* ------------------------------------------------------------------ *
     * Editor dialog: composes the state hooks with the form/JSON views.  *
     * ------------------------------------------------------------------ */

    function useEditorController(props) {
      const t = props.t
      const mode = props.mode
      const row = props.row
      const pushToast = props.pushToast

      const initialTools = mode === 'edit' && isObject(row) ? probedToolsFromRow(row) : []
      const initialProbe = mode === 'edit' && isObject(row) && isObject(row.lastProbe) ? row.lastProbe : null
      const initialHasProbe = isObject(initialProbe)
        && ((Array.isArray(initialProbe.tools) && initialProbe.tools.length > 0)
          || (Array.isArray(initialProbe.toolNames) && initialProbe.toolNames.length > 0))

      const draftState = useEditorDraft(() => (mode === 'edit' && isObject(row) ? draftFromRow(row) : emptyDraft()))
      const policyState = useEditorPolicy(() => (mode === 'edit' && isObject(row) ? policyFromRow(row) : {}))
      const probe = useEditorProbe({
        t: t,
        pushToast: pushToast,
        row: row,
        draft: draftState.draft,
        policy: policyState.policy,
        policyRef: policyState.policyRef,
        initialTools: initialTools,
        initialHasProbe: initialHasProbe,
      })
      const json = useEditorJson({
        t: t,
        pushToast: pushToast,
        draft: draftState.draft,
        policy: policyState.policy,
        setDraft: draftState.setDraft,
        setPolicy: policyState.setPolicy,
        setProbedTools: probe.setProbedTools,
      })
      const test = useEditorTest(t, probe.runProbe)
      const save = useEditorSave({
        t: t,
        pushToast: pushToast,
        mode: mode,
        row: row,
        tab: json.tab,
        draft: draftState.draft,
        policy: policyState.policy,
        setDraft: draftState.setDraft,
        setPolicy: policyState.setPolicy,
        jsonText: json.jsonText,
        setJsonFeedback: json.setJsonFeedback,
        onSaved: props.onSaved,
      })
      const summary = editorSummaryOf(draftState.draft, policyState.policy)

      function handleAllAuto() {
        policyState.setPolicy((prev) => {
          const copy = Object.assign({}, prev)
          for (const tool of probe.probedTools) copy[tool.name] = 'auto'
          return copy
        })
      }

      function handleResetDefault() {
        policyState.setPolicy({})
      }

      return {
        t: t,
        mode: mode,
        draftState: draftState,
        policyState: policyState,
        probe: probe,
        json: json,
        test: test,
        save: save,
        summary: summary,
        handleAllAuto: handleAllAuto,
        handleResetDefault: handleResetDefault,
      }
    }

    function EditorFooter(props) {
      const t = props.t
      return h(
        Fragment,
        null,
        h(
          'div',
          { className: 'mm-foot-left' },
          h(Button, {
            size: 'sm',
            disabled: props.testing === true,
            onClick: props.onTest,
          }, t('action.test')),
          props.testResult.text !== ''
            ? h('span', { className: 'mm-test-result mm-test-' + props.testResult.kind }, props.testResult.text)
            : null,
        ),
        h(
          'div',
          { className: 'mm-foot-right' },
          h(Button, { variant: 'ghost', onClick: props.onClose }, t('action.cancel')),
          h(Button, { variant: 'primary', disabled: props.saving === true, loading: props.saving === true, onClick: props.onSave }, t('action.save')),
        ),
      )
    }

    function EditorDialog(props) {
      const state = useEditorController(props)
      const t = state.t
      const mode = state.mode

      const tabs = h(Tabs, {
        value: state.json.tab,
        onChange: state.json.switchTab,
        items: [
          { value: 'form', label: t('editor.tabForm') },
          { value: 'json', label: t('editor.tabJson'), tip: t('action.jsonTip') },
        ],
      })

      const formPanel = h(EditorForm, {
        t: t,
        draft: state.draftState.draft,
        setField: state.draftState.setField,
        setArgsText: state.draftState.setArgsText,
        addRow: state.draftState.addRow,
        updateRow: state.draftState.updateRow,
        removeRow: state.draftState.removeRow,
        advanced: h(EditorAdvanced, {
          t: t,
          open: state.probe.advancedOpen,
          onToggle: state.probe.toggleAdvanced,
          customized: state.summary.customized,
          draft: state.draftState.draft,
          setField: state.draftState.setField,
          probeState: state.probe.probeState,
          probedTools: state.probe.probedTools,
          toolFilter: state.probe.toolFilter,
          onFilterChange: state.probe.setToolFilter,
          autoCount: state.summary.autoCount,
          disabledCount: state.summary.disabledCount,
          onProbe: () => state.probe.runProbe(false),
          policy: state.policyState.policy,
          onPolicyChange: state.policyState.setToolPolicy,
          onAllAuto: state.handleAllAuto,
          onResetDefault: state.handleResetDefault,
        }),
      })

      const jsonPanel = h(EditorJson, {
        t: t,
        text: state.json.jsonText,
        feedback: state.json.jsonFeedback,
        onChange: state.json.handleJsonChange,
        onFillSample: state.json.fillSample,
        onCopy: state.json.copyJson,
      })

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
          footer: h(EditorFooter, {
            t: t,
            testing: state.test.testing,
            testResult: state.test.testResult,
            onTest: state.test.handleTest,
            saving: state.save.saving,
            onSave: state.save.handleSave,
            onClose: props.onClose,
          }),
        },
        state.json.tab === 'json' ? jsonPanel : formPanel,
      )
    }

    /* ------------------------------------------------------------------ *
     * Delete confirmation.                                               *
     * ------------------------------------------------------------------ */

    function DeleteDialog(props) {
      const t = props.t
      const row = props.row
      const cancelRef = useRef(null)
      const footer = h(
        Fragment,
        null,
        h('div', { className: 'mm-foot-left' }),
        h(
          'div',
          { className: 'mm-foot-right' },
          h(Button, { variant: 'ghost', buttonRef: cancelRef, onClick: props.onClose }, t('delete.cancel')),
          h(Button, { variant: 'danger', disabled: props.busy === true, loading: props.busy === true, onClick: props.onConfirm }, t('delete.confirm')),
        ),
      )
      return h(
        Dialog,
        {
          title: t('delete.title'),
          size: 'confirm',
          onClose: props.onClose,
          initialFocus: cancelRef,
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

    /** The user's Settings font size (`ui-theme.fontSize`), clamped to the supported 10–24 range. */
    function normalizeHostFontSize(value) {
      const size = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 14
      return Math.min(24, Math.max(10, size))
    }

    /** Read the live font size from the host theme service; fall back to the Host payload. */
    function readHostFontSize(fallback) {
      const theme = themeService
      if (theme !== null && theme !== undefined && typeof theme.getTheme === 'function') {
        try {
          const snapshot = theme.getTheme()
          if (isObject(snapshot) && isObject(snapshot.fontSizes)) return normalizeHostFontSize(snapshot.fontSizes.text)
        } catch (error) {
          /* fall through to the Host-provided value */
        }
      }
      return normalizeHostFontSize(fallback)
    }

    /** Track `ui-theme` font changes while the page is mounted (§3.1 / §3.2). */
    function useHostFontSize(fallback) {
      const [fontSize, setFontSize] = useState(() => readHostFontSize(fallback))
      useEffect(() => {
        setFontSize(readHostFontSize(fallback))
        if (pluginCtx === null || pluginCtx === undefined || typeof pluginCtx.on !== 'function') return undefined
        const off = pluginCtx.on('theme/change', (snapshot) => {
          if (isObject(snapshot) && isObject(snapshot.fontSizes)) setFontSize(normalizeHostFontSize(snapshot.fontSizes.text))
        })
        return typeof off === 'function' ? off : undefined
      }, [fallback])
      return fontSize
    }

    /** Transient toast queue; each entry auto-dismisses after 3s. */
    function useToasts() {
      const [toasts, setToasts] = useState([])
      const toastSeq = useRef(0)
      const pushToast = useCallback((kind, text) => {
        toastSeq.current += 1
        const id = toastSeq.current
        setToasts((prev) => prev.concat([{ id: id, kind: kind, text: text }]))
        setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id))
        }, 3000)
      }, [])
      const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, [])
      return { toasts: toasts, pushToast: pushToast, dismissToast: dismissToast }
    }

    /** Page data: load / poll `state` and derive the list rows plus banners. */
    function useMcpData(tRef) {
      const [data, setData] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [unauthorized, setUnauthorized] = useState(false)
      const [refreshing, setRefreshing] = useState(false)
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
      const refresh = useCallback(async () => {
        setRefreshing(true)
        try {
          await load()
        } finally {
          setRefreshing(false)
        }
      }, [load])
      useEffect(() => {
        load()
        const timer = setInterval(load, POLL_MS)
        return () => {
          clearInterval(timer)
        }
      }, [load])
      const rows = isObject(data) && Array.isArray(data.rows) ? data.rows : []
      const warnings = isObject(data) && Array.isArray(data.warnings) ? data.warnings.map((entry) => textOf(entry)).filter((entry) => entry !== '') : []
      return { data: data, loading: loading, error: error, unauthorized: unauthorized, refreshing: refreshing, rows: rows, warnings: warnings, load: load, refresh: refresh }
    }

    /** Row-level actions: enable toggle and the toolbar "test all" probe. */
    function useServerActions(t, rows, pushToast, load) {
      const [busy, setBusy] = useState(false)
      const [testingAll, setTestingAll] = useState(false)

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

      return { busy: busy, testingAll: testingAll, toggleEnabled: toggleEnabled, testAll: testAll }
    }

    /** Editor / delete dialog state, focus return and the close / save / delete handlers. */
    function useMcpDialogs(t, pushToast, load) {
      const [editor, setEditor] = useState(null)
      const [deleteTarget, setDeleteTarget] = useState(null)
      const [deleting, setDeleting] = useState(false)
      const returnFocus = useRef(null)

      // 视图切换（弹窗打开/关闭）时立即收起残留浮层。
      useEffect(() => {
        hideTooltip()
      }, [editor, deleteTarget])

      function openEditor(mode, row) {
        returnFocus.current = typeof document !== 'undefined' && document !== null ? document.activeElement : null
        setEditor({ mode: mode, row: row })
      }

      function closeEditor() {
        setEditor(null)
        load()
      }

      function handleSaved() {
        setEditor(null)
        load()
      }

      function requestDelete(row) {
        returnFocus.current = typeof document !== 'undefined' && document !== null ? document.activeElement : null
        setDeleteTarget(row)
      }

      function closeDelete() {
        setDeleteTarget(null)
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

      return {
        editor: editor,
        deleteTarget: deleteTarget,
        deleting: deleting,
        returnFocus: returnFocus,
        openEditor: openEditor,
        closeEditor: closeEditor,
        handleSaved: handleSaved,
        requestDelete: requestDelete,
        closeDelete: closeDelete,
        confirmDelete: confirmDelete,
      }
    }

    function McpPage(props) {
      const bound = props !== null && props !== undefined && typeof props.t === 'function' ? props.t : activeT
      const t = typeof bound === 'function' ? bound : function fallback(key) { return key }
      const tRef = useRef(t)
      tRef.current = t

      const [query, setQuery] = useState('')
      const toasts = useToasts()
      const state = useMcpData(tRef)
      const actions = useServerActions(t, state.rows, toasts.pushToast, state.load)
      const dialogs = useMcpDialogs(t, toasts.pushToast, state.load)
      const fontSize = useHostFontSize(isObject(state.data) && Number.isFinite(state.data.fontSize) ? state.data.fontSize : 14)
      return h(
        'div',
        { className: 'mm-root', style: { '--ds-fs': fontSize + 'px' } },
        h(TooltipLayer),
        h(PageHeader, {
          t: t,
          query: query,
          onQueryChange: setQuery,
          testingAll: actions.testingAll,
          busy: actions.busy,
          hasData: state.data !== null,
          warnings: state.warnings,
          error: state.error,
          refreshing: state.refreshing,
          onRefresh: state.refresh,
          onTestAll: actions.testAll,
          onAdd: () => dialogs.openEditor('create', null),
        }),
        h(ServerList, {
          t: t,
          rows: state.rows,
          query: query,
          loading: state.loading,
          hasData: state.data !== null,
          error: state.error,
          unauthorized: state.unauthorized,
          busy: actions.busy,
          testingAll: actions.testingAll,
          onRetry: state.load,
          onToggleEnabled: actions.toggleEnabled,
          onEdit: (target) => dialogs.openEditor('edit', target),
          onDelete: dialogs.requestDelete,
        }),
        dialogs.editor !== null
          ? h(EditorDialog, {
            key: 'editor:' + dialogs.editor.mode + ':' + (isObject(dialogs.editor.row) ? textOf(dialogs.editor.row.id) : 'new'),
            t: t,
            mode: dialogs.editor.mode,
            row: dialogs.editor.row,
            returnFocus: dialogs.returnFocus.current,
            pushToast: toasts.pushToast,
            onClose: dialogs.closeEditor,
            onSaved: dialogs.handleSaved,
          })
          : null,
        dialogs.deleteTarget !== null
          ? h(DeleteDialog, {
            t: t,
            row: dialogs.deleteTarget,
            busy: dialogs.deleting,
            returnFocus: dialogs.returnFocus.current,
            onClose: dialogs.closeDelete,
            onConfirm: dialogs.confirmDelete,
          })
          : null,
        h(ToastHost, { toasts: toasts.toasts, dismissLabel: t('action.close'), onDismiss: toasts.dismissToast }),
      )
    }
    /* ------------------------------------------------------------------ *
     * Page header: title, search, toolbar, warning / error banners.      *
     * ------------------------------------------------------------------ */

    function PageHeader(props) {
      const t = props.t
      const warnings = Array.isArray(props.warnings) ? props.warnings : []
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
              value: props.query,
              placeholder: t('page.searchPlaceholder'),
              'aria-label': t('page.searchPlaceholder'),
              spellCheck: false,
              onChange: (event) => {
                if (typeof props.onQueryChange === 'function') props.onQueryChange(event.target.value)
              },
            }),
          ),
          h(IconButton, {
            icon: ICON_REFRESH,
            label: t('page.refresh'),
            tooltip: t('page.refresh'),
            className: 'mm-toolbar-btn',
            spin: props.refreshing === true,
            disabled: props.busy === true,
            onClick: props.onRefresh,
          }),
          h(IconButton, {
            icon: ICON_ZAP,
            label: t('page.testAll'),
            tooltip: t('page.testAll'),
            className: 'mm-toolbar-btn',
            spin: props.testingAll === true,
            disabled: props.busy === true,
            onClick: props.onTestAll,
          }),
          h(
            Button,
            { variant: 'primary', icon: ICON_PLUS, onClick: props.onAdd },
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
      const errorBanner = props.error !== null && props.error !== undefined && props.hasData === true
        ? h('div', { className: 'mm-error-banner' }, props.error)
        : null
      return h(Fragment, null, header, warningsBanner, errorBanner)
    }
    /* ------------------------------------------------------------------ *
     * Server list: four states + filtered rows.                          *
     * ------------------------------------------------------------------ */

    function SkeletonList(props) {
      return h(
        'div',
        { className: 'mm-list', role: 'status', 'aria-busy': 'true', 'aria-label': props.label },
        [0, 1, 2].map((index) => h(
          'div',
          { key: index, className: 'mm-skeleton-row' },
          h('span', { className: 'mm-skeleton-line mm-skeleton-name' }),
          h('span', { className: 'mm-skeleton-line mm-skeleton-summary' }),
        )),
      )
    }

    function filterRows(rows, query) {
      const needle = textOf(query).trim().toLowerCase()
      if (needle === '') return rows
      return rows.filter((row) => {
        const config = isObject(row.config) ? row.config : {}
        const target = textOf(row.target) !== '' ? textOf(row.target) : targetOfConfig(config)
        const transport = isObject(row.config) ? transportOf(row.config) : textOf(row.transport)
        const haystack = [textOf(row.serverName), target, textOf(row.id), transport].join(' ').toLowerCase()
        return haystack.includes(needle)
      })
    }

    function ServerList(props) {
      const t = props.t
      const rows = Array.isArray(props.rows) ? props.rows : []
      const filteredRows = filterRows(rows, props.query)
      const [expanded, setExpanded] = useState({})
      // 首载骨架 >300ms 才显示，避免快速返回时闪一下（design.md §7.10）。
      const [skeletonReady, setSkeletonReady] = useState(false)
      useEffect(() => {
        if (props.loading !== true || props.hasData === true) {
          setSkeletonReady(false)
          return undefined
        }
        const timer = setTimeout(() => setSkeletonReady(true), 300)
        return () => clearTimeout(timer)
      }, [props.loading, props.hasData])
      function toggleExpanded(row) {
        setExpanded((prev) => {
          const next = Object.assign({}, prev)
          if (next[row.id] === true) delete next[row.id]
          else next[row.id] = true
          return next
        })
      }
      let content
      if (props.unauthorized === true) {
        content = h(StatePanel, { title: t('page.unauthorized'), actionLabel: t('page.retry'), onAction: props.onRetry })
      } else if (props.error !== null && props.error !== undefined && props.hasData !== true) {
        content = h(StatePanel, { title: t('page.error'), hint: props.error, actionLabel: t('page.retry'), onAction: props.onRetry })
      } else if (props.loading === true && props.hasData !== true) {
        content = skeletonReady === true ? h(SkeletonList, { label: t('page.loading') }) : null
      } else if (filteredRows.length === 0) {
        content = h(StatePanel, { icon: ICON_PLUG, title: t('list.empty') })
      } else {
        content = h(
          'div',
          { className: 'mm-list' },
          filteredRows.map((row) => h(ServerRow, {
            key: textOf(row.level) + ':' + textOf(row.id),
            t: t,
            row: row,
            busy: props.busy === true,
            testingAll: props.testingAll === true,
            expanded: expanded[row.id] === true,
            onToggleExpand: () => toggleExpanded(row),
            onToggleEnabled: props.onToggleEnabled,
            onEdit: props.onEdit,
            onDelete: props.onDelete,
          })),
        )
      }
      return content
    }
    /* ------------------------------------------------------------------ *
     * Styles.                                                            *
     * ------------------------------------------------------------------ */

    const CSS = [
      '.mm-root,.mm-root *,.mm-root *::before,.mm-root *::after{box-sizing:border-box}',
      '.mm-root{display:flex;flex-direction:column;width:100%;max-width:640px;height:100%;min-height:0;margin:0 auto;padding:16px 20px 48px;--ds-fs:var(--dsh-content-font-size,14px);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif);font-size:var(--ds-fs);line-height:1.5}',
      '.mm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
      '.mm-muted{color:var(--dsw-alias-label-tertiary)}',
      '.mm-icon{display:block;flex:none}',
      '.mm-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:.5px solid var(--dsw-alias-border-l1);flex:none}',
      '.mm-head-left{display:flex;align-items:center;gap:8px;min-width:0}',
      '.mm-title{margin:0;font-size:calc(var(--ds-fs) + 2px);font-weight:500;line-height:1.35;letter-spacing:-0.01em}',
      '.mm-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:1 1 auto;min-width:0}',
      '.mm-head-actions>.mm-btn{flex:none}',
      '.mm-help{display:inline-flex;align-items:center;justify-content:center;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none;position:relative;transition:color .12s ease}',
      '.mm-help::after{content:\'\';position:absolute;inset:-6px;border-radius:var(--dsw-radius-sm)}',
      '.mm-help:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-search{position:relative;flex:1 1 0;min-width:0;max-width:200px}',
      '.mm-search-icon{position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--dsw-alias-label-tertiary);pointer-events:none}',
      '.mm-search-input{width:100%;height:34px;padding:0 12px 0 32px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-size:calc(var(--ds-fs) - 1px);line-height:20px;font-family:inherit;outline:none;transition:border-color .12s ease}',
      '.mm-search-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.mm-search-input:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '.mm-list{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow-y:auto;padding-right:2px;scrollbar-gutter:stable}',
      '.mm-list::-webkit-scrollbar,.mm-tools-list::-webkit-scrollbar,.mm-dialog-body::-webkit-scrollbar{width:6px;height:6px}',
      '.mm-list::-webkit-scrollbar-thumb,.mm-tools-list::-webkit-scrollbar-thumb,.mm-dialog-body::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 45%,transparent);border-radius:9999px}',
      '.mm-row{padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2);display:flex;flex-direction:column;gap:8px}',
      '.mm-row:last-child{border-bottom:none}',
      '.mm-row-main{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:0}',
      '.mm-row-left{min-width:0;flex:1 1 auto}',
      '.mm-row-line1{display:flex;align-items:center;gap:8px;min-width:0}',
      '.mm-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary);cursor:help}',
      '.mm-dot-ok{background:var(--dsw-alias-state-success-primary)}',
      '.mm-dot-warn{background:var(--dsw-alias-state-warn-primary)}',
      '.mm-dot-err{background:var(--dsw-alias-state-error-primary)}',
      '.mm-dot-muted{background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 55%,transparent)}',
      '.mm-dot-pulse{animation:mm-pulse 1.4s ease-in-out infinite}',
      '.mm-name{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--ds-fs);font-weight:500;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
      '.mm-name-dim{color:var(--dsw-alias-label-tertiary)}',
      '.mm-chip{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 6px;border-radius:var(--dsw-radius-xs);font-size:calc(var(--ds-fs) - 2px);line-height:19px;white-space:nowrap;border:.5px solid transparent;flex:none}',
      '.mm-chip-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l1)}',
      '.mm-chip-warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 28%,transparent)}',
      '.mm-latency{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:calc(var(--ds-fs) - 2px);color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.mm-tools-btn{display:inline-flex;align-items:center;gap:2px;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 2px);font-family:inherit;cursor:pointer;white-space:nowrap}',
      '.mm-tools-btn:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-chevron{transition:transform .18s ease}',
      '.mm-chevron-open{transform:rotate(180deg)}',
      '.mm-summary{margin-top:4px;padding-left:16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:calc(var(--ds-fs) - 2px);color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.mm-actions{display:flex;align-items:center;gap:6px;flex:none}',
      '.mm-expand{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding-left:16px;padding-top:2px}',
      '.mm-tool-badge{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:var(--dsw-radius-xs);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:calc(var(--ds-fs) - 2px);line-height:19px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border:.5px solid transparent;cursor:default}',
      '.mm-tool-badge-auto{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 25%,transparent)}',
      '.mm-tool-badge-disabled{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 25%,transparent);text-decoration:line-through}',
      '.mm-icon-btn{width:32px;height:32px;padding:0;border-radius:var(--dsw-radius-sm);border:.5px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .12s ease,color .12s ease,border-color .12s ease}',
      '.mm-icon-btn:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}',
      '.mm-icon-btn:focus-visible{outline:none;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}',
      '.mm-icon-btn:active{background:var(--dsw-alias-interactive-bg-active)}',
      '.mm-icon-btn:disabled{opacity:.4;cursor:default}',
      '.mm-icon-btn-ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 30%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.mm-icon-btn-ok:hover{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 20%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.mm-icon-btn-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-icon-btn-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 15%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.mm-icon-btn-spin .mm-icon{animation:mm-spin .8s linear infinite}',
      '.mm-toolbar-btn{width:32px;height:32px;flex:none;border-radius:var(--dsw-radius-sm);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-tool-bar-fill,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary)}',
      '.mm-toolbar-btn:hover{background:var(--dsw-alias-button-tool-bar-hover,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-primary)}',
      '.mm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:var(--ds-fs);line-height:22px;font-weight:500;font-family:inherit;cursor:pointer;transition:background .12s ease,border-color .12s ease}',
      '.mm-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.mm-btn:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.mm-btn:active{background:var(--dsw-alias-interactive-bg-active)}',
      '.mm-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.mm-btn-primary{background:var(--dsw-alias-button-primary-fill);border-color:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.mm-btn-primary:hover{background:var(--dsw-alias-button-primary-hover);border-color:var(--dsw-alias-button-primary-hover)}',
      '.mm-btn-danger{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground)}',
      '.mm-btn-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 85%,transparent)}',
      '.mm-btn-ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}',
      '.mm-btn-ghost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.mm-btn-sm{height:28px;padding:0 10px;border-radius:var(--dsw-radius-sm);font-size:calc(var(--ds-fs) - 2px);line-height:18px}',
      '.mm-btn-md{height:32px;padding:0 12px;border-radius:var(--dsw-radius-md);font-size:calc(var(--ds-fs) - 1px);line-height:20px}',
      '.mm-empty{padding:48px 0;text-align:center;font-size:var(--ds-fs);color:var(--dsw-alias-label-tertiary)}',
      '.mm-loading{padding:32px 0;text-align:center;font-size:var(--ds-fs);color:var(--dsw-alias-label-tertiary)}',
      '.mm-skeleton-row{padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2);display:flex;flex-direction:column;gap:8px}',
      '.mm-skeleton-line{display:block;height:12px;border-radius:var(--dsw-radius-xs);background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 14%,transparent);animation:mm-pulse 1.4s ease-in-out infinite}',
      '.mm-skeleton-name{width:40%}',
      '.mm-skeleton-summary{width:65%;height:10px}',
      '.mm-warn-banner{margin-top:12px;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:calc(var(--ds-fs) - 2px);line-height:1.5;display:flex;gap:8px;flex-wrap:wrap}',
      '.mm-warn-label{font-weight:600}',
      '.mm-error-banner{margin-top:12px;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);font-size:calc(var(--ds-fs) - 2px);line-height:1.5}',
      '.mm-state{padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}',
      '.mm-state-title{margin:0;font-size:var(--ds-fs);color:var(--dsw-alias-label-secondary)}',
      '.mm-state-hint{margin:0;font-size:calc(var(--ds-fs) - 2px);color:var(--dsw-alias-label-tertiary)}',
      '.mm-state-icon{color:var(--dsw-alias-label-tertiary)}',
      '.mm-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;background:transparent}',
      '.mm-dialog{width:100%;max-width:min(640px,calc(100vw - 32px));max-height:calc(100vh - 96px);display:flex;flex-direction:column;font-size:var(--ds-fs);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);box-shadow:none;overflow:hidden}',
      '.mm-dialog-confirm{max-width:min(480px,calc(100vw - 32px));max-height:calc(100vh - 96px);border-radius:var(--dsw-radius-xl)}',
      '.mm-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-bottom:.5px solid var(--dsw-alias-border-l1);flex:none}',
      '.mm-dialog-title{margin:0;font-size:calc(var(--ds-fs) + 1px);line-height:1.35;font-weight:600}',
      '.mm-dialog-head-actions{display:flex;align-items:center;gap:8px}',
      '.mm-dialog-body{padding:20px 24px;overflow-y:auto;flex:1 1 auto;min-height:0}',
      '.mm-dialog-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 24px;border-top:.5px solid var(--dsw-alias-border-l1);flex:none}',
      '.mm-foot-left{display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 auto}',
      '.mm-foot-right{display:flex;align-items:center;gap:8px;flex:none}',
      '.mm-tabs{display:inline-flex;padding:4px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform)}',
      '.mm-tab{height:34px;padding:0 12px;border-radius:var(--dsw-radius-md);border:.5px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:var(--ds-fs);line-height:22px;font-weight:500;font-family:inherit;cursor:pointer;transition:background .12s ease,color .12s ease}',
      '.mm-tab-active{background:var(--dsw-alias-bg-layer-3);border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);font-weight:600}',
      '.mm-tab:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.mm-tab:active{background:var(--dsw-alias-interactive-bg-active)}',
      '.mm-form{display:flex;flex-direction:column;gap:16px}',
      '.mm-grid-name{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px}',
      '.mm-field{display:flex;flex-direction:column;gap:6px;min-width:0}',
      '.mm-field-label{display:flex;align-items:center;gap:6px;font-size:var(--ds-fs);color:var(--dsw-alias-label-secondary);line-height:1.5}',
      '.mm-field-sm .mm-field-label{font-size:calc(var(--ds-fs) - 1px)}',
      '.mm-required{color:var(--dsw-alias-state-error-primary);font-size:calc(var(--ds-fs) - 2px);cursor:help}',
      '.mm-input{width:100%;height:34px;padding:0 12px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-size:calc(var(--ds-fs) - 1px);font-family:inherit;outline:none;transition:border-color .12s ease}',
      '.mm-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.mm-input:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '.mm-input.mm-mono,.mm-select.mm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
      '.mm-field-sm .mm-input{height:34px;font-size:calc(var(--ds-fs) - 1px);padding:0 10px}',
      '.mm-select{cursor:pointer;padding-right:8px}',
      '.mm-textarea{height:auto;min-height:88px;padding:8px 12px;line-height:1.6;resize:vertical}',
      '.mm-label-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}',
      '.mm-link-btn{padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 2px);font-family:inherit;cursor:pointer;white-space:nowrap}',
      '.mm-link-btn:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-kv{display:flex;flex-direction:column;gap:8px}',
      '.mm-kv-row{display:flex;align-items:center;gap:8px}',
      '.mm-kv-row .mm-input{width:auto;height:34px;font-size:calc(var(--ds-fs) - 1px);padding:0 10px}',
      '.mm-kv-key{flex:0 0 40%}',
      '.mm-kv-val{flex:1 1 auto}',
      '.mm-kv-del{width:32px;height:32px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--dsw-radius-sm);flex:none}',
      '.mm-kv-del:hover{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}',
      '.mm-hint{margin:0;font-size:calc(var(--ds-fs) - 2px);line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.mm-hint-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-adv{border-top:.5px solid var(--dsw-alias-border-l1);padding-top:8px}',
      '.mm-adv-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 1px);font-family:inherit;cursor:pointer}',
      '.mm-adv-toggle:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-adv-title{display:flex;align-items:center;gap:8px;font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.mm-badge{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:var(--dsw-radius-xs);font-size:calc(var(--ds-fs) - 2px);line-height:19px;font-weight:400;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border:.5px solid var(--dsw-alias-border-l2)}',
      '.mm-adv-panel{padding-top:12px;display:flex;flex-direction:column;gap:16px}',
      '.mm-adv-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
      '.mm-adv-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '.mm-tools-panel{border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);overflow:hidden}',
      '.mm-tools-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex-wrap:wrap}',
      '.mm-tools-title{display:flex;align-items:center;gap:8px;font-size:calc(var(--ds-fs) - 1px);font-weight:500;color:var(--dsw-alias-label-secondary);min-width:0;flex-wrap:wrap}',
      '.mm-tools-status{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:9999px;border:.5px solid var(--dsw-alias-border-l1);font-size:calc(var(--ds-fs) - 2px);line-height:19px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.mm-tools-status-ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 28%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.mm-tools-status-warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 28%,transparent);color:var(--dsw-alias-state-warn-primary)}',
      '.mm-tools-status-err{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 28%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.mm-tools-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1);font-size:calc(var(--ds-fs) - 2px);color:var(--dsw-alias-label-secondary);flex-wrap:wrap}',
      '.mm-tools-filter{height:34px;padding:0 12px;width:180px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-size:calc(var(--ds-fs) - 1px);font-family:inherit;outline:none}',
      '.mm-tools-filter::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.mm-tools-filter:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '.mm-tools-batch{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.mm-divider{width:.5px;height:12px;background:var(--dsw-alias-border-l1);flex:none}',
      '.mm-tools-list{max-height:210px;overflow-y:auto}',
      '.mm-tool-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.mm-tool-row:last-child{border-bottom:none}',
      '.mm-tool-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.mm-tool-info{min-width:0;flex:1 1 auto;display:flex;align-items:baseline;gap:8px;overflow:hidden}',
      '.mm-tool-name{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--ds-fs);font-weight:500;color:var(--dsw-alias-label-primary);white-space:nowrap}',
      '.mm-tool-name-auto{color:var(--dsw-alias-state-success-primary)}',
      '.mm-tool-name-disabled{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}',
      '.mm-tool-desc{font-size:calc(var(--ds-fs) - 2px);color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
      '.mm-tools-empty{padding:24px 12px;text-align:center;font-size:calc(var(--ds-fs) - 2px);color:var(--dsw-alias-label-tertiary)}',
      '.mm-seg{display:inline-flex;gap:2px;flex:none}',
      '.mm-seg-btn{height:28px;padding:0 10px;border-radius:9999px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px);line-height:18px;font-family:inherit;cursor:pointer;white-space:nowrap;transition:background .12s ease,color .12s ease}',
      '.mm-seg-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.mm-seg-btn-active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:500}',
      '.mm-seg-btn:active{background:var(--dsw-alias-interactive-bg-active)}',
      '.mm-seg-btn-auto.mm-seg-btn-active{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 20%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 35%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.mm-seg-btn-disabled.mm-seg-btn-active{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.mm-json{display:flex;flex-direction:column;gap:12px}',
      '.mm-json-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:calc(var(--ds-fs) - 2px);color:var(--dsw-alias-label-secondary);flex-wrap:wrap}',
      '.mm-json-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.mm-json-area{min-height:320px}',
      '.mm-feedback{font-size:calc(var(--ds-fs) - 2px);line-height:1.5}',
      '.mm-feedback-ok{color:var(--dsw-alias-state-success-primary)}',
      '.mm-feedback-err{color:var(--dsw-alias-state-error-primary)}',
      '.mm-test-result{font-size:calc(var(--ds-fs) - 2px);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}',
      '.mm-test-busy{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-test-ok{color:var(--dsw-alias-state-success-primary)}',
      '.mm-test-err{color:var(--dsw-alias-state-error-primary)}',
      '.mm-delete-desc{margin:0;font-size:calc(var(--ds-fs) - 1px);line-height:1.7;color:var(--dsw-alias-label-secondary)}',
      '.mm-delete-name{color:var(--dsw-alias-label-primary)}',
      '.mm-tooltip-host{position:fixed;left:0;top:0;width:0;height:0;z-index:2000;pointer-events:none;--ds-fs:var(--dsh-content-font-size,14px)}',
      '.mm-tooltip{position:fixed;box-sizing:border-box;z-index:2000;max-width:min(40vw,290px);padding:3px 7px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:calc(var(--ds-fs) - 2px);line-height:1.35;box-shadow:none;pointer-events:none;opacity:0;transform:translateY(2px);transition:opacity .12s ease,transform .12s ease;white-space:normal}',
      '.mm-tooltip-show{opacity:1;transform:translateY(0)}',
      '.mm-toasts{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2100;display:flex;flex-direction:column;gap:8px;pointer-events:none;width:min(420px,calc(100vw - 32px))}',
      '.mm-toast{display:flex;align-items:flex-start;gap:8px;padding:12px 16px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-size:calc(var(--ds-fs) - 1px);line-height:1.5;box-shadow:none;animation:mm-toast-in .18s ease;pointer-events:auto}',
      '.mm-toast-dot{width:6px;height:6px;border-radius:50%;margin-top:6px;flex:none;background:var(--dsw-alias-brand-primary)}',
      '.mm-toast-ok{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent)}',
      '.mm-toast-ok .mm-toast-dot{background:var(--dsw-alias-state-success-primary)}',
      '.mm-toast-err{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent)}',
      '.mm-toast-err .mm-toast-dot{background:var(--dsw-alias-state-error-primary)}',
      '.mm-toast-info .mm-toast-dot{background:var(--dsw-alias-brand-primary)}',
      '.mm-toast-text{min-width:0;word-break:break-word}',
      '.mm-toast-close{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;border-radius:var(--dsw-radius-xs);flex:none}',
      '.mm-toast-close:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-spin-icon{animation:mm-spin .8s linear infinite}',
      '@keyframes mm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@keyframes mm-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:.45}}',
      '@keyframes mm-toast-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
      '@media (max-width:720px){.mm-head{flex-wrap:wrap}.mm-head-actions{width:100%;flex:1 1 100%;justify-content:flex-end}.mm-search{flex:1 1 0;min-width:0;max-width:none;width:auto}.mm-grid-name{grid-template-columns:1fr}.mm-adv-grid,.mm-adv-grid-2{grid-template-columns:1fr}.mm-dialog-head{padding:12px 16px}.mm-dialog-body{padding:16px}.mm-dialog-foot{padding:12px 16px}}',
      '@media (max-width:520px){.mm-search{flex:1 1 100%;width:100%}.mm-row-main{gap:8px}.mm-actions{gap:2px}.mm-name{font-size:var(--ds-fs)}.mm-tools-toolbar{align-items:flex-start;flex-direction:column}.mm-tools-filter{width:100%}}',
    ].join('\n')

    /* ------------------------------------------------------------------ *
     * Registration. All side effects live inside apply and ctx.effect.   *
     * ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale', 'theme'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        activeT = t
        pluginCtx = ctx
        themeService = ctx.theme

        ctx.effect(() => ctx.locale.register(NS, { zh: zh, en: en }), 'mcp-manager: dictionaries')

        ctx.effect(() => {
          if (typeof document === 'undefined' || document === null) return () => {}
          const style = document.createElement('style')
          style.dataset.plugin = '@chengze/dsh-mcp-manager'
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
          if (tooltip.observer !== null && tooltip.observer !== undefined) {
            tooltip.observer.disconnect()
            tooltip.observer = null
          }
          if (tooltip.host !== null && tooltip.host.parentNode !== null && tooltip.host.parentNode !== undefined) {
            tooltip.host.parentNode.removeChild(tooltip.host)
          }
          tooltip.host = null
          tooltip.node = null
          tooltip.root = null
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
