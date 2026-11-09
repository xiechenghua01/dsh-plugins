# Skills 管理模块 · 交互稿 v3.2
> 版本：v3.2　　日期：2026-11-09　　状态：待评审
> 上一版：v3.1（变更见 §1.2 与 §9）
> 结构输入：`product/v2-ia-decisions.md`（v2.0 基线）+ `product/v2-1-review-decisions.md`（v2.1 增量）+ `product/v2-2-review-decisions.md`（v2.2 增量，冲突时以 v2.2 为准）

---

## 0. 文档边界

- **结构唯一来源**：`product/v2-ia-decisions.md`（v2.0 基线）、`product/v2-1-review-decisions.md`（v2.1 增量）与 `product/v2-2-review-decisions.md`（v2.2 增量）。本文不重新论证 IA，只把决策落成页面、状态、行为与文案。
- **复用范围**：v2.3 的视觉统一规范（图标容器、24 SVG、状态点、升级徽章）、页内双栏详情（`2fr 1fr`）、弹窗分层、tooltip / toast 规范继续有效；与 v2.2 决策单冲突处一律以决策单为准（折叠分组、560px 自定弹窗宽度、管理源抽屉、源上下移按钮等已作废）。
- **不覆盖**：像素级 CSS、组件实现、Host 数据契约。关键尺寸、间距与字号阶梯只给到可供原型实现的数值；颜色只用 `--dsw-*` token 表述。
- **冲突裁决**：本文件 < `v2-2-review-decisions.md` < `v2-1-review-decisions.md` < `v2-ia-decisions.md`；视觉细节 < `implementation-contract.md`（平台约束）。两者冲突时先找 Lead，不自行改结构。
- **版本号**：页面不显示版本号；PRD 2.2 / 交互稿 3.2 / 原型 3.2 各自标注。

---

## 1. 变更摘要

### 1.1 v3.1 相对 v3.0

> 依据：`product/v2-1-review-decisions.md`（v2.1 决策单）。本表只列本轮变更，未提及条目沿用 v3.0。

| # | 类别 | v3.0 | v3.1 | 落点 |
| --- | --- | --- | --- | --- |
| 1 | 二级 Tab | 技能 Tab 内四个折叠分组，默认展开前三组 | 二级 Tab（我的技能 / 共享技能 / 项目技能 / 系统内置），一屏只显示一个分类；计数徽章、记忆上次选择、默认「我的技能」 | §2.1、§3.2、§4.1 |
| 2 | 两列卡片 | 65px / 76px 行式列表 | 技能页与市场页均改为 `repeat(2, minmax(0,1fr))`、`gap: 12px` 的卡片网格；卡片约 96px，右侧竖排「唯一按钮 + `⋯`」 | §2.1、§2.4、§4.2 |
| 3 | 市场按源分组 + 源排序 | 聚合列表，不提供源选择 | 市场按源分区块，区块标题含源名 / 技能数 / `⋯`；管理源抽屉支持上移 / 下移，排序即优先级，影响市场区块与「按来源」排序 | §2.4、§2.6、§4.8 |
| 4 | 状态图标 | 顶部未生效警示条 + 更新细条 | Tab 栏右侧两个图标（警示 / 更新），悬停 300ms 出提示，0 时不显示；点击分别打开诊断抽屉 / 触发更新流程 | §2.8、§4.4 |
| 5 | 弹窗尺寸收敛 | 弹窗 560px、确认 360px 自定值 | 表单 488px、确认 480px、大内容 720px，按 DSH 实测值；圆角 / 边框 / 内部 gap 同步收敛 | §2.7、§4.7、§6.3 |

### 1.2 v3.2 相对 v3.1

> 依据：`product/v2-2-review-decisions.md`（v2.2 决策单）。本表只列本轮变更，未提及条目沿用 v3.1。

| # | 类别 | v3.1 | v3.2 | 落点 |
| --- | --- | --- | --- | --- |
| 1 | 技能页来源分组 | 二级 Tab 内是一整片两列卡片 | 二级 Tab **保留**，Tab 内再按来源分组：每个市场源一组（停用源保留组头并标「已停用」）+ `本地创建` 一组；组头顺序 = 源顺序，`本地创建` 固定最后；空组不渲染、组头不可折叠；系统内置不分组 | §2.1、§3.2、§4.1、§4.10、§7.2 |
| 2 | 工具栏图标化 | 搜索 · 排序 · `+ 新建技能` · `⋯`（导入 / 检查更新在菜单里） | 搜索 · 排序 · **三个 30×30 图标按钮**（新建 / 导入 / 检查更新）；删除工具栏 `⋯` 菜单及对应描述 | §2.1、§2.4、§4.4、§4.5 |
| 3 | 检查更新合并刷新列表 | 「检查更新」与「刷新列表」是两个动作 | 合并为工具栏「检查更新」一个动作：检查所有源并重新拉取列表；执行中转圈，完成 toast 汇总，失败走行内细条 | §4.4 |
| 4 | 管理源形态 | 右侧 560px 抽屉 | **居中弹窗** `min(720px, 100vw - 32px)`，最大高 `min(720px, 100vh - 96px)`，列表区内部滚动；MS-01～MS-04 重写为弹窗形态 | §2.6、§4.8、§4.9、§6.3 |
| 5 | 源排序 | 上移 / 下移按钮，首末行禁用 | **拖动排序**：整行 `draggable`、行首 16×16 手柄、插入指示线；放下即重排并持久化；键盘替代 `Alt+↑` / `Alt+↓`；删除箭头 | §2.6 MS-05、§4.8、§7.6 |
| 6 | 卡片右侧操作 | 竖排：主按钮在上、`⋯` 在下，`⋯` 常显 | **水平一行**：`⋯` 在左、主按钮在右；`⋯` 默认 `opacity: 0`，卡片 hover / focus-within 时 120ms 淡入；保留占位，不引起位移 | §4.2、§6.3 |
| 7 | tooltip 选择器 | 原型 `#sm-tooltip` 与元素 `id="tooltip"` 不匹配 | 统一为 `#tooltip`；本稿补充 tooltip 挂载与 300ms 行为，避免实现再次分叉 | §4.2、§6.1 |
| 8 | 画面数更正 | 标题写 33 屏，实列 35 屏 | 按实际条目更正为 **34 屏**：删除与 DL-02 重复的 DL-07（工具栏 `⋯` 导入），原 DL-08 顺延为 DL-07 | §2、§9 |

### 1.3 v3.0 相对 v2.3（归档）

#### 1.3.1 总览

| 类别 | 项数 | 一句话 |
| --- | --- | --- |
| 删除 | 17 | 撤掉实现者维度的筛选、内部机制字段与重复入口 |
| 降级 | 6 | 保留能力，但从一级页面 / 主视觉位置退到抽屉、详情与诊断中 |
| 新增 | 12 | 两 Tab、四分组、整行折叠、统一诊断话术、管理源抽屉、全部更新等 |
| 保留 | 6 | v2.3 的视觉与详情骨架继续使用 |

#### 1.3.2 删除（17 项）

| # | 删除项 | v2.3 中的位置 | 原因 |
| --- | --- | --- | --- |
| D1 | 「来源」一级 Tab | 顶层 Tab 3 | 源管理成为市场内抽屉；位置机制不再单独成页 |
| D2 | 8 个位置筛选 chips | 已安装列表筛选栏 | 分组已经表达位置；筛选与分组双重表达让用户困惑 |
| D3 | 行内位置标签 | 技能行名称后 | 分组即位置，行内重复 |
| D4 | 「模型可用 / 用户可调用」徽章 | 技能行、详情右栏 | 实现维度信息，不影响用户下一步操作 |
| D5 | 「内置」文字徽章 | 技能行 | 并入「系统内置」分组与「只读」状态，不在每行重复 |
| D6 | rank 数字 | 分组头、详情元信息 | 内部优先级，用户无法据此行动 |
| D7 | layer（preset / global） | 详情元信息 | 同上 |
| D8 | provider | 详情元信息 | 同上 |
| D9 | commit sha | 详情元信息 | 技术标识，仅在排查时出现在诊断「详细信息」 |
| D10 | 遮蔽链 / 「同层」「跨层」术语 | 详情、来源页、诊断 | 改写为「与另一个技能同名，当前生效的是……」 |
| D11 | 自定义目录（custom root）管理 UI | 来源页 | 不提供配置；只读自定义目录按只读技能呈现，路径仅诊断可见 |
| D12 | 索引 format / schema 版本 | 源管理 | 仅在校验失败的错误信息里出现 |
| D13 | 来源页的优先级规则说明 | 来源 Tab | 用户不需要先读规则；诊断直接给结论和动作 |
| D14 | 详情「文件与资源清单（大小 / sha256）」 | 详情左栏 | 与「我该怎么用 / 为什么没生效」无关；原文预览足够 |
| D15 | 详情「单技能诊断状态卡」 | 详情右栏 | 诊断统一收进诊断抽屉，避免两套问题入口 |
| D16 | 详情「复制调用命令」按钮 | 详情头部操作区 | IA 的操作集合只保留停用 / 删除 / 卸载 / 更新 |
| D17 | 「已停用」独立折叠组 | 已安装列表底部 | 已停用技能留在原分组内，行内降低对比度 + 徽章 |

#### 1.3.3 降级（6 项）

| # | 能力 | v2.3 | v3.0 | 原因 |
| --- | --- | --- | --- | --- |
| G1 | 市场源管理 | 一级 Tab | 市场 Tab 内「管理源」抽屉 | 排查工具不与「技能」「市场」同级 |
| G2 | 预设可见性 | 详情常驻矩阵（cordis / standard / ptc / minimal） | 仅在诊断解释「为什么没生效」时按需出现 | 大多数用户不需要先理解预设 |
| G3 | 文件路径 | 分组副标题常驻路径 | 仅详情「文件位置」可复制 | 分组副标题只写人话 |
| G4 | 更新检查 | 顶部信息条 + 常驻按钮 | 顶部细条 + 工具栏 `⋯` →「检查更新」 | 降低噪音，保留可达性 |
| G5 | 导入入口 | 工具栏入口 | `⋯` 菜单项（新建仍是主按钮） | 新建比导入高频，工具栏只留一个主操作 |
| G6 | 已安装状态 | 详情左栏大横幅卡 | 详情右栏一行式状态区（位置 / 版本 / 修改标记） | 减少重复卡片，提高信息密度 |

#### 1.3.4 新增（12 项）

| # | 新增项 | 说明 |
| --- | --- | --- |
| N1 | 两 Tab IA | 只保留「技能 / 市场」，删除「来源」 |
| N2 | 四分组 | 我的技能 / 共享技能 / 项目技能 / 系统内置，替代 7 类位置 |
| N3 | 分组头整行折叠 | 默认展开前三组、内置折叠；折叠状态本地记忆 |
| N4 | 诊断问题卡结构 | 一条问题 = 一个技能 + 一句人话 + 一个修复动作；技术细节默认收起 |
| N5 | 管理源抽屉 | 列表 / 添加 / 删除确认 / 刷新失败四态 |
| N6 | 更新细条 + 全部更新 | 「N 个技能有更新」+ 单个 / 全部更新流程与结果汇总 |
| N7 | 未生效警示条 | 「N 个技能未生效」+「查看原因」进入诊断抽屉 |
| N8 | 市场详情四态 | 未安装 / 已装可更新 / 已装最新 / 不可用 |
| N9 | 已停用原地降低对比度 | 不单独成组，行内徽章 + 详情停用说明 |
| N10 | 排序收敛与记忆 | 仅「按名称 / 最近修改」，切 Tab 与返回详情后保持 |
| N11 | 键盘规范 | 分组头 Enter/Space、`/` 聚焦搜索、Escape 分层关闭、行内 roving tabindex |
| N12 | 空态双出口 | 「去市场看看」+「新建技能」；搜索空态给「清除搜索」 |

#### 1.3.5 保留（6 项）

| # | 保留项 | 复用方式 |
| --- | --- | --- |
| R1 | 图标统一规范 | 49×49 容器、16px 圆角、1px `--dsw-alias-border-l2`、24×24 SVG、左下 8px 状态点 |
| R2 | 页内全宽双栏详情 | `grid-template-columns: 2fr 1fr`，返回后恢复列表滚动位置 |
| R3 | 弹窗规范 | 560px（确认 360px）、20px / 14px 圆角、无阴影、透明遮罩、Escape 只关最上层 |
| R4 | tooltip / toast | tooltip 300ms；toast 4s，可带「撤销」 |
| R5 | 市场行布局 | 49×49 图标 + 名称 / 版本 / 标签 / 描述 + 行尾唯一主操作 |
| R6 | 流程骨架 | 新建 / 导入 / 安装 / 更新 / 卸载 / 删除的既有步骤与确认语义 |

---

## 2. 画面清单（34 屏）

> 编号规则：`SL` 技能列表、`SD` 技能详情、`DG` 诊断抽屉、`ML` 市场列表、`MD` 市场详情、`MS` 管理源弹窗、`DL` 对话框与流程。`SI` 为跨画面状态图标，不计入屏数。
>
> 所有画面共用页面骨架：内容区左右 48px、顶部 28px；标题 `calc(var(--sm-fs) + 2px)` / 1.4 / 500；描述 `calc(var(--sm-fs) - 1px)`、`--dsw-alias-label-secondary`。
> 所有弹窗：无阴影、遮罩透明、`dialogStack` 分层 Escape；宽度按 §6.3 的 488 / 480 / 720 三档（720 档含管理源 `min(720px, 100vw - 32px)`）；颜色全部使用 `--dsw-*` token。

### 2.1 技能列表（SL）

> **来源分组规则（v3.2）**：除「系统内置」外，每个二级 Tab 内的卡片再按来源分组——每个市场源一组（停用的源保留组头并标「已停用」）、`本地创建` 一组。组头 = 源名（`group.source`）/ `本地创建`（`group.local`）+ `{count} 个技能`（`group.count`）；组头顺序 = 管理源弹窗中的源顺序，`本地创建` 固定最后；空组不渲染；组头不可折叠；组内是两列卡片网格。系统内置全部来自 Harness，不分组。

