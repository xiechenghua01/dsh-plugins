# dsh-plugins

DeepSeek Harness 插件仓库与**插件索引源**：本仓库同时是插件的 Monorepo（每个插件一个目录）
和 Harness 「Discover」页可添加的 plugin market index（format 1）。

A monorepo of DeepSeek Harness plugins **and** a plugin market index source that the Harness
**Discover** page can add.

| 项目 / Item | 值 / Value |
| --- | --- |
| 索引地址 / Index URL | `https://cdn.jsdelivr.net/npm/@chengze/dsh-plugins-market/index.json` |
| 索引格式 / Index format | format 1（`@deepseek-ai/dsh-plugin-market-index` 校验） |
| 仓库 / Repository | <https://github.com/xiechenghua01/dsh-plugins> |
| 兼容 / Compatibility | DSH `>=0.2.1-rc.5 <0.3.0`（各插件在 `engines.dsh` 中声明） |
| 许可 / License | MIT |

## 插件目录 / Plugins

| 插件 / Plugin | 版本 | 说明 / Description |
| --- | --- | --- |
| [`@chengze/dsh-session-stats`](plugins/session-stats) | 1.4.0 | 会话统计面板：token 消耗、会话数、成本与预算、按模型的每日 Token 趋势（可悬停/切换视角）、各会话用量、CPU/内存、日志占用。 Session stats panel: tokens, sessions, cost & budget, per-model daily token trend with hover and view toggle, per-session usage, CPU/memory, log footprint. |

## 使用 / Usage

### 1. 把本仓库加为插件索引源（推荐）

1. 打开 Harness 的 **插件（Plugins）** 页。
2. 在 **Experimental plugins** 一栏点 **更多（More）**，打开 **Custom plugin markets**。
   开启后插件页出现 **Installed** / **Discover** 两个标签。
3. 在 **Discover** 中添加索引地址：

   ```text
   https://cdn.jsdelivr.net/npm/@chengze/dsh-plugins-market/index.json
   ```

4. 在 Discover 里选择插件安装。插件本身也已发布到 npm，Harness 会把索引里的版本解析成
   一个普通的包安装目标，再交给 `plugin_manager`：

   ```text
   @chengze/dsh-session-stats@1.4.0
   ```

### 2. 直接把安装目标交给 `plugin_manager`

```text
plugin_manager action=install_bundle target=@chengze/dsh-session-stats@1.4.0
```

当前版本对应的完整 target 见索引 JSON 的 `versions[].source`，或运行 `pnpm run validate` 打印。

### 3. 本地开发目录

```text
plugin_manager action=install_bundle target=/absolute/path/to/dsh-plugins/plugins/session-stats
```

## 仓库结构 / Layout

```text
design.md                       # 插件设计规范：token、字号、组件、图标、交互（UI 插件必读）
market.json                     # 索引标题、分类、标签、仓库地址（索引生成的输入）
index.json                      # 生成的插件索引（format 1）；不要手改
plugins/<slug>/                 # 一个插件一个目录，目录本身就是包根
  package.json                  # 包名、版本、engines.dsh、dsh.bundle / dsh.client
  market.json                   # Discover 展示元数据（标题、描述、图标、分类、标签、关键词）
  cordis.patch.yml              # bundle 的行插入（Host 行 + 客户端行）
  index.js                      # Host 半边（只 import node: 内置模块）
  client.js                     # 浏览器半边（window.__ModuleLoader__，只 require('react')）
  locale/{en,zh}.json           # 插件管理器展示用文案
  icon.svg
  README.md
  CONTRACT.md                   # 实现契约与平台细节（本插件）
scripts/
  release.mjs                   # 发布：把当前 HEAD 固定进索引并提交 index.json
  validate-index.mjs            # 校验 index.json 与仓库一致、commit 存在
  check-plugins.mjs             # 插件静态检查（结构、导出、locale、绝对路径等）
market.json                     # 见上
.github/workflows/validate.yml  # push / PR 自动跑 pnpm test
```

