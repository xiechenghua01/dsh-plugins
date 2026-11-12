    /* ------------------------------------------------------------------ *
     * Editor dialog: composes the state hooks with the form/JSON views.  *
     * ------------------------------------------------------------------ */

    function useEditorController(props) {
      const t = props.t
      const mode = props.mode
      const row = props.row
      const pushToast = props.pushToast

      const initialTools = mode === 'edit' && isObject(row) ? probedToolsFromRow(row) : []
      const initialProbe = mode === 'edit' && isObject(row) && isObject(row.lastProbe) ? row.lastProbe : null
      const initialHasProbe = isObject(initialProbe)
        && ((Array.isArray(initialProbe.tools) && initialProbe.tools.length > 0)
          || (Array.isArray(initialProbe.toolNames) && initialProbe.toolNames.length > 0))

      const draftState = useEditorDraft(() => (mode === 'edit' && isObject(row) ? draftFromRow(row) : emptyDraft()))
      const policyState = useEditorPolicy(() => (mode === 'edit' && isObject(row) ? policyFromRow(row) : {}))
      const probe = useEditorProbe({
        t: t,
        pushToast: pushToast,
        row: row,
        draft: draftState.draft,
        policy: policyState.policy,
        policyRef: policyState.policyRef,
        initialTools: initialTools,
        initialHasProbe: initialHasProbe,
      })
      const json = useEditorJson({
        t: t,
        pushToast: pushToast,
        draft: draftState.draft,
        policy: policyState.policy,
        setDraft: draftState.setDraft,
        setPolicy: policyState.setPolicy,
        setProbedTools: probe.setProbedTools,
      })
      const test = useEditorTest(t, probe.runProbe)
      const save = useEditorSave({
        t: t,
        pushToast: pushToast,
        mode: mode,
        row: row,
        tab: json.tab,
        draft: draftState.draft,
        policy: policyState.policy,
        setDraft: draftState.setDraft,
        setPolicy: policyState.setPolicy,
        jsonText: json.jsonText,
        setJsonFeedback: json.setJsonFeedback,
        onSaved: props.onSaved,
      })
      const summary = editorSummaryOf(draftState.draft, policyState.policy)

      function handleAllAuto() {
        policyState.setPolicy((prev) => {
          const copy = Object.assign({}, prev)
          for (const tool of probe.probedTools) copy[tool.name] = 'auto'
          return copy
        })
      }

      function handleResetDefault() {
        policyState.setPolicy({})
      }

      return {
        t: t,
        mode: mode,
        draftState: draftState,
        policyState: policyState,
        probe: probe,
        json: json,
        test: test,
        save: save,
        summary: summary,
        handleAllAuto: handleAllAuto,
        handleResetDefault: handleResetDefault,
      }
    }

    function EditorFooter(props) {
      const t = props.t
      return h(
        Fragment,
        null,
        h(
          'div',
          { className: 'mm-foot-left' },
          h(Button, {
            size: 'sm',
            disabled: props.testing === true,
            onClick: props.onTest,
          }, t('action.test')),
          props.testResult.text !== ''
            ? h('span', { className: 'mm-test-result mm-test-' + props.testResult.kind }, props.testResult.text)
            : null,
        ),
        h(
          'div',
          { className: 'mm-foot-right' },
          h(Button, { variant: 'ghost', onClick: props.onClose }, t('action.cancel')),
          h(Button, { variant: 'primary', disabled: props.saving === true, loading: props.saving === true, onClick: props.onSave }, t('action.save')),
        ),
      )
    }

    function EditorDialog(props) {
      const state = useEditorController(props)
      const t = state.t
      const mode = state.mode

      const tabs = h(Tabs, {
        value: state.json.tab,
        onChange: state.json.switchTab,
        items: [
          { value: 'form', label: t('editor.tabForm') },
          { value: 'json', label: t('editor.tabJson'), tip: t('action.jsonTip') },
        ],
      })

      const formPanel = h(EditorForm, {
        t: t,
        draft: state.draftState.draft,
        setField: state.draftState.setField,
        setArgsText: state.draftState.setArgsText,
        addRow: state.draftState.addRow,
        updateRow: state.draftState.updateRow,
        removeRow: state.draftState.removeRow,
        advanced: h(EditorAdvanced, {
          t: t,
          open: state.probe.advancedOpen,
          onToggle: state.probe.toggleAdvanced,
          customized: state.summary.customized,
          draft: state.draftState.draft,
          setField: state.draftState.setField,
          probeState: state.probe.probeState,
          probedTools: state.probe.probedTools,
          toolFilter: state.probe.toolFilter,
          onFilterChange: state.probe.setToolFilter,
          autoCount: state.summary.autoCount,
          disabledCount: state.summary.disabledCount,
          onProbe: () => state.probe.runProbe(false),
          policy: state.policyState.policy,
          onPolicyChange: state.policyState.setToolPolicy,
          onAllAuto: state.handleAllAuto,
          onResetDefault: state.handleResetDefault,
        }),
      })

      const jsonPanel = h(EditorJson, {
        t: t,
        text: state.json.jsonText,
        feedback: state.json.jsonFeedback,
        onChange: state.json.handleJsonChange,
        onFillSample: state.json.fillSample,
        onCopy: state.json.copyJson,
      })

      return h(
        Dialog,
        {
          title: mode === 'edit' ? t('editor.editTitle') : t('editor.addTitle'),
          size: 'editor',
          mode: 'cover-host',
          onClose: props.onClose,
          returnFocus: props.returnFocus,
          closeLabel: t('action.close'),
          closeTooltip: t('action.close'),
          headerExtra: tabs,
          footer: h(EditorFooter, {
            t: t,
            testing: state.test.testing,
            testResult: state.test.testResult,
            onTest: state.test.handleTest,
            saving: state.save.saving,
            onSave: state.save.handleSave,
            onClose: props.onClose,
          }),
        },
        state.json.tab === 'json' ? jsonPanel : formPanel,
      )
    }

    /* ------------------------------------------------------------------ *
     * Delete confirmation.                                               *
     * ------------------------------------------------------------------ */

