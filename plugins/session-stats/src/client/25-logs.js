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
              h('span', { className: 'ss-log-bar-fill', 'data-series': String(props.slot), style: { width: fraction * 100 + '%' } }),
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
      // Keep the last payload visible when a poll fails, with an inline error bar (§7.10).
      const staleError = data !== null && state.error !== null && state.error !== undefined
      const errorBar = staleError
        ? h(SsErrorBar, { message: t('state.error'), actionLabel: t('state.retry'), onRetry: props.onRetry })
        : null

      const head = h(
        'div',
        { className: 'ss-card-head' },
        h('h2', { className: 'ss-card-title' }, t('logs.title')),
        available ? h(SsBadge, { name: 'chip', tone: 'success' }, t('logs.available')) : null,
      )

      if (state.status === 'loading' || (data === null && state.status === 'ready')) {
        return h('section', { className: 'ss-card', 'aria-label': t('logs.title') }, head, h(SectionSkeleton, null))
      }
      if (logs === null || !available) {
        return h(
          'section',
          { className: 'ss-card', 'aria-label': t('logs.title') },
          head,
          errorBar,
          h(SsEmptyState, { message: t('logs.unavailable') }),
        )
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
          slot: 1,
        }),
      )
      children.push(
        h(LogRow, {
          key: 'storage',
          label: t('logs.storage'),
          value: fmt.bytes(storage.bytes),
          fraction: fractionOf(storage.bytes),
          slot: 3,
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
          slot: 4,
        }),
      )
      children.push(
        h(LogRow, {
          key: 'spill',
          label: t('logs.spill'),
          value: fmt.bytes(spill.bytes),
          fraction: fractionOf(spill.bytes),
          slot: 5,
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

      return h(
        'section',
        { className: 'ss-card', 'aria-label': t('logs.title') },
        head,
        errorBar,
        h('div', { className: 'ss-logs' }, children),
      )
    }