## 开发与发布 / Development & release

需要一个 DSH `0.2.1-rc.5` 安装来实测插件；仓库脚本只依赖 Node 22+ 与 pnpm。

```bash
pnpm install          # 安装校验用 devDependencies
pnpm test             # = check-plugins + validate-index
```

发布一个插件的新版本（代码进 npm，索引进 index.json，发布由 CI 执行）：

```bash
# 1. 改插件代码，并把 plugins/<slug>/package.json 的 version 升级；提交
git add -A && git commit -m "feat(session-stats): ..."

# 2. 生成并提交 index.json
pnpm run release session-stats

# 3. 推送到 main
git push origin main
```

4. 到 GitHub Actions 里手动运行 **publish** workflow（不确定就先勾 `dry-run`）。

发布放在 CI 里，是因为本账号的 2FA 只有安全密钥：`npm publish` 只接受 6 位 TOTP，终端里没有码可输。workflow 会跑测试、补齐 registry 上缺失的插件包、再发索引包，最后刷新 jsDelivr 缓存。

`pnpm run release` 的行为：

- 工作区必须干净（索引记录 HEAD 作为发布时的 commit）；
- npm 条目以版本号为准：版本已在索引里就是 no-op，要发布新内容必须先升版本
  （npm 也会拒绝覆盖同版本）；
- 用 Harness 自己的 `@deepseek-ai/dsh-plugin-market-index` 校验生成的索引，失败不落盘；
- 追加版本条目后提交 `index.json`，并打印每个新版本的 `plugin_manager` 安装目标。

只预览不写文件：`pnpm run release --dry-run`；写文件但不提交：`--no-commit`。

publish workflow 内部调用 `pnpm run publish:npm`：先补齐 registry 上缺的插件包，再发索引包；如果 `index.json`
指向了 registry 上不存在的版本，它直接拒绝，避免把坏索引推上线。索引包若遇到版本已占用，会自动改用 UTC
时间戳发布，所以 CI 不需要往仓库里回写版本号。

首次发布需要先在仓库 Settings → Secrets 里配置 `NPM_TOKEN`：一个勾了 **Read and write**（不是
`stage only`）+ bypass 2FA 的 granular token。四个包都发出去之后，到每个包的 npm 设置里添加
trusted publisher（指向本仓库与 `publish.yml`），然后删掉这个 secret —— 之后全程走 OIDC，无需长期令牌。

新增插件：复制一个 `plugins/<slug>/` 为模板，改 `package.json` / `market.json` /
`cordis.patch.yml` / `client.js` 里的包名与行 id，补 `engines.dsh`，然后提交并用
`pnpm run release` 发布首版。带 UI 的插件必须先读 [design.md](design.md) 并遵守其中的
token、字号、按钮/弹窗/Tooltip 与图标规格，不要自创第二套样式。详细约定见
[AGENTS.md](AGENTS.md) 与各插件的 `CONTRACT.md`。

## 注意 / Notes

- 索引里的版本以 npm 版本为身份，已发布版本不可变（registry 拒绝覆盖同版本）；要撤换代码请发新版本。
- 索引是一个 npm 包（`@chengze/dsh-plugins-market`），经 jsDelivr 从 npm registry 取，
  直接 200、不 redirect，满足 Harness 的要求。地址不带版本号时走 npm 的 `latest`，默认缓存
  7 天；CI 在推送到 `main` 后会调用 purge 端点刷新，通常几分钟内生效。
- 插件本身也是 npm 包，安装就是 `pnpm add <name>@<version>`，走安装端配置的 registry。
  不再克隆整个仓库，也不再依赖 github.com 的可用性。
- 本仓库必须保持 **public**：索引通过匿名 https 读取；私有仓库需要凭据，Discover 不会带凭据。
- 索引 `name`、`version`、`repository` 是索引的声明；真正装上的内容以被安装包的 manifest 为准。
