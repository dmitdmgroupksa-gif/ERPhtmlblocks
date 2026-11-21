# Collector

ERP Custom HTML Block: `SOA Collector`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [soa_api](server_scripts/soa_api_cca237a6.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## Existing local working files

These files preserve the workspace versions and differ from the ERP snapshot above.

- [soa_collector_dashboard.js](local/soa_collector_dashboard.js)
- [soa_collector_dashboard.css](local/soa_collector_dashboard.css)

Shared local backend scripts are in [Shared Server Scripts](../Shared%20Server%20Scripts/README.md).

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt from the deployed ERP snapshot (`dashboard.js`); `local/` is left untouched. Built on the shared DM kit: toolbar, browser tabs, KPI cards, actions pending, RTL, Desk dark mode, and layouts down to 320px. There is no period selector, because the day chips choose the list.

**Backend unchanged.** The block calls `soa_api` with the same actions as v1:
- `coll_my`: the approved list for a day.
- `coll_remark`: the only write, a remark of up to 140 characters for the daily visit PDF.
- `coll_pdf`: the daily visit collection PDF.

The server's 3-day update window and list ownership checks still apply.

**What changed:**
- **"My day" overview:**
  - KPIs: to collect, collected (with share), left to visit, and the PDF download.
  - The largest amounts on the list, marked to visit or done; selecting one opens its card.
  - Recent days, due vs collected.
- **Actions pending:**
  - Customers still to visit, highest amount first.
  - Promised payments due today or earlier.
- **Visit list:** the same cards (call link, amounts, invoices, last update, result, remark) with To visit / Done / All and search. A remark shows a live character count.
- **Auto-refresh:** still every 5 minutes, and not while a remark is open.

**Deploy:** paste `dashboard.html` (it was empty before), `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields. No Server Script changes.

**Test:** `npm --prefix tools/erp run test:collector` (25 checks), with screenshots in `.local/qa/collector/`.
