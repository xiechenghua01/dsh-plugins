# DSH Skill 子系统调研

> 目标：为「Skill 管理插件」提供可直接引用的机制事实。
> 版本基线：DeepSeek Harness 桌面版 `0.2.2-rc.1`（`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/`）。
> 当前会话：`agentPreset=cordis`（证据：`~/.dsh/sessions/--Users-xiechenghua-Codes-xch-dsh-plugins--/9831e284-.../session.v4.jsonl.zstd` 头部 `{"agentPreset":"cordis","origin":"subagent","delegationDepth":1,"cwd":"~/Codes/xch/dsh-plugins"}`）。
>
> **路径缩写**（后文证据统一用缩写）：
> - `PKG` = `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai`
> - `DSH` = `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh`
> - `PROFILE` = `~/.dsh/profiles/desktop`
>
> 取证方式：`read` 工具直接读 asar 内文件；`cordis_inspect_query`（host/Service、host/Config）；另有只读脚本 `/tmp/asar-find.mjs`、`/tmp/asar-cat.mjs`（解析 asar 头把字节偏移映射回包内文件，纯读取，未改动任何文件）。**只读研究，未安装插件、未改 profile、未调用 plugin_manager。**

---

## 0. 事实 TL;DR（12 条，全部带证据）

1. **Skill 注册表是独立服务**：`ctx.skills`（`@deepseek-ai/dsh-skill`），本身不含任何技能内容，只做 provider 注册、跨 provider/跨 scope 合并、去重、校验、按需加载正文。
   证据：`PKG/dsh-skill/README.md:28`；`PKG/dsh-skill/lib/index.js:119-135`（`SkillRegistry extends Service`，`super(ctx, "skills")`）。

2. **分层模型 = host 全局层 + 逐 scope 链**；读取时「最近层同名直接获胜」，rank 只在**同一层内**决定同名冲突。
   证据：`PKG/dsh-skill/lib/index.js:298-311`（`layers = [global, ...chainLayers(options.scope)]`）、`312-330`（同层排序后 first-wins，并 `logger.warn`）、`519-521`（`rank → providerOrder → localOrder`）。

3. **rank 常量**：`project-dsh 100 / project-agents 200 / runtime 250 / custom 300 / user-dsh 400 / user-agents 500 / bundled 600`。
   证据：`PKG/dsh-skill-filesystem/lib/index.js:20-24`；`PKG/dsh-skill/lib/index.js:21`（`RUNTIME_RANK = 250`）、`23`（`BUNDLED_SKILL_RANK = 600`）。

4. **本地技能发现默认开启，但当前 desktop profile 的 host 层这一行被显式关掉，由 preset 层各自挂载**。这是理解本机行为的钥匙：
   - `dsh-base` 的 bundle patch 插入 `id: skill / skill-filesystem / tool-skill` 三行（无 config）：`PKG/dsh-base/cordis.patch.yml:312-319`。
   - `dsh-web-app` 的 bundle patch 再把 host 层的 `skill-filesystem`、`tool-skill`（以及 `tool-bash`、`tool-pwsh`、`tool-fs` 等）设为 `disabled: true`，注释写明「presets own local discovery」：`PKG/dsh-web-app/cordis.patch.yml:512-525`（`skill-filesystem` 521-522、`tool-skill` 524-525）、`:485-491`（`tool-bash` 487-488）。
   - 每个 agent preset 自己挂 `skill-filesystem` + `tool-skill`，注册进该 preset 的 layer：`PKG/dsh-web-app/presets/cordis.patch.yml:124-130`，`presets/standard.patch.yml:40-43`，`presets/ptc.patch.yml:40-43`；`presets/minimal.patch.yml` **不含**任何 skill 行。

5. **`Config.listConfigs` 的 `status` 不是「启用开关」，但它包含 disabled**。枚举为 `schema | absent | unsupported | tree | inactive`，其中 `inactive` 明确表示「disabled、从未 import、或已 dispose」。
   证据：`PKG/dsh-tool-cordis/README.md:28` 原文：`status（schema, absent, unsupported, tree for group and include carriers, inactive for disabled, never imported, or disposed entries）`。
   → 实用口径：**不要用 status 判断能力可用性**；本机 `skill-filesystem / tool-skill / tool-bash` 的 `inactive` 恰好都是「host 层行被 disable」，能力来自 preset 层同名行。也不能反过来假定 `schema` 就等于启用。

6. **文件系统 provider 只扫两层、两类布局**：`<root>/<name>/SKILL.md`（目录 bundle）或 `<root>/<name>.md`（扁平文件）；**嵌套的 `**/SKILL.md` 不被发现**。
   证据：`PKG/dsh-skill-filesystem/lib/index.js:595-628`（`discoverRoot` 用 `readdir` 只看直接条目，目录取 `join(entry.path,"SKILL.md")`，文件取 `endsWith(".md")`）；README `:36`、`:147`。

7. **frontmatter 契约严格且失败静默**：必需 `name`（kebab-case）与 `description`；可选 `whenToUse`、`metadata`、`disable-model-invocation`、`user-invocable`。布尔只接受真布尔或 `true/false/yes/no/on/off/1/0`；旧键 `disableModelInvocation/modelInvocable/userInvocable` 直接抛错并丢弃整条技能；错误只进 `ctx.logger.warn`，**模型侧无任何诊断**。
   证据：`PKG/dsh-skill-filesystem/lib/index.js:678-719`（`parseSkillFile` 的各条 warn + return）、`794-807`（首行必须是 `---`）、`863-892`（`parseInvocationPolicy`、`frontmatterBoolean`）、`874-876`（legacy key 抛错）；README `:38`、`:85`、`:149`。

8. **发现 vs 正文分离**：目录条目在发现时解析 frontmatter 缓存；**每次 `get()` 都重新读文件**，所以改正文不需要缓存失效；但正文无版本协议，旧 tool result 不会被改写。
   证据：`PKG/dsh-skill-filesystem/lib/index.js:125-144`；`PKG/dsh-skill/README.md:98`；`PKG/dsh-skill-filesystem/README.md:42`、`:152`。

