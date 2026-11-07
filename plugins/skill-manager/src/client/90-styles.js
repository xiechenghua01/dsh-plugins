    /** Every style rule of the panel, scoped under .sm-root. */
    const STYLES = `
/* ------------------------------------------------------------------ *
 * Root, font scale and layout                                        *
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
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  line-height: 1.5;
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif);
  -webkit-font-smoothing: antialiased;
}

/* Low-specificity reset: :where() keeps component classes (.sm-btn*,
 * .sm-chip*, .sm-tab*) in control of background/color/font-size. */
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

.sm-root :where(button):focus-visible,
.sm-root :where(input):focus-visible,
.sm-root :where(select):focus-visible,
.sm-root :where(textarea):focus-visible,
.sm-root [tabindex]:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary));
  outline-offset: 1px;
}

.sm-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  /* The page frame owns the horizontal inset and the centred content column;
   * a scroll view only contributes the bottom breathing room. */
  padding: 0 0 48px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-scroll::-webkit-scrollbar,
.sm-dialog-body::-webkit-scrollbar,
.sm-drawer::-webkit-scrollbar,
.sm-code::-webkit-scrollbar,
.sm-files::-webkit-scrollbar,
.sm-editor::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.sm-scroll::-webkit-scrollbar-track,
.sm-dialog-body::-webkit-scrollbar-track,
.sm-drawer::-webkit-scrollbar-track,
.sm-code::-webkit-scrollbar-track,
.sm-files::-webkit-scrollbar-track,
.sm-editor::-webkit-scrollbar-track {
  background: transparent;
}

.sm-scroll::-webkit-scrollbar-thumb,
.sm-dialog-body::-webkit-scrollbar-thumb,
.sm-drawer::-webkit-scrollbar-thumb,
.sm-code::-webkit-scrollbar-thumb,
.sm-files::-webkit-scrollbar-thumb,
.sm-editor::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l1);
  border-radius: 999px;
}

.sm-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Only the outer page (list/detail shell) fills the panel; nested tab pages
 * (.sm-market, .sm-sources-page) grow naturally inside .sm-tab-view.sm-scroll. */
.sm-root > .sm-page {
  flex: 1 1 auto;
  overflow: hidden;
  /* Matches the conversation page: one centred content column with an inset
   * that shrinks on narrow windows instead of the content hugging the frame. */
  --sm-content-max: 960px;
  padding: 28px clamp(20px, 4vw, 48px) 0;
}

/* Header, tabs, list and detail all share the same column, so their left edges
 * line up instead of the header sitting on the window edge. */
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

.sm-page > * + * {
  margin-top: 16px;
}

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
  margin: 4px 0 0;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
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
  margin: 4px 0 0;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

.sm-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
  min-width: 0;
}

.sm-search {
  position: relative;
  width: 240px;
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

.sm-search::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-search:focus {
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

.sm-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 2px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-3);
  width: fit-content;
  max-width: 100%;
  flex-shrink: 0;
}

.sm-tab {
  height: 30px;
  padding: 0 12px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--sm-fs);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.sm-tab:hover {
  color: var(--dsw-alias-label-primary);
}

.sm-tab.active,
.sm-tab.sm-active,
.sm-tab.sm-tab-active,
.sm-tab[aria-selected="true"] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-tab-badge,
.sm-tab-count {
  min-width: 16px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--dsw-specific-sidebar-nav-item-active);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 3px);
  font-weight: 500;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}

.sm-tab-count-warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent);
  color: var(--dsw-alias-state-warn-primary);
}

/* ------------------------------------------------------------------ *
 * Location groups and rows                                           *
 * ------------------------------------------------------------------ */

.sm-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sm-group + .sm-group {
  margin-top: 40px;
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

.sm-group-head > div:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
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

.sm-installed {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-installed-loading {
  gap: 12px;
}

.sm-groups {
  display: flex;
  flex-direction: column;
  min-width: 0;
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

.sm-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
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

.sm-group-head-toggle {
  cursor: pointer;
  user-select: none;
}

.sm-group-disabled {
  opacity: 0.72;
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
  transition: background 120ms ease, border-color 120ms ease;
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
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l1);
}

.sm-row.market:hover,
.sm-row-market:hover,
.sm-market .sm-row:hover,
.sm-row[data-kind="market"]:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
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
.sm-detail-icon > .sm-dot {
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
.sm-tag-bar {
  max-width: 340px;
  overflow: hidden;
  flex-wrap: nowrap;
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  flex-shrink: 1;
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

/* ------------------------------------------------------------------ *
 * Badges                                                             *
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
  font-weight: 500;
}

.sm-badge-update svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.sm-badge-builtin {
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

.sm-badge-loc {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  border-color: var(--dsw-alias-border-l1);
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
 * Controls                                                           *
 * ------------------------------------------------------------------ */

.sm-btn,
.sm-btn-primary,
.sm-btn-secondary,
.sm-btn-ghost,
.sm-btn-icon,
.sm-btn-danger {
  height: 32px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs, 14px) - 1px);
  font-weight: 500;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease, opacity 120ms ease;
}

.sm-btn:disabled,
.sm-btn-primary:disabled,
.sm-btn-secondary:disabled,
.sm-btn-ghost:disabled,
.sm-btn-icon:disabled,
.sm-btn-danger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-btn-primary {
  background: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-base);
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
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
}

.sm-btn-icon:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
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

.sm-btn-sm {
  height: 26px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: calc(var(--sm-fs) - 2px);
}

.sm-check-updates {
  gap: 6px;
}

.sm-icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.sm-icon-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}

.sm-chip:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-chip.active,
.sm-chip.sm-active,
.sm-chip.sm-chip-active,
.sm-chip[aria-pressed="true"] {
  background: var(--dsw-specific-sidebar-nav-item-active);
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-chip-active {
  background: var(--dsw-specific-sidebar-nav-item-active);
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-select {
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  cursor: pointer;
  outline: none;
}

.sm-select:focus {
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
  transition: background 150ms ease;
}

.sm-switch[aria-checked="true"],
.sm-switch.on {
  background: var(--dsw-alias-label-primary);
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
  transition: border-color 120ms ease;
}

.sm-input::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-input:focus {
  border-color: var(--dsw-alias-border-l3);
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
  transition: border-color 120ms ease;
}

.sm-textarea:focus {
  border-color: var(--dsw-alias-border-l3);
}

/* ------------------------------------------------------------------ *
 * State surfaces                                                     *
 * ------------------------------------------------------------------ */

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

.sm-banners {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
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
 * In-page two-column detail                                          *
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
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--sm-fs) - 1.5px);
  font-family: inherit;
  cursor: pointer;
  align-self: flex-start;
  transition: background 120ms ease, color 120ms ease;
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

.sm-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.7;
  max-height: 520px;
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
 * Modals                                                             *
 * ------------------------------------------------------------------ */

.sm-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: transparent;
  backdrop-filter: none;
}

.sm-dialog {
  width: 560px;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 20px;
  box-shadow: none;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs, 14px);
}

.sm-dialog.narrow,
.sm-dialog.sm-narrow,
.sm-dialog.sm-dialog-confirm,
.sm-narrow {
  width: 360px;
  max-width: 92vw;
  border-radius: 14px;
}

.sm-dialog-close {
  flex-shrink: 0;
}

.sm-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
  min-width: 0;
}

.sm-dialog-head h2,
.sm-dialog-head .sm-dialog-title {
  margin: 0;
  font-size: calc(var(--sm-fs, 14px) + 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-dialog-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  font-size: var(--sm-fs, 14px);
  line-height: 1.6;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

.sm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  min-width: 0;
}

.sm-field:last-child {
  margin-bottom: 0;
}

.sm-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: calc(var(--sm-fs, 14px) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
}

.sm-form-error {
  font-size: calc(var(--sm-fs, 14px) - 2px);
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
  font-size: calc(var(--sm-fs, 14px) - 1px);
  line-height: 1.45;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.sm-radio:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-radio.active,
.sm-radio.sm-active,
.sm-radio[data-checked="true"] {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
}

.sm-radio input[type="radio"] {
  margin: 2px 0 0;
  flex-shrink: 0;
  accent-color: var(--dsw-alias-brand-primary);
}

/* ------------------------------------------------------------------ *
 * Diagnostics drawer                                                 *
 * ------------------------------------------------------------------ */

.sm-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: transparent;
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
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
  box-shadow: none;
  z-index: 1150;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs, 14px);
}

.sm-issue {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
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
  justify-content: space-between;
  gap: 8px;
  font-size: calc(var(--sm-fs, 14px) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-issue-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs, 14px) - 2px);
  line-height: 1.45;
  color: var(--dsw-alias-label-tertiary);
  word-break: break-all;
}

.sm-issue-action {
  align-self: flex-start;
  height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs, 14px) - 2px);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.sm-issue-action:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

/* ------------------------------------------------------------------ *
 * Floating layers: tooltip, toast, context menu                      *
 * ------------------------------------------------------------------ */

.sm-tooltip {
  --sm-fs: var(--dsh-content-font-size, 14px);
  position: fixed;
  z-index: 2000;
  max-width: 290px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 4px);
  line-height: 1.35;
  box-shadow: none;
  pointer-events: none;
  white-space: normal;
  opacity: 0;
  transition: opacity 110ms ease;
}

.sm-tooltip.visible,
.sm-tooltip.show {
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
  font-size: calc(var(--sm-fs, 14px) - 1px);
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
  min-width: 168px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-2));
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs, 14px);
}

.sm-menu-item {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs, 14px) - 1px);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.sm-menu-item:hover:not(:disabled) {
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

.sm-menu-item-danger {
  color: var(--dsw-alias-state-error-primary);
}

.sm-menu-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ *
 * Market tab                                                         *
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

/* ------------------------------------------------------------------ *
 * Sources tab                                                        *
 * ------------------------------------------------------------------ */

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

.sm-source-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
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

.sm-source-error {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-state-error-primary);
}

.sm-priority-card,
.sm-preset-card,
.sm-market-source-card {
  min-width: 0;
}

/* ------------------------------------------------------------------ *
 * Utilities                                                          *
 * ------------------------------------------------------------------ */

.sm-fs-16 { font-size: calc(var(--sm-fs) + 2px); }
.sm-fs-15 { font-size: calc(var(--sm-fs) + 1px); }
.sm-fs-14 { font-size: var(--sm-fs); }
.sm-fs-13 { font-size: calc(var(--sm-fs) - 1px); }
.sm-fs-12 { font-size: calc(var(--sm-fs) - 2px); }
.sm-fs-11 { font-size: calc(var(--sm-fs) - 3px); }

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
 * Responsive and reduced motion                                      *
 * ------------------------------------------------------------------ */

@media (max-width: 1100px) {
  .sm-detail-body {
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
  .sm-scroll {
    padding: 24px 24px 48px;
  }

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
  .sm-toast-host,
  .sm-menu {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
`
