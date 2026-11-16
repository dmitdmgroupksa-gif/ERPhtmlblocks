# Admin & HR Dashboard - HR Requests & Service Desk API (Server Script, API method: admin_hr_requests_data)
# READ-ONLY. Login required. Never changes a request, never applies a workflow action.
# Tiers: HR Manager / HR User -> employee-level rows ("detail");
#        System Manager / IT Coordinator without an HR role -> counts and charts only ("aggregate").
# Every source DocType is read with frappe.get_list, so the caller's DocType permissions and User Permissions apply
# per source. A source the caller cannot read is reported as "not readable" and left out (never bypassed).
# frappe.get_all is used only for: the caller's own roles, Company names, active Workflow configuration,
# Workflow comments of records the caller has already read, user full names, and Employee user ids
# (compared with the caller, never returned).
# Never returned: letter text, reasons / remarks / feedback free text, amounts, salary, bank or medical details.
# modes: summary (default) | list | detail

ALLOWED_ROLES = ["System Manager", "HR Manager", "HR User", "IT Coordinator","Dashboard Manager"]
DETAIL_ROLES = ["HR Manager", "HR User","Dashboard Manager"]
DEFAULT_COMPANY = "Durar Masagh Trading Company"
SLA_DAYS = 7
STUCK_DAYS = 30
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
    frappe.throw("Employee-level HR request data is restricted to HR Manager / HR User.", title="Restricted")

today = U.getdate(U.nowdate())
today_s = str(today)
companies = [c.get("name") for c in frappe.get_all("Company", fields=["name"], order_by="name asc")]
company = fd.get("company") or DEFAULT_COMPANY
if company != "All" and company not in companies:
    frappe.throw("Company not found.", title="Not Permitted")

# key, DocType, label, employee field, company field, status kind, approver fields, safe detail fields
SOURCES = [
    ["dm_letters", "DM Letters", "Letter request", "request_by", "company", "workflow", [], ["subject"]],
    ["lrf", "Leave Request Form", "Leave Request Form (custom)", "employee_name", None, "workflow", ["manager_by", "hrapproved_by"], ["date", "date_to"]],
    ["clearance", "Employee Clearance", "Employee clearance", "employee", None, "clearance", ["line_manager", "hr_manager"], ["clearance_type", "last_working_date"]],
    ["travel", "Travel Request", "Travel request", "employee", "company", "workflow", [], ["travel_type", "purpose_of_travel"]],
    ["qiwa", "Qiwa contract renewal request", "Qiwa contract renewal", "emp_name", None, "workflow", [], ["contract_end_date"]],
    ["resignation", "Resignation Letter", "Resignation letter", "employee", None, "workflow", ["line_manager"], []],
    ["attendance_req", "Attendance Request", "Attendance request", "employee", "company", "docstatus", [], ["from_date", "to_date"]],
    ["letter_forms", "DM Letter Forms", "DM letter / feedback form", "employee", "company", "docstatus", ["reviewer"], []],
    ["advance", "Employee Advance", "Employee advance", "employee", "company", "advance", [], []],
    ["separation", "Employee Separation", "Employee separation", "employee", "company", "separation", [], []],
]
SRC = {}
for s in SOURCES:
    SRC[s[0]] = s
EXCLUDED = [["Leave Application", "Shown on the Leave & Approvals tab"], ["IT Help Desk Request", "IT tickets, not HR service requests"],
            ["Employee Warning Letter", "Disciplinary records (confidential)"], ["Certificate", "Training certificates, not requests"],
            ["Helper Assignment Request", "Operations staffing requests"], ["Task Handover and Knowledge Transfer", "Hand-over checklist (System Manager only)"],
            ["Advance Request", "No records; finance only"], ["Employee Transfer / Employee Promotion", "HR actions, not employee requests"]]
CAT_LABEL = {"draft": "Draft", "pending": "Pending approval", "on_hold": "On hold", "in_progress": "In progress", "completed": "Approved / completed",
             "rejected": "Rejected", "cancelled": "Cancelled", "unclear": "Inconsistent status"}
OPEN = ["pending", "on_hold", "in_progress", "unclear"]