| 编号 | 画面 | 入口 | 关键元素 | 状态 |
| --- | --- | --- | --- | --- |
| SL-01 | 技能列表 · 默认 | 侧栏「技能」；Tab「技能」 | 标题「技能」+ 描述；一级两 Tab（容器 34px）；**二级 Tab** 与一级同一套视觉：我的技能 / 共享技能 / 项目技能 / 系统内置，各带计数徽章，默认「我的技能」，一屏只渲染当前分类；工具栏：搜索 33px、排序、**三个 30×30 图标按钮**（新建技能 / 导入技能 / 检查更新；图标 16px、按钮间距 6px、各自 hover 300ms 出 tooltip）；Tab 栏右侧状态图标（见 §2.8）；**按来源分组的卡片列表**：组头（28px，源名 / 本地创建 + 技能数）+ 组内两列卡片网格 `repeat(2, minmax(0,1fr))` / `gap: 12px`；卡片约 96px、48×48 图标、名称 + 状态徽章、≤2 行描述、右侧**水平** `⋯` + 唯一主按钮（`⋯` 默认隐藏，hover / focus-within 淡入） | 正常；加载见 SL-05；分类空见 SL-04；失败见 SL-06；部分位置不可读时顶部 `banner.partial`，其余列表正常 |
| SL-02 | 技能列表 · 分类切换 | 点击二级 Tab；`←` / `→` | 切换后整屏只显示该分类卡片，并按来源重新分组；**不存在分类级分组头、折叠 chevron 与副标题**（来源组头不属于分类分组，保留）；计数来自列表总数、与筛选无关；选择写入本地记忆，默认「我的技能」；无项目上下文时「项目技能」Tab 不渲染；系统内置只读、不按来源分组，卡片无写操作 | 正常；记忆恢复 |
| SL-03 | 技能列表 · 搜索 | 搜索框输入；`/` 聚焦 | 150ms 防抖；**跨分类**匹配名称、描述、whenToUse；命中后自动切到第一个有结果的分类并保持搜索词；结果在该分类内**按来源分组展示，分组随之过滤，命中为空的分组连同组头一起不渲染**；清除按钮；当前分类无命中但其他分类有命中时自动跳转，不显示空态 | 正常；全部无结果时停留在当前分类，显示 `empty.search` +「清除搜索」 |
| SL-04 | 技能列表 · 空分类 | 当前分类无技能 | 整屏空态，不显示其他分类内容；四类空态都带出口：我的技能「还没有自己的技能，从市场装一个或新建一个」+「去市场看看」「新建技能」；共享技能「这里放所有 Agent 共用的技能」+「去市场看看」「新建技能」；项目技能「当前项目还没有技能」+「去市场看看」「新建技能」；系统内置「Harness 自带的技能都正常」+「去市场看看」（内置不可新建，只给一个出口） | 空态（按分类四种文案） |
| SL-05 | 技能列表 · 加载骨架 | 首次进入、刷新 | 状态文字「正在加载技能…」+ 2 个组头骨架 + 两列共 6 张卡片骨架；Tab 与工具栏暂禁用；不使用大 spinner | 加载 |
| SL-06 | 技能列表 · 加载失败 | `/installed` 失败、401、服务未加载 | 页级错误面板：标题 + 原因 +「重试」；未授权与服务未加载使用不同文案；不显示空列表冒充成功 | 错误 / 未授权 / 服务未加载 |

### 2.2 技能详情（SD）

| 编号 | 画面 | 入口 | 关键元素 | 状态 |
| --- | --- | --- | --- | --- |
| SD-01 | 技能详情 · 可写 | 点击任意可写技能卡片 | `← 返回技能列表`；头部 56×56 图标 + 名称（mono）+ 版本（仅市场安装）+ 状态徽章；左栏 `2fr`：描述、什么时候用（有则显示）、SKILL.md 原文预览（行号）、编辑入口；右栏 `1fr`：状态、版本、作者、来源（来自市场 / 本地文件）、文件位置（可复制）、操作（更新 / 停用 / 卸载或删除） | 正常；加载骨架（标题 + 3 行）；读取失败「无法读取该技能」+ 重试 |
| SD-02 | 技能详情 · 只读 | 只读自定义目录或权限不足的技能 | 结构同 SD-01；状态显示「只读」；编辑 / 停用 / 删除禁用并给 tooltip 原因；文件位置仍可复制 | 正常；写操作禁用态 |
| SD-03 | 技能详情 · 内置只读 | 系统内置分类中的技能 | 状态显示「系统内置」；说明「Harness 自带，不能修改」；无编辑 / 停用 / 删除；无路径时显示「由 Harness 内置提供，没有本地文件」并隐藏打开与复制 | 正常；路径不可用时降级 |
| SD-04 | 技能详情 · 已停用 | 点击已停用的技能卡片 | 头部与图标降低对比度；状态区说明「已停用」；操作只剩「恢复」「删除」；编辑与更新禁用 | 正常；已停用态 |

### 2.3 诊断抽屉（DG）

| 编号 | 画面 | 入口 | 关键元素 | 状态 |
| --- | --- | --- | --- | --- |
| DG-01 | 诊断抽屉 · 无问题 | 修复最后一条后留在抽屉内；重新检查后 | 抽屉宽 420px；标题「未生效与问题」；成功状态勾（`--dsw-alias-state-success-primary`）+「全部正常，没有发现问题」+ 上次检查时间 +「重新检查」+ 关闭 | 空态；重新检查加载态 |
| DG-02 | 诊断抽屉 · 有问题 | Tab 栏右侧警示图标（§2.8）；详情未生效状态「查看原因」 | 摘要「N 个技能未生效 · M 个需要留意」+ 上次检查 +「重新检查」；分「未生效」「需要留意」两段；每卡：严重度图标、技能名（mono）、一句人话、一个主修复按钮、「详细信息」折叠 | 正常；加载 / 获取失败时有独立错误态；修复后计数即时更新 |
| DG-03 | 诊断抽屉 · 单条展开 | 问题卡「详细信息」 | 展开：路径（mono）、问题类型、当前生效项（仅同名问题）、修复动作提示；默认收起；技术词只在此出现 | 正常；单条展开 |

### 2.4 市场列表（ML）

> 市场 Tab **没有二级 Tab**。列表按市场源分区块，区块顺序即源优先级；不提供源筛选，也不提供「全部源」合并视图。

| 编号 | 画面 | 入口 | 关键元素 | 状态 |
| --- | --- | --- | --- | --- |
| ML-01 | 市场列表 · 正常 | Tab「市场」 | 工具栏：搜索、排序（推荐 / 最近更新 / 名称）、`检查更新` **30×30 图标按钮**（tooltip `action.checkUpdates`，与技能 Tab 同一动作）、`管理源` **30×30 图标按钮**（tooltip `action.manageSources`）；分类 chips（保留，最多 12 个）；**按源分区块**：区块标题 = 源名 + `{count} 个技能` + `⋯`（刷新 / 删除；源排序在管理源弹窗内拖动完成，区块菜单不再提供上移 / 下移）；区块内两列卡片网格 `gap: 12px`：卡片约 96px、48×48 图标、名称 / 版本 / 标签、≤2 行描述、右侧**水平** `⋯` + 唯一按钮（安装 / 更新 / 已安装，已安装点击进入详情；`⋯` 默认隐藏、hover 淡入）；区块顺序 = 管理源中的源顺序 | 正常；有更新时卡片升级徽章；分页追加加载不抖动 |
| ML-02 | 市场列表 · 无源 | 首次进入市场、删光所有源 | 整页空态：标题「还没有添加技能索引源」+ 说明 + 主按钮「添加源」；工具栏搜索、排序与分类 chips 禁用，「管理源」图标保持可用；不渲染任何源区块 | 空态 |
| ML-03 | 市场列表 · 有源无结果 | 源内无技能、搜索 / 分类无命中 | 源为空：该源区块显示「这个源暂时没有技能」+「管理源」；搜索无结果：「没有匹配「{query}」的技能」+「清除搜索」；分类无结果回退「全部」；无命中的源区块连同区块头一起隐藏 | 空态（多种变体） |
| ML-04 | 市场列表 · 加载 | 首次进入、刷新索引 | 状态文字「正在读取市场…」+ 每源两列共 6 张卡片骨架；已有列表在刷新时保留内容并显示区块内 loading | 加载 |
| ML-05 | 市场列表 · 错误 | 源不可达、索引格式错误、离线 | 顶部条「有些源暂时连不上，先显示上次的结果」+「管理源」「重试」；副文案「已安装的技能不受影响」；有缓存时继续显示并标「上次结果」；无缓存时源级错误面板替换该源区块 | 错误 / 部分失败 / 离线缓存 |

### 2.5 市场详情（MD）

| 编号 | 画面 | 入口 | 关键元素 | 状态 |
| --- | --- | --- | --- | --- |
| MD-01 | 市场详情 · 未安装 | 点击市场卡片 | `← 返回市场`；头部 56×56 图标 + 名称 + 版本 + 作者 + ≤4 标签；主按钮「安装」；左栏介绍 / README / 文件清单；右栏来源、许可证、主页、兼容版本、发布时间 | 正常；加载骨架；读取失败 + 重试 |
| MD-02 | 市场详情 · 已装可更新 | 已安装且有新版本的市场技能 | 已安装状态行（位置 / 当前版本 / 本地修改标记）；主按钮「更新到 vX.Y.Z」；升级徽章；本地修改时显示警示行（`--dsw-alias-state-warn-primary`） | 正常；更新中按钮 loading |
| MD-03 | 市场详情 · 已装最新 | 已安装且无新版本 | 主按钮降级为「已安装」静态标记；提供「卸载」入口（更多操作）；显示安装位置与时间 | 正常 |
| MD-04 | 市场详情 · 不可用 | 版本与当前 Harness 不兼容、版本被撤回、源读取失败 | 安装按钮禁用 + 原因；不兼容显示所需 Harness 版本；撤回显示「该版本已撤回」；源失败给「重试」 | 禁用 / 错误 |

### 2.6 管理源弹窗（MS）

> v3.2 起管理源是**居中弹窗**，不是右侧抽屉。宽度 `min(720px, 100vw - 32px)`，最大高 `min(720px, 100vh - 96px)`；圆角 `var(--dsw-radius-panel)`、`.5px` 边框、无阴影；标题与底部操作固定，源列表区内部滚动。

| 编号 | 画面 | 入口 | 关键元素 | 状态 |
| --- | --- | --- | --- | --- |
| MS-01 | 管理源 · 列表 | 市场工具栏「管理源」；无源空态 | 居中弹窗 `min(720px, 100vw - 32px)`；标题「管理源」+ 计数徽章（源数量）+ 关闭；说明 `source.priorityHint`「排序即优先级：排在前面的源，其技能在市场中排在前面。」；源列表每行：**行首拖动手柄 16×16**（`grab` / `grabbing`）、状态点、名称、技能数、启用开关、刷新、删除；行高约 56px，行间 1px `--dsw-alias-border-l2`；底部「添加索引源…」+ 说明；列表区滚动，标题与底部不滚 | 正常；无源空态；加载骨架；读取失败 |
| MS-02 | 管理源 · 添加 | 弹窗内「添加索引源…」 | 弹窗内切换到添加视图（宽度不变，表单区限宽 488px）：名称（选填）、索引地址、`校验`；校验中 loading；成功显示索引标题 / 技能数 / 示例；第三方来源提示；底部「取消 / 保存」；保存后回到列表视图，新源默认排最后并短暂高亮 | 正常 / 校验中 / 校验失败 |
| MS-03 | 管理源 · 删除确认 | 源行「删除」 | 在管理源弹窗之上叠加 `min(480px, 100vw - 32px)` 确认框；标题「删除这个源？」；说明已安装技能不受影响、之后无法检查更新；按钮「取消 / 删除源」；`dialogStack` 保证 `Esc` 只关确认框 | 确认态；提交中 |
| MS-04 | 管理源 · 刷新失败 | 源行「刷新」失败 | 弹窗内源行下方展开错误条「刷新失败，仍在显示上次成功读取的内容」+「重试」；状态点 warning；保留上次成功缓存并标「已过期」；弹窗不关闭，其余源仍可操作 | 错误 / 部分失败 |
| MS-05 | 管理源 · 拖动排序 | 拖动源行行首手柄或整行；键盘 `Alt+↑` / `Alt+↓` | 整行 `draggable="true"`；拖起后行降为 `opacity: .5` 并保留占位；指针悬停时在目标间隙显示 2px 插入指示线（`--dsw-alias-state-business-primary`）；放下即重排并立即持久化；拖到弹窗上下边缘时列表自动滚动；拖动中行内开关 / 刷新 / 删除不可点击；`Esc` 取消拖动并回到原位；无 toast。键盘：行聚焦后 `Alt+↑` / `Alt+↓` 每次移动一位，首 / 末位不移动并给出 `aria-disabled` 提示；重排后焦点跟随该行，`aria-live="polite"` 读出 `source.orderMoved`「{name} 已移到第 {n} 位」。排序即优先级：市场区块顺序随之变化，同名技能以靠前源为准；「已安装」按来源排序时使用同一顺序；新增源默认排最后；重启后保留 | 正常；拖动中；键盘移动 |

### 2.7 对话框与流程（DL）

| 编号 | 画面 | 入口 | 关键元素 | 状态 |
| --- | --- | --- | --- | --- |
| DL-01 | 新建技能 | 工具栏「新建技能」图标按钮；空态「新建技能」 | `min(488px, 100%)`；字段：名称（mono）、一句话描述、什么时候用（选填）、正文 textarea；保存到分段（我的技能 / 共享技能 / 项目技能）；底部「取消 / 创建技能」 | 正常；名称 / 描述 / 正文校验错误；提交中禁用；项目位置不可用时禁用并说明 |
| DL-02 | 导入技能 | 工具栏「导入技能」图标按钮 | `min(488px, 100%)`；分段「粘贴 SKILL.md / 从文件夹导入」；解析结果预览卡（名称、描述、文件数）；保存到分段；同名冲突「覆盖 / 跳过 / 换位置」 | 正常；解析中 / 解析失败；目录不可读；冲突 |
| DL-03 | 编辑原文 | 详情左栏「编辑原文」 | `min(720px, 100%)` 大内容弹窗：等宽 textarea，带行号、脏标记、`mtime` 乐观锁；底部「取消 / 保存」；`Cmd/Ctrl+S` 保存；关闭时若有脏数据先确认 | 编辑中；未保存；保存中；外部修改冲突；放弃确认 |
| DL-04 | 更新确认 | 卡片「更新」、详情「更新」、状态更新图标 | `min(480px, 100vw - 32px)` 确认框；单个：当前 → 新版本、来源、本地修改警告、自动备份说明；全部：数量、可更新列表、本地修改计数、备份说明；底部「取消 / 更新」 | 正常；更新中进度；成功；失败 + 重试；部分失败汇总 |
| DL-05 | 卸载 / 删除确认 | 详情操作、卡片 `⋯` | `min(480px, 100vw - 32px)` 危险确认；卸载：「删除 {name} 和安装记录」+「保留一份备份」勾选；删除：「删除 {name} 及其所有文件，无法撤销」；只读时入口禁用 | 确认态；执行中；失败行内提示 |
| DL-06 | 安装技能 | 市场卡片「安装」、市场详情「安装」 | `min(488px, 100%)`；安装到（我的技能默认 / 共享技能 / 项目技能）；版本自动取最新兼容版本，不要求选择；同名冲突「覆盖 / 跳过 / 换位置」；进度「正在安装 N/M 个文件」；结果「已安装」+「查看技能」 | 正常；冲突；安装中（可取消）；失败 + 重试；目标不可写 |
| DL-07 | 添加索引源 | 市场无源空态「添加源」 | `min(488px, 100%)`；索引地址输入 +「校验」；校验结果预览（源名称、技能数、示例条目）；底部「取消 / 保存」 | 正常；地址无效；拉取失败；格式不正确 |

### 2.8 状态图标（Tab 栏右侧，跨 SL / ML）

> 状态图标不是独立画面，是「技能 / 市场」Tab 栏右侧的常驻状态区，技能页与市场页共用。最多两个，右对齐；都为 0 时整块留空。

