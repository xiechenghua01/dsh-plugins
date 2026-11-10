# design.md — DSH 插件设计与交互统一规范

> **定位**：本仓库所有 UI 插件（已发布与后续新增）的唯一视觉样式、交互行为与图标设计权威源。
> **权威性**：当各插件自身的 `DESIGN.md`、`CONTRACT.md`、原型稿或交互说明与本文档冲突时，**一律以本文档为准**。插件自身的文档仅用于描述特定业务数据流与功能边界，严禁重复或自创视觉与交互规范。
> **数据基础**：DSH 原生客户端核心包（`dsh-web-frontend`、`dsh-client-ui-plugin-manager`、`dsh-client-ui-settings`、`dsh-client-ui-theme`、`dsh-client-ui-schedule` 等）从 `app.asar` 提取的真实实测 CSS + 三个插件完整开发会话的全部真实返工经验 + 成熟插件生态（VS Code / Figma / Obsidian / Grafana）设计系统调研。
> **版本**：v2.0（2026-11 完善终版）。

---

## 0. 十条铁律（开发前必背）

1. **原生优先（Native Parity First）**：开发任何插件 UI 前，必须先在宿主中量出原生控件（Tab、按钮、列表、弹窗、Tooltip、搜索框）的真实尺寸与 Token。插件必须看起来像 DSH 的原生自带功能，严禁设计成“另一个风格独立的应用”。
2. **零字面色值（Zero Literal Colors）**：全样式只允许使用 `--dsw-*` Token 或基于 Token 的 `color-mix()` 计算色。绝对禁止出现 `#hex`、`rgb()`、`rgba()`、`hsl()` 等字面颜色（唯一例外：§3.9 数据可视化多模型折线系列色）。
3. **字号阶梯联动（Font Scale Sync）**：严禁硬编码字号像素值（如 `font-size: 14px`）。全界面字号必须通过四步机制接入设置项中的 `ui-theme.fontSize`，并基于 `--ds-fs` 进行阶梯计算。
4. **共享控件唯一实现（No Reinventing Wheels）**：按钮、图标按钮、分段/筛选 Tab、输入框、下拉菜单、拆分按钮、弹窗、Tooltip 全仓库仅有一套标准 HTML 结构与 CSS 规则。禁止为单个插件编写私有按钮或自绘气泡。
5. **同一背景表达状态（Shared Background Token）**：控件（Tab、卡片、菜单项、图标按钮）的 `hover` 与 `selected/active` 必须使用同一个背景 Token（`--dsw-alias-interactive-bg-hover`），仅靠文字色从 `tertiary` 提到 `primary` 区分状态；`hover` 时严禁发生位移、缩放、加边框或跳动。
6. **弹窗固定三档、遮罩分场景、全局零发光**：弹窗宽度严格执行确认 `480px`、标准表单 `488px/560px`、大内容 `720px`（设置页内嵌固定 `640px`）；独立页遮罩必须真实变灰（`bg-mask-1`），设置页内嵌遮罩必须透明；全界面浮层 `box-shadow: none`，消除发光光晕。
7. **Tooltip 300ms 纯悬停深色气泡**：统一采用原生 `--dsw-alias-tooltip-bg` 深底白字，悬停 300ms 触发，移出/按下/视图切换立即销毁，单实例复用，禁止点击触发。
8. **图标 24×24 画布 / 描边 1.8 / `currentColor`**：统一采用 24×24 画布与 1.8px 描边（Heroicons / Lucide 统一风格），默认尺寸 16×16；纯图标按钮强制绑定 `aria-label`。
9. **极致克制文案与自解释结构**：界面严禁大段教学文字、副标题说明与 Slogan。辅助信息统一进 Tooltip；危险破坏性操作必须在确认弹窗中写清后果。
10. **真机并排与计算值验收**：验收不得仅凭“看起来差不多”，必须在 DSH 内与原生插件页并排对比，检查 `getComputedStyle()` 是否严格吻合原生 Token 实际计算值。

---

## 1. 为什么必须有这份规范

### 1.1 现状与分叉之痛

本仓库下的三个插件先后经历了三次各自独立的开发与迭代：
- `session-stats`（2026-11-04）：侧栏底部入口，自定卡片与折线图，包含 49 处硬编码字号，未联动全局字号。
- `mcp-manager`（2026-11-04 ~ 11-06）：设置页内嵌入口，历经 11 轮验收，经历了从自绘 1000ms Tooltip、设置页遮罩发灰、弹窗缩放跳动、按钮事件覆盖等反复返工，最终收敛出一套规格。
- `skill-manager`（2026-11-06 ~ 11-10）：侧栏主面板入口，历经两期 PRD 与数轮 UI 重构，深入 DSH `app.asar` 提取原生样式，统一了 Tab、两列卡片、拖拽排序、图标与原生插件页对齐。

这导致仓库内一度存在：
- 三种按钮规格：36px、32px、28px，圆角从 8px、9px 到 12px 不等。
- 三种 Tooltip：深底带发丝线、浅底反色、无 Tooltip。
- 三种弹窗宽度：640px、360px、488px、480px、560px、720px。
- 三个私有字号变量：`--mm-fs`、`--sm-fs`、硬编码 `px`。
- 图标风格与线宽差异：MCP 为 1.8 描边，Skill 初期写成 1.5 描边，后续又通过 commit `0f52dea` 紧急对齐。

### 1.2 来自真实会话的教训

在三个插件的 85 条人类交互指令中，高达 **80% 以上的返工**都集中在“与原生不一致”或“插件之间不统一”：
> “为什么和放在设置中的布局不一样呢？”
> “鼠标悬停在 tab 栏时，需要和 DeepSeek harness 系统的表现保持一致；做到该插件像 DeepSeek harness 原生插件一般。”
> “弹窗的大小需要和已有插件或 DeepSeek harness 的默认弹窗大小一致。”
> “技能页参照插件页来做，现在明显能看到技能页的技能字体偏小，需要和原生页一样的样式显示。”
> “编辑的图标使用这个图标，和 MCP 服务的插件图标保持一致，其他如果有不一致的，则需要保持一致。”
> “图标和文字中间怎么间隔这么大，修复它。”
> “全选后整行被挤到换行，整个页面都跳动了一下，固定位置。”
> “选择 JSON 后整个窗口缩小了一圈漏出上一层，窗口大小必须固定。”

这证明：**如果不确立一份统一、穷举且具有强制力的设计规范，每一个新插件都会重新发明一遍轮子，并踩中完全相同的一批坑。**

---

## 2. 核心设计原则

### 2.1 原生优先（Native Parity）
DSH 本身已经具备经过精细打磨的桌面端 UI 体系（基于深浅两套中性蓝灰调主题、细腻发丝线描边、扁平化无阴影）。
**插件设计的第一原则是“无感知融入”**。开发任何交互控件时，首选方案必须是在原生宿主中寻找已有控件，完全继承其布局、尺寸、圆角与 Token 行为。禁止任何无业务必要的“视觉自嗨”。