# active workflows (configuration only)
WF = {}
for s in SOURCES:
    w = frappe.get_all("Workflow", filters={"document_type": s[1], "is_active": 1}, fields=["name"])
    if w:
        st = [x.get("state") for x in frappe.get_all("Workflow Document State", filters={"parent": w[0].get("name")}, fields=["state"])]
        tr = frappe.get_all("Workflow Transition", filters={"parent": w[0].get("name")}, fields=["state", "action", "next_state", "allowed"])
        WF[s[1]] = {"name": w[0].get("name"), "states": st, "transitions": tr}


# ---- Phase 8: global dashboard filters (applied to the employee's current Employee record) ----
GF = {"department": fd.get("g_department") or "", "branch": fd.get("g_branch") or "", "custom_job_location": fd.get("g_job_location") or ""}
GF_ON = len([k for k in GF if GF[k]]) > 0
GF_FILTERS = [([k, "is", "not set"] if GF[k] == "(Not set)" else [k, "=", GF[k]]) for k in GF if GF[k]]


# ---- Phase 8: small-group privacy for the aggregate tier ----
SUPPRESS_MIN = 3
NUMK = ["count", "open", "overdue", "expired", "due", "total", "done", "days", "headcount", "assigned", "mand_open", "per_head", "pct", "avg", "timed", "closed", "paid", "lwp"]


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


emp_all = None
try:
    emp_all = frappe.get_list("Employee", fields=["name", "employee_name", "company", "department", "branch", "designation", "status", "custom_job_location"], limit_page_length=0)
except Exception:
    emp_all = []
EMP = {}
for e in emp_all:
    EMP[e.get("name")] = e


def classify(src, d):
    kind = src[5]
    ws = d.get("workflow_state") or ""
    wl = ws.lower()
    ds = d.get("docstatus")
    if kind == "advance":
        st = d.get("status") or ""
        if ds == 2:
            return "cancelled"
        if ds == 0:
            return "draft"
        if st in ["Paid", "Claimed", "Returned", "Partly Claimed and Returned"]:
            return "completed"
        return "in_progress"
    if kind == "separation":
        st = d.get("boarding_status") or ""
        if ds == 2:
            return "cancelled"
        if st == "Completed":
            return "completed"
        if st == "In Process":
            return "in_progress"
        return "pending" if ds == 1 else "draft"
    if kind == "docstatus":
        return ["draft", "completed", "cancelled"][ds or 0]
    # workflow-style and clearance
    if "reject" in wl:
        return "rejected"
    if ds == 2:
        return "unclear" if ws == "Approved" else "cancelled"
    if "hold" in wl or "clarification" in wl:
        return "on_hold"
    if "pending" in wl or "review" in wl or "approval" in wl:
        return "pending"
    if ws == "Approved":
        return "completed" if ds == 1 else "unclear"
    if ds == 1:
        return "completed"
    if kind == "clearance":
        return "in_progress"
    return "draft"


def load_source(src, ERR):
    f = ["name", "docstatus", "creation", "modified", "owner", src[3]]
    if src[4]:
        f.append(src[4])
    if src[5] in ["workflow", "clearance"]:
        f.append("workflow_state")
    if src[5] == "advance":
        f.append("status")
    if src[5] == "separation":
        f.append("boarding_status")
    f = f + src[6]
    # Phase 9.1: check read permission first (no message), so unreadable types are skipped without a permission pop-up.
    if not can_read(src[1]):
        ERR.append(src[1])
        return None
    try:
        return frappe.get_list(src[1], fields=f, order_by="creation desc", limit_page_length=0)
    except Exception:
        ERR.append(src[1])
        return None


def wf_comments(dt, names):
    out = {}
    i = 0
    while i < len(names):
        for c in frappe.get_all("Comment", filters=[["reference_doctype", "=", dt], ["reference_name", "in", names[i:i + 400]], ["comment_type", "=", "Workflow"]],
                                fields=["reference_name", "content", "owner", "creation"], order_by="creation asc"):
            k = c.get("reference_name")
            out[k] = (out.get(k) or []) + [c]
        i = i + 400
    return out


