window.__ModuleLoader__.load({
  id: '@xiechenghua01/dsh-session-stats',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect
    const useMemo = React.useMemo
    const useCallback = React.useCallback

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
      'panel.description': '基于真实会话日志的 token 用量、成本估算与运行状态。',
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
      'chart.hint': '悬停查看每日明细，点击图例可隐藏或显示曲线',
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
      'panel.description': 'Token usage, estimated cost and runtime status from real session logs.',
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
      'chart.hint': 'Hover for a day breakdown; click a legend item to hide or show a line',
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
.ss-page{width:100%;min-width:0;height:100%;min-height:0;display:flex;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit);font-size:14px;line-height:1.6}
.ss-page{--ss-series-1:#4d93f8;--ss-series-2:#22c55e;--ss-series-3:#8b5cf6;--ss-series-4:#f59e0b;--ss-series-5:#ef4444;--ss-series-6:#06b6d4;--ss-series-7:#ec4899;--ss-series-8:#9aa0a6;--ss-session-row:56px;--ss-table-head:33px}
/* The eight --ss-series-* colors are data-visualization series colors, not theme
   surface colors: charts need several distinguishable hues in both color schemes. */
.ss-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
.ss-content{max-width:1040px;margin:0 auto;padding:0 clamp(24px,4vw,48px) 48px}
.ss-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding-top:28px;margin-bottom:24px}
[data-platform='darwin'] .ss-heading{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.ss-heading-text{min-width:0}
.ss-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.ss-subtitle{margin:4px 0 0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;overflow-wrap:anywhere}
.ss-heading-actions{display:flex;align-items:center;gap:12px;flex:none}
.ss-updated{color:var(--dsw-alias-label-tertiary);font-size:12px;white-space:nowrap}
.ss-stale{color:var(--dsw-alias-state-warn-primary);font-size:12px;white-space:nowrap}
.ss-refresh{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:background .15s,border-color .15s}
.ss-refresh:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l1)}
.ss-refresh:focus-visible,.ss-segment:focus-visible,.ss-state-action:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.ss-sections{display:flex;flex-direction:column;gap:20px}
.ss-notice{margin:0;padding:10px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:13px}
.ss-card{margin:0;padding:16px 18px;border:.5px solid var(--dsw-alias-border-l3);border-radius:16px;background:var(--dsw-alias-bg-layer-1);min-width:0}
.ss-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.ss-card-title{margin:0;font-size:14px;font-weight:500;line-height:22px;color:var(--dsw-alias-label-primary)}
.ss-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.ss-summary{display:flex;flex-direction:column;gap:6px;padding:14px 16px}
.ss-summary-label{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:20px}
.ss-summary-value{margin:0;font-size:20px;font-weight:500;line-height:28px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ss-summary-unit{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;margin-left:6px}
.ss-summary-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;overflow-wrap:anywhere}
.ss-progress{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin:4px 0}
.ss-progress-fill{height:100%;border-radius:3px;background:var(--dsw-alias-brand-primary);transition:width .3s ease}
.ss-tone-warn{background:var(--dsw-alias-state-warn-primary)}
.ss-tone-danger{background:var(--dsw-alias-state-error-primary)}
.ss-card-head-main{min-width:0}
.ss-card-sub{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.ss-legend{display:flex;flex-wrap:wrap;gap:4px 6px;color:var(--dsw-alias-label-secondary);font-size:12px;margin:0 0 10px}
.ss-legend-item{display:inline-flex;align-items:center;gap:6px}
.ss-swatch{display:inline-block;width:10px;height:10px;border-radius:3px;flex:none}
.ss-legend-button{max-width:240px;padding:3px 8px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:16px;cursor:pointer}
.ss-legend-button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ss-legend-button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.ss-legend-off{opacity:.45}
.ss-legend-dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex:none}
.ss-legend-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ss-trend{display:flex;flex-direction:column;gap:6px}
.ss-trend-body{display:flex;gap:10px;align-items:stretch}
.ss-yaxis{position:relative;flex:none;width:46px;height:200px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}
.ss-yaxis-label{position:absolute;right:0;white-space:nowrap}
.ss-plot-wrap{position:relative;flex:1;min-width:0;height:200px}
.ss-plot{display:block;width:100%;height:100%;overflow:visible}
.ss-grid-line{stroke:var(--dsw-alias-border-l4);stroke-width:1}
.ss-grid-base{stroke:var(--dsw-alias-border-l3)}
.ss-series-line{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ss-hits{position:absolute;inset:0;pointer-events:none}
.ss-hit{position:absolute;top:0;bottom:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;appearance:none;pointer-events:auto;cursor:crosshair}
.ss-hit:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px;border-radius:6px}
.ss-hit:focus-visible .ss-guide,.ss-hit:focus-visible .ss-dot,.ss-hit:focus-visible .ss-tip{opacity:1;visibility:visible}
.ss-guide{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed var(--dsw-alias-border-l2);opacity:0;transition:opacity .12s ease;pointer-events:none}
.ss-dot{position:absolute;width:7px;height:7px;border-radius:50%;transform:translate(-50%,-50%);opacity:0;transition:opacity .12s ease;box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-1);pointer-events:none}
.ss-hit:hover .ss-guide,.ss-hit:hover .ss-dot,.ss-hit:hover .ss-tip{opacity:1;visibility:visible}
.ss-tip{position:absolute;top:6px;min-width:170px;max-width:250px;padding:10px 12px;border-radius:12px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv2,none);color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;opacity:0;visibility:hidden;transition:opacity .12s ease;pointer-events:none;z-index:5}
.ss-tip-date{margin:0 0 4px;color:var(--dsw-alias-label-tertiary);font-size:11px}
.ss-tip-total{display:flex;justify-content:space-between;gap:12px;margin:0 0 6px;font-size:12px}
.ss-tip-total strong,.ss-tip-value{font-variant-numeric:tabular-nums}
.ss-tip-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}
.ss-tip-list li{display:flex;align-items:center;gap:6px;min-width:0}
.ss-tip-dot{display:inline-block;width:7px;height:7px;border-radius:50%;flex:none}
.ss-tip-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.ss-tip-value{white-space:nowrap}
.ss-tip-foot{margin:6px 0 0;padding-top:6px;border-top:.5px solid var(--dsw-alias-border-l4);color:var(--dsw-alias-label-tertiary);font-size:11px}
.ss-xaxis{position:relative;height:18px;margin-left:56px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}
.ss-xlabel{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.ss-xlabel-first{transform:translateX(0)}
.ss-xlabel-last{transform:translateX(-100%)}
.ss-chart-hint{margin:8px 0 0;color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}
.ss-mini-trend{display:block;width:100%;height:28px;margin-top:auto}
.ss-mini-area{fill-opacity:.14;stroke:none}
.ss-mini-line{fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.ss-num-main{display:block}
.ss-row-bar{display:block;height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);margin-top:4px;overflow:hidden}
.ss-row-bar-fill{display:block;height:100%;border-radius:2px;background:var(--ss-series-1)}
.ss-log-bar{display:block;height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);margin-top:4px;overflow:hidden}
.ss-log-bar-fill{display:block;height:100%;border-radius:2px}
.ss-table-scroll{overflow-x:auto;margin:0 -6px}
/* Expanded session table: a fixed ten-row window (SESSIONS_WINDOW_ROWS in the
   component), with a sticky header and its own vertical scrollbar. */
