# Plant & Furniture Asset Dashboard

ERP Custom HTML Block: `Plant & Furniture Asset Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 · moved onto the DM dashboard standard (19 Nov 2026)

v2 moves v1 onto the shared DM kit. v1 is in git history (commit `962142f`). The block stays read-only: it uses permission-checked `get_list` and `frappe.client.get` only, and needs no Server Script.

**Kept from v1:**
- **Scope:** Asset categories "Plant and Machinery Direct" and "Fixtures & Fittings-Indirect", plus DM Assets chairs and tables. Asset records and DM Assets records are counted apart and never merged.
- **Status:** active means submitted and not sold, scrapped or decapitalized. The status filter keeps v1's options (active, all except cancelled, all, cancelled, draft, or one ERP status).
- **Valuation:**
  - Book value is verified only when cost − opening depreciation − journal-posted schedule depreciation equals the ERP value field (±1).
  - One finance book per asset is used (the default, else the first).
  - The first 150 assets are checked, and the page says so when more exist.
  - A zero value without supporting postings is shown as unverified.
- **Money:** amounts stay in each company's currency and are never added across currencies. Several currencies in one card are stacked, one per line.
- **Checks:** the maintenance overdue rule, the exception and audit checks with their severities, and every label and translation (the v1 dictionary is reused as is).

**Changed:**
- **Shell:** the toolbar, filters (dates as date inputs; no period control, as v1 had none), tabs, tables (search, sort, paging, CSV), detail overlay, RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Loading:**
  - Child rows (maintenance tasks, movement items, acquisition items) are read with `get_list` on the child table, where the parent permission applies.
  - Data is loaded per tab and kept until Refresh or a filter change.
  - A failure in one source leaves the others working.
- **Actions pending:** the v1 exception checks, most urgent first, each linking to its record:
  - High: no location, zero cost, possible duplicates, overdue maintenance, unverifiable book value, DM asset without an ID.
  - Medium: no custodian, draft, maintenance flag without a plan, completed maintenance without a required certificate, no purchase date.
  - Low: incomplete DM Assets records, fully-depreciated flag mismatch.
- **Language:** findings are built in English and Arabic, so switching language shows no stale text.
- **Not shown:** v1's maintenance and inspection drawers were not in its tab list and stay out.

**Test:** `npm --prefix tools/erp run test:plant-furniture`. Screenshots are saved in `.local/qa/plant-furniture`.