def approver_text(src, d, cat):
    if cat not in OPEN:
        return ""
    w = WF.get(src[1])
    if w and d.get("workflow_state"):
        rl = list(dict([(t.get("allowed"), 1) for t in w["transitions"] if t.get("state") == d.get("workflow_state")]).keys())
        if rl:
            return "Role: " + ", ".join(rl)
    for f in src[6]:
        if d.get(f):
            e = EMP.get(d.get(f))
            return (e.get("employee_name") if e else d.get(f)) or ""
    return ""


def build(ERR, SKIP):
    rows = []
    for src in SOURCES:
        recs = load_source(src, ERR)
        if recs is None:
            continue
        if not recs:
            SKIP.append(src[1])
        wc = {}
        if src[5] in ["workflow", "clearance"] and recs:
            wc = wf_comments(src[1], [r.get("name") for r in recs])
        for d in recs:
            eid = d.get(src[3])
            e = EMP.get(eid) if eid else None
            comp = d.get(src[4]) if src[4] else None
            comp = comp or (e.get("company") if e else "")
            if company != "All" and comp != company:
                continue
            if GF_ON and not (e and len([k for k in GF if GF[k] and (e.get(k) or "(Not set)") != GF[k]]) == 0):
                continue
            cat = classify(src, d)
            created = str(d.get("creation"))[:10]
            hist = wc.get(d.get("name")) or []
            since = created
            closed = None
            for c in hist:
                if (c.get("content") or "") == (d.get("workflow_state") or ""):
                    since = str(c.get("creation"))[:10]
                if cat in ["completed", "rejected"] and (c.get("content") or "") == (d.get("workflow_state") or ""):
                    closed = str(c.get("creation"))[:10]
            age = U.date_diff(today, U.getdate(since)) if cat in OPEN else None
            res_days = U.date_diff(U.getdate(closed), U.getdate(created)) if closed else None
            rows.append({"id": src[0] + "::" + d.get("name"), "src": src[0], "doctype": src[1], "name": d.get("name"), "type": src[2],
                         "employee": eid or "", "employee_name": (e.get("employee_name") if e else "") or "", "employee_status": (e.get("status") if e else "") or "",
                         "department": (e.get("department") if e else "") or "", "branch": (e.get("branch") if e else "") or "", "company": comp or "",
                         "created": created, "state": d.get("workflow_state") or d.get("status") or d.get("boarding_status") or ["Draft", "Submitted", "Cancelled"][d.get("docstatus") or 0],
                         "docstatus": d.get("docstatus"), "cat": cat, "status": CAT_LABEL[cat], "approver": approver_text(src, d, cat), "priority": "",
                         "age_days": age, "state_since": since if cat in OPEN else "", "overdue_days": (age - SLA_DAYS) if (age is not None and age > SLA_DAYS) else 0,
                         "closed_on": closed or "", "resolution_days": res_days, "has_history": 1 if hist else 0, "owner": d.get("owner"),
                         "approver_ids": [d.get(f) for f in src[6] if d.get(f)], "ws": d.get("workflow_state") or ""})
    return rows


def my_queue(rows):
    uid = {}
    ids = []
    for r in rows:
        ids = ids + r["approver_ids"]
    if ids:
        for e in frappe.get_all("Employee", filters=[["name", "in", list(dict([(i, 1) for i in ids]).keys())]], fields=["name", "user_id"]):
            uid[e.get("name")] = e.get("user_id")
    out = []
    for r in rows:
        if r["cat"] not in OPEN:
            continue
        w = WF.get(r["doctype"])
        if w and r["ws"]:
            if user == "Administrator" or len([t for t in w["transitions"] if t.get("state") == r["ws"] and t.get("allowed") in roles]) > 0:
                out.append(r)
        elif len([i for i in r["approver_ids"] if uid.get(i) == user]) > 0:
            out.append(r)
    return out


