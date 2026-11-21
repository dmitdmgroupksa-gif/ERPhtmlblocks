# SOA Request Dashboard

ERP Custom HTML Block: `SOA Request Dashboard`

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

- [soa_request_dashboard.js](local/soa_request_dashboard.js)
- [soa_request_dashboard.css](local/soa_request_dashboard.css)

Shared local backend scripts are in [Shared Server Scripts](../Shared%20Server%20Scripts/README.md).

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt from the deployed ERP snapshot (`dashboard.js`); `local/` is left untouched. Built on the shared DM kit: toolbar, period, filters, browser tabs, KPI cards, actions pending, RTL, Desk dark mode, and layouts down to 320px.

**Backend unchanged.** The block still calls only `soa_api` and `soa_workflow_api`:
- `soa_api`: `bootstrap`, `list` (scope mine), `preview`, `create`.
- `soa_workflow_api`: `bootstrap`, `mine`, `customers`, `request_report`, `request_transfer`.

The daily per-document limits and Azrah's review work exactly as before.

**What changed:**

- **New Overview tab:**
  - KPIs: my customers, open balance, requests in the period, emailed, with Azrah, rejected/failed (with requests left today).
  - Highest-balance customers: selecting one starts a request for it.
  - My requests by status.
- **Actions pending,** from the salesperson's own data:
  - Rejected or failed requests (last 60 days) not yet requested again.
  - Customers with an open balance and no statement in 30 days.
  - Requests still with Azrah.
- **New request:** keeps the customer list (search, sort), document choice, dates, balance pre-check and daily-limit message. The customer list also shows the last request date.
- **My requests:** now a sortable, searchable table with CSV export. It follows the period and the document/status filters.
- **Outstanding report and customer transfer:** same forms, now with the earlier requests and Azrah's notes as a table.
- **Auto-refresh:** still every 90 seconds while something is with Azrah. It never interrupts typing.

**Deploy:** paste `dashboard.html` (it was a placeholder before), `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields. No Server Script changes.

**Test:** `npm --prefix tools/erp run test:soa-request` (27 checks). It uses a stateful API mock and checks the pre-check warning, create, the daily limit, the transfer payload and the report request. Screenshots are in `.local/qa/soa-request/`.
