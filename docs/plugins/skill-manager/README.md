# Skills 管理模块（skill-manager）— 文档索引

本目录（`docs/plugins/skill-manager/`）是「DSH Skills 管理模块（技能市场 + 已安装管理）」的调研与产品文档。给不同角色的阅读顺序如下。

## 给 Agent（设计 / 实现 / 评审）

| 顺序 | 文件 | 用途 |
| --- | --- | --- |
| **0** | **[product/skills-manager-prd.md](product/skills-manager-prd.md)** | **产品需求文档 v1.2：本周期的唯一设计输入**（市场 + 按位置管理的已安装模块；交互稿/UI 稿据此产出） |
| 1 | [research/README.md](research/README.md) | **一页事实底板**：10 条 TL;DR、生命周期、API、能力边界、UI 技术要点 |
| 2 | [research/skill-subsystem.md](research/skill-subsystem.md) | Skill 安装/发现/合并/加载机制，含源码路径+行号、API 清单、未验证项 |
| 3 | [research/plugin-ui-architecture.md](research/plugin-ui-architecture.md) | 左侧栏入口 + 全屏面板的精确蓝图与可抄骨架（package/patch/index/client） |
| 4 | [research/ui-patterns.md](research/ui-patterns.md) | 当前 DSH Web UI 实测几何、token、组件规格（暗/亮） |
| 5 | [product/skill-market-index-spec.md](product/skill-market-index-spec.md) | **技能市场索引规范 v1.0**（format 1；第三方开发者可据此发布自己的索引源） |
| 6 | [product/skill-market-index.schema.json](product/skill-market-index.schema.json) · [示例](product/examples/skill-market-index.example.json) | JSON Schema 2020-12 + 完整示例索引 |
| 7 | [research/skill-market-index-research.md](research/skill-market-index-research.md) | 现有 DSH 插件索引机制调研、可复用/不可复用点、技能索引约束 |
| 8 | [design/skill-market-index-implementation.md](design/skill-market-index-implementation.md) | 技能市场索引实现方案：拉取/校验/搜索/安装/更新/状态/路由/测试/里程碑 |

### 旧版（v0，已不作为本版输入，可忽略）

| 文件 | 说明 |
| --- | --- |
| [design/skill-manager-interaction.md](design/skill-manager-interaction.md) | 旧交互稿（按旧范围写的，早于「市场 + 按位置管理」的产品定义） |
| [design/skill-manager-plugin-plan.md](design/skill-manager-plugin-plan.md) | 技术方案草稿（包结构/路由/安全/里程碑，可作为实现参考） |
| [prototypes/skill-manager-ui.html](prototypes/skill-manager-ui.html) · [说明](prototypes/skill-manager-ui.md) | 旧 UI 原型（范围与新版 PRD 不同） |

## 五条最重要的结论

1. Skill 是「注册表 + provider」模型，没有安装器；安装 = 把合法 `SKILL.md` 放进扫描根。
2. 本地发现由 **Agent 预设**挂载（host 层 `skill-filesystem` 被关闭）；cordis/standard 扫项目/用户根，minimal 不挂。
3. 失败是静默的：坏 frontmatter、断链、非法 name 直接消失；管理模块的核心价值是**按位置管理 + 诊断**。
4. 左侧栏入口 = `sidebar.panellist` + `main`（同一个 id/key），不要用 `sidebar.footer.action`。
5. UI 必须只用 `--dsw-*` token，视觉基线取 `research/ui-patterns.md` 的实测值。

## 当前状态

- 调研：完成（含未验证项清单，见各文档末节）。
- 产品文档：v1.2 完成（市场 + 已安装管理 + 来源页，含设计交付要求；默认落点、自动检查更新 + 手动更新策略已确认）。
- 技能市场索引：规范 v1.0 草案 + JSON Schema + 示例 + 实现方案完成，待评审冻结。
- 交互稿 / UI 稿：旧版 v0 仅作参考；本周期由 PRD v1.2 驱动重新出稿。
- 实现：未开始。

## 验证与发布提醒

- 新增插件后先跑 `pnpm test`（结构 / locale 键集 / 行 id / 绝对路径等不变量）。
- 安装：`plugin_manager action=install_bundle target=<repo>/plugins/skill-manager`；刷新后侧栏出现「技能」。
- 路由围栏验证：未认证 `curl` 应得 `401`（`404` = 未注册）。
- 发布：改版本 → 提交 → `pnpm run release skill-manager` → `git push origin main`。
- 文档中的家目录一律用 `~/` 或 `<repo>` 占位，不要提交本机家目录的绝对路径。
