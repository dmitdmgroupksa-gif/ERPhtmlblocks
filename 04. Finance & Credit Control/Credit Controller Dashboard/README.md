# Credit Controller Dashboard

ERP Custom HTML Block: `Credit Controller Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

None. The block reads ERPNext through the standard `frappe.client.get_list` and `frappe.desk.query_report.run` endpoints, under the viewer's own permissions.

## v2 redesign (17 Nov 2026)

The dashboard is rebuilt on the same standard as Quotation & SO Tracker and CEO Command Centre. It is no longer in `tools/erp/shell/shell_map.json`.

**Deploy:** paste all three files into the block: HTML ← `dashboard.html`, Style ← `dashboard.css`, Script ← `dashboard.js`. The HTML changed (the root is now `.dms-root`), so the old Style and Script will not work with the new HTML. No Server Script change is needed.

### What it shows

- **Toolbar** (right to left in English): language, refresh, filters, period, pending-actions count.
  - **Filters:** company (only companies whose default currency is SAR), division, location, and customer (customers with an open balance, searchable).
  - **Period:** presets plus a calendar. The period applies to collections only. Balances, aging, credit limits and actions are always as of today, and the page says so.
- **Overview:**
  - Six indicators: total outstanding (with an aging mix bar), overdue, overdue more than 90 days, collected in the period (compared with the same days of the previous period, with a sparkline), customers over their credit limit, and DSO.
  - Actions pending sits beside two charts: aging in bucket order (each bucket opens its invoices) and collections by day, week or month.
  - Breakdowns: top customers split into overdue and not yet due, outstanding by company, and outstanding by division.
- **Tabs:** Customer aging (sortable, searchable, totals row, CSV), Open invoices (bucket chips, server-side paging, sortable columns, CSV up to 5,000 rows), Credit limits, Collections (period table plus the last 12 months) and Actions pending. Selecting any customer opens their open invoices, with a link to the Customer record.

### Actions pending

Each row links to its ERP record and shows the responsible salesperson, the due date or age, and a priority. Categories, most urgent first:

| Category | Source | Priority |
| --- | --- | --- |
| Over credit limit | Open balance per customer and company above a positive `Customer Credit Limit.credit_limit` | High |
| Overdue > 90 days | Sales Invoice, due date more than 90 days ago, largest first | High |
| Flagged customers | `Customer.custom_collection_status` Follow up / Escalated / Critical | High / Medium |
| Facility renewal | `custom_credit_status` Expired / Missing / Under Review, or `custom_credit_expiry_date` within 30 days, for customers with a balance | High / Medium |
| Newly overdue | Due date 1–30 days ago | Medium |
| Unallocated receipts | Payment Entry (Receive, SAR account) with `unallocated_amount` > 0 | Medium |
| Due in 7 days | Due date within the next 7 days | Low |
| Unapplied credit notes | Submitted invoices with a negative outstanding amount | Low |

The salesperson is `Sales Invoice.sales_person`, `Customer.custom_sales_person`, or `Payment Entry.sales_person` (falling back to its owner).

### Definitions (verified against the ERP map)

All DocTypes and fields used are present on the site with the expected types: `Sales Invoice.custom_division` (Link), `location` (Select), `party_account_currency`, `outstanding_amount`, `base_grand_total`; the `Payment Entry` fields; and `Customer Credit Limit.custom_credit_status`, `custom_credit_expiry_date`.

- **Receivables:** submitted Sales Invoices with a positive outstanding amount, posted on or before today, with an SAR party account, in SAR companies.
- **Collections:** submitted Payment Entries of type Receive with party type Customer, using `base_received_amount`. The division filter does not apply to receipts.
- **Credit limits:** compared per customer and company, because ERPNext sets limits per company. A zero or missing limit counts as "No limit set", not as exceeded.
- **DSO:** outstanding ÷ net billing over the last 90 days × 90.
- **Failures:** a source that fails or is restricted shows "—" and is named. It is never shown as 0.

### What changed from v1, and why

- **Company gate removed:** v1 showed nothing until a company was picked. v2 opens on all SAR companies, which is still a single currency.
- **As-of date removed:** it was a disabled control that did nothing.
- **New:**
  - Period selector and comparison window.
  - Actions pending.
  - Per-company credit-limit evaluation (v1 added limits across companies).
  - Facility status and expiry.
  - DSO.
  - Responsible salesperson on rows.
  - Sortable server tables and CSV export on every table.
- **Faster:**
  - Receipts load in one grouped query per range, instead of six monthly queries.
  - Field metadata is no longer loaded through `frappe.model.with_doctype`.
  - The two native report references (Over Credit Limit Customer, Collection Analysis Report) load only when "Native report references" is opened. Their different definitions are explained there.
- **Fixed:** the aging donut is replaced by ordered bars.

### Tests

`npm --prefix tools/erp run test:credit` runs 48 browser checks. Figures are checked against an independent fixture:

- **Coverage:** filters, period and calendar, stale responses, drill-downs, CSV, permission states, the empty state, and EN and AR at 3440, 1920, 1440, 1024, 768, 375 and 320px with touch-target checks.
- **Screenshots:** `.local/qa/credit-controller/`.

`npm --prefix tools/erp test` keeps the regression check for `reportReferenceTotal`.
