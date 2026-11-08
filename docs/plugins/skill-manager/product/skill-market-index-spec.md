# 技能市场索引规范 v1.0（Skill Market Index Format 1）

| 项 | 值 |
| --- | --- |
| 规范版本 | `format: 1` |
| 文档状态 | Draft for review（评审后冻结为 v1.0） |
| 适用对象 | 技能市场索引发布者（个人开发者/组织）、DSH Skills 管理模块的读取器与安装器 |
| 规范文件 | 本文件 + [`skill-market-index.schema.json`](skill-market-index.schema.json)（JSON Schema 2020-12）+ [`examples/skill-market-index.example.json`](examples/skill-market-index.example.json) |
| 调研依据 | [skill-market-index-research.md](../research/skill-market-index-research.md) |
| 兼容基线 | DSH `>=0.2.1-rc.5 <0.3.0`；索引格式与 DSH 插件市场 index format 1 同源约定，但安装链路独立 |

---

## 1. 目标与非目标

### 1.1 目标

让任何个人开发者可以：

1. 用**一个 JSON 文件**描述自己的技能集合（技能、版本、文件、校验和、兼容性、展示元数据）。
2. 把该文件托管在任意**匿名可读的 https 静态地址**（GitHub raw / Pages / 对象存储 / 自建静态站）。
3. 让 DSH Skills 管理模块把该地址添加为「市场源」，浏览、搜索、安装、检查更新。
4. 用规范自带的 JSON Schema 与校验器在发布前自检，避免格式错误。

### 1.2 非目标（v1）

- 不定义评分、评论、下载量、付费、账号体系。
- 不定义技能执行/运行时依赖（技能脚本由 Agent 在会话中按需读取执行）。
- 不定义私有源/凭据/token（v2）。
- 不定义签名（v2；v1 依赖 https + sha256 + 发布者信誉）。
- 不定义技能包依赖（v2）。
- 不要求发布者使用特定仓库结构（只要求能按本规范生成索引与文件 URL）。

---

## 2. 术语

| 术语 | 含义 |
| --- | --- |
| 索引源（source） | 一个可被 DSH 读取的索引文档 URL；用户添加后出现在「市场源」列表 |
| 索引文档（index） | 符合本规范的 JSON 文档，描述一个技能集合 |
| 技能条目（skill） | 索引中的一个技能，`name` 全局唯一（同一索引内） |
| 版本条目（version） | 一个技能的某个精确 SemVer 版本，含文件清单 |
| 文件清单（files） | 该版本安装所需的全部文件：目标相对路径、下载 URL、sha256、size |
| 发布者（publisher） | 生成并托管索引与技能文件的个人/组织 |
| 读取器（reader） | DSH 侧拉取、校验、搜索索引的 Host 模块 |
| 安装器（installer） | DSH 侧把版本文件写入某个扫描根的 Host 模块 |
| sidecar | 安装记录（来源、版本、commit、文件 sha256、安装时间），用于更新检查与卸载 |

---

## 3. 设计原则

1. **索引是声明，文件是事实。** 索引里的 name/version/描述是发布者的声明；安装器以 `SKILL.md` 的 frontmatter 与文件 sha256 为准，二者不一致则拒绝安装。
2. **版本不可变。** 同一个 `name@version` 的文件清单与 sha256 发布后不得改变；要改内容必须升版本。
3. **无包管理器。** 不依赖 npm/git/pnpm/zip；安装器只做「逐文件下载 + 校验 + 原子写」。
4. **可离线校验。** 索引文档自身携带每个文件的大小与 sha256，读取器/安装器不需要额外清单。
5. **失败可诊断。** 校验错误带 JSON 路径；安装失败带文件与原因；不允许静默半安装。
6. **最小信任。** 只读用户配置的源；拒绝 redirect；https / 同源；路径穿越防护；大小上限。
7. **与 DSH 插件索引同构。** 复用 `format`/本地化/元数据/图标/SemVer/`engines.dsh`/版本数组/缓存策略，降低学习成本。

---

## 4. 文件与托管

### 4.1 索引文件

- 文件名建议 `index.json`（内容类型 `application/json; charset=utf-8`；也可用 `.well-known/skill-market.json`，但必须直接返回 JSON）。
- 必须通过 **GET** 匿名可读，**不得要求认证**，**不得返回 redirect**（301/302/307/308 视为失败）。
- 推荐 https；允许 http（仅限本机/内网开发；生产必须 https）。
- 不得在 URL 中使用凭据（`user:pass@`）或 fragment（`#`）。
- 建议响应头带 `cache-control`（如 `public, max-age=300`）；读取器自身另有 10 分钟缓存。

### 4.2 技能文件

