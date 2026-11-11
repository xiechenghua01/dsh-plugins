    /* ------------------------------------------------------------------ *
     * Editor dialog.                                                     *
     * ------------------------------------------------------------------ */

    function EditorDialog(props) {
      const t = props.t
      const mode = props.mode
      const row = props.row
      const pushToast = props.pushToast

      const initialTools = mode === 'edit' && isObject(row) ? probedToolsFromRow(row) : []
      const initialProbe = mode === 'edit' && isObject(row) && isObject(row.lastProbe) ? row.lastProbe : null
      const initialHasProbe = isObject(initialProbe)
        && ((Array.isArray(initialProbe.tools) && initialProbe.tools.length > 0)
          || (Array.isArray(initialProbe.toolNames) && initialProbe.toolNames.length > 0))
      const [draft, setDraft] = useState(() => (mode === 'edit' && isObject(row) ? draftFromRow(row) : emptyDraft()))
      const [policy, setPolicyState] = useState(() => (mode === 'edit' && isObject(row) ? policyFromRow(row) : {}))
      const policyRef = useRef(policy)
      const [probedTools, setProbedTools] = useState(initialTools)
      const [probeState, setProbeState] = useState(() => (initialHasProbe
        ? { phase: 'ok', message: t('editor.toolsProbed', { count: initialTools.length }) }
        : { phase: 'idle', message: t('editor.toolsIdle') }))
      const [toolFilter, setToolFilter] = useState('')
      const [advancedOpen, setAdvancedOpen] = useState(false)
      const [tab, setTab] = useState('form')
      const [jsonText, setJsonText] = useState('')
      const [jsonFeedback, setJsonFeedback] = useState({ kind: 'ok', text: '' })
      const [testing, setTesting] = useState(false)
      const [testResult, setTestResult] = useState({ kind: 'idle', text: '' })
      const [saving, setSaving] = useState(false)

      // Mirror every policy write into a ref synchronously so an in-flight probe merges its
      // response against the policy as it is now, not the one captured when the probe started.
      function setPolicy(next) {
        const value = typeof next === 'function' ? next(policyRef.current) : next
        policyRef.current = value
        setPolicyState(value)
      }

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

      function setToolPolicy(name, next) {
        setPolicy((prev) => {
          const copy = Object.assign({}, prev)
          if (next === 'default') delete copy[name]
          else copy[name] = next
          return copy
        })
      }

      function syncJsonFromForm() {
        const text = JSON.stringify(cleanJsonObject(draftValues(draft, policy)), null, 2)
        setJsonText(text)
        setJsonFeedback({ kind: 'ok', text: t('editor.jsonValid') })
        return text
      }

      function parseJsonValues(text, baseDraft) {
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

      function parseJsonText(text) {
        const result = parseJsonValues(text, draft)
        if (result.ok !== true) {
          setJsonFeedback({ kind: 'err', text: result.message })
          return false
        }
        setDraft(result.draft)
        setPolicy(result.policy)
        setProbedTools((prev) => mergeTools([], prev, result.policy))
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
        pushToast(ok === true ? 'ok' : 'err', ok === true ? t('toast.copied') : t('toast.copyFailed'))
      }

      function fillSample() {
        const text = JSON.stringify(JSON_SAMPLE, null, 2)
        setJsonText(text)
        if (parseJsonText(text)) pushToast('ok', t('toast.jsonSample'))
      }

      /** Report fetched tools, noting the server-reported total when it differs. */
      function probeMessage(count) {
        const known = isObject(props.row) && Number.isFinite(props.row.toolCount) ? props.row.toolCount : null
        if (known !== null && known > count) return t('editor.toolsProbedTotal', { count: count, total: known })
        return t('editor.toolsProbed', { count: count })
      }

      async function runProbe(silent) {
        const values = draftValues(draft, policy)
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
            const mergedLive = mergeTools(live.tools, [], policyRef.current)
            setProbedTools(mergedLive)
            setProbeState({ phase: 'ok', message: probeMessage(mergedLive.length) })
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
            const merged = mergeTools(tools, [], policyRef.current)
            setProbedTools(merged)
            setProbeState({ phase: 'ok', message: probeMessage(merged.length) })
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

      async function handleSave() {
        if (saving === true) return
        let valuesDraft = draft
        let valuesPolicy = policy
        if (tab === 'json') {
          const parsed = parseJsonValues(jsonText, draft)
          if (parsed.ok !== true) {
            setJsonFeedback({ kind: 'err', text: parsed.message })
            pushToast('err', t('editor.jsonBlocked'))
            return
          }
          valuesDraft = parsed.draft
          valuesPolicy = parsed.policy
          setDraft(valuesDraft)
          setPolicy(valuesPolicy)
        }
        const values = draftValues(valuesDraft, valuesPolicy)
        if (!SERVER_NAME_PATTERN.test(values.serverName)) {
          pushToast('err', t('editor.validationName'))
          return
        }
        if (values.transport === 'sse') {
          pushToast('err', t('editor.sseBlocked'))
          return
        }
        if (values.transport === 'stdio' && values.command === '') {
          pushToast('err', t('editor.validationCommand'))
          return
        }
        if (values.transport !== 'stdio' && (values.url === '' || !HTTP_URL_PATTERN.test(values.url))) {
          pushToast('err', t('editor.validationUrl'))
          return
        }
        if (valuesDraft.timeoutText.trim() !== '' && (!Number.isFinite(values.timeout) || values.timeout < 1000 || values.timeout > 3600000)) {
          pushToast('err', t('editor.validationTimeout'))
          return
        }
        if (valuesDraft.retriesText.trim() !== '' && (!Number.isFinite(values.retries) || values.retries < 1 || values.retries > 1000)) {
          pushToast('err', t('editor.validationRetries'))
          return
        }
        const config = cleanHostConfig(values)
        const extra = cleanExtra(values, mode === 'edit' && isObject(row) ? row.extra : null)
        setSaving(true)
        try {
          if (mode === 'edit' && isObject(row)) {
            await callApi('update', { id: row.id, level: row.level, config: config, extra: extra })
            pushToast('ok', t('toast.updated', { name: values.serverName }))
          } else {
            await callApi('create', { level: 'workspace', config: config, extra: extra })
            pushToast('ok', t('toast.created', { name: values.serverName }))
          }
          if (typeof props.onSaved === 'function') props.onSaved()
        } catch (error) {
          pushToast('err', t('toast.saveFailed', { message: describeError(t, error) }))
        } finally {
          setSaving(false)
        }
      }

      const values = draftValues(draft, policy)
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
      const filterQuery = toolFilter.trim().toLowerCase()
      const filteredTools = filterQuery === ''
        ? probedTools
        : probedTools.filter((tool) => tool.name.toLowerCase().includes(filterQuery) || tool.description.toLowerCase().includes(filterQuery))
      const statusClass = probeState.phase === 'ok'
        ? ' mm-tools-status-ok'
        : probeState.phase === 'error'
          ? ' mm-tools-status-err'
          : probeState.phase === 'probing' ? ' mm-tools-status-warn' : ''
      const statusText = probeState.phase === 'probing'
        ? t('editor.toolsProbing')
        : probeState.message !== '' ? probeState.message : t('editor.toolsIdle')

      const tabs = h(Tabs, {
        value: tab,
        onChange: switchTab,
        items: [
          { value: 'form', label: t('editor.tabForm') },
          { value: 'json', label: t('editor.tabJson'), tip: t('action.jsonTip') },
        ],
      })

      function kvEditor(listKey, label, tip, keyPlaceholder, valuePlaceholder) {
        return h(
          'div',
          null,
          h(
            'div',
            { className: 'mm-label-row' },
            h(
              'span',
              { className: 'mm-field-label' },
              h('span', null, label),
              h(HelpDot, { tip: tip }),
            ),
            h('button', { type: 'button', className: 'mm-link-btn', onClick: () => addRow(listKey) }, t('action.add')),
          ),
          h(
            'div',
            { className: 'mm-kv' },
            draft[listKey].map((entry, index) => h(
              'div',
              { className: 'mm-kv-row', key: index },
              h('input', {
                className: 'mm-input mm-mono mm-kv-key',
                value: entry.key,
                placeholder: keyPlaceholder,
                spellCheck: false,
                onChange: (event) => updateRow(listKey, index, 'key', event.target.value),
              }),
              h('input', {
                className: 'mm-input mm-mono mm-kv-val',
                value: entry.value,
                placeholder: valuePlaceholder,
                spellCheck: false,
                onChange: (event) => updateRow(listKey, index, 'value', event.target.value),
              }),
              h(
                'button',
                Object.assign({
                  type: 'button',
                  className: 'mm-kv-del',
                  'aria-label': t('action.removeRow'),
                  onClick: () => removeRow(listKey, index),
                }, tooltipHandlers(t('action.removeRow'))),
                h(Svg, { d: ICON_X, size: 14 }),
              ),
            )),
          ),
        )
      }

      function toolRow(tool) {
        const current = policy[tool.name] !== undefined ? policy[tool.name] : 'default'
        const nameClass = current === 'auto' ? ' mm-tool-name-auto' : current === 'disabled' ? ' mm-tool-name-disabled' : ''
        return h(
          'div',
          { className: 'mm-tool-row', key: tool.name },
          h(
            'div',
            { className: 'mm-tool-info' },
            h('span', { className: 'mm-tool-name' + nameClass }, tool.name),
            tool.description !== '' ? h('span', { className: 'mm-tool-desc' }, tool.description) : null,
          ),
          h(Segmented, {
            value: current,
            onChange: (value) => setToolPolicy(tool.name, value),
            items: [
              { value: 'default', label: t('tool.default'), tip: t('tool.defaultTip') },
              { value: 'auto', label: t('tool.auto'), tip: t('tool.autoTip') },
              { value: 'disabled', label: t('tool.disabled'), tip: t('tool.disabledTip') },
            ],
          }),
        )
      }

      const toolsPanel = h(
        'div',
        { className: 'mm-tools-panel' },
        h(
          'div',
          { className: 'mm-tools-head' },
          h(
            'div',
            { className: 'mm-tools-title' },
            h('span', null, t('editor.toolsTitle')),
            h(HelpDot, { tip: t('editor.toolsTip') }),
            h('span', { className: 'mm-tools-status' + statusClass }, statusText),
          ),
          h(
            'button',
            Object.assign({
              type: 'button',
              className: 'mm-btn mm-btn-sm',
              disabled: probeState.phase === 'probing',
              onClick: () => runProbe(false),
            }, tooltipHandlers(t('action.probeTip'))),
            h(Svg, { d: ICON_REFRESH, size: 12, className: probeState.phase === 'probing' ? 'mm-spin-icon' : '' }),
            h('span', null, t('action.probe')),
          ),
        ),
        h(
          'div',
          { className: 'mm-tools-toolbar' },
          h('input', {
            className: 'mm-tools-filter',
            value: toolFilter,
            placeholder: t('editor.filterTools'),
            spellCheck: false,
            onChange: (event) => setToolFilter(event.target.value),
          }),
          h(
            'div',
            { className: 'mm-tools-batch' },
            h('span', null, t('editor.toolSummary', { auto: autoCount, disabled: disabledCount })),
            h('span', { className: 'mm-divider', 'aria-hidden': 'true' }),
            h('button', { type: 'button', className: 'mm-link-btn', onClick: () => {
              setPolicy((prev) => {
                const copy = Object.assign({}, prev)
                for (const tool of probedTools) copy[tool.name] = 'auto'
                return copy
              })
            } }, t('action.allAuto')),
            h('button', { type: 'button', className: 'mm-link-btn', onClick: () => setPolicy({}) }, t('action.resetDefault')),
          ),
        ),
        h(
          'div',
          { className: 'mm-tools-list' },
          filteredTools.length === 0
            ? h('div', { className: 'mm-tools-empty' }, t('editor.toolsEmpty'))
            : filteredTools.map(toolRow),
        ),
      )

      const stdioPanel = h(
        Fragment,
        null,
        h(
          Field,
          { label: t('editor.command'), tip: t('editor.commandTip'), required: true, requiredLabel: t('editor.required') },
          h('input', {
            className: 'mm-input mm-mono',
            value: draft.command,
            placeholder: t('editor.commandPlaceholder'),
            spellCheck: false,
            onChange: (event) => setField('command', event.target.value),
          }),
        ),
        h(
          Field,
          { label: t('editor.args'), tip: t('editor.argsTip') },
          h('textarea', {
            className: 'mm-input mm-mono mm-textarea',
            rows: 2,
            value: draft.argsText,
            placeholder: t('editor.argsPlaceholder'),
            spellCheck: false,
            onChange: (event) => setArgsText(event.target.value),
          }),
        ),
        kvEditor('envRows', t('editor.env'), t('editor.envTip'), t('editor.kvKeyEnv'), t('editor.kvValEnv')),
      )

      const remotePanel = h(
        Fragment,
        null,
        h(
          Field,
          { label: t('editor.url'), tip: t('editor.urlTip'), required: true, requiredLabel: t('editor.required') },
          h('input', {
            className: 'mm-input mm-mono',
            value: draft.url,
            placeholder: t('editor.urlPlaceholder'),
            spellCheck: false,
            onChange: (event) => setField('url', event.target.value),
          }),
        ),
        kvEditor('headersRows', t('editor.headers'), t('editor.headersTip'), t('editor.kvKeyHeader'), t('editor.kvValHeader')),
      )

      const advancedFields = draft.transport === 'stdio'
        ? h(
          'div',
          { className: 'mm-adv-grid' },
          h(
            Field,
            { label: t('editor.cwd'), tip: t('editor.cwdTip'), small: true },
            h('input', {
              className: 'mm-input mm-mono',
              value: draft.cwd,
              placeholder: t('editor.cwdPlaceholder'),
              spellCheck: false,
              onChange: (event) => setField('cwd', event.target.value),
            }),
          ),
          h(
            Field,
            { label: t('editor.timeout'), tip: t('editor.timeoutTip'), small: true },
            h('input', {
              className: 'mm-input mm-mono',
              type: 'number',
              value: draft.timeoutText,
              placeholder: t('editor.timeoutPlaceholder'),
              min: 1000,
              max: 3600000,
              step: 1000,
              onChange: (event) => setField('timeoutText', event.target.value),
            }),
          ),
          h(
            Field,
            { label: t('editor.retries'), tip: t('editor.retriesTip'), small: true },
            h('input', {
              className: 'mm-input mm-mono',
              type: 'number',
              value: draft.retriesText,
              placeholder: t('editor.retriesPlaceholder'),
              min: 1,
              max: 1000,
              step: 1,
              onChange: (event) => setField('retriesText', event.target.value),
            }),
          ),
        )
        : h(
          Fragment,
          null,
          h(
            'div',
            { className: 'mm-adv-grid mm-adv-grid-2' },
            h(
              Field,
              { label: t('editor.timeout'), tip: t('editor.timeoutTip'), small: true },
              h('input', {
                className: 'mm-input mm-mono',
                type: 'number',
                value: draft.timeoutText,
                placeholder: t('editor.timeoutPlaceholder'),
                min: 1000,
                max: 3600000,
                step: 1000,
                onChange: (event) => setField('timeoutText', event.target.value),
              }),
            ),
            h(
              Field,
              { label: t('editor.retries'), tip: t('editor.retriesTip'), small: true },
              h('input', {
                className: 'mm-input mm-mono',
                type: 'number',
                value: draft.retriesText,
                placeholder: t('editor.retriesPlaceholder'),
                min: 1,
                max: 1000,
                step: 1,
                onChange: (event) => setField('retriesText', event.target.value),
              }),
            ),
          ),
          h(
            'div',
            { className: 'mm-adv-grid mm-adv-grid-2' },
            h(
              Field,
              { label: t('editor.oauthClientId'), tip: t('editor.oauthClientIdTip'), small: true },
              h('input', {
                className: 'mm-input mm-mono',
                value: draft.oauthClientId,
                placeholder: t('editor.oauthClientIdPlaceholder'),
                spellCheck: false,
                onChange: (event) => setField('oauthClientId', event.target.value),
              }),
            ),
            h(
              Field,
              { label: t('editor.oauthScopes'), tip: t('editor.oauthScopesTip'), small: true },
              h('input', {
                className: 'mm-input mm-mono',
                value: draft.oauthScopes,
                placeholder: t('editor.oauthScopesPlaceholder'),
                spellCheck: false,
                onChange: (event) => setField('oauthScopes', event.target.value),
              }),
            ),
          ),
        )

      const advanced = h(
        'div',
        { className: 'mm-adv' },
        h(
          'button',
          {
            type: 'button',
            className: 'mm-adv-toggle',
            'aria-expanded': advancedOpen === true ? 'true' : 'false',
            onClick: toggleAdvanced,
          },
          h(
            'span',
            { className: 'mm-adv-title' },
            h('span', null, t('editor.advanced')),
            customized === true ? h('span', { className: 'mm-badge' }, t('editor.customized')) : null,
          ),
          h(Svg, { d: ICON_CHEVRON, size: 16, className: 'mm-chevron' + (advancedOpen === true ? ' mm-chevron-open' : '') }),
        ),
        advancedOpen === true
          ? h('div', { className: 'mm-adv-panel' }, advancedFields, toolsPanel)
          : null,
      )

      const formPanel = h(
        'div',
        { className: 'mm-form' },
        h(
          'div',
          { className: 'mm-grid-name' },
          h(
            Field,
            { label: t('editor.name'), tip: t('editor.nameTip'), required: true, requiredLabel: t('editor.required') },
            h('input', {
              className: 'mm-input mm-mono',
              value: draft.serverName,
              placeholder: t('editor.namePlaceholder'),
              spellCheck: false,
              onChange: (event) => setField('serverName', event.target.value),
            }),
          ),
          h(
            Field,
            { label: t('editor.transport'), tip: t('editor.transportTip') },
            h(
              'select',
              {
                className: 'mm-input mm-mono mm-select',
                value: draft.transport,
                onChange: (event) => setField('transport', event.target.value),
              },
              h('option', { value: 'stdio' }, 'stdio'),
              h('option', { value: 'streamable-http' }, 'streamable-http'),
              h('option', { value: 'sse' }, 'sse'),
            ),
          ),
        ),
        draft.transport === 'sse' ? h('p', { className: 'mm-hint mm-hint-warn' }, t('editor.sseHint')) : null,
        draft.transport === 'stdio' ? stdioPanel : remotePanel,
        advanced,
      )

      const jsonPanel = h(
        'div',
        { className: 'mm-json' },
        h(
          'div',
          { className: 'mm-json-toolbar' },
          h('span', null, t('editor.jsonHint')),
          h(
            'div',
            { className: 'mm-json-actions' },
            h(Button, { size: 'sm', onClick: fillSample }, t('action.pasteSample')),
            h(Button, { size: 'sm', onClick: copyJson }, t('action.copyConfig')),
          ),
        ),
        h('textarea', {
          className: 'mm-input mm-mono mm-textarea mm-json-area',
          value: jsonText,
          spellCheck: false,
          onChange: (event) => handleJsonChange(event.target.value),
        }),
        jsonFeedback.text !== ''
          ? h('div', { className: 'mm-feedback mm-feedback-' + (jsonFeedback.kind === 'ok' ? 'ok' : 'err') }, jsonFeedback.text)
          : null,
      )

      const footer = h(
        Fragment,
        null,
        h(
          'div',
          { className: 'mm-foot-left' },
          h(Button, {
            size: 'sm',
            disabled: testing === true,
            onClick: handleTest,
          }, t('action.test')),
          testResult.text !== ''
            ? h('span', { className: 'mm-test-result mm-test-' + testResult.kind }, testResult.text)
            : null,
        ),
        h(
          'div',
          { className: 'mm-foot-right' },
          h(Button, { variant: 'ghost', onClick: props.onClose }, t('action.cancel')),
          h(Button, { variant: 'primary', disabled: saving === true, loading: saving === true, onClick: handleSave }, t('action.save')),
        ),
      )

      return h(
        Dialog,
        {
          title: mode === 'edit' ? t('editor.editTitle') : t('editor.addTitle'),
          size: 'editor',
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          closeLabel: t('action.close'),
          closeTooltip: t('action.close'),
          headerExtra: tabs,
          footer: footer,
        },
        tab === 'json' ? jsonPanel : formPanel,
      )
    }

    /* ------------------------------------------------------------------ *
     * Delete confirmation.                                               *
     * ------------------------------------------------------------------ */

