# Admin & HR Dashboard - Leave & Approvals API (Server Script, API method: admin_hr_leave_data)
# READ-ONLY. Login required. Never writes, never applies workflow actions.
# Tiers: HR Manager / HR User -> employee-level rows ("detail");
#        System Manager / IT Coordinator without an HR role -> counts and charts only ("aggregate").
# Every Leave Application / Allocation / Ledger / Employee read uses frappe.get_list, so DocType permissions and
# Employee User Permissions apply. frappe.get_all is used only for: the caller's own roles, Company names,
# Leave Type flags, the active Workflow configuration, Workflow comments of applications the caller has
# already read, user full names of approvers, and line-manager user ids (compared with the caller, never returned).
# Not returned: passport / iqama numbers, date of birth, nationality-document fields, attachment URLs.
#
# modes: summary (default) | list | detail

ALLOWED_ROLES = ["System Manager", "HR Manager", "HR User", "IT Coordinator","Dashboard Manager"]
DETAIL_ROLES = ["HR Manager", "HR User","Dashboard Manager"]
DEFAULT_COMPANY = "Durar Masagh Trading Company"
U = frappe.utils

user = frappe.session.user
role_rows = frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, fields=["role"])
disabled_roles = [x.get("name") for x in frappe.get_all("Role", filters={"disabled": 1}, fields=["name"])]
roles = [x.get("role") for x in role_rows if x.get("role") not in disabled_roles]
if user == "Administrator":
    roles = roles + ALLOWED_ROLES
if user == "Guest" or len([r for r in roles if r in ALLOWED_ROLES]) == 0:
    frappe.throw("Not permitted.", title="Not Permitted")
detail = len([r for r in roles if r in DETAIL_ROLES]) > 0
fd = frappe.form_dict
if detail and fd.get("preview_tier") == "aggregate":
    detail = False
mode = fd.get("mode") or "summary"
if mode not in ["summary", "list", "detail"]:
    frappe.throw("Invalid mode.")
if mode != "summary" and not detail:
    frappe.throw("Employee-level leave data is restricted to HR Manager / HR User.", title="Restricted")

today = U.getdate(U.nowdate())
today_s = str(today)


# Phase 9.1: role-based read pre-check (frappe.has_permission is not exposed to Server Scripts on this site).
# Mirrors Frappe's DocType-level rule: Custom DocPerm replaces DocPerm when present; permlevel 0 "read" for one of the caller's roles.
# It only decides whether to attempt the query; frappe.get_list still enforces all permissions and User Permissions.
PERM_CACHE = {}


def can_read(dt):
    if dt in PERM_CACHE:
        return PERM_CACHE[dt]
    u = frappe.session.user
    if u == "Administrator":
        PERM_CACHE[dt] = True
        return True
    my_roles = [x.get("role") for x in frappe.get_all("Has Role", filters={"parent": u, "parenttype": "User"}, fields=["role"])] + ["All"]
    tbl = "Custom DocPerm" if frappe.get_all("Custom DocPerm", filters={"parent": dt}, fields=["name"], limit_page_length=1) else "DocPerm"
    ok = len(frappe.get_all(tbl, filters=[["parent", "=", dt], ["permlevel", "=", 0], ["read", "=", 1], ["role", "in", my_roles]], fields=["name"], limit_page_length=1)) > 0
    PERM_CACHE[dt] = ok
    return ok


def pdate(v, dflt):
    if not v:
        return dflt
    try:
        return U.getdate(v)
    except Exception:
        frappe.throw("Invalid date.")


def fetch(doctype, filters, fields, order_by, errors):
    # Phase 9.1: skip DocTypes the caller cannot read, before querying, so no permission pop-up is raised.
    if not can_read(doctype):
        errors.append(doctype)
        return None
    try:
        return frappe.get_list(doctype, filters=filters, fields=fields, order_by=order_by, limit_page_length=0)
    except Exception as e:
        errors.append(doctype)
        return None


# ---------------- active workflow configuration (config only) ----------------
wf = frappe.get_all("Workflow", filters={"document_type": "Leave Application", "is_active": 1}, fields=["name"])
wf_name = wf[0].get("name") if wf else None
transitions = frappe.get_all("Workflow Transition", filters={"parent": wf_name}, fields=["state", "action", "next_state", "allowed"]) if wf_name else []
wf_states = [s.get("state") for s in frappe.get_all("Workflow Document State", filters={"parent": wf_name}, fields=["state"])] if wf_name else []
my_actions = {}
for t in transitions:
    if t.get("allowed") in roles or user == "Administrator":
        k = t.get("state")
        my_actions[k] = (my_actions.get(k) or []) + [t.get("action") + " → " + t.get("next_state")]
lwp_types = {}
for t in frappe.get_all("Leave Type", fields=["name", "is_lwp"]):
    if t.get("is_lwp"):
        lwp_types[t.get("name")] = 1


def is_pending(ws):
    return ("PENDING" in (ws or "").upper()) or ws == "On-Hold"


def classify(l):
    ws = l.get("workflow_state") or ""
    st = l.get("status") or ""
    ds = l.get("docstatus")
    if ds == 1 and ws == "Approved" and st == "Rejected":
        return "conflict"
    if ds == 1 and ws == "Approved":
        return "approved"
    if ws == "Rejected" or (st == "Rejected" and ds != 0):
        return "rejected"
    if ds == 2 or ws.lower() == "cancelled":
        return "cancelled"
    if is_pending(ws):
        return "pending"
    if ds == 0:
        return "draft"
    return "other"


