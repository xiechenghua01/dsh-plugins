# Skills 管理模块 — 产品需求文档（PRD）

| 项 | 值 |
| --- | --- |
| 产品 | DeepSeek Harness（DSH）· Skills 管理模块 |
| 文档版本 | v1.2（2026-11-06） |
| 状态 | Draft for design（可交给交互设计师 / UI 设计师出稿） |
| 读者 | 原型交互设计师 Agent、UI 设计师 Agent、后续实现者 |
| 输入事实 | [Skill 生命周期与管理机制](../research/README.md)、[Skill 子系统深调研](../research/skill-subsystem.md)、[插件 UI 架构](../research/plugin-ui-architecture.md)、[当前 DSH UI 实测](../research/ui-patterns.md) |
| 市场索引规范 | [skill-market-index-spec.md](skill-market-index-spec.md)（format 1，第三方开发者可实现的索引源规范） |
| 索引实现方案 | [skill-market-index-implementation.md](../design/skill-market-index-implementation.md) |
| 说明 | **本文不是交互稿或 UI 稿**，而是出稿前的产品定义。旧版交互稿/UI 稿不作为本版输入，设计师以本文为准。 |

---

## 0. 给设计师的阅读指引

### 0.1 交互设计师（Prototype / Interaction）

按顺序读 **§3 范围 → §4 场景 → §5 形态与导航 → §6 IA → §7 已安装 → §8 市场 → §9 来源 → §10 跨模块规则 → §11 状态 → §12 文案 → §15 交互规则 → §18 交付要求**。

产出要求：

1. **IA 图 + 页面流程图**（安装、更新、卸载、新建、编辑、停用/恢复、诊断修复、添加市场源）。
2. **每个页面的状态说明**：加载 / 空 / 错误 / 部分失败 / 成功 / 只读 / 离线。
3. **组件行为**：点击、悬停、禁用、确认、撤销、键盘、焦点。
4. **文案清单**：与 §12 对齐，未定义处先按语气规范补，并标注「新增文案」。
5. **边界案例**：同名冲突、路径不存在、市场源不可达、安装中断、内置技能误操作。

### 0.2 UI 设计师（Visual）

按顺序读 **§5 形态与导航 → §7/§8/§9 页面结构 → §13 数据字段 → §14 视觉与组件基线 → §18 交付要求**，并把 [ui-patterns.md](../research/ui-patterns.md) 作为几何与 token 的唯一基线。

产出要求：

1. 暗色为主、亮色为对照的高保真画面（画面清单见 §18.2）。
2. 组件规格：列表行、分组头、badge、按钮、搜索、chips、switch、抽屉、模态、toast、进度、空状态、错误条。
3. 标注：每个尺寸/颜色/字号对应 `--dsw-*` token 或实测值。
4. 图标：原创线性 SVG，24×24 viewBox，stroke 1.5；侧栏图标需在 16/18px 下可辨识。
5. 不做：自绘宿主侧栏整栏、CDN 字体、大面积渐变/彩色、与 DSH 现有页面风格冲突的卡片。

### 0.3 两个角色共同的硬约束

- 只使用 `--dsw-*` 主题 token（例外：状态色可用 `--dsw-alias-state-*`）。
- 页面视觉基线：DSH 暗色主题，`#151517` 底、侧栏 `#1b1b1c`、卡片 `#232324/#2c2c2e`、20px 大圆角、13/14px 紧凑排版。
- 所有写操作可逆或有二次确认；只读来源不得出现可点击的写操作。
- 不出现「安装 skill 到插件目录」「修改插件包内技能」这类产品上不存在的动作。

---

## 1. 背景与问题

### 1.1 现状（调研结论）

DSH 的 Skill 是「一层注册表 + 每个 scope 一套 provider」，**没有安装器、没有市场、没有已安装列表、没有状态库**：

- 用户「安装」技能的唯一方式是：把合法的 `SKILL.md`（目录型或平铺 `.md`）放进某个扫描根。
- 本地技能发现由 **Agent 预设**挂载（host 层 `skill-filesystem` / `tool-skill` 被关闭），不同预设看到的技能不同。
- 技能来源分三层：用户/项目文件系统（preset 层）、预设包内技能（preset 层、只读）、插件内置 provider（global 层、只读）。
- 失败是静默的：断链、坏 frontmatter、非法 name 都会让技能直接消失，只在 Host 日志里有一条 warn。
- 同名技能按「同层 rank + 跨层覆盖」规则遮蔽，用户无从得知。

### 1.2 用户痛点

| 痛点 | 典型表达 |
| --- | --- |
| 不知道装在哪 | 「技能应该放 `~/.dsh/skills` 还是 `~/.agents/skills`？」 |
| 不知道格式 | 「我写了一个 md，为什么 Agent 不认？」 |
| 不知道为什么没生效 | 「文件明明在，Agent 看不到」 |
| 不知道谁覆盖了谁 | 「我装了同名技能，哪个生效？」 |
| 不能发现/复用 | 「有没有现成技能可以装？怎么分享给别人？」 |
| 不能按位置管理 | 「项目技能、用户技能、内置技能混在一起，分不清」 |

### 1.3 本模块要解决的事

1. **技能市场**：发现、安装、更新、卸载外部技能（GitHub skill 库、技能市场索引、本地导入）。
2. **已安装管理**：按安装位置归类展示、编辑、启停、删除、诊断、查看预设可见性。
3. **来源管理**：管理本地安装位置与市场源，解释优先级与可见性。

---

## 2. 目标与成功标准

### 2.1 产品目标

| 目标 | 说明 |
| --- | --- |
| 可见 | 用户能在 5 秒内回答「我的技能在哪、哪些生效、哪些没生效」 |
| 可装 | 从市场安装一个技能 ≤ 3 步（选择 → 落点 → 完成），无需终端 |
| 可管 | 新建、编辑、导入、启停、删除、恢复都在同一页面完成 |
| 可修 | 断链、坏 frontmatter、非法 name、同名覆盖有明确诊断与修复动作 |
| 可共享 | 支持用户级、共享级、项目级三种落点，项目技能可随仓库进 Git |

### 2.2 成功标准（v1 验收口径）

- 已安装页能列出全部 7 类位置（含空位置状态），分组顺序与 rank 一致。
- 市场安装成功率 ≥ 95%（本地可控源），失败有可读原因与重试。
- 诊断覆盖 5 类问题（断链、frontmatter、name、同层覆盖、跨层覆盖），每类有修复动作。
- 所有写操作：路径在允许根内、有确认或可撤销、失败不破坏原文件。
- 支持暗/亮主题；1200px 与 1440px 宽度下无破版。

### 2.3 非目标（v1 明确不做）

- 不做技能执行/调试/试跑（不在页面里跟 Agent 对话）。
- 不做富文本/Markdown 所见即所得编辑器（原文编辑器即可）。
- 不做评分、评论、下载量、付费、账号体系。
- 不做云同步、团队权限、技能依赖解析。
- 不做插件 bundle 的安装/升级（那是 Plugins → Discover）。
- 不允许修改插件包内/预设包内的只读技能。

---

## 3. 范围

### 3.1 v1 范围（本次设计必须覆盖）

**已安装管理**

- 按位置分组的技能列表（7 类 + 已停用组）。
- 搜索、按位置/调用方式筛选、排序。
- 技能详情抽屉：概览、原文、资源、诊断。
- 新建技能（表单）、导入技能（粘贴 `SKILL.md` / 目录）、编辑、停用/恢复、删除。
- 诊断：问题列表 + 修复动作（移除断链、打开文件、重命名建议、查看生效项）。
- 按预设查看可见性（cordis / standard / ptc / minimal）。

**技能市场**

- 市场源：索引源（https `index.json`）、GitHub 源（仓库 + `index.json` 或单技能 URL）、本地导入。
- 市场首页：源选择、搜索、分类标签、排序、技能列表、已安装标记。
- 技能详情：元数据、来源、文件清单、README 摘要、安装/更新/卸载入口。
- 安装流程：选择落点、版本、冲突处理、进度、结果。
- 更新检查与更新：**检查自动执行（启动后 + 每 6 小时 + 页面补检），只提示可更新；下载与覆盖必须用户手动触发**；不自动更新。
- 市场源：索引源（https `index.json`，含 GitHub raw / Pages / 静态托管）、本地导入；无索引 GitHub 仓库 v1 不作为源。
- 市场首页：源选择、搜索、分类标签、排序、技能列表、已安装/可更新标记。
- 技能详情：元数据、来源、文件清单、README 摘要、安装/更新/卸载入口。
- 安装流程：选择落点、版本、冲突处理、进度、结果。
- 更新检查（自动）与手动更新、卸载。
- 市场源管理：添加、编辑、删除、启用/停用、刷新、校验。
- 离线/源不可达/空/错误状态。

**来源页**

- 本地安装位置卡片（路径、rank、可写、技能数、状态、打开目录/复制路径）。
- 预设可见性卡片。
- 市场源摘要与跳转。
- 优先级与遮蔽规则说明。

### 3.2 v2（设计只需预留，不必出稿）

- 批量更新、自动更新开关。
- 私有源 token / 组织源。
- 技能版本并存与回滚。
- 市场评分/下载量/推荐。
- 技能包依赖、技能组合（bundle of skills）。
- 技能发布（从本机推送到 Git 仓库）。
- 按会话预览技能可见性。
- 多语言市场内容与翻译。

### 3.3 不做

见 §2.3。

---

## 4. 用户与场景

### 4.1 目标用户

