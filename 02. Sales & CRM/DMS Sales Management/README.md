# DMS Sales Management

ERP Custom HTML Block: `DMS Sales Manager Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [DMS Daily Sales Activity Report API](server_scripts/dms_daily_sales_activity_report_09fd04d5.py)
- [DMS Manager Contact Requests API](server_scripts/dms_manager_contact_requests_95145350.py)
- [DMS Project Explorer Sectors API](server_scripts/dms_project_explorer_sectors_102f870e.py)
- [DMS Sales Dashboard Data](server_scripts/dms_sales_dashboard_data_4db2a9af.py)
- [DMS Share Key Personnel Contact](server_scripts/dms_share_key_personnel_contact_b1a55886.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit: toolbar, filters (salesperson, follow-up status), browser tabs, actions pending, RTL, Desk dark mode, and layouts down to 320px. It replaces the long single page that relied on the generated shell.

**Server Scripts unchanged:**
- `dms_sales_dashboard_data`
- `dms_daily_sales_activity_report`
- `dms_project_explorer_sectors`
- `dms_manager_contact_requests`
- `dms_share_key_personnel_contact`, the only write. It shares a contact request, marks it in progress or rejects it, with the same arguments as v1.

**Tabs:**
- **Overview:** six KPIs:
  - Projects (allocated share).
  - Never contacted.
  - Overdue follow-ups.
  - Active pipeline.
  - Won with win rate.
  - Open contact requests.

  Also the pipeline by stage, projects by salesperson and projects by region.
- **Sales team:** every number opens the DMS Project list with v1's filters.
- **Follow-ups:** overdue, next 7 days and recent.
- **Daily activity:** report date, previous working day, salesperson, status mix, salespeople / activities / no-activity, email preview, CSV export and printable view.
- **Project explorer:** region → sector → contractors and subcontractors, using v1's stage logic, and opens exactly those projects.
- **Contact requests:** status cards, search, and a share dialog with up to 10 contacts, using v1's validation.
- **Actions pending:** five categories:
  - Overdue follow-ups.
  - Contact requests waiting.
  - Due today.
  - Allocation mismatch.
  - Never contacted.

**Changes:**
- **Share dialog:** it is now a dashboard dialog instead of `frappe.ui.Dialog`. Reject asks for a confirming click.
- **Request counts:** they showed "—" instead of 0 when a status had no requests (fixed).
- **Unused sections removed:** v1's standalone sector, region and contractor-cluster sections were never rendered and are gone. The explorer covers them.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields.

**Test:** `npm --prefix tools/erp run test:dms-sales` (31 checks), with screenshots in `.local/qa/dms-sales/`.