### 2.2 单一来源（Single Source of Truth）
全仓库对于每一个基础控件（Button, Input, Tab, Dialog, Tooltip, Dropdown, Toast）**仅允许存在一份标准 CSS 规格**。后续插件禁止另起炉灶或覆盖规则。如需调整，必须先更新本文件并经过全插件回归。

### 2.3 克制沉静（Quiet & Calm）
- **零视觉噪音**：不使用彩色投影、不使用发光光晕（Glow）、不使用复杂渐变底色、不使用不必要的毛玻璃模糊（Blur）。
- **色彩即功能**：界面大面积保持中性色（`bg-base`, `bg-layer-*`, `label-*`）；彩色仅用于表达明确的业务状态（绿色成功/启用、琥珀警告/更新、红色危险/失败、蓝色当前选中/进行中）。
- **文字克制**：去掉界面上冗余的辅助文字与操作说明；通过优秀的布局对齐、强弱文字对比让界面自解释。非关键说明一律隐藏在 Tooltip 中。

### 2.4 状态即语义（State is Semantic）
交互态严格遵循语义 Token 映射：
- `hover` / `selected`：统一为 `--dsw-alias-interactive-bg-hover`。
- `active`（按下态）：统一为 `--dsw-alias-interactive-bg-active`。
- `danger-hover`：统一为 `--dsw-alias-interactive-bg-hover-danger`。
- 严禁通过自由调节透明度（如 `opacity: 0.8`）来粗暴实现 hover。

### 2.5 默认可访问（Accessible by Default）
- 纯图标按钮必须配置 `aria-label`，且与 Tooltip 文本严格一致。
- 键盘导航无死角：支持 `Tab` / `Shift+Tab` 焦点流转、`Esc` 逐层关闭浮层、`Enter` / `Space` 触发动作。
- 焦点反馈必须清晰：通过原生方式（背景提亮或标准 Focus Ring）表达，严禁裸写 `outline: none` 却不提供替代态。

### 2.6 动态参数化（Follow Host Parameters）
字号、主题配色、桌面端窗口标题栏留白（Clearance）等运行环境变量，必须完全监听宿主变化并实时响应。

---

## 3. 设计 Token 系统

### 3.1 核心约束
1. 颜色、圆角、边框、遮罩**必须完全来自 `--dsw-*` 系列 Token**。
2. 绝对禁止硬编码字面色值（`#...` / `rgb(...)` / `hsl(...)`）。
3. 状态色浅底必须通过标准混合函数生成：
   `color-mix(in srgb, var(--dsw-alias-state-xxx-primary) N%, transparent)`。

### 3.2 表面与背景层级（Surfaces & Backgrounds）

| Token | 语义与层级 | 典型使用场景 |
| --- | --- | --- |
| `--dsw-alias-bg-base` | 页面底层（基底） | 独立插件页面的最外层容器底色 |
| `--dsw-alias-bg-layer-1` | 一级表面（凸起层） | 卡片背景、带底按钮背景、设置项容器 |
| `--dsw-alias-bg-layer-2` | 二级表面（浮层/输入） | 弹窗容器、抽屉面板、悬浮卡片 |
| `--dsw-alias-bg-layer-3` | 三级表面（内嵌层） | 输入框内部底色、代码预览块底色 |
| `--dsw-alias-bg-module-platform` | 模块基底（胶囊槽） | 一级分段选项卡（Segmented Tabs）的凹槽背景 |
| `--dsw-alias-bg-mask-1` | 遮罩蒙层（真实变灰） | 独立页面弹窗背后的全屏遮罩（暗色下为半透明黑） |
| `--dsw-static-neutral-bluish-850` | 设置面板基底 | 嵌入在设置页内的弹窗背景（与原生设置窗口同色） |

### 3.3 文本与前景层级（Typography & Foreground）

| Token | 语义层级 | 典型使用场景 |
| --- | --- | --- |
| `--dsw-alias-label-primary` | 主文本（强对比） | 页面标题、卡片主标题、选中状态、关键字段值 |
| `--dsw-alias-label-secondary` | 次要文本（中对比） | 描述文字、弹窗副标题、hover 态下的图标 |
| `--dsw-alias-label-tertiary` | 弱化文本（低对比） | 未选中 Tab、图标按钮默认色、次级说明、占位提示 |
| `--dsw-alias-label-caption` | 辅助标注（极弱） | 时间戳、版本号、等宽文件路径摘要、提示微文案 |
| `--dsw-alias-label-primary-foreground`| 反色文字 | 主行动按钮（Primary Button）内的文字色 |
| `--dsw-static-neutral-bluish-00` | 纯白常态色 | 原生 Tooltip 气泡内的固定文字色 |

### 3.4 边框与发丝线（Borders & Lines）

DSH 原生风格采用极细发丝线（Hairline），在 CSS 中统一书写为 `.5px`，切勿写成粗重突兀的 `1px solid`。

| Token | 描边粗细 | 典型使用场景 |
| --- | --- | --- |
| `--dsw-alias-border-l1` | `.5px` / 极轻 | 列表项行间分割线、页头与内容区分割线 |
| `--dsw-alias-border-l2` | `.5px` / 标准 | 控件外边框、弹窗边缘描边、卡片默认描边 |
| `--dsw-alias-border-l3` | `.5px` / 结构线 | 次级按钮边框、Tab 指示器外边框、网格基线 |
| `--dsw-alias-border-l4` | `.5px` / 凹陷线 | 输入框默认边框、代码块容器边框 |
| `--dsw-alias-border-inverted` | `.5px` / 高亮浮层线 | 弹窗与悬浮菜单外轮廓线（提升浮层辨识度） |

### 3.5 交互与状态 Token（Interactions & States）

| Token | 交互行为 | 表现与用途 |
| --- | --- | --- |
| `--dsw-alias-interactive-bg-hover` | 悬停态（Hover） | 列表项、Tab、卡片、Ghost 按钮 hover 统一底色 |
| `--dsw-alias-interactive-bg-active` | 点击态（Active/Pressed）| 按钮、卡片被按下时的瞬间底色 |
| `--dsw-alias-interactive-bg-hover-danger`| 危险悬停 | 删除按钮、危险菜单项 hover 时的浅红混色底 |
| `--dsw-alias-button-primary-fill` | 主按钮底色 | 页面/弹窗唯一主行动点（Primary Button）常态填充 |
| `--dsw-alias-button-primary-hover`| 主按钮悬停 | 主行动按钮 hover 时的增亮或加深态 |
| `--dsw-alias-button-tool-bar-fill`| 工具栏按钮填充 | 工具栏带底色次级按钮填充 |
| `--dsw-focus-ring-color` | 键盘焦点环色 | 表单输入框、可聚焦元素 focus-visible 焦点轮廓 |
| `--dsw-focus-ring-width` | 焦点环宽度 | 固定为 `2px` |

