# skill-manager 实现契约（并行开发唯一事实源）

> 本文件由 Lead 维护，**所有实现 Agent 必须先读完本文件**，再读自己的任务范围。
> 任何与本文件冲突的实现都算缺陷。需要变更契约时，由 Lead 统一修改并通知。

---

## 1. 包身份与文件布局

| 项 | 值 |
| --- | --- |
| 包名 | `@xiechenghua01/dsh-skill-manager` |
| Loader 行 id | `skill-manager` |
| `main` 槽 key | `skill-manager` |
| `sidebar.panellist` id | `skill-manager`，`order: 20` |
| locale namespace | `skillManager` |
| CSS class 前缀 | `sm-` |
| 字号变量 | `--sm-fs` |
| 目标 DSH | `>=0.2.1-rc.5 <0.3.0` |

```
plugins/skill-manager/
├── package.json                 # Lead 已写
├── cordis.patch.yml             # Lead 已写
├── market.json                  # Lead 已写
├── icon.svg                     # Lead 已写
├── locale/{en,zh}.json          # Lead 已写（仅插件管理器元数据）
├── index.js                     # H1：Host 入口（路由分发 + apply）
├── lib/
│   ├── http.mjs                 # H1：JSON 响应、connection 围栏、405/500
│   ├── frontmatter.mjs          # H1：SKILL.md frontmatter 解析/序列化/校验
│   ├── scan.mjs                 # H1：7 类位置扫描 + 诊断 + 可见性
│   ├── market-index.mjs         # H2：索引校验器（R1–R30）
│   ├── fetch-index.mjs          # H2：拉取 + 缓存 + 单飞
│   ├── search.mjs               # H2：搜索/筛选/排序/分页
│   ├── compat.mjs               # H2：SemVer 解析/比较/range
│   ├── state.mjs                # H3：源列表 + 安装记录（原子写）
│   ├── install.mjs              # H3：下载/校验/原子写/备份
│   ├── write.mjs                # H3：新建/编辑/停用/恢复/删除/导入
│   └── update.mjs               # H3：自动检查调度 + 更新
├── src/client/                  # 浏览器半源码（拼接为 client.js）
│   ├── 00-prelude.js            # C1：常量、zh/en 字典、工具函数
│   ├── 10-installed.js          # C1：已安装 Tab
│   ├── 20-market.js             # C2：市场 Tab
│   ├── 30-sources.js            # C2：来源 Tab
│   ├── 40-detail.js             # C3：页内双栏详情
│   ├── 50-modals.js             # C3：6 个模态 + 诊断抽屉 + toast
│   ├── 90-styles.js             # C4：全部 CSS（返回字符串）
│   └── 99-apply.js              # Lead：加载器外壳与 apply（最后拼）
├── scripts/build-client.mjs     # Lead：拼接生成 client.js
├── client.js                    # 构建产物（不手改）
├── selftest.mjs                 # Lead：纯合成输入自测
├── CONTRACT.md                  # Lead：实现契约与实测事实
└── README.md                    # Lead
```

**并行规则**：每个 Agent 只写自己名下的文件；不要改别人的文件；不要改 `client.js`（构建产物）。

---

## 2. 构建：src/client/*.js → client.js

`node scripts/build-client.mjs` 按文件名排序读取 `src/client/*.js`，拼接为：

```js
window.__ModuleLoader__.load({
  id: '@xiechenghua01/dsh-skill-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect
    const useMemo = React.useMemo
    const useCallback = React.useCallback
    const useRef = React.useRef
    const Fragment = React.Fragment
// ===== 00-prelude.js =====
<文件内容>
// ===== 10-installed.js =====
<文件内容>
...
    return { inject: ['slots', 'locale', 'layout'], apply }
  },
})
```

约束：

- 每个片段是**缩进 4 空格的普通 JS**（`const` / `function` 声明），不使用 `import`/`export`。
- 片段之间共享作用域：后面的片段可直接使用前面定义的符号。
- `99-apply.js` 定义 `apply(ctx)` 并返回 `{ inject: ['slots','locale','layout'], apply }`。
- **字典必须在 `00-prelude.js` 中**，格式严格：