def conflict_reason(l):
    ws = l.get("workflow_state") or ""
    st = l.get("status") or ""
    ds = l.get("docstatus")
    if ws == "Approved" and st == "Rejected":
        return "Workflow Approved but status Rejected"
    if ws == "Approved" and ds == 2:
        return "Workflow Approved but document cancelled"
    if ds == 0 and st == "Approved" and not is_pending(ws):
        return "Draft (not submitted) but status Approved"
    if ds == 0 and st == "Cancelled":
        return "Draft (not submitted) but status Cancelled"
    if ws == "Rejected" and st not in ["Rejected", "Cancelled"]:
        return "Workflow Rejected but status " + st
    return None


# ---------------- scope ----------------
companies = [c.get("name") for c in frappe.get_all("Company", fields=["name"], order_by="name asc")]
company = fd.get("company") or DEFAULT_COMPANY
if company != "All" and company not in companies:
    frappe.throw("Company not found.", title="Not Permitted")
period_from = pdate(fd.get("from_date"), U.getdate(str(today.year) + "-01-01"))
period_to = pdate(fd.get("to_date"), today)
if period_to < period_from:
    frappe.throw("Invalid period.")
if U.date_diff(period_to, period_from) > 1100:
    frappe.throw("Period too long (max 3 years).")
pf_s = str(period_from)
pt_s = str(period_to)
ERR = []
cfilter = [] if company == "All" else [["company", "=", company]]

# ---- Phase 8: global dashboard filters (applied to the employee's current Employee record) ----
GF = {"department": fd.get("g_department") or "", "branch": fd.get("g_branch") or "", "custom_job_location": fd.get("g_job_location") or ""}
GF_ON = len([k for k in GF if GF[k]]) > 0
GF_FILTERS = [([k, "is", "not set"] if GF[k] == "(Not set)" else [k, "=", GF[k]]) for k in GF if GF[k]]
EMPX = {}
if GF_ON:
    for e in (frappe.get_list("Employee", filters=cfilter + GF_FILTERS, fields=["name"], limit_page_length=0) or []):
        EMPX[e.get("name")] = 1


# ---- Phase 8: small-group privacy for the aggregate tier ----
SUPPRESS_MIN = 3
NUMK = ["count", "open", "overdue", "expired", "due", "total", "done", "days", "headcount", "assigned", "mand_open", "per_head", "pct", "avg", "timed", "closed", "paid", "lwp"]


def suppress(o):
    if isinstance(o, dict):
        for k in list(o.keys()):
            o[k] = suppress(o[k])
        return o
    if isinstance(o, list):
        for it in o:
            if isinstance(it, dict) and ("label" in it) and not ("key" in it or "severity" in it or "month" in it or "date" in it):
                small = False
                for k in ["count", "total", "headcount"]:
                    v = it.get(k)
                    if v is not None and isinstance(v, (int, float)) and 0 < v < SUPPRESS_MIN:
                        small = True
                if small:
                    for k in NUMK:
                        if k in it:
                            it[k] = None
                    it["suppressed"] = 1
            else:
                suppress(it)
        return o
    return o


def small_scope_guard(n):
    if not detail and GF_ON and n < 5:
        frappe.throw("Fewer than 5 employees match these filters. Aggregate figures are not shown for groups this small.", title="Too few employees")


LA_FIELDS = ["name", "employee", "employee_name", "department", "company", "leave_type", "from_date", "to_date",
             "total_leave_days", "workflow_state", "status", "docstatus", "leave_approver", "leave_approver_name",
             "custom_line_manager", "posting_date", "creation", "half_day"]


def row_of(l):
    return {"name": l.get("name"), "employee": l.get("employee"), "employee_name": l.get("employee_name"),
            "department": l.get("department"), "company": l.get("company"), "leave_type": l.get("leave_type"),
            "from_date": str(l.get("from_date")), "to_date": str(l.get("to_date")), "days": l.get("total_leave_days") or 0,
            "workflow_state": l.get("workflow_state") or "", "status": l.get("status") or "", "docstatus": l.get("docstatus"),
            "approver": l.get("leave_approver_name") or l.get("leave_approver") or "", "cls": classify(l),
            "posting_date": str(l.get("posting_date") or str(l.get("creation"))[:10]), "age_days": None, "note": ""}


def workflow_comments(names):
    out = {}
    if not names:
        return out
    i = 0
    while i < len(names):
        chunk = names[i:i + 400]
        for c in frappe.get_all("Comment", filters=[["reference_doctype", "=", "Leave Application"], ["reference_name", "in", chunk],
                                                    ["comment_type", "=", "Workflow"]],
                                fields=["reference_name", "content", "owner", "creation"], order_by="creation asc"):
            k = c.get("reference_name")
            out[k] = (out.get(k) or []) + [c]
        i = i + 400
    return out


def build():
    la = fetch("Leave Application", cfilter, LA_FIELDS, "from_date desc", ERR)
    if la is None:
        frappe.throw("Leave Application is not readable with your permissions.", title="Not Permitted")
    rows = [row_of(l) for l in la]
    if GF_ON:
        rows = [r for r in rows if EMPX.get(r["employee"])]
    raw = {}
    for l in la:
        raw[l.get("name")] = l
    # age in current pending state (from the latest Workflow comment for that state; else posting date)
    pend = [r for r in rows if r["cls"] == "pending"]
    wc = workflow_comments([r["name"] for r in pend])
    for r in pend:
        since = None
        for c in (wc.get(r["name"]) or []):
            if (c.get("content") or "") == r["workflow_state"]:
                since = str(c.get("creation"))[:10]
        r["state_since"] = since or r["posting_date"]
        r["age_days"] = U.date_diff(today, U.getdate(r["state_since"]))
        r["age_basis"] = "workflow comment" if since else "posting date"
    return rows, raw


def overlaps(rows):
    live = [r for r in rows if r["cls"] in ["approved", "pending", "draft", "conflict"]]
    by = {}
    for r in live:
        by[r["employee"]] = (by.get(r["employee"]) or []) + [r]
    pairs = []
    for k in by:
        arr = sorted(by[k], key=lambda x: x["from_date"])
        i = 0
        while i < len(arr):
            j = i + 1
            while j < len(arr) and arr[j]["from_date"] <= arr[i]["to_date"]:
                pairs.append([arr[i]["name"], arr[j]["name"]])
                j = j + 1
            i = i + 1
    return pairs