- 每个文件必须是一个**可直接下载的 URL**，返回文件字节（不是 HTML 页面）。
- **文件 URL 必须 pin 到不可变内容**：GitHub raw 使用 `https://raw.githubusercontent.com/<owner>/<repo>/<40-hex-commit>/<path>`；其他静态托管使用内容寻址/版本化路径。
- 文件 URL 不得含凭据、query、fragment；不得依赖 redirect（CDN 直出）。
- 推荐单文件内容类型为 `text/markdown` / `text/plain` / 二进制资源原类型；读取器不信任 Content-Type，只按字节校验。

### 4.3 托管示例

| 托管 | 索引 URL | 文件 URL |
| --- | --- | --- |
| GitHub raw | `https://raw.githubusercontent.com/owner/repo/main/index.json` | `https://raw.githubusercontent.com/owner/repo/<commit>/skills/<name>/...` |
| GitHub Pages | `https://owner.github.io/repo/index.json` | 同源或 CDN 的版本化路径 |
| 对象存储 | `https://cdn.example.com/skills/index.json` | `https://cdn.example.com/skills/<name>/<version>/...` |
| 本地开发 | `http://127.0.0.1:8080/index.json` | `http://127.0.0.1:8080/...`（仅开发） |

> 生产环境**不要**把索引 URL 指向 `github.com/.../blob/...`（返回 HTML，不是 raw JSON）。

---

## 5. 索引文档结构

```json
{
  "$schema": "https://raw.githubusercontent.com/xiechenghua01/dsh-plugins/main/docs/plugins/skill-manager/product/skill-market-index.schema.json",
  "format": 1,
  "title": { "en": "Acme Skills", "zh": "Acme 技能库" },
  "description": { "en": "...", "zh": "..." },
  "homepage": "https://github.com/acme/skills",
  "repository": "https://github.com/acme/skills",
  "author": "acme",
  "icon": "https://raw.githubusercontent.com/acme/skills/<commit>/icon.png",
  "metadata": {
    "categories": { "coding": { "title": { "en": "Coding", "zh": "编码" } } },
    "labels": { "review": { "title": { "en": "Review", "zh": "审查" } } },
    "sortKeys": { "stars": { "title": { "en": "Stars", "zh": "星标" }, "order": "desc" } }
  },
  "skills": [ /* 见 §6 */ ]
}
```

### 5.1 顶层字段

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `$schema` | string | 否 | 仅供编辑器/校验器识别；读取器忽略 |
| `format` | integer | 是 | 必须为 `1` |
| `title` | LocalizedText | 是 | 索引展示名；必须含 `en`（对象形式时） |
| `description` | LocalizedText | 否 | 索引描述 |
| `homepage` | URL | 否 | 索引主页；http(s)、绝对 URL，可带 query/fragment |
| `repository` | URL | 否 | 仓库地址；http(s)、绝对 URL，无凭据 |
| `author` | string | 否 | 发布者/组织名，1–120 字符 |
| `icon` | Icon | 否 | 索引图标，规则见 §10 |
| `metadata` | Metadata | 否 | 分类/标签/排序键声明，见 §5.2 |
| `skills` | Skill[] | 是 | 技能数组；允许为空（空源），最多 5000 条 |

### 5.2 Metadata（分类/标签/排序键）

```json
{
  "categories": { "<id>": { "title": LocalizedText } },
  "labels":     { "<id>": { "title": LocalizedText } },
  "sortKeys":   { "<id>": { "title": LocalizedText, "order": "asc" | "desc" } }
}
```

- 所有 `id` 非空、不含空白；建议 `[a-z0-9][a-z0-9-]*`（规范建议，不强制）。
- 技能条目只能引用**已声明**的 `category` / `labels` / `sortKeys` id；引用未声明 id 视为校验错误。
- 同一条目的 `labels` 不得重复。
- `sortKeys` 的值必须是有限数字。

---

## 6. 技能条目（`skills[]`）

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `name` | string | 是 | kebab-case：`^[a-z0-9]+(?:-[a-z0-9]+)*$`，1–64 字符；同一索引内唯一；必须与 `SKILL.md` frontmatter 的 `name` 完全一致 |
| `title` | LocalizedText | 否 | 市场展示名；缺省回退 `name` |
| `description` | LocalizedText | 是 | 市场展示描述；非空，用于列表卡片/详情摘要（不设长度上限） |
| `author` | string | 否 | 技能作者，1–120 字符 |
| `license` | string | 否 | SPDX 表达式或简短许可名，≤64 字符 |
| `homepage` | URL | 否 | 技能主页/文档地址 |
| `repository` | URL | 否 | 技能源码仓库 |
| `icon` | Icon | 否 | 技能图标，规则见 §10 |
| `metadata` | SkillMetadata | 否 | 分类/关键词/标签/排序键，见 §6.1 |
| `versions` | Version[] | 是 | 非空；同一技能内 `version` 唯一；按 SemVer 降序（读取器会排序） |
| `deprecated` | boolean | 否 | v1 保留；为 `true` 时 UI 显示「已弃用」但仍可安装 |

### 6.1 SkillMetadata

```json
{
  "category": "coding",
  "keywords": ["review", "diff"],
  "labels": ["review", "official"],
  "sortKeys": { "stars": 128 }
}
```

