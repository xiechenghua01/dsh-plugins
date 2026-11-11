    function makeMoneyFormat(locale, currency, maxDigits) {
      const digits = typeof maxDigits === 'number' && Number.isFinite(maxDigits) ? maxDigits : 4
      try {
        return {
          format: new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: digits,
          }),
          suffix: '',
        }
      } catch (error) {
        return {
          format: safeNumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits }),
          suffix: ' ' + currency,
        }
      }
    }

    /** Build every number/date formatter once per (locale, currency) pair. */
    function createFormatters(localeInput, currencyInput) {
      const locale = safeLocaleTag(localeInput)
      const currency = toText(currencyInput) === '' ? 'USD' : currencyInput
      const integer = safeNumberFormat(locale, { maximumFractionDigits: 0 })
      const decimal = safeNumberFormat(locale, { maximumFractionDigits: 2 })
      const compact = safeNumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
      const ratioFormat = safeNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
      const percentFormat = safeNumberFormat(locale, {
        style: 'unit',
        unit: 'percent',
        unitDisplay: 'narrow',
        maximumFractionDigits: 1,
      })
      const dateFormat = safeDateFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
      const timeFormat = safeDateFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const dayFormat = safeDateFormat(locale, { month: 'short', day: 'numeric' })
      const moneyFormat = makeMoneyFormat(locale, currency)
      const moneyShortFormat = makeMoneyFormat(locale, currency, 2)
      return {
        locale: locale,
        currency: currency,
        integer(value) {
          return integer.format(toNumber(value))
        },
        decimal(value) {
          return decimal.format(toNumber(value))
        },
        compact(value) {
          return compact.format(toNumber(value))
        },
        ratio(value) {
          return ratioFormat.format(clamp01(toNumber(value)))
        },
        percent(value) {
          return percentFormat.format(clamp(toNumber(value), 0, 100))
        },
        date(value) {
          return formatDateValue(dateFormat, value)
        },
        time(value) {
          return formatDateValue(timeFormat, value)
        },
        day(value) {
          return formatDateValue(dayFormat, value)
        },
        money(value) {
          return moneyFormat.format.format(toNumber(value)) + moneyFormat.suffix
        },
        moneyShort(value) {
          return moneyShortFormat.format.format(toNumber(value)) + moneyShortFormat.suffix
        },
        bytes(value) {
          return formatBytes(value, integer, decimal)
        },
        uptime(value) {
          return formatUptime(locale, value)
        },
      }
    }

    function useFormatters(locale, currency) {
      return useMemo(() => createFormatters(locale, currency), [locale, currency])
    }

