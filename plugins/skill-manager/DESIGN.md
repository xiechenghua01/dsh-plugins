# skill-manager — 信息架构与共享元素规则

> **文档定位**：本文件只写 `skill-manager` 的信息架构与本插件特有的结构约束（[根 DESIGN.md](../../DESIGN.md) §0.2）。
> 视觉、交互、尺寸、颜色、字号与通用组件抽象一律以 [根 DESIGN.md](../../DESIGN.md) 为准，尤其是 §6.5「共性只有一个维护来源」。
> 运行时契约（slots / routes / payload / 错误码）见 [`CONTRACT.md`](CONTRACT.md)。
> 与 [根 DESIGN.md](../../DESIGN.md) 冲突时按 §0.3 裁决，视觉与交互不做折中。

---

## 1. 两个列表页

插件有两个平级的列表页，卡片外观相同、数据来源不同：

| 页 | 片段 | 卡片渲染函数 | 数据来源 |
| --- | --- | --- | --- |
| 技能页 | `src/client/11-skills-actions.js` | `renderSkillCard(skill)` | 本机已安装技能 |
| 市场页 | `src/client/21-market-cards.js` | `renderMarketCard(item)` | 市场索引 |

源码是 `src/client/*.js` 片段，由 `scripts/build-client.mjs` 按文件名排序拼成单个 `client.js`；片段之间共享同一个工厂作用域，因此**共用 helper 就是普通函数调用**，不需要模块导入。

## 2. 共享卡片元素只有一个实现

技能页与市场页的卡片由同一套元素构成，全部定义在 `src/client/00-5-helpers.js`。**页面片段不得自己拼这些元素的 markup**：

| 元素 | class | 唯一实现（helper） |
| --- | --- | --- |
| 图标框 | `sm-card-icon` | `renderSkillIconBox()` |
| 状态点 | `sm-dot` 外壳 | `renderStatusDot()` / `renderSkillStatusDot()` |
| 标题行 | `sm-card-title-row` | `renderCardTitleRow()`（由 `renderCardMain()` 调用） |
| 徽章/标签行 | `sm-tagbar` | `renderCardMetaRow()`（由 `renderCardMain()` 调用） |
| 描述行 | `sm-card-desc` | `renderCardMain()` |
| 卡片主体列 | `sm-card-main` | `renderCardMain()` |

- **卡片主体整体走 `renderCardMain()`**：标题行、徽章行、描述行一次给齐。页面只负责准备数据（显示名、技术名、描述、徽章数组）和一个状态点。
- **状态点的语气（tone）由调用方决定**：`sm-dot-*` 这类颜色 class 作为参数传入 helper，外壳、`role="img"`、`aria-label`、`title`、`data-tip` 由 helper 独占，两页永远一致。
- **显示名只有一个取值函数**：`smSkillDisplayName()`。技术名（原始 `.name`）另有用途——作为小号等宽标签展示、并驱动安装/更新等动作——允许页面直接读，但它不是显示名。

### 2.1 新增市场页专有元素时

1. 先看 `00-5-helpers.js` 里已有 helper 能否**加参数或受控变体**满足；能就不新增。
2. 确实需要新元素时，仍写进 `00-5-helpers.js`，并让技能页在有对应数据时也走它——**共享元素的定义位置不随页面走**。
3. 只有明确只服务单页、且不承载卡片语义的结构，才留在页面片段里。判断依据见根 DESIGN.md §6.2「不该抽的」。

## 3. 自检会拦截分叉

`selftest.mjs` 的 `checkCardStructure()` 对上面两条做机器检查，违规时 `pnpm test` 与 `node selftest` 直接失败：

- 共享 helper 在 `00-5-helpers.js` 之外被**重复定义** → 报出片段名；
- `renderSkillCard()` / `renderMarketCard()` **不调用 `renderCardMain()`** → 报出函数名；
- 这两个函数内部**直接构造**上表的 class → 报出 `文件:行号` 与应改用的 helper；
- 这两个函数内部**直接构造**状态点 → 报出 `文件:行号`；
- 这两个函数**不调用 `smSkillDisplayName()`** → 报出函数名。

检查只读源码文本、只看「构造点」与「调用点」，不匹配函数体，也不覆盖骨架卡片、源区块头部、样式片段里的同名 class——那些是不同元素，不是卡片分叉。