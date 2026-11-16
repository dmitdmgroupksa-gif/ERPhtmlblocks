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
