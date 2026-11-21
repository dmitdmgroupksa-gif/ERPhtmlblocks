# ERP dashboard source and data-completeness review

Review date: 16 November 2026 (Asia/Riyadh). Map snapshot: 2026-11-13 18:26.

Reviewed 54 implemented dashboard folders (53 ERP exports plus the existing Executive Secretary dashboard), three additional local SOA JavaScript variants, and two placeholder entries. Parsed 57 JavaScript and 55 Python source files. Static extraction identified 629 JavaScript query/configuration candidates and 995 resolved Python native-query calls; these overlap and are not counts of executed independent queries.

Compared source dependencies with 1,684 mapped DocTypes and 998 mapped reports. Checked 14 effective DocType schemas live, reproduced the Accounting Period filter failure with a read-only request, and read permission-scoped source counts and invoice currency-group counts. No dashboard code or ERP record was changed. External Base44 and BI services were not called.

Local remediation is tracked separately in [fix-status.md](fix-status.md). The findings below describe the original audited sources.

## Findings that need attention first

1. A01: already-SAR purchase invoice outstanding is converted again in three views; 105 currently open purchase invoices have the currency pattern that exposes this error.
2. A02: the closed-period exception query fails on a nonexistent Accounting Period.disabled field (live HTTP 417).
3. A06: Credit Controller historical As-of Date changes ageing buckets, not the historical balance basis.
4. A03/A04: Web Analytics uses two wrong field names, and eight attribution fields are absent.
5. A11/A13/A14: Production key metrics, CEO live legal data, and the Fleet fuel portal remain incomplete.
6. A15: DMCC uses an external source and exposes a client-side API key; its source cannot be reconciled through the ERP map alone.

## How to interpret this review

- Confirmed source/schema defects are separated from conditional data-volume/join risks, disclosed incomplete features, empty-source dependencies and external audit limitations. Severity reflects potential effect, not proof that every current figure is wrong.
- No nonexistent business DocType was confirmed in the statically resolved native queries. A translation label Document Type and the internal SQL table tabSingles were discarded as false positives.
- Optional schema-filtered fields are not reported as crashing SQL queries. Web Analytics is still wrong because its chart code reads the omitted property names.
- Current live counts reflect the supplied API user. Target-role permissions, browser rendering, business sign-off, dynamic SQL/field construction and full ledger reconciliation were not exhaustively tested.
- Zero parse errors do not establish correct safe-exec runtime behavior. No Server Script actions were executed during this review.
- Source map record counts are dated 13 November; current empty-table and currency claims below use live read-only probes.

## Detailed findings

### A01 — Purchase invoice outstanding is converted twice

**Severity:** High · **Type:** Incorrect calculation / missing currency field · **Evidence:** Confirmed against map, live effective schema, and live currency-group counts; no financial amounts exported

**Affected:** Accounts Payable Dashboard, Finance internal  controller, Customs & Post-Procurement Dashboard

The three views multiply Purchase Invoice.outstanding_amount by conversion_rate without fetching/checking party_account_currency. The map declares outstanding_amount as Currency with options=party_account_currency, while conversion_rate converts invoice currency to company currency. Live grouping found 105 submitted invoices with positive outstanding whose invoice currency is AED/USD but whose party_account_currency is already SAR (42 AED and 63 USD). Accounts Payable is specifically affected in its invoice-table outstanding renderer; this finding does not imply its report-backed headline KPIs are wrong.

**Effect:** Already-SAR balances are multiplied again; a USD-document balance already stored in SAR is multiplied by rates such as 3.755. Internal Controller AP sums and Customs supplier-payable figures are affected too.

**Suggested correction:** Fetch party_account_currency and company default currency. Keep balances unchanged when those currencies match; otherwise use a verified party-currency conversion or native Accounts Payable ledger report. Treasury already demonstrates a party-currency guard.

