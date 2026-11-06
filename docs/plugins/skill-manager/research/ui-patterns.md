# DSH Web UI 界面取证报告（侧栏 / Plugins / Settings）

> 目标：为「Skill 管理」插件页提供真实界面基线。所有尺寸、间距、字号均来自
> 浏览器内 `getComputedStyle()` 与 `getBoundingClientRect()` 实测，不是从截图估算。
> 截图仅用于视觉验收。

- 取证对象：`http://127.0.0.1:53115`（the agent harness Web GUI，标题 `DeepSeek Harness`）
- 视口：`1200 × 901` CSS px，`devicePixelRatio = 2`
- 主题：默认深色（`color-scheme: dark`，`body` 背景 `rgb(21,21,23)`）
- 方法：ego-browser（Chromium）+ `page.snapshot()` + `page.evaluate()`；全程只读浏览，
  未安装任何插件、未调用 `plugin_manager`、未修改设置；为取亮色 token 曾临时切到「浅色」，
  取证后已切回「深色」并验证 `color-scheme: dark`。
- 取证时间：2026-11-06

---

## 1. 全局框架

根节点是 CSS Grid，四个区域 + 覆盖层 + 拖拽手柄：

| 区域 | 类名 | 展开时尺寸 | 折叠时尺寸 | 背景 |
| --- | --- | --- | --- | --- |
| 侧栏列 | `PIRFFq_sidebarCol` | `280 × 901` | `55.5 × 901` | `#1b1b1c` |
| 中央列 | `PIRFFq_centerCol` | `920 × 901` | `1144 × 901` | 透明 |
| 右栏列 | `PIRFFq_rightbarCol` | `0` | `0` | 透明 |
| 底部行 | `PIRFFq_bottomRow` | `0` 高 | `0` 高 | `#151517` |
| 覆盖层 | `PIRFFq_overlayLayer` | `1200 × 901` | 同 | 透明 |
| 拖拽手柄 | `PIRFFq_handle` | `8 × 901`，x=276 | — | 透明 |

`frame` 的 `grid-template-columns`：展开 `280px 920px 0px`，折叠 `56px 1144px 0px`。
侧栏列右边框：`0.5px rgba(255,255,255,0.16)`（≈ `--dsw-alias-border-l2`）。
整页底色 `--dsw-alias-bg-base: #151517`。

---

## 2. 左侧栏（本次设计核心）

侧栏真实宿主是 `<div data-slot="sidebar" style="display:contents">` 下的
`div.kB3qhq_root`，宽度由内联样式 `width: 280px` 控制，折叠时切换为
`kB3qhq_root kB3qhq_collapsed kB3qhq_railIn`。

### 2.1 展开态（280px）

`root`：`280 × 901`，`padding: 6px 8px`，`background: #1b1b1c`
（`--dsw-specific-sidebar-fill`），`display:flex; flex-direction:column`。

| 区块 | 类名 | 几何（x,y,w×h） | 内边距 / 间距 | 说明 |
| --- | --- | --- | --- | --- |
| 品牌行 | `logoRow` | `8,6 264×60` | `padding 8px 0 8px 8px`，`gap 8px` | 可拖动窗口区（`data-window-drag`） |
| 品牌标识按钮 | `brand.wide` | `16,24 220×24` | — | logo mark `24×18` + 品牌字 svg `156×24` |
| 折叠按钮 | `iconButton.toggle` | `244,22 28×28` | `border-radius 8px`，svg `16×16` | `aria-label="收起侧边栏"` |
| 新建会话 | `newSession` | `12,66 256×38` | `padding 8px 12px`，`radius 12px` | 背景 `#43454a`（`--dsw-alias-button-elevated-fill`），`14px/22px`，图标 `14×14`，右侧 `⌥⌘N` kbd `12px/16px` |
| 全局面板列表 | `nav.panelList` | `8,114 264×112` | `gap 2px` | 3 行 |
| 面板行 | `panelRow` | `264×36` | `padding 7px 9px`，`gap 6px`，`radius 12px` | 图标槽 `16×16`，文字 `14px/22px` |
| 工作区区域 | `regionArea` | `4,234 276×573` | `padding-left 4px` | 内含会话树 |
| 工作区标题行 | `sectionHeader` | `8,236 268×36` | `padding 0 1px 0 12px`，`gap 4px`，`radius 12px` | 标题 `14px/20px`；右侧 3 个 `28×28` 图标按钮（搜索会话 / 视图选项 / 添加工作区），`radius 8px` |
| 会话树 | `tree` | `4,276 274×531` | `padding 0 1px 16px 4px` | 工作区组 + 会话行 |
| 工作区行 | `JoiKIa_projectRow` | `264×34` | `padding 0 8px 0 9px`，`gap 6px`，`radius 12px` | `border-left: 3px solid transparent` |
| 会话行 | `JoiKIa_sessionRow` | `264×32` | 同上 | `border-left: 3px solid transparent`（预留高亮条位） |
| 底部动作区 | `footArea` | `8,807 264×88` | — | 见 2.3 |
| 会话统计（插件） | `ss-footer-entry` | `8,807 133×36` | `padding 0 10px`，`gap 8px`，`radius 10px` | `13px/20px`，图标 `18×18`，`--dsw-*` 之外的 `ss-` 前缀由插件自定义 |
| MCP 服务（插件） | 插件自定义按钮 | `141,807 131×32` | `padding 0 8px`，`gap 8px`，`radius 6px` | `12px`，与上一行并排；说明 footer 可横向容纳多个插件入口 |
| 账号（Settings 入口） | `settingsArea` → `triggerRow` | `8,847 264×44` | `gap 8px` | 实际按钮 `260×44`，`padding 6px`，`radius 12px`，头像 + 用户名 `14px` |

