# skill-manager 验收清单（Codex 审核用）

> 依据 `docs/agent-iteration-playbook.md` §2.1：先定死范围与判定标准，避免验收漂移。
> 审核者**只读**，不修改任何文件。每条结论必须给「文件:行号」或「选择器」或「命令输出」；无证据不采信。

---

## 0. 验收范围（只验这些）

| 层 | 范围 | 不验 |
| --- | --- | --- |
| L0 机械 | `node --check`、`pnpm test`、构建产物一致、locale 键集、字面色值、绝对家目录 | 不审第三方依赖、不审 Git 历史 |
| L1 Host 数据层 | 路由契约、扫描 7 类位置、frontmatter 校验、诊断 5 类、路径安全、状态持久化、安装器 sha256/原子写、索引校验 R1–R23、搜索/兼容性、自动检查调度 | 不审极端 YAML 边界（`!!js`、多行标量等）——本插件不解析 YAML 配置 |
| L2 Client UI 层 | 三个 Tab、列表行规格（49×49 图标、标签左置 340px、升级徽章第 1 位）、页内双栏详情（弃抽屉）、6 个模态、诊断抽屉、tooltip/toast、字号 `--sm-fs` 联动、只用 token | 不审动画帧率、不审像素级 1px 差异 |
| L3 契约一致性 | 与 `implementation-contract.md` 的符号/路由/数据模型/class 命名一致 | 不审产品文案措辞（除 PRD §12 明确列出的 key） |

**明确排除**：真实 DSH 安装验证（Lead 负责）、市场源联网拉取（用注入 fetch 的测试）、移动端布局。

---

## 1. 机械检查（必须全绿）

```bash
cd <repo>
node plugins/skill-manager/scripts/build-client.mjs --check
node --check plugins/skill-manager/index.js
node --check plugins/skill-manager/client.js
for f in plugins/skill-manager/lib/*.mjs; do node --check "$f"; done
node scripts/check-plugins.mjs
node scripts/validate-index.mjs
```

判定：任一失败 → 不通过（P0）。

---

## 2. L1 Host 数据层（逐条）

| # | 检查项 | 证据要求 |
| --- | --- | --- |
| H1 | `index.js` 导出 `name='skill-manager'`、`inject` 数组、`apply` 函数 | 文件:行号 |
| H2 | 只 import `node:` 与相对路径 | 文件:行号 |
| H3 | 所有路由 handler 首行调用 `connection.requestRejection` | 文件:行号（每个路由） |
| H4 | 响应包 `{ok:true,data}` / `{ok:false,error:{code,message}}`，`no-store`，405 + Allow | 文件:行号 |
| H5 | 扫描 7 类位置，rank 与顺序正确（100/200/300/300/400/500/600） | 文件:行号 |
| H6 | 只扫一层：`<name>/SKILL.md` 与 `<name>.md`；`.` 开头跳过；`.disabled/` 标停用 | 文件:行号 |
| H7 | frontmatter 校验与 provider 一致（首行 `---`、kebab name、description、严格布尔、拒旧键） | 文件:行号 |
| H8 | 诊断覆盖 5 类：断链、frontmatter、name、同层覆盖、跨层覆盖 | 文件:行号 |
| H9 | 路径安全：根 allowlist、`resolve` 前缀校验、`lstat` 防符号链接、拒绝 `..` | 文件:行号 |
| H10 | 安装器：临时目录 + 逐文件 size/sha256 校验 + 原子 rename + 失败清理 | 文件:行号 |
| H11 | 安装记录含 sourceId/version/commit/files(sha256)/installedAt | 文件:行号 |
| H12 | 索引校验覆盖 R1–R23（抽 8 条最关键的核） | 文件:行号 |
| H13 | 拉取拒绝 redirect、15s 超时、≤5MiB、严格 UTF-8、单飞、10 分钟缓存 | 文件:行号 |
| H14 | 自动检查：启动 15s + 6h 周期 + 单飞 + 失败退避；只读不写技能目录 | 文件:行号 |
| H15 | 停用/恢复移动 `.disabled/`；删除/卸载区分；只读位置拒绝写 | 文件:行号 |

## 3. L2 Client UI 层（逐条）

| # | 检查项 | 证据要求 |
| --- | --- | --- |
| C1 | `client.js` 含 `window.__ModuleLoader__.load(`，id 等于包名，只 `require('react')`，无 `@deepseek-ai/` | 文件:行号 |
| C2 | 三个 Tab 存在且可切换；已安装 Tab 带更新/诊断计数 | 选择器/行号 |
| C3 | 已安装行：65px、49×49 图标容器（16px 圆角、1px 描边、内 24×24）、左下状态点 | CSS 行号 |
| C4 | 市场行：76px、同样 49×49 图标；**最右只保留唯一按钮** | CSS/JS 行号 |
| C5 | 标签栏左置、`max-width:340px`、`nowrap`、最多 4 个 | CSS 行号 |
| C6 | 升级徽章：SVG circle+arrow 13×13、`color-mix` 淡绿、固定标签栏第 1 位 | CSS/JS 行号 |
| C7 | **页内双栏详情**（无右侧抽屉）：`← 返回`、56×56 图标、`2fr 1fr`、左栏内容卡、右栏元信息/可见性/诊断 | CSS/JS 行号 |
| C8 | 6 个模态齐备（新建/导入/安装/更新/添加源/删除确认），`box-shadow:none`、透明遮罩、Escape 分层 | 行号 |
| C9 | 诊断抽屉汇总 5 类问题 + 修复动作 | 行号 |
| C10 | tooltip：300ms、`--sm-fs - 4px`、`label-secondary`、无阴影、7px 圆角、`pointer-events:none`、z-index 2000 | CSS/JS 行号 |
| C11 | 字号全部 `calc(var(--sm-fs) ± Npx)`，无写死 px（固定高度/图标尺寸除外） | grep 结果 |
| C12 | 颜色只用 `--dsw-*` / `color-mix`，无 `#hex`/`rgb()` | grep 结果 |
| C13 | 空/错/加载/只读/搜索无结果状态齐全 | 行号 |
| C14 | 自动检查状态展示：检查中/有更新（信息条 + Tab 计数 + 行徽章）/上次检查失败 | 行号 |

## 4. L3 契约一致性

| # | 检查项 |
| --- | --- |
| K1 | 路由表与契约 §4 一致（路径、方法、请求字段、响应 `data` 形状） |
| K2 | 数据模型字段与契约 §3 一致（`SkillView`/`LocationView`/`IssueView`/`MarketSkillView`/`UpdateState`） |
| K3 | Client 全局符号名与契约 §5 一致（`t/fmtSize/fmtTime/cx/api/toast/icon/appState/setState/rerender/loadXxx/renderPage`） |
| K4 | class 命名 `sm-` 前缀，与契约 §5/§7 清单一致（允许新增，不允许改名已有） |
| K5 | locale 字典 zh/en 键集一致、值非空、全部被引用 |

---

## 5. 结论格式

```
结论：通过 / 有条件通过 / 不通过
L0 机械：<逐条 pass/fail + 命令输出摘要>
L1 Host：<逐条 pass/fail + 文件:行号>
L2 Client：<逐条 pass/fail + 证据>
L3 契约：<逐条 pass/fail + 证据>
问题清单：
  P0（阻断）：...
  P1（严重）：...
  P2（一般）：...
未验证项：<明确列出>
```

**收敛判定**：无 P0/P1 且 L0 全绿 → 通过；有 P0 → 不通过；仅 P2 → 有条件通过（记录 backlog）。
