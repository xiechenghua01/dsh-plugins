    /* ------------------------------------------------------------------ *
     * Editor JSON view: paste, sample and copy.                          *
     * ------------------------------------------------------------------ */

    function EditorJson(props) {
      const t = props.t
      return h(
        'div',
        { className: 'mm-json' },
        h(
          'div',
          { className: 'mm-json-toolbar' },
          h('span', null, t('editor.jsonHint')),
          h(
            'div',
            { className: 'mm-json-actions' },
            h(Button, { size: 'sm', onClick: props.onFillSample }, t('action.pasteSample')),
            h(Button, { size: 'sm', onClick: props.onCopy }, t('action.copyConfig')),
          ),
        ),
        h('textarea', {
          className: 'mm-input mm-mono mm-textarea mm-json-area',
          value: props.text,
          spellCheck: false,
          onChange: (event) => props.onChange(event.target.value),
        }),
        props.feedback.text !== ''
          ? h('div', { className: 'mm-feedback mm-feedback-' + (props.feedback.kind === 'ok' ? 'ok' : 'err') }, props.feedback.text)
          : null,
      )
    }

