# DSH Web 插件 UI 开发手册

这份手册沉淀自 `mcp-manager` 插件的完整迭代（2026-11-05 ~ 11-06，从原型还原到字号联动，
共 20+ 个版本）。每一条都来自真实的返工，不是推测。

配套文档：
- [`agent-iteration-playbook.md`](agent-iteration-playbook.md) —— 多 agent 迭代流程与提速
- [`../plugins/mcp-manager/DESIGN.md`](../plugins/mcp-manager/DESIGN.md) —— 完整 UI 契约示例

---

## 一、字号与字体：必须跟设置联动

### 1.1 字号设置的真相

DSH 的「设置 → 通用设置 → 字号大小」**不是 CSS 全局变量**，它写在 `ui-theme` 插件的配置里：

```yaml
- id: ui-theme
  name: "@deepseek-ai/dsh-client-ui-theme"
  config:
    preference: dark
    fontSize: 16      # ← 用户调的就是这个
```

而 `--dsh-content-font-size` 只在**会话内容区**生效，设置面板里读不到（整条祖先链上都没有该变量）。
所以插件**无法靠 CSS 继承**拿到字号，必须从宿主 theme service 读取（Host 读 patch 仅作降级兜底）。

> 以上是 2026-11 当时 DSH 环境的实测事实，用于解释为何不能只靠 CSS 继承；不代表所有 DSH 版本或所有挂载点。当前公开的 theme service 已核实提供 `ctx.theme.getTheme().fontSizes.text`（见 1.2），新实现以该接口为首选来源。

### 1.2 正确做法：客户端读 theme service → 根节点设 `--ds-fs` → 阶梯计算

**首选：客户端从 theme service 读当前生效字号。** 浏览器半边 `inject` 里声明 `theme`，用
`ctx.theme.getTheme().fontSizes.text` 取当前快照；再用 `ctx.on('theme/change')` 订阅变化，
页面不重开也要持续跟随。

```js
return {
  inject: ['slots', 'locale', 'theme'],
  apply(ctx) {
    function clampFontSize(value) {
      const size = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 14
      return Math.min(24, Math.max(10, size))
    }

    // 1) 读当前快照：fontSizes.text 就是宿主「设置 → 通用设置 → 字号大小」
    function readFontSize(fallback) {
      try {
        const snapshot = ctx.theme.getTheme()
        if (snapshot !== null && snapshot !== undefined && snapshot.fontSizes !== undefined) {
          return clampFontSize(snapshot.fontSizes.text)
        }
      } catch (error) {
        /* 降级到 Host 带出的 state.fontSize */
      }
      return clampFontSize(fallback)
    }

    // 2) 订阅主题变化，挂载期间持续跟随；卸载时释放
    const off = ctx.on('theme/change', (snapshot) => {
      if (snapshot !== null && snapshot !== undefined && snapshot.fontSizes !== undefined) {
        setFontSize(clampFontSize(snapshot.fontSizes.text))
      }
    })
    ctx.effect(() => () => {
      if (typeof off === 'function') off()
    })
  },
}
```

**降级：Host 读 patch → `state.fontSize` 带出。** 仅在 theme service 不可用、或
`fontSizes.text` 缺失/无效时使用，不能反过来当首选来源：

```js
async function themeFontSize() {
  const paths = await resolvePaths()
  for (const file of [paths.profilePatch, paths.homePatch]) {
    const content = await readPatchFile(file).catch(() => '')
    if (content.trim() === '') continue
    // 不要整文件 YAML 解析！见下方 1.3
    const match = /(?:^|\n)\s*-\s+id:\s*['"]?ui-theme['"]?[\s\S]{0,800}?\bfontSize:\s*(\d{1,2})/u.exec(content)
    if (match !== null) {
      const size = Number(match[1])
      if (Number.isFinite(size) && size >= 10 && size <= 24) return Math.round(size)
    }
  }
  return null
}
```

然后 `state` 返回 `{ ..., fontSize }`，客户端把它作为 `readFontSize(state.fontSize)` 的兜底传入。

