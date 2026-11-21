# VAT & ZATCA Compliance

ERP Custom HTML Block: `VAT & ZATCA Command Center`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit (toolbar, period, filters, browser tabs, KPI cards, actions pending, drill-downs, RTL, Desk dark mode, responsive down to 320px). Still read-only, with no Server Script. It calls only `frappe.client.get_list`, `frappe.desk.query_report.run` ("DM KSA VAT Report") and `erpnext.accounts.utils.get_balance_on`, as the logged-in user. Access is still limited to System Manager, CEO, Internal Controller, Accounts Manager and Dashboard Manager.

**Kept unchanged from v1:**
- The VAT engine: the per-company DM KSA VAT Report cross-checked to Sales and Purchase Invoices, with reconciled, mismatch, not covered and error verdicts. Only reconciled companies are added to totals.
- ZATCA status counts, all-dates ageing, timestamps, exception presets and the on-demand 15% rate scan.
- The withholding-tax ledger model: accounts discovered at run time, the GL roll-forward checked against `get_balance_on`, paid vs adjustment classification and the supplier split.
- All translations.

**What changed:**
- **Seven tabs:** Overview, VAT returns, ZATCA status, Invoice register, Compliance, Withholding tax and Actions pending. The withholding-tax tab follows the dashboard's company filter and period (up to today) instead of its own filters.
- **Currency scope (fix):** without a company, the view covers system-currency companies only; it used to add every company's base amounts together. Other-currency companies are named in a banner, and choosing one shows it in its own currency. A VAT group filter (shared tax ID) replaces the old group selector.
- **Actions pending:** 9 categories, each linking to its records.
  - Companies whose VAT does not reconcile (links to the report).
  - Rejected or overdue invoices.
  - Missing UUID.
  - Credit notes not accepted.
  - Never transmitted (Draft).
  - Pending at ZATCA.
  - Taxable invoices with zero VAT.
  - Credit notes without an original invoice.
  - Missing buyer VAT number.
  
  Backlog categories cover all dates; the others follow the period.
- **VAT Summary Forms** for the period now appear under Compliance as filing evidence. v1 loaded them but never showed them. They are labelled as computation records, not proof of filing.
- **Compare with the previous period** now uses the whole previous month or quarter.
- **Monthly VAT trend** shows at least the six months ending with the period.
- **Drill-downs:** status cards, the company matrix and the exception cards open paged server lists with search and CSV export, plus a link to the filtered ERPNext list.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields. No Server Script changes.

**Test:** `npm --prefix tools/erp run test:vat` (36 checks; fixture-backed, screenshots in `.local/qa/vat-zatca/`).
