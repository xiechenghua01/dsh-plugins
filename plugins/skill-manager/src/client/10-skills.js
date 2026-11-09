    /* ================================================================== *
     * 10-skills.js                                                        *
     * Skills tab: category tabs, source groups, two-column card grid,     *
     * card row menu, empty / loading / error states (contract v2 §3.3,    *
     * §5.2, §7.2, §7.3; interaction spec SL-01 ~ SL-06).                  *
     * ================================================================== */

    /* Fixed category order (interaction spec §3.2). Labels and empty-state
     * copy live in the locale dictionary; nothing here is user-visible. */
    const SKILL_CATEGORY_ORDER = ['mine', 'shared', 'project', 'system']

    const SKILL_CATEGORY_LABEL = {
        mine: 'tab.category.mine',
        shared: 'tab.category.shared',
        project: 'tab.category.project',
        system: 'tab.category.system',
    }

    const SKILL_CATEGORY_EMPTY = {
        mine: 'empty.tab.mine',
        shared: 'empty.tab.shared',
        project: 'empty.tab.project',
        system: 'empty.tab.builtin',
    }

    const SKILL_CATEGORY_ICON = {
        mine: 'user',
        shared: 'users',
        project: 'folder',
        system: 'package',
    }

    /* A skill mutation (enable / disable) is in flight; disables the row menu
     * action and keeps the undo toast from firing twice. */
    let skillsBusyId = null

    /* ------------------------------------------------------------------ *
     * Small data helpers.                                                 *
     * ------------------------------------------------------------------ */

    function skillsIsSkill(skill) {
        return skill !== null && typeof skill === 'object'
    }

    function skillsQuery() {
        return String(appState.search === undefined || appState.search === null ? '' : appState.search).trim().toLowerCase()
    }

    function skillsMatchesQuery(skill, query) {
        if (query === '') return true
        if (!skillsIsSkill(skill)) return false
        const fields = [skill.name, skill.description, skill.whenToUse]
        return fields.some(function (field) {
            return typeof field === 'string' && field.toLowerCase().indexOf(query) !== -1
        })
    }

    /** All skills, defensively copied. */
    function skillsList() {
        return Array.isArray(appState.skills) ? appState.skills.filter(skillsIsSkill) : []
    }

    /** Skills whose name / description / whenToUse match the current search. */
    function skillsMatched() {
        const query = skillsQuery()
        return skillsList().filter(function (skill) { return skillsMatchesQuery(skill, query) })
    }

    /** Host-provided category count, with a local fallback. */
    function skillsCategoryTotal(category) {
        const counts = appState.categories
        if (counts !== null && typeof counts === 'object' && typeof counts[category] === 'number') {
            return counts[category]
        }
        return skillsList().filter(function (skill) { return skill.category === category }).length
    }

    /**
     * Categories that currently exist. "project" is hidden when there is no
     * project context (no cwd) and no project skills; the contract does not
     * expose a dedicated flag, so cwd + count is the signal.
     */
    function skillsAvailableCategories() {
        const hasCwd = String(appState.cwd === undefined || appState.cwd === null ? '' : appState.cwd) !== ''
        return SKILL_CATEGORY_ORDER.filter(function (key) {
            if (key !== 'project') return true
            return hasCwd || skillsCategoryTotal('project') > 0
        })
    }

    /**
     * The category actually shown. Search is cross-category: when the current
     * category has no hit but another one does, jump to the first matching
     * category (tab order) without overwriting the remembered selection.
     */
    function skillsEffectiveCategory() {
        const available = skillsAvailableCategories()
        const fallback = available.indexOf(appState.category) !== -1 ? appState.category : 'mine'
        const query = skillsQuery()
        if (query === '') return fallback
        const matched = skillsMatched()
        for (let index = 0; index < available.length; index += 1) {
            const key = available[index]
            const hit = matched.some(function (skill) { return skill.category === key })
            if (hit) return key
        }
        return fallback
    }

    function skillsSort(items) {
        const copy = items.slice()
        if (appState.sort === 'recent') {
            copy.sort(function (left, right) {
                return (Number(right.mtime) || 0) - (Number(left.mtime) || 0)
            })
        } else if (appState.sort === 'source') {
            const order = skillsSourceOrder()
            const rank = function (skill) {
                const id = typeof skill.sourceId === 'string' ? skill.sourceId : ''
                const index = order.indexOf(id)
                return index === -1 ? order.length : index
            }
            copy.sort(function (left, right) {
                return rank(left) - rank(right)
                    || String(left.name || '').localeCompare(String(right.name || ''))
            })
        } else {
            copy.sort(function (left, right) {
                return String(left.name || '').localeCompare(String(right.name || ''))
            })
        }
        return copy
    }

    /** Skills of one category, filtered by search and sorted. */
    function skillsInCategory(category, query) {
        const text = typeof query === 'string' ? query : skillsQuery()
        return skillsSort(skillsList().filter(function (skill) {
            return skill.category === category && skillsMatchesQuery(skill, text)
        }))
    }

    function skillsSourceOrder() {
        const ids = []
        const seen = Object.create(null)
        const push = function (id) {
            if (typeof id !== 'string' || id === '' || seen[id] === true) return
            seen[id] = true
            ids.push(id)
        }
        if (Array.isArray(appState.sourceOrder) && appState.sourceOrder.length > 0) {
            appState.sourceOrder.forEach(push)
        } else if (Array.isArray(appState.sources)) {
            appState.sources.forEach(function (source) {
                if (source !== null && typeof source === 'object') push(source.id)
            })
        }
        return ids
    }

    function skillsFindSource(sourceId) {
        if (!Array.isArray(appState.sources) || typeof sourceId !== 'string' || sourceId === '') return null
        const found = appState.sources.find(function (source) {
            return source !== null && typeof source === 'object' && source.id === sourceId
        })
        return found === undefined ? null : found
    }

    function skillsFindById(id) {
        return skillsList().find(function (skill) { return skill.id === id }) || null
    }

    /* ------------------------------------------------------------------ *
     * Grouping (contract §3.3).                                           *
     *                                                                     *
     * Each market source gets one group in `sourceOrder`; skills without  *
     * a sourceId, or whose source no longer exists, fall into `local`,    *
     * which is always last. Empty groups are omitted and system skills    *
     * are never grouped. Mirrors lib/scan.mjs#groupSkillsBySource.        *
     * ------------------------------------------------------------------ */

    function groupSkills(skills, sourceOrder) {
        const list = Array.isArray(skills) ? skills : []
        const order = []
        const seen = Object.create(null)
        const rawOrder = Array.isArray(sourceOrder) && sourceOrder.length > 0 ? sourceOrder : skillsSourceOrder()
        rawOrder.forEach(function (id) {
            if (typeof id !== 'string' || id === '' || seen[id] === true) return
            seen[id] = true
            order.push(id)
        })

        const buckets = Object.create(null)
        order.forEach(function (id) { buckets[id] = [] })
        const local = []
        list.forEach(function (skill) {
            if (!skillsIsSkill(skill) || skill.category === 'system') return
            const sourceId = typeof skill.sourceId === 'string' && skill.sourceId !== '' ? skill.sourceId : null
            if (sourceId === null || buckets[sourceId] === undefined) local.push(skill)
            else buckets[sourceId].push(skill)
        })

        const groups = []
        order.forEach(function (id) {
            const items = buckets[id]
            if (items.length === 0) return
            const named = items.find(function (skill) {
                return typeof skill.sourceName === 'string' && skill.sourceName !== ''
            })
            const source = skillsFindSource(id)
            groups.push({
                key: 'source:' + id,
                kind: 'source',
                sourceId: id,
                label: named !== undefined
                    ? named.sourceName
                    : source !== null && typeof source.name === 'string' && source.name !== ''
                        ? source.name
                        : id,
                count: items.length,
                skills: items,
            })
        })
        if (local.length > 0) {
            groups.push({
                key: 'local',
                kind: 'local',
                sourceId: null,
                label: t('group.local'),
                count: local.length,
                skills: local,
            })
        }
        return groups
    }

    /* ------------------------------------------------------------------ *
     * Navigation and row actions.                                         *
     * ------------------------------------------------------------------ */

    function skillsScrollTop() {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const node = document.querySelector('.sm-root .sm-tab-view.sm-scroll')
        if (node !== null && node !== undefined && typeof node.scrollTop === 'number') node.scrollTop = 0
    }

    function skillsSelectCategory(key) {
        if (SKILL_CATEGORY_ORDER.indexOf(key) === -1) return
        if (appState.category === key) return
        setState({ category: key })
        skillsScrollTop()
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(skillsScrollTop)
    }

    function skillsFocusCategory(key) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const node = document.querySelector('.sm-subtabs [data-category="' + key + '"]')
        if (node !== null && node !== undefined && typeof node.focus === 'function') node.focus()
    }

    function skillsOnCategoryKeyDown(event) {
        const keys = skillsAvailableCategories()
        const current = skillsEffectiveCategory()
        const index = keys.indexOf(current)
        let next = null
        if (event.key === 'ArrowRight') next = keys[(index + 1) % keys.length]
        else if (event.key === 'ArrowLeft') next = keys[(index - 1 + keys.length) % keys.length]
        else if (event.key === 'Home') next = keys[0]
        else if (event.key === 'End') next = keys[keys.length - 1]
        else return
        event.preventDefault()
        skillsSelectCategory(next)
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { skillsFocusCategory(next) })
    }

    function skillsOpenDetail(skill) {
        if (!skillsIsSkill(skill)) return
        rememberListScroll()
        setState({ view: 'detail', detail: { kind: 'installed', id: skill.id }, menu: null })
    }

    function skillsGoMarket() {
        if (typeof switchTab === 'function') {
            switchTab('market')
            return
        }
        setState({ tab: 'market', view: 'list', detail: null, menu: null })
    }

    function skillsOpenMenu(event, skill) {
        if (event !== null && event !== undefined) {
            if (typeof event.stopPropagation === 'function') event.stopPropagation()
            if (typeof event.preventDefault === 'function') event.preventDefault()
        }
        if (!skillsIsSkill(skill)) return
        let rect = null
        if (event !== null && event !== undefined && event.currentTarget !== null && event.currentTarget !== undefined
            && typeof event.currentTarget.getBoundingClientRect === 'function') {
            rect = event.currentTarget.getBoundingClientRect()
        }
        const width = 200
        const height = 186
        const viewportWidth = typeof window !== 'undefined' && window !== null && typeof window.innerWidth === 'number' ? window.innerWidth : 1024
        const viewportHeight = typeof window !== 'undefined' && window !== null && typeof window.innerHeight === 'number' ? window.innerHeight : 768
        const anchorX = rect !== null ? rect.right - width : viewportWidth - width - 24
        let y = rect !== null ? rect.bottom + 4 : 120
        if (y + height > viewportHeight - 8) y = rect !== null ? rect.top - height - 4 : y
        setState({
            menu: {
                type: 'skill',
                id: skill.id,
                x: Math.max(8, Math.min(viewportWidth - width - 8, anchorX)),
                y: Math.max(8, Math.min(viewportHeight - height - 8, y)),
            },
        })
    }

    function skillsCloseMenu() {
        if (appState.menu !== null && typeof appState.menu === 'object' && appState.menu.type === 'skill') {
            setState({ menu: null })
        }
    }

    function skillsFocusMore(id) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelectorAll !== 'function') return
        const cards = document.querySelectorAll('.sm-card-item[data-skill-id]')
        for (let index = 0; index < cards.length; index += 1) {
            const card = cards[index]
            if (card.getAttribute('data-skill-id') !== id) continue
            const button = typeof card.querySelector === 'function' ? card.querySelector('.sm-card-more') : null
            if (button !== null && button !== undefined && typeof button.focus === 'function') button.focus()
            return
        }
    }

    function skillsMenuKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            const id = appState.menu !== null && typeof appState.menu === 'object' ? appState.menu.id : ''
            skillsCloseMenu()
            if (typeof id === 'string' && id !== '') skillsFocusMore(id)
            return
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        const root = event.currentTarget
        if (root === null || root === undefined || typeof root.querySelectorAll !== 'function') return
        event.preventDefault()
        const items = Array.prototype.slice.call(root.querySelectorAll('[role="menuitem"]:not(:disabled)'))
        if (items.length === 0) return
        const active = typeof document !== 'undefined' && document !== null ? document.activeElement : null
        const index = items.indexOf(active)
        let next = 0
        if (event.key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % items.length
        else next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length
        if (typeof items[next].focus === 'function') items[next].focus()
    }

    function skillsMenuItem(key, label, iconName, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        return h('button', {
            key: key,
            type: 'button',
            role: 'menuitem',
            className: cx('sm-menu-item', opts.danger === true && 'sm-menu-item-danger'),
            disabled: opts.disabled === true,
            'data-tip': opts.disabled === true ? opts.tip : undefined,
            autoFocus: opts.autoFocus === true,
            onClick: opts.onClick,
        },
        h('span', { className: 'sm-menu-icon' }, icon(iconName, 15)),
        h('span', null, label))
    }

    /** Row menu: details / copy location / disable or restore / uninstall or delete. */
    function renderSkillMenu() {
        const menu = appState.menu
        if (menu === null || typeof menu !== 'object' || menu.type !== 'skill') return null
        const skill = skillsFindById(menu.id)
        if (skill === null) return null
        const disabled = skill.status === 'disabled'
        const readonly = skill.writable === false
        const isMarket = typeof skill.sourceId === 'string' && skill.sourceId !== ''
        const hasPath = typeof skill.path === 'string' && skill.path !== ''
        const run = function (action) {
            return function (event) {
                if (event !== null && event !== undefined) {
                    if (typeof event.stopPropagation === 'function') event.stopPropagation()
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                }
                skillsCloseMenu()
                if (typeof action === 'function') action()
            }
        }
        const destructiveLabel = isMarket ? t('action.uninstall') : t('action.delete')
        const itemStyle = { left: menu.x + 'px', top: menu.y + 'px', width: '200px' }
        return [
            h('div', {
                key: 'backdrop',
                className: 'sm-menu-backdrop',
                onClick: skillsCloseMenu,
                onContextMenu: function (event) {
                    event.preventDefault()
                    skillsCloseMenu()
                },
            }),
            h('div', {
                key: 'menu',
                className: 'sm-menu',
                role: 'menu',
                style: itemStyle,
                onClick: function (event) { event.stopPropagation() },
                onKeyDown: skillsMenuKeyDown,
            },
            skillsMenuItem('view', t('action.viewDetail'), 'file', {
                autoFocus: true,
                onClick: run(function () { skillsOpenDetail(skill) }),
            }),
            skillsMenuItem('copy', t('action.copyPath'), 'copy', {
                disabled: !hasPath,
                tip: readonly ? t('detail.location.builtin') : t('error.notFound'),
                onClick: run(function () { copyPath(skill.path) }),
            }),
            skillsMenuItem('toggle', disabled ? t('action.enable') : t('action.disable'), 'power', {
                disabled: readonly,
                tip: t('error.readonly'),
                onClick: run(function () { void skillsToggleEnabled(skill, disabled) }),
            }),
            h('div', { key: 'sep', className: 'sm-menu-sep' }),
            skillsMenuItem('destructive', destructiveLabel, 'trash', {
                danger: true,
                disabled: readonly,
                tip: t('error.readonly'),
                onClick: run(function () {
                    if (typeof openModal === 'function') {
                        openModal(isMarket ? 'uninstall' : 'delete', { skill: skill, id: skill.id, name: skill.name })
                    }
                }),
            })),
        ]
    }

    async function skillsToggleEnabled(skill, enabled, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        if (!skillsIsSkill(skill)) return
        if (skill.writable === false) {
            toast(t('error.readonly'), { tone: 'error' })
            return
        }
        if (skillsBusyId === skill.id) return
        skillsBusyId = skill.id
        rerender()
        try {
            const data = await api('skill/state', {
                method: 'POST',
                body: { path: skill.path, enabled: enabled === true },
            })
            const updated = data !== null && typeof data === 'object' && data.skill !== null && typeof data.skill === 'object'
                ? data.skill
                : Object.assign({}, skill, { status: enabled === true ? 'active' : 'disabled' })
            const list = Array.isArray(appState.skills) ? appState.skills : []
            const index = list.findIndex(function (item) { return skillsIsSkill(item) && item.id === skill.id })
            if (index >= 0) {
                const next = list.slice()
                next[index] = updated
                appState.skills = next
            }
            if (opts.silent !== true) {
                toast(enabled === true ? t('toast.enabled', { name: skill.name }) : t('toast.disabled', { name: skill.name }), {
                    tone: 'ok',
                    actionLabel: t('action.undo'),
                    onAction: function () {
                        void skillsToggleEnabled(updated, enabled !== true, { silent: true })
                    },
                })
            }
            await loadInstalled(true)
        } catch (error) {
            toast(error !== null && typeof error === 'object' && error.message ? error.message : t('error.generic'), { tone: 'error' })
        } finally {
            skillsBusyId = null
            rerender()
        }
    }

    /* ------------------------------------------------------------------ *
     * Category tabs (contract §7.2, interaction spec §4.1).               *
     * ------------------------------------------------------------------ */

    function renderCategoryTabs() {
        const categories = skillsAvailableCategories()
        const selected = skillsEffectiveCategory()
        const loading = isLoading('installed') === true && skillsList().length === 0
        return h('div', { className: 'sm-subtabs-row' },
            h('div', {
                className: 'sm-subtabs',
                role: 'tablist',
                'aria-label': t('tab.skills.label'),
                onKeyDown: skillsOnCategoryKeyDown,
            },
            categories.map(function (key) {
                const active = key === selected
                const count = skillsCategoryTotal(key)
                return h('button', {
                    key: key,
                    type: 'button',
                    role: 'tab',
                    className: 'sm-subtab',
                    'aria-selected': active,
                    tabIndex: active ? 0 : -1,
                    'data-category': key,
                    disabled: loading,
                    onClick: function () { skillsSelectCategory(key) },
                },
                h('span', null, t(SKILL_CATEGORY_LABEL[key])),
                h('span', { className: 'sm-count-badge sm-subtab-count', 'aria-label': t('group.count', { count: count }) }, String(count)))
            })))
    }

    /* ------------------------------------------------------------------ *
     * Group rendering (contract §3.3 / §7.3, interaction spec §4.10).      *
     * ------------------------------------------------------------------ */

    function skillsGroupTitleId(group) {
        return 'sm-group-' + String(group.key).replace(/[^A-Za-z0-9_-]/g, '-')
    }

    function renderSkillGroup(group) {
        const source = group.sourceId !== null ? skillsFindSource(group.sourceId) : null
        const sourceDisabled = group.kind === 'source' && source !== null && typeof source === 'object' && source.enabled === false
        const titleId = skillsGroupTitleId(group)
        return h('section', {
            key: group.key,
            className: 'sm-group',
            role: 'group',
            'aria-labelledby': titleId,
        },
        h('div', { className: 'sm-group-head' },
            h('div', { className: 'sm-group-head-left' },
                h('span', { className: 'sm-group-title', id: titleId }, group.label),
                sourceDisabled ? h('span', { className: 'sm-badge sm-badge-idle' }, t('source.disabled')) : null,
                h('span', { className: 'sm-group-count' }, t('group.count', { count: group.count })))),
        h('div', { className: 'sm-card-grid' }, group.skills.map(renderSkillCard)))
    }

    function renderSkillGroups() {
        const category = skillsEffectiveCategory()
        const items = skillsInCategory(category)
        /* System built-ins all come from the Harness: flat grid, no source groups. */
        if (category === 'system') {
            return h('div', { className: 'sm-card-grid' }, items.map(renderSkillCard))
        }
        const groups = groupSkills(items, skillsSourceOrder())
        return h('div', { className: 'sm-groups sm-skill-groups' }, groups.map(renderSkillGroup))
    }

    /* ------------------------------------------------------------------ *
     * Card (contract §7.3, interaction spec §4.2).                        *
     * ------------------------------------------------------------------ */

    function renderSkillCard(skill) {
        const disabled = skill.status === 'disabled'
        const broken = skill.status === 'broken' || skill.status === 'invalid'
        const readonly = skill.writable === false
        const updateVersion = skillUpdateVersion(skill)
        const description = typeof skill.description === 'string' ? skill.description : ''
        const badges = []
        /* Upgrade badge sits first in the tag bar (interaction spec §4.2). */
        if (updateVersion !== '') {
            badges.push(renderUpgradeBadge(updateVersion, { key: 'update' }))
        }
        if (broken) {
            badges.push(h('span', {
                key: 'issue',
                className: 'sm-badge sm-badge-warn',
                'data-tip': typeof skill.brokenReason === 'string' && skill.brokenReason !== '' ? skill.brokenReason : t('badge.issue'),
            }, t('badge.issue')))
        }
        if (disabled) {
            badges.push(h('span', { key: 'disabled', className: 'sm-badge sm-badge-idle' }, t('badge.disabled')))
        }
        /* The skills page lists installed skills: no install / installed action.
         * Only an available update offers a primary button, and read-only or
         * disabled cards never show a write action. */
        const primary = updateVersion !== '' && !disabled && !readonly
            ? h('button', {
                key: 'update',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function (event) {
                    event.stopPropagation()
                    if (typeof openModal === 'function') openModal('update', { skill: skill, id: skill.id })
                },
            }, t('action.update'))
            : null
        return h('div', {
            key: skill.id,
            className: cx('sm-card-item', disabled && 'is-disabled'),
            role: 'button',
            tabIndex: 0,
            'data-skill-id': skill.id,
            onClick: function () { skillsOpenDetail(skill) },
            onKeyDown: function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    skillsOpenDetail(skill)
                }
            },
        },
        renderSkillIconBox(skill),
        h('div', { className: 'sm-card-main' },
            h('div', { className: 'sm-card-title-row' },
                h('span', { className: 'sm-card-name sm-mono', title: String(skill.name || '') }, String(skill.name || '')),
                badges.length > 0 ? h('span', { className: 'sm-tagbar' }, badges) : null),
            h('div', {
                className: 'sm-card-desc',
                'data-tip': description !== '' ? description : undefined,
            }, description)),
        h('div', {
            className: 'sm-card-tail',
            onClick: function (event) { event.stopPropagation() },
        },
        h('button', {
            type: 'button',
            className: 'sm-icon-btn plain sm-card-more',
            'aria-label': t('action.more'),
            'data-tip': t('action.more'),
            onClick: function (event) { skillsOpenMenu(event, skill) },
        }, icon('more', 16)),
        primary))
    }

    /* ------------------------------------------------------------------ *
     * Empty / loading / error states (interaction spec SL-04 ~ SL-06).    *
     * ------------------------------------------------------------------ */

    function renderSkillSearchEmpty() {
        const query = String(appState.search === undefined || appState.search === null ? '' : appState.search).trim()
        return h('div', { className: 'sm-empty' },
            h('div', { className: 'sm-empty-icon' }, icon('search', 40)),
            h('div', { className: 'sm-empty-title' }, t('empty.search', { query: query })),
            h('div', { className: 'sm-empty-body' }, t('empty.search.body')),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-secondary',
                    onClick: function () { setState({ search: '' }) },
                }, t('search.clear'))))
    }

    function renderSkillCategoryEmpty(category) {
        const key = SKILL_CATEGORY_EMPTY[category] !== undefined ? SKILL_CATEGORY_EMPTY[category] : SKILL_CATEGORY_EMPTY.mine
        const actions = [
            h('button', {
                key: 'market',
                type: 'button',
                className: category === 'system' ? 'sm-btn sm-btn-secondary' : 'sm-btn sm-btn-primary',
                onClick: skillsGoMarket,
            }, t('action.goMarket')),
        ]
        /* Built-in skills cannot be created, so that category has one exit. */
        if (category !== 'system') {
            actions.push(h('button', {
                key: 'new',
                type: 'button',
                className: 'sm-btn sm-btn-secondary',
                onClick: function () {
                    if (typeof openModal === 'function') openModal('new-skill', {})
                },
            }, t('action.newSkill')))
        }
        return h('div', { className: 'sm-empty sm-empty-installed' },
            h('div', { className: 'sm-empty-icon' }, icon(SKILL_CATEGORY_ICON[category] || 'skill', 48)),
            h('div', { className: 'sm-empty-title' }, t(key)),
            h('div', { className: 'sm-empty-actions' }, actions))
    }

    function renderSkillSkeleton() {
        const cards = [0, 1, 2, 3, 4, 5].map(function (index) {
            return h('div', { key: 'skeleton-' + String(index), className: 'sm-card-item', 'aria-hidden': 'true' },
                h('div', { className: 'sm-skeleton sm-skeleton-icon' }),
                h('div', { className: 'sm-card-main' },
                    h('div', { className: 'sm-skeleton sm-skeleton-line sm-skeleton-line-lg' }),
                    h('div', { className: 'sm-skeleton sm-skeleton-line' })))
        })
        const headStyle = { height: '22px', width: '160px' }
        return h('div', { className: 'sm-installed sm-installed-loading', 'aria-busy': 'true', 'aria-label': t('state.loading') },
            h('div', { className: 'sm-skeleton', style: headStyle }),
            h('div', { className: 'sm-card-grid' }, cards.slice(0, 3)),
            h('div', { className: 'sm-skeleton', style: { height: '22px', width: '160px', marginTop: '20px' } }),
            h('div', { className: 'sm-card-grid' }, cards.slice(3, 6)),
            h('div', { className: 'sm-sr-only' }, t('state.loading')))
    }

    function renderSkillError(error) {
        const code = error !== null && typeof error === 'object' && error.code ? String(error.code) : ''
        const unauthorized = code === 'E_UNAUTHORIZED'
        const service = code.indexOf('SERVICE') !== -1 || code === 'E_NOT_LOADED'
        const title = unauthorized
            ? t('error.unauthorized')
            : service
                ? t('error.service')
                : t('state.error.skills.title')
        const body = service
            ? t('error.service.body')
            : unauthorized
                ? t('state.error.skills.body')
                : error !== null && typeof error === 'object' && error.message
                    ? String(error.message)
                    : t('state.error.skills.body')
        return h('div', { className: 'sm-empty sm-empty-error', 'aria-label': title },
            h('div', { className: 'sm-empty-icon' }, icon('alert', 40)),
            h('div', { className: 'sm-empty-title' }, title),
            h('div', { className: 'sm-empty-body' }, body),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary',
                    onClick: function () { void loadInstalled(true) },
                }, t('action.retry'))))
    }

    /* ------------------------------------------------------------------ *
     * Page content. The shell (00-prelude.js) renders the page header,     *
     * primary tabs and category tabs, then calls renderSkillsTab() for    *
     * the scrollable content.                                             *
     * ------------------------------------------------------------------ */

    function renderSkillsTab() {
        const skills = skillsList()
        if (isLoading('installed') === true && skills.length === 0) {
            return renderSkillSkeleton()
        }
        if (skills.length === 0
            && appState.error !== null && typeof appState.error === 'object'
            && appState.error.scope === 'installed') {
            return renderSkillError(appState.error)
        }

        const query = skillsQuery()
        if (query !== '' && skillsMatched().length === 0) {
            return h('div', { className: 'sm-installed' },
                renderSkillSearchEmpty(),
                renderSkillMenu())
        }

        const category = skillsEffectiveCategory()
        if (skillsInCategory(category, query).length === 0) {
            return h('div', { className: 'sm-installed' },
                renderSkillCategoryEmpty(category),
                renderSkillMenu())
        }

        return h('div', { className: 'sm-installed' },
            renderSkillGroups(),
            renderSkillMenu())
    }
