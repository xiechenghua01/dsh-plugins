# Skill Manager 调研简报（给 Agent 的交接文档）

> 这份文件是「Skill 管理插件」调研的**一页事实底板**，供其他 Agent（实现、设计、评审）直接使用。
> 详细版：
> - [skill-subsystem.md](skill-subsystem.md) — Skill 安装/发现/合并/加载机制、API 清单、证据行号
> - [plugin-ui-architecture.md](plugin-ui-architecture.md) — 插件 UI 架构、左侧栏入口、路由、验证
> - [ui-patterns.md](ui-patterns.md) — 当前 DSH Web UI 实测几何与 token
>
> 产品与设计：`docs/plugins/skill-manager/design/skill-manager-interaction.md`（交互稿）、
> `docs/plugins/skill-manager/design/skill-manager-plugin-plan.md`（技术方案）、
> `docs/plugins/skill-manager/prototypes/skill-manager-ui.html`（UI 稿）。
>
> 基线：DSH 桌面版 0.2.1-rc.5（asar 内 dsh 包 0.2.2-rc.1）；当前会话 `agentPreset=cordis`。

---

## 1. 十条 TL;DR

1. **Skill 是一层注册表，不是安装包**：`ctx.skills`（`@deepseek-ai/dsh-skill`）只做 provider 注册、跨层合并、去重、校验、按需加载正文；它自己不含任何技能。
2. **读取 = `[global, ...scopeChain]` 合并**：近层同名直接覆盖远层；`rank` 只在**同一层内**决定同名胜负。rank 常量：project 100/200、custom 300、user 400/500、bundled 600。
3. **本地技能发现由 Agent 预设挂载**：`dsh-web-app` 把 host 层的 `skill-filesystem`/`tool-skill` 显式 `disabled: true`（注释「presets own local discovery」），cordis/standard/ptc 各自在 preset 层挂载，minimal 不挂。→ 判断「某技能是否可用」必须按预设看。
4. **扫描根**（preset 的 filesystem provider，默认 `includeDefaultRoots: true`）：
   `<project>/.dsh/skills`(100) → `<project>/.agents/skills`(200) → `customSkillDirs`(300) → `~/.dsh/skills`(400) → `~/.agents/skills`(500) → `bundledSkillDir`(600，当前无实例)。
   cordis/standard 的 custom 根 = `@deepseek-ai/dsh-agent-preset/skills`（4 个 creator 技能）。
5. **技能格式**：`<root>/<name>/SKILL.md` 或 `<root>/<name>.md`，只扫一层；frontmatter 必填 `name`（kebab-case）+ `description`，可选 `whenToUse`、`metadata`、`disable-model-invocation`、`user-invocable`。
6. **失败是静默的**：断链、坏 YAML、缺 description、非法 name、旧布尔键 → 整条丢弃，只写 `ctx.logger.warn`，模型 catalog 无诊断。本机 `~/.agents/skills/tabbit` 断链就是实例。
7. **模型侧只有 `skill` 工具 + 一份 durable catalog**：catalog 只含 name + 截断 description（默认 500 字符），digest 变化时追加替换版；`/name` 是 `disable-model-invocation` 技能的唯一入口。
8. **客户端可读**：`ctx.remote.skills.list({ sessionId })`（背后 `sessionSkillCatalog`）返回该会话 user-invocable 的 `SkillEntry`（name/path/description/whenToUse/modelInvocable），冷会话用 `agentPresets.acquireScope` 不激活 Agent；但拿不到 provider/source/rank/正文/model-only 技能。
9. **没有安装器、没有状态库、没有诊断 API**：安装 = 把有效文件放进扫描根；启用/停用只能移文件、改扩展名或改 YAML 行；被遮蔽项不可枚举。
10. **管理插件的真正价值**：按 scope 分层展示（global vs 每个 preset）、诊断「文件存在但未生效」、受控文件 CRUD + 前置 frontmatter 校验。

---

## 2. 生命周期

```
[把 SKILL.md 放进扫描根]  +  [该 scope 的 provider 已挂载]
                    │
                    ▼
provider.list({cwd}) → 扫描根 → 解析 frontmatter → candidates(rank/source/locator)
                    ▼
registry：layers = [global, ...scopeChain]；每层按 rank 排序、first-wins；跨层近者覆盖
                    ▼
SkillSummary[]（按 name 排序；invocation-neutral）
                    ▼
dsh-tool-skill：过滤 modelInvocable → digest → durable catalog（append/replace）
                    ▼
模型 skill(name) / 用户 /name → registry.get → provider 重读文件 → <skill_content>
```

关键结论：**发现**与**加载**分离（每次加载重读文件）；**目录**只是投影（不含 whenToUse/source/provider/rank）；**缓存**只由 provider `invalidate()` 或 runtime 注册/disposal 清除，没有 TTL。

---

## 3. 三类来源与本机实例（`agentPreset=cordis`）

