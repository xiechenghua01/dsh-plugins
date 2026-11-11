    /* 由原 40-detail.js 行 488-969 拆出。 */
    function SmDetailHeader(props) {
        const skill = props.skill
        const version = smSkillVersion(skill)
        return h('div', { className: 'sm-detail-head' },
            h('div', null,
                h('div', {
                    className: 'sm-detail-icon',
                    style: {
                        opacity: smIsDisabled(skill) ? 0.6 : 1,
                    },
                }, icon(skillIconName(skill), 28)),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 } },
                    h('div', { className: 'sm-detail-title-line' },
                        h('h2', { className: 'sm-mono sm-detail-title' }, props.name),
                        version !== '' ? h('span', { className: 'sm-mono sm-detail-ver' }, version) : null,
                        props.badge !== undefined && props.badge !== null ? props.badge : null),
                    props.subtitle !== undefined && props.subtitle !== null && props.subtitle !== ''
                        ? h('div', { className: 'sm-fs-12 sm-text-secondary' }, props.subtitle)
                        : null)),
            h('div', { className: 'sm-detail-actions', style: { justifyContent: 'flex-end' } }, props.children))
    }

    function SmDetailBack(props) {
        return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' } },
            h('button', {
                type: 'button',
                className: 'sm-detail-back',
                onClick: smGoBackToList,
                style: { fontSize: 'calc(var(--ds-fs) - 2px)' },
            }, '← ' + (props.kind === 'market' ? t('action.back.market') : t('action.back.skills'))),
            props.extra === undefined || props.extra === null ? null : props.extra)
    }

    function SmInstalledDetail(props) {
        const detail = props.detail
        const skill = props.skill
        const name = smText(skill.name, smText(detail.name, smText(detail.id)))
        const description = smSkillDescription(skill)
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

        // Icon-only actions with 300ms tooltips: copy the body, or edit in place.
        const previewActions = h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
            contentState === 'ready'
                ? h('button', {
                    type: 'button',
                    className: 'sm-icon-btn',
                    'aria-label': t('action.copy'),
                    'data-tip': t('action.copy'),
                    onClick: function () {
                        smCopyText(content, t('toast.copied'))
                        openModal('preview', { name: name, content: content })
                    },
                }, icon('copy', 16))
                : null,
            h('button', {
                type: 'button',
                className: 'sm-icon-btn',
                'aria-label': t('action.edit'),
                'data-tip': disabled ? t('detail.disabledNote') : (!writable ? readonlyReason : (path === '' ? t('detail.location.builtin') : t('action.edit'))),
                disabled: disabled || !writable || path === '',
                onClick: openEditor,
            }, icon('edit', 16)))

        const badge = h(SmBadge, { tone: smStatusTone(skill) }, t(statusKey))

        return h('div', { className: 'sm-detail-page sm-scroll' },
            h(SmDetailBack, { kind: 'installed' }),
            h(SmDetailHeader, {
                skill: skill,
                name: name,
                badge: badge,
                subtitle: smSourceShort(skill) + ' · ' + t('detail.updated', { time: fmtTime(smNumber(skill.mtime, 0)) }),
            }, actions),
            h('div', { className: 'sm-detail sm-detail-body' },
                h('div', { className: 'sm-detail-main' },
                    statusNote !== ''
                        ? h('div', { className: 'sm-banner sm-fs-12', style: { padding: '10px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)', lineHeight: '1.5' } }, statusNote)
                        : null,
                    h(SmCard, { className: 'sm-detail-desc' },
                        h(SmCardTitle, null, t('detail.descTitle')),
                        h('div', { className: 'sm-fs-14', style: { color: 'var(--dsw-alias-label-primary)', lineHeight: '1.55' } }, description !== '' ? description : '—')),
                    whenToUse !== ''
                        ? h(SmCard, { className: 'sm-detail-when' },
                            h(SmCardTitle, null, t('detail.whenToUse')),
                            h('div', { className: 'sm-fs-13', style: { color: 'var(--dsw-alias-label-secondary)', lineHeight: '1.5' } }, whenToUse))
                        : null,
                    h(SmCard, { className: 'sm-detail-content' },
                        h(SmCardTitle, { extra: previewActions }, 'SKILL.md'),
                        contentState === 'loading'
                            ? h('div', { className: 'sm-fs-13 sm-text-secondary' }, t('state.loading'))
                            : contentState === 'error'
                                ? h('div', { className: 'sm-stack' },
                                    h('div', { className: 'sm-fs-13 sm-text-secondary' }, contentError),
                                    h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start' }, onClick: loadContent }, t('action.retry')))
                                : contentState === 'none'
                                    ? h('div', { className: 'sm-fs-13 sm-text-secondary' }, t('detail.location.builtin'))
                                    : content === ''
                                        ? h('div', { className: 'sm-fs-13', style: { color: 'var(--dsw-alias-label-caption)' } }, t('detail.content.empty'))
                                        : h(SmCodeBlock, { text: content.split('\n').slice(0, 40).join('\n'), maxHeight: '360px' }))),
                h('div', { className: 'sm-detail-side' },
                    h(SmCard, { className: 'sm-detail-meta' },
                        h(SmCardTitle, { extra: badge }, t('market.source')),
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                            smSkillVersion(skill) !== '' ? h(SmMetaRow, { label: t('detail.version'), mono: true }, smSkillVersion(skill)) : null,
                            smText(skill.author) !== '' ? h(SmMetaRow, { label: t('detail.author') }, smText(skill.author)) : null,
                            h(SmMetaRow, { label: t('market.source') }, smSourceShort(skill)),
                            h(SmMetaRow, { label: t('sort.modified') }, fmtTime(smNumber(skill.mtime, 0))),
                            h(SmMetaRow, { label: t('detail.location'), mono: path !== '' },
                                path !== ''
                                    ? h('span', { className: 'sm-detail-path' },
                                        h('span', { className: 'sm-mono sm-detail-path-text', 'data-tip': path }, path),
                                        h('button', {
                                            type: 'button',
                                            className: 'sm-icon-btn sm-detail-path-copy',
                                            'aria-label': t('action.copyPath'),
                                            'data-tip': t('action.copyPath'),
                                            onClick: function () { smCopyText(path) },
                                        }, icon('copy', 16)))
                                    : t('detail.location.builtin'))))))
        )
    }

    function SmMarketDetail(props) {
        const detail = props.detail
        const key = smMarketKey(detail)
        const [data, setData] = useState(props.marketSkill)
        /* 首帧一律骨架：索引里的 `marketSkill` 只有摘要、没有 SKILL.md 正文，
         * 若先渲染它，正文卡片会在请求返回后再补进来，造成整页跳动。 */
        const [loading, setLoading] = useState(true)
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

        /* 整页骨架 → 整页内容，中间不插入任何卡片。 */
        if (loading) {
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
        /* 详情正文：优先 Host 返回的 SKILL.md 原文（data.content），旧数据回退 README。 */
        const content = smText(data.content, smText(data.readme))
        const contentError = smText(data.contentError, error)
        const name = smText(market.name, key.name)
        const version = smSkillVersion(market)
        const sourceName = smText(market.sourceName, smText(detail.sourceName, smSourceNameById(smText(market.sourceId, key.sourceId))))
        const homepage = smText(market.homepage)
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
                        h('div', { className: 'sm-fs-14', style: { color: 'var(--dsw-alias-label-primary)', lineHeight: '1.55' } }, smText(smSkillDescription(market), '—'))),
                    /* 正文卡片始终占位（即使正文为空），保证骨架与内容页结构一致。 */
                    h(SmCard, { className: 'sm-detail-content' },
                        h(SmCardTitle, {
                            extra: content !== ''
                                ? h('button', {
                                    type: 'button',
                                    className: 'sm-icon-btn',
                                    'aria-label': t('action.copy'),
                                    'data-tip': t('action.copy'),
                                    onClick: function () {
                                        smCopyText(content, t('toast.copied'))
                                        openModal('preview', { name: name, content: content })
                                    },
                                }, icon('copy', 16))
                                : null,
                        }, 'SKILL.md'),
                        content !== ''
                            ? h(SmCodeBlock, { text: content.split('\n').slice(0, 40).join('\n'), maxHeight: '420px' })
                            : h('div', { className: 'sm-fs-13 sm-text-secondary' },
                                contentError !== '' ? t('source.error.fetch') : t('detail.content.empty')))),
                h('div', { className: 'sm-detail-side' },
                    h(SmCard, null,
                        h(SmCardTitle, {
                            extra: smNumber(market.publishTimestamp, 0) > 0
                                ? h('span', { className: 'sm-fs-11', style: { color: 'var(--dsw-alias-label-caption)', whiteSpace: 'nowrap' } }, t('market.published', { time: fmtTime(market.publishTimestamp) }))
                                : null,
                        }, t('market.source')),
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                            h(SmMetaRow, { label: t('market.source') }, sourceName || smSourceShort(market)),
                            version !== '' ? h(SmMetaRow, { label: t('market.version'), mono: true }, version) : null,
                            smText(market.author) !== '' ? h(SmMetaRow, { label: t('market.author') }, smText(market.author)) : null,
                            smText(market.license) !== '' ? h(SmMetaRow, { label: t('market.license') }, smText(market.license)) : null,
                            homepage !== ''
                                ? h(SmMetaRow, { label: t('market.homepage'), mono: true },
                                    h('span', { className: 'sm-detail-path' },
                                        h('span', { className: 'sm-mono sm-detail-path-text', 'data-tip': homepage }, homepage),
                                        h('button', {
                                            type: 'button',
                                            className: 'sm-icon-btn sm-detail-path-copy',
                                            'aria-label': t('action.copyPath'),
                                            'data-tip': t('action.copyPath'),
                                            onClick: function () { smCopyText(homepage) },
                                        }, icon('copy', 14))))
                                : null,
                            smText(market.enginesDsh) !== '' ? h('div', { className: 'sm-fs-12 sm-text-secondary' }, t('market.engines', { range: smText(market.enginesDsh) })) : null,

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