**客户端**：页面根节点注入 CSS 变量。

```js
h('div', {
  className: 'mm-root',
  style: { '--ds-fs': fontSize + 'px' },
}, ...)
```

**样式层**：所有字号都写成基于 `--ds-fs` 的阶梯，不写死像素。

```css
.mm-root { --ds-fs: var(--dsh-content-font-size, 14px); font-size: var(--ds-fs); }

/* 阶梯表（基准 14px，实际取值随设置变化；完整七档见 design.md §3.3） */
.font-20 { font-size: calc(var(--ds-fs) + 6px); }   /* 页面主标题 */
.font-16 { font-size: calc(var(--ds-fs) + 2px); }   /* 区块标题 */
.font-15 { font-size: calc(var(--ds-fs) + 1px); }   /* 弹窗标题 */
.font-14 { font-size: var(--ds-fs); }               /* 正文、大号按钮、Tab、标签 */
.font-13 { font-size: calc(var(--ds-fs) - 1px); }   /* 次要、输入框、菜单项 */
.font-12 { font-size: calc(var(--ds-fs) - 2px); }   /* 辅助、徽章、时间、Tooltip */
.font-11 { font-size: calc(var(--ds-fs) - 3px); }   /* 弱化、图表轴标签 */
```

改造时可用脚本批量替换（本项目 44 处一次性改完）：

```python
import re
steps = {'20px': 'calc(var(--ds-fs) + 6px)', '16px': 'calc(var(--ds-fs) + 2px)',
         '15px': 'calc(var(--ds-fs) + 1px)', '14px': 'var(--ds-fs)',
         '13px': 'calc(var(--ds-fs) - 1px)', '12px': 'calc(var(--ds-fs) - 2px)',
         '11px': 'calc(var(--ds-fs) - 3px)'}
text = re.sub(r'font-size:([0-9.]+px)', lambda m: 'font-size:' + steps[m.group(1)], text)
```

### 1.3 三个必踩的坑

**坑 1：整文件 YAML 解析会失败。**
patch 文件里可能有 `{{SECRET_xxx}}` 这类 flow 写法，自研的 YAML 子集解析器会整体抛错。
→ 用**文本正则**定位目标配置段，不要解析整个文件。

**坑 2：`--ds-fs` 传不到 body 上的节点。**
Tooltip 是挂在 `<body>` 末尾的（不能放在页面容器内，否则被 `overflow:hidden` 裁掉），
而 `--ds-fs` 定义在 `.mm-root` 上 → tooltip 拿不到变量，字号不生效。

→ 每次显示前把当前比例同步过去，不要只在创建节点时复制一次（否则字号快照会过期，见 design.md §3.7）：

```js
function syncFontSize(node) {
  const root = document.querySelector('.mm-root')
  if (root === null) return
  const scale = getComputedStyle(root).getPropertyValue('--ds-fs').trim()
  if (scale !== '') node.style.setProperty('--ds-fs', scale)
}
```

显示 Tooltip 时调用 `syncFontSize(node)`；宿主字号变化后也重新同步。

**坑 3：`calc()` 里的变量必须有 fallback。**
插件不保证在设置面板内渲染，`var(--ds-fs)` 可能为空。
→ 定义时给默认值：`--ds-fs: var(--dsh-content-font-size, 14px);`

### 1.4 字号层级：与 design.md §3.3 的七档对齐

不要所有文字一个尺寸，也不要自建四层/五层体系。层级固定为 design.md §3.3 的七档，
不允许半像素：

| 档位 | 计算 | 基准 14px 时 | 用途 |
| --- | --- | --- | --- |
| 页面主标题 | `fs + 6px` | 20px | 独立页面顶栏标题 |
| 区块标题 | `fs + 2px` | 16px | 卡片大标题、面板主标题 |
| 弹窗标题 | `fs + 1px` | 15px | 弹窗/抽屉标题 |
| 正文 | `fs` | 14px | 页面正文、大号按钮、Tab、表单 Label |
| 次要 | `fs - 1px` | 13px | 列表副标题、输入框、菜单项、中号按钮 |
| 辅助 | `fs - 2px` | 12px | 徽章、时间、URL 摘要、小号按钮、**Tooltip** |
| 弱化 | `fs - 3px` | 11px | 图表轴标签、极弱提示 |

