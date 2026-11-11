    /* 诊断抽屉 —— 由原 50-modals.js 行 1871-2170 拆出。 */
    function smDiagnosticsPayload() {
        if (smDiagnostics.data !== null && typeof smDiagnostics.data === 'object') return smDiagnostics.data
        if (appState.diagnostics !== null && typeof appState.diagnostics === 'object') return appState.diagnostics
        return null
    }

    function openDiagnosticsDrawer() {
        smHideTooltip()
        if (!smDiagnostics.open) {
            smDiagnostics.open = true
            smLockScroll()
        }
        if (typeof rerender === 'function') rerender()
        void smLoadDiagnostics()
    }

    function smCloseDiagnostics() {
        if (!smDiagnostics.open) return
        smDiagnostics.open = false
        smUnlockScroll()
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    async function smLoadDiagnostics() {
        smDiagnostics.loading = true
        smDiagnostics.error = null
        if (typeof rerender === 'function') rerender()
        try {
            const cwd = typeof appState.cwd === 'string' ? appState.cwd : ''
            const data = await api('diagnostics' + (cwd === '' ? '' : '?cwd=' + encodeURIComponent(cwd)))
            smDiagnostics.data = data !== null && typeof data === 'object' ? data : null
            appState.diagnostics = smDiagnostics.data
            smDiagnostics.error = null
        } catch (failure) {
            smDiagnostics.error = failure !== null && typeof failure === 'object' ? failure : {}
        } finally {
            smDiagnostics.loading = false
            if (typeof rerender === 'function') rerender()
        }
    }

    /** 八类问题归一化；同一套用户语言。 */
    function smIssueKind(issue) {
        const raw = smText(issue.kind, smText(issue.type)).toLowerCase()
        if (raw === '') return 'unreadable'
        if (raw.indexOf('same') !== -1 || raw.indexOf('shadow') !== -1 || raw.indexOf('duplicate') !== -1) return 'same-name'
        if (raw.indexOf('source') !== -1) return 'source-unreachable'
        if (raw.indexOf('broken') !== -1 || raw.indexOf('link') !== -1) return 'broken-link'
        if (raw.indexOf('frontmatter') !== -1 || raw.indexOf('format') !== -1 || raw.indexOf('schema') !== -1) return 'frontmatter'
        if (raw.indexOf('oversize') !== -1 || raw.indexOf('large') !== -1) return 'oversize'
        if (raw.indexOf('missing') !== -1 || raw.indexOf('not-found') !== -1 || raw.indexOf('enoent') !== -1) return 'missing'
        if (raw.indexOf('name') !== -1) return 'name'
        if (raw.indexOf('unreadable') !== -1 || raw.indexOf('permission') !== -1 || raw.indexOf('eacces') !== -1) return 'unreadable'
        return 'unreadable'
    }

    function smIssueSection(issue) {
        const kind = smIssueKind(issue)
        /* 同名问题无论来源层都算「未生效」，进入警示图标计数。 */
        if (kind === 'same-name') return 'inactive'
        if (kind === 'oversize' || kind === 'source-unreachable') return 'attention'
        if (issue.severity === 'info') return 'attention'
        return 'inactive'
    }

    /** 仅用于「详细信息」层；技术类型名只在这里出现。 */
    function smIssueTypeLabel(issue) {
        return smText(issue.kind, smText(issue.type, t('error.read')))
    }

    function smIssueSentence(issue) {
        const kind = smIssueKind(issue)
        const name = smText(issue.name, smText(issue.path, '—'))
        if (kind === 'same-name') {
            const category = smText(issue.category, smCategoryForLocation(issue.location))
            const group = smText(issue.group, smText(issue.categoryLabel, smText(issue.locationName, smCategoryLabel(category) || t('tab.category.mine'))))
            return t('diag.sentence.sameName', { name: name, group: group })
        }
        if (kind === 'frontmatter') return t('diag.sentence.frontmatter', { name: name })
        if (kind === 'name') return t('diag.sentence.name', { name: name })
        if (kind === 'broken-link') return t('diag.sentence.brokenLink', { name: name })
        if (kind === 'oversize') return t('diag.sentence.oversize', { name: name })
        if (kind === 'source-unreachable') return t('diag.sentence.sourceUnreachable', { name: name, source: smText(issue.source, smText(issue.sourceName, '—')) })
        return t('diag.sentence.unreadable', { name: name })
    }

    function smIssueAction(issue) {
        const kind = smIssueKind(issue)
        if (kind === 'same-name') return { id: 'view-active', label: t('action.viewActive') }
        if (kind === 'frontmatter') return { id: 'open-file', label: t('action.openFile') }
        if (kind === 'name') return { id: 'open-file', label: t('action.openFile') }
        if (kind === 'broken-link') return { id: 'remove-link', label: t('action.removeLink') }
        if (kind === 'oversize') return { id: 'trim', label: t('action.viewFile') }
        if (kind === 'source-unreachable') return { id: 'manage-sources', label: t('diag.fix.manageSources') }
        if (kind === 'missing') return { id: 'retry', label: t('action.retry') }
        return { id: 'open-folder', label: t('diag.fix.openFolder') }
    }

    function smOpenSkillDetail(skill) {
        if (skill === null || typeof skill !== 'object') return
        setState({ tab: 'skills', view: 'detail', detail: { kind: 'installed', id: smText(skill.id), name: smText(skill.name) } })
    }

    function smRunIssueFix(issue, setBusy, setError) {
        const action = smIssueAction(issue).id
        const name = smText(issue.name)
        const path = smText(issue.path)
        const findSkill = function () {
            return smFindSkillById(issue.id) || smFindSkillByName(name) || (path !== '' ? smFindSkillById(path) : null)
        }
        const openEditor = function () {
            const skill = findSkill()
            if (path === '' && (skill === null || smText(skill.path) === '')) {
                setError(t('error.notFound'))
                return
            }
            openModal('edit-content', { skill: skill, name: name, path: path !== '' ? path : smText(skill !== null ? skill.path : ''), mtime: skill !== null ? smNumber(skill.mtime, 0) : 0 })
        }

        if (action === 'view-active') {
            const active = smFindActiveSkillByName(name)
            if (active === null) {
                toast(t('error.notFound'), { tone: 'error' })
                return
            }
            smCloseDiagnostics()
            smOpenSkillDetail(active)
            return
        }
        if (action === 'open-file' || action === 'trim') {
            openEditor()
            return
        }
        if (action === 'manage-sources') {
            if (typeof openSourceDialog === 'function') {
                openSourceDialog()
                return
            }
            setError(t('error.unexpected'))
            return
        }
        if (action === 'open-folder') {
            if (typeof openFolder === 'function') {
                openFolder(path)
                return
            }
            smCopyText(path, t('toast.copied'))
            return
        }
        if (action === 'retry') {
            void smLoadDiagnostics()
            return
        }
        if (action === 'remove-link') {
            if (path === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path), { method: 'DELETE' }).then(function () {
                setBusy(false)
                toast(t('diag.toast.fixed'))
                void loadInstalled(true)
                void smLoadDiagnostics()
            }).catch(function (failure) {
                setBusy(false)
                setError(t('diag.error.fixFailed', { reason: smErrorMessage(failure) }))
            })
        }
    }

    function SmIssueCard(props) {
        const issue = props.issue
        const [detailsOpen, setDetailsOpen] = useState(false)
        const [busy, setBusy] = useState(false)
        const [fixError, setFixError] = useState('')
        const kind = smIssueKind(issue)
        const action = smIssueAction(issue)
        const name = smText(issue.name, smText(issue.path, '—'))
        const path = smText(issue.path)
        const effective = smText(issue.effective, smText(issue.activeName, smText(issue.shadowedBy, smText(issue.effectivePath, smText(issue.activePath)))))

        return h('div', { className: 'sm-issue' },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 } },
                h('span', { style: { flexShrink: 0, color: kind === 'oversize' || kind === 'source-unreachable' ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-state-warn-primary)' } }, icon(kind === 'oversize' || kind === 'source-unreachable' ? 'info' : 'alert', 16)),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
                    h('span', { className: 'sm-mono sm-fs-13', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontWeight: 500 } }, name),
                    h('span', { className: 'sm-fs-12', style: { color: 'var(--dsw-alias-label-secondary)', lineHeight: '1.5' } }, smIssueSentence(issue)))),
            fixError !== '' ? h('div', { className: 'sm-fs-12', style: { color: 'var(--dsw-alias-state-error-primary)' } }, fixError) : null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                h(SmButton, { tone: 'primary', style: { height: '28px' }, disabled: busy, onClick: function () { smRunIssueFix(issue, setBusy, setFixError) } }, action.label),
                h(SmButton, {
                    tone: 'ghost',
                    style: { height: '28px' },
                    onClick: function () { setDetailsOpen(!detailsOpen) },
                }, detailsOpen ? t('diag.details.hide') : t('diag.details'))),
            detailsOpen
                ? h('div', { className: 'sm-issue-detail', style: { display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '0.5px solid var(--dsw-alias-border-l2)' } },
                    path !== ''
                        ? h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' } },
                            h('span', { className: 'sm-mono sm-fs-11', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary)' } }, t('diag.path') + ': ' + path),
                            h(SmButton, { tone: 'ghost', icon: 'copy', style: { height: '24px', flexShrink: 0 }, onClick: function () { smCopyText(path, t('toast.copied')) } }, t('action.copyPath')))
                        : null,
                    h('div', { className: 'sm-fs-11', style: { color: 'var(--dsw-alias-label-caption)' } }, t('diag.kind') + ': ' + smIssueTypeLabel(issue)),
                    effective !== '' ? h('div', { className: 'sm-fs-11', style: { color: 'var(--dsw-alias-label-caption)' } }, t('diag.effective') + ': ' + effective) : null,
                    h('div', { className: 'sm-fs-11', style: { color: 'var(--dsw-alias-label-caption)' } }, t('diag.fixHint')))
                : null)
    }

    function SmDiagnosticsDrawer() {
        const payload = smDiagnosticsPayload()
        const issues = payload !== null && Array.isArray(payload.issues) ? payload.issues.filter(function (issue) { return issue !== null && typeof issue === 'object' }) : []
        const inactive = issues.filter(function (issue) { return smIssueSection(issue) === 'inactive' })
        const attention = issues.filter(function (issue) { return smIssueSection(issue) === 'attention' })
        const checkedAt = payload !== null && typeof payload.checkedAt === 'number' ? payload.checkedAt : 0
        const loading = smDiagnostics.loading || (payload === null && smDiagnostics.error === null)
        const sortByName = function (left, right) {
            return smText(left.name, left.path).localeCompare(smText(right.name, right.path))
        }
        const partial = payload !== null && (payload.partial === true || payload.incomplete === true)

        const sections = []
        if (inactive.length > 0) {
            sections.push(h('section', { key: 'inactive', className: 'sm-stack' },
                h('h4', { className: 'sm-fs-13', style: { margin: 0, color: 'var(--dsw-alias-label-primary)', fontWeight: 500 } }, t('diag.section.inactive')),
                inactive.slice().sort(sortByName).map(function (issue, index) {
                    return h(SmIssueCard, { key: smText(issue.id, 'inactive-' + String(index)), issue: issue })
                })))
        }
        if (attention.length > 0) {
            sections.push(h('section', { key: 'attention', className: 'sm-stack' },
                h('h4', { className: 'sm-fs-13', style: { margin: 0, color: 'var(--dsw-alias-label-primary)', fontWeight: 500 } }, t('diag.section.attention')),
                attention.slice().sort(sortByName).map(function (issue, index) {
                    return h(SmIssueCard, { key: smText(issue.id, 'attention-' + String(index)), issue: issue })
                })))
        }

        let body
        if (loading) {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                h('div', { className: 'sm-skeleton', style: { height: '64px' } }),
                h('div', { className: 'sm-skeleton', style: { height: '64px' } }),
                h('div', { className: 'sm-fs-13 sm-text-secondary' }, t('state.loading')))
        } else if (smDiagnostics.error !== null) {
            body = h('div', { className: 'sm-empty sm-empty-error' },
                h('span', { className: 'sm-empty-icon' }, icon('alert', 28)),
                h('div', { className: 'sm-empty-title' }, t('state.error.diag.title')),
                h('div', { className: 'sm-empty-body' }, smErrorMessage(smDiagnostics.error)),
                h(SmButton, { tone: 'secondary', onClick: function () { void smLoadDiagnostics() } }, t('action.retry')))
        } else if (issues.length === 0) {
            body = h('div', { className: 'sm-empty' },
                h('span', { className: 'sm-empty-icon', style: { color: 'var(--dsw-alias-state-success-primary)' } }, icon('check', 32)),
                h('div', { className: 'sm-empty-title' }, t('empty.diag.title')),
                h('div', { className: 'sm-empty-body' }, t('empty.diag.body')))
        } else {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
                partial ? h(SmBanner, { tone: 'warn' },
                    h('span', null, t('diag.partial')),
                    h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: function () { void smLoadDiagnostics() } }, t('action.retry'))) : null,
                sections,
                h('div', { className: 'sm-fs-11', style: { color: 'var(--dsw-alias-label-caption)', lineHeight: '1.5' } }, t('diag.note')))
        }

        return h('div', {
            className: 'sm-drawer-mask sm-drawer-backdrop',
            onMouseDown: function (event) {
                if (event.target !== event.currentTarget) return
                if (smModalStack.length > 0) return
                smCloseDiagnostics()
            },
        },
        h('aside', {
            className: 'sm-drawer sm-diagnostics',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('diag.title'),
            style: { width: 'min(420px, 92vw)' },
        },
        h('div', { className: 'sm-drawer-head' },
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
                h('h3', { className: 'sm-dialog-title' }, t('diag.title')),
                h('div', { className: 'sm-fs-12 sm-text-secondary' },
                    t('diag.summary', { active: inactive.length, attention: attention.length }) + ' · ' + t('diag.checkedAt', { time: checkedAt > 0 ? fmtTime(checkedAt) : '—' }))),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
                h(SmButton, { tone: 'secondary', style: { height: '28px' }, disabled: loading, onClick: function () { void smLoadDiagnostics() } }, loading ? t('diag.rechecking') : t('diag.recheck')),
                h('button', {
                    type: 'button',
                    className: 'sm-icon-btn',
                    'aria-label': t('action.close'),
                    onClick: smCloseDiagnostics,
                }, icon('x', 16)))),
        h('div', { className: 'sm-drawer-body', style: { flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '12px' } }, body)))
    }

    function renderDiagnosticsDrawer() {
        if (!smDiagnostics.open) return null
        return h(SmDiagnosticsDrawer)
    }
