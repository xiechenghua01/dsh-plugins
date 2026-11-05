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
    const useRef = React.useRef
    const useState = React.useState

    /** Locale namespace shared by the dictionaries, the page and the Settings entry. */
    const NS = 'mcp-manager'
    /** Relative API path: no leading slash, resolved against the Settings page URL. */
    const API_PATH = 'mcp-manager/api'
    /** The live phase changes when HMR applies a patch, so keep the poll cheap and frequent. */
    const POLL_MS = 4000
    const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/u
    const DASH = '—'

    /* ------------------------------------------------------------------ *
     * Locale dictionaries: flat key -> string, identical key sets.       *
     * Placeholders are interpolated as {name} by the locale service.     *
     * ------------------------------------------------------------------ */

    const zh = {
      'section.title': 'MCP 服务',
      'page.title': 'MCP 服务器管理',
      'page.enabledPill': '{count} 个已启用',
      'page.subtitle': '当前 profile：{name}。管理全局与当前 profile 的 MCP 扩展服务，支持多工作区按需勾选共享',
      'page.profileFallback': '未命名 profile',
      'action.addServer': '新增服务器',
      'action.cancel': '取消',
      'action.save': '保存并应用配置',
      'action.testBeforeSave': '保存前测试连通性',
      'action.copied': '已复制',
      'action.copyFailed': '无法写入剪贴板，请手动复制',
      'action.copyShareJson': '复制单节点分享 JSON',
      'action.applyCurrent': '应用到当前工作区 ({name})',
      'action.applyAndEdit': '应用并编辑',
      'action.retry': '重试',
      'action.remove': '移除',
      'action.saveWorkspaces': '应用工作区范围',
      'action.formatJson': '格式化 JSON',
      'action.pasteSample': '粘贴社区分享 JSON 示例',
      'action.copyConfig': '复制配置',
      'action.addEnv': '+ 添加环境变量',
      'action.addHeader': '+ 添加 Header',
      'action.fillNpx': '填入常用 npx 模板',
      'action.openConfig': '查看配置文件',
      'action.closeDialog': '关闭配置弹窗',
      'action.closeManage': '关闭生效范围窗口',
      'action.closeConfig': '关闭配置文件窗口',
      'action.testAll': '测试所有启用的 MCP 服务器',
      'action.toggleEnable': '启用 MCP 服务器',
      'action.toggleDisable': '停用 MCP 服务器',
      'action.testOne': '测试连通性',
      'action.manage': '管理生效工作区',
      'action.edit': '更新 MCP 服务器配置',
      'action.delete': '删除 MCP 服务器',
      'filter.all': '当前生效全部',
      'filter.global': '全局 (Global)',
      'filter.workspace': '当前工作区',
      'filter.other': '其他工作区已有',
      'search.placeholder': '搜索服务、工作区或工具...',
      'card.connected': '连通正常',
      'card.connectedMs': '连通正常 · {ms}ms',
      'card.testing': '正在测试连通性...',
      'card.disabled': '已停用',
      'card.notApplied': '未在当前工作区应用',
      'card.testFailed': '测试失败',
      'card.liveFailed': '加载失败',
      'card.notLoaded': '未加载',
      'card.unknown': '状态未知',
      'card.noDescription': '未填写描述信息',
      'card.details': '参数详情',
      'card.toolsDetails': '{count} 个工具 / 参数详情',
      'card.globalScope': '🌐 全局共享 (所有工作区)',
      'card.workspaceScope': '📁 生效工作区: {names}',
      'card.profileScope': '📁 当前 profile',
      'card.otherScope': '📁 其他工作区',
      'card.sseUnsupported': 'SSE 不支持',
      'card.notConfigured': '尚未配置到任何层，应用后写入当前 profile 配置',
      'card.writePath': '写入配置文件路径: {path}',
      'card.timeout': '超时上限: {ms}ms',
      'card.noTools': '尚未探测到工具列表',
      'card.autoApprove': '免审',
      'card.blocked': '禁用',
      'card.toolsTitle': '已发现工具 (Tools):',
      'card.scopeTitle': '点击直接勾选增减生效的工作区',
      'card.globalScopeTitle': '点击修改生效范围',
      'card.applied': '已将 "{name}" 应用到当前工作区',
      'card.enabledToast': '{name} 已启用',
      'card.disabledToast': '{name} 已停用',
      'card.testOkToast': '服务器 {name} 连通性测试通过（{ms}ms · 发现 {tools} 个工具）',
      'card.testFailToast': '服务器 {name} 测试失败：{message}',
      'card.testAllNone': '当前没有处于启用状态的 MCP 服务器可测试',
      'card.testAllRunning': '正在并发测试 {count} 个已启用的 MCP 服务器...',
      'card.testAllDone': '全部 {count} 个已启用 MCP 服务器连通性测试通过！',
      'card.testAllPartial': '已测试 {total} 个服务器，{ok} 个连通',
      'card.libraryRemoved': '已从服务器库中移除 {name}',
      'card.readOnly': '只读',
      'card.readOnlyHint': '该行无法安全改写，只能查看；请在插件可写的作用域中新建一份。',
      'empty.title': '当前筛选条件下暂无 MCP 服务器',
      'empty.hint': '您可以新增服务器并直接勾选要应用的多个工作区，或切换到「其他工作区已有」一键挂载',
      'empty.add': '+ 新增服务器 (支持多选工作区)',
      'empty.other': '其他工作区还没有可复用的服务器',
      'state.loading': '正在加载 MCP 服务器…',
      'state.unauthorized': '当前页面未获授权，无法读取 MCP 服务器',
      'state.error': '加载失败',
      'state.operationFailed': '操作失败',
      'state.unknownError': '未知错误',
      'state.invalidResponse': '宿主返回了无效响应',
      'state.requestFailed': '请求失败，请检查网络或宿主状态',
      'state.testing': '正在握手并拉取工具列表...',
      'state.saving': '保存中…',
      'warnings.title': '注意',
      'editor.addTitle': '新增 MCP 服务器',
      'editor.editTitle': '更新 MCP 服务器 · {name}',
      'editor.subtitle': '支持一次配置并勾选多个工作区标记；写入当前 profile 的 cordis.patch.yml 中的 MCP 客户端行',
      'editor.tabStructured': '结构化配置',
      'editor.tabJson': 'JSON 配置 (支持粘贴分享)',
      'editor.scopeTitle': '生效范围（应用目标）',
      'editor.scopeBadge': '非破坏性局部合并写入',
      'editor.scopeHint': '勾选计划使用该服务器的工作区作为组织标记；Loader 行写入当前 profile，对所有会话生效',
      'editor.scopeWorkspace': '指定工作区 (支持多选)',
      'editor.scopeGlobal': '全局共享 (所有工作区通用)',
      'editor.scopeLocked': '作用域在创建后不可更改',
      'editor.mergePreview': '🎯 工作区标记：{names}；将合并写入 profile 的 cordis.patch.yml（{path}）中 dsh-mcp-client 行的 config，不会覆盖其他配置项及已有的其他 MCP 服务。',
      'editor.mergePreviewGlobal': '🌐 将写入全局的 cordis.patch.yml（{path}）中 dsh-mcp-client 行，对所有 profile 生效。',
      'editor.mergeEmpty': '⚠️ 请至少勾选 1 个要应用的工作区，或切换为「全局共享」',
      'editor.wsExisting': '已有 {count} 个 MCP · 保留其他配置项',
      'editor.wsEmpty': '暂无工作区',
      'editor.section1': '1. 基础标识与传输协议',
      'editor.section2stdio': '2. 本地进程启动参数 (STDIO)',
      'editor.section2remote': '2. 远程服务端点与请求头配置',
      'editor.section3': '3. 运行策略、超时重连与工具调用权限',
      'editor.serverId': '服务器标识键名 (Server ID / Key)',
      'editor.serverIdPlaceholder': '例如: redis-cluster-mcp 或 postgres-prod',
      'editor.description': '显示名称 / 备注说明',
      'editor.descriptionPlaceholder': '例如: 跨业务共享缓存查询与会话状态分析',
      'editor.transport': '传输协议类型 (Transport)',
      'editor.transportStdioBadge': '本地进程',
      'editor.transportHttpBadge': '推荐远程',
      'editor.transportSseBadge': '远程事件流',
      'editor.transportStdioDesc': '通过 npx / uvx / python / docker 启动子进程通信',
      'editor.transportHttpDesc': 'MCP 新版标准流式 HTTP 端点，支持断线重连与认证',
      'editor.transportSseDesc': '基于 HTTP Server-Sent Events 的长连接远程服务',
      'editor.sseUnsupported': 'DSH 当前版本不支持 SSE，请使用 streamable-http',
      'editor.command': '可执行命令 (command)',
      'editor.commandPlaceholder': 'npx / uvx / node / docker',
      'editor.cwd': '工作目录 (cwd，留空默认当前工作区根目录)',
      'editor.cwdPlaceholder': 'workspaceFolder 变量 或 /abs/path/to/server',
      'editor.args': '启动参数列表 (args，每行一个参数，行内空格保留)',
      'editor.env': '环境变量 (env) · 支持敏感密钥掩码与系统变量引用',
      'editor.url': '远程服务 URL (url)',
      'editor.urlPlaceholder': 'https://mcp.internal.company.com/v1/mcp',
      'editor.headers': '自定义请求头 (headers · 如 Authorization / X-Workspace-Key)',
      'editor.oauth': 'OAuth 2.1 / Bearer 鉴权扩展',
      'editor.oauthHint': '当远程 MCP 服务需要用户授权或自动刷新 Token 时启用',
      'editor.oauthClientId': 'Client ID',
      'editor.oauthClientIdPlaceholder': 'ds_harness_mcp_client',
      'editor.oauthScopes': 'Scopes (空格分隔)',
      'editor.oauthScopesPlaceholder': 'read:tools execute:query',
      'editor.timeout': '单次请求超时 (timeout ms)',
      'editor.retries': '断线自动重连次数 (maxRetries)',
      'editor.maxInstructionBytes': '服务器指令字节上限 (maxInstructionBytes)',
      'editor.failOnStartupError': '首次连接失败时拒绝加载 (failOnStartupError)',
      'editor.reconnect': '断线自动重连策略 (reconnect)',
      'editor.reconnectEnabled': '启用自动重连',
      'editor.reconnectInitialDelayMs': '初始重连延迟 (ms)',
      'editor.reconnectMaxDelayMs': '最大重连延迟 (ms)',
      'editor.reconnectMaxAttempts': '最大重连尝试次数',
      'editor.capabilities': '暴露能力范围 (Capabilities)',
      'editor.capTools': 'Tools',
      'editor.capResources': 'Resources',
      'editor.capPrompts': 'Prompts',
      'editor.autoApprove': '免弹窗自动允许调用的工具列表 (autoApprove / 逗号分隔)',
      'editor.autoApprovePlaceholder': '例如: query_database, list_tables, describe_table',
      'editor.disabledTools': '显式禁用屏蔽的工具列表 (disabledTools / 逗号分隔)',
      'editor.disabledToolsPlaceholder': '例如: drop_table, delete_repository',
      'editor.jsonHint': '支持直接粘贴社区或其他用户分享的 mcpServers JSON 或单节点 JSON，自动解析并同步至结构化表单：',
      'editor.jsonPlaceholder': '在此粘贴 mcpServers JSON 或单个服务器节点…',
      'editor.jsonValid': '✓ JSON 语法有效，与结构化参数实时双向同步',
      'editor.jsonInvalid': 'JSON 语法错误: {message}',
      'editor.jsonFormatted': '✓ JSON 已格式化',
      'editor.jsonParsed': '✓ 已解析服务 "{name}" 并同步至结构化参数',
      'editor.jsonShape': 'JSON 中找不到服务器对象',
      'editor.jsonCopied': '已复制当前 MCP 节点的 JSON 配置',
      'editor.jsonSample': '已模拟粘贴其他用户分享的 JSON，并自动拆解同步至结构化配置！',
      'editor.testOk': '✓ 握手成功 ({ms}ms · 协议版本 {version} · {tools} 个工具)',
      'editor.testFail': '✗ {message}',
      'editor.validationName': '请填写合法的服务器标识键名 (1–32 位字母、数字、下划线或短横线)',
      'editor.validationCommand': '请填写可执行命令',
      'editor.validationUrl': '请填写合法的 http(s) 远程 URL',
      'editor.validationWorkspaces': '请至少勾选一个要应用的工作区，或切换为全局共享',
      'editor.validationSse': 'DSH 当前版本不支持 SSE，请改用 streamable-http',
      'editor.validationTimeout': '超时必须是大于 0 的整数',
      'editor.validationRetries': '重连次数必须是 0–100 的整数',
      'editor.validationNumber': '请填写大于 0 的整数',
      'editor.jsonBlocked': 'JSON 语法有误，请先修正后再保存或测试',
      'editor.jsonReset': '放弃 JSON 编辑并恢复表单',
      'editor.jsonDiscardConfirm': 'JSON 语法有误。放弃这些修改并切回结构化配置？',
      'editor.jsonDiscardYes': '放弃并切回结构化',
      'editor.jsonDiscardNo': '继续编辑 JSON',
      'editor.syncHint': 'DSH 单 profile 下更新即作用于该行',
      'editor.npxFilled': '已填入 Brave Search MCP 模板参数',
      'editor.created': '已新增 "{name}" 并合并写入 {target}',
      'editor.updated': '已保存并局部同步更新至 {target}',
      'editor.targetGlobal': '全局配置',
      'editor.targetWorkspace': '当前工作区配置',
      'editor.required': '必填',
      'editor.kvKeyEnv': 'ENV_KEY (如 API_KEY)',
      'editor.kvValEnv': '环境变量值',
      'editor.kvKeyHeader': 'Header 名称 (如 Authorization)',
      'editor.kvValHeader': 'Bearer token...',
      'editor.removeRow': '删除该项',
      'manage.title': '管理 MCP 生效工作区范围',
      'manage.subtitle': '勾选或取消工作区，更新该服务器的组织标记；Loader 行本身不受影响',
      'manage.target': '目标 MCP 服务器：',
      'manage.global': '🌐 设为全局共享 (Global)',
      'manage.toWorkspace': '改为当前工作区',
      'manage.globalBadge': '所有工作区生效',
      'manage.globalHint': '写入全局配置文件，所有工作区免单独挂载',
      'manage.workspaceHint': '从全局层移出，仅写入当前 profile 配置',
      'manage.specific': '或按需勾选需要应用该 MCP 的指定工作区：',
      'manage.existing': '已有 {count} 个 MCP',
      'manage.note': '✓ 非破坏性保障：仅更新服务器库中的工作区标记，保留所有配置项与其他 MCP 服务器。',
      'manage.empty': '暂无工作区',
      'manage.saved': '已更新 {name} 的工作区范围',
      'manage.moved': '已将 {name} 移至{target}',
      'delete.title': '移除 / 删除 MCP 服务器',
      'delete.descMulti': '服务器 {name} 标记关联了 {names}；该行由当前 profile 统一生效，请选择操作范围：',
      'delete.descSingle': '即将从 {scope} 中移除 {name}（不影响其他设置项与其余 MCP 服务）。',
      'delete.descGlobalScope': '全局配置文件',
      'delete.descWorkspaceScope': '当前 profile 配置',
      'delete.optCurrent': '仅从当前 profile 移除（服务器库条目保留）',
      'delete.optCurrentSub': '仅移除当前 profile 层中的这一行；服务器库条目保留，可稍后重新应用',
      'delete.optCurrentGlobal': '仅从全局配置中移除（服务器库条目保留）',
      'delete.optCurrentGlobalSub': '仅移除全局层中的这一行；服务器库条目保留，可稍后重新应用',
      'delete.optAll': '同时从服务器库彻底删除',
      'delete.optAllSub': '删除当前 profile 层中的行，并从服务器库中删除该条目',
      'delete.optAllGlobal': '同时从服务器库彻底删除',
      'delete.optAllGlobalSub': '删除全局层中的行，并从服务器库中删除该条目',
      'delete.tagsNote': '工作区标记仅用于组织与展示；该 MCP 行由当前 profile 统一生效。',
      'delete.confirm': '确认执行',
      'delete.libraryTitle': '从服务器库移除',
      'delete.libraryDesc': '只移除库条目；已经配置到各层的服务器不受影响。',
      'delete.done': '已移除 MCP 服务器 {name}',
      'delete.purged': '已彻底删除 {name}',
      'config.title': '配置文件查看',
      'config.titlePath': '配置文件 · {path}',
      'config.subtitle': '当前层 cordis.patch.yml 的原始内容，只读；包含注释与其他插件行',
      'config.tabWorkspace': '📁 当前 profile 配置',
      'config.tabGlobal': '🌐 全局配置',
      'config.path': '文件路径：{path}',
      'config.copy': '复制全文',
      'config.copied': '已复制整份配置文件',
      'config.readonly': '只读视图，保留全部非 MCP 配置项；修改请使用上方服务器卡片。',
      'config.close': '关闭',
      'config.empty': '当前层没有可显示的内容',
      'config.unknownPath': '路径未知',
      'tooltip.closeDialog': '关闭配置弹窗',
      'tooltip.closeManage': '关闭生效范围窗口',
      'tooltip.closeConfig': '关闭配置文件窗口',
      'tooltip.openConfig': '查看配置文件',
      'tooltip.testAll': '测试所有启用的 MCP 服务器',
      'tooltip.enable': '启用 MCP 服务器',
      'tooltip.disable': '停用 MCP 服务器',
      'tooltip.test': '测试连通性',
      'tooltip.manage': '管理生效工作区',
      'tooltip.edit': '更新 MCP 服务器配置',
      'tooltip.delete': '删除 MCP 服务器',
      'tooltip.removeRow': '删除该项',
    }

    const en = {
      'section.title': 'MCP servers',
      'page.title': 'MCP server management',
      'page.enabledPill': '{count} enabled',
      'page.subtitle': 'Current profile: {name}. Manage MCP services for the global layer and this profile; attach them to several workspaces as needed',
      'page.profileFallback': 'Unnamed profile',
      'action.addServer': 'Add server',
      'action.cancel': 'Cancel',
      'action.save': 'Save and apply',
      'action.testBeforeSave': 'Test before saving',
      'action.copied': 'Copied',
      'action.copyFailed': 'Could not write to the clipboard; copy manually',
      'action.copyShareJson': 'Copy share JSON',
      'action.applyCurrent': 'Apply to current workspace ({name})',
      'action.applyAndEdit': 'Apply and edit',
      'action.retry': 'Retry',
      'action.remove': 'Remove',
      'action.saveWorkspaces': 'Apply workspaces',
      'action.formatJson': 'Format JSON',
      'action.pasteSample': 'Paste shared JSON sample',
      'action.copyConfig': 'Copy config',
      'action.addEnv': '+ Add environment variable',
      'action.addHeader': '+ Add header',
      'action.fillNpx': 'Fill npx template',
      'action.openConfig': 'View config file',
      'action.closeDialog': 'Close dialog',
      'action.closeManage': 'Close workspace dialog',
      'action.closeConfig': 'Close config file dialog',
      'action.testAll': 'Test all enabled MCP servers',
      'action.toggleEnable': 'Enable MCP server',
      'action.toggleDisable': 'Disable MCP server',
      'action.testOne': 'Test connectivity',
      'action.manage': 'Manage workspaces',
      'action.edit': 'Update MCP server config',
      'action.delete': 'Delete MCP server',
      'filter.all': 'All active',
      'filter.global': 'Global',
      'filter.workspace': 'Current workspace',
      'filter.other': 'Available elsewhere',
      'search.placeholder': 'Search services, workspaces, or tools...',
      'card.connected': 'Connected',
      'card.connectedMs': 'Connected · {ms}ms',
      'card.testing': 'Testing connectivity...',
      'card.disabled': 'Disabled',
      'card.notApplied': 'Not applied to this workspace',
      'card.testFailed': 'Test failed',
      'card.liveFailed': 'Load failed',
      'card.notLoaded': 'Not loaded',
      'card.unknown': 'Unknown state',
      'card.noDescription': 'No description',
      'card.details': 'Details',
      'card.toolsDetails': '{count} tools / Details',
      'card.globalScope': '🌐 Global (all workspaces)',
      'card.workspaceScope': '📁 Workspaces: {names}',
      'card.profileScope': '📁 Current profile',
      'card.otherScope': '📁 Other workspaces',
      'card.sseUnsupported': 'SSE unsupported',
      'card.notConfigured': 'Not configured in any layer yet; applying writes the current profile config',
      'card.writePath': 'Config path: {path}',
      'card.timeout': 'Timeout: {ms}ms',
      'card.noTools': 'No tools discovered yet',
      'card.autoApprove': 'auto',
      'card.blocked': 'blocked',
      'card.toolsTitle': 'Discovered tools:',
      'card.scopeTitle': 'Click to add or remove workspaces',
      'card.globalScopeTitle': 'Click to edit the scope',
      'card.applied': 'Applied "{name}" to the current workspace',
      'card.enabledToast': '{name} enabled',
      'card.disabledToast': '{name} disabled',
      'card.testOkToast': 'Server {name} is reachable ({ms}ms · {tools} tools)',
      'card.testFailToast': 'Server {name} test failed: {message}',
      'card.testAllNone': 'No enabled MCP servers to test',
      'card.testAllRunning': 'Testing {count} enabled MCP servers...',
      'card.testAllDone': 'All {count} enabled MCP servers are reachable',
      'card.testAllPartial': 'Tested {total} servers, {ok} reachable',
      'card.libraryRemoved': 'Removed {name} from the library',
      'card.readOnly': 'Read-only',
      'card.readOnlyHint': 'This row cannot be rewritten safely and is view-only; create a copy in a writable scope.',
      'empty.title': 'No MCP servers match this filter',
      'empty.hint': 'Add a server and pick its workspaces, or switch to Available elsewhere to mount one in a click',
      'empty.add': '+ Add server (multi-workspace)',
      'empty.other': 'Other workspaces have no reusable servers yet',
      'state.loading': 'Loading MCP servers…',
      'state.unauthorized': 'This page is not authorized to read MCP servers',
      'state.error': 'Failed to load',
      'state.operationFailed': 'Operation failed',
      'state.unknownError': 'Unknown error',
      'state.invalidResponse': 'The host returned an invalid response',
      'state.requestFailed': 'Request failed; check the network or host',
      'state.testing': 'Handshaking and fetching tools...',
      'state.saving': 'Saving…',
      'warnings.title': 'Warnings',
      'editor.addTitle': 'Add MCP server',
      'editor.editTitle': 'Update MCP server · {name}',
      'editor.subtitle': 'Configure once and tag several workspaces; writes the MCP client row in the current profile cordis.patch.yml',
      'editor.tabStructured': 'Structured',
      'editor.tabJson': 'JSON (paste to share)',
      'editor.scopeTitle': 'Scope (target)',
      'editor.scopeBadge': 'Non-destructive merge',
      'editor.scopeHint': 'Tag the workspaces that plan to use this server; the Loader row is written to the current profile and applies to every session',
      'editor.scopeWorkspace': 'Specific workspaces (multi-select)',
      'editor.scopeGlobal': 'Global (all workspaces)',
      'editor.scopeLocked': 'The scope cannot change after creation',
      'editor.mergePreview': '🎯 Workspace tags: {names}; merges the dsh-mcp-client row config in the profile cordis.patch.yml ({path}) without touching other settings or MCP servers.',
      'editor.mergePreviewGlobal': '🌐 Writes the dsh-mcp-client row in the global cordis.patch.yml ({path}); effective for every profile.',
      'editor.mergeEmpty': '⚠️ Select at least one workspace, or switch to Global',
      'editor.wsExisting': '{count} MCP servers · other settings preserved',
      'editor.wsEmpty': 'No workspaces yet',
      'editor.section1': '1. Identity and transport',
      'editor.section2stdio': '2. Local process (STDIO)',
      'editor.section2remote': '2. Remote endpoint and headers',
      'editor.section3': '3. Runtime, timeout, and tool permissions',
      'editor.serverId': 'Server ID (key)',
      'editor.serverIdPlaceholder': 'e.g. redis-cluster-mcp or postgres-prod',
      'editor.description': 'Display name / note',
      'editor.descriptionPlaceholder': 'e.g. shared cache and session analytics',
      'editor.transport': 'Transport',
      'editor.transportStdioBadge': 'Local process',
      'editor.transportHttpBadge': 'Recommended',
      'editor.transportSseBadge': 'Remote events',
      'editor.transportStdioDesc': 'Spawn a local process with npx, uvx, python, or docker',
      'editor.transportHttpDesc': 'The standard streaming HTTP endpoint with reconnect and auth',
      'editor.transportSseDesc': 'Long-lived HTTP Server-Sent Events transport',
      'editor.sseUnsupported': 'SSE is not supported by this DSH version; use streamable-http',
      'editor.command': 'Command',
      'editor.commandPlaceholder': 'npx / uvx / node / docker',
      'editor.cwd': 'Working directory (cwd, optional)',
      'editor.cwdPlaceholder': 'workspaceFolder variable or /abs/path/to/server',
      'editor.args': 'Arguments (one per line; spaces inside a line are preserved)',
      'editor.env': 'Environment variables (env)',
      'editor.url': 'Remote URL (url)',
      'editor.urlPlaceholder': 'https://mcp.internal.company.com/v1/mcp',
      'editor.headers': 'Custom headers (headers)',
      'editor.oauth': 'OAuth 2.1 / Bearer auth',
      'editor.oauthHint': 'Enable when the remote server needs user authorization or token refresh',
      'editor.oauthClientId': 'Client ID',
      'editor.oauthClientIdPlaceholder': 'ds_harness_mcp_client',
      'editor.oauthScopes': 'Scopes (space separated)',
      'editor.oauthScopesPlaceholder': 'read:tools execute:query',
      'editor.timeout': 'Request timeout (ms)',
      'editor.retries': 'Retry count (maxRetries)',
      'editor.maxInstructionBytes': 'Instruction byte cap (maxInstructionBytes)',
      'editor.failOnStartupError': 'Fail activation when the first connection fails (failOnStartupError)',
      'editor.reconnect': 'Reconnect policy (reconnect)',
      'editor.reconnectEnabled': 'Auto reconnect',
      'editor.reconnectInitialDelayMs': 'Initial delay (ms)',
      'editor.reconnectMaxDelayMs': 'Max delay (ms)',
      'editor.reconnectMaxAttempts': 'Max attempts',
      'editor.capabilities': 'Capabilities',
      'editor.capTools': 'Tools',
      'editor.capResources': 'Resources',
      'editor.capPrompts': 'Prompts',
      'editor.autoApprove': 'Auto-approved tools (autoApprove, comma separated)',
      'editor.autoApprovePlaceholder': 'e.g. query_database, list_tables, describe_table',
      'editor.disabledTools': 'Blocked tools (disabledTools, comma separated)',
      'editor.disabledToolsPlaceholder': 'e.g. drop_table, delete_repository',
      'editor.jsonHint': 'Paste a shared mcpServers JSON or a single node; it is parsed into the structured form:',
      'editor.jsonPlaceholder': 'Paste mcpServers JSON or a single server node here…',
      'editor.jsonValid': '✓ Valid JSON; synced with the structured form',
      'editor.jsonInvalid': 'Invalid JSON: {message}',
      'editor.jsonFormatted': '✓ JSON formatted',
      'editor.jsonParsed': '✓ Parsed server "{name}" into the structured form',
      'editor.jsonShape': 'No server object found in the JSON',
      'editor.jsonCopied': 'Copied the JSON of this MCP node',
      'editor.jsonSample': 'Pasted a shared JSON sample and synced it into the structured form',
      'editor.testOk': '✓ Handshake succeeded ({ms}ms · protocol {version} · {tools} tools)',
      'editor.testFail': '✗ {message}',
      'editor.validationName': 'Enter a valid server ID (1–32 letters, digits, underscores, or hyphens)',
      'editor.validationCommand': 'Enter a command',
      'editor.validationUrl': 'Enter a valid http(s) URL',
      'editor.validationWorkspaces': 'Select at least one workspace, or switch to Global',
      'editor.validationSse': 'SSE is not supported by this DSH version; use streamable-http',
      'editor.validationTimeout': 'Timeout must be a positive integer',
      'editor.validationRetries': 'Retry count must be an integer from 0 to 100',
      'editor.validationNumber': 'Enter a positive integer',
      'editor.jsonBlocked': 'Fix the JSON syntax before saving or testing',
      'editor.jsonReset': 'Discard JSON edits and restore the form',
      'editor.jsonDiscardConfirm': 'The JSON is invalid. Discard these edits and switch back to the structured form?',
      'editor.jsonDiscardYes': 'Discard and switch',
      'editor.jsonDiscardNo': 'Keep editing JSON',
      'editor.syncHint': 'Under a single DSH profile, an update applies to that row',
      'editor.npxFilled': 'Filled the Brave Search MCP template',
      'editor.created': 'Added "{name}" and merged it into {target}',
      'editor.updated': 'Saved and merged into {target}',
      'editor.targetGlobal': 'the global config',
      'editor.targetWorkspace': 'the current workspace config',
      'editor.required': 'Required',
      'editor.kvKeyEnv': 'ENV_KEY (e.g. API_KEY)',
      'editor.kvValEnv': 'value',
      'editor.kvKeyHeader': 'Header name (e.g. Authorization)',
      'editor.kvValHeader': 'Bearer token...',
      'editor.removeRow': 'Remove this row',
      'manage.title': 'Manage MCP workspaces',
      'manage.subtitle': 'Check or uncheck workspaces to update the organizational tags; the Loader row itself is unchanged',
      'manage.target': 'Target MCP server:',
      'manage.global': '🌐 Global (all workspaces)',
      'manage.toWorkspace': 'Move to current workspace',
      'manage.globalBadge': 'effective everywhere',
      'manage.globalHint': 'Written to the global config; no per-workspace mounting',
      'manage.workspaceHint': 'Removed from the global layer; written only to the current profile config',
      'manage.specific': 'Or pick the workspaces that should carry this MCP:',
      'manage.existing': '{count} MCP servers',
      'manage.note': '✓ Non-destructive: only the library workspace tags change; all settings and other MCP servers stay.',
      'manage.empty': 'No workspaces yet',
      'manage.saved': 'Updated the workspace tags of {name}',
      'manage.moved': 'Moved {name} to {target}',
      'delete.title': 'Remove / delete MCP server',
      'delete.descMulti': '{name} is tagged for {names}; this row applies to the whole current profile. Choose the operation scope:',
      'delete.descSingle': 'Removes {name} from {scope} without touching other settings or MCP servers.',
      'delete.descGlobalScope': 'the global config file',
      'delete.descWorkspaceScope': 'the current profile config',
      'delete.optCurrent': 'Remove from the current profile only (keep the library entry)',
      'delete.optCurrentSub': 'Removes only this row from the current profile layer; the library entry stays for later reuse',
      'delete.optCurrentGlobal': 'Remove from the global config only (keep the library entry)',
      'delete.optCurrentGlobalSub': 'Removes only this row from the global layer; the library entry stays for later reuse',
      'delete.optAll': 'Also delete from the server library',
      'delete.optAllSub': 'Removes the row from the current profile layer and drops the library entry',
      'delete.optAllGlobal': 'Also delete from the server library',
      'delete.optAllGlobalSub': 'Removes the row from the global layer and drops the library entry',
      'delete.tagsNote': 'Workspace tags are organizational only; this MCP row applies to the whole current profile.',
      'delete.confirm': 'Confirm',
      'delete.libraryTitle': 'Remove from the server library',
      'delete.libraryDesc': 'Only the catalog entry is removed; servers already configured in a layer stay untouched.',
      'delete.done': 'Removed MCP server {name}',
      'delete.purged': 'Permanently deleted {name}',
      'config.title': 'Config file viewer',
      'config.titlePath': 'Config file · {path}',
      'config.subtitle': 'Raw cordis.patch.yml of the current layer, read-only; comments and other plugin rows included',
      'config.tabWorkspace': '📁 Current profile',
      'config.tabGlobal': '🌐 Global',
      'config.path': 'File: {path}',
      'config.copy': 'Copy all',
      'config.copied': 'Copied the config file',
      'config.readonly': 'Read-only; use the server cards above to make changes.',
      'config.close': 'Close',
      'config.empty': 'Nothing to display in this layer',
      'config.unknownPath': 'Unknown path',
      'tooltip.closeDialog': 'Close dialog',
      'tooltip.closeManage': 'Close workspace dialog',
      'tooltip.closeConfig': 'Close config file dialog',
      'tooltip.openConfig': 'View config file',
      'tooltip.testAll': 'Test all enabled MCP servers',
      'tooltip.enable': 'Enable MCP server',
      'tooltip.disable': 'Disable MCP server',
      'tooltip.test': 'Test connectivity',
      'tooltip.manage': 'Manage workspaces',
      'tooltip.edit': 'Update MCP server config',
      'tooltip.delete': 'Delete MCP server',
      'tooltip.removeRow': 'Remove this row',
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

    function isObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    }

    function splitComma(text) {
      return textOf(text).split(',').map((part) => part.trim()).filter((part) => part !== '')
    }

    /** A `!!js` tagged config value (`{ $js: 'process.env.TOKEN' }`), kept opaque. */
    function isJsMarker(value) {
      return isObject(value) && typeof value.$js === 'string'
    }

    /**
     * Display syntax for an opaque `!!js` marker: `@@js:<expression>@@`. A plain string
     * that starts with either reserved prefix is escaped as `@@str:<original>` so the
     * round-trip stays type-preserving: opening and saving a literal never turns it
     * into an executable expression, and `@@str:y` never loses its literal prefix.
     */
    const JS_MARKER_PREFIX = '@@js:'
    const STR_ESCAPE_PREFIX = '@@str:'
    const JS_MARKER_PATTERN = /^@@js:([\s\S]*)@@$/u

    /** Render one env/header/args value for a structured control, keeping `!!js` expressions. */
    function displayValueOf(value) {
      if (isJsMarker(value)) return JS_MARKER_PREFIX + value.$js + '@@'
      const raw = textOf(value)
      // A plain string that looks like a marker (or is already escaped) gets the escape
      // prefix; without it, the parser below would promote it to an expression.
      if (raw.startsWith(JS_MARKER_PREFIX) || raw.startsWith(STR_ESCAPE_PREFIX)) return STR_ESCAPE_PREFIX + raw
      return raw
    }

    /** Restore a control value: `@@str:` is a literal, `@@js:...@@` the opaque Host marker. */
    function valueFromText(text) {
      const raw = textOf(text)
      if (raw.startsWith(STR_ESCAPE_PREFIX)) return raw.slice(STR_ESCAPE_PREFIX.length)
      const match = JS_MARKER_PATTERN.exec(raw)
      return match !== null ? { $js: match[1] } : raw
    }

    /** One argument per line; line content is preserved verbatim, only empty lines are dropped. */
    function argsFromText(text) {
      return textOf(text).split(/\r?\n/u).filter((line) => line !== '').map((line) => valueFromText(line))
    }

    /** Structured textarea rendering of the raw args array; the JSON tab never uses this. */
    function argsTextOf(args) {
      if (!Array.isArray(args)) return ''
      return args.map((entry) => displayValueOf(entry)).join('\n')
    }

    /** Whitespace-separated list (OAuth scopes), never used for command arguments. */
    function splitWhitespace(text) {
      return textOf(text).split(/\s+/u).map((part) => part.trim()).filter((part) => part !== '')
    }

    function numberTextOf(value, fallback) {
      return typeof value === 'number' && Number.isFinite(value) ? String(value) : String(fallback)
    }

    function entriesOf(object) {
      if (!isObject(object)) return []
      return Object.keys(object).map((key) => ({ key: key, value: displayValueOf(object[key]) }))
    }

    function objectFromRows(rows) {
      const result = {}
      if (!Array.isArray(rows)) return result
      for (const row of rows) {
        if (!isObject(row)) continue
        const key = textOf(row.key).trim()
        if (key === '') continue
        result[key] = valueFromText(row.value)
      }
      return result
    }

    function integerText(text) {
      const raw = textOf(text).trim()
      if (raw === '') return null
      const value = Number(raw)
      if (!Number.isFinite(value) || !Number.isInteger(value)) return null
      return value
    }

    function transportOf(config) {
      if (!isObject(config)) return 'stdio'
      const declared = textOf(config.transport !== undefined ? config.transport : config.type).toLowerCase()
      if (declared === 'streamable-http' || declared === 'http') return 'streamable-http'
      if (declared === 'sse') return 'sse'
      if (declared === 'stdio') return 'stdio'
      return textOf(config.url) !== '' ? 'streamable-http' : 'stdio'
    }

    /** One-line display target for a stored config (same idea as the host's `target`). */
    function targetOfConfig(config) {
      if (!isObject(config)) return DASH
      if (transportOf(config) === 'stdio') {
        const parts = [textOf(config.command)]
        if (Array.isArray(config.args)) {
          for (const entry of config.args) {
            const value = displayValueOf(entry)
            if (value !== '') parts.push(value)
          }
        }
        const line = parts.filter((part) => part !== '').join(' ')
        return line !== '' ? line : DASH
      }
      const url = textOf(config.url)
      return url !== '' ? url : DASH
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
        if (!isObject(entry)) continue
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
        /* fall through: the caller shows a manual-copy hint */
      }
      return false
    }

    /** Focus without scrolling the page; opening/closing a dialog must not move the view. */
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

    /*
     * Modal scroll lock. The first open dialog hides the page scrollbar (compensating its
     * width so the layout does not shift) and the last close restores the previous inline
     * styles. Scroll position is never touched.
     */
    let pageScrollLocks = 0
    let pageScrollSnapshot = null

    function lockPageScroll() {
      if (typeof document === 'undefined' || document === null) return
      if (pageScrollLocks === 0) {
        const root = document.documentElement
        const body = document.body
        const gap = typeof window !== 'undefined' && window !== null && root !== null && root !== undefined
          ? Math.max(0, window.innerWidth - root.clientWidth)
          : 0
        pageScrollSnapshot = {
          rootOverflow: root !== null && root !== undefined ? root.style.overflow : '',
          bodyOverflow: body !== null && body !== undefined ? body.style.overflow : '',
          bodyPaddingRight: body !== null && body !== undefined ? body.style.paddingRight : '',
        }
        if (root !== null && root !== undefined) root.style.overflow = 'hidden'
        if (body !== null && body !== undefined) {
          body.style.overflow = 'hidden'
          if (gap > 0) body.style.paddingRight = gap + 'px'
        }
      }
      pageScrollLocks += 1
    }

    function unlockPageScroll() {
      if (typeof document === 'undefined' || document === null) return
      pageScrollLocks = Math.max(0, pageScrollLocks - 1)
      if (pageScrollLocks !== 0 || pageScrollSnapshot === null) return
      const root = document.documentElement
      const body = document.body
      if (root !== null && root !== undefined) root.style.overflow = pageScrollSnapshot.rootOverflow
      if (body !== null && body !== undefined) {
        body.style.overflow = pageScrollSnapshot.bodyOverflow
        body.style.paddingRight = pageScrollSnapshot.bodyPaddingRight
      }
      pageScrollSnapshot = null
    }

    /** Open dialogs stack in mount order; only the topmost reacts to Escape / backdrop clicks. */
    const dialogStack = []

    /* ------------------------------------------------------------------ *
     * 1000ms delayed self-drawn tooltip engine (icon buttons only).      *
     * ------------------------------------------------------------------ */

    const tooltip = {
      timer: null,
      target: null,
      label: '',
      node: null,
    }

    function ensureTooltipNode() {
      if (typeof document === 'undefined' || document === null) return null
      if (tooltip.node !== null && document.body.contains(tooltip.node)) return tooltip.node
      const node = document.createElement('div')
      node.className = 'mm-tooltip'
      node.setAttribute('role', 'tooltip')
      node.style.left = '0px'
      node.style.top = '0px'
      node.style.visibility = 'hidden'
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

    /** True while the self-drawn tooltip is actually painted (not merely scheduled). */
    function tooltipVisible() {
      return tooltip.target !== null
        && tooltip.target !== undefined
        && tooltip.node !== null
        && tooltip.node.classList.contains('mm-tooltip-show')
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

    function scheduleTooltip(label, target) {
      hideTooltip()
      const text = textOf(label)
      if (text === '' || target === null || target === undefined) return
      tooltip.target = target
      tooltip.label = text
      tooltip.timer = setTimeout(() => {
        tooltip.timer = null
        placeTooltip()
      }, 1000)
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

    /**
     * Render a failure for the UI. Only HTTP/parse failures get a generic localized
     * message; Host business errors (`ok:false` + `error`) surface their own text.
     */
    function describeError(t, error) {
      if (error !== null && error !== undefined) {
        if (error.code === 'protocol') return t('state.invalidResponse')
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
     * Presentation primitives.                                           *
     * ------------------------------------------------------------------ */

    function Button(props) {
      const className = 'mm-btn'
        + (props.variant !== undefined && props.variant !== '' ? ' mm-btn-' + props.variant : '')
        + (props.size === 'sm' ? ' mm-btn-sm' : '')
        + (props.block === true ? ' mm-btn-block' : '')
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      return h(
        'button',
        {
          type: 'button',
          className: className,
          disabled: props.disabled === true,
          onClick: props.onClick,
          'aria-label': props.ariaLabel,
          title: props.nativeTitle,
        },
        props.children,
      )
    }

    /**
     * Square icon button: the glyph is an inline SVG painted with `currentColor`, the
     * accessible name stays on the button, and the self-drawn tooltip shows after 1s.
     * Native `title` is intentionally not set.
     */
    function IconButton(props) {
      const className = 'mm-icon-btn'
        + (props.tone !== undefined && props.tone !== '' ? ' mm-icon-btn-' + props.tone : '')
        + (props.spin === true ? ' mm-icon-btn-spin' : '')
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      return h(
        'button',
        Object.assign(
          {
            type: 'button',
            className: className,
            disabled: props.disabled === true,
            onClick: props.onClick,
            'aria-label': props.label,
          },
          tooltipHandlers(props.tooltip),
        ),
        h(
          'svg',
          {
            className: 'mm-icon',
            viewBox: '0 0 24 24',
            width: 16,
            height: 16,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: props.strokeWidth !== undefined ? props.strokeWidth : 1.9,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true',
            focusable: 'false',
          },
          props.children,
        ),
      )
    }

    function Chip(props) {
      const className = 'mm-chip'
        + (props.tone !== undefined && props.tone !== '' ? ' mm-chip-' + props.tone : '')
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      return h('span', { className: className, title: props.nativeTitle }, props.children)
    }

    function Dot(props) {
      return h('span', { className: 'mm-dot' + (props.tone !== undefined && props.tone !== '' ? ' mm-dot-' + props.tone : '') + (props.pulse === true ? ' mm-dot-pulse' : ''), 'aria-hidden': 'true' })
    }

    function Checkbox(props) {
      return h(
        'label',
        { className: 'mm-check' + (props.className !== undefined && props.className !== '' ? ' ' + props.className : ''), title: props.nativeTitle },
        h('input', {
          type: 'checkbox',
          checked: props.checked === true,
          disabled: props.disabled === true,
          onChange: (event) => {
            if (typeof props.onChange === 'function') props.onChange(event.target.checked)
          },
        }),
        h('span', { className: 'mm-check-label' }, props.label),
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
        type: props.type !== undefined ? props.type : 'text',
        className: 'mm-input'
          + (props.mono === true ? ' mm-mono' : '')
          + (props.className !== undefined && props.className !== '' ? ' ' + props.className : ''),
        value: props.value,
        placeholder: props.placeholder,
        'aria-label': props.ariaLabel,
        disabled: props.disabled === true,
        spellCheck: false,
        min: props.min,
        max: props.max,
        step: props.step,
        onChange: (event) => {
          if (typeof props.onChange === 'function') props.onChange(event.target.value)
        },
      })
    }

    function TextArea(props) {
      return h('textarea', {
        className: 'mm-input mm-textarea' + (props.mono === true ? ' mm-mono' : '') + (props.fill === true ? ' mm-fill' : ''),
        value: props.value,
        placeholder: props.placeholder,
        disabled: props.disabled === true,
        rows: props.rows !== undefined ? props.rows : 4,
        spellCheck: false,
        onChange: (event) => {
          if (typeof props.onChange === 'function') props.onChange(event.target.value)
        },
        onBlur: () => {
          if (typeof props.onBlur === 'function') props.onBlur()
        },
      })
    }

    function Segmented(props) {
      return h(
        'div',
        { className: 'mm-seg' + (props.className !== undefined && props.className !== '' ? ' ' + props.className : ''), role: 'group', 'aria-label': props.ariaLabel },
        props.options.map((option) => h(
          'button',
          {
            key: option.value,
            type: 'button',
            className: 'mm-seg-btn' + (props.value === option.value ? ' mm-seg-btn-active' : ''),
            'aria-pressed': props.value === option.value ? 'true' : 'false',
            disabled: props.disabled === true || option.disabled === true,
            title: option.nativeTitle,
            onClick: () => {
              if (typeof props.onChange === 'function') props.onChange(option.value)
            },
          },
          option.dot !== undefined ? h(Dot, { tone: option.dot }) : null,
          h('span', { className: 'mm-seg-text' }, option.label),
          option.count !== undefined ? h('span', { className: 'mm-seg-count' }, String(option.count)) : null,
        )),
      )
    }

    function EmptyState(props) {
      return h(
        'div',
        { className: 'mm-empty' },
        h('strong', null, props.title),
        props.hint !== undefined && props.hint !== null ? h('span', null, props.hint) : null,
        props.actionLabel !== undefined && props.actionLabel !== null
          ? h(Button, { variant: 'primary', size: 'sm', onClick: props.onAction }, props.actionLabel)
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

    function ToastHost(props) {
      const toasts = Array.isArray(props.toasts) ? props.toasts : []
      if (toasts.length === 0) return null
      return h(
        'div',
        { className: 'mm-toasts', 'aria-live': 'polite' },
        toasts.map((toast) => h(
          'div',
          {
            key: toast.id,
            className: 'mm-toast mm-toast-' + (toast.kind !== undefined ? toast.kind : 'info') + (toast.leaving === true ? ' mm-toast-leaving' : ''),
          },
          h('span', { className: 'mm-toast-dot' }),
          h('span', { className: 'mm-toast-text' }, toast.text),
        )),
      )
    }

    /**
     * Fixed-size modal with a transparent backdrop. Only the topmost dialog reacts to
     * Escape and backdrop clicks. The body scrolls; the frame never changes size.
     */
    function Dialog(props) {
      const boxRef = useRef(null)
      const backdropRef = useRef(null)
      const onCloseRef = useRef(props.onClose)
      onCloseRef.current = props.onClose
      const stackToken = useRef({})

      useEffect(() => {
        const token = stackToken.current
        dialogStack.push(token)
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          if (dialogStack.length === 0 || dialogStack[dialogStack.length - 1] !== token) return
          event.preventDefault()
          event.stopImmediatePropagation()
          event.stopPropagation()
          // Layered dismissal: a visible tooltip consumes the first Escape; the dialog
          // only closes on the next one.
          if (tooltipVisible()) {
            hideTooltip()
            return
          }
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
        lockPageScroll()
        return () => {
          unlockPageScroll()
        }
      }, [])

      useEffect(() => {
        const node = backdropRef.current
        if (node === null || node === undefined || typeof node.addEventListener !== 'function') return undefined
        const canScroll = (target, deltaX, deltaY) => {
          let current = target
          while (current !== null && current !== undefined && current !== node) {
            if (current.nodeType === 1) {
              const style = typeof window !== 'undefined' && window !== null ? window.getComputedStyle(current) : null
              if (style !== null) {
                if (deltaY !== 0 && (style.overflowY === 'auto' || style.overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
                  if (deltaY > 0 ? current.scrollTop + current.clientHeight < current.scrollHeight : current.scrollTop > 0) return true
                }
                if (deltaX !== 0 && (style.overflowX === 'auto' || style.overflowX === 'scroll') && current.scrollWidth > current.clientWidth) {
                  if (deltaX > 0 ? current.scrollLeft + current.clientWidth < current.scrollWidth : current.scrollLeft > 0) return true
                }
              }
            }
            current = current.parentNode
          }
          return false
        }
        const onWheel = (event) => {
          if (canScroll(event.target, event.deltaX, event.deltaY)) return
          event.preventDefault()
        }
        let touchOrigin = null
        const onTouchStart = (event) => {
          if (event.touches.length !== 1) {
            touchOrigin = null
            return
          }
          const touch = event.touches[0]
          touchOrigin = { x: touch.clientX, y: touch.clientY }
        }
        const onTouchEnd = () => {
          touchOrigin = null
        }
        const onTouchMove = (event) => {
          const touch = event.touches.length === 1 ? event.touches[0] : null
          if (touch === null || touchOrigin === null) {
            event.preventDefault()
            return
          }
          const deltaX = touch.clientX - touchOrigin.x
          const deltaY = touch.clientY - touchOrigin.y
          if (deltaX === 0 && deltaY === 0) return
          const horizontal = Math.abs(deltaX) > Math.abs(deltaY)
          const allowed = horizontal ? canScroll(event.target, -deltaX, 0) : canScroll(event.target, 0, -deltaY)
          touchOrigin = { x: touch.clientX, y: touch.clientY }
          if (allowed) return
          event.preventDefault()
        }
        node.addEventListener('wheel', onWheel, { passive: false })
        node.addEventListener('touchstart', onTouchStart, { passive: true })
        node.addEventListener('touchmove', onTouchMove, { passive: false })
        node.addEventListener('touchend', onTouchEnd)
        node.addEventListener('touchcancel', onTouchEnd)
        return () => {
          node.removeEventListener('wheel', onWheel)
          node.removeEventListener('touchstart', onTouchStart)
          node.removeEventListener('touchmove', onTouchMove)
          node.removeEventListener('touchend', onTouchEnd)
          node.removeEventListener('touchcancel', onTouchEnd)
        }
      }, [])

      useEffect(() => {
        const node = boxRef.current
        if (node !== null && typeof node.querySelector === 'function') {
          focusQuietly(node.querySelector('input, select, textarea, button'))
        }
        const returnFocus = props.returnFocus
        return () => {
          focusQuietly(returnFocus)
        }
      }, [props.returnFocus])

      const sizeClass = props.size !== undefined && props.size !== '' ? ' mm-dialog-' + props.size : ''
      return h(
        'div',
        {
          className: 'mm-backdrop',
          ref: backdropRef,
          onMouseDown: (event) => {
            if (event.target !== event.currentTarget) return
            if (dialogStack.length === 0 || dialogStack[dialogStack.length - 1] !== stackToken.current) return
            // Layered dismissal, same as Escape: a visible tooltip consumes the click;
            // the dialog only closes when no tooltip is painted.
            if (tooltipVisible()) {
              hideTooltip()
              return
            }
            hideTooltip()
            const close = onCloseRef.current
            if (typeof close === 'function') close()
          },
        },
        h(
          'div',
          {
            className: 'mm-dialog' + sizeClass,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            ref: boxRef,
          },
          h(
            'div',
            { className: 'mm-dialog-head' },
            h(
              'div',
              { className: 'mm-dialog-titles' },
              h('h2', { className: 'mm-dialog-title' }, props.title),
              props.subtitle !== undefined && props.subtitle !== null
                ? h('p', { className: 'mm-dialog-sub' }, props.subtitle)
                : null,
            ),
            h(
              'div',
              { className: 'mm-dialog-head-actions' },
              props.headerExtra !== undefined && props.headerExtra !== null ? props.headerExtra : null,
              h(
                IconButton,
                {
                  label: props.closeLabel,
                  tooltip: props.closeTooltip,
                  onClick: () => {
                    hideTooltip()
                    if (typeof props.onClose === 'function') props.onClose()
                  },
                  tone: 'plain',
                },
                h('path', { d: 'M6 18L18 6M6 6l12 12' }),
              ),
            ),
          ),
          h('div', { className: 'mm-dialog-body' + (props.bodyClass !== undefined && props.bodyClass !== '' ? ' ' + props.bodyClass : '') }, props.children),
          props.footer !== undefined && props.footer !== null
            ? h('div', { className: 'mm-dialog-foot' }, props.footer)
            : null,
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * Row / library card.                                                *
     * ------------------------------------------------------------------ */

    function rowStatus(t, row, testing) {
      if (testing === true) return { tone: 'warn', text: t('card.testing'), pulse: true, detail: '' }
      if (row.disabled === true) return { tone: 'muted', text: t('card.disabled'), pulse: false, detail: '' }
      const probe = row.lastProbe
      if (isObject(probe)) {
        if (probe.ok === true) {
          const ms = typeof probe.durationMs === 'number' && Number.isFinite(probe.durationMs) ? Math.round(probe.durationMs) : null
          return { tone: 'ok', text: ms !== null ? t('card.connectedMs', { ms: ms }) : t('card.connected'), pulse: false, detail: '' }
        }
        if (probe.ok === false) {
          const detail = isObject(probe.error) ? textOf(probe.error.message) : ''
          return { tone: 'err', text: t('card.testFailed'), pulse: false, detail: detail }
        }
      }
      if (isObject(row.live)) {
        if (row.live.phase === 'failed') return { tone: 'err', text: t('card.liveFailed'), pulse: false, detail: '' }
        if (row.live.phase === 'active') return { tone: 'ok', text: t('card.connected'), pulse: false, detail: '' }
        if (row.live.phase === 'inactive') return { tone: 'muted', text: t('card.notLoaded'), pulse: false, detail: '' }
      }
      return { tone: 'muted', text: t('card.unknown'), pulse: false, detail: '' }
    }

    function toolNamesOf(row) {
      const probe = isObject(row) ? row.lastProbe : null
      if (!isObject(probe) || !Array.isArray(probe.toolNames)) return []
      return probe.toolNames.map((name) => textOf(name)).filter((name) => name !== '')
    }

    function ServerCard(props) {
      const t = props.t
      const item = props.item
      const library = props.kind === 'library'
      const row = item
      const enabled = library === false && row.disabled !== true
      const readOnly = library === false && row.readOnly === true
      const config = isObject(row.config) ? row.config : {}
      const extra = isObject(row.extra) ? row.extra : {}
      const transport = transportOf(config)
      const status = library === true
        ? { tone: 'warn', text: t('card.notApplied'), pulse: false, detail: '' }
        : rowStatus(t, row, props.testing === true || (props.testingAll === true && enabled))
      const description = textOf(row.description) !== '' ? row.description : t('card.noDescription')
      const target = library === false && textOf(row.target) !== '' ? row.target : targetOfConfig(config)
      const toolCount = library === false && typeof row.toolCount === 'number' && Number.isFinite(row.toolCount) ? row.toolCount : null
      const expandLabel = toolCount !== null ? t('card.toolsDetails', { count: toolCount }) : t('card.details')
      const toolNames = library === false ? toolNamesOf(row) : []
      const autoApprove = Array.isArray(extra.autoApprove) ? extra.autoApprove.map((name) => textOf(name)) : []
      const disabledTools = Array.isArray(extra.disabledTools) ? extra.disabledTools.map((name) => textOf(name)) : []
      const rowWorkspaces = Array.isArray(row.workspaces) ? row.workspaces.map((path) => textOf(path)).filter((path) => path !== '') : []
      const scopeNames = rowWorkspaces.map((path) => workspaceLabel(props.workspaces, path)).join('、')
      const timeout = typeof config.toolCallTimeoutMs === 'number' && Number.isFinite(config.toolCallTimeoutMs) ? config.toolCallTimeoutMs : 60000
      const writePath = row.level === 'global'
        ? (props.homePatch !== '' ? props.homePatch : t('config.unknownPath'))
        : (props.profilePatch !== '' ? props.profilePatch : t('config.unknownPath'))
      const dim = library === true || enabled === false
      const scopeChip = library === true
        ? h(Chip, { tone: 'warn', nativeTitle: t('card.otherScope') }, t('card.otherScope'))
        : h(
          'button',
          {
            type: 'button',
            className: 'mm-scope-chip mm-scope-wrap',
            title: row.level === 'global' ? t('card.globalScopeTitle') : t('card.scopeTitle'),
            'aria-disabled': readOnly === true ? 'true' : undefined,
            onClick: () => {
              if (readOnly === true) return
              if (typeof props.onManage === 'function') props.onManage(row)
            },
          },
          h(
            Chip,
            { tone: row.level === 'global' ? 'global' : 'brand' },
            h('span', { className: 'mm-chip-text' }, row.level === 'global'
              ? t('card.globalScope')
              : rowWorkspaces.length > 0
                ? t('card.workspaceScope', { names: scopeNames })
                : t('card.profileScope')),
            row.level === 'global'
              ? null
              : h('svg', { className: 'mm-scope-chevron', viewBox: '0 0 24 24', width: 10, height: 10, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M19 9l-7 7-7-7' })),
          ),
        )
      const actions = library === true
        ? h(
          Fragment,
          null,
          h(
            Button,
            {
              variant: 'brand',
              size: 'sm',
              disabled: props.busy === true,
              onClick: () => {
                if (typeof props.onApply === 'function') props.onApply(row)
              },
            },
            h('svg', { className: 'mm-icon', viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M12 4v16m8-8H4' })),
            h('span', null, t('action.applyCurrent', { name: props.currentName })),
          ),
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              disabled: props.busy === true,
              onClick: () => {
                if (typeof props.onApplyEdit === 'function') props.onApplyEdit(row)
              },
            },
            h('svg', { className: 'mm-icon', viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' })),
            h('span', null, t('action.applyAndEdit')),
          ),
          h(
            IconButton,
            {
              label: t('action.manage'),
              tooltip: t('tooltip.manage'),
              tone: 'brand',
              disabled: props.busy === true,
              onClick: () => {
                if (typeof props.onManageLibrary === 'function') props.onManageLibrary(row)
              },
            },
            h('path', { d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }),
          ),
          h(
            IconButton,
            {
              label: t('delete.libraryTitle'),
              tooltip: t('delete.libraryTitle'),
              tone: 'danger',
              disabled: props.busy === true,
              onClick: () => {
                if (typeof props.onDelete === 'function') props.onDelete(row)
              },
            },
            h('path', { d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }),
          ),
        )
        : h(
          Fragment,
          null,
          h(
            IconButton,
            {
              label: enabled ? t('action.toggleDisable') : t('action.toggleEnable'),
              tooltip: enabled ? t('tooltip.disable') : t('tooltip.enable'),
              tone: enabled ? 'ok' : 'plain',
              disabled: readOnly === true || props.busy === true,
              onClick: () => {
                if (typeof props.onToggleEnabled === 'function') props.onToggleEnabled(row)
              },
            },
            h('path', { d: 'M12 3v9m6.364-5.364a9 9 0 11-12.728 0' }),
          ),
          h(
            IconButton,
            {
              label: t('action.testOne'),
              tooltip: t('tooltip.test'),
              tone: props.testing === true || (props.testingAll === true && enabled) ? 'warn' : 'brand',
              spin: props.testing === true || (props.testingAll === true && enabled),
              disabled: readOnly === true || props.busy === true,
              onClick: () => {
                if (typeof props.onTest === 'function') props.onTest(row)
              },
            },
            h('path', { d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' }),
          ),
          h(
            IconButton,
            {
              label: t('action.manage'),
              tooltip: t('tooltip.manage'),
              tone: 'brand',
              disabled: readOnly === true || props.busy === true,
              onClick: () => {
                if (typeof props.onManage === 'function') props.onManage(row)
              },
            },
            h('path', { d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }),
          ),
          h(
            IconButton,
            {
              label: t('action.edit'),
              tooltip: t('tooltip.edit'),
              tone: 'plain',
              disabled: readOnly === true || props.busy === true,
              onClick: () => {
                if (typeof props.onEdit === 'function') props.onEdit(row)
              },
            },
            h('path', { d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' }),
          ),
          h(
            IconButton,
            {
              label: t('action.delete'),
              tooltip: t('tooltip.delete'),
              tone: 'danger',
              disabled: readOnly === true || props.busy === true,
              onClick: () => {
                if (typeof props.onDelete === 'function') props.onDelete(row)
              },
            },
            h('path', { d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }),
          ),
        )
      return h(
        'article',
        { className: 'mm-card' + (dim ? ' mm-card-dim' : '') },
        h(
          'div',
          { className: 'mm-card-main' },
          h(
            'div',
            { className: 'mm-card-row1' },
            h(Dot, { tone: status.tone, pulse: status.pulse === true }),
            h('span', { className: 'mm-card-id', title: row.serverName }, row.serverName),
            scopeChip,
            h(Chip, { tone: 'neutral', className: 'mm-chip-mono' }, transport),
            transport === 'sse' ? h(Chip, { tone: 'err' }, t('card.sseUnsupported')) : null,
            h('span', { className: 'mm-status mm-status-' + status.tone, title: status.detail !== '' ? status.detail : undefined }, status.text),
            readOnly === true ? h(Chip, { tone: 'warn' }, t('card.readOnly')) : null,
          ),
          h('p', { className: 'mm-card-desc' }, description),
          library === true && rowWorkspaces.length > 0
            ? h(
              'div',
              { className: 'mm-ws-badges' },
              rowWorkspaces.map((path) => h(
                Chip,
                { key: path, tone: 'brand', className: 'mm-chip-ws', nativeTitle: path },
                workspaceLabel(props.workspaces, path),
              )),
            )
            : null,
          h(
            'div',
            { className: 'mm-card-row3' },
            h('span', { className: 'mm-card-endpoint mm-mono', title: target }, target),
            h(
              'button',
              {
                type: 'button',
                className: 'mm-expand',
                'aria-expanded': props.expanded === true ? 'true' : 'false',
                onClick: () => {
                  if (typeof props.onToggleExpand === 'function') props.onToggleExpand()
                },
              },
              h('span', null, expandLabel),
              h('svg', { className: 'mm-chevron' + (props.expanded === true ? ' mm-chevron-open' : ''), viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M19 9l-7 7-7-7' })),
            ),
          ),
        ),
        h('div', { className: 'mm-card-actions' }, actions),
        props.expanded === true
          ? h(
            'div',
            { className: 'mm-card-detail' },
            h(
              'div',
              { className: 'mm-detail-row' },
              h('span', { className: 'mm-detail-label' }, t('card.toolsTitle')),
              toolNames.length === 0
                ? h('span', { className: 'mm-muted' }, t('card.noTools'))
                : h(
                  'div',
                  { className: 'mm-chips-row' },
                  toolNames.map((tool) => {
                    const auto = autoApprove.includes(tool)
                    const blocked = disabledTools.includes(tool)
                    return h(
                      Chip,
                      { key: tool, tone: blocked ? 'err' : auto ? 'ok' : 'neutral', className: blocked ? 'mm-chip-strike' : '' },
                      tool,
                      auto ? ' ✓' + t('card.autoApprove') : '',
                      blocked ? ' · ' + t('card.blocked') : '',
                    )
                  }),
                ),
            ),
            h(
              'div',
              { className: 'mm-detail-row mm-detail-meta' },
              library === true
                ? h('span', null, t('card.notConfigured'))
                : h('span', null, t('card.writePath', { path: writePath })),
              h('span', null, t('card.timeout', { ms: timeout })),
              h(
                'button',
                {
                  type: 'button',
                  className: 'mm-link',
                  onClick: () => {
                    if (typeof props.onCopyShare === 'function') props.onCopyShare(row)
                  },
                },
                t('action.copyShareJson'),
              ),
            ),
            readOnly === true ? h('p', { className: 'mm-hint' }, t('card.readOnlyHint')) : null,
          )
          : null,
      )
    }

    /* ------------------------------------------------------------------ *
     * Editor draft helpers.                                              *
     * ------------------------------------------------------------------ */

    function emptyRows() {
      return [{ key: '', value: '' }]
    }

    function makeDraft(mode, row) {
      if (mode === 'edit' && isObject(row)) {
        const config = isObject(row.config) ? row.config : {}
        const extra = isObject(row.extra) ? row.extra : {}
        const oauth = isObject(extra.oauth) ? extra.oauth : {}
        const caps = isObject(extra.capabilities) ? extra.capabilities : {}
        const reconnect = isObject(config.reconnect) ? config.reconnect : {}
        const env = entriesOf(config.env)
        const headers = entriesOf(config.headers)
        const attached = Array.isArray(row.workspaces) ? row.workspaces.map((path) => textOf(path)).filter((path) => path !== '') : []
        return {
          scope: row.level === 'global' ? 'global' : 'workspace',
          workspaces: attached,
          serverName: textOf(row.serverName),
          description: textOf(row.description),
          transport: transportOf(config),
          command: textOf(config.command) !== '' ? textOf(config.command) : 'npx',
          // Raw args array: `!!js` markers survive JSON round-trips untouched.
          args: Array.isArray(config.args) ? config.args.slice() : [],
          cwd: textOf(config.cwd),
          envRows: env.length > 0 ? env : emptyRows(),
          url: textOf(config.url),
          headerRows: headers.length > 0 ? headers : emptyRows(),
          oauthEnabled: oauth.enabled === true,
          oauthClientId: textOf(oauth.clientId),
          oauthScopes: textOf(oauth.scopes),
          timeout: numberTextOf(config.toolCallTimeoutMs, 60000),
          maxRetries: numberTextOf(extra.maxRetries, 3),
          maxInstructionBytes: numberTextOf(config.maxInstructionBytes, 32768),
          failOnStartupError: config.failOnStartupError === true,
          reconnectEnabled: reconnect.enabled !== false,
          reconnectInitialDelayMs: numberTextOf(reconnect.initialDelayMs, 500),
          reconnectMaxDelayMs: numberTextOf(reconnect.maxDelayMs, 30000),
          reconnectMaxAttempts: numberTextOf(reconnect.maxAttempts, 10),
          capTools: caps.tools !== false,
          capResources: caps.resources !== false,
          capPrompts: caps.prompts !== false,
          autoApprove: Array.isArray(extra.autoApprove) ? extra.autoApprove.map((entry) => textOf(entry)).join(', ') : '',
          disabledTools: Array.isArray(extra.disabledTools) ? extra.disabledTools.map((entry) => textOf(entry)).join(', ') : '',
          enabled: row.disabled !== true,
        }
      }
      return {
        // New servers default to the global layer, as the user asked: no workspace must be
        // picked before saving, and the row applies to every session of this machine.
        scope: 'global',
        // No workspace is pre-selected: only explicit user choices or API data select one.
        workspaces: [],
        serverName: '',
        description: '',
        transport: 'stdio',
        command: 'npx',
        args: [],
        cwd: '',
        envRows: emptyRows(),
        url: '',
        headerRows: emptyRows(),
        oauthEnabled: false,
        oauthClientId: '',
        oauthScopes: '',
        timeout: '60000',
        maxRetries: '3',
        maxInstructionBytes: '32768',
        failOnStartupError: false,
        reconnectEnabled: true,
        reconnectInitialDelayMs: '500',
        reconnectMaxDelayMs: '30000',
        reconnectMaxAttempts: '10',
        capTools: true,
        capResources: true,
        capPrompts: true,
        autoApprove: '',
        disabledTools: '',
        enabled: true,
      }
    }

    function draftToNode(draft) {
      const node = {}
      const description = textOf(draft.description).trim()
      if (description !== '') node.description = description
      node.transport = draft.transport
      if (draft.enabled === false) node.disabled = true
      if (draft.transport === 'stdio') {
        node.command = textOf(draft.command).trim() !== '' ? textOf(draft.command).trim() : 'npx'
        node.args = Array.isArray(draft.args) ? draft.args.slice() : []
        const cwd = textOf(draft.cwd).trim()
        if (cwd !== '') node.cwd = cwd
        const env = objectFromRows(draft.envRows)
        if (Object.keys(env).length > 0) node.env = env
      } else {
        node.url = textOf(draft.url).trim()
        const headers = objectFromRows(draft.headerRows)
        if (Object.keys(headers).length > 0) node.headers = headers
        const oauthClientId = textOf(draft.oauthClientId).trim()
        const oauthScopes = textOf(draft.oauthScopes).trim()
        // Keep disabled OAuth details so switching tabs cannot silently drop them.
        if (draft.oauthEnabled === true || oauthClientId !== '' || oauthScopes !== '') {
          node.oauth = {
            enabled: draft.oauthEnabled === true,
            clientId: oauthClientId,
            scopes: splitWhitespace(oauthScopes),
          }
        }
      }
      const timeout = integerText(draft.timeout)
      node.toolCallTimeoutMs = timeout !== null ? timeout : 60000
      const retries = integerText(draft.maxRetries)
      node.maxRetries = retries !== null ? retries : 3
      const maxInstructionBytes = integerText(draft.maxInstructionBytes)
      node.maxInstructionBytes = maxInstructionBytes !== null ? maxInstructionBytes : 32768
      node.failOnStartupError = draft.failOnStartupError === true
      const reconnectInitialDelayMs = integerText(draft.reconnectInitialDelayMs)
      const reconnectMaxDelayMs = integerText(draft.reconnectMaxDelayMs)
      const reconnectMaxAttempts = integerText(draft.reconnectMaxAttempts)
      node.reconnect = {
        enabled: draft.reconnectEnabled !== false,
        initialDelayMs: reconnectInitialDelayMs !== null ? reconnectInitialDelayMs : 500,
        maxDelayMs: reconnectMaxDelayMs !== null ? reconnectMaxDelayMs : 30000,
        maxAttempts: reconnectMaxAttempts !== null ? reconnectMaxAttempts : 10,
      }
      node.capabilities = {
        tools: draft.capTools !== false,
        resources: draft.capResources !== false,
        prompts: draft.capPrompts !== false,
      }
      const autoApprove = splitComma(draft.autoApprove)
      if (autoApprove.length > 0) node.autoApprove = autoApprove
      const disabledTools = splitComma(draft.disabledTools)
      if (disabledTools.length > 0) node.disabledTools = disabledTools
      return node
    }

    function jsonTextOf(draft) {
      const name = textOf(draft.serverName).trim() !== '' ? textOf(draft.serverName).trim() : '<server-id>'
      return JSON.stringify({ mcpServers: { [name]: draftToNode(draft) } }, null, 2)
    }

    function applyJsonNode(draft, serverId, node) {
      if (!isObject(node)) return draft
      let transport = textOf(node.transport !== undefined ? node.transport : node.type).toLowerCase()
      if (transport === 'http') transport = 'streamable-http'
      if (transport !== 'stdio' && transport !== 'streamable-http' && transport !== 'sse') {
        const url = textOf(node.url)
        if (url !== '') transport = url.includes('/sse') ? 'sse' : 'streamable-http'
        else transport = 'stdio'
      }
      const oauth = isObject(node.oauth) ? node.oauth : {}
      const caps = isObject(node.capabilities) ? node.capabilities : {}
      const reconnect = isObject(node.reconnect) ? node.reconnect : {}
      const env = entriesOf(node.env)
      const headers = entriesOf(node.headers)
      // Keep the original array (including `!!js` marker objects) verbatim.
      const args = Array.isArray(node.args) ? node.args.slice() : []
      const autoApprove = Array.isArray(node.autoApprove) ? node.autoApprove.map((entry) => textOf(entry)) : []
      const disabledTools = Array.isArray(node.disabledTools) ? node.disabledTools.map((entry) => textOf(entry)) : []
      const scopes = Array.isArray(oauth.scopes) ? oauth.scopes.map((entry) => textOf(entry)).join(' ') : textOf(oauth.scopes)
      const timeout = typeof node.toolCallTimeoutMs === 'number' ? node.toolCallTimeoutMs : (typeof node.timeout === 'number' ? node.timeout : 60000)
      const retries = typeof node.maxRetries === 'number' ? node.maxRetries : 3
      return Object.assign({}, draft, {
        serverName: textOf(serverId),
        description: textOf(node.description),
        transport: transport,
        command: textOf(node.command) !== '' ? textOf(node.command) : 'npx',
        args: args,
        cwd: textOf(node.cwd),
        envRows: env.length > 0 ? env : emptyRows(),
        url: textOf(node.url),
        headerRows: headers.length > 0 ? headers : emptyRows(),
        oauthEnabled: oauth.enabled === true,
        oauthClientId: textOf(oauth.clientId),
        oauthScopes: scopes,
        timeout: numberTextOf(timeout, 60000),
        maxRetries: numberTextOf(retries, 3),
        maxInstructionBytes: numberTextOf(node.maxInstructionBytes, 32768),
        failOnStartupError: node.failOnStartupError === true,
        reconnectEnabled: reconnect.enabled !== false,
        reconnectInitialDelayMs: numberTextOf(reconnect.initialDelayMs, 500),
        reconnectMaxDelayMs: numberTextOf(reconnect.maxDelayMs, 30000),
        reconnectMaxAttempts: numberTextOf(reconnect.maxAttempts, 10),
        capTools: caps.tools !== false,
        capResources: caps.resources !== false,
        capPrompts: caps.prompts !== false,
        autoApprove: autoApprove.join(', '),
        disabledTools: disabledTools.join(', '),
        enabled: node.disabled !== true,
      })
    }

    /** A JSON value only counts as a server object when it names a transport or endpoint. */
    function looksLikeServerNode(node) {
      return isObject(node)
        && (node.command !== undefined
          || node.url !== undefined
          || node.transport !== undefined
          || node.type !== undefined
          || node.serverName !== undefined
          || node.name !== undefined)
    }

    function pickJsonNode(parsed, fallbackId) {
      if (!isObject(parsed)) return null
      if (parsed.mcpServers !== undefined && parsed.mcpServers !== null) {
        const servers = parsed.mcpServers
        if (Array.isArray(servers)) {
          for (const entry of servers) {
            if (!looksLikeServerNode(entry)) continue
            const id = textOf(entry.serverName !== undefined ? entry.serverName : entry.name) || fallbackId
            return { id: id, node: entry }
          }
          return null
        }
        if (isObject(servers)) {
          const keys = Object.keys(servers)
          for (const key of keys) {
            const node = servers[key]
            if (!looksLikeServerNode(node)) continue
            return { id: key, node: node }
          }
        }
        return null
      }
      if (Array.isArray(parsed.servers)) {
        for (const entry of parsed.servers) {
          if (!looksLikeServerNode(entry)) continue
          const id = textOf(entry.serverName !== undefined ? entry.serverName : entry.name) || fallbackId
          return { id: id, node: entry }
        }
        return null
      }
      if (parsed.command !== undefined || parsed.url !== undefined || parsed.transport !== undefined || parsed.type !== undefined || parsed.serverName !== undefined || parsed.name !== undefined) {
        const id = textOf(parsed.serverName !== undefined ? parsed.serverName : parsed.name) || fallbackId
        return { id: id, node: parsed }
      }
      const keys = Object.keys(parsed)
      if (keys.length === 1 && looksLikeServerNode(parsed[keys[0]])) return { id: keys[0], node: parsed[keys[0]] }
      return null
    }

    function buildDraft(t, draft, workspaceCount) {
      const errors = []
      const serverName = textOf(draft.serverName).trim()
      if (serverName === '' || !SERVER_NAME_PATTERN.test(serverName)) errors.push(t('editor.validationName'))
      if (draft.transport === 'sse') errors.push(t('editor.validationSse'))
      const transport = draft.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
      // Built from the draft alone: a stale baseConfig must never override JSON edits.
      const config = { serverName: serverName, transport: transport }
      if (transport === 'stdio') {
        const command = textOf(draft.command).trim()
        if (command === '') errors.push(t('editor.validationCommand'))
        else config.command = command
        const args = Array.isArray(draft.args) ? draft.args.slice() : []
        if (args.length > 0) config.args = args
        const env = objectFromRows(draft.envRows)
        if (Object.keys(env).length > 0) config.env = env
        const cwd = textOf(draft.cwd).trim()
        if (cwd !== '') config.cwd = cwd
      } else {
        const url = textOf(draft.url).trim()
        if (url === '' || !/^https?:\/\//iu.test(url)) errors.push(t('editor.validationUrl'))
        else config.url = url
        const headers = objectFromRows(draft.headerRows)
        if (Object.keys(headers).length > 0) config.headers = headers
      }
      const timeout = integerText(draft.timeout)
      if (timeout !== null && timeout > 0) config.toolCallTimeoutMs = timeout
      else if (textOf(draft.timeout).trim() !== '') errors.push(t('editor.validationTimeout'))
      const maxInstructionBytes = integerText(draft.maxInstructionBytes)
      if (maxInstructionBytes !== null && maxInstructionBytes > 0) config.maxInstructionBytes = maxInstructionBytes
      else if (textOf(draft.maxInstructionBytes).trim() !== '') errors.push(t('editor.validationNumber'))
      config.failOnStartupError = draft.failOnStartupError === true
      const reconnectInitialDelayMs = integerText(draft.reconnectInitialDelayMs)
      const reconnectMaxDelayMs = integerText(draft.reconnectMaxDelayMs)
      const reconnectMaxAttempts = integerText(draft.reconnectMaxAttempts)
      if (textOf(draft.reconnectInitialDelayMs).trim() !== '' && (reconnectInitialDelayMs === null || reconnectInitialDelayMs <= 0)) errors.push(t('editor.validationNumber'))
      if (textOf(draft.reconnectMaxDelayMs).trim() !== '' && (reconnectMaxDelayMs === null || reconnectMaxDelayMs <= 0)) errors.push(t('editor.validationNumber'))
      if (textOf(draft.reconnectMaxAttempts).trim() !== '' && (reconnectMaxAttempts === null || reconnectMaxAttempts <= 0)) errors.push(t('editor.validationNumber'))
      config.reconnect = {
        enabled: draft.reconnectEnabled !== false,
        initialDelayMs: reconnectInitialDelayMs !== null && reconnectInitialDelayMs > 0 ? reconnectInitialDelayMs : 500,
        maxDelayMs: reconnectMaxDelayMs !== null && reconnectMaxDelayMs > 0 ? reconnectMaxDelayMs : 30000,
        maxAttempts: reconnectMaxAttempts !== null && reconnectMaxAttempts > 0 ? reconnectMaxAttempts : 10,
      }
      const retries = integerText(draft.maxRetries)
      if (retries !== null && retries >= 0 && retries <= 100) {
        // stored in `extra`, not in the Loader config
      } else if (textOf(draft.maxRetries).trim() !== '') {
        errors.push(t('editor.validationRetries'))
      }
      const workspaces = draft.scope === 'workspace' ? draft.workspaces.map((path) => textOf(path)).filter((path) => path !== '') : []
      if (draft.scope === 'workspace' && workspaces.length === 0 && workspaceCount > 0) errors.push(t('editor.validationWorkspaces'))
      const extra = {
        capabilities: {
          tools: draft.capTools !== false,
          resources: draft.capResources !== false,
          prompts: draft.capPrompts !== false,
        },
        autoApprove: splitComma(draft.autoApprove),
        disabledTools: splitComma(draft.disabledTools),
        oauth: {
          enabled: draft.oauthEnabled === true,
          clientId: textOf(draft.oauthClientId).trim(),
          scopes: textOf(draft.oauthScopes).trim(),
        },
      }
      if (retries !== null && retries >= 0 && retries <= 100) extra.maxRetries = retries
      return {
        errors: errors,
        config: config,
        extra: extra,
        description: textOf(draft.description).trim(),
        workspaces: workspaces,
        enabled: draft.enabled !== false,
        level: draft.scope === 'global' ? 'global' : 'workspace',
      }
    }

    /* ------------------------------------------------------------------ *
     * Key/value rows.                                                    *
     * ------------------------------------------------------------------ */

    function KeyValueList(props) {
      const t = props.t
      const rows = Array.isArray(props.rows) ? props.rows : []
      const keyPlaceholder = props.kind === 'header' ? t('editor.kvKeyHeader') : t('editor.kvKeyEnv')
      const valuePlaceholder = props.kind === 'header' ? t('editor.kvValHeader') : t('editor.kvValEnv')
      return h(
        'div',
        { className: 'mm-kv-list' },
        rows.map((row, index) => {
          const current = isObject(row) ? row : { key: '', value: '' }
          return h(
            'div',
            { className: 'mm-kv-row', key: index },
            h(TextInput, {
              value: current.key,
              placeholder: keyPlaceholder,
              mono: true,
              onChange: (value) => props.onChange(index, 'key', value),
            }),
            h(TextInput, {
              value: current.value,
              placeholder: valuePlaceholder,
              mono: true,
              onChange: (value) => props.onChange(index, 'value', value),
            }),
            h(
              IconButton,
              {
                label: t('editor.removeRow'),
                tooltip: t('tooltip.removeRow'),
                tone: 'plain',
                onClick: () => props.onRemove(index),
              },
              h('path', { d: 'M6 18L18 6M6 6l12 12' }),
            ),
          )
        }),
      )
    }

    /* ------------------------------------------------------------------ *
     * Editor dialog.                                                     *
     * ------------------------------------------------------------------ */

    function EditorDialog(props) {
      const t = props.t
      const editing = props.mode === 'edit'
      const [draft, setDraft] = useState(() => makeDraft(props.mode, props.row))
      // Independent editing state for the structured args textarea: typing must keep the
      // raw text (newlines and blank lines included) instead of being re-parsed and
      // re-rendered on every keystroke. It only becomes authoritative after a real edit
      // (the `argsDirty` flag below); blur, submit and tab switches parse it only then,
      // and it is regenerated from the array when data changes externally (JSON / template).
      const [argsText, setArgsText] = useState(() => argsTextOf(makeDraft(props.mode, props.row).args))
      // True only while the args textarea holds edits the user actually typed. Untouched
      // arrays (opened from JSON, npx template, blur parse) keep `draft.args` authoritative,
      // so embedded newlines and `$js` markers survive tab switches, save and test.
      const [argsDirty, setArgsDirty] = useState(false)
      const [mode, setMode] = useState('structured')
      const [jsonText, setJsonText] = useState(() => jsonTextOf(makeDraft(props.mode, props.row)))
      const [jsonFeedback, setJsonFeedback] = useState({ ok: true, text: t('editor.jsonValid') })
      // `jsonBroken` is independent of the active tab: a failed parse blocks save/test
      // until the text parses again or the user explicitly discards the JSON edits.
      const [jsonBroken, setJsonBroken] = useState(false)
      const [jsonEdited, setJsonEdited] = useState(false)
      const [discardPrompt, setDiscardPrompt] = useState(false)
      const [testState, setTestState] = useState({ status: 'idle', text: '' })
      const [saving, setSaving] = useState(false)
      const counts = isObject(props.workspaceCounts) ? props.workspaceCounts : {}

      // Structured edits make the draft the source of truth again, so the JSON tab may be
      // regenerated the next time it is opened.
      const setField = (key, value) => {
        setJsonEdited(false)
        setDraft((previous) => Object.assign({}, previous, { [key]: value }))
      }
      const updateKv = (kind, index, field, value) => {
        setJsonEdited(false)
        setDraft((previous) => {
          const rowsKey = kind === 'header' ? 'headerRows' : 'envRows'
          const rows = Array.isArray(previous[rowsKey]) ? previous[rowsKey].slice() : []
          const current = isObject(rows[index]) ? Object.assign({}, rows[index]) : { key: '', value: '' }
          current[field] = value
          rows[index] = current
          return Object.assign({}, previous, { [rowsKey]: rows })
        })
      }
      const addKv = (kind) => {
        setJsonEdited(false)
        setDraft((previous) => {
          const rowsKey = kind === 'header' ? 'headerRows' : 'envRows'
          const rows = Array.isArray(previous[rowsKey]) ? previous[rowsKey].slice() : []
          rows.push({ key: '', value: '' })
          return Object.assign({}, previous, { [rowsKey]: rows })
        })
      }
      const removeKv = (kind, index) => {
        setJsonEdited(false)
        setDraft((previous) => {
          const rowsKey = kind === 'header' ? 'headerRows' : 'envRows'
          const rows = Array.isArray(previous[rowsKey]) ? previous[rowsKey].slice() : []
          rows.splice(index, 1)
          if (rows.length === 0) rows.push({ key: '', value: '' })
          return Object.assign({}, previous, { [rowsKey]: rows })
        })
      }

      const parseJson = (text, announce) => {
        let parsed = null
        try {
          parsed = JSON.parse(text)
        } catch (failure) {
          setJsonBroken(true)
          setJsonFeedback({ ok: false, text: t('editor.jsonInvalid', { message: messageOf(failure) }) })
          return null
        }
        const picked = pickJsonNode(parsed, textOf(draft.serverName).trim() !== '' ? textOf(draft.serverName).trim() : 'shared-mcp-server')
        if (picked === null) {
          setJsonBroken(true)
          setJsonFeedback({ ok: false, text: t('editor.jsonShape') })
          return null
        }
        const next = applyJsonNode(draft, picked.id, picked.node)
        setDraft(next)
        // External data change: re-render the args control from the parsed array.
        setArgsText(argsTextOf(next.args))
        setArgsDirty(false)
        setJsonBroken(false)
        // A successful parse clears the "JSON syntax is broken" confirmation bar.
        setDiscardPrompt(false)
        if (next.transport === 'sse') {
          setJsonFeedback({ ok: false, text: t('editor.validationSse') })
        } else {
          setJsonFeedback({ ok: true, text: announce === true ? t('editor.jsonParsed', { name: picked.id }) : t('editor.jsonValid') })
        }
        return next
      }

      /** Explicit reset: drop the JSON edits and regenerate the text from the form draft. */
      const resetJsonFromDraft = () => {
        setJsonEdited(false)
        setJsonText(jsonTextOf(draft))
        setJsonBroken(false)
        setJsonFeedback({ ok: true, text: t('editor.jsonValid') })
        setDiscardPrompt(false)
      }

      const switchMode = (next) => {
        if (next === mode) return
        if (next === 'json') {
          // Only a textarea the user actually typed into is authoritative: parse it once
          // (a manual edit may legitimately split one line per argument) and regenerate
          // the JSON from the resulting array so the displayed value matches the submit.
          let syncedDraft = draft
          if (argsDirty === true) {
            syncedDraft = Object.assign({}, draft, { args: argsFromText(argsText) })
            setDraft(syncedDraft)
            setArgsDirty(false)
            setJsonEdited(false)
            setJsonText(jsonTextOf(syncedDraft))
            setJsonBroken(false)
            setJsonFeedback({ ok: true, text: t('editor.jsonValid') })
          } else if (jsonEdited !== true) {
            // Untouched args keep `draft.args` verbatim (embedded newlines, `$js` markers);
            // user-entered JSON is never overwritten by a stale form draft.
            setJsonText(jsonTextOf(syncedDraft))
            setJsonBroken(false)
            setJsonFeedback({ ok: true, text: t('editor.jsonValid') })
          }
          setDiscardPrompt(false)
          setMode('json')
          return
        }
        // Invalid JSON blocks the structured form too; switching back requires an explicit
        // confirmation that discards the JSON edits (and therefore clears the error state).
        if (jsonBroken === true) {
          setDiscardPrompt(true)
          return
        }
        let nextDraft = draft
        if (jsonEdited === true) {
          const parsed = parseJson(jsonText, false)
          if (parsed === null) return
          nextDraft = parsed
        }
        // The structured textarea must never re-parse its stale text here: refresh it
        // from the parsed array so JSON-only values (embedded newlines, `$js` markers)
        // survive the tab switch, and drop any pending textarea edit flag.
        setArgsText(argsTextOf(nextDraft.args))
        setArgsDirty(false)
        setDiscardPrompt(false)
        setMode('structured')
      }

      const onJsonChange = (value) => {
        setJsonEdited(true)
        setJsonText(value)
        parseJson(value, false)
      }

      const formatJson = () => {
        setJsonEdited(true)
        let parsed = null
        try {
          parsed = JSON.parse(jsonText)
        } catch (failure) {
          setJsonBroken(true)
          setJsonFeedback({ ok: false, text: t('editor.jsonInvalid', { message: messageOf(failure) }) })
          return
        }
        const formatted = JSON.stringify(parsed, null, 2)
        setJsonText(formatted)
        // Formatting is not a validation bypass: run the full parse/shape check again.
        const next = parseJson(formatted, false)
        if (next !== null && next.transport !== 'sse') {
          setJsonFeedback({ ok: true, text: t('editor.jsonFormatted') })
        }
      }

      const pasteSample = () => {
        const sample = {
          mcpServers: {
            'playwright-browser-automation': {
              description: '社区分享的端到端网页自动化与截图取证 MCP 服务',
              transport: 'stdio',
              command: 'npx',
              args: ['-y', '@executeautomation/playwright-mcp-server', '--headless'],
              env: { BROWSER_WIDTH: '1440', BROWSER_HEIGHT: '900' },
              timeout: 45000,
              maxRetries: 2,
              autoApprove: ['playwright_navigate', 'playwright_screenshot', 'playwright_click'],
            },
          },
        }
        const text = JSON.stringify(sample, null, 2)
        setJsonEdited(true)
        setJsonText(text)
        parseJson(text, true)
        if (typeof props.onToast === 'function') props.onToast('success', t('editor.jsonSample'))
      }

      const copyJson = async () => {
        const copied = await copyText(jsonText)
        if (typeof props.onToast === 'function') props.onToast(copied ? 'success' : 'warning', copied ? t('editor.jsonCopied') : t('action.copyFailed'))
      }

      const fillNpx = () => {
        setJsonEdited(false)
        const templateArgs = ['-y', '@modelcontextprotocol/server-brave-search']
        setDraft((previous) => Object.assign({}, previous, {
          command: 'npx',
          args: templateArgs,
          envRows: [{ key: 'BRAVE_API_KEY', value: '' }],
        }))
        // External data change: re-render the args control from the template array.
        setArgsText(argsTextOf(templateArgs))
        setArgsDirty(false)
        if (typeof props.onToast === 'function') props.onToast('info', t('editor.npxFilled'))
      }

      const discardJson = () => {
        resetJsonFromDraft()
        setMode('structured')
      }

      const validate = () => {
        // The textarea only overrides `draft.args` after a real user edit. When it was
        // filled from JSON (or the npx template) it may not be able to express embedded
        // newlines, so re-deriving would split arguments and drop `$js` markers.
        const syncedDraft = argsDirty === true
          ? Object.assign({}, draft, { args: argsFromText(argsText) })
          : draft
        if (argsDirty === true) setDraft(syncedDraft)
        const built = buildDraft(t, syncedDraft, Array.isArray(props.workspaces) ? props.workspaces.length : 0)
        if (built.errors.length > 0) {
          if (typeof props.onToast === 'function') props.onToast('warning', built.errors[0])
          return null
        }
        return built
      }

      // A failed JSON parse blocks saving/testing regardless of the active tab.
      const jsonBlocked = jsonBroken === true

      const testDraft = async () => {
        if (jsonBlocked) {
          if (typeof props.onToast === 'function') props.onToast('warning', t('editor.jsonBlocked'))
          return
        }
        const built = validate()
        if (built === null) return
        setTestState({ status: 'testing', text: t('state.testing') })
        try {
          const payload = await callApi('probe', { config: built.config })
          const result = payload.result !== undefined ? payload.result : null
          if (isObject(result) && result.ok === true) {
            const ms = typeof result.durationMs === 'number' && Number.isFinite(result.durationMs) ? Math.round(result.durationMs) : 0
            const tools = typeof result.toolCount === 'number' && Number.isFinite(result.toolCount) ? result.toolCount : 0
            const version = textOf(result.protocolVersion) !== '' ? result.protocolVersion : DASH
            setTestState({ status: 'ok', text: t('editor.testOk', { ms: ms, version: version, tools: tools }) })
          } else {
            const message = isObject(result) && isObject(result.error) && textOf(result.error.message) !== '' ? result.error.message : t('state.unknownError')
            setTestState({ status: 'err', text: t('editor.testFail', { message: message }) })
          }
        } catch (failure) {
          setTestState({ status: 'err', text: t('editor.testFail', { message: describeError(t, failure) }) })
        }
      }

      const submit = async () => {
        if (jsonBlocked) {
          if (typeof props.onToast === 'function') props.onToast('warning', t('editor.jsonBlocked'))
          return
        }
        const built = validate()
        if (built === null) return
        const workspaces = built.workspaces
        const args = editing
          ? {
            id: props.row.id,
            level: props.row.level,
            config: built.config,
            enabled: built.enabled,
            workspaces: workspaces,
            description: built.description,
            extra: built.extra,
          }
          : {
            level: built.level,
            config: built.config,
            enabled: built.enabled,
            workspaces: workspaces,
            description: built.description,
            extra: built.extra,
          }
        setSaving(true)
        await props.onSubmit(args)
        setSaving(false)
      }

      const selectedNames = draft.workspaces.map((path) => workspaceLabel(props.workspaces, path)).join('、')
      const profilePatch = textOf(props.profilePatch) !== '' ? props.profilePatch : t('config.unknownPath')
      const homePatch = textOf(props.homePatch) !== '' ? props.homePatch : t('config.unknownPath')
      const mergePreview = draft.scope === 'global'
        ? h('div', { className: 'mm-merge-preview mm-global-hint' }, t('editor.mergePreviewGlobal', { path: homePatch }))
        : draft.workspaces.length === 0
          ? h('div', { className: 'mm-merge-preview mm-merge-empty' }, t('editor.mergeEmpty'))
          : h('div', { className: 'mm-merge-preview' }, t('editor.mergePreview', {
            names: selectedNames,
            path: profilePatch,
          }))

      const scopeCard = h(
        'div',
        { className: 'mm-scope-card' },
        h(
          'div',
          { className: 'mm-scope-head' },
          h(
            'div',
            null,
            h(
              'div',
              { className: 'mm-scope-title' },
              h('span', null, t('editor.scopeTitle')),
              h('span', { className: 'mm-scope-badge' }, t('editor.scopeBadge')),
            ),
            h('p', { className: 'mm-scope-hint' }, t('editor.scopeHint')),
          ),
          h(Segmented, {
            value: draft.scope,
            ariaLabel: t('editor.scopeTitle'),
            disabled: editing,
            options: [
              { value: 'workspace', label: t('editor.scopeWorkspace'), nativeTitle: editing ? t('editor.scopeLocked') : undefined },
              { value: 'global', label: t('editor.scopeGlobal'), nativeTitle: editing ? t('editor.scopeLocked') : undefined },
            ],
            onChange: (value) => setField('scope', value),
          }),
        ),
        draft.scope === 'workspace'
          ? h(
            Fragment,
            null,
            h(
              'div',
              { className: 'mm-ws-grid' },
              Array.isArray(props.workspaces) && props.workspaces.length > 0
                ? props.workspaces.map((workspace) => {
                  const path = textOf(workspace.path)
                  const checked = draft.workspaces.includes(path)
                  const count = counts[path] !== undefined ? counts[path] : 0
                  return h(
                    'label',
                    { key: path !== '' ? path : workspace.id, className: 'mm-ws-option' + (checked ? ' mm-ws-option-active' : ''), title: path },
                    h('input', {
                      type: 'checkbox',
                      checked: checked,
                      onChange: (event) => {
                        if (event.target.checked) setField('workspaces', draft.workspaces.includes(path) ? draft.workspaces : draft.workspaces.concat([path]))
                        else setField('workspaces', draft.workspaces.filter((entry) => entry !== path))
                      },
                    }),
                    h(
                      'div',
                      { className: 'mm-ws-option-body' },
                      h('div', { className: 'mm-ws-option-label' }, workspaceLabel(props.workspaces, path)),
                      h('div', { className: 'mm-ws-option-sub' }, t('editor.wsExisting', { count: count })),
                    ),
                  )
                })
                : h('p', { className: 'mm-hint' }, t('editor.wsEmpty')),
            ),
            mergePreview,
          )
          : mergePreview,
      )

      const transportCards = [
        { value: 'stdio', badge: t('editor.transportStdioBadge'), desc: t('editor.transportStdioDesc'), disabled: false },
        { value: 'streamable-http', badge: t('editor.transportHttpBadge'), desc: t('editor.transportHttpDesc'), disabled: false },
        { value: 'sse', badge: t('editor.transportSseBadge'), desc: t('editor.transportSseDesc'), disabled: true },
      ]

      const structured = h(
        'div',
        { className: 'mm-form' },
        h(
          'div',
          { className: 'mm-form-section' },
          h('div', { className: 'mm-form-title' }, t('editor.section1')),
          h(
            'div',
            { className: 'mm-grid2' },
            h(
              Field,
              {
                label: h(Fragment, null, t('editor.serverId'), h('span', { className: 'mm-required', 'aria-label': t('editor.required') }, '*')),
              },
              h(TextInput, {
                value: draft.serverName,
                placeholder: t('editor.serverIdPlaceholder'),
                mono: true,
                onChange: (value) => setField('serverName', value),
              }),
            ),
            h(
              Field,
              { label: t('editor.description') },
              h(TextInput, {
                value: draft.description,
                placeholder: t('editor.descriptionPlaceholder'),
                onChange: (value) => setField('description', value),
              }),
            ),
          ),
          h(
            'div',
            { className: 'mm-field' },
            h('span', { className: 'mm-field-label' }, t('editor.transport'), h('span', { className: 'mm-required', 'aria-label': t('editor.required') }, '*')),
            h(
              'div',
              { className: 'mm-transport-grid' },
              transportCards.map((card) => h(
                'button',
                {
                  key: card.value,
                  type: 'button',
                  className: 'mm-transport-card'
                    + (draft.transport === card.value ? ' mm-transport-card-active' : '')
                    + (card.disabled ? ' mm-transport-card-disabled' : ''),
                  disabled: card.disabled,
                  onClick: () => setField('transport', card.value),
                },
                h(
                  'div',
                  { className: 'mm-transport-head' },
                  h('span', { className: 'mm-transport-name mm-mono' }, card.value),
                  h('span', { className: 'mm-transport-badge' }, card.badge),
                ),
                h('p', { className: 'mm-transport-desc' }, card.desc),
              )),
            ),
            h('p', { className: 'mm-hint' }, t('editor.sseUnsupported')),
          ),
        ),
        draft.transport === 'stdio'
          ? h(
            'div',
            { className: 'mm-form-section' },
            h('div', { className: 'mm-form-title' }, t('editor.section2stdio')),
            h(
              'div',
              { className: 'mm-grid3' },
              h(
                Field,
                { label: h(Fragment, null, t('editor.command'), h('span', { className: 'mm-required', 'aria-label': t('editor.required') }, '*')) },
                h(TextInput, {
                  value: draft.command,
                  placeholder: t('editor.commandPlaceholder'),
                  mono: true,
                  onChange: (value) => setField('command', value),
                }),
              ),
              h(
                'div',
                { className: 'mm-col-2' },
                h(
                  Field,
                  { label: t('editor.cwd') },
                  h(TextInput, {
                    value: draft.cwd,
                    placeholder: t('editor.cwdPlaceholder'),
                    mono: true,
                    onChange: (value) => setField('cwd', value),
                  }),
                ),
              ),
            ),
            h(
              'div',
              { className: 'mm-field' },
              h(
                'div',
                { className: 'mm-field-head' },
                h('span', { className: 'mm-field-label' }, t('editor.args')),
                h('button', { type: 'button', className: 'mm-link', onClick: fillNpx }, t('action.fillNpx')),
              ),
              h(TextArea, {
                value: argsText,
                rows: 3,
                mono: true,
                onChange: (value) => {
                  setJsonEdited(false)
                  setArgsText(value)
                  // A real keystroke is the only thing that makes the text authoritative.
                  setArgsDirty(true)
                },
                // Blur is a parse point for text the user typed; the raw text (with
                // newlines) stays on screen. An untouched control is never re-parsed, so
                // JSON arrays with embedded newlines survive a focus/blur round-trip.
                onBlur: () => {
                  if (argsDirty !== true) return
                  setDraft((previous) => Object.assign({}, previous, { args: argsFromText(argsText) }))
                  setArgsDirty(false)
                },
              }),
            ),
            h(
              'div',
              { className: 'mm-field' },
              h(
                'div',
                { className: 'mm-field-head' },
                h('span', { className: 'mm-field-label' }, t('editor.env')),
                h('button', { type: 'button', className: 'mm-link', onClick: () => addKv('env') }, t('action.addEnv')),
              ),
              h(KeyValueList, {
                t: t,
                kind: 'env',
                rows: draft.envRows,
                onChange: (index, field, value) => updateKv('env', index, field, value),
                onRemove: (index) => removeKv('env', index),
              }),
            ),
          )
          : h(
            'div',
            { className: 'mm-form-section' },
            h('div', { className: 'mm-form-title' }, t('editor.section2remote')),
            h(
              Field,
              { label: h(Fragment, null, t('editor.url'), h('span', { className: 'mm-required', 'aria-label': t('editor.required') }, '*')) },
              h(TextInput, {
                value: draft.url,
                placeholder: t('editor.urlPlaceholder'),
                mono: true,
                onChange: (value) => setField('url', value),
              }),
            ),
            h(
              'div',
              { className: 'mm-field' },
              h(
                'div',
                { className: 'mm-field-head' },
                h('span', { className: 'mm-field-label' }, t('editor.headers')),
                h('button', { type: 'button', className: 'mm-link', onClick: () => addKv('header') }, t('action.addHeader')),
              ),
              h(KeyValueList, {
                t: t,
                kind: 'header',
                rows: draft.headerRows,
                onChange: (index, field, value) => updateKv('header', index, field, value),
                onRemove: (index) => removeKv('header', index),
              }),
            ),
            h(
              'div',
              { className: 'mm-oauth' },
              h(
                'div',
                { className: 'mm-oauth-head' },
                h(
                  'div',
                  null,
                  h('div', { className: 'mm-oauth-title' }, t('editor.oauth')),
                  h('div', { className: 'mm-oauth-hint' }, t('editor.oauthHint')),
                ),
                h('input', {
                  type: 'checkbox',
                  checked: draft.oauthEnabled,
                  'aria-label': t('editor.oauth'),
                  onChange: (event) => setField('oauthEnabled', event.target.checked),
                }),
              ),
              draft.oauthEnabled
                ? h(
                  'div',
                  { className: 'mm-oauth-detail' },
                  h(
                    Field,
                    { label: t('editor.oauthClientId') },
                    h(TextInput, {
                      value: draft.oauthClientId,
                      placeholder: t('editor.oauthClientIdPlaceholder'),
                      mono: true,
                      onChange: (value) => setField('oauthClientId', value),
                    }),
                  ),
                  h(
                    Field,
                    { label: t('editor.oauthScopes') },
                    h(TextInput, {
                      value: draft.oauthScopes,
                      placeholder: t('editor.oauthScopesPlaceholder'),
                      mono: true,
                      onChange: (value) => setField('oauthScopes', value),
                    }),
                  ),
                )
                : null,
            ),
          ),
        h(
          'div',
          { className: 'mm-form-section' },
          h('div', { className: 'mm-form-title' }, t('editor.section3')),
          h(
            'div',
            { className: 'mm-grid3' },
            h(
              Field,
              { label: t('editor.timeout') },
              h(TextInput, {
                type: 'number',
                value: draft.timeout,
                min: 0,
                step: 1000,
                mono: true,
                onChange: (value) => setField('timeout', value),
              }),
            ),
            h(
              Field,
              { label: t('editor.retries') },
              h(TextInput, {
                type: 'number',
                value: draft.maxRetries,
                min: 0,
                max: 100,
                mono: true,
                onChange: (value) => setField('maxRetries', value),
              }),
            ),
            h(
              'div',
              { className: 'mm-field' },
              h('span', { className: 'mm-field-label' }, t('editor.capabilities')),
              h(
                'div',
                { className: 'mm-cap-box' },
                h(Checkbox, { checked: draft.capTools, label: t('editor.capTools'), onChange: (value) => setField('capTools', value) }),
                h(Checkbox, { checked: draft.capResources, label: t('editor.capResources'), onChange: (value) => setField('capResources', value) }),
                h(Checkbox, { checked: draft.capPrompts, label: t('editor.capPrompts'), onChange: (value) => setField('capPrompts', value) }),
              ),
            ),
          ),
          h(
            'div',
            { className: 'mm-grid2' },
            h(
              Field,
              { label: t('editor.autoApprove') },
              h(TextInput, {
                value: draft.autoApprove,
                placeholder: t('editor.autoApprovePlaceholder'),
                mono: true,
                onChange: (value) => setField('autoApprove', value),
              }),
            ),
            h(
              Field,
              { label: t('editor.disabledTools') },
              h(TextInput, {
                value: draft.disabledTools,
                placeholder: t('editor.disabledToolsPlaceholder'),
                mono: true,
                onChange: (value) => setField('disabledTools', value),
              }),
            ),
          ),
          h(
            'div',
            { className: 'mm-grid3' },
            h(
              Field,
              { label: t('editor.maxInstructionBytes') },
              h(TextInput, {
                type: 'number',
                value: draft.maxInstructionBytes,
                min: 0,
                mono: true,
                onChange: (value) => setField('maxInstructionBytes', value),
              }),
            ),
            h(
              Field,
              { label: t('editor.reconnectInitialDelayMs') },
              h(TextInput, {
                type: 'number',
                value: draft.reconnectInitialDelayMs,
                min: 0,
                mono: true,
                onChange: (value) => setField('reconnectInitialDelayMs', value),
              }),
            ),
            h(
              Field,
              { label: t('editor.reconnectMaxDelayMs') },
              h(TextInput, {
                type: 'number',
                value: draft.reconnectMaxDelayMs,
                min: 0,
                mono: true,
                onChange: (value) => setField('reconnectMaxDelayMs', value),
              }),
            ),
          ),
          h(
            'div',
            { className: 'mm-grid2' },
            h(
              Field,
              { label: t('editor.reconnectMaxAttempts') },
              h(TextInput, {
                type: 'number',
                value: draft.reconnectMaxAttempts,
                min: 0,
                mono: true,
                onChange: (value) => setField('reconnectMaxAttempts', value),
              }),
            ),
            h(
              'div',
              { className: 'mm-field' },
              h('span', { className: 'mm-field-label' }, t('editor.reconnect')),
              h(
                'div',
                { className: 'mm-cap-box' },
                h(Checkbox, { checked: draft.reconnectEnabled, label: t('editor.reconnectEnabled'), onChange: (value) => setField('reconnectEnabled', value) }),
                h(Checkbox, { checked: draft.failOnStartupError, label: t('editor.failOnStartupError'), onChange: (value) => setField('failOnStartupError', value) }),
              ),
            ),
          ),
        ),
      )

      const jsonPanel = h(
        'div',
        { className: 'mm-json-panel' },
        h(
          'div',
          { className: 'mm-json-toolbar' },
          h('span', { className: 'mm-json-hint' }, t('editor.jsonHint')),
          h(
            'div',
            { className: 'mm-json-actions' },
            h(Button, { size: 'sm', variant: 'warn', onClick: pasteSample }, t('action.pasteSample')),
            h(Button, { size: 'sm', variant: 'ghost', onClick: formatJson }, t('action.formatJson')),
            h(Button, { size: 'sm', variant: 'ghost', onClick: copyJson }, t('action.copyConfig')),
          ),
        ),
        h(TextArea, {
          value: jsonText,
          rows: 14,
          mono: true,
          fill: true,
          placeholder: t('editor.jsonPlaceholder'),
          onChange: onJsonChange,
        }),
        h(
          'div',
          { className: 'mm-json-feedback' + (jsonFeedback.ok === true ? ' mm-json-feedback-ok' : ' mm-json-feedback-err'), role: 'status' },
          h('span', null, jsonFeedback.text),
          jsonBroken === true
            ? h('button', { type: 'button', className: 'mm-link', onClick: resetJsonFromDraft }, t('editor.jsonReset'))
            : null,
        ),
        discardPrompt === true
          ? h(
            'div',
            { className: 'mm-json-confirm', role: 'alert' },
            h('span', { className: 'mm-json-confirm-text' }, t('editor.jsonDiscardConfirm')),
            h(Button, { size: 'sm', variant: 'ghost', onClick: () => setDiscardPrompt(false) }, t('editor.jsonDiscardNo')),
            h(Button, { size: 'sm', variant: 'warn', onClick: discardJson }, t('editor.jsonDiscardYes')),
          )
          : null,
      )

      const testText = testState.status === 'idle' ? '' : testState.text
      const testClass = testState.status === 'ok' ? ' mm-test-ok' : testState.status === 'err' ? ' mm-test-err' : testState.status === 'testing' ? ' mm-test-warn' : ''

      return h(
        Dialog,
        {
          title: editing ? t('editor.editTitle', { name: props.row.serverName }) : t('editor.addTitle'),
          subtitle: t('editor.subtitle'),
          closeLabel: t('action.closeDialog'),
          closeTooltip: t('tooltip.closeDialog'),
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          size: 'editor',
          headerExtra: h(Segmented, {
            value: mode,
            ariaLabel: t('editor.tabStructured'),
            options: [
              {
                value: 'structured',
                label: h(Fragment, null, h('svg', { className: 'mm-seg-icon', viewBox: '0 0 24 24', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M4 6h16M4 12h16M4 18h10' })), h('span', null, t('editor.tabStructured'))),
              },
              {
                value: 'json',
                label: h(Fragment, null, h('svg', { className: 'mm-seg-icon', viewBox: '0 0 24 24', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' })), h('span', null, t('editor.tabJson'))),
              },
            ],
            onChange: switchMode,
          }),
          footer: h(
            Fragment,
            null,
            h(
              'div',
              { className: 'mm-foot-left' },
              h(
                Button,
                { onClick: testDraft, disabled: testState.status === 'testing' || saving === true || jsonBlocked === true },
                h('svg', { className: 'mm-icon', viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M13 10V3L4 14h7v7l9-11h-7z' })),
                h('span', null, t('action.testBeforeSave')),
              ),
              h('span', { className: 'mm-test-text' + testClass, title: testText !== '' ? testText : undefined }, testText),
              h('span', { className: 'mm-sync-hint' }, t('editor.syncHint')),
            ),
            h(
              'div',
              { className: 'mm-foot-right' },
              h(Button, { onClick: props.onClose }, t('action.cancel')),
              h(
                Button,
                { variant: 'primary', onClick: submit, disabled: saving === true || jsonBlocked === true },
                saving === true ? t('state.saving') : t('action.save'),
              ),
            ),
          ),
        },
        scopeCard,
        mode === 'structured' ? structured : jsonPanel,
      )
    }

    /* ------------------------------------------------------------------ *
     * Manage-workspaces dialog.                                          *
     * ------------------------------------------------------------------ */

    function ManageDialog(props) {
      const t = props.t
      const row = props.row
      const [selected, setSelected] = useState(() => Array.isArray(row.workspaces) ? row.workspaces.map((path) => textOf(path)).filter((path) => path !== '') : [])
      const [targetLevel, setTargetLevel] = useState(row.level === 'global' ? 'global' : 'workspace')
      const [movedRow, setMovedRow] = useState(null)
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const counts = isObject(props.workspaceCounts) ? props.workspaceCounts : {}
      const current = movedRow !== null && movedRow !== undefined ? movedRow : row
      const currentLevel = current.level === 'global' ? 'global' : 'workspace'
      const toggle = (path, checked) => {
        if (checked) setSelected((previous) => previous.includes(path) ? previous : previous.concat([path]))
        else setSelected((previous) => previous.filter((entry) => entry !== path))
      }
      const save = async () => {
        setBusy(true)
        setError('')
        let effective = current
        if (targetLevel !== currentLevel) {
          const moved = await props.onMove(targetLevel, current)
          if (moved === null || moved === undefined || moved.ok !== true) {
            setBusy(false)
            setError(moved !== null && moved !== undefined && typeof moved.error === 'string' && moved.error !== '' ? moved.error : t('state.operationFailed'))
            return
          }
          if (moved.row !== null && moved.row !== undefined) {
            effective = moved.row
            setMovedRow(moved.row)
          }
        }
        const result = await props.onSave(selected, effective)
        setBusy(false)
        if (result !== null && result !== undefined && result.ok === true) props.onClose()
        else if (result !== null && result !== undefined && typeof result.error === 'string' && result.error !== '') setError(result.error)
      }
      const globalChecked = targetLevel === 'global'
      const globalTitle = currentLevel === 'global' && globalChecked !== true ? t('manage.toWorkspace') : t('manage.global')
      const globalHint = targetLevel === 'global' ? t('manage.globalHint') : t('manage.workspaceHint')
      return h(
        Dialog,
        {
          title: t('manage.title'),
          subtitle: t('manage.subtitle'),
          closeLabel: t('action.closeManage'),
          closeTooltip: t('tooltip.closeManage'),
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          size: 'manage',
          footer: h(
            Fragment,
            null,
            h(Button, { onClick: props.onClose }, t('action.cancel')),
            h(Button, { variant: 'brand', onClick: save, disabled: busy === true }, busy === true ? t('state.saving') : t('action.saveWorkspaces')),
          ),
        },
        h(
          'div',
          { className: 'mm-manage-target' },
          h('span', { className: 'mm-muted' }, t('manage.target')),
          h('strong', { className: 'mm-card-id mm-mono' }, current.serverName),
          h(Chip, { tone: 'neutral', className: 'mm-chip-mono' }, transportOf(current.config)),
        ),
        h(
          'label',
          { className: 'mm-manage-global' },
          h('input', {
            type: 'checkbox',
            checked: globalChecked,
            disabled: busy === true,
            onChange: (event) => {
              setTargetLevel(event.target.checked ? 'global' : 'workspace')
              setError('')
            },
          }),
          h(
            'div',
            null,
            h(
              'div',
              { className: 'mm-manage-global-title' },
              h('span', null, globalTitle),
              h('span', { className: 'mm-scope-badge' }, t('manage.globalBadge')),
            ),
            h('div', { className: 'mm-manage-global-hint' }, globalHint),
          ),
        ),
        error !== ''
          ? h('p', { className: 'mm-hint mm-danger-text' }, t('state.operationFailed') + ': ' + error)
          : null,
        h(
          'div',
          { className: 'mm-manage-specific' },
          h('div', { className: 'mm-manage-specific-title' }, t('manage.specific')),
          Array.isArray(props.workspaces) && props.workspaces.length > 0
            ? h(
              'div',
              { className: 'mm-manage-list' },
              props.workspaces.map((workspace) => {
                const path = textOf(workspace.path)
                const checked = selected.includes(path)
                const count = counts[path] !== undefined ? counts[path] : 0
                return h(
                  'label',
                  { key: path !== '' ? path : workspace.id, className: 'mm-manage-ws' + (checked ? ' mm-manage-ws-active' : ''), title: path },
                  h('input', {
                    type: 'checkbox',
                    checked: checked,
                    onChange: (event) => toggle(path, event.target.checked),
                  }),
                  h(
                    'div',
                    { className: 'mm-manage-ws-body' },
                    h('div', { className: 'mm-manage-ws-title' }, workspaceLabel(props.workspaces, path)),
                    h('div', { className: 'mm-manage-ws-path mm-mono' }, path),
                  ),
                  h('span', { className: 'mm-manage-count' }, t('manage.existing', { count: count })),
                )
              }),
            )
            : h('p', { className: 'mm-hint' }, t('manage.empty')),
        ),
        h('div', { className: 'mm-manage-note' }, t('manage.note')),
      )
    }

    /* ------------------------------------------------------------------ *
     * Delete dialogs.                                                    *
     * ------------------------------------------------------------------ */

    function DeleteDialog(props) {
      const t = props.t
      const row = props.row
      const [mode, setMode] = useState('current')
      const [busy, setBusy] = useState(false)
      const workspaces = Array.isArray(row.workspaces) ? row.workspaces.map((path) => textOf(path)).filter((path) => path !== '') : []
      const multi = row.level === 'workspace' && workspaces.length > 1
      const names = workspaces.map((path) => workspaceLabel(props.workspaces, path)).join('、')
      const scope = row.level === 'global' ? t('delete.descGlobalScope') : t('delete.descWorkspaceScope')
      const description = multi
        ? t('delete.descMulti', { name: row.serverName, names: names })
        : t('delete.descSingle', { name: row.serverName, scope: scope })
      const currentTitle = row.level === 'global' ? t('delete.optCurrentGlobal') : t('delete.optCurrent')
      const currentSub = row.level === 'global' ? t('delete.optCurrentGlobalSub') : t('delete.optCurrentSub')
      const allTitle = row.level === 'global' ? t('delete.optAllGlobal') : t('delete.optAll')
      const allSub = row.level === 'global' ? t('delete.optAllGlobalSub') : t('delete.optAllSub')
      const confirm = async () => {
        setBusy(true)
        const result = await props.onConfirm(mode)
        setBusy(false)
        if (result !== null && result !== undefined && result.ok === true) props.onClose()
      }
      return h(
        Dialog,
        {
          title: t('delete.title'),
          closeLabel: t('action.closeDialog'),
          closeTooltip: t('tooltip.closeDialog'),
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          size: 'confirm',
          footer: h(
            Fragment,
            null,
            h(Button, { onClick: props.onClose }, t('action.cancel')),
            h(Button, { variant: 'danger', onClick: confirm, disabled: busy === true }, busy === true ? t('state.saving') : t('delete.confirm')),
          ),
        },
        h(
          'div',
          { className: 'mm-delete-head' },
          h('span', { className: 'mm-delete-icon' }, h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }))),
          h(
            'div',
            null,
            h('p', { className: 'mm-delete-desc' }, description),
            multi === true ? h('p', { className: 'mm-hint' }, t('delete.tagsNote')) : null,
          ),
        ),
        h(
          'div',
          { className: 'mm-delete-choices' },
          h(
            'label',
            { className: 'mm-delete-option' + (mode === 'current' ? ' mm-delete-option-active' : '') },
            h('input', { type: 'radio', name: 'mm-delete-mode', value: 'current', checked: mode === 'current', onChange: () => setMode('current') }),
            h(
              'div',
              null,
              h('div', { className: 'mm-delete-option-title' }, currentTitle),
              h('div', { className: 'mm-delete-option-sub' }, currentSub),
            ),
          ),
          h(
            'label',
            { className: 'mm-delete-option mm-delete-option-danger' + (mode === 'purge' ? ' mm-delete-option-active' : '') },
            h('input', { type: 'radio', name: 'mm-delete-mode', value: 'purge', checked: mode === 'purge', onChange: () => setMode('purge') }),
            h(
              'div',
              null,
              h('div', { className: 'mm-delete-option-title mm-danger-text' }, allTitle),
              h('div', { className: 'mm-delete-option-sub' }, allSub),
            ),
          ),
        ),
      )
    }

    function LibraryDeleteDialog(props) {
      const t = props.t
      const [busy, setBusy] = useState(false)
      const confirm = async () => {
        setBusy(true)
        const result = await props.onConfirm()
        setBusy(false)
        if (result !== null && result !== undefined && result.ok === true) props.onClose()
      }
      return h(
        Dialog,
        {
          title: t('delete.libraryTitle'),
          closeLabel: t('action.closeDialog'),
          closeTooltip: t('tooltip.closeDialog'),
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          size: 'confirm',
          footer: h(
            Fragment,
            null,
            h(Button, { onClick: props.onClose }, t('action.cancel')),
            h(Button, { variant: 'danger', onClick: confirm, disabled: busy === true }, busy === true ? t('state.saving') : t('action.remove')),
          ),
        },
        h('p', { className: 'mm-dialog-text' }, t('delete.libraryDesc')),
      )
    }

    /* ------------------------------------------------------------------ *
     * Config-file viewer.                                                *
     * ------------------------------------------------------------------ */

    function ConfigDialog(props) {
      const t = props.t
      const [tab, setTab] = useState('workspace')
      const [state, setState] = useState({ status: 'loading', path: '', exists: false, text: '', error: '' })
      useEffect(() => {
        let cancelled = false
        // Clear the previous layer immediately: never show (or copy) one layer's text while
        // another layer is still loading.
        setState({ status: 'loading', path: '', exists: false, text: '', error: '' })
        callApi('configText', { level: tab }).then((payload) => {
          if (cancelled) return
          setState({
            status: 'ready',
            path: textOf(payload.path),
            exists: payload.exists === true,
            text: textOf(payload.text),
            error: '',
          })
        }).catch((failure) => {
          if (cancelled) return
          const message = failure !== null && failure !== undefined && failure.code === 'unauthorized'
            ? t('state.unauthorized')
            : describeError(t, failure)
          setState({ status: 'error', path: '', exists: false, text: '', error: message })
        })
        return () => {
          cancelled = true
        }
      }, [tab])
      const path = state.path !== '' ? state.path : t('config.unknownPath')
      const text = state.text
      const switchTab = (next) => {
        if (next === tab) return
        setState({ status: 'loading', path: '', exists: false, text: '', error: '' })
        setTab(next)
      }
      const copyAll = async () => {
        if (text === '' || state.status !== 'ready') return
        const copied = await copyText(text)
        if (typeof props.onToast === 'function') props.onToast(copied ? 'success' : 'warning', copied ? t('config.copied') : t('action.copyFailed'))
      }
      return h(
        Dialog,
        {
          title: state.path !== '' ? t('config.titlePath', { path: state.path }) : t('config.title'),
          subtitle: t('config.subtitle'),
          closeLabel: t('action.closeConfig'),
          closeTooltip: t('tooltip.closeConfig'),
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          size: 'config',
          footer: h(
            Fragment,
            null,
            h('span', { className: 'mm-config-readonly' }, t('config.readonly')),
            h(Button, { onClick: copyAll, disabled: text === '' || state.status !== 'ready' }, t('config.copy')),
            h(Button, { variant: 'primary', onClick: props.onClose }, t('config.close')),
          ),
        },
        h(
          'div',
          { className: 'mm-config-toolbar' },
          h(Segmented, {
            value: tab,
            ariaLabel: t('config.title'),
            options: [
              { value: 'workspace', label: t('config.tabWorkspace') },
              { value: 'global', label: t('config.tabGlobal') },
            ],
            onChange: switchTab,
          }),
          h('span', { className: 'mm-config-path mm-mono', title: path }, t('config.path', { path: path })),
        ),
        state.status === 'loading'
          ? h('p', { className: 'mm-hint' }, t('state.loading'))
          : state.status === 'error'
            ? h('p', { className: 'mm-hint mm-danger-text' }, state.error)
            : h('pre', { className: 'mm-code mm-code-fill' }, text !== '' ? text : t('config.empty')),
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

      const [view, setView] = useState({ status: 'loading', data: null, error: null })
      const [scopeFilter, setScopeFilter] = useState('all')
      const [query, setQuery] = useState('')
      const [expanded, setExpanded] = useState({})
      const [testingIds, setTestingIds] = useState({})
      const [testingAll, setTestingAll] = useState(false)
      const [busy, setBusy] = useState('')
      const [editor, setEditor] = useState(null)
      const [manage, setManage] = useState(null)
      const [deleteTarget, setDeleteTarget] = useState(null)
      const [configView, setConfigView] = useState(null)
      const [toasts, setToasts] = useState([])
      const requestSeq = useRef(0)
      const toastSeq = useRef(0)
      const toastTimers = useRef([])

      const pushToast = useCallback((kind, text) => {
        const message = textOf(text)
        if (message === '') return
        const id = toastSeq.current + 1
        toastSeq.current = id
        setToasts((previous) => previous.concat([{ id: id, kind: kind, text: message, leaving: false }]))
        const leaveTimer = setTimeout(() => {
          setToasts((previous) => previous.map((toast) => (toast.id === id ? Object.assign({}, toast, { leaving: true }) : toast)))
          const removeTimer = setTimeout(() => {
            setToasts((previous) => previous.filter((toast) => toast.id !== id))
            toastTimers.current = toastTimers.current.filter((entry) => entry !== leaveTimer && entry !== removeTimer)
          }, 220)
          toastTimers.current.push(removeTimer)
        }, 3400)
        toastTimers.current.push(leaveTimer)
      }, [])

      useEffect(() => () => {
        for (const timer of toastTimers.current) clearTimeout(timer)
        toastTimers.current = []
      }, [])

      /* Tooltip lifetime: hide on any scroll, blur, or outside mousedown; remove the
       * body-level node when the section unmounts. */
      useEffect(() => {
        const onScroll = () => hideTooltip()
        const onBlur = () => hideTooltip()
        const onMouseDown = () => hideTooltip()
        document.addEventListener('scroll', onScroll, true)
        document.addEventListener('mousedown', onMouseDown)
        if (typeof window !== 'undefined' && window !== null) window.addEventListener('blur', onBlur)
        return () => {
          document.removeEventListener('scroll', onScroll, true)
          document.removeEventListener('mousedown', onMouseDown)
          if (typeof window !== 'undefined' && window !== null) window.removeEventListener('blur', onBlur)
          hideTooltip()
          if (tooltip.node !== null) {
            if (tooltip.node.parentNode !== null && tooltip.node.parentNode !== undefined) tooltip.node.parentNode.removeChild(tooltip.node)
            tooltip.node = null
          }
        }
      }, [])

      const loadState = useCallback(async () => {
        const seq = requestSeq.current + 1
        requestSeq.current = seq
        try {
          const payload = await callApi('state', {})
          if (requestSeq.current !== seq) return null
          setView({ status: 'ready', data: payload, error: null })
          return payload
        } catch (failure) {
          if (requestSeq.current !== seq) return null
          if (failure !== null && failure !== undefined && failure.code === 'unauthorized') {
            setView({ status: 'unauthorized', data: null, error: null })
            return null
          }
          setView((previous) => previous.status === 'ready'
            ? { status: 'ready', data: previous.data, error: describeError(tRef.current, failure) }
            : { status: 'error', data: null, error: describeError(tRef.current, failure) })
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

      const mutate = useCallback(async (op, args, successText) => {
        setBusy(op)
        try {
          const payload = await callApi(op, args)
          if (typeof successText === 'string' && successText !== '') pushToast('success', successText)
          return { ok: true, payload: payload }
        } catch (failure) {
          if (failure !== null && failure !== undefined && failure.code === 'unauthorized') {
            setView({ status: 'unauthorized', data: null, error: null })
            return { ok: false, error: tRef.current('state.unauthorized') }
          }
          const message = describeError(tRef.current, failure)
          pushToast('error', tRef.current('state.operationFailed') + ': ' + message)
          return { ok: false, error: message }
        } finally {
          setBusy('')
          await loadState()
        }
      }, [loadState, pushToast])

      const handleFailure = useCallback((failure) => {
        if (failure !== null && failure !== undefined && failure.code === 'unauthorized') {
          setView({ status: 'unauthorized', data: null, error: null })
          return
        }
        pushToast('error', tRef.current('state.operationFailed') + ': ' + describeError(tRef.current, failure))
      }, [pushToast])

      const data = view.data !== null && view.data !== undefined ? view.data : {}
      const rows = Array.isArray(data.rows) ? data.rows : []
      const library = Array.isArray(data.library) ? data.library : []
      const workspaces = Array.isArray(data.workspaces) ? data.workspaces : []
      const warnings = Array.isArray(data.warnings) ? data.warnings : []
      const scope = data.scope !== null && data.scope !== undefined && typeof data.scope === 'object' ? data.scope : {}
      const profile = textOf(scope.profile)
      const homePatch = textOf(scope.homePatch)
      const profilePatch = textOf(scope.profilePatch)
      // DSH exposes no workspace↔profile association; never infer one from a title or
      // directory name. The profile name alone labels the page.
      const currentName = profile !== '' ? profile : t('page.profileFallback')

      const libraryOther = library.filter((entry) => isObject(entry) && (!Array.isArray(entry.origins) || entry.origins.length === 0))
      const enabledCount = rows.filter((row) => isObject(row) && row.disabled !== true).length
      const counts = {
        all: rows.length,
        global: rows.filter((row) => isObject(row) && row.level === 'global').length,
        workspace: rows.filter((row) => isObject(row) && row.level === 'workspace').length,
        other: libraryOther.length,
      }
      const workspaceCounts = {}
      for (const row of rows) {
        if (!isObject(row) || row.level !== 'workspace') continue
        const attached = Array.isArray(row.workspaces) ? row.workspaces : []
        for (const path of attached) {
          const key = textOf(path)
          if (key === '') continue
          workspaceCounts[key] = (workspaceCounts[key] !== undefined ? workspaceCounts[key] : 0) + 1
        }
      }

      const needle = query.trim().toLowerCase()
      const matches = (haystack) => needle === '' || haystack.toLowerCase().includes(needle)
      const rowHaystack = (row) => {
        const parts = [textOf(row.serverName), textOf(row.description), textOf(row.target), textOf(row.id)]
        const attached = Array.isArray(row.workspaces) ? row.workspaces : []
        for (const path of attached) parts.push(workspaceLabel(workspaces, path))
        const probe = isObject(row.lastProbe) ? row.lastProbe : null
        if (isObject(probe) && Array.isArray(probe.toolNames)) {
          for (const name of probe.toolNames) parts.push(textOf(name))
        }
        return parts.join(' ')
      }
      const libraryHaystack = (entry) => {
        const parts = [textOf(entry.serverName), textOf(entry.description), targetOfConfig(entry.config)]
        const attached = Array.isArray(entry.workspaces) ? entry.workspaces : []
        for (const path of attached) parts.push(workspaceLabel(workspaces, path))
        const extra = isObject(entry.extra) ? entry.extra : {}
        if (Array.isArray(extra.autoApprove)) for (const name of extra.autoApprove) parts.push(textOf(name))
        if (Array.isArray(extra.disabledTools)) for (const name of extra.disabledTools) parts.push(textOf(name))
        return parts.join(' ')
      }
      const visibleRows = rows.filter((row) => {
        if (!isObject(row)) return false
        if (scopeFilter === 'global' && row.level !== 'global') return false
        if (scopeFilter === 'workspace' && row.level !== 'workspace') return false
        if (scopeFilter === 'other') return false
        return matches(rowHaystack(row))
      })
      const visibleLibrary = scopeFilter === 'other'
        ? libraryOther.filter((entry) => matches(libraryHaystack(entry)))
        : []
      const empty = visibleRows.length === 0 && visibleLibrary.length === 0

      const toggleRow = (row) => {
        const nextEnabled = row.disabled === true
        const text = nextEnabled ? t('card.enabledToast', { name: row.serverName }) : t('card.disabledToast', { name: row.serverName })
        void mutate('setEnabled', { id: row.id, level: row.level, enabled: nextEnabled }, text)
      }

      const testRow = async (row) => {
        if (testingIds[row.id] === true) return
        const key = row.id
        setTestingIds((previous) => Object.assign({}, previous, { [key]: true }))
        try {
          const payload = await callApi('probe', { id: row.id, level: row.level })
          const result = payload.result !== undefined ? payload.result : null
          if (isObject(result) && result.ok === true) {
            const ms = typeof result.durationMs === 'number' && Number.isFinite(result.durationMs) ? Math.round(result.durationMs) : 0
            const tools = typeof result.toolCount === 'number' && Number.isFinite(result.toolCount) ? result.toolCount : 0
            pushToast('success', t('card.testOkToast', { name: row.serverName, ms: ms, tools: tools }))
          } else {
            const message = isObject(result) && isObject(result.error) && textOf(result.error.message) !== '' ? result.error.message : t('state.unknownError')
            pushToast('warning', t('card.testFailToast', { name: row.serverName, message: message }))
          }
        } catch (failure) {
          handleFailure(failure)
        } finally {
          setTestingIds((previous) => {
            const next = Object.assign({}, previous)
            delete next[key]
            return next
          })
          await loadState()
        }
      }

      const testAll = async () => {
        if (testingAll === true) return
        const active = rows.filter((row) => isObject(row) && row.disabled !== true)
        if (active.length === 0) {
          pushToast('warning', t('card.testAllNone'))
          return
        }
        setTestingAll(true)
        pushToast('info', t('card.testAllRunning', { count: active.length }))
        try {
          const payload = await callApi('probeAll', {})
          const results = Array.isArray(payload.results) ? payload.results : []
          let ok = 0
          for (const entry of results) {
            if (isObject(entry) && isObject(entry.result) && entry.result.ok === true) ok += 1
          }
          if (results.length === active.length && ok === results.length) {
            pushToast('success', t('card.testAllDone', { count: results.length }))
          } else {
            pushToast('warning', t('card.testAllPartial', { total: results.length, ok: ok }))
          }
        } catch (failure) {
          handleFailure(failure)
        } finally {
          setTestingAll(false)
          await loadState()
        }
      }

      const openCreate = (event) => {
        hideTooltip()
        setEditor({ mode: 'create', row: null, returnFocus: event !== undefined && event !== null ? event.currentTarget : null })
      }
      const openEdit = (row) => {
        hideTooltip()
        setEditor({ mode: 'edit', row: row, returnFocus: typeof document !== 'undefined' ? document.activeElement : null })
      }
      const openManage = (row) => {
        hideTooltip()
        setManage({ row: row, returnFocus: typeof document !== 'undefined' ? document.activeElement : null })
      }
      const openDelete = (item, kind) => {
        hideTooltip()
        setDeleteTarget({ kind: kind !== undefined ? kind : 'row', item: item, returnFocus: typeof document !== 'undefined' ? document.activeElement : null })
      }
      const openConfig = (event) => {
        hideTooltip()
        setConfigView({ returnFocus: event !== undefined && event !== null ? event.currentTarget : null })
      }

      const submitEditor = async (args) => {
        if (editor === null) return { ok: false, error: '' }
        const editing = editor.mode === 'edit'
        const name = textOf(args.config.serverName)
        const target = args.level === 'global' ? t('editor.targetGlobal') : t('editor.targetWorkspace')
        const success = editing
          ? t('editor.updated', { target: target })
          : t('editor.created', { name: name, target: target })
        const result = await mutate(editing ? 'update' : 'create', args, success)
        if (result.ok === true) setEditor(null)
        return result
      }

      const saveManage = async (selected, targetRow) => {
        if (manage === null) return { ok: false, error: '' }
        const row = targetRow !== undefined && targetRow !== null && isObject(targetRow) ? targetRow : manage.row
        return mutate(
          'setWorkspaces',
          { id: row.id, level: row.level, workspaces: selected },
          t('manage.saved', { name: row.serverName }),
        )
      }

      const moveManage = async (targetLevel, sourceRow) => {
        if (manage === null) return { ok: false, error: '', row: null }
        const source = sourceRow !== undefined && sourceRow !== null && isObject(sourceRow) ? sourceRow : manage.row
        const target = targetLevel === 'global' ? t('editor.targetGlobal') : t('editor.targetWorkspace')
        const result = await mutate(
          'moveLevel',
          { id: source.id, level: source.level, targetLevel: targetLevel },
          t('manage.moved', { name: source.serverName, target: target }),
        )
        const row = result.ok === true && isObject(result.payload) && isObject(result.payload.row) ? result.payload.row : null
        return { ok: result.ok === true, error: typeof result.error === 'string' ? result.error : '', row: row }
      }

      const confirmDelete = async (mode) => {
        if (deleteTarget === null) return { ok: false, error: '' }
        if (deleteTarget.kind === 'library') {
          const entry = deleteTarget.item
          return mutate('libraryRemove', { serverName: entry.serverName }, t('card.libraryRemoved', { name: entry.serverName }))
        }
        const row = deleteTarget.item
        const purge = mode === 'purge'
        return mutate(
          'remove',
          { id: row.id, level: row.level, purge: purge },
          purge ? t('delete.purged', { name: row.serverName }) : t('delete.done', { name: row.serverName }),
        )
      }

      const libraryApplyArgs = (entry) => {
        const attached = Array.isArray(entry.workspaces) ? entry.workspaces.map((path) => textOf(path)).filter((path) => path !== '') : []
        const args = { level: 'workspace', serverName: entry.serverName }
        if (attached.length > 0) args.workspaces = attached
        return args
      }

      const applyLibrary = async (entry) => {
        const result = await mutate('libraryApply', libraryApplyArgs(entry), t('card.applied', { name: entry.serverName }))
        if (result.ok === true) setScopeFilter('all')
        return result
      }

      const applyLibraryAndEdit = async (entry) => {
        const result = await mutate('libraryApply', libraryApplyArgs(entry), t('card.applied', { name: entry.serverName }))
        if (result.ok === true) {
          setScopeFilter('all')
          const row = isObject(result.payload) && isObject(result.payload.row) ? result.payload.row : null
          if (row !== null) setEditor({ mode: 'edit', row: row, returnFocus: typeof document !== 'undefined' ? document.activeElement : null })
        }
        return result
      }

      // Library entry -> apply to the current profile first, then manage the workspace
      // tags of the row the Host just returned. An apply failure (e.g. duplicate name)
      // surfaces the Host error toast and no dialog opens.
      const applyLibraryAndManage = async (entry) => {
        const result = await mutate('libraryApply', libraryApplyArgs(entry), t('card.applied', { name: entry.serverName }))
        if (result.ok !== true) return result
        setScopeFilter('all')
        const row = isObject(result.payload) && isObject(result.payload.row) ? result.payload.row : null
        if (row !== null) setManage({ row: row, returnFocus: typeof document !== 'undefined' ? document.activeElement : null })
        return result
      }

      const copyShare = async (item) => {
        const config = isObject(item.config) ? item.config : {}
        const node = Object.assign({}, config)
        if (item.disabled === true) node.disabled = true
        const description = textOf(item.description)
        if (description !== '') node.description = description
        const extra = isObject(item.extra) ? item.extra : {}
        if (isObject(extra.oauth) && (extra.oauth.enabled === true || textOf(extra.oauth.clientId) !== '' || textOf(extra.oauth.scopes) !== '')) {
          node.oauth = {
            enabled: extra.oauth.enabled === true,
            clientId: textOf(extra.oauth.clientId),
            scopes: splitWhitespace(extra.oauth.scopes),
          }
        }
        if (isObject(extra.capabilities)) {
          node.capabilities = {
            tools: extra.capabilities.tools !== false,
            resources: extra.capabilities.resources !== false,
            prompts: extra.capabilities.prompts !== false,
          }
        }
        if (Array.isArray(extra.autoApprove) && extra.autoApprove.length > 0) node.autoApprove = extra.autoApprove.map((name) => textOf(name))
        if (Array.isArray(extra.disabledTools) && extra.disabledTools.length > 0) node.disabledTools = extra.disabledTools.map((name) => textOf(name))
        if (typeof extra.maxRetries === 'number' && Number.isFinite(extra.maxRetries)) node.maxRetries = extra.maxRetries
        const text = JSON.stringify({ mcpServers: { [item.serverName]: node } }, null, 2)
        const copied = await copyText(text)
        pushToast(copied ? 'success' : 'warning', copied ? t('action.copied') : t('action.copyFailed'))
      }

      const header = h(
        'div',
        { className: 'mm-head' },
        h(
          'div',
          { className: 'mm-head-text' },
          h(
            'div',
            { className: 'mm-title-row' },
            h('h1', { className: 'mm-title' }, t('page.title')),
            h('span', { className: 'mm-enabled-pill' }, t('page.enabledPill', { count: enabledCount })),
          ),
          h('p', { className: 'mm-subtitle' }, t('page.subtitle', { name: currentName })),
        ),
        h(
          'div',
          { className: 'mm-head-actions' },
          h(
            IconButton,
            {
              label: t('action.testAll'),
              tooltip: t('tooltip.testAll'),
              tone: 'ok',
              spin: testingAll === true,
              disabled: testingAll === true,
              onClick: testAll,
            },
            h('path', { d: 'M13 10V3L4 14h7v7l9-11h-7z' }),
          ),
          h(
            IconButton,
            {
              label: t('action.openConfig'),
              tooltip: t('tooltip.openConfig'),
              tone: 'plain',
              onClick: openConfig,
            },
            h('path', { d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }),
          ),
          h(
            Button,
            { variant: 'primary', onClick: openCreate },
            h('svg', { className: 'mm-icon', viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M12 4v16m8-8H4' })),
            h('span', null, t('action.addServer')),
          ),
        ),
      )

      const filterBar = h(
        'div',
        { className: 'mm-filter' },
        h(Segmented, {
          value: scopeFilter,
          ariaLabel: t('page.title'),
          options: [
            { value: 'all', label: t('filter.all'), count: counts.all },
            { value: 'global', label: t('filter.global'), count: counts.global, dot: 'global' },
            { value: 'workspace', label: t('filter.workspace'), count: counts.workspace, dot: 'brand' },
            { value: 'other', label: t('filter.other'), count: counts.other, dot: 'warn' },
          ],
          onChange: setScopeFilter,
        }),
        h(
          'div',
          { className: 'mm-search' },
          h('svg', { className: 'mm-search-icon', viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' })),
          h(TextInput, {
            value: query,
            placeholder: t('search.placeholder'),
            ariaLabel: t('search.placeholder'),
            className: 'mm-search-input',
            onChange: setQuery,
          }),
        ),
      )

      const cardProps = {
        t: t,
        workspaces: workspaces,
        currentName: currentName,
        homePatch: homePatch,
        profilePatch: profilePatch,
        busy: busy !== '',
        testingAll: testingAll,
        onToggleEnabled: toggleRow,
        onTest: testRow,
        onManage: openManage,
        onEdit: openEdit,
        onApplyEdit: applyLibraryAndEdit,
        onManageLibrary: applyLibraryAndManage,
        onCopyShare: copyShare,
      }

      let results
      if (empty) {
        results = h(EmptyState, {
          title: scopeFilter === 'other' ? t('empty.other') : t('empty.title'),
          hint: scopeFilter === 'other' ? null : t('empty.hint'),
          actionLabel: scopeFilter === 'other' ? null : t('empty.add'),
          onAction: openCreate,
        })
      } else {
        results = h(
          'div',
          { className: 'mm-list' },
          visibleRows.map((row) => h(ServerCard, Object.assign({}, cardProps, {
            key: row.id,
            kind: 'row',
            item: row,
            expanded: expanded[row.id] === true,
            testing: testingIds[row.id] === true,
            onToggleExpand: () => setExpanded((previous) => Object.assign({}, previous, { [row.id]: !previous[row.id] })),
            onDelete: (item) => openDelete(item, 'row'),
          }))),
          visibleLibrary.map((entry) => h(ServerCard, Object.assign({}, cardProps, {
            key: 'lib:' + entry.serverName,
            kind: 'library',
            item: entry,
            expanded: expanded['lib:' + entry.serverName] === true,
            testing: false,
            onToggleExpand: () => setExpanded((previous) => Object.assign({}, previous, { ['lib:' + entry.serverName]: !previous['lib:' + entry.serverName] })),
            onApply: applyLibrary,
            onDelete: (item) => openDelete(item, 'library'),
          }))),
        )
      }

      const warningsBanner = warnings.length > 0
        ? h(
          'div',
          { className: 'mm-warn-banner', role: 'status', title: warnings.map((warning) => textOf(warning)).join('\n') },
          h('strong', null, t('warnings.title')),
          h('span', { className: 'mm-warn-text' }, warnings.map((warning) => textOf(warning)).join(' · ')),
        )
        : null
      const errorBanner = view.error !== null && view.error !== undefined && view.status === 'ready'
        ? h(
          'div',
          { className: 'mm-warn-banner mm-err-banner', role: 'alert', title: view.error },
          h('strong', null, t('state.error')),
          h('span', { className: 'mm-warn-text' }, view.error),
        )
        : null

      let content
      if (view.status === 'ready') {
        content = h(
          Fragment,
          null,
          header,
          warningsBanner,
          errorBanner,
          filterBar,
          h(
            'div',
            { className: 'mm-results' + (empty ? ' mm-results-empty' : ' mm-results-list') },
            results,
          ),
        )
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
        content = h(StatePanel, { title: t('state.loading') })
      }

      return h(
        'section',
        { className: 'mm-page', 'aria-label': t('section.title') },
        content,
        editor !== null
          ? h(EditorDialog, {
            t: t,
            mode: editor.mode,
            row: editor.row,
            workspaces: workspaces,
            workspaceCounts: workspaceCounts,
            profilePatch: profilePatch,
            homePatch: homePatch,
            returnFocus: editor.returnFocus,
            onClose: () => setEditor(null),
            onSubmit: submitEditor,
            onToast: pushToast,
          })
          : null,
        manage !== null
          ? h(ManageDialog, {
            t: t,
            row: manage.row,
            workspaces: workspaces,
            workspaceCounts: workspaceCounts,
            returnFocus: manage.returnFocus,
            onClose: () => setManage(null),
            onSave: saveManage,
            onMove: moveManage,
          })
          : null,
        deleteTarget !== null && deleteTarget.kind === 'row'
          ? h(DeleteDialog, {
            t: t,
            row: deleteTarget.item,
            workspaces: workspaces,
            returnFocus: deleteTarget.returnFocus,
            onClose: () => setDeleteTarget(null),
            onConfirm: confirmDelete,
          })
          : null,
        deleteTarget !== null && deleteTarget.kind === 'library'
          ? h(LibraryDeleteDialog, {
            t: t,
            returnFocus: deleteTarget.returnFocus,
            onClose: () => setDeleteTarget(null),
            onConfirm: confirmDelete,
          })
          : null,
        configView !== null
          ? h(ConfigDialog, {
            t: t,
            returnFocus: configView.returnFocus,
            onClose: () => setConfigView(null),
            onToast: pushToast,
          })
          : null,
        h(ToastHost, { toasts: toasts }),
      )
    }

    /* ------------------------------------------------------------------ *
     * Styles: theme tokens only, every class prefixed with `mm-`.        *
     * ------------------------------------------------------------------ */

    const CSS = [
      '.mm-page{display:flex;flex-direction:column;gap:12px;width:100%;max-width:980px;height:100%;min-height:0;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:13px;line-height:20px}',
      '.mm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;min-width:0}',
      '.mm-head-text{min-width:0}',
      '.mm-title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}',
      '.mm-title{margin:0;font-size:16px;line-height:24px;font-weight:600;white-space:nowrap;color:var(--dsw-alias-label-primary)}',
      '.mm-enabled-pill{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:12px;line-height:18px;color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);border:1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent);white-space:nowrap}',
      '.mm-subtitle{margin:4px 0 0;font-size:13px;line-height:19px;color:var(--dsw-alias-label-secondary);word-break:break-word}',
      '.mm-head-actions{display:flex;align-items:center;gap:8px;flex:none}',
      '.mm-head-actions .mm-icon-btn{width:36px;height:36px;border-radius:9px}',
      '.mm-head-actions .mm-btn{height:36px;border-radius:9px}',
      '.mm-btn{font:inherit;font-size:12px;line-height:18px;height:32px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;cursor:pointer;color:var(--dsw-alias-label-primary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;transition:background .15s ease,border-color .15s ease,color .15s ease}',
      '.mm-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.mm-btn:disabled{opacity:.45;cursor:default}',
      '.mm-btn-sm{height:28px;padding:0 10px;font-size:11.5px}',
      '.mm-btn-block{width:100%}',
      '.mm-btn-primary{color:var(--dsw-alias-bg-base);background:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary);font-weight:600}',
      '.mm-btn-primary:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-label-primary) 88%, var(--dsw-alias-bg-base))}',
      '.mm-btn-brand{color:var(--dsw-alias-bg-base);background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);font-weight:600}',
      '.mm-btn-brand:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-brand-primary) 84%, var(--dsw-alias-label-primary))}',
      '.mm-btn-danger{color:var(--dsw-alias-bg-base);background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);font-weight:600}',
      '.mm-btn-danger:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 86%, var(--dsw-alias-label-primary))}',
      '.mm-btn-ghost{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1)}',
      '.mm-btn-warn{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, transparent)}',
      '.mm-btn-warn:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 20%, transparent)}',
      '.mm-btn svg{flex:none}',
      '.mm-icon{display:block;flex:none}',
      '.mm-icon-btn{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;transition:background .15s ease,border-color .15s ease,color .15s ease}',
      '.mm-icon-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.mm-icon-btn:disabled{opacity:.45;cursor:default}',
      '.mm-icon-btn-ok{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 32%, transparent)}',
      '.mm-icon-btn-brand{color:var(--dsw-alias-brand-primary)}',
      '.mm-icon-btn-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-icon-btn-plain{color:var(--dsw-alias-label-secondary)}',
      '.mm-icon-btn-danger:hover:not(:disabled){color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}',
      '.mm-icon-btn-spin .mm-icon{animation:mm-spin .85s linear infinite}',
      '.mm-chip{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);font-size:11px;line-height:18px;white-space:nowrap;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}',
      '.mm-chip-brand{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 34%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent)}',
      '.mm-chip-global{color:color-mix(in srgb, var(--dsw-alias-brand-primary) 78%, var(--dsw-alias-label-primary));border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 52%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 24%, transparent)}',
      '.mm-chip-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.mm-ws-badges{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;min-width:0;max-width:100%;scrollbar-width:thin;padding-bottom:1px}',
      '.mm-ws-badges > *{flex:none}',
      '.mm-chip-ws{max-width:220px;overflow:hidden;text-overflow:ellipsis;display:inline-block;line-height:18px}',
      '.mm-chip-ok{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 34%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)}',
      '.mm-chip-warn{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 34%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent)}',
      '.mm-chip-err{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 34%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}',
      '.mm-chip-neutral{color:var(--dsw-alias-label-secondary)}',
      '.mm-chip-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;background:var(--dsw-alias-bg-base)}',
      '.mm-chip-strike{text-decoration:line-through}',
      '.mm-scope-chip{border:none;background:transparent;padding:0;cursor:pointer;display:inline-flex;font:inherit;min-width:0;max-width:100%;flex:0 1 auto}',
      '.mm-scope-wrap{min-width:0;max-width:min(320px,100%);overflow:hidden}',
      '.mm-scope-chip .mm-chip{min-width:0;max-width:100%;overflow:hidden}',
      '.mm-scope-chip:hover .mm-chip{border-color:var(--dsw-alias-brand-primary)}',
      '.mm-scope-chip[aria-disabled="true"]{opacity:.6;cursor:default}',
      '.mm-scope-chevron{margin-left:4px;display:block;flex:none;opacity:.75}',
      '.mm-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary)}',
      '.mm-dot-ok{background:var(--dsw-alias-state-success-primary)}',
      '.mm-dot-warn{background:var(--dsw-alias-state-warn-primary)}',
      '.mm-dot-err{background:var(--dsw-alias-state-error-primary)}',
      '.mm-dot-muted{background:var(--dsw-alias-label-tertiary)}',
      '.mm-dot-brand{background:var(--dsw-alias-brand-primary)}',
      '.mm-dot-global{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, var(--dsw-alias-label-primary))}',
      '.mm-dot-pulse{animation:mm-pulse 1.8s ease-in-out infinite}',
      '.mm-status{font-size:11px;line-height:16px;white-space:nowrap}',
      '.mm-status-ok{color:var(--dsw-alias-state-success-primary)}',
      '.mm-status-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-status-err{color:var(--dsw-alias-state-error-primary)}',
      '.mm-status-muted{color:var(--dsw-alias-label-tertiary)}',
      '.mm-filter{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;flex:none}',
      '.mm-seg{display:inline-flex;align-items:center;gap:2px;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);flex:none;max-width:100%;flex-wrap:wrap}',
      '.mm-seg-btn{font:inherit;font-size:12px;line-height:18px;height:26px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;background:transparent;border:none;border-radius:7px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}',
      '.mm-seg-btn:hover:not(:disabled){color:var(--dsw-alias-label-primary)}',
      '.mm-seg-btn-active{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-primary);font-weight:600}',
      '.mm-seg-btn:disabled{opacity:.55;cursor:default}',
      '.mm-seg-text{display:inline-flex;align-items:center;gap:6px}',
      '.mm-seg-count{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-seg-btn-active .mm-seg-count{color:var(--dsw-alias-label-secondary)}',
      '.mm-seg-icon{display:block;flex:none}',
      '.mm-search{position:relative;flex:0 1 240px;min-width:180px}',
      '.mm-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--dsw-alias-label-tertiary);pointer-events:none}',
      '.mm-search-input{padding-left:30px}',
      '.mm-input{font:inherit;font-size:12px;line-height:18px;box-sizing:border-box;width:100%;height:32px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 10px;outline:none;min-width:0}',
      '.mm-input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);outline-offset:1px}',
      '.mm-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.mm-textarea{height:auto;resize:vertical;min-height:64px;line-height:18px}',
      '.mm-fill{flex:1 1 auto;min-height:0;resize:none}',
      '.mm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px}',
      '.mm-results{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}',
      '.mm-results-list{overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:2px;max-height:calc(100vh - 280px)}',
      '.mm-results-empty{overflow:visible}',
      '.mm-list{display:flex;flex-direction:column;gap:10px}',
      '.mm-card{display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px;padding:16px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);min-width:0;transition:background .15s ease,border-color .15s ease}',
      '.mm-card:hover{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 88%, var(--dsw-alias-label-primary))}',
      '.mm-card-dim{opacity:.85}',
      '.mm-card-main{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:6px}',
      '.mm-card-row1{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}',
      '.mm-card-id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary);word-break:break-all}',
      '.mm-card-desc{margin:0;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.mm-card-row3{display:flex;align-items:center;gap:12px;flex-wrap:wrap;min-width:0}',
      '.mm-card-endpoint{flex:1 1 200px;min-width:0;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.mm-expand{display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:11.5px;cursor:pointer;padding:0;white-space:nowrap}',
      '.mm-expand:hover{text-decoration:underline}',
      '.mm-chevron{transition:transform .15s ease}',
      '.mm-chevron-open{transform:rotate(180deg)}',
      '.mm-card-actions{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end}',
      '.mm-card-detail{flex:1 1 100%;display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1);min-width:0}',
      '.mm-detail-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}',
      '.mm-detail-label{font-size:12px;color:var(--dsw-alias-label-secondary);flex:none}',
      '.mm-detail-meta{font-size:11.5px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-detail-meta > span{min-width:0}',
      '.mm-chips-row{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;min-width:0;max-width:100%;padding-bottom:2px;scrollbar-width:thin}',
      '.mm-chips-row > *{flex:none}',
      '.mm-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:28px 16px;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.mm-empty strong{font-size:13px;color:var(--dsw-alias-label-primary);font-weight:600}',
      '.mm-state{display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 16px;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;text-align:center;color:var(--dsw-alias-label-secondary)}',
      '.mm-state-title{margin:0;font-size:13px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.mm-state-hint{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);word-break:break-word}',
      '.mm-warn-banner{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 34%, transparent);border-radius:8px;background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);min-width:0;flex:none}',
      '.mm-warn-banner strong{flex:none;color:var(--dsw-alias-state-warn-primary);font-weight:600}',
      '.mm-warn-text{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.mm-err-banner{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 34%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)}',
      '.mm-err-banner strong{color:var(--dsw-alias-state-error-primary)}',
      '.mm-hint{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-muted{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);word-break:break-all}',
      '.mm-link{border:none;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:11.5px;cursor:pointer;padding:0;white-space:nowrap}',
      '.mm-link:hover{text-decoration:underline}',
      '.mm-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;background:transparent}',
      '.mm-dialog{display:flex;flex-direction:column;box-sizing:border-box;flex:none;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:0 24px 64px color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:13px;line-height:20px;overflow:hidden}',
      '.mm-dialog-editor{width:min(800px,calc(100vw - 48px));height:min(91vh,780px)}',
      '.mm-dialog-manage{width:min(520px,calc(100vw - 48px));height:min(620px,calc(100vh - 48px))}',
      '.mm-dialog-confirm{width:min(480px,calc(100vw - 48px));height:min(340px,calc(100vh - 48px))}',
      '.mm-dialog-config{width:min(760px,calc(100vw - 48px));height:min(88vh,720px)}',
      '.mm-dialog-head{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 24px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.mm-dialog-titles{min-width:0}',
      '.mm-dialog-title{margin:0;font-size:16px;line-height:24px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.mm-dialog-sub{margin:2px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);max-width:560px}',
      '.mm-dialog-head-actions{display:flex;align-items:center;gap:8px;flex:none}',
      '.mm-dialog-head .mm-icon-btn{border-color:transparent;width:28px;height:28px}',
      '.mm-dialog-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:20px 24px;display:flex;flex-direction:column;gap:20px}',
      '.mm-dialog-foot{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:12px 24px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex-wrap:wrap}',
      '.mm-foot-left{display:flex;align-items:center;gap:10px;min-width:0;flex:1 1 220px;margin-right:auto}',
      '.mm-foot-right{display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}',
      '.mm-sync-hint{font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none}',
      '.mm-scope-card{padding:16px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:12px}',
      '.mm-scope-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.mm-scope-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600}',
      '.mm-scope-badge{font-size:10.5px;font-weight:400;padding:1px 6px;border-radius:4px;color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);border:1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 26%, transparent);white-space:nowrap}',
      '.mm-scope-hint{margin:2px 0 0;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary)}',
      '.mm-ws-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}',
      '.mm-ws-option{display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-base);cursor:pointer;min-width:0}',
      '.mm-ws-option:hover{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)}',
      '.mm-ws-option-active{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)}',
      '.mm-ws-option input{margin-top:2px;accent-color:var(--dsw-alias-brand-primary)}',
      '.mm-ws-option-body{min-width:0}',
      '.mm-ws-option-label{font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.mm-ws-option-sub{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary);margin-top:1px}',
      '.mm-merge-preview{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px 10px;word-break:break-word}',
      '.mm-global-hint{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent)}',
      '.mm-merge-empty{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 28%, transparent)}',
      '.mm-form{display:flex;flex-direction:column;gap:20px;min-width:0}',
      '.mm-form-section{display:flex;flex-direction:column;gap:12px;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l1);min-width:0}',
      '.mm-form-section:first-child{padding-top:0;border-top:none}',
      '.mm-form-title{font-size:12px;line-height:18px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}',
      '.mm-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}',
      '.mm-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}',
      '.mm-col-2{grid-column:span 2}',
      '.mm-field{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.mm-field-head{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.mm-field-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.mm-field-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.mm-required{color:var(--dsw-alias-state-error-primary);margin-left:2px}',
      '.mm-transport-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.mm-transport-card{text-align:left;padding:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;transition:border-color .15s ease,background .15s ease}',
      '.mm-transport-card:hover:not(:disabled){border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)}',
      '.mm-transport-card-active{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)}',
      '.mm-transport-card-disabled{opacity:.55;cursor:not-allowed}',
      '.mm-transport-head{display:flex;align-items:center;justify-content:space-between;gap:6px}',
      '.mm-transport-name{font-size:13px;font-weight:600}',
      '.mm-transport-badge{font-size:10px;padding:1px 6px;border-radius:4px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);white-space:nowrap}',
      '.mm-transport-card-active .mm-transport-badge{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 34%, transparent)}',
      '.mm-transport-desc{margin:6px 0 0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}',
      '.mm-kv-list{display:flex;flex-direction:column;gap:8px}',
      '.mm-kv-row{display:flex;align-items:center;gap:8px;min-width:0}',
      '.mm-kv-row .mm-input{flex:1 1 0}',
      '.mm-kv-row .mm-icon-btn{width:28px;height:28px;border-color:transparent;background:transparent}',
      '.mm-kv-row .mm-icon-btn:hover:not(:disabled){color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}',
      '.mm-check{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}',
      '.mm-check input{accent-color:var(--dsw-alias-brand-primary);width:14px;height:14px;margin:0}',
      '.mm-check-label{min-width:0}',
      '.mm-cap-box{display:flex;align-items:center;gap:12px;min-height:32px;padding:5px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);flex-wrap:wrap}',
      '.mm-cap-box .mm-check{white-space:normal}',
      '.mm-oauth{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:12px;display:flex;flex-direction:column;gap:10px}',
      '.mm-oauth-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
      '.mm-oauth-head input{accent-color:var(--dsw-alias-brand-primary);width:16px;height:16px;margin-top:2px}',
      '.mm-oauth-title{font-size:12px;font-weight:500}',
      '.mm-oauth-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}',
      '.mm-oauth-detail{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.mm-json-panel{display:flex;flex-direction:column;gap:10px;min-height:0;flex:1 1 auto}',
      '.mm-json-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.mm-json-hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);flex:1 1 280px;min-width:0}',
      '.mm-json-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.mm-json-panel .mm-textarea{flex:1 1 auto;min-height:220px;background:var(--dsw-alias-bg-layer-2)}',
      '.mm-json-feedback{padding:8px 10px;border-radius:8px;font-size:12px;line-height:18px;border:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
      '.mm-json-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border-radius:8px;font-size:12px;line-height:18px;border:1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 32%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent);color:var(--dsw-alias-label-secondary)}',
      '.mm-json-confirm-text{flex:1 1 220px;min-width:0}',
      '.mm-json-feedback-ok{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 26%, transparent)}',
      '.mm-json-feedback-err{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 26%, transparent)}',
      '.mm-test-text{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.mm-test-ok{color:var(--dsw-alias-state-success-primary)}',
      '.mm-test-err{color:var(--dsw-alias-state-error-primary)}',
      '.mm-test-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.mm-manage-target{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);flex-wrap:wrap}',
      '.mm-manage-global{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);cursor:pointer}',
      '.mm-manage-global input{margin-top:2px;accent-color:var(--dsw-alias-brand-primary)}',
      '.mm-manage-global-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;flex-wrap:wrap}',
      '.mm-manage-global-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:2px}',
      '.mm-manage-global-locked{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-top:4px}',
      '.mm-manage-specific{display:flex;flex-direction:column;gap:8px}',
      '.mm-manage-specific-title{font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary)}',
      '.mm-manage-list{display:flex;flex-direction:column;gap:8px}',
      '.mm-manage-ws{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-base);cursor:pointer}',
      '.mm-manage-ws-active{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent)}',
      '.mm-manage-ws input{margin-top:2px;accent-color:var(--dsw-alias-brand-primary)}',
      '.mm-manage-ws-body{flex:1 1 auto;min-width:0}',
      '.mm-manage-ws-title{font-size:12.5px;font-weight:500}',
      '.mm-manage-ws-path{font-size:10.5px;color:var(--dsw-alias-label-tertiary);word-break:break-all}',
      '.mm-manage-count{font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);padding:1px 7px;border-radius:999px;white-space:nowrap;flex:none}',
      '.mm-manage-note{padding:9px 11px;border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, transparent);border-radius:8px;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);font-size:11.5px;line-height:17px;color:var(--dsw-alias-brand-primary)}',
      '.mm-delete-head{display:flex;align-items:flex-start;gap:12px}',
      '.mm-delete-icon{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 28%, transparent)}',
      '.mm-dialog-confirm .mm-dialog-body{min-height:0}',
      '.mm-delete-desc{margin:4px 0 0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}',
      '.mm-delete-choices{display:flex;flex-direction:column;gap:8px}',
      '.mm-delete-option{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1);cursor:pointer}',
      '.mm-delete-option input{margin-top:2px;accent-color:var(--dsw-alias-brand-primary)}',
      '.mm-delete-option-active{border-color:var(--dsw-alias-brand-primary)}',
      '.mm-delete-option-danger.mm-delete-option-active{border-color:var(--dsw-alias-state-error-primary)}',
      '.mm-delete-option-danger input{accent-color:var(--dsw-alias-state-error-primary)}',
      '.mm-delete-option-title{font-size:12.5px;font-weight:500}',
      '.mm-delete-option-sub{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);margin-top:1px}',
      '.mm-danger-text{color:var(--dsw-alias-state-error-primary)}',
      '.mm-dialog-text{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}',
      '.mm-config-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.mm-config-path{font-size:11px;color:var(--dsw-alias-brand-primary);word-break:break-all;min-width:0}',
      '.mm-config-readonly{font-size:11.5px;color:var(--dsw-alias-label-tertiary);margin-right:auto;min-width:0}',
      '.mm-code{margin:0;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:18px;white-space:pre-wrap;word-break:break-all;overflow:auto}',
      '.mm-code-fill{flex:1 1 auto;min-height:0}',
      '.mm-toasts{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2100;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;max-width:min(520px,calc(100vw - 32px))}',
      '.mm-toast{display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12.5px;line-height:18px;box-shadow:0 10px 30px color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);animation:mm-toast-in .18s ease}',
      '.mm-toast-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex:none;background:var(--dsw-alias-brand-primary)}',
      '.mm-toast-success{border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent)}',
      '.mm-toast-success .mm-toast-dot{background:var(--dsw-alias-state-success-primary)}',
      '.mm-toast-info{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)}',
      '.mm-toast-info .mm-toast-dot{background:var(--dsw-alias-brand-primary)}',
      '.mm-toast-warning{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent)}',
      '.mm-toast-warning .mm-toast-dot{background:var(--dsw-alias-state-warn-primary)}',
      '.mm-toast-error{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent)}',
      '.mm-toast-error .mm-toast-dot{background:var(--dsw-alias-state-error-primary)}',
      '.mm-toast-text{min-width:0;word-break:break-word}',
      '.mm-toast-leaving{animation:mm-toast-out .22s ease forwards}',
      '.mm-tooltip{position:fixed;z-index:2000;max-width:min(320px,calc(100vw - 24px));padding:6px 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;line-height:16px;font-weight:500;box-shadow:0 8px 22px color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);pointer-events:none;opacity:0;transform:translateY(2px);transition:opacity .14s ease,transform .14s ease;white-space:nowrap}',
      '.mm-tooltip-show{opacity:1;transform:translateY(0)}',
      '@keyframes mm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@keyframes mm-pulse{0%{transform:scale(.95);opacity:.85}50%{transform:scale(1.15);opacity:.4}100%{transform:scale(.95);opacity:.85}}',
      '@keyframes mm-toast-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes mm-toast-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(6px)}}',
      '@media (max-width:720px){.mm-head{flex-wrap:wrap}.mm-subtitle{font-size:12px}.mm-transport-grid{grid-template-columns:1fr}.mm-dialog-head{padding:14px 16px;flex-wrap:wrap}.mm-dialog-head-actions{margin-left:auto}.mm-dialog-body{padding:16px}.mm-dialog-foot{padding:10px 16px}.mm-foot-right{width:100%;justify-content:flex-end}.mm-col-2{grid-column:auto}}',
      '@media (max-width:520px){.mm-head-actions{width:100%;justify-content:flex-end}.mm-search{flex:1 1 100%}.mm-filter{align-items:stretch}.mm-seg{width:100%}.mm-seg-btn{flex:1 1 auto;justify-content:center}.mm-card-actions{width:100%;justify-content:flex-end}.mm-dialog-editor{height:calc(100vh - 32px)}.mm-backdrop{padding:16px}}',
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
