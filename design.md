# design.md — DSH 插件设计规范

> **定位**：本仓库所有 UI 插件的唯一样式与交互源。
> **权威性**：与各插件的 `DESIGN.md`、`CONTRACT.md`、交互稿冲突时，**以本文件为准**；插件自己的文档只描述业务结构，不重复定义视觉。
> **来源**：DSH 原生控件的 asar 实测规格 + 三个插件开发会话的返工经验 + 外部插件生态调研（见 §11–§12）。
> **版本**：v1.0（2026-11）。

一句话：**插件应该看起来是 DSH 的一个原生页面，而不是「另一个应用」。**

配套文档：

- [`docs/plugin-ui-playbook.md`](docs/plugin-ui-playbook.md) —— 手册式实现细节（字号联动的坑、事件陷阱等）
- [`docs/agent-iteration-playbook.md`](docs/agent-iteration-playbook.md) —— 多 agent 迭代流程
- [`docs/plugins/skill-manager/design/native-parity.md`](docs/plugins/skill-manager/design/native-parity.md) —— 原生控件实测记录
- [`plugins/mcp-manager/DESIGN.md`](plugins/mcp-manager/DESIGN.md) —— 单插件 UI 契约示例

---

## 0. 十条铁律（速览）

1. **原生优先**：动手前先打开 DSH 的「插件」「自动化任务」「设置」页，量出原生控件的真实尺寸与颜色，再决定插件怎么画。
2. **只用 `--dsw-*` token**，禁止任何字面色值；唯一例外是数据可视化的系列色（§3.9）。
3. **字号不写死**：统一用 `--ds-fs` 阶梯，跟随「设置 → 通用设置 → 字号大小」联动。
4. **一套组件**：按钮、图标按钮、Tab、弹窗、Tooltip 只按本文件实现，禁止各插件自创一套。
5. **hover 与选中用同一个背景 token**，只把文字色从 `tertiary` 提到 `primary`；hover 不位移、不缩放、不描边。
6. **弹窗三档宽度、遮罩真实变灰、全局无发光**（`box-shadow: none`）。
7. **Tooltip 300ms、仅悬停、深色气泡**（原生 `--dsw-alias-tooltip-bg`），不抢正文注意力。
8. **图标 24×24 画布 / stroke 1.5 / `currentColor` / 默认 16×16**，纯图标按钮必须有 `aria-label`。
9. **文案克制**：界面上不写解释性段落，说明放进 Tooltip；删除等不可逆操作必须写后果。
10. **验收用真机并排对比**：同一屏内把插件页与原生页截图并排看，或用 ego lite 逐控件 hover 取 computed style。

---

## 1. 这份文档解决什么问题

### 1.1 三个插件的现状

本仓库三个插件是**三次独立开发**的，每次都从零设计视觉层：

| 插件 | 开发时间 | 入口 | 当时采用的视觉基线 |
| --- | --- | --- | --- |
| `session-stats` | 2026-11-04 | 侧栏底部 | 自定卡片/图表，字号硬编码 |
| `mcp-manager` | 2026-11-04 ~ 11-06 | 设置页 | 按外部原型 1:1 还原，自绘 tooltip 引擎 |
| `skill-manager` | 2026-11-06 ~ 11-10 | 侧栏面板 | 从 asar 挖原生 CSS 对齐 |

结果是三套按钮高度（36 / 32 / 无）、三种 Tooltip（深底+边框 / 反色 / 无）、三种弹窗宽度（640 / 488·480·720 / 无）、三个字号变量（`--mm-fs` / `--sm-fs` / 无）。

### 1.2 用户在会话里反复说的同一句话

三个会话共 85 条人类指令，其中大量返工都指向同一件事——**视觉与交互不一致**：

- 「其他如果也有上面的问题，也一并更改掉；其他未提到的页面也需要按一致性要求来调整」
- 「为什么和放在设置中的布局不一样呢？」
- 「鼠标悬停在 tab 栏时，需要和 DeepSeek harness 系统的表现保持一致；做到该插件像 DeepSeek harness 原生插件一般」
- 「弹窗的大小需要和已有插件或 DeepSeek harness 的默认弹窗大小一致」
- 「技能页参照插件页来做，现在明显能看到技能页的技能字体偏小」
- 「编辑的图标使用这个图标，和 MCP 服务的插件图标保持一致，其他如果有不一致的，则需要保持一致」

### 1.3 结论

一致性不能靠"下次注意"，只能靠三件事：

1. **单一来源**：本文档是唯一的视觉定义，插件文档不再各写一套。
2. **可执行**：每条规范给 token、尺寸、CSS 片段和禁止项，而不是形容词。
3. **可验收**：§14 的清单逐条勾选，并用原生页做并排对比。

---

## 2. 设计原则

### 2.1 原生优先（Native parity）

DSH 已经有完整的视觉语言。插件的默认答案是「照做」，而不是「设计得更好看」。
凡是原生已有等价控件（Tab、按钮、弹窗、菜单、Tooltip、输入框），**必须**使用原生规格；只有原生没有的（数据图表、市场卡片、工具权限三态）才允许自创，且仍受 §3 token 与 §6 结构约束。

### 2.2 单一来源（Single source）

同一视觉元素全仓库只有一份定义。发现第二个插件写了「差不多」的按钮，正确做法是删掉它、改用本文档的定义，而不是微调对齐。

### 2.3 克制（Quiet）

- 无发光、无渐变、无投影装饰、无动效炫技。
- 不用颜色抢注意力：颜色只表达状态（成功/警告/错误/进行中）。
- 不在页面正文堆解释文字，说明交给 Tooltip（§8.2）。
- 图标与文字同色，语义色只留给状态。

### 2.4 状态即语义（State is semantic）

「hover / 选中 / 危险」用 token 表达，不用手调透明度或混色：

- hover 与选中：`--dsw-alias-interactive-bg-hover`
- 按下：`--dsw-alias-interactive-bg-active`
- 危险 hover：`--dsw-alias-interactive-bg-hover-danger`

### 2.5 可访问（Accessible by default）

- 纯图标按钮必须有 `aria-label`（同时作为 Tooltip 文案来源）。
- 键盘可达：Tab 顺序合理，Escape 关闭最上层，焦点在弹窗关闭后回到触发元素。
- 不只用颜色表意：状态点/徽章必须同时有文字或 `aria-label`。
- 文字对比度遵循 token 自带层级，不要用 `tertiary` 承载正文。

### 2.6 参数化（Follow host settings）

字号、主题、语言、平台（macOS 标题栏）都必须跟随宿主，不写死：
字号来自 `ui-theme` 配置，主题来自 `[data-ds-dark-theme]`，语言来自 locale，平台给出 `--dsh-frame-top-clearance`。

---

## 3. 设计 token

### 3.1 三条规则

1. 颜色、圆角、遮罩**只能**取自 `--dsw-*`；不允许字面 `#hex`、`rgb()`、`hsl()`。
2. 需要浅色底/悬停底时，用 `color-mix(in srgb, var(--dsw-…) N%, transparent)`，不要新造颜色。
3. 不确定用哪个 token 时，去原生 CSS 里搜同类控件，照它写。

