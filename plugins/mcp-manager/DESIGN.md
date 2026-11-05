# MCP 服务管理 — 极简终版 UI 与交互规格

本文件是 `client.js` 的验收契约。**权威来源**：

1. 交互原型：`/Users/xiechenghua/Downloads/deepseek_harness_mcp.html`（1679 行，极简终版）
2. 设计规范：`/Users/xiechenghua/Downloads/mcp_ui_interaction_spec_for_agent.md`（56 行，极简终版）

实现必须按原型 1:1 还原布局、组件层级、状态与交互；只允许本文列出的 DSH 环境映射差异。审核以本文件 + 原型为准。

---

## 0. 架构原则（本次最大的变化）

### 0.1 单层直管（Profile 层共享）

- 工作区只承载项目路径与会话分组，**不承载 MCP 配置**。
- 所有服务器都是 `@deepseek-ai/dsh-mcp-client` 行，直接读写**当前 profile** 的 `~/.dsh/profiles/<name>/cordis.patch.yml`。
- **界面上不出现**：全局/工作区筛选、工作区多选、服务器库、「应用到当前工作区」、「管理生效工作区」、跨工作区导入。
- 列表页只有搜索 + 全部服务器；一次配置即在该 profile 的所有工作区会话中生效。

### 0.2 非空与非默认值写入（Clean Config）

- 未填写的选填项（`cwd`、`env`、`headers`、`oauth`、`autoApprove`、`disabledTools`）**严禁写入**配置文件。
- 例外：`args` 数组里的空字符串是**合法的 argv 位置**（占位语义），必须原样保留，不属于「空值不写」的范畴。
- 有默认值的参数（`timeout` 默认 60000、`maxRetries` 默认 3）在输入框里只用浅色 placeholder 提示；未填写或等于默认值**严禁写入**。
- JSON 视图与保存走同一套清理逻辑，保证「表单 → JSON → 保存」三条路径产出一致。

### 0.3 原生「打开配置文件」

设置窗口右上角的「打开配置文件」保持 DSH 原生行为（宿主提供），插件不拦截、不加弹窗。

---

## 1. 布局

- 插件渲染在 DSH 设置面板的**右侧内容区**；左侧导航（原型 210px）由宿主提供，插件不自绘模态窗外框与导航。
- 编辑器弹窗：`max-width: 640px`、`max-height: 88vh`、圆角 16px。
- 删除确认弹窗：`max-width: 360px`、圆角 14px。
- Tooltip 浮层：`max-width: 290px`、圆角 7px。
- 颜色全部映射到 `--dsw-*` token（见 §6），不写字面色值。

---

## 2. 列表页

### 2.1 顶部栏

- 左侧：`MCP 服务` 标题 + `?` 帮助图标（1000ms tooltip：`所有配置写入当前 Profile (cordis.patch.yml)，自动在全部工作区会话中共享生效`）。
- 右侧：搜索框（占位「搜索服务...」）+ 闪电图标按钮（`测试所有启用的 MCP 服务器`）+ `+ 新增` 主按钮（白底深字）。

### 2.2 列表项（极简单行，底部分割线）

每个服务器一项，上下内边距约 16px，项间 1px 分割线：

- **第一行左侧**：状态圆点（启用正常绿 `#34d399`、测试中琥珀脉冲 `#fbbf24`、连接失败玫瑰 `#f43f5e`、已停用灰 `#585a60`，带 1s tooltip 说明状态）+ `serverName`（等宽字体，带 1s tooltip 显示完整命令/URL）+ 协议标签（`stdio` / `streamable-http` / `sse`）+ 延迟毫秒（仅启用且有值时）+ 「N 工具」按钮（带旋转箭头，点击展开工具徽章）。
- **第二行**：浅色小字，等宽字体，命令摘要（stdio：`command + args.join(' ')`；远程：`url`），单行截断。
- **右侧**：4 个纯图标按钮（32×32，圆角 8px）：
  1. 电源（已启用绿色底/边框，已停用灰；1s tooltip 动态：`停用 MCP 服务器` / `启用 MCP 服务器`）
  2. 循环刷新（测试中旋转；1s tooltip：`测试连通性`）
  3. 铅笔（1s tooltip：`更新配置`）
  4. 垃圾桶（hover 玫瑰；1s tooltip：`删除服务器`）
