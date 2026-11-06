# 技能市场索引（Skill Market Index）调研

> 目标：为「技能市场源」定义可被第三方开发者实现的索引规范，并给出实现方案。
> 版本基线：DSH 0.2.1-rc.5（asar 内 `dsh` 包 0.2.2-rc.1）。
> 调研对象：DSH 插件市场索引 `@deepseek-ai/dsh-plugin-market-index`、插件市场读取器 `@deepseek-ai/dsh-plugin-market`、Discover UI `@deepseek-ai/dsh-client-ui-plugin-market`，以及本仓库的 `index.json` / `market.json` / `scripts/release.mjs` / `scripts/validate-index.mjs`。
> 产物：本文件 → [技能市场索引规范 v1.0](../product/skill-market-index-spec.md) → [实现方案](../design/skill-market-index-implementation.md)。

---

## 0. 一句话结论

DSH 已经有一套成熟的「插件市场索引 format 1」：**JSON 文档 + 校验器 + Host 读取器 + commit pin + 不可变版本**。技能市场索引应当**复用其格式约定与读取策略**（本地化、元数据分类、图标、SemVer、`engines.dsh`、版本数组、缓存/超时/拒绝 redirect），但**不能复用安装链路**（插件走 `plugin_manager` / npm / git，技能是文件目录，没有包管理器），因此技能索引的核心差异是：**每个版本用「文件清单（path + 绝对 URL + sha256 + size）」描述，安装器逐文件下载、校验、原子写入扫描根**。

---

## 1. DSH 插件市场索引是怎么工作的

### 1.1 索引文档（format 1）

校验器 `@deepseek-ai/dsh-plugin-market-index`（320 行、无运行时依赖）定义了全部规则；`parseMarketIndex(value, indexUrl)` 是唯一入口。

| 字段 | 规则（源码位置） |
| --- | --- |
| `format` | 必须为 `1`（`parseMarketIndex`，`lib/index.js:280`） |
| `title` | 必填，`localizedText`：字符串，或 `{语言 id: 字符串}` 且必须含 `en`；语言 id 形如 `zh`、`zh-cn`（`localizedText`，`:51`） |
| `description` | 可选，同上 |
| `metadata.categories` | 声明式表 `{id: {title}}`；条目只能引用已声明 id |
| `metadata.labels` | 同上；条目引用不能重复 |
| `metadata.sortKeys` | `{id: {title, order: "asc"\|"desc"}}`；条目值为有限数字 |
| `plugins[]` | 非空数组；`name` 为合法 npm 包名、全局唯一 |
| `plugins[].title/description/icon/author/homepage/repository` | 可选；`icon` 支持 `data:`（SVG/PNG/JPEG/WebP，解码 ≤ 32 KiB）或 URL（https 或与索引同源） |
| `plugins[].versions[]` | 非空；`version` 精确 SemVer、唯一、按 SemVer 降序；`publishTimestamp` 为 Unix 秒整数 `[0, 10^11)` |
| `versions[].source` | `npm`（可选 registry）或 `git`（https 仓库 URL + 40 位 commit + 可选 `path`） |
| `versions[].engines.dsh` | 可选 SemVer range；不能是 `workspace:` |
| 未知字段 | 校验器**丢弃**而不是报错（格式演进策略） |
| 错误 | `MarketIndexError { path, reason }`，如 `$.plugins[0].versions[1].version ...` |

关键 URL 规则（`httpUrl`、`gitUrl`、`packagePath`、`repository`）：

- 绝对 URL；协议限定；**不允许 credentials**；**不允许 query/fragment**（icon/homepage 例外）。
- Git 仓库 URL 必须是**规范形式**的 https、至少两段路径、不能是 tarball。
- `path` 是相对目录，段只允许 `A-Za-z0-9._@+-`，禁止 `.`/`..`。
- 相对 icon 按索引 URL 解析；解析结果必须是 https 或与索引同源。

### 1.2 Host 读取器（`@deepseek-ai/dsh-plugin-market`）

