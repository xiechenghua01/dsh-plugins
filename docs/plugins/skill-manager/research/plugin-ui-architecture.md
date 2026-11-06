# DSH 插件 UI 架构研究：左侧栏入口 + 全屏主面板页

> 目标读者：实现 `@xiechenghua01/dsh-skill-manager`（左侧栏入口 + 全屏 Skill 管理页）的开发者。
> 结论先行：**注册 `main`（keyed）+ `sidebar.panellist`（list），两侧共用同一个 id/key；`order: 20`；不要用 `sidebar.footer.action`。**
>
> 调研对象：本机安装的 DeepSeek Harness 桌面应用（`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`，下文简写 `<asar>`）与本仓库两个第三方插件。
>
> 取证方式与可信度：
> - `<asar>` 内的 shipped 包源码用 `read` 工具直接读取（shell/glob/grep/node 无法进入 asar）。行号均来自本次实读。
> - Host 侧契约来自 `cordis_inspect_query`（`host/Service`、`host/Config`），可用。
> - **本会话 `cordis_inspect_query` 的 client 侧（`Slots`/`Service`/`Theme`）全部 10s 超时**，因此客户端事实改为静态阅读 shipped client 源码；个别只能推理的点标「未验证」。
> - 版本：`<asar>/package.json`（第 6 行）= `0.2.2-rc.1`，`<asar>/dsh/node_modules/@deepseek-ai/*` 均为 `0.2.2-rc.1`；本仓库 `package.json` 的 `engines.dsh` 声明 `>=0.2.1-rc.5 <0.3.0`。`~/.dsh/dsh-runtimes/dsh-primary-runtime/runtime.json` 记录的 `desktopVersion` 是 `0.2.1-rc.5`，两者关系未验证（以实际安装的 app.asar 为准即可）。

---

## 0. 一页结论（给实现者）

| 问题 | 结论 | 依据 |
|---|---|---|
| 左侧栏入口用哪个槽？ | `sidebar.panellist`（list；任务现场事实标注 purpose「Global panel icons」，本轮 client inspect 超时未复核） | `<asar>/…/dsh-client-ui-sidebar/lib/client.js:749-752`（声明）、`:206-238`（渲染） |
| 页面用哪个槽？ | `main`（keyed，scope root），`key` 必须等于 sidebar 条目的 `id` | `<asar>/…/dsh-client-ui-layout/lib/client.js:713-716`、`:122-128`、`:522-526`、`:699` |
| 两个注册的公共标识？ | 同一个字符串：`PANEL_ID = 'skill-manager'` | shipped：`…/ui-plugin-manager/lib/client.js:7679-7680, 7750-7752, 7820-7823`；`…/ui-schedule/lib/client.js:19198, 19360-19362, 19387-19390` |
| `order` 用多少？ | 20（`plugins`=0、`schedules`=10；order 只是排序键，重复不冲突） | `…/ui-sidebar/lib/client.js:689-704` |
| 要不要同时注册 `sidebar.footer.action`？ | **不要**。它是底部账户菜单上方的动作位，owner props 只有 `{wide}`，不是全局面板导航 | `…/ui-sidebar/lib/client.js:765-768, 558-565`；本仓库 `plugins/session-stats/client.js:2120-2141` |
| 图标组件收到什么？ | `{ size, active }`（宽侧栏 16 / 折叠 rail 18），label 由注册参数提供 | `…/ui-sidebar/lib/client.js:228-235` |
| 折叠 rail 行为？ | 图标常显、`label` 进 Tooltip（`delayMs:500`），展开态才显示文字 | 同上 `:208-235` |
| 能读到当前会话吗？ | 能拿到 `useSessions`/`usePanelInfo` 标准 props；「当前主视图会话」有保留语义问题，见 §7 | `…/ui-session/lib/client.js:1118-1129`；`…/ui-layout/lib/client.js:58-63` |
| 浏览器能直接写 `cordis.patch.yml` 吗？ | 不能也不应该；配置写走 Host `configEditor.edit` | §6、`<asar>/…/dsh-config-editor/lib/index.js:69-133` |

---

## 1. 槽位拓扑与选择结论

### 1.1 slot 树（由谁声明）

`ui-layout` 注册根槽 `root` 并声明子槽（`<asar>/…/dsh-client-ui-layout/lib/client.js:705-736`）：

```js
ctx.slots.register({
  name: 'root',
  children: {
    sidebar:        { kind: 'single', scope: 'root' },
    main:           { kind: 'keyed',  scope: 'root' },   // ← 全屏页面槽
    rightbar:       { kind: 'single', scope: 'root' },
    'shell.bottom': { kind: 'single', scope: 'root' },
    'shell.overlay':{ kind: 'list',   scope: 'root' },
    'shell.leading':{ kind: 'single', scope: 'root' },
  },
}, AppFrame)
```

`ui-sidebar` 占据 `sidebar`，并声明其子槽（`<asar>/…/dsh-client-ui-sidebar/lib/client.js:733-771`）：

```js
ctx.slots.register({
  name: 'sidebar',
  children: {
    'sidebar.brand.mark':        { kind: 'single', scope: 'root' },
    'sidebar.brand.name':        { kind: 'single', scope: 'root' },
    'sidebar.toggle.badge':      { kind: 'single', scope: 'root' },
    'sidebar.panellist':         { kind: 'list',   scope: 'root' }, // ← 左侧栏入口列表
    'sidebar.panellist.actions': { kind: 'list',   scope: 'root' }, // “更多”菜单行
    'sidebar.workspaces':        { kind: 'single', scope: 'root' },
    'sidebar.settings':          { kind: 'single', scope: 'root' },
    'sidebar.footer.action':     { kind: 'list',   scope: 'root' }, // ← 底部动作位
  },
}, SidebarRoot)
```

第三方插件**不声明槽**，只向已声明的子槽 `inject + register`。

### 1.2 `main`：keyed 槽，一个 key 一个页面

- 渲染：`MainPanel` 订阅 `panelInfo.activePanelId`，然后
  `renderSlot('main', {}, { entryKey: panelId ?? 'conversation' })`
  —— `<asar>/…/dsh-client-ui-layout/lib/client.js:122-128`。
  即：**没有全局面板被选中时渲染 key=`conversation`；选中 `plugins` 时渲染 key=`plugins` 的那一条注册**。同一时刻只挂载一个 main 条目。
- 选中校验：`LayoutController.selectPanel(panelId)` 会调用 `hasMainPanel(panelId)`，而它实现为
  `ctx.slots.entries('main').some((e) => e.options.key === id)`
  —— `<asar>/…/dsh-client-ui-layout/lib/client.js:522-526, 699`。
  **main 未注册就 selectPanel 会抛错**（`layout.selectPanel: main panel "x" is not registered`）。
- 失效回收：`main` 槽有订阅，未注册的 activePanelId 会被重置为 `null`（回到 conversation）——
  `<asar>/…/dsh-client-ui-layout/lib/client.js:696-698, 772-773`；`retainMainPanels` 动作见 `:464-466`。

### 1.3 `sidebar.panellist`：左侧栏全局面板图标列表

声明（见 §1.1）。渲染在 `PanelRow`（`<asar>/…/dsh-client-ui-sidebar/lib/client.js:206-238`）：

```js
function PanelRow({ id, label, wide, usePanelInfo, selectPanel, trackEntryClick, renderSlot }) {
  const active = usePanelInfo((info) => info.activePanelId === id)
  return jsx(Tooltip, {
    label, delayMs: 500, disabled: wide,          // 折叠 rail 时显示 label，展开时不显示 tooltip
    children: jsx('button', {
      type: 'button',
      className: clsx(css.panelRow, active && css.panelActive),
      'aria-label': label,
      'aria-current': active ? 'page' : undefined,
      onClick: () => selectPanel(id),             // = ctx.layout.selectPanel(id)
      children: [
        jsx('span', { className: css.panelGlyph, 'aria-hidden': 'true',
          children: renderSlot('sidebar.panellist', { size: wide ? 16 : 18, active }, { only: id }) }),
        wide && jsx('span', { className: clsx(css.panelTitle, css.wide) }, label),
      ],
    }),
  })
}
```

