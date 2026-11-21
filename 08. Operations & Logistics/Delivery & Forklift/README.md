# Delivery & Forklift

ERP Custom HTML Block: `Delivery Forklift Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [DM Delivery Forklift Dashboard API](server_scripts/dm_delivery_forklift_dashboard_d4c45abf.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v3 · moved onto the DM dashboard standard (19 Nov 2026)

v3 moves the v2 block onto the shared DM kit. v2 is in git history (commit `962142f`).

**Unchanged:** the Server Script API `dm_delivery_forklift_dashboard` (the copy in `server_scripts/`). Nothing needs deploying on the server side.

**Kept from v2:**
- **Permission model:** record and field permissions are checked on the server. A figure whose field you cannot read arrives as null and shows as a dash, never as zero. The banner names those fields and gives the reason a section is unavailable.
- **Counting rules:**
  - Submitted and draft records are kept apart.
  - The trip date is the delivery date, or the departure date when the delivery date is blank.
  - Timing averages use only pairs whose times are in order. Durations over 24 hours are kept and flagged.
  - Forklift operations are the eight loading and unloading counts.
- **Views:** the warehouse comparison (a trip counts under both its origin and its destination), the server's limitations notes, the undated forklift records with a link to their list, and the detail tables with every v2 flag filter.

**Changed:**
- **Shell:** the toolbar, period presets, filters (company, warehouse, driver, vehicle, trip type and forklift number, all from the API's `options` action), tabs, tables (search, sort, CSV), dialogs, RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
  - The generated language and theme scripts are replaced by the kit's.
- **Actions pending:** v2's "Records needing attention" lists are now eleven categories. Each opens its rows and links to the ERP record:
  - reversed trip times;
  - drafts marked Delivered;
  - invalid forklift counts;
  - trips without a driver;
  - forklift records with no activity;
  - missing forklift number;
  - missing origin, destination or trip type (one category each);
  - delivery and departure dates that differ;
  - repeated date and forklift.
- **Currency:** without a company filter, the recorded amount adds trips from every company. The banner names companies in another currency. Selecting a company gives a single-currency amount.

**Test:** `npm --prefix tools/erp run test:delivery-forklift`. The mock API returns a response in the server's shape, with aggregates that agree with its rows and one unavailable timing field. Screenshots are saved in `.local/qa/delivery-forklift`.
