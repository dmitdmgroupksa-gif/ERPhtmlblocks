# Admin & HR Dashboard - Training API (Server Script, API method: admin_hr_training_data)
# READ-ONLY. Login required. Never creates, changes or completes training assignments.
# Tiers: HR Manager / HR User -> employee-level rows ("detail");
#        System Manager / IT Coordinator without an HR role -> counts and charts only ("aggregate").
# Employees use the existing My Training page (training_my_videos), which is limited to their own records.
# Assignment and employee reads use frappe.get_list (DocType permissions + Employee User Permissions).
# frappe.get_all is used only for: the caller's own roles, Company names, Training Video / Course configuration,
# role membership of users to check mandatory-video eligibility (counts / employee ids only), and the
# Training reminder job configuration and run log.
# Sources: Training Video, Training Course, Employee Training Progress (video assignments),
#          Employee Course Progress (course assignments).
# modes: summary (default) | list | detail

ALLOWED_ROLES = ["System Manager", "HR Manager", "HR User", "IT Coordinator","Dashboard Manager"]
DETAIL_ROLES = ["HR Manager", "HR User","Dashboard Manager"]
DEFAULT_COMPANY = "Durar Masagh Trading Company"
DUE_SOON_DAYS = 3
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
    frappe.throw("Employee-level training data is restricted to HR Manager / HR User.", title="Restricted")

today = U.getdate(U.nowdate())
today_s = str(today)
companies = [c.get("name") for c in frappe.get_all("Company", fields=["name"], order_by="name asc")]
company = fd.get("company") or DEFAULT_COMPANY
if company != "All" and company not in companies:
    frappe.throw("Company not found.", title="Not Permitted")
cfilter = [] if company == "All" else [["company", "=", company]]

# ---- Phase 8: global dashboard filters (applied to the employee's current Employee record) ----
GF = {"department": fd.get("g_department") or "", "branch": fd.get("g_branch") or "", "custom_job_location": fd.get("g_job_location") or ""}
GF_ON = len([k for k in GF if GF[k]]) > 0
GF_FILTERS = [([k, "is", "not set"] if GF[k] == "(Not set)" else [k, "=", GF[k]]) for k in GF if GF[k]]


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


videos = frappe.get_all("Training Video", fields=["name", "training_title", "category", "active", "mandatory", "completion_days", "all_departments"], order_by="sequence asc, name asc")
courses = frappe.get_all("Training Course", fields=["name", "course_title", "category", "active", "mandatory", "completion_days", "assign_to_all"], order_by="sequence asc, name asc")
VID = {}
for v in videos:
    VID[v.get("name")] = v
CRS = {}
for c in courses:
    CRS[c.get("name")] = c


def getlist(doctype, filters, fields, order_by):
    try:
        return frappe.get_list(doctype, filters=filters, fields=fields, order_by=order_by, limit_page_length=0)
    except Exception:
        return None


ERR = []
emps = getlist("Employee", cfilter + GF_FILTERS, ["name", "employee_name", "company", "department", "designation", "status", "user_id", "date_of_joining"], "name asc")
if emps is None:
    frappe.throw("Employee records are not readable with your permissions.", title="Not Permitted")
EMP = {}
for e in emps:
    EMP[e.get("name")] = e


def dstr(v):
    return str(v)[:10] if v else ""