要点（全部为事实）：

1. **ownerProps = `{ size, active }`**：`size` 在展开态是 16、折叠 rail 态是 18；`active` 是该 panelId 是否等于当前 `activePanelId`。
2. **label 投影**：Agent 侧从 `entriesOfSlot('sidebar.panellist')` 读 `options.id / options.order / options.label`，
   用 `resolveSlotLabel(options.label)` 解析（支持 thunk），缺省回退 `id`，按 `order ?? 0` 升序排序
   —— `<asar>/…/dsh-client-ui-sidebar/lib/client.js:689-704`。
   因此注册参数 `label: () => t('panel.title')` 会随 locale revision 重新解析（`:706` 还订阅了 locale）。
3. **点击即导航**：`selectPanel(id)` → `ctx.layout.selectPanel(id)`（`:719-721`）。
   所以 **panellist 的 `id` 必须与 main 的 `key` 完全相同**，否则点击抛错。
4. **rail（折叠态）**：侧栏 `wide = drawer || !collapsed`（`:315`）。折叠时只渲染 glyph，Tooltip 承载 label；
   没有额外 CSS 需要插件处理——`PanelRow` 已做。插件图标只需按 `size` 画即可。
   shipped Plugins 图标甚至忽略 `active`：`function PluginsPanelIcon({ size }) { return jsx(IconPluginPinwheelOutlineRegular, { size }) }`
   —— `<asar>/…/dsh-client-ui-plugin-manager/lib/client.js:7609-7616`。
5. **顺序与“更多”菜单**：`panels.length > 0 && <nav>` 渲染
   `panels.filter(({ id }) => id === 'plugins' || !unpinned.includes(id)).map(...)`
   —— `<asar>/…/dsh-client-ui-sidebar/lib/client.js:507-539`。
   `plugins` 恒显示且不可取消固定（`:26-28`）；`schedules` 等其它条目可被用户 pin/unpin，unpin 后进「更多」菜单
   （`sidebar.panellist.actions`，`:239-286, 518-539`）。第三方插件无法阻止自己被移入「更多」。
6. **id 唯一性**：list 槽以 `id` 作为条目标识，`PanelRow` 的 React key 也用它（`:510-517`）；重复 id 属未定义/未验证行为，**必须全局唯一**。`skill-manager` 未占用。
   shipped 源码里也直接写明“list-slot registration requires id”（`<asar>/…/dsh-client-ui-plugin-manager/lib/client.js:7636-7639`）；
   keyed 槽则相反，读的是 `options.key`（`<asar>/…/dsh-client-ui-layout/lib/client.js:697`）。

### 1.4 `sidebar.footer.action` 的定位（为什么不用）

- 声明：`kind: 'list'`（`<asar>/…/dsh-client-ui-sidebar/lib/client.js:765-768`）。
- 渲染：在侧栏底部 `footArea`，位于 `sidebar.settings`（账户菜单）上方，
  owner props 只有 `{ wide }` —— `<asar>/…/dsh-client-ui-sidebar/lib/client.js:557-565`。
- 它不在「全局面板」导航语义里：没有内置的 `active` 态、没有统一 Tooltip/label 行、没有和 `main` 的 id 绑定校验。
  本仓库 `plugins/session-stats` 用它做「统计」页开关，是自己手工画图标 + `aria-pressed` +
  `ctx.layout.selectPanel(null)` 回退的——`plugins/session-stats/client.js:728-757, 2120-2141`。
- **结论**：需要「左侧栏入口 + 全屏页面」时用 `sidebar.panellist`；`footer.action` 只适合底部动作/快捷开关。
  `mcp-manager` 则是 Settings 子页（`settings.section` + `settings.section.icon`），也不属于本形态。

### 1.5 两个 shipped 参照的完整注册形状

**Plugins 页**（registrant `tk`，`id/key/order = plugins`）：

```js
// <asar>/…/dsh-client-ui-plugin-manager/lib/client.js:7677-7692
const NS = 'pluginManager'
const PANEL_ID = 'plugins'
const inject = ['slots','locale','remote','remote.pluginManager','remote.pluginInventory',
  'remote.pluginRegistryProbe','configForms','layout','remoteAccess']

// :7744-7819（main；内部还声明了自己的子槽，见 §8）
yield ctx.slots.inject('main', function* () {
  yield ctx.slots.register({
    name: 'main', key: PANEL_ID, locale: NS, store,
    inject: () => ({ ...face, createHeaderRef }),
    children: { 'plugins.tab': { kind: 'list', scope: 'root' }, /* … */ },
  }, PluginManagerPage)
  // 打开/切页：ctx.layout.selectPanel(PANEL_ID)
  // 激活监听：ctx.layout.panelInfo.subscribe(() => …getSnapshot().activePanelId…)
})

// :7820-7826
yield ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: PANEL_ID, order: 0,
  label: () => t('panel'), locale: NS,
}, PluginsPanelIcon))
```

**Schedules 页**（`id/key = schedules`）：`<asar>/…/dsh-client-ui-schedule/lib/client.js:19197-19213`（NS/PANEL_ID/inject）、
`:19360-19386`（main）、`:19387-19393`（panellist，`order: 10`，`TaskManagerIcon`）。

### 1.6 唯一性规则（三层命名空间，别混）

| 层 | 标识 | 作用域 | 规则与现状 |
|---|---|---|---|
| Loader 行 | `cordis.patch.yml` 的 `- id:` | 整个 Loader 组合（Host + 浏览器） | 必须全局唯一，不得与 shipped 行冲突（`AGENTS.md`：行 id 冲突会破坏组合）。本插件用 `skill-manager`。 |
| main 面板 | `ctx.slots.register({name:'main', key})` 的 `key` | 根 `main` keyed 槽的一个 cell | 同一 key 只能有一个“胜出”条目；`layout.selectPanel` 只校验“存在同 key 的 main 条目”。已占用：`conversation`、`plugins`、`schedules`、`session-stats`。用 `skill-manager`（未占用）。重复 key 的具体裁决（后注册覆盖/首个胜出）**未验证**，不要试探。 |
| 侧栏条目 | `ctx.slots.register({name:'sidebar.panellist', id})` 的 `id` | list 槽的条目身份（React key、`selectPanel(id)` 的入参） | 必须全局唯一；`PanelRow` 用 `id` 作 React key（`…/ui-sidebar/lib/client.js:510-517`）。`id` 必须与 main 的 `key` 相同。已占用：`plugins`、`schedules`。用 `skill-manager`。 |
| locale 命名空间 | `ctx.locale.register(ns, …)` 的 `ns` | 客户端 locale 服务 | 建议与包名 slug 对应且唯一；本插件用 `skillManager`（shipped 用 `pluginManager`、`schedule.manager`）。 |
| 槽内子槽 | `children: {'skill-manager.detail.actions': …}` | 你声明的命名空间 | 建议前缀化，避免和 shipped 的 `plugins.*` / `conversation.*` 撞名。 |

> `order` 不参与唯一性：`sidebar.panellist` 按 `order ?? 0` 升序渲染，重复 order 合法（`…/ui-sidebar/lib/client.js:689-704`）。
> 20 排在 shipped 的 `plugins`(0)、`schedules`(10) 之后，符合预期。

### 1.7 注册参数速查（可直接对照写）

```js
// 全屏页（keyed 槽）
ctx.slots.register({
  name: 'main',
  key: 'skill-manager',          // 必填；keyed 槽的 cell 标识
  locale: 'skillManager',        // 可选；声明后渲染器注入 t
  inject: () => ({ t }),         // 可选；与标准 props 合并（ownerProps 最后覆盖）
  children: undefined,           // 可选；需要给其它插件扩展点时才声明（见 §8）
}, SkillManagerPage)

// 左侧栏入口（list 槽）
ctx.slots.register({
  name: 'sidebar.panellist',
  id: 'skill-manager',           // 必填；list 槽条目身份，且必须等于 main 的 key
  order: 20,                     // 可选；越小越靠上（order ?? 0，升序）
  locale: 'skillManager',        // 可选；渲染器会给图标组件注入 t
  label: () => t('panel.title'), // 可选；sidebar 用 resolveSlotLabel 解析（支持 thunk），缺省回退 id
}, SkillManagerIcon)
```

