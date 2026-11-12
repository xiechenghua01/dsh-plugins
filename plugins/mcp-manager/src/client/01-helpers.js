    /** Bound translator, assigned by `apply`; used when the slot passes no `t`. */
    let activeT = null

    /** Plugin context and the host theme service, assigned by `apply`. */
    let pluginCtx = null
    let themeService = null

    /* ------------------------------------------------------------------ *
     * Small helpers.                                                     *
     * ------------------------------------------------------------------ */

    function textOf(value) {
      if (typeof value === 'string') return value
      if (typeof value === 'number' && Number.isFinite(value)) return String(value)
      return ''
    }

    function messageOf(error) {
      if (error !== null && error !== undefined && typeof error.message === 'string' && error.message !== '') return error.message
      return ''
    }

    function isObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    }

    function isJsMarker(value) {
      return isObject(value) && typeof value.$js === 'string'
    }

    /** Render one value for a structured control, keeping `!!js` expressions. */
    function displayValueOf(value) {
      if (isJsMarker(value)) return JS_MARKER_PREFIX + value.$js + '@@'
      const raw = textOf(value)
      if (raw.startsWith(JS_MARKER_PREFIX) || raw.startsWith(STR_ESCAPE_PREFIX)) return STR_ESCAPE_PREFIX + raw
      return raw
    }

    /** Restore a control value: `@@str:` is a literal, `@@js:...@@` the opaque host marker. */
    function valueFromText(text) {
      const raw = textOf(text)
      if (raw.startsWith(STR_ESCAPE_PREFIX)) return raw.slice(STR_ESCAPE_PREFIX.length)
      const match = JS_MARKER_PATTERN.exec(raw)
      return match !== null ? { $js: match[1] } : raw
    }

    function entriesToRows(object) {
      if (!isObject(object)) return []
      return Object.keys(object).map((key) => ({ key: key, value: displayValueOf(object[key]) }))
    }

    function rowsToObject(rows) {
      const out = {}
      if (!Array.isArray(rows)) return out
      for (const row of rows) {
        if (!isObject(row)) continue
        const key = textOf(row.key).trim()
        const value = textOf(row.value).trim()
        if (key !== '' && value !== '') out[key] = valueFromText(value)
      }
      return out
    }

    function parseIntStrict(text) {
      const raw = textOf(text).trim()
      if (raw === '') return null
      if (!/^-?\d+$/u.test(raw)) return NaN
      return Number(raw)
    }

    function transportOf(config) {
      if (!isObject(config)) return 'stdio'
      const declared = textOf(config.transport !== undefined ? config.transport : config.type).toLowerCase()
      if (declared === 'streamable-http' || declared === 'http') return 'streamable-http'
      if (declared === 'sse') return 'sse'
      if (declared === 'stdio') return 'stdio'
      return textOf(config.url) !== '' ? 'streamable-http' : 'stdio'
    }

    function targetOfConfig(config) {
      if (!isObject(config)) return ''
      if (transportOf(config) === 'stdio') {
        const parts = [textOf(config.command)]
        if (Array.isArray(config.args)) {
          for (const entry of config.args) {
            const value = displayValueOf(entry)
            if (value !== '') parts.push(value)
          }
        }
        return parts.filter((part) => part !== '').join(' ')
      }
      return textOf(config.url)
    }

    function toolListsOf(row) {
      const config = isObject(row) && isObject(row.config) ? row.config : {}
      const extra = isObject(row) && isObject(row.extra) ? row.extra : {}
      const autoSource = Array.isArray(config.autoApprove) ? config.autoApprove : (Array.isArray(extra.autoApprove) ? extra.autoApprove : [])
      const disabledSource = Array.isArray(config.disabledTools) ? config.disabledTools : (Array.isArray(extra.disabledTools) ? extra.disabledTools : [])
      const clean = (list) => {
        const out = []
        for (const item of list) {
          const name = textOf(item)
          if (name !== '' && out.indexOf(name) === -1) out.push(name)
        }
        return out
      }
      return { auto: clean(autoSource), disabled: clean(disabledSource) }
    }

    function toolNamesOf(row) {
      const names = []
      const seen = {}
      const push = (name) => {
        if (name !== '' && seen[name] !== true) {
          seen[name] = true
          names.push(name)
        }
      }
      const probe = isObject(row) ? row.lastProbe : null
      if (isObject(probe)) {
        if (Array.isArray(probe.tools)) {
          for (const tool of probe.tools) if (isObject(tool)) push(textOf(tool.name))
        }
        if (Array.isArray(probe.toolNames)) {
          for (const name of probe.toolNames) push(textOf(name))
        }
      }
      if (isObject(row) && Array.isArray(row.registeredTools)) {
        for (const tool of row.registeredTools) if (isObject(tool)) push(textOf(tool.name))
      }
      const lists = toolListsOf(row)
      for (const name of lists.auto) push(name)
      for (const name of lists.disabled) push(name)
      return names
    }

    function toolDescriptionsOf(row) {
      const probe = isObject(row) ? row.lastProbe : null
      const out = {}
      // Probe descriptions win; registered tools only fill names the probe did not cover.
      if (isObject(probe) && Array.isArray(probe.tools)) {
        for (const tool of probe.tools) {
          if (!isObject(tool)) continue
          const name = textOf(tool.name)
          if (name !== '') out[name] = textOf(tool.description)
        }
      }
      if (isObject(row) && Array.isArray(row.registeredTools)) {
        for (const tool of row.registeredTools) {
          if (!isObject(tool)) continue
          const name = textOf(tool.name)
          if (name !== '' && Object.prototype.hasOwnProperty.call(out, name) !== true) out[name] = textOf(tool.description)
        }
      }
      return out
    }

    function toolCountOf(row) {
      if (isObject(row) && typeof row.toolCount === 'number' && Number.isFinite(row.toolCount)) return row.toolCount
      const probe = isObject(row) ? row.lastProbe : null
      if (isObject(probe) && probe.ok === true && typeof probe.toolCount === 'number' && Number.isFinite(probe.toolCount)) return probe.toolCount
      const registered = isObject(row) && Array.isArray(row.registeredTools) ? row.registeredTools : []
      if (registered.length > 0) return registered.length
      // Unknown (disabled or never connected) stays unknown instead of claiming zero tools.
      // Permission lists (`autoApprove` / `disabledTools`) are configuration, not a tool count.
      return null
    }

    function statusOf(t, row, testing) {
      if (testing === true) return { tone: 'warn', text: t('status.testing'), pulse: true }
      if (row.disabled === true) return { tone: 'muted', text: t('status.disabled'), pulse: false }
      const probe = isObject(row.lastProbe) ? row.lastProbe : null
      if (isObject(probe) && probe.ok === false) return { tone: 'err', text: t('status.failed'), pulse: false }
      if (isObject(probe) && probe.ok === true) {
        const ms = typeof probe.durationMs === 'number' && Number.isFinite(probe.durationMs) ? Math.round(probe.durationMs) : null
        return { tone: 'ok', text: ms !== null ? t('status.runningMs', { ms: ms }) : t('status.running'), pulse: false }
      }
      if (isObject(row.live) && row.live.phase === 'failed') return { tone: 'err', text: t('status.failed'), pulse: false }
      return { tone: 'ok', text: t('status.running'), pulse: false }
    }

    function describeError(t, error) {
      if (error !== null && error !== undefined) {
        if (error.code === 'unauthorized') return t('page.unauthorized')
        if (error.code === 'protocol') return t('common.invalidResponse')
        if (error.code === 'transport') return t('common.requestFailed')
      }
      const message = messageOf(error)
      return message !== '' ? message : t('common.unknownError')
    }

    async function copyText(text) {
      try {
        if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined && navigator.clipboard !== null && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch (error) {
        /* fall through: the caller shows a manual-copy hint */
      }
      return false
    }

