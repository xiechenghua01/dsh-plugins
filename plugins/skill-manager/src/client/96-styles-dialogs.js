/* 管理源弹窗与诊断抽屉 —— 由原 90-styles.js 按章节拆出（行 2518-2940）。 */
const STYLES_7 = `
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
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: var(--ds-fs);
}

.sm-source-dialog .sm-dialog-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 12px;
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
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
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
  font-size: calc(var(--ds-fs) - 3px);
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
  padding: 6px 8px;
  border-radius: var(--dsw-radius-sm);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
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
  border-radius: var(--dsw-radius-xs);
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
  border-radius: var(--dsw-radius-xs);
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
  font-size: var(--ds-fs);
  font-weight: 500;
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-primary);
}

.sm-source-url {
  font-size: calc(var(--ds-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-source-meta {
  font-size: calc(var(--ds-fs) - 3px);
  color: var(--dsw-alias-label-caption);
}

.sm-source-error {
  font-size: calc(var(--ds-fs) - 3px);
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
  padding: 8px 12px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l2);
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
  background: var(--dsw-alias-bg-mask-1);
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
  background: var(--dsw-alias-bg-layer-2);
  border-left: 0.5px solid var(--dsw-alias-border-l2);
  border-top-left-radius: var(--dsw-radius-panel);
  border-bottom-left-radius: var(--dsw-radius-panel);
  box-shadow: none;
  z-index: 1150;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--ds-fs);
}

.sm-drawer-head {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

.sm-drawer-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-drawer-title {
  font-size: calc(var(--ds-fs) + 1px);
  font-weight: 500;
}

.sm-drawer-body {
  padding: 16px 20px 24px;
  overflow-y: auto;
  min-height: 0;
}

.sm-drawer-intro {
  margin: 0 0 16px;
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.6;
}

.sm-drawer-note {
  margin: 12px 0 0;
  font-size: calc(var(--ds-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.6;
}

.sm-issue {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: var(--dsw-radius-lg);
  border: 0.5px solid var(--dsw-alias-border-l2);
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
  font-size: calc(var(--ds-fs) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-issue-icon {
  width: 30px;
  height: 30px;
  border-radius: var(--dsw-radius-md);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent);
  color: var(--dsw-alias-state-warn-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm-issue-reason {
  margin: 0;
  font-size: calc(var(--ds-fs) - 1px);
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
  font-size: calc(var(--ds-fs) - 2px);
  line-height: 1.45;
  color: var(--dsw-alias-label-tertiary);
  word-break: break-all;
}

.sm-issue-action {
  align-self: flex-start;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-sm);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 2px);
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
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  padding-top: 8px;
}

.sm-details summary {
  cursor: pointer;
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
`
