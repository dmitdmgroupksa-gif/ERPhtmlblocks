# Manual deployment checklist — latest local versions

Nothing from this remediation has been deployed to ERP. This checklist includes the original A01–A20 findings and the later HTML-only follow-up. Deploy each listed block once using its latest file, which already includes the earlier and later fixes.

## Paste rules

1. Save/export the current live block and related Server Script before replacing them. The local original snapshots predate your deployment; keep a fresh live copy for rollback.
2. Search ERP for **Custom HTML Block**, then open the exact block name below.
3. Copy the entire JavaScript file into **Script**. Do not wrap it in `<script>` tags. Copy CSS into **Style**, and HTML into **HTML**, only where explicitly instructed.
4. For Python, open **Server Script**. Match the existing **API Method**, not just its display name. Replace its Script field with the entire `.py` file. Use **Script Type = API**. Do not create duplicate enabled APIs with the same method.
5. Save, hard-refresh the relevant workspace, and test as a real intended reader. Update only the records listed here; native Workspaces, Reports, Number Cards and Charts are outside this deployment.
6. `.json` source records are original snapshots/schema specifications, not code to paste into Script fields. Editable `.js`, `.css`, `.html` and `.py` files are authoritative for these changes.

## Deploy in this order

### 1. Accounts Payable — A01

- Custom HTML Block: **Accounts Payable Dashboard**.
- Replace **Script** with [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Accounts%20Payable/dashboard.js).
- Leave HTML and Style unchanged.
- Verify an open purchase invoice whose invoice currency is USD/AED and party account currency is SAR: displayed outstanding must equal the already-SAR outstanding, without another exchange-rate multiplication.

### 2. Finance Internal Controller — A01, A02, A08, A09

- Custom HTML Block: **Finance internal  controller** (two spaces before `controller` in the ERP name).
- Replace **Script** with [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Finance%20Internal%20Controller/dashboard.js).
- Verify: AP balance uses the correct party currency; the accounting-period check has no `disabled` error; duplicate groups are paginated; the closed-period/backdating proxy is labelled indicative, not a proven posting-after-closure violation.

### 3. Customs — A01

- Custom HTML Block: **Customs & Post-Procurement Dashboard**.
- Replace **Script** with [dashboard.js](../../03.%20Procurement%20%26%20Supply%20Chain/Customs%20%26%20Post-Processing/dashboard.js).
- Verify supplier-invoice outstanding on a foreign-currency document with a SAR party account. Leave HTML and Style unchanged.

### 4. Digital Marketing — A03, A04, A05

- Custom HTML Block: **Digital Marketing Dashboard**.
- Replace **Script** with [dashboard.js](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/dashboard.js).
- The JavaScript can be deployed before adding attribution fields; missing capabilities remain visibly unavailable.
- To enable attribution, create the optional **Custom Field** records described in [custom_fields.json](../../07.%20IT%20%26%20Digital%20Systems/Digital%20Marketing%20Dashboard/custom_fields.json). Use the exact fieldnames; do not create duplicate fields.

| Parent DocType | Fieldname | Fieldtype / Link target |
| --- | --- | --- |
| Leads Generation List | marketing_channel | Link → Marketing Channel |
| Leads Generation List | campaign | Link → Campaign |
| Lead Allocation | marketing_channel | Link → Marketing Channel |
| Lead Allocation | campaign | Link → Campaign |
| Lead Allocation | deal_value | Currency |
| Lead Allocation | converted_customer | Link → Customer |
| Lead Allocation | lost_reason | Small Text |
| Lead | marketing_channel | Link → Marketing Channel |

- `deal_value` must follow the dashboard's displayed SAR value convention; do not enter foreign-currency amounts without a defined conversion.
- Populate genuine Marketing Channel, Marketing Daily Metrics, Marketing Budget, Marketing Content and Web Analytics Daily records. Allocate leads through the normal authorized workflow. Do not invent metrics or allocations to remove empty states.
- Verify web charts read `average_session_duration` and `average_position`. If a campaign field is absent, a campaign-specific view must say unavailable rather than silently use unfiltered data.
- **Remaining:** imports, historical attribution and real source data are not installed by this code change.

### 5. Credit Controller — A06, A07 and later cross-page discrepancies

- Custom HTML Block: **Credit Controller Dashboard**.
- Replace **Script** with [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Credit%20Controller%20Dashboard/dashboard.js). This single file includes both rounds of fixes.
- Select a company. Verify the current-date scope, explicit gross-customer-receipt label and positive-limit company count.
- Open the credit-limit and collections tabs. Their cross-page reference panel uses the existing native **Over Credit Limit Customer** and **Collection Analysis Report** reports across all companies. The reader needs permission to run those reports; unavailable references must not become zero.
- Confirm generated report total rows are not summed twice.
- Gross receipts and the legacy adjusted salesperson report are deliberately separate figures, with their different definitions disclosed. No VAT rule, native report or historic ledger has been changed.
- **Remaining:** use native Accounts Receivable for historical balances and foreign-party ageing. This custom screen is not a historical-balance reconstruction.

