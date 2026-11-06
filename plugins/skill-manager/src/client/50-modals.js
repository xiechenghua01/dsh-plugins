    /* ------------------------------------------------------------------ *
     * 50-modals.js — six dialogs, the diagnostics drawer, toasts and the  *
     * singleton tooltip.                                                  *
     *                                                                    *
     * Playbook §2/§3: no glow, transparent backdrop, host-coloured body,  *
     * layered Escape/backdrop handling, scrolling body with min-height:0. *
     * ------------------------------------------------------------------ */

    const SM_INPUT_STYLE = {
        width: '100%',
        height: '32px',
        boxSizing: 'border-box',
        padding: '0 10px',
        borderRadius: '10px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 'calc(var(--sm-fs) - 1px)',
        outline: 'none',
    }
    const SM_TEXTAREA_STYLE = {
        width: '100%',
        minHeight: '120px',
        boxSizing: 'border-box',
        padding: '10px',
        borderRadius: '10px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontFamily: SM_MONO,
        fontSize: 'calc(var(--sm-fs) - 2px)',
        lineHeight: '20px',
        resize: 'vertical',
        outline: 'none',
    }
    const SM_SELECT_STYLE = {
        width: '100%',
        height: '32px',
        boxSizing: 'border-box',
        padding: '0 8px',
        borderRadius: '10px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 'calc(var(--sm-fs) - 1px)',
        outline: 'none',
    }

    /* ------------------------------------------------------------------ *
     * Layer state.                                                       *
     * ------------------------------------------------------------------ */

    const smModals = []
    const dialogStack = []
    let smModalSeq = 0

    const smDiagnostics = {
        open: false,
        loading: false,
        error: null,
        data: null,
        checkedAt: 0,
    }

    function smErrorMessage(failure) {
        const code = failure !== null && failure !== undefined && typeof failure.code === 'string' ? failure.code : ''
        const keys = {
            E_UNAUTHORIZED: 'error.unauthorized',
            E_PATH_OUTSIDE_ROOT: 'error.pathOutside',
            E_READONLY_LOCATION: 'error.readonly',
            E_NAME_TAKEN: 'form.nameTaken',
            E_FRONTMATTER: 'error.frontmatter',
            E_NAME_INVALID: 'form.nameInvalid',
            E_NOT_FOUND: 'error.notFound',
            E_CONFLICT_MTIME: 'detail.conflictMtime',
            E_SOURCE_UNREACHABLE: 'source.error.fetch',
            E_SOURCE_SCHEMA: 'source.error.schema',
            E_CHECKSUM: 'error.checksum',
            E_NOT_ENOUGH_SPACE: 'error.space',
            E_CANCELED: 'error.canceled',
            E_TOO_LARGE: 'error.tooLarge',
            E_BAD_REQUEST: 'error.badRequest',
            E_INTERNAL: 'error.generic',
        }
        if (code !== '' && keys[code] !== undefined) return t(keys[code])
        if (failure !== null && failure !== undefined && typeof failure.message === 'string' && failure.message !== '') return failure.message
        return t('error.generic')
    }

    function smMarketFromPayload(payload) {
        const source = payload !== null && typeof payload === 'object' ? payload : {}
        const sourceId = typeof source.sourceId === 'string' ? source.sourceId : ''
        /* 同源校验：payload 带 sourceId 时，任何候选条目（含 payload.skill）
           都必须同源，缺 sourceId 的条目才允许按 name 回退。 */
        const matchesSource = (item) => sourceId === ''
            || typeof item.sourceId !== 'string'
            || item.sourceId === ''
            || item.sourceId === sourceId
        if (source.skill !== null && typeof source.skill === 'object' && typeof source.skill.name === 'string' && matchesSource(source.skill)) return source.skill
        if (source.marketSkill !== null && typeof source.marketSkill === 'object' && typeof source.marketSkill.name === 'string' && matchesSource(source.marketSkill)) return source.marketSkill
        const list = Array.isArray(appState.marketSkills) ? appState.marketSkills : []
        for (let index = 0; index < list.length; index += 1) {
            const item = list[index]
            if (!item) continue
            if (typeof source.id === 'string' && source.id !== '' && item.id === source.id) return item
            if (typeof source.name === 'string' && source.name !== '' && item.name === source.name && matchesSource(item)) return item
        }
        return null
    }

    function smLocationOptions() {
        return [
            { value: 'user-dsh', label: t('loc.userDsh') + ' (~/.dsh/skills)', disabled: smLocationDisabled('user-dsh') },
            { value: 'user-agents', label: t('loc.userAgents') + ' (~/.agents/skills)', disabled: smLocationDisabled('user-agents') },
            {
                value: 'project-dsh',
                label: t('loc.projectDsh') + ' (<repo>/.dsh/skills)',
                hint: typeof appState.cwd !== 'string' || appState.cwd === '' ? t('form.locationProjectDisabled') : '',
                disabled: smLocationDisabled('project-dsh'),
            },
        ]
    }

    /* ------------------------------------------------------------------ *
     * Toasts.                                                            *
     * ------------------------------------------------------------------ */

    /** Thin alias over the prelude's canonical toast queue (appState.toasts). */
    function smPushToast(message, options) {
        return toast(message, options)
    }

    function smDismissToast(id) {
        if (!Array.isArray(appState.toasts)) return
        const next = appState.toasts.filter((item) => item && item.id !== id)
        if (next.length === appState.toasts.length) return
        appState.toasts = next
        if (typeof rerender === 'function') rerender()
    }

    function smNormalizeToast(item, index) {
        if (typeof item === 'string') {
            return { id: 'ext-' + String(index), message: item, tone: 'info', actionLabel: '', onAction: null }
        }
        if (item === null || typeof item !== 'object') return null
        const message = typeof item.message === 'string' ? item.message : (typeof item.text === 'string' ? item.text : '')
        if (message === '') return null
        return {
            id: item.id !== undefined && item.id !== null ? item.id : 'ext-' + String(index),
            message: message,
            tone: item.tone === 'error' || item.type === 'error' ? 'error' : (item.tone === 'info' || item.type === 'info' ? 'info' : 'ok'),
            actionLabel: typeof item.actionLabel === 'string' ? item.actionLabel : (typeof item.action === 'string' ? item.action : ''),
            onAction: typeof item.onAction === 'function' ? item.onAction : (typeof item.undo === 'function' ? item.undo : null),
        }
    }

    /** Bottom-centre toast list, rendered from the shared `appState.toasts` queue. */
    function renderToastHost() {
        const items = []
        if (Array.isArray(appState.toasts)) {
            for (let index = 0; index < appState.toasts.length; index += 1) {
                const normalized = smNormalizeToast(appState.toasts[index], index)
                if (normalized !== null) items.push(normalized)
            }
        }
        if (items.length === 0) return null
        return h(
            'div',
            {
                className: 'sm-toast-host sm-toasts',
                style: {
                    position: 'fixed',
                    left: '50%',
                    bottom: '20px',
                    transform: 'translateX(-50%)',
                    zIndex: 2100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    maxWidth: 'min(480px, calc(100vw - 32px))',
                    pointerEvents: 'none',
                },
            },
            items.map((item) => h(
                'div',
                {
                    key: String(item.id),
                    className: 'sm-toast sm-toast-' + (item.tone === 'error' ? 'error' : (item.tone === 'info' ? 'info' : 'ok')) + ' sm-' + (item.tone === 'error' ? 'error' : (item.tone === 'info' ? 'info' : 'ok')),
                    role: 'status',
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        maxWidth: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'var(--dsw-alias-bg-layer-3)',
                        border: '1px solid var(--dsw-alias-border-l2)',
                        color: 'var(--dsw-alias-label-primary)',
                        fontSize: 'calc(var(--sm-fs) - 1px)',
                        lineHeight: '18px',
                        boxShadow: 'none',
                        pointerEvents: 'auto',
                    },
                },
                h('span', {
                    style: {
                        flexShrink: 0,
                        color: item.tone === 'error'
                            ? 'var(--dsw-alias-state-error-primary)'
                            : (item.tone === 'info' ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-state-success-primary)'),
                    },
                }, icon(item.tone === 'error' ? 'alert' : (item.tone === 'info' ? 'info' : 'check'), 16)),
                h('span', { style: { minWidth: 0, wordBreak: 'break-word' } }, item.message),
                item.actionLabel !== '' && item.onAction !== null
                    ? h('button', {
                        type: 'button',
                        className: 'sm-toast-action',
                        onClick: () => {
                            try {
                                item.onAction()
                            } finally {
                                smDismissToast(item.id)
                            }
                        },
                        style: {
                            flexShrink: 0,
                            height: '24px',
                            padding: '0 6px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--dsw-alias-brand-primary)',
                            fontSize: 'calc(var(--sm-fs) - 1px)',
                            fontWeight: 500,
                            cursor: 'pointer',
                        },
                    }, item.actionLabel)
                    : null,
            )),
        )
    }

    /* ------------------------------------------------------------------ *
     * Singleton tooltip. 300 ms hover delay, copied --sm-fs, no glow.     *
     * ------------------------------------------------------------------ */

    const smTooltip = { timer: null, target: null, label: '', node: null }

    function smEnsureTooltipNode() {
        if (typeof document === 'undefined' || document === null) return null
        if (smTooltip.node !== null && document.body.contains(smTooltip.node)) return smTooltip.node
        const node = document.createElement('div')
        node.className = 'sm-tooltip'
        node.setAttribute('role', 'tooltip')
        node.style.cssText = 'position:fixed;left:0;top:0;z-index:2000;max-width:290px;padding:6px 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:calc(var(--sm-fs) - 4px);line-height:1.35;box-shadow:none;pointer-events:none;opacity:0;visibility:hidden;white-space:normal;transition:opacity .12s ease;'
        const root = document.querySelector('.sm-root')
        let scale = ''
        if (root !== null && typeof getComputedStyle === 'function') {
            scale = getComputedStyle(root).getPropertyValue('--sm-fs').trim()
        }
        node.style.setProperty('--sm-fs', scale !== '' ? scale : '14px')
        document.body.appendChild(node)
        smTooltip.node = node
        return node
    }

    function smHideTooltip() {
        if (smTooltip.timer !== null) {
            clearTimeout(smTooltip.timer)
            smTooltip.timer = null
        }
        smTooltip.target = null
        smTooltip.label = ''
        if (smTooltip.node !== null) {
            smTooltip.node.style.opacity = '0'
            smTooltip.node.style.visibility = 'hidden'
        }
    }

    function smPlaceTooltip() {
        const target = smTooltip.target
        if (target === null || target === undefined || typeof target.getBoundingClientRect !== 'function') {
            smHideTooltip()
            return
        }
        if (typeof document === 'undefined' || document === null || !document.body.contains(target)) {
            smHideTooltip()
            return
        }
        const node = smEnsureTooltipNode()
        if (node === null) return
        node.textContent = smTooltip.label
        node.style.visibility = 'hidden'
        node.style.opacity = '1'
        const rect = target.getBoundingClientRect()
        const tipRect = node.getBoundingClientRect()
        const viewWidth = typeof window !== 'undefined' && window !== null ? window.innerWidth : 0
        let left = rect.left + rect.width / 2 - tipRect.width / 2
        let top = rect.top - tipRect.height - 8
        if (left < 8) left = 8
        if (viewWidth > 0 && left + tipRect.width > viewWidth - 8) left = viewWidth - tipRect.width - 8
        if (top < 8) top = rect.bottom + 8
        node.style.left = Math.round(left) + 'px'
        node.style.top = Math.round(top) + 'px'
        node.style.visibility = 'visible'
    }

    function smScheduleTooltip(label, target) {
        smHideTooltip()
        const text = label === null || label === undefined ? '' : String(label)
        if (text === '' || target === null || target === undefined) return
        smTooltip.target = target
        smTooltip.label = text
        smTooltip.timer = setTimeout(() => {
            smTooltip.timer = null
            smPlaceTooltip()
        }, 300)
    }

    function smTip(label) {
        const text = label === null || label === undefined ? '' : String(label)
        if (text === '') return {}
        return {
            onMouseEnter: (event) => {
                smScheduleTooltip(text, event.currentTarget)
            },
            onMouseLeave: () => {
                smHideTooltip()
            },
            onMouseDown: () => {
                smHideTooltip()
            },
        }
    }

    function SmTooltipLifecycle() {
        useEffect(() => {
            smEnsureTooltipNode()
            return () => {
                smHideTooltip()
                if (smTooltip.node !== null && smTooltip.node.parentNode !== null && smTooltip.node.parentNode !== undefined) {
                    smTooltip.node.parentNode.removeChild(smTooltip.node)
                }
                smTooltip.node = null
            }
        }, [])
        return null
    }

    function renderTooltipLayer() {
        return h(SmTooltipLifecycle)
    }

    /* ------------------------------------------------------------------ *
     * Dialog stack + Escape layering.                                    *
     * ------------------------------------------------------------------ */

    function openModal(kind, payload) {
        let name = String(kind)
        let source = payload !== null && typeof payload === 'object' ? payload : {}
        // Accept the short aliases the list/source tabs use.
        if (name === 'new') name = 'new-skill'
        else if (name === 'import') name = 'import-skill'
        else if (name === 'delete' || name === 'uninstall') {
            source = Object.assign({}, source)
            if (source.mode === undefined) source.mode = name
            name = 'confirm-delete'
        }
        const id = ++smModalSeq
        smModals.push({
            id: id,
            kind: name,
            payload: source,
        })
        dialogStack.push('modal:' + String(id))
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    function closeModal() {
        if (smModals.length === 0) return
        const entry = smModals[smModals.length - 1]
        smModals.splice(smModals.length - 1, 1)
        const token = 'modal:' + String(entry.id)
        const index = dialogStack.lastIndexOf(token)
        if (index !== -1) dialogStack.splice(index, 1)
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    function smCloseDiagnostics() {
        smDiagnostics.open = false
        const index = dialogStack.lastIndexOf('diagnostics')
        if (index !== -1) dialogStack.splice(index, 1)
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    function smCloseTopLayer() {
        const top = dialogStack[dialogStack.length - 1]
        if (top === undefined) return
        if (top === 'diagnostics') {
            smCloseDiagnostics()
            return
        }
        if (typeof top === 'string' && top.indexOf('modal:') === 0) {
            const id = Number(top.slice('modal:'.length))
            for (let index = smModals.length - 1; index >= 0; index -= 1) {
                if (smModals[index].id === id) {
                    smModals.splice(index, 1)
                    break
                }
            }
            dialogStack.pop()
            smHideTooltip()
            if (typeof rerender === 'function') rerender()
        }
    }

    function smBindEscapeLayers() {
        if (typeof document === 'undefined' || document === null) return
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return
            if (dialogStack.length === 0) return
            event.preventDefault()
            event.stopPropagation()
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
            smCloseTopLayer()
        }, true)
    }

    smBindEscapeLayers()

    function renderModalLayer() {
        if (smModals.length === 0) return null
        const topEntry = smModals[smModals.length - 1]
        const topToken = dialogStack[dialogStack.length - 1]
        return h(
            Fragment,
            null,
            smModals.map((entry) => h(SmModalHost, {
                key: String(entry.id),
                entry: entry,
                isTop: entry === topEntry && topToken === 'modal:' + String(entry.id),
            })),
        )
    }

    function SmModalHost(props) {
        const entry = props.entry
        const shared = { isTop: props.isTop === true, payload: entry.payload }
        if (entry.kind === 'new-skill') return h(SmNewSkillModal, shared)
        if (entry.kind === 'import-skill') return h(SmImportModal, shared)
        if (entry.kind === 'install') return h(SmInstallModal, shared)
        if (entry.kind === 'update') return h(SmUpdateModal, shared)
        if (entry.kind === 'add-source') return h(SmAddSourceModal, shared)
        if (entry.kind === 'confirm-delete') return h(SmConfirmDeleteModal, shared)
        return h(
            SmDialogFrame,
            { isTop: props.isTop === true, title: t('action.close'), footer: h(SmButton, { tone: 'secondary', onClick: closeModal }, t('action.close')) },
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('error.generic')),
        )
    }

    /* ------------------------------------------------------------------ *
     * Shared dialog chrome + form primitives.                            *
     * ------------------------------------------------------------------ */

    function SmDialogFrame(props) {
        const confirm = props.confirm === true
        const boxRef = useRef(null)
        useEffect(() => {
            const node = boxRef.current
            if (node !== null && typeof node.querySelector === 'function') {
                const field = node.querySelector('input, select, textarea, button')
                if (field !== null && typeof field.focus === 'function') {
                    try {
                        field.focus({ preventScroll: true })
                    } catch (failure) {
                        /* focus is best effort */
                    }
                }
            }
        }, [])
        return h(
            'div',
            {
                className: 'sm-modal-backdrop',
                style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    background: 'transparent',
                },
                onMouseDown: (event) => {
                    if (event.target !== event.currentTarget) return
                    if (props.isTop !== true) return
                    smHideTooltip()
                    closeModal()
                },
            },
            h(
                'div',
                {
                    ref: boxRef,
                    className: 'sm-dialog' + (confirm ? ' sm-narrow sm-dialog-confirm' : ''),
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': props.title,
                    style: {
                        width: confirm ? '360px' : '560px',
                        maxWidth: 'calc(100vw - 32px)',
                        maxHeight: 'calc(100vh - 48px)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: confirm ? '14px' : '20px',
                        border: '0.5px solid var(--dsw-alias-border-l2)',
                        background: 'var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1))',
                        boxShadow: 'none',
                    },
                },
                h(
                    'div',
                    {
                        className: 'sm-dialog-head',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            padding: confirm ? '18px 20px 4px' : '18px 24px',
                            borderBottom: confirm ? 'none' : '1px solid var(--dsw-alias-border-l2)',
                        },
                    },
                    h('h3', { style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.title),
                    confirm
                        ? null
                        : h('button', {
                            type: 'button',
                            className: 'sm-icon-btn sm-dialog-close',
                            'aria-label': t('action.close'),
                            onClick: () => {
                                smHideTooltip()
                                closeModal()
                            },
                            style: {
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                border: 'none',
                                borderRadius: '8px',
                                background: 'transparent',
                                color: 'var(--dsw-alias-label-secondary)',
                                cursor: 'pointer',
                            },
                        }, icon('x', 16)),
                ),
                h(
                    'div',
                    {
                        className: 'sm-dialog-body',
                        style: {
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            padding: confirm ? '10px 20px 18px' : '20px 24px',
                        },
                    },
                    props.children,
                ),
                props.footer === undefined || props.footer === null
                    ? null
                    : h(
                        'div',
                        {
                            className: 'sm-dialog-foot',
                            style: {
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '8px',
                                padding: confirm ? '0 20px 20px' : '14px 24px',
                                borderTop: confirm ? 'none' : '1px solid var(--dsw-alias-border-l2)',
                            },
                        },
                        props.footer,
                    ),
            ),
        )
    }

    function SmField(props) {
        return h(
            'div',
            { className: 'sm-field', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            h(
                'div',
                { className: 'sm-label', style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' } },
                h('span', { style: { fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.label),
                props.hint ? h('span', { style: { fontSize: 'calc(var(--sm-fs) - 3px)', color: 'var(--dsw-alias-label-caption)' } }, props.hint) : null,
            ),
            props.children,
            props.error ? h('div', { style: { fontSize: 'calc(var(--sm-fs) - 2px)', color: 'var(--dsw-alias-state-error-primary)' } }, props.error) : null,
        )
    }

    function SmBanner(props) {
        const tone = props.tone || 'info'
        const color = tone === 'error'
            ? 'var(--dsw-alias-state-error-primary)'
            : (tone === 'warn'
                ? 'var(--dsw-alias-state-warn-primary)'
                : (tone === 'ok' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-brand-primary)'))
        return h(
            'div',
            {
                className: 'sm-banner sm-banner-' + tone,
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'color-mix(in srgb, ' + color + ' 10%, transparent)',
                    border: '1px solid color-mix(in srgb, ' + color + ' 28%, transparent)',
                    color: 'var(--dsw-alias-label-secondary)',
                    fontSize: 'calc(var(--sm-fs) - 2px)',
                    lineHeight: '1.5',
                },
            },
            props.children,
        )
    }

    function SmRadioOptions(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            options.map((option) => {
                const selected = props.value === option.value
                return h(
                    'label',
                    {
                        key: option.value,
                        style: {
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid ' + (selected ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'),
                            background: selected ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent)' : 'var(--dsw-alias-bg-base)',
                            color: 'var(--dsw-alias-label-primary)',
                            fontSize: 'calc(var(--sm-fs) - 1px)',
                            opacity: option.disabled === true ? 0.5 : 1,
                            cursor: option.disabled === true ? 'not-allowed' : 'pointer',
                        },
                    },
                    h('input', {
                        type: 'radio',
                        name: props.name || 'sm-radio',
                        value: option.value,
                        checked: selected,
                        disabled: option.disabled === true,
                        onChange: () => {
                            if (option.disabled !== true && typeof props.onChange === 'function') props.onChange(option.value)
                        },
                        style: { marginTop: '2px', flexShrink: 0 },
                    }),
                    h(
                        'span',
                        { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                        h('span', { style: { wordBreak: 'break-word' } }, option.label),
                        option.hint ? h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, option.hint) : null,
                    ),
                )
            }),
        )
    }

    function SmSegmented(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h(
            'div',
            { style: { display: 'inline-flex', gap: '2px', padding: '2px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-3)', alignSelf: 'flex-start' } },
            options.map((option) => {
                const selected = props.value === option.value
                return h(
                    'button',
                    {
                        key: option.value,
                        type: 'button',
                        'aria-selected': selected,
                        onClick: () => {
                            if (typeof props.onChange === 'function') props.onChange(option.value)
                        },
                        style: {
                            height: '30px',
                            padding: '0 12px',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: selected ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
                            color: selected ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
                            fontSize: 'calc(var(--sm-fs) - 1px)',
                            fontWeight: selected ? 500 : 400,
                        },
                    },
                    option.label,
                )
            }),
        )
    }

    function SmFooter(props) {
        return h(
            Fragment,
            null,
            h(SmButton, { tone: 'secondary', onClick: closeModal }, t('action.cancel')),
            props.children,
        )
    }

    /* ------------------------------------------------------------------ *
     * 1. New skill.                                                      *
     * ------------------------------------------------------------------ */

    function SmNewSkillModal(props) {
        const [name, setName] = useState('')
        const [description, setDescription] = useState('')
        const [whenToUse, setWhenToUse] = useState('')
        const [body, setBody] = useState('')
        const [location, setLocation] = useState('user-dsh')
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const trimmedName = name.trim()
        let nameError = ''
        if (trimmedName !== '' && (!SM_NAME_PATTERN.test(trimmedName) || trimmedName.length > 64)) {
            nameError = t('form.nameInvalid')
        } else if (trimmedName !== '' && smSkillList().some((skill) => skill && skill.name === trimmedName && skill.location === location && skill.status !== 'disabled')) {
            nameError = t('form.nameTaken')
        }
        const descriptionError = description.trim().length > 500 ? t('form.descriptionTooLong') : ''
        const canSubmit = trimmedName !== ''
            && nameError === ''
            && description.trim() !== ''
            && descriptionError === ''
            && body.trim() !== ''
            && !smLocationDisabled(location)
            && !busy

        async function submit() {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const payload = { location: location, name: trimmedName, description: description.trim(), body: body }
            if (whenToUse.trim() !== '') payload.whenToUse = whenToUse.trim()
            try {
                const result = await api('/skill', { method: 'POST', body: payload })
                setBusy(false)
                smPushToast(t('toast.created', { name: trimmedName }))
                closeModal()
                setState({
                    tab: 'installed',
                    view: 'list',
                    detail: null,
                    highlightId: result !== null && result !== undefined && result.skill !== undefined ? result.skill.id : null,
                })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('action.newSkill'),
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: () => { void submit() } }, t('form.create'))),
            },
            serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
            h(SmField, { label: t('form.name'), hint: t('form.nameHint'), error: nameError },
                h('input', {
                    type: 'text',
                    className: 'sm-mono',
                    value: name,
                    placeholder: 'code-review',
                    onChange: (event) => {
                        setName(event.target.value)
                        setServerError('')
                    },
                    style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO }),
                }),
            ),
            h(SmField, { label: t('form.description'), hint: t('form.descriptionHint'), error: descriptionError },
                h('input', {
                    type: 'text',
                    value: description,
                    placeholder: '',
                    onChange: (event) => {
                        setDescription(event.target.value)
                        setServerError('')
                    },
                    style: SM_INPUT_STYLE,
                }),
            ),
            h(SmField, { label: t('form.whenToUse'), hint: t('form.whenToUseHint') },
                h('input', {
                    type: 'text',
                    value: whenToUse,
                    placeholder: '',
                    onChange: (event) => setWhenToUse(event.target.value),
                    style: SM_INPUT_STYLE,
                }),
            ),
            h(SmField, { label: t('detail.location') },
                h(SmRadioOptions, { name: 'new-skill-location', value: location, onChange: setLocation, options: smLocationOptions() }),
            ),
            h(SmField, { label: t('form.body'), hint: t('form.bodyHint') },
                h('textarea', {
                    value: body,
                    placeholder: '',
                    onChange: (event) => setBody(event.target.value),
                    style: Object.assign({}, SM_TEXTAREA_STYLE, { minHeight: '140px' }),
                }),
            ),
        )
    }

    /* ------------------------------------------------------------------ *
     * 2. Import skill.                                                   *
     * ------------------------------------------------------------------ */

    function SmImportModal(props) {
        const [mode, setMode] = useState('paste')
        const [content, setContent] = useState('')
        const [dirPath, setDirPath] = useState('')
        const [location, setLocation] = useState('user-dsh')
        const [parsed, setParsed] = useState(null)
        const [parseError, setParseError] = useState('')
        const [parsing, setParsing] = useState(false)
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        async function parse() {
            if (content.trim() === '') {
                setParseError(t('form.bodyRequired'))
                setParsed(null)
                return
            }
            setParsing(true)
            setParseError('')
            setParsed(null)
            try {
                const result = await api('/validate', { method: 'POST', body: { content: content } })
                if (result !== null && result !== undefined && result.valid === true) {
                    setParsed(result)
                } else {
                    setParseError(result !== null && result !== undefined && typeof result.error === 'string' && result.error !== '' ? result.error : t('import.parseFail', { reason: t('error.generic') }))
                }
            } catch (failure) {
                setParseError(smErrorMessage(failure))
            } finally {
                setParsing(false)
            }
        }

        const canSubmit = mode === 'paste'
            ? content.trim() !== '' && !busy
            : dirPath.trim() !== '' && !busy

        async function submit() {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const payload = { mode: mode, location: location }
            if (mode === 'paste') payload.content = content
            else payload.dirPath = dirPath.trim()
            try {
                const result = await api('/import', { method: 'POST', body: payload })
                const imported = result !== null && result !== undefined && result.skill !== undefined && result.skill !== null ? result.skill : null
                const files = result !== null && result !== undefined && typeof result.files === 'number' ? result.files : 0
                setBusy(false)
                smPushToast(t('toast.imported', { name: imported !== null ? smText(imported.name) : '', count: files }))
                closeModal()
                setState({
                    tab: 'installed',
                    view: 'list',
                    detail: null,
                    highlightId: imported !== null ? imported.id : null,
                })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('import.title'),
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: () => { void submit() } }, t('import.confirm'))),
            },
            serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
            h(SmSegmented, {
                value: mode,
                onChange: (value) => {
                    setMode(value)
                    setParseError('')
                },
                options: [
                    { value: 'paste', label: t('import.paste') },
                    { value: 'dir', label: t('import.dir') },
                ],
            }),
            mode === 'paste'
                ? h(
                    Fragment,
                    null,
                    h(SmField, {
                        label: t('import.pasteLabel'),
                        hint: h('button', {
                            type: 'button',
                            className: 'sm-link-btn',
                            onClick: () => { void parse() },
                            style: {
                                height: '24px',
                                padding: '0 6px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--dsw-alias-brand-primary)',
                                fontSize: 'calc(var(--sm-fs) - 2px)',
                                cursor: 'pointer',
                            },
                        }, parsing ? t('import.parsing') : t('import.parse')),
                    },
                        h('textarea', {
                            value: content,
                            placeholder: '',
                            onChange: (event) => {
                                setContent(event.target.value)
                                setParsed(null)
                                setParseError('')
                            },
                            style: Object.assign({}, SM_TEXTAREA_STYLE, { minHeight: '160px' }),
                        }),
                    ),
                    parseError !== '' ? h(SmBanner, { tone: 'error' }, parseError) : null,
                    parsed !== null
                        ? h(SmBanner, { tone: 'ok' },
                            h('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontWeight: 500 } }, '✓ ' + t('import.parseOk')),
                            h('span', null, t('form.name') + ': ' + smText(parsed.name, '—')),
                            h('span', null, t('form.description') + ': ' + smText(parsed.description, '—')),
                        )
                        : null,
                )
                : h(
                    Fragment,
                    null,
                    h(SmField, { label: t('import.dirLabel') },
                        h('input', {
                            type: 'text',
                            className: 'sm-mono',
                            value: dirPath,
                            placeholder: '',
                            onChange: (event) => setDirPath(event.target.value),
                            style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO }),
                        }),
                    ),
                    h(SmBanner, { tone: 'info' }, t('import.dirFilesHint')),
                ),
            h(SmField, { label: t('import.target') },
                h(SmRadioOptions, { name: 'import-location', value: location, onChange: setLocation, options: smLocationOptions() }),
            ),
        )
    }

    /* ------------------------------------------------------------------ *
     * 3. Market install (target + version + conflict + progress).        *
     * ------------------------------------------------------------------ */

    function SmInstallModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const [market, setMarket] = useState(() => smMarketFromPayload(payload))
        const [versions, setVersions] = useState([])
        const [loading, setLoading] = useState(() => smMarketFromPayload(payload) === null)
        const [loadError, setLoadError] = useState('')
        const [reloadTick, setReloadTick] = useState(0)
        const [location, setLocation] = useState('user-dsh')
        const [version, setVersion] = useState(() => {
            const cached = smMarketFromPayload(payload)
            return smText(payload.version, cached !== null ? smText(cached.version) : '')
        })
        const [conflictChoice, setConflictChoice] = useState('overwrite')
        const [busy, setBusy] = useState(false)
        const [stage, setStage] = useState(0)
        const [error, setError] = useState('')
        const timerRef = useRef(null)

        useEffect(() => {
            if (market !== null) return undefined
            let alive = true
            async function load() {
                setLoading(true)
                setLoadError('')
                const sourceId = smText(payload.sourceId)
                const name = smText(payload.name)
                if (sourceId === '' || name === '') {
                    setLoading(false)
                    setLoadError(t('install.failed', { reason: t('error.notFound') }))
                    return
                }
                try {
                    const data = await api('/market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name))
                    if (!alive) return
                    const skill = data !== null && data !== undefined && data.skill !== undefined ? data.skill : null
                    setMarket(skill)
                    setVersions(data !== null && data !== undefined && Array.isArray(data.versions) ? data.versions : [])
                    if (skill !== null && version === '') setVersion(smText(skill.version))
                    setLoading(false)
                } catch (failure) {
                    if (!alive) return
                    setLoadError(smErrorMessage(failure))
                    setLoading(false)
                }
            }
            void load()
            return () => {
                alive = false
            }
        }, [reloadTick])

        useEffect(() => () => {
            if (timerRef.current !== null) clearInterval(timerRef.current)
        }, [])

        const conflict = market !== null && smSkillList().some((skill) => skill && skill.name === market.name && skill.location === location && skill.status !== 'disabled')

        const versionOptions = versions.length > 0
            ? versions
            : (market !== null ? [{ version: market.version, publishTimestamp: market.publishTimestamp, enginesDsh: market.enginesDsh, yanked: false }] : [])

        function changeLocation() {
            if (market === null) return
            for (let index = 0; index < SM_TARGET_LOCATIONS.length; index += 1) {
                const candidate = SM_TARGET_LOCATIONS[index]
                if (candidate === location) continue
                if (smLocationDisabled(candidate)) continue
                const taken = smSkillList().some((skill) => skill && skill.name === market.name && skill.location === candidate && skill.status !== 'disabled')
                if (!taken) {
                    setLocation(candidate)
                    setConflictChoice('overwrite')
                    return
                }
            }
            smPushToast(t('install.noFreeLocation'), { tone: 'error' })
        }

        async function submit() {
            if (market === null || busy) return
            setBusy(true)
            setStage(1)
            setError('')
            if (timerRef.current !== null) clearInterval(timerRef.current)
            timerRef.current = setInterval(() => {
                setStage((previous) => (previous < 2 ? previous + 1 : previous))
            }, 700)
            try {
                const body = {
                    sourceId: market.sourceId,
                    name: market.name,
                    version: version,
                    location: location,
                }
                if (conflict) body.conflict = conflictChoice === 'skip' ? 'skip' : 'overwrite'
                const result = await api('/market/install', { method: 'POST', body: body })
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                setBusy(false)
                setStage(2)
                smPushToast(t('install.success', { name: market.name }))
                closeModal()
                setState({
                    tab: 'installed',
                    view: 'list',
                    detail: null,
                    highlightId: result !== null && result !== undefined && result.skill !== undefined ? result.skill.id : null,
                })
                void loadInstalled(true)
                void loadMarket()
            } catch (failure) {
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        if (loading) {
            return h(
                SmDialogFrame,
                { isTop: props.isTop, title: t('install.title'), footer: h(SmFooter, null) },
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')),
            )
        }

        if (market === null) {
            return h(
                SmDialogFrame,
                { isTop: props.isTop, title: t('install.title'), footer: h(SmFooter, null, h(SmButton, { tone: 'secondary', onClick: () => setReloadTick((value) => value + 1) }, t('action.retry'))) },
                h(SmBanner, { tone: 'error' }, loadError !== '' ? loadError : t('error.notFound')),
            )
        }

        const stageLabels = [t('install.stageDownload'), t('install.stageVerify'), t('install.stageWrite')]
        const pct = stage <= 0 ? 8 : (stage === 1 ? 42 : (stage === 2 ? 88 : 100))

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('install.title') + ' · ' + market.name,
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: busy, onClick: () => { void submit() } }, busy ? (t('install.button') + '…') : t('install.button'))),
            },
            error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
            h(SmField, { label: t('install.target') },
                h(SmRadioOptions, { name: 'install-location', value: location, onChange: setLocation, options: smLocationOptions() }),
            ),
            h(SmField, { label: t('install.version') },
                h('select', {
                    value: version,
                    onChange: (event) => setVersion(event.target.value),
                    style: SM_SELECT_STYLE,
                }, versionOptions.map((item) => h(
                    'option',
                    { key: item.version, value: item.version, disabled: item.yanked === true },
                    'v' + item.version + (item.yanked === true ? ' (' + t('install.yanked') + ')' : '') + (typeof item.publishTimestamp === 'number' ? ' · ' + fmtTime(item.publishTimestamp) : ''),
                ))),
            ),
            h(
                'div',
                { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                h('span', null,
                    h('span', { style: { color: 'var(--dsw-alias-label-caption)' } }, t('install.version') + ': '),
                    h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-primary)' } }, 'v' + smText(version, market.version)),
                    typeof market.commit === 'string' && market.commit !== ''
                        ? h('span', { className: 'sm-mono', style: { marginLeft: '6px', color: 'var(--dsw-alias-label-caption)' } }, '(' + market.commit.slice(0, 7) + ')')
                        : null,
                ),
                h('span', null, t('detail.files') + ': ' + String(Array.isArray(market.files) ? market.files.length : 0)),
            ),
            conflict
                ? h(SmBanner, { tone: 'warn' },
                    h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)', fontWeight: 500 } }, '⚠ ' + t('install.conflict')),
                    h(SmRadioOptions, {
                        name: 'install-conflict',
                        value: conflictChoice,
                        onChange: setConflictChoice,
                        options: [
                            { value: 'overwrite', label: t('install.conflict.overwrite') },
                            { value: 'skip', label: t('install.conflict.skip') },
                        ],
                    }),
                    h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: changeLocation }, t('install.conflict.changeTarget')),
                )
                : null,
            busy || stage > 0
                ? h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                        h('span', null, stageLabels[Math.min(stage, stageLabels.length - 1)]),
                        h('span', { className: 'sm-mono' }, String(pct) + '%'),
                    ),
                    h(
                        'div',
                        { role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, style: { width: '100%', height: '6px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-3)', overflow: 'hidden' } },
                        h('div', { style: { width: String(pct) + '%', height: '100%', background: 'var(--dsw-alias-brand-primary)', transition: 'width 220ms' } }),
                    ),
                )
                : null,
        )
    }

    /* ------------------------------------------------------------------ *
     * 4. Manual update confirmation.                                     *
     * ------------------------------------------------------------------ */

    function SmUpdateModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const payloadSkill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const payloadMarket = payloadSkill !== null && payloadSkill.market !== null && typeof payloadSkill.market === 'object' ? payloadSkill.market : null
        const payloadSourceId = smText(payload.sourceId, payloadMarket !== null ? smText(payloadMarket.sourceId) : '')
        const payloadName = smText(payload.name, payloadSkill !== null ? smText(payloadSkill.name) : '')
        const payloadLocation = smText(payload.location, payloadSkill !== null ? smText(payloadSkill.location) : '')
        const payloadHasSource = payloadSourceId !== ''
        const payloadHasLocation = payloadLocation !== ''
        /* 本地记录必须与 payload 的 sourceId + location 精确一致；记录本身缺
           sourceId 时只允许 name + location 匹配，绝不跨源/跨位置取值。 */
        const payloadRecordMatches = (record) => {
            if (record === null || record === undefined || typeof record !== 'object') return false
            if (payloadHasLocation && smText(record.location) !== payloadLocation) return false
            const recordMarket = record.market !== null && typeof record.market === 'object' ? record.market : null
            const recordSource = recordMarket !== null ? smText(recordMarket.sourceId) : ''
            if (payloadHasSource && recordSource !== '' && recordSource !== payloadSourceId) return false
            if (payloadHasSource && recordSource === '' && !payloadHasLocation) return false
            return true
        }
        let skill = typeof smFindInstalledCopy === 'function'
            ? smFindInstalledCopy(payloadName, payloadLocation, payloadSourceId)
            : null
        if (skill === null && payloadSkill !== null && payloadRecordMatches(payloadSkill)) skill = payloadSkill
        if (skill === null && typeof payload.id === 'string' && payload.id !== '') {
            const byId = smFindSkillById(payload.id)
            if (byId !== null && payloadRecordMatches(byId)) skill = byId
        }
        const market = skill !== null && skill.market !== undefined && skill.market !== null ? skill.market : null

        const sourceId = smText(payloadSourceId, market !== null ? smText(market.sourceId) : '')
        const name = smText(payloadName, skill !== null ? smText(skill.name) : '')
        const cached = smFindMarketSkill('', sourceId, name)
        /* 解析不到精确记录时 available/current/location/commit 全部留空，
           绝不复用其他来源或位置的版本、位置。 */
        const location = skill !== null ? smText(skill.location) : ''
        const resolvedSourceId = market !== null ? smText(market.sourceId) : ''
        const updateVersion = skill !== null ? skillUpdateVersion(skill) : ''
        /* payload 中的版本只在与解析出的本地记录同源时才可采用，绝不跨源取值。 */
        const payloadAvailable = smText(payload.available, smText(payload.version))
        const sameSourcePayload = payloadAvailable !== '' && sourceId !== '' && resolvedSourceId === sourceId
        const available = skill !== null
            ? (updateVersion !== '' ? updateVersion : (sameSourcePayload ? payloadAvailable : ''))
            : ''
        const current = skill !== null
            ? (market !== null && smText(market.version) !== ''
                ? smText(market.version)
                : smText(payload.current, smText(payload.currentVersion, cached !== null ? smText(cached.version) : '')))
            : ''
        const commit = skill !== null
            ? (market !== null ? smText(market.commit) : (cached !== null ? smText(cached.commit) : ''))
            : ''
        const localModified = market !== null && market.localModified === true

        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        async function submit() {
            if (busy || available === '' || sourceId === '' || name === '' || location === '') return
            setBusy(true)
            setError('')
            try {
                await api('/market/update', { method: 'POST', body: { sourceId: sourceId, name: name, version: available, location: location } })
                setBusy(false)
                smPushToast(t('update.success', { version: available }))
                closeModal()
                void loadInstalled(true)
                void loadUpdates(true)
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('action.update') + (name !== '' ? ' · ' + name : ''),
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: busy || available === '' || location === '', onClick: () => { void submit() } }, t('update.confirm'))),
            },
            error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
            location === '' ? h(SmBanner, { tone: 'warn' }, t('error.notFound')) : null,
            h(
                'div',
                { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                h('span', null, t('install.version')),
                h('span', { className: 'sm-mono', style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } },
                    'v' + smText(current, '—'),
                    ' → ',
                    h('span', { style: { color: 'var(--dsw-alias-state-success-primary)' } }, available !== '' ? 'v' + available : t('update.none')),
                ),
            ),
            commit !== ''
                ? h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                    h('span', null, t('update.sourceCommit')),
                    h('span', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, commit),
                )
                : null,
            localModified
                ? h(SmBanner, { tone: 'warn' },
                    h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)', fontWeight: 500 } }, '⚠ ' + t('update.localModified')),
                    h('span', null, t('update.backupHint')),
                )
                : null,
        )
    }

    /* ------------------------------------------------------------------ *
     * 5. Add market source.                                              *
     * ------------------------------------------------------------------ */

    function SmAddSourceModal(props) {
        const [type, setType] = useState('index')
        const [name, setName] = useState('')
        const [url, setUrl] = useState('')
        const [validating, setValidating] = useState(false)
        const [result, setResult] = useState(null)
        const [validateError, setValidateError] = useState(null)
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        async function validate() {
            if (url.trim() === '') {
                setValidateError({ code: 'E_BAD_REQUEST', message: t('form.urlRequired') })
                setResult(null)
                return
            }
            setValidating(true)
            setValidateError(null)
            setResult(null)
            setServerError('')
            try {
                const data = await api('/sources/validate', { method: 'POST', body: { url: url.trim() } })
                setResult(data !== null && typeof data === 'object' ? data : null)
            } catch (failure) {
                setValidateError(failure !== null && typeof failure === 'object' ? failure : {})
            } finally {
                setValidating(false)
            }
        }

        const canSave = result !== null && validateError === null && url.trim() !== '' && !busy

        async function submit() {
            if (!canSave) return
            setBusy(true)
            setServerError('')
            const payload = { url: url.trim() }
            if (name.trim() !== '') payload.name = name.trim()
            try {
                const data = await api('/sources', { method: 'POST', body: payload })
                const source = data !== null && data !== undefined && data.source !== undefined ? data.source : null
                setBusy(false)
                smPushToast(t('source.added', { name: source !== null ? smText(source.name, name.trim()) : name.trim() }))
                closeModal()
                void loadSources()
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        const samples = result !== null && Array.isArray(result.sample) ? result.sample : []
        const warnings = result !== null && Array.isArray(result.warnings) ? result.warnings : []

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('source.add.title'),
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSave, onClick: () => { void submit() } }, t('action.save'))),
            },
            serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
            h(SmSegmented, {
                value: type,
                onChange: (value) => {
                    setType(value)
                    setResult(null)
                    setValidateError(null)
                },
                options: [
                    { value: 'index', label: t('source.type.index') },
                    { value: 'local', label: t('source.type.local') },
                ],
            }),
            type === 'index' ? h(SmBanner, { tone: 'warn' }, '⚠ ' + t('source.trust')) : null,
            h(SmField, { label: t('source.name') },
                h('input', {
                    type: 'text',
                    value: name,
                    placeholder: '',
                    onChange: (event) => setName(event.target.value),
                    style: SM_INPUT_STYLE,
                }),
            ),
            h(SmField, { label: type === 'local' ? t('source.localPath') : t('source.url') },
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                    h('input', {
                        type: 'text',
                        className: 'sm-mono',
                        value: url,
                        placeholder: type === 'local' ? '~/.dsh/skills' : 'https://…/index.json',
                        onChange: (event) => {
                            setUrl(event.target.value)
                            setResult(null)
                            setValidateError(null)
                        },
                        style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO, flex: 1 }),
                    }),
                    h(SmButton, { tone: 'secondary', disabled: validating, onClick: () => { void validate() } }, validating ? (t('source.validate') + '…') : t('source.validate')),
                ),
            ),
            validateError !== null
                ? h(SmBanner, { tone: 'error' },
                    h('span', { style: { fontWeight: 500 } }, '[' + smText(validateError.code, 'E_BAD_REQUEST') + '] ' + smErrorMessage(validateError)),
                    typeof validateError.path === 'string' && validateError.path !== ''
                        ? h('span', { className: 'sm-mono' }, t('source.error.path', { path: validateError.path }))
                        : null,
                )
                : null,
            result !== null
                ? h(SmBanner, { tone: 'ok' },
                    h('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontWeight: 500 } }, '✓ ' + t('source.validated', { count: typeof result.skillCount === 'number' ? result.skillCount : 0 })),
                    result.title ? h('span', null, t('source.title') + ': ' + smText(result.title)) : null,
                    result.description ? h('span', null, smText(result.description)) : null,
                    samples.length > 0
                        ? h('span', { className: 'sm-mono', style: { wordBreak: 'break-all' } }, t('source.sample') + ': ' + samples.slice(0, 3).map((item) => smText(item.name) + (item.version ? ' v' + item.version : '')).join(' · '))
                        : null,
                    warnings.length > 0 ? h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)' } }, t('source.warnings', { count: warnings.length }) + ': ' + warnings.join('; ')) : null,
                )
                : null,
        )
    }

    /* ------------------------------------------------------------------ *
     * 6. Delete / uninstall confirmation (360px).                        *
     * ------------------------------------------------------------------ */

    function SmConfirmDeleteModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const payloadSkill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        /* 缺 payload.skill 时按 id 精确定位；退回 name 时必须带上调用方给出的
           location / sourceId，避免卸载另一个位置或来源的同名副本。 */
        const skill = payloadSkill !== null
            ? payloadSkill
            : (smFindSkillById(payload.id) || (typeof smFindInstalledCopy === 'function'
                ? smFindInstalledCopy(smText(payload.name), smText(payload.location), smText(payload.sourceId))
                : smFindSkillByName(payload.name)))
        const mode = payload.mode === 'uninstall'
            || payload.kind === 'uninstall'
            || (payload.mode === undefined && payload.kind === undefined
                && skill !== null && skill !== undefined && skill.market !== undefined && skill.market !== null)
            ? 'uninstall'
            : 'delete'
        const name = skill !== null && skill !== undefined ? smText(skill.name) : smText(payload.name)
        const path = skill !== null && skill !== undefined ? smText(skill.path) : ''
        const location = skill !== null && skill !== undefined ? smText(skill.location) : ''

        const [preserveBackup, setPreserveBackup] = useState(false)
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        async function submit() {
            if (busy) return
            if (mode === 'delete' && path === '') {
                setError(t('error.notFound'))
                return
            }
            if (mode === 'uninstall' && (name === '' || location === '')) {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                if (mode === 'uninstall') {
                    await api('/market/uninstall', { method: 'POST', body: { name: name, location: location, preserveBackup: preserveBackup } })
                } else {
                    await api('/skill?path=' + encodeURIComponent(path), { method: 'DELETE' })
                }
                setBusy(false)
                smPushToast(mode === 'uninstall' ? t('uninstall.success', { name: name }) : t('delete.success', { name: name }))
                closeModal()
                const detail = appState.detail
                if (detail !== null && typeof detail === 'object' && (detail.id === (skill !== null ? skill.id : '') || detail.name === name)) {
                    setState({ view: 'list', detail: null })
                }
                void loadInstalled(true)
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                confirm: true,
                title: mode === 'uninstall' ? t('uninstall.confirm.title') : t('delete.confirm.title'),
                footer: h(
                    Fragment,
                    null,
                    h(SmButton, { tone: 'secondary', onClick: closeModal }, t('action.cancel')),
                    h(SmButton, { tone: 'dangerSolid', disabled: busy, onClick: () => { void submit() } }, mode === 'uninstall' ? t('action.uninstall') : t('action.delete')),
                ),
            },
            error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
            h(
                'p',
                { style: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.55' } },
                mode === 'uninstall'
                    ? t('uninstall.confirm.body', { name: name !== '' ? name : '—' })
                    : t('delete.confirm.body', { path: path !== '' ? path : '—' }),
            ),
            path !== '' && mode === 'uninstall'
                ? h('div', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, path)
                : null,
            mode === 'uninstall'
                ? h(
                    'label',
                    { style: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', cursor: 'pointer' } },
                    h('input', {
                        type: 'checkbox',
                        checked: preserveBackup,
                        onChange: (event) => setPreserveBackup(event.target.checked),
                    }),
                    h('span', null, t('uninstall.keepBackup')),
                )
                : null,
        )
    }

    /* ------------------------------------------------------------------ *
     * Diagnostics drawer.                                                *
     * ------------------------------------------------------------------ */

    const SM_DIAG_KINDS = [
        { kind: 'broken-link', labelKey: 'diag.kind.brokenLink', tone: 'error' },
        { kind: 'frontmatter', labelKey: 'diag.kind.frontmatter', tone: 'error' },
        { kind: 'name', labelKey: 'diag.kind.name', tone: 'error' },
        { kind: 'same-layer-shadow', labelKey: 'diag.kind.sameLayer', tone: 'warn' },
        { kind: 'cross-layer-shadow', labelKey: 'diag.kind.crossLayer', tone: 'warn' },
        { kind: 'unreadable', labelKey: 'diag.kind.unreadable', tone: 'error' },
        { kind: 'oversize', labelKey: 'diag.kind.oversize', tone: 'idle' },
    ]

    function openDiagnosticsDrawer() {
        if (!smDiagnostics.open) {
            smDiagnostics.open = true
            dialogStack.push('diagnostics')
        }
        if (typeof rerender === 'function') rerender()
        void smLoadDiagnostics()
    }

    async function smLoadDiagnostics() {
        smDiagnostics.loading = true
        smDiagnostics.error = null
        if (typeof rerender === 'function') rerender()
        try {
            const query = typeof appState.cwd === 'string' && appState.cwd !== '' ? '?cwd=' + encodeURIComponent(appState.cwd) : ''
            const data = await api('/diagnostics' + query)
            smDiagnostics.data = data !== null && typeof data === 'object' ? data : null
            smDiagnostics.checkedAt = data !== null && typeof data === 'object' && typeof data.checkedAt === 'number' ? data.checkedAt : 0
            smDiagnostics.error = null
        } catch (failure) {
            smDiagnostics.error = failure !== null && typeof failure === 'object' ? failure : {}
        } finally {
            smDiagnostics.loading = false
            if (typeof rerender === 'function') rerender()
        }
    }

    function smFixLabel(issue) {
        const action = issue !== null && issue !== undefined && issue.fix !== undefined && issue.fix !== null ? issue.fix.action : ''
        if (action === 'remove-link') return t('diag.fix.removeLink')
        if (action === 'open-file') return t('diag.fix.openFile')
        if (action === 'rename') return t('diag.fix.rename')
        if (action === 'view-active') return t('diag.fix.viewActive')
        if (action === 'retry') return t('action.retry')
        return t('action.retry')
    }

    function smOpenSkillDetail(skill) {
        if (skill === null || skill === undefined) return
        setState({ tab: 'installed', view: 'detail', detail: { kind: 'installed', id: skill.id, name: skill.name } })
    }

    function smOpenActiveForIssue(issue) {
        const name = issue !== null && issue !== undefined ? smText(issue.name) : ''
        const active = smFindActiveSkillByName(name)
        if (active !== null) {
            smCloseDiagnostics()
            smOpenSkillDetail(active)
            return
        }
        smPushToast(t('diag.noActive'), { tone: 'error' })
    }

    function smOpenIssueSkill(issue) {
        const name = issue !== null && issue !== undefined ? smText(issue.name) : ''
        const path = issue !== null && issue !== undefined ? smText(issue.path) : ''
        const skill = smFindSkillByName(name) || smFindSkillById(path)
        if (skill !== null) {
            smCloseDiagnostics()
            smOpenSkillDetail(skill)
            return
        }
        if (path !== '') {
            smCopyText(path)
            return
        }
        smPushToast(t('error.notFound'), { tone: 'error' })
    }

    async function smRemoveBrokenLink(issue) {
        const path = issue !== null && issue !== undefined ? smText(issue.path) : ''
        if (path === '') {
            smPushToast(t('error.notFound'), { tone: 'error' })
            return
        }
        try {
            await api('/skill?path=' + encodeURIComponent(path), { method: 'DELETE' })
            smPushToast(t('diag.fixed', { name: smText(issue.name, path) }))
            void loadInstalled(true)
            void smLoadDiagnostics()
        } catch (failure) {
            smPushToast(smErrorMessage(failure), { tone: 'error' })
        }
    }

    function smRunDiagnosticFix(issue) {
        const action = issue !== null && issue !== undefined && issue.fix !== undefined && issue.fix !== null ? issue.fix.action : 'retry'
        if (action === 'view-active') {
            smOpenActiveForIssue(issue)
            return
        }
        if (action === 'open-file') {
            smOpenIssueSkill(issue)
            return
        }
        if (action === 'retry') {
            void smLoadDiagnostics()
            return
        }
        if (action === 'remove-link') {
            void smRemoveBrokenLink(issue)
            return
        }
        if (action === 'rename') {
            const suggested = issue !== null && issue !== undefined ? smText(issue.name) : ''
            if (suggested !== '') smCopyText(suggested)
            smPushToast(t('diag.fix.renameHint', { name: suggested }))
        }
    }

    function SmDiagnosticsDrawer() {
        const data = smDiagnostics.data
        const rawIssues = data !== null && Array.isArray(data.issues) ? data.issues : []
        const issues = rawIssues.filter((issue) => issue !== null && typeof issue === 'object')
        const errors = issues.filter((issue) => issue.severity === 'error').length
        const warnings = issues.filter((issue) => issue.severity !== 'error').length
        const checkedAt = smDiagnostics.checkedAt
        const loading = smDiagnostics.loading || (data === null && smDiagnostics.error === null)

        const body = loading
            ? h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                h('div', { style: { height: '64px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-2)' } }),
                h('div', { style: { height: '64px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-2)' } }),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')),
            )
            : smDiagnostics.error !== null
                ? h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '48px 20px', textAlign: 'center' } },
                    h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
                    h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, t('diag.error')),
                    h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, smErrorMessage(smDiagnostics.error)),
                    h(SmButton, { tone: 'secondary', onClick: () => { void smLoadDiagnostics() } }, t('action.retry')),
                )
                : issues.length === 0
                    ? h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '56px 20px', textAlign: 'center' } },
                        h('span', { style: { color: 'var(--dsw-alias-state-success-primary)' } }, icon('check', 32)),
                        h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, t('diag.none')),
                        h('div', { style: { maxWidth: '340px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } }, t('diag.explain')),
                    )
                    : h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                        SM_DIAG_KINDS.map((meta) => {
                            const group = issues.filter((issue) => issue && issue.kind === meta.kind)
                            if (group.length === 0) return null
                            return h(
                                'div',
                                { key: meta.kind, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                                    h(SmBadge, { tone: meta.tone }, meta.labelKey !== '' ? t(meta.labelKey) : meta.kind),
                                    h('span', null, String(group.length)),
                                ),
                                group.map((issue, index) => h(
                                    'div',
                                    {
                                        key: String(issue.id || meta.kind + '-' + String(index)),
                                        style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            padding: '14px 16px',
                                            borderRadius: '16px',
                                            background: 'var(--dsw-alias-bg-layer-1)',
                                            border: '1px solid var(--dsw-alias-border-l2)',
                                        },
                                    },
                                    h(
                                        'div',
                                        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
                                        h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500 } }, smText(issue.name, issue.kind)),
                                        h(SmBadge, { tone: issue.severity === 'error' ? 'error' : (issue.severity === 'warning' ? 'warn' : 'idle') }, issue.severity === 'error' ? t('diag.error') : (issue.severity === 'warning' ? t('diag.warning') : t('diag.info'))),
                                    ),
                                    h('div', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, smText(issue.path)),
                                    h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } }, smText(issue.message)),
                                    h(
                                        'div',
                                        { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                                        h(SmButton, {
                                            tone: 'secondary',
                                            style: { height: '28px' },
                                            onClick: () => smRunDiagnosticFix(issue),
                                        }, smFixLabel(issue)),
                                        issue.fix !== undefined && issue.fix !== null && typeof issue.fix.hint === 'string' && issue.fix.hint !== ''
                                            ? h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, issue.fix.hint)
                                            : null,
                                    ),
                                )),
                            )
                        }),
                        h('div', { style: { paddingTop: '4px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)', lineHeight: '1.5' } }, t('diag.explain')),
                    )

        return h(
            'div',
            {
                className: 'sm-drawer-backdrop',
                style: { position: 'fixed', inset: 0, zIndex: 1240, background: 'transparent' },
                onMouseDown: (event) => {
                    if (event.target !== event.currentTarget) return
                    if (dialogStack[dialogStack.length - 1] !== 'diagnostics') return
                    smHideTooltip()
                    smCloseDiagnostics()
                },
            },
            h(
                'aside',
                {
                    className: 'sm-drawer sm-diagnostics',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': t('diag.title'),
                    style: {
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1250,
                        width: 'min(560px, 100vw)',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1))',
                        borderLeft: '0.5px solid var(--dsw-alias-border-l2)',
                        boxShadow: 'none',
                    },
                },
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: '20px 24px 16px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
                    h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                        h('h3', { style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('diag.title')),
                        h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                            loading
                                ? t('state.loading')
                                : t('diag.issuesCount', { errors: errors, warnings: warnings }) + ' · ' + t('update.lastChecked', { time: checkedAt > 0 ? fmtTime(checkedAt) : '—' }),
                        ),
                    ),
                    h(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
                        h(SmButton, { tone: 'secondary', style: { height: '28px' }, disabled: loading, onClick: () => { void smLoadDiagnostics() } }, t('diag.recheck')),
                        h('button', {
                            type: 'button',
                            className: 'sm-icon-btn',
                            'aria-label': t('action.close'),
                            onClick: smCloseDiagnostics,
                            style: {
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                border: 'none',
                                borderRadius: '8px',
                                background: 'transparent',
                                color: 'var(--dsw-alias-label-secondary)',
                                cursor: 'pointer',
                            },
                        }, icon('x', 16)),
                    ),
                ),
                h(
                    'div',
                    { style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' } },
                    body,
                ),
            ),
        )
    }

    function renderDiagnosticsDrawer() {
        if (!smDiagnostics.open) return null
        return h(SmDiagnosticsDrawer)
    }
