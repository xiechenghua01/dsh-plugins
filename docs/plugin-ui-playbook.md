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
所以插件**无法靠 CSS 继承**拿到字号，必须自己从配置读取。

### 1.2 正确做法：Host 读 → state 带出 → 根节点设变量 → 阶梯计算

**Host 侧**（`index.js`）：从 patch 层读 `ui-theme.fontSize`，profile 层优先、home 层兜底。

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
      if (Number.isFinite(size) && size >= 10 && size <= 40) return Math.round(size)
    }
  }
  return null
}
```

然后 `state` 返回 `{ ..., fontSize }`。

**客户端**：页面根节点注入 CSS 变量。

```js
h('div', {
  className: 'mm-root',
  style: fontSize === null ? undefined : { '--mm-fs': fontSize + 'px' },
}, ...)
```

**样式层**：所有字号都写成基于 `--mm-fs` 的阶梯，不写死像素。

```css
.mm-root { --mm-fs: var(--dsh-content-font-size, 14px); font-size: calc(var(--mm-fs) - 1px); }

/* 阶梯表（基准 14px，实际取值随设置变化） */
.font-16 { font-size: calc(var(--mm-fs) + 2px); }   /* 大标题 */
.font-15 { font-size: calc(var(--mm-fs) + 1px); }   /* 弹窗标题 */
.font-14 { font-size: var(--mm-fs); }               /* 弹窗正文、输入框、标签 */
.font-13 { font-size: calc(var(--mm-fs) - 1px); }   /* 列表页正文 */
.font-12 { font-size: calc(var(--mm-fs) - 2px); }   /* 次要信息、徽章 */
.font-11 { font-size: calc(var(--mm-fs) - 3px); }   /* 弱化说明 */
```

改造时可用脚本批量替换（本项目 44 处一次性改完）：

```python
import re
steps = {'16px': 'calc(var(--mm-fs) + 2px)', '15px': 'calc(var(--mm-fs) + 1px)',
         '14px': 'var(--mm-fs)', '13px': 'calc(var(--mm-fs) - 1px)',
         '12px': 'calc(var(--mm-fs) - 2px)', '11px': 'calc(var(--mm-fs) - 3px)'}
text = re.sub(r'font-size:([0-9.]+px)', lambda m: 'font-size:' + steps[m.group(1)], text)
```

### 1.3 三个必踩的坑

**坑 1：整文件 YAML 解析会失败。**
patch 文件里可能有 `{{SECRET_xxx}}` 这类 flow 写法，自研的 YAML 子集解析器会整体抛错。
→ 用**文本正则**定位目标配置段，不要解析整个文件。

**坑 2：`--mm-fs` 传不到 body 上的节点。**
Tooltip 是挂在 `<body>` 末尾的（不能放在页面容器内，否则被 `overflow:hidden` 裁掉），
而 `--mm-fs` 定义在 `.mm-root` 上 → tooltip 拿不到变量，字号不生效。

→ 创建节点时把当前比例复制过去：

```js
const root = document.querySelector('.mm-root')
if (root !== null) {
  const scale = getComputedStyle(root).getPropertyValue('--mm-fs').trim()
  if (scale !== '') node.style.setProperty('--mm-fs', scale)
}
```

**坑 3：`calc()` 里的变量必须有 fallback。**
插件不保证在设置面板内渲染，`var(--mm-fs)` 可能为空。
→ 定义时给默认值：`--mm-fs: var(--dsh-content-font-size, 14px);`

### 1.4 字号层级的设计建议

不要所有文字一个尺寸。推荐四层，相邻层差 1~2px：

| 层级 | 用途 | 相对基准 |
|---|---|---|
| 页面标题 | 面板主标题（可选，宿主可能已有） | +2px |
| 弹窗标题 | 编辑器/确认框标题 | +1px |
| 正文 | 列表正文、弹窗字段、输入框 | 基准 |
| 次要 | 徽章、时间、URL 摘要 | −2px |
| 弱化 | tooltip、占位提示 | −4px |

---

## 二、Tooltip（帮助框）：小 2px + 颜色浅一档

### 2.1 视觉规范

Tooltip 是**辅助信息**，不是正文。它必须看起来"轻"，否则会抢走主内容的注意力：

```css
.mm-tooltip {
  font-size: calc(var(--mm-fs) - 4px);              /* 比正文小 2~4px */
  color: var(--dsw-alias-label-secondary);          /* 次级文字色，不用主文字色 */
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: none;                                  /* 不要发光！见 3.1 */
  border-radius: 7px;
  padding: 6px 10px;
  max-width: 290px;
  line-height: 1.35;
  pointer-events: none;                              /* 永不拦截鼠标 */
}
```

**三层对比**（这是"层次感"的来源）：

| 元素 | 字号 | 颜色 |
|---|---|---|
| 正文 | `var(--mm-fs)` | `--dsw-alias-label-primary` |
| 次要信息（URL 摘要、时间） | `calc(var(--mm-fs) - 2px)` | `--dsw-alias-label-tertiary` 或 secondary |
| Tooltip | `calc(var(--mm-fs) - 4px)` | `--dsw-alias-label-secondary` |

### 2.2 交互规范

- **触发**：悬停 **300ms** 后显示（1000ms 太慢，用户会以为没反应）；移出/按下立即隐藏。
- **只悬停**：不要加点击触发——点击通常有自己的动作（打开弹窗、切换状态），叠一个浮层会互相打断。
  - 若确实要"点击看解释"，必须用 `onClickCapture`（见 4.2）。
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

同时 tooltip 也不要阴影——整体保持"平面 + 1px 边框"的语言。

### 3.2 尺寸要跟宿主面板一致

不要写死 `max-width: 640px`。先用 `useLayoutEffect` 测量宿主面板尺寸，再应用到弹窗：

```js
const [hostBox, setHostBox] = useState(null)
useLayoutEffect(() => {
  const measure = () => {
    const node = boxRef.current
    const host = node?.parentElement?.closest('[role="dialog"]')   // 宿主设置面板
    if (!host) return
    const rect = host.getBoundingClientRect()
    setHostBox({
      width: Math.min(Math.round(rect.width), window.innerWidth - 32),
      height: Math.min(Math.round(rect.height), window.innerHeight - 32),
    })
  }
  measure()
  window.addEventListener('resize', measure)
  return () => window.removeEventListener('resize', measure)
}, [])
```

嵌套弹窗（编辑器里再开确认框）要优先匹配**最近的** `.mm-dialog`，而不是页面根：

```js
const host = node.parentElement.closest('.mm-dialog')
  ?? node.parentElement.closest('.mm-root')
  ?? node.parentElement.closest('[role="dialog"]')