def dq_sets(rows):
    S = {"no_employee": [], "no_approver": [], "obsolete_state": [], "status_conflict": [], "departed_open": [], "duplicate": [],
         "stuck": [], "no_completion_date": []}
    for r in rows:
        if not r["employee"]:
            S["no_employee"].append([r, "Employee link is empty"])
        elif not EMP.get(r["employee"]):
            S["no_employee"].append([r, "Linked employee is not visible / does not exist"])
        if r["cat"] in OPEN and not r["approver"]:
            S["no_approver"].append([r, "Open, but no workflow role or approver field identifies who acts next"])
        if r["ws"] and r["cat"] in OPEN + ["draft"]:
            w = WF.get(r["doctype"])
            if not w:
                S["obsolete_state"].append([r, "State '" + r["ws"] + "' but the DocType has no active workflow"])
            elif r["ws"] not in w["states"]:
                S["obsolete_state"].append([r, "State '" + r["ws"] + "' is not in the active workflow"])
        if r["cat"] == "unclear":
            S["status_conflict"].append([r, "Workflow '" + r["ws"] + "' with document status " + ["Draft", "Submitted", "Cancelled"][r["docstatus"] or 0]])
        if r["cat"] in OPEN and r["employee_status"] in ["Left", "Inactive", "Suspended"]:
            S["departed_open"].append([r, "Open request for an employee with status " + r["employee_status"]])
        if r["cat"] in OPEN and r["age_days"] is not None and r["age_days"] > STUCK_DAYS:
            S["stuck"].append([r, "Open for " + str(r["age_days"]) + " days in the current state"])
        if r["cat"] in ["completed", "rejected"] and not r["closed_on"]:
            S["no_completion_date"].append([r, "No workflow record of when it was closed"])
    grp = {}
    for r in rows:
        if r["employee"] and r["cat"] not in ["cancelled", "rejected"]:
            k = r["src"] + "|" + r["employee"]
            grp[k] = (grp.get(k) or []) + [r]
    for k in grp:
        arr = sorted(grp[k], key=lambda x: x["created"])
        i = 1
        while i < len(arr):
            if U.date_diff(U.getdate(arr[i]["created"]), U.getdate(arr[i - 1]["created"])) <= 3:
                S["duplicate"].append([arr[i], "Same type and employee as " + arr[i - 1]["name"] + " within 3 days"])
            i = i + 1
    return S


DQ_LABELS = [["no_employee", "Missing employee linkage", "high"], ["no_approver", "Open without an identifiable approver", "medium"],
             ["obsolete_state", "Invalid or obsolete workflow state", "medium"], ["status_conflict", "Workflow state contradicts document status", "high"],
             ["departed_open", "Open requests of departed employees", "high"], ["duplicate", "Possible duplicate requests", "low"],
             ["stuck", "Stuck more than " + str(STUCK_DAYS) + " days", "high"], ["no_completion_date", "Closed without a reliable completion date", "low"]]


def status_rules():
    out = []
    for s in SOURCES:
        w = WF.get(s[1])
        rule = {"workflow": "Workflow state (" + (w["name"] if w else "workflow inactive") + "); Approved + submitted = completed",
                "clearance": "Workflow inactive: unsubmitted = in progress, submitted = completed",
                "docstatus": "No status field: draft / submitted = completed / cancelled",
                "advance": "status: Unpaid = in progress, Paid / Claimed / Returned = completed",
                "separation": "boarding_status: Pending / In Process / Completed"}[s[5]]
        out.append({"doctype": s[1], "label": s[2], "rule": rule, "closure_date": "Workflow comment" if s[5] in ["workflow"] else "Not recorded"})
    return out