- props 合成顺序：`{...标准kit, ...entry.inject(), ...槽级 inject, ...ownerProps}`（ownerProps 最后）
  —— `<asar>/…/dsh-client-ui-renderer/lib/client.js:784-790`。
- `main` 的 ownerProps 是 `{}`（`renderSlot('main', {}, …)`）；`sidebar.panellist` 的 ownerProps 是 `{ size, active }`。
- `locale` 命名空间必须已通过 `ctx.locale.register(ns, …)` 注册，否则渲染器装配报错（`…/ui-renderer/lib/client.js:742-746`）。

---

## 2. 最小可运行骨架（可直接抄）

目录：`plugins/skill-manager/`
```
package.json
cordis.patch.yml
index.js
client.js
locale/en.json
locale/zh.json
icon.svg
```

### 2.1 `package.json`

```json
{
  "name": "@xiechenghua01/dsh-skill-manager",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Skill manager panel for the DeepSeek Harness Web GUI: a left-sidebar entry opening a full-page Skill catalog.",
  "license": "MIT",
  "author": "xiechenghua01",
  "homepage": "https://github.com/xiechenghua01/dsh-plugins/tree/main/plugins/skill-manager",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/xiechenghua01/dsh-plugins.git",
    "directory": "plugins/skill-manager"
  },
  "engines": { "dsh": ">=0.2.1-rc.5 <0.3.0" },
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg",
    "./package.json": "./package.json"
  },
  "files": ["README.md", "index.js", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": [
        "@deepseek-ai/dsh-api-remotes",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-layout",
        "@deepseek-ai/dsh-client-ui-sidebar"
      ]
    }
  }
}
```

- 这组 `dsh.client.inject` 照抄 shipped Plugins 页（`<asar>/…/dsh-client-ui-plugin-manager/package.json:37-47`：恰好这四个包）。
  如果完全不用 `ctx.remote.*`，`@deepseek-ai/dsh-api-remotes` 可以删；但保留与 shipped 一致最稳。
- **不需要** `@deepseek-ai/dsh-client-ui-renderer`。slot 渲染器是 web shell 的基础设施，注册 `sidebar.panellist` 不需要直接依赖它。
- `immediately: true` 沿用本仓库既有两个插件的写法；shipped Plugins 页没有它也能正常出现在侧栏（说明它不是侧栏入口的前提）。语义见 §9“未验证”。
- 仓库校验（`AGENTS.md`「Invariants」）要求：exact SemVer、`private: true`、`exports["."]`、`dsh.bundle.patch`、`engines.dsh`；`client.js` 只 `require('react')`、只 `load({ id: <包名>, factory })`；`locale/en.json` 与 `locale/zh.json` 键集一致且无空值；`cordis.patch.yml` 行 id 唯一。

### 2.2 `cordis.patch.yml`

```yaml
# Skill Manager bundle：一个 Host 行（/skill-manager/api/*）+ 一个浏览器半（main 面板 + 左侧栏入口）。
# 行 id `skill-manager` 只属于本包，不得与 shipped 行（如 session-stats、plugins、schedules）冲突。
- insert:
    - id: skill-manager
      name: '@xiechenghua01/dsh-skill-manager'
      config:
        # 可选：额外的 skill 根目录（默认读 DSH 自身的 skill 目录，见 §6）
        roots: []
```

> 行 id 是 **Loader 层**唯一性（`- id: skill-manager`）；面板 id `skill-manager` 是 **client slot 层**唯一性（`sidebar.panellist.id` 与 `main.key`）。两者恰好同名但不是同一命名空间。

### 2.3 `index.js`（Host 半：路由 + 围栏 + 读 skill）

```js
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const name = 'skill-manager'
export const inject = ['webServer', 'connection']

const API = '/skill-manager/api/skills'

const DEFAULTS = { roots: [], cacheMs: 2000 }

function connectionOf(ctx) {
  // connection 的包是 browser-side 类型，Host 侧只做结构访问（同 session-stats 的做法）
  return Reflect.get(ctx, 'connection')
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function rejected(ctx, req, res) {
  const rejection = connectionOf(ctx).requestRejection(req) // 401 | 403 | undefined
  if (rejection === undefined) return false
  res.statusCode = rejection
  res.end()
  return true
}

export function apply(ctx, config) {
  const settings = { ...DEFAULTS, ...(config !== null && typeof config === 'object' ? config : {}) }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: API,
    handler: async (req, res) => {
      try {
        if (rejected(ctx, req, res)) return
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('allow', 'GET')
          res.end()
          return
        }
        const url = new URL(String(req.url ?? ''), 'http://localhost')
        const sessionId = url.searchParams.get('sessionId')

        // 1) 某个会话的“用户可调用 skill”视图（Host service，直接调用，不经过 Remote）
        const catalog = ctx.get('sessionSkillCatalog')
        if (sessionId !== null && catalog !== undefined) {
          sendJson(res, 200, await catalog.list({ sessionId }, AbortSignal.timeout(5000)))
          return
        }

        // 2) 全局/工作区视图（skills 是可选服务，必须先判空）
        const skills = ctx.get('skills')
        if (skills === undefined) {
          sendJson(res, 200, { skills: [], unavailable: true })
          return
        }
        const cwd = url.searchParams.get('cwd') ?? process.cwd()
        const snapshot = typeof skills.snapshot === 'function'
          ? await skills.snapshot({ cwd })
          : { skills: await skills.list({ cwd }), complete: true }
        sendJson(res, 200, snapshot)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? 'unknown error')
        sendJson(res, 500, { code: 'internal-error', message: message.slice(0, 500) })
      }
    },
  }), `skill-manager: GET ${API}`)

  // 需要定时刷新时：
  // ctx.effect(() => ctx.timer.interval(() => { /* … */ }, 5000), 'skill-manager: sampler')
}
```

说明：
- `inject` 为硬依赖：`webServer`、`connection` 缺失则该插件不会激活（Cordis 等待注入）。
  `skills` / `sessionSkillCatalog` 用 `ctx.get(...)` 可选读取：`host/Service` 的 `access.optional.expression` 明确要求 `requiresUndefinedCheck: true`。
- `kind: 'exact'` 的路由按 `(kind, path)` 去重，重复注册会抛错（`host/Service` webServer.register 描述）。
- 只 import `node:` 内置与相对文件（仓库校验会强制；`AGENTS.md`）。

### 2.4 `client.js`（浏览器半：main + sidebar.panellist 双注册）

