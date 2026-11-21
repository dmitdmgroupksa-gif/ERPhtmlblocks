# Quotation & SO Tracker

ERP Custom HTML Block: `Sales CRM & Conversion Tracker Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## v2 redesign (17 Nov 2026)

- **Layout.** One compact toolbar. In English, from the right edge: language, refresh, filters, period, pending-actions count (mirrored in Arabic). Browser-style tabs sit on a connected sheet. The Overview shows 6 KPI cards, then Actions pending | trend chart + funnel (50/50), then 4 breakdown panels and a collapsed data reconciliation.
- **KPIs.** Overview keeps quotations, sales-order value, conversion to SO (value), acceptance rate, active pipeline and overdue deliveries. Acceptance incl. Closed, billed/delivered, leads in period and active buyers moved to their tabs (Conversion, Sales Order, Lead, Customer), where they already existed.
- **Real data only.** Sparklines use the same daily / weekly / monthly series as the trend chart (≥ 3 points or none). The change chips on Quotations and Sales order value compare server aggregates for the period to date with the same span one preset unit earlier. Bases under 5 show "was N". Sales order value has no chip under a salesperson filter.
- **Actions pending** reuses the 8 Action Center lists (as of today). Each list contributes up to 6 candidates so a single category can supply the entire six-row preview. Queries follow urgency order; ToDos use their complete bounded set to rank mixed priority/deadline cases before sampling. Sales Order actions follow division, location and salesperson, including “Not Assigned” through a no-Sales-Team child-row predicate. Child-table query compatibility still needs live-site verification; query failures are shown as unavailable.
- **Period presets** add Yesterday, Last week and This quarter. Custom range uses a calendar (Sunday-first, keyboard navigable). Filters are a popover with search on long lists and Apply / Clear. Company narrows the other lists to values seen with that company.
- **Fixes.** Stale primary-load, reconciliation, comparison and action responses cannot overwrite newer selections. Source success/error handlers are bound to their load's data object and request token. Analytics requiring an unavailable source show an error instead of false zero metrics; Refresh retries the source. Action counts reload when filters change. Re-rendering no longer refetches an open drill-down.
- **Accessibility and mobile.** Drill-down dialogs have an accessible name, contain Tab/Shift+Tab focus, make the background inert and restore the opener on dismissal. Touch toolbar/tab controls are at least 44px high, calendar columns fit narrow screens, and touch inputs use 16px type. Chart tick spacing uses rendered localized label widths and updates on resizing and font loading.
- **Shared shell.** Excluded from `tools/erp/shell/shell_map.json` (shell and `_dark`) because it is built on the standard directly; dark tokens live in `dashboard.css`.
- **Tests.** `npm --prefix tools/erp run test:quotation` (43 checks) covers fixture totals, primary-source races and recovery, unassigned action counts/drill-downs, urgency selection, dialog focus, chart-label collisions and touch layouts down to 320px in English and Arabic. Screenshots are in `.local/qa/quotation-tracker/`. See the [review and resolution](../../reports/2026-11-17/quotation-tracker-skill-review.md).
- **Deploy.** Paste `dashboard.js` into Script and `dashboard.css` into Style; HTML is unchanged.

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.
