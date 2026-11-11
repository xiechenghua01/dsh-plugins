    /* ------------------------------------------------------------------ *
     * Editor form view: identity, transport and connection fields.       *
     * ------------------------------------------------------------------ */

    function EditorInput(props) {
      const attrs = {
        className: props.className,
        value: props.value,
        placeholder: props.placeholder,
        onChange: props.onChange,
      }
      if (props.type !== undefined) attrs.type = props.type
      if (props.min !== undefined) attrs.min = props.min
      if (props.max !== undefined) attrs.max = props.max
      if (props.step !== undefined) attrs.step = props.step
      if (props.spellCheck === false) attrs.spellCheck = false
      return h('input', attrs)
    }

    function EditorInputField(props) {
      return h(
        Field,
        {
          label: props.label,
          tip: props.tip,
          small: props.small === true,
          required: props.required === true,
          requiredLabel: props.requiredLabel,
        },
        h(EditorInput, {
          className: props.className,
          value: props.value,
          placeholder: props.placeholder,
          type: props.type,
          min: props.min,
          max: props.max,
          step: props.step,
          spellCheck: props.spellCheck,
          onChange: props.onChange,
        }),
      )
    }

    /** Key/value rows (env / headers); the add and remove affordances are link-style controls. */
    function EditorKvEditor(props) {
      const t = props.t
      const rows = Array.isArray(props.rows) ? props.rows : []
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'mm-label-row' },
          h(
            'span',
            { className: 'mm-field-label' },
            h('span', null, props.label),
            h(HelpDot, { tip: props.tip }),
          ),
          h(LinkButton, { onClick: () => props.onAdd(props.listKey) }, t('action.add')),
        ),
        h(
          'div',
          { className: 'mm-kv' },
          rows.map((entry, index) => h(
            'div',
            { className: 'mm-kv-row', key: index },
            h('input', {
              className: 'mm-input mm-mono mm-kv-key',
              value: entry.key,
              placeholder: props.keyPlaceholder,
              spellCheck: false,
              onChange: (event) => props.onUpdate(props.listKey, index, 'key', event.target.value),
            }),
            h('input', {
              className: 'mm-input mm-mono mm-kv-val',
              value: entry.value,
              placeholder: props.valuePlaceholder,
              spellCheck: false,
              onChange: (event) => props.onUpdate(props.listKey, index, 'value', event.target.value),
            }),
            h(KvDeleteButton, {
              label: t('action.removeRow'),
              onClick: () => props.onRemove(props.listKey, index),
            }),
          )),
        ),
      )
    }

    function EditorStdioFields(props) {
      const t = props.t
      const draft = props.draft
      return h(
        Fragment,
        null,
        h(
          Field,
          { label: t('editor.command'), tip: t('editor.commandTip'), required: true, requiredLabel: t('editor.required') },
          h(EditorInput, {
            className: 'mm-input mm-mono',
            value: draft.command,
            placeholder: t('editor.commandPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('command', event.target.value),
          }),
        ),
        h(
          Field,
          { label: t('editor.args'), tip: t('editor.argsTip') },
          h('textarea', {
            className: 'mm-input mm-mono mm-textarea',
            rows: 2,
            value: draft.argsText,
            placeholder: t('editor.argsPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setArgsText(event.target.value),
          }),
        ),
        h(EditorKvEditor, {
          t: t,
          listKey: 'envRows',
          label: t('editor.env'),
          tip: t('editor.envTip'),
          keyPlaceholder: t('editor.kvKeyEnv'),
          valuePlaceholder: t('editor.kvValEnv'),
          rows: draft.envRows,
          onAdd: props.addRow,
          onUpdate: props.updateRow,
          onRemove: props.removeRow,
        }),
      )
    }

    function EditorRemoteFields(props) {
      const t = props.t
      const draft = props.draft
      return h(
        Fragment,
        null,
        h(
          Field,
          { label: t('editor.url'), tip: t('editor.urlTip'), required: true, requiredLabel: t('editor.required') },
          h(EditorInput, {
            className: 'mm-input mm-mono',
            value: draft.url,
            placeholder: t('editor.urlPlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('url', event.target.value),
          }),
        ),
        h(EditorKvEditor, {
          t: t,
          listKey: 'headersRows',
          label: t('editor.headers'),
          tip: t('editor.headersTip'),
          keyPlaceholder: t('editor.kvKeyHeader'),
          valuePlaceholder: t('editor.kvValHeader'),
          rows: draft.headersRows,
          onAdd: props.addRow,
          onUpdate: props.updateRow,
          onRemove: props.removeRow,
        }),
      )
    }

    function EditorForm(props) {
      const t = props.t
      const draft = props.draft
      return h(
        'div',
        { className: 'mm-form' },
        h(
          'div',
          { className: 'mm-grid-name' },
          h(EditorInputField, {
            label: t('editor.name'),
            tip: t('editor.nameTip'),
            required: true,
            requiredLabel: t('editor.required'),
            className: 'mm-input mm-mono',
            value: draft.serverName,
            placeholder: t('editor.namePlaceholder'),
            spellCheck: false,
            onChange: (event) => props.setField('serverName', event.target.value),
          }),
          h(
            Field,
            { label: t('editor.transport'), tip: t('editor.transportTip') },
            h(
              'select',
              {
                className: 'mm-input mm-mono mm-select',
                value: draft.transport,
                onChange: (event) => props.setField('transport', event.target.value),
              },
              h('option', { value: 'stdio' }, 'stdio'),
              h('option', { value: 'streamable-http' }, 'streamable-http'),
              h('option', { value: 'sse' }, 'sse'),
            ),
          ),
        ),
        draft.transport === 'sse' ? h('p', { className: 'mm-hint mm-hint-warn' }, t('editor.sseHint')) : null,
        draft.transport === 'stdio'
          ? h(EditorStdioFields, {
            t: t,
            draft: draft,
            setField: props.setField,
            setArgsText: props.setArgsText,
            addRow: props.addRow,
            updateRow: props.updateRow,
            removeRow: props.removeRow,
          })
          : h(EditorRemoteFields, {
            t: t,
            draft: draft,
            setField: props.setField,
            addRow: props.addRow,
            updateRow: props.updateRow,
            removeRow: props.removeRow,
          }),
        props.advanced,
      )
    }

