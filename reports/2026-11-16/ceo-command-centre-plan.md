# CEO Command Centre redesign — approval draft

Status: plan only. No implementation, API merge, deployment, or live ERP change is authorized by this document until the user approves the direction.

## 1. Intended outcome

The CEO should be able to answer, in order:

1. What requires my decision?
2. What is overdue, blocked, financially exposed, or about to interrupt operations?
3. Which manager owns the next action, and by when?
4. What must happen in the next seven days?
5. How is each department performing, and can I trust its figures?

The existing departmental dashboards remain the places for detailed execution. The Command Centre combines their most important exceptions and links to the original record or department dashboard with matching scope.

## 2. Source scope and coverage

Use the implemented HTML dashboard inventory, the ERP map extracted on 13 November 2026, the live read-only reconciliation already performed, and a fresh effective-schema check during implementation. Do not copy native Workspace cards just because they already display a number. Their definitions must first match the CEO metric dictionary.

| Top tab | Existing dashboard coverage | Main CEO content |
| --- | --- | --- |
| Overview | All departments; CEO Agent as contextual assistance | My decisions, critical issues, ownerless items, upcoming obligations, department action health |
| Sales | My Leads; Lead Management; DMS Sales Management; Sales CRM & Conversion Tracker; Digital Marketing | Unallocated leads, overdue follow-ups, stalled opportunities/quotations, sales-order blockers, missing marketing attribution |
| Procurement | Pre-Procurement; DN & GRN Tracker; Customs & Post-Procurement | Overdue requests/orders, short receipts, shipments stuck in customs, missing clearance/shipping documents, supplier commitments |
| Finance | Accounts Payable; Treasury; Payroll Cost Center; VAT & ZATCA; Credit Controller; six Blocked Customer cards; SOA Request/Manager/Collector; Finance Manager; Internal Controller | Cash shortfall, overdue receivables/payables, credit breaches, collections due, approval queues, failed SOAs, finance-control exceptions |
| People & Admin | Admin HR; Admin & HR Platforms; Employee Dashboard; Employee Vacation; Government Relations; Executive Secretary | Pending employee/admin requests, return/re-entry exceptions, workforce coverage, rent obligations, corporate/facility renewals, letters/memos awaiting action |
| Projects | Technical Department; DMS Technical Department; My DMS Projects; DM Contracting | Submittals due/returned, approvals blocking delivery, project follow-ups, unassigned personnel requests, contract milestones/payment blockers where source fields support them |
| Operations | Fleet; Logistics; Delivery & Forklift; Operation; Scaffolding Rental | Breakdowns/safety issues, overdue maintenance, incomplete deliveries, missing delivery evidence, idle assets, rental returns and execution blockers |
| Manufacturing | Manufacturing Dashboard; Production Dashboard | Overdue work/job orders, blocked production, missing targets, item/UOM-based attainment, production cost and reporting exceptions |
| IT & Assets | IT Asset Acquisition; IT Platforms Expiry; ERP User Access; Plant & Furniture Asset; relevant FM/Inventory asset information | Unresolved critical IT requests, due renewals, acquisition/repair queues, unreturned/unassigned assets, access-review exceptions backed by an actual rule |
| Legal & Compliance | Taradhi/Legal; Document Control; compliance views from Government Relations, HR platforms, VAT/ZATCA and IT renewals | Court sessions, case commitments, overdue case payments, expired critical documents, required signatures/filing, compliance deadlines |
| DMCC | External DMCC dashboard and approved server proxy | External approvals/overdue invoices/projects/rental commitments only after entity/field/status mapping is verified |

Inventory/stock exceptions feed Procurement, Operations and Manufacturing as appropriate; they are not counted as three independent issues. FM & Inventory supplies the relevant facilities, asset and stock lanes. Durar Messenger and Durar Sheets are supporting context links, not arbitrary company-performance metrics. No private chat/spreadsheet content is pulled into the CEO overview merely because a connector exists. CEO Agent is an optional contextual panel, not a mandatory navigation tab or an unverified source of figures.

## 3. Detailed action content

### Overview

