# Payroll Cost Center

ERP Custom HTML Block: `Payroll cost center dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit: toolbar with period (default: first day of last month to today), searchable filters (company, cost center, branch, department, employee), browser tabs, actions pending, RTL, Desk dark mode, and layouts down to 320px. Still read-only, using the user's own `frappe.client.get_list`, `get_count`, `get` and `frappe.desk.reportview.get`. No Server Script.

**Kept unchanged from v1.** These run inside one closure; only their UI helpers (KPI, card, table, chart, dialog) are re-implemented on the kit:
- The payroll engine: salary slips, payroll-entry cost centers, draft vs submitted.
- Posted payroll expense: accrual-journal GL on Expense accounts.
- The Employee Checkin attendance engine: Friday/Saturday rules, holidays, half-days, Back Office and WFH exclusions.
- The leave engine: dedupe, balances, calendar.
- 12-month trends, the component reconciliation, the employee dialog (profile, payroll, attendance calendar, leave history) and all control checks.
- Translations.

**Fixes:**
- **Currency.** Without a company, figures now cover companies in the system currency, and other-currency companies are named in a banner. Before, every company's slips were added together and always labelled SAR. Choosing a company shows its own currency.
- **Overview:** six KPIs instead of thirteen: gross with per-head and net, posted GL expense, draft (not posted), month-on-month, absent today, pending leave. The rest stay on their tabs.

**New:**
- **Actions pending** from the control checks. Each row opens its record:
  - Draft slips.
  - Payroll entries with unsubmitted slips.
  - Duplicate slips.
  - Leave requests to decide (also a new Controls check).
  - Slips for non-active staff.
  - Slips without a payroll entry.
  - Approved leave not submitted.
- **Language:** follows the dashboard's own English/Arabic switch, like the other dashboards. v1 changed the user's ERP language and reloaded the page.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields.

**Test:** `npm --prefix tools/erp run test:payroll` (30 checks), with screenshots in `.local/qa/payroll/`. It mocks payroll, GL, check-ins and leave, plus the components join through `reportview.get`.
