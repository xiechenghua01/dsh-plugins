# 会话统计 / Session Stats

DeepSeek Harness Web GUI 的会话统计面板：基于本机真实会话日志的 token 消耗、会话数量、
按用量估算的成本与预算、token 时间线、各会话用量、CPU/内存运行状态与日志占用。

A statistics panel for the DeepSeek Harness Web GUI, derived from the machine's real session
logs: token usage, session counts, estimated cost and budget, a token timeline, per-session
usage, CPU/memory runtime, and log footprint.

- 包名：`@xiechenghua01/dsh-session-stats`，属于 [dsh-plugins](../../README.md) 仓库与插件索引源
- 面板入口：左侧栏「会话统计」图标（`sidebar.panellist`，order 20）→ 主面板 `main` / key `session-stats`
- 数据来源：`ctx.sessionQuery` 读取的会话日志 + `ctx.sessionPersistence` 的日志体积 + `process`/`os` 采样
- 两个受连接鉴权保护的路由：`GET /session-stats/overview`、`GET /session-stats/system`
- 零 npm 依赖、无构建步骤；Host 半边只 import `node:` 内置模块
- `engines.dsh`：`>=0.2.1-rc.5 <0.3.0`

## 安装

### 通过插件索引源（推荐）

1. 在 Harness 的 **插件（Plugins）** 页 → **Experimental plugins** 旁的 **更多（More）**
   打开 **Custom plugin markets**。
2. 在 **Discover** 标签中添加索引地址：

   ```text
   https://raw.githubusercontent.com/xiechenghua01/dsh-plugins/main/index.json
   ```

3. 在 Discover 里找到 **Session Stats** 安装。

### 直接给出安装目标

索引里每个版本都固定到 commit，可把下面的 target 交给 `plugin_manager`：

```text
plugin_manager action=install_bundle target=git+https://github.com/xiechenghua01/dsh-plugins.git#<40 位 commit>&path:/plugins/session-stats
```

`pnpm run release` 会打印当前版本对应的完整 target；也可在索引 JSON 的
`versions[].source` 里查到同一个 commit。

### 本地开发目录（开发态，改动即时生效）

```text
plugin_manager action=install_bundle target=/absolute/path/to/dsh-plugins/plugins/session-stats
```

> 旧版本以 `@local/session-stats` 名称安装过时，请先
> `plugin_manager action=remove_bundle target=@local/session-stats`，再安装本包；
> 两者使用同一个行 id `session-stats-panel`，同时安装会冲突。

安装后：

1. 确认返回 `application: applied` 且 `warnings` 为空；若返回 `restart-required` 则重启 Harness。
2. 刷新 Web GUI，左侧栏出现「会话统计」图标，点击打开面板。
3. 卸载：`plugin_manager action=remove_bundle target=@xiechenghua01/dsh-session-stats`。

## 配置

可调项写在 bundle 自己的 `cordis.patch.yml` 的 `config` 里（改完重装或重启生效）：

```yaml
- insert:
    - id: session-stats-panel
      name: '@xiechenghua01/dsh-session-stats'
      config:
        days: 30                                  # 时间线窗口（1..365）
        budget: { amount: 10, currency: USD, period: monthly }  # monthly|weekly|daily|total
        pricing:
          default: { input: 0.28, output: 0.42, cacheRead: 0.028, cacheWrite: 0.28 }  # USD / 百万 token
          models:
            deepseek-flash: { input: 0.28, output: 0.42, cacheRead: 0.028 }
        overviewCacheMs: 15000
        systemCacheMs: 1000
        logCacheMs: 10000                         # 目录遍历单独缓存
        sampleMs: 2000                            # CPU 采样间隔
```

> 行 id 必须是 `session-stats-panel`：官方 `@deepseek-ai/dsh-web-app` 已有一行
> `session-stats`（`@deepseek-ai/dsh-session-stats`），重名会把官方行顶掉。
> 安装后如需按机器覆盖配置，可在 profile 自己的 `cordis.patch.yml` 里按行 id 覆盖
> `config`（bundle 层之后应用），这样升级插件不会丢失本机配置。

## 注意

- 面板统计的是**本机** `~/.dsh`（或 `DSH_HOME`）下的会话与日志，不是远端或账号级数据。
- 成本是**估算值**：按上面配置的单价对每个 `assistant/message` 的 `usage` 计算，
  与真实账单可能有差异（缓存命中率、阶梯价、赠送额度等）。
- 日志体积包含会话日志、`storages`、`attachments`、`spill` 四部分，目录遍历有
  20k 条目 / 2 秒上限，超出部分不计入。

## 验证

```bash
node --check index.js && node --check client.js
node -e "import('./index.js').then(m => console.log(Object.keys(m).sort()))"
```

安装后在 Harness 会话里用 `cordis_inspect_query`（Client `Slots.listSubTree`）确认
`main` 槽位有 `session-stats` 占用者、`sidebar.panellist` 有 `id: session-stats`；
用未鉴权的 `curl` 访问 `/session-stats/overview` 应返回 `401`（已注册且被鉴权门保护），
未安装时是 `404`。

实现契约与平台细节见 [CONTRACT.md](CONTRACT.md)。
