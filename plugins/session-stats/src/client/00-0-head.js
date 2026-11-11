    /** Plugin identity, reused by the overlay scope container and the style element. */
    const PLUGIN_ID = '@chengze/dsh-session-stats'
    /** Locale namespace shared by the dictionaries, the page and the sidebar entry. */
    const NS = 'session-stats'
    /** Main panel key; the sidebar entry id must equal it so the entry addresses this page. */
    const PANEL_ID = 'session-stats'
    /** Timeline window requested from the Host; matches the Host config default. */
    const DAYS = 30
    const OVERVIEW_POLL_MS = 10000
    const SYSTEM_POLL_MS = 2000
    const TABLE_LIMIT = 50
    /** Collapsed session table rows; the expanded table is a fixed ten-row window. */
    const SESSIONS_COLLAPSED_ROWS = 5
    const SESSIONS_WINDOW_ROWS = 10
    const DEFAULT_LOCALE = 'zh-CN'
    const DASH = '\u2014'