| 行为 | 事实 |
| --- | --- |
| 索引源配置 | `indexes: []`，按显示顺序；URL 必须是规范 http(s)、无凭据/fragment；重复 URL 只列一次 |
| 拉取 | 使用进程 `fetch`（走代理）；**拒绝 redirect**；单次超时 `fetchTimeoutMs`（默认 15s）；正文上限 `maxBytes`（默认 128 MiB） |
| 解析 | 在 Worker Thread 中严格 UTF-8 解码 + JSON 解析 + 校验；相对 icon 按索引 URL 解析 |
| 缓存 | 成功文档缓存 `cacheTtlMs`（默认 10 分钟）；`refresh` 绕过；每次拉取产生新的 `fetchedAt`，分页可用 `fetchedAt` 固定同一份文档 |
| 安全 | 只读**已配置**的 URL，绝不拉任意地址；失败记录在 `listIndexes` 错误中 |
| 查询 | `text`/`category`/`labels`/`sort`/`offset`/`limit`/`refresh`/`fetchedAt`；`limit` 1–100 |
| 兼容性 | 按版本 `engines.dsh` 与 profile 的版本豁免计算；默认版本 = 最高兼容的正式版，否则最高兼容的预发布版 |
| 安装状态 | `not-installed` / `installed` / `update-available` / `different-version` / `provided` |
| 安装 | 只产出安装参数（`marketInstallTarget`：`name@version` 或 `git+https#commit&path:`），真正安装走 `plugin_manager`（另一套审批） |
| 详情文档 | 从 npm CDN 或 Git 读 README/`meta.detail`；技能索引 v1 不需要 |

### 1.3 本仓库的索引生成/发布

- `market.json`：索引标题、描述、分类、标签、仓库地址（生成输入）。
- `index.json`：生成产物；`format: 1`，每个仓库插件一个 `plugins[]` 条目，版本 pin 到 40 位 commit。
- `scripts/release.mjs`：要求工作区干净 → HEAD 作为版本 commit → 追加版本条目 → 用官方校验器校验 → 提交 `index.json`。
- `scripts/validate-index.mjs`：用同一个校验器验证格式、每个插件已列出、commit 存在于当前历史、文档与重新生成结果一致。
- 关键原则：**版本不可变**（同一版本内容变了就拒绝发布，必须升版本）；索引 URL 必须匿名可读、https、无 redirect。

---

## 2. 可以复用的部分

| 设计点 | 复用方式 |
| --- | --- |
| 文档格式 | `format: 1`；`title` 必填、`description` 可选；未知字段丢弃 |
| 本地化 | 字符串或 `{lang: string}`，对象必须含 `en`；语言 id 小写 |
| 元数据 | `metadata.categories/labels/sortKeys` + 条目引用声明 id |
| 图标 | `data:`（≤32 KiB 解码，SVG/PNG/JPEG/WebP）或 https/同源 URL |
| 版本 | 精确 SemVer、版本数组非空、降序、唯一；`publishTimestamp` Unix 秒 |
| 兼容性 | `engines.dsh` SemVer range；默认版本选择规则 |
| 读取策略 | 只读已配置源、进程 fetch、拒绝 redirect、超时、正文上限、10 分钟缓存、`fetchedAt` 分页 |
| 错误模型 | `{ code, path, reason }`；索引错误带 JSON 路径 |
| 发布流程 | 生成 → 校验 → 版本固定 → 不可变；校验器随仓库/包发布 |

## 3. 不能复用、必须重新设计的部分

| 插件市场 | 技能市场 | 原因 |
| --- | --- | --- |
| 安装目标 = npm 包 / git 包 | 安装目标 = **文件目录**（`<root>/<name>/SKILL.md` + 资源） | 技能没有包管理器；DSH 只按目录/文件发现 |
| `source: npm/git` + `marketInstallTarget` | `files[]` 清单：目标路径 + 下载 URL + sha256 + size | 技能需要精确落盘、逐文件校验、可审计 |
| 安装走 `plugin_manager` / pnpm | 插件自己的 Host 安装器：下载 → 校验 → 临时目录 → 原子 rename | 技能不是 bundle；`plugin_manager` 只装 bundle |
| 详情文档从 npm/Git 读 README | 市场描述 + 可选 `readme`/文档 URL（v2） | 不引入 npm CDN/git clone 复杂度 |
| 安装状态来自 `pluginManager.listBundles` | 安装状态来自插件自己的 sidecar + 扫描根 | 技能没有全局安装数据库 |
| 版本可并存（不同 bundle 版本） | v1 单版本覆盖（可备份），手动更新 | 技能目录同名只能存在一份 |
| 索引 128 MiB / 2 万条 | 建议 ≤ 5 MiB / ≤ 5000 条 | 技能索引是纯文本元数据，没必要那么大；读取在主线程解析 |