- **My decisions:** only documents for which the current user actually has a permitted next workflow action. A department's pending count is not automatically a CEO approval count.
- **Critical now:** safety/operational stoppages, unresolved expired critical compliance, imminent cash funding shortfalls, and high-priority overdue blockers under explicit rules.
- **Unowned actions:** a verified pending action without an assigned responsible person. Record creator is not silently treated as owner.
- **Next seven days:** payment obligations, case sessions, renewals, planned deliveries and other dated commitments. Overdue items remain visible independently of the selected performance period.
- **Department health:** actionable counts, oldest open action and missing-data state for each department; no giant wall of unrelated KPIs.

### Sales

- Leads Generation List without a valid active Lead Allocation, with duplicate allocations flagged separately.
- Lead Allocation follow-ups past `next_follow_up`, respecting the real status/outcome combinations and responsible `assigned_user`/`sales_person` links.
- DMS Project follow-ups past `next_follow_up_date`; unallocated projects; stalled stage requiring review rather than automatically declaring a failed sale.
- Quotations awaiting internal action or approaching validity expiry, and sales orders waiting for release, stock or delivery. Customer acceptance is distinct from internal approval.
- Revenue and sales-target attainment as supporting metrics with a fixed currency/date basis. Marketing spend, attribution and ROI show unavailable until actual records and conversion-value definitions exist.

### Procurement

- Submitted open purchase Material Requests and Purchase Orders with missing owners or past required/delivery dates.
- Separate old backlog from newly overdue demand; show oldest due date and original issue date. Do not change old schedules to make the status look better.
- Receipt shortages at PO-item grain using Purchase Order Item/Purchase Receipt Item relationships; do not sum multiple receipt joins into duplicate PO values.
- Customs/shipment exceptions from verified Purchase Order custom fields and Shipping Documents.
- Landed-cost/clearance verification and missing documentation, linked to the affected shipment/order and the next responsible role/person.

### Finance

- Actual native pending payment/journal/expense/finance-workflow requests, separated from operational drafts and from CEO-permitted decisions.
- Receivables, ageing and historical report-date balances from native ledger/report definitions, with party/company currency validated.
- Credit-limit breaches distinguish positive-limit excess from outstanding with zero/no limit; company-specific limits are not silently replaced by a global MAX or SUM.
- Collections scheduled or assigned for follow-up; planned commitments, actual receipts, gross receipts and legacy adjusted salesperson collections are different measures.
- AP due/overdue, on-hold bills and supplier credits; cash funding requirements due within 7/14/30 days, with forecast exclusions and uncertainty shown.
- SOA Needs Review/Failed/Processing exceptions, pending SOA Workflow Request reviews, and Collection List Draft approvals where actually permitted.
- VAT/ZATCA exceptions and financial-control indicators. Proxy checks remain labelled indicative until underlying audit evidence proves a violation.

### People & Admin

- Permitted open HR/admin requests from the verified existing sources, including Materials Service General Request Form, leave/attendance requests and clearance processes used by the HR dashboard.
- Employee Vacation Record overdue return, revised expected return, re-entry expiry and refund-follow-up exceptions; unmatched past leave is Return unverified.
- Missing coverage for upcoming leave using real department/location staffing inputs; no invented minimum-staffing threshold.
- Unpaid facility rent instalments, expiring company/facility documents, and letters/memos requiring approval, signature or filing.
- Payroll cost and current processing status: distinguish not run/not posted yet from a measured zero salary cost. No individual salary detail in the CEO overview by default.

### Projects

- DMS Technical Submittal with Requested/In Preparation/Revision Required and a due `required_date`; Submitted/Under Review is tracked separately from an internal task awaiting action.
- Technical approvals and prequalification/submittal queues from their existing DocTypes after validating each workflow and date basis.
- DMS personnel/contact-access requests and project follow-ups with verified ownership.
- Contracting milestones, unbilled deliverables, overdue approved payment commitments and unresolved site issues only where the mapped source fields support the rule. Project List, Contract Projects, DMS Project and native Project are not interchangeable.

### Operations

- Driver Vehicle Issue Request Open/In Progress with High/Critical severity; overdue Vehicle Maintenance Schedule and expiry-specific vehicle renewals.
- Scheduled/In Transit Delivery Trips past their applicable planned time/date, partial deliveries and missing evidence. A scheduled trip is not a completed delivery.
- Forklift/asset downtime and utilization exceptions using actual event dates; missing logs are a data-quality issue, not proof of zero utilization.
- Scaffolding rental delivery/return/assignment exceptions from its real rental sources; do not substitute external DMCC rental entities for native Rental records.
- Recorded ERP fuel anomalies use explicit thresholds. Portal account balance remains unavailable until the Aldrees integration exists.

