# CEO Command Center - Procurement API (Phase 1: Overview + Purchase Order explorer).
# Read-only. frappe.get_list applies the requesting user's Purchase Order permissions
# (roles, user permissions incl. Company). Values are company currency, net of taxes.
#
# Verified fields (Purchase Order): company, supplier, supplier_name, custom_supplier_type,
#   custom_purchaser_name (Purchaser Name, Select), custom_po_in_charge_ (PO In charge, Link PO User),
#   owner (Created By), custom_delivery_location (Delivery Location, Select), transaction_date
#   (Issued Date), base_net_total, status, docstatus, workflow_state, per_received, per_billed.
# Purchase Order Item: item_code, item_name, schedule_date (Required Date), qty, uom,
#   received_qty, returned_qty, amount, billed_amt, base_net_amount.
# Rules (match ERPNext's own % Received / % Billed, verified line by line):
#   remaining receipt qty  = max(qty - received_qty, 0) in the line UOM (received_qty is net of
#                            returns, so returned quantities are receivable again, as in ERPNext)
#   remaining receipt value = base_net_amount * remaining qty / qty
#   remaining billing value = base_net_amount * max(amount - billed_amt, 0) / amount
#   Backlogs: submitted, status not Closed / Cancelled (Completed orders are fully received and
#   billed by definition); all issue dates. Overdue: remaining receipt and Required Date < today.
f = frappe.form_dict
flt = frappe.utils.flt
cint = frappe.utils.cint
UN = "~unassigned~"
PO = "Purchase Order"
CT = "`tabPurchase Order Item`"
PAGE = 50
today = frappe.utils.today()

view = f.get("view") or "summary"
company = f.get("company") or ""
location = f.get("location") or ""
measure = f.get("measure") or "placed"
level = f.get("level") or ""
page = max(0, cint(f.get("page") or 0))
if view not in ["summary", "explorer"]:
    frappe.throw("Invalid view.")
if measure not in ["placed", "receipt", "overdue", "billing"]:
    frappe.throw("Invalid measure.")
if not f.get("from_date") or not f.get("to_date"):
    frappe.throw("Select a start date and an end date.")
from_date = str(frappe.utils.getdate(f.get("from_date")))
to_date = str(frappe.utils.getdate(f.get("to_date")))
if from_date > to_date:
    frappe.throw("The start date must be on or before the end date.")

DIM = {"company": "company", "purchaser": "custom_purchaser_name", "supplier": "supplier",
       "location": "custom_delivery_location", "order": "name"}

out = {"view": view, "measure": measure, "company": company, "location": location,
       "from_date": from_date, "to_date": to_date, "today": today, "currency": "",
       "no_access": 0, "currency_conflict": 0}

comps = frappe.get_list("Company", fields=["name", "default_currency"], limit_page_length=0)
ccur = {}
for c in comps:
    ccur[c.name] = c.default_currency
if company and company not in ccur:
    frappe.throw("The selected company is not accessible.")
scope = [company] if company else list(ccur.keys())
curs = sorted(list(set([ccur[c] for c in scope if ccur.get(c)])))


def head_filters(path, with_location):
    fl = [[PO, "docstatus", "=", 1]]
    if company:
        fl.append([PO, "company", "=", company])
    if with_location and location:
        if location == UN:
            fl.append([PO, "custom_delivery_location", "is", "not set"])
        else:
            fl.append([PO, "custom_delivery_location", "=", location])
    for k in ["company", "purchaser", "supplier", "order"]:
        v = path.get(k) or ""
        if v:
            if v == UN:
                fl.append([PO, DIM[k], "is", "not set"])
            else:
                fl.append([PO, DIM[k], "=", v])
    return fl


def placed_filters(path):
    return head_filters(path, True) + [[PO, "transaction_date", ">=", from_date],
                                       [PO, "transaction_date", "<=", to_date]]


