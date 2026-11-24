# GDN & GRN Tracker

ERP Custom HTML Block: `DN & GRN Tracker Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit. It replaces the v1 page that relied on the generated shell, and adds:
- the toolbar, a period (default year to date) and filters;
- browser tabs, actions pending, RTL, Desk dark mode, and layouts down to 320px.

**Read-only:** no writes.

**Data:** read with the user's own permissions through `frappe.client.get_list`, using v1's aggregate queries over parent and item tables:
- distinct document counts;
- net quantities per stock UOM;
- item-level order links.

DocTypes:
- Delivery Note and its items
- Purchase Receipt and its items
- Sales Order and its items
- Purchase Order and its items
- Company, Division and Warehouse

All fields were checked against the ERP map, including `custom_division`, `sales_persons`, `so_detail`, `purchase_order_item` and `rejected_qty`.

**Quantities are never added across units.** Every quantity is shown per stock UOM, and the quantity report shows one unit at a time.

**Filters:** company, division (delivery notes and sales orders only), warehouse (item lines; same-name warehouses show their code), document status and customer/supplier name. As in v1, cards and status charts ignore document status, and tables apply it.

**Tabs:**
- **Overview:**
  - submitted delivery notes and receipts, with draft, return and cancelled counts;
  - orders still to deliver or receive;
  - late deliveries and receipts;
  - submitted per month, a status mix, top customers and top suppliers (selecting one filters by that name).
- **Delivery notes / Goods receipts:**
  - status cards that filter the table;
  - delivered or received quantity per unit;
  - a server-paged table you can switch between documents and item lines.
  - Item lines show the linked order line's ordered and pending (or outstanding) quantity, as in v1.
- **Orders and delays:** v1's Pending and Reconciliation tabs in one tab.
  - Pick sales or purchase orders, then a mode: all pending, partly done, overdue, completed, all submitted.
  - Shows outstanding quantity per unit, the line status, and the deliveries or receipts linked to each order.
- **Warehouses:** the busiest warehouses, overdue orders by warehouse, and v1's performance table. A warehouse opens its delivery notes or receipts.
- **Reports:** v1's reports:
  - monthly comparison;
  - daily delivery notes;
  - daily receipts;
  - delivered vs received quantity per unit;
  - customer summary;
  - supplier summary.

  The outstanding-orders and returned-documents reports are covered by the Orders tab and the Returned status filter.
- **Actions pending:**
  - Late deliveries (all open).
  - Late receipts (all open).

  The late days on these rows use the order header date, because the site rejects `min()` in `get_list`. The lines past their date are still found at item level.
  - Receipts with rejected quantity (the period).
  - Draft delivery notes.
  - Draft receipts.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields.

**Test:** `npm --prefix tools/erp run test:dn-grn` (30 checks), with screenshots in `.local/qa/dn-grn/`. The fixture answers the parent-and-item aggregate queries with a small join engine; the expected figures are computed independently.

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## 2026-11-22 · v3: GDN / GRN split by Sales Order and Sales Invoice link

- Heading renamed to **GDN & GRN Tracker** (the ERP block name is unchanged).
- **Delivery notes tab** shows GDN and GRN documents linked to a Sales Order or Sales Invoice only:
  - Delivery Notes with header `sales_order` or `sales_invoice_data` set, or referenced by a Sales Invoice line;
  - plus Purchase Receipts with an item-level `sales_order` (own table, "Goods receipts linked to a Sales Order").
- **Goods receipts tab** shows Purchase Receipts without a Sales Order link, plus Delivery Notes with no Sales Order or Sales Invoice link (own table).
- Overview cards and the tab cards follow the same split. Charts, warehouses and reports stay by document type.
- On the live data (2026 to date): 97 unlinked delivery notes moved to Goods receipts, 16 SO-linked receipts moved to Delivery notes.
- Backup of the previous version in ERPNext: Custom HTML Block `DN & GRN Tracker Dashboard BACKUP 2026-11-22 pre-GDN-split`.
- Table export is now a PDF on the DM letterhead (all kit dashboards).

