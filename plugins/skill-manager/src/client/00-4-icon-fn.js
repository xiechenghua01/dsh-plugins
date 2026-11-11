    function icon(name, size, extraClass) {
        const key = String(name === undefined || name === null ? 'skill' : name)
        const glyph = ICON_GLYPHS[key] || ICON_GLYPHS.skill
        const px = typeof size === 'number' && size > 0 ? size : 16
        const children = glyph.map(function (entry, index) {
            return h(entry[0], Object.assign({ key: 'glyph-' + String(index) }, entry[1]))
        })
        return h('svg', {
            width: px,
            height: px,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            /* Match the MCP plugin's icon weight. */
            strokeWidth: 1.8,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true',
            focusable: 'false',
            className: cx('sm-icon', extraClass),
        }, children)
    }

    function upgradeIcon(size) {
        const px = typeof size === 'number' && size > 0 ? size : 16
        return h('svg', {
            width: px,
            height: px,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.8,
            'aria-hidden': 'true',
            focusable: 'false',
            className: 'sm-upgrade-icon',
        },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('path', { d: 'M8.5 11.5L12 8m0 0l3.5 3.5M12 8v8', strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }
