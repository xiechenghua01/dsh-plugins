# MCP 服务管理 / MCP Manager

在 **设置 → MCP 服务** 一页里管理 DeepSeek Harness 当前 profile 的 MCP 服务器。列表是单 profile
单列表：Host 返回的当前 profile 行与历史 home 层行都会展示，但不提供全局/工作区筛选、工作区
分组或绑定。支持新增、编辑、启用/停用、删除、在编辑弹窗或页头测试连通性，以及表单 / JSON
两种编辑方式。

A single Settings page (`设置 → MCP 服务`) for the MCP servers of the current profile. The list
is a single profile-scoped list: it shows every row the Host returns, including historical
home-layer rows, but offers no global/workspace filter or workspace binding. It supports add,
edit, enable/disable, delete, connectivity tests from the editor or the page header, and form /
JSON editing.

## 版本状态 / Release status

| 版本 | 状态 | 说明 |
|---|---|---|
| `0.7.5` | 已发布 | npm 与仓库 `index.json` 中当前可安装的版本。 |
| `0.8.0` | 本地版本已准备，待发布 | 本文描述本地 0.8.0 行为；已更新 manifest 并完成本次范围的回归，尚未推送或发布 npm，索引仍保留已发布版本。 |

后续通过独立发布流程更新 `index.json` 与 npm；发布后以索引的 `versions[].source`（或
`pnpm run validate` 输出）为准，不得将本地版本准备等同于市场发布。本文不承诺所有配置参数都会在当前 DSH
版本立即生效，字段支持范围见下文与 [CONTRACT.md](CONTRACT.md)。

---

## 功能 / Features

| 能力 | 说明 |
|---|---|
| 单 profile 列表 | Host 返回当前 profile 行和历史 home 层行，页面统一展示；没有全局/工作区筛选，也不提供工作区绑定 |
| 搜索 | 按名称、命令/URL 摘要、行 id 与协议搜索；完整结果由列表容器滚动，无默认 5 条或「查看更多」 |
| 行内操作 | 固定 3 个：启停、编辑、删除；不设行内测试；只读/无法安全解析的行禁用写操作 |
| 刷新 | 页头「刷新列表」只重新拉取 `state`，不触发 probe |
| 连通性测试 | 编辑弹窗底部测试当前草稿（不保存）；页头「测试所有启用的」并发测试启用且非只读的行，返回耗时、工具数与失败原因 |
| 表单 / JSON | 每个服务器可在表单与 JSON 间切换；两者共用同一草稿与 clean config，JSON 语法错误阻止保存 |
| 工具展开 | 点击「N 工具」展开徽章；工具来源合并 probe、已注册工具与权限配置；数量未知显示 `—`，不冒充 0 |
| 权限标注 | `autoApprove` / `disabledTools` 会写入配置，但当前 DSH 版本的 MCP 客户端尚未读取；界面如实标注 |
| 弹窗 | 新增/编辑使用公共 Dialog 的 `cover-host` 模式，覆盖设置面板；删除确认使用标准模式，不跟随面板 |
| 实时状态 | 列表显示 Loader 阶段与已注册工具数；写入 patch 后由 HMR 自动重载，页面每 4 秒轮询 `state` |
| 安全边界 | 同源 + JSON content-type 校验；只改写 `@deepseek-ai/dsh-mcp-client` 的 `insert` 行，文件其余字节（注释、其他插件的行）原样保留；无法安全解析的行只读 |
| Host API | 服务器库、跨层移动、批量导入/导出等能力仍保留在 Host API（CONTRACT §4、§6），本版本设置页不提供入口 |

## 安装 / Install

当前已发布版本是 `0.7.5`，可从 npm 或本仓库的插件索引安装：

```text
plugin_manager action=install_bundle target=@chengze/dsh-mcp-manager@0.7.5
```

已发布的 0.7.5 界面可能与本文件描述的单 profile / cover-host 行为不同；本文件对应待发布的
0.8.0。0.8.0 的安装目标尚不存在，发布并更新索引后再按索引给出的 target 安装，不要提前使用
`@0.8.0`。本地开发目录可直接安装：

```text
plugin_manager action=install_bundle target=/absolute/path/to/dsh-plugins/plugins/mcp-manager
```

装完**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可在设置里看到「MCP 服务」。

> 与第三方 `@xxxyz/dsh-mcp-manager` 功能重叠：两者都会改写同一批 MCP Loader 行，建议只保留一个。

## 使用 / Usage

打开 **设置 → MCP 服务**：

1. **新增 / 编辑**：页头「新增」打开编辑弹窗；行内「更新配置」打开同一弹窗。表单填写名称、
   传输方式与连接字段；高级设置可改超时、重连次数和远程 OAuth。新增写入当前 profile 的
   `cordis.patch.yml`；编辑沿用行自身的 `level` 与 `id`，历史 home 行仍在 home 层更新。