| 用户 | 诉求 |
| --- | --- |
| DSH 个人用户 | 快速装社区技能；清理不用的技能；排查为什么不生效 |
| 插件/技能作者 | 本机管理自己的技能包；导出/分享 |
| 团队 | 把项目技能放进仓库，团队成员共享；固定版本 |
| 跨工具用户 | 把技能放 `~/.agents/skills`，让多个 agent 工具共用 |

### 4.2 核心场景

**S1 从市场安装技能（用户级）**
用户打开「技能 → 市场」→ 搜索 `code-review` → 打开详情 → 点「安装」→ 选择落点「用户 DSH」→ 进度 → 成功 → 自动跳到「已安装」并高亮新技能。

**S2 给项目安装团队技能**
市场 → 详情 → 安装 → 落点选「当前项目」→ 成功后提示「该技能位于 `<repo>/.dsh/skills`，可随仓库提交」。

**S3 技能不生效排查**
已安装页顶部 banner「2 个技能未生效」→ 诊断 → 看到「断链 tabbit」与「同层覆盖 code-review」→ 点修复动作 → 问题消失。

**S4 手写一个新技能**
已安装 → 新建技能 → 填名称/描述/正文 → 选择位置 → 创建 → 列表高亮。

**S5 编辑/停用/恢复**
点技能行 → 抽屉 → 原文 → 编辑 → 保存；或 switch 停用 → toast 撤销；或 ⋯ → 删除（二次确认）。

**S6 添加 GitHub 技能库/市场源**
来源 → 市场源 → 添加源 → 粘贴 `https://raw.githubusercontent.com/owner/repo/main/index.json` 或 GitHub 仓库 URL → 校验 → 显示名称/技能数 → 保存。

**S7 更新已安装技能**
市场列表/已安装页显示「有更新」→ 详情 → 更新 → 显示版本变化与本地修改警告 → 确认 → 更新完成。

**S8 卸载/清理**
已安装行 ⋯ → 移除（市场安装的走「卸载」；用户手写的走「删除」）→ 确认 → 可选备份 → 完成。

---

## 5. 产品形态与导航

### 5.1 形态

- **左侧栏入口 + 全屏面板**：面板占中央内容区，与 Plugins、自动化任务同级。
- 入口：`sidebar.panellist`，`id = skills-manager`，`order = 20`（排在 Plugins 0、自动化任务 10 之后）。
- 展开态：图标 16 + 文字「技能」；折叠 rail：36×36 按钮 + 18px 图标 + 500ms tooltip「技能」。
- 选中态：8% 白底 + 12px 圆角 + `aria-current="page"`。

> 为什么不是设置页：技能是跨会话的全局资产，页面信息量大（列表 + 详情 + 市场 + 来源），Settings 的 612px 内容宽放不下。

### 5.2 页面标题与三个 Tab

- 页面标题：**技能**；描述：**管理 Agent 可用的技能：安装、查看来源、修复未生效的条目。**
- Tab（顺序）：
  1. **已安装**（默认）
  2. **市场**
  3. **来源**
- Tab 记忆：切走再回来保留上次 Tab、搜索词、筛选与滚动位置。
- 页头右侧工具栏：搜索（当前 Tab 内生效）、刷新、主按钮（已安装页「+ 新建技能」；市场页「+ 添加源」）。
- 更新状态入口：已安装 Tab 上显示可更新数量（如 `已安装 · 2`）；列表顶部信息条「N 个技能有更新」；工具栏/行菜单提供「检查更新」（自动检查也在后台进行，按钮用于立即重查）。
- 诊断计数 badge 出现在「已安装」Tab 上（如 `已安装 · 2`），而不是单独的 Tab。

### 5.3 全局状态

- 未获授权（401）：整页错误态 + 重试。
- Host 服务不可用：显示「Skills 服务未加载」+ 说明，不显示空列表冒充。
- 首次加载：状态文字 + 骨架行，不用大 spinner。

---

## 6. 信息架构（IA）

```
技能（侧栏入口）
└─ 全屏面板
   ├─ 页头：标题 / 描述 / 搜索 / 刷新 / 主按钮
   ├─ Tabs：已安装 · 市场 · 来源
   ├─ 已安装
   │  ├─ 诊断 banner（有问题时）
   │  ├─ 筛选 chips：全部 / 项目 / 项目共享 / 用户 / 用户共享 / 自定义 / 内置 / 已停用
   │  ├─ 排序：位置优先级 / 名称 / 最近修改
   │  ├─ 分组列表（按位置，组头带路径、rank、数量、打开目录）
   │  └─ 已停用组（默认收起）
   ├─ 市场
   │  ├─ 源选择器 + 管理源入口
   │  ├─ 搜索 + 分类 chips + 排序
   │  ├─ 技能列表（名称/描述/标签/版本/作者/安装状态）
   │  └─ 技能详情（页内切换或抽屉；建议页内详情，保留返回）
   ├─ 来源
   │  ├─ 本地安装位置（7 类卡片）
   │  ├─ Agent 预设可见性（cordis / standard / ptc / minimal）
   │  ├─ 市场源列表 + 添加/刷新/删除
   │  └─ 优先级与遮蔽说明
   ├─ 覆盖层
   │  ├─ 技能详情抽屉（已安装）
   │  ├─ 新建技能模态 / 导入模态
   │  ├─ 安装模态 / 更新模态 / 卸载确认
   │  ├─ 删除确认 / 停用确认（可撤销则用 toast）
   │  ├─ 添加市场源模态
   │  └─ Toast
   └─ 诊断抽屉（从 banner 进入；也可作为已安装页的右侧面板）
```

---

## 7. 模块 A：已安装技能管理

### 7.1 分类模型：按安装位置

这是本模块的**第一分类维度**。每个技能必须归入且只归入一个位置；内置/预设技能归入只读位置。

| 位置 id | 显示名 | 路径 | rank | 层 | 可写 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `project-dsh` | 项目技能 | `<projectRoot>/.dsh/skills` | 100 | preset | ✅ | 项目根 = 最近含 `.git` 的祖先 |
| `project-agents` | 项目共享 | `<projectRoot>/.agents/skills` | 200 | preset | ✅ | 可随仓库进 Git，团队共享 |
| `custom` | 自定义目录 | `customSkillDirs[]` | 300 | preset | 视路径 | 当前实例是预设包内 `dsh-agent-preset/skills`，只读 |
| `user-dsh` | 用户技能 | `~/.dsh/skills` | 400 | preset | ✅ | DSH 专属；市场安装默认落点 |
| `user-agents` | 用户共享 | `~/.agents/skills` | 500 | preset | ✅ | 跨 agent 工具共享；同层优先级低于用户技能 |
| `bundled` | 插件内置 | 插件包内 assets/provider | 600 | **global** | ❌ | office×7、dsh-badge、official-plugins、personalized-pages；部分无文件路径 |
| `preset` | 预设内置 | 预设包内 `skills/`（custom 根） | 300 | preset | ❌ | 4 个 creator 技能；升级覆盖 |

**显示顺序**：按 rank 升序（项目 → 项目共享 → 自定义/预设 → 用户 → 用户共享 → 插件内置），最后是「已停用」。

**优先级规则（必须在来源页与详情页讲清）**：

1. 同一预设层内：项目 DSH(100) > 项目共享(200) > 自定义(300) > 用户 DSH(400) > 用户共享(500)。
2. 跨层：**预设层整体覆盖 global 层**，与 rank 无关。因此用户放同名技能会覆盖插件内置版本；反之不会。
3. 不同预设互不影响；`minimal` 没有挂载 provider，其 Agent 没有技能。

### 7.2 已安装列表页

**页头工具栏**：搜索框（33px）、刷新图标按钮、主按钮「+ 新建技能」。

**筛选 chips**（24px 高、999 圆角）：全部 / 项目 / 项目共享 / 用户 / 用户共享 / 自定义 / 内置 / 已停用。
- 单选；选中态 `--dsw-specific-sidebar-nav-item-active` + `label-primary`。
- 「全部」不含「已停用」；已停用只在「已停用」chip 或底部折叠组出现。

**排序**：位置优先级（默认）/ 名称 A→Z / 最近修改。

**诊断 banner**（仅当有 error/warning）：
- 例：`⚠ 2 个技能未生效，可能导致 Agent 行为与预期不符。` + 右侧「查看原因 →」。
- 点击进入诊断抽屉/页面；计数与 Tab badge 同步。

**分组列表**：
- 组头：`项目技能` + 路径（等宽、次要色）+ `rank 100` 小 badge + `N 个` + 「打开目录」ghost 按钮。
- 空位置不显示组（但「来源」页显示空位置，便于用户知道路径）。
- 只读组（插件内置/预设内置）组头右侧显示「只读」。
- 已停用组默认收起，组头显示数量，展开后行可用（恢复/删除）。

**技能行**（65px 高、20px 圆角、padding 8、行间 gap 2、hover 8% 白）：
- 左：49×49 图标容器（16px 圆角、0.5px 描边），内 36px 来源字形；左下角 8px 状态点（生效绿 / 停用灰 / 有问题红 / 只读蓝灰）。
- 主区：名称 14/500（等宽）+ badges（位置、模型可用、用户可调用、内置、有更新）；描述 13/18 单行省略。
- 尾部：switch（可写且非内置）或「内置」文字标记；`⋯` 32×32 菜单（查看、编辑、打开目录、复制路径、停用/恢复、删除）。
- 整行可点打开抽屉；switch 与 ⋯ 阻止冒泡。
- 有问题的行在名称后显示红色小圆点 + tooltip 原因。

**搜索**：匹配名称、描述、`whenToUse`、路径；150ms 防抖；`/` 聚焦；无结果给搜索空状态。

### 7.3 技能详情抽屉

