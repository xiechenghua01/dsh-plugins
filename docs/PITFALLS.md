# PITFALLS.md — 踩坑记录表

格式：`[坑]` 现象 → `[原因]` 根因 → `[防护]` 当前防线（括号内是加入时间）

每次 agent 犯了新错误，在这里追加一条。防护列要写明是靠架构、lint、文档还是 checklist 防住的。

---

## UI · 字号

**[坑] Tooltip 字号不跟随宿主字号设置**
原因：Tooltip 节点挂在 `<body>` 末尾（避免被 `overflow:hidden` 裁剪），拿不到 `.mm-root` 上的 `--ds-fs` CSS 变量。
防护：每次显示前调 `syncFontSize(node)` 把当前 `--ds-fs` 值同步过去；`theme/change` 事件后也重新同步。见 `docs/plugin-ui-playbook.md` §1.3「坑 2」。（2026-11）

**[坑] font-size 写死 px，宿主改字号后插件不跟随**
原因：agent 偷懒直接写 `font-size: 14px`。
防护：`pnpm test` 检查裸 px 字号（2026-11-13 加入）；DESIGN.md §3.2 硬规则。

**[坑] `calc()` 里的 `--ds-fs` 没有 fallback，设置页内部渲染失败**
原因：设置页祖先链上没有 `--ds-fs` 定义，`var()` 返回空，`calc()` 失效。
防护：在根节点定义处加 fallback：`--ds-fs: var(--dsh-content-font-size, 14px)`。见 `docs/plugin-ui-playbook.md` §1.3「坑 3」。（2026-11）

---

## UI · 颜色与 token

**[坑] 使用 `--dsw-static-neutral-bluish-850` 作为弹窗背景，浅色主题变深底深字**
原因：`850` 是固定深色（约 `#2c2c2e`），浅色主题下对比度约 1.36:1，无法阅读。
防护：DESIGN.md §2.2 / §7.6 明确弹窗一律用 `--dsw-alias-bg-layer-2`；`--dsw-*-850` 不作主题背景。（2026-11）

**[坑] 使用 `--dsw-hovercard-bg` 作为背景兜底，主题切换后消失**
原因：该 token 在主题里未定义，取值为空。
防护：DESIGN.md §2.9 禁用清单；`docs/plugin-ui-playbook.md` §6 token 速查表标注「⚠️ 未定义，别用」。（2026-11）

**[坑] CSS 里写字面色值（`#hex` / `rgb()`），深色主题下颜色不更新**
原因：字面色值不跟随主题变量。
防护：`pnpm test` 检查字面色值（2026-11-13 加入），例外仅 `--ss-series-*` 图表系列色（DESIGN.md §2.10）。

---

## UI · 弹窗与遮罩

**[坑] 弹窗出现白色发光边框**
原因：宿主主题对每个 `[role="dialog"]` 注入默认阴影（`rgba(255,255,255,0.2) 0 0 0 0.5px, …`），优先级高于普通 CSS 类选择器。
防护：必须用行内样式覆盖：`style={{ boxShadow: 'none' }}`。DESIGN.md §2.7。（2026-11）

**[坑] 设置页内嵌弹窗用了 `bg-mask-1` 遮罩，压暗了整个设置面板**
原因：`bg-mask-1` 是独立页面的遮罩；设置页内嵌应用透明遮罩。
防护：DESIGN.md §7.6「遮罩」规则；`docs/plugin-ui-playbook.md` §3.3。（2026-11）

**[坑] 多弹窗叠加时 Escape 关闭了所有层**
原因：事件冒泡没有分层处理。
防护：维护 `dialogStack`，捕获阶段 `stopImmediatePropagation`，只关最上层。DESIGN.md §7.6 / §9.3。（2026-11）

---

## UI · 事件与交互

**[坑] 弹窗内所有按钮点击无响应**
原因：侧边栏入口用 capture 阶段监听行点击并 `stopPropagation`，导致 React 合成事件（委托在 root）收不到弹窗内的点击。
防护：弹窗内点击完全放行，不做任何 `stopPropagation`。见 `docs/plugin-ui-playbook.md` §4.3。（2026-11）

**[坑] `Object.assign` 合并 event handler 导致主动作被覆盖**
原因：后者的 `onClick` 覆盖了前者，所有按钮动作失效。
防护：追加行为用独立属性 `onClickCapture`，不合并 `onClick`。见 `docs/plugin-ui-playbook.md` §4.2。（2026-11）

**[坑] 文本域（每行一个值）输入时无法换行 / 输入内容被截断**
原因：`onChange` 里实时解析回数组并重新渲染，空行被过滤掉。
防护：独立编辑态 + `dirty` 标记，只在失焦、切换、提交时解析。DESIGN.md §9.8；`docs/plugin-ui-playbook.md` §5.2。（2026-11）

---

## 工程 · 仓库不变量

**[坑] client.js 里 `require()` 了 react 以外的包，插件加载失败**
原因：agent 忘记浏览器半边的沙盒约束。
防护：`pnpm test` 检查 `require()` 只允许 `react`（已有）；AGENTS.md 不变量列表。

**[坑] 提交了含 `/Users/xxx` 绝对路径的文件，CI 失败**
原因：agent 在调试路径时写入了本机绝对路径。
防护：`pnpm test` 检查绝对家目录路径（已有）；`check-plugins.mjs` 覆盖 `index.js`、`client.js`、`cordis.patch.yml`、`package.json`、`market.json`、`README.md`。

**[坑] locale zh/en 键集不一致，`pnpm test` 报错**
原因：agent 加了中文键但忘了加对应英文键，或反之。
防护：`pnpm test` 检查键集一致性与非空（已有）。

---

## 工程 · 配置写入

**[坑] YAML 补丁文件含 `{{SECRET_xxx}}` 导致整文件解析失败**
原因：自研 YAML 子集解析器不支持 flow 标量语法。
防护：用文本正则定位目标配置段，不解析整个文件。见 `docs/agent-iteration-playbook.md` §4「YAML 补丁层」。（2026-11）

**[坑] 写入配置时把空值和默认值也写进去，配置文件越来越冗余**
原因：agent 没有做 clean config 过滤。
防护：空字符串、空数组、空对象、等于默认值的参数一律不写入。例外：命令行参数数组里的空字符串是合法位置占位，必须保留。DESIGN.md §9.7；`docs/plugin-ui-playbook.md` §5.1。（2026-11）

---

## 流程 · 迭代效率

**[坑] 验收 agent 把 YAML 解析器极端边界也纳入同一轮验收，主线延误 1 小时**
原因：验收范围没有提前定死，验收方自行扩展问题域。
防护：派任务时明确写「不扩展到 X」；UI 层与数据层分开验收；见 `docs/agent-iteration-playbook.md` §2.1。（2026-11）

**[坑] 模型网关 502 时，默认重试策略导致单次失败拖 10 分钟**
原因：默认 5 次重试 × 5 分钟空闲超时。
防护：`~/.codex/config.toml` 设置 `stream_idle_timeout_ms = 90000`、`stream_max_retries = 2`。见 `docs/agent-iteration-playbook.md` §5。（2026-11）