.ss-table-window{max-height:calc(var(--ss-session-row,56px) * 10 + var(--ss-table-head,33px));overflow-y:auto;scrollbar-gutter:stable;overscroll-behavior:contain}
.ss-table-window thead th{position:sticky;top:0;z-index:1;background:var(--dsw-alias-bg-layer-1)}
.ss-table-window tbody tr{height:var(--ss-session-row,56px)}
.ss-table-window tbody td{height:var(--ss-session-row,56px);padding-top:6px;padding-bottom:6px;vertical-align:middle}
.ss-table-window .ss-session-title{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.ss-table{width:100%;border-collapse:collapse;font-size:13px;line-height:20px}
.ss-table th{color:var(--dsw-alias-label-tertiary);font-weight:400;text-align:left;padding:6px;border-bottom:.5px solid var(--dsw-alias-border-l3);white-space:nowrap}
.ss-table td{padding:8px 6px;border-bottom:.5px solid var(--dsw-alias-border-l4);vertical-align:top}
.ss-table tbody tr:last-child td{border-bottom:0}
.ss-table tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ss-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ss-session-head{display:flex;align-items:flex-start;gap:5px;min-width:0}
.ss-session-title{display:block;flex:0 1 auto;min-width:0;color:var(--dsw-alias-label-primary);font-weight:500;overflow-wrap:anywhere}
.ss-session-id{display:block;color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px;margin-top:2px;overflow-wrap:anywhere}
/* Archived marker: a quiet warm chip at the title's top-right. */
.ss-archived-badge{flex:none;display:inline-block;margin-top:3px;padding:0 4px;border-radius:4px;font-size:10px;font-weight:500;line-height:14px;white-space:nowrap;color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-bg-layer-2);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);border:.5px solid transparent;border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 35%,transparent)}
.ss-split{color:var(--dsw-alias-label-secondary)}
.ss-segmented{display:inline-flex;gap:2px;padding:2px;border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.ss-segment{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
.ss-segment:hover{color:var(--dsw-alias-label-primary)}
.ss-segment-active{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.ss-sort-arrow{font-size:10px;line-height:1}
.ss-table-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:8px}
.ss-table-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.ss-more{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.ss-more:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}
.ss-more:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.ss-more-arrow{font-size:10px;line-height:1}
.ss-model-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.ss-model{display:grid;grid-template-columns:auto minmax(0,1fr) 96px;gap:10px;align-items:start;min-width:0}
.ss-model-mark{width:8px;height:8px;border-radius:50%;margin-top:7px}
.ss-model-main{display:flex;flex-direction:column;gap:5px;min-width:0}
.ss-model-spark{display:block;width:96px;height:28px;margin-top:3px;overflow:visible}
.ss-model-spark-line{fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
.ss-model-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.ss-model-name{font-size:13px;overflow-wrap:anywhere}
.ss-model-share{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.ss-model-meta{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.ss-share-bar{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.ss-share-fill{height:100%;border-radius:3px;background:var(--dsw-alias-state-business-primary)}
.ss-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px 20px;margin:0}
.ss-stat{min-width:0;margin:0}
.ss-stat-label{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.ss-stat-value{margin:0;font-size:15px;font-weight:500;line-height:22px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ss-stat-note{display:block;color:var(--dsw-alias-label-caption);font-size:11px;font-weight:400;line-height:16px}
.ss-subhead{margin:16px 0 6px;color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400}
.ss-spark-plot{display:block;width:100%;height:56px;background:var(--dsw-alias-bg-base);border-radius:8px;padding:2px}
.ss-spark-process{fill:none;stroke:var(--dsw-alias-brand-primary);stroke-width:1.5}
.ss-spark-system{fill:none;stroke:var(--dsw-alias-state-warn-primary);stroke-width:1.5}
.ss-spark-legend{display:flex;gap:16px;align-items:center;margin-top:6px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.ss-spark-peak{margin-left:auto;white-space:nowrap}
.ss-spark-swatch-process{background:var(--dsw-alias-brand-primary)}
.ss-spark-swatch-system{background:var(--dsw-alias-state-warn-primary)}
.ss-logs{display:flex;flex-direction:column;gap:10px}
.ss-log-entry{border-bottom:.5px solid var(--dsw-alias-border-l4);padding-bottom:8px}
.ss-log-entry:last-child{border-bottom:0;padding-bottom:0}
.ss-log-row{display:flex;justify-content:space-between;gap:16px;align-items:baseline}
.ss-log-label{color:var(--dsw-alias-label-tertiary);font-size:12px;flex:none}
.ss-log-value{font-variant-numeric:tabular-nums;font-size:13px;text-align:right;min-width:0;overflow-wrap:anywhere}
.ss-log-meta{color:var(--dsw-alias-label-caption);font-size:11px;display:block}
.ss-log-block{display:flex;flex-direction:column;gap:4px}
.ss-log-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.ss-log-list li{display:flex;justify-content:space-between;gap:12px;color:var(--dsw-alias-label-secondary);font-size:12px}
.ss-log-name{overflow-wrap:anywhere}
.ss-log-bytes{white-space:nowrap;font-variant-numeric:tabular-nums}
.ss-log-home{margin:0 0 10px;color:var(--dsw-alias-label-caption);font-size:11px;overflow-wrap:anywhere}
.ss-chip{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px}
.ss-state-wrap{display:flex;flex-direction:column;gap:16px}
.ss-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:48px 20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.ss-state-title{margin:0;font-size:14px;color:var(--dsw-alias-label-secondary)}
.ss-state-message{margin:0;font-size:12px}
.ss-state-action{height:32px;padding:0 14px;border-radius:16px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer}
.ss-state-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ss-skeleton-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.ss-skeleton{height:96px;border-radius:16px;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1);animation:ss-pulse 1.4s ease-in-out infinite}
@keyframes ss-pulse{0%,100%{opacity:.6}50%{opacity:1}}
.ss-empty{margin:0;padding:20px 0;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:13px}
.ss-icon{display:block}
.ss-icon-accent{fill:var(--dsw-alias-brand-primary);stroke:var(--dsw-alias-brand-primary)}
.ss-footer-entry{display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 10px;margin:0;border:0;border-radius:10px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:background .15s,color .15s}
.ss-footer-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-footer-entry:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}
.ss-footer-entry[data-collapsed="true"]{width:36px;padding:0;justify-content:center}
.ss-footer-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:720px){.ss-table th:nth-child(5),.ss-table td:nth-child(5){display:none}.ss-heading{align-items:flex-start}.ss-model{grid-template-columns:auto minmax(0,1fr)}.ss-model-spark{display:none}.ss-yaxis{width:38px}.ss-xaxis{margin-left:48px}.ss-plot-wrap,.ss-yaxis{height:170px}}
@media (prefers-reduced-motion:reduce){.ss-guide,.ss-dot,.ss-tip{transition:none}}
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

    function makeMoneyFormat(locale, currency) {
      try {
        return {
          format: new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          }),
          suffix: '',
        }
      } catch (error) {
        return {
          format: safeNumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
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
          return { status: 'ready', data: warm.data, error: null, unauthorized: false, updatedAt: warm.at }
        }
        return { status: 'loading', data: null, error: null, unauthorized: false, updatedAt: 0 }
      })
      useEffect(() => {
        let stopped = false
        let controller = null
        /** A manual refresh must bypass the Host response caches (`refresh=1`). */
        const request = (force) => {
          if (controller !== null) controller.abort()
          const current = new AbortController()
          controller = current
          const target = force ? path + (path.indexOf('?') === -1 ? '?' : '&') + 'refresh=1' : path
          load(target, current.signal).then(
            (data) => {
              if (stopped || current.signal.aborted) return
              if (controller === current) controller = null
              setState({ status: 'ready', data: data, error: null, unauthorized: false, updatedAt: Date.now() })
            },
            (error) => {
              if (stopped || current.signal.aborted) return
              if (controller === current) controller = null
              const unauthorized = error !== null && typeof error === 'object' && error.code === 'unauthorized'
              setState((previous) => {
                if (unauthorized) return { status: 'unauthorized', data: null, error: null, unauthorized: true, updatedAt: previous.updatedAt }
                if (previous.data !== null) return { status: 'ready', data: previous.data, error: error, unauthorized: false, updatedAt: previous.updatedAt }
                return { status: 'error', data: null, error: error, unauthorized: false, updatedAt: 0 }
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
     * Icons (bare SVG, currentColor, no wrapper element).                *
     * ------------------------------------------------------------------ */

    function StatsIcon(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const size = typeof source.size === 'number' && Number.isFinite(source.size) && source.size > 0 ? source.size : 18
      const active = source.active === true
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
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity: active ? 1 : 0.72,
          className: 'ss-icon',
        },
        h('rect', { x: 3.5, y: 13, width: 4, height: 7.5, rx: 1.2 }),
        h('rect', { x: 10, y: 9, width: 4, height: 11.5, rx: 1.2 }),
        h('rect', { x: 16.5, y: 4.5, width: 4, height: 16, rx: 1.2, className: 'ss-icon-accent' }),
      )
    }

    /**
     * Sidebar-foot entry (`sidebar.footer.action`), rendered directly above the
     * account menu at the bottom of the sidebar. The owner hands it only `wide`;
     * the panel title and the navigation callback come from the registration.
     */
    function FooterEntry(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const wide = source.wide === true
      const t = typeof source.t === 'function' ? source.t : (key) => key
      const openPanel = typeof source.openPanel === 'function' ? source.openPanel : () => {}
      return h(
        'button',
        {
          type: 'button',
          className: 'ss-footer-entry',
          'data-collapsed': wide ? 'false' : 'true',
          'aria-label': t('panel.title'),
          title: wide ? undefined : t('panel.title'),
          onClick: openPanel,
        },
        h(StatsIcon, { size: 18, active: false }),
        wide ? h('span', { className: 'ss-footer-label' }, t('panel.title')) : null,
      )
    }

    function RefreshGlyph() {
      return h(
        'svg',
        {
          width: 14,
          height: 14,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        h('path', { d: 'M20 12a8 8 0 1 1-2.34-5.66' }),
        h('path', { d: 'M20 4v5h-5' }),
      )
    }

    /* ------------------------------------------------------------------ *
     * Shared state surfaces.                                              *
     * ------------------------------------------------------------------ */

    function StatePanel(props) {
      return h(
        'div',
        { className: 'ss-state', role: props.role === undefined ? 'status' : props.role },
        h('p', { className: 'ss-state-title' }, props.title),
        props.message === undefined || props.message === null ? null : h('p', { className: 'ss-state-message' }, props.message),
        props.onAction === undefined
          ? null
          : h(
              'button',
              {
                type: 'button',
                className: 'ss-state-action',
                onClick: props.onAction,
                'aria-label': props.actionLabel,
              },
              props.actionLabel,
            ),
      )
    }

    function SkeletonGrid() {
      return h(
        'div',
        { className: 'ss-skeleton-grid', 'aria-hidden': 'true' },
        [0, 1, 2, 3].map((index) => h('div', { key: index, className: 'ss-skeleton' })),
      )
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
      const tokenSpark = miniTrend(dailyBuckets.map((bucket) => bucket.total), seriesColor(0), t('summary.tokensSpark'))
      const costSpark = miniTrend(dailyBuckets.map((bucket) => bucket.cost), seriesColor(2), t('summary.costSpark'))

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
        ? budgetHint + ' · ' + t('summary.budgetDynamic', { average: fmt.money(dailyAverage) })
        : budgetHint
      const budgetCard = h(
        SummaryCard,
        {
          key: 'budget',
          label: t('summary.budget'),
          value: amount > 0 ? fmt.money(amount) : t('summary.noBudget'),
          hint: amount > 0
            ? t('summary.budgetUsedRemaining', { used: fmt.money(used), remaining: fmt.money(remaining) })
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

    /** Chart series colors, defined as --ss-series-N on .ss-page. */
    const SERIES_SLOTS = 6
    const SERIES_OTHER = 'var(--ss-series-8)'

    function seriesColor(index) {
      return 'var(--ss-series-' + String(index + 1) + ')'
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
    function miniTrend(values, color, label) {
      if (values.length < 2) return null
      const width = values.length - 1
      const line = polylinePath(values, 28)
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
        h('path', { className: 'ss-mini-area', d: line + ' L ' + String(width) + ' 28 L 0 28 Z', style: { fill: color } }),
        h('path', { className: 'ss-mini-line', d: line, style: { stroke: color }, vectorEffect: 'non-scaling-stroke' }),
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
        color: seriesColor(index),
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
          color: SERIES_OTHER,
          tokens: Math.max(0, windowTokens - topTokens),
          cost: Math.max(0, windowCost - topCost),
          requests: Math.max(0, windowRequests - topRequests),
          dailyTokens: otherDaily,
          isOther: true,
        })
      }
      return {
        rows: rows,
        series: rows.map((row) => ({ id: row.id, label: row.label, color: row.color, values: row.dailyTokens })),
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
        { id: 'type:input', label: t('chart.input'), color: seriesColor(0), values: values('input') },
        { id: 'type:output', label: t('chart.output'), color: seriesColor(1), values: values('output') },
        { id: 'type:cache', label: t('chart.cacheRead'), color: seriesColor(2), values: values('cacheRead') },
      ]
    }

    function TrendLegend(props) {
      const t = props.t
      return h(
        'div',
        { className: 'ss-legend ss-trend-legend', role: 'group', 'aria-label': t('chart.legend') },
        props.series.map((entry) => {
          const hidden = props.hidden.indexOf(entry.id) !== -1
          return h(
            'button',
            {
              key: entry.id,
              type: 'button',
              className: 'ss-legend-item ss-legend-button' + (hidden ? ' ss-legend-off' : ''),
              'aria-pressed': !hidden,
              title: entry.label,
              onClick: () => props.onToggle(entry.id),
            },
            h('span', { className: 'ss-legend-dot', style: { background: entry.color }, 'aria-hidden': 'true' }),
            h('span', { className: 'ss-legend-text' }, entry.label),
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
          style: { stroke: entry.color },
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
          'aria-hidden': 'true',
          style: { left: offset + '%', top: yPercent(entry.values[index]) + '%', background: entry.color },
        }))
        const positive = series.filter((entry) => entry.values[index] > 0)
        const tipRows = positive.map((entry) => h(
          'li',
          { key: 'tip:' + entry.id },
          h('span', { className: 'ss-tip-dot', style: { background: entry.color }, 'aria-hidden': 'true' }),
          h('span', { className: 'ss-tip-name' }, entry.label),
          h('strong', { className: 'ss-tip-value' }, fmt.compact(entry.values[index])),
        ))
        const hitLabel = bucketLabel(bucket, fmt)
          + ' ' + t('chart.total') + ' ' + fmt.compact(bucket.total)
          + (positive.length === 0
            ? ''
            : ' · ' + positive.map((entry) => entry.label + ' ' + fmt.compact(entry.values[index])).join(' · '))
        return h(
          'button',
          {
            key: 'hit:' + (bucket.key === '' ? String(index) : bucket.key),
            type: 'button',
            className: 'ss-hit',
            tabIndex: bucket.total > 0 ? 0 : -1,
            'aria-label': hitLabel,
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
                ? { right: (100 - offset) + '%', marginRight: '12px' }
                : { left: offset + '%', marginLeft: '12px' },
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
        h(
          'div',
          { className: 'ss-segmented', role: 'group', 'aria-label': t('chart.title') },
          h(
            'button',
            {
              type: 'button',
              className: 'ss-segment' + (mode === 'model' ? ' ss-segment-active' : ''),
              'aria-pressed': mode === 'model',
              onClick: () => setMode('model'),
            },
            t('chart.modeModel'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'ss-segment' + (mode === 'type' ? ' ss-segment-active' : ''),
              'aria-pressed': mode === 'type',
              onClick: () => setMode('type'),
            },
            t('chart.modeType'),
          ),
        ),
      )

      let body
      if (!hasData) body = h('p', { className: 'ss-empty' }, t('chart.empty'))
      else if (visible.length === 0) body = h('p', { className: 'ss-empty' }, t('chart.allHidden'))
      else body = h(TrendPlot, { t: t, fmt: fmt, buckets: buckets, series: visible, yMax: yMax, mode: mode, days: days })

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('chart.title') },
        head,
        h(TrendLegend, { series: allSeries, hidden: hidden, t: t, onToggle: toggleSeries }),
        body,
        h('p', { className: 'ss-chart-hint' }, t('chart.hint')),
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
      const controls = h(
        'div',
        { className: 'ss-segmented', role: 'group', 'aria-label': t('sessions.title') },
        sortOptions.map((option) => {
          const active = sortKey === option[0]
          return h(
            'button',
            {
              key: option[0],
              type: 'button',
              className: 'ss-segment' + (active ? ' ss-segment-active' : ''),
              'aria-pressed': active,
              onClick: () => {
                if (active) setDescending((value) => !value)
                else {
                  setSortKey(option[0])
                  setDescending(true)
                }
              },
            },
            t(option[1]),
            active ? h('span', { className: 'ss-sort-arrow', 'aria-hidden': 'true' }, descending ? '\u2193' : '\u2191') : null,
          )
        }),
      )

      const head = h(
        'div',
        { className: 'ss-card-head' },
        h('h2', { className: 'ss-card-title' }, t('sessions.title')),
        controls,
      )

      if (sessions.length === 0) {
        return h('section', { className: 'ss-card', 'aria-label': t('sessions.title') }, head, h('p', { className: 'ss-empty' }, t('sessions.empty')))
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
              session.archived ? h('span', { className: 'ss-archived-badge' }, t('sessions.archived')) : null,
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
              'button',
              {
                type: 'button',
                className: 'ss-more',
                'aria-expanded': false,
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
          style: { stroke: row.color },
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
        return h('section', { className: 'ss-card', 'aria-label': t('models.title') }, head, h('p', { className: 'ss-empty' }, t('models.empty')))
      }

      const rows = view.rows.map((row) => {
        const share = view.totalTokens > 0 ? clamp01(row.tokens / view.totalTokens) : 0
        const percent = clamp(share * 100, 0, 100)
        return h(
          'li',
          { className: 'ss-model', key: row.id },
          h('span', { className: 'ss-model-mark', style: { background: row.color }, 'aria-hidden': 'true' }),
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
              h('div', { className: 'ss-share-fill', style: { width: percent + '%', background: row.color } }),
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

      const head = h('div', { className: 'ss-card-head' }, h('h2', { className: 'ss-card-title' }, t('runtime.title')))

      if (state.status === 'loading' || (data === null && state.status === 'ready')) {
        return h('section', { className: 'ss-card', 'aria-label': t('runtime.title') }, head, h('p', { className: 'ss-empty' }, t('state.loading')))
      }
      if (cpu === null || data === null) {
        return h('section', { className: 'ss-card', 'aria-label': t('runtime.title') }, head, h('p', { className: 'ss-empty' }, t('runtime.unavailable')))
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
          : h('p', { className: 'ss-empty' }, t('state.loading'))

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('runtime.title') },
        head,
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
              h('span', { className: 'ss-log-bar-fill', style: { width: fraction * 100 + '%', background: props.color } }),
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

      const head = h(
        'div',
        { className: 'ss-card-head' },
        h('h2', { className: 'ss-card-title' }, t('logs.title')),
        available ? h('span', { className: 'ss-chip' }, t('logs.available')) : null,
      )

      if (state.status === 'loading' || (data === null && state.status === 'ready')) {
        return h('section', { className: 'ss-card', 'aria-label': t('logs.title') }, head, h('p', { className: 'ss-empty' }, t('state.loading')))
      }
      if (logs === null || !available) {
        return h('section', { className: 'ss-card', 'aria-label': t('logs.title') }, head, h('p', { className: 'ss-empty' }, t('logs.unavailable')))
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
          color: seriesColor(0),
        }),
      )
      children.push(
        h(LogRow, {
          key: 'storage',
          label: t('logs.storage'),
          value: fmt.bytes(storage.bytes),
          fraction: fractionOf(storage.bytes),
          color: seriesColor(2),
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
          color: seriesColor(3),
        }),
      )
      children.push(
        h(LogRow, {
          key: 'spill',
          label: t('logs.spill'),
          value: fmt.bytes(spill.bytes),
          fraction: fractionOf(spill.bytes),
          color: seriesColor(4),
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

      return h('section', { className: 'ss-card', 'aria-label': t('logs.title') }, head, h('div', { className: 'ss-logs' }, children))
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
      const refresh = useCallback(() => {
        setRefreshToken((value) => value + 1)
      }, [])

      const heading = h(
        'header',
        { className: 'ss-heading' },
        h(
          'div',
          { className: 'ss-heading-text' },
          h('h1', { className: 'ss-title' }, t('panel.title')),
          h('p', { className: 'ss-subtitle' }, t('panel.description')),
        ),
        h(
          'div',
          { className: 'ss-heading-actions' },
          overviewState.updatedAt > 0
            ? h('span', { className: 'ss-updated' }, t('updated.at', { time: fmt.time(overviewState.updatedAt) }))
            : null,
          overviewState.error !== null ? h('span', { className: 'ss-stale' }, t('state.error')) : null,
          h(
            'button',
            { type: 'button', className: 'ss-refresh', onClick: refresh, 'aria-label': t('action.refresh') },
            h(RefreshGlyph, null),
            h('span', null, t('action.refresh')),
          ),
        ),
      )

      let body
      if (overviewState.status === 'loading') {
        body = h('div', { className: 'ss-state-wrap' }, h(StatePanel, { title: t('state.loading') }), h(SkeletonGrid, null))
      } else if (overviewState.status === 'unauthorized') {
        body = h(StatePanel, { title: t('state.unauthorized'), role: 'alert', actionLabel: t('state.retry'), onAction: refresh })
      } else if (overviewState.status === 'error' || overview === null) {
        body = h(StatePanel, { title: t('state.error'), role: 'alert', actionLabel: t('state.retry'), onAction: refresh })
      } else {
        const totals = toObject(overview.totals)
        const hasSessions = toNumber(totals.sessions) > 0
        body = h(
          'div',
          { className: 'ss-sections' },
          hasSessions ? null : h('p', { className: 'ss-notice' }, t('state.empty')),
          h(SummarySection, { overview: overview, fmt: fmt, t: t }),
          h(TrendSection, { overview: overview, fmt: fmt, t: t, modelView: modelView }),
          h(ModelsSection, { modelView: modelView, fmt: fmt, t: t, days: days }),
          h(SessionsSection, { overview: overview, fmt: fmt, t: t }),
          h(RuntimeSection, { systemState: systemState, fmt: fmt, t: t }),
          h(LogsSection, { systemState: systemState, fmt: fmt, t: t }),
        )
      }

      return h(
        'section',
        { className: 'ss-page', 'aria-label': t('panel.title') },
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
          style.dataset.plugin = '@xiechenghua01/dsh-session-stats'
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
