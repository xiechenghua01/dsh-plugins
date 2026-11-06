# skill-manager 第 1 轮审核问题清单（修复用）

> 来源：Codex Host 审核 + Codex Client 审核（2026-11-06 20:22 快照）。
> 结论：**不通过**。本文件是第 2 轮修复的唯一输入；修完由 Codex 复审。
> 修复者只改自己名下的文件，不要动别人的；不要 git commit；不要安装插件。

---

## R1 — Host 路由与安装安全

**文件**：`index.js`、`lib/http.mjs`、`lib/install.mjs`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| H-P0-1 | P0 | 卸载沿 `<root>/.disabled` 符号链接删除根外数据 | `lib/install.mjs:718`、`:745` | 删除停用副本前，对 `.disabled` 及其父路径逐级 `lstat`，拒绝符号链接；`realpath` 后必须仍在根内 |
| H-P1-1 | P1 | `/sources/:id` 三个动态路由不可达（prefix 带尾斜杠，宿主匹配要求 `prefix + '/'`） | `index.js:35`、`:620` | 注册 prefix 时去掉尾斜杠（`/skill-manager/api/sources`），handler 内自行处理子路径 |
| H-P1-4 | P1 | 项目写入根用 cwd 拼 `.dsh/skills`，扫描用最近 `.git` 祖先，子目录 cwd 会写到不被扫描的位置 | `index.js:124` | 用与 `lib/scan.mjs` 相同的 `projectRootOf(cwd)` 结果作为项目根 |
| H-P1-5 | P1 | 安装/更新不拒绝与当前 DSH 不兼容的版本 | `index.js:272`、`lib/install.mjs:321` | 用 `lib/compat.mjs` 的 `satisfiesRange` + 运行版本（未知视为兼容）校验 `engines.dsh`，不兼容返回 `E_NO_COMPATIBLE` |
| H-P1-6 | P1 | 同版本内容漂移未检查（R27） | `lib/install.mjs:556` | 安装前读旧记录，若 `version` 相同但 `files` sha256 清单不同 → `E_VERSION_MUTATED` |
| H-P1-7 | P1 | 备份阶段失败不回滚已移走的旧目录 | `lib/install.mjs:622-631` | 把「移走旧目录」纳入同一个 try/回滚范围；失败时恢复旧目录 |
| H-P1-8 | P1 | `POST /check-updates {force:true}` 实际不强制 | `index.js:419` | 传 `{ force: true }` 对象给 `update.check` |
| H-P2-2 | P2 | 安装记录 `commit` 从 `entry.commit` 读取，索引字段是 `entry.source.commit` | `lib/install.mjs:341` | 优先 `entry.source.commit`，回退 `entry.commit` |
| H-P2-4 | P2 | 401/403 拒绝与 405 直接空响应，缺 JSON 包与 no-store；`statusFor` 透传上游非 2xx 状态 | `lib/http.mjs:77`、`:130`；`index.js:151` | 拒绝与 405 也走 `{ok:false,error:{code,message}}` + no-store；上游状态只允许 400/403/404/409/502/500 |
| H-P2-5 | P2 | 跨源同名技能误标已安装 | `index.js:301` | 匹配安装记录时同时比较 `sourceId`（记录缺失 sourceId 时才按 name 回退） |
| H-P2-6 | P2 | 跨源 tag 过滤在源未声明该 tag 时取消过滤 | `index.js:957` | 源未声明该 tag 时该源结果应为空，而不是忽略过滤 |
| H-P1-2b | P1 | `install.mjs` 自带一套宽松 frontmatter 解析，绕过 `lib/frontmatter.mjs` | `lib/install.mjs:399`、`:405` | 改为调用 `lib/frontmatter.mjs` 的 `parseSkillFile` + `validateFrontmatter`，与 `/validate` 行为一致 |

## R2 — Host 扫描、校验与更新