### 3.2 背景层级

| 用途 | token | 说明 |
| --- | --- | --- |
| 页面底 | `--dsw-alias-bg-base` | 插件页面根容器 |
| 卡片、带底按钮 | `--dsw-alias-bg-layer-1` | 比页面高一层 |
| 输入框、弹窗 | `--dsw-alias-bg-layer-2` / `-3` | 输入框用 `layer-3` |
| 平台模块底（分段 Tab 容器） | `--dsw-alias-bg-module-platform` | 原生 segmented tabs 用 |
| 遮罩 | `--dsw-alias-bg-mask-1` | 深色约 `rgba(0,0,0,.5)`，真实变灰 |
| 设置面板同色底 | `--dsw-static-neutral-bluish-850` | 嵌在设置页的弹窗用，与面板同色 |

### 3.3 文字层级

| 用途 | token |
| --- | --- |
| 主文字、标题、选中态 | `--dsw-alias-label-primary` |
| 次要文字、说明、hover 中的图标 | `--dsw-alias-label-secondary` |
| 弱化文字、未选中 Tab、图标按钮默认色 | `--dsw-alias-label-tertiary` |
| 辅助说明、时间戳、路径摘要 | `--dsw-alias-label-caption` |
| 反色（主按钮上的文字） | `--dsw-alias-label-primary-foreground` |
| Tooltip 文字 | `--dsw-static-neutral-bluish-00`（固定白） |

### 3.4 边框与分割线

| 用途 | token |
| --- | --- |
| 列表分割线、顶栏底边 | `--dsw-alias-border-l1` |
| 控件边框、卡片描边 | `--dsw-alias-border-l2` |
| 发丝线（.5px）、卡片 | `--dsw-alias-border-l3` |
| 输入框边框、图表网格线 | `--dsw-alias-border-l4` |
| 浮层描边（弹窗） | `--dsw-alias-border-inverted` |

发丝线统一写 `.5px`，不要写 `1px`（原生用 hairline）。

### 3.5 交互与按钮

| 用途 | token |
| --- | --- |
| hover 底 | `--dsw-alias-interactive-bg-hover` |
| 按下底 | `--dsw-alias-interactive-bg-active` |
| 危险项 hover | `--dsw-alias-interactive-bg-hover-danger` |
| 主按钮底 | `--dsw-alias-button-primary-fill` / hover `--dsw-alias-button-primary-hover` |
| 工具栏图标按钮底 | `--dsw-alias-button-tool-bar-fill` / hover `--dsw-alias-button-tool-bar-hover` |
| 焦点环 | `--dsw-focus-ring-color`（兜底 `--dsw-alias-state-business-primary`），宽度 `--dsw-focus-ring-width` |

### 3.6 状态色

| 语义 | token |
| --- | --- |
| 成功、正常、启用 | `--dsw-alias-state-success-primary` |
| 警告、待处理、可更新 | `--dsw-alias-state-warn-primary` |
| 错误、失败、危险 | `--dsw-alias-state-error-primary` |
| 进行中、信息、品牌 | `--dsw-alias-state-business-primary` / `--dsw-alias-brand-primary` |

浅色徽章底一律 `color-mix(in srgb, <状态 token> 12%, transparent)`，不要写死半透明黑。

### 3.7 圆角、阴影、遮罩

原生实测（`dsh-client-ui-theme`）：

| token | 值 | 用途 |
| --- | --- | --- |
| `--dsw-radius-xs` | 4px | 小徽章、键帽 |
| `--dsw-radius-sm` | 8px | 图标按钮、Tooltip、小控件 |
| `--dsw-radius-md` | 12px | 按钮、输入框、Tab 指示器 |
| `--dsw-radius-lg` | 16px | 分段 Tab 容器、卡片 |
| `--dsw-radius-xl` | 20px | 确认弹窗 |
| `--dsw-radius-panel` | 28px | 表单/大内容弹窗 |

**阴影规则**：插件内的浮层一律 `box-shadow: none`，靠 `.5px` 边框分层。
原因：宿主对 `[role="dialog"]` 有默认阴影（白边+外发光），用户明确要求「弹窗周边不要有发光的效果」，且类选择器优先级不够，必须**内联**覆盖：

```js
h('div', { className: 'ds-dialog', style: { boxShadow: 'none' } }, …)
```

### 3.8 混色与透明度

- 浅底：`color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)`
- 边框加重：`color-mix(in srgb, var(--dsw-alias-border-l3) 60%, transparent)`
- 禁止：`rgba(0,0,0,.5)`、`#ffffff14` 这类字面色值。

### 3.9 唯一例外：数据可视化系列色

多模型折线图需要在一屏内区分 6–8 条曲线，宿主 token 没有这么多可辨识色。`session-stats` 在 `.ss-page` 上定义了 `--ss-series-1..8`，这是**允许的例外**，但必须满足：

1. 只用于图表数据系列，不得用于按钮、边框、文字、背景。
2. 定义在插件根节点上，不污染全局。
3. 明暗两套主题下都验证过可辨识度。

### 3.10 间距刻度

间距只用下表的值（4 的倍数 + 6），**不要出现 3 / 5 / 7 / 10 / 14px 这类零散值**。
session-stats 会话里同一个「已归档」标记被要求改三次（20px → 3px → 5px），就是因为没有刻度可依。

| 值 | 用途 |
| --- | --- |
| 4px | 紧凑内边距、徽章内 padding |
| 6px | 图标与文字（按钮内） |
| 8px | 图标与文字（列表/菜单）、相关元素间距 |
| 12px | 控件组内间距 |
| 16px | 卡片内边距、行内边距 |
| 20px | 卡片之间、区块内间距 |
| 24px | 区块之间 |
| 32px | 页面主要分区之间 |
| 48px | 页面底部留白 |

例外：行高、控件高度、图标尺寸、字号不受此表约束（各自有专门规范）。

### 3.11 禁用清单

| 禁止 | 原因 |
| --- | --- |
| `--dsw-hovercard-bg` | 主题里未定义，取值为空 |
| 自造 `--ds-*` 颜色 | 与宿主主题脱节，暗色模式失效 |
| `outline: none` 且无替代 | 键盘用户失去焦点反馈 |
| `filter: blur()` / `backdrop-filter` | 视觉噪音，原生不用 |
| 渐变背景 | 原生不用 |
| `color-mix` 里混入字面色 | 违反 token 规则 |

---

## 4. 字号与字体

### 4.1 真实来源

「设置 → 通用设置 → 字号大小」**不是 CSS 全局变量**，它写在 `ui-theme` 插件的配置里：

```yaml
- id: ui-theme
  name: "@deepseek-ai/dsh-client-ui-theme"
  config:
    preference: dark
    fontSize: 16
```

而 `--dsh-content-font-size` 只在**会话内容区**生效，插件页面/设置面板的祖先链上都读不到。
→ 插件必须自己从配置读，再以 CSS 变量注入根节点。

### 4.2 四步接入

**① Host 侧**（`index.js`）读 `ui-theme.fontSize`，profile 优先、home 兜底；**用文本正则定位**，不要整文件 YAML 解析（patch 里的 `{{SECRET_xxx}}` 会让子集解析器抛错）：

