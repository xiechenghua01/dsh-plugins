# 技能市场索引 — 实现方案（v1）

> 配套规范：[skill-market-index-spec.md](../product/skill-market-index-spec.md)
> 调研：[skill-market-index-research.md](../research/skill-market-index-research.md)
> 产品文档：[skills-manager-prd.md](../product/skills-manager-prd.md)
> 目标：在 Skills 管理插件（`@chengze/dsh-skills-manager`）里实现「市场源读取 + 搜索 + 安装 + 自动检查更新（手动更新）」，并让第三方开发者按规范发布索引。

---

## 1. 范围

### v1 实现

1. 市场源管理：添加/编辑/删除/启用停用/刷新/校验（http(s) 索引 URL）。
2. 拉取与校验：拒绝 redirect、15s 超时、≤5 MiB、严格 UTF-8、JSON、完整语义校验（R1–R23）。
3. 缓存：成功文档 10 分钟；`refresh` 绕过；并发合并；失败保留上次缓存并标过期。
4. 市场浏览：源选择、搜索、分类/标签筛选、排序、分页、详情（含版本列表）。
5. 安装：目标位置选择、冲突处理、逐文件下载、sha256/size 校验、frontmatter 校验、原子写、sidecar。
6. **自动检查更新 + 手动更新**：Host 后台按计划检查（启动后约 15s、每 6 小时、页面补检），只标记可更新并返回状态；**下载/覆盖必须用户手动点「更新」并确认**；不自动下载/安装。
7. 卸载：删目录 + sidecar；可选备份。
8. 错误码与 UI 映射（规范 §16）。
9. 参考工具：JSON Schema + 示例 + 校验器（Host 内置；外部 CLI 可选）。

### v1 不做

私有源/token、索引签名、多版本并存、技能依赖、详情 README 拉取、评分/下载量、自动更新。

---

## 2. 架构

```
Client (client.js)
  ├─ 市场 Tab：源选择/搜索/筛选/列表/详情
  ├─ 安装模态：目标位置/版本/冲突/进度
  └─ 来源 Tab：市场源管理 + 本地位置 + 预设可见性
        │  relative fetch /skills-manager/api/market/*
        ▼
Host (index.js + lib/market/*)
  ├─ routes.mjs          路由 + connection 围栏 + JSON 错误包
  ├─ state.mjs           源列表 + 安装记录（~/.dsh/skills-manager/state.json）
  ├─ fetch-index.mjs     fetch + 超时 + 大小 + 严格 UTF-8 + redirect 拒绝 + 单飞 + 缓存
  ├─ validate-index.mjs  纯函数校验器（结构 + 语义；错误带 JSON path）
  ├─ search.mjs          文本归一/评分/分页/排序
  ├─ compat.mjs          SemVer 解析/比较/range 判断（无 npm 依赖）
  ├─ install.mjs         下载/校验/frontmatter/原子写/备份/sidecar
  ├─ update.mjs          自动检查调度 + 版本对比 + 本地修改检测（只读）
  └─ scheduler.mjs       定时器（timer 服务）+ 单飞 + 退避
  └─ frontmatter.mjs     与 DSH provider 一致的 frontmatter 解析（复用已有模块）
```

约束：

- Host 只 import `node:` 内置模块与相对文件（仓库检查会强制）；不依赖 `yaml`、`semver`、`ajv`。
- Client 只 `require('react')`；不 import `@deepseek-ai/*`。
- 不调用 `plugin_manager`；不安装 bundle。
- 不使用 zip/tar；只逐文件下载。

---

## 3. 状态与持久化

### 3.1 目录

```
~/.dsh/skills-manager/
├── state.json                  # 源列表 + 安装记录（0600，原子写）
├── state.json.bak              # 最近一次成功写入的备份（损坏恢复）
├── backups/<name>-<ts>/        # 更新前备份（保留最近 3 份）
└── tmp/                        # 跨根下载暂存（可选）
```

> 若安装目标与 `tmp` 不同卷，rename 会失败；因此安装时优先在目标根内创建 `.skill-manager-tmp/<name>-<rand>/`，保证同卷原子 rename。`.skill-manager-tmp` 以 `.` 开头，provider 不会发现它。