会话行内部：

- 状态槽 `16×20`（图标 `14×14`，`#adb2b8`，进行中显示旋转/子智能体标记）
- 标题 `14px/20px`，`#f9fafb`，左边距 `6px`，超出省略
- 时间 `10px/16px`，`#adb2b8`，靠右
- `rowActions`：`gap 13px`，默认隐藏，悬停出现

### 2.2 折叠态（rail，56px）

`root`：`56 × 901`，`padding: 18px 10px 6px`，`flex-direction: column`。
所有图标按钮统一 `36×36`、`radius 12px`、图标 `18×18`（品牌 mark 仍为 `24×18`）。

| 元素 | 几何（x,y,w×h） | 间距 |
| --- | --- | --- |
| 展开按钮（品牌位） | `10,18 36×36` | 行内居中 |
| 新建会话 | `10,66 36×36` | 与上一行 12px 间隙 |
| 面板列表 | `10,114 36×132` | `gap 12px`（3 个 36px 按钮） |
| 工作区操作区 | `10,258 36×547` | 添加工作区 `@258`、搜索会话 `@306`，间距 12px |
| 底部动作区 | `10,805 36×90` | 会话统计 `@805`（`radius 10px`）、头像 `@849`（`radius 12px`） |

**label 呈现规则**

- 展开态：面板行与底部行显示文字 label（`panelTitle.wide`、`ss-footer-label`）。
- 折叠态：文字 label 隐藏（DOM 中仍有 `aria-label`），鼠标悬停弹出 tooltip。
- tooltip 实测：`40×26`，背景 `#43454a`，文字白色，`13px/20px`，`padding 3px 7px`，
  `border-radius 8px`，`z-index 100`，定位在图标右侧（`translateY(-13px)`）。
- 品牌名在折叠态只剩 logo mark；账号行只剩头像。

### 2.3 底部与 Settings 入口（重要）

侧栏底部**不是**一组并列的「Plugins / Schedules / Session Stats / Settings」图标，
实测是三层结构：

1. `footArea > footerActions`：**插件注册的 footer action 槽**（`data-slot="sidebar.footer.action"`），
   横向排列。当前装有两个入口：「会话统计」（session-stats）与「MCP 服务」（mcp-manager）。
   两者样式各自由插件决定，宽度随内容（133px / 131px），高度 36px / 32px。
2. `settingsArea`：`data-slot="settings.launcher"` 包裹的**账号菜单**（头像 + 用户名），
   点击弹出 `144×110` 菜单（`border-radius 16px`，`padding 4px`，item `136×34`、`padding 6px 8px`、
   `radius 12px`、`13px`），菜单项：设置 `⌥⌘,` / 意见反馈 / 退出登录。
   **Settings 入口在账号菜单内，不在侧栏直接可见。**
3. 「插件」「自动化任务」「更多」在**顶部** `panelList`（新建会话按钮下方），不在底部。
   「更多」是菜单锚点（`moreAnchor`），菜单 `288×76`，两项：浏览更多插件 / 创建你的插件。

因此给 Skill 管理页选入口时：要么占用 `panelList`（全局面板列表，与 Plugins 同级），
要么占用 `footerActions`（底部插件入口，与会话统计/MCP 服务同级）。两者都是 slot。

### 2.4 选中态与悬停态

| 状态 | 实测值 | 备注 |
| --- | --- | --- |
| 面板行悬停 | `background: rgba(255,255,255,0.08)` | `--dsw-alias-interactive-bg-hover` |
| 面板行选中（`panelActive` + `aria-current="page"`） | `background: rgba(255,255,255,0.08)`，文字仍 `#f9fafb` | 无左侧高亮条；仅背景填充 + 圆角 |
| 会话行悬停 | `background: rgba(255,255,255,0.08)` | 行有 `border-left: 3px solid transparent`，为高亮条预留 |
| 会话行选中 | 当前界面没有处于选中态的会话行（`aria-selected="false"`），未实测到 | 规则为 CSS-in-JS，样式表不可读，**建议实现时沿用 8% 白底 + 3px 左侧强调条** |
| 设置导航项选中 | `background: #43454a`，`aria-current="true"` | 深色下 `--dsw-specific-sidebar-nav-item-active` |
| 图标按钮悬停 | 未单独实测（父行悬停即整行高亮） | 建议 `8%` 白底 |