- 560px 宽、全高、右侧滑出；`bg-layer-2`、左侧 20px 圆角、0.5px `border-l2`、prominent 阴影、遮罩 `rgba(0,0,0,.4)`（只覆盖中央区，保留侧栏）。
- 头部：32×32 来源图标 + 名称（20/28/500 等宽）+ 关闭 28×28；下方 badges。
- 分段 Tab：概览 / 原文 / 资源 / 诊断。
- 底部固定操作条：`复制调用命令`（次按钮）+ `编辑`（主按钮）+ `⋯`（停用/删除/打开目录）。

**概览字段**：

| 字段 | 说明 |
| --- | --- |
| 描述 | `description` |
| 何时使用 | `whenToUse`（可空） |
| 来源卡片 | 位置类型、provider、rank、路径、修改时间 |
| 调用方式 | 模型可用（Agent 按描述自动匹配）/ 用户可调用（输入 `/name`） |
| 可见于 | 列出挂载了该技能的预设（cordis/standard/ptc）；全局层技能写「所有预设共享」；minimal 写「未挂载本地发现，看不到该技能」 |
| 相关诊断 | 该技能的校验结果；无问题显示「未发现问题」 |

**原文**：等宽只读预览（带行号）；「编辑」切换为 textarea（等宽 13/20，最小 320px 高），底部 `取消 / 保存`；保存前做 frontmatter 校验，失败内联提示，不写盘。

**资源**：技能目录内文件列表（名称、类型、大小），「打开目录」；空目录显示说明。

**诊断**：该技能的校验结果与修复建议。

### 7.4 新建 / 导入

**新建模态**（560px、20px 圆角）：

| 字段 | 规格 | 校验 |
| --- | --- | --- |
| 名称 | 等宽输入，占位 `例如: code-review` | 必填、kebab-case、≤64、目标位置不重名 |
| 描述 | 输入，占位 `一句话说明这个技能做什么` | 必填；不限制长度 |
| 何时使用 | 选填 | ≤200 |
| 正文 | Markdown textarea（12 行） | 必填 |
| 保存到 | 分段：用户技能 `~/.dsh/skills` / 用户共享 `~/.agents/skills` / 项目 `<repo>/.dsh/skills` | 默认用户技能；项目不可用时禁用 |

- 底部：取消 / 创建技能（校验通过才可用）。
- 成功：toast「已创建技能 code-review」+ 列表定位并高亮新行；不自动打开抽屉。

**导入模态**（同尺寸）：

- 方式 A「粘贴 SKILL.md」：textarea + `解析`；成功显示预览卡（名称、描述、frontmatter 摘要），失败显示原因。
- 方式 B「从目录导入」：路径输入 + 选择目录（宿主能力可用时）；列出将复制的文件数；同名冲突给「覆盖 / 跳过 / 换位置」。
- 两种方式共用落点选择与底部按钮。

### 7.5 停用 / 恢复

- 语义：把技能目录移到 `<root>/.disabled/<name>/`（平铺技能移到 `<root>/.disabled/<name>.md`），可恢复。
- 入口：行尾 switch 关闭、抽屉 ⋯ → 停用、或行菜单。
- 交互：立即执行 + toast「已停用 code-review · 撤销」（8s 内可撤销）。
- 结果：行进入「已停用」组，状态点变灰，switch 关闭；恢复后回到原组。
- 只读位置（内置/预设）不显示 switch；抽屉里的写操作禁用并提示「内置技能不支持修改」。
- 文案必须解释：停用后 Agent 不再可见；文件仍在 `.disabled/`，可恢复。

### 7.6 编辑 / 删除

- 编辑：抽屉 → 原文 → 编辑 → 保存；保存时带 `mtime` 乐观锁，冲突提示「文件已被外部修改，请刷新后重试」。
- 删除：
  - 360px 确认模态，标题「删除技能？」，正文「将删除 `<path>` 及其所有资源文件，无法撤销。」
  - 市场安装的技能走「卸载」（可显示来源/版本，可选备份）；用户手写技能走「删除」。
  - 内置/预设技能不可删除（菜单项禁用 + 说明）。
- 删除成功后刷新列表；已停用技能同样可删除或恢复。

### 7.7 诊断

**入口**：banner + 已安装 Tab badge + 来源页健康状态。

**问题类型**：

| 类型 | 判定 | 严重度 | 修复动作 |
| --- | --- | --- | --- |
| 断链 | 路径不可读 / symlink 目标不存在 | error | 移除链接、打开所在目录 |
| frontmatter 缺失/非法 | 无 `---`、YAML 解析失败、缺 name/description、旧键 | error | 打开文件编辑、删除 |
| name 非法 | 非 kebab-case 或与目录名不一致 | error | 重命名（给建议值） |
| 同层覆盖 | 同名技能在同一预设层更高 rank 根存在 | warning | 查看生效项、重命名 |
| 跨层覆盖 | 预设层技能覆盖 global 层内置技能 | info/warning | 查看生效项、说明影响 |
| 目录不可读 | 权限/IO 错误 | error | 复制路径、重试 |
| 正文过大 | 超过建议阈值（提示性） | info | 查看、压缩 |

**诊断页结构**：
- 摘要条：`1 个错误 · 1 个警告 · 上次检查时间` + 「重新检查」。
- 问题卡：类型图标 + 名称（等宽）+ 路径（等宽小字）+ 原因一句话 + 修复按钮。
- 覆盖说明卡：检查范围（本地根、预设技能、全局 provider、未挂载预设）+ 耗时。
- 底部说明：格式不合法的技能会被静默跳过，不进入模型目录。

### 7.8 按预设查看可见性

- 详情「可见于」列出可见预设。
- 来源页「Agent 预设」卡片：cordis / standard / ptc / minimal，显示「本地发现已挂载/未挂载」「N 个预设技能 + N 个本地根」。
- v1 只读展示，不做「按会话预览」。

---

## 8. 模块 B：技能市场

### 8.1 市场源模型

市场源是一个符合《技能市场索引规范 v1.0》的 JSON 索引（format 1）。**索引的字段、校验规则、文件清单、版本不可变规则、安装与更新契约，以规范为准**：

- 规范：[skill-market-index-spec.md](skill-market-index-spec.md)
- JSON Schema：[skill-market-index.schema.json](skill-market-index.schema.json)
- 示例：[skill-market-index.example.json](examples/skill-market-index.example.json)
- 实现方案：[skill-market-index-implementation.md](../design/skill-market-index-implementation.md)

v1 支持的源：

| 类型 | 输入 | 说明 |
| --- | --- | --- |
| `index`（唯一网络源） | 任意 https 的 `index.json`（GitHub raw / Pages / 对象存储 / 自建静态站） | 拉取 + 校验 + 缓存；版本 pin 到不可变文件 URL |
| `local` | 本地目录 / 粘贴 `SKILL.md` | 用于导入与离线安装，不产生网络请求；不是「市场源」列表项 |

索引为每个技能提供：`name`、本地化 `title`/`description`、分类/标签/关键词、图标、**版本数组**（SemVer + 发布时间 + `engines.dsh` + 文件清单）。版本的文件清单包含：目标相对路径、**pin 到不可变内容的下载 URL**、`sha256`、`size`；安装器逐文件校验。

**GitHub 作为源（v1）**：
- 仓库根提供 `index.json` 才构成「源」；索引 URL 如 `https://raw.githubusercontent.com/<owner>/<repo>/main/index.json`。
- 技能文件 URL 必须 pin 到 40 位 commit：`https://raw.githubusercontent.com/<owner>/<repo>/<commit>/skills/<name>/SKILL.md`。
- v1 不调用 GitHub API（不列目录、不查 stars），避免匿名限流与路径约定不确定性。
- 私有仓库/token v1 不支持（v2 接 credentials）。
- **无 `index.json` 的 GitHub skill 仓库：v1 不作为市场源支持**；规范评审后再决定是否增加「GitHub 仓库适配器」或「单技能 URL 安装」（见 §19 #5）。

**市场源字段（UI 展示）**：`id`、`type`（`index` / `local`）、`name`、`url`、`enabled`、`status`（ok/error/checking）、`skillCount`、`lastCheckedAt`、`error`、`stale`。

### 8.2 市场首页

- 顶部：源选择器（下拉，显示源名 + 状态点）+「管理源」ghost 按钮。
- 搜索框（市场内搜索，300ms 防抖）+ 分类 chips（全部 + 索引提供的 tags，按出现频率排序，最多 12 个）+ 排序（推荐 / 最近更新 / 名称）。
- 列表行（建议 76px 行，参考 Plugins Discover）：
  - 图标 40×40（索引可选 icon，缺省用来源字形）
  - 名称 14/500 + 版本 12px + 作者/来源 12px
  - 描述 13px 单行
  - tags 11px badges（最多 3 个）
  - 尾部：安装状态（未安装 / 已安装 / 有更新）+ 主按钮（安装 / 查看）
- 空状态：无源 → 「还没有添加市场源」+ 添加源；源为空 → 「该源暂时没有技能」；搜索无结果 → 「没有匹配的技能」+ 清除搜索。
- 加载：状态文字「正在读取市场源…」+ 6 行骨架。
- 更新状态：可更新标记来自后台自动检查结果（启动后 + 周期 + 页面补检）；「检查更新」按钮可立即重查；检查中显示「检查更新中…」，失败显示「上次检查失败」并保留上次结果。

### 8.3 技能详情