**Source:** [04. Finance & Credit Control/Accounts Payable/dashboard.js:308](../../04.%20Finance%20%26%20Credit%20Control/Accounts%20Payable/dashboard.js#L308), [04. Finance & Credit Control/Accounts Payable/dashboard.js:331](../../04.%20Finance%20%26%20Credit%20Control/Accounts%20Payable/dashboard.js#L331), [04. Finance & Credit Control/Finance Internal Controller/dashboard.js:459](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/dashboard.js#L459), [03. Procurement & Supply Chain/Customs & Post-Processing/dashboard.js:132](../../03.%20Procurement%20%26%20Supply%20Chain/Customs%20%26%20Post-Processing/dashboard.js#L132), [04. Finance & Credit Control/Treasury Dashboard/server_scripts/treasury_dashboard_data_66d24f75.py:132](../../04.%20Finance%20%26%20Credit%20Control/Treasury%20Dashboard/server_scripts/treasury_dashboard_data_66d24f75.py#L132)

### A02 — Accounting Period.disabled breaks the closed-period control

**Severity:** High · **Type:** Invalid field in filter · **Evidence:** Reproduced through live read-only API

**Affected:** Finance internal  controller

periodHits() starts with disabled=0 on Accounting Period. Neither the map nor live effective metadata has this field. A read-only list request using that filter returned HTTP 417 / DataError: Field not permitted in query: disabled.

**Effect:** The closed-period exception check cannot load its dataset.

**Suggested correction:** Remove the nonexistent filter and use Accounting Period start_date/end_date/company plus its Closed Document child table to identify applicable restrictions.

**Source:** [04. Finance & Credit Control/Finance Internal Controller/dashboard.js:834](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/dashboard.js#L834)

### A03 — Web Analytics uses avg_* instead of average_*

**Severity:** Medium · **Type:** Wrong field names · **Evidence:** Confirmed against map and live effective schema

**Affected:** Digital Marketing Dashboard

Requested/rendered avg_session_duration and avg_position do not exist. Both the map and live schema use average_session_duration and average_position. dsq() filters nonexistent fields out before querying, so this is a silent data omission rather than an invalid SQL request.

**Effect:** Average session duration and search-position charts become zero/default values even after valid Web Analytics Daily records are populated.

**Suggested correction:** Update both requested fields and chart property reads; keep missing measurements unavailable rather than coercing them to zero.

**Source:** [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:930](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L930), [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:1003](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L1003), [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:1791](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L1791), [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:1796](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L1796)

### A04 — Marketing attribution and conversion-value fields are not installed

**Severity:** Medium · **Type:** Missing data model integration · **Evidence:** Confirmed against map and live effective schema

**Affected:** Digital Marketing Dashboard

Absent in both map and live metadata: Leads Generation List.marketing_channel/campaign; Lead Allocation.marketing_channel/campaign/deal_value/converted_customer/lost_reason; Lead.marketing_channel. These eight optional fields are removed by schema filtering. The Setup tab acknowledges missing fields, so this is incomplete integration rather than a crashing fetch.

**Effect:** Custom-lead campaign filtering, channel attribution, revenue/ROI and loss-reason analysis cannot be complete. Campaign filtering is skipped when the underlying field is missing.

**Suggested correction:** Agree the attribution model, map any equivalent native fields, and add only the custom fields the business actually intends to maintain. Do not silently treat unfiltered records as campaign-specific.

**Source:** [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:467](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L467), [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:936](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L936), [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:942](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L942), [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:946](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L946)

### A05 — Marketing and allocation source tables currently have no records

**Severity:** Medium · **Type:** Empty source / setup dependency · **Evidence:** Live counts under the supplied API user; not proof that every other role has the same visibility

**Affected:** Digital Marketing Dashboard, My Leads Dashboard, Lead Management Dashboard

Live permission-scoped counts returned zero for Marketing Channel, Marketing Daily Metrics, Marketing Budget, Marketing Content, Web Analytics Daily, and Lead Allocation. The map also recorded zero. My Leads uses Lead Allocation; Lead Management uses Leads Generation List and can still show its existing source leads.

**Effect:** Marketing charts lack source observations; My Leads has no allocation rows for this API user. Existing leads do not imply allocations or marketing performance data exist.

**Suggested correction:** Populate/verify the intended import and allocation workflows; distinguish not connected/not populated from measured zero performance. Verify with the target user roles as well.

**Source:** [02. Sales & CRM/My Leads/dashboard.js:3](../../02.%20Sales%20%26%20CRM/My%20Leads/dashboard.js#L3), [07. IT & Digital Systems/Digital Marketing Dashboard/dashboard.js:981](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js#L981)

### A06 — Credit Controller As-of Date does not produce historical outstanding

**Severity:** High · **Type:** Incorrect historical scope · **Evidence:** Confirmed from source

**Affected:** Credit Controller Dashboard

As-of date only changes due-date buckets. siBase() reads current outstanding_amount and has no posting_date <= asof filter. Past-date selections can therefore include invoices created after the selected date, and invoices paid since that date disappear from historical outstanding.

**Effect:** Past-date receivables and ageing do not represent balances as of that date. The current-date view is a different case and is not proven wrong by this finding.

**Suggested correction:** Use native Accounts Receivable/payment-ledger ageing at the selected date, or explicitly restrict the UI to current outstanding with an ageing reference date. A posting-date filter alone does not reconstruct settlements.

**Source:** [04. Finance & Credit Control/Credit Controller Dashboard/dashboard.js:67](../../04.%20Finance%20%26%20Credit%20Control/Credit%20Controller%20Dashboard/dashboard.js#L67), [04. Finance & Credit Control/Credit Controller Dashboard/dashboard.js:74](../../04.%20Finance%20%26%20Credit%20Control/Credit%20Controller%20Dashboard/dashboard.js#L74), [04. Finance & Credit Control/Credit Controller Dashboard/dashboard.js:96](../../04.%20Finance%20%26%20Credit%20Control/Credit%20Controller%20Dashboard/dashboard.js#L96)

### A07 — Credit Controller sums account-currency amounts without currency grouping

**Severity:** Medium · **Type:** Currency-scope risk · **Evidence:** Confirmed structural risk; currently open sales-invoice groups are SAR/SAR

**Affected:** Credit Controller Dashboard

Receivables use sum(outstanding_amount), and collections use sum(paid_amount), without grouping or normalizing their currency basis. The map defines outstanding_amount in party_account_currency and paid_amount in paid_from_account_currency. The note explicitly assumes company currency. Live open Sales Invoice groups are currently SAR/SAR, so mixed-currency receivables are a latent risk rather than an observed current mismatch.

**Effect:** Totals can mix incompatible currencies when companies/customer accounts/payment accounts use different currencies.

**Suggested correction:** Choose a company/currency scope; validate currencies, use the matching base payment field, and normalize outstanding via the party account currency.

**Source:** [04. Finance & Credit Control/Credit Controller Dashboard/dashboard.js:42](../../04.%20Finance%20%26%20Credit%20Control/Credit%20Controller%20Dashboard/dashboard.js#L42), [04. Finance & Credit Control/Credit Controller Dashboard/dashboard.js:96](../../04.%20Finance%20%26%20Credit%20Control/Credit%20Controller%20Dashboard/dashboard.js#L96), [04. Finance & Credit Control/Credit Controller Dashboard/dashboard.js:108](../../04.%20Finance%20%26%20Credit%20Control/Credit%20Controller%20Dashboard/dashboard.js#L108)

### A08 — Internal Controller duplicate counts stop at 300 groups

**Severity:** Medium · **Type:** Capped scan represented too strongly · **Evidence:** Confirmed cap; actual undercount is conditional on result volume

**Affected:** Finance internal  controller

dupGroups() fetches only 300 grouped rows, filters those groups to duplicates on the client, and reports g.length with conf=confirmed. It does not retrieve the total duplicate-group count or detect an additional page.

**Effect:** The matching groups shown are real, but the total number of duplicate groups can be understated above the cap. Whether the cap is reached for a particular selection was not measured.

**Suggested correction:** Count duplicate groups server-side with HAVING, paginate all groups, or mark the displayed figure as a capped lower bound.

**Source:** [04. Finance & Credit Control/Finance Internal Controller/dashboard.js:822](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/dashboard.js#L822), [04. Finance & Credit Control/Finance Internal Controller/dashboard.js:857](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/dashboard.js#L857)

### A09 — Closed-period check compares creation to period end, not closure time

**Severity:** Medium · **Type:** Control proxy / semantic mismatch · **Evidence:** Confirmed from source

**Affected:** Finance internal  controller

Even after the invalid disabled filter is fixed, the exception labelled Posted after accounting period was closed checks creation > end_date 23:59:59, then labels the count confirmed. A period end date does not establish when the period was actually closed. The query also does not prove the submit timestamp.

**Effect:** A legitimate backdated document created before a later closure can be labelled a confirmed posting-after-closure exception.

**Suggested correction:** Use an actual closure/submission audit trail if available. Otherwise relabel as an indicative backdated-document check and keep it separate from confirmed control violations.

**Source:** [04. Finance & Credit Control/Finance Internal Controller/dashboard.js:806](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/dashboard.js#L806), [04. Finance & Credit Control/Finance Internal Controller/dashboard.js:841](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/dashboard.js#L841), [04. Finance & Credit Control/Finance Internal Controller/dashboard.js:867](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/dashboard.js#L867)

### A10 — Vacation tracker omits earlier leaves and assumes unmatched past leaves completed

**Severity:** Medium · **Type:** Incomplete date scope / unverified status · **Evidence:** Confirmed from source

**Affected:** Employee Vacation Tracker

The initial Leave Application fetch excludes all leaves with to_date before January 1 of the current year, regardless of UI-selected range or whether a linked Employee Vacation Record remains overdue. It also restricts leave to two annual-leave types and durations strictly greater than two days. When no vacation record matches, a past leave becomes Completed without actual return evidence.

**Effect:** Earlier-year overdue cases and short annual leaves cannot appear; missing return tracking can look like a confirmed completion. The type/duration rules may be intentional policy and need business confirmation.

**Suggested correction:** Load the selected overlap range plus all still-open vacation records, clearly disclose the annual-leave scope, and mark unmatched past leaves Return unverified until a return record exists.

**Source:** [05. HR & Administration/Employee Vacation/dashboard.js:302](../../05.%20HR%20%26%20Administration/Employee%20Vacation/dashboard.js#L302), [05. HR & Administration/Employee Vacation/dashboard.js:324](../../05.%20HR%20%26%20Administration/Employee%20Vacation/dashboard.js#L324), [05. HR & Administration/Employee Vacation/dashboard.js:349](../../05.%20HR%20%26%20Administration/Employee%20Vacation/dashboard.js#L349)

### A11 — Production dashboard omits mapped child data needed for its key metrics

**Severity:** High · **Type:** Incomplete implementation · **Evidence:** Confirmed from source

**Affected:** Production Dashboard

Cost source fetches only name/modified even though Daily Production Cost has date, branch, details and total_cost_summary. Cost, materials, workforce and quality views explicitly show placeholders. Stock Entry fetch omits Stock Entry Detail; Factory Daily Production fetch omits its detail rows. Manufacturing Factory/warehouse mappings exist in the map, but this dashboard hardcodes two warehouse/branch mappings instead.

**Effect:** Costs, material consumption, scrap, workforce hours and quality/yield are not implemented, and additional factories are outside its two-factory mapping. This is disclosed in the UI rather than false zero data.

**Suggested correction:** Design a permission-checked aggregate API over the mapped detail tables; resolve factories from Manufacturing Factory and its warehouse table; reconcile units and cost basis before enabling totals.

**Source:** [08. Operations & Logistics/Production Dashboard/dashboard.js:25](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.js#L25), [08. Operations & Logistics/Production Dashboard/dashboard.js:87](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.js#L87), [08. Operations & Logistics/Production Dashboard/dashboard.js:258](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.js#L258), [08. Operations & Logistics/Production Dashboard/dashboard.js:594](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.js#L594), [08. Operations & Logistics/Production Dashboard/dashboard.js:623](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.js#L623), [08. Operations & Logistics/Production Dashboard/dashboard.js:641](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.js#L641)

### A12 — Production uses document rather than the supplied block root

**Severity:** Medium · **Type:** Runtime hosting risk · **Evidence:** Confirmed root-selection behavior; actual browser impact requires host verification

**Affected:** Production Dashboard

Initialization calls document.querySelector(".pcc") and returns immediately if it finds no element. It never uses root_element. A class inside the Custom HTML Block shadow root is not discoverable from document.querySelector.

**Effect:** When hosted in the shadow-root setup described by the other blocks, the live script does not initialize; a matching element elsewhere could also select the wrong instance. The browser flow was not exercised.

**Suggested correction:** Resolve the host through root_element with a document fallback, then test in the actual ERP workspace.

**Source:** [08. Operations & Logistics/Production Dashboard/dashboard.js:15](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.js#L15)

### A13 — CEO Legal/Taradhi figures are a static journal reference

**Severity:** Medium · **Type:** Static source / missing integration · **Evidence:** Confirmed from source

**Affected:** CEO Command Center

The legal API defines a fixed list of 14 entries copied from one journal entry, all classified legal. It never queries Taradhi Cases, Court Cases or Legal Case List and never refreshes the reference amounts from the ledger. The UI/API explicitly label it static; sales-support enquiry SLA is also explicitly unconnected.

**Effect:** These CEO tabs cannot serve as live case balances/statuses or enquiry SLA, even though the dedicated Legal Dashboard queries the actual case DocTypes.

**Suggested correction:** Retain the reference as a separately labelled snapshot; implement a distinct live legal/case pipeline and verified enquiry timestamps if those figures are required.

**Source:** [01. Leadership & Corporate/CEO Command Center/server_scripts/ceo_command_center_legal_taradhi_dee38552.py:1](../../01.%20Leadership%20%26%20Corporate/CEO%20Command%20Center/server_scripts/ceo_command_center_legal_taradhi_dee38552.py#L1), [01. Leadership & Corporate/CEO Command Center/server_scripts/ceo_command_center_legal_taradhi_dee38552.py:12](../../01.%20Leadership%20%26%20Corporate/CEO%20Command%20Center/server_scripts/ceo_command_center_legal_taradhi_dee38552.py#L12), [01. Leadership & Corporate/CEO Command Center/dashboard.js:3291](../../01.%20Leadership%20%26%20Corporate/CEO%20Command%20Center/dashboard.js#L3291)

### A14 — Fleet fuel portal is not connected

**Severity:** Medium · **Type:** Unconnected integration · **Evidence:** Confirmed from source

**Affected:** Fleet Dashboard

ALDREES_API_METHOD is the empty string. The dashboard intentionally renders API not connected for the portal-backed fuel figures. Existing ERP fuel records are a separate source.

**Effect:** Portal balance/transactions/consumption cannot be complete through this block.

**Suggested correction:** Implement and configure the approved server-side proxy; keep ERP and portal measurements clearly distinguished.

**Source:** [08. Operations & Logistics/Fleet Dashboard/dashboard.js:23](../../08.%20Operations%20%26%20Logistics/Fleet%20Dashboard/dashboard.js#L23), [08. Operations & Logistics/Fleet Dashboard/dashboard.js:24](../../08.%20Operations%20%26%20Logistics/Fleet%20Dashboard/dashboard.js#L24), [08. Operations & Logistics/Fleet Dashboard/dashboard.js:1305](../../08.%20Operations%20%26%20Logistics/Fleet%20Dashboard/dashboard.js#L1305)

### A15 — DMCC reads Base44 entities and includes a client-side API key

**Severity:** High · **Type:** External source / exposed credential · **Evidence:** Confirmed from source

**Affected:** DMCC Dashboard

The dashboard fetches an external Base44 endpoint and entity names such as Invoice, PurchaseOrder and ReturnNote, not native ERPNext DocTypes. The script embeds an API key and sends it in x-api-key. The key value is intentionally omitted from this report; the external service was not called.

**Effect:** The ERP map cannot validate the external entity schema, synchronization, permissions or balances. The key is visible to anyone able to inspect the delivered script.

**Suggested correction:** Document the ERP-to-external mapping and sync ownership; move privileged external access behind a server-side authorized proxy and rotate the exposed key through the service owner.

**Source:** [01. Leadership & Corporate/DMCC Dashboard/dashboard.js:3](../../01.%20Leadership%20%26%20Corporate/DMCC%20Dashboard/dashboard.js#L3), [01. Leadership & Corporate/DMCC Dashboard/dashboard.js:7](../../01.%20Leadership%20%26%20Corporate/DMCC%20Dashboard/dashboard.js#L7), [01. Leadership & Corporate/DMCC Dashboard/dashboard.js:20](../../01.%20Leadership%20%26%20Corporate/DMCC%20Dashboard/dashboard.js#L20)

### A16 — Inventory Dashboard is an external BI iframe

**Severity:** Low · **Type:** External source / audit limitation · **Evidence:** Confirmed from source

**Affected:** Inventory Dashboard

The HTML is an external public-dashboard iframe and the JavaScript source is empty. Its underlying queries/model are not present in this repository or the ERP map.

**Effect:** No conclusion about its DocTypes, selected fields, stock valuation, filtering or row completeness can be made from these files.

**Suggested correction:** Obtain the BI questions/model SQL, data-source details and refresh schedule for a separate reconciliation.

**Source:** [03. Procurement & Supply Chain/Inventory Dashboard/dashboard.html:1](../../03.%20Procurement%20%26%20Supply%20Chain/Inventory%20Dashboard/dashboard.html#L1)

### A17 — Executive Secretary limits queues to 400 without completeness metadata

**Severity:** Medium · **Type:** Silent capped dataset · **Evidence:** Confirmed cap; actual current omissions are conditional

**Affected:** Executive Secretary

max_rows=400 truncates the admin request query and each letters/memos query. Bootstrap returns rows/errors and config, but not source totals or a capped flag. Request closed-state filtering occurs after SQL LIMIT; old open requests are separately excluded by the 180-day lookback.

**Effect:** KPI/table totals are bounded queue counts and may omit qualifying records without a truncation warning. Actual current cap activation was not measured.

**Suggested correction:** Return matching counts and has_more per section, apply state filters before limiting, and paginate or label bounded queue KPIs. Make the lookback policy explicit.

**Source:** [05. HR & Administration/Executive Secretary/exec_admin_api_server_script.py:21](../../05.%20HR%20%26%20Administration/Executive%20Secretary/exec_admin_api_server_script.py#L21), [05. HR & Administration/Executive Secretary/exec_admin_api_server_script.py:27](../../05.%20HR%20%26%20Administration/Executive%20Secretary/exec_admin_api_server_script.py#L27), [05. HR & Administration/Executive Secretary/exec_admin_api_server_script.py:91](../../05.%20HR%20%26%20Administration/Executive%20Secretary/exec_admin_api_server_script.py#L91), [05. HR & Administration/Executive Secretary/exec_admin_api_server_script.py:157](../../05.%20HR%20%26%20Administration/Executive%20Secretary/exec_admin_api_server_script.py#L157), [05. HR & Administration/Executive Secretary/exec_admin_api_server_script.py:263](../../05.%20HR%20%26%20Administration/Executive%20Secretary/exec_admin_api_server_script.py#L263)

### A18 — Blocked Customer cards count customer-salesperson rows as customers

**Severity:** Medium · **Type:** Join-grain risk · **Evidence:** Confirmed query structure from map; observed inflation not established

**Affected:** CP Blocked Customer, CSD Blocked Customer, EP Blocked Customer, MP Blocked Customer, SRD Blocked Customer, WP Blocked Customer

All six mapped reports aggregate invoices by customer, join Customer Sales Team, then group detail rows by customer and salesperson. The cards count report rows and sum each row outstanding. If a customer has multiple qualifying salespersons, its full customer-level balance can appear more than once. The queries also hardcode one company, which is a deliberate fixed scope rather than all companies.

**Effect:** Customer counts/blocked percentages and balances can be inflated by one-to-many salesperson assignments. Actual duplicate assignments were not counted in live data.

**Suggested correction:** Choose whether the grain is customer or customer-salesperson. For company/customer KPIs, deduplicate on customer ID and compute balances once, or allocate an explicit split.

**Source:** [04. Finance & Credit Control/Blocked Customer Dashboard/CP Blocked Customer/dashboard.js:55](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/CP%20Blocked%20Customer/dashboard.js#L55), [04. Finance & Credit Control/Blocked Customer Dashboard/CP Blocked Customer/dashboard.js:58](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/CP%20Blocked%20Customer/dashboard.js#L58)

The mapped SQL for each Blocked Customer Percent report joins Customer to Sales Team and groups output by customer ID plus salesperson. The map evidence is copied below for review without customer record data:

```sql
INNER JOIN `tabSales Team` st ON st.parent = c.name AND st.parenttype = 'Customer'
GROUP BY k.k, CASE WHEN k.k = 1 THEN b.cid END, CASE WHEN k.k = 1 THEN b.salesperson END
```

### A19 — ERP User Access is missing its directory API source in the organized folder

**Severity:** Low · **Type:** Incomplete local dependency export · **Evidence:** Confirmed from source

**Affected:** ERP User Access Dashboard

The browser calls /api/method/user_access_directory?..., but its organized server_scripts directory has no user_access_directory script. The complete ignored ERP snapshot does contain the enabled API. The exporter matches quoted method literals ending at a quote, so a URL ending in ? escapes its match.

**Effect:** The local package is incomplete for editing/reviewing the User Directory endpoint. This is a local export defect, not evidence that the live endpoint is missing.

**Suggested correction:** Include that source and teach dependency discovery to parse API URLs, including query strings, rather than relying only on exact quoted text.

**Source:** [07. IT & Digital Systems/ERP User Access/dashboard.js:72](../../07.%20IT%20%26%20Digital%20Systems/ERP%20User%20Access/dashboard.js#L72), [tools/erp/export_erp_dashboards.py:80](../../tools/erp/export_erp_dashboards.py#L80), [tools/erp/organize_dashboards.py:63](../../tools/erp/organize_dashboards.py#L63)

### A20 — Customer Dashboard and PN Dashboard are placeholders

**Severity:** Low · **Type:** Missing dashboard implementation · **Evidence:** Confirmed from source

**Affected:** Customer Dashboard, PN Dashboard

Only README placeholders exist; no exact Custom HTML Block was identified and no JS/CSS/HTML implementation was exported for these labels.

**Effect:** These two entries cannot be audited or edited as functioning dashboards yet.

**Suggested correction:** Resolve their actual ERP source names or confirm that they are new dashboard requests.

**Source:** [02. Sales & CRM/Customer Dashboard/README.md:3](../../02.%20Sales%20%26%20CRM/Customer%20Dashboard/README.md#L3), [11. To Be Classified/PN Dashboard/README.md:3](../../11.%20To%20Be%20Classified/PN%20Dashboard/README.md#L3)

## Dashboard-by-dashboard coverage

A blank finding column means no additional defect was confirmed in resolved static checks. It does not certify full correctness. Query-candidate counts can be zero for dashboards driven entirely by a custom API, report, or iframe.

| Dashboard | JS query/config candidates | Python native-call candidates | Finding IDs |
| --- | ---: | ---: | --- |
| [CEO Command Center](../../01.%20Leadership%20%26%20Corporate/CEO%20Command%20Center/README.md) | 4 | 84 | A13 |
| [CEO Agent](../../01.%20Leadership%20%26%20Corporate/CEO%20Agent/README.md) | 0 | 15 | No additional confirmed defect |
| [DMCC Dashboard](../../01.%20Leadership%20%26%20Corporate/DMCC%20Dashboard/README.md) | 0 | 0 | A15 |
| [My Leads Dashboard](../../02.%20Sales%20%26%20CRM/My%20Leads/README.md) | 1 | 43 | A05 |
| [Lead Management Dashboard](../../02.%20Sales%20%26%20CRM/Lead%20Management/README.md) | 4 | 43 | A05 |
| [DMS Sales Manager Dashboard](../../02.%20Sales%20%26%20CRM/DMS%20Sales%20Management/README.md) | 1 | 43 | No additional confirmed defect |
| [Sales CRM & Conversion Tracker Dashboard](../../02.%20Sales%20%26%20CRM/Quotation%20%26%20SO%20Tracker/README.md) | 26 | 0 | No additional confirmed defect |
| [Pre-Procurement Command Center](../../03.%20Procurement%20%26%20Supply%20Chain/Pre-Procurement/README.md) | 10 | 0 | No additional confirmed defect |
| [DN & GRN Tracker Dashboard](../../03.%20Procurement%20%26%20Supply%20Chain/DN%20%26%20GRN%20Tracker/README.md) | 6 | 0 | No additional confirmed defect |
| [Customs & Post-Procurement Dashboard](../../03.%20Procurement%20%26%20Supply%20Chain/Customs%20%26%20Post-Processing/README.md) | 34 | 0 | A01 |
| [Inventory Dashboard](../../03.%20Procurement%20%26%20Supply%20Chain/Inventory%20Dashboard/README.md) | 0 | 0 | A16 |
| [Accounts Payable Dashboard](../../04.%20Finance%20%26%20Credit%20Control/Accounts%20Payable/README.md) | 14 | 0 | A01 |
| [Treasury Dashboard](../../04.%20Finance%20%26%20Credit%20Control/Treasury%20Dashboard/README.md) | 0 | 2 | No additional confirmed defect |
| [Payroll cost center dashboard](../../04.%20Finance%20%26%20Credit%20Control/Payroll%20Cost%20Center/README.md) | 32 | 0 | No additional confirmed defect |
| [VAT & ZATCA Command Center](../../04.%20Finance%20%26%20Credit%20Control/VAT%20%26%20ZATCA%20Compliance/README.md) | 30 | 0 | No additional confirmed defect |
| [Credit Controller Dashboard](../../04.%20Finance%20%26%20Credit%20Control/Credit%20Controller%20Dashboard/README.md) | 7 | 0 | A06; A07 |
| [CP Blocked Customer](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/CP%20Blocked%20Customer/README.md) | 0 | 0 | A18 |
| [CSD Blocked Customer](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/CSD%20Blocked%20Customer/README.md) | 0 | 0 | A18 |
| [EP Blocked Customer](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/EP%20Blocked%20Customer/README.md) | 0 | 0 | A18 |
| [MP Blocked Customer](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/MP%20Blocked%20Customer/README.md) | 0 | 0 | A18 |
| [SRD Blocked Customer](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/SRD%20Blocked%20Customer/README.md) | 0 | 0 | A18 |
| [WP Blocked Customer](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/WP%20Blocked%20Customer/README.md) | 0 | 0 | A18 |
| [SOA Request Dashboard](../../04.%20Finance%20%26%20Credit%20Control/SOA%20Request%20Dashboard/README.md) | 0 | 136 | No additional confirmed defect |
| [SOA Manager](../../04.%20Finance%20%26%20Credit%20Control/SOA%20Manager/README.md) | 0 | 136 | No additional confirmed defect |
| [SOA Collector](../../04.%20Finance%20%26%20Credit%20Control/Collector/README.md) | 0 | 90 | No additional confirmed defect |
| [Finance Manager dashboard](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Manager%20Dashboard/README.md) | 0 | 46 | No additional confirmed defect |
| [Finance internal  controller](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/README.md) | 48 | 0 | A01; A02; A08; A09 |
| [Admin HR Dashboard](../../05.%20HR%20%26%20Administration/Admin%20HR%20Dashboard/README.md) | 10 | 61 | No additional confirmed defect |
| [Admin & HR Platforms Expiry Dashboard](../../05.%20HR%20%26%20Administration/Admin%20%26%20HR%20Platform/README.md) | 8 | 0 | No additional confirmed defect |
| [Employee Dashboard Prototype](../../05.%20HR%20%26%20Administration/Employee%20Dashboard/README.md) | 2 | 58 | No additional confirmed defect |
| [Employee Vacation Tracker](../../05.%20HR%20%26%20Administration/Employee%20Vacation/README.md) | 4 | 0 | A10 |
| [Govt Relation Dashboard](../../05.%20HR%20%26%20Administration/Government%20Relations%20Dashboard/README.md) | 21 | 0 | No additional confirmed defect |
| [DM Technical Department Command Center](../../06.%20Technical%20%26%20Projects/Technical%20Department/README.md) | 11 | 0 | No additional confirmed defect |
| [DMS Technical Department Dashboard](../../06.%20Technical%20%26%20Projects/DMS%20Technical%20Department/README.md) | 0 | 8 | No additional confirmed defect |
| [DMS My Projects Dashboard](../../06.%20Technical%20%26%20Projects/My%20DMS%20Projects/README.md) | 0 | 25 | No additional confirmed defect |
| [DM contracting Dept. Dashboard](../../06.%20Technical%20%26%20Projects/DM%20Contracting%20Dashboard/README.md) | 72 | 0 | No additional confirmed defect |
| [DM IT Asset Acquisition Dashboard](../../07.%20IT%20%26%20Digital%20Systems/IT%20Asset%20Acquisition/README.md) | 4 | 0 | No additional confirmed defect |
| [IT Platforms Expiry Dashboard](../../07.%20IT%20%26%20Digital%20Systems/IT%20Platforms%20Expiry/README.md) | 2 | 0 | No additional confirmed defect |
| [ERP User Access Dashboard](../../07.%20IT%20%26%20Digital%20Systems/ERP%20User%20Access/README.md) | 0 | 4 | A19 |
| [Digital Marketing Dashboard](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/README.md) | 27 | 0 | A03; A04; A05 |
| [Fleet Dashboard](../../08.%20Operations%20%26%20Logistics/Fleet%20Dashboard/README.md) | 35 | 0 | A14 |
| [FM & Inventory Dashboard](../../08.%20Operations%20%26%20Logistics/FM%20%26%20Inventory%20Dashboard/README.md) | 15 | 0 | No additional confirmed defect |
| [Logistics Dashboard](../../08.%20Operations%20%26%20Logistics/Logistics%20Dashboard/README.md) | 15 | 0 | No additional confirmed defect |
| [Operation Dashboard](../../08.%20Operations%20%26%20Logistics/Operation%20Dashboard/README.md) | 35 | 0 | No additional confirmed defect |
| [Delivery Forklift Dashboard](../../08.%20Operations%20%26%20Logistics/Delivery%20%26%20Forklift/README.md) | 0 | 2 | No additional confirmed defect |
| [Scaffolding rental - Employee Dashboard](../../08.%20Operations%20%26%20Logistics/Scaffolding%20Rental/README.md) | 46 | 0 | No additional confirmed defect |
| [Manufacturing Dashboard](../../08.%20Operations%20%26%20Logistics/Manufacturing%20Dashboard/README.md) | 1 | 21 | No additional confirmed defect |
| [Production Dashboard](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/README.md) | 6 | 0 | A11; A12 |
| [Plant & Furniture Asset Dashboard](../../08.%20Operations%20%26%20Logistics/Plant%20%26%20Furniture%20Asset%20Dashboard/README.md) | 23 | 0 | No additional confirmed defect |
| [Taradhi/Legal Dashboard](../../09.%20Legal%20%26%20Documentation/Legal%20Dashboard/README.md) | 4 | 0 | No additional confirmed defect |
| [DM Document Control Command Center](../../09.%20Legal%20%26%20Documentation/Document%20Control/README.md) | 65 | 0 | No additional confirmed defect |
| [Durar Messenger](../../10.%20Communication%20%26%20Productivity/Durar%20Messenger/README.md) | 0 | 3 | No additional confirmed defect |
| [Durar Sheets](../../10.%20Communication%20%26%20Productivity/Durar%20Sheets/README.md) | 6 | 26 | No additional confirmed defect |
| [Executive Secretary](../../05.%20HR%20%26%20Administration/Executive%20Secretary/README.md) | 0 | 3 | A17 |

## Supporting files

- [Findings CSV](findings.csv)
- [Findings JSON](findings.json)
- [Per-dashboard coverage and referenced DocTypes](dashboard-coverage.csv)
- [Live schema, query-error and source-count evidence](live-evidence.json)

The live evidence intentionally contains metadata and grouped counts, not invoice amounts, invoice IDs, passwords or the exposed DMCC API key.
