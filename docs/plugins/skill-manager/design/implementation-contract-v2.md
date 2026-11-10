# skill-manager 实现契约 v2.0（并行开发唯一事实源）

> 版本：**v2.0**　　日期：2026-11-09
> 上一版：`implementation-contract.md` v1.3（保留归档，按三 Tab 结构写的，**已作废**）
> 结构输入：`product/v2-ia-decisions.md`（v2.0）、`v2-1-review-decisions.md`（v2.1）、`v2-2-review-decisions.md`（v2.2）、`product/skills-manager-prd-v2.md`（v2.3）
> 视觉输入：`design/native-parity.md`（DSH 原生控件实测）、`design/interaction-spec-v3.md`（v3.3）
> **所有实现 Agent 必须先读完本文件**；与本文件冲突的实现都算缺陷。

---

## 1. 包身份与文件布局

| 项 | 值 |
| --- | --- |
| 包名 | `@xiechenghua01/dsh-skill-manager` |
| 版本 | 从 `0.1.2` 升到 **`0.2.0`**（结构不兼容变更） |
| Loader 行 id | `skill-manager` |
| `main` 槽 key | `skill-manager` |
| `sidebar.panellist` id | `skill-manager`，`order: 20` |
| locale namespace | `skillManager` |
| CSS class 前缀 | `sm-` |
| 字号变量 | `--sm-fs` |
| 目标 DSH | `>=0.2.1-rc.5 <0.3.0` |

```
plugins/skill-manager/
├── package.json / cordis.patch.yml / market.json / icon.svg / locale/   # Lead 维护
├── index.js                     # H1：Host 入口、路由分发、apply
├── lib/
│   ├── http.mjs                 # H1：JSON 响应、围栏、405/500
│   ├── frontmatter.mjs          # H1：SKILL.md 解析/校验
│   ├── scan.mjs                 # H1：扫描 + 诊断 + 来源归属
│   ├── market-index.mjs         # H2：索引校验器
│   ├── fetch-index.mjs          # H2：拉取 + 缓存 + 单飞
│   ├── search.mjs               # H2：市场搜索/排序/分页
│   ├── compat.mjs               # H2：SemVer
│   ├── state.mjs                # H3：源列表（含顺序）+ 安装记录
│   ├── install.mjs              # H3：下载/校验/原子写/备份
│   ├── write.mjs                # H3：新建/编辑/停用/恢复/删除/导入
│   └── update.mjs               # H3：自动检查 + 更新
├── src/client/                  # 浏览器半（拼接为 client.js）
│   ├── 00-prelude.js            # C1：常量、字典、工具、api、状态、渲染调度
│   ├── 10-skills.js             # C1：技能 Tab（二级 Tab + 来源分组 + 两列卡片）
│   ├── 20-market.js             # C2：市场 Tab（按源分区块）
│   ├── 30-source-dialog.js      # C2：管理源弹窗（720px + 拖动排序）
│   ├── 40-detail.js             # C3：页内双栏详情
│   ├── 50-modals.js             # C3：10 类模态 + 诊断抽屉 + toast + tooltip
│   ├── 90-styles.js             # C4：全部 CSS
│   └── 99-apply.js              # Lead：加载器外壳与 apply
├── scripts/build-client.mjs     # Lead
├── client.js                    # 构建产物，不手改
├── selftest.mjs                 # Lead
└── CONTRACT.md / README.md      # Lead
```

**并行规则**：每个 Agent 只写自己名下的文件；不改 `client.js`；改契约由 Lead 统一进行。

**与 v1.3 的文件变化**：

| v1.3 | v2.0 | 说明 |
| --- | --- | --- |
| `10-installed.js` | `10-skills.js` | 已安装 → 技能，二级 Tab + 来源分组 + 卡片 |
| `30-sources.js` | `30-source-dialog.js` | 来源页 → 管理源弹窗 |
| — | 新增 `lib/` 无变化 | 源顺序并入 `state.mjs` |

---

## 2. 构建：src/client/*.js → client.js

与 v1.3 相同（按文件名排序拼接、4 空格缩进、无 import/export、字典在 `00-prelude.js`），不变的部分不再重复。新增约束：

- 拖动排序的拖拽逻辑放在 `30-source-dialog.js`，但**共享的 `dataTransfer` key 与插入线计算**放在 `00-prelude.js`（`smDragSource` 命名空间），避免两个模块各写一套。
- `client.js` 单文件、只 `require('react')`。

