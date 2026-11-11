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
      const probe = isObject(row.lastProbe) ? row.lastProbe : null
      const latency = isObject(probe) && probe.ok === true && typeof probe.durationMs === 'number' && Number.isFinite(probe.durationMs)
        ? Math.round(probe.durationMs)
        : null
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
              enabled === true && latency !== null
                ? h('span', { className: 'mm-latency' }, t('list.latency', { ms: latency }))
                : null,
              h(
                'button',
                Object.assign({
                  type: 'button',
                  className: 'mm-tools-btn',
                  'aria-expanded': props.expanded === true ? 'true' : 'false',
                  onClick: props.onToggleExpand,
                }, tooltipHandlers(t('list.toolsTip'))),
                h('span', null, t('list.tools', { count: count === null ? DASH : String(count) })),
                h(Svg, { d: ICON_CHEVRON, size: 12, className: 'mm-chevron' + (props.expanded === true ? ' mm-chevron-open' : '') }),
              ),
            ),
            h('div', { className: 'mm-summary' }, target !== '' ? target : DASH),
          ),
          h(
            'div',
            { className: 'mm-actions' },
            h(IconButton, {
              icon: ICON_POWER,
              label: enabled === true ? t('action.toggleDisable') : t('action.toggleEnable'),
              tooltip: enabled === true ? t('action.toggleDisable') : t('action.toggleEnable'),
              tone: enabled === true ? 'ok' : '',
              disabled: blocked,
              onClick: () => {
                if (typeof props.onToggleEnabled === 'function') props.onToggleEnabled(row)
              },
            }),
            h(IconButton, {
              icon: ICON_EDIT,
              label: t('action.edit'),
              tooltip: t('action.edit'),
              disabled: blocked,
              onClick: () => {
                if (typeof props.onEdit === 'function') props.onEdit(row)
              },
            }),
            h(IconButton, {
              icon: ICON_TRASH,
              label: t('action.delete'),
              tooltip: t('action.delete'),
              tone: 'danger',
              disabled: blocked,
              onClick: () => {
                if (typeof props.onDelete === 'function') props.onDelete(row)
              },
            }),
          ),
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

