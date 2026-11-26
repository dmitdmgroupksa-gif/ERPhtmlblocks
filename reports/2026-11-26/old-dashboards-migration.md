# Old number-card dashboards → new dashboards (26 Nov 2026)

Nothing old has been hidden or deleted. Each old workspace keeps working until you approve retiring it.

## Where each old dashboard now lives

| Old workspace | New home | Where | Could open old | Can open new | Would lose access |
|---|---|---|---:|---:|---|
| Sales Comparison Reports | CEO Command Centre v2 | Insights tab (CEO). Operational parts also in Quotation & SO tracker, Pre-Procurement, Inventory, Finance Internal Controller, Daily Tasks & Visits, Admin HR | 10 | 2 | accounts@, afroz@, dmit.dmgroupksa@, emarketing.01@, erp@, itadmin@, nakwa.talha@, reminders@ |
| Quotation Team Dashboard | Quotation & SO tracker | Sales Operations tab | 13 | 15 | — |
| Management Insights | CEO Command Centre v2 | Management Insights tab (CEO only) | 9 | 2 | accounts@, dmit.dmgroupksa@, emarketing.01@, erp@, itadmin@, nakwa.talha@, reminders@ |
| Payments & Collections | CEO Command Centre v2 | Management Insights tab (CEO only) | 2 | 2 | — |
| HR Dashboard | Admin HR Dashboard | Overview / Employees / Attendance / Leave tabs | 13 | 12 | afroz@, ic@ |
| Management Reports | CEO Command Centre v2 | Reports tab (CEO only) | 9 | 2 | accounts@, dmit.dmgroupksa@, emarketing.01@, erp@, itadmin@, nakwa.talha@, reminders@ |
| Dispatch & Logistics | Logistics Dashboard | Forms & reports tab | 12 | 13 | — |
| Attendance Dashboard | Admin HR Dashboard | Attendance tab: absent by department / location | 10 | 12 | afroz@ |
| Purchase Dashboard | Pre-Procurement Command Center | Purchasing status tab | 10 | 11 | — |
| Sales Operation | Quotation & SO tracker | Sales Operations tab | 10 | 15 | — |
| Task Dashboard | Daily Tasks & Visits | whole dashboard (scope by role on the server) | 10 | 24 | — |
| Stock Dashboard | Inventory Dashboard | Stock movements tab | 10 | 11 | — |
| Accounts Dashboard | Finance Internal Controller | Entry status tab | 10 | 7 | erp@, itadmin@, nakwa.talha@, reminders@ |
| AR Dashboard | CEO Command Centre v2 | Management Insights tab (CEO only) | 9 | 2 | accounts@, dmit.dmgroupksa@, emarketing.01@, erp@, itadmin@, nakwa.talha@, reminders@ |
| Sales Person Dashboard | My Sales | whole dashboard (own figures / own department on the server) | 34 | 36 | accounts@, nakwa.talha@, reminders@ |
| CRM Dashboard | Lead Management | CRM pipeline tab | 2 | 13 | — |

Counts are enabled system users. "Can open new" requires the new workspace role and, for CEO-only tabs and Admin HR, the role the API checks.

## How data is protected

- **My Sales** and **Daily Tasks & Visits** read through server APIs that decide the scope from the logged-in user: own figures for a salesperson / employee, own department for managers (Sales Manager, Section Manager; Line Manager for tasks), everything for CEO / Executive Manager / Sales Master Manager / Finance Manager (My Sales) or CEO / ED - Afroze (tasks). A salesperson picked in the filter can only narrow the scope; outside it the API refuses.
- **Management Insights / Reports** (company-wide money): CEO and Finance Manager only, checked again by `ceo_management_insights`.
- **Live-card tabs** (Purchasing status, Stock movements, Entry status, CRM pipeline, Sales Operations) count with the old cards' own filters under each viewer's ERP permissions, so nobody sees more than ERP already allows them.
- The DMS kit now supports `roles` on a tab (hidden for other users); the server always checks again.

## Decisions needed before retiring the old workspaces

1. **ED – Afroze (afroz@) and Comparison report users** lose the company sales comparison (YTD, locations vs target) that *Sales Comparison Reports* showed. Allow them in Management Insights, or keep it CEO / Finance only?
2. **IT Coordinator accounts** (accounts@, emarketing.01@, erp@, itadmin@, nakwa.talha@, reminders@) could open Management Insights, Management Reports, AR and Accounts dashboards. Under the new rule they lose company money and entry counts. Confirm that is intended.
3. **HR Manager without Admin HR access** (afroz@, ic@): add HR Manager to the Admin HR Dashboard workspace (same open question as the HR Dash Board retirement).

## Not carried over one-to-one

- Report-based cards (location "Achieved", YTD %, cash / credit sales, collection analysis) are recalculated from ERP data in Management Insights and My Sales instead of the old hard-coded reports (fixed 250M target, name exclusion lists). Differences are explained on the page.
- CRM report cards (submittals, approvals, expected revenue) are links to their reports in the CRM pipeline tab.
- *Sales Staff Absent Today* has no reliable rule (the old report listed names); absent today is shown by department / location and Saudi split.
- Approval cards in Sales Comparison (CEO / Afroze approvals, material approvals, IT / renewal / incentive requests) are covered by the CEO approvals inbox and the Executive Secretary approvals tab.

## New in ERP (all reversible)

- Server Scripts: My Sales Dashboard API, CEO Management Insights API, Daily Tasks Dashboard API.
- Custom HTML Blocks: My Sales Dashboard, Daily Tasks & Visits Dashboard. Updated: Test ceo command centre v2, Sales CRM & Conversion Tracker Dashboard, Pre-Procurement Command Center, Inventory Dashboard, Finance internal controller, Lead Management Dashboard, Admin HR Dashboard, Logistics Dashboard (backups in `.local/erp_backups/`).
- Workspaces: My Sales, Daily Tasks & Visits, CEO Command Centre v2 (review), Finance Internal Controller. Roles added: Quotation & SO tracker (Quotation Team, ED - Afroze, CEO), Pre-Procurement (CEO, ED - Afroze), Inventory (CEO, ED - Afroze, IT Coordinator), Lead Management (CEO), Logistics (Warehouse Manager, CEO).
