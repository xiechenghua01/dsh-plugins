    const dialogStack = []

    /** Body scroll lock shared by the whole dialog stack. */
    let bodyScrollLocks = 0
    let savedBodyOverflow = ''

    function lockBodyScroll() {
      if (typeof document === 'undefined' || document === null) return
      if (bodyScrollLocks === 0) {
        savedBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      }
      bodyScrollLocks += 1
    }

    function unlockBodyScroll() {
      if (typeof document === 'undefined' || document === null) return
      bodyScrollLocks = Math.max(0, bodyScrollLocks - 1)
      if (bodyScrollLocks === 0) document.body.style.overflow = savedBodyOverflow
    }

    function focusQuietly(node) {
      if (node === null || node === undefined || typeof node.focus !== 'function') return
      try {
        node.focus({ preventScroll: true })
      } catch (error) {
        try {
          node.focus()
        } catch (inner) {
          /* the invoking element may be gone */
        }
      }
    }

    function focusableIn(node) {
      if (node === null || node === undefined || typeof node.querySelectorAll !== 'function') return []
      const list = node.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
      return Array.prototype.slice.call(list).filter((item) => item.getAttribute('aria-hidden') !== 'true')
    }

    const DIALOG_GUTTER = 16

    /** Explicit mode: only `cover-host` measures; a confirm dialog is always standard. */
    function dialogModeOf(props) {
      if (props !== null && props !== undefined && props.size === 'confirm') return 'standard'
      return props !== null && props !== undefined && props.mode === 'cover-host' ? 'cover-host' : 'standard'
    }

    function positiveFinite(value) {
      return Number.isFinite(value) && value > 0 ? value : 0
    }

    /** Clamp one measured axis into the viewport's gutter, shrinking it as needed. */
    function clampDialogAxis(start, size, viewport) {
      const length = positiveFinite(viewport)
      const gutter = Math.min(DIALOG_GUTTER, length / 2)
      const min = gutter
      const max = length - gutter
      const origin = Number.isFinite(start) ? start : min
      const extent = Number.isFinite(size) ? Math.max(0, size) : 0
      const left = Math.min(Math.max(origin, min), max)
      const right = Math.min(Math.max(origin + extent, min), max)
      return { start: left, size: Math.max(0, right - left) }
    }

    /**
     * Pure cover-host geometry. The host's viewport rect (left/top/width/height) is clamped
     * into the viewport's 16px gutter. Missing, hidden (0×0 or disconnected), off-screen or
     * non-finite hosts return null so the caller falls back to the centered 640px tier.
     */
    function coverHostRectOf(hostRect, viewportWidth, viewportHeight) {
      if (hostRect === null || hostRect === undefined) return null
      const values = [hostRect.left, hostRect.top, hostRect.width, hostRect.height]
      if (values.some((value) => !Number.isFinite(value))) return null
      if (hostRect.width <= 0 || hostRect.height <= 0) return null
      if (positiveFinite(viewportWidth) === 0 || positiveFinite(viewportHeight) === 0) return null
      const horizontal = clampDialogAxis(hostRect.left, hostRect.width, viewportWidth)
      const vertical = clampDialogAxis(hostRect.top, hostRect.height, viewportHeight)
      if (horizontal.size === 0 || vertical.size === 0) return null
      return { left: horizontal.start, top: vertical.start, width: horizontal.size, height: vertical.size }
    }

    function sameDialogRect(left, right) {
      return left !== null && right !== null
        && left.left === right.left && left.top === right.top
        && left.width === right.width && left.height === right.height
    }

    /** The nearest enclosing host panel, found through the dialog's own parent chain. */
    function coverHostOf(boxRef) {
      const node = boxRef.current
      if (node === null || node === undefined) return null
      const parent = node.parentElement
      if (parent === null || parent === undefined || typeof parent.closest !== 'function') return null
      const host = parent.closest('[role="dialog"]')
      if (host === null || host === undefined) return null
      if (host.isConnected === false || typeof host.getBoundingClientRect !== 'function') return null
      return host
    }

    /**
     * Measured geometry for a cover-host dialog. Standard and confirm dialogs pass
     * `active: false`: they never measure a host nor install geometry observers.
     * `size` is a dependency so a tier change disposes the previous listener/observer set.
     */
    function useCoverHostBox(boxRef, active, size) {
      const [hostBox, setHostBox] = useState(null)
      const lastBoxRef = useRef(null)
      useLayoutEffect(() => {
        const clearMeasurement = () => {
          if (lastBoxRef.current === null) return
          lastBoxRef.current = null
          setHostBox(null)
        }
        let observer = null
        let observedHost = null
        const update = () => {
          const host = coverHostOf(boxRef)
          if (host !== observedHost) {
            if (observer !== null) {
              observer.disconnect()
              observer = null
            }
            observedHost = host
            if (host !== null && typeof ResizeObserver === 'function') {
              observer = new ResizeObserver(update)
              observer.observe(host)
            }
          }
          const viewportWidth = typeof window === 'undefined' || window === null ? 0 : window.innerWidth
          const viewportHeight = typeof window === 'undefined' || window === null ? 0 : window.innerHeight
          const next = host === null ? null : coverHostRectOf(host.getBoundingClientRect(), viewportWidth, viewportHeight)
          if (next === null) {
            clearMeasurement()
            return
          }
          if (sameDialogRect(lastBoxRef.current, next)) return
          lastBoxRef.current = next
          setHostBox(next)
        }

        if (active !== true) {
          clearMeasurement()
          return undefined
        }
        update()
        if (typeof window === 'undefined' || window === null || typeof window.addEventListener !== 'function') return undefined
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        return () => {
          window.removeEventListener('resize', update)
          window.removeEventListener('scroll', update, true)
          if (observer !== null) observer.disconnect()
          clearMeasurement()
        }
      }, [active, size])
      return hostBox
    }

    /**
     * Modal dialog. `standard` keeps the fixed tier; only an explicit `mode: 'cover-host'`
     * measures the enclosing settings panel (confirm is always standard). The body is the
     * only scroll region; Escape and the backdrop dismiss the topmost dialog.
     */
    function Dialog(props) {
      const boxRef = useRef(null)
      const stackToken = useRef({})
      const onCloseRef = useRef(props.onClose)
      onCloseRef.current = props.onClose
      const mode = dialogModeOf(props)
      const hostBox = useCoverHostBox(boxRef, mode === 'cover-host', props.size)
      useEffect(() => {
        const token = stackToken.current
        dialogStack.push(token)
        lockBodyScroll()
        const onKeyDown = (event) => {
          if (dialogStack[dialogStack.length - 1] !== token) return
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopImmediatePropagation()
            hideTooltip()
            const close = onCloseRef.current
            if (typeof close === 'function') close()
            return
          }
          if (event.key !== 'Tab') return
          const node = boxRef.current
          const list = focusableIn(node)
          if (list.length === 0) {
            event.preventDefault()
            return
          }
          const first = list[0]
          const last = list[list.length - 1]
          const active = document.activeElement
          if (event.shiftKey && (active === first || node.contains(active) !== true)) {
            event.preventDefault()
            focusQuietly(last)
          } else if (!event.shiftKey && (active === last || node.contains(active) !== true)) {
            event.preventDefault()
            focusQuietly(first)
          }
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown, true)
          unlockBodyScroll()
          hideTooltip()
          const index = dialogStack.indexOf(token)
          if (index !== -1) dialogStack.splice(index, 1)
        }
      }, [])
      useEffect(() => {
        const node = boxRef.current
        if (node === null || typeof node.querySelector !== 'function') return undefined
        const requested = props.initialFocus
        let next = null
        if (requested !== null && requested !== undefined && typeof requested === 'object' && requested.current !== undefined) next = requested.current
        else if (typeof requested === 'string') next = node.querySelector(requested)
        if (next === null || next === undefined) next = node.querySelector('input, select, textarea') || node.querySelector('button')
        focusQuietly(next)
        const returnFocus = props.returnFocus
        return () => {
          focusQuietly(returnFocus)
        }
      }, [])
      // Cover-host geometry is the §6.7 exception: viewport-fixed left/top/width/height
      // come from the measured host rect; no visual styling is inlined here.
      const measuredStyle = hostBox === null
        ? null
        : { left: hostBox.left + 'px', top: hostBox.top + 'px', width: hostBox.width + 'px', height: hostBox.height + 'px' }

      return h(
        'div',
        {
          className: 'mm-backdrop',
          onMouseDown: (event) => {
            if (event.target !== event.currentTarget) return
            if (dialogStack[dialogStack.length - 1] !== stackToken.current) return
            hideTooltip()
            const close = onCloseRef.current
            if (typeof close === 'function') close()
          },
        },
        h(
          'div',
          {
            className: 'mm-dialog' + (props.size === 'confirm' ? ' mm-dialog-confirm' : ''),
            'data-mode': mode,
            'data-measured': hostBox === null ? undefined : 'true',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            tabIndex: -1,
            ref: boxRef,
            style: Object.assign({ boxShadow: 'none' }, measuredStyle),
          },
          h(
            'div',
            { className: 'mm-dialog-head' },
            h('h3', { className: 'mm-dialog-title' }, props.title),
            h(
              'div',
              { className: 'mm-dialog-head-actions' },
              props.headerExtra !== undefined && props.headerExtra !== null ? props.headerExtra : null,
              h(IconButton, {
                icon: ICON_X,
                size: 16,
                label: props.closeLabel,
                tooltip: props.closeTooltip,
                onClick: () => {
                  hideTooltip()
                  if (typeof props.onClose === 'function') props.onClose()
                },
              }),
            ),
          ),
          h('div', { className: 'mm-dialog-body' }, props.children),
          props.footer !== undefined && props.footer !== null
            ? h('div', { className: 'mm-dialog-foot' }, props.footer)
            : null,
        ),
      )
    }
