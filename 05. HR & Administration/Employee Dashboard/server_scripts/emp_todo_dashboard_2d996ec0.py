# emp_todo_dashboard - Employee ToDo Dashboard API (Phase 8, Stages 8.2-8.3). READ-ONLY.
# section="overview" (default) -> KPIs ; section="tasks" -> paginated My Tasks list.
# Security: identity is ALWAYS frappe.session.user (browser-supplied users are ignored).
# All queries use frappe.get_list, which applies ToDo row permissions, PLUS allocated_to = session user.
U = frappe.utils
user = frappe.session.user
if not user or user == "Guest":
    frappe.throw("Please log in.", frappe.PermissionError)

fd = frappe.form_dict
today = U.getdate(U.nowdate())
period = fd.get("period") or "month"
basis = "assigned" if fd.get("basis") == "assigned" else "due"

if period == "today":
    p_from = today
    p_to = today
elif period == "week":
    p_from = U.add_days(today, -((today.weekday() + 1) % 7))  # week = Sunday..Saturday
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
    if p_from > p_to:
        frappe.throw("From date must be on or before To date.")
    if U.date_diff(p_to, p_from) > 3660:
        frappe.throw("Custom range is limited to 10 years.")
else:
    frappe.throw("Invalid period.")

p_from = U.getdate(p_from)
p_to = U.getdate(p_to)
yesterday = U.add_days(today, -1)

