    /* 编辑内容、预览、移除源确认 —— 由原 50-modals.js 行 1596-1870 拆出。 */
    function SmEditContentModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const path = smText(payload.path, skill !== null ? smText(skill.path) : '')
        const name = smText(payload.name, skill !== null ? smText(skill.name) : '')
        const [draft, setDraft] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [original, setOriginal] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [mtime, setMtime] = useState(smNumber(payload.mtime, skill !== null ? smNumber(skill.mtime, 0) : 0))
        const [loading, setLoading] = useState(typeof payload.content !== 'string' && path !== '')
        const [saving, setSaving] = useState(false)
        const [error, setError] = useState('')
        const [confirmDiscard, setConfirmDiscard] = useState(false)
        const alive = useRef(true)
        const textareaRef = useRef(null)
        const gutterRef = useRef(null)
        const dirty = draft !== original

        smUseModalGuard(props.modalId, function () {
            if (confirmDiscard) {
                setConfirmDiscard(false)
                return true
            }
            if (!dirty) return false
            setConfirmDiscard(true)
            return true
        })

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const load = useCallback(function () {
            if (path === '') {
                setLoading(false)
                setError(t('error.notFound'))
                return
            }
            setLoading(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path)).then(function (data) {
                if (!alive.current) return
                const content = data !== null && typeof data === 'object' && typeof data.content === 'string' ? data.content : ''
                const fetchedSkill = data !== null && typeof data === 'object' && data.skill !== null && typeof data.skill === 'object' ? data.skill : null
                setDraft(content)
                setOriginal(content)
                setMtime(fetchedSkill !== null ? smNumber(fetchedSkill.mtime, mtime) : mtime)
                setLoading(false)
            }).catch(function (failure) {
                if (!alive.current) return
                setError(smErrorMessage(failure))
                setLoading(false)
            })
        }, [path])

        useEffect(function () {
            if (typeof payload.content === 'string') return
            load()
        }, [load])

        const save = async function () {
            if (saving || path === '') return
            setSaving(true)
            setError('')
            try {
                await api('skill', { method: 'PUT', body: { path: path, mtime: mtime, content: draft } })
                setSaving(false)
                setOriginal(draft)
                toast(t('toast.saved'))
                smRefreshDetail()
                void loadInstalled(true)
                if (smDiagnostics.open) void smLoadDiagnostics()
                closeModal()
            } catch (failure) {
                setSaving(false)
                setError(failure !== null && typeof failure === 'object' && failure.code === 'E_CONFLICT_MTIME' ? t('form.mtimeConflict') : smErrorMessage(failure))
            }
        }

        const requestClose = function () {
            if (dirty) {
                setConfirmDiscard(true)
                return
            }
            smRemoveModalById(props.modalId)
        }

        const lineCount = draft.split('\n').length
        const gutter = []
        for (let index = 1; index <= Math.max(lineCount, 1); index += 1) gutter.push(h('div', { key: index }, String(index)))

        const body = []
        if (error !== '') {
            body.push(h(SmBanner, { key: 'error', tone: 'error' },
                h('span', null, error),
                error === t('form.mtimeConflict')
                    ? h(SmButton, { key: 'refresh', tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: function () { void load() } }, t('action.refresh'))
                    : null))
        }
        if (confirmDiscard) {
            body.push(h(SmBanner, { key: 'discard', tone: 'warn' },
                h('span', { className: 'sm-banner-title' }, t('form.edit.discard.title')),
                h('span', null, t('form.edit.discard.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { key: 'keep', tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmDiscard(false) } }, t('action.cancel')),
                    h(SmButton, { key: 'discard', tone: 'danger', style: { height: '28px' }, onClick: function () { smRemoveModalById(props.modalId) } }, t('form.edit.discard.confirm')))))
        }
        if (loading) {
            body.push(h('div', { key: 'loading', className: 'sm-fs-13 sm-text-secondary' }, t('state.loading')))
        } else {
            body.push(h('div', {
                key: 'editor',
                className: 'sm-editor',
                style: { display: 'flex', minHeight: '320px', height: 'min(52vh, 480px)', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', overflow: 'hidden' },
            },
            h('div', {
                ref: gutterRef,
                className: 'sm-mono sm-fs-12',
                'aria-hidden': 'true',
                style: { flexShrink: 0, width: '44px', padding: '10px 8px', overflow: 'hidden', textAlign: 'right', userSelect: 'none', color: 'var(--dsw-alias-label-caption)', lineHeight: '20px' },
            }, gutter),
            h('textarea', {
                ref: textareaRef,
                className: 'sm-mono sm-fs-12',
                value: draft,
                spellCheck: false,
                onChange: function (event) {
                    setDraft(event.target.value)
                    setError('')
                },
                onScroll: function (event) {
                    if (gutterRef.current !== null) gutterRef.current.scrollTop = event.target.scrollTop
                },
                style: { flex: '1 1 auto', minWidth: 0, border: 'none', outline: 'none', resize: 'none', background: 'transparent', color: 'var(--dsw-alias-label-primary)', lineHeight: '20px', padding: '10px 12px', whiteSpace: 'pre', overflow: 'auto' },
            })))
            body.push(h('div', { key: 'hint', className: 'sm-fs-11', style: { color: 'var(--dsw-alias-label-caption)' } }, t('detail.editHint')))
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 720,
            title: t('form.edit.title'),
            subtitle: name,
            onRequestClose: requestClose,
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: requestClose }, t('action.cancel')),
                h(SmButton, { tone: 'primary', disabled: saving || loading || !dirty || path === '', onClick: function () { void save() } }, saving ? t('state.savingContent') : t('action.save'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') {
                    event.preventDefault()
                    void save()
                    return true
                }
                return false
            },
        },
        dirty ? h('div', { className: 'sm-fs-12', style: { color: 'var(--dsw-alias-state-warn-primary)' } }, t('form.edit.dirty')) : null,
        body)
    }

    /* ------------------------------------------------------------------ *
     * 9. 预览（720）                                                     *
     * ------------------------------------------------------------------ */

    function SmPreviewModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const path = smText(payload.path, skill !== null ? smText(skill.path) : '')
        const name = smText(payload.name, skill !== null ? smText(skill.name) : '')
        const [content, setContent] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [loading, setLoading] = useState(typeof payload.content !== 'string' && path !== '')
        const [error, setError] = useState('')
        const alive = useRef(true)

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const load = useCallback(function () {
            if (path === '') {
                setLoading(false)
                return
            }
            setLoading(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path)).then(function (data) {
                if (!alive.current) return
                setContent(data !== null && typeof data === 'object' && typeof data.content === 'string' ? data.content : '')
                setLoading(false)
            }).catch(function (failure) {
                if (!alive.current) return
                setError(smErrorMessage(failure))
                setLoading(false)
            })
        }, [path])

        useEffect(function () {
            if (typeof payload.content === 'string') return
            load()
        }, [load])

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 720,
            title: t('detail.content'),
            subtitle: name,
            footer: h(Fragment, null, h(SmButton, { tone: 'primary', onClick: function () { smRemoveModalById(props.modalId) } }, t('action.close'))),
        },
        loading
            ? h('div', { className: 'sm-fs-13 sm-text-secondary' }, t('state.loading'))
            : error !== ''
                ? h(SmBanner, { tone: 'error' }, error)
                : content === ''
                    ? h('div', { className: 'sm-fs-13', style: { color: 'var(--dsw-alias-label-caption)' } }, t('detail.content.empty'))
                    : h(SmCodeBlock, { text: content, maxHeight: '60vh' }))
    }

    /* ------------------------------------------------------------------ *
     * 10. 删除源确认（480）                                              *
     * ------------------------------------------------------------------ */

    function SmConfirmRemoveSourceModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const source = payload.source !== null && typeof payload.source === 'object' ? payload.source : null
        const sourceId = smText(payload.sourceId, smText(payload.id, source !== null ? smText(source.id) : ''))
        const name = smText(payload.name, source !== null ? smText(source.name) : '')
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy) return
            if (sourceId === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('sources/' + encodeURIComponent(sourceId), { method: 'DELETE' })
                setBusy(false)
                toast(t('toast.sourceDeleted', { name: name !== '' ? name : sourceId }))
                closeModal()
                void loadSources()
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('source.confirmDelete.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy, onClick: function () { void submit() } }, t('action.deleteSource'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        h('p', { className: 'sm-desc' }, t('source.confirmDelete.body')),
        name !== '' ? h('div', { className: 'sm-mono sm-fs-12', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)' } }, name) : null)
    }

    /* ------------------------------------------------------------------ *
     * 诊断抽屉（420，DG-01～DG-03 / PRD §9）。                            *
     * ------------------------------------------------------------------ */