```js
const match = /(?:^|\n)\s*-\s+id:\s*['"]?ui-theme['"]?[\s\S]{0,800}?\bfontSize:\s*(\d{1,2})/u.exec(content)
```

**② state 带出**：`{ ..., fontSize }`。

**③ 客户端根节点注入**：

```js
h('div', { className: 'ds-root', style: { '--ds-fs': fontSize + 'px' } }, …)
```

**④ 样式层阶梯**：

```css
.ds-root { --ds-fs: var(--dsh-content-font-size, 14px); }
```

`var()` 必须带 fallback（插件可能不在设置面板内渲染）。

### 4.3 字号阶梯

所有字号只能取以下六档，**不允许半像素**（`±0.5px`、`±1.5px` 是历史遗留，禁止新增）：

| 档位 | 写法 | 基准 14px 时 | 用途 |
| --- | --- | --- | --- |
| 标题 | `calc(var(--ds-fs) + 2px)` | 16px | 页面主标题 |
| 弹窗标题 | `calc(var(--ds-fs) + 1px)` | 15px | 弹窗/抽屉标题 |
| 正文 | `var(--ds-fs)` | 14px | 页面正文、表单字段、按钮（`md`） |
| 次要 | `calc(var(--ds-fs) - 1px)` | 13px | 列表行副标题、输入框、次要信息 |
| 辅助 | `calc(var(--ds-fs) - 2px)` | 12px | 徽章、时间、摘要、按钮（`sm`）、**Tooltip** |
| 弱化 | `calc(var(--ds-fs) - 3px)` | 11px | 图表轴标签、极弱提示 |

按钮文字：`md` 用「正文」档（基准 14px，与原生一致），`sm` 用「辅助」档（12px，与原生 `.sm` 一致）。输入框用「次要」档（13px）。

### 4.4 行高与字重

- 正文 `line-height: 1.5`；标题 `1.35`；单行控件用固定行高（如按钮 `22px`）。
- 字重只用 400 / 500 / 600。选中 Tab 600，弹窗标题 600，正文 400。
- 数字类（统计值、token 数、成本）加 `font-variant-numeric: tabular-nums`。

### 4.5 三个必踩的坑

1. **Tooltip 挂 `<body>` 拿不到根节点变量**：创建节点时把当前 `--ds-fs` 复制过去。
2. **`calc()` 里的变量必须有 fallback**，否则宿主没有该变量时整条声明失效。
3. **不要依赖 `--dsh-content-font-size`**：它只在会话内容区有值。

### 4.6 字体栈

```css
font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif);
```

等宽内容（命令、路径、serverName）用 `ui-monospace, SFMono-Regular, Menlo, monospace`，字号比正文小一档。

---

## 5. 页面骨架与入口

### 5.1 入口决策树

| 场景 | 挂载点 | 理由 |
| --- | --- | --- |
| 有完整信息架构、长期使用、需要主区域 | `main` + `sidebar.panellist` | 与「插件」「自动化任务」同级 |
| 管理宿主配置、低频、从设置进入 | `settings.section` | 与原生设置项同级 |
| 全局状态/工具，不占主区域 | `sidebar.footer.action` | 与「会话统计」「账户」同级 |

规则：

- `main` 的 `key` 与 `sidebar.panellist` 的 `id` **必须相同**，否则点击不会切换面板。
- `sidebar.panellist` 必须给 `order`，避免与原生入口打架。
- **入口迁移不得改变内部布局与交互**。MCP 会话把入口从设置页搬到侧栏又搬回，每次都要重新对齐尺寸/弹窗/事件，用户三次追问「为什么和放在设置中的布局不一样」。迁移时按 §14 逐项重测。
- **同一入口再次点击应关闭面板**（用户明确要求「再次点击会话统计，我希望可以关闭」），用 `aria-pressed` 同步状态。

### 5.2 侧栏入口（宿主图标槽）

宿主的 `sidebar.panellist` 结构是「整行按钮 + 16×16 图标槽 + 标题文字」，插件组件被放在图标槽里：

```html
<button class="panelRow">
  <span class="panelGlyph">
    <div data-slot="sidebar.panellist">  <!-- 我们的组件 -->
      <svg width="16" height="16">…</svg>
    </div>
  </span>
  <span class="panelTitle">文字</span>      <!-- 宿主渲染 -->
</button>
```

因此：

- **只渲染 16×16 图标**，不要渲染按钮、文字或 18px 图标（会比其他入口大一圈、对不齐）。
- 点击整行由宿主按钮负责；需要在 `useEffect` 里 `closest('button')` 取宿主行，在**捕获阶段**接管点击（`preventDefault + stopPropagation`），并在弹窗内的点击上完全放行。
- 当前打开态用 `aria-pressed` 表达。

### 5.3 独立页面骨架

```css
.ds-page {
  width: 100%; height: 100%; min-height: 0;
  display: flex; flex-direction: column;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: var(--ds-fs);          /* 正文 = 设置字号，不要再 -1px */
  overflow: hidden;
}

.ds-page-inset {
  padding: calc(28px + var(--dsh-frame-top-clearance, 0px)) clamp(20px, 4vw, 48px) 0;
}

.ds-content { width: 100%; max-width: 960px; margin: 0 auto; }
```

- 顶部 inset 用 `calc(28px + var(--dsh-frame-top-clearance, 0px))`，**不要硬编码 76/78/82px**（那是在 macOS 上量出来的巧合，非 mac 平台会错位）。
- 页面正文用 **`var(--ds-fs)`**。skill-manager 曾用 `calc(var(--sm-fs) - 1px)`，被用户指出「技能页字体偏小，要和原生页一样」——根因就是比原生小了一档。
- 内容列 **960px**（原生插件页实测值）；`session-stats` 的 1040px 是历史值，收敛到 960。
- 页头单行：标题 + 操作区，`nowrap`；窄屏（≤720px）才允许操作区换行。

### 5.4 设置在面板内嵌

设置页右侧内容区比独立页面窄，用 **640px 内容列居中**，不要撑满：

```css
.ds-settings { padding: 16px 20px; }
.ds-settings > * { width: 100%; max-width: 640px; margin-inline: auto; }
```

### 5.5 滚动

- **只有一个滚动区**：内容区 `flex: 1 1 auto; min-height: 0; overflow: auto`。
- 滚动条细（6–8px），轨道透明，滑块用 `--dsw-alias-scrollbar-bg-l1`。
- `scrollbar-gutter: stable`，避免内容出现/消失时左右跳动。

### 5.6 响应式断点

| 断点 | 规则 |
| --- | --- |
| ≤ 960px | 内容列改为自适应，两列卡片收成一列 |
| ≤ 720px | 页头操作区换行；表单双列改单列；隐藏副标题 |
| ≤ 520px | 隐藏时间戳等次要信息，图标按钮可降到 28×28 |

---

## 6. 组件规范

**统一使用 `ds-` 前缀**：本文件所有 CSS 片段都可原样复制，不再各用 `mm-` / `sm-` / `ss-`。
`.ds-*` 是全仓库共享契约——改一条 `.ds-btn` 等于改所有插件，所以**它只能由本文件定义**，插件内不得覆盖。