def backlog_lines(path):
    fl = head_filters(path, True) + [[PO, "status", "not in", ["Closed", "Cancelled", "Completed"]]]
    rows = frappe.get_list(PO, filters=fl, fields=[
        "name as po", "company", "supplier", "supplier_name", "custom_purchaser_name as pur",
        "custom_po_in_charge_ as inc", "custom_delivery_location as loc", "transaction_date as d",
        "status", "workflow_state as wf", "base_net_total as total", "per_received", "per_billed",
        CT + ".name as ln", CT + ".idx as idx", CT + ".item_code as item", CT + ".item_name as item_name",
        CT + ".schedule_date as sd", CT + ".qty as qty", CT + ".received_qty as rq",
        CT + ".returned_qty as ret", CT + ".uom as uom", CT + ".amount as amt",
        CT + ".billed_amt as bamt", CT + ".base_net_amount as bna"], limit_page_length=0)
    res = []
    for r in rows:
        q = flt(r.qty)
        remq = max(q - flt(r.rq), 0.0)
        rv = flt(r.bna) * remq / q if q else 0.0
        a = flt(r.amt)
        bfrac = max(a - flt(r.bamt), 0.0) / a if a else 0.0
        sd = str(r.sd) if r.sd else ""
        r.remq = remq
        r.rv = rv
        r.bv = flt(r.bna) * bfrac
        r.sdate = sd
        r.recv = remq > 0.0000001
        r.over = r.recv and sd != "" and sd < today
        r.nosd = r.recv and sd == ""
        r.bill = (a - flt(r.bamt)) > 0.005
        res.append(r)
    return res


def measure_lines(lines):
    if measure == "receipt":
        return [r for r in lines if r.recv]
    if measure == "overdue":
        return [r for r in lines if r.over]
    return [r for r in lines if r.bill]


def line_value(r):
    if measure == "billing":
        return r.bv
    return r.rv


def lbl(k, v, r):
    if not v:
        return "Unassigned"
    if k == "supplier":
        return (r.get("supplier_name") or v) if r else v
    return v


if len(curs) > 1:
    out["currency_conflict"] = 1
    out["message"] = "The permitted companies use different currencies (" + ", ".join(curs) + "). Select one company."
