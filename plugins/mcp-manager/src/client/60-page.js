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
      }, [fallback])
      return fontSize
    }

    /** Transient toast queue; each entry auto-dismisses after 3s. */
    function useToasts() {
      const [toasts, setToasts] = useState([])
      const toastSeq = useRef(0)
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
      return { toasts: toasts, pushToast: pushToast, dismissToast: dismissToast }
    }

    /** Page data: load / poll `state` and derive the list rows plus banners. */
    function useMcpData(tRef) {
      const [data, setData] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [unauthorized, setUnauthorized] = useState(false)
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
      const rows = isObject(data) && Array.isArray(data.rows) ? data.rows : []
      const warnings = isObject(data) && Array.isArray(data.warnings) ? data.warnings.map((entry) => textOf(entry)).filter((entry) => entry !== '') : []
      return { data: data, loading: loading, error: error, unauthorized: unauthorized, rows: rows, warnings: warnings, load: load }
    }

    /** Row-level actions: enable toggle and the toolbar "test all" probe. */
    function useServerActions(t, rows, pushToast, load) {
      const [busy, setBusy] = useState(false)
      const [testingAll, setTestingAll] = useState(false)

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

      return { busy: busy, testingAll: testingAll, toggleEnabled: toggleEnabled, testAll: testAll }
    }

    /** Editor / delete dialog state, focus return and the close / save / delete handlers. */
    function useMcpDialogs(t, pushToast, load) {
      const [editor, setEditor] = useState(null)
      const [deleteTarget, setDeleteTarget] = useState(null)
      const [deleting, setDeleting] = useState(false)
      const returnFocus = useRef(null)

      // 视图切换（弹窗打开/关闭）时立即收起残留浮层。
      useEffect(() => {
        hideTooltip()
      }, [editor, deleteTarget])

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

      function closeDelete() {
        setDeleteTarget(null)
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

      return {
        editor: editor,
        deleteTarget: deleteTarget,
        deleting: deleting,
        returnFocus: returnFocus,
        openEditor: openEditor,
        closeEditor: closeEditor,
        handleSaved: handleSaved,
        requestDelete: requestDelete,
        closeDelete: closeDelete,
        confirmDelete: confirmDelete,
      }
    }

    function McpPage(props) {
      const bound = props !== null && props !== undefined && typeof props.t === 'function' ? props.t : activeT
      const t = typeof bound === 'function' ? bound : function fallback(key) { return key }
      const tRef = useRef(t)
      tRef.current = t

      const [query, setQuery] = useState('')
      const toasts = useToasts()
      const state = useMcpData(tRef)
      const actions = useServerActions(t, state.rows, toasts.pushToast, state.load)
      const dialogs = useMcpDialogs(t, toasts.pushToast, state.load)
      const fontSize = useHostFontSize(isObject(state.data) && Number.isFinite(state.data.fontSize) ? state.data.fontSize : 14)
      return h(
        'div',
        { className: 'mm-root', style: { '--ds-fs': fontSize + 'px' } },
        h(TooltipLayer),
        h(PageHeader, {
          t: t,
          query: query,
          onQueryChange: setQuery,
          testingAll: actions.testingAll,
          busy: actions.busy,
          hasData: state.data !== null,
          warnings: state.warnings,
          error: state.error,
          onTestAll: actions.testAll,
          onAdd: () => dialogs.openEditor('create', null),
        }),
        h(ServerList, {
          t: t,
          rows: state.rows,
          query: query,
          loading: state.loading,
          hasData: state.data !== null,
          error: state.error,
          unauthorized: state.unauthorized,
          busy: actions.busy,
          testingAll: actions.testingAll,
          onRetry: state.load,
          onToggleEnabled: actions.toggleEnabled,
          onEdit: (target) => dialogs.openEditor('edit', target),
          onDelete: dialogs.requestDelete,
        }),
        dialogs.editor !== null
          ? h(EditorDialog, {
            key: 'editor:' + dialogs.editor.mode + ':' + (isObject(dialogs.editor.row) ? textOf(dialogs.editor.row.id) : 'new'),
            t: t,
            mode: dialogs.editor.mode,
            row: dialogs.editor.row,
            returnFocus: dialogs.returnFocus.current,
            pushToast: toasts.pushToast,
            onClose: dialogs.closeEditor,
            onSaved: dialogs.handleSaved,
          })
          : null,
        dialogs.deleteTarget !== null
          ? h(DeleteDialog, {
            t: t,
            row: dialogs.deleteTarget,
            busy: dialogs.deleting,
            returnFocus: dialogs.returnFocus.current,
            onClose: dialogs.closeDelete,
            onConfirm: dialogs.confirmDelete,
          })
          : null,
        h(ToastHost, { toasts: toasts.toasts, dismissLabel: t('action.close'), onDismiss: toasts.dismissToast }),
      )
    }
