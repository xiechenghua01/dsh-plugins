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