# ======================================================================= SUMMARY
if mode == "summary":
    ERR = []
    SKIP = []
    small_scope_guard(len([e for e in emp_all if e.get("status") == "Active" and (company == "All" or e.get("company") == company) and len([k for k in GF if GF[k] and (e.get(k) or "(Not set)") != GF[k]]) == 0]))
    rows = build(ERR, SKIP)
    month = today_s[:7]

    def c(cats):
        return len([r for r in rows if r["cat"] in cats])

    def types_of(rr):
        return ", ".join(sorted(list(dict([(r["type"], 1) for r in rr]).keys()))) or "none"

    closed = [r for r in rows if r["cat"] in ["completed", "rejected"]]
    timed = [r for r in closed if r["resolution_days"] is not None]
    avg = round(1.0 * sum([r["resolution_days"] for r in timed]) / len(timed), 1) if timed else None
    over = [r for r in rows if r["cat"] in OPEN and r["overdue_days"] > 0]

    def kpi(key, label, value, sub, basis, preset, state, unit):
        return {"key": key, "label": label, "value": value, "sub": sub, "basis": basis, "preset": preset if detail else None, "state": state, "unit": unit}

    kpis = [
        kpi("total", "Total HR Requests", len(rows), str(len(dict([(r["type"], 1) for r in rows]))) + " request types readable", "Included: " + types_of(rows), "all", "partial" if ERR else "actual", "requests"),
        kpi("pending", "Pending Requests", c(["pending"]), "awaiting an approval step", "Included: " + types_of([r for r in rows if r["cat"] == "pending"]), "cat_pending", "actual", "requests"),
        kpi("in_progress", "In Progress", c(["in_progress", "on_hold"]), str(c(["on_hold"])) + " on hold · " + str(c(["unclear"])) + " with inconsistent status (shown in Data quality)",
            "In progress / on hold. Included: " + types_of([r for r in rows if r["cat"] in ["in_progress", "on_hold"]]), "cat_in_progress", "actual", "requests"),
        kpi("completed", "Approved / Completed", c(["completed"]), "", "Included: " + types_of([r for r in rows if r["cat"] == "completed"]), "cat_completed", "actual", "requests"),
        kpi("rejected", "Rejected", c(["rejected"]), str(c(["cancelled"])) + " cancelled (not counted)", "Included: " + types_of([r for r in rows if r["cat"] == "rejected"]), "cat_rejected", "actual", "requests"),
        kpi("overdue", "Overdue Requests", len(over), "open more than " + str(SLA_DAYS) + " days (provisional SLA - no SLA is configured)",
            "Age = days in the current workflow state, else since creation. Included: " + types_of(over), "overdue", "partial", "requests"),
        kpi("month", "Requests Created This Month", len([r for r in rows if r["created"][:7] == month]), month, "Included: " + types_of([r for r in rows if r["created"][:7] == month]), "this_month", "actual", "requests"),
        kpi("resolution", "Average Resolution Time", avg, (str(len(timed)) + " of " + str(len(closed)) + " closed requests have a reliable closure date") if closed else "No closed requests",
            "Creation → workflow comment for the final state. Reliable only for: " + types_of(timed), None, "partial" if timed and len(timed) < len(closed) else ("actual" if timed else "unavailable"), "days"),
    ]

    def grp(key):
        g = {}
        for r in rows:
            k = r[key] or "(Not set)"
            cur = g.get(k) or {"label": k, "count": 0, "open": 0}
            cur["count"] = cur["count"] + 1
            if r["cat"] in OPEN:
                cur["open"] = cur["open"] + 1
            g[k] = cur
        return sorted([g[k] for k in g], key=lambda x: -x["count"])

    months = []
    m0 = U.getdate(month + "-01")
    i = 11
    while i >= 0:
        months.append(str(U.add_months(m0, -i))[:7])
        i = i - 1
    trend = [{"month": m, "created": len([r for r in rows if r["created"][:7] == m]), "closed": len([r for r in rows if r["closed_on"][:7] == m])} for m in months]
    buckets = [["0-7", 0, 7], ["8-30", 8, 30], ["31-90", 31, 90], ["91-365", 91, 365], [">365", 366, 100000]]
    op = [r for r in rows if r["cat"] in OPEN]
    by_age = [{"label": b[0], "count": len([r for r in op if b[1] <= (r["age_days"] or 0) <= b[2]])} for b in buckets]
    res_by_type = []
    for t in list(dict([(r["type"], 1) for r in closed]).keys()):
        tt = [r for r in timed if r["type"] == t]
        res_by_type.append({"label": t, "avg": round(1.0 * sum([r["resolution_days"] for r in tt]) / len(tt), 1) if tt else None,
                            "timed": len(tt), "closed": len([r for r in closed if r["type"] == t])})
    oldest = sorted(op, key=lambda r: -(r["age_days"] or 0))[:10]
    analytics = {"by_type": grp("type"), "by_department": grp("department"), "by_branch": grp("branch"), "trend": trend, "pending_by_age": by_age,
                 "status": [{"key": k, "label": CAT_LABEL[k], "count": c([k])} for k in ["draft", "pending", "on_hold", "in_progress", "completed", "rejected", "cancelled", "unclear"]],
                 "resolution_by_type": sorted(res_by_type, key=lambda x: -(x["closed"])),
                 "oldest_open": [{"label": (r["type"] + " · " + (r["name"] if detail else "") + (" · " + r["employee_name"] if detail else "")).strip(" ·"), "age": r["age_days"], "id": r["id"] if detail else None} for r in oldest]}
    mq = my_queue(rows)
    queues = {"my": len(mq), "hr_review": len([r for r in op if "hr" in r["ws"].lower() or "review" in r["ws"].lower()]),
              "awaiting_info": len([r for r in op if r["cat"] == "on_hold"]), "overdue": len(over),
              "recent": len([r for r in rows if r["cat"] == "completed" and r["closed_on"] and U.date_diff(today, U.getdate(r["closed_on"])) <= 30]),
              "note": "Approve / reject only in the original ERPNext form, where its workflow checks your role. The dashboard never changes a request."}
    S = dq_sets(rows)
    dq = [{"key": d_[0], "label": d_[1], "severity": d_[2], "count": len(S[d_[0]]), "preset": ("dq_" + d_[0]) if detail else None} for d_ in DQ_LABELS]
    srcs = []
    for s in SOURCES:
        srcs.append({"doctype": s[1], "label": s[2], "readable": 0 if s[1] in ERR else 1, "status": "Unavailable" if s[1] in ERR else "Available", "count": len([r for r in rows if r["doctype"] == s[1]]),
                     "open": len([r for r in op if r["doctype"] == s[1]]), "workflow": (WF.get(s[1]) or {}).get("name") or ""})
    res = {"meta": {"tier": "detail" if detail else "aggregate", "company": company, "companies": companies, "today": today_s, "sla_days": SLA_DAYS,
                    "generated": str(U.now_datetime())[:19], "unreadable": ERR},
           "kpis": kpis, "queues": queues, "analytics": analytics, "dq": dq, "sources": srcs, "excluded": [{"doctype": x[0], "reason": x[1]} for x in EXCLUDED],
           "status_rules": status_rules()}
    if detail:
        res["options"] = {"types": [[s[0], s[2]] for s in SOURCES if s[1] not in ERR],
                          "department": sorted(list(dict([(r["department"] or "(Not set)", 1) for r in rows]).keys())),
                          "branch": sorted(list(dict([(r["branch"] or "(Not set)", 1) for r in rows]).keys())),
                          "approver": sorted(list(dict([(r["approver"], 1) for r in rows if r["approver"]]).keys())),
                          "status": [[k, CAT_LABEL[k]] for k in ["draft", "pending", "on_hold", "in_progress", "completed", "rejected", "cancelled", "unclear"]]}
    tbd = {}
    for r in rows:
        k = r["department"] or "(Not set)"
        cur = tbd.get(k) or {"label": k, "count": 0, "types": {}}
        cur["count"] = cur["count"] + 1
        cur["types"][r["type"]] = cur["types"].get(r["type"], 0) + 1
        tbd[k] = cur
    if not detail:
        for k in tbd:
            tbd[k]["types"] = dict([(t, (tbd[k]["types"][t] if tbd[k]["types"][t] >= SUPPRESS_MIN else None)) for t in tbd[k]["types"]])
    res["analytics"]["type_by_department"] = sorted([tbd[k] for k in tbd], key=lambda x: -x["count"])
    res["meta"]["filters"] = {"department": GF["department"], "branch": GF["branch"], "job_location": GF["custom_job_location"]}
    if not detail:
        res = suppress(res)
    frappe.response["message"] = res

