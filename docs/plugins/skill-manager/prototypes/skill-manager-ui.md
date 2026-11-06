# 技能管理（Skill Manager）· 高保真 UI 原型

> 依据：`docs/plugins/skill-manager/design/skill-manager-interaction.md`（交互稿 v1，含 §2.3/§3.2/§3.4/§9 的事实修正）
> 与 `docs/plugins/skill-manager/research/ui-patterns.md`（真实 DSH 界面实测几何与 token）。
> 产物：单文件可交互原型 + 8 张关键画面截图（1440×900 @2x）。

| 文件 | 说明 |
| --- | --- |
| `docs/plugins/skill-manager/prototypes/skill-manager-ui.html` | 单文件原型，零网络依赖（无 CDN / 外链字体 / 外链图片），图标全部为内联 SVG |
| `docs/plugins/skill-manager/prototypes/screens/01–08-*.png` | 关键画面，2880×1800（1440×900 @2x） |
| `docs/plugins/skill-manager/prototypes/skill-manager-ui.md` | 本文件 |

---

## 1. 如何打开

直接用浏览器打开 HTML 即可（无需服务器、无需构建）：

```bash
open docs/plugins/skill-manager/prototypes/skill-manager-ui.html
# 或带参数
open "docs/plugins/skill-manager/prototypes/skill-manager-ui.html?view=detail&theme=dark"
```

复现截图（headless Chrome，注意 `clean=1`）：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --hide-scrollbars --force-device-scale-factor=2 \
  --virtual-time-budget=2500 --window-size=1440,900 \
  --screenshot=/abs/path/01-library-dark.png \
  "file:///abs/path/skill-manager-ui.html?view=main&theme=dark&clean=1"
```

## 2. URL 参数

| 参数 | 取值 | 默认 | 作用 |
| --- | --- | --- | --- |
| `view` | `main` / `rail` / `detail` / `new` / `sources` / `diagnostics` / `empty` | `main` | 决定初始画面：主列表 / 侧栏折叠 / 详情抽屉 / 新建模态 / 来源 tab / 诊断 tab / 空状态 |
| `theme` | `dark` / `light` | `dark` | 只切换 `html[data-theme]` 上的 CSS 变量，结构与组件完全一致 |
| `clean` | `1` / `0` | `0` | `1` 隐藏右下角原型辅助控件（**所有截图均使用 `clean=1`**） |
| `dtab` | `overview` / `raw` / `assets` / `diag` | — | 配合 `view=detail`，直接打开抽屉的某个分段（便于截取原文/资源/诊断态） |
| `mtab` | `write` / `import` | — | 配合 `view=new`，直接切到「手写」或「导入」 |
| `debug` | `1` | — | 开发用几何探针（在左上角打印关键元素 `getBoundingClientRect`），不用于交付截图 |

> 不带 `clean=1` 时，右下角「原型」浮条可实时切换 7 个画面与明暗主题——这是原型辅助控件，不属于设计稿本身。

## 3. 八张画面要点

| 截图 | 要点 |
| --- | --- |
| `01-library-dark.png` | 主列表暗色：侧栏展开 280px（「技能」选中为 8% 白底 + radius 12）、页头 20px 标题 + 13px 描述、工具栏搜索/刷新/主按钮、34px 分段 Tab、问题横幅、筛选 chips、四个来源分组（项目 rank 100 / 用户 400 / 用户共享 500 / 插件内置 600）与默认收起的「已停用」组。 |
| `02-rail-dark.png` | 折叠 rail 56px：品牌 mark、圆形新会话、3 个面板入口（技能以 36×36 + 18px 图标选中），固定显示「技能」tooltip（`padding 3px 7px`、radius 8、`#43454a` 底、13/20 白字），右侧内容区随宽度扩展。 |
| `03-detail-dark.png` | 详情抽屉 560px：遮罩只覆盖中央区（保留侧栏上下文），左圆角 20、0.5px 描边；头部 32px 图标 + 等宽名称 20/28 + badges；四个分段 Tab；概览含描述、何时使用、来源卡片（类型/路径/rank/修改时间）、调用方式、可见于（cordis / standard）、相关诊断；底部固定操作条（复制调用命令 / 编辑 / ⋯）。 |
| `04-new-dark.png` | 新建模态 560px：手写/导入分段；名称 `Code Review` 触发 kebab-case 校验错误（红描边 + 行内错误文案 + 主按钮禁用）；描述、何时使用、Markdown 正文；保存位置二选一（用户 `~/.dsh/skills` / 项目 `<repo>/.dsh/skills`）。 |
| `05-sources-dark.png` | 来源 tab：Agent 预设三行（cordis/standard 已挂载、minimal 未挂载且「该预设的 Agent 没有技能」）；cordis 预设的 5 个本地扫描根按 rank 100→500 排列，行尾显示 rank 与状态（项目共享「目录不存在」、用户共享「1 个技能 · 1 个无效条目」、预设技能只读「查看」）；全局层 3 个 provider；底部覆盖规则说明。 |
| `06-diagnostics-dark.png` | 诊断 tab：摘要条（1 错误 / 1 警告 / 上次检查时间 / 重新检查）；问题卡一「断链 tabbit」（`~/.agents/skills/tabbit`，provider 静默跳过 → 移除链接）；问题卡二「同层覆盖（rank）code-review」（项目根 rank 100 优先于用户根 rank 400，切换预设后可能改变 → 查看生效项）；检查范围卡与静默跳过说明。 |
| `07-empty-dark.png` | 空状态：120×120 骨架插图 + 「还没有可管理的技能」+ 新建/导入/查看内置技能三个出口；下方仍展示「全局层技能 · 所有预设共享」（office-docx、personalized-pages），避免误以为系统没有技能；诊断计数同步降为 1。 |
| `08-library-light.png` | 亮色版主列表：只换 CSS 变量——白底 + `#f9fafb` 侧栏、主按钮反转为 `#0f1115` 底白字、Tab 容器 `#f0f0f2`、选中态 `#ebeef2`、描边改为 10% 黑；badge 状态色换成深色变体（`#15803d` / `#b45309` / `#4176e6`）保证 ≥4.5:1。 |

