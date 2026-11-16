# COLLECTIONS DAILY BUILD  —  Server Script
#   Script Type: Scheduler Event   Event Frequency: Cron   Cron Format: 0 7 * * *   (07:00 every day, server time)
# Builds today's list for each collector (Draft). Azrah approves them in SOA Manager > Collections.
# Generated from the "COLLECTIONS CORE" block of the SOA API script - if you change settings there, change them here too.
# Customers with an ongoing Legal Case List record (Opened / Underway / no status) are never put on a list.

CFG = {
    "tolerance": 1.0,
    "sales_person_field": "",
    "customer_sales_person_field": "",
    "collections_company": "Durar Masagh Trading Company",
    "collect_after_days": 60,
}
U = frappe.utils


def sp_field():
    if CFG["sales_person_field"]:
        return CFG["sales_person_field"]
    meta = frappe.get_meta("Sales Invoice")
    for f in ["sales_person", "custom_sales_person"]:
        if meta.has_field(f):
            return f
    return ""


# ------------------------------------------------------------------ COLLECTIONS CORE START
# (the "Collections Daily Build" scheduler script is generated from this block - keep it self-contained)
def cust_sp_field():
    if CFG["customer_sales_person_field"]:
        return CFG["customer_sales_person_field"]
    for f in frappe.get_meta("Customer").fields:
        if f.fieldtype == "Link" and f.options == "Sales Person":
            return f.fieldname
    return ""


def open_by_customer(customers, t):
    # open vouchers per customer as Accounts Receivable sees them (Payment Ledger, up to date t)
    out = {}
    if not customers:
        return out
    for r in frappe.db.sql("select ple.party, ple.against_voucher_type as vt, ple.against_voucher_no as vn, "
                           "sum(ple.amount) as o, si.posting_date as d from `tabPayment Ledger Entry` ple "
                           "join `tabSales Invoice` si on si.name = ple.against_voucher_no and si.customer = ple.party "
                           "where ple.against_voucher_type = 'Sales Invoice' and si.docstatus = 1 "
                           "and si.company = %(co)s and ple.company = %(co)s "
                           "and ple.party_type = 'Customer' and ple.party in %(p)s and ple.delinked = 0 "
                           "and ple.account_type = 'Receivable' and ple.posting_date <= %(t)s and si.posting_date <= %(t)s "
                           "group by ple.party, ple.against_voucher_type, ple.against_voucher_no, si.posting_date "
                           "having abs(sum(ple.amount)) > 0.005",
                           {"p": tuple(customers), "t": t, "co": CFG["collections_company"]}, as_dict=True):
        if r.party not in out:
            out[r.party] = []
        out[r.party].append({"vt": r.vt, "vn": r.vn, "o": U.flt(r.o, 2), "d": str(r.d)})
    vouchers = []
    for customer in out:
        for row in out[customer]:
            vouchers.append(row["vn"])
    people = invoice_salespeople(vouchers)
    for customer in out:
        for row in out[customer]:
            row["salespeople"] = people.get(row["vn"]) or []
    return out


def invoice_salespeople(vouchers):
    out = {}
    if not vouchers:
        return out
    f = sp_field()
    if f:
        query = ("select si.name as invoice, si.`" + f + "` as sp from `tabSales Invoice` si "
                 "where si.name in %(v)s and si.company = %(co)s and si.docstatus = 1")
    else:
        query = ("select si.name as invoice, st.sales_person as sp from `tabSales Invoice` si "
                 "join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice' "
                 "where si.name in %(v)s and si.company = %(co)s and si.docstatus = 1 order by st.idx asc")
    for r in frappe.db.sql(query, {"v": tuple(vouchers), "co": CFG["collections_company"]}, as_dict=True):
        if r.sp:
            if r.invoice not in out:
                out[r.invoice] = []
            if r.sp not in out[r.invoice]:
                out[r.invoice].append(r.sp)
    return out