- `category` 必须是索引 `metadata.categories` 中声明的 id。
- `keywords` 是自由字符串数组（≤20 个，每个 1–64 字符）。
- `labels` 必须是声明的 id，且不重复。
- `sortKeys` 的键必须是声明的 id，值为有限数字。

### 6.2 技能名与 frontmatter

- `SKILL.md` 必须符合 DSH 的 frontmatter 规则：首行 `---`、YAML 对象、`name` 为 kebab-case、`description` 非空、布尔严格、拒绝旧键。
- 安装器会重新解析 `SKILL.md`，并校验 **frontmatter `name` === 索引 `name`**；不一致则安装失败。
- 索引的 `title` / `description` 只用于市场展示，不写入/覆盖 `SKILL.md`（技能正文与 frontmatter 是发布者的文件事实）。
- 建议索引 `description` 与 `SKILL.md` frontmatter `description` 语义一致；不强制逐字相同。

---

## 7. 版本条目（`versions[]`）

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `version` | string | 是 | 精确 SemVer 2.0.0（`1.2.3`、`1.2.3-rc.1`、`1.2.3+build`）；同一技能内唯一 |
| `publishTimestamp` | integer | 是 | Unix 秒，整数，`[0, 10^11)` |
| `files` | File[] | 是 | 1–200 个文件；必须包含根级 `SKILL.md`；规则见 §8 |
| `engines` | object | 否 | `{ "dsh": "<SemVer range>" }` |
| `source` | GitSource | 否 | 仅用于展示/溯源，不参与安装；规则同 DSH 插件索引的 git source |
| `yanked` | boolean | 否 | 默认 `false`；为 `true` 时读取器不把它作为默认/推荐版本，UI 标注「已撤回」；安装器允许用户显式选择安装？——v1 **不允许**安装 yanked 版本 |
| `readme` | URL | 否 | v1 保留字段，读取器暂不读取；为未来详情文档预留 |

### 7.1 `engines.dsh`

- SemVer range（如 `>=0.2.1-rc.5 <0.3.0`），不得以 `workspace:` 开头。
- 读取器按当前 DSH 版本计算兼容性；无 `engines` 视为兼容。
- 兼容性只在「默认版本选择」和「安装按钮是否可用」中使用；用户可选择其他兼容版本（v1 UI 可只展示默认版本，规范保留多版本能力）。

### 7.2 `source`（可选，仅展示/溯源）

```json
{
  "type": "git",
  "url": "https://github.com/acme/skills",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "path": "skills/code-review"
}
```

- `url`：规范 https URL、至少两段路径、不能是 tarball、无凭据/query/fragment。
- `commit`：40 位小写 hex。
- `path`：相对目录，段只允许 `A-Za-z0-9._@+-`，禁止 `.`/`..`。
- 安装器**不使用**此字段下载；文件下载只用 `files[].url`。

### 7.3 版本不可变性

- 同一 `name@version` 发布后，`files` 的 `path`/`url`/`sha256`/`size` 不得改变。
- 校验器无法证明远端文件未变；发布流程必须保证：
  - 文件 URL pin 到 commit/内容地址；
  - 版本号只在内容变化时递增；
  - 已发布版本的 sha256 不变。
- 读取器可缓存文档；`refresh` 重新拉取。若发现同一版本 sha256 改变，安装器拒绝安装并报 `E_VERSION_MUTATED`（防御性检查）。

---

## 8. 文件清单与布局（`files[]`）

### 8.1 File 字段

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `path` | string | 是 | **安装后的目标相对路径**（POSIX 风格，`/` 分隔）；1–200 字符 |
| `url` | URL | 是 | 下载地址；https 或与索引 URL 同源；无凭据/query/fragment；≤2048 字符 |
| `sha256` | string | 是 | 文件字节的 SHA-256，64 位小写 hex |
| `size` | integer | 是 | 字节数，`1..4194304`（4 MiB） |

- `path` 规则：
  - 不得以 `/` 开头，不得以 `/` 结尾，不得含空段。
  - 每段必须匹配 `^[A-Za-z0-9_@+-][A-Za-z0-9._@+-]*$`（段首不能是 `.`，因此 `..`/隐藏文件被排除）。
  - 不得含 `\`、`:`（Windows 盘符/ADS）、`?`、`#`、`%`。
  - 保留名（不允许）：`.disabled`、`.skill-manager`、`.git`、`node_modules`（任何段等于这些值）。
  - 必须且只能有一个根级 `SKILL.md`（`path === "SKILL.md"`）。
  - 资源可嵌套，如 `references/checklist.md`、`assets/diagram.png`、`scripts/check.sh`。
  - 同一版本内 `path` 不得重复。
- `url` 规则：
  - 绝对 URL 或相对索引 URL 的引用；解析后必须为 https 或与索引同源。
  - 不得含 credentials、query、fragment（保证可缓存/不可变）。