def build_rows():
    rows = []
    vp = getlist("Employee Training Progress", [], ["name", "employee", "employee_name", "department", "training_video", "training_title", "mandatory",
                                                  "status", "assigned_date", "due_date", "started_on", "completed_on", "last_reminder_on",
                                                  "reminders_sent", "escalated_on"], "assigned_date desc")
    if vp is None:
        ERR.append("Employee Training Progress")
        vp = []
    cp = getlist("Employee Course Progress", [], ["name", "employee", "employee_name", "department", "course", "course_title", "assigned",
                                                "status", "videos_completed", "videos_total", "assigned_date", "due_date", "completed_on",
                                                "last_reminder_on", "reminders_sent", "escalated_on"], "assigned_date desc")
    if cp is None:
        ERR.append("Employee Course Progress")
        cp = []
    for p in vp:
        rows.append(["video", p])
    for p in cp:
        rows.append(["course", p])
    out = []
    for x in rows:
        kind = x[0]
        p = x[1]
        e = EMP.get(p.get("employee"))
        if not e:
            continue  # other company, or employee not visible to the caller
        st = p.get("status") or "Not Started"
        due = dstr(p.get("due_date"))
        days_to_due = U.date_diff(due, today) if due else None
        overdue = st != "Completed" and days_to_due is not None and days_to_due < 0
        due_soon = st != "Completed" and days_to_due is not None and 0 <= days_to_due <= DUE_SOON_DAYS
        if kind == "video":
            item = p.get("training_video")
            cfg = VID.get(item) or {}
            title = p.get("training_title") or cfg.get("training_title") or item
            mand = 1 if p.get("mandatory") else 0
            pct = 100 if st == "Completed" else (0 if st == "Not Started" else None)
            started = dstr(p.get("started_on"))
        else:
            item = p.get("course")
            cfg = CRS.get(item) or {}
            title = p.get("course_title") or cfg.get("course_title") or item
            mand = 1 if cfg.get("mandatory") else 0
            vt = U.cint(p.get("videos_total"))
            pct = 100 if st == "Completed" else (int(round(100.0 * U.cint(p.get("videos_completed")) / vt)) if vt else None)
            started = ""
        out.append({"name": p.get("name"), "kind": kind, "item": item, "title": title, "category": cfg.get("category") or "",
                    "employee": p.get("employee"), "employee_name": e.get("employee_name") or p.get("employee_name"),
                    "company": e.get("company"), "department": e.get("department") or p.get("department") or "",
                    "designation": e.get("designation") or "", "mandatory": mand, "item_mandatory": 1 if cfg.get("mandatory") else 0,
                    "status": st, "assigned_date": dstr(p.get("assigned_date")), "due_date": due, "started_on": started,
                    "completed_on": dstr(p.get("completed_on")), "progress": pct, "days_to_due": days_to_due,
                    "overdue": 1 if overdue else 0, "due_soon": 1 if due_soon else 0,
                    "reminders_sent": U.cint(p.get("reminders_sent")), "last_reminder_on": dstr(p.get("last_reminder_on")),
                    "escalated_on": dstr(p.get("escalated_on")), "completion_days": U.cint(cfg.get("completion_days")),
                    "progress_department": p.get("department") or ""})
    return out


def eligibility(rows):
    # Mirrors the daily job: active mandatory videos go to Active employees with a user; when the video is not
    # "all departments", the user must hold one of the video's allowed roles. Only counts / employee ids are used.
    res = []
    mv = [v for v in videos if v.get("active") and v.get("mandatory")]
    if not mv:
        return res
    uids = [e.get("user_id") for e in emps if e.get("user_id") and e.get("status") == "Active"]
    urole = {}
    if uids:
        for r in frappe.get_all("Has Role", filters=[["parenttype", "=", "User"], ["parent", "in", uids]], fields=["parent", "role"]):
            urole[r.get("parent") + "||" + r.get("role")] = 1
    vroles = {}
    for r in frappe.get_all("Training Video Role", filters=[["parenttype", "=", "Training Video"], ["parent", "in", [v.get("name") for v in mv]]], fields=["parent", "role"]):
        vroles[r.get("parent")] = (vroles.get(r.get("parent")) or []) + [r.get("role")]
    for v in mv:
        assigned = {}
        for r in rows:
            if r["kind"] == "video" and r["item"] == v.get("name"):
                assigned[r["employee"]] = 1
        elig = {}
        for e in emps:
            if e.get("status") != "Active" or not e.get("user_id"):
                continue
            ok = True
            if not v.get("all_departments"):
                ok = len([x for x in (vroles.get(v.get("name")) or []) if urole.get(e.get("user_id") + "||" + x)]) > 0
            if ok:
                elig[e.get("name")] = 1
        res.append({"item": v.get("name"), "title": v.get("training_title"), "eligible": len(elig), "assigned": len(assigned),
                    "eligible_not_assigned": [k for k in elig if not assigned.get(k)],
                    "assigned_not_eligible": [k for k in assigned if not elig.get(k)],
                    "rule": "All active employees with a user" if v.get("all_departments") else "Active employees whose user has role: " + ", ".join(vroles.get(v.get("name")) or [])})
    return res


