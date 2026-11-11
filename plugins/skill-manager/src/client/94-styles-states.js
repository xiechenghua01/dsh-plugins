/* 状态面：banner / 空态 / 骨架 / spinner —— 由原 90-styles.js 按章节拆出（行 1669-1936）。 */
const STYLES_5 = `
 * 10. State surfaces: banners, empty, skeleton, spinner              *
 * ------------------------------------------------------------------ */

.sm-banners {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sm-banner {
  padding: 12px 16px;
  border-radius: var(--dsw-radius-lg);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
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
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  min-width: 0;
}

.sm-banner-detail {
  color: var(--dsw-alias-label-tertiary);
  min-width: 0;
}

.sm-banner-code {
  font-size: calc(var(--ds-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  overflow-wrap: anywhere;
}

.sm-empty {
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--ds-fs) - 1px);
  line-height: 1.5;
}

.sm-empty-installed {
  padding: 48px 20px;
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
  font-size: calc(var(--ds-fs) + 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
}

.sm-empty-body {
  max-width: 420px;
  font-size: calc(var(--ds-fs) - 1px);
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
  padding: 48px 20px;
}

.sm-skeleton {
  width: 100%;
  min-height: 14px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-skeleton);
  animation: sm-skeleton-pulse 1.4s ease-in-out infinite;
}

.sm-skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
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
  border-radius: var(--dsw-radius-lg);
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
  border-radius: var(--dsw-radius-sm);
}

.sm-skeleton-line-lg {
  height: 16px;
  width: 40%;
  max-width: 220px;
}

.sm-skeleton-banner {
  height: 42px;
  border-radius: var(--dsw-radius-lg);
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
  border-radius: var(--dsw-radius-panel);
}

.sm-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  /* Hairline ring per design §2.4; the track tint is deepened (30% → 60%)
   * so a .5px ring stays visible at 16px. */
  border: 0.5px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 60%, transparent);
  border-top-color: var(--dsw-alias-label-primary);
  animation: sm-spin 0.8s linear infinite;
  flex-shrink: 0;
}

.sm-error-panel {
  padding: 24px;
  border-radius: var(--dsw-radius-lg);
  border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--ds-fs) - 1px);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

@keyframes sm-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@keyframes sm-spin {
  to { transform: rotate(360deg); }
}

/* ------------------------------------------------------------------ *
`