```js
    const zh = {
      'panel.title': '技能',
      'panel.desc': '管理 Agent 可用的技能。',
    }
    const en = {
      'panel.title': 'Skills',
      'panel.desc': 'Manage the skills available to agents.',
    }
```

  规则（`scripts/check-plugins.mjs` 会解析）：
  - `const zh = {` / `const en = {` 各出现一次，`    }` 单独一行收尾。
  - 键集完全一致、值非空。
  - 每个 key 必须在字典外被引用（`t('key')` 或 `'key'` 字面量）。
  - 值里不要出现未转义单引号（用 `\'` 或改写文案）。

---

## 3. 数据模型（Host 返回给 Client 的 JSON）

```ts
type SkillLocationId = 'project-dsh' | 'project-agents' | 'custom' | 'preset' | 'user-dsh' | 'user-agents' | 'bundled'

interface LocationView {
  id: SkillLocationId
  label: string            // 中文展示名，由 Host 给（Client 也可按 id 本地化）
  path: string             // 展示用（~ 缩写）
  absPath: string
  rank: number
  layer: 'preset' | 'global'
  writable: boolean
  exists: boolean
  readable: boolean
  skillCount: number
  disabledCount: number
  presets: string[]        // 能看到该位置的预设 id
}

interface SkillView {
  id: string
  name: string
  description: string
  whenToUse?: string
  location: SkillLocationId
  rootPath: string         // 展示用
  path: string             // 绝对路径；bundled 为空字符串
  provider: string
  sourceType: 'filesystem' | 'bundled' | 'preset'
  rank: number
  writable: boolean
  status: 'active' | 'disabled' | 'shadowed' | 'invalid'
  shadowedBy?: string
  visiblePresets: string[]
  invocation: { modelInvocable: boolean; userInvocable: boolean }
  sizeBytes: number
  mtime: number            // 秒
  updatedAtLabel: string   // Host 已格式化的相对时间（"10 分钟前"）
  market?: {               // 仅市场安装的技能有
    sourceId: string
    sourceName: string
    version: string
    commit?: string
    updateAvailable?: string
    localModified: boolean
    installedAt: number
  }
}

interface IssueView {
  id: string
  severity: 'error' | 'warning' | 'info'
  kind: 'broken-link' | 'frontmatter' | 'name' | 'same-layer-shadow' | 'cross-layer-shadow' | 'unreadable' | 'oversize'
  name?: string
  path: string
  message: string
  fix?: { action: 'remove-link' | 'open-file' | 'rename' | 'view-active' | 'retry'; hint: string }
}

interface PresetView {
  id: string
  mounted: boolean          // 是否挂载了本地发现
  presetSkills: number
  localRoots: number
  desc: string
}

interface SourceView {
  id: string
  type: 'index' | 'local'
  name: string
  url: string
  enabled: boolean
  status: 'ok' | 'error' | 'checking'
  skillCount: number
  lastCheckedAt: number
  error: string | null
  stale: boolean
}

interface MarketSkillView {
  id: string
  name: string
  title: string             // 已按语言选择
  description: string
  version: string
  tags: string[]
  author: string
  license: string
  homepage: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  commit: string
  files: Array<{ path: string; sha256: string; size: number }>
  publishTimestamp: number
  enginesDsh: string
  installed?: { location: SkillLocationId; version: string; modified: boolean; updateAvailable?: string }
}
```

---

## 4. Host API 契约（H1 实现路由分发，H2/H3 实现业务）

统一前缀 `/skill-manager/api`，全部 `kind: 'exact'` 路由；每个 handler 首行 `connection.requestRejection`。

**响应包**：成功 `{ ok: true, data: <payload> }`；失败 `{ ok: false, error: { code, message, path?, file? } }`。
HTTP：成功 200；参数错误 400；未找到 404；冲突 409；只读 403；内部 500。`cache-control: no-store`。