**Tooltip 用辅助档 `fs - 2px`**，不是 `fs - 4px`；字号只影响文本，不缩放控件（design.md §3.6）。

---

## 二、Tooltip（帮助框）：小 2px + 深底浅字

### 2.1 视觉规范

Tooltip 是**辅助信息**，不是正文。它必须看起来"轻"，否则会抢走主内容的注意力：

```css
.mm-tooltip {
  font-size: calc(var(--ds-fs) - 2px);              /* 辅助档：比正文小 2px */
  color: var(--dsw-static-neutral-bluish-00);       /* 深底上的浅色文字 */
  background: var(--dsw-alias-tooltip-bg);          /* 两种主题都是深底 */
  box-shadow: none;                                  /* 不要发光！见 3.1 */
  border-radius: var(--dsw-radius-sm);
  padding: 3px 7px;
  max-width: min(40vw, 290px);
  line-height: 1.35;
  pointer-events: none;                              /* 永不拦截鼠标 */
}
```

**三层对比**（这是"层次感"的来源）：

| 元素 | 字号 | 颜色 |
|---|---|---|
| 正文 | `var(--ds-fs)` | `--dsw-alias-label-primary` |
| 次要信息（URL 摘要、时间） | `calc(var(--ds-fs) - 2px)` | `--dsw-alias-label-tertiary` 或 secondary |
| Tooltip | `calc(var(--ds-fs) - 2px)` | `--dsw-static-neutral-bluish-00` |

### 2.2 交互规范

- **触发**：悬停或键盘聚焦 **300ms** 后显示（1000ms 太慢，用户会以为没反应）；移出/按下/滚动/切换视图立即隐藏。
- **不加点击触发**：点击通常有自己的动作（打开弹窗、切换状态），叠一个浮层会互相打断；点击引起的聚焦也不得重新触发，键盘聚焦仍须可用（design.md §7.7）。
- **单个实例**：全页面只有一个 tooltip 节点，切换目标时复用。
- **边缘处理**：靠近视口边缘时翻转/夹紧，不能超出屏幕。
- **层级**：`z-index` 要高于弹窗（本项目用 2000，弹窗 1200）。

---

## 三、弹窗（Dialog）

### 3.1 不要发光

宿主主题对每个 `[role="dialog"]` 都有默认阴影：

```
rgba(255,255,255,0.2) 0 0 0 0.5px, rgba(0,0,0,0.04) 0 3px 8px, rgba(0,0,0,0.05) 0 0 20px
```

这条规则优先级高于普通类选择器，**只改 CSS 不够**，必须内联覆盖：

```js
style: { boxShadow: 'none' }
```

同时 tooltip 也不要阴影、不要边框——整体保持"平面 + .5px 边框"的语言（design.md §2.4 / §7.7）。

### 3.2 标准弹窗固定档位，覆盖宿主必须显式选择

弹窗分 `standard`（默认）与 `cover-host` 两种模式；不能按「非确认即覆盖」自动推断。

标准档位按 design.md §7.6，宽度统一夹到视口内：

| 档位 | 宽度 | 圆角 | 用途 |
| --- | --- | --- | --- |
| 确认 | `min(480px, 100vw - 32px)` | `radius-xl` | 删除/覆盖确认 |
| 表单 | `min(488px, 100vw - 32px)` 或 `min(560px, 100vw - 32px)` | `radius-panel` | 新建/编辑 |
| 大内容 | `min(720px, 100vw - 32px)` | `radius-panel` | 多源、代码预览 |

标准模式不测量宿主，高度上限 `max-height: calc(100vh - 96px)`；尺寸固定，不随内容变化。内容区是唯一滚动容器，短视口下用 `min-height: 0` 防止底部按钮被裁。

