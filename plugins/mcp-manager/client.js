// MCP manager — browser half for DeepSeek Harness 0.2.x.
//
// Registers one Settings section (`设置 → MCP 服务`) that owns the MCP server rows of this
// Harness. The page talks to the host half over the same-origin route `mcp-manager/api`
// (relative URL, POST, `{ op, args }` envelope) and never touches the filesystem itself.
// Every visible string goes through the client locale service; styles use the shared
// `--dsw-*` theme tokens so light/dark and host redesigns keep working.

window.__ModuleLoader__.load({
  id: '@xiechenghua01/dsh-mcp-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const Fragment = React.Fragment
    const useCallback = React.useCallback
    const useEffect = React.useEffect
    const useMemo = React.useMemo
    const useRef = React.useRef
    const useState = React.useState

    /** Locale namespace shared by the dictionaries, the page and the Settings entry. */
    const NS = 'mcp-manager'
    /** Relative API path: no leading slash, resolved against the Settings page URL. */
    const API_PATH = 'mcp-manager/api'
    /** The live phase changes when HMR applies a patch, so keep the poll cheap and frequent. */
    const POLL_MS = 4000
    const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
    const DASH = '\u2014'

    /* ------------------------------------------------------------------ *
     * Locale dictionaries: flat key -> string, identical key sets.       *
     * Placeholders are interpolated as {name} by the locale service.     *
     * ------------------------------------------------------------------ */

    const zh = {
      'section.title': 'MCP 服务',
      'page.subtitle': '管理本机各作用域中的 MCP 服务器：新增、编辑、启停、探测，并在作用域之间复用。',
      'action.refresh': '刷新',
      'action.probeAll': '测试全部启用的',
      'action.add': '新增服务器',
      'action.cancel': '取消',
      'action.save': '保存',
      'action.close': '关闭',
      'action.delete': '删除',
      'action.edit': '编辑',
      'action.json': 'JSON',
      'action.test': '测试',
      'action.import': '导入',
      'action.export': '导出 JSON',
      'action.copy': '复制',
      'action.copied': '已复制',
      'action.retry': '重试',
      'action.addTo': '添加到…',
      'action.confirmDelete': '确认删除',
      'action.remove': '移除',
      'action.testDraft': '测试连接',
      'action.generate': '从表单生成',
      'action.parse': '解析到表单',
      'updated.at': '更新于 {time}',
      'updated.never': '尚未刷新',
      'scope.all': '全部',
      'scope.global': '全局',
      'scope.workspace': '工作区',
      'group.global': '全局（home 层）',
      'group.workspace': '工作区（当前 profile）',
      'search.placeholder': '搜索服务名称、目标或 id…',
      'row.enabled': '已启用',
      'row.disabled': '已禁用',
      'row.readOnly': '只读',
      'row.readOnlyHint': '该行无法安全改写，只能查看；请在本插件的作用域中新建一份。',
      'row.tools': '{count} 工具',
      'row.target': '目标',
      'live.active': '已加载',
      'live.inactive': '未加载',
      'live.failed': '加载失败',
      'live.unknown': '状态未知',
      'probe.never': '未测试',
      'probe.ok': '连通 · {tools} 工具 · {ms} ms',
      'probe.fail': '失败 · {message}',
      'aria.enable': '启用 {name}',
      'aria.disable': '禁用 {name}',
      'aria.edit': '编辑 {name}',
      'aria.json': '查看 {name} 的 JSON',
      'aria.test': '测试 {name}',
      'aria.delete': '删除 {name}',
      'aria.removeWorkspace': '移除工作目录 {name}',
      'empty.none': '还没有 MCP 服务器',
      'empty.noneHint': '点击「新增服务器」添加第一个 MCP 服务器。',
      'empty.filtered': '没有匹配的服务器',
      'empty.global': '全局层还没有服务器',
      'empty.workspace': '工作区还没有服务器',
      'empty.library': '服务器库还是空的；新增或导入服务器后会自动收录。',
      'warnings.title': '注意',
      'state.loading': '正在加载 MCP 服务器…',
      'state.unauthorized': '当前页面未获授权，无法读取 MCP 服务器',
      'state.error': '加载失败',
      'state.operationFailed': '操作失败',
      'state.unknownError': '未知错误',
      'state.invalidResponse': '宿主返回了无效响应',
      'state.requestFailed': '请求失败，请检查网络或宿主状态',
      'state.testing': '测试中…',
      'state.saving': '保存中…',
      'io.title': '导入 / 导出',
      'io.hint': '导出为 Claude Desktop 兼容的 mcpServers JSON；粘贴 JSON 可批量导入到指定作用域。',
      'io.placeholder': '粘贴 mcpServers JSON、服务器数组或单个服务器对象…',
      'io.level': '目标作用域',
      'io.overwrite': '覆盖同名服务器',
      'io.report': '导入完成：新增 {added}，更新 {updated}，跳过 {skipped}',
      'io.reportSkipped': '跳过：{items}',
      'io.invalidJson': 'JSON 解析失败：{message}',
      'io.importEmpty': '请先粘贴要导入的 JSON',
      'io.exported': '导出的 JSON',
      'io.copyFailed': '无法写入剪贴板，请手动复制下方 JSON',
      'library.title': '服务器库',
      'library.hint': '本机范围共享的服务器目录，可一键添加到任意作用域。',
      'library.origins': '来源',
      'library.origin.global': '全局',
      'library.origin.workspace': '工作区：{profile}',
      'library.origin.none': '未配置',
      'library.addTitle': '添加到作用域',
      'library.addName': '服务器名称（可改名）',
      'library.addHint': '名称在目标作用域中必须唯一；留空则沿用库中的名称。',
      'dialog.addTitle': '新增 MCP 服务器',
      'dialog.editTitle': '编辑 MCP 服务器',
      'dialog.jsonTitle': '服务器 JSON',
      'dialog.tab.form': '结构化',
      'dialog.tab.json': 'JSON',
      'dialog.advanced': '高级',
      'dialog.scope': '作用域',
      'dialog.scopeLocked': '作用域在创建后不可更改',
      'dialog.workspaces': '工作目录',
      'dialog.workspacesChoose': '选择工作目录',
      'dialog.workspacesCount': '已选 {count} 个目录',
      'dialog.workspacesAll': '全选',
      'dialog.workspacesClear': '清空',
      'dialog.workspacesEmpty': '暂无工作区',
      'dialog.deleteTitle': '删除 MCP 服务器',
      'dialog.deleteBody': '删除后该服务器的配置会从补丁文件中移除，相关工具立即下线。此操作不可撤销。',
      'dialog.removeTitle': '从服务器库移除',
      'dialog.removeBody': '只移除库条目；已经配置到各作用域的服务器不受影响。',
      'dialog.invalid': '请检查表单：{message}',
      'dialog.parseOk': '已解析到表单',
      'dialog.generated': '已从表单生成',
      'dialog.required': '必填',
      'dialog.testHint': '用当前表单内容发起一次实时 MCP 握手，不会保存。',
      'dialog.jsonHint': '这里是一个 mcpServers 条目的 JSON；可用「从表单生成」或「解析到表单」双向同步。',
      'dialog.jsonShape': 'JSON 中找不到服务器对象',
      'field.serverName': '服务名称 serverName',
      'field.serverNameHint': '1–32 位字母、数字、下划线或短横线',
      'field.transport': '传输方式',
      'field.command': '命令',
      'field.args': '参数（每行一个）',
      'field.env': '环境变量（每行 key=value）',
      'field.cwd': '工作目录（可选）',
      'field.url': '服务 URL',
      'field.headers': '请求头（每行 key=value）',
      'field.toolCallTimeout': '工具调用超时（毫秒，默认 60000）',
      'field.maxInstructionBytes': '服务说明最大字节数（默认 32768）',
      'field.failOnStartup': '首次连接失败时拒绝加载',
      'field.reconnectEnabled': '启用自动重连',
      'field.reconnectInitial': '首次重连延迟（毫秒，默认 500）',
      'field.reconnectMaxDelay': '重连延迟上限（毫秒，默认 30000）',
      'field.reconnectMaxAttempts': '连续失败次数上限（默认 10）',
      'field.kvHint': '每行一个 key=value，值可以包含等号',
      'notice.created': '已新增 {name}',
      'notice.updated': '已更新 {name}',
      'notice.removed': '已删除 {name}',
      'notice.enabled': '已启用 {name}',
      'notice.disabled': '已禁用 {name}',
      'notice.probeAll': '已测试 {total} 个服务器，{ok} 个连通',
      'notice.libraryAdded': '已添加 {name}',
      'notice.libraryRemoved': '已从库中移除 {name}',
    }

    const en = {
      'section.title': 'MCP servers',
      'page.subtitle': 'Manage MCP servers in every scope on this machine: add, edit, enable, probe, and reuse them across scopes.',
      'action.refresh': 'Refresh',
      'action.probeAll': 'Test all enabled',
      'action.add': 'Add server',
      'action.cancel': 'Cancel',
      'action.save': 'Save',
      'action.close': 'Close',
      'action.delete': 'Delete',
      'action.edit': 'Edit',
      'action.json': 'JSON',
      'action.test': 'Test',
      'action.import': 'Import',
      'action.export': 'Export JSON',
      'action.copy': 'Copy',
      'action.copied': 'Copied',
      'action.retry': 'Retry',
      'action.addTo': 'Add to…',
      'action.confirmDelete': 'Delete',
      'action.remove': 'Remove',
      'action.testDraft': 'Test connection',
      'action.generate': 'Generate from form',
      'action.parse': 'Parse into form',
      'updated.at': 'Updated {time}',
      'updated.never': 'Not refreshed yet',
      'scope.all': 'All',
      'scope.global': 'Global',
      'scope.workspace': 'Workspace',
      'group.global': 'Global (home layer)',
      'group.workspace': 'Workspace (current profile)',
      'search.placeholder': 'Search server name, target, or id…',
      'row.enabled': 'Enabled',
      'row.disabled': 'Disabled',
      'row.readOnly': 'Read-only',
      'row.readOnlyHint': 'This row cannot be rewritten safely and is view-only; create a copy in a scope this plugin owns.',
      'row.tools': '{count} tools',
      'row.target': 'Target',
      'live.active': 'Loaded',
      'live.inactive': 'Not loaded',
      'live.failed': 'Load failed',
      'live.unknown': 'Unknown state',
      'probe.never': 'Not tested',
      'probe.ok': 'Connected · {tools} tools · {ms} ms',
      'probe.fail': 'Failed · {message}',
      'aria.enable': 'Enable {name}',
      'aria.disable': 'Disable {name}',
      'aria.edit': 'Edit {name}',
      'aria.json': 'View the JSON of {name}',
      'aria.test': 'Test {name}',
      'aria.delete': 'Delete {name}',
      'aria.removeWorkspace': 'Remove workspace {name}',
      'empty.none': 'No MCP servers yet',
      'empty.noneHint': 'Click "Add server" to create the first MCP server.',
      'empty.filtered': 'No matching servers',
      'empty.global': 'The global layer has no servers',
      'empty.workspace': 'The workspace has no servers',
      'empty.library': 'The server library is empty; adding or importing servers fills it automatically.',
      'warnings.title': 'Warnings',
      'state.loading': 'Loading MCP servers…',
      'state.unauthorized': 'This page is not authorized to read MCP servers',
      'state.error': 'Failed to load',
      'state.operationFailed': 'Operation failed',
      'state.unknownError': 'Unknown error',
      'state.invalidResponse': 'The host returned an invalid response',
      'state.requestFailed': 'Request failed; check the network and the host',
      'state.testing': 'Testing…',
      'state.saving': 'Saving…',
      'io.title': 'Import / export',
      'io.hint': 'Export a Claude Desktop compatible mcpServers JSON; paste JSON to import a batch into one scope.',
      'io.placeholder': 'Paste mcpServers JSON, a server array, or a single server object…',
      'io.level': 'Target scope',
      'io.overwrite': 'Overwrite servers with the same name',
      'io.report': 'Import finished: added {added}, updated {updated}, skipped {skipped}',
      'io.reportSkipped': 'Skipped: {items}',
      'io.invalidJson': 'Invalid JSON: {message}',
      'io.importEmpty': 'Paste the JSON to import first',
      'io.exported': 'Exported JSON',
      'io.copyFailed': 'Could not write to the clipboard; copy the JSON below manually',
      'library.title': 'Server library',
      'library.hint': 'A machine-wide server catalog that can be added to any scope in one click.',
      'library.origins': 'Origins',
      'library.origin.global': 'Global',
      'library.origin.workspace': 'Workspace: {profile}',
      'library.origin.none': 'Not configured',
      'library.addTitle': 'Add to a scope',
      'library.addName': 'Server name (optional rename)',
      'library.addHint': 'The name must be unique in the target scope; leave it empty to keep the library name.',
      'dialog.addTitle': 'Add MCP server',
      'dialog.editTitle': 'Edit MCP server',
      'dialog.jsonTitle': 'Server JSON',
      'dialog.tab.form': 'Form',
      'dialog.tab.json': 'JSON',
      'dialog.advanced': 'Advanced',
      'dialog.scope': 'Scope',
      'dialog.scopeLocked': 'The scope cannot change after creation',
      'dialog.workspaces': 'Workspace directories',
      'dialog.workspacesChoose': 'Choose directories',
      'dialog.workspacesCount': '{count} selected',
      'dialog.workspacesAll': 'Select all',
      'dialog.workspacesClear': 'Clear',
      'dialog.workspacesEmpty': 'No workspaces yet',
      'dialog.deleteTitle': 'Delete MCP server',
      'dialog.deleteBody': 'Deleting removes this server from its patch file and takes its tools offline immediately. This cannot be undone.',
      'dialog.removeTitle': 'Remove from the server library',
      'dialog.removeBody': 'Only the catalog entry is removed; servers already configured in a scope stay untouched.',
      'dialog.invalid': 'Check the form: {message}',
      'dialog.parseOk': 'Parsed into the form',
      'dialog.generated': 'Generated from the form',
      'dialog.required': 'Required',
      'dialog.testHint': 'Runs one live MCP handshake with the current form values; nothing is saved.',
      'dialog.jsonHint': 'This is the JSON of one mcpServers entry; use "Generate from form" or "Parse into form" to sync both ways.',
      'dialog.jsonShape': 'No server object found in the JSON',
      'field.serverName': 'Server name (serverName)',
      'field.serverNameHint': '1–32 letters, digits, underscores, or hyphens',
      'field.transport': 'Transport',
      'field.command': 'Command',
      'field.args': 'Arguments (one per line)',
      'field.env': 'Environment variables (one key=value per line)',
      'field.cwd': 'Working directory (optional)',
      'field.url': 'Server URL',
      'field.headers': 'Headers (one key=value per line)',
      'field.toolCallTimeout': 'Tool call timeout (ms, default 60000)',
      'field.maxInstructionBytes': 'Max instruction bytes (default 32768)',
      'field.failOnStartup': 'Reject activation when the first connection fails',
      'field.reconnectEnabled': 'Enable auto reconnect',
      'field.reconnectInitial': 'First reconnect delay (ms, default 500)',
      'field.reconnectMaxDelay': 'Reconnect delay ceiling (ms, default 30000)',
      'field.reconnectMaxAttempts': 'Max consecutive attempts (default 10)',
      'field.kvHint': 'One key=value per line; values may contain equals signs',
      'notice.created': 'Added {name}',
      'notice.updated': 'Updated {name}',
      'notice.removed': 'Deleted {name}',
      'notice.enabled': 'Enabled {name}',
      'notice.disabled': 'Disabled {name}',
      'notice.probeAll': 'Tested {total} servers, {ok} connected',
      'notice.libraryAdded': 'Added {name}',
      'notice.libraryRemoved': 'Removed {name} from the library',
    }

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
      return String(error)
    }

    function formatTime(timestamp) {
      try {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      } catch (error) {
        return DASH
      }
    }

    function linesOf(text) {
      const result = []
      const parts = textOf(text).split(/\r?\n/u)
      for (const part of parts) {
        const line = part.trim()
        if (line !== '') result.push(line)
      }
      return result
    }

    function mapToLines(map) {
      if (map === null || typeof map !== 'object') return ''
      const lines = []
      for (const key of Object.keys(map)) lines.push(key + '=' + textOf(map[key]))
      return lines.join('\n')
    }

    function parseKeyValueLines(text, errors, field) {
      const result = {}
      const parts = textOf(text).split(/\r?\n/u)
      for (const part of parts) {
        const line = part.trim()
        if (line === '' || line.startsWith('#')) continue
        const separator = line.indexOf('=')
        if (separator <= 0) {
          errors.push(field)
          continue
        }
        const key = line.slice(0, separator).trim()
        const value = line.slice(separator + 1).trim()
        if (key === '') {
          errors.push(field)
          continue
        }
        result[key] = value
      }
      return result
    }

    function numberText(value) {
      if (typeof value === 'number' && Number.isFinite(value)) return String(value)
      return ''
    }

    function parsePositiveInt(text, errors, field) {
      const raw = textOf(text).trim()
      if (raw === '') return null
      const value = Number(raw)
      if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
        errors.push(field)
        return null
      }
      return value
    }

    function transportOf(config) {
      if (config === null || typeof config !== 'object') return 'stdio'
      if (config.transport === 'streamable-http') return 'streamable-http'
      if (config.transport === 'stdio') return 'stdio'
      if (textOf(config.url) !== '') return 'streamable-http'
      return 'stdio'
    }

    /** One-line display target for a stored config (same idea as the host's `target`). */
    function targetOfConfig(config) {
      if (config === null || typeof config !== 'object') return DASH
      const command = textOf(config.command)
      const url = textOf(config.url)
      if (command === '') return url !== '' ? url : DASH
      const args = Array.isArray(config.args) ? config.args.map((entry) => textOf(entry)).filter((entry) => entry !== '') : []
      return [command].concat(args).join(' ')
    }

    /** One editable draft row; every value is a string or a boolean. */
    function blankDraft(level) {
      return {
        level: level,
        serverName: '',
        transport: 'stdio',
        command: '',
        argsText: '',
        envText: '',
        cwd: '',
        url: '',
        headersText: '',
        toolCallTimeoutMs: '',
        maxInstructionBytes: '',
        failOnStartupError: false,
        reconnectEnabled: true,
        reconnectInitialDelayMs: '',
        reconnectMaxDelayMs: '',
        reconnectMaxAttempts: '',
        workspaces: [],
      }
    }

    /** `config` (wire shape) or one `mcpServers` entry -> draft fields. */
    function configToDraft(config, level, workspaces) {
      const source = config !== null && typeof config === 'object' ? config : {}
      const reconnect = source.reconnect !== null && typeof source.reconnect === 'object' ? source.reconnect : {}
      const declared = textOf(source.transport !== undefined ? source.transport : source.type).toLowerCase()
      let transport = 'stdio'
      if (declared === 'streamable-http' || declared === 'http') transport = 'streamable-http'
      else if (declared === 'stdio') transport = 'stdio'
      else if (textOf(source.url) !== '') transport = 'streamable-http'
      const draft = blankDraft(level)
      draft.serverName = textOf(source.serverName !== undefined ? source.serverName : source.name)
      draft.transport = transport
      draft.command = textOf(source.command)
      draft.argsText = Array.isArray(source.args) ? source.args.map((entry) => textOf(entry)).join('\n') : ''
      draft.envText = mapToLines(source.env)
      draft.cwd = textOf(source.cwd)
      draft.url = textOf(source.url)
      draft.headersText = mapToLines(source.headers)
      draft.toolCallTimeoutMs = numberText(source.toolCallTimeoutMs)
      draft.maxInstructionBytes = numberText(source.maxInstructionBytes)
      draft.failOnStartupError = source.failOnStartupError === true
      draft.reconnectEnabled = reconnect.enabled !== false
      draft.reconnectInitialDelayMs = numberText(reconnect.initialDelayMs)
      draft.reconnectMaxDelayMs = numberText(reconnect.maxDelayMs)
      draft.reconnectMaxAttempts = numberText(reconnect.maxAttempts)
      draft.workspaces = Array.isArray(workspaces)
        ? workspaces.map((entry) => textOf(entry)).filter((entry) => entry !== '')
        : []
      return draft
    }

    /** Draft fields -> wire `config`; `errors` lists the offending field keys. */
    function draftToConfig(draft) {
      const errors = []
      const config = {}
      const serverName = textOf(draft.serverName).trim()
      if (serverName === '' || !SERVER_NAME_PATTERN.test(serverName)) errors.push('serverName')
      else config.serverName = serverName
      config.transport = draft.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
      if (config.transport === 'stdio') {
        const command = textOf(draft.command).trim()
        if (command === '') errors.push('command')
        else config.command = command
        const args = linesOf(draft.argsText)
        if (args.length > 0) config.args = args
        const env = parseKeyValueLines(draft.envText, errors, 'env')
        if (Object.keys(env).length > 0) config.env = env
        const cwd = textOf(draft.cwd).trim()
        if (cwd !== '') config.cwd = cwd
      } else {
        const url = textOf(draft.url).trim()
        if (url === '' || !/^https?:\/\//iu.test(url)) errors.push('url')
        else config.url = url
        const headers = parseKeyValueLines(draft.headersText, errors, 'headers')
        if (Object.keys(headers).length > 0) config.headers = headers
      }
      const timeout = parsePositiveInt(draft.toolCallTimeoutMs, errors, 'toolCallTimeoutMs')
      if (timeout !== null) config.toolCallTimeoutMs = timeout
      const instructionBytes = parsePositiveInt(draft.maxInstructionBytes, errors, 'maxInstructionBytes')
      if (instructionBytes !== null) config.maxInstructionBytes = instructionBytes
      if (draft.failOnStartupError === true) config.failOnStartupError = true
      const reconnect = { enabled: draft.reconnectEnabled !== false }
      const initial = parsePositiveInt(draft.reconnectInitialDelayMs, errors, 'reconnectInitialDelayMs')
      if (initial !== null) reconnect.initialDelayMs = initial
      const maxDelay = parsePositiveInt(draft.reconnectMaxDelayMs, errors, 'reconnectMaxDelayMs')
      if (maxDelay !== null) reconnect.maxDelayMs = maxDelay
      const maxAttempts = parsePositiveInt(draft.reconnectMaxAttempts, errors, 'reconnectMaxAttempts')
      if (maxAttempts !== null) reconnect.maxAttempts = maxAttempts
      config.reconnect = reconnect
      return { config: config, errors: errors }
    }

    /** Pick the first server object out of any accepted import shape (§7). */
    function pickServerObject(value) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          const picked = pickServerObject(entry)
          if (picked !== null) return picked
        }
        return null
      }
      if (value === null || typeof value !== 'object') return null
      if (value.mcpServers !== undefined && value.mcpServers !== null) {
        const servers = value.mcpServers
        if (Array.isArray(servers)) return servers.length > 0 ? pickServerObject(servers[0]) : null
        if (typeof servers === 'object') {
          const names = Object.keys(servers)
          for (const name of names) {
            const entry = servers[name]
            if (entry === null || typeof entry !== 'object') continue
            const copy = Object.assign({}, entry)
            if (textOf(copy.serverName) === '' && textOf(copy.name) === '') copy.serverName = name
            return copy
          }
        }
        return null
      }
      if (Array.isArray(value.servers)) return value.servers.length > 0 ? pickServerObject(value.servers[0]) : null
      if (typeof value.serverName === 'string' || typeof value.name === 'string') return value
      if (typeof value.command === 'string' || typeof value.url === 'string') return value
      return null
    }

    function probeSummary(t, result) {
      if (result === null || result === undefined) return t('probe.never')
      if (result.ok === true) {
        const count = typeof result.toolCount === 'number' && Number.isFinite(result.toolCount) ? result.toolCount : 0
        const duration = typeof result.durationMs === 'number' && Number.isFinite(result.durationMs) ? Math.round(result.durationMs) : 0
        return t('probe.ok', { tools: count, ms: duration })
      }
      let message = t('state.unknownError')
      if (result.error !== null && result.error !== undefined && typeof result.error.message === 'string' && result.error.message !== '') message = result.error.message
      return t('probe.fail', { message: message })
    }

    function liveLabel(t, live) {
      if (live === null || live === undefined) return t('live.unknown')
      if (live.phase === 'active') return t('live.active')
      if (live.phase === 'failed') return t('live.failed')
      return t('live.inactive')
    }

    function liveTone(live) {
      if (live === null || live === undefined) return ''
      if (live.phase === 'active') return 'ok'
      if (live.phase === 'failed') return 'err'
      return ''
    }

    function originLabel(t, origin, profile) {
      if (origin === 'global') return t('library.origin.global')
      const prefix = 'workspace:'
      if (typeof origin === 'string' && origin.startsWith(prefix)) {
        return t('library.origin.workspace', { profile: origin.slice(prefix.length) })
      }
      return textOf(origin)
    }

    /** Last path segment, used when a workspace has no title. */
    function lastPathSegment(path) {
      const target = textOf(path)
      const parts = target.split(/[\\/]+/u).filter((part) => part !== '')
      return parts.length > 0 ? parts[parts.length - 1] : target
    }

    /** Display label for one workspace path: its title when known, else the last path segment. */
    function workspaceLabel(workspaces, path) {
      const target = textOf(path)
      const list = Array.isArray(workspaces) ? workspaces : []
      for (const entry of list) {
        if (entry === null || typeof entry !== 'object') continue
        if (textOf(entry.path) !== target) continue
        const title = textOf(entry.title)
        return title !== '' ? title : lastPathSegment(target)
      }
      return lastPathSegment(target)
    }

    async function copyText(text) {
      try {
        if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined && navigator.clipboard !== null && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch (error) {
        /* fall through: the caller shows the JSON for manual copying */
      }
      return false
    }

    /* ------------------------------------------------------------------ *
     * HTTP API.                                                          *
     * ------------------------------------------------------------------ */

    /** Render a failure for the UI: transport/protocol failures get a localized message. */
    function describeError(t, error) {
      if (error !== null && error !== undefined) {
        if (error.code === 'invalid') return t('state.invalidResponse')
        if (error.code === 'transport') return t('state.requestFailed')
      }
      return messageOf(error)
    }

    async function callApi(op, args) {
      let response
      try {
        response = await fetch(API_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ op: op, args: args !== undefined && args !== null ? args : {} }),
        })
      } catch (failure) {
        const transport = new Error(messageOf(failure))
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
        invalid.code = 'invalid'
        throw invalid
      }
      if (payload === null || typeof payload !== 'object') {
        const invalid = new Error('invalid response from the host')
        invalid.code = 'invalid'
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
     * Presentation primitives.                                           *
     * ------------------------------------------------------------------ */

    function Button(props) {
      const className = 'mm-btn' + (props.variant !== undefined && props.variant !== '' ? ' mm-btn-' + props.variant : '')
      return h(
        'button',
        {
          type: 'button',
          className: className,
          disabled: props.disabled === true,
          onClick: props.onClick,
          'aria-label': props.ariaLabel,
          title: props.title,
        },
        props.children,
      )
    }

    function Chip(props) {
      const className = 'mm-chip' + (props.tone !== undefined && props.tone !== '' ? ' mm-chip-' + props.tone : '')
      return h('span', { className: className, title: props.title }, props.children)
    }

    function Switch(props) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': props.checked === true ? 'true' : 'false',
          'aria-label': props.label,
          className: 'mm-switch' + (props.checked === true ? ' mm-switch-on' : ''),
          disabled: props.disabled === true,
          onClick: props.onClick,
        },
        h('span', { className: 'mm-switch-thumb' }),
      )
    }

    function Field(props) {
      return h(
        'label',
        { className: 'mm-field' },
        h('span', { className: 'mm-field-label' }, props.label),
        props.children,
        props.hint !== undefined && props.hint !== null ? h('span', { className: 'mm-field-hint' }, props.hint) : null,
      )
    }

    function TextInput(props) {
      return h('input', {
        type: 'text',
        className: 'mm-input',
        value: props.value,
        placeholder: props.placeholder,
        disabled: props.disabled === true,
        spellCheck: false,
        onChange: (event) => {
          if (typeof props.onChange === 'function') props.onChange(event.target.value)
        },
      })
    }

    function TextArea(props) {
      return h('textarea', {
        className: 'mm-input mm-textarea' + (props.mono === true ? ' mm-mono' : ''),
        value: props.value,
        placeholder: props.placeholder,
        disabled: props.disabled === true,
        rows: props.rows !== undefined ? props.rows : 4,
        spellCheck: false,
        onChange: (event) => {
          if (typeof props.onChange === 'function') props.onChange(event.target.value)
        },
      })
    }

    function Select(props) {
      return h(
        'select',
        {
          className: 'mm-input',
          value: props.value,
          disabled: props.disabled === true,
          onChange: (event) => {
            if (typeof props.onChange === 'function') props.onChange(event.target.value)
          },
        },
        props.options.map((option) => h('option', { key: option.value, value: option.value }, option.label)),
      )
    }

    function Checkbox(props) {
      return h(
        'label',
        { className: 'mm-check' },
        h('input', {
          type: 'checkbox',
          checked: props.checked === true,
          disabled: props.disabled === true,
          onChange: (event) => {
            if (typeof props.onChange === 'function') props.onChange(event.target.checked)
          },
        }),
        h('span', { title: props.title }, props.label),
      )
    }

    /**
     * Multi-select for the workspace-directory attachment. The list comes from `state.workspaces`
     * (`[{ id, path, title }]`); the value is an array of absolute paths kept in the draft.
     */
    function WorkspacePicker(props) {
      const t = props.t
      const workspaces = Array.isArray(props.workspaces) ? props.workspaces : []
      const selected = Array.isArray(props.value) ? props.value : []
      const [open, setOpen] = useState(false)
      const rootRef = useRef(null)
      useEffect(() => {
        if (open !== true) return undefined
        const onMouseDown = (event) => {
          const node = rootRef.current
          if (node !== null && typeof node.contains === 'function' && !node.contains(event.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onMouseDown)
        return () => {
          document.removeEventListener('mousedown', onMouseDown)
        }
      }, [open])
      const change = (next) => {
        if (typeof props.onChange === 'function') props.onChange(next)
      }
      const toggle = (path, checked) => {
        if (path === '') return
        if (checked === true) change(selected.includes(path) ? selected : selected.concat([path]))
        else change(selected.filter((entry) => entry !== path))
      }
      return h(
        'div',
        { className: 'mm-ws', ref: rootRef },
        h('span', { className: 'mm-ws-label' }, t('dialog.workspaces')),
        h(
          Button,
          { onClick: () => setOpen((previous) => !previous) },
          selected.length === 0 ? t('dialog.workspacesChoose') : t('dialog.workspacesCount', { count: selected.length }),
        ),
        open === true
          ? h(
            'div',
            { className: 'mm-ws-pop', role: 'group', 'aria-label': t('dialog.workspaces') },
            workspaces.length === 0
              ? h('p', { className: 'mm-ws-empty' }, t('dialog.workspacesEmpty'))
              : h(
                Fragment,
                null,
                h(
                  'div',
                  { className: 'mm-ws-actions' },
                  h(Button, {
                    onClick: () => change(workspaces.map((entry) => textOf(entry !== null && entry !== undefined ? entry.path : '')).filter((entry) => entry !== '')),
                  }, t('dialog.workspacesAll')),
                  h(Button, { onClick: () => change([]) }, t('dialog.workspacesClear')),
                ),
                h(
                  'div',
                  { className: 'mm-ws-list' },
                  workspaces.map((entry, index) => {
                    const path = textOf(entry !== null && entry !== undefined ? entry.path : '')
                    return h(Checkbox, {
                      key: path !== '' ? path : 'workspace-' + index,
                      checked: selected.includes(path),
                      label: workspaceLabel(workspaces, path),
                      title: path,
                      onChange: (checked) => toggle(path, checked),
                    })
                  }),
                ),
              ),
          )
          : null,
        selected.length > 0
          ? h(
            'div',
            { className: 'mm-ws-chips' },
            selected.map((path) => h(
              'span',
              { key: path, className: 'mm-chip mm-ws-chip', title: path },
              workspaceLabel(workspaces, path),
              h('button', {
                type: 'button',
                className: 'mm-ws-chip-x',
                'aria-label': t('aria.removeWorkspace', { name: workspaceLabel(workspaces, path) }),
                onClick: () => toggle(path, false),
              }, '×'),
            )),
          )
          : null,
      )
    }

    function Notice(props) {
      const notice = props.notice
      if (notice === null || notice === undefined) return null
      return h(
        'div',
        {
          className: 'mm-notice mm-notice-' + (notice.kind !== undefined ? notice.kind : 'info'),
          role: notice.kind === 'err' ? 'alert' : 'status',
          'aria-live': 'polite',
        },
        h('span', { className: 'mm-notice-text' }, notice.text),
        typeof props.onDismiss === 'function'
          ? h('button', { type: 'button', className: 'mm-icon-btn', 'aria-label': props.dismissLabel, onClick: props.onDismiss }, '\u00d7')
          : null,
      )
    }

    function StatePanel(props) {
      return h(
        'div',
        { className: 'mm-state', role: props.role },
        h('p', { className: 'mm-state-title' }, props.title),
        props.hint !== undefined && props.hint !== null ? h('p', { className: 'mm-state-hint' }, props.hint) : null,
        props.actionLabel !== undefined && props.actionLabel !== null
          ? h(Button, { onClick: props.onAction }, props.actionLabel)
          : null,
      )
    }

    function EmptyState(props) {
      return h(
        'div',
        { className: 'mm-empty' },
        h('strong', null, props.title),
        props.hint !== undefined && props.hint !== null ? h('span', null, props.hint) : null,
      )
    }

    function Dialog(props) {
      const boxRef = useRef(null)
      const onCloseRef = useRef(props.onClose)
      onCloseRef.current = props.onClose
      useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            const close = onCloseRef.current
            if (typeof close === 'function') close()
          }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [])
      useEffect(() => {
        const node = boxRef.current
        if (node !== null && typeof node.querySelector === 'function') {
          const focusable = node.querySelector('input, select, textarea, button')
          if (focusable !== null && typeof focusable.focus === 'function') {
            try {
              focusable.focus()
            } catch (error) {
              /* focus is best-effort */
            }
          }
        }
        const returnFocus = props.returnFocus
        return () => {
          if (returnFocus !== null && returnFocus !== undefined && typeof returnFocus.focus === 'function') {
            try {
              returnFocus.focus()
            } catch (error) {
              /* the invoking element may be gone */
            }
          }
        }
      }, [props.returnFocus])
      return h(
        'div',
        {
          className: 'mm-backdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) {
              const close = onCloseRef.current
              if (typeof close === 'function') close()
            }
          },
        },
        h(
          'div',
          {
            className: 'mm-dialog' + (props.wide === true ? ' mm-dialog-wide' : ''),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            ref: boxRef,
          },
          h(
            'div',
            { className: 'mm-dialog-head' },
            h('h2', { className: 'mm-dialog-title' }, props.title),
            h('button', { type: 'button', className: 'mm-icon-btn', 'aria-label': props.closeLabel, onClick: props.onClose }, '\u00d7'),
          ),
          h('div', { className: 'mm-dialog-body' }, props.children),
          props.footer !== undefined && props.footer !== null ? h('div', { className: 'mm-dialog-foot' }, props.footer) : null,
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * Row card.                                                          *
     * ------------------------------------------------------------------ */

    function RowCard(props) {
      const t = props.t
      const row = props.row
      const live = row.live !== undefined ? row.live : null
      const readOnly = row.readOnly === true
      const enabled = row.disabled !== true
      const toolCount = typeof row.toolCount === 'number' && Number.isFinite(row.toolCount) ? row.toolCount : null
      const meta = []
      meta.push(h(Chip, { key: 'enabled', tone: enabled ? 'ok' : '' }, enabled ? t('row.enabled') : t('row.disabled')))
      meta.push(h(Chip, { key: 'live', tone: liveTone(live) }, liveLabel(t, live)))
      if (live !== null && live !== undefined && live.phase === 'active' && toolCount !== null) {
        meta.push(h('span', { key: 'tools', className: 'mm-muted' }, t('row.tools', { count: toolCount })))
      }
      if (readOnly === true) meta.push(h(Chip, { key: 'ro', tone: '' }, t('row.readOnly')))
      const rowWorkspaces = Array.isArray(row.workspaces) ? row.workspaces.filter((path) => textOf(path) !== '') : []
      return h(
        'article',
        { className: 'mm-card' + (enabled ? '' : ' mm-card-off') },
        h(
          'div',
          { className: 'mm-card-head' },
          h('span', { className: 'mm-card-name' }, row.serverName),
          h(Chip, { tone: 'brand' }, textOf(row.transport) !== '' ? row.transport : transportOf(row.config)),
          h(Chip, { tone: '' }, row.level === 'global' ? t('scope.global') : t('scope.workspace')),
          h('span', { className: 'mm-spacer' }),
          h(Switch, {
            checked: enabled,
            disabled: readOnly === true || props.busy === true,
            label: enabled ? t('aria.disable', { name: row.serverName }) : t('aria.enable', { name: row.serverName }),
            onClick: () => {
              if (typeof props.onToggle === 'function') props.onToggle(row)
            },
          }),
        ),
        h(
          'div',
          { className: 'mm-card-meta' },
          meta,
        ),
        h('div', { className: 'mm-target', 'aria-label': t('row.target') }, textOf(row.target) !== '' ? row.target : DASH),
        rowWorkspaces.length > 0
          ? h(
            'div',
            { className: 'mm-card-ws' },
            rowWorkspaces.map((path) => h(
              Chip,
              { key: path, title: path },
              workspaceLabel(props.workspaces, path),
            )),
          )
          : null,
        readOnly === true ? h('p', { className: 'mm-hint' }, t('row.readOnlyHint')) : null,
        h('div', { className: 'mm-card-probe' }, probeSummary(t, row.lastProbe)),
        h(
          'div',
          { className: 'mm-row-actions' },
          h(Button, {
            disabled: readOnly === true || props.busy === true,
            ariaLabel: t('aria.edit', { name: row.serverName }),
            onClick: (event) => {
              if (typeof props.onEdit === 'function') props.onEdit(row, event)
            },
          }, t('action.edit')),
          h(Button, {
            ariaLabel: t('aria.json', { name: row.serverName }),
            onClick: (event) => {
              if (typeof props.onJson === 'function') props.onJson(row, event)
            },
          }, t('action.json')),
          h(Button, {
            disabled: props.busy === true,
            ariaLabel: t('aria.test', { name: row.serverName }),
            onClick: () => {
              if (typeof props.onTest === 'function') props.onTest(row)
            },
          }, t('action.test')),
          h(Button, {
            variant: 'danger',
            disabled: readOnly === true || props.busy === true,
            ariaLabel: t('aria.delete', { name: row.serverName }),
            onClick: (event) => {
              if (typeof props.onDelete === 'function') props.onDelete(row, event)
            },
          }, t('action.delete')),
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * JSON viewer dialog.                                                *
     * ------------------------------------------------------------------ */

    function JsonDialog(props) {
      const t = props.t
      const text = useMemo(() => {
        const config = props.row.config !== null && props.row.config !== undefined ? props.row.config : {}
        try {
          return JSON.stringify(config, null, 2)
        } catch (error) {
          return String(config)
        }
      }, [props.row])
      return h(
        Dialog,
        { title: t('dialog.jsonTitle') + ' · ' + props.row.serverName, closeLabel: t('action.close'), onClose: props.onClose, returnFocus: props.returnFocus, wide: true },
        h('pre', { className: 'mm-code' }, text),
        h(
          'div',
          { className: 'mm-inline' },
          h(Button, {
            onClick: async () => {
              const copied = await copyText(text)
              if (typeof props.onCopied === 'function') props.onCopied(copied)
            },
          }, t('action.copy')),
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * Editor dialog: structured form plus a JSON view.                   *
     * ------------------------------------------------------------------ */

    function EditorDialog(props) {
      const t = props.t
      const editing = props.mode === 'edit'
      const [draft, setDraft] = useState(() => {
        if (editing) return configToDraft(props.row.config, props.row.level, props.row.workspaces)
        return blankDraft(props.level)
      })
      const [tab, setTab] = useState('form')
      const [jsonText, setJsonText] = useState('')
      const [jsonNotice, setJsonNotice] = useState(null)
      const [error, setError] = useState('')
      const [testResult, setTestResult] = useState(null)
      const [testing, setTesting] = useState(false)

      const setField = (key, value) => {
        setDraft((previous) => {
          const next = Object.assign({}, previous)
          next[key] = value
          return next
        })
      }

      const scopeOptions = [
        { value: 'workspace', label: t('scope.workspace') },
        { value: 'global', label: t('scope.global') },
      ]

      const validate = () => {
        const parsed = draftToConfig(draft)
        if (parsed.errors.length > 0) {
          setError(t('dialog.invalid', { message: parsed.errors.join(', ') }))
          return null
        }
        setError('')
        return parsed.config
      }

      const generateJson = () => {
        const config = validate()
        if (config === null) return
        try {
          setJsonText(JSON.stringify(config, null, 2))
          setJsonNotice({ kind: 'ok', text: t('dialog.generated') })
        } catch (failure) {
          setJsonNotice({ kind: 'err', text: messageOf(failure) })
        }
      }

      const parseJson = () => {
        let parsed = null
        try {
          parsed = JSON.parse(jsonText)
        } catch (failure) {
          setJsonNotice({ kind: 'err', text: t('io.invalidJson', { message: messageOf(failure) }) })
          return
        }
        const candidate = pickServerObject(parsed)
        if (candidate === null) {
          setJsonNotice({ kind: 'err', text: t('dialog.jsonShape') })
          return
        }
        const next = configToDraft(candidate, draft.level, draft.workspaces)
        setDraft(next)
        setJsonNotice({ kind: 'ok', text: t('dialog.parseOk') })
        setError('')
      }

      const testDraft = async () => {
        const config = validate()
        if (config === null) return
        setTesting(true)
        try {
          const payload = await callApi('probe', { config: config })
          setTestResult(payload.result !== undefined ? payload.result : null)
        } catch (failure) {
          setTestResult({ ok: false, error: { message: failure.code === 'unauthorized' ? t('state.unauthorized') : describeError(t, failure) } })
        } finally {
          setTesting(false)
        }
      }

      const submit = async () => {
        const config = validate()
        if (config === null) return
        if (typeof props.onSubmit !== 'function') return
        const workspaces = draft.level === 'workspace' && Array.isArray(draft.workspaces) ? draft.workspaces : []
        const result = await props.onSubmit({ level: draft.level, config: config, workspaces: workspaces })
        if (result !== null && result !== undefined && result.ok === false) {
          setError(t('state.operationFailed') + ': ' + result.error)
        }
      }

      const formBody = h(
        Fragment,
        null,
        h(
          'div',
          { className: 'mm-grid2' },
          h(
            Field,
            {
              label: h('span', null, t('field.serverName'), h('span', { className: 'mm-required', 'aria-label': t('dialog.required') }, '*')),
              hint: t('field.serverNameHint'),
            },
            h(TextInput, { value: draft.serverName, onChange: (value) => setField('serverName', value) }),
          ),
          h(
            Field,
            { label: t('field.transport') },
            h(Select, {
              value: draft.transport,
              options: [
                { value: 'stdio', label: 'stdio' },
                { value: 'streamable-http', label: 'streamable-http' },
              ],
              onChange: (value) => setField('transport', value),
            }),
          ),
        ),
        draft.transport === 'stdio'
          ? h(
            Fragment,
            null,
            h(
              Field,
              { label: t('field.command') },
              h(TextInput, { value: draft.command, onChange: (value) => setField('command', value) }),
            ),
            h(
              Field,
              { label: t('field.args') },
              h(TextArea, { value: draft.argsText, rows: 3, mono: true, onChange: (value) => setField('argsText', value) }),
            ),
            h(
              Field,
              { label: t('field.env'), hint: t('field.kvHint') },
              h(TextArea, { value: draft.envText, rows: 3, mono: true, onChange: (value) => setField('envText', value) }),
            ),
            h(
              Field,
              { label: t('field.cwd') },
              h(TextInput, { value: draft.cwd, onChange: (value) => setField('cwd', value) }),
            ),
          )
          : h(
            Fragment,
            null,
            h(
              Field,
              { label: t('field.url') },
              h(TextInput, { value: draft.url, onChange: (value) => setField('url', value) }),
            ),
            h(
              Field,
              { label: t('field.headers'), hint: t('field.kvHint') },
              h(TextArea, { value: draft.headersText, rows: 3, mono: true, onChange: (value) => setField('headersText', value) }),
            ),
          ),
        h(
          'details',
          { className: 'mm-advanced' },
          h('summary', null, t('dialog.advanced')),
          h(
            'div',
            { className: 'mm-advanced-body' },
            h(
              'div',
              { className: 'mm-grid2' },
              h(
                Field,
                { label: t('field.toolCallTimeout') },
                h(TextInput, { value: draft.toolCallTimeoutMs, onChange: (value) => setField('toolCallTimeoutMs', value) }),
              ),
              h(
                Field,
                { label: t('field.maxInstructionBytes') },
                h(TextInput, { value: draft.maxInstructionBytes, onChange: (value) => setField('maxInstructionBytes', value) }),
              ),
            ),
            h(Checkbox, {
              checked: draft.failOnStartupError,
              label: t('field.failOnStartup'),
              onChange: (value) => setField('failOnStartupError', value),
            }),
            h(Checkbox, {
              checked: draft.reconnectEnabled,
              label: t('field.reconnectEnabled'),
              onChange: (value) => setField('reconnectEnabled', value),
            }),
            h(
              'div',
              { className: 'mm-grid2' },
              h(
                Field,
                { label: t('field.reconnectInitial') },
                h(TextInput, {
                  value: draft.reconnectInitialDelayMs,
                  disabled: draft.reconnectEnabled !== true,
                  onChange: (value) => setField('reconnectInitialDelayMs', value),
                }),
              ),
              h(
                Field,
                { label: t('field.reconnectMaxDelay') },
                h(TextInput, {
                  value: draft.reconnectMaxDelayMs,
                  disabled: draft.reconnectEnabled !== true,
                  onChange: (value) => setField('reconnectMaxDelayMs', value),
                }),
              ),
            ),
            h(
              Field,
              { label: t('field.reconnectMaxAttempts') },
              h(TextInput, {
                value: draft.reconnectMaxAttempts,
                disabled: draft.reconnectEnabled !== true,
                onChange: (value) => setField('reconnectMaxAttempts', value),
              }),
            ),
          ),
        ),
        h('p', { className: 'mm-hint' }, t('dialog.testHint')),
        testResult !== null ? h('p', { className: 'mm-test-result' }, probeSummary(t, testResult)) : null,
      )

      const jsonBody = h(
        Fragment,
        null,
        h(TextArea, {
          value: jsonText,
          rows: 12,
          mono: true,
          placeholder: t('dialog.jsonHint'),
          onChange: (value) => {
            setJsonText(value)
            setJsonNotice(null)
          },
        }),
        h(
          'div',
          { className: 'mm-inline' },
          h(Button, { onClick: generateJson }, t('action.generate')),
          h(Button, { onClick: parseJson, disabled: jsonText.trim() === '' }, t('action.parse')),
        ),
        h(Notice, { notice: jsonNotice }),
      )

      const topRow = h(
        'div',
        { className: 'mm-dialog-top' },
        h(
          'div',
          { className: 'mm-tabs', role: 'tablist' },
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              'aria-selected': tab === 'form' ? 'true' : 'false',
              className: 'mm-tab' + (tab === 'form' ? ' mm-tab-active' : ''),
              onClick: () => setTab('form'),
            },
            t('dialog.tab.form'),
          ),
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              'aria-selected': tab === 'json' ? 'true' : 'false',
              className: 'mm-tab' + (tab === 'json' ? ' mm-tab-active' : ''),
              onClick: () => setTab('json'),
            },
            t('dialog.tab.json'),
          ),
        ),
        h(
          'div',
          { className: 'mm-top-right' },
          h(
            'div',
            {
              className: 'mm-scope',
              role: 'group',
              'aria-label': t('dialog.scope'),
              title: editing ? t('dialog.scopeLocked') : undefined,
            },
            h('span', { className: 'mm-scope-label' }, t('dialog.scope')),
            h(
              'div',
              { className: 'mm-seg' },
              scopeOptions.map((option) => h(
                'button',
                {
                  key: option.value,
                  type: 'button',
                  className: 'mm-seg-btn' + (draft.level === option.value ? ' mm-seg-btn-active' : ''),
                  'aria-pressed': draft.level === option.value ? 'true' : 'false',
                  disabled: editing,
                  onClick: () => setField('level', option.value),
                },
                option.label,
              )),
            ),
          ),
          draft.level === 'workspace'
            ? h(WorkspacePicker, {
              t: t,
              workspaces: props.workspaces,
              value: draft.workspaces,
              onChange: (value) => setField('workspaces', value),
            })
            : null,
        ),
      )

      return h(
        Dialog,
        {
          title: editing ? t('dialog.editTitle') : t('dialog.addTitle'),
          closeLabel: t('action.close'),
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          wide: true,
          footer: h(
            Fragment,
            null,
            h(
              'div',
              { className: 'mm-foot-left' },
              h(Button, { onClick: testDraft, disabled: testing === true || props.busy === true }, testing === true ? t('state.testing') : t('action.testDraft')),
            ),
            h(Button, { onClick: props.onClose }, t('action.cancel')),
            h(Button, { variant: 'primary', onClick: submit, disabled: props.busy === true }, props.busy === true ? t('state.saving') : t('action.save')),
          ),
        },
        topRow,
        tab === 'form' ? formBody : jsonBody,
        error !== '' ? h('p', { className: 'mm-err-text', role: 'alert' }, error) : null,
      )
    }

    /* ------------------------------------------------------------------ *
     * Add-to-scope dialog for a library entry.                           *
     * ------------------------------------------------------------------ */

    function LibraryAddDialog(props) {
      const t = props.t
      const [level, setLevel] = useState('workspace')
      const [name, setName] = useState(props.entry.serverName)
      return h(
        Dialog,
        {
          title: t('library.addTitle'),
          closeLabel: t('action.close'),
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          footer: h(
            Fragment,
            null,
            h(Button, { onClick: props.onClose }, t('action.cancel')),
            h(Button, { variant: 'primary', onClick: () => props.onSubmit({ level: level, serverName: name }) }, t('action.add')),
          ),
        },
        h(
          'div',
          { className: 'mm-grid2' },
          h(
            Field,
            { label: t('io.level') },
            h(Select, {
              value: level,
              options: [
                { value: 'workspace', label: t('scope.workspace') },
                { value: 'global', label: t('scope.global') },
              ],
              onChange: setLevel,
            }),
          ),
          h(
            Field,
            { label: t('library.addName') },
            h(TextInput, { value: name, onChange: setName }),
          ),
        ),
        h('p', { className: 'mm-hint' }, t('library.addHint')),
        h('p', { className: 'mm-muted' }, t('row.target') + ': ' + targetOfConfig(props.entry.config)),
      )
    }

    /* ------------------------------------------------------------------ *
     * Import / export section.                                           *
     * ------------------------------------------------------------------ */

    function ImportExportSection(props) {
      const t = props.t
      const [text, setText] = useState('')
      const [level, setLevel] = useState('workspace')
      const [overwrite, setOverwrite] = useState(false)
      const [exported, setExported] = useState('')
      const [notice, setNotice] = useState(null)
      const [busy, setBusy] = useState(false)

      const exportJson = async () => {
        setBusy(true)
        try {
          const payload = await callApi('export', { format: 'mcpServers' })
          const json = textOf(payload.json)
          setExported(json)
          const copied = await copyText(json)
          setNotice(copied ? { kind: 'ok', text: t('action.copied') } : { kind: 'warn', text: t('io.copyFailed') })
        } catch (failure) {
          if (failure.code === 'unauthorized') setNotice({ kind: 'err', text: t('state.unauthorized') })
          else setNotice({ kind: 'err', text: t('state.operationFailed') + ': ' + describeError(t, failure) })
        } finally {
          setBusy(false)
        }
      }

      const importJson = async () => {
        const trimmed = text.trim()
        if (trimmed === '') {
          setNotice({ kind: 'err', text: t('io.importEmpty') })
          return
        }
        try {
          JSON.parse(trimmed)
        } catch (failure) {
          setNotice({ kind: 'err', text: t('io.invalidJson', { message: messageOf(failure) }) })
          return
        }
        setBusy(true)
        try {
          const payload = await callApi('import', { level: level, json: trimmed, overwrite: overwrite === true })
          const added = Array.isArray(payload.added) ? payload.added : []
          const updated = Array.isArray(payload.updated) ? payload.updated : []
          const skipped = Array.isArray(payload.skipped) ? payload.skipped : []
          let report = t('io.report', { added: added.length, updated: updated.length, skipped: skipped.length })
          if (skipped.length > 0) {
            const items = skipped.map((entry) => {
              const name = entry !== null && entry !== undefined && typeof entry.serverName === 'string' ? entry.serverName : DASH
              const reason = entry !== null && entry !== undefined && typeof entry.reason === 'string' ? entry.reason : DASH
              return name + ' (' + reason + ')'
            })
            report = report + ' · ' + t('io.reportSkipped', { items: items.join(', ') })
          }
          setNotice({ kind: skipped.length > 0 ? 'warn' : 'ok', text: report })
          setText('')
          if (typeof props.onImported === 'function') props.onImported()
        } catch (failure) {
          if (failure.code === 'unauthorized') setNotice({ kind: 'err', text: t('state.unauthorized') })
          else setNotice({ kind: 'err', text: t('state.operationFailed') + ': ' + describeError(t, failure) })
        } finally {
          setBusy(false)
        }
      }

      const copyExported = async () => {
        const copied = await copyText(exported)
        setNotice(copied ? { kind: 'ok', text: t('action.copied') } : { kind: 'warn', text: t('io.copyFailed') })
      }

      return h(
        'section',
        { className: 'mm-section' },
        h('h2', { className: 'mm-section-title' }, t('io.title')),
        h('p', { className: 'mm-section-hint' }, t('io.hint')),
        h(
          'div',
          { className: 'mm-inline' },
          h(Button, { onClick: exportJson, disabled: busy === true }, t('action.export')),
          h(Button, { onClick: copyExported, disabled: exported === '' }, t('action.copy')),
        ),
        exported !== ''
          ? h(Fragment, null, h('span', { className: 'mm-muted' }, t('io.exported')), h('pre', { className: 'mm-code' }, exported))
          : null,
        h(TextArea, {
          value: text,
          rows: 6,
          mono: true,
          placeholder: t('io.placeholder'),
          onChange: (value) => {
            setText(value)
            setNotice(null)
          },
        }),
        h(
          'div',
          { className: 'mm-inline' },
          h(
            'div',
            { className: 'mm-grow' },
            h(
              Field,
              { label: t('io.level') },
              h(Select, {
                value: level,
                options: [
                  { value: 'workspace', label: t('scope.workspace') },
                  { value: 'global', label: t('scope.global') },
                ],
                onChange: setLevel,
              }),
            ),
          ),
          h(Checkbox, { checked: overwrite, label: t('io.overwrite'), onChange: setOverwrite }),
          h(Button, { variant: 'primary', onClick: importJson, disabled: busy === true }, t('action.import')),
        ),
        h(Notice, { notice: notice }),
      )
    }

    /* ------------------------------------------------------------------ *
     * Server library section.                                            *
     * ------------------------------------------------------------------ */

    function LibrarySection(props) {
      const t = props.t
      const profile = props.profile
      const entries = props.entries
      const [dialogEntry, setDialogEntry] = useState(null)
      const [dialogReturnFocus, setDialogReturnFocus] = useState(null)
      const [confirmEntry, setConfirmEntry] = useState(null)
      const [confirmReturnFocus, setConfirmReturnFocus] = useState(null)
      const [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState(null)

      const applyEntry = async (input) => {
        const entry = dialogEntry
        setDialogEntry(null)
        if (entry === null) return
        setBusy(true)
        try {
          const name = textOf(input.serverName).trim()
          const args = { level: input.level, serverName: entry.serverName }
          if (name !== '' && name !== entry.serverName) args.serverNameOverride = name
          await callApi('libraryApply', args)
          setNotice({ kind: 'ok', text: t('notice.libraryAdded', { name: name !== '' ? name : entry.serverName }) })
          if (typeof props.onChanged === 'function') props.onChanged()
        } catch (failure) {
          if (failure.code === 'unauthorized') setNotice({ kind: 'err', text: t('state.unauthorized') })
          else setNotice({ kind: 'err', text: t('state.operationFailed') + ': ' + describeError(t, failure) })
        } finally {
          setBusy(false)
        }
      }

      const removeEntry = async () => {
        const entry = confirmEntry
        setConfirmEntry(null)
        if (entry === null) return
        setBusy(true)
        try {
          await callApi('libraryRemove', { serverName: entry.serverName })
          setNotice({ kind: 'ok', text: t('notice.libraryRemoved', { name: entry.serverName }) })
          if (typeof props.onChanged === 'function') props.onChanged()
        } catch (failure) {
          if (failure.code === 'unauthorized') setNotice({ kind: 'err', text: t('state.unauthorized') })
          else setNotice({ kind: 'err', text: t('state.operationFailed') + ': ' + describeError(t, failure) })
        } finally {
          setBusy(false)
        }
      }

      return h(
        'section',
        { className: 'mm-section' },
        h('h2', { className: 'mm-section-title' }, t('library.title')),
        h('p', { className: 'mm-section-hint' }, t('library.hint')),
        h(Notice, { notice: notice }),
        entries.length === 0
          ? h(EmptyState, { title: t('empty.library') })
          : h(
            'div',
            { className: 'mm-library' },
            entries.map((entry) => h(
              'div',
              { key: entry.serverName, className: 'mm-library-row' },
              h(
                'div',
                { className: 'mm-library-main' },
                h('span', { className: 'mm-card-name' }, entry.serverName),
                h(Chip, { tone: 'brand' }, transportOf(entry.config)),
                h(
                  'span',
                  { className: 'mm-muted' },
                  t('library.origins') + ': ' + (
                    Array.isArray(entry.origins) && entry.origins.length > 0
                      ? entry.origins.map((origin) => originLabel(t, origin, profile)).join(' · ')
                      : t('library.origin.none')
                  ),
                ),
              ),
              h(
                'div',
                { className: 'mm-row-actions' },
                h(Button, {
                  disabled: busy === true,
                  onClick: (event) => {
                    setDialogReturnFocus(event.currentTarget)
                    setDialogEntry(entry)
                  },
                }, t('action.addTo')),
                h(Button, {
                  variant: 'danger',
                  disabled: busy === true,
                  onClick: (event) => {
                    setConfirmReturnFocus(event.currentTarget)
                    setConfirmEntry(entry)
                  },
                }, t('action.remove')),
              ),
            )),
          ),
        dialogEntry !== null
          ? h(LibraryAddDialog, {
            t: t,
            entry: dialogEntry,
            returnFocus: dialogReturnFocus,
            onClose: () => setDialogEntry(null),
            onSubmit: applyEntry,
          })
          : null,
        confirmEntry !== null
          ? h(
            Dialog,
            {
              title: t('dialog.removeTitle'),
              closeLabel: t('action.close'),
              onClose: () => setConfirmEntry(null),
              returnFocus: confirmReturnFocus,
              footer: h(
                Fragment,
                null,
                h(Button, { onClick: () => setConfirmEntry(null) }, t('action.cancel')),
                h(Button, { variant: 'danger', onClick: removeEntry }, t('action.remove')),
              ),
            },
            h('p', { className: 'mm-dialog-text' }, t('dialog.removeBody')),
          )
          : null,
      )
    }

    /* ------------------------------------------------------------------ *
     * The Settings page.                                                 *
     * ------------------------------------------------------------------ */

    function McpPage(props) {
      const bound = props !== null && props !== undefined && typeof props.t === 'function' ? props.t : activeT
      const t = typeof bound === 'function' ? bound : function fallback(key) { return key }
      const tRef = useRef(t)
      tRef.current = t

      const [view, setView] = useState({ status: 'loading', data: null, error: null, updatedAt: 0 })
      const [scopeFilter, setScopeFilter] = useState('all')
      const [query, setQuery] = useState('')
      const [notice, setNotice] = useState(null)
      const [busy, setBusy] = useState('')
      const [editor, setEditor] = useState(null)
      const [jsonView, setJsonView] = useState(null)
      const [confirm, setConfirm] = useState(null)
      const requestSeq = useRef(0)

      const loadState = useCallback(async () => {
        const seq = requestSeq.current + 1
        requestSeq.current = seq
        try {
          const payload = await callApi('state', {})
          if (requestSeq.current !== seq) return null
          setView({ status: 'ready', data: payload, error: null, updatedAt: Date.now() })
          return payload
        } catch (failure) {
          if (requestSeq.current !== seq) return null
          if (failure.code === 'unauthorized') {
            setView({ status: 'unauthorized', data: null, error: null, updatedAt: 0 })
            return null
          }
          setView((previous) => {
            if (previous.status === 'ready') {
              return { status: 'ready', data: previous.data, error: describeError(tRef.current, failure), updatedAt: previous.updatedAt }
            }
            return { status: 'error', data: null, error: describeError(tRef.current, failure), updatedAt: 0 }
          })
          return null
        }
      }, [])

      useEffect(() => {
        let stopped = false
        const tick = () => {
          if (!stopped) void loadState()
        }
        tick()
        const timer = setInterval(tick, POLL_MS)
        return () => {
          stopped = true
          clearInterval(timer)
        }
      }, [loadState])

      const handleFailure = useCallback((failure) => {
        if (failure !== null && failure !== undefined && failure.code === 'unauthorized') {
          setView({ status: 'unauthorized', data: null, error: null, updatedAt: 0 })
          return
        }
        setNotice({ kind: 'err', text: tRef.current('state.operationFailed') + ': ' + describeError(tRef.current, failure) })
      }, [])

      const mutate = useCallback(async (op, args, successText) => {
        setBusy(op)
        try {
          await callApi(op, args)
          if (typeof successText === 'string' && successText !== '') setNotice({ kind: 'ok', text: successText })
          return { ok: true }
        } catch (failure) {
          if (failure !== null && failure !== undefined && failure.code === 'unauthorized') {
            setView({ status: 'unauthorized', data: null, error: null, updatedAt: 0 })
            return { ok: false, error: tRef.current('state.unauthorized') }
          }
          const message = describeError(tRef.current, failure)
          setNotice({ kind: 'err', text: tRef.current('state.operationFailed') + ': ' + message })
          return { ok: false, error: message }
        } finally {
          setBusy('')
          await loadState()
        }
      }, [loadState])

      const data = view.data !== null && view.data !== undefined ? view.data : {}
      const rows = Array.isArray(data.rows) ? data.rows : []
      const library = Array.isArray(data.library) ? data.library : []
      const workspaces = Array.isArray(data.workspaces) ? data.workspaces : []
      const warnings = Array.isArray(data.warnings) ? data.warnings : []
      const scope = data.scope !== null && data.scope !== undefined && typeof data.scope === 'object' ? data.scope : {}
      const profile = textOf(scope.profile)
      const ready = view.status === 'ready'

      const needle = query.trim().toLowerCase()
      const visibleRows = rows.filter((row) => {
        if (needle === '') return true
        const haystack = [textOf(row.serverName), textOf(row.target), textOf(row.id)].join(' ').toLowerCase()
        return haystack.includes(needle)
      })
      const filteredRows = scopeFilter === 'all' ? visibleRows : visibleRows.filter((row) => row.level === scopeFilter)
      const globalRows = filteredRows.filter((row) => row.level === 'global')
      const workspaceRows = filteredRows.filter((row) => row.level === 'workspace')
      const defaultLevel = scopeFilter === 'global' ? 'global' : 'workspace'

      const scopeOptions = [
        { value: 'all', label: t('scope.all') },
        { value: 'global', label: t('scope.global') },
        { value: 'workspace', label: t('scope.workspace') },
      ]

      const openCreate = (event) => {
        setEditor({ mode: 'create', level: defaultLevel, row: null, returnFocus: event !== undefined && event !== null ? event.currentTarget : null })
      }
      const openEdit = (row, event) => {
        setEditor({ mode: 'edit', level: row.level, row: row, returnFocus: event !== undefined && event !== null ? event.currentTarget : null })
      }
      const openJson = (row, event) => {
        setJsonView({ row: row, returnFocus: event !== undefined && event !== null ? event.currentTarget : null })
      }
      const openDelete = (row, event) => {
        setConfirm({ row: row, returnFocus: event !== undefined && event !== null ? event.currentTarget : null })
      }

      const submitEditor = async (input) => {
        if (editor === null) return
        const editing = editor.mode === 'edit'
        const op = editing ? 'update' : 'create'
        const workspaces = Array.isArray(input.workspaces) ? input.workspaces : []
        const args = editing
          ? { id: editor.row.id, level: editor.row.level, config: input.config, workspaces: workspaces }
          : { level: input.level, config: input.config, workspaces: workspaces }
        const name = textOf(input.config.serverName)
        const successText = editing ? t('notice.updated', { name: name }) : t('notice.created', { name: name })
        const result = await mutate(op, args, successText)
        if (result.ok === true) setEditor(null)
        return result
      }

      const toggleRow = (row) => {
        const nextEnabled = row.disabled === true
        const successText = nextEnabled ? t('notice.enabled', { name: row.serverName }) : t('notice.disabled', { name: row.serverName })
        void mutate('setEnabled', { id: row.id, level: row.level, enabled: nextEnabled }, successText)
      }

      const testRow = async (row) => {
        setBusy('probe')
        try {
          const payload = await callApi('probe', { id: row.id, level: row.level })
          const result = payload.result !== undefined ? payload.result : null
          setNotice({ kind: result !== null && result.ok === true ? 'ok' : 'err', text: probeSummary(t, result) })
        } catch (failure) {
          handleFailure(failure)
        } finally {
          setBusy('')
          await loadState()
        }
      }

      const testAll = async () => {
        setBusy('probeAll')
        try {
          const payload = await callApi('probeAll', {})
          const results = Array.isArray(payload.results) ? payload.results : []
          let okCount = 0
          for (const entry of results) {
            if (entry !== null && entry !== undefined && entry.result !== null && entry.result !== undefined && entry.result.ok === true) okCount += 1
          }
          setNotice({
            kind: okCount === results.length ? 'ok' : 'warn',
            text: t('notice.probeAll', { total: results.length, ok: okCount }),
          })
        } catch (failure) {
          handleFailure(failure)
        } finally {
          setBusy('')
          await loadState()
        }
      }

      const removeRow = async () => {
        if (confirm === null) return
        const row = confirm.row
        setConfirm(null)
        await mutate('remove', { id: row.id, level: row.level }, t('notice.removed', { name: row.serverName }))
      }

      const copyJson = async (copied) => {
        setNotice(copied ? { kind: 'ok', text: t('action.copied') } : { kind: 'warn', text: t('io.copyFailed') })
      }

      const header = h(
        'div',
        { className: 'mm-head' },
        h(
          'div',
          { className: 'mm-head-text' },
          h('h1', { className: 'mm-title' }, t('section.title')),
          h('p', { className: 'mm-subtitle' }, t('page.subtitle')),
        ),
        h(
          'div',
          { className: 'mm-head-actions' },
          h('span', { className: 'mm-updated' }, view.updatedAt > 0 ? t('updated.at', { time: formatTime(view.updatedAt) }) : t('updated.never')),
          h(Button, { onClick: () => { void loadState() }, disabled: busy !== '' }, t('action.refresh')),
          h(Button, { onClick: testAll, disabled: busy !== '' || rows.length === 0 }, t('action.probeAll')),
        ),
      )

      const toolbar = h(
        'div',
        { className: 'mm-toolbar' },
        h(
          'div',
          { className: 'mm-seg', role: 'group', 'aria-label': t('section.title') },
          scopeOptions.map((option) => h(
            'button',
            {
              key: option.value,
              type: 'button',
              className: 'mm-seg-btn' + (scopeFilter === option.value ? ' mm-seg-btn-active' : ''),
              'aria-pressed': scopeFilter === option.value ? 'true' : 'false',
              onClick: () => setScopeFilter(option.value),
            },
            option.label,
          )),
        ),
        h('div', { className: 'mm-search' }, h(TextInput, { value: query, onChange: setQuery, placeholder: t('search.placeholder') })),
        h(Button, { variant: 'primary', onClick: openCreate }, t('action.add')),
      )

      const rowActions = {
        t: t,
        workspaces: workspaces,
        busy: busy !== '',
        onEdit: openEdit,
        onJson: openJson,
        onTest: testRow,
        onToggle: toggleRow,
        onDelete: openDelete,
      }

      let rowsBody
      if (rows.length === 0) {
        rowsBody = h(EmptyState, { title: t('empty.none'), hint: t('empty.noneHint') })
      } else if (filteredRows.length === 0) {
        rowsBody = h(EmptyState, { title: t('empty.filtered') })
      } else if (scopeFilter === 'all') {
        rowsBody = h(
          'div',
          { className: 'mm-groups' },
          h(
            'div',
            { className: 'mm-group' },
            h('h2', { className: 'mm-group-title' }, t('group.global')),
            globalRows.length === 0
              ? h(EmptyState, { title: t('empty.global') })
              : globalRows.map((row) => h(RowCard, Object.assign({ key: row.id, row: row }, rowActions))),
          ),
          h(
            'div',
            { className: 'mm-group' },
            h('h2', { className: 'mm-group-title' }, t('group.workspace')),
            workspaceRows.length === 0
              ? h(EmptyState, { title: t('empty.workspace') })
              : workspaceRows.map((row) => h(RowCard, Object.assign({ key: row.id, row: row }, rowActions))),
          ),
        )
      } else {
        rowsBody = h('div', { className: 'mm-list' }, filteredRows.map((row) => h(RowCard, Object.assign({ key: row.id, row: row }, rowActions))))
      }

      const body = h(
        Fragment,
        null,
        warnings.length > 0
          ? h(
            'div',
            { className: 'mm-warn-banner', role: 'status' },
            h('strong', null, t('warnings.title')),
            h('ul', null, warnings.map((warning, index) => h('li', { key: index }, textOf(warning)))),
          )
          : null,
        h(Notice, { notice: notice, dismissLabel: t('action.close'), onDismiss: () => setNotice(null) }),
        toolbar,
        rowsBody,
        h(ImportExportSection, { t: t, onImported: () => { void loadState() } }),
        h(LibrarySection, { t: t, profile: profile, entries: library, onChanged: () => { void loadState() } }),
      )

      let content
      if (view.status === 'loading') {
        content = h(StatePanel, { title: t('state.loading') })
      } else if (view.status === 'unauthorized') {
        content = h(StatePanel, {
          title: t('state.unauthorized'),
          role: 'alert',
          actionLabel: t('action.retry'),
          onAction: () => { void loadState() },
        })
      } else if (view.status === 'error') {
        content = h(StatePanel, {
          title: t('state.error'),
          hint: view.error,
          role: 'alert',
          actionLabel: t('action.retry'),
          onAction: () => { void loadState() },
        })
      } else {
        content = body
      }

      return h(
        'section',
        { className: 'mm-page', 'aria-label': t('section.title') },
        header,
        view.status === 'ready' && view.error !== null ? h('p', { className: 'mm-err-text' }, t('state.error') + ': ' + view.error) : null,
        content,
        editor !== null
          ? h(EditorDialog, {
            t: t,
            mode: editor.mode,
            row: editor.row,
            level: editor.level,
            workspaces: workspaces,
            returnFocus: editor.returnFocus,
            busy: busy !== '',
            onClose: () => setEditor(null),
            onSubmit: submitEditor,
          })
          : null,
        jsonView !== null
          ? h(JsonDialog, {
            t: t,
            row: jsonView.row,
            returnFocus: jsonView.returnFocus,
            onClose: () => setJsonView(null),
            onCopied: copyJson,
          })
          : null,
        confirm !== null
          ? h(
            Dialog,
            {
              title: t('dialog.deleteTitle'),
              closeLabel: t('action.close'),
              onClose: () => setConfirm(null),
              returnFocus: confirm.returnFocus,
              footer: h(
                Fragment,
                null,
                h(Button, { onClick: () => setConfirm(null) }, t('action.cancel')),
                h(Button, { variant: 'danger', onClick: removeRow }, t('action.confirmDelete')),
              ),
            },
            h('p', { className: 'mm-dialog-text' }, t('dialog.deleteBody')),
          )
          : null,
      )
    }

    /* ------------------------------------------------------------------ *
     * Styles: theme tokens only, every class prefixed with `mm-`.        *
     * ------------------------------------------------------------------ */

    const CSS = [
      '.mm-page{display:flex;flex-direction:column;gap:16px;width:100%;max-width:880px;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:13px;line-height:20px}',
      '.mm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.mm-head-text{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.mm-title{margin:0;font-size:16px;line-height:24px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.mm-subtitle{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.mm-head-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.mm-updated{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-btn{font:inherit;font-size:12px;line-height:18px;height:30px;padding:0 11px;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;cursor:pointer;color:var(--dsw-alias-label-primary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm)}',
      '.mm-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.mm-btn:disabled{opacity:.45;cursor:default}',
      '.mm-btn-primary{color:var(--dsw-alias-bg-base);background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.mm-btn-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary)}',
      '.mm-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
      '.mm-icon-btn{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:1;cursor:pointer;flex:none}',
      '.mm-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.mm-chip{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);font-size:11px;line-height:18px;white-space:nowrap;color:var(--dsw-alias-label-secondary);background:transparent}',
      '.mm-chip-brand{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.mm-chip-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}',
      '.mm-chip-warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}',
      '.mm-chip-err{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
      '.mm-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.mm-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);overflow:hidden;flex:none}',
      '.mm-seg-btn{font:inherit;font-size:12px;height:28px;padding:0 11px;background:transparent;border:none;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.mm-seg-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.mm-seg-btn-active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.mm-seg-btn:disabled{opacity:.45;cursor:default}',
      '.mm-ws{position:relative;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}',
      '.mm-ws-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-ws-pop{position:absolute;top:calc(100% + 4px);right:0;z-index:2;display:flex;flex-direction:column;gap:6px;width:280px;max-height:240px;overflow:auto;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);box-shadow:0 8px 24px var(--dsw-alias-bg-overlay,var(--dsw-alias-border-l2))}',
      '.mm-ws-actions{display:flex;gap:6px}',
      '.mm-ws-list{display:flex;flex-direction:column;gap:4px}',
      '.mm-ws-empty{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-ws-chips{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}',
      '.mm-ws-chip{padding-right:3px;gap:4px}',
      '.mm-ws-chip-x{border:none;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;line-height:1;padding:0 2px;cursor:pointer}',
      '.mm-ws-chip-x:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-card-ws{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}',
      '.mm-search{flex:1 1 200px;min-width:160px}',
      '.mm-input{font:inherit;font-size:12px;line-height:18px;box-sizing:border-box;width:100%;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:5px 8px;outline:none;min-width:0}',
      '.mm-input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.mm-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.mm-textarea{resize:vertical;min-height:64px}',
      '.mm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:17px}',
      '.mm-groups{display:flex;flex-direction:column;gap:16px}',
      '.mm-group{display:flex;flex-direction:column;gap:8px}',
      '.mm-group-title{margin:0;font-size:12px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-secondary);padding-bottom:4px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.mm-list{display:flex;flex-direction:column;gap:8px}',
      '.mm-card{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);min-width:0}',
      '.mm-card-off{opacity:.72}',
      '.mm-card-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}',
      '.mm-card-name{font-size:13px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary);word-break:break-all}',
      '.mm-spacer{flex:1 1 auto}',
      '.mm-card-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}',
      '.mm-target{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);word-break:break-all}',
      '.mm-card-probe{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}',
      '.mm-row-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.mm-hint{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-muted{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);word-break:break-all}',
      '.mm-test-result{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);word-break:break-word}',
      '.mm-err-text{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);word-break:break-word}',
      '.mm-warn-banner{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border:1px solid var(--dsw-alias-state-warn-primary);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.mm-warn-banner strong{color:var(--dsw-alias-state-warn-primary);font-weight:600}',
      '.mm-warn-banner ul{margin:0;padding-left:18px}',
      '.mm-notice{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.mm-notice-text{flex:1 1 auto;min-width:0;word-break:break-word}',
      '.mm-notice-ok{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}',
      '.mm-notice-warn{border-color:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary)}',
      '.mm-notice-err{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}',
      '.mm-state{display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 16px;border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);text-align:center;color:var(--dsw-alias-label-secondary)}',
      '.mm-state-title{margin:0;font-size:13px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.mm-state-hint{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);word-break:break-word}',
      '.mm-empty{display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;padding:18px 14px;border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.mm-empty strong{font-size:13px;color:var(--dsw-alias-label-primary);font-weight:600}',
      '.mm-section{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1)}',
      '.mm-section-title{margin:0;font-size:13px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.mm-section-hint{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-inline{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap}',
      '.mm-grow{flex:1 1 200px;min-width:160px}',
      '.mm-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}',
      '.mm-field{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.mm-field-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.mm-field-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-required{color:var(--dsw-alias-state-error-primary);margin-left:2px}',
      '.mm-check{display:inline-flex;align-items:center;gap:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);cursor:pointer;user-select:none}',
      '.mm-check input{accent-color:var(--dsw-alias-brand-primary)}',
      '.mm-dialog-top{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-bottom:6px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.mm-top-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}',
      '.mm-scope{display:inline-flex;align-items:center;gap:6px}',
      '.mm-scope-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-tabs{display:flex;gap:4px}',
      '.mm-tab{font:inherit;font-size:12px;line-height:18px;padding:5px 10px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.mm-tab:hover{color:var(--dsw-alias-label-primary)}',
      '.mm-tab-active{color:var(--dsw-alias-brand-primary);border-bottom-color:var(--dsw-alias-brand-primary)}',
      '.mm-advanced{border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);padding:8px 10px}',
      '.mm-advanced summary{cursor:pointer;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);user-select:none}',
      '.mm-advanced-body{display:flex;flex-direction:column;gap:10px;padding-top:8px}',
      '.mm-code{margin:0;padding:8px 10px;max-height:320px;overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:17px;white-space:pre-wrap;word-break:break-all}',
      '.mm-library{display:flex;flex-direction:column;gap:6px}',
      '.mm-library-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base)}',
      '.mm-library-main{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}',
      '.mm-switch{position:relative;flex:none;width:36px;height:20px;padding:0;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);cursor:pointer}',
      '.mm-switch-on{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.mm-switch-thumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-bg-base);transition:transform .15s ease}',
      '.mm-switch-on .mm-switch-thumb{transform:translateX(16px)}',
      '.mm-switch:disabled{opacity:.45;cursor:default}',
      '.mm-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:transparent}',
      '.mm-dialog{display:flex;flex-direction:column;width:min(600px,calc(100vw - 32px));max-height:min(84vh,860px);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);overflow:hidden;box-shadow:0 12px 36px var(--dsw-alias-bg-overlay,var(--dsw-alias-border-l2))}',
      '.mm-dialog-wide{width:min(760px,calc(100vw - 32px))}',
      '.mm-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.mm-dialog-title{margin:0;font-size:14px;line-height:22px;font-weight:600;color:var(--dsw-alias-label-primary);word-break:break-all}',
      '.mm-dialog-body{display:flex;flex-direction:column;gap:10px;padding:12px 16px;overflow:auto}',
      '.mm-dialog-text{margin:0;font-size:12px;line-height:19px;color:var(--dsw-alias-label-secondary)}',
      '.mm-dialog-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.mm-foot-left{margin-right:auto}',
    ].join('\n')

    /* ------------------------------------------------------------------ *
     * Registration. All side effects live inside apply and ctx.effect.   *
     * ------------------------------------------------------------------ */

    /** Bound translator, assigned by `apply` and used when the slot passes no `t`. */
    let activeT = null

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
