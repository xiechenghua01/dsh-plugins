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
              { className: 'ss-split' },
              fmt.compact(session.input) + ' / ' + fmt.compact(session.output) + ' / ' + fmt.compact(session.cacheRead),
            ),
            h(
              'span',
              { className: 'ss-row-bar', 'aria-hidden': 'true' },
              h('span', {
                className: 'ss-row-bar-fill',
                style: { width: (maxSessionTokens > 0 ? clamp01(session.total / maxSessionTokens) * 100 : 0) + '%' },
              }),
            ),
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