| 来源 | 层级 | 是否可管理 | 本机例子 |
| --- | --- | --- | --- |
| 用户/项目文件系统 | preset 层 | 可编辑/删除/停用 | `ego-browser`（`~/.agents/skills`，rank 500）；`tabbit` 断链 |
| 预设包内 `skills/`（custom 根） | preset 层 | 只读 | `agent-experience`、`cordis-plugin-development`、`cordis-composition-reference`、`editing-cordis-compositions` |
| 插件内置 provider | global 层 | 只读 | `office*`×7（`dsh-skill-office`，rank 600）、`dsh-badge`、`official-plugins`、`personalized-pages` |

- `minimal` 预设不挂 skill 行 → 该预设下 Agent 没有技能。
- `bundledSkillDir` / `$DSH_BUNDLED_SKILL_DIR` 机制存在，但当前 asar 无配置实例、env 未设置。

---

## 4. 文件系统技能规范（实现必须逐条对齐）

| 项 | 规则 |
| --- | --- |
| 布局 | 目录 bundle `<name>/SKILL.md`；平铺 `<name>.md`；嵌套 `**/SKILL.md` 不发现 |
| frontmatter | 首行 `---`，以单独一行 `---` 结束；YAML 必须是对象 |
| name | `^[a-z0-9]+(?:-[a-z0-9]+)*$`；必填 |
| description | 非空；必填；模型 catalog 截断到 500 字符 |
| 可选键 | `whenToUse`、`metadata`、`disable-model-invocation`、`user-invocable` |
| 布尔 | 真布尔或 `true/false/yes/no/on/off/1/0`；旧键 `disableModelInvocation/modelInvocable/userInvocable` 直接丢弃整条 |
| 正文 | frontmatter 之后 `trim()` 的内容；无大小上限（建议 < 8 KB，超过会被 preset 的 tool-result pruner 处理） |
| 变更传播 | 根目录 chokidar depth 1；新增/删除/改 `SKILL.md` 触发 catalog 刷新；`references/scripts/assets` 子树变化被忽略 |
| 失败模式 | 坏 YAML / 缺字段 / 非法 name / 断链 / 非文本 / 根不可读 → 整条或整根丢弃 + `logger.warn`，无 UI 诊断 |
| 符号链接 | 默认跟随（`watchFollowSymlinks: true`）；断链跳过 |

**停用/启用的可行手段**（无 per-skill 状态库）：

1. 移出扫描根（管理插件采用：`<root>/.disabled/<name>/`，provider 只扫一层，不会发现）。
2. 改扩展名（`.md` → 非 `.md`）。
3. 改 provider 行（profile/preset YAML，需要重启，不适合插件即时操作）。

---

## 5. 运行时接口（Host 侧）

| 能力 | API | 备注 |
| --- | --- | --- |
| 全局层目录 | `ctx.skills.snapshot({ cwd })` | 主要是插件内置；filesystem 不在 host 层 |
| 某预设的合并目录 | `agentPresets.list()` → `acquireScope(id)` → `skills.snapshot({ cwd, scope })` | 权威视图；lease 用完 dispose；`ScopeKey` 不可序列化 |
| 读正文 | `ctx.skills.get(name, { cwd, scope })` | 每次重读文件 |
| 某会话可见技能 | `ctx.sessionSkillCatalog.list({ sessionId }, signal)` | 仅 user-invocable；不激活冷 Agent |
| 变更事件 | `skills/change`（无参数） | 需重新 snapshot；事件声明未验证 |
| 文件 CRUD | 自己的 Node I/O 或 `ctx.fs` | 写入后用第一方 `write/edit` 会经 `fs/observed` 立即 invalidate；插件自己的 I/O 靠 watcher |

**拿不到**：被遮蔽的同名技能、provider/source/rank 的客户端版本、`scope` 持久化、写文件后的前端自动刷新事件。

---

## 6. 管理插件的能力边界

### 可做

- 扫描根内文件 CRUD（新建/编辑/导入/删除/移动）。
- 前置 frontmatter 校验（必须与 provider 规则逐条一致，否则「校验通过但实际被丢弃」）。
- 按预设分层展示 + 「可见于 N 个预设」。
- 诊断：断链、坏 frontmatter、非法 name、目录不可读、同层 rank 覆盖、跨层覆盖（推断）。
- 停用/启用（移动到 `.disabled/`，可恢复）。
- 写后主动刷新（前端不会自动收到磁盘变更）。

### 不可做 / 不建议

- 删除或改写插件包内 `assets/`、`skills/` 下的技能（升级覆盖、无卸载语义）。
- 用 `Config.listConfigs.status` 判断「是否启用」（status 含 disabled/never imported/disposed，且不反映 preset 层）。
- 浏览器端直接写 profile YAML / 扫描根（client 无 host 文件权限）。
- 枚举被遮蔽技能（registry 明确不保留）。
- 通过 `sessionSkillCatalog` 拿 model-only / provider / rank / 正文。

---

## 7. 插件 UI 技术要点（左侧栏入口）