section = fd.get("section") or "overview"
if section in ("tasks", "board", "calendar", "performance", "activity"):
    # Every query is restricted to allocated_to = session user (a ToDo that user can always read).
    # Parameterised read-only SQL is used only to express nested OR filters. Fields are limited.
    AUTO_SQL = "(ifnull(t.assignment_rule,'')!='' or ifnull(t.reference_type,'')='Quotation')"
    SCOPE_SQL = "(ifnull(t.assignment_rule,'')='' and ifnull(t.reference_type,'')!='Quotation')"
    UNF_SQL = "t.status='Open' and ifnull(t.custom_progress_status,'')!='Completed'"
    params = {"u": user, "today": today, "f": p_from, "t": p_to}
    base = "t.allocated_to=%(u)s and t.status!='Cancelled'"
    # ---- shared filters (priority / category / progress / search / period) ----
    pr = fd.get("priority") or ""
    if pr:
        if pr not in ("High", "Medium", "Low"):
            frappe.throw("Invalid priority.")
        params["pr"] = pr
        base = base + " and t.priority=%(pr)s"
    cat = fd.get("category") or ""
    if cat:
        CATS = {"manual": SCOPE_SQL + " and ifnull(t.reference_type,'')=''",
                "other": SCOPE_SQL + " and ifnull(t.reference_type,'')!=''",
                "auto": AUTO_SQL}
        if cat not in CATS:
            frappe.throw("Invalid category.")
        base = base + " and " + CATS[cat]
    prog = fd.get("progress") or ""
    PROG = {"Not Started": "t.status='Open' and ifnull(t.custom_progress_status,'') in ('','Not Started')",
            "In Progress": "t.status='Open' and t.custom_progress_status='In Progress'",
            "Blocked": "t.status='Open' and t.custom_progress_status='Blocked'",
            "Completed": "(t.status='Closed' or ifnull(t.custom_progress_status,'')='Completed')"}
    if prog and prog not in PROG:
        frappe.throw("Invalid progress status.")
    q = (fd.get("search") or "").strip()[:100]
    if q:
        params["q"] = "%" + q.replace("%", "").replace("_", "") + "%"
        base = base + " and (t.name like %(q)s or t.custom_task_title like %(q)s or t.description like %(q)s or t.reference_name like %(q)s)"
    base_np = base
    if section != "calendar" and fd.get("use_period") in (1, "1", True, "true"):
        if basis == "due":
            base = base + " and (t.date between %(f)s and %(t)s or (t.date is null and date(t.creation) between %(f)s and %(t)s))"
        else:
            base = base + " and date(t.creation) between %(f)s and %(t)s"

    FIELDS = ("select t.name, t.custom_task_title, t.description, t.custom_task_category, t.priority, t.assigned_by, t.owner,"
              " t.creation, t.date, t.custom_progress_status, t.custom_progress_percent, t.status, t.reference_type,"
              " t.reference_name, t.assignment_rule, t.custom_manager_review_status, t.custom_blocked_reason from `tabToDo` t where ")
    ORDER = " order by (t.status='Open') desc, (t.date is null), t.date asc, t.creation desc"
    names = {}

    def shape(r, today, user, names):
        U = frappe.utils
        auto_t = bool(r.assignment_rule) or r.reference_type == "Quotation"
        c = "Automatic Assignment" if r.assignment_rule else ("Quotation Assignment" if r.reference_type == "Quotation" else (
            r.custom_task_category or ("Other Linked Task" if r.reference_type else "Manual Task")))
        by = r.assigned_by or r.owner
        if by and by not in names:
            names[by] = frappe.db.get_value("User", by, "full_name") or by
        ps = r.custom_progress_status or "Not Started"
        unfinished = r.status == "Open" and ps != "Completed"
        od = U.date_diff(today, r.date) if (r.date and unfinished and not auto_t and U.getdate(r.date) < today) else 0
        return {
            "name": r.name, "title": r.custom_task_title or U.strip_html(r.description or "")[:140] or r.name,
            "category": c, "auto": auto_t, "priority": r.priority,
            "assigned_by": names.get(by), "assigned_on": str(U.getdate(r.creation)), "due": str(r.date) if r.date else None,
            "progress": ps, "pct": U.flt(r.custom_progress_percent), "status": r.status,
            "review": r.custom_manager_review_status, "blocked_reason": r.custom_blocked_reason,
            "ref_type": r.reference_type, "ref_name": r.reference_name, "overdue_days": od,
            "age": U.date_diff(today, U.getdate(r.creation)) if auto_t else None,
            "can_act": (r.status == "Open" and not auto_t and ps != "Completed" and (r.custom_manager_review_status or "") not in ("Pending Review", "Approved")),
        }

    if section == "tasks":
        QF = {
            "all": "1=1", "scope": SCOPE_SQL,
            "pending": SCOPE_SQL + " and " + PROG["Not Started"],
            "in_progress": SCOPE_SQL + " and " + PROG["In Progress"],
            "blocked": SCOPE_SQL + " and " + PROG["Blocked"],
            "completed": SCOPE_SQL + " and " + PROG["Completed"],
            "overdue": SCOPE_SQL + " and " + UNF_SQL + " and t.date < %(today)s",
            "due_today": SCOPE_SQL + " and " + UNF_SQL + " and t.date = %(today)s",
            "auto": AUTO_SQL,
        }
        qf = fd.get("qf") or "all"
        if qf not in QF:
            frappe.throw("Invalid filter.")
        where = base + " and " + QF[qf] + ((" and " + PROG[prog]) if prog else "")
        if fd.get("comp_from") and fd.get("comp_to"):
            params["c1"] = U.getdate(fd.get("comp_from"))
            params["c2"] = U.getdate(fd.get("comp_to"))
            where = where + " and date(t.custom_completion_date) between %(c1)s and %(c2)s"
        page = max(1, U.cint(fd.get("page") or 1))
        params["off"] = (page - 1) * 25
        total = frappe.db.sql("select count(*) from `tabToDo` t where " + where, params)[0][0]
        rows = frappe.db.sql(FIELDS + where + ORDER + " limit 25 offset %(off)s", params, as_dict=True)
        out = []
        for r in rows:
            out.append(shape(r, today, user, names))
        frappe.response["message"] = {"total": total, "page": page, "page_size": 25, "rows": out, "qf": qf,
                                       "from": str(p_from), "to": str(p_to), "basis": basis}

    elif section == "board":
        COLS = {"ns": PROG["Not Started"], "ip": PROG["In Progress"], "bl": PROG["Blocked"], "cp": PROG["Completed"]}
        sw = base + " and " + SCOPE_SQL + ((" and " + PROG[prog]) if prog else "")
        cnt = frappe.db.sql(
            "select sum(" + COLS["ns"] + "), sum(" + COLS["ip"] + "), sum(" + COLS["bl"] + "), sum(" + COLS["cp"] + "),"
            " sum(t.status='Open' and ifnull(t.custom_progress_status,'')='Completed' and ifnull(t.custom_manager_review_status,'')!='Approved'),"
            " sum(t.status='Open' and ifnull(t.custom_manager_review_status,'')='Approved'),"
            " sum(t.status='Closed'), sum(" + UNF_SQL + " and t.date < %(today)s)"
            " from `tabToDo` t where " + sw, params)[0]
        counts = {"ns": U.cint(cnt[0]), "ip": U.cint(cnt[1]), "bl": U.cint(cnt[2]), "cp": U.cint(cnt[3]),
                  "submitted": U.cint(cnt[4]), "approved": U.cint(cnt[5]), "closed": U.cint(cnt[6]), "overdue": U.cint(cnt[7])}
        aw = base + " and " + AUTO_SQL + " and t.status='Open'"
        counts["auto"] = U.cint(frappe.db.sql("select count(*) from `tabToDo` t where " + aw, params)[0][0])
        col = fd.get("col") or ""
        if col and col not in ("ns", "ip", "bl", "cp", "auto"):
            frappe.throw("Invalid column.")
        page = max(1, U.cint(fd.get("page") or 1))
        params["off"] = (page - 1) * 12
        cards = {}
        for c in (["ns", "ip", "bl", "cp", "auto"] if not col else [col]):
            if c == "auto":
                w = aw
                order = " order by t.creation asc"
            else:
                w = sw + " and " + COLS[c]
                order = (" order by (t.status='Open') desc, (ifnull(t.custom_manager_review_status,'')='Pending Review') desc, t.modified desc"
                         if c == "cp" else ORDER)
            rows = frappe.db.sql(FIELDS + w + order + " limit 12 offset %(off)s", params, as_dict=True)
            lst = []
            for r in rows:
                lst.append(shape(r, today, user, names))
            cards[c] = lst
        frappe.response["message"] = {"counts": counts, "cards": cards, "page": page, "page_size": 12,
                                       "from": str(p_from), "to": str(p_to), "basis": basis}


    elif section == "performance":
        # Manual + Other Linked only (automatic/Quotation and Cancelled excluded). Period applies to KPIs and
        # distributions; trend and backlog are all-dates. Progress filter is ignored here (it is what we measure).
        if cat == "auto":
            frappe.throw("Performance excludes automatic/Quotation assignments. Choose Manual or Other Linked.")
        pw = base + " and " + SCOPE_SQL  # base already contains the period because the client sends use_period=1
        nw = base_np + " and " + SCOPE_SQL
        r0 = frappe.db.sql(
            "select count(*), sum(" + PROG["Completed"] + "), sum(" + PROG["Not Started"] + "), sum(" + PROG["In Progress"] + "),"
            " sum(" + PROG["Blocked"] + "),"
            " sum(t.status='Open' and ifnull(t.custom_progress_status,'')='Completed' and ifnull(t.custom_manager_review_status,'')!='Approved'),"
            " sum(t.status='Open' and ifnull(t.custom_manager_review_status,'')='Approved'),"
            " sum(t.status='Closed' and t.custom_completion_date is not null), sum(t.status='Closed' and t.custom_completion_date is null)"
            " from `tabToDo` t where " + pw, params)[0]
        k = {"total": U.cint(r0[0]), "completed": U.cint(r0[1]), "not_started": U.cint(r0[2]), "in_progress": U.cint(r0[3]),
             "blocked": U.cint(r0[4]), "submitted": U.cint(r0[5]), "approved": U.cint(r0[6]), "closed_ts": U.cint(r0[7]),
             "closed_legacy": U.cint(r0[8])}
        k["pending"] = k["not_started"] + k["in_progress"] + k["blocked"]
        k["completion_rate"] = round(100.0 * k["completed"] / k["total"], 1) if k["total"] else None
        k["overdue_backlog"] = U.cint(frappe.db.sql("select count(*) from `tabToDo` t where " + nw + " and " + UNF_SQL
                                                    + " and t.date < %(today)s", params)[0][0])
        comp = frappe.db.sql("select t.name, t.date, t.creation, t.custom_completion_date from `tabToDo` t where " + pw +
                             " and " + PROG["Completed"] + " and t.custom_completion_date is not null limit 1000", params, as_dict=True)
        hist = {}
        if comp:
            nm = []
            for r in comp:
                nm.append(r.name)
            vrows = frappe.db.sql("select v.docname, v.creation, v.data from `tabVersion` v where v.ref_doctype='ToDo'"
                                  " and v.docname in %(nm)s and (v.data like %(l1)s or v.data like %(l2)s) order by v.creation asc",
                                  {"nm": nm, "l1": '%"date"%', "l2": '%custom_progress_status%'}, as_dict=True)
            for v in vrows:
                h = hist.setdefault(v.docname, {"orig": None, "changed": False, "first_done": None})
                ch = (json.loads(v.data or "{}") or {}).get("changed") or []
                for e in ch:
                    if e[0] == "date" and not h["changed"]:
                        h["changed"] = True
                        h["orig"] = e[1]
                    if e[0] == "custom_progress_status" and e[2] == "Completed" and not h["first_done"]:
                        h["first_done"] = v.creation
        on_time = 0
        late = 0
        no_deadline = 0
        due_changed = 0
        durations = []
        for r in comp:
            h = hist.get(r.name) or {"orig": None, "changed": False, "first_done": None}
            due = r.date
            if h["changed"]:
                due_changed = due_changed + 1
                o = h["orig"]
                due = None
                if o:
                    p = str(o).split("-")
                    if len(p) == 3 and len(p[2]) == 4:
                        due = U.getdate(p[2] + "-" + p[1] + "-" + p[0])
                    elif len(p) == 3 and len(p[0]) == 4:
                        due = U.getdate(o)
            if not due:
                no_deadline = no_deadline + 1
            elif U.getdate(r.custom_completion_date) <= U.getdate(due):
                on_time = on_time + 1
            else:
                late = late + 1
            fdone = h["first_done"] or r.custom_completion_date
            durations.append(U.time_diff_in_hours(fdone, r.creation) / 24.0)
        k["with_timestamp"] = len(comp)
        k["on_time"] = on_time
        k["late"] = late
        k["no_deadline"] = no_deadline
        k["due_changed"] = due_changed
        k["on_time_rate"] = round(100.0 * on_time / (on_time + late), 1) if (on_time + late) else None
        k["avg_days"] = round(sum(durations) / len(durations), 1) if durations else None
        k["insufficient"] = k["closed_legacy"] + no_deadline
        wk0 = U.add_days(today, -((today.weekday() + 1) % 7) - 7 * 11)
        params["wk0"] = wk0
        crows = frappe.db.sql("select date(t.custom_completion_date) from `tabToDo` t where " + nw + " and " + PROG["Completed"] +
                              " and t.custom_completion_date >= %(wk0)s", params)
        weeks = []
        for i in range(12):
            ws = U.add_days(wk0, 7 * i)
            weeks.append({"from": str(ws), "to": str(U.add_days(ws, 6)), "count": 0})
        for c in crows:
            idx = U.cint(U.date_diff(c[0], wk0) / 7)
            if 0 <= idx < 12:
                weeks[idx]["count"] = weeks[idx]["count"] + 1
        legacy_all = U.cint(frappe.db.sql("select count(*) from `tabToDo` t where " + nw + " and t.status='Closed'"
                                          " and t.custom_completion_date is null", params)[0][0])
        frappe.response["message"] = {"kpi": k, "weeks": weeks, "legacy_all_dates": legacy_all,
                                       "from": str(p_from), "to": str(p_to), "basis": basis, "today": str(today)}

    elif section == "activity":
        aw2 = "t.allocated_to=%(u)s and t.status!='Cancelled' and " + (AUTO_SQL if cat == "auto" else SCOPE_SQL)
        if pr:
            aw2 = aw2 + " and t.priority=%(pr)s"
        if q:
            aw2 = aw2 + " and (t.name like %(q)s or t.custom_task_title like %(q)s or t.description like %(q)s)"
        page = max(1, U.cint(fd.get("page") or 1))
        params["off"] = (page - 1) * 20
        params["closed1"] = '%["status","Open","Closed"]%'
        params["closed2"] = '%["status", "Open", "Closed"]%'
        sql = ("select * from ("
               " select 'assigned' ev, t.creation ts, ifnull(t.assigned_by, t.owner) actor, t.name todo, '' remarks from `tabToDo` t where " + aw2 +
               " union all"
               " select 'comment' ev, c.creation ts, c.owner actor, t.name todo, c.content remarks from `tabComment` c"
               " join `tabToDo` t on t.name=c.reference_name where c.reference_doctype='ToDo' and c.comment_type='Info' and " + aw2 +
               " union all"
               " select 'closed' ev, v.creation ts, v.owner actor, t.name todo, '' remarks from `tabVersion` v"
               " join `tabToDo` t on t.name=v.docname where v.ref_doctype='ToDo' and (v.data like %(closed1)s or v.data like %(closed2)s) and " + aw2 +
               ") x order by ts desc limit 21 offset %(off)s")
        rows = frappe.db.sql(sql, params, as_dict=True)
        more = len(rows) > 20
        titles = {}
        out = []
        for r in rows[:20]:
            if r.todo not in titles:
                tt = frappe.db.get_value("ToDo", r.todo, ["custom_task_title", "description"], as_dict=True) or {}
                titles[r.todo] = tt.get("custom_task_title") or U.strip_html(tt.get("description") or "")[:120] or r.todo
            if r.actor and r.actor not in names:
                names[r.actor] = frappe.db.get_value("User", r.actor, "full_name") or r.actor
            txt = U.strip_html(r.remarks or "")
            ev = {"assigned": "Task Assigned", "closed": "Formally Closed"}.get(r.ev)
            if r.ev == "comment":
                ev = "Activity"
                if txt.startswith("Started / resumed"):
                    ev = "Started / Resumed"
                elif txt.startswith("Progress updated"):
                    ev = "Progress Updated"
                elif txt.startswith("Blocked:"):
                    ev = "Blocker Reported"
                elif txt.startswith("Marked completed - sent for review"):
                    ev = "Submitted for Review"
                elif txt.startswith("Marked completed"):
                    ev = "Completed"
                elif txt.startswith("Approved"):
                    ev = "Approved"
                elif txt.startswith("Returned"):
                    ev = "Returned"
                elif txt.startswith("Reset"):
                    ev = "Reset to Not Started"
            out.append({"event": ev, "ts": str(r.ts), "actor": names.get(r.actor), "is_me": r.actor == user,
                        "todo": r.todo, "title": titles[r.todo], "remarks": txt[:500] if r.ev == "comment" else ""})
        frappe.response["message"] = {"rows": out, "page": page, "more": more}

    else:  # calendar - only the visible range, actual due date
        c_from = U.getdate(fd.get("cal_from") or today)
        c_to = U.getdate(fd.get("cal_to") or today)
        if c_from > c_to or U.date_diff(c_to, c_from) > 45:
            frappe.throw("Invalid calendar range.")
        params["cf"] = c_from
        params["ct"] = c_to
        cw = base + ((" and " + PROG[prog]) if prog else "") + ("" if cat == "auto" else " and " + SCOPE_SQL)
        rows = frappe.db.sql(FIELDS + cw + " and t.date between %(cf)s and %(ct)s order by t.date asc,"
                             " field(t.priority,'High','Medium','Low'), t.creation asc limit 500", params, as_dict=True)
        items = []
        for r in rows:
            items.append(shape(r, today, user, names))
        total_in_range = frappe.db.sql("select count(*) from `tabToDo` t where " + cw + " and t.date between %(cf)s and %(ct)s", params)[0][0]
        nd_where = cw + " and t.date is null and " + UNF_SQL
        nd_total = frappe.db.sql("select count(*) from `tabToDo` t where " + nd_where, params)[0][0]
        nd = []
        for r in frappe.db.sql(FIELDS + nd_where + " order by t.creation desc limit 20", params, as_dict=True):
            nd.append(shape(r, today, user, names))
        auto_in_range = 0
        if cat != "auto":
            auto_in_range = frappe.db.sql("select count(*) from `tabToDo` t where t.allocated_to=%(u)s and t.status='Open' and "
                                          + AUTO_SQL + " and t.date between %(cf)s and %(ct)s", params)[0][0]
        frappe.response["message"] = {"items": items, "total": total_in_range, "truncated": total_in_range > len(items),
                                       "no_due": nd, "no_due_total": nd_total, "auto_in_range": auto_in_range,
                                       "cal_from": str(c_from), "cal_to": str(c_to), "today": str(today)}
