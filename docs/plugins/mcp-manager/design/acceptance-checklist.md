# MCP 服务插件：列表分隔线与工具刷新修复验收清单

范围：只验本次两个用户反馈，不扩展到其它 design.md 条目或既有 backlog。

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

- design.md §7.6 弹窗背景口径争议。
- 行高 82px 与 §7.9 的差异。
- 长列表“查看更多”、列表方向键、其它 backlog。

## 收敛预算

2 轮：实现 → Codex 验收 → 主 agent ego lite 走查；P0/P1 清零即收敛，P2 记录不阻塞。
