# Admin & HR Platform

ERP Custom HTML Block: `Admin & HR Platforms Expiry Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 · moved onto the DM dashboard standard (19 Nov 2026)

v2 moves v1 (the Admin & HR Platforms Expiry Dashboard) onto the shared DM kit. v1 is in git history (commit `962142f`). The block stays client-side and read-only, and uses permission-checked `get_list` and `get_count` only.

**Kept from v1:**
- **Sources:** the four sources and the fields read from each:
  - DM Companies Management;
  - DM Facilities Management;
  - Employee;
  - IT Renewals Subscription.
- **Items:** one item per document expiry field.
- **Status buckets:** expired, 0–7, 8–30, 31–60, 61–90, more than 90 days, and not recorded.
- **Missing:** only required slots count as missing:
  - CR and National Address for every company that isn't cancelled;
  - MISA for parent companies;
  - Iqama, passport, medical insurance and contract for Active employees.
- **Inactive records:** hidden unless the filter includes them. These are cancelled CRs, employees who aren't Active, Closed facility contracts and cancelled renewals.
- **Double counting:** a lease end equal to the rent date is counted once.
- **Also kept:** the platform coverage check, the company summary, the priority list, and every label in the v1 EN/AR dictionary (reused as is).

**Changed:**
- **Shell:** the toolbar, filters, tabs, tables (search, sort, paging, CSV), detail and list overlays, RTL, dark mode and layout down to 320 px come from the kit.
  - The period control is hidden, because status is as of today. Expiry from and to are date filters.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Loading:** each source loads and fails on its own. A permission error names the source, and the other sources still count.
- **Actions pending:** each row links to its record.
  - High: expired items, and items expiring within 7 days.
  - Medium: items expiring in 8–30 days.
  - Low: required expiry dates that are not recorded.

**Test:** `npm --prefix tools/erp run test:hr-platforms`. Screenshots are saved in `.local/qa/hr-platforms`.