---

## 4. 技能市场索引必须解决的 10 个问题

1. **不可变性**：版本必须 pin 到不可变文件 URL（GitHub raw 的 commit URL），同一版本不得改内容；校验器只能校验 sha256 在文档内自洽，无法证明源没变 → 靠**发布流程 + commit pin + version 不可变约定**。
2. **文件清单**：技能是目录（`SKILL.md` + `references/`/`scripts/`/`assets/`），索引必须列出每个文件的**目标相对路径**、**下载 URL**、**sha256**、**size**；安装器据此逐文件下载校验。
3. **布局约束**：`SKILL.md` 必须在安装目录根；资源路径必须相对、无 `..`、无隐藏段、无保留名；安装器统一写 `<root>/<name>/`。
4. **名称一致性**：索引条目 `name` 必须与 `SKILL.md` frontmatter 的 `name` 完全一致；否则安装失败（DSH 的 catalog 用的是 frontmatter name）。
5. **frontmatter 校验**：安装前必须按 provider 规则校验（首行 `---`、YAML 对象、kebab name、description、严格布尔、拒绝旧键），避免「装上了但静默不生效」。
6. **大小与数量上限**：单文件、单技能总大小、文件数、索引大小都必须有上限，防止恶意/失控源。
7. **GitHub 支持**：GitHub 是「托管 + 不可变 raw URL」的组合，天然适合；但没有索引文件的仓库不是「源」。v1 规定：**仓库根提供索引文件才成为源**；「无索引仓库直接安装」等规范评审后再定。
8. **私有源**：v1 只支持匿名可读的 https 源；私有仓库/token 放 v2（需要 credentials 与凭据边界设计）。
9. **更新检查**：**自动检查**（启动后 + 周期 + 页面补检）并只标记 `可更新`；**更新动作必须用户手动触发并确认**；不自动下载、不自动安装。
10. **多源与命名冲突**：多个源可能提供同名技能；v1 不自动合并，UI 按源展示，安装记录绑定 `sourceId + name + version`；安装时若目标位置已有同名目录则进入冲突流程。

---

## 5. GitHub 作为技能市场源

### 5.1 推荐形态

```
owner/skill-repo
├── index.json                 ← 技能市场索引（本规范）
├── skills/
│   ├── code-review/
│   │   ├── SKILL.md
│   │   └── references/checklist.md
│   └── release-notes/
│       └── SKILL.md
└── .github/workflows/validate.yml   ← 发布前用规范校验器验证
```

- 索引 URL 示例：`https://raw.githubusercontent.com/owner/skill-repo/main/index.json`（分支可变，文档可变；版本条目不可变）。
- 文件 URL 必须 pin 到 commit：
  `https://raw.githubusercontent.com/owner/skill-repo/<40-hex>/skills/code-review/SKILL.md`
- 拉取索引时 **拒绝 redirect**（raw.githubusercontent.com 直接返回，不走 redirect）。
- 不调用 GitHub API：无需 token、无匿名限流问题；索引由发布者生成并提交。
- 私有仓库：v1 不支持（没有凭据注入），v2 再接 credentials。

### 5.2 无索引的 GitHub skill 库

- 这类仓库只有 `skills/<name>/SKILL.md`，没有 `index.json`。
- **v1 不作为「市场源」支持**。原因：发现技能集合需要 GitHub API tree（匿名限流、路径约定不统一、无法在仓库侧控制展示元数据/版本/校验和）。
- 规范发布并评审后，再决定是否增加「GitHub 仓库适配器」（约定路径 + API tree + 本地生成临时索引）或「单技能 raw URL 安装」。
- 本文档只定义「索引源」；GitHub 仓库若想成为源，添加 `index.json` 即可（个人开发者成本很低）。

---

## 6. 读取/安装链路（技能版）