- 页内切换（保留返回按钮），不是抽屉。
- 头部：图标 + 名称（20/28/500）+ 版本 + 作者；右侧：安装/已安装/更新按钮。
- 描述段落（16/26）。
- 元信息：来源（索引名 + URL）、许可证、主页、更新时间、最小 DSH 版本。
- 文件清单：`SKILL.md` + 资源文件（名称/大小），可折叠。
- README 摘要：索引若提供 `readme` 或 `readmeExcerpt` 则展示，否则只展示 description。
- 已安装状态卡：安装位置、版本、安装时间、是否有本地修改。
- 底部：安装 / 更新 / 卸载（危险色，二次确认）。

### 8.4 安装流程

1. 点「安装」→ 安装模态（560px）。
2. 选择落点：
   - 用户技能 `~/.dsh/skills`（默认，推荐）
   - 用户共享 `~/.agents/skills`
   - 当前项目 `<repo>/.dsh/skills`（项目不可用时禁用并说明）
3. 版本：v1 默认安装索引当前版本（固定）；显示版本号与 commit 短 SHA。
4. 预检结果：
   - 目标位置同名 → 冲突处理：`覆盖 / 跳过 / 换位置`（v1 不提供「重命名」，避免目录名与技能 frontmatter name 不一致的语义问题）。
   - 目标位置不可写 → 报错并给「换位置」。
   - 校验失败（frontmatter/sha256/大小）→ 阻止安装，显示原因。
5. 确认 → 进度（下载 N/M 文件、校验、写盘）→ 成功 toast + 「查看已安装」。
6. 失败：模态内错误条 + 重试；已写入的临时文件清理，不产生半安装。
7. 取消：安装中可取消；取消后清理临时文件。

**安装原子性**：先在目标根内创建隐藏临时目录（`.` 开头，provider 不扫描），全部文件校验通过后 rename 为 `<root>/<name>/`；失败删除临时目录；跨卷时回退到同根临时目录。

### 8.5 更新检查与更新（自动检查、手动更新）

- **自动检查（v1）**：
  - 触发：Host 启动后约 15s 首次检查；之后每 6 小时一次；用户打开「已安装/市场」页且距上次检查超过 30 分钟时可立即补一次（同一时刻只跑一个检查）。
  - 条件：至少一个启用的市场源 **且** 至少一条带来源的安装记录；否则跳过。
  - 行为：拉取/刷新过期索引（每源 15s 超时，失败静默记录）；对比安装记录版本与该源默认/最高兼容版本；**只读**，不下载文件、不写技能文件。
  - 结果：已安装行/市场卡片显示「可更新」徽标；已安装 Tab 显示可更新数量；列表顶部信息条「N 个技能有更新」；打开页面时若检测到更新，显示一次性 toast「N 个技能有更新」。
  - 失败：不弹错误 toast；源错误显示在来源页/市场页的源状态；30 分钟后重试。
  - 配置：v1 默认开启、频率固定；后续可在设置中调整频率/关闭（v2）。
- **手动更新（v1）**：
  - 只有用户点「更新」（并确认）后才执行下载与覆盖。
  - 更新前展示：当前版本 → 新版本、来源 commit、本地修改警告（若安装后文件 sha 不一致）。
  - 执行：备份旧目录（`~/.dsh/skills-manager/backups/<name>-<timestamp>/`，保留最近 3 份）→ 安装新版本 → 原子替换 → 更新安装记录；失败回滚。
  - 手动「检查更新」按钮始终可用（立即刷新索引并重算状态）。
- **不自动下载、不自动安装、不自动改写技能文件。**
- 卸载：确认模态说明「删除技能目录与安装记录；不会删除你的其他技能」；可选「保留备份副本」；卸载后已安装标记消失。

### 8.6 市场源管理

- 入口：市场页「管理源」按钮、来源页「市场源」区。
- 列表：源名、类型（`index` / `local`）、URL（单行省略）、状态点、技能数、上次检查、操作（刷新/编辑/删除/启用停用）。
- 添加源流程：
  1. 选类型（索引源 / 本地目录）。
  2. 填 URL / 选择目录（GitHub 仓库只要提供 `index.json`，就填它的 raw URL，不需要单独选「GitHub 类型」）。
  3. 「校验」→ 拉取 + 解析 + 按规范 §12/§15 校验 → 显示索引标题、技能数、示例条目、错误 JSON path（失败时）。
  4. 保存 → 市场页刷新。
- 编辑：只允许改名称/URL；改 URL 需要重新校验。
- 删除：确认；已安装技能不受影响（来源信息保留在安装记录里）。
- 刷新：拉取最新索引；失败保留上次成功缓存并标「已过期」。
- 安全提示：首次添加显示「该源由第三方提供，安装前请确认来源可信」。索引规范见 [skill-market-index-spec.md](skill-market-index-spec.md)。

### 8.7 市场错误与状态

| 状态 | 表现 |
| --- | --- |
| 网络不可用 | 顶部条「无法连接市场源」+ 重试；显示本地缓存（标「已过期」） |
| 源 404/非 JSON/校验失败 | 源卡片错误 + 原因 + 编辑/删除 |
| 索引条目不合法 | 跳过该条并在源详情显示「N 个条目被忽略」 |
| 安装校验失败 | 模态内错误，指出文件/字段 |
| 安装中断 | 清理临时目录 + 可重试 |
| 磁盘满/权限 | 明确错误码与建议（换位置/清理） |

---

## 9. 模块 C：来源页

### 9.1 本地安装位置

7 张位置卡（含空状态）：
- 位置名 + 路径（等宽）+ rank badge + 状态点（可读/不存在/不可读）+ `N 个技能`（+ `N 个已停用`）。
- 操作：打开目录（不可用时「复制路径」）、查看技能（跳到已安装并筛选该位置）。
- 路径不存在：灰色 + 「目录不存在，新建技能时会自动创建」。

### 9.2 Agent 预设可见性

- 卡片行：`cordis` / `standard` / `ptc` / `minimal`。
- 字段：本地发现（已挂载/未挂载）、预设技能数、本地根数、说明。
- primary 用户语言：`minimal` 未挂载 → 「该预设的 Agent 没有技能」。

### 9.3 市场源

- 与 §8.6 同区域的摘要版本：源名、类型、技能数、状态、上次检查、管理入口。

### 9.4 优先级与遮蔽说明

- 一段可读的规则说明（同层 rank + 跨层覆盖），链接到诊断中的实际例子。
- 文案示例：「同一预设内按 rank 排序；预设层覆盖全局层。被覆盖的技能在诊断中列出。」

---

## 10. 跨模块规则

### 10.1 命名与校验（必须与 Host 一致）

- 名称：`^[a-z0-9]+(?:-[a-z0-9]+)*$`，≤64。
- 描述：非空；不限制长度（模型 catalog 展示时由 DSH 截断）。
- `whenToUse`：可选，≤200。
- 布尔：只接受真布尔或 `true/false/yes/no/on/off/1/0`；旧键（`disableModelInvocation` 等）拒绝。
- 文件布局：`<root>/<name>/SKILL.md` 或 `<root>/<name>.md`；只扫一层。
- 失败必须前置阻止（不能依赖 Host 静默丢弃）。

### 10.2 冲突与遮蔽

- 安装/新建前检查：目标位置同名 → 冲突模态（覆盖/跳过/换位置）。
- 跨位置同名：允许，但提示「该技能在其他位置已存在；同层优先级：...」。
- 已安装状态：显示「当前生效的是 X 位置的版本」；被覆盖行标 warning + 「查看生效项」。
- 不提供自动「解决遮蔽」；只提供重命名/移动/停用建议。

### 10.3 三种「移除」的区别（必须统一文案）

| 动作 | 语义 | 可恢复 | 适用 |
| --- | --- | --- | --- |
| 停用 | 移到 `.disabled/`，保留内容 | ✅ 一键恢复 | 临时不用 |
| 删除 | 删除本地技能目录/文件 | ❌（确认后） | 用户自建/导入 |
| 卸载 | 删除市场安装的技能 + 安装记录（可选备份） | ⚠️ 备份可恢复 | 市场安装 |

### 10.4 刷新与自动检查

- 所有写操作成功后主动刷新当前视图；不依赖前端事件。
- 手动刷新按钮可用；刷新保持当前 Tab/筛选/滚动。
- 自动检查更新由 Host 后台执行（启动后 + 每 6 小时 + 页面补检），结果通过状态接口返回；页面打开时读取状态并显示徽标/信息条，不阻塞列表加载。
- 安装进度通过轮询或 Host 流式事件更新（v1 可用轮询 500ms）。
- 自动检查失败不弹错误 toast；错误记录在源状态/「上次检查失败」提示中；30 分钟后重试。

### 10.5 权限与安全

- 只读位置：不显示写操作；点击禁用并提示原因。
- 写路径必须在该位置根内；拒绝 `..`、绝对路径注入、符号链接逃逸。
- 安装来源必须 https；拒绝 redirect；文件 sha256 校验；路径穿越防护；单文件/总大小上限。
- 错误码统一（见 §13.3），前端按码映射文案。

### 10.6 内置与预设

- 只读；展示 provider、包名（若可映射）、技能数；无文件路径时不显示「打开目录」。
- 市场不把内置技能列为「可卸载」；管理页不提供编辑/删除/停用。
- 同名覆盖内置时给出明确提示（预设层覆盖 global 层）。

---

## 11. 页面状态矩阵