def collection_queue_history(day):
    # Only released lists advance the rotation. Draft rebuilds never consume a turn.
    latest = {}
    previous = {}
    reserved = {}
    for r in frappe.db.sql("select cl.collector, ci.customer, cl.list_date, cl.status "
                           "from `tabCollection List Item` ci join `tabCollection List` cl on cl.name = ci.parent "
                           "where ifnull(ci.removed, 0) = 0 and cl.list_date <= %(day)s "
                           "and (cl.status in ('Approved', 'Closed') or cl.list_date = %(day)s)",
                           {"day": day}, as_dict=True):
        date = str(r.list_date)
        if date == day:
            if r.customer not in reserved:
                reserved[r.customer] = []
            reserved[r.customer].append(r.collector)
            continue
        if U.date_diff(day, date) == 1:
            previous[r.customer] = True
        if r.collector not in latest:
            latest[r.collector] = {}
        if date > latest[r.collector].get(r.customer, ""):
            latest[r.collector][r.customer] = date
    return {"latest": latest, "previous": previous, "reserved": reserved}


def collection_salesperson_options(day):
    cmap = customer_map()
    opn = open_by_customer(list(cmap.keys()), day)
    pending = {}
    for customer in opn:
        for row in opn[customer]:
            if row["o"] <= U.flt(CFG["tolerance"]) or U.date_diff(day, row["d"]) <= U.cint(CFG["collect_after_days"]):
                continue
            people = row.get("salespeople") or ([cmap[customer]["sp"]] if cmap[customer]["sp"] else [])
            for sp in people:
                if sp not in pending:
                    pending[sp] = {}
                pending[sp][row["vn"]] = True
    saved = []
    amap = assignments()
    for col in amap:
        saved = saved + amap[col]
    details = {}
    for sp in frappe.get_all("Sales Person", fields=["name", "enabled", "is_group", "employee"], order_by="name asc", limit_page_length=0):
        left = not U.cint(sp.enabled)
        if sp.employee:
            status = frappe.db.get_value("Employee", sp.employee, "status")
            if status and status != "Active":
                left = True
        if (not U.cint(sp.is_group) and not left) or sp.name in pending or sp.name in saved:
            details[sp.name] = {"left": left, "pending_invoices": len(pending.get(sp.name) or {})}
    # Historical invoice names stay selectable even if their Sales Person record no longer exists.
    for sp in list(pending.keys()) + saved:
        if sp not in details:
            details[sp] = {"left": True, "pending_invoices": len(pending.get(sp) or {})}
    return details


def collector_users():
    # collectors = employees Azrah picked (one Collection Assignment row each, sales person empty), plus anyone with assignments
    seen = {}
    out = []
    for a in frappe.get_all("Collection Assignment", fields=["collector", "collector_name", "employee", "max_customers"], order_by="collector_name asc", limit_page_length=0):
        if a.collector in seen:
            continue
        seen[a.collector] = 1
        out.append({"user": a.collector, "full_name": a.collector_name or a.collector, "employee": a.employee or "", "max_customers": U.cint(a.max_customers)})
    return out


def collector_limits():
    # max customers per day per collector (0 = no limit), set by Azrah
    out = {}
    for a in frappe.get_all("Collection Assignment", fields=["collector", "max_customers"], limit_page_length=0):
        if U.cint(a.max_customers) > U.cint(out.get(a.collector)):
            out[a.collector] = U.cint(a.max_customers)
    return out


def assignments():
    by = {}
    for a in frappe.get_all("Collection Assignment", fields=["collector", "sales_person"], order_by="sales_person asc", limit_page_length=0):
        if a.collector not in by:
            by[a.collector] = []
        if a.sales_person:
            by[a.collector].append(a.sales_person)
    return by


def legal_customers():
    # customers with an ongoing Legal Case List record (Opened, Underway or no status yet) - kept out of collections
    out = {}
    for r in frappe.db.sql("select distinct customer from `tabLegal Case List` where ifnull(customer, '') != '' and docstatus < 2 "
                           "and ifnull(legal_case_status, '') in ('', 'Opened', 'Underway')", as_dict=True):
        out[r.customer] = True
    return out


