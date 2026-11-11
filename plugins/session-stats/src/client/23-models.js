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

