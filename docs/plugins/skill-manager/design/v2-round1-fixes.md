# skill-manager v2 第 1 轮审核问题清单

> 来源：Codex Host / Client 双审（快照 `f6e4e1e`），结论均为**不通过**。
> 修复者只改自己名下文件；不 build、不 commit；修完由 Lead 统一构建与复审。
> 基线文档：`implementation-contract-v2.md`（唯一事实源）、PRD 2.3、交互稿 3.3、`native-parity.md`。

---

## R1 — Host 安装记录隔离（`lib/state.mjs`、`lib/install.mjs`）

### P1-1 项目安装记录未按项目根隔离

**现象**：安装记录的写入/删除只匹配 `(location, name)`，忽略项目根。项目 A、B 的 `project-dsh` 装同名技能时，B 的记录覆盖 A；扫描 A 显示 B 的来源与版本；在 A 卸载会删掉 B 的记录，但 B 的文件还在。

**位置**：`lib/state.mjs:545`、`:563`；`lib/install.mjs:905`

**修复要求**：

1. 记录匹配键改为 `(location, name, rootPath)`：
   - `rootPath` 取安装目标的绝对根（项目根解析后的 `.dsh/skills` / `.agents/skills`）。
   - 用户级位置（`user-dsh` / `user-agents`）的 `rootPath` 固定，行为不变。
2. 读取记录时支持旧数据（缺 `rootPath` 的记录按 `location` + `name` 匹配，仅当唯一时采用）。
3. 卸载、更新、`localModified` 判定、`installed` 标记全部走新匹配键。
4. 写入时保留 `rootPath` 字段；同一 `(location, name)` 在不同 `rootPath` 下允许多条记录。

**验收**：内存文件系统模拟 A/B 两项目，装同名不同版本技能后，两条记录并存；扫描 A 只显示 A 的记录；卸载 A 不影响 B。

---

## R2 — Host 扫描与响应（`lib/scan.mjs`、`index.js`、`lib/update.mjs`）

### P2-1 SkillView 未完全符合契约 §3.2

- `localModified` 只在 `market.localModified` 里，未投影到顶层。
- `id` 是路径 hash，契约要求 `<location>:<name>`。
- `status` 会出现枚举外的 `shadowed`。
- 详情（`GET /skill`）直接返回扫描对象，未走列表同一套投影。

**修复**：`publicSkill()` 统一投影：`id = '<location>:<name>'`（同名多版本时追加 `#<rootPath hash>` 保证唯一）；`localModified` 投影到顶层；`shadowed` 映射为 `status: 'invalid'` 并在诊断里表达；`GET /skill` 也走 `publicSkill`。

### P2-2 只读 custom 被标成可写

非包路径的 custom 根一律 `writable: true`，只读目录仍归 `mine`。

**修复**：custom 根的 `writable` 用实际可写性判定（尝试 `fs.access(W_OK)` 或目录权限位）；不可写 → `system` 分类 + `writable: false`。

### P2-3 sourceOrder 补齐不按创建时间

缺失顺序项按数组顺序补齐，契约要求按创建时间。

**修复**：`normalizeSourceOrder` 对未列出的源按 `addedAt` 升序追加。

### P2-4 无启用源时检查更新不刷新扫描

**修复**：`/check-updates` 即使 `sources === 0` 也执行扫描失效与刷新，返回 `{ sources: 0, updates: 0, errors: [] }`。

### P2-5 失败检查丢失上次成功结果

`invalidate` 会删缓存；更新检查器先缓存索引后校验，无效新索引替换旧索引。

**修复**：
- 检查失败时**不删除**市场缓存，只标记 `stale`。
- 更新检查器校验通过后才替换缓存；校验失败保留旧缓存并记 `errors`。

### P2-6 上游状态覆盖契约映射

源预校验遇到上游 404 返回 `404/E_SOURCE_HTTP`，契约要求 502。

**修复**：`statusFor` 优先按错误码映射，上游 status 只在白名单内且码本身允许时使用；`E_SOURCE_*` 一律 502。

