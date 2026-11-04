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
    const OVERVIEW_POLL_MS = 30000
    const SYSTEM_POLL_MS = 2000
    const TABLE_LIMIT = 50
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
      'summary.sessions': '会话数',
      'summary.sessionsHint': '进行中 {live} · 轮次 {turns}',
      'summary.cost': '估算成本',
      'summary.costHint': '共 {requests} 次请求',
      'summary.budget': '预算',
      'summary.budgetHint': '周期 {period}',
      'summary.remaining': '剩余 {amount}',
      'summary.noBudget': '未设置预算',
      'chart.title': 'Token 时间线（近 {days} 天）',
      'chart.empty': '该区间内没有 token 消耗',
      'chart.input': '输入',
      'chart.output': '输出',
      'chart.cacheRead': '缓存读取',
      'chart.legend': '图例',
      'chart.dayTip': '{date}：{tokens} token，{cost}',
      'sessions.title': '会话用量',
      'sessions.empty': '暂无会话记录',
      'sessions.showing': '显示 {shown} / {total} 个会话',
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
      'models.title': '模型分布',
      'models.empty': '暂无模型调用记录',
      'models.share': '占比',
      'runtime.title': '运行状态',
      'runtime.process': '进程 CPU',
      'runtime.system': '系统 CPU',
      'runtime.cores': '核心数',
      'runtime.load': '负载（1/5/15 分钟）',
      'runtime.rss': '常驻内存',
      'runtime.heap': '堆内存',
      'runtime.uptime': '运行时长',
      'runtime.sparkline': 'CPU 走势',
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
      'summary.sessions': 'Sessions',
      'summary.sessionsHint': 'Live {live} · Turns {turns}',
      'summary.cost': 'Estimated cost',
      'summary.costHint': '{requests} requests',
      'summary.budget': 'Budget',
      'summary.budgetHint': 'Period {period}',
      'summary.remaining': '{amount} remaining',
      'summary.noBudget': 'No budget set',
      'chart.title': 'Token timeline (last {days} days)',
      'chart.empty': 'No tokens used in this window',
      'chart.input': 'Input',
      'chart.output': 'Output',
      'chart.cacheRead': 'Cache read',
      'chart.legend': 'Legend',
      'chart.dayTip': '{date}: {tokens} tokens, {cost}',
      'sessions.title': 'Session usage',
      'sessions.empty': 'No sessions recorded',
      'sessions.showing': 'Showing {shown} of {total} sessions',
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
      'models.title': 'Model breakdown',
      'models.empty': 'No model calls recorded',
      'models.share': 'Share',
      'runtime.title': 'Runtime',
      'runtime.process': 'Process CPU',
      'runtime.system': 'System CPU',
      'runtime.cores': 'Cores',
      'runtime.load': 'Load (1/5/15 min)',
      'runtime.rss': 'Resident memory',
      'runtime.heap': 'Heap',
      'runtime.uptime': 'Uptime',
      'runtime.sparkline': 'CPU history',
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
.ss-chart{margin:4px 0 8px}
.ss-chart-plot{display:block;width:100%;height:140px}
.ss-chart-axis{stroke:var(--dsw-alias-border-l3);stroke-width:1}
.ss-bar-input{fill:var(--dsw-alias-brand-primary)}
.ss-bar-output{fill:var(--dsw-alias-state-success-primary)}
.ss-bar-cache{fill:var(--dsw-alias-state-business-primary)}
.ss-chart-labels{display:flex;justify-content:space-between;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-top:6px}
.ss-legend{display:flex;flex-wrap:wrap;gap:8px 16px;color:var(--dsw-alias-label-secondary);font-size:12px}
.ss-legend-item{display:inline-flex;align-items:center;gap:6px}
.ss-swatch{display:inline-block;width:10px;height:10px;border-radius:3px;flex:none}
.ss-swatch.ss-bar-input{background:var(--dsw-alias-brand-primary)}
.ss-swatch.ss-bar-output{background:var(--dsw-alias-state-success-primary)}
.ss-swatch.ss-bar-cache{background:var(--dsw-alias-state-business-primary)}
.ss-table-scroll{overflow-x:auto;margin:0 -6px}
.ss-table{width:100%;border-collapse:collapse;font-size:13px;line-height:20px}
.ss-table th{color:var(--dsw-alias-label-tertiary);font-weight:400;text-align:left;padding:6px;border-bottom:.5px solid var(--dsw-alias-border-l3);white-space:nowrap}
.ss-table td{padding:8px 6px;border-bottom:.5px solid var(--dsw-alias-border-l4);vertical-align:top}
.ss-table tbody tr:last-child td{border-bottom:0}
.ss-table tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ss-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ss-session-title{display:block;color:var(--dsw-alias-label-primary);font-weight:500;overflow-wrap:anywhere}
.ss-session-id{display:block;color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px;margin-top:2px;overflow-wrap:anywhere}
.ss-live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);margin-left:6px;vertical-align:middle}
.ss-split{color:var(--dsw-alias-label-secondary)}
.ss-segmented{display:inline-flex;gap:2px;padding:2px;border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.ss-segment{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
.ss-segment:hover{color:var(--dsw-alias-label-primary)}
.ss-segment-active{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.ss-sort-arrow{font-size:10px;line-height:1}
.ss-table-note{margin:8px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.ss-model-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}
.ss-model{display:flex;flex-direction:column;gap:6px;min-width:0}
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
.ss-spark-legend{display:flex;gap:16px;margin-top:6px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.ss-spark-swatch-process{background:var(--dsw-alias-brand-primary)}
.ss-spark-swatch-system{background:var(--dsw-alias-state-warn-primary)}
.ss-logs{display:flex;flex-direction:column;gap:10px}
.ss-log-row{display:flex;justify-content:space-between;gap:16px;align-items:baseline;border-bottom:.5px solid var(--dsw-alias-border-l4);padding-bottom:8px}
.ss-log-row:last-child{border-bottom:0;padding-bottom:0}
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
@media (max-width:720px){.ss-table th:nth-child(5),.ss-table td:nth-child(5){display:none}.ss-heading{align-items:flex-start}}
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
      const [state, setState] = useState({ status: 'loading', data: null, error: null, unauthorized: false, updatedAt: 0 })
      useEffect(() => {
        let stopped = false
        let controller = null
        const request = () => {
          if (controller !== null) controller.abort()
          const current = new AbortController()
          controller = current
          load(path, current.signal).then(
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
        request()
        const timer = setInterval(request, intervalMs)
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

      const tokensCard = h(SummaryCard, {
        key: 'tokens',
        label: t('summary.tokens'),
        value: fmt.compact(totalTokens(tokens)),
        unit: t('unit.tokens'),
        hint: t('summary.tokensHint', {
          input: fmt.compact(tokens.input),
          output: fmt.compact(tokens.output),
          cache: fmt.compact(tokens.cacheRead),
        }),
      })

      const sessionsCard = h(SummaryCard, {
        key: 'sessions',
        label: t('summary.sessions'),
        value: fmt.integer(totals.sessions),
        hint: t('summary.sessionsHint', {
          live: fmt.integer(totals.liveSessions),
          turns: fmt.integer(totals.turns),
        }),
      })

      const costCard = h(SummaryCard, {
        key: 'cost',
        label: t('summary.cost'),
        value: fmt.money(totals.cost),
        hint: t('summary.costHint', { requests: fmt.integer(totals.requests) }),
      })

      const budgetHint = t('summary.budgetHint', { period: period === '' ? DASH : period })
      const budgetCard = h(
        SummaryCard,
        {
          key: 'budget',
          label: t('summary.budget'),
          value: amount > 0 ? fmt.money(used) : t('summary.noBudget'),
          unit: amount > 0 ? ' / ' + fmt.money(amount) : undefined,
          hint: amount > 0 ? budgetHint : undefined,
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
              h('p', { key: 'remaining', className: 'ss-summary-hint' }, t('summary.remaining', { amount: fmt.money(remaining) })),
            ]
          : null,
      )

      return h('div', { className: 'ss-summary-grid' }, tokensCard, sessionsCard, costCard, budgetCard)
    }

    /* ------------------------------------------------------------------ *
     * Section 2: token timeline (pure SVG plot, HTML labels below).       *
     * ------------------------------------------------------------------ */

    const CHART_SLOT = 12
    const CHART_BAR = 8
    const CHART_HEIGHT = 120

    function bucketLabel(bucket, fmt) {
      if (bucket.start > 0) {
        const formatted = fmt.day(bucket.start)
        if (formatted !== '') return formatted
      }
      return bucket.key
    }

    function buildTimelineChart(buckets, maxStack, fmt, t) {
      const width = Math.max(CHART_SLOT, buckets.length * CHART_SLOT)
      const scale = (value) => (maxStack > 0 ? (value / maxStack) * (CHART_HEIGHT - 6) : 0)
      const groups = buckets.map((bucket, index) => {
        const x = index * CHART_SLOT + (CHART_SLOT - CHART_BAR) / 2
        let cursor = CHART_HEIGHT
        const segments = []
        const parts = [
          ['ss-bar-input', bucket.input],
          ['ss-bar-output', bucket.output],
          ['ss-bar-cache', bucket.cacheRead],
        ]
        for (const part of parts) {
          const height = scale(part[1])
          if (height <= 0) continue
          cursor -= height
          segments.push(h('rect', { key: part[0], className: part[0], x: x, y: cursor, width: CHART_BAR, height: height }))
        }
        return h(
          'g',
          { key: bucket.key + ':' + String(index) },
          h(
            'title',
            null,
            t('chart.dayTip', {
              date: bucket.start > 0 ? fmt.day(bucket.start) : bucket.key,
              tokens: fmt.compact(bucket.total),
              cost: fmt.money(bucket.cost),
            }),
          ),
          segments,
        )
      })

      const labels = []
      if (buckets.length > 0) {
        labels.push(h('span', { key: 'first' }, bucketLabel(buckets[0], fmt)))
        if (buckets.length > 2) {
          labels.push(h('span', { key: 'middle' }, bucketLabel(buckets[Math.floor((buckets.length - 1) / 2)], fmt)))
        }
        if (buckets.length > 1) {
          labels.push(h('span', { key: 'last' }, bucketLabel(buckets[buckets.length - 1], fmt)))
        }
      }

      return h(
        'div',
        { className: 'ss-chart' },
        h(
          'svg',
          {
            className: 'ss-chart-plot',
            viewBox: '0 0 ' + String(width) + ' ' + String(CHART_HEIGHT),
            preserveAspectRatio: 'none',
            role: 'img',
            'aria-label': t('chart.title', { days: DAYS }),
          },
          h('line', {
            className: 'ss-chart-axis',
            x1: 0,
            y1: CHART_HEIGHT - 0.5,
            x2: width,
            y2: CHART_HEIGHT - 0.5,
            vectorEffect: 'non-scaling-stroke',
          }),
          groups,
        ),
        h('div', { className: 'ss-chart-labels', 'aria-hidden': 'true' }, labels),
      )
    }

    function TimelineSection(props) {
      const t = props.t
      const fmt = props.fmt
      const overview = toObject(props.overview)
      const timeline = toObject(overview.timeline)
      const buckets = toArray(timeline.buckets).map((entry) => {
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
          stack: input + output + cacheRead,
          total: totalTokens(tokens),
          cost: toNumber(record.cost),
        }
      })
      const maxStack = buckets.reduce((max, bucket) => Math.max(max, bucket.stack), 0)
      const body =
        buckets.length === 0 || maxStack <= 0
          ? h('p', { className: 'ss-empty' }, t('chart.empty'))
          : buildTimelineChart(buckets, maxStack, fmt, t)

      const legend = h(
        'div',
        { className: 'ss-legend', role: 'list', 'aria-label': t('chart.legend') },
        h(
          'span',
          { className: 'ss-legend-item', role: 'listitem' },
          h('span', { className: 'ss-swatch ss-bar-input', 'aria-hidden': 'true' }),
          t('chart.input'),
        ),
        h(
          'span',
          { className: 'ss-legend-item', role: 'listitem' },
          h('span', { className: 'ss-swatch ss-bar-output', 'aria-hidden': 'true' }),
          t('chart.output'),
        ),
        h(
          'span',
          { className: 'ss-legend-item', role: 'listitem' },
          h('span', { className: 'ss-swatch ss-bar-cache', 'aria-hidden': 'true' }),
          t('chart.cacheRead'),
        ),
      )

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('chart.title', { days: DAYS }) },
        h('div', { className: 'ss-card-head' }, h('h2', { className: 'ss-card-title' }, t('chart.title', { days: DAYS }))),
        body,
        legend,
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
        live: record.live === true,
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

      const shown = sorted.slice(0, TABLE_LIMIT)

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

      const rows = shown.map((session) =>
        h(
          'tr',
          { key: session.id },
          h(
            'td',
            null,
            h('span', { className: 'ss-session-title' }, session.title === '' ? t('table.untitled') : session.title),
            session.live ? h('span', { className: 'ss-live-dot', 'aria-hidden': 'true' }) : null,
            h('span', { className: 'ss-session-id' }, shortSessionId(session.id)),
          ),
          h('td', null, fmt.date(session.createdAt)),
          h('td', { className: 'ss-num' }, fmt.integer(session.requests)),
          h('td', { className: 'ss-num' }, fmt.compact(session.total)),
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
        { className: 'ss-table-scroll' },
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
        h('p', { className: 'ss-table-note' }, t('sessions.showing', { shown: fmt.integer(shown.length), total: fmt.integer(sessions.length) })),
      )
    }

    /* ------------------------------------------------------------------ *
     * Section 4: model breakdown.                                         *
     * ------------------------------------------------------------------ */

    function ModelsSection(props) {
      const t = props.t
      const fmt = props.fmt
      const overview = toObject(props.overview)
      const totals = toObject(overview.totals)
      const models = toArray(overview.models).map((entry) => {
        const record = toObject(entry)
        return {
          provider: toText(record.provider),
          model: toText(record.model),
          requests: toNumber(record.requests),
          tokens: totalTokens(record.tokens),
          cost: toNumber(record.cost),
        }
      })
      const head = h('div', { className: 'ss-card-head' }, h('h2', { className: 'ss-card-title' }, t('models.title')))

      if (models.length === 0) {
        return h('section', { className: 'ss-card', 'aria-label': t('models.title') }, head, h('p', { className: 'ss-empty' }, t('models.empty')))
      }

      const totalCost = toNumber(totals.cost)
      const totalTokenCount = totalTokens(totals.tokens)

      const rows = models.map((model, index) => {
        const share = totalCost > 0 ? model.cost / totalCost : totalTokenCount > 0 ? model.tokens / totalTokenCount : 0
        const percent = clamp(share * 100, 0, 100)
        const name = model.provider === '' ? model.model : model.provider + '/' + model.model
        return h(
          'li',
          { className: 'ss-model', key: name + ':' + String(index) },
          h(
            'div',
            { className: 'ss-model-head' },
            h('span', { className: 'ss-model-name' }, name === '' ? DASH : name),
            h('span', { className: 'ss-model-share' }, fmt.ratio(share)),
          ),
          h(
            'div',
            { className: 'ss-model-meta' },
            h('span', null, t('table.requests') + ' ' + fmt.integer(model.requests)),
            h('span', null, t('table.tokens') + ' ' + fmt.compact(model.tokens)),
            h('span', null, t('table.cost') + ' ' + fmt.money(model.cost)),
          ),
          h(
            'div',
            {
              className: 'ss-share-bar',
              role: 'progressbar',
              'aria-label': t('models.share'),
              'aria-valuenow': Math.round(percent),
              'aria-valuemin': 0,
              'aria-valuemax': 100,
            },
            h('div', { className: 'ss-share-fill', style: { width: percent + '%' } }),
          ),
        )
      })

      return h('section', { className: 'ss-card', 'aria-label': t('models.title') }, head, h('ul', { className: 'ss-model-list' }, rows))
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
      return h(
        'div',
        { className: 'ss-log-row' },
        h('span', { className: 'ss-log-label' }, props.label),
        h(
          'span',
          { className: 'ss-log-value' },
          props.value,
          props.meta === undefined ? null : h('span', { className: 'ss-log-meta' }, props.meta),
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
        }),
      )
      children.push(h(LogRow, { key: 'storage', label: t('logs.storage'), value: fmt.bytes(storage.bytes) }))
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
      children.push(h(LogRow, { key: 'attachments', label: t('logs.attachments'), value: fmt.bytes(attachments.bytes) }))
      children.push(h(LogRow, { key: 'spill', label: t('logs.spill'), value: fmt.bytes(spill.bytes) }))
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
          h(TimelineSection, { overview: overview, fmt: fmt, t: t }),
          h(SessionsSection, { overview: overview, fmt: fmt, t: t }),
          h(ModelsSection, { overview: overview, fmt: fmt, t: t }),
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
      inject: ['slots', 'locale'],
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
            ctx.slots.inject('sidebar.panellist', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.panellist',
                  id: PANEL_ID,
                  order: 20,
                  locale: NS,
                  label: () => t('panel.title'),
                },
                StatsIcon,
              ),
            ),
          'session-stats: sidebar entry',
        )
      },
    }
  },
})