9. **模型侧只有 `skill` 工具 + 一份 durable catalog 消息**；catalog 只在「该 `skill` 工具对本 agent 可见」且（存在 model-invocable 技能或发现不完整）时发布，按 name+截断 description（默认 500 字符）渲染，用 sha256 digest 比对，变化时**追加替换版**（append-only，不重写历史）。
   证据：`PKG/dsh-tool-skill/lib/index.js:777`（Config 默认 500）、`931-964`（pre-step 判断）、`966-1021`（两种模板）、`1035-1038`（digest）、`1094-1097`（description 归一与截断）；README `:54`、`:85`、`:150-156`。

10. **`/name` 是 `disable-model-invocation` 技能的唯一入口**：只扫描「claimed user message」的文本块，命中 user-invocable 技能就把同一份 `<skill_content>` 作为 user-role instructions 注入该 step，模型不必再调用工具。
    证据：`PKG/dsh-tool-skill/lib/index.js:896-930`（pre-step 注入）、`1108`（`SKILL_GESTURE` 正则）、`1116-1129`；README `:246`。

11. **客户端读取走 `ctx.remote.skills.list`（背后是 `sessionSkillCatalog` 服务）**，按 `sessionId` 解析 cwd + agentPreset；live agent 用 `presets.serviceFor(live,'skills')`，**冷会话用 `agentPresets.acquireScope(preset)` 拿 scope lease，不创建 Agent**；结果过滤 `userInvocable` 并映射为只含 `name/path/description/whenToUse/modelInvocable` 的 `SkillEntry`。
    证据：`PKG/dsh-api-session-controller/lib/types/skill-catalog.js:103`（inject）、`:106`（`super(ctx,'sessionSkillCatalog',{namespace:'skills'})`）、`:116-186`（`list`）、`:188-199`（`scopeFor`）；契约：`PKG/dsh-api-remotes/lib/client.js` 中 `'skills/list': { service: 'sessionSkillCatalog', ... }`（asar 内偏移 1210377，见 §11）。

12. **插件自带技能的官方方式有三种，「用户安装」与之无关**：
    - 包内注册 provider：`dsh-skill-badge`（`provider="dsh-badge"`, `source="bundled"`, `rank=BUNDLED_SKILL_RANK`, `resourceBase` 指向包内 `assets/`）：`PKG/dsh-skill-badge/lib/index.js:10-51`；`dsh-skill-office`（7 个 office 技能同样注册 provider）：`PKG/dsh-skill-office/lib/index.js:11-19,59-101`。
    - preset 用 `customSkillDirs` 挂包内 `skills/` 目录：`PKG/dsh-web-app/presets/cordis.patch.yml:124-128`（把 `@deepseek-ai/dsh-agent-preset` 包里的 `skills` 目录算出来传给 filesystem provider）。
    - 推荐类插件注册「读包内扁平 md」的 provider：`dsh-plugin-recommendations`（`skills/official-plugins.md`）：`PKG/dsh-plugin-recommendations/lib/index.js:28-45`；`dsh-creation-recommendations`（`skills/personalized-pages.md`）：`PKG/dsh-creation-recommendations/lib/index.js:17-34`。
    另有 `bundledSkillDir`（rank 600）与 `$DSH_BUNDLED_SKILL_DIR` 机制，但**在当前 asar 的 patch 里没有任何配置实例**（全库搜索 `bundledSkillDir` 只命中该包 README 与 lib 定义），env 也未设置。

---

## 1. Skill 生命周期（安装 → 发现 → 合并 → 目录 → 加载）

```
[用户/插件把 SKILL.md 放进某个扫描根]      [provider 行是否在该 scope 生效]
              │                                        │
              └──────────────┬─────────────────────────┘
                             ▼
        provider.list({cwd}) 扫描根 → 解析 frontmatter → candidates(含 rank/source/locator)
                             ▼
   registry.collectFresh: layers = [global, ...scopeChain]; 每层内按 rank 排序+去重(first-wins)
                             ▼
   跨层合并 Map(name→entry)，近层覆盖远层 → SkillSummary[]（按 name 排序）
                             ▼
   dsh-tool-skill: 过滤 isModelInvocable → digest 比对 → durable catalog 消息（append/替换）
                             ▼
   模型调 skill(name) 或用户输入 /name → registry.get(name) → provider.get(candidate)
                             ▼
   provider 重读文件 → 校验 → SkillDefinition{content} → renderSkillContent → tool result / injected context
```

**安装**：本机没有任何「安装 skill」的 UI 或命令（`dsh-client-ui-skill` 只提供 composer 的 `/` 选择与工具行卡片，README `:32`、`:38`；Settings 插件页管的是 **plugin bundle**，不是 skill）。安装 = 把有效技能文件放进某个被扫描的根（见 §3.1），或让某个插件/preset 的行挂载它。**没有复制、校验、注册表登记、卸载这些步骤。**

**发现**：`skill-filesystem` 的 `list()` 逐个根扫描（顺序 await，失败根被跳过并使观测「不完整」）；根不存在是合法空状态。

**合并**：同 scope 层内 `rank` 小的先赢；同名后续条目只 `warn` 丢弃；跨层由近及远覆盖，**无 API 可查看被遮蔽的条目**（`PKG/dsh-skill/README.md:140`、`:150`）。

**目录**：这是「模型可见性」的唯一投影；不含 `whenToUse`、source、provider、rank（README `:263`）。

**加载**：`get()` 走 `provider.get(candidate)` 重读文件；定义必须与选中候选同名，否则视为 stale 并清缓存重发现（`PKG/dsh-skill/lib/index.js:250-264`）。

---

## 2. 注册表 `@deepseek-ai/dsh-skill`

### 2.1 服务与访问

| 项 | 事实 | 证据 |
|---|---|---|
| Service key | `skills` | `lib/index.js:132`（`super(ctx,"skills")`） |
| 硬依赖 | `inject: ["skills"]` | 各 provider/consumer 包；`PKG/dsh-skill-filesystem/lib/index.js:29`、`PKG/dsh-tool-skill/lib/index.js:762-767` |
| 可选访问 | `ctx.get("skills")`（需 undefined 检查） | inspect `host/Service` → `skills.access.optional` |
| Config | 仅 `collectCacheMaxEntries`（默认 128） | `lib/index.js:120`；inspect `include:skill` 的 JSON Schema |

### 2.2 方法契约（inspect `host/Service` + 源码）

