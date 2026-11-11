    /* ------------------------------------------------------------------ *
     * Editor advanced view: tuning fields and tool permissions.          *
     * ------------------------------------------------------------------ */

    function toolStatusOf(t, probeState) {
      const statusClass = probeState.phase === 'ok'
        ? ' mm-tools-status-ok'
        : probeState.phase === 'error'
          ? ' mm-tools-status-err'
          : probeState.phase === 'probing' ? ' mm-tools-status-warn' : ''
      const statusText = probeState.phase === 'probing'
        ? t('editor.toolsProbing')
        : probeState.message !== '' ? probeState.message : t('editor.toolsIdle')
      return { statusClass: statusClass, statusText: statusText }
    }

    function EditorTimeoutRetries(props) {
      const t = props.t
      return h(
        Fragment,
        null,
        h(EditorInputField, {
          label: t('editor.timeout'),
          tip: t('editor.timeoutTip'),
          small: true,
          className: 'mm-input mm-mono',
          type: 'number',
          value: props.draft.timeoutText,
          placeholder: t('editor.timeoutPlaceholder'),
          min: 1000,
          max: 3600000,
          step: 1000,
          onChange: (event) => props.setField('timeoutText', event.target.value),
        }),
        h(EditorInputField, {
          label: t('editor.retries'),
          tip: t('editor.retriesTip'),
          small: true,
          className: 'mm-input mm-mono',
          type: 'number',
          value: props.draft.retriesText,
          placeholder: t('editor.retriesPlaceholder'),
          min: 1,
          max: 1000,
          step: 1,
          onChange: (event) => props.setField('retriesText', event.target.value),
        }),
      )
    }

    function EditorStdioAdvancedFields(props) {
      const t = props.t
      return h(
        'div',
        { className: 'mm-adv-grid' },
        h(EditorInputField, {
          label: t('editor.cwd'),
          tip: t('editor.cwdTip'),
          small: true,
          className: 'mm-input mm-mono',
          value: props.draft.cwd,
          placeholder: t('editor.cwdPlaceholder'),
          spellCheck: false,
          onChange: (event) => props.setField('cwd', event.target.value),
        }),
        h(EditorTimeoutRetries, { t: t, draft: props.draft, setField: props.setField }),
      )
    }

    function EditorRemoteAdvancedFields(props) {
      const t = props.t
      return h(
        Fragment,
        null,
        h(
          'div',
          { className: 'mm-adv-grid mm-adv-grid-2' },
          h(EditorTimeoutRetries, { t: t, draft: props.draft, setField: props.setField }),
        ),
        h(
          'div',
          { className: 'mm-adv-grid mm-adv-grid-2' },
          h(EditorInputField, {
            label: t('editor.oauthClientId'),
            tip: t('editor.oauthClientIdTip'),
            small: true,
            className: 'mm-input mm-mono',
            value: props.draft.oauthClientId,
            placeholder: t('editor.oauthClientIdPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('oauthClientId', event.target.value),
          }),
          h(EditorInputField, {
            label: t('editor.oauthScopes'),
            tip: t('editor.oauthScopesTip'),
            small: true,
            className: 'mm-input mm-mono',
            value: props.draft.oauthScopes,
            placeholder: t('editor.oauthScopesPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('oauthScopes', event.target.value),
          }),
        ),
      )
    }

    function EditorAdvancedFields(props) {
      return props.draft.transport === 'stdio'
        ? h(EditorStdioAdvancedFields, { t: props.t, draft: props.draft, setField: props.setField })
        : h(EditorRemoteAdvancedFields, { t: props.t, draft: props.draft, setField: props.setField })
    }

    function EditorToolRow(props) {
      const t = props.t
      const current = props.policy[props.tool.name] !== undefined ? props.policy[props.tool.name] : 'default'
      const nameClass = current === 'auto' ? ' mm-tool-name-auto' : current === 'disabled' ? ' mm-tool-name-disabled' : ''
      return h(
        'div',
        { className: 'mm-tool-row' },
        h(
          'div',
          { className: 'mm-tool-info' },
          h('span', { className: 'mm-tool-name' + nameClass }, props.tool.name),
          props.tool.description !== '' ? h('span', { className: 'mm-tool-desc' }, props.tool.description) : null,
        ),
        h(Segmented, {
          value: current,
          onChange: (value) => props.onPolicyChange(props.tool.name, value),
          items: [
            { value: 'default', label: t('tool.default'), tip: t('tool.defaultTip') },
            { value: 'auto', label: t('tool.auto'), tip: t('tool.autoTip') },
            { value: 'disabled', label: t('tool.disabled'), tip: t('tool.disabledTip') },
          ],
        }),
      )
    }

    function EditorToolsHead(props) {
      const t = props.t
      const status = toolStatusOf(t, props.probeState)
      const probing = props.probeState.phase === 'probing'
      return h(
        'div',
        { className: 'mm-tools-head' },
        h(
          'div',
          { className: 'mm-tools-title' },
          h('span', null, t('editor.toolsTitle')),
          h(HelpDot, { tip: t('editor.toolsTip') }),
          h('span', { className: 'mm-tools-status' + status.statusClass }, status.statusText),
        ),
        h(
          'span',
          tooltipHandlers(t('action.probeTip')),
          h(
            Button,
            { size: 'sm', disabled: probing, onClick: props.onProbe },
            h(Svg, { d: ICON_REFRESH, size: 12, className: probing ? 'mm-spin-icon' : '' }),
            h('span', null, t('action.probe')),
          ),
        ),
      )
    }

    function EditorToolsToolbar(props) {
      const t = props.t
      return h(
        'div',
        { className: 'mm-tools-toolbar' },
        h('input', {
          className: 'mm-tools-filter',
          value: props.toolFilter,
          placeholder: t('editor.filterTools'),
          spellCheck: false,
          onChange: (event) => props.onFilterChange(event.target.value),
        }),
        h(
          'div',
          { className: 'mm-tools-batch' },
          h('span', null, t('editor.toolSummary', { auto: props.autoCount, disabled: props.disabledCount })),
          h('span', { className: 'mm-divider', 'aria-hidden': 'true' }),
          h(LinkButton, { onClick: props.onAllAuto }, t('action.allAuto')),
          h(LinkButton, { onClick: props.onResetDefault }, t('action.resetDefault')),
        ),
      )
    }

    function EditorToolsPanel(props) {
      const t = props.t
      const filterQuery = props.toolFilter.trim().toLowerCase()
      const filteredTools = filterQuery === ''
        ? props.probedTools
        : props.probedTools.filter((tool) => tool.name.toLowerCase().includes(filterQuery) || tool.description.toLowerCase().includes(filterQuery))
      return h(
        'div',
        { className: 'mm-tools-panel' },
        h(EditorToolsHead, { t: t, probeState: props.probeState, onProbe: props.onProbe }),
        h(EditorToolsToolbar, {
          t: t,
          toolFilter: props.toolFilter,
          onFilterChange: props.onFilterChange,
          autoCount: props.autoCount,
          disabledCount: props.disabledCount,
          onAllAuto: props.onAllAuto,
          onResetDefault: props.onResetDefault,
        }),
        h(
          'div',
          { className: 'mm-tools-list' },
          filteredTools.length === 0
            ? h('div', { className: 'mm-tools-empty' }, t('editor.toolsEmpty'))
            : filteredTools.map((tool) => h(EditorToolRow, {
              key: tool.name,
              t: t,
              tool: tool,
              policy: props.policy,
              onPolicyChange: props.onPolicyChange,
            })),
        ),
      )
    }

    function EditorAdvanced(props) {
      const t = props.t
      return h(
        'div',
        { className: 'mm-adv' },
        h(
          DisclosureButton,
          { open: props.open === true, onClick: props.onToggle },
          h(
            'span',
            { className: 'mm-adv-title' },
            h('span', null, t('editor.advanced')),
            props.customized === true ? h('span', { className: 'mm-badge' }, t('editor.customized')) : null,
          ),
        ),
        props.open === true
          ? h(
            'div',
            { className: 'mm-adv-panel' },
            h(EditorAdvancedFields, { t: t, draft: props.draft, setField: props.setField }),
            h(EditorToolsPanel, {
              t: t,
              probeState: props.probeState,
              onProbe: props.onProbe,
              probedTools: props.probedTools,
              toolFilter: props.toolFilter,
              onFilterChange: props.onFilterChange,
              autoCount: props.autoCount,
              disabledCount: props.disabledCount,
              onAllAuto: props.onAllAuto,
              onResetDefault: props.onResetDefault,
              policy: props.policy,
              onPolicyChange: props.onPolicyChange,
            }),
          )
          : null,
      )
    }

