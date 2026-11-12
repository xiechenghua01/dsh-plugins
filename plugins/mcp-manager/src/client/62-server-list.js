    /* ------------------------------------------------------------------ *
     * Server list: four states + filtered rows.                          *
     * ------------------------------------------------------------------ */

    function SkeletonList(props) {
      return h(
        'div',
        { className: 'mm-list', role: 'status', 'aria-busy': 'true', 'aria-label': props.label },
        [0, 1, 2].map((index) => h(
          'div',
          { key: index, className: 'mm-skeleton-row' },
          h('span', { className: 'mm-skeleton-line mm-skeleton-name' }),
          h('span', { className: 'mm-skeleton-line mm-skeleton-summary' }),
        )),
      )
    }

    function filterRows(rows, query) {
      const needle = textOf(query).trim().toLowerCase()
      if (needle === '') return rows
      return rows.filter((row) => {
        const config = isObject(row.config) ? row.config : {}
        const target = textOf(row.target) !== '' ? textOf(row.target) : targetOfConfig(config)
        const transport = isObject(row.config) ? transportOf(row.config) : textOf(row.transport)
        const haystack = [textOf(row.serverName), target, textOf(row.id), transport].join(' ').toLowerCase()
        return haystack.includes(needle)
      })
    }

    function ServerList(props) {
      const t = props.t
      const rows = Array.isArray(props.rows) ? props.rows : []
      const filteredRows = filterRows(rows, props.query)
      const [expanded, setExpanded] = useState({})
      // 首载骨架 >300ms 才显示，避免快速返回时闪一下（根 DESIGN.md §7.10）。
      const [skeletonReady, setSkeletonReady] = useState(false)
      useEffect(() => {
        if (props.loading !== true || props.hasData === true) {
          setSkeletonReady(false)
          return undefined
        }
        const timer = setTimeout(() => setSkeletonReady(true), 300)
        return () => clearTimeout(timer)
      }, [props.loading, props.hasData])
      function toggleExpanded(row) {
        setExpanded((prev) => {
          const next = Object.assign({}, prev)
          if (next[row.id] === true) delete next[row.id]
          else next[row.id] = true
          return next
        })
      }
      let content
      if (props.unauthorized === true) {
        content = h(StatePanel, { title: t('page.unauthorized'), actionLabel: t('page.retry'), onAction: props.onRetry })
      } else if (props.error !== null && props.error !== undefined && props.hasData !== true) {
        content = h(StatePanel, { title: t('page.error'), hint: props.error, actionLabel: t('page.retry'), onAction: props.onRetry })
      } else if (props.loading === true && props.hasData !== true) {
        content = skeletonReady === true ? h(SkeletonList, { label: t('page.loading') }) : null
      } else if (filteredRows.length === 0) {
        content = h(StatePanel, { icon: ICON_PLUG, title: t('list.empty') })
      } else {
        content = h(
          'div',
          { className: 'mm-list' },
          filteredRows.map((row) => h(ServerRow, {
            key: textOf(row.level) + ':' + textOf(row.id),
            t: t,
            row: row,
            busy: props.busy === true,
            testingAll: props.testingAll === true,
            expanded: expanded[row.id] === true,
            onToggleExpand: () => toggleExpanded(row),
            onToggleEnabled: props.onToggleEnabled,
            onEdit: props.onEdit,
            onDelete: props.onDelete,
          })),
        )
      }
      return content
    }