| Method | Path | 请求 | `data` 响应 |
| --- | --- | --- | --- |
| GET | `/installed` | `?cwd=` | `{ cwd, locations: LocationView[], skills: SkillView[], issues: IssueView[], presets: PresetView[], updates: UpdateState }` |
| GET | `/skill` | `?path=` | `{ skill: SkillView, content: string, files: Array<{path,size,type}> }` |
| POST | `/skill` | `{ location, name, description, whenToUse?, body }` | `{ skill: SkillView }` |
| PUT | `/skill` | `{ path, mtime, content }` | `{ skill: SkillView }` |
| POST | `/skill/state` | `{ path, enabled: boolean }` | `{ skill: SkillView }` |
| DELETE | `/skill` | `?path=` | `{ removed: true }` |
| POST | `/import` | `{ mode: 'paste'\|'dir', location, content?, dirPath? }` | `{ skill: SkillView, files: number }` |
| GET | `/diagnostics` | `?cwd=` | `{ issues: IssueView[], checkedAt: number }` |
| GET | `/sources` | — | `{ sources: SourceView[] }` |
| POST | `/sources` | `{ url, name? }` | `{ source: SourceView }` |
| PUT | `/sources/:id` | `{ url?, name?, enabled? }` | `{ source: SourceView }` |
| DELETE | `/sources/:id` | — | `{ removed: true }` |
| POST | `/sources/:id/refresh` | — | `{ source: SourceView }` |
| POST | `/sources/validate` | `{ url }` | `{ title, description, skillCount, sample: [{name, description, version}], warnings: string[] }` |
| GET | `/market` | `?sourceId=&q=&tag=&sort=&offset=&limit=&refresh=` | `{ sources: SourceView[], total: number, nextOffset: number\|null, skills: MarketSkillView[], fetchedAt: number }` |
| GET | `/market/skill` | `?sourceId=&name=&version?` | `{ skill: MarketSkillView, versions: [{version, publishTimestamp, enginesDsh, yanked}], readme: string }` |
| POST | `/market/install` | `{ sourceId, name, version?, location, conflict?: 'overwrite'\|'skip' }` | `{ skill: SkillView, record }` |
| POST | `/market/update` | `{ sourceId, name, version?, location }` | `{ skill: SkillView, record }` |
| POST | `/market/uninstall` | `{ name, location, preserveBackup? }` | `{ removed: true }` |
| GET | `/updates` | — | `UpdateState` |
| POST | `/check-updates` | `{ force?: boolean }` | `UpdateState` |
| POST | `/validate` | `{ content }` | `{ valid: boolean, name?, description?, error? }` |
| GET | `/settings` | — | `{ fontSize: number\|null, cwd: string, dshVersion: string\|null }` |

```ts
interface UpdateState {
  checking: boolean
  checkedAt: number
  errors: Array<{ sourceId: string; message: string }>
  updates: Array<{ name: string; location: SkillLocationId; current: string; available: string; localModified: boolean }>
}
```

**错误码**（PRD §13.3 的超集；新增码在实现中实际使用，复审时按此表核对）：

| 码 | HTTP | 含义 |
| --- | --- | --- |
| `E_UNAUTHORIZED` | 401/403 | 未授权 / 连接围栏拒绝 |
| `E_BAD_REQUEST` | 400 | 参数不合法（含 405 的方法不允许） |
| `E_NAME_INVALID` | 400 | name 非 kebab-case 或超长 |
| `E_NAME_MISMATCH` | 400 | 索引 name 与 `SKILL.md` frontmatter 不一致 |
| `E_FRONTMATTER` | 400 | frontmatter 不合法 |
| `E_TOO_LARGE` | 400 | 文件/正文超过上限 |
| `E_SKILL_UNKNOWN` | 400 | 索引里没有该技能 |
| `E_VERSION_UNKNOWN` | 400 | 版本不存在 |
| `E_VERSION_YANKED` | 400 | 版本被撤回 |
| `E_NO_COMPATIBLE` | 400 | 无兼容当前 DSH 的版本 |
| `E_PATH_OUTSIDE_ROOT` | 403 | 路径不在允许根内（含符号链接逃逸） |
| `E_READONLY_LOCATION` | 403 | 只读位置（预设内置 / 插件内置） |
| `E_NOT_FOUND` | 404 | 技能或文件不存在 |
| `E_NAME_TAKEN` | 409 | 目标位置已有同名 |
| `E_CONFLICT_MTIME` | 409 | 文件被外部修改（乐观锁冲突） |
| `E_VERSION_MUTATED` | 409 | 同版本文件 sha256 与记录不一致 |
| `E_CANCELED` | 409 | 用户取消 |
| `E_STALE_PAGE` | 409 | 分页引用的索引已被替换 |
| `E_SOURCE_URL_INVALID` | 400 | 源 URL 不规范/重复 |
| `E_SOURCE_UNREACHABLE` | 502 | 源不可达（网络/超时/redirect） |
| `E_SOURCE_HTTP` | 502 | 源返回非 2xx |
| `E_SOURCE_TOO_LARGE` | 502 | 索引正文超过 5 MiB |
| `E_SOURCE_SCHEMA` | 502 | 索引格式错误 |
| `E_INDEX_INVALID` | 502 | 索引语义错误（带 JSON path） |
| `E_INDEX_VERSION` | 502 | 不支持的 `format` |
| `E_CHECKSUM` | 502 | 文件校验失败 |
| `E_NOT_ENOUGH_SPACE` | 500 | 磁盘空间不足 |
| `E_INTERNAL` | 500 | 未分类内部错误 |

