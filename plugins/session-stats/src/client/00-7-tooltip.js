    /* ------------------------------------------------------------------ *
     * SsTooltip (§7.7): one page-wide singleton on <body>, wrapped in a   *
     * data-plugin scope container. The font size is read from the owning  *
     * root each time it is shown, never captured at creation time.        *
     * ------------------------------------------------------------------ */

    const TOOLTIP_DELAY_MS = 300
    const TOOLTIP_VIEWPORT_MARGIN = 8
    let tooltipLayer = null
    let tooltipBubble = null
    let tooltipTimer = 0
    let tooltipAnchor = null
    let tooltipUsers = 0

    function ensureTooltip() {
      if (typeof document === 'undefined' || document === null || document.body === null) return null
      if (tooltipBubble !== null && tooltipLayer !== null && tooltipLayer.parentNode === document.body) return tooltipBubble
      const layer = document.createElement('div')
      layer.className = 'ss-tooltip-layer'
      layer.dataset.plugin = PLUGIN_ID
      const bubble = document.createElement('div')
      bubble.className = 'ss-tooltip'
      bubble.setAttribute('role', 'tooltip')
      bubble.setAttribute('aria-hidden', 'true')
      layer.appendChild(bubble)
      document.body.appendChild(layer)
      tooltipLayer = layer
      tooltipBubble = bubble
      return bubble
    }

    function destroyTooltip() {
      if (tooltipTimer !== 0) {
        clearTimeout(tooltipTimer)
        tooltipTimer = 0
      }
      tooltipAnchor = null
      if (tooltipLayer !== null && tooltipLayer.parentNode !== null) tooltipLayer.parentNode.removeChild(tooltipLayer)
      tooltipLayer = null
      tooltipBubble = null
    }

    function hideTooltip() {
      if (tooltipTimer !== 0) {
        clearTimeout(tooltipTimer)
        tooltipTimer = 0
      }
      tooltipAnchor = null
      if (tooltipBubble !== null) {
        tooltipBubble.removeAttribute('data-visible')
        tooltipBubble.textContent = ''
      }
    }

    /** The owning root's live --ds-fs, resolved when the tooltip is shown. */
    function tooltipFontSize(anchor) {
      try {
        if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return ''
        return window.getComputedStyle(anchor).getPropertyValue('--ds-fs').trim()
      } catch (error) {
        return ''
      }
    }

    function placeTooltip(bubble, anchor) {
      if (typeof window === 'undefined') return
      const root = document.documentElement
      const viewWidth = window.innerWidth || (root !== null ? root.clientWidth : 0)
      const viewHeight = window.innerHeight || (root !== null ? root.clientHeight : 0)
      const rect = anchor.getBoundingClientRect()
      const width = bubble.offsetWidth
      const height = bubble.offsetHeight
      const margin = TOOLTIP_VIEWPORT_MARGIN
      const maxLeft = Math.max(margin, viewWidth - width - margin)
      const maxTop = Math.max(margin, viewHeight - height - margin)
      const centeredLeft = clamp(rect.left + rect.width / 2 - width / 2, margin, maxLeft)
      const centeredTop = clamp(rect.top + rect.height / 2 - height / 2, margin, maxTop)
      // Preference order is up, down, right, left; every candidate keeps 8px margins.
      const candidates = [
        { left: centeredLeft, top: rect.top - height - margin },
        { left: centeredLeft, top: rect.bottom + margin },
        { left: rect.right + margin, top: centeredTop },
        { left: rect.left - width - margin, top: centeredTop },
      ]
      const fits = (candidate) => candidate.left >= margin && candidate.top >= margin
        && candidate.left + width <= viewWidth - margin && candidate.top + height <= viewHeight - margin
      let chosen = null
      for (const candidate of candidates) {
        if (fits(candidate)) {
          chosen = candidate
          break
        }
      }
      if (chosen === null) {
        // None fit: clamp each side into the viewport and keep the largest visible area.
        let bestArea = -1
        for (const candidate of candidates) {
          const left = clamp(candidate.left, margin, maxLeft)
          const top = clamp(candidate.top, margin, maxTop)
          const visibleWidth = Math.max(0, Math.min(viewWidth, left + width) - Math.max(0, left))
          const visibleHeight = Math.max(0, Math.min(viewHeight, top + height) - Math.max(0, top))
          const area = visibleWidth * visibleHeight
          if (area > bestArea) {
            bestArea = area
            chosen = { left: left, top: top }
          }
        }
      }
      bubble.style.left = String(Math.round(chosen.left)) + 'px'
      bubble.style.top = String(Math.round(chosen.top)) + 'px'
    }

    function showTooltip(anchor) {
      const bubble = ensureTooltip()
      if (bubble === null) return
      const text = anchor.getAttribute('data-ss-tooltip')
      if (typeof text !== 'string' || text === '') return
      bubble.textContent = text
      const fontSize = tooltipFontSize(anchor)
      if (tooltipLayer !== null) {
        if (fontSize !== '') tooltipLayer.style.setProperty('--ds-fs', fontSize)
        else tooltipLayer.style.removeProperty('--ds-fs')
      }
      bubble.removeAttribute('data-visible')
      placeTooltip(bubble, anchor)
      tooltipAnchor = anchor
      bubble.setAttribute('data-visible', 'true')
    }

    function scheduleTooltip(anchor) {
      if (tooltipAnchor === anchor && tooltipBubble !== null && tooltipBubble.getAttribute('data-visible') === 'true') return
      if (tooltipTimer !== 0) {
        clearTimeout(tooltipTimer)
        tooltipTimer = 0
      }
      if (tooltipAnchor !== null) hideTooltip()
      tooltipTimer = setTimeout(() => {
        tooltipTimer = 0
        showTooltip(anchor)
      }, TOOLTIP_DELAY_MS)
    }

    /**
     * Bind hover/focus tooltip behavior to one anchor. Hover or keyboard focus
     * waits 300ms; leave, press, scroll and unmount hide immediately. Pointer
     * focus (a click) never re-triggers the tooltip.
     */
    function useTooltip(label) {
      const ref = useRef(null)
      useEffect(() => {
        const node = ref.current
        if (node === null || typeof node.addEventListener !== 'function') return undefined
        if (typeof label !== 'string' || label === '') return undefined
        tooltipUsers += 1
        const show = () => scheduleTooltip(node)
        const hide = () => hideTooltip()
        const onFocus = () => {
          let visible = true
          try {
            visible = node.matches(':focus-visible')
          } catch (error) {
            visible = true
          }
          if (visible) scheduleTooltip(node)
        }
        const onScroll = () => hideTooltip()
        const onPress = () => hideTooltip()
        node.addEventListener('mouseenter', show)
        node.addEventListener('mouseleave', hide)
        node.addEventListener('focus', onFocus)
        node.addEventListener('blur', hide)
        node.addEventListener('pointerdown', onPress)
        node.addEventListener('click', onPress)
        window.addEventListener('scroll', onScroll, true)
        document.addEventListener('pointerdown', onPress, true)
        return () => {
          node.removeEventListener('mouseenter', show)
          node.removeEventListener('mouseleave', hide)
          node.removeEventListener('focus', onFocus)
          node.removeEventListener('blur', hide)
          node.removeEventListener('pointerdown', onPress)
          node.removeEventListener('click', onPress)
          window.removeEventListener('scroll', onScroll, true)
          document.removeEventListener('pointerdown', onPress, true)
          tooltipUsers -= 1
          if (tooltipAnchor === node) hideTooltip()
          if (tooltipUsers <= 0) destroyTooltip()
        }
      }, [label])
      return ref
    }

    /** Primitive handle for the full-page tooltip singleton (§7.7). */
    const SsTooltip = { show: showTooltip, hide: hideTooltip, useAnchor: useTooltip }

