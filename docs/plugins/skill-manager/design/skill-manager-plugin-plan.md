# Skill Manager 插件 — 技术落地方案（v1）

> 目标包：`@xiechenghua01/dsh-skill-manager`
> 形态：左侧栏 `sidebar.panellist` 入口 + `main` 全屏面板页（与 Plugins / 自动化任务同级）
> 依据：`docs/plugins/skill-manager/design/skill-manager-interaction.md`（交互稿）、`docs/plugins/skill-manager/research/`（调研）、
> 仓库现有插件 `plugins/session-stats` 与 `plugins/mcp-manager` 的实测契约
> 目标 Harness：`>=0.2.1-rc.5 <0.3.0`（本机验证版本 0.2.1-rc.5 / dsh 0.2.2-rc.1 包）

---

## 1. 范围

### v1 做

1. 列出全局层 + 各 Agent 预设层的技能：文件系统扫描根（用户/项目/自定义/预设包内）、插件内置 provider、预设层 provider。
2. 新建、编辑（正文 + 名称/描述/何时使用）、导入（粘贴 `SKILL.md` / 目录）、删除。
3. 停用/启用（移动到 `<root>/.disabled/`，可恢复）。
4. 诊断：断链、frontmatter 非法、name 非法/不一致、同名遮蔽、目录不可读。
5. 来源页：扫描根状态、内置 provider 列表、优先级说明。
6. 中英文案、暗/亮主题、`--dsw-*` token。

### v1 不做

- 不管理插件/preset 包内的技能内容（只读展示）。
- 不做技能市场/远程安装（可后续接 Plugins Discover 的索引思路）。
- 不修改 `cordis.patch.yml` / provider 配置（`customSkillDirs` 的可视化编辑放 v2）。
- 不做按会话的技能调试器（`sessionSkillCatalog` 仅用于可选的只读校验）。
- 不做技能版本管理/回滚（用 Git 或用户自己的备份）。

---

## 2. 平台事实（实现必须遵守）

| 事实 | 结论 | 证据 |
| --- | --- | --- |
| 基础组合插入 skill / skill-filesystem / tool-skill | host 层 `skill-filesystem` 与 `tool-skill` 被 `dsh-web-app` 显式 `disabled: true`（注释「presets own local discovery」）；**本地发现由每个 preset 自己挂载** | `dsh-base/cordis.patch.yml` 312-319；`dsh-web-app/cordis.patch.yml` 512-525；`dsh-web-app/presets/cordis.patch.yml` 122-130 |
| 预设层是本地技能的真正来源 | cordis/standard/ptc 挂 `skill-filesystem`（含 `customSkillDirs` 指向 `dsh-agent-preset/skills`）+ `tool-skill`；minimal 不挂 | 同上；`presets/minimal.patch.yml` 无 skill 行 |
| 注册表按层合并 | 读取 = `[global, ...scopeChain]`；近层同名直接覆盖，rank 只在同一层内生效 | `dsh-skill/lib/index.js` 298-330 |
| 扫描根与优先级 | project-dsh 100 / project-agents 200 / custom 300 / user-dsh 400 / user-agents 500 / bundled 600 | `dsh-skill-filesystem/README.md` §Roots and priority；`lib/index.js` 常量 |
| 技能格式 | `<root>/<name>/SKILL.md` 或 `<root>/<name>.md`；只扫一层 | 同上 §Skill format / §Known Limitations |
| frontmatter 字段 | 必填 `name`（kebab-case）、`description`；可选 `whenToUse`、`metadata`、`disable-model-invocation`、`user-invocable` | 同上 |
| 无效技能 | 静默跳过（模型目录无诊断），断链/坏 frontmatter 都表现为「不存在」 | 同上 §Observable success and failures |
| 变更传播 | 根目录被 chokidar 监听；新增/删除/改 `SKILL.md` 会触发 catalog 刷新 | 同上 §Change detection |
| 插件内置技能 | 包内 `ctx.skills.registerProvider()`，`source: 'bundled'`、rank 600、resourceBase 指向包内 assets | `dsh-skill-badge/lib/index.js`、`dsh-skill-office/lib/index.js` |
| 注册表读取 | `ctx.skills.snapshot/list({ cwd, scope })`；无 scope = 全局层；preset 层需 `agentPresets.acquireScope(id)` | `dsh-skill` Service 契约 |
| 会话可见技能 | `ctx.remote.skills.list({ sessionId })` → 仅 user-invocable 的 `SkillEntry`，不激活冷 Agent | `dsh-api-session-controller/lib/index.js` ~3028-3140 |
| 侧栏入口 | `sidebar.panellist`（list，id/order/label；owner props `{size, active}`）；`main` keyed 槽 key 相同 | `dsh-client-ui-plugin-manager/lib/client.js` ~7680-7826；`dsh-client-ui-sidebar/lib/client.js` ~228 |
| 面板切换 | `ctx.layout.selectPanel(id)`；`ctx.layout.panelInfo` 提供 `activePanelId` | 同上 |
| Host 路由 | `ctx.webServer.register({ kind:'exact', path, handler })`；用 `ctx.connection.requestRejection(req)` 做信任围栏 | `plugins/session-stats/CONTRACT.md` §3.1 |
| Host 依赖限制 | 只 import `node:` 内置与相对文件；不能依赖 `yaml` 等 npm 包 | 仓库 AGENTS.md / session-stats CONTRACT §1 |
| 浏览器端限制 | `require('react')` only；不得 import `@deepseek-ai/*`；样式仅 `--dsw-*` | 同上 |

