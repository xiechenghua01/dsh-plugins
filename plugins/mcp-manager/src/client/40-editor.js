    /* ------------------------------------------------------------------ *
     * Editor state.                                                      *
     *                                                                    *
     * One hook per concern (§6.3): draft, policy, probe, JSON tab, test  *
     * and save. The dialog in 44-editor-dialog.js only composes them.    *
     * ------------------------------------------------------------------ */

    function useEditorDraft(initializer) {
      const [draft, setDraft] = useState(initializer)

      function setField(key, value) {
        setDraft((prev) => {
          const next = Object.assign({}, prev)
          next[key] = value
          return next
        })
      }

      function setArgsText(value) {
        setDraft((prev) => Object.assign({}, prev, { argsText: value, argsDirty: true }))
      }

      function updateRow(listKey, index, field, value) {
        setDraft((prev) => {
          const rows = prev[listKey].slice()
          if (rows[index] === undefined) return prev
          rows[index] = Object.assign({}, rows[index], { [field]: value })
          const next = Object.assign({}, prev)
          next[listKey] = rows
          return next
        })
      }

      function addRow(listKey) {
        setDraft((prev) => {
          const next = Object.assign({}, prev)
          next[listKey] = prev[listKey].concat([{ key: '', value: '' }])
          return next
        })
      }

      function removeRow(listKey, index) {
        setDraft((prev) => {
          const next = Object.assign({}, prev)
          next[listKey] = prev[listKey].filter((entry, position) => position !== index)
          return next
        })
      }

      return {
        draft: draft,
        setDraft: setDraft,
        setField: setField,
        setArgsText: setArgsText,
        updateRow: updateRow,
        addRow: addRow,
        removeRow: removeRow,
      }
    }

    function useEditorPolicy(initializer) {
      const [policy, setPolicyState] = useState(initializer)
      const policyRef = useRef(policy)

      // Mirror every policy write into a ref synchronously so an in-flight probe merges its
      // response against the policy as it is now, not the one captured when the probe started.
      function setPolicy(next) {
        const value = typeof next === 'function' ? next(policyRef.current) : next
        policyRef.current = value
        setPolicyState(value)
      }

      function setToolPolicy(name, next) {
        setPolicy((prev) => {
          const copy = Object.assign({}, prev)
          if (next === 'default') delete copy[name]
          else copy[name] = next
          return copy
        })
      }

      return { policy: policy, policyRef: policyRef, setPolicy: setPolicy, setToolPolicy: setToolPolicy }
    }

    /** Report fetched tools, noting the server-reported total when it differs. */
    function probeMessageOf(t, row, count) {
      const known = isObject(row) && Number.isFinite(row.toolCount) ? row.toolCount : null
      if (known !== null && known > count) return t('editor.toolsProbedTotal', { count: count, total: known })
      return t('editor.toolsProbed', { count: count })
    }

    function useEditorProbe(options) {
      const t = options.t
      const pushToast = options.pushToast
      const [probedTools, setProbedTools] = useState(options.initialTools)
      const [probeState, setProbeState] = useState(() => (options.initialHasProbe
        ? { phase: 'ok', message: t('editor.toolsProbed', { count: options.initialTools.length }) }
        : { phase: 'idle', message: t('editor.toolsIdle') }))
      const [toolFilter, setToolFilter] = useState('')
      const [advancedOpen, setAdvancedOpen] = useState(false)

      async function runProbe(silent) {
        const values = draftValues(options.draft, options.policy)
        let validation = ''
        if (values.transport === 'sse') validation = t('editor.sseBlocked')
        else if (values.transport === 'stdio' && values.command === '') validation = t('editor.validationCommand')
        else if (values.transport !== 'stdio' && values.url === '') validation = t('editor.validationUrl')
        if (validation !== '') {
          if (silent !== true) {
            setProbeState({ phase: 'error', message: validation })
            pushToast('err', validation)
          }
          return { ok: false, error: { message: validation } }
        }
        const name = values.serverName !== '' ? values.serverName : 'probe-server'
        setProbeState({ phase: 'probing', message: '' })
        try {
          // Prefer the harness's own live connection: some MCP servers (searxng among them)
          // allow a single concurrent session and answer a second one with 503 "Server busy".
          let live = null
          try {
            live = await callApi('connectedTools', { serverName: name })
          } catch {
            live = null
          }
          if (isObject(live) && live.connected === true && Array.isArray(live.tools) && live.tools.length > 0) {
            const mergedLive = mergeTools(live.tools, [], options.policyRef.current)
            setProbedTools(mergedLive)
            setProbeState({ phase: 'ok', message: probeMessageOf(t, options.row, mergedLive.length) })
            if (silent !== true) pushToast('ok', t('toast.probeOk', { count: mergedLive.length }))
            return { ok: true, tools: live.tools, toolCount: live.tools.length }
          }
          const config = cleanHostConfig(values)
          config.serverName = name
          const payload = await callApi('probe', { config: config })
          const result = isObject(payload.result) ? payload.result : {}
          if (result.ok === true) {
            const tools = Array.isArray(result.tools) ? result.tools : []
            // Replace the previous probe result; only tools that still carry a custom policy
            // in the *latest* policy (it may have been reset while probing) but were not
            // returned this time survive (same rule as the prototype).
            const merged = mergeTools(tools, [], options.policyRef.current)
            setProbedTools(merged)
            setProbeState({ phase: 'ok', message: probeMessageOf(t, options.row, merged.length) })
            if (silent !== true) pushToast('ok', t('toast.probeOk', { count: merged.length }))
            return result
          }
          const message = isObject(result.error) && textOf(result.error.message) !== '' ? textOf(result.error.message) : t('common.unknownError')
          setProbeState({ phase: 'error', message: t('editor.toolsFailed', { message: message }) })
          if (silent !== true) pushToast('err', t('toast.probeFail', { message: message }))
          return result
        } catch (error) {
          const message = describeError(t, error)
          setProbeState({ phase: 'error', message: t('editor.toolsFailed', { message: message }) })
          if (silent !== true) pushToast('err', t('toast.probeFail', { message: message }))
          return { ok: false, error: { message: message } }
        }
      }

      function toggleAdvanced() {
        const next = !advancedOpen
        setAdvancedOpen(next)
        if (next === true && probeState.phase !== 'ok' && probeState.phase !== 'probing') {
          runProbe(true)
        }
      }

      return {
        probedTools: probedTools,
        setProbedTools: setProbedTools,
        probeState: probeState,
        toolFilter: toolFilter,
        setToolFilter: setToolFilter,
        advancedOpen: advancedOpen,
        toggleAdvanced: toggleAdvanced,
        runProbe: runProbe,
      }
    }

    function parseEditorJsonValues(t, text, baseDraft) {
      const raw = textOf(text).trim()
      if (raw === '') return { ok: false, message: t('editor.jsonEmpty') }
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (error) {
        return { ok: false, message: t('editor.jsonInvalid', { message: messageOf(error) }) }
      }
      const extracted = extractServerNode(parsed)
      if (extracted === null) return { ok: false, message: t('editor.jsonShape') }
      const applied = applyParsedNode(baseDraft, extracted.node)
      const nextDraft = extracted.id !== '' ? Object.assign({}, applied.draft, { serverName: extracted.id }) : applied.draft
      return { ok: true, draft: nextDraft, policy: applied.policy, name: nextDraft.serverName }
    }

    function useEditorJson(options) {
      const t = options.t
      const [tab, setTab] = useState('form')
      const [jsonText, setJsonText] = useState('')
      const [jsonFeedback, setJsonFeedback] = useState({ kind: 'ok', text: '' })

      function syncJsonFromForm() {
        const text = JSON.stringify(cleanJsonObject(draftValues(options.draft, options.policy)), null, 2)
        setJsonText(text)
        setJsonFeedback({ kind: 'ok', text: t('editor.jsonValid') })
        return text
      }

      function parseJsonText(text) {
        const result = parseEditorJsonValues(t, text, options.draft)
        if (result.ok !== true) {
          setJsonFeedback({ kind: 'err', text: result.message })
          return false
        }
        options.setDraft(result.draft)
        options.setPolicy(result.policy)
        options.setProbedTools((prev) => mergeTools([], prev, result.policy))
        setJsonFeedback({ kind: 'ok', text: t('editor.jsonParsed', { name: result.name !== '' ? result.name : 'mcp-server' }) })
        return true
      }

      function handleJsonChange(text) {
        setJsonText(text)
        if (textOf(text).trim() === '') {
          setJsonFeedback({ kind: 'err', text: t('editor.jsonEmpty') })
          return
        }
        parseJsonText(text)
      }

      function switchTab(next) {
        if (next === tab) return
        if (next === 'json') {
          syncJsonFromForm()
          setTab('json')
          return
        }
        if (parseJsonText(jsonText)) setTab('form')
      }

      async function copyJson() {
        const text = tab === 'json' ? jsonText : syncJsonFromForm()
        const ok = await copyText(text)
        options.pushToast(ok === true ? 'ok' : 'err', ok === true ? t('toast.copied') : t('toast.copyFailed'))
      }

      function fillSample() {
        const text = JSON.stringify(JSON_SAMPLE, null, 2)
        setJsonText(text)
        if (parseJsonText(text)) options.pushToast('ok', t('toast.jsonSample'))
      }

      return {
        tab: tab,
        jsonText: jsonText,
        jsonFeedback: jsonFeedback,
        setJsonFeedback: setJsonFeedback,
        switchTab: switchTab,
        handleJsonChange: handleJsonChange,
        copyJson: copyJson,
        fillSample: fillSample,
      }
    }

    function useEditorTest(t, runProbe) {
      const [testing, setTesting] = useState(false)
      const [testResult, setTestResult] = useState({ kind: 'idle', text: '' })

      async function handleTest() {
        if (testing === true) return
        setTesting(true)
        setTestResult({ kind: 'busy', text: t('editor.testing') })
        const result = await runProbe(true)
        if (isObject(result) && result.ok === true) {
          const ms = typeof result.durationMs === 'number' && Number.isFinite(result.durationMs) ? Math.round(result.durationMs) : 0
          const tools = Array.isArray(result.tools) ? result.tools.length : (typeof result.toolCount === 'number' ? result.toolCount : 0)
          setTestResult({ kind: 'ok', text: t('editor.testOk', { ms: ms, tools: tools }) })
        } else {
          const message = isObject(result) && isObject(result.error) && textOf(result.error.message) !== ''
            ? textOf(result.error.message)
            : t('common.unknownError')
          setTestResult({ kind: 'err', text: t('editor.testFail', { message: message }) })
        }
        setTesting(false)
      }

      return { testing: testing, testResult: testResult, handleTest: handleTest }
    }

    function editorValidationMessage(t, values, draft) {
      if (!SERVER_NAME_PATTERN.test(values.serverName)) return t('editor.validationName')
      if (values.transport === 'sse') return t('editor.sseBlocked')
      if (values.transport === 'stdio' && values.command === '') return t('editor.validationCommand')
      if (values.transport !== 'stdio' && (values.url === '' || !HTTP_URL_PATTERN.test(values.url))) return t('editor.validationUrl')
      if (draft.timeoutText.trim() !== '' && (!Number.isFinite(values.timeout) || values.timeout < 1000 || values.timeout > 3600000)) return t('editor.validationTimeout')
      if (draft.retriesText.trim() !== '' && (!Number.isFinite(values.retries) || values.retries < 1 || values.retries > 1000)) return t('editor.validationRetries')
      return ''
    }

    function useEditorSave(options) {
      const t = options.t
      const [saving, setSaving] = useState(false)

      async function handleSave() {
        if (saving === true) return
        let valuesDraft = options.draft
        let valuesPolicy = options.policy
        if (options.tab === 'json') {
          const parsed = parseEditorJsonValues(t, options.jsonText, options.draft)
          if (parsed.ok !== true) {
            options.setJsonFeedback({ kind: 'err', text: parsed.message })
            options.pushToast('err', t('editor.jsonBlocked'))
            return
          }
          valuesDraft = parsed.draft
          valuesPolicy = parsed.policy
          options.setDraft(valuesDraft)
          options.setPolicy(valuesPolicy)
        }
        const values = draftValues(valuesDraft, valuesPolicy)
        const validation = editorValidationMessage(t, values, valuesDraft)
        if (validation !== '') {
          options.pushToast('err', validation)
          return
        }
        const config = cleanHostConfig(values)
        const extra = cleanExtra(values, options.mode === 'edit' && isObject(options.row) ? options.row.extra : null)
        setSaving(true)
        try {
          if (options.mode === 'edit' && isObject(options.row)) {
            await callApi('update', { id: options.row.id, level: options.row.level, config: config, extra: extra })
            options.pushToast('ok', t('toast.updated', { name: values.serverName }))
          } else {
            await callApi('create', { level: 'workspace', config: config, extra: extra })
            options.pushToast('ok', t('toast.created', { name: values.serverName }))
          }
          if (typeof options.onSaved === 'function') options.onSaved()
        } catch (error) {
          options.pushToast('err', t('toast.saveFailed', { message: describeError(t, error) }))
        } finally {
          setSaving(false)
        }
      }

      return { saving: saving, handleSave: handleSave }
    }

    /** Counts and the "customized" badge condition for the advanced section. */
    function editorSummaryOf(draft, policy) {
      let autoCount = 0
      let disabledCount = 0
      for (const name of Object.keys(policy)) {
        if (policy[name] === 'auto') autoCount += 1
        else if (policy[name] === 'disabled') disabledCount += 1
      }
      const timeoutValue = parseIntStrict(draft.timeoutText)
      const retriesValue = parseIntStrict(draft.retriesText)
      const customized = (draft.transport === 'stdio' && draft.cwd.trim() !== '')
        || (Number.isFinite(timeoutValue) && timeoutValue !== DEFAULT_TIMEOUT_MS)
        || (Number.isFinite(retriesValue) && retriesValue !== DEFAULT_MAX_RETRIES)
        || (draft.transport !== 'stdio' && (draft.oauthClientId.trim() !== '' || draft.oauthScopes.trim() !== ''))
        || Object.keys(policy).length > 0
      return { autoCount: autoCount, disabledCount: disabledCount, customized: customized }
    }