```js
window.__ModuleLoader__.load({
  id: '@xiechenghua01/dsh-skill-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'skillManager'
    const PANEL_ID = 'skill-manager'

    const zh = {
      'panel.title': '技能管理',
      'panel.description': '浏览、编辑本机与工作区的 Skill',
      'action.refresh': '刷新',
      'state.loading': '加载中…',
      'state.error': '加载失败',
      'state.retry': '重试',
      'state.unauthorized': '未授权，请重新登录',
      'state.empty': '暂无技能',
      'table.name': '名称',
      'table.source': '来源',
      'table.description': '描述',
      'table.invocable': '可调用',
    }
    const en = {
      'panel.title': 'Skills',
      'panel.description': 'Browse and edit Skills from the machine and the workspace',
      'action.refresh': 'Refresh',
      'state.loading': 'Loading…',
      'state.error': 'Failed to load',
      'state.retry': 'Retry',
      'state.unauthorized': 'Not authorized. Sign in again.',
      'state.empty': 'No skills yet',
      'table.name': 'Name',
      'table.source': 'Source',
      'table.description': 'Description',
      'table.invocable': 'Invocable',
    }

    /** 侧栏图标：owner 只给 { size, active }；展开 16 / 折叠 rail 18。 */
    function SkillManagerIcon(props) {
      const size = props !== null && typeof props === 'object' && typeof props.size === 'number' ? props.size : 18
      const active = props !== null && typeof props === 'object' && props.active === true
      return h(
        'svg',
        {
          width: size, height: size, viewBox: '0 0 24 24',
          'aria-hidden': 'true', focusable: 'false',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
          strokeLinecap: 'round', strokeLinejoin: 'round',
          opacity: active ? 1 : 0.72,
        },
        h('path', { d: 'M4 7h10' }),
        h('path', { d: 'M4 12h16' }),
        h('path', { d: 'M4 17h7' }),
        h('circle', { cx: 18, cy: 7, r: 2.2 }),
      )
    }

    /** 全屏页面：main 条的组件。标准 props 含 t / usePanelInfo / useSessions 等。 */
    function SkillManagerPage(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const t = typeof source.t === 'function' ? source.t : (key) => key
      const [state, setState] = React.useState({ status: 'loading', skills: [], error: null })

      const load = React.useCallback(async (signal) => {
        setState((prev) => ({ ...prev, status: prev.skills.length === 0 ? 'loading' : 'refreshing' }))
        try {
          // 相对 URL，不带前导斜杠：保留 document mount 前缀
          const response = await fetch('skill-manager/api/skills', {
            headers: { accept: 'application/json' },
            signal,
          })
          if (response.status === 401) {
            setState({ status: 'unauthorized', skills: [], error: null })
            return
          }
          if (!response.ok) throw new Error(`HTTP ${String(response.status)}`)
          const payload = await response.json()
          setState({ status: 'ready', skills: Array.isArray(payload.skills) ? payload.skills : [], error: null })
        } catch (error) {
          if (error !== null && typeof error === 'object' && error.name === 'AbortError') return
          setState({ status: 'error', skills: [], error })
        }
      }, [])

      React.useEffect(() => {
        const controller = new AbortController()
        load(controller.signal)
        return () => controller.abort()
      }, [load])

      const body = state.status === 'loading'
        ? h('p', { className: 'skm-state' }, t('state.loading'))
        : state.status === 'unauthorized'
          ? h('p', { className: 'skm-state', role: 'alert' }, t('state.unauthorized'))
          : state.status === 'error'
            ? h('div', { className: 'skm-state', role: 'alert' },
                h('p', null, t('state.error')),
                h('button', { type: 'button', onClick: () => load() }, t('state.retry')))
            : state.skills.length === 0
              ? h('p', { className: 'skm-state' }, t('state.empty'))
              : h('table', { className: 'skm-table' },
                  h('thead', null, h('tr', null,
                    h('th', null, t('table.name')),
                    h('th', null, t('table.source')),
                    h('th', null, t('table.description')),
                    h('th', null, t('table.invocable')),
                  )),
                  h('tbody', null, state.skills.map((skill) => h('tr', { key: String(skill.name) },
                    h('td', null, String(skill.name)),
                    h('td', null, String(skill.source ?? '')),
                    h('td', null, String(skill.description ?? '')),
                    h('td', null, skill.invocation !== undefined && skill.invocation.userInvocable === true ? '是' : '—'),
                  ))),
                )

      return h(
        'section',
        { className: 'skm-page', 'aria-label': t('panel.title') },
        h('div', { className: 'skm-scroll' },
          h('div', { className: 'skm-content' },
            h('header', { className: 'skm-heading' },
              h('div', null,
                h('h1', { className: 'skm-title' }, t('panel.title')),
                h('p', { className: 'skm-subtitle' }, t('panel.description'))),
              h('button', { type: 'button', className: 'skm-refresh', onClick: () => load() },
                t('action.refresh'))),
            body,
          ),
        ),
      )
    }

    const CSS = `
.skm-page{width:100%;min-width:0;height:100%;min-height:0;display:flex;overflow:hidden;
  background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6}
.skm-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
.skm-content{max-width:1040px;margin:0 auto;padding:0 clamp(24px,4vw,48px) 48px}
.skm-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
  padding-top:28px;margin-bottom:24px}
[data-platform='darwin'] .skm-heading{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.skm-title{font-size:20px;font-weight:500;line-height:28px;margin:0}
.skm-subtitle{margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px}
.skm-refresh{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);
  background:transparent;color:var(--dsw-alias-label-primary);padding:6px 12px;cursor:pointer}
.skm-refresh:hover{background:var(--dsw-alias-interactive-bg-hover)}
.skm-state{color:var(--dsw-alias-label-secondary);padding:24px 0}
.skm-table{width:100%;border-collapse:collapse}
.skm-table th,.skm-table td{text-align:left;padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l2)}
.skm-table th{color:var(--dsw-alias-label-secondary);font-weight:400}
`

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skill-manager: dictionaries')

        ctx.effect(() => {
          if (typeof document === 'undefined' || document === null) return () => {}
          const style = document.createElement('style')
          style.dataset.plugin = '@xiechenghua01/dsh-skill-manager'
          style.textContent = CSS
          const head = document.head !== undefined && document.head !== null ? document.head : document.documentElement
          if (head === undefined || head === null) return () => {}
          head.appendChild(style)
          return () => { if (typeof style.remove === 'function') style.remove() }
        }, 'skill-manager: styles')

        const t = ctx.locale.bind(NS)

        // 1) 全屏页面：main 是 keyed 槽，key 必须与 sidebar 条目 id 相同。
        ctx.effect(
          () => ctx.slots.inject('main', () => ctx.slots.register(
            { name: 'main', key: PANEL_ID, locale: NS, inject: () => ({ t }) },
            SkillManagerPage,
          )),
          'skill-manager: main panel',
        )

        // 2) 左侧栏全局面板入口：list 槽，注册参数为 id/order/label（+ locale）。
        ctx.effect(
          () => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 20,
              locale: NS,
              label: () => t('panel.title'),
            },
            SkillManagerIcon,
          )),
          'skill-manager: sidebar panel entry',
        )
      },
    }
  },
})
```

说明：
- 打开页面不需要额外代码：`PanelRow` 的 onClick 已调用 `ctx.layout.selectPanel(id)`。
  如果要在插件代码里主动打开（例如从别处跳转）：`ctx.layout.selectPanel('skill-manager')`；
  `selectPanel` 之前确保 main 已注册，否则抛错（§1.2）。
- 读当前激活面板：`ctx.layout.panelInfo.getSnapshot().activePanelId` 或组件里的 `usePanelInfo(...)`
  —— shipped 用法 `<asar>/…/dsh-client-ui-plugin-manager/lib/client.js:7798-7800`、本仓库 `plugins/session-stats/client.js:734-737`。
- 组件 props 的实际拼装：`{...kit, ...injected, ...slotInjected, ...ownerProps}`
  —— `<asar>/…/dsh-client-ui-renderer/lib/client.js:784-790`，**ownerProps 最后合并、优先**。
  所以 `SkillManagerIcon` 拿到 `size/active`；`SkillManagerPage`（main，ownerProps 为空对象）拿到 `t` 与标准 props。
- 不要在 `factory` 里做副作用（样式注入、fetch、订阅都必须放进 `apply`/`ctx.effect`）；
  client-modules 的注释把这条写成契约：`<asar>/…/dsh-client-modules/lib/client.js:16-24`（factory 延迟到 materialize 才执行）。

### 2.5 `locale/en.json`、`locale/zh.json`

仓库校验要求两者键集一致、无空值；shipped 的 `locale/*.json` 只服务插件市场的元数据展示，**运行期 UI 文案实际来自 `client.js` 里 `ctx.locale.register` 的字典**（`plugins/session-stats/CONTRACT.md:429-431`）。两处键集保持一致即可。

---

## 3. 客户端插件契约（浏览器半）

### 3.1 加载模型

- 浏览器半文件必须调用 `window.__ModuleLoader__.load({ id, factory })`，`id` 等于包名
  （仓库校验；shipped 同形：`<asar>/…/dsh-client-ui-plugin-manager/lib/client.js:1-3`）。
