# MCP 服务管理 — 交互与 UI 设计规格（原型驱动版）

本文件是 `client.js` 的 UI 契约。**权威来源**是用户提供的两份材料：

1. 交互原型：`/Users/xiechenghua/Downloads/deepseek_harness_mcp.html`（单文件 HTML，含完整布局、样式与交互逻辑）
2. 设计规范：`/Users/xiechenghua/Downloads/mcp_ui_interaction_spec_for_agent.md`

实现必须**1:1 还原原型的布局、组件层级、状态与交互**；只有下面明确列出的差异（DSH 环境约束、主题 token 映射、数据层映射）允许偏离。审核以本文件 + 原型为准。

---

## 0. 不可偏离的交互契约

### 0.1 纯图标按钮 + 1000ms 悬停中文 Tooltip

所有以图标代替文字的按钮必须绑定 **1000ms 延迟的自绘 tooltip**（不是原生 `title`）：

- `mouseenter` 起 1000ms 计时，满 1 秒后在按钮上方居中显示中文名称浮层（贴近视口边缘时自动翻转/夹紧）；
- `mouseleave`、`mousedown`、滚动、切换页面立即清除计时器并隐藏；
- 同一时刻只显示一个 tooltip；tooltip 元素挂在 body 末尾，`pointer-events: none`；
- 文案见规范第 2 节表格（测试所有启用的 MCP 服务器 / 停用 MCP 服务器 / 启用 MCP 服务器 / 测试连通性 / 管理生效工作区 / 更新 MCP 服务器配置 / 删除 MCP 服务器 / 关闭配置弹窗 等）。

### 0.2 列表页顶部

- 标题 `MCP 服务器管理` + 绿色胶囊「N 个已启用」+ 副标题。DSH 没有「当前工作区」概念，副标题明确写当前 **profile 名**（`state.scope.profile`），不得用工作区注册表第一项猜代。
- 右侧：闪电图标按钮（测试所有启用的 MCP 服务器，测试中旋转）+ `新增服务器` 主按钮（白底黑字）。
- 筛选分段控件 4 个 tab：`当前生效全部` / `全局 (Global)`（紫点）/ `当前工作区`（蓝点）/ `其他工作区已有`（琥珀点），每个带计数；右侧搜索框（占位「搜索服务、工作区或工具...」）。

### 0.3 服务器卡片（严格按原型）

- 圆角 12px 卡片，左侧：状态点 + 等宽字体 server id + 作用域徽章 + transport 徽章 + 状态文字（连通正常 · Nms / 正在测试连通性... / 已停用 / 未在当前工作区应用）。
- 第二行：描述文字（未填写显示「未填写描述信息」）。
- 第三行：等宽 endpoint 预览（单行省略 + title）+ 蓝色可点击的「N 个工具 / 参数详情」展开按钮（旋转箭头）。
- 右侧操作区（图标按钮，1 秒 tooltip）：启用/停用（电源图标）、测试连通性（循环图标，测试中旋转）、管理生效工作区（图层图标）、更新配置（铅笔）、删除（垃圾桶，hover 变玫瑰色）。
- 未应用到当前工作区的卡片显示蓝色主按钮「应用到当前工作区 (A)」。
- 展开后显示工具 chips（自动批准 = 绿色，禁用 = 玫瑰色删除线）与参数详情。

### 0.4 弹窗（四个，均按原型）

1. **新增/更新服务器**（max-w 800px，max-h 91vh）：
   - 头部：标题 + 副标题 + 右侧「结构化配置 / JSON 配置 (支持粘贴分享)」分段切换 + 关闭图标；
   - 顶部「生效范围（应用目标）」卡片：`指定工作区 (支持多选)` / `全局共享 (所有工作区通用)` 分段 + 工作区多选复选框网格 + 合并写入路径预览（等宽）；全局时显示紫色提示条；
   - 结构化表单：1. 基础标识（server id、显示名称/备注、传输协议三卡片 stdio / streamable-http / sse）；2. STDIO 参数（command、cwd、args 文本域 + 「填入常用 npx 模板」、env 动态键值行 + 「+ 添加环境变量」）或远程参数（url、headers 动态行 + 「+ 添加 Header」、OAuth 2.1 折叠区）；3. 运行策略（timeout、maxRetries、capabilities 三复选框、autoApprove、disabledTools）；
   - JSON 模式：大 textarea + 「粘贴社区分享 JSON 示例」「格式化 JSON」「复制配置」+ 解析反馈条；与结构化表单**双向同步**；
   - 底部：左「保存前测试连通性」+ 结果文字；右侧 `取消`、`保存并应用配置`。DSH 单 profile 下不存在「独立分叉」，因此**不再提供分叉选项**；如需说明，只显示一行小字「DSH 单 profile 下更新即作用于该行」。
