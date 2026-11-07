    /* ------------------------------------------------------------------ *
     * 40-detail.js — v2.3 in-page, full-width two-column detail view.     *
     *                                                                    *
     * Replaces the old right-side drawer: the list is swapped out for a  *
     * page with `← 返回`, a unified 56×56 icon header, and a 2fr : 1fr    *
     * body. Everything reads `appState.detail` and the Host JSON shapes   *
     * from the implementation contract (§3/§4).                          *
     * ------------------------------------------------------------------ */

    const SM_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    const SM_PRESETS = ['cordis', 'standard', 'ptc', 'minimal']
    const SM_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    const SM_TARGET_LOCATIONS = ['user-dsh', 'user-agents', 'project-dsh']
    const SM_LOCATION_LABEL_KEYS = {
        'project-dsh': 'loc.projectDsh',
        'project-agents': 'loc.projectAgents',
        custom: 'loc.custom',
        preset: 'loc.preset',
        'user-dsh': 'loc.userDsh',
        'user-agents': 'loc.userAgents',
        bundled: 'loc.bundled',
    }

    /** GET /installed payload (or null). */
    function smInstalledPayload() {
        const value = appState.installed
        return value !== null && typeof value === 'object' ? value : null
    }

    /** Installed SkillView[] (never null). */
    function smSkillList() {
        const payload = smInstalledPayload()
        return payload !== null && Array.isArray(payload.skills) ? payload.skills : []
    }

    /** LocationView[] (never null). */
    function smLocationList() {
        const payload = smInstalledPayload()
        return payload !== null && Array.isArray(payload.locations) ? payload.locations : []
    }

    /** IssueView[] (never null). */
    function smIssueList() {
        const payload = smInstalledPayload()
        return payload !== null && Array.isArray(payload.issues) ? payload.issues : []
    }

    function smFindLocation(id) {
        if (typeof id !== 'string' || id === '') return null
        const list = smLocationList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] && list[index].id === id) return list[index]
        }
        return null
    }

    function smLocationLabel(id, fallback) {
        if (typeof fallback === 'string' && fallback !== '') return fallback
        const key = SM_LOCATION_LABEL_KEYS[id]
        return key ? t(key) : String(id || '')
    }

    /** A location is only disabled when the Host explicitly says it is not writable. */
    function smLocationDisabled(id) {
        if (id === 'project-dsh' && (typeof appState.cwd !== 'string' || appState.cwd === '')) return true
        const location = smFindLocation(id)
        return location !== null && location.writable === false
    }

    function smFindSkillById(id) {
        if (typeof id !== 'string' || id === '') return null
        const list = smSkillList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] && list[index].id === id) return list[index]
        }
        return null
    }

    function smFindSkillByName(name) {
        if (typeof name !== 'string' || name === '') return null
        const list = smSkillList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] && list[index].name === name) return list[index]
        }
        return null
    }

    /** Installed copy of a market skill. When both `location` and `sourceId`
     *  are given only an exact `name + sourceId + location` record matches;
     *  the sole fallback is `name + location` for records that lack `sourceId`.
     *  Never fall back to another location or to name alone. */
    function smFindInstalledCopy(name, location, sourceId) {
        if (typeof name !== 'string' || name === '') return null
        const hasSource = typeof sourceId === 'string' && sourceId !== ''
        const hasLocation = typeof location === 'string' && location !== ''
        const list = smSkillList()
        let unknownSourceAtLocation = null
        let sameSource = null
        let sameLocation = null
        let sameName = null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (!skill || skill.name !== name) continue
            const record = skill.market !== null && typeof skill.market === 'object' ? skill.market : null
            const recordSource = record !== null && typeof record.sourceId === 'string' ? record.sourceId : ''
            const atLocation = hasLocation && skill.location === location
            if (hasSource) {
                if (recordSource === sourceId) {
                    /* 同源记录：给了 location 时必须位置也一致。 */
                    if (!hasLocation || atLocation) return skill
                    if (sameSource === null) sameSource = skill
                } else if (recordSource === '' && hasLocation && atLocation && unknownSourceAtLocation === null) {
                    /* 安装记录本身缺 sourceId：仅允许 name + location 兜底。 */
                    unknownSourceAtLocation = skill
                }
                continue
            }
            /* 调用方未给 sourceId：按 location 优先，最后才按 name。 */
            if (hasLocation) {
                if (atLocation) return skill
                if (sameLocation === null) sameLocation = skill
            } else if (sameName === null) {
                sameName = skill
            }
        }
        if (hasSource) return hasLocation ? unknownSourceAtLocation : sameSource
        return hasLocation ? sameLocation : sameName
    }

    /** Prefer the effective (non-shadowed) copy when a name exists in several locations. */
    function smFindActiveSkillByName(name) {
        if (typeof name !== 'string' || name === '') return null
        const list = smSkillList()
        let fallback = null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (!skill || skill.name !== name) continue
            if (skill.status === 'active') return skill
            if (fallback === null) fallback = skill
        }
        return fallback
    }

    /** Locate a market entry by `sourceId + name` (id alone when no source given). */
    function smFindMarketSkill(id, sourceId, name) {
        const list = Array.isArray(appState.marketSkills) ? appState.marketSkills : []
        const hasId = typeof id === 'string' && id !== ''
        const hasSource = typeof sourceId === 'string' && sourceId !== ''
        const hasName = typeof name === 'string' && name !== ''
        if (!hasId && !(hasSource && hasName)) return null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (!skill) continue
            if (hasSource && skill.sourceId !== sourceId) continue
            if (hasId && skill.id === id) return skill
            if (hasSource && hasName && skill.name === name) return skill
        }
        return null
    }

    /** Version the user can update to ('' when up to date).
     *  `skillUpdateVersion` is authoritative: when the latest check ran
     *  (`checkedAt > 0`) and has no entry for this skill it returns '', and we
     *  must not resurrect the stale `market.installed.updateAvailable` field.
     *  Only a never-checked state (`updates === null` / `checkedAt === 0`) may
     *  fall back to the market payload. */
    function smUpdateVersionFor(skill, market) {
        if (skill !== null && skill !== undefined && typeof skillUpdateVersion === 'function') {
            return skillUpdateVersion(skill)
        }
        /* 从未检查过（或没有本地记录可判定）时才回退市场条目。 */
        const state = typeof updateCheckState === 'function' ? updateCheckState() : null
        if (state === null && market !== null && market !== undefined && market.installed !== undefined && market.installed !== null) {
            if (typeof market.installed.updateAvailable === 'string' && market.installed.updateAvailable !== '') return market.installed.updateAvailable
        }
        return ''
    }

    function smVersionOf(skill, market) {
        if (skill !== null && skill !== undefined && skill.market !== undefined && skill.market !== null && typeof skill.market.version === 'string' && skill.market.version !== '') {
            return skill.market.version
        }
        if (market !== null && market !== undefined && typeof market.version === 'string') return market.version
        return ''
    }

    function smStatusTone(status) {
        if (status === 'active') return 'ok'
        if (status === 'disabled') return 'idle'
        if (status === 'shadowed') return 'warn'
        if (status === 'invalid') return 'error'
        return 'idle'
    }

    function smDotColor(tone) {
        if (tone === 'ok') return 'var(--dsw-alias-state-success-primary)'
        if (tone === 'warn') return 'var(--dsw-alias-state-warn-primary)'
        if (tone === 'error') return 'var(--dsw-alias-state-error-primary)'
        if (tone === 'update') return 'var(--dsw-alias-brand-primary)'
        return 'var(--dsw-alias-label-caption)'
    }

    function smText(value, fallback) {
        if (typeof value === 'string' && value !== '') return value
        return fallback === undefined ? '' : fallback
    }

    /** Copy helper (clipboard API with a hidden-textarea fallback). */
    function smCopyText(value) {
        const text = value === null || value === undefined ? '' : String(value)
        if (text === '') return
        const done = () => {
            if (typeof smPushToast === 'function') smPushToast(t('toast.copied'))
        }
        try {
            if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined && navigator.clipboard !== null && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(text).then(done).catch(() => smCopyFallback(text, done))
                return
            }
        } catch (failure) {
            /* fall through */
        }
        smCopyFallback(text, done)
    }

    function smCopyFallback(text, done) {
        if (typeof document === 'undefined' || document === null || document.body === undefined) return
        try {
            const area = document.createElement('textarea')
            area.value = text
            area.setAttribute('readonly', 'readonly')
            area.style.position = 'fixed'
            area.style.left = '-9999px'
            document.body.appendChild(area)
            area.select()
            if (typeof document.execCommand === 'function') document.execCommand('copy')
            document.body.removeChild(area)
            done()
        } catch (failure) {
            /* clipboard is best effort */
        }
    }

    /** Leave the detail page and ask the list to restore its previous scroll offset. */
    function smGoBackToList() {
        const restore = typeof appState.listScrollTop === 'number'
            ? appState.listScrollTop
            : (typeof appState.listScroll === 'number' ? appState.listScroll : null)
        setState({ view: 'list', detail: null, restoreListScroll: restore })
    }

    function smDetailSignature(detail) {
        if (detail === null || typeof detail !== 'object') return 'none'
        return String(detail.kind || 'installed') + '|' + String(detail.id || '') + '|' + String(detail.sourceId || '') + '|' + String(detail.name || '')
    }

    /* ------------------------------------------------------------------ *
     * Small presentational pieces.                                        *
     * ------------------------------------------------------------------ */

    function SmBadge(props) {
        const tone = props.tone || ''
        let background = 'var(--dsw-alias-bg-layer-2)'
        let color = 'var(--dsw-alias-label-secondary)'
        let border = '1px solid var(--dsw-alias-border-l2)'
        if (tone === 'ok') {
            background = 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)'
            color = 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 82%, var(--dsw-alias-label-primary))'
            border = '1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent)'
        } else if (tone === 'warn') {
            background = 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent)'
            color = 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 82%, var(--dsw-alias-label-primary))'
            border = '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 28%, transparent)'
        } else if (tone === 'error') {
            background = 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)'
            color = 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 82%, var(--dsw-alias-label-primary))'
            border = '1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 28%, transparent)'
        } else if (tone === 'idle') {
            background = 'var(--dsw-alias-bg-layer-2)'
            color = 'var(--dsw-alias-label-tertiary)'
        }
        return h(
            'span',
            {
                className: 'sm-badge' + (tone !== '' ? ' sm-badge-' + tone : ''),
                style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '1px 8px',
                    borderRadius: '999px',
                    background: background,
                    color: color,
                    border: border,
                    fontSize: 'calc(var(--sm-fs) - 3px)',
                    lineHeight: '18px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                },
            },
            props.children,
        )
    }

    /** v2.3 upgrade badge: circle + up arrow, fixed first in the tag bar. */
    function SmUpgradeBadge(props) {
        const version = smText(props.version)
        const style = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '1px 8px 1px 6px',
            borderRadius: '999px',
            background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)',
            color: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 82%, var(--dsw-alias-label-primary))',
            border: '1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent)',
            fontSize: 'calc(var(--sm-fs) - 3px)',
            lineHeight: '18px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
        }
        return h(
            'span',
            {
                className: 'sm-badge sm-badge-update',
                style: style,
                title: t('badge.updateTip', { version: version }),
            },
            h(
                'svg',
                {
                    width: 13,
                    height: 13,
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 1.8,
                    'aria-hidden': 'true',
                    style: { opacity: 0.9, flexShrink: 0 },
                },
                h('circle', { cx: 12, cy: 12, r: 9 }),
                h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M8.5 11.5L12 8m0 0l3.5 3.5M12 8v8' }),
            ),
            h('span', { className: 'sm-mono' }, 'v' + version),
        )
    }

    function SmCard(props) {
        return h(
            'div',
            {
                className: 'sm-card' + (props.className ? ' ' + props.className : ''),
                style: Object.assign(
                    {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        minWidth: 0,
                        padding: '16px 18px',
                        borderRadius: '20px',
                        background: 'var(--dsw-alias-bg-layer-1)',
                        border: '1px solid var(--dsw-alias-border-l2)',
                    },
                    props.style || {},
                ),
            },
            props.children,
        )
    }

    function SmCardTitle(props) {
        return h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
            h('span', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.children),
            props.extra === undefined ? null : props.extra,
        )
    }

    function SmMetaRow(props) {
        return h(
            'div',
            { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' } },
            h('span', { style: { flexShrink: 0, color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.label),
            h(
                'span',
                {
                    className: props.mono === true ? 'sm-mono' : undefined,
                    style: {
                        minWidth: 0,
                        textAlign: 'right',
                        wordBreak: 'break-all',
                        color: 'var(--dsw-alias-label-primary)',
                        fontSize: 'calc(var(--sm-fs) - 1px)',
                    },
                },
                props.children,
            ),
        )
    }

    function SmButton(props) {
        const tone = props.tone || 'secondary'
        const tones = {
            primary: {
                background: 'var(--dsw-alias-label-primary)',
                color: 'var(--dsw-alias-bg-base)',
                border: '1px solid transparent',
            },
            secondary: {
                background: 'var(--dsw-alias-bg-layer-2)',
                color: 'var(--dsw-alias-label-primary)',
                border: '1px solid var(--dsw-alias-border-l2)',
            },
            ghost: {
                background: 'transparent',
                color: 'var(--dsw-alias-label-secondary)',
                border: '1px solid transparent',
            },
            danger: {
                background: 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)',
                color: 'var(--dsw-alias-state-error-primary)',
                border: '1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent)',
            },
            dangerSolid: {
                background: 'var(--dsw-alias-state-error-primary)',
                color: 'var(--dsw-alias-bg-base)',
                border: '1px solid transparent',
            },
        }
        const palette = tones[tone] || tones.secondary
        const baseProps = {
            type: 'button',
            className: 'sm-btn sm-btn-' + tone,
            disabled: props.disabled === true,
            onClick: props.onClick,
            style: Object.assign(
                {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '32px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    fontSize: 'calc(var(--sm-fs) - 1px)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: props.disabled === true ? 'not-allowed' : 'pointer',
                    opacity: props.disabled === true ? 0.5 : 1,
                },
                palette,
                props.style || {},
            ),
        }
        if (props.tip !== undefined && props.tip !== null && props.tip !== '' && typeof smTip === 'function') {
            Object.assign(baseProps, smTip(props.tip))
        }
        return h(
            'button',
            baseProps,
            props.icon ? icon(props.icon, 14) : null,
            props.children,
        )
    }

    function SmDetailIcon(props) {
        return h(
            'div',
            {
                className: 'sm-detail-icon',
                style: {
                    position: 'relative',
                    width: '56px',
                    height: '56px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    background: 'var(--dsw-alias-bg-layer-1)',
                    border: '1px solid var(--dsw-alias-border-l2)',
                    color: 'var(--dsw-alias-label-secondary)',
                },
            },
            icon(skillIconName(props.skill !== null && props.skill !== undefined ? props.skill : props.name), 28),
            h('span', {
                className: 'sm-dot sm-dot-' + (props.tone || 'idle'),
                style: {
                    position: 'absolute',
                    left: '8px',
                    bottom: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: smDotColor(props.tone),
                    boxShadow: '0 0 0 2px var(--dsw-alias-bg-layer-1)',
                },
            }),
        )
    }

    /** Line-numbered monospace preview. */
    function SmCodePreview(props) {
        const text = typeof props.text === 'string' ? props.text : ''
        const lines = text.split('\n')
        return h(
            'div',
            {
                className: 'sm-code',
                style: {
                    maxHeight: props.maxHeight || '420px',
                    overflow: 'auto',
                    padding: '12px',
                    borderRadius: '14px',
                    background: 'var(--dsw-alias-bg-base)',
                    border: '1px solid var(--dsw-alias-border-l1)',
                },
            },
            h(
                'table',
                {
                    className: 'sm-mono',
                    style: {
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: SM_MONO,
                        fontSize: 'calc(var(--sm-fs) - 2px)',
                        lineHeight: '20px',
                    },
                },
                h(
                    'tbody',
                    null,
                    lines.map((line, index) =>
                        h(
                            'tr',
                            { key: index },
                            h(
                                'td',
                                {
                                    style: {
                                        width: '32px',
                                        paddingRight: '12px',
                                        textAlign: 'right',
                                        verticalAlign: 'top',
                                        userSelect: 'none',
                                        color: 'var(--dsw-alias-label-caption)',
                                    },
                                },
                                String(index + 1),
                            ),
                            h(
                                'td',
                                {
                                    style: {
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        color: 'var(--dsw-alias-label-primary)',
                                    },
                                },
                                line === '' ? ' ' : line,
                            ),
                        ),
                    ),
                ),
            ),
        )
    }

    function SmDetailSkeleton() {
        const block = (width, height) =>
            h('div', {
                style: {
                    width: width,
                    height: height,
                    borderRadius: '10px',
                    background: 'var(--dsw-alias-bg-layer-2)',
                },
            })
        return h(
            'div',
            { className: 'sm-detail sm-detail-skeleton', style: { display: 'flex', flexDirection: 'column', gap: '24px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } }, block('56px', '56px'), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, block('220px', '20px'), block('140px', '14px'))),
            h(
                'div',
                { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' } },
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, block('100%', '140px'), block('100%', '220px'), block('100%', '160px')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, block('100%', '180px'), block('100%', '160px'), block('100%', '120px')),
            ),
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')),
        )
    }

    function SmDetailErrorState(props) {
        const kind = props.kind === 'market' ? 'market' : 'installed'
        return h(
            'div',
            {
                className: 'sm-card',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '56px 20px',
                    borderRadius: '20px',
                    background: 'var(--dsw-alias-bg-layer-1)',
                    border: '1px solid var(--dsw-alias-border-l2)',
                    color: 'var(--dsw-alias-label-secondary)',
                },
            },
            h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
            h('div', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, (kind === 'market' ? t('error.loadMarket') : t('error.loadInstalled'))),
            props.message ? h('div', { style: { fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.message) : null,
            h(SmButton, { tone: 'secondary', onClick: props.onRetry }, t('action.retry')),
        )
    }

    /* ------------------------------------------------------------------ *
     * Detail page component.                                             *
     * ------------------------------------------------------------------ */

    function SmDetailView(props) {
        const detail = props.detail !== null && typeof props.detail === 'object' ? props.detail : {}
        const kind = detail.kind === 'market' ? 'market' : 'installed'
        const signature = smDetailSignature(detail)

        const [data, setData] = useState(null)
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)
        const [editing, setEditing] = useState(false)
        const [draft, setDraft] = useState('')
        const [dirty, setDirty] = useState(false)
        const [saving, setSaving] = useState(false)
        const [saveError, setSaveError] = useState('')
        const [sourceData, setSourceData] = useState(null)
        const [sourceLoading, setSourceLoading] = useState(false)
        const [sourceError, setSourceError] = useState('')

        const alive = useRef(true)
        const saveRef = useRef(() => {})
        const autoEdit = useRef(detail.edit === true)

        useEffect(() => {
            alive.current = true
            return () => {
                alive.current = false
            }
        }, [])

        const reload = useCallback(async () => {
            setLoading(true)
            setError(null)
            setSaveError('')
            setSourceError('')
            try {
                let payload = null
                if (kind === 'installed') {
                    const skill = smFindSkillById(detail.id) || smFindSkillByName(detail.name) || null
                    let path = skill !== null ? smText(skill.path) : ''
                    if (path === '' && typeof detail.path === 'string') path = detail.path
                    if (path === '' && typeof detail.id === 'string' && detail.id.indexOf('/') !== -1) path = detail.id
                    if (path === '') {
                        throw { code: 'E_NOT_FOUND', message: (kind === 'market' ? t('error.loadMarket') : t('error.loadInstalled')) }
                    }
                    payload = await api('/skill?path=' + encodeURIComponent(path))
                    // Market-origin skills carry license/engines/source URL only on the
                    // market detail endpoint; enrich the right column best-effort.
                    if (payload !== null && typeof payload === 'object' && payload.skill !== undefined && payload.skill !== null
                        && payload.skill.market !== undefined && payload.skill.market !== null
                        && typeof payload.skill.market.sourceId === 'string' && payload.skill.market.sourceId !== '') {
                        try {
                            const extra = await api('/market/skill?sourceId=' + encodeURIComponent(payload.skill.market.sourceId) + '&name=' + encodeURIComponent(payload.skill.name))
                            if (extra !== null && typeof extra === 'object' && extra.skill !== undefined && extra.skill !== null) payload.marketInfo = extra.skill
                        } catch (failure) {
                            /* metadata enrichment is best effort */
                        }
                    }
                } else {
                    const cached = smFindMarketSkill(detail.id, detail.sourceId, detail.name)
                    const sourceId = smText(detail.sourceId, cached !== null ? smText(cached.sourceId) : '')
                    const name = smText(detail.name, cached !== null ? smText(cached.name) : '')
                    if (sourceId === '' || name === '') {
                        throw { code: 'E_NOT_FOUND', message: (kind === 'market' ? t('error.loadMarket') : t('error.loadInstalled')) }
                    }
                    payload = await api('/market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name))
                }
                if (!alive.current) return
                setData(payload !== null && typeof payload === 'object' ? payload : null)
                setLoading(false)
            } catch (failure) {
                if (!alive.current) return
                setError(failure !== null && typeof failure === 'object' ? failure : {})
                setLoading(false)
            }
        }, [signature])

        useEffect(() => {
            void reload()
        }, [reload])

        // Esc returns to the list only when no dialog / drawer is layered on top.
        useEffect(() => {
            const onKeyDown = (event) => {
                if (event.key !== 'Escape') return
                if (typeof dialogStack !== 'undefined' && Array.isArray(dialogStack) && dialogStack.length > 0) return
                event.preventDefault()
                event.stopPropagation()
                smGoBackToList()
            }
            document.addEventListener('keydown', onKeyDown, true)
            return () => document.removeEventListener('keydown', onKeyDown, true)
        }, [])

        const marketCache = kind === 'market'
            ? (data !== null && data.skill !== undefined && data.skill !== null ? data.skill : smFindMarketSkill(detail.id, detail.sourceId, detail.name))
            : null
        const installedSkill = kind === 'installed'
            ? (data !== null && data.skill !== undefined ? data.skill : (smFindSkillById(detail.id) || smFindSkillByName(detail.name)))
            : smFindInstalledCopy(
                smText(detail.name, marketCache !== null ? smText(marketCache.name) : ''),
                marketCache !== null && marketCache.installed !== undefined && marketCache.installed !== null ? smText(marketCache.installed.location) : '',
                marketCache !== null ? smText(marketCache.sourceId) : smText(detail.sourceId),
            )
        const installedMarketSourceId = installedSkill !== null && installedSkill !== undefined &&
            installedSkill.market !== null && typeof installedSkill.market === 'object' &&
            typeof installedSkill.market.sourceId === 'string' ? installedSkill.market.sourceId : ''
        const marketSkill = kind === 'market'
            ? marketCache
            : (data !== null && data.marketInfo !== undefined && data.marketInfo !== null
                ? data.marketInfo
                : smFindMarketSkill('', installedMarketSourceId, installedSkill !== null && installedSkill !== undefined ? installedSkill.name : ''))
        const skill = kind === 'installed' ? installedSkill : marketSkill

        const displayName = smText(skill !== null && skill !== undefined ? skill.name : '', smText(detail.name))
        const description = smText(skill !== null && skill !== undefined ? skill.description : '', kind === 'market' && marketSkill !== null ? smText(marketSkill.description) : '')
        const whenToUse = smText(skill !== null && skill !== undefined ? skill.whenToUse : '')
        const currentVersion = smVersionOf(installedSkill, marketSkill)
        const updateVersion = smUpdateVersionFor(installedSkill, marketSkill)
        const isInstalled = installedSkill !== null && installedSkill !== undefined
        const writable = isInstalled && installedSkill.writable === true
        const location = isInstalled ? smFindLocation(installedSkill.location) : null
        const statusTone = isInstalled ? smStatusTone(installedSkill.status) : 'idle'

        const beginEdit = (payload) => {
            setDraft(payload !== null && payload !== undefined && typeof payload.content === 'string' ? payload.content : '')
            setDirty(false)
            setSaveError('')
            setEditing(true)
        }

        const startEdit = () => {
            if (!writable || sourceLoading) return
            if (kind === 'installed') {
                beginEdit(data)
                return
            }
            // Market entry whose skill is also installed: lazily load the
            // installed copy so the editor gets real content and mtime.
            const path = installedSkill !== null && installedSkill !== undefined ? smText(installedSkill.path) : ''
            if (path === '') {
                setSourceError(t('error.notFound'))
                return
            }
            setSourceLoading(true)
            setSourceError('')
            api('/skill?path=' + encodeURIComponent(path)).then((payload) => {
                if (!alive.current) return
                setSourceLoading(false)
                setSourceData(payload !== null && typeof payload === 'object' ? payload : null)
                beginEdit(payload)
            }).catch((failure) => {
                if (!alive.current) return
                setSourceLoading(false)
                setSourceError(smErrorMessage(failure))
            })
        }

        const saveEdit = async () => {
            if (!writable || saving) return
            const editSource = kind === 'market' ? sourceData : data
            const editSkill = editSource !== null && editSource !== undefined && editSource.skill !== undefined && editSource.skill !== null
                ? editSource.skill
                : null
            const path = editSkill !== null && typeof editSkill.path === 'string' && editSkill.path !== ''
                ? editSkill.path
                : (installedSkill !== null && installedSkill !== undefined ? smText(installedSkill.path) : '')
            const mtime = editSkill !== null && typeof editSkill.mtime === 'number'
                ? editSkill.mtime
                : (installedSkill !== null && installedSkill !== undefined ? installedSkill.mtime : 0)
            if (path === '') {
                setSaveError(t('error.notFound'))
                return
            }
            setSaving(true)
            setSaveError('')
            try {
                await api('/skill', { method: 'PUT', body: { path: path, mtime: mtime, content: draft } })
                setSaving(false)
                setEditing(false)
                setDirty(false)
                setSourceData(null)
                if (typeof smPushToast === 'function') smPushToast(t('toast.saved'))
                void loadInstalled(true)
                await reload()
            } catch (failure) {
                setSaving(false)
                if (failure !== null && typeof failure === 'object' && failure.code === 'E_CONFLICT_MTIME') {
                    setSaveError(t('detail.conflictMtime'))
                } else {
                    setSaveError(smErrorMessage(failure))
                }
            }
        }
        saveRef.current = saveEdit

        // Cmd/Ctrl + S saves while the inline editor is open.
        useEffect(() => {
            if (!editing) return undefined
            const onKeyDown = (event) => {
                if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') {
                    event.preventDefault()
                    saveRef.current()
                }
            }
            document.addEventListener('keydown', onKeyDown, true)
            return () => document.removeEventListener('keydown', onKeyDown, true)
        }, [editing])

        // The row menu can open the detail straight into the editor (`detail.edit`).
        useEffect(() => {
            if (!autoEdit.current || data === null || !writable) return
            autoEdit.current = false
            setDraft(typeof data.content === 'string' ? data.content : '')
            setDirty(false)
            setSaveError('')
            setEditing(true)
        }, [data])

        if (loading) {
            return h(
                'div',
                { className: 'sm-detail-page sm-scroll', style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' } },
                h('button', {
                    type: 'button',
                    className: 'sm-detail-back',
                    onClick: smGoBackToList,
                    style: {
                        alignSelf: 'flex-start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        height: '28px',
                        padding: '0 8px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--dsw-alias-label-tertiary)',
                        fontSize: 'calc(var(--sm-fs) - 1.5px)',
                        cursor: 'pointer',
                    },
                }, '← ' + (kind === 'market' ? t('detail.backMarket') : t('detail.backInstalled'))),
                h(SmDetailSkeleton),
            )
        }

        if (error !== null) {
            return h(
                'div',
                { className: 'sm-detail-page sm-scroll', style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' } },
                h('button', {
                    type: 'button',
                    className: 'sm-detail-back',
                    onClick: smGoBackToList,
                    style: {
                        alignSelf: 'flex-start',
                        height: '28px',
                        padding: '0 8px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--dsw-alias-label-tertiary)',
                        fontSize: 'calc(var(--sm-fs) - 1.5px)',
                        cursor: 'pointer',
                    },
                }, '← ' + (kind === 'market' ? t('detail.backMarket') : t('detail.backInstalled'))),
                h(SmDetailErrorState, { kind: kind, message: smErrorMessage(error), onRetry: () => { void reload() } }),
            )
        }

        /* ---------------- header tags ---------------- */

        const tags = []
        if (updateVersion !== '') tags.push(h(SmUpgradeBadge, { key: 'update', version: updateVersion }))
        if (location !== null) tags.push(h(SmBadge, { key: 'loc', tone: 'ok' }, smLocationLabel(location.id, location.label) + ' · rank ' + String(location.rank)))
        if (marketSkill !== null && marketSkill !== undefined && Array.isArray(marketSkill.tags)) {
            marketSkill.tags.slice(0, 3).forEach((tag, index) => tags.push(h(SmBadge, { key: 'tag' + String(index) }, tag)))
        } else if (installedSkill !== null && installedSkill !== undefined && installedSkill.invocation !== undefined) {
            if (installedSkill.invocation.modelInvocable === true) tags.push(h(SmBadge, { key: 'model' }, t('badge.model')))
            if (installedSkill.invocation.userInvocable === true) tags.push(h(SmBadge, { key: 'user' }, t('badge.user')))
        }
        const visibleTags = tags.slice(0, 4)

        const statusLabel = !isInstalled
            ? t('detail.notInstalled')
            : (updateVersion !== '' ? t('badge.update') : t('install.installed'))
        const statusBadgeTone = !isInstalled ? 'idle' : (updateVersion !== '' ? 'ok' : 'ok')

        /* ---------------- header actions ---------------- */

        const headerActions = []
        if (!isInstalled && marketSkill !== null && marketSkill !== undefined) {
            headerActions.push(h(SmButton, {
                key: 'install',
                tone: 'primary',
                onClick: () => openModal('install', { sourceId: marketSkill.sourceId, name: marketSkill.name, version: marketSkill.version, skill: marketSkill }),
            }, t('action.install')))
        }
        if (isInstalled) {
            if (updateVersion !== '') {
                headerActions.push(h(SmButton, {
                    key: 'update',
                    tone: 'primary',
                    onClick: () => openModal('update', { skill: installedSkill }),
                }, t('action.update') + ' v' + updateVersion))
            }
            headerActions.push(h(SmButton, {
                key: 'copy',
                tone: 'secondary',
                icon: 'copy',
                tip: t('badge.userTip'),
                onClick: () => smCopyText('/' + displayName),
            }, t('detail.copyCommand') + ' (/' + displayName + ')'))
            if (writable) {
                headerActions.push(h(SmButton, {
                    key: 'edit',
                    tone: updateVersion !== '' ? 'secondary' : 'primary',
                    icon: 'edit',
                    disabled: sourceLoading,
                    onClick: startEdit,
                }, sourceLoading ? t('state.loading') : t('action.editContent')))
            } else if (kind === 'installed') {
                headerActions.push(h(SmButton, { key: 'readonly', tone: 'secondary', disabled: true, tip: t('status.readonly') }, t('status.readonly')))
            }
            if (writable) {
                headerActions.push(h(SmButton, {
                    key: 'remove',
                    tone: 'danger',
                    icon: 'trash',
                    onClick: () => openModal('confirm-delete', {
                        mode: installedSkill.market !== undefined && installedSkill.market !== null ? 'uninstall' : 'delete',
                        skill: installedSkill,
                    }),
                }, installedSkill.market !== undefined && installedSkill.market !== null ? t('action.uninstall') : t('action.delete')))
            }
        }

        /* ---------------- left column ---------------- */

        const leftCards = []

        if (sourceError !== '') leftCards.push(h(SmBanner, { tone: 'error' }, sourceError))

        if (isInstalled) {
            const bannerTone = installedSkill.status === 'shadowed' ? 'warn' : (installedSkill.status === 'invalid' ? 'error' : (installedSkill.status === 'disabled' ? 'idle' : 'ok'))
            leftCards.push(h(
                SmCard,
                { key: 'installed-banner', style: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' } },
                h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
                    h(
                        'div',
                        { style: { fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } },
                        t('detail.location') + ' · ' + smLocationLabel(installedSkill.location, location !== null ? location.label : ''),
                    ),
                    h(
                        'div',
                        { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                        smText(installedSkill.path, installedSkill.sourceType === 'bundled' ? t('loc.bundled') : '—'),
                    ),
                    h(
                        'div',
                        { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: 'calc(var(--sm-fs) - 2px)', color: 'var(--dsw-alias-label-secondary)' } },
                        h(SmBadge, { tone: bannerTone }, installedSkill.status === 'shadowed'
                            ? t('badge.shadowedTip', { path: smText(installedSkill.shadowedBy, '—') })
                            : (installedSkill.status === 'disabled' ? t('state.disabled') : (installedSkill.status === 'invalid' ? t('state.invalid') : t('state.active')))),
                        currentVersion !== '' ? h('span', null, t('install.version') + ': v' + currentVersion) : null,
                        installedSkill.market !== undefined && installedSkill.market !== null && typeof installedSkill.market.installedAt === 'number'
                            ? h('span', null, t('detail.installedAt') + ': ' + fmtTime(installedSkill.market.installedAt))
                            : null,
                        typeof installedSkill.mtime === 'number' ? h('span', null, t('detail.updatedAt') + ': ' + fmtTime(installedSkill.mtime)) : null,
                        installedSkill.market !== undefined && installedSkill.market !== null && installedSkill.market.localModified === true
                            ? h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)' } }, t('detail.localModified'))
                            : null,
                    ),
                ),
                smText(installedSkill.path) !== ''
                    ? h(SmButton, { tone: 'secondary', icon: 'copy', onClick: () => smCopyText(installedSkill.path) }, t('action.copyPath'))
                    : null,
            ))
        }

        leftCards.push(h(
            SmCard,
            { key: 'description' },
            h(
                'div',
                null,
                h('div', { style: { marginBottom: '4px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.description')),
                h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', lineHeight: '1.55' } }, description !== '' ? description : '—'),
            ),
            h(
                'div',
                { style: { paddingTop: '10px', borderTop: '1px solid var(--dsw-alias-border-l1)' } },
                h('div', { style: { marginBottom: '4px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.whenToUse')),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.5' } }, whenToUse !== '' ? whenToUse : t('detail.whenToUseEmpty')),
            ),
        ))

        const content = data !== null && typeof data.content === 'string' ? data.content : ''
        const readme = data !== null && typeof data.readme === 'string' ? data.readme : ''

        if (editing && writable) {
            leftCards.push(h(
                SmCard,
                { key: 'content-edit' },
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
                    h('span', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('action.editContent')),
                    h('span', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                        dirty ? h(SmBadge, { tone: 'warn' }, t('detail.unsaved')) : null,
                        h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('detail.mtimeHint')),
                    ),
                ),
                h('textarea', {
                    className: 'sm-mono',
                    value: draft,
                    spellCheck: false,
                    onChange: (event) => {
                        setDraft(event.target.value)
                        setDirty(true)
                        setSaveError('')
                    },
                    style: {
                        minHeight: '320px',
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px',
                        resize: 'vertical',
                        borderRadius: '14px',
                        background: 'var(--dsw-alias-bg-base)',
                        border: '1px solid var(--dsw-alias-border-l2)',
                        color: 'var(--dsw-alias-label-primary)',
                        fontFamily: SM_MONO,
                        fontSize: 'calc(var(--sm-fs) - 2px)',
                        lineHeight: '20px',
                    },
                }),
                saveError !== '' ? h('div', { className: 'sm-form-error', style: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, saveError) : null,
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' } },
                    saveError === t('detail.conflictMtime')
                        ? h(SmButton, { tone: 'secondary', icon: 'refresh', onClick: () => { setEditing(false); setDirty(false); setSaveError(''); void reload() } }, t('action.refresh'))
                        : null,
                    h(SmButton, { tone: 'ghost', onClick: () => { setEditing(false); setDirty(false); setSaveError('') } }, t('action.cancel')),
                    h(SmButton, { tone: 'primary', disabled: saving, onClick: () => { void saveEdit() } }, saving ? (t('action.save') + '…') : t('action.save')),
                ),
            ))
        } else if (kind === 'installed') {
            leftCards.push(h(
                SmCard,
                { key: 'content-preview' },
                h(
                    SmCardTitle,
                    { extra: h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                        h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)', wordBreak: 'break-all' } }, smText(installedSkill !== null && installedSkill !== undefined ? installedSkill.path : '')),
                        writable ? h(SmButton, { tone: 'secondary', icon: 'edit', style: { height: '26px', padding: '0 10px' }, onClick: startEdit }, t('action.editContent')) : null,
                    ) },
                    'SKILL.md · ' + t('detail.content'),
                ),
                h(SmCodePreview, { text: content }),
            ))
        } else {
            leftCards.push(h(
                SmCard,
                { key: 'content-readme' },
                h(SmCardTitle, null, 'README · ' + t('detail.content')),
                readme !== ''
                    ? h(SmCodePreview, { text: readme, maxHeight: '460px' })
                    : h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.marketReadmeMissing')),
            ))
        }

        const files = data !== null && Array.isArray(data.files)
            ? data.files
            : (marketSkill !== null && marketSkill !== undefined && Array.isArray(marketSkill.files) ? marketSkill.files : [])

        leftCards.push(h(
            SmCard,
            { key: 'files' },
            h(SmCardTitle, null, t('detail.files') + ' (' + String(files.length) + ')'),
            files.length === 0
                ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.noFiles'))
                : h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    files.map((file, index) => {
                        const entry = file !== null && typeof file === 'object' ? file : {}
                        return h(
                            'div',
                            {
                                key: index,
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: 'var(--dsw-alias-bg-base)',
                                    border: '1px solid var(--dsw-alias-border-l1)',
                                },
                            },
                            h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, smText(entry.path, '—')),
                            h(
                                'span',
                                { className: 'sm-mono', style: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } },
                                typeof entry.sha256 === 'string' && entry.sha256 !== '' ? h('span', null, 'sha256: ' + entry.sha256.slice(0, 12) + '…') : null,
                                typeof entry.size === 'number' ? h('span', null, fmtSize(entry.size)) : null,
                                typeof entry.type === 'string' && entry.type !== '' ? h('span', null, entry.type) : null,
                            ),
                        )
                    }),
                ),
        ))

        /* ---------------- right column ---------------- */

        const rightCards = []

        const metaSourceName = marketSkill !== null && marketSkill !== undefined && smText(marketSkill.sourceName) !== ''
            ? smText(marketSkill.sourceName)
            : (installedSkill !== null && installedSkill !== undefined && installedSkill.market !== undefined && installedSkill.market !== null ? smText(installedSkill.market.sourceName) : '')
        const metaSourceUrl = marketSkill !== null && marketSkill !== undefined ? smText(marketSkill.sourceUrl) : ''
        const metaAuthor = marketSkill !== null && marketSkill !== undefined ? smText(marketSkill.author) : ''
        const metaLicense = marketSkill !== null && marketSkill !== undefined ? smText(marketSkill.license) : ''
        const metaEngines = marketSkill !== null && marketSkill !== undefined ? smText(marketSkill.enginesDsh) : ''
        const metaCommit = marketSkill !== null && marketSkill !== undefined && smText(marketSkill.commit) !== ''
            ? smText(marketSkill.commit)
            : (installedSkill !== null && installedSkill !== undefined && installedSkill.market !== undefined && installedSkill.market !== null ? smText(installedSkill.market.commit) : '')
        const metaProvider = installedSkill !== null && installedSkill !== undefined ? smText(installedSkill.provider) : ''
        const metaLocationLabel = isInstalled
            ? smLocationLabel(installedSkill.location, location !== null ? location.label : '') + (location !== null ? ' · rank ' + String(location.rank) : '')
            : t('detail.notInstalledMeta')
        const metaLayer = location !== null ? String(location.layer) : ''

        rightCards.push(h(
            SmCard,
            { key: 'meta' },
            h(SmCardTitle, null, t('detail.meta')),
            h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                h(SmMetaRow, { label: t('detail.location') }, metaLocationLabel),
                metaLayer !== '' ? h(SmMetaRow, { label: t('detail.layer'), mono: true }, metaLayer) : null,
                metaProvider !== '' ? h(SmMetaRow, { label: t('detail.provider'), mono: true }, metaProvider) : null,
                metaSourceName !== '' ? h(SmMetaRow, { label: t('detail.source') }, metaSourceName) : null,
                metaSourceUrl !== '' ? h(SmMetaRow, { label: t('detail.source') + ' URL', mono: true }, metaSourceUrl) : null,
                metaAuthor !== '' ? h(SmMetaRow, { label: t('detail.author') }, metaAuthor) : null,
                metaLicense !== '' ? h(SmMetaRow, { label: t('detail.license'), mono: true }, metaLicense) : null,
                metaEngines !== '' ? h(SmMetaRow, { label: t('detail.engines'), mono: true }, metaEngines) : null,
                metaCommit !== '' ? h('div', null,
                    h('div', { style: { marginBottom: '2px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.commit')),
                    h('div', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, metaCommit),
                ) : null,
            ),
        ))

        const invocation = installedSkill !== null && installedSkill !== undefined && installedSkill.invocation !== undefined ? installedSkill.invocation : null
        const modelInvocable = invocation !== null ? invocation.modelInvocable === true : true
        const userInvocable = invocation !== null ? invocation.userInvocable === true : true
        const visiblePresets = installedSkill !== null && installedSkill !== undefined && Array.isArray(installedSkill.visiblePresets) ? installedSkill.visiblePresets : []
        const globalLayer = location !== null && location.layer === 'global'

        rightCards.push(h(
            SmCard,
            { key: 'visibility' },
            h(SmCardTitle, null, t('detail.invocation')),
            h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
                    h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.invocation')),
                    h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' } },
                        modelInvocable ? h(SmBadge, { tone: 'ok' }, t('badge.model')) : null,
                        userInvocable ? h(SmBadge, { tone: 'ok' }, t('badge.user')) : h(SmBadge, { tone: 'idle' }, t('badge.userOnly')),
                        userInvocable ? h(SmBadge, { key: 'cmd', mono: true }, '/' + displayName) : null,
                    ),
                ),
                h('div', null,
                    h('div', { style: { marginBottom: '6px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.visibility')),
                    globalLayer
                        ? h('div', null, h(SmBadge, { tone: 'ok' }, t('detail.allPresets')))
                        : h(
                            'div',
                            { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                            SM_PRESETS.map((preset) => {
                                const visible = !isInstalled
                                    ? false
                                    : (visiblePresets.indexOf(preset) !== -1)
                                const label = preset + (visible ? '' : ' (' + t('detail.presetInvisible') + ')')
                                return h(SmBadge, {
                                    key: preset,
                                    tone: visible ? 'ok' : 'idle',
                                    className: 'sm-chip',
                                }, label)
                            }),
                        ),
                ),
            ),
        ))

        const relatedIssues = smIssueList().filter((issue) => {
            if (!issue) return false
            if (installedSkill !== null && installedSkill !== undefined && issue.path === installedSkill.path) return true
            if (installedSkill !== null && installedSkill !== undefined && typeof issue.name === 'string' && issue.name === installedSkill.name) return true
            return false
        })
        const shadowed = installedSkill !== null && installedSkill !== undefined && installedSkill.status === 'shadowed'
        const diagTone = !isInstalled
            ? 'idle'
            : (relatedIssues.length === 0 && !shadowed ? 'ok' : (relatedIssues.some((issue) => issue.severity === 'error') ? 'error' : 'warn'))

        rightCards.push(h(
            SmCard,
            { key: 'diagnostics' },
            h(
                SmCardTitle,
                { extra: h(SmBadge, { tone: diagTone }, !isInstalled
                    ? t('detail.notInstalled')
                    : (diagTone === 'ok' ? '✓ ' + t('detail.diagOk') : (shadowed ? t('badge.shadowed') : t('badge.invalid')))) },
                t('detail.diagnostics'),
            ),
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } },
                !isInstalled
                    ? t('detail.diagAfterInstall')
                    : (shadowed
                        ? t('badge.shadowedTip', { path: smText(installedSkill.shadowedBy, '—') })
                        : (relatedIssues.length === 0
                            ? t('diag.none')
                            : relatedIssues.map((issue, index) => h('div', { key: index, style: { marginBottom: '4px' } }, '· ' + smText(issue.message, issue.kind))))),
            ),
            shadowed
                ? h(SmButton, {
                    tone: 'secondary',
                    onClick: () => {
                        const active = smFindActiveSkillByName(installedSkill.name)
                        if (active !== null) setState({ tab: 'installed', view: 'detail', detail: { kind: 'installed', id: active.id, name: active.name } })
                    },
                }, t('action.viewActive') + ' →')
                : (relatedIssues.length > 0
                    ? h(SmButton, { tone: 'secondary', onClick: () => openDiagnosticsDrawer() }, t('diag.viewReasons') + ' →')
                    : null),
        ))

        /* ---------------- page ---------------- */

        return h(
            'div',
            { className: 'sm-detail-page sm-scroll', style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' } },
            h(
                'div',
                { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' } },
                h('button', {
                    type: 'button',
                    className: 'sm-detail-back',
                    onClick: smGoBackToList,
                    style: {
                        height: '28px',
                        padding: '0 8px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--dsw-alias-label-tertiary)',
                        fontSize: 'calc(var(--sm-fs) - 1.5px)',
                        cursor: 'pointer',
                    },
                }, '← ' + (kind === 'market' ? t('detail.backMarket') : t('detail.backInstalled'))),
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('detail.escHint')),
                    h(SmBadge, { tone: statusBadgeTone }, statusLabel),
                ),
            ),
            h(
                'div',
                {
                    className: 'sm-detail-head',
                    style: {
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                        paddingBottom: '20px',
                        borderBottom: '1px solid var(--dsw-alias-border-l2)',
                    },
                },
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 } },
                    h(SmDetailIcon, { tone: statusTone, skill: skill, name: displayName }),
                    h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 } },
                        h(
                            'div',
                            { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                            h('h2', { className: 'sm-mono sm-detail-title', style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 2px)', lineHeight: '1.4', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, displayName),
                            currentVersion !== '' ? h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, 'v' + currentVersion) : null,
                            h(
                                'div',
                                { className: 'sm-chips', style: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden', maxWidth: '340px' } },
                                visibleTags,
                            ),
                        ),
                        h(
                            'div',
                            { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                            kind === 'market' && marketSkill !== null && marketSkill !== undefined
                                ? t('detail.author') + ': ' + smText(marketSkill.author, '—')
                                    + ' · ' + t('detail.source') + ': ' + smText(marketSkill.sourceName, '—')
                                    + ' · ' + t('detail.updatedAt') + ': ' + (typeof marketSkill.publishTimestamp === 'number' ? fmtTime(marketSkill.publishTimestamp) : '—')
                                : t('detail.location') + ': ' + smLocationLabel(installedSkill !== null && installedSkill !== undefined ? installedSkill.location : '', location !== null ? location.label : '—')
                                    + ' · ' + t('detail.provider') + ': ' + smText(installedSkill !== null && installedSkill !== undefined ? installedSkill.provider : '', '—')
                                    + ' · ' + t('detail.updatedAt') + ': ' + (installedSkill !== null && installedSkill !== undefined && typeof installedSkill.mtime === 'number' ? fmtTime(installedSkill.mtime) : '—'),
                        ),
                    ),
                ),
                h('div', { className: 'sm-detail-actions', style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' } }, headerActions),
            ),
            h(
                'div',
                {
                    className: 'sm-detail sm-detail-body',
                    style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start', minWidth: 0 },
                },
                h('div', { className: 'sm-detail-main', style: { display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 } }, leftCards),
                h('div', { className: 'sm-detail-side', style: { display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 } }, rightCards),
            ),
        )
    }

    /** Entry point used by the page shell when `appState.view === 'detail'`. */
    function renderDetailPage() {
        const detail = appState.detail
        if (detail === null || typeof detail !== 'object') {
            if (appState.tab === 'market') return renderMarketTab()
            if (appState.tab === 'sources') return renderSourcesTab()
            return renderInstalledTab()
        }
        return h(SmDetailView, { key: smDetailSignature(detail), detail: detail })
    }
