# MCP 服务插件验收清单

A–C 是已修复行为的回归基线。2026-11-12 用户确认五项建议后，本次范围为 D 节的规范收敛、必要实现与 0.8.0 本地版本准备；不扩大到其它插件或无关 backlog。

## A. 列表分隔线

| 编号 | 判据 | 证据要求 |
|---|---|---|
| A1 | `.mm-row` 与 `.mm-skeleton-row` 的 `border-bottom` 使用 `--dsw-alias-border-l2`，宽度 `.5px` | `src/client/90-styles.js` 行号；浏览器 `getComputedStyle` 颜色 |
| A2 | 深色主题实际颜色与宿主设置页行分隔线一致（实测宿主 `rgba(255,255,255,0.12)`） | 选择器 `.mm-row` + 宿主 `[role="dialog"]` 内 0.5px 行 |
| A3 | 浅色主题同样清晰可辨，未误改页头/弹窗/工具列表边框 | 浅色主题 `getComputedStyle` + 截图 |

## B. 列表工具数据刷新

| 编号 | 判据 | 证据要求 |
|---|---|---|
| B1 | Host `state.rows[]` 含 `registeredTools: [{name, description}]`，来自 `ctx.tools.schemas()` 的 `mcp__<server>__<tool>`；异常时为空数组 | `index.js` 行号 + `mcp-manager/api` state 返回样例 |
| B2 | `toolCount` 优先级：成功 probe > `registeredTools.length` > `null`；不改变 `lastProbe` 与 probeCache 语义 | `index.js` 行号 |
| B3 | 客户端 `toolNamesOf` 在无 `lastProbe` 时仍合并 `registeredTools`、auto、disabled；`toolDescriptionsOf` probe 优先；`toolCountOf` 有 registered 兜底；`probedToolsFromRow` 追加 registered | `src/client/01-helpers.js`、`10-draft.js` 行号 |
| B4 | 列表页页头新增“刷新列表”图标按钮；只重新拉 state，不触发 probeAll；refreshing 时旋转、busy 时禁用 | `61-page-header.js`/`60-page.js` 行号；浏览器按钮 aria-label |
| B5 | 关闭编辑弹窗后立即刷新列表；在详情执行“测试连通性”后，列表展开区能显示工具徽章 | 浏览器实测：编辑弹窗结果 + 关闭后 `.mm-tool-badge` 文本 |
| B6 | `page.refresh` 中英键一致、非空、被引用；`pnpm test` 通过 | locale 行号 + test 输出 |

## 排除项

- 不重写 Host MCP 连接、配置序列化、权限语义或工具注册机制。
- 不重排已有 MCP 表单、导航、操作按钮或工具明细。
- 不修改其它插件、它们的文档与运行设置。
- 不自动推送 Git、不执行 npm 发布或 CI 发布；发布目录更新按独立发布流程进行。
- 不扩大到列表方向键、全仓库 UI 原语重构等无关 backlog。

## 收敛预算

2 轮：实现 → Codex 验收 → 主 agent ego lite 走查；P0/P1 清零即收敛，P2 记录不阻塞。

## C. 编辑弹窗覆盖设置面板（2026-11-12 追加）

| 编号 | 判据 | 证据要求 |
|---|---|---|
| C1 | MCP 新增/编辑显式选择 `mode: 'cover-host'`：位置、宽高跟随外层 `[role="dialog"]` 设置面板并限制在视口内；标准/确认弹窗不能因非 confirm 就自动覆盖 | `src/client/16-dialog.js` 与 `44-editor-dialog.js` 行号；浏览器 `.mm-dialog` 与宿主 `[role="dialog"]` 的 `getBoundingClientRect()` |
| C2 | 确认弹窗仍为固定 480px，不随宿主面板变化 | 浏览器删除确认弹窗宽度 |
| C3 | 窄视口/窗口 resize 时弹窗重新测量，不溢出视口；编辑内容仍可滚动 | `resize` 后测量 + 截图 |
| C4 | 文档同步：DESIGN 选择 cover-host 模式，CONTRACT 记录运行时边界；公共尺寸与视觉规格只在根 design.md 维护 | 文件行号 |

## D. 五项建议正式收敛（2026-11-12）

先修正规则，再完善必要实现；至少一轮 Claude Code 实现与独立 Codex 审核，主 agent 负责构建、真实 GUI 回归与最终 diff。实现/验收最多三轮，不以通过静态检查代替实机结论。

| 编号 | 冻结判据 | 证据要求 |
|---|---|---|
| D1 | 根 design.md §2.2/§7.6 与 playbook 一致：普通弹窗（含设置页内嵌）默认 `--dsw-alias-bg-layer-2`；禁止固定 850 充当主题背景；遮罩按入口单独决定，MCP 保持透明 | 文档行号，深浅主题背景计算值 |
| D2 | §7.6 分标准与 cover-host 两种模式；覆盖模式必须显式选择；MCP 新增/更新选择覆盖，确认保持标准 480 档；覆盖模式无有效宿主时回退 640 档，不把设置页内容列宽度混同外框宽度 | 文档行号、真实 Dialog 代码/测试、新增/更新/确认实机矩形 |
| D3 | 覆盖模式的位置及宽高跟随宿主和视口；标准模式不得测量宿主；尺寸缺失或无效可用回退，不出现负数/NaN；新增监听/观察器卸载清理；保持现有焦点、Escape、滚动及无阴影行为 | 合成边界测试及 resize、双主题实机；不写入真实 MCP 配置 |
| D4 | §7.9 将 44–56px 限于常规字号的单行紧凑项参考；双行条目自然高度，工具展开区另计；MCP 不锁死 82px、不压到 56px、不缩小字号；输入/按钮规格不随条目放大 | 文档、样式、12/14/20 字号下基础行/展开行计算值 |
| D5 | 主管理列表全量可访问并由容器滚动；5 条预览/查看全部仅供摘要场景；MCP 不加查看更多、不修改分页或截断工具数据；保留搜索、刷新和三个行内操作 | 文档、ServerList 合成 >5 条数据回归、GUI 搜索/刷新/工具展开 |
| D6 | 设置页行分隔线与宿主等价项一致（当前 MCP `.5px border-l2`），公共规则写明语义条件，不将所有列表一律升级 l2 | 文档、CSS 和已有 A 节回归 |
| D7 | 主规范、playbook、MCP DESIGN/CONTRACT/README 不再互相宣称冲突；历史表中 MCP 的过期数值纠正，其他插件行不擅自改；必要的公共模式扩展不是永久偏离白名单 | 交叉文档检索和 diff |
| D8 | 语法、生成产物一致性、插件自测、仓库 pnpm test 全通过后将 MCP 本地版本准备为 0.8.0；文档明确区分待发布与已发布，不覆盖旧索引条目；规范提交与插件提交分开 | 命令输出、manifest、Git 提交范围；不 push、不 npm publish |

实机证据记录到同目录 `verification-0.8.0.md`；未覆盖项如实列出。