2. **启停 / 删除**：每行右侧固定 3 个操作。停用只写 `disabled: true`，配置保留；删除只移除
   选中的 MCP `insert` 行，只读行不能写。
3. **刷新与测试**：页头「刷新列表」只重取 `state`；「测试所有启用的」测试启用且非只读的行。
   单条测试只在编辑弹窗底部，测试当前草稿，不落盘。
4. **JSON**：编辑弹窗顶部切换到 JSON；支持常见 `mcpServers` 对象与单服务器对象形状，可粘贴
   示例、复制配置。JSON 与表单共用草稿和清理规则，语法错误会阻止保存。
5. **工具展开**：点击行内「N 工具」查看工具徽章；进入编辑弹窗的高级设置，才可切换默认 / 自动允许 /
   禁用三态。当前 DSH 版本的 MCP 客户端尚未读取 `autoApprove` / `disabledTools`，因此这两项只写入配置，界面会标注。

本版本**没有**批量导入/导出、服务器库、跨层移动或工作区归属的界面；这些 Host API 仍在
[CONTRACT.md](CONTRACT.md) 中保留。单条测试只能从编辑弹窗发起。

### 文件与作用域

| 用途 | 文件 |
|---|---|
| 新增/保存（当前 profile） | `$DSH_PROFILE_DIR/cordis.patch.yml` |
| 历史 home 层行（展示；编辑/删除沿用行自身 `level`） | `$DSH_HOME/cordis.patch.yml` |

`$DSH_HOME` 默认 `~/.dsh`；`$DSH_PROFILE_DIR` 是当前 profile 目录。设置页不提供作用域选择或
筛选：新配置写入当前 profile。如果同名 `serverName` 同时出现在两层，Host 会给出警告（后加载
的一行会失败）。

服务器库文件 `$DSH_HOME/mcp-manager/library.json` 及对应 Host API 仍然存在；本版本页面不展示
服务器库，也不提供工作目录归属编辑。

### 表单字段

| 字段 | 适用 | 说明 |
|---|---|---|
| `serverName` | 全部 | `[A-Za-z0-9_-]{1,32}`，工具名前缀 `mcp__<serverName>__` |
| `transport` | 全部 | `stdio` 或 `streamable-http`；SSE 选项保留但保存时被拦截（当前 DSH 不支持） |
| `command` / `args` / `env` / `cwd` | stdio | 可执行文件、参数（每行一个）、额外环境变量、工作目录 |
| `url` / `headers` | streamable-http | 端点与额外请求头 |
| `toolCallTimeoutMs`（表单「超时」） | 全部 | 1000–3600000 的整数；等于默认 60000 时不写入 |
| `reconnect.maxAttempts`（表单「重连次数」） | 全部 | 1–1000 的整数；未修改时不写入，最终默认值以 CONTRACT §1 为准 |
| `oauth.clientId` / `oauth.scopes` | streamable-http | 写入 `config.oauth`；当前 DSH 客户端不读取 |
| `autoApprove` / `disabledTools` | 全部 | 工具权限配置写入；当前 DSH 客户端不读取 |

表单只暴露上述常用字段。CONTRACT §1 是 Host 接受字段的完整列表；本版本编辑表单不提供
`maxInstructionBytes`、`failOnStartupError` 或完整 `reconnect` 子字段的入口，也不承诺所有参数
都会被当前 DSH 客户端读取或生效。JSON Tab 是按单个服务器节点编辑，不是批量导入器。

## 兼容性 / Compatibility

- DSH `>=0.2.1-rc.5 <0.3.0`（在 `engines.dsh` 中声明）。
- 依赖 DSH 自带的 `@deepseek-ai/dsh-mcp-client` 行与 HMR 配置监听；插件本身不导入任何
  `@deepseek-ai/*` 包。

## 开发 / Development

以下命令在 `plugins/mcp-manager` 目录执行；`pnpm test` 在仓库根目录执行：

```bash
node scripts/build-client.mjs        # src/client/*.js -> client.js（client.js 是生成产物，不要手改）
node scripts/build-client.mjs --check
node --check index.js
node --check client.js
node --check lib/patch.mjs
node --check lib/probe.mjs
node --check lib/library.mjs
pnpm test          # 仓库检查 + 本插件 selftest
```

浏览器半边按职责拆在 `src/client/*.js`，由构建脚本按文件名顺序拼接为 `client.js`；
DSH 模块加载器只提供一个文件，片段之间共享同一 factory 作用域。

实现契约与 wire 形状见 [CONTRACT.md](CONTRACT.md)。
