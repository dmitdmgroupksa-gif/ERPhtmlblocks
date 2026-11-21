# DMS Technical Department

ERP Custom HTML Block: `DMS Technical Department Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [DMS Technical Dashboard Data](server_scripts/dms_technical_dashboard_data_936773f5.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 · moved onto the DM dashboard standard (19 Nov 2026)

v2 moves v1 onto the shared DM kit. v1 is in git history (commit `962142f`). The Server Script `dms_technical_dashboard_data` is unchanged. It reads DMS Technical Submittal with the user's own permissions and the DMS permission query, so salespeople see only their own records.

**Kept from v1:** every figure and list comes from the API.
- **Status counts:** they ignore the status filter. Overdue means open and past the required date.
- **Lists:** Action Required, Under Review, Recently Approved and Recent Requests, with the API's sorting and limits.
- **Filters:** status (including Overdue), department, salesperson, project, priority, and requested from and to.
- **Clicks:** status cards set the status filter, and rows open the submittal.
- **Language:** the Arabic labels from v1's generated language block are reused as is.

**Changed:**
- **Shell:** the toolbar, filters, tabs (one per list), tables (search, sort, paging, CSV), RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json` (also from the generated language list). Don't re-add it.
- **Actions pending:** from the API's lists.
  - High: overdue submittals.
  - Medium: revision required, and submittals due within 2 days.
  - Low: under review for more than 14 days.

**Test:** `npm --prefix tools/erp run test:dms-technical`. Screenshots are saved in `.local/qa/dms-technical`.
