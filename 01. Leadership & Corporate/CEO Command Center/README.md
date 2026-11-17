# CEO Command Center (v2 · decision & escalation centre)

ERP Custom HTML Block: `CEO Command Center` · Workspace: `CEO Command Center`

- [JavaScript](dashboard.js) · [CSS](dashboard.css) · [HTML](dashboard.html) · [Original record](source.json)
- Single API: [ceo_command_center_api](server_scripts/ceo_command_center_api.py) (Server Script, type API, method `ceo_command_center_api`)
- Approved plan: [ceo-command-centre-plan.md](../../reports/2026-11-16/ceo-command-centre-plan.md) · Build and deployment notes: [ceo-command-centre-build.md](../../reports/2026-11-16/ceo-command-centre-build.md)

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