> 上游状态码只允许映射到 400/403/404/409/500/502；其它一律 500。

---

## 5. Client 全局符号（C1 定义，C2/C3/C4 使用）

`00-prelude.js` 必须定义（名字固定，不得改名）：

```js
const NS = 'skillManager'
const PANEL_ID = 'skill-manager'
const DEFAULT_FONT_SIZE = 14
const zh = { ... }                    // 字典
const en = { ... }

// 工具
function t(key, vars)                 // 取当前语言文案，支持 {name} 插值；当前语言从 ctx.locale 读
function fmtSize(bytes)               // "4.2 KB"
function fmtTime(sec)                 // 相对时间
function cx(...names)                 // class 合并
function api(path, options)           // fetch 包装：相对 URL、same-origin、返回 data 或抛 {code,message}
function toast(message, options)      // { tone: 'ok'|'error', actionLabel, onAction }
function icon(name, size)             // 返回内联 SVG 元素；name 见 §6

// 状态
const appState = {                    // 单一可变状态对象
  tab: 'installed',                   // installed | market | sources
  view: 'list',                       // list | detail
  detail: null,                       // { kind: 'installed'|'market', id, sourceId, name }
  cwd: '',
  search: '',
  filter: 'all',
  sort: 'location',
  marketSourceId: 'all',
  marketTag: 'all',
  marketSort: 'relevance',
  marketSkills: [],
  sources: [],
  installed: null,                    // GET /installed 的 data
  updates: null,
  fontSize: DEFAULT_FONT_SIZE,
  loading: false,
  error: null,
}
function setState(patch)              // 浅合并并触发重渲染
function rerender()                   // 由 99-apply 提供（React setState 包装）

// 数据加载
async function loadInstalled(force)
async function loadSources()
async function loadMarket(query)
async function loadUpdates(force)
async function checkUpdates(force)

// 视图
function renderPage()                 // 返回整页 React 元素（99-apply 调用）
```

**渲染约定**：

- 所有渲染函数返回 React 元素（用 `h(...)`），不直接操作 DOM（`document.body` 只允许 `50-modals.js` 的 portal 与 tooltip）。
- 每个 Tab 模块必须导出（即定义）`renderInstalledTab()` / `renderMarketTab()` / `renderSourcesTab()`，签名无参数，内部读 `appState`。
- `40-detail.js` 定义 `renderDetailPage()`（无参数，读 `appState.detail`），`99-apply.js` 在 `appState.view === 'detail'` 时调用它。
- `50-modals.js` 定义 `openModal(kind, payload)`、`closeModal()`、`renderModalLayer()`、`openDiagnosticsDrawer()`、`renderDiagnosticsDrawer()`、`renderToastHost()`。

**class 命名**：全部 `sm-` 前缀，例如 `sm-root`、`sm-page`、`sm-tabs`、`sm-tab`、`sm-row`、`sm-row-icon`、`sm-badge`、`sm-switch`、`sm-dialog`、`sm-btn`、`sm-btn-primary`、`sm-chips`、`sm-chip`、`sm-banner`、`sm-group`、`sm-detail`、`sm-detail-main`、`sm-detail-side`、`sm-card`、`sm-tooltip`、`sm-toast`。

---

## 6. 图标集（C1 实现 `icon(name, size)`）

必须支持（内联 SVG，`viewBox="0 0 24 24"`，`fill:none`，`stroke:currentColor`，`stroke-width:1.5`）：

