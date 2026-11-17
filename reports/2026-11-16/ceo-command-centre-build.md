# CEO Command Centre v2 — build, verification and deployment

Status: built locally and verified against live data through read-only calls. **Nothing has been deployed** to the ERP site.

## Delivered

| Item | File |
| --- | --- |
| Single read-only API (`ceo_command_center_api`) | `01. Leadership & Corporate/CEO Command Center/server_scripts/ceo_command_center_api.py` |
| Block HTML / CSS / JS | `01. Leadership & Corporate/CEO Command Center/dashboard.{html,css,js}` |
| v1 kept for comparison | `01. Leadership & Corporate/CEO Command Center/legacy/` |
| Tests | `tools/erp/tests/regression.cjs` (4 new CEO checks), `tools/erp/tests/ceo-command-center-browser.cjs` |

36 sources across 10 departments, plus a generic workflow adapter covering all 29 active workflows.

## Key rules implemented

- **My decisions** come from the document's current workflow state and the user's roles, not from Workflow Action records. Live data has stale "Open" Workflow Actions (for example about 24,600 Journal Entry and about 30,800 Quotation), so those records are unusable. A state counts as pending when it has an Approve / First Approve / Final Approval / Accept / Review / Resume transition and is not named Approved / Rejected / Closed / Lost / Cancelled. Self-approval blocks and transition conditions are respected or flagged.
- **Owners:** taken from the source's responsible field, then from ERP assignment (`_assign`); otherwise **Unassigned**. The record creator is never treated as the owner.
- **Backlog:** large old sets are bundled into one counted item that opens the filtered list (purchase requests and sales orders overdue more than 30 days, unallocated leads, DMS follow-ups by salesperson, stalled approvals with more than 25 rows). Original dates are unchanged.
- **Currency:** receivables and payables stay in party account currency, with no re-conversion (finding A01). Credit limits are compared only in company currency. Amount fields without a currency say "currency not recorded".
- **Stale statuses go to data checks, not actions:** 7,100+ Delivery Trips are still Scheduled / In Transit more than 7 days after departure, and 290 Vehicle Maintenance Schedules are still open after 30 days.
- **Fleet alignment:** only vehicles with status Active, and the same seven document-expiry fields as the Fleet dashboard.
- **Company filter:** applied only where the source has a Company link. Other sources are labelled "No company link".
- **DMCC:** connection state only. External figures are never added to ERP totals.

## Verification performed

- The API was compiled with RestrictedPython (the compiler behind Frappe's Server Script sandbox) and executed against the live site through read-only REST. All 36 sources returned. The only restricted source was SOA Workflow Request, which is a genuine permission limit on the test API user.
- Live issue found and fixed: this site rejects `min()` / `max()` in `get_list` fields ("Field not permitted in query"), so oldest dates are computed in Python.
- Reconciliation: receivables outstanding per company and currency matches an independent live sum to the cent (3 of 3 companies). Decisions match live workflow counts: 100 credit notes "Pending Approval by CEO" and 4 quotations "Review With CEO".
- Browser tests (Edge, shadow-root like the real block), all passing: desktop, 820 px Arabic RTL + dark, 390 px phone with no horizontal scroll, drawer, Escape and focus return, tab arrow keys, permission-error state, DMCC not-configured state.
- Timing caveat: through remote REST, the full overview took about 165 s (119 calls at about 1 s network latency each). On the server, each call is a local query, so expect roughly 5–15 s. **Measure this on the live site** before switching the workspace; if it exceeds the request timeout, split the overview into per-department calls (the API already supports this).

## Deployment checklist (requires your approval)

1. Create the Server Script: Script Type **API**, method `ceo_command_center_api`, paste `ceo_command_center_api.py`. Leave the nine v1 scripts enabled.
2. Confirm the CEO user has the role `CEO`. My decisions depends on it, and access also allows System Manager, IT Coordinator, `CEO Command Center Viewer` or `info@dmgroupksa.com`.
3. Call `/api/method/ceo_command_center_api?action=source_health` as the CEO user. Every source should be `complete`; anything restricted needs a role decision.
4. Update the `CEO Command Center` Custom HTML Block: HTML, Style and Script fields from the three files.
5. The `CEO Command Center` Workspace also contains the `CEO Inventory Dashboard`, `Delivery Forklift Dashboard` and `Manufacturing Dashboard` blocks. Decide whether they stay below the new centre or move to department workspaces.
6. Compare figures for two weeks against the v1 views and department dashboards.
7. Rollback: paste `legacy/dashboard.v1.*` back into the block. The v1 APIs remain until retirement.
8. Retirement (separate approval): disable the nine `ceo_command_center_*` v1 scripts and `ar_asof` after searching live Server Scripts and Custom HTML Blocks for other callers.

## Approvals tab (added)

How approvals are used today, from live read-only counts on 16 Nov 2026 for a user with CEO + Final Approver:

| Queue | Waiting | Notes |
| --- | --- | --- |
| Credit Note Request (Pending Approval by CEO) | 100 | Median 108 days waiting, longest 314. 54 have a zero difference value; the card falls back to the invoice value. Commonest reasons: material rejected (55), other (35), invoicing error (17). |
| Materials Service General Request (Final Approver) | 80 | 71 are vehicle requests; amounts are typed as text. |
| Leave Application (Final Approver) | 75 | 69 ended long ago (oldest 749 days), so they are shown as Stale. |
| Quotation (Review With CEO) / DM Letters / Loan Application | 4 / 4 / 2 | Very old: up to 1,379 days and 545 days. |

Result: 4 urgent, 9 high, 179 normal, 73 stale, and 67 routine requests eligible for bulk approval.

**Deployment:**
- Update the existing `ceo_command_center_api` Server Script and the block's Script and Style fields. No new script or role is needed.
- Before go-live, confirm which users hold **Final Approver** and **Executive Manager**: the inbox shows a user every step those roles can act on.
- Test one real approval on a non-critical document with the CEO account, then check the document's history.

## Open business decisions

- Policy thresholds (`POLICY` in the API): stalled 14 days; AR follow-up 60 days, escalation 120 days; AP escalation 90 days; expiry window 30 days.
- CEO Sales Target has no records, so Sales target attainment shows "Not set".
- The facility second rent schedule (`rental_start_date` / `2nd_rental_installment_date` / `3_rent_installment_dues_on`) is not read until you confirm which schedule is authoritative.
- Court Cases has no status, hearing-date or owner fields, so it can only be counted.