### 3.6 语义业务状态色（Functional Status）

| 状态语义 | 常态主色 Token | 12% 浅色徽章底色公式 |
| --- | --- | --- |
| 成功 / 正常 / 启用 | `--dsw-alias-state-success-primary` | `color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)` |
| 警告 / 待办 / 可更新 | `--dsw-alias-state-warn-primary` | `color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent)` |
| 错误 / 失败 / 停用 / 危险 | `--dsw-alias-state-error-primary` | `color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)` |
| 进行中 / 处理中 / 信息 | `--dsw-alias-state-business-primary`| `color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent)` |

### 3.7 圆角体系（Border Radius）

原生实测精确值映射如下：
- `--dsw-radius-xs` (4px)：极小徽章、快捷键键帽（Kbd）、内嵌指示标签。
- `--dsw-radius-sm` (8px)：图标按钮（IconButton）、Tooltip 气泡、紧凑型次级按钮、菜单项。
- `--dsw-radius-md` (12px)：标准按钮（Button）、输入框（Input）、分段 Tab 滑块、下拉菜单容器。
- `--dsw-radius-lg` (16px)：分段 Tab 容器、可点击卡片（Card）、列表大容器。
- `--dsw-radius-xl` (20px)：确认类型小型弹窗（Confirm Dialog）。
- `--dsw-radius-panel` (28px)：标准表单弹窗、大型预览编辑弹窗。

### 3.8 全局阴影铁律：零发光（Box-Shadow: None）
宿主 DSH 在基础样式中对 `[role="dialog"]` 注入了外发光阴影（白色半透明光晕 + 漫反射模糊）。在深色桌面端环境下，这会导致弹窗边缘产生极其廉价的发光感，已在 MCP 会话与 Skills 会话中被多次判定为缺陷。
**强制要求**：插件内的所有弹窗、Tooltip、下拉菜单、浮层容器，必须通过 CSS 及行内样式显式声明：
```css
box-shadow: none !important;
```
完全依赖 `.5px solid var(--dsw-alias-border-*)` 发丝线完成视觉分层。

### 3.9 数据可视化系列色（唯一合法例外）
多模型对比折线图、用量趋势图等图表数据系列，因宿主 Token 数量无法支持 6~8 种高对比度辨识色，允许在插件根节点定义专用系列变量（如 `--ss-series-1..8`）。
**约束**：必须严格局限在 SVG 图表曲线与数据柱状图上，绝对禁止将系列色用于按钮、边框、常规文本或卡片底色。

### 3.10 统一间距刻度表（Spacing Scale）
在会话中，同一个元素的定位曾因缺乏刻度被反复微调（`20px -> 3px -> 5px`）。所有插件开发必须强制收敛至以下标准刻度，严禁随意书写 `3px`, `5px`, `7px`, `9px`, `13px`, `17px` 等零散数值：

| 刻度值 | 语义与场景 |
| --- | --- |
| `2px` | 极小微调（状态点与文字微距、分段 Tab 容器内边距） |
| `4px` | 紧凑间距（分段 Tab 容器 padding、下拉菜单内边距、按钮文字内 gap） |
| `6px` | 按钮内图标与文字的标准间隙 |
| `8px` | 紧凑控件间距、列表项内图标与文本的间距、菜单项行间距、工具栏图标间距 |
| `12px` | 标准表单控件组内间距、弹窗头部各操作按钮间距 |
| `16px` | 卡片内边距（Padding）、列表项内边距、表单项垂直间距 |
| `20px` | 页面区块（Section）垂直间距、弹窗内容区与边缘内边距 |
| `24px` | 页面大模块间距、弹窗头部/底部标准 Padding |
| `32px` | 页面主标题区与内容区的垂直间距 |
| `48px` | 页面底部防止遮挡的滚动安全留白 |

### 3.11 绝对禁用清单
- 严禁使用 `--dsw-hovercard-bg`（宿主主题未声明，运行时计算为空字符串）。
- 严禁出现任何未经 Token 化的原生 CSS 渐变（如 `linear-gradient(...)`）。
- 严禁使用 `backdrop-filter: blur(...)`，避免跨平台 GPU 渲染性能开销与花屏。
- 严禁在控件 hover 时改变元素的高宽尺寸（`width`, `height`, `padding`, `border-width`），避免引起界面抖动。

---

## 4. 字号与字体体系

### 4.1 核心机制与真相
1. DSH 的“设置 → 通用设置 → 字号大小”写入的是 `ui-theme` 插件的 Cordis 配置段（`fontSize: 16`），**它绝不是 CSS 全局继承变量**。
2. 宿主的 `--dsh-content-font-size` 仅作用于主会话气泡区域，插件所在的设置面板、侧栏面板、独立主视图等 DOM 祖先链上完全读不到该变量。
3. 插件无法靠 CSS 继承字号，必须自行从宿主配置中提取。

### 4.2 四步标准接入链路

```
[Host 侧] 正则读取 profile/home patch 中的 ui-theme.fontSize
   ↓
[RPC State] 将 fontSize 数值放入插件状态 payload 返回给前端
   ↓
[Client 侧] 在插件根节点注入 style: { '--ds-fs': fontSize + 'px' }
   ↓
[CSS 样式层] 所有字号统一写为基于 var(--ds-fs) 的 calc() 阶梯
```

#### ① Host 侧正则实现（严禁整文件 YAML 解析）
由于用户的配置文件中可能包含 `{{SECRET_xxx}}` 等特殊占位语法，使用第三方解析器全量解析 YAML 会导致解析异常。必须使用稳健的文本正则提取：
```js
async function resolveThemeFontSize(paths) {
  for (const file of [paths.profilePatch, paths.homePatch]) {
    const raw = await readTextFile(file).catch(() => '')
    if (!raw.trim()) continue
    const match = /(?:^|\n)\s*-\s+id:\s*['"]?ui-theme['"]?[\s\S]{0,800}?\bfontSize:\s*(\d{1,2})/u.exec(raw)
    if (match !== null) {
      const size = Number(match[1])
      if (Number.isFinite(size) && size >= 10 && size <= 40) return Math.round(size)
    }
  }
  return 14 // 宿主默认基准
}
```

#### ② 客户端根节点注入
```js
h('div', {
  className: 'ds-root',
  'data-plugin': 'my-plugin-slug',
  style: { '--ds-fs': (fontSize || 14) + 'px' },
}, ...)
```

### 4.3 权威六档字号阶梯表