### Manufacturing

- Overdue open Work Orders/Factory Job Orders, incomplete job assignments and missing activity reports.
- Target/actual quantities compared only for the same factory, item and UOM. Factory scope comes from Manufacturing Factory and verified warehouse/branch mappings.
- Material shortage and scrap exceptions from the relevant stock detail/BOM evidence, not a single mixed-unit quantity sum.
- Recorded process costs and stock valuation remain distinct. Full manufacturing cost, capacity and quality/yield targets require reconciled definitions and cannot be guessed from document counts.

### IT & Assets

- Critical/high IT Help Desk Request cases unresolved beyond a verified due date and ERP-change requests requiring approval.
- IT renewals due/expired, acquisition requests awaiting action, assets needing repair or missing assignments/returns.
- Access-review exceptions require a defined access policy and evidence; a user having many roles is not automatically a breach.
- Renewal owner names/employee/user fields are resolved according to their actual Link types, not joined by display-name similarity.

### Legal & Compliance

- Upcoming court/Taradhi sessions and recorded payment commitments, open cases and cases requiring follow-up.
- Court Cases, Taradhi Cases and Legal Case List remain distinct sources with explicit authority/category rules and cross-link deduplication only where an actual relationship exists.
- No combined financial case total when currency or ledger balance basis is unverified. A case's recorded amount is not automatically current outstanding.
- Document control exceptions: missing signatures, filed/received states, overdue renewal items and critical corporate/employee/facility documents. Each uses its exact date field.

### DMCC

- Connection state and last successful retrieval are visible.
- Verify entity schemas, statuses, ownership, currency and date semantics before enabling external exception counts.
- No API key in browser code. External records never inflate native ERP company totals, and a failed external connection never reports zero pending actions.

## 4. Shared action model and hierarchy

Each normalized action has:

- Source DocType/entity + record ID + action type as its stable key.
- Department, company and optional branch/project/factory with a verified mapping; unresolved scope is identified, not guessed.
- Plain-language action title and reason it needs attention.
- Severity: Critical / Overdue / Due soon / Pending / Needs verification, with policy provenance. These labels are not treated as mutually exclusive record statuses.
- Responsible person/role, owner confidence, next step and native source status.
- Explicit due date, date basis, age, and overdue days only where the date supports that calculation.
- Amount + currency + basis where verified; missing exposure is unavailable, not zero.
- Current-user workflow eligibility, record link, department-dashboard link and retrieval timestamp.

The queue's mutually exclusive top-level groups are **My decisions**, **Escalations**, **Department follow-up**, and **Data verification**. Severity/deadline flags filter within them. The same source record can have multiple different tasks, but repeated display in two tabs does not create duplicate action totals. Unlinked SOA/collection requests remain separate tasks, not guessed duplicates of invoice balances.

Priority order: explicit safety/critical compliance or business stoppage; actual CEO decisions due/overdue; dated overdue actions; imminent obligations; unowned/stalled work; data verification. Within a band, sort by verified due date/age, then meaningful exposure within one currency. Do not rank SAR and USD as if they were the same unit. No unexplained numerical risk score in the first release.

The urgency bands and default 7/14/30-day windows are configurable proposals, subject to approval. No department-specific SLA is invented because a due date is absent.

## 5. Layout and navigation

### Persistent header

- Compact navy title bar: CEO Command Centre, last refreshed time, refresh, language toggle and theme following Desk.
- Second compact line: Company; relevant location/branch/project/factory filters; search; clearly separated **performance period**, **balance as-of date**, and **action due window**.
- Default action scope is all currently open work. Changing the sales period must not hide an old unresolved approval or expired document.

### Department navigation — always top tabs

`Overview | Sales | Procurement | Finance | People & Admin | Projects | Operations | Manufacturing | IT & Assets | Legal & Compliance | DMCC`

