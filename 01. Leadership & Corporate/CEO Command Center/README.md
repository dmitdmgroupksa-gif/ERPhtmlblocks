# CEO Command Center (v3 · decision & escalation centre)

ERP Custom HTML Block: `CEO Command Center` · Workspace: `CEO Command Center`

- [JavaScript](dashboard.js) · [CSS](dashboard.css) · [HTML](dashboard.html) · [Original record](source.json)
- Single API: [ceo_command_center_api](server_scripts/ceo_command_center_api.py) (Server Script, type API, method `ceo_command_center_api`)
- Approved plan: [ceo-command-centre-plan.md](../../reports/2026-11-16/ceo-command-centre-plan.md) · Build and deployment notes: [ceo-command-centre-build.md](../../reports/2026-11-16/ceo-command-centre-build.md)
- v3 redesign, verification and loading comparison: [delivery report](../../reports/2026-11-17/ceo-command-centre-redesign.md).

## v3 interface and loading

Compact toolbar, browser-style tabs, five overview indicators, action rows, department matrix and an approvals inbox. The block adapts to its own container width; phones use two-column indicators and full-width detail drawers. Touch toolbar/tab controls are at least 44px high. Core controls support English, Arabic/RTL, keyboard navigation, Desk dark mode and reduced motion.

Bootstrap and the first view load in parallel. Last results are cached per viewer and filter scope for the same site day, for at most 12 hours, while a fresh request runs. Saved approvals stay disabled until refreshed. Refresh failures retain the visible data. Switching users clears the previous viewer's indexed cache. These are browser convenience caches; ERP permissions and native workflow checks remain authoritative.

Approvals prefetch after Overview; department tabs prefetch on hover, focus or touch. “View all” fetches 100 actions and displays four local pages of 25 rows. Queue requests discard late results after a newer search, filter or page request. A refresh reloads the full queue while preserving the active search. The approval-document total and department workflow-action count have separate labels because they cover different populations.

The API does not supply historical snapshots for the attention counts, so no invented sparklines or deltas are displayed. Company currencies remain separate.

## Department Performance tabs (17 Nov 2026)

Each department's **Performance** section leads with what that department's own dashboard leads with, read live through the API:

- **Headline cards:** one per reconciled measure (Sales: invoiced and booked; Procurement: open commitments and receipts; Finance: cash and bank, receivables outstanding, overdue receivables and receipts), summed within a currency only.
- **Two source cards per department:** record count, value in each company currency (largest first), status split as a donut with a ranked legend, and value (or count) by month for the period.

| Department | Sources |
| --- | --- |
| Sales | Quotation pipeline (quoted value by workflow state) · Sales orders booked |
| Procurement | Purchase orders placed · Goods received |
| Finance | Customer invoices (incl. Overdue value) · Supplier invoices |
| People & Admin | Workforce snapshot · Leave applications |
| Projects | Technical submittals · Project tasks |
| Operations | Delivery trips · Fleet availability snapshot |
| Manufacturing | Work orders · Factory job orders |
| IT & Assets | Help-desk requests · Asset requests |
| Legal & Compliance | Legal cases · Controlled documents |
| DMCC | Invoices (billed value), quotations and projects through the existing `dmcc_dashboard_proxy`; external and never added to ERP totals |

- **API cost:** `executive_performance` in the API uses grouped `count` / `sum` aggregates, with no row downloads and no row cap. Date columns use one daily-grouped query per currency; datetime columns use one aggregate per month. It runs only for the `department` action, never for Overview.
- **Data rules:** Drafts and cancelled documents are excluded where the source is submittable. Missing fields show as *Not configured*, and permission errors as *Restricted*, never as zero.

**Deploy:** this feature changes the Server Script. Update `ceo_command_center_api` with [server_scripts/ceo_command_center_api.py](server_scripts/ceo_command_center_api.py), and the block's Script and Style fields with `dashboard.js` and `dashboard.css`. The API change also carries the earlier fix that removed tuple-unpacking assignments, which the live sandbox rejects.

## What it shows

Top tabs: Overview · Sales · Procurement · Finance · People & Admin · Projects · Operations · Manufacturing · IT & Assets · Legal & Compliance · DMCC.

Every action carries what / who / when / impact / next step, and is in one of four groups: **My decisions** (documents where your role has a permitted workflow transition), **Escalations**, **Department follow-up**, **Data verification**. Department tabs have Actions · Performance · Upcoming · Data checks. Clicking a row opens a detail drawer with the original ERP record.

### Approvals tab

An inbox of every document waiting at a workflow step the viewer's roles can act on, for example CEO, Final Approver or Executive Manager.

- **Categories:** Money & credit, Sales & pricing, People & HR, Requests & admin.
- **Rule-based priority, each with a visible reason:**
  - **Urgent:** deadline within 3 days, already in progress, or value ≥ 50,000.
  - **High:** deadline within 14 days, or value ≥ 10,000.
  - **Normal:** everything else.
  - **Stale:** the dates have already passed, for example leave that has ended or an event that is over.
  - **Routine:** small requests under 1,000. Waiting time is shown and used for sorting, but never raises priority on its own.
- **Each card shows** the requester, dates, amount, reasons (such as "Material rejected") and key facts.
- **Details drawer:** all filled fields, item tables and recent comments.
- **Sorting:** by priority, deadline, waiting time, value or document type.

Approve, Reject and Hold call Frappe's native `frappe.model.workflow.apply_workflow`, the same call as the form button. The ERP enforces roles, transition conditions and self-approval, and records each decision in the document history.

- Reject requires a reason. The reason is saved as a comment before the rejection is applied, and if it can't be saved, nothing is rejected.
- Bulk approval only covers items with no amount or under 10,000, never urgent ones, and asks for confirmation.
- Thresholds are in `APPROVAL_POLICY` in the API.

The other tabs remain read-only.

## API actions

| Action | Returns |
| --- | --- |
| `bootstrap` | Companies, departments, dashboard links, policy |
| `overview` | Attention counts, top 12 per group, department matrix, upcoming commitments, company pulse, source health |
| `department` | All actions for one department (up to 1,500), indicators, performance, upcoming, data checks |
| `actions` | Paginated, filtered queue (`group`, `severity`, `q`, `page`, `page_size`) |
| `drilldown` | Assignment, open ToDos, created/modified, related links for one record |
| `approvals` | Decision inbox: items, priority with reasons, categories, summary |
| `approval_detail` | Full field list, item tables and recent comments for one document (read permission checked) |
| `source_health` | Per-source state: complete / partial / restricted / not configured / unavailable |

Policy thresholds (stalled 14 days, receivables follow-up 60 / escalation 120 days, bundle above 25 rows, 30-day expiry window) are in `POLICY` at the top of the API and are shown in the dashboard footnote.

## Legacy

`legacy/dashboard.v1.*` and the nine `ceo_command_center_*` scripts (collections, finance_details, legal_taradhi, procurement, receivables, sales, sales_backlog, sales_orders, sales_support) are v1. No other dashboard in this repository calls them. Retire them on the live site only after the v2 comparison period and a live search of Server Scripts for other callers.

## Tests

`npm --prefix tools/erp test` (static checks incl. single-API, read-only, no min()/max() aggregates) and `npm --prefix tools/erp run test:ceo` (browser: tabs, drawer, keyboard, RTL, phone width, restricted/not-configured states).

`npm --prefix tools/erp run bench:ceo` measures the real frontend with a synthetic API and simulated latency. Pass an alternate dashboard directory after `--` to compare versions. This is not a live-site speed measurement. Browser screenshots are generated in `.local/qa/ceo/` (ignored by Git).