| 页面 / 区域 | Loading | Empty | Error | Partial | Read-only |
| --- | --- | --- | --- | --- | --- |
| 已安装列表 | 状态文字 + 6 行骨架 | 无任何技能：空状态 + 新建/导入/去市场 | 整页错误 + 重试 | 某位置不可读：banner + 其余正常 | 内置组显示「只读」 |
| 搜索 | — | 「没有匹配「x」的技能」+ 清除 | — | — | — |
| 详情抽屉 | 标题 + 3 行骨架 | — | 「无法读取该技能」+ 重试 | 原文可读、资源不可读分别降级 | 写操作禁用 |
| 诊断 | 2 行骨架 | 「全部正常」+ 绿色勾 | 检查失败 + 重试 | 部分检查失败：显示已完成项 | — |
| 市场首页 | 「正在读取市场源…」+ 6 行骨架 | 无源 → 添加源；源空 → 提示 | 源不可用 + 重试 + 缓存标记 | 部分源失败：正常源可用 | — |
| 市场详情 | 骨架 | — | 读取失败 + 重试 | README 缺失降级 | — |
| 安装模态 | — | — | 预检失败/下载失败/校验失败 | 部分文件失败 → 整体失败 | 目标不可写禁用 |
| 来源页 | 骨架 3 行 | 不存在位置灰显 | 单卡片错误 | 市场源部分失败 | 只读位置 |
| 添加源 | 校验中 | — | URL/格式/网络错误 | — | — |
| 自动更新检查 | 列表顶部「检查更新中…」（不阻塞列表） | 无已安装市场技能：跳过，不显示 | 失败：来源页源错误 + 「上次检查失败」；不弹错误 toast | 部分源失败：其余源结果正常显示 | — |
| 更新提示 | — | 无更新：不显示信息条 | — | 有更新：顶部信息条 + Tab 计数 + 行徽标 | — |

---

## 12. 文案表（核心键）

> 实现时全部走 client locale；`locale/zh.json` 与 `locale/en.json` 键集一致、无空值。下表是设计稿必须使用的文案基线。

| Key | 中文 | English |
| --- | --- | --- |
| panel.title | 技能 | Skills |
| panel.description | 管理 Agent 可用的技能：安装、查看来源、修复未生效的条目。 | Manage the skills available to agents: install, inspect sources, and fix inactive entries. |
| tab.installed | 已安装 | Installed |
| tab.market | 市场 | Market |
| tab.sources | 来源 | Sources |
| action.newSkill | 新建技能 | New skill |
| action.import | 导入技能 | Import skill |
| action.addSource | 添加源 | Add source |
| action.refresh | 刷新 | Refresh |
| action.openFolder | 打开目录 | Open folder |
| action.copyPath | 复制路径 | Copy path |
| action.install | 安装 | Install |
| action.update | 更新 | Update |
| action.uninstall | 卸载 | Uninstall |
| action.disable | 停用 | Disable |
| action.enable | 恢复 | Restore |
| action.delete | 删除 | Delete |
| action.edit | 编辑 | Edit |
| action.save | 保存 | Save |
| action.cancel | 取消 | Cancel |
| action.retry | 重试 | Retry |
| action.viewActive | 查看生效项 | View active |
| action.removeLink | 移除链接 | Remove link |
| action.undo | 撤销 | Undo |
| search.installed | 搜索技能名称或描述 | Search skills |
| search.market | 搜索市场技能 | Search market |
| filter.all | 全部 | All |
| filter.project | 项目 | Project |
| filter.projectShared | 项目共享 | Project shared |
| filter.user | 用户 | User |
| filter.userShared | 用户共享 | User shared |
| filter.custom | 自定义 | Custom |
| filter.builtin | 内置 | Bundled |
| filter.disabled | 已停用 | Disabled |
| sort.location | 位置优先级 | Location priority |
| sort.name | 名称 | Name |
| sort.modified | 最近修改 | Recently modified |
| sort.recommended | 推荐 | Recommended |
| sort.updated | 最近更新 | Recently updated |
| group.disabled | 已停用 | Disabled |
| group.readonly | 只读 | Read-only |
| badge.model | 模型可用 | Model |
| badge.user | 用户可调用 | User |
| badge.userOnly | 仅用户可调用 | User only |
| badge.builtin | 内置 | Built-in |
| badge.update | 有更新 | Update available |
| banner.issues | {count} 个技能未生效，可能导致 Agent 行为与预期不符。 | {count} skills are not active. |
| banner.viewIssues | 查看原因 | View issues |
| empty.installed.title | 还没有可管理的技能 | No skills yet |
| empty.installed.body | 从市场安装，或把 SKILL.md 放进技能目录。 | Install from the market, or add a SKILL.md to a skill folder. |
| empty.search | 没有匹配「{query}」的技能 | No skills match "{query}" |
| empty.market.noSource | 还没有添加市场源 | No market sources yet |
| empty.market.noSkills | 该源暂时没有技能 | This source has no skills |
| empty.diagnostics | 全部正常，没有发现问题 | No problems found |
| diagnostics.explain | 格式不合法的技能会被静默跳过，不进入模型目录。这里集中列出原因与修复方式。 | Invalid skills are skipped silently. Fix them here. |
| sources.priority | 同一预设内按 rank 排序；预设层覆盖全局层。 | Within a preset, lower rank wins; preset layers override the global layer. |
| sources.presetNote | 未挂载本地发现的预设，其 Agent 没有技能。 | Presets without local discovery give their agents no skills. |
| install.title | 安装技能 | Install skill |
| install.target | 安装到 | Install to |
| install.version | 版本 | Version |
| install.conflict | 目标位置已有同名技能 | A skill with this name already exists here |
| install.conflict.overwrite | 覆盖 | Overwrite |
| install.conflict.skip | 跳过 | Skip |
| install.conflict.changeTarget | 换位置 | Change location |
| install.success | 已安装 {name} | Installed {name} |
| install.failed | 安装失败：{reason} | Install failed: {reason} |
| uninstall.confirm.title | 卸载技能？ | Uninstall skill? |
| uninstall.confirm.body | 将删除 {name} 及安装记录；不会影响其他技能。 | This removes {name} and its install record. |
| delete.confirm.title | 删除技能？ | Delete skill? |
| delete.confirm.body | 将删除 {path} 及其所有资源文件，无法撤销。 | This deletes {path} and all its resources. |
| disable.confirm.body | 停用后 Agent 将不再看到该技能，文件会移到 .disabled/，可随时恢复。 | Agents will no longer see this skill. Files move to .disabled/ and can be restored. |
| update.available | 有新版本 {version} | Version {version} available |
| update.checking | 正在检查更新… | Checking for updates… |
| update.lastChecked | 上次检查 {time} | Last checked {time} |
| update.banner | {count} 个技能有更新 | {count} skills have updates |
| update.toast | {count} 个技能有更新 | {count} skills have updates |
| update.none | 已是最新 | Up to date |
| update.failed | 上次检查失败 | Last check failed |
| update.checkNow | 检查更新 | Check for updates |
| update.localModified | 本地文件已修改，更新会覆盖这些修改。 | Local files changed; updating overwrites them. |
| update.success | 已更新到 {version} | Updated to {version} |
| source.add.title | 添加市场源 | Add market source |
| source.validate | 校验 | Validate |
| source.validated | 已读取 {count} 个技能 | Found {count} skills |
| source.trust | 该源由第三方提供，安装前请确认来源可信。 | Third-party source. Verify trust before installing. |
| source.error.fetch | 无法读取该源 | Could not read source |
| source.error.schema | 索引格式不正确 | Invalid index format |
| status.readonly | 内置技能不支持修改 | Bundled skills are read-only |
| status.unauthorized | 当前页面未获授权 | This page is not authorized |
| error.read | 无法读取技能目录 | Could not read skill folders |
| toast.created | 已创建技能 {name} | Created skill {name} |
| toast.saved | 已保存 | Saved |
| toast.disabled | 已停用 {name} | Disabled {name} |
| toast.enabled | 已恢复 {name} | Restored {name} |
| toast.deleted | 已删除 {name} | Deleted {name} |
| toast.copied | 已复制 | Copied |

---

## 13. 数据与 API 契约（设计对齐用）

### 13.1 核心对象

```ts
type SkillLocationId =
  | 'project-dsh' | 'project-agents' | 'custom'
  | 'user-dsh' | 'user-agents' | 'bundled' | 'preset'

interface Location {
  id: SkillLocationId
  label: string
  path: string
  rank: number
  layer: 'preset' | 'global'
  writable: boolean
  exists: boolean
  readable: boolean
  skillCount: number
  disabledCount: number
  presets: string[]        // 哪些预设能看到该位置（本地发现挂载）
}

interface Skill {
  id: string
  name: string
  description: string
  whenToUse?: string
  location: SkillLocationId
  rootPath: string
  path: string             // SKILL.md 或 <name>.md；bundled 可能为空
  source: {
    type: 'filesystem' | 'bundled' | 'preset'
    provider: string
    origin?: { kind: 'market'; sourceId: string; version: string; commit?: string; sha256?: string; installedAt?: number }
  }
  rank: number
  writable: boolean
  status: 'active' | 'disabled' | 'shadowed' | 'invalid'
  shadowedBy?: string
  visiblePresets: string[]
  invocation: { modelInvocable: boolean; userInvocable: boolean }
  sizeBytes: number
  updatedAt: number
}

interface Issue {
  id: string
  severity: 'error' | 'warning' | 'info'
  kind: 'broken-link' | 'frontmatter' | 'name' | 'same-layer-shadow' | 'cross-layer-shadow' | 'unreadable' | 'oversize'
  name?: string
  path: string
  message: string
  fix?: { action: 'remove-link' | 'open-file' | 'rename' | 'view-active' | 'retry'; hint: string }
}

interface MarketSkill {
  id: string
  name: string
  title?: LocalizedString
  description: LocalizedString
  version: string
  tags: string[]
  author?: string
  license?: string
  homepage?: string
  sourceId: string
  sourceUrl: string
  commit?: string
  files: Array<{ path: string; sha256: string; size: number }>
  updatedAt?: string
  installed?: { location: SkillLocationId; version: string; modified: boolean; updateAvailable?: string }
}

interface MarketSource {
  id: string
  type: 'index' | 'github' | 'local'
  name: string
  url: string
  ref?: string
  enabled: boolean
  status: 'ok' | 'error' | 'checking'
  skillCount: number
  lastCheckedAt?: number
  error?: string
}
```

