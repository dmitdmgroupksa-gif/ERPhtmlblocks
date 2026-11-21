# Treasury Dashboard

ERP Custom HTML Block: `Treasury Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [Treasury Dashboard Data](server_scripts/treasury_dashboard_data_66d24f75.py) (API method `treasury_dashboard_data`; Accounts Manager, Treasury Manager or System Manager)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 redesign (17 Nov 2026)

Rebuilt on the DM dashboard standard, using the shared kit (`tools/erp/kit`), so it is no longer in the shell map.

**Deploy:** paste HTML ← `dashboard.html`, Style ← `dashboard.css`, Script ← `dashboard.js` (v1 had empty HTML and Style fields; all three are now needed). Update the Server Script `treasury_dashboard_data` from `server_scripts/treasury_dashboard_data_66d24f75.py`. That file also carries an earlier, separate fix that removed a tuple-unpacking assignment, which the live sandbox rejects.

### Server Script change: one currency per view

v1 added GL balances, receivables and payables from every company into one total and labelled it with the first company's currency, so an AED company was summed into SAR figures.

- **Group view:** now covers only companies whose default currency is the system currency. The others are returned in `other_currency_companies`, and the dashboard names them in a banner.
- **Selected company:** shown in its own currency.

Nothing else in the calculations changed. `tools/erp/tests/test_treasury_api.py` runs the real script against an in-memory ERP double.

### What it shows

- **Toolbar:**
  - **Period:** one range covers both sides of today. Days up to today show actual bank and cash movements (up to 90 days back); days after today show the forecast (up to 13 weeks). The default stays 30 days back and 30 days ahead.
  - **Filters:** company, and whether overdue customer receipts count as collectible today.
- **Overview:**
  - Six cards: cash and bank balance, lowest projected balance against the minimum buffer, expected receipts and planned payments for the next 7 days, open payables (with an aging bar), and next payroll.
  - Actions pending sits beside the projected-balance line (with the buffer) and the actual receipts-and-payments chart.
  - Breakdowns: payables by due date (each bucket opens the Payables tab), balance by bank, and balance by company.
  - The minimum buffer can still be edited from the projected-balance panel; the settings link is kept.
  - Server alerts can be acknowledged per browser, as before.
- **Tabs:**
  - **Bank & cash accounts:** select an account to open its General Ledger, as in v1.
  - **Cash flow:** actual and planned daily tables, with CSV export.
  - **Payables & payments:** bucket chips, suppliers by oldest due invoice (select one to see its invoices), and payroll and planned outflows, with the "+ Planned payment" link.
  - **Forecast:** the 13-week forecast, which the API already returned but v1 never showed, and this month by week.
- **Actions pending:**
  - **High:** overdue supplier invoices; planned payments past their date.
  - **Medium:** supplier invoices due in 7 days; approved, unpaid expense claims (loaded with `get_list` under the viewer's permissions); planned payments in the next 14 days.
  - **Low:** held invoices past their due date.
- **Removed:** the "restricted / blocked" figure, because the API always returns 0 for it.

### Tests

`npm --prefix tools/erp run test:treasury` runs 29 browser checks plus the server-script tests. Screenshots are saved to `.local/qa/treasury/`.