**文件**：`lib/scan.mjs`、`lib/write.mjs`、`lib/update.mjs`、`lib/market-index.mjs`、`lib/compat.mjs`、`lib/frontmatter.mjs`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| H-P1-2 | P1 | writer 的 frontmatter 解析跳过无法识别的行、接受非法 YAML / 引号旧键 / 数组 description；`frontmatter.mjs` 接受尾空格分隔符与 null 布尔 | `lib/write.mjs:467`；`lib/frontmatter.mjs:313`、`:439`、`:449` | 解析失败即失败（不跳过行）；分隔符必须是单独一行 `---`；布尔必须是真布尔或白名单字符串；数组 description 判非法；旧键判非法。与 `/validate` 和 provider 行为一致 |
| H-P1-3 | P1 | 扫描把不同 preset scope 合并判优，并把所有 global 技能当作 bundled | `lib/scan.mjs:755`、`:843`、`:699`、`:727` | 同层遮蔽按 preset scope 分组计算；global 快照只把 `source==='bundled'` 或 provider 非 filesystem 的标 bundled，filesystem 来源保留真实 source/location |
| H-P1-9 | P1 | 自动检查只检查 JSON 有 skills 数组，不调用 `validateIndex` | `lib/update.mjs:325` | 使用与 market 相同的校验器；校验失败记 `errors`，不产生更新提示 |
| H-P2-1 | P2 | `localModified` 哈希路径少了技能名 | `lib/update.mjs:362` | 用 `record.rootPath + record.name + file.path` 拼路径 |
| H-P2-3 | P2 | `^0.2.0`、`~0.2.1`、`*` 等合法 range 被拒 | `lib/market-index.mjs:382`；`lib/compat.mjs:114`、`:119`、`:133`、`:138` | 至少支持 `^`、`~`、`*`、`x`、`||`；`isValidRange` 只判断语法合法，`satisfiesRange` 才判断匹配 |

## R3a — Client 基础层与已安装列表

**文件**：`src/client/00-prelude.js`、`src/client/10-installed.js`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| C-P1-1 | P1 | `api()` 对 `/` 开头路径原样发送，所有写操作/详情请求缺 `/skill-manager/api` 前缀（会 404） | `00-prelude.js:851` | 统一 `API_BASE + raw.replace(/^\/+/,'')`；`http(s)://` 绝对 URL 才原样。修完检查所有调用点（`/skill`、`/market/*`、`/sources/*`、`/import`、`/validate`、`/diagnostics`） |
| C-P1-8 | P1 | 自动检查结果只写 `appState.updates`，行仍读旧 `skill.market.updateAvailable`，徽章不出现 | `00-prelude.js:1392`、`:1399`；`10-installed.js:415` | 渲染行时合并 `appState.updates.updates`（按 name+location）计算 `updateAvailable`；`loadUpdates` 成功后 rerender |
| C-P1-6a | P1 | 已安装行标签栏用 `.sm-row-tags.sm-tag-bar`，样式只定义 `.sm-row-badges`，宽度/nowrap 未生效 | `10-installed.js:469` | 改用 `sm-row-badges`（与市场行一致） |
| C-P1-6b | P1 | 列表根没有 `.sm-scroll`，`.sm-root{overflow:hidden}` 会裁切 | `00-prelude.js:1573`、`:1606` | 列表态容器加 `sm-scroll`（详情态已有） |
| C-P2-1 | P2 | 列表/工具栏 `data-tip` 没有悬停触发 | `00-prelude.js:1526` | 在页面根加事件委托：`mouseover`/`mouseout` 命中 `[data-tip]` 时调用 `smTip`；或给每个目标加 `onMouseEnter` |
| C-P2-4 | P2 | 返回列表不恢复滚动位置 | `40-detail.js:206` 写入 `restoreListScroll`，无人消费 | 在进入详情前记录列表 `scrollTop`；列表渲染后用 `useEffect` 恢复并清空 |
| C-P2-5 | P2 | 侧栏图标接受任意 `props.size`（契约要求 16/18） | `99-apply.js:17`（Lead 负责，已修） | — |

## R3b — Client 详情页与模态