| 编号 | 状态 | 出现条件 | 图标与尺寸 | 悬停 300ms | 点击 / 键盘 |
| --- | --- | --- | --- | --- | --- |
| SI-01 | 全部正常 | 未生效数 = 0 且可更新数 = 0 | 不渲染任何图标；不留占位、不出提示 | — | — |
| SI-02 | 有技能未生效 | 未生效数量 > 0 | 警示三角 16px，热区 32×32，颜色 `--dsw-alias-state-warn-primary` | `status.issue.tip`：「{count} 个技能未生效」 | 打开诊断抽屉（DG-02）；`Enter` / `Space` 同点击 |
| SI-03 | 有技能可更新 | 可更新数量 > 0 | 向上箭头（带点）16px，热区 32×32，颜色 `--dsw-alias-state-business-primary` | `status.update.tip`：「{count} 个技能可以更新 · 上次检查 {time}」 | 触发更新流程（打开 DL-04 批量变体）；检查中图标禁用，tooltip 用 `status.update.checking`（工具栏「检查更新」执行时同步禁用） |

- 顺序固定：警示在左、更新在右；两者同时存在时并排显示，间距 4px。
- 数量随检查 / 更新 / 修复结果实时变化；降到 0 时图标立即移除，不做收起动画。
- 图标可键盘聚焦，焦点环 2px `--dsw-focus-ring-color`；`aria-label` 直接使用 `status.issue.tip` / `status.update.tip` 的完整提示语，计数变化用 `aria-live="polite"`。
- 删除 v3.0 的顶部未生效警示条与更新细条；详情内更新按钮、卡片内升级徽章与更新按钮保留。

---

## 3. 导航与状态记忆

### 3.1 顶层导航

- 一级只有两个 Tab：`技能`（默认）/ `市场`；「来源」不再是一级入口。
- Tab 用 `role="tablist"` / `role="tab"` / `aria-selected`；`←` / `→` 在 Tab 间移动，`Enter` / `Space` 激活。
- **二级 Tab 只在「技能」Tab 内出现**：我的技能 / 共享技能 / 项目技能 / 系统内置；市场 Tab 没有二级 Tab。
- 页面标题固定「技能」，描述「管理 Agent 可用的技能，看看哪些没生效。」
- 切换 Tab 不重建页面：两个 Tab 各自保留搜索、排序、滚动位置；技能额外保留二级 Tab 选择，市场额外保留分类与区块内滚动位置。
- 详情是页内视图，不是新路由；`← 返回` 或 `Esc` 回到原 Tab 的列表位置。

### 3.2 二级 Tab 与分类

| 顺序 | Tab key | 数据来源 | 默认 | 可写 | 空态 key |
| --- | --- | --- | --- | --- | --- |
| 1 | `loc.mine` | `user-dsh` | **选中** | 是 | `empty.tab.mine` |
| 2 | `loc.shared` | `user-agents` | — | 是 | `empty.tab.shared` |
| 3 | `loc.project` | `project-dsh` + `project-agents` | — | 是 | `empty.tab.project` |
| 4 | `loc.builtin` | `preset` + `bundled`（含只读 `custom`） | — | 否 | `empty.tab.builtin` |

- 一屏只显示一个分类的卡片；**分类级**不再有分组头、折叠 chevron 与副标题；v3.2 在分类内新增**来源组头**（见 §4.10），组头不可折叠。
- 分类顺序固定，不按数量重排；无项目上下文时「项目技能」Tab 不渲染。
- 计数徽章来自该分类列表总数，包含已停用技能，与搜索 / 排序无关；计数为 0 仍显示 Tab（显示 `0`），以便用户知道分类存在。
- 二级 Tab 选择写入本地记忆，默认「我的技能」；页面重载后恢复。
- 已停用技能留在原分类，不单独成类；卡片内徽章「已停用」+ 状态点 `idle`，整体降对比。
- **搜索跨分类**：命中后自动切到第一个有结果的分类（按 Tab 顺序），保持搜索词；结果只在该分类内展示；清空搜索后回到搜索前的分类。
- **分类内按来源分组**：我的技能 / 共享技能 / 项目技能三个 Tab 内，卡片按「每个市场源一组（停用源标「已停用」）+ 本地创建一组」渲染；组头顺序 = 管理源中的源顺序，`本地创建` 固定最后；系统内置不分组；空组与搜索后无命中的组不渲染；组头不可折叠、不可点击。

### 3.3 搜索与排序记忆

| 项 | 作用范围 | 记住时机 | 重置 |
| --- | --- | --- | --- |
| 技能搜索词 | 技能 Tab（会话内） | 切 Tab、切二级 Tab、进详情再返回 | 手动清除；页面重载后清空 |
| 技能排序 | 技能 Tab（会话内） | 切 Tab、返回详情 | 用户改回「按名称」；页面重载后恢复按名称 |
| 二级 Tab 选择 | 技能 Tab（本地持久） | 每次切换 | 用户再选；页面重载后恢复 |
| 市场搜索词 | 市场 Tab（会话内） | 切 Tab、进市场详情再返回 | 手动清除；页面重载后清空 |
| 市场分类 / 排序 | 市场 Tab（会话内） | 切 Tab、进详情再返回 | 用户重置 |
| 源顺序 | 管理源弹窗（本地持久） | 拖动放下 / 键盘移动后立即写入 | 用户重新排序；重启后保留 |

- 排序只有两个值：`按名称`（默认）/ `最近修改`；市场保留 `推荐 / 最近更新 / 名称` 三项。
- 搜索 150ms 防抖（市场 300ms）；匹配名称、描述、whenToUse。
- 技能排序只作用于当前分类内；市场排序只作用于每个源区块内，区块顺序始终由源顺序决定。
- 搜索 / 排序变化后列表回到顶部；其他状态（分类、滚动）保持不变。
- 不提供任何位置筛选 chips；位置只由二级 Tab 表达。

### 3.4 滚动与返回

- 技能列表、市场列表各自记录滚动位置；切 Tab 回来恢复。
- 进入详情再返回，恢复进入前的滚动位置与二级 Tab 选择；恢复后焦点回到触发卡片。
- 在详情内切换技能不适用（详情只从列表进入，不提供上一项 / 下一项）。
- 刷新保持当前 Tab、二级 Tab、搜索、排序、源顺序与滚动；写操作成功后局部刷新，不整页跳顶。
- 切换二级 Tab 时列表回到顶部；每个分类可各自记忆滚动位置（可选增强，首选回顶）。

### 3.5 导航不做的部分

- 不做 URL 路由 / 深链；面板刷新后回到「技能」列表。
- 不记忆详情页；刷新后不自动重开上次详情。
- 不把诊断或管理源做成独立页面；诊断是抽屉、管理源是居中弹窗，关闭后回到触发位置。

---

## 4. 交互细节

### 4.1 二级 Tab：切换与键盘

**结构与几何**

- 二级 Tab 与一级 Tab 同一套视觉：容器 34px 高、`--dsw-alias-bg-layer-3`、14px 圆角、padding 2px；Tab 30px 高、12px 圆角、padding 0 12px，间距 2px。
- 标签文案用 `loc.*`；右侧计数徽章 `tab.count`，`calc(var(--sm-fs) - 2px)`、`--dsw-alias-label-tertiary`，选中态用 `--dsw-alias-label-primary`。
- 二级 Tab 行与一级 Tab 行左对齐，位于一级 Tab 下方 12px；不再有**分类级**分组头、chevron 与副标题；分类内的来源组头见 §4.10。
- hover：`--dsw-alias-interactive-bg-hover`；选中：`--dsw-alias-bg-layer-1` + 文字 `--dsw-alias-label-primary`。

**鼠标**

- 点击任意二级 Tab 立即切换；整屏内容替换为该分类卡片，列表回顶。
- 切换不改变搜索词；若当前有搜索词，切换后在该分类内继续过滤。
- 点击当前已选中的 Tab 不改变内容、不清空任何状态、不回到顶部。
- 计数为 0 的 Tab 仍可点击，进入对应空分类。

**键盘与 ARIA**

- 二级 Tab 容器 `role="tablist"`、`aria-label` 用 `tab.skills.label`；每个 Tab `role="tab"` / `aria-selected` / `tabindex`（roving）。
- `←` / `→` 在二级 Tab 间移动并自动激活（automatic activation）；`Home` / `End` 到首 / 末 Tab；`Enter` / `Space` 激活。
- 焦点环 2px `--dsw-focus-ring-color`，偏移 2px；焦点不因内容重绘丢失。
- 屏幕阅读器读作「我的技能，6 个技能，已选中」；计数变化用 `aria-live="polite"`。
- 切换只改本地视图，不触发网络请求；不弹 toast。

**动效**

- 内容淡入 120ms；`prefers-reduced-motion` 下只切换可见性，不做位移与高度动画。

### 4.2 技能卡片：进入详情与 `⋯` 菜单

**卡片点击**

- 技能页与市场页都用两列卡片网格：`grid-template-columns: repeat(2, minmax(0, 1fr))`、`gap: 12px`；内容区宽度 ≤ 720px 时退化为单列。
- 卡片约 96px 高、`border: .5px solid var(--dsw-alias-settings-card-stroke)`、`border-radius: var(--dsw-radius-xl)`、`background: var(--dsw-alias-settings-card-fill)`、padding 12px。
- 左侧 48×48 图标容器（`.5px` 描边、`--dsw-radius-lg`）；名称 `var(--sm-fs)` / 500 + 状态徽章；描述最多 2 行，超出省略。
- 右侧**水平一行、右对齐**：`⋯`（32×32）在左，唯一主按钮（更新 / 安装 / 已安装）在右，间距 6px；无主按钮时只显示 `⋯`，仍占右侧同一位置。
- `⋯` 默认 `opacity: 0`，但**保留占位**（不切 `display: none`、不折叠宽度）；卡片 `:hover` 与 `:focus-within` 时 120ms 淡入；`⋯` 自身 `:focus-visible` 时即使卡片未 hover 也显示。
- 淡入只改 `opacity`，不改尺寸、`padding`、`margin` 或定位，保证出现前后卡片布局零位移。
- 整张卡片是详情入口；hover 卡片 `--dsw-alias-interactive-bg-hover`；键盘聚焦同样有背景 + 焦点环。
- 卡片内主按钮与 `⋯` 必须 `stopPropagation`，不进入详情；`⋯` 打开菜单的锚点固定在按钮位置。
- 点击已停用、未生效、只读卡片同样进入详情；状态在详情里解释，不拦截。
- 卡片聚焦后 `Enter` / `Space` 进入详情；`←` / `→` 在同一行两卡间移动，`↑` / `↓` 在上下行间移动（roving tabindex），`Home` / `End` 到首 / 末卡；跨来源组时按视觉顺序继续移动。
- 卡片本身 `tabindex="0"`；卡片内主按钮与 `⋯` 各自是独立 Tab 停靠点，顺序为「卡片 → `⋯` → 主按钮（如有）→ 下一张卡」（与视觉左→右一致）。

**状态点与徽章优先级**

| 优先级 | 状态 | 圆点 | 卡片内表达 |
| --- | --- | --- | --- |
| 1 | 未生效（同名 / 格式问题） | `warn` | 名称后警示点 +「未生效」；tooltip 一句原因 |
| 2 | 已停用 | `idle` | 整卡 `opacity: .6` +「已停用」徽章 |
| 3 | 有更新 | `update` | 升级徽章 `↑ vX.Y.Z`，排在标签位第一 |
| 4 | 正常生效 | `ok` | 无徽章，仅状态点 |

- 卡片右侧主按钮：有更新时「更新」；市场未安装时「安装」；市场上已安装时弱化「已安装」；其余情况无按钮。系统内置 / 只读不出现写操作按钮。
- 卡片左下状态点悬停 300ms 同样出 tooltip（正常 / 未生效原因 / 已停用 / 可更新），并与卡片状态徽章文案一致。
- 描述最多 2 行；hover 300ms 出 tooltip 展示全文。tooltip 元素统一 `id="tooltip"`，由 `#tooltip` 选择器定位（v3.1 原型误写为 `#sm-tooltip`，样式未命中导致不可见，v3.2 起以此为准）。
- 卡片内不出现位置标签、模型 / 用户调用徽章、rank、provider、commit。

**`⋯` 菜单项与禁用态**

| 菜单项 | 出现条件 | 禁用条件 | 禁用原因（tooltip） |
| --- | --- | --- | --- |
| 查看详情 | 所有卡片 | — | — |
| 更新到 vX.Y.Z | 有可用更新 | 已停用 / 只读 | 停用或只读技能不能更新 |
| 编辑原文 | 可写技能 | 已停用 / 只读 | 恢复后才能编辑 / 只读技能不能修改 |
| 停用 / 恢复 | 可写技能 | 只读 | 系统内置技能不能修改 |
| 查看诊断 | 该技能有关联问题 | — | — |
| 打开文件夹 | 有可用路径 | 路径为空 / 不可读 | 这个技能没有可打开的位置 |
| 复制路径 | 有可用路径 | 路径为空 | 同上 |
| 卸载 / 删除 | 可写技能 | 只读 | 系统内置技能不能删除；市场安装显示「卸载」，本地显示「删除」 |

- 市场安装的技能在详情与菜单用「卸载」，本地技能用「删除」，两者不混用。
- 危险项「卸载 / 删除」放最后，与上方项用 1px `--dsw-alias-border-l2` 分隔；文字用 `--dsw-alias-state-error-primary`。
- 菜单打开后首项聚焦；`↑` / `↓` 移动，`Enter` 执行，`Esc` 关闭并把焦点还给 `⋯`；禁用项可聚焦并显示原因，或使用 `aria-disabled="true"` 跳过聚焦——两者择一，同一实现内保持一致。
- 菜单宽 200px，`bg-layer-2`，圆角 12px，无阴影；超出视口时向上翻转。

### 4.3 诊断抽屉：问题与修复的前后状态

**抽屉行为**

- 右侧抽屉宽 420px、全高；背景 `--dsw-alias-bg-layer-2`、左侧 1px `--dsw-alias-border-l2`；无阴影；遮罩透明，点击遮罩关闭。
- 打开时焦点进入抽屉标题；`Esc` 只关抽屉；关闭后焦点回到警示图标或触发卡片。
- 抽屉内部可滚动，标题与「重新检查」固定；打开不阻塞列表加载。

**摘要与排序**

- 标题「未生效与问题」；摘要「N 个技能未生效 · M 个需要留意」+「上次检查 {time}」+「重新检查」。
- 分两段：「未生效」在前，「需要留意」在后；段内按技能名排序。
- Tab 栏警示图标只统计「未生效」；「需要留意」不进入图标计数，只出现在抽屉里。
- 部分检查失败：已完成的问题照常显示；失败部分显示「有些位置这次没检查到」+「重试」，不把整页判为错误。
- 无问题时：成功状态勾（`--dsw-alias-state-success-primary`）+「全部正常，没有发现问题」+ 上次检查 +「重新检查」；从「有问题」修复到 0 条时抽屉内就地切换为空态，不自动关闭。

**问题卡：一条问题 = 一个技能 + 一句人话 + 一个动作**