```
用户添加源 URL
  → Host 校验 URL（规范 http(s)、无凭据/fragment、去重）
  → fetch(index.json)（拒绝 redirect、15s 超时、≤5 MiB、严格 UTF-8）
  → 校验（format/locale/schema/语义；未知字段丢弃；错误带 JSON path）
  → 缓存 10 分钟；列表/搜索/详情从缓存读
  → 用户安装 sourceId + name + version + 目标位置
  → 逐文件下载（https、拒绝 redirect、大小上限）
  → 校验 sha256 / size / 路径 / SKILL.md frontmatter / name 一致性
  → 写临时目录 → 原子 rename 到 <root>/<name>/
  → 写 sidecar（来源、版本、commit、文件清单、sha、时间）
  → 后续：自动检查（启动后/周期/页面补检）对比版本并标记可更新；用户确认后手动更新（备份 → 覆盖）
```

---

## 7. 决策记录

| # | 决策 | 理由 |
| --- | --- | --- |
| D1 | 技能索引独立于插件索引（不同 schema），但沿用 format 1 约定 | 安装链路不同；约定复用降低开发者学习成本 |
| D2 | 版本条目用 `files[]`（path/url/sha256/size），不用 npm/git source | 技能是文件目录；逐文件校验可审计 |
| D3 | 索引 URL 允许 http(s)，但生产推荐 https；拒绝 redirect | 与 DSH 插件市场一致；本机/内网可用 |
| D4 | 文件 URL 必须 https 或与索引同源；禁止凭据/query/fragment | 不可变、可缓存、防注入 |
| D5 | 索引正文上限 5 MiB、技能数 ≤ 5000、版本数 ≤ 100/技能 | 主线程解析成本可控 |
| D6 | 单文件 ≤ 4 MiB、单版本总大小 ≤ 20 MiB、文件数 ≤ 200、`SKILL.md` ≤ 256 KiB | 防恶意/失控 |
| D7 | v1 只支持匿名公开源；private/token 放 v2 | 凭据边界复杂，先验证生态 |
| D8 | v1 无索引 GitHub 仓库不作为源；先出规范再评估 | 避免 API 限流/路径约定不确定 |
| D9 | 自动检查更新（启动后 + 周期 + 页面补检），只提示；更新动作由用户手动触发；不自动下载/安装 | 产品决定（用户已确认） |
| D10 | 安装默认落点 `~/.dsh/skills`（用户已确认） | DSH 专属，避免污染跨工具共享目录 |
| D11 | 安装元数据放插件自己的状态文件（sidecar，profile 级） | 不依赖 DSH 的 bundle 安装数据库；技能无原生安装记录 |
| D12 | 索引校验器由本插件自带（纯 JS，不依赖 npm 包） | Host 半边只能 import `node:` 与相对文件 |

---

## 8. 与现有文档的关系

- 产品范围/交互/文案/视觉：`docs/plugins/skill-manager/product/skills-manager-prd.md`。
- 本调研 → 规范：`docs/plugins/skill-manager/product/skill-market-index-spec.md`（含 JSON Schema 与示例）。
- 规范 → 实现：`docs/plugins/skill-manager/design/skill-market-index-implementation.md`（模块、路由、安装器、测试、里程碑）。

## 9. 证据索引

- 校验器：`<asar>/dsh/node_modules/@deepseek-ai/dsh-plugin-market-index/lib/index.js`（320 行；`parseMarketIndex` 在 `:280`，`localizedText` 在 `:51`，`httpUrl` 在 `:134`，`icon` 在 `:209`，`marketVersion` 在 `:226`，`versions` 在 `:239`）。
- 读取器：`<asar>/dsh/node_modules/@deepseek-ai/dsh-plugin-market/README.md`（配置默认值、拒绝 redirect、Worker 校验、缓存、查询、兼容性、错误码）。
- Discover UI：`<asar>/dsh/node_modules/@deepseek-ai/dsh-client-ui-plugin-market/README.md`（源管理、卡片、安装确认、状态展示、更新提示）。
- 本仓库：`index.json`、`market.json`、`scripts/release.mjs`、`scripts/validate-index.mjs`、`scripts/lib/index-doc.mjs`（索引生成/校验的实做）。
- 技能侧：`docs/plugins/skill-manager/research/skill-subsystem.md`（发现/校验/scope/rank/失败静默）、`docs/plugins/skill-manager/research/plugin-ui-architecture.md`（插件 UI 形态）。