- 安装器会忽略文件权限位；不执行任何文件。

### 8.2 安装后的布局

```
<root>/<name>/
├── SKILL.md                 ← 必须存在（来自 files 中 path = "SKILL.md"）
├── references/…
├── scripts/…
└── assets/…
```

- 安装器统一创建 `<root>/<name>/`，按 `files[].path` 写入；不保留源仓库的其它文件。
- 目录名使用索引 `name`；不保留索引条目的 `title` 等展示字段。

### 8.3 大小与数量上限

| 项 | 上限 |
| --- | --- |
| 索引文档 | 5 MiB |
| 技能数/索引 | 5000 |
| 版本数/技能 | 100 |
| 文件数/版本 | 200 |
| 单文件 | 4 MiB |
| `SKILL.md` | 256 KiB |
| 单版本文件总大小 | 20 MiB |
| `path` 长度 | 200 |
| URL 长度 | 2048 |
| 本地化语言数/文本 | 20 |

超限视为校验错误（索引级）或安装失败（版本级）。

---

## 9. 本地化（LocalizedText）

支持两种形式：

```json
"title": "Code Review"
```

```json
"title": { "en": "Code Review", "zh": "代码审查", "zh-cn": "代码审查（简体）" }
```

- 字符串：直接作为默认文案（读取器按当前语言找不到时使用）。
- 对象：键必须是语言 id `^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$`；**必须包含 `en`**；值是非空字符串。
- 读取器按当前 UI 语言选择：精确匹配 → 主语言匹配（如 `zh` 匹配 `zh-cn`）→ `en` → 第一条。
- 未知语言键允许；未知字段丢弃。

---

## 10. 图标（Icon）

两种形式，规则与 DSH 插件索引一致：

1. **内联 data URL**：`data:image/(svg+xml|png|jpeg|webp);base64,...`。
   - 解码后 ≤ 32 KiB；base64 合法。
2. **URL 引用**：绝对 URL 或相对索引 URL 的引用。
   - 解析后必须是 https，或与索引 URL 同源。
   - 建议 128×128 或 256×256；读取器不校验尺寸。
   - 图标 URL 可以带 query/fragment（与文件 URL 不同，图标不参与安装校验）。

读取器加载失败时回退默认图形；图标请求由浏览器发出（会暴露 IP 给图标托管方），读取器不代理。

---

## 11. 版本选择与兼容性

### 11.1 默认版本（与 DSH 插件市场一致）

- 候选 = 未被 `yanked`、且 `engines.dsh` 与当前 DSH 兼容的版本。
- 默认版本 = 候选中**最高 SemVer 的正式版**（无 prerelease 标签）；若没有正式版，取**最高兼容的 prerelease**。
- 无兼容版本 → 技能不可安装；UI 显示「没有兼容当前 DSH 的版本」。
- 已安装版本低于默认版本 → `可更新`（仅提示，手动更新）。

### 11.2 版本列表

- 读取器按 SemVer 降序返回；UI 展示版本、发布时间、兼容性、是否 yanked、是否已安装。
- v1 UI 默认只展示/安装默认版本；规范保留「用户选择指定版本」能力（v2 展开）。

---

## 12. 读取契约（客户端行为）

### 12.1 源配置

- 源以有序列表保存；每项：`id`、`url`、可选 `name`、`enabled`、`addedAt`。
- URL 校验：绝对 http(s)、无凭据、无 fragment；重复 URL 只保留一次。
- 读取器**只读已配置的 URL**，绝不拉取任意地址。
- 源可启用/停用；停用不删除安装记录。

### 12.2 拉取

| 项 | 值 |
| --- | --- |
| 方法 | 进程 `fetch`（走系统代理） |
| Redirect | **拒绝**；3xx 视为失败 |
| 超时 | 15s（含正文） |
| 正文上限 | 5 MiB |
| 编码 | 严格 UTF-8；非法字节 → 失败 |
| 解析 | JSON.parse；在 Worker 或主线程（有上限保护），不得阻塞 UI 超过可接受时间 |
| 缓存 | 成功文档 10 分钟；`refresh` 绕过；并发同 URL 合并为一次请求 |
| 失败 | 记录错误，保留上次成功缓存并标记「已过期」 |
| 分页一致性 | 成功拉取产生 `fetchedAt`；后续分页可携带 `fetchedAt` 使用同一份文档 |

### 12.3 查询

`search(sourceId, query)`；`query` 字段：

| 字段 | 说明 |
| --- | --- |
| `text` | 模糊文本；匹配 name / author / keywords / 各语言 title/description/category/label 标题；大小写与 NFKC 归一；无字母数字时选全部 |
| `category` | 声明的分类 id |
| `labels` | 必须全部匹配的标签 id 数组 |
| `sort` | `index` / `relevance` / `published` / 声明 sortKey（带方向） |
| `offset`, `limit` | 分页；`limit` 1–100 |
| `refresh` | 重新拉取 |
| `fetchedAt` | 固定使用某次成功文档（在其缓存期内） |