# ======================================================================= LIST
elif mode == "list":
    ERR = []
    SKIP = []
    rows = build(ERR, SKIP)
    preset = fd.get("preset") or ""
    PRESETS = ["", "all", "cat_pending", "cat_in_progress", "cat_completed", "cat_rejected", "overdue", "this_month", "q_my", "q_hr_review",
               "q_awaiting_info", "q_recent", "age"] + ["dq_" + d_[0] for d_ in DQ_LABELS]
    if preset not in PRESETS:
        frappe.throw("Invalid preset.")
    sel = rows
    if preset == "cat_pending":
        sel = [r for r in rows if r["cat"] == "pending"]
    elif preset == "cat_in_progress":
        sel = [r for r in rows if r["cat"] in ["in_progress", "on_hold"]]
    elif preset == "cat_completed":
        sel = [r for r in rows if r["cat"] == "completed"]
    elif preset == "cat_rejected":
        sel = [r for r in rows if r["cat"] == "rejected"]
    elif preset == "overdue":
        sel = [r for r in rows if r["cat"] in OPEN and r["overdue_days"] > 0]
    elif preset == "this_month":
        sel = [r for r in rows if r["created"][:7] == today_s[:7]]
    elif preset == "q_my":
        sel = my_queue(rows)
    elif preset == "q_hr_review":
        sel = [r for r in rows if r["cat"] in OPEN and ("hr" in r["ws"].lower() or "review" in r["ws"].lower())]
    elif preset == "q_awaiting_info":
        sel = [r for r in rows if r["cat"] == "on_hold"]
    elif preset == "q_recent":
        sel = [r for r in rows if r["cat"] == "completed" and r["closed_on"] and U.date_diff(today, U.getdate(r["closed_on"])) <= 30]
    elif preset == "age":
        rng = {"0-7": [0, 7], "8-30": [8, 30], "31-90": [31, 90], "91-365": [91, 365], ">365": [366, 100000]}.get(fd.get("age_bucket") or "")
        if not rng:
            frappe.throw("Invalid age bucket.")
        sel = [r for r in rows if r["cat"] in OPEN and rng[0] <= (r["age_days"] or 0) <= rng[1]]
    elif preset.startswith("dq_"):
        S = dq_sets(rows)
        sel = []
        for x in S[preset[3:]]:
            r = dict(x[0])
            r["note"] = x[1]
            sel.append(r)
    for pair in [["department", "department"], ["branch", "branch"]]:
        v = fd.get(pair[0])
        if v:
            sel = [r for r in sel if (r[pair[1]] or "(Not set)") == v]
    v = fd.get("type")
    if v:
        if not SRC.get(v):
            frappe.throw("Invalid request type.")
        sel = [r for r in sel if r["src"] == v]
    v = (fd.get("employee") or "").strip()
    if v:
        sel = [r for r in sel if r["employee"] == v]
    v = fd.get("status")
    if v:
        if not CAT_LABEL.get(v):
            frappe.throw("Invalid status.")
        sel = [r for r in sel if r["cat"] == v]
    v = fd.get("approver")
    if v:
        sel = [r for r in sel if r["approver"] == v]
    rf = fd.get("range_from")
    rt = fd.get("range_to")
    if rf or rt:
        try:
            rf = str(U.getdate(rf)) if rf else "0000-00-00"
            rt = str(U.getdate(rt)) if rt else "9999-12-31"
        except Exception:
            frappe.throw("Invalid date.")
        sel = [r for r in sel if rf <= r["created"] <= rt]
    search = (fd.get("search") or "").strip()[:60].lower()
    if search:
        sel = [r for r in sel if search in r["name"].lower() or search in (r["employee"] or "").lower() or search in (r["employee_name"] or "").lower() or search in r["type"].lower()]
    SORTABLE = ["name", "type", "employee_name", "department", "company", "branch", "created", "approver", "status", "age_days"]
    sort_by = fd.get("sort_by") or "created"
    if sort_by not in SORTABLE:
        sort_by = "created"
    desc = fd.get("sort_order") != "asc"
    if sort_by == "age_days":
        has = [r for r in sel if r["age_days"] is not None]
        nonev = [r for r in sel if r["age_days"] is None]
        sel = sorted(has, key=lambda r: (r["age_days"], r["name"]), reverse=desc) + nonev
    else:
        sel = sorted(sel, key=lambda r: ((r[sort_by] or "").lower(), r["name"]), reverse=desc)
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
    KEYS = ["id", "doctype", "name", "type", "employee", "employee_name", "department", "company", "branch", "created", "approver", "priority",
            "state", "cat", "status", "age_days", "overdue_days"]
    out = []
    for r in sel[(page - 1) * page_length: page * page_length]:
        o = {}
        for k in KEYS:
            o[k] = r.get(k)
        o["note"] = r.get("note") or ""
        out.append(o)
    frappe.response["message"] = {"total": total, "page": page, "pages": pages, "page_length": page_length, "rows": out, "sort_by": sort_by,
                                  "sort_order": "desc" if desc else "asc", "preset": preset, "company": company, "unreadable": ERR}