### 6. Employee Vacation — A10

- Custom HTML Block: **Employee Vacation Tracker**.
- Replace **Script** with [dashboard.js](../../05.%20HR%20%26%20Administration/Employee%20Vacation/dashboard.js).
- Verify earlier-year and one/two-day annual leaves are eligible. A past leave with no return record must show **Return Unverified**, not Completed.
- Scope remains the two configured annual-leave types; it has not become an all-leave-type tracker.

### 7. Production — A11, A12

- Custom HTML Block: **Production Dashboard**.
- Replace **Script** with [dashboard.js](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.js).
- Also replace **HTML** with [dashboard.html](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.html) and **Style** with [dashboard.css](../../08.%20Operations%20%26%20Logistics/Production%20Dashboard/dashboard.css). The live shell and controls require all three latest files together.
- Review existing **Manufacturing Factory** records: active flag, company, legacy branch label and warehouse mapping. Confirm a warehouse mapping only when Operations has verified it; do not mark all mappings Confirmed merely to populate a chart.
- Test inside the real Custom HTML Block host. Verify factory/date filters, permission-checked stock/activity/cost detail reads, separate item/UOM quantities and explicit incomplete-source states.
- Recorded process cost is not a fully reconciled financial manufacturing cost. Capacity calendars, financial cost reconciliation and agreed quality/yield definitions remain incomplete.

### 8. CEO live Legal/Taradhi — A13

1. Open Server Script **CEO Command Center Legal Taradhi API**; confirm API Method **ceo_command_center_legal_taradhi**.
2. Replace Script with [ceo_command_center_legal_taradhi_dee38552.py](../../01.%20Leadership%20%26%20Corporate/CEO%20Command%20Center/server_scripts/ceo_command_center_legal_taradhi_dee38552.py). Save.
3. Open Custom HTML Block **CEO Command Center**. Replace Script with [dashboard.js](../../01.%20Leadership%20%26%20Corporate/CEO%20Command%20Center/dashboard.js). Save.
4. Verify Legal/Taradhi show accessible live case records, not the old fixed journal list. Company filtering must count unresolved links rather than assign them to a guessed company.
5. No combined financial case total is inferred because the case DocTypes have no currency field. Enquiry SLA still requires an agreed source/timestamp.

### 9. Inventory — A16 and later external-inventory inconsistency

- Custom HTML Block: **Inventory Dashboard**, not **FM & Inventory Dashboard**.
- Replace **HTML** with [dashboard.html](../../03.%20Procurement%20%26%20Supply%20Chain/Inventory%20Dashboard/dashboard.html).
- Replace **Style** with [dashboard.css](../../03.%20Procurement%20%26%20Supply%20Chain/Inventory%20Dashboard/dashboard.css).
- Replace **Script** with [dashboard.js](../../03.%20Procurement%20%26%20Supply%20Chain/Inventory%20Dashboard/dashboard.js).
- This replaces the external public BI iframe with native current Bin balances. It does not edit or repair the external BI model.
- Select one company; compare an item/warehouse balance and stock value to the native stock reports. The displayed row count is **item/warehouse balances**, not distinct items. Mixed-unit quantities are not totalled.

### 10. Executive Secretary — A17

- Locate the Server Script with API Method **exec_admin_api**; the live export named it **exec_admin_api**, while the local header calls it EXEC ADMIN API. Match the method.
- Replace Script with [exec_admin_api_server_script.py](../../05.%20HR%20%26%20Administration/Executive%20Secretary/exec_admin_api_server_script.py). If the API does not exist, create it with Script Type API and that exact method.
- Deploy the matching local interface together to Custom HTML Block **Executive Secretary Dashboard**:
  - Script: [exec_admin_dashboard.js](../../05.%20HR%20%26%20Administration/Executive%20Secretary/exec_admin_dashboard.js).
  - Style: [exec_admin_dashboard.css](../../05.%20HR%20%26%20Administration/Executive%20Secretary/exec_admin_dashboard.css).
  - HTML: **empty**; this JavaScript builds the interface.
- Verify a permitted executive-secretary user can load queues and that older open requests are no longer silently discarded by the former 180-day/400-row limits. The register keeps its disclosed 90-day-plus-drafts scope.

### 11. Six Blocked Customer percentage cards — A18

Replace only the Script field of each matching Custom HTML Block:

| Block | Script |
| --- | --- |
| CP Blocked Customer | [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/CP%20Blocked%20Customer/dashboard.js) |
| CSD Blocked Customer | [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/CSD%20Blocked%20Customer/dashboard.js) |
| EP Blocked Customer | [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/EP%20Blocked%20Customer/dashboard.js) |
| MP Blocked Customer | [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/MP%20Blocked%20Customer/dashboard.js) |
| SRD Blocked Customer | [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/SRD%20Blocked%20Customer/dashboard.js) |
| WP Blocked Customer | [dashboard.js](../../04.%20Finance%20%26%20Credit%20Control/Blocked%20Customer%20Dashboard/WP%20Blocked%20Customer/dashboard.js) |

