    /* 模态状态、toast、tooltip 基础设施 —— 由原 50-modals.js 行 1-545 拆出。 */
    /* ------------------------------------------------------------------ *
     * 50-modals.js — 十类模态、诊断抽屉、toast 与 tooltip。               *
     *                                                                    *
     * 宽度档（契约 §5.3 / §7.7）：                                        *
     *   488  new-skill / import-skill / install / add-source             *
     *   480  update / uninstall / delete / confirm-remove-source         *
     *   720  edit-content / preview                                      *
     * 无阴影、遮罩透明、Escape 分层、dialogStack 式的最上层优先。         *
     * ------------------------------------------------------------------ */

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
        }, h('div', { className: 'sm-fs-13 sm-text-secondary' }, t('error.unexpected')))
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
        },
        h('div', {
            className: 'sm-toast sm-toast-' + normalized.tone,
            role: 'status',
            'aria-live': 'polite',
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
                style: { height: '24px' },
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
     * Tooltip：反色、300ms、`data-tooltip` 标记（样式走 `.sm-tooltip`）。 *
     * ------------------------------------------------------------------ */

    const smTooltipState = { timer: null, target: null, label: '', node: null, root: null }

    /** 归属根引用在创建浮层时保存；显示时只读它，不重新 querySelector。 */
    function smTooltipFontSize() {
        const root = smTooltipState.root
        if (root !== null && root !== undefined && typeof getComputedStyle === 'function') {
            const value = getComputedStyle(root).getPropertyValue('--ds-fs').trim()
            if (value !== '') return value
        }
        return '14px'
    }

    /** 每次显示前调用：宿主字号在会话中变化后，浮层立即跟随（§3.2 / §3.7）。 */
    function smSyncTooltipFontSize(node) {
        if (node === null || node === undefined || node.style === null || node.style === undefined) return
        node.style.setProperty('--ds-fs', smTooltipFontSize())
    }

    function smEnsureTooltipNode() {
        if (typeof document === 'undefined' || document === null) return null
        if (smTooltipState.node !== null && document.body.contains(smTooltipState.node)) return smTooltipState.node
        const node = document.createElement('div')
        node.setAttribute('data-tooltip', '')
        node.className = 'sm-tooltip'
        node.setAttribute('role', 'tooltip')
        /* 视觉样式全部由 `.sm-tooltip` 提供（§6.7）：这里只保留定位与初始隐藏态。 */
        node.style.cssText = 'position:fixed;left:0;top:0;z-index:2000;opacity:0;visibility:hidden;'
        /* 只在此处记录归属根；后续显示复用该引用。 */
        smTooltipState.root = document.querySelector('.sm-root')
        smSyncTooltipFontSize(node)
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

    const SM_TOOLTIP_GAP = 8
    const SM_TOOLTIP_MARGIN = 8

    function smClampTooltip(value, min, max) {
        if (max < min) return min
        if (value < min) return min
        if (value > max) return max
        return value
    }

    /** 候选位置：主方向按锚点自然偏移，交叉方向夹在视口内。 */
    function smTooltipCandidate(side, anchor, tip, viewWidth, viewHeight) {
        let left
        let top
        if (side === 'top' || side === 'bottom') {
            left = smClampTooltip(anchor.left + anchor.width / 2 - tip.width / 2, SM_TOOLTIP_MARGIN, viewWidth - tip.width - SM_TOOLTIP_MARGIN)
            top = side === 'top' ? anchor.top - tip.height - SM_TOOLTIP_GAP : anchor.bottom + SM_TOOLTIP_GAP
        } else {
            top = smClampTooltip(anchor.top + anchor.height / 2 - tip.height / 2, SM_TOOLTIP_MARGIN, viewHeight - tip.height - SM_TOOLTIP_MARGIN)
            left = side === 'right' ? anchor.right + SM_TOOLTIP_GAP : anchor.left - tip.width - SM_TOOLTIP_GAP
        }
        return { left: left, top: top }
    }

    /** 四边距视口至少 8px 才算放得下。 */
    function smTooltipFits(candidate, tip, viewWidth, viewHeight) {
        return candidate.left >= SM_TOOLTIP_MARGIN &&
            candidate.top >= SM_TOOLTIP_MARGIN &&
            candidate.left + tip.width <= viewWidth - SM_TOOLTIP_MARGIN &&
            candidate.top + tip.height <= viewHeight - SM_TOOLTIP_MARGIN
    }

    function smTooltipVisibleArea(candidate, tip, viewWidth, viewHeight) {
        const width = Math.max(0, Math.min(candidate.left + tip.width, viewWidth) - Math.max(candidate.left, 0))
        const height = Math.max(0, Math.min(candidate.top + tip.height, viewHeight) - Math.max(candidate.top, 0))
        return width * height
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
        /* 显示路径上同步字号：不能只在创建时读一次。 */
        smSyncTooltipFontSize(node)
        node.textContent = smTooltipState.label
        node.style.visibility = 'hidden'
        node.style.opacity = '1'
        const rect = target.getBoundingClientRect()
        const tipRect = node.getBoundingClientRect()
        const viewWidth = typeof window !== 'undefined' && window !== null ? window.innerWidth : 0
        const viewHeight = typeof window !== 'undefined' && window !== null ? window.innerHeight : 0
        if (viewWidth <= 0 || viewHeight <= 0) {
            node.style.left = Math.round(rect.left + rect.width / 2 - tipRect.width / 2) + 'px'
            node.style.top = Math.round(rect.top - tipRect.height - SM_TOOLTIP_GAP) + 'px'
            node.style.visibility = 'visible'
            return
        }
        const sides = ['top', 'bottom', 'right', 'left']
        let chosen = null
        for (let index = 0; index < sides.length; index += 1) {
            const candidate = smTooltipCandidate(sides[index], rect, tipRect, viewWidth, viewHeight)
            if (smTooltipFits(candidate, tipRect, viewWidth, viewHeight)) {
                chosen = candidate
                break
            }
        }
        if (chosen === null) {
            /* 四向都放不下时选可见面积最大的一侧；超出的文字由 CSS max-width 折行/滚动承接。 */
            let bestArea = -1
            for (let index = 0; index < sides.length; index += 1) {
                const candidate = smTooltipCandidate(sides[index], rect, tipRect, viewWidth, viewHeight)
                const area = smTooltipVisibleArea(candidate, tipRect, viewWidth, viewHeight)
                if (area > bestArea) {
                    bestArea = area
                    chosen = candidate
                }
            }
        }
        node.style.left = Math.round(chosen.left) + 'px'
        node.style.top = Math.round(chosen.top) + 'px'
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
                smTooltipState.root = null
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
