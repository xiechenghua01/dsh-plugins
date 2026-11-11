    /* ------------------------------------------------------------------ *
     * Small pure helpers (defensive reads: every payload field may be absent). *
     * ------------------------------------------------------------------ */

    function toNumber(value) {
      return typeof value === 'number' && Number.isFinite(value) ? value : 0
    }

    function toNullableNumber(value) {
      return typeof value === 'number' && Number.isFinite(value) ? value : null
    }

    function toObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
    }

    function toArray(value) {
      return Array.isArray(value) ? value : []
    }

    function toText(value) {
      return typeof value === 'string' && value.length > 0 ? value : ''
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value))
    }

    function clamp01(value) {
      return clamp(value, 0, 1)
    }

    function totalTokens(tokens) {
      const bag = toObject(tokens)
      const declared = toNumber(bag.total)
      if (declared > 0) return declared
      return toNumber(bag.input) + toNumber(bag.output) + toNumber(bag.cacheRead) + toNumber(bag.cacheWrite)
    }

    function shortSessionId(id) {
      if (id.length <= 18) return id
      return id.slice(0, 8) + '\u2026' + id.slice(-6)
    }

    function safeLocaleTag(value) {
      return typeof value === 'string' && value.length > 0 ? value : DEFAULT_LOCALE
    }

    function safeNumberFormat(locale, options) {
      try {
        return new Intl.NumberFormat(locale, options)
      } catch (error) {
        try {
          return new Intl.NumberFormat(DEFAULT_LOCALE, options)
        } catch (fallbackError) {
          return new Intl.NumberFormat('en', options)
        }
      }
    }

    function safeDateFormat(locale, options) {
      try {
        return new Intl.DateTimeFormat(locale, options)
      } catch (error) {
        try {
          return new Intl.DateTimeFormat(DEFAULT_LOCALE, options)
        } catch (fallbackError) {
          return new Intl.DateTimeFormat('en', options)
        }
      }
    }

    function formatDateValue(format, value) {
      const ms = toNumber(value)
      if (ms <= 0) return ''
      try {
        return format.format(new Date(ms))
      } catch (error) {
        return ''
      }
    }

    function formatBytes(value, integer, decimal) {
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      let size = Math.max(0, toNumber(value))
      let unit = 0
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit += 1
      }
      if (unit === 0) return integer.format(Math.round(size)) + ' B'
      return (size >= 100 ? integer : decimal).format(size) + ' ' + units[unit]
    }

    function formatUptime(locale, seconds) {
      const total = Math.max(0, Math.floor(toNumber(seconds)))
      const days = Math.floor(total / 86400)
      const hours = Math.floor((total % 86400) / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const unitFormat = (unit) => {
        try {
          return new Intl.NumberFormat(locale, { style: 'unit', unit: unit, unitDisplay: 'narrow', maximumFractionDigits: 0 })
        } catch (error) {
          return null
        }
      }
      const dayFormat = unitFormat('day')
      const hourFormat = unitFormat('hour')
      const minuteFormat = unitFormat('minute')
      const parts = []
      if (dayFormat !== null && days > 0) parts.push(dayFormat.format(days))
      if (hourFormat !== null && (days > 0 || hours > 0)) parts.push(hourFormat.format(hours))
      if (minuteFormat !== null && (days > 0 || hours > 0 || minutes > 0)) parts.push(minuteFormat.format(minutes))
      if (parts.length === 0) return ''
      return parts.join(' ')
    }