def expected_reminders(r):
    # Daily job schedule: 1 three days before, 1 on the due date, then 1 every 7 days while overdue.
    if not r["due_date"] or r["status"] == "Completed":
        return None
    od = -r["days_to_due"]
    if od < -3:
        return 0
    if od < 0:
        return 1
    return 2 + int(od / 7)


def dq_sets(rows, elig):
    S = {"mand_mismatch": [], "no_due": [], "due_rule": [], "status_dates": [], "dept_mismatch": [], "reminder_excess": [],
         "elig_missing": [], "not_eligible": [], "no_user": []}
    for r in rows:
        if r["kind"] == "video" and r["mandatory"] != r["item_mandatory"]:
            S["mand_mismatch"].append([r, "Assignment says " + ("mandatory" if r["mandatory"] else "optional") + ", the video is now " + ("mandatory" if r["item_mandatory"] else "optional")])
        if not r["due_date"] and r["status"] != "Completed":
            S["no_due"].append([r, "No due date, so overdue cannot be evaluated" + (" (optional item, no reminders)" if not r["mandatory"] else "")])
        if r["due_date"] and r["assigned_date"] and r["completion_days"]:
            gap = U.date_diff(r["due_date"], r["assigned_date"])
            if gap != r["completion_days"]:
                S["due_rule"].append([r, "Due date is " + str(gap) + " days after assignment; the item allows " + str(r["completion_days"])])
        if (r["status"] == "Completed" and not r["completed_on"]) or (r["status"] != "Completed" and r["completed_on"]) or (r["kind"] == "video" and r["status"] == "In Progress" and not r["started_on"]):
            S["status_dates"].append([r, "Status and dates disagree"])
        if r["progress_department"] and r["progress_department"] != r["department"]:
            S["dept_mismatch"].append([r, "Department on the assignment differs from the Employee record"])
        ex = expected_reminders(r)
        if ex is not None and r["reminders_sent"] > ex:
            S["reminder_excess"].append([r, str(r["reminders_sent"]) + " reminders recorded; the schedule allows " + str(ex)])
    for x in elig:
        for k in x["eligible_not_assigned"]:
            e = EMP.get(k) or {}
            S["elig_missing"].append([{"name": "", "kind": "video", "item": x["item"], "title": x["title"], "employee": k, "employee_name": e.get("employee_name"),
                                      "company": e.get("company"), "department": e.get("department") or "", "designation": e.get("designation") or "",
                                      "mandatory": 1, "status": "Not assigned", "assigned_date": "", "due_date": "", "started_on": "", "completed_on": "",
                                      "progress": None, "overdue": 0, "due_soon": 0, "days_to_due": None}, "Eligible for this mandatory video but not assigned yet (the daily job assigns at 08:00)"])
        for k in x["assigned_not_eligible"]:
            for r in rows:
                if r["employee"] == k and r["item"] == x["item"]:
                    S["not_eligible"].append([r, "Assigned, but the employee no longer matches the video's role rule"])
    for e in emps:
        if e.get("status") == "Active" and not e.get("user_id"):
            S["no_user"].append([{"name": "", "kind": "", "item": "", "title": "—", "employee": e.get("name"), "employee_name": e.get("employee_name"),
                                  "company": e.get("company"), "department": e.get("department") or "", "designation": e.get("designation") or "",
                                  "mandatory": 0, "status": "No user", "assigned_date": "", "due_date": "", "started_on": "", "completed_on": "",
                                  "progress": None, "overdue": 0, "due_soon": 0, "days_to_due": None}, "No ERPNext user: cannot be assigned or open My Training"])
    return S


