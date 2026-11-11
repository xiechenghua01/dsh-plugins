    /* ------------------------------------------------------------------ *
     * Tooltip：全页面单例，300ms，悬停/键盘聚焦触发（§7.7）。            *
     * ------------------------------------------------------------------ */

    const TOOLTIP_DELAY_MS = 300
    const TOOLTIP_GAP = 8
    const TOOLTIP_MARGIN = 8

    const tooltip = {
      timer: null,
      target: null,
      label: '',
      node: null,
      host: null,
      root: null,
      observer: null,
      suppressFocusUntil: 0,
    }

    /** Rebind the observer whenever the page remounts (theme switch / settings nav). */
    function bindTooltipRoot() {
      if (tooltip.observer !== null && tooltip.observer !== undefined) {
        tooltip.observer.disconnect()
        tooltip.observer = null
      }
      const root = typeof document !== 'undefined' && document !== null ? document.querySelector('.mm-root') : null
      tooltip.root = root
      if (root !== null && typeof MutationObserver === 'function') {
        tooltip.observer = new MutationObserver(syncTooltipFontSize)
        tooltip.observer.observe(root, { attributes: true, attributeFilter: ['style'] })
      }
    }

    function tooltipFontSize() {
      let root = tooltip.root
      if (root === null || root === undefined || root.isConnected !== true) {
        bindTooltipRoot()
        root = tooltip.root
      }
      if (root !== null && root !== undefined && typeof getComputedStyle === 'function') {
        const value = getComputedStyle(root).getPropertyValue('--ds-fs').trim()
        if (value !== '') return value
      }
      return '14px'
    }

    /** 每次显示前同步字号；显示期间由 MutationObserver 继续同步（§3.7）。 */
    function syncTooltipFontSize() {
      if (tooltip.host === null || tooltip.host === undefined) return
      tooltip.host.style.setProperty('--ds-fs', tooltipFontSize())
    }

    function ensureTooltipNode() {
      if (typeof document === 'undefined' || document === null) return null
      if (tooltip.host !== null && document.body.contains(tooltip.host)) return tooltip.node
      const host = document.createElement('div')
      host.className = 'mm-tooltip-host'
      host.setAttribute('data-plugin', 'mcp-manager')
      const node = document.createElement('div')
      node.className = 'mm-tooltip'
      node.setAttribute('role', 'tooltip')
      host.appendChild(node)
      document.body.appendChild(host)
      tooltip.host = host
      tooltip.node = node
      bindTooltipRoot()
      syncTooltipFontSize()
      return node
    }

    function hideTooltip() {
      if (tooltip.timer !== null) {
        clearTimeout(tooltip.timer)
        tooltip.timer = null
      }
      tooltip.target = null
      tooltip.label = ''
      if (tooltip.node !== null && tooltip.node !== undefined) {
        tooltip.node.classList.remove('mm-tooltip-show')
        tooltip.node.style.visibility = 'hidden'
      }
    }

    function tooltipClamp(value, min, max) {
      if (max < min) return min
      if (value < min) return min
      if (value > max) return max
      return value
    }

    function tooltipCandidate(side, anchor, tip, viewWidth, viewHeight) {
      let left
      let top
      if (side === 'top' || side === 'bottom') {
        left = tooltipClamp(anchor.left + anchor.width / 2 - tip.width / 2, TOOLTIP_MARGIN, viewWidth - tip.width - TOOLTIP_MARGIN)
        top = side === 'top' ? anchor.top - tip.height - TOOLTIP_GAP : anchor.bottom + TOOLTIP_GAP
      } else {
        top = tooltipClamp(anchor.top + anchor.height / 2 - tip.height / 2, TOOLTIP_MARGIN, viewHeight - tip.height - TOOLTIP_MARGIN)
        left = side === 'right' ? anchor.right + TOOLTIP_GAP : anchor.left - tip.width - TOOLTIP_GAP
      }
      return { left: left, top: top }
    }

    function tooltipFits(candidate, tip, viewWidth, viewHeight) {
      return candidate.left >= TOOLTIP_MARGIN
        && candidate.top >= TOOLTIP_MARGIN
        && candidate.left + tip.width <= viewWidth - TOOLTIP_MARGIN
        && candidate.top + tip.height <= viewHeight - TOOLTIP_MARGIN
    }

    function tooltipVisibleArea(candidate, tip, viewWidth, viewHeight) {
      const width = Math.max(0, Math.min(candidate.left + tip.width, viewWidth) - Math.max(candidate.left, 0))
      const height = Math.max(0, Math.min(candidate.top + tip.height, viewHeight) - Math.max(candidate.top, 0))
      return width * height
    }

    function placeTooltip() {
      const target = tooltip.target
      if (target === null || target === undefined || typeof target.getBoundingClientRect !== 'function') {
        hideTooltip()
        return
      }
      if (typeof document === 'undefined' || document === null || !document.body.contains(target)) {
        hideTooltip()
        return
      }
      const node = ensureTooltipNode()
      if (node === null) return
      syncTooltipFontSize()
      node.textContent = tooltip.label
      node.style.visibility = 'hidden'
      node.classList.add('mm-tooltip-show')
      const rect = target.getBoundingClientRect()
      const tipRect = node.getBoundingClientRect()
      const viewWidth = typeof window !== 'undefined' && window !== null ? window.innerWidth : 0
      const viewHeight = typeof window !== 'undefined' && window !== null ? window.innerHeight : 0
      if (viewWidth <= 0 || viewHeight <= 0) {
        node.style.left = Math.round(rect.left + rect.width / 2 - tipRect.width / 2) + 'px'
        node.style.top = Math.round(rect.top - tipRect.height - TOOLTIP_GAP) + 'px'
        node.style.visibility = 'visible'
        return
      }
      const sides = ['top', 'bottom', 'right', 'left']
      let chosen = null
      for (let index = 0; index < sides.length; index += 1) {
        const candidate = tooltipCandidate(sides[index], rect, tipRect, viewWidth, viewHeight)
        if (tooltipFits(candidate, tipRect, viewWidth, viewHeight)) {
          chosen = candidate
          break
        }
      }
      if (chosen === null) {
        let bestArea = -1
        for (let index = 0; index < sides.length; index += 1) {
          const candidate = tooltipCandidate(sides[index], rect, tipRect, viewWidth, viewHeight)
          const area = tooltipVisibleArea(candidate, tipRect, viewWidth, viewHeight)
          if (area > bestArea) {
            bestArea = area
            chosen = candidate
          }
        }
      }
      node.style.left = Math.round(chosen.left) + 'px'
      node.style.top = Math.round(chosen.top) + 'px'
      node.style.visibility = 'visible'
    }

    function scheduleTooltip(label, target, delay) {
      hideTooltip()
      const text = textOf(label)
      if (text === '' || target === null || target === undefined) return
      tooltip.target = target
      tooltip.label = text
      tooltip.timer = setTimeout(() => {
        tooltip.timer = null
        placeTooltip()
      }, typeof delay === 'number' ? delay : TOOLTIP_DELAY_MS)
    }

    /** 点击带来的 focus 不重新触发；键盘聚焦仍按 300ms 显示。 */
    function tooltipHandlers(label) {
      const text = textOf(label)
      if (text === '') return {}
      return {
        onMouseEnter: (event) => {
          scheduleTooltip(text, event.currentTarget)
        },
        onMouseLeave: () => {
          hideTooltip()
        },
        onMouseDown: () => {
          tooltip.suppressFocusUntil = Date.now() + 400
          hideTooltip()
        },
        onFocus: (event) => {
          if (Date.now() < tooltip.suppressFocusUntil) return
          scheduleTooltip(text, event.currentTarget)
        },
        onBlur: () => {
          hideTooltip()
        },
      }
    }

    /** 目标被卸载时 mouseout 不会触发：渲染提交后核对一次。 */
    function hideTooltipIfTargetGone() {
      const target = tooltip.target
      if (target === null || target === undefined) return
      if (typeof document === 'undefined' || document === null) {
        hideTooltip()
        return
      }
      if (document.body.contains(target)) return
      hideTooltip()
    }

    /** 滚动、视图切换和卸载时的统一清理。 */
    function TooltipLayer() {
      useEffect(() => {
        const onScroll = () => {
          hideTooltip()
        }
        window.addEventListener('scroll', onScroll, true)
        return () => {
          window.removeEventListener('scroll', onScroll, true)
          hideTooltip()
        }
      }, [])
      useEffect(() => {
        hideTooltipIfTargetGone()
      })
      return null
    }