| 项 | 结论 |
| --- | --- |
| 入口槽位 | `sidebar.panellist`（list；注册 `{ id, order, label }`，图标组件接收 `{ size, active }`）；折叠 rail 自动 36×36 + tooltip |
| 页面槽位 | `main`（keyed；`key` 与 panellist `id` 相同，如 `skill-manager`）；`ctx.layout.selectPanel(id)` 打开 |
| 参考实现 | shipped Plugins 页：`@deepseek-ai/dsh-client-ui-plugin-manager/lib/client.js` 约 7680-7826 行（`PANEL_ID='plugins'`，main + sidebar.panellist 双注册） |
| 客户端契约 | `window.__ModuleLoader__.load({ id, factory })`；`factory(require)` 只 `require('react')`；`inject: ['slots','locale','layout']`；`dsh.client.inject` 建议 `["@deepseek-ai/dsh-client-locale","@deepseek-ai/dsh-client-ui-layout","@deepseek-ai/dsh-client-ui-sidebar"]` |
| Host 路由 | `ctx.webServer.register({ kind:'exact', path, handler })`；用 `ctx.connection.requestRejection(req)` 做信任围栏；JSON 头、405/500 约定照抄 session-stats CONTRACT |
| 样式 | 仅 `--dsw-*` token；作用域 `.sk-*`；亮/暗由宿主变量切换 |
| 文案 | client locale 服务；`locale/{en,zh}.json` 键集一致 |
| 验证 | 安装后刷新页面；`curl` 未认证应为 401（不是 404）；`cordis_inspect_query` 看 `main` / `sidebar.panellist` occupants |

**最小骨架**（详见 plugin-ui-architecture.md）：

```js
ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
  name: 'main', key: 'skill-manager', locale: NS,
  inject: () => ({ t, fetchJson }),
}, SkillManagerPage)), 'skill-manager: main')

ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: 'skill-manager', order: 20,
  label: () => t('panel.title'), locale: NS,
}, SkillIcon)), 'skill-manager: sidebar entry')
```

---

## 8. 产品设计输入（详见交互稿）

- **入口**：侧栏顶部面板列表（与 Plugins / 自动化任务同级），不是底部 footer 槽。
- **三个 Tab**：技能库 / 来源 / 诊断。
- **技能库**：按来源分组（项目 → 项目共享 → 自定义/预设 → 用户 → 用户共享 → 全局内置 → 已停用）；65px 行、49×49 图标、switch、badges。
- **详情**：右侧 560px 抽屉，概览 / 原文 / 资源 / 诊断；底部复制调用命令、编辑、停用/删除。
- **新建/导入**：560px 模态，手写表单（名称/描述/何时使用/正文/保存位置）或粘贴 SKILL.md / 目录导入。
- **来源**：预设挂载状态 + 扫描根（含 rank）+ 全局层 provider；只读来源明确标注。
- **诊断**：断链、坏 frontmatter、非法 name、同层 rank 覆盖、跨层覆盖；带修复动作。
- **状态**：加载用文字 + 骨架（官方做法）；空状态给新建/导入出口；错误面板 + 重试。
- **视觉基线**：暗色 `#151517` 底、侧栏 `#1b1b1c`、卡片 `#232324/#2c2c2e`、20px 圆角行、13/14px 排版、白底深字主按钮（详见 ui-patterns.md）。

---

## 9. 未决问题（实现前需真机验证）

1. `agentPresets.acquireScope` 在 root 级插件的可用性、开销与释放语义（官方 `sessionSkillCatalog` 已用，风险低）。
2. `skills/change` 是否在 Cordis 事件类型中声明、能否 `ctx.on`。
3. `host-open-in-app` 是否有「在 Finder/Explorer 中显示」的稳定接口（否则降级为复制路径）。
4. `directoryPickerController` 能否在 root 级面板调用（可能绑定会话）。
5. 桌面运行时 `skill-office` 行的启用路径（catalog 已证实有 7 个 office 技能）。
6. 写盘后 watcher 的实际延迟（预期 < 1s；根从无到有依赖 `fs.watchFile` 轮询）。

---

## 10. 证据索引

- 注册表：`app.asar/dsh/node_modules/@deepseek-ai/dsh-skill/lib/index.js`（566 行）
- 文件系统 provider：`.../dsh-skill-filesystem/lib/index.js`（902 行）+ README
- 模型侧：`.../dsh-tool-skill/lib/index.js`（1131 行）+ README
- 客户端 API：`.../dsh-api-session-controller/lib/types/skill-catalog.js`（204 行）
- 组合配置：`.../dsh-base/cordis.patch.yml` 312-319；`.../dsh-web-app/cordis.patch.yml` 512-525；`.../dsh-web-app/presets/cordis.patch.yml` 122-130
- 插件内置技能范例：`.../dsh-skill-badge/lib/index.js`、`.../dsh-skill-office/lib/index.js`
- 侧栏参考：`.../dsh-client-ui-plugin-manager/lib/client.js` 7680-7826；`.../dsh-client-ui-sidebar/lib/client.js` 228
- 本机实测：`~/.agents/skills`（ego-browser 可读、tabbit 断链）；`~/.dsh/skills` 不存在；profile patch 无 skill 行
- 界面实测：`docs/plugins/skill-manager/research/assets/ui-01..ui-12`（1200×901，暗 10 + 亮 2）
