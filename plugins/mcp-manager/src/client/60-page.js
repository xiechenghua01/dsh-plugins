    /* ------------------------------------------------------------------ *
     * Settings page.                                                     *
     * ------------------------------------------------------------------ */

    /** The user's Settings font size (`ui-theme.fontSize`), clamped to the supported 10–24 range. */
    function normalizeHostFontSize(value) {
      const size = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 14
      return Math.min(24, Math.max(10, size))
    }

    /** Read the live font size from the host theme service; fall back to the Host payload. */
    function readHostFontSize(fallback) {
      const theme = themeService
      if (theme !== null && theme !== undefined && typeof theme.getTheme === 'function') {
        try {
          const snapshot = theme.getTheme()
          if (isObject(snapshot) && isObject(snapshot.fontSizes)) return normalizeHostFontSize(snapshot.fontSizes.text)
        } catch (error) {
          /* fall through to the Host-provided value */
        }
      }
      return normalizeHostFontSize(fallback)
    }

    /** Track `ui-theme` font changes while the page is mounted (§3.1 / §3.2). */
    function useHostFontSize(fallback) {
      const [fontSize, setFontSize] = useState(() => readHostFontSize(fallback))
      useEffect(() => {
        setFontSize(readHostFontSize(fallback))
        if (pluginCtx === null || pluginCtx === undefined || typeof pluginCtx.on !== 'function') return undefined
        const off = pluginCtx.on('theme/change', (snapshot) => {
          if (isObject(snapshot) && isObject(snapshot.fontSizes)) setFontSize(normalizeHostFontSize(snapshot.fontSizes.text))
        })
        return typeof off === 'function' ? off : undefined
      }, [])
      return fontSize
    }

    function SkeletonList(props) {
      return h(
        'div',
        { className: 'mm-list', role: 'status', 'aria-busy': 'true', 'aria-label': props.label },
        [0, 1, 2].map((index) => h(
          'div',
          { key: index, className: 'mm-skeleton-row' },
          h('span', { className: 'mm-skeleton-line mm-skeleton-name' }),
          h('span', { className: 'mm-skeleton-line mm-skeleton-summary' }),
        )),
      )
    }

    function McpPage(props) {
      const bound = props !== null && props !== undefined && typeof props.t === 'function' ? props.t : activeT
      const t = typeof bound === 'function' ? bound : function fallback(key) { return key }
      const tRef = useRef(t)
      tRef.current = t

      const [data, setData] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [unauthorized, setUnauthorized] = useState(false)
      const [query, setQuery] = useState('')
      const [expanded, setExpanded] = useState({})
      const [testingIds, setTestingIds] = useState({})
      const [testingAll, setTestingAll] = useState(false)
      const [busy, setBusy] = useState(false)
      const [editor, setEditor] = useState(null)
      const [deleteTarget, setDeleteTarget] = useState(null)
      const [deleting, setDeleting] = useState(false)
      const [toasts, setToasts] = useState([])
      const toastSeq = useRef(0)
      const returnFocus = useRef(null)

      const pushToast = useCallback((kind, text) => {
        toastSeq.current += 1
        const id = toastSeq.current
        setToasts((prev) => prev.concat([{ id: id, kind: kind, text: text }]))
        setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id))
        }, 3000)
      }, [])

      const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, [])

      const load = useCallback(async () => {
        try {
          const payload = await callApi('state', {})
          setData(payload)
          setError(null)
          setUnauthorized(false)
        } catch (failure) {
          if (failure !== null && failure !== undefined && failure.code === 'unauthorized') {
            setUnauthorized(true)
            setError(null)
          } else {
            setError(describeError(tRef.current, failure))
          }
        } finally {
          setLoading(false)
        }
      }, [])

      useEffect(() => {
        load()
        const timer = setInterval(load, POLL_MS)
        return () => {
          clearInterval(timer)
        }
      }, [load])

      // 视图切换（弹窗打开/关闭）时立即收起残留浮层。
      useEffect(() => {
        hideTooltip()
      }, [editor, deleteTarget])

      const rows = isObject(data) && Array.isArray(data.rows) ? data.rows : []
      const warnings = isObject(data) && Array.isArray(data.warnings) ? data.warnings.map((entry) => textOf(entry)).filter((entry) => entry !== '') : []
      const trimmedQuery = query.trim().toLowerCase()
      const filteredRows = trimmedQuery === ''
        ? rows
        : rows.filter((row) => {
          const config = isObject(row.config) ? row.config : {}
          const target = textOf(row.target) !== '' ? textOf(row.target) : targetOfConfig(config)
          const transport = isObject(row.config) ? transportOf(row.config) : textOf(row.transport)
          const haystack = [textOf(row.serverName), target, textOf(row.id), transport].join(' ').toLowerCase()
          return haystack.includes(trimmedQuery)
        })

      async function toggleEnabled(row) {
        if (busy === true) return
        const nextEnabled = row.disabled === true
        setBusy(true)
        try {
          await callApi('setEnabled', { id: row.id, level: row.level, enabled: nextEnabled })
          pushToast('ok', nextEnabled === true ? t('toast.enabled', { name: row.serverName }) : t('toast.disabled', { name: row.serverName }))
          await load()
        } catch (failure) {
          pushToast('err', t('toast.operationFailed', { message: describeError(t, failure) }))
        } finally {
          setBusy(false)
        }
      }

      async function testOne(row) {
        if (testingIds[row.id] === true) return
        setTestingIds((prev) => {
          const next = Object.assign({}, prev)
          next[row.id] = true
          return next
        })
        try {
          const payload = await callApi('probe', { id: row.id, level: row.level })
          const result = isObject(payload.result) ? payload.result : {}
          if (result.ok === true) {
            const ms = typeof result.durationMs === 'number' && Number.isFinite(result.durationMs) ? Math.round(result.durationMs) : 0
            const tools = typeof result.toolCount === 'number' ? result.toolCount : (Array.isArray(result.tools) ? result.tools.length : 0)
            pushToast('ok', t('toast.testOk', { name: row.serverName, ms: ms, tools: tools }))
          } else {
            const message = isObject(result.error) && textOf(result.error.message) !== '' ? textOf(result.error.message) : t('common.unknownError')
            pushToast('err', t('toast.testFail', { name: row.serverName, message: message }))
          }
          await load()
        } catch (failure) {
          pushToast('err', t('toast.testFail', { name: row.serverName, message: describeError(t, failure) }))
        } finally {
          setTestingIds((prev) => {
            const next = Object.assign({}, prev)
            delete next[row.id]
            return next
          })
        }
      }

      async function testAll() {
        if (testingAll === true) return
        const enabledRows = rows.filter((row) => row.disabled !== true && row.readOnly !== true)
        if (enabledRows.length === 0) {
          pushToast('info', t('toast.testAllNone'))
          return
        }
        setTestingAll(true)
        try {
          await callApi('probeAll', {})
          pushToast('ok', t('toast.testAllDone', { count: enabledRows.length }))
          await load()
        } catch (failure) {
          pushToast('err', t('toast.operationFailed', { message: describeError(t, failure) }))
        } finally {
          setTestingAll(false)
        }
      }

      function openEditor(mode, row) {
        returnFocus.current = typeof document !== 'undefined' && document !== null ? document.activeElement : null
        setEditor({ mode: mode, row: row })
      }

      function closeEditor() {
        setEditor(null)
      }

      function handleSaved() {
        setEditor(null)
        load()
      }

      function requestDelete(row) {
        returnFocus.current = typeof document !== 'undefined' && document !== null ? document.activeElement : null
        setDeleteTarget(row)
      }

      async function confirmDelete() {
        if (deleteTarget === null || deleting === true) return
        setDeleting(true)
        try {
          await callApi('remove', { id: deleteTarget.id, level: deleteTarget.level })
          pushToast('ok', t('toast.deleted', { name: deleteTarget.serverName }))
          setDeleteTarget(null)
          await load()
        } catch (failure) {
          pushToast('err', t('toast.operationFailed', { message: describeError(t, failure) }))
        } finally {
          setDeleting(false)
        }
      }

      function toggleExpanded(row) {
        setExpanded((prev) => {
          const next = Object.assign({}, prev)
          if (next[row.id] === true) delete next[row.id]
          else next[row.id] = true
          return next
        })
      }

      const header = h(
        'div',
        { className: 'mm-head' },
        h(
          'div',
          { className: 'mm-head-left' },
          h('h2', { className: 'mm-title' }, t('page.title')),
          h(HelpDot, { tip: t('page.help') }),
        ),
        h(
          'div',
          { className: 'mm-head-actions' },
          h(
            'div',
            { className: 'mm-search' },
            h(Svg, { d: ICON_SEARCH, size: 14, className: 'mm-search-icon' }),
            h('input', {
              className: 'mm-search-input',
              value: query,
              placeholder: t('page.searchPlaceholder'),
              'aria-label': t('page.searchPlaceholder'),
              spellCheck: false,
              onChange: (event) => setQuery(event.target.value),
            }),
          ),
          h(IconButton, {
            icon: ICON_ZAP,
            label: t('page.testAll'),
            tooltip: t('page.testAll'),
            className: 'mm-toolbar-btn',
            spin: testingAll === true,
            disabled: busy === true,
            onClick: testAll,
          }),
          h(
            Button,
            { variant: 'primary', icon: ICON_PLUS, onClick: () => openEditor('create', null) },
            h('span', null, t('page.add')),
          ),
        ),
      )

      const warningsBanner = warnings.length > 0
        ? h(
          'div',
          { className: 'mm-warn-banner' },
          h('span', { className: 'mm-warn-label' }, t('page.warnings')),
          h('span', null, warnings.join(' · ')),
        )
        : null

      const errorBanner = error !== null && data !== null
        ? h('div', { className: 'mm-error-banner' }, error)
        : null

      let content
      if (unauthorized === true) {
        content = h(StatePanel, { title: t('page.unauthorized'), actionLabel: t('page.retry'), onAction: load })
      } else if (error !== null && data === null) {
        content = h(StatePanel, { title: t('page.error'), hint: error, actionLabel: t('page.retry'), onAction: load })
      } else if (loading === true && data === null) {
        content = h(SkeletonList, { label: t('page.loading') })
      } else if (filteredRows.length === 0) {
        content = h(StatePanel, { icon: ICON_PLUG, title: t('list.empty') })
      } else {
        content = h(
          'div',
          { className: 'mm-list' },
          filteredRows.map((row) => h(ServerRow, {
            key: textOf(row.level) + ':' + textOf(row.id),
            t: t,
            row: row,
            busy: busy,
            testing: testingIds[row.id] === true,
            testingAll: testingAll,
            expanded: expanded[row.id] === true,
            onToggleExpand: () => toggleExpanded(row),
            onToggleEnabled: toggleEnabled,
            onTest: testOne,
            onEdit: (target) => openEditor('edit', target),
            onDelete: requestDelete,
          })),
        )
      }

      const fontSize = useHostFontSize(isObject(data) && Number.isFinite(data.fontSize) ? data.fontSize : 14)
      return h(
        'div',
        { className: 'mm-root', style: { '--ds-fs': fontSize + 'px' } },
        h(TooltipLayer),
        header,
        warningsBanner,
        errorBanner,
        content,
        editor !== null
          ? h(EditorDialog, {
            key: 'editor:' + editor.mode + ':' + (isObject(editor.row) ? textOf(editor.row.id) : 'new'),
            t: t,
            mode: editor.mode,
            row: editor.row,
            returnFocus: returnFocus.current,
            pushToast: pushToast,
            onClose: closeEditor,
            onSaved: handleSaved,
          })
          : null,
        deleteTarget !== null
          ? h(DeleteDialog, {
            t: t,
            row: deleteTarget,
            busy: deleting,
            returnFocus: returnFocus.current,
            onClose: () => setDeleteTarget(null),
            onConfirm: confirmDelete,
          })
          : null,
        h(ToastHost, { toasts: toasts, dismissLabel: t('action.close'), onDismiss: dismissToast }),
      )
    }

