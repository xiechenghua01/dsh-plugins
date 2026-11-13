/* 工具栏与 Tab —— 由原 90-styles.js 按章节拆出（行 228-731）。 */
const STYLES_2 = `
 * 3. Toolbar: search, sort, native icon buttons                      *
 * ------------------------------------------------------------------ */

.sm-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
  min-width: 0;
  /* 技能页与市场页共用同一行结构：撑满内容列，右对齐到同一右边界。 */
  width: 100%;
}

/* Split menu: DSH plugin-page dropdown shape — larger radius, roomier rows. */
.sm-menu.sm-split-menu {
  padding: 6px;
  border-radius: var(--dsw-radius-lg);
  min-width: 200px;
  max-width: 200px;
  border-color: var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
}

.sm-split-menu .sm-menu-item {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-sm);
  gap: 8px;
  font-size: var(--ds-fs);
}

.sm-split-menu .sm-menu-item .sm-menu-icon {
  width: 18px;
  color: var(--dsw-alias-label-secondary);
}

.sm-split-btn {
  display: inline-flex;
  align-items: center;
  flex: none;
}

/* Split button: the primary half keeps the left radius, the caret the right one. */
.sm-toolbar .sm-split-btn .sm-btn.sm-split-main {
  border-radius: var(--dsw-radius-md) 0 0 var(--dsw-radius-md);
}

.sm-toolbar .sm-split-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 0 var(--dsw-radius-md) var(--dsw-radius-md) 0;
  background: var(--dsw-static-neutral-bluish-50, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-static-neutral-bluish-1000, var(--dsw-alias-label-primary-foreground));
  cursor: pointer;
  box-shadow: inset 1px 0 0 var(--dsw-alias-border-l1);
}

.sm-toolbar .sm-split-arrow:hover {
  background: var(--dsw-static-neutral-bluish-60, var(--dsw-alias-bg-layer-2));
}

.sm-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  /* 两页按钮组按最宽的一组预留，搜索框与排序框因此落在同一位置。 */
  min-width: 250px;
  justify-content: flex-end;
}

/* Toolbar buttons follow the plugin page: the secondary one is borderless and
 * transparent, the primary one is the near-white fill with dark label. */
.sm-toolbar .sm-btn.sm-toolbar-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-md);
  font-size: calc(var(--ds-fs) - 1px);
  font-weight: 400;
}

.sm-toolbar .sm-btn-secondary.sm-toolbar-btn {
  background: transparent;
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
}

.sm-toolbar .sm-btn-secondary.sm-toolbar-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-toolbar .sm-btn-primary.sm-toolbar-btn {
  background: var(--dsw-static-neutral-bluish-50, var(--dsw-alias-bg-layer-1));
  border-color: var(--dsw-static-neutral-bluish-50, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-static-neutral-bluish-1000, var(--dsw-alias-label-primary-foreground));
}

.sm-toolbar .sm-btn-primary.sm-toolbar-btn:hover:not(:disabled) {
  background: var(--dsw-static-neutral-bluish-60, var(--dsw-alias-bg-layer-2));
  border-color: var(--dsw-static-neutral-bluish-60, var(--dsw-alias-bg-layer-2));
}

.sm-toolbar-icons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.sm-search {
  position: relative;
  width: 240px;
  max-width: 100%;
  height: 34px;
  padding: 0 32px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3);
  border: 0.5px solid var(--dsw-alias-border-l4);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
  line-height: 32px;
  outline: none;
}

.sm-search::placeholder,
.sm-search input::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-search:focus,
.sm-search:focus-within {
  border-color: var(--dsw-alias-state-business-primary);
}

.sm-search input,
.sm-search .sm-search-input {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
}

.sm-search > svg,
.sm-search .sm-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  color: var(--dsw-alias-label-caption);
  pointer-events: none;
}

.sm-search-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--dsw-radius-panel);
  background: transparent;
  color: var(--dsw-alias-label-caption);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sm-search-clear:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-select {
  height: 34px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid var(--dsw-alias-border-l4);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--ds-fs) - 1px);
  font-family: inherit;
  cursor: pointer;
  outline: none;
}

.sm-select:focus {
  border-color: var(--dsw-alias-border-l3);
}

.sm-sort {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-sort-label {
  font-size: calc(var(--ds-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}

/* Native .iconButton: 32×32 hit area, 6px padding, radius-sm,
 * hover bg-layer-1 + label-primary. */
.sm-tool-btn {
  width: 32px;
  height: 32px;
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  border: 0;
  color: var(--dsw-alias-label-tertiary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm-tool-btn svg {
  width: 16px;
  height: 16px;
}

.sm-tool-btn:hover:not(:disabled),
.sm-tool-btn:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* Transitional alias: market toolbar markup still renders .sm-icon-btn until
 * R3 switches it to .sm-tool-btn; both must be 32×32 here. */
.sm-toolbar-icons .sm-icon-btn {
  width: 32px;
  height: 32px;
  padding: 6px;
}

/* Plain icon button (row ⋯, refresh, dialog close). */
.sm-icon-btn {
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.sm-icon-btn svg {
  width: 16px;
  height: 16px;
}

.sm-icon-btn:hover:not(:disabled),
.sm-icon-btn:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

.sm-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-icon-btn.plain {
  background: transparent;
  border: 0;
}

.sm-icon-btn.plain:hover {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* ------------------------------------------------------------------ *
 * 4. Tabs                                                            *
 * ------------------------------------------------------------------ */

/* Tab row: primary tabs on the left, status icons on the right. */
.sm-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

/* Primary tabs: 42px container (34px item + 4px padding), 34px tabs (§7.3). */
.sm-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 42px;
  padding: 4px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-3);
  width: fit-content;
  max-width: 100%;
  flex-shrink: 0;
}

.sm-tab {
  height: 34px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-lg);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: var(--ds-fs);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
}

/* Hover only changes the background; selection is what raises the text
 * colour to primary (native parity §2.1). */
.sm-tab:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

/* .selected is the canonical selected-state name (design §2.5);
 * .active remains a legacy alias with the same selected semantics. */
.sm-tab.selected,
.sm-tab.active,
.sm-tab.sm-active,
.sm-tab.sm-tab-active,
.sm-tab[aria-selected="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}

.sm-tab-badge,
.sm-tab-count,
.sm-count-badge {
  min-width: 16px;
  /* The label shrinks 3px against --ds-fs; a fixed height and line-height clip it
   * once the host font-size grows, so the box must scale with the token. */
  min-height: calc(var(--ds-fs) + 2px);
  padding: 0 6px;
  border-radius: var(--dsw-radius-panel);
  background: transparent;
  color: var(--dsw-alias-label-caption);
  font-size: calc(var(--ds-fs) - 3px);
  font-weight: 500;
  line-height: normal;
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sm-tab.selected .sm-tab-badge,
.sm-tab.active .sm-tab-badge,
.sm-tab.sm-active .sm-tab-badge,
.sm-tab.sm-tab-active .sm-tab-badge,
.sm-tab[aria-selected="true"] .sm-tab-badge,
.sm-tab.selected .sm-tab-count,
.sm-tab.active .sm-tab-count,
.sm-tab.sm-active .sm-tab-count,
.sm-tab.sm-tab-active .sm-tab-count,
.sm-tab[aria-selected="true"] .sm-tab-count {
  color: var(--dsw-alias-label-tertiary);
}

.sm-tab-count-warn {
  color: var(--dsw-alias-state-warn-primary);
}

/* Secondary tabs: native .filterTab — 28px / radius 14 / 0 10 padding,
 * hover and selected use the same background. */
.sm-subtabs-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.sm-subtabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.sm-subtab {
  height: 28px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-lg);
  font-size: var(--ds-fs);
  line-height: 22px;
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  border: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.sm-subtab:hover,
.sm-subtab[aria-selected="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-subtab[aria-selected="true"] {
  color: var(--dsw-alias-label-primary);
}

.sm-subtab[aria-selected="true"] .sm-count-badge {
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
}

/* Status icons: 32×32 hit area, 16px glyph, semantic colours. */
.sm-status-icons {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.sm-status-btn {
  width: 32px;
  height: 32px;
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  border: 0;
  flex-shrink: 0;
}

.sm-status-btn svg {
  width: 16px;
  height: 16px;
}

.sm-status-btn.warn {
  color: var(--dsw-alias-state-warn-primary);
}

.sm-status-btn.update {
  color: var(--dsw-alias-state-business-primary);
}

.sm-status-btn:hover:not(:disabled),
.sm-status-btn:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* v2 markup: .sm-icon-btn.sm-status-icon — same 32×32 hit area. */
.sm-icon-btn.sm-status-icon {
  width: 32px;
  height: 32px;
  padding: 6px;
}

.sm-icon-btn.sm-status-icon svg {
  width: 16px;
  height: 16px;
}

.sm-status-icon-warn {
  color: var(--dsw-alias-state-warn-primary);
}

.sm-status-icon-update {
  color: var(--dsw-alias-state-business-primary);
}

.sm-icon-btn.sm-status-icon:hover:not(:disabled),
.sm-icon-btn.sm-status-icon:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* ------------------------------------------------------------------ *
`
