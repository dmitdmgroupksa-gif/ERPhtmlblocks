# CEO Command Center (v2 · decision & escalation centre)

ERP Custom HTML Block: `CEO Command Center` · Workspace: `CEO Command Center`

- [JavaScript](dashboard.js) · [CSS](dashboard.css) · [HTML](dashboard.html) · [Original record](source.json)
- Single API: [ceo_command_center_api](server_scripts/ceo_command_center_api.py) (Server Script, type API, method `ceo_command_center_api`)
- Approved plan: [ceo-command-centre-plan.md](../../reports/2026-11-16/ceo-command-centre-plan.md) · Build and deployment notes: [ceo-command-centre-build.md](../../reports/2026-11-16/ceo-command-centre-build.md)

## What it shows

Top tabs: Overview · Sales · Procurement · Finance · People & Admin · Projects · Operations · Manufacturing · IT & Assets · Legal & Compliance · DMCC.

Every action carries what / who / when / impact / next step, and is in one of four groups: **My decisions** (documents where your role has a permitted workflow transition), **Escalations**, **Department follow-up**, **Data verification**. Department tabs have Actions · Performance · Upcoming · Data checks. Clicking a row opens a detail drawer with the original ERP record.

Read-only. Approvals happen in the original ERP form.

## API actions

| Action | Returns |
| --- | --- |
| `bootstrap` | Companies, departments, dashboard links, policy |
| `overview` | Attention counts, top 12 per group, department matrix, upcoming commitments, company pulse, source health |
| `department` | All actions for one department (up to 1,500), indicators, performance, upcoming, data checks |
| `actions` | Paginated, filtered queue (`group`, `severity`, `q`, `page`, `page_size`) |
| `drilldown` | Assignment, open ToDos, created/modified, related links for one record |
| `source_health` | Per-source state: complete / partial / restricted / not configured / unavailable |

Policy thresholds (stalled 14 days, receivables follow-up 60 / escalation 120 days, bundle above 25 rows, 30-day expiry window) are in `POLICY` at the top of the API and are shown in the dashboard footnote.

## Legacy

`legacy/dashboard.v1.*` and the nine `ceo_command_center_*` scripts (collections, finance_details, legal_taradhi, procurement, receivables, sales, sales_backlog, sales_orders, sales_support) are v1. No other dashboard in this repository calls them. Retire them on the live site only after the v2 comparison period and a live search of Server Scripts for other callers.

## Tests

`npm --prefix tools/erp test` (static checks incl. single-API, read-only, no min()/max() aggregates) and `npm --prefix tools/erp run test:ceo` (browser: tabs, drawer, keyboard, RTL, phone width, restricted/not-configured states).