| 档位 | CSS 阶梯计算公式 | 基准 14px 时 | 适用场景 |
| --- | --- | --- | --- |
| **页面主标题** | `calc(var(--ds-fs) + 6px)` 或 `20px` | 20px | 页面独立顶栏主标题（原生 `pageTitle` 实测值） |
| **区块标题** | `calc(var(--ds-fs) + 2px)` | 16px | 卡片大标题、向导页标题 |
| **弹窗标题** | `calc(var(--ds-fs) + 1px)` | 15px | 弹窗头部标题、抽屉头部标题 |
| **页面正文** | `var(--ds-fs)` | 14px | 页面正文、标准按钮（md）、一级 Tab 标签、表单 Label |
| **次要信息** | `calc(var(--ds-fs) - 1px)` | 13px | 列表副标题、输入框文字、下拉菜单项、代码块正文 |
| **辅助说明** | `calc(var(--ds-fs) - 2px)` | 12px | 状态徽章、时间戳、摘要信息、小按钮（sm）、**Tooltip** |
| **极弱标注** | `calc(var(--ds-fs) - 3px)` | 11px | 图表坐标轴 Label、版本次级弱化文字 |

> **关键教训**：在 `skill-manager` 早期版本中，页面正文错误地书写成了 `calc(var(--sm-fs) - 1px)`（13px），用户在多轮会话中指出“技能页字体明显偏小，请和原生页一致”。**页面正文必须直接使用 `var(--ds-fs)`**，切勿默认再减 1px。

### 4.4 Body 挂载浮层的字号穿透补偿
由于 Tooltip、Toast、下拉菜单（Menu）通常需要挂载在 `document.body` 根节点上（避免被祖先容器的 `overflow: hidden` 裁剪），导致其脱离了 `.ds-root` 容器，无法读取 CSS 变量 `--ds-fs`。
**必须执行穿透补丁**：在向 body 添加节点或更新位置时，显式将根容器上的 `--ds-fs` 同步至该浮层节点：
```js
function syncFloatingFontSize(node) {
  const root = document.querySelector('.ds-root')
  if (root) {
    const fs = getComputedStyle(root).getPropertyValue('--ds-fs').trim()
    if (fs) node.style.setProperty('--ds-fs', fs)
  }
}
```

### 4.5 字体栈
```css
font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif);
```
对于代码、命令行、URL、JSON 键名等，使用系统等宽字体栈：
```css
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

---

## 5. 页面骨架与容器规范

### 5.1 插件入口场景与决策树

| 挂载场景 | 宿主 Slot 注册点 | 页面宽度与骨架 | 典型插件 |
| --- | --- | --- | --- |
| **独立主功能面板** | `main` + `sidebar.panellist` | 960px 居中内容列，支持大视野与多 Tab | `skill-manager` |
| **设置页功能扩展** | `settings.section` | 640px 居中内容列，嵌入原生设置对话框内 | `mcp-manager` |
| **全局辅助工具/入口** | `sidebar.footer.action` | 侧栏底部小图标入口，点击展开专用弹窗或切换主区 | `session-stats` |

#### 关键交互约束
1. `main` 的 `key` 与 `sidebar.panellist` 的 `id` **必须完全相同**，否则宿主激活态与点击联动会失效。
2. **入口二次点击 Toggle 行为**：当面板处于当前打开状态时，用户再次点击侧栏对应图标，必须支持关闭该面板（恢复至先前会话或默认状态），并同步更新 `aria-pressed` 状态。
3. **入口位置不可轻易破坏内层布局**：MCP 会话曾尝试将入口从设置页搬迁至侧栏，引起了弹窗尺寸、层级遮罩与交互行为的严重混乱。入口变更时，必须严格执行 §14 重新验收。

### 5.2 侧边栏入口图标槽机制（Sidebar Glyph Slot）
宿主在 `sidebar.panellist` 中渲染的真实结构为：
```html
<button class="panelRow">
  <span class="panelGlyph">
    <div data-slot="sidebar.panellist">
      <!-- 插件注入位置 -->
    </div>
  </span>
  <span class="panelTitle">技能管理</span>
</button>
```
- **禁止在槽内渲染 `<button>`**：插件在槽内**只允许渲染纯 SVG 图标（16×16）**。嵌套 button 会导致 HTML 结构非法、图标被撑大至 18px 错位、以及点击文本区域事件被宿主吞噬。
- **整行点击接管机制**：
  ```js
  useEffect(() => {
    const row = glyphRef.current?.closest('button.panelRow')
    if (!row) return
    const handleRowClick = (e) => {
      // 若点击来源于插件弹出的 dialog，必须完全放行
      if (e.target?.closest?.('[role="dialog"]')) return
      e.preventDefault()
      e.stopPropagation()
      togglePanel()
    }
    row.addEventListener('click', handleRowClick, true) // 捕获阶段拦截
    return () => row.removeEventListener('click', handleRowClick, true)
  }, [])
  ```

### 5.3 独立页面骨架规格（Independent Page）
针对在主视口渲染的独立插件面板（如 `skill-manager`, 原生 `plugin-manager`）：

```css
.ds-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: var(--ds-fs);
  overflow: hidden;
}

/* 顶部安全间距：适配 macOS 沉浸式透明标题栏 */
.ds-page-head-wrap {
  flex: none;
  width: 100%;
  padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px));
  padding-left: clamp(20px, 4vw, 48px);
  padding-right: clamp(20px, 4vw, 48px);
}

.ds-page-head {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: nowrap;
}

.ds-page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  color: var(--dsw-alias-label-primary);
}

.ds-page-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  padding: 16px clamp(20px, 4vw, 48px) 48px;
}

.ds-content-container {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
}
```

> **注意**：切勿将顶部留白硬编码为 `76px` 或 `82px`（此为 macOS 窗口特定高度计算出来的局部偶合值），必须使用 `calc(28px + var(--dsh-frame-top-clearance, 0px))` 响应式适配不同操作系统。

### 5.4 嵌入设置页骨架规格（Settings Section）
针对渲染在 DSH 设置窗口右侧区域的插件（如 `mcp-manager`）：
```css
.ds-settings-root {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px 48px;
  display: flex;
  flex-direction: column;
}

.ds-settings-column {
  width: 100%;
  max-width: 640px; /* 原生设置项最大宽度对齐 */
  margin: 0 auto;
}
```

---

## 6. 标准组件规格与实现

所有通用组件样式均使用统一的 `.ds-*` 前缀。插件内部专用业务样式可使用 `<prefix>-` 前缀（如 `.sm-`、`.mm-`），但在容器内引用的基础组件必须完全复用下列标准规则。

### 6.1 按钮（Button）

原生 DSH 具备明确的按钮尺寸梯队，插件必须严格对齐三档高度：
- **大号（36px）**：弹窗底部主要按钮、表单提交主按钮。
- **中号/工具栏按钮（32px）**：页面顶栏工具条行动点（“+ 新建”、“刷新”、“测试全部”）、卡片主按钮。
- **小号（28px）**：表格/列表行内操作按钮、紧凑型辅助按钮。

```css
.ds-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: .5px solid transparent;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  white-space: nowrap;
  outline: none;
  user-select: none;
  transition: background .12s ease, border-color .12s ease, opacity .12s ease;
}

