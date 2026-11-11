    /* ------------------------------------------------------------------ *
     * Page header: title, search, toolbar, warning / error banners.      *
     * ------------------------------------------------------------------ */

    function PageHeader(props) {
      const t = props.t
      const warnings = Array.isArray(props.warnings) ? props.warnings : []
      const header = h(
        'div',
        { className: 'mm-head' },
        h(
          'div',
          { className: 'mm-head-left' },
          h('h2', { className: 'mm-title' }, t('page.title')),
          h(HelpDot, { tip: t('page.help') }),
        ),
        h(
          'div',
          { className: 'mm-head-actions' },
          h(
            'div',
            { className: 'mm-search' },
            h(Svg, { d: ICON_SEARCH, size: 14, className: 'mm-search-icon' }),
            h('input', {
              className: 'mm-search-input',
              value: props.query,
              placeholder: t('page.searchPlaceholder'),
              'aria-label': t('page.searchPlaceholder'),
              spellCheck: false,
              onChange: (event) => {
                if (typeof props.onQueryChange === 'function') props.onQueryChange(event.target.value)
              },
            }),
          ),
          h(IconButton, {
            icon: ICON_ZAP,
            label: t('page.testAll'),
            tooltip: t('page.testAll'),
            className: 'mm-toolbar-btn',
            spin: props.testingAll === true,
            disabled: props.busy === true,
            onClick: props.onTestAll,
          }),
          h(
            Button,
            { variant: 'primary', icon: ICON_PLUS, onClick: props.onAdd },
            h('span', null, t('page.add')),
          ),
        ),
      )
      const warningsBanner = warnings.length > 0
        ? h(
          'div',
          { className: 'mm-warn-banner' },
          h('span', { className: 'mm-warn-label' }, t('page.warnings')),
          h('span', null, warnings.join(' · ')),
        )
        : null
      const errorBanner = props.error !== null && props.error !== undefined && props.hasData === true
        ? h('div', { className: 'mm-error-banner' }, props.error)
        : null
      return h(Fragment, null, header, warningsBanner, errorBanner)
    }
