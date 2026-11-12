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
      /** The list starts collapsed; every "more" press reveals another fixed batch. */
      const [visibleCount, setVisibleCount] = useState(MODELS_COLLAPSED_ROWS)
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

      // Preset or stale state may not be numeric; fall back to the collapsed batch.
      const shownCount = typeof visibleCount === 'number' && Number.isFinite(visibleCount)
        ? Math.min(Math.max(visibleCount, MODELS_COLLAPSED_ROWS), view.rows.length)
        : Math.min(MODELS_COLLAPSED_ROWS, view.rows.length)
      const shownRows = view.rows.slice(0, shownCount)
      const more = shownCount < view.rows.length
        ? h(
            'div',
            { className: 'ss-model-foot' },
            h(
              SsButton,
              {
                name: 'models-more',
                size: 'sm',
                variant: 'secondary',
                expanded: shownCount > MODELS_COLLAPSED_ROWS,
                onClick: () => setVisibleCount((count) => (
                  (typeof count === 'number' && Number.isFinite(count) ? count : MODELS_COLLAPSED_ROWS) + MODELS_COLLAPSED_ROWS
                )),
              },
              h('span', null, t('sessions.more')),
              h('span', { className: 'ss-more-arrow', 'aria-hidden': 'true' }, '\u2193'),
            ),
          )
        : null

      const rows = shownRows.map((row) => {
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
        more,
      )
    }