| 问题类型 | 一句人话 | 主修复动作 | 执行前 | 执行后 |
| --- | --- | --- | --- | --- |
| 与另一个技能同名 | `{name} 与『{location}』里的另一个技能同名，现在生效的是后者。` | 查看生效项 | 该卡片标记未生效；警示图标计数 +1 | 打开生效技能详情；问题卡保留，直到用户停用 / 重命名 / 删除被覆盖项；处理后重新检查消失 |
| 文件开头格式不对 | `{name} 的文件开头格式不对，Agent 读不到它。` | 打开文件修正 | 技能被跳过；问题卡存在 | 打开 DL-03 编辑原文；保存成功后重新检查，问题卡消失；保存失败则保留并显示原因 |
| 名称不符合规则 | `{name} 的名字不符合规则：只能用小写字母、数字和连字符。` | 重命名 | 技能不可用；问题卡存在 | 打开重命名框，预填建议值；成功后卡片与问题卡同步更新；失败保留 |
| 链接失效 | `{name} 指向的位置已经不存在了。` | 删除失效项 | 卡片可能不出现在列表；警示图标计数 +1 | 删除链接与失效记录；问题卡消失；计数 -1；toast「已处理」+「撤销」8s |
| 文件夹打不开 | `{name} 所在的文件夹打不开，可能是权限问题。` | 打开所在目录 | 技能不可见；问题卡存在 | 打开目录；用户处理后点「重新检查」；成功则消失，失败保留 |
| 正文偏大（需要留意） | `{name} 的内容比较大，加载会变慢，有些 Agent 可能读不全。` | 查看并精简正文 | 不进入警示图标计数 | 打开详情原文；问题卡保留（信息性） |
| 来源连不上（需要留意） | `{name} 来自市场源『{source}』，这个源暂时连不上；已安装的版本仍然能用，只是暂时不能检查更新。` | 去管理源处理 | 不进入警示图标计数 | 打开管理源弹窗并定位到该源；源恢复后重新检查，问题卡消失 |

- 「重命名」「删除失效项」是写操作：完成后统一重新拉取 `/diagnostics` 与 `/installed`，不让前端自行猜测计数。
- 「查看生效项」只导航，不修改数据；抽屉可保持打开，返回后仍在原滚动位置。同名问题的主按钮只给「查看生效项」，「停用其中一个」在生效项详情的操作区完成。
- 修复失败：问题卡内联错误「没能处理这个问题：{reason}」+ 保留原动作；不弹全局 toast。
- 「详细信息」默认收起；展开显示路径（mono）、问题类型、当前生效项、修复提示；路径可复制；技术词只在此层出现。
- 同名但当前生效的是用户自己的版本（例如盖住系统内置）**不算未生效**：不进入诊断问题列表与警示图标计数，只在详情状态说明「当前用的是『我的技能』里的同名版本」。
- 「来源连不上」由源状态与安装记录合并生成，不是 `IssueView` 的新类型；只出现在「需要留意」段。
- 抽屉底部说明「文件开头格式不对的技能会被跳过，不会出现在技能列表里。」

### 4.4 更新流程：检查 → 提示 → 单个 / 全部更新 → 结果

**检查（v3.2 起合并「刷新列表」）**

- 自动检查在页面加载后后台执行，不阻塞列表、不显示转圈；只有存在更新时才显示 Tab 栏右侧更新图标（§2.8），不再显示顶部细条。
- 手动入口只有一个：「技能」Tab 工具栏的「检查更新」图标按钮（30×30；决策单 §3 未把该按钮放到市场工具栏）。该动作同时完成两件事——① 重新拉取所有已启用源的索引；② 重新读取 `/installed` 与诊断相关的列表数据。v3.1 的独立「刷新列表」已删除。
- **执行中**：按钮图标原位替换为 16px 环形转圈（按钮尺寸不变），`aria-busy="true"` 且禁用；tooltip 变为 `status.update.checking`「正在检查更新…」；Tab 栏更新图标同时禁用；页面其他区域仍可操作。转圈至少保持 400ms 再收，避免快速返回时闪烁；重复点击被忽略。
- **完成**：列表原地刷新，保持当前一级 Tab、二级 Tab、搜索、排序、源顺序与滚动位置，不跳顶。
  - 有更新：toast `toast.checkSummary`「已检查 {sources} 个源，{updates} 个技能可更新」。
  - 无更新：toast `toast.checkSummary.none`「已检查 {sources} 个源，已是最新」。
  - toast 4s，同一时刻最多 1 条；结果同时更新 Tab 栏更新图标计数与「上次检查 {time}」。
- **失败**：按钮停止转圈并恢复可点击；不弹错误 toast，不打乱当前列表。
  - 全部失败：列表保留上次成功内容并显示 `banner.stale`「显示的是上次成功读取的内容。」；工具栏下方出现检查失败细条 `update.failed`「上次检查失败」+「重试」+「管理源」，30 分钟后自动重试。
  - 部分源失败：成功的源正常更新并进入 toast 汇总；失败源区块沿用 ML-05 的源级错误 / 「上次结果」标记，不把整次检查判为失败。
  - 失败不改变已有可更新计数；更新图标 tooltip 的「上次检查」时间保留上一次成功时间。
- 没有启用源时按钮禁用，tooltip 使用 `empty.market.noSource.title`「还没有添加技能索引源」。
- 单个 / 全部更新进行中，「检查更新」按钮禁用，避免与写操作并发。
- 顶部状态区只保留检查失败细条这一层；v3.0 的未生效警示条与更新提示条已删除，状态改由 §2.8 图标承担。
- 检查结果按技能聚合：同一技能多源命中时取最高兼容版本；同名技能以源顺序靠前的源为准。

**提示**

- Tab 栏右侧更新图标：悬停 300ms 显示「{count} 个技能可以更新 · 上次检查 {time}」；图标颜色 `--dsw-alias-state-business-primary`。
- 卡片内：升级徽章 `↑ vX.Y.Z`，固定在名称行标签位第一；详情头部同款。
- 图标计数随单个更新成功即时 -1；为 0 时图标消失，不做收起动画。

**单个更新**

1. 点击卡片「更新」或详情「更新到 vX.Y.Z」→ DL-04。
2. 确认框展示：当前版本 → 新版本、来源名、本地修改警告、自动备份说明。
3. 确认后按钮进入 loading，其他操作禁用；进度文本「正在更新…」；不可关闭模态（可取消，取消走取消确认）。
4. 成功：toast「已更新到 {version}」；详情与卡片版本即时刷新；徽章消失；更新图标计数 -1。
5. 失败：模态内错误条「更新失败：{reason}」+「重试」；已备份旧版本，原技能保持可用；不产生半更新。
6. 本地已修改：确认框必须显式警告「本地文件已修改，更新会覆盖这些修改」；默认不勾选覆盖，需用户确认。

**全部更新**

1. 点击 Tab 栏右侧更新图标 → DL-04 的批量变体：数量、列表、本地修改计数、备份说明。
2. 确认后按顺序逐个更新（一次一个，进度可读）；每个技能独立原子提交，失败不影响后续。
3. 进度文本「正在更新 {done}/{total}」；允许在项间取消，已完成的保留，未开始的不执行。
4. 结果：全部成功「全部更新完成」；部分失败「已更新 {ok} 个，失败 {failed} 个」+「重试失败的 {count} 个」。
5. 关闭结果后列表局部刷新；更新图标只保留仍未成功的数量；为 0 时图标消失。

**更新与诊断的关系**

- 更新不会自动修复同名或格式问题；若更新后仍被同名覆盖，卡片保持「未生效」，诊断继续解释。
- 更新失败不写入诊断问题列表；失败信息留在更新模态与 toast。

### 4.5 键盘与焦点

**全局**

| 快捷键 | 行为 | 范围 |
| --- | --- | --- |
| `/` | 聚焦当前 Tab 的搜索框 | 不在输入框 / 编辑器内时 |
| `Esc` | 按 §4.5 的 Escape 分层表关闭 | 全局 |
| `Cmd/Ctrl + S` | 保存编辑原文 | 编辑态 |
| `Cmd/Ctrl + Enter` | 提交当前对话框（校验通过时） | 新建 / 导入 |
| `←` / `→` | 一级 Tab、二级 Tab 间移动并激活 | 对应 Tab 聚焦时 |
| `←` / `→` / `↑` / `↓` | 两列卡片网格内移动 | 卡片聚焦时 |
| `Home` / `End` | 到首个 / 末个 Tab 或卡片 | 对应区域聚焦时 |
| `Alt + ↑` / `Alt + ↓` | 管理源弹窗内把当前源上移 / 下移一位 | 源行聚焦时（拖动排序的键盘替代） |

**Tab 顺序**

- 技能列表：一级 Tab 栏 → **二级 Tab 栏** → 搜索 → 排序 → 「新建技能」→「导入技能」→「检查更新」→ 状态图标（警示 / 更新，按存在顺序）→ 检查失败细条「重试」→ 当前分类卡片（按分组与网格视觉顺序）→ 卡片 `⋯` → 卡片主按钮（如有）。
- 二级 Tab：`←` / `→` 自动激活；`Tab` 从当前选中 Tab 离开，进入搜索框；计数徽章不单独获得焦点。
- 卡片 roving：同一时刻只有一张卡片在 tab 顺序中；`←` / `→` 同行移动，`↑` / `↓` 上下行移动，`Home` / `End` 到首 / 末卡；`Tab` 先进入卡片 `⋯`，再 `Tab` 到主按钮（如有），继续 `Tab` 到下一张卡片。
- 详情：`← 返回` → 头部操作区（更新 / 停用 / 卸载或删除）→ 编辑入口 → 右栏「复制路径」→ 返回。
- 市场：一级 Tab 栏 → 搜索 → 排序 →「管理源」图标 → 分类 chips（`←` / `→`）→ 状态图标 → 源区块 `⋯`（按区块顺序）→ 市场卡片 → 卡片 `⋯` → 卡片主按钮。
- 管理源弹窗：关闭 → 说明 → 各源行（行内顺序：拖动手柄 → 启用开关 → 刷新 → 删除）→「添加索引源…」；拖动手柄聚焦后 `Alt+↑` / `Alt+↓` 移动。
- 对话框：打开后焦点进入标题或首个输入；`Tab` / `Shift+Tab` 在框内循环；关闭后回到触发元素。

**Escape 分层（从最上层向下）**

| 层级 | 当前状态 | `Esc` 行为 |
| --- | --- | --- |
| 1 | 任意模态打开 | 关闭模态；安装 / 更新进行中先弹取消确认；编辑有脏数据先弹「放弃修改？」 |
| 2 | 管理源弹窗或诊断抽屉打开 | 关闭弹窗 / 抽屉，焦点回到触发按钮；管理源拖动中 `Esc` 只取消拖动、不关闭弹窗，再次 `Esc` 才关闭 |
| 3 | 市场详情 / 技能详情 | 返回列表并恢复滚动位置与二级 Tab 选择（编辑原文属于层级 1 的弹窗） |
| 4 | 搜索框聚焦且有内容 | 清空搜索；再次 `Esc` 退出焦点 |
| 5 | 其他 | 不处理，不阻止宿主默认行为 |

- 嵌套场景按栈处理：例如「详情 → 诊断抽屉 → 重命名框」，一次 `Esc` 只关最上层。
- 对话框打开时锁定背景滚动；关闭后恢复。
- 所有图标按钮必须有 `aria-label`；二级 Tab、卡片、菜单、状态图标、开关、进度条按 §7 的可访问性要求标注。

### 4.6 反馈层级与防重复

- 优先级：字段 / 行内错误 > 模态内错误条 > 页级错误面板 > toast；不把所有错误都做成 toast。
- 写操作进行中：按钮 loading + 禁用，禁止重复提交；同一技能的更新 / 删除互斥。
- 停用：立即执行 + toast「已停用 {name}」+「撤销」8s；撤销恢复原分类与滚动位置。
- 删除 / 卸载：必须二次确认；卸载可选「保留一份备份」，默认不勾选。
- 成功 toast 4s 消失；带「撤销」的 toast 8s；同一时刻最多 1 条 toast，新的替换旧的。
- 不因成功写操作整页刷新；局部更新列表、计数与诊断。
- 空态 / 错误态必须有主出口（重试 / 去市场 / 新建 / 添加源）。

### 4.7 宽度与响应

- 基准 1200×900；1440×900 不劣化；内容随宽度伸展。
- 卡片网格：内容区宽度 > 720px 时固定两列 `repeat(2, minmax(0, 1fr))`；≤ 720px 时退化为单列（依据 DSH 最小卡宽 268px）。
- < 1100px：工具栏允许换行；诊断抽屉宽 `min(420px, 92vw)`；管理源弹窗保持 `min(720px, 100vw - 32px)`，不改成全屏。
- < 1000px：详情 `2fr 1fr` 改为单列，右栏落到左栏下方；仍是页内视图，不改成右侧抽屉。
- 弹窗宽度按决策单三档：表单 `min(488px, 100%)`、确认 `min(480px, 100vw - 32px)`、大内容 / 管理源 `min(720px, 100vw - 32px)`；不再使用 560px / 360px 自定值。
- 1280 / 1024 / 800 三档窗口下，管理源弹窗均保留左右各 16px（合计 32px）视口余量，不横向溢出。
- 不做移动端专属布局。

### 4.8 管理源拖动排序（v3.2）

**入口与手柄**

- 入口：管理源弹窗。每个源行行首有 16×16 拖动手柄，光标 `grab`，按下变 `grabbing`；整行 `draggable="true"`，拖手柄或行空白处均可拖起，行内开关 / 刷新 / 删除不触发拖动。
- 手柄 tooltip `source.dragHandle`「拖动排序」；说明区常驻 `source.dragHint`「拖动调整顺序，越靠前优先级越高；也可用 Alt+↑ / Alt+↓」。
- 不支持拖拽的环境（键盘、触屏辅助）使用键盘替代，见本节末。

**拖起**

- 指针按下后移动 ≥ 4px 才进入拖动，避免误触点击。
- 被拖行降为 `opacity: .5` 并**保留原占位**（不切 `display`），其余行不下坠、不提前重排。
- 指针旁显示拖动浮层（仅名称 + 技能数），保持行宽；无阴影；列表文本选择禁用。

**悬停插入**

- 以指针 Y 与各源行中线比较：落在某行上半 → 插到该行前，下半 → 插到该行后。
- 目标间隙显示 **2px 插入指示线**，颜色 `--dsw-alias-state-business-primary`，左右与源列表对齐；同一时刻只有一条，跟随指针移动。
- 拖到列表可视区顶部 / 底部 32px 内时自动滚动，越接近边缘越快；不越过底部「添加索引源…」。
- 拖动过程中不实时重排，只显示指示线，避免列表抖动。

**放下与持久化**

- 松开指针 → 立即按指示位置重排，移除浮层与指示线；`sourceOrder` 写入本地持久状态，重启后保留。无「保存」按钮、不弹 toast。
- 落点与原位置相同视为取消，不写入。
- 结束后焦点回到该行拖动手柄；`aria-live="polite"` 读出 `source.orderMoved`「{name} 已移到第 {n} 位」。
- `Esc` 或拖出弹窗后松开 → 取消拖动，恢复原顺序、无写入。
- 拖动期间行内启用开关 / 刷新 / 删除置为不可交互（`aria-disabled="true"`），拖动结束恢复。

**键盘替代**

- 源行拖动手柄聚焦后，`Alt+↑` / `Alt+↓` 上移 / 下移一位，立即重排并持久化，交互等价于拖动放下。
- 首行 `Alt+↑`、末行 `Alt+↓` 不移动，给出 `aria-disabled` 与 `source.orderBoundary` tooltip「已经在最前面 / 最后面」。
- 焦点跟随被移动行，`aria-live` 读出位置；`prefers-reduced-motion` 下重排不做位移过渡。

