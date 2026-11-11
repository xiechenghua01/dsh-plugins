    /* 由原 40-detail.js 行 1-487 拆出。 */
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
            style: Object.assign({ gap: '12px' }, props.style || {}),
        }, props.children)
    }

    function SmCardTitle(props) {
        return h('div', { className: 'sm-card-title sm-row-gap', style: { justifyContent: 'space-between' } },
            h('span', null, props.children),
            props.extra === undefined || props.extra === null ? null : props.extra)
    }

    function SmMetaRow(props) {
        return h('div', { className: 'sm-meta-row' },
            h('span', { className: 'sm-meta-label' }, props.label),
            h('span', {
                className: cx('sm-meta-value', props.mono === true && 'sm-mono'),
            }, props.children))
    }

    /** 带行号的只读代码块。 */
    function SmCodeBlock(props) {
        const text = typeof props.text === 'string' ? props.text : ''
        const lines = text === '' ? [''] : text.split('\n')
        return h('div', {
            className: 'sm-code',
            style: { maxHeight: props.maxHeight || '420px', padding: '12px' },
        },
        h('table', { className: 'sm-mono sm-fs-12', style: { width: '100%', borderCollapse: 'collapse', fontFamily: SM_MONO, lineHeight: '20px' } },
            h('tbody', null, lines.map(function (line, index) {
                return h('tr', { key: index },
                    h('td', { className: 'sm-caption', style: { width: '32px', paddingRight: '12px', textAlign: 'right', verticalAlign: 'top', userSelect: 'none' } }, String(index + 1)),
                    h('td', { className: 'sm-code-text', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, line === '' ? ' ' : line))
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

    /** 详情里只展示源名，不重复「来自市场」这层前缀。 */
    function smSourceShort(skill) {
        if (skill === null || typeof skill !== 'object') return t('detail.source.local')
        if (smIsBuiltin(skill)) return t('detail.status.builtin')
        const sourceId = smText(skill.sourceId)
        const sourceName = smText(skill.sourceName, smSourceNameById(sourceId))
        if (sourceId !== '' || sourceName !== '') return sourceName
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

    /**
     * 界面语言下的技能描述：Host 在市场索引里提供 `descriptionByLocale`
     * （`{ en, zh }`）时按 `appState.locale` 选择（zh* 用 zh，其它用 en）；
     * 字段缺失或所选语言为空时回退 SKILL.md 的单语 `description`。
     * 列表卡片（10-skills.js）与详情页共用这一个选择函数。
     */
    function smSkillDescription(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const byLocale = skill.descriptionByLocale
        if (byLocale !== null && typeof byLocale === 'object') {
            const locale = String(appState.locale === undefined || appState.locale === null ? '' : appState.locale).toLowerCase()
            const localized = locale.indexOf('zh') === 0 ? smText(byLocale.zh) : smText(byLocale.en)
            if (localized !== '') return localized
        }
        return smText(skill.description)
    }

    /* ------------------------------------------------------------------ *
     * 详情页。                                                           *
     * ------------------------------------------------------------------ */

    /**
     * 整页骨架：标题 + 左栏 2 个卡片占位 + 右栏 1 个卡片占位。
     * 市场详情在拿到 `{ skill, content }` 之前只渲染这一块，避免框架先出、
     * 内容卡片后补导致的整页跳动。浅色块不带动画，避免加载期额外开销。
     */
    function SmDetailSkeleton() {
        const block = function (width, height, radius) {
            return h('div', {
                style: {
                    width: width,
                    height: height,
                    borderRadius: radius === undefined ? '10px' : radius,
                    background: 'var(--dsw-alias-bg-layer-2)',
                },
            })
        }
        const card = function (key, children) {
            return h('div', {
                key: key,
                className: 'sm-card',
                style: { gap: '12px', padding: '16px' },
            }, children)
        }
        return h('div', {
            className: 'sm-detail sm-detail-skeleton',
            'aria-busy': 'true',
        },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '20px', borderBottom: '0.5px solid var(--dsw-alias-border-l2)' } },
                block('56px', '56px', '16px'),
                h('div', { className: 'sm-stack' }, block('220px', '20px'), block('140px', '14px'))),
            h('div', { className: 'sm-detail-body' },
                h('div', { className: 'sm-detail-main' },
                    card('desc', block('40%', '16px'), block('100%', '96px')),
                    card('content', block('32%', '16px'), block('100%', '240px'))),
                h('div', { className: 'sm-detail-side' },
                    card('meta', block('50%', '16px'), block('100%', '168px')))),
            h('div', { className: 'sm-fs-13 sm-text-secondary' }, t('state.loading')))
    }

    function SmDetailErrorState(props) {
        return h('div', { className: 'sm-card sm-detail-error', style: { alignItems: 'center', gap: '12px', padding: '56px 20px', textAlign: 'center' } },
            h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
            h('div', { className: 'sm-card-title' }, t('state.error.detail.title')),
            h('div', { className: 'sm-fs-12 sm-text-secondary' }, props.message ? String(props.message) : t('state.error.detail.body')),
            h(SmButton, { tone: 'secondary', onClick: props.onRetry }, t('action.retry')))
    }