def allocations():
    al = fetch("Leave Allocation", [["docstatus", "=", 1]] + cfilter, ["employee", "leave_type", "from_date", "to_date"], "from_date asc", ERR)
    m = {}
    for a in (al or []):
        k = a.get("employee") + "|" + a.get("leave_type")
        m[k] = (m.get(k) or []) + [[str(a.get("from_date")), str(a.get("to_date"))]]
    return al, m


def dq_sets(rows, alloc_map, al_ok):
    pairs = overlaps(rows)
    ov = {}
    for p in pairs:
        ov[p[0]] = (ov.get(p[0]) or []) + [p[1]]
        ov[p[1]] = (ov.get(p[1]) or []) + [p[0]]
    S = {"status_pending": [], "legacy_open": [], "conflict": [], "obsolete_state": [], "no_alloc": [], "no_approver": [], "overlap": []}
    for r in rows:
        ws = r["workflow_state"]
        if r["status"] == "Approved" and is_pending(ws):
            S["status_pending"].append([r, "Submitted - ledger already deducted" if r["docstatus"] == 1 else "Not submitted"])
        if r["cls"] == "approved" and r["status"] == "Open":
            S["legacy_open"].append([r, "Workflow Approved & submitted, status still Open"])
        cr = conflict_reason(r)
        if cr:
            S["conflict"].append([r, cr])
        if r["cls"] in ["pending", "draft"] and ws and wf_states and ws not in wf_states:
            S["obsolete_state"].append([r, "State '" + ws + "' is not in the active workflow"])
        if al_ok and r["cls"] == "approved" and not lwp_types.get(r["leave_type"]):
            ok = False
            for a in (alloc_map.get(r["employee"] + "|" + r["leave_type"]) or []):
                if a[0] <= r["from_date"] and a[1] >= r["from_date"]:
                    ok = True
            if not ok:
                S["no_alloc"].append([r, "No submitted allocation covers " + r["from_date"]])
        if not r["approver"] and r["cls"] not in ["cancelled", "rejected"]:
            S["no_approver"].append([r, "Leave approver empty"])
        if ov.get(r["name"]):
            S["overlap"].append([r, "Overlaps " + ", ".join(ov.get(r["name"]))])
    return S, len(pairs)


DQ_LABELS = [["status_pending", "Status 'Approved' while workflow still pending", "high"],
             ["no_alloc", "Approved leave without a covering allocation", "high"],
             ["overlap", "Overlapping applications (same employee)", "high"],
             ["conflict", "Conflicting status / workflow / docstatus", "medium"],
             ["obsolete_state", "Pending in a state not in the active workflow", "medium"],
             ["no_approver", "Missing leave approver", "medium"],
             ["legacy_open", "Approved & submitted but status 'Open' (legacy)", "low"]]


def in_period(r):
    return r["from_date"] <= pt_s and r["to_date"] >= pf_s


def my_queue(r, lm_users):
    if r["cls"] != "pending" or not my_actions.get(r["workflow_state"]):
        return False
    if r["workflow_state"] in ["Pending First Approval", "Pending Approval"] and user != "Administrator":
        return r.get("_approver_user") == user or lm_users.get(r.get("_lm")) == user
    return True


def lm_user_map(raw):
    lms = {}
    for k in raw:
        if raw[k].get("custom_line_manager"):
            lms[raw[k].get("custom_line_manager")] = 1
    m = {}
    if lms:
        for e in frappe.get_all("Employee", filters=[["name", "in", list(lms.keys())]], fields=["name", "user_id"]):
            m[e.get("name")] = e.get("user_id")
    return m


fast_ok = mode == "list" and (fd.get("preset") or "") == "" and (fd.get("sort_by") or "from_date") in ["name", "employee_name", "department", "company", "leave_type", "from_date", "to_date", "days", "workflow_state", "status", "approver"]