- 返回：索引标题/描述/声明、`fetchedAt`、`total`、`nextOffset`、技能分页条目（含 `defaultVersion`、`installation`、各版本 `compatibility`）。
- 错误：`invalid-query`、`invalid-index-url`、`unknown-index`、`fetch-failed`、`invalid-index`（带 JSON path）。

### 12.4 安装状态

| 状态 | 含义 |
| --- | --- |
| `not-installed` | 未安装 |
| `installed` | 已安装且版本等于默认版本 |
| `update-available` | 已安装且默认版本更高（**仅提示，不自动更新**） |
| `different-version` | 已安装但版本不同（更低/未知/更高） |
| `untracked` | 目标位置存在同名目录，但没有 sidecar 记录（可能是手工放置/其他工具安装） |
| `incompatible` | 无兼容版本 |

### 12.5 更新检查（自动检查、手动更新）

- **自动检查**：
  - 读取器/客户端 SHOULD 在启动后（建议延迟约 15s）做一次检查，之后按固定周期（建议 6 小时）重复；用户打开市场/已安装页且距上次检查超过 30 分钟时可补检一次；同一时刻只允许一个检查任务。
  - 条件：至少一个启用的源 **且** 至少一条带 `sourceId` 的安装记录；否则跳过。
  - 行为：刷新过期索引（每源超时 15s；失败记录到源状态，不弹错误）；对比安装记录 `version` 与该源默认/最高兼容版本；只读，不下载文件、不修改技能目录。
  - 结果：标记 `update-available`；可选计算 `local-modified`（安装后文件 sha 与记录不一致）。
  - 失败退避：单源失败后 30 分钟内不重复自动检查该源；保留上次成功结果并标 `stale`。
- **手动更新**：
  - 只有用户显式点「更新」并确认后，才执行 §13 的下载/校验/覆盖流程。
  - 手动「检查更新」始终可用（立即刷新索引并重算状态）。
- **禁止**自动下载、自动安装、自动改写技能文件。
- 更新前展示：当前版本 → 新版本、来源、本地修改警告（若安装后文件 sha 与记录不一致）。

---

## 13. 安装契约

### 13.1 解析

1. 校验源已配置、技能存在、版本存在。
2. 拒绝 `yanked` 版本；拒绝与 DSH 不兼容的版本（除非用户显式选择且产品允许，v1 不允许）。
3. 校验目标位置：必须是已知扫描根（`project-dsh` / `project-agents` / `custom` / `user-dsh` / `user-agents`），可写，且不是内置/预设只读位置。
4. 若目标位置已存在同名目录 → 冲突：`覆盖 / 跳过 / 重命名 / 换位置`。

### 13.2 下载与校验

1. 创建临时目录 `<root>/.skill-manager-tmp/<name>-<random>/`（或 profile 级临时目录，保证同卷 rename）。
2. 逐文件下载：拒绝 redirect；校验 `size`（实际字节数必须等于声明值且 ≤4 MiB）；计算 sha256 必须等于声明值；单版本总大小 ≤20 MiB。
3. 校验路径：所有 `files[].path` 必须通过 §8 规则；禁止路径穿越/隐藏段/保留名。
4. 校验 `SKILL.md`：
   - 存在且为根级；
   - frontmatter 合法（与 DSH provider 规则一致）；
   - frontmatter `name` 等于索引 `name`；
   - `description` 非空；
   - 文件大小 ≤256 KiB。
5. 校验 `files[].path` 无重复；`SKILL.md` 只有一个。

### 13.3 原子落盘

- 全部校验通过后，把临时目录 rename 到 `<root>/<name>`（同一文件系统）。
- 若目标已存在且用户选择覆盖：先把旧目录 rename 到 `.skill-manager/backup/<name>-<timestamp>/`，再写入；失败则回滚旧目录。
- 失败：删除临时目录；不留下半安装；不改动现有目录。
- 成功后写 sidecar（见 §13.5）。

### 13.4 安装记录（sidecar）

- 位置：`~/.dsh/skills-manager/installed.json`（profile 级，0600；不是技能扫描根）。
- 记录：
  ```json
  {
    "location": "user-dsh",
    "rootPath": "~/.dsh/skills",
    "name": "code-review",
    "version": "1.2.0",
    "sourceId": "acme",
    "sourceUrl": "https://raw.githubusercontent.com/acme/skills/main/index.json",
    "commit": "0123456789abcdef0123456789abcdef01234567",
    "files": [{ "path": "SKILL.md", "sha256": "...", "size": 1234 }],
    "installedAt": 1762300000,
    "localModified": false
  }
  ```
- 同名技能在同一位置只能有一条记录；多个位置可各有一条。
- 项目技能被复制/提交到其他机器时，sidecar 不随行 → 目标机器视为 `untracked`（可手动导入/安装）。
- sidecar 损坏/缺失时：不阻塞已安装扫描；更新检查显示 `untracked`。

