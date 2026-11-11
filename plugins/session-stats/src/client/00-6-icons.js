    /* ------------------------------------------------------------------ *
     * Icons (§8): 24 viewBox, 1.8 stroke, round caps, decorative.         *
     * Only two sizes exist: 16 (controls) and 20 (empty states).          *
     * ------------------------------------------------------------------ */

    function StatsIcon(props) {
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
        h('rect', { x: 3.5, y: 13, width: 4, height: 7.5, rx: 1.2 }),
        h('rect', { x: 10, y: 9, width: 4, height: 11.5, rx: 1.2 }),
        h('rect', { x: 16.5, y: 4.5, width: 4, height: 16, rx: 1.2, className: 'ss-icon-accent' }),
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

