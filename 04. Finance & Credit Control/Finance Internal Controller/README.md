# Finance Internal Controller

ERP Custom HTML Block: `Finance internal  controller`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 redesign (17–18 Nov 2026)

Rebuilt on the DM dashboard standard, using the shared kit (`tools/erp/kit`), so it is no longer in the shell map.

**Deploy:** paste HTML ← `dashboard.html`, Style ← `dashboard.css`, Script ← `dashboard.js`. The HTML changed completely, so all three are needed. No Server Script.

**Kept from v1:**
- The workflow state sets (pending, returned, rejected, approved) and roles read from active Workflows.
- Merged paging across Payment Entry, Journal Entry, Expense Claim and Purchase Invoice.
- Journal line checks.
- AP and AR in base currency (`baseBalance`), with party views.
- Bank balances via `get_balance_on`.
- The 13 control-exception rules, with confidence and basis notes.
- The record detail: fields, child lines, attachments, approval trail and the same-user check.
- Every filter: company, period, document type, workflow state, approval status, waiting time and search.

**Fixed:**
- **Group view:** without a company it could not show balances, because `baseBalance` correctly refused the AED company. The view now covers system-currency companies, and a banner names the companies left out.
- **Failed exception checks:** a check that failed counted as 0. It now shows as unavailable.

**Layout:**
- **Toolbar:** standard.
- **Overview:**
  - Six cards: pending approvals, waiting more than 7 days, overdue supplier invoices, receivables, payables, and core control exceptions.
  - Actions pending sits beside approval status and payments against receipts by month.
  - Breakdowns: pending by document type, approved against rejected, payables and receivables, and the exceptions that were detected.
- **Tabs:** Approvals (workflow summary and queue), Payments, Journals (line-based flags), Payables, Receivables (invoice and party views, all open or posted in the period), Expense claims, Bank, Control exceptions (filter by severity and check), Actions pending.
- **Navigation:** every count opens its records, and every record opens its detail, with Back to return.

**Actions pending** (as of today, all dates):
- **High:** approvals waiting more than 7 days; unbalanced journals; payments and journals posted without approval.
- **Medium:** records returned or on hold; recent pending approvals and draft purchase invoices; overdue supplier invoices.
- **Low:** unallocated payments.

Category counts can overlap (for example, an aged approval that is also posted without approval), but each record appears once in the list.

**Tests:** `npm --prefix tools/erp run test:fic` runs 25 browser checks. The regression checks for `baseBalance` and `periodHits` still pass.
