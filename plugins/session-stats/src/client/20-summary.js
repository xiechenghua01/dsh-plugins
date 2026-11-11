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