根节点统一 `class="ds-root" data-plugin="<slug>"`。只有本插件专属、不会复用的样式（图表、业务卡片）才用 `<prefix>-` 前缀隔离。

### 6.1 按钮（Button）

原生按钮实测规格，插件照做：

```css
.ds-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 4px;
  height: 36px; padding: 0 14px;
  border: 0; border-radius: var(--dsw-radius-md);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: inherit; font-size: var(--ds-fs); line-height: 22px; font-weight: 500;
  white-space: nowrap; cursor: pointer;
}
.ds-btn:disabled { opacity: .4; cursor: not-allowed; }

/* 变体 */
.ds-btn[data-variant="primary"] { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
.ds-btn[data-variant="primary"]:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.ds-btn[data-variant="secondary"] { border: .5px solid var(--dsw-alias-border-l3); }
.ds-btn[data-variant="secondary"]:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.ds-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.ds-btn[data-variant="danger"] { background: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground); }

/* 尺寸 */
.ds-btn[data-size="sm"] { height: 28px; padding: 0 10px; border-radius: var(--dsw-radius-sm); font-size: calc(var(--ds-fs) - 2px); line-height: 18px; }
```

规则：

- 每屏**只有一个** primary 按钮（主操作），其余 secondary/ghost。
- 危险操作只在确认弹窗里用 danger，列表里的删除用图标按钮 + danger hover。
- 按钮内图标 16px，与文字 `gap: 6px`。
- 禁止自定义高度、圆角、阴影、hover 位移、hover 变色（除上面定义的状态）。
- 切换类按钮（启用/停用、选中）用 `aria-pressed`，视觉同 ghost hover 态。

### 6.2 图标按钮（IconButton）

```css
.ds-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0;
  border: 0; border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}
.ds-icon-btn:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}
.ds-icon-btn:disabled { opacity: .4; cursor: not-allowed; }
```

- 热区 **32×32**，图标 16×16；紧凑工具栏可降到 28×28，但同一行必须一致。
- 默认色用 `tertiary`（不抢视觉），hover 才提到 `primary`。
- 危险图标按钮：hover 用 `color-mix(in srgb, var(--dsw-alias-state-error-primary) 15%, transparent)` 做底、文字用 error 色。
- **必须**有 `aria-label`，其文案同时作为 300ms Tooltip 的内容。
- 不要用上下箭头/三点菜单做重复操作入口（同一操作只出现一次）。

### 6.3 Tab

两级，用法不同，不能混：

**一级分段 Tab（segmented）** —— 页面级视图切换，原生实测：

```css
.ds-tabs { position: relative; display: grid; padding: 4px; border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-module-platform); }
.ds-tab { position: relative; height: 34px; padding: 0 12px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); font-size: var(--ds-fs); line-height: 20px; }
.ds-tab:hover, .ds-tab[aria-selected="true"] { background: transparent; color: var(--dsw-alias-label-primary); }
.ds-tab[aria-selected="true"] { font-weight: 600; }
/* 指示器：绝对定位，白底 + 发丝线 + radius-md */
```

**二级筛选 Tab（pill）** —— 列表筛选，原生实测：

```css
.ds-filter-tab { height: 28px; padding: 0 10px; border: 0; border-radius: 14px; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: var(--ds-fs); line-height: 22px; }
.ds-filter-tab:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ds-filter-tab[aria-selected="true"] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
```

核心规律：**hover 与选中用同一个背景 token，区别只在文字色**。这是 skill-manager 会话里挖出来的原生规律，此前插件用「选中深底白字 + hover 另一套色」是不一致的根源。

### 6.4 输入类

```css
.ds-input, .ds-textarea, .ds-select {
  height: 34px; padding: 0 12px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font: inherit; font-size: calc(var(--ds-fs) - 1px); line-height: 1.5;
}
.ds-input:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.ds-input[aria-invalid="true"] { border-color: var(--dsw-alias-state-error-primary); }
```

- 标签在上，占位符只作示例；默认值用 placeholder 提示（如「默认 60000」），**未填写不写配置**。
- 文本域字段（每行一个参数）必须有独立编辑态 + `dirty` 标记，避免用户正在输入的空行被回填逻辑吃掉。
- 搜索框：图标在左，清除按钮在右，`Escape` 清空。

### 6.5 卡片与列表行

```css
.ds-card { padding: 16px 18px; border: .5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-layer-1); }
.ds-card:hover { background: var(--dsw-alias-interactive-bg-hover); }
```

- 可点卡片 hover **只变背景**，不描边、不位移、不缩放（hover 前后 `getBoundingClientRect()` 完全相同）。
- 行列表：行高 44–56px，行间 `.5px` 分割线 `border-l1`，行内边距 12–16px。
- 长文本单行截断：`white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0`，完整值走 300ms Tooltip。
- 行内次要操作默认隐藏、hover 淡入，但**必须保留键盘可达**。

### 6.6 徽章与状态点

| 类型 | 规格 |
| --- | --- |
| 状态点 | 8px 圆点，`success` / `warn` / `error` / `label-tertiary`（停用） |
| 文字徽章 | 高 20px，padding `0 6px`，radius `xs`，字号「辅助」档，语义色 12% 底 + 语义色文字 |
| 计数 | 弱化色，字号「辅助」档，不抢主文字 |

状态色只用于状态，不用于装饰。徽章不做成按钮，除非它可点击（此时按 §6.2 补 hover 与 aria）。

### 6.7 弹窗（Dialog）

**尺寸三档**（DSH 插件页/管理页实测口径）：

| 档位 | 宽度 | 圆角 | 用途 |
| --- | --- | --- | --- |
| 确认 | `min(480px, 100vw - 32px)` | `radius-xl` (20px) | 删除/覆盖等确认 |
| 表单 | `min(488px, 100vw - 32px)` | `radius-panel` (28px) | 新增/编辑 |
| 大内容 | `min(720px, 100vw - 32px)` | `radius-panel` | 多来源、多工具、代码预览 |

```css
.ds-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, .5)); /* 独立页面：真实变灰 */
  /* 嵌入设置页时改为 background: transparent（见下） */
}
.ds-dialog {
  display: flex; flex-direction: column;
  width: min(488px, 100vw - 32px);
  max-height: min(720px, 100vh - 96px);
  background: var(--dsw-alias-bg-layer-2);
  border: .5px solid var(--dsw-alias-border-inverted);
  border-radius: var(--dsw-radius-panel);
  box-shadow: none;              /* 用户明确要求：不要发光 */
  overflow: hidden;
  font-size: var(--ds-fs);
}
```

结构固定：标题栏 → 内容区（唯一滚动）→ 底部操作栏。