`skill`（书页+星）、`installed`、`market`、`sources`、`search`、`refresh`、`plus`、`import`、`folder`、`user`、`users`、`sliders`、`puzzle`、`layers`、`shield`（code-review）、`database`、`git`、`file`、`image`、`script`、`chevron-down`、`chevron-right`、`arrow-up`（升级）、`check`、`x`、`edit`、`trash`、`power`、`more`（⋯）、`copy`、`alert`、`info`、`clock`、`link`、`package`。

**状态点**：`sm-dot`（8px 圆点），颜色由 `sm-dot-ok` / `sm-dot-warn` / `sm-dot-error` / `sm-dot-idle` / `sm-dot-update` 控制。

---

## 7. 视觉规格（C4 必须逐条实现）

**字号联动**（playbook §1）：

```css
.sm-root { --sm-fs: var(--dsh-content-font-size, 14px); font-size: calc(var(--sm-fs) - 1px); }
.sm-fs-16 { font-size: calc(var(--sm-fs) + 2px); }
.sm-fs-15 { font-size: calc(var(--sm-fs) + 1px); }
.sm-fs-14 { font-size: var(--sm-fs); }
.sm-fs-13 { font-size: calc(var(--sm-fs) - 1px); }
.sm-fs-12 { font-size: calc(var(--sm-fs) - 2px); }
.sm-fs-11 { font-size: calc(var(--sm-fs) - 3px); }
```

**页面骨架**（与 Plugins 页一致）：

- 根：`height:100%; display:flex; flex-direction:column; background:var(--dsw-alias-bg-base)`。
- 内容区：`padding: 0 48px 48px`，顶部 `28px`；标题 `calc(var(--sm-fs)+2px)/1.4 500`；描述 `calc(var(--sm-fs)-1px)`，`--dsw-alias-label-secondary`。
- 工具栏右对齐：搜索框 33px 高、`bg-layer-1`、12px 圆角、0.5px `border-l2`；刷新 32×32；主按钮 32px 高、`--dsw-alias-label-primary` 底 + `--dsw-alias-bg-base` 字。
- 分段 Tab：容器 34px 高、`bg-layer-3`、14px 圆角、padding 2px；Tab 30px 高、12px 圆角、padding 0 12px。
- 分组：`gap: 32px`；组头 22px 高、14px/500。

**列表行**（v2.3 原型）：

- 已安装行 65px 高、20px 圆角、padding 8px、行间 gap 2px、hover `--dsw-alias-interactive-bg-hover`。
- 市场行 76px 高、20px 圆角、padding 8px。
- 图标容器 49×49、16px 圆角、`background: var(--dsw-alias-bg-layer-1)`、`border: 1px solid var(--dsw-alias-border-l2)`、内 SVG 24×24、左下 8px 状态点。
- 名称 `var(--sm-fs)`/500；描述 `calc(var(--sm-fs)-1px)`、`label-tertiary`、单行省略。
- **标签栏**：紧跟名称行、`max-width:340px`、`flex-wrap:nowrap`、`overflow:hidden`，最多渲染 4 个；升级徽章固定第 1 位。
- **升级徽章**（`.sm-badge-update`）：13×13 SVG（circle r=9 + 上箭头 `M8.5 11.5L12 8m0 0l3.5 3.5M12 8v8`，stroke-width 1.8）+ 版本号；`background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)`；`color: color-mix(... 82%, var(--dsw-alias-label-primary))`；`border-color: color-mix(... 28%, transparent)`。
- 行尾：switch（36×20）或唯一主按钮；`⋯` 32×32。
- **禁止**行尾放标签或「有更新」文字。

**页内双栏详情**（v2.3，弃用抽屉）：

- 顶部：`← 返回`（12.5px，`label-tertiary`）+ 右侧状态标识。
- 头部：56×56 图标 + 名称（mono）+ 版本号 + 升级徽章 + ≤4 标签；右侧操作按钮组（安装/更新/编辑原文/复制命令/卸载删除）。
- 主体：`display:grid; grid-template-columns: 2fr 1fr; gap: 24px`。
- 左栏：已安装状态卡、描述与何时使用、SKILL.md 原文（行号 + 可编辑）、文件与 sha256 清单。
- 右栏：元信息卡（位置/rank/层/provider/来源/commit/license/engines）、调用方式与预设可见性、诊断卡。

**模态**（playbook §3）：

