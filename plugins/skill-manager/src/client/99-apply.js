    /* ------------------------------------------------------------------ *
     * Panel entry, sidebar icon, and registration.                        *
     * This fragment is written last so it can reference every symbol the  *
     * earlier fragments define.                                           *
     * ------------------------------------------------------------------ */

    /** Set by the mounted page; every state mutation funnels through it. */
    let __rerender = () => {}

    /** Re-render the page after a state mutation. */
    function rerender() {
      __rerender()
    }

    /** Sidebar glyph: the owner renders a 16px (wide) or 18px (rail) slot. */
    function SkillManagerIcon(props) {
      const requested = props !== null && typeof props === 'object' ? props.size : undefined
      // The owner asks for 16px in the wide sidebar and 18px in the collapsed rail.
      const size = requested === 18 ? 18 : 16
      const active = props !== null && typeof props === 'object' && props.active === true
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity: active ? 1 : 0.72,
        },
        h('path', { d: 'M6 3.5h8.5L19 8v12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z' }),
        h('path', { d: 'M14 3.5V8h5' }),
        h('path', { d: 'm12 11.2 1.35 2.75 3.05.45-2.2 2.15.5 3.05L12 18.15l-2.7 1.45.5-3.05-2.2-2.15 3.05-.45Z' }),
      )
    }

    /** The main panel: owns the state subscription and the first data load. */
    function SkillManagerPage(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const [version, setVersion] = useState(0)
      const bootstrapped = useRef(false)

      useEffect(() => {
        __rerender = () => setVersion((value) => value + 1)
        return () => {
          __rerender = () => {}
        }
      }, [])

      useEffect(() => {
        if (bootstrapped.current) return
        bootstrapped.current = true
        void bootstrap(props)
      }, [])

      /* 宿主字号可能在插件打开期间被修改；低频轮询 settings，变化时重绘。 */
      useEffect(() => {
        const refreshFontSize = async () => {
          try {
            const settings = await api('settings')
            if (settings === null || typeof settings !== 'object') return
            const next = typeof settings.fontSize === 'number' ? settings.fontSize : DEFAULT_FONT_SIZE
            if (next !== appState.fontSize) {
              appState.fontSize = next
              __rerender()
            }
          } catch {
            /* settings are best effort */
          }
        }
        const timer = setInterval(() => { void refreshFontSize() }, 30000)
        return () => clearInterval(timer)
      }, [])

      // `version` is read so React re-runs this component when setState fires.
      void version
      return renderPage(props)
    }

    /** First paint: read settings, then load the active tab's data. */
    async function bootstrap(props) {
      try {
        const settings = await api('settings')
        if (settings !== null && typeof settings === 'object') {
          appState.fontSize = typeof settings.fontSize === 'number' ? settings.fontSize : DEFAULT_FONT_SIZE
          if (typeof settings.cwd === 'string') appState.cwd = settings.cwd
        }
      } catch {
        /* settings are best effort; the page still works with defaults */
      }
      /* /updates depends on neither sources nor installed; start it first so all
       * three requests are in flight together. */
      void loadUpdates()
      await Promise.all([loadSources(), loadInstalled()])
    }

    /**
     * Follow the host locale face (`{ getSnapshot, subscribe }`): seed
     * `appState.locale` from the snapshot and re-render on every change.
     * Returns an unsubscribe function (or null when the face is absent).
     */
    function smWatchHostLocale(ctx) {
      const locale = ctx !== null && typeof ctx === 'object' ? ctx.locale : null
      if (locale === null || typeof locale !== 'object') return null
      const readActive = function () {
        if (typeof locale.getSnapshot !== 'function') return ''
        try {
          const snapshot = locale.getSnapshot()
          return snapshot !== null && typeof snapshot === 'object' && typeof snapshot.active === 'string'
            ? snapshot.active
            : ''
        } catch {
          return ''
        }
      }
      const applySnapshot = function (snapshot) {
        let active = snapshot !== null && typeof snapshot === 'object' && typeof snapshot.active === 'string'
          ? snapshot.active
          : ''
        /* Some hosts invoke subscribers without an argument; read it back. */
        if (active === '') active = readActive()
        if (active === '') return
        smLocaleSubscribed = true
        if (active === appState.locale) return
        appState.locale = active
        rerender()
      }
      applySnapshot(null)
      if (typeof locale.subscribe !== 'function') return null
      let subscription = null
      try {
        subscription = locale.subscribe(function (snapshot) { applySnapshot(snapshot) })
      } catch {
        return null
      }
      if (typeof subscription === 'function') return subscription
      if (subscription !== null && typeof subscription === 'object' && typeof subscription.dispose === 'function') {
        return function () { subscription.dispose() }
      }
      return null
    }

    /** Browser half entry. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skill-manager: dictionaries')

      /* Locale: primary source while the panel is mounted (props.locale in
       * renderPage remains only the fallback). */
      let disposeLocale = null
      if (typeof ctx.effect === 'function') {
        ctx.effect(() => {
          const dispose = smWatchHostLocale(ctx)
          return typeof dispose === 'function' ? dispose : () => {}
        }, 'skill-manager: locale')
      } else {
        disposeLocale = smWatchHostLocale(ctx)
      }

      ctx.effect(() => {
        if (typeof document === 'undefined' || document === null) return () => {}
        const style = document.createElement('style')
        style.dataset.plugin = '@chengze/dsh-skill-manager'
        style.textContent = STYLES
        const head = document.head !== undefined && document.head !== null ? document.head : document.documentElement
        if (head === undefined || head === null) return () => {}
        head.appendChild(style)
        return () => {
          if (typeof style.remove === 'function') style.remove()
        }
      }, 'skill-manager: styles')

      const t = ctx.locale.bind(NS)

      ctx.effect(
        () =>
          ctx.slots.inject('main', () =>
            ctx.slots.register(
              {
                name: 'main',
                key: PANEL_ID,
                locale: NS,
                inject: () => ({ t }),
              },
              SkillManagerPage,
            ),
          ),
        'skill-manager: main panel',
      )

      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              {
                name: 'sidebar.panellist',
                id: PANEL_ID,
                order: 20,
                locale: NS,
                label: () => t('panel.title'),
              },
              SkillManagerIcon,
            ),
          ),
        'skill-manager: sidebar entry',
      )

      /* Hosts without ctx.effect dispose through apply's return value. */
      if (typeof disposeLocale === 'function') return disposeLocale
    }

    return { inject: ['slots', 'locale', 'layout'], apply }