> 重要：`Config.listConfigs` 的 `status` 不是「启用开关」，其 `inactive` 集合包含 disabled / never imported / disposed；
> 不能单独用它判断 provider 是否生效，要看 YAML 行 + 运行时 snapshot。本机 `skill-filesystem`/`tool-skill`
> 的 `inactive` 恰好对应 host 行被 disable（能力由 preset 层提供）。

---

## 3. 包结构

```text
plugins/skill-manager/
├── package.json            # name/version/private/engines/exports/files/dsh.bundle+dsh.client
├── market.json             # 标题/描述/图标/分类/标签
├── cordis.patch.yml        # 插入一行 Host bundle 行（id: skill-manager）
├── index.js                # Host 半边：路由 + 扫描 + 读写 + 校验
├── lib/
│   ├── frontmatter.mjs     # 极简 YAML frontmatter 解析/序列化（无依赖）
│   ├── scan.mjs            # 根解析、目录扫描、rank/遮蔽、诊断
│   ├── paths.mjs           # 路径安全（allowlist、realpath、原子写）
│   └── payload.mjs         # overview/skill 响应构造（纯函数，供 selftest）
├── client.js               # 浏览器半边：main + sidebar.panellist + 页面/抽屉/模态
├── locale/{en,zh}.json     # 插件管理器展示文案（与 client 内字典可二选一，按仓库惯例）
├── icon.svg                # 侧栏/市场图标（原创）
├── selftest.mjs            # 纯合成输入的 payload/解析测试（pnpm test 会跑）
├── CONTRACT.md             # 实现契约与实测事实
└── README.md
```

`package.json` 关键块（照抄 session-stats 的形态）：

```json
{
  "name": "@xiechenghua01/dsh-skill-manager",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "dsh": ">=0.2.1-rc.5 <0.3.0" },
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg",
    "./package.json": "./package.json"
  },
  "files": ["README.md", "CONTRACT.md", "index.js", "lib/*.mjs", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": [
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-layout",
        "@deepseek-ai/dsh-client-ui-sidebar"
      ]
    }
  }
}
```

`cordis.patch.yml`：

```yaml
- insert:
    - id: skill-manager
      name: '@xiechenghua01/dsh-skill-manager'
```

> 行 id 不能与 `session-stats` / `mcp-manager` / shipped 行冲突；`skill-manager` 未占用。

---

## 4. Host 半边（index.js）

### 4.1 导出形态

```js
export const name = 'skill-manager'
export const inject = ['webServer', 'connection']

export function apply(ctx, config) {
  // 可选服务：ctx.get('skills')、ctx.get('configEditor')、ctx.get('agentPresets')、ctx.get('workingDirectory')
  // 所有注册用 ctx.effect(...) 包住并返回 disposer
}
```

