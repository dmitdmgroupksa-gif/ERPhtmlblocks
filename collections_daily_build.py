# COLLECTIONS DAILY BUILD  —  Server Script
#   Script Type: Scheduler Event   Event Frequency: Cron   Cron Format: 0 7 * * *   (07:00 every day, server time)
# Builds today's list for each collector (Draft). Azrah approves them in SOA Manager > Collections.
# Generated from the "COLLECTIONS CORE" block of the SOA API script - if you change settings there, change them here too.

CFG = {
    'company': '',
    'tolerance': 1.0,
    'sales_person_field': '',
    'customer_sales_person_field': '',
    'collect_after_days': 60,
}
U = frappe.utils


def company_sql(alias):
    if CFG["company"]:
        return " and " + alias + "company = %(co)s"
    return ""


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
    for r in frappe.db.sql("select party, against_voucher_type as vt, against_voucher_no as vn, sum(amount) as o, min(posting_date) as d "
                           "from `tabPayment Ledger Entry` where party_type = 'Customer' and party in %(p)s and delinked = 0 "
                           "and account_type = 'Receivable' and posting_date <= %(t)s" + company_sql("")
                           + " group by party, against_voucher_type, against_voucher_no having abs(sum(amount)) > 0.005",
                           {"p": tuple(customers), "t": t, "co": CFG["company"]}, as_dict=True):
        if r.party not in out:
            out[r.party] = []
        out[r.party].append({"vt": r.vt, "vn": r.vn, "o": U.flt(r.o, 2), "d": str(r.d)})
    return out


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


def customer_map():
    # customer -> {sp, name, phone}: the Customer's sales person field; empty ones fall back to the sales person on their latest invoice
    out = {}
    cf = cust_sp_field()
    fields = ["name", "customer_name", "mobile_no"]
    if cf:
        fields.append(cf)
    missing = 0
    for r in frappe.get_all("Customer", filters={"disabled": 0}, fields=fields, limit_page_length=0):
        sp = r.get(cf) if cf else ""
        out[r.name] = {"sp": sp or "", "name": r.customer_name or r.name, "phone": r.mobile_no or ""}
        if not sp:
            missing = missing + 1
    f = sp_field()
    if missing and f:
        latest = {}
        for r in frappe.db.sql("select customer, `" + f + "` as sp from `tabSales Invoice` where docstatus = 1 and ifnull(`" + f + "`, '') != ''"
                               + company_sql("") + " order by posting_date asc, creation asc", {"co": CFG["company"]}, as_dict=True):
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
                           "where ci.customer in %(c)s and ifnull(ci.result, '') != '' order by cl.list_date desc, ci.modified desc",
                           {"c": tuple(customers)}, as_dict=True):
        if r.customer in out:
            continue
        txt = str(r.result) + " on " + str(r.list_date)
        if U.flt(r.collected_amount):
            txt = txt + " - " + U.fmt_money(r.collected_amount)
        if r.promise_date:
            txt = txt + " - promised " + str(r.promise_date)
        if r.note:
            txt = txt + " - " + str(r.note)[:120]
        out[r.customer] = txt
    return out


def build_collections(day, only_missing):
    # one list per collector for "day": their salespeople's customers with a balance older than collect_after_days
    amap = assignments()
    built = []
    if not amap:
        return built
    cmap = customer_map()
    mine = {}
    every = []
    for col in amap:
        mine[col] = []
        if not amap[col]:
            continue
        for k in cmap:
            if cmap[k]["sp"] and cmap[k]["sp"] in amap[col]:
                mine[col].append(k)
                every.append(k)
    caps = collector_limits()
    opn = open_by_customer(every, day)
    last = last_updates(every)
    limit = U.cint(CFG["collect_after_days"])
    tol = U.flt(CFG["tolerance"])
    names = {}
    for u in frappe.get_all("User", filters={"name": ["in", list(amap.keys())]}, fields=["name", "full_name"]):
        names[u.name] = u.full_name or u.name
    for col in amap:
        if not amap[col]:
            continue
        ex = frappe.db.get_value("Collection List", {"list_date": day, "collector": col}, ["name", "status"], as_dict=True)
        if ex and (ex.status != "Draft" or only_missing):
            continue
        items = []
        for k in mine[col]:
            rows = opn.get(k) or []
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
            inv = sorted(inv, key=lambda x: x["date"])[:40]
            items.append({"customer": k, "customer_name": cmap[k]["name"], "sales_person": cmap[k]["sp"], "phone": cmap[k]["phone"],
                          "due_amount": U.flt(due, 2), "total_outstanding": U.flt(total, 2), "oldest_date": inv[0]["date"] if inv else None,
                          "invoice_details": json.dumps(inv), "last_update": last.get(k) or "", "result": "", "removed": 0})
        items = sorted(items, key=lambda x: -x["due_amount"])      # biggest balances first
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


build_collections(U.nowdate(), True)
frappe.db.commit()