### 2.5 侧栏可扩展点（`data-slot`）

实测存在的插槽：

- `sidebar`（整栏宿主）
- `sidebar.brand.mark` / `sidebar.brand.name`
- `sidebar.panellist`（每个面板行图标前）
- `sidebar.workspaces` / `sidebar.workspaces.directoryFlow`
- `sidebar.footer.action`（底部插件入口，可多个）
- `sidebar.settings`（账号/Settings 启动器）

---

## 3. 页面框架（中央列）

所有全局面板页共用同一骨架（Plugins、发现、详情、MCP 服务均如此）：

```
section.page            padding 0 48px
└ div.pageBody          padding 0 48px 48px; gap 32px
  └ div.pageBar         padding 0 48px; height 130px（带 tabs）
    └ header.pageHead   padding-top 28px; gap 16px
      ├ div.pageHeading (标题)
      ├ div.toolbar     gap 8px 16px（右对齐）
      └ div.pageTabs    height 34px
  └ div.<panel>         gap 32px（内容分组）
```

实测（Plugins 页，视口 1200 宽）：

| 元素 | 几何 | 排版 |
| --- | --- | --- |
| 主区 | `280,0 920×901` | — |
| 页面标题 | `328,28` | `20px/28px`，`font-weight 500`，`#f9fafb`（`--dsw-font-l-20`） |
| 页面描述 | `328,60` | `13px/20px`，`#cfd3d6`（`--dsw-alias-label-secondary`），与标题 `gap 4px` |
| 标题旁 info 按钮 | `462,60 20×20` | `12px`，`#81858c`，`radius 8px` |
| 工具栏 | `937,28 215×32` | 右对齐，`gap 8px 16px` |
| Tab 分段容器 | `328,96 824×34` | 背景 `#353638`（`--dsw-alias-bg-layer-3`），`radius 14px`，`padding 2px` |
| Tab | `120×30` | `padding 0 12px`，`radius 12px`，`14px/20px`；选中 `fw 500` + `#f9fafb`，未选中 `fw 400` + `#cfd3d6`；无下划线指示条 |
| 内容区 | `328,162 819×…` | 分组 `gap 32px` |
| 分组标题 | 高 `22` | `14px`，`fw 500`，`#f9fafb`，与列表 `gap 8px` |

---

## 4. Plugins 页

### 4.1 「已安装」标签页

三个分组，均为 `section.group`（标题 + `ul.cards`）：

1. **内置插件配置**（4 行）：子智能体 / 网页搜索 / Agent 循环 / 终端
2. **实验性插件**（带「更多」ghost 按钮，`56×28`）：智能体团队、语音输入、自定义插件索引、
   自动授权审查、变更请求与工作树、个性化推荐、思考过程机器翻译、会话搜索、随对话更新的标题、
   Ralph 循环、Codex 子智能体、Claude Code 子智能体
3. **已安装插件**：MCP 服务管理、会话统计（用户安装的插件）

行规格（列表形态）：

| 元素 | 几何 | 排版 |
| --- | --- | --- |
| 行 `li` | `835×65`，`radius 20px` | `padding 8px`；`ul gap 2px`；背景透明（hover 才浮出） |
| 图标容器 `cardIcon` | `49×49`，`radius 16px` | `border: 0.5px rgba(255,255,255,0.16)`；内嵌 svg `36×36` |
| 主区 `cardMain` | `756×42` | — |
| 标题 | 行高 20 | `14px`，`fw 500`，`#f9fafb` |
| 描述 | 行高 18 | `13px`，`#adb2b8`（`--dsw-alias-label-tertiary`），单行省略 |
| 尾部 | 开关或按钮 | 实验性插件为 switch，内置配置为 `查看` 按钮 |

- 「实验性」badge：`11px/17px`，`fw 500`，`padding 1px 8px`，`radius 999px`，
  深色下为蓝色 10% 底 + `#7aaaff` 字（详情页实测同规格）。
- 开关（switch）：`36×20`，`radius 999px`，`padding 2px`；
  开：`background #f9fafb`；关：`rgba(255,255,255,0.16)`。
- 「更多」ghost 按钮：`56×28`，`radius 8px`，`13px`，文字 + 右箭头。

### 4.2 工具栏按钮层级（可复用）

| 按钮 | 几何 | 样式 |
| --- | --- | --- |
| 刷新（outline） | `71×32`，`radius 12px` | 透明底，`inset 0 0 0 0.5px rgba(255,255,255,0.16)` 描边，`13px/20px`，`padding 0 12px`，图标 + 文字 `gap 4px` |
| 添加插件（主按钮，分体） | 主体 `96×32` + 下拉 `32×32` | 背景 `#f9fafb`，文字 `#0f1115`，`13px`；`radius 12px 0 0 12px` / `0 12px 12px 0` |
| 页面说明（icon） | `20×20` | 透明，`12px`，`#81858c` |

