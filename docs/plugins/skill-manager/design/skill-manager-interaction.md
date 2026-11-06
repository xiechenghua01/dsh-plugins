# 技能管理（Skill Manager）— 交互稿

> 状态：设计稿 v1（待评审）
> 依据：`docs/plugins/skill-manager/research/skill-subsystem.md`、`docs/plugins/skill-manager/research/plugin-ui-architecture.md`、
> `docs/plugins/skill-manager/research/ui-patterns.md`（真实界面实测）、`docs/plugins/skill-manager/research/README.md`（一页事实）
> 目标插件：`@xiechenghua01/dsh-skill-manager`，左侧栏入口 + 全屏面板页
> 视觉基线：DSH 暗色主题，仅使用 `--dsw-*` token；几何取 `ui-patterns.md` 实测值

---

## 1. 定位

**一句话**：让用户看见 Agent 到底能用哪些技能、从哪来、为什么没生效，并就地完成新建、编辑、导入、停用与修复。

**不是**：不是插件市场（那是 Plugins → Discover），不是会话里的技能调用 UI（那是 `/name`），不是 Agent 预设编辑器。

### 1.1 要解决的真实问题

| 现状 | 用户痛点 | 本页面对应能力 |
| --- | --- | --- |
| 技能是磁盘上的 `SKILL.md`，由 **Agent 预设**挂载的扫描根发现（cordis/standard 扫描 `~/.dsh/skills`、`~/.agents/skills`、项目 `.dsh/skills`、`.agents/skills`，并额外挂 `dsh-agent-preset/skills`） | 不知道装到哪、写什么格式、放对没有；换 preset 后技能消失 | 来源页展示每个预设的挂载状态、扫描根、路径、技能数；新建/导入直接落到正确根 |
| 发现失败是**静默**的（坏 frontmatter、断链、非法 name 直接消失） | 「我明明放了技能，Agent 看不到」 | 诊断页把无效项、断链、重名遮蔽显式列出来 |
| 技能来自文件系统、插件内置、Agent 预设三层，同名按 rank 遮蔽 | 不知道某个技能为什么没生效、是谁覆盖了谁 | 每个技能标注来源/作用域；诊断页给出「被 X 遮蔽」 |
| 插件内置技能（office、dsh-badge 等）不可编辑 | 容易误删或误改 | 内置技能只读，行上标「内置」，操作只有查看/复制调用 |
| 没有安装入口 | 只能手动建目录、写 YAML | 新建向导 + 导入（粘贴/目录） |

### 1.2 设计原则

1. **只做真实存在的事**：每个按钮都对应一个已确认的 Host 能力；做不到的能力不出现在 v1。
2. **可逆优先**：停用 = 移入 `.disabled/`，随时恢复；删除才需要二次确认。
3. **来源优先于分类**：技能的第一属性是「从哪来」（用户/项目/插件/预设），因为它决定了能不能改。
4. **诊断前置**：有无效技能时，在列表页顶部用一条横幅提示，不把问题藏在第三个 tab。
5. **不抢会话**：全局面板页，不绑定会话；需要会话上下文时用「作用域」说明，而不是让用户切会话。

---

## 2. 信息架构

```
左侧栏（sidebar.panellist，与 Plugins / 自动化任务同级）
└─ 技能（Skills）                        ← 图标入口，id = skill-manager
   └─ 主面板（main 槽，key = skill-manager）
      ├─ 页头：标题 / 描述 / 工具栏（搜索、刷新、新建技能）
      ├─ 分段 Tab：技能库 | 来源 | 诊断
      ├─ 技能库
      │   ├─ 筛选 chips（全部 / 用户 / 项目 / 插件内置 / 预设内置）+ 排序
      │   ├─ 问题横幅（仅当诊断有问题时）
      │   ├─ 分组列表（按来源根分组，组头含路径、数量、打开目录）
      │   └─ 已停用分组（折叠，默认收起）
      ├─ 来源
      │   ├─ 本地扫描根（5 个默认根 + 自定义目录）
      │   └─ 内置技能 Provider（插件 / 预设，只读）
      ├─ 诊断
      │   ├─ 问题列表（错误 / 警告，含原因与修复动作）
      │   └─ 空状态：全部正常
      ├─ 右侧抽屉：技能详情
      │   ├─ 概览 | 原文 | 资源 | 诊断
      │   └─ 底部操作：复制调用命令、编辑、停用/启用、删除
      └─ 模态：新建技能 / 导入技能 / 删除确认
```

