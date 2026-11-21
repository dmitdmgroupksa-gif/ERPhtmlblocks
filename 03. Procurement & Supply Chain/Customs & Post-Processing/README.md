# Customs & Post-Processing

ERP Custom HTML Block: `Customs & Post-Procurement Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit: toolbar, period (default year to date), filters, browser tabs, actions pending, RTL, Desk dark mode, and layouts down to 320px. It replaces the v1 page that relied on the generated shell. **Read-only:** no writes.

**Data:** read with the user's own permissions through `frappe.client.get_list`. All fields were checked against the ERP map, including the PO custom fields and their options.
- **Purchase Order:** the custom shipment, customs, verification, SABER, BL and charges fields.
- Shipping Documents, Supplier (country).
- Purchase Receipt and its items, Purchase Order Item.
- Landed Cost Voucher with its charges and receipts.
- Purchase Invoice and its items, Payment Entry, File, Company.

**v1 rules kept:**
- A shipment is a submitted PO with a Foreign supplier type, a shipping-phase status, or customs, loading or ETA data.
- Cleared only when the Customs Status says Cleared.
- Not matching = any verification field marked Not Matching.
- Delayed = ETA passed, not cleared, not fully received, or status Shipment Delayed.
- Landed cost = receipt value plus voucher charges, with each receipt counted once and manufacturing-only vouchers excluded.
- Paid = invoice total minus outstanding.

**Fixed vs v1:** amounts are in one currency per view. v1 treated every company as SAR. By default the view covers companies in the system currency, and a banner names the companies left out. Pick a company in Filters to see it on its own.

**Tabs:**
- **Overview:** shipments, in transit, clearance pending, holds and delays, landed cost, supplier outstanding.
  - Charts: shipment status (adds up to the shipment count), import value per month, clearance status, receipt completion, value by supplier and by supplier country.
- **Shipments:** cards that filter the table: arriving within 7 days, past ETA, no ETA.
  - Quick filters: in transit, delayed, not cleared, not yet shipped.
  - Columns include container and BL numbers, loading date, ETA and first receipt.
- **Customs and documents:** clearance cards and a delay breakdown, customs charges by supplier, and the clearance table with which verification failed.
  - Document compliance covers the six documents ERP can evidence, plus attachments. Packing list and certificate of origin are not tracked in ERP.
- **Receiving:** PO lines (fully, partly or not received, overdue, quantity variance).
  - Pending lines are counted by warehouse; quantities are not added across units.
- **Landed cost:** goods, customs and clearing, other charges, per month and by supplier, and the voucher table.
- **Payments:** invoices (overdue, unpaid, paid, each with its linked PO), outstanding by supplier, payments per month, payment entries with unallocated amounts.
- **Actions pending:** these cover all open shipments and invoices in the company scope, whatever the period:
  - Verification not matching.
  - Past ETA and not cleared.
  - Arriving within 7 days.
  - Overdue supplier invoices.
  - Foreign orders without a shipment status.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields.

**Test:** `npm --prefix tools/erp run test:customs` (27 checks), with screenshots in `.local/qa/customs/`.

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.
