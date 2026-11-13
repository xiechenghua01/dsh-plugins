    const appState = {
        tab: 'skills',
        category: 'mine',
        search: '',
        sort: 'name',
        marketSort: 'recommend',
        view: 'list',
        detail: null,
        skills: [],
        categories: { mine: 0, shared: 0, project: 0, system: 0 },
        sources: [],
        sourceOrder: [],
        marketSources: [],
        updates: null,
        diagnostics: null,
        loading: { installed: false, sources: false, market: false, updates: false },
        error: null,
        restoreListScroll: null,
        menu: null,
        modal: null,
        sourceDialogOpen: false,
        checking: false,
        /* infrastructure */
        cwd: '',
        fontSize: DEFAULT_FONT_SIZE,
        locale: 'zh',
        toasts: [],
        lastErrorToast: null,
    }

    function setState(patch) {
        /* 任何状态变化都可能替换掉当前 hover 的节点。tooltip 挂在 <body>
         * 上，目标卸载后 mouseout 不会触发，所以这里必须先主动隐藏。 */
        if (typeof smHideTooltip === 'function') smHideTooltip()
        if (patch !== null && typeof patch === 'object') Object.assign(appState, patch)
        rerender()
    }

    function isLoading(key) {
        return appState.loading !== null && typeof appState.loading === 'object' && appState.loading[key] === true
    }

    function setLoading(key, value) {
        if (appState.loading === null || typeof appState.loading !== 'object') appState.loading = {}
        appState.loading[key] = value === true
    }

    /* ------------------------------------------------------------------ *
     * Locale and formatting helpers.                                      *
     * ------------------------------------------------------------------ */

    /** Bound by 99-apply through the slot props (ctx.locale.bind(NS)). */
    let boundT = null

    /** True once the host locale subscription delivered a value; the slot
     * props' `locale` then stays a fallback and never overrides it. */
    let smLocaleSubscribed = false

    function isEnglishLocale() {
        return String(appState.locale === undefined || appState.locale === null ? '' : appState.locale).toLowerCase().indexOf('en') === 0
    }

    function t(key, vars) {
        const name = String(key)
        let value = null
        if (typeof boundT === 'function') {
            try {
                const bound = boundT(name, vars)
                if (typeof bound === 'string' && bound !== '') value = bound
            } catch {
                value = null
            }
        }
        if (value === null || value === name) {
            const dict = isEnglishLocale() ? en : zh
            value = dict[name]
        }
        if (typeof value !== 'string' || value === '') value = name
        if (vars !== null && typeof vars === 'object' && value.indexOf('{') !== -1) {
            value = value.replace(/\{([A-Za-z0-9_]+)\}/g, function (match, token) {
                const replacement = vars[token]
                return replacement === undefined || replacement === null ? match : String(replacement)
            })
        }
        return value
    }

    function fmtSize(bytes) {
        const value = Number(bytes)
        if (!Number.isFinite(value) || value < 0) return '—'
        if (value < 1024) return Math.round(value) + ' B'
        const units = ['KB', 'MB', 'GB', 'TB']
        let size = value / 1024
        let index = 0
        while (size >= 1024 && index < units.length - 1) {
            size /= 1024
            index += 1
        }
        const digits = size >= 100 ? 0 : 1
        return size.toFixed(digits).replace(/\.0$/, '') + ' ' + units[index]
    }

    /** Format a timestamp in milliseconds (a value in seconds is tolerated). */
    function fmtTime(ms) {
        const value = Number(ms)
        if (!Number.isFinite(value) || value <= 0) return t('time.never')
        const stamp = value > 1000000000000 ? value : value * 1000
        const diff = Date.now() - stamp
        if (!Number.isFinite(diff)) return t('time.unknown')
        if (diff < 60000) return t('time.justNow')
        const minutes = Math.floor(diff / 60000)
        if (minutes < 60) return t('time.minutesAgo', { count: minutes })
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return t('time.hoursAgo', { count: hours })
        const days = Math.floor(hours / 24)
        if (days < 7) return t('time.daysAgo', { count: days })
        if (days < 30) return t('time.weeksAgo', { count: Math.floor(days / 7) })
        if (days < 365) return t('time.monthsAgo', { count: Math.floor(days / 30) })
        try {
            return new Date(stamp).toLocaleDateString(isEnglishLocale() ? 'en' : 'zh-CN')
        } catch {
            return t('time.unknown')
        }
    }

    function versionLabel(version) {
        const text = String(version === undefined || version === null ? '' : version)
        if (text === '') return ''
        return text.charAt(0) === 'v' ? text : 'v' + text
    }

    function cx() {
        const parts = []
        for (let index = 0; index < arguments.length; index += 1) {
            const value = arguments[index]
            if (value === null || value === undefined || value === false || value === '') continue
            if (Array.isArray(value)) {
                const nested = cx.apply(null, value)
                if (nested !== '') parts.push(nested)
                continue
            }
            if (typeof value === 'object') {
                Object.keys(value).forEach(function (name) {
                    if (value[name]) parts.push(name)
                })
                continue
            }
            parts.push(String(value))
        }
        return parts.join(' ')
    }

    function delay(ms) {
        return new Promise(function (resolve) {
            if (typeof setTimeout === 'function') setTimeout(resolve, ms)
            else resolve()
        })
    }

    /* ------------------------------------------------------------------ *
     * HTTP wrapper. Returns data on success; throws { code, message }.    *
     * Non-http(s) paths are always prefixed with /skill-manager/api/.     *
     * ------------------------------------------------------------------ */

    async function api(path, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const raw = String(path === undefined || path === null ? '' : path)
        const url = /^https?:/iu.test(raw) ? raw : API_BASE + raw.replace(/^\/+/u, '')
        const headers = Object.assign({ accept: 'application/json' }, opts.headers !== null && typeof opts.headers === 'object' ? opts.headers : {})
        const init = {
            method: opts.method !== undefined ? String(opts.method) : 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: headers,
        }
        if (opts.body !== undefined) {
            if (typeof opts.body === 'string') {
                init.body = opts.body
            } else {
                headers['content-type'] = 'application/json'
                init.body = JSON.stringify(opts.body)
            }
        }
        if (opts.signal !== undefined) init.signal = opts.signal
        let response
        try {
            response = await fetch(url, init)
        } catch (error) {
            throw { code: 'E_SOURCE_UNREACHABLE', message: error && error.message ? error.message : t('error.generic') }
        }
        let payload = null
        try {
            payload = await response.json()
        } catch {
            payload = null
        }
        if (response.status === 401) {
            throw { code: 'E_UNAUTHORIZED', message: t('error.unauthorized'), status: 401 }
        }
        if (payload !== null && typeof payload === 'object' && payload.ok === true) return payload.data
        const failure = payload !== null && typeof payload === 'object' && payload.error !== null && typeof payload.error === 'object' ? payload.error : null
        throw {
            code: failure !== null && failure.code ? failure.code : 'E_INTERNAL',
            message: failure !== null && failure.message ? failure.message : t('error.generic'),
            path: failure !== null && failure.path ? failure.path : undefined,
            file: failure !== null && failure.file ? failure.file : undefined,
            status: response.status,
        }
    }

    /* ------------------------------------------------------------------ *
     * Toast host state. 50-modals.js renders appState.toasts.             *
     * ------------------------------------------------------------------ */

    let toastSeq = 0

    function dismissToast(id) {
        if (!Array.isArray(appState.toasts)) return
        const next = appState.toasts.filter(function (item) { return item.id !== id })
        if (next.length === appState.toasts.length) return
        appState.toasts = next
        rerender()
    }

    function toast(message, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        toastSeq += 1
        const id = 'sm-toast-' + String(toastSeq)
        const item = {
            id: id,
            message: String(message === undefined || message === null ? '' : message),
            tone: opts.tone === 'error' ? 'error' : opts.tone === 'ok' ? 'ok' : 'info',
            actionLabel: typeof opts.actionLabel === 'string' ? opts.actionLabel : '',
            onAction: typeof opts.onAction === 'function' ? opts.onAction : null,
        }
        /* At most one toast at a time: a new one replaces the previous one. */
        appState.toasts = [item]
        rerender()
        const duration = typeof opts.duration === 'number' && opts.duration > 0 ? opts.duration : 4000
        if (typeof window !== 'undefined' && window !== null && typeof window.setTimeout === 'function') {
            window.setTimeout(function () { dismissToast(id) }, duration)
        }
        return id
    }

    function copyPath(path) {
        const text = String(path === undefined || path === null ? '' : path)
        try {
            if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(text).then(function () {
                    toast(t('toast.copied'))
                }, function () {
                    toast(t('toast.copyFailed'), { tone: 'error' })
                })
                return
            }
        } catch {
            /* fall through to the visible failure toast */
        }
        toast(t('toast.copyFailed'), { tone: 'error' })
    }

    function openFolder(path) {
        toast(t('toast.openedFolder', { path: String(path === undefined || path === null ? '' : path) }))
    }