### 3.2 `state.json`

```json
{
  "version": 1,
  "sources": [
    {
      "id": "src_01",
      "url": "https://raw.githubusercontent.com/acme/skills/main/index.json",
      "name": "Acme Skills",
      "enabled": true,
      "addedAt": 1762300000,
      "lastCheckedAt": 1762300000,
      "lastError": null
    }
  ],
  "installed": [
    {
      "location": "user-dsh",
      "rootPath": "~/.dsh/skills",
      "name": "code-review",
      "version": "1.2.0",
      "sourceId": "src_01",
      "sourceUrl": "https://raw.githubusercontent.com/acme/skills/main/index.json",
      "commit": "0123456789abcdef0123456789abcdef01234567",
      "files": [
        { "path": "SKILL.md", "sha256": "9f86...", "size": 2314 },
        { "path": "references/checklist.md", "sha256": "2c26...", "size": 1024 }
      ],
      "installedAt": 1762300000
    }
  ]
}
```

- 写入：先写 `state.json.tmp` → fsync（可选）→ rename 覆盖；成功后刷新 `.bak`。
- 损坏：JSON 解析失败时尝试 `.bak`；仍失败则备份损坏文件为 `state.corrupt-<ts>.json`，以空状态启动并在 UI 提示（不阻塞已安装扫描）。
- 并发：Host 内单写队列（Promise 链）；跨进程不保证（单实例 DSH）。

### 3.3 源 ID

- `src_` + 8 位随机/递增；URL 变更保留 id（记录跟着用户认知走）。
- 重复 URL 在添加时拒绝（规范化后比较）。

---

## 4. 拉取与缓存

### 4.1 `fetchIndex(url, { signal, refresh })`

1. URL 校验：绝对 http(s)、无凭据、无 fragment；不是已配置源则拒绝（路由层保证）。
2. 缓存命中（未过期且非 `refresh`）返回文档 + `fetchedAt`。
3. 单飞：同一 URL 的并发请求共享一个 Promise。
4. `fetch(url, { redirect: 'error', signal })`；超时 15s（`AbortSignal.timeout`）。
5. 读流：

```js
const res = await fetch(url, { redirect: 'error', signal, headers: { accept: 'application/json' } })
if (!res.ok) throw new MarketError('E_SOURCE_HTTP', { status: res.status })
const reader = res.body.getReader()
let total = 0
const chunks = []
for (;;) {
  const { done, value } = await reader.read()
  if (done) break
  total += value.byteLength
  if (total > MAX_INDEX_BYTES) { await reader.cancel(); throw new MarketError('E_SOURCE_TOO_LARGE') }
  chunks.push(value)
}
const bytes = Buffer.concat(chunks.map((c) => Buffer.from(c)))
const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)   // 严格 UTF-8
const json = JSON.parse(text)
validateIndex(json, url)   // 语义校验
```

6. 缓存成功结果 `{ document, fetchedAt, url }` 10 分钟；失败记录 `lastError`，保留旧缓存并标记 `stale`。
7. `AbortController` 在插件 dispose 时全部 abort。

### 4.2 缓存结构

- `Map<url, { document, fetchedAt, fetchedAtMs }>`；`fetchedAt` 为 ISO 时间或 Unix 秒。
- `fetchedAt` 分页：查询携带 `fetchedAt` 时，只要该文档仍在缓存中（即使已过 10 分钟），就继续用它；被新拉取替换后失效（返回 `E_STALE_PAGE`，前端从第一页重载）。
- 并发刷新：后到请求复用同一 Promise；`refresh` 不排队重复拉取（若已有 in-flight，复用并标记 refresh 语义？简单：refresh 强制发起新请求，但与已有 in-flight 合并，避免双下载）。

---

## 5. 校验器（`validate-index.mjs`）

### 5.1 分层

1. **结构层**：手写检查（等价 JSON Schema）：类型、必填、长度、正则、数组长度。
2. **语义层**：R1–R23（规范 §15），包括：
   - URL 规范化/凭据/fragment/query 检查（文件 URL）；
   - 技能名唯一；版本唯一；文件路径唯一；
   - `SKILL.md` 恰好一个且根级；
   - 路径段/保留名/隐藏段；
   - sha256/大小/总大小；
   - metadata 引用声明；
   - icon data URL 解码大小；
   - `engines.dsh` range 语法；
   - 未知字段忽略（不报错）。