### 13.5 更新

- 只手动触发；不自动。
- 对比安装记录的 `version` 与索引默认/最高兼容版本：
  - 更高 → `update-available`。
  - 相同但文件 sha 不一致 → `local-modified`（UI 提示，更新会覆盖）。
  - 更低/未知 → `different-version`。
- 更新 = 备份旧目录 → 安装新版本 → 原子替换 → 更新 sidecar；失败回滚。
- 备份保留最近 3 份（可配置），不无限增长。

### 13.6 卸载

- 删除 `<root>/<name>/`（或平铺文件，如果技能以 `<name>.md` 安装——v1 市场安装统一为目录型）。
- 删除 sidecar 记录。
- 可选「保留备份」副本到 `.skill-manager/backup/`。
- 不删除 `.disabled/` 中的副本（若用户先停用再卸载，卸载应同时清理停用副本？——v1：卸载时提示「该技能处于停用状态」，确认后一并删除停用副本）。

---

## 14. 安全与信任

| 威胁 | 缓解 |
| --- | --- |
| 恶意索引 / 恶意文件 | 只读用户配置的源；https/同源；拒绝 redirect；逐文件 sha256；大小上限；路径穿越防护；frontmatter 校验 |
| 版本内容被替换 | 文件 URL pin 到 commit/内容地址；sha256；读取器防御性检查同版本 sha 变化 |
| 索引伪造 | v1 无签名；UI 显示源 URL/作者/信任提示；用户自行判断；v2 可加签名 |
| 隐私 | 浏览器加载远程图标会暴露 IP；读取器不代理图标；可在 UI 说明 |
| 路径攻击 | 目标路径必须在根内；禁止隐藏段/保留名/`..`/绝对路径；安装后 `realpath` 校验 |
| 半安装 | 临时目录 + 原子 rename + 失败回滚 |
| DOS | 索引 5 MiB/5000 条上限；文件 4 MiB/20 MiB 上限；超时；并发合并 |
| 执行风险 | 安装器不执行任何脚本；技能脚本只在 Agent 会话中由模型按需读取/执行（DSH 既有边界） |

---

## 15. 校验规则（一致性清单）

读取器/校验器必须实现（R1–R30）：

| # | 规则 |
| --- | --- |
| R1 | 顶层是对象；`format === 1` |
| R2 | `title` 必填且合法 LocalizedText |
| R3 | `description` 可选且合法 LocalizedText |
| R4 | `skills` 是数组；长度 ≤ 5000 |
| R5 | 技能 `name` 匹配 kebab-case、长度 1–64、索引内唯一 |
| R6 | 技能 `description` 必填且合法 LocalizedText（非空、含 `en`；不限制单语言长度） |
| R7 | 技能 `title` 可选且合法 |
| R8 | `versions` 非空、≤100；`version` 精确 SemVer、唯一 |
| R9 | `publishTimestamp` 整数且 `[0,1e11)` |
| R10 | `engines.dsh` 若存在必须是合法 SemVer range、不以 `workspace:` 开头 |
| R11 | `files` 非空、≤200；每项 `path`/`url`/`sha256`/`size` 合法 |
| R12 | `files` 必须含且只含一个根级 `SKILL.md` |
| R13 | `files[].path` 唯一；≤200 字符；无隐藏段/`..`/绝对路径/保留名 |
| R14 | `files[].url` 解析后 https 或同源；无凭据/query/fragment；≤2048 |
| R15 | `sha256` 为 64 位小写 hex |
| R16 | `size` 整数 1–4 MiB；单版本总大小 ≤20 MiB；`SKILL.md` ≤256 KiB |
| R17 | `metadata` 声明合法；技能引用 `category`/`labels`/`sortKeys` 必须已声明 |
| R18 | `labels` 不重复；`sortKeys` 值为有限数字 |
| R19 | `icon` 合法（data URL ≤32 KiB 解码，或 https/同源 URL） |
| R20 | 顶层 `homepage`/`repository` 合法 http(s) URL、无凭据 |
| R21 | `source`（可选）为合法 git source（url/commit/path 规则） |
| R22 | `yanked` 若存在必须是 boolean |
| R23 | 未知字段忽略（不报错），但不得依赖 |
| R24 | 索引 URL 合法：绝对 http(s)、无凭据/fragment；读取时不跟随 redirect |
| R25 | 拉取正文 ≤5 MiB、严格 UTF-8、JSON 可解析 |
| R26 | 安装前重新校验 `SKILL.md` frontmatter，且 `name` 与索引一致 |
| R27 | 同版本再次安装时，若文件 sha 与记录不一致 → 拒绝（防版本漂移） |
| R28 | 路径必须落在允许根内；`realpath` 校验；禁止符号链接逃逸 |
| R29 | 安装失败必须清理临时目录，不产生半安装 |
| R30 | 不自动更新；更新必须用户显式触发并确认 |

---

## 16. 错误码