- **展开区**（点击「N 工具」）：工具徽章横向排列，每个徽章 1s tooltip 显示「说明 · 状态」：
  - 自动允许：绿底绿字；
  - 禁用：玫瑰底、删除线；
  - 默认：灰底。
- 空列表：居中一行「暂无匹配的 MCP 服务」（不预留大块空白）。

### 2.3 列表操作

- 启用/停用：立即写配置并刷新。
- 单条测试：状态变「测试中」，完成后更新延迟与状态。
- 全部测试：只测已启用的；无启用项时 toast「暂无已启用的 MCP 服务」。
- 删除：打开确认弹窗（360px），确认后删除。

---

## 3. 1000ms 悬停中文 Tooltip（全局硬性）

- 页面正文不堆砌解释文字；所有纯图标按钮与 `?` 帮助图标绑定 **严格 1000ms** 计时器：移入停留满 1.0 秒才显示，移出/点击立即隐藏。
- 同一时刻只显示一个浮层；浮层挂 body 末尾，`pointer-events:none`；靠近视口边缘自动夹紧。
- 文案见规范第 3 节表格（标题 `?`、闪电、电源、循环、铅笔、垃圾桶、JSON 按钮、各字段 `?` 图标）。

---

## 4. 新增 / 更新弹窗

### 4.1 头部

标题（`新增 MCP 服务` / `更新 MCP 服务`）+ 右侧 `表单 | JSON` 切换器（JSON 按钮 1s tooltip：`仅写入非空与非默认字段，支持直接粘贴外部分享的 JSON`）+ 关闭图标。

### 4.2 结构化表单

- **基础**：`serverName`（等宽，占位 `例如: filesystem 或 github`）+ `?`；传输协议下拉（`stdio` / `streamable-http` / `sse`）+ `?`。
- **stdio 参数**：`command`（占位 `npx`）+ `?`；`args` 文本域（每行一个参数）+ `?`；`env` 动态键值行（`+ 添加`，标题旁 `?`）。
- **远程参数**（http/sse）：`url`（占位 `https://example.com/mcp`）+ `?`；`headers` 动态键值行（`+ 添加`）。
- **高级设置（默认折叠）**：
  - 折叠栏标题「高级设置」+ 箭头；任一高级参数被自定义时，标题旁显示 `已自定义` 徽章。
  - `stdio` 显示：`工作目录 (cwd)`（占位 `默认当前目录 (不写入配置)`）、`超时 (ms)`（占位 `默认 60000`）、`重连次数`（占位 `默认 3`），各带 `?`。
  - `streamable-http` / `sse` 隐藏 `cwd`，显示 `OAuth Client ID` 与 `OAuth Scopes`（占位 `选填 (未填不写入)` / `选填，空格分隔`），各带 `?`。
- **工具权限选择器**（高级设置内）：
  - 面板右上角「连接获取工具」按钮（探测中禁用并显示进度）。
  - 探测结果每行：工具名（等宽）+ 简短说明 + 右侧三态胶囊 `默认 | 自动允许 | 禁用`。
  - 顶部工具条：关键字过滤输入框 + 汇总计数（`自动允许: N · 禁用: M`）+ `全设为自动允许` + `重置默认`。
  - 三态互斥：`默认` 不写入；`自动允许` 进 `autoApprove`；`禁用` 进 `disabledTools`。
  - 未探测时显示提示，可点击「连接获取工具」刷新。

### 4.3 JSON 视图

- 大文本域 + `粘贴社区分享 JSON 示例` + `复制配置` 按钮。
- 支持 `{"mcpServers": {"<name>": {...}}}` 或单节点；解析成功回填表单（含工具权限）。
- 解析反馈条：成功绿色「✓ JSON 格式正确（已自动省去未填项与默认参数）」；失败红色并**阻止保存**。
- 表单 → JSON 时自动过滤空值/空数组/空对象/默认值。

### 4.4 底部

左侧 `测试连通性` 按钮 + 结果文字；右侧 `取消` + `保存`（主按钮）。

---

## 5. 删除确认

- 360px 弹窗：标题「删除 MCP 服务」+ 说明「确定要删除 <id> 吗？此操作会从当前 Profile 的 cordis.patch.yml 中移除该行，不可撤销。」+ `取消` / `删除`（玫瑰主按钮）。

---

## 6. DSH 映射（必须遵守）

### 6.1 主题 token