---

## 3. 数据模型（Host → Client）

### 3.1 枚举

```ts
type SkillCategory = 'mine' | 'shared' | 'project' | 'system'
type SkillStatus = 'active' | 'disabled' | 'broken' | 'invalid'
type SkillSort = 'name' | 'modified' | 'source'   // 与交互稿一致；recent 是 v1 旧名
type SkillLocationId =
  | 'project-dsh' | 'project-agents' | 'custom'
  | 'preset' | 'user-dsh' | 'user-agents' | 'bundled'
```

分类映射（Host 计算，Client 不再推导）：

| category | 包含的 location |
| --- | --- |
| `mine` | `user-dsh` + 可写的 `custom` |
| `shared` | `user-agents` |
| `project` | `project-dsh` + `project-agents` |
| `system` | `preset` + `bundled` + 只读的 `custom` |

### 3.2 SkillView

```ts
interface SkillView {
  id: string                    // 稳定 id：`<location>:<name>`
  name: string
  description: string
  whenToUse: string | null
  category: SkillCategory       // 归属二级 Tab
  location: SkillLocationId     // 底层位置，仅详情使用
  sourceId: string | null       // 市场来源；本地创建/内置为 null
  sourceName: string | null     // 来源展示名
  version: string | null
  author: string | null
  path: string | null           // 内置技能可能没有
  mtime: number
  status: SkillStatus
  writable: boolean
  updateAvailable: string | null
  brokenReason: string | null   // 仅 status='broken' 时给用户语言原因；当前扫描器不产出 broken 视图（断链只进诊断），字段预留给后续
  localModified?: boolean       // 安装后本地被改过；更新确认需要据此提示备份
}
```

### 3.3 来源分组（Client 侧计算）

```ts
interface SkillGroup {
  key: string                   // `source:<sourceId>` 或 `local`
  kind: 'source' | 'local'
  sourceId: string | null
  label: string                 // 源名 或 '本地创建'
  count: number
  skills: SkillView[]
}
```

分组规则（`10-skills.js` 实现）：

1. 先按 `category` 过滤当前 Tab 的技能。
2. 再按 `sourceId` 分组；`sourceId` 为 null 的归 `local`。
3. 组顺序 = `sourceOrder`；`local` 固定最后；源已删除的技能归 `local`。
4. 空组不渲染；搜索命中为空的分组也不渲染。
5. `system` 分类**不分组**，直接平铺。

### 3.4 市场

```ts
interface MarketSourceBlock {
  sourceId: string
  name: string
  total: number
  skills: MarketSkillView[]
  error: string | null          // 该源本次拉取失败时的用户语言原因
}

interface MarketSkillView {
  sourceId: string
  name: string
  version: string
  description: string
  tags: string[]
  installed: boolean
  installedVersion: string | null
  updateAvailable: string | null
}
```

`GET /market` 返回 `{ sources: MarketSourceBlock[], stale: boolean }`，**不再返回扁平 skills 与 `nextOffset`**；分页改为每源 `skills` 内部的 `cursor`：

```ts
interface MarketSourceBlock { /* … */ cursor: string | null }
```

### 3.5 状态模型（Client）

```ts
interface AppState {
  tab: 'skills' | 'market'
  category: SkillCategory           // 二级 Tab，默认 'mine'
  search: string                    // 两个 Tab 共用一个搜索词
  sort: SkillSort                   // 技能 Tab
  marketSort: 'recommend' | 'updated' | 'name'
  view: 'list' | 'detail'
  detail: { kind: 'installed' | 'market'; id: string; edit?: boolean } | null
  skills: SkillView[]
  categories: Record<SkillCategory, number>
  sources: SourceView[]
  sourceOrder: string[]
  marketSources: MarketSourceBlock[]
  updates: UpdateState | null
  diagnostics: DiagnosticsPayload | null
  loading: Record<string, boolean>
  error: { scope: string; code: string; message: string } | null
  cwd: string                       // 项目根，用于项目位置可用性与 /diagnostics?cwd=
  // 记忆
  restoreListScroll: number | null
  menu: unknown | null
  modal: unknown | null
  sourceDialogOpen: boolean
  checking: boolean
}
```

**删除的 v1 状态**：`filter`、`marketSourceId`、`sort: 'location'`、`tab: 'sources'`、`installed`/`market` 两套缓存。

---

## 4. Host API 契约

