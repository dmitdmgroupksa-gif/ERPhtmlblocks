# Accounts Payable

ERP Custom HTML Block: `Accounts Payable Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 redesign (17 Nov 2026)

Rebuilt on the DM dashboard standard, using the shared kit (`tools/erp/kit`), so it is no longer in the shell map.

**Deploy:** paste HTML ← `dashboard.html`, Style ← `dashboard.css`, Script ← `dashboard.js`. The root element changed, so all three are needed. No Server Script.

**Kept from v1:**
- Balances and ageing from the native **Accounts Payable** report (due-date ageing, as of the period end, capped at today), reconciled against **Accounts Payable Summary**.
- Purchase Invoice and Payment Entry activity.
- Supplier attributes: group, local/foreign, intercompany.
- The supplier panel.
- The exceptions engine, with editable rule parameters.
- `invoiceBalance`, the party-currency conversion that the regression suite tests.

**Fixed:** with no company selected, v1 added every company's payables together, including the AED company's report figures, and labelled the total SAR. The group view now covers only companies in the system currency, and a banner names the companies left out. Picking a company shows it in its own currency.

**Layout:**
- **Toolbar:** language, refresh, filters, period and pending count.
  - **Filters:** company, supplier, supplier group, local/foreign and text search.
- **Overview:**
  - Six cards: total payables, overdue, due in 7 days, advances and credits, invoices posted and payments made in the period. The last two have 12-month sparklines.
  - Actions pending sits beside the ageing chart (each bucket opens its documents) and the invoices-vs-payments chart by month.
  - Breakdowns: top suppliers (overdue against not yet due), payables by company (select one to filter), and overdue by supplier group.
- **Tabs:** Suppliers · Ageing (with both reconciliation checks) · Purchase invoices (server-paged, with status, due-date and posted-in-period chips) · Payments (approval-workflow counts, payment history) · Exceptions · Actions pending.

**Actions pending:**
- **High:** balances overdue more than 90 days; supplier payments awaiting approval.
- **Medium:** items due in 7 days; overdue 1–90 days; unallocated payments older than the rule.
- **Low:** unallocated payments within the rule; invoices with a missing or questionable due date.

**Tests:** `npm --prefix tools/erp run test:ap` runs 28 browser checks. Screenshots are saved to `.local/qa/accounts-payable/`.
