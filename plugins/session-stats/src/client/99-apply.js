    /* ------------------------------------------------------------------ *
     * Registration. All side effects live inside apply and ctx.effect.    *
     * ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: zh, en: en }), 'session-stats: dictionaries')

        ctx.effect(() => {
          if (typeof document === 'undefined' || document === null) return () => {}
          const style = document.createElement('style')
          style.dataset.plugin = '@chengze/dsh-session-stats'
          style.textContent = CSS
          const head = document.head !== undefined && document.head !== null ? document.head : document.documentElement
          if (head === undefined || head === null) return () => {}
          head.appendChild(style)
          return () => {
            if (typeof style.remove === 'function') style.remove()
            else if (style.parentNode !== null && style.parentNode !== undefined) style.parentNode.removeChild(style)
          }
        }, 'session-stats: styles')

        const t = ctx.locale.bind(NS)
        const getLocaleTag = () => readLocaleTag(ctx)

        ctx.effect(
          () =>
            ctx.slots.inject('main', () =>
              ctx.slots.register(
                {
                  name: 'main',
                  key: PANEL_ID,
                  locale: NS,
                  inject: () => ({ t: t, load: fetchJson, getLocaleTag: getLocaleTag }),
                },
                StatsPage,
              ),
            ),
          'session-stats: main panel',
        )

        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.footer.action', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.footer.action',
                  id: PANEL_ID,
                  order: 10,
                  locale: NS,
                  label: () => t('panel.title'),
                  inject: () => ({
                    t: t,
                    openPanel: () => ctx.layout.selectPanel(PANEL_ID),
                    // `null` returns to the Conversation, so the same entry closes the panel.
                    togglePanel: (active) => ctx.layout.selectPanel(active ? null : PANEL_ID),
                  }),
                },
                FooterEntry,
              ),
            ),
          'session-stats: sidebar footer entry',
        )

        // Warm both payloads as soon as the panel's module is live: the first open
        // then paints from memory instead of waiting for the Host's first build.
        warmPayload('session-stats/overview?days=' + String(DAYS))
        warmPayload('session-stats/system')
      },
    }
