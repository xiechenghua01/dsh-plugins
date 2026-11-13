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

    /* ------------------------------------------------------------------ *
     * Display name / description selection.                              *
     *                                                                    *
     * The technical `name` is never replaced: install, uninstall,        *
     * update, de-duplication, routing and search keep using it. These    *
     * helpers only choose what the UI prints, and they are pure (no      *
     * network). Chinese prefers zh then en; every other locale uses en.  *
     * ------------------------------------------------------------------ */

    function smIsChineseLocale() {
        const locale = String(appState.locale === undefined || appState.locale === null ? '' : appState.locale).toLowerCase()
        return locale.indexOf('zh') === 0
    }

    /** A non-empty string or ''. */
    function smLocaleText(value) {
        return typeof value === 'string' && value !== '' ? value : ''
    }

    /** Pick from a `{ zh, en }` map: zh (then en) for Chinese, en otherwise. */
    function smLocalizedField(byLocale) {
        if (byLocale === null || typeof byLocale !== 'object') return ''
        if (smIsChineseLocale()) {
            const zh = smLocaleText(byLocale.zh)
            if (zh !== '') return zh
        }
        return smLocaleText(byLocale.en)
    }

    /**
     * Author-supplied display name. Installed skills use `displayNameByLocale`,
     * market items use `titleByLocale`; both share the same fallback rules and
     * fall back to the technical `name` so the UI never shows an empty title.
     */
    function smSkillDisplayName(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const byLocale = skill.displayNameByLocale !== null && typeof skill.displayNameByLocale === 'object'
            ? skill.displayNameByLocale
            : skill.titleByLocale
        const localized = smLocalizedField(byLocale)
        if (localized !== '') return localized
        return smLocaleText(skill.name)
    }

    /** Author-supplied description with the same locale fallback chain. */
    function smSkillDisplayDescription(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const localized = smLocalizedField(skill.descriptionByLocale)
        if (localized !== '') return localized
        return smLocaleText(skill.description)
    }

    /* ------------------------------------------------------------------ *
     * Author-provided skill icons.                                       *
     *                                                                    *
     * Market items carry an absolute `icon` URL (or a data: URL).        *
     * Installed skills carry a skill-relative `iconPath`; the bytes come  *
     * from the local `/skill-manager/api/skill/icon` route.               *
     * ------------------------------------------------------------------ */

    /** Only http(s), data:image and same-origin absolute paths reach <img src>. */
    function smIsSafeIconUrl(value) {
        const src = smLocaleText(value).trim()
        if (src === '') return false
        if (/^data:image\//iu.test(src)) return true
        if (/^https?:\/\//iu.test(src)) return true
        return src.charAt(0) === '/'
    }

    /**
     * Resolve the author-provided icon for a skill.
     * @returns {{ kind: 'url'|'route', src: string } | null}
     */
    function smSkillIconSource(skill) {
        if (skill === null || typeof skill !== 'object') return null
        /* Installed: iconPath is relative to the skill directory; serve it locally. */
        const iconPath = smLocaleText(skill.iconPath).trim()
        const skillPath = smLocaleText(skill.path)
        if (iconPath !== '' && skillPath !== '') {
            const cwd = String(appState.cwd === undefined || appState.cwd === null ? '' : appState.cwd)
            return {
                kind: 'route',
                src: API_BASE + 'skill/icon?path=' + encodeURIComponent(skillPath) + '&cwd=' + encodeURIComponent(cwd),
            }
        }
        /* Market: `icon` is already resolved to an absolute or data: URL. */
        const icon = smLocaleText(skill.icon).trim()
        if (icon !== '' && smIsSafeIconUrl(icon)) return { kind: 'url', src: icon }
        /* Defensive fallback for a Host that hands back a resolved route/URL. */
        const iconUrl = smLocaleText(skill.iconUrl).trim()
        if (iconUrl !== '' && smIsSafeIconUrl(iconUrl)) {
            return { kind: iconUrl.charAt(0) === '/' ? 'route' : 'url', src: iconUrl }
        }
        return null
    }

    /**
     * Authored icon when present, otherwise the keyword heuristic glyph.
     * The failed URL is remembered per component so a broken icon is not
     * retried on every render; a different URL gets a fresh chance.
     */
    function SmSkillIcon(props) {
        const skill = props !== null && typeof props === 'object' ? props.skill : null
        const size = props !== null && typeof props === 'object' && typeof props.size === 'number' && props.size > 0
            ? props.size
            : 20
        const fallback = props !== null && typeof props === 'object' && smLocaleText(props.fallback) !== ''
            ? props.fallback
            : skillIconName(skill)
        const source = smSkillIconSource(skill)
        const src = source === null ? '' : String(source.src)
        const [failedSrc, setFailedSrc] = useState('')
        if (source === null || (failedSrc !== '' && failedSrc === src)) {
            return icon(fallback, size)
        }
        return h('img', {
            className: 'sm-skill-icon-img',
            src: src,
            width: size,
            height: size,
            alt: '',
            loading: 'lazy',
            decoding: 'async',
            draggable: 'false',
            onError: function () {
                /* Keep the mark: the same URL must not trigger a retry loop. */
                if (src !== '') setFailedSrc(src)
            },
            style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
        })
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

    /**
     * Card status dot. The only implementation: the skills page and the market
     * page both render it in the card title row, never on the icon artwork, so
     * the dot cannot cover an authored PNG/SVG. The tone stays owned by the
     * `sm-dot-*` classes. Both tip channels are kept, exactly as the market
     * card had them (`title` plus `data-tip`, the latter rendered by the
     * page-level delegation into the shared tooltip), and `aria-label` carries
     * the meaning for assistive tech per the status-dot spec.
     */
    function renderStatusDot(dotClass, tip) {
        const label = smLocaleText(tip)
        return h('span', {
            className: dotClass,
            role: 'img',
            'aria-label': label,
            title: label,
            'data-tip': label,
        })
    }

    /** Status dot for an installed skill; colours stay owned by skillStatusDot. */
    function renderSkillStatusDot(skill) {
        return renderStatusDot(skillStatusDot(skill), skillStatusTip(skill))
    }

    /**
     * The card icon box, shared by both pages. It renders the icon alone: the
     * status dot lives in the title row (see renderStatusDot) so it can never
     * overlap the artwork.
     */
    function renderSkillIconBox(skill, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const size = typeof opts.iconSize === 'number' && opts.iconSize > 0 ? opts.iconSize : 20
        return h('div', { className: cx('sm-card-icon', opts.className) },
            h(SmSkillIcon, { skill: skill, size: size, fallback: opts.fallback }))
    }

    /* ------------------------------------------------------------------ *
     * Card body: title row, meta row, description.                       *
     *                                                                    *
     * The skills page and the market page used to hand-write these three  *
     * lines separately and the two copies drifted apart: the market copy *
     * put a version badge inside the title row and clipped that row with *
     * an inline overflow, which squeezed a long Chinese name down to the *
     * ellipsis. These helpers are the only implementation, so a badge    *
     * can never take width from the display name again.                  *
     * ------------------------------------------------------------------ */

    /**
     * Title row: status dot, display name, technical name. Nothing else
     * belongs here. The display name cannot shrink (see `.sm-card-name`), so
     * it is always printed in full; the technical name yields the space.
     */
    function renderCardTitleRow(options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const displayName = String(opts.displayName === undefined || opts.displayName === null ? '' : opts.displayName)
        const technicalName = String(opts.technicalName === undefined || opts.technicalName === null ? '' : opts.technicalName)
        const localized = displayName !== technicalName
        return h('div', { className: 'sm-card-title-row' },
            opts.dot !== undefined && opts.dot !== null ? opts.dot : null,
            h('span', {
                className: cx('sm-card-name', localized ? 'sm-card-display-name' : 'sm-mono'),
                title: displayName,
            }, displayName),
            localized && technicalName !== ''
                ? h('span', { className: 'sm-card-tech sm-mono', title: technicalName }, technicalName)
                : null)
    }

    /**
     * Meta row: version badge and tags. It sits directly under the title row
     * and above the description, so the badges read as a subtitle of the name
     * while still never competing with it for width. Returns null when there
     * is nothing to show, so a card without badges keeps two lines.
     */
    function renderCardMetaRow(badges) {
        const items = Array.isArray(badges)
            ? badges.filter(function (item) { return item !== null && item !== undefined && item !== false })
            : []
        if (items.length === 0) return null
        return h('div', { className: 'sm-tagbar' }, items)
    }

    /**
     * The whole `.sm-card-main` column shared by both card lists: title row,
     * badge row, then the description.
     */
    function renderCardMain(options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const description = String(opts.description === undefined || opts.description === null ? '' : opts.description)
        return h('div', { className: 'sm-card-main' },
            renderCardTitleRow(opts),
            renderCardMetaRow(opts.badges),
            h('div', {
                className: 'sm-card-desc',
                'data-tip': description !== '' ? description : undefined,
            }, description))
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
     * POST /check-updates { force: true, sourceId? }
     * Refetches every enabled source index (or one source when `sourceId` is
     * given), recomputes updates, then refreshes the installed scan, the source
     * list and the market with the current search term and sort. The spinner
     * is kept for at least 400ms; `checking` is shared by both toolbars.
     */
    async function checkUpdates(sourceId) {
        if (appState.checking === true) return null
        const id = sourceId === undefined || sourceId === null ? '' : String(sourceId)
        const body = { force: true }
        if (id !== '') body.sourceId = id
        appState.checking = true
        clearErrorScope('check')
        rerender()
        const started = Date.now()
        try {
            const data = await api('check-updates', { method: 'POST', body: body })
            const remain = 400 - (Date.now() - started)
            if (remain > 0) await delay(remain)
            const sources = data !== null && typeof data === 'object' && Number.isFinite(Number(data.sources)) ? Number(data.sources) : 0
            const updates = data !== null && typeof data === 'object' && Number.isFinite(Number(data.updates)) ? Number(data.updates) : 0
            toast(updates > 0 ? t('toast.checkedSources', { sources: sources, updates: updates }) : t('toast.noUpdates', { sources: sources }))
            appState.lastErrorToast = null
            const search = String(appState.search === undefined || appState.search === null ? '' : appState.search)
            const sort = typeof smMarketSortValue === 'function' ? smMarketSortValue() : 'recommend'
            await Promise.all([
                loadInstalled(true),
                loadSources(true),
                loadMarket({ q: search, sort: sort }),
            ])
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