# ======================================================================= SUMMARY
if mode == "summary":
    bres = build()
    rows = bres[0]
    raw = bres[1]
    for r in rows:
        r["_approver_user"] = raw[r["name"]].get("leave_approver")
        r["_lm"] = raw[r["name"]].get("custom_line_manager")
    lmu = lm_user_map(raw)
    emps = fetch("Employee", [["status", "=", "Active"]] + cfilter + GF_FILTERS, ["name", "employee_name", "department"], "name asc", ERR) or []
    small_scope_guard(len(emps))
    active = {}
    for e in emps:
        active[e.get("name")] = e
    ares = allocations()
    al = ares[0]
    amap = ares[1]
    al_ok = al is not None
    approved = [r for r in rows if r["cls"] == "approved"]
    pending = [r for r in rows if r["cls"] == "pending"]
    rejected_p = [r for r in rows if r["cls"] == "rejected" and in_period(r)]
    approved_p = [r for r in approved if in_period(r)]
    on_leave = [r for r in approved if r["from_date"] <= today_s and r["to_date"] >= today_s]
    on_leave_emp = {}
    for r in on_leave:
        on_leave_emp[r["employee"]] = 1
    on_leave_active = len([k for k in on_leave_emp if active.get(k)])
    in30 = str(U.add_days(today, 30))
    upcoming = [r for r in approved if r["from_date"] > today_s and r["from_date"] <= in30]
    used = [r for r in approved if r["from_date"] >= pf_s and r["from_date"] <= pt_s]
    used_days = round(sum([r["days"] for r in used]), 1)
    used_lwp = round(sum([r["days"] for r in used if lwp_types.get(r["leave_type"])]), 1)
    pend_old = [r for r in pending if (r["age_days"] or 0) > 3]
    pend_sub = [r for r in pending if r["docstatus"] == 1]
    cur_alloc = {}
    for a in (al or []):
        if str(a.get("from_date")) <= today_s and str(a.get("to_date")) >= today_s:
            cur_alloc[a.get("employee")] = 1
    no_alloc_emp = [e for e in emps if not cur_alloc.get(e.get("name"))]

    def kpi(key, label, value, sub, basis, preset):
        return {"key": key, "label": label, "value": value, "sub": sub, "basis": basis, "preset": preset if detail else None}

    kpis = [
        kpi("pending", "Pending Leave Applications", len(pending),
            str(len(pend_sub)) + " already submitted (ledger deducted) · " + str(len([r for r in pending if (r["age_days"] or 0) > 90])) + " waiting >90 days",
            "Workflow state Pending* or On-Hold, not cancelled. Not counted as approved.", "kpi_pending"),
        kpi("approved", "Approved Applications", len(approved_p),
            str(round(sum([r["days"] for r in approved_p]), 1)) + " days · period " + pf_s + " → " + pt_s,
            "Submitted (docstatus 1) AND workflow state Approved AND status not Rejected; overlapping the selected period.", "kpi_approved"),
        kpi("rejected", "Rejected Applications", len(rejected_p), "in selected period",
            "Workflow state Rejected (or submitted with status Rejected); overlapping the selected period.", "kpi_rejected"),
        kpi("on_leave", "Employees on Approved Leave Today", on_leave_active,
            (str(len(on_leave_emp) - on_leave_active) + " more not Active") if len(on_leave_emp) > on_leave_active else "Active employees",
            "Distinct active employees with an approved application covering today.", "kpi_on_leave"),
        kpi("upcoming", "Upcoming Approved Leave", len(upcoming), "starting in the next 30 days",
            "Approved applications with from date after today and within 30 days.", "kpi_upcoming"),
        kpi("used", "Leave Days Used in Period", used_days, str(used_lwp) + " unpaid (LWP) · " + str(len(used)) + " applications",
            "Sum of total_leave_days of approved applications starting inside the period (pending excluded).", "kpi_used"),
        kpi("pending_old", "Pending Approvals Older Than 3 Days", len(pend_old), "in the current workflow state",
            "Days since the application entered its current state (Workflow comment), else since posting date.", "kpi_pending_old"),
        kpi("no_alloc", "Employees Without Current Leave Allocation", len(no_alloc_emp) if al_ok else None,
            "of " + str(len(emps)) + " active employees" if al_ok else "Leave Allocation not readable",
            "Active employees with no submitted Leave Allocation (any type) covering today.", "no_alloc_emp"),
    ]

    # approval queues
    q_my = [r for r in pending if my_queue(r, lmu)]
    q_hr = [r for r in pending if r["workflow_state"] == "Pending Review"]
    queues = {"my": len(q_my), "hr_review": len(q_hr), "awaiting": len(pending),
              "by_state": sorted([{"label": s, "count": len([r for r in pending if r["workflow_state"] == s])}
                                  for s in list(dict([(r["workflow_state"], 1) for r in pending]).keys())], key=lambda x: -x["count"]),
              "my_actions": my_actions, "workflow": wf_name,
              "note": "Approve / reject only inside the ERPNext Leave Application form, where the workflow checks your role. The dashboard has no approval buttons."}

    # analytics
    months = []
    m0 = U.getdate(str(today.year) + "-" + str(today.month).zfill(2) + "-01")
    i = 11
    while i >= 0:
        months.append(str(U.add_months(m0, -i))[:7])
        i = i - 1
    mu = {}
    for r in approved:
        k = r["from_date"][:7]
        if k in months:
            cur = mu.get(k) or {"paid": 0, "lwp": 0, "apps": 0}
            if lwp_types.get(r["leave_type"]):
                cur["lwp"] = cur["lwp"] + r["days"]
            else:
                cur["paid"] = cur["paid"] + r["days"]
            cur["apps"] = cur["apps"] + 1
            mu[k] = cur
    monthly = [{"month": m, "paid": round((mu.get(m) or {}).get("paid", 0), 1), "lwp": round((mu.get(m) or {}).get("lwp", 0), 1),
                "apps": (mu.get(m) or {}).get("apps", 0)} for m in months]
    head = {}
    for e in emps:
        k = e.get("department") or "(Not set)"
        head[k] = head.get(k, 0) + 1
    dd = {}
    for r in used:
        k = r["department"] or "(Not set)"
        dd[k] = dd.get(k, 0) + r["days"]
    by_dept = sorted([{"label": k, "days": round(dd[k], 1), "headcount": head.get(k, 0),
                       "per_head": round(dd[k] / head.get(k), 1) if head.get(k) else None} for k in dd], key=lambda x: -x["days"])
    tt = {}
    for r in used:
        k = r["leave_type"] or "(Not set)"
        tt[k] = tt.get(k, 0) + r["days"]
    by_type = sorted([{"label": k, "count": round(tt[k], 1)} for k in tt], key=lambda x: -x["count"])
    buckets = [["0-3", 0, 3], ["4-7", 4, 7], ["8-30", 8, 30], ["31-90", 31, 90], [">90", 91, 100000]]
    by_age = [{"label": b[0], "count": len([r for r in pending if b[1] <= (r["age_days"] or 0) <= b[2]])} for b in buckets]
    cal_m = fd.get("cal_month") or today_s[:7]
    if len(cal_m) != 7 or cal_m[4] != "-":
        cal_m = today_s[:7]
    cstart = pdate(cal_m + "-01", today)
    cend = U.getdate(U.add_days(U.add_months(cstart, 1), -1))
    cal = []
    d = cstart
    while d <= cend:
        ds_ = str(d)
        emp_d = {}
        for r in approved:
            if r["from_date"] <= ds_ and r["to_date"] >= ds_:
                emp_d[r["employee"]] = 1
        cal.append({"date": ds_, "count": len(emp_d)})
        d = U.getdate(U.add_days(d, 1))
    nad = {}
    for e in no_alloc_emp:
        k = e.get("department") or "(Not set)"
        nad[k] = nad.get(k, 0) + 1
    pbd = {}
    for r in pending:
        k = r["department"] or "(Not set)"
        pbd[k] = pbd.get(k, 0) + 1
    analytics = {"pending_by_department": sorted([{"label": k, "count": pbd[k]} for k in pbd], key=lambda x: -x["count"]), "monthly": monthly, "by_dept": by_dept, "by_type": by_type, "pending_by_age": by_age, "calendar": {"month": cal_m, "days": cal},
                 "no_alloc_by_dept": sorted([{"label": k, "count": nad[k]} for k in nad], key=lambda x: -x["count"])}

    dres = dq_sets(rows, amap, al_ok)
    S = dres[0]
    pair_count = dres[1]
    dq = []
    for d_ in DQ_LABELS:
        items = S[d_[0]]
        extra = ""
        if d_[0] == "status_pending":
            extra = str(len([x for x in items if x[0]["docstatus"] == 1])) + " submitted (ledger deducted)"
        if d_[0] == "overlap":
            extra = str(pair_count) + " overlapping pairs"
        if d_[0] == "legacy_open":
            yrs = sorted([x[0]["from_date"][:7] for x in items])
            extra = (yrs[0] + " → " + yrs[-1]) if yrs else ""
        dq.append({"key": d_[0], "label": d_[1], "severity": d_[2], "count": len(items), "extra": extra, "preset": ("dq_" + d_[0]) if detail else None})

    res = {"meta": {"tier": "detail" if detail else "aggregate", "company": company, "companies": companies, "from_date": pf_s, "to_date": pt_s,
                    "today": today_s, "generated": str(U.now_datetime())[:19], "unreadable": ERR, "workflow": wf_name, "workflow_states": wf_states,
                    "total_applications": len(rows)},
           "kpis": kpis, "queues": queues, "analytics": analytics, "dq": dq,
           "definitions": {"approved": "docstatus 1 + workflow Approved + status not Rejected",
                           "pending": "workflow Pending* / On-Hold (includes submitted-while-pending; never counted as approved)",
                           "rejected": "workflow Rejected, or submitted with status Rejected",
                           "conflict": "workflow Approved but status Rejected (excluded from approved and rejected)"}}
    if detail:
        res["no_alloc_rows"] = [{"employee": e.get("name"), "employee_name": e.get("employee_name"), "department": e.get("department")} for e in no_alloc_emp]
        res["options"] = {"departments": sorted(list(dict([(r["department"] or "(Not set)", 1) for r in rows]).keys())),
                          "leave_types": sorted(list(dict([(r["leave_type"] or "(Not set)", 1) for r in rows]).keys())),
                          "workflow_states": sorted(list(dict([(r["workflow_state"] or "(Not set)", 1) for r in rows]).keys())),
                          "statuses": ["Open", "Approved", "Rejected", "Cancelled"]}
    res["meta"]["filters"] = {"department": GF["department"], "branch": GF["branch"], "job_location": GF["custom_job_location"]}
    if not detail:
        res = suppress(res)
    frappe.response["message"] = res

