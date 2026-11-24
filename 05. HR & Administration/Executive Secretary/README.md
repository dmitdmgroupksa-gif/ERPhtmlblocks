# Executive Secretary

Existing local workspace dashboard and API, preserved without changes.

- [JavaScript](exec_admin_dashboard.js)
- [CSS](exec_admin_dashboard.css)
- [Server Script](exec_admin_api_server_script.py)

The JavaScript goes in the Custom HTML Block Script field, CSS in Style, and HTML stays empty. The API method is `exec_admin_api`.

## Approvals tab (22 Nov 2026)

- The new **Approvals** tab, the "Pending approvals" KPI and an overview block list every document counted on the [Approvals Pending](https://dmgroup.frappe.cloud/app/approvals-pending) workspace, so the secretary can remind the CEO.
- The server reads the workspace's count cards and each card's own filters live. A card added or changed there appears here without code changes.
- "Material Requests Pending for PO" and "Pending PO" are excluded (`CFG["approvals_exclude"]`).
- A document counted by several cards is listed once, tagged with every card it belongs to.
- Rows are sorted by days since the last update. More than `approvals_overdue_days` (3) is shown in red.
- Filters: card (chips or dropdown), document type, waiting over 3 days, and search.
- **Copy reminder** copies a plain-text summary to paste into WhatsApp or email: the count per card plus the 20 longest-waiting documents, for the current filter.
- **Fixed:** typing in a search box lost focus after the first letter, so the rest of the text went to the ERP search bar.
- Deploy both the JavaScript (Custom HTML Block) and the updated Server Script `exec_admin_api`.

