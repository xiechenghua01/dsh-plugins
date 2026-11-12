# MCP 服务管理 — 信息架构、业务状态机与文案映射

> **文档定位**：本文件只写 `mcp-manager` 的信息架构、业务状态机与文案逐条映射（design.md §0.2）。
> 视觉、交互、尺寸、颜色与字号一律以 [`design.md`](../../design.md) 为准；运行时契约（slots / routes /
> payload / 错误码）见 [`CONTRACT.md`](CONTRACT.md)。
> 历史原型与旧规格只作业务参考；与 design.md 冲突时按 design.md §0.3 裁决，视觉与交互不做折中。

---

## 1. 信息架构

### 1.1 入口与页面骨架

- 插件只注册一个设置页：`settings.section`，`id: mcp-manager`，`order: 16`，导航标题取 `section.title`。
- 插件渲染在 DSH 设置面板的右侧内容区；左侧导航与设置面板外框由宿主提供，插件不自绘。
- **单层直管**：工作区只承载项目路径与会话分组，不承载 MCP 配置；所有服务器都是当前 profile 的
  `@deepseek-ai/dsh-mcp-client` 行，直接读写 `~/.dsh/profiles/<name>/cordis.patch.yml`。
- **界面上不出现**：全局/工作区筛选、工作区分组、工作区绑定、服务器库、导入/导出、「应用到当前工作区」、
  「管理生效工作区」。列表页只有搜索 + 全部服务器；一次配置即在该 profile 的所有工作区会话中生效。
- 页面自上而下：页头 → 警告/错误提示条 → 列表区（或空态/加载/错误态）→ Toast 层。
- 页头一行：标题 + 帮助图标 + 搜索框 + 「刷新」图标按钮 + 「全部测试」图标按钮 + 「新增」主按钮。
- 布局、内边距、响应式与数据四态见 design.md §4.4、§4.7、§7.10。
- 字号跟随、`--ds-fs` 阶梯与浮层字号穿透见 design.md §3。

### 1.2 列表行

每个服务器一行，业务字段固定为：

| 位置 | 内容 | 说明 |
| --- | --- | --- |
| 行首 | 状态点 | 状态语义见 §2.2 |
| 行首 | `serverName` | 完整命令/URL 见第二行摘要 |
| 行首 | 协议标签 | `stdio` / `streamable-http` |
| 行首 | 只读标签（可选） | 仅 `readOnly` 行显示 |
| 行首 | 延迟（可选） | 仅启用且最近一次探测成功时显示 |
| 行首 | 「N 工具」 | 点击展开工具徽章；数量未知时显示 `—`，不冒充 0 |
| 第二行 | 命令/URL 摘要 | stdio 为 `command + args.join(' ')`；远程为 `url` |
| 行尾 | 行内操作 3 个 | 启停、编辑、删除；**不设**行内测试按钮 |

- **行内操作固定 3 个**：启停 / 编辑 / 删除。测试入口只有两处：编辑弹窗底部的「测试连通性」，以及页头的
  「全部测试」。视觉与交互见 design.md §7.2、§7.9。
- 展开区：工具徽章，三态为默认 / 自动允许 / 禁用；徽章 Tooltip 显示「说明 · 状态」。工具来源按优先级合并：
  最近一次 probe 的 `lastProbe.tools` / `lastProbe.toolNames`，其次 DSH 已注册工具 `registeredTools`，
  最后是自允许 / 禁用列表中的名称；按名称去重并保持首见顺序，probe 的说明优先于已注册工具的说明。
- 搜索匹配 `serverName`、命令/URL 摘要、行 `id` 与协议。
- 空列表显示一句话空态（见 design.md §7.10）。

### 1.3 新增 / 编辑弹窗

