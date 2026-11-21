# Finance Manager Dashboard

ERP Custom HTML Block: `Finance Manager dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [soa_workflow_api](server_scripts/soa_workflow_api_2e6f5dd7.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 redesign (17 Nov 2026)

v1 was only a form for requesting the Advance and Sales vs Target report PDFs. It showed the finance manager no figures. v2 keeps that request flow unchanged and adds a finance overview, built on the DM dashboard standard with the shared kit (`tools/erp/kit`). It is no longer in the shell map.

**Deploy:** paste HTML ← `dashboard.html` (v1 left HTML empty), Style ← `dashboard.css`, Script ← `dashboard.js`. The Server Script `soa_workflow_api` is unchanged; it is shared with SOA Manager and SOA Request.

- **Overview cards:**
  - **Cash and bank:** GL balance of Bank and Cash accounts.
  - **Receivables and payables:** submitted invoices with an open balance in system-currency party accounts, with the overdue share.
  - **Collected, paid out and net cash flow:** Payment Entry, company currency, for the period, compared with the same span earlier.
- **One currency per view:** without a company filter, figures cover system-currency companies only, and a banner names the companies left out.
- **Charts:** collections against payments, receivables and payables ageing (each bucket opens its invoices), cash by company, and receivables against payables.
- **Report requests:** the same request as v1 (`finance_bootstrap`, `mine`, `request_finance`), with the same validation and statuses. The list refreshes every 30 seconds while the tab is open.
- **Actions pending:**
  - **High:** receivables more than 90 days overdue; overdue supplier invoices (not on hold).
  - **Medium:** draft payment entries (including those in the approval workflow); draft journal entries.
  - **Low:** supplier invoices on hold; the user's own report requests still pending with Azrah.
- **Tests:** `npm --prefix tools/erp run test:finance-manager` runs 24 browser checks.