### P2-7 市场更新标记跨源串线

更新匹配未检查 `sourceId`；当前源未安装时反而放行任意同名更新。

**修复**：`updateAvailable` 只在「同名 + 同 sourceId + 已安装」时计算。

---

## R3 — Client 工具栏与市场（`src/client/00-prelude.js`、`src/client/20-market.js`）

### P1-1 技能页工具栏未实现（阻断）

**现象**：页面壳与技能内容都没有工具栏，搜索、排序、三个图标入口全缺，导入模态没有页面入口。

**修复**：
- 在 `renderPage` 的技能页头部渲染工具栏：搜索框 · 排序下拉（名称 / 最近修改 / 按来源）· 三个 30×30 图标按钮（新建 / 导入 / 检查更新），全部带 `data-tip`。
- 市场页工具栏：搜索 · 排序（推荐 / 最近更新 / 名称）· 检查更新 · 管理源。
- 类名用 `sm-toolbar` / `sm-toolbar-icons` / `sm-tool-btn`（`90-styles.js` 已备样式）。

### P1-2 市场仍保留独立刷新

**修复**：市场工具栏的刷新按钮改为「检查更新」，调用 `checkUpdates()`，与技能页同一动作；删除 `smMarketRetry → loadMarket` 的独立刷新路径（错误块内的「重试」保留，它只重取该源）。

### P2-8 市场源失败时隐藏缓存卡片

区块同时有 `skills` 和 `error` 时只渲染错误面板。

**修复**：有缓存时渲染卡片 + 顶部错误细条（`stale` 提示），无缓存时才整块错误态。

---

## R4 — Client 列表与详情（`src/client/10-skills.js`、`src/client/40-detail.js`）

### P2-1 「最近修改」排序读旧值

`sort === 'recent'` 应为 `'modified'`（契约 §3.1）。

### P2-2 卡片键盘事件未隔离子按钮

聚焦 `⋯` 或更新按钮按 Enter/Space 会冒泡到卡片并进入详情。

**修复**：卡片 `onKeyDown` 先判断 `event.target !== event.currentTarget` 则返回。

### P2-4 缺两个状态 key

`detail.status.disabled`、`detail.status.readonly` 缺失，只读/已停用详情显示原始 key。

**修复**：在 `00-prelude.js` 字典补这两个 key（zh/en），并确认被引用。

### P2-7 名称诊断主动作不符

交互稿要求「重命名」，实际是「打开文件修正」。

**修复**：采用「打开文件修正」（Host 无 rename 路由），同步修改交互稿 3.3 的对应行，避免文档与实现不一致。

---

## R5 — Client 模态与样式（`src/client/50-modals.js`、`src/client/90-styles.js`）

### P2-3 一级 Tab 无键盘切换

未选中 Tab `tabIndex: -1` 且无方向键处理。

**修复**：一级 Tab 容器加 `onKeyDown`，←/→ 在技能/市场之间切换并移动焦点；或让两个 Tab 都可聚焦。

### P2-5 原生样式三处偏差

1. 一级 Tab 默认文字是 `secondary`，hover 直接变 `primary`，与选中态失去区分 → 默认 `tertiary`，hover 只变背景，选中才变 `primary`。
2. 市场工具栏用 28×28 `.sm-icon-btn`，应为 30×30 `.sm-tool-btn`。
3. 弹窗关闭按钮内联背景/文字色覆盖 hover/focus → 去掉内联样式，用 class。

### P2-6 弹窗焦点闭环不完整

管理源弹窗无 Tab 焦点锁定；通用模态关闭时未恢复触发元素焦点。

**修复**：打开时记录 `document.activeElement`，关闭时恢复；管理源弹窗加 Tab 循环锁定（首尾元素互跳）。

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

## 不在本轮范围

- 真实 Harness 安装、真实浏览器视觉、联网市场拉取：Lead 负责。
- `validate-index.mjs` 失败（0.2.0 未发布）：Lead 负责。