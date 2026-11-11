    /* ------------------------------------------------------------------ *
     * Draft helpers and the clean-config serializers.                    *
     * ------------------------------------------------------------------ */

    function emptyDraft() {
      return {
        serverName: '',
        transport: 'stdio',
        command: '',
        argsText: '',
        argsRaw: [],
        argsDirty: false,
        envRows: [],
        url: '',
        headersRows: [],
        cwd: '',
        timeoutText: '',
        retriesText: '',
        oauthClientId: '',
        oauthScopes: '',
      }
    }

    function draftFromRow(row) {
      const config = isObject(row.config) ? row.config : {}
      const extra = isObject(row.extra) ? row.extra : {}
      const reconnect = isObject(config.reconnect) ? config.reconnect : {}
      const oauth = isObject(config.oauth) ? config.oauth : (isObject(extra.oauth) ? extra.oauth : {})
      const timeout = typeof config.toolCallTimeoutMs === 'number' && config.toolCallTimeoutMs !== DEFAULT_TIMEOUT_MS
        ? String(config.toolCallTimeoutMs)
        : ''
      const retries = typeof reconnect.maxAttempts === 'number' && reconnect.maxAttempts !== DEFAULT_MAX_RETRIES
        ? String(reconnect.maxAttempts)
        : ''
      return {
        serverName: textOf(row.serverName),
        transport: transportOf(config),
        command: textOf(config.command),
        argsText: Array.isArray(config.args) ? config.args.map(displayValueOf).join('\n') : '',
        argsRaw: Array.isArray(config.args) ? config.args.slice() : [],
        argsDirty: false,
        envRows: entriesToRows(config.env),
        url: textOf(config.url),
        headersRows: entriesToRows(config.headers),
        cwd: textOf(config.cwd),
        timeoutText: timeout,
        retriesText: retries,
        oauthClientId: textOf(oauth.clientId),
        oauthScopes: textOf(oauth.scopes),
      }
    }

    function policyFromRow(row) {
      const lists = toolListsOf(row)
      const policy = {}
      for (const name of lists.auto) policy[name] = 'auto'
      for (const name of lists.disabled) policy[name] = 'disabled'
      return policy
    }

    function probedToolsFromRow(row) {
      const probe = isObject(row) ? row.lastProbe : null
      const out = []
      const seen = {}
      const push = (name, description) => {
        if (name === '' || seen[name] === true) return
        seen[name] = true
        out.push({ name: name, description: description })
      }
      if (isObject(probe) && Array.isArray(probe.tools)) {
        for (const tool of probe.tools) {
          if (isObject(tool)) push(textOf(tool.name), textOf(tool.description))
        }
      }
      if (isObject(probe) && Array.isArray(probe.toolNames)) {
        for (const name of probe.toolNames) push(textOf(name), '')
      }
      const lists = toolListsOf(row)
      for (const name of lists.auto) push(name, '')
      for (const name of lists.disabled) push(name, '')
      return out
    }

    function mergeTools(tools, existing, policy) {
      const out = []
      const seen = {}
      const push = (name, description) => {
        if (name === '' || seen[name] === true) return
        seen[name] = true
        out.push({ name: name, description: description })
      }
      if (Array.isArray(tools)) {
        for (const tool of tools) {
          if (isObject(tool)) push(textOf(tool.name), textOf(tool.description))
        }
      }
      if (Array.isArray(existing)) {
        for (const tool of existing) {
          if (isObject(tool)) push(textOf(tool.name), textOf(tool.description))
        }
      }
      if (isObject(policy)) {
        for (const name of Object.keys(policy)) push(name, '')
      }
      return out
    }

    function draftValues(draft, policy) {
      // JSON-originated args stay as the original array until the textarea is actually edited,
      // so a legal multi-line string argument is never split into several arguments.
      const args = draft.argsDirty === true
        ? draft.argsText
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter((line) => line !== '')
          .map(valueFromText)
        : (Array.isArray(draft.argsRaw) ? draft.argsRaw.slice() : [])
      const autoApprove = []
      const disabledTools = []
      if (isObject(policy)) {
        for (const name of Object.keys(policy)) {
          if (policy[name] === 'auto') autoApprove.push(name)
          else if (policy[name] === 'disabled') disabledTools.push(name)
        }
      }
      autoApprove.sort()
      disabledTools.sort()
      return {
        serverName: draft.serverName.trim(),
        transport: draft.transport,
        command: draft.command.trim(),
        args: args,
        env: rowsToObject(draft.envRows),
        cwd: draft.cwd.trim(),
        url: draft.url.trim(),
        headers: rowsToObject(draft.headersRows),
        timeout: parseIntStrict(draft.timeoutText),
        retries: parseIntStrict(draft.retriesText),
        oauthClientId: draft.oauthClientId.trim(),
        oauthScopes: draft.oauthScopes.trim(),
        autoApprove: autoApprove,
        disabledTools: disabledTools,
      }
    }

    /** Prototype-shaped, clean JSON node: no empty strings/arrays/objects and no defaults. */
    function cleanJsonNode(values) {
      const node = { transport: values.transport }
      if (values.transport === 'stdio') {
        if (values.command !== '') node.command = values.command
        if (values.args.length > 0) node.args = values.args
        if (values.cwd !== '') node.cwd = values.cwd
        if (Object.keys(values.env).length > 0) node.env = values.env
      } else {
        if (values.url !== '') node.url = values.url
        if (Object.keys(values.headers).length > 0) node.headers = values.headers
        if (values.oauthClientId !== '' || values.oauthScopes !== '') {
          node.oauth = {}
          if (values.oauthClientId !== '') node.oauth.clientId = values.oauthClientId
          if (values.oauthScopes !== '') node.oauth.scopes = values.oauthScopes
        }
      }
      if (Number.isFinite(values.timeout) && values.timeout !== DEFAULT_TIMEOUT_MS) node.timeout = values.timeout
      if (Number.isFinite(values.retries) && values.retries !== DEFAULT_MAX_RETRIES) node.maxRetries = values.retries
      if (values.autoApprove.length > 0) node.autoApprove = values.autoApprove
      if (values.disabledTools.length > 0) node.disabledTools = values.disabledTools
      return node
    }

    function cleanJsonObject(values) {
      const name = values.serverName !== '' ? values.serverName : 'mcp-server'
      return { mcpServers: { [name]: cleanJsonNode(values) } }
    }

    /** Host config: `timeout` -> toolCallTimeoutMs, `maxRetries` -> reconnect.maxAttempts. */
    function cleanHostConfig(values) {
      const config = { serverName: values.serverName, transport: values.transport }
      if (values.transport === 'stdio') {
        config.command = values.command
        if (values.args.length > 0) config.args = values.args
        if (values.cwd !== '') config.cwd = values.cwd
        if (Object.keys(values.env).length > 0) config.env = values.env
      } else {
        config.url = values.url
        if (Object.keys(values.headers).length > 0) config.headers = values.headers
        if (values.oauthClientId !== '' || values.oauthScopes !== '') {
          config.oauth = {}
          if (values.oauthClientId !== '') config.oauth.clientId = values.oauthClientId
          if (values.oauthScopes !== '') config.oauth.scopes = values.oauthScopes
        }
      }
      if (Number.isFinite(values.timeout) && values.timeout !== DEFAULT_TIMEOUT_MS) config.toolCallTimeoutMs = values.timeout
      if (Number.isFinite(values.retries) && values.retries !== DEFAULT_MAX_RETRIES) config.reconnect = { maxAttempts: values.retries }
      if (values.autoApprove.length > 0) config.autoApprove = values.autoApprove
      if (values.disabledTools.length > 0) config.disabledTools = values.disabledTools
      return config
    }

    /** Catalog metadata the host persists alongside the row (the DSH client ignores it). */
    function cleanExtra(values, baseExtra) {
      const extra = {}
      if (isObject(baseExtra) && isObject(baseExtra.capabilities)) extra.capabilities = baseExtra.capabilities
      extra.autoApprove = values.autoApprove
      extra.disabledTools = values.disabledTools
      if (values.transport !== 'stdio' && (values.oauthClientId !== '' || values.oauthScopes !== '')) {
        extra.oauth = { enabled: true, clientId: values.oauthClientId, scopes: values.oauthScopes }
      }
      return extra
    }

    function extractServerNode(parsed) {
      if (!isObject(parsed) && !Array.isArray(parsed)) return null
      if (Array.isArray(parsed)) {
        if (parsed.length === 0 || !isObject(parsed[0])) return null
        const node = parsed[0]
        return { id: textOf(node.serverName) || textOf(node.name), node: node }
      }
      if (isObject(parsed.mcpServers)) {
        const keys = Object.keys(parsed.mcpServers)
        if (keys.length > 0 && isObject(parsed.mcpServers[keys[0]])) return { id: keys[0], node: parsed.mcpServers[keys[0]] }
        return null
      }
      if (Array.isArray(parsed.mcpServers) && parsed.mcpServers.length > 0 && isObject(parsed.mcpServers[0])) {
        const node = parsed.mcpServers[0]
        return { id: textOf(node.serverName) || textOf(node.name), node: node }
      }
      const looksLikeNode = parsed.command !== undefined
        || parsed.url !== undefined
        || parsed.transport !== undefined
        || parsed.type !== undefined
        || parsed.serverName !== undefined
        || parsed.name !== undefined
        || parsed.args !== undefined
      if (looksLikeNode) {
        return { id: textOf(parsed.serverName) || textOf(parsed.name), node: parsed }
      }
      const keys = Object.keys(parsed)
      if (keys.length === 1 && keys[0] !== 'mcpServers' && keys[0] !== 'servers' && isObject(parsed[keys[0]])) {
        return { id: keys[0], node: parsed[keys[0]] }
      }
      return null
    }

    function applyParsedNode(baseDraft, node) {
      const declared = textOf(node.transport !== undefined ? node.transport : node.type).toLowerCase()
      let transport = 'stdio'
      if (declared === 'sse') transport = 'sse'
      else if (declared === 'streamable-http' || declared === 'http') transport = 'streamable-http'
      else if (declared === 'stdio') transport = 'stdio'
      else if (textOf(node.command) !== '') transport = 'stdio'
      else if (textOf(node.url) !== '') transport = 'streamable-http'
      const oauth = isObject(node.oauth) ? node.oauth : {}
      const reconnect = isObject(node.reconnect) ? node.reconnect : {}
      const timeout = typeof node.timeout === 'number'
        ? node.timeout
        : (typeof node.toolCallTimeoutMs === 'number' ? node.toolCallTimeoutMs : null)
      const retries = typeof node.maxRetries === 'number'
        ? node.maxRetries
        : (typeof reconnect.maxAttempts === 'number' ? reconnect.maxAttempts : null)
      const policy = {}
      if (Array.isArray(node.autoApprove)) {
        for (const raw of node.autoApprove) {
          const name = textOf(raw)
          if (name !== '') policy[name] = 'auto'
        }
      }
      if (Array.isArray(node.disabledTools)) {
        for (const raw of node.disabledTools) {
          const name = textOf(raw)
          if (name !== '') policy[name] = 'disabled'
        }
      }
      return {
        draft: {
          serverName: textOf(node.serverName) !== '' ? textOf(node.serverName) : baseDraft.serverName,
          transport: transport,
          command: textOf(node.command),
          argsText: Array.isArray(node.args) ? node.args.map(displayValueOf).join('\n') : '',
          argsRaw: Array.isArray(node.args) ? node.args.slice() : [],
          argsDirty: false,
          envRows: entriesToRows(node.env),
          url: textOf(node.url),
          headersRows: entriesToRows(node.headers),
          cwd: textOf(node.cwd),
          timeoutText: timeout !== null && timeout !== DEFAULT_TIMEOUT_MS ? String(timeout) : '',
          retriesText: retries !== null && retries !== DEFAULT_MAX_RETRIES ? String(retries) : '',
          oauthClientId: textOf(oauth.clientId),
          oauthScopes: textOf(oauth.scopes),
        },
        policy: policy,
      }
    }