### 2.1 为什么是全局面板而不是 Settings 子页

- 技能是**跨会话**的全局资产，与 Plugins 页同级更符合心智。
- Settings 是 800×800 模态浮层，内容宽度仅 612px，放不下「分组列表 + 详情 + 诊断」。
- 官方已有同类先例：Plugins、自动化任务、mcp-manager 都是 `main` 面板 + 侧栏入口。

### 2.2 入口位置

- 使用 `sidebar.panellist`（顶部面板列表），**不是** `sidebar.footer.action`（底部插件槽）。
- `order: 20`，排在 Plugins（0）与自动化任务（10）之后；`id` 与 `main` 的 key 同为 `skill-manager`。
- 展开态：行高 36px、`padding 7px 9px`、`gap 6px`、圆角 12px、图标 16×16、文字 14px/22px。
- 折叠态（rail 56px）：36×36 按钮、图标 18×18、hover 500ms 后出 tooltip「技能」。
- 选中态：背景 `--dsw-alias-interactive-bg-hover`（8% 白）+ 圆角 12px，`aria-current="page"`。

### 2.3 技能来源与可见性（决定页面信息结构）

调研确认：本地技能发现由 **Agent 预设**挂载（host 层 `skill-filesystem` / `tool-skill` 被 `dsh-web-app` 显式关闭，注释写明「presets own local discovery」）。因此一个技能是否被 Agent 看见，取决于两层：

```
global 层（所有预设共享）
├─ 插件内置 provider：office×7、dsh-badge、official-plugins、personalized-pages …
└─ （host 层 skill-filesystem 被关闭，本地技能不在此层）

preset 层（每个 Agent 预设各一套，如 cordis / standard / ptc / minimal）
├─ skill-filesystem：project-dsh / project-agents / custom / user-dsh / user-agents
│   └─ cordis/standard 额外挂 @deepseek-ai/dsh-agent-preset/skills（custom 根，4 个 creator 技能）
└─ tool-skill：把该层的技能渲染成模型 catalog
```

读取规则：**近层同名直接覆盖远层**；同一层内才按 rank 排序（project 100/200、custom 300、user 400/500、bundled 600）。

对页面的影响：

1. 技能库必须能按「可见范围」聚合：`全局` / `预设 cordis` / `预设 standard` …，并在每个技能上标注「可见于 N 个预设」。
2. 「插件内置」与「预设内置」是两类只读来源，不能混为一组。
3. 本机 `minimal` 预设不挂载任何 skill 行 → 该预设下 Agent 没有技能；来源页要如实展示「未挂载」。
4. 诊断里的「被遮蔽」分两种：同一层内 rank 覆盖（文件系统根之间）、跨层覆盖（预设层覆盖全局层）。文案要区分。

---

## 3. 页面骨架

沿用 Plugins 页骨架（`ui-patterns.md` §3）：

```
section.page                 padding: 0 48px
└ div.pageBody               padding: 0 48px 48px
  └ header.pageHead          padding-top: 28px; gap 16px
    ├ h1 技能                20px/28px, fw 500
    ├ p 描述                 13px/20px, label-secondary, gap 4px
    ├ div.toolbar           右对齐, gap 8px: 搜索框 33px + 刷新 32px + 主按钮 32px
    └ div.tabs              34px 高, bg layer-3, radius 14, padding 2px
  └ div.content             gap 32px
```

### 3.1 技能库 tab