# ======================================================================= LIST
elif fast_ok:
    # Phase 8 fast path: plain directory pages are filtered, counted and paged in SQL (frappe.get_list keeps
    # DocType and User Permissions); only the rows of the requested page are classified.
    flt = list(cfilter)
    for pair in [["department", "department"], ["leave_type", "leave_type"], ["workflow_state", "workflow_state"], ["status", "status"]]:
        v = fd.get(pair[0])
        if v:
            flt.append([pair[1], "is", "not set"] if v == "(Not set)" else [pair[1], "=", v])
    emp_f = (fd.get("employee") or "").strip()
    if emp_f:
        flt.append(["employee", "=", emp_f])
    if GF_ON:
        flt.append(["employee", "in", list(EMPX.keys()) or ["-none-"]])
    if fd.get("range_from") or fd.get("range_to"):
        rf = str(pdate(fd.get("range_from"), U.getdate("2000-01-01")))
        rt = str(pdate(fd.get("range_to"), U.getdate("2100-12-31")))
        flt.append(["from_date", "<=", rt])
        flt.append(["to_date", ">=", rf])
    search = (fd.get("search") or "").strip()[:60]
    orf = None
    if search:
        orf = [["name", "like", "%" + search + "%"], ["employee", "like", "%" + search + "%"], ["employee_name", "like", "%" + search + "%"]]
    SMAP = {"name": "name", "employee_name": "employee_name", "department": "department", "company": "company", "leave_type": "leave_type",
            "from_date": "from_date", "to_date": "to_date", "days": "total_leave_days", "workflow_state": "workflow_state", "status": "status",
            "approver": "leave_approver_name"}
    sort_by = fd.get("sort_by") or "from_date"
    desc = fd.get("sort_order") != "asc"
    agg = frappe.get_list("Leave Application", filters=flt, or_filters=orf, fields=["count(name) as n", "sum(total_leave_days) as d"], limit_page_length=1)
    total = U.cint(agg[0].get("n")) if agg else 0
    days_total = round(U.flt(agg[0].get("d")), 1) if agg else 0
    page_length = U.cint(fd.get("page_length")) or 25
    if page_length < 10:
        page_length = 10
    if page_length > 100:
        page_length = 100
    pages = int((total + page_length - 1) / page_length) if total else 1
    page = U.cint(fd.get("page")) or 1
    if page < 1:
        page = 1
    if page > pages:
        page = pages
    la = frappe.get_list("Leave Application", filters=flt, or_filters=orf, fields=LA_FIELDS,
                         order_by=SMAP[sort_by] + (" desc" if desc else " asc") + ", name asc",
                         limit_start=(page - 1) * page_length, limit_page_length=page_length)
    page_rows = [row_of(l) for l in la]
    pend = [r for r in page_rows if r["cls"] == "pending"]
    wcp = workflow_comments([r["name"] for r in pend])
    for r in pend:
        since = None
        for c in (wcp.get(r["name"]) or []):
            if (c.get("content") or "") == r["workflow_state"]:
                since = str(c.get("creation"))[:10]
        r["age_days"] = U.date_diff(today, U.getdate(since or r["posting_date"]))
    wc = workflow_comments([r["name"] for r in page_rows if r["cls"] in ["approved", "rejected"]])
    out = []
    for r in page_rows:
        age = r["age_days"]
        age_label = (str(age) + "d waiting") if age is not None else ""
        if r["cls"] in ["approved", "rejected"] and wc.get(r["name"]):
            last = wc.get(r["name"])[-1]
            age_label = "decided in " + str(U.date_diff(U.getdate(str(last.get("creation"))[:10]), U.getdate(r["posting_date"]))) + "d"
        out.append({"name": r["name"], "employee": r["employee"], "employee_name": r["employee_name"], "department": r["department"],
                    "company": r["company"], "leave_type": r["leave_type"], "from_date": r["from_date"], "to_date": r["to_date"],
                    "days": r["days"], "workflow_state": r["workflow_state"], "status": r["status"], "docstatus": r["docstatus"],
                    "cls": r["cls"], "approver": r["approver"], "age_days": age, "age_label": age_label, "note": "",
                    "can_act": bool(r["cls"] == "pending" and my_actions.get(r["workflow_state"]))})
    frappe.response["message"] = {"total": total, "page": page, "pages": pages, "page_length": page_length, "rows": out,
                                  "sort_by": sort_by, "sort_order": "desc" if desc else "asc", "preset": "", "company": company,
                                  "days_total": days_total, "path": "sql"}