DQ_LABELS = [["elig_missing", "Eligible for a mandatory video but not assigned", "high"],
             ["mand_mismatch", "Mandatory flag differs from the video", "high"],
             ["no_due", "Open assignments without a due date", "medium"],
             ["due_rule", "Due date does not match the item's completion days", "low"],
             ["not_eligible", "Assigned but no longer matching the role rule", "low"],
             ["status_dates", "Status and start / completion dates disagree", "medium"],
             ["dept_mismatch", "Assignment department differs from Employee", "low"],
             ["reminder_excess", "More reminders recorded than the schedule allows", "medium"],
             ["no_user", "Active employees without an ERPNext user (cannot train)", "medium"]]


def pct(a, b):
    return round(100.0 * a / b, 1) if b else None


# ======================================================================= SUMMARY
if mode == "summary":
    small_scope_guard(len([e for e in emps if e.get("status") == "Active"]))
    rows = build_rows()
    elig = eligibility(rows)
    comp = [r for r in rows if r["status"] == "Completed"]
    prog = [r for r in rows if r["status"] == "In Progress"]
    nots = [r for r in rows if r["status"] == "Not Started"]
    over = [r for r in rows if r["overdue"]]
    nodue = [r for r in rows if not r["due_date"] and r["status"] != "Completed"]
    mand = [r for r in rows if r["mandatory"]]
    mand_done = [r for r in mand if r["status"] == "Completed"]
    emp_with = dict([(r["employee"], 1) for r in rows])
    emp_mand = {}
    for r in mand:
        cur = emp_mand.get(r["employee"]) or {"total": 0, "done": 0}
        cur["total"] = cur["total"] + 1
        if r["status"] == "Completed":
            cur["done"] = cur["done"] + 1
        emp_mand[r["employee"]] = cur
    emp_mand_ok = len([k for k in emp_mand if emp_mand[k]["done"] == emp_mand[k]["total"]])
    active_emps = len([e for e in emps if e.get("status") == "Active"])

    def kpi(key, label, value, unit, sub, basis, preset, state):
        return {"key": key, "label": label, "value": value, "unit": unit, "sub": sub, "basis": basis, "state": state,
                "preset": preset if detail else None}

    av = [v for v in videos if v.get("active")]
    ac = [c for c in courses if c.get("active")]
    kpis = [
        kpi("videos", "Total Training Videos", len(av), "videos", str(len([v for v in av if v.get("mandatory")])) + " mandatory · " + str(len(videos) - len(av)) + " inactive",
            "Active Training Video records.", None, "actual"),
        kpi("courses", "Total Training Courses", len(ac), "courses", "No Training Course has been created yet" if not courses else str(len([c for c in ac if c.get("mandatory")])) + " mandatory",
            "Active Training Course records.", None, "actual"),
        kpi("employees", "Employees Assigned Training", len(emp_with), "employees", "of " + str(active_emps) + " active employees",
            "Distinct employees with at least one video or course assignment.", "all", "actual"),
        kpi("assignments", "Total Training Assignments", len(rows), "assignments",
            str(len([r for r in rows if r["kind"] == "video"])) + " video · " + str(len([r for r in rows if r["kind"] == "course"])) + " course",
            "Employee Training Progress + Employee Course Progress records.", "all", "actual"),
        kpi("completed", "Completed Assignments", len(comp), "assignments", "", "Status = Completed.", "st_Completed", "actual"),
        kpi("in_progress", "In Progress", len(prog), "assignments", "", "Status = In Progress (video opened, not marked complete).", "st_In Progress", "actual"),
        kpi("not_started", "Not Started", len(nots), "assignments", "", "Status = Not Started.", "st_Not Started", "actual"),
        kpi("overdue", "Overdue Training", len(over), "assignments", str(len(nodue)) + " open assignments have no due date and cannot be overdue",
            "Not completed and due date before today.", "overdue", "partial" if nodue else "actual"),
        kpi("completion", "Overall Completion", pct(len(comp), len(rows)), "%", str(len(comp)) + " of " + str(len(rows)) + " assignments",
            "Completed ÷ all assignments.", None, "actual"),
        kpi("mandatory", "Mandatory Training Compliance", pct(len(mand_done), len(mand)), "%",
            str(len(mand_done)) + " of " + str(len(mand)) + " mandatory assignments · " + str(emp_mand_ok) + " of " + str(len(emp_mand)) + " employees fully compliant",
            "Completed mandatory assignments ÷ mandatory assignments (flag on the assignment).", "mand_incomplete",
            "partial" if [x for x in elig if x["eligible_not_assigned"]] else "actual"),
    ]

    def group(key):
        g = {}
        for r in rows:
            k = r[key] or "(Not set)"
            cur = g.get(k) or {"label": k, "total": 0, "done": 0, "overdue": 0, "mand_open": 0}
            cur["total"] = cur["total"] + 1
            if r["status"] == "Completed":
                cur["done"] = cur["done"] + 1
            if r["overdue"]:
                cur["overdue"] = cur["overdue"] + 1
            g[k] = cur
        out = []
        for k in g:
            x = g[k]
            x["pct"] = pct(x["done"], x["total"])
            out.append(x)
        return sorted(out, key=lambda x: (-x["total"], x["label"]))

    months = []
    m0 = U.getdate(today_s[:7] + "-01")
    i = 11
    while i >= 0:
        months.append(str(U.add_months(m0, -i))[:7])
        i = i - 1
    trend = []
    for m in months:
        trend.append({"month": m, "completed": len([r for r in comp if r["completed_on"][:7] == m]),
                      "assigned": len([r for r in rows if r["assigned_date"][:7] == m])})
    items = {}
    for r in rows:
        k = r["kind"] + "||" + r["item"]
        cur = items.get(k) or {"label": r["title"], "kind": r["kind"], "item": r["item"], "count": 0, "done": 0, "mandatory": r["item_mandatory"]}
        cur["count"] = cur["count"] + 1
        if r["status"] == "Completed":
            cur["done"] = cur["done"] + 1
        items[k] = cur
    mand_items = []
    for k in items:
        x = items[k]
        mr = [r for r in mand if r["kind"] + "||" + r["item"] == k]
        if mr:
            mand_items.append({"label": x["label"], "item": x["item"], "total": len(mr), "done": len([r for r in mr if r["status"] == "Completed"]),
                               "overdue": len([r for r in mr if r["overdue"]]), "pct": pct(len([r for r in mr if r["status"] == "Completed"]), len(mr))})
    inc = [k for k in emp_mand if emp_mand[k]["done"] < emp_mand[k]["total"]]
    analytics = {"by_department": group("department"), "by_designation": group("designation"), "trend": trend,
                 "mandatory_items": mand_items, "overdue_by_department": sorted([x for x in group("department") if x["overdue"]], key=lambda x: -x["overdue"]),
                 "most_assigned": sorted([items[k] for k in items], key=lambda x: -x["count"]),
                 "mandatory_incomplete_employees": len(inc), "status": [{"label": s, "count": len([r for r in rows if r["status"] == s])} for s in ["Completed", "In Progress", "Not Started"]]}

    # reminder jobs (configuration + run log)
    jobs = []
    for sname in ["Training - Daily Assignments & Reminders", "Training - Weekly HR Overdue Report"]:
        ss = frappe.get_all("Server Script", filters={"name": sname}, fields=["name", "disabled", "cron_format", "event_frequency"])
        sj = frappe.get_all("Scheduled Job Type", filters={"server_script": sname}, fields=["name", "stopped", "last_execution"])
        runs = {}
        last_fail = None
        if sj:
            for lg in frappe.get_all("Scheduled Job Log", filters=[["scheduled_job_type", "=", sj[0].get("name")], ["creation", ">=", str(U.add_days(today, -30))]],
                                     fields=["status", "creation"], order_by="creation desc"):
                runs[lg.get("status")] = runs.get(lg.get("status"), 0) + 1
                if lg.get("status") == "Failed" and not last_fail:
                    last_fail = str(lg.get("creation"))[:16]
        jobs.append({"name": sname, "exists": 1 if ss else 0, "disabled": ss[0].get("disabled") if ss else None, "cron": ss[0].get("cron_format") if ss else "",
                     "stopped": sj[0].get("stopped") if sj else None, "last_run": str(sj[0].get("last_execution") or "")[:16] if sj else "",
                     "runs_30d": runs, "last_failure": last_fail})
    rem = {"jobs": jobs, "sent_total": sum([r["reminders_sent"] for r in rows]),
           "reminded_assignments": len([r for r in rows if r["reminders_sent"]]), "escalated": len([r for r in rows if r["escalated_on"]]),
           "last_reminder": max([r["last_reminder_on"] for r in rows] or [""]),
           "schedule": "Mandatory videos/courses only: 3 days before due, on the due date, then every 7 days while overdue; manager copied from 14 days overdue. Weekly HR summary Sunday 08:05.",
           "optional_without_reminders": len([r for r in rows if not r["mandatory"] and r["status"] != "Completed"])}

    S = dq_sets(rows, elig)
    dq = [{"key": d_[0], "label": d_[1], "severity": d_[2], "count": len(S[d_[0]]), "preset": ("dq_" + d_[0]) if detail else None} for d_ in DQ_LABELS]
    res = {"meta": {"tier": "detail" if detail else "aggregate", "company": company, "companies": companies, "today": today_s,
                    "generated": str(U.now_datetime())[:19], "unreadable": ERR, "due_soon_days": DUE_SOON_DAYS},
           "kpis": kpis, "analytics": analytics, "dq": dq, "reminders": rem,
           "eligibility": [{"item": x["item"], "title": x["title"], "rule": x["rule"], "eligible": x["eligible"], "assigned": x["assigned"],
                            "eligible_not_assigned": len(x["eligible_not_assigned"]), "assigned_not_eligible": len(x["assigned_not_eligible"])} for x in elig],
           "catalog": {"videos": [{"name": v.get("name"), "title": v.get("training_title"), "category": v.get("category"), "active": v.get("active"),
                                   "mandatory": v.get("mandatory"), "completion_days": v.get("completion_days"),
                                   "assigned": (items.get("video||" + v.get("name")) or {}).get("count", 0)} for v in videos],
                       "courses": [{"name": c.get("name"), "title": c.get("course_title"), "active": c.get("active"), "mandatory": c.get("mandatory"),
                                    "assigned": (items.get("course||" + c.get("name")) or {}).get("count", 0)} for c in courses]},
           "assessments": {"available": False, "note": "No quiz, assessment or certificate records exist (Training Result: 0, Training Feedback: 0). Completion is the employee marking the video complete in My Training."},
           "notes": {"progress": "Videos record status only; In Progress has no percentage. Courses use videos completed ÷ videos total.",
                     "mandatory": "Mandatory = the flag stored on the assignment.",
                     "overdue": "Overdue = not completed and due date before today. Due soon = due in 0–" + str(DUE_SOON_DAYS) + " days."}}
    if detail:
        res["options"] = {"department": sorted(list(dict([(r["department"] or "(Not set)", 1) for r in rows]).keys())),
                          "designation": sorted(list(dict([(r["designation"] or "(Not set)", 1) for r in rows]).keys())),
                          "items": [[k.split("||")[0] + ":" + items[k]["item"], items[k]["label"] + (" (course)" if items[k]["kind"] == "course" else "")] for k in items]}
    res["meta"]["filters"] = {"department": GF["department"], "branch": GF["branch"], "job_location": GF["custom_job_location"]}
    if not detail:
        res = suppress(res)
    frappe.response["message"] = res

