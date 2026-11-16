# Manufacturing Dashboard - Daily Production Plan API v2 (2026-10-19). Source: Factory Job Order. Read-only, Guest off, permission-checked get_list only.
LIMIT = 3000
def S(v):
    if v is None:
        return ""
    return str(v)

def addto(d, k, v):
    d[k] = frappe.utils.flt(d.get(k)) + frappe.utils.flt(v)

def is_admin():
    return len(frappe.get_all("Has Role", filters={"parenttype": "User", "parent": frappe.session.user, "role": "System Manager"}, pluck="name", limit_page_length=1)) > 0

def load_scope(company, factory):
    # Factories in scope = active factories of this company (user permissions on Company/Factory apply via get_list)
    # that have at least one Confirmed warehouse mapping. Branch labels come only from these factories.
    flt = [["Manufacturing Factory", "company", "=", company], ["Manufacturing Factory", "is_active", "=", 1]]
    if frappe.form_dict.get("dashboard_scope") == "28_34":
        flt.append(["Manufacturing Factory", "legacy_branch_label", "in", ["28 Factory", "34 Factory"]])
    facs = frappe.get_list("Manufacturing Factory", filters=flt, fields=["name", "company", "legacy_branch_label"], order_by="legacy_branch_label asc", limit_page_length=200)
    rows = frappe.get_list("Manufacturing Factory", filters=flt + [["Manufacturing Factory Warehouse", "mapping_status", "=", "Confirmed"]],
        fields=["name", "`tabManufacturing Factory Warehouse`.warehouse as warehouse"], limit_page_length=1000)
    wh_by_fac = {}
    for r in rows:
        if r.get("warehouse"):
            if r.get("name") not in wh_by_fac:
                wh_by_fac[r.get("name")] = []
            wh_by_fac[r.get("name")].append(r.get("warehouse"))
    options = []
    label = {}
    for f in facs:
        if f.get("name") in wh_by_fac and f.get("company") == company:
            lb = f.get("legacy_branch_label") or f.get("name")
            options.append({"name": f.get("name"), "label": lb, "branch_label": f.get("legacy_branch_label"), "warehouses": wh_by_fac[f.get("name")]})
            label[f.get("name")] = lb
    options = sorted(options, key=lambda x: x["label"])
    if factory and factory not in label:
        frappe.throw("Factory not found, inactive, without a Confirmed mapping, outside this company, or not permitted: " + S(factory))
    scope = [o for o in options if (not factory) or o["name"] == factory]
    wh_map = {}
    branch_map = {}
    for o in scope:
        for w in o["warehouses"]:
            wh_map[w] = o["label"]
        if o["branch_label"]:
            branch_map[o["branch_label"]] = o["label"]
    return {"options": options, "scope": scope, "wh_map": wh_map, "branch_map": branch_map}
ACTIVE = ["Open", "Assigned", "Inprogress"]

def parse_qty(t):
    s = S(t).strip()
    if s == "":
        return None
    n = frappe.utils.flt(s)
    if n == 0 and s not in ["0", "0.0", "0.00"]:
        return None
    return n

def bucket(days):
    if days <= 7:
        return "1-7 days"
    if days <= 30:
        return "8-30 days"
    if days <= 90:
        return "31-90 days"
    return "Over 90 days"

form = frappe.form_dict
company = form.get("company") or frappe.db.get_single_value("Manufacturing Dashboard Settings", "default_company")
factory = form.get("factory") or ""
today = frappe.utils.getdate(frappe.utils.nowdate())
ps = frappe.utils.getdate(form.get("plan_start") or form.get("plan_date") or frappe.utils.add_days(today, 1))
pe = frappe.utils.getdate(form.get("plan_end") or form.get("plan_start") or form.get("plan_date") or frappe.utils.add_days(today, 1))
if ps > pe:
    frappe.throw("Start Date must be on or before End Date")
if frappe.utils.date_diff(pe, ps) > 366:
    frappe.throw("Date range cannot exceed 367 days")
pd = ps
admin = is_admin()

res = {"company": company, "factory": factory or "", "plan_date": S(ps), "plan_start": S(ps), "plan_end": S(pe), "plan_days": frappe.utils.date_diff(pe, ps) + 1, "today": S(today), "timezone": "Asia/Riyadh",
       "plan_is_future": ps > today, "source": "Factory Job Order",
       "uom_note": "No unit of measure is recorded on Factory Job Order rows.", "notes": [], "is_admin": admin}

sc = None
try:
    sc = load_scope(company, factory)
except Exception as e:
    if "Factory not found" in S(e):
        raise
    res["access"] = "Access unavailable: Manufacturing Factory mapping"

