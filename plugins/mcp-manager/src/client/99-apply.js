    /* ------------------------------------------------------------------ *
     * Registration. All side effects live inside apply and ctx.effect.   *
     * ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale', 'theme'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        activeT = t
        pluginCtx = ctx
        themeService = ctx.theme

        ctx.effect(() => ctx.locale.register(NS, { zh: zh, en: en }), 'mcp-manager: dictionaries')

        ctx.effect(() => {
          if (typeof document === 'undefined' || document === null) return () => {}
          const style = document.createElement('style')
          style.dataset.plugin = '@chengze/dsh-mcp-manager'
          style.textContent = CSS
          const head = document.head !== undefined && document.head !== null ? document.head : document.documentElement
          if (head === undefined || head === null) return () => {}
          head.appendChild(style)
          return () => {
            if (typeof style.remove === 'function') style.remove()
            else if (style.parentNode !== null && style.parentNode !== undefined) style.parentNode.removeChild(style)
          }
        }, 'mcp-manager: styles')

        ctx.effect(() => () => {
          hideTooltip()
          if (tooltip.observer !== null && tooltip.observer !== undefined) {
            tooltip.observer.disconnect()
            tooltip.observer = null
          }
          if (tooltip.host !== null && tooltip.host.parentNode !== null && tooltip.host.parentNode !== undefined) {
            tooltip.host.parentNode.removeChild(tooltip.host)
          }
          tooltip.host = null
          tooltip.node = null
          tooltip.root = null
        }, 'mcp-manager: tooltip')

        ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'mcp-manager',
          order: 16,
          label: () => t('section.title'),
          locale: NS,
        }, McpPage)), 'mcp-manager: settings section')
      },
    }
