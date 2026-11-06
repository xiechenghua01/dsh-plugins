# @xiechenghua01/dsh-skill-manager

DSH Web GUI 的**技能管理**插件：左侧栏入口 + 全屏面板，按安装位置管理本地技能，
诊断「文件存在但未生效」的技能，并可从符合规范的技能市场索引安装、更新、卸载技能。

- 入口：`sidebar.panellist`（id `skill-manager`，order 20），与 Plugins、自动化任务同级
- 面板：`main`（key `skill-manager`），三个 Tab：**已安装 / 市场 / 来源**
- 兼容：DSH `>=0.2.1-rc.5 <0.3.0`

## 功能

### 已安装

- 按 7 类安装位置分组（项目 100 / 项目共享 200 / 自定义 300 / 预设内置 300 / 用户 400 / 用户共享 500 / 插件内置 600 global）。
- 新建、导入（粘贴 `SKILL.md` / 目录）、编辑（`mtime` 乐观锁）、停用/恢复（移入 `<root>/.disabled/`）、删除。
- 诊断：断链、frontmatter 非法、name 非法、同层 rank 覆盖、跨层覆盖。
- 页内双栏详情：原文预览与在线编辑、文件与 sha256 清单、元信息、预设可见性、单技能诊断。

### 市场

- 索引源（https `index.json`，format 1）：GitHub raw / Pages / 任意静态托管。
- 源管理：添加（先校验预览）、编辑、删除、启用停用、刷新。
- 搜索、分类标签、排序、分页；安装落点选择（默认 `~/.dsh/skills`）与冲突处理。
- **自动检查更新**（启动后 + 每 6 小时 + 页面补检，只读），只提示「可更新」；**更新必须用户手动确认**。

### 来源

- 7 张本地位置卡（路径、rank、层、状态、技能数）。
- 4 张 Agent 预设可见性卡（cordis / standard / ptc / minimal）。
- 市场源管理；优先级与遮蔽规则说明。

## 安装

```bash
# 本地开发
plugin_manager action=install_bundle target=<repo>/plugins/skill-manager
```

刷新 Web GUI 后，左侧栏出现「技能」。卸载：

```bash
plugin_manager action=remove_bundle target=@xiechenghua01/dsh-skill-manager
```

## 开发

```bash
# 浏览器半由片段拼接生成，不要手改 client.js
node scripts/build-client.mjs          # src/client/*.js -> client.js
node scripts/build-client.mjs --check  # 校验产物是否最新
node --check index.js && node --check client.js
pnpm test                              # 仓库不变量（在仓库根执行）
```

实现契约：[docs/plugins/skill-manager/design/implementation-contract.md](../../docs/plugins/skill-manager/design/implementation-contract.md)
产品文档：[docs/plugins/skill-manager/product/skills-manager-prd.md](../../docs/plugins/skill-manager/product/skills-manager-prd.md)
索引规范：[docs/plugins/skill-manager/product/skill-market-index-spec.md](../../docs/plugins/skill-manager/product/skill-market-index-spec.md)

## 安全

- 写操作限定在已知扫描根内，拒绝 `..`、绝对路径注入与符号链接逃逸；先写临时目录再原子 rename。
- 市场安装逐文件校验 `size` 与 `sha256`，`SKILL.md` frontmatter 必须与索引 `name` 一致。
- 只读位置（预设内置 / 插件内置）不提供写操作。
- 只读用户配置的市场源；拒绝 redirect；https 或同源；大小上限。

## License

MIT
