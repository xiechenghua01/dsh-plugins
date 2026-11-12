    /* ------------------------------------------------------------------ *
     * Styles: one style element, only --dsw-* theme tokens.               *
     * ------------------------------------------------------------------ */

    const CSS = `
.ss-page,.ss-page *{box-sizing:border-box}
.ss-page{--ds-fs:var(--dsh-content-font-size,14px);--ss-series-1:#4d93f8;--ss-series-2:#22c55e;--ss-series-3:#8b5cf6;--ss-series-4:#f59e0b;--ss-series-5:#ef4444;--ss-series-6:#06b6d4;--ss-series-7:#ec4899;--ss-series-8:#9aa0a6;--ss-session-row:calc(var(--ds-fs) * 3 + 16px);--ss-table-head:calc(var(--ds-fs) * 1.5 + 12px);width:100%;min-width:0;height:100%;min-height:0;display:flex;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit);font-size:calc(var(--ds-fs) - 1px);line-height:1.5}
/* The eight --ss-series-* colors are data-visualization series colors, not theme
   surface colors: charts need several distinguishable hues in both color schemes. */
.ss-page [data-series="1"]{--ss-series:var(--ss-series-1)}
.ss-page [data-series="2"]{--ss-series:var(--ss-series-2)}
.ss-page [data-series="3"]{--ss-series:var(--ss-series-3)}
.ss-page [data-series="4"]{--ss-series:var(--ss-series-4)}
.ss-page [data-series="5"]{--ss-series:var(--ss-series-5)}
.ss-page [data-series="6"]{--ss-series:var(--ss-series-6)}
.ss-page [data-series="7"]{--ss-series:var(--ss-series-7)}
.ss-page [data-series="8"]{--ss-series:var(--ss-series-8)}
/* Buttons (§7.1): SsButton. Hover changes only the interactive background. */
.ss-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;white-space:nowrap;font-family:inherit;font-weight:500;border:.5px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;transition:background 120ms,color 120ms}
.ss-btn[data-size="lg"]{height:36px;padding:0 14px;border-radius:var(--dsw-radius-md);font-size:calc(var(--ds-fs) - 1px);line-height:22px}
.ss-btn[data-size="md"]{height:32px;padding:0 12px;border-radius:var(--dsw-radius-md);font-size:calc(var(--ds-fs) - 2px);line-height:20px}
.ss-btn[data-size="sm"]{height:28px;padding:0 10px;border-radius:var(--dsw-radius-sm);font-size:calc(var(--ds-fs) - 3px);line-height:18px}
.ss-btn[data-variant="primary"]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
.ss-btn[data-variant="primary"]:hover{background:var(--dsw-alias-button-primary-hover)}
.ss-btn[data-variant="secondary"]{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l2)}
.ss-btn[data-variant="ghost"]{background:transparent;color:var(--dsw-alias-label-secondary)}
.ss-btn[data-variant="danger"]{background:transparent;color:var(--dsw-alias-state-error-primary)}
.ss-btn[data-variant="secondary"]:hover,.ss-btn[data-variant="ghost"]:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-btn[data-variant="danger"]:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}
.ss-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.ss-btn:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-btn[data-variant="primary"]:focus-visible{background:var(--dsw-alias-button-primary-hover)}
.ss-btn[data-variant="danger"]:focus-visible{background:var(--dsw-alias-interactive-bg-hover-danger)}
.ss-btn:disabled{opacity:.4;cursor:not-allowed}
/* Icon buttons (§7.2): SsIconButton. */
.ss-icon-btn{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background 120ms,color 120ms}
.ss-icon-btn[data-size="md"]{width:32px;height:32px}
.ss-icon-btn[data-size="sm"]{width:28px;height:28px}
.ss-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-icon-btn[data-variant="danger"]:hover{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.ss-icon-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.ss-icon-btn:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-icon-btn:disabled{opacity:.4;cursor:not-allowed}
/* Segmented tabs (§7.3): primary segments and secondary capsules. */
.ss-segmented{display:inline-flex;align-items:center;gap:2px;padding:0;background:transparent}
.ss-segmented[data-level="primary"]{gap:0;padding:4px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform)}
.ss-segment{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:0;border-radius:14px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:calc(var(--ds-fs) - 3px);font-weight:500;line-height:18px;white-space:nowrap;cursor:pointer;transition:background 120ms,color 120ms}
.ss-segmented[data-level="primary"] .ss-segment{height:34px;padding:0 16px;border-radius:var(--dsw-radius-md);font-size:calc(var(--ds-fs) - 1px)}
.ss-segment:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-segment:active{background:var(--dsw-alias-interactive-bg-active)}
.ss-segment:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-segment-active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ss-segmented[data-level="primary"] .ss-segment-active{background:var(--dsw-alias-bg-layer-3);border:.5px solid var(--dsw-alias-border-l3);font-weight:600}
/* Badge (§7.9): SsBadge. */
.ss-badge{display:inline-flex;align-items:center;flex:none;min-height:calc(var(--ds-fs) + 4px);padding:0 6px;border-radius:var(--dsw-radius-xs);font-size:calc(var(--ds-fs) - 3px);font-weight:500;line-height:normal;white-space:nowrap;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}
.ss-badge[data-tone="warn"]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent)}
.ss-badge[data-tone="success"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.ss-badge[data-tone="error"]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
/* Empty state (§7.10): SsEmptyState. */
.ss-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px 0;text-align:center;color:var(--dsw-alias-label-tertiary)}
.ss-empty-state[data-roomy="true"]{padding:48px 20px}
.ss-empty-state[data-tone="error"]{color:var(--dsw-alias-state-error-primary)}
.ss-empty-state .ss-empty{margin:0;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 2px);line-height:1.5}
.ss-empty-state[data-tone="error"] .ss-empty{color:var(--dsw-alias-label-primary)}
/* Error bar (§7.10): SsErrorBar. */
.ss-errorbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-label-primary);font-size:calc(var(--ds-fs) - 2px)}
.ss-errorbar .ss-icon{flex:none;color:var(--dsw-alias-state-error-primary)}
.ss-errorbar-text{flex:1;min-width:0}
/* Tooltip (§7.7): SsTooltip singleton, scoped by its data-plugin container. */
.ss-tooltip-layer[data-plugin="@chengze/dsh-session-stats"]{--ds-fs:var(--dsh-content-font-size,14px);position:fixed;inset:0;z-index:2000;pointer-events:none;overflow:hidden}
.ss-tooltip-layer[data-plugin="@chengze/dsh-session-stats"] .ss-tooltip{position:absolute;max-width:min(40vw,290px);padding:4px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:calc(var(--ds-fs) - 3px);line-height:1.5;box-shadow:none;opacity:0;visibility:hidden;overflow-wrap:anywhere;transition:none}
.ss-tooltip-layer[data-plugin="@chengze/dsh-session-stats"] .ss-tooltip[data-visible="true"]{opacity:1;visibility:visible;transition:opacity 120ms}
.ss-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.ss-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l1) transparent}
.ss-scroll::-webkit-scrollbar,.ss-table-scroll::-webkit-scrollbar,.ss-table-window::-webkit-scrollbar{width:8px;height:8px}
.ss-scroll::-webkit-scrollbar-thumb,.ss-table-scroll::-webkit-scrollbar-thumb,.ss-table-window::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l1);border-radius:var(--dsw-radius-xs)}
.ss-scroll::-webkit-scrollbar-track,.ss-table-scroll::-webkit-scrollbar-track,.ss-table-window::-webkit-scrollbar-track{background:transparent}
/* §4.3: the content column itself is 960px; the side gutters sit outside it. */
.ss-content{max-width:calc(960px + 2 * clamp(20px,4vw,48px));margin:0 auto;padding:0 clamp(20px,4vw,48px) 48px}
.ss-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-top:calc(28px + var(--dsh-frame-top-clearance,0px));margin-bottom:24px}
.ss-heading-text{min-width:0}
.ss-title{margin:0;font-size:calc(var(--ds-fs) + 2px);font-weight:500;line-height:1.35}
.ss-heading-actions{display:flex;align-items:center;gap:12px;flex:none}
.ss-updated{color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);white-space:nowrap}
.ss-sections{display:flex;flex-direction:column;gap:24px}
.ss-card{margin:0;padding:16px 18px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);min-width:0}
.ss-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.ss-card-title{margin:0;font-size:var(--ds-fs);font-weight:500;line-height:1.35;color:var(--dsw-alias-label-primary)}
.ss-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.ss-summary{display:flex;flex-direction:column;gap:6px;padding:16px 18px}
.ss-summary-label{margin:0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);font-weight:400;line-height:1.5}
.ss-summary-value{margin:0;font-size:calc(var(--ds-fs) + 2px);font-weight:500;line-height:1.35;font-variant-numeric:tabular-nums;white-space:nowrap}
.ss-summary-unit{color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);font-weight:400;margin-left:6px}
.ss-summary-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);line-height:1.5;overflow-wrap:anywhere}
.ss-progress{height:6px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin:4px 0}
.ss-progress-fill{height:100%;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-brand-primary);transition:width 120ms}
.ss-tone-warn{background:var(--dsw-alias-state-warn-primary)}
.ss-tone-danger{background:var(--dsw-alias-state-error-primary)}
.ss-card-head-main{min-width:0}
.ss-card-sub{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);line-height:1.5}
.ss-legend{display:flex;flex-wrap:wrap;gap:4px 6px;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 3px);margin:0 0 12px}
.ss-legend-item{display:inline-flex;align-items:center;gap:6px}
.ss-swatch{display:inline-block;width:8px;height:8px;border-radius:var(--dsw-radius-xs);flex:none}
.ss-legend-button{max-width:240px;justify-content:flex-start;color:var(--dsw-alias-label-secondary)}
.ss-legend-inner{display:inline-flex;align-items:center;gap:6px;min-width:0}
/* A hidden series is still interactive, so its state is a text tier, not opacity (§8.5). */
.ss-legend-off .ss-legend-text{color:var(--dsw-alias-label-tertiary)}
.ss-legend-dot{display:inline-block;width:8px;height:8px;border-radius:var(--dsw-radius-xs);flex:none;background:var(--ss-series)}
.ss-legend-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ss-trend{display:flex;flex-direction:column;gap:6px}
.ss-trend-body{display:flex;gap:12px;align-items:stretch}
.ss-yaxis{position:relative;flex:none;width:48px;height:200px;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);line-height:1.5;font-variant-numeric:tabular-nums}
.ss-yaxis-label{position:absolute;right:0;white-space:nowrap}
.ss-plot-wrap{position:relative;flex:1;min-width:0;height:200px}
.ss-plot{display:block;width:100%;height:100%;overflow:visible}
.ss-grid-line{stroke:var(--dsw-alias-border-l4);stroke-width:1}
.ss-grid-base{stroke:var(--dsw-alias-border-l3)}
.ss-series-line{fill:none;stroke:var(--ss-series);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ss-hits{position:absolute;inset:0;pointer-events:none}
/* Chart hit region: an invisible SsButton stretched over one day's column. */
.ss-btn.ss-hit{position:absolute;top:0;bottom:0;display:block;height:auto;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;appearance:none;pointer-events:auto;cursor:crosshair}
.ss-btn.ss-hit:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px;border-radius:var(--dsw-radius-xs);background:transparent;color:inherit}
.ss-hit:focus-visible .ss-guide,.ss-hit:focus-visible .ss-dot,.ss-hit:focus-visible .ss-tip{opacity:1;visibility:visible}
.ss-guide{position:absolute;top:0;bottom:0;width:0;border-left:.5px dashed var(--dsw-alias-border-l2);opacity:0;transition:opacity 120ms;pointer-events:none}
.ss-dot{position:absolute;width:8px;height:8px;border-radius:var(--dsw-radius-xs);transform:translate(-50%,-50%);border:.5px solid var(--dsw-alias-bg-layer-1);background:var(--ss-series);opacity:0;transition:opacity 120ms;pointer-events:none}
.ss-hit:hover .ss-guide,.ss-hit:hover .ss-dot,.ss-hit:hover .ss-tip{opacity:1;visibility:visible}
/* Chart tooltip: the §7.7 dark surface, so every inner text tier derives from the white token. */
.ss-tip{position:absolute;top:6px;min-width:170px;max-width:min(40vw,290px);margin-left:12px;padding:4px 8px;border-radius:var(--dsw-radius-sm);border:0;background:var(--dsw-alias-tooltip-bg);box-shadow:none;color:var(--dsw-static-neutral-bluish-00);font-size:calc(var(--ds-fs) - 3px);line-height:1.5;opacity:0;visibility:hidden;transition:opacity 120ms;pointer-events:none;z-index:5}
.ss-tip-right{margin-left:0;margin-right:12px}
.ss-tip-date{margin:0 0 4px;color:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 70%,transparent);font-size:calc(var(--ds-fs) - 3px)}
.ss-tip-total{display:flex;justify-content:space-between;gap:12px;margin:0 0 6px;font-size:calc(var(--ds-fs) - 3px)}
.ss-tip-total strong,.ss-tip-value{font-variant-numeric:tabular-nums}
.ss-tip-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.ss-tip-list li{display:flex;align-items:center;gap:6px;min-width:0}
.ss-tip-dot{display:inline-block;width:8px;height:8px;border-radius:var(--dsw-radius-xs);flex:none;background:var(--ss-series)}
.ss-tip-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 80%,transparent)}
.ss-tip-value{white-space:nowrap}
.ss-tip-foot{margin:6px 0 0;padding-top:6px;border-top:.5px solid color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 20%,transparent);color:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 70%,transparent);font-size:calc(var(--ds-fs) - 3px)}
.ss-xaxis{position:relative;height:18px;margin-left:calc(48px + 12px);color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);line-height:18px}
.ss-xlabel{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.ss-xlabel-first{transform:translateX(0)}
.ss-xlabel-last{transform:translateX(-100%)}
.ss-mini-trend{display:block;width:100%;height:28px;margin-top:auto}
.ss-mini-area{fill:var(--ss-series);fill-opacity:.14;stroke:none}
.ss-mini-line{fill:none;stroke:var(--ss-series);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.ss-num-main{display:block}
.ss-row-bar{display:block;height:4px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);margin-top:4px;overflow:hidden}
.ss-row-bar-fill{display:block;height:100%;border-radius:var(--dsw-radius-xs);background:var(--ss-series-1)}
.ss-log-bar{display:block;height:4px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);margin-top:4px;overflow:hidden}
.ss-log-bar-fill{display:block;height:100%;border-radius:var(--dsw-radius-xs);background:var(--ss-series)}
.ss-table-scroll{overflow-x:auto;margin:0 -6px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l1) transparent}
/* Expanded session table: a fixed ten-row window (SESSIONS_WINDOW_ROWS in the
   component), with a sticky header and its own vertical scrollbar.
   Row/head heights derive from --ds-fs so ten rows survive host type scaling
   (14/16/20px → 58/64/76 and 33/36/42). Box model: the session cell stacks a
   1.5×(fs−1) title line plus a 1.5×(fs−3)+2px id line, and the token cell stacks
   a 1.5×(fs−1) value, a 1.5×(fs−3) split line and its 4+4px bar; the window cell
   adds 6+6px padding + .5px border, so the 3×fs+16px row stays just above the
   tallest (token) content height. thead th is 1.5×(fs−3)+6+6+.5, rounded up to
   1.5×fs+12. max-height is exactly 10 rows + the header, so the sticky header
   plus ten rows fill the window with no clipping or overlap. */
.ss-table-window{max-height:calc(var(--ss-session-row,56px) * 10 + var(--ss-table-head,33px));overflow-y:auto;scrollbar-gutter:stable;overscroll-behavior:contain}
.ss-table-window thead th{position:sticky;top:0;z-index:1;background:var(--dsw-alias-bg-layer-1)}
.ss-table-window tbody tr{height:var(--ss-session-row,56px)}
.ss-table-window tbody td{height:var(--ss-session-row,56px);padding-top:6px;padding-bottom:6px;vertical-align:middle}
.ss-table-window .ss-session-title{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.ss-table{width:100%;border-collapse:collapse;font-size:calc(var(--ds-fs) - 1px);line-height:1.5}
.ss-table th{color:var(--dsw-alias-label-tertiary);font-weight:400;text-align:left;padding:6px;border-bottom:.5px solid var(--dsw-alias-border-l3);white-space:nowrap;font-size:calc(var(--ds-fs) - 3px)}
.ss-table td{padding:8px 6px;border-bottom:.5px solid var(--dsw-alias-border-l4);vertical-align:top}
.ss-table tbody tr:last-child td{border-bottom:0}
.ss-table tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ss-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ss-session-head{display:flex;align-items:flex-start;gap:6px;min-width:0}
.ss-session-title{display:block;flex:1 1 auto;min-width:0;color:var(--dsw-alias-label-primary);font-weight:500;overflow-wrap:anywhere}
.ss-session-id{display:block;color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);line-height:1.5;margin-top:2px;overflow-wrap:anywhere}
/* Archived marker: a quiet warm badge at the title's top-right. */
.ss-archived-badge{margin-top:2px}
.ss-split{display:block;color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);line-height:1.5;white-space:normal}
.ss-sort-arrow{font-size:calc(var(--ds-fs) - 3px);line-height:1}
.ss-table-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:8px}
.ss-table-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px)}
.ss-more-arrow{font-size:calc(var(--ds-fs) - 3px);line-height:1}
.ss-model-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.ss-model{display:grid;grid-template-columns:auto minmax(0,1fr) 96px;gap:12px;align-items:start;min-width:0}
.ss-model-mark{width:8px;height:8px;border-radius:var(--dsw-radius-xs);margin-top:8px;background:var(--ss-series)}
.ss-model-main{display:flex;flex-direction:column;gap:6px;min-width:0}
.ss-model-spark{display:block;width:96px;height:28px;margin-top:4px;overflow:visible}
.ss-model-spark-line{fill:none;stroke:var(--ss-series);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.ss-model-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.ss-model-name{font-size:calc(var(--ds-fs) - 1px);overflow-wrap:anywhere}
.ss-model-share{color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 3px);white-space:nowrap;font-variant-numeric:tabular-nums}
.ss-model-meta{display:flex;flex-wrap:wrap;gap:4px 12px;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px)}
.ss-model-foot{display:flex;justify-content:center;margin-top:12px}
.ss-share-bar{height:6px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.ss-share-fill{height:100%;border-radius:var(--dsw-radius-xs);background:var(--ss-series)}
.ss-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px 20px;margin:0}
.ss-stat{min-width:0;margin:0}
.ss-stat-label{margin:0;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);line-height:1.5}
.ss-stat-value{margin:0;font-size:calc(var(--ds-fs) - 1px);font-weight:500;line-height:1.5;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ss-stat-note{display:block;color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);font-weight:400;line-height:1.5}
.ss-subhead{margin:16px 0 6px;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 3px);font-weight:400}
.ss-spark-plot{display:block;width:100%;height:56px;background:var(--dsw-alias-bg-base);border-radius:var(--dsw-radius-sm);padding:2px}
/* CPU history is a chart series, so it uses series colors, not status colors (§2.6/§2.10). */
.ss-spark-process{fill:none;stroke:var(--ss-series-1);stroke-width:1.5}
.ss-spark-system{fill:none;stroke:var(--ss-series-3);stroke-width:1.5}
.ss-spark-legend{display:flex;gap:16px;align-items:center;margin-top:6px;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px)}
.ss-spark-peak{margin-left:auto;white-space:nowrap}
.ss-spark-swatch-process{background:var(--ss-series-1)}
.ss-spark-swatch-system{background:var(--ss-series-3)}
.ss-logs{display:flex;flex-direction:column;gap:12px}
.ss-log-entry{border-bottom:.5px solid var(--dsw-alias-border-l4);padding-bottom:8px}
.ss-log-entry:last-child{border-bottom:0;padding-bottom:0}
.ss-log-row{display:flex;justify-content:space-between;gap:16px;align-items:baseline}
.ss-log-label{color:var(--dsw-alias-label-tertiary);font-size:calc(var(--ds-fs) - 3px);flex:none}
.ss-log-value{font-variant-numeric:tabular-nums;font-size:calc(var(--ds-fs) - 1px);text-align:right;min-width:0;overflow-wrap:anywhere}
.ss-log-meta{color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);display:block}
.ss-log-block{display:flex;flex-direction:column;gap:4px}
.ss-log-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.ss-log-list li{display:flex;justify-content:space-between;gap:12px;color:var(--dsw-alias-label-secondary);font-size:calc(var(--ds-fs) - 3px)}
.ss-log-name{overflow-wrap:anywhere}
.ss-log-bytes{white-space:nowrap;font-variant-numeric:tabular-nums}
.ss-log-home{margin:0 0 12px;color:var(--dsw-alias-label-caption);font-size:calc(var(--ds-fs) - 3px);overflow-wrap:anywhere}
.ss-state-wrap{display:flex;flex-direction:column;gap:16px}
.ss-skeleton-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
/* §7.10: the first-load skeleton mirrors the tallest summary card
   (label / value / hint / progress / hint), so its height follows the host
   font size and the swap to real cards does not jump. */
.ss-skeleton{display:flex;flex-direction:column;gap:6px;animation:ss-pulse 1.4s ease-in-out infinite}
.ss-skeleton-row{display:block;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2)}
.ss-skeleton-label{width:40%;height:1.5em;font-size:calc(var(--ds-fs) - 3px)}
.ss-skeleton-value{width:64%;height:1.35em;font-size:calc(var(--ds-fs) + 2px)}
.ss-skeleton-hint{width:85%;height:1.5em;font-size:calc(var(--ds-fs) - 3px)}
.ss-skeleton-bar{width:100%;height:6px;margin:4px 0}
.ss-skeleton-line{height:56px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1)}
@keyframes ss-pulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes ss-spin{to{transform:rotate(360deg)}}
.ss-spin{animation:ss-spin .9s linear infinite}
.ss-icon{display:block}
@media (max-width:960px){.ss-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ss-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:720px){.ss-table th:nth-child(6),.ss-table td:nth-child(6){display:none}.ss-heading{align-items:flex-start;flex-wrap:wrap}.ss-heading-actions{flex-wrap:wrap}.ss-summary-grid{grid-template-columns:1fr}.ss-stats{grid-template-columns:1fr}.ss-model{grid-template-columns:auto minmax(0,1fr)}.ss-model-spark{display:none}.ss-yaxis{width:32px}.ss-xaxis{margin-left:calc(32px + 12px)}.ss-plot-wrap,.ss-yaxis{height:170px}}
@media (max-width:520px){.ss-session-id{display:none}.ss-log-home{display:none}.ss-updated{display:none}.ss-heading-actions{gap:8px}}
@media (prefers-reduced-motion:reduce){.ss-guide,.ss-dot,.ss-tip,.ss-btn,.ss-icon-btn,.ss-segment,.ss-progress-fill,.ss-skeleton,.ss-spin,.ss-tooltip-layer[data-plugin="@chengze/dsh-session-stats"] .ss-tooltip{transition:none;animation:none}}
`