# ======================================================================= LIST
elif mode == "list":
    rows = build_rows()
    preset = fd.get("preset") or ""
    PRESETS = ["", "all", "overdue", "due_soon", "mand_incomplete", "st_Completed", "st_In Progress", "st_Not Started"] + ["dq_" + d_[0] for d_ in DQ_LABELS]
    if preset not in PRESETS:
        frappe.throw("Invalid preset.")
    sel = rows
    if preset.startswith("st_"):
        sel = [r for r in rows if r["status"] == preset[3:]]
    elif preset == "overdue":
        sel = [r for r in rows if r["overdue"]]
    elif preset == "due_soon":
        sel = [r for r in rows if r["due_soon"]]
    elif preset == "mand_incomplete":
        sel = [r for r in rows if r["mandatory"] and r["status"] != "Completed"]
    elif preset.startswith("dq_"):
        S = dq_sets(rows, eligibility(rows) if preset in ["dq_elig_missing", "dq_not_eligible"] else [])
        sel = []
        for x in S[preset[3:]]:
            r = dict(x[0])
            r["note"] = x[1]
            sel.append(r)
    for pair in [["department", "department"], ["designation", "designation"]]:
        v = fd.get(pair[0])
        if v:
            sel = [r for r in sel if (r[pair[1]] or "(Not set)") == v]
    v = fd.get("item")
    if v:
        sel = [r for r in sel if r.get("kind", "") + ":" + r.get("item", "") == v]
    emp_f = (fd.get("employee") or "").strip()
    if emp_f:
        sel = [r for r in sel if r["employee"] == emp_f]
    mf = fd.get("mandatory")
    if mf in ["1", "0"]:
        sel = [r for r in sel if str(r.get("mandatory") or 0) == mf]
    elif mf:
        frappe.throw("Invalid mandatory filter.")
    stf = fd.get("status")
    if stf:
        if stf not in ["Completed", "In Progress", "Not Started", "Not assigned", "No user"]:
            frappe.throw("Invalid status.")
        sel = [r for r in sel if r["status"] == stf]
    tf = fd.get("timing")
    if tf:
        if tf == "overdue":
            sel = [r for r in sel if r.get("overdue")]
        elif tf == "due_soon":
            sel = [r for r in sel if r.get("due_soon")]
        elif tf == "no_due":
            sel = [r for r in sel if not r.get("due_date") and r["status"] != "Completed"]
        elif tf == "on_track":
            sel = [r for r in sel if r["status"] != "Completed" and r.get("due_date") and not r.get("overdue") and not r.get("due_soon")]
        else:
            frappe.throw("Invalid timing filter.")
    dfield = fd.get("date_field") or "assigned_date"
    if dfield not in ["assigned_date", "due_date", "completed_on"]:
        frappe.throw("Invalid date field.")
    rf = fd.get("range_from")
    rt = fd.get("range_to")
    if rf or rt:
        try:
            rf = str(U.getdate(rf)) if rf else "0000-00-00"
            rt = str(U.getdate(rt)) if rt else "9999-12-31"
        except Exception:
            frappe.throw("Invalid date.")
        sel = [r for r in sel if r.get(dfield) and rf <= r.get(dfield) <= rt]
    search = (fd.get("search") or "").strip()[:60].lower()
    if search:
        sel = [r for r in sel if search in (r["employee"] or "").lower() or search in (r["employee_name"] or "").lower() or search in (r.get("title") or "").lower()]
    SORTABLE = ["employee", "employee_name", "company", "department", "designation", "title", "mandatory", "assigned_date", "due_date",
                "started_on", "completed_on", "status", "progress"]
    sort_by = fd.get("sort_by") or "due_date"
    if sort_by not in SORTABLE:
        sort_by = "due_date"
    desc = fd.get("sort_order") == "desc"
    if sort_by in ["progress", "mandatory"]:
        has = [r for r in sel if r.get(sort_by) is not None]
        nonev = [r for r in sel if r.get(sort_by) is None]
        sel = sorted(has, key=lambda r: (r.get(sort_by), r["employee"]), reverse=desc) + nonev
    elif sort_by in ["due_date", "assigned_date", "started_on", "completed_on"]:
        has = [r for r in sel if r.get(sort_by)]
        nonev = [r for r in sel if not r.get(sort_by)]
        sel = sorted(has, key=lambda r: (r.get(sort_by), r["employee"]), reverse=desc) + nonev
    else:
        sel = sorted(sel, key=lambda r: ((r.get(sort_by) or "").lower(), r["employee"]), reverse=desc)
    total = len(sel)
    emp_count = len(dict([(r["employee"], 1) for r in sel]))
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
    KEYS = ["name", "kind", "item", "title", "employee", "employee_name", "company", "department", "designation", "mandatory", "status",
            "assigned_date", "due_date", "started_on", "completed_on", "progress", "overdue", "due_soon", "days_to_due"]
    out = []
    for r in sel[(page - 1) * page_length: page * page_length]:
        o = {}
        for k in KEYS:
            o[k] = r.get(k)
        o["note"] = r.get("note") or ""
        out.append(o)
    frappe.response["message"] = {"total": total, "employees": emp_count, "page": page, "pages": pages, "page_length": page_length, "rows": out,
                                  "sort_by": sort_by, "sort_order": "desc" if desc else "asc", "preset": preset, "company": company}