def customer_map():
    # customer -> {sp, name, phone}: the Customer's sales person field; empty ones fall back to the sales person on their latest invoice
    # customers with an ongoing legal case are left out, so no collection flow (build, replace, diagnostics) can pick them
    out = {}
    cf = cust_sp_field()
    fields = ["name", "customer_name", "mobile_no"]
    if cf:
        fields.append(cf)
    missing = 0
    legal = legal_customers()
    for r in frappe.get_all("Customer", filters={"disabled": 0}, fields=fields, limit_page_length=0):
        if legal.get(r.name):
            continue
        sp = r.get(cf) if cf else ""
        out[r.name] = {"sp": sp or "", "name": r.customer_name or r.name, "phone": r.mobile_no or ""}
        if not sp:
            missing = missing + 1
    f = sp_field()
    if missing:
        latest = {}
        if f:
            query = ("select si.customer, si.`" + f + "` as sp from `tabSales Invoice` si "
                     "where si.docstatus = 1 and ifnull(si.`" + f + "`, '') != '' "
                     "and si.company = %(co)s order by si.posting_date asc, si.creation asc, si.name asc")
        else:
            # Standard ERPNext stores invoice salespeople in Sales Team, not a direct invoice field.
            # For a multi-person invoice use its first Sales Team row, consistently.
            query = ("select si.customer, st.sales_person as sp from `tabSales Invoice` si "
                     "join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice' "
                     "where si.docstatus = 1 and ifnull(st.sales_person, '') != '' and si.company = %(co)s "
                     "order by si.posting_date asc, si.creation asc, si.name asc, st.idx desc")
        for r in frappe.db.sql(query, {"co": CFG["collections_company"]}, as_dict=True):
            latest[r.customer] = r.sp
        for k in out:
            if not out[k]["sp"] and latest.get(k):
                out[k]["sp"] = latest.get(k)
    return out


def last_updates(customers):
    # the latest collector log per customer, carried into the next day's list
    out = {}
    if not customers:
        return out
    for r in frappe.db.sql("select ci.customer, ci.result, ci.note, ci.promise_date, ci.collected_amount, cl.list_date, cl.collector "
                           "from `tabCollection List Item` ci join `tabCollection List` cl on cl.name = ci.parent "
                           "where ci.customer in %(c)s and (ifnull(ci.result, '') != '' or ifnull(ci.note, '') != '') order by cl.list_date desc, ci.modified desc",
                           {"c": tuple(customers)}, as_dict=True):
        if r.customer in out:
            continue
        txt = str(r.result or "Remark") + " on " + str(r.list_date)
        if U.flt(r.collected_amount):
            txt = txt + " - " + U.fmt_money(r.collected_amount)
        if r.promise_date:
            txt = txt + " - promised " + str(r.promise_date)
        if r.note:
            txt = txt + " - " + str(r.note)[:120]
        out[r.customer] = txt
    return out


def collection_candidates(col, day, cmap=None, opn=None, last=None, amap=None, history=None):
    if amap is None:
        amap = assignments()
    if cmap is None:
        cmap = customer_map()
    mine = {col: list(cmap.keys())}
    if opn is None:
        opn = open_by_customer(mine[col], day)
    if last is None:
        last = last_updates(mine[col])
    if history is None:
        history = collection_queue_history(day)
    limit = U.cint(CFG["collect_after_days"])
    tol = U.flt(CFG["tolerance"])
    items = []
    for k in mine[col]:
        if history["previous"].get(k) or any(owner != col for owner in history["reserved"].get(k, [])):
            continue
        rows = []
        matched = []
        for row in (opn.get(k) or []):
            people = row.get("salespeople") or ([cmap[k]["sp"]] if cmap[k]["sp"] else [])
            owners = [sp for sp in people if sp in (amap.get(col) or [])]
            if owners:
                rows.append(row)
                for sp in owners:
                    if sp not in matched:
                        matched.append(sp)
        total = 0.0
        due = 0.0
        inv = []
        for r in rows:
            total = total + r["o"]
            days = U.date_diff(day, r["d"])
            if days > limit:
                due = due + r["o"]
                if r["o"] > 0:
                    inv.append({"voucher": r["vn"], "type": r["vt"], "date": r["d"], "amount": r["o"], "days": days})
        if due > total:
            due = total
        if due <= tol:
            continue
        inv = sorted(inv, key=lambda x: x["date"])
        items.append({"customer": k, "customer_name": cmap[k]["name"], "sales_person": ", ".join(matched), "phone": cmap[k]["phone"],
                      "due_amount": U.flt(due, 2), "total_outstanding": U.flt(total, 2), "oldest_date": inv[0]["date"] if inv else None,
                      "invoice_details": json.dumps(inv), "last_update": last.get(k) or "", "result": "", "removed": 0})
    # Persistent least-recently-assigned queue: unseen customers first, then oldest turns.
    turns = history["latest"].get(col) or {}
    items = sorted(items, key=lambda x: (turns.get(x["customer"], ""), -x["due_amount"], x["customer"]))
    return items