`cover-host` 只用于设置页等宿主容器内确需覆盖宿主面板的管理型弹窗（如 MCP 的新增/编辑），且必须显式传 `mode: 'cover-host'`：

- 位置与宽高跟随宿主矩形和视口，超出视口时按四边 16px 安全边距限幅；不写死 `800×800`，极小视口仍保证计算有限、非负。
- 宿主测量缺失或无效时，宽度回退 `min(640px, 100vw - 32px)` 并居中、高度上限回退 `calc(100vh - 96px)`；覆盖模式圆角采用 `radius-lg`。
- 有效测量时高度按宿主可用矩形与视口收缩，不再额外套用标准模式的 `100vh - 96px`；内容区滚动。
- 尺寸监听/观察器随弹窗卸载清理；确认弹窗仍为标准 480 档，不随宿主变化。

### 3.3 背景与遮罩按入口区分

普通弹窗（含设置页内嵌）的默认背景是 `--dsw-alias-bg-layer-2`：它随主题自适应，深色下与设置面板同色，浅色下为白色面板色，不会看起来像"另一个应用"。

```css
.mm-dialog,
.mm-dialog-embedded { background: var(--dsw-alias-bg-layer-2); }
```

**不要用 `--dsw-static-neutral-bluish-850` 充当主题背景。** 它是固定深色（#2c2c2e），浅色主题下会变成深底深字（对比度约 1.36:1），无法阅读。design.md §2.2/§7.6 已统一为：弹窗、抽屉与设置页内嵌一律 `--dsw-alias-bg-layer-2`，850 不再是弹窗档位的背景。

遮罩按入口区分：
- 设置页内嵌弹窗（含 `cover-host`）：`background: transparent`，不要压暗下面的设置面板；
- 独立页面弹窗：`background: var(--dsw-alias-bg-mask-1)`。

> 注意：`--dsw-hovercard-bg` 在主题里**未定义**（取值为空），别拿它当兜底。

### 3.4 遮罩按入口、Escape 分层

- 遮罩按入口区分：设置页内嵌 `background: transparent`（不要压暗下面的设置面板）；独立页面用 `var(--dsw-alias-bg-mask-1)`。
- 多弹窗叠加时，Escape / 遮罩点击只关**最上层**：维护 `dialogStack`，捕获阶段 `stopImmediatePropagation`。
- 标准弹窗使用固定档位，内容区滚动；`cover-host` 只有显式选择时才覆盖宿主，位置/宽高随宿主与视口测量更新并限制在视口内。短视口下正文要 `min-height: 0`，否则底部按钮被裁。

### 3.5 嵌入页面的内容宽度

弹窗内页面撑满 800px 会显得空。与设置页对齐的做法是**内容列 640px 居中**：

```css
.mm-root-embedded { padding: 16px 20px; align-items: stretch; }
.mm-root-embedded .mm-head,
.mm-root-embedded .mm-list { width: 100%; max-width: 640px; margin-left: auto; margin-right: auto; }
```

这里的 640px 是**设置页内容列宽度**（design.md §4.4），不是弹窗档位，也不是 `cover-host` 的外框宽度；覆盖外框始终按宿主矩形测量，640 只是测量无效时的回退宽度。

---

## 四、交互陷阱（都真的踩过）

### 4.1 在宿主行里渲染组件：不要嵌套 `<button>`

侧边栏 `sidebar.panellist` 槽位的宿主结构是：

```html
<button class="panelRow">          ← 宿主渲染整行
  <span class="panelGlyph">        ← 预留 16×16 图标槽
    <div data-slot="sidebar.panellist">  ← 我们的组件在这里
      <svg width="16" height="16">…</svg>
    </div>
  </span>
  <span class="panelTitle">文字</span>     ← 宿主渲染
</button>
```

我们最初渲染了 `<button style="width:100%">` + 18px 图标，结果：
- 图标比别的入口大 2px、对不齐；
- 点文字区无效（事件落在宿主按钮上）。