```

### 3.3 背景色要跟宿主面板同色

插件弹窗默认用 `--dsw-alias-bg-base`，比设置面板**深一档**，看起来像"另一个应用"。

设置面板实际用的是 `--dsw-static-neutral-bluish-850`（#2c2c2e）：

```css
.mm-dialog { background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1)); }
```

> 注意：`--dsw-hovercard-bg` 在主题里**未定义**（取值为空），别拿它当兜底。

### 3.4 遮罩透明、Escape 分层

- 遮罩 `background: transparent`（不要压暗下面的设置面板）。
- 多弹窗叠加时，Escape / 遮罩点击只关**最上层**：维护 `dialogStack`，捕获阶段 `stopImmediatePropagation`。
- 弹窗固定尺寸，内容区滚动；短视口下正文要 `min-height: 0`，否则底部按钮被裁。

### 3.5 嵌入页面的内容宽度

弹窗内页面撑满 800px 会显得空。与设置页对齐的做法是**内容列 640px 居中**：

```css
.mm-root-embedded { padding: 16px 20px; align-items: stretch; }
.mm-root-embedded .mm-head,
.mm-root-embedded .mm-list { width: 100%; max-width: 640px; margin-left: auto; margin-right: auto; }
```

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
Object.assign({ onClick: 动作 }, tooltipHandlers(tip))
//                                   ↑ 若返回 onClick，会覆盖掉"动作"
```

后来者胜出 → **所有按钮动作失效**。要追加行为就用独立属性：

```js
onClickCapture: (e) => { /* 显示提示 */ }   // 与 onClick 互不影响
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
| 弹窗/面板背景（与设置面板同色） | `--dsw-static-neutral-bluish-850` |
| 卡片、输入框背景 | `--dsw-alias-bg-layer-1` / `--dsw-alias-bg-layer-2` |
| 边框、分割线 | `--dsw-alias-border-l1` / `--dsw-alias-border-l2` |
| 主文字 | `--dsw-alias-label-primary` |
| 次文字（tooltip 用这个） | `--dsw-alias-label-secondary` |
| 弱化文字 | `--dsw-alias-label-tertiary` |
| 成功 / 警告 / 错误 | `--dsw-alias-state-success-primary` / `--dsw-alias-state-warn-primary` / `--dsw-alias-state-error-primary` |
| 品牌色 | `--dsw-alias-brand-primary` |
| hover 背景 | `--dsw-alias-interactive-bg-hover` |
| ⚠️ 未定义，别用 | `--dsw-hovercard-bg` |

**禁止字面色值**：需要浅底用 `color-mix(in srgb, var(--dsw-…) 12%, transparent)`。

---

## 七、开工检查清单

新建带 UI 的 DSH 插件时，逐条确认：

- [ ] 字号接入 `--mm-fs` 阶梯，不写死 px；Host 从 `ui-theme.fontSize` 读取
- [ ] Tooltip：300ms 延迟、仅悬停、比正文小 2px、用次级文字色、无阴影
- [ ] 弹窗：测量宿主面板尺寸、背景与面板同色、`box-shadow: none`、遮罩透明
- [ ] Escape / 遮罩点击只关最上层；短视口正文可收缩
- [ ] 图标按钮：1000ms 内必要提示、内联 SVG、统一 16×16（或宿主槽位尺寸）
- [ ] 点击行为不与提示冲突（用 `onClickCapture`，不要覆盖 `onClick`）
- [ ] 事件：弹窗内点击完全放行，不要 stopPropagation 打断 React 合成事件
- [ ] 配置写入遵守 Clean Config（空值/默认值不写），并声明合法例外
- [ ] 文本域字段加脏标记，避免输入/换行被破坏
- [ ] 颜色只用 token，无字面色值；class 前缀统一
- [ ] locale：中英键集一致、值非空、每键在字典外被引用
- [ ] `node --check` + `pnpm test` + 真机浏览器实测（悬停/点击/缩放/窄屏）