.ds-btn:disabled {
  cursor: not-allowed;
  opacity: .4;
  pointer-events: none;
}

/* 尺寸档位 */
.ds-btn-lg {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--dsw-radius-md);
  font-size: var(--ds-fs);
  line-height: 22px;
}

.ds-btn-md, .ds-btn-toolbar {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-md);
  font-size: calc(var(--ds-fs) - 1px);
  line-height: 20px;
}

.ds-btn-sm {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-sm);
  font-size: calc(var(--ds-fs) - 2px);
  line-height: 18px;
}

/* 变体风格 */
/* 1. 主行动点（Primary）：高对比浅白底黑字（深色模式下） */
.ds-btn-primary {
  background: var(--dsw-alias-button-primary-fill);
  border-color: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}
.ds-btn-primary:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover);
  border-color: var(--dsw-alias-button-primary-hover);
}

/* 2. 次要描边按钮（Secondary / Outline） */
.ds-btn-secondary {
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
}
.ds-btn-secondary:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l2);
}

/* 3. 幽灵透明按钮（Ghost） */
.ds-btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--dsw-alias-label-secondary);
}
.ds-btn-ghost:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

/* 4. 危险破坏性按钮（Danger） */
.ds-btn-danger {
  background: var(--dsw-alias-state-error-primary);
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-label-primary-foreground);
}
.ds-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, transparent);
}
```

### 6.2 图标按钮（IconButton）
用于页头工具栏操作、行内快捷操作（编辑、复制、删除、关闭）。
- **默认尺寸**：外框 `32×32`（工具栏）或 `28×28`（行内紧凑），内部 SVG 图标严格为 `16×16`。
- **状态规则**：默认颜色为弱化色 `--dsw-alias-label-tertiary`（或次级色），悬停时背景变为 `--dsw-alias-bg-layer-1`（或 `interactive-bg-hover`），图标颜色提亮为 `--dsw-alias-label-primary`。

```css
.ds-icon-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  outline: none;
  flex-shrink: 0;
  transition: background .12s ease, color .12s ease;
}

.ds-icon-btn-sm {
  width: 28px;
  height: 28px;
}

.ds-icon-btn:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

.ds-icon-btn:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}

.ds-icon-btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

/* 危险图标按钮（删除等） */
.ds-icon-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 15%, transparent);
  color: var(--dsw-alias-state-error-primary);
}
```

### 6.3 选项卡（Tabs）体系

#### ① 一级分段选项卡（Segmented Tabs）
用于主页面视图切换（例如：已安装技能 / 技能市场）。
```css
.ds-segmented-tabs {
  position: relative;
  display: inline-grid;
  grid-auto-flow: column;
  padding: 4px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-module-platform);
  gap: 2px;
  user-select: none;
}

.ds-segmented-tab {
  position: relative;
  z-index: 1;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: var(--dsw-radius-md);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--ds-fs);
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: color .15s ease;
}

.ds-segmented-tab:hover {
  color: var(--dsw-alias-label-primary);
}

.ds-segmented-tab[aria-selected="true"] {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}

/* 激活滑动指示块 */
.ds-segmented-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3);
  border: .5px solid var(--dsw-alias-border-l3);
  box-shadow: none;
  pointer-events: none;
  transition: transform .18s ease, width .18s ease;
}
```

#### ② 二级胶囊筛选选项卡（Pill Filter Tabs）
用于列表分类过滤（例如：全部 / 本地 / 共享 / 内置）。
> **核心规范**：hover 与 selected 必须使用**同一个背景 Token**（`--dsw-alias-interactive-bg-hover`），选中状态只通过文字色提亮（`tertiary -> primary`）表达！
```css
.ds-filter-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ds-filter-tab {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 14px; /* 全圆角 pill */
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: var(--ds-fs);
  line-height: 22px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color .12s ease, background .12s ease;
}

.ds-filter-tab:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
}

.ds-filter-tab[aria-selected="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}
```

### 6.4 复合组件：拆分按钮（Split Button）
用于兼具“主要直接动作”与“下拉次选动作”的高级工具栏操作（如：`[ + 新建技能 | ▾ ]`，点击左侧直接新建，点击右侧展开导入菜单）。
```css
.ds-split-btn {
  display: inline-flex;
  align-items: center;
  flex: none;
}

.ds-split-btn > .ds-btn-main {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}

.ds-split-btn > .ds-split-caret {
  width: 28px;
  height: 32px;
  padding: 0;
  border: none;
  border-top-right-radius: var(--dsw-radius-md);
  border-bottom-right-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
  box-shadow: inset 1px 0 0 var(--dsw-alias-border-l1);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ds-split-btn > .ds-split-caret:hover {
  background: var(--dsw-alias-button-primary-hover);
}
```

### 6.5 复合组件：下拉与上下文菜单（Dropdown Menu）
所有下拉操作、卡片三点菜单（More）、选择菜单，统一使用此浮动菜单规格。
```css
/* 全屏透明点击拦截层，用于点击外部关闭 */
.ds-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1599;
  background: transparent;
}

.ds-menu {
  position: fixed;
  z-index: 1600;
  min-width: 136px;
  max-width: 260px;
  padding: 4px;
  border-radius: var(--dsw-radius-md);
  border: .5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-2));
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ds-menu-item {
  height: 30px;
  padding: 0 8px;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  text-align: left;
  user-select: none;
}

.ds-menu-item:hover:not(:disabled),
.ds-menu-item:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover);
}

.ds-menu-item:disabled {
  opacity: .4;
  cursor: not-allowed;
}

/* 图标容器固定 16px，文本占满剩余宽度并截断，保持整行可点击且图标文字永不分离 */
.ds-menu-item .ds-menu-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-secondary);
}

.ds-menu-item > span:not(.ds-menu-icon) {
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 危险操作菜单项 */
.ds-menu-item-danger {
  color: var(--dsw-alias-state-error-primary);
}
.ds-menu-item-danger .ds-menu-icon {
  color: var(--dsw-alias-state-error-primary);
}
.ds-menu-item-danger:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover-danger);
}

.ds-menu-separator {
  height: 1px;
  margin: 4px 6px;
  background: var(--dsw-alias-border-l1);
  flex-shrink: 0;
}
```

### 6.6 复合交互：列表拖拽排序（Drag & Drop Reordering）
用于多源管理、插件执行顺序调整。禁止使用繁琐的上下箭头，必须使用平滑拖拽 + 键盘辅助。
```css
.ds-sortable-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--dsw-radius-md);
  position: relative;
  user-select: none;
}

.ds-sortable-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.ds-sortable-row.is-dragging {
  opacity: 0.45;
}