### 4.3 「发现」标签页

顶部工具栏（`819×33`，`gap 8px`，y=162）：

| 控件 | 几何 | 样式 |
| --- | --- | --- |
| 索引切换按钮 | `211×28` | 透明底，`12px/18px`，`fw 500`，`radius 8px`，`padding 0 10px` |
| 搜索框外壳 | `436×33` | 背景 `#232324`（`--dsw-alias-bg-layer-1`），`radius 12px`，`padding 0 8px`，`gap 6px`，`border: 0.5px solid rgba(255,255,255,0.2)` |
| 搜索输入 | `397×24` | 透明，`14px/22px`，`padding 1px 2px` |
| 排序按钮 | `120×28` | 透明，`12px/18px`，`radius 8px` |
| 刷新（图标） | `36×28` | 同上 |

分类筛选 chips（y=211）：高 `24`，`radius 999px`，`padding 0 8px`，`12px/18px`；
选中：背景 `#43454a`、文字 `#f9fafb`；未选中：背景 `#2c2c2e`、文字 `#cfd3d6`。
chip 间距 6px，共 24 个分类（全部、安全与权限、插件市场与管理、工具与能力、…）。

列表卡片（发现页）：

| 元素 | 几何 | 排版 |
| --- | --- | --- |
| 卡片 `li` | `835×76`，`radius 20px` | `padding 8px`，`gap 14px`；`ul gap 2px` |
| 图标 | `49×49`，`radius 16px` | svg `36×36` |
| 标题按钮 `cardOpen` | `14px`，`fw 500` | 可点击进入详情 |
| 描述 | `13px`，`#adb2b8` | 单行省略 |
| 元信息 `meta` | `12px`，`#adb2b8` | 形如 `0.6.10 · 2026年11月4日` |
| 安装按钮 | `45×28`，`radius 8px` | outline，`12px`，`padding 0 10px` |

加载态：列表区域显示 `status` 文本「正在读取索引」，卡片为占位 `list_item` 骨架
（不是 spinner）。

### 4.4 插件详情页（同页面内切换，不是抽屉/弹窗）

| 元素 | 几何 | 排版 |
| --- | --- | --- |
| 返回按钮 | `45×18` | `12.5px`，`#adb2b8`，`gap 6px`，无背景 |
| 详情头 | 图标 + 标题 + 版本 + 作者 + 安装按钮 | 标题 `20px/28px` `fw 500` |
| 描述段落 | 宽 796 | 正文 `16px/26px` |
| 「推荐」badge | `38×19` | `11px/17px`，`fw 500`，`padding 1px 8px`，`radius 999px`，蓝 10% 底 + `#7aaaff` |
| 版本行 | `819×57` | `padding 8px 0`，`border-bottom: 0.5px rgba(255,255,255,0.12)`，`gap 8px` |
| 来源定义列表 | 每行 `li` | 左标签 + 右值（链接用 `--dsw-alias-link: #7aaaff`） |
| 代码块操作 | `24×24` 按钮 | `radius 8px`，透明 |

加载态：正文位置显示 `status`「正在读取详细介绍」。

---

## 5. Settings（设置浮层）

### 5.1 形态

Settings **不是路由页面**，而是覆盖全屏的 `role="dialog"` 浮层：

- 面板：`800×800`，居中（`x=200, y=51`），背景 `#2c2c2e`
  （`--dsw-alias-settings-card-fill`），`border-radius 28px`（`--dsw-radius-panel`），
  外阴影 `0 0 0 0.5px rgba(255,255,255,0.2), 0 3px 8px, 0 0 20px`（`--dsw-elevation-*`）。
- 结构：左导航 `188px` + 右内容 `612px`。
- 左导航标题「设置」：`188×54`，`padding 22px 12px 8px 24px`，`16px/24px`，`fw 500`。
- 左导航列表：`188×746`，`padding 10px 12px 0`。
- 导航项：`164×40`，`padding 9px 16px 9px 12px`，`radius 12px`，`gap 8px`，`14px/22px`；
  选中 `background #43454a` + `aria-current="true"`。
- 右内容头：`612×54`，`padding 20px 14px 8px 10px`，`gap 8px`，右对齐
  「打开配置文件」`93×28`（outline，`12px`，`radius 8px`）+ 关闭按钮 `28×28`。
- 右内容滚动区：`612×746`，`padding 0 24px 24px`。

导航项（当前版本）：账号与余额、通用设置、模型、内置插件、Agent 预设。
**没有 MCP 项**——mcp-manager 没有嵌入 Settings，而是注册了侧栏底部的全局面板（见 §6）。

### 5.2 通用设置：设置行模式

每行是「左标签 + 说明，右控件」的 flex 行，行间由 `gap` 分隔（无分隔线）：

