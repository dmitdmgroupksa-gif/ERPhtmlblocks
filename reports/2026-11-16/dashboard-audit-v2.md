# Dashboard audit v2 — sources, filters, placeholders, missing data and shell consistency

Review date 16 November 2026. Scope: 53 dashboard folders (CEO Command Centre v2 included), 58 JavaScript and 57 Python sources. Checked against the ERP map (snapshot 13 November 2026, 1,684 DocTypes) and the live site with read-only calls (record counts and query probes; nothing written). This review follows the first audit ([dashboard-audit.md](dashboard-audit.md), findings A01–A20); fixes for those remain listed in [fix-status.md](fix-status.md) and are still **not deployed**.

Method: 638 JavaScript and 1,003 Python native-query calls were statically extracted and their fields compared with the map. Every DocType the dashboards read was counted live. A heuristic scan covered placeholders, filter wiring and shell features. Each finding below was then checked in the source by hand. Heuristic false positives were dropped: child-table reads in Quotation & SO Tracker, the "Joiners/Leavers" labels in Admin HR, and inline inputs in SOA Manager.

## Highest priority

| # | Dashboard | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| B01 | Employee Dashboard (ToDo panel) | **API fails on every call.** `emp_todo_dashboard` asks for `min(creation)` and `avg(to_days(creation))` in `get_list` fields; this site rejects them ("Field not permitted in query"). The call is not guarded, so the whole ToDo response errors. | `05. HR & Administration/Employee Dashboard/server_scripts/emp_todo_dashboard_2d996ec0.py:412`; reproduced live | Fetch `creation` for the open automatic ToDos (or order by `creation asc` with limit 1) and compute oldest and average age in Python. |
| B02 | My Leads, Lead Management | **Empty source.** `Lead Allocation` has 0 records live, while `Leads Generation List` has 3,748. Both dashboards show nothing. Digital Marketing conversion also depends on it. | Live count | Business process: allocate leads (Lead Management) or retire these dashboards. Show "No allocations recorded yet" rather than zeros. |
| B03 | Manufacturing, Operation, Production | **Targets never configured.** `Manufacturing Production Target` has 0 records, so every target / attainment view is empty. Production's `Quality Inspection` source is also empty. | Live count | Enter monthly targets per factory / item / UOM, or hide target widgets until they exist. |
| B04 | Technical Department | **Invented target.** Salesperson "Avg Achievement" is computed against a fixed `target:5` approvals per rep, a value that exists nowhere in the ERP. | `06. Technical & Projects/Technical Department/dashboard.js:85` | Remove the attainment %, or read a real target (e.g. Sales Person custom target fields) and say "Target not set" otherwise. |
| B05 | Document Control | **Core data not used.** Eight DocTypes carry `custom_printed / custom_under_review / custom_received / custom_filed` (Delivery Note, Expense Claim, Journal Entry, Leave Application, Payment Entry, Purchase Invoice, Purchase Order, Purchase Receipt). Document Control reads none of them, and its expiry source `Document Record` has 0 records live. | Map + source grep + live count | Build the register around those four flags per DocType (not printed / not filed / under review) and show Document Record as "no records yet". |
| B06 | Admin HR (6 APIs + JS), Operation Dashboard | **Filter default hides other companies.** `DEFAULT_COMPANY = "Durar Masagh Trading Company"`, and each API uses `company = form_dict.company or DEFAULT_COMPANY`, so an "all companies" view is impossible and the 6 other companies are excluded silently. | `admin_hr_*.py` (e.g. `admin_hr_dashboard_data_0f894ebc.py:12,102`), `Admin HR Dashboard/dashboard.js:7`, `Operation Dashboard/dashboard.js:138` | Default to the user's default company, allow blank = all permitted companies, and show the company in the scope line. |
| B07 | DM Contracting | **Four empty sources.** `Maintenance Schedule`, `Maintenance Visit`, `Asset Maintenance` and `Issue` have 0 records, so those panels can only show zero. | Live count | Hide the panels or label them "Not used on this site". |
| B08 | Digital Marketing | Still fully empty: all six marketing sources have 0 records, and eight attribution fields are not installed (A04/A05). | Live count + map | Install the prepared custom fields and import real data, or archive the dashboard. |

## Wrong / risky field and DocType use