3. **错误**：`MarketError` 携带 `{ code, path, reason }`；`path` 用 JSONPath 风格（`$.skills[0].versions[1].files[2].path`）。

### 5.2 纯函数

```js
export function validateIndex(value, indexUrl) -> { index, warnings }
```

- 不触碰文件系统/网络；可直接被 `selftest.mjs` 用合成 fixture 测试。
- `warnings`：未知字段、`format` 可识别但字段被忽略、图标尺寸建议等。
- 校验器同时导出 `MAX_*` 常量，供 UI/安装器复用。

### 5.3 安装时二次校验

- 下载完成后，用同一套 `frontmatter.mjs` 解析 `SKILL.md`（与 DSH provider 规则一致）；
- 校验 `frontmatter.name === index.skills[i].name`；
- 校验 `description` 非空；
- 校验文件大小与 sha（已在下载时做，这里做最终一致性检查）。

---

## 6. 搜索与排序（`search.mjs`）

### 6.1 文本归一

- 输入：NFKC + 小写 + 按空白/标点切词。
- 中文/日文/韩文：连续字符切成「相邻二字 + 末字」（与 DSH 插件市场相同的 CJK 策略的简化版）。
- 匹配字段：`name`、`author`、`keywords`、各语言 `title`/`description`、`category` 标题、`label` 标题。
- 评分：name/title 权重 3，keywords 2，其余 1；前缀匹配 > 子串匹配；命中词数多者优先；同分按索引顺序。

### 6.2 查询/分页

- `text`、`category`、`labels`（全部匹配）、`sort`、`offset`、`limit`（1–100）。
- `sort`：
  - `index`：索引顺序；
  - `relevance`：文本评分降序（无文本时退回 index）；
  - `published`：默认版本 `publishTimestamp` 降序；
  - 声明 `sortKey`：按值（缺失排最后），可带 `asc/desc`。
- 返回：`{ source: {title, description, metadata}, fetchedAt, total, nextOffset, skills: [...] }`。
- 每个技能返回：`name/title/description/author/metadata/defaultVersion/installation/versions`（版本可截断为最近 N 个，详情再取全量）。

### 6.3 性能

- 索引 ≤5 MiB / 5000 技能；每次查询线性扫描可接受（O(n)），不做倒排索引；实测 5000 条文本评分 < 10ms 量级。
- 若后续索引变大，再引入预计算 token 索引；v1 不做。

---

## 7. 兼容性（`compat.mjs`）

无 npm `semver` 依赖，实现最小集合：

```js
parseVersion('0.2.1-rc.5') -> { major, minor, patch, prerelease: ['rc','5'], raw }
compareVersions(a, b)
satisfiesRange(version, '>=0.2.1-rc.5 <0.3.0') -> boolean
```

- 支持：`>= > <= < =` 比较器，空格表示 AND；不支持 `||`、`^`、`~`、`*`（v1 规范可建议发布者只用比较器组合；`engines.dsh` 若语法不支持 → 校验失败并提示）。
- 预发布版本比较遵循 SemVer 优先级（预发布 < 正式）。
- 当前 DSH 版本从 `ctx.get('webApp')`/package manifest？Host 侧可取 `process.env.DSH_VERSION`？更稳妥：项目 `engines.dsh` 声明 + 运行版本不可直接读。实现方案：插件自身 config 声明 `dshVersion`（默认从 `package.json` 的 `engines.dsh` 读取下限？）——实际上需要「当前运行版本」。可用 `ctx.get('settings')?.describe()`? 不确定。方案：
  - 从 `ctx.get('webApp')` 没有版本；
  - 从 `process.env.DSH_VERSION`（若存在）；
  - 从 profile 的 `package.json` 依赖版本？不保证；
  - 兜底：把 `engines.dsh` 视为兼容（不阻断），UI 显示「兼容性未知」。
  > 实现前需确认获取 DSH 版本的可靠途径；未确认时 v1 只用 `engines.dsh` 做提示，不阻断安装（比误伤好）。规范保留 `engines.dsh` 语义，实现按「未知视为兼容」。

