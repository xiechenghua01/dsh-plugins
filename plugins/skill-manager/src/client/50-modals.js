    /* ------------------------------------------------------------------ *
     * 50-modals.js — 十类模态、诊断抽屉、toast 与 tooltip。               *
     *                                                                    *
     * 宽度档（契约 §5.3 / §7.7）：                                        *
     *   488  new-skill / import-skill / install / add-source             *
     *   480  update / uninstall / delete / confirm-remove-source         *
     *   720  edit-content / preview                                      *
     * 无阴影、遮罩透明、Escape 分层、dialogStack 式的最上层优先。         *
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

    const SM_MODAL_WIDTH = {
        'new-skill': 488,
        'import-skill': 488,
        install: 488,
        'add-source': 488,
        update: 480,
        uninstall: 480,
        delete: 480,
        'confirm-remove-source': 480,
        'edit-content': 720,
        preview: 720,
    }

    /* ------------------------------------------------------------------ *
     * 模态栈、Escape 分层与滚动锁。                                       *
     * ------------------------------------------------------------------ */

    const smModalStack = []
    const smModalGuards = new Map()
    let smModalSeq = 0
    let smScrollLockCount = 0

    /** Element to restore focus to when the modal closes. */
    function smActiveElement() {
        if (typeof document === 'undefined' || document === null) return null
        const active = document.activeElement
        if (active === null || active === undefined || active === document.body) return null
        return active
    }

    function smRestoreFocus(node) {
        if (node === null || node === undefined || typeof node.focus !== 'function') return
        if (typeof document === 'undefined' || document === null) return
        if (typeof document.contains === 'function' && document.contains(node) !== true) return
        const run = function () {
            try {
                node.focus({ preventScroll: true })
            } catch (failure) {
                try { node.focus() } catch (ignored) { void ignored }
            }
        }
        /* Wait one frame so the trigger exists after the modal unmounts. */
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
        else setTimeout(run, 0)
    }

    const smDiagnostics = {
        open: false,
        loading: false,
        error: null,
        data: null,
    }

    function smLockScroll() {
        if (typeof document === 'undefined' || document === null || document.body === undefined || document.body === null) return
        smScrollLockCount += 1
        if (smScrollLockCount === 1) document.body.style.overflow = 'hidden'
    }

    function smUnlockScroll() {
        if (smScrollLockCount <= 0) return
        smScrollLockCount -= 1
        if (smScrollLockCount === 0 && typeof document !== 'undefined' && document !== null && document.body !== undefined && document.body !== null) {
            document.body.style.overflow = ''
        }
    }

    function smSyncModalState() {
        const top = smModalStack.length > 0 ? smModalStack[smModalStack.length - 1] : null
        appState.modal = top === null ? null : { kind: top.kind, payload: top.payload }
    }

    function smNormalizeModalKind(kind, payload) {
        const name = String(kind === undefined || kind === null ? '' : kind)
        if (name === 'new') return 'new-skill'
        if (name === 'import') return 'import-skill'
        if (name === 'confirm-uninstall') return 'uninstall'
        if (name === 'remove-source' || name === 'delete-source') return 'confirm-remove-source'
        if (name === 'confirm-delete') {
            const mode = payload !== null && typeof payload === 'object' ? String(payload.mode === undefined ? payload.kind : payload.mode) : ''
            if (mode === 'uninstall') return 'uninstall'
            if (mode === 'delete') return 'delete'
            const skill = payload !== null && typeof payload === 'object' ? payload.skill : null
            if (skill !== null && typeof skill === 'object' && smText(skill.sourceId) !== '') return 'uninstall'
            return 'delete'
        }
        return name
    }

    function openModal(kind, payload) {
        const source = payload !== null && typeof payload === 'object' ? payload : {}
        const name = smNormalizeModalKind(kind, source)
        smModalSeq += 1
        smModalStack.push({ id: smModalSeq, kind: name, payload: source, returnFocus: smActiveElement() })
        smLockScroll()
        smHideTooltip()
        smSyncModalState()
        if (typeof rerender === 'function') rerender()
    }

    function smRemoveModalById(id) {
        let removed = null
        let wasTop = false
        for (let index = smModalStack.length - 1; index >= 0; index -= 1) {
            if (smModalStack[index].id !== id) continue
            wasTop = index === smModalStack.length - 1
            removed = smModalStack.splice(index, 1)[0]
            smModalGuards.delete(id)
            smUnlockScroll()
            break
        }
        smHideTooltip()
        smSyncModalState()
        if (typeof rerender === 'function') rerender()
        if (wasTop && removed !== null) smRestoreFocus(removed.returnFocus)
    }

    /** 强制关闭最上层；提交成功后的路径使用它。 */
    function closeModal() {
        if (smModalStack.length === 0) return
        smRemoveModalById(smModalStack[smModalStack.length - 1].id)
    }

    /** 用户触发的关闭（Esc / 取消 / 遮罩）：先询问模态自己的守卫。 */
    function smRequestCloseModal(id) {
        const target = id === undefined || id === null ? (smModalStack.length > 0 ? smModalStack[smModalStack.length - 1] : null) : smModalStack[smModalStack.length - 1]
        if (target === null || target === undefined) return
        const guard = smModalGuards.get(target.id)
        if (typeof guard === 'function') {
            try {
                if (guard() === true) return
            } catch (failure) {
                /* a failing guard must not trap the user */
            }
        }
        smRemoveModalById(target.id)
    }

    function smHasOpenOverlay() {
        return smModalStack.length > 0 || smDiagnostics.open === true || appState.sourceDialogOpen === true || (appState.modal !== null && appState.modal !== undefined)
    }

    function smHandleEscape(event) {
        if (event.key !== 'Escape') return
        /* 更早注册的层（例如管理源弹窗）已经处理过这一层。 */
        if (event.defaultPrevented === true) return
        if (smModalStack.length > 0) {
            event.preventDefault()
            event.stopPropagation()
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
            smRequestCloseModal()
            return
        }
        /* 管理源弹窗叠在诊断抽屉之上时，先让 30-source-dialog 处理这一层。 */
        if (appState.sourceDialogOpen === true) return
        if (smDiagnostics.open === true) {
            event.preventDefault()
            event.stopPropagation()
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
            smCloseDiagnostics()
        }
    }

    function smFocusableIn(node) {
        if (node === null || node === undefined || typeof node.querySelectorAll !== 'function') return []
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        return Array.prototype.slice.call(node.querySelectorAll(selector)).filter(function (item) {
            if (item.disabled === true) return false
            if (item.getAttribute('aria-hidden') === 'true') return false
            return true
        })
    }

    /** 管理源弹窗的 Tab 循环：首尾互跳，焦点不逃出对话框。 */
    function smHandleSourceDialogTab(event) {
        if (event.key !== 'Tab') return
        if (appState.sourceDialogOpen !== true) return
        /* 上层模态打开时，由 SmDialogFrame 自己的焦点锁定接管。 */
        if (smModalStack.length > 0) return
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const node = document.querySelector('.sm-source-dialog')
        if (node === null) return
        const focusable = smFocusableIn(node)
        if (focusable.length === 0) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            if (typeof node.focus === 'function') {
                try { node.focus({ preventScroll: true }) } catch (failure) { void failure }
            }
            return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const index = focusable.indexOf(document.activeElement)
        if (event.shiftKey) {
            if (index <= 0) {
                if (typeof event.preventDefault === 'function') event.preventDefault()
                last.focus()
            }
        } else if (index === -1 || index === focusable.length - 1) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            first.focus()
        }
    }

    if (typeof document !== 'undefined' && document !== null && typeof document.addEventListener === 'function') {
        document.addEventListener('keydown', smHandleEscape, true)
        document.addEventListener('keydown', smHandleSourceDialogTab, true)
    }

    /** 注册 Esc / 遮罩关闭守卫；返回 true 表示组件自己处理了这次关闭。 */
    function smUseModalGuard(modalId, handler) {
        const ref = useRef(handler)
        ref.current = handler
        useEffect(function () {
            const guard = function () {
                const fn = ref.current
                if (typeof fn !== 'function') return false
                try {
                    return fn() === true
                } catch (failure) {
                    return false
                }
            }
            smModalGuards.set(modalId, guard)
            return function () { smModalGuards.delete(modalId) }
        }, [modalId])
    }

    function renderModalLayer() {
        if (smModalStack.length === 0) return null
        return h(Fragment, null, smModalStack.map(function (entry, index) {
            return h(SmModalHost, {
                key: String(entry.id),
                entry: entry,
                isTop: index === smModalStack.length - 1,
                layerIndex: index,
            })
        }))
    }

    function SmModalHost(props) {
        const entry = props.entry
        const shared = { modalId: entry.id, isTop: props.isTop === true, layerIndex: props.layerIndex, payload: entry.payload }
        if (entry.kind === 'new-skill') return h(SmNewSkillModal, shared)
        if (entry.kind === 'import-skill') return h(SmImportModal, shared)
        if (entry.kind === 'install') return h(SmInstallModal, shared)
        if (entry.kind === 'update') return h(SmUpdateModal, shared)
        if (entry.kind === 'uninstall') return h(SmUninstallModal, shared)
        if (entry.kind === 'delete') return h(SmDeleteModal, shared)
        if (entry.kind === 'add-source') return h(SmAddSourceModal, shared)
        if (entry.kind === 'edit-content') return h(SmEditContentModal, shared)
        if (entry.kind === 'preview') return h(SmPreviewModal, shared)
        if (entry.kind === 'confirm-remove-source') return h(SmConfirmRemoveSourceModal, shared)
        return h(SmDialogFrame, {
            isTop: props.isTop === true,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('error.unexpected'),
            footer: h(SmFooter, null),
        }, h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('error.unexpected')))
    }

    /* ------------------------------------------------------------------ *
     * Toast host（读取 appState.toasts；同一时刻只显示最新一条）。        *
     * ------------------------------------------------------------------ */

    function smNormalizeToast(item, index) {
        if (typeof item === 'string') return { id: 'ext-' + String(index), message: item, tone: 'info', actionLabel: '', onAction: null }
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

    function renderToastHost() {
        if (!Array.isArray(appState.toasts) || appState.toasts.length === 0) return null
        const normalized = smNormalizeToast(appState.toasts[appState.toasts.length - 1], appState.toasts.length - 1)
        if (normalized === null) return null
        const toneColor = normalized.tone === 'error'
            ? 'var(--dsw-alias-state-error-primary)'
            : (normalized.tone === 'info' ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-state-success-primary)')
        return h('div', {
            className: 'sm-toast-host',
            style: { position: 'fixed', left: '50%', bottom: '20px', transform: 'translateX(-50%)', zIndex: 2100, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 'min(480px, calc(100vw - 32px))', pointerEvents: 'none' },
        },
        h('div', {
            className: 'sm-toast sm-toast-' + normalized.tone,
            role: 'status',
            'aria-live': 'polite',
            style: { display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '100%', padding: '10px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '18px', boxShadow: 'none', pointerEvents: 'auto' },
        },
        h('span', { style: { flexShrink: 0, color: toneColor } }, icon(normalized.tone === 'error' ? 'alert' : (normalized.tone === 'info' ? 'info' : 'check'), 16)),
        h('span', { style: { minWidth: 0, wordBreak: 'break-word' } }, normalized.message),
        normalized.actionLabel !== '' && normalized.onAction !== null
            ? h('button', {
                type: 'button',
                className: 'sm-toast-action',
                onClick: function () {
                    try {
                        normalized.onAction()
                    } finally {
                        smDismissToast(normalized.id)
                    }
                },
                style: { flexShrink: 0, height: '24px', padding: '0 6px', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500, cursor: 'pointer' },
            }, normalized.actionLabel)
            : null))
    }

    function smDismissToast(id) {
        if (!Array.isArray(appState.toasts)) return
        const next = appState.toasts.filter(function (item) { return item !== null && item !== undefined && item.id !== id })
        if (next.length === appState.toasts.length) return
        appState.toasts = next
        if (typeof rerender === 'function') rerender()
    }

    /* ------------------------------------------------------------------ *
     * Tooltip：反色、300ms、元素 id 固定 `tooltip`（选择器 #tooltip）。    *
     * ------------------------------------------------------------------ */

    const smTooltipState = { timer: null, target: null, label: '', node: null }

    function smEnsureTooltipNode() {
        if (typeof document === 'undefined' || document === null) return null
        if (smTooltipState.node !== null && document.body.contains(smTooltipState.node)) return smTooltipState.node
        const node = document.createElement('div')
        node.id = 'tooltip'
        node.className = 'sm-tooltip'
        node.setAttribute('role', 'tooltip')
        node.style.cssText = 'position:fixed;left:0;top:0;z-index:2000;max-width:290px;padding:6px 10px;border-radius:var(--dsw-radius-sm);border:none;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font-size:calc(var(--sm-fs) - 4px);line-height:1.35;box-shadow:none;pointer-events:none;opacity:0;visibility:hidden;white-space:normal;'
        const root = document.querySelector('.sm-root')
        let scale = ''
        if (root !== null && typeof getComputedStyle === 'function') scale = getComputedStyle(root).getPropertyValue('--sm-fs').trim()
        node.style.setProperty('--sm-fs', scale !== '' ? scale : '14px')
        document.body.appendChild(node)
        smTooltipState.node = node
        return node
    }

    function smHideTooltip() {
        if (smTooltipState.timer !== null) {
            clearTimeout(smTooltipState.timer)
            smTooltipState.timer = null
        }
        smTooltipState.target = null
        smTooltipState.label = ''
        if (smTooltipState.node !== null && smTooltipState.node !== undefined) {
            /* 样式表里 `.sm-tooltip.visible` 会把 opacity 拉回 1，必须移除。 */
            if (smTooltipState.node.classList !== null && smTooltipState.node.classList !== undefined &&
                typeof smTooltipState.node.classList.remove === 'function') {
                smTooltipState.node.classList.remove('visible')
                smTooltipState.node.classList.remove('show')
            }
            smTooltipState.node.style.opacity = '0'
            smTooltipState.node.style.visibility = 'hidden'
        }
    }

    /** 目标被卸载时 mouseout 不会触发：渲染提交后主动核对一次。 */
    function smHideTooltipIfTargetGone() {
        const target = smTooltipState.target
        if (target === null || target === undefined) return
        if (typeof document === 'undefined' || document === null) {
            smHideTooltip()
            return
        }
        const body = document.body
        if (body !== null && body !== undefined && typeof body.contains === 'function' && body.contains(target)) return
        smHideTooltip()
    }

    function smPlaceTooltip() {
        const target = smTooltipState.target
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
        node.textContent = smTooltipState.label
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
        smTooltipState.target = target
        smTooltipState.label = text
        smTooltipState.timer = setTimeout(function () {
            smTooltipState.timer = null
            smPlaceTooltip()
        }, 300)
    }

    function smTip(label) {
        const text = label === null || label === undefined ? '' : String(label)
        if (text === '') return {}
        return {
            onMouseEnter: function (event) { smScheduleTooltip(text, event.currentTarget) },
            onMouseLeave: function () { smHideTooltip() },
            onMouseDown: function () { smHideTooltip() },
            onFocus: function (event) { smScheduleTooltip(text, event.currentTarget) },
            onBlur: function () { smHideTooltip() },
        }
    }

    function SmTooltipLifecycle() {
        useEffect(function () {
            smEnsureTooltipNode()
            return function () {
                smHideTooltip()
                if (smTooltipState.node !== null && smTooltipState.node.parentNode !== null && smTooltipState.node.parentNode !== undefined) {
                    smTooltipState.node.parentNode.removeChild(smTooltipState.node)
                }
                smTooltipState.node = null
            }
        }, [])
        return null
    }

    /** 每次渲染提交后核对 hover 目标是否还在 DOM 中（卸载后 mouseout 不触发）。 */
    function SmTooltipGuard() {
        useEffect(function () {
            smHideTooltipIfTargetGone()
        })
        return null
    }

    function renderTooltipLayer() {
        return h(Fragment, null, h(SmTooltipLifecycle), h(SmTooltipGuard))
    }

    /* ------------------------------------------------------------------ *
     * 弹窗外壳与表单原语。                                               *
     * ------------------------------------------------------------------ */

    function SmDialogFrame(props) {
        const confirm = props.confirm === true
        /* 三档：480 确认 / 488 表单 / 720 大内容。 */
        const width = props.width === 720 ? 720
            : (props.width === 480 ? 480 : 488)
        const layerIndex = typeof props.layerIndex === 'number' ? props.layerIndex : 0
        const boxRef = useRef(null)
        const close = function () {
            if (typeof props.onRequestClose === 'function') props.onRequestClose()
            else smRequestCloseModal(props.modalId)
        }

        useEffect(function () {
            const node = boxRef.current
            if (node === null || typeof node.querySelector !== 'function') return
            let field = node.querySelector('input, textarea, select')
            if (field === null) field = node.querySelector('button')
            if (field !== null && typeof field.focus === 'function') {
                try {
                    field.focus({ preventScroll: true })
                } catch (failure) {
                    /* focus is best effort */
                }
            }
        }, [])

        const onKeyDown = function (event) {
            if (typeof props.onKeyDown === 'function' && props.onKeyDown(event) === true) return
            if (event.key !== 'Tab') return
            const node = boxRef.current
            if (node === null || typeof node.querySelectorAll !== 'function') return
            const focusable = Array.prototype.slice.call(node.querySelectorAll('button, input, textarea, select, [tabindex="0"]'))
                .filter(function (item) { return item.disabled !== true && item.getAttribute('aria-hidden') !== 'true' })
            if (focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        /* 每档都不超过视口（两侧各留 16px），窄窗口下跟着 100vw - 32px 收缩。 */
        const widthStyle = 'min(' + String(width) + 'px, calc(100vw - 32px))'
        const maxHeightStyle = width === 720
            ? 'min(720px, calc(100vh - 96px))'
            : 'calc(100vh - 48px)'

        return h('div', {
            className: 'sm-dialog-mask sm-modal-backdrop',
            style: { position: 'fixed', inset: 0, zIndex: 1300 + layerIndex * 2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'transparent' },
            onMouseDown: function (event) {
                if (event.target !== event.currentTarget) return
                if (props.isTop !== true) return
                close()
            },
        },
        h('div', {
            ref: boxRef,
            className: cx('sm-dialog', confirm && 'sm-dialog-confirm', width === 720 && 'sm-dialog-large', width === 488 && 'sm-dialog-form'),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            'aria-hidden': props.isTop === true ? undefined : 'true',
            onKeyDown: onKeyDown,
            style: {
                width: widthStyle,
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: maxHeightStyle,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: confirm ? 'var(--dsw-radius-xl)' : 'var(--dsw-radius-panel)',
                border: '.5px solid var(--dsw-alias-border-inverted)',
                background: 'var(--dsw-alias-bg-layer-1)',
                boxShadow: 'none',
                pointerEvents: props.isTop === true ? 'auto' : 'none',
            },
        },
        h('div', {
            className: 'sm-dialog-head',
            style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: confirm ? '20px 20px 0' : '20px 24px 0' },
        },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
            h('h3', { style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 1px)', lineHeight: '1.4', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.title),
            props.subtitle !== undefined && props.subtitle !== null && props.subtitle !== ''
                ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.subtitle)
                : null),
        confirm
            ? null
            : h('button', {
                type: 'button',
                className: 'sm-icon-btn sm-dialog-close',
                'aria-label': t('action.close'),
                'data-tip': t('action.close'),
                onClick: close,
            }, icon('x', 16))),
        h('div', {
            className: 'sm-dialog-body',
            style: { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: confirm ? '12px' : '16px', padding: confirm ? '12px 20px 12px' : '38px 24px 20px' },
        }, props.children),
        props.footer === undefined || props.footer === null
            ? null
            : h('div', {
                className: 'sm-dialog-foot',
                style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: confirm ? '0 20px 20px' : '12px 24px', borderTop: confirm ? 'none' : '1px solid var(--dsw-alias-border-l2)', flexShrink: 0 },
            }, props.footer)))
    }

    function SmFooter(props) {
        return h(Fragment, null,
            h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
            props.children)
    }

    function SmField(props) {
        return h('div', { className: 'sm-field', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' } },
                h('span', { style: { fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.label),
                props.hint ? h('span', { style: { fontSize: 'calc(var(--sm-fs) - 3px)', color: 'var(--dsw-alias-label-caption)' } }, props.hint) : null),
            props.children,
            props.error ? h('div', { className: 'sm-form-error', style: { fontSize: 'calc(var(--sm-fs) - 2px)', color: 'var(--dsw-alias-state-error-primary)' } }, props.error) : null)
    }

    function SmBanner(props) {
        const tone = props.tone === undefined || props.tone === null ? 'info' : String(props.tone)
        const color = tone === 'error'
            ? 'var(--dsw-alias-state-error-primary)'
            : (tone === 'warn' ? 'var(--dsw-alias-state-warn-primary)' : (tone === 'ok' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-secondary)'))
        return h('div', {
            className: 'sm-banner sm-banner-' + tone,
            style: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid ' + color, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' },
        }, props.children)
    }

    function SmSegmented(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h('div', { role: 'tablist', style: { display: 'inline-flex', gap: '2px', padding: '2px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-3)', alignSelf: 'flex-start' } },
            options.map(function (option) {
                const selected = props.value === option.value
                return h('button', {
                    key: option.value,
                    type: 'button',
                    role: 'tab',
                    'aria-selected': selected,
                    disabled: option.disabled === true,
                    onClick: function () {
                        if (option.disabled === true) return
                        if (typeof props.onChange === 'function') props.onChange(option.value)
                    },
                    style: { height: '28px', padding: '0 10px', border: 'none', borderRadius: '14px', cursor: option.disabled === true ? 'not-allowed' : 'pointer', background: selected ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent', color: selected ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-tertiary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: selected ? 500 : 400, opacity: option.disabled === true ? 0.5 : 1 },
                }, option.label)
            }))
    }

    function SmRadioOptions(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            options.map(function (option) {
                const selected = props.value === option.value
                return h('label', {
                    key: option.value,
                    style: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '10px', border: '1px solid ' + (selected ? 'var(--dsw-alias-border-inverted)' : 'var(--dsw-alias-border-l2)'), background: selected ? 'var(--dsw-alias-interactive-bg-hover)' : 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', opacity: option.disabled === true ? 0.5 : 1, cursor: option.disabled === true ? 'not-allowed' : 'pointer' },
                },
                h('input', {
                    type: 'radio',
                    name: props.name || 'sm-radio',
                    value: option.value,
                    checked: selected,
                    disabled: option.disabled === true,
                    onChange: function () {
                        if (option.disabled !== true && typeof props.onChange === 'function') props.onChange(option.value)
                    },
                    style: { marginTop: '2px', flexShrink: 0 },
                }),
                h('span', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                    h('span', { style: { wordBreak: 'break-word' } }, option.label),
                    option.hint ? h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, option.hint) : null))
            }))
    }

    function smSaveTargetCategory(location) {
        if (location === 'user-agents') return 'shared'
        if (location === 'project-dsh') return 'project'
        return 'mine'
    }

    function smNameTaken(name, location) {
        const category = smSaveTargetCategory(location)
        return smSkillList().some(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.name === name && smSkillCategory(skill) === category
        })
    }

    function smDefaultLocation(payload) {
        if (payload !== null && typeof payload === 'object') {
            if (typeof payload.location === 'string' && payload.location !== '') return payload.location
            if (payload.category === 'shared') return 'user-agents'
            if (payload.category === 'project') return 'project-dsh'
        }
        return 'user-dsh'
    }

    /* ------------------------------------------------------------------ *
     * 1. 新建技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmNewSkillModal(props) {
        const payload = props.payload
        const [name, setName] = useState('')
        const [description, setDescription] = useState('')
        const [whenToUse, setWhenToUse] = useState('')
        const [body, setBody] = useState('')
        const [location, setLocation] = useState(smDefaultLocation(payload))
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const trimmedName = name.trim()
        let nameError = ''
        if (trimmedName !== '' && (!SM_NAME_PATTERN.test(trimmedName) || trimmedName.length > 64)) nameError = t('form.name.invalid')
        else if (trimmedName !== '' && smNameTaken(trimmedName, location)) nameError = t('form.name.taken')
        const projectBlocked = location === 'project-dsh' && !smProjectAvailable()
        const canSubmit = trimmedName !== '' && nameError === '' && description.trim() !== '' && body.trim() !== '' && !projectBlocked && !busy

        const submit = async function () {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const request = { location: location, name: trimmedName, description: description.trim(), body: body }
            if (whenToUse.trim() !== '') request.whenToUse = whenToUse.trim()
            try {
                await api('skill', { method: 'POST', body: request })
                setBusy(false)
                toast(t('toast.created', { name: trimmedName }))
                closeModal()
                setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('form.new.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: function () { void submit() } }, t('action.create'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    void submit()
                    return true
                }
                return false
            },
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmField, { label: t('form.name'), hint: t('form.name.placeholder'), error: nameError },
            h('input', {
                type: 'text',
                className: 'sm-mono',
                value: name,
                placeholder: t('form.name.placeholder'),
                onChange: function (event) { setName(event.target.value); setServerError('') },
                style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO }),
            })),
        h(SmField, { label: t('form.description') },
            h('input', {
                type: 'text',
                value: description,
                placeholder: t('form.description.placeholder'),
                onChange: function (event) { setDescription(event.target.value); setServerError('') },
                style: SM_INPUT_STYLE,
            })),
        h(SmField, { label: t('form.whenToUse') },
            h('input', {
                type: 'text',
                value: whenToUse,
                onChange: function (event) { setWhenToUse(event.target.value) },
                style: SM_INPUT_STYLE,
            })),
        h(SmField, { label: t('form.saveTo') },
            h(SmSegmented, { value: location, onChange: setLocation, options: smSaveTargets() }),
            projectBlocked ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('form.projectUnavailable')) : null),
        h(SmField, { label: t('form.body') },
            h('textarea', {
                value: body,
                placeholder: t('form.body.placeholder'),
                onChange: function (event) { setBody(event.target.value); setServerError('') },
                style: Object.assign({}, SM_TEXTAREA_STYLE, { minHeight: '140px' }),
            })))
    }

    /* ------------------------------------------------------------------ *
     * 2. 导入技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmImportModal(props) {
        const [mode, setMode] = useState('paste')
        const [content, setContent] = useState('')
        const [dirPath, setDirPath] = useState('')
        const [location, setLocation] = useState(smDefaultLocation(props.payload))
        const [parsed, setParsed] = useState(null)
        const [parseError, setParseError] = useState('')
        const [parsing, setParsing] = useState(false)
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const parse = async function () {
            if (content.trim() === '') {
                setParseError(t('form.body.required'))
                setParsed(null)
                return
            }
            setParsing(true)
            setParseError('')
            setParsed(null)
            try {
                const result = await api('validate', { method: 'POST', body: { content: content } })
                if (result !== null && typeof result === 'object' && result.valid === true) setParsed(result)
                else setParseError(t('form.import.invalid', { reason: result !== null && typeof result === 'object' && typeof result.error === 'string' ? result.error : t('error.unexpected') }))
            } catch (failure) {
                setParseError(smErrorMessage(failure))
            } finally {
                setParsing(false)
            }
        }

        const canSubmit = (mode === 'paste' ? content.trim() !== '' : dirPath.trim() !== '') && !busy
        const submit = async function () {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const request = { mode: mode, location: location }
            if (mode === 'paste') request.content = content
            else request.dirPath = dirPath.trim()
            try {
                const result = await api('import', { method: 'POST', body: request })
                const imported = result !== null && typeof result === 'object' && result.skill !== undefined && result.skill !== null ? result.skill : null
                const files = result !== null && typeof result === 'object' && typeof result.files === 'number' ? result.files : 0
                setBusy(false)
                toast(t('toast.imported', { name: imported !== null ? smText(imported.name) : '', count: files }))
                closeModal()
                setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('form.import.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: function () { void submit() } }, t('action.import'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    void submit()
                    return true
                }
                return false
            },
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmSegmented, {
            value: mode,
            onChange: function (value) { setMode(value); setParseError(''); setParsed(null) },
            options: [
                { value: 'paste', label: t('form.import.paste') },
                { value: 'dir', label: t('form.import.dir') },
            ],
        }),
        mode === 'paste'
            ? h(Fragment, null,
                h(SmField, {
                    label: t('form.import.paste'),
                    hint: h('button', {
                        type: 'button',
                        className: 'sm-link-btn',
                        onClick: function () { void parse() },
                        style: { height: '24px', padding: '0 6px', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 2px)', cursor: 'pointer' },
                    }, parsing ? t('state.validating') : t('action.parse')),
                },
                h('textarea', {
                    value: content,
                    placeholder: t('form.import.paste.placeholder'),
                    onChange: function (event) { setContent(event.target.value); setParsed(null); setParseError('') },
                    style: Object.assign({}, SM_TEXTAREA_STYLE, { minHeight: '160px' }),
                })),
                parseError !== '' ? h(SmBanner, { tone: 'error' }, parseError) : null,
                parsed !== null
                    ? h(SmBanner, { tone: 'ok' },
                        h('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontWeight: 500 } }, t('form.import.parsed')),
                        h('span', null, t('form.name') + ': ' + smText(parsed.name, '—')),
                        h('span', null, t('form.description') + ': ' + smText(parsed.description, '—')),
                        typeof parsed.files === 'number' ? h('span', null, t('form.import.preview', { count: parsed.files })) : null)
                    : null)
            : h(Fragment, null,
                h(SmField, { label: t('form.import.dir') },
                    h('input', {
                        type: 'text',
                        className: 'sm-mono',
                        value: dirPath,
                        placeholder: t('form.import.dir.placeholder'),
                        onChange: function (event) { setDirPath(event.target.value) },
                        style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO }),
                    }))),
        h(SmField, { label: t('form.saveTo') },
            h(SmSegmented, { value: location, onChange: setLocation, options: smSaveTargets() })))
    }

    /* ------------------------------------------------------------------ *
     * 3. 安装技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmInstallModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const initialMarket = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const [market, setMarket] = useState(initialMarket)
        const [versions, setVersions] = useState([])
        const [loading, setLoading] = useState(initialMarket === null)
        const [loadError, setLoadError] = useState('')
        const [reloadTick, setReloadTick] = useState(0)
        const [location, setLocation] = useState(smDefaultLocation(payload))
        const [conflictChoice, setConflictChoice] = useState('')
        const [busy, setBusy] = useState(false)
        const [stage, setStage] = useState(0)
        const [error, setError] = useState('')
        const [confirmCancel, setConfirmCancel] = useState(false)
        const timerRef = useRef(null)
        const abortRef = useRef(null)
        const canceledRef = useRef(false)

        smUseModalGuard(props.modalId, function () {
            if (confirmCancel) {
                setConfirmCancel(false)
                return true
            }
            if (!busy) return false
            setConfirmCancel(true)
            return true
        })

        useEffect(function () {
            if (market !== null) return undefined
            let alive = true
            const sourceId = smText(payload.sourceId)
            const name = smText(payload.name)
            if (sourceId === '' || name === '') {
                setLoading(false)
                setLoadError(t('install.unavailable'))
                return undefined
            }
            setLoading(true)
            setLoadError('')
            api('market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name)).then(function (data) {
                if (!alive) return
                setMarket(data !== null && typeof data === 'object' && data.skill !== undefined ? data.skill : null)
                setVersions(data !== null && typeof data === 'object' && Array.isArray(data.versions) ? data.versions : [])
                setLoading(false)
            }).catch(function (failure) {
                if (!alive) return
                setLoadError(smErrorMessage(failure))
                setLoading(false)
            })
            return function () { alive = false }
        }, [reloadTick])

        useEffect(function () {
            return function () {
                if (timerRef.current !== null) clearInterval(timerRef.current)
                if (abortRef.current !== null) abortRef.current.abort()
            }
        }, [])

        const version = market !== null ? smText(market.version) : ''
        const conflict = market !== null && smSkillList().some(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.name === market.name && smSkillCategory(skill) === smSaveTargetCategory(location)
        })

        const changeLocation = function () {
            if (market === null) return
            const candidates = ['user-dsh', 'user-agents', 'project-dsh']
            for (let index = 0; index < candidates.length; index += 1) {
                const candidate = candidates[index]
                if (candidate === location) continue
                if (candidate === 'project-dsh' && !smProjectAvailable()) continue
                const taken = smSkillList().some(function (skill) {
                    return skill !== null && typeof skill === 'object' && skill.name === market.name && smSkillCategory(skill) === smSaveTargetCategory(candidate)
                })
                if (!taken) {
                    setLocation(candidate)
                    setConflictChoice('')
                    return
                }
            }
            toast(t('error.pathOutside'), { tone: 'error' })
        }

        const cancelInstall = function () {
            canceledRef.current = true
            if (abortRef.current !== null) {
                abortRef.current.abort()
                abortRef.current = null
            }
            if (timerRef.current !== null) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            setBusy(false)
            setStage(0)
            setConfirmCancel(false)
            setError(t('error.canceled'))
        }

        const submit = async function () {
            if (market === null || busy) return
            if (conflict && conflictChoice === '') return
            canceledRef.current = false
            setBusy(true)
            setStage(0)
            setError('')
            setConfirmCancel(false)
            if (timerRef.current !== null) clearInterval(timerRef.current)
            timerRef.current = setInterval(function () {
                setStage(function (previous) { return previous < 1 ? previous + 1 : previous })
            }, 700)
            const controller = new AbortController()
            abortRef.current = controller
            const request = { sourceId: market.sourceId, name: market.name, version: version, location: location }
            if (conflict) request.conflict = conflictChoice === 'skip' ? 'skip' : 'overwrite'
            try {
                const result = await api('market/install', { method: 'POST', body: request, signal: controller.signal })
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                abortRef.current = null
                setBusy(false)
                setStage(2)
                const created = result !== null && typeof result === 'object' && result.skill !== undefined ? result.skill : null
                toast(t('install.success', { name: market.name }), {
                    actionLabel: t('action.viewInstalled'),
                    onAction: function () {
                        const category = smSaveTargetCategory(location)
                        void loadInstalled(true).then(function () {
                            if (created !== null && typeof created === 'object' && typeof created.id === 'string') {
                                setState({ tab: 'skills', category: category, view: 'detail', detail: { kind: 'installed', id: created.id } })
                            } else {
                                setState({ tab: 'skills', category: category, view: 'list', detail: null })
                            }
                        })
                    },
                })
                closeModal()
                setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                void loadInstalled(true)
                void loadMarket()
            } catch (failure) {
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                abortRef.current = null
                setBusy(false)
                setStage(0)
                if (canceledRef.current === true || (failure !== null && typeof failure === 'object' && failure.code === 'E_CANCELED')) {
                    setError(t('error.canceled'))
                } else {
                    setError(smErrorMessage(failure))
                }
            }
        }

        if (loading) {
            return h(SmDialogFrame, { modalId: props.modalId, isTop: props.isTop, layerIndex: props.layerIndex, width: 488, title: t('install.title'), footer: h(SmFooter, null) },
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')))
        }
        if (market === null) {
            return h(SmDialogFrame, { modalId: props.modalId, isTop: props.isTop, layerIndex: props.layerIndex, width: 488, title: t('install.title'), footer: h(SmFooter, null, h(SmButton, { tone: 'secondary', onClick: function () { setReloadTick(function (value) { return value + 1 }) } }, t('action.retry'))) },
                h(SmBanner, { tone: 'error' }, loadError !== '' ? loadError : t('install.unavailable')))
        }

        const stageLabel = stage === 0 ? t('install.progress.preparing') : t('install.progress.verifying')

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('install.title'),
            subtitle: smText(market.name),
            footer: busy
                ? h(Fragment, null,
                    h(SmButton, { tone: 'secondary', onClick: function () { setConfirmCancel(true) } }, t('action.cancel')),
                    h(SmButton, { tone: 'primary', disabled: true }, t('state.installing')))
                : h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: conflict && conflictChoice === '', onClick: function () { void submit() } }, t('action.install'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        confirmCancel
            ? h(SmBanner, { tone: 'warn' },
                h('span', { style: { fontWeight: 500 } }, t('install.cancelConfirm.title')),
                h('span', null, t('install.cancelConfirm.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmCancel(false) } }, t('action.cancel')),
                    h(SmButton, { tone: 'danger', style: { height: '28px' }, onClick: cancelInstall }, t('install.cancelConfirm.ok'))))
            : null,
        h(SmField, { label: t('install.target') },
            h(SmSegmented, { value: location, onChange: function (value) { setLocation(value); setConflictChoice('') }, options: smSaveTargets() })),
        h(SmField, { label: t('install.version') },
            h('div', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, version === '' ? '—' : (version.charAt(0) === 'v' ? version : 'v' + version))),
        conflict
            ? h(SmBanner, { tone: 'warn' },
                h('span', { style: { fontWeight: 500 } }, t('install.conflict')),
                h(SmRadioOptions, {
                    name: 'install-conflict',
                    value: conflictChoice,
                    onChange: setConflictChoice,
                    options: [
                        { value: 'overwrite', label: t('install.conflict.overwrite') },
                        { value: 'skip', label: t('install.conflict.skip') },
                    ],
                }),
                h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: changeLocation }, t('install.conflict.changeTarget')))
            : null,
        busy
            ? h('div', { role: 'progressbar', 'aria-busy': 'true', style: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)' } },
                h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, stageLabel),
                h('div', { style: { width: '100%', height: '6px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-3)', overflow: 'hidden' } },
                    h('div', { style: { width: stage === 0 ? '40%' : '82%', height: '100%', background: 'var(--dsw-alias-label-primary)', transition: 'width 220ms' } })))
            : null)
    }

    /* ------------------------------------------------------------------ *
     * 4. 更新确认（480，单个 / 全部）                                    *
     * ------------------------------------------------------------------ */

    function smUpdateTargets(payload) {
        const list = []
        const push = function (skill) {
            if (skill === null || typeof skill !== 'object') return
            if (skill.status === 'disabled' || skill.writable === false || smIsBuiltin(skill)) return
            if (smSkillUpdateVersion(skill) === '') return
            if (list.some(function (item) { return item.id === skill.id })) return
            list.push(skill)
        }
        if (payload !== null && typeof payload === 'object') {
            if (Array.isArray(payload.skills)) payload.skills.forEach(push)
            else if (payload.all === true) smSkillList().forEach(push)
            else if (payload.skill !== null && payload.skill !== undefined) push(payload.skill)
        }
        return list
    }

    function SmUpdateModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const initialTargets = smUpdateTargets(payload)
        const batch = initialTargets.length > 1 || payload.all === true
        const [targets, setTargets] = useState(initialTargets)
        const [phase, setPhase] = useState('confirm')
        const [done, setDone] = useState(0)
        const [failed, setFailed] = useState([])
        const [okCount, setOkCount] = useState(0)
        const [error, setError] = useState('')
        const [confirmCancel, setConfirmCancel] = useState(false)
        const cancelRef = useRef(false)
        const abortRef = useRef(null)

        smUseModalGuard(props.modalId, function () {
            if (confirmCancel) {
                setConfirmCancel(false)
                return true
            }
            if (phase !== 'running') return false
            setConfirmCancel(true)
            return true
        })

        const modifiedCount = targets.filter(function (skill) { return smSkillLocalModified(skill) }).length
        const updateOne = async function (skill) {
            const version = smSkillUpdateVersion(skill)
            await api('market/update', {
                method: 'POST',
                body: { sourceId: smText(skill.sourceId), name: smText(skill.name), version: version, location: smText(skill.location) },
                signal: abortRef.current !== null ? abortRef.current.signal : undefined,
            })
        }

        const run = async function (queue) {
            setPhase('running')
            setDone(0)
            setOkCount(0)
            setFailed([])
            setError('')
            setConfirmCancel(false)
            cancelRef.current = false
            let ok = 0
            const failures = []
            for (let index = 0; index < queue.length; index += 1) {
                if (cancelRef.current) break
                const skill = queue[index]
                try {
                    await updateOne(skill)
                    ok += 1
                } catch (failure) {
                    if (cancelRef.current === true || (failure !== null && typeof failure === 'object' && failure.code === 'E_CANCELED')) break
                    failures.push({ skill: skill, reason: smErrorMessage(failure) })
                }
                setDone(index + 1)
                setOkCount(ok)
                setFailed(failures.slice())
            }
            abortRef.current = null
            if (cancelRef.current === true && ok === 0 && failures.length === 0) setError(t('error.canceled'))
            if (cancelRef.current !== true && !batch && queue.length === 1 && failures.length === 0) {
                toast(t('update.success', { version: smSkillUpdateVersion(queue[0]) }))
                void loadInstalled(true)
                void loadUpdates(true)
                void loadMarket()
                closeModal()
                return
            }
            setPhase('result')
            if (ok > 0) toast(t('update.result', { ok: ok, failed: failures.length }))
            void loadInstalled(true)
            void loadUpdates(true)
            void loadMarket()
        }

        const submit = function () {
            if (targets.length === 0) return
            const queue = targets.slice()
            setTargets(queue)
            if (queue.length > 1 || batch) {
                abortRef.current = null
                void run(queue)
                return
            }
            abortRef.current = new AbortController()
            void run(queue)
        }

        const cancelRun = function () {
            cancelRef.current = true
            if (abortRef.current !== null) abortRef.current.abort()
            setConfirmCancel(false)
        }

        const retryFailed = function () {
            const queue = failed.map(function (entry) { return entry.skill })
            if (queue.length === 0) return
            setTargets(queue)
            abortRef.current = null
            void run(queue)
        }

        const footer = phase === 'running'
            ? h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { setConfirmCancel(true) } }, t('action.cancel')))
            : phase === 'result'
                ? h(Fragment, null,
                    failed.length > 0 ? h(SmButton, { tone: 'secondary', onClick: retryFailed }, t('update.retryFailedCount', { count: failed.length })) : null,
                    h(SmButton, { tone: 'primary', onClick: closeModal }, t('action.close')))
                : h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: targets.length === 0, onClick: submit }, t('action.update')))

        const body = []
        if (error !== '') body.push(h(SmBanner, { key: 'error', tone: 'error' }, error))
        if (confirmCancel) {
            body.push(h(SmBanner, { key: 'cancel', tone: 'warn' },
                h('span', { style: { fontWeight: 500 } }, t('update.cancelConfirm.title')),
                h('span', null, t('update.cancelConfirm.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { key: 'keep', tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmCancel(false) } }, t('action.cancel')),
                    h(SmButton, { key: 'stop', tone: 'danger', style: { height: '28px' }, onClick: cancelRun }, t('update.cancelConfirm.ok')))))
        }

        if (phase === 'confirm') {
            if (targets.length === 0) {
                body.push(h('div', { key: 'none', style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('update.none')))
            } else if (!batch) {
                const skill = targets[0]
                body.push(h('div', { key: 'single', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)' } },
                        h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, smText(skill.name)),
                        h('span', { className: 'sm-mono', style: { flexShrink: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                            t('update.versionChange', {
                                current: smSkillVersion(skill) === '' ? '—' : smSkillVersion(skill),
                                next: (smSkillUpdateVersion(skill).charAt(0) === 'v' ? '' : 'v') + smSkillUpdateVersion(skill),
                            }))),
                    h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('market.source') + ': ' + smText(skill.sourceName, smText(skill.sourceId, '—'))),
                    smSkillLocalModified(skill) ? h(SmBanner, { tone: 'warn' }, t('update.localModified')) : null,
                    h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('update.backupNote'))))
            } else {
                body.push(h('div', { key: 'batch', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                    h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)' } }, t('update.all.body', { count: targets.length })),
                    modifiedCount > 0 ? h(SmBanner, { tone: 'warn' }, t('update.all.modified', { count: modifiedCount })) : null,
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' } },
                        targets.map(function (skill) {
                            return h('div', { key: smText(skill.id, smText(skill.name)), style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 10px', borderRadius: '10px', background: 'var(--dsw-alias-bg-base)' } },
                                h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, smText(skill.name)),
                                h('span', { className: 'sm-mono', style: { flexShrink: 0, color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, 'v' + smSkillUpdateVersion(skill)))
                        })),
                    h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('update.backupNote'))))
            }
        } else if (phase === 'running') {
            body.push(h('div', { key: 'progress', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('update.progress', { done: done, total: targets.length })),
                h('div', { role: 'progressbar', style: { width: '100%', height: '6px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-3)', overflow: 'hidden' } },
                    h('div', { style: { width: String(targets.length === 0 ? 0 : Math.round((done / targets.length) * 100)) + '%', height: '100%', background: 'var(--dsw-alias-label-primary)', transition: 'width 220ms' } }))))
        } else {
            body.push(h('div', { key: 'result', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, failed.length === 0 ? t('update.result.ok') : t('update.result', { ok: okCount, failed: failed.length })),
                failed.map(function (entry) {
                    return h('div', { key: smText(entry.skill.id, smText(entry.skill.name)), style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                        smText(entry.skill.name) + ' · ' + entry.reason)
                })))
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: batch ? t('update.all.title') : t('update.title'),
            footer: footer,
        }, body)
    }

    /* ------------------------------------------------------------------ *
     * 5. 卸载确认（480）                                                 *
     * ------------------------------------------------------------------ */

    function smResolveSkill(payload) {
        if (payload === null || typeof payload !== 'object') return null
        if (payload.skill !== null && typeof payload.skill === 'object') return payload.skill
        return smFindSkillById(payload.id) || smFindSkillByName(payload.name)
    }

    function SmUninstallModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = smResolveSkill(payload)
        const name = skill !== null ? smText(skill.name, smText(payload.name)) : smText(payload.name)
        const location = skill !== null ? smText(skill.location, smText(payload.location)) : smText(payload.location)
        const blocked = skill !== null && smIsReadonly(skill)
        const [preserveBackup, setPreserveBackup] = useState(false)
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy || blocked) return
            if (name === '' || location === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('market/uninstall', { method: 'POST', body: { name: name, location: location, preserveBackup: preserveBackup } })
                setBusy(false)
                toast(t('uninstall.success', { name: name }))
                closeModal()
                const detail = appState.detail
                if (detail !== null && typeof detail === 'object' && (detail.id === smText(skill !== null ? skill.id : '') || detail.name === name)) {
                    setState({ view: 'list', detail: null })
                }
                void loadInstalled(true)
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('uninstall.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy || blocked, onClick: function () { void submit() } }, t('action.uninstall'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        blocked ? h(SmBanner, { tone: 'warn' }, t('uninstall.readonly')) : null,
        h('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.55' } }, t('uninstall.body', { name: name !== '' ? name : '—' })),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', cursor: 'pointer' } },
            h('input', { type: 'checkbox', checked: preserveBackup, onChange: function (event) { setPreserveBackup(event.target.checked) } }),
            h('span', null, t('action.backup'))))
    }

    /* ------------------------------------------------------------------ *
     * 6. 删除确认（480）                                                 *
     * ------------------------------------------------------------------ */

    function SmDeleteModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = smResolveSkill(payload)
        const name = skill !== null ? smText(skill.name, smText(payload.name)) : smText(payload.name)
        const path = skill !== null ? smText(skill.path, smText(payload.path)) : smText(payload.path)
        const blocked = skill !== null && smIsReadonly(skill)
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy || blocked) return
            if (path === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('skill?path=' + encodeURIComponent(path), { method: 'DELETE' })
                setBusy(false)
                toast(t('toast.deleted', { name: name }))
                closeModal()
                const detail = appState.detail
                if (detail !== null && typeof detail === 'object' && (detail.id === smText(skill !== null ? skill.id : '') || detail.name === name)) {
                    setState({ view: 'list', detail: null })
                }
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('delete.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy || blocked, onClick: function () { void submit() } }, t('action.delete'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        blocked ? h(SmBanner, { tone: 'warn' }, t('delete.readonly')) : null,
        h('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.55' } }, t('delete.body', { name: name !== '' ? name : '—' })))
    }

    /* ------------------------------------------------------------------ *
     * 7. 添加索引源（488）                                               *
     * ------------------------------------------------------------------ */

    function SmAddSourceModal(props) {
        const [name, setName] = useState('')
        const [url, setUrl] = useState('')
        const [validating, setValidating] = useState(false)
        const [result, setResult] = useState(null)
        const [validateError, setValidateError] = useState('')
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const validate = async function () {
            if (url.trim() === '') {
                setValidateError(t('source.error.urlRequired'))
                setResult(null)
                return
            }
            setValidating(true)
            setValidateError('')
            setResult(null)
            setServerError('')
            try {
                const data = await api('sources/validate', { method: 'POST', body: { url: url.trim() } })
                setResult(data !== null && typeof data === 'object' ? data : null)
            } catch (failure) {
                setValidateError(smErrorMessage(failure))
            } finally {
                setValidating(false)
            }
        }

        const canSave = result !== null && validateError === '' && url.trim() !== '' && !busy
        const submit = async function () {
            if (!canSave) return
            setBusy(true)
            setServerError('')
            const request = { url: url.trim() }
            if (name.trim() !== '') request.name = name.trim()
            try {
                const data = await api('sources', { method: 'POST', body: request })
                const source = data !== null && typeof data === 'object' && data.source !== undefined ? data.source : null
                setBusy(false)
                toast(t('toast.sourceAdded', { name: source !== null ? smText(source.name, name.trim()) : name.trim() }))
                closeModal()
                void loadSources()
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        const samples = result !== null && Array.isArray(result.sample) ? result.sample : (result !== null && Array.isArray(result.skills) ? result.skills : [])
        const sampleNames = samples.slice(0, 3).map(function (item) { return smText(item.name) }).filter(function (text) { return text !== '' }).join(' · ')

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('source.add.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSave, onClick: function () { void submit() } }, t('action.save'))),
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmBanner, { tone: 'info' }, t('source.trust')),
        h(SmField, { label: t('source.name') },
            h('input', { type: 'text', value: name, placeholder: t('source.name.placeholder'), onChange: function (event) { setName(event.target.value) }, style: SM_INPUT_STYLE })),
        h(SmField, { label: t('source.url'), error: validateError },
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                h('input', {
                    type: 'text',
                    className: 'sm-mono',
                    value: url,
                    placeholder: t('source.url.placeholder'),
                    onChange: function (event) { setUrl(event.target.value); setResult(null); setValidateError('') },
                    style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO, flex: 1 }),
                }),
                h(SmButton, { tone: 'secondary', disabled: validating, onClick: function () { void validate() } }, validating ? t('state.validating') : t('action.validate')))),
        result !== null
            ? h(SmBanner, { tone: 'ok' },
                h('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontWeight: 500 } }, t('source.validated', { count: typeof result.skillCount === 'number' ? result.skillCount : (typeof result.count === 'number' ? result.count : 0) })),
                result.title ? h('span', null, t('source.title') + ': ' + smText(result.title)) : null,
                result.description ? h('span', null, smText(result.description)) : null,
                sampleNames !== '' ? h('span', { className: 'sm-mono', style: { wordBreak: 'break-all' } }, t('source.preview', { names: sampleNames })) : null)
            : null)
    }

    /* ------------------------------------------------------------------ *
     * 8. 编辑原文（720）                                                 *
     * ------------------------------------------------------------------ */

    function SmEditContentModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const path = smText(payload.path, skill !== null ? smText(skill.path) : '')
        const name = smText(payload.name, skill !== null ? smText(skill.name) : '')
        const [draft, setDraft] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [original, setOriginal] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [mtime, setMtime] = useState(smNumber(payload.mtime, skill !== null ? smNumber(skill.mtime, 0) : 0))
        const [loading, setLoading] = useState(typeof payload.content !== 'string' && path !== '')
        const [saving, setSaving] = useState(false)
        const [error, setError] = useState('')
        const [confirmDiscard, setConfirmDiscard] = useState(false)
        const alive = useRef(true)
        const textareaRef = useRef(null)
        const gutterRef = useRef(null)
        const dirty = draft !== original

        smUseModalGuard(props.modalId, function () {
            if (confirmDiscard) {
                setConfirmDiscard(false)
                return true
            }
            if (!dirty) return false
            setConfirmDiscard(true)
            return true
        })

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const load = useCallback(function () {
            if (path === '') {
                setLoading(false)
                setError(t('error.notFound'))
                return
            }
            setLoading(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path)).then(function (data) {
                if (!alive.current) return
                const content = data !== null && typeof data === 'object' && typeof data.content === 'string' ? data.content : ''
                const fetchedSkill = data !== null && typeof data === 'object' && data.skill !== null && typeof data.skill === 'object' ? data.skill : null
                setDraft(content)
                setOriginal(content)
                setMtime(fetchedSkill !== null ? smNumber(fetchedSkill.mtime, mtime) : mtime)
                setLoading(false)
            }).catch(function (failure) {
                if (!alive.current) return
                setError(smErrorMessage(failure))
                setLoading(false)
            })
        }, [path])

        useEffect(function () {
            if (typeof payload.content === 'string') return
            load()
        }, [load])

        const save = async function () {
            if (saving || path === '') return
            setSaving(true)
            setError('')
            try {
                await api('skill', { method: 'PUT', body: { path: path, mtime: mtime, content: draft } })
                setSaving(false)
                setOriginal(draft)
                toast(t('toast.saved'))
                smRefreshDetail()
                void loadInstalled(true)
                if (smDiagnostics.open) void smLoadDiagnostics()
                closeModal()
            } catch (failure) {
                setSaving(false)
                setError(failure !== null && typeof failure === 'object' && failure.code === 'E_CONFLICT_MTIME' ? t('form.mtimeConflict') : smErrorMessage(failure))
            }
        }

        const requestClose = function () {
            if (dirty) {
                setConfirmDiscard(true)
                return
            }
            smRemoveModalById(props.modalId)
        }

        const lineCount = draft.split('\n').length
        const gutter = []
        for (let index = 1; index <= Math.max(lineCount, 1); index += 1) gutter.push(h('div', { key: index }, String(index)))

        const body = []
        if (error !== '') {
            body.push(h(SmBanner, { key: 'error', tone: 'error' },
                h('span', null, error),
                error === t('form.mtimeConflict')
                    ? h(SmButton, { key: 'refresh', tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: function () { void load() } }, t('action.refresh'))
                    : null))
        }
        if (confirmDiscard) {
            body.push(h(SmBanner, { key: 'discard', tone: 'warn' },
                h('span', { style: { fontWeight: 500 } }, t('form.edit.discard.title')),
                h('span', null, t('form.edit.discard.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { key: 'keep', tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmDiscard(false) } }, t('action.cancel')),
                    h(SmButton, { key: 'discard', tone: 'danger', style: { height: '28px' }, onClick: function () { smRemoveModalById(props.modalId) } }, t('form.edit.discard.confirm')))))
        }
        if (loading) {
            body.push(h('div', { key: 'loading', style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')))
        } else {
            body.push(h('div', {
                key: 'editor',
                className: 'sm-editor',
                style: { display: 'flex', minHeight: '320px', height: 'min(52vh, 480px)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', overflow: 'hidden' },
            },
            h('div', {
                ref: gutterRef,
                className: 'sm-mono',
                'aria-hidden': 'true',
                style: { flexShrink: 0, width: '44px', padding: '10px 8px', overflow: 'hidden', textAlign: 'right', userSelect: 'none', color: 'var(--dsw-alias-label-caption)', fontFamily: SM_MONO, fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '20px' },
            }, gutter),
            h('textarea', {
                ref: textareaRef,
                className: 'sm-mono',
                value: draft,
                spellCheck: false,
                onChange: function (event) {
                    setDraft(event.target.value)
                    setError('')
                },
                onScroll: function (event) {
                    if (gutterRef.current !== null) gutterRef.current.scrollTop = event.target.scrollTop
                },
                style: { flex: '1 1 auto', minWidth: 0, border: 'none', outline: 'none', resize: 'none', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontFamily: SM_MONO, fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '20px', padding: '10px 12px', whiteSpace: 'pre', overflow: 'auto' },
            })))
            body.push(h('div', { key: 'hint', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('detail.editHint')))
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 720,
            title: t('form.edit.title'),
            subtitle: name,
            onRequestClose: requestClose,
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: requestClose }, t('action.cancel')),
                h(SmButton, { tone: 'primary', disabled: saving || loading || !dirty || path === '', onClick: function () { void save() } }, saving ? t('state.savingContent') : t('action.save'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') {
                    event.preventDefault()
                    void save()
                    return true
                }
                return false
            },
        },
        dirty ? h('div', { style: { color: 'var(--dsw-alias-state-warn-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('form.edit.dirty')) : null,
        body)
    }

    /* ------------------------------------------------------------------ *
     * 9. 预览（720）                                                     *
     * ------------------------------------------------------------------ */

    function SmPreviewModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const path = smText(payload.path, skill !== null ? smText(skill.path) : '')
        const name = smText(payload.name, skill !== null ? smText(skill.name) : '')
        const [content, setContent] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [loading, setLoading] = useState(typeof payload.content !== 'string' && path !== '')
        const [error, setError] = useState('')
        const alive = useRef(true)

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const load = useCallback(function () {
            if (path === '') {
                setLoading(false)
                return
            }
            setLoading(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path)).then(function (data) {
                if (!alive.current) return
                setContent(data !== null && typeof data === 'object' && typeof data.content === 'string' ? data.content : '')
                setLoading(false)
            }).catch(function (failure) {
                if (!alive.current) return
                setError(smErrorMessage(failure))
                setLoading(false)
            })
        }, [path])

        useEffect(function () {
            if (typeof payload.content === 'string') return
            load()
        }, [load])

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 720,
            title: t('detail.content'),
            subtitle: name,
            footer: h(Fragment, null, h(SmButton, { tone: 'primary', onClick: function () { smRemoveModalById(props.modalId) } }, t('action.close'))),
        },
        loading
            ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading'))
            : error !== ''
                ? h(SmBanner, { tone: 'error' }, error)
                : content === ''
                    ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('detail.content.empty'))
                    : h(SmCodeBlock, { text: content, maxHeight: '60vh' }))
    }

    /* ------------------------------------------------------------------ *
     * 10. 删除源确认（480）                                              *
     * ------------------------------------------------------------------ */

    function SmConfirmRemoveSourceModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const source = payload.source !== null && typeof payload.source === 'object' ? payload.source : null
        const sourceId = smText(payload.sourceId, smText(payload.id, source !== null ? smText(source.id) : ''))
        const name = smText(payload.name, source !== null ? smText(source.name) : '')
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy) return
            if (sourceId === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('sources/' + encodeURIComponent(sourceId), { method: 'DELETE' })
                setBusy(false)
                toast(t('toast.sourceDeleted', { name: name !== '' ? name : sourceId }))
                closeModal()
                void loadSources()
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('source.confirmDelete.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy, onClick: function () { void submit() } }, t('action.deleteSource'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        h('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.55' } }, t('source.confirmDelete.body')),
        name !== '' ? h('div', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, name) : null)
    }

    /* ------------------------------------------------------------------ *
     * 诊断抽屉（420，DG-01～DG-03 / PRD §9）。                            *
     * ------------------------------------------------------------------ */

    function smDiagnosticsPayload() {
        if (smDiagnostics.data !== null && typeof smDiagnostics.data === 'object') return smDiagnostics.data
        if (appState.diagnostics !== null && typeof appState.diagnostics === 'object') return appState.diagnostics
        return null
    }

    function openDiagnosticsDrawer() {
        smHideTooltip()
        if (!smDiagnostics.open) {
            smDiagnostics.open = true
            smLockScroll()
        }
        if (typeof rerender === 'function') rerender()
        void smLoadDiagnostics()
    }

    function smCloseDiagnostics() {
        if (!smDiagnostics.open) return
        smDiagnostics.open = false
        smUnlockScroll()
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    async function smLoadDiagnostics() {
        smDiagnostics.loading = true
        smDiagnostics.error = null
        if (typeof rerender === 'function') rerender()
        try {
            const cwd = typeof appState.cwd === 'string' ? appState.cwd : ''
            const data = await api('diagnostics' + (cwd === '' ? '' : '?cwd=' + encodeURIComponent(cwd)))
            smDiagnostics.data = data !== null && typeof data === 'object' ? data : null
            appState.diagnostics = smDiagnostics.data
            smDiagnostics.error = null
        } catch (failure) {
            smDiagnostics.error = failure !== null && typeof failure === 'object' ? failure : {}
        } finally {
            smDiagnostics.loading = false
            if (typeof rerender === 'function') rerender()
        }
    }

    /** 八类问题归一化；同一套用户语言。 */
    function smIssueKind(issue) {
        const raw = smText(issue.kind, smText(issue.type)).toLowerCase()
        if (raw === '') return 'unreadable'
        if (raw.indexOf('same') !== -1 || raw.indexOf('shadow') !== -1 || raw.indexOf('duplicate') !== -1) return 'same-name'
        if (raw.indexOf('source') !== -1) return 'source-unreachable'
        if (raw.indexOf('broken') !== -1 || raw.indexOf('link') !== -1) return 'broken-link'
        if (raw.indexOf('frontmatter') !== -1 || raw.indexOf('format') !== -1 || raw.indexOf('schema') !== -1) return 'frontmatter'
        if (raw.indexOf('oversize') !== -1 || raw.indexOf('large') !== -1) return 'oversize'
        if (raw.indexOf('missing') !== -1 || raw.indexOf('not-found') !== -1 || raw.indexOf('enoent') !== -1) return 'missing'
        if (raw.indexOf('name') !== -1) return 'name'
        if (raw.indexOf('unreadable') !== -1 || raw.indexOf('permission') !== -1 || raw.indexOf('eacces') !== -1) return 'unreadable'
        return 'unreadable'
    }

    function smIssueSection(issue) {
        const kind = smIssueKind(issue)
        /* 同名问题无论来源层都算「未生效」，进入警示图标计数。 */
        if (kind === 'same-name') return 'inactive'
        if (kind === 'oversize' || kind === 'source-unreachable') return 'attention'
        if (issue.severity === 'info') return 'attention'
        return 'inactive'
    }

    /** 仅用于「详细信息」层；技术类型名只在这里出现。 */
    function smIssueTypeLabel(issue) {
        return smText(issue.kind, smText(issue.type, t('error.read')))
    }

    function smIssueSentence(issue) {
        const kind = smIssueKind(issue)
        const name = smText(issue.name, smText(issue.path, '—'))
        if (kind === 'same-name') {
            const category = smText(issue.category, smCategoryForLocation(issue.location))
            const group = smText(issue.group, smText(issue.categoryLabel, smText(issue.locationName, smCategoryLabel(category) || t('tab.category.mine'))))
            return t('diag.sentence.sameName', { name: name, group: group })
        }
        if (kind === 'frontmatter') return t('diag.sentence.frontmatter', { name: name })
        if (kind === 'name') return t('diag.sentence.name', { name: name })
        if (kind === 'broken-link') return t('diag.sentence.brokenLink', { name: name })
        if (kind === 'oversize') return t('diag.sentence.oversize', { name: name })
        if (kind === 'source-unreachable') return t('diag.sentence.sourceUnreachable', { name: name, source: smText(issue.source, smText(issue.sourceName, '—')) })
        return t('diag.sentence.unreadable', { name: name })
    }

    function smIssueAction(issue) {
        const kind = smIssueKind(issue)
        if (kind === 'same-name') return { id: 'view-active', label: t('action.viewActive') }
        if (kind === 'frontmatter') return { id: 'open-file', label: t('action.openFile') }
        if (kind === 'name') return { id: 'open-file', label: t('action.openFile') }
        if (kind === 'broken-link') return { id: 'remove-link', label: t('action.removeLink') }
        if (kind === 'oversize') return { id: 'trim', label: t('action.viewFile') }
        if (kind === 'source-unreachable') return { id: 'manage-sources', label: t('diag.fix.manageSources') }
        if (kind === 'missing') return { id: 'retry', label: t('action.retry') }
        return { id: 'open-folder', label: t('diag.fix.openFolder') }
    }

    function smOpenSkillDetail(skill) {
        if (skill === null || typeof skill !== 'object') return
        setState({ tab: 'skills', view: 'detail', detail: { kind: 'installed', id: smText(skill.id), name: smText(skill.name) } })
    }

    function smRunIssueFix(issue, setBusy, setError) {
        const action = smIssueAction(issue).id
        const name = smText(issue.name)
        const path = smText(issue.path)
        const findSkill = function () {
            return smFindSkillById(issue.id) || smFindSkillByName(name) || (path !== '' ? smFindSkillById(path) : null)
        }
        const openEditor = function () {
            const skill = findSkill()
            if (path === '' && (skill === null || smText(skill.path) === '')) {
                setError(t('error.notFound'))
                return
            }
            openModal('edit-content', { skill: skill, name: name, path: path !== '' ? path : smText(skill !== null ? skill.path : ''), mtime: skill !== null ? smNumber(skill.mtime, 0) : 0 })
        }

        if (action === 'view-active') {
            const active = smFindActiveSkillByName(name)
            if (active === null) {
                toast(t('error.notFound'), { tone: 'error' })
                return
            }
            smCloseDiagnostics()
            smOpenSkillDetail(active)
            return
        }
        if (action === 'open-file' || action === 'trim') {
            openEditor()
            return
        }
        if (action === 'manage-sources') {
            if (typeof openSourceDialog === 'function') {
                openSourceDialog()
                return
            }
            setError(t('error.unexpected'))
            return
        }
        if (action === 'open-folder') {
            if (typeof openFolder === 'function') {
                openFolder(path)
                return
            }
            smCopyText(path, t('toast.copied'))
            return
        }
        if (action === 'retry') {
            void smLoadDiagnostics()
            return
        }
        if (action === 'remove-link') {
            if (path === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path), { method: 'DELETE' }).then(function () {
                setBusy(false)
                toast(t('diag.toast.fixed'))
                void loadInstalled(true)
                void smLoadDiagnostics()
            }).catch(function (failure) {
                setBusy(false)
                setError(t('diag.error.fixFailed', { reason: smErrorMessage(failure) }))
            })
        }
    }

    function SmIssueCard(props) {
        const issue = props.issue
        const [detailsOpen, setDetailsOpen] = useState(false)
        const [busy, setBusy] = useState(false)
        const [fixError, setFixError] = useState('')
        const kind = smIssueKind(issue)
        const action = smIssueAction(issue)
        const name = smText(issue.name, smText(issue.path, '—'))
        const path = smText(issue.path)
        const effective = smText(issue.effective, smText(issue.activeName, smText(issue.shadowedBy, smText(issue.effectivePath, smText(issue.activePath)))))

        return h('div', { className: 'sm-issue', style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px', borderRadius: '16px', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)' } },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 } },
                h('span', { style: { flexShrink: 0, color: kind === 'oversize' || kind === 'source-unreachable' ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-state-warn-primary)' } }, icon(kind === 'oversize' || kind === 'source-unreachable' ? 'info' : 'alert', 16)),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
                    h('span', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500 } }, name),
                    h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } }, smIssueSentence(issue)))),
            fixError !== '' ? h('div', { style: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, fixError) : null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                h(SmButton, { tone: 'primary', style: { height: '28px' }, disabled: busy, onClick: function () { smRunIssueFix(issue, setBusy, setFixError) } }, action.label),
                h(SmButton, {
                    tone: 'ghost',
                    style: { height: '28px' },
                    onClick: function () { setDetailsOpen(!detailsOpen) },
                }, detailsOpen ? t('diag.details.hide') : t('diag.details'))),
            detailsOpen
                ? h('div', { className: 'sm-issue-detail', style: { display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--dsw-alias-border-l2)' } },
                    path !== ''
                        ? h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' } },
                            h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('diag.path') + ': ' + path),
                            h(SmButton, { tone: 'ghost', icon: 'copy', style: { height: '24px', flexShrink: 0 }, onClick: function () { smCopyText(path, t('toast.copied')) } }, t('action.copyPath')))
                        : null,
                    h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('diag.kind') + ': ' + smIssueTypeLabel(issue)),
                    effective !== '' ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('diag.effective') + ': ' + effective) : null,
                    h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('diag.fixHint')))
                : null)
    }

    function SmDiagnosticsDrawer() {
        const payload = smDiagnosticsPayload()
        const issues = payload !== null && Array.isArray(payload.issues) ? payload.issues.filter(function (issue) { return issue !== null && typeof issue === 'object' }) : []
        const inactive = issues.filter(function (issue) { return smIssueSection(issue) === 'inactive' })
        const attention = issues.filter(function (issue) { return smIssueSection(issue) === 'attention' })
        const checkedAt = payload !== null && typeof payload.checkedAt === 'number' ? payload.checkedAt : 0
        const loading = smDiagnostics.loading || (payload === null && smDiagnostics.error === null)
        const sortByName = function (left, right) {
            return smText(left.name, left.path).localeCompare(smText(right.name, right.path))
        }
        const partial = payload !== null && (payload.partial === true || payload.incomplete === true)

        const sections = []
        if (inactive.length > 0) {
            sections.push(h('section', { key: 'inactive', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('h4', { style: { margin: 0, color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500 } }, t('diag.section.inactive')),
                inactive.slice().sort(sortByName).map(function (issue, index) {
                    return h(SmIssueCard, { key: smText(issue.id, 'inactive-' + String(index)), issue: issue })
                })))
        }
        if (attention.length > 0) {
            sections.push(h('section', { key: 'attention', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('h4', { style: { margin: 0, color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500 } }, t('diag.section.attention')),
                attention.slice().sort(sortByName).map(function (issue, index) {
                    return h(SmIssueCard, { key: smText(issue.id, 'attention-' + String(index)), issue: issue })
                })))
        }

        let body
        if (loading) {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                h('div', { style: { height: '64px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-1)' } }),
                h('div', { style: { height: '64px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-1)' } }),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')))
        } else if (smDiagnostics.error !== null) {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '48px 20px', textAlign: 'center' } },
                h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
                h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, t('state.error.diag.title')),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, smErrorMessage(smDiagnostics.error)),
                h(SmButton, { tone: 'secondary', onClick: function () { void smLoadDiagnostics() } }, t('action.retry')))
        } else if (issues.length === 0) {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '56px 20px', textAlign: 'center' } },
                h('span', { style: { color: 'var(--dsw-alias-state-success-primary)' } }, icon('check', 32)),
                h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, t('empty.diag.title')),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('empty.diag.body')))
        } else {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
                partial ? h(SmBanner, { tone: 'warn' },
                    h('span', null, t('diag.partial')),
                    h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: function () { void smLoadDiagnostics() } }, t('action.retry'))) : null,
                sections,
                h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)', lineHeight: '1.5' } }, t('diag.note')))
        }

        return h('div', {
            className: 'sm-drawer-mask sm-drawer-backdrop',
            style: { position: 'fixed', inset: 0, zIndex: 1100, background: 'transparent' },
            onMouseDown: function (event) {
                if (event.target !== event.currentTarget) return
                if (smModalStack.length > 0) return
                smCloseDiagnostics()
            },
        },
        h('aside', {
            className: 'sm-drawer sm-diagnostics',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('diag.title'),
            style: { position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 92vw)', display: 'flex', flexDirection: 'column', background: 'var(--dsw-alias-bg-layer-2)', borderLeft: '.5px solid var(--dsw-alias-border-l2)', boxShadow: 'none' },
        },
        h('div', { className: 'sm-drawer-head', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: '20px 20px 14px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
                h('h3', { style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('diag.title')),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                    t('diag.summary', { active: inactive.length, attention: attention.length }) + ' · ' + t('diag.checkedAt', { time: checkedAt > 0 ? fmtTime(checkedAt) : '—' }))),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
                h(SmButton, { tone: 'secondary', style: { height: '28px' }, disabled: loading, onClick: function () { void smLoadDiagnostics() } }, loading ? t('diag.rechecking') : t('diag.recheck')),
                h('button', {
                    type: 'button',
                    className: 'sm-icon-btn',
                    'aria-label': t('action.close'),
                    onClick: smCloseDiagnostics,
                }, icon('x', 16)))),
        h('div', { className: 'sm-drawer-body', style: { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' } }, body)))
    }

    function renderDiagnosticsDrawer() {
        if (!smDiagnostics.open) return null
        return h(SmDiagnosticsDrawer)
    }
