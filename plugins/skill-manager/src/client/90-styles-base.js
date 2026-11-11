/* 基础：字体刻度、reset、页面骨架 —— 由原 90-styles.js 按章节拆出（行 3-227）。 */
const STYLES_1 = `
/* ================================================================== *
 * skill-manager v2 — DSH native-parity stylesheet                     *
 * Contract: design/implementation-contract-v2.md §7                   *
 * Rules: token colours only (--dsw-* / color-mix on tokens);          *
 *        font sizes only via --ds-fs; no gradients; no box-shadow     *
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
  --ds-fs: var(--dsh-content-font-size, 14px);
  font-size: var(--ds-fs);
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

/* Native focus: background + text colour, never a coloured outline.
 * Skip tabindex="-1" containers (dialog/drawer roots) so focus does not
 * paint a translucent background over the whole surface. */
.sm-root :where(button, [tabindex]:not([tabindex="-1"])):focus-visible {
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
  border-radius: var(--dsw-radius-panel);
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
  /* Requested top breathing room. */
  padding: calc(28px + var(--dsh-frame-top-clearance, 0px)) clamp(20px, 4vw, 48px) 0;
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
  /* DSH plugin page title: 20px / 500 / 28px. */
  font-size: calc(var(--ds-fs) + 6px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.sm-page-desc {
  margin: 6px 0 0;
  font-size: calc(var(--ds-fs) - 1px);
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
  /* v1 alias shares the same element as .sm-page-title; keep both at 20px. */
  font-size: calc(var(--ds-fs) + 6px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.sm-desc {
  margin: 6px 0 0;
  font-size: calc(var(--ds-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

/* ------------------------------------------------------------------ *
`
