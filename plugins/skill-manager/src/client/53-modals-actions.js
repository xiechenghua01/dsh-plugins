    /* 卸载、删除、添加源 —— 由原 50-modals.js 行 1380-1595 拆出。 */
    /* ------------------------------------------------------------------ *
     * 5. 卸载确认（480）                                                 *
     * ------------------------------------------------------------------ */

    function smResolveSkill(payload) {
        if (payload === null || typeof payload !== 'object') return null
        if (payload.skill !== null && typeof payload.skill === 'object') return payload.skill
        return smFindSkillById(payload.id) || smFindSkillByName(payload.name)
    }

    function SmUninstallModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = smResolveSkill(payload)
        const name = skill !== null ? smText(skill.name, smText(payload.name)) : smText(payload.name)
        const location = skill !== null ? smText(skill.location, smText(payload.location)) : smText(payload.location)
        const blocked = skill !== null && smIsReadonly(skill)
        const [preserveBackup, setPreserveBackup] = useState(false)
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy || blocked) return
            if (name === '' || location === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('market/uninstall', { method: 'POST', body: { name: name, location: location, preserveBackup: preserveBackup } })
                setBusy(false)
                toast(t('uninstall.success', { name: name }))
                closeModal()
                const detail = appState.detail
                if (detail !== null && typeof detail === 'object' && (detail.id === smText(skill !== null ? skill.id : '') || detail.name === name)) {
                    setState({ view: 'list', detail: null })
                }
                void loadInstalled(true)
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
            title: t('uninstall.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy || blocked, onClick: function () { void submit() } }, t('action.uninstall'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        blocked ? h(SmBanner, { tone: 'warn' }, t('uninstall.readonly')) : null,
        h('p', { className: 'sm-desc' }, t('uninstall.body', { name: name !== '' ? name : '—' })),
        h('label', { className: 'sm-fs-12', style: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer' } },
            h('input', { type: 'checkbox', checked: preserveBackup, onChange: function (event) { setPreserveBackup(event.target.checked) } }),
            h('span', null, t('action.backup'))))
    }

    /* ------------------------------------------------------------------ *
     * 6. 删除确认（480）                                                 *
     * ------------------------------------------------------------------ */

    function SmDeleteModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = smResolveSkill(payload)
        const name = skill !== null ? smText(skill.name, smText(payload.name)) : smText(payload.name)
        const path = skill !== null ? smText(skill.path, smText(payload.path)) : smText(payload.path)
        const blocked = skill !== null && smIsReadonly(skill)
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy || blocked) return
            if (path === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('skill?path=' + encodeURIComponent(path), { method: 'DELETE' })
                setBusy(false)
                toast(t('toast.deleted', { name: name }))
                closeModal()
                const detail = appState.detail
                if (detail !== null && typeof detail === 'object' && (detail.id === smText(skill !== null ? skill.id : '') || detail.name === name)) {
                    setState({ view: 'list', detail: null })
                }
                void loadInstalled(true)
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
            title: t('delete.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy || blocked, onClick: function () { void submit() } }, t('action.delete'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        blocked ? h(SmBanner, { tone: 'warn' }, t('delete.readonly')) : null,
        h('p', { className: 'sm-desc' }, t('delete.body', { name: name !== '' ? name : '—' })))
    }

    /* ------------------------------------------------------------------ *
     * 7. 添加索引源（488）                                               *
     * ------------------------------------------------------------------ */

    function SmAddSourceModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const editingSource = payload.source !== null && payload.source !== undefined && typeof payload.source === 'object' ? payload.source : null
        const editing = editingSource !== null
        const [name, setName] = useState(editing ? smText(editingSource.name) : '')
        const [url, setUrl] = useState(editing ? smText(editingSource.url) : '')
        const [validating, setValidating] = useState(false)
        const [result, setResult] = useState(null)
        const [validateError, setValidateError] = useState('')
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const validate = async function () {
            if (url.trim() === '') {
                setValidateError(t('source.error.urlRequired'))
                setResult(null)
                return
            }
            setValidating(true)
            setValidateError('')
            setResult(null)
            setServerError('')
            try {
                const data = await api('sources/validate', { method: 'POST', body: { url: url.trim() } })
                setResult(data !== null && typeof data === 'object' ? data : null)
            } catch (failure) {
                setValidateError(smErrorMessage(failure))
            } finally {
                setValidating(false)
            }
        }

        const canSave = result !== null && validateError === '' && url.trim() !== '' && !busy
        const submit = async function () {
            if (!canSave) return
            setBusy(true)
            setServerError('')
            const request = { url: url.trim() }
            if (name.trim() !== '') request.name = name.trim()
            try {
                const data = editing
                    ? await api('sources/' + encodeURIComponent(smText(editingSource.id)), { method: 'PUT', body: request })
                    : await api('sources', { method: 'POST', body: request })
                const source = data !== null && typeof data === 'object' && data.source !== undefined ? data.source : null
                setBusy(false)
                const label = source !== null ? smText(source.name, name.trim()) : name.trim()
                toast(editing ? t('toast.sourceUpdated', { name: label }) : t('toast.sourceAdded', { name: label }))
                closeModal()
                void loadSources()
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        const samples = result !== null && Array.isArray(result.sample) ? result.sample : (result !== null && Array.isArray(result.skills) ? result.skills : [])
        const sampleNames = samples.slice(0, 3).map(function (item) { return smText(item.name) }).filter(function (text) { return text !== '' }).join(' · ')

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: editing ? t('source.edit.title') : t('source.add.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSave, onClick: function () { void submit() } }, t('action.save'))),
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmBanner, { tone: 'info' }, t('source.trust')),
        h(SmField, { label: t('source.name') },
            h('input', { type: 'text', className: 'sm-input', value: name, placeholder: t('source.name.placeholder'), onChange: function (event) { setName(event.target.value) } })),
        h(SmField, { label: t('source.url'), error: validateError },
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                h('input', {
                    type: 'text',
                    className: 'sm-mono sm-input',
                    value: url,
                    placeholder: t('source.url.placeholder'),
                    onChange: function (event) { setUrl(event.target.value); setResult(null); setValidateError('') },
                    style: { flex: 1 },
                }),
                h(SmButton, { tone: 'secondary', disabled: validating, onClick: function () { void validate() } }, validating ? t('state.validating') : t('action.validate')))),
        result !== null
            ? h(SmBanner, { tone: 'ok' },
                h('span', { className: 'sm-banner-title', style: { color: 'var(--dsw-alias-state-success-primary)' } }, t('source.validated', { count: typeof result.skillCount === 'number' ? result.skillCount : (typeof result.count === 'number' ? result.count : 0) })),
                result.title ? h('span', null, t('source.title') + ': ' + smText(result.title)) : null,
                result.description ? h('span', null, smText(result.description)) : null,
                sampleNames !== '' ? h('span', { className: 'sm-mono', style: { wordBreak: 'break-all' } }, t('source.preview', { names: sampleNames })) : null)
            : null)
    }

    /* ------------------------------------------------------------------ *
     * 8. 编辑原文（720）                                                 *
     * ------------------------------------------------------------------ */
