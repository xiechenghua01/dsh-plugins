    /* 由原 10-skills.js 行 1-451 拆出。 */
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
        /* Match the technical name plus every authored locale variant, so a
         * search works in either language regardless of the active one. */
        const fields = [skill.name, skill.description, skill.whenToUse]
        const pushLocalized = function (value) {
            if (value === null || typeof value !== 'object') return
            if (typeof value.zh === 'string' && value.zh !== '') fields.push(value.zh)
            if (typeof value.en === 'string' && value.en !== '') fields.push(value.en)
        }
        pushLocalized(skill.displayNameByLocale)
        pushLocalized(skill.titleByLocale)
        pushLocalized(skill.descriptionByLocale)
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

    /**
     * Contract §3.1: the skills-page sort value is `modified`; `recent` is the
     * v1 name and is still mapped when an old value is read back.
     */
    function skillsSortKey() {
        return appState.sort === 'recent' ? 'modified' : appState.sort
    }

    function skillsSort(items) {
        const copy = items.slice()
        const sort = skillsSortKey()
        if (sort === 'modified') {
            copy.sort(function (left, right) {
                return (Number(right.mtime) || 0) - (Number(left.mtime) || 0)
            })
        } else if (sort === 'source') {
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