前缀 `/skill-manager/api`，全部 exact 路由（动态源路由用 prefix，见 §4.2），全部经 `ctx.connection.requestRejection`。

### 4.1 路由表

| 方法 | 路径 | 变更 | 说明 |
| --- | --- | --- | --- |
| GET | `/installed?cwd=` | **改** | 返回 `{ categories, skills, sources, sourceOrder, diagnostics, updates }`；`skills[]` 带 `category` / `sourceId` |
| GET | `/skill?path=` | 不变 | 详情 |
| POST | `/skill` | 不变 | 新建 |
| PUT | `/skill` | 不变 | 编辑（mtime 乐观锁） |
| POST | `/skill/state` | 不变 | 停用 / 恢复 |
| DELETE | `/skill?path=` | 不变 | 删除 |
| POST | `/import` | 不变 | 粘贴 / 目录导入 |
| GET | `/diagnostics?cwd=` | 不变 | 诊断 |
| GET | `/sources` | 不变 | 源列表（含顺序） |
| POST | `/sources` | 不变 | 新增源（默认排最后） |
| PUT | `/sources/:id` | 不变 | 编辑 |
| DELETE | `/sources/:id` | 不变 | 删除 |
| POST | `/sources/:id/refresh` | 不变 | 刷新单源 |
| **PUT** | **`/sources/order`** | **新增** | 保存源顺序 `{ order: string[] }` |
| POST | `/sources/validate` | 不变 | 预校验 |
| GET | `/market?q=&sort=&cursor=&limit=` | **改** | 返回 `{ sources: MarketSourceBlock[], stale }`；`cursor` 为 per-source 分页 |
| GET | `/market/skill?sourceId=&name=` | 不变 | 市场详情 |
| POST | `/market/install` | 不变 | 安装 |
| POST | `/market/update` | 不变 | 更新 |
| POST | `/market/uninstall` | 不变 | 卸载 |
| GET | `/updates` | 不变 | 检查状态 |
| POST | `/check-updates` | **改语义** | 检查 + 重新拉取索引；返回 `{ sources: number, updates: number, errors: [] }` |
| POST | `/validate` | 不变 | SKILL.md 校验 |
| GET | `/settings` | 不变 | fontSize / cwd / dshVersion |

### 4.2 `/sources/order`

```
PUT /skill-manager/api/sources/order
{ "order": ["official", "team", "legacy"] }
→ { "ok": true, "data": { "order": [...] } }
```

- 必须包含当前全部源 id，且是它们的排列；缺项或未知 id → `E_BAD_REQUEST`。
- 持久化到 `state.json` 的 `sourceOrder` 字段；新增源自动追加到末尾。
- 读顺序的规则：`sourceOrder` 中存在的按该顺序，未出现的按创建时间追加。

### 4.3 `/check-updates` 新语义

```
POST /skill-manager/api/check-updates { "force": true }
→ { "ok": true, "data": { "sources": 2, "updates": 1, "errors": [] } }
```

- 同时做三件事：重新拉取所有已启用源的索引、重算可更新列表、刷新 `GET /installed` 的扫描结果。
- 前端**不再有独立的「刷新列表」**；`force` 用于跳过缓存 TTL。
- 单飞：已有检查在跑时直接返回进行中的结果（不排队）。

### 4.4 其余契约

响应包、错误码表、状态码映射、围栏、安全规则、安装原子性、状态持久化——**全部沿用 v1.3 契约 §4 与 `CONTRACT.md`**，本节只列变更项。

---

## 5. Client 全局符号

### 5.1 固定符号（`00-prelude.js` 定义，全模块可用）

```js
t(key, vars)                 // 本地化
fmtSize(bytes) / fmtTime(ms) // 格式化
cx(...classes)               // class 拼接
api(path, options)           // fetch 包装，自动拼 /skill-manager/api
toast(message, options)      // 轻提示
icon(name, size, extraClass) // 图标
appState / setState(patch) / rerender()
loadInstalled(force) / loadSources() / loadMarket(opts) / loadUpdates(force) / checkUpdates()
renderPage(props)
skillUpdateVersion(skill)    // 统一的可更新版本来源
rememberListScroll() / restoreListScroll()
smDragSource                 // 拖动排序共享命名空间：{ key, dragging, over, start(), over(), drop(), end() }
```

### 5.2 模块自有符号

