# Logistics Dashboard

ERP Custom HTML Block: `Logistics Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v7 · moved onto the DM dashboard standard (19 Nov 2026)

v7 moves the v6 block onto the shared DM kit and keeps its data logic. v6 is in git history (commit `962142f`).

**Kept from v6:**
- **Sources:** Delivery Trip, Vehicle, Driver and Delivery Note counts, Vehicle Arabitra Logs, and Purchase Order, Material Request and Purchase Receipt. Every DocType and field was checked against the ERP map.
- **Trip rules:**
  - stage, the to-review list and delivery follow-up;
  - proof of receipt (receiver name, mobile, signature or stamp marked Yes);
  - duplicate departures and vehicle utilisation;
  - live-map phases: on the road (departed in the last 24 h, no site exit), upcoming, finished today.
- **Procurement rules:**
  - open, past-due and stale orders (over 30 days late);
  - PO flags: shipment, customs, documents and verification mismatches;
  - request flags;
  - request-to-order time from the Procurement Tracker report (last 90 days).
- **Loading:**
  - Trips load for the period plus a fixed window (30 days back, 14 ahead), with a cap of 10,000.
  - Procurement lists are capped at 5,000.
  - Optional custom fields fall back to core fields when your role cannot read them, and a banner says so.
- **Live map:** OpenStreetMap tiles, drag, zoom, fit, pins and trails.
  - Fixes older than 15 minutes are marked as old signal. A 0,0 fix is ignored.
  - Positions refresh every minute while the tab is open.

**Changed:**
- **Shell:** the toolbar, period (default: 7 days back to 7 ahead), filters, tabs, tables, dialogs, RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Tabs:**
  - The six v6 fleet tabs and the separate procurement view are now one set: Overview, Trips, Live map, Vehicles & drivers, Performance, Procurement and Actions pending.
  - "Awaiting submission" and "Delivery follow-up" are queues inside Trips.
  - The procurement views are sub-views inside Procurement.
- **Actions pending:** seven categories, each linking to its ERP record:
  - missing driver or vehicle;
  - timestamp errors;
  - delivery follow-up;
  - drafts awaiting submission;
  - orders needing action;
  - purchase requests;
  - stale orders.

  Trip categories cover the loaded window, not just the selected period.
- **Currency:** order values count only companies whose currency is the system currency. The banner names any company left out. Selecting a company shows that company in its own currency.
- **Details:** the trip detail opens as a kit dialog (`frappe.client.get`). Vehicles show their plate everywhere.
- **Language:** every label is in English and Arabic.

**Test:** `npm --prefix tools/erp run test:logistics`. It runs against a fixture: 19 trips covering every rule, tracker fixes, SAR and AED orders, and the report. Map tiles are served locally. Screenshots are saved in `.local/qa/logistics`.
