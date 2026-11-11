    const NS = 'mcp-manager'
    const API_PATH = 'mcp-manager/api'
    const POLL_MS = 4000
    const DEFAULT_TIMEOUT_MS = 60000
    const DEFAULT_MAX_RETRIES = 3
    const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/u
    const HTTP_URL_PATTERN = /^https?:\/\//iu
    const DASH = '—'

    const JS_MARKER_PREFIX = '@@js:'
    const STR_ESCAPE_PREFIX = '@@str:'
    const JS_MARKER_PATTERN = /^@@js:([\s\S]*)@@$/u

    const ICON_HELP = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    const ICON_ZAP = 'M13 10V3L4 14h7v7l9-11h-7z'
    const ICON_PLUS = 'M12 4v16m8-8H4'
    const ICON_SEARCH = 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
    const ICON_POWER = 'M12 3v9m6.364-5.364a9 9 0 11-12.728 0'
    const ICON_REFRESH = 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
    const ICON_EDIT = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
    const ICON_TRASH = 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
    const ICON_CHEVRON = 'M19 9l-7 7-7-7'
    const ICON_X = 'M6 18L18 6M6 6l12 12'
    const ICON_PLUG = 'M9 7V4m6 3V4M7 7h10v3a5 5 0 01-10 0V7Zm5 8v5'

    /** Sample shared JSON; deliberately free of machine-specific paths. */
    const JSON_SAMPLE = {
      mcpServers: {
        playwright: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', '@executeautomation/playwright-mcp-server'],
          autoApprove: ['playwright_navigate', 'playwright_screenshot'],
        },
      },
    }