| 模块 | 符号 |
| --- | --- |
| `10-skills.js` | `renderSkillsTab()`、`renderCategoryTabs()`、`renderSkillGroups()`、`renderSkillCard()`、`groupSkills()` |
| `20-market.js` | `renderMarketTab()`、`renderMarketSourceBlock()`、`renderMarketCard()` |
| `30-source-dialog.js` | `renderSourceDialog()`、`openSourceDialog()`、`closeSourceDialog()`、`moveSource(id, delta)` |
| `40-detail.js` | `renderDetailPage()` |
| `50-modals.js` | `openModal(kind, payload)`、`closeModal()`、`renderModalLayer()`、`openDiagnosticsDrawer()`、`renderDiagnosticsDrawer()`、`renderToastHost()`、`renderTooltipLayer()`、`smTip(el)`、`smHideTooltip()` |
| `90-styles.js` | `const STYLES`（唯一 CSS 来源） |

### 5.3 模态 kind 契约

| kind | 宽度档 | 触发 |
| --- | --- | --- |
| `new-skill` | 488 | 工具栏新建图标、空态 |
| `import-skill` | 488 | 工具栏导入图标 |
| `install` | 488 | 市场卡片安装 |
| `update` | 480 | 卡片更新、状态图标（全部更新） |
| `uninstall` | 480 | 卡片菜单、详情 |
| `delete` | 480 | 卡片菜单、详情 |
| `add-source` | 488 | 管理源弹窗 |
| `edit-content` | 720 | 详情编辑 |
| `preview` | 720 | 详情正文预览 |
| `confirm-remove-source` | 480 | 管理源弹窗 |

别名兼容保留：`new`→`new-skill`、`import`→`import-skill`、`uninstall`/`delete`→对应确认框。

---

## 6. 图标集

`icon(name, size, extraClass)` 支持的名称（新增标 ★）：

```
skill  file  folder  copy  edit  trash  power  more  check  x  alert  search
chevron-right  chevron-down  refresh  upload  download  link  external  pin
shield  database  git  image  script  puzzle  package  user  users  sliders
★ plus        // 新建
★ arrow-up-dot // 状态图标：有更新
★ grip        // 拖动排序手柄
```

约束：24×24 viewBox、`stroke: currentColor`、`stroke-width: 1.5`、无填充（状态点除外）。

---

## 7. 视觉规格

### 7.1 页面骨架

- 内容列：`max-width: 960px`、居中；两侧 `padding: clamp(20px, 4vw, 48px)`。
- 页面标题 `calc(var(--sm-fs) + 2px)` / 500；描述 `calc(var(--sm-fs) - 1px)` / `--dsw-alias-label-secondary`。
- 一级 Tab 容器 34px 高、内部 28px Tab；二级 Tab 无容器，`gap: 8px 12px`。

### 7.2 Tab（原生规格）

```css
.sm-subtab {
  height: 28px; padding: 0 10px; border-radius: 14px;
  font-size: var(--sm-fs); line-height: 22px;
  color: var(--dsw-alias-label-tertiary);
  background: transparent; border: 0;
  display: inline-flex; align-items: center; cursor: pointer;
}
.sm-subtab:hover,
.sm-subtab[aria-selected="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.sm-subtab[aria-selected="true"] { color: var(--dsw-alias-label-primary); }
```

### 7.3 两列卡片

```css
.sm-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 720px) { .sm-card-grid { grid-template-columns: minmax(0, 1fr); } }

.sm-card-item {
  min-height: 96px; padding: 12px;
  display: flex; align-items: flex-start; gap: 12px;
  border: .5px solid var(--dsw-alias-settings-card-stroke);
  border-radius: var(--dsw-radius-xl);
  background: var(--dsw-alias-settings-card-fill);
  cursor: pointer;
}
.sm-card-item:hover { background: var(--dsw-alias-interactive-bg-hover); }  /* 不描边、不位移 */
.sm-card-item.is-disabled { opacity: .6; }

.sm-card-icon { width: 48px; height: 48px; border-radius: var(--dsw-radius-lg);
  border: .5px solid var(--dsw-alias-border-l2); display: flex;
  align-items: center; justify-content: center; flex: none; }

/* 右侧：水平排列，⋯ 在左、主按钮在右 */
.sm-card-tail { display: flex; align-items: center; gap: 8px; flex: none; align-self: center; }
.sm-card-more { opacity: 0; transition: opacity 120ms; }
.sm-card-item:hover .sm-card-more,
.sm-card-item:focus-within .sm-card-more,
.sm-card-more:focus-visible { opacity: 1; }
```

