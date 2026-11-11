    /* ------------------------------------------------------------------ *
     * Primitives (§6.4 / §7). Views never render a bare <button>.         *
     * ------------------------------------------------------------------ */

    function SsButton(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const variant = source.variant === 'primary' || source.variant === 'ghost' || source.variant === 'danger'
        ? source.variant
        : 'secondary'
      const size = source.size === 'lg' || source.size === 'sm' ? source.size : 'md'
      const name = typeof source.name === 'string' && source.name !== '' ? ' ss-' + source.name : ''
      return h(
        'button',
        {
          type: source.type === 'submit' ? 'submit' : 'button',
          className: 'ss-btn' + name,
          'data-variant': variant,
          'data-size': size,
          'data-busy': source.busy === true ? 'true' : undefined,
          'data-active': source.active === true ? 'true' : undefined,
          disabled: source.disabled === true,
          'aria-label': source.label,
          'aria-pressed': source.pressed === undefined ? undefined : (source.pressed === true ? 'true' : 'false'),
          'aria-expanded': source.expanded === undefined ? undefined : (source.expanded === true ? 'true' : 'false'),
          'aria-busy': source.busy === true ? 'true' : undefined,
          title: source.title,
          tabIndex: source.tabIndex,
          style: source.style,
          onClick: typeof source.onClick === 'function' ? source.onClick : undefined,
        },
        source.children,
      )
    }

    function SsIconButton(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const label = typeof source.label === 'string' ? source.label : ''
      const ref = SsTooltip.useAnchor(label)
      const name = typeof source.name === 'string' && source.name !== '' ? ' ss-' + source.name : ''
      return h(
        'button',
        {
          type: 'button',
          ref: ref,
          className: 'ss-icon-btn' + name,
          'data-size': source.size === 'sm' ? 'sm' : 'md',
          'data-variant': source.variant === 'danger' ? 'danger' : 'ghost',
          'data-active': source.active === true ? 'true' : undefined,
          'data-ss-tooltip': label,
          disabled: source.disabled === true,
          'aria-label': label,
          'aria-pressed': source.pressed === undefined ? undefined : (source.pressed === true ? 'true' : 'false'),
          onClick: typeof source.onClick === 'function' ? source.onClick : undefined,
        },
        source.children,
      )
    }

    function SsSegmented(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const level = source.level === 'primary' ? 'primary' : 'secondary'
      return h(
        'div',
        {
          className: 'ss-segmented',
          'data-level': level,
          role: 'group',
          'aria-label': source.label,
        },
        toArray(source.items).map((item) => {
          const record = toObject(item)
          const active = record.active === true
          return h(
            'button',
            {
              key: record.id,
              type: 'button',
              className: 'ss-segment' + (active ? ' ss-segment-active' : ''),
              'aria-pressed': active ? 'true' : 'false',
              onClick: typeof record.onClick === 'function' ? record.onClick : undefined,
            },
            record.label,
            record.suffix === undefined || record.suffix === null
              ? null
              : h('span', { className: 'ss-sort-arrow', 'aria-hidden': 'true' }, record.suffix),
          )
        }),
      )
    }

    function SsBadge(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const tone = source.tone === 'warn' || source.tone === 'success' || source.tone === 'error' ? source.tone : 'neutral'
      const name = typeof source.name === 'string' && source.name !== '' ? ' ss-' + source.name : ''
      return h('span', { className: 'ss-badge' + name, 'data-tone': tone }, source.children)
    }

    function SsEmptyState(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const tone = source.tone === 'error' ? 'error' : 'neutral'
      const Icon = typeof source.icon === 'function' ? source.icon : EmptyGlyph
      return h(
        'div',
        {
          className: 'ss-empty-state',
          'data-tone': tone,
          'data-roomy': source.roomy === true ? 'true' : undefined,
          role: source.role === undefined ? 'status' : source.role,
        },
        h(Icon, { size: 20 }),
        h('p', { className: 'ss-empty' }, source.message),
        source.actionLabel === undefined || source.actionLabel === null
          ? null
          : h(
              SsButton,
              { name: 'state-action', size: 'md', variant: 'secondary', onClick: source.onAction },
              source.actionLabel,
            ),
      )
    }

    function SsErrorBar(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      return h(
        'div',
        { className: 'ss-errorbar', role: 'alert' },
        h(AlertGlyph, { size: 16 }),
        h('span', { className: 'ss-errorbar-text' }, source.message),
        h(
          SsButton,
          { size: 'sm', variant: 'secondary', onClick: source.onRetry },
          source.actionLabel,
        ),
      )
    }

    /**
     * Sidebar-foot entry (`sidebar.footer.action`), rendered directly above the
     * account menu at the bottom of the sidebar. The owner hands it only `wide`;
     * the panel title and the navigation callbacks come from the registration.
     * The entry toggles: a second click on the already-open panel returns to the
     * Conversation (`layout.selectPanel(null)`). Collapsed it is a pure icon and
     * therefore carries the singleton tooltip.
     */
    function FooterEntry(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const wide = source.wide === true
      const t = typeof source.t === 'function' ? source.t : (key) => key
      const openPanel = typeof source.openPanel === 'function' ? source.openPanel : () => {}
      const togglePanel = typeof source.togglePanel === 'function' ? source.togglePanel : null
      const usePanelInfo = source.usePanelInfo
      const active = typeof usePanelInfo === 'function'
        ? usePanelInfo((info) => info !== null && typeof info === 'object' && info.activePanelId === PANEL_ID) === true
        : false
      const onClick = () => {
        if (togglePanel !== null) togglePanel(active)
        else openPanel()
      }
      const label = t('panel.title')
      if (!wide) {
        return h(
          SsIconButton,
          { name: 'footer-entry', label: label, pressed: active, active: active, onClick: onClick },
          h(StatsIcon, null),
        )
      }
      return h(
        SsButton,
        { name: 'footer-entry', size: 'lg', variant: 'ghost', label: label, pressed: active, active: active, onClick: onClick },
        h(StatsIcon, null),
        h('span', { className: 'ss-footer-label' }, label),
      )
    }

