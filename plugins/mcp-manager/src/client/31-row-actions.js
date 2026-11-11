    /* ------------------------------------------------------------------ *
     * Row actions: enable/disable, edit, delete.                         *
     * ------------------------------------------------------------------ */

    function RowActions(props) {
      const t = props.t
      const row = props.row
      const enabled = props.enabled === true
      const blocked = props.disabled === true
      const toggleLabel = enabled === true ? t('action.toggleDisable') : t('action.toggleEnable')
      const call = (handler) => {
        if (typeof handler === 'function') handler(row)
      }
      return h(
        'div',
        { className: 'mm-actions' },
        h(IconButton, {
          icon: ICON_POWER,
          label: toggleLabel,
          tooltip: toggleLabel,
          tone: enabled === true ? 'ok' : '',
          disabled: blocked,
          onClick: () => call(props.onToggleEnabled),
        }),
        h(IconButton, {
          icon: ICON_EDIT,
          label: t('action.edit'),
          tooltip: t('action.edit'),
          disabled: blocked,
          onClick: () => call(props.onEdit),
        }),
        h(IconButton, {
          icon: ICON_TRASH,
          label: t('action.delete'),
          tooltip: t('action.delete'),
          tone: 'danger',
          disabled: blocked,
          onClick: () => call(props.onDelete),
        }),
      )
    }