| # | Dashboard | Finding |
| --- | --- | --- |
| B09 | CEO v1 (legacy scripts) | `ceo_command_center_procurement` uses `max(supplier_name)` (rejected on this site). `ceo_command_center_finance_details` reads `company / due_date / outstanding_amount / party_account_currency` on "Sales person weekly collection - Invoice wise", where they don't exist. Both are superseded by v2 and should be retired, not fixed. |
| B10 | Admin HR | `SLA_DAYS = 7` and `STUCK_DAYS = 30` turn request age into "overdue days" with no SLA recorded in the ERP. Confirm these as policy and show them in the UI, as the CEO centre does. |
| B11 | Fleet / Vehicle Maintenance Schedule | `Vehicle Maintenance Schedule` has its own `custom_mvpi_expiry / custom_insurance_expiry / custom_license_expiry`, which duplicate the Vehicle expiry dates Fleet uses. Two sources for one fact can disagree. Add a Fleet data check comparing them, or retire the copies. |
| B12 | Technical Department | `Pre - Qualification Submittals.company` is a Link to **Customer**. The dashboard correctly treats it as the customer, but the field label invites misuse in reports. Consider renaming the label. |
| B13 | DMS Technical Department | The API supports `from_date / to_date` (filtering on `creation`), but the dashboard has no date inputs. Expose them, or remove the unused API arguments. |
| B14 | Employee Vacation (and CEO v2) | `Employee Vacation Record.company` and `.department` are free-text Data fields, so the company filter cannot be applied reliably. Change them to Link fields. |

## Filter set-up

- **No company filter while reading company-linked DocTypes** (verified in source): Collector and SOA Request (Sales Invoice, Journal Entry), Scaffolding Rental (Project, Task, Attendance, Leave Application), IT Asset Acquisition (IT Asset), Document Control (Sales Order, Sales Invoice, Payment Entry and more). The SOA screens are per-collector, so this is low priority there. Document Control and Scaffolding mix companies without saying so.
- **Company filter present and applied:** Credit Controller (dynamic picker; required), Quotation & SO Tracker, Customs, DM Contracting, Plant & Furniture, Government Relations, Pre-Procurement, Finance Internal Controller, VAT & ZATCA and others.
- **Production** scopes by factory (mapped to company) instead of company. That's acceptable, but the scope line should name the company.
- **Apply buttons:** only 8 of 53 dashboards have one. Others reload on every change, which is fine for selects but expensive for date ranges. The standard: selects apply immediately, date ranges apply with Apply.

## Placeholders and incomplete features

| Dashboard | Item | Status |
| --- | --- | --- |
| Fleet | Aldrees fuel portal: `ALDREES_API_METHOD = ''` → "API not connected" | Known blocker A14 (needs endpoint + credentials). Clearly labelled. |
| Technical Department | Fixed 5-approval target (B04) | Placeholder value presented as a KPI. |
| Digital Marketing | Empty sources (B08) | Labelled as setup-needed after A05. |
| DMCC | External proxy not installed | Prepared (A15); not configured. |
| CEO v2 | Sales targets "Not set" (CEO Sales Target empty) | Labelled; needs target records. |
| Employee Dashboard / DMS Sales | Embedded map / document `iframe`s | Legitimate (vehicle location, sandboxed document preview), not placeholders. |
| My Leads, Durar Messenger, Durar Sheets | `Math.random` | Used for client IDs only; not fake data. |

No "Lorem", "coming soon", TODO or random/demo figures were found in any data path.

## Data that exists in the ERP but is not used (selected, decision-relevant)

