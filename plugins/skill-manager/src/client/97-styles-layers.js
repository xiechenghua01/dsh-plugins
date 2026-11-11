/* 浮层与市场/来源页 —— 由原 90-styles.js 按章节拆出（行 2941-3322）。 */
const STYLES_8 = `
 * 15. Floating layers: tooltip, toast, menu                          *
 * ------------------------------------------------------------------ */

/* Tooltip: dark surface in both themes, no border, no shadow.
 * The node is appended to <body>, so it carries its own --ds-fs. */
.sm-tooltip {
  --ds-fs: var(--dsh-content-font-size, 14px);
  position: fixed;
  z-index: 2000;
  max-width: min(40vw, 290px);
  padding: 4px 8px;
  border-radius: var(--dsw-radius-sm);
  border: 0;
  background: var(--dsw-alias-tooltip-bg);
  color: var(--dsw-static-neutral-bluish-00);
  font-size: calc(var(--ds-fs) - 2px);
  line-height: 1.35;
  box-shadow: none;
  pointer-events: none;
  white-space: normal;
  opacity: 0;
  transition: opacity 120ms ease;
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
  gap: 8px;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
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
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--dsw-alias-label-primary);
  font-size: var(--ds-fs);
}

.sm-menu-item {
  height: 30px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-sm);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
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
  height: 0.5px;
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
  gap: 12px;
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
  font-size: calc(var(--ds-fs) - 3px);
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
  font-size: calc(var(--ds-fs) - 2px);
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
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-source-count {
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-tertiary);
}

.sm-source-note {
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-tertiary);
}

.sm-priority-card,
.sm-preset-card,
.sm-market-source-card {
  min-width: 0;
}

.sm-add-source {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.sm-add-label {
  font-size: calc(var(--ds-fs) - 2px);
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
`
