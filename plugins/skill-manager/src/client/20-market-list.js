    /* 由原 20-market.js 行 1-533 拆出。 */
    /* ------------------------------------------------------------------ *
     * C3 · 市场 Tab                                                       *
     *                                                                    *
     * 数据来源：appState.marketSources（按源分区块，见契约 §3.4）。       *
     * 每个源区块独立分页（cursor）；搜索 / 排序由 Host 完成，客户端只     *
     * 负责渲染、按 sourceOrder 排序区块与按块追加下一页。                 *
     * ------------------------------------------------------------------ */

    const SM_MARKET_PAGE_SIZE = 20

    /* 模块级瞬时状态：不进 appState，避免与 Host 数据竞争。 */
    let smMarketBootStarted = false
    let smMarketMenu = null
    let smMarketMenuKeysBound = false
    let smMarketAppending = Object.create(null)
    let smMarketRefreshing = Object.create(null)
    let smMarketSearchTimer = null

    function smMarketErrorText(err) {
        if (err === null || err === undefined) return ''
        if (typeof err === 'string') return err
        if (typeof err === 'object') {
            if (typeof err.message === 'string' && err.message !== '') return err.message
            if (typeof err.code === 'string' && err.code !== '') return err.code
        }
        return String(err)
    }

    function smMarketVersionLabel(version) {
        const text = String(version === undefined || version === null ? '' : version)
        if (text === '') return ''
        return text.charAt(0) === 'v' ? text : 'v' + text
    }

    function smMarketSortValue() {
        const sort = String(appState.marketSort === undefined || appState.marketSort === null ? '' : appState.marketSort)
        if (sort === 'updated' || sort === 'name' || sort === 'recommend') return sort
        return 'recommend'
    }

    function smMarketSourceList() {
        return Array.isArray(appState.sources) ? appState.sources : []
    }

    function smMarketSourceById(sourceId) {
        const id = String(sourceId === undefined || sourceId === null ? '' : sourceId)
        if (id === '') return null
        const sources = smMarketSourceList()
        for (let index = 0; index < sources.length; index += 1) {
            const source = sources[index]
            if (source !== null && typeof source === 'object' && String(source.id) === id) return source
        }
        return null
    }

    function smMarketBlocks() {
        return Array.isArray(appState.marketSources) ? appState.marketSources : []
    }

    function smMarketBlockSkills(block) {
        return block !== null && typeof block === 'object' && Array.isArray(block.skills) ? block.skills : []
    }

    function smMarketBlockErrorText(block) {
        if (block === null || typeof block !== 'object' || block.error === null || block.error === undefined || block.error === '') return ''
        return smMarketErrorText(block.error)
    }

    function smMarketBlockEnabled(block) {
        if (block === null || typeof block !== 'object') return false
        const source = smMarketSourceById(block.sourceId)
        if (source === null) return true
        return source.enabled !== false
    }

    /* 区块顺序 = sourceOrder；未出现在 order 里的源保持接口返回顺序并排最后。 */
    function smMarketOrderedBlocks() {
        const query = String(appState.search === undefined || appState.search === null ? '' : appState.search).trim()
        const blocks = smMarketBlocks().filter(function (block) {
            if (block === null || typeof block !== 'object') return false
            if (!smMarketBlockEnabled(block)) return false
            /* 搜索无命中的源区块连同区块头一起隐藏（ML-03）。 */
            if (query !== '' && smMarketBlockSkills(block).length === 0) return false
            return true
        })
        const order = Array.isArray(appState.sourceOrder) ? appState.sourceOrder : []
        if (order.length === 0) return blocks
        const rank = Object.create(null)
        order.forEach(function (id, index) {
            rank[String(id)] = index
        })
        return blocks
            .map(function (block, index) { return { block: block, index: index } })
            .sort(function (left, right) {
                const leftId = String(left.block.sourceId)
                const rightId = String(right.block.sourceId)
                const leftRank = rank[leftId] === undefined ? Number.MAX_SAFE_INTEGER : rank[leftId]
                const rightRank = rank[rightId] === undefined ? Number.MAX_SAFE_INTEGER : rank[rightId]
                if (leftRank !== rightRank) return leftRank - rightRank
                return left.index - right.index
            })
            .map(function (entry) { return entry.block })
    }

    function smMarketLoading() {
        if (appState.loadingMarket === true) return true
        if (appState.loading !== null && typeof appState.loading === 'object' && appState.loading.market === true) return true
        return false
    }

    function smMarketScopedError() {
        const error = appState.error
        return error !== null && typeof error === 'object' && error.scope === 'market' ? error : null
    }

    function smMarketEnsureLoaded() {
        if (smMarketBootStarted) return
        smMarketBootStarted = true
        if (smMarketBlocks().length > 0) return
        /* switchTab 可能已经发起请求；不要在渲染里重复发一次。 */
        if (smMarketLoading()) return
        if (typeof loadMarket !== 'function') return
        try {
            const pending = loadMarket({ q: String(appState.search || ''), sort: smMarketSortValue() })
            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                pending.catch(function () { /* 页级错误态由 appState.error 呈现 */ })
            }
        } catch (err) {
            void err
        }
    }

    function smMarketReload(options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        if (typeof loadMarket !== 'function') return
        smMarketBootStarted = true
        try {
            const pending = loadMarket({
                q: String(appState.search || ''),
                sort: smMarketSortValue(),
                refresh: opts.refresh === true,
            })
            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                pending.catch(function () { /* 错误由 appState.error 呈现 */ })
            }
        } catch (err) {
            void err
        }
    }

    function smMarketCancelSearchTimer() {
        if (smMarketSearchTimer !== null) {
            clearTimeout(smMarketSearchTimer)
            smMarketSearchTimer = null
        }
    }

    function smMarketClearSearch() {
        smMarketCancelSearchTimer()
        if (typeof setState === 'function') setState({ search: '' })
        smMarketReload({ refresh: true })
    }

    function smMarketOnSearchInput(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || '')
            : ''
        if (value === appState.search) return
        if (typeof setState === 'function') setState({ search: value })
        smMarketCancelSearchTimer()
        /* 市场搜索 300ms 防抖（交互稿 §3.3）。 */
        smMarketSearchTimer = setTimeout(function () {
            smMarketSearchTimer = null
            smMarketReload()
        }, 300)
    }

    function smMarketOnSortChange(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || 'recommend')
            : 'recommend'
        if (value === smMarketSortValue()) return
        smMarketCancelSearchTimer()
        if (typeof setState === 'function') setState({ marketSort: value })
        smMarketReload()
    }

    function smMarketManageSources() {
        if (typeof openSourceDialog === 'function') openSourceDialog()
    }

    function smMarketOpenModal(kind, payload) {
        if (typeof openModal === 'function') openModal(kind, payload)
    }

    function smMarketRefreshSource(sourceId) {
        const id = String(sourceId === undefined || sourceId === null ? '' : sourceId)
        if (id === '' || smMarketRefreshing[id] === true) return
        smMarketRefreshing[id] = true
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                await api('sources/' + encodeURIComponent(id) + '/refresh', { method: 'POST' })
                if (typeof loadSources === 'function') {
                    try { await loadSources(true) } catch (err) { void err }
                }
                smMarketReload({ refresh: true })
            } catch (err) {
                void err
                toast(t('source.error.refreshFailed'), { tone: 'error' })
            } finally {
                delete smMarketRefreshing[id]
                if (typeof setState === 'function') setState({})
            }
        }
        void run()
    }

    /* ------------------------------------------------------------------ *
     * 卡片菜单（源的操作统一在管理源弹窗中完成）                          *
     * ------------------------------------------------------------------ */

    function smMarketMenuKeydown(event) {
        if (event === null || event === undefined || event.key !== 'Escape') return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (typeof event.stopPropagation === 'function') event.stopPropagation()
        smMarketCloseMenu()
    }

    function smMarketBindMenuKeys() {
        if (smMarketMenuKeysBound) return
        if (typeof document === 'undefined' || document === null || typeof document.addEventListener !== 'function') return
        document.addEventListener('keydown', smMarketMenuKeydown, true)
        smMarketMenuKeysBound = true
    }

    function smMarketUnbindMenuKeys() {
        if (!smMarketMenuKeysBound) return
        if (typeof document !== 'undefined' && document !== null && typeof document.removeEventListener === 'function') {
            document.removeEventListener('keydown', smMarketMenuKeydown, true)
        }
        smMarketMenuKeysBound = false
    }

    function smMarketOpenMenu(kind, event, payload) {
        if (event !== null && event !== undefined) {
            if (typeof event.stopPropagation === 'function') event.stopPropagation()
            if (typeof event.preventDefault === 'function') event.preventDefault()
        }
        let rect = null
        if (event !== null && event !== undefined && event.currentTarget !== null && event.currentTarget !== undefined &&
            typeof event.currentTarget.getBoundingClientRect === 'function') {
            rect = event.currentTarget.getBoundingClientRect()
        }
        const width = 200
        const viewportWidth = typeof window !== 'undefined' && window !== null && typeof window.innerWidth === 'number'
            ? window.innerWidth
            : 1024
        const viewportHeight = typeof window !== 'undefined' && window !== null && typeof window.innerHeight === 'number'
            ? window.innerHeight
            : 768
        const anchorX = rect !== null ? rect.right - width : viewportWidth - width - 24
        const anchorY = rect !== null ? rect.bottom + 4 : 120
        const x = Math.max(8, Math.min(viewportWidth - width - 8, anchorX))
        const y = Math.max(8, Math.min(viewportHeight - 240, anchorY))
        smMarketMenu = Object.assign({ kind: kind, x: x, y: y }, payload !== null && typeof payload === 'object' ? payload : {})
        smMarketBindMenuKeys()
        if (typeof setState === 'function') setState({})
    }

    function smMarketCloseMenu() {
        if (smMarketMenu === null) return
        smMarketMenu = null
        smMarketUnbindMenuKeys()
        if (typeof setState === 'function') setState({})
    }

    function smMarketMenuItem(key, iconName, label, onClick, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const disabled = opts.disabled === true
        return h('button', {
            key: key,
            type: 'button',
            role: 'menuitem',
            className: cx('sm-menu-item', opts.danger === true && 'sm-menu-item-danger'),
            disabled: disabled,
            'aria-disabled': disabled,
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                if (disabled) return
                smMarketCloseMenu()
                if (typeof onClick === 'function') onClick()
            },
        },
        iconName ? icon(iconName, 15) : null,
        h('span', null, label))
    }

    function smMarketRenderMenu() {
        if (smMarketMenu === null || typeof smMarketMenu !== 'object') return null
        const items = []
        if (smMarketMenu.kind === 'card') {
            const item = smMarketMenu.item
            if (item !== null && typeof item === 'object') {
                items.push(smMarketMenuItem('detail', 'skill', t('action.viewDetail'), function () {
                    smMarketOpenDetail(item)
                }))
                if (smMarketCardUpdate(item) !== '') {
                    items.push(smMarketMenuItem('update', 'arrow-up-dot', t('action.update'), function () {
                        smMarketUpdate(item)
                    }))
                } else if (smMarketCardInstalled(item)) {
                    items.push(smMarketMenuItem('installed', 'check', t('market.installed'), null, { disabled: true }))
                } else {
                    items.push(smMarketMenuItem('install', 'download', t('action.install'), function () {
                        smMarketInstall(item)
                    }))
                }
            }
        }
        if (items.length === 0) return null
        return h(Fragment, null,
            h('div', {
                key: 'menu-backdrop',
                className: 'sm-menu-backdrop',
                /* 定位由 .sm-menu-backdrop 提供；层级按浮层栈保留。 */
                style: { zIndex: 1290 },
                onClick: smMarketCloseMenu,
                onContextMenu: function (event) {
                    if (event !== null && event !== undefined && typeof event.preventDefault === 'function') event.preventDefault()
                    smMarketCloseMenu()
                },
            }),
            h('div', {
                key: 'menu',
                className: 'sm-menu',
                role: 'menu',
                /* 固定定位由 .sm-menu 提供；坐标/宽度/层级按弹出位置计算。 */
                style: {
                    left: smMarketMenu.x + 'px',
                    top: smMarketMenu.y + 'px',
                    width: '200px',
                    zIndex: 1300,
                },
            }, items))
    }

    /* ------------------------------------------------------------------ *
     * 市场卡片                                                            *
     * ------------------------------------------------------------------ */

    function smMarketCardInstalled(item) {
        if (item === null || typeof item !== 'object') return false
        if (item.installed === true) return true
        return item.installed !== null && typeof item.installed === 'object'
    }

    /* 市场条目只带 installed 布尔值；更新模态还需要安装位置，从已安装列表补齐。 */
    function smMarketInstalledSkill(item) {
        if (item === null || typeof item !== 'object') return null
        const skills = Array.isArray(appState.skills) ? appState.skills : []
        const name = String(item.name || '')
        const sourceId = String(item.sourceId || '')
        if (name === '') return null
        for (let index = 0; index < skills.length; index += 1) {
            const skill = skills[index]
            if (skill === null || typeof skill !== 'object' || String(skill.name || '') !== name) continue
            const recordSource = typeof skill.sourceId === 'string' && skill.sourceId !== ''
                ? skill.sourceId
                : (skill.market !== null && typeof skill.market === 'object' && typeof skill.market.sourceId === 'string'
                    ? skill.market.sourceId
                    : '')
            if (recordSource === '' || recordSource === sourceId) return skill
        }
        return null
    }

    function smMarketCardInstalledVersion(item) {
        if (item === null || typeof item !== 'object') return ''
        if (typeof item.installedVersion === 'string' && item.installedVersion !== '') return item.installedVersion
        if (item.installed !== null && typeof item.installed === 'object' && typeof item.installed.version === 'string') {
            return item.installed.version
        }
        const installed = smMarketInstalledSkill(item)
        return installed !== null && typeof installed.version === 'string' ? installed.version : ''
    }

    function smMarketCardUpdate(item) {
        if (item === null || typeof item !== 'object') return ''
        if (typeof item.updateAvailable === 'string' && item.updateAvailable !== '') return item.updateAvailable
        if (item.updateAvailable !== null && item.updateAvailable !== undefined && item.updateAvailable !== false) {
            return String(item.updateAvailable)
        }
        return ''
    }

    function smMarketIconName(item) {
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
        }))
    }

    function smMarketCardKey(item) {
        const sourceId = String(item !== null && typeof item === 'object' && item.sourceId ? item.sourceId : '')
        const name = String(item !== null && typeof item === 'object' && item.name ? item.name : '')
        return sourceId + '/' + name
    }

    function smMarketOpenDetail(item) {
        if (item === null || typeof item !== 'object') return
        if (typeof rememberListScroll === 'function') rememberListScroll()
        const key = smMarketCardKey(item)
        const detailId = typeof item.id === 'string' && item.id !== '' ? item.id : key
        if (typeof setState === 'function') {
            setState({
                view: 'detail',
                detail: {
                    kind: 'market',
                    id: detailId,
                    sourceId: item.sourceId,
                    name: item.name,
                },
            })
        }
    }

    function smMarketInstall(item) {
        if (item === null || typeof item !== 'object') return
        smMarketOpenModal('install', {
            sourceId: item.sourceId,
            name: item.name,
            version: item.version,
        })
    }

    function smMarketUpdate(item) {
        if (item === null || typeof item !== 'object') return
        const next = smMarketCardUpdate(item)
        const installedSkill = smMarketInstalledSkill(item)
        const embedded = item.installed !== null && typeof item.installed === 'object' ? item.installed : null
        const current = smMarketCardInstalledVersion(item)
        const location = installedSkill !== null && typeof installedSkill.location === 'string' && installedSkill.location !== ''
            ? installedSkill.location
            : embedded !== null && typeof embedded.location === 'string' ? embedded.location : ''
        const localModified = installedSkill !== null && (
            installedSkill.localModified === true ||
            (installedSkill.market !== null && typeof installedSkill.market === 'object' && installedSkill.market.localModified === true)
        )
        /* 50-modals 的更新模态通过 payload.skill 读取目标（smSkillUpdateVersion）。 */
        const target = Object.assign({}, item, {
            id: installedSkill !== null && typeof installedSkill.id === 'string' && installedSkill.id !== ''
                ? installedSkill.id
                : (typeof item.id === 'string' && item.id !== '' ? item.id : smMarketCardKey(item)),
            location: location,
            version: current !== '' ? current : item.version,
            updateAvailable: next,
            localModified: localModified,
        })
        smMarketOpenModal('update', {
            skill: target,
            sourceId: item.sourceId,
            name: item.name,
            version: next,
            currentVersion: current,
            available: next,
            current: current,
            location: location,
        })
    }

    function smMarketCardPrimary(item) {
        const update = smMarketCardUpdate(item)
        const installed = smMarketCardInstalled(item)
        if (update !== '') {
            return h('button', {
                key: 'primary',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function (event) {
                    if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                    smMarketUpdate(item)
                },
            }, t('action.update'))
        }
        if (installed) {
            return h('button', {
                key: 'primary',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm sm-market-installed',
                onClick: function (event) {
                    if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                    smMarketOpenDetail(item)
                },
            }, t('market.installed'))
        }
        return h('button', {
            key: 'primary',
            type: 'button',
            className: 'sm-btn sm-btn-primary sm-btn-sm',
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                smMarketInstall(item)
            },
        }, t('action.install'))
    }