```
┌ 技能                                              [🔍 搜索技能…] [↻] [+ 新建技能] ┐
│ 管理 Agent 可用的技能：查看来源、调用方式，修复未生效的条目。                          │
│                                                                                  │
│ [ 技能库 ] [ 来源 ] [ 诊断 2 ]                                                     │
│                                                                                  │
│ ⚠ 2 个技能未生效，可能导致 Agent 行为与预期不符。            [查看原因 →]              │
│                                                                                  │
│ (全部) 用户  项目  插件内置  预设内置                          排序：名称 ⌄            │
│                                                                                  │
│ 项目技能 · <repo>/.dsh/skills                                   1 个   [打开目录]   │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ◉ code-review      [项目] [模型] [用户可调用]                       [●]  ⋯   │ │
│ │   审查代码变更并给出可执行的修改建议                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ 用户技能 · ~/.dsh/skills                                        2 个   [打开目录]   │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ◉ release-notes    [用户] [仅用户]                                  [●]  ⋯   │ │
│ │   从提交记录生成发布说明                                                         │ │
│ ├──────────────────────────────────────────────────────────────────────────────┤ │
│ │ ◉ api-design       [用户] [模型] [用户可调用]                       [●]  ⋯   │ │
│ │   接口设计约定：命名、错误码与版本化策略                                           │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ 用户共享 · ~/.agents/skills                                     1 个   [打开目录]   │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ◉ ego-browser      [用户] [模型] [用户可调用]                       [●]  ⋯   │ │
│ │   用真实浏览器打开网页、操作页面并截图取证                                        │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ 插件内置 · 随插件安装提供                                          2 个   只读       │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ◉ office-docx      [插件] [模型] [用户可调用]                      [内置]      │ │
│ │   Create, read, edit, and validate Word documents (.docx)                     │ │
│ ├──────────────────────────────────────────────────────────────────────────────┤ │
│ │ ◉ personalized-pages [插件] [模型] [用户可调用]                     [内置]      │ │
│ │   为这个 App 规划可留存、可更新的个性化页面                                       │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ▸ 已停用 (2)                                                                      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**分组规则**

| 分组 | 来源根 / provider | 可编辑 | 排序位置 |
| --- | --- | --- | --- |
| 项目技能 | `<projectRoot>/.dsh/skills`（rank 100） | 是 | 1 |
| 项目共享 | `<projectRoot>/.agents/skills`（rank 200） | 是 | 2 |
| 自定义目录 | `customSkillDirs`（rank 300） | 是 | 3 |
| 用户技能 | `~/.dsh/skills`（rank 400） | 是 | 4 |
| 用户共享 | `~/.agents/skills`（rank 500） | 是 | 5 |
| 插件内置 | 插件包注册的 provider（rank 600） | 否 | 6 |
| 预设内置 | Agent 预设层提供的技能 | 否 | 7 |
| 已停用 | 各根下 `.disabled/` | 是（恢复/删除） | 末尾，默认折叠 |

**行规格**（对齐 Plugins「已安装」行，`ui-patterns.md` §4.1）

- 行高 65px，圆角 20px，`padding 8px`，行间 `gap 2px`，hover 背景 8% 白。
- 左：49×49 图标容器（圆角 16px、0.5px 描边），内部 36×36 来源字形；左下角 8px 状态点
  （正常 `--dsw-alias-state-success-primary`、停用灰、错误 `--dsw-alias-state-error-primary`）。
- 主区：名称 14px/500 + 行内 badges；描述 13px/18px `label-tertiary` 单行省略。
- 尾部：switch（36×20）或「内置」文字标记 + 图标按钮「⋯」32×32。
- 整行可点（打开抽屉）；switch 与「⋯」阻止冒泡。

**筛选 chips**（对齐发现页）：高 24px、圆角 999px、`padding 0 8px`、12px/18px；
选中 `--dsw-specific-sidebar-nav-item-active` + `label-primary`，未选中 `bg-layer-2` + `label-secondary`。

**排序**：名称 A→Z（默认）/ 来源优先级 / 最近修改。

**搜索**：33px 高、`bg-layer-1`、圆角 12px、0.5px `border-l2`；匹配名称、描述、`whenToUse`、路径；
输入 150ms 防抖；`/` 聚焦；有内容时右侧出现清除按钮；无结果显示搜索空状态。

### 3.2 来源 tab

```
┌ 技能                                              [🔍 搜索技能…] [↻] [+ 新建技能] ┐
│ [ 技能库 ] [ 来源 ] [ 诊断 2 ]                                                     │
│                                                                                  │
│ Agent 预设                                                  技能按预设分别挂载        │
│ 技能是否对 Agent 可见，取决于它所在预设层的 provider 是否挂载。                        │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ● cordis         本地发现：已挂载   4 个预设技能 + 本地根        [查看组成]     │ │
│ │ ● standard       本地发现：已挂载   —                          [查看组成]     │ │
│ │ ○ minimal        本地发现：未挂载   该预设的 Agent 没有技能         —          │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ cordis 预设的本地扫描根（改文件即生效）                           rank 由高到低      │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ● 项目技能        <repo>/.dsh/skills             1 个技能   100  [打开目录]    │ │
│ │ ● 项目共享        <repo>/.agents/skills          目录不存在  200  [复制路径]    │ │
│ │ ● 预设技能        …/dsh-agent-preset/skills      4 个技能   300  [查看]        │ │
│ │ ● 用户技能        ~/.dsh/skills                  2 个技能   400  [打开目录]    │ │
│ │ ● 用户共享        ~/.agents/skills               1 个技能   500  [打开目录]    │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ 全局层技能来源（所有预设共享）                                                      │
│ 由插件内置，随插件升级更新，不能在此修改。                                            │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ▣ dsh-office      @deepseek-ai/dsh-skill-office             7 个技能   只读    │ │
│ │ ▣ dsh-badge       @deepseek-ai/dsh-skill-badge              1 个技能   只读    │ │
│ │ ▣ recommendations @deepseek-ai/dsh-plugin-recommendations   2 个技能   只读    │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ 同名技能：同一层内 rank 小的赢；预设层覆盖全局层。被覆盖项在「诊断」中列出。 [了解机制 ↗] │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- 状态点：可读绿、目录不存在灰、不可读/断链警告黄。
- 「打开目录」调用宿主打开文件管理器（能力确认后接入；未确认时降级为「复制路径」）。
- 预设行展示的是「该预设是否挂载了本地发现」；未挂载的预设只显示说明，不显示扫描根。
- 「预设技能」根指向 `@deepseek-ai/dsh-agent-preset/skills`（包内目录，只读），标「查看」而不是「打开目录」。
- 本页不做 provider 启停开关：provider 行属于 profile / preset YAML，改它需要重启；v1 只如实展示状态与路径。