if sc is not None:
    res["factory_options"] = [{"name": o["name"], "label": o["label"]} for o in sc["options"]]
    bm = sc["branch_map"]
    labels = [b for b in bm]
    fields = ["`tabFactory Job Order`.name as jo", "`tabFactory Job Order`.start_date as start_date", "`tabFactory Job Order`.end_date as end_date",
              "`tabFactory Job Order`.branch as branch", "`tabFactory Job Order`.jo_type as jo_type",
              "`tabFactory Job Order`.jo_status as jo_status", "`tabFactory Job Order`.docstatus as docstatus",
              "`tabDaily Factory Utilization Table`.idx as idx",
              "`tabDaily Factory Utilization Table`.employee as employee", "`tabDaily Factory Utilization Table`.designation as designation",
              "`tabDaily Factory Utilization Table`.item_code as item_code", "`tabDaily Factory Utilization Table`.item_name as item_name",
              "`tabDaily Factory Utilization Table`.regular_size as size", "`tabDaily Factory Utilization Table`.activity as activity",
              "`tabDaily Factory Utilization Table`.special_qty as qty_req"]
    try:
        cover = []
        open_sub = []
        if labels:
            base = [["Factory Job Order", "branch", "in", labels], ["Factory Job Order", "jo_status", "in", ACTIVE]]
            cover = frappe.get_list("Factory Job Order", filters=base + [["Factory Job Order", "docstatus", "<", 2], ["Factory Job Order", "start_date", "<=", S(pe)], ["Factory Job Order", "end_date", ">=", S(ps)]],
                                    fields=fields, order_by="`tabFactory Job Order`.name asc, `tabDaily Factory Utilization Table`.idx asc", limit_page_length=LIMIT + 1)
            open_sub = frappe.get_list("Factory Job Order", filters=[["Factory Job Order", "branch", "in", labels], ["Factory Job Order", "docstatus", "=", 1], ["Factory Job Order", "jo_status", "not in", ["Completed"]]],
                                       fields=fields, order_by="`tabFactory Job Order`.end_date desc", limit_page_length=LIMIT + 1)
        else:
            res["notes"].append("No permitted factory with a Confirmed mapping and Branch Label for this company.")
        res["truncated"] = len(cover) > LIMIT or len(open_sub) > LIMIT
        sched = []
        drafts = []
        sj = {}
        se = {}
        dj = {}
        de = {}
        acts = {}
        for r in cover[:LIMIT]:
            fac = bm.get(r.get("branch"))
            if not fac:
                continue
            sd = frappe.utils.getdate(r.get("start_date"))
            ed = frappe.utils.getdate(r.get("end_date"))
            days = frappe.utils.date_diff(ed, sd) + 1
            q = parse_qty(r.get("qty_req"))
            row = {"jo": r.get("jo"), "factory": fac, "employee": r.get("employee"), "designation": r.get("designation"),
                   "item_code": r.get("item_code"), "item": r.get("item_name") or r.get("item_code"),
                   "size": r.get("size"), "activity": r.get("activity"), "qty_req_text": r.get("qty_req"), "qty_req": q, "qty_numeric": q is not None,
                   "qty_basis": "Order-period quantity (" + S(days) + (" days)" if days != 1 else " day)"),
                   "multi_day": days > 1, "start_date": S(sd), "end_date": S(ed), "jo_status": r.get("jo_status"), "docstatus": r.get("docstatus")}
            if r.get("docstatus") == 1:
                sched.append(row)
                sj[r.get("jo")] = 1
                if r.get("employee"):
                    se[r.get("employee")] = 1
                if r.get("activity"):
                    acts[r.get("activity")] = frappe.utils.cint(acts.get(r.get("activity"))) + 1
            else:
                drafts.append(row)
                dj[r.get("jo")] = 1
                if r.get("employee"):
                    de[r.get("employee")] = 1
        res["scheduled"] = sched
        res["draft_rows"] = drafts
        res["summary"] = {"job_orders": len(sj), "activity_rows": len(sched), "unique_employees": len(se),
                          "activities": [{"activity": a, "rows": acts[a]} for a in acts],
                          "draft_job_orders": len(dj), "draft_activity_rows": len(drafts), "draft_unique_employees": len(de)}
        carry = {}
        review = {}
        for r in open_sub[:LIMIT]:
            fac = bm.get(r.get("branch"))
            if not fac:
                continue
            jo = r.get("jo")
            s0 = r.get("start_date")
            e0 = r.get("end_date")
            bad = None
            if not s0 or not e0:
                bad = "Missing start or end date"
            elif frappe.utils.getdate(e0) < frappe.utils.getdate(s0):
                bad = "End date before start date"
            target = None
            if bad:
                target = review
            elif frappe.utils.getdate(e0) < ps:
                target = carry
            if target is None:
                continue
            if jo not in target:
                item = {"jo": jo, "factory": fac, "start_date": S(s0) or None, "end_date": S(e0) or None,
                        "jo_status": r.get("jo_status") or "Not set", "jo_type": r.get("jo_type"), "activity_rows": 0, "employees": {}, "activities": []}
                if bad:
                    item["reason"] = bad
                else:
                    ed = frappe.utils.getdate(e0)
                    if ed < today:
                        od = frappe.utils.date_diff(today, ed)
                        item["kind"] = "Overdue"
                        item["days_overdue"] = od
                        item["ageing"] = bucket(od)
                    else:
                        item["kind"] = "Potential carryover based on current status"
                        item["days_overdue"] = 0
                        item["ageing"] = "Not yet overdue"
                target[jo] = item
            target[jo]["activity_rows"] = target[jo]["activity_rows"] + 1
            if r.get("employee"):
                target[jo]["employees"][r.get("employee")] = 1
            if r.get("activity") and r.get("activity") not in target[jo]["activities"]:
                target[jo]["activities"].append(r.get("activity"))
        out_c = []
        for k in carry:
            c = carry[k]
            c["unique_employees"] = len(c["employees"])
            c["employees"] = None
            out_c.append(c)
        out_r = []
        for k in review:
            c = review[k]
            c["unique_employees"] = len(c["employees"])
            c["employees"] = None
            out_r.append(c)
        res["carryover"] = sorted(out_c, key=lambda x: x["days_overdue"], reverse=True)
        res["schedule_review"] = out_r
        if admin and not factory:
            ex = frappe.get_list("Factory Job Order", filters=[["docstatus", "<", 2]] + ([["branch", "not in", labels]] if labels else []),
                                 fields=["branch", "docstatus", "jo_status", "count(name) as n"], group_by="branch, docstatus, jo_status", limit_page_length=100)
            res["diagnostics"] = {"excluded_job_orders": ex}
    except Exception:
        res["access"] = "Access unavailable: Factory Job Order"
frappe.response["message"] = res