else:
    out["currency"] = curs[0] if curs else ""
    path = {}
    for k in ["company", "purchaser", "supplier", "order"]:
        if f.get(k):
            path[k] = f.get(k)

    if view == "summary":
        pf = placed_filters({})
        tot = frappe.get_list(PO, filters=pf, fields=["count(name) as n", "sum(base_net_total) as v"], limit_page_length=1)
        placed = {"count": cint(tot[0].n) if tot else 0, "amount": flt(tot[0].v) if tot else 0.0}
        trend = frappe.get_list(PO, filters=pf, fields=["transaction_date as d", "count(name) as n", "sum(base_net_total) as v"],
                                group_by="transaction_date", order_by="transaction_date asc", limit_page_length=0)
        sup = frappe.get_list(PO, filters=pf, fields=["supplier as k", "max(supplier_name) as l", "count(name) as n", "sum(base_net_total) as v"],
                              group_by="supplier", limit_page_length=0)
        sup = sorted(sup, key=lambda z: -flt(z.v))
        pur = frappe.get_list(PO, filters=pf, fields=["custom_purchaser_name as k", "count(name) as n", "sum(base_net_total) as v"],
                              group_by="custom_purchaser_name", limit_page_length=0)
        pur = sorted(pur, key=lambda z: -flt(z.v))
        dq_loc = frappe.get_list(PO, filters=pf + [[PO, "custom_delivery_location", "is", "not set"]], fields=["count(name) as n"], limit_page_length=1)
        dq_inc = frappe.get_list(PO, filters=pf + [[PO, "custom_po_in_charge_", "is", "not set"]], fields=["count(name) as n"], limit_page_length=1)
        lines = backlog_lines({})
        rec = {"orders": {}, "amount": 0.0, "lines": 0, "hold_orders": {}, "hold_amount": 0.0}
        ovd = {"orders": {}, "amount": 0.0, "lines": 0}
        nosd = {"orders": {}, "lines": 0, "amount": 0.0}
        bil = {"orders": {}, "amount": 0.0, "hold_orders": {}, "hold_amount": 0.0}
        wf_pending = {}
        follow = []
        for r in lines:
            if r.wf and r.wf not in ["Approved"]:
                wf_pending[r.po] = r.wf
            if r.recv:
                rec["orders"][r.po] = 1
                rec["amount"] = rec["amount"] + r.rv
                rec["lines"] = rec["lines"] + 1
                if r.status == "On Hold":
                    rec["hold_orders"][r.po] = 1
                    rec["hold_amount"] = rec["hold_amount"] + r.rv
            if r.over:
                ovd["orders"][r.po] = 1
                ovd["amount"] = ovd["amount"] + r.rv
                ovd["lines"] = ovd["lines"] + 1
                follow.append(r)
            if r.nosd:
                nosd["orders"][r.po] = 1
                nosd["lines"] = nosd["lines"] + 1
                nosd["amount"] = nosd["amount"] + r.rv
            if r.bill:
                bil["orders"][r.po] = 1
                bil["amount"] = bil["amount"] + r.bv
                if r.status == "On Hold":
                    bil["hold_orders"][r.po] = 1
                    bil["hold_amount"] = bil["hold_amount"] + r.bv
        follow = sorted(follow, key=lambda z: (z.sdate, z.po, cint(z.idx)))
        out["cards"] = {
            "placed": placed,
            "receipt": {"orders": len(rec["orders"]), "lines": rec["lines"], "amount": rec["amount"],
                        "hold_orders": len(rec["hold_orders"]), "hold_amount": rec["hold_amount"]},
            "overdue": {"lines": ovd["lines"], "orders": len(ovd["orders"]), "amount": ovd["amount"]},
            "billing": {"orders": len(bil["orders"]), "amount": bil["amount"],
                        "hold_orders": len(bil["hold_orders"]), "hold_amount": bil["hold_amount"]},
            "missing_required": {"lines": nosd["lines"], "orders": len(nosd["orders"]), "amount": nosd["amount"]}
        }
        out["trend"] = [{"date": str(t.d), "count": cint(t.n), "amount": flt(t.v)} for t in trend]
        out["suppliers"] = [{"key": s.k or UN, "label": (s.l or s.k) if s.k else "Unassigned", "count": cint(s.n), "amount": flt(s.v)} for s in sup]
        out["purchasers"] = [{"key": p.k or UN, "label": p.k or "Unassigned", "count": cint(p.n), "amount": flt(p.v)} for p in pur]
        out["follow_up"] = [{"order": r.po, "supplier": r.supplier_name or r.supplier, "purchaser": r.pur or "",
                             "item": r.item, "item_name": r.item_name, "required": r.sdate,
                             "days": frappe.utils.date_diff(today, r.sdate), "remaining_qty": r.remq, "uom": r.uom,
                             "amount": r.rv, "status": r.status} for r in follow[:50]]
        out["follow_up_total"] = ovd["lines"]
        locs = frappe.get_list(PO, filters=[[PO, "docstatus", "=", 1], [PO, "custom_delivery_location", "is", "set"]],
                               fields=["custom_delivery_location as k"], group_by="custom_delivery_location", limit_page_length=0)
        out["locations"] = sorted([l.k for l in locs if l.k])
        out["quality"] = {
            "placed_missing_location": cint(dq_loc[0].n) if dq_loc else 0,
            "placed_missing_incharge": cint(dq_inc[0].n) if dq_inc else 0,
            "backlog_missing_required": nosd["lines"],
            "backlog_returned_lines": len([r for r in lines if r.recv and flt(r.ret) > 0]),
            "zero_amount_lines": len([r for r in lines if not flt(r.amt)]),
            "legacy_workflow_states": len(wf_pending),
            "legacy_workflow_examples": sorted(list(set(wf_pending.values())))
        }
    else:
        levels = ["company", "purchaser", "supplier", "orders", "items"]
        if company:
            levels = levels[1:]
        if level not in levels:
            frappe.throw("Invalid level.")
        out["level"] = level
        out["levels"] = levels
        groups = []
        records = []
        total = {"count": 0, "amount": 0.0, "lines": 0}
        if measure == "placed" and level not in ["orders", "items"]:
            pf = placed_filters(path)
            fld = DIM[level]
            flds = [fld + " as k", "count(name) as n", "sum(base_net_total) as v"]
            if level == "supplier":
                flds.append("max(supplier_name) as l")
            for g in frappe.get_list(PO, filters=pf, fields=flds, group_by=fld, limit_page_length=0):
                groups.append({"key": g.k or UN, "label": (g.get("l") or g.k) if g.k else "Unassigned", "count": cint(g.n), "amount": flt(g.v)})
                total["count"] = total["count"] + cint(g.n)
                total["amount"] = total["amount"] + flt(g.v)
            groups = sorted(groups, key=lambda z: -z["amount"])
        elif measure == "placed" and level == "orders":
            pf = placed_filters(path)
            tot = frappe.get_list(PO, filters=pf, fields=["count(name) as n", "sum(base_net_total) as v"], limit_page_length=1)
            total = {"count": cint(tot[0].n) if tot else 0, "amount": flt(tot[0].v) if tot else 0.0, "lines": 0}
            for o in frappe.get_list(PO, filters=pf, fields=["name", "supplier", "supplier_name", "custom_purchaser_name as pur",
                                                            "custom_po_in_charge_ as inc", "transaction_date as d",
                                                            "custom_delivery_location as loc", "status", "base_net_total as v",
                                                            "per_received", "per_billed"],
                                     order_by="transaction_date desc, name desc", limit_start=page * PAGE, limit_page_length=PAGE):
                records.append({"order": o.name, "supplier": o.supplier_name or o.supplier, "purchaser": o.pur or "",
                                "incharge": o.inc or "", "date": str(o.d), "location": o.loc or "", "status": o.status,
                                "total": flt(o.v), "amount": flt(o.v), "per_received": flt(o.per_received),
                                "per_billed": flt(o.per_billed)})
        elif level == "items":
            if not path.get("order"):
                frappe.throw("Select an order.")
            if measure == "placed":
                ls = frappe.get_list(PO, filters=head_filters(path, True), fields=[
                    "name as po", CT + ".idx as idx", CT + ".item_code as item", CT + ".item_name as item_name",
                    CT + ".schedule_date as sd", CT + ".qty as qty", CT + ".received_qty as rq", CT + ".uom as uom",
                    CT + ".amount as amt", CT + ".billed_amt as bamt", CT + ".base_net_amount as bna"],
                    order_by=CT + ".idx asc", limit_page_length=0)
                sel = []
                for r in ls:
                    r.remq = max(flt(r.qty) - flt(r.rq), 0.0)
                    r.sdate = str(r.sd) if r.sd else ""
                    sel.append(r)
                vals = [flt(r.bna) for r in sel]
            else:
                sel = sorted(measure_lines(backlog_lines(path)), key=lambda z: cint(z.idx))
                vals = [line_value(r) for r in sel]
            total = {"count": len(sel), "amount": sum(vals), "lines": len(sel)}
            for i in range(page * PAGE, min(len(sel), (page + 1) * PAGE)):
                r = sel[i]
                records.append({"item": r.item, "item_name": r.item_name, "required": r.sdate,
                                "qty": flt(r.qty), "received": flt(r.rq), "remaining_qty": r.remq, "uom": r.uom,
                                "amount": vals[i], "overdue": 1 if (r.remq > 0.0000001 and r.sdate and r.sdate < today) else 0})
        else:
            sel = measure_lines(backlog_lines(path))
            if level == "orders":
                om = {}
                order_list = []
                for r in sel:
                    o = om.get(r.po)
                    if not o:
                        o = {"order": r.po, "supplier": r.supplier_name or r.supplier, "purchaser": r.pur or "",
                             "incharge": r.inc or "", "date": str(r.d), "location": r.loc or "", "status": r.status,
                             "total": flt(r.total), "amount": 0.0, "lines": 0, "per_received": flt(r.per_received),
                             "per_billed": flt(r.per_billed), "first_required": r.sdate}
                        om[r.po] = o
                        order_list.append(o)
                    o["amount"] = o["amount"] + line_value(r)
                    o["lines"] = o["lines"] + 1
                    if r.sdate and (not o["first_required"] or r.sdate < o["first_required"]):
                        o["first_required"] = r.sdate
                if measure == "overdue":
                    order_list = sorted(order_list, key=lambda z: (z["first_required"] or "9999", z["order"]))
                else:
                    order_list = sorted(order_list, key=lambda z: (z["date"], z["order"]), reverse=True)
                total = {"count": len(order_list), "amount": sum([o["amount"] for o in order_list]), "lines": len(sel)}
                records = order_list[page * PAGE:(page + 1) * PAGE]
            else:
                gm = {}
                for r in sel:
                    v = r.get({"company": "company", "purchaser": "pur", "supplier": "supplier"}[level]) or ""
                    k = v or UN
                    g = gm.get(k)
                    if not g:
                        g = {"key": k, "label": lbl(level, v, r), "orders": {}, "amount": 0.0, "lines": 0}
                        gm[k] = g
                    g["orders"][r.po] = 1
                    g["amount"] = g["amount"] + line_value(r)
                    g["lines"] = g["lines"] + 1
                for k in gm:
                    g = gm[k]
                    groups.append({"key": g["key"], "label": g["label"], "count": len(g["orders"]), "amount": g["amount"], "lines": g["lines"]})
                groups = sorted(groups, key=lambda z: -z["amount"])
                ords = {}
                for r in sel:
                    ords[r.po] = 1
                total = {"count": len(ords), "amount": sum([line_value(r) for r in sel]), "lines": len(sel)}
        out["groups"] = groups
        out["records"] = records
        out["total"] = total
        out["page"] = page
        out["page_size"] = PAGE

frappe.response["message"] = out
