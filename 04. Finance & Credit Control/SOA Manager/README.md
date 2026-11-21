# SOA Manager

ERP Custom HTML Block: `SOA Manager`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [soa_api](server_scripts/soa_api_cca237a6.py)
- [soa_workflow_api](server_scripts/soa_workflow_api_2e6f5dd7.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## Existing local working files

These files preserve the workspace versions and differ from the ERP snapshot above.

- [soa_manager_dashboard.js](local/soa_manager_dashboard.js)
- [soa_manager_dashboard.css](local/soa_manager_dashboard.css)

Shared local backend scripts are in [Shared Server Scripts](../Shared%20Server%20Scripts/README.md).

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt from the deployed ERP snapshot (`dashboard.js`), which is newer than the files in `local/`; `local/` is left untouched. Built on the shared DM kit: toolbar, period, filters, browser tabs, KPI cards, actions pending, RTL, Desk dark mode, and layouts down to 320px.

**Backend unchanged.** The block still calls only `soa_api` and `soa_workflow_api`. Every write is the same call as before:

- **Statement review:** approve & email, reject (a reason is still required), re-check.
- **PDF previews:** `manager_preview`, plus the workflow `preview`.
- **Collections:**
  - Build today's lists, approve one list or all of them.
  - Remove, put back or replace a customer.
  - Download the daily PDF.
  - Salesperson assignments with a daily maximum, and adding or removing collectors.
- **Workflow:** customer-transfer and finance-request review, and employee access toggles.

**What changed:**

- **New Overview tab:**
  - KPIs: waiting for you, approved today, matched this month, rejected this month, lists to approve, collected.
  - Requests by status over the period.
  - Requests by salesperson.
  - Collections by collector.
- **Actions pending.** Five categories, each row opening its ERP record:
  - Statements to review.
  - Collection lists to approve.
  - Outstanding reports.
  - Customer transfers.
  - Finance report requests.
- **Global filters:** salesperson, document and status, plus the period. They apply to the request log, the files log and the overview charts. The review queue and collections always show everything waiting.
- **Exports:** the request and file logs are sortable, searchable tables with CSV export. So is each collection list.
- **Refresh:** auto-refresh stays at 15 seconds. It never replaces the page while you type, while a panel is open or while something is saving. Open collection lists stay open across refreshes.
- **Replacing a customer** in a collection list now uses the dashboard's own dialog instead of `frappe.ui.Dialog`.

**Deploy:** paste `dashboard.html` (it was empty before), `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields. No Server Script changes.

**Test:** `npm --prefix tools/erp run test:soa-manager` (30 checks). It uses a stateful mock of both Server Scripts and checks review, reject-needs-reason, list approval, transfer approval and access toggles. Screenshots are in `.local/qa/soa-manager/`.
