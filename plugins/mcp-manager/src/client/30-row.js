    /* ------------------------------------------------------------------ *
     * Server row.                                                        *
     * ------------------------------------------------------------------ */

    function ToolBadge(props) {
      const tone = props.state === 'disabled' ? ' mm-tool-badge-disabled' : props.state === 'auto' ? ' mm-tool-badge-auto' : ''
      return h(
        'span',
        Object.assign({
          className: 'mm-tool-badge' + tone,
        }, tooltipHandlers(props.tip)),
        props.name,
      )
    }

    function ServerRow(props) {
      const t = props.t
      const row = props.row
      const enabled = row.disabled !== true
      const readOnly = row.readOnly === true
      const testing = props.testing === true || (props.testingAll === true && enabled)
      const status = statusOf(t, row, testing)
      const config = isObject(row.config) ? row.config : {}
      const transport = isObject(row.config) ? transportOf(row.config) : (textOf(row.transport) !== '' ? textOf(row.transport) : 'stdio')
      const target = textOf(row.target) !== '' ? textOf(row.target) : targetOfConfig(config)
      const count = toolCountOf(row)
      const names = toolNamesOf(row)
      const descriptions = toolDescriptionsOf(row)
      const lists = toolListsOf(row)
      const latency = latencyOf(row)
      const tone = latency === null ? null : latencyToneOf(latency, transport)
      const latencyLevelKey = tone === 'good'
        ? 'list.latencyLevelGood'
        : tone === 'fair' ? 'list.latencyLevelFair' : tone === 'poor' ? 'list.latencyLevelPoor' : ''
      const latencyTip = latency !== null && latencyLevelKey !== ''
        ? t('list.latencyTip', { ms: latency, level: t(latencyLevelKey) })
        : ''
      const blocked = props.busy === true || readOnly === true
      return h(
        'div',
        { className: 'mm-row' },
        h(
          'div',
          { className: 'mm-row-main' },
          h(
            'div',
            { className: 'mm-row-left' },
            h(
              'div',
              { className: 'mm-row-line1' },
              h('span', Object.assign({
                className: 'mm-dot mm-dot-' + status.tone + (status.pulse === true ? ' mm-dot-pulse' : ''),
                role: 'img',
                'aria-label': status.text,
              }, tooltipHandlers(status.text))),
              h('span', Object.assign({
                className: 'mm-name' + (enabled === true ? '' : ' mm-name-dim'),
              }, tooltipHandlers(target !== '' ? target : DASH)), row.serverName),
              h('span', { className: 'mm-chip mm-chip-mono' }, transport),
              readOnly === true
                ? h('span', Object.assign({ className: 'mm-chip mm-chip-warn' }, tooltipHandlers(t('list.readOnlyTip'))), t('list.readOnly'))
                : null,
              testing === true && enabled === true
                ? h('span', { className: 'mm-latency mm-latency-neutral' }, '…')
                : enabled === true && latency !== null && tone !== null
                  ? h(
                    'span',
                    Object.assign({
                      className: 'mm-latency mm-latency-' + tone,
                      'aria-label': latencyTip,
                    }, tooltipHandlers(latencyTip)),
                    t('list.latency', { ms: latency }),
                  )
                  : null,
              h(
                LinkButton,
                {
                  className: 'mm-tools-btn',
                  expanded: props.expanded === true,
                  tip: t('list.toolsTip'),
                  onClick: props.onToggleExpand,
                },
                h('span', null, t('list.tools', { count: count === null ? DASH : String(count) })),
                h(Svg, { d: ICON_CHEVRON, size: 12, className: 'mm-chevron' + (props.expanded === true ? ' mm-chevron-open' : '') }),
              ),
            ),
            h('div', { className: 'mm-summary' }, target !== '' ? target : DASH),
          ),
          h(RowActions, {
            t: t,
            row: row,
            enabled: enabled,
            disabled: blocked,
            onToggleEnabled: props.onToggleEnabled,
            onEdit: props.onEdit,
            onDelete: props.onDelete,
          }),
        ),
        props.expanded === true
          ? h(
            'div',
            { className: 'mm-expand' },
            names.length === 0
              ? h('span', { className: 'mm-muted' }, t('list.noTools'))
              : names.map((name) => {
                const isAuto = lists.auto.indexOf(name) !== -1
                const isDisabled = lists.disabled.indexOf(name) !== -1
                const description = descriptions[name] !== undefined ? descriptions[name] : ''
                const stateText = isDisabled ? t('tool.stateDisabled') : isAuto ? t('tool.stateAuto') : t('tool.stateDefault')
                const tip = (description !== '' ? description + ' · ' : '') + stateText
                return h(ToolBadge, {
                  key: name,
                  name: name,
                  state: isDisabled ? 'disabled' : isAuto ? 'auto' : 'default',
                  tip: tip,
                })
              }),
          )
          : null,
      )
    }
