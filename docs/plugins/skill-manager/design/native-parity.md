# DSH 原生控件一致性规格

> 版本：v1.0
> 用途：让 skill-manager 的交互反馈与 DeepSeek Harness 原生插件一致。
> 数据来源：`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar` 中
> `@deepseek-ai/dsh-client-ui-schedule`、`dsh-client-ui-plugin-manager` 等包的实测 CSS。
> 冲突时以本文为准；本文与 v2.x 决策单冲突时，视觉反馈细节以本文为准，结构仍以决策单为准。

---

## 1. 关键 token（实测值）

| token | 深色 | 浅色 |
| --- | --- | --- |
| `--dsw-alias-interactive-bg-hover` | `rgba(255, 255, 255, 0.08)` | `rgba(38, 49, 72, 0.06)` |
| `--dsw-alias-interactive-bg-hover-solid` | `--dsw-static-neutral-bluish-800` | `--dsw-static-neutral-bluish-75` |
| `--dsw-alias-label-tertiary` | 次级文字（未选中 Tab、图标按钮默认色） | 同 |
| `--dsw-alias-label-primary` | 主文字（选中 Tab、hover 后的图标） | 同 |
| `--dsw-alias-bg-layer-1` | 图标按钮 hover 背景 | 同 |

**核心规律：hover 与 active 使用同一个背景 token（`interactive-bg-hover`），靠文字色从 `tertiary` 提到 `primary` 表达状态。**

---

## 2. 控件规格

### 2.1 Tab（分段筛选，对应二级 Tab）

```css
.filterTabs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }

.filterTab {
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;          /* 全圆角 pill */
  font-size: 14px; line-height: 22px;
  color: var(--dsw-alias-label-tertiary);
  background: transparent; border: 0;
  display: inline-flex; align-items: center;
  cursor: pointer;
}
.filterTab:hover { background: var(--dsw-alias-interactive-bg-hover); }
.filterTabActive {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
```

要点：

- **hover 与选中态背景相同**，区别只在文字色。
- 无边框、无阴影、无 transition（DSH 未声明过渡）。
- 计数徽章不是原生模式；若保留，需降低对比，不抢选中态。

### 2.2 图标按钮

```css
.iconButton {
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-tertiary);
  background: transparent; border: 0;
  display: inline-flex; align-items: center;
}
.iconButton:hover {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}
```

### 2.3 卡片（可点击）

```css
.card:hover { background: var(--dsw-alias-interactive-bg-hover); }
```

- 原生卡片 hover 只变背景，不描边、不位移、不缩放。
- 选中态用 `--dsw-alias-bg-module-platform` + 描边，不用阴影。

### 2.4 菜单项

- `:hover` 与 `:focus-visible` 都是 `background: var(--dsw-alias-interactive-bg-hover)`。
- 危险项 hover 用 `--dsw-alias-interactive-bg-hover-danger`。

### 2.5 焦点

```css
:focus-visible {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
```

- 原生组件多数用「背景 + 文字」表达焦点，不用外发光环；部分组件显式 `outline: none`。
- 本插件保留键盘可见焦点，但视觉与 hover 一致，不新增彩色 outline。

### 2.6 Tooltip

DSH 原生用 `data-tip` + `:after` 伪元素：

```css
[data-tip]:after {
  content: attr(data-tip);
  background: var(--dsw-alias-label-primary);   /* 反色背景 */
  color: var(--dsw-alias-bg-layer-3);           /* 反色文字 */
  border-radius: var(--dsw-radius-sm);
  white-space: nowrap;
}
```

- **反色**：深色主题下是浅底深字，与页面主色相反。
- 无边框、无阴影。
- 本插件保留 300ms 延迟（评审要求），样式改为反色。

### 2.7 弹窗与抽屉

- 无阴影（`box-shadow: none`）。
- 遮罩透明或极低透明度，不使用模糊。
- 圆角 `--dsw-radius-panel`（表单）/ `--dsw-radius-xl`（确认）。
- 边框 `.5px solid var(--dsw-alias-border-inverted)`。

---

## 3. 当前原型与目标的差异（需修正）

| 控件 | 当前实现 | 应改为 |
| --- | --- | --- |
| 二级 Tab | 自定高度与内边距，选中态对比过强 | 28px / 圆角 14 / padding 0 10 / hover 与选中同背景、文字 tertiary→primary |
| 一级 Tab（技能 / 市场） | pill 容器，hover 反馈不明确 | 保持容器结构；内部按钮 hover 用 `interactive-bg-hover`，选中文字 `label-primary` |
| 图标按钮 | 自定 hover 色 | `padding: 6px`、`radius-sm`、hover 背景 `bg-layer-1` + 文字 `label-primary` |
| 卡片 | hover 用 `color-mix` 混色 | 直接 `background: var(--dsw-alias-interactive-bg-hover)`，不描边不位移 |
| 菜单项 | 自定 hover | `interactive-bg-hover`；危险项用 danger 变体 |
| Tooltip | `bg-layer-2` + 边框 + `label-secondary` | 反色：背景 `label-primary`、文字 `bg-layer-3`、无边框、圆角 `radius-sm` |
| 焦点 | 无统一规则 | 与 hover 一致，不新增彩色 outline |

---

## 4. 验收方法

1. 截图对比：同一屏幕下，本插件与「自动化任务」「插件」页的 Tab/按钮 hover 截图并排看，反馈强度应一致。
2. computed style 抽查：hover 态背景必须是 `rgba(255,255,255,0.08)`（深色）或 `rgba(38,49,72,0.06)`（浅色）。
3. 交互一致性：Tab hover 不变形、不位移、不出现边框；卡片 hover 只变背景。
4. Tooltip：背景为 `label-primary`（浅底深字），不是页面背景色。