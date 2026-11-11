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

    /**
     * Link-style text button (§7.1). `className` only appends to the base class;
     * `tip` and `expanded` are optional so disclosure-style links keep their ARIA state.
     */
    function LinkButton(props) {
      const className = 'mm-link-btn'
        + (props.className !== undefined && props.className !== '' ? ' ' + props.className : '')
      const attrs = {
        type: 'button',
        className: className,
        onClick: props.onClick,
      }
      if (props.expanded !== undefined) attrs['aria-expanded'] = props.expanded === true ? 'true' : 'false'
      return h('button', Object.assign(attrs, tooltipHandlers(props.tip)), props.children)
    }

    /** Disclosure header (§7.1): the chevron rotation follows `open`. */
    function DisclosureButton(props) {
      return h(
        'button',
        {
          type: 'button',
          className: 'mm-adv-toggle',
          'aria-expanded': props.open === true ? 'true' : 'false',
          onClick: props.onClick,
        },
        props.children,
        h(Svg, {
          d: ICON_CHEVRON,
          size: 16,
          className: 'mm-chevron' + (props.open === true ? ' mm-chevron-open' : ''),
        }),
      )
    }

    /** Icon-only delete control for key/value rows (§7.2). */
    function KvDeleteButton(props) {
      return h(
        'button',
        Object.assign({
          type: 'button',
          className: 'mm-kv-del',
          'aria-label': props.label,
          onClick: props.onClick,
        }, tooltipHandlers(props.label)),
        h(Svg, { d: ICON_X, size: 16 }),
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