| 方法 | 语义 | 证据 |
|---|---|---|
| `registerProvider(create: (control: SkillProviderControl) => SkillProvider): () => void` | 同步注册到**调用 context 的 layer**（scoped context → 该 scope 层；否则 global）。同层重名/reserved name 抛错。返回 Cordis effect disposer；disposal 会 invalidate 缓存。 | `lib/index.js:147-183` |
| `register(skill: SkillRegistration): () => void` | 注册 borrowed readonly **runtime** 技能；缺省 `invocation={modelInvocable:true,userInvocable:true}`、`provider="runtime"`；同层同名 first-wins + warn + no-op disposer。 | `lib/index.js:193-215` |
| `async list(options?): Promise<SkillSummary[]>` | = `snapshot().skills`，**invocation-neutral**（调用方自己过滤） | `lib/index.js:224-226` |
| `async snapshot(options?): Promise<SkillCatalogSnapshot>` | `{skills, complete}`；`complete=false` 表示本次发现不完整且**不缓存** | `lib/index.js:234-240`、`265-297` |
| `async get(name, options?): Promise<SkillDefinition \| undefined>` | 非法 name 返回 `undefined`（不抛）；选中候选交回 provider 的 opaque locator；加载与 abort signal 竞速 | `lib/index.js:250-264` |

### 2.3 关键类型（来自 `host/Service` 的 referencedTypes）

```ts
interface SkillSummary {
  path?: string; name: string; description: string; whenToUse?: string;
  invocation: SkillInvocationPolicy; source: SkillSource;
  provider: string; resourceBase?: SkillResourceBase;
}
interface SkillCandidate extends SkillSummary { rank: number; locator: unknown; metadata?: Record<string, unknown> }
interface SkillDefinition extends SkillSummary { content: string; metadata?: Record<string, unknown> }
interface SkillInvocationPolicy { modelInvocable: boolean; userInvocable: boolean }
type SkillSource = 'project-dsh'|'project-agents'|'runtime'|'user-dsh'|'user-agents'|'custom'|'bundled'|(string & {})
type SkillResourceBase = {kind:'directory';path:string}|{kind:'url';url:string}|{kind:'opaque';description:string}
interface SkillProvider { name: string; list(o): Promise<readonly SkillCandidate[] | SkillProviderObservation>; get(c,o): Promise<SkillDefinition|undefined> }
interface SkillProviderControl { signal: AbortSignal; invalidate(): void }
interface SkillViewOptions { cwd?: string; signal?: AbortSignal; scope?: ScopeKey }
```
（`SkillViewOptions.scope` 是 `ScopeKey = object`，**不可序列化**，不能跨进程/存盘。）

### 2.4 rank / source / 冲突

- rank 只在**同一 layer 内**用于同名排序；跨层由「层距离」决定，与 rank 无关（`lib/index.js:298-311`、`312-330`）。
- `runtime` 技能 provider 名为 `runtime`（保留名，注册 provider 时用会抛错），rank 固定 250（`lib/index.js:20-21`、`161`）。
- 同层同名时会 `logger.warn("skill \"x\" from <source> ignored because a higher-priority skill already exists")`（`lib/index.js:319-322`）。
- source 只是标签：filesystem 按根打 `project-dsh/project-agents/custom/user-dsh/user-agents/bundled`；runtime 注册默认 source 由注册者给（badge/office 用 `bundled`）。

### 2.5 缓存与失效

- 缓存键 = `{cwd, scopes: [scopeId...], revision}`，LRU 上限 `collectCacheMaxEntries`（`lib/index.js:395-401`、`288-294`）。
- 唯一失效来源：provider 调自己的 `invalidate()`、runtime 注册/disposal、stale 定义加载。**没有 TTL**（README `:102`、`:137`）。
- 失效时 `revision += 1`、清缓存、`emit "skills/change"`（无参数，监听者自己重新拉）（`lib/index.js:376-412`）。
- 并发改动时最多重试 2 次（`MAX_COLLECT_ATTEMPTS=2`，`lib/index.js:19`、`265-297`）。

---

## 3. 本地文件系统 provider `@deepseek-ai/dsh-skill-filesystem`

### 3.1 扫描根与优先级（代码为准）

`PKG/dsh-skill-filesystem/lib/index.js:20-24` + `:160-198`：

| rank | source | 路径 | 备注 |
|---:|---|---|---|
| 100 | `project-dsh` | `<projectRoot>/.dsh/skills` | projectRoot = 最近的含 `.git` 祖先；无则用 cwd（`:821-829`） |
| 200 | `project-agents` | `<projectRoot>/.agents/skills` | |
| 300 | `custom` | `Config.customSkillDirs[]` | 目录不存在不报错（空状态），**会 watch 到出现为止** |
| 400 | `user-dsh` | `<dshHome>/skills` | `dshHome=$DSH_HOME` 或 `~/.dsh`；跳过 `.system` 子目录 |
| 500 | `user-agents` | `<agentsHome>/skills` | `agentsHome=$DSH_AGENTS_HOME` 或 `~/.agents` |
| 600 | `bundled` | `Config.bundledSkillDir`（未设时取 `$DSH_BUNDLED_SKILL_DIR`） | 当前 asar 无配置实例；env 未设（实测 `DSH_BUNDLED_SKILL_DIR` 为空） |

`includeDefaultRoots: false`：去掉 100/200/400/500 与 `$DSH_BUNDLED_SKILL_DIR` 默认值（README `:56`）。

**本机实测状态**（`bash` 检查真实文件系统）：

| 根 | 路径 | 状态 |
|---|---|---|
| project-dsh | `~/Codes/xch/dsh-plugins/.dsh/skills` | **不存在** |
| project-agents | `~/Codes/xch/dsh-plugins/.agents/skills` | **不存在** |
| user-dsh | `~/.dsh/skills` | **不存在** |
| user-agents | `~/.agents/skills` | 存在：`ego-browser`（symlink → `~/.local/share/ego/ego-skills` → `.../active_version_dir/Resources/ego-skills/ego-browser`，内含合法 `SKILL.md`）；`tabbit`（**断链**，目标 `~/Library/Application Support/Tabbit/LocalAgent/skills/tabbit` 不存在） |
| custom | `@deepseek-ai/dsh-agent-preset` 包的 `skills/`（仅 cordis preset 层） | 4 个技能目录 |

### 3.2 布局与解析细节

