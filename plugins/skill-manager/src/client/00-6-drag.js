    /* Drag state and page render. 由 00-prelude.js 1500-1923 拆出。 */

    function smDragOver(targetId, event) {
        const dragging = smDragSource.dragging
        const target = String(targetId === undefined || targetId === null ? '' : targetId)
        if (dragging === null || target === '' || target === dragging) {
            smDragSource.over.target = null
            smDragSource.overId = null
            smDragSource.overAfter = null
            return null
        }
        let after = false
        const node = event !== null && event !== undefined ? event.currentTarget : null
        if (node !== null && node !== undefined && typeof node.getBoundingClientRect === 'function') {
            const rect = node.getBoundingClientRect()
            after = (Number(event.clientY) || 0) > rect.top + rect.height / 2
        }
        const result = { id: target, after: after }
        smDragSource.over.target = result
        smDragSource.overId = target
        smDragSource.overAfter = after
        if (event !== null && event !== undefined) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            if (event.dataTransfer !== null && event.dataTransfer !== undefined) {
                try { event.dataTransfer.dropEffect = 'move' } catch { /* ignore */ }
            }
        }
        return result
    }

    const smDragSource = {
        key: DRAG_KEY,
        dragging: null,
        over: smDragOver,
        overId: null,
        overAfter: null,
        start: function (id, event) {
            const key = String(id === undefined || id === null ? '' : id)
            if (key === '') return false
            smDragSource.dragging = key
            smDragSource.over.target = null
            smDragSource.overId = null
            smDragSource.overAfter = null
            if (event !== null && event !== undefined && event.dataTransfer !== null && event.dataTransfer !== undefined) {
                try {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData(DRAG_KEY, key)
                    event.dataTransfer.setData('text/plain', key)
                } catch {
                    /* some environments reject custom types; dragging still works */
                }
            }
            return true
        },
        drop: function () {
            const from = smDragSource.dragging
            const target = smDragSource.over.target
            smDragSource.dragging = null
            smDragSource.over.target = null
            smDragSource.overId = null
            smDragSource.overAfter = null
            if (from === null || target === null) return null
            return { from: from, to: target.id, after: target.after === true }
        },
        end: function () {
            smDragSource.dragging = null
            smDragSource.over.target = null
            smDragSource.overId = null
            smDragSource.overAfter = null
        },
    }

    /* ------------------------------------------------------------------ *
     * Page shell.                                                         *
     * ------------------------------------------------------------------ */

    function switchTab(tab) {
        if (tab !== 'skills' && tab !== 'market') return
        if (appState.tab === tab && appState.view === 'list') return
        setState({ tab: tab, view: 'list', detail: null, menu: null })
        if (tab === 'market' && appState.marketSources.length === 0 && isLoading('market') !== true) void loadMarket()
    }

    function renderStatusIcons() {
        const broken = brokenSkillCount()
        const updates = updateSkillCount()
        if (broken === 0 && updates === 0) return null
        const checking = appState.checking === true || (appState.updates !== null && typeof appState.updates === 'object' && appState.updates.checking === true)
        const items = []
        if (broken > 0) {
            const label = t('status.brokenTooltip', { count: broken })
            items.push(h('button', {
                key: 'broken',
                type: 'button',
                className: 'sm-icon-btn sm-status-icon sm-status-icon-warn',
                'aria-label': label,
                'data-tip': label,
                onClick: function () {
                    if (typeof openDiagnosticsDrawer === 'function') openDiagnosticsDrawer()
                },
            }, icon('alert', 16)))
        }
        if (updates > 0) {
            const label = checking
                ? t('status.checking')
                : t('status.updatesTooltip', { count: updates, time: lastCheckedLabel() })
            items.push(h('button', {
                key: 'updates',
                type: 'button',
                className: 'sm-icon-btn sm-status-icon sm-status-icon-update',
                'aria-label': label,
                'data-tip': label,
                disabled: checking,
                'aria-busy': checking ? 'true' : undefined,
                onClick: function () {
                    if (typeof openModal === 'function') openModal('update', { all: true })
                },
            }, icon('arrow-up-dot', 16)))
        }
        return h('div', { className: 'sm-status-icons' }, items)
    }

    /* Primary tabs, in display order. Roving tabindex: only the selected tab
     * is reachable with Tab; the arrow keys move between them. */
    const PRIMARY_TABS = ['skills', 'market']

    function focusPrimaryTab(id) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const node = document.querySelector('.sm-tabs [data-tab="' + id + '"]')
        if (node !== null && node !== undefined && typeof node.focus === 'function') node.focus()
    }

    function primaryTabKeyDown(event) {
        const keys = PRIMARY_TABS
        const index = keys.indexOf(appState.tab)
        let next = null
        if (event.key === 'ArrowRight') next = keys[(index + 1) % keys.length]
        else if (event.key === 'ArrowLeft') next = keys[(index - 1 + keys.length) % keys.length]
        else if (event.key === 'Home') next = keys[0]
        else if (event.key === 'End') next = keys[keys.length - 1]
        else return
        event.preventDefault()
        switchTab(next)
        const focus = function () { focusPrimaryTab(next) }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focus)
        else focus()
    }

    function renderPrimaryTabs() {
        const items = [
            { id: 'skills', label: t('tab.skills') },
            { id: 'market', label: t('tab.market') },
        ]
        return h('div', { className: 'sm-tabs', role: 'tablist', onKeyDown: primaryTabKeyDown },
            items.map(function (item) {
                const active = appState.tab === item.id
                return h('button', {
                    key: item.id,
                    type: 'button',
                    role: 'tab',
                    className: cx('sm-tab', active && 'sm-tab-active'),
                    'aria-selected': active,
                    tabIndex: active ? 0 : -1,
                    'data-tab': item.id,
                    onClick: function () { switchTab(item.id) },
                }, h('span', null, item.label))
            }))
    }

    /* Skills-page toolbar (contract 7.4): search · sort · new / import / check. */
    function renderSkillsToolbar() {
        const search = String(appState.search === undefined || appState.search === null ? '' : appState.search)
        /* v1 persisted `recent`; contract §3.1 renames it to `modified`.
         * Normalize on read so the dropdown shows the value the sorter uses. */
        const rawSort = String(appState.sort === undefined || appState.sort === null ? '' : appState.sort)
        const sort = rawSort === 'recent' ? 'modified' : rawSort
        const checking = appState.checking === true
        return h(SmSearchToolbar, {
            search: search,
            searchPlaceholder: t('search.skills.placeholder'),
            clearLabel: t('search.clear'),
            onSearchClear: function () { setState({ search: '' }) },
            onSearchChange: function (event) {
                const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
                    ? String(event.target.value || '')
                    : ''
                setState({ search: value })
            },
            sortValue: SKILL_SORTS.indexOf(sort) !== -1 ? sort : 'name',
            sortLabel: t('sort.label'),
            sortOptions: SKILL_SORTS.map(function (key) {
                return { value: key, label: t(SKILL_SORT_LABEL_KEYS[key] || 'sort.name') }
            }),
            onSortChange: function (event) {
                const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
                    ? String(event.target.value || 'name')
                    : 'name'
                setState({ sort: value })
            },
        },
            h('div', { className: 'sm-toolbar-actions' },
                h(SmButton, {
                    tone: 'secondary',
                    icon: 'refresh',
                    className: 'sm-toolbar-btn',
                    disabled: checking,
                    onClick: function () {
                        if (typeof checkUpdates === 'function') void checkUpdates()
                    },
                }, t('action.checkUpdates')),
                h('div', { className: 'sm-split-btn' },
                    h(SmButton, {
                        tone: 'primary',
                        icon: 'plus',
                        className: 'sm-toolbar-btn sm-split-main',
                        style: { borderRadius: '12px 0 0 12px' },
                        onClick: function () {
                            if (typeof openModal === 'function') openModal('new-skill', {})
                        },
                    }, t('action.newSkill')),
                    h('button', {
                        type: 'button',
                        className: 'sm-split-arrow',
                        'aria-label': t('action.more'),
                        'aria-haspopup': 'menu',
                        'aria-expanded': appState.menu !== null && typeof appState.menu === 'object' && appState.menu.type === 'new-skill' ? 'true' : 'false',
                        onClick: openNewSkillMenu,
                    }, icon('chevron-down', 16)))))
    }

    /** Split-button menu: new skill vs import skill. */
    function openNewSkillMenu(event) {
        let rect = null
        if (event !== null && event !== undefined && event.currentTarget !== null && event.currentTarget !== undefined
            && typeof event.currentTarget.getBoundingClientRect === 'function') {
            rect = event.currentTarget.getBoundingClientRect()
        }
        const width = 180
        const height = 92
        const viewportWidth = typeof window !== 'undefined' && window !== null ? window.innerWidth : 1024
        const viewportHeight = typeof window !== 'undefined' && window !== null ? window.innerHeight : 768
        const x = rect !== null ? rect.right - width : viewportWidth - width - 24
        let y = rect !== null ? rect.bottom + 4 : 120
        if (y + height > viewportHeight - 8) y = rect !== null ? rect.top - height - 4 : y
        setState({
            menu: {
                type: 'new-skill',
                x: Math.max(8, Math.min(viewportWidth - width - 8, x)),
                y: Math.max(8, Math.min(viewportHeight - height - 8, y)),
            },
        })
    }

    function renderNewSkillMenu() {
        const menu = appState.menu
        if (menu === null || typeof menu !== 'object' || menu.type !== 'new-skill') return null
        const close = function () { setState({ menu: null }) }
        const item = function (key, label, iconName, action) {
            return h('button', {
                key: key,
                type: 'button',
                role: 'menuitem',
                className: 'sm-menu-item',
                onClick: function () {
                    close()
                    if (typeof action === 'function') action()
                },
            },
            h('span', { className: 'sm-menu-icon' }, icon(iconName, 16)),
            h('span', null, label))
        }
        return [
            h('div', {
                key: 'backdrop',
                className: 'sm-menu-backdrop',
                onMouseDown: function (event) {
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                    close()
                },
            }),
            h('div', {
                key: 'menu',
                className: 'sm-menu sm-split-menu',
                role: 'menu',
                style: { left: menu.x + 'px', top: menu.y + 'px', width: '200px' },
                onClick: function (event) { event.stopPropagation() },
            },
            item('import', t('action.import'), 'import', function () {
                if (typeof openModal === 'function') openModal('import-skill', {})
            })),
        ]
    }

    function renderPageHeader() {
        return h('div', { className: 'sm-header sm-page-head' },
            h('div', { className: 'sm-page-head-text' },
                h('h1', { className: 'sm-title sm-page-title' }, t('panel.title')),
                h('p', { className: 'sm-desc sm-page-desc' }, t('panel.desc'))))
    }

    function renderActiveTab() {
        if (appState.tab === 'market') return typeof renderMarketTab === 'function' ? renderMarketTab() : null
        return typeof renderSkillsTab === 'function' ? renderSkillsTab() : null
    }

    function renderCategoryTabsSlot() {
        if (appState.tab !== 'skills') return null
        return typeof renderCategoryTabs === 'function' ? renderCategoryTabs() : null
    }

    function renderOverlays() {
        return h(Fragment, null,
            typeof renderModalLayer === 'function' ? renderModalLayer() : null,
            typeof renderSourceDialog === 'function' ? renderSourceDialog() : null,
            typeof renderDiagnosticsDrawer === 'function' ? renderDiagnosticsDrawer() : null,
            renderNewSkillMenu(),
            typeof renderTooltipLayer === 'function' ? renderTooltipLayer() : null,
            h(SmPageTipLifecycle),
            typeof renderToastHost === 'function' ? renderToastHost() : null)
    }

    /* ------------------------------------------------------------------ *
     * [data-tip] hover delegation. 50-modals.js owns smTip/smHideTooltip. *
     * ------------------------------------------------------------------ */

    let tipNode = null
    /* 鼠标按下后的短时窗口：随后的 focusin 是点击带来的，不排队显示提示语。 */
    let tipSuppressFocusUntil = 0
    /* Last rendered shell signature (view + tab); used to hide the tooltip
     * when list <-> detail switches even if a caller bypassed setState. */
    let smRenderedShell = null

    /** 归属检查：只处理本插件根内的目标；浮层自身挂在 body 上，额外放行。 */
    function isSmOwnedTipTarget(target) {
        if (target === null || target === undefined || typeof target.closest !== 'function') return false
        return target.closest('.sm-root') !== null || target.closest('.sm-tooltip') !== null
    }

    function closestTipNode(event) {
        const target = event !== null && event !== undefined ? event.target : null
        if (target === null || target === undefined || typeof target.closest !== 'function') return null
        return target.closest('[data-tip]')
    }

    function handlePageTipOver(event) {
        if (typeof smTip !== 'function') return
        if (!isSmOwnedTipTarget(event !== null && event !== undefined ? event.target : null)) return
        const node = closestTipNode(event)
        if (node === null || node === tipNode) return
        tipNode = node
        const label = typeof node.getAttribute === 'function' ? node.getAttribute('data-tip') : ''
        if (label === null || label === undefined || label === '') return
        const props = smTip(label)
        if (props !== null && typeof props === 'object' && typeof props.onMouseEnter === 'function') {
            props.onMouseEnter({ currentTarget: node })
        }
    }

    function handlePageTipOut(event) {
        if (!isSmOwnedTipTarget(event !== null && event !== undefined ? event.target : null)) return
        const node = closestTipNode(event)
        if (node === null) return
        const related = event.relatedTarget
        if (related !== null && related !== undefined && typeof node.contains === 'function' && node.contains(related)) return
        if (tipNode === node) {
            tipNode = null
            if (typeof smHideTooltip === 'function') smHideTooltip()
        }
    }

    /* 统一入口：任何点击（行、Tab、工具栏、状态图标、菜单项）都先收起
     * 提示语，不用逐个 onClick 补。 */
    function handlePageTipDown(event) {
        if (!isSmOwnedTipTarget(event !== null && event !== undefined ? event.target : null)) return
        /* 点击导致的 focusin 紧随其后，短时抑制以免提示语再次弹出。 */
        tipSuppressFocusUntil = Date.now() + 400
        tipNode = null
        if (typeof smHideTooltip === 'function') smHideTooltip()
    }

    /** 键盘聚焦：[data-tip] 元素获得焦点时按 300ms 延迟显示提示语。 */
    function handlePageTipFocus(event) {
        if (typeof smTip !== 'function') return
        if (Date.now() < tipSuppressFocusUntil) return
        if (!isSmOwnedTipTarget(event !== null && event !== undefined ? event.target : null)) return
        const node = closestTipNode(event)
        if (node === null || node === tipNode) return
        tipNode = node
        const label = typeof node.getAttribute === 'function' ? node.getAttribute('data-tip') : ''
        if (label === null || label === undefined || label === '') return
        const props = smTip(label)
        if (props !== null && typeof props === 'object' && typeof props.onFocus === 'function') {
            props.onFocus({ currentTarget: node })
        }
    }

    /** 失焦立即隐藏；焦点仍在元素内部时不隐藏，避免闪烁。 */
    function handlePageTipBlur(event) {
        if (!isSmOwnedTipTarget(event !== null && event !== undefined ? event.target : null)) return
        const node = closestTipNode(event)
        if (node === null) return
        const related = event.relatedTarget
        if (related !== null && related !== undefined && typeof node.contains === 'function' && node.contains(related)) return
        if (tipNode === node) tipNode = null
        if (typeof smHideTooltip === 'function') smHideTooltip()
    }
    function smHideTipIfTargetGone() {
        if (typeof smHideTooltipIfTargetGone === 'function') smHideTooltipIfTargetGone()
    }

    function renderPage(props) {
        const source = props !== null && typeof props === 'object' ? props : {}
        if (typeof source.t === 'function') boundT = source.t
        if (typeof source.locale === 'string' && /^(zh|en)/iu.test(source.locale)) appState.locale = source.locale
        if (typeof source.fontSize === 'number' && Number.isFinite(source.fontSize)) appState.fontSize = Math.round(source.fontSize)
        const size = Number.isFinite(appState.fontSize) && appState.fontSize > 0 ? appState.fontSize : DEFAULT_FONT_SIZE
        const rootStyle = { '--ds-fs': size + 'px' }
        const rootListeners = {
            onMouseOver: handlePageTipOver,
            onMouseOut: handlePageTipOut,
            onMouseDown: handlePageTipDown,
        }
        /* list <-> detail / skills <-> market 切换时主动收起提示语。 */
        const shell = (appState.view === 'detail' ? 'detail' : 'list') + ':' + String(appState.tab)
        if (smRenderedShell !== null && smRenderedShell !== shell) {
            tipNode = null
            if (typeof smHideTooltip === 'function') smHideTooltip()
        }
        smRenderedShell = shell
        smHideTipIfTargetGone()
        if (appState.view === 'detail' && typeof renderDetailPage === 'function') {
            return h('div', Object.assign({ className: 'sm-root sm-root-detail', style: rootStyle }, rootListeners),
                h('div', { className: 'sm-page sm-page-detail' }, renderDetailPage()),
                renderOverlays())
        }
        restoreListScroll()
        return h('div', Object.assign({ className: 'sm-root', style: rootStyle }, rootListeners),
            h('div', { className: 'sm-page' },
                renderPageHeader(),
                h('div', { className: 'sm-tabs-row' },
                    renderPrimaryTabs(),
                    renderStatusIcons()),
                appState.tab === 'skills' ? renderSkillsToolbar() : null,
                appState.tab === 'market' ? renderMarketToolbarSlot() : null,
                renderCategoryTabsSlot(),
                h('div', { className: 'sm-tab-view sm-scroll' }, renderActiveTab())),
            renderOverlays())
    }

    /** 滚动立即隐藏提示语。 */
    function handlePageTipScroll() {
        if (typeof smHideTooltip === 'function') smHideTooltip()
        tipNode = null
    }

    /**
     * focusin / focusout / scroll 委托。挂载时注册、卸载时移除，
     * 与页面组件同生命周期，避免插件卸载后残留监听。
     */
    function SmPageTipLifecycle() {
        useEffect(function () {
            if (typeof document === 'undefined' || document === null || typeof document.addEventListener !== 'function') return undefined
            const onFocusIn = function (event) { handlePageTipFocus(event) }
            const onFocusOut = function (event) { handlePageTipBlur(event) }
            const onScroll = function () { handlePageTipScroll() }
            document.addEventListener('focusin', onFocusIn, true)
            document.addEventListener('focusout', onFocusOut, true)
            document.addEventListener('scroll', onScroll, { capture: true, passive: true })
            return function () {
                document.removeEventListener('focusin', onFocusIn, true)
                document.removeEventListener('focusout', onFocusOut, true)
                document.removeEventListener('scroll', onScroll, { capture: true, passive: true })
            }
        }, [])
        return null
    }