- **不要**导出 `Config`（第三方 bundle 不声明依赖，Loader 传 config 对象；自行 merge 默认值）。
- 不在 apply 中做重 I/O；扫描按请求触发，带 1-2s 缓存。

### 4.2 路由

全部挂在 `ctx.webServer`，`kind: 'exact'`，统一 JSON：

| Method | Path | 作用 |
| --- | --- | --- |
| GET | `/skill-manager/api/overview` | 根、技能、诊断、provider 汇总 |
| GET | `/skill-manager/api/skill?path=` | 单个技能详情 + 原文 + 资源列表 |
| POST | `/skill-manager/api/skill` | 新建（body: root, name, description, whenToUse, body） |
| PUT | `/skill-manager/api/skill` | 更新（body: path, body, frontmatter 字段） |
| POST | `/skill-manager/api/skill/state` | 停用/启用（body: path, enabled） |
| DELETE | `/skill-manager/api/skill?path=` | 删除（body/query 均可，需 `confirm: true`） |
| POST | `/skill-manager/api/import` | 粘贴内容导入或目录导入 |
| GET | `/skill-manager/api/diagnostics` | 诊断单独拉取（overview 已含，保留给刷新） |

约定（照抄 session-stats CONTRACT §3.1）：

```js
const connectionOf = (ctx) => Reflect.get(ctx, 'connection')
const rejected = (req, res) => {
  const rejection = connectionOf(ctx).requestRejection(req)
  if (rejection === undefined) return false
  res.statusCode = rejection
  res.end()
  return true
}
```

- `content-type: application/json; charset=utf-8`；`cache-control: no-store`。
- 非允许方法 → `405` + `allow`；异常 → `500` `{ code, message }`；参数错误 → `400`。
- 响应包：`{ ok: true, data }` / `{ ok: false, error: { code, message } }`。

### 4.3 扫描与数据模型

```ts
type Root = {
  id: string            // 'project-dsh' | 'project-agents' | 'custom' | 'user-dsh' | 'user-agents' | 'custom:<n>'
  label: string
  path: string
  rank: number
  exists: boolean
  readable: boolean
  skillCount: number
  disabledCount: number
}

type Skill = {
  id: string            // 稳定 id：hash(path)
  name: string
  description: string
  whenToUse?: string
  path: string          // SKILL.md 或 <name>.md
  dir: string
  source: 'project-dsh' | 'project-agents' | 'custom' | 'user-dsh' | 'user-agents' | 'bundled' | 'preset'
  provider: string
  rank: number
  scope: 'global' | `preset:${string}`
  invocation: { modelInvocable: boolean; userInvocable: boolean }
  editable: boolean
  builtin: boolean
  status: 'active' | 'disabled' | 'shadowed' | 'invalid'
  shadowedBy?: string
  mtime: number
  sizeBytes: number
}

type Issue = {
  id: string
  severity: 'error' | 'warning' | 'info'
  kind: 'broken-link' | 'frontmatter' | 'name' | 'shadowed' | 'unreadable' | 'oversize'
  name?: string
  path: string
  message: string
  fix?: { action: 'remove-link' | 'open-file' | 'rename' | 'view-winner' | 'retry'; hint: string }
}
```

扫描算法（与 provider 对齐）：

1. 解析 `cwd`：默认 `ctx.workingDirectory.defaultDirectory`；请求可带 `cwd`（必须绝对路径）。
2. 项目根：从 `cwd` 向上找最近含 `.git` 的祖先；无则用 `cwd`。
3. **发现根（不解析 preset YAML）**：
   - 默认根用常量兜底：项目 `.dsh/skills`（100）、项目 `.agents/skills`（200）、`~/.dsh/skills`（400）、
     `~/.agents/skills`（500），`dshHome`/`agentsHome` 取环境变量或默认值。
   - `custom` 根（rank 300）从**各预设的 snapshot** 反推：`source === 'custom'` 的技能，其 `path` 的父级即根；
     包内路径（`node_modules` / `app.asar` 内）标记为只读「预设技能」。
   - 空的自定义根无法从 snapshot 反推 → v1 不展示（v2 再解析 preset 文档）。
   - 不读 `configEditor`：preset 的 `plugins` 不在 profile 树里，`configEditor.configuration()` 看不到它们。