2. **管理生效工作区**（max-w 520px）：工作区复选框列表 + 「设为全局」+ 保存/取消。
3. **删除确认**：区分「仅从当前工作区移除」与「从所有已应用的工作区中彻底删除」。
4. **配置文件查看**：等宽代码块展示当前层 patch 的**真实原文**（`configText` op，含注释与其他插件行），只读。

### 0.5 其它

- 全局 toast（成功/警告/错误）出现在底部居中，自动消失。
- 所有图标为内联 SVG（stroke currentColor），不使用图标库。
- 危险操作（删除）用玫瑰色语义色。

---

## 1. 与 DSH 环境的强制映射（必须遵守）

### 1.1 主题 token（不得写死颜色）

原型使用固定深色色值；插件必须映射到 DSH 主题 token，保证浅色/深色主题都可用：

| 原型 | 插件使用 |
|---|---|
| `#202123` 模态/侧栏底色 | `var(--dsw-alias-bg-base)` |
| `#28292c` 卡片 | `var(--dsw-alias-bg-layer-1)` |
| `#18191b` / `#161719` / `#141517` 输入与代码块 | `var(--dsw-alias-bg-layer-2)` |
| `#36383d` / `#33353a` / `#2e2f33` 边框 | `var(--dsw-alias-border-l1)` / `var(--dsw-alias-border-l2)` |
| `#ececf1` 主文字 | `var(--dsw-alias-label-primary)` |
| `#8e9096` / `#9ca0a8` 次要文字 | `var(--dsw-alias-label-secondary)` |
| `#66686e` 弱化文字 | `var(--dsw-alias-label-tertiary)` |
| `#34d399` 正常 / `#fbbf24` 测试中 / `#f43f5e` 异常 | `var(--dsw-alias-state-success-primary)` / `--dsw-alias-state-warn-primary` / `--dsw-alias-state-error-primary` |
| `#3b82f6` / `#6366f1` 工作区徽章 | `var(--dsw-alias-brand-primary)` |
| `#a855f7` 全局徽章 | `var(--dsw-alias-brand-primary)` + 透明度变体 |
| hover 背景 | `var(--dsw-alias-interactive-bg-hover)` |
| 圆角 | `var(--dsw-radius-sm)` 起，需要更大时用 8/12/16px 固定值 |
| 字体 | `var(--dsw-font-family)`；等宽部分用 `ui-monospace, SFMono-Regular, Menlo, monospace` |

**不允许字面色值**：需要浅底时用 token + `color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)` 这类基于 token 的混合。

### 1.2 布局尺寸

- 插件渲染在 DSH 设置面板内容区（面板约 800×800，左侧导航 215px 由宿主提供）。
- 本插件的列表页占满内容区，**不再自带 1060×740 的外框与左侧导航**（那是原型为了演示宿主而画的，DSH 宿主已提供）。
- 弹窗尺寸：新增/编辑弹窗 `min(800px, calc(100vw - 48px))` × `min(91vh, 780px)`；管理生效工作区 520px；删除确认 480px；配置文件查看 760px。弹窗均固定外框、内容区滚动。

### 1.3 数据层映射（原型的配置文件模型 → DSH 实际）

原型假设每个工作区有 `<workspace>/.deepseek/config.json`；DSH 没有该文件，实际是两层 Loader patch：

