    /* ================================================================== *
     * 00-prelude.js                                                       *
     * Constants, locale dictionaries, helpers, mutable state and loaders. *
     * Every symbol here is shared with the later fragments.               *
     * ================================================================== */

    const NS = 'skillManager'
    const PANEL_ID = 'skill-manager'
    const DEFAULT_FONT_SIZE = 14
    const API_BASE = '/skill-manager/api/'

    /** Shared dataTransfer key for source drag-and-drop (see 30-source-dialog). */
    const DRAG_KEY = 'application/x-sm-source'

    /** Secondary tabs of the skills page, in fixed display order. */
    const SKILL_CATEGORIES = ['mine', 'shared', 'project', 'system']

    /** Skills-page sort values (contract 3.1: name / modified / source). */
    const SKILL_SORTS = ['name', 'modified', 'source']
    /** Literal label keys: the checker only sees keys written as string literals. */
    const SKILL_SORT_LABEL_KEYS = { name: 'sort.name', modified: 'sort.modified', source: 'sort.source' }

    /** Market sort values (contract 3.5). */
    const MARKET_SORTS = ['recommend', 'updated', 'name']

    /* ------------------------------------------------------------------ *
     * State (contract 3.5). Infrastructure fields (cwd / fontSize /       *
     * locale / toasts) are kept alongside the contract fields.            *
     * ------------------------------------------------------------------ */