- 执行 bundle 只**注册 factory**；`factory(require)` 在首次 import/materialize 时才运行，并会被缓存
  —— `<asar>/…/dsh-client-modules/lib/client.js:16-24, 703-716, 805-832`。
- 同一个 bundle 脚本被执行两次会因重复注册而抛错（`…dsh-client-modules/lib/client.js:708-711`）；HMR 走 `invalidate` 流程（`:962-977`）。
- `factory(require)` 里只允许 `require('react')`（仓库约束）；shipped 包可以 require `react/jsx-runtime`、`@deepseek-ai/*`，第三方不行。

### 3.2 `dsh.client` 清单与加载顺序

- 校验器：`<asar>/…/dsh-client-modules/lib/index.js:61-100`（`parseDshClient`）：
  `platform` 必填且必须 `'web'` 才会被收入图；`inject`/`external` 是字符串数组；`immediately` 是可选布尔。
- `resolveMeta`（`:783-802`）要求：声明了 `dsh.client` 就必须有 `exports["./client"]`，否则抛错。
- `dsh.client.inject` 的语义是**包级模块图依赖**：组装 `__DSH_BOOT__` 时按依赖排序（`orderByModuleGraph`，`:480-502`），
  浏览器加载某包前会先让其 `inject` 里的包到达（`arriveGraphRow`，`<asar>/…/dsh-client-modules/lib/client.js:778-796`）。
- 它**不是** Cordis 服务注入；服务注入是 factory 返回对象里的 `inject: ['slots','locale','layout',…]`。
  两者都不能省：包级保证代码到达顺序，服务级保证激活等待。
- `__DSH_BOOT__` 里同时有一份 `plugins: [{ id, inject, immediately }]` 视图（`<asar>/…/dsh-client-modules/lib/client.js:119-142`），
  供页面控制器使用；`entries[].url` 是单包 bundle 地址，`batches[]` 是启动批（`:146-169`）。
- **不需要 `@deepseek-ai/dsh-client-ui-renderer`**：slot 渲染器由 web shell 安装，第三方只需依赖
  `dsh-client-ui-layout`（提供 `ctx.layout` 与 `main` 槽声明）和 `dsh-client-ui-sidebar`（声明 `sidebar.panellist`）。
  若要用 `ctx.sessions` 服务，再把 `@deepseek-ai/dsh-api-session-controller` 加进包级 inject（shipped Schedules 就是
  `…/ui-schedule/package.json` 里包含它，见 `<asar>/…/dsh-client-ui-schedule/package.json:22-39`）。

### 3.3 `ctx.*` API 用法（本插件相关）

| API | 用法 | 证据 |
|---|---|---|
| `ctx.slots.inject(name, cb)` | 在子槽可用后执行 `cb`；返回 disposer | shipped 全部如此；`…/ui-plugin-manager/lib/client.js:7744, 7820` |
| `ctx.slots.register(options, Component)` | `options = { name, key?, id?, order?, locale?, label?, inject?, children?, store? }` | 同上、`…/ui-sidebar/lib/client.js:733-771` |
| `ctx.locale.register(ns, {zh,en,…})` | 注册字典；返回 disposer | `…/ui-plugin-manager/lib/client.js:7700-7709` |
| `ctx.locale.bind(ns)` | 得到 `t(key, params)` | `…/ui-plugin-manager/lib/client.js:7710` |
| `ctx.effect(() => {…return disposer}, 'label')` | 每个副作用都必须包在 effect 里 | `plugins/session-stats/CONTRACT.md:15-21` |
| `ctx.layout.selectPanel(id \| null)` | 打开全局面板 / 回 conversation | `…/ui-layout/lib/client.js:521-526` |
| `ctx.layout.panelInfo` | `{ getSnapshot(), subscribe() }`，快照 `{ activePanelId }` | `…/ui-layout/lib/client.js:506-549`（LayoutController）、`:699-702`（provideRoot 绑定） |
| `ctx.layout.toggleSidebar()` | 展/收左侧栏 | `…/ui-layout/lib/client.js:537-540` |
| `ctx.get('service')`（客户端） | 可选服务读取；如 `sessions`、`uiWorkspace` | `…/ui-session/lib/client.js:855-858` 等 |

### 3.4 locale 时机

- 必须在注册 slot 前 `register`，并在组件里通过 entry 的 `locale: NS` 让渲染器注入 `t`
  （renderer 的 locale seat 逻辑：`<asar>/…/dsh-client-ui-renderer/lib/client.js:541-558, 742-746`）。
  `entry.locale` 声明了但 locale 服务缺失时，渲染器会抛 `SlotAssemblyError`（`:744`）。
- locale 切换时 `t` 的引用会变（revision 入缓存键，`:533-558`），memo 组件可借浅比较刷新。

### 3.5 主题 token

只允许 `--dsw-*`（仓库约束）。本机 rc.5 已验证可用的全集（摘自 `plugins/session-stats/CONTRACT.md:34-47`）：

```
--dsw-alias-bg-base          --dsw-alias-bg-layer-1       --dsw-alias-bg-layer-2
--dsw-alias-bg-overlay       --dsw-alias-border-l1        --dsw-alias-border-l2
--dsw-alias-border-l3        --dsw-alias-border-l4        --dsw-alias-brand-primary
--dsw-alias-label-primary    --dsw-alias-label-secondary   --dsw-alias-label-tertiary
--dsw-alias-label-caption    --dsw-alias-interactive-bg-hover
--dsw-alias-state-error-primary  --dsw-alias-state-idle-primary
--dsw-alias-state-success-primary --dsw-alias-state-warn-primary
--dsw-alias-state-business-primary
--dsw-specific-sidebar-fill  --dsw-focus-ring-color        --dsw-radius-sm
--dsw-font-family            --dsh-frame-top-clearance
```

> 本会话 `client/Theme.listTokens` 超时，未能取到“当前全集”；上表来自本仓库在 rc.5 上的人工验证记录。新增 token 前应先跑一次 `client/Theme.listTokens` 或查 shipped 的 `ui-theme` 样式。

---

## 4. Host 路由注册与 connection 围栏

### 4.1 形状（照抄 `dsh-host-open-in-app` / 本仓库 session-stats）

```js
ctx.effect(() => ctx.webServer.register({
  kind: 'exact',
  path: '/skill-manager/api/skills',
  handler: async (req, res) => { /* 见 §2.3 */ },
}), 'skill-manager: GET /skill-manager/api/skills')
```

本仓库已验证的完整样板：`plugins/session-stats/index.js:1145-1208`（helpers）与 `:1712-1744`（两条路由）。

### 4.2 约定

| 项 | 约定 | 证据 |
|---|---|---|
| 路由类型 | `kind: 'exact'` 或 `'prefix'`；handler 是 Node `IncomingMessage/ServerResponse` 风格 | `host/Service` webServer 输出 `WebRoute` 类型；`session-stats/index.js:1712-1714` |
| 去重 | 重复 `(kind, path)` 抛错 | `host/Service` webServer.register 描述 |
| 信任围栏 | 每个路由首行 `connection.requestRejection(req)`，返回 `401/403/undefined` | `host/Service` connection 契约；`session-stats/index.js:1165-1172, 1717` |
| 响应头 | `content-type: application/json; charset=utf-8`、`cache-control: no-store` | `session-stats/index.js:1150-1156` |
| 方法 | 非 GET → `405` + `allow: GET` | `session-stats/index.js:1158-1163` |
| 失败 | 捕获一切 → `500` + `{ code, message }`，绝不从 handler 抛出 | `session-stats/index.js:1174-1187` |
| 认证 | 未登录/未带 token 的浏览器请求应在围栏处得到 401（页面组件据此渲染未授权态） | `session-stats/CONTRACT.md:358-364` |
| 资源 | 只 import `node:` 内置与相对文件 | 仓库 `AGENTS.md`；`session-stats/CONTRACT.md:15-21` |

