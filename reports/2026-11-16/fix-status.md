# Dashboard remediation status

These are local source changes. No Custom HTML Block, Server Script, schema, allocation, or business record has been written to the live ERP site.

| Finding | Local result | Remaining work |
| --- | --- | --- |
| A01 | Corrected party-currency conversion in Accounts Payable, Internal Controller and Customs; unsupported currency bases fail explicitly. | Deploy browser sources and validate target-user company permissions. |
| A02 | Removed nonexistent Accounting Period.disabled filter. Corrected native query succeeds in a live read-only probe. | Deploy browser source. |
| A03 | Both field requests and chart reads use average_session_duration / average_position. | Deploy browser source. |
| A04 | Prepared eight optional Custom Field definitions in the marketing folder. Campaign-specific queries now fail visibly when their campaign field is missing. | Review/install fields, then populate actual attribution. No historical attribution is inferred. |
| A05 | Empty marketing source datasets are presented as unavailable/setup-needed rather than measured zero performance. | Real imports/budgets/content and authorized lead allocations are still required. An empty table cannot be repaired by inventing business records. |
| A06 | Credit Controller explicitly supports current balances; disabled date input no longer promises historical reconstruction. The native Accounts Receivable report is the historical path. | Historical balances inside this custom screen would require a separate native-report-backed implementation. |
| A07 | Company selection is required; picker restricts company base currency to display currency. Receivables explicitly restrict party currency; collections use base_received_amount and Customer party type. | Use native Accounts Receivable for foreign-party balances. This screen does not claim complete foreign-currency coverage. |
| A08 | Duplicate groups paginate to exhaustion with stable ordering. Removed the top-300 total. | Deploy source; verify grouped-list access under target roles. |
| A09 | Relabelled period-end proxy as indicative backdating in a currently closed period. Removed the assertion that period end is actual closure/submission time. | Actual posting-after-closure certification requires an audit trail of closure and submission events. |
| A10 | Removed current-year cutoff and two-day exclusion. Past leaves without return records show Return Unverified. Earlier overdue records are no longer automatically marked completed. | Confirm the existing two annual-leave types remain the desired scope. |
| A11 | Production reads permission-checked parent documents with stock/activity/cost/job detail rows, filters activity dates, groups item quantities by stock UOM, computes recorded cost/activity metrics, and uses Manufacturing Factory mappings. | Financial cost reconciliation, capacity calendars and agreed quality/yield definitions remain unconfigured; these are not fabricated. Only Confirmed warehouse mappings are used for factory-specific stock metrics. |
| A12 | Production initializes through root_element with document fallback. | Browser check in the actual ERP Custom HTML Block host after deployment. |
| A13 | Replaced fixed CEO case amounts with a native-permission, paginated live case API and UI. Company scope is derived only from accessible linked Sales Orders. | Cases without verified company links are excluded from a selected company and counted as unresolved. Case amounts have no currency field, so no misleading financial total is inferred. Enquiry SLA still needs a defined source/timestamp. |
| A14 | Existing ERP fuel-purchase fallback remains usable and portal unavailability remains explicit. | **Blocked:** Aldrees endpoint/authentication and a working server-side connector are not supplied. No portal balance or statements have been invented. |
| A15 | Browser calls an authorized same-origin DMCC proxy; removed key from JavaScript and its tracked source record. Prepared a Password-backed Single settings DocType and Server Script. | Install settings/API; configure the external key server-side; external owner must rotate the exposed key. Old Git history still contains the original key; history has not been rewritten. External ERP-to-Base44 field mapping remains a separate reconciliation. |
| A16 | Replaced public BI iframe with native, fully paginated current Bin balances scoped through permitted warehouses and one company; no mixed-unit quantity total. | Browser test and native Stock Balance reconciliation. Historical valuation is deliberately left to native reports. |
| A17 | Removed silent SQL row limits from Executive Secretary queues and the hidden 180-day open-request cutoff; closed-state filtering now runs in SQL. | Deploy backend; review performance for very large queues. Register retains its disclosed 90-day-plus-drafts scope. |
| A18 | Six percentage cards deduplicate by customer ID, reject conflicting duplicate balances, and count/sum a customer once. | Underlying ERP report SQL and other consumers still retain salesperson-grain rows. The separate MP Blocked Customers report has not been assumed to share the percentage-report contract. |
| A19 | Restored user_access_directory Python and original metadata. Export/organizer discovery now recognizes API URL query strings. | Source is available for review; no live endpoint change needed. |
| A20 | Removed unused PN and Customer placeholders and hierarchy references per user clarification. Customs remains under Procurement. | None. |

## Deployment order

1. Review local changes and the scope choices above; retain the original source records as historical references.
2. Install marketing Custom Fields from `07. IT & Digital Systems/Digital Marketing Dashboard/custom_fields.json` if those attribution inputs are approved. This does not backfill real data.
3. Install `DMCC Integration Settings` using its supplied DocType JSON, keep it disabled until its Password field is configured, and install API method `dmcc_dashboard_proxy`. The proxy deliberately restricts access to Administrator, System Manager, Accounts Manager, and CEO roles; confirm the intended readers before enabling it.
4. Update modified native Server Scripts: CEO legal/Taradhi and Executive Secretary. Treat the `.py` files as the editable source; adjacent original export JSON remains a snapshot except the explicitly sanitized DMCC source record.
5. Update the corresponding Custom HTML Block HTML, Style and Script fields. Inventory changes all three fields. Browser changes have not been deployed automatically.
6. Check permissions and reconcile sample displayed values under the actual executive, finance, HR and operations users. Do not execute write actions in the unrelated SOA APIs during read-only validation.

## Validation performed

- Twelve source-level regression checks cover double conversion, verified foreign conversion, unsupported/mixed currencies, duplicate-customer totals, conflicting rows, confirmed warehouse mappings, item/UOM grouping and the corrected period filter.
- All JavaScript files were parsed and all Python sources syntax-checked.
- Live read-only probes verified the corrected Accounting Period query, affected party-currency basis, Manufacturing Factory fields and Warehouse filters.
- External services and custom Server Script write actions were not executed. This is not a claim of full browser or production runtime certification.

Run the regressions from the repository root after `npm install --prefix tools/erp`:

```powershell
npm --prefix tools/erp test
```

Additional review limited to HTML blocks: [html-only-followup.md](html-only-followup.md). Current regression suite: 17 checks.