4. 生成根列表（顺序 = rank 升序，同 rank 保持配置顺序）。
5. 每个根扫**直接子项**：
   - 目录：`<name>/SKILL.md` 存在 → 目录型技能；`<name>` 以 `.` 开头跳过（含 `.disabled`）。
   - 文件：`<name>.md` → 平铺技能。
   - 其余忽略。
6. 解析 frontmatter（`lib/frontmatter.mjs`）：严格校验 name（kebab-case、≤64）、description（非空、≤500）、
   invocation 布尔严格语法；失败 → 产生 `Issue`，不进入 skills。
7. 扫描 `<root>/.disabled/`（目录或 `.md`）→ `status: 'disabled'`，`editable: true`。
8. **按预设读取权威目录**（关键）：
   ```js
   const presets = ctx.get('agentPresets')
   const views = []
   for (const preset of await presets.list()) {
     const lease = await presets.acquireScope(preset.id)   // { key, [Symbol.asyncDispose] }
     try {
       const snap = await ctx.get('skills').snapshot({ cwd, scope: lease.key })
       views.push({ preset: preset.id, skills: snap.skills, complete: snap.complete })
     } finally { await lease[Symbol.asyncDispose]?.() }
   }
   ```
   - 每个 scope 的 snapshot 已合并 `global + preset` 层，是「该预设下 Agent 真正看到的目录」。
   - 同时取一次 `ctx.get('skills').snapshot({ cwd })`（无 scope = 全局层），用于识别插件内置技能。
   - 预设 ID 从 `agentPresets.list()` 获取（`cordis/standard/ptc/minimal`）；`minimal` 未挂载 skill 行，
     其 snapshot 只含全局层或为空 —— 如实标注「该预设没有本地技能」。
   - `acquireScope` 失败（未知预设）→ 跳过该预设并记一条 issue，不影响其他预设。
9. **与自己的文件扫描合并**：
   - 文件系统技能以「扫描结果」为准（可编辑、可诊断），用 `path` 与 registry 结果对齐。
   - 文件存在但**不在任何 snapshot 中** → 判定为「未生效」（invalid / 未被该预设扫描 / 被遮蔽），进诊断。
   - registry 有、文件扫描没有（bundled/runtime provider）→ 只读技能，按 provider 归组。
10. **遮蔽检测**：
    - 同层：同名文件系统技能按 rank 最小者胜出，其余标 `shadowed` + `shadowedBy`。
    - 跨层：若某技能只出现在低优先级预设的 snapshot、不出现在高优先级预设，不叫遮蔽（不同预设本就不同）；
      只有当同一预设的 snapshot winning path 与文件扫描的胜出 path 不一致时，才标「被预设层覆盖」。
    - registry 不暴露被遮蔽项，以上均为推断，文案用「可能被覆盖」。
11. 统计 + 缓存：按 `cwd` + roots 签名 + preset 集合缓存 1000ms；写操作后清缓存。
    监听 `skills/change` 事件（若可订阅）只做「标记过期」，不直接重建页面。

### 4.4 路径安全（硬约束）

- 写操作只允许在「已知根 + `.disabled`」内；解析后 `realpath` 必须仍在该根内。
- 拒绝 `..`、绝对路径注入、空字节、Windows 保留名；写入前 `lstat` 检查符号链接：
  目标在根外 → 拒绝写，只允许读 + 诊断告警。
- 新建：`mkdir(<root>/<name>)` → 写临时文件 `<root>/<name>/.SKILL.md.tmp` → `rename` 为 `SKILL.md`。
- 删除：只删 `<root>/<name>` 或 `<root>/<name>.md`；`realpath` 校验；不跟随符号链接。
- 单文件上限 1 MiB；目录导入最多 200 个文件、总 20 MiB。
- 所有写操作记 `ctx.logger.info`（路径 + 动作），不记录正文。