**正确做法**：只渲染 16×16 图标，在 `useEffect` 里 `closest('button')` 拿到宿主行并接管点击。

### 4.2 `Object.assign` 合并 handlers：用 Capture 变体

```js
Object.assign({ onClick: 动作 }, extraHandlers())
//                                   ↑ 若返回 onClick，会覆盖掉"动作"
```

后来者胜出 → **所有按钮动作失效**。要追加行为就用独立属性：

```js
onClickCapture: (e) => { /* 追加行为，如埋点 */ }   // 与 onClick 互不影响
```

### 4.3 事件冒泡：弹窗渲染在触发者的 DOM 子树里

侧边栏入口弹出的 dialog 在那一行的子树内，所以：
- 行上的 capture 监听会收到弹窗内的所有点击 → 误关闭；
- 若在 capture 里 `stopPropagation`，React 的合成事件（委托在 root）收不到 → **弹窗内所有按钮失灵**。

**正确规则**：
- 弹窗内点击：**完全放行**（不 preventDefault、不 stopPropagation）；
- 只有落在行自身（非 `.mm-dialog`）的点击才接管。

```js
const onClick = (event) => {
  const target = event.target
  if (target?.closest?.('.mm-dialog') !== null) return   // 放行
  event.preventDefault(); event.stopPropagation()
  setOpen((v) => !v)
}
```

---

## 五、数据与配置写入

### 5.1 Clean Config：不要写空值和默认值

用户没填的、等于默认值的一律不写进配置文件：

```js
if (values.cwd !== '') config.cwd = values.cwd
if (Object.keys(values.env).length > 0) config.env = values.env
if (values.timeout !== DEFAULT_TIMEOUT_MS) config.toolCallTimeoutMs = values.timeout
```

**例外**：数组里的空字符串可能是**合法位置参数**（argv 占位），不能过滤。要在规范里显式声明这个例外。

### 5.2 文本域 ↔ 数组：必须加脏标记

`args` 这类"每行一个值"的字段，如果每次输入都解析回数组再重新渲染，会：
- 删掉用户正在输入的空行（无法换行）；
- 把参数内的换行拆成多个参数。

**做法**：独立编辑态 + `dirty` 标记，只在**失焦、切换标签、提交**时解析：

```js
const [argsText, setArgsText] = useState(...)
const [argsDirty, setArgsDirty] = useState(false)
// onChange: setArgsText(v); setArgsDirty(true)
// validate(): argsDirty ? argsFromText(argsText) : draft.args
```

### 5.3 复用已有连接，不要重复建连

有些 MCP 服务器只允许**单个并发会话**，重复连接会返回 `503 Server busy`。
若运行时已持有连接，直接从工具注册表读取（`ctx.tools.schemas()`），不要新建连接。

### 5.4 容错解析：坏数据不能让整组消失

自研配置解析器遇到不认识的写法时，应把对应条目降级为**只读**并给出 warning，
而不是整组丢弃——否则用户会看到空列表，还可能重复创建同名条目。

---

## 六、主题 token 速查

| 用途 | token |
|---|---|
| 弹窗/抽屉/菜单背景（独立页面） | `--dsw-alias-bg-layer-2` |
| 设置页内嵌弹窗背景（与设置面板同色） | `--dsw-alias-bg-layer-2`（主题自适应；不要用固定 `850`） |
| 遮罩（独立页面） | `--dsw-alias-bg-mask-1` |
| 卡片、输入框背景 | `--dsw-alias-bg-layer-1` / `--dsw-alias-bg-layer-3` |
| 边框、分割线 | `--dsw-alias-border-l1` / `--dsw-alias-border-l2` |
| 主文字 | `--dsw-alias-label-primary` |
| 次文字（说明、hover 中的图标） | `--dsw-alias-label-secondary` |
| 弱化文字 | `--dsw-alias-label-tertiary` |
| Tooltip 文字 | `--dsw-static-neutral-bluish-00` |
| Tooltip 背景 | `--dsw-alias-tooltip-bg` |
| 成功 / 警告 / 错误 | `--dsw-alias-state-success-primary` / `--dsw-alias-state-warn-primary` / `--dsw-alias-state-error-primary` |
| 品牌色 | `--dsw-alias-brand-primary` |
| hover 背景 | `--dsw-alias-interactive-bg-hover` |
| ⚠️ 未定义，别用 | `--dsw-hovercard-bg` |