### 13.2 Host 路由（建议）

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/skills-manager/api/installed?cwd=` | locations + skills + issues + presets |
| GET | `/skills-manager/api/skill?path=` | 单个技能详情 + 原文 + 资源 |
| POST | `/skills-manager/api/skill` | 新建 |
| PUT | `/skills-manager/api/skill` | 编辑（带 mtime 乐观锁） |
| POST | `/skills-manager/api/skill/state` | 停用/恢复 |
| DELETE | `/skills-manager/api/skill?path=` | 删除 |
| POST | `/skills-manager/api/import` | 粘贴/目录导入 |
| GET | `/skills-manager/api/diagnostics` | 诊断 |
| GET | `/skills-manager/api/market?sourceId=&q=&tag=&page=` | 市场列表 |
| GET | `/skills-manager/api/market/skill?sourceId=&name=&version=` | 市场详情 |
| POST | `/skills-manager/api/market/install` | 安装 |
| POST | `/skills-manager/api/market/update` | 更新 |
| POST | `/skills-manager/api/market/uninstall` | 卸载 |
| GET/POST/DELETE | `/skills-manager/api/sources` | 源管理 |
| POST | `/skills-manager/api/sources/:id/refresh` | 刷新源 |
| POST | `/skills-manager/api/validate` | 校验 frontmatter/内容 |

约定：relative URL、same-origin、JSON、`cache-control: no-store`、`401/403` 围栏、`405 + Allow`、`500 {code,message}`。

### 13.3 错误码（前端映射文案）

| code | 含义 | 建议文案 |
| --- | --- | --- |
| `E_UNAUTHORIZED` | 未授权 | 当前页面未获授权 |
| `E_PATH_OUTSIDE_ROOT` | 路径不在允许根内 | 目标位置不允许写入 |
| `E_READONLY_LOCATION` | 只读位置 | 内置技能不支持修改 |
| `E_NAME_TAKEN` | 同名已存在 | 目标位置已有同名技能 |
| `E_FRONTMATTER` | frontmatter 不合法 | 技能格式不正确：{detail} |
| `E_NAME_INVALID` | name 非法 | 名称只能使用小写字母、数字与连字符 |
| `E_NOT_FOUND` | 技能/文件不存在 | 文件已被移动或删除 |
| `E_CONFLICT_MTIME` | 文件被外部修改 | 文件已被外部修改，请刷新后重试 |
| `E_SOURCE_UNREACHABLE` | 市场源不可达 | 无法连接市场源 |
| `E_SOURCE_SCHEMA` | 索引格式错误 | 索引格式不正确 |
| `E_CHECKSUM` | 校验失败 | 文件校验失败，安装已取消 |
| `E_NOT_ENOUGH_SPACE` | 磁盘空间不足 | 磁盘空间不足 |
| `E_CANCELED` | 用户取消 | 已取消 |
| `E_TOO_LARGE` | 超过大小上限 | 技能文件过大 |

---

## 14. 视觉与组件基线（给 UI 设计师）

> 精确值与来源见 [ui-patterns.md](../research/ui-patterns.md)；本节是设计稿必须遵守的最小集合。实现时全部映射到 `--dsw-*` token。

### 14.1 侧栏入口（宿主负责，插件只提供图标与 label）

- 展开态：面板行 36px 高、`padding 7px 9px`、`gap 6px`、12px 圆角、图标 16×16、文字 14/22。
- 折叠 rail：56px 宽、按钮 36×36、12px 圆角、图标 18×18、tooltip（500ms）`padding 3px 7px`、8px 圆角、`#43454a` 底、13/20 白字。
- 选中态：8% 白底（`--dsw-alias-interactive-bg-hover`）+ 12px 圆角，无边框/下划线；`aria-current="page"`。
- 图标：原创线性书页/星形/层叠符号，16/18px 下可辨。

### 14.2 页面骨架

- `padding: 0 48px`；顶部 28px；标题 20/28 fw500；描述 13/20 `label-secondary`。
- 工具栏右对齐：搜索 33px 高（`bg-layer-1`、12px 圆角、0.5px `border-l2`）、刷新 32px、主按钮 32px（`label-primary` 底 + `label-primary-foreground` 字）。
- 分段 Tab：容器 34px 高、`bg-layer-3`、14px 圆角、`padding 2px`；Tab 30px 高、12px 圆角、`padding 0 12px`、14/20；选中 fw500 + `label-primary`。
- 内容分组：`gap 32px`；分组标题 14/500、高 22px；组头与列表 gap 8px。
- 页面内容最大宽度不限，随窗口伸展；1200px 视口下内容宽约 824px。

### 14.3 列表行（已安装 / 市场）

- 已安装行：65px 高、20px 圆角、`padding 8px`、行间 `gap 2px`、hover 8% 白。
- 图标容器 49×49、16px 圆角、0.5px 描边、内 36px 字形；左下 8px 状态点。
- 名称 14/500；描述 13/18 `label-tertiary` 单行省略；badge 11/17、`padding 1px 8px`、999 圆角。
- 尾部：switch 36×20（开 `label-primary` / 关 16% 白）、图标按钮 32×32、`⋯` 菜单 32×32。
- 市场行：76px 高、20px 圆角、`padding 8px`、图标 40×40（16px 圆角）；名称/版本/作者行 + 描述 + tags；尾部安装按钮 28–32px 高、8–12px 圆角。

### 14.4 抽屉 / 模态 / Toast

- 抽屉：560px 宽、全高、`bg-layer-2`、左侧 20px 圆角、0.5px `border-l2`、`--dsw-elevation-prominent`；遮罩 `rgba(0,0,0,.4)`；头部图标 32×32、标题 20/28/500 等宽；分段 Tab 同页面；底部固定操作条。
- 模态：560px 宽（确认 360px）、20px 圆角（确认 14px）、`bg-layer-2`、0.5px 描边、`--dsw-elevation-panel`；遮罩同抽屉；标题 16/24/500；底部右对齐按钮。
- Toast：底部居中、12px 圆角、`bg-layer-3`、13px；成功/失败图标；4s 自动消失；可撤销操作带「撤销」文本按钮（8s）。
- 进度：安装模态内使用线性进度 + 「下载 3/5 文件」「校验中」文字；不用大 spinner。

### 14.5 颜色 token（暗 / 亮）

| Token | 暗 | 亮 | 用途 |
| --- | --- | --- | --- |
| `--dsw-alias-bg-base` | `#151517` | `#fff` | 页面底 |
| `--dsw-specific-sidebar-fill` | `#1b1b1c` | `#f9fafb` | 侧栏 |
| `--dsw-alias-bg-layer-1/2/3` | `#232324` / `#2c2c2e` / `#353638` | `#fff` / `#fff` / `#f0f0f2` | 输入/卡片/Tab |
| `--dsw-alias-label-primary/secondary/tertiary/caption` | `#f9fafb` / `#cfd3d6` / `#adb2b8` / `#81858c` | `#0f1115` / `#61666b` / `#81858c` / `#adb2b8` | 文字 |
| `--dsw-alias-border-l1/l2/l3` | `#ffffff0f` / `#ffffff1f` / `#ffffff29` | `#0000000a` / `#0000001a` / `#00000029` | 描边/分隔 |
| `--dsw-alias-interactive-bg-hover` | `#ffffff14` | `#2631480f` | hover/选中 |
| `--dsw-specific-sidebar-nav-item-active` | `#43454a` | `#ebeef2` | chips 选中/导航 |
| `--dsw-alias-button-primary-fill` / `--dsw-alias-label-primary-foreground` | `#f9fafb` / `#0f1115` | `#0f1115` / `#f9fafb` | 主按钮 |
| `--dsw-alias-state-success-primary` / `warn` / `error` / `link` | `#22c55e` / `#f59e0b` / `#f25a5a` / `#7aaaff` | 深色变体 | 状态/链接 |

### 14.6 圆角 / 字号 / 阴影

- 圆角：4（xs）/ 8（sm）/ 12（md）/ 14（Tab 容器）/ 16（图标容器）/ 20（卡片、行）/ 28（Settings，本模块不用）。
- 字号：12/18、13/20、14/22、16/24、20/28、24/32；等宽 `ui-monospace, SFMono-Regular, Menlo`。
- 阴影：`--dsw-elevation-panel`、`--dsw-elevation-prominent`；不要自造重阴影。
- 焦点环：`--dsw-focus-ring-width: 2px`。

### 14.7 图标与插图

- 所有图标内联 SVG，`fill:none; stroke:currentColor; stroke-width:1.5`。
- 来源字形：项目（folder）、用户（person）、用户共享（share/users）、自定义（sliders）、插件内置（puzzle）、预设（layers）。
- 状态字形：绿点、灰点、红点；不用彩色大面积。
- 空状态插图：120×120 骨架色块 + 48px 线性图标；不使用位图。

### 14.8 响应式

- 基准 1200×900；1440×900 不劣化；内容随宽度伸展。
- < 1100px：列表仍单列、工具栏允许换行、抽屉占 80% 宽；< 900px：抽屉全宽、模态 90% 宽。
- 不做移动端专属布局。

### 14.9 禁止项

