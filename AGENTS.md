# AGENTS.md

任何修改本仓库的人（人或 agent）都应先读 [README.md](README.md)。

## 这个仓库是什么

- DSH 插件 monorepo：`plugins/` 下每个目录是一个可安装的 bundle。
- 插件市场索引源：`index.json` 是 format-1 索引，由 `market.json` + `plugins/*/package.json` 生成，供 Harness「发现」页消费。

`index.json` 是生成产物，禁止手编；用 `pnpm run release` 生成。

## 验收流程

每次改完插件，按顺序完成以下四步，全部通过后才向用户报告完成。

```
1. pnpm test                                                      # 零错误
2. node tools/verify-render.mjs                                   # 零错误
3. plugin_manager action=install_bundle target=<repo>/plugins/<slug>
4. 实机视觉走查（见下）
```

**步骤 4 视觉走查**：加载 `dsh-web-browser` skill 接入本机 Web GUI，用 `ego-browser nodejs` 截图验证以下四项，**每项必须附截图，不能只文字描述**：

| 检查项 | 判据 |
| --- | --- |
| 侧边栏入口 | 插件图标出现在侧边栏，点击可打开页面 |
| 路由响应 | 有 UI 的插件对应路由返回 `401`（已注册），不返回 `404` |
| 页面渲染 | 主页面正常展示，无白屏、无 JS 报错 |
| 双主题 | 深色 / 浅色主题各一张截图，文字与背景均清晰可辨 |

截图存入 `.preview/` 目录，向用户展示并逐项说明结论。

## 命令

```bash
pnpm install          # 安装 devDependencies（官方索引校验器、semver）
pnpm test             # scripts/check-plugins.mjs + scripts/validate-index.mjs
pnpm run release      # 为 HEAD 追加版本条目到 index.json 并提交
pnpm run release --dry-run
pnpm run validate     # 仅检查索引（也打印安装目标）
```

本地工具（读取真实会话日志，不进 CI）：

```bash
node tools/verify-render.mjs   # payload 不变量 + 针对 ~/.dsh 的无头渲染检查
node tools/preview.mjs         # 静态面板预览 -> .preview/session-stats.html
node tools/preview.mjs --theme light|dark --mode model|type --hover N|none --out <path>
```

需要 `zstd`。截图方式：用无头浏览器打开预览文件，例如：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
--screenshot=/abs/path.png --window-size=1180,2400 file:///abs/path/.preview/session-stats.html
```

CI（`.github/workflows/validate.yml`）在每次 push 和 PR 时跑 `pnpm install --frozen-lockfile && pnpm test`。红检查会阻塞发布。

## UI：先读 DESIGN.md

[DESIGN.md](DESIGN.md) 是所有 UI 插件的唯一真源：设计 token、字号阶梯、页面骨架、按钮 / 图标按钮 / Tab / 弹窗 / Tooltip、图标集、交互状态、文案与交付前清单。它与插件自己的 `DESIGN.md` 冲突时，以本文件为准。不要自造第二套按钮、Tooltip 或弹窗实现——从 DESIGN.md 复制规格，只用 `--dsw-*` token。

## 相关文档（开工前请阅读）

- 有 UI → 先读 `DESIGN.md`，再读 `docs/plugin-ui-playbook.md`（UI 实现陷阱与真实踩坑）
- 多轮迭代 → 读 `docs/agent-iteration-playbook.md`（迭代流程与提速经验）
- 历史踩坑速查 → 读 `docs/PITFALLS.md`（坑记录表，格式：坑 → 原因 → 防护）
- 新建插件 → 参考 `plugins/session-stats/CONTRACT.md`（slots / routes / locale / theme token 契约）

## pnpm test 强制的不变量

- `plugins/<slug>/package.json`：合法 npm 包名、精确 SemVer 版本、`exports["."]`、`dsh.bundle.patch`、`engines.dsh` SemVer 范围。
- bundle patch 插入名为包名的行，row id 唯一。
- Host 半边（`index.js`）：只 import `node:` 内置和相对文件；导出 `name`、`inject`、`apply`。
- 浏览器半边（`client.js`）：注册 `window.__ModuleLoader__.load({ id, factory })`，`id` 等于包名；`require()` 只允许 `react`；不含 `@deepseek-ai/`。
- CSS 样式检查：禁止字面色值（`#hex`、`rgb()`、`rgba()`、`hsl()`），例外为 `--ss-series-*` 图表系列色（DESIGN.md §2.10）；禁止裸 px 字号（必须走 `--ds-fs` 阶梯，DESIGN.md §3.2）；禁止非 none 的 `box-shadow`，例外为 §7.12 拆分按钮 `inset` 分隔线（DESIGN.md §5.8）。
- `locale/en.json` 和 `locale/zh.json` 键集一致且无空值。
- `plugins/<slug>/market.json`：本地化 `title`/`description`（必须含 `en`）、`icon` 路径相对仓库根、`category`/`labels` 必须在根 `market.json` 中声明。
- 不出现绝对家目录路径（`/Users/...`、`/home/...`）。
- 插件可带 `selftest.mjs`，导出 `run(report)`；`pnpm test` 用合成输入运行它，payload 逻辑因此纳入 CI。保持无外部依赖。
- `index.json`：每个插件目录都已列出、每个版本绑定一个存在于 Git 历史的 commit、`repository.url`/`directory` 匹配插件、文档等于从已提交元数据重新生成的结果。

## 新增插件