| 行 | 控件形态 | 尺寸 |
| --- | --- | --- |
| 权限 | 下拉按钮「工作区内修改」 | 见下拉规格 |
| 语言 | 下拉按钮「中文」 | — |
| 外观 | 三档分段控件：浅色 / 深色 / 跟随系统 | 每档 `181×83`，`radius 20px`，`padding 20px 32px`，`gap 4px`，`border 0.5px`；选中：`bg #353638` + `border #adb2b8`；未选中：透明 + `border rgba(255,255,255,0.2)` |
| 字号大小 | 数值 + 增大/减小图标按钮 | `16px` + 两个图标按钮 |
| 工作步骤展示 / 收起时机 / 收起后显示 | 下拉按钮 | 下拉：`166×36`，`bg #353638`，`radius 12px`，`padding 0 14px`，`14px/22px`，`gap 12px` |
| 显示代码工作视图 | switch | `36×20` |
| 快捷键 | 次级按钮「编辑快捷键」 | — |

行标签：`14px`（标题）+ `13px`（说明，`#adb2b8`）。

**亮色切换入口**：设置 → 通用设置 → 外观 → 「浅色」。
切换后 `document.documentElement` 的 `color-scheme` 从 `dark` 变 `light`，
`body` 背景由 `rgb(21,21,23)` 变 `rgb(255,255,255)`；没有 `data-theme` 属性，
主题通过 CSS 变量整体替换。取证后已切回深色。

### 5.3 内置插件页（Settings 内，与 Skill 管理页最接近的现成范式）

| 元素 | 几何 | 排版 |
| --- | --- | --- |
| 页面标题 | — | `18px`，`fw 600` |
| 说明 | — | `13px`，`#adb2b8` |
| 搜索框 | `559×36`（整行宽） | `13px`，圆角输入 |
| 筛选行 | 左「会话插件」`76×22`；右 Agent 预设下拉 `166×36` | 下拉 `bg #353638`，`radius 12px`，`padding 0 14px`，`14px` |
| 分组说明 | — | `13px`，`#adb2b8`（「由 Agent 预设按会话组成」） |
| 列表 | `ul` `gap 10px`，**两列网格** | 每卡 `275×111`，`bg #2c2c2e`，`radius 20px`，`border 0.5px rgba(255,255,255,0.2)` |
| 卡片内按钮 | `padding 12px 14px`，`gap 2px` | 标题行高 20；描述 `12px` `#adb2b8`（两行 36px）；元信息（插件 id）行高 26；右上角 `12×12` 尾部图标 |
| 状态标记 | 「已停用」文字标记 | 与标题同行 |

这是「设置内嵌的插件列表」的官方范式：**搜索 + 筛选 + 两列卡片网格 + 卡片可点开**。

---

## 6. MCP 服务页（mcp-manager 的嵌入形态）

mcp-manager 已安装并启用，它的设置页**不是** Settings 的子页，而是一个与 Plugins
同级的**全局面板页**，入口在侧栏底部 `footerActions`（`data-slot="sidebar.footer.action"`），
按钮 `131×32`，`radius 6px`，`12px`，`padding 0 8px`，`gap 8px`。

页面结构（centerCol 内，自带页头，未复用 §3 的 48px 页面内边距）：

| 元素 | 几何 | 样式 |
| --- | --- | --- |
| 页面标题 | `304,28`（x = 280+24） | `16px/20px`，`fw 500` |
| 说明图标 | 标题右侧 | 提示「所有配置写入当前 Profile (cordis.patch.yml)…」 |
| 搜索框 | `200×36` | `bg #232324`，`radius 9px`，`padding 0 12px 0 30px`，`13px` |
| 图标按钮（测试全部） | `36×36` | `bg #232324`，`border 1px rgba(255,255,255,0.12)`，`radius 9px` |
| 主按钮「新增」 | `77×36` | `bg #f9fafb`，文字 `#151517`，`13px` `fw 500`，`radius 9px`，`padding 0 14px` |
| 服务器卡片 | 通栏 | 状态图标 + 名称 + 传输类型 + 延迟 + `N 工具`（`11.5px`）+ URL；右侧 4 个 `32×32` 操作按钮 |
| 停用按钮（成功态） | `32×32` | `bg rgba(34,197,94,0.12)`，文字 `#22c55e`，`border 1px rgba(34,197,94,0.3)`，`radius 8px` |

结论：**插件可以完全自定义页面布局**，但建议沿用 `--dsw-*` token 与 32–36px 控件高度
才能与主界面视觉一致（mcp-manager 的 9px 圆角、16px 标题比主界面略「紧」，属于插件自选风格）。

---

## 7. Token 实测表（暗 / 亮）

以下值由 `getComputedStyle()` 读取，非文档推断。主题切换后同名变量整体替换。

### 7.1 颜色