---

## 8. 安装器（`install.mjs`）

### 8.1 流程

```
resolve(source, name, version)
  → assertNotYanked / assertCompatible（若已知版本）
  → assertTargetWritable(root, location)
  → 冲突检测（同名目录）
  → 创建 <root>/.skill-manager-tmp/<name>-<rand>/
  → for file of files:
        download(url, { redirect: 'error', timeout, maxBytes: 4MiB })
        assert size === declared && size <= 4MiB
        assert sha256(actual) === declared
        write to tmp/<path>（mkdir -p，路径已校验）
  → 校验 SKILL.md（frontmatter + name 一致 + 大小）
  → 校验总大小/文件数
  → 备份旧目录（若覆盖）
  → rename(tmp, <root>/<name>)
  → 写 sidecar
```

### 8.2 路径安全

- 目标根来自固定位置表（不允许任意路径）。
- 根内目标：`path.resolve(root, rel)` 必须以 `root + sep` 开头；`rel` 已通过规范路径规则。
- 拒绝符号链接：`lstat` 检查已存在路径；写入不跟随链接；`SKILL.md` 必须是普通文件。
- 安装目录使用索引 `name`（已 kebab-case 校验）。
- 临时目录名随机，避免并发冲突。

### 8.3 下载

- 每个文件 `fetch(url, { redirect: 'error', signal })`；超时 30s/文件（整体 120s）。
- 读流限量（`size` 声明值 + 1 字节探测）；超过即中止。
- 计算 sha256 用 `node:crypto` 流式；不整文件读入内存（SKILL.md 可整读校验；资源流式写盘）。
- 失败：删除 tmp，恢复备份（若已开始覆盖），返回具体文件错误。

### 8.4 冲突处理

| 选择 | 行为 |
| --- | --- |
| 覆盖 | 备份旧目录 → 安装新版本 |
| 跳过 | 不改动，返回成功但 `skipped: true` |
| 重命名 | 安装到 `<name>-2`（需校验 kebab-case 且不重名），记录 name 仍为原 name？——若目录名变了，DSH 的 frontmatter name 仍是原 name，catalog 名称不变但路径不同；会与源 name 不一致。**v1 建议不提供重命名**，改为「换位置/覆盖/跳过」；若保留重命名，需同时校验目录名与 frontmatter 不同只是路径差异，可能导致用户困惑。→ 规范/PRD 已列重命名；实现时需明确：重命名仅改变目录名，frontmatter name 不变（技能名仍是 name），可行但需要提示「catalog 名不变」。v1 实现可先不做，UI 灰化并说明「暂不支持」。 |
| 换位置 | 用户选另一个根，重新预检 |

> 修订：PRD 写了「重命名」，实现方案建议 v1 暂不提供（避免 name/目录名不一致的语义问题），UI 只给「覆盖/跳过/换位置」。待评审。

### 8.5 sidecar 写入

- 成功安装后更新 `state.json`（单写队列）。
- 记录 `files`（path/sha/size）用于本地修改检测与卸载清理。
- 失败不写 sidecar。

### 8.6 更新检查（自动）与更新（手动）

**自动检查调度**：

- 插件 `apply` 内注册调度器：`inject` 增加 `timer`；`ctx.effect(() => ctx.timer.interval(tick, 6h))`。
- 首次检查：启动后延迟 15s（`ctx.timer.timeout`），避免拖慢启动。
- 页面补检：前端在打开已安装/市场页时可调用 `POST /market/check-updates`（若距上次检查 < 30 分钟则直接返回缓存状态，不发新请求）。
- 单飞：同一时刻只跑一个检查；检查中再次触发返回 `checking: true` 状态。
- 条件：至少一个 `enabled` 源，且至少一条安装记录带 `sourceId`；否则跳过并记录 `skipped`。
- 每个源：刷新过期索引（15s 超时；失败记录 `lastError`，30 分钟内不再自动重试该源）。
- 计算：对每条安装记录，取该源索引中同名技能的默认/最高兼容版本，与记录版本比较；可选计算 `localModified`（按记录 `files` 重新 sha256）。
- 结果只写内存状态（`updateState`：`{ checkedAt, checking, errors[], updates[{name, location, current, available, localModified}] }`）；**不写技能目录、不更新安装记录**。
- 状态暴露：`GET /skills-manager/api/market/updates` 或随 `/market/list`、`/installed` 一起返回 `updateState`。
- 检查失败：记录到状态；不弹错误；不改变已有安装记录。