| 原型 | 插件使用 |
|---|---|
| `#202123` 弹窗底 | `var(--dsw-alias-bg-base)` |
| `#28292c` / `#2d2e31` 卡片与输入 | `var(--dsw-alias-bg-layer-1)` |
| `#17181a` / `#161719` 输入与代码块 | `var(--dsw-alias-bg-layer-2)` |
| `#34363b` / `#2e2f33` 边框与分割线 | `var(--dsw-alias-border-l1)` |
| `#ececf1` 主文字 | `var(--dsw-alias-label-primary)` |
| `#8e9096` / `#9ca0a8` 次文字 | `var(--dsw-alias-label-secondary)` |
| `#6c6e75` / `#787a80` 弱化文字 | `var(--dsw-alias-label-tertiary)` |
| 绿 `#34d399` / 琥珀 `#fbbf24` / 玫瑰 `#f43f5e` | `--dsw-alias-state-success-primary` / `--dsw-alias-state-warn-primary` / `--dsw-alias-state-error-primary` |
| hover 背景 | `var(--dsw-alias-interactive-bg-hover)` |
| 等宽 | `ui-monospace, SFMono-Regular, Menlo, monospace` |

**不允许字面色值**；浅底用 `color-mix(in srgb, var(--dsw-…) 12%, transparent)`。

### 6.2 字段映射（原型 → DSH）

| 原型字段 | DSH 实现 |
|---|---|
| `serverName` | `config.serverName`（必填，`[A-Za-z0-9_-]{1,32}`） |
| `transport` | `config.transport`；**DSH 只支持 `stdio` 与 `streamable-http`**，`sse` 保存时拦截并提示「DSH 当前版本不支持 SSE」 |
| `command` / `args` / `env` / `cwd` | 同名 |
| `url` / `headers` | 同名 |
| `timeout` | `config.toolCallTimeoutMs` |
| `maxRetries` | `config.reconnect.maxAttempts`（DSH 默认 10，原型默认 3；只写用户显式填写且 ≠3 的值） |
| `autoApprove` / `disabledTools` | 按规范写入配置（DSH 0.2.1 的 `dsh-mcp-client` **不读取**这两个字段，schemastery 会忽略未知键；写入是为了未来兼容与配置可读性） |
| `oauth.clientId` / `oauth.scopes` | 按规范写入 `config.oauth`（同上，当前 DSH 不读取） |
| 工具探测 | Host `probe` op 返回 `{ ok, tools: [{ name, description }], durationMs, … }` |

> 这些「不生效字段」必须在 DESIGN/CONTRACT 中如实标注，不得在界面上宣称已生效。

---

## 7. 验收清单（审核逐条核对）

1. 列表页顶部：标题 + `?` 图标 + 搜索框 + 闪电图标 + `+ 新增`，常规宽度下一行排布；视口 ≤720px 时允许操作区换到第二行（响应式收缩，不得重叠）。
2. 列表项：状态点（4 种颜色/脉冲）+ 等宽 serverName + 协议标签 + 延迟 + 「N 工具」+ 第二行命令/URL 摘要 + 右侧 4 个图标按钮。
3. 展开工具徽章：三态颜色正确（默认灰、自动允许绿、禁用玫瑰删除线），徽章有 1s tooltip。
4. 所有纯图标按钮与 `?` 图标：严格 1000ms 延迟、移出/点击立即隐藏、文案与规范第 3 节一致。
5. 编辑器弹窗：640px、表单/JSON 切换、基础字段、stdio/远程参数动态显隐、高级设置默认折叠 + `已自定义` 徽章。
6. 工具权限选择器：连接获取工具、三态切换、过滤、汇总计数、全设为自动允许、重置默认。
7. JSON 视图：粘贴 `mcpServers`/单节点可回填；表单→JSON 过滤空值与默认值；解析失败阻止保存。
8. 保存产出的配置：不含空字符串、空数组、空对象、默认 `timeout=60000`、默认 `maxRetries=3`；`sse` 被拦截。
9. 删除确认弹窗 360px，文案正确，删除后列表刷新。
10. 无工作区/全局筛选、无服务器库、无「应用到当前工作区」等已移除的入口。
11. 颜色全部来自 `--dsw-*` token 或基于 token 的 `color-mix`；class 前缀 `mm-`；图标内联 SVG；无 `@deepseek-ai/`、无绝对 home 路径。
12. locale 字典 zh/en 键集一致、值非空、每个键在字典外被 `t('key')` 引用；`node --check` 与 `node scripts/check-plugins.mjs` 通过。
