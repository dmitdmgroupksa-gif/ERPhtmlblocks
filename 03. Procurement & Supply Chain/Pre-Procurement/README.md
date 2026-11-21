# Pre-Procurement

ERP Custom HTML Block: `Pre-Procurement Command Center`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit: toolbar, period (default year to date), filters, browser tabs, actions pending, RTL, Desk dark mode, and layouts down to 320px. It replaces the v1 page that relied on the generated shell. **Read-only:** no writes.

**Data:** these DocTypes, read with the user's own permissions through `frappe.client.get_list` / `frappe.client.get`. All fields are checked against the ERP map.
- **Material Request**, kept as in v1: purpose Purchase, not cancelled, workflow state not Closed. Fields: `material_request_type`, `workflow_state`, `transaction_date`, `schedule_date`, `company`, `per_ordered`, `per_received`, `status`.
- **Purchase Order:** `supplier`, `supplier_name`, `status`, `transaction_date`, `schedule_date`, `grand_total`, `base_grand_total`, `currency`, `per_received`, `per_billed`, `company`.
- **Supplier:** `supplier_name`, `supplier_group`, `disabled`.
- **Company:** `default_currency`.

**One currency per view (fixed vs v1):** v1 added `base_grand_total` across every company, mixing currencies.
- By default, values cover the companies in the system currency, and a banner names the companies left out.
- Pick a company in Filters to see it on its own, in its own currency.
- A foreign-currency order shows its own amount and its company-currency amount.

**Overdue (v1 rules):**
- A material request is overdue when it is open (pending or partially ordered) and its required-by date has passed.
- A purchase order is overdue when it is awaiting receipt, its required-by date has passed, and it is not fully received.

The period filters by issue date; a note gives the oldest overdue required-by date.

**Tabs:**
- **Overview:** open and overdue MRs and POs, PO value, fully received share, issued per month, open MR aging, POs by status and top suppliers.
- **Material requests:** the v1 cards (all, draft, open, overdue, fully ordered, stopped) work as table filters, together with status and aging bars. The table shows ordered and received progress.
- **Purchase orders:** v1 cards plus submitted value, status bars and value per month. The table shows received and billed progress and amounts.
- **Suppliers and delays:** engaged, with overdue POs and active. Also top suppliers by value and suppliers with overdue POs. Selecting a supplier lists its POs.
- **Every document:** opens a drill with its items, as in v1's drawer.
- **Actions pending:** five categories, each with "Open all in ERPNext". They cover every open document in the company scope, whatever the period:
  - Overdue deliveries.
  - Overdue material requests.
  - Draft material requests.
  - Draft purchase orders.
  - POs on hold.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields.

**Test:** `npm --prefix tools/erp run test:pre-procurement` (29 checks), with screenshots in `.local/qa/pre-procurement/`.

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.
