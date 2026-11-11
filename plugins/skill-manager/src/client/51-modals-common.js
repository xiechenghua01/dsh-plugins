    /* 通用弹窗组件与新建/导入流程 —— 由原 50-modals.js 行 546-954 拆出。 */
    /* ------------------------------------------------------------------ *
     * 弹窗外壳与表单原语。                                               *
     * ------------------------------------------------------------------ */

    function SmDialogFrame(props) {
        const confirm = props.confirm === true
        /* 三档：480 确认 / 488 表单 / 720 大内容。 */
        const width = props.width === 720 ? 720
            : (props.width === 480 ? 480 : 488)
        const layerIndex = typeof props.layerIndex === 'number' ? props.layerIndex : 0
        const boxRef = useRef(null)
        const close = function () {
            if (typeof props.onRequestClose === 'function') props.onRequestClose()
            else smRequestCloseModal(props.modalId)
        }

        useEffect(function () {
            const node = boxRef.current
            if (node === null || typeof node.querySelector !== 'function') return
            let field = node.querySelector('input, textarea, select')
            if (field === null) field = node.querySelector('button')
            if (field !== null && typeof field.focus === 'function') {
                try {
                    field.focus({ preventScroll: true })
                } catch (failure) {
                    /* focus is best effort */
                }
            }
        }, [])

        const onKeyDown = function (event) {
            if (typeof props.onKeyDown === 'function' && props.onKeyDown(event) === true) return
            if (event.key !== 'Tab') return
            const node = boxRef.current
            if (node === null || typeof node.querySelectorAll !== 'function') return
            const focusable = Array.prototype.slice.call(node.querySelectorAll('button, input, textarea, select, [tabindex="0"]'))
                .filter(function (item) { return item.disabled !== true && item.getAttribute('aria-hidden') !== 'true' })
            if (focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        /* 宽度档由 `.sm-dialog*` 负责；这里只保留视口高度上限。 */
        const maxHeightStyle = width === 720
            ? 'min(720px, calc(100vh - 96px))'
            : 'calc(100vh - 96px)'

        return h('div', {
            className: 'sm-dialog-mask sm-modal-backdrop',
            style: { zIndex: 1300 + layerIndex * 2 },
            onMouseDown: function (event) {
                if (event.target !== event.currentTarget) return
                if (props.isTop !== true) return
                close()
            },
        },
        h('div', {
            ref: boxRef,
            className: cx('sm-dialog', confirm && 'sm-dialog-confirm', width === 720 && 'sm-dialog-large', width === 488 && 'sm-dialog-form'),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            'aria-hidden': props.isTop === true ? undefined : 'true',
            onKeyDown: onKeyDown,
            style: {
                maxHeight: maxHeightStyle,
                pointerEvents: props.isTop === true ? 'auto' : 'none',
            },
        },
        h('div', { className: 'sm-dialog-head' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
            h('h3', { className: 'sm-dialog-title' }, props.title),
            props.subtitle !== undefined && props.subtitle !== null && props.subtitle !== ''
                ? h('div', { className: 'sm-dialog-sub' }, props.subtitle)
                : null),
        confirm
            ? null
            : h('button', {
                type: 'button',
                className: 'sm-icon-btn sm-dialog-close',
                'aria-label': t('action.close'),
                'data-tip': t('action.close'),
                onClick: close,
            }, icon('x', 16))),
        h('div', {
            className: 'sm-dialog-body',
            style: { display: 'flex', flexDirection: 'column', gap: confirm ? '12px' : '16px' },
        }, props.children),
        props.footer === undefined || props.footer === null
            ? null
            : h('div', {
                className: 'sm-dialog-foot',
            }, props.footer)))
    }

    function SmFooter(props) {
        return h(Fragment, null,
            h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
            props.children)
    }

    function SmField(props) {
        const label = props.label === undefined || props.label === null ? '' : String(props.label)
        /* 给每个子控件补可访问名称：SmField 的标签是视觉文本，不自动关联控件。 */
        const labelled = React.Children.map(props.children, function (child) {
            if (!React.isValidElement(child)) return child
            const childProps = child.props === null || child.props === undefined ? {} : child.props
            if (childProps['aria-label'] !== undefined || childProps['aria-labelledby'] !== undefined) return child
            return React.cloneElement(child, { 'aria-label': label })
        })
        return h('div', { className: 'sm-field', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' } },
                h('label', { className: 'sm-form-label' }, label),
                props.hint ? h('span', { className: 'sm-form-hint' }, props.hint) : null),
            labelled,
            props.error ? h('div', { className: 'sm-form-error', role: 'alert' }, props.error) : null)
    }

    /**
     * 技能页与市场页共用的「搜索 + 排序 + 右侧操作」工具栏行。
     * 两页只传数据与回调，结构与样式只有这一份实现。
     */
    function SmSearchToolbar(props) {
        const search = String(props.search === undefined || props.search === null ? '' : props.search)
        const options = Array.isArray(props.sortOptions) ? props.sortOptions : []
        return h('div', { className: 'sm-toolbar' },
            h('div', { className: 'sm-search' },
                icon('search', 16),
                h('input', {
                    className: 'sm-search-input',
                    type: 'search',
                    value: search,
                    placeholder: props.searchPlaceholder,
                    'aria-label': props.searchPlaceholder,
                    spellCheck: false,
                    disabled: props.searchDisabled === true,
                    onChange: props.onSearchChange,
                }),
                search !== ''
                    ? h('button', {
                        type: 'button',
                        className: 'sm-search-clear',
                        'aria-label': props.clearLabel,
                        'data-tip': props.clearLabel,
                        onClick: props.onSearchClear,
                    }, icon('x', 16))
                    : null),
            h('select', {
                className: 'sm-select',
                value: props.sortValue,
                'aria-label': props.sortLabel,
                disabled: props.sortDisabled === true,
                onChange: props.onSortChange,
            }, options.map(function (option) {
                return h('option', { key: option.value, value: option.value }, option.label)
            })),
            props.children)
    }

    function SmBanner(props) {
        const tone = props.tone === undefined || props.tone === null ? 'info' : String(props.tone)
        return h('div', {
            className: 'sm-banner sm-banner-' + tone,
            style: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px' },
        }, props.children)
    }

    function SmSegmented(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h('div', { role: 'tablist', className: 'sm-segmented', style: { alignSelf: 'flex-start' } },
            options.map(function (option) {
                const selected = props.value === option.value
                return h('button', {
                    key: option.value,
                    className: 'sm-seg-tab',
                    type: 'button',
                    role: 'tab',
                    'aria-selected': selected,
                    disabled: option.disabled === true,
                    onClick: function () {
                        if (option.disabled === true) return
                        if (typeof props.onChange === 'function') props.onChange(option.value)
                    },
                    style: { cursor: option.disabled === true ? 'not-allowed' : 'pointer', opacity: option.disabled === true ? 0.5 : 1 },
                }, option.label)
            }))
    }

    function SmRadioOptions(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h('div', { className: 'sm-radio-group' },
            options.map(function (option) {
                const selected = props.value === option.value
                return h('label', {
                    key: option.value,
                    className: cx('sm-radio', selected && 'sm-active'),
                    style: { opacity: option.disabled === true ? 0.5 : 1, cursor: option.disabled === true ? 'not-allowed' : 'pointer' },
                },
                h('input', {
                    type: 'radio',
                    name: props.name || 'sm-radio',
                    value: option.value,
                    checked: selected,
                    disabled: option.disabled === true,
                    onChange: function () {
                        if (option.disabled !== true && typeof props.onChange === 'function') props.onChange(option.value)
                    },
                }),
                h('span', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                    h('span', { style: { wordBreak: 'break-word' } }, option.label),
                    option.hint ? h('span', { className: 'sm-form-hint' }, option.hint) : null))
            }))
    }

    function smSaveTargetCategory(location) {
        if (location === 'user-agents') return 'shared'
        if (location === 'project-dsh') return 'project'
        return 'mine'
    }

    function smNameTaken(name, location) {
        const category = smSaveTargetCategory(location)
        return smSkillList().some(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.name === name && smSkillCategory(skill) === category
        })
    }

    function smDefaultLocation(payload) {
        if (payload !== null && typeof payload === 'object') {
            if (typeof payload.location === 'string' && payload.location !== '') return payload.location
            if (payload.category === 'shared') return 'user-agents'
            if (payload.category === 'project') return 'project-dsh'
        }
        return 'user-dsh'
    }

    /* ------------------------------------------------------------------ *
     * 1. 新建技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmNewSkillModal(props) {
        const payload = props.payload
        const [name, setName] = useState('')
        const [description, setDescription] = useState('')
        const [whenToUse, setWhenToUse] = useState('')
        const [body, setBody] = useState('')
        const [location, setLocation] = useState(smDefaultLocation(payload))
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const trimmedName = name.trim()
        let nameError = ''
        if (trimmedName !== '' && (!SM_NAME_PATTERN.test(trimmedName) || trimmedName.length > 64)) nameError = t('form.name.invalid')
        else if (trimmedName !== '' && smNameTaken(trimmedName, location)) nameError = t('form.name.taken')
        const projectBlocked = location === 'project-dsh' && !smProjectAvailable()
        const canSubmit = trimmedName !== '' && nameError === '' && description.trim() !== '' && body.trim() !== '' && !projectBlocked && !busy

        const submit = async function () {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const request = { location: location, name: trimmedName, description: description.trim(), body: body }
            if (whenToUse.trim() !== '') request.whenToUse = whenToUse.trim()
            try {
                await api('skill', { method: 'POST', body: request })
                setBusy(false)
                toast(t('toast.created', { name: trimmedName }))
                closeModal()
                setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('form.new.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: function () { void submit() } }, t('action.create'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    void submit()
                    return true
                }
                return false
            },
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmField, { label: t('form.name'), hint: t('form.name.placeholder'), error: nameError },
            h('input', {
                type: 'text',
                className: 'sm-mono sm-input',
                value: name,
                placeholder: t('form.name.placeholder'),
                onChange: function (event) { setName(event.target.value); setServerError('') },
            })),
        h(SmField, { label: t('form.description') },
            h('input', {
                type: 'text',
                className: 'sm-input',
                value: description,
                placeholder: t('form.description.placeholder'),
                onChange: function (event) { setDescription(event.target.value); setServerError('') },
            })),
        h(SmField, { label: t('form.whenToUse') },
            h('input', {
                type: 'text',
                className: 'sm-input',
                value: whenToUse,
                onChange: function (event) { setWhenToUse(event.target.value) },
            })),
        h(SmField, { label: t('form.saveTo') },
            h(SmSegmented, { value: location, onChange: setLocation, options: smSaveTargets() }),
            projectBlocked ? h('div', { className: 'sm-form-hint' }, t('form.projectUnavailable')) : null),
        h(SmField, { label: t('form.body') },
            h('textarea', {
                className: 'sm-textarea sm-mono',
                value: body,
                placeholder: t('form.body.placeholder'),
                onChange: function (event) { setBody(event.target.value); setServerError('') },
                style: { minHeight: '140px' },
            })))
    }

    /* ------------------------------------------------------------------ *
     * 2. 导入技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmImportModal(props) {
        const [mode, setMode] = useState('paste')
        const [content, setContent] = useState('')
        const [dirPath, setDirPath] = useState('')
        const [location, setLocation] = useState(smDefaultLocation(props.payload))
        const [parsed, setParsed] = useState(null)
        const [parseError, setParseError] = useState('')
        const [parsing, setParsing] = useState(false)
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const parse = async function () {
            if (content.trim() === '') {
                setParseError(t('form.body.required'))
                setParsed(null)
                return
            }
            setParsing(true)
            setParseError('')
            setParsed(null)
            try {
                const result = await api('validate', { method: 'POST', body: { content: content } })
                if (result !== null && typeof result === 'object' && result.valid === true) setParsed(result)
                else setParseError(t('form.import.invalid', { reason: result !== null && typeof result === 'object' && typeof result.error === 'string' ? result.error : t('error.unexpected') }))
            } catch (failure) {
                setParseError(smErrorMessage(failure))
            } finally {
                setParsing(false)
            }
        }

        const canSubmit = (mode === 'paste' ? content.trim() !== '' : dirPath.trim() !== '') && !busy
        const submit = async function () {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const request = { mode: mode, location: location }
            if (mode === 'paste') request.content = content
            else request.dirPath = dirPath.trim()
            try {
                const result = await api('import', { method: 'POST', body: request })
                const imported = result !== null && typeof result === 'object' && result.skill !== undefined && result.skill !== null ? result.skill : null
                const files = result !== null && typeof result === 'object' && typeof result.files === 'number' ? result.files : 0
                setBusy(false)
                toast(t('toast.imported', { name: imported !== null ? smText(imported.name) : '', count: files }))
                closeModal()
                setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('form.import.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: function () { void submit() } }, t('action.import'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    void submit()
                    return true
                }
                return false
            },
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmSegmented, {
            value: mode,
            onChange: function (value) { setMode(value); setParseError(''); setParsed(null) },
            options: [
                { value: 'paste', label: t('form.import.paste') },
                { value: 'dir', label: t('form.import.dir') },
            ],
        }),
        mode === 'paste'
            ? h(Fragment, null,
                h(SmField, {
                    label: t('form.import.paste'),
                    hint: h('button', {
                        type: 'button',
                        className: 'sm-link-btn',
                        onClick: function () { void parse() },
                        style: { height: '24px' },
                    }, parsing ? t('state.validating') : t('action.parse')),
                },
                h('textarea', {
                    className: 'sm-textarea sm-mono',
                    value: content,
                    placeholder: t('form.import.paste.placeholder'),
                    onChange: function (event) { setContent(event.target.value); setParsed(null); setParseError('') },
                    style: { minHeight: '160px' },
                })),
                parseError !== '' ? h(SmBanner, { tone: 'error' }, parseError) : null,
                parsed !== null
                    ? h(SmBanner, { tone: 'ok' },
                        h('span', { className: 'sm-banner-title', style: { color: 'var(--dsw-alias-state-success-primary)' } }, t('form.import.parsed')),
                        h('span', null, t('form.name') + ': ' + smText(parsed.name, '—')),
                        h('span', null, t('form.description') + ': ' + smText(parsed.description, '—')),
                        typeof parsed.files === 'number' ? h('span', null, t('form.import.preview', { count: parsed.files })) : null)
                    : null)
            : h(Fragment, null,
                h(SmField, { label: t('form.import.dir') },
                    h('input', {
                        type: 'text',
                        className: 'sm-mono sm-input',
                        value: dirPath,
                        placeholder: t('form.import.dir.placeholder'),
                        onChange: function (event) { setDirPath(event.target.value) },
                    }))),
        h(SmField, { label: t('form.saveTo') },
            h(SmSegmented, { value: location, onChange: setLocation, options: smSaveTargets() })))
    }