## 4. 组件 → DSH 槽位 / 实现映射

### 4.1 入口与页面

| 原型元素 | DSH 槽位 / 实现方式 |
| --- | --- |
| 侧栏「插件 / 自动化任务 / 技能」面板行 | `sidebar.panellist`，插件注册 `id = skill-manager`、`order: 20`；行 36px、`padding 7px 9px`、gap 6、radius 12、图标 16（折叠态自动 36×36 + 图标 18 + tooltip，由宿主侧栏实现，插件不重复造） |
| 折叠按钮 / 品牌行 / 新会话 / 工作区树 / 账号行 | 宿主侧栏原生内容，本原型只按实测几何复刻，插件不接管 |
| 底部「会话统计 / MCP 服务」 | 现存 `sidebar.footer.action` 插件（仅作视觉锚点，本插件不占该槽） |
| 中央主面板 | `main` 槽，key 同为 `skill-manager`；沿用 Plugins 页骨架：`padding 0 48px`、顶部 28px、标题 20/28 500、描述 13/20、分段 Tab 34px |
| 页内工具栏 / 筛选 chips / 分组列表 | 页面自有布局，不需要额外 slot |
| 详情抽屉、新建模态、删除确认、toast | 页面内自绘的 portal 覆盖层（`position: fixed` + 遮罩）；toast 建议复用宿主 toast 服务以保持位置与动画一致 |

### 4.2 视觉 token 映射（原型变量 → `--dsw-*`）

