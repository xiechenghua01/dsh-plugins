    /* ------------------------------------------------------------------ *
     * C2 · 市场 Tab                                                       *
     *                                                                    *
     * 数据来源：appState.marketSkills / appState.sources / appState.installed
     * 所有跨 Tab 的状态写入都走 setState，避免直接操作 DOM。               *
     * ------------------------------------------------------------------ */

    const SM_MARKET_PAGE_SIZE = 20

    /* 市场请求的瞬时状态（不承载数据）。搜索词、筛选、分页游标与列表全部以
       appState.search / appState.market* 为唯一事实源。 */
    let smMarketLoaded = false
    let smMarketLoading = false
    let smMarketAppending = false
    let smMarketTimer = null
    let smMarketTimerSig = ''
    let smMarketLastSig = ''

    function smMarketErrorText(err) {
        if (err === null || err === undefined) return ''
        if (typeof err === 'string') return err
        if (typeof err === 'object') {
            if (typeof err.message === 'string' && err.message !== '') return err.message
            if (typeof err.code === 'string' && err.code !== '') return err.code
        }
        return String(err)
    }

    function smMarketSig() {
        /* 来源增删改由 smMarketInvalidate 显式失效，不把 sources 计入 sig，
           避免首次加载 sources 后多发一次请求。签名算法与 00-prelude 的
           marketQuerySignature 完全一致，供 requestId 校验与去重复用。 */
        return marketQuerySignature({
            sourceId: appState.marketSourceId,
            q: appState.search,
            tag: appState.marketTag,
            sort: appState.marketSort,
        })
    }

    function smMarketSourceList() {
        /* appState.sources 是唯一事实源；即使为空也不回退旧缓存。 */
        return Array.isArray(appState.sources) ? appState.sources : []
    }

    function smMarketEnabledSources(sources) {
        return (Array.isArray(sources) ? sources : []).filter(function (src) {
            return src !== null && typeof src === 'object' && src.enabled !== false
        })
    }

    function smMarketTotalValue(enabledSources) {
        if (typeof appState.marketTotal === 'number' && appState.marketTotal > 0) return appState.marketTotal
        let sum = 0
        let hasCount = false
        ;(Array.isArray(enabledSources) ? enabledSources : []).forEach(function (src) {
            if (src !== null && typeof src === 'object' && typeof src.skillCount === 'number') {
                sum += src.skillCount
                hasCount = true
            }
        })
        if (hasCount && sum > 0) return sum
        return smMarketSharedSkills().length
    }

    function smMarketNextValue() {
        return typeof appState.marketNextOffset === 'number' ? appState.marketNextOffset : null
    }

    /* 共享缓存 appState.marketSkills 是唯一事实源：顶栏搜索/刷新（00-prelude.js）
       与市场分页都读写同一份列表。 */
    function smMarketSharedSkills() {
        return Array.isArray(appState.marketSkills) ? appState.marketSkills : []
    }

    function smMarketCurrentSkills() {
        /* 服务端已按 q/sourceId/tag/sort 过滤并排序，渲染直接用共享列表，
           避免第二套本地过滤与分页结果不一致。 */
        return smMarketSharedSkills()
    }

    function smMarketTopTags(skills) {
        const counts = Object.create(null)
        ;(Array.isArray(skills) ? skills : []).forEach(function (item) {
            if (item === null || typeof item !== 'object' || !Array.isArray(item.tags)) return
            item.tags.forEach(function (tag) {
                if (typeof tag === 'string' && tag !== '') counts[tag] = (counts[tag] || 0) + 1
            })
        })
        const tags = Object.keys(counts).sort(function (a, b) {
            return (counts[b] - counts[a]) || a.localeCompare(b)
        })
        const selected = appState.marketTag
        if (selected !== 'all' && tags.indexOf(selected) < 0) tags.unshift(selected)
        return tags.slice(0, 12)
    }

    function smMarketInstalledInfo(item) {
        if (item === null || typeof item !== 'object') return null
        /* 优先读已安装列表（安装/更新后 C3 会刷新它），再退回市场条目自带的状态。
           同名但来源不同的安装记录绝不能关联到本条目；只有安装记录缺 sourceId
           时才按 name 回退。 */
        const installed = appState.installed !== null && typeof appState.installed === 'object' &&
            Array.isArray(appState.installed.skills) ? appState.installed.skills : []
        let exact = null
        let fallback = null
        for (let i = 0; i < installed.length; i += 1) {
            const skill = installed[i]
            if (skill === null || typeof skill !== 'object') continue
            if (skill.name !== item.name) continue
            if (skill.status === 'disabled') continue
            const recordSource = skill.market !== null && typeof skill.market === 'object' &&
                typeof skill.market.sourceId === 'string' ? skill.market.sourceId : ''
            if (recordSource !== '') {
                if (recordSource === item.sourceId) {
                    exact = skill
                    break
                }
                continue
            }
            if (fallback === null) fallback = skill
        }
        const found = exact !== null ? exact : fallback
        if (found !== null) {
            const market = found.market !== null && typeof found.market === 'object' ? found.market : {}
            return {
                version: typeof market.version === 'string' ? market.version : '',
                location: found.location,
                /* 最新检查结果优先：checkedAt>0 且无条目时必须为空，不能回退旧字段。 */
                updateAvailable: skillUpdateVersion(found),
            }
        }
        if (item.installed !== null && typeof item.installed === 'object') {
            const embedded = {
                name: item.name,
                location: item.installed.location,
                market: { updateAvailable: item.installed.updateAvailable },
            }
            return {
                version: typeof item.installed.version === 'string' ? item.installed.version : (item.version || ''),
                location: item.installed.location,
                updateAvailable: skillUpdateVersion(embedded),
            }
        }
        return null
    }

    /* 与 00-prelude.js 的 skillIconName 保持一致，确保同一技能在市场与已安装里图标相同。 */
    function smMarketIconName(item, info) {
        const text = String(item !== null && typeof item === 'object' && item.name ? item.name : '').toLowerCase()
        if (text.includes('review') || text.includes('audit') || text.includes('security')) return 'shield'
        if (text.includes('sql') || text.includes('database') || text.includes('query') ||
            text.includes('postgres') || text.includes('clickhouse')) return 'database'
        if (text.includes('git') || text.includes('commit') || text.includes('pull-request')) return 'git'
        if (text.includes('pdf') || text.includes('doc') || text.includes('markdown')) return 'file'
        if (text.includes('image') || text.includes('design') || text.includes('frontend')) return 'image'
        if (text.includes('script') || text.includes('python') || text.includes('bash')) return 'script'
        if (text.includes('plugin') || text.includes('arch') || text.includes('cordis')) return 'puzzle'
        if (text.includes('creator') || text.includes('skill')) return 'skill'
        const loc = info !== null && info !== undefined && typeof info === 'object' ? info.location : ''
        if (loc === 'preset' || loc === 'bundled') return 'package'
        return 'folder'
    }

    function smMarketUpgradeGlyph() {
        return h('svg', {
            width: 13,
            height: 13,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.8,
            'aria-hidden': 'true',
            focusable: 'false',
        },
            h('circle', { cx: 12, cy: 12, r: 9 }),
            h('path', {
                d: 'M8.5 11.5L12 8m0 0l3.5 3.5M12 8v8',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
            })
        )
    }

    /* 所有共享状态的写入（替换 / 追加 / 错误 / 加载态）都由 00-prelude 的
       loadMarket 在 requestId + 查询签名校验之后完成；这里只负责发起请求与
       维护按钮级瞬时状态。 */
    async function smFetchMarket(options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const append = opts.append === true
        if (smMarketLoading) return
        const sig = smMarketSig()
        const offset = append ? smMarketNextValue() : 0
        if (append && offset === null) return
        smMarketLoading = true
        smMarketAppending = append
        /* 先登记本次 sig，避免渲染调度在请求期间重复补发。失败时同样保留，
           由错误条提供显式重试，而不是自动循环重试。 */
        smMarketLastSig = sig
        setState({})
        try {
            const result = await loadMarket({
                sourceId: appState.marketSourceId,
                q: String(appState.search || ''),
                tag: appState.marketTag,
                sort: appState.marketSort,
                offset: offset,
                limit: SM_MARKET_PAGE_SIZE,
                refresh: opts.refresh === true,
            })
            if (result !== null && result !== undefined && smMarketSig() === sig) smMarketLoaded = true
        } finally {
            smMarketLoading = false
            smMarketAppending = false
            rerender()
        }
    }

    /* 去抖调度：顶栏搜索/清空由 00-prelude 直接发请求。共享的
       marketRequestIsFresh 记录「在途 / 最近 300ms 内成功」的查询签名，
       签名相同就跳过，避免同一次查询发两遍。 */
    function smScheduleMarketLoad() {
        const sig = smMarketSig()
        if (smMarketLastSig === sig) return
        if (marketRequestIsFresh(sig)) {
            /* 外部请求已覆盖当前查询，采纳其结果，不再补发。 */
            smMarketLastSig = sig
            return
        }
        if (smMarketTimer !== null && smMarketTimerSig === sig) return
        if (smMarketTimer !== null) clearTimeout(smMarketTimer)
        smMarketTimerSig = sig
        smMarketTimer = setTimeout(function () {
            smMarketTimer = null
            smMarketTimerSig = ''
            if (smMarketSig() !== sig) return
            if (smMarketLoading) return
            if (smMarketLastSig === sig) return
            if (marketRequestIsFresh(sig)) {
                smMarketLastSig = sig
                return
            }
            void smFetchMarket({ append: false })
        }, 300)
    }

    function smMarketOpenSources() {
        setState({ tab: 'sources', view: 'list', detail: null })
        try {
            const pending = loadSources()
            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                pending.catch(function () { /* 来源页会展示错误态 */ })
            }
        } catch (err) {
            void err
        }
    }

    function smMarketCancelPending() {
        if (smMarketTimer !== null) {
            clearTimeout(smMarketTimer)
            smMarketTimer = null
        }
        smMarketTimerSig = ''
    }

    function smMarketChangeSource(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || 'all')
            : 'all'
        if (value === appState.marketSourceId) return
        smMarketCancelPending()
        smMarketLastSig = ''
        setState({ marketSourceId: value })
        void smFetchMarket({ append: false })
    }

    function smMarketChangeTag(tag) {
        if (tag === appState.marketTag) return
        smMarketCancelPending()
        smMarketLastSig = ''
        setState({ marketTag: tag })
        void smFetchMarket({ append: false })
    }

    function smMarketChangeSort(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || 'relevance')
            : 'relevance'
        if (value === appState.marketSort) return
        smMarketCancelPending()
        smMarketLastSig = ''
        setState({ marketSort: value })
        void smFetchMarket({ append: false })
    }

    function smMarketOnSearchInput(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || '')
            : ''
        if (value === appState.search) return
        /* 顶栏与市场内搜索共用 appState.search；请求统一由
           smScheduleMarketLoad 去抖，避免两套搜索词。 */
        smMarketLastSig = ''
        setState({ search: value })
    }

    function smMarketClearFilters() {
        smMarketCancelPending()
        smMarketLastSig = ''
        setState({ search: '', marketTag: 'all' })
        /* 清空搜索必须重新请求第 1 页（不能只清本地输入）。 */
        void smFetchMarket({ append: false })
    }

    function smMarketRetry() {
        smMarketCancelPending()
        smMarketLastSig = ''
        void smFetchMarket({ append: false, refresh: true })
    }

    /** 供来源 Tab 在源增删改/启停后让市场列表失效并重新读取。 */
    function smMarketInvalidate() {
        smMarketCancelPending()
        smMarketLastSig = ''
        smScheduleMarketLoad()
    }

    function smMarketLoadMore() {
        if (smMarketNextValue() === null) return
        void smFetchMarket({ append: true })
    }

    function smMarketOpenDetail(item) {
        if (item === null || typeof item !== 'object') return
        /* 键盘 Enter/Space 不会触发 renderPage 的 onClickCapture，需显式记录滚动位置。 */
        if (typeof rememberListScroll === 'function') rememberListScroll()
        setState({
            view: 'detail',
            detail: { kind: 'market', id: item.id, sourceId: item.sourceId, name: item.name },
        })
    }

    function smMarketInstall(item) {
        openModal('install', { sourceId: item.sourceId, name: item.name, version: item.version })
    }

    function smMarketUpdate(item, info) {
        openModal('update', {
            sourceId: item.sourceId,
            name: item.name,
            version: info.updateAvailable,
            currentVersion: info.version,
            /* 50-modals.js 的 SmUpdateModal 读取 available/current，这里同时给出。 */
            available: info.updateAvailable,
            current: info.version,
            location: info.location,
        })
    }

    /* ------------------------------------------------------------------ *
     * 渲染：工具栏 / 行 / 空态 / 骨架                                      *
     * ------------------------------------------------------------------ */

    function smMarketControls(sources, enabledSources, tags, total) {
        const optionSources = enabledSources.slice()
        if (appState.marketSourceId !== 'all') {
            let hasSelected = false
            for (let i = 0; i < optionSources.length; i += 1) {
                if (optionSources[i].id === appState.marketSourceId) {
                    hasSelected = true
                    break
                }
            }
            if (!hasSelected) {
                for (let j = 0; j < sources.length; j += 1) {
                    if (sources[j] !== null && typeof sources[j] === 'object' && sources[j].id === appState.marketSourceId) {
                        optionSources.push(sources[j])
                        break
                    }
                }
            }
        }

        const sourceOptions = [
            h('option', { key: 'all', value: 'all' }, t('market.allSources', {
                count: enabledSources.length,
                total: total,
            })),
        ]
        optionSources.forEach(function (src) {
            const dot = src.status === 'ok' ? '●' : src.status === 'checking' ? '◐' : '○'
            const count = typeof src.skillCount === 'number' ? ' (' + src.skillCount + ')' : ''
            const disabled = src.enabled === false ? ' · ' + t('source.disabled') : ''
            sourceOptions.push(h('option', {
                key: src.id || src.url || src.name,
                value: src.id || src.url || src.name,
            }, dot + ' ' + (src.name || src.url || '') + count + disabled))
        })

        const chips = [
            h('button', {
                key: 'all',
                type: 'button',
                className: cx('sm-chip', appState.marketTag === 'all' && 'sm-active'),
                'aria-pressed': appState.marketTag === 'all',
                onClick: function () { smMarketChangeTag('all') },
            }, t('filter.all')),
        ]
        tags.forEach(function (tag) {
            chips.push(h('button', {
                key: tag,
                type: 'button',
                className: cx('sm-chip', appState.marketTag === tag && 'sm-active'),
                'aria-pressed': appState.marketTag === tag,
                onClick: function () { smMarketChangeTag(tag) },
            }, tag))
        })

        return h('div', {
            key: 'controls',
            className: 'sm-market-controls',
            style: { display: 'flex', flexDirection: 'column', gap: '10px' },
        },
            h('div', {
                className: 'sm-market-controls-row',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                },
            },
                h('div', {
                    className: 'sm-market-source-control',
                    style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' },
                },
                    h('span', { className: 'sm-label' }, t('market.sourceLabel')),
                    h('select', {
                        className: 'sm-select sm-market-source-select',
                        value: appState.marketSourceId,
                        'aria-label': t('market.sourceLabel'),
                        onChange: smMarketChangeSource,
                    }, sourceOptions),
                    h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        onClick: smMarketOpenSources,
                    }, t('market.manageSources'))
                ),
                h('div', {
                    className: 'sm-market-tools',
                    style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
                },
                    h('div', { className: 'sm-search sm-market-search' },
                        icon('search', 14),
                        h('input', {
                            type: 'search',
                            value: appState.search,
                            placeholder: t('search.market'),
                            'aria-label': t('search.market'),
                            spellCheck: false,
                            onChange: smMarketOnSearchInput,
                        })
                    ),
                    h('span', { className: 'sm-label' }, t('sort.label')),
                    h('select', {
                        className: 'sm-select sm-market-sort',
                        value: appState.marketSort,
                        'aria-label': t('sort.label'),
                        onChange: smMarketChangeSort,
                    },
                        h('option', { value: 'relevance' }, t('market.sortRecommended')),
                        h('option', { value: 'published' }, t('market.sortUpdated')),
                        h('option', { value: 'name' }, t('sort.name'))
                    )
                )
            ),
            h('div', { className: 'sm-chips sm-market-chips' }, chips)
        )
    }

    function smMarketRow(item) {
        const info = smMarketInstalledInfo(item)
        const hasUpdate = !!(info !== null && info.updateAvailable)
        const dotClass = hasUpdate ? 'sm-dot-update' : info !== null ? 'sm-dot-ok' : 'sm-dot-idle'
        const dotTitle = hasUpdate ? t('market.dot.update') : info !== null ? t('market.dot.installed') : t('market.dot.notInstalled')
        const tagNodes = []

        if (hasUpdate) {
            tagNodes.push(h('span', {
                key: 'update',
                className: 'sm-badge sm-badge-update',
                title: t('badge.updateTip', { version: 'v' + info.updateAvailable }),
            }, smMarketUpgradeGlyph(), h('span', null, 'v' + info.updateAvailable)))
        }
        const maxTags = hasUpdate ? 3 : 4
        const itemTags = Array.isArray(item.tags) ? item.tags : []
        itemTags.slice(0, maxTags).forEach(function (tag) {
            tagNodes.push(h('span', { key: 'tag-' + tag, className: 'sm-badge' }, tag))
        })

        let byline = ''
        if (item.author && item.sourceName) byline = t('market.by', { author: item.author, source: item.sourceName })

        let action = null
        if (info === null) {
            action = h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function (event) {
                    if (event && event.stopPropagation) event.stopPropagation()
                    smMarketInstall(item)
                },
            }, t('action.install'))
        } else if (hasUpdate) {
            action = h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function (event) {
                    if (event && event.stopPropagation) event.stopPropagation()
                    smMarketUpdate(item, info)
                },
            }, t('action.update'))
        } else {
            /* v2.3：行尾只保留唯一按钮；已安装且最新时用弱化按钮，点击不安装，切到已安装页。 */
            action = h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm sm-market-installed',
                onClick: function (event) {
                    if (event && event.stopPropagation) event.stopPropagation()
                    setState({
                        tab: 'installed',
                        view: 'list',
                        detail: null,
                        filter: 'all',
                        search: typeof item.name === 'string' ? item.name : '',
                    })
                },
            }, t('market.installedState'))
        }

        const key = item.id || String(item.sourceId || '') + '/' + String(item.name || '')
        return h('div', {
            key: key,
            className: 'sm-row sm-row-market',
            role: 'button',
            tabIndex: 0,
            onClick: function () { smMarketOpenDetail(item) },
            onKeyDown: function (event) {
                if (event && (event.key === 'Enter' || event.key === ' ')) {
                    if (event.preventDefault) event.preventDefault()
                    smMarketOpenDetail(item)
                }
            },
        },
            h('div', { className: 'sm-row-main' },
                h('div', { className: 'sm-row-icon' },
                    icon(smMarketIconName(item, info), 24),
                    h('span', { className: cx('sm-dot', dotClass), title: dotTitle })
                ),
                h('div', {
                    className: 'sm-row-text',
                    style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
                },
                    h('div', {
                        className: 'sm-row-title',
                        style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' },
                    },
                        h('span', { className: 'sm-row-name sm-mono' }, item.name),
                        h('span', { className: 'sm-row-version sm-mono' }, 'v' + String(item.version || '')),
                        tagNodes.length > 0 ? h('div', { className: 'sm-row-badges' }, tagNodes) : null,
                        byline !== '' ? h('span', { className: 'sm-row-by sm-caption sm-ellipsis' }, byline) : null
                    ),
                    h('div', { className: 'sm-row-desc', title: item.description || '' }, item.description || '')
                )
            ),
            h('div', { className: 'sm-row-tail' }, action)
        )
    }

    function smMarketSkeleton() {
        const rows = []
        for (let i = 0; i < 6; i += 1) {
            rows.push(h('div', { key: 'sk-' + i, className: 'sm-row sm-row-market' },
                h('div', { className: 'sm-row-main' },
                    h('div', { className: 'sm-row-icon' },
                        h('span', { className: 'sm-skeleton', style: { width: '24px', height: '24px' } })
                    ),
                    h('div', {
                        className: 'sm-row-text',
                        style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
                    },
                        h('div', { className: 'sm-skeleton', style: { maxWidth: '220px' } }),
                        h('div', { className: 'sm-skeleton', style: { maxWidth: '420px', minHeight: '12px' } })
                    )
                )
            ))
        }
        return h('div', { key: 'skeleton', className: 'sm-market-list sm-stack', 'aria-busy': 'true' },
            h('div', { className: 'sm-caption sm-muted', style: { padding: '4px 8px' } }, t('market.loading')),
            rows
        )
    }

    function smMarketEmptyBlock(iconName, title, body, actions, keyName) {
        return h('div', { key: keyName || 'empty', className: 'sm-empty sm-market-empty' },
            h('div', { className: 'sm-empty-icon' }, icon(iconName, 40)),
            h('div', { className: 'sm-empty-title sm-card-title' }, title),
            body ? h('div', { className: 'sm-empty-body sm-desc' }, body) : null,
            actions && actions.length > 0
                ? h('div', {
                    className: 'sm-empty-actions',
                    style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
                }, actions)
                : null
        )
    }

    function smMarketNoSourceState(hasAnySource) {
        const title = hasAnySource ? t('empty.market.noEnabledSource') : t('source.empty')
        const body = hasAnySource ? t('empty.market.noEnabledSourceBody') : t('empty.market.noSourceBody')
        const actions = [
            h('button', {
                key: 'add',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function () { openModal('add-source') },
            }, t('action.addSource')),
        ]
        if (hasAnySource) {
            actions.push(h('button', {
                key: 'manage',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketOpenSources,
            }, t('market.manageSources')))
        }
        return smMarketEmptyBlock('sources', title, body, actions, 'no-source')
    }

    function smMarketNoSkillsState() {
        const search = String(appState.search || '')
        const hasQuery = search !== '' || appState.marketTag !== 'all'
        if (hasQuery) {
            return smMarketEmptyBlock('search', t('empty.search', {
                query: search || appState.marketTag,
            }), '', [
                h('button', {
                    key: 'clear',
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: smMarketClearFilters,
                }, t('action.clearSearch')),
            ], 'no-match')
        }
        return smMarketEmptyBlock('market', t('market.empty'), '', [
            h('button', {
                key: 'refresh',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketRetry,
            }, t('action.refresh')),
        ], 'no-skills')
    }

    function smMarketErrorState(error) {
        const detail = smMarketErrorText(error)
        return smMarketEmptyBlock('alert', t('error.loadMarket'), detail || t('source.error.fetch'), [
            h('button', {
                key: 'retry',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: smMarketRetry,
            }, t('action.retry')),
            h('button', {
                key: 'sources',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketOpenSources,
            }, t('market.manageSources')),
        ], 'error')
    }

    function smMarketErrorBanner(error) {
        const detail = smMarketErrorText(error)
        return h('div', { key: 'error-banner', className: 'sm-banner sm-error', role: 'alert' },
            icon('alert', 16),
            h('span', {
                className: 'sm-banner-text',
                style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 },
            },
                t('market.offline'),
                h('span', { className: 'sm-badge sm-warn' }, t('source.stale')),
                detail !== '' ? h('span', { className: 'sm-banner-detail sm-caption sm-muted' }, detail) : null
            ),
            h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketRetry,
            }, t('action.retry'))
        )
    }

    function smMarketList(skills) {
        return h('div', { key: 'list', className: 'sm-market-list sm-stack' }, skills.map(function (item) {
            return smMarketRow(item)
        }))
    }

    /* ------------------------------------------------------------------ *
     * 市场 Tab 入口                                                       *
     * ------------------------------------------------------------------ */

    function renderMarketTab() {
        smScheduleMarketLoad()

        const sources = smMarketSourceList()
        const enabledSources = smMarketEnabledSources(sources)
        const skills = smMarketCurrentSkills()
        const tagSource = smMarketSharedSkills()
        const tags = smMarketTopTags(tagSource)
        const total = smMarketTotalValue(enabledSources)
        const nextOffset = smMarketNextValue()
        /* 顶栏与市场内请求共用 appState.marketLoading / appState.error。 */
        const marketError = appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'market'
            ? appState.error
            : null
        const sourceIssue = enabledSources.find(function (src) {
            return src.stale === true || src.status === 'error'
        })
        const failure = marketError !== null
            ? marketError
            : (sourceIssue !== undefined
                ? { message: typeof sourceIssue.error === 'string' ? sourceIssue.error : '' }
                : null)
        const hasFailure = failure !== null
        /* 清空/切换搜索会先清空列表并把 appState.marketLoading 置 true；此时
           即使此前已加载过（smMarketLoaded），也必须优先显示骨架，等请求落定
           后再走空态。列表非空（例如加载更多）时不打断已有内容。 */
        const pending = !hasFailure && skills.length === 0 &&
            (appState.marketLoading === true ||
                (!smMarketLoaded && (smMarketLoading || appState.installed === null)))

        const nodes = []
        if (hasFailure && skills.length > 0) nodes.push(smMarketErrorBanner(failure))
        if (sources.length > 0) nodes.push(smMarketControls(sources, enabledSources, tags, total))

        if (pending) {
            nodes.push(smMarketSkeleton())
        } else if (sources.length === 0) {
            nodes.push(smMarketNoSourceState(false))
        } else if (enabledSources.length === 0) {
            nodes.push(smMarketNoSourceState(true))
        } else if (hasFailure && skills.length === 0) {
            nodes.push(smMarketErrorState(failure))
        } else if (skills.length === 0) {
            nodes.push(smMarketNoSkillsState())
        } else {
            nodes.push(smMarketList(skills))
            if (nextOffset !== null && nextOffset !== undefined) {
                nodes.push(h('div', {
                    key: 'more',
                    className: 'sm-market-more',
                    style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' },
                },
                    h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        disabled: smMarketAppending,
                        onClick: smMarketLoadMore,
                    }, smMarketAppending ? t('state.loading') : t('market.loadMore'))
                ))
            }
        }

        return h('div', { className: 'sm-page sm-market' }, nodes)
    }