**手动更新**：

- 只由用户显式触发（`POST /market/update`）。
- 预检：
  - 目标目录存在且 sidecar 有记录；
  - 对比记录 `version` 与索引默认/最高兼容版本；
  - 计算本地修改：按记录 `files` 重新 sha256；任一不一致 → `localModified: true`，UI 警告。
- 执行：备份旧目录 → 安装新版本（同上）→ 更新 sidecar。
- 失败：回滚旧目录。
- 备份保留最近 3 份，超出删除最旧；备份目录在 `~/.dsh/skills-manager/backups/`。

### 8.7 卸载

- 校验 sidecar 存在且位置匹配；
- 若技能处于停用（存在 `<root>/.disabled/<name>/`），提示并一并清理（需用户确认）；
- 删除 `<root>/<name>/`；删除 sidecar 记录；
- 可选 `preserveBackup`：移动到 backups 而不是删除。

---

## 9. 路由与数据契约

所有路由在 `ctx.webServer`，`kind: 'exact'`，首行 `connection.requestRejection`；JSON + `no-store`；非 GET 405 + Allow；500 兜底。

| Method | Path | Body/Query | 返回 |
| --- | --- | --- | --- |
| GET | `/skills-manager/api/market/sources` | — | `{ sources: SourceView[] }`（含状态/技能数/上次错误） |
| POST | `/skills-manager/api/market/sources` | `{ url, name? }` | 新源 + 校验结果 |
| PUT | `/skills-manager/api/market/sources/:id` | `{ url?, name?, enabled? }` | 更新后的源 |
| DELETE | `/skills-manager/api/market/sources/:id` | — | `{ ok: true }` |
| POST | `/skills-manager/api/market/sources/:id/refresh` | — | `{ source, fetchedAt }` |
| POST | `/skills-manager/api/market/sources/validate` | `{ url }` | `{ preview: { title, description, skillCount, sample } }`（用于添加前校验） |
| GET | `/skills-manager/api/market/list` | `sourceId, q?, category?, labels?, sort?, offset?, limit?, refresh?, fetchedAt?` | 分页列表 |
| GET | `/skills-manager/api/market/skill` | `sourceId, name, version?` | 技能详情 + 版本列表 + 安装状态 |
| POST | `/skills-manager/api/market/install` | `{ sourceId, name, version?, location, conflict? }` | `{ installed, record }` |
| POST | `/skills-manager/api/market/update` | `{ sourceId, name, version?, location }` | `{ updated, record }` |
| POST | `/skills-manager/api/market/uninstall` | `{ name, location, preserveBackup? }` | `{ removed }` |
| GET | `/skills-manager/api/market/updates` | — | `{ checking, checkedAt, errors, updates: Array<{name, location, current, available, localModified}> }` |
| POST | `/skills-manager/api/market/check-updates` | `{ sourceId?, force? }` | 触发一次检查（单飞；30 分钟内且未 force 时直接返回缓存状态） |
| GET | `/skills-manager/api/market/install-progress` | `installId`（可选轮询） | `{ phase, current, total, file }` |

- 安装进度：v1 用轮询（500ms）读取内存中的安装任务表；安装完成后任务保留 60s 供查询。
- 所有错误：`{ ok: false, error: { code, message, path?, file? } }`；HTTP 状态按语义（400/404/409/500）。
- 路由不接受任意 URL；只接受已配置源。

### 9.1 安装状态计算

- 每次列表/详情调用时计算：
  - 扫描目标位置是否存在同名目录（来自已安装扫描模块）；
  - 查 sidecar；
  - 对比版本；
  - 返回 `not-installed / installed / update-available / different-version / untracked / incompatible`。
- 不做后台状态推送；前端在安装/更新/卸载后主动刷新。

---

## 10. 前端对接

