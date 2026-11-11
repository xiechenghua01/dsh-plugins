/* 原型别名、工具类、响应式 —— 由原 90-styles.js 按章节拆出（行 3323-3748）。 */
const STYLES_9 = `
 * 17. Prototype aliases (visual reference markup)                    *
 * ------------------------------------------------------------------ */

.sm-segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: auto;
  min-height: 34px;
  padding: 4px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-3);
}

.sm-seg-tab {
  height: 28px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-lg);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--ds-fs);
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
  gap: 4px;
  height: 28px;
  padding: 2px 4px;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--ds-fs) - 1px);
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
  font-size: calc(var(--ds-fs) + 2px);
  font-weight: 500;
  line-height: 1.3;
  color: var(--dsw-alias-label-primary);
}

.sm-detail-ver {
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-detail-desc {
  font-size: calc(var(--ds-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  max-width: 640px;
}

.sm-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(250px, 1fr);
  gap: 24px;
  align-items: start;
  margin-top: 20px;
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
  font-size: calc(var(--ds-fs) - 1px);
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
  gap: 12px;
  padding: 8px 0;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}

.sm-kv:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.sm-kv-label {
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  flex-shrink: 0;
}

.sm-kv-value {
  font-size: calc(var(--ds-fs) - 2px);
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
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 26%, transparent);
  font-size: calc(var(--ds-fs) - 2px);
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
  gap: 8px;
  padding: 8px 0;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  font-size: calc(var(--ds-fs) - 2px);
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
  padding: 0 8px;
  border-radius: var(--dsw-radius-md);
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-base);
  border: 0.5px solid var(--dsw-alias-border-l2);
  cursor: pointer;
}

.sm-choice:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-choice.selected,
.sm-choice.active {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-footer {
  margin-top: 48px;
  padding-top: 16px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  text-align: center;
  font-size: calc(var(--ds-fs) - 3px);
  color: var(--dsw-alias-label-caption);
}

.sm-chevron {
  display: inline-flex;
  color: var(--dsw-alias-label-caption);
  width: 14px;
}

.sm-empty-desc {
  max-width: 400px;
  font-size: calc(var(--ds-fs) - 1px);
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

.sm-tab:not(.selected):not(.active):not(.sm-active):not(.sm-tab-active):not([aria-selected="true"]):focus-visible {
  color: var(--dsw-alias-label-tertiary);
}

/* ------------------------------------------------------------------ *
 * 18. Utilities                                                      *
 * ------------------------------------------------------------------ */

.sm-fs-16 { font-size: calc(var(--ds-fs) + 2px); }
.sm-fs-15 { font-size: calc(var(--ds-fs) + 1px); }
.sm-fs-14 { font-size: var(--ds-fs); }
.sm-fs-13 { font-size: calc(var(--ds-fs) - 1px); }
.sm-fs-12 { font-size: calc(var(--ds-fs) - 2px); }
/* Semantic text colours — replaces per-element inline colour styles. */
.sm-text-primary { color: var(--dsw-alias-label-primary); }
.sm-text-secondary { color: var(--dsw-alias-label-secondary); }
.sm-text-caption { color: var(--dsw-alias-label-caption); }
.sm-text-success { color: var(--dsw-alias-state-success-primary); }
.sm-text-warn { color: var(--dsw-alias-state-warn-primary); }
.sm-text-error { color: var(--dsw-alias-state-error-primary); }

.sm-fs-11 { font-size: calc(var(--ds-fs) - 3px); }
.sm-fs-10 { font-size: calc(var(--ds-fs) - 3px); }

.sm-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.sm-muted {
  color: var(--dsw-alias-label-tertiary);
}

.sm-caption {
  font-size: calc(var(--ds-fs) - 2px);
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
    padding: 0 8px;
    font-size: calc(var(--ds-fs) - 2px);
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
    width: min(720px, 100vw - 32px);
  }

  /* 窄屏下窄档必须保持自身宽度，不能被上面的 720 档覆盖 */
  .sm-dialog-form,
  .sm-dialog.form {
    width: min(488px, 100vw - 32px);
  }

  .sm-dialog-confirm,
  .sm-dialog.sm-narrow,
  .sm-dialog.sm-dialog-confirm,
  .sm-narrow {
    width: min(480px, 100vw - 32px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sm-root *,
  .sm-root *::before,
  .sm-root *::after,
  .sm-tooltip,
  .sm-toast-host,
  .sm-menu {
    animation-duration: 0.001ms;
    animation-iteration-count: 1;
    transition-duration: 0.001ms;
    scroll-behavior: auto;
  }
}

`

/* 按原顺序拼接，保证层叠顺序不变。 */
const STYLES = STYLES_1 + STYLES_2 + STYLES_3 + STYLES_4 + STYLES_5 + STYLES_6 + STYLES_7 + STYLES_8 + STYLES_9
