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