- 只认两种形态：`<root>/<name>/SKILL.md` 与 `<root>/<name>.md`；`nested **/SKILL.md` 不发现；非 `.md` 文件、非目录/文件类型的条目跳过（`lib/index.js:600-607`）。
- frontmatter 必须是文件**首行** `---`，再以单独一行 `---` 结束；YAML 必须是对象（`794-820`）。
- `name` 必须匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`（`PKG/dsh-skill/lib/index.js:17`、`:29-31`）。
- 正文 = frontmatter 之后 `trim()` 的内容（`lib/index.js:717`）。
- 读取用 `ctx.fs`（存在时）或 Node I/O；**bundled 根（`trustedHost: true`）强制走 Node I/O 并 `realpath`**（`:83-84`、`:191-196`、`:723-741`）。
- `path` 字段 = `realpath` 后的实际文件路径；`resourceBase` = 技能所在目录（目录 bundle 用自身目录，扁平文件用根目录）（`:129-143`、`:610-625`）。
- 符号链接：`nodeEntryKind` 会跟随并判定目录/文件；**断链或 stat 失败只 warn 跳过该条目**（`:777-793`）。→ `tabbit` 正是这样被静默丢弃。

### 3.3 失败模式（「静默」的准确定义）

所有下列情况都会**丢弃整条技能**，只写 `ctx.logger.warn`，不进模型 catalog、也没有任何管理 API 能查到原因（README `:85`、`:149`）：

| 情况 | 日志 | 代码 |
|---|---|---|
| YAML 解析失败 | `skill file ... ignored: invalid YAML frontmatter` | `:683-688` |
| 无 frontmatter | `... ignored: missing YAML frontmatter` | `:689-692` |
| 缺 name/description | `... ignored: frontmatter requires name and description` | `:693-698` |
| name 非法 | `... ignored: invalid skill name "..."` | `:699-702` |
| invocation 值/旧键非法 | `... ignored: invalid invocation frontmatter` | `:703-709`、`:863-892` |
| 断链/非文本 | `skill entry ... ignored: failed to follow symbolic link` / `... failed to read text file` | `:777-793`、`:769-771` |
| 根不可读 | `skill root "..." skipped: ...`（整根当次省略，观测不完整，下次重试） | `:108-112` |

### 3.4 watch 行为

- 默认 `watch: true`；Chokidar `depth: 1`、`ignoreInitial`、`atomic`、`awaitWriteFinish{stabilityThreshold:200, pollInterval:100}`（`:381-394`、`:25-27`）。
- 相关事件（`:555-571`）：根下直接 `addDir/unlinkDir`；根下 `*.md` 的 add/remove；`<bundle>/SKILL.md` 的 add/remove/change。`references/scripts/assets` 等子树变化**被忽略**。
- 事件合批到一个 microtask 后调一次 `invalidate()`（`:476-485`）。
- 不存在的根用 `fs.watchFile` 从最近存在的祖先逐段探测，出现后切换 Chokidar（`:516-554`、`:352-380`）。
- 「第一方写入」加速：监听 `fs/observed`，仅当 actor 是 `edit`/`write` 且路径可能是技能文件时同步 invalidate（`:56-59`、`:249-254`、`:578-582`）。
- 上限 `watchMaxProjects`（默认 128，`:27`），超限最旧项目被释放并 invalidate（`:235-248`）。

### 3.5 配置字段（`z` schema，`:30-43`）

`providerName`(="filesystem") / `includeDefaultRoots`(=true) / `dshHome`(=$DSH_HOME|~/.dsh) / `agentsHome`(=$DSH_AGENTS_HOME|~/.agents) / `customSkillDirs`(=[]) / `watch`(=true) / `watchUsePolling`(=false) / `watchStabilityThresholdMs`(=200) / `watchPollIntervalMs`(=100) / `watchMaxProjects`(=128) / `watchFollowSymlinks`(=true) / `bundledSkillDir`(无默认)。

---

## 4. 模型侧 `@deepseek-ai/dsh-tool-skill`

### 4.1 前置条件与注入

`inject = ["agents","tools","skills","workingDirectory"]`（`lib/index.js:761-767`）。注册一个工具 `skill`（`:787-895`）与两个 `agent/pre-step` 监听（`:896-930`、`:931-964`）。

### 4.2 catalog 的发布条件与形状

每次 pre-step：

1. `ctx.tools.get("skill", agent) === skillTool` 才算可见（被同 scope 同名工具遮蔽则不算）；不可见时按空快照处理（`:935-942`）。
2. `ctx.skills.snapshot({cwd: await workingDirectory.ensure(agent), scope: agent, signal})`（`:935-939`）。
3. 过滤 `isModelInvocable`（`:944`）。
4. digest = sha256(entries + completeness)（`:1035-1038`）；与最新可见 `skill-catalog` 消息比对（`:1065-1082`）。
5. 需要时产出 durable user-role 消息：首版用 `<available_skills>` + 引导语；此后用「replacement catalog」；空集合会明确「不要使用旧名字」（`:955-964`、`:966-1018`）。
6. 不完整发现会附警告并标记 `source.incomplete=true`（`:978`、`:988`、`:1015`）。

catalog 模板原文见 `PKG/dsh-tool-skill/README.md:118-148`（与代码 `:966-1021` 一致）。

### 4.3 `skill` 工具

- 唯一参数 `name`（string, required）；输出 schema 固定 `{name, provider, resourceBase?, content}`（`:787-865`）。
- 执行流程：校验 name → `workingDirectory.ensure` → `ctx.skills.list(lookup)` 找同名 → 无则 `Error: skill "<name>" is unknown or no longer available` → `!isModelInvocable` 则 `Error: ... is not available for model invocation` → `ctx.skills.get()` 取正文 → 返回（`:866-885`）。
- 渲染：`renderSkillContent` 产出 `<skill_content name><skill_resources>…<skill_instructions>`，工具返回与 `/name` 注入共用同一渲染（`PKG/dsh-skill/lib/index.js:57-81`；README `:178-218`）。

### 4.4 `/name` 用户显式调用

- 只扫 `message.source.kind === "user"` 的文本块；正则 `(^|\s)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?=\s|$)`；按首次出现去重（`:1108`、`:1116-1129`）。
- 命中后 `ctx.skills.get(name)`，`isUserInvocable` 才注入；同一 step 重复只注入一次；未知/被禁用的名字保持普通文本（`:896-930`）。
- 这是 `disable-model-invocation: true` 技能的唯一可达入口（README `:89`、`:246`）。

### 4.5 token / KV cache

- catalog 是 durable 前缀之后的 user 消息；变化时 append replacement，旧 token 不被重写；空 catalog 会 retire 旧名字（README `:150-156`）。
- 正文加载 = 普通 tool result（或注入 context），append-only，不进 prefix（README `:220-226`、`:248-254`）。
- `catalogDescriptionMaxLength` 默认 500（min 3）直接决定重复成本（`lib/index.js:777`；README `:48`）。

---

## 5. 客户端 API：`sessionSkillCatalog`

### 5.1 契约（inspect `host/Service` 原文）

```
@Remote async list(request: SkillListRequest, signal: AbortSignal): Promise<SkillListValue>
  - 描述：List the user-invocable skills visible to one Session composition.
  - throws：RemoteError when the Session cannot be inspected or no registry can serve it.