| Token | 深色 | 浅色 | 用途 |
| --- | --- | --- | --- |
| `--dsw-alias-bg-base` | `#151517` | `#fff` | 应用底色 |
| `--dsw-specific-sidebar-fill` | `#1b1b1c` | `#f9fafb` | 侧栏背景 |
| `--dsw-alias-bg-layer-1` | `#232324` | `#fff` | 输入框/搜索框底 |
| `--dsw-alias-bg-layer-2` | `#2c2c2e` | `#fff` | 卡片/浮层底 |
| `--dsw-alias-bg-layer-3` | `#353638` | `#fff` | Tab 容器/下拉底 |
| `--dsw-alias-label-primary` | `#f9fafb` | `#0f1115` | 主文字 |
| `--dsw-alias-label-secondary` | `#cfd3d6` | `#61666b` | 次要文字/描述 |
| `--dsw-alias-label-tertiary` | `#adb2b8` | `#81858c` | 辅助文字/元信息 |
| `--dsw-alias-label-caption` | `#81858c` | `#adb2b8` | 说明/占位 |
| `--dsw-alias-border-l1` | `#ffffff0f` | `#0000000a` | 细分隔线 |
| `--dsw-alias-border-l2` | `#ffffff1f` | `#0000001a` | 卡片/输入框描边 |
| `--dsw-alias-border-l3` | `#ffffff29` | — | 更强描边 |
| `--dsw-alias-border-l4` | `#fff3` | — | 20% 描边 |
| `--dsw-alias-interactive-bg-hover` | `#ffffff14`（8%） | `#2631480f` | 行/按钮悬停、选中底 |
| `--dsw-alias-interactive-bg-active` | `#ffffff24` | — | 按下态 |
| `--dsw-specific-sidebar-nav-item-active` | `#43454a` | `#ebeef2` | 设置导航/面板选中 |
| `--dsw-alias-button-elevated-fill` | `#43454a` | `#fff` | 「新会话」按钮 |
| `--dsw-alias-button-primary-fill` | `#f9fafb` | — | 主按钮底（新增/添加插件） |
| `--dsw-alias-label-primary-foreground` | `#0f1115` | — | 主按钮文字 |
| `--dsw-alias-settings-card-fill` | `#2c2c2e` | `#fff` | Settings 面板底 |
| `--dsw-alias-settings-card-stroke` | `#fff3` | `#00000029` | Settings 面板描边 |
| `--dsw-alias-state-success-primary` | `#22c55e` | — | 成功/运行中 |
| `--dsw-alias-state-error-primary` | `#f25a5a` | — | 错误/删除 |
| `--dsw-alias-state-warn-primary` | `#f59e0b` | — | 警告 |
| `--dsw-alias-link` | `#7aaaff` | `#4176e6` | 链接 |
| `--dsw-alias-bg-skeleton` | `#ffffff14` | `#0000000a` | 骨架屏 |
| `--dsw-alias-scrollbar-bg-l1` | `#3c3c3d` | `#e5e5e5` | 滚动条 |
| `--dsw-menu-surface-fill` | `#303136a3` | — | 菜单底（半透明 + 毛玻璃） |
| `--dsw-menu-backdrop-filter` | `blur(40px) saturate(150%)` | — | 菜单毛玻璃 |

### 7.2 圆角

| Token | 值 | 用途 |
| --- | --- | --- |
| `--dsw-radius-xs` | `4px` | 小标记 |
| `--dsw-radius-sm` | `8px` | 图标按钮、badge 内元素、小按钮 |
| `--dsw-radius-md` | `12px` | 侧栏行、按钮、输入框、Tab |
| `--dsw-radius-lg` | `16px` | 图标容器、菜单 |
| `--dsw-radius-xl` | `20px` | 卡片、分段控件档位 |
| `--dsw-radius-panel` | `28px` | Settings 面板 |

（另有实测：Tab 容器 `14px`、胶囊 `999px`。）

### 7.3 字体与字号

| Token | 值 |
| --- | --- |
| `--dsw-font-xxs-12` | `12px/18px` |
| `--dsw-font-xs-13` | `13px/20px` |
| `--dsw-font-s-14` | `14px/22px` |
| `--dsw-font-m-18` | `500 16px/28px` |
| `--dsw-font-l-20` | `500 20px/28px` |
| `--dsw-font-xl-24` | `600 24px/32px` |
| `--dsw-font-family` | `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", …` |
| `--dsw-font-family-brand` | `"Montserrat", …` |

实测零星字号：侧栏时间 `10px/16px`、快捷键 kbd `12px/16px`、badge `11px/17px`、
详情返回 `12.5px`、MCP 工具数 `11.5px`。

### 7.4 阴影与焦点

| Token | 值 |
| --- | --- |
| `--dsw-elevation-stroke` | `0 0 0 .5px #fff3` |
| `--dsw-elevation-panel` | `0 0 0 .5px #fff3, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005` |
| `--dsw-elevation-prominent` | `0 0 0 .5px #fff3, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d` |
| `--dsw-shadow-lv1 / lv2 / lv3` | `0 2px 4px…` / `0 4px 12px…, 0 2px 8px…` / `0 0 1px…, 0 0 4px…, 0 12px 32px…` |
| `--dsw-focus-ring-width` | `2px` |
| `--dsw-corner-shape` | `superellipse(1.5)`（连续曲率圆角） |