| 原型变量 | 暗色 | 亮色 | 对应 token |
| --- | --- | --- | --- |
| `--bg-base` | `#151517` | `#fff` | `--dsw-alias-bg-base` |
| `--sidebar-fill` | `#1b1b1c` | `#f9fafb` | `--dsw-specific-sidebar-fill` |
| `--layer-1 / 2 / 3` | `#232324` / `#2c2c2e` / `#353638` | `#f7f7f8` / `#fff` / `#f0f0f2` | `--dsw-alias-bg-layer-1/2/3` |
| `--label-1 / 2 / 3 / 4` | `#f9fafb` / `#cfd3d6` / `#adb2b8` / `#81858c` | `#0f1115` / `#61666b` / `#81858c` / `#adb2b8` | `--dsw-alias-label-primary/secondary/tertiary/caption` |
| `--border-l1 / l2 / l3` | `#ffffff0f` / `#ffffff1f` / `#ffffff29` | `#0000000a` / `#0000001a` / `#00000029` | `--dsw-alias-border-l1/l2/l3` |
| `--hover` / `--panel-active` | `#ffffff14` / `#ffffff14` | `#2631480f` / `#ebeef2` | `--dsw-alias-interactive-bg-hover` / `--dsw-specific-sidebar-nav-item-active` |
| `--primary-fill / --primary-fg` | `#f9fafb` / `#0f1115` | `#0f1115` / `#f9fafb` | `--dsw-alias-button-primary-fill` / `label-primary-foreground` |
| `--success / --error / --warn / --link` | `#22c55e` / `#f25a5a` / `#f59e0b` / `#7aaaff` | 深色变体 `#15803d` / `#dc2626` / `#b45309` / `#4176e6` | `--dsw-alias-state-*` / `--dsw-alias-link`（亮色文字色为对比度补偿） |
| `--shadow-panel / prominent` | `0 0 0 .5px #fff3, …` | `0 0 0 .5px #0000001a, …` | `--dsw-elevation-panel / prominent` |
| 圆角 | 12 / 14 / 16 / 20 / 999 | 同 | `--dsw-radius-md / (14px 分段容器) / lg / xl / 999` |

字体栈 `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei"`，等宽 `ui-monospace, SFMono-Regular, Menlo`，与 `--dsw-font-family` 一致。

### 4.3 数据与行为映射

| 原型数据 | 真实来源（规划） |
| --- | --- |
| 技能库分组、名称/描述/badges/switch | `skills.list()` + 文件系统根扫描；分组键 = 扫描根 / provider / 预设 |
| 组头 `rank 100/400/500/600` | 文件系统根 rank（project 100/200、custom 300、user 400/500、bundled 600） |
| 抽屉「可见于」 | 各预设 `agentPresets.acquireScope()` → `skills.snapshot({ scope })` 的并集 |
| 来源页预设行 | 预设清单 × 是否挂载 `skill-filesystem`（minimal 未挂载） |
| 诊断问题卡 | 自建扫描：断链（realpath 失败）、frontmatter/name 校验、同层 rank 覆盖、跨层覆盖（预设层 vs 全局层） |
| switch | 目录移入/移出 `<root>/.disabled/`，可撤销 |
| 新建/导入 | 写 `<root>/<name>/SKILL.md`；导入走粘贴解析或目录复制 |

### 4.4 文案

原型内文案与交互稿 §6 一致（`panel.title`、`tab.library/sources/diagnostics`、`action.*`、`banner.issues` 等）。实现时统一走 client locale：`locale/zh.json` 与 `locale/en.json` 键集必须一致、无空值。

## 5. 原型内可用的交互

- **侧栏**：点击面板行切换 active；「技能」保持当前页；点收起按钮进入 rail，点品牌 mark 展开。
- **分段 Tab**：技能库 / 来源 / 诊断可互切；横幅「查看原因」跳转诊断 tab。
- **技能行**：点击打开抽屉（按行数据回填名称、描述、路径、rank、可见预设）；`Enter` 同效。
- **抽屉**：Esc、遮罩、关闭按钮均可关闭；4 个分段（概览 / 原文 / 资源 / 诊断）可切换，原文为等宽带行号的 SKILL.md 预览。
- **新建按钮**（工具栏、空状态）：打开模态；手写 / 导入分段可切换；保存位置单选可点；名称输入实时校验（非法则红框 + 主按钮禁用）；Esc / 取消 / 遮罩关闭。
- **switch**：点击切换并弹 toast（「已停用 X」/「已启用 X」），同时切换行内状态点灰度；阻止冒泡，不会误开抽屉。
- **已停用**：折叠行可展开/收起，展开后行可用。
- **原型浮条**（`clean` 未置 1 时）：切 7 个视图、切主题。

## 6. 已知取舍

