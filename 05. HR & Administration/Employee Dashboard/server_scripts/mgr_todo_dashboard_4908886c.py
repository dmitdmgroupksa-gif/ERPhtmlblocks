# mgr_todo_dashboard - Manager ToDo Dashboard API (Phase 9.2). READ-ONLY, AGGREGATES ONLY.
# Identity: frappe.session.user. Access: an active Employee record that is the reports_to of >=1 active employee.
# Team: computed server-side from active Employee.reports_to (direct or entire tree); only members with a user_id.
# Client-supplied users/teams are never trusted: employee/department filters must be inside the computed team.
# Returns counts only - no task titles, descriptions, comments, attachments or linked documents.
U = frappe.utils
user = frappe.session.user
if not user or user == "Guest":
    frappe.throw("Please log in.", frappe.PermissionError)

mgr = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, ["name", "employee_name"], as_dict=True)
if frappe.form_dict.get("section") == "check":
    # Navigation check only: same eligibility rule, returns no team or task data.
    frappe.response["message"] = {"eligible": bool(mgr) and bool(frappe.db.exists("Employee", {"reports_to": mgr.name, "status": "Active"}))}
else:
    if not mgr:
        frappe.throw("No active Employee record is linked to your login.", frappe.PermissionError)
    # Eligibility: verified line manager = at least one ACTIVE employee whose standard reports_to is this Employee.
    # (custom_line_manager_email is NOT used - it disagrees with reports_to for many employees.)
    if not frappe.db.exists("Employee", {"reports_to": mgr.name, "status": "Active"}):
        frappe.throw("The Manager ToDo Dashboard is available only to employees who have active direct reports.", frappe.PermissionError)

    fd = frappe.form_dict
    today = U.getdate(U.nowdate())
    scope = "entire" if fd.get("scope") == "entire" else "direct"

    emps = frappe.db.sql("select name, employee_name, user_id, reports_to, department from `tabEmployee` where status='Active'", as_dict=True)
    children = {}
    info = {}
    for e in emps:
        info[e.name] = e
        if e.reports_to:
            children.setdefault(e.reports_to, []).append(e.name)
    team = []
    seen = {}
    stack = []
    for c in children.get(mgr.name, []):
        stack.append([c, 1])
    while stack:
        item = stack.pop()
        en = item[0]
        if en in seen or en == mgr.name:
            continue
        seen[en] = item[1]
        team.append(en)
        if scope == "entire":
            for c in children.get(en, []):
                stack.append([c, item[1] + 1])

    members = []
    unmapped = 0
    for en in team:
        e = info[en]
        if e.user_id:
            members.append({"employee": en, "name": e.employee_name, "user": e.user_id, "department": e.department, "level": seen[en]})
        else:
            unmapped = unmapped + 1

    sel = members
    dep = fd.get("department") or ""
    if dep:
        ok = False
        for m in members:
            if m["department"] == dep:
                ok = True
        if not ok:
            frappe.throw("Department is outside your team.", frappe.PermissionError)
        tmp = []
        for m in sel:
            if m["department"] == dep:
                tmp.append(m)
        sel = tmp
    emp_f = fd.get("employee") or ""
    if emp_f:
        tmp = []
        for m in sel:
            if m["employee"] == emp_f:
                tmp.append(m)
        if not tmp:
            frappe.throw("Employee is outside your team.", frappe.PermissionError)
        sel = tmp

    period = fd.get("period") or "month"
    basis = "assigned" if fd.get("basis") == "assigned" else "due"
    if period == "today":
        p_from = today
        p_to = today
    elif period == "week":
        p_from = U.add_days(today, -((today.weekday() + 1) % 7))
        p_to = U.add_days(p_from, 6)
    elif period == "month":
        p_from = U.get_first_day(today)
        p_to = U.get_last_day(today)
    elif period == "year":
        p_from = U.getdate(str(today.year) + "-01-01")
        p_to = U.getdate(str(today.year) + "-12-31")
    elif period == "custom":
        if not fd.get("from_date") or not fd.get("to_date"):
            frappe.throw("Please select both dates for the custom range.")
        p_from = U.getdate(fd.get("from_date"))
        p_to = U.getdate(fd.get("to_date"))
        if p_from > p_to or U.date_diff(p_to, p_from) > 3660:
            frappe.throw("Invalid custom range.")
    else:
        frappe.throw("Invalid period.")
    p_from = U.getdate(p_from)
    p_to = U.getdate(p_to)

    deps = []
    for m in members:
        if m["department"] and m["department"] not in deps:
            deps.append(m["department"])
    deps.sort()
    opts = []
    for m in members:
        opts.append({"employee": m["employee"], "name": m["name"], "department": m["department"], "level": m["level"]})

    msg = {"manager": mgr.employee_name, "scope": scope, "period": period, "basis": basis, "from": str(p_from), "to": str(p_to),
           "today": str(today), "team_size": len(members), "unmapped_members": unmapped, "selected": len(sel),
           "departments": deps, "employees": opts}

    users = []
    for m in sel:
        users.append(m["user"])
    if not users:
        msg["kpi"] = None
        msg["auto"] = None
        frappe.response["message"] = msg
    else:
        params = {"users": users, "today": today, "f": p_from, "t": p_to, "me": user}
        base = "t.allocated_to in %(users)s and t.status!='Cancelled'"
        pr = fd.get("priority") or ""
        if pr:
            if pr not in ("High", "Medium", "Low"):
                frappe.throw("Invalid priority.")
            params["pr"] = pr
            base = base + " and t.priority=%(pr)s"
        SCOPE_SQL = "(ifnull(t.assignment_rule,'')='' and ifnull(t.reference_type,'')!='Quotation')"
        AUTO_SQL = "(ifnull(t.assignment_rule,'')!='' or ifnull(t.reference_type,'')='Quotation')"
        cat = fd.get("category") or ""
        if cat == "manual":
            sw = base + " and " + SCOPE_SQL + " and ifnull(t.reference_type,'')=''"
        elif cat == "other":
            sw = base + " and " + SCOPE_SQL + " and ifnull(t.reference_type,'')!=''"
        elif cat == "":
            sw = base + " and " + SCOPE_SQL
        else:
            frappe.throw("Invalid category.")
        if basis == "due":
            PER = " and (t.date between %(f)s and %(t)s or (t.date is null and date(t.creation) between %(f)s and %(t)s))"
        else:
            PER = " and date(t.creation) between %(f)s and %(t)s"
        UNF = "t.status='Open' and ifnull(t.custom_progress_status,'')!='Completed'"
        COMP = "(t.status='Closed' or ifnull(t.custom_progress_status,'')='Completed')"
        PR_REV = "t.status='Open' and ifnull(t.custom_progress_status,'')='Completed' and ifnull(t.custom_manager_review_status,'')='Pending Review'"
        r0 = frappe.db.sql(
            "select count(*),"
            " sum(t.status='Open' and ifnull(t.custom_progress_status,'') in ('','Not Started')),"
            " sum(t.status='Open' and t.custom_progress_status='In Progress'),"
            " sum(t.status='Open' and t.custom_progress_status='Blocked'),"
            " sum(" + COMP + "),"
            " sum(t.status='Open' and ifnull(t.custom_progress_status,'')='Completed' and ifnull(t.custom_manager_review_status,'')!='Approved'),"
            " sum(t.status='Open' and ifnull(t.custom_manager_review_status,'')='Approved'),"
            " sum(t.status='Closed' and t.custom_completion_date is not null),"
            " sum(t.status='Closed' and t.custom_completion_date is null),"
            " sum(" + UNF + " and t.date < %(today)s)"
            " from `tabToDo` t where " + sw + PER, params)[0]
        k = {"total": U.cint(r0[0]), "pending": U.cint(r0[1]), "in_progress": U.cint(r0[2]), "blocked": U.cint(r0[3]),
             "completed": U.cint(r0[4]), "submitted": U.cint(r0[5]), "approved": U.cint(r0[6]), "closed_ts": U.cint(r0[7]),
             "closed_legacy": U.cint(r0[8]), "overdue_period": U.cint(r0[9])}
        r1 = frappe.db.sql(
            "select sum(" + UNF + " and t.date < %(today)s), sum(" + UNF + " and t.date = %(today)s),"
            " sum(" + PR_REV + " and ifnull(t.assigned_by, t.owner)=%(me)s), sum(" + PR_REV + " and ifnull(t.assigned_by, t.owner)!=%(me)s)"
            " from `tabToDo` t where " + sw, params)[0]
        k["overdue_backlog"] = U.cint(r1[0])
        k["due_today"] = U.cint(r1[1])
        k["review_mine"] = U.cint(r1[2])
        k["review_other"] = U.cint(r1[3])
        comp = frappe.db.sql("select t.name, t.date, t.custom_completion_date from `tabToDo` t where " + sw + PER + " and " + COMP +
                             " and t.custom_completion_date is not null limit 2000", params, as_dict=True)
        orig = {}
        if comp:
            nm = []
            for r in comp:
                nm.append(r.name)
            for v in frappe.db.sql("select v.docname, v.data from `tabVersion` v where v.ref_doctype='ToDo' and v.docname in %(nm)s"
                                   " and v.data like %(l)s order by v.creation asc", {"nm": nm, "l": '%["date",%'}, as_dict=True):
                if v.docname in orig:
                    continue
                for e in (json.loads(v.data or "{}") or {}).get("changed") or []:
                    if e[0] == "date" and v.docname not in orig:
                        orig[v.docname] = e[1] or ""
        on_time = 0
        late = 0
        no_deadline = 0
        for r in comp:
            due = r.date
            if r.name in orig:
                due = None
                p = str(orig[r.name]).split("-")
                if len(p) == 3 and len(p[2]) == 4:
                    due = U.getdate(p[2] + "-" + p[1] + "-" + p[0])
            if not due:
                no_deadline = no_deadline + 1
            elif U.getdate(r.custom_completion_date) <= U.getdate(due):
                on_time = on_time + 1
            else:
                late = late + 1
        k["on_time"] = on_time
        k["late"] = late
        k["no_deadline"] = no_deadline
        k["due_changed"] = len(orig)
        k["on_time_rate"] = round(100.0 * on_time / (on_time + late), 1) if (on_time + late) else None
        k["completion_rate"] = round(100.0 * k["completed"] / k["total"], 1) if k["total"] else None
        a = frappe.db.sql("select count(*), min(t.creation), avg(to_days(t.creation)) from `tabToDo` t where t.allocated_to in %(users)s"
                          " and t.status='Open' and " + AUTO_SQL, params)[0]
        auto = {"open": U.cint(a[0]), "oldest_age": None, "avg_age": None}
        if auto["open"]:
            auto["oldest_age"] = U.date_diff(today, U.getdate(a[1]))
            auto["avg_age"] = round((today.toordinal() + 365) - U.flt(a[2]), 1)
        msg["kpi"] = k
        msg["auto"] = auto
        frappe.response["message"] = msg