- A single sticky horizontal tab strip; scrollable with visible arrow affordances on smaller widths. No left department sidebar and no hidden replacement navigation.
- Active tab has a royal-blue underline and clear label; badges show critical/overdue counts with a legend, not unexplained totals.
- Filter/tab state preserved when moving between departments and restored on return from a source record. Invalid/stale remembered state is reset visibly.
- Desktop split layouts collapse to a single column on narrow screens. RTL mirrors alignment and navigation while keeping IDs/amounts readable.

### Overview hierarchy

1. **Attention strip:** My decisions; Critical issues; Overdue actions; Due in seven days. These are labelled views with possible overlap, not numbers to add together.
2. **Primary workbench:** a prominent action queue, defaulting to My decisions when nonempty, otherwise Critical/Overdue. Group chips switch queue category without losing scope. Display roughly 8–12 rows, then pagination/view all.
3. **Department action matrix:** one compact row per department with critical, overdue, pending, unowned and oldest due information; click opens that tab with the same filter.
4. **Upcoming commitments + business pulse:** next-seven-day calendar/list alongside a small set of verified sales/cash/receivable/fulfilment signals. Monetary figures show their currency and calculation basis.
5. **Source-health summary:** collapsed by default unless an important source is unavailable or incomplete; a missing critical source remains visible near the workbench too.

### Inside every department tab

- Department title, two-sentence scope/basis and link to its full existing dashboard(s).
- Four to six relevant exception/health indicators, not copied personal employee KPI cards.
- Consistent secondary segmented controls: **Actions / Performance / Upcoming / Data checks**. Unsupported sections show their prerequisite instead of manufactured charts.
- Actions is the default; its queue has severity, status, owner, due window, amount/currency and search filters.
- Performance adds only decision-useful trends/target comparisons; Upcoming shows dated commitments; Data checks shows source failures, missing mappings, contradictory statuses and incomplete targets.

### Action detail drawer

Clicking a row opens a right-side contextual drawer: reason, source status, responsible person, actual dates/basis, financial exposure if known, relevant related records and last update. Primary button is Open record; secondary is Open department dashboard. The drawer is detail, not another navigation sidebar.

First release does not approve, submit, close, reassign or notify people automatically. The original ERP form remains the place to act using its native workflow and permissions. Inline decisions/escalation/delegation can be a separately approved later phase with preview, authorization and audit logging.

## 6. Design language

- Executive, calm and dense enough to scan: navy header, royal-blue active navigation, neutral page background, restrained cards and thin dividers. Avoid a wall of identical glass KPI tiles.
- Red: critical/overdue; amber: due soon or review required; blue: ordinary active work; green: completed/healthy where applicable; neutral: unavailable/unverified. Pair color with a label/icon.
- Monetary exposure uses readable tabular digits and explicit currency. Percentages use one decimal unless a metric needs greater precision; full value is available in the drawer.
- Titles 20–24px, section headings 15–17px, body 13–14px, generous row click targets and consistent 8px spacing rhythm. Stable labels and column widths; no clipped achievement headings.
- Due date and owner are prominent. Counts/financial values are right-aligned in LTR and correctly mirrored in RTL; document IDs remain direction-isolated.
- English/Arabic, keyboard navigation, visible focus states, light/dark Desk theme, reduced-motion support and clear loading/empty/error/partial states.
- Distinguish No matching actions, Source unavailable, Permission restricted, Not configured, and Data incomplete. Never show all five as zero.

## 7. Metric and data contract

Before building visual components, write one dictionary defining each shared measure's source, grain, filters, date basis, currency, cancellation/return treatment, exclusions and current-vs-historical behavior.

Mandatory reconciliations include:

- Customer gross receipts vs legacy adjusted salesperson collections.
- Company credit-limit breach vs global report/zero-limit breach.
- Current outstanding vs historical report-date outstanding.
- Open approvals vs all drafts vs actually actionable CEO decisions.
- Item/warehouse stock balances vs distinct items vs quantity/status distributions.
- Production target/actual at matching item/UOM/factory grain.
- Rent/renewal instalments vs underlying parent agreements.

Company selection applies only where a source has a verified Company link or a proven join. External/unmapped or all-company reference data gets a visible separate scope. Old unresolved work is not filtered away by a performance-date range. Standard framework fields and effective custom fields must be checked against live metadata.

## 8. Backend consolidation — one CEO API

Proposed Server Script/API Method: **ceo_command_center_api**.

