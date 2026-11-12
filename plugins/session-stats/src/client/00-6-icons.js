    /* ------------------------------------------------------------------ *
     * Icons (§8): 24 viewBox, 1.8 stroke, round caps, decorative.         *
     * Sizes are 16 (controls), 18 (collapsed sidebar rail) and 20 (empty  *
     * states); the panellist icon lets the host pick 16 or 18.            *
     * ------------------------------------------------------------------ */

    /**
     * Sidebar panellist glyph (`sidebar.panellist`). The host owns the row,
     * its label and its colors; this component renders only the SVG and
     * returns to the Conversation when the active panel is clicked again.
     * The click is intercepted in the capture phase on the host button, so
     * the host's own open-panel handler never runs for an active entry.
     */
    function PanellistIcon(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      // The owner asks for 16px in the wide sidebar and 18px in the collapsed rail.
      const size = source.size === 18 ? 18 : 16
      const active = source.active === true
      const togglePanel = typeof source.togglePanel === 'function' ? source.togglePanel : null
      const ref = useRef(null)
      useEffect(() => {
        const node = ref.current
        if (node === null || node === undefined || typeof node.closest !== 'function') return undefined
        const button = node.closest('button')
        if (button === null) return undefined
        const onClick = (event) => {
          if (!active) return
          event.preventDefault()
          event.stopPropagation()
          if (togglePanel !== null) togglePanel(true)
        }
        button.addEventListener('click', onClick, true)
        return () => {
          button.removeEventListener('click', onClick, true)
        }
      }, [active, togglePanel])
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: 'ss-icon',
        },
        h('rect', { x: 3.5, y: 13, width: 4, height: 7.5, rx: 1.2 }),
        h('rect', { x: 10, y: 9, width: 4, height: 11.5, rx: 1.2 }),
        h('rect', { ref: ref, x: 16.5, y: 4.5, width: 4, height: 16, rx: 1.2 }),
      )
    }

    function RefreshGlyph(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const spinning = source.spinning === true
      return h(
        'svg',
        {
          width: 16,
          height: 16,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: spinning ? 'ss-icon ss-spin' : 'ss-icon',
        },
        h('path', { d: 'M20 12a8 8 0 1 1-2.34-5.66' }),
        h('path', { d: 'M20 4v5h-5' }),
      )
    }

    function EmptyGlyph(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const size = source.size === 16 ? 16 : 20
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: 'ss-icon',
        },
        h('path', { d: 'M4 13.5l2.4-6.4A2 2 0 0 1 8.3 5.8h7.4a2 2 0 0 1 1.9 1.3L20 13.5' }),
        h('path', { d: 'M4 13.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5' }),
        h('path', { d: 'M4 13.5h4l1.5 2h5l1.5-2h4' }),
      )
    }

    function AlertGlyph(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const size = source.size === 20 ? 20 : 16
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: 'ss-icon',
        },
        h('circle', { cx: 12, cy: 12, r: 8.5 }),
        h('path', { d: 'M12 7.5v5.5' }),
        h('path', { d: 'M12 16.5v.01' }),
      )
    }