.ds-drag-handle {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--dsw-alias-label-tertiary);
}

.ds-drag-handle:active,
.ds-sortable-row.is-dragging .ds-drag-handle {
  cursor: grabbing;
}

/* 插入蓝色指示线 */
.ds-sortable-row.is-drop-before::before,
.ds-sortable-row.is-drop-after::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  pointer-events: none;
}

.ds-sortable-row.is-drop-before::before {
  top: -2px;
}

.ds-sortable-row.is-drop-after::after {
  bottom: -2px;
}
```
> **可访问性要求**：必须监听行的 `onKeyDown` 事件。当聚焦手柄时，支持 `Alt + ArrowUp` 与 `Alt + ArrowDown` 执行无障碍交换排序。

### 6.7 弹窗（Dialog）权威规范

#### 真实宽度四档标准（来源：DSH 客户端各模块实测数据）：
1. **确认小型弹窗（Confirm）**：`width: min(480px, 100vw - 32px)`，圆角 `20px`（`--dsw-radius-xl`）。
   - 场景：删除确认、重置确认、不可逆覆盖提示。
2. **标准表单弹窗（Form / Wizard）**：`width: min(488px, 100vw - 32px)` 或 `min(560px, 100vw - 32px)`，圆角 `28px`（`--dsw-radius-panel`）。
   - 场景：新建配置、编辑表单、安装引导。
3. **大内容与代码弹窗（Large / Code / Multi-source）**：`width: min(720px, 100vw - 32px)`，圆角 `28px`（`--dsw-radius-panel`）。
   - 场景：多源管理、JSON 预览与大文本编辑、多工具权限授权。
4. **设置页内嵌弹窗（Settings Embedded）**：`width: min(640px, 100vw - 32px)`，圆角 `16px`。
   - 场景：嵌在设置面板右侧区域的弹窗，宽度与设置区完全贴合。

```css
/* 遮罩层 */
.ds-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: none;
}

/* 场景 A：独立页面（main 槽）遮罩必须真实变灰 */
.ds-dialog-backdrop-dimmed {
  background: var(--dsw-alias-bg-mask-1);
}

/* 场景 B：设置页内嵌弹窗，遮罩必须保持透明（仅拦截事件），禁止变灰 */
.ds-dialog-backdrop-transparent {
  background: transparent;
}

.ds-dialog {
  display: flex;
  flex-direction: column;
  max-height: min(720px, 100vh - 96px);
  background: var(--dsw-alias-bg-layer-2);
  border: .5px solid var(--dsw-alias-border-inverted);
  box-shadow: none !important; /* 强制覆盖宿主光晕 */
  overflow: hidden;
  font-size: var(--ds-fs);
}

/* 设置页专用背景匹配 */
.ds-dialog-settings {
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
}

.ds-dialog-head {
  padding: 18px 24px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: .5px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

.ds-dialog-title {
  margin: 0;
  font-size: calc(var(--ds-fs) + 1px);
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

.ds-dialog-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0; /* 短视口下允许收缩，防止撑破视口导致底部按钮丢失 */
}

.ds-dialog-foot {
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  border-top: .5px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}
```

### 6.8 气泡提示（Tooltip）

原生实测规格对齐（宿主 `_bubble_44yfq_1` 实测还原）：
- **外观**：深色气泡底色（`--dsw-alias-tooltip-bg`），固定纯白文本（`--dsw-static-neutral-bluish-00`），无外边框，零阴影，圆角 `8px`（`--dsw-radius-sm`）。
- **字号**：`calc(var(--ds-fs) - 2px)`（12px），比正文小 2px，保证视觉层级不抢夺主体。
- **触发时钟**：严格 **300ms** 悬停延迟显示；移出、按下鼠标、窗口滚动立即隐藏（0ms）。
- **仅限悬停**：严禁绑定点击触发（点击往往承载业务主行为，叠加提示会造成事件冲突）。
- **DOM 卸载保护（防孤儿残留）**：在 Tab 切换、路由变更、打开/关闭弹窗时，必须主动派发全局隐藏指令，防止被卸载节点的 Tooltip 永远留在 body 上。

```css
.ds-tooltip {
  position: fixed;
  z-index: 2000;
  max-width: min(40vw, 290px);
  padding: 4px 8px;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-tooltip-bg);
  color: var(--dsw-static-neutral-bluish-00);
  font-size: calc(var(--ds-fs) - 2px);
  line-height: 18px;
  box-shadow: none !important;
  pointer-events: none;
  white-space: pre-line;
  overflow-wrap: break-word;
  opacity: 0;
  transform: translateY(2px);
  transition: opacity .12s ease, transform .12s ease;
}

.ds-tooltip-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 6.9 输入框与搜索框（Inputs & Search）
```css
.ds-input {
  box-sizing: border-box;
  height: 34px;
  padding: 0 12px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: calc(var(--ds-fs) - 1px);
  line-height: 1.5;
  outline: none;
  transition: border-color .15s ease;
}

.ds-input:focus-visible {
  border-color: var(--dsw-alias-state-business-primary);
}

.ds-input::placeholder {
  color: var(--dsw-alias-label-caption);
}

/* 带有前后缀图标的搜索输入框容器 */
.ds-search-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 240px;
}

.ds-search-wrap .ds-search-icon {
  position: absolute;
  left: 10px;
  width: 16px;
  height: 16px;
  color: var(--dsw-alias-label-tertiary);
  pointer-events: none;
}

.ds-search-wrap .ds-input {
  width: 100%;
  padding-left: 32px;
  padding-right: 28px;
}
```

