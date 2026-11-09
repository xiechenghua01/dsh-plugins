    /* ------------------------------------------------------------------ *
     * 40-detail.js — 页内双栏详情（契约 v2 §5.2 / §7.3，交互 SD-01～SD-04）。*
     *                                                                    *
     * 左栏：这个技能做什么 / 什么时候用 / SKILL.md 预览与编辑入口。      *
     * 右栏：状态与来源 / 操作。                                          *
     * 主界面只保留用户能据此行动的信息，内部实现细节一律不展示。         *
     * ------------------------------------------------------------------ */

    const SM_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    const SM_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

    /* 保存到：三个用户箱子，映射到 Host 的安装位置。 */
    const SM_SAVE_TARGETS = [
        { id: 'user-dsh', category: 'mine', labelKey: 'tab.category.mine' },
        { id: 'user-agents', category: 'shared', labelKey: 'tab.category.shared' },
        { id: 'project-dsh', category: 'project', labelKey: 'tab.category.project' },
    ]

    const SM_CATEGORY_LABEL_KEYS = {
        mine: 'tab.category.mine',
        shared: 'tab.category.shared',
        project: 'tab.category.project',
        system: 'tab.category.system',
    }

    /* ------------------------------------------------------------------ *
     * 基础工具（50-modals.js 共用）。                                     *
     * ------------------------------------------------------------------ */

    function smText(value, fallback) {
        if (typeof value === 'string' && value !== '') return value
        return fallback === undefined || fallback === null ? '' : String(fallback)
    }

    function smNumber(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback
    }

    /** Contract §3.5：技能列表在 appState.skills。 */
    function smSkillList() {
        return Array.isArray(appState.skills) ? appState.skills : []
    }

    function smFindSkillById(id) {
        const key = smText(id)
        if (key === '') return null
        const list = smSkillList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] !== null && typeof list[index] === 'object' && list[index].id === key) return list[index]
        }
        const separator = key.indexOf(':')
        if (separator !== -1) {
            const location = key.slice(0, separator)
            const name = key.slice(separator + 1)
            for (let index = 0; index < list.length; index += 1) {
                const skill = list[index]
                if (skill !== null && typeof skill === 'object' && skill.name === name && skill.location === location) return skill
            }
        }
        return null
    }

    function smFindSkillByName(name) {
        const key = smText(name)
        if (key === '') return null
        const list = smSkillList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] !== null && typeof list[index] === 'object' && list[index].name === key) return list[index]
        }
        return null
    }

    function smFindActiveSkillByName(name) {
        const key = smText(name)
        if (key === '') return null
        const list = smSkillList()
        let fallback = null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (skill === null || typeof skill !== 'object' || skill.name !== key) continue
            if (skill.status === 'active') return skill
            if (fallback === null) fallback = skill
        }
        return fallback
    }

    /** 市场详情定位键：兼容 {sourceId,name} 与 `source:name` 形式的 id。 */
    function smMarketKey(detail) {
        const input = detail !== null && typeof detail === 'object' ? detail : {}
        let sourceId = smText(input.sourceId)
        let name = smText(input.name)
        const id = smText(input.id)
        if (id.indexOf(':') !== -1) {
            const separator = id.indexOf(':')
            if (sourceId === '') sourceId = id.slice(0, separator)
            if (name === '') name = id.slice(separator + 1)
        }
        if (name === '') name = id
        return { sourceId: sourceId, name: name }
    }

    function smCategoryForLocation(location) {
        const id = smText(location)
        if (id === 'project-dsh' || id === 'project-agents') return 'project'
        if (id === 'user-agents') return 'shared'
        if (id === 'preset' || id === 'bundled') return 'system'
        return 'mine'
    }

    function smSkillCategory(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const declared = smText(skill.category)
        if (declared !== '') return declared
        return smCategoryForLocation(skill.location)
    }

    function smCategoryLabel(category) {
        const key = SM_CATEGORY_LABEL_KEYS[smText(category)]
        return key === undefined ? '' : t(key)
    }

    /** 只有 Harness 自带的预设 / 插件内置算「系统内置」；只读自定义目录仍是「只读」。 */
    function smIsBuiltin(skill) {
        if (skill === null || typeof skill !== 'object') return false
        return skill.location === 'preset' || skill.location === 'bundled'
    }

    function smIsReadonly(skill) {
        if (skill === null || typeof skill !== 'object') return true
        return skill.writable !== true
    }

    function smIsDisabled(skill) {
        return skill !== null && typeof skill === 'object' && skill.status === 'disabled'
    }

    function smIsBroken(skill) {
        if (skill === null || typeof skill !== 'object') return false
        return skill.status === 'broken' || skill.status === 'invalid' || skill.status === 'shadowed'
    }

    function smProjectAvailable() {
        if (typeof appState.cwd === 'string' && appState.cwd !== '') return true
        return smSkillList().some(function (skill) {
            return skill !== null && typeof skill === 'object' && smSkillCategory(skill) === 'project'
        })
    }

    function smSaveTargets() {
        return SM_SAVE_TARGETS.map(function (target) {
            return {
                value: target.id,
                category: target.category,
                label: t(target.labelKey),
                disabled: target.id === 'project-dsh' && !smProjectAvailable(),
                hint: target.id === 'project-dsh' && !smProjectAvailable() ? t('form.projectUnavailable') : '',
            }
        })
    }

    function smSkillLocalModified(skill) {
        if (skill === null || typeof skill !== 'object') return false
        if (skill.localModified === true) return true
        if (skill.market !== null && typeof skill.market === 'object' && skill.market.localModified === true) return true
        return false
    }

    /** 用户语言的错误文案；技术细节不进入主界面。 */
    function smErrorMessage(failure) {
        const code = failure !== null && failure !== undefined && typeof failure.code === 'string' ? failure.code : ''
        const keys = {
            E_UNAUTHORIZED: 'error.unauthorized',
            E_SERVICE: 'error.service',
            E_READ: 'error.read',
            E_READONLY_LOCATION: 'error.readonly',
            E_NOT_FOUND: 'error.notFound',
            E_PATH_OUTSIDE_ROOT: 'error.pathOutside',
            E_SOURCE_SCHEMA: 'error.sourceSchema',
            E_INDEX_INVALID: 'error.indexInvalid',
            E_INDEX_VERSION: 'error.indexInvalid',
            E_SOURCE_HTTP: 'source.error.fetch',
            E_SOURCE_TOO_LARGE: 'error.tooLarge',
            E_SOURCE_URL_INVALID: 'source.error.invalidUrl',
            E_SKILL_UNKNOWN: 'error.notFound',
            E_NAME_MISMATCH: 'form.name.invalid',
            E_VERSION_MUTATED: 'error.versionUnknown',
            E_VERSION_YANKED: 'market.yanked',
            E_CHECKSUM: 'error.checksum',
            E_NOT_ENOUGH_SPACE: 'error.notEnoughSpace',
            E_CANCELED: 'error.canceled',
            E_TOO_LARGE: 'error.tooLarge',
            E_VERSION_UNKNOWN: 'error.versionUnknown',
            E_NO_COMPATIBLE: 'error.noCompatible',
            E_STALE: 'error.stalePage',
            E_STALE_PAGE: 'error.stalePage',
            E_INTERNAL: 'error.generic',
            E_CONFLICT_MTIME: 'form.mtimeConflict',
            E_NAME_TAKEN: 'form.name.taken',
            E_NAME_INVALID: 'form.name.invalid',
            E_FRONTMATTER: 'form.import.invalid',
            E_SOURCE_UNREACHABLE: 'source.error.fetch',
            E_BAD_REQUEST: 'error.unexpected',
        }
        if (code !== '' && keys[code] !== undefined) {
            const key = keys[code]
            if (key === 'form.import.invalid') return t(key, { reason: t('error.unexpected') })
            return t(key)
        }
        return t('error.unexpected')
    }

    /** 复制路径；成功与失败都走 toast，不静默。 */
    function smCopyText(value, successMessage) {
        const text = value === null || value === undefined ? '' : String(value)
        if (text === '') return
        const done = function () {
            toast(successMessage === undefined || successMessage === null ? t('detail.copiedPath') : String(successMessage))
        }
        try {
            if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined
                && navigator.clipboard !== null && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(text).then(done, function () {
                    toast(t('toast.copyFailed'), { tone: 'error' })
                })
                return
            }
        } catch (failure) {
            /* fall through to the visible failure toast */
        }
        toast(t('toast.copyFailed'), { tone: 'error' })
    }

    /* ------------------------------------------------------------------ *
     * 共享小组件。                                                       *
     * ------------------------------------------------------------------ */

    function SmButton(props) {
        const tone = props.tone === undefined || props.tone === null ? 'secondary' : String(props.tone)
        const disabled = props.disabled === true
        /* 带原因的禁用按钮用 aria-disabled 而不是原生 disabled，保证 hover / focus 能看到原因。 */
        const explain = disabled && props.tip !== undefined && props.tip !== null && props.tip !== ''
        const base = {
            type: 'button',
            className: cx('sm-btn', 'sm-btn-' + tone, props.className),
            disabled: explain ? undefined : disabled,
            'aria-disabled': disabled ? 'true' : undefined,
            tabIndex: explain ? 0 : undefined,
            onClick: explain
                ? function (event) {
                    if (event !== null && event !== undefined) {
                        if (typeof event.preventDefault === 'function') event.preventDefault()
                        if (typeof event.stopPropagation === 'function') event.stopPropagation()
                    }
                }
                : props.onClick,
            style: Object.assign(
                {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '32px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    fontSize: 'calc(var(--sm-fs) - 1px)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.55 : 1,
                },
                props.style || {},
            ),
        }
        if (props.tip !== undefined && props.tip !== null && props.tip !== '' && typeof smTip === 'function') {
            Object.assign(base, smTip(props.tip))
            base['aria-label'] = String(props.tip)
        }
        return h('button', base, props.icon ? icon(props.icon, 14) : null, props.children)
    }

    function SmBadge(props) {
        const tone = props.tone === undefined || props.tone === null ? '' : String(props.tone)
        return h('span', {
            className: cx('sm-badge', tone !== '' && 'sm-badge-' + tone, props.className),
            'data-tip': props.tip,
        }, props.children)
    }

    function SmCard(props) {
        return h('section', {
            className: cx('sm-card', props.className),
            style: Object.assign({ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }, props.style || {}),
        }, props.children)
    }

    function SmCardTitle(props) {
        return h('div', { className: 'sm-card-title', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 } },
            h('span', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.children),
            props.extra === undefined || props.extra === null ? null : props.extra)
    }

    function SmMetaRow(props) {
        return h('div', { className: 'sm-meta-row', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' } },
            h('span', { className: 'sm-meta-label', style: { flexShrink: 0, color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.label),
            h('span', {
                className: cx('sm-meta-value', props.mono === true && 'sm-mono'),
                style: {
                    minWidth: 0,
                    textAlign: 'right',
                    wordBreak: 'break-all',
                    color: 'var(--dsw-alias-label-primary)',
                    fontSize: 'calc(var(--sm-fs) - 1px)',
                },
            }, props.children))
    }

    /** 带行号的只读代码块。 */
    function SmCodeBlock(props) {
        const text = typeof props.text === 'string' ? props.text : ''
        const lines = text === '' ? [''] : text.split('\n')
        return h('div', {
            className: 'sm-code',
            style: { maxHeight: props.maxHeight || '420px', overflow: 'auto', padding: '12px', borderRadius: '14px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)' },
        },
        h('table', { className: 'sm-mono', style: { width: '100%', borderCollapse: 'collapse', fontFamily: SM_MONO, fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '20px' } },
            h('tbody', null, lines.map(function (line, index) {
                return h('tr', { key: index },
                    h('td', { style: { width: '32px', paddingRight: '12px', textAlign: 'right', verticalAlign: 'top', userSelect: 'none', color: 'var(--dsw-alias-label-caption)' } }, String(index + 1)),
                    h('td', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--dsw-alias-label-primary)' } }, line === '' ? ' ' : line))
            }))))
    }

    /* ------------------------------------------------------------------ *
     * 详情数据。                                                         *
     * ------------------------------------------------------------------ */

    function smDetailSignature(detail) {
        if (detail === null || typeof detail !== 'object') return 'none'
        return [smText(detail.kind, 'installed'), smText(detail.id), smText(detail.sourceId), smText(detail.name), String(smNumber(detail.reload, 0))].join('|')
    }

    function smGoBackToList() {
        const kind = appState.detail !== null && typeof appState.detail === 'object' && appState.detail.kind === 'market' ? 'market' : 'skills'
        setState({ view: 'list', detail: null, tab: kind })
        if (typeof restoreListScroll === 'function') restoreListScroll()
    }

    /** 保存 / 删除 / 停用后让详情重新读取文件。 */
    function smRefreshDetail() {
        const detail = appState.detail
        if (detail === null || typeof detail !== 'object') return
        setState({ detail: Object.assign({}, detail, { reload: smNumber(detail.reload, 0) + 1 }) })
    }

    /** `t()` returns the key itself when the dictionary lacks it. */
    function smLocaleKeyOr(primaryKey, fallbackKey) {
        if (typeof t === 'function' && t(primaryKey) !== primaryKey) return primaryKey
        return fallbackKey
    }

    function smStatusLabelKey(skill) {
        if (smIsBuiltin(skill)) return 'detail.status.builtin'
        /* `detail.status.disabled` / `detail.status.readonly` are not in the
         * dictionary yet (owned by another fragment); fall back to the badge
         * labels so the detail header never shows a raw key. */
        if (smIsDisabled(skill)) return smLocaleKeyOr('detail.status.disabled', 'badge.disabled')
        if (smIsBroken(skill)) return 'detail.status.issue'
        if (smIsReadonly(skill)) return smLocaleKeyOr('detail.status.readonly', 'badge.readonly')
        return 'detail.status.active'
    }

    function smStatusTone(skill) {
        if (smIsBuiltin(skill) || smIsDisabled(skill) || smIsReadonly(skill)) return 'idle'
        if (smIsBroken(skill)) return 'warn'
        return 'ok'
    }

    function smStatusNote(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        if (smIsBuiltin(skill)) return t('detail.builtinNote')
        if (smIsDisabled(skill)) return t('detail.disabledNote')
        if (smIsBroken(skill)) return smText(skill.brokenReason, t('detail.status.issue'))
        if (smIsReadonly(skill)) return t('detail.readonlyNote')
        return ''
    }

    /** 源展示名：优先市场区块，其次源列表，最后回退 id。 */
    function smSourceNameById(sourceId) {
        const id = smText(sourceId)
        if (id === '') return ''
        const blocks = Array.isArray(appState.marketSources) ? appState.marketSources : []
        for (let index = 0; index < blocks.length; index += 1) {
            const block = blocks[index]
            if (block !== null && typeof block === 'object' && smText(block.sourceId) === id && smText(block.name) !== '') return smText(block.name)
        }
        const sources = Array.isArray(appState.sources) ? appState.sources : []
        for (let index = 0; index < sources.length; index += 1) {
            const source = sources[index]
            if (source !== null && typeof source === 'object' && smText(source.id) === id && smText(source.name) !== '') return smText(source.name)
        }
        return id
    }

    /** 详情右侧「来源」：只说来自市场、本地文件或 Harness 自带。 */
    function smSourceLabel(skill) {
        if (skill === null || typeof skill !== 'object') return t('detail.source.local')
        if (smIsBuiltin(skill)) return t('detail.status.builtin')
        const sourceId = smText(skill.sourceId)
        const sourceName = smText(skill.sourceName, smSourceNameById(sourceId))
        if (sourceId !== '' || sourceName !== '') return t('detail.source.market', { source: sourceName })
        return t('detail.source.local')
    }

    function smSkillVersion(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const version = smText(skill.version)
        if (version === '') return ''
        return version.charAt(0) === 'v' ? version : 'v' + version
    }

    function smSkillUpdateVersion(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        if (typeof skillUpdateVersion === 'function') return smText(skillUpdateVersion(skill))
        return smText(skill.updateAvailable)
    }

    /* ------------------------------------------------------------------ *
     * 详情页。                                                           *
     * ------------------------------------------------------------------ */

    function SmDetailSkeleton() {
        const block = function (width, height) {
            return h('div', { style: { width: width, height: height, borderRadius: '10px', background: 'var(--dsw-alias-bg-layer-2)' } })
        }
        return h('div', { className: 'sm-detail sm-detail-skeleton', style: { display: 'flex', flexDirection: 'column', gap: '24px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
                block('56px', '56px'),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, block('220px', '20px'), block('140px', '14px'))),
            h('div', { className: 'sm-detail-body' },
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, block('100%', '140px'), block('100%', '220px')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, block('100%', '180px'), block('100%', '120px'))),
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')))
    }

    function SmDetailErrorState(props) {
        return h('div', { className: 'sm-card sm-detail-error', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '56px 20px', textAlign: 'center' } },
            h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
            h('div', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('state.error.detail.title')),
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.message ? String(props.message) : t('state.error.detail.body')),
            h(SmButton, { tone: 'secondary', onClick: props.onRetry }, t('action.retry')))
    }

    function SmDetailHeader(props) {
        const skill = props.skill
        const version = smSkillVersion(skill)
        return h('div', { className: 'sm-detail-head', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingBottom: '20px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 } },
                h('div', {
                    className: 'sm-detail-icon',
                    style: {
                        position: 'relative',
                        width: '56px',
                        height: '56px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px',
                        background: 'var(--dsw-alias-bg-layer-1)',
                        border: '1px solid var(--dsw-alias-border-l2)',
                        color: 'var(--dsw-alias-label-secondary)',
                        opacity: smIsDisabled(skill) ? 0.6 : 1,
                    },
                }, icon(skillIconName(skill), 28)),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                        h('h2', { className: 'sm-mono sm-detail-title', style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 2px)', lineHeight: '1.4', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.name),
                        version !== '' ? h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, version) : null,
                        props.badge !== undefined && props.badge !== null ? props.badge : null),
                    props.subtitle !== undefined && props.subtitle !== null && props.subtitle !== ''
                        ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.subtitle)
                        : null)),
            h('div', { className: 'sm-detail-actions', style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' } }, props.children))
    }

    function SmDetailBack(props) {
        return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' } },
            h('button', {
                type: 'button',
                className: 'sm-detail-back',
                onClick: smGoBackToList,
                style: { height: '28px', padding: '0 8px', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-tertiary)', fontSize: 'calc(var(--sm-fs) - 1.5px)', cursor: 'pointer' },
            }, '← ' + (props.kind === 'market' ? t('action.back.market') : t('action.back.skills'))),
            props.extra === undefined || props.extra === null ? null : props.extra)
    }

    function SmInstalledDetail(props) {
        const detail = props.detail
        const skill = props.skill
        const name = smText(skill.name, smText(detail.name, smText(detail.id)))
        const description = smText(skill.description)
        const whenToUse = smText(skill.whenToUse)
        const path = smText(skill.path)
        const writable = !smIsReadonly(skill) && !smIsBuiltin(skill)
        const builtin = smIsBuiltin(skill)
        const disabled = smIsDisabled(skill)
        const statusKey = smStatusLabelKey(skill)
        const statusNote = smStatusNote(skill)
        const updateVersion = smSkillUpdateVersion(skill)
        const readonlyReason = builtin ? t('detail.builtinNote') : t('detail.readonlyNote')

        const [content, setContent] = useState('')
        const [contentMtime, setContentMtime] = useState(smNumber(skill.mtime, 0))
        const [contentState, setContentState] = useState(path === '' ? 'none' : 'loading')
        const [contentError, setContentError] = useState('')
        const autoEdit = useRef(detail.edit === true)
        const alive = useRef(true)

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const loadContent = useCallback(function () {
            if (path === '') {
                setContentState('none')
                return
            }
            setContentState('loading')
            setContentError('')
            api('skill?path=' + encodeURIComponent(path)).then(function (payload) {
                if (!alive.current) return
                setContent(payload !== null && typeof payload === 'object' && typeof payload.content === 'string' ? payload.content : '')
                if (payload !== null && typeof payload === 'object' && payload.skill !== null && typeof payload.skill === 'object') {
                    setContentMtime(smNumber(payload.skill.mtime, smNumber(skill.mtime, 0)))
                }
                setContentState('ready')
            }).catch(function (failure) {
                if (!alive.current) return
                setContentError(smErrorMessage(failure))
                setContentState('error')
            })
        }, [path])

        useEffect(function () {
            loadContent()
        }, [loadContent])

        const openEditor = function () {
            if (!writable || disabled) return
            openModal('edit-content', {
                skill: skill,
                name: name,
                path: path,
                mtime: contentMtime,
                content: contentState === 'ready' ? content : undefined,
            })
        }

        useEffect(function () {
            if (!autoEdit.current) return
            autoEdit.current = false
            if (writable && !disabled && contentState === 'ready') openEditor()
        }, [contentState, writable])

        const setEnabled = function (nextEnabled) {
            if (!writable || path === '') return Promise.resolve()
            return api('skill/state', { method: 'POST', body: { path: path, enabled: nextEnabled } }).then(function () {
                void loadInstalled(true)
                smRefreshDetail()
            })
        }

        const toggleState = function () {
            if (!writable || path === '') return
            setEnabled(disabled).then(function () {
                toast(disabled ? t('toast.enabled', { name: name }) : t('toast.disabled', { name: name }), {
                    actionLabel: t('action.undo'),
                    duration: 8000,
                    onAction: function () {
                        setEnabled(!disabled).catch(function (failure) {
                            toast(smErrorMessage(failure), { tone: 'error' })
                        })
                    },
                })
            }).catch(function (failure) {
                toast(smErrorMessage(failure), { tone: 'error' })
            })
        }

        const actions = []
        if (updateVersion !== '') {
            actions.push(h(SmButton, {
                key: 'update',
                tone: 'primary',
                icon: 'arrow-up-dot',
                disabled: disabled || !writable,
                tip: disabled ? t('detail.disabledNote') : (writable ? '' : readonlyReason),
                onClick: function () { openModal('update', { skill: skill }) },
            }, t('market.updateTo', { version: (updateVersion.charAt(0) === 'v' ? '' : 'v') + updateVersion })))
        }
        actions.push(h(SmButton, {
            key: 'toggle',
            tone: 'secondary',
            icon: 'power',
            disabled: !writable || path === '',
            tip: !writable ? readonlyReason : (path === '' ? t('detail.location.builtin') : ''),
            onClick: toggleState,
        }, disabled ? t('action.enable') : t('action.disable')))
        const removeKind = smText(skill.sourceId) !== '' ? 'uninstall' : 'delete'
        actions.push(h(SmButton, {
            key: 'remove',
            tone: 'danger',
            icon: 'trash',
            disabled: !writable || path === '',
            tip: !writable ? readonlyReason : (path === '' ? t('detail.location.builtin') : ''),
            onClick: function () { openModal(removeKind, { skill: skill }) },
        }, removeKind === 'uninstall' ? t('action.uninstall') : t('action.delete')))

        const previewActions = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            contentState === 'ready'
                ? h(SmButton, { tone: 'ghost', icon: 'file', onClick: function () { openModal('preview', { name: name, content: content }) } }, t('detail.content'))
                : null,
            h(SmButton, {
                tone: 'secondary',
                icon: 'edit',
                disabled: disabled || !writable || path === '',
                tip: disabled ? t('detail.disabledNote') : (!writable ? readonlyReason : (path === '' ? t('detail.location.builtin') : '')),
                onClick: openEditor,
            }, t('action.edit')))

        const badge = h(SmBadge, { tone: smStatusTone(skill) }, t(statusKey))

        return h('div', { className: 'sm-detail-page sm-scroll' },
            h(SmDetailBack, { kind: 'installed' }),
            h(SmDetailHeader, {
                skill: skill,
                name: name,
                badge: badge,
                subtitle: smSourceLabel(skill) + ' · ' + t('detail.updated', { time: fmtTime(smNumber(skill.mtime, 0)) }),
            }, actions),
            h('div', { className: 'sm-detail sm-detail-body' },
                h('div', { className: 'sm-detail-main' },
                    statusNote !== ''
                        ? h('div', { className: 'sm-banner', style: { padding: '10px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } }, statusNote)
                        : null,
                    h(SmCard, { className: 'sm-detail-desc' },
                        h(SmCardTitle, null, t('detail.descTitle')),
                        h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', lineHeight: '1.55' } }, description !== '' ? description : '—')),
                    whenToUse !== ''
                        ? h(SmCard, { className: 'sm-detail-when' },
                            h(SmCardTitle, null, t('detail.whenToUse')),
                            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.5' } }, whenToUse))
                        : null,
                    h(SmCard, { className: 'sm-detail-content' },
                        h(SmCardTitle, { extra: previewActions }, 'SKILL.md · ' + t('detail.content')),
                        contentState === 'loading'
                            ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading'))
                            : contentState === 'error'
                                ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                                    h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, contentError),
                                    h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start' }, onClick: loadContent }, t('action.retry')))
                                : contentState === 'none'
                                    ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('detail.location.builtin'))
                                    : content === ''
                                        ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('detail.content.empty'))
                                        : h(SmCodeBlock, { text: content.split('\n').slice(0, 40).join('\n'), maxHeight: '360px' }))),
                h('div', { className: 'sm-detail-side' },
                    h(SmCard, { className: 'sm-detail-meta' },
                        h(SmCardTitle, { extra: badge }, t('market.source')),
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                            smSkillVersion(skill) !== '' ? h(SmMetaRow, { label: t('detail.version'), mono: true }, smSkillVersion(skill)) : null,
                            smText(skill.author) !== '' ? h(SmMetaRow, { label: t('detail.author') }, smText(skill.author)) : null,
                            h(SmMetaRow, { label: t('market.source') }, smSourceLabel(skill)),
                            h(SmMetaRow, { label: t('sort.modified') }, fmtTime(smNumber(skill.mtime, 0))),
                            h(SmMetaRow, { label: t('detail.location'), mono: path !== '' },
                                path !== ''
                                    ? h('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', minWidth: 0 } },
                                        h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all' } }, path),
                                        h(SmButton, { tone: 'ghost', icon: 'copy', style: { height: '24px', flexShrink: 0 }, onClick: function () { smCopyText(path) } }, t('action.copyPath')))
                                    : t('detail.location.builtin')))),
                    h(SmCard, { className: 'sm-detail-actions-card' },
                        h(SmCardTitle, null, t('action.more')),
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, actions))))
        )
    }

    function SmMarketDetail(props) {
        const detail = props.detail
        const key = smMarketKey(detail)
        const [data, setData] = useState(props.marketSkill)
        const [loading, setLoading] = useState(props.marketSkill === null)
        const [error, setError] = useState('')
        const alive = useRef(true)
        const installed = props.installed

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const load = useCallback(function () {
            const sourceId = smText(key.sourceId, data !== null && data !== undefined ? smText(data.sourceId) : '')
            const name = smText(key.name, data !== null && data !== undefined ? smText(data.name) : '')
            if (sourceId === '' || name === '') {
                setLoading(false)
                setError(t('error.notFound'))
                return
            }
            setLoading(true)
            setError('')
            api('market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name)).then(function (payload) {
                if (!alive.current) return
                setData(payload !== null && typeof payload === 'object' ? payload : null)
                setLoading(false)
            }).catch(function (failure) {
                if (!alive.current) return
                setError(smErrorMessage(failure))
                setLoading(false)
            })
        }, [key.sourceId, key.name])

        useEffect(function () {
            load()
        }, [load])

        if (loading && data === null) {
            return h('div', { className: 'sm-detail-page sm-scroll' },
                h(SmDetailBack, { kind: 'market' }),
                h(SmDetailSkeleton))
        }
        if (data === null || typeof data !== 'object') {
            return h('div', { className: 'sm-detail-page sm-scroll' },
                h(SmDetailBack, { kind: 'market' }),
                h(SmDetailErrorState, { message: error, onRetry: load }))
        }

        const market = data.skill !== null && data.skill !== undefined && typeof data.skill === 'object' ? data.skill : data
        const readme = smText(data.readme)
        const name = smText(market.name, key.name)
        const version = smSkillVersion(market)
        const sourceName = smText(market.sourceName, smText(detail.sourceName, smSourceNameById(smText(market.sourceId, key.sourceId))))
        const installedSkill = installed
        const updateVersion = installedSkill !== null ? smSkillUpdateVersion(installedSkill) : smText(market.updateAvailable)
        const installedNow = installedSkill !== null || market.installed === true
        const writable = installedSkill !== null && !smIsReadonly(installedSkill) && !smIsBuiltin(installedSkill)

        const actions = []
        if (!installedNow) {
            actions.push(h(SmButton, {
                key: 'install',
                tone: 'primary',
                icon: 'download',
                onClick: function () { openModal('install', { sourceId: smText(market.sourceId, key.sourceId), name: name, version: smText(market.version), skill: market }) },
            }, t('action.install')))
        } else {
            if (updateVersion !== '') {
                actions.push(h(SmButton, {
                    key: 'update',
                    tone: 'primary',
                    icon: 'arrow-up-dot',
                    disabled: installedSkill === null,
                    onClick: function () { openModal('update', { skill: installedSkill }) },
                }, t('market.updateTo', { version: (updateVersion.charAt(0) === 'v' ? '' : 'v') + updateVersion })))
            }
            actions.push(h(SmButton, {
                key: 'edit',
                tone: 'secondary',
                icon: 'edit',
                disabled: !writable,
                tip: writable ? '' : (smIsBuiltin(installedSkill) ? t('detail.builtinNote') : t('detail.readonlyNote')),
                onClick: function () {
                    const path = installedSkill !== null ? smText(installedSkill.path) : ''
                    if (path === '') return
                    openModal('edit-content', { skill: installedSkill, name: name, path: path, mtime: smNumber(installedSkill.mtime, 0) })
                },
            }, t('action.edit')))
            actions.push(h(SmButton, {
                key: 'uninstall',
                tone: 'danger',
                icon: 'trash',
                disabled: !writable,
                tip: writable ? '' : (smIsBuiltin(installedSkill) ? t('detail.builtinNote') : t('detail.readonlyNote')),
                onClick: function () { openModal('uninstall', { skill: installedSkill, name: name }) },
            }, t('action.uninstall')))
        }

        return h('div', { className: 'sm-detail-page sm-scroll' },
            h(SmDetailBack, { kind: 'market' }),
            h(SmDetailHeader, {
                skill: market,
                name: name,
                badge: installedNow ? h(SmBadge, { tone: 'ok' }, t('market.installed')) : null,
                subtitle: smText(market.author) + (smText(market.author) !== '' ? ' · ' : '') + t('detail.source.market', { source: sourceName }),
            }, actions),
            h('div', { className: 'sm-detail sm-detail-body' },
                h('div', { className: 'sm-detail-main' },
                    h(SmCard, null,
                        h(SmCardTitle, null, t('market.detailDesc')),
                        h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', lineHeight: '1.55' } }, smText(market.description, '—'))),
                    h(SmCard, null,
                        h(SmCardTitle, { extra: readme !== ''
                            ? h(SmButton, { tone: 'ghost', icon: 'file', onClick: function () { openModal('preview', { name: name, content: readme }) } }, t('detail.content'))
                            : null }, t('market.readme')),
                        readme !== ''
                            ? h(SmCodeBlock, { text: readme.split('\n').slice(0, 40).join('\n'), maxHeight: '420px' })
                            : h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('detail.content.empty')))),
                h('div', { className: 'sm-detail-side' },
                    h(SmCard, null,
                        h(SmCardTitle, null, t('market.source')),
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                            h(SmMetaRow, { label: t('market.source') }, sourceName),
                            version !== '' ? h(SmMetaRow, { label: t('market.version'), mono: true }, version) : null,
                            smText(market.author) !== '' ? h(SmMetaRow, { label: t('market.author') }, smText(market.author)) : null,
                            smText(market.license) !== '' ? h(SmMetaRow, { label: t('market.license') }, smText(market.license)) : null,
                            smText(market.homepage) !== '' ? h(SmMetaRow, { label: t('market.homepage'), mono: true }, smText(market.homepage)) : null,
                            smText(market.enginesDsh) !== '' ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('market.engines', { range: smText(market.enginesDsh) })) : null,
                            smNumber(market.publishTimestamp, 0) > 0 ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('market.published', { time: fmtTime(market.publishTimestamp) })) : null,
                            installedNow ? h(SmMetaRow, { label: t('market.installed') }, installedSkill !== null ? fmtTime(smNumber(installedSkill.mtime, 0)) : t('market.installed')) : null)))
            )
        )
    }

    function SmDetailView(props) {
        const detail = props.detail !== null && typeof props.detail === 'object' ? props.detail : {}
        const kind = detail.kind === 'market' ? 'market' : 'installed'
        const skill = kind === 'installed'
            ? (smFindSkillById(detail.id) || smFindSkillByName(detail.name))
            : null
        const marketSkill = kind === 'market' ? smFindMarketSkill(detail) : null
        const installedCopy = kind === 'market' ? smFindInstalledCopy(marketSkill, detail) : null

        useEffect(function () {
            const onKeyDown = function (event) {
                if (event.key !== 'Escape') return
                if (typeof smHasOpenOverlay === 'function' && smHasOpenOverlay()) return
                if (appState.modal !== null && appState.modal !== undefined) return
                event.preventDefault()
                event.stopPropagation()
                smGoBackToList()
            }
            document.addEventListener('keydown', onKeyDown, true)
            return function () { document.removeEventListener('keydown', onKeyDown, true) }
        }, [])

        if (kind === 'installed' && (skill === null || typeof skill !== 'object')) {
            return h('div', { className: 'sm-detail-page sm-scroll' },
                h(SmDetailBack, { kind: 'installed' }),
                h(SmDetailErrorState, { message: '', onRetry: function () { void loadInstalled(true) } }))
        }

        if (kind === 'market') {
            return h(SmMarketDetail, { detail: detail, marketSkill: marketSkill, installed: installedCopy })
        }

        return h(SmInstalledDetail, { detail: detail, skill: skill })
    }

    function smFindMarketSkill(detail) {
        const key = smMarketKey(detail)
        const sourceId = key.sourceId
        const name = key.name
        const blocks = Array.isArray(appState.marketSources) ? appState.marketSources : []
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
            const block = blocks[blockIndex]
            if (block === null || typeof block !== 'object' || !Array.isArray(block.skills)) continue
            for (let index = 0; index < block.skills.length; index += 1) {
                const item = block.skills[index]
                if (item === null || typeof item !== 'object') continue
                if (sourceId !== '' && item.sourceId !== sourceId) continue
                if (item.name === name) return item
            }
        }
        return null
    }

    function smFindInstalledCopy(marketSkill, detail) {
        const key = smMarketKey(detail)
        const sourceId = smText(marketSkill !== null && marketSkill !== undefined ? marketSkill.sourceId : key.sourceId)
        const name = smText(marketSkill !== null && marketSkill !== undefined ? marketSkill.name : key.name)
        const list = smSkillList()
        let fallback = null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (skill === null || typeof skill !== 'object' || skill.name !== name) continue
            if (sourceId !== '' && skill.sourceId === sourceId) return skill
            if (fallback === null) fallback = skill
        }
        return sourceId === '' ? fallback : null
    }

    /** Entry point used by the page shell when `appState.view === 'detail'`. */
    function renderDetailPage() {
        const detail = appState.detail
        if (detail === null || typeof detail !== 'object') return null
        return h(SmDetailView, { key: smDetailSignature(detail), detail: detail })
    }