- **位置**：独立页面里视口居中；**嵌入设置页时**改为「与设置面板内容区同宽、同色」，视觉上盖住上层面板（`mcp-manager` 的 640px 就是这一口径，属三档之外的唯一例外）。
- **背景**：独立页面用 `--dsw-alias-bg-layer-2`；嵌入设置页用 `--dsw-static-neutral-bluish-850`（面板同色），否则弹窗比面板深一档，像"另一个应用"。
- **遮罩分场景**：
  - 独立页面（`main` / 路由页）→ `background: var(--dsw-alias-bg-mask-1)`，真实变灰；透明遮罩会让用户以为页面卡住。
  - 嵌入设置页 → `background: transparent`（只做点击拦截），不要压暗设置面板。MCP 用户明确否决过设置页里的变灰：「点击新增服务器，背景变灰了，这是错误的」。两种场景的要求相反，不要互相套用。
- **Escape / 点遮罩只关最上层**：维护 `dialogStack`，捕获阶段 `stopImmediatePropagation`。
- **弹窗内点击完全放行**：不要 `stopPropagation`，否则 React 合成事件收不到，弹窗内按钮全部失灵。
- 关闭后焦点回到触发元素。
- 短视口下内容区 `min-height: 0`，否则底部按钮被裁。
- 危险确认弹窗的标题与说明必须写清后果（删什么、从哪删、能否恢复）。

### 6.8 Tooltip

**原生气泡规格**（`_bubble_44yfq_1` 实测）：

```css
.ds-tooltip {
  position: fixed; z-index: 2000;
  max-width: min(50vw, calc(100vw - 24px));
  padding: 3px 7px;
  border: 0; border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-tooltip-bg);          /* 深色主题 #2c2c2e / 浅色 #43454a */
  color: var(--dsw-static-neutral-bluish-00);       /* 固定白字 */
  font-size: calc(var(--ds-fs) - 2px);
  line-height: 20px;
  box-shadow: none;
  pointer-events: none;
  white-space: pre-line;
  overflow-wrap: break-word;
}
```

交互见 §8.2。要点：

- **300ms** 悬停后显示，移出或按下立即隐藏。
- **只悬停触发**，不加点击触发（点击有自己的动作，两者会互相打断）。
- 全页面**单个实例**复用，挂 `<body>`，切换目标时移动位置；靠近视口边缘自动夹紧。
- 层级高于弹窗（2000 > 1200）。
- 文案是「补充说明」，不是重复 `aria-label` 的按钮名。
- 原生是**深色气泡**（两种主题都是深底白字），不是「反色浅底」——skill-manager 早期按"浅底深字"实现，属于偏差。
- 字号取「辅助」档（12px），比原生 13px 再小 1px：这是用户在 MCP 会话里明确验收的口径（"帮助框的字号可以小 2px"），换来更清晰的层次；要严格对齐原生时可用 `-1px`。

### 6.9 Toast / 空状态 / 加载 / 错误

| 状态 | 规范 |
| --- | --- |
| Toast | 底部居中，`min(420px, 100vw - 32px)`，圆角 `lg`，`bg-layer-1` + 发丝线，3s 自动消失 |
| 空状态 | 一行居中文字，不预留大块空白；必要时配 20px 图标 |
| 加载 | 图标旋转 0.8s linear；超过 300ms 才显示骨架/转圈，避免闪烁 |
| 行内错误 | 文字用 `state-error-primary`，字号「辅助」档，紧贴出错控件下方 |
| 阻塞错误 | 页面内提示条 + 重试按钮，不要整屏遮罩 |

---

## 7. 图标规范

### 7.1 画布与描边

- 画布 **24×24**，`fill: none`，`stroke: currentColor`，`stroke-width: 1.5`，`stroke-linecap/linejoin: round`。
- 这套参数沿用 Lucide 风格的 24 画布 + 圆角端点（Lucide 默认 stroke 2，这里取 1.5 以匹配 DSH 原生图标的轻量感）。图标按钮一律用语义 ID 而非文件路径，便于整体替换。
- `viewBox="0 0 24 24"`，不写固定 `width/height` 属性之外的内联尺寸。
- 装饰性图标 `aria-hidden="true"` + `focusable="false"`。
- 需要实心元素时用 `fill="currentColor" stroke="none"`（如状态点、箭头上的小圆）。
- **禁止**：emoji、图标字体、外链图标库、CDN 引用、位图。

```js
function Icon({ name, size = 16 }) {
  return h('svg', {
    viewBox: '0 0 24 24', width: size, height: size,
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': 'true', focusable: 'false',
  }, GLYPHS[name].map(([tag, attrs]) => h(tag, attrs)))
}
```

### 7.2 尺寸档

只允许三档：

| 尺寸 | 用途 |
| --- | --- |
| 16 | 默认：按钮内、列表行、Tooltip 锚点、侧栏图标槽 |
| 20 | 空状态、卡片标题前的大图标 |
| 24 | 极少数强调位（不要用在按钮里） |

同一行内的图标必须同尺寸、同描边；`size` 只从这三档取，不允许 12/14/15/18 这类零散值。

### 7.3 命名与清单

图标按**语义名**索引（`plus`、`trash`、`refresh`、`chevron-down`），不按文件名或路径。多个插件需要的图标名必须一致，避免同一个「编辑」在两个插件里长得不一样。

建议逐步收敛到一份共享清单（skill-manager 的 `ICON_GLYPHS` 已覆盖 30+ 个常用图标，可直接作为基线）：

`skill` `installed` `market` `sources` `search` `refresh` `plus` `import` `download` `upload` `folder` `user` `users` `sliders` `puzzle` `layers` `shield` `file` `image` `script` `chevron-down` `chevron-right` `arrow-up` `arrow-up-dot` `check` `x` `edit` `trash` `more` `copy` `external` `grip` `warning` `info` `spinner`。

### 7.4 对齐与间距

- 图标与文字垂直居中对齐（`align-items: center`，不要让基线对齐）。
- 图标与文字间距 **6–8px**；菜单项用 `8px`。
- 图标与文字必须**左对齐成一组**。曾经的 bug：容器用 `justify-content: space-between`，图标和标签被推到两端，中间空出大片空白。正确写法：

```css
.ds-menu-item { display: flex; align-items: center; gap: 8px; justify-content: flex-start; }
.ds-menu-item > span { flex: 0 1 auto; }   /* 不要给 span 加 flex:1 */
```

### 7.5 可访问性

- 纯图标按钮：`aria-label` = 动作名（「删除服务器」「复制路径」），与 Tooltip 文案一致。
- 有文字的图标按钮：图标 `aria-hidden`，文字即标签。
- 状态图标不能只靠颜色，必须同时给 `aria-label` 或文字。
- 对比度：图标色至少 `label-tertiary`；禁用态才允许 `opacity: .4`。

### 7.6 插件市场图标（`icon.svg`）

`market.json` 的 `icon` 指向 `plugins/<slug>/icon.svg`，由 Discover 页面渲染：

- 画布 **64×64**，`viewBox="0 0 64 64"`，`role="img"`。
- 底板：`<rect x="2" y="2" width="60" height="60" rx="14">`，深色底。
- 统一色板（三插件已基本一致，收敛到这一组）：

| 角色 | 色值 |
| --- | --- |
| 底板 | `#102a43` |
| 主描边 | `#7fd1ff` |
| 强调填充 | `#4fb3ff` |
| 高光/细线 | `#9ee6ff` |

