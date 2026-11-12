    function DeleteDialog(props) {
      const t = props.t
      const row = props.row
      const scope = t(row.level === 'global' ? 'delete.scopeGlobal' : 'delete.scopeProfile')
      const cancelRef = useRef(null)
      const footer = h(
        Fragment,
        null,
        h('div', { className: 'mm-foot-left' }),
        h(
          'div',
          { className: 'mm-foot-right' },
          h(Button, { variant: 'ghost', buttonRef: cancelRef, onClick: props.onClose }, t('delete.cancel')),
          h(Button, { variant: 'danger', disabled: props.busy === true, loading: props.busy === true, onClick: props.onConfirm }, t('delete.confirm')),
        ),
      )
      return h(
        Dialog,
        {
          title: t('delete.title'),
          size: 'confirm',
          onClose: props.onClose,
          initialFocus: cancelRef,
          returnFocus: props.returnFocus,
          closeLabel: t('action.close'),
          closeTooltip: t('action.close'),
          footer: footer,
        },
        h(
          'p',
          { className: 'mm-delete-desc' },
          t('delete.descPrefix'),
          h('code', { className: 'mm-mono mm-delete-name' }, row.serverName),
          t('delete.descSuffix', { scope: scope }),
        ),
      )
    }

