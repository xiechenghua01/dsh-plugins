    /* Skill helpers. 由 00-prelude.js 1102-1499 拆出。 */
    /* ------------------------------------------------------------------ *
     * Skill helpers shared with the list, market and detail fragments.    *
     * ------------------------------------------------------------------ */

    /** Unified source of the newer version available for a skill. */
    function skillUpdateVersion(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const direct = skill.updateAvailable
        if (typeof direct === 'string' && direct !== '') return direct
        const state = appState.updates
        if (state !== null && typeof state === 'object' && Array.isArray(state.updates)) {
            const name = String(skill.name === undefined || skill.name === null ? '' : skill.name)
            const location = String(skill.location === undefined || skill.location === null ? '' : skill.location)
            const found = state.updates.find(function (item) {
                return item !== null && typeof item === 'object'
                    && String(item.name === undefined || item.name === null ? '' : item.name) === name
                    && String(item.location === undefined || item.location === null ? '' : item.location) === location
            })
            if (found !== undefined && found.available !== undefined && found.available !== null && String(found.available) !== '') {
                return String(found.available)
            }
        }
        return ''
    }

    function skillStatusDot(skill) {
        if (skill === null || typeof skill !== 'object') return 'sm-dot sm-dot-idle'
        if (skill.status === 'disabled') return 'sm-dot sm-dot-idle'
        if (skill.status === 'broken' || skill.status === 'invalid') return 'sm-dot sm-dot-warn'
        if (skillUpdateVersion(skill) !== '') return 'sm-dot sm-dot-update'
        return 'sm-dot sm-dot-ok'
    }

    function skillStatusTip(skill) {
        if (skill === null || typeof skill !== 'object') return t('error.unexpected')
        if (skill.status === 'disabled') return t('badge.disabled')
        if (skill.status === 'broken' || skill.status === 'invalid') {
            return typeof skill.brokenReason === 'string' && skill.brokenReason !== '' ? skill.brokenReason : t('badge.issue')
        }
        const updateVersion = skillUpdateVersion(skill)
        if (updateVersion !== '') return t('badge.update', { version: versionLabel(updateVersion) })
        if (skill.writable === false) return t('badge.readonly')
        return t('detail.status.active')
    }

    /** Pick a stable semantic glyph for a skill name and location. */
    function skillIconName(skillOrName, location) {
        const name = typeof skillOrName === 'string'
            ? skillOrName
            : skillOrName !== null && typeof skillOrName === 'object' && typeof skillOrName.name === 'string'
                ? skillOrName.name
                : ''
        const loc = location !== undefined && location !== null
            ? location
            : skillOrName !== null && typeof skillOrName === 'object' && typeof skillOrName.location === 'string'
                ? skillOrName.location
                : ''
        const text = name.toLowerCase()
        if (text.includes('review') || text.includes('audit') || text.includes('security')) return 'shield'
        if (text.includes('sql') || text.includes('database') || text.includes('query') || text.includes('postgres') || text.includes('clickhouse')) return 'database'
        if (text.includes('git') || text.includes('commit') || text.includes('pull-request')) return 'git'
        if (text.includes('pdf') || text.includes('doc') || text.includes('markdown')) return 'file'
        if (text.includes('image') || text.includes('design') || text.includes('frontend')) return 'image'
        if (text.includes('script') || text.includes('python') || text.includes('bash')) return 'script'
        if (text.includes('plugin') || text.includes('arch') || text.includes('cordis')) return 'puzzle'
        if (text.includes('creator') || text.includes('skill')) return 'skill'
        if (loc === 'preset' || loc === 'bundled') return 'package'
        return 'folder'
    }

    function renderSkillIconBox(skill, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const size = typeof opts.iconSize === 'number' && opts.iconSize > 0 ? opts.iconSize : 20
        return h('div', { className: cx('sm-card-icon', opts.className) },
            icon(skillIconName(skill), size),
            h('span', { className: skillStatusDot(skill), 'data-tip': skillStatusTip(skill) }))
    }

    function badge(label, tone, tip, key) {
        return h('span', {
            key: key,
            className: cx('sm-badge', tone === 'warn' ? 'sm-badge-warn' : tone === 'error' ? 'sm-badge-error' : tone === 'success' ? 'sm-badge-success' : null),
            'data-tip': tip,
        }, String(label === undefined || label === null ? '' : label))
    }

    function renderUpgradeBadge(version, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const text = versionLabel(version)
        const interactive = typeof opts.onClick === 'function'
        return h('span', {
            key: opts.key !== undefined ? opts.key : 'upgrade',
            className: cx('sm-badge', 'sm-badge-update', 'sm-mono', opts.className),
            'data-tip': t('badge.updateTip', { version: text }),
            role: interactive ? 'button' : undefined,
            tabIndex: interactive ? 0 : undefined,
            onClick: interactive ? opts.onClick : undefined,
            onKeyDown: interactive
                ? function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        opts.onClick(event)
                    }
                }
                : undefined,
        },
        upgradeIcon(16),
        h('span', null, text === '' ? t('badge.update', { version: '' }) : text))
    }

    /* ------------------------------------------------------------------ *
     * Counters used by the tab bar status icons.                          *
     * ------------------------------------------------------------------ */

    function categoryCount(category) {
        const key = String(category === undefined || category === null ? '' : category)
        if (appState.categories !== null && typeof appState.categories === 'object' && typeof appState.categories[key] === 'number') {
            return appState.categories[key]
        }
        let count = 0
        appState.skills.forEach(function (skill) {
            if (skill !== null && typeof skill === 'object' && skill.category === key) count += 1
        })
        return count
    }

    /** Skills that are not active (broken / invalid), excluding attention-only issues. */
    function brokenSkillCount() {
        const diag = appState.diagnostics
        if (diag !== null && typeof diag === 'object') {
            if (Array.isArray(diag.inactive)) return diag.inactive.length
            if (Array.isArray(diag.issues)) {
                return diag.issues.filter(function (issue) {
                    if (issue === null || typeof issue !== 'object') return false
                    if (issue.severity !== 'error' && issue.severity !== 'warning') return false
                    return issue.kind !== 'oversize' && issue.kind !== 'sourceUnreachable'
                }).length
            }
        }
        return appState.skills.filter(function (skill) {
            return skill !== null && typeof skill === 'object' && (skill.status === 'broken' || skill.status === 'invalid')
        }).length
    }

    function updateSkillCount() {
        const state = appState.updates
        if (state !== null && typeof state === 'object' && Array.isArray(state.updates)) return state.updates.length
        return appState.skills.filter(function (skill) { return skillUpdateVersion(skill) !== '' }).length
    }

    function lastCheckedLabel() {
        const state = appState.updates
        if (state === null || typeof state !== 'object' || typeof state.checkedAt !== 'number' || state.checkedAt === 0) {
            return t('time.never')
        }
        return fmtTime(state.checkedAt)
    }

    /* ------------------------------------------------------------------ *
     * Loaders. Failures are stored in appState.error and toasted once.    *
     * ------------------------------------------------------------------ */

    function reportError(scope, error, fallback, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const code = error !== null && typeof error === 'object' && error.code ? String(error.code) : 'E_INTERNAL'
        const message = error !== null && typeof error === 'object' && error.message ? String(error.message) : fallback
        appState.error = { scope: scope, code: code, message: message }
        const fingerprint = String(scope) + ':' + code + ':' + message
        if (opts.silent !== true && appState.lastErrorToast !== fingerprint) {
            appState.lastErrorToast = fingerprint
            toast(code === 'E_UNAUTHORIZED' ? t('error.unauthorized') : message, { tone: 'error' })
        }
    }

    function clearErrorScope(scope) {
        if (appState.error !== null && typeof appState.error === 'object' && appState.error.scope === scope) appState.error = null
    }

    async function loadInstalled(force) {
        if (isLoading('installed') === true && force !== true) return null
        setLoading('installed', true)
        clearErrorScope('installed')
        rerender()
        try {
            const data = await api('installed?cwd=' + encodeURIComponent(appState.cwd === undefined || appState.cwd === null ? '' : appState.cwd))
            if (data !== null && typeof data === 'object') {
                if (Array.isArray(data.skills)) appState.skills = data.skills
                if (data.categories !== null && typeof data.categories === 'object') {
                    appState.categories = Object.assign({ mine: 0, shared: 0, project: 0, system: 0 }, data.categories)
                }
                if (Array.isArray(data.sources)) appState.sources = data.sources
                if (Array.isArray(data.sourceOrder)) appState.sourceOrder = data.sourceOrder
                if (data.diagnostics !== null && typeof data.diagnostics === 'object') appState.diagnostics = data.diagnostics
                else if (Array.isArray(data.issues)) appState.diagnostics = { issues: data.issues, checkedAt: Date.now() }
                if (data.updates !== null && typeof data.updates === 'object') appState.updates = data.updates
                if (typeof data.cwd === 'string' && data.cwd !== '') appState.cwd = data.cwd
            }
            appState.lastErrorToast = null
            return data
        } catch (error) {
            reportError('installed', error, t('error.read'))
            return null
        } finally {
            setLoading('installed', false)
            rerender()
        }
    }

    async function loadSources(force) {
        if (isLoading('sources') === true && force !== true) return null
        setLoading('sources', true)
        clearErrorScope('sources')
        rerender()
        try {
            const data = await api('sources')
            if (Array.isArray(data)) {
                appState.sources = data
            } else if (data !== null && typeof data === 'object') {
                if (Array.isArray(data.sources)) appState.sources = data.sources
                if (Array.isArray(data.sourceOrder)) appState.sourceOrder = data.sourceOrder
                else if (Array.isArray(data.order)) appState.sourceOrder = data.order
            }
            appState.lastErrorToast = null
            return data
        } catch (error) {
            reportError('sources', error, t('error.read'))
            return null
        } finally {
            setLoading('sources', false)
            rerender()
        }
    }

    /* One monotonically increasing id ensures only the newest market response
       may touch the shared state. */
    let marketRequestSeq = 0
    let marketLatestRequestId = 0

    /** Append a refreshed page of one source block onto the existing block. */
    function mergeMarketSource(previous, next, appendSourceId) {
        if (appendSourceId === undefined || appendSourceId === null || appendSourceId === '') return next
        const old = (Array.isArray(previous) ? previous : []).find(function (block) {
            return block !== null && typeof block === 'object' && block.sourceId === appendSourceId
        })
        if (old === undefined || !Array.isArray(old.skills)) return next
        return next.map(function (block) {
            if (block === null || typeof block !== 'object' || block.sourceId !== appendSourceId) return block
            const merged = old.skills.slice()
            const seen = Object.create(null)
            merged.forEach(function (skill) { if (skill !== null && typeof skill === 'object') seen[String(skill.name)] = true })
            ;(Array.isArray(block.skills) ? block.skills : []).forEach(function (skill) {
                if (skill === null || typeof skill !== 'object') return
                const key = String(skill.name)
                if (seen[key] === true) return
                seen[key] = true
                merged.push(skill)
            })
            return Object.assign({}, block, { skills: merged })
        })
    }

    /**
     * GET /market?q=&sort=&cursor=&limit=
     * opts: { q?, sort?, cursor?, limit?, sourceId?, append? }
     * `sourceId` + `append` only affects how the per-source cursor page is merged.
     */
    async function loadMarket(opts) {
        const input = opts !== null && typeof opts === 'object' ? opts : {}
        const text = typeof input.q === 'string' ? input.q : appState.search
        const sort = typeof input.sort === 'string' ? input.sort : appState.marketSort
        const params = new URLSearchParams()
        if (text !== '') params.set('q', text)
        if (sort !== '' && sort !== 'recommend') params.set('sort', sort)
        if (input.cursor !== undefined && input.cursor !== null && input.cursor !== '') params.set('cursor', String(input.cursor))
        if (typeof input.limit === 'number' && input.limit > 0) params.set('limit', String(input.limit))
        const appendSourceId = input.append === true ? String(input.sourceId === undefined || input.sourceId === null ? '' : input.sourceId) : ''
        const previous = Array.isArray(appState.marketSources) ? appState.marketSources.slice() : []

        marketRequestSeq += 1
        const requestId = marketRequestSeq
        marketLatestRequestId = requestId
        clearErrorScope('market')
        setLoading('market', true)
        rerender()
        try {
            const data = await api('market?' + params.toString())
            if (requestId !== marketLatestRequestId) return null
            if (data !== null && typeof data === 'object' && Array.isArray(data.sources)) {
                appState.marketSources = mergeMarketSource(previous, data.sources, appendSourceId)
            }
            appState.lastErrorToast = null
            return data
        } catch (error) {
            if (requestId !== marketLatestRequestId) return null
            reportError('market', error, t('error.read'))
            return null
        } finally {
            if (requestId === marketLatestRequestId) {
                setLoading('market', false)
                rerender()
            }
        }
    }

    async function loadUpdates(force) {
        if (isLoading('updates') === true && force !== true) return null
        setLoading('updates', true)
        rerender()
        try {
            const data = await api('updates')
            if (data !== null && typeof data === 'object') appState.updates = data
            rerender()
            return data
        } catch (error) {
            reportError('updates', error, t('error.unexpected'), { silent: true })
            return null
        } finally {
            setLoading('updates', false)
            rerender()
        }
    }

    /**
     * POST /check-updates { force: true }
     * Refetches every enabled source index, recomputes updates and refreshes
     * the installed scan. The spinner is kept for at least 400ms.
     */
    async function checkUpdates() {
        if (appState.checking === true) return null
        appState.checking = true
        clearErrorScope('check')
        rerender()
        const started = Date.now()
        try {
            const data = await api('check-updates', { method: 'POST', body: { force: true } })
            const remain = 400 - (Date.now() - started)
            if (remain > 0) await delay(remain)
            const sources = data !== null && typeof data === 'object' && Number.isFinite(Number(data.sources)) ? Number(data.sources) : 0
            const updates = data !== null && typeof data === 'object' && Number.isFinite(Number(data.updates)) ? Number(data.updates) : 0
            toast(updates > 0 ? t('toast.checkedSources', { sources: sources, updates: updates }) : t('toast.noUpdates', { sources: sources }))
            appState.lastErrorToast = null
            await Promise.all([loadInstalled(true), loadSources(true)])
            return data
        } catch (error) {
            /* Failures are surfaced by the inline check banner, not a toast. */
            reportError('check', error, t('error.unexpected'), { silent: true })
            return null
        } finally {
            appState.checking = false
            rerender()
        }
    }

    /* ------------------------------------------------------------------ *
     * List scroll memory. The single restoreListScroll field doubles as   *
     * the pending restore target (contract 3.5).                          *
     * ------------------------------------------------------------------ */

    function listScrollNode() {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return null
        const node = document.querySelector('.sm-root .sm-tab-view.sm-scroll')
        return node !== null && node !== undefined && typeof node.scrollTop === 'number' ? node : null
    }

    function rememberListScroll() {
        const node = listScrollNode()
        if (node !== null) appState.restoreListScroll = node.scrollTop
    }

    function restoreListScroll() {
        const pending = typeof appState.restoreListScroll === 'number' ? appState.restoreListScroll : null
        if (pending === null) return
        appState.restoreListScroll = null
        const apply = function (attempt) {
            const node = listScrollNode()
            if (node !== null) {
                node.scrollTop = pending
                return
            }
            if (attempt < 2 && typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(function () { apply(attempt + 1) })
            }
        }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { apply(0) })
        else apply(0)
    }

    /* ------------------------------------------------------------------ *
     * Shared source drag-and-drop namespace (contract 2 and 7.6).         *
     *                                                                     *
     * 30-source-dialog.js calls:                                         *
     *   smDragSource.start(id, event)                                     *
     *   smDragSource.over(id, event)   -> { id, after } | null            *
     *   smDragSource.drop()            -> { from, to, after } | null      *
     *   smDragSource.end()                                                *
     * The current drop target is exposed as smDragSource.over.target      *
     * (also mirrored as smDragSource.overId / smDragSource.overAfter).    *
     * ------------------------------------------------------------------ */
