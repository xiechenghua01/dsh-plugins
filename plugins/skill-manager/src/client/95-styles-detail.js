/* 详情页与弹窗外壳 —— 由原 90-styles.js 按章节拆出（行 1937-2517）。 */
const STYLES_6 = `
 * 11. In-page two-column detail                                      *
 * ------------------------------------------------------------------ */

.sm-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  font-size: calc(var(--ds-fs) - 1px);
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
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  min-width: 0;
}

.sm-detail-head > div:first-child {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.sm-detail-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l2);
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
  font-size: calc(var(--ds-fs) + 2px);
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
  font-size: calc(var(--ds-fs) - 2px);
}

.sm-meta-value {
  min-width: 0;
  text-align: right;
  word-break: break-all;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
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
  width: 28px;
  height: 28px;
  padding: 4px;
  flex-shrink: 0;
}

.sm-detail-path-copy svg {
  width: 14px;
  height: 14px;
}

/* Detail panel card (distinct from .sm-card-item). */
.sm-card {
  padding: 16px 20px;
  border-radius: var(--dsw-radius-panel);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.sm-card-title {
  margin: 0;
  font-size: var(--ds-fs);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
}

.sm-code {
  margin: 0;
  padding: 12px 0;
  border-radius: var(--dsw-radius-lg);
  border: 0.5px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--ds-fs) - 2px);
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
  padding: 12px 16px;
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--ds-fs) - 2px);
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
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--ds-fs) - 2px);
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
  background: var(--dsw-alias-bg-mask-1);
  backdrop-filter: none;
}

.sm-dialog {
  width: min(488px, 100%);
  max-width: 100%;
  max-height: min(720px, 100vh - 96px);
  display: flex;
  flex-direction: column;
  background: var(--dsw-alias-bg-layer-2);
  border: 0.5px solid var(--dsw-alias-border-inverted);
  border-radius: var(--dsw-radius-panel);
  box-shadow: none;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--ds-fs);
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
  width: min(720px, 100vw - 32px);
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
  padding: 16px 20px 0;
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
  font-size: calc(var(--ds-fs) + 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-dialog-sub {
  margin: 4px 0 0;
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-dialog-intro {
  margin: 0 0 12px;
  font-size: calc(var(--ds-fs) - 2px);
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
  font-size: var(--ds-fs);
  line-height: 1.6;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-dialog.form .sm-dialog-body,
.sm-dialog-form .sm-dialog-body {
  padding-top: 32px;
}

.sm-dialog.large .sm-dialog-body,
.sm-dialog-large .sm-dialog-body {
  padding-top: 20px;
}

.sm-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-height: 56px;
  padding: 12px 20px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

/* Form primitives inside dialogs */
.sm-field,
.sm-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
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
  font-size: calc(var(--ds-fs) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
}

.sm-form-hint {
  font-size: calc(var(--ds-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  font-weight: 400;
}

.sm-form-error {
  font-size: calc(var(--ds-fs) - 2px);
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
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--ds-fs) - 1px);
  line-height: 1.45;
  cursor: pointer;
}

.sm-radio:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-radio.selected,
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
  padding: 24px 20px;
  border-radius: var(--dsw-radius-lg);
  text-align: center;
  border: 0.5px dashed var(--dsw-alias-border-l3);
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
  font-size: calc(var(--ds-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
}

.sm-dropzone-hint {
  font-size: calc(var(--ds-fs) - 3px);
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
  font-size: calc(var(--ds-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  flex-wrap: wrap;
}

.sm-confirm-ver .sm-mono {
  color: var(--dsw-alias-label-primary);
}

.sm-confirm-note {
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.65;
  margin: 0;
}

.sm-confirm-warn {
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 26%, transparent);
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.55;
}

.sm-danger-text {
  color: var(--dsw-alias-state-error-primary);
}

/* ------------------------------------------------------------------ *
`
