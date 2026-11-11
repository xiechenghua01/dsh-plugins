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

