# skill-manager 第 2 轮审核问题清单（第 3 轮修复用）

> 来源：Codex 第 2 轮复审（2026-11-06 20:47 快照）。结论仍为**不通过**，但问题已收窄。
> 修复者只改自己名下文件；不要 git commit；不要安装插件；改完不要自己 build（Lead 统一构建）。

---

## R5 — Host 兼容性与版本选择

**文件**：`lib/compat.mjs`、`index.js`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| R2-1 | P1 | range 上界误放行：`satisfiesRange('0.3.0-rc.1','^0.2.0')` 返回 `true`（应 `false`）；`>*`、`<*` 被展开为空条件，匹配所有版本 | `lib/compat.mjs:188`、`:339` | `^`/`~` 的展开必须用**不含预发布**的上界（`^0.2.0` → `>=0.2.0 <0.3.0`，预发布 `0.3.0-rc.1` 不满足）；`>*`/`<*`/`>=*` 等通配比较器按「匹配所有版本」还是「非法」二选一并保持一致（建议：`*` 单独作为通配，`>*`/`<*` 视为非法 range） |
| R2-2 | P2 | range 语法误判：合法 `1.x.x` 被拒；非法 `1.2.3-01` 被接受 | `lib/compat.mjs:127` | `x`/`X`/`*` 可作为任意段占位；预发布标识符不能以 `0` 开头的纯数字（SemVer 规则） |
| R5-1 | P1 | 默认安装/更新未选「最高兼容版本」：`index.js:302` 向版本选择传 `null`，忽略运行版本 | `index.js:302`、`:1075`、`:1102` | 把运行版本（`runningDshVersion()`）传给 `defaultVersionOf`，选择「最高兼容稳定版，否则最高兼容预发布版」；无兼容版本返回 `E_NO_COMPATIBLE` |
| R5-2 | P1 | 自动检查未接入新版兼容性：`index.js:586` 未传 `compat` 或 `dshVersion`，`update.mjs:101` 用旧 fallback | `index.js:586` | 创建 `createUpdateChecker` 时传入 `compat`（`lib/compat.mjs`）与 `dshVersion: runningDshVersion()` |
| R5-3 | P2 | `E_CHECKSUM` 映射 500，契约要求 502 | `index.js:210` | 补进 502 分支 |

## R6 — Host 扫描与安装回滚

**文件**：`lib/scan.mjs`、`lib/install.mjs`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| R6-1 | P1 | scope 计算能否定真实 snapshot：`scan.mjs:862` 给 mounted preset 无条件补入**全部**默认根，导致未挂载该根的预设的文件仍参与判优；`:911` 按 rank 排序忽略「层优先」 | `lib/scan.mjs:862`、`:911` | 每个 preset 的可见根 = 该预设 snapshot 实际返回的候选来源（按 `path` 反推），不要无条件补默认根；判优先比层（预设层优先于 global），层内再比 rank |
| R6-2 | P1 | 跨文件系统备份可能删除唯一完整副本：`cp` 成功、`rm` 部分失败时，catch 删除完整 destination | `lib/install.mjs:548`、`:692` | `EXDEV` 回退路径：只有 `rm` 完全成功后才标记「已移动」；`rm` 失败时保留 destination 并抛错，不要删除备份；恢复失败不得静默吞掉 |
| R6-3 | P2 | bundled 可见性只比较名称：只在 minimal 可见的 bundled 技能被标为在其他预设可见 | `lib/scan.mjs:997` | bundled 的 `visiblePresets` 按「该预设 snapshot 是否包含同名同 provider 条目」计算，不能只比 name |

## R7 — Client 市场状态与跨源关联

**文件**：`src/client/20-market.js`、`src/client/40-detail.js`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| R7-1 | P1 | 市场搜索/分页仍用两套状态：`smMarketCurrentSkills` 优先旧私有游标，分页追加旧列表，请求用私有搜索词；清空搜索不重新请求 | `20-market.js:73`、`:225`、`:257`；`00-prelude.js:1507`（清空搜索） | 单一事实源：搜索词、sourceId、tag、sort、offset、列表全部以 `appState.market*` 为准；分页只追加到共享缓存；清空搜索必须重新请求第 1 页 |
| R7-2 | P1 | 市场详情跨源同名误关联：`20-market.js:151` 接受来源不匹配的同名技能；`40-detail.js:89` 查本地副本不校验来源 | `20-market.js:151`、`40-detail.js:89` | 市场条目按 `sourceId + name` 定位；本地副本匹配必须同时校验安装记录的 `sourceId`（缺失时才按 name 回退）；卸载/编辑只能指向同源副本 |
| R7-3 | P2 | 市场键盘入口（Enter/Space）不记录滚动位置 | `20-market.js:374`、`:590` | `smMarketOpenDetail()` 内调用 `rememberListScroll()`（`00-prelude.js` 导出） |

## R8 — Client 更新徽章、来源 class 与滚动

**文件**：`src/client/00-prelude.js`、`src/client/50-modals.js`、`src/client/30-sources.js`

| # | 级别 | 问题 | 位置 | 修复要求 |
| --- | --- | --- | --- | --- |
| R8-1 | P1 | 详情/模态优先旧 `skill.market.updateAvailable`，与实际提交版本不一致；`updates=[]` 时回退旧字段，出现「Tab 计数 0 但行有徽章」 | `40-detail.js:142`、`50-modals.js:1221`、`00-prelude.js:1223` | 统一用 `skillUpdateVersion(skill)`（合并最新 `appState.updates`）；最新结果为空时必须清空旧徽章，不回退 `market.updateAvailable`（除非确实没有检查结果且状态未知） |
| R8-2 | P2 | `30-sources.js:433`、`:485`、`:486`、`:540`、`:666` 仍有裸 `success`/`warn`/`error` class | 同左 | 改为 `sm-success`/`sm-warn`/`sm-error`（R4 已在 90-styles 补 `.sm-warn`/`.sm-error`；若缺 `.sm-success` 请在 `90-styles.js` 之外用现有 `sm-badge-ok` 等别名，不要改 90-styles） |

> 注意：`40-detail.js` 同时被 R7 与 R8 引用。**R7 负责 `40-detail.js` 的跨源关联（:89）**；**R8 负责 `:142` 的更新版本读取**。两个 agent 改同一文件会冲突——因此本清单把 `40-detail.js` 只交给 **R7**，R8 的 `:142` 项改为「在 `00-prelude.js` 提供 `skillUpdateVersion` 的严格版本，并在 `50-modals.js` 使用它」，`40-detail.js:142` 由 R7 顺手改（R7 已在改该文件）。

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

- `validate-index.mjs` 失败（新插件未发布）：Lead 在复审通过后 commit + release。
- 真实 DSH 安装、真实浏览器视觉验收、联网拉取。