- 线宽 3（64 画布下），`stroke-linejoin="round"`。
- 图形用单色系线稿 + 一处实心强调，不写文字、不用渐变。
- 不要复用 DSH 官方图标语义（避免与「插件」「技能」原生入口混淆）。

---

## 8. 交互规范

### 8.1 四态

| 态 | 表现 |
| --- | --- |
| hover | 背景 `interactive-bg-hover`（图标按钮用 `bg-layer-1`），文字/图标 tertiary→primary；**不位移、不缩放、不改尺寸** |
| active | 背景 `interactive-bg-active` |
| focus-visible | 列表项/按钮：背景 + 文字（同 hover）；表单控件：`outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color)` 或边框变 `state-business-primary`；Tab：下划线 |
| disabled | `opacity: .4` + `cursor: not-allowed`，不响应 hover |

原生对焦点的处理分两类：**可点击列表项用背景表达，表单控件用焦点环**。插件照此区分，不要一律 `outline: none`，也不要给列表项套彩色外圈。

### 8.2 Tooltip 时序

- 移入 → 计时 **300ms** → 显示（淡入 110–150ms）。
- 移出 / 按下 / 滚动 / 切换视图 → 立即隐藏。
- 同一时刻只显示一个。
- 触发元素被卸载（如视图切换）时必须主动隐藏，否则会残留——skill-manager 曾出现「悬停后点进详情，提示一直不消失」。

### 8.3 弹窗栈

- 嵌套弹窗（编辑器里再开确认）优先匹配最近的宿主容器尺寸。
- Escape / 遮罩点击只关最上层；关闭后焦点回到触发元素。
- 弹窗打开时锁定背景滚动（`overflow: hidden` + 滚动条宽度补偿），关闭后恢复。
- 弹窗内点击**不拦截**，不要让上层行的 capture 监听误关弹窗。

### 8.4 危险操作

- 删除、停用、覆盖配置等不可逆操作必须二次确认。
- 确认弹窗必须写清：删什么、从哪删、能否恢复。
- 危险按钮用 `danger` 变体，不使用主色。
- 批量操作（全部启用/全部删除）要显示影响数量。

### 8.5 键盘

- `Tab` 顺序与视觉顺序一致；`Escape` 关闭最上层浮层。
- 列表项用 `role="option"`/`button` + `aria-selected`，支持上下键移动（市场源拖动排序需提供 `Alt+↑/↓` 兜底）。
- 弹窗内有焦点陷阱，关闭后恢复。

### 8.6 性能与首屏

- 面板打开必须**瞬时**：Host 侧数据一次取回，不要首屏先渲染骨架再补数据（用户明确反馈「打开很慢/显得卡」）。
- 详情页的异步内容（如 SKILL.md）与骨架**同时出现**，不要先出一半再跳变。
- 长列表分页/虚拟化：默认显示 5 行，每次「查看更多」+5，最多 10 行窗口后内部滚动（session-stats 的验收口径）。
- 图表与列表同屏时，基线必须对齐（总 token 与成本折线在同一水平线上）。

---

## 9. 文案与 locale

- 界面语言跟随宿主 locale（`zh` / `en` 两套键集完全一致、值非空）。
- 不写解释性段落、教学文案、slogan；需要说明时用 Tooltip。
- 按钮用动词短语：「新增」「保存」「删除」「检查更新」；不用「点击这里」。
- 空状态一句话说清下一步：「暂无匹配的 MCP 服务」。
- 危险提示必须具体：「确定删除该服务器吗？此操作会从当前 Profile 移除该行，不可撤销。」（用实际 name 替换「该服务器」）
- 文案正式，不口语化（用户反馈「更换技能下面的描述，太口语化了，正规点」）。
- locale 键名用小写点分：`dialog.delete.title`、`toolbar.refresh`。

---

## 10. 工程约定

### 10.1 文件结构

- 浏览器半边只 `require('react')`，不引用任何第三方 UI 库、不 import `@deepseek-ai/`。
- 样式写在 `client.js` 的 `STYLES` 常量（或 `src/client/90-styles.js`，构建时内联），通过 `useEffect` 注入 `<style>` 或随组件渲染。
- 复杂插件可用 `src/client/*.js` 分片 + `scripts/build-client.mjs` 拼成单文件（skill-manager 的做法）。

### 10.2 作用域与前缀

- 根节点：`className="ds-root" data-plugin="<slug>"`。
- 共享组件类一律 `ds-`（`ds-btn` / `ds-dialog` / `ds-tooltip`…），与 §6 保持逐字一致；本插件专属样式用 `<prefix>-`，且选择器必须挂在根节点下。
- 禁止裸 `button`、`div`、`*` 全局选择器（根内 reset 用 `:where()` 降优先级）。
- 不要用 `!important`（唯一例外：覆盖宿主对 `[role="dialog"]` 的默认样式时，优先用内联 style）。
- 修改任何 `.ds-*` 规则前，先改本文件并同步三个插件；不允许某个插件单独覆盖 `.ds-*`。

### 10.3 硬约束（`pnpm test` 会查）

- 无绝对家目录路径。
- locale 键集一致、非空、每个键在字典外被 `t()` 引用。
- class 前缀统一、颜色只来自 token（人工 + §10.4 校验）。
- 无 `box-shadow` 发光、无渐变。

### 10.4 建议的自动校验（尚未接入，按需实现）

由 `scripts/check-plugins.mjs` 增加静态检查，把偏离变成红灯：

1. 扫描 `client.js` 的样式字符串：出现 `#hex`、`rgb(`、`hsl(` 直接失败（`--ss-series-*` 与 icon.svg 除外）。
2. `font-size:` 后面出现裸 `px` 字面量失败（必须 `calc(var(--*-fs) …)`）。
3. `box-shadow` 只允许 `none`；`filter`、`backdrop-filter`、`linear-gradient` 失败。
4. `require(` 只允许 `react`。
5. `aria-label` 覆盖率检查：纯图标按钮节点必须有该属性。

视觉回归可复用 `tools/preview.mjs`：每插件 × 明暗 × 关键交互态截图，与原生页并排存基线。

---

## 11. 三个会话的经验总结

> 三个会话合计 **85 条人类指令**（MCP 27 / Skills 46 / Stats 12）。下表为用户原话摘录或紧邻原意的概括，根因与规范落点是对照代码与实测得出的。

### 11.1 MCP 服务（`session-cf63abe4…`，2026-11-04 ~ 11-06）

27 条人类指令，15 条以上是视觉/交互修正。