### 6.10 浮动轻量通知（Toast）
```css
.ds-toast-host {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 2100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.ds-toast {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 8px 14px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3);
  border: .5px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
  box-shadow: none;
  pointer-events: auto;
  animation: ds-toast-enter .15s ease;
}

.ds-toast-ok { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent); }
.ds-toast-error { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent); }

@keyframes ds-toast-enter {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 7. 图标规范与标准字典

### 7.1 画布基准与统一描边
全仓库图标规范严格执行：
- **画布**：统一 `viewBox="0 0 24 24"`。
- **描边宽度**：统一声明 `strokeWidth={1.8}`，`fill="none"`，`stroke="currentColor"`，`strokeLinecap="round"`，`strokeLinejoin="round"`。
  > **为什么是 1.8 而不是 1.5 或 2.0？**
  > 16px 实际渲染尺寸下，1.5px 在深色桌面端中极易发虚且对比度过弱；2.0px 在较复杂图形内部会出现拥挤粘连。1.8 是经过 MCP 与 Skills 两大插件多轮真实视觉调优后达成的最佳观感标准（已在 commit `0f52dea` 落地）。
- 装饰性图标一律打上 `'aria-hidden': 'true'` 与 `focusable: 'false'`。

### 7.2 尺寸档位
全界面仅允许使用两档图标尺寸：
- **16×16（标准默认）**：按钮内图标、列表行内图标、工具栏纯图标按钮、菜单项图标。
- **20×20（大展示态）**：空状态插图、大卡片标题前缀引导图标。
- 严禁出现 12px、14px、15px、18px 等任意乱值。

### 7.3 标准常用图标字典（即拷即用）
为避免各插件重复手写产生图形差异，本仓库收录权威 Path 字典（基于 Heroicons / Lucide 精确对齐）：

```js
const ICON_PATHS = {
  // 1. 基础控制
  plus: 'M12 4v16m8-8H4',
  close: 'M6 18L18 6M6 6l12 12',
  check: 'M5 13l4 4L19 7',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',

  // 2. 编辑与维护
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  power: 'M12 3v9m6.364-5.364a9 9 0 11-12.728 0',
  zap: 'M13 10V3L4 14h7v7l9-11h-7z',

  // 3. 方向与导航
  chevronDown: 'M19 9l-7 7-7-7',
  chevronRight: 'M9 5l7 7-7 7',
  arrowUp: 'M12 19V5m0 0-5 5m5-5 5 5',
  external: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',

  // 4. 辅助手柄与提示
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  help: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
}
```

```js
function SvgIcon({ name, size = 16, className = '' }) {
  const d = ICON_PATHS[name]
  if (!d) return null
  return h('svg', {
    className: 'ds-icon ' + className,
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  }, h('path', { d }))
}
```

### 7.4 严禁图标与文字两端分离
在 session-54e21ba6 中，菜单项曾因父级被错误设置了 `justify-content: space-between`，导致左侧小图标与右侧文本被强行推到行两端，视觉严重破碎。
**铁律**：图标与文本必须作为左对齐整体紧密绑定：
```css
.ds-item-with-icon {
  display: flex;
  align-items: center;
  justify-content: flex-start; /* 必须左对齐 */
  gap: 8px; /* 间隙固定为 6~8px */
}
```

### 7.5 插件市场发现页图标（icon.svg）
各插件根目录下的 `icon.svg` 供 DSH Discover 插件市场渲染，必须遵守统一色板契约：
- **画布**：`viewBox="0 0 64 64"`。
- **底板**：`<rect x="2" y="2" width="60" height="60" rx="14" fill="#102a43"/>`。
- **配色层级**：
  - 底板基色：深沉科技蓝 `#102a43`（或 `#0f2f4a`）。
  - 主线条：浅青蓝 `#7fd1ff` 或 `#8fd3ff`，`stroke-width="3"`。
  - 强调块：实心青蓝 `#4fb3ff`。
  - 高光细节：微光线 `#9ee6ff`。
- 严禁包含位图图像、文字 Slogan，保持严整矢量线框风格。

---

## 8. 交互机制与数据状态防线

### 8.1 完整交互四态
所有可交互节点必须声明完整四态：
1. **Normal（常态）**：清晰层级，避免无意义强调。
2. **Hover（悬停态）**：背景施加 `--dsw-alias-interactive-bg-hover`，元素几何尺寸不得跳变。
3. **Active（按下态）**：背景施加 `--dsw-alias-interactive-bg-active`。
4. **Focus-visible（键盘聚焦）**：
   - 列表项与纯操作按钮：使用背景提亮表达聚焦，不加彩色外圈。
   - 输入框与开关：使用 `outline: 2px solid var(--dsw-focus-ring-color)`。
   - 严禁任何粗暴的 `outline: none` 清理而不加替代反馈。

### 8.2 Clean Config 净化原则（写入防线）
在 MCP manager 等配置型插件中，若将空白项或默认值全部写回文件，会导致配置文件极度膨胀且污染版本控制。必须严格执行 Clean Config：
- **空值必剔除**：未填写的选填字符串（`""`）、空对象（`{}`）、空数组（`[]`）严禁写入持久化配置文件。
- **默认值必剔除**：若参数等于默认值（如 `timeout === 60000`），严禁写入。
- **唯一的合法例外**：命令行参数数组 `args: ['']` 中的空字符串是合法的占位参数，必须原样保留。

### 8.3 文本域编辑脏标记保护（Dirty State Guard）
类似“每行一个参数”的多行参数文本框（Textarea）：
- **严禁在 `onChange` 过程中实时将文本解析为数组再反向更新 state**。否则用户键入回车换行时，空行会被立即过滤，导致用户永远无法换行或输入空参。
- **正确做法**：内部保留独立的 string 文本编辑态与 `isDirty` 标记。仅在文本框 `onBlur`、切换 Tab 或最终点击保存提交时，才执行格式解析。

### 8.4 事件冒泡与 React 合成事件防线
- **弹窗内点击放行**：当在侧栏或列表行上通过原生 capture 监听拦截点击打开弹窗时，若点击事件源在弹窗内容器内部（`.closest('[role="dialog"]')`），**必须直接 return 放行**！严禁无差别调用 `stopPropagation()`，否则会阻断 React 合成事件派发，导致弹窗内部所有按钮全部失灵无法点击。
- **多层弹窗 Esc 分层关闭**：全局维护弹窗栈数组。监听 `keydown` 的 `Esc` 键时，捕获阶段仅弹出并关闭最顶层弹窗，并调用 `e.stopImmediatePropagation()`。

---

## 9. 界面文案与多语言（Locale）

### 9.1 文案克制与自解释原则
- 遵循“设计为主，文字为辅”。如果界面布局与控件意图清晰，不要添加“请在此处进行配置”、“该模块用于显示列表”等啰嗦提示。
- 不使用口语化、随意性的表达（如“搞定啦”、“点我试试”），保持专业、精简的工业化系统调性。
- 按钮统一采用行动动词短语（“新增服务”、“测试全部”、“保存”、“检查更新”）。

### 9.2 多语言键值双向镜像约束
`locale/en.json` 与 `locale/zh.json` 必须受 CI 严格校验：
1. 中英文两套 JSON 键集必须 100% 相同。
2. 任何键对应的值严禁为空字符串。
3. 代码中所有 `t('some.key')` 引用的键必须在字典中显式定义，严禁运行时动态拼接导致静态检查穿透。

---

## 10. 工程约束与代码结构

### 10.1 纯 React 运行边界
插件客户端半边只允许通过 `require('react')` 获取 React 运行时，严禁 import `@deepseek-ai/*` 或任何第三方 NPM UI 依赖库。全量界面基于原生 DOM + CSS 变量完成构建。

### 10.2 样式作用域隔离
为了防止多插件共存时相互污染，所有插件样式必须完全封装在自身根容器下：
```css
/* 严禁任何全局裸选择器，如 button { ... } 或 :focus { ... } */
[data-plugin="my-plugin-slug"] .ds-btn { ... }
[data-plugin="my-plugin-slug"] .ds-input { ... }
```