elif mode == "list":
    bres = build()
    rows = bres[0]
    raw = bres[1]
    for r in rows:
        r["_approver_user"] = raw[r["name"]].get("leave_approver")
        r["_lm"] = raw[r["name"]].get("custom_line_manager")
    preset = fd.get("preset") or ""
    PRESETS = ["", "kpi_pending", "kpi_approved", "kpi_rejected", "kpi_on_leave", "kpi_upcoming", "kpi_used", "kpi_pending_old",
               "q_my", "q_hr_review", "q_awaiting", "day", "age"] + ["dq_" + d_[0] for d_ in DQ_LABELS]
    if preset not in PRESETS:
        frappe.throw("Invalid preset.")
    sel = rows
    notes = {}
    if preset in ["kpi_pending", "q_awaiting"]:
        sel = [r for r in rows if r["cls"] == "pending"]
    elif preset == "kpi_approved":
        sel = [r for r in rows if r["cls"] == "approved" and in_period(r)]
    elif preset == "kpi_rejected":
        sel = [r for r in rows if r["cls"] == "rejected" and in_period(r)]
    elif preset == "kpi_on_leave":
        sel = [r for r in rows if r["cls"] == "approved" and r["from_date"] <= today_s and r["to_date"] >= today_s]
    elif preset == "kpi_upcoming":
        in30 = str(U.add_days(today, 30))
        sel = [r for r in rows if r["cls"] == "approved" and r["from_date"] > today_s and r["from_date"] <= in30]
    elif preset == "kpi_used":
        sel = [r for r in rows if r["cls"] == "approved" and r["from_date"] >= pf_s and r["from_date"] <= pt_s]
    elif preset == "kpi_pending_old":
        sel = [r for r in rows if r["cls"] == "pending" and (r["age_days"] or 0) > 3]
    elif preset == "q_my":
        lmu = lm_user_map(raw)
        sel = [r for r in rows if my_queue(r, lmu)]
    elif preset == "q_hr_review":
        sel = [r for r in rows if r["cls"] == "pending" and r["workflow_state"] == "Pending Review"]
    elif preset == "day":
        dd_ = str(pdate(fd.get("day"), today))
        sel = [r for r in rows if r["cls"] == "approved" and r["from_date"] <= dd_ and r["to_date"] >= dd_]
    elif preset == "age":
        b = fd.get("age_bucket") or ""
        rng = {"0-3": [0, 3], "4-7": [4, 7], "8-30": [8, 30], "31-90": [31, 90], ">90": [91, 100000]}.get(b)
        if not rng:
            frappe.throw("Invalid age bucket.")
        sel = [r for r in rows if r["cls"] == "pending" and rng[0] <= (r["age_days"] or 0) <= rng[1]]
    elif preset.startswith("dq_"):
        ares = allocations()
        S = dq_sets(rows, ares[1], ares[0] is not None)[0]
        sel = []
        for x in S[preset[3:]]:
            x[0]["note"] = x[1]
            sel.append(x[0])
    # standard filters
    for pair in [["department", "department"], ["leave_type", "leave_type"], ["workflow_state", "workflow_state"], ["status", "status"]]:
        v = fd.get(pair[0])
        if v:
            if v == "(Not set)":
                sel = [r for r in sel if not r[pair[1]]]
            else:
                sel = [r for r in sel if r[pair[1]] == v]
    emp_f = (fd.get("employee") or "").strip()
    if emp_f:
        sel = [r for r in sel if r["employee"] == emp_f]
    if fd.get("range_from") or fd.get("range_to"):
        rf = str(pdate(fd.get("range_from"), U.getdate("2000-01-01")))
        rt = str(pdate(fd.get("range_to"), U.getdate("2100-12-31")))
        sel = [r for r in sel if r["from_date"] <= rt and r["to_date"] >= rf]
    search = (fd.get("search") or "").strip()[:60].lower()
    if search:
        sel = [r for r in sel if search in (r["name"] or "").lower() or search in (r["employee"] or "").lower() or search in (r["employee_name"] or "").lower()]
    SORTABLE = ["name", "employee_name", "department", "company", "leave_type", "from_date", "to_date", "days", "workflow_state", "status", "approver", "age_days"]
    sort_by = fd.get("sort_by") or "from_date"
    if sort_by not in SORTABLE:
        sort_by = "from_date"
    desc = fd.get("sort_order") != "asc"
    if sort_by in ["days", "age_days"]:
        has = [r for r in sel if r[sort_by] is not None]
        nonev = [r for r in sel if r[sort_by] is None]
        sel = sorted(has, key=lambda r: (r[sort_by], r["name"]), reverse=desc) + nonev
    else:
        sel = sorted(sel, key=lambda r: ((r[sort_by] or "").lower() if sort_by in ["employee_name", "department", "approver"] else (r[sort_by] or ""), r["name"]), reverse=desc)
    total = len(sel)
    page_length = U.cint(fd.get("page_length")) or 25
    if page_length < 10:
        page_length = 10
    if page_length > 100:
        page_length = 100
    pages = int((total + page_length - 1) / page_length) if total else 1
    page = U.cint(fd.get("page")) or 1
    if page < 1:
        page = 1
    if page > pages:
        page = pages
    page_rows = sel[(page - 1) * page_length: page * page_length]
    # decision turnaround for decided rows on this page (posting -> last workflow comment)
    wc = workflow_comments([r["name"] for r in page_rows if r["cls"] in ["approved", "rejected"]])
    out = []
    for r in page_rows:
        age = r["age_days"]
        age_label = (str(age) + "d waiting") if age is not None else ""
        if r["cls"] in ["approved", "rejected"] and wc.get(r["name"]):
            last = wc.get(r["name"])[-1]
            age_label = "decided in " + str(U.date_diff(U.getdate(str(last.get("creation"))[:10]), U.getdate(r["posting_date"]))) + "d"
        out.append({"name": r["name"], "employee": r["employee"], "employee_name": r["employee_name"], "department": r["department"],
                    "company": r["company"], "leave_type": r["leave_type"], "from_date": r["from_date"], "to_date": r["to_date"],
                    "days": r["days"], "workflow_state": r["workflow_state"], "status": r["status"], "docstatus": r["docstatus"],
                    "cls": r["cls"], "approver": r["approver"], "age_days": age, "age_label": age_label, "note": r.get("note") or "",
                    "can_act": bool(r["cls"] == "pending" and my_actions.get(r["workflow_state"]))})
    frappe.response["message"] = {"total": total, "page": page, "pages": pages, "page_length": page_length, "rows": out,
                                  "sort_by": sort_by, "sort_order": "desc" if desc else "asc", "preset": preset, "company": company,
                                  "days_total": round(sum([r["days"] for r in sel]), 1)}