- 标题：新增时 `editor.addTitle`，编辑时 `editor.editTitle`。
- 顶部切换：`表单` / `JSON` 两个 Tab；JSON Tab 的说明性 Tooltip 取 `action.jsonTip`。
- JSON Tab：大文本域 + 「粘贴社区分享 JSON 示例」+「复制配置」；解析反馈条；语法错误阻止保存。
- 结构化表单字段：
  - 基础：名称 `serverName`、类型 `transport`（`stdio` / `streamable-http` / `sse`）。
  - stdio：`command`、`args`（每行一个参数）、`env`（动态键值行）、高级设置中的 `cwd`。
  - streamable-http：`url`、`headers`（动态键值行）；高级设置中的 `OAuth Client ID` / `OAuth Scopes`。
  - 高级设置（默认折叠）：`超时 (ms)`、`重连次数`；任一高级参数被自定义时标题旁显示 `editor.customized`。
  - 工具权限：连接获取工具、关键字过滤、汇总计数、全设为自动允许、重置默认、逐工具三态。
- 底部：左侧「测试连通性」+ 结果文字；右侧「取消」+「保存」。
- 新建默认启用；编辑保持行当前的启用/停用状态；弹窗内**没有**「启用此服务器」勾选框。
- 表单控件、Tab、下拉、弹窗与 Tooltip 的视觉与交互见 design.md §7.3、§7.4、§7.5、§7.6、§7.7。其中编辑弹窗贴合并覆盖外层设置面板（宽高跟随宿主 panel，限制在视口内）；确认弹窗固定 480px。此为用户明确要求，优先于 design.md §7.6 的固定档位。

### 1.4 删除确认弹窗

- 标题 `delete.title`，说明由 `delete.descPrefix` + `serverName` + `delete.descSuffix` 组成。
- 操作：「取消」/「删除」（危险主按钮）。
- 视觉与交互见 design.md §7.6（确认档）、§9.4；确认链文案见 §3.5。

### 1.5 全局反馈

- 操作结果用 Toast 呈现，成功/失败/提示三类。
- `state.warnings` 非空时显示警告条；已有数据时请求失败显示错误条并保留旧内容。
- 视觉与交互见 design.md §7.8、§7.10。

---

## 2. 业务状态机

### 2.1 页面数据生命周期

| 状态 | 触发 | 行为 |
| --- | --- | --- |
| 首次加载 | 页面挂载、`data === null` | 显示骨架屏（见 design.md §7.10） |
| 已加载 | `state` 返回成功 | 渲染行列表、警告条；保持 4s 轮询 |
| 刷新中 | 轮询或变更后的重取 | 保留旧内容，不用骨架替换 |
| 未授权 | `401` | 整页未授权态 + 「重试」；不轮询出错误条 |
| 首载失败 | 请求失败且无旧数据 | 整屏错误态 + 「重试」 |
| 有旧数据时失败 | 后续请求失败 | 顶部错误条 + 保留旧内容 |
| 空列表 | 搜索后无匹配行 | 一句话空态（见 design.md §7.10） |

- 每次变更（启停、保存、删除、测试）成功后立即重取 `state`；失败只提示，不清空已有列表。

### 2.2 服务器行状态

按以下优先级取**第一个**命中项：

| 优先级 | 条件 | 状态 | 附加表现 |
| --- | --- | --- | --- |
| 1 | 该行正在测试（全部测试覆盖所有启用行） | `status.testing` | — |
| 2 | `row.disabled === true` | `status.disabled` | 不显示延迟 |
| 3 | `lastProbe.ok === false` | `status.failed` | — |
| 4 | `lastProbe.ok === true` | `status.runningMs`（有耗时）/ `status.running` | 显示延迟 |
| 5 | `row.live.phase === 'failed'` | `status.failed` | — |
| 6 | 其余 | `status.running` | — |

状态的视觉表达（状态点颜色、脉冲等）见 design.md §7.9。

- `toolCount` 优先取 `row.toolCount`；其次取成功探测（`lastProbe.ok === true`）的 `lastProbe.toolCount`；再次取非空的
  `registeredTools` 长度；都没有时为 `null`，数量显示 `—` 而不是 0。