| # | 用户反馈 | 根因 | 规范落点 |
| --- | --- | --- | --- |
| 1 | 「点击新增服务器，背景变灰了，这是错误的」 | 设置页内嵌弹窗套用了独立页面的变灰遮罩 | §6.7 遮罩按容器分场景：设置页透明 |
| 2 | 「选择 JSON 后，整个新增服务器的页面也是缩小了一圈，都漏出上一层的内容了」 | 弹窗宽度随内容变化 | §6.7 三档固定宽度 + `100vw - 32px` 上限 |
| 3 | 「图标和文字没有对齐，图标需要使用一样大小的图标」 | 侧栏槽位画了 18px 图标 | §5.2 只渲染 16×16 |
| 4 | 「点击 MCP 服务没有反应」 | 嵌套 `<button>` + 事件落在宿主按钮 | §5.2 捕获阶段接管宿主行点击 |
| 5 | 「点击弹窗的任何地方都会关闭弹窗」 | 行上的 capture 监听收到弹窗内点击 | §8.3 弹窗内点击放行 |
| 6 | 「弹窗周边不要有发光的效果」 | 宿主对 `[role="dialog"]` 的默认阴影 | §3.7 内联 `boxShadow: 'none'` |
| 7 | 「悬停时间从 1 秒改成 300 毫秒」 | 1000ms 太慢，用户以为没反应 | §8.2 固定 300ms |
| 8 | 「Tooltip 去掉点击触发」 | 点击与按钮动作互相打断 | §8.2 仅悬停 |
| 9 | 「帮助框字号小 2px、颜色浅一点、阶梯计算」 | 字号硬编码、层级不清 | §4.3 辅助档 + §6.8 |
| 10 | 「插件的字体也需要联动调整大小」 | 字号设置不在 CSS 变量里 | §4.2 四步接入 |
| 11 | 「入口迁移后布局和设置页不一样」 | 迁移入口未做交互对齐 | §5.1 迁移清单 |
| 12 | 「工具数量列表和更新里对不上」 | 两处数据源口径不同 | 界面数字必须同源 |

还有一个实现级坑：`Object.assign({ onClick: 动作 }, tooltipHandlers(...))` 会让后者覆盖 `onClick`，**所有带提示的按钮动作失效**。追加行为必须用独立属性 `onClickCapture`。

### 11.2 Skills 管理（`session-54e21ba6…`，2026-11-06 ~ 11-10）

46 条人类指令，几乎全部是视觉/交互一致性。

| # | 用户反馈 | 根因 | 规范落点 |
| --- | --- | --- | --- |
| 1 | 「悬停在 tab 栏时，需要和系统表现保持一致」 | 自创 hover/选中配色 | §6.3 hover 与选中同背景 |
| 2 | 「弹窗大小需要和 DSH 默认弹窗一致」 | 尺寸自定（原 560 / 720） | §6.7 三档实测值 |
| 3 | 「弹窗出来后底层没有变灰」 | 遮罩透明 | §6.7 `bg-mask-1` |
| 4 | 「图标和文字中间间隔这么大」 | `space-between` + `min-width` 过大 | §7.4 左对齐 + 8px |
| 5 | 「技能页字体偏小」「顶部太近」「太靠边」 | 未对齐原生页 960 / 28px / 字号 | §5.3 页面骨架 |
| 6 | 「悬停后点进详情，提示一直不消失」 | 触发元素卸载未清理 | §8.2 切换视图隐藏 |
| 7 | 「页面打开很慢」「详情不是一起显示」 | 首屏分包渲染 | §8.6 首屏一次成型 |
| 8 | 「三个图标改成插件页按钮一样的样式」 | 图标按钮规格不统一 | §6.2 32×32 + 16 图标 |
| 9 | 「编辑图标和 MCP 插件保持一致」 | 同一语义两套图形 | §7.3 语义名统一 |
| 10 | 「描述太口语化，正规点」 | 文案风格未约束 | §9 文案规范 |

方法论沉淀：**不要凭感觉调，去 asar 里把原生 CSS 挖出来照做**。skill-manager 的 `native-parity.md` 就是这次挖出来的实测记录（filterTab 28px、hover 与选中同背景、`interactive-bg-hover` 实测值等）。

### 11.3 会话统计（`session-22146bb5…`，2026-11-04 ~ 11-05）

12 条人类指令，偏功能与布局。

| # | 用户反馈 | 规范落点 |
| --- | --- | --- |
| 1 | 「会话用量默认前 5 条，查看更多 +5，固定 10 条后滚动」 | §8.6 长列表分页口径 |
| 2 | 「总 token 和成本折线图不在一个水平线上」 | §8.6 图表基线对齐 |
| 3 | 「打开时等待一段时间，显得卡」 | §8.6 首屏瞬时 |
| 4 | 「再次点击入口可以关闭页面」 | §5.1 入口 toggle 行为 |
| 5 | 「已归档」位置反复调 20px→3px→5px | §3.10 间距刻度，先定规范再实现 |

### 11.4 跨会话共性

1. **80% 的返工是「和原生不一致」**，不是功能缺失。所以规范的第一原则是原生优先。
2. **数值微调是返工信号**：同一个间距被要求改三次（20→3→5px），说明缺一张间距/尺寸刻度表。本文件给出固定值，不再逐次试。
3. **弹窗与 Tooltip 是重灾区**：尺寸、颜色、遮罩、发光、点击穿透、残留——全部集中在 §6.7/§6.8。
4. **入口迁移引发回归**：换挂载点必须重测布局、弹窗、事件，不能只改一行注册。
5. **文案与视觉同等重要**：口语化、解释性文字、图标文字分离，都会被退回。

---

## 12. 外部生态怎么保证插件统一

调研对象：VS Code、Figma、Obsidian、Grafana 等有成熟插件生态的产品。

### 12.1 四个生态的做法

| 生态 | 统一机制 | 关键事实 |
| --- | --- | --- |
| **VS Code** | 宿主注入 `--vscode-*` 主题变量 + UX 指南（webview 内所有元素必须可主题化、满足可访问性） | 官方组件库 `vscode-webview-ui-toolkit` 已弃用，`--vscode-*` 变量反而是长期路径 |
| **Figma** | 插件 UI 是 iframe，官方**不提供**组件库；靠 `figma.showUI(__html__, { themeColors: true })` 注入 `--figma-color-*` | 命名公式 `--figma-color-{type}-{role}-{prominence}-{interaction}` |
| **Obsidian** | Review 条款级禁止硬编码样式：`el.style.color = 'white'` 违规，必须 class + `var(--text-normal)`；禁止 `<h1>`，必须 `setHeading()` | 理由原文：否则「不同插件之间样式不一致」 |
| **Grafana** | 必须用 `@grafana/ui`；自定义样式用 `useStyles2`；明令「Never hardcode visual properties」「Never use global styles」；`@grafana/plugin-e2e` 做 CI | 组件库 + e2e 是目前最重的约束 |