# ======================================================================= DETAIL
else:
    app_id = (fd.get("name") or "").strip()
    if not app_id:
        frappe.throw("Application is required.")
    la = fetch("Leave Application", {"name": app_id},
               ["name", "employee", "employee_name", "department", "company", "leave_type", "from_date", "to_date", "half_day",
                "half_day_date", "total_leave_days", "workflow_state", "status", "docstatus", "leave_approver", "leave_approver_name",
                "custom_line_manager", "custom_replacement_person", "custom_destination", "custom_reentry_date_as_per_exitentry",
                "posting_date", "leave_balance", "attach_doc", "salary_slip", "description", "creation", "owner"], "name asc", ERR)
    if not la:
        frappe.throw("Leave application not found or not permitted.", title="Not Permitted")
    l = la[0]
    emp_id = l.get("employee")
    cls = classify(l)
    e = fetch("Employee", {"name": emp_id}, ["name", "employee_name", "company", "department", "designation", "branch",
                                              "custom_job_location", "status", "date_of_joining", "employment_type"], "name asc", [])
    emp = None
    if e:
        x = e[0]
        emp = {"employee": x.get("name"), "employee_name": x.get("employee_name"), "company": x.get("company"), "department": x.get("department"),
               "designation": x.get("designation"), "branch": x.get("branch"), "job_location": x.get("custom_job_location"), "status": x.get("status"),
               "date_of_joining": str(x.get("date_of_joining") or ""), "employment_type": x.get("employment_type")}

    def emp_name(eid):
        if not eid:
            return None
        r = fetch("Employee", {"name": eid}, ["employee_name"], "name asc", [])
        return (eid + " · " + r[0].get("employee_name")) if r else (eid + " (not visible to you)")

    # approval history (Workflow comments of this already-permitted application)
    hist = workflow_comments([app_id]).get(app_id) or []
    owners = list(dict([(h.get("owner"), 1) for h in hist]).keys())
    names = {}
    if owners:
        for u_ in frappe.get_all("User", filters=[["name", "in", owners]], fields=["name", "full_name"]):
            names[u_.get("name")] = u_.get("full_name") or u_.get("name")
    history = [{"state": h.get("content"), "by": names.get(h.get("owner")) or h.get("owner"), "on": str(h.get("creation"))[:16]} for h in hist]

    # balance for this leave type, approved usage only
    bal = {"state": "unavailable", "note": "", "leave_type": l.get("leave_type")}
    if lwp_types.get(l.get("leave_type")):
        bal = {"state": "not_applicable", "note": "Unpaid (LWP) leave type - no allocation balance applies.", "leave_type": l.get("leave_type")}
    else:
        ref = str(l.get("from_date"))
        alc = fetch("Leave Allocation", [["employee", "=", emp_id], ["leave_type", "=", l.get("leave_type")], ["docstatus", "=", 1],
                                         ["from_date", "<=", ref], ["to_date", ">=", ref]], ["name", "from_date", "to_date", "total_leaves_allocated"], "from_date desc", ERR)
        if alc is None:
            bal["note"] = "Leave Allocation not readable with your permissions."
        elif not alc:
            bal = {"state": "no_allocation", "leave_type": l.get("leave_type"),
                   "note": "No submitted allocation of this type covers " + ref + ". A balance cannot be calculated."}
        else:
            a = alc[0]
            led = fetch("Leave Ledger Entry", [["employee", "=", emp_id], ["leave_type", "=", l.get("leave_type")], ["docstatus", "=", 1],
                                               ["is_expired", "=", 0], ["from_date", ">=", str(a.get("from_date"))], ["to_date", "<=", str(a.get("to_date"))]],
                        ["leaves", "transaction_type", "transaction_name"], "from_date asc", ERR)
            if led is None:
                bal["note"] = "Leave Ledger not readable with your permissions."
            else:
                app_names = list(dict([(z.get("transaction_name"), 1) for z in led if z.get("transaction_type") == "Leave Application"]).keys())
                cmap = {}
                if app_names:
                    for z in (fetch("Leave Application", [["name", "in", app_names]], ["name", "workflow_state", "status", "docstatus"], "name asc", ERR) or []):
                        cmap[z.get("name")] = classify(z)
                credits = 0
                approved_used = 0
                pending_ded = 0
                unknown = 0
                for z in led:
                    v = z.get("leaves") or 0
                    if z.get("transaction_type") != "Leave Application":
                        credits = credits + v
                    elif cmap.get(z.get("transaction_name")) == "approved":
                        approved_used = approved_used + v
                    elif cmap.get(z.get("transaction_name")) == "pending":
                        pending_ded = pending_ded + v
                    else:
                        unknown = unknown + v
                state = "actual" if (pending_ded == 0 and unknown == 0) else "partial"
                note = "Allocation + other ledger credits/debits, minus APPROVED leave only."
                if pending_ded:
                    note = note + " " + str(round(-pending_ded, 2)) + " day(s) are deducted in the ledger by applications still pending workflow approval; they are shown separately and NOT subtracted."
                if unknown:
                    note = note + " " + str(round(-unknown, 2)) + " day(s) come from applications you cannot read or with conflicting status."
                bal = {"state": state, "leave_type": l.get("leave_type"), "allocation": a.get("name"),
                       "period": str(a.get("from_date")) + " → " + str(a.get("to_date")), "allocated": a.get("total_leaves_allocated"),
                       "other_credits": round(credits, 2), "approved_used": round(-approved_used, 2), "pending_deducted": round(-pending_ded, 2),
                       "balance_approved_only": round(credits + approved_used, 2), "note": note}
    bal["recorded_on_application"] = l.get("leave_balance")

    # related documents
    others = fetch("Leave Application", [["employee", "=", emp_id], ["name", "!=", app_id]],
                   ["name", "leave_type", "from_date", "to_date", "total_leave_days", "workflow_state", "status", "docstatus"], "from_date desc", [])
    other_rows = [{"name": o.get("name"), "leave_type": o.get("leave_type"), "from_date": str(o.get("from_date")), "to_date": str(o.get("to_date")),
                   "days": o.get("total_leave_days"), "workflow_state": o.get("workflow_state"), "cls": classify(o)} for o in (others or [])[:12]]
    overl = [o for o in other_rows if o["cls"] in ["approved", "pending", "draft", "conflict"] and o["from_date"] <= str(l.get("to_date")) and o["to_date"] >= str(l.get("from_date"))]
    att = fetch("Attendance", [["employee", "=", emp_id], ["docstatus", "=", 1], ["attendance_date", "between", [str(l.get("from_date")), str(l.get("to_date"))]]],
                ["status"], "attendance_date asc", [])
    att_c = {}
    for z in (att or []):
        att_c[z.get("status")] = att_c.get(z.get("status"), 0) + 1
    lrf = fetch("Leave Request Form", [["employee_name", "=", emp_id]], ["name", "docstatus", "creation"], "creation desc", [])
    actions = my_actions.get(l.get("workflow_state") or "") if cls == "pending" else None
    frappe.response["message"] = {
        "application": {"name": l.get("name"), "leave_type": l.get("leave_type"), "from_date": str(l.get("from_date")), "to_date": str(l.get("to_date")),
                        "half_day": l.get("half_day"), "half_day_date": str(l.get("half_day_date") or ""), "days": l.get("total_leave_days"),
                        "workflow_state": l.get("workflow_state"), "status": l.get("status"), "docstatus": l.get("docstatus"), "cls": cls,
                        "conflict": conflict_reason(l), "approver": l.get("leave_approver_name") or l.get("leave_approver"),
                        "line_manager": emp_name(l.get("custom_line_manager")), "replacement": emp_name(l.get("custom_replacement_person")),
                        "destination": l.get("custom_destination"), "reentry_date": str(l.get("custom_reentry_date_as_per_exitentry") or ""),
                        "posting_date": str(l.get("posting_date") or ""), "attachment": "attached" if l.get("attach_doc") else "not attached",
                        "salary_slip": "linked" if l.get("salary_slip") else "", "reason": (l.get("description") or "")[:300], "company": l.get("company")},
        "employee": emp, "history": history, "balance": bal,
        "related": {"other_applications": other_rows, "overlapping": overl, "attendance_in_period": att_c if att is not None else None,
                    "leave_request_forms": [{"name": z.get("name"), "state": ["Draft", "Submitted", "Cancelled"][z.get("docstatus") or 0]} for z in (lrf or [])[:5]] if lrf is not None else None},
        "workflow": {"name": wf_name, "your_actions": actions,
                     "note": "Open the application in ERPNext to act. The ERPNext workflow decides whether your role may approve/reject; the dashboard never applies actions."},
        "unreadable": ERR}
