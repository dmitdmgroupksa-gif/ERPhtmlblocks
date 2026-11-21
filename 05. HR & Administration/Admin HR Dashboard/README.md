# Admin HR Dashboard

ERP Custom HTML Block: `Admin HR Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [Admin HR Compliance API](server_scripts/admin_hr_compliance_data_1e9c8561.py)
- [Admin HR Dashboard API](server_scripts/admin_hr_dashboard_data_0f894ebc.py)
- [Admin HR Employee Detail API](server_scripts/admin_hr_employee_detail_f8cf00df.py)
- [Admin HR Employee Directory API](server_scripts/admin_hr_employee_directory_1fbaa99b.py)
- [Admin HR Leave API](server_scripts/admin_hr_leave_data_813b2196.py)
- [Admin HR Requests API](server_scripts/admin_hr_requests_data_c9b1c2c6.py)
- [Admin HR Training API](server_scripts/admin_hr_training_data_6a904c9b.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v4 · moved onto the DM dashboard standard (19 Nov 2026)

v4 moves v3 onto the shared DM kit. v3 is in git history (commit `bed1539`). The seven Server Script APIs are called unchanged and the block stays read-only.

**Kept from v3:**
- **Permissions:** the detail tier (HR Manager / HR User) and the aggregate tier are decided on the server. In the aggregate tier the page shows figures and counts only. Employee lists, the directory and the employee panel are not shown, and the directory API is never called.
- **Attendance policy:**
  - Approved leave always comes first.
  - Friday is off for everyone, and Saturday is also off for Saudi nationals.
  - An absence count with an incomplete basis is shown as unavailable, never as zero.
- **Definitions:** every KPI definition, list preset and data-quality check comes from the APIs.
- **Filters and period:** the default period runs from one month back to today. Company, department, branch and job location filters go to every API (as `g_*` for the module APIs).
- **Language:** the English labels and the v3 Arabic dictionary are reused as is. v4 adds about 90 entries for labels that are new in v4.

**Changed:**
- **Shell:** the toolbar, period, filters, tabs, tables (search, sort, paging, CSV), drill lists, RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Module tabs:** Leave, Documents & Compliance, HR Requests and Training share one layout:
  - the API's KPIs;
  - queues;
  - the main analytics as charts;
  - the data-quality checks;
  - a server-paged list.
  - Clicking a KPI or a data-quality count narrows the list through the API preset.
- **HR Analytics:** this tab now shows the organisation figures from the main API: nationality, Saudization, tenure, joiners and leavers, turnover and data quality. The leave, compliance, training and request charts it used to repeat are on their own tabs.
- **Not carried over:** these v3 panels were not carried over; the data stays in ERPNext and in the APIs:
  - compliance notification settings and the alert-threshold preview;
  - training catalogue, eligibility rule check and reminder jobs;
  - request status-normalisation rules;
  - the leave calendar.
- **Fixed:** v3 read recorded absences from a row list the API never sends (`absent_recorded`). As a result, "Absent today" was unavailable whenever anyone had a recorded absence. v4 reads the API's `absent_today` list.
- **Actions pending:** all from the main API rows.
  - High: expired documents, holiday list not covering today, nationality fields that disagree.
  - Medium: pending leave approvals (older than 3 days), documents due within 30 days, absent today, leave status mismatches.
  - Low: overdue training, open HR requests.
  - Each row links to its record. The aggregate tier shows the counts only.

**Test:** `npm --prefix tools/erp run test:admin-hr`. Screenshots are saved in `.local/qa/admin-hr`.