菜单实测阴影：`rgba(255,255,255,0.16) 0 0 0 0.5px, rgba(0,0,0,0.04) 0 3px 8px, rgba(0,0,0,0.05) 0 0 20px`。

---

## 8. 给「Skill 管理页」的可复用规格

### 8.1 入口选择

- 方案 A（推荐，与 Plugins 同级）：注册 `sidebar.panellist` 项，面板行 `264×36`、
  `padding 7px 9px`、`gap 6px`、`radius 12px`、图标 `16×16`、文字 `14px/22px`；
  折叠态自动变 `36×36` + `18×18` 图标 + tooltip。
- 方案 B：注册 `sidebar.footer.action`，底部入口，宽度随内容，建议 `≤ 160px`、高 `36px`。
- 不要试图直接放进 Settings 左导航（那是核心导航，插件无对应 slot）。

### 8.2 页面骨架（照抄 §3）

```
padding: 0 48px（页面）/ 28px 顶部留白 / gap 16px
标题 20px/28px 500 + 描述 13px/20px secondary（gap 4px）
工具栏右上：outline 按钮 32px 高 + 主按钮 32px 高
Tab 分段：容器 34px 高、bg layer-3、radius 14px、pad 2px；tab 30px 高、radius 12px、pad 0 12px
内容区：分组 gap 32px；分组标题 14px/500 高 22px，与列表 gap 8px
```

### 8.3 列表形态二选一

1. **行列表**（Plugins 已安装页）：行高 `65px`，`radius 20px`，`padding 8px`，
   图标容器 `49×49 / radius 16px`（内 svg `36×36`），标题 `14px/500`，描述 `13px` tertiary 单行省略，
   尾部放 switch 或 `查看` 按钮。
2. **两列卡片网格**（Settings 内置插件页）：`gap 10px`，卡片 `275×111`，
   `bg layer-2`、`radius 20px`、`border 0.5px border-l2`、`padding 12px 14px`；
   标题行 20px、描述 `12px` 两行、元信息行 26px。

技能条目字段较多（名称、来源、版本、启用状态、描述、标签），建议**行列表**为主，
每个技能一行 65px；如需展示技能包分组，用 §4.1 的「分组标题 + 列表」结构。

### 8.4 控件规格

| 控件 | 规格 |
| --- | --- |
| 搜索框 | 高 `33px`（工具栏内）/ `36px`（设置内整行）；`bg layer-1`，`radius 12px`，`padding 0 8px`（含图标）或 `0 12px 0 30px`（纯输入）；`border 0.5px border-l2`；文字 `13–14px` |
| 分段 Tab | 见 8.2 |
| 筛选 chip | 高 `24px`，`radius 999px`，`padding 0 8px`，`12px/18px`；选中 `bg #43454a`，未选中 `bg layer-2` |
| switch | `36×20px`，`radius 999px`，`padding 2px`；开 `bg label-primary`，关 `bg rgba(255,255,255,0.16)` |
| 主按钮 | 高 `32px`，`radius 12px`，`bg label-primary`，文字 `label-primary-foreground`，`13px`，`padding 0 12px` |
| 次按钮（outline） | 高 `28–32px`，`radius 8–12px`，`inset 0 0 0 0.5px border-l4`，`12–13px` |
| ghost 按钮 | 高 `28px`，`radius 8px`，透明底，`13px` |
| 图标按钮 | `28×28`（侧栏行内）/ `32×32`（卡片操作）/ `36×36`（工具栏），`radius 8–9px` |
| badge | `11px/17px`，`fw 500`，`padding 1px 8px`，`radius 999px`，状态色 10% 底 + 状态色字 |
| 下拉按钮 | 高 `36px`，`bg layer-3`，`radius 12px`，`padding 0 14px`，`14px`，`gap 12px` |
| 菜单 | `radius 16px`，`padding 4px`；item 高 `34px`，`padding 6px 8px`，`radius 12px`，`13px`；半透明底 + `blur(40px) saturate(150%)` |
| tooltip（折叠态） | `padding 3px 7px`，`radius 8px`，`bg #43454a`，`13px/20px`，白字 |

### 8.5 状态设计

- **加载**：官方做法是文本状态（`status` 角色）+ 占位骨架行，不用大 spinner。
  实测文案：「正在读取索引」「正在读取详细介绍」。
- **空状态**：本次未观察到官方空状态（在发现页输入不存在的关键词未触发过滤，
  列表仍显示原内容），需要自行设计；建议沿用 `label-tertiary` 文案 + 居中 `--dsw-alias-bg-skeleton`
  插图位，并给一个主按钮出口。
- **错误**：未观察到错误态；`--dsw-alias-state-error-primary: #f25a5a` 可用于文案与图标。
- **禁用**：Settings 内置插件页用文字标记「已停用」（`12–13px`，`label-tertiary`），
  而非降低整行透明度。
