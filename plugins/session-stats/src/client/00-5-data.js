    /* ------------------------------------------------------------------ *
     * Data access. Relative URLs only: the document mount prefix stays.   *
     * ------------------------------------------------------------------ */

    function fetchJson(url, signal) {
      return fetch(url, {
        signal: signal,
        headers: { accept: 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
      }).then((response) => {
        if (response.status === 401) {
          const error = new Error('session-stats: unauthorized')
          error.code = 'unauthorized'
          throw error
        }
        if (!response.ok) {
          const error = new Error('session-stats: request failed with status ' + String(response.status))
          error.code = 'http'
          error.status = response.status
          throw error
        }
        return response.json()
      })
    }

    /** Payloads fetched before the panel mounts, so opening it paints immediately. */
    const warmPayloads = new Map()

    /** Fetch one payload in the background and keep it for the panel's first paint. */
    function warmPayload(path) {
      try {
        fetchJson(path).then(
          (data) => { warmPayloads.set(path, { data: data, at: Date.now() }) },
          () => { /* the panel falls back to its loading state */ },
        )
      } catch {
        /* no fetch in this environment (headless renderer): keep the loading state */
      }
    }

    function readLocaleTag(ctx) {
      try {
        const snapshot = ctx.locale.getSnapshot()
        if (snapshot !== null && typeof snapshot === 'object' && typeof snapshot.active === 'string' && snapshot.active.length > 0) {
          return snapshot.active
        }
      } catch (error) {
        /* fall through to the document language */
      }
      try {
        if (typeof document !== 'undefined' && document.documentElement !== null && typeof document.documentElement.lang === 'string' && document.documentElement.lang.length > 0) {
          return document.documentElement.lang
        }
      } catch (error) {
        /* fall through to the default */
      }
      return DEFAULT_LOCALE
    }

    /**
     * One polled JSON resource. The effect owns its timer and its in-flight
     * request, so unmount aborts the request and clears the interval.
     */
    function usePolledResource(load, path, intervalMs, refreshToken) {
      const [state, setState] = useState(() => {
        // A warmed payload lets the panel paint on its first frame; the effect below
        // still refreshes it right away, so the visible numbers stay current.
        const warm = warmPayloads.get(path)
        if (warm !== undefined) {
          return { status: 'ready', data: warm.data, error: null, unauthorized: false, updatedAt: warm.at, refreshing: false }
        }
        return { status: 'loading', data: null, error: null, unauthorized: false, updatedAt: 0, refreshing: false }
      })
      useEffect(() => {
        let stopped = false
        let controller = null
        /** A manual refresh must bypass the Host response caches (`refresh=1`). */
        const request = (force) => {
          if (controller !== null) controller.abort()
          const current = new AbortController()
          controller = current
          // Only a manual refresh shows the busy affordance; polling stays silent.
          if (force) {
            setState((previous) => (previous.refreshing === true ? previous : Object.assign({}, previous, { refreshing: true })))
          }
          const target = force ? path + (path.indexOf('?') === -1 ? '?' : '&') + 'refresh=1' : path
          load(target, current.signal).then(
            (data) => {
              if (stopped || current.signal.aborted) return
              if (controller === current) controller = null
              setState({ status: 'ready', data: data, error: null, unauthorized: false, updatedAt: Date.now(), refreshing: false })
            },
            (error) => {
              if (stopped || current.signal.aborted) return
              if (controller === current) controller = null
              const unauthorized = error !== null && typeof error === 'object' && error.code === 'unauthorized'
              setState((previous) => {
                if (unauthorized) return { status: 'unauthorized', data: null, error: null, unauthorized: true, updatedAt: previous.updatedAt, refreshing: false }
                if (previous.data !== null) return { status: 'ready', data: previous.data, error: error, unauthorized: false, updatedAt: previous.updatedAt, refreshing: false }
                return { status: 'error', data: null, error: error, unauthorized: false, updatedAt: 0, refreshing: false }
              })
            },
          )
        }
        request(refreshToken > 0)
        const timer = setInterval(() => request(false), intervalMs)
        return () => {
          stopped = true
          clearInterval(timer)
          if (controller !== null) {
            controller.abort()
            controller = null
          }
        }
      }, [load, path, intervalMs, refreshToken])
      return state
    }