1. **空状态 / 错误态 / toast / 删除确认属于设计补充**：真实 DSH 未观察到这些形态（见 `ui-patterns.md` §10），本稿按 token 与交互稿 §5/§3.6/§3.7 自行推导。删除确认（360px / radius 14）未放进 8 张画面，只在交互稿描述。
2. **数据为真实感 mock**：技能名与描述按真实语义编写，数量、时间、rank、行数均为演示值，不对应任何真实磁盘状态。
3. **主列表只演示 5 个有效技能 + 2 个已停用**（4 个分组），因为 1440×900 单屏要完整容纳「问题横幅 + 筛选 + 4 组 + 已停用」，真实实现可滚动、全量渲染。分组顺序按 rank 升序（项目 → 用户 → 用户共享 → 插件），与交互稿 §3.1 示意图（用户在前）不同，以「来源优先」原则和来源页的 rank 语义为准。
4. **未做窄视口 / 移动端**：视口固定 1440×900；1200px 以下侧栏与内容区的重排未验证。
5. **原文 tab 只做只读预览**：编辑态（textarea + 取消/保存 + frontmatter 校验）在交互稿中有定义，原型未实现切换。
6. **「打开目录」只有视觉**：原型不触达文件系统；交互稿 §9.1 的降级（复制路径）在 05 中已按行区分（目录不存在 → 复制路径）。
7. **诊断页「本次检查覆盖」卡是合理扩展**：交互稿只要求问题列表 + 说明，为了让诊断 tab 在 900 高度下信息完整，补充了检查范围与耗时。
8. **亮色 tertiary 对比 3.99:1**：`#81858c` on `#fff` 沿用实测 token，元信息（路径、时间、说明）低于 4.5:1；正文与按钮均 ≥4.5:1。若实装可把亮色 tertiary 提到 `#6b7078`。
9. **内置 provider 显示名**：用 provider 名（dsh-office / dsh-badge / recommendations）而非包名反查，对应交互稿 §9.7 的未决项。
10. **抽屉遮罩只覆盖中央区**：保留侧栏可读上下文，与「全局面板 + 页面内覆盖层」一致；若产品要求全屏遮罩，改 `.scrim{left:0}` 即可。

## 7. 自检记录

逐张 `read_image` 检查（溢出 / 截断 / 对齐 / 对比度 / 与 DSH 风格一致性），并修正：

| 发现 | 修复 |
| --- | --- |
| 折叠态 tooltip 被侧栏 `overflow:hidden` 裁掉、位置压在侧栏内 | 侧栏改 `overflow:visible`；tooltip `left: calc(100% + 18px)` |
| 侧栏未撑满视口（底部 87px 露出 `bg-base`） | `.sidebar` 显式 `height:100vh` |
| `.skillList{display:flex}` 覆盖 `[hidden]`，「已停用」列表默认展开并把页面顶到 1068px | 增加 `.disabledList[hidden]{display:none}` |
| rail 下 `wsHeader` 固定 36px 与纵向两个操作按钮冲突，图标错位 | rail 下 `height:auto`，按钮纵向 `gap:12` |
| 模态「保存到」路径因 `direction:rtl` 显示成 `ds/skills/~` | 去掉 RTL，改用 `~/.dsh/skills` 与 `<repo>/.dsh/skills` |
| 来源页内容 895px 贴底、有被裁风险 | 行高 48→46、组间距 32→28、说明上边距 20→16 |
| 抽屉头图标 40px 偏离交互稿 | 改 32×32 / 图标 19 |
| 抽屉缺「相关诊断」 | 补一行「未发现问题」 |
| ego-browser 误归「插件内置」 | 归入「用户共享 · ~/.agents/skills · rank 500」，插件内置剩 2 个 |
| 诊断问题类型误写「跨层覆盖」 | 改为「同层覆盖（rank）」并重写原因 |
| 空状态下诊断计数仍为 2 | empty 视图同步为 1 |
| 抽屉/模态分段点击无响应 | 补齐 4 段 / 2 段内容与切换逻辑 |

**仍存在的视觉风险**：① 亮色元信息对比度 3.99（见取舍 8）；② 05 来源页仅剩约 14px 底部余量，字体替换（如非 macOS 渲染）时可能需要再压缩 4–8px；③ 06 诊断页内容天然偏短，下半屏留白较多，属于真实内容量而非布局缺陷。