It replaces the CEO dashboard's nine exported script dependencies after coverage and call sites are checked. It does not merge SOA, DMS, Treasury, Messenger or other shared APIs belonging to other dashboards. An additional legacy `ar_asof` call exists in the CEO source; migration must remove/replace it as part of the dependency audit rather than assuming the nine-file folder captures every runtime dependency.

Suggested read actions:

| Action | Purpose |
| --- | --- |
| bootstrap | Permitted departments/companies, filter options, policy/metric versions and default counts |
| overview | Executive attention summary and compact workbench data |
| actions | Stable paginated normalized queue with department/severity/owner/deadline filters |
| department | Department exception indicators and approved supporting metrics |
| drilldown | Record evidence, metric definition and permitted source links |
| source_health | Retrieval status, incomplete/permission/mapping/setup failures |

The single API source is organized into named internal functions: schema/permission helpers, company/currency resolution, source adapters, metrics, action normalization, deduplication and response assembly. Under Server Script safe-exec, these live in one compatible script; do not assume Python imports or unrestricted SQL helpers are available. If future size requires a custom app, retain one public CEO endpoint and move internals into app modules, subject to separate approval.

- Allowlisted read actions, bounded inputs, server-side permission-checked reads and verified child-parent access.
- No new write capabilities in the first release; no administrator SQL bypass used as a substitute for reader permissions.
- Source failures isolated per section. No partial result is presented as a complete total.
- Server-side aggregate calculations where appropriate; complete query pagination; cursor/page metadata for queues.
- User/company/filter/metric-version-aware caches only if needed; never reuse one executive's permitted data for another reader.
- Query/source responses carry currency, scope, definition, retrieval time, completeness and permission/setup state.
- DMCC remains behind its own credential-bearing proxy and an allowlisted adapter. Secrets never enter the CEO JavaScript.

Migration: inventory every current caller; preserve old APIs while the replacement is being compared; compare counts/amounts/drilldowns against the same data scope; switch the CEO block to the new endpoint; retire an old script only after no other caller needs it. Endpoint retirement/deployment is a separate reviewable step, not deletion during planning.

## 9. Build sequence after approval

1. Lock the content scope, tab hierarchy, action model, metric definitions and first-release read-only behavior.
2. Recheck live schema/workflows; write a field-level source/action matrix and dependency inventory, including unresolved mappings. Resolve business rules instead of guessing them.
3. Build and test the single CEO API's permission/scope/error contract and normalized action queue before wiring charts.
4. Build the header/top tabs/overview/workbench/detail drawer with proper loading, unavailable and empty states.
5. Connect departmental lanes in priority order: Finance/Collections, Sales, Procurement, People/Admin/Compliance, Projects, Operations, Manufacturing, IT/Assets, Legal detail and external DMCC when configured.
6. Add reconciled performance context, EN/AR, dark/light, responsive behavior and source-health views.
7. Test counts, monetary basis, ownership, workflow eligibility, duplicate joins, missing dates, historical scope, units, role permissions, failures and navigation. Include actual browser checks; syntax tests alone are not acceptance.
8. Prepare a new manual deployment checklist with rollback and old-API retirement candidates. Deploy only after approval of the concrete implementation.

## 10. Acceptance criteria

- Every headline count opens the same scoped underlying actions; queue totals are not inflated by duplicate department views.
- CEOs can identify the next action/owner/date without opening a performance chart.
- A document is labelled My decision only when a permitted current-user workflow action is verified.
- Shared metrics reconcile or display their explicit differing definition/scope; currencies and units are never silently mixed.
- Every important source dashboard is covered by a meaningful lane, an appropriate supporting link, or an explicit unavailable dependency—not an invented KPI.
- Old unresolved actions survive period changes; native business dates/statuses are not rewritten to hide backlog.
- Unavailable/unconfigured/permission-restricted/incomplete is never rendered as a healthy zero.
- All department navigation remains in top tabs; mobile/RTL behavior remains usable.
- CEO JavaScript calls the single CEO API for dashboard data; no obsolete CEO endpoint is silently retained.
- No production record or API is changed before the separate deployment approval.

## Approval requested

Approve or revise: (1) the ten department tabs plus Overview; (2) the pending-action-first hierarchy; (3) the read-only first release with native forms for decisions; (4) the single CEO API consolidation and staged retirement; and (5) the design direction. All implementation waits for that approval.
