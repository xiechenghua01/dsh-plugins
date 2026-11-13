/* 控件与双列卡片网格 —— 由原 90-styles.js 按章节拆出（行 732-1185）。 */
const STYLES_3 = `
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
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
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
  background: var(--dsw-alias-button-primary-hover, var(--dsw-alias-button-primary-fill));
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
  padding: 0 12px;
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
  padding: 0 8px;
  border-radius: var(--dsw-radius-sm);
  font-size: calc(var(--ds-fs) - 2px);
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
  padding: 0 8px;
  border-radius: var(--dsw-radius-panel);
  border: 0.5px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--ds-fs) - 2px);
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
 * hover, text colour carries the state. .selected is canonical;
 * .active stays as a legacy alias with the same semantics. */
.sm-chip.selected,
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
  height: 34px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid var(--dsw-alias-border-l4);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
  font-family: inherit;
  outline: none;
}

.sm-input::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-input:focus {
  border-color: var(--dsw-alias-state-business-primary);
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
  font-size: calc(var(--ds-fs) - 2px);
  line-height: 1.65;
}

.sm-textarea {
  width: 100%;
  min-height: 96px;
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
  border: 0.5px solid var(--dsw-alias-border-l4);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
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
  border-radius: var(--dsw-radius-panel);
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
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
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
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
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
  border-radius: var(--dsw-radius-lg);
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
  width: 20px;
  height: 20px;
}

.sm-card-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 2px;
}

.sm-card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  /* The title row never clips: the display name must stay whole. Anything
   * that cannot fit yields first (see .sm-card-tech). */
  overflow: hidden;
}

/* The badge/tag row sits between the title row and the description. It hugs
 * the title (4px) and keeps 8px before the description, so the column reads
 * name, then badges, then prose without the badges touching either text.
 * The offsets are relative to the .sm-card-main gap of 6px. */
.sm-card-main > .sm-tagbar {
  margin-top: -2px;
  margin-bottom: 2px;
}

.sm-card-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  /* DSH plugin card title: 16px. */
  font-size: calc(var(--ds-fs) + 2px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  /* The display name holds its full content width: the technical name yields
   * almost all of the overflow first (see .sm-card-tech). The ellipsis is the
   * last resort, only for a name wider than the whole title row. */
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-card-desc {
  font-size: calc(var(--ds-fs) - 1px);
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
  width: 28px;
  height: 28px;
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
`
