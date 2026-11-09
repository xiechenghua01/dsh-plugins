    /* ------------------------------------------------------------------ *
     * C2 · 来源 Tab                                                       *
     *                                                                    *
     * 数据来源：appState.installed（locations / presets）与 appState.sources
     * 「添加源」走 50-modals.js 的 add-source；编辑/删除在卡片内联确认，
     * 因为该模态只实现了新增，没有 source 的编辑/删除分支。                 *
     * ------------------------------------------------------------------ */

    let smSourcesCache = []
    let smSourcesLoading = false
    let smSourcesError = null
    let smSourcesBootScheduled = false
    let smSourcesBusy = Object.create(null)
    let smSourcesEditing = null
    let smSourcesEditName = ''
    let smSourcesEditUrl = ''
    let smSourcesEditError = ''
    let smSourcesSaving = false
    let smSourcesConfirmDelete = null
    let smSourcesDeleting = false

    const SM_SOURCES_GRID_STYLE = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
        gap: '12px',
    }

    function smSourcesErrorText(err) {
        if (err === null || err === undefined) return ''
        if (typeof err === 'string') return err
        if (typeof err === 'object') {
            if (typeof err.message === 'string' && err.message !== '') return err.message
            if (typeof err.code === 'string' && err.code !== '') return err.code
        }
        return String(err)
    }

    function smSourcesCurrent() {
        if (Array.isArray(appState.sources)) return appState.sources
        return smSourcesCache
    }

    function smSourcesExtractList(result) {
        if (result === null || result === undefined) return null
        if (Array.isArray(result)) return result
        if (typeof result === 'object') {
            if (Array.isArray(result.sources)) return result.sources
            if (result.data !== null && typeof result.data === 'object' && Array.isArray(result.data.sources)) {
                return result.data.sources
            }
        }
        return null
    }

    async function smSourcesReload(force) {
        /* 00-prelude 的 loadSources 失败时返回 null 并写入 appState.error。 */
        if (appState.loadingSources === true && force !== true) return true
        try {
            const result = await loadSources(force)
            if (result === null || result === undefined) {
                const scoped = appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'sources'
                    ? appState.error
                    : null
                smSourcesError = scoped || { code: 'E_INTERNAL', message: t('error.loadSources') }
                return false
            }
            const list = smSourcesExtractList(result)
            if (list !== null) {
                smSourcesCache = list
                appState.sources = list
            } else if (Array.isArray(appState.sources)) {
                smSourcesCache = appState.sources.slice()
            }
            smSourcesError = null
            return true
        } catch (err) {
            smSourcesError = err !== null && typeof err === 'object' ? err : { message: smSourcesErrorText(err) }
            return false
        }
    }

    async function smInstalledReload(force) {
        if (appState.loadingInstalled === true && force !== true) return true
        try {
            const result = await loadInstalled(force)
            if (result === null || result === undefined) {
                const scoped = appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'installed'
                    ? appState.error
                    : null
                if (scoped !== null && smSourcesError === null) smSourcesError = scoped
                return false
            }
            return true
        } catch (err) {
            if (smSourcesError === null) {
                smSourcesError = err !== null && typeof err === 'object' ? err : { message: smSourcesErrorText(err) }
            }
            return false
        }
    }

    async function smSourcesPageLoad(force) {
        if (smSourcesLoading) return
        smSourcesLoading = true
        smSourcesError = null
        setState({ loading: true })
        await Promise.all([smSourcesReload(force), smInstalledReload(force)])
        smSourcesLoading = false
        setState({ loading: false })
    }

    function smEnsureSourcesData() {
        if (smSourcesBootScheduled) return
        const hasInstalled = appState.installed !== null && typeof appState.installed === 'object'
        const hasSources = Array.isArray(appState.sources) && appState.sources.length > 0
        if (hasInstalled && hasSources) return
        smSourcesBootScheduled = true
        setTimeout(function () {
            void smSourcesPageLoad(false)
        }, 0)
    }

    function smRetrySources() {
        smSourcesBootScheduled = true
        void smSourcesPageLoad(true)
    }

    function smSetSourceBusy(id, busy) {
        if (!id) return
        if (busy) smSourcesBusy[id] = true
        else delete smSourcesBusy[id]
        /* 传一个真实字段，确保 setState 一定触发重渲染。 */
        setState({ sources: smSourcesCurrent().slice() })
    }

    async function smRefreshOneSource(src) {
        if (src === null || typeof src !== 'object' || !src.id) return
        if (smSourcesBusy[src.id]) return
        smSetSourceBusy(src.id, true)
        try {
            await api('sources/' + encodeURIComponent(src.id) + '/refresh', { method: 'POST' })
            toast(t('toast.sourceRefreshed', { name: src.name || src.url || src.id }), { tone: 'ok' })
        } catch (err) {
            toast(t('toast.sourceRefreshFailed', { reason: smSourcesErrorText(err) }), { tone: 'error' })
        }
        await smSourcesReload()
        smMarketInvalidate()
        smSetSourceBusy(src.id, false)
    }

    async function smToggleSource(src) {
        if (src === null || typeof src !== 'object' || !src.id) return
        if (smSourcesBusy[src.id]) return
        smSetSourceBusy(src.id, true)
        const nextEnabled = src.enabled === false
        try {
            await api('/sources/' + encodeURIComponent(src.id), {
                method: 'PUT',
                body: { enabled: nextEnabled },
            })
            const message = nextEnabled
                ? t('toast.sourceEnabled', { name: src.name || src.url || src.id })
                : t('toast.sourceDisabled', { name: src.name || src.url || src.id })
            toast(message, { tone: 'ok' })
        } catch (err) {
            toast(t('toast.sourceToggleFailed', { reason: smSourcesErrorText(err) }), { tone: 'error' })
        }
        await smSourcesReload()
        smMarketInvalidate()
        smSetSourceBusy(src.id, false)
    }

    function smSourcesOpenFolder(path) {
        const value = typeof path === 'string' ? path : ''
        if (value === '') return
        /* 宿主没有提供“打开目录”路由；与 00-prelude 的 openFolder 行为保持一致。 */
        toast(t('toast.openedFolder', { path: value }), { tone: 'ok' })
    }

    async function smSourcesCopyPath(path) {
        const value = typeof path === 'string' ? path : ''
        if (value === '') return
        try {
            if (typeof navigator !== 'undefined' && navigator !== null &&
                navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(value)
                toast(t('toast.copied'), { tone: 'ok' })
                return
            }
            toast(t('toast.copyFailed'), { tone: 'error' })
        } catch (err) {
            toast(t('toast.copyFailed'), { tone: 'error' })
        }
    }

    function smStartSourceEdit(src) {
        if (src === null || typeof src !== 'object' || !src.id) return
        smSourcesEditing = src.id
        smSourcesEditName = typeof src.name === 'string' ? src.name : ''
        smSourcesEditUrl = typeof src.url === 'string' ? src.url : ''
        smSourcesEditError = ''
        smSourcesConfirmDelete = null
        setState({})
    }

    function smCancelSourceEdit() {
        smSourcesEditing = null
        smSourcesEditError = ''
        setState({})
    }

    function smOnSourceEditName(event) {
        smSourcesEditName = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || '')
            : ''
        setState({})
    }

    function smOnSourceEditUrl(event) {
        smSourcesEditUrl = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || '')
            : ''
        setState({})
    }

    async function smSaveSourceEdit(src) {
        if (smSourcesSaving || src === null || typeof src !== 'object' || !src.id) return
        const name = smSourcesEditName.trim()
        const url = smSourcesEditUrl.trim()
        if (url === '') {
            smSourcesEditError = t('form.urlRequired')
            setState({})
            return
        }
        smSourcesSaving = true
        smSourcesEditError = ''
        setState({})
        try {
            const body = { url: url }
            if (name !== '') body.name = name
            await api('/sources/' + encodeURIComponent(src.id), { method: 'PUT', body: body })
            smSourcesEditing = null
            toast(t('toast.saved'), { tone: 'ok' })
            await smSourcesReload(true)
            smMarketInvalidate()
        } catch (err) {
            smSourcesEditError = smSourcesErrorText(err)
        }
        smSourcesSaving = false
        setState({})
    }

    function smAskDeleteSource(src) {
        if (src === null || typeof src !== 'object' || !src.id) return
        smSourcesConfirmDelete = src.id
        smSourcesEditing = null
        setState({})
    }

    function smCancelDeleteSource() {
        smSourcesConfirmDelete = null
        setState({})
    }

    async function smDeleteSource(src) {
        if (smSourcesDeleting || src === null || typeof src !== 'object' || !src.id) return
        smSourcesDeleting = true
        setState({})
        try {
            await api('/sources/' + encodeURIComponent(src.id), { method: 'DELETE' })
            smSourcesConfirmDelete = null
            toast(t('toast.deleted', { name: src.name || src.url || src.id }), { tone: 'ok' })
            await smSourcesReload(true)
            smMarketInvalidate()
        } catch (err) {
            toast(t('source.deleteFailed', { reason: smSourcesErrorText(err) }), { tone: 'error' })
        }
        smSourcesDeleting = false
        setState({})
    }

    function smViewLocationSkills(loc) {
        if (loc === null || typeof loc !== 'object') return
        /* 已安装筛选按别名比较（10-installed.js:47），位置 id 必须先映射；
           未知位置回退到「全部」，避免筛选到空列表。 */
        const filter = locationFilterKey(loc.id) || 'all'
        setState({ tab: 'installed', view: 'list', detail: null, filter: filter, search: '' })
    }

    /* ------------------------------------------------------------------ *
     * 渲染：规则卡 / 位置卡 / 预设卡 / 市场源卡                            *
     * ------------------------------------------------------------------ */

    function smSourcesSectionHeader(title, extra) {
        return h('div', { className: 'sm-group-head sm-sources-section-header' },
            h('div', null, h('span', { className: 'sm-group-title' }, title)),
            extra !== null && extra !== undefined ? extra : null
        )
    }

    function smSourcesRetryButton() {
        return h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: smRetrySources,
        }, t('action.retry'))
    }

    function smPriorityCard() {
        return h('div', { key: 'priority', className: 'sm-card sm-priority-card' },
            h('div', { className: 'sm-card-title' }, t('sources.priorityTitle')),
            h('div', {
                className: 'sm-caption',
                style: { color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.55 },
            }, t('sources.priority')),
            h('div', {
                className: 'sm-caption',
                style: { color: 'var(--dsw-alias-label-caption)', lineHeight: 1.55 },
            }, t('sources.priorityDetail')),
            h('div', null,
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { openDiagnosticsDrawer() },
                }, t('sources.viewOverrides'))
            )
        )
    }

    function smLocationCard(loc) {
        const readable = loc.readable !== false
        const exists = loc.exists === true
        const dotClass = !readable ? 'sm-dot-error' : exists ? 'sm-dot-ok' : 'sm-dot-idle'
        const statusText = !readable ? t('status.unreadable') : exists ? t('status.readable') : t('status.missing')
        const pathText = typeof loc.path === 'string' && loc.path !== '' ? loc.path : (loc.absPath || '')
        const canOpen = exists && typeof loc.absPath === 'string' && loc.absPath !== ''
        const activeCount = typeof loc.skillCount === 'number' ? loc.skillCount : 0
        const disabledCount = typeof loc.disabledCount === 'number' ? loc.disabledCount : 0
        const actions = []

        if (pathText !== '' || (typeof loc.absPath === 'string' && loc.absPath !== '')) {
            actions.push(h('button', {
                key: 'path',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: function () {
                    if (canOpen) smSourcesOpenFolder(loc.absPath)
                    else void smSourcesCopyPath(loc.absPath || pathText)
                },
            }, canOpen ? t('action.openFolder') : t('action.copyPath')))
        }
        actions.push(h('button', {
            key: 'view',
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: function () { smViewLocationSkills(loc) },
        }, t('sources.viewSkills')))

        return h('div', {
            key: loc.id,
            className: 'sm-card sm-source-card',
            style: !exists ? { opacity: 0.72, borderStyle: 'dashed' } : undefined,
        },
            h('div', {
                className: 'sm-source-card-head',
                style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 },
            },
                h('span', { className: cx('sm-dot', dotClass), title: statusText }),
                h('span', { className: 'sm-card-title' }, loc.label || loc.id),
                h('span', { className: 'sm-badge sm-mono' }, 'rank ' + String(loc.rank)),
                h('span', { className: 'sm-badge' }, loc.layer === 'preset' ? t('layer.preset') : t('layer.global')),
                loc.writable ? null : h('span', { className: 'sm-badge' }, t('badge.readonly'))
            ),
            h('div', {
                className: 'sm-source-path sm-mono sm-caption sm-ellipsis',
                title: loc.absPath || pathText,
            }, pathText),
            !exists ? h('div', { className: 'sm-source-note sm-caption sm-muted' }, t('sources.missingDir')) : null,
            h('div', {
                className: 'sm-source-card-foot',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                },
            },
                h('span', { className: 'sm-source-count sm-caption sm-muted' },
                    t('sources.skillCount', { count: activeCount }),
                    disabledCount > 0 ? ' · ' + t('sources.disabledCount', { count: disabledCount }) : null
                ),
                h('div', {
                    className: 'sm-source-actions',
                    style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
                }, actions)
            )
        )
    }

    function smPresetCard(preset) {
        const mounted = preset.mounted === true
        let desc = ''
        if (preset.id === 'minimal' && !mounted) {
            desc = t('sources.minimalNoSkills')
        } else if (typeof preset.desc === 'string' && preset.desc !== '') {
            desc = preset.desc
        } else {
            desc = t('source.preset.fallbackDesc')
        }
        const stats = mounted
            ? t('source.preset.stats', {
                skills: typeof preset.presetSkills === 'number' ? preset.presetSkills : 0,
                roots: typeof preset.localRoots === 'number' ? preset.localRoots : 0,
            })
            : t('sources.minimalNoSkills')
        return h('div', {
            key: preset.id,
            className: 'sm-card sm-preset-card',
        },
            h('div', {
                className: 'sm-source-card-head',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                },
            },
                h('span', { className: 'sm-card-title sm-mono' }, preset.id),
                h('span', {
                    className: cx('sm-badge', mounted ? 'sm-success' : 'sm-warn'),
                }, mounted ? t('source.preset.mounted') : t('source.preset.unmounted'))
            ),
            h('div', {
                className: 'sm-caption',
                style: { color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.55 },
            }, desc),
            h('div', { className: 'sm-source-count sm-caption sm-muted' }, stats)
        )
    }

    function smPresetCards(presets) {
        const order = ['cordis', 'standard', 'ptc', 'minimal']
        const byId = Object.create(null)
        ;(Array.isArray(presets) ? presets : []).forEach(function (preset) {
            if (preset !== null && typeof preset === 'object' && typeof preset.id === 'string') {
                byId[preset.id] = preset
            }
        })
        return order.map(function (id) {
            return smPresetCard(byId[id] || {
                id: id,
                mounted: false,
                presetSkills: 0,
                localRoots: 0,
                desc: '',
            })
        })
    }

    function smMarketSourceCard(src) {
        const status = typeof src.status === 'string' ? src.status : 'ok'
        const dotClass = status === 'ok' ? 'sm-dot-ok' : status === 'checking' ? 'sm-dot-warn' : 'sm-dot-error'
        const enabled = src.enabled !== false
        const busy = status === 'checking' || smSourcesBusy[src.id] === true
        const checked = typeof src.lastCheckedAt === 'number' && src.lastCheckedAt > 0
            ? t('source.lastChecked', { time: fmtTime(src.lastCheckedAt) })
            : t('source.neverChecked')
        const errorText = typeof src.error === 'string'
            ? src.error
            : (src.error ? smSourcesErrorText(src.error) : '')
        const dotTitle = status === 'ok' ? t('source.enabled') : status === 'checking' ? t('state.loading') : t('state.loadFailed')
        const isEditing = smSourcesEditing === src.id
        const isConfirming = smSourcesConfirmDelete === src.id

        const head = h('div', {
            className: 'sm-source-card-head',
            style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 },
        },
            h('span', { className: cx('sm-dot', dotClass), title: dotTitle }),
            h('span', { className: 'sm-card-title' }, src.name || src.url || src.id),
            h('span', { className: 'sm-badge sm-mono' }, src.type === 'local' ? t('source.type.local') : t('source.type.index')),
            !enabled ? h('span', { className: 'sm-badge sm-warn' }, t('source.disabled')) : null,
            src.stale ? h('span', { className: 'sm-badge sm-warn' }, t('source.stale')) : null
        )

        if (isEditing) {
            return h('div', {
                key: src.id || src.url,
                className: 'sm-card sm-market-source-card',
            },
                head,
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    h('input', {
                        type: 'text',
                        className: 'sm-input',
                        value: smSourcesEditName,
                        placeholder: t('source.name'),
                        onChange: smOnSourceEditName,
                    }),
                    h('input', {
                        type: 'text',
                        className: 'sm-input sm-mono',
                        value: smSourcesEditUrl,
                        placeholder: t('source.url'),
                        onChange: smOnSourceEditUrl,
                    }),
                    smSourcesEditError !== ''
                        ? h('div', {
                            className: 'sm-caption',
                            style: { color: 'var(--dsw-alias-state-error-primary)' },
                        }, smSourcesEditError)
                        : null,
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' } },
                        h('button', {
                            type: 'button',
                            className: 'sm-btn sm-btn-ghost sm-btn-sm',
                            onClick: smCancelSourceEdit,
                        }, t('action.cancel')),
                        h('button', {
                            type: 'button',
                            className: 'sm-btn sm-btn-primary sm-btn-sm',
                            disabled: smSourcesSaving,
                            onClick: function () { void smSaveSourceEdit(src) },
                        }, smSourcesSaving ? t('state.loading') : t('action.save'))
                    )
                )
            )
        }

        if (isConfirming) {
            return h('div', {
                key: src.id || src.url,
                className: 'sm-card sm-market-source-card',
            },
                head,
                h('div', {
                    className: 'sm-banner sm-warn',
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                    },
                },
                    h('span', { className: 'sm-caption' }, t('source.deleteConfirm', {
                        name: src.name || src.url || src.id,
                    })),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                        h('button', {
                            type: 'button',
                            className: 'sm-btn sm-btn-ghost sm-btn-sm',
                            onClick: smCancelDeleteSource,
                        }, t('action.cancel')),
                        h('button', {
                            type: 'button',
                            className: 'sm-btn sm-btn-danger sm-btn-sm',
                            disabled: smSourcesDeleting,
                            onClick: function () { void smDeleteSource(src) },
                        }, smSourcesDeleting ? t('state.loading') : t('action.delete'))
                    )
                )
            )
        }

        return h('div', {
            key: src.id || src.url,
            className: 'sm-card sm-market-source-card',
        },
            head,
            h('div', {
                className: 'sm-source-path sm-mono sm-caption sm-ellipsis',
                title: src.url || '',
            }, src.url || ''),
            status === 'error' && errorText !== ''
                ? h('div', {
                    className: 'sm-source-error sm-caption',
                    style: {
                        color: 'var(--dsw-alias-state-error-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0,
                    },
                }, icon('alert', 14), h('span', { className: 'sm-ellipsis' }, errorText))
                : null,
            h('div', {
                className: 'sm-source-card-foot',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                },
            },
                h('span', { className: 'sm-source-count sm-caption sm-muted' },
                    t('source.skillCount', { count: typeof src.skillCount === 'number' ? src.skillCount : 0 }),
                    ' · ',
                    checked
                ),
                h('div', {
                    className: 'sm-source-actions',
                    style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
                },
                    h('button', {
                        key: 'refresh',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        disabled: busy,
                        onClick: function () { void smRefreshOneSource(src) },
                    }, t('action.refresh')),
                    h('button', {
                        key: 'edit',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        onClick: function () { smStartSourceEdit(src) },
                    }, t('action.edit')),
                    h('button', {
                        key: 'toggle',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        disabled: busy,
                        onClick: function () { void smToggleSource(src) },
                    }, enabled ? t('source.disable') : t('source.enable')),
                    h('button', {
                        key: 'delete',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm sm-btn-danger',
                        onClick: function () { smAskDeleteSource(src) },
                    }, t('source.delete'))
                )
            )
        )
    }

    function smSourcesSkeletonGrid(count) {
        const cards = []
        for (let i = 0; i < count; i += 1) {
            cards.push(h('div', { key: 'sk-' + i, className: 'sm-card' },
                h('div', { className: 'sm-skeleton', style: { maxWidth: '160px' } }),
                h('div', { className: 'sm-skeleton', style: { maxWidth: '260px', minHeight: '12px' } }),
                h('div', { className: 'sm-skeleton', style: { maxWidth: '120px', minHeight: '12px' } })
            ))
        }
        return h('div', { className: 'sm-sources-grid', style: SM_SOURCES_GRID_STYLE }, cards)
    }

    function smSourcesStateCard(title, body, action) {
        return h('div', { className: 'sm-card sm-empty' },
            h('div', { className: 'sm-card-title' }, title),
            body !== null && body !== undefined && body !== ''
                ? h('div', { className: 'sm-caption sm-muted' }, body)
                : null,
            action !== null && action !== undefined
                ? h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } }, action)
                : null
        )
    }

    function smSourcesErrorBanner(error) {
        const detail = smSourcesErrorText(error)
        return h('div', { key: 'error-banner', className: 'sm-banner sm-error', role: 'alert' },
            icon('alert', 16),
            h('span', {
                className: 'sm-banner-text',
                style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 },
            },
                t('error.loadSources'),
                detail !== '' ? h('span', { className: 'sm-caption sm-muted' }, detail) : null
            ),
            h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smRetrySources,
            }, t('action.retry'))
        )
    }

    /* ------------------------------------------------------------------ *
     * 来源 Tab 入口                                                       *
     * ------------------------------------------------------------------ */

    function renderSourcesTab() {
        smEnsureSourcesData()

        const installed = appState.installed !== null && typeof appState.installed === 'object'
            ? appState.installed
            : null
        const locations = installed !== null && Array.isArray(installed.locations) ? installed.locations : null
        const presets = installed !== null && Array.isArray(installed.presets) ? installed.presets : null
        const sources = smSourcesCurrent()
        const fallbackError = installed === null &&
            appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'installed'
            ? appState.error
            : null
        const error = smSourcesError !== null ? smSourcesError : fallbackError
        const hasError = error !== null && error !== undefined
        const pending = installed === null && !hasError
        const sections = []

        if (hasError && (installed !== null || sources.length > 0)) {
            sections.push(smSourcesErrorBanner(error))
        }
        sections.push(smPriorityCard())

        let locationsBody = null
        if (locations !== null) {
            locationsBody = locations.length > 0
                ? h('div', { className: 'sm-sources-grid', style: SM_SOURCES_GRID_STYLE }, locations.map(function (loc) {
                    return smLocationCard(loc)
                }))
                : smSourcesStateCard(t('sources.noLocations'), '', smSourcesRetryButton())
        } else if (pending) {
            locationsBody = smSourcesSkeletonGrid(3)
        } else {
            locationsBody = smSourcesStateCard(
                t('sources.noLocations'),
                hasError ? smSourcesErrorText(error) : t('error.loadInstalled'),
                smSourcesRetryButton()
            )
        }
        sections.push(h('section', { key: 'locations', className: 'sm-group sm-sources-section' },
            smSourcesSectionHeader(t('sources.locationsTitle')),
            locationsBody
        ))

        let presetsBody = null
        if (presets !== null) {
            presetsBody = h('div', { className: 'sm-sources-grid sm-presets-grid', style: SM_SOURCES_GRID_STYLE }, smPresetCards(presets))
        } else if (pending) {
            presetsBody = smSourcesSkeletonGrid(4)
        } else {
            presetsBody = smSourcesStateCard(
                t('sources.noPresets'),
                hasError ? smSourcesErrorText(error) : t('error.loadInstalled'),
                smSourcesRetryButton()
            )
        }
        sections.push(h('section', { key: 'presets', className: 'sm-group sm-sources-section' },
            smSourcesSectionHeader(t('sources.presetsTitle'),
                h('span', { className: 'sm-sources-hint' }, t('sources.presetNote'))),
            presetsBody
        ))

        let sourcesBody = null
        if (sources.length > 0) {
            sourcesBody = h('div', { className: 'sm-sources-grid', style: SM_SOURCES_GRID_STYLE }, sources.map(function (src) {
                return smMarketSourceCard(src)
            }))
        } else if (pending || (smSourcesLoading && !hasError)) {
            sourcesBody = smSourcesSkeletonGrid(3)
        } else if (hasError) {
            sourcesBody = smSourcesStateCard(
                t('source.error.fetch'),
                smSourcesErrorText(error),
                smSourcesRetryButton()
            )
        } else {
            sourcesBody = smSourcesStateCard(t('source.empty'), t('empty.market.noSourceBody'),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary sm-btn-sm',
                    onClick: function () { openModal('add-source') },
                }, t('action.addSource'))
            )
        }
        sections.push(h('section', { key: 'sources', className: 'sm-group sm-sources-section' },
            smSourcesSectionHeader(t('sources.marketTitle'),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { openModal('add-source') },
                }, icon('plus', 14), t('action.addSource'))),
            sourcesBody
        ))

        return h('div', { className: 'sm-page sm-sources-page' }, sections)
    }