- Verify one customer assigned to multiple salespersons is counted once in the percentage cards. Conflicting duplicate balances must be rejected, not arbitrarily chosen.
- Do not alter the native report SQL. The separate MP Blocked Customers report has not been assumed to share the percentage-report contract.

### 12. Pre-Procurement — latest HTML-only finding

- Custom HTML Block: **Pre-Procurement Command Center**.
- Replace **Script** with [dashboard.js](../../03.%20Procurement%20%26%20Supply%20Chain/Pre-Procurement/dashboard.js).
- Verify the new explanation and oldest-due/backlog counts match the selected company/issue-date scope.
- The overdue rule remains based on the recorded required/delivery date. Old due dates need Procurement review; no request/PO should be bulk-closed or redated as part of this deployment.

### 13. Contracting heading — latest HTML-only finding

- Custom HTML Block: **DM contracting Dept. Dashboard**.
- Replace **Script** with [dashboard.js](../../06.%20Technical%20%26%20Projects/DM%20Contracting%20Dashboard/dashboard.js).
- Verify `undefined` above the title is replaced by a meaningful title, while any intentionally configured heading remains unchanged. No Workspace edit is needed.

### 14. Scaffolding heading — latest HTML-only finding

- Custom HTML Block: **Scaffolding rental - Employee Dashboard**.
- Replace **Script** with [dashboard.js](../../08.%20Operations%20%26%20Logistics/Scaffolding%20Rental/dashboard.js).
- Verify the same scoped heading repair; leave HTML and Style unchanged.

### 15. DMCC — A15, deploy only after server configuration

1. Have the external service owner rotate the exposed API key. The old key remains in previous Git history; removing it from the current browser code does not revoke it.
2. Have a system administrator install the custom Single DocType described by [dmcc_integration_settings.json](../../01.%20Leadership%20%26%20Corporate/DMCC%20Dashboard/dmcc_integration_settings.json). This JSON is a schema specification, not a Custom HTML Block Script. Fields: Enabled (Check) and API Key (Password); settings access is System Manager only.
3. Enter the new external key in the Password field. Keep settings disabled while configuring.
4. Create API Server Script with API Method **dmcc_dashboard_proxy**, using [dmcc_dashboard_proxy.py](../../01.%20Leadership%20%26%20Corporate/DMCC%20Dashboard/server_scripts/dmcc_dashboard_proxy.py).
5. Confirm intended readers match the proxy's explicit role gate: Administrator, System Manager, Accounts Manager or CEO. Verify the proxy runs under the site's Server Script runtime and can reach the external service. Its runtime has not yet been tested live.
6. Enable settings and test the proxy under an authorized account.
7. Only then replace Script in Custom HTML Block **DMCC Dashboard** with [dashboard.js](../../01.%20Leadership%20%26%20Corporate/DMCC%20Dashboard/dashboard.js).
8. Verify browser requests go to the same-origin `dmcc_dashboard_proxy` endpoint and no external API key is delivered to the browser.

Do not deploy the new browser script alone while the proxy/settings are absent. Base44 schema/sync reconciliation remains a separate integration task.

## Findings with no immediate live paste

### 16. Fleet/Aldrees — A14

No new working portal connector is available. Leave the existing ERP fuel-purchase fallback and explicit portal-unavailable state. Obtain the provider endpoint/authentication and a server-side connector before enabling portal balances/statements. Do not enter portal credentials in dashboard.js.

### 17. ERP User Access dependency — A19

No live change is needed: **ERP User Access - Directory API**, method **user_access_directory**, already exists. The fix restored its missing local export. Keep [user_access_directory.py](../../07.%20IT%20%26%20Digital%20Systems/ERP%20User%20Access/server_scripts/user_access_directory.py) for review; do not replace a working live API merely to fix a local packaging issue.

### 18. PN/Customer placeholders — A20

No live deletion is needed. The unused placeholders were removed from this repository. Do not delete the native Customer Dashboard Workspace; it is a different source and is outside the HTML-only scope.

## Final verification and rollback

- Test the changed HTML blocks as their intended users, not only Administrator. Check browser console/network errors and compare a few source records with displayed figures.
- The seventeen local regression checks and syntax checks do not replace browser/Server Script runtime validation on the site.
- Deploy one block/group at a time. If a check fails, restore that block's freshly saved original fields. For paired API/UI updates, restore both versions together.
- Leave native AR/Sales Comparison date settings, Supplier Payment Analysis, Management Insights, Payroll onboarding, Dashboards/IT navigation, native customer colors and external Technical BI unchanged under this scope.