interface SkillListRequest { readonly sessionId: SessionId }
interface SkillListValue { readonly skills: readonly SkillEntry[] }
interface SkillEntry { path?: string; name: string; description: string; whenToUse?: string; modelInvocable: boolean }
```
服务描述即：`Host service backing ctx.remote.skills without activating a cold Agent.`

### 5.2 源码流程（`PKG/dsh-api-session-controller/lib/types/skill-catalog.js`）

- `inject = ['agents','sessionQuery','typert','workingDirectory']`（`:103`）；`super(ctx,'sessionSkillCatalog',{namespace:'skills'})`（`:106`）。
- `list(request, signal)`（`:116-186`）：
  1. `sessionQuery.observeSession(sessionId)`；无 projections 视为不可读（`:125-128`）。
  2. `cwd = projections.values.workingDirectory ?? header.cwd ?? workingDirectory.defaultDirectory`（`:129-131`）。
  3. `agentPreset = projections.values.agentPreset ?? undefined`（`:132`）。
  4. 若该 session 有 **live agent**：`cwd = await workingDirectory.ensure(live, signal)`（`:133-135`），`scope = live`（`:160`）。
  5. `skillRegistry = presets?.serviceFor(live,'skills') ?? ctx.get('skills')`（`:152-158`），没有则 RemoteError（`gateway/internal`）。
  6. **冷会话**：`lease = await presets.acquireScope(agentPreset)`，`scope = lease.key`（`:159-160`、`:188-199`）；未知 preset 时 acquireScope 失败 → 回退 global（`:192-197`）。
  7. `(await skillRegistry.list({cwd, scope})).filter(isUserInvocable)`（`:162`）。
  8. 映射为 `SkillEntry`（只保留 `name/path/description/whenToUse/modelInvocable`）（`:164-170`）。
  9. 错误统一转 `RemoteError('session/not-found' | 'gateway/internal')`（`:146-150`、`:173-175`）。
- 结果**按名字排序**由 registry 保证（registry `snapshot` 排序；`PKG/dsh-skill/lib/index.js:237`）。

### 5.3 客户端如何用（不激活冷 Agent）

- UI `dsh-client-ui-skill` 通过 `skills/list` Remote 获取候选（README `:32`）；普通会话按 session 缓存，single-flight；`scope-birth warm` 预热（README `:54`）。
- 缓存清空事件：`agent-preset/selected`（丢该 session）、`plugin-manager/changed`（全清）、`connection/reset`（全清）（README `:54`）。
- 已知限制（README `:107`）：**磁盘上增删 `SKILL.md` 不向前端发任何事件**，打开着的会话会一直显示旧列表，直到 preset 切换 / 插件管理操作 / 连接重置。→ 管理插件写完文件后，应引导用户刷新或由 host 侧事件驱动。

### 5.4 拿不到什么

`sessionSkillCatalog` 拿不到：`provider`、`source`、`rank`、`resourceBase`、正文、以及 `user-invocable:false` 的 model-only 技能。要这些必须走 host 侧 `ctx.skills.snapshot()` / `ctx.skills.get()`。

---

## 6. 本会话技能来源实例（`agentPreset=cordis`）

下表中的「层级」指 registry 的 layer：`preset:cordis` 或 `global`。

| Skill | 层级 | provider | source / rank | 文件位置证据 |
|---|---|---|---|---|
| `agent-experience` | preset:cordis | `filesystem` | `custom` / 300 | `PKG/dsh-agent-preset/skills/agent-experience/SKILL.md`（asar 内 2093 B） |
| `cordis-composition-reference` | preset:cordis | `filesystem` | `custom` / 300 | `.../cordis-composition-reference/SKILL.md` + `references/packages.md` |
| `cordis-plugin-development` | preset:cordis | `filesystem` | `custom` / 300 | `.../cordis-plugin-development/SKILL.md` + `references/*` + `templates/*` |
| `editing-cordis-compositions` | preset:cordis | `filesystem` | `custom` / 300 | `.../editing-cordis-compositions/SKILL.md` |
| `ego-browser` | preset:cordis | `filesystem` | `user-agents` / 500 | `~/.agents/skills/ego-browser` → `~/.local/share/ego/ego-skills` → `.../ego-browser/SKILL.md`（实测可读，frontmatter `name: ego-browser`） |
| `office`, `office-docx`, `office-pptx`, `office-xlsx`, `office-render`, `office-recalculate`, `office-export-pdf` | global | `dsh-office` | `bundled` / 600 | `PKG/dsh-skill-office/assets/<skill>/SKILL.md`；挂载行见 `PKG/dsh-sdk-app/cordis.patch.yml:38-44` |
| `official-plugins` | global | （包内 provider） | `bundled` / 600 | `PKG/dsh-plugin-recommendations/skills/official-plugins.md`（扁平 md） |
| `personalized-pages` | global | （包内 provider） | `bundled` / 600 | `PKG/dsh-creation-recommendations/skills/personalized-pages.md` |

说明与不确定性：
- preset:cordis 的 `skill-filesystem` 实例**没有**设 `includeDefaultRoots:false`，所以它同时扫 `~/.agents/skills`（rank 500）。`ego-browser` 出现在 preset 层而非 global 层，与「host 层 skill-filesystem 被 disable」一致（§0.4）。
- `office*` 的 provider 注册代码与 asset 路径已证实；**该行在 desktop 运行时如何被启用未完全验证**（本 profile `package.json` 的 bundles 列表不含 `dsh-sdk-app`；环境变量 `DSH_PRIMARY_RUNTIME`/`DSH_BUNDLED_OFFICE_*` 当前 shell 未设置，但 Electron 主进程环境可能不同）。运行时证据：本会话 system prompt 的 `available_skills` 确实列出这 7 个名字。验证方法见 §9。
- `official-plugins` / `personalized-pages` 属 global 层，因为承载它们的 bundle（`@deepseek-ai/dsh-personalized-recommendations`）在 profile bundles 里（`PROFILE/package.json`），由 host plane 插件注册 provider。

---

## 7. 插件/预设自带技能的三种发布方式（含代码写法）

### 7.1 包内注册 provider（推荐，最可控）

`dsh-skill-badge`（`PKG/dsh-skill-badge/lib/index.js`）全文即最小范例：

```js
const PROVIDER_NAME = "dsh-badge";
const SKILL_BODY_URL = new URL("../assets/dsh-badge.md", import.meta.url);   // :11
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) }; // :12-15
const CANDIDATE = { name:"dsh-badge", description:"…", invocation:{modelInvocable:true,userInvocable:true},
  provider:PROVIDER_NAME, source:"bundled", resourceBase:RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK, locator: SKILL_BODY_URL };                        // :16-28
const provider = { name: PROVIDER_NAME, list: () => Promise.resolve([CANDIDATE]), get: … };  // :29-43
function apply(ctx) { ctx.skills.registerProvider(() => provider); }           // :49-51
```

`dsh-skill-office` 同一模式但技能在 `assets/<name>/SKILL.md`，且 `get()` 会按需拼接运行环境说明（`:59-101`），`inject=["skills"]`（`:29`）。

### 7.2 preset 用 `customSkillDirs` 挂包内 `skills/` 目录

`PKG/dsh-web-app/presets/cordis.patch.yml:124-128`：

```yaml
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    customSkillDirs:
      - !!js process.getBuiltinModule('node:path').join(
          dirname(createRequire(baseUrl).resolve('@deepseek-ai/dsh-agent-preset/package.json')), 'skills')
```

- 这条 provider 注册进 **preset 的 layer**（不是 global），与本 preset 的 `tool-skill`（`:129-130`）一起让该 agent 有本地技能与 catalog。
- `dsh-agent-preset/README.md:50` 明确说明这些 `skills/` 目录由 creator mode 通过 `skill-filesystem` 挂载；仓库内 `.agents/skills/agent-experience/SKILL.md` 是相对符号链接（README `:52`），发布包内是普通文件。
- 注意：这里用的是 `customSkillDirs`（source=`custom`, rank=300），**不是** `bundledSkillDir`（rank 600）。

### 7.3 `bundledSkillDir` / `DSH_BUNDLED_SKILL_DIR`

- 机制存在：`config.bundledSkillDir ?? (includeDefaultRoots ? process.env.DSH_BUNDLED_SKILL_DIR : undefined)`，`trustedHost:true`（走 Node I/O + realpath），rank 600（`PKG/dsh-skill-filesystem/lib/index.js:83-84`、`:191-196`）。
- **当前 asar 内没有任何 patch 配置 `bundledSkillDir`**（全库搜索仅命中 README/源码定义）；`DSH_BUNDLED_SKILL_DIR` 在当前环境为空。→ 现状下它不是活跃加载路径，但它是**唯一**能让 filesystem provider 扫描「包内目录」而不用 `customSkillDirs` 的字段。

### 7.4 与「插件自带 skill」的边界

这些技能属于**包内容**：随包升级替换，不在用户扫描根内，也没有独立卸载语义。删除或改写它们等于改插件安装内容，升级即被覆盖。管理插件必须把它们标成「插件自带（只读）」，与用户可管理的 `project-*/user-*/custom` 分开。

---

## 8. 「安装」与「启用/停用」的两种含义

| 问题 | 事实 | 边界 |
|---|---|---|
| 有「安装 skill」的 UI/命令吗？ | **没有**。客户端只有 composer `/` 选择与 `skill` 工具行卡片（`PKG/dsh-client-ui-skill/README.md:32,38`）；Settings 的插件页管理的是 plugin bundle。 | 不要把「安装」实现成复制到某个私有仓库；DSH 没有 skill 仓库概念。 |
| 那怎么「安装」？ | 把有效 `SKILL.md`（目录或扁平 `.md`）放进某个被扫描的根；下次 catalog pre-step（或 watcher invalidate 后）自动出现，无需重启。 | 需要 frontmatter 合法；失败静默（§3.3）。 |
| 怎么「启用/停用」某个 skill？ | 可行手段：①移出扫描根；②改文件扩展名（`.md` → 非 `.md`，provider 不再识别）；③改 provider 行的 `disabled`/配置（要改 profile 或 preset YAML，不即时）；④改 `includeDefaultRoots`/`customSkillDirs` 使根不再被扫。 | **没有** per-skill enable/disable 存储；不存在「技能状态」持久化。 |
| 怎么启用某个 skill 来源？ | provider 行是 YAML 配置：host 层（`dsh-base`/`dsh-web-app`/profile patch）或 preset 层（`presets/*.patch.yml`）。改 profile 的 `cordis.patch.yml` 是官方覆盖点（`PROFILE/cordis.patch.yml` 头部注释），preset 的 `config.plugins` 也可被 profile patch 按 id 覆盖（`PKG/dsh-web-app/presets/cordis.patch.yml:1-3`）。 | 浏览器端没有写 profile 的能力；必须 host 侧或用户手工编辑。 |
| `Config.listConfigs` 能告诉我「启用了没」吗？ | 不能单独判断。`status` 是 Config schema 投影状态，`inactive` 集合 = disabled / never imported / disposed（`PKG/dsh-tool-cordis/README.md:28`）。本机 `skill-filesystem`/`tool-skill`/`tool-bash` 的 inactive 恰好对应 host 行被 disable。 | 正确判断 = 看 YAML 行 + 运行时 snapshot/catalog，而不是 status。 |

---

## 9. 给 Skill 管理插件的 API 清单

### 9.1 可做（Host 侧插件；都能只读，且大多数可写文件）

| 能力 | API | 说明/证据 |
|---|---|---|
| 列出全局层技能（含 model-only） | `ctx.skills.snapshot({cwd})` / `.list()` | `PKG/dsh-skill/lib/index.js:224-240`；`cwd` 决定 project 根 |
| 列出某 preset 层 + 全局层 | `agentPresets.acquireScope(id)` → `{key}`；再 `ctx.skills.snapshot({cwd, scope:key})`；用完 `dispose()` | 契约：inspect `agentPresets.acquireScope`（`async acquireScope(id?: string): Promise<{key: ScopeKey} & AsyncDisposable>`）；这正是 `sessionSkillCatalog` 冷会话路径（`skill-catalog.js:159,188-199`） |
| 按 sessionId 列「该会话用户可调用」技能 | `ctx.sessionSkillCatalog.list({sessionId}, signal)`（或客户端 `ctx.remote.skills.list`） | 只含 user-invocable；不激活冷 Agent（§5） |
| 读某技能正文 | `ctx.skills.get(name, {cwd, scope, signal})` | 每次重读文件；`undefined` 表示不存在/name 非法 |
| 读技能真实文件路径 | `SkillSummary.path`（filesystem provider 填 realpath） | 用于「在编辑器中打开」；runtime/bundled provider 可能不填（badge/office 无 `path`） |
| 扫描根 CRUD（读写 SKILL.md） | 自己用 `ctx.fs`（`fs.resolve/stat/listDir/readText`，见 `PKG/dsh-skill-filesystem/lib/index.js:642-645`）或 Node I/O | 用第一方 `write/edit` 工具写入会经 `fs/observed` 立刻 invalidate（`:56-59`） |
| 校验 frontmatter | 自己实现：首行 `---`、YAML 对象、kebab name、非空 description、严格布尔、拒绝 legacy 键 | 规则来源 `:678-719`、`:794-820`、`:863-892`；必须与 provider 一致，否则「校验通过但实际被丢弃」 |
| 感知 catalog 变化 | 监听 `skills/change`（无参数，需重新 snapshot） | registry `notifyChange` emit（`lib/index.js:403-412`）；Cordis 事件名可用性见 §10 |
| 定位某技能属于哪个根/是否被遮蔽 | 只能从 `SkillSummary.source/provider/path` 推断；需自己按 scope 分别 snapshot 再对比 | 遮蔽无 API（`PKG/dsh-skill/README.md:140`） |
| 管理 UI 的「诊断」列 | 自己扫描根并解析 → 报告「文件存在但 provider 未收录」 | 这是本调研发现的最大产品价值点（`tabbit` 类断链、frontmatter 写坏、根不存在） |

### 9.2 推荐架构（两个面）

- **Host 插件**：注入 `skills`（可选注入 `agentPresets`、`sessionQuery`、`workingDirectory`），提供 3 个只读 Remote（如 `skillAdmin/list`、`skillAdmin/read`、`skillAdmin/diagnose`）和受控写操作（写/移动/删除扫描根内的文件）。
- **Client 插件**：只调用自己的 host Remote，不直连 `ctx.skills`（浏览器没有 `ctx.skills`，只有 `ctx.remote`）。可复用 `ctx.remote.skills.list` 的缓存失效事件语义。

### 9.3 不可做 / 不建议

| 不可做 | 原因 |
|---|---|
| 删除或改写插件包内 `assets/`、`skills/` 下的技能 | 属包内容，升级覆盖；无独立卸载语义；且 `bundled` 根被 provider 以 `trustedHost` 只读方式扫描 |
| 用 `Config.listConfigs.status` 判断「skill 是否启用」 | status 无法区分 disabled 与 never-imported/disposed，也不反映 preset 层（`dsh-tool-cordis/README.md:72`：preset 的 `plugins` 挂在 detached tree，profile 树看不到） |
| 让浏览器直接写 profile YAML / 扫描根 | client 无 host 文件系统权限；profile 写入属于 host 侧（`configEditor`/Plugin Manager）职责 |
| 期待「列出所有被遮蔽的同名技能」 | registry 明确不保留 shadowed 定义（`PKG/dsh-skill/README.md:140`） |
| 通过 `sessionSkillCatalog` 拿 model-only / provider / rank / 正文 | 契约只返回 `SkillEntry`（§5.4） |
| 依赖 `scope` 跨进程持久化 | `ScopeKey = object`，opaque、不可序列化 |
| 假设写完文件前端立刻更新 | 磁盘变更不发客户端事件（`PKG/dsh-client-ui-skill/README.md:107`） |

### 9.4 风险清单

1. **rank 遮蔽**：新放一个同名技能可能只是「被丢弃并 warn」，模型看不到，用户也不知道（`lib/index.js:319-322`）。
2. **跨层遮蔽**：preset 层同名会静默盖住 global 层（`dsh-skill/README.md:140`）。
3. **watch 失效**：`watch:false` 时（可配置）只有 `fs/observed` 路径会失效；管理插件应始终提供一个「强制重新发现」的手段（例如自己的 provider invalidate 或提示重启/切换 preset）。
4. **frontmatter 写坏**：静默消失，无诊断（§3.3）。管理插件的校验必须是**前置阻塞**，不能事后靠日志。
5. **根不存在**：`~/.dsh/skills` 当前不存在；写入时需 `mkdir -p`，且 watcher 对「根从无到有」的探测依赖 `fs.watchFile` 轮询（`lib/index.js:352-380`），可能有延迟。
6. **符号链接**：断链静默跳过；`watchFollowSymlinks` 默认 true；管理页应显式做 `lstat/stat` 检查并展示断链。
7. **preset 边界**：在 preset 层挂的 provider 只影响该 preset 的会话；管理页若只展示 global 层会漏掉大部分本机技能（本会话 4 个 creator skills 就在 preset 层）。

---

## 10. 未验证项与验证方法

| # | 未验证/不确定 | 现状 | 验证方法 |
|---|---|---|---|
| 1 | desktop 运行时如何启用 `dsh-sdk-app` 的 `skill-office` 行 | 运行时 catalog 有 7 个 office 技能；挂载行存在于 `PKG/dsh-sdk-app/cordis.patch.yml:38-44`；本 profile bundles 未列该包 | 读桌面启动脚本/`desktop-runtime.json` 的 bundle 组合；或在 Host 里 `ctx.get('skills').snapshot()` 看 `provider==='dsh-office'`；或 `cordis_inspect_query(Config, entry: 'include:skill-office')` 看是否列出该 entry |
| 2 | `skills/change` 在 Cordis 事件类型中的声明与监听方式 | registry 确实 `dispatch("emit",["skills/change"])`（`lib/index.js:403-412`），未读 `dsh-skill` 的 `Events` 声明 | inspect host/Event `listEvents`（不带参数）看是否列出 `skills/change`；或在插件里 `ctx.on('skills/change',…)` 实测 |
| 3 | `scopeChainOf` 的链构造规则（父/子 scope 顺序） | 只确认 `collectFresh` 用 `[global, ...chainLayers(scope)]` 与「近层覆盖」 | 读 `PKG/dsh-scope` README / lib |
| 4 | preset 层 provider 与 host 层同名 `filesystem` 并存的细节 | base 行被 web-app disable，所以当前不并存；若用户重新启用 host 行则两层各有一个 `filesystem`，按层隔离应合法 | 在 profile patch 里 `- id: skill-filesystem disabled: false` 后 inspect Service/Registry 行为（需重启，属实验，本调研未做） |
| 5 | `minimal` preset 无 skill 行时的模型行为 | YAML 确认无 skill/tool-skill 行 | 用 minimal preset 开一个会话看 system prompt 是否无 catalog、`skill` 工具是否缺失 |
| 6 | 客户端 `skills/list` 的 RPC 失败表现 | README 说「失败被记录并折叠成静默菜单组丢弃」（`PKG/dsh-client-ui-skill/README.md:32`） | 断网/关插件实测 |
| 7 | `~/.agents/skills/tabbit` 断链的日志原文 | 代码路径已确认（`:777-793`），未取到实际 `ctx.logger` 输出 | 读 Host 日志文件（`PROFILE/.plugin-manager/logs` 不含 host 日志；需 `--verbose` 或日志重定向） |

---

## 11. 证据索引（可逐条复核）

**关键源码文件（asar 内，`read` 可直接读）**
- `PKG/dsh-skill/lib/index.js`（566 行）——注册表全部行为；`package.json` 版本 `0.2.2-rc.1`。
- `PKG/dsh-skill-filesystem/lib/index.js`（902 行）——发现/解析/watch 全部行为；依赖 `chokidar@5`、`yaml@^2.4.2`。
- `PKG/dsh-tool-skill/lib/index.js`（1131 行）——catalog 与 loader 工具。
- `PKG/dsh-api-session-controller/lib/types/skill-catalog.js`（204 行）——`sessionSkillCatalog` 精确实现。
- `PKG/dsh-skill-badge/lib/index.js`（53 行）、`PKG/dsh-skill-office/lib/index.js`（104 行）、`PKG/dsh-plugin-recommendations/lib/index.js`、`PKG/dsh-creation-recommendations/lib/index.js`——插件自带技能范例。
- `PKG/dsh-tool-cordis/README.md:28`——`Config.listConfigs` 的 status 枚举权威说明；`:72`——「preset 不列在 profile 树」限制。

**关键 YAML**
- `PKG/dsh-base/cordis.patch.yml:312-319`——插入 `skill`/`skill-filesystem`/`tool-skill`。
- `PKG/dsh-web-app/cordis.patch.yml:485-491`（`tool-plugin-manager`/`tool-bash`/`tool-pwsh` disabled）、`:506-510`（`tool-fs`/`tool-fs-search`）、`:512-525`（skill plane 注释 + `skill-filesystem`/`tool-skill` disabled）。
- `PKG/dsh-web-app/presets/cordis.patch.yml:122-130`——preset 挂 `tool-cordis`、`skill-filesystem(config.customSkillDirs)`、`tool-skill`。
- `PKG/dsh-web-app/presets/standard.patch.yml:40-43`、`presets/ptc.patch.yml:40-43`——同样挂载；`presets/minimal.patch.yml` 无。
- `PKG/dsh-sdk-app/cordis.patch.yml:38-44`——`skill-office` 行与 env 驱动的 `assetRoot/cli/node`。
- `PROFILE/cordis.patch.yml`（本地 5.9 KB）——**不含任何 skill 行**；即用户没有改过 skill 配置。
- `PROFILE/package.json`——profile bundles 列表（决定哪些 host 插件存在）。

**运行环境实测**
- `env`：`DSH_HOME=~/.dsh`、`DSH_PROFILE=desktop`、`DSH_PROFILE_DIR=~/.dsh/profiles/desktop`；`DSH_BUNDLED_SKILL_DIR`/`DSH_AGENTS_HOME`/`DSH_PRIMARY_RUNTIME` 均未设置。
- 目录：`~/.dsh/skills` 不存在；项目 `.dsh/skills`、`.agents/skills` 不存在；`~/.agents/skills` 含 `ego-browser`（多级 symlink，可读 `SKILL.md`）与 `tabbit`（断链）。
- 会话头：`agentPreset=cordis`、`cwd=~/Codes/xch/dsh-plugins`（`9831e284-…/session.v4.jsonl.zstd`，`zstd -dc` 读取）。
- inspect：`host/Service` → `skills`、`sessionSkillCatalog`、`agentPresets` 契约；`host/Config` → `include:skill`（`status:schema`，schema 含 `collectCacheMaxEntries`）、`include:skill-filesystem`（`status:inactive`）、`include:tool-skill`（`status:inactive`）、`include:tool-bash`（`status:inactive`）。

**辅助只读脚本**（可复现，位于 `/tmp`，不在仓库内）
- `node /tmp/asar-find.mjs <asar> <needle> [maxHits]`——字节串 → 归档成员 + 行号。
- `node /tmp/asar-cat.mjs <asar> <memberPath> [regex]`——打印/检索单个成员。
- 说明：`app.asar` 内文件是明文拼接（203 MB），`grep -a -b` 亦可直接命中；但 `ls/cat` 与 glob/grep 工具不能用。

---

## 12. 一句话给决策者

**Skill 子系统的真实形态是「一层注册表 + 每 scope 一个 provider 集合 + 一个模型侧 catalog 投影」，没有安装器、没有状态库、没有诊断 API。** 因此 Skill 管理插件最值钱的部分不是「安装/卸载」，而是：**正确按 scope 分层展示（global vs 每个 preset）、把扫描根里的「文件存在但未生效」显式诊断出来、以及提供受控的文件 CRUD + 前置 frontmatter 校验**；「启用/停用」只能通过移动文件或改 YAML 行表达，且必须告知用户可能被 rank/层遮蔽。