**禁止字面色值**：需要浅底用 `color-mix(in srgb, var(--dsw-…) 12%, transparent)`。

---

## 七、开工检查清单

### 7.1 列表与条目高度的适用条件

- **主管理列表**（承担增删改查、是页面主内容的列表）：完整结果应全部可访问，默认配搜索与单一滚动容器，不套用 5 条预览；大量数据可按需要分批加载或虚拟渲染，但展示阈值不能成为数据上限，搜索仍覆盖全部结果。MCP 服务器主列表保持完整展示，不新增「查看更多」。
- **摘要卡片**：允许展示前 5 条并提供「查看全部」；该预览规则不得套用到主管理列表。
- **工具明细等长内容**：用搜索/过滤加限高滚动，展示策略不得减少实际注册或可用工具；协议及防御性摘要上限归运行时契约，不与列表预览混同。
- **条目高度**：44–56px 只是常规字号单行紧凑行的参考；双行/多行条目按文本行高、行间距与上下内边距自然计算，不锁死 82px、不压到 56px、不缩小字号；展开区另计。
- **分隔线**：默认 `.5px border-l1`；设置页等存在宿主原生等价列表时，按等价项实测取 l1 或 `.5px border-l2`（MCP 当前为 l2），不把所有列表一律升级为 l2。

### 7.2 逐条确认

新建带 UI 的 DSH 插件时，逐条确认：

- [ ] 字号接入 `--ds-fs` 阶梯，不写死 px；客户端优先读 `ctx.theme.getTheme().fontSizes.text` 并订阅 `theme/change`，`state.fontSize` 仅作兜底
- [ ] Tooltip：300ms 延迟、悬停或键盘聚焦、比正文小 2px（辅助档）、`--dsw-static-neutral-bluish-00` 文字色、无阴影
- [ ] 弹窗：标准档位（确认 480 / 表单 488 或 560 / 大内容 720）；覆盖宿主仅在显式 `mode: 'cover-host'` 时启用，跟随宿主与视口，640 仅为无有效宿主测量回退；确认弹窗保持标准 480；背景 `--dsw-alias-bg-layer-2`（含设置页内嵌，不用固定 `850`）、`box-shadow: none`、遮罩按入口区分（设置页内嵌透明，独立页面 `bg-mask-1`）
- [ ] 主管理列表完整可访问 + 搜索 + 单一滚动容器；5 条预览/查看全部只用于摘要卡片；工具明细用搜索/限高滚动，展示策略不减少实际注册或可用工具
- [ ] 条目高度：单行 44–56px 仅作常规字号参考；双行/多行自然高度，不锁死 82px、不压到 56px、不缩小字号；设置页分隔线按宿主等价项取 l1/l2
- [ ] Escape / 遮罩点击只关最上层；短视口正文可收缩
- [ ] 图标按钮：内联 SVG、统一 16×16（或宿主槽位尺寸）
- [ ] 追加行为用独立属性（`onClickCapture`），不要用 `Object.assign` 覆盖 `onClick`
- [ ] 事件：弹窗内点击完全放行，不要 stopPropagation 打断 React 合成事件
- [ ] 配置写入遵守 Clean Config（空值/默认值不写），并声明合法例外
- [ ] 文本域字段加脏标记，避免输入/换行被破坏
- [ ] 颜色只用 token，无字面色值；class 前缀统一
- [ ] locale：中英键集一致、值非空、每键在字典外被引用
- [ ] `node --check` + `pnpm test` + 真机浏览器实测（悬停/点击/缩放/窄屏）