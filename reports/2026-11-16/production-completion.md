# Production block completion check

The matching HTML, CSS and JavaScript must be deployed together. No live ERP records were changed.

Fixed: static audit/demo figures and October dates removed; Refresh handler attached to the existing button; period/custom-date controls use stable values; factory selection uses verified mappings; all source pages load beyond 1,000 records; tables paginate beyond the former first-100 cut-off; target count shows actual records; remaining quantities group by item/UOM; linked quality records replace inspection placeholders; errors stay local to their panels; stale filter responses are ignored; language controls and Arabic period labels work.

The old Capacity/Cost Reconciliation placeholder KPIs were removed. Recorded cost/activity/stock evidence is presented with its basis instead. No capacity calendar or reconciled financial manufacturing cost was invented.

Live API checks passed for Work Order (including stock_uom/total_operating_cost), Quality Inspection, Daily Production Cost and factory mappings. Several active factory records have no legacy branch label: their branch-based panels show a mapping-required state rather than zero.

Headless Edge checks passed: initial current-month dates, existing Refresh button, 125-row register pagination, factory selection, period change, custom dates, RTL and Arabic labels, linked inspections, and an isolated stock-permission failure. No browser page errors occurred. These are offline fixture browser checks, not certification under every live ERP role.

Nineteen source regression checks passed, including a 1,005-row source exceeding the former ceiling. Run `npm --prefix tools/erp test` and `npm --prefix tools/erp run test:production` after installing the tools dependencies. The browser test uses Edge on Windows by default; PRODUCTION_TEST_BROWSER can specify another executable.