- 工具名来源按优先级合并：最近一次探测的 `tools` / `toolNames`，其次 DSH 已注册工具 `registeredTools`，
  最后是配置中的 `autoApprove` / `disabledTools`；按名称去重。权限配置里的名称只用于展开区展示，不参与数量推导。
- `readOnly` 行显示只读标签；启停、编辑、删除全部禁用，不发起写请求。

### 2.3 启停

- 点击启停 → 调 `setEnabled`（写 `disabled: true` 或移除 `disabled` 键）→ Toast `toast.enabled` / `toast.disabled` → 重取 `state`。
- 有写操作进行中或行只读时，3 个行内按钮统一禁用，防重复提交。

### 2.4 测试

- **全部测试**（页头）：只测已启用且非只读的行；无启用项时 Toast `toast.testAllNone`，不发起请求。
  进行中按钮显示加载态，所有启用行显示「测试中」；完成后 Toast `toast.testAllDone` 并重取 `state`。
- **测试连通性**（编辑弹窗底部）：探测当前表单草稿，不落盘；结果只显示在弹窗底部。
- 行内不提供测试按钮；单条测试只能从编辑弹窗发起。

### 2.5 编辑与保存

- 新建写入当前 profile 层（`level: 'workspace'`）；编辑沿用行自身的 `level`，行 `id` 不变。
- 保存前校验，任一失败则 Toast 提示并**保持弹窗打开**：
  - `serverName` 必须匹配 `[A-Za-z0-9_-]{1,32}`（`editor.validationName`）。
  - `transport === 'sse'` 直接拦截（`editor.sseBlocked`）；DSH 当前版本只支持 `stdio` 与 `streamable-http`。
  - stdio 必须有 `command`；远程必须有合法 `http(s)` URL。
  - `timeout` 非空时必须是 1000–3600000 的整数；`retries` 非空时必须是 1–1000 的整数。
- **Clean Config**：未填写的选填项（`cwd`、`env`、`headers`、`oauth`、`autoApprove`、`disabledTools`）不写入；
  等于默认值的 `timeout`（60000）与 `maxRetries`（3）不写入。例外：`args` 数组中的空字符串是合法 argv 位置，必须保留。
  表单 → JSON → 保存三条路径共用同一套清理逻辑。
- **args 文本域**：保留独立文本态 + `dirty` 标记，只在失焦、切换 Tab、提交时解析，禁止在 `onChange` 中实时回写。
- **JSON Tab**：解析成功回填表单与工具权限；语法错误阻止保存（`editor.jsonBlocked`）；支持
  `{"mcpServers": {...}}` 与单节点形状。表单 → JSON 时自动过滤空值与默认值。
- **工具权限**：`默认` 不写入；`自动允许` 进 `autoApprove`；`禁用` 进 `disabledTools`；三者互斥。
  当前 DSH 版本的 MCP 客户端**不读取**这两个字段，界面与 Tooltip 必须如实标注「尚未生效」，不得宣称已生效。
- 远程的 `oauth` 同样只写入 `config.oauth`，当前 DSH 版本不读取；不得在界面上宣称已生效。
- 保存成功 → Toast `toast.created` / `toast.updated` → 关闭弹窗 → 重取 `state`；失败 → Toast `toast.saveFailed`，弹窗不关闭。

### 2.6 删除

- 点击删除 → 打开确认弹窗；确认中「取消」「删除」都禁用，防重复提交。
- 成功 → Toast `toast.deleted` → 关闭弹窗 → 重取 `state`。
- 失败 → Toast `toast.operationFailed`，弹窗保持打开，可重试。

### 2.7 只读行

- `readOnly: true`（YAML 无法安全改写）时只展示，不提供任何写操作；Tooltip 文案 `list.readOnlyTip`。
- 删除同样被禁用；Host 侧仍会以 `read-only` 错误码兜底。

---

## 3. 文案逐条映射

- 所有可见文案必须走 `t('key')`；zh / en 两套键集完全一致且非空（design.md §10）。
- `{name}`、`{ms}`、`{count}` 等占位符由 locale 服务插值；`args` 的占位文案内含换行。
- 本表是当前实现的逐条映射；新增/修改文案必须先改 locale，再同步本表。

