    /* 由原 20-market.js 行 534-1009 拆出。 */
    function renderMarketCard(item) {
        if (item === null || typeof item !== 'object') return null
        const update = smMarketCardUpdate(item)
        const installed = smMarketCardInstalled(item)
        const dotClass = update !== '' ? 'sm-dot-update' : installed ? 'sm-dot-ok' : 'sm-dot-idle'
        const dotTip = update !== ''
            ? t('market.updateTo', { version: smMarketVersionLabel(update) })
            : installed
                ? t('market.installed')
                : t('action.install')
        const version = smMarketVersionLabel(item.version)
        const tags = []
        if (update !== '') {
            tags.push(h('span', {
                key: 'update',
                className: 'sm-badge sm-badge-update sm-mono',
                'data-tip': t('badge.updateTip', { version: smMarketVersionLabel(update) }),
            }, smMarketUpgradeGlyph(), h('span', null, smMarketVersionLabel(update))))
        }
        /* The version used to sit in the title row and stole width from the
         * Chinese display name. It now belongs to the badge row below the
         * description, next to the tags (user instruction). */
        if (version !== '') {
            tags.push(h('span', { key: 'version', className: 'sm-badge sm-mono' }, version))
        }
        const maxTags = update !== '' ? 3 : 4
        const itemTags = Array.isArray(item.tags) ? item.tags : []
        itemTags.slice(0, maxTags).forEach(function (tag) {
            if (typeof tag !== 'string' || tag === '') return
            tags.push(h('span', { key: 'tag-' + tag, className: 'sm-badge' }, tag))
        })
        /* Market items localize through `titleByLocale` / `descriptionByLocale`;
         * the technical name is still what install / update calls use. */
        const technicalName = String(item.name === undefined || item.name === null ? '' : item.name)
        const displayName = smSkillDisplayName(item) || technicalName
        const description = smSkillDisplayDescription(item)
        const openDetail = function () { smMarketOpenDetail(item) }

        return h('div', {
            key: smMarketCardKey(item),
            className: 'sm-card-item sm-market-card',
            role: 'button',
            tabIndex: 0,
            'data-market-key': smMarketCardKey(item),
            onClick: openDetail,
            onKeyDown: function (event) {
                if (event === null || event === undefined) return
                /* 卡片内的 ⋯ / 主按钮是独立停靠点，不能触发整卡进入详情。 */
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                    openDetail()
                }
            },
        },
        /* Same icon box as the skills page: one helper, no duplicated markup. */
        renderSkillIconBox(item, { iconSize: 24, fallback: smMarketIconName(item) }),
        /* Title row, description and badge row come from one shared helper;
         * the version badge and tags sit on the badge row, not in the title. */
        renderCardMain({
            dot: renderStatusDot(cx('sm-dot', dotClass), dotTip),
            displayName: displayName,
            technicalName: technicalName,
            description: description,
            badges: tags,
        }),
        h('div', {
            className: 'sm-card-tail',
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
            },
        },
        smMarketCardPrimary(item)))
    }

    /* ------------------------------------------------------------------ *
     * 源区块                                                              *
     * ------------------------------------------------------------------ */

    function smMarketLoadMore(block) {
        if (block === null || typeof block !== 'object') return
        const sourceId = String(block.sourceId || '')
        const cursor = typeof block.cursor === 'string' && block.cursor !== '' ? block.cursor : null
        if (sourceId === '' || cursor === null) return
        if (smMarketAppending[sourceId] === true) return
        smMarketAppending[sourceId] = true
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                if (typeof loadMarket !== 'function') return
                /* 00-prelude 的 loadMarket 负责按 sourceId 追加并去重。 */
                const pending = loadMarket({
                    q: String(appState.search || ''),
                    sort: smMarketSortValue(),
                    cursor: cursor,
                    limit: SM_MARKET_PAGE_SIZE,
                    sourceId: sourceId,
                    append: true,
                })
                if (pending !== null && pending !== undefined && typeof pending.then === 'function') await pending
            } catch (err) {
                void err
                toast(t('error.unexpected'), { tone: 'error' })
            } finally {
                delete smMarketAppending[sourceId]
                if (typeof setState === 'function') setState({})
            }
        }
        void run()
    }

    function smMarketBlockRetry(block) {
        if (block === null || typeof block !== 'object') return
        smMarketRefreshSource(block.sourceId, block.name)
    }

    function smMarketBlockEmpty(block) {
        const sourceId = String(block !== null && typeof block === 'object' ? block.sourceId || '' : '')
        return h('div', {
            key: 'empty-' + sourceId,
            className: 'sm-empty sm-market-empty',
            style: { padding: '20px 12px' },
        },
        h('div', { className: 'sm-empty-icon' }, icon('package', 32)),
        h('div', { className: 'sm-empty-title sm-card-title' }, t('empty.market.noSkills.title')),
        h('div', { className: 'sm-empty-body sm-desc' }, t('empty.market.noSkills.body')),
        h('div', { className: 'sm-empty-actions' },
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: smMarketManageSources,
        }, t('action.manageSources'))))
    }

    function smMarketBlockError(block) {
        const sourceId = String(block !== null && typeof block === 'object' ? block.sourceId || '' : '')
        const detail = smMarketBlockErrorText(block)
        return h('div', {
            key: 'error-' + sourceId,
            className: 'sm-banner sm-banner-error sm-error',
            role: 'alert',
            /* 布局由 .sm-banner 提供，其 gap 为 12px，错误条需 8px 且允许换行。 */
            style: { gap: '8px', flexWrap: 'wrap' },
        },
        icon('alert', 16),
        h('div', { className: 'sm-banner-main', style: { flex: '1 1 auto' } },
            h('div', { className: 'sm-banner-title' }, t('market.error.source')),
            h('div', { className: 'sm-caption sm-muted' },
                detail !== '' ? detail : t('market.error.sourceHint'))),
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: function () { smMarketBlockRetry(block) },
        }, t('action.retry')))
    }

    function renderMarketSourceBlock(block) {
        if (block === null || typeof block !== 'object') return null
        const sourceId = String(block.sourceId || '')
        const name = typeof block.name === 'string' && block.name !== '' ? block.name : sourceId
        const skills = smMarketBlockSkills(block)
        const errorText = smMarketBlockErrorText(block)
        const source = smMarketSourceById(sourceId)
        const status = source !== null && typeof source.status === 'string' ? source.status : 'ok'
        const dotClass = status === 'error' ? 'sm-dot-error' : status === 'checking' ? 'sm-dot-warn' : 'sm-dot-ok'
        const dotTip = status === 'error' ? t('source.status.error') : status === 'checking' ? t('source.status.checking') : t('source.status.ok')
        const count = typeof block.total === 'number' ? block.total : skills.length
        const cursor = typeof block.cursor === 'string' && block.cursor !== '' ? block.cursor : null
        const appending = smMarketAppending[sourceId] === true
        /* 有缓存卡片时保留列表，只在顶部显示错误细条；无缓存才整块错误态。 */
        let body = null
        if (skills.length > 0) {
            body = h(Fragment, null,
                errorText !== '' ? smMarketBlockError(block) : null,
                h('div', { className: 'sm-card-grid' }, skills.map(function (item) {
                    return renderMarketCard(item)
                })))
        } else if (errorText !== '') {
            body = smMarketBlockError(block)
        } else {
            body = smMarketBlockEmpty(block)
        }
        return h('section', {
            key: sourceId,
            className: 'sm-source-block',
            'data-source-id': sourceId,
            'aria-label': name + ' · ' + t('source.skillCount', { count: count }),
        },
        h('div', {
            className: 'sm-source-block-head',
        },
        h('span', { className: cx('sm-dot', dotClass), title: dotTip, 'data-tip': dotTip }),
        h('span', {
            className: 'sm-source-block-title',
            title: name,
        }, name),
        h('span', {
            className: 'sm-source-block-count',
        }, t('source.skillCount', { count: count }))),
        body,
        cursor !== null && errorText === ''
            ? h('div', {
                key: 'more',
                className: 'sm-market-more',
                /* 布局由 .sm-market-more 提供，其纵向内边距为 12px，此处需 4px。 */
                style: { padding: '4px 0' },
            },
            h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                disabled: appending,
                onClick: function () { smMarketLoadMore(block) },
            }, appending ? t('market.loadingMore') : t('action.more')))
            : null)
    }

    /* ------------------------------------------------------------------ *
     * 空态 / 骨架 / 页级错误                                              *
     * ------------------------------------------------------------------ */

    function smMarketEmptyBlock(iconName, title, body, actions, keyName) {
        return h('div', { key: keyName || 'empty', className: 'sm-empty sm-market-empty' },
            h('div', { className: 'sm-empty-icon' }, icon(iconName, 40)),
            h('div', { className: 'sm-empty-title sm-card-title' }, title),
            body ? h('div', { className: 'sm-empty-body sm-desc' }, body) : null,
            actions && actions.length > 0
                ? h('div', { className: 'sm-empty-actions' }, actions)
                : null)
    }

    function smMarketNoSourceState(hasAnySource) {
        const actions = [
            h('button', {
                key: 'add',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function () { smMarketOpenModal('add-source', {}) },
            }, icon('plus', 15), t('action.addSource')),
        ]
        if (hasAnySource) {
            actions.push(h('button', {
                key: 'manage',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketManageSources,
            }, t('action.manageSources')))
        }
        return smMarketEmptyBlock(
            'sources',
            t('empty.market.noSource.title'),
            t('empty.market.noSource.body'),
            actions,
            'no-source'
        )
    }

    function smMarketNoResultsState() {
        const query = String(appState.search === undefined || appState.search === null ? '' : appState.search)
        if (query.trim() !== '') {
            return smMarketEmptyBlock(
                'search',
                t('empty.market.noResults.title', { query: query }),
                t('empty.market.noResults.body'),
                [
                    h('button', {
                        key: 'clear',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        onClick: smMarketClearSearch,
                    }, t('action.clear')),
                ],
                'no-results'
            )
        }
        return smMarketEmptyBlock(
            'package',
            t('empty.market.noSkills.title'),
            t('empty.market.noSkills.body'),
            [
                h('button', {
                    key: 'manage',
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: smMarketManageSources,
                }, t('action.manageSources')),
            ],
            'no-skills'
        )
    }

    function smMarketPageError(error) {
        const detail = smMarketErrorText(error)
        return smMarketEmptyBlock(
            'alert',
            t('state.error.market.title'),
            detail !== '' ? detail : t('market.error.sourceHint'),
            [
                h('button', {
                    key: 'retry',
                    type: 'button',
                    className: 'sm-btn sm-btn-primary sm-btn-sm',
                    onClick: function () { smMarketReload() },
                }, t('action.retry')),
                h('button', {
                    key: 'sources',
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: smMarketManageSources,
                }, t('action.manageSources')),
            ],
            'page-error'
        )
    }

    function smMarketStaleBanner() {
        return h('div', {
            key: 'stale-banner',
            className: 'sm-banner sm-banner-warn sm-warn',
            role: 'status',
            /* 布局由 .sm-banner 提供，其 gap 为 12px，提示条需 8px 且允许换行。 */
            style: { gap: '8px', flexWrap: 'wrap' },
        },
        icon('alert', 16),
        h('div', { className: 'sm-banner-main', style: { flex: '1 1 auto' } },
            h('div', { className: 'sm-banner-title' }, t('market.error.offline')),
            h('div', { className: 'sm-caption sm-muted' }, t('market.error.offlineHint'))),
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: function () {
                if (typeof checkUpdates === 'function') void checkUpdates()
            },
        }, t('action.retry')),
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: smMarketManageSources,
        }, t('action.manageSources')))
    }

    function smMarketSkeletonCard(index) {
        return h('div', {
            key: 'sk-' + String(index),
            className: 'sm-card-item sm-market-card',
            'aria-hidden': 'true',
            style: { pointerEvents: 'none' },
        },
        h('div', { className: 'sm-card-icon' },
            h('span', { className: 'sm-skeleton', style: { width: '24px', height: '24px' } })),
        h('div', {
            className: 'sm-card-main',
            /* 骨架行距比 .sm-card-main 的 5px 更松。 */
            style: { gap: '8px' },
        },
        h('div', { className: 'sm-skeleton', style: { maxWidth: '180px' } }),
        h('div', { className: 'sm-skeleton', style: { maxWidth: '260px', minHeight: '12px' } })))
    }

    function smMarketSkeleton() {
        const cards = []
        for (let index = 0; index < 6; index += 1) cards.push(smMarketSkeletonCard(index))
        return h('div', {
            key: 'skeleton',
            className: 'sm-market-skeleton',
            'aria-busy': 'true',
        },
        h('div', { className: 'sm-caption sm-muted', style: { padding: '4px 2px' } }, t('state.loadingMarket')),
        h('div', { className: 'sm-card-grid' }, cards))
    }

    function smMarketToolbar(sources, loading) {
        const hasSources = sources.length > 0
        const checking = appState.checking === true
        return h(SmSearchToolbar, {
            search: appState.search,
            searchPlaceholder: t('search.market.placeholder'),
            clearLabel: t('action.clear'),
            onSearchClear: smMarketClearSearch,
            onSearchChange: smMarketOnSearchInput,
            searchDisabled: !hasSources,
            sortValue: smMarketSortValue(),
            sortLabel: t('sort.label'),
            sortOptions: [
                { value: 'recommend', label: t('sort.recommended') },
                { value: 'updated', label: t('sort.updated') },
                { value: 'name', label: t('sort.name') },
            ],
            onSortChange: smMarketOnSortChange,
            sortDisabled: !hasSources,
        },
            h('div', { className: 'sm-toolbar-icons' },
                h(SmButton, {
                    icon: 'refresh',
                    className: 'sm-toolbar-btn',
                    disabled: !hasSources || loading === true || checking,
                    onClick: function () {
                        if (typeof checkUpdates === 'function') void checkUpdates()
                    },
                }, checking ? t('status.checking') : t('action.checkUpdates')),
                h(SmButton, {
                    icon: 'sources',
                    className: 'sm-toolbar-btn',
                    onClick: smMarketManageSources,
                }, t('action.manageSources'))))
    }

    /* ------------------------------------------------------------------ *
     * 市场 Tab 入口                                                       *
     * ------------------------------------------------------------------ */

    /** 市场页工具栏独立成槽，渲染在 tab 内容之外，与技能页同层级同宽。 */
    function renderMarketToolbarSlot() {
        smMarketEnsureLoaded()
        return smMarketToolbar(smMarketSourceList(), smMarketLoading())
    }

    function renderMarketTab() {
        smMarketEnsureLoaded()

        const sources = smMarketSourceList()
        const enabledSources = sources.filter(function (source) {
            return source !== null && typeof source === 'object' && source.enabled !== false
        })
        const blocks = smMarketOrderedBlocks()
        const scopedError = smMarketScopedError()
        const loading = smMarketLoading()
        const stale = appState.marketStale === true
        const hasBlockError = blocks.some(function (block) { return smMarketBlockErrorText(block) !== '' })
        const nodes = []

        if (blocks.length > 0 && (stale || hasBlockError || scopedError !== null)) nodes.push(smMarketStaleBanner())

        if (blocks.length > 0) {
            blocks.forEach(function (block) { nodes.push(renderMarketSourceBlock(block)) })
        } else if (loading) {
            nodes.push(smMarketSkeleton())
        } else if (sources.length === 0) {
            nodes.push(smMarketNoSourceState(false))
        } else if (scopedError !== null) {
            nodes.push(smMarketPageError(scopedError))
        } else if (enabledSources.length === 0) {
            nodes.push(smMarketNoSourceState(true))
        } else {
            nodes.push(smMarketNoResultsState())
        }

        /* 管理源弹窗由 00-prelude 的 renderOverlays 挂载（与原型一致），
           这里不重复渲染，避免两层遮罩。 */
        nodes.push(smMarketRenderMenu())

        return h('div', { className: 'sm-page sm-market' }, nodes)
    }