- 不自绘侧栏整栏（只出「技能」入口图标与选中态）。
- 不使用 CDN 字体/图片、iframe、外部 CSS。
- 不使用大面积渐变、霓虹色、玻璃拟态（除宿主菜单已有的毛玻璃）。
- 不使用与 DSH 现有页面不同的圆角/字号体系。

---

## 15. 交互与动效规则（给交互设计师）

1. **搜索**：150ms 防抖（市场 300ms）；`/` 聚焦；`Esc` 清空并退出焦点；搜索词高亮匹配部分（可选）。
2. **筛选**：chips 单选；切换 Tab 保留筛选；「已停用」不混入「全部」。
3. **列表**：行点击打开抽屉；`↑/↓` 移动焦点、`Enter` 打开；switch / ⋯ 阻止冒泡。
4. **抽屉**：`Esc`、遮罩、关闭按钮关闭；关闭后焦点回到触发行；内部 Tab `←/→` 切换。
5. **模态**：`Esc` 关闭（安装进行中先确认取消）；打开后焦点进入标题；关闭后焦点回触发元素。
6. **停用**：立即执行 + toast 撤销（8s）；撤销后恢复原位置与分组。
7. **删除/卸载**：二次确认；默认不勾选「保留备份」；卸载显示来源与版本。
8. **安装**：三步内完成；冲突处理必须显式选择；安装中不可关闭模态（可取消）；成功后 toast + 跳转已安装并高亮。
9. **更新**：先显示版本差异与本地修改警告；确认后执行；成功后保留当前筛选。
10. **添加源**：输入 → 校验（按钮 loading）→ 预览（名称/技能数/示例）→ 保存；校验失败不移除已输入内容。
11. **刷新**：保持当前状态；刷新按钮有 loading 态（禁用 + 文案「刷新中…」）。
12. **自动检查更新**：页面打开时读取 Host 的检查状态（不阻塞列表）；有更新显示 Tab 计数、信息条、行徽标；打开页面时若存在更新，显示一次性 toast「N 个技能有更新」（同一会话不重复）；自动检查失败不弹错误 toast，只在来源页/信息条显示「上次检查失败」。
13. **手动检查更新**：「检查更新」按钮进入 loading（「检查更新中…」），完成后更新状态；失败行内提示 + 重试；不打断用户当前筛选。
14. **动效**：抽屉 180ms `cubic-bezier(.2,.8,.2,1)`；Toast 200ms 进入、4s 停留；`prefers-reduced-motion` 下禁用位移，仅淡入。
15. **错误提示**：行内错误 > 模态错误条 > 页级错误面板；不要把所有错误都做成 toast。
16. **只读**：禁用按钮 + tooltip 原因；不要隐藏到让用户找不到。
17. **键盘**：`Cmd/Ctrl+S` 保存编辑；`Cmd/Ctrl+R` 刷新（不拦截浏览器默认，或仅聚焦页面内）。
18. **焦点管理**：抽屉/模态打开时锁定背景滚动；关闭后恢复。
19. **空状态**：必须有主出口（新建/导入/添加源/去市场）。
20. **状态保留**：切 Tab/切面板/返回详情时保留搜索、筛选、滚动。

---

## 16. 可访问性

- 所有图标按钮有 `aria-label`；switch 用 `role="switch"` + `aria-checked`；Tab 用 `role="tablist"/tab` + `aria-selected`。
- 焦点环可见（2px `--dsw-focus-ring-color`）；键盘可达所有操作。
- 正文对比度 ≥ 4.5:1；亮色 tertiary 建议加深（`#6b7078`）以满足。
- 不依赖颜色传达状态：状态点 + 文案/tooltip。
- 安装进度用 `role="progressbar"` + `aria-valuenow`；错误用 `role="alert"`。
- 动画尊重 `prefers-reduced-motion`。

---

## 17. 非功能需求

| 类别 | 要求 |
| --- | --- |
| 性能 | 已安装列表首屏 < 500ms（技能 < 200 个）；市场列表分页/惰性；安装进度不阻塞 UI |
| 规模 | 单位置 ≤ 500 技能；市场源 ≤ 2000 条；索引 ≤ 5 MB |
| 安全 | https-only、拒绝 redirect、sha256、路径穿越/符号链接防护、大小上限；不在前端存 token |
| 跨平台 | macOS / Windows / Linux；路径分隔符、保留名、符号链接差异 |
| 国际化 | 中英文；所有字符串走 locale；日期/文件大小按 locale 格式化 |
| 离线 | 已安装管理完全离线可用；市场显示缓存并标「已过期」 |
| 可观测 | Host 日志记录安装/删除/失败原因（不记录正文）；错误码可上报 |
| 版本 | 兼容 `>=0.2.1-rc.5 <0.3.0`；技能格式变化时给出提示 |

---

## 18. 设计交付要求与验收清单

### 18.1 交互设计师交付物

1. `IA 图`（与 §6 一致，可有细微调整但需说明）。
2. `页面流程图`：安装、更新、卸载、新建、导入、编辑、停用/恢复、诊断修复、添加源（9 条）。
3. `页面状态说明`：§11 矩阵中的每一行都要有对应描述与触发条件。
4. `组件行为说明`：列表行、抽屉、模态、toast、switch、chips、搜索、进度、错误条。
5. `文案清单`：§12 + 新增文案（标注）。
6. `边界案例`：同名冲突、只读位置、断链、源不可达、安装中断、路径不存在、无权限。
7. `键盘与焦点`说明。

### 18.2 UI 设计师交付物（画面清单）

必须覆盖（暗色为主，亮色至少 3 张关键画面）：

| # | 画面 | 状态 |
| --- | --- | --- |
| 1 | 侧栏展开 + 已安装列表 | 默认、有诊断 banner |
| 2 | 侧栏折叠 rail | 技能入口选中 + tooltip |
| 3 | 已安装列表 | 空状态（含去市场出口） |
| 4 | 已安装列表 | 搜索无结果 |
| 5 | 已安装列表 | 某位置不可读（部分失败） |
| 6 | 详情抽屉 — 概览 | 可写技能 |
| 7 | 详情抽屉 — 原文 / 编辑态 | 可写 / 只读 |
| 8 | 新建技能模态 | 正常 + 名称校验错误 |
| 9 | 导入模态 | 粘贴 / 目录两种 |
| 10 | 停用 toast + 已停用组 | 可撤销 |
| 11 | 删除确认 | 危险操作 |
| 12 | 诊断抽屉/页面 | 断链 + 覆盖两类问题 |
| 13 | 来源页 | 7 个位置 + 预设 + 市场源 |
| 14 | 市场首页 | 有源、列表、已安装标记 |
| 15 | 市场详情 | 未安装 / 已安装 |
| 16 | 安装模态 | 落点选择 + 冲突处理 |
| 17 | 安装中 / 成功 toast | 进度 |
| 18 | 源管理（添加源 + 校验结果） | 正常 / 错误 |
| 19 | 市场错误态 | 源不可达 / 离线 |
| 20 | 亮色关键画面 | 已安装列表、市场首页、详情抽屉 |
| 21 | 自动更新检查 | 检查中 / 有更新（信息条 + Tab 计数 + 行徽标）/ 上次检查失败 |

另需：组件规格页（行、组头、badge、按钮、搜索、chips、switch、抽屉、模态、toast、进度、空/错状态）、token 映射标注、图标集。

### 18.3 共同验收清单

- [ ] 三个 Tab 与页面结构符合 §5/§6。
- [ ] 已安装按 7 类位置分组，顺序与 rank 一致，只读组有标识。
- [ ] 诊断覆盖 5 类问题，每类有修复动作。
- [ ] 安装流程 ≤ 3 步，冲突处理显式。
- [ ] 所有写操作有确认或撤销；只读位置无写操作。
- [ ] 空/错/载入/部分失败/只读/离线状态齐全。
- [ ] 暗/亮主题；1200/1440 无破版。
- [ ] 文案与 §12 一致；新增文案已标注。
- [ ] 不使用禁用项（§14.9）。

---

## 19. 开放问题与假设

| # | 问题 | v1 假设 | 需要谁确认 |
| --- | --- | --- | --- |
| 1 | 市场安装默认落点 | **已确认**：`~/.dsh/skills`（DSH 专属），可切换到用户共享/项目 | 已确认 |
| 2 | 是否支持项目级安装 | 支持，项目根 = 最近 `.git` 祖先 | 产品 |
| 3 | 更新策略 | **已确认**：检查自动执行（启动后 + 周期 + 页面补检），只提示可更新；更新下载/覆盖必须用户手动触发；不自动安装 | 已确认 |
| 4 | 索引 schema | **已定稿草案**：见 [skill-market-index-spec.md](skill-market-index-spec.md)（format 1，第三方可实现） | 评审后冻结 |
| 5 | GitHub 无索引仓库 | v1 不作为市场源；规范评审后再决定「GitHub 仓库适配器」或「单技能 URL 安装」 | 规范评审 |
| 6 | 私有源/私有库 | v1 不支持 token；v2 接 credentials | 平台 |
| 7 | 技能版本并存 | v1 不支持，只保留一份；更新覆盖（可备份） | 产品 |
| 8 | 内置 provider → 包名映射 | 无稳定映射时显示 provider 名；v2 维护映射表 | 平台 |
| 9 | 评分/下载量 | v1 不展示；没有可信数据源 | 产品 |
| 10 | 技能依赖 | v1 不做；技能包内资源随目录复制即可 | 平台 |
| 11 | 诊断是否自动修复 | v1 只做显式动作（移除断链、重命名建议），不自动改文件 | 产品 |
| 12 | 市场内容语言 | v1 展示索引提供的 zh/en；缺失回退英文 | 产品 |
| 13 | 当前 DSH 版本获取 | `engines.dsh` 兼容判断需要运行版本；未确认前 v1 视为兼容并提示 | 平台 |
| 14 | 自动检查频率/开关 | v1 固定：启动后约 15s + 每 6 小时 + 页面补检（距上次 >30 分钟）；v2 提供设置 | 产品 |