1. `mkdir plugins/<slug>`；复制已有插件的运行时契约（`plugins/session-stats/CONTRACT.md` 解释了 slots、routes、locale、theme token）。
2. 写 `package.json`，含 bundle 和（如果有 UI）`dsh.client` 块。
3. 加 `market.json` 显示元数据；新 category 或 label 先在根 `market.json` 声明。
4. bundle patch 的 row id 不能与已发布行或其他插件冲突。已发布的 `@deepseek-ai/dsh-web-app` 已用 `session-stats`；本仓库用 `session-stats-panel`。
5. 加 `selftest.mjs`（纯合成 payload 检查）；`pnpm test` 会跑它。
6. `pnpm test`，然后提交新插件。
7. `pnpm run release <slug>` 发布首个版本，然后 `git push origin main`。

## 发布

发布涉及两个注册表：npm 存插件代码，`index.json` 存目录。发布在 CI 跑（`.github/workflows/publish.yml`），因为此账号 2FA 是安全密钥、`npm publish` 只接受 6 位 TOTP——本地无码可输。

1. 在 `plugins/<slug>/package.json` 中升 `version`（必须——npm 拒绝覆盖已发布版本；不随包发布的文件如本仓库的 Markdown 文档不需要升版本）。
2. 提交插件改动。
3. `pnpm run release <slug>`（省略 slug 则处理所有待发布插件）。它为每个插件追加一条版本条目，用 `@deepseek-ai/dsh-plugin-market-index` 校验文档后才写入，只提交 `index.json`。
4. Push，然后在 Actions 标签页跑 **publish** workflow（不确定时先 `dry-run`）。
5. Workflow 跑测试、发布所有注册表中缺失的插件版本、发布目录、然后清 jsDelivr 缓存。如果有已索引的插件版本仍缺失，它拒绝发布目录。

目录在已声明版本已被占用时以 UTC 时间戳发布，所以 CI 不会写回仓库，workflow 可以重跑。

首次发布：可信发布（trusted publishing）要求包已存在，所以先用 `NPM_TOKEN` 仓库密钥引导——一个 **Read and write**（非 `stage only`）且跳过 2FA 的 granular token。四个包都存在后，在 npmjs.com 为每个包添加指向本仓库和 `publish.yml` 的可信发布者，然后删除密钥。

`pnpm run release` 仍拒绝脏树，因为它把 HEAD 记录为 `publishTimestamp` 来源。

## 在真实 Harness 上验证

- 目标 DSH 版本 `>=0.2.1-rc.5 <0.3.0`。已验证版本 `0.2.1-rc.5`（桌面应用；其 `dsh` 树可从 `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar` 只读查看）。
- 从本地目录安装迭代：`plugin_manager action=install_bundle target=<repo>/plugins/<slug>`。
- 安装索引发布的精确版本：`plugin_manager action=install_bundle target=<name>@<version>`——包在 npm 上。
- 安装后刷新 Web GUI，检查侧边栏条目和路由（`401` 表示受保护路由已注册；`404` 表示未安装）。
- profile 自有的 `cordis.patch.yml` 在 bundle 层之后应用，是每机器配置覆盖的文档化位置，升级后保留本地设置。

## 容易忘的约束

- 索引发布到 npm 为 `@chengze/dsh-plugins-market`，通过 `https://cdn.jsdelivr.net/npm/@chengze/dsh-plugins-market/index.json` 读取，返回 `200` 且零重定向（已验证——Harness 拒绝重定向）。走 npm 而非 `raw.githubusercontent.com`，因为 jsDelivr 从注册表拉 npm tarball、不碰 github.com。仓库必须保持公开。
- 无版本号地址解析到 npm `latest`，缓存 7 天，所以 `.github/workflows/validate.yml` 中的 `purge` job 在每次 push 到 `main` 后调 jsDelivr purge 端点。Purge 是尽力而为：被限流时索引仍会在 7 天内生效。
- 相对 `icon` 引用基于索引 URL 解析，所以 `market.json` 的 icon 写成仓库根相对路径（`plugins/<slug>/icon.svg`）。已发布目录通过 `files` 列表打包这些文件，icon URL 留在 npm 包内而非指向 repo host。
- 插件从 npm 安装：`versions[].source` 是 `{"type":"npm"}`，所以安装目标是 `<name>@<version>`。git source 会让 `pnpm` 通过 github.com clone 整个 monorepo，没有 CDN 能加速——不要重新引入。
- 索引版本不可变；用新版本修复错误发布，不要编辑条目。Git source 按 commit 固定；npm 版本不可变因为注册表拒绝覆盖已发布版本。
- `package.json` 中的 `version` 与最新索引版本在插件改动与发布提交之间会有差异；这是正常的。
- UI 插件只用 `--dsw-*` token。数据可视化系列可用面板在 `.ss-page` 上定义的 8 个 `--ss-series-1..8` 颜色；它们存在是因为多模型图表在明暗两种主题下都需要可辨识的色相。
- 浏览器半边只能 `require('react')`。图表的交互部分尽量用 CSS 驱动（趋势 hover 是每日 hit region + `:hover`）；无头测试 shim 能注入 `useState` 值，但不能注入事件。

## UI 实现陷阱与历史踩坑

- 弹窗发光、事件冒泡、字号穿透等 UI 实现陷阱：见 `docs/plugin-ui-playbook.md` §4。
- 多 agent 迭代中出现过的坑（YAML 补丁、客户端状态机、弹窗与交互）：见 `docs/agent-iteration-playbook.md` §4。
- 格式统一的坑记录表（坑 → 原因 → 防护）：见 `docs/PITFALLS.md`。