def validate_collection_turn(doc, customer=None):
    history = collection_queue_history(str(doc.list_date))
    legal = legal_customers()
    for it in (doc.get("items") or []):
        if customer and it.customer != customer:
            continue
        if not customer and U.cint(it.removed):
            continue
        if legal.get(it.customer):
            frappe.throw("Customer " + it.customer + " has an ongoing legal case and cannot be collected. Remove this customer or rebuild the draft list.")
        if history["previous"].get(it.customer):
            frappe.throw("Customer " + it.customer + " was assigned yesterday. Remove this customer and assign another, or rebuild the draft list.")
        if any(owner != doc.collector for owner in history["reserved"].get(it.customer, [])):
            frappe.throw("Customer " + it.customer + " is already assigned to another collector for this day.")


def validate_collection_company():
    if not CFG["collections_company"] or not frappe.db.exists("Company", CFG["collections_company"]):
        frappe.throw("Collection Company not found: " + str(CFG["collections_company"])
                     + ". Set collections_company to the exact Company name in both SOA API and Collections Daily Build scripts.")


def build_collections(day, only_missing):
    validate_collection_company()
    # one list per collector for "day": their salespeople's customers with a balance older than collect_after_days
    amap = assignments()
    built = []
    if not amap:
        return built
    cmap = customer_map()
    every = list(cmap.keys())
    opn = open_by_customer(every, day)
    last = last_updates(every)
    caps = collector_limits()
    history = collection_queue_history(day)
    names = {}
    for u in frappe.get_all("User", filters={"name": ["in", list(amap.keys())]}, fields=["name", "full_name"]):
        names[u.name] = u.full_name or u.name
    for col in amap:
        if not amap[col]:
            continue
        ex = frappe.db.get_value("Collection List", {"list_date": day, "collector": col}, ["name", "status"], as_dict=True)
        if ex and (ex.status != "Draft" or only_missing):
            continue
        items = collection_candidates(col, day, cmap, opn, last, amap, history)
        cap = U.cint(caps.get(col))
        skipped = 0
        if cap and len(items) > cap:
            skipped = len(items) - cap
            items = items[:cap]
        if ex:
            doc = frappe.get_doc("Collection List", ex.name)
            doc.set("items", [])
        else:
            doc = frappe.get_doc({"doctype": "Collection List", "list_date": day, "collector": col, "status": "Draft"})
        doc.collector_name = names.get(col) or col
        for it in items:
            doc.append("items", it)
            if it["customer"] not in history["reserved"]:
                history["reserved"][it["customer"]] = []
            history["reserved"][it["customer"]].append(col)
        doc.customers = len(items)
        doc.skipped = skipped
        tot = 0.0
        for x in items:
            tot = tot + x["due_amount"]
        doc.total_due = U.flt(tot, 2)
        doc.total_collected = 0
        if ex:
            doc.save(ignore_permissions=True)
        else:
            doc.insert(ignore_permissions=True)
        built.append(doc.name)
    return built
# ------------------------------------------------------------------ COLLECTIONS CORE END


build_collections(U.nowdate(), True)