| 原型概念 | DSH 实现 |
|---|---|
| 全局配置 | `$DSH_HOME/cordis.patch.yml`（home 层，所有 profile 生效） |
| 当前工作区配置 | `$DSH_PROFILE_DIR/cordis.patch.yml`（当前 profile 层） |
| 「指定工作区多选」 | 写入 profile 层 + 把选中的工作区目录存为该服务器的 `workspaces` 元数据（组织/展示/复用用途） |
| 「其他工作区已有」 | 服务器库中 `origins` 为空（未在当前两层配置）的条目 |
| 「应用到当前工作区」 | `libraryApply`（复制库条目到 profile 层） |
| 「管理生效工作区」 | `setWorkspaces`（只改库里的 `workspaces`） |
| 「从所有工作区彻底删除」 | `remove` + `purge: true`（同时删库条目） |
| 「仅从当前工作区移除」 | `remove`（保留库条目） |
| 显示名称/备注 | 库元数据 `description` |
| OAuth / capabilities / autoApprove / disabledTools / maxRetries | 库元数据 `extra`（**不写入 Loader config**，DSH 客户端不接受这些字段） |
| timeout | `config.toolCallTimeoutMs` |
| transport `sse` | **DSH 0.2.x 不支持**：卡片保留但禁用（置灰 + tooltip「DSH 当前版本不支持 SSE，请使用 streamable-http」），不得让用户保存出无法加载的行 |

> 元数据字段（description / extra / workspaces）由 `create` / `update` / `setWorkspaces` / `libraryApply` 写入服务器库；`state` 会随每行返回它们。详见 CONTRACT §4、§6。

### 1.4 既有已确认行为（不得回退）

- 弹窗遮罩透明（不压暗设置面板）；Escape/遮罩只关最上层（浮层 → 弹窗 → 面板）。
- 弹窗固定尺寸，切换标签/内容变化不改变外框。
- 空列表紧凑（不预留大片空白），有数据时内部滚动。
- 工作目录 chips 单行横向滚动、不撑高、不移动标签与按钮。
- 列表页筛选/搜索变化不得让卡片内部元素换行导致跳动（卡片高度可以随内容，但同类状态之间要稳定）。
- 中英文 locale 字典键集一致、值非空、每个键在字典外被 `t('key')` 引用。
- 只能 `require('react')`；不得出现 `@deepseek-ai/`、绝对 home 路径、字面色值。

---

## 2. 验收清单（审核逐条核对）

- [ ] 列表页顶部：标题 + 已启用计数胶囊 + 副标题（含工作区名）+ 闪电图标 + 新增服务器按钮，一行布局。
- [ ] 筛选分段 4 tab（当前生效全部 / 全局 / 当前工作区 / 其他工作区已有）+ 计数 + 搜索框。
- [ ] 卡片结构：状态点、等宽 id、作用域徽章、transport 徽章、状态文字、描述、endpoint、工具数展开、右侧 5 个图标按钮；未应用时显示「应用到当前工作区」。
- [ ] 所有图标按钮有 1000ms 延迟自绘中文 tooltip；mouseleave/mousedown 立即消失；文案与规范第 2 节一致。
- [ ] 新增/编辑弹窗：顶部生效范围（多工作区复选框 / 全局）、合并路径预览、结构化 3 段表单、JSON 双向同步、底部测试 + 同步策略 + 取消/保存。
- [ ] JSON 模式可粘贴 `{"mcpServers": {...}}` 或单节点并回填表单；切换 tab 不丢数据。
- [ ] 管理生效工作区弹窗、删除确认弹窗（两种删除范围）、配置文件查看弹窗。
- [ ] sse 选项禁用并说明原因；保存不会产生 DSH 无法加载的行。
- [ ] 弹窗固定尺寸、遮罩透明、Escape/遮罩层级正确；空态紧凑；工作目录 chips 不撑高。
- [ ] 颜色全部来自 `--dsw-*` token（或基于 token 的 color-mix）；无字面色值；无 `@deepseek-ai/`、无绝对 home 路径。
- [ ] locale 键集一致、非空、全部被引用；`node --check` 与 `scripts/check-plugins.mjs` 通过。
