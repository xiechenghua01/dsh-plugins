# skill-manager 实现契约（实测记录）

本文件记录 `@xiechenghua01/dsh-skill-manager` 的实现契约与验证事实。
产品与设计来源：[PRD](../../docs/plugins/skill-manager/product/skills-manager-prd.md)、
[索引规范](../../docs/plugins/skill-manager/product/skill-market-index-spec.md)、
[实现契约](../../docs/plugins/skill-manager/design/implementation-contract.md)。

---

## 1. 包与槽位

| 项 | 值 |
| --- | --- |
| 包名 | `@xiechenghua01/dsh-skill-manager` |
| Loader 行 id | `skill-manager` |
| `main` key | `skill-manager` |
| `sidebar.panellist` | `id: skill-manager`，`order: 20` |
| locale namespace | `skillManager` |
| CSS 前缀 | `sm-`，字号变量 `--sm-fs` |

浏览器半由 `src/client/*.js` 片段拼接为 `client.js`（`node scripts/build-client.mjs`）。
DSH 的模块加载器每个插件只服务一个文件、只提供 `react`，所以片段在构建期合并，运行期是单文件。

## 2. 平台事实（来自本机实测）

- 本地技能发现由 **Agent 预设**挂载：`dsh-web-app` 关闭了 host 层 `skill-filesystem` / `tool-skill`，
  cordis/standard/ptc 各自在 preset 层挂载，`minimal` 不挂。
- 扫描只认一层：`<root>/<name>/SKILL.md` 或 `<root>/<name>.md`。
- frontmatter 失败静默丢弃：首行 `---`、YAML 对象、kebab `name`、非空 `description`、
  严格布尔、拒绝旧键（`disableModelInvocation` 等）。
- rank：project-dsh 100 / project-agents 200 / custom 300 / user-dsh 400 / user-agents 500 / bundled 600；
  同层 rank 小的赢，预设层整体覆盖 global 层。
- 没有 per-skill 状态库；「停用」只能移出扫描根（本插件用 `<root>/.disabled/`）。
- `webServer.register` 支持 `kind: 'exact'` 与 `kind: 'prefix'`，匹配顺序 exact → 最长 prefix → fallback。

## 3. 路由

前缀 `/skill-manager/api`，全部经 `ctx.connection.requestRejection` 围栏。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/installed?cwd=` | locations + skills + issues + presets + updates |
| GET/POST/PUT/DELETE | `/skill` | 详情 / 新建 / 编辑（mtime 乐观锁）/ 删除 |
| POST | `/skill/state` | 停用 / 恢复 |
| POST | `/import` | 粘贴 / 目录导入 |
| GET | `/diagnostics?cwd=` | 诊断 |
| GET/POST | `/sources` | 源列表 / 新增 |
| POST | `/sources/validate` | 索引预校验（不落盘） |
| PUT/DELETE | `/sources/:id` | 编辑 / 删除（prefix 路由） |
| POST | `/sources/:id/refresh` | 刷新 |
| GET | `/market` | 搜索 + 筛选 + 排序 + 分页 |
| GET | `/market/skill` | 市场详情 + 版本列表 |
| POST | `/market/install` | 安装 |
| POST | `/market/update` | 手动更新 |
| POST | `/market/uninstall` | 卸载 |
| GET | `/updates` | 自动检查状态 |
| POST | `/check-updates` | 触发检查（单飞） |
| POST | `/validate` | SKILL.md 校验 |
| GET | `/settings` | fontSize / cwd / dshVersion |

响应包：`{ ok: true, data }` / `{ ok: false, error: { code, message, path?, file? } }`；
`content-type: application/json; charset=utf-8`、`cache-control: no-store`；非允许方法 `405 + Allow`。

## 4. 安全

- 写操作限定在 5 个可写根（project-dsh / project-agents / custom / user-dsh / user-agents）；
  `preset` / `bundled` 返回 `E_READONLY_LOCATION`。
- 路径：`resolve` 前缀校验 + 逐级 `lstat` 防符号链接逃逸；拒绝 `..`、绝对路径、保留名（`.disabled`、`.git`、`node_modules` 等）。
- 安装：目标根内 `.skill-manager-tmp/<name>-<rand>/` → 逐文件 size + sha256 校验 → 原子 `rename`；
  覆盖前备份到 `~/.dsh/skills-manager/backups/`（保留最近 3 份）；失败回滚并清理临时目录。
- `SKILL.md` 必须根级、≤256 KiB、frontmatter 合法、`name` 与索引一致（`E_NAME_MISMATCH`）。
- 拉取索引：`redirect: 'error'`、15s 超时、≤5 MiB、严格 UTF-8、单飞、10 分钟缓存、失败保留 stale 缓存。
- 自动检查更新：启动 15s + 每 6 小时 + 单飞 + 失败退避 30 分钟；**只读**，不下载、不写技能目录。

## 5. 状态

`~/.dsh/skills-manager/state.json`（0600）：源列表 + 安装记录（sourceId/version/commit/files sha256/installedAt）。
写入走 `tmp → rename`、写前备份 `.bak`、损坏时隔离为 `state.corrupt-<ts>.json` 并从 `.bak` 恢复、单 Promise 队列。

## 6. 验证

```bash
node plugins/skill-manager/scripts/build-client.mjs --check
node --check plugins/skill-manager/index.js
node --check plugins/skill-manager/client.js
node -e "import('./plugins/skill-manager/selftest.mjs').then(async m=>{let f=0;await m.run(x=>{f++;console.log('FAIL',x)});console.log(f===0?'OK':'FAIL')})"
node scripts/check-plugins.mjs
```

真机安装后：

- 侧栏出现「技能」，点击打开面板；折叠 rail 下显示 18px 图标 + tooltip。
- 未认证 `curl http://127.0.0.1:<port>/skill-manager/api/installed` 应返回 `401`（`404` = 未注册）。
- `cordis_inspect_query(client/Slots, listSubTree, { root: 'main' })` 应出现 `skill-manager`；
  `{ root: 'sidebar.panellist' }` 应出现 `id: skill-manager`、`order: 20`。

## 7. 已知边界

- `bundled`（插件内置）技能无文件路径，详情只能读列表数据。
- `custom` 根只取首个可写根；多 custom 根无法按 id 选择。
- 同层遮蔽未按预设分别计算（不同预设挂载不同 custom 根时可能误报）。
- 目录导入无法在导入前列出文件数（Host 只返回导入后的计数）。
- 诊断「重命名」只复制建议名，不自动改文件名。
- 运行时 DSH 版本来源未确定，`engines.dsh` 未知时视为兼容。
