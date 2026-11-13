    /* 由原 30-source-dialog.js 行 1-501 拆出。 */
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

    /**
     * 行内“检查更新”：与管理源外的检查更新走同一条链路。
     * 只检查当前源，仍会强制拉取索引、刷新技能数量并重载市场与已安装状态。
     */
    function smSourceRefresh(source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        const id = String(source.id)
        if (smSourceDialogBusy[id] === true) return
        smSourceDialogBusy[id] = true
        delete smSourceDialogError[id]
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                if (typeof checkUpdates === 'function') {
                    await checkUpdates(id)
                } else {
                    await api('sources/' + encodeURIComponent(id) + '/refresh', { method: 'POST' })
                    if (typeof loadSources === 'function') {
                        try { await loadSources(true) } catch (err) { void err }
                    }
                    smSourceReloadMarket()
                }
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
