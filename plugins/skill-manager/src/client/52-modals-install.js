    /* 安装与更新流程 —— 由原 50-modals.js 行 955-1379 拆出。 */
    /* ------------------------------------------------------------------ *
     * 3. 安装技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmInstallModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const initialMarket = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const [market, setMarket] = useState(initialMarket)
        const [versions, setVersions] = useState([])
        const [loading, setLoading] = useState(initialMarket === null)
        const [loadError, setLoadError] = useState('')
        const [reloadTick, setReloadTick] = useState(0)
        const [location, setLocation] = useState(smDefaultLocation(payload))
        const [conflictChoice, setConflictChoice] = useState('')
        const [busy, setBusy] = useState(false)
        const [stage, setStage] = useState(0)
        const [error, setError] = useState('')
        const [confirmCancel, setConfirmCancel] = useState(false)
        const timerRef = useRef(null)
        const abortRef = useRef(null)
        const canceledRef = useRef(false)

        smUseModalGuard(props.modalId, function () {
            if (confirmCancel) {
                setConfirmCancel(false)
                return true
            }
            if (!busy) return false
            setConfirmCancel(true)
            return true
        })

        useEffect(function () {
            if (market !== null) return undefined
            let alive = true
            const sourceId = smText(payload.sourceId)
            const name = smText(payload.name)
            if (sourceId === '' || name === '') {
                setLoading(false)
                setLoadError(t('install.unavailable'))
                return undefined
            }
            setLoading(true)
            setLoadError('')
            api('market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name)).then(function (data) {
                if (!alive) return
                setMarket(data !== null && typeof data === 'object' && data.skill !== undefined ? data.skill : null)
                setVersions(data !== null && typeof data === 'object' && Array.isArray(data.versions) ? data.versions : [])
                setLoading(false)
            }).catch(function (failure) {
                if (!alive) return
                setLoadError(smErrorMessage(failure))
                setLoading(false)
            })
            return function () { alive = false }
        }, [reloadTick])

        useEffect(function () {
            return function () {
                if (timerRef.current !== null) clearInterval(timerRef.current)
                if (abortRef.current !== null) abortRef.current.abort()
            }
        }, [])

        const version = market !== null ? smText(market.version) : ''
        const conflict = market !== null && smSkillList().some(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.name === market.name && smSkillCategory(skill) === smSaveTargetCategory(location)
        })

        const changeLocation = function () {
            if (market === null) return
            const candidates = ['user-dsh', 'user-agents', 'project-dsh']
            for (let index = 0; index < candidates.length; index += 1) {
                const candidate = candidates[index]
                if (candidate === location) continue
                if (candidate === 'project-dsh' && !smProjectAvailable()) continue
                const taken = smSkillList().some(function (skill) {
                    return skill !== null && typeof skill === 'object' && skill.name === market.name && smSkillCategory(skill) === smSaveTargetCategory(candidate)
                })
                if (!taken) {
                    setLocation(candidate)
                    setConflictChoice('')
                    return
                }
            }
            toast(t('error.pathOutside'), { tone: 'error' })
        }

        const cancelInstall = function () {
            canceledRef.current = true
            if (abortRef.current !== null) {
                abortRef.current.abort()
                abortRef.current = null
            }
            if (timerRef.current !== null) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            setBusy(false)
            setStage(0)
            setConfirmCancel(false)
            setError(t('error.canceled'))
        }

        const submit = async function () {
            if (market === null || busy) return
            if (conflict && conflictChoice === '') return
            canceledRef.current = false
            setBusy(true)
            setStage(0)
            setError('')
            setConfirmCancel(false)
            if (timerRef.current !== null) clearInterval(timerRef.current)
            timerRef.current = setInterval(function () {
                setStage(function (previous) { return previous < 1 ? previous + 1 : previous })
            }, 700)
            const controller = new AbortController()
            abortRef.current = controller
            const request = { sourceId: market.sourceId, name: market.name, version: version, location: location }
            if (conflict) request.conflict = conflictChoice === 'skip' ? 'skip' : 'overwrite'
            try {
                const result = await api('market/install', { method: 'POST', body: request, signal: controller.signal })
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                abortRef.current = null
                setBusy(false)
                setStage(2)
                const created = result !== null && typeof result === 'object' && result.skill !== undefined ? result.skill : null
                toast(t('install.success', { name: market.name }), {
                    actionLabel: t('action.viewInstalled'),
                    onAction: function () {
                        const category = smSaveTargetCategory(location)
                        void loadInstalled(true).then(function () {
                            if (created !== null && typeof created === 'object' && typeof created.id === 'string') {
                                setState({ tab: 'skills', category: category, view: 'detail', detail: { kind: 'installed', id: created.id } })
                            } else {
                                setState({ tab: 'skills', category: category, view: 'list', detail: null })
                            }
                        })
                    },
                })
                // Installing from the market detail keeps the user on that page;
                // every other entry point still returns to the installed list.
                const stayInMarketDetail = appState.view === 'detail'
                    && appState.detail !== null && typeof appState.detail === 'object'
                    && appState.detail.kind === 'market'
                closeModal()
                void loadInstalled(true)
                void loadMarket()
                if (!stayInMarketDetail) {
                    setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                }
            } catch (failure) {
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                abortRef.current = null
                setBusy(false)
                setStage(0)
                if (canceledRef.current === true || (failure !== null && typeof failure === 'object' && failure.code === 'E_CANCELED')) {
                    setError(t('error.canceled'))
                } else {
                    setError(smErrorMessage(failure))
                }
            }
        }

        if (loading) {
            return h(SmDialogFrame, { modalId: props.modalId, isTop: props.isTop, layerIndex: props.layerIndex, width: 488, title: t('install.title'), footer: h(SmFooter, null) },
                h('div', { className: 'sm-fs-13 sm-text-secondary' }, t('state.loading')))
        }
        if (market === null) {
            return h(SmDialogFrame, { modalId: props.modalId, isTop: props.isTop, layerIndex: props.layerIndex, width: 488, title: t('install.title'), footer: h(SmFooter, null, h(SmButton, { tone: 'secondary', onClick: function () { setReloadTick(function (value) { return value + 1 }) } }, t('action.retry'))) },
                h(SmBanner, { tone: 'error' }, loadError !== '' ? loadError : t('install.unavailable')))
        }

        const stageLabel = stage === 0 ? t('install.progress.preparing') : t('install.progress.verifying')

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('install.title'),
            subtitle: smText(market.name),
            footer: busy
                ? h(Fragment, null,
                    h(SmButton, { tone: 'secondary', onClick: function () { setConfirmCancel(true) } }, t('action.cancel')),
                    h(SmButton, { tone: 'primary', disabled: true }, t('state.installing')))
                : h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: conflict && conflictChoice === '', onClick: function () { void submit() } }, t('action.install'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        confirmCancel
            ? h(SmBanner, { tone: 'warn' },
                h('span', { className: 'sm-banner-title' }, t('install.cancelConfirm.title')),
                h('span', null, t('install.cancelConfirm.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmCancel(false) } }, t('action.cancel')),
                    h(SmButton, { tone: 'danger', style: { height: '28px' }, onClick: cancelInstall }, t('install.cancelConfirm.ok'))))
            : null,
        h(SmField, { label: t('install.target') },
            h(SmSegmented, { value: location, onChange: function (value) { setLocation(value); setConflictChoice('') }, options: smSaveTargets() })),
        h(SmField, { label: t('install.version') },
            h('div', { className: 'sm-mono sm-fs-13 sm-text-primary' }, version === '' ? '—' : (version.charAt(0) === 'v' ? version : 'v' + version))),
        conflict
            ? h(SmBanner, { tone: 'warn' },
                h('span', { className: 'sm-banner-title' }, t('install.conflict')),
                h(SmRadioOptions, {
                    name: 'install-conflict',
                    value: conflictChoice,
                    onChange: setConflictChoice,
                    options: [
                        { value: 'overwrite', label: t('install.conflict.overwrite') },
                        { value: 'skip', label: t('install.conflict.skip') },
                    ],
                }),
                h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: changeLocation }, t('install.conflict.changeTarget')))
            : null,
        busy
            ? h('div', { role: 'progressbar', 'aria-busy': 'true', className: 'sm-note neutral', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                h('span', { className: 'sm-fs-12 sm-text-secondary' }, stageLabel),
                h('div', { style: { width: '100%', height: '6px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-3)', overflow: 'hidden' } },
                    h('div', { style: { width: stage === 0 ? '40%' : '82%', height: '100%', background: 'var(--dsw-alias-label-primary)', transition: 'width 180ms' } })))
            : null)
    }

    /* ------------------------------------------------------------------ *
     * 4. 更新确认（480，单个 / 全部）                                    *
     * ------------------------------------------------------------------ */

    function smUpdateTargets(payload) {
        const list = []
        const push = function (skill) {
            if (skill === null || typeof skill !== 'object') return
            if (skill.status === 'disabled' || skill.writable === false || smIsBuiltin(skill)) return
            if (smSkillUpdateVersion(skill) === '') return
            if (list.some(function (item) { return item.id === skill.id })) return
            list.push(skill)
        }
        if (payload !== null && typeof payload === 'object') {
            if (Array.isArray(payload.skills)) payload.skills.forEach(push)
            else if (payload.all === true) smSkillList().forEach(push)
            else if (payload.skill !== null && payload.skill !== undefined) push(payload.skill)
        }
        return list
    }

    function SmUpdateModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const initialTargets = smUpdateTargets(payload)
        const batch = initialTargets.length > 1 || payload.all === true
        const [targets, setTargets] = useState(initialTargets)
        const [phase, setPhase] = useState('confirm')
        const [done, setDone] = useState(0)
        const [failed, setFailed] = useState([])
        const [okCount, setOkCount] = useState(0)
        const [error, setError] = useState('')
        const [confirmCancel, setConfirmCancel] = useState(false)
        const cancelRef = useRef(false)
        const abortRef = useRef(null)

        smUseModalGuard(props.modalId, function () {
            if (confirmCancel) {
                setConfirmCancel(false)
                return true
            }
            if (phase !== 'running') return false
            setConfirmCancel(true)
            return true
        })

        const modifiedCount = targets.filter(function (skill) { return smSkillLocalModified(skill) }).length
        const updateOne = async function (skill) {
            const version = smSkillUpdateVersion(skill)
            await api('market/update', {
                method: 'POST',
                body: { sourceId: smText(skill.sourceId), name: smText(skill.name), version: version, location: smText(skill.location) },
                signal: abortRef.current !== null ? abortRef.current.signal : undefined,
            })
        }

        const run = async function (queue) {
            setPhase('running')
            setDone(0)
            setOkCount(0)
            setFailed([])
            setError('')
            setConfirmCancel(false)
            cancelRef.current = false
            let ok = 0
            const failures = []
            for (let index = 0; index < queue.length; index += 1) {
                if (cancelRef.current) break
                const skill = queue[index]
                try {
                    await updateOne(skill)
                    ok += 1
                } catch (failure) {
                    if (cancelRef.current === true || (failure !== null && typeof failure === 'object' && failure.code === 'E_CANCELED')) break
                    failures.push({ skill: skill, reason: smErrorMessage(failure) })
                }
                setDone(index + 1)
                setOkCount(ok)
                setFailed(failures.slice())
            }
            abortRef.current = null
            if (cancelRef.current === true && ok === 0 && failures.length === 0) setError(t('error.canceled'))
            if (cancelRef.current !== true && !batch && queue.length === 1 && failures.length === 0) {
                toast(t('update.success', { version: smSkillUpdateVersion(queue[0]) }))
                void loadInstalled(true)
                void loadUpdates(true)
                void loadMarket()
                closeModal()
                return
            }
            setPhase('result')
            if (ok > 0) toast(t('update.result', { ok: ok, failed: failures.length }))
            void loadInstalled(true)
            void loadUpdates(true)
            void loadMarket()
        }

        const submit = function () {
            if (targets.length === 0) return
            const queue = targets.slice()
            setTargets(queue)
            if (queue.length > 1 || batch) {
                abortRef.current = null
                void run(queue)
                return
            }
            abortRef.current = new AbortController()
            void run(queue)
        }

        const cancelRun = function () {
            cancelRef.current = true
            if (abortRef.current !== null) abortRef.current.abort()
            setConfirmCancel(false)
        }

        const retryFailed = function () {
            const queue = failed.map(function (entry) { return entry.skill })
            if (queue.length === 0) return
            setTargets(queue)
            abortRef.current = null
            void run(queue)
        }

        const footer = phase === 'running'
            ? h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { setConfirmCancel(true) } }, t('action.cancel')))
            : phase === 'result'
                ? h(Fragment, null,
                    failed.length > 0 ? h(SmButton, { tone: 'secondary', onClick: retryFailed }, t('update.retryFailedCount', { count: failed.length })) : null,
                    h(SmButton, { tone: 'primary', onClick: closeModal }, t('action.close')))
                : h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: targets.length === 0, onClick: submit }, t('action.update')))

        const body = []
        if (error !== '') body.push(h(SmBanner, { key: 'error', tone: 'error' }, error))
        if (confirmCancel) {
            body.push(h(SmBanner, { key: 'cancel', tone: 'warn' },
                h('span', { className: 'sm-banner-title' }, t('update.cancelConfirm.title')),
                h('span', null, t('update.cancelConfirm.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { key: 'keep', tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmCancel(false) } }, t('action.cancel')),
                    h(SmButton, { key: 'stop', tone: 'danger', style: { height: '28px' }, onClick: cancelRun }, t('update.cancelConfirm.ok')))))
        }

        if (phase === 'confirm') {
            if (targets.length === 0) {
                body.push(h('div', { key: 'none', className: 'sm-fs-13 sm-text-secondary' }, t('update.none')))
            } else if (!batch) {
                const skill = targets[0]
                body.push(h('div', { key: 'single', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '0.5px solid var(--dsw-alias-border-l1)' } },
                        h('span', { className: 'sm-mono sm-fs-13', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)' } }, smText(skill.name)),
                        h('span', { className: 'sm-mono sm-fs-12', style: { flexShrink: 0, color: 'var(--dsw-alias-label-secondary)' } },
                            t('update.versionChange', {
                                current: smSkillVersion(skill) === '' ? '—' : smSkillVersion(skill),
                                next: (smSkillUpdateVersion(skill).charAt(0) === 'v' ? '' : 'v') + smSkillUpdateVersion(skill),
                            }))),
                    h('div', { className: 'sm-fs-12 sm-text-secondary' }, t('market.source') + ': ' + smText(skill.sourceName, smText(skill.sourceId, '—'))),
                    smSkillLocalModified(skill) ? h(SmBanner, { tone: 'warn' }, t('update.localModified')) : null,
                    h('div', { className: 'sm-caption' }, t('update.backupNote'))))
            } else {
                body.push(h('div', { key: 'batch', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                    h('div', { className: 'sm-fs-14 sm-text-primary' }, t('update.all.body', { count: targets.length })),
                    modifiedCount > 0 ? h(SmBanner, { tone: 'warn' }, t('update.all.modified', { count: modifiedCount })) : null,
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' } },
                        targets.map(function (skill) {
                            return h('div', { key: smText(skill.id, smText(skill.name)), style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 10px', borderRadius: '10px', background: 'var(--dsw-alias-bg-base)' } },
                                h('span', { className: 'sm-mono sm-fs-12', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)' } }, smText(skill.name)),
                                h('span', { className: 'sm-mono sm-fs-11', style: { flexShrink: 0, color: 'var(--dsw-alias-label-caption)' } }, 'v' + smSkillUpdateVersion(skill)))
                        })),
                    h('div', { className: 'sm-caption' }, t('update.backupNote'))))
            }
        } else if (phase === 'running') {
            body.push(h('div', { key: 'progress', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('div', { className: 'sm-fs-13 sm-text-secondary' }, t('update.progress', { done: done, total: targets.length })),
                h('div', { role: 'progressbar', style: { width: '100%', height: '6px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-3)', overflow: 'hidden' } },
                    h('div', { style: { width: String(targets.length === 0 ? 0 : Math.round((done / targets.length) * 100)) + '%', height: '100%', background: 'var(--dsw-alias-label-primary)', transition: 'width 180ms' } }))))
        } else {
            body.push(h('div', { key: 'result', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('div', { className: 'sm-fs-14', style: { color: 'var(--dsw-alias-label-primary)', fontWeight: 500 } }, failed.length === 0 ? t('update.result.ok') : t('update.result', { ok: okCount, failed: failed.length })),
                failed.map(function (entry) {
                    return h('div', { key: smText(entry.skill.id, smText(entry.skill.name)), className: 'sm-fs-12 sm-text-secondary' },
                        smText(entry.skill.name) + ' · ' + entry.reason)
                })))
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: batch ? t('update.all.title') : t('update.title'),
            footer: footer,
        }, body)
    }