来源：[VS Code Webview UX guidelines](https://code.visualstudio.com/api/ux-guidelines/webviews)、[Figma CSS variables for plugins](https://developers.figma.com/docs/plugins/css-variables/)、[Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)、[Grafana plugin best practices](https://grafana.com/developers/plugin-tools/key-concepts/best-practices)。

### 12.2 三种机制，按成本排序

1. **不可协商的 token 契约**（成本最低、最持久）：宿主提供语义化 CSS 变量，插件只允许引用变量。VS Code、Figma、Obsidian 都是这一档。
2. **官方组件库**（成本中、会腐化）：Grafana 的 `@grafana/ui`、VS Code 已弃用的 toolkit。要求插件能 import npm 包。
3. **CI 强制**（成本高、最硬）：lint 禁字面色值、视觉回归、PR 检查清单。

结论：**真正长寿的是薄契约（token）+ 穷举式组件规格 + CI 红灯**，不是厚组件库。

### 12.3 对我们（DSH 插件）的取舍

DSH 的浏览器半边**只能 `require('react')`**，不能引第三方 UI 库，插件各自独立安装。因此：

- 不能照搬 Grafana 的「import 组件库」模式。
- 能完全照搬的是 **token 契约**：`--dsw-*` 已经由宿主注入，本文件 §3 就是它的使用规范。
- 能部分照搬的是 **穷举式规格**：§6 把每个控件写成可直接复制的 CSS。
- 能自建的是 **CI 校验**：§10.4 的静态检查（禁字面色值/硬编码字号/发光）。
- 做不到的是「运行时共享组件」：所以只能用「仓库内单一源 + 复制时保持与本文一致 + 验收清单」替代。

### 12.4 对外部经验的 8 条落地

1. 颜色/圆角/字号一律走 token 与阶梯（§3、§4）。
2. 每个控件只有一种实现，禁止自绘第二套（§6）。
3. 图标走白名单 + 三档尺寸（§7）。
4. 四态齐全，focus 用原生方式表达（§8.1）。
5. 样式作用域在插件根节点，禁止全局选择器（§10.2）。
6. 文案进规范，破坏性操作写后果（§9）。
7. 静态 lint 进 `pnpm test`（§10.4，建议）。
8. 视觉回归用 `tools/preview.mjs` 做明暗两套截图基线（§10.4，建议）。

---

## 13. 现状与收敛计划

### 13.1 三个插件的差异

| 维度 | `mcp-manager` | `skill-manager` | `session-stats` | 本规范 |
| --- | --- | --- | --- | --- |
| 字号变量 | `--mm-fs` | `--sm-fs` | 无（硬编码） | `--ds-fs` |
| 页面正文字号 | `-1px`（13px） | `-1px`（13px） | 14px | `var(--ds-fs)`（14px） |
| 硬编码字号 | 0 | 0 | 49 处 | 0 |
| 按钮 | 36px / radius 9 | 32px / radius 12 | 无按钮类 | 36 / 28，radius-md / sm |
| 图标按钮 | 32×32 / radius 8 | 28×28（工具栏 30×30）/ radius-sm | 无 | 32×32 / radius-sm |
| 图标描边 | 1.8 | 1.5 与 1.8 混用 | 1 / 1.5 / 1.8 / 2 混用 | 1.5 |
| Tooltip | 深底 + 边框 + `label-secondary` | 浅底反色 | 无 | 原生 `tooltip-bg` + 白字 |
| 弹窗宽度 | 640 / 360 | 488 / 480 / 720 | 无 | 488 / 480 / 720 |
| 遮罩 | 透明（设置页内嵌，符合规范） | `bg-mask-1`（独立页面，符合规范） | — | 独立页 `bg-mask-1` / 设置页透明 |
| 内容列 | 640（嵌设置页） | 960 | 1040 | 960（嵌设置页 640） |
| 顶部 inset | 未统一 | 76px 硬编码 | 28 + clearance | `28 + clearance` |
| 焦点 | 未统一 | 背景+文字 | outline ring | 分控件类型 |

### 13.2 收敛优先级

**P0（挡住新代码分叉，改起来小）**

1. 新插件一律用 `--ds-fs` 与 §4 阶梯，禁止硬编码字号。
2. 新插件按钮/图标按钮/Tooltip/弹窗复制 §6 的实现，不再自创。
3. Tooltip 统一 300ms + 原生气泡样式。

**P1（存量对齐，需改代码 + 回归）**

4. `session-stats` 接入字号联动（49 处硬编码字号），内容列 1040 → 960，焦点改原生表达。
5. `mcp-manager` 弹窗宽度收敛到三档，遮罩改 `bg-mask-1`，Tooltip 改原生气泡。
6. `skill-manager` Tooltip 改原生深色气泡（当前是浅底反色），顶部 inset 改 `calc(28px + clearance)`，图标描边统一 1.5。

**P2（长期机制）**

7. `scripts/check-plugins.mjs` 增加 §10.4 静态检查。
8. `tools/preview.mjs` 扩展为多插件明暗截图基线。
9. 抽出共享的 `ICON_GLYPHS` 清单，三插件语义名统一。

### 13.3 验收方法

1. **并排**：同屏打开原生「插件」页与插件页，对照 §5.3 的列宽、顶部间距、字号。
2. **hover 取计算值**：`getComputedStyle` 必须命中 §3 的 token 实际值（深色 hover 底约 `rgba(255,255,255,.08)`）。
3. **不位移**：hover 前后 `getBoundingClientRect()` 完全一致。
4. **弹窗四查**：宽度档位、遮罩是否变灰、有无发光、Escape 只关一层。
5. **Tooltip 三查**：300ms 才出现、移出立即消失、字号比正文小一档。
6. **真机**：ego lite 实际操作一遍，覆盖 hover / 点击 / 窄屏 / 明暗主题。

---

## 14. 附录：新插件开工清单

**动手前**

- [ ] 打开原生「插件」「自动化任务」「设置」页，截图量出目标控件尺寸
- [ ] 确定入口挂载点（§5.1 决策树）
- [ ] 列出需要的图标，从 §7.3 语义名里挑，缺的才新增

**样式**

- [ ] 根节点 `class="ds-root" data-plugin="<slug>"`，共享组件用 `ds-`，专属样式才用 `<prefix>-`
- [ ] 颜色只来自 `--dsw-*`，无字面色值
- [ ] 字号只来自 `--ds-fs` 阶梯，无非阶梯值、无半像素
- [ ] 内容列 960（嵌设置页 640），顶部 `calc(28px + clearance)`
- [ ] 按钮/图标按钮/Tab/输入框/卡片复制 §6，不自创
- [ ] 弹窗三档 + 遮罩（独立页 `bg-mask-1` / 设置页透明）+ `box-shadow: none` + Escape 分层
- [ ] Tooltip 300ms、仅悬停、原生气泡、单实例、挂 body
- [ ] 图标 24 画布 / 1.5 描边 / `currentColor` / 16 默认
- [ ] 图标与文字左对齐成组，间距 6–8px

**交互**

- [ ] hover 与选中同背景，只变文字色；无位移/缩放/描边
- [ ] focus-visible 有可见反馈（列表项背景、表单控件焦点环）
- [ ] 纯图标按钮有 `aria-label`，与 Tooltip 文案一致
- [ ] 危险操作二次确认，文案写清后果
- [ ] 长文本单行截断 + 完整值 Tooltip
- [ ] 首屏一次性渲染，骨架与异步内容同时出现
- [ ] 空状态一句话、加载 >300ms 才显示转圈

**交付前**

- [ ] `node --check`、`pnpm test`
- [ ] locale zh/en 键集一致、无未引用键
- [ ] 与原生页并排截图对比（§13.3）
- [ ] ego lite 实测：hover / 点击 / 窄屏 / 明暗
- [ ] 更新本文件的「现状差异表」（若新增了偏离项，先改规范再改代码）