| Dashboard | Available but unused | Why it matters |
| --- | --- | --- |
| Credit Controller, Collector, SOA, Finance Manager | `Customer.custom_collection_status`, `custom_customer_account_status`, `custom_reason_for_block`, `custom_balance_confirmation_status`, `custom_last_balance_confirmation_date`; `Sales Invoice.custom_expected_payment_date` | Collection stage, block reason, balance-confirmation coverage, and a dated cash-in forecast. |
| Pre-Procurement, Customs | `Purchase Order.custom_po_in_charge_`, `custom_purchaser_name`, `custom_approved_date`, `custom_delivery_location`; `Material Request.custom_priority`, `custom_purchase_type`, `custom_purpose_of_purchase`, `custom_sales_order` | Owner and priority for every overdue request/order; import vs local split; MRs linked to customer orders. |
| Quotation & SO Tracker | `Quotation.custom_b_stylecolor_redlost_reasonb` (lost reason), `custom_quotation_current_status`, `payment_term`, `supply_date`; `Sales Order.custom_handover_status`, `custom_submitted_to_sp`, `custom_received_from_sp`, `custom_filing` | Lost-reason analysis; order paperwork handover tracking. |
| Employee Vacation, Payroll Cost Center, Admin HR | `Leave Application.custom_replacement_person`, `custom_reentry_date_as_per_exitentry`, `custom_iqama_expiry_date`, `custom_line_manager` | Leave coverage (who replaces whom), re-entry and Iqama compliance. |
| Logistics, Operation | `Delivery Note.custom_sales_person`, `custom_division`, `delivery_type`, `custom_customer_project`; `Delivery Trip.custom_total_amount_earned` | Deliveries by salesperson/division/project; trip earnings. |
| Finance Internal Controller | `Journal Entry` settlement/provision flags (`custom_eos_settlement`, `custom_vacation_provision`, `custom_ticket_provision`, …), `custom_vehicle` | Control checks on provisions and settlements; vehicle cost allocation. |
| Fleet | `Vehicle.custom_authorization_expiry`, `oil_change_date`, `custom_last_odometer_value`, `custom_actual_weekly_odometer` | Driving authorization is a compliance date; weekly odometer gives utilization without trip logs. |
| VAT & ZATCA | `Account.ksa_account_type`, `ksa_account_title`, `custom_vat_percentage` | Direct VAT-return mapping by account. |

The full list per dashboard is in `.local/audit/v2_coverage.json` (local, not committed).

## Header and filter-bar consistency

Fleet's shell is the target. The standard is written down in [shared/Dashboard Shell/README.md](../../shared/Dashboard%20Shell/README.md) and implemented in CEO Command Centre v2.

Current state across the 53 dashboards: 46 have Refresh, 32 have the Arabic toggle, 19 follow the Desk dark theme, 25 have tabs, **12 use the royal-blue tab bar**, 44 have a filter bar, 34 have date filters, 8 have Apply and 30 have search. There are **28 different CSS prefixes / layouts**. Only 7 match Fleet in full: CEO Command Centre, SOA Manager, SOA Request, Admin HR, DM Contracting, Fleet and Scaffolding Rental.

Main gaps:
- **No header or filter bar at all:** the six Blocked Customer cards (compact cards inside one workspace; they need at most a shared header on the workspace), Treasury, DMCC, DMS Technical Department and My DMS Projects.
- **No language toggle:** DMS Sales Management, Quotation & SO Tracker, DN & GRN, Inventory, Treasury, DMS/My DMS/Technical, Admin & HR Platform, Employee Vacation, Delivery & Forklift, Manufacturing, Durar Sheets, Finance Manager.
- **Not following Desk dark mode:** 34 dashboards.
- **Tabs not royal blue, or no tabs:** 41 dashboards.

**Update (same day): applied locally to 43 dashboards** through `tools/erp/shell/` (see [shared/Dashboard Shell/README.md](../../shared/Dashboard%20Shell/README.md)). All now share the navy header band, royal-blue tab bar and white filter card (labels above 38px controls), in Fleet's order where the elements are siblings.

Verified in Edge with every dashboard rendered against a mocked `frappe`:
- No new script errors.
- No horizontal page scroll at 390px.
- Before/after screenshots compared visually.

**Follow-up, also applied locally:**
- Desk dark mode was added to the 28 dashboards in scope that lacked it. It is generated from each stylesheet, and light mode is unchanged.
- An English / العربية button was added to the 8 dashboards that had no language option.

All 53 dashboards were re-rendered in light and dark mode with no new script errors. Details: [shared/Dashboard Shell/README.md](../../shared/Dashboard%20Shell/README.md). Both need per-dashboard translations or palettes, not CSS.

## Appendix — shell features per dashboard

✓ = present in the source. "Company" is a static text check; dashboards that build the picker dynamically (e.g. Credit Controller) show — here but do filter by company. Empty live sources exclude ToDo, which is user-scoped.

