    /* ------------------------------------------------------------------ *
     * Presentation primitives.                                           *
     * ------------------------------------------------------------------ */

    function Svg(props) {
      const size = props.size === 20 ? 20 : 16
      return h('svg', {
        className: 'mm-icon' + (props.className !== undefined && props.className !== '' ? ' ' + props.className : ''),
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: props.strokeWidth !== undefined ? props.strokeWidth : 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      }, h('path', { d: props.d }))
    }

    const BUTTON_VARIANTS = { primary: true, secondary: true, ghost: true, danger: true }
    const BUTTON_SIZES = { lg: true, md: true, sm: true }

    function Button(props) {
      const variant = BUTTON_VARIANTS[props.variant] === true ? props.variant : 'secondary'
      const size = BUTTON_SIZES[props.size] === true ? props.size : 'lg'
      const className = 'mm-btn'
        + (variant !== 'secondary' ? ' mm-btn-' + variant : '')
        + (size !== 'lg' ? ' mm-btn-' + size : '')
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      return h(
        'button',
        {
          type: 'button',
          className: className,
          disabled: props.disabled === true,
          'aria-busy': props.loading === true ? 'true' : undefined,
          onClick: props.onClick,
          ref: props.buttonRef,
        },
        props.icon !== undefined && props.icon !== null ? h(Svg, { d: props.icon, size: 16 }) : null,
        props.children,
      )
    }

    function Tabs(props) {
      const items = Array.isArray(props.items) ? props.items : []
      return h(
        'div',
        { className: 'mm-tabs', role: 'group' },
        items.map((item) => h(
          'button',
          Object.assign({
            key: item.value,
            type: 'button',
            className: 'mm-tab' + (props.value === item.value ? ' mm-tab-active' : ''),
            'aria-pressed': props.value === item.value ? 'true' : 'false',
            onClick: () => {
              if (typeof props.onChange === 'function') props.onChange(item.value)
            },
          }, tooltipHandlers(item.tip)),
          item.label,
        )),
      )
    }

    function Segmented(props) {
      const items = Array.isArray(props.items) ? props.items : []
      return h(
        'div',
        { className: 'mm-seg', role: 'group' },
        items.map((item) => h(
          'button',
          Object.assign({
            key: item.value,
            type: 'button',
            className: 'mm-seg-btn mm-seg-btn-' + item.value + (props.value === item.value ? ' mm-seg-btn-active' : ''),
            'aria-pressed': props.value === item.value ? 'true' : 'false',
            onClick: () => {
              if (typeof props.onChange === 'function') props.onChange(item.value)
            },
          }, tooltipHandlers(item.tip)),
          item.label,
        )),
      )
    }

    function IconButton(props) {
      const className = 'mm-icon-btn'
        + (props.tone !== undefined && props.tone !== '' ? ' mm-icon-btn-' + props.tone : '')
        + (props.spin === true ? ' mm-icon-btn-spin' : '')
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      const tip = props.tooltip !== undefined && props.tooltip !== null ? props.tooltip : props.label
      return h(
        'button',
        Object.assign({
          type: 'button',
          className: className,
          disabled: props.disabled === true,
          onClick: props.onClick,
          'aria-label': props.label,
        }, tooltipHandlers(tip)),
        h(Svg, { d: props.icon, size: props.size, strokeWidth: props.strokeWidth }),
      )
    }

    function HelpDot(props) {
      return h(
        'button',
        Object.assign({
          type: 'button',
          className: 'mm-help',
          'aria-label': props.tip,
        }, tooltipHandlers(props.tip)),
        h(Svg, { d: ICON_HELP, size: 16 }),
      )
    }

    function Field(props) {
      return h(
        'label',
        { className: 'mm-field' + (props.small === true ? ' mm-field-sm' : '') },
        h(
          'span',
          { className: 'mm-field-label' },
          h('span', null, props.label),
          props.tip !== undefined && props.tip !== null ? h(HelpDot, { tip: props.tip }) : null,
          props.required === true ? h('span', { className: 'mm-required', title: props.requiredLabel }, '*') : null,
        ),
        props.children,
        props.error !== undefined && props.error !== null && props.error !== ''
          ? h('p', { className: 'mm-hint mm-feedback-err' }, props.error)
          : null,
      )
    }

    function ToastHost(props) {
      const toasts = Array.isArray(props.toasts) ? props.toasts : []
      if (toasts.length === 0) return null
      return h(
        'div',
        { className: 'mm-toasts', 'aria-live': 'polite' },
        toasts.map((toast) => h(
          'div',
          { key: toast.id, className: 'mm-toast mm-toast-' + toast.kind },
          h('span', { className: 'mm-toast-dot' }),
          h('span', { className: 'mm-toast-text' }, toast.text),
          h('button', {
            type: 'button',
            className: 'mm-toast-close',
            'aria-label': props.dismissLabel,
            onClick: () => {
              if (typeof props.onDismiss === 'function') props.onDismiss(toast.id)
            },
          }, h(Svg, { d: ICON_X, size: 16 })),
        )),
      )
    }

    function StatePanel(props) {
      return h(
        'div',
        { className: 'mm-state' },
        props.icon !== undefined && props.icon !== null ? h(Svg, { d: props.icon, size: 20, className: 'mm-state-icon' }) : null,
        h('p', { className: 'mm-state-title' }, props.title),
        props.hint !== undefined && props.hint !== null && props.hint !== '' ? h('p', { className: 'mm-state-hint' }, props.hint) : null,
        props.actionLabel !== undefined && props.actionLabel !== null
          ? h(Button, { variant: 'secondary', onClick: props.onAction }, props.actionLabel)
          : null,
      )
    }

    /** Open dialogs stack in mount order; only the topmost reacts to Escape / backdrop clicks. */
    const dialogStack = []

    /** Body scroll lock shared by the whole dialog stack. */
    let bodyScrollLocks = 0
    let savedBodyOverflow = ''

    function lockBodyScroll() {
      if (typeof document === 'undefined' || document === null) return
      if (bodyScrollLocks === 0) {
        savedBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      }
      bodyScrollLocks += 1
    }

    function unlockBodyScroll() {
      if (typeof document === 'undefined' || document === null) return
      bodyScrollLocks = Math.max(0, bodyScrollLocks - 1)
      if (bodyScrollLocks === 0) document.body.style.overflow = savedBodyOverflow
    }

    function focusQuietly(node) {
      if (node === null || node === undefined || typeof node.focus !== 'function') return
      try {
        node.focus({ preventScroll: true })
      } catch (error) {
        try {
          node.focus()
        } catch (inner) {
          /* the invoking element may be gone */
        }
      }
    }

    function focusableIn(node) {
      if (node === null || node === undefined || typeof node.querySelectorAll !== 'function') return []
      const list = node.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
      return Array.prototype.slice.call(list).filter((item) => item.getAttribute('aria-hidden') !== 'true')
    }

    /**
     * Fixed-size modal (§7.6). Width comes from the size tier, never from the host panel.
     * The body is the only scroll region; Escape and the backdrop dismiss the topmost dialog.
     */
    function Dialog(props) {
      const boxRef = useRef(null)
      const stackToken = useRef({})
      const onCloseRef = useRef(props.onClose)
      onCloseRef.current = props.onClose

      useEffect(() => {
        const token = stackToken.current
        dialogStack.push(token)
        lockBodyScroll()
        const onKeyDown = (event) => {
          if (dialogStack[dialogStack.length - 1] !== token) return
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopImmediatePropagation()
            hideTooltip()
            const close = onCloseRef.current
            if (typeof close === 'function') close()
            return
          }
          if (event.key !== 'Tab') return
          const node = boxRef.current
          const list = focusableIn(node)
          if (list.length === 0) {
            event.preventDefault()
            return
          }
          const first = list[0]
          const last = list[list.length - 1]
          const active = document.activeElement
          if (event.shiftKey && (active === first || node.contains(active) !== true)) {
            event.preventDefault()
            focusQuietly(last)
          } else if (!event.shiftKey && (active === last || node.contains(active) !== true)) {
            event.preventDefault()
            focusQuietly(first)
          }
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown, true)
          unlockBodyScroll()
          hideTooltip()
          const index = dialogStack.indexOf(token)
          if (index !== -1) dialogStack.splice(index, 1)
        }
      }, [])

      useEffect(() => {
        const node = boxRef.current
        if (node === null || typeof node.querySelector !== 'function') return undefined
        const requested = props.initialFocus
        let next = null
        if (requested !== null && requested !== undefined && typeof requested === 'object' && requested.current !== undefined) next = requested.current
        else if (typeof requested === 'string') next = node.querySelector(requested)
        if (next === null || next === undefined) next = node.querySelector('input, select, textarea') || node.querySelector('button')
        focusQuietly(next)
        const returnFocus = props.returnFocus
        return () => {
          focusQuietly(returnFocus)
        }
      }, [])

      return h(
        'div',
        {
          className: 'mm-backdrop',
          onMouseDown: (event) => {
            if (event.target !== event.currentTarget) return
            if (dialogStack[dialogStack.length - 1] !== stackToken.current) return
            hideTooltip()
            const close = onCloseRef.current
            if (typeof close === 'function') close()
          },
        },
        h(
          'div',
          {
            className: 'mm-dialog' + (props.size === 'confirm' ? ' mm-dialog-confirm' : ''),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            tabIndex: -1,
            ref: boxRef,
            style: { boxShadow: 'none' },
          },
          h(
            'div',
            { className: 'mm-dialog-head' },
            h('h3', { className: 'mm-dialog-title' }, props.title),
            h(
              'div',
              { className: 'mm-dialog-head-actions' },
              props.headerExtra !== undefined && props.headerExtra !== null ? props.headerExtra : null,
              h(IconButton, {
                icon: ICON_X,
                size: 16,
                label: props.closeLabel,
                tooltip: props.closeTooltip,
                onClick: () => {
                  hideTooltip()
                  if (typeof props.onClose === 'function') props.onClose()
                },
              }),
            ),
          ),
          h('div', { className: 'mm-dialog-body' }, props.children),
          props.footer !== undefined && props.footer !== null
            ? h('div', { className: 'mm-dialog-foot' }, props.footer)
            : null,
        ),
      )
    }