**排序的影响**

- 市场 Tab：源区块按管理源顺序自上而下排列；同名技能以排在前面的源为准，后面的同名项标记为不可安装 / 已由靠前源提供。
- 技能页的来源组头顺序与市场区块顺序同源：同一份 `sourceOrder`，`本地创建` 固定最后。
- 「已安装」列表按来源排序时使用同一顺序，保证市场、技能列表与已安装的「来源优先」一致。
- 分类 chips 与搜索只过滤源内技能，不改变源区块顺序。
- 删除源后，其余源的相对顺序保持不变；新增源默认排最后；停用的源保留位置但不参与市场区块渲染。

### 4.9 弹窗规格（对齐 DSH 实测值）

| 弹窗 | 宽度 | 圆角 | 边框 | 内部间距 |
| --- | --- | --- | --- | --- |
| 新建技能、导入技能、添加源、安装技能 | `min(488px, 100%)` | `var(--dsw-radius-panel)` | `.5px solid var(--dsw-alias-border-inverted)` | 标题区与表单区 `gap: 38px`；底部按钮区约 56px，主按钮在右 |
| 更新确认、卸载确认、删除确认、删除源确认 | `min(480px, 100vw - 32px)` | `var(--dsw-radius-xl)` | `.5px solid var(--dsw-alias-border-inverted)` | 正文 `gap: 12px`；底部按钮区约 56px，主按钮在右 |
| 编辑原文、SKILL.md 预览 | `min(720px, 100%)` | `var(--dsw-radius-panel)` | `.5px solid var(--dsw-alias-border-inverted)` | 标题区与内容区 `gap: 38px`；底部按钮区约 56px，主按钮在右 |
| **管理源** | `min(720px, 100vw - 32px)` | `var(--dsw-radius-panel)` | `.5px solid var(--dsw-alias-border-inverted)` | 最大高 `min(720px, 100vh - 96px)`；标题与底部固定，源列表内部滚动；1280 / 1024 / 800 宽下均保留 32px 视口余量 |

- 所有弹窗：无阴影、遮罩透明、背景 `--dsw-alias-bg-layer-1`、`dialogStack` 分层 Escape；内容区可滚动且 `min-height: 0`。
- 决策单未单列「安装技能」与「删除源确认」：安装按表单类沿用 488，删除源按确认类沿用 480。
- 不再使用 v2.0 的 560px / 640px / 360px 自定宽度；本表与决策单 §6 一致，若实现发现 DSH 实测值变化，以实测为准并回写本表。

### 4.10 技能列表内按来源分组

**分组与顺序**

- 范围：我的技能 / 共享技能 / 项目技能三个二级 Tab。系统内置不分组。
- 每组来源：每个市场源一组（组头 = `group.source`，值直接用源名）；所有安装记录里没有 `sourceId` 的技能归入 `group.local`「本地创建」一组（手工新建、导入、手动放置都算）。
- 组头顺序 = 管理源弹窗中的源顺序；`本地创建` 固定最后。停用的源仍保留分组（已安装技能还在），组头附「已停用」状态，不进入市场区块。
- 空组不渲染；搜索 / 排序过滤后为空的组连同组头一起不渲染；当前分类所有组都为空时显示该分类空态（SL-04）。

**组头视觉与行为**

- 组头高 28px，与组内卡片左对齐；名称 `var(--sm-fs)` / 500、`--dsw-alias-label-primary`；计数 `group.count`（`{count} 个技能`）用 `calc(var(--sm-fs) - 2px)`、`--dsw-alias-label-tertiary`。
- 组头与组内网格间距 8px，组与组之间 20px。
- 组头不可点击、不可折叠：没有 chevron、没有 `aria-expanded`、没有 hover 背景；不显示「全部 / 收起」类操作。
- 组头是分组标题而非按钮，不进入 Tab 顺序；屏幕阅读器通过 `role="group"` + `aria-labelledby` 读出「{源名}，{n} 个技能」。

**与排序 / 刷新的关系**

- 技能页「排序」只作用于组内卡片；组顺序始终由源顺序决定，与「按名称 / 最近修改」无关。
- 管理源弹窗关闭后，技能页与市场页立即按新源顺序重排；不做位移动画，尽量保持当前滚动锚点。
- 新增源后，其已安装技能出现在新组；删除源后，仍带该 `sourceId` 的安装记录成为孤儿，本稿暂定并入 `本地创建`，避免出现无组头的卡片（是否改为独立「来源已移除」组见 §8）。

---

## 5. 文案清单

### 5.1 文案原则与禁用词

- **用户语言优先**：位置只在二级 Tab 出现；详情只说「来自市场：X」或「本地文件」；技术事实只在诊断「详细信息」展开。
- **一句人话 + 一个动作**：诊断文案不解释机制，先说发生了什么，再给唯一动作。
- **简洁、第二人称、不用感叹号**；中英文都避免「可能」「大概」这类模糊词，除确有必要（如正文偏大）。
- **三种移除语义**：停用（可恢复）/ 删除（不可撤销）/ 卸载（市场安装，可保留备份）。文案不得混用。
- **禁用词（主界面任何位置）**：`rank`、`layer`、`preset`、`global`、`provider`、`commit`、`sha`、`schema`、`format`、`遮蔽`、`同层`、`跨层`、`预设可见性`、`cordis`、`standard`、`ptc`、`minimal`、`custom root`、`.disabled/`、`7 类位置`、`索引格式版本`。
- 错误信息允许使用「格式不正确」「这个源读不了」这类用户语言，但不得出现 `format` / `schema` 英文词或版本号。
- `覆盖` 只允许出现在两个真实动作里：安装冲突的「覆盖」、更新前的「更新会覆盖这些修改」；不得作为「同名覆盖」机制术语。
- 版本号徽章中的 `vX.Y.Z` 直接用版本字符串，不翻译；来源名、技能名、路径均为插值。
- 下列 key 为 zh / en 初稿；实现时 `zh` 与 `en` 键集必须一致，新增 key 先补本表再进字典。

### 5.2 全局、导航与操作（`panel.*` / `tab.*` / `action.*` / `search.*` / `sort.*`）

| Key | 中文 | English |
| --- | --- | --- |
| `panel.title` | 技能 | Skills |
| `panel.desc` | 管理 Agent 可用的技能，看看哪些没生效。 | Manage the skills available to agents and see what's not working. |
| `tab.skills` | 技能 | Skills |
| `tab.market` | 市场 | Market |
| `tab.skills.label` | 技能分类 | Skill categories |
| `tab.count` | {count} | {count} |
| `action.newSkill` | 新建技能 | New skill |
| `action.import` | 导入技能 | Import skill |
| `action.more` | 更多 | More |
| `action.viewDetail` | 查看详情 | View details |
| `action.checkUpdates` | 检查更新 | Check for updates |
| `action.manageSources` | 管理源 | Manage sources |
| `action.updateAll` | 全部更新 | Update all |
| `action.refresh` | 刷新 | Refresh |
| `action.retry` | 重试 | Retry |
| `action.cancel` | 取消 | Cancel |
| `action.save` | 保存 | Save |
| `action.close` | 关闭 | Close |
| `action.back.skills` | 返回技能列表 | Back to skills |
| `action.back.market` | 返回市场 | Back to market |
| `action.copyPath` | 复制路径 | Copy path |
| `action.openFolder` | 打开文件夹 | Open folder |
| `action.viewIssues` | 查看原因 | View reasons |
| `action.goMarket` | 去市场看看 | Browse market |
| `action.undo` | 撤销 | Undo |
| `action.clear` | 清除 | Clear |
| `action.viewInstalled` | 查看技能 | View skill |
| `action.viewDiagnostics` | 查看诊断 | View diagnostics |
| `action.viewActive` | 查看生效项 | View active skill |
| `action.removeLink` | 删除失效项 | Remove broken item |
| `action.openFile` | 打开文件修正 | Open file to fix |
| `action.viewFile` | 查看并精简正文 | View and trim content |
| `action.rename` | 重命名 | Rename |
| `action.disable` | 停用 | Disable |
| `action.enable` | 恢复 | Restore |
| `action.delete` | 删除 | Delete |
| `action.uninstall` | 卸载 | Uninstall |
| `action.install` | 安装 | Install |
| `action.update` | 更新 | Update |
| `action.edit` | 编辑原文 | Edit content |
| `action.create` | 创建技能 | Create skill |
| `action.parse` | 解析 | Parse |
| `action.validate` | 校验 | Validate |
| `action.addSource` | 添加源 | Add source |
| `action.deleteSource` | 删除源 | Delete source |
| `action.enableSource` | 启用源 | Enable source |
| `action.disableSource` | 停用源 | Disable source |
| `action.retryFailed` | 重试失败项 | Retry failed |
| `action.backup` | 保留一份备份 | Keep a backup |
| `search.skills.placeholder` | 搜索技能名称或描述 | Search skills |
| `search.market.placeholder` | 搜索市场技能 | Search market |
| `search.clear` | 清除搜索 | Clear search |
| `sort.label` | 排序 | Sort |
| `sort.name` | 按名称 | Name |
| `sort.modified` | 最近修改 | Recently modified |
| `sort.recommended` | 推荐 | Recommended |
| `sort.updated` | 最近更新 | Recently updated |

> 工具栏图标 tooltip 不新增 key，直接复用动作名：新建 = `action.newSkill`「新建技能」、导入 = `action.import`「导入技能」、检查更新 = `action.checkUpdates`「检查更新」、市场管理源 = `action.manageSources`「管理源」。图标按钮的 `aria-label` 与 tooltip 同值。

### 5.3 分类、状态、提示与空态（`group.*` / `loc.*` / `tab.count` / `status.*` / `badge.*` / `banner.*` / `state.*` / `empty.*`）

| Key | 中文 | English |
| --- | --- | --- |
| `group.local` | 本地创建 | Created locally |
| `group.source` | {source} | {source} |
| `group.count` | {count} 个技能 | {count} skills |
| `loc.mine` | 我的技能 | My skills |
| `loc.shared` | 共享技能 | Shared skills |
| `loc.project` | 项目技能 | Project skills |
| `loc.builtin` | 系统内置 | Built-in |
| `badge.disabled` | 已停用 | Disabled |
| `badge.issue` | 未生效 | Not active |
| `badge.update` | 可更新至 {version} | Update to {version} |
| `badge.readonly` | 只读 | Read-only |
| `status.issue.tip` | {count} 个技能未生效 | {count} skills are not active |
| `status.update.tip` | {count} 个技能可以更新 · 上次检查 {time} | {count} skills can be updated · Checked {time} |
| `status.update.checking` | 正在检查更新… | Checking for updates… |
| `banner.partial` | 有 {count} 个位置无法读取，其余技能可正常管理。 | {count} locations can't be read; other skills are still available. |
| `banner.stale` | 显示的是上次成功读取的内容。 | Showing the last successfully loaded content. |
| `state.loading` | 正在加载技能… | Loading skills… |
| `state.loadingMarket` | 正在读取市场… | Loading market… |
| `state.saving` | 正在保存… | Saving… |
| `state.savingContent` | 正在写入文件… | Saving file… |
| `state.validating` | 正在校验… | Validating… |
| `state.refreshing` | 刷新中… | Refreshing… |
| `state.checking` | 正在检查更新… | Checking for updates… |
| `state.updating` | 正在更新… | Updating… |
| `state.installing` | 正在安装… | Installing… |
| `state.error.skills.title` | 无法加载技能列表 | Could not load skills |
| `state.error.skills.body` | 请检查服务是否已加载，然后重试。 | Check that the service is running, then retry. |
| `state.error.market.title` | 无法读取市场 | Could not load market |
| `state.error.detail.title` | 无法读取该技能 | Could not load this skill |
| `state.error.detail.body` | 文件可能已被移动或删除。 | The file may have moved or been deleted. |
| `state.error.diag.title` | 无法获取诊断结果 | Could not load diagnostics |
| `state.error.sources.title` | 无法读取技能索引源 | Could not load sources |
| `state.error.sources.body` | 源列表暂时不可用，请稍后重试。 | Sources are unavailable right now. Try again later. |
| `empty.tab.mine` | 还没有自己的技能，从市场装一个或新建一个 | You don't have any skills yet. Install one from the market or create one. |
| `empty.tab.shared` | 这里放所有 Agent 共用的技能 | Skills shared by all agents live here. |
| `empty.tab.project` | 当前项目还没有技能 | This project has no skills yet. |
| `empty.tab.builtin` | Harness 自带的技能都正常 | Skills shipped with Harness are all set. |
| `empty.search` | 没有匹配「{query}」的技能 | No skills match "{query}" |
| `empty.search.body` | 换个关键词试试。 | Try another keyword. |
| `empty.market.noSource.title` | 还没有添加技能索引源 | No skill index sources yet |
| `empty.market.noSource.body` | 添加一个索引源，就能发现并安装社区技能。 | Add an index source to discover and install community skills. |
| `empty.market.noSkills.title` | 这个源暂时没有技能 | This source has no skills yet |
| `empty.market.noSkills.body` | 到「管理源」里看看，或稍后再试。 | Check Manage sources, or try again later. |
| `empty.market.noResults.title` | 没有匹配「{query}」的技能 | No skills match "{query}" |
| `empty.market.noResults.body` | 换个关键词或分类试试。 | Try another keyword or category. |
| `empty.diag.title` | 全部正常 | All clear |
| `empty.diag.body` | 没有发现问题。 | No problems found. |
| `empty.sources.title` | 还没有添加技能索引源 | No skill index sources yet |
| `empty.sources.body` | 添加后，市场里就能搜索和安装技能。 | Add one to search and install skills in the market. |

### 5.4 技能详情（`detail.*`）

| Key | 中文 | English |
| --- | --- | --- |
| `detail.status.active` | 生效中 | Active |
| `detail.status.disabled` | 已停用 | Disabled |
| `detail.status.issue` | 未生效 | Not active |
| `detail.status.readonly` | 只读 | Read-only |
| `detail.status.builtin` | 系统内置 | Built-in |
| `detail.descTitle` | 描述 | Description |
| `detail.whenToUse` | 什么时候用 | When to use |
| `detail.content` | 原文 | Content |
| `detail.content.empty` | 正文为空 | No content |
| `detail.source.market` | 来自市场：{source} | From market: {source} |
| `detail.source.local` | 本地文件 | Local file |
| `detail.location` | 文件位置 | File location |
| `detail.version` | 版本 | Version |
| `detail.author` | 作者 | Author |
| `detail.updated` | 最近修改 {time} | Modified {time} |
| `detail.installedAt` | 安装于 {time} | Installed {time} |
| `detail.disabledNote` | 已停用。Agent 暂时看不到它，文件还在，可随时恢复。 | Disabled. Agents can't see it right now. Its files are kept and it can be restored. |
| `detail.shadowedNote` | 未生效：当前用的是『{location}』里的同名技能。 | Not active: the skill with the same name in {location} is in use. |
| `detail.readonlyNote` | 只读技能，不能修改或删除。 | This skill is read-only. |
| `detail.builtinNote` | 系统内置，Harness 自带，不能修改。 | Built-in with Harness; it can't be changed. |
| `detail.localModified` | 本地文件已修改 | Local files changed |
| `detail.updateAvailable` | 可更新到 {version} | Update to {version} |
| `detail.copiedPath` | 路径已复制 | Path copied |
| `detail.editHint` | 如果文件在其他地方被修改，保存时会提醒你。 | If the file changed elsewhere, you'll be told before saving. |
| `detail.location.builtin` | 由 Harness 内置提供，没有本地文件 | Provided by Harness; there's no local file |

