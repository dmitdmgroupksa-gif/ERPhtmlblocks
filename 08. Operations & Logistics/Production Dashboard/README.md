# Production Dashboard

ERP Custom HTML Block: `Production Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## Local remediation

Production now reads submitted parent documents and their stock, cost, job and activity detail rows using native document permissions. Activity dates determine workforce scope. Factory/warehouse filters use Manufacturing Factory and only Confirmed warehouse mappings. Cost figures are recorded Daily Production Cost values; capacity and full financial reconciliation are not inferred. No quantity total combines different items or stock units. All source pages are now loaded; registers have client-side pagination. A failed source or unresolved factory mapping suppresses the corresponding totals.

## Live shell update

Replace all three Custom HTML Block fields using the latest dashboard.html, dashboard.css and dashboard.js together. Static preview figures and dates were removed. Refresh, periods, custom dates, factories, pagination and language switching are connected. Linked Quality Inspection records are permission checked. No new Server Script is needed. Browser checks use fixture data; live read-only API checks verified the selected source fields. Capacity and full ledger cost reconciliation are explained as unsupported calculations rather than shown as blank KPI tiles.

## v3 · moved onto the DM dashboard standard (19 Nov 2026)

v3 moves the remediated v2 onto the shared DM kit. v2 is in git history (commit `962142f`).

**Kept from v2 (the local remediation):**
- **Documents:** submitted documents only, and every source page is read, with no row ceiling.
- **Factory scope:**
  - Work orders and manufacture entries are scoped through Manufacturing Factory and only its Confirmed warehouse mappings.
  - Job orders, daily production and costs are scoped through the factory's branch label.
  - A factory whose mapping is incomplete suppresses those figures instead of showing zero.
- **Quantities and money:**
  - Quantities are grouped by item and stock unit, never added across them.
  - Finished valuation is shown per company currency.
  - Costs are the recorded Daily Production Cost values, not a reconciled statement. Capacity is not inferred.
- **Quality:** linked Quality Inspections are permission-checked, and missing or inaccessible ones are reported.
- **Isolation:** a failure in one source leaves the others working.

**Changed:**
- **Shell:** the toolbar, period (this month by default, as v2), factory filter, tabs, tables (search, sort, paging, CSV), RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Loading:** child rows (stock entry items, job utilisation rows, daily production rows, cost rows) are read with `get_list` on the child table, where the parent permission applies. v2 fetched each document one by one.
  - Daily production rows are read by their own activity date. v2 loaded every daily production document and filtered afterwards.
- **Actions pending:**
  - overdue factory jobs;
  - job rows without an employee;
  - quality inspections not found;
  - factories with an incomplete mapping.
- **Tests:** `tools/erp/tests/production-browser.cjs` was rewritten on the shared harness. It keeps the v2 coverage: monthly default, 125-row paging, factory filtering, quality records and an isolated permission failure. The regression checks in `tests/regression.cjs` now test the kit loader (`fetchAll`, 1,005 rows), warehouse scoping (`byWh`) and unit grouping (`grp`).
- **Language:** every label is in English and Arabic.

**Test:** `npm --prefix tools/erp run test:production`. Screenshots are saved in `.local/qa/production`.