# ======================================================================= DETAIL
else:
    emp_id = (fd.get("employee") or "").strip()
    if not emp_id or not EMP.get(emp_id):
        frappe.throw("Employee not found or not permitted.", title="Not Permitted")
    e = EMP.get(emp_id)
    rows = [r for r in build_rows() if r["employee"] == emp_id]
    elig = [x for x in eligibility(build_rows()) if emp_id in x["eligible_not_assigned"]]
    hist = []
    for r in rows:
        if r["assigned_date"]:
            hist.append({"date": r["assigned_date"], "event": "Assigned", "item": r["title"]})
        if r["started_on"]:
            hist.append({"date": r["started_on"], "event": "Started (opened the video)", "item": r["title"]})
        if r["last_reminder_on"]:
            hist.append({"date": r["last_reminder_on"], "event": "Last reminder (" + str(r["reminders_sent"]) + " sent in total)", "item": r["title"]})
        if r["escalated_on"]:
            hist.append({"date": r["escalated_on"], "event": "Escalated to the reporting manager", "item": r["title"]})
        if r["completed_on"]:
            hist.append({"date": r["completed_on"], "event": "Completed", "item": r["title"]})
    hist = sorted(hist, key=lambda x: x["date"], reverse=True)
    KEYS = ["name", "kind", "item", "title", "category", "mandatory", "status", "assigned_date", "due_date", "started_on", "completed_on", "progress",
            "overdue", "due_soon", "days_to_due", "reminders_sent", "last_reminder_on", "escalated_on"]
    items = []
    for r in rows:
        o = {}
        for k in KEYS:
            o[k] = r.get(k)
        items.append(o)
    ojt = getlist("Training", [["trainee", "=", emp_id]], ["name", "workflow_state", "docstatus", "date"], "date desc")
    frappe.response["message"] = {
        "basic": {"employee": e.get("name"), "employee_name": e.get("employee_name"), "company": e.get("company"), "department": e.get("department"),
                  "designation": e.get("designation"), "status": e.get("status"), "date_of_joining": dstr(e.get("date_of_joining")),
                  "has_user": 1 if e.get("user_id") else 0},
        "items": items,
        "summary": {"total": len(rows), "completed": len([r for r in rows if r["status"] == "Completed"]), "in_progress": len([r for r in rows if r["status"] == "In Progress"]),
                    "not_started": len([r for r in rows if r["status"] == "Not Started"]), "mandatory": len([r for r in rows if r["mandatory"]]),
                    "mandatory_open": len([r for r in rows if r["mandatory"] and r["status"] != "Completed"]), "overdue": len([r for r in rows if r["overdue"]])},
        "not_yet_assigned": [{"item": x["item"], "title": x["title"]} for x in elig],
        "history": hist,
        "other_training": [{"name": t.get("name"), "state": t.get("workflow_state") or "", "date": dstr(t.get("date"))} for t in (ojt or [])] if ojt is not None else None,
        "assessments": {"available": False, "note": "No quiz, assessment or certificate records exist in this system."},
        "links": {"my_training": "/app/my-training", "training_dashboard": "/app/training-dashboard"}}
