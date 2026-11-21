# Manufacturing Dashboard

ERP Custom HTML Block: `Manufacturing Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [Manufacturing Dashboard API - Jobs](server_scripts/mfg_dashboard_jobs_c93388e0.py)
- [Manufacturing Dashboard API - Performance](server_scripts/mfg_dashboard_performance_edb25d32.py)
- [Manufacturing Dashboard API - Plan](server_scripts/mfg_dashboard_plan_43d778d0.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v3 · moved onto the DM dashboard standard (19 Nov 2026)

v3 moves the v2 block onto the shared DM kit. v2 is in git history (commit `962142f`).

**Unchanged:** the three Server Script APIs in `server_scripts/`: `mfg_dashboard_performance`, `mfg_dashboard_jobs` and `mfg_dashboard_plan`. Nothing needs deploying.

**Kept from v2:**
- **Production cost:** the total value difference of submitted Manufacture stock entries in confirmed factory warehouses. Negative differences are kept.
- **Output:** shown per unit and never added across units. The unit with the largest quantity is shown first.
- **Material cost:** with the additional costs shown beside it.
- **Labour / process cost:** from Factory Daily Production, with approved and unapproved amounts kept apart.
- **Cost against target:** including partial-coverage warnings.
- **Per-employee labour:** earnings, check-in hours, overtime and flags, plus the reconciliation with the labour card.
- **Jobs lists:** active, pending, carryover and schedule review.
- **Daily production plan:** scheduled rows, carryover with ageing, schedule review and drafts.
- **Details:** the "details and definitions" text and the administrator diagnostics.

**Changed:**
- **Shell:** the toolbar, filters (company and factory), tabs, tables (search, sort, CSV), RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
  - The generated language and theme scripts are replaced by the kit's.
- **Period:** the kit period (default: today, as v2's Daily) is sent to the performance and jobs APIs as a custom range. The 367-day server limit still applies.
- **Jobs dates:** the jobs dates follow the period. v2's separate jobs date pickers are dropped.
- **Plan dates:** Today, Tomorrow (the default, as v2), Next 7 days, or the same as the period.
- **Actions pending:** five categories built from the API data:
  - job orders past their end date;
  - schedules to review;
  - negative production cost entries;
  - output to classify;
  - employees with incomplete check-in days.
- **Charts:** the category charts are ranked bars. Negative cost categories are shown in amber.
- **Language:** every label is in English and Arabic.

**Test:** `npm --prefix tools/erp run test:manufacturing`. The mocks return the three API shapes with figures that reconcile. Screenshots are saved in `.local/qa/manufacturing`.