| Dashboard | Refresh | العربية | Dark | Tabs | Royal tabs | Filter bar | Company | Dates | Apply | Search | Empty live sources |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CEO Agent | ✓ | — | ✓ | — | — | — | ✓ | — | — | — |  |
| CEO Command Center | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | CEO Sales Target |
| DMCC Dashboard | ✓ | — | — | — | — | ✓ | — | ✓ | ✓ | — |  |
| DMS Sales Management | ✓ | — | — | ✓ | — | ✓ | ✓ | ✓ | — | ✓ |  |
| Lead Management | ✓ | ✓ | — | — | — | ✓ | — | ✓ | — | ✓ | Lead Allocation |
| My Leads | ✓ | ✓ | — | — | — | ✓ | — | ✓ | — | ✓ | Lead Allocation |
| Quotation & SO Tracker | ✓ | — | — | ✓ | — | ✓ | — | ✓ | — | ✓ |  |
| Customs & Post-Processing | ✓ | ✓ | — | — | — | ✓ | — | ✓ | — | — |  |
| DN & GRN Tracker | ✓ | — | — | ✓ | — | ✓ | ✓ | ✓ | — | ✓ |  |
| Inventory Dashboard | ✓ | — | — | — | — | ✓ | ✓ | — | — | — |  |
| Pre-Procurement | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | — | ✓ |  |
| Accounts Payable | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |  |
| Blocked Customer Dashboard/CP Blocked Customer | — | — | — | — | — | — | — | — | — | — |  |
| Blocked Customer Dashboard/CSD Blocked Customer | — | — | — | — | — | — | — | — | — | — |  |
| Blocked Customer Dashboard/EP Blocked Customer | — | — | — | — | — | — | — | — | — | — |  |
| Blocked Customer Dashboard/MP Blocked Customer | — | — | — | — | — | — | — | — | — | — |  |
| Blocked Customer Dashboard/SRD Blocked Customer | — | — | — | — | — | — | — | — | — | — |  |
| Blocked Customer Dashboard/WP Blocked Customer | — | — | — | — | — | — | — | — | — | — |  |
| Collector | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | ✓ |  |
| Credit Controller Dashboard | ✓ | ✓ | — | — | — | ✓ | — | ✓ | — | ✓ |  |
| Finance Internal Controller | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| Finance Manager Dashboard | ✓ | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |  |
| Payroll Cost Center | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| SOA Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | ✓ |  |
| SOA Request Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | ✓ |  |
| Treasury Dashboard | ✓ | — | — | — | — | ✓ | — | ✓ | — | — |  |
| VAT & ZATCA Compliance | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | — | ✓ |  |
| Admin & HR Platform | ✓ | — | — | ✓ | — | ✓ | — | ✓ | — | ✓ |  |
| Admin HR Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Training Course |
| Employee Dashboard | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | Driver Vehicle Check |
| Employee Vacation | ✓ | — | ✓ | — | — | ✓ | ✓ | ✓ | — | ✓ |  |
| Government Relations Dashboard | — | ✓ | ✓ | — | — | ✓ | — | ✓ | — | ✓ |  |
| DM Contracting Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | Maintenance Schedule, Maintenance Visit, Asset Maintenance, Issue |
| DMS Technical Department | ✓ | — | — | — | — | ✓ | — | ✓ | — | — |  |
| My DMS Projects | ✓ | — | — | — | — | — | ✓ | — | — | — |  |
| Technical Department | ✓ | ✓ | — | — | — | ✓ | — | ✓ | — | ✓ |  |
| Digital Marketing Dashboard | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | Marketing Channel, Marketing Daily Metrics, Marketing Budget, Marketing Content, Web Analytics Daily, Lead Allocation |
| ERP User Access | ✓ | ✓ | — | ✓ | — | ✓ | — | ✓ | ✓ | ✓ |  |
| IT Asset Acquisition | ✓ | ✓ | — | — | — | ✓ | — | ✓ | — | ✓ |  |
| IT Platforms Expiry | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |  |
| Delivery & Forklift | ✓ | — | — | — | — | ✓ | ✓ | ✓ | — | — |  |
| Fleet Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | Driver Vehicle Check |
| FM & Inventory Dashboard | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | ✓ |  |
| Logistics Dashboard | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | ✓ |  |
| Manufacturing Dashboard | ✓ | — | — | — | — | ✓ | ✓ | ✓ | — | — | Manufacturing Production Target |
| Operation Dashboard | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | Manufacturing Production Target |
| Plant & Furniture Asset Dashboard | ✓ | ✓ | — | ✓ | — | ✓ | — | ✓ | — | ✓ | Asset Maintenance, Asset Maintenance Log |
| Production Dashboard | ✓ | ✓ | — | ✓ | — | ✓ | — | ✓ | — | — | Manufacturing Production Target, Quality Inspection |
| Scaffolding Rental | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |  |
| Document Control | ✓ | ✓ | — | — | — | ✓ | — | ✓ | — | — | Document Record |
| Legal Dashboard | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | ✓ |  |
| Durar Messenger | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | ✓ |  |
| Durar Sheets | ✓ | — | ✓ | ✓ | — | ✓ | — | — | — | — |  |