else:
    ME = [["ToDo", "allocated_to", "=", user]]
    SCOPE = ME + [["ToDo", "assignment_rule", "is", "not set"], ["ToDo", "reference_type", "!=", "Quotation"],
                  ["ToDo", "status", "!=", "Cancelled"]]
    UNFINISHED = [["ToDo", "status", "=", "Open"], ["ToDo", "custom_progress_status", "!=", "Completed"]]
    if basis == "due":
        PERIODS = [[["ToDo", "date", "between", [p_from, p_to]]],
                   [["ToDo", "date", "is", "not set"], ["ToDo", "creation", "between", [p_from, p_to]]]]
    else:
        PERIODS = [[["ToDo", "creation", "between", [p_from, p_to]]]]


    def count(filters, or_filters=None):
        r = frappe.get_list("ToDo", filters=filters, or_filters=or_filters, fields=["count(name) as n"],
                            order_by="", limit_page_length=1)
        return int(r[0].n) if r else 0


    # ---- Main KPIs (Manual + Other Linked, excluding Cancelled) ----
    k = {"total": 0, "pending": 0, "in_progress": 0, "blocked": 0, "completed": 0,
         "submitted_open": 0, "approved_open": 0, "closed": 0}
    for pf in PERIODS:
        rows = frappe.get_list("ToDo", filters=SCOPE + pf,
                               fields=["status", "custom_progress_status", "custom_manager_review_status", "count(name) as n"],
                               group_by="status, custom_progress_status, custom_manager_review_status",
                               order_by="", limit_page_length=100)
        for r in rows:
            n = int(r.n)
            ps = r.custom_progress_status or "Not Started"
            k["total"] = k["total"] + n
            if r.status == "Closed":
                k["closed"] = k["closed"] + n
                k["completed"] = k["completed"] + n
            elif ps == "Completed":
                k["completed"] = k["completed"] + n
                if r.custom_manager_review_status == "Approved":
                    k["approved_open"] = k["approved_open"] + n
                else:
                    k["submitted_open"] = k["submitted_open"] + n
            elif ps == "Blocked":
                k["blocked"] = k["blocked"] + n
            elif ps == "In Progress":
                k["in_progress"] = k["in_progress"] + n
            else:
                k["pending"] = k["pending"] + n

    k["closed_legacy"] = 0
    for pf in PERIODS:
        k["closed_legacy"] = k["closed_legacy"] + count(SCOPE + pf + [["ToDo", "status", "=", "Closed"], ["ToDo", "custom_completion_date", "is", "not set"]])
    k["no_due_date_fallback"] = count(SCOPE + PERIODS[1]) if basis == "due" else 0

    # Overdue in selected period (unfinished, already past due)
    if basis == "due":
        k["overdue_period"] = count(SCOPE + UNFINISHED + [["ToDo", "date", "between", [p_from, min(p_to, yesterday)]]]) if p_from <= yesterday else 0
    else:
        k["overdue_period"] = count(SCOPE + UNFINISHED + PERIODS[0] + [["ToDo", "date", "<", today]])

    # Period-independent
    k["overdue_backlog"] = count(SCOPE + UNFINISHED + [["ToDo", "date", "<", today]])
    k["due_today"] = count(SCOPE + UNFINISHED + [["ToDo", "date", "=", today]])

    # ---- Automatic / Quotation assignments (separate; never in the KPIs above) ----
    AUTO_OR = [["ToDo", "assignment_rule", "is", "set"], ["ToDo", "reference_type", "=", "Quotation"]]
    a = frappe.get_list("ToDo", filters=ME + [["ToDo", "status", "=", "Open"]], or_filters=AUTO_OR,
                        fields=["count(name) as n", "min(creation) as oldest", "avg(to_days(creation)) as avgd"],
                        order_by="", limit_page_length=1)
    auto = {"open": 0, "avg_age": None, "oldest_age": None}
    if a and int(a[0].n):
        auto["open"] = int(a[0].n)
        auto["oldest_age"] = U.date_diff(today, U.getdate(a[0].oldest))
        auto["avg_age"] = round((today.toordinal() + 365) - U.flt(a[0].avgd), 1)
    auto["open_with_rule"] = count(ME + [["ToDo", "status", "=", "Open"], ["ToDo", "assignment_rule", "is", "set"]])

    emp = []
    try:
        emp = frappe.get_list("Employee", filters={"user_id": user, "status": "Active"}, fields=["designation"], limit_page_length=1)
    except Exception:
        emp = []
    frappe.response["message"] = {
        "user": user,
        "full_name": frappe.db.get_value("User", user, "full_name"),
        "designation": emp[0].designation if emp else None,
        "period": period, "basis": basis, "from": str(p_from), "to": str(p_to), "today": str(today),
        "kpi": k, "auto": auto,
    }