- 市场 Tab 的数据源：`GET /market/list`；搜索 250–300ms 防抖；分页 50 条 + 「加载更多」。
- 源选择器：`GET /market/sources`；切换源重置 query。
- 详情：`GET /market/skill`；安装/更新/卸载按钮根据 `installation` 状态。
- 安装模态：
  - 目标位置（`~/.dsh/skills` 默认；`~/.agents/skills`；当前项目 `.dsh/skills`）；
  - 版本（v1 默认版本；展示 commit 短 SHA）；
  - 冲突处理（覆盖/跳过/换位置；v1 不提供重命名）；
  - 进度（轮询）；成功 toast + 跳转已安装。
- 更新：只显示「可更新」+ 用户点击；不自动。
- 源管理：添加（先 `validate` 预览）、编辑、删除、刷新、启用停用。
- 错误：按 code 映射 PRD 文案；源错误保留缓存并标「已过期」。

---

## 11. 错误处理

- 统一 `MarketError`（`code/message/path/file/cause`）。
- 路由层：把 error 映射为 HTTP 状态 + JSON；不泄露堆栈/绝对路径（只给 JSON path 与文件相对路径）。
- 安装失败：清理 tmp；若已备份则回滚；sidecar 不变。
- 索引失败：保留上次缓存，UI 标 stale；`lastError` 记录在源上。

---

## 12. 测试

### 12.1 纯函数测试（`selftest.mjs`）

- `validateIndex`：
  - 合法示例（`docs/plugins/skill-manager/product/examples/skill-market-index.example.json`）；
  - 非法：format 2、缺 title、缺 en、重复技能名、重复版本、坏 SemVer、缺 SKILL.md、SKILL.md 在子目录、路径 `../`、隐藏段、保留名、坏 sha、超大小、文件数超限、未声明的 category/label、坏 icon data URL、坏 engines range。
- `satisfiesRange`：正式/预发布、比较器组合、边界。
- `search`：CJK 文本、大小写/NFKC、分类/标签过滤、排序、分页。
- `path safety`：拼接/逃逸/保留名。
- `frontmatter`：合法/缺 frontmatter/旧布尔键/name 不一致。

### 12.2 假 fetch 测试

- 注入 `fetch` 依赖（安装器/拉取器构造函数接受 `fetchImpl`），测试：
  - redirect 被拒；
  - 超时；
  - 正文超限；
  - 文件 sha 不符；
  - 大小不符；
  - 200 但非 JSON。
- 不联网；不启动真实 HTTP 服务（CI 友好）。

### 12.3 本地集成

- `node:http` 起一个本地静态服务器，托管 fixture 索引与文件；把 `127.0.0.1` 源加入插件，走完整安装/更新/卸载。
- 不安装到真实 `~/.dsh/skills`：测试用临时目录作为 root（仅本地开发脚本，不进入 selftest）。

### 12.4 人工验收

- 用真实 GitHub 仓库（带 `index.json`）添加源 → 浏览 → 安装到 `~/.dsh/skills` → 重启 DSH 后技能出现在会话 catalog → 更新提示 → 手动更新 → 卸载。
- 断网/源 404/redirect/超大索引 → 错误态。
- 项目根安装 → 技能出现在项目会话；`.disabled` 停用/恢复。

---

## 13. 性能与限额

| 项 | 值 |
| --- | --- |
| 索引正文 | ≤5 MiB |
| 技能数 | ≤5000 |
| 查询 | 线性扫描，≤100 条/页 |
| 缓存 | 10 分钟；并发单飞 |
| 文件下载 | 单文件 ≤4 MiB；单版本 ≤20 MiB；并发 3，总超时 120s |
| 内存 | 索引文档 ≤5 MiB；不整读大文件（流式 sha） |
| UI | 列表骨架；分页 50；安装进度轮询 500ms |

---

## 14. 安全

- 只读已配置 URL；不拉任意地址。
- Redirect 拒绝；状态码非 2xx 失败。
- URL 无凭据；https/同源；文件 URL 无 query/fragment。
- 路径：根 allowlist + `resolve` 包含检查 + 禁止隐藏段/保留名 + `lstat` 防符号链接。
- 下载：大小上限 + sha256；先写 tmp 再 rename；失败清理。
- frontmatter：与 provider 一致；name 一致；拒绝旧键。
- 不执行任何下载文件；不信任 Content-Type。
- 第三方信任提示；不代理远程图标（浏览器直连，暴露 IP 需在 UI 说明）。

