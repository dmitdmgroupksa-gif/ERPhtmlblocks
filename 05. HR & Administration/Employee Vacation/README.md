# Employee Vacation

ERP Custom HTML Block: `Employee Vacation Tracker`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 · moved onto the DM dashboard standard (19 Nov 2026)

v2 moves v1 (the Vacation, Air Ticket, Refund & Exit Re-entry Tracker) onto the shared DM kit. v1 is in git history (commit `962142f`). The block stays read-only, and uses permission-checked `get_list` only, on Leave Application, Employee Vacation Record, Employee and Company.

**Kept from v1:**
- **Scope:** approved, submitted Annual Leave DIRECT and INDIRECT applications.
- **Matching:** each application is matched to its Employee Vacation Record by leave application, else by employee and start date.
- **Exclusions:** employees who have left, back-office, work-from-home and work-at-site locations, and test employees.
- **Statuses:**
  - Status, re-join, ticket, refund and exit re-entry values come from the vacation record.
  - Without a record, they are derived from the leave dates. "Return Unverified" means the leave has ended and nothing confirms the return.
- **Period:** vacations that overlap the period, plus every overdue vacation. The default runs from 60 days back to 60 days ahead.
- **Also kept:** location coverage, the leave calendar, the timeline, departments, tickets and refunds, the exit re-entry list, and the EN/AR dictionary (reused as is, plus a few v2 labels).

**Changed:**
- **Shell:** the toolbar, period, filters, tabs, tables (search, sort, paging, CSV), detail overlay, RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Records:** links open in a new tab, and the "Details" overlay explains derived statuses. v1 navigated away from the dashboard.
- **Job location names:** removed. v1 looked up names for `custom_job_location`, but the field is a Select, not a Link, so there were never names to show.
- **KPI wording:** the "Vacations" card is now "all approved annual leave in the period". v1 said "over 2 days", but the query has always included every length.
- **Actions pending:** each row links to its record.
  - High: overdue returns, expired exit re-entry.
  - Medium: action comments, re-entry expiring within 7 days, re-entry not recorded.
  - Low: unverified returns, pending airfare refunds.

**Test:** `npm --prefix tools/erp run test:employee-vacation`. Screenshots are saved in `.local/qa/employee-vacation`.
