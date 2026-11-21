# Government Relations Dashboard

ERP Custom HTML Block: `Govt Relation Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 · moved onto the DM dashboard standard (19 Nov 2026)

v2 moves v1 onto the shared DM kit. v1 is in git history (commit `bed1539`). The block stays read-only, and uses permission-checked `get_list` and `get_count` on DM Facilities Management, DM Companies Management and Prepaid Expense.

**Kept from v1:**
- **Items:**
  - an EJAR contract per facility;
  - licences and service contracts of Active facilities only;
  - a CR per entity that isn't cancelled;
  - a MISA item per entity with a MISA number.
- **Status rule:** Expired below 0 days, Expiring Soon within the alert window, and Valid beyond it.
  - Closed EJAR contracts and records without a date are not counted.
  - Service contracts (fire, camera, cleaning) appear on the licence tab but are not counted in the overview.
- **Filters:** the alert window (30, 60 or 90 days, default 60) and the expiry-range presets (overdue, next 30, 60 or 90 days, this month, quarter or year, or a custom from and to).
- **Also kept:** the data-gap checks, the entity compliance matrix, the renewal heatmap and the EN/AR dictionary (reused as is, plus v2 labels).

**Changed:**
- **Shell:** the toolbar, filters, tabs, tables (search, sort, paging, CSV), lists, RTL, dark mode and layout down to 320 px come from the kit.
  - The canvas charts are now kit bars, so they follow the theme and stay readable. The cumulative line and the gauge became a compliance KPI.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **KPI cards:** they open the matching items on the page, each linking to its record. v1 opened ERP list URLs.
- **Loading:** each source loads and fails on its own, and the banner names the source that failed.
- **Actions pending:**
  - High: expired items.
  - Medium: items within the alert window.
  - Low: per-record data gaps, such as a missing MISA or National Address expiry, a missing commercial licence or civil defence date, or a placeholder CR number.

**Test:** `npm --prefix tools/erp run test:gov-relations`. Screenshots are saved in `.local/qa/gov-relations`.