`connection.requestRejection` 的类型（`host/Service`）：`(request: { headers }) => 401 | 403 | undefined`。
它同时做 Host/Origin 校验与浏览器认证——**第三方路由必须调用它**，否则等于绕过宿主信任边界。

---

## 5. 配置读取与写入的合法路径

### 5.1 自己这一行的配置

- 不用 `export const Config`；`apply(ctx, config)` 的 `config` 就是 Loader 行里的 `config`，自己 merge 默认值
  （`plugins/session-stats/CONTRACT.md:15-21`；shipped Host 插件可用 schemastery `Config`，第三方不要引入依赖）。
- 运行时改自己的配置：`configEditor.edit(entry, change)`（见下）。

### 5.2 读别人的配置 / 读“生效值”

Host 服务 `configEditor`（`cordis_inspect_query host/Service configEditor`）：

```js
entries(): Entry[]                    // 当前 profile 可寻址的行（profile patch id 唯一）
configuration(): Array<{ entry, inherited, override }>  // 继承层与显式覆盖层的快照
edit(entry, change): Promise<void>    // change(current, inherited) => next
```

`Entry` 来自 `ctx.loader.entries()`；从 `entry.options.name/id` 辨认目标包。

### 5.3 `configEditor.edit` 的真实语义（读实现得来）

实现：`<asar>/…/dsh-config-editor/lib/index.js`

- 只写**当前 profile 的 patch**：`documentPath = profileContext.patchPath`（`:24-26`）。
- 只接受“当前活跃、且 profile patch id 唯一”的行（`:30-35, :73`）；行被替换/失效会抛错。
- `change(current, inherited)` 先拿到当前 config 与继承层（`:77-79`），把结果交 `fiber.resolveConfig(next)`（`:82`）——
  即**走正常 Loader 校验/生命周期**，不是裸写文件。
- 若 `next` 与继承层相等：删除该行的 `config`（空行连行一起删）（`:98-103`）；
  否则在 profile patch YAML 序列里定位 `id + name` 一致且非 `insert` 的行，`setIn([index,'config'], next)`，
  找不到就追加 `{ id, name, config }`（`:104-109`）。
- 写前做一次合成校验：合成的下一份配置必须等于 `next`，否则抛
  `Configuration for "<id>" is overridden by a home patch or command-line overlay`（`:116-121`）——
  **这就是 provenance 约束**：profile patch 是最低优先层，home patch / CLI overlay 更高；被覆盖时拒绝写入。
- 落盘用 `writeFileAtomic(path, String(document), { mode: 384 })`（0600）（`:122`）；
  `reconcileProfilePatches` 失败会回滚原文件与旧 patch 再抛（`:123-129`）。
- 整个过程与 Loader 热重载串行化：`hmr.runExclusive(run)`（`:132-133`）。

### 5.4 为什么浏览器端不能直接写 `cordis.patch.yml`

1. 浏览器半没有文件系统权限；能写文件的只有 Host 进程。
2. 即使通过 Host 路由代写，也应优先用 `configEditor.edit`：它带 schema 校验（`resolveConfig`）、
   Loader 对账、原子写、失败回滚、home patch/CLI 覆盖检测、与 HMR 串行化。裸写 YAML 会绕过全部这些。
3. 直接改 profile patch 会影响**下一次启动/重载的整机行为**（本机 `~/.dsh/cordis.patch.yml` 也含凭据类配置）；
   一个 UI 插件的误写可能让 Harness 起不来。profile patch 的定位是“每台机器的本地覆盖层”，
   应以 `configEditor`/`settings` 服务为写入面，而不是让页面直接碰文件。
4. 仓库既有插件 `mcp-manager` 之所以能在 Host 侧直写 patch（`plugins/mcp-manager/index.js:402-453`、
   `CONTRACT.md:129` 原子写 + 备份），是因为它做的是“MCP 行”的结构化增删，且经过自己的校验/锁；
   这是 Host 侧特例，不是浏览器可用的路径。
   插件安装/启停这类操作属于 `plugin_manager`（人类/引导层的工具），**不是插件自身运行时应调用的 API**。

### 5.5 读 Skills：两个正确入口

- `ctx.get('skills')`（可选）或 `inject: ['skills']`（硬依赖）：分层 skill registry。
  `list(options)/snapshot(options)/get(name, options)`，`options = { scope?, cwd?, signal? }`；
  返回 `SkillSummary { name, description, whenToUse?, invocation:{modelInvocable,userInvocable}, source, provider, path?, resourceBase? }`。
  见 `host/Service skills` 的完整方法签名与 `SkillViewOptions`。
- `ctx.get('sessionSkillCatalog')`（可选）：`list({ sessionId }, signal)` → `{ skills: SkillEntry[] }`，
  返回**某个 Session 组合下用户可调用的 skill 元数据**（不读 body）。
  见 `host/Service sessionSkillCatalog`；它正是 `ctx.remote.skills` 的 Host 后端。
- 想按会话展示可见性：页面把 `sessionId` 传给自己的 Host 路由，Host 调 `sessionSkillCatalog.list` 最直接。

### 5.6 其它相关 Host 服务（本次 inspect 实读）

| 服务 | 关键方法 | 用途/注意 |
|---|---|---|
| `settings` | `describe({redactSecrets?})`、`update(ns, patch, expectedRevision?)`、`replace(ns, section, rev?)`、`mutate(ns, ops, rev?)`、`prepareDocument()`、`configure({auto}, owner?)` | 面向「设置页/表单」的 schema 投影与合并写；`prepareDocument()` 返回 profile patch 路径（只读定位用）。`mcp-manager` 用它解析 profile 目录：`plugins/mcp-manager/index.js:408-419`。 |
| `timer` | `interval(cb, ms)` / `timeout` / `throttle` / `debounce`；`interval()` 返回的 disposer 登记在其 effect 上 | **必须在 Host `inject` 里声明 `timer`**，否则读 `ctx.timer` 抛 `cannot get property "timer" without inject`（`plugins/session-stats/CONTRACT.md:144-150`）。 |
| `agentPresets` / `agents` | `presetForSession(session)` 等 | 若需要「该会话用哪个 preset / 哪些 skill」的上下文，可从 agent preset 侧取；本插件最小实现不需要。 |
| `sessionQuery` / `sessionPersistence` | `listSessions/readSession/...`、`list()/stat()` | 需要读会话历史/日志时的入口（session-stats 全文样例见其 CONTRACT §3.2）。 |

> 服务读取的两条路径（`host/Service` 的 `access` 段固定写法）：
> 硬依赖 `export const inject = ['webServer','connection', …]` → `ctx.webServer`；
> 可选依赖 `ctx.get('skills')` → **必须判 undefined**（`requiresUndefinedCheck: true`）。
> 错误做法是没写 inject 却直接读 `ctx.xxx`：Cordis 会抛“without inject”。

---

## 6. 验证步骤

```bash
# 1. 结构与语法（仓库级）
pnpm test                         # node --check + 宿主导出/client id/locale 键集等
node --check plugins/skill-manager/index.js
node --check plugins/skill-manager/client.js

# 2. Loader 行是否被识别（不安装也能查已安装的；安装后必须查）
#    cordis_inspect_query host/Config listConfigs { name: "@xiechenghua01/dsh-skill-manager" }
#    → entries[0] 应出现 patchId: skill-manager；entry 查询会带 packageDir（可 read 校验 bundle 路径）

# 3. client slot 注册（页面已连接时）
#    cordis_inspect_query client/Slots listSubTree { root: "sidebar.panellist" } / { root: "main" }
#    本会话此调用持续 10s 超时（页面未连上/忙），失败时以浏览器现场为准。

# 4. 路由围栏（安装并重启/刷新后）
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:53115/skill-manager/api/skills
#   401 = 路由已注册且被 connection 围栏挡住（正常）
#   404 = 路由没注册（插件没装/没激活/路径写错）

# 5. 视觉验收（本仓库已有静态预览思路）
node tools/preview.mjs --out .preview/skill-manager.html   # 参考 plugins/session-stats/CONTRACT.md:453-462
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --screenshot=/abs/path.png --window-size=1180,2400 file:///abs/path/.preview/skill-manager.html
```

