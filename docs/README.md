# 文档索引

仓库文档按**插件**分类：每个插件一个目录 `docs/plugins/<插件 slug>/`。

| 插件 | 文档 |
| --- | --- |
| `skill-manager`（Skills 管理模块：技能市场 + 已安装管理） | [docs/plugins/skill-manager/README.md](plugins/skill-manager/README.md) |
| `session-stats` | 暂无 docs；实现契约见 [plugins/session-stats/CONTRACT.md](../plugins/session-stats/CONTRACT.md) |
| `mcp-manager` | 暂无 docs；设计与契约见 [plugins/mcp-manager/DESIGN.md](../plugins/mcp-manager/DESIGN.md)、[CONTRACT.md](../plugins/mcp-manager/CONTRACT.md) |

通用文档（不属于单个插件）：

- [../design.md](../design.md) —— **插件设计规范**：token、字号阶梯、页面骨架、按钮/弹窗/Tooltip、图标集、交互态、文案与开工清单（UI 插件必读，权威性高于单插件 DESIGN）
- [plugin-ui-playbook.md](plugin-ui-playbook.md) —— UI 实现手册：字号联动、Tooltip 层级、事件与槽位陷阱
- [agent-iteration-playbook.md](agent-iteration-playbook.md) —— 多 agent 迭代流程与提速

## 约定

- 插件文档统一放在 `docs/plugins/<slug>/`，内部按 `research/`、`product/`、`design/`、`prototypes/` 分类。
- 跨文档引用优先使用相对路径；仓库级路径写 `docs/plugins/<slug>/...`。
- 文档中的家目录一律用 `~/` 或 `<repo>` 占位，不要提交本机家目录的绝对路径。
- 新增插件文档时，在本索引与插件自己的 `README.md` 中各加一行。