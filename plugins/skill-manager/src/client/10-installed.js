    /* ================================================================== *
     * 10-installed.js                                                     *
     * Installed tab: banners, filters, location groups, skill rows, menu. *
     * ================================================================== */

    function findInstalledSkill(id) {
        const data = appState.installed
        if (data === null || typeof data !== 'object' || !Array.isArray(data.skills)) return null
        return data.skills.find(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.id === id
        }) || null
    }

    function patchInstalledSkill(skill) {
        const data = appState.installed
        if (data === null || typeof data !== 'object' || !Array.isArray(data.skills)) return
        if (skill === null || typeof skill !== 'object') return
        const index = data.skills.findIndex(function (item) {
            return item !== null && typeof item === 'object' && item.id === skill.id
        })
        if (index >= 0) data.skills[index] = skill
        else data.skills.push(skill)
    }

    function skillMatchesQuery(skill, query) {
        if (query === '') return true
        const fields = [skill.name, skill.description, skill.whenToUse, skill.path, skill.rootPath]
        return fields.some(function (field) {
            return typeof field === 'string' && field.toLowerCase().includes(query)
        })
    }

    function sortInstalledSkills(items, sort) {
        const copy = items.slice()
        if (sort === 'name') {
            copy.sort(function (left, right) {
                return String(left.name || '').localeCompare(String(right.name || ''))
            })
        } else if (sort === 'modified') {
            copy.sort(function (left, right) {
                return (Number(right.mtime) || 0) - (Number(left.mtime) || 0)
            })
        }
        return copy
    }

    function installedFilterMatches(skill, filter) {
        if (filter === 'all') return true
        if (filter === 'disabled') return skill.status === 'disabled'
        return locationFilterKey(skill.location) === filter
    }

    function selectInstalledFilter(filter) {
        setState({
            filter: filter,
            disabledExpanded: filter === 'disabled' ? true : appState.disabledExpanded,
        })
    }

    function setInstalledSort(sort) {
        setState({ sort: sort })
    }

    function toggleDisabledGroup() {
        if (appState.filter === 'disabled') return
        setState({ disabledExpanded: appState.disabledExpanded !== true })
    }

    function clearInstalledSearch() {
        setState({ search: '' })
    }

    async function toggleSkillEnabled(skill, enabled, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        if (skill === null || typeof skill !== 'object') return
        if (skill.writable === false) {
            toast(t('error.readonly'), { tone: 'error' })
            return
        }
        if (appState.busySkillId === skill.id) return
        appState.busySkillId = skill.id
        rerender()
        try {
            const data = await api('skill/state', {
                method: 'POST',
                body: { path: skill.path, enabled: enabled === true },
            })
            const updated = data !== null && typeof data === 'object' && data.skill !== null && typeof data.skill === 'object'
                ? data.skill
                : Object.assign({}, skill, { status: enabled === true ? 'active' : 'disabled' })
            patchInstalledSkill(updated)
            if (opts.silent !== true) {
                toast(enabled === true ? t('toast.enabled', { name: skill.name }) : t('toast.disabled', { name: skill.name }), {
                    tone: 'ok',
                    actionLabel: t('action.undo'),
                    onAction: function () {
                        void toggleSkillEnabled(updated, enabled !== true, { silent: true })
                    },
                })
            }
            await loadInstalled(true)
        } catch (error) {
            toast(t('error.toggleState', {
                reason: error !== null && typeof error === 'object' && error.message ? error.message : t('error.generic'),
            }), { tone: 'error' })
        } finally {
            appState.busySkillId = null
            rerender()
        }
    }

    function openRowMenu(event, skill) {
        if (event !== null && event !== undefined) {
            if (typeof event.stopPropagation === 'function') event.stopPropagation()
            if (typeof event.preventDefault === 'function') event.preventDefault()
        }
        if (skill === null || typeof skill !== 'object') {
            toast(t('error.notFound'), { tone: 'error' })
            return
        }
        let rect = null
        if (event !== null && event !== undefined && event.currentTarget !== null && event.currentTarget !== undefined && typeof event.currentTarget.getBoundingClientRect === 'function') {
            rect = event.currentTarget.getBoundingClientRect()
        }
        const width = 208
        const height = 258
        const viewportWidth = typeof window !== 'undefined' && window !== null && typeof window.innerWidth === 'number' ? window.innerWidth : 1024
        const viewportHeight = typeof window !== 'undefined' && window !== null && typeof window.innerHeight === 'number' ? window.innerHeight : 768
        const anchorX = rect !== null ? rect.right - width : viewportWidth - width - 24
        const anchorY = rect !== null ? rect.bottom + 4 : 120
        const x = Math.max(8, Math.min(viewportWidth - width - 8, anchorX))
        const y = Math.max(8, Math.min(viewportHeight - height - 8, anchorY))
        setState({ rowMenu: { id: skill.id, x: x, y: y } })
    }

    function closeRowMenu() {
        if (appState.rowMenu !== null) setState({ rowMenu: null })
    }

    function menuButton(label, onClick, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        return h('button', {
            type: 'button',
            role: 'menuitem',
            className: cx('sm-menu-item', opts.danger === true && 'sm-menu-item-danger'),
            disabled: opts.disabled === true,
            'data-tip': opts.disabled === true ? t('badge.readonlyTip') : undefined,
            onClick: onClick,
        },
        opts.iconName ? icon(opts.iconName, 15) : null,
        h('span', null, label))
    }

    function renderRowMenu() {
        const menu = appState.rowMenu
        if (menu === null || typeof menu !== 'object') return null
        const skill = findInstalledSkill(menu.id)
        if (skill === null) return null
        const disabled = skill.status === 'disabled'
        const readonly = skill.writable === false
        const isMarket = skill.market !== null && typeof skill.market === 'object' && typeof skill.market.sourceId === 'string'
        const run = function (action) {
            return function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                closeRowMenu()
                if (typeof action === 'function') action()
            }
        }
        return h(Fragment, null,
            h('div', {
                className: 'sm-menu-backdrop',
                style: { position: 'fixed', inset: 0 },
                onClick: run(null),
                onContextMenu: function (event) {
                    event.preventDefault()
                    closeRowMenu()
                },
            }),
            h('div', {
                className: 'sm-menu',
                role: 'menu',
                style: { position: 'fixed', left: menu.x + 'px', top: menu.y + 'px' },
            },
            menuButton(t('action.viewDetails'), run(function () {
                rememberListScroll()
                setState({ view: 'detail', detail: { kind: 'installed', id: skill.id } })
            }), { iconName: 'file' }),
            menuButton(t('action.editContent'), run(function () {
                rememberListScroll()
                setState({ view: 'detail', detail: { kind: 'installed', id: skill.id, edit: true } })
            }), { iconName: 'edit', disabled: readonly }),
            skill.path ? menuButton(t('action.openFolder'), run(function () { openFolder(skill.path) }), { iconName: 'folder' }) : null,
            skill.path ? menuButton(t('action.copyPath'), run(function () { copyPath(skill.path) }), { iconName: 'copy' }) : null,
            h('div', { className: 'sm-menu-sep' }),
            menuButton(disabled ? t('action.enable') : t('action.disable'), run(function () {
                void toggleSkillEnabled(skill, disabled)
            }), { iconName: 'power', disabled: readonly }),
            menuButton(isMarket ? t('action.uninstall') : t('action.delete'), run(function () {
                if (typeof openModal === 'function') openModal(isMarket ? 'uninstall' : 'delete', { skill: skill, id: skill.id, name: skill.name })
            }), { iconName: 'trash', danger: true, disabled: readonly })))
    }

    function renderInstalledSkeleton() {
        const rows = [0, 1, 2, 3, 4, 5].map(function (index) {
            return h('div', { key: 'skeleton-row-' + String(index), className: 'sm-skeleton-row' },
                h('div', { className: 'sm-skeleton sm-skeleton-icon' }),
                h('div', { className: 'sm-skeleton-lines' },
                    h('div', { className: 'sm-skeleton sm-skeleton-line sm-skeleton-line-lg' }),
                    h('div', { className: 'sm-skeleton sm-skeleton-line' })))
        })
        return h('div', { className: 'sm-installed sm-installed-loading', 'aria-busy': 'true', 'aria-label': t('state.loading') },
            h('div', { className: 'sm-skeleton sm-skeleton-banner' }),
            h('div', { className: 'sm-skeleton-filters' },
                h('div', { className: 'sm-skeleton sm-skeleton-chip' }),
                h('div', { className: 'sm-skeleton sm-skeleton-chip' }),
                h('div', { className: 'sm-skeleton sm-skeleton-chip' }),
                h('div', { className: 'sm-skeleton sm-skeleton-chip' })),
            h('div', { className: 'sm-skeleton-rows' }, rows),
            h('div', { className: 'sm-sr-only' }, t('state.loadingInstalled')))
    }

    function renderInstalledError(error) {
        const unauthorized = error !== null && typeof error === 'object' && error.code === 'E_UNAUTHORIZED'
        return h('div', { className: 'sm-empty sm-empty-error', 'aria-label': t('state.error') },
            h('div', { className: 'sm-empty-icon' }, icon('alert', 40)),
            h('div', { className: 'sm-empty-title' }, unauthorized ? t('state.unauthorized') : t('error.loadInstalled')),
            h('div', { className: 'sm-empty-body' }, error !== null && typeof error === 'object' && error.message ? error.message : t('error.retryHint')),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary',
                    onClick: function () { void loadInstalled(true) },
                }, t('action.retry'))))
    }

    function renderInstalledBanners(data, updates, issues) {
        const banners = []
        const updateState = updates !== null && typeof updates === 'object' ? updates : {}
        const updateItems = Array.isArray(updateState.updates) ? updateState.updates : []
        const updateErrors = Array.isArray(updateState.errors) ? updateState.errors : []

        if (updateState.checking === true) {
            banners.push(h('div', { key: 'banner-checking', className: 'sm-banner sm-banner-update', 'aria-label': t('state.loadingUpdates'), title: t('update.checking') },
                h('div', { className: 'sm-banner-main' },
                    icon('clock', 16),
                    h('span', null, t('banner.checking')))))
        } else if (updateErrors.length > 0) {
            banners.push(h('div', { key: 'banner-update-error', className: 'sm-banner sm-banner-warn' },
                h('div', { className: 'sm-banner-main' },
                    icon('alert', 16),
                    h('span', null, t('update.failed'))),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { void checkUpdates(true) },
                }, t('action.retry'))))
        } else if (updateItems.length > 0) {
            const list = updateItems.map(function (item, index) {
                const name = item !== null && typeof item === 'object' && item.name ? String(item.name) : ''
                const current = item !== null && typeof item === 'object' ? versionLabel(item.current) : ''
                const available = item !== null && typeof item === 'object' ? versionLabel(item.available) : ''
                return h('code', {
                    key: 'update-' + String(index) + '-' + name,
                    className: 'sm-mono sm-banner-code',
                    title: item !== null && typeof item === 'object' && item.localModified === true ? t('update.localModified') : undefined,
                }, t('update.item', { name: name, current: current, available: available }))
            })
            banners.push(h('div', { key: 'banner-updates', className: 'sm-banner sm-banner-update' },
                h('div', { className: 'sm-banner-main' },
                    icon('arrow-up', 16),
                    h('span', { className: 'sm-banner-title', 'data-tip': t('update.count', { count: updateItems.length }) }, t('update.banner', { count: updateItems.length })),
                    h('span', { className: 'sm-banner-items' }, list)),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { void checkUpdates(true) },
                }, t('action.checkUpdates'))))
        } else if (updateState.checkedAt) {
            banners.push(h('div', { key: 'banner-uptodate', className: 'sm-banner sm-banner-quiet' },
                h('div', { className: 'sm-banner-main' },
                    icon('check', 16),
                    h('span', null, t('banner.upToDate') + ' · ' + t('update.lastChecked', { time: fmtTime(updateState.checkedAt) })))))
        }

        const issueList = issues.filter(function (issue) {
            return issue !== null && typeof issue === 'object' && (issue.severity === 'error' || issue.severity === 'warning')
        })
        if (issueList.length > 0) {
            const errors = issueList.filter(function (issue) { return issue.severity === 'error' }).length
            const warnings = issueList.length - errors
            const summary = t('diag.issuesCount', { errors: errors, warnings: warnings })
            const summaryTip = t('diag.error') + ': ' + String(errors) + ' · ' + t('diag.warning') + ': ' + String(warnings)
            banners.push(h('div', { key: 'banner-issues', className: 'sm-banner sm-banner-warn' },
                h('div', { className: 'sm-banner-main' },
                    icon('alert', 16),
                    h('span', null, t('banner.issues', { count: issueList.length })),
                    h('span', { className: 'sm-banner-meta', 'data-tip': summaryTip }, summary)),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    'aria-label': t('diag.open'),
                    'data-tip': t('diag.viewReasons'),
                    title: t('diag.title'),
                    onClick: function () {
                        if (typeof openDiagnosticsDrawer === 'function') openDiagnosticsDrawer()
                        else toast(t('diag.none'))
                    },
                }, t('banner.viewIssues') + ' →')))
        }

        const locations = data !== null && typeof data === 'object' && Array.isArray(data.locations) ? data.locations : []
        locations.forEach(function (location) {
            if (location === null || typeof location !== 'object' || location.readable !== false) return
            banners.push(h('div', { key: 'banner-location-' + String(location.id), className: 'sm-banner sm-banner-error', 'aria-label': t('error.readLocation', { path: String(location.path || '') }) },
                h('div', { className: 'sm-banner-main' },
                    icon('alert', 16),
                    h('span', null, t('banner.unreadable', { path: String(location.path || '') }))),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { void loadInstalled(true) },
                }, t('action.retry'))))
        })

        if (appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'installed') {
            banners.push(h('div', { key: 'banner-load-error', className: 'sm-banner sm-banner-error' },
                h('div', { className: 'sm-banner-main' },
                    icon('alert', 16),
                    h('span', null, appState.error.message || t('error.loadInstalled'))),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { void loadInstalled(true) },
                }, t('action.retry'))))
        }

        return banners.length > 0 ? h('div', { className: 'sm-banners' }, banners) : null
    }

    function renderInstalledFilters() {
        const chips = [
            { key: 'all', label: t('filter.all') },
            { key: 'project', label: t('filter.project') },
            { key: 'projectShared', label: t('filter.projectShared') },
            { key: 'custom', label: t('filter.custom') },
            { key: 'user', label: t('filter.user') },
            { key: 'userShared', label: t('filter.userShared') },
            { key: 'builtin', label: t('filter.builtin') },
            { key: 'disabled', label: t('filter.disabled') },
        ]
        return h('div', { className: 'sm-filter-row' },
            h('div', { className: 'sm-chips', role: 'radiogroup', 'aria-label': t('filter.label') },
                chips.map(function (chip) {
                    const active = appState.filter === chip.key
                    return h('button', {
                        key: chip.key,
                        type: 'button',
                        role: 'radio',
                        'aria-checked': active,
                        className: cx('sm-chip', active && 'sm-chip-active'),
                        onClick: function () { selectInstalledFilter(chip.key) },
                    }, chip.label)
                })),
            h('label', { className: 'sm-sort' },
                h('span', { className: 'sm-sort-label' }, t('sort.label')),
                h('select', {
                    className: 'sm-select',
                    value: appState.sort,
                    'aria-label': t('sort.label'),
                    onChange: function (event) { setInstalledSort(event.target.value) },
                },
                h('option', { value: 'location' }, t('sort.location')),
                h('option', { value: 'name' }, t('sort.name')),
                h('option', { value: 'modified' }, t('sort.modified')))))
    }

    function renderLocationGroup(location, meta, items) {
        const writable = location.writable !== false && (meta === null || meta.writable !== false)
        const exists = location.exists !== false
        const rank = typeof location.rank === 'number' ? location.rank : meta !== null ? meta.rank : 0
        const path = typeof location.path === 'string' ? location.path : ''
        const canOpen = exists && path !== '' && location.absPath !== ''
        return h('section', {
            key: location.id,
            className: 'sm-group',
            'aria-label': locationLabel(location),
        },
        h('div', { className: 'sm-group-head' },
            h('div', { className: 'sm-group-head-left' },
                h('span', { className: 'sm-group-title' }, locationLabel(location)),
                path !== '' ? h('span', { className: 'sm-group-path sm-mono', title: path }, path) : null,
                h('span', { className: 'sm-badge sm-mono' }, t('loc.rank', { rank: rank })),
                h('span', { className: 'sm-group-count' }, t('loc.groupCount', { count: items.length }))),
            h('div', { className: 'sm-group-head-right' },
                writable !== true
                    ? h('span', { className: 'sm-badge', 'data-tip': t('badge.readonlyTip') }, t('badge.readonly'))
                    : null,
                canOpen
                    ? h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        onClick: function (event) {
                            if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                            openFolder(path)
                        },
                    }, t('action.openFolder'))
                    : null)),
        h('div', { className: 'sm-rows', role: 'list' }, items.map(function (skill) {
            return renderInstalledSkillRow(skill, location)
        })))
    }

    function renderInstalledSkillRow(skill, location) {
        const disabled = skill.status === 'disabled'
        const readonly = skill.writable === false
        const busy = appState.busySkillId === skill.id
        const updateVersion = skillUpdateVersion(skill)
        const version = skill.market !== null && typeof skill.market === 'object' && skill.market.version
            ? versionLabel(skill.market.version)
            : ''
        const tags = []
        if (updateVersion) {
            tags.push(renderUpgradeBadge(updateVersion, {
                key: 'upgrade',
                onClick: function (event) {
                    event.stopPropagation()
                    if (typeof openModal === 'function') openModal('update', { skill: skill, id: skill.id })
                },
            }))
        }
        tags.push(badge(locationLabel(location !== null && location !== undefined ? location : skill.location), null, skill.location, 'loc'))
        if (skill.invocation !== null && typeof skill.invocation === 'object' && skill.invocation.modelInvocable === true) {
            tags.push(badge(t('badge.model'), null, t('badge.modelTip'), 'model'))
        }
        if (skill.invocation !== null && typeof skill.invocation === 'object' && skill.invocation.userInvocable === true) {
            tags.push(badge(t('badge.user'), null, t('badge.userTip'), 'user'))
        }
        if (readonly) tags.push(badge(t('badge.builtin'), null, t('badge.readonlyTip'), 'builtin'))
        if (skill.status === 'shadowed') {
            tags.push(badge(t('badge.shadowed'), 'warn', t('badge.shadowedTip', { path: skill.shadowedBy || '' }), 'shadowed'))
        }
        if (disabled) tags.push(badge(t('badge.disabled'), null, t('state.disabled'), 'disabled'))
        if (skill.status === 'invalid') tags.push(badge(t('badge.invalid'), 'error', t('state.invalid'), 'invalid'))
        const visibleTags = tags.slice(0, 4)
        const openDetail = function () {
            if (busy) return
            rememberListScroll()
            setState({ view: 'detail', detail: { kind: 'installed', id: skill.id } })
        }
        return h('div', {
            key: skill.id,
            className: cx('sm-row', 'sm-skill-row', disabled && 'sm-row-disabled', appState.highlightId === skill.id && 'sm-row-highlight'),
            tabIndex: 0,
            role: 'listitem',
            'data-skill-id': skill.id,
            onClick: openDetail,
            onKeyDown: function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openDetail()
                }
            },
        },
        h('div', { className: 'sm-row-main' },
            renderSkillIconBox(skill),
            h('div', { className: 'sm-row-text' },
                h('div', { className: 'sm-row-title' },
                    h('span', { className: cx('sm-row-name', 'sm-mono', disabled && 'sm-row-name-disabled') }, String(skill.name || '')),
                    version !== '' ? h('span', { className: 'sm-row-version sm-mono' }, version) : null,
                    h('div', { className: 'sm-row-badges' }, visibleTags)),
                h('div', { className: 'sm-row-desc' }, typeof skill.description === 'string' && skill.description !== ''
                    ? skill.description
                    : t('state.emptyDescription')))),
        h('div', { className: 'sm-row-tail', onClick: function (event) { event.stopPropagation() } },
            readonly
                ? h('span', { className: 'sm-row-builtin', 'data-tip': t('status.readonly') }, t('badge.builtin'))
                : h('button', {
                    type: 'button',
                    className: cx('sm-switch', disabled && 'sm-switch-off'),
                    role: 'switch',
                    'aria-checked': disabled ? 'false' : 'true',
                    'aria-label': disabled ? t('action.enableSkill') : t('action.disableSkill'),
                    'data-tip': disabled ? t('action.enableSkill') : t('action.disableSkill'),
                    disabled: busy,
                    onClick: function (event) {
                        event.stopPropagation()
                        void toggleSkillEnabled(skill, disabled)
                    },
                }, h('span', { className: 'sm-switch-thumb' })),
            h('button', {
                type: 'button',
                className: 'sm-icon-btn sm-row-more',
                'aria-label': t('action.more'),
                'data-tip': t('action.more'),
                onClick: function (event) { openRowMenu(event, skill) },
            }, icon('more', 16))))
    }

    function renderDisabledGroup(items) {
        const expanded = appState.filter === 'disabled' || appState.disabledExpanded === true
        const canToggle = appState.filter !== 'disabled'
        return h('section', { key: 'disabled-group', className: 'sm-group sm-group-disabled' },
            h('div', {
                className: cx('sm-group-head', canToggle && 'sm-group-head-toggle'),
                role: canToggle ? 'button' : undefined,
                tabIndex: canToggle ? 0 : undefined,
                'aria-expanded': expanded,
                onClick: canToggle ? toggleDisabledGroup : undefined,
                onKeyDown: canToggle
                    ? function (event) {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            toggleDisabledGroup()
                        }
                    }
                    : undefined,
            },
            h('div', { className: 'sm-group-head-left' },
                icon(expanded ? 'chevron-down' : 'chevron-right', 14),
                h('span', { className: 'sm-group-title' }, t('loc.disabledGroup')),
                h('span', { className: 'sm-group-path sm-mono' }, t('loc.disabledPath')),
                h('span', { className: 'sm-badge' }, t('loc.groupCount', { count: items.length }))),
            canToggle
                ? h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function (event) {
                        event.stopPropagation()
                        toggleDisabledGroup()
                    },
                }, expanded ? t('action.collapse') : t('action.expand'))
                : null),
            expanded
                ? h('div', { className: 'sm-rows', role: 'list' }, items.map(function (skill) {
                    return renderInstalledSkillRow(skill, locationById(skill.location))
                }))
                : null)
    }

    function renderInstalledEmpty(kind, query) {
        if (kind === 'search') {
            return h('div', { className: 'sm-empty' },
                h('div', { className: 'sm-empty-icon' }, icon('search', 40)),
                h('div', { className: 'sm-empty-title' }, t('empty.search', { query: query })),
                h('div', { className: 'sm-empty-actions' },
                    h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-secondary',
                        onClick: clearInstalledSearch,
                    }, t('action.clearSearch'))))
        }
        if (kind === 'filter') {
            return h('div', { className: 'sm-empty' },
                h('div', { className: 'sm-empty-icon' }, icon('folder', 40)),
                h('div', { className: 'sm-empty-title' }, t('empty.filter')),
                h('div', { className: 'sm-empty-actions' },
                    h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-secondary',
                        onClick: function () { setState({ filter: 'all' }) },
                    }, t('action.clearFilter'))))
        }
        return h('div', { className: 'sm-empty sm-empty-installed' },
            h('div', { className: 'sm-empty-icon' }, icon('skill', 48)),
            h('div', { className: 'sm-empty-title' }, t('empty.installed.title')),
            h('div', { className: 'sm-empty-body' }, t('empty.installed.body')),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary',
                    onClick: function () { switchTab('market') },
                }, t('empty.marketAction')),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-secondary',
                    onClick: function () { if (typeof openModal === 'function') openModal('new', {}) },
                }, t('empty.newAction')),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-secondary',
                    onClick: function () { if (typeof openModal === 'function') openModal('import', {}) },
                }, t('empty.importAction'))))
    }

    function renderInstalledTab() {
        const data = appState.installed
        if (data === null || typeof data !== 'object') {
            if (appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'installed' && appState.loadingInstalled !== true) {
                return renderInstalledError(appState.error)
            }
            return renderInstalledSkeleton()
        }

        const locations = Array.isArray(data.locations) ? data.locations : []
        const skills = Array.isArray(data.skills) ? data.skills : []
        const issues = Array.isArray(data.issues) ? data.issues : []
        const updates = appState.updates !== null && typeof appState.updates === 'object' ? appState.updates : data.updates
        const query = String(appState.search || '').trim().toLowerCase()
        const filter = appState.filter
        const matchesQuery = function (skill) { return skillMatchesQuery(skill, query) }

        const activeSkills = skills.filter(function (skill) {
            return skill !== null && typeof skill === 'object'
                && skill.status !== 'disabled'
                && matchesQuery(skill)
                && installedFilterMatches(skill, filter === 'disabled' ? 'all' : filter)
        })
        const disabledSkills = skills.filter(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.status === 'disabled' && matchesQuery(skill)
        })
        const visibleActive = filter === 'disabled' ? [] : activeSkills
        const showDisabled = filter === 'all' || filter === 'disabled'
        const visibleDisabled = showDisabled ? disabledSkills : []
        const sortedActive = sortInstalledSkills(visibleActive, appState.sort)

        const groups = []
        if (filter !== 'disabled') {
            LOCATION_ORDER.forEach(function (meta) {
                const items = sortedActive.filter(function (skill) { return skill.location === meta.id })
                if (items.length === 0) return
                const found = locations.find(function (location) {
                    return location !== null && typeof location === 'object' && location.id === meta.id
                })
                const location = found !== undefined
                    ? found
                    : Object.assign({}, meta, {
                        path: '',
                        absPath: '',
                        exists: true,
                        readable: true,
                        skillCount: items.length,
                        disabledCount: 0,
                        presets: [],
                    })
                groups.push(renderLocationGroup(location, meta, items))
            })
        }
        if (showDisabled && visibleDisabled.length > 0) {
            groups.push(renderDisabledGroup(sortInstalledSkills(visibleDisabled, appState.sort)))
        }

        let content = null
        if (skills.length === 0) {
            content = renderInstalledEmpty('installed', '')
        } else if (query !== '' && visibleActive.length === 0 && visibleDisabled.length === 0) {
            content = renderInstalledEmpty('search', appState.search)
        } else if (groups.length === 0) {
            content = renderInstalledEmpty('filter', '')
        } else {
            content = h('div', { className: 'sm-groups' }, groups)
        }

        return h('div', { className: 'sm-installed' },
            renderInstalledBanners(data, updates, issues),
            renderInstalledFilters(),
            content,
            renderRowMenu())
    }
