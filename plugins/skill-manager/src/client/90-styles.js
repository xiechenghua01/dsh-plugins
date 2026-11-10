    /** Every style rule of the panel, scoped under .sm-root. */
    const STYLES = `
/* ================================================================== *
 * skill-manager v2 — DSH native-parity stylesheet                     *
 * Contract: design/implementation-contract-v2.md §7                   *
 * Rules: token colours only (--dsw-* / color-mix on tokens);          *
 *        font sizes only via --sm-fs; no gradients; no box-shadow     *
 *        except "none"; hover and selected share one background       *
 *        token and differ by text colour.                             *
 * ================================================================== */

/* ------------------------------------------------------------------ *
 * 1. Root, font scale and reset                                      *
 * ------------------------------------------------------------------ */

.sm-root,
.sm-root *,
.sm-root *::before,
.sm-root *::after {
  box-sizing: border-box;
}

.sm-root {
  --sm-fs: var(--dsh-content-font-size, 14px);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Low-specificity reset: :where() keeps component classes in control of
 * background / colour / font-size. */
.sm-root :where(button),
.sm-root :where(input),
.sm-root :where(select),
.sm-root :where(textarea) {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  background: none;
  border: none;
  outline: none;
}

.sm-root :where(button) {
  cursor: pointer;
}

.sm-root :where(button):disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

/* Native focus: background + text colour, never a coloured outline. */
.sm-root :where(button, [tabindex]):focus-visible {
  outline: none;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-root :where(input, select, textarea):focus-visible {
  outline: none;
  border-color: var(--dsw-alias-border-l3);
}

/* Scroll surfaces share one thin scrollbar. */
.sm-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  padding: 0 0 48px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-scroll::-webkit-scrollbar,
.sm-dialog-body::-webkit-scrollbar,
.sm-source-list::-webkit-scrollbar,
.sm-drawer::-webkit-scrollbar,
.sm-code::-webkit-scrollbar,
.sm-files::-webkit-scrollbar,
.sm-editor::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.sm-scroll::-webkit-scrollbar-track,
.sm-dialog-body::-webkit-scrollbar-track,
.sm-source-list::-webkit-scrollbar-track,
.sm-drawer::-webkit-scrollbar-track,
.sm-code::-webkit-scrollbar-track,
.sm-files::-webkit-scrollbar-track,
.sm-editor::-webkit-scrollbar-track {
  background: transparent;
}

.sm-scroll::-webkit-scrollbar-thumb,
.sm-dialog-body::-webkit-scrollbar-thumb,
.sm-source-list::-webkit-scrollbar-thumb,
.sm-drawer::-webkit-scrollbar-thumb,
.sm-code::-webkit-scrollbar-thumb,
.sm-files::-webkit-scrollbar-thumb,
.sm-editor::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l1);
  border-radius: 999px;
}

/* ------------------------------------------------------------------ *
 * 2. Page skeleton: 960px content column, fluid side inset           *
 * ------------------------------------------------------------------ */

.sm-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Only the outer page (list / detail shell) fills the panel; nested tab
 * pages grow naturally inside .sm-tab-view.sm-scroll. */
.sm-root > .sm-page {
  flex: 1 1 auto;
  overflow: hidden;
  --sm-content-max: 960px;
  padding: 40px clamp(20px, 4vw, 48px) 0;
}

/* Header, tabs, list and detail share the same column, so their left
 * edges line up instead of hugging the window edge. */
.sm-root > .sm-page > * {
  width: 100%;
  max-width: var(--sm-content-max);
  margin-inline: auto;
}

.sm-tab-view {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.sm-page-detail {
  min-height: 0;
}

/* Header → primary tabs keeps one step above the 16px in-page rhythm, so
 * the 40px top inset reads as breathing room rather than a gap. */
.sm-page > * + * {
  margin-top: 20px;
}

.sm-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-page-head-text {
  min-width: 0;
}

.sm-page-title {
  margin: 0;
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.sm-page-desc {
  margin: 6px 0 0;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

/* v1 aliases kept for the current header markup. */
.sm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-header > div:first-child {
  min-width: 0;
}

.sm-title {
  margin: 0;
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.sm-desc {
  margin: 6px 0 0;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

/* ------------------------------------------------------------------ *
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
}

.sm-toolbar-icons {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sm-search {
  position: relative;
  width: 240px;
  max-width: 100%;
  height: 33px;
  padding: 0 28px 0 32px;
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 31px;
  outline: none;
}

.sm-search::placeholder,
.sm-search input::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-search:focus,
.sm-search:focus-within {
  border-color: var(--dsw-alias-border-l3);
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
  border-radius: 999px;
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
  height: 33px;
  padding: 0 10px;
  border-radius: 12px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 1px);
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
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}

/* Native .iconButton: 30×30 hit area, 6px padding, radius-sm,
 * hover bg-layer-1 + label-primary. */
.sm-tool-btn {
  width: 30px;
  height: 30px;
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
 * R3 switches it to .sm-tool-btn; both must be 30×30 here. */
.sm-toolbar-icons .sm-icon-btn {
  width: 30px;
  height: 30px;
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

/* Primary tabs: 34px container, 28px tabs (contract §7.1). */
.sm-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 3px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-3);
  width: fit-content;
  max-width: 100%;
  flex-shrink: 0;
}

.sm-tab {
  height: 28px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-lg);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: var(--sm-fs);
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

.sm-tab.active,
.sm-tab.sm-active,
.sm-tab.sm-tab-active,
.sm-tab[aria-selected="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-tab-badge,
.sm-tab-count,
.sm-count-badge {
  min-width: 16px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-caption);
  font-size: calc(var(--sm-fs) - 3px);
  font-weight: 500;
  line-height: 18px;
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sm-tab.active .sm-tab-badge,
.sm-tab.sm-active .sm-tab-badge,
.sm-tab.sm-tab-active .sm-tab-badge,
.sm-tab[aria-selected="true"] .sm-tab-badge,
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
  padding: 0 10px;
  border-radius: 14px;
  font-size: var(--sm-fs);
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
 * 5. Controls: buttons, chips, inputs, switch                        *
 * ------------------------------------------------------------------ */

.sm-btn,
.sm-btn-primary,
.sm-btn-secondary,
.sm-btn-ghost,
.sm-btn-icon,
.sm-btn-danger,
.sm-btn-dangerSolid {
  height: 32px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-weight: 500;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
}

.sm-btn:disabled,
.sm-btn-primary:disabled,
.sm-btn-secondary:disabled,
.sm-btn-ghost:disabled,
.sm-btn-icon:disabled,
.sm-btn-danger:disabled,
.sm-btn-dangerSolid:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-btn-primary {
  background: var(--dsw-alias-button-primary-fill, var(--dsw-alias-label-primary));
  border-color: var(--dsw-alias-button-primary-fill, var(--dsw-alias-label-primary));
  color: var(--dsw-alias-label-primary-foreground, var(--dsw-alias-bg-base));
}

.sm-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.sm-btn-secondary {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}

.sm-btn-secondary:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-3);
}

.sm-btn-ghost {
  padding: 0 10px;
  background: transparent;
  border-color: transparent;
  color: var(--dsw-alias-label-secondary);
}

.sm-btn-ghost:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-btn-icon {
  width: 30px;
  height: 30px;
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  border-color: transparent;
  color: var(--dsw-alias-label-tertiary);
}

.sm-btn-icon:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

.sm-btn-danger {
  background: var(--dsw-alias-state-error-primary);
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-label-primary);
}

.sm-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, transparent);
}

.sm-btn-dangerSolid {
  background: var(--dsw-alias-state-error-primary);
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-bg-base);
}

.sm-btn-dangerSolid:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, transparent);
}

.sm-btn-sm {
  height: 28px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: calc(var(--sm-fs) - 2px);
}

.sm-check-updates {
  gap: 6px;
}

.sm-link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
}

.sm-link-btn:hover {
  color: var(--dsw-alias-label-primary);
  text-decoration: underline;
}

.sm-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-chip {
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 2px);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  cursor: pointer;
}

.sm-chip:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

/* Selected chips follow the same rule as tabs: same background token as
 * hover, text colour carries the state. */
.sm-chip.active,
.sm-chip.sm-active,
.sm-chip.sm-chip-active,
.sm-chip[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-chip-active {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-input {
  width: 100%;
  height: 33px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  outline: none;
}

.sm-input::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-input:focus {
  border-color: var(--dsw-alias-border-l3);
}

textarea.sm-input {
  height: auto;
  padding: 8px 12px;
  resize: vertical;
  min-height: 62px;
  line-height: 1.55;
}

textarea.sm-input.sm-edit-body {
  min-height: 320px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.65;
}

.sm-textarea {
  width: 100%;
  min-height: 96px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.sm-textarea:focus {
  border-color: var(--dsw-alias-border-l3);
}

.sm-switch {
  position: relative;
  width: 36px;
  height: 20px;
  padding: 2px;
  border-radius: 999px;
  border: none;
  background: var(--dsw-alias-border-l3);
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
}

.sm-switch[aria-checked="true"],
.sm-switch.on {
  background: var(--dsw-alias-button-primary-fill, var(--dsw-alias-label-primary));
}

.sm-switch.sm-switch-off {
  background: var(--dsw-alias-border-l3);
}

.sm-switch:empty::after {
  content: "";
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  transform: translateX(0);
  transition: transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sm-switch[aria-checked="true"]:empty::after,
.sm-switch.on:empty::after {
  transform: translateX(16px);
}

.sm-switch > .sm-switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  transform: translateX(0);
  transition: transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sm-switch[aria-checked="true"] > .sm-switch-thumb,
.sm-switch.on > .sm-switch-thumb {
  transform: translateX(16px);
}

.sm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm-upgrade-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--dsw-alias-state-success-primary);
}

.sm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ------------------------------------------------------------------ *
 * 6. Two-column card grid (contract §7.3)                            *
 * ------------------------------------------------------------------ */

.sm-card-grid,
.sm-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

@media (max-width: 720px) {
  .sm-card-grid,
  .sm-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.sm-card-item {
  min-height: 96px;
  padding: 12px;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  border-radius: var(--dsw-radius-xl);
  background: var(--dsw-alias-settings-card-fill);
  cursor: pointer;
  transition: background 120ms ease;
}

/* Hover only changes the background: no border, no shift, no scale. */
.sm-card-item:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-card-item.is-disabled {
  opacity: 0.6;
}

.sm-card-item.is-highlight {
  outline: 1.5px solid var(--dsw-alias-brand-primary);
  outline-offset: -1px;
}

.sm-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--dsw-radius-lg);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  position: relative;
  color: var(--dsw-alias-label-secondary);
}

.sm-card-icon svg {
  width: 22px;
  height: 22px;
}

.sm-card-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 1px;
}

.sm-card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.sm-card-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: var(--sm-fs);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.sm-card-desc {
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-tertiary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sm-card-item.is-disabled .sm-card-name,
.sm-card-item.is-disabled .sm-card-desc {
  color: var(--dsw-alias-label-caption);
}

/* Right side: horizontal, ⋯ on the left, primary action on the right. */
.sm-card-tail {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: none;
  align-self: center;
  margin-left: auto;
}

/* ⋯ is hidden by default and fades in on card hover / focus. */
.sm-card-more {
  width: 26px;
  height: 26px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.sm-card-item:hover .sm-card-more,
.sm-card-item:focus-within .sm-card-more,
.sm-card-more:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

/* ------------------------------------------------------------------ *
 * 7. Groups (source grouping in the skills tab)                      *
 * ------------------------------------------------------------------ */

.sm-installed {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-installed-loading {
  gap: 12px;
}

.sm-groups,
.sm-skill-groups {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sm-group + .sm-group {
  margin-top: 24px;
}

.sm-group-head {
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px;
  margin-bottom: 10px;
  min-width: 0;
  font-size: var(--sm-fs);
  font-weight: 500;
}

.sm-group-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-group-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sm-group-title {
  font-size: var(--sm-fs);
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
}

.sm-group-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  font-weight: 400;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 380px;
  min-width: 0;
}

.sm-group-count {
  font-size: calc(var(--sm-fs) - 2px);
  font-weight: 400;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-group-head-toggle {
  cursor: pointer;
  user-select: none;
}

.sm-group-disabled {
  opacity: 0.72;
}

.sm-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  min-width: 0;
}

/* Market source blocks (v2) */
.sm-market-blocks {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
}

.sm-source-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.sm-market > .sm-source-block + .sm-source-block {
  margin-top: 28px;
}

.sm-source-block-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
  min-width: 0;
}

.sm-source-block-title {
  font-size: var(--sm-fs);
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-source-block-count {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
}

.sm-source-block-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ *
 * 8. Rows (legacy market / skeleton rows)                            *
 * ------------------------------------------------------------------ */

.sm-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sm-row {
  min-height: 72px;
  padding: 8px 10px;
  border-radius: 20px;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
  cursor: pointer;
  transition: background 120ms ease;
}

.sm-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-row.selected {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l2);
}

.sm-row.market,
.sm-row-market,
.sm-market .sm-row,
.sm-row[data-kind="market"] {
  min-height: 84px;
  background: var(--dsw-alias-settings-card-fill);
  border-color: var(--dsw-alias-border-l1);
}

.sm-row.market:hover,
.sm-row-market:hover,
.sm-market .sm-row:hover,
.sm-row[data-kind="market"]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l1);
}

.sm-row-icon,
.sm-icon-box {
  width: 49px;
  height: 49px;
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  color: var(--dsw-alias-label-secondary);
}

.sm-row-icon svg,
.sm-icon-box svg {
  width: 24px;
  height: 24px;
}

.sm-row.market .sm-icon-box,
.sm-row-market .sm-icon-box,
.sm-market .sm-row .sm-icon-box {
  background: var(--dsw-alias-bg-layer-2);
}

.sm-row-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.sm-row-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sm-row-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: nowrap;
}

.sm-row-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: var(--sm-fs);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 100%;
}

.sm-row-version {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-row-desc {
  flex: 0 0 auto;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.45;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.sm-row-tail {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.sm-row-badges,
.sm-row-tags,
.sm-tag-bar,
.sm-tagbar {
  max-width: 340px;
  overflow: hidden;
  flex-wrap: nowrap;
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  flex-shrink: 1;
}

.sm-market-card {
  min-height: 96px;
}

.sm-market-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.sm-row-builtin {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-row-by {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  min-width: 0;
}

.sm-row-disabled {
  opacity: 0.62;
}

.sm-row-name-disabled {
  color: var(--dsw-alias-label-tertiary);
}

.sm-row-highlight {
  background: var(--dsw-alias-interactive-bg-hover);
  outline: 1.5px solid var(--dsw-alias-brand-primary);
}

.sm-skill-row {
  min-height: 65px;
}

.sm-row-more {
  flex-shrink: 0;
}

/* Status dots */
.sm-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--dsw-alias-label-caption);
  border: 1.5px solid var(--dsw-alias-bg-base);
  flex-shrink: 0;
}

.sm-icon-box > .sm-dot,
.sm-row-icon > .sm-dot,
.sm-detail-icon > .sm-dot,
.sm-card-icon > .sm-dot {
  position: absolute;
  left: 5px;
  bottom: 5px;
}

.sm-dot-ok {
  background: var(--dsw-alias-state-success-primary);
}

.sm-dot-warn {
  background: var(--dsw-alias-state-warn-primary);
}

.sm-dot-error {
  background: var(--dsw-alias-state-error-primary);
}

.sm-dot-idle {
  background: var(--dsw-alias-label-caption);
}

.sm-dot-update {
  background: var(--dsw-alias-brand-primary);
}

/* ------------------------------------------------------------------ *
 * 9. Badges                                                          *
 * ------------------------------------------------------------------ */

.sm-badge,
.sm-badge-update,
.sm-badge-builtin,
.sm-badge-model,
.sm-badge-user,
.sm-badge-loc {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 3px);
  font-weight: 500;
  line-height: 17px;
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-badge-update {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 82%, var(--dsw-alias-label-primary));
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent);
}

.sm-badge-update svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.sm-badge-builtin,
.sm-badge-loc {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  border-color: var(--dsw-alias-border-l1);
}

.sm-badge-model {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 82%, var(--dsw-alias-label-primary));
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent);
}

.sm-badge-user {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  color: color-mix(in srgb, var(--dsw-alias-brand-primary) 82%, var(--dsw-alias-label-primary));
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
}

.sm-badge.warn,
.sm-badge.sm-warn,
.sm-badge-warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent);
  color: var(--dsw-alias-state-warn-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 32%, transparent);
}

.sm-badge.error,
.sm-badge.sm-error,
.sm-badge-error {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent);
  color: var(--dsw-alias-state-error-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, transparent);
}

.sm-badge.success,
.sm-badge.sm-success,
.sm-badge-success,
.sm-badge-ok {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent);
  color: var(--dsw-alias-state-success-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 32%, transparent);
}

.sm-badge-idle {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  border-color: var(--dsw-alias-border-l1);
}

/* ------------------------------------------------------------------ *
 * 10. State surfaces: banners, empty, skeleton, spinner              *
 * ------------------------------------------------------------------ */

.sm-banners {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sm-banner {
  padding: 10px 16px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.sm-banner.warn,
.sm-banner.sm-warn,
.sm-banner-warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, transparent);
}

.sm-banner.error,
.sm-banner.sm-error,
.sm-banner-error {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
}

.sm-banner.update,
.sm-banner.sm-update,
.sm-banner-update,
.sm-banner.info,
.sm-banner.sm-info,
.sm-banner-info {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
}

.sm-banner.ok,
.sm-banner.sm-ok,
.sm-banner-ok,
.sm-banner.success,
.sm-banner.sm-success,
.sm-banner-success {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, transparent);
}

.sm-banner-quiet {
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
}

.sm-banner-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-banner-text {
  min-width: 0;
  font-size: inherit;
  color: inherit;
}

.sm-banner-title {
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.sm-banner-items {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-banner-meta {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  min-width: 0;
}

.sm-banner-detail {
  color: var(--dsw-alias-label-tertiary);
  min-width: 0;
}

.sm-banner-code {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  overflow-wrap: anywhere;
}

.sm-empty {
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
}

.sm-empty-installed {
  padding: 64px 20px;
}

.sm-empty-error .sm-empty-icon {
  color: var(--dsw-alias-state-error-primary);
}

.sm-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary);
  margin-bottom: 2px;
}

.sm-empty-title {
  font-size: calc(var(--sm-fs) + 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
}

.sm-empty-body {
  max-width: 420px;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

.sm-empty-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.sm-market-empty {
  padding: 40px 20px;
}

.sm-skeleton {
  width: 100%;
  min-height: 14px;
  border-radius: 12px;
  background: var(--dsw-alias-bg-skeleton);
  animation: sm-skeleton-pulse 1.4s ease-in-out infinite;
}

.sm-skeleton-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 65px;
  padding: 8px;
}

.sm-skeleton-rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sm-skeleton-icon {
  width: 49px;
  height: 49px;
  border-radius: 16px;
  flex-shrink: 0;
}

.sm-skeleton-lines {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sm-skeleton-line {
  height: 12px;
  max-width: 420px;
  border-radius: 6px;
}

.sm-skeleton-line-lg {
  height: 16px;
  width: 40%;
  max-width: 220px;
}

.sm-skeleton-banner {
  height: 42px;
  border-radius: 16px;
}

.sm-skeleton-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-skeleton-chip {
  width: 64px;
  height: 24px;
  border-radius: 999px;
}

.sm-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 30%, transparent);
  border-top-color: var(--dsw-alias-label-primary);
  animation: sm-spin 0.8s linear infinite;
  flex-shrink: 0;
}

.sm-error-panel {
  padding: 24px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

@keyframes sm-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@keyframes sm-spin {
  to { transform: rotate(360deg); }
}

/* ------------------------------------------------------------------ *
 * 11. In-page two-column detail                                      *
 * ------------------------------------------------------------------ */

.sm-detail {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
  min-height: 0;
}

.sm-detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.sm-detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.sm-root-detail {
  min-height: 0;
}

.sm-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-sm);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  cursor: pointer;
  align-self: flex-start;
}

.sm-detail-back:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  min-width: 0;
}

.sm-detail-head > div:first-child {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.sm-detail-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  color: var(--dsw-alias-label-secondary);
}

.sm-detail-icon svg {
  width: 28px;
  height: 28px;
}

.sm-detail-title {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
  min-width: 0;
}

.sm-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
  margin-left: auto;
}

.sm-detail-body {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  align-items: start;
  min-width: 0;
}

.sm-detail-main,
.sm-detail-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.sm-detail-meta,
.sm-detail-content,
.sm-detail-when,
.sm-detail-desc,
.sm-detail-error {
  min-width: 0;
}

.sm-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sm-meta-label {
  flex-shrink: 0;
  color: var(--dsw-alias-label-caption);
  font-size: calc(var(--sm-fs) - 2px);
}

.sm-meta-value {
  min-width: 0;
  text-align: right;
  word-break: break-all;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
}

/* Location row: one line within the right column, ellipsis when it does
 * not fit; the full path is exposed through the native title tooltip. */
.sm-detail-path {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}

.sm-detail-path-text {
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 24×24 copy icon button; hover inherits the native .sm-icon-btn spec
 * (bg-layer-1 + label-primary). */
.sm-detail-path-copy {
  width: 24px;
  height: 24px;
  padding: 4px;
  flex-shrink: 0;
}

.sm-detail-path-copy svg {
  width: 14px;
  height: 14px;
}

/* Detail panel card (distinct from .sm-card-item). */
.sm-card {
  padding: 16px 18px;
  border-radius: var(--dsw-radius-panel);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.sm-card-title {
  margin: 0;
  font-size: var(--sm-fs);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
}

.sm-code {
  margin: 0;
  padding: 12px 0;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.7;
  max-height: 320px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-code-line {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0 12px;
  min-width: max-content;
}

.sm-code-line-no {
  flex: 0 0 36px;
  text-align: right;
  color: var(--dsw-alias-label-caption);
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.sm-editor {
  width: 100%;
  min-height: 420px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.7;
  tab-size: 2;
  resize: vertical;
  outline: none;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-editor:focus {
  border-color: var(--dsw-alias-border-l3);
}

.sm-files {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.45;
  min-width: 0;
}

.sm-file-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-file-row .sm-mono {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ------------------------------------------------------------------ *
 * 12. Modals: 488 / 480 / 720 widths, transparent veil, no shadow    *
 * ------------------------------------------------------------------ */

@keyframes sm-mask-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sm-modal-backdrop,
.sm-modal-layer,
.sm-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  /* DSH dialog mask: a real dim layer, not a transparent hit area. */
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5));
  animation: sm-mask-in 160ms ease-out;
  backdrop-filter: none;
}

.sm-dialog {
  width: min(488px, 100%);
  max-width: 100%;
  max-height: min(720px, 100vh - 96px);
  display: flex;
  flex-direction: column;
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
  border: 0.5px solid var(--dsw-alias-border-inverted);
  border-radius: var(--dsw-radius-panel);
  box-shadow: none;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs);
}

/* 480 — confirmations */
.sm-dialog.narrow,
.sm-dialog.sm-narrow,
.sm-dialog.sm-dialog-confirm,
.sm-dialog.confirm,
.sm-dialog-confirm,
.sm-narrow {
  width: min(480px, 100vw - 32px);
  border-radius: var(--dsw-radius-xl);
}

/* 720 — large content (edit / preview) */
.sm-dialog.large,
.sm-dialog.sm-dialog-large,
.sm-dialog-preview,
.sm-dialog-edit,
.sm-dialog-large {
  width: min(720px, 100%);
  border-radius: var(--dsw-radius-panel);
}

.sm-dialog.form,
.sm-dialog-form {
  width: min(488px, 100%);
  border-radius: var(--dsw-radius-panel);
}

.sm-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 0;
  flex-shrink: 0;
  min-width: 0;
}

.sm-dialog-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-dialog-head h2,
.sm-dialog-head .sm-dialog-title,
.sm-dialog-title {
  margin: 0;
  font-size: calc(var(--sm-fs) + 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-dialog-sub {
  margin: 4px 0 0;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-dialog-intro {
  margin: 0 0 12px;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.6;
  flex-shrink: 0;
}

.sm-dialog-close {
  flex-shrink: 0;
}

.sm-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  font-size: var(--sm-fs);
  line-height: 1.6;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-dialog.form .sm-dialog-body,
.sm-dialog-form .sm-dialog-body {
  padding-top: 38px;
}

.sm-dialog.large .sm-dialog-body,
.sm-dialog-large .sm-dialog-body {
  padding-top: 18px;
}

.sm-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-height: 56px;
  padding: 12px 20px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

/* Form primitives inside dialogs */
.sm-field,
.sm-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  min-width: 0;
}

.sm-field:last-child,
.sm-form-field:last-child {
  margin-bottom: 0;
}

.sm-label,
.sm-form-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: calc(var(--sm-fs) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
}

.sm-form-hint {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  font-weight: 400;
}

.sm-form-error {
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.4;
  color: var(--dsw-alias-state-error-primary);
}

.sm-radio-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sm-radio {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.45;
  cursor: pointer;
}

.sm-radio:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-radio.active,
.sm-radio.sm-active,
.sm-radio[data-checked="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
}

.sm-radio input[type="radio"] {
  margin: 2px 0 0;
  flex-shrink: 0;
  accent-color: var(--dsw-alias-brand-primary);
}

.sm-dropzone {
  padding: 28px 20px;
  border-radius: var(--dsw-radius-lg);
  text-align: center;
  border: 1px dashed var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.sm-dropzone-icon {
  color: var(--dsw-alias-label-caption);
  display: inline-flex;
}

.sm-dropzone-title {
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
}

.sm-dropzone-hint {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
}

.sm-confirm {
  padding: 2px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sm-confirm-ver {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  flex-wrap: wrap;
}

.sm-confirm-ver .sm-mono {
  color: var(--dsw-alias-label-primary);
}

.sm-confirm-note {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.65;
  margin: 0;
}

.sm-confirm-warn {
  padding: 9px 11px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 26%, transparent);
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.55;
}

.sm-danger-text {
  color: var(--dsw-alias-state-error-primary);
}

/* ------------------------------------------------------------------ *
 * 13. Manage-sources dialog (contract §7.6)                          *
 * ------------------------------------------------------------------ */

.sm-source-dialog {
  /* 与大内容弹窗同档 720；列表需要留白，最少 480 高，多源时到 720 再滚动。 */
  width: min(720px, 100vw - 32px);
  min-height: min(480px, 100vh - 96px);
  max-height: min(720px, 100vh - 96px);
  border-radius: var(--dsw-radius-panel);
  border: 0.5px solid var(--dsw-alias-border-inverted);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs);
}

.sm-source-dialog .sm-dialog-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 14px;
  padding-bottom: 16px;
}

.sm-source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-source-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  min-width: 0;
  min-height: 56px;
}

.sm-source-name-wrap {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sm-source-drag-hint {
  margin: 0;
  font-size: calc(var(--sm-fs) - 3px);
  line-height: 1.5;
  color: var(--dsw-alias-label-caption);
}

/* Drag ghost that follows the pointer while reordering sources. */
.sm-source-ghost {
  position: fixed;
  z-index: 1400;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--dsw-radius-sm);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  pointer-events: none;
}

.sm-source-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-source-row.is-dragging {
  opacity: 0.5;
}

.sm-drag-handle {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--dsw-alias-label-tertiary);
}

.sm-drag-handle:active,
.sm-source-row.is-dragging .sm-drag-handle {
  cursor: grabbing;
}

.sm-drop-indicator {
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  flex-shrink: 0;
}

.sm-source-row.is-drop-before::before,
.sm-source-row.is-drop-after::after,
.sm-source.is-drop-before::before,
.sm-source.is-drop-after::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  pointer-events: none;
}

.sm-source-row.is-drop-before::before,
.sm-source.is-drop-before::before {
  top: -5px;
}

.sm-source-row.is-drop-after::after,
.sm-source.is-drop-after::after {
  bottom: -5px;
}

.sm-source-row.is-drop-before,
.sm-source-row.is-drop-after,
.sm-source.is-drop-before,
.sm-source.is-drop-after {
  position: relative;
}

.sm-source-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sm-source-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-source-name {
  font-size: var(--sm-fs);
  font-weight: 500;
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-primary);
}

.sm-source-url {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-source-meta {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
}

.sm-source-error {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-state-error-primary);
  line-height: 1.5;
}

.sm-source-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sm-source-actions .sm-icon-btn {
  width: 28px;
  height: 28px;
}

/* Legacy source card (v1 sources page) */
.sm-source {
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

.sm-source.is-off {
  opacity: 0.6;
}

.sm-source.is-dragging {
  opacity: 0.4;
}

.sm-source:active .sm-drag-handle,
.sm-source.is-dragging .sm-drag-handle {
  cursor: grabbing;
}

/* ------------------------------------------------------------------ *
 * 14. Diagnostics drawer                                             *
 * ------------------------------------------------------------------ */

.sm-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5));
  backdrop-filter: none;
}

.sm-diagnostics {
  min-height: 0;
}

.sm-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 560px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
  border-left: 1px solid var(--dsw-alias-border-l2);
  border-top-left-radius: var(--dsw-radius-panel);
  border-bottom-left-radius: var(--dsw-radius-panel);
  box-shadow: none;
  z-index: 1150;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs);
}

.sm-drawer-head {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

.sm-drawer-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-drawer-title {
  font-size: calc(var(--sm-fs) + 1px);
  font-weight: 500;
}

.sm-drawer-body {
  padding: 18px 20px 28px;
  overflow-y: auto;
  min-height: 0;
}

.sm-drawer-intro {
  margin: 0 0 16px;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.6;
}

.sm-drawer-note {
  margin: 14px 0 0;
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.6;
}

.sm-issue {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  min-width: 0;
}

.sm-issue.warn {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, transparent);
}

.sm-issue.error {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
}

.sm-issue-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: space-between;
  font-size: calc(var(--sm-fs) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-issue-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent);
  color: var(--dsw-alias-state-warn-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm-issue-reason {
  margin: 0;
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.65;
}

.sm-issue-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-issue-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.45;
  color: var(--dsw-alias-label-tertiary);
  word-break: break-all;
}

.sm-issue-action {
  align-self: flex-start;
  height: 28px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-sm);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 2px);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.sm-issue-action:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-issue-ok {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, transparent);
}

.sm-issue-ok .sm-issue-icon {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent);
  color: var(--dsw-alias-state-success-primary);
}

.sm-details {
  border-top: 1px solid var(--dsw-alias-border-l1);
  padding-top: 8px;
}

.sm-details summary {
  cursor: pointer;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  user-select: none;
}

.sm-details summary::-webkit-details-marker {
  display: none;
}

.sm-details summary:hover {
  color: var(--dsw-alias-label-secondary);
}

.sm-details-body {
  padding-top: 8px;
}

/* ------------------------------------------------------------------ *
 * 15. Floating layers: tooltip, toast, menu                          *
 * ------------------------------------------------------------------ */

/* Inverted tooltip: light surface in dark mode, no border, no shadow.
 * The node is appended to <body>, so it carries its own --sm-fs. */
.sm-tooltip,
#tooltip {
  --sm-fs: var(--dsh-content-font-size, 14px);
  position: fixed;
  z-index: 2000;
  max-width: 290px;
  padding: 6px 10px;
  border-radius: var(--dsw-radius-sm);
  border: 0;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-layer-3);
  font-size: calc(var(--sm-fs) - 4px);
  line-height: 1.35;
  box-shadow: none;
  pointer-events: none;
  white-space: normal;
  opacity: 0;
  transition: opacity 110ms ease;
}

/* The tooltip node currently ships legacy inline colours from 50-modals.js;
 * keep the inverted palette authoritative until that module drops them. */
.sm-tooltip {
  border: 0 !important;
  border-radius: var(--dsw-radius-sm) !important;
  background: var(--dsw-alias-label-primary) !important;
  color: var(--dsw-alias-bg-layer-3) !important;
  box-shadow: none !important;
}

.sm-tooltip.visible,
.sm-tooltip.show,
#tooltip.visible {
  opacity: 1;
}

.sm-toast-host {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 2100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}

.sm-toast {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.4;
  box-shadow: none;
  pointer-events: auto;
  animation: sm-toast-in 160ms ease;
}

.sm-toast.ok,
.sm-toast.sm-ok,
.sm-toast-ok {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent);
}

.sm-toast.error,
.sm-toast.sm-error,
.sm-toast-error {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);
}

.sm-toast.info,
.sm-toast.sm-info,
.sm-toast-info {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
}

.sm-toasts {
  min-width: 0;
}

.sm-toast-action {
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font-size: inherit;
  font-family: inherit;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.sm-toast-action:hover {
  color: var(--dsw-alias-label-primary);
}

@keyframes sm-toast-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.sm-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1599;
  background: transparent;
}

.sm-menu {
  position: fixed;
  z-index: 1600;
  min-width: 128px;
  max-width: 260px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-2));
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs);
}

.sm-menu-item {
  height: 30px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-sm);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.sm-menu-item:hover:not(:disabled),
.sm-menu-item:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-menu-item.danger,
.sm-menu-item.sm-menu-item-danger {
  color: var(--dsw-alias-state-error-primary);
}

.sm-menu-item.danger:hover,
.sm-menu-item.danger:focus-visible,
.sm-menu-item.sm-menu-item-danger:hover,
.sm-menu-item.sm-menu-item-danger:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover-danger);
}

.sm-menu-item-danger {
  color: var(--dsw-alias-state-error-primary);
}

/* Fixed 16px glyph box: never participates in the label's flex growth. */
.sm-menu-item .sm-menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-secondary);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.sm-menu-item.danger .sm-menu-icon,
.sm-menu-item.sm-menu-item-danger .sm-menu-icon {
  color: var(--dsw-alias-state-error-primary);
}

/* Only the label owns the remaining width so the whole row stays
 * clickable; the icon span keeps its fixed 16px box. */
.sm-menu-item > span:not(.sm-menu-icon) {
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-menu-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ *
 * 16. Market and sources pages (legacy surfaces)                     *
 * ------------------------------------------------------------------ */

.sm-market-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.sm-market-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-market-source-control {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.sm-market-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sm-market-chips {
  min-width: 0;
}

.sm-search.sm-market-search {
  width: 220px;
}

.sm-market-source-select {
  min-width: 160px;
  max-width: 260px;
}

.sm-market-sort {
  min-width: 150px;
}

.sm-market-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-market-list.sm-stack {
  gap: 2px;
}

.sm-market-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
}

.sm-market-installed {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-tertiary);
}

.sm-sources-page {
  min-width: 0;
}

.sm-sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 12px;
  min-width: 0;
}

.sm-presets-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
}

.sm-sources-section {
  gap: 12px;
}

.sm-sources-section-header {
  height: auto;
  margin-bottom: 2px;
}

.sm-sources-hint {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-source-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.sm-source-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-source-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-source-path {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-source-count {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-tertiary);
}

.sm-source-note {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-tertiary);
}

.sm-priority-card,
.sm-preset-card,
.sm-market-source-card {
  min-width: 0;
}

.sm-add-source {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.sm-add-label {
  font-size: calc(var(--sm-fs) - 2px);
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
}

.sm-add-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sm-add-row .sm-input {
  flex: 1;
  min-width: 0;
}

/* ------------------------------------------------------------------ *
 * 17. Prototype aliases (visual reference markup)                    *
 * ------------------------------------------------------------------ */

.sm-segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 3px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-3);
}

.sm-seg-tab {
  height: 28px;
  padding: 0 14px;
  border-radius: var(--dsw-radius-lg);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--sm-fs);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.sm-seg-tab:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-seg-tab[aria-selected="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 2px 4px;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--sm-fs) - 1px);
  cursor: pointer;
}

.sm-back:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-detail-heading {
  flex: 1 1 auto;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sm-detail-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sm-detail-name {
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.3;
  color: var(--dsw-alias-label-primary);
}

.sm-detail-ver {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-detail-desc {
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  max-width: 640px;
}

.sm-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(250px, 1fr);
  gap: 24px;
  align-items: start;
  margin-top: 22px;
  min-width: 0;
}

.sm-detail-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.sm-prose {
  margin: 0;
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.7;
}

.sm-ln {
  width: 20px;
  flex-shrink: 0;
  text-align: right;
  color: var(--dsw-alias-label-caption);
  user-select: none;
}

.sm-code-text {
  color: var(--dsw-alias-label-primary);
}

.sm-kv {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}

.sm-kv:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.sm-kv-label {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  flex-shrink: 0;
}

.sm-kv-value {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  text-align: right;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.sm-status-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sm-status-line .sm-dot,
.sm-source-top .sm-dot {
  position: static;
  border: none;
}

.sm-action-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sm-action-stack .sm-btn {
  width: 100%;
}

.sm-note {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 26%, transparent);
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.6;
}

.sm-note.neutral {
  background: var(--dsw-alias-bg-base);
  border-color: var(--dsw-alias-border-l1);
}

.sm-file-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.sm-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: calc(var(--sm-fs) - 2px);
}

.sm-file:last-child {
  border-bottom: none;
}

.sm-file-name {
  color: var(--dsw-alias-label-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.sm-file-size {
  color: var(--dsw-alias-label-caption);
  flex-shrink: 0;
}

.sm-choice-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-choice {
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  cursor: pointer;
}

.sm-choice:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-choice.active {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-footer {
  margin-top: 44px;
  padding-top: 16px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  text-align: center;
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
}

.sm-chevron {
  display: inline-flex;
  color: var(--dsw-alias-label-caption);
  width: 14px;
}

.sm-empty-desc {
  max-width: 400px;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

/* Keyboard focus mirrors hover: background + text colour, no ring.
 * :focus-visible raises specificity above the component defaults. */
.sm-subtab:focus-visible,
.sm-card-item:focus-visible,
.sm-chip:focus-visible,
.sm-btn-ghost:focus-visible,
.sm-btn-secondary:focus-visible,
.sm-search-clear:focus-visible,
.sm-detail-back:focus-visible,
.sm-back:focus-visible,
.sm-choice:focus-visible,
.sm-file-row:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

/* Primary tabs: keyboard focus mirrors hover (background only) so an
 * unselected focused tab never looks selected; the active tab keeps its
 * label-primary colour. The :not() chain outranks the generic button
 * focus rule that raises every button's text colour. */
.sm-tab:focus-visible {
  outline: none;
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-tab:not(.active):not(.sm-active):not(.sm-tab-active):not([aria-selected="true"]):focus-visible {
  color: var(--dsw-alias-label-tertiary);
}

/* ------------------------------------------------------------------ *
 * 18. Utilities                                                      *
 * ------------------------------------------------------------------ */

.sm-fs-16 { font-size: calc(var(--sm-fs) + 2px); }
.sm-fs-15 { font-size: calc(var(--sm-fs) + 1px); }
.sm-fs-14 { font-size: var(--sm-fs); }
.sm-fs-13 { font-size: calc(var(--sm-fs) - 1px); }
.sm-fs-12 { font-size: calc(var(--sm-fs) - 2px); }
.sm-fs-11 { font-size: calc(var(--sm-fs) - 3px); }
.sm-fs-10 { font-size: calc(var(--sm-fs) - 4px); }

.sm-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.sm-muted {
  color: var(--dsw-alias-label-tertiary);
}

.sm-caption {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-ellipsis {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-row-gap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* ------------------------------------------------------------------ *
 * 19. Responsive and reduced motion                                  *
 * ------------------------------------------------------------------ */

@media (max-width: 1100px) {
  .sm-detail-body,
  .sm-detail-grid {
    grid-template-columns: 1fr;
  }

  .sm-row-tail .sm-btn,
  .sm-row-tail .sm-btn-primary,
  .sm-row-tail .sm-btn-secondary,
  .sm-detail-actions .sm-btn,
  .sm-detail-actions .sm-btn-primary,
  .sm-detail-actions .sm-btn-secondary {
    height: 28px;
    padding: 0 10px;
    font-size: calc(var(--sm-fs) - 2px);
  }

  .sm-detail-actions {
    margin-left: 0;
  }
}

@media (max-width: 900px) {
  .sm-search {
    width: 100%;
  }

  .sm-row-badges {
    max-width: 220px;
  }

  .sm-dialog {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sm-root *,
  .sm-root *::before,
  .sm-root *::after,
  .sm-tooltip,
  #tooltip,
  .sm-toast-host,
  .sm-menu {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

`