---

## 15. 第三方生态：规范与工具

1. **规范文档**：`docs/plugins/skill-manager/product/skill-market-index-spec.md`（format 1，冻结后版本化）。
2. **JSON Schema**：`docs/plugins/skill-manager/product/skill-market-index.schema.json`（`$id` 稳定 URL；发布到仓库 main）。
3. **示例索引**：`docs/plugins/skill-manager/product/examples/skill-market-index.example.json`。
4. **参考 CLI（v1 计划）**：独立 npm 包 `@xiechenghua01/skill-market-cli`（或仓库内 `tools/skill-market/`）：
   - `init/build/validate/release/diff`；
   - 生成 commit-pinned 文件 URL 与 sha256；
   - `validate` 实现与 Host 相同的语义规则（可共享代码）。
5. **GitHub Actions 模板**：规范 §17.4。
6. **兼容承诺**：`format: 1` 冻结；读取器忽略未知字段；破坏性变更 → format 2。

> 建议：把 JSON Schema 与 CLI 作为独立小仓库/包发布，避免技能管理插件仓库承担工具生态；本仓库先托管规范与 Schema，评审后迁移到正式规范地址。

---

## 16. 里程碑

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| M1 规范 | 规范文档 + JSON Schema + 示例 + 语义检查脚本 | 示例通过；评审通过 format 1 |
| M2 校验器 | `validate-index.mjs` + `compat.mjs` + selftest 非法 fixture | `pnpm test` 全绿；错误 path 准确 |
| M3 拉取/搜索 | 源管理 + fetch/cache + search/list + 路由 | 本地静态源可浏览/搜索；redirect/超时/超大错误正确 |
| M4 安装 | 下载/校验/frontmatter/原子写/sidecar/冲突 | 安装到临时根成功；失败无残留；重启后技能在 catalog |
| M5 更新/卸载/UI | 自动检查调度 + 状态接口 + 手动更新 + UI 市场/安装/源管理 | 端到端走查；检查失败退避；暗/亮主题；错误态 |
| M6 生态 | CLI + GitHub Actions 模板 + 发布 | 第三方开发者按规范生成索引并通过校验 |

---

## 17. 开放问题

1. **DSH 版本获取**：`engines.dsh` 兼容性判断需要当前 DSH 版本；未找到稳定读取途径前，v1 视为兼容并显示提醒。
2. **重命名冲突处理**：v1 建议不做（目录名与 catalog name 不一致的语义问题），UI 只给覆盖/跳过/换位置。
3. **GitHub 无索引仓库**：规范落地后评估「GitHub 仓库适配器」或「单技能 URL 安装」。
4. **私有源/token**：v2；需定义凭据存储与请求边界。
5. **签名**：v2；v1 依赖 https + sha256 + 用户信任。
6. **多版本并存**：v1 覆盖 + 备份；v2 再设计。
7. **索引详情文档**：`readme` 字段已预留；v1 不读取，详情只用 `description`。
8. **源顺序/跨源同名**：v1 按源展示；v2 可做合并/优先级。
9. **项目技能 sidecar 迁移**：v1 不随项目走；v2 可把安装记录放进项目目录（但会被 Git 提交，需设计）。
10. **规范托管地址**：Schema/规范的正式 URL 需要在发布时确定（当前指向本仓库 main）。

---

## 18. 与产品文档的差异（需同步修订 PRD）

1. 安装默认落点已确认 `~/.dsh/skills`（PRD §8.4 保持）。
2. 更新策略已确认：**检查自动执行**（启动后 + 每 6 小时 + 页面补检），**只提示**；更新下载/覆盖由用户手动触发。
3. GitHub 无索引仓库：v1 不支持，待规范评审后再定（PRD §19 #5 更新为「待规范」）。
4. 冲突处理：v1 建议去掉「重命名」，保留覆盖/跳过/换位置（PRD §8.4/§12 需同步）。
5. 索引 schema 以规范文档为准（PRD §8.1 的草案改为引用规范）。