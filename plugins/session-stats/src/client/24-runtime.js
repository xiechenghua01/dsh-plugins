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

