# DMCC Dashboard

ERP Custom HTML Block: `DMCC Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## Server connection

Install [DMCC Integration Settings](dmcc_integration_settings.json) as a Single custom DocType, configure its Password field, then install [dmcc_dashboard_proxy](server_scripts/dmcc_dashboard_proxy.py) as an API Server Script. Keep the key off the Custom HTML Block. The external owner must rotate the previously exposed key, including copies retained in old Git history. The browser now calls the same-origin proxy.
