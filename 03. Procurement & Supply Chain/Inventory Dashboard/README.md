# Inventory Dashboard

ERP Custom HTML Block: `Inventory Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## Local remediation

The editable HTML/CSS/JS now show native current Bin balances scoped through permitted warehouses and one company. No public iframe is used. Quantities remain separate by item/stock UOM. For historical stock valuation use native Stock Balance/Stock Ledger. `source.json` retains the original ERP iframe record for reference.

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit: toolbar, filters, browser tabs, actions pending, RTL, Desk dark mode, and layouts down to 320px.

It builds on the earlier local remediation above: native current Bin balances, permitted warehouses only, quantities kept per item and stock UOM, and no public iframe. Historical valuation stays in the native Stock Balance / Stock Ledger reports. **Read-only:** no writes.

**Data:** read with the user's own permissions through `frappe.client.get_list`. All fields were checked against the ERP map.
- **Bin:** actual, projected, reserved, ordered, requested, stock value, valuation rate.
- **Item:** name, group, stock UOM.
- **Item Reorder:** warehouse reorder level and quantity.
- **Stock Ledger Entry:** last non-cancelled movement per item and warehouse. It is shown as a window: within 30 days, 31–90, 91–180, 181–365, over a year, or never. The site rejects `max()` in `get_list` (see FM & Inventory v5), so five grouped `count()` queries per warehouse chunk place each balance in the first window where it moved.
- **Stock Entry:** drafts.
- **Warehouse:** non-group and enabled only.
- **Company.**

**One currency per view:** stock value covers the companies in the system currency. A banner names the companies left out; pick a company to see it on its own.

**Filters:** company, warehouse, item group, item search.

**Tabs:**
- **Overview:** stock value, items in stock, at or below reorder level, projected shortage, negative stock, slow-moving value.
  - Charts: value by warehouse, by last movement, by item group, and the highest-value balances.
- **Stock balances:** every item / warehouse balance with quick filters (in stock, negative, zero, reserved).
- **Reorder and shortages:** uses ERPNext's own rule (projected quantity at or below the warehouse reorder level).
  - Shows projected shortages, balances with and without a reorder level, the gap to the level, on-order quantity and requested quantity.
- **Slow-moving stock:** value by days since the last movement (0–30, 31–90, 91–180, 181–365, 365+, never), with the table.
- **Warehouses:** value, items, reorder, shortage and negative counts, and idle stock per warehouse. Selecting one filters the dashboard to it.
- **Actions pending:** five categories:
  - Negative stock.
  - Projected shortage.
  - At or below reorder level.
  - Draft stock entries.
  - No movement for 180+ days (highest value first).

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields.

**Test:** `npm --prefix tools/erp run test:inventory` (25 checks), with screenshots in `.local/qa/inventory/`.