安装验证时（本任务**不执行**）：`plugin_manager action=install_bundle target=<repo>/plugins/skill-manager`，刷新 Web GUI；
左侧栏应出现在 `plugins`、`schedules` 之后（order 20）；点击进入全屏页；折叠侧栏后应只剩图标 + Tooltip。

---

## 7. 主面板里读“当前会话”

**可用（事实）**：

- 根作用域的标准 props 由两处 `provideRoot` 合成：
  - `usePanelInfo`：`ctx.slots.provideRoot({ hooks: { panelInfo: layout.panelInfo } })`
    —— `<asar>/…/dsh-client-ui-layout/lib/client.js:703`；快照形如 `{ activePanelId }`（`:447`、`:460-463`）。
  - `useSessions` / `useSessionStatus`（及 keyed hooks `useSessionRetainInfo` / `useSessionAccess`）：
    `<asar>/…/dsh-client-ui-session/lib/client.js:1118-1129`。
- `main` 条目的作用域是 `root`，渲染器会把标准 kit（含上述 hooks）+ 注册 `inject` 结果 + ownerProps 一起给组件：
  `<asar>/…/dsh-client-ui-renderer/lib/client.js:736-767, 784-790`。
  因此 `SkillManagerPage({ useSessions, usePanelInfo, t }) { … }` 合法。
- shipped 取“当前会话”的写法（DocumentTitle）：
  ```js
  const current = Object.values(state.byId).find((s) => (s.retainedBy.mainView ?? 0) > 0)?.id
  ```
  —— `<asar>/…/dsh-client-ui-layout/lib/client.js:58-63`；`retainedBy.mainView` 由会话保留计数维护
  （`<asar>/…/dsh-api-session-controller/lib/client.js:4075-4102`；ui-session 的 `publishMain` 也用它：
  `<asar>/…/dsh-client-ui-session/lib/client.js:929-940`）。

**坑（推理，待浏览器验证，标未验证）**：
`main` 槽同一时刻只渲染一个 keyed 条目（§1.2）。打开我们的全局面板会把 `conversation` 卸载，
conversation 对“主视图会话”的保留计数随之释放，`retainedBy.mainView` 很可能变成 0，
于是面板打开后 `useSessions` 里找不到“当前会话”。

**推荐做法（两条都稳妥）**：
1. 插件加载时（`apply` 里）用 `inject: ['sessions']`（服务名）订阅 `ctx.sessions.list`，
   在模块级记住“最后一个 `retainedBy.mainView > 0` 的 sessionId”，面板打开时用它作为默认 `sessionId`；
2. 面板里同时提供会话选择：`useSessions((state) => state.ids.map((id) => ({ id, title: state.byId[id]?.displayTitle })))`，
   让用户显式选会话后调 Host 路由 `/skill-manager/api/skills?sessionId=…`。
   权限判断可用 keyed hook `useSessionAccess(sessionId, action)`（调用形式未实测 → 未验证）。

### 7.1 可直接抄的写法

```js
// —— client.js：插件级记住“最后一个主视图会话”（apply 内，只做订阅，不引全局状态） ——
const lastMain = { id: undefined }
function trackMainSession(state) {
  // state = ctx.sessions.list 的快照：{ ids, byId, phase, projectionsBySession }
  const current = state.ids.find((id) => (state.byId[id]?.retainedBy?.mainView ?? 0) > 0)
  if (current !== undefined) lastMain.id = current
}

return {
  inject: ['slots', 'locale', 'layout', 'sessions'],   // 服务名；包级 inject 里要含 @deepseek-ai/dsh-api-session-controller
  apply(ctx) {
    ctx.effect(() => ctx.sessions.list.subscribe(() => trackMainSession(ctx.sessions.list.getSnapshot())),
      'skill-manager: track main session')
    trackMainSession(ctx.sessions.list.getSnapshot())
    // …上面两个 slot 注册…
  },
}

// —— main 组件里：面板状态 + 会话列表 + （若有）最后一个主视图会话 ——
function SkillManagerPage({ t, usePanelInfo, useSessions, useSessionStatus }) {
  const isActive = usePanelInfo((info) => info && info.activePanelId === 'skill-manager') === true
  const sessions = useSessions((state) => state.ids.map((id) => ({
    id,
    title: state.byId[id] === undefined ? id : state.byId[id].displayTitle,
    running: state.byId[id] === undefined ? false : state.byId[id].running === true,
    mainView: (state.byId[id] && state.byId[id].retainedBy ? state.byId[id].retainedBy.mainView : 0) > 0,
  })))
  // 「该会话是否可调用某 skill」的权限判据要走 Host：/skill-manager/api/skills?sessionId=…
  // 或 keyed hook useSessionAccess(sessionId, 'agent/...')（未实测）
  return null // ← 实际渲染见 §2.4
}
```

> 这两个标准 hook 的名字来自渲染器的 `standardHookPropName('sessions') === 'useSessions'`
> （`<asar>/…/dsh-client-ui-renderer/lib/client.js:667-678, 736-767`；来源声明见
> `<asar>/…/dsh-client-ui-session/lib/client.js:1118-1129`）。
> 注意：根标准 props 只包含“当前组合里确实 provideRoot 的 hook”。若组合没有激活 `dsh-client-ui-session`，
> `useSessions` 会直接缺席（组件收到 undefined），不会装配报错；更早、更明确的失败是**服务注入**：
> factory 返回 `inject: ['sessions']` 时，`sessions` 服务缺失会让插件停在等待激活（侧栏入口不出现）。
> 所以要么确保 `@deepseek-ai/dsh-api-session-controller` 在组合里，要么不要把它加进服务 inject。

---

## 8. 插件自己的子槽（可选）

main 条目可以在注册时声明 children，供其它插件扩展：

```js
ctx.slots.register({
  name: 'main', key: 'skill-manager', locale: NS,
  children: {
    'skill-manager.detail.actions': { kind: 'list', scope: 'root' },
  },
  inject: () => ({ t }),
}, SkillManagerPage)
```

shipped Plugins 页就是这么做的（`<asar>/…/dsh-client-ui-plugin-manager/lib/client.js:7744-7797`，
声明了 `plugins.add.actions`、`plugins.tab`、`plugins.item`、`plugins.bundle.activation` 等 9 个子槽）。
声明了 children 的条目会从渲染器拿到 `renderSlot(key, ownerProps, opts)`，只能渲染**自己声明过**的槽，
否则抛 `SlotOwnershipError`（`<asar>/…/dsh-client-ui-renderer/lib/client.js:342-360`）。
**最小骨架不需要 children**；留到需要第三方扩展示再声明。

---

## 9. 风险清单