### 3.1 页头、状态与列表

| locale 键 | 中文 | English |
| --- | --- | --- |
| `section.title` | MCP 服务 | MCP servers |
| `page.title` | MCP 服务 | MCP servers |
| `page.help` | 所有配置写入当前 Profile (cordis.patch.yml)，自动在全部工作区会话中共享生效 | All settings are written to the current Profile (cordis.patch.yml) and shared by every workspace session |
| `page.searchPlaceholder` | 搜索服务... | Search services... |
| `page.refresh` | 刷新列表 | Refresh list |
| `page.testAll` | 测试所有启用的 MCP 服务器 | Test all enabled MCP servers |
| `page.add` | 新增 | Add |
| `page.loading` | 正在加载 MCP 服务器… | Loading MCP servers… |
| `page.unauthorized` | 当前页面未获授权，无法读取 MCP 服务器 | This page is not authorized to read MCP servers |
| `page.error` | 加载失败 | Failed to load |
| `page.retry` | 重试 | Retry |
| `page.warnings` | 注意 | Warnings |
| `status.disabled` | 已停用 | Disabled |
| `status.testing` | 正在测试连通性... | Testing connectivity... |
| `status.failed` | 连接失败 | Connection failed |
| `status.running` | 运行中 | Running |
| `status.runningMs` | 运行中 ({ms}ms) | Running ({ms}ms) |
| `list.empty` | 暂无匹配的 MCP 服务 | No matching MCP servers |
| `list.tools` | {count} 工具 | {count} tools |
| `list.toolsTip` | 点击展开查看工具与权限状态 | Click to expand tools and permission states |
| `list.noTools` | 尚未获取工具列表，可点击「连接获取工具」探测 | No tool list yet; click "Connect and fetch tools" to probe |
| `list.readOnly` | 只读 | Read-only |
| `list.readOnlyTip` | 该行无法安全改写，只能查看 | This row cannot be rewritten safely and is view-only |
| `list.latency` | {ms}ms | {ms}ms |

### 3.2 行内操作与工具权限

| locale 键 | 中文 | English |
| --- | --- | --- |
| `action.toggleEnable` | 启用 MCP 服务器 | Enable MCP server |
| `action.toggleDisable` | 停用 MCP 服务器 | Disable MCP server |
| `action.test` | 测试连通性 | Test connectivity |
| `action.edit` | 更新配置 | Update config |
| `action.delete` | 删除服务器 | Delete server |
| `action.close` | 关闭 | Close |
| `action.cancel` | 取消 | Cancel |
| `action.save` | 保存 | Save |
| `action.probe` | 连接获取工具 | Connect and fetch tools |
| `action.probeTip` | 尝试连接当前配置的 MCP 服务并刷新全量工具列表 | Try to connect to the configured MCP service and refresh the full tool list |
| `action.allAuto` | 全设为自动允许 | Set all to auto-allow |
| `action.resetDefault` | 重置默认 | Reset to default |
| `action.pasteSample` | 粘贴社区分享 JSON 示例 | Paste shared JSON sample |
| `action.copyConfig` | 复制配置 | Copy config |
| `action.add` | + 添加 | + Add |
| `action.removeRow` | 移除此项 | Remove this row |
| `action.jsonTip` | 仅写入非空与非默认字段，支持直接粘贴外部分享的 JSON | Only non-empty and non-default fields are written; paste shared JSON directly |
| `tool.stateDefault` | 未写入配置，沿用宿主工具审批策略 | Not written to config; follows the host tool approval policy |
| `tool.stateAuto` | 配置为自动允许 (autoApprove)；当前 DSH 版本的 MCP 客户端尚未读取该字段 | Configured as auto-allow (autoApprove); the current DSH MCP client does not read this field yet |
| `tool.stateDisabled` | 配置为禁用 (disabledTools)；当前 DSH 版本的 MCP 客户端尚未读取该字段 | Configured as disabled (disabledTools); the current DSH MCP client does not read this field yet |
| `tool.default` | 默认 | Default |
| `tool.auto` | 自动允许 | Auto-allow |
| `tool.disabled` | 禁用 | Disable |
| `tool.defaultTip` | 不写入配置文件，沿用宿主当前的工具审批策略（可能直接允许） | Not written to the config; the current host tool approval policy applies (calls may be allowed directly) |
| `tool.autoTip` | 仅在配置文件中写入 autoApprove；当前 DSH 版本的 MCP 客户端尚未读取该字段，暂不改变实际调用行为 | Writes autoApprove to the config only; the current DSH MCP client does not read this field, so call behavior is unchanged for now |
| `tool.disabledTip` | 仅在配置文件中写入 disabledTools；当前 DSH 版本的 MCP 客户端尚未读取该字段，暂不改变实际调用行为 | Writes disabledTools to the config only; the current DSH MCP client does not read this field, so call behavior is unchanged for now |