**已确认的事实假设**（不需要再验证）：

- Host 层 `skill-filesystem`/`tool-skill` 被关闭，本地发现由预设挂载。
- 扫描只认一层；frontmatter 失败静默丢弃；无 per-skill 状态库；rank/层覆盖规则。
- 左侧栏入口 = `sidebar.panellist` + `main`（同一 id/key），不用 `footer.action`。

---

## 20. 附录

### 20.1 术语

| 术语 | 含义 |
| --- | --- |
| 位置（Location） | 技能的安装根，如 `~/.dsh/skills`、`~/.agents/skills`、项目根 |
| provider | 技能的来源实现；文件系统 provider 或插件注册的 provider |
| scope / preset 层 | Agent 预设各自维护的技能层；global 层是所有预设共享层 |
| rank | 同一层内同名技能的优先级数字，越小越优先 |
| 遮蔽（shadow） | 同名技能被更高优先级条目覆盖 |
| 已停用 | 技能文件移到 `<root>/.disabled/`，暂时不被发现 |
| 市场源 | 提供符合《技能市场索引规范》的 JSON 索引的来源（任意 https 静态地址；GitHub 仓库需提供 `index.json`） |
| sidecar / 安装记录 | 插件自己的状态文件（`~/.dsh/skills-manager/state.json`），记录来源/版本/commit/文件 sha/安装时间 |
| 索引源 | 一个 https 的 `index.json`（format 1），含技能列表、版本、文件清单与 sha256 |

### 20.2 参考文档

- [Skill 生命周期与管理机制（一页事实）](../research/README.md)
- [Skill 子系统深调研](../research/skill-subsystem.md)
- [插件 UI 架构（左侧栏入口 + 主面板）](../research/plugin-ui-architecture.md)
- [当前 DSH UI 实测（几何/token）](../research/ui-patterns.md)
- [技能市场索引调研](../research/skill-market-index-research.md)
- [技能市场索引规范 v1.0](skill-market-index-spec.md) · [JSON Schema](skill-market-index.schema.json) · [示例](examples/skill-market-index.example.json)
- [技能市场索引实现方案](../design/skill-market-index-implementation.md)
- 技术方案（包结构/路由/安全/里程碑）：`docs/plugins/skill-manager/design/skill-manager-plugin-plan.md`（可作实现参考，不影响设计稿范围）

### 20.3 版本记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0 | 2026-11-06 | 首版：市场 + 已安装管理 + 来源页；基于本机 DSH 0.2.1-rc.5 调研 |
| v1.1 | 2026-11-06 | 确认默认落点 `~/.dsh/skills`；更新改为「只手动检查、只提示」；市场索引改由独立规范驱动（format 1 + 文件清单 + sha256）；GitHub 无索引仓库 v1 不支持；安装冲突去掉「重命名」 |
| v1.2 | 2026-11-06 | 更正更新策略：**自动检查更新（启动后 + 每 6 小时 + 页面补检，只提示）**，**更新动作仍由用户手动触发**；补充自动检查的状态、文案与画面要求 |
---

## 21. 给设计师 Agent 的启动指令（可直接复制）

> 用法：把对应段落连同本文件路径一起发给你的交互设计师 Agent 或 UI 设计师 Agent。两个 Agent 都应先完整读本文件，再读其中指定的参考文档。

### 21.1 给「原型交互设计师 Agent」

```text
你是本项目的原型交互设计师。请先完整阅读 docs/plugins/skill-manager/product/skills-manager-prd.md（产品需求文档 v1.1），
再读 docs/plugins/skill-manager/research/ui-patterns.md（真实 DSH 界面几何/token）、docs/plugins/skill-manager/research/README.md（Skill 生命周期）
与 docs/plugins/skill-manager/product/skill-market-index-spec.md 的 §12/§15（市场读取/校验契约、错误码）。

任务：为「Skills 管理模块」产出交互稿，覆盖：
1) 技能市场（源选择、搜索/分类、详情、安装/更新/卸载、源管理）
2) 已安装技能管理（按 7 类安装位置分组、详情抽屉、新建/导入、编辑、停用/恢复、删除、诊断）
3) 来源页（本地位置、预设可见性、市场源、优先级说明）

必须交付：
- IA 图（与 PRD §6 对齐，若有调整需说明理由）
- 9 条页面流程图：安装、更新、卸载、新建、导入、编辑、停用/恢复、诊断修复、添加市场源
- 每个页面的状态说明（PRD §11 矩阵逐项）
- 组件行为说明（列表行、抽屉、模态、toast、switch、chips、搜索、进度、错误条）
- 文案清单（PRD §12 + 新增文案标注）
- 边界案例（同名冲突、只读、断链、源不可达、安装中断、路径不存在）
- 键盘与焦点说明

约束：
- 严格按 PRD §3.1 的 v1 范围，不扩展 v2 功能；不设计插件管理（Plugins/Discover）。
- 更新检查**自动执行**（启动后 + 每 6 小时 + 页面补检），只提示可更新；下载与覆盖必须用户手动点「更新」并确认；不设计自动下载/自动安装。
- 市场源只支持「索引源（含 GitHub 提供的 index.json）」与「本地导入」；无索引 GitHub 仓库不作为源。
- 所有写操作可逆或有确认；只读位置不得出现可点击的写操作。
- 文案用简体中文，保留英文 key 标注；与 PRD §12 一致。
- 遇到 PRD §19 的开放问题，按「v1 假设」继续，并在交付物中标注「假设待确认」。

输出路径：docs/plugins/skill-manager/design/skills-manager-interaction-v2.md（可附 Mermaid/ASCII 流程图）。
完成标准：PRD §18.1 与 §18.3 全部勾选。
```

### 21.2 给「UI 设计师 Agent」

```text
你是本项目的 UI 设计师。请先完整阅读 docs/plugins/skill-manager/product/skills-manager-prd.md（产品需求文档 v1.1），
再读 docs/plugins/skill-manager/research/ui-patterns.md（真实 DSH 界面几何/token，视觉基线）与 docs/plugins/skill-manager/research/plugin-ui-architecture.md（侧栏入口/页面槽位），
市场部分以 docs/plugins/skill-manager/product/skill-market-index-spec.md 的字段与状态语义为准。

任务：产出「Skills 管理模块」的高保真 UI 稿，暗色为主、亮色对照；覆盖 PRD §18.2 的 21 个画面（至少覆盖其中 19 个，缺项需说明）。
必须包含：
- 侧栏入口（展开 + 折叠 rail + tooltip；只画入口与页面，不自绘宿主侧栏整栏）
- 已安装列表（默认/空/搜索无结果/部分失败）、详情抽屉（概览/原文/编辑态）、新建/导入模态、停用 toast、删除确认
- 诊断（断链/覆盖两类问题）、来源页（7 个位置 + 预设 + 市场源）
- 市场首页/详情/安装模态（落点 + 冲突）/安装中/源管理/错误态
- 亮色关键画面 3 张（已安装列表、市场首页、详情抽屉）

视觉约束（必须）：
- 只用 --dsw-* token；暗色基线 #151517、侧栏 #1b1b1c、卡片 #232324/#2c2c2e、20px 大圆角、13/14px 排版。
- 页面骨架：左右 48px、顶部 28px、标题 20/28 500、描述 13/20、Tab 容器 34px、列表行 65px、抽屉 560px、模态 560px（确认 360px）。
- 图标原创内联 SVG（24 viewBox、stroke 1.5），16/18px 可辨；不使用 CDN/位图/iframe。
- 禁止：大面积渐变、霓虹色、与 DSH 现有页面不同的圆角/字号体系。
- 更新检查自动执行；UI 需画「检查中 / 可更新 / 上次检查失败」状态 + 手动更新入口；不画自动下载/自动更新开关。
- 市场源只画「索引源（URL）」与「本地目录」两种；无索引 GitHub 仓库不作为源，不要画「GitHub 仓库浏览」。

交付：
- docs/plugins/skill-manager/prototypes/skills-manager-v2.html（单文件、零外部依赖、可交互；支持 ?view=…&theme=…&clean=1）
- docs/plugins/skill-manager/prototypes/screens-v2/01…*.png（1440×900 @2x，clean=1，无辅助控件）
- docs/plugins/skill-manager/prototypes/skills-manager-v2.md（画面清单、参数说明、组件→槽位/token 映射、已知取舍、自检记录）

完成标准：PRD §18.2 画面清单 + §18.3 验收清单全部满足；截图逐张自检（溢出/截断/对比度/对齐）。
```

### 21.3 交接时的三个提醒

1. **旧版交互稿/UI 稿不作为输入**：`docs/plugins/skill-manager/design/skill-manager-interaction.md` 与 `docs/plugins/skill-manager/prototypes/skill-manager-ui.*` 是旧范围（没有市场、没有按位置分类），只作历史参考。
2. **事实基线不能改**：7 类位置、rank、预设层覆盖 global 层、失败静默、无 per-skill 状态库、索引 format 1 的「文件清单 + sha256 + 不可变版本」——这些是调研/规范结论，设计师不得为了画面好看而弱化或虚构。
3. **产品范围先冻结**：先按 PRD §3.1 出 v1 稿；v2 功能只预留入口（如批量更新、自动更新），不展开设计；市场索引以 `docs/plugins/skill-manager/product/skill-market-index-spec.md` 为准。