| code | 场景 | UI 建议 |
| --- | --- | --- |
| `E_SOURCE_URL_INVALID` | 源 URL 不规范/重复 | 输入框错误 + 原因 |
| `E_SOURCE_UNREACHABLE` | 网络/超时/redirect | 「无法连接市场源」+ 重试 |
| `E_SOURCE_HTTP` | 非 200 | 显示状态码 |
| `E_SOURCE_TOO_LARGE` | 正文 > 5 MiB | 源详情显示限制 |
| `E_INDEX_INVALID` | 格式/语义错误（带 path） | 「索引格式不正确：<path> <reason>」 |
| `E_INDEX_VERSION` | `format` 不是 1 | 「不支持的索引版本」 |
| `E_SKILL_UNKNOWN` | 源里没有该技能 | 「技能不存在或已下架」 |
| `E_VERSION_UNKNOWN` | 版本不存在 | 「版本不存在」 |
| `E_VERSION_YANKED` | 版本被撤回 | 「版本已撤回」 |
| `E_NO_COMPATIBLE` | 无兼容版本 | 「没有兼容当前 DSH 的版本」 |
| `E_VERSION_MUTATED` | 同版本 sha 变化 | 「版本内容与记录不一致，已阻止安装」 |
| `E_FILE_DOWNLOAD` | 文件下载失败 | 指出文件与重试 |
| `E_FILE_SIZE` | 实际大小不符 | 指出文件 |
| `E_FILE_CHECKSUM` | sha256 不符 | 指出文件 |
| `E_PATH_INVALID` | 文件路径非法 | 指出文件/路径 |
| `E_FRONTMATTER` | SKILL.md 不合法 | 「技能格式不正确：<reason>」 |
| `E_NAME_MISMATCH` | 索引 name 与 frontmatter 不一致 | 明确两者 |
| `E_TARGET_READONLY` | 目标位置不可写 | 换位置 |
| `E_NAME_TAKEN` | 目标位置已有同名 | 冲突处理 |
| `E_CONFLICT` | 覆盖/跳过/重命名未决 | 冲突模态 |
| `E_NOT_ENOUGH_SPACE` | 磁盘不足 | 建议换位置/清理 |
| `E_CANCELED` | 用户取消 | 保持原状 |
| `E_UNTRACKED` | 已存在但无安装记录 | 提供「接管/覆盖/跳过」 |
| `E_STATE_CORRUPT` | sidecar 损坏 | 备份并重建，不阻塞 |

---

## 17. 发布者工作流（推荐）

### 17.1 仓库布局

```
skill-repo/
├── index.json                 # 本规范索引
├── skills/
│   └── <name>/
│       ├── SKILL.md
│       └── references/…
└── .github/workflows/validate.yml
```

### 17.2 发布（两阶段，索引 pin 到 commit）

1. 修改技能文件 → 提交 → 推送。
2. 生成索引：用参考 CLI 读取 `skills/*/SKILL.md`、计算 sha256/size、生成 pin 到当前提交的 raw URL、把当前版本追加到 `index.json`。
3. 本地校验：`skill-market validate index.json --url <published-url>`。
4. 提交 `index.json` → 推送。
5. 索引 URL 保持稳定（分支 URL 可变，内容由提交控制）。

### 17.3 参考 CLI（v1 计划随实现提供）

```bash
skill-market init                       # 生成初始 index.json 骨架
skill-market build                      # 扫描 skills/*、计算 sha256/size/URL、生成版本条目
skill-market validate index.json        # 本地校验（schema + 语义 + 规则清单）
skill-market validate index.json --url https://raw.githubusercontent.com/.../main/index.json
skill-market release <name> --version 1.2.0   # 追加版本并 pin 到 HEAD（两步提交）
skill-market diff                       # 显示未发布变更
```

CLI 行为要点：

- `build` 不覆盖已发布版本的既有条目；同一版本内容变化 → 报错要求升版本。
- `release` 生成的文件 URL 固定到当前 commit（40-hex），确保不可变。
- `validate` 同时检查重名、重复版本、sha 格式、大小上限、路径规则、frontmatter 可读。
- `--json` 输出机器可读结果，便于 CI。

### 17.4 GitHub Actions（示例）

```yaml
name: validate-skill-market
on:
  pull_request:
  push:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx @xiechenghua01/skill-market-cli validate index.json --url https://raw.githubusercontent.com/${{ github.repository }}/${{ github.sha }}/index.json
```

- CI 只读校验，不需要 token。
- 发布流程建议在本地/tag 触发，生成新的 `index.json` 并提交。

### 17.5 发布者合规清单