### 3.3 Toast

| locale 键 | 中文 | English |
| --- | --- | --- |
| `toast.enabled` | {name} 已启用 | {name} enabled |
| `toast.disabled` | {name} 已停用 | {name} disabled |
| `toast.testOk` | {name} 连通正常（{ms}ms · {tools} 个工具） | {name} is reachable ({ms}ms · {tools} tools) |
| `toast.testFail` | {name} 测试失败：{message} | {name} test failed: {message} |
| `toast.testAllNone` | 暂无已启用的 MCP 服务 | No enabled MCP servers to test |
| `toast.testAllDone` | 已完成 {count} 个启用服务的连通性测试 | Finished testing {count} enabled services |
| `toast.created` | 已添加 {name} | Added {name} |
| `toast.updated` | 已更新 {name} | Updated {name} |
| `toast.deleted` | 已删除 {name} | Deleted {name} |
| `toast.probeOk` | 已连接 MCP 服务并拉取到 {count} 个工具 | Connected and fetched {count} tools |
| `toast.probeFail` | 获取工具失败：{message} | Failed to fetch tools: {message} |
| `toast.copied` | 已复制配置 | Config copied |
| `toast.copyFailed` | 无法写入剪贴板，请手动复制 | Could not write to the clipboard; copy manually |
| `toast.jsonSample` | 已填入示例 JSON | Filled the sample JSON |
| `toast.operationFailed` | 操作失败：{message} | Operation failed: {message} |
| `toast.saveFailed` | 保存失败：{message} | Save failed: {message} |

### 3.4 编辑弹窗

