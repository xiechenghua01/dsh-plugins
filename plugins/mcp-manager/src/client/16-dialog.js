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

    /**
     * Modal dialog. The confirm tier stays fixed at 480px. The editor tier covers the layer
     * beneath: it measures the enclosing settings panel and follows its size, clamped to the
     * viewport (an explicit user requirement that supersedes the fixed tier in design.md §7.6).
     * The body is the only scroll region; Escape and the backdrop dismiss the topmost dialog.
     */
    function Dialog(props) {
      const boxRef = useRef(null)
      const stackToken = useRef({})
      const onCloseRef = useRef(props.onClose)
      onCloseRef.current = props.onClose

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

      // The editor dialog covers the layer beneath: size it to the enclosing settings panel.
      // Even though the dialog renders inside the fixed `.mm-backdrop` layer, the React tree
      // stays under the host panel, so `closest` can find it from the dialog node.
      const [hostBox, setHostBox] = useState(null)
      useLayoutEffect(() => {
        if (props.size === 'confirm') return undefined
        const measure = () => {
          const node = boxRef.current
          if (node === null || node.parentElement === null) return
          const host = node.parentElement.closest('[role="dialog"]')
          if (host === null) return
          const rect = host.getBoundingClientRect()
          const width = Math.round(Math.min(rect.width, window.innerWidth - 32))
          const height = Math.round(Math.min(rect.height, window.innerHeight - 32))
          if (width > 0 && height > 0) setHostBox({ width: width, height: height })
        }
        measure()
        window.addEventListener('resize', measure)
        return () => {
          window.removeEventListener('resize', measure)
        }
      }, [])

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
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            tabIndex: -1,
            ref: boxRef,
            style:
              hostBox === null
                ? { boxShadow: 'none' }
                : {
                    width: hostBox.width + 'px',
                    height: hostBox.height + 'px',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    boxShadow: 'none',
                  },
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