| 风险 | 说明 / 规避 | 证据 |
|---|---|---|
| init 顺序 | `layout.selectPanel(id)` 会校验 main 已注册；main 与 panellist 在同一 `apply` 注册即可。若 main 先失效后点击，会抛错。 | `…/ui-layout/lib/client.js:522-526` |
| inject 缺失 | `inject: ['slots','locale','layout']` 任一缺失则插件停在等待激活状态（页面无入口）。包级 `dsh.client.inject` 与服务级 `inject` 是两套，都要写。 | `…/dsh-client-modules/lib/index.js:783-802`；`…/ui-session/lib/client.js:1107-1113` |
| main key 冲突 | `main` 是 keyed；`conversation`/`plugins`/`schedules`/`session-stats` 已被占用，复用一个 key 会与 shipped 面板争同一 cell。用唯一的 `skill-manager`。 | §1.2、§1.5 |
| 抢占 shipped 页 | 不要注册 `key: 'plugins'`/`'schedules'`；也不要注册 `sidebar.panellist` 的 `id: 'plugins'`（React key 冲突 + 语义混淆）。 | `…/ui-sidebar/lib/client.js:510-517, 26-28` |
| rail 折叠 | 不要自己画 label/active 态给 panellist：owner 已给 `size/active`，Tooltip 由 `PanelRow` 托管。自定义尺寸以 `props.size` 为准。 | `…/ui-sidebar/lib/client.js:206-238` |
| 样式作用域 | 类名统一前缀、样式一次性注入并在 disposer 删除；只 `--dsw-*` token；不写 `document.body`、不读别人 DOM。HMR 会按 `style[data-plugin]` 清理未认领样式。 | `<asar>/…/dsh-client-modules/lib/client.js:312-315, 617-631` |
| locale 时机 | `register` → `bind` → 注册 slot 的顺序；`entry.locale` 声明但 locale 服务缺失会抛装配错误。 | `…/dsh-client-ui-renderer/lib/client.js:742-746` |
| route 安全 | 所有自建路由首行调用 `connection.requestRejection`；`no-store`；非 GET 405；内部错误 500 且不回显堆栈；不要在同一路由泄露 home patch 路径/秘密。 | §4 |
| CSP / 资源路径 | 前端 fetch 用**相对 URL**（不带前导 `/`）以保留 mount 前缀；不引 CDN、不建 iframe；图标用内联 SVG（或 `require.asset` 走包内 `assets/` 导出）。 | `session-stats/CONTRACT.md:358-360`；`…/dsh-client-modules/lib/index.js:1062-1088` |
| HMR | bundle 重复执行会抛重复注册；开发期 `pnpm run dev:web`/HMR 只在同 release 生效，release 变化要求整页刷新。 | `…/dsh-client-modules/lib/client.js:703-716, 228-291` |
| `immediately` 语义 | 已验证：它是 `dsh.client` 的可选布尔，经 `parseDshClient` 校验后写入 boot 图行（`graph.entries[].immediately` 与 `graph.plugins[].immediately`）；本版本 client-modules 的 `ClientEntries.start` 对所有包一视同仁地建 entry，且 `bootInjections` 把整个 application 批一次性 `script-preload`，因此**“是否立即到达”不由它控制**；具体 shell 消费方**未验证**。shipped Plugins 页不写它也能工作，`immediately: true` 只是沿用本仓库既有插件的写法（删掉也不影响侧栏注册）。 | `…/dsh-client-modules/lib/index.js:93, 129, 466, 800, 518-563`；`…/dsh-client-modules/lib/client.js:108-176, 383-399`；`…/dsh-client-ui-plugin-manager/package.json:37-47` |
| 被移入「更多」 | 非 `plugins` 的 panellist 条目可被用户 unpin 进 More 菜单；这是产品行为，不能靠插件阻止。 | `…/ui-sidebar/lib/client.js:26-28, 507-539` |
| order 冲突 | `order` 只是升序排序键；0/10/20 不冲突，重复也允许。 | `…/ui-sidebar/lib/client.js:689-704` |
| client inspect 不可用 | 本会话 client 侧 inspect 超时，注册结果最终要在浏览器/刷新后确认。 | 本次调研记录 |

---

## 10. 证据附录（路径 + 行号）

`<asar> = /Applications/DeepSeek Harness.app/Contents/Resources/app.asar`

**slug 槽/侧栏**
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js`
  - `:206-238` PanelRow（ownerProps `{size: wide?16:18, active}`、`renderSlot(..., {only:id})`、Tooltip label、wide 才显示文字）
  - `:239-286` 「更多」菜单（`sidebar.panellist.actions`）
  - `:507-539` 面板列表渲染 + `plugins` 恒显示 + unpin 过滤
  - `:557-565` `footArea`（`sidebar.footer.action` owner `{wide}` + `sidebar.settings`）
  - `:689-704` `syncPanels`（entriesOfSlot → id/order/label，`resolveSlotLabel`，order 升序）
  - `:733-771` `sidebar` 槽声明（含 `sidebar.panellist` list）
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`
  - `:58-63` DocumentTitle 用 `useSessions` + `retainedBy.mainView`
  - `:122-128` MainPanel `renderSlot('main', {}, {entryKey: activePanelId ?? 'conversation'})`
  - `:464-466` `retainMainPanels` 重置失效的 activePanelId
  - `:521-526` `selectPanel` 校验 main key
  - `:655-660, 705-736` root 槽与 main keyed 声明
  - `:696-699, 703` `entries('main')` 校验 + `provideRoot({hooks:{panelInfo}})`
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-client-ui-plugin-manager/{package.json,lib/client.js}`
  - package.json `:37-47` `dsh.client = { inject:[api-remotes, locale, ui-layout, ui-sidebar], platform:'web' }`
  - client.js `:7609-7616` PluginsPanelIcon（只取 size）
  - `:7679-7692` NS/PANEL_ID/inject
  - `:7744-7797` main 注册 + children 子槽
  - `:7798-7815` `panelInfo.subscribe` / `selectPanel`
  - `:7820-7826` panellist 注册（id=plugins, order=0）
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/lib/client.js`
  - `:19197-19213` NS/PANEL_ID='schedules'/inject
  - `:19360-19386` main；`:19387-19393` panellist（order=10）

**客户端加载/渲染**
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-client-modules/lib/index.js`
  - `:61-100` `parseDshClient`（platform/inject/external/immediately 校验）
  - `:446-468` boot 批与 graphRow（immediately 入图）
  - `:480-502` `orderByModuleGraph`；`:518-563` `bootInjections`
  - `:783-802` `resolveMeta`（必须 exports["./client"]）
  - `:1062-1088` 包内 assets 路由
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-client-modules/lib/client.js`
  - `:16-24` factory 延迟 materialize 的契约
  - `:108-176` `parseBootManifest`；`:383-399` 启动建 entry
  - `:312-315, 617-631` 样式归属与清理；`:703-716` 重复注册拒绝；`:805-832` materialize；`:962-977` invalidate/HMR
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-client-ui-renderer/lib/client.js`
  - `:541-558` locale seat；`:736-767` standardKit（hooks/props/store/renderSlot）；`:784-790` props 合并顺序（ownerProps 最后）
  - `:342-360` `renderSlot` 的 children 授权检查
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-client-ui-session/lib/client.js`
  - `:929-940` `publishMain`（main 会话保留）；`:1118-1129` `provideRoot({hooks:{sessions, sessionStatus}, keyedHooks:{sessionRetainInfo, sessionAccess}})` + `installScope('session')`

**Host**
- `host/Service`：`webServer`（WebRoute/WebResourceRoute/`kind`/register 去重）、`connection`（`requestRejection` 返回 401/403/undefined）、`configEditor`、`skills`、`sessionSkillCatalog`、`settings`、`timer`（本次 inspect 实读）。
- `<asar>/dsh/node_modules/@deepseek-ai/dsh-config-editor/lib/index.js:24-35, 39-52, 69-133`（§5.3 全文依据）
- 本仓库样板：
  - `plugins/session-stats/index.js:1145-1208`（connectionOf/sendJson/405/rejected/500/query 解析）
  - `plugins/session-stats/index.js:1712-1744`（两条 exact 路由 + `ctx.effect`）
  - `plugins/session-stats/client.js:2082-2148`（`inject: ['slots','locale','layout']`、main + footer.action 注册、ctx.effect 用法）
  - `plugins/session-stats/CONTRACT.md:15-47, 310-368, 429-462`（契约、主题 token、client 形状、验证）
  - `plugins/mcp-manager/index.js:402-453`（Host 侧解析 profile patch 路径、`settings.prepareDocument()`）
  - `plugins/mcp-manager/CONTRACT.md:41-42, 129`（global/profile 层与原子写）
- 仓库约束：`~/Codes/xch/dsh-plugins/AGENTS.md`（package.json 不变量、client 纯净性、locale 键集、行 id 唯一、验证命令）
- 本机 profile patch 形态：`~/.dsh/profiles/desktop/cordis.patch.yml`（顶层 YAML 序列；`- insert:` 追加行；`~/.dsh/cordis.patch.yml` 为 home 层）——**不要在该文件里新增非本插件自身所需的行**。