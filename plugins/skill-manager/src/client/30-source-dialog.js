    /* ------------------------------------------------------------------ *
     * C3 · 管理源弹窗                                                     *
     *                                                                    *
     * 720px 居中弹窗；内容少时自然收缩。源列表支持拖动排序               *
     * （HTML5 DnD + 4px 阈值）与 Alt+↑/↓ 键盘替代。排序结果写入          *
     * appState.sourceOrder 并调用 PUT /sources/order；dataTransfer key    *
     * 与拖动钩子来自 00-prelude 的 smDragSource。                         *
     * ------------------------------------------------------------------ */

    let smSourceDialogDrag = null
    let smSourceDialogPointer = null
    let smSourceDialogAnnounce = ''
    let smSourceDialogBusy = Object.create(null)
    let smSourceDialogError = Object.create(null)
    let smSourceDialogDragKeysBound = false
    let smSourceDialogEscapeBound = false
    let smSourceDialogReturnFocus = null

    function smSourceList() {
        return Array.isArray(appState.sources) ? appState.sources : []
    }

    /* 源顺序 = sourceOrder；未出现在 order 里的源保持原顺序排最后。 */
    function smSourceOrderedList() {
        const sources = smSourceList().slice()
        const order = Array.isArray(appState.sourceOrder) ? appState.sourceOrder : []
        if (order.length === 0) return sources
        const rank = Object.create(null)
        order.forEach(function (id, index) {
            rank[String(id)] = index
        })
        return sources
            .map(function (source, index) { return { source: source, index: index } })
            .sort(function (left, right) {
                const leftId = String(left.source !== null && typeof left.source === 'object' ? left.source.id : '')
                const rightId = String(right.source !== null && typeof right.source === 'object' ? right.source.id : '')
                const leftRank = rank[leftId] === undefined ? Number.MAX_SAFE_INTEGER : rank[leftId]
                const rightRank = rank[rightId] === undefined ? Number.MAX_SAFE_INTEGER : rank[rightId]
                if (leftRank !== rightRank) return leftRank - rightRank
                return left.index - right.index
            })
            .map(function (entry) { return entry.source })
    }

    function smSourceApplyOrder(sources, ids) {
        const byId = Object.create(null)
        const extras = []
        ;(Array.isArray(sources) ? sources : []).forEach(function (source) {
            if (source === null || typeof source !== 'object') return
            const id = String(source.id)
            if (ids.indexOf(id) === -1) extras.push(source)
            else byId[id] = source
        })
        const ordered = []
        ids.forEach(function (id) {
            if (byId[id] !== undefined) ordered.push(byId[id])
        })
        return ordered.concat(extras)
    }

    function smSourceFocusHandle(id) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const target = String(id === undefined || id === null ? '' : id)
        if (target === '') return
        const run = function () {
            const node = document.querySelector('[data-source-handle="' + target.replace(/"/g, '\\"') + '"]')
            if (node !== null && node !== undefined && typeof node.focus === 'function') {
                try {
                    node.focus({ preventScroll: true })
                } catch (err) {
                    try { node.focus() } catch (failure) { void failure }
                }
            }
        }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
        else run()
    }

    function smSourceAnnounce(message) {
        smSourceDialogAnnounce = String(message === undefined || message === null ? '' : message)
        if (typeof setState === 'function') setState({})
    }

    function smSourceReloadMarket() {
        if (typeof loadMarket !== 'function') return
        try {
            const pending = loadMarket({
                q: String(appState.search || ''),
                sort: String(appState.marketSort || 'recommend'),
                refresh: true,
            })
            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                pending.catch(function () { /* 市场区块自行展示错误 */ })
            }
        } catch (err) {
            void err
        }
    }

    /* 乐观重排 + PUT /sources/order；失败时回滚到服务端顺序。 */
    function smSourcePersistOrder(ids, movedId) {
        const order = Array.isArray(ids) ? ids.slice() : []
        if (order.length === 0) return
        const list = smSourceOrderedList()
        const previousOrder = Array.isArray(appState.sourceOrder)
            ? appState.sourceOrder.slice()
            : list.map(function (source) { return String(source.id) })
        let moved = null
        list.forEach(function (source) {
            if (source !== null && typeof source === 'object' && String(source.id) === String(movedId)) moved = source
        })
        const position = order.indexOf(String(movedId))
        const nextSources = smSourceApplyOrder(list, order)
        if (typeof setState === 'function') setState({ sourceOrder: order, sources: nextSources })
        const run = async function () {
            try {
                await api('sources/order', { method: 'PUT', body: { order: order } })
                if (moved !== null && position >= 0) {
                    const name = typeof moved.name === 'string' && moved.name !== '' ? moved.name : String(moved.id)
                    smSourceAnnounce(t('source.orderMoved', { name: name, n: position + 1 }))
                }
                smSourceFocusHandle(movedId)
            } catch (err) {
                void err
                /* 回滚乐观重排，再向服务端对齐一次。 */
                if (typeof setState === 'function') setState({ sourceOrder: previousOrder, sources: list })
                toast(t('error.unexpected'), { tone: 'error' })
                try {
                    if (typeof loadSources === 'function') await loadSources(true)
                } catch (failure) {
                    void failure
                }
            }
        }
        void run()
    }

    /** 键盘替代：Alt+↑ / Alt+↓ 移动一位；首 / 末位不移动。 */
    function moveSource(id, delta) {
        const step = Number(delta)
        if (!Number.isFinite(step) || step === 0) return
        const ids = smSourceOrderedList().map(function (source) {
            return source !== null && typeof source === 'object' ? String(source.id) : ''
        })
        const from = ids.indexOf(String(id))
        if (from < 0) return
        const to = from + (step < 0 ? -1 : 1)
        if (to < 0 || to >= ids.length) {
            smSourceAnnounce(t('source.orderBoundary'))
            return
        }
        ids.splice(from, 1)
        ids.splice(to, 0, String(id))
        smSourcePersistOrder(ids, id)
    }

    /* ------------------------------------------------------------------ *
     * 打开 / 关闭                                                         *
     * ------------------------------------------------------------------ */

    function smSourceDialogEscape(event) {
        if (event === null || event === undefined || event.key !== 'Escape') return
        if (appState.sourceDialogOpen !== true) return
        if (smSourceDialogDrag !== null) return
        /* 上层模态（添加源 / 删除确认）打开时，Esc 只关模态。 */
        if (appState.modal !== null && appState.modal !== undefined) return
        if (typeof document !== 'undefined' && document !== null && typeof document.querySelector === 'function' &&
            document.querySelector('.sm-modal-backdrop') !== null) return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (typeof event.stopPropagation === 'function') event.stopPropagation()
        closeSourceDialog()
    }

    function smSourceBindEscape() {
        if (smSourceDialogEscapeBound) return
        if (typeof document === 'undefined' || document === null || typeof document.addEventListener !== 'function') return
        document.addEventListener('keydown', smSourceDialogEscape, true)
        smSourceDialogEscapeBound = true
    }

    function smSourceUnbindEscape() {
        if (!smSourceDialogEscapeBound) return
        if (typeof document !== 'undefined' && document !== null && typeof document.removeEventListener === 'function') {
            document.removeEventListener('keydown', smSourceDialogEscape, true)
        }
        smSourceDialogEscapeBound = false
    }

    function openSourceDialog() {
        if (typeof document !== 'undefined' && document !== null && document.activeElement !== null &&
            document.activeElement !== undefined) {
            smSourceDialogReturnFocus = document.activeElement
        }
        if (typeof setState === 'function') setState({ sourceDialogOpen: true })
        smSourceBindEscape()
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () {
                if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
                const node = document.querySelector('.sm-source-dialog')
                if (node !== null && node !== undefined && typeof node.focus === 'function') {
                    try { node.focus({ preventScroll: true }) } catch (err) { void err }
                }
            })
        }
        if (typeof loadSources === 'function') {
            try {
                const pending = loadSources()
                if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                    pending.catch(function () { /* 弹窗内展示错误态 */ })
                }
            } catch (err) {
                void err
            }
        }
    }

    function closeSourceDialog() {
        if (smSourceDialogDrag !== null) smSourceEndDrag(true)
        smSourceUnbindEscape()
        smSourceDialogAnnounce = ''
        smSourceDialogPointer = null
        smSourceDialogBusy = Object.create(null)
        smSourceDialogError = Object.create(null)
        if (typeof setState === 'function') setState({ sourceDialogOpen: false })
        const target = smSourceDialogReturnFocus
        smSourceDialogReturnFocus = null
        if (target !== null && target !== undefined && typeof target.focus === 'function') {
            try {
                target.focus({ preventScroll: true })
            } catch (err) {
                try { target.focus() } catch (failure) { void failure }
            }
        }
    }

    /* ------------------------------------------------------------------ *
     * 行内动作                                                            *
     * ------------------------------------------------------------------ */

    function smSourceRefresh(source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        const id = String(source.id)
        if (smSourceDialogBusy[id] === true) return
        smSourceDialogBusy[id] = true
        delete smSourceDialogError[id]
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                await api('sources/' + encodeURIComponent(id) + '/refresh', { method: 'POST' })
                if (typeof loadSources === 'function') {
                    try { await loadSources(true) } catch (err) { void err }
                }
                smSourceReloadMarket()
            } catch (err) {
                void err
                smSourceDialogError[id] = t('source.error.refreshFailed')
            } finally {
                delete smSourceDialogBusy[id]
                if (typeof setState === 'function') setState({})
            }
        }
        void run()
    }

    function smSourceToggle(source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        const id = String(source.id)
        if (smSourceDialogBusy[id] === true) return
        const nextEnabled = source.enabled === false
        smSourceDialogBusy[id] = true
        delete smSourceDialogError[id]
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                await api('sources/' + encodeURIComponent(id), {
                    method: 'PUT',
                    body: { enabled: nextEnabled },
                })
                if (typeof loadSources === 'function') {
                    try { await loadSources(true) } catch (err) { void err }
                }
                smSourceReloadMarket()
            } catch (err) {
                void err
                smSourceDialogError[id] = t('error.unexpected')
            } finally {
                delete smSourceDialogBusy[id]
                if (typeof setState === 'function') setState({})
            }
        }
        void run()
    }

    function smSourceDelete(source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        if (typeof openModal === 'function') {
            openModal('confirm-remove-source', {
                source: source,
                sourceId: source.id,
                name: source.name,
            })
        }
    }

    /* ------------------------------------------------------------------ *
     * 拖动排序                                                            *
     * ------------------------------------------------------------------ */

    function smSourceDragKey() {
        if (typeof smDragSource !== 'undefined' && smDragSource !== null && typeof smDragSource === 'object' &&
            typeof smDragSource.key === 'string' && smDragSource.key !== '') {
            return smDragSource.key
        }
        return 'application/x-sm-source-id'
    }

    /* 00-prelude 的签名：start(id, event) / over(id, event) / drop() / end()。 */
    function smSourceDragCall(name, first, second) {
        if (typeof smDragSource === 'undefined' || smDragSource === null || typeof smDragSource !== 'object') return undefined
        if (typeof smDragSource[name] !== 'function') return undefined
        try {
            return smDragSource[name](first, second)
        } catch (err) {
            void err
            return undefined
        }
    }

    function smSourceDragKeydown(event) {
        if (event === null || event === undefined || event.key !== 'Escape') return
        if (smSourceDialogDrag === null) return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (typeof event.stopPropagation === 'function') event.stopPropagation()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
        smSourceEndDrag(true)
    }

    function smSourceBindDragKeys() {
        if (smSourceDialogDragKeysBound) return
        if (typeof document === 'undefined' || document === null || typeof document.addEventListener !== 'function') return
        document.addEventListener('keydown', smSourceDragKeydown, true)
        smSourceDialogDragKeysBound = true
    }

    function smSourceUnbindDragKeys() {
        if (!smSourceDialogDragKeysBound) return
        if (typeof document !== 'undefined' && document !== null && typeof document.removeEventListener === 'function') {
            document.removeEventListener('keydown', smSourceDragKeydown, true)
        }
        smSourceDialogDragKeysBound = false
    }

    function smSourceMoveGhost(x, y) {
        if (typeof document === 'undefined' || document === null || typeof document.getElementById !== 'function') return
        const ghost = document.getElementById('sm-source-ghost')
        if (ghost === null || ghost === undefined || ghost.style === null || ghost.style === undefined) return
        ghost.style.left = (Number(x) || 0) + 12 + 'px'
        ghost.style.top = (Number(y) || 0) + 12 + 'px'
    }

    function smSourceAutoScroll(clientY) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const list = document.querySelector('.sm-source-list')
        if (list === null || list === undefined || typeof list.getBoundingClientRect !== 'function') return
        const rect = list.getBoundingClientRect()
        const current = Number(list.scrollTop) || 0
        if (clientY < rect.top + 32) list.scrollTop = Math.max(0, current - 16)
        else if (clientY > rect.bottom - 32) list.scrollTop = current + 16
    }

    function smSourceEndDrag(canceled) {
        const drag = smSourceDialogDrag
        smSourceDialogDrag = null
        smSourceDialogPointer = null
        smSourceUnbindDragKeys()
        smSourceDragCall('end')
        void drag
        void canceled
        if (typeof setState === 'function') setState({})
    }

    function smSourceRowDragStart(event, source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        const id = String(source.id)
        if (smSourceDialogBusy[id] === true) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            return
        }
        /* 4px 阈值：指针移动不足 4px 时不进入拖动，避免误触。 */
        if (smSourceDialogPointer !== null) {
            const dx = Math.abs((Number(event.clientX) || 0) - smSourceDialogPointer.x)
            const dy = Math.abs((Number(event.clientY) || 0) - smSourceDialogPointer.y)
            if (dx < 4 && dy < 4) {
                if (typeof event.preventDefault === 'function') event.preventDefault()
                return
            }
        }
        const dataTransfer = event.dataTransfer
        if (dataTransfer !== null && dataTransfer !== undefined) {
            dataTransfer.effectAllowed = 'move'
            try {
                dataTransfer.setData(smSourceDragKey(), id)
            } catch (err) {
                void err
            }
        }
        let width = 0
        if (event.currentTarget !== null && event.currentTarget !== undefined &&
            typeof event.currentTarget.getBoundingClientRect === 'function') {
            width = event.currentTarget.getBoundingClientRect().width
        }
        smSourceDialogDrag = {
            id: id,
            overId: null,
            after: false,
            x: Number(event.clientX) || 0,
            y: Number(event.clientY) || 0,
            width: Number(width) || 0,
        }
        smSourceDialogAnnounce = ''
        smSourceDragCall('start', id, event)
        smSourceBindDragKeys()
        if (typeof setState === 'function') setState({})
    }

    function smSourceRowDragOver(event, source) {
        const drag = smSourceDialogDrag
        if (drag === null || source === null || typeof source !== 'object') return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (event.dataTransfer !== null && event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
        drag.x = Number(event.clientX) || drag.x
        drag.y = Number(event.clientY) || drag.y
        smSourceMoveGhost(drag.x, drag.y)
        smSourceAutoScroll(drag.y)
        const targetId = String(source.id)
        if (targetId === drag.id) {
            if (drag.overId !== null) {
                drag.overId = null
                drag.after = false
                smSourceDragCall('over', targetId, event)
                if (typeof setState === 'function') setState({})
            }
            return
        }
        let after = false
        const shared = smSourceDragCall('over', targetId, event)
        if (shared !== null && shared !== undefined && typeof shared === 'object' && typeof shared.after === 'boolean') {
            after = shared.after
        } else if (event.currentTarget !== null && event.currentTarget !== undefined &&
            typeof event.currentTarget.getBoundingClientRect === 'function') {
            const rect = event.currentTarget.getBoundingClientRect()
            after = drag.y > rect.top + rect.height / 2
        }
        if (drag.overId !== targetId || drag.after !== after) {
            drag.overId = targetId
            drag.after = after
            if (typeof setState === 'function') setState({})
        }
    }

    function smSourceRowDrop(event, source) {
        const drag = smSourceDialogDrag
        if (drag === null || source === null || typeof source !== 'object') return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        const shared = smSourceDragCall('drop')
        const fromId = shared !== null && shared !== undefined && typeof shared === 'object' && shared.from !== undefined
            ? String(shared.from)
            : drag.id
        const targetId = shared !== null && shared !== undefined && typeof shared === 'object' && shared.to !== undefined
            ? String(shared.to)
            : String(source.id)
        const after = shared !== null && shared !== undefined && typeof shared === 'object'
            ? shared.after === true
            : drag.after
        smSourceEndDrag(false)
        if (fromId === targetId) return
        const original = smSourceOrderedList().map(function (item) {
            return item !== null && typeof item === 'object' ? String(item.id) : ''
        })
        const ids = original.slice()
        const from = ids.indexOf(fromId)
        if (from < 0) return
        ids.splice(from, 1)
        let to = ids.indexOf(targetId)
        if (to < 0) to = ids.length
        if (after) to += 1
        ids.splice(to, 0, fromId)
        if (ids.join('|') === original.join('|')) return
        smSourcePersistOrder(ids, fromId)
    }

    function smSourceRowDragEnd(event) {
        void event
        if (smSourceDialogDrag === null) return
        smSourceEndDrag(true)
    }

    /* ------------------------------------------------------------------ *
     * 渲染                                                                *
     * ------------------------------------------------------------------ */

    function smSourceStatusDot(source) {
        const id = source !== null && typeof source === 'object' ? String(source.id) : ''
        if (id !== '' && smSourceDialogError[id] !== undefined) {
            return { className: 'sm-dot-warn', tip: t('source.error.refreshFailed') }
        }
        if (source !== null && typeof source === 'object' && source.stale === true) {
            return { className: 'sm-dot-warn', tip: t('source.error.refreshFailed') }
        }
        const status = source !== null && typeof source === 'object' && typeof source.status === 'string'
            ? source.status
            : 'ok'
        if (status === 'error') return { className: 'sm-dot-error', tip: t('source.status.error') }
        if (status === 'checking') return { className: 'sm-dot-warn', tip: t('source.status.checking') }
        return { className: 'sm-dot-ok', tip: t('source.status.ok') }
    }

    function smSourceCheckedText(source) {
        const value = source !== null && typeof source === 'object'
            ? (typeof source.lastCheckedAt === 'number' ? source.lastCheckedAt
                : typeof source.lastChecked === 'number' ? source.lastChecked : 0)
            : 0
        if (value > 0) return t('source.lastChecked', { time: fmtTime(value) })
        return t('source.neverChecked')
    }

    function smSourceHandle(source, total) {
        const id = String(source.id)
        return h('span', {
            key: 'handle',
            className: 'sm-drag-handle sm-source-handle',
            role: 'button',
            tabIndex: 0,
            'data-source-handle': id,
            'aria-label': t('source.dragHandle'),
            'data-tip': t('source.dragHandle'),
            'aria-disabled': total <= 1 ? 'true' : undefined,
            style: {
                width: '16px',
                height: '16px',
                flex: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'grab',
                color: 'var(--dsw-alias-label-tertiary)',
            },
        }, icon('grip', 16))
    }

    function smSourceSwitch(source, frozen) {
        const enabled = source.enabled !== false
        const busy = frozen || smSourceDialogBusy[String(source.id)] === true
        return h('button', {
            key: 'switch',
            type: 'button',
            role: 'switch',
            className: cx('sm-switch', !enabled && 'sm-switch-off'),
            'aria-checked': enabled ? 'true' : 'false',
            'aria-label': enabled ? t('action.disableSource') : t('action.enableSource'),
            'data-tip': enabled ? t('action.disableSource') : t('action.enableSource'),
            'aria-disabled': frozen ? 'true' : undefined,
            disabled: busy,
            draggable: 'false',
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                if (frozen) return
                smSourceToggle(source)
            },
        }, h('span', { className: 'sm-switch-thumb' }))
    }

    function smSourceIconAction(key, iconName, label, onClick, frozen) {
        return h('button', {
            key: key,
            type: 'button',
            className: 'sm-icon-btn',
            'aria-label': label,
            'data-tip': label,
            'aria-disabled': frozen ? 'true' : undefined,
            disabled: frozen,
            draggable: 'false',
            style: { width: '28px', height: '28px' },
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                if (frozen) return
                onClick()
            },
        }, icon(iconName, 14))
    }

    function smSourceRow(source, index, total) {
        const id = String(source.id)
        const frozen = smSourceDialogDrag !== null
        const busy = smSourceDialogBusy[id] === true
        const dot = smSourceStatusDot(source)
        const name = typeof source.name === 'string' && source.name !== '' ? source.name : id
        const count = typeof source.skillCount === 'number' ? source.skillCount : 0
        const remoteError = (typeof source.error === 'string' && source.error !== '') || source.stale === true
        const errorText = smSourceDialogError[id] !== undefined
            ? String(smSourceDialogError[id])
            : remoteError ? t('source.error.refreshFailed') : ''
        const rowNode = h('div', {
            key: 'row-' + id,
            className: cx(
                'sm-source-row',
                'sm-source-item',
                smSourceDialogDrag !== null && smSourceDialogDrag.id === id && 'is-dragging',
                smSourceDialogDrag !== null && smSourceDialogDrag.id === id && 'sm-source-dragging'
            ),
            'data-source-row': id,
            draggable: 'true',
            'aria-label': name,
            onMouseDown: function (event) {
                smSourceDialogPointer = {
                    x: Number(event !== null && event !== undefined ? event.clientX : 0) || 0,
                    y: Number(event !== null && event !== undefined ? event.clientY : 0) || 0,
                }
            },
            onDragStart: function (event) { smSourceRowDragStart(event, source) },
            onDragOver: function (event) { smSourceRowDragOver(event, source) },
            onDrop: function (event) { smSourceRowDrop(event, source) },
            onDragEnd: function (event) { smSourceRowDragEnd(event) },
            onKeyDown: function (event) {
                if (event === null || event === undefined || event.altKey !== true) return
                /* 只接受行本身或拖动手柄上的 Alt+↑/↓，避免在行内按钮上误触。 */
                if (event.target !== event.currentTarget) {
                    const target = event.target
                    const isHandle = target !== null && target !== undefined &&
                        typeof target.getAttribute === 'function' &&
                        target.getAttribute('data-source-handle') !== null
                    if (!isHandle) return
                }
                if (event.key === 'ArrowUp') {
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                    moveSource(id, -1)
                } else if (event.key === 'ArrowDown') {
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                    moveSource(id, 1)
                }
            },
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderBottom: '1px solid var(--dsw-alias-border-l2)',
                minHeight: '56px',
                opacity: smSourceDialogDrag !== null && smSourceDialogDrag.id === id ? 0.5 : 1,
            },
        },
        smSourceHandle(source, total),
        h('span', {
            className: cx('sm-dot', dot.className),
            'data-tip': dot.tip,
            title: dot.tip,
            style: { position: 'static', flex: 'none' },
        }),
        h('div', {
            className: 'sm-source-name-wrap',
            style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
        },
        h('span', {
            className: 'sm-source-name',
            title: name,
            style: {
                fontSize: 'var(--sm-fs)',
                fontWeight: 500,
                color: 'var(--dsw-alias-label-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        }, name),
        h('span', {
            className: 'sm-source-meta',
            style: { fontSize: 'calc(var(--sm-fs) - 3px)', color: 'var(--dsw-alias-label-caption)' },
        }, smSourceCheckedText(source))),
        h('span', {
            className: 'sm-badge sm-mono',
            style: { flex: 'none' },
        }, t('source.skillCount', { count: count })),
        h('div', {
            className: 'sm-source-actions',
            style: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 },
        },
        smSourceSwitch(source, frozen),
        smSourceIconAction('refresh', 'refresh', t('action.refresh'), function () {
            smSourceRefresh(source)
        }, frozen || busy),
        smSourceIconAction('delete', 'trash', t('action.deleteSource'), function () {
            smSourceDelete(source)
        }, frozen)))
        if (errorText === '') return rowNode
        const errorNode = h('div', {
            key: 'error-' + id,
            className: 'sm-source-error sm-source-error-row',
            role: 'alert',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px 10px 38px',
                color: 'var(--dsw-alias-state-error-primary)',
                fontSize: 'calc(var(--sm-fs) - 3px)',
                lineHeight: 1.5,
            },
        },
        icon('alert', 14),
        h('span', { className: 'sm-ellipsis', style: { flex: '1 1 auto', minWidth: 0 } }, errorText),
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            disabled: frozen || busy,
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                smSourceRefresh(source)
            },
        }, t('action.retry')))
        return h(Fragment, { key: 'item-' + id }, rowNode, errorNode)
    }

    function smSourceDropIndicator(key) {
        return h('div', {
            key: key,
            className: 'sm-drop-indicator sm-drop-line',
            'aria-hidden': 'true',
            style: {
                height: '2px',
                margin: '0 0 0 26px',
                background: 'var(--dsw-alias-state-business-primary)',
                flex: 'none',
            },
        })
    }

    function smSourceRows(list) {
        const nodes = []
        const drag = smSourceDialogDrag
        list.forEach(function (source, index) {
            if (source === null || typeof source !== 'object') return
            const id = String(source.id)
            if (drag !== null && drag.overId === id && drag.after !== true) {
                nodes.push(smSourceDropIndicator('drop-before-' + id))
            }
            nodes.push(smSourceRow(source, index, list.length))
            if (drag !== null && drag.overId === id && drag.after === true) {
                nodes.push(smSourceDropIndicator('drop-after-' + id))
            }
        })
        return nodes
    }

    function smSourceSkeletonRow(index) {
        return h('div', {
            key: 'sk-' + String(index),
            className: 'sm-source-row',
            'aria-hidden': 'true',
            style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', minHeight: '56px' },
        },
        h('span', { className: 'sm-skeleton', style: { width: '16px', height: '16px', flex: 'none' } }),
        h('div', {
            className: 'sm-source-name-wrap',
            style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' },
        },
        h('span', { className: 'sm-skeleton', style: { maxWidth: '180px' } }),
        h('span', { className: 'sm-skeleton', style: { maxWidth: '120px', minHeight: '10px' } })))
    }

    function smSourceDialogBody(list, scopedError, loading) {
        if (list.length > 0) {
            return h('div', {
                className: 'sm-source-list',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    minHeight: 0,
                    flex: '1 1 auto',
                    paddingRight: '2px',
                    userSelect: smSourceDialogDrag !== null ? 'none' : 'auto',
                },
            }, smSourceRows(list))
        }
        if (loading) {
            return h('div', {
                className: 'sm-source-list',
                'aria-busy': 'true',
                style: { display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0, flex: '1 1 auto' },
            }, [smSourceSkeletonRow(0), smSourceSkeletonRow(1), smSourceSkeletonRow(2)])
        }
        if (scopedError !== null) {
            return h('div', {
                className: 'sm-empty',
                style: { padding: '24px 12px' },
            },
            h('div', { className: 'sm-empty-icon' }, icon('alert', 32)),
            h('div', { className: 'sm-empty-title' }, t('state.error.sources.title')),
            h('div', { className: 'sm-empty-body' }, t('state.error.sources.body')),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary sm-btn-sm',
                    onClick: function () {
                        if (typeof loadSources !== 'function') return
                        try {
                            const pending = loadSources(true)
                            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                                pending.catch(function () { /* 错误态保留 */ })
                            }
                        } catch (err) {
                            void err
                        }
                    },
                }, t('action.retry'))))
        }
        return h('div', {
            className: 'sm-empty',
            style: { padding: '24px 12px' },
        },
        h('div', { className: 'sm-empty-icon' }, icon('sources', 32)),
        h('div', { className: 'sm-empty-title' }, t('empty.sources.title')),
        h('div', { className: 'sm-empty-body' }, t('empty.sources.body')))
    }

    function smSourceGhost() {
        if (smSourceDialogDrag === null) return null
        let source = null
        const list = smSourceOrderedList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] !== null && typeof list[index] === 'object' && String(list[index].id) === smSourceDialogDrag.id) {
                source = list[index]
                break
            }
        }
        if (source === null) return null
        const name = typeof source.name === 'string' && source.name !== '' ? source.name : String(source.id)
        const count = typeof source.skillCount === 'number' ? source.skillCount : 0
        return h('div', {
            key: 'ghost',
            id: 'sm-source-ghost',
            className: 'sm-source-ghost',
            'aria-hidden': 'true',
            style: {
                position: 'fixed',
                left: smSourceDialogDrag.x + 12 + 'px',
                top: smSourceDialogDrag.y + 12 + 'px',
                width: smSourceDialogDrag.width > 0 ? smSourceDialogDrag.width + 'px' : undefined,
                zIndex: 1400,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: 'var(--dsw-radius-sm)',
                border: '0.5px solid var(--dsw-alias-border-l2)',
                background: 'var(--dsw-alias-bg-layer-2)',
                fontSize: 'calc(var(--sm-fs) - 1px)',
                color: 'var(--dsw-alias-label-primary)',
            },
        },
        h('span', { className: 'sm-mono' }, name),
        h('span', { className: 'sm-caption sm-muted' }, t('source.skillCount', { count: count })))
    }

    function renderSourceDialog() {
        if (appState.sourceDialogOpen !== true) return null
        const list = smSourceOrderedList()
        const scopedError = appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'sources'
            ? appState.error
            : null
        const loading = appState.loadingSources === true ||
            (appState.loading !== null && typeof appState.loading === 'object' && appState.loading.sources === true)
        const dragging = smSourceDialogDrag !== null

        const head = h('div', {
            key: 'head',
            className: 'sm-dialog-head',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '16px 20px',
                borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
                flex: 'none',
            },
        },
        h('div', {
            key: 'title',
            className: 'sm-dialog-head-left',
            style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
        },
        h('span', {
            className: 'sm-dialog-title',
            style: { fontSize: 'calc(var(--sm-fs) + 2px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' },
        }, t('source.title')),
        h('span', { className: 'sm-badge' }, String(list.length))),
        h('button', {
            key: 'close',
            type: 'button',
            className: 'sm-icon-btn',
            'aria-label': t('action.close'),
            'data-tip': t('action.close'),
            onClick: closeSourceDialog,
        }, icon('x', 16)))

        const body = h('div', {
            key: 'body',
            className: 'sm-dialog-body',
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px 20px 16px',
                minHeight: 0,
                flex: '1 1 auto',
                overflow: 'hidden',
            },
        },
        smSourceDialogBody(list, scopedError, loading),
        h('div', { key: 'live', className: 'sm-sr-only', 'aria-live': 'polite' }, smSourceDialogAnnounce))

        const foot = h('div', {
            key: 'foot',
            className: 'sm-dialog-foot',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '12px 20px',
                borderTop: '0.5px solid var(--dsw-alias-border-l2)',
                flex: 'none',
            },
        },
        h('button', {
            key: 'add',
            type: 'button',
            className: 'sm-btn sm-btn-secondary sm-btn-sm',
            disabled: dragging,
            onClick: function () {
                if (typeof openModal === 'function') openModal('add-source', {})
            },
        }, icon('plus', 15), t('action.addSource')))

        const dialog = h('div', {
            key: 'dialog',
            className: 'sm-source-dialog sm-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('source.title'),
            tabIndex: -1,
            style: {
                width: 'min(720px, 100vw - 32px)',
                // A list dialog needs room even with one source; 480 keeps the
                // empty space reasonable while still growing to 720 for many rows.
                minHeight: 'min(480px, 100vh - 96px)',
                maxHeight: 'min(720px, 100vh - 96px)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 'var(--dsw-radius-panel)',
                border: '0.5px solid var(--dsw-alias-border-inverted)',
                background: 'var(--dsw-alias-bg-layer-1)',
                boxShadow: 'none',
            },
        }, head, body, foot)

        const mask = h('div', {
            key: 'mask',
            className: 'sm-dialog-mask',
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
            onMouseDown: function (event) {
                if (event === null || event === undefined) return
                if (event.target !== event.currentTarget) return
                if (smSourceDialogDrag !== null) return
                closeSourceDialog()
            },
        }, dialog)

        return h(Fragment, null, mask, smSourceGhost())
    }
