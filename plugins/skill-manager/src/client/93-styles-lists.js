/* 分组、行、徽章 —— 由原 90-styles.js 按章节拆出（行 1186-1668）。 */
const STYLES_4 = `
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
  height: auto;
  min-height: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px;
  margin-bottom: 8px;
  min-width: 0;
  font-size: var(--ds-fs);
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
  font-size: var(--ds-fs);
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
}

.sm-group-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--ds-fs) - 2px);
  font-weight: 400;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 380px;
  min-width: 0;
}

.sm-group-count {
  font-size: calc(var(--ds-fs) - 2px);
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
  gap: 24px;
  min-width: 0;
}

.sm-source-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.sm-market > .sm-source-block + .sm-source-block {
  margin-top: 24px;
}

.sm-source-block-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
  min-width: 0;
}

.sm-source-block-title {
  font-size: var(--ds-fs);
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-source-block-count {
  font-size: calc(var(--ds-fs) - 2px);
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
  padding: 8px 12px;
  border-radius: var(--dsw-radius-lg);
  border: 0.5px solid transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.sm-row-icon svg,
.sm-icon-box svg {
  width: 20px;
  height: 20px;
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
  gap: 12px;
}

.sm-row-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  font-size: var(--ds-fs);
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
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-row-desc {
  flex: 0 0 auto;
  font-size: calc(var(--ds-fs) - 1px);
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
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-row-by {
  font-size: calc(var(--ds-fs) - 2px);
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
  border-radius: var(--dsw-radius-panel);
  background: var(--dsw-alias-label-caption);
  border: 0.5px solid var(--dsw-alias-bg-base);
  flex-shrink: 0;
}

.sm-icon-box > .sm-dot,
.sm-row-icon > .sm-dot,
.sm-detail-icon > .sm-dot {
  position: absolute;
  left: 5px;
  bottom: 5px;
}

/* Card status dot: the single rule shared by the skills and market card
 * title rows. It sits in normal flow ahead of the name, so it can never cover
 * the authored icon artwork; the 6px title-row gap is the spec separation and
 * the ring the on-icon version needed is dropped, keeping it a true 8x8.
 * Both pages render it through renderStatusDot(). */
.sm-card-title-row > .sm-dot {
  border: none;
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
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--dsw-radius-panel);
  border: 0.5px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--ds-fs) - 3px);
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
`