卡片内元素顺序：图标 → 名称（mono）→ 徽章（更新 / 未生效 / 已停用）→ 描述（≤2 行）→ 右侧操作。

### 7.4 工具栏

```
[ 搜索 220–280px ] [ 排序下拉 ] [ + ] [ ↑ ] [ ⟳ ]      // 技能
[ 搜索 220–280px ] [ 排序下拉 ] [ ⟳ ] [ ⚙ ]            // 市场
```

- 图标按钮 30×30、图标 16px、间距 6px。
- 图标按钮原生规格：`padding: 6px; border-radius: var(--dsw-radius-sm); color: --dsw-alias-label-tertiary`；hover `background: --dsw-alias-bg-layer-1` + `color: --dsw-alias-label-primary`。

### 7.5 状态图标

- 位于一级 Tab 行右侧，16px 图标、32×32 热区。
- 警示图标颜色 `--dsw-alias-state-warn-primary`；更新图标 `--dsw-alias-state-business-primary`。
- 数量为 0 时不渲染；悬停 300ms 出提示语。

### 7.6 管理源弹窗

```css
.sm-source-dialog {
  /* DSH 实测是三档 480 / 488 / 720；管理源是窄列表 + 表单，取 560 居中，
   * 内容少时靠 max-height 自然收缩，不用固定高度。 */
  width: min(560px, 100vw - 32px);
  max-height: min(560px, 100vh - 96px);
  border-radius: var(--dsw-radius-panel);
  border: .5px solid var(--dsw-alias-border-inverted);
  box-shadow: none;
  display: flex; flex-direction: column;
}
.sm-source-list { overflow: auto; min-height: 0; }
.sm-source-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; }
.sm-source-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.sm-drag-handle { width: 16px; height: 16px; cursor: grab; color: var(--dsw-alias-label-tertiary); }
.sm-source-row.is-dragging { opacity: .5; }
.sm-drop-indicator { height: 2px; background: var(--dsw-alias-state-business-primary); }
```

- 拖动阈值 4px；`dragover` 时按行中线显示插入线；`drop` 后立即重排 + `PUT /sources/order`。
- `Esc` 或拖出弹窗取消，不写入。
- 键盘替代：手柄聚焦后 `Alt+↑/↓` 移动一位。

### 7.7 弹窗尺寸

| 类别 | 宽度 | 圆角 |
| --- | --- | --- |
| 表单（新建/导入/添加源/安装） | `min(488px, 100%)` | `--dsw-radius-panel` |
| 确认（更新/卸载/删除） | `min(480px, 100vw - 32px)` | `--dsw-radius-xl` |
| 大内容（编辑/预览） | `min(720px, 100%)` | `--dsw-radius-panel` |
| 管理源列表 | `min(560px, 100vw - 32px)` | `--dsw-radius-panel` |

### 7.8 原生交互反馈

- hover 与选中态共用 `--dsw-alias-interactive-bg-hover`，靠文字色区分。
- 卡片 hover 只变背景，不描边、不位移、不缩放。
- 焦点：背景 + 文字色，不新增彩色 outline。
- 提示语：反色（背景 `--dsw-alias-label-primary`、文字 `--dsw-alias-bg-layer-3`、圆角 `--dsw-radius-sm`、无边框），300ms 延迟。
- 详见 `design/native-parity.md`。

### 7.9 禁止

- 字面色值、渐变、`box-shadow`、`--dsw-hovercard-bg`。
- 写死字号（必须 `calc(var(--sm-fs) ± Npx)`）。
- 行尾 switch（停用只在菜单与详情）。
- 卡片 hover 描边或位移。

---

## 8. locale 字典

### 8.1 前缀规划

| 前缀 | 用途 |
| --- | --- |
| `panel.*` | 标题、描述 |
| `tab.*` | 一级与二级 Tab、计数 |
| `category.*` | 四个分类名与空态 |
| `group.*` | 来源组头（`group.local`、`group.count`） |
| `card.*` | 卡片徽章与提示 |
| `toolbar.*` | 工具栏图标 tooltip |
| `status.*` | 状态图标 tooltip、检查状态 |
| `skill.*` | 技能详情字段 |
| `market.*` | 市场 |
| `source.*` | 管理源弹窗与拖动提示 |
| `diag.*` | 诊断 |
| `modal.*` / `form.*` | 弹窗与表单 |
| `action.*` | 动作名（新建/导入/检查更新/管理源/更新/安装/已安装） |
| `toast.*` | 轻提示 |
| `error.*` | 错误码文案 |
| `empty.*` | 空态 |
| `state.*` | 加载、只读、禁用 |