### 5.5 诊断（`diag.*`）

| Key | 中文 | English |
| --- | --- | --- |
| `diag.title` | 未生效与问题 | Inactive & issues |
| `diag.summary` | {active} 个技能未生效 · {attention} 个需要留意 | {active} not active · {attention} need attention |
| `diag.section.inactive` | 未生效 | Not active |
| `diag.section.attention` | 需要留意 | Needs attention |
| `diag.partial` | 有些位置这次没检查到 | Some locations weren't checked this time |
| `diag.checkedAt` | 上次检查 {time} | Checked {time} |
| `diag.recheck` | 重新检查 | Check again |
| `diag.rechecking` | 正在检查… | Checking… |
| `diag.details` | 详细信息 | Details |
| `diag.details.hide` | 收起详细信息 | Hide details |
| `diag.path` | 路径 | Path |
| `diag.kind` | 类型 | Type |
| `diag.effective` | 当前生效 | Currently active |
| `diag.fixHint` | 处理后会重新检查。 | We'll check again after this. |
| `diag.note` | 文件开头格式不对的技能会被跳过，不会出现在技能列表里。 | Skills with an invalid file header are skipped and won't appear in the skills list. |
| `diag.sentence.brokenLink` | {name} 指向的位置已经不存在了。 | The location {name} points to no longer exists. |
| `diag.sentence.frontmatter` | {name} 的文件开头格式不对，Agent 读不到它。 | The file header for {name} is invalid, so agents can't read it. |
| `diag.sentence.name` | {name} 的名字不符合规则：只能用小写字母、数字和连字符。 | The name {name} is invalid: use lowercase letters, numbers, and hyphens. |
| `diag.sentence.sameName` | {name} 与『{group}』里的另一个技能同名，现在生效的是后者。 | Another skill in {group} has the same name as {name}; that one is currently active. |
| `diag.sentence.unreadable` | {name} 所在的文件夹打不开，可能是权限问题。 | The folder for {name} can't be opened; it may be a permissions issue. |
| `diag.sentence.oversize` | {name} 的内容比较大，加载会变慢，有些 Agent 可能读不全。 | {name} is large; loading may be slower and some agents may not read all of it. |
| `diag.sentence.sourceUnreachable` | {name} 来自市场源『{source}』，这个源暂时连不上；已安装的版本仍然能用，只是暂时不能检查更新。 | {name} comes from the market source {source}, which can't be reached right now. The installed version still works; updates just can't be checked for now. |
| `diag.error.fixFailed` | 没能处理这个问题：{reason} | Couldn't fix this: {reason} |
| `diag.fix.openFolder` | 打开所在目录 | Open containing folder |
| `diag.fix.manageSources` | 去管理源处理 | Go to sources |
| `diag.toast.fixed` | 已处理 | Fixed |
| `diag.toast.renamed` | 已重命名为 {name} | Renamed to {name} |

---

### 5.6 市场（`market.*`）

| Key | 中文 | English |
| --- | --- | --- |
| `market.category.all` | 全部 | All |
| `market.installed` | 已安装 | Installed |
| `market.updateTo` | 更新到 {version} | Update to {version} |
| `market.notCompatible` | 与当前 Harness 版本不兼容 | Not compatible with this Harness version |
| `market.yanked` | 该版本已撤回 | This version was withdrawn |
| `market.installUnavailable` | 暂时无法安装 | Can't install right now |
| `market.installedAt` | 已安装 · {location} | Installed · {location} |
| `market.installRecord` | 安装记录 | Install record |
| `market.source` | 来源 | Source |
| `market.version` | 版本 | Version |
| `market.author` | 作者 | Author |
| `market.license` | 许可证 | License |
| `market.homepage` | 主页 | Homepage |
| `market.engines` | 需要 Harness {range} | Requires Harness {range} |
| `market.readme` | README | README |
| `market.files` | 包含文件 | Files |
| `market.fileCount` | {count} 个文件 | {count} files |
| `market.published` | 发布于 {time} | Published {time} |
| `market.detailDesc` | 介绍 | About |
| `market.tags` | 分类 | Categories |
| `market.staleShort` | 上次结果 | Last result |
| `market.loadingMore` | 正在加载更多… | Loading more… |
| `market.error.source` | 这个源暂时读不了 | This source can't be read right now |
| `market.error.sourceHint` | 检查索引地址是否可访问，或换个源。 | Check that the index URL is reachable, or pick another source. |
| `market.error.offline` | 有些源暂时连不上，先显示上次的结果 | Some sources can't be reached; showing the last result |
| `market.error.offlineHint` | 已安装的技能不受影响。 | Installed skills aren't affected. |

### 5.7 管理源（`source.*`）

| Key | 中文 | English |
| --- | --- | --- |
| `source.title` | 管理源 | Sources |
| `source.add.title` | 添加技能索引源 | Add skill index source |
| `source.name` | 名称 | Name |
| `source.name.placeholder` | 选填，默认用索引标题 | Optional; uses the index title |
| `source.url` | 索引地址 | Index URL |
| `source.url.placeholder` | https://…/index.json | https://…/index.json |
| `source.validated` | 已读取 {count} 个技能 | Found {count} skills |
| `source.preview` | 示例：{names} | Preview: {names} |
| `source.trust` | 该源由第三方提供，安装前请确认来源可信。 | This is a third-party source. Verify it before installing. |
| `source.lastChecked` | 上次检查 {time} | Checked {time} |
| `source.neverChecked` | 尚未检查 | Never checked |
| `source.skillCount` | {count} 个技能 | {count} skills |
| `source.priorityHint` | 排序即优先级：排在前面的源，其技能在市场中排在前面。 | Order is priority: skills from sources higher in the list appear first in the market. |
| `source.dragHandle` | 拖动排序 | Drag to reorder |
| `source.dragHint` | 拖动调整顺序，越靠前优先级越高；也可用 Alt+↑ / Alt+↓。 | Drag to reorder; higher means higher priority. You can also use Alt+↑ / Alt+↓. |
| `source.orderMoved` | {name} 已移到第 {n} 位 | {name} moved to position {n} |
| `source.orderBoundary` | 已经在最前 / 最后面 | Already at the top / bottom |
| `source.status.ok` | 正常 | OK |
| `source.status.error` | 连不上 | Unreachable |
| `source.status.checking` | 检查中 | Checking |
| `source.disabled` | 已停用 | Disabled |
| `source.stale` | 上次结果 | Last result |
| `source.error.fetch` | 这个源暂时连不上 | This source can't be reached right now |
| `source.error.refreshFailed` | 刷新失败，仍在显示上次成功读取的内容。 | Refresh failed; showing the last successfully loaded content. |
| `source.error.invalidUrl` | 请输入有效的 https 地址 | Enter a valid https URL |
| `source.error.urlRequired` | 请填写索引地址 | Enter an index URL |
| `source.error.duplicate` | 这个源已经添加过了 | This source is already added |
| `source.confirmDelete.title` | 删除这个源？ | Delete this source? |
| `source.confirmDelete.body` | 已安装的技能不会被删除，但之后无法再检查更新。 | Installed skills won't be deleted, but they can't be checked for updates afterward. |

### 5.8 对话框与流程（`form.*` / `install.*` / `update.*` / `uninstall.*` / `delete.*`）

| Key | 中文 | English |
| --- | --- | --- |
| `form.new.title` | 新建技能 | New skill |
| `form.name` | 名称 | Name |
| `form.name.placeholder` | 例如：code-review | e.g. code-review |
| `form.description` | 一句话描述 | One-line description |
| `form.description.placeholder` | 说明这个技能做什么 | What does this skill do? |
| `form.whenToUse` | 什么时候用（选填） | When to use (optional) |
| `form.body` | 正文 | Content |
| `form.body.placeholder` | 写下这个技能的说明与步骤。 | Write the instructions for this skill. |
| `form.saveTo` | 保存到 | Save to |
| `form.name.invalid` | 名称只能用小写字母、数字和连字符。 | Use lowercase letters, numbers, and hyphens. |
| `form.name.taken` | 这个位置已有同名技能。 | A skill with this name already exists here. |
| `form.name.required` | 请填写名称。 | Enter a name. |
| `form.description.required` | 请填写描述。 | Enter a description. |
| `form.body.required` | 请填写正文。 | Enter content. |
| `form.projectUnavailable` | 当前没有打开项目 | No project is open |
| `form.import.title` | 导入技能 | Import skill |
| `form.import.paste` | 粘贴 SKILL.md | Paste SKILL.md |
| `form.import.dir` | 从文件夹导入 | From folder |
| `form.import.paste.placeholder` | 把 SKILL.md 的内容粘贴到这里 | Paste the contents of SKILL.md here |
| `form.import.dir.placeholder` | 输入技能文件夹的路径 | Enter the skill folder path |
| `form.import.parsed` | 解析成功 | Parsed |
| `form.import.preview` | 将导入 {count} 个文件 | {count} files will be imported |
| `form.import.dir.required` | 请输入文件夹路径 | Enter a folder path |
| `form.import.invalid` | 无法解析：{reason} | Couldn't parse: {reason} |
| `form.edit.title` | 编辑原文 | Edit content |
| `form.edit.dirty` | 未保存 | Unsaved |
| `form.edit.discard.title` | 放弃未保存的修改？ | Discard unsaved changes? |
| `form.edit.discard.body` | 关闭后，这次的修改不会保留。 | Your changes won't be kept. |
| `form.edit.discard.confirm` | 放弃修改 | Discard |
| `form.mtimeConflict` | 文件已被外部修改，请刷新后重试。 | The file changed elsewhere. Refresh and try again. |
| `form.rename.title` | 重命名技能 | Rename skill |
| `form.rename.label` | 新名称 | New name |
| `form.rename.placeholder` | 例如：code-review | e.g. code-review |
| `install.title` | 安装技能 | Install skill |
| `install.target` | 安装到 | Install to |
| `install.target.project` | 当前项目 | Current project |
| `install.version` | 版本 | Version |
| `install.conflict` | 这个位置已有同名技能 | A skill with this name already exists here |
| `install.conflict.overwrite` | 覆盖 | Overwrite |
| `install.conflict.skip` | 跳过 | Skip |
| `install.conflict.changeTarget` | 换位置 | Change location |
| `install.progress` | 正在安装 {done}/{total} 个文件 | Installing file {done} of {total} |
| `install.progress.preparing` | 正在准备… | Preparing… |
| `install.progress.verifying` | 正在校验文件… | Verifying files… |
| `install.success` | 已安装 {name} | Installed {name} |
| `install.success.hint` | 可以开始使用，或到「技能」里查看。 | It's ready to use, or view it in Skills. |
| `install.failed` | 安装失败：{reason} | Install failed: {reason} |
| `install.unavailable` | 暂时无法安装这个技能 | This skill can't be installed right now |
| `install.cancelConfirm.title` | 取消安装？ | Cancel installation? |
| `install.cancelConfirm.body` | 已写入的临时文件会被清理。 | Temporary files will be cleaned up. |
| `install.cancelConfirm.ok` | 取消安装 | Cancel installation |
| `update.title` | 更新技能 | Update skill |
| `update.versionChange` | {current} → {next} | {current} → {next} |
| `update.localModified` | 本地文件已修改，更新会覆盖这些修改。 | Local files changed; updating overwrites them. |
| `update.backupNote` | 更新前会自动备份当前版本。 | The current version is backed up before updating. |
| `update.none` | 已是最新 | Up to date |
| `update.failed` | 上次检查失败 | Last check failed |
| `update.success` | 已更新到 {version} | Updated to {version} |
| `update.all.title` | 全部更新 | Update all |
| `update.all.body` | 将更新 {count} 个技能。 | This will update {count} skills. |
| `update.all.modified` | 其中 {count} 个有本地修改，更新会覆盖这些修改。 | {count} have local changes that will be overwritten. |
| `update.progress` | 正在更新 {done}/{total} | Updating {done} of {total} |
| `update.result` | 已更新 {ok} 个，失败 {failed} 个 | Updated {ok}; {failed} failed |
| `update.result.ok` | 全部更新完成 | All updates finished |
| `update.retryFailedCount` | 重试失败的 {count} 个 | Retry {count} failed |
| `update.error.check` | 检查更新失败：{reason} | Update check failed: {reason} |
| `update.error.single` | 更新失败：{reason} | Update failed: {reason} |
| `update.cancelConfirm.title` | 取消更新？ | Cancel update? |
| `update.cancelConfirm.body` | 当前技能会保持原版本。 | This skill will stay on its current version. |
| `update.cancelConfirm.ok` | 取消更新 | Cancel update |
| `uninstall.title` | 卸载技能？ | Uninstall skill? |
| `uninstall.body` | 将删除 {name} 和安装记录；不会影响其他技能。 | This removes {name} and its install record. Other skills are unaffected. |
| `uninstall.success` | 已卸载 {name} | Uninstalled {name} |
| `uninstall.readonly` | 系统内置技能不能卸载 | Built-in skills can't be uninstalled |
| `delete.title` | 删除技能？ | Delete skill? |
| `delete.body` | 将删除 {name} 及其所有文件，无法撤销。 | This deletes {name} and all its files. It can't be undone. |
| `delete.readonly` | 这个技能不能删除 | This skill can't be deleted |

### 5.9 Toast 与错误（`toast.*` / `error.*`）

| Key | 中文 | English |
| --- | --- | --- |
| `toast.created` | 已创建技能 {name} | Created skill {name} |
| `toast.saved` | 已保存 | Saved |
| `toast.disabled` | 已停用 {name} | Disabled {name} |
| `toast.enabled` | 已恢复 {name} | Restored {name} |
| `toast.deleted` | 已删除 {name} | Deleted {name} |
| `toast.copied` | 已复制 | Copied |
| `toast.updateStarted` | 开始更新 {count} 个技能 | Updating {count} skills |
| `toast.checkSummary` | 已检查 {sources} 个源，{updates} 个技能可更新 | Checked {sources} sources; {updates} skills can be updated |
| `toast.checkSummary.none` | 已检查 {sources} 个源，已是最新 | Checked {sources} sources; everything is up to date |
| `toast.sourceAdded` | 已添加源 {name} | Added source {name} |
| `toast.sourceDeleted` | 已删除源 {name} | Deleted source {name} |
| `error.unauthorized` | 当前页面未获授权 | This page isn't authorized |
| `error.service` | 技能服务未加载 | Skill service isn't loaded |
| `error.service.body` | 请重启 Harness 后再试。 | Restart Harness and try again. |
| `error.read` | 无法读取技能目录 | Couldn't read skill folders |
| `error.readonly` | 系统内置技能不能修改 | Built-in skills can't be changed |
| `error.notFound` | 文件已被移动或删除 | The file has been moved or deleted |
| `error.pathOutside` | 目标位置不允许写入 | This location doesn't allow writing |
| `error.sourceSchema` | 索引格式不正确 | The source file is invalid |
| `error.indexInvalid` | 索引内容不正确 | The index content is invalid |
| `error.checksum` | 文件校验失败，安装已取消 | File verification failed; installation was canceled |
| `error.notEnoughSpace` | 磁盘空间不足 | Not enough disk space |
| `error.canceled` | 已取消 | Canceled |
| `error.tooLarge` | 文件过大 | The file is too large |
| `error.versionUnknown` | 找不到这个版本 | This version wasn't found |
| `error.noCompatible` | 没有与当前 Harness 兼容的版本 | No version is compatible with this Harness |
| `error.stalePage` | 列表已更新，请刷新后重试 | The list has changed. Refresh and try again. |
| `error.unexpected` | 出了点问题，请重试。 | Something went wrong. Try again. |

