    /* ------------------------------------------------------------------ *
     * HTTP API.                                                          *
     * ------------------------------------------------------------------ */

    async function callApi(op, args) {
      let response
      try {
        response = await fetch(API_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ op: op, args: args !== undefined && args !== null ? args : {} }),
        })
      } catch (failure) {
        const transport = new Error(messageOf(failure) || 'request failed')
        transport.code = 'transport'
        throw transport
      }
      if (response.status === 401) {
        const unauthorized = new Error('unauthorized')
        unauthorized.code = 'unauthorized'
        unauthorized.status = 401
        throw unauthorized
      }
      let payload = null
      try {
        payload = await response.json()
      } catch (error) {
        const invalid = new Error('invalid response from the host')
        invalid.code = 'protocol'
        throw invalid
      }
      if (payload === null || typeof payload !== 'object') {
        const invalid = new Error('invalid response from the host')
        invalid.code = 'protocol'
        throw invalid
      }
      if (payload.ok !== true) {
        const failure = new Error(typeof payload.error === 'string' && payload.error !== '' ? payload.error : 'request failed')
        failure.code = typeof payload.code === 'string' ? payload.code : 'unknown'
        throw failure
      }
      return payload
    }