### 8.2 新增 key（相对 v1.3）

```
tab.category.mine / shared / project / system
category.mine.empty / shared.empty / project.empty / system.empty
group.local / group.count
toolbar.newSkill / toolbar.import / toolbar.checkUpdates / toolbar.manageSources
status.updatesTooltip / status.brokenTooltip / status.checking
source.dragHint / source.dropHint / source.moveUpHint / source.moveDownHint
source.dialog.title / source.dialog.desc
action.checkUpdates / action.manageSources
toast.checkedSources / toast.noUpdates
```

### 8.3 删除的 key（v1.3 专用）

```
loc.*（7 个位置名，仅诊断「详细信息」保留路径）
tab.installed / tab.sources / tab.market（改为 tab.skills / tab.market）
filter.*（位置筛选）
source.page.*（来源页）
```

字典规则沿用 v1.3（键集一致、非空、字典外被引用、无未转义单引号）。

---

## 9. 硬约束清单

`pnpm test` 与人工复核会检查：

1. `client.js` 由片段构建且与源码一致（`build-client.mjs --check`）。
2. Host 只 import `node:` 与相对路径；浏览器半只 `require('react')`。
3. 字典键集一致、非空、全部被引用。
4. 无字面色值、无写死字号、无绝对家目录路径。
5. 两 Tab 结构：`tab` 只能是 `skills` / `market`；不存在 `sources` Tab。
6. 技能页分组：`system` 分类不分组，其余按 `sourceId` 分组且 `local` 在最后。
7. 卡片右侧为水平 `⋯` + 主按钮，`⋯` 默认隐藏。
8. 工具栏无 `⋯` 菜单、无独立「刷新列表」。
9. 管理源为弹窗（非抽屉），排序仅拖动（+ 键盘替代），无上下箭头按钮。
10. 弹窗宽度不超过 488 / 480 / 720 三档。
11. 无行尾 switch。
12. 提示语反色、300ms 延迟。

---

## 10. market.json 与发布

不变：`market.json` 元数据、`index.json` 由 `pnpm run release` 生成、版本不可回改。发布流程：升 `0.2.0` → commit → `pnpm run release skill-manager` → push。

---

## 11. 与文档的对应关系

| 文档 | 版本 | 作用 |
| --- | --- | --- |
| `product/v2-ia-decisions.md` | v2.0 | 结构基线（四箱子、两 Tab、隐藏清单） |
| `product/v2-1-review-decisions.md` | v2.1 | 首轮评审变更（二级 Tab、两列、源排序、状态图标、弹窗尺寸） |
| `product/v2-2-review-decisions.md` | v2.2 | 第二轮评审变更（Tab 内来源分组、工具栏图标化、卡片操作、管理源弹窗） |
| `product/skills-manager-prd-v2.md` | v2.3 | 产品要求与验收 |
| `design/interaction-spec-v3.md` | v3.3 | 交互行为与文案 |
| `design/native-parity.md` | v1.0 | 视觉反馈实测规格 |
| `prototypes/skills-manager-v3.html` | v3.3 | 可点击原型（21 画面） |
| 本文件 | v2.0 | **实现唯一事实源** |

冲突裁决：本文件 > `native-parity.md` > 交互稿 > 原型 > PRD > 决策单（结构与视觉均已固化在本文件里，上游只作解释）。

---

## 12. 实现顺序建议

1. **数据层**：`scan.mjs` 补 `category` / `sourceId` / `sourceName`；`state.mjs` 加 `sourceOrder`；新增 `PUT /sources/order`；`/market` 改分组结构；`/check-updates` 改语义。
2. **Client 骨架**：`00-prelude.js` 状态模型与共享符号；`10-skills.js` 二级 Tab + 来源分组 + 卡片。
3. **市场与源**：`20-market.js` 按源分区块；`30-source-dialog.js` 弹窗 + 拖动。
4. **详情与模态**：`40-detail.js` 去技术信息；`50-modals.js` 十类模态与宽度档。
5. **样式与原生一致性**：`90-styles.js` 按 §7 实现。
6. **回归**：`build-client --check`、`pnpm test`、`selftest`、真机安装走查。

每完成一步跑一次 `node scripts/check-plugins.mjs`，避免字典与结构漂移。