> 复用说明：安装与导入的冲突三选一共用 `install.conflict.*`；保存冲突共用 `form.mtimeConflict`；「已是最新」的详情 / 状态文案用 `update.none`，检查完成的 toast 用 `toast.checkSummary.none`；路径复制成功在详情用 `detail.copiedPath`，在诊断 / 管理源弹窗用 `toast.copied`。

---

## 6. 与实现契约的映射

### 6.1 画面 → class 前缀 → locale 前缀

> 全部 class 使用 `sm-` 前缀；下列只列主要类名，具体 BEM 变体由实现自行追加，但不得脱离 `sm-`。

| 画面组 | 主要 class | locale 前缀 | 备注 |
| --- | --- | --- | --- |
| 页面骨架（全部） | `sm-root` `sm-page` `sm-header` `sm-title` `sm-desc` `sm-tabs` `sm-tab` `sm-subtabs` `sm-subtab` `sm-subtab-count` `sm-toolbar` `sm-search` `sm-sort` `sm-icon-btn` `sm-btn` `sm-btn-primary` `sm-status-icons` `sm-status-icon` `sm-banner` `sm-badge` | `panel.*` `tab.*` `action.*` `search.*` `sort.*` `status.*` `banner.*` | 页面背景 `--dsw-alias-bg-base`；主按钮 `--dsw-alias-label-primary` 底 + `--dsw-alias-bg-base` 字；工具栏图标按钮统一 `sm-icon-btn`（30×30、16px 图标）；二级 Tab 与一级同套视觉 |
| SL-01 ~ SL-06 技能列表 | `sm-subtabs` `sm-subtab` `sm-subtab-count` `sm-group` `sm-group-head` `sm-group-title` `sm-group-count` `sm-card-grid` `sm-skill-card` `sm-card-icon` `sm-card-main` `sm-card-name` `sm-card-desc` `sm-card-actions` `sm-card-more` `sm-badge` `sm-dot` + `sm-dot-ok/warn/error/idle/update` `sm-menu` `sm-menu-item` `sm-empty` `sm-skeleton` | `loc.*` `group.*` `tab.count` `badge.*` `status.*` `empty.tab.*` `empty.search` `state.*` | 卡片内不出现位置标签、rank、provider；升级徽章用 `sm-badge-update`；分类级分组头 class 已删除，来源组头用 `sm-group*`；`sm-card-more` 承载 120ms 淡入 |
| SD-01 ~ SD-04 技能详情 | `sm-detail` `sm-detail-head` `sm-detail-back` `sm-detail-main` `sm-detail-side` `sm-card` `sm-code` `sm-file-path` `sm-editor` | `detail.*` `form.edit.*` `action.*` `update.*` `uninstall.*` `delete.*` | `sm-detail-main` = `2fr`，`sm-detail-side` = `1fr`；页内视图，不是抽屉 |
| DG-01 ~ DG-03 诊断抽屉 | `sm-drawer` `sm-drawer-mask` `sm-drawer-head` `sm-drawer-body` `sm-issue` `sm-issue-detail` `sm-badge` | `diag.*`（含 `diag.section.*`）`empty.diag.*` `state.error.diag.*` `action.*` | 详情不使用抽屉；诊断抽屉宽 420px，无阴影，遮罩透明 |
| ML-01 ~ ML-05 市场列表 | `sm-toolbar` `sm-search` `sm-chips` `sm-chip` `sm-source-section` `sm-source-head` `sm-source-count` `sm-card-grid` `sm-market-card` `sm-card-actions` `sm-card-more` `sm-badge` `sm-dot` `sm-empty` `sm-skeleton` | `market.*` `sort.*` `search.market.placeholder` `empty.market.*` `status.*` `state.*` | 分类 chips 保留；不提供源筛选；源区块按源顺序渲染 |
| MD-01 ~ MD-04 市场详情 | `sm-detail` `sm-detail-head` `sm-detail-main` `sm-detail-side` `sm-card` `sm-code` `sm-file-path` | `market.*` `install.*` `update.*` `uninstall.*` `state.*` | 与技能详情共用页内双栏骨架 |
| MS-01 ~ MS-05 管理源弹窗 | `sm-dialog` `sm-dialog-mask` `sm-dialog-head` `sm-dialog-body` `sm-dialog-foot` `sm-source-list` `sm-source-item` `sm-source-handle` `sm-source-status` `sm-source-dragging` `sm-source-ghost` `sm-drop-line` `sm-switch` `sm-form` `sm-field` `sm-input` | `source.*` `empty.sources.*` `state.error.sources.*` `action.*` | 管理源为 720 档居中弹窗，不再有 `sm-drawer*`；拖动手柄 16×16、插入线 `sm-drop-line`；`sm-switch` 只用于源启用 / 停用；无上移 / 下移按钮 |
| DL-01 ~ DL-07 对话框与流程 | `sm-dialog` `sm-dialog-mask` `sm-dialog-head` `sm-dialog-body` `sm-dialog-foot` `sm-confirm` `sm-editor` `sm-progress` `sm-btn` `sm-btn-danger` | `form.*` `install.*` `update.*` `uninstall.*` `delete.*` `error.*` `toast.*` | 488 / 480 / 720 三档；`box-shadow: none`；遮罩透明 |
| 全局反馈 | `sm-toast` `sm-tooltip` `sm-badge` | `toast.*` `error.*` `diag.toast.*` | tooltip 元素 id 固定 `tooltip`、样式选择器 `#tooltip`（不得再写 `#sm-tooltip`）；tooltip 300ms、`z-index: 2000`；toast 4s / 撤销 8s |

### 6.2 契约状态与模块偏差（需同步）

| 契约项 | 现状（v1 契约） | v3.2 需要 | 影响 |
| --- | --- | --- | --- |
| `appState.tab` | `'installed' \| 'market' \| 'sources'` | `'skills' \| 'market'`；删除 `sources` | `99-apply`、Tab 渲染、状态记忆 |
| `appState.skillCategory` | 无 | 新增 `'mine' \| 'shared' \| 'project' \| 'builtin'`，默认 `mine`，本地持久 | 二级 Tab、列表过滤、返回恢复 |
| `renderInstalledTab()` | 函数名与 Tab 名绑定 | 建议改名 `renderSkillsTab()`，或在注释中固定「installed 内部名 = 技能」 | `10-installed.js`；改名需同步契约 |
| `appState.filter` | `'all'`，对应 8 个 chips | 删除；不再有位置筛选 | `10-installed.js`、旧 `filter.*` 文案 |
| `appState.sort` | `'location' \| 'name' \| 'modified'` | `'name' \| 'modified'`，默认 `name` | 技能分类内排序 |
| `appState.marketSourceId` | 市场源选择 | 删除；市场按源分区块，不提供源选择器 | 市场列表 |
| `appState.search` | 单一搜索词 | 技能 / 市场各自记忆：`skillsSearch` + `marketSearch`（或 `searchByTab`）；技能搜索跨分类 | 切 Tab 记忆、跨分类命中 |
| 折叠与滚动状态 | 无 | 删除 `collapsedGroups`；新增 `listScroll`（按 Tab）、`skillCategory`、`sourceOrder`（本地持久）；技能列表分组由 `sourceOrder` + 安装记录 `sourceId` 派生，不另存状态 | 本地记忆 + 返回恢复 + 分组渲染 |
| `30-sources.js` | 渲染「来源」Tab | 改为管理源**弹窗**内容：`renderSourcesDialog()`；删除 `moveSource(id, dir)`，新增 `reorderSources(fromIndex, toIndex)`、`beginSourceDrag()` / `dropSource()` / `moveSourceByKeyboard(id, dir)`，共用同一 `sourceOrder` | 文件名可保留，职责改变 |
| `50-modals.js` 模态数量 | 6 个标准模态 | 10 类：新建 / 导入 / 安装 / 更新 / 全部更新 / 卸载 / 删除 / 添加源 / 删除源 / 重命名；另加管理源弹窗（720 档，MS-01～MS-05）；宽度改为 488 / 480 / 720 | 弹窗栈、Escape 分层 |
| `tab.*` 文案 | `tab.installed` / `tab.market` / `tab.sources` | `tab.skills` / `tab.market` / `tab.count` / `tab.skills.label`；删除 `tab.sources`；新增 `group.local` / `group.source` / `group.count` | 字典键集 |
| `icon()` 集合 | 34 个图标 | 现有 `alert` / `arrow-up` 覆盖状态图标；`sources` 图标复用于市场「管理源」按钮；新增 `grip`（拖动手柄）、`plus`（新建）、`download`（导入）、`refresh`（检查更新转圈时替换）四个图标 | C1 图标集 |

### 6.3 关键尺寸、间距与字号阶梯

| 项 | 值 |
| --- | --- |
| 页面内容 | 左右 48px、底部 48px、顶部 28px；背景 `--dsw-alias-bg-base` |
| 标题 / 描述 | `calc(var(--sm-fs) + 2px)` / 1.4 / 500；描述 `calc(var(--sm-fs) - 1px)`、`--dsw-alias-label-secondary` |
| Tab 容器 / Tab | 34px / 30px 高；14px / 12px 圆角；容器 `--dsw-alias-bg-layer-3`；一级与二级 Tab 共用 |
| 二级 Tab | 位于一级 Tab 下方 12px；Tab 30px 高、12px 圆角、`padding: 0 12px`；计数徽章 `calc(var(--sm-fs) - 2px)` |
| 工具栏 | 搜索 33px；图标按钮 **30×30**、图标 16px、按钮间距 6px；搜索与排序之间 8px；无文字按钮，`+ 新建技能` 已删除 |
| 来源组头 | 高 28px；名称 `var(--sm-fs)` / 500；计数 `calc(var(--sm-fs) - 2px)`、`--dsw-alias-label-tertiary`；组头与网格 8px、组间 20px |
| 卡片网格 | `grid-template-columns: repeat(2, minmax(0, 1fr))`；`gap: 12px`；内容区 ≤ 720px 退化单列 |
| 技能卡片 / 市场卡片 | 约 96px 高；`border: .5px solid var(--dsw-alias-settings-card-stroke)`；`border-radius: var(--dsw-radius-xl)`；`background: var(--dsw-alias-settings-card-fill)`；padding 12px；hover `--dsw-alias-interactive-bg-hover` |
| 卡片图标容器 | 48×48、`var(--dsw-radius-lg)`、`.5px` 描边、`--dsw-alias-bg-layer-1`；内 SVG 24×24、stroke 1.5；左下状态点 8px |
| 名称 / 描述 | 名称 `var(--sm-fs)` / 500；描述 `calc(var(--sm-fs) - 1px)`、`--dsw-alias-label-tertiary`、最多 2 行省略 |
| 卡片右侧操作 | **水平一行、右对齐**：`⋯` 32×32 在左、主按钮在右；间距 6px；`⋯` 默认 `opacity: 0` 且保留占位，hover / focus-within 120ms 淡入；无主按钮时只留 `⋯`（同位置） |
| 标签栏 | 紧跟名称行；`max-width: 340px`；`flex-wrap: nowrap`；最多 4 个；升级徽章固定第 1 位 |
| 升级徽章 | 13×13 SVG（circle r=9 + 上箭头）；文字 `vX.Y.Z`；颜色基于 `--dsw-alias-state-success-primary` 的 `color-mix` |
| 状态图标 | 16px 图标、32×32 热区、间距 4px；警示 `--dsw-alias-state-warn-primary`、更新 `--dsw-alias-state-business-primary` |
| 详情 | 头部图标 56×56；主体 `grid-template-columns: 2fr 1fr; gap: 24px`；卡片 20px 圆角、16px padding |
| 诊断抽屉 | 宽 420px、全高；`--dsw-alias-bg-layer-2`；左侧 1px `--dsw-alias-border-l2` |
| 管理源弹窗 | **居中弹窗**，宽 `min(720px, 100vw - 32px)`，最大高 `min(720px, 100vh - 96px)`；`--dsw-alias-bg-layer-1`；圆角 `var(--dsw-radius-panel)`、边框 `.5px`、无阴影；源行约 56px，行首手柄 16×16；列表内部滚动；拖动插入线 2px `--dsw-alias-state-business-primary` |
| 弹窗 | 表单 `min(488px, 100%)` / 确认 `min(480px, 100vw - 32px)` / 大内容 `min(720px, 100%)`；管理源 `min(720px, 100vw - 32px)`；圆角 `var(--dsw-radius-panel)`（表单、大内容、管理源）/ `var(--dsw-radius-xl)`（确认）；边框 `.5px solid var(--dsw-alias-border-inverted)`；表单内部 `gap: 38px`、确认正文 `gap: 12px`；无阴影；遮罩透明 |
| Toast / Tooltip | 12px 圆角；tooltip `calc(var(--sm-fs) - 4px)`、padding 6px 10px、max-width 290px |
| 焦点环 | 2px `--dsw-focus-ring-color`，偏移 2px |

### 6.4 颜色与禁用项

- 所有颜色只用 `--dsw-*` token；状态色用 `--dsw-alias-state-success-primary` / `--dsw-alias-state-warn-primary` / `--dsw-alias-state-error-primary` / `--dsw-alias-state-business-primary`（更新图标）。
- 升级徽章允许基于 token 的 `color-mix`；除此之外不写任何字面色值。
- 禁止：渐变、发光、`--dsw-hovercard-bg`、自造阴影；弹窗与抽屉均不用阴影。
- class 前缀统一 `sm-`；字号统一走 `--sm-fs` 与 §6.3 的阶梯表达式。
- 页面骨架与 Plugins 页一致；不新造圆角 / 字号体系。

### 6.5 locale 落地规则

- UI 字典在 `src/client/00-prelude.js` 的 `const zh` / `const en`；`locale/{zh,en}.json` 只保留插件管理器元数据。
- 每个 key 必须在字典外被 `t('key')` 或字面量引用；未使用 key 在实现前删除。
- zh / en 键集完全一致、值非空；插值统一 `{name}` / `{count}` / `{time}` / `{version}` / `{location}` / `{reason}` / `{source}` / `{sources}` / `{updates}` / `{n}`。
- 旧 v1 的 `filter.*`、`tab.sources`、`tab.installed`、`sources.priority`、`sources.presetNote` 等 key 在 v3.0 删除；v3.1 再删除 `group.readonly`、`loc.*.desc`、`banner.updates`、`banner.issues`、`empty.skills.*`。
- v3.2 增删：**新增** `group.local` / `group.source` / `group.count`（v3.1 删除的 `group.count` 重新引入，含义改为来源组计数）、`source.dragHandle` / `source.dragHint` / `source.orderBoundary`、`toast.checkSummary` / `toast.checkSummary.none`；**删除** `source.moveUp` / `source.moveDown`、`toast.checked`、`toast.refreshed`（「刷新列表」已并入检查更新）。工具栏图标 tooltip 复用 `action.newSkill` / `action.import` / `action.checkUpdates` / `action.manageSources`，不新增 key；不要保留死文案。
- 诊断单条详细信息的路径、类型、生效项只使用 `diag.path` / `diag.kind` / `diag.effective`，不得在主界面复用这些技术词。

