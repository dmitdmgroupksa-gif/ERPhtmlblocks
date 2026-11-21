# Operation Dashboard

ERP Custom HTML Block: `Operation Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v5 · moved onto the DM dashboard standard (19 Nov 2026)

v5 moves the v4 block onto the shared DM kit and keeps its data logic. v4 is in git history (commit `962142f`).

**Kept from v4:**
- **Sources:** Delivery Note, Delivery Trip and Delivery Stop, ForkLift and Forklift list, Material Request and its items, Work Order, Job Card, Daily Production Update, Factory Daily Production rows, Manufacturing Production Target, Bin, Stock Entry, Purchase Receipt, Warehouse and Company. Every DocType and field was checked against the ERP map.
- **Default view:** opens on Durar Masagh Trading Company for the last 14 days, as v4 did. Clear the company filter to see every company.
- **Rules:**
  - A delivery note needs a trip when it goes by DM or rented vehicle and is not on any Delivery Stop. Its age is counted in hours.
  - Forklift status is the latest log per forklift in the period.
  - Loaded, unloaded, expense and washing totals add the four vehicle types (trailer, dayana, pick up, container).
  - Idle time skips trips with missing, negative or over-12-hour intervals.
  - The work-order pipeline counts not-started and in-process orders for all dates, and the other statuses in the period.
- **Data to fix:** the ten v4 checks plus the forklift-in-workshop alert are now the Actions pending categories. Each one opens its full list, and every row links to the ERP record.
- **Panels:** every other v4 panel is still there, with the same meaning. v4's "Attention needed" panel (top unassigned delivery notes, overdue requests and stale work orders) is now part of Actions pending.
- **Daily targets:** still saved in this browser only, under the same storage key (`dmo_targets`), so targets set in v4 carry over. The Today panel shows each value as a share of its target.

**Changed:**
- **Shell:** the toolbar, period, filters (company and warehouse), tabs, tables (search, sort, CSV), dialogs, RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Currency:** v4 added `grand_total` across companies and currencies. v5 uses base amounts.
  - Without a company filter, value totals cover only companies whose currency is the system currency, and a banner names the companies left out.
  - Counts and quantities still include every company.
- **Completeness:** v4 stopped at 3,000 rows per list, and 1,000 for shortages, with a warning. v5 loads complete lists, up to 20,000. Beyond that it asks you to narrow the period instead of showing partial totals.
- **Time series:** charts follow the period: daily up to 45 days, then weekly, then monthly. v4 showed at most 31 days.
- **Charts:**
  - Donuts became ranked bars.
  - "Trips per driver per day" became the driver scoreboard plus "Trips per period".
  - "Planned vs produced by item" and "Operating cost by item" are tables.
- **Loading:** delivery, trips, forklift logs, requests, stale work orders, shortages and today counts load at start, as v4 prefetched them. Production and supply sources load when their tab opens.
- **Language:** every label is in English and Arabic.

**Test:** `npm --prefix tools/erp run test:operations`. It runs against a fixture covering every check in three companies (one in AED). Screenshots are saved in `.local/qa/operations`.