# ======================================================================= DETAIL
else:
    rid = fd.get("id") or ""
    parts = rid.split("::")
    if len(parts) != 2 or not SRC.get(parts[0]):
        frappe.throw("Invalid request id.")
    src = SRC.get(parts[0])
    f = ["name", "docstatus", "creation", "modified", "owner", src[3]] + ([src[4]] if src[4] else []) + src[6] + src[7]
    if src[5] in ["workflow", "clearance"]:
        f.append("workflow_state")
    if src[5] == "advance":
        f.append("status")
    if src[5] == "separation":
        f.append("boarding_status")
    d = []
    if can_read(src[1]):
        try:
            d = frappe.get_list(src[1], filters={"name": parts[1]}, fields=f, limit_page_length=1)
        except Exception:
            d = []
    if not d:
        frappe.throw("Request not found or not permitted.", title="Not Permitted")
    d = d[0]
    cat = classify(src, d)
    eid = d.get(src[3])
    e = EMP.get(eid) if eid else None
    hist = wf_comments(src[1], [d.get("name")]).get(d.get("name")) or []
    owners = list(dict([(h.get("owner"), 1) for h in hist] + [(d.get("owner"), 1)]).keys())
    names = {}
    for u_ in frappe.get_all("User", filters=[["name", "in", owners]], fields=["name", "full_name"]):
        names[u_.get("name")] = u_.get("full_name") or u_.get("name")
    since = str(d.get("creation"))[:10]
    for h in hist:
        if (h.get("content") or "") == (d.get("workflow_state") or ""):
            since = str(h.get("creation"))[:10]
    w = WF.get(src[1])
    actions = []
    if w and d.get("workflow_state") and cat in OPEN:
        actions = [t.get("action") + " → " + t.get("next_state") for t in w["transitions"] if t.get("state") == d.get("workflow_state") and (t.get("allowed") in roles or user == "Administrator")]
    safe = []
    for k in src[7]:
        v = d.get(k)
        if v:
            safe.append([k.replace("_", " ").capitalize(), (str(v)[:100])])
    related = []
    if eid:
        for s2 in SOURCES:
            if not can_read(s2[1]):
                continue
            try:
                rr = frappe.get_list(s2[1], filters=[[s2[3], "=", eid], ["name", "!=", d.get("name")]], fields=["name", "docstatus", "creation"] + (["workflow_state"] if s2[5] in ["workflow", "clearance"] else []),
                                     order_by="creation desc", limit_page_length=5)
            except Exception:
                rr = []
            for x in rr:
                related.append({"doctype": s2[1], "type": s2[2], "name": x.get("name"), "state": x.get("workflow_state") or ["Draft", "Submitted", "Cancelled"][x.get("docstatus") or 0],
                                "created": str(x.get("creation"))[:10]})
    frappe.response["message"] = {
        "request": {"id": rid, "doctype": src[1], "name": d.get("name"), "type": src[2], "created": str(d.get("creation"))[:16], "created_by": names.get(d.get("owner")) or d.get("owner"),
                    "state": d.get("workflow_state") or d.get("status") or d.get("boarding_status") or ["Draft", "Submitted", "Cancelled"][d.get("docstatus") or 0],
                    "cat": cat, "status": CAT_LABEL[cat], "approver": approver_text(src, d, cat), "since": since,
                    "days_pending": U.date_diff(today, U.getdate(since)) if cat in OPEN else None, "safe_fields": safe,
                    "workflow": w["name"] if w else None,
                    "route": "/app/" + src[1].lower().replace(" ", "-") + "/" + d.get("name")},
        "employee": {"employee": e.get("name"), "employee_name": e.get("employee_name"), "company": e.get("company"), "department": e.get("department"),
                     "branch": e.get("branch"), "designation": e.get("designation"), "status": e.get("status")} if e else None,
        "history": [{"state": h.get("content"), "by": names.get(h.get("owner")) or h.get("owner"), "on": str(h.get("creation"))[:16]} for h in hist],
        "actions": actions, "related": related[:15],
        "note": "Free-text reasons, letter text, remarks, amounts and other confidential content are not shown. Open the original record to act; its workflow checks your role."}
