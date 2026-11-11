    /* 由原 30-source-dialog.js 行 502-913 拆出。 */
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
            className: 'sm-drag-handle',
            role: 'button',
            tabIndex: 0,
            'data-source-handle': id,
            'aria-label': t('source.dragHandle'),
            'data-tip': t('source.dragHandle'),
            'aria-disabled': total <= 1 ? 'true' : undefined,
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
                smSourceDialogDrag !== null && smSourceDialogDrag.id === id && 'is-dragging'
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
            /* 行高/间距由 .sm-source-row 提供，拖动态透明度由 .is-dragging 提供；
               分隔线暂无等价类，暂留行内。 */
            style: {
                borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
            },
        },
        smSourceHandle(source, total),
        h('span', {
            className: cx('sm-dot', dot.className),
            'data-tip': dot.tip,
            title: dot.tip,
        }),
        h('div', {
            className: 'sm-source-name-wrap',
        },
        h('span', {
            className: 'sm-source-name',
            title: name,
        }, name),
        h('span', {
            className: 'sm-source-meta',
        }, smSourceCheckedText(source))),
        h('span', {
            className: 'sm-badge sm-mono',
        }, t('source.skillCount', { count: count })),
        h('div', {
            className: 'sm-source-actions',
        },
        smSourceSwitch(source, frozen),
        smSourceIconAction('edit', 'edit', t('action.editSource'), function () {
            if (typeof openModal === 'function') openModal('add-source', { source: source })
        }, frozen || busy),
        smSourceIconAction('refresh', 'refresh', t('action.refresh'), function () {
            smSourceRefresh(source)
        }, frozen || busy),
        smSourceIconAction('delete', 'trash', t('action.deleteSource'), function () {
            smSourceDelete(source)
        }, frozen)))
        if (errorText === '') return rowNode
        const errorNode = h('div', {
            key: 'error-' + id,
            className: 'sm-source-error',
            role: 'alert',
            /* 字号/颜色/行高由 .sm-source-error 提供；布局暂无等价类，暂留行内。 */
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px 8px 32px',
            },
        },
        icon('alert', 14),
        h('span', { className: 'sm-ellipsis', style: { flex: '1 1 auto' } }, errorText),
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
            className: 'sm-drop-indicator',
            'aria-hidden': 'true',
            /* 高度/底色由 .sm-drop-indicator 提供；缩进暂无等价类，暂留行内。 */
            style: {
                margin: '0 0 0 26px',
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
        },
        h('span', { className: 'sm-skeleton', style: { width: '16px', height: '16px', flex: 'none' } }),
        h('div', {
            className: 'sm-source-name-wrap',
            style: { gap: '6px' },
        },
        h('span', { className: 'sm-skeleton', style: { maxWidth: '180px' } }),
        h('span', { className: 'sm-skeleton', style: { maxWidth: '120px', minHeight: '10px' } })))
    }

    function smSourceDialogBody(list, scopedError, loading) {
        if (list.length > 0) {
            return h('div', {
                className: 'sm-source-list',
                /* 布局与内边距由 .sm-source-list 提供；flex 与拖拽期 user-select 保留。 */
                style: {
                    flex: '1 1 auto',
                    userSelect: smSourceDialogDrag !== null ? 'none' : 'auto',
                },
            }, smSourceRows(list))
        }
        if (loading) {
            return h('div', {
                className: 'sm-source-list',
                'aria-busy': 'true',
                style: { flex: '1 1 auto' },
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
            /* 外观由 .sm-source-ghost 提供；仅保留拖拽过程态的坐标与宽度。 */
            style: {
                left: smSourceDialogDrag.x + 12 + 'px',
                top: smSourceDialogDrag.y + 12 + 'px',
                width: smSourceDialogDrag.width > 0 ? smSourceDialogDrag.width + 'px' : undefined,
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
            /* 与 .sm-dialog-head 的 padding/gap 不同，布局暂无等价类，暂留行内。 */
            style: {
                alignItems: 'center',
                gap: '8px',
                padding: '16px 20px',
                borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
            },
        },
        h('div', {
            key: 'title',
            className: 'sm-dialog-head-left',
        },
        h('span', {
            className: 'sm-dialog-title',
            style: { fontSize: 'calc(var(--ds-fs) + 2px)' },
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
            /* 方向/溢出由 .sm-source-dialog .sm-dialog-body 提供；gap 与上内边距不同，暂留。 */
            style: {
                gap: '12px',
                padding: '12px 20px 16px',
            },
        },
        smSourceDialogBody(list, scopedError, loading),
        h('div', { key: 'live', className: 'sm-sr-only', 'aria-live': 'polite' }, smSourceDialogAnnounce))

        const foot = h('div', {
            key: 'foot',
            className: 'sm-dialog-foot',
            /* 布局/间距由 .sm-dialog-foot 提供；仅上边框色值与类不同，暂留。 */
            style: {
                borderTop: '0.5px solid var(--dsw-alias-border-l2)',
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
            /* 尺寸/边框/背景/阴影均由 .sm-source-dialog 与 .sm-dialog 提供。 */
            style: {
                boxSizing: 'border-box',
            },
        }, head, body, foot)

        const mask = h('div', {
            key: 'mask',
            className: 'sm-dialog-mask',
            onMouseDown: function (event) {
                if (event === null || event === undefined) return
                if (event.target !== event.currentTarget) return
                if (smSourceDialogDrag !== null) return
                closeSourceDialog()
            },
        }, dialog)

        return h(Fragment, null, mask, smSourceGhost())
    }