| locale 键 | 中文 | English |
| --- | --- | --- |
| `editor.addTitle` | 新增 MCP 服务 | Add MCP server |
| `editor.editTitle` | 更新 MCP 服务 | Update MCP server |
| `editor.tabForm` | 表单 | Form |
| `editor.tabJson` | JSON | JSON |
| `editor.name` | 名称 | Name |
| `editor.nameTip` | 插件注册作用域内的唯一标识 (serverName)，模型侧工具前缀为 mcp__<名称>__ | Unique identifier in the plugin scope (serverName); model tool prefix is mcp__<name>__ |
| `editor.namePlaceholder` | 例如: filesystem 或 github | e.g. filesystem or github |
| `editor.transport` | 类型 | Type |
| `editor.transportTip` | stdio: 本地子进程通信；streamable-http: 远程流式 HTTP；sse: 远程事件流 | stdio: local subprocess; streamable-http: remote streaming HTTP; sse: remote event stream |
| `editor.command` | 命令 (Command) | Command |
| `editor.commandTip` | 启动本地 MCP 进程的可执行程序，如 npx、uvx、node、python、docker | Executable that starts the local MCP process, such as npx, uvx, node, python, or docker |
| `editor.commandPlaceholder` | npx | npx |
| `editor.args` | 参数 (Args) | Arguments |
| `editor.argsTip` | 传递给命令的启动参数，每行填写一个参数；未填写则不写入配置文件 | Startup arguments, one per line; omitted from the config when empty |
| `editor.argsPlaceholder` | `-y` 换行 `@modelcontextprotocol/server-filesystem` | `-y` newline `@modelcontextprotocol/server-filesystem` |
| `editor.env` | 环境变量 (Env) | Environment variables |
| `editor.envTip` | 传递给子进程的环境变量键值对；未添加或为空时不写入配置文件 | Key-value pairs passed to the subprocess; omitted from the config when empty |
| `editor.url` | 服务地址 (URL) | URL |
| `editor.urlTip` | 远程 MCP 服务器的完整 HTTP/SSE 端点地址 | Full HTTP or SSE endpoint of the remote MCP server |
| `editor.urlPlaceholder` | https://example.com/mcp | https://example.com/mcp |
| `editor.headers` | 请求头 (Headers) | Headers |
| `editor.headersTip` | 附带在远程请求中的自定义 HTTP Header；为空时不写入配置文件 | Custom HTTP headers for remote requests; omitted from the config when empty |
| `editor.advanced` | 高级设置 | Advanced settings |
| `editor.customized` | 已自定义 | Customized |
| `editor.cwd` | 工作目录 (cwd) | Working directory (cwd) |
| `editor.cwdTip` | 子进程启动的工作目录；留空则使用默认运行目录且不写入配置文件 | Working directory for the subprocess; leave empty to use the default and omit it from the config |
| `editor.cwdPlaceholder` | 默认当前目录 (不写入配置) | Default current directory (not written) |
| `editor.timeout` | 超时 (ms) | Timeout (ms) |
| `editor.timeoutTip` | 单次调用超时时间，系统合理默认值为 60000ms (60秒)；未修改时不写入配置文件 | Per-call timeout. The sensible default is 60000ms (60s); omitted from the config when unchanged |
| `editor.timeoutPlaceholder` | 默认 60000 | Default 60000 |
| `editor.retries` | 重连次数 | Reconnect attempts |
| `editor.retriesTip` | 连接意外断开时的最大自动重连次数，系统合理默认值为 3 次；未修改时不写入配置文件 | Maximum automatic reconnect attempts after a disconnect. The sensible default is 3; omitted when unchanged |
| `editor.retriesPlaceholder` | 默认 3 | Default 3 |
| `editor.oauthClientId` | OAuth Client ID | OAuth Client ID |
| `editor.oauthClientIdTip` | 远程服务启用 OAuth 2.1 时的客户端 ID；留空则不写入配置文件 | OAuth 2.1 client ID for remote services; omitted from the config when empty |
| `editor.oauthClientIdPlaceholder` | 选填 (未填不写入) | Optional (not written when empty) |
| `editor.oauthScopes` | OAuth Scopes | OAuth Scopes |
| `editor.oauthScopesTip` | OAuth 授权范围（空格分隔）；留空则不写入配置文件 | OAuth scopes separated by spaces; omitted from the config when empty |
| `editor.oauthScopesPlaceholder` | 选填，空格分隔 | Optional, space separated |
| `editor.kvKeyEnv` | KEY | KEY |
| `editor.kvValEnv` | VALUE | VALUE |
| `editor.kvKeyHeader` | Header | Header |
| `editor.kvValHeader` | Value | Value |
| `editor.toolsTitle` | 工具权限配置 (autoApprove / disabledTools) | Tool permissions (autoApprove / disabledTools) |
| `editor.toolsTip` | 底层尝试连接 MCP 服务拉取全量工具与说明。设为「自动允许」写入 autoApprove，设为「禁用」写入 disabledTools，保持「默认」则不写入配置文件；当前 DSH 版本的 MCP 客户端尚未读取 autoApprove/disabledTools | Connect to the MCP service to fetch all tools and descriptions. Auto-allow writes autoApprove, Disable writes disabledTools, and Default writes nothing; the current DSH MCP client does not read autoApprove/disabledTools |
| `editor.toolsIdle` | 未获取工具列表 | Tool list not fetched |
| `editor.toolsProbing` | 正在连接服务获取工具... | Connecting to fetch tools... |
| `editor.toolsProbed` | 已连接获取 {count} 个工具 | Connected; fetched {count} tools |
| `editor.toolsProbedTotal` | 已获取 {count} 个工具（服务器共 {total} 个，仅展示前 {count} 个） | Fetched {count} tools ({total} reported; showing the first {count}) |
| `editor.toolsFailed` | 获取失败：{message} | Fetch failed: {message} |
| `editor.filterTools` | 过滤工具名或说明... | Filter tools by name or description... |
| `editor.toolSummary` | 自动允许: {auto} · 禁用: {disabled} | Auto-allow: {auto} · Disabled: {disabled} |
| `editor.toolsEmpty` | 未找到匹配的工具，可点击右上角「连接获取工具」刷新 | No matching tools. Click "Connect and fetch tools" to refresh |
| `editor.jsonHint` | 未填写的选填项与未修改的默认值不会写入配置文件 | Empty optional fields and unchanged defaults are not written to the config |
| `editor.jsonEmpty` | 请粘贴 JSON 内容 | Paste JSON content |
| `editor.jsonValid` | ✓ JSON 格式正确（已自动省去未填项与默认参数） | ✓ Valid JSON (empty and default fields are omitted automatically) |
| `editor.jsonInvalid` | JSON 语法错误: {message} | JSON syntax error: {message} |
| `editor.jsonParsed` | ✓ 已解析 "{name}" 并同步至表单与工具列表 | ✓ Parsed "{name}" into the form and tool list |
| `editor.jsonShape` | JSON 中找不到服务器对象 | No server object found in the JSON |
| `editor.testing` | 连接并同步工具列表中... | Connecting and syncing the tool list... |
| `editor.testOk` | ✓ 连通正常 ({ms}ms · 已同步 {tools} 个工具) | ✓ Reachable ({ms}ms · synced {tools} tools) |
| `editor.testFail` | ✗ {message} | ✗ {message} |
| `editor.validationName` | 请填写合法的服务名称（1–32 位字母、数字、下划线或短横线） | Enter a valid server name (1–32 letters, digits, underscores, or hyphens) |
| `editor.validationCommand` | 请填写可执行命令 | Enter a command |
| `editor.validationUrl` | 请填写合法的 http(s) 远程 URL | Enter a valid http(s) URL |
| `editor.validationTimeout` | 超时必须是 1000–3600000 的整数 | Timeout must be an integer from 1000 to 3600000 |
| `editor.validationRetries` | 重连次数必须是 1–1000 的整数 | Reconnect attempts must be an integer from 1 to 1000 |
| `editor.sseBlocked` | DSH 当前版本不支持 SSE | SSE is not supported by this DSH version |
| `editor.sseHint` | DSH 当前版本不支持 SSE，保存时会被拦截 | SSE is not supported by this DSH version and will be blocked on save |
| `editor.jsonBlocked` | 请先修正 JSON 语法错误 | Fix the JSON syntax before saving |
| `editor.required` | 必填 | Required |

### 3.5 删除确认与通用错误

| locale 键 | 中文 | English |
| --- | --- | --- |
| `delete.title` | 删除 MCP 服务 | Delete MCP server |
| `delete.descPrefix` | 确定要删除 | Delete |
| `delete.descSuffix` | 吗？此操作会从当前 Profile 的 cordis.patch.yml 中移除该行，不可撤销。 | ? This removes the row from the current Profile cordis.patch.yml and cannot be undone. |
| `delete.confirm` | 删除 | Delete |
| `delete.cancel` | 取消 | Cancel |
| `common.unknownError` | 未知错误 | Unknown error |
| `common.requestFailed` | 请求失败，请检查网络或宿主状态 | Request failed; check the network or host |
| `common.invalidResponse` | 宿主返回了无效响应 | The host returned an invalid response |

> 注：`delete.descPrefix` / `delete.descSuffix` 在原字典中分别带首尾空格，渲染时与 `serverName` 直接拼接；
> 本表为便于阅读省略了行尾空格。