**文件**：`src/client/40-detail.js`、`src/client/50-modals.js`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| C-P1-2 | P1 | 详情错误态引用作用域外 `kind`，直接 `ReferenceError` | `40-detail.js:574` | 用组件 props 或局部变量；错误态必须能渲染 |
| C-P1-3 | P1 | 更新模态读 `skill.market.location`，字段不存在，提交 `location:""` | `50-modals.js:1214` | 回退 `skill.location`（契约 §3 `SkillView.location`） |
| C-P2-3 | P2 | 详情图标固定为通用 skill 图标；市场入口已安装技能无编辑 | `40-detail.js:447`、`:846`、`:981` | 图标用 `skillIconName(...)`；市场入口且已安装时，按 `path` 懒加载 `GET /skill` 提供编辑 |
| C-P2-6 | P2 | 使用了无 `sm-` 前缀的 `active/warn/error/narrow` | `50-modals.js:505` 等 | 改为 `sm-` 前缀（与 R4 对齐） |

## R3c — Client 市场与来源

**文件**：`src/client/20-market.js`、`src/client/30-sources.js`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| C-P1-4 | P1 | 顶栏搜索/刷新只更新共享缓存，市场列表优先读私有缓存，展示不更新 | `20-market.js:79` | 让 `renderMarketTab` 优先读 `appState.market`（共享缓存），私有缓存只做分页追加；或搜索/刷新时同步写两份 |
| C-P1-5 | P1 | 来源页「查看技能」传位置 id，已安装筛选按别名比较，6/7 个位置匹配不到 | `30-sources.js:284` | 传 `locationFilterKey(id)`（与 `10-installed.js:47` 同一映射） |
| C-P2-2 | P2 | 市场「已安装（最新）」是 `span`，v2.3 要求弱化按钮 | `20-market.js:558` | 改为 `sm-btn sm-btn-ghost` 的弱化按钮（仍不触发安装） |
| C-P2-6 | P2 | 使用无前缀 class `active/warn/error` | `20-market.js:435`、`:704`、`:711` | 改为 `sm-` 前缀（与 R4 对齐） |

## R4 — Client 样式

**文件**：`src/client/90-styles.js`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| C-P1-7 | P1 | `.sm-root button` reset（`font-size:inherit` 等）优先级高于 `.sm-btn-primary`/`.sm-chip`，覆盖主按钮配色与字号阶梯 | `90-styles.js:30` | 降低 reset 特异性（如 `.sm-root :where(button)`）或给 `.sm-btn*` 提高特异性；确保主按钮底色/文字色/字号正确 |
| C-P1-6a | P1 | 缺 `.sm-row-tags`/`.sm-tag-bar`/`.sm-page-title` 等实际使用的 class 样式 | `90-styles.js:457` 等 | 补别名或统一命名（与 R3a/R3c 对齐） |
| C-P1-6b | P1 | 缺 `.sm-scroll` 样式 | `90-styles.js` | 补 `.sm-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}` |
| C-P2-6 | P2 | 需要 `.sm-active`/`.sm-warn`/`.sm-error`/`.sm-narrow` 等前缀别名 | — | 按 R3b/R3c 的改名补样式 |

---

## 修复后必须通过

```bash
node plugins/skill-manager/scripts/build-client.mjs
node plugins/skill-manager/scripts/build-client.mjs --check
node --check plugins/skill-manager/index.js
node --check plugins/skill-manager/client.js
for f in plugins/skill-manager/lib/*.mjs; do node --check "$f"; done
node scripts/check-plugins.mjs
node -e "import('./plugins/skill-manager/selftest.mjs').then(async m=>{let f=0;await m.run(x=>{f++;console.log('FAIL',x)});console.log(f===0?'selftest OK':'selftest FAIL')})"
```

## 不在本轮修复范围

- `validate-index.mjs` 失败（新插件未发布）：由 Lead 在修复后 `commit + pnpm run release skill-manager` 解决。
- 真实 DSH 安装验证、真实浏览器视觉验收、联网市场拉取：Lead/人工负责。