### 10.3 静态校验清单（`pnpm test`）
仓库 CI 强制拦截以下违规行为：
- 源码中严禁包含任何形如 `/Users/...` 或 `/home/...` 的本机绝对路径。
- 严禁在浏览器端代码中引用未声明的外部包。
- 字典键集对称性与引用校验必须通过。

---

## 11. 三大历史会话真实经验全景

### 11.1 MCP 服务会话（`session-cf63abe4-b957-47df-b031-b7a2bbc08946`）
- **返工点 1：设置页弹窗背景变灰**。内嵌在设置窗口里的弹窗遮罩若变灰，会把上层设置页涂黑。结论：设置页内嵌弹窗遮罩必须透明。
- **返工点 2：模式切换时窗口跳变**。从表单切换到 JSON 模式时弹窗宽度收缩漏底。结论：弹窗宽度必须锁定。
- **返工点 3：Tooltip 延迟太长**。原设 1000ms 用户反馈以为卡死。结论：统一缩短为 300ms 纯悬停。
- **返工点 4：弹窗发光光晕**。宿主 `[role=dialog]` 默认发光投影遭差评。结论：全量 `box-shadow: none !important`。
- **返工点 5：字号无法联动**。发现宿主字号保存在 `ui-theme` 中。沉淀了 Host 正则读取四步阶梯法。

### 11.2 Skills 管理会话（`session-54e21ba6-b876-4db3-bf9a-facc985c7ec7`）
- **返工点 1：Tab 悬停表现不一致**。原实现自定了选中深色与高对比背景。深入 asar 后发现原生 hover 与 active 同背景，改回后完美融入。
- **返工点 2：图标文字两端分离**。父级误用 `space-between`。结论：图标文字必须左对齐成组。
- **返工点 3：弹窗遮罩透明**。在独立页面上透明遮罩让用户误以为界面卡住。结论：独立页面遮罩必须使用 `bg-mask-1` 变灰。
- **返工点 4：Tooltip 卸载残留**。点击详情后悬浮气泡留在屏幕上。结论：全局必须具备视图切换时的清理机制。
- **返工点 5：排序箭头繁琐**。用户要求删除上下箭头，改用原生拖拽行与插入指示线。

### 11.3 会话统计会话（`session-22146bb5-b921-473f-b465-7d28a7b1640a`）
- **返工点 1：图表基线错位**。Token 折线图与成本图未对齐。结论：图表组件必须锁定相同的高度与边距。
- **返工点 2：点两次无法关闭**。用户要求再次点击入口时关闭页面。结论：侧栏入口必须实现 Toggle 逻辑。
- **返工点 3：间距反复微调**。徽章间距经历了 20px -> 3px -> 5px 的拉扯。结论：建立 §3.10 强制间距刻度表。

---

## 12. 外部生态设计系统调研沉淀

通过对 **VS Code**（Webview UX Guidelines）、**Figma**（Plugin CSS Variables）、**Obsidian**（Plugin Review Guidelines）、**Grafana**（Plugin UI Guidelines）的深度调研，得出三大跨平台真理：
1. **Token 契约比组件库更长寿**：VS Code 弃用了官方厚重组件库，但注入的主题 Token 成为生命力最强的生态基石。只要宿主提供不可撼动的语义 Token 契约，插件开发者就能写出 100% 融合的界面。
2. **审查制度化**：Obsidian 在插件审核规范中明令禁止硬编码样式（如直接修改 DOM style），违规直接拒审。
3. **隔离与规范的平衡**：在无独立 iframe 沙箱的环境下（如 DSH、Obsidian），统一的类名规范搭配容器选择器作用域，是成本最低、稳定性最高的方案。

---

## 13. 现有插件收敛路线与计划

| 检查维度 | `mcp-manager` | `skill-manager` | `session-stats` | 规范目标 |
| --- | --- | --- | --- | --- |
| **字号接入** | 已接入 `--mm-fs` | 已接入 `--sm-fs` | 49 处硬编码 px | 统一收敛为 `--ds-fs` |
| **页面正文字号** | 13px（-1px） | 13px（-1px） | 14px | 统一为 `var(--ds-fs)`（14px） |
| **按钮规范** | 36px / r9 | 32px / r12 | 无独立类 | 统一 36px / 32px / 28px 梯队 |
| **图标描边** | 1.8 | 1.8（已对齐） | 混用 | 统一 24 画布 / 1.8 描边 |
| **Tooltip 外观** | 深底发丝线 | 浅底反色 | 无 | 统一原生深色气泡（--dsw-alias-tooltip-bg） |
| **弹窗遮罩** | 透明（符合设置页）| 变灰（符合独立页） | — | 独立页变灰，设置页透明 |
| **内容列宽** | 640px（设置页） | 960px | 1040px | 独立页 960px，设置页 640px |

---

## 14. 附录：新插件开工与交付自查清单

### 阶段一：动手开发前
- [ ] 明确挂载入口类型（独立页面 / 设置页内嵌 / 底部辅助），选择正确的骨架宽度（960px 或 640px）。
- [ ] 检查所需图标是否已在 §7.3 字典中，严禁从外部随意复制杂乱 SVG。

### 阶段二：样式编写中
- [ ] 根节点注入 `--ds-fs` 并配置 `data-plugin` 属性。
- [ ] 检索全 CSS 文件，确保无任何 `#hex`、`rgb()`、`hsl()` 字面色值。
- [ ] 检索全 CSS 文件，确保无任何硬编码 `font-size: xxpx`，一律走阶梯计算。
- [ ] 检查间距，确保无 3px、5px、7px 等非刻度数值。
- [ ] 所有弹窗与浮层显式声明 `box-shadow: none !important`。
- [ ] 弹窗遮罩模式确认（独立页 `bg-mask-1`，设置页 `transparent`）。
- [ ] Tab 筛选栏与卡片 hover 背景严格使用 `--dsw-alias-interactive-bg-hover`。

### 阶段三：交互逻辑实现中
- [ ] 侧栏图标槽仅渲染 16×16 SVG，捕获阶段接管整行点击，对弹窗内部点击放行。
- [ ] 纯图标按钮全部提供语义清晰的 `aria-label`。
- [ ] Tooltip 设定 300ms 延迟，且仅悬停触发，在视图切换时执行清理。
- [ ] 列表拖拽重排提供键盘快捷键操作支持。
- [ ] 危险删除操作具备二次确认弹窗，并清晰说明不可逆后果。
- [ ] 多行文本域配置脏标记保护，防止换行和空行被过滤。

### 阶段四：发布交付前
- [ ] 运行 `node --check` 语法检查。
- [ ] 运行 `pnpm test` 确认插件校验与索引校验全绿。
- [ ] 检查 `locale/en.json` 与 `locale/zh.json` 键集 100% 对齐。
- [ ] 在真实 DSH 客户端中与原生插件页并排截屏走查，明暗两套主题均测试无错漏。