- `box-shadow: none`（内联 style，覆盖宿主默认）。
- 背景 `var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1))`。
- 遮罩 `background: transparent`。
- 560px 宽（确认框 360px）、20px 圆角（确认 14px）、0.5px 描边。
- Escape / 遮罩只关最上层（`dialogStack`）。
- 内容区滚动、`min-height: 0`。

**Tooltip**（playbook §2）：

- 300ms 悬停延迟；`calc(var(--sm-fs) - 4px)`；`--dsw-alias-label-secondary`；`bg-layer-2`；1px `border-l2`；无阴影；7px 圆角；`padding 6px 10px`；`max-width 290px`；`pointer-events:none`；挂 body 末尾；`z-index:2000`。
- 创建节点时复制 `--sm-fs`。

**Toast**：底部居中、12px 圆角、`bg-layer-3`、4s、可带「撤销」。

**禁止**：字面色值（除 `color-mix` 基于 token）、渐变、发光、`--dsw-hovercard-bg`。

---

## 8. locale 字典 key 规划（C1 负责汇总，各模块按前缀新增）

| 前缀 | 归属 |
| --- | --- |
| `panel.*` | 页面标题/描述 |
| `tab.*` | 三个 Tab |
| `action.*` | 按钮 |
| `filter.*` `sort.*` | 筛选/排序 |
| `loc.*` | 位置名 |
| `badge.*` | 徽章 |
| `banner.*` `empty.*` `state.*` | 状态 |
| `diag.*` | 诊断 |
| `market.*` | 市场 |
| `source.*` | 来源 |
| `install.*` `update.*` `uninstall.*` `delete.*` | 操作流程 |
| `detail.*` | 详情页 |
| `form.*` `toast.*` `error.*` | 表单/提示 |

**硬约束**：`zh` 与 `en` 键集完全一致；每个 key 必须在字典外被 `t('key')` 引用（否则 `pnpm test` 失败）。

---

## 9. 硬约束清单（`pnpm test` 会检查）

- [ ] `index.js` 只 import `node:` 与相对路径；导出 `name`、`inject`（数组）、`apply(ctx, config)`。
- [ ] `client.js` 含 `window.__ModuleLoader__.load(`，`id: '@xiechenghua01/dsh-skill-manager'`；只 `require('react')`；不含 `@deepseek-ai/` 字符串。
- [ ] `client.js` 中 `const zh = {` 与 `const en = {` 各一次，`    }` 收尾，键集一致、值非空、全部被引用。
- [ ] `locale/en.json` 与 `locale/zh.json` 键集一致、无空值。
- [ ] `market.json` 的 `category`/`labels` 已在根 `market.json` 声明（见 §10）。
- [ ] 任何文件不含 `/Users/...` 或 `/home/...` 绝对家目录。
- [ ] 所有颜色用 `--dsw-*` token 或基于 token 的 `color-mix`。
- [ ] `node --check` 通过（`index.js`、`client.js`、每个 `lib/*.mjs`）。

---

## 10. market.json 约定

根 `market.json` 需先声明新分类/标签。本插件使用：

- `category`: `"integrations"`
- `labels`: `["skills", "management", "ui-panel"]`

Lead 会先更新根 `market.json`。

---

## 11. 与原型/文档的对应关系

| 来源 | 用途 |
| --- | --- |
| `/Users/xiechenghua/Downloads/skills_manager_interaction_v2_3.md` | v2.3 交互与视觉规范（图标统一、标签左置、页内双栏详情、升级徽章 SVG） |
| `/Users/xiechenghua/Downloads/deepseek_harness_skills_v2_3.html` | 21 个画面与交互的可执行原型（数据模型、DOM 结构、文案） |
| `docs/plugins/skill-manager/product/skills-manager-prd.md` | 产品范围、状态矩阵、文案表、数据契约 |
| `docs/plugins/skill-manager/product/skill-market-index-spec.md` | 索引 format 1 规范（校验规则 R1–R30、安装契约） |
| `docs/plugins/skill-manager/design/skill-market-index-implementation.md` | 市场实现方案（拉取/缓存/安装/更新/路由） |
| `docs/plugin-ui-playbook.md` | 字号联动、tooltip、弹窗、交互陷阱 |
| `docs/plugins/skill-manager/research/*.md` | 平台事实（扫描根、rank、scope、API） |

**冲突裁决顺序**：交互稿 v2.3 > 原型 HTML > PRD > 其它文档。平台事实（扫描根/API 能力）以 research 为准。