### 4.5 停用/启用的文件约定

```text
<root>/<name>/SKILL.md            → <root>/.disabled/<name>/SKILL.md
<root>/<name>.md                  → <root>/.disabled/<name>.md
```

- `.disabled` 是根下的隐藏目录，provider 只扫一层，不会把其中技能当成有效技能；
  但 `.disabled` 本身作为目录会被 provider 尝试 `<root>/.disabled/SKILL.md`（不存在，忽略）。
- 移入/移出会触发根目录 add/remove，provider watcher 会刷新 catalog（通常 <1s）。
- 保留原相对路径记录在 `<root>/.disabled/.manifest.json`（可选，用于恢复冲突时提示）。

### 4.6 前端可读的服务能力

| 能力 | 来源 | 说明 |
| --- | --- | --- |
| 全局层技能 | `ctx.get('skills').snapshot({ cwd })` | 含 provider/source/rank/path；主要是插件内置 |
| 每个预设的可见技能 | `ctx.get('agentPresets').list()` + `acquireScope(id)` + `skills.snapshot({ cwd, scope })` | 权威目录；用完 dispose lease |
| 会话可见技能（只读校验） | `ctx.get('sessionSkillCatalog').list({ sessionId }, signal)` | 仅 user-invocable；可选 |
| 目录选择 | `directoryPickerController`（client 侧 `ctx.remote.directoryPicker`） | 导入时可选；不可用时手输路径 |
| 打开目录 | `host-open-in-app` 的能力需确认；未确认时只做「复制路径」 | 交互稿已给降级 |
| 变更通知 | `skills/change`（若 Cordis 事件声明可用） | 仅标记过期；前端仍需手动/写入后刷新 |

---

## 5. 浏览器半边（client.js）

### 5.1 模块与注册

```js
window.__ModuleLoader__.load({
  id: '@xiechenghua01/dsh-skill-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'skillManager'          // locale 命名空间，与 shipped 的 pluginManager 同风格
    const PANEL_ID = 'skill-manager'   // main.key 与 panellist.id 必须完全相同

    /** owner props 只有 { size, active }；展开 16 / rail 18。 */
    function SkillIcon({ size = 18, active = false }) { /* 内联 SVG，currentColor */ }

    function SkillManagerPage(props) { /* 页面；标准 props 含 t / usePanelInfo / useSessions */ }

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skill-manager: dictionaries')
        // 样式：ctx.effect 注入 <style data-plugin="...">，只含 .sk-* 作用域与 --dsw-* token
        ctx.effect(() => ctx.slots.inject('main', () =>
          ctx.slots.register({
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({ t: ctx.locale.bind(NS), fetchJson }),
          }, SkillManagerPage)
        ), 'skill-manager: main panel')
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 20,
            label: () => ctx.locale.bind(NS)('panel.title'),
            locale: NS,
          }, SkillIcon)
        ), 'skill-manager: sidebar entry')
      },
    }
  },
})
```

- 点击侧栏条目由 `PanelRow` 自己调用 `ctx.layout.selectPanel(id)`，插件无需额外代码；
  `selectPanel` 会校验 `main` 已注册（未注册会抛错），所以两个注册要在同一 `apply` 内完成。
- `main` 面板是 root scope，不绑定会话；页面自行处理 loading/empty/error。
- 数据请求用相对 URL（不带前导斜杠）+ `credentials: 'same-origin'`（同 session-stats 的 `fetchJson`）。
- 页面状态保存在组件内；切走再回来重新拉取（可加 5s 缓存）。
- 包级 `dsh.client.inject` 照抄 shipped Plugins：`["@deepseek-ai/dsh-client-locale","@deepseek-ai/dsh-client-ui-layout","@deepseek-ai/dsh-client-ui-sidebar"]`；
  如果要用 `ctx.remote.skills` 再加 `@deepseek-ai/dsh-api-remotes`（本方案用自建路由，不需要）。

### 5.2 组件拆分

