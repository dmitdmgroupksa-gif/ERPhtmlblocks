# Scaffolding Rental

ERP Custom HTML Block: `Scaffolding rental - Employee Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 · moved onto the DM dashboard standard (19 Nov 2026)

v2 moves the v1 employee dashboard onto the shared DM kit. v1 is in git history (commit `962142f`).

**Kept from v1:**
- **Personal data and links:**
  - Personal data appears only when an Employee record is linked to the user (`Employee.user_id`). Otherwise the dashboard says so and shows nothing personal.
  - Tasks are linked through ToDo assignments (allocated to the user), not the task owner.
  - Projects come from Project User membership and the assigned tasks' projects.
  - Rental documents are linked through the Employee fields "From" and "Prepared By" (Rental Sales Invoice: "Prepared By").
- **Sources and fields:** every one is unchanged and was checked against the ERP map.
- **Figures and limits:**
  - Attendance % = (present + work from home + ½ half day) ÷ (present + work from home + half day + absent).
  - Leave balance comes from the HR app (`get_leave_details`).
  - Dispatched quantities are shown per unit and never added across units.
  - Active rentals, awaiting return, returned or outstanding quantity and overdue returns are shown as not tracked, because the rental DocTypes have no such fields. They are never estimated.
- **Widget heading:** the repair for the block's widget heading when it reads "undefined".

**Changed:**
- **Shell:** the toolbar, period presets (this month by default, as v1), filters, tabs, tables (server-side search, sort, paging and CSV for the long lists), RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Actions pending:** five personal categories:
  - leave approvals waiting for you;
  - your overdue tasks;
  - draft attendance requests;
  - draft rental documents;
  - your open leave applications.
- **My reports:** v1's "My reports" tab only reopened the same lists. Those lists now sit in their tabs with CSV export. The return reports stay unavailable for the reason above.
- **Language:** every label is in English and Arabic.

**Test:** `npm --prefix tools/erp run test:scaffolding-rental`. It uses one employee's month of records, with another employee's documents that must not appear, and a second session for a user with no Employee record. Screenshots are saved in `.local/qa/scaffolding-rental`.
