# Manufacturing Dashboard - Jobs API (2026-10-20). Source: Factory Job Order. Read-only, Guest off, permission-checked get_list only.
LIMIT = 5000
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

ACTIVE = ["Assigned", "Inprogress"]
PENDING = ["Open"]
form = frappe.form_dict
company = form.get("company") or frappe.db.get_single_value("Manufacturing Dashboard Settings", "default_company")
factory = form.get("factory") or ""
today = frappe.utils.getdate(frappe.utils.nowdate())
fd = frappe.utils.getdate(form.get("from_date") or frappe.utils.nowdate())
td = frappe.utils.getdate(form.get("to_date") or form.get("from_date") or frappe.utils.nowdate())
if fd > td:
    frappe.throw("Start Date must be on or before End Date")
if frappe.utils.date_diff(td, fd) > 366:
    frappe.throw("Date range cannot exceed 367 days")
res = {"company": company, "factory": factory or "", "from_date": S(fd), "to_date": S(td), "today": S(today), "notes": [],
       "rules": "Submitted Factory Job Orders only. Active = JO Status Assigned or Inprogress; Pending = Open; Completed, cancelled and draft orders excluded. In range = schedule overlaps the selected dates. Carryover = ended before the start date and not Completed."}
sc = None
try:
    sc = load_scope(company, factory)
except Exception as e:
    if "Factory not found" in S(e):
        raise
    res["access"] = "Access unavailable: Manufacturing Factory mapping"
if sc is not None:
    bm = sc["branch_map"]
    labels = [b for b in bm]
    if not labels:
        res["notes"].append("No Factory Job Orders are filed under the selected factory (no branch label).")
    try:
        rows = []
        if labels:
            P = "`tabFactory Job Order`"
            C = "`tabDaily Factory Utilization Table`"
            rows = frappe.get_list("Factory Job Order", filters=[["Factory Job Order", "docstatus", "=", 1], ["Factory Job Order", "branch", "in", labels], ["Factory Job Order", "jo_status", "in", ACTIVE + PENDING]],
                fields=[P + ".name as jo", P + ".start_date as s", P + ".end_date as e", P + ".branch as branch", P + ".jo_status as st", P + ".jo_type as jt", C + ".employee as emp", C + ".name as rowname"],
                limit_page_length=LIMIT + 1)
        res["truncated"] = len(rows) > LIMIT
        jos = {}
        order = []
        for r in rows[:LIMIT]:
            k = r.get("jo")
            if k not in jos:
                jos[k] = {"jo": k, "factory": bm.get(r.get("branch")) or S(r.get("branch")), "start_date": S(r.get("s")) or None, "end_date": S(r.get("e")) or None,
                          "status": r.get("st"), "jo_type": r.get("jt"), "rows": 0, "emps": {}}
                order.append(k)
            if r.get("rowname"):
                jos[k]["rows"] = jos[k]["rows"] + 1
            if r.get("emp"):
                jos[k]["emps"][r.get("emp")] = 1
        active = []
        pending = []
        carry = []
        review = []
        future = 0
        for k in order:
            j = jos[k]
            j["employees"] = len(j["emps"])
            j["emps"] = None
            j["kind"] = "Active" if j["status"] in ACTIVE else "Pending"
            if not j["start_date"] or not j["end_date"]:
                j["issue"] = "Missing start or end date"
                review.append(j)
                continue
            sd = frappe.utils.getdate(j["start_date"])
            ed = frappe.utils.getdate(j["end_date"])
            if ed < sd:
                j["issue"] = "End date before start date"
                review.append(j)
                continue
            if ed < fd:
                j["days_overdue"] = frappe.utils.date_diff(today, ed) if ed < today else 0
                carry.append(j)
                continue
            if sd > td:
                future = future + 1
                continue
            if j["kind"] == "Active":
                active.append(j)
            else:
                pending.append(j)
        res["active"] = sorted(active, key=lambda x: x["start_date"])
        res["pending"] = sorted(pending, key=lambda x: x["start_date"])
        res["carryover"] = sorted(carry, key=lambda x: x["end_date"])
        res["schedule_review"] = review
        res["summary"] = {"active": len(active), "pending": len(pending), "carryover": len(carry), "carryover_active": len([x for x in carry if x["kind"] == "Active"]),
            "carryover_pending": len([x for x in carry if x["kind"] == "Pending"]), "schedule_review": len(review), "starting_after_range": future}
    except Exception:
        res["access"] = "Access unavailable: Factory Job Order"
frappe.response["message"] = res
