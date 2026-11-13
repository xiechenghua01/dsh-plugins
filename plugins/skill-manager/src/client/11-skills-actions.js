    /* 由原 10-skills.js 行 452-772 拆出。 */
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
        /* Display name / description are localized; the technical name stays
         * visible as a small mono label and keeps driving every action. */
        const technicalName = String(skill.name === undefined || skill.name === null ? '' : skill.name)
        const displayName = smSkillDisplayName(skill) || technicalName
        const description = smSkillDisplayDescription(skill)
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
                /* Child buttons (⋯ / update) handle their own keys; do not let
                 * Enter / Space bubble up into the card and open the detail. */
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    skillsOpenDetail(skill)
                }
            },
        },
        renderSkillIconBox(skill),
        /* Title row, description and badge row come from one shared helper. */
        renderCardMain({
            dot: renderSkillStatusDot(skill),
            displayName: displayName,
            technicalName: technicalName,
            description: description,
            badges: badges,
        }),
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
