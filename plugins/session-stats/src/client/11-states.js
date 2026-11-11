    /* ------------------------------------------------------------------ *
     * Shared state surfaces (§7.10).                                      *
     * ------------------------------------------------------------------ */

    function SkeletonGrid() {
      // Mirror the tallest summary card (label / value / hint / progress / hint)
      // with the same text tiers, so the first-load height follows the host font
      // size and the swap to real cards does not jump.
      return h(
        'div',
        { className: 'ss-skeleton-grid', 'aria-hidden': 'true' },
        [0, 1, 2, 3].map((index) => h(
          'div',
          { key: index, className: 'ss-card ss-skeleton' },
          h('span', { className: 'ss-skeleton-row ss-skeleton-label' }),
          h('span', { className: 'ss-skeleton-row ss-skeleton-value' }),
          h('span', { className: 'ss-skeleton-row ss-skeleton-hint' }),
          h('span', { className: 'ss-skeleton-row ss-skeleton-bar' }),
          h('span', { className: 'ss-skeleton-row ss-skeleton-hint' }),
        )),
      )
    }

    /** First load: a skeleton, but only after 300ms so a fast warm paint never flickers. */
    function LoadingState() {
      const [visible, setVisible] = useState(false)
      useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 300)
        return () => clearTimeout(timer)
      }, [])
      return h('div', { className: 'ss-state-wrap' }, visible ? h(SkeletonGrid, null) : null)
    }

    function SectionSkeleton() {
      return h('div', { className: 'ss-skeleton ss-skeleton-line', 'aria-hidden': 'true' })
    }