```text
SkillManagerPage
├── PageHeader（标题/描述/工具栏）
├── SegmentedTabs（技能库/来源/诊断）
├── IssueBanner
├── LibraryTab
│   ├── FilterChips + SortMenu
│   ├── SkillGroup（group header + rows）
│   ├── SkillRow（icon/name/badges/description/switch/menu）
│   └── DisabledGroup（折叠）
├── SourcesTab（RootCard / ProviderCard / PriorityNote）
├── DiagnosticsTab（IssueCard / EmptyState）
├── SkillDrawer（Overview/Content/Resources/Diagnostics + FooterActions）
├── NewSkillModal（手写/导入）
├── ConfirmDialog（删除/停用）
└── Toast
```

### 5.3 样式

- 全部用 `--dsw-*` token；颜色不写字面值（图标 SVG 可用 `currentColor`）。
- 样式前缀 `.sk-`，挂在 `.sk-page` 下，避免污染宿主。
- 亮/暗由宿主变量自动切换，不写 `[data-theme]`。
- 动效：抽屉 180ms `cubic-bezier(.2,.8,.2,1)`；尊重 `prefers-reduced-motion`。

### 5.4 客户端错误处理

- `401` → 「当前页面未获授权」+ 重试。
- 网络/500 → 错误面板 + 重试；保留上次数据并标「已过期」。
- 写操作失败 → toast + 保留表单/编辑内容。
- 并发：`PUT` 带 `mtime` 作为乐观锁，冲突返回 `409`，提示「文件已被外部修改，请刷新后重试」。

---

## 6. 数据流

```text
浏览器页面
  └─ GET /skill-manager/api/overview
       └─ Host: 解析 roots → 扫描文件系统 → 合并 ctx.skills.snapshot → 诊断 → JSON
  └─ GET /skill-manager/api/skill?path=...
       └─ Host: 读 SKILL.md → frontmatter + 正文 + 资源列表
  └─ POST/PUT/DELETE ...
       └─ Host: 路径校验 → 原子写 → 返回新技能 → 前端刷新 overview
  └─ 文件系统 watcher（provider 自带）→ 下一次 overview 反映变化
```

缓存策略：

- overview：Host 侧 1000ms TTL；前端 5s 内存缓存；写操作后强制刷新。
- skill 详情：不缓存（每次读文件）。
- 诊断：随 overview 返回；单独刷新按钮走 `/diagnostics`。

---

## 7. 校验与 selftest

`selftest.mjs` 只做纯函数测试（无文件系统、无网络）：

1. frontmatter 解析：合法/缺 `---`/缺 description/非法 name/非法布尔值/嵌套 metadata/CRLF。
2. 序列化：更新 name/description/whenToUse 后其余行原样保留；特殊字符转义。
3. 路径安全：`..`、绝对路径、符号链接逃逸、Windows 分隔符、空字节 → 拒绝。
4. 扫描结果折叠：同名多根 → 最高 rank 胜出，其余 shadowed；disabled 不计入 active。
5. payload 构造：合成根 + 技能 + issue → overview 结构稳定、计数正确、排序正确。
6. 停用路径映射：目录型/平铺型互转，恢复冲突检测。

`pnpm test` 会运行 `check-plugins.mjs`（结构/locale/绝对路径）+ `validate-index.mjs`；发布前必须全绿。

---

## 8. 验证步骤（真机）

1. `pnpm install && pnpm test`（新增插件后）。
2. 本地安装：
   `plugin_manager action=install_bundle target=~/Codes/xch/dsh-plugins/plugins/skill-manager`
3. 刷新 Web GUI；侧栏顶部应出现「技能」，点击打开面板。
4. `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:53115/skill-manager/api/overview`
   → 未认证应为 `401`（证明路由已注册且被围栏保护）；`404` 说明未安装。
5. `cordis_inspect_query(client/Slots, listSubTree, {root:"main"})` → 应出现 `skill-manager` occupant；
   `{root:"sidebar.panellist"}` → 应出现 `skill-manager` id、order 20。
6. 功能走查：新建 → 列表出现 → `~/.dsh/skills/<name>/SKILL.md` 存在；
   停用 → 文件在 `.disabled/`；恢复 → 回原处；删除 → 目录消失；重启 Harness 后仍在。