### 3.3 诊断 tab

```
┌ [ 技能库 ] [ 来源 ] [ 诊断 2 ]                                                     │
│                                                                                  │
│ 2 个问题                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ⛔ 断链  tabbit                             ~/.agents/skills/tabbit            │ │
│ │    目录指向的目标不存在，技能无法读取。                          [移除链接]      │ │
│ ├──────────────────────────────────────────────────────────────────────────────┤ │
│ │ ⚠ 被遮蔽  code-review                      ~/Codes/acme/.dsh/skills           │ │
│ │    与 ~/.dsh/skills/code-review 同名，按优先级使用了后者。        [查看生效项]    │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ 说明：格式不合法的技能会被静默跳过，不进入模型目录。这里集中列出原因与修复方式。          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

问题类型与修复动作：

| 类型 | 判定 | 严重度 | 动作 |
| --- | --- | --- | --- |
| 断链 / 目标不存在 | 路径不可读 | 错误 | 移除链接、打开所在目录 |
| frontmatter 缺失或非法 | 无 `---`、无 name/description、YAML 解析失败 | 错误 | 打开文件编辑、删除 |
| name 非法 | 非 kebab-case 或与目录名不一致 | 错误 | 重命名（建议值） |
| 被同名遮蔽 | 同名技能在更高优先级根存在 | 警告 | 查看生效项、重命名 |
| 目录不可读 | 权限/IO 错误 | 错误 | 复制路径、重试 |
| 正文过大 | 超过建议阈值（提示性） | 提示 | 查看、压缩 |

### 3.4 详情抽屉

- 从右侧滑出，宽 560px，全高；背景 `--dsw-alias-bg-layer-2`，左侧圆角 20px，
  0.5px `border-l2`，`--dsw-elevation-prominent`；遮罩 `rgba(0,0,0,.4)`。
- 头部：来源图标 32×32 + 名称（20px/28px 500，等宽）+ 关闭 28×28；下方 badges 行。
- Tab：概览 / 原文 / 资源 / 诊断（与页面 Tab 同规格，34px 高）。
- 底部固定操作条：`[复制调用命令]`（次按钮）+ `[编辑]`（主按钮）+ `⋯`（停用/删除）。

**概览**：描述、何时使用、来源卡片（来源类型、provider、rank、路径、修改时间）、
调用方式（模型可用 / 仅用户可调用）、**可见于**（列出挂载了该技能的预设，如 `cordis`、`standard`）、
作用域（全局 / 预设名）、相关诊断。全局层技能标注「所有预设共享」。

**原文**：等宽只读预览，带行号；`编辑` 切换为 textarea（等宽 13px/20px，最小 320px 高），
底部出现 `取消 / 保存`；保存前做 frontmatter 校验，失败内联提示。

**资源**：技能目录内文件列表（名称、类型、大小），支持「打开目录」；空目录显示说明。

**诊断**：该技能的校验结果；无问题时显示「未发现问题」。

### 3.5 新建 / 导入模态

- 560px 宽，圆角 20px，`bg-layer-2`，0.5px 描边，`--dsw-elevation-panel`，遮罩同抽屉。
- 标题「新建技能」，右上关闭；内部 Tab：`手写` | `导入`。

**手写表单**

| 字段 | 规格 | 校验 |
| --- | --- | --- |
| 名称 | 等宽输入，占位 `例如: code-review` | 必填、kebab-case、同根不重名、≤64 字符 |
| 描述 | 单行/两行输入，占位 `一句话说明这个技能做什么` | 必填、≤500 字符（模型目录上限） |
| 何时使用 | 选填输入 | ≤200 字符 |
| 正文 | Markdown textarea，等宽，12 行 | 必填 |
| 保存到 | 分段：用户技能 `~/.dsh/skills` / 项目技能 `<repo>/.dsh/skills` | 默认用户 |

底部：`取消` + `创建技能`（主按钮，校验通过才可用）。创建成功 → toast「已创建技能 code-review」，
列表定位并高亮新行，抽屉不自动打开。

**导入**

- 方式 A「粘贴 SKILL.md」：textarea + `解析`；解析成功显示预览卡（名称、描述、frontmatter 摘要），
  失败显示原因（缺 frontmatter、缺 description、name 非法）。
- 方式 B「从目录导入」：输入或选择目录路径（宿主目录选择器可用时优先），
  列出将被复制的文件数；导入时复制到目标根，遇到同名给「覆盖 / 跳过 / 重命名」选择。
- 两种方式共用底部：`取消` + `导入`。

### 3.6 删除确认

- 360px 宽，圆角 14px，标题「删除技能？」
- 正文：`将删除 <path> 及其所有资源文件，无法撤销。`
- 按钮：`取消` + `删除`（危险色 `--dsw-alias-state-error-primary`）。

### 3.7 Toast

- 底部居中，圆角 12px，`bg-layer-3`，13px；成功/失败图标；停留 4s。
- 可逆操作（停用）带 `撤销` 文本按钮，8s 内可撤销。

---

## 4. 核心流程

### 4.1 首次使用（无本地技能）

1. 点击侧栏「技能」→ 页面加载 → 空状态：插图 + 「还没有可管理的技能」。
2. 说明文字：「把 `SKILL.md` 放进技能目录，或在这里新建一个。」
3. 主按钮「新建技能」、次按钮「导入技能」、文字链「查看内置技能」。
4. 若检测到内置技能（插件提供），空状态下方仍展示「内置技能」分组，避免误以为系统没有技能。

### 4.2 新建技能

1. 工具栏「+ 新建技能」→ 模态打开，默认「手写」。
2. 填名称 → 失焦即时校验（非法字符、重名）。
3. 填描述、正文；选择保存位置。
4. 「创建技能」→ 写 `<root>/<name>/SKILL.md` → 成功 toast → 列表刷新（文件 watch 自动生效）。
5. 失败（权限/已存在）→ 模态内错误条，保留输入。

### 4.3 编辑技能

1. 行点击 → 抽屉 → 「原文」→ 「编辑」。
2. 修改正文或 frontmatter → 「保存」→ Host 校验 → 写盘 → toast「已保存」。
3. 校验失败（name 被改坏/缺 description）→ 行内红色提示，不写盘。
4. 保存后列表描述/名称同步更新（watch 失效时由响应触发刷新）。

### 4.4 停用 / 启用

1. 行尾 switch 关闭 → 立即把技能目录移入 `<root>/.disabled/` → toast「已停用 code-review · 撤销」。
2. 列表行进入「已停用」分组，状态点变灰，switch 关闭。
3. 撤销 → 移回原位置 → toast「已恢复」。
4. 内置技能无 switch，尾部显示「内置」；尝试在抽屉中操作时按钮禁用并提示原因。

### 4.5 诊断与修复

1. 进入页面即有横幅「2 个技能未生效」→ 点「查看原因」→ 诊断 tab。
2. 每条问题展示：类型、技能名、路径、原因一句话、修复动作。
3. 点「移除链接」→ 二次确认 → 删除断链 → 问题消失，计数更新。
4. 点「打开文件」→ 宿主打开编辑器/文件所在目录。

### 4.6 查看来源

1. Tab「来源」→ 看到 5 个默认根 + 内置 provider。
2. 「打开目录」→ 文件管理器定位到该根；「复制路径」→ toast「路径已复制」。
3. 根不存在 → 状态灰 + 说明「目录不存在，新建技能时会自动创建」。

### 4.7 会话可见性（v1 只读说明）

- 详情「概览」显示作用域：全局（所有预设）/ 预设 X（可多个，列出「可见于」）。
- 不提供「按会话预览」入口，避免与全局页心智冲突；诊断里给出「同名遮蔽」即可。
- 需要精确到某个会话时，用户可在会话里用 `/name` 验证，或后续版本再加「会话调试」页。

---

## 5. 状态矩阵

| 视图 | Loading | Empty | Error | Partial |
| --- | --- | --- | --- | --- |
| 技能库 | 状态文字「正在读取技能目录…」+ 6 行骨架 | 「还没有可管理的技能」+ 新建/导入 | 错误面板 + 重试 + 打开目录 | 某根不可读：顶部黄色横幅，列表仍显示其他根 |
| 搜索 | 无 | 「没有匹配「xxx」的技能」+ 清除搜索 | 无 | — |
| 来源 | 骨架 3 行 | 不应为空（默认根总是列出） | 单根错误行内标红，其余正常 | 内置 provider 不可用时显示「未加载」 |
| 诊断 | 骨架 2 行 | 「全部正常，没有发现问题」+ 绿色勾 | 错误面板 + 重试 | 部分检查失败：显示已完成的问题 + 提示 |
| 抽屉 | 骨架（标题 + 3 行） | — | 「无法读取该技能」+ 重试/打开文件 | 原文可读、资源不可读时分别降级 |
| 保存/停用 | 按钮 loading（禁用 + 文字「保存中…」） | — | toast 失败 + 保留现场 | — |

**空状态规格**：垂直居中，插图为 120×120 的骨架色块（`--dsw-alias-bg-skeleton`）内嵌 48px 线性图标；
标题 16px/24px 500，说明 13px/20px `label-tertiary`，主按钮 32px，次按钮 ghost。

---

## 6. 文案表

| Key | 中文 | English |
| --- | --- | --- |
| panel.title | 技能 | Skills |
| panel.description | 管理 Agent 可用的技能：查看来源、调用方式，修复未生效的条目。 | Manage the skills available to agents: sources, invocation, and fixes. |
| tab.library | 技能库 | Library |
| tab.sources | 来源 | Sources |
| tab.diagnostics | 诊断 | Diagnostics |
| action.new | 新建技能 | New skill |
| action.import | 导入技能 | Import skill |
| action.refresh | 刷新 | Refresh |
| action.openDir | 打开目录 | Open folder |
| action.copyPath | 复制路径 | Copy path |
| action.edit | 编辑 | Edit |
| action.save | 保存 | Save |
| action.cancel | 取消 | Cancel |
| action.delete | 删除 | Delete |
| action.disable | 停用 | Disable |
| action.enable | 启用 | Enable |
| action.undo | 撤销 | Undo |
| action.copyCommand | 复制调用命令 | Copy command |
| search.placeholder | 搜索技能名称或描述 | Search skills |
| filter.all | 全部 | All |
| filter.user | 用户 | User |
| filter.project | 项目 | Project |
| filter.plugin | 插件内置 | Bundled |
| filter.preset | 预设内置 | Preset |
| sort.name | 名称 | Name |
| sort.source | 来源优先级 | Source priority |
| sort.modified | 最近修改 | Recently modified |
| group.disabled | 已停用 | Disabled |
| group.bundled | 插件内置 | Bundled |
| group.preset | 预设内置 | Preset |
| badge.builtin | 内置 | Built-in |
| badge.model | 模型可用 | Model |
| badge.user | 用户可调用 | User |
| badge.userOnly | 仅用户可调用 | User only |
| banner.issues | {count} 个技能未生效，可能导致 Agent 行为与预期不符。 | {count} skills are not active. |
| banner.viewIssues | 查看原因 | View issues |
| empty.title | 还没有可管理的技能 | No skills yet |
| empty.body | 把 SKILL.md 放进技能目录，或在这里新建一个。 | Add a SKILL.md to a skill folder, or create one here. |
| empty.search | 没有匹配「{query}」的技能 | No skills match "{query}" |
| diagnostics.ok | 全部正常，没有发现问题 | No problems found |
| diagnostics.explain | 格式不合法的技能会被静默跳过，不进入模型目录。这里集中列出原因与修复方式。 | Invalid skills are skipped silently. Fix them here. |
| sources.localNote | 本地技能由 Agent 预设挂载；修改文件后无需重启。 | Local skills are mounted by agent presets and refresh automatically. |
| sources.presetNote | 未挂载本地发现的预设，其 Agent 没有技能。 | Presets without local discovery give their agents no skills. |
| sources.builtinNote | 由插件或 Agent 预设提供，随插件升级更新，不能在此修改。 | Provided by plugins or presets; read-only. |
| confirm.delete.title | 删除技能？ | Delete skill? |
| confirm.delete.body | 将删除 {path} 及其所有资源文件，无法撤销。 | This deletes {path} and all its resources. This cannot be undone. |
| confirm.disable.body | 停用后 Agent 将不再看到该技能，文件会移到 .disabled/，可随时恢复。 | Agents will no longer see this skill. Its files move to .disabled/ and can be restored. |
| toast.created | 已创建技能 {name} | Created skill {name} |
| toast.saved | 已保存 | Saved |
| toast.disabled | 已停用 {name} | Disabled {name} |
| toast.deleted | 已删除 {name} | Deleted {name} |
| toast.copied | 已复制 | Copied |
| error.read | 无法读取技能目录 | Could not read skill folders |
| error.save | 保存失败：{reason} | Save failed: {reason} |

> 实现要求：所有文案走 client locale 服务，`locale/{en,zh}.json` 键集一致、无空值。

---

## 7. 键盘与可访问性

- `/` 聚焦搜索；`Esc` 关闭抽屉/模态（模态优先），焦点回到触发元素。
- 列表：`↑`/`↓` 移动行焦点，`Enter` 打开抽屉，`Space` 切换 switch。
- 抽屉 Tab：`←`/`→` 切换，`Ctrl/Cmd+S` 保存编辑。
- 所有图标按钮有 `aria-label`；switch 用 `role="switch"` + `aria-checked`；
  分段 Tab 用 `role="tablist"` / `role="tab"` / `aria-selected`。
- 焦点环：`--dsw-focus-ring-width: 2px`，颜色 `--dsw-focus-ring-color`。
- 对比度：正文 ≥ 4.5:1；badge 文字使用状态色在 10% 底上，已按 token 设计。

---

## 8. 设计决策与取舍

| 决策 | 选择 | 理由 | 备选与否决原因 |
| --- | --- | --- | --- |
| 入口 | `sidebar.panellist`（顶部面板列表） | 与 Plugins 同级，符合「全局功能」心智；折叠 rail 自动适配 | `sidebar.footer.action` 是底部插件槽，容易被账号菜单挤压；Settings 无插件导航 slot |
| 详情形态 | 右侧抽屉 | 保留列表上下文，可连续浏览多个技能；编辑原文有足够宽度 | 同页详情切换（Plugins 做法）会丢失列表滚动位置；模态太重 |
| 停用语义 | 移到 `<root>/.disabled/` | 可逆、不破坏文件、Provider 的 watcher 会把「移出根」视为删除并刷新目录 | 改 frontmatter 的 `disable-model-invocation` 只影响模型侧，用户仍可 `/name` 调用，语义不完整 |
| 内置技能 | 只读 | 属于插件包内容，改动会被升级覆盖 | 允许编辑会制造「升级即丢失」的陷阱 |
| 作用域 | 展示「可见于哪些预设」，不做会话切换器 | 预设层读取可行（`agentPresets.acquireScope` + `skills.snapshot({scope})`）；按会话调试属于另一个产品 | 顶部加会话选择器会让「全局管理」变成「会话调试器」；且 `sessionSkillCatalog` 只返回 user-invocable 子集 |
| 诊断 | 独立 tab + 顶部横幅 | 静默失败是最大痛点，必须显眼 | 只放在空状态里会被忽略 |
| 排序默认 | 名称 | 与技能目录排序一致，稳定可预期 | 按来源分组已提供层级，组内按名称最易找 |

---

## 9. 边界与未决问题（需实现前确认）

1. **`打开目录` 能力**：`directoryPickerController` 提供 `pick/list/createDirectory`，是否提供「在文件管理器中显示」需确认；未确认时按钮降级为「复制路径」。
2. **作用域枚举**：预设层读取路径已确认可行——`agentPresets.list()` 取预设，`acquireScope(id)` 拿 scope lease，再 `ctx.skills.snapshot({ cwd, scope })` 得到该预设看到的合并目录；用完必须 dispose。v1 建议默认展示「全部预设的并集 + 每个技能的可见预设」，需要真机验证 `acquireScope` 在 root 级插件的可用性与开销。
3. **重名遮蔽检测**：registry 不暴露被遮蔽项；管理插件自行扫描文件系统根并按 rank 计算同层遮蔽，跨层遮蔽（预设层覆盖全局层）通过「各 scope snapshot 的 winning path 对比」推断。内置 provider 的同名冲突只能提示「可能被覆盖」。
4. **写盘安全**：所有路径必须限制在已知扫描根内，禁止 `..` 与符号链接逃逸；删除/停用前 `realpath` 校验。
5. **Windows**：路径分隔符与 `.disabled` 目录名保持兼容；不做仅 POSIX 的假设。
6. **性能**：技能数量预期 < 200；扫描 + frontmatter 解析在 Host 侧做，客户端只拿 JSON；列表 > 100 行时用简单窗口化或分页（v1 可先全量）。
7. **内置 provider 的 provider 名/包名**：`SkillSummary.provider` 有值，但「来自哪个包」需要维护映射；未映射时显示 provider 名。
8. **前端不会自动收到磁盘变更事件**：`dsh-client-ui-skill` 的缓存只在 preset 切换 / 插件管理操作 / 连接重置时清空；管理页必须在写操作后主动刷新，并在页面上提供手动刷新与「文件监听可能延迟 1s」的提示。
9. **minimal 预设没有 skill 行**：该预设下 Agent 完全没有技能；来源页要如实显示「未挂载」，不要在技能库里把预设技能误标为全局可见。

---

## 10. 交付物与下一步

- 交互稿：本文件。
- UI 稿：`docs/plugins/skill-manager/prototypes/skill-manager-ui.html`（可交互静态原型，暗/亮双主题）
  + `docs/plugins/skill-manager/prototypes/screens/*.png`（关键画面截图）。
- 技术方案：`docs/plugins/skill-manager/design/skill-manager-plugin-plan.md`。
- 调研底板：`docs/plugins/skill-manager/research/README.md`（给其他 agent 的一页事实）。