---

## 7. 验收要点（交互层）

### 7.1 结构与导航

- [ ] 一级导航只有「技能 / 市场」两个 Tab，页面上不存在「来源」Tab。
- [ ] 页面标题「技能」、描述「管理 Agent 可用的技能，看看哪些没生效。」与 IA 完全一致。
- [ ] 技能 Tab 的二级 Tab 只有四个分类：我的技能、共享技能、项目技能、系统内置；顺序固定，一屏只显示一个分类。
- [ ] 默认选中「我的技能」，选择本地记忆；无项目上下文时不出现「项目技能」。
- [ ] 页面上没有**分类级**分组头、折叠 chevron、分组副标题与 `aria-expanded` 折叠控件；来源组头存在但不可折叠、不可点击。
- [ ] 我的技能 / 共享技能 / 项目技能三个 Tab 内按来源分组：每个市场源一组（停用源保留组头并标「已停用」）+ `本地创建` 一组；组头顺序 = 源顺序，`本地创建` 最后；空组与无命中的组（含组头）不渲染；系统内置不分组。
- [ ] 每个分类空时整屏显示对应空态文案，不混入其他分类内容。
- [ ] 已停用技能留在原分类内，不出现独立「已停用」分类。
- [ ] 页面上不出现 8 个位置筛选 chips，也不出现 rank、layer、provider、commit、预设可见性矩阵、遮蔽链等词。

### 7.2 技能列表

- [ ] 默认态 3 秒内能看出「我的技能」里有哪些卡片；切换二级 Tab 后只显示该分类。
- [ ] 卡片内容只有 48×48 图标、名称、≤2 行描述、状态徽章、右侧**水平** `⋯` 与唯一主按钮；无位置标签、模型 / 用户徽章、内置徽章。
- [ ] 右侧按钮规则正确：有更新显示「更新」；已停用 / 内置 / 无更新不显示写按钮；`⋯` 在左、主按钮在右，同一行右对齐。
- [ ] `⋯` 默认不可见；hover 或 focus-within 时 120ms 淡入，出现前后卡片无位移；仅键盘聚焦到 `⋯` 时也可见。
- [ ] 工具栏只有搜索、排序与三个图标按钮（新建 / 导入 / 检查更新）；不存在工具栏 `⋯` 菜单，也不存在独立的「刷新列表」。
- [ ] 点击整张卡片进入详情；点击卡片内主按钮或 `⋯` 不触发详情（阻止冒泡）。
- [ ] 两列网格 `repeat(2, minmax(0,1fr))`、`gap: 12px`；内容区 ≤ 720px 退化为单列。
- [ ] 二级 Tab 显示计数，`←` / `→` 可切换并自动激活；计数为 0 时 Tab 仍存在且可进入空态。
- [ ] 搜索 150ms 防抖，跨分类匹配名称、描述、whenToUse；命中后自动切到第一个有结果的分类并保持搜索词。
- [ ] 分类空态、搜索无结果、加载骨架、加载失败、部分位置不可读五种状态齐全。
- [ ] 「我的技能」空态有「去市场看看」与「新建技能」两个出口；其余分类显示对应空态文案；搜索空态有「清除搜索」。

### 7.3 技能详情

- [ ] 详情是页内全宽双栏 `2fr 1fr`，不使用右侧抽屉（诊断抽屉除外）。
- [ ] 左栏只有描述、什么时候用、SKILL.md 原文预览与编辑入口；右栏只有状态、版本、作者、来源、文件位置、操作。
- [ ] 详情不含 rank、layer、provider、commit sha、预设可见性、文件 sha256 清单、单技能诊断卡。
- [ ] 可写、只读、内置只读、已停用四种状态都有明确状态文案与操作差异。
- [ ] 只读 / 内置的写操作禁用并给出原因 tooltip；无路径时隐藏打开 / 复制。
- [ ] 返回列表后恢复滚动位置、二级 Tab 选择与焦点；`Esc` 返回列表。

### 7.4 诊断

- [ ] 只有存在 error / warning 时才出现 Tab 栏警示图标；info 不计入图标计数，图标 tooltip 为「{count} 个技能未生效」。
- [ ] 点击警示图标打开诊断抽屉；抽屉宽 420px、无阴影、遮罩透明。
- [ ] 每条问题只有一个技能 + 一句人话 + 一个主修复动作；「详细信息」默认收起。
- [ ] 抽屉分「未生效」「需要留意」两段；警示图标只统计「未生效」，来源连不上 / 正文偏大不计入。
- [ ] 七类问题的人话与动作符合 §4.3 表；技术词只出现在详细信息。
- [ ] 修复后计数、问题卡、警示图标同步更新；最后一条修好后抽屉内切换「全部正常」。
- [ ] 「查看生效项」只导航，不修改数据；问题卡保留到用户真正处理。
- [ ] 修复失败显示行内错误并保留原动作，不弹全局错误 toast。

### 7.5 更新

- [ ] 自动检查不阻塞列表；有更新时才出现 Tab 栏更新图标，悬停 300ms 显示「{count} 个技能可以更新 · 上次检查 {time}」。
- [ ] 工具栏「检查更新」图标按钮一个动作完成检查 + 刷新列表；执行中图标原位转圈、按钮禁用、tooltip「正在检查更新…」，页面其他区域可操作。
- [ ] 完成 toast 汇总「已检查 {sources} 个源，{updates} 个技能可更新」；无更新为「已检查 {sources} 个源，已是最新」；列表保持 Tab、搜索、排序与滚动位置。
- [ ] 检查失败不弹错误 toast：保留上次列表，显示「上次检查失败」细条 + 重试 + 管理源；部分源失败沿用源区块错误态，不把整次判失败。
- [ ] 单个更新确认展示当前 → 新版本、来源、本地修改警告、自动备份说明。
- [ ] 本地修改必须显式警告「更新会覆盖这些修改」，默认不确认覆盖。
- [ ] 单个更新成功后卡片徽章消失、更新图标计数 -1、详情版本刷新；失败保留原版本并可重试。
- [ ] 全部更新按顺序执行，进度可读，可取消未开始项；结果区分全部成功 / 部分失败，并可重试失败项。
- [ ] 更新失败不写入诊断问题列表；不产生半更新。

### 7.6 市场与管理源

- [ ] 市场列表具备：正常、无源、有源无结果、加载、错误五种画面；按源分区块，不提供源筛选与「全部源」合并视图。
- [ ] 市场错误条区分部分失败与全部失败：部分失败显示「有些源暂时连不上，先显示上次的结果」并保留缓存。
- [ ] 无源空态主出口「添加源」；有源无结果区分「源为空」与「搜索无结果」，无命中的源区块连区块头一起隐藏。
- [ ] 市场卡片为两列、48×48 图标 + 名称 / 版本 / 标签 / ≤2 行描述 + 右侧**水平** `⋯` 与唯一主按钮；标签栏最多 4 个。
- [ ] 市场详情四态齐全：未安装、已装可更新、已装最新、不可用（不兼容 / 撤回 / 源失败）。
- [ ] 管理源是**居中弹窗**，具备列表、添加、删除确认、刷新失败、拖动排序五种画面；每源显示最近检查时间与错误；宽度 `min(720px, 100vw - 32px)`，1280 / 1024 / 800 窗口下均留 32px 边距。
- [ ] 管理源只支持拖动排序：行首有 16×16 手柄，拖动时显示插入指示线，放下即持久化；页面上不存在上移 / 下移箭头按钮。
- [ ] 源行聚焦后 `Alt+↑` / `Alt+↓` 可移动一位，首 / 末位不移动并给出提示；顺序持久化，重启后保留，新增源排最后。
- [ ] 调整源顺序后，市场区块顺序与技能页来源组头顺序立即同步；同名技能以靠前源为准；「已安装」按来源排序使用同一顺序。
- [ ] 删除源不影响已安装技能；刷新失败保留上次成功缓存并标「已过期」。
- [ ] 添加源先校验后保存；失败保留输入；校验成功显示技能数与示例。

### 7.7 对话框与流程

- [ ] 新建、导入、编辑原文、安装、更新、全部更新、卸载、删除、添加源、删除源、重命名均有明确入口与关闭路径。
- [ ] 所有弹窗无阴影、遮罩透明；Escape 只关最上层；关闭后焦点回到触发元素。
- [ ] 表单弹窗宽度 ≤ 488px、确认弹窗 ≤ 480px、编辑原文 / 预览 ≤ 720px、管理源 ≤ 720px 且留 32px 视口余量；圆角、`.5px` 边框与内部 gap 符合 §4.9。
- [ ] 安装 ≤ 3 步（选择 → 落点 / 冲突 → 完成）；安装中可取消，取消后清理临时文件。
- [ ] 卸载与删除语义区分清楚；卸载可选保留备份，删除不可撤销。
- [ ] 编辑原文用 720px 弹窗，带脏标记与 `mtime` 乐观锁；外部修改冲突提示「文件已被外部修改，请刷新后重试」；放弃修改需确认。
- [ ] 表单错误行内显示；校验通过前提交按钮不可用；提交中禁止重复提交。
- [ ] 只读技能不出现可点击的写操作；禁用项有原因。

### 7.8 键盘与可访问性

- [ ] `/` 聚焦当前 Tab 搜索框；输入框内不触发。
- [ ] Escape 按 §4.5 的 5 层顺序关闭；嵌套「详情 → 诊断抽屉 → 重命名框」逐层关闭。
- [ ] 二级 Tab `role="tablist"` / `role="tab"` / `aria-selected`；`←` / `→` / `Home` / `End` 切换，`Enter` / `Space` 激活。
- [ ] 卡片支持 `←` / `→` / `↑` / `↓` / `Home` / `End` 移动；`Enter` / `Space` 进入详情；`Tab` 可到卡片主按钮与 `⋯`。
- [ ] 卡片右侧按钮与 `⋯` 阻止冒泡，不触发详情；状态图标可聚焦并读出完整 tooltip。
- [ ] 管理源弹窗内 `Alt+↑` / `Alt+↓` 移动源并读出位置；拖动中 `Esc` 取消且不写入顺序。
- [ ] 焦点环 2px 可见；对话框焦点锁定；关闭后焦点恢复。
- [ ] 状态不只靠颜色：状态点 + 文案 / tooltip；对比度满足正文可读。
- [ ] `prefers-reduced-motion` 下无位移与高度动画。

### 7.9 文案与契约

- [ ] 所有用户可见文案走 locale；zh / en 键集一致、无空值、每个 key 被引用。
- [ ] 主界面无 §5.1 禁用词；诊断技术词只在「详细信息」。
- [ ] 停用 / 删除 / 卸载三种语义在按钮、确认框、toast 中不混用。
- [ ] class 全部 `sm-` 前缀；颜色全部 `--dsw-*` token 或基于 token 的 `color-mix`；无字面色值。
- [ ] 字号全部使用 `--sm-fs` 阶梯表达式；不新增字号体系。
- [ ] 弹窗无阴影、透明遮罩；详情双栏 `2fr 1fr`；详情不使用右侧抽屉；抽屉只用于诊断，管理源为居中弹窗。
- [ ] tooltip 元素 `id="tooltip"` 与选择器 `#tooltip` 一致；悬停任意图标或状态点 300ms 后可见，背景与定位生效。
- [ ] 1200 / 1440 宽度无破版；窄宽度详情单列而非抽屉。

### 7.10 v2.1 决策单验收（5 条）

> 第 2 条的「竖排操作」已被 v2.2 第 4 条取代，以 §7.11 为准；其余仍适用。

- [ ] 打开任意分类，一屏只有该分类的技能，没有折叠分组头。
- [ ] 任意窗口宽度 ≥ 1280 时，技能页与市场页均为两列卡片（右侧操作形态以 §7.11 第 4 条为准）。
- [ ] Tab 栏右侧最多出现两个图标；未生效与有更新都为 0 时该区域为空。
- [ ] 弹窗宽度不超过 488px（表单）或 480px（确认），与 DSH 其它弹窗并排时不显得突兀。
- [ ] 市场按源分区块，调整源顺序后市场区块顺序与「按来源」排序同步变化。

### 7.11 v2.2 决策单验收（5 条）

- [ ] 技能页任意二级 Tab 内，卡片按来源分组，组头顺序与市场页一致，「本地创建」在最后。
- [ ] 工具栏只有搜索、排序与三个图标按钮；不存在 `⋯` 菜单，也不存在单独的「刷新列表」。
- [ ] 悬停任意图标或状态点，300ms 后出现提示语。
- [ ] 卡片右侧是水平排列的 `⋯` 与主按钮；未悬停时看不到 `⋯`，悬停后出现且不引起布局位移。
- [ ] 管理源是居中弹窗，宽度不超过 720px 且在任何窗口下留 32px 边距；只支持拖动排序，没有上下箭头。

---

## 8. 待 Lead 拍板的歧义点

1. **删除源后的孤儿技能归属**：v2.2 决策单只定义「有 `sourceId` 归市场源组、无 `sourceId` 归本地创建组」。删除源后，其安装记录仍带 `sourceId` 但源已不存在。本稿暂定并入 `本地创建`（§4.10），避免出现无组头卡片；另一方案是独立「来源已移除」组并排在 `本地创建` 之前。需确认其一。
2. **市场 Tab 是否也放「检查更新」**：v2.2 决策单 §3 只写了「技能」Tab 工具栏的三个图标，市场工具栏只有搜索 / 排序 / 管理源。本稿按字面只在技能 Tab 提供检查更新；若用户在市场页也想手动检查，需要在市场工具栏补第四个图标（会打破「三个图标按钮」的验收口径）。
3. **更新图标的点击语义**：v2.2 决策单未改 v2.1 的「触发更新流程」。本文继续按「直接打开 DL-04 的全部更新确认」出稿（§2.8、§4.4）。若希望先打开更新清单供用户勾选，或只更新第一项，需要改 §4.4 与 DL-04 的批量变体。

---

## 9. 版本记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v3.2 | 2026-11-09 | 按 v2.2 评审决策单更新：技能页二级 Tab 内再按来源分组；工具栏改为搜索 + 排序 + 三个图标按钮并删除 `⋯` 菜单；「检查更新」合并「刷新列表」；管理源由抽屉改 720px 弹窗、排序由上移/下移改拖动 + `Alt+↑/↓`；卡片右侧操作改水平、`⋯` hover 120ms 淡入且不位移；补弹窗规格、组头/拖动文案与 v2.2 验收 |
| v3.1 | 2026-11-09 | 按 v2.1 评审决策单更新：二级 Tab 替代折叠分组、技能与市场改两列卡片、市场按源分组并支持源排序（MS-05）、两条横幅改为状态图标、弹窗宽度收敛为 488 / 480 / 720，补文案与验收口径 |
| v3.0 | 2026-11-09 | 按 v2 IA 决策重写：两 Tab、四分组、0 个位置 chips、诊断「一句人话 + 一个动作」、市场内管理源抽屉、市场详情四态、更新全流程、键盘分层与完整文案清单 |