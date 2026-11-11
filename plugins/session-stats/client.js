window.__ModuleLoader__.load({
  id: '@chengze/dsh-session-stats',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect
    const useMemo = React.useMemo
    const useCallback = React.useCallback
    const useRef = React.useRef

    /** Plugin identity, reused by the overlay scope container and the style element. */
    const PLUGIN_ID = '@chengze/dsh-session-stats'
    /** Locale namespace shared by the dictionaries, the page and the sidebar entry. */
    const NS = 'session-stats'
    /** Main panel key; the sidebar entry id must equal it so the entry addresses this page. */
    const PANEL_ID = 'session-stats'
    /** Timeline window requested from the Host; matches the Host config default. */
    const DAYS = 30
    const OVERVIEW_POLL_MS = 10000
    const SYSTEM_POLL_MS = 2000
    const TABLE_LIMIT = 50
    /** Collapsed session table rows; the expanded table is a fixed ten-row window. */
    const SESSIONS_COLLAPSED_ROWS = 5
    const SESSIONS_WINDOW_ROWS = 10
    const DEFAULT_LOCALE = 'zh-CN'
    const DASH = '\u2014'

    /* ------------------------------------------------------------------ *
     * Locale dictionaries: flat key -> string, identical key sets.       *
     * Placeholders are interpolated as {name} by the locale service.     *
     * ------------------------------------------------------------------ */

    const zh = {
      'panel.title': '会话统计',
      'action.refresh': '刷新',
      'state.loading': '正在加载统计数据…',
      'state.error': '统计数据加载失败',
      'state.retry': '重试',
      'state.unauthorized': '当前页面未获授权，无法读取统计数据',
      'state.empty': '还没有可用于统计的会话',
      'updated.at': '更新于 {time}',
      'summary.tokens': '总 Token',
      'summary.tokensHint': '输入 {input} · 输出 {output} · 缓存读取 {cache}',
      'summary.tokensSpark': '每日 Token 用量',
      'summary.costSpark': '每日成本',
      'summary.sessions': '会话数',
      'summary.sessionsHint': '进行中 {live} · 轮次 {turns}',
      'summary.cost': '估算成本',
      'summary.costHint': '共 {requests} 次请求',
      'summary.budget': '预算',
      'summary.budgetHint': '周期 {period}',
      'summary.budgetUsedRemaining': '已用 {used} · 剩余 {remaining}',
      'summary.budgetDynamic': '按近 7 天日均 {average} 预估',
      'summary.noBudget': '未设置预算',
      'chart.title': '每日 Token 趋势',
      'chart.window': '近 {days} 天',
      'chart.modeModel': '按模型',
      'chart.modeType': '按类型',
      'chart.total': '总计',
      'chart.other': '其他模型',
      'chart.legend': '图例',
      'chart.empty': '该区间内没有 token 消耗',
      'chart.allHidden': '所有曲线已隐藏，点击图例恢复',
      'chart.input': '输入',
      'chart.output': '输出',
      'chart.cacheRead': '缓存读取',
      'sessions.title': '会话用量',
      'sessions.empty': '暂无会话记录',
      'sessions.showing': '显示 {shown} / {total} 个会话',
      'sessions.more': '查看更多',
      'sessions.archived': '已归档',
      'table.session': '会话',
      'table.created': '创建时间',
      'table.requests': '请求数',
      'table.tokens': 'Token',
      'table.split': '输入 / 输出 / 缓存',
      'table.cost': '成本',
      'table.logSize': '日志大小',
      'table.sortCost': '按成本',
      'table.sortTokens': '按 Token',
      'table.sortSize': '按大小',
      'table.untitled': '未命名会话',
      'models.title': '模型用量',
      'models.empty': '该区间内暂无模型调用记录',
      'models.share': '占比',
      'models.window': '近 {days} 天，按 Token 用量排序',
      'models.shareTokens': 'Token 占比',
      'models.sparkline': '{name} 的每日 Token 走势',
      'runtime.title': '运行状态',
      'runtime.process': '进程 CPU',
      'runtime.system': '系统 CPU',
      'runtime.cores': '核心数',
      'runtime.load': '负载（1/5/15 分钟）',
      'runtime.rss': '常驻内存',
      'runtime.heap': '堆内存',
      'runtime.uptime': '运行时长',
      'runtime.sparkline': 'CPU 走势',
      'runtime.peak': '峰值 {value}',
      'runtime.unavailable': '运行状态暂不可用',
      'runtime.noHistory': '暂无 CPU 历史数据',
      'logs.title': '日志占用',
      'logs.total': '合计',
      'logs.sessionLog': '会话日志',
      'logs.sessions': '日志数量',
      'logs.largest': '最大会话日志',
      'logs.storage': '存储',
      'logs.attachments': '附件',
      'logs.spill': '溢出文件',
      'logs.available': '可用',
      'logs.unavailable': '日志目录暂不可读',
      'unit.tokens': 'tokens',
      'unit.ms': '毫秒',
      'unit.seconds': '秒',
    }

    const en = {
      'panel.title': 'Session Stats',
      'action.refresh': 'Refresh',
      'state.loading': 'Loading statistics…',
      'state.error': 'Statistics could not be loaded',
      'state.retry': 'Retry',
      'state.unauthorized': 'This page is not authorized to read statistics',
      'state.empty': 'No sessions to summarize yet',
      'updated.at': 'Updated {time}',
      'summary.tokens': 'Total tokens',
      'summary.tokensHint': 'Input {input} · Output {output} · Cache read {cache}',
      'summary.tokensSpark': 'Daily token usage',
      'summary.costSpark': 'Daily cost',
      'summary.sessions': 'Sessions',
      'summary.sessionsHint': 'Live {live} · Turns {turns}',
      'summary.cost': 'Estimated cost',
      'summary.costHint': '{requests} requests',
      'summary.budget': 'Budget',
      'summary.budgetHint': 'Period {period}',
      'summary.budgetUsedRemaining': 'Used {used} · {remaining} left',
      'summary.budgetDynamic': 'Estimated from the last 7 days ({average}/day)',
      'summary.noBudget': 'No budget set',
      'chart.title': 'Daily token trend',
      'chart.window': 'Last {days} days',
      'chart.modeModel': 'By model',
      'chart.modeType': 'By type',
      'chart.total': 'Total',
      'chart.other': 'Other models',
      'chart.legend': 'Legend',
      'chart.empty': 'No tokens used in this window',
      'chart.allHidden': 'All lines are hidden; click a legend item to show one',
      'chart.input': 'Input',
      'chart.output': 'Output',
      'chart.cacheRead': 'Cache read',
      'sessions.title': 'Session usage',
      'sessions.empty': 'No sessions recorded',
      'sessions.showing': 'Showing {shown} of {total} sessions',
      'sessions.more': 'Show more',
      'sessions.archived': 'Archived',
      'table.session': 'Session',
      'table.created': 'Created',
      'table.requests': 'Requests',
      'table.tokens': 'Tokens',
      'table.split': 'Input / output / cache',
      'table.cost': 'Cost',
      'table.logSize': 'Log size',
      'table.sortCost': 'Cost',
      'table.sortTokens': 'Tokens',
      'table.sortSize': 'Size',
      'table.untitled': 'Untitled session',
      'models.title': 'Model usage',
      'models.empty': 'No model calls in this window',
      'models.share': 'Share',
      'models.window': 'Last {days} days, ranked by tokens',
      'models.shareTokens': 'Token share',
      'models.sparkline': 'Daily token trend for {name}',
      'runtime.title': 'Runtime',
      'runtime.process': 'Process CPU',
      'runtime.system': 'System CPU',
      'runtime.cores': 'Cores',
      'runtime.load': 'Load (1/5/15 min)',
      'runtime.rss': 'Resident memory',
      'runtime.heap': 'Heap',
      'runtime.uptime': 'Uptime',
      'runtime.sparkline': 'CPU history',
      'runtime.peak': 'Peak {value}',
      'runtime.unavailable': 'Runtime status unavailable',
      'runtime.noHistory': 'No CPU history yet',
      'logs.title': 'Log footprint',
      'logs.total': 'Total',
      'logs.sessionLog': 'Session logs',
      'logs.sessions': 'Log count',
      'logs.largest': 'Largest session logs',
      'logs.storage': 'Storage',
      'logs.attachments': 'Attachments',
      'logs.spill': 'Spill',
      'logs.available': 'Available',
      'logs.unavailable': 'Log directory is not readable',
      'unit.tokens': 'tokens',
      'unit.ms': 'ms',
      'unit.seconds': 's',
    }

    /* ------------------------------------------------------------------ *
     * Styles: one style element, only --dsw-* theme tokens.               *
     * ------------------------------------------------------------------ */

    const CSS = `
.ss-page,.ss-page *{box-sizing:border-box}
.ss-page{--ds-fs:var(--dsh-content-font-size,14px);--ss-series-1:#4d93f8;--ss-series-2:#22c55e;--ss-series-3:#8b5cf6;--ss-series-4:#f59e0b;--ss-series-5:#ef4444;--ss-series-6:#06b6d4;--ss-series-7:#ec4899;--ss-series-8:#9aa0a6;--ss-session-row:calc(var(--ds-fs) * 2.9 + 16px);--ss-table-head:calc(var(--ds-fs) * 1.5 + 12px);width:100%;min-width:0;height:100%;min-height:0;display:flex;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit);font-size:var(--ds-fs);line-height:1.5}
/* The eight --ss-series-* colors are data-visualization series colors, not theme
   surface colors: charts need several distinguishable hues in both color schemes. */
.ss-page [data-series="1"]{--ss-series:var(--ss-series-1)}
.ss-page [data-series="2"]{--ss-series:var(--ss-series-2)}
.ss-page [data-series="3"]{--ss-series:var(--ss-series-3)}
.ss-page [data-series="4"]{--ss-series:var(--ss-series-4)}
.ss-page [data-series="5"]{--ss-series:var(--ss-series-5)}
.ss-page [data-series="6"]{--ss-series:var(--ss-series-6)}
.ss-page [data-series="7"]{--ss-series:var(--ss-series-7)}
.ss-page [data-series="8"]{--ss-series:var(--ss-series-8)}
/* Buttons (§7.1): SsButton. Hover changes only the interactive background. */
.ss-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;white-space:nowrap;font-family:inherit;font-weight:500;border:.5px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;transition:background 120ms,color 120ms}
.ss-btn[data-size="lg"]{height:36px;padding:0 14px;border-radius:var(--dsw-radius-md);font-size:var(--ds-fs);line-height:22px}
.ss-btn[data-size="md"]{height:32px;padding:0 12px;border-radius:var(--dsw-radius-md);font-size:calc(var(--ds-fs) - 1px);line-height:20px}
.ss-btn[data-size="sm"]{height:28px;padding:0 10px;border-radius:var(--dsw-radius-sm);font-size:calc(var(--ds-fs) - 2px);line-height:18px}
.ss-btn[data-variant="primary"]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
.ss-btn[data-variant="primary"]:hover{background:var(--dsw-alias-button-primary-hover)}
.ss-btn[data-variant="secondary"]{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l2)}
.ss-btn[data-variant="ghost"]{background:transparent;color:var(--dsw-alias-label-secondary)}
.ss-btn[data-variant="danger"]{background:transparent;color:var(--dsw-alias-state-error-primary)}
.ss-btn[data-variant="secondary"]:hover,.ss-btn[data-variant="ghost"]:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-btn[data-variant="danger"]:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}
.ss-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.ss-btn:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-btn[data-variant="primary"]:focus-visible{background:var(--dsw-alias-button-primary-hover)}
.ss-btn[data-variant="danger"]:focus-visible{background:var(--dsw-alias-interactive-bg-hover-danger)}
.ss-btn:disabled{opacity:.4;cursor:not-allowed}
/* Icon buttons (§7.2): SsIconButton. */
.ss-icon-btn{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background 120ms,color 120ms}
.ss-icon-btn[data-size="md"]{width:32px;height:32px}
.ss-icon-btn[data-size="sm"]{width:28px;height:28px}
.ss-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-icon-btn[data-variant="danger"]:hover{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.ss-icon-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.ss-icon-btn:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-icon-btn:disabled{opacity:.4;cursor:not-allowed}
/* Segmented tabs (§7.3): primary segments and secondary capsules. */
.ss-segmented{display:inline-flex;align-items:center;gap:2px;padding:0;background:transparent}
.ss-segmented[data-level="primary"]{gap:0;padding:4px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform)}
.ss-segment{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:0;border-radius:14px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:calc(var(--ds-fs) - 2px);font-weight:500;line-height:18px;white-space:nowrap;cursor:pointer;transition:background 120ms,color 120ms}
.ss-segmented[data-level="primary"] .ss-segment{height:34px;padding:0 16px;border-radius:var(--dsw-radius-md);font-size:var(--ds-fs)}
.ss-segment:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-segment:active{background:var(--dsw-alias-interactive-bg-active)}
.ss-segment:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-segment-active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-segmented[data-level="primary"] .ss-segment-active{background:var(--dsw-alias-bg-layer-3);border:.5px solid var(--dsw-alias-border-l3);font-weight:600}
/* Badge (§7.9): SsBadge. */
.ss-badge{display:inline-flex;align-items:center;flex:none;height:20px;padding:0 6px;border-radius:var(--dsw-radius-xs);font-size:calc(var(--ds-fs) - 2px);font-weight:500;line-height:20px;white-space:nowrap;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}
.ss-badge[data-tone="warn"]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent)}
.ss-badge[data-tone="success"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.ss-badge[data-tone="error"]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
/* Empty state (§7.10): SsEmptyState. */
.ss-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px 0;text-align:center;color:var(--dsw-alias-label-tertiary)}
.ss-empty-state[data-roomy="true"]{padding:48px 20px}
.ss-empty-state[data-tone="error"]{color:var(--dsw-alias-state-error-primary)}
.ss-empty-state .ss-empty{margin:0;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 1px);line-height:1.5}
.ss-empty-state[data-tone="error"] .ss-empty{color:var(--dsw-alias-label-primary)}
/* Error bar (§7.10): SsErrorBar. */
.ss-errorbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-label-primary);font-size:calc(var(--ds-fs) - 1px)}
.ss-errorbar .ss-icon{flex:none;color:var(--dsw-alias-state-error-primary)}
.ss-errorbar-text{flex:1;min-width:0}
/* Tooltip (§7.7): SsTooltip singleton, scoped by its data-plugin container. */
.ss-tooltip-layer[data-plugin="@chengze/dsh-session-stats"]{--ds-fs:var(--dsh-content-font-size,14px);position:fixed;inset:0;z-index:2000;pointer-events:none;overflow:hidden}
.ss-tooltip-layer[data-plugin="@chengze/dsh-session-stats"] .ss-tooltip{position:absolute;max-width:min(40vw,290px);padding:4px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:calc(var(--ds-fs) - 2px);line-height:1.5;box-shadow:none;opacity:0;visibility:hidden;overflow-wrap:anywhere;transition:none}
.ss-tooltip-layer[data-plugin="@chengze/dsh-session-stats"] .ss-tooltip[data-visible="true"]{opacity:1;visibility:visible;transition:opacity 120ms}
.ss-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.ss-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l1) transparent}
.ss-scroll::-webkit-scrollbar,.ss-table-scroll::-webkit-scrollbar,.ss-table-window::-webkit-scrollbar{width:8px;height:8px}
.ss-scroll::-webkit-scrollbar-thumb,.ss-table-scroll::-webkit-scrollbar-thumb,.ss-table-window::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l1);border-radius:var(--dsw-radius-xs)}
.ss-scroll::-webkit-scrollbar-track,.ss-table-scroll::-webkit-scrollbar-track,.ss-table-window::-webkit-scrollbar-track{background:transparent}
/* §4.3: the content column itself is 960px; the side gutters sit outside it. */
.ss-content{max-width:calc(960px + 2 * clamp(20px,4vw,48px));margin:0 auto;padding:0 clamp(20px,4vw,48px) 48px}
.ss-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-top:calc(28px + var(--dsh-frame-top-clearance,0px));margin-bottom:24px}
.ss-heading-text{min-width:0}
.ss-title{margin:0;font-size:calc(var(--ds-fs) + 6px);font-weight:500;line-height:1.35}
.ss-heading-actions{display:flex;align-items:center;gap:12px;flex:none}
.ss-updated{color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 2px);white-space:nowrap}
.ss-sections{display:flex;flex-direction:column;gap:20px}
.ss-card{margin:0;padding:16px 18px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);min-width:0}
.ss-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.ss-card-title{margin:0;font-size:calc(var(--ds-fs) + 2px);font-weight:500;line-height:1.35;color:var(--dsw-alias-label-primary)}
.ss-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.ss-summary{display:flex;flex-direction:column;gap:6px;padding:16px 18px}
.ss-summary-label{margin:0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px);font-weight:400;line-height:1.5}
.ss-summary-value{margin:0;font-size:calc(var(--ds-fs) + 6px);font-weight:500;line-height:1.35;font-variant-numeric:tabular-nums;white-space:nowrap}
.ss-summary-unit{color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px);font-weight:400;margin-left:6px}
.ss-summary-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px);line-height:1.5;overflow-wrap:anywhere}
.ss-progress{height:6px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin:4px 0}
.ss-progress-fill{height:100%;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-brand-primary);transition:width 120ms}
.ss-tone-warn{background:var(--dsw-alias-state-warn-primary)}
.ss-tone-danger{background:var(--dsw-alias-state-error-primary)}
.ss-card-head-main{min-width:0}
.ss-card-sub{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px);line-height:1.5}
.ss-legend{display:flex;flex-wrap:wrap;gap:4px 6px;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 2px);margin:0 0 12px}
.ss-legend-item{display:inline-flex;align-items:center;gap:6px}
.ss-swatch{display:inline-block;width:8px;height:8px;border-radius:var(--dsw-radius-xs);flex:none}
.ss-legend-button{max-width:240px;justify-content:flex-start;color:var(--dsw-alias-label-secondary)}
.ss-legend-inner{display:inline-flex;align-items:center;gap:6px;min-width:0}
/* A hidden series is still interactive, so its state is a text tier, not opacity (§8.5). */
.ss-legend-off .ss-legend-text{color:var(--dsw-alias-label-tertiary)}
.ss-legend-dot{display:inline-block;width:8px;height:8px;border-radius:var(--dsw-radius-xs);flex:none;background:var(--ss-series)}
.ss-legend-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ss-trend{display:flex;flex-direction:column;gap:6px}
.ss-trend-body{display:flex;gap:12px;align-items:stretch}
.ss-yaxis{position:relative;flex:none;width:48px;height:200px;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);line-height:1.5;font-variant-numeric:tabular-nums}
.ss-yaxis-label{position:absolute;right:0;white-space:nowrap}
.ss-plot-wrap{position:relative;flex:1;min-width:0;height:200px}
.ss-plot{display:block;width:100%;height:100%;overflow:visible}
.ss-grid-line{stroke:var(--dsw-alias-border-l4);stroke-width:1}
.ss-grid-base{stroke:var(--dsw-alias-border-l3)}
.ss-series-line{fill:none;stroke:var(--ss-series);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ss-hits{position:absolute;inset:0;pointer-events:none}
/* Chart hit region: an invisible SsButton stretched over one day's column. */
.ss-btn.ss-hit{position:absolute;top:0;bottom:0;display:block;height:auto;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;appearance:none;pointer-events:auto;cursor:crosshair}
.ss-btn.ss-hit:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px;border-radius:var(--dsw-radius-xs);background:transparent;color:inherit}
.ss-hit:focus-visible .ss-guide,.ss-hit:focus-visible .ss-dot,.ss-hit:focus-visible .ss-tip{opacity:1;visibility:visible}
.ss-guide{position:absolute;top:0;bottom:0;width:0;border-left:.5px dashed var(--dsw-alias-border-l2);opacity:0;transition:opacity 120ms;pointer-events:none}
.ss-dot{position:absolute;width:8px;height:8px;border-radius:var(--dsw-radius-xs);transform:translate(-50%,-50%);border:.5px solid var(--dsw-alias-bg-layer-1);background:var(--ss-series);opacity:0;transition:opacity 120ms;pointer-events:none}
.ss-hit:hover .ss-guide,.ss-hit:hover .ss-dot,.ss-hit:hover .ss-tip{opacity:1;visibility:visible}
/* Chart tooltip: the §7.7 dark surface, so every inner text tier derives from the white token. */
.ss-tip{position:absolute;top:6px;min-width:170px;max-width:min(40vw,290px);margin-left:12px;padding:4px 8px;border-radius:var(--dsw-radius-sm);border:0;background:var(--dsw-alias-tooltip-bg);box-shadow:none;color:var(--dsw-static-neutral-bluish-00);font-size:calc(var(--ds-fs) - 2px);line-height:1.5;opacity:0;visibility:hidden;transition:opacity 120ms;pointer-events:none;z-index:5}
.ss-tip-right{margin-left:0;margin-right:12px}
.ss-tip-date{margin:0 0 4px;color:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 70%,transparent);font-size:calc(var(--ds-fs) - 3px)}
.ss-tip-total{display:flex;justify-content:space-between;gap:12px;margin:0 0 6px;font-size:calc(var(--ds-fs) - 2px)}
.ss-tip-total strong,.ss-tip-value{font-variant-numeric:tabular-nums}
.ss-tip-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.ss-tip-list li{display:flex;align-items:center;gap:6px;min-width:0}
.ss-tip-dot{display:inline-block;width:8px;height:8px;border-radius:var(--dsw-radius-xs);flex:none;background:var(--ss-series)}
.ss-tip-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 80%,transparent)}
.ss-tip-value{white-space:nowrap}
.ss-tip-foot{margin:6px 0 0;padding-top:6px;border-top:.5px solid color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 20%,transparent);color:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 70%,transparent);font-size:calc(var(--ds-fs) - 3px)}
.ss-xaxis{position:relative;height:18px;margin-left:calc(48px + 12px);color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);line-height:18px}
.ss-xlabel{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.ss-xlabel-first{transform:translateX(0)}
.ss-xlabel-last{transform:translateX(-100%)}
.ss-mini-trend{display:block;width:100%;height:28px;margin-top:auto}
.ss-mini-area{fill:var(--ss-series);fill-opacity:.14;stroke:none}
.ss-mini-line{fill:none;stroke:var(--ss-series);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.ss-num-main{display:block}
.ss-row-bar{display:block;height:4px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);margin-top:4px;overflow:hidden}
.ss-row-bar-fill{display:block;height:100%;border-radius:var(--dsw-radius-xs);background:var(--ss-series-1)}
.ss-log-bar{display:block;height:4px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);margin-top:4px;overflow:hidden}
.ss-log-bar-fill{display:block;height:100%;border-radius:var(--dsw-radius-xs);background:var(--ss-series)}
.ss-table-scroll{overflow-x:auto;margin:0 -6px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l1) transparent}
/* Expanded session table: a fixed ten-row window (SESSIONS_WINDOW_ROWS in the
   component), with a sticky header and its own vertical scrollbar.
   Row/head heights derive from --ds-fs so ten rows survive host type scaling
   (14/16/20px → 56.6/62.4/74 and 33/36/42). Box model: the session cell stacks
   a 1.5×fs title line plus a 1.5×(fs−3)+2px id line (~3×fs−2.5), and the window
   cell adds 6+6px padding + .5px border, so the 2.9×fs+16px row stays just above
   content height; thead th is 1.5×(fs−2)+6+6+.5 (~1.5×fs+9.5), rounded up to
   1.5×fs+12. max-height is exactly 10 rows + the header, so the sticky header
   plus ten rows fill the window with no clipping or overlap. */
.ss-table-window{max-height:calc(var(--ss-session-row,56px) * 10 + var(--ss-table-head,33px));overflow-y:auto;scrollbar-gutter:stable;overscroll-behavior:contain}
.ss-table-window thead th{position:sticky;top:0;z-index:1;background:var(--dsw-alias-bg-layer-1)}
.ss-table-window tbody tr{height:var(--ss-session-row,56px)}
.ss-table-window tbody td{height:var(--ss-session-row,56px);padding-top:6px;padding-bottom:6px;vertical-align:middle}
.ss-table-window .ss-session-title{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.ss-table{width:100%;border-collapse:collapse;font-size:var(--ds-fs);line-height:1.5}
.ss-table th{color:var(--dsw-alias-label-tertiary);font-weight:400;text-align:left;padding:6px;border-bottom:.5px solid var(--dsw-alias-border-l3);white-space:nowrap;font-size:calc(var(--ds-fs) - 2px)}
.ss-table td{padding:8px 6px;border-bottom:.5px solid var(--dsw-alias-border-l4);vertical-align:top}
.ss-table tbody tr:last-child td{border-bottom:0}
.ss-table tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ss-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ss-session-head{display:flex;align-items:flex-start;gap:6px;min-width:0}
.ss-session-title{display:block;flex:1 1 auto;min-width:0;color:var(--dsw-alias-label-primary);font-weight:500;overflow-wrap:anywhere}
.ss-session-id{display:block;color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);line-height:1.5;margin-top:2px;overflow-wrap:anywhere}
/* Archived marker: a quiet warm badge at the title's top-right. */
.ss-archived-badge{margin-top:2px}
.ss-split{color:var(--dsw-alias-label-secondary);white-space:normal}
.ss-sort-arrow{font-size:calc(var(--ds-fs) - 2px);line-height:1}
.ss-table-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:8px}
.ss-table-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px)}
.ss-more-arrow{font-size:calc(var(--ds-fs) - 2px);line-height:1}
.ss-model-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.ss-model{display:grid;grid-template-columns:auto minmax(0,1fr) 96px;gap:12px;align-items:start;min-width:0}
.ss-model-mark{width:8px;height:8px;border-radius:var(--dsw-radius-xs);margin-top:8px;background:var(--ss-series)}
.ss-model-main{display:flex;flex-direction:column;gap:6px;min-width:0}
.ss-model-spark{display:block;width:96px;height:28px;margin-top:4px;overflow:visible}
.ss-model-spark-line{fill:none;stroke:var(--ss-series);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.ss-model-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.ss-model-name{font-size:var(--ds-fs);overflow-wrap:anywhere}
.ss-model-share{color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 2px);white-space:nowrap;font-variant-numeric:tabular-nums}
.ss-model-meta{display:flex;flex-wrap:wrap;gap:4px 12px;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px)}
.ss-share-bar{height:6px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.ss-share-fill{height:100%;border-radius:var(--dsw-radius-xs);background:var(--ss-series)}
.ss-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px 20px;margin:0}
.ss-stat{min-width:0;margin:0}
.ss-stat-label{margin:0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px);line-height:1.5}
.ss-stat-value{margin:0;font-size:var(--ds-fs);font-weight:500;line-height:1.5;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ss-stat-note{display:block;color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);font-weight:400;line-height:1.5}
.ss-subhead{margin:16px 0 6px;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 2px);font-weight:400}
.ss-spark-plot{display:block;width:100%;height:56px;background:var(--dsw-alias-bg-base);border-radius:var(--dsw-radius-sm);padding:2px}
/* CPU history is a chart series, so it uses series colors, not status colors (§2.6/§2.10). */
.ss-spark-process{fill:none;stroke:var(--ss-series-1);stroke-width:1.5}
.ss-spark-system{fill:none;stroke:var(--ss-series-3);stroke-width:1.5}
.ss-spark-legend{display:flex;gap:16px;align-items:center;margin-top:6px;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px)}
.ss-spark-peak{margin-left:auto;white-space:nowrap}
.ss-spark-swatch-process{background:var(--ss-series-1)}
.ss-spark-swatch-system{background:var(--ss-series-3)}
.ss-logs{display:flex;flex-direction:column;gap:12px}
.ss-log-entry{border-bottom:.5px solid var(--dsw-alias-border-l4);padding-bottom:8px}
.ss-log-entry:last-child{border-bottom:0;padding-bottom:0}
.ss-log-row{display:flex;justify-content:space-between;gap:16px;align-items:baseline}
.ss-log-label{color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 2px);flex:none}
.ss-log-value{font-variant-numeric:tabular-nums;font-size:var(--ds-fs);text-align:right;min-width:0;overflow-wrap:anywhere}
.ss-log-meta{color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);display:block}
.ss-log-block{display:flex;flex-direction:column;gap:4px}
.ss-log-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.ss-log-list li{display:flex;justify-content:space-between;gap:12px;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 2px)}
.ss-log-name{overflow-wrap:anywhere}
.ss-log-bytes{white-space:nowrap;font-variant-numeric:tabular-nums}
.ss-log-home{margin:0 0 12px;color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);overflow-wrap:anywhere}
.ss-state-wrap{display:flex;flex-direction:column;gap:16px}
.ss-skeleton-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
/* §7.10: the first-load skeleton mirrors the tallest summary card
   (label / value / hint / progress / hint), so its height follows the host
   font size and the swap to real cards does not jump. */
.ss-skeleton{display:flex;flex-direction:column;gap:6px;animation:ss-pulse 1.4s ease-in-out infinite}
.ss-skeleton-row{display:block;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2)}
.ss-skeleton-label{width:40%;height:1.5em;font-size:calc(var(--ds-fs) - 2px)}
.ss-skeleton-value{width:64%;height:1.35em;font-size:calc(var(--ds-fs) + 6px)}
.ss-skeleton-hint{width:85%;height:1.5em;font-size:calc(var(--ds-fs) - 2px)}
.ss-skeleton-bar{width:100%;height:6px;margin:4px 0}
.ss-skeleton-line{height:56px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1)}
@keyframes ss-pulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes ss-spin{to{transform:rotate(360deg)}}
.ss-spin{animation:ss-spin .9s linear infinite}
.ss-icon{display:block}
.ss-icon-accent{fill:var(--dsw-alias-brand-primary);stroke:var(--dsw-alias-brand-primary)}
/* Sidebar foot entry (§4.1/§7.1): a host row keeps its 36px height; the lg
   button's own type and line-height come from .ss-btn[data-size="lg"]. */
.ss-footer-entry{--ds-fs:var(--dsh-content-font-size,14px)}
.ss-btn.ss-footer-entry{width:100%;height:36px;padding:0 10px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);justify-content:flex-start}
.ss-btn.ss-footer-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
/* The host cell is 36px tall; the icon button keeps the §7.2 32×32 hit area and
   centers inside the row instead of stretching to 36×36. */
.ss-icon-btn.ss-footer-entry{width:32px;height:32px;align-self:center;color:var(--dsw-alias-label-secondary)}
.ss-icon-btn.ss-footer-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
/* Selected shares the hover fill (§2.5), only the label color is promoted; the
   more specific .ss-btn/.ss-icon-btn :hover rules above still win on hover. */
.ss-footer-entry[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-footer-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:960px){.ss-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ss-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:720px){.ss-table th:nth-child(5),.ss-table td:nth-child(5){display:none}.ss-heading{align-items:flex-start;flex-wrap:wrap}.ss-heading-actions{flex-wrap:wrap}.ss-summary-grid{grid-template-columns:1fr}.ss-stats{grid-template-columns:1fr}.ss-model{grid-template-columns:auto minmax(0,1fr)}.ss-model-spark{display:none}.ss-yaxis{width:32px}.ss-xaxis{margin-left:calc(32px + 12px)}.ss-plot-wrap,.ss-yaxis{height:170px}}
@media (max-width:520px){.ss-session-id{display:none}.ss-log-home{display:none}.ss-updated{display:none}.ss-heading-actions{gap:8px}}
@media (prefers-reduced-motion:reduce){.ss-guide,.ss-dot,.ss-tip,.ss-btn,.ss-icon-btn,.ss-segment,.ss-footer-entry,.ss-progress-fill,.ss-skeleton,.ss-spin,.ss-tooltip-layer[data-plugin="@chengze/dsh-session-stats"] .ss-tooltip{transition:none;animation:none}}
`

    /* ------------------------------------------------------------------ *
     * Small pure helpers (defensive reads: every payload field may be absent). *
     * ------------------------------------------------------------------ */

    function toNumber(value) {
      return typeof value === 'number' && Number.isFinite(value) ? value : 0
    }

    function toNullableNumber(value) {
      return typeof value === 'number' && Number.isFinite(value) ? value : null
    }

    function toObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
    }

    function toArray(value) {
      return Array.isArray(value) ? value : []
    }

    function toText(value) {
      return typeof value === 'string' && value.length > 0 ? value : ''
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value))
    }

    function clamp01(value) {
      return clamp(value, 0, 1)
    }

    function totalTokens(tokens) {
      const bag = toObject(tokens)
      const declared = toNumber(bag.total)
      if (declared > 0) return declared
      return toNumber(bag.input) + toNumber(bag.output) + toNumber(bag.cacheRead) + toNumber(bag.cacheWrite)
    }

    function shortSessionId(id) {
      if (id.length <= 18) return id
      return id.slice(0, 8) + '\u2026' + id.slice(-6)
    }

    function safeLocaleTag(value) {
      return typeof value === 'string' && value.length > 0 ? value : DEFAULT_LOCALE
    }

    function safeNumberFormat(locale, options) {
      try {
        return new Intl.NumberFormat(locale, options)
      } catch (error) {
        try {
          return new Intl.NumberFormat(DEFAULT_LOCALE, options)
        } catch (fallbackError) {
          return new Intl.NumberFormat('en', options)
        }
      }
    }

    function safeDateFormat(locale, options) {
      try {
        return new Intl.DateTimeFormat(locale, options)
      } catch (error) {
        try {
          return new Intl.DateTimeFormat(DEFAULT_LOCALE, options)
        } catch (fallbackError) {
          return new Intl.DateTimeFormat('en', options)
        }
      }
    }

    function formatDateValue(format, value) {
      const ms = toNumber(value)
      if (ms <= 0) return ''
      try {
        return format.format(new Date(ms))
      } catch (error) {
        return ''
      }
    }

    function formatBytes(value, integer, decimal) {
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      let size = Math.max(0, toNumber(value))
      let unit = 0
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit += 1
      }
      if (unit === 0) return integer.format(Math.round(size)) + ' B'
      return (size >= 100 ? integer : decimal).format(size) + ' ' + units[unit]
    }

    function formatUptime(locale, seconds) {
      const total = Math.max(0, Math.floor(toNumber(seconds)))
      const days = Math.floor(total / 86400)
      const hours = Math.floor((total % 86400) / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const unitFormat = (unit) => {
        try {
          return new Intl.NumberFormat(locale, { style: 'unit', unit: unit, unitDisplay: 'narrow', maximumFractionDigits: 0 })
        } catch (error) {
          return null
        }
      }
      const dayFormat = unitFormat('day')
      const hourFormat = unitFormat('hour')
      const minuteFormat = unitFormat('minute')
      const parts = []
      if (dayFormat !== null && days > 0) parts.push(dayFormat.format(days))
      if (hourFormat !== null && (days > 0 || hours > 0)) parts.push(hourFormat.format(hours))
      if (minuteFormat !== null && (days > 0 || hours > 0 || minutes > 0)) parts.push(minuteFormat.format(minutes))
      if (parts.length === 0) return ''
      return parts.join(' ')
    }

    function makeMoneyFormat(locale, currency, maxDigits) {
      const digits = typeof maxDigits === 'number' && Number.isFinite(maxDigits) ? maxDigits : 4
      try {
        return {
          format: new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: digits,
          }),
          suffix: '',
        }
      } catch (error) {
        return {
          format: safeNumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits }),
          suffix: ' ' + currency,
        }
      }
    }

    /** Build every number/date formatter once per (locale, currency) pair. */
    function createFormatters(localeInput, currencyInput) {
      const locale = safeLocaleTag(localeInput)
      const currency = toText(currencyInput) === '' ? 'USD' : currencyInput
      const integer = safeNumberFormat(locale, { maximumFractionDigits: 0 })
      const decimal = safeNumberFormat(locale, { maximumFractionDigits: 2 })
      const compact = safeNumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
      const ratioFormat = safeNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
      const percentFormat = safeNumberFormat(locale, {
        style: 'unit',
        unit: 'percent',
        unitDisplay: 'narrow',
        maximumFractionDigits: 1,
      })
      const dateFormat = safeDateFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
      const timeFormat = safeDateFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const dayFormat = safeDateFormat(locale, { month: 'short', day: 'numeric' })
      const moneyFormat = makeMoneyFormat(locale, currency)
      const moneyShortFormat = makeMoneyFormat(locale, currency, 2)
      return {
        locale: locale,
        currency: currency,
        integer(value) {
          return integer.format(toNumber(value))
        },
        decimal(value) {
          return decimal.format(toNumber(value))
        },
        compact(value) {
          return compact.format(toNumber(value))
        },
        ratio(value) {
          return ratioFormat.format(clamp01(toNumber(value)))
        },
        percent(value) {
          return percentFormat.format(clamp(toNumber(value), 0, 100))
        },
        date(value) {
          return formatDateValue(dateFormat, value)
        },
        time(value) {
          return formatDateValue(timeFormat, value)
        },
        day(value) {
          return formatDateValue(dayFormat, value)
        },
        money(value) {
          return moneyFormat.format.format(toNumber(value)) + moneyFormat.suffix
        },
        moneyShort(value) {
          return moneyShortFormat.format.format(toNumber(value)) + moneyShortFormat.suffix
        },
        bytes(value) {
          return formatBytes(value, integer, decimal)
        },
        uptime(value) {
          return formatUptime(locale, value)
        },
      }
    }

    function useFormatters(locale, currency) {
      return useMemo(() => createFormatters(locale, currency), [locale, currency])
    }

    /* ------------------------------------------------------------------ *
     * Data access. Relative URLs only: the document mount prefix stays.   *
     * ------------------------------------------------------------------ */

    function fetchJson(url, signal) {
      return fetch(url, {
        signal: signal,
        headers: { accept: 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
      }).then((response) => {
        if (response.status === 401) {
          const error = new Error('session-stats: unauthorized')
          error.code = 'unauthorized'
          throw error
        }
        if (!response.ok) {
          const error = new Error('session-stats: request failed with status ' + String(response.status))
          error.code = 'http'
          error.status = response.status
          throw error
        }
        return response.json()
      })
    }

    /** Payloads fetched before the panel mounts, so opening it paints immediately. */
    const warmPayloads = new Map()

    /** Fetch one payload in the background and keep it for the panel's first paint. */
    function warmPayload(path) {
      try {
        fetchJson(path).then(
          (data) => { warmPayloads.set(path, { data: data, at: Date.now() }) },
          () => { /* the panel falls back to its loading state */ },
        )
      } catch {
        /* no fetch in this environment (headless renderer): keep the loading state */
      }
    }

    function readLocaleTag(ctx) {
      try {
        const snapshot = ctx.locale.getSnapshot()
        if (snapshot !== null && typeof snapshot === 'object' && typeof snapshot.active === 'string' && snapshot.active.length > 0) {
          return snapshot.active
        }
      } catch (error) {
        /* fall through to the document language */
      }
      try {
        if (typeof document !== 'undefined' && document.documentElement !== null && typeof document.documentElement.lang === 'string' && document.documentElement.lang.length > 0) {
          return document.documentElement.lang
        }
      } catch (error) {
        /* fall through to the default */
      }
      return DEFAULT_LOCALE
    }

    /**
     * One polled JSON resource. The effect owns its timer and its in-flight
     * request, so unmount aborts the request and clears the interval.
     */
    function usePolledResource(load, path, intervalMs, refreshToken) {
      const [state, setState] = useState(() => {
        // A warmed payload lets the panel paint on its first frame; the effect below
        // still refreshes it right away, so the visible numbers stay current.
        const warm = warmPayloads.get(path)
        if (warm !== undefined) {
          return { status: 'ready', data: warm.data, error: null, unauthorized: false, updatedAt: warm.at, refreshing: false }
        }
        return { status: 'loading', data: null, error: null, unauthorized: false, updatedAt: 0, refreshing: false }
      })
      useEffect(() => {
        let stopped = false
        let controller = null
        /** A manual refresh must bypass the Host response caches (`refresh=1`). */
        const request = (force) => {
          if (controller !== null) controller.abort()
          const current = new AbortController()
          controller = current
          // Only a manual refresh shows the busy affordance; polling stays silent.
          if (force) {
            setState((previous) => (previous.refreshing === true ? previous : Object.assign({}, previous, { refreshing: true })))
          }
          const target = force ? path + (path.indexOf('?') === -1 ? '?' : '&') + 'refresh=1' : path
          load(target, current.signal).then(
            (data) => {
              if (stopped || current.signal.aborted) return
              if (controller === current) controller = null
              setState({ status: 'ready', data: data, error: null, unauthorized: false, updatedAt: Date.now(), refreshing: false })
            },
            (error) => {
              if (stopped || current.signal.aborted) return
              if (controller === current) controller = null
              const unauthorized = error !== null && typeof error === 'object' && error.code === 'unauthorized'
              setState((previous) => {
                if (unauthorized) return { status: 'unauthorized', data: null, error: null, unauthorized: true, updatedAt: previous.updatedAt, refreshing: false }
                if (previous.data !== null) return { status: 'ready', data: previous.data, error: error, unauthorized: false, updatedAt: previous.updatedAt, refreshing: false }
                return { status: 'error', data: null, error: error, unauthorized: false, updatedAt: 0, refreshing: false }
              })
            },
          )
        }
        request(refreshToken > 0)
        const timer = setInterval(() => request(false), intervalMs)
        return () => {
          stopped = true
          clearInterval(timer)
          if (controller !== null) {
            controller.abort()
            controller = null
          }
        }
      }, [load, path, intervalMs, refreshToken])
      return state
    }

    /* ------------------------------------------------------------------ *
     * Icons (§8): 24 viewBox, 1.8 stroke, round caps, decorative.         *
     * Only two sizes exist: 16 (controls) and 20 (empty states).          *
     * ------------------------------------------------------------------ */

    function StatsIcon(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const size = source.size === 20 ? 20 : 16
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: 'ss-icon',
        },
        h('rect', { x: 3.5, y: 13, width: 4, height: 7.5, rx: 1.2 }),
        h('rect', { x: 10, y: 9, width: 4, height: 11.5, rx: 1.2 }),
        h('rect', { x: 16.5, y: 4.5, width: 4, height: 16, rx: 1.2, className: 'ss-icon-accent' }),
      )
    }

    function RefreshGlyph(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const spinning = source.spinning === true
      return h(
        'svg',
        {
          width: 16,
          height: 16,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: spinning ? 'ss-icon ss-spin' : 'ss-icon',
        },
        h('path', { d: 'M20 12a8 8 0 1 1-2.34-5.66' }),
        h('path', { d: 'M20 4v5h-5' }),
      )
    }

    function EmptyGlyph(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const size = source.size === 16 ? 16 : 20
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: 'ss-icon',
        },
        h('path', { d: 'M4 13.5l2.4-6.4A2 2 0 0 1 8.3 5.8h7.4a2 2 0 0 1 1.9 1.3L20 13.5' }),
        h('path', { d: 'M4 13.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5' }),
        h('path', { d: 'M4 13.5h4l1.5 2h5l1.5-2h4' }),
      )
    }

    function AlertGlyph(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const size = source.size === 20 ? 20 : 16
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: 'ss-icon',
        },
        h('circle', { cx: 12, cy: 12, r: 8.5 }),
        h('path', { d: 'M12 7.5v5.5' }),
        h('path', { d: 'M12 16.5v.01' }),
      )
    }

    /* ------------------------------------------------------------------ *
     * SsTooltip (§7.7): one page-wide singleton on <body>, wrapped in a   *
     * data-plugin scope container. The font size is read from the owning  *
     * root each time it is shown, never captured at creation time.        *
     * ------------------------------------------------------------------ */

    const TOOLTIP_DELAY_MS = 300
    const TOOLTIP_VIEWPORT_MARGIN = 8
    let tooltipLayer = null
    let tooltipBubble = null
    let tooltipTimer = 0
    let tooltipAnchor = null
    let tooltipUsers = 0

    function ensureTooltip() {
      if (typeof document === 'undefined' || document === null || document.body === null) return null
      if (tooltipBubble !== null && tooltipLayer !== null && tooltipLayer.parentNode === document.body) return tooltipBubble
      const layer = document.createElement('div')
      layer.className = 'ss-tooltip-layer'
      layer.dataset.plugin = PLUGIN_ID
      const bubble = document.createElement('div')
      bubble.className = 'ss-tooltip'
      bubble.setAttribute('role', 'tooltip')
      bubble.setAttribute('aria-hidden', 'true')
      layer.appendChild(bubble)
      document.body.appendChild(layer)
      tooltipLayer = layer
      tooltipBubble = bubble
      return bubble
    }

    function destroyTooltip() {
      if (tooltipTimer !== 0) {
        clearTimeout(tooltipTimer)
        tooltipTimer = 0
      }
      tooltipAnchor = null
      if (tooltipLayer !== null && tooltipLayer.parentNode !== null) tooltipLayer.parentNode.removeChild(tooltipLayer)
      tooltipLayer = null
      tooltipBubble = null
    }

    function hideTooltip() {
      if (tooltipTimer !== 0) {
        clearTimeout(tooltipTimer)
        tooltipTimer = 0
      }
      tooltipAnchor = null
      if (tooltipBubble !== null) {
        tooltipBubble.removeAttribute('data-visible')
        tooltipBubble.textContent = ''
      }
    }

    /** The owning root's live --ds-fs, resolved when the tooltip is shown. */
    function tooltipFontSize(anchor) {
      try {
        if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return ''
        return window.getComputedStyle(anchor).getPropertyValue('--ds-fs').trim()
      } catch (error) {
        return ''
      }
    }

    function placeTooltip(bubble, anchor) {
      if (typeof window === 'undefined') return
      const root = document.documentElement
      const viewWidth = window.innerWidth || (root !== null ? root.clientWidth : 0)
      const viewHeight = window.innerHeight || (root !== null ? root.clientHeight : 0)
      const rect = anchor.getBoundingClientRect()
      const width = bubble.offsetWidth
      const height = bubble.offsetHeight
      const margin = TOOLTIP_VIEWPORT_MARGIN
      const maxLeft = Math.max(margin, viewWidth - width - margin)
      const maxTop = Math.max(margin, viewHeight - height - margin)
      const centeredLeft = clamp(rect.left + rect.width / 2 - width / 2, margin, maxLeft)
      const centeredTop = clamp(rect.top + rect.height / 2 - height / 2, margin, maxTop)
      // Preference order is up, down, right, left; every candidate keeps 8px margins.
      const candidates = [
        { left: centeredLeft, top: rect.top - height - margin },
        { left: centeredLeft, top: rect.bottom + margin },
        { left: rect.right + margin, top: centeredTop },
        { left: rect.left - width - margin, top: centeredTop },
      ]
      const fits = (candidate) => candidate.left >= margin && candidate.top >= margin
        && candidate.left + width <= viewWidth - margin && candidate.top + height <= viewHeight - margin
      let chosen = null
      for (const candidate of candidates) {
        if (fits(candidate)) {
          chosen = candidate
          break
        }
      }
      if (chosen === null) {
        // None fit: clamp each side into the viewport and keep the largest visible area.
        let bestArea = -1
        for (const candidate of candidates) {
          const left = clamp(candidate.left, margin, maxLeft)
          const top = clamp(candidate.top, margin, maxTop)
          const visibleWidth = Math.max(0, Math.min(viewWidth, left + width) - Math.max(0, left))
          const visibleHeight = Math.max(0, Math.min(viewHeight, top + height) - Math.max(0, top))
          const area = visibleWidth * visibleHeight
          if (area > bestArea) {
            bestArea = area
            chosen = { left: left, top: top }
          }
        }
      }
      bubble.style.left = String(Math.round(chosen.left)) + 'px'
      bubble.style.top = String(Math.round(chosen.top)) + 'px'
    }

    function showTooltip(anchor) {
      const bubble = ensureTooltip()
      if (bubble === null) return
      const text = anchor.getAttribute('data-ss-tooltip')
      if (typeof text !== 'string' || text === '') return
      bubble.textContent = text
      const fontSize = tooltipFontSize(anchor)
      if (tooltipLayer !== null) {
        if (fontSize !== '') tooltipLayer.style.setProperty('--ds-fs', fontSize)
        else tooltipLayer.style.removeProperty('--ds-fs')
      }
      bubble.removeAttribute('data-visible')
      placeTooltip(bubble, anchor)
      tooltipAnchor = anchor
      bubble.setAttribute('data-visible', 'true')
    }

    function scheduleTooltip(anchor) {
      if (tooltipAnchor === anchor && tooltipBubble !== null && tooltipBubble.getAttribute('data-visible') === 'true') return
      if (tooltipTimer !== 0) {
        clearTimeout(tooltipTimer)
        tooltipTimer = 0
      }
      if (tooltipAnchor !== null) hideTooltip()
      tooltipTimer = setTimeout(() => {
        tooltipTimer = 0
        showTooltip(anchor)
      }, TOOLTIP_DELAY_MS)
    }

    /**
     * Bind hover/focus tooltip behavior to one anchor. Hover or keyboard focus
     * waits 300ms; leave, press, scroll and unmount hide immediately. Pointer
     * focus (a click) never re-triggers the tooltip.
     */
    function useTooltip(label) {
      const ref = useRef(null)
      useEffect(() => {
        const node = ref.current
        if (node === null || typeof node.addEventListener !== 'function') return undefined
        if (typeof label !== 'string' || label === '') return undefined
        tooltipUsers += 1
        const show = () => scheduleTooltip(node)
        const hide = () => hideTooltip()
        const onFocus = () => {
          let visible = true
          try {
            visible = node.matches(':focus-visible')
          } catch (error) {
            visible = true
          }
          if (visible) scheduleTooltip(node)
        }
        const onScroll = () => hideTooltip()
        const onPress = () => hideTooltip()
        node.addEventListener('mouseenter', show)
        node.addEventListener('mouseleave', hide)
        node.addEventListener('focus', onFocus)
        node.addEventListener('blur', hide)
        node.addEventListener('pointerdown', onPress)
        node.addEventListener('click', onPress)
        window.addEventListener('scroll', onScroll, true)
        document.addEventListener('pointerdown', onPress, true)
        return () => {
          node.removeEventListener('mouseenter', show)
          node.removeEventListener('mouseleave', hide)
          node.removeEventListener('focus', onFocus)
          node.removeEventListener('blur', hide)
          node.removeEventListener('pointerdown', onPress)
          node.removeEventListener('click', onPress)
          window.removeEventListener('scroll', onScroll, true)
          document.removeEventListener('pointerdown', onPress, true)
          tooltipUsers -= 1
          if (tooltipAnchor === node) hideTooltip()
          if (tooltipUsers <= 0) destroyTooltip()
        }
      }, [label])
      return ref
    }

    /** Primitive handle for the full-page tooltip singleton (§7.7). */
    const SsTooltip = { show: showTooltip, hide: hideTooltip, useAnchor: useTooltip }

    /* ------------------------------------------------------------------ *
     * Primitives (§6.4 / §7). Views never render a bare <button>.         *
     * ------------------------------------------------------------------ */

    function SsButton(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const variant = source.variant === 'primary' || source.variant === 'ghost' || source.variant === 'danger'
        ? source.variant
        : 'secondary'
      const size = source.size === 'lg' || source.size === 'sm' ? source.size : 'md'
      const name = typeof source.name === 'string' && source.name !== '' ? ' ss-' + source.name : ''
      return h(
        'button',
        {
          type: source.type === 'submit' ? 'submit' : 'button',
          className: 'ss-btn' + name,
          'data-variant': variant,
          'data-size': size,
          'data-busy': source.busy === true ? 'true' : undefined,
          'data-active': source.active === true ? 'true' : undefined,
          disabled: source.disabled === true,
          'aria-label': source.label,
          'aria-pressed': source.pressed === undefined ? undefined : (source.pressed === true ? 'true' : 'false'),
          'aria-expanded': source.expanded === undefined ? undefined : (source.expanded === true ? 'true' : 'false'),
          'aria-busy': source.busy === true ? 'true' : undefined,
          title: source.title,
          tabIndex: source.tabIndex,
          style: source.style,
          onClick: typeof source.onClick === 'function' ? source.onClick : undefined,
        },
        source.children,
      )
    }

    function SsIconButton(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const label = typeof source.label === 'string' ? source.label : ''
      const ref = SsTooltip.useAnchor(label)
      const name = typeof source.name === 'string' && source.name !== '' ? ' ss-' + source.name : ''
      return h(
        'button',
        {
          type: 'button',
          ref: ref,
          className: 'ss-icon-btn' + name,
          'data-size': source.size === 'sm' ? 'sm' : 'md',
          'data-variant': source.variant === 'danger' ? 'danger' : 'ghost',
          'data-active': source.active === true ? 'true' : undefined,
          'data-ss-tooltip': label,
          disabled: source.disabled === true,
          'aria-label': label,
          'aria-pressed': source.pressed === undefined ? undefined : (source.pressed === true ? 'true' : 'false'),
          onClick: typeof source.onClick === 'function' ? source.onClick : undefined,
        },
        source.children,
      )
    }

    function SsSegmented(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const level = source.level === 'primary' ? 'primary' : 'secondary'
      return h(
        'div',
        {
          className: 'ss-segmented',
          'data-level': level,
          role: 'group',
          'aria-label': source.label,
        },
        toArray(source.items).map((item) => {
          const record = toObject(item)
          const active = record.active === true
          return h(
            'button',
            {
              key: record.id,
              type: 'button',
              className: 'ss-segment' + (active ? ' ss-segment-active' : ''),
              'aria-pressed': active ? 'true' : 'false',
              onClick: typeof record.onClick === 'function' ? record.onClick : undefined,
            },
            record.label,
            record.suffix === undefined || record.suffix === null
              ? null
              : h('span', { className: 'ss-sort-arrow', 'aria-hidden': 'true' }, record.suffix),
          )
        }),
      )
    }

    function SsBadge(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const tone = source.tone === 'warn' || source.tone === 'success' || source.tone === 'error' ? source.tone : 'neutral'
      const name = typeof source.name === 'string' && source.name !== '' ? ' ss-' + source.name : ''
      return h('span', { className: 'ss-badge' + name, 'data-tone': tone }, source.children)
    }

    function SsEmptyState(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const tone = source.tone === 'error' ? 'error' : 'neutral'
      const Icon = typeof source.icon === 'function' ? source.icon : EmptyGlyph
      return h(
        'div',
        {
          className: 'ss-empty-state',
          'data-tone': tone,
          'data-roomy': source.roomy === true ? 'true' : undefined,
          role: source.role === undefined ? 'status' : source.role,
        },
        h(Icon, { size: 20 }),
        h('p', { className: 'ss-empty' }, source.message),
        source.actionLabel === undefined || source.actionLabel === null
          ? null
          : h(
              SsButton,
              { name: 'state-action', size: 'md', variant: 'secondary', onClick: source.onAction },
              source.actionLabel,
            ),
      )
    }

    function SsErrorBar(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      return h(
        'div',
        { className: 'ss-errorbar', role: 'alert' },
        h(AlertGlyph, { size: 16 }),
        h('span', { className: 'ss-errorbar-text' }, source.message),
        h(
          SsButton,
          { size: 'sm', variant: 'secondary', onClick: source.onRetry },
          source.actionLabel,
        ),
      )
    }

    /**
     * Sidebar-foot entry (`sidebar.footer.action`), rendered directly above the
     * account menu at the bottom of the sidebar. The owner hands it only `wide`;
     * the panel title and the navigation callbacks come from the registration.
     * The entry toggles: a second click on the already-open panel returns to the
     * Conversation (`layout.selectPanel(null)`). Collapsed it is a pure icon and
     * therefore carries the singleton tooltip.
     */
    function FooterEntry(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const wide = source.wide === true
      const t = typeof source.t === 'function' ? source.t : (key) => key
      const openPanel = typeof source.openPanel === 'function' ? source.openPanel : () => {}
      const togglePanel = typeof source.togglePanel === 'function' ? source.togglePanel : null
      const usePanelInfo = source.usePanelInfo
      const active = typeof usePanelInfo === 'function'
        ? usePanelInfo((info) => info !== null && typeof info === 'object' && info.activePanelId === PANEL_ID) === true
        : false
      const onClick = () => {
        if (togglePanel !== null) togglePanel(active)
        else openPanel()
      }
      const label = t('panel.title')
      if (!wide) {
        return h(
          SsIconButton,
          { name: 'footer-entry', label: label, pressed: active, active: active, onClick: onClick },
          h(StatsIcon, null),
        )
      }
      return h(
        SsButton,
        { name: 'footer-entry', size: 'lg', variant: 'ghost', label: label, pressed: active, active: active, onClick: onClick },
        h(StatsIcon, null),
        h('span', { className: 'ss-footer-label' }, label),
      )
    }

    /* ------------------------------------------------------------------ *
     * Shared state surfaces (§7.10).                                      *
     * ------------------------------------------------------------------ */

    function SkeletonGrid() {
      // Mirror the tallest summary card (label / value / hint / progress / hint)
      // with the same text tiers, so the first-load height follows the host font
      // size and the swap to real cards does not jump.
      return h(
        'div',
        { className: 'ss-skeleton-grid', 'aria-hidden': 'true' },
        [0, 1, 2, 3].map((index) => h(
          'div',
          { key: index, className: 'ss-card ss-skeleton' },
          h('span', { className: 'ss-skeleton-row ss-skeleton-label' }),
          h('span', { className: 'ss-skeleton-row ss-skeleton-value' }),
          h('span', { className: 'ss-skeleton-row ss-skeleton-hint' }),
          h('span', { className: 'ss-skeleton-row ss-skeleton-bar' }),
          h('span', { className: 'ss-skeleton-row ss-skeleton-hint' }),
        )),
      )
    }

    /** First load: a skeleton, but only after 300ms so a fast warm paint never flickers. */
    function LoadingState() {
      const [visible, setVisible] = useState(false)
      useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 300)
        return () => clearTimeout(timer)
      }, [])
      return h('div', { className: 'ss-state-wrap' }, visible ? h(SkeletonGrid, null) : null)
    }

    function SectionSkeleton() {
      return h('div', { className: 'ss-skeleton ss-skeleton-line', 'aria-hidden': 'true' })
    }

    function SummaryCard(props) {
      return h(
        'article',
        { className: 'ss-card ss-summary' },
        h('h2', { className: 'ss-summary-label' }, props.label),
        h('p', { className: 'ss-summary-value' }, props.value, props.unit === undefined ? null : h('span', { className: 'ss-summary-unit' }, props.unit)),
        props.hint === undefined ? null : h('p', { className: 'ss-summary-hint' }, props.hint),
        props.children === undefined ? null : props.children,
      )
    }

    /* ------------------------------------------------------------------ *
     * Section 1: summary cards.                                           *
     * ------------------------------------------------------------------ */

    function SummarySection(props) {
      const t = props.t
      const fmt = props.fmt
      const overview = toObject(props.overview)
      const totals = toObject(overview.totals)
      const tokens = toObject(totals.tokens)
      const budget = toObject(overview.budget)
      const amount = toNumber(budget.amount)
      const used = toNumber(budget.used)
      const declaredRemaining = toNullableNumber(budget.remaining)
      const remaining = declaredRemaining === null ? Math.max(0, amount - used) : declaredRemaining
      const declaredRatio = toNullableNumber(budget.ratio)
      const ratio = amount > 0 ? clamp01(declaredRatio === null ? used / amount : declaredRatio) : 0
      const percent = clamp(ratio * 100, 0, 100)
      const tone = ratio >= 1 ? ' ss-tone-danger' : ratio >= 0.8 ? ' ss-tone-warn' : ''
      const period = toText(budget.periodLabel) !== '' ? budget.periodLabel : toText(budget.period)
      const dailyAverage = toNumber(budget.dailyAverage)
      const dynamic = budget.dynamic === true

      // The two headline cards carry a small daily sparkline, so a trend is visible
      // without scrolling to the main chart.
      const dailyBuckets = toArray(toObject(overview.timeline).buckets).map(trendBucketOf)
      const tokenSpark = miniTrend(dailyBuckets.map((bucket) => bucket.total), 1, t('summary.tokensSpark'))
      const costSpark = miniTrend(dailyBuckets.map((bucket) => bucket.cost), 3, t('summary.costSpark'))

      const tokensCard = h(
        SummaryCard,
        {
          key: 'tokens',
          label: t('summary.tokens'),
          value: fmt.compact(totalTokens(tokens)),
          unit: t('unit.tokens'),
          hint: t('summary.tokensHint', {
            input: fmt.compact(tokens.input),
            output: fmt.compact(tokens.output),
            cache: fmt.compact(tokens.cacheRead),
          }),
        },
        tokenSpark,
      )

      const sessionsCard = h(SummaryCard, {
        key: 'sessions',
        label: t('summary.sessions'),
        value: fmt.integer(totals.sessions),
        hint: t('summary.sessionsHint', {
          live: fmt.integer(totals.liveSessions),
          turns: fmt.integer(totals.turns),
        }),
      })

      const costCard = h(
        SummaryCard,
        {
          key: 'cost',
          label: t('summary.cost'),
          value: fmt.money(totals.cost),
          hint: t('summary.costHint', { requests: fmt.integer(totals.requests) }),
        },
        costSpark,
      )

      const budgetHint = t('summary.budgetHint', { period: period === '' ? DASH : period })
      // The budget amount is a live estimate of the period's total, so it is the
      // headline; the used/remaining split and the estimating basis explain it.
      const budgetBasis = dynamic
        ? budgetHint + ' · ' + t('summary.budgetDynamic', { average: fmt.moneyShort(dailyAverage) })
        : budgetHint
      const budgetCard = h(
        SummaryCard,
        {
          key: 'budget',
          label: t('summary.budget'),
          value: amount > 0 ? fmt.moneyShort(amount) : t('summary.noBudget'),
          hint: amount > 0
            ? t('summary.budgetUsedRemaining', { used: fmt.moneyShort(used), remaining: fmt.moneyShort(remaining) })
            : undefined,
        },
        amount > 0
          ? [
              h(
                'div',
                {
                  key: 'bar',
                  className: 'ss-progress',
                  role: 'progressbar',
                  'aria-label': t('summary.budget'),
                  'aria-valuenow': Math.round(percent),
                  'aria-valuemin': 0,
                  'aria-valuemax': 100,
                },
                h('div', { className: 'ss-progress-fill' + tone, style: { width: percent + '%' } }),
              ),
              h('p', { key: 'basis', className: 'ss-summary-hint' }, budgetBasis),
            ]
          : null,
      )

      return h('div', { className: 'ss-summary-grid' }, tokensCard, sessionsCard, costCard, budgetCard)
    }

    /* ------------------------------------------------------------------ *
     * Section 2: daily token trend.                                       *
     *                                                                     *
     * One multi-series line chart serves both the per-model view and the   *
     * per-token-type view. Hover needs no JavaScript: every day owns an    *
     * invisible hit region carrying its guide, dots and tooltip, and CSS   *
     * reveals only the hovered region, so the chart stays a pure function  *
     * of the payload.                                                      *
     * ------------------------------------------------------------------ */

    /** Chart series slots map to --ss-series-N on .ss-page via data-series (§2.10). */
    const SERIES_SLOTS = 6
    const SERIES_OTHER_SLOT = 8

    function seriesSlot(index) {
      return index + 1
    }

    function modelLabelOf(provider, model) {
      if (model === '') return DASH
      return provider === '' ? model : provider + '/' + model
    }

    /** Stable series identity: the payload sorts models by all-time cost, the client by
     * window tokens, so a position-based id would silently re-point between polls. */
    function modelRowId(provider, model) {
      return 'model:' + provider + '\u0000' + model
    }

    /** One timeline bucket, normalized for the chart. */
    function trendBucketOf(entry) {
      const record = toObject(entry)
      const tokens = toObject(record.tokens)
      const input = toNumber(tokens.input)
      const output = toNumber(tokens.output)
      const cacheRead = toNumber(tokens.cacheRead)
      return {
        key: toText(record.key),
        start: toNumber(record.start),
        input: input,
        output: output,
        cacheRead: cacheRead,
        total: totalTokens(tokens),
        cost: toNumber(record.cost),
        requests: toNumber(record.requests),
      }
    }

    function bucketLabel(bucket, fmt) {
      if (bucket.start > 0) {
        const formatted = fmt.day(bucket.start)
        if (formatted !== '') return formatted
      }
      return bucket.key
    }

    /** X-axis tick positions: every day while it fits, otherwise evenly spread indices. */
    function axisTickIndices(count, maxTicks) {
      if (count <= 0) return []
      if (count <= maxTicks) {
        const all = []
        for (let index = 0; index < count; index += 1) all.push(index)
        return all
      }
      const ticks = []
      const step = (count - 1) / (maxTicks - 1)
      for (let index = 0; index < maxTicks; index += 1) {
        const value = Math.round(index * step)
        if (ticks.length === 0 || ticks[ticks.length - 1] !== value) ticks.push(value)
      }
      return ticks
    }

    /** A round upper bound (1/2/2.5/5 x 10^n) at or above a positive maximum. */
    function niceMax(value) {
      if (!(value > 0)) return 0
      const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
      const normalized = value / magnitude
      const step = normalized <= 1
        ? 1
        : normalized <= 2
          ? 2
          : normalized <= 2.5
            ? 2.5
            : normalized <= 4
              ? 4
              : normalized <= 5
                ? 5
                : normalized <= 6
                  ? 6
                  : normalized <= 8
                    ? 8
                    : 10
      return step * magnitude
    }

    /**
     * A smoothed cubic path through {x, y} points (Catmull-Rom control points).
     * `top`/`bottom` clamp the control points to the plot band: an unclamped
     * Catmull-Rom curve overshoots steep peaks and would draw outside the chart.
     */
    function smoothPath(points, top, bottom) {
      if (points.length === 0) return ''
      let path = 'M ' + String(points[0].x) + ' ' + String(points[0].y)
      if (points.length === 1) return path
      const clampControl = (value) => (top === undefined || bottom === undefined
        ? value
        : Math.min(bottom, Math.max(top, value)))
      for (let index = 0; index < points.length - 1; index += 1) {
        const previous = index === 0 ? points[index] : points[index - 1]
        const current = points[index]
        const next = points[index + 1]
        const after = index + 2 >= points.length ? next : points[index + 2]
        const controlOne = {
          x: current.x + (next.x - previous.x) / 6,
          y: clampControl(current.y + (next.y - previous.y) / 6),
        }
        const controlTwo = {
          x: next.x - (after.x - current.x) / 6,
          y: clampControl(next.y - (after.y - current.y) / 6),
        }
        path += ' C ' + String(controlOne.x) + ' ' + String(controlOne.y) + ', ' + String(controlTwo.x) + ' ' + String(controlTwo.y) + ', ' + String(next.x) + ' ' + String(next.y)
      }
      return path
    }

    /** A straight polyline in a 0..height space, used by the small sparklines. */
    function polylinePath(values, height) {
      if (values.length === 0) return ''
      const max = values.reduce((largest, value) => Math.max(largest, value), 0)
      let path = ''
      for (let index = 0; index < values.length; index += 1) {
        const y = max > 0 ? height - 2 - (values[index] / max) * (height - 4) : height - 2
        path += (index === 0 ? 'M ' : ' L ') + String(index) + ' ' + String(y)
      }
      return path
    }

    /** A one-series sparkline (area + line) for a summary card. */
    function miniTrend(values, slot, label) {
      if (values.length < 2) return null
      const width = values.length - 1
      const line = polylinePath(values, 28)
      const series = String(slot)
      return h(
        'svg',
        {
          className: 'ss-mini-trend',
          viewBox: '0 0 ' + String(width) + ' 28',
          preserveAspectRatio: 'none',
          role: 'img',
          'aria-label': label,
          focusable: 'false',
        },
        h('path', { className: 'ss-mini-area', d: line + ' L ' + String(width) + ' 28 L 0 28 Z', 'data-series': series }),
        h('path', { className: 'ss-mini-line', d: line, 'data-series': series, vectorEffect: 'non-scaling-stroke' }),
      )
    }

    /**
     * Window-scoped model rows and chart series. The top SERIES_SLOTS models keep
     * their own line and color; the remainder and any tokens whose event names no
     * model are aggregated into "other", so the series always add up to the day total.
     */
    function buildModelView(overview, t) {
      const source = toObject(overview)
      const buckets = toArray(toObject(source.timeline).buckets).map(trendBucketOf)
      const dayCount = buckets.length
      const candidates = toArray(source.models).map((entry, position) => {
        const record = toObject(entry)
        const daily = toArray(record.daily)
        const window = toObject(record.window)
        const dailyTokens = []
        for (let index = 0; index < dayCount; index += 1) {
          dailyTokens.push(toNumber(toObject(daily[index]).tokens))
        }
        const provider = toText(record.provider)
        const model = toText(record.model)
        return {
          id: modelRowId(provider, model),
          provider: provider,
          model: model,
          label: modelLabelOf(provider, model),
          dailyTokens: dailyTokens,
          tokens: toNumber(window.tokens) || dailyTokens.reduce((sum, value) => sum + value, 0),
          cost: toNumber(window.cost),
          requests: toNumber(window.requests),
        }
      }).filter((row) => row.tokens > 0)
      candidates.sort((left, right) => (
        (right.tokens - left.tokens)
        || (right.cost - left.cost)
        || left.label.localeCompare(right.label)
      ))
      const top = candidates.slice(0, SERIES_SLOTS)
      const rest = candidates.slice(SERIES_SLOTS)
      const attributed = []
      for (let index = 0; index < dayCount; index += 1) attributed.push(0)
      for (const row of candidates) {
        for (let index = 0; index < dayCount; index += 1) attributed[index] += row.dailyTokens[index]
      }
      const otherDaily = []
      for (let index = 0; index < dayCount; index += 1) {
        const bucket = buckets[index]
        const bucketTotal = bucket === undefined ? 0 : bucket.total
        let value = Math.max(0, bucketTotal - attributed[index])
        for (const row of rest) value += row.dailyTokens[index]
        otherDaily.push(value)
      }
      const windowTokens = buckets.reduce((sum, bucket) => sum + bucket.total, 0)
      const windowCost = buckets.reduce((sum, bucket) => sum + bucket.cost, 0)
      const windowRequests = buckets.reduce((sum, bucket) => sum + bucket.requests, 0)
      const rows = top.map((row, index) => ({
        id: row.id,
        label: row.label,
        slot: seriesSlot(index),
        tokens: row.tokens,
        cost: row.cost,
        requests: row.requests,
        dailyTokens: row.dailyTokens,
      }))
      const otherTokens = otherDaily.reduce((sum, value) => sum + value, 0)
      if (otherTokens > 0) {
        const topTokens = top.reduce((sum, row) => sum + row.tokens, 0)
        const topCost = top.reduce((sum, row) => sum + row.cost, 0)
        const topRequests = top.reduce((sum, row) => sum + row.requests, 0)
        rows.push({
          id: 'other',
          label: t('chart.other'),
          slot: SERIES_OTHER_SLOT,
          tokens: Math.max(0, windowTokens - topTokens),
          cost: Math.max(0, windowCost - topCost),
          requests: Math.max(0, windowRequests - topRequests),
          dailyTokens: otherDaily,
          isOther: true,
        })
      }
      return {
        rows: rows,
        series: rows.map((row) => ({ id: row.id, label: row.label, slot: row.slot, values: row.dailyTokens })),
        dayCount: dayCount,
        totalTokens: windowTokens,
        totalCost: windowCost,
        hasData: windowTokens > 0,
      }
    }

    /** The three token-type series of the "by type" chart mode. */
    function buildTypeSeries(buckets, t) {
      const values = (key) => buckets.map((bucket) => bucket[key])
      return [
        { id: 'type:input', label: t('chart.input'), slot: seriesSlot(0), values: values('input') },
        { id: 'type:output', label: t('chart.output'), slot: seriesSlot(1), values: values('output') },
        { id: 'type:cache', label: t('chart.cacheRead'), slot: seriesSlot(2), values: values('cacheRead') },
      ]
    }

    function TrendLegend(props) {
      const t = props.t
      return h(
        'div',
        { className: 'ss-legend ss-trend-legend', role: 'group', 'aria-label': t('chart.legend') },
        props.series.map((entry) => {
          const hidden = props.hidden.indexOf(entry.id) !== -1
          // The visible label is the accessible name; a native title would only
          // duplicate it and is not the §7.7 tooltip.
          return h(
            SsButton,
            {
              key: entry.id,
              name: 'legend-button',
              size: 'sm',
              variant: 'ghost',
              pressed: !hidden,
              onClick: () => props.onToggle(entry.id),
            },
            h(
              'span',
              { className: 'ss-legend-inner' + (hidden ? ' ss-legend-off' : '') },
              h('span', { className: 'ss-legend-dot', 'data-series': String(entry.slot), 'aria-hidden': 'true' }),
              h('span', { className: 'ss-legend-text' }, entry.label),
            ),
          )
        }),
      )
    }

    /**
     * The multi-series plot. Hover is CSS-only: every day owns an invisible hit
     * region carrying its guide, dots and tooltip.
     */
    function TrendPlot(props) {
      const t = props.t
      const fmt = props.fmt
      const buckets = props.buckets
      const series = props.series
      const count = buckets.length
      const yMax = props.yMax
      // Leave a small inset so a flat (zero) series stays visible above the axis.
      const plotTop = 4
      const plotBottom = 96
      const gridY = (fraction) => plotBottom - fraction * (plotBottom - plotTop)
      const yPercent = (value) => plotBottom - clamp(yMax > 0 ? value / yMax : 0, 0, 1) * (plotBottom - plotTop)
      const xPercent = (index) => (count > 1 ? (index / (count - 1)) * 100 : 50)
      const width = count > 1 ? count - 1 : 1
      const ticks = [0, 0.25, 0.5, 0.75, 1]
      const ariaLabel = t('chart.title') + ' / ' + t('chart.window', { days: props.days })

      const gridLines = ticks.map((fraction) => h('line', {
        key: 'grid:' + String(fraction),
        className: 'ss-grid-line' + (fraction === 0 ? ' ss-grid-base' : ''),
        x1: 0,
        x2: width,
        y1: gridY(fraction),
        y2: gridY(fraction),
        vectorEffect: 'non-scaling-stroke',
      }))
      const drawOrder = series.slice().reverse()
      const lines = drawOrder.map((entry) => h(
        'path',
        {
          key: entry.id,
          className: 'ss-series-line',
          d: smoothPath(entry.values.map((value, index) => ({ x: count > 1 ? index : 0, y: yPercent(value) })), plotTop, plotBottom),
          'data-series': String(entry.slot),
          vectorEffect: 'non-scaling-stroke',
        },
        h('title', null, entry.label),
      ))

      const axisLabels = ticks.map((fraction) => h(
        'span',
        {
          key: 'axis:' + String(fraction),
          className: 'ss-yaxis-label',
          style: { top: gridY(fraction) + '%', transform: 'translateY(-50%)' },
        },
        fmt.compact(yMax * fraction),
      ))

      const hits = buckets.map((bucket, index) => {
        const left = count > 1 ? clamp((index - 0.5) / (count - 1) * 100, 0, 100) : 0
        const right = count > 1 ? clamp((index + 0.5) / (count - 1) * 100, 0, 100) : 100
        const hitWidth = right - left
        const offset = hitWidth > 0 ? ((xPercent(index) - left) / hitWidth) * 100 : 50
        const tipOnRight = index >= count / 2
        const dots = drawOrder.map((entry) => h('span', {
          key: 'dot:' + entry.id,
          className: 'ss-dot',
          'data-series': String(entry.slot),
          'aria-hidden': 'true',
          style: { left: offset + '%', top: yPercent(entry.values[index]) + '%' },
        }))
        const positive = series.filter((entry) => entry.values[index] > 0)
        const tipRows = positive.map((entry) => h(
          'li',
          { key: 'tip:' + entry.id },
          h('span', { className: 'ss-tip-dot', 'data-series': String(entry.slot), 'aria-hidden': 'true' }),
          h('span', { className: 'ss-tip-name' }, entry.label),
          h('strong', { className: 'ss-tip-value' }, fmt.compact(entry.values[index])),
        ))
        const hitLabel = bucketLabel(bucket, fmt)
          + ' ' + t('chart.total') + ' ' + fmt.compact(bucket.total)
          + (positive.length === 0
            ? ''
            : ' · ' + positive.map((entry) => entry.label + ' ' + fmt.compact(entry.values[index])).join(' · '))
        return h(
          SsButton,
          {
            key: 'hit:' + (bucket.key === '' ? String(index) : bucket.key),
            name: 'hit',
            size: 'sm',
            variant: 'ghost',
            tabIndex: bucket.total > 0 ? 0 : -1,
            label: hitLabel,
            style: { left: left + '%', width: hitWidth + '%' },
          },
          h('span', { className: 'ss-guide', style: { left: offset + '%' }, 'aria-hidden': 'true' }),
          dots,
          h(
            'div',
            {
              className: 'ss-tip' + (tipOnRight ? ' ss-tip-right' : ''),
              'aria-hidden': 'true',
              style: tipOnRight
                ? { right: (100 - offset) + '%' }
                : { left: offset + '%' },
            },
            h('p', { className: 'ss-tip-date' }, bucketLabel(bucket, fmt)),
            h(
              'p',
              { className: 'ss-tip-total' },
              h('span', null, t('chart.total')),
              h('strong', null, fmt.compact(bucket.total)),
            ),
            h('ul', { className: 'ss-tip-list' }, tipRows),
            props.mode === 'type'
              ? h('p', { className: 'ss-tip-foot' }, t('table.cost') + ' ' + fmt.money(bucket.cost))
              : null,
          ),
        )
      })

      const xLabels = axisTickIndices(count, 6).map((index) => {
        const first = index === 0
        const last = index === count - 1
        return h(
          'span',
          {
            key: 'xlabel:' + String(index),
            className: 'ss-xlabel' + (first ? ' ss-xlabel-first' : '') + (last && !first ? ' ss-xlabel-last' : ''),
            style: { left: xPercent(index) + '%' },
          },
          bucketLabel(buckets[index], fmt),
        )
      })

      return h(
        'div',
        { className: 'ss-trend' },
        h(
          'div',
          { className: 'ss-trend-body' },
          h('div', { className: 'ss-yaxis', 'aria-hidden': 'true' }, axisLabels),
          h(
            'div',
            { className: 'ss-plot-wrap' },
            h(
              'svg',
              { className: 'ss-plot', viewBox: '0 0 ' + String(width) + ' 100', preserveAspectRatio: 'none', role: 'img', 'aria-label': ariaLabel, focusable: 'false' },
              gridLines,
              lines,
            ),
            h('div', { className: 'ss-hits' }, hits),
          ),
        ),
        h('div', { className: 'ss-xaxis', 'aria-hidden': 'true' }, xLabels),
      )
    }

    function TrendSection(props) {
      const t = props.t
      const fmt = props.fmt
      const overview = toObject(props.overview)
      const modelView = props.modelView
      const [mode, setMode] = useState('model')
      const [hidden, setHidden] = useState([])
      const days = toNumber(overview.days) > 0 ? toNumber(overview.days) : DAYS
      const buckets = toArray(toObject(overview.timeline).buckets).map(trendBucketOf)
      const hasData = buckets.some((bucket) => bucket.total > 0)
      const allSeries = mode === 'model' ? modelView.series : buildTypeSeries(buckets, t)
      const visible = allSeries.filter((entry) => hidden.indexOf(entry.id) === -1)
      const maxValue = visible.reduce((largest, entry) => entry.values.reduce((inner, value) => Math.max(inner, value), largest), 0)
      // A fallback bound keeps the plot meaningful when every visible series is zero
      // (all usage may belong to a hidden series); `hasData` already handled no data.
      const yMax = niceMax(maxValue) || 1

      const toggleSeries = useCallback((id) => {
        setHidden((previous) => (previous.indexOf(id) === -1 ? previous.concat([id]) : previous.filter((value) => value !== id)))
      }, [])

      const head = h(
        'div',
        { className: 'ss-card-head' },
        h(
          'div',
          { className: 'ss-card-head-main' },
          h('h2', { className: 'ss-card-title' }, t('chart.title')),
          h('p', { className: 'ss-card-sub' }, t('chart.window', { days: days })),
        ),
        h(SsSegmented, {
          level: 'secondary',
          label: t('chart.title'),
          items: [
            { id: 'model', label: t('chart.modeModel'), active: mode === 'model', onClick: () => setMode('model') },
            { id: 'type', label: t('chart.modeType'), active: mode === 'type', onClick: () => setMode('type') },
          ],
        }),
      )

      let body
      if (!hasData) body = h(SsEmptyState, { message: t('chart.empty') })
      else if (visible.length === 0) body = h(SsEmptyState, { message: t('chart.allHidden') })
      else body = h(TrendPlot, { t: t, fmt: fmt, buckets: buckets, series: visible, yMax: yMax, mode: mode, days: days })

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('chart.title') },
        head,
        h(TrendLegend, { series: allSeries, hidden: hidden, t: t, onToggle: toggleSeries }),
        body,
      )
    }

    /* ------------------------------------------------------------------ *
     * Section 3: per-session table.                                       *
     * ------------------------------------------------------------------ */

    function normalizeSession(entry) {
      const record = toObject(entry)
      const tokens = toObject(record.tokens)
      return {
        id: toText(record.id),
        title: toText(record.title),
        createdAt: toNumber(record.createdAt),
        archived: record.archived === true,
        turns: toNumber(record.turns),
        requests: toNumber(record.requests),
        input: toNumber(tokens.input),
        output: toNumber(tokens.output),
        cacheRead: toNumber(tokens.cacheRead),
        total: totalTokens(tokens),
        cost: toNumber(record.cost),
        logBytes: toNumber(record.logBytes),
      }
    }

    function SessionsSection(props) {
      const t = props.t
      const fmt = props.fmt
      const overview = toObject(props.overview)
      const [sortKey, setSortKey] = useState('cost')
      const [descending, setDescending] = useState(true)
      /** Collapsed by default; the first expansion shows every row in a ten-row window. */
      const [expanded, setExpanded] = useState(false)

      const sessions = useMemo(() => toArray(overview.sessions).map(normalizeSession), [overview])
      const sorted = useMemo(() => {
        const rows = sessions.slice()
        const direction = descending ? -1 : 1
        rows.sort((left, right) => {
          let delta = 0
          if (sortKey === 'tokens') delta = left.total - right.total
          else if (sortKey === 'size') delta = left.logBytes - right.logBytes
          else delta = left.cost - right.cost
          if (delta !== 0) return delta * direction
          return right.createdAt - left.createdAt
        })
        return rows
      }, [sessions, sortKey, descending])

      const shown = sorted.slice(0, expanded ? TABLE_LIMIT : SESSIONS_COLLAPSED_ROWS)
      const canExpand = !expanded && sessions.length > SESSIONS_COLLAPSED_ROWS

      const sortOptions = [
        ['cost', 'table.sortCost'],
        ['tokens', 'table.sortTokens'],
        ['size', 'table.sortSize'],
      ]
      const controls = h(SsSegmented, {
        level: 'secondary',
        label: t('sessions.title'),
        items: sortOptions.map((option) => {
          const active = sortKey === option[0]
          return {
            id: option[0],
            label: t(option[1]),
            active: active,
            suffix: active ? (descending ? '\u2193' : '\u2191') : undefined,
            onClick: () => {
              if (active) setDescending((value) => !value)
              else {
                setSortKey(option[0])
                setDescending(true)
              }
            },
          }
        }),
      })

      const head = h(
        'div',
        { className: 'ss-card-head' },
        h('h2', { className: 'ss-card-title' }, t('sessions.title')),
        controls,
      )

      if (sessions.length === 0) {
        return h('section', { className: 'ss-card', 'aria-label': t('sessions.title') }, head, h(SsEmptyState, { message: t('sessions.empty') }))
      }

      const maxSessionTokens = sessions.reduce((largest, session) => Math.max(largest, session.total), 0)
      const rows = shown.map((session) =>
        h(
          'tr',
          { key: session.id },
          h(
            'td',
            null,
            h(
              'span',
              { className: 'ss-session-head' },
              h('span', { className: 'ss-session-title' }, session.title === '' ? t('table.untitled') : session.title),
              session.archived ? h(SsBadge, { name: 'archived-badge', tone: 'warn' }, t('sessions.archived')) : null,
            ),
            h('span', { className: 'ss-session-id' }, shortSessionId(session.id)),
          ),
          h('td', null, fmt.date(session.createdAt)),
          h('td', { className: 'ss-num' }, fmt.integer(session.requests)),
          h(
            'td',
            { className: 'ss-num' },
            h('span', { className: 'ss-num-main' }, fmt.compact(session.total)),
            h(
              'span',
              { className: 'ss-row-bar', 'aria-hidden': 'true' },
              h('span', {
                className: 'ss-row-bar-fill',
                style: { width: (maxSessionTokens > 0 ? clamp01(session.total / maxSessionTokens) * 100 : 0) + '%' },
              }),
            ),
          ),
          h(
            'td',
            { className: 'ss-num ss-split' },
            fmt.compact(session.input) + ' / ' + fmt.compact(session.output) + ' / ' + fmt.compact(session.cacheRead),
          ),
          h('td', { className: 'ss-num' }, fmt.money(session.cost)),
          h('td', { className: 'ss-num' }, fmt.bytes(session.logBytes)),
        ),
      )

      const table = h(
        'div',
        expanded
          ? { className: 'ss-table-scroll ss-table-window', role: 'region', tabIndex: 0, 'aria-label': t('sessions.title') }
          : { className: 'ss-table-scroll' },
        h(
          'table',
          { className: 'ss-table' },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              h('th', { scope: 'col' }, t('table.session')),
              h('th', { scope: 'col' }, t('table.created')),
              h('th', { scope: 'col', className: 'ss-num' }, t('table.requests')),
              h('th', { scope: 'col', className: 'ss-num' }, t('table.tokens')),
              h('th', { scope: 'col', className: 'ss-num' }, t('table.split')),
              h('th', { scope: 'col', className: 'ss-num' }, t('table.cost')),
              h('th', { scope: 'col', className: 'ss-num' }, t('table.logSize')),
            ),
          ),
          h('tbody', null, rows),
        ),
      )

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('sessions.title') },
        head,
        table,
        h(
          'div',
          { className: 'ss-table-foot' },
          h('p', { className: 'ss-table-note' }, t('sessions.showing', { shown: fmt.integer(shown.length), total: fmt.integer(sessions.length) })),
          canExpand
            ? h(
              SsButton,
              {
                name: 'more',
                size: 'sm',
                variant: 'secondary',
                expanded: false,
                onClick: () => setExpanded(true),
              },
              h('span', null, t('sessions.more')),
              h('span', { className: 'ss-more-arrow', 'aria-hidden': 'true' }, '\u2193'),
            )
            : null,
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * Section 4: model usage (window-scoped, colored like the trend).     *
     * ------------------------------------------------------------------ */

    function modelSparkline(row, t) {
      const values = row.dailyTokens
      const width = values.length > 1 ? values.length - 1 : 1
      return h(
        'svg',
        {
          className: 'ss-model-spark',
          viewBox: '0 0 ' + String(width) + ' 28',
          preserveAspectRatio: 'none',
          role: 'img',
          'aria-label': t('models.sparkline', { name: row.label }),
          focusable: 'false',
        },
        h('path', {
          className: 'ss-model-spark-line',
          d: polylinePath(values, 28),
          'data-series': String(row.slot),
          vectorEffect: 'non-scaling-stroke',
        }),
      )
    }

    function ModelsSection(props) {
      const t = props.t
      const fmt = props.fmt
      const view = props.modelView
      const days = props.days
      const head = h(
        'div',
        { className: 'ss-card-head' },
        h(
          'div',
          { className: 'ss-card-head-main' },
          h('h2', { className: 'ss-card-title' }, t('models.title')),
          h('p', { className: 'ss-card-sub' }, t('models.window', { days: days })),
        ),
      )

      if (!view.hasData || view.rows.length === 0) {
        return h('section', { className: 'ss-card', 'aria-label': t('models.title') }, head, h(SsEmptyState, { message: t('models.empty') }))
      }

      const rows = view.rows.map((row) => {
        const share = view.totalTokens > 0 ? clamp01(row.tokens / view.totalTokens) : 0
        const percent = clamp(share * 100, 0, 100)
        return h(
          'li',
          { className: 'ss-model', key: row.id },
          h('span', { className: 'ss-model-mark', 'data-series': String(row.slot), 'aria-hidden': 'true' }),
          h(
            'div',
            { className: 'ss-model-main' },
            h(
              'div',
              { className: 'ss-model-head' },
              h('span', { className: 'ss-model-name' }, row.label),
              h('span', { className: 'ss-model-share' }, t('models.share') + ' ' + fmt.ratio(share)),
            ),
            h(
              'div',
              { className: 'ss-model-meta' },
              h('span', null, t('table.requests') + ' ' + fmt.integer(row.requests)),
              h('span', null, t('table.tokens') + ' ' + fmt.compact(row.tokens)),
              h('span', null, t('table.cost') + ' ' + fmt.money(row.cost)),
            ),
            h(
              'div',
              {
                className: 'ss-share-bar',
                role: 'progressbar',
                'aria-label': t('models.shareTokens'),
                'aria-valuenow': Math.round(percent),
                'aria-valuemin': 0,
                'aria-valuemax': 100,
              },
              h('div', { className: 'ss-share-fill', 'data-series': String(row.slot), style: { width: percent + '%' } }),
            ),
          ),
          modelSparkline(row, t),
        )
      })

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('models.title') },
        head,
        h('ul', { className: 'ss-model-list' }, rows),
      )
    }

    /* ------------------------------------------------------------------ *
     * Section 5: runtime (CPU / memory / sparkline).                      *
     * ------------------------------------------------------------------ */

    function sparkPath(points, key) {
      const width = points.length - 1
      let path = ''
      let open = false
      for (let index = 0; index < points.length; index += 1) {
        const value = points[index][key]
        if (value === null) {
          open = false
          continue
        }
        const x = width <= 0 ? 0 : index
        const y = 100 - clamp(value, 0, 100)
        path += (open ? ' L ' : ' M ') + String(x) + ' ' + String(y)
        open = true
      }
      return path
    }

    function RuntimeSection(props) {
      const t = props.t
      const fmt = props.fmt
      const state = toObject(props.systemState)
      const data = state.data !== null && typeof state.data === 'object' ? state.data : null
      const cpu = data === null ? null : toObject(data.cpu)
      // A failed poll keeps the last payload (§7.10): show it with an inline
      // error bar instead of silently presenting stale numbers as current.
      const staleError = data !== null && state.error !== null && state.error !== undefined
      const errorBar = staleError
        ? h(SsErrorBar, { message: t('state.error'), actionLabel: t('state.retry'), onRetry: props.onRetry })
        : null

      const head = h('div', { className: 'ss-card-head' }, h('h2', { className: 'ss-card-title' }, t('runtime.title')))

      if (state.status === 'loading' || (data === null && state.status === 'ready')) {
        return h('section', { className: 'ss-card', 'aria-label': t('runtime.title') }, head, h(SectionSkeleton, null))
      }
      if (cpu === null || data === null) {
        return h(
          'section',
          { className: 'ss-card', 'aria-label': t('runtime.title') },
          head,
          errorBar,
          h(SsEmptyState, { message: t('runtime.unavailable') }),
        )
      }

      const processInfo = toObject(cpu.process)
      const systemInfo = toObject(cpu.system)
      const memory = toObject(cpu.memory)
      const processPercent = toNullableNumber(processInfo.percent)
      const systemPercent = toNullableNumber(systemInfo.percent)
      const uptimeSeconds = toNumber(cpu.uptimeSeconds)
      const cores = toNumber(systemInfo.cores)
      const load1 = toNumber(systemInfo.load1)
      const load5 = toNumber(systemInfo.load5)
      const load15 = toNumber(systemInfo.load15)
      const userMs = toNumber(processInfo.userMs)
      const systemMs = toNumber(processInfo.systemMs)

      const statRow = (label, value, note) =>
        h(
          'div',
          { className: 'ss-stat', key: label },
          h('dt', { className: 'ss-stat-label' }, label),
          h('dd', { className: 'ss-stat-value' }, value, note === undefined ? null : h('span', { className: 'ss-stat-note' }, note)),
        )

      const uptimeText =
        uptimeSeconds < 60
          ? fmt.integer(uptimeSeconds) + ' ' + t('unit.seconds')
          : fmt.uptime(uptimeSeconds)

      const stats = h(
        'dl',
        { className: 'ss-stats' },
        statRow(t('runtime.process'), processPercent === null ? DASH : fmt.percent(processPercent), fmt.integer(userMs) + ' ' + t('unit.ms') + ' + ' + fmt.integer(systemMs) + ' ' + t('unit.ms')),
        statRow(t('runtime.system'), systemPercent === null ? DASH : fmt.percent(systemPercent)),
        statRow(t('runtime.cores'), cores > 0 ? fmt.integer(cores) : DASH),
        statRow(t('runtime.load'), fmt.decimal(load1) + ' / ' + fmt.decimal(load5) + ' / ' + fmt.decimal(load15)),
        statRow(t('runtime.rss'), fmt.bytes(memory.rssBytes)),
        statRow(t('runtime.heap'), fmt.bytes(memory.heapUsedBytes) + ' / ' + fmt.bytes(memory.heapTotalBytes)),
        statRow(t('runtime.uptime'), uptimeText === '' ? DASH : uptimeText),
      )

      const history = toArray(cpu.history)
        .map((sample) => {
          const record = toObject(sample)
          return { process: toNullableNumber(record.process), system: toNullableNumber(record.system) }
        })
        .filter((sample) => sample.process !== null || sample.system !== null)

      const peak = history.reduce(
        (largest, sample) => Math.max(largest, sample.process === null ? 0 : sample.process, sample.system === null ? 0 : sample.system),
        0,
      )

      const sparkline =
        history.length >= 2
          ? h(
              'div',
              { className: 'ss-spark' },
              h(
                'svg',
                {
                  className: 'ss-spark-plot',
                  viewBox: '0 0 ' + String(history.length - 1) + ' 100',
                  preserveAspectRatio: 'none',
                  role: 'img',
                  'aria-label': t('runtime.sparkline'),
                },
                h('path', { className: 'ss-spark-process', d: sparkPath(history, 'process'), vectorEffect: 'non-scaling-stroke' }),
                h('path', { className: 'ss-spark-system', d: sparkPath(history, 'system'), vectorEffect: 'non-scaling-stroke' }),
              ),
              h(
                'div',
                { className: 'ss-spark-legend' },
                h(
                  'span',
                  { className: 'ss-legend-item' },
                  h('span', { className: 'ss-swatch ss-spark-swatch-process', 'aria-hidden': 'true' }),
                  t('runtime.process'),
                ),
                h(
                  'span',
                  { className: 'ss-legend-item' },
                  h('span', { className: 'ss-swatch ss-spark-swatch-system', 'aria-hidden': 'true' }),
                  t('runtime.system'),
                ),
                h('span', { className: 'ss-spark-peak' }, t('runtime.peak', { value: fmt.percent(peak) })),
              ),
            )
          : h(SsEmptyState, { message: t('runtime.noHistory') })

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('runtime.title') },
        head,
        errorBar,
        stats,
        h('h3', { className: 'ss-subhead' }, t('runtime.sparkline')),
        sparkline,
      )
    }

    /* ------------------------------------------------------------------ *
     * Section 6: log footprint.                                           *
     * ------------------------------------------------------------------ */

    function LogRow(props) {
      const fraction = props.fraction === undefined ? null : clamp01(toNumber(props.fraction))
      return h(
        'div',
        { className: 'ss-log-entry' },
        h(
          'div',
          { className: 'ss-log-row' },
          h('span', { className: 'ss-log-label' }, props.label),
          h(
            'span',
            { className: 'ss-log-value' },
            props.value,
            props.meta === undefined ? null : h('span', { className: 'ss-log-meta' }, props.meta),
          ),
        ),
        fraction === null
          ? null
          : h(
              'div',
              { className: 'ss-log-bar', role: 'presentation' },
              h('span', { className: 'ss-log-bar-fill', 'data-series': String(props.slot), style: { width: fraction * 100 + '%' } }),
            ),
      )
    }

    function LogsSection(props) {
      const t = props.t
      const fmt = props.fmt
      const state = toObject(props.systemState)
      const data = state.data !== null && typeof state.data === 'object' ? state.data : null
      const logs = data === null ? null : toObject(data.logs)
      const available = logs !== null && logs.available !== false
      // Keep the last payload visible when a poll fails, with an inline error bar (§7.10).
      const staleError = data !== null && state.error !== null && state.error !== undefined
      const errorBar = staleError
        ? h(SsErrorBar, { message: t('state.error'), actionLabel: t('state.retry'), onRetry: props.onRetry })
        : null

      const head = h(
        'div',
        { className: 'ss-card-head' },
        h('h2', { className: 'ss-card-title' }, t('logs.title')),
        available ? h(SsBadge, { name: 'chip', tone: 'success' }, t('logs.available')) : null,
      )

      if (state.status === 'loading' || (data === null && state.status === 'ready')) {
        return h('section', { className: 'ss-card', 'aria-label': t('logs.title') }, head, h(SectionSkeleton, null))
      }
      if (logs === null || !available) {
        return h(
          'section',
          { className: 'ss-card', 'aria-label': t('logs.title') },
          head,
          errorBar,
          h(SsEmptyState, { message: t('logs.unavailable') }),
        )
      }

      const sessionLog = toObject(logs.sessionLog)
      const storage = toObject(logs.storage)
      const attachments = toObject(logs.attachments)
      const spill = toObject(logs.spill)
      const home = toText(logs.home)
      const totalLogBytes = toNumber(logs.totalBytes)
      const fractionOf = (value) => (totalLogBytes > 0 ? toNumber(value) / totalLogBytes : 0)
      const largest = toArray(sessionLog.largest).map((entry) => {
        const record = toObject(entry)
        return {
          id: toText(record.id),
          title: toText(record.title),
          bytes: toNumber(record.bytes),
        }
      })
      const storageEntries = toArray(storage.entries).map((entry) => {
        const record = toObject(entry)
        return { name: toText(record.name), bytes: toNumber(record.bytes) }
      })

      const children = []
      if (home !== '') children.push(h('p', { key: 'home', className: 'ss-log-home' }, h('code', null, home)))
      children.push(h(LogRow, { key: 'total', label: t('logs.total'), value: fmt.bytes(logs.totalBytes) }))
      children.push(
        h(LogRow, {
          key: 'sessionLog',
          label: t('logs.sessionLog'),
          value: fmt.bytes(sessionLog.bytes),
          meta: t('logs.sessions') + ' ' + fmt.integer(sessionLog.count),
          fraction: fractionOf(sessionLog.bytes),
          slot: 1,
        }),
      )
      children.push(
        h(LogRow, {
          key: 'storage',
          label: t('logs.storage'),
          value: fmt.bytes(storage.bytes),
          fraction: fractionOf(storage.bytes),
          slot: 3,
        }),
      )
      if (storageEntries.length > 0) {
        children.push(
          h(
            'ul',
            { key: 'storageEntries', className: 'ss-log-list' },
            storageEntries.slice(0, 5).map((entry, index) =>
              h(
                'li',
                { key: entry.name + ':' + String(index) },
                h('span', { className: 'ss-log-name' }, entry.name === '' ? DASH : entry.name),
                h('span', { className: 'ss-log-bytes' }, fmt.bytes(entry.bytes)),
              ),
            ),
          ),
        )
      }
      children.push(
        h(LogRow, {
          key: 'attachments',
          label: t('logs.attachments'),
          value: fmt.bytes(attachments.bytes),
          fraction: fractionOf(attachments.bytes),
          slot: 4,
        }),
      )
      children.push(
        h(LogRow, {
          key: 'spill',
          label: t('logs.spill'),
          value: fmt.bytes(spill.bytes),
          fraction: fractionOf(spill.bytes),
          slot: 5,
        }),
      )
      if (largest.length > 0) {
        children.push(
          h(
            'div',
            { key: 'largest', className: 'ss-log-block' },
            h('p', { className: 'ss-log-label' }, t('logs.largest')),
            h(
              'ul',
              { className: 'ss-log-list' },
              largest.slice(0, 5).map((entry, index) =>
                h(
                  'li',
                  { key: entry.id + ':' + String(index) },
                  h('span', { className: 'ss-log-name' }, entry.title === '' ? t('table.untitled') : entry.title),
                  h('span', { className: 'ss-log-bytes' }, fmt.bytes(entry.bytes)),
                ),
              ),
            ),
          ),
        )
      }

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('logs.title') },
        head,
        errorBar,
        h('div', { className: 'ss-logs' }, children),
      )
    }

    /* ------------------------------------------------------------------ *
     * The page.                                                           *
     * ------------------------------------------------------------------ */

    function StatsPage(props) {
      const t = props.t
      const load = props.load
      const getLocaleTag = props.getLocaleTag
      const [refreshToken, setRefreshToken] = useState(0)
      const overviewState = usePolledResource(load, 'session-stats/overview?days=' + String(DAYS), OVERVIEW_POLL_MS, refreshToken)
      const systemState = usePolledResource(load, 'session-stats/system', SYSTEM_POLL_MS, refreshToken)

      const locale = typeof getLocaleTag === 'function' ? getLocaleTag() : DEFAULT_LOCALE
      const overview = overviewState.data !== null && typeof overviewState.data === 'object' ? overviewState.data : null
      const currency = overview !== null ? toText(overview.currency) : ''
      const fmt = useFormatters(locale, currency === '' ? 'USD' : currency)
      const modelView = useMemo(
        () => buildModelView(overview === null ? {} : overview, t),
        [overview, t],
      )
      const days = overview === null ? DAYS : (toNumber(overview.days) > 0 ? toNumber(overview.days) : DAYS)
      const refreshing = overviewState.refreshing === true
      const refresh = useCallback(() => {
        setRefreshToken((value) => value + 1)
      }, [])
      const sessionCount = overview === null ? 0 : toNumber(toObject(overview.totals).sessions)
      // The live region mirrors state changes only (§7.10); the timestamp would
      // re-announce the status region on every 10s poll.
      const liveText = overviewState.status === 'loading'
        ? t('state.loading')
        : overviewState.status === 'unauthorized'
          ? t('state.unauthorized')
          : overviewState.status === 'error'
            ? t('state.error')
            : overviewState.error !== null
              ? t('state.error')
              : sessionCount === 0
                ? t('state.empty')
                : ''

      const heading = h(
        'header',
        { className: 'ss-heading' },
        h(
          'div',
          { className: 'ss-heading-text' },
          h('h1', { className: 'ss-title' }, t('panel.title')),
        ),
        h(
          'div',
          { className: 'ss-heading-actions' },
          overviewState.updatedAt > 0
            ? h('span', { className: 'ss-updated' }, t('updated.at', { time: fmt.time(overviewState.updatedAt) }))
            : null,
          h(
            SsButton,
            {
              name: 'refresh',
              size: 'md',
              variant: 'secondary',
              label: t('action.refresh'),
              busy: refreshing,
              onClick: refresh,
            },
            h(RefreshGlyph, { spinning: refreshing }),
            h('span', null, t('action.refresh')),
          ),
        ),
      )

      let body
      if (overviewState.status === 'loading') {
        body = h(LoadingState, null)
      } else if (overviewState.status === 'unauthorized') {
        body = h(SsEmptyState, {
          tone: 'error',
          icon: AlertGlyph,
          roomy: true,
          role: 'alert',
          message: t('state.unauthorized'),
          actionLabel: t('state.retry'),
          onAction: refresh,
        })
      } else if (overviewState.status === 'error' || overview === null) {
        body = h(SsEmptyState, {
          tone: 'error',
          icon: AlertGlyph,
          roomy: true,
          role: 'alert',
          message: t('state.error'),
          actionLabel: t('state.retry'),
          onAction: refresh,
        })
      } else {
        const hasSessions = sessionCount > 0
        body = h(
          'div',
          { className: 'ss-sections' },
          overviewState.error === null
            ? null
            : h(SsErrorBar, { message: t('state.error'), actionLabel: t('state.retry'), onRetry: refresh }),
          hasSessions ? null : h(SsEmptyState, { message: t('state.empty') }),
          h(SummarySection, { overview: overview, fmt: fmt, t: t }),
          h(TrendSection, { overview: overview, fmt: fmt, t: t, modelView: modelView }),
          h(ModelsSection, { modelView: modelView, fmt: fmt, t: t, days: days }),
          h(SessionsSection, { overview: overview, fmt: fmt, t: t }),
          h(RuntimeSection, { systemState: systemState, fmt: fmt, t: t, onRetry: refresh }),
          h(LogsSection, { systemState: systemState, fmt: fmt, t: t, onRetry: refresh }),
        )
      }

      return h(
        'section',
        { className: 'ss-page', 'aria-label': t('panel.title') },
        h('p', { className: 'ss-live', role: 'status', 'aria-live': 'polite' }, liveText),
        h('div', { className: 'ss-scroll' }, h('div', { className: 'ss-content' }, heading, body)),
      )
    }

    /* ------------------------------------------------------------------ *
     * Registration. All side effects live inside apply and ctx.effect.    *
     * ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: zh, en: en }), 'session-stats: dictionaries')

        ctx.effect(() => {
          if (typeof document === 'undefined' || document === null) return () => {}
          const style = document.createElement('style')
          style.dataset.plugin = '@chengze/dsh-session-stats'
          style.textContent = CSS
          const head = document.head !== undefined && document.head !== null ? document.head : document.documentElement
          if (head === undefined || head === null) return () => {}
          head.appendChild(style)
          return () => {
            if (typeof style.remove === 'function') style.remove()
            else if (style.parentNode !== null && style.parentNode !== undefined) style.parentNode.removeChild(style)
          }
        }, 'session-stats: styles')

        const t = ctx.locale.bind(NS)
        const getLocaleTag = () => readLocaleTag(ctx)

        ctx.effect(
          () =>
            ctx.slots.inject('main', () =>
              ctx.slots.register(
                {
                  name: 'main',
                  key: PANEL_ID,
                  locale: NS,
                  inject: () => ({ t: t, load: fetchJson, getLocaleTag: getLocaleTag }),
                },
                StatsPage,
              ),
            ),
          'session-stats: main panel',
        )

        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.footer.action', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.footer.action',
                  id: PANEL_ID,
                  order: 10,
                  locale: NS,
                  label: () => t('panel.title'),
                  inject: () => ({
                    t: t,
                    openPanel: () => ctx.layout.selectPanel(PANEL_ID),
                    // `null` returns to the Conversation, so the same entry closes the panel.
                    togglePanel: (active) => ctx.layout.selectPanel(active ? null : PANEL_ID),
                  }),
                },
                FooterEntry,
              ),
            ),
          'session-stats: sidebar footer entry',
        )

        // Warm both payloads as soon as the panel's module is live: the first open
        // then paints from memory instead of waiting for the Host's first build.
        warmPayload('session-stats/overview?days=' + String(DAYS))
        warmPayload('session-stats/system')
      },
    }
  },
})