- [ ] `format: 1`，`title` 含 `en`。
- [ ] 每个技能 `name` kebab-case、唯一、与 `SKILL.md` frontmatter 一致。
- [ ] 每个技能至少一个版本；版本 SemVer 精确且唯一。
- [ ] 每个版本 `files` 含根级 `SKILL.md`，路径无隐藏段/`..`/保留名。
- [ ] 每个文件 URL pin 到不可变内容（GitHub raw commit URL 或内容寻址）。
- [ ] `sha256`/`size` 与实际文件字节一致。
- [ ] 单文件 ≤4 MiB、单版本 ≤20 MiB、`SKILL.md` ≤256 KiB、文件数 ≤200。
- [ ] `engines.dsh`（如有）是合法 range；默认版本可被目标 DSH 安装。
- [ ] 已发布版本未改动；内容变化已升版本。
- [ ] 用官方 JSON Schema + 参考校验器验证通过。
- [ ] 索引 URL 匿名可读、https、无 redirect、无凭据/fragment。
- [ ] 图标 ≤32 KiB data URL 或 https/同源 URL。
- [ ] 未把 HTML 页面 URL 当作索引/文件 URL。

---

## 18. 兼容与演进

- `format: 1` 冻结；新增可选字段必须先进入规范修订，读取器**忽略未知字段**以保持前向兼容。
- 破坏性变更（字段含义改变、布局规则改变）→ `format: 2`；读取器同时支持 1 与 2 的过渡期。
- `$schema` 字段仅供编辑器/工具，不参与运行时校验；读取器可忽略。
- 读取器遇到未知 `format` → `E_INDEX_VERSION`，不猜测。
- 技能文件格式由 DSH 的 provider 决定；DSH 格式变化时通过 `engines.dsh` 表达兼容性。

---

## 19. 待定事项（评审时决定）

| # | 事项 | 当前倾向 |
| --- | --- | --- |
| 1 | GitHub 无 `index.json` 仓库是否作为源 | 先不做；规范落地后评估「GitHub 仓库适配器」或「单技能 URL 安装」 |
| 2 | 私有源/token | v2；需要凭据服务与安全边界 |
| 3 | 索引签名 | v2；v1 依赖 https + sha256 + 用户信任 |
| 4 | 多版本并存/回滚 | v1 单版本覆盖 + 备份；多版本 v2 |
| 5 | 技能依赖/组合 | v2 |
| 6 | 详情文档（README/截图） | v1 用 description；v2 支持 `readme` URL |
| 7 | 市场评分/下载量 | 无数据源；v2 或运营侧提供 |
| 8 | `yanked` 版本是否允许显式安装 | v1 不允许；如需回滚，v2 提供 |
| 9 | 源顺序/同名跨源冲突 | v1 按源展示、安装记录绑定 sourceId；跨源去重/合并 v2 |
| 10 | 安装记录随项目迁移 | v1 不随行（视为 untracked）；v2 可把 sidecar 放进项目 |

---

## 20. 完整示例（节选）

完整文件见 [`examples/skill-market-index.example.json`](examples/skill-market-index.example.json)。

```json
{
  "format": 1,
  "title": { "en": "Acme Skills", "zh": "Acme 技能库" },
  "description": { "en": "Curated skills for code review and release notes.", "zh": "精选代码审查与发布说明技能。" },
  "homepage": "https://github.com/acme/skills",
  "repository": "https://github.com/acme/skills",
  "author": "acme",
  "metadata": {
    "categories": { "coding": { "title": { "en": "Coding", "zh": "编码" } } },
    "labels": { "review": { "title": { "en": "Review", "zh": "审查" } } }
  },
  "skills": [
    {
      "name": "code-review",
      "title": { "en": "Code Review", "zh": "代码审查" },
      "description": { "en": "Review a diff and propose actionable changes.", "zh": "审查代码变更并给出可执行的修改建议。" },
      "author": "acme",
      "license": "MIT",
      "homepage": "https://github.com/acme/skills/tree/main/skills/code-review",
      "repository": "https://github.com/acme/skills",
      "metadata": { "category": "coding", "keywords": ["review", "diff"], "labels": ["review"] },
      "versions": [
        {
          "version": "1.2.0",
          "publishTimestamp": 1762300000,
          "engines": { "dsh": ">=0.2.1-rc.5 <0.3.0" },
          "files": [
            {
              "path": "SKILL.md",
              "url": "https://raw.githubusercontent.com/acme/skills/0123456789abcdef0123456789abcdef01234567/skills/code-review/SKILL.md",
              "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
              "size": 2314
            },
            {
              "path": "references/checklist.md",
              "url": "https://raw.githubusercontent.com/acme/skills/0123456789abcdef0123456789abcdef01234567/skills/code-review/references/checklist.md",
              "sha256": "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
              "size": 1024
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 21. 参考文件

- JSON Schema：`docs/plugins/skill-manager/product/skill-market-index.schema.json`
- 完整示例：`docs/plugins/skill-manager/product/examples/skill-market-index.example.json`
- 调研：`docs/plugins/skill-manager/research/skill-market-index-research.md`
- 实现方案：`docs/plugins/skill-manager/design/skill-market-index-implementation.md`
- 产品文档（市场 UI / 安装流程 / 更新提示）：`docs/plugins/skill-manager/product/skills-manager-prd.md`