7. 视觉走查：暗/亮主题、1200 宽与 1440 宽、侧栏折叠/展开、空/错/载入状态。
8. `node tools/preview.mjs` 不适用于本插件（它是 session-stats 专用）；UI 稿用
   `docs/plugins/skill-manager/prototypes/skill-manager-ui.html` + headless Chrome 截图。

---

## 9. 里程碑

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| M0 脚手架 | package/patch/locale/icon/client 空页面 + 侧栏入口 | 安装后侧栏出现「技能」，点击打开空白面板；`pnpm test` 通过 |
| M1 只读 | overview 扫描 + 技能库列表 + 详情原文 + 来源页 | 真实列出 `~/.agents/skills` 的 ego-browser 等；断链 tabbit 进诊断 |
| M2 写入 | 新建/编辑/停用/启用/删除 + 确认/撤销 | 文件系统变化正确；provider catalog 自动刷新 |
| M3 完善 | 导入、排序/筛选、i18n、空/错/载入、selftest、CONTRACT | `pnpm test` + 真机走查 + 截图 |
| M4 发布 | `market.json`、`README`、`pnpm run release skill-manager` | 索引含首版，可从 Discover 安装 |

---

## 10. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 第三方插件直接写用户文件 | 误删/越权 | 根 allowlist + realpath + 原子写 + 删除二次确认 + 只操作技能目录 |
| YAML 解析不完整 | 合法技能被误判 | 只解析需要的键；未知键原样保留；解析失败只报诊断不删文件 |
| 静默失败无诊断 | 用户仍困惑 | 诊断页显式列出；与 registry snapshot 交叉验证 |
| preset 层技能拿不全 | 列表不完整 | v1 明确只展示全局层 + 标注；preset 层 v2 接入 `acquireScope` |
| `skills` 服务缺失 | 插件不可用 | `ctx.get('skills')` 为空时降级为「仅文件系统扫描」，页面提示 |
| watcher 延迟 | 列表短时不同步 | 写操作后主动刷新 overview；提示「文件监听可能延迟 1s」 |
| 路径含中文/空格 | 读写失败 | 全程用 `path` 模块；URL 查询用 `encodeURIComponent` |
| Windows | `.disabled` 与分隔符 | 用 `path.join`/`path.sep`；测试覆盖；不假设 POSIX |
| 大文件/大目录 | 页面卡顿 | 1 MiB 文件上限、200 文件导入上限、overview 缓存、列表分页阈值 |
| 与 shipped 页 key 冲突 | 覆盖宿主页面 | `skill-manager` 为独有 key；安装后用 inspect 验证 |

---

## 11. 与现有仓库约定的对齐

- `plugins/<slug>/package.json`：合法包名、精确 SemVer、`private: true`、`exports["."]`、
  `dsh.bundle.patch`、`engines.dsh`。
- patch 行 id 唯一；`market.json` 的分类/标签需先在根 `market.json` 声明
  （建议新增 `category: "tools"`，`labels: ["skills", "management", "ui-panel"]`）。
- Host 只 import `node:` 与相对文件；Client 只 `require('react')`，不出现 `@deepseek-ai/` 字符串。
- `locale/en.json` 与 `locale/zh.json` 键集一致、无空值。
- 不提交绝对 home 路径；截图/文档中出现的路径用 `~/`。
- 发布：改版本 → 提交 → `pnpm run release skill-manager` → 推送。

---

## 12. 开放问题（实现前确认）

1. `host-open-in-app` 是否暴露「在 Finder/Explorer 中显示」的稳定接口；否则用「复制路径」。
2. `directoryPickerController` 是否可在 root 级面板调用（它可能绑定会话）。
3. `agentPresets.acquireScope` 在 root 级插件的可用性与释放语义。
4. `skills.snapshot()` 的 `cwd` 是否影响 bundled provider 的可见性（预期不影响）。
5. 是否需要 `settings.section` 之外的配置入口（v1 不做）。
6. 图标资源：需要一枚原创 24×24 线性图标（书页/星形/层叠），同时用于侧栏 16/18px 与市场图标。
