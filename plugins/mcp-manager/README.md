# MCP 服务管理 / MCP Manager

在 **设置 → MCP 服务** 一页里管理 DeepSeek Harness 的 MCP 服务器：全局（home 层）与工作区
（当前 profile 层）两层，新增、编辑、启用/停用、删除、连通性测试、JSON 导入导出，以及一个
**全机共享的服务器库**——在 A 工作区配好的服务器，B 工作区一键复用，不用再输一遍。

A single Settings page (`设置 → MCP 服务`) for the MCP servers of this Harness: global
(home-layer) and workspace (profile-layer) servers, add / edit / enable / disable / delete,
live connection tests, JSON import and export, and a machine-wide server library that makes one
configured server reusable from any other layer without retyping it.

---

## 功能 / Features

| 能力 | 说明 |
|---|---|
| 两层作用域 | **全局** = `$DSH_HOME/cordis.patch.yml`（本机所有 profile 生效）；**工作区** = 当前 profile 的 `cordis.patch.yml` |
| 筛选与搜索 | 列表页按 **全部 / 全局 / 工作区** 筛选，并按名称、目标、id 搜索 |
| 增删改 | 结构化表单覆盖全部 MCP 参数；启用/停用写 `disabled`；删除只动自己写的行 |
| 连通性测试 | 主动发起真实 MCP 握手（stdio 启动探测进程 / Streamable HTTP `initialize`），返回成功、耗时、协议版本、工具数与失败原因；可一键测试**所有启用的**服务器 |
| JSON 双向 | 每个服务器可切换 JSON 视图；导入兼容 Claude Desktop / Cursor 的 `{"mcpServers": {...}}`、数组、`servers` 列表与单个对象；导出默认输出同款 `mcpServers` JSON |
| 服务器库 | 任何作用域配置过的服务器自动进入 `$DSH_HOME/mcp-manager/library.json`；其他作用域点「添加到…」即可复用，可改名 |
| 实时状态 | 列表显示 Loader 阶段（已加载 / 未加载 / 加载失败）与已注册工具数；写入 patch 后由 HMR 自动重载，页面轮询刷新 |
| 安全边界 | 同源 + JSON content-type 校验；只改自己拥有的 `insert` 行，文件其余字节（注释、其他插件的行）原样保留 |

## 安装 / Install

本插件随本仓库的插件索引发布：

```text
plugin_manager action=install_bundle target=git+https://github.com/xiechenghua01/dsh-plugins.git#<commit>&path:/plugins/mcp-manager
```

或把本仓库加为 Discover 的插件索引源后安装。本地开发目录也可直接安装：

```text
plugin_manager action=install_bundle target=/absolute/path/to/dsh-plugins/plugins/mcp-manager
```

装完**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可在设置里看到「MCP 服务」。

> 与第三方 `@xxxyz/dsh-mcp-manager` 功能重叠：两者都会改写同一批 MCP Loader 行，建议只保留一个。

## 使用 / Usage

打开 **设置 → MCP 服务**：

1. **新增服务器**：选择作用域（全局 / 工作区），填写 `serverName`、传输方式与对应字段；
   高级选项里可设置超时、启动失败策略、说明字节上限与重连参数。保存后写入对应 patch 层，
   HMR 自动重载。
2. **编辑 / 启停 / 删除**：每张卡片右侧的操作按钮。停用只写 `disabled: true`，配置保留。
3. **测试连通性**：卡片上的「测试」按钮测试单个服务器；顶部「测试全部启用的」并发测试所有
   未停用的服务器。测试不依赖 Loader 状态，未加载或已停用的服务器也能测。
4. **JSON**：卡片上的「JSON」按钮查看/粘贴单个服务器的 JSON；底部「导入 / 导出」区支持整份
   `mcpServers` JSON 批量导入到指定作用域。
5. **服务器库**：页面底部列出本机配置过的所有服务器及其来源。点「添加到…」选择目标作用域
   即可复用（可选改名），无需重新输入。

### 作用域与文件

| 作用域 | 文件 | 生效范围 |
|---|---|---|
| 全局 global | `$DSH_HOME/cordis.patch.yml` | 本机所有 profile（优先级高于 profile 层） |
| 工作区 workspace | `$DSH_PROFILE_DIR/cordis.patch.yml` | 当前 profile |

`$DSH_HOME` 默认 `~/.dsh`；`$DSH_PROFILE_DIR` 是当前 profile 目录。同一个 `serverName`
不能在两层同时存在（后加载的一行会失败），页面会在出现这种情况时给出警告。

### 工作目录归属

作用域选「工作区」时，可以在同一行选择**一个或多个工作目录**（来自 Harness 的工作区列表）。
这份归属关系存在服务器库条目里，用于列表展示与跨工作区复用；它是**组织元数据**，不是 Loader
作用域——DSH 的 MCP 行按 profile 生效，对当前 profile 的所有会话都可用。需要「只在某些目录
生效」时，请为不同 profile 分别配置。

服务器库文件：`$DSH_HOME/mcp-manager/library.json`（含完整配置，包括 env / headers 里的凭据，
以及每个服务器的工作目录归属）。

### 结构化配置字段

| 字段 | 适用 | 说明 |
|---|---|---|
| `serverName` | 全部 | `[A-Za-z0-9_-]{1,32}`，工具名前缀 `mcp__<serverName>__` |
| `transport` | 全部 | `stdio` 或 `streamable-http` |
| `command` / `args` / `env` / `cwd` | stdio | 可执行文件、参数、额外环境变量、工作目录 |
| `url` / `headers` | streamable-http | 端点与额外请求头 |
| `toolCallTimeoutMs` | 全部 | 单次工具调用超时，默认 60000 |
| `maxInstructionBytes` | 全部 | 服务器说明最大字节数，默认 32768 |
| `failOnStartupError` | 全部 | 首次连接失败时拒绝加载，默认 false |
| `reconnect.enabled` | 全部 | 断线自动重连，默认 true |
| `reconnect.initialDelayMs` | 全部 | 首次重连延迟，默认 500 |
| `reconnect.maxDelayMs` | 全部 | 重连延迟上限，默认 30000 |
| `reconnect.maxAttempts` | 全部 | 连续失败次数上限，默认 10 |

## 兼容性 / Compatibility

- DSH `>=0.2.1-rc.5 <0.3.0`（在 `engines.dsh` 中声明）。
- 依赖 DSH 自带的 `@deepseek-ai/dsh-mcp-client` 行与 HMR 配置监听；插件本身不导入任何
  `@deepseek-ai/*` 包。

## 开发 / Development

```bash
node --check index.js
node --check client.js
node --check lib/patch.mjs
node --check lib/probe.mjs
node --check lib/library.mjs
pnpm test          # 仓库检查 + 本插件 selftest
```

实现契约与 wire 形状见 [CONTRACT.md](CONTRACT.md)。
