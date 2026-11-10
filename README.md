# dsh-plugins

DeepSeek Harness 插件仓库与**插件索引源**：本仓库同时是插件的 Monorepo（每个插件一个目录）
和 Harness 「Discover」页可添加的 plugin market index（format 1）。

A monorepo of DeepSeek Harness plugins **and** a plugin market index source that the Harness
**Discover** page can add.

| 项目 / Item | 值 / Value |
| --- | --- |
| 索引地址 / Index URL | `https://cdn.jsdelivr.net/gh/xiechenghua01/dsh-plugins@main/index.json` |
| 索引格式 / Index format | format 1（`@deepseek-ai/dsh-plugin-market-index` 校验） |
| 仓库 / Repository | <https://github.com/xiechenghua01/dsh-plugins> |
| 兼容 / Compatibility | DSH `>=0.2.1-rc.5 <0.3.0`（各插件在 `engines.dsh` 中声明） |
| 许可 / License | MIT |

## 插件目录 / Plugins

| 插件 / Plugin | 版本 | 说明 / Description |
| --- | --- | --- |
| [`@xiechenghua01/dsh-session-stats`](plugins/session-stats) | 1.1.11 | 会话统计面板：token 消耗、会话数、成本与预算、按模型的每日 Token 趋势（可悬停/切换视角）、各会话用量、CPU/内存、日志占用。 Session stats panel: tokens, sessions, cost & budget, per-model daily token trend with hover and view toggle, per-session usage, CPU/memory, log footprint. |

## 使用 / Usage

### 1. 把本仓库加为插件索引源（推荐）

1. 打开 Harness 的 **插件（Plugins）** 页。
2. 在 **Experimental plugins** 一栏点 **更多（More）**，打开 **Custom plugin markets**。
   开启后插件页出现 **Installed** / **Discover** 两个标签。
3. 在 **Discover** 中添加索引地址：

   ```text
   https://cdn.jsdelivr.net/gh/xiechenghua01/dsh-plugins@main/index.json
   ```

4. 在 Discover 里选择插件安装。Harness 会把索引中的版本解析成固定 commit 的安装目标，
   再交给 `plugin_manager`：

   ```text
   git+https://github.com/xiechenghua01/dsh-plugins.git#<40-hex commit>&path:/plugins/<plugin>
   ```

### 2. 直接把安装目标交给 `plugin_manager`

```text
plugin_manager action=install_bundle target=git+https://github.com/xiechenghua01/dsh-plugins.git#<commit>&path:/plugins/session-stats
```

当前版本对应的完整 target 见索引 JSON 的 `versions[].source`，或运行 `pnpm run validate` 打印。

### 3. 本地开发目录

```text
plugin_manager action=install_bundle target=/absolute/path/to/dsh-plugins/plugins/session-stats
```

## 仓库结构 / Layout

```text
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

发布一个插件的新版本（索引把版本固定到 commit，所以分两步）：

```bash
# 1. 改插件代码，并把 plugins/<slug>/package.json 的 version 升级；提交
git add -A && git commit -m "feat(session-stats): ..."

# 2. 生成并提交 index.json（固定到刚才那个 commit），然后推送
pnpm run release session-stats
git push origin main
```

`pnpm run release` 的行为：

- 工作区必须干净（索引固定的是 HEAD，先把插件改动提交）；
- 已发布版本是 no-op（同一 commit，或该版本后插件随包发布的文件没有改动）；
  同一版本下改动过可安装文件会拒绝，要求先升版本（只改 README/CONTRACT 等文档不算）；
- 用 Harness 自己的 `@deepseek-ai/dsh-plugin-market-index` 校验生成的索引，失败不落盘；
- 追加版本条目后提交 `index.json`，并打印每个新版本的 `plugin_manager` 安装目标。

只预览不写文件：`pnpm run release --dry-run`；写文件但不提交：`--no-commit`。

新增插件：复制一个 `plugins/<slug>/` 为模板，改 `package.json` / `market.json` /
`cordis.patch.yml` / `client.js` 里的包名与行 id，补 `engines.dsh`，然后提交并用
`pnpm run release` 发布首版。详细约定见 [AGENTS.md](AGENTS.md) 与各插件的 `CONTRACT.md`。

## 注意 / Notes

- 索引里的版本固定到 40 位 commit SHA，因此已发布版本不可变；要撤换代码请发新版本。
- 索引经 jsDelivr 分发（`cdn.jsdelivr.net`），直接返回 200、不 redirect，满足 Harness 的要求。
  `@main` 是分支地址，默认缓存 12 小时；CI 在推送到 `main` 后会调用 purge 端点刷新，通常
  几分钟内生效。已发布版本固定到 commit，不受影响。
- 本仓库必须保持 **public**：索引通过匿名 https 读取；私有仓库需要凭据，Discover 不会带凭据。
- 索引 `name`、`version`、`repository` 是索引的声明；真正装上的内容以被安装包的 manifest 为准。
