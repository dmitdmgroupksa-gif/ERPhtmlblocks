# HTML-block-only follow-up

Only Custom HTML Block sources were changed in this follow-up. Native Workspace, Number Card, Dashboard Chart and Report records were read for reference and were not written.

## Changes

- **Credit Controller:** company-scoped positive-limit customers and gross customer receipts have explicit labels. Added an all-company cross-page reference using the exact native `Over Credit Limit Customer` and `Collection Analysis Report` reports. These reference cards explicitly ignore the page filters and disclose the legacy receipt adjustment/excluded-salesperson basis. Generated report total rows are removed before summing, avoiding a doubled reference value. Failed references are unavailable rather than zero.
- **Pre-Procurement:** kept the verified native overdue rule. Added the overdue/open counts, oldest due date, number of open records issued in previous years, and missing-date count beside the KPI cards. The explanation distinguishes issue-date filters from required/delivery dates. No schedule dates, statuses or procurement records were modified.
- **DM Contracting and Scaffolding Rental:** each block repairs an undefined/null/blank heading only on its own containing widget. Intentional headings and other widgets are preserved. No native Workspace content is changed.

## Live API reference checks ? 16 November 2026

These are current results under the supplied API user and all-company scope, not a reproduction of an earlier screenshot with unknown filters.

- Native over-credit report: **106** customers. Reconstructed legacy HTML calculation using summed positive limits: **100**. The six report-only customers have zero limits. At this scope, no discrepancy was attributable to max-versus-sum differences. The HTML view now labels these definitions separately rather than pretending they are interchangeable.
- Gross current-month customer receipts: **3,710,410.60**. The shared salesperson collection report includes **3,700,410.60** before its division by **1.15**, giving **3,217,748.35**. **10,000.00** is excluded/unassigned under that report's salesperson rules. The HTML view now exposes the same native reference alongside its separately named gross figure. It does not silently apply VAT division to gross receipts.
- Native collection report includes a generated total row. Summing detail plus total would double the result; the new helper excludes it.
- Material Request open-status rows checked against the actual purchase/submitted/not-Closed scope: **937**. No open-status row in that scope was already 100% ordered. The broader API backlog check found due dates as early as **17 May 2022**. The high overdue share therefore cannot safely be fixed by changing dates or hiding old rows. Procurement must review stale open documents.

## Intentionally outside this follow-up

Native AR/Sales Comparison missing-date report settings; disabled native Supplier Payment Analysis; native Management Insights precision/errors; Payroll onboarding/chart; blank Dashboards and IT Workspaces; native Customer card color; and the external Technical BI dashboard. The local Inventory HTML block already has a native current-stock replacement from the preceding remediation; the external BI model was not edited.

## Validation

Seventeen regression checks passed, including reference totals excluding generated totals, missing-field failures, scoped heading repair, preservation of custom titles, currency calculations and customer deduplication. All four changed block scripts passed JavaScript syntax checks. Browser rendering still needs verification in the actual ERP workspace after deployment.

The scoped header repair uses the Frappe widget structure documented in the official [custom block widget](https://github.com/frappe/frappe/blob/version-14/frappe/public/js/frappe/widgets/custom_block_widget.js) and [base widget](https://github.com/frappe/frappe/blob/version-14/frappe/public/js/frappe/widgets/base_widget.js) sources.

**Local changes only; no live ERP updates were performed.**
