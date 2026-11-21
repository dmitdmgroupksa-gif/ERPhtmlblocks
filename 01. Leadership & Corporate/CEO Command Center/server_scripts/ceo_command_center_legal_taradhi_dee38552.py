# API method: ceo_command_center_legal_taradhi. Read-only, native record permissions.
category = frappe.form_dict.get("category") or ""
company = frappe.form_dict.get("company") or ""
if category not in ["legal", "taradhi"]:
    frappe.throw("Invalid category")
sources = [["Taradhi Cases", "customer", "amount", "order_no", "date", "payment_status"]] if category == "taradhi" else [["Court Cases", "customer_name", "amount", "", "creation", ""], ["Legal Case List", "customer", "amount", "order_no", "case_filing_date", "legal_case_status"]]
if category == "taradhi":
    sources.append(["Legal Case List", "customer", "amount", "order_no", "case_filing_date", "legal_case_status"])
rows = []
unresolved = 0
for spec in sources:
    dt = spec[0]
    fields = ["name", spec[1], spec[2], spec[4]]
    if spec[3]:
        fields.append(spec[3])
    if spec[5]:
        fields.append(spec[5])
    filters = [["docstatus", "<", 2]]
    if dt == "Legal Case List":
        filters.append(["legal_case_authority", "=", "Legal" if category == "legal" else "Taradhi"])
    offset = 0
    while True:
        batch = frappe.get_list(dt, fields=fields, filters=filters, order_by="name asc", limit_start=offset, limit_page_length=200)
        for record in batch:
            order = record.get(spec[3]) if spec[3] else ""
            order_company = ""
            if order:
                orders = frappe.get_list("Sales Order", fields=["company"], filters=[["name", "=", order]], limit_page_length=1)
                if orders:
                    order_company = orders[0].company
            if company and not order_company:
                unresolved = unresolved + 1
                continue
            if company and order_company != company:
                continue
            rows.append({"doctype": dt, "name": record.name, "label": record.get(spec[1]) or record.name, "recorded_amount": str(record.get(spec[2]) or ""), "date": str(record.get(spec[4]) or ""), "status": record.get(spec[5]) if spec[5] else "", "company": order_company})
        if len(batch) < 200:
            break
        offset = offset + len(batch)
frappe.response["message"] = {"available": 1, "category": category, "count": len(rows), "rows": rows, "unresolved_company": unresolved, "basis": "Live case records, not ledger outstanding. Company is verified only through an accessible linked Sales Order. Case amount has no currency field; no cross-case monetary total is inferred."}