- **toast / 抽屉**：本次未观察到（详情页为同页切换，Settings 为 dialog）。

### 8.6 尺寸速查

- 侧栏：展开 `280px` / 折叠 `56px`（内容区 `36px` + 左右 `10px`）
- 侧栏行：面板 `36px` 高、工作区行 `34px`、会话行 `32px`、底部账号行 `44px`
- 图标：侧栏行 `16px`（展开）/ `18px`（折叠）、卡片 `36px`、按钮内 `14–16px`
- 卡片：行式 `65px` 高、网格式 `275×111`
- Settings：面板 `800×800`，左导航 `188px`，右内容 `612px`

---

## 9. 截图索引

| 文件 | 内容 | 主题 |
| --- | --- | --- |
| `docs/plugins/skill-manager/research/assets/ui-01-sidebar-expanded-dark.png` | 侧栏展开态（280px）+ 会话页 | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-02-sidebar-collapsed-dark.png` | 侧栏折叠态（56px rail） | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-03-plugins-installed-dark.png` | Plugins「已安装」：分组、行列表、switch、badge | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-04-plugins-discover-dark.png` | Plugins「发现」：工具栏、搜索、分类 chips、卡片列表 | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-05-plugin-detail-dark.png` | 插件详情页：返回、头部、版本、来源 | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-06-settings-dark.png` | Settings 浮层：左导航 + 右内容 | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-07-settings-general-dark.png` | 通用设置：设置行、外观三档分段 | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-08-settings-builtin-plugins-dark.png` | 内置插件页：搜索 + 筛选 + 两列卡片网格 | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-09-mcp-service-dark.png` | MCP 服务全局面板（mcp-manager 嵌入形态） | 深色 |
| `docs/plugins/skill-manager/research/assets/ui-10-sidebar-expanded-light.png` | 侧栏展开态 | 浅色 |
| `docs/plugins/skill-manager/research/assets/ui-11-plugins-installed-light.png` | Plugins「已安装」 | 浅色 |
| `docs/plugins/skill-manager/research/assets/ui-12-plugins-empty-search-dark.png` | 发现页搜索无结果时（未触发空状态，作对照） | 深色 |

> 说明：`ui-10`/`ui-11` 为亮色取证，取证完成后已把主题切回「深色」，
> 当前 GUI 保持原有深色设置。

---

## 10. 限制与未覆盖项

1. **会话行选中态未实测**：取证时没有处于选中态的会话行，且样式为 CSS-in-JS
   （`document.styleSheets` 读不到规则），只能确认行上预留了 `border-left: 3px` 高亮位。
   实现时建议「8% 白底 + 3px 左侧强调条」，并在真实界面复核。
2. **空状态、错误态、toast、确认弹窗未观察到**：发现页搜索没有触发过滤，故无法截取空状态；
   本次未执行任何写操作（安装、删除、保存），因此也没触发 toast / 确认框。
3. **右键菜单、拖拽排序**未取证（会话行 `draggable="true"` 存在）。
4. 侧栏存在「工作区/会话树」的虚拟滚动与底部渐隐遮罩（`Kjh-qa_fade`，`264×24`），
   会话很多时的行为未测试。
5. 本次未覆盖移动端/窄视口布局；视口固定 `1200×901`。

---

## 11. 关键结论（供 Lead 汇总）

1. 侧栏是「展开 280px / 折叠 56px」两态，内容区 36px + 左右各 10px 内边距；
   行高 32–44px，图标 16px（展开）/18px（折叠），折叠态靠 tooltip 显示 label。
2. 侧栏底部不是图标列，而是三层：插件 footer action 槽（会话统计、MCP 服务）→
   账号菜单（Settings 入口，含「设置/意见反馈/退出登录」）。Plugins 与自动化任务在
   **顶部**面板列表。
3. 选中/悬停统一用 `rgba(255,255,255,0.08)`（`--dsw-alias-interactive-bg-hover`）+
   12px 圆角，无边框、无下划线指示条；会话行预留 3px 左侧高亮位。
4. 页面骨架统一为：48px 左右内边距 + 28px 顶留白 + 20/28 标题 + 13/20 描述 +
   右上工具栏 + 34px 分段 Tab + 32px 分组间距。
5. Plugins 页提供两套可复用列表范式：65px 行列表（图标 49×49 圆角 16）与
   275×111 两列卡片网格（Settings 内置插件页），后者最适合「按预设分组的技能清单」。
6. Settings 是 800×800、圆角 28px 的模态浮层，左导航 188px（项高 40px、选中 `#43454a`）
   + 右内容 612px；mcp-manager 未嵌入 Settings，而是注册了侧栏底部的全局面板页。
7. Token 已实测（暗/亮对照），实现时只用 `--dsw-*`；圆角阶梯 4/8/12/16/20/28，
   字体 12/13/14/16/20/24，控件高 24/28/32/36，卡片 20px 圆角、面板 28px 圆角。
