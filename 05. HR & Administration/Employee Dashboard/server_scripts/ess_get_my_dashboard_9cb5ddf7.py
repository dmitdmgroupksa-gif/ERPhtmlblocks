# ESS dashboard API - returns ONLY the logged-in employee's non-financial data
U = frappe.utils
SALES = ["Sales Executive","Sales Co-Ordinator","Sales Coordinator","Sales Representaive","Sales Representative","Sales Engineer","Business Development Manager","BDM - Rental Division","Asst. Sales Manager","Regional Sales Manager","showroom sales","Sales & Designing Executive"]
DRIVER = ["Driver","Light Driver"]
user = frappe.session.user
if not user or user == "Guest":
    frappe.throw("Not permitted", frappe.PermissionError)

out = {"ok": False, "today": U.today()}
F = ["name","employee_name","image","designation","department","branch","company","status","grade","reports_to","custom_employee_nationality","custom_nationality","date_of_joining","custom_contract_type","agreement_expiry_date","expiry_date","passport_no","passport_expiry_date","iqama__visa_number","custom_saudi_id","insurance_company","insurance_status","default_shift","holiday_list","person_to_be_contacted","emergency_phone_number","relation"]
rows = frappe.get_all("Employee", filters={"user_id": user}, fields=F, limit_page_length=2)
if not rows:
    out["reason"] = "no_employee"
    frappe.response["message"] = out
elif len(rows) > 1:
    out["reason"] = "multiple_employees"
    frappe.response["message"] = out
elif rows[0].status != "Active":
    out["reason"] = "inactive"
    frappe.response["message"] = out
else:
    try:
        e = rows[0]
        emp = e.name
        today = U.getdate(U.today())

        def mask(v, keep):
            v = U.cstr(v).strip()
            if not v:
                return None
            return "••••" + v[-keep:]

        def days_to(d):
            if not d:
                return None
            return U.date_diff(d, today)

        variant = "standard"
        if e.designation in DRIVER:
            variant = "driver"
        elif e.designation in SALES:
            variant = "sales"
        dkey = frappe.form_dict.get("dashboard")
        if dkey:
            DALLOW = {"employee": ["Employee", "Employee Self Service"], "sales": ["Salesperson Dashboard User"], "driver": ["Driver Dashboard User"]}
            if dkey not in DALLOW:
                frappe.throw("Unknown dashboard", frappe.PermissionError)
            dok = False
            for rr in DALLOW[dkey]:
                if frappe.db.exists("Has Role", {"parent": user, "parenttype": "User", "role": rr}):
                    dok = True
            if not dok:
                frappe.throw("You do not have access to this dashboard.", frappe.PermissionError)
            variant = {"employee": "standard", "sales": "sales", "driver": "driver"}[dkey]

        mgr = None
        if e.reports_to:
            m = frappe.db.get_value("Employee", e.reports_to, ["employee_name","designation"], as_dict=True)
            if m:
                mgr = {"name": m.employee_name, "designation": m.designation}

        shifts = frappe.get_all("Employees Shift", filters={"parent": emp, "parenttype": "Employee"}, fields=["shift_type","shift_start","shift_end","duty_hrs"], limit_page_length=5)
        shift_txt = e.default_shift
        if not shift_txt and shifts:
            s = shifts[0]
            shift_txt = U.cstr(s.shift_type or "Shift") + " " + U.cstr(s.shift_start)[:5] + "-" + U.cstr(s.shift_end)[:5]

        out["profile"] = {
            "employee": emp, "name": e.employee_name, "image": e.image, "designation": e.designation,
            "department": e.department, "branch": e.branch, "company": e.company, "status": e.status,
            "grade": e.grade, "manager": mgr, "nationality": e.custom_employee_nationality or e.custom_nationality,
            "date_of_joining": e.date_of_joining, "service_days": days_to(e.date_of_joining) and -days_to(e.date_of_joining),
            "contract_type": e.custom_contract_type, "contract_end": e.agreement_expiry_date, "shift": shift_txt,
            "emergency": {"name": e.person_to_be_contacted, "relation": e.relation, "phone": e.emergency_phone_number} if (e.person_to_be_contacted or e.emergency_phone_number) else None
        }
        out["variant"] = variant

        docs = []
        docs.append({"doc": ("National ID" if (e.custom_employee_nationality or e.custom_nationality) == "Saudi Arabia" else "Iqama / Residence Permit"), "ref": mask(e.iqama__visa_number or e.custom_saudi_id, 4), "expiry": e.expiry_date, "days": days_to(e.expiry_date), "alert": True})
        docs.append({"doc": "Passport", "ref": mask(e.passport_no, 3), "expiry": e.passport_expiry_date, "days": days_to(e.passport_expiry_date), "alert": True})
        docs.append({"doc": "Employment Contract", "ref": e.custom_contract_type, "expiry": e.agreement_expiry_date, "days": days_to(e.agreement_expiry_date), "alert": True})
        docs.append({"doc": "Medical Insurance", "ref": e.insurance_company, "expiry": None, "days": None, "alert": False, "note": "Expiry not verified"})
        out["documents"] = docs

        # leave balances from Leave Allocation + Leave Ledger Entry
        allocs = frappe.get_all("Leave Allocation", filters={"employee": emp, "docstatus": 1, "from_date": ["<=", today], "to_date": [">=", today]}, fields=["leave_type","from_date","to_date","total_leaves_allocated"], limit_page_length=20)
        leaves = []
        for a in allocs:
            r = frappe.db.sql("select coalesce(sum(leaves),0) from `tabLeave Ledger Entry` where employee=%(e)s and leave_type=%(t)s and docstatus=1 and from_date>=%(f)s and to_date<=%(to)s", {"e": emp, "t": a.leave_type, "f": a.from_date, "to": a.to_date})
            bal = U.flt(r[0][0]) if r else 0
            leaves.append({"type": a.leave_type, "allocated": U.flt(a.total_leaves_allocated), "balance": bal, "to_date": a.to_date})
        out["leaves"] = leaves
        pend = frappe.get_all("Leave Application", filters={"employee": emp, "status": "Open", "docstatus": ["<", 2]}, fields=["name","leave_type","from_date","to_date","total_leave_days"], order_by="from_date asc", limit_page_length=10)
        out["pending_leave"] = pend

        # attendance this month
        first = U.get_first_day(today)
        att = frappe.db.sql("select status, count(*) from `tabAttendance` where employee=%(e)s and docstatus=1 and attendance_date between %(f)s and %(t)s group by status", {"e": emp, "f": first, "t": today})
        a = {}
        for row in att:
            a[row[0]] = row[1]
        late = frappe.db.count("Attendance", {"employee": emp, "docstatus": 1, "late_entry": 1, "attendance_date": ["between", [first, today]]})
        att_n = frappe.db.count("Attendance", {"employee": emp, "docstatus": 1, "attendance_date": ["between", [first, today]]})
        ckd = frappe.db.sql("select count(distinct date(time)) from `tabEmployee Checkin` where employee=%(e)s and time>=%(f)s", {"e": emp, "f": first})
        out["attendance"] = {"from": first, "to": today, "by_status": a, "late": late, "records": att_n, "checkin_days": ckd[0][0] if ckd else 0}
        # month-to-date attendance cards: distinct dates, submitted records only (docstatus 1), 1st of month to today
        mt = frappe.db.sql("""select
            count(distinct case when status in ('Present','Work From Home','Half Day') then attendance_date end),
            count(distinct case when status = 'On Leave' then attendance_date end),
            count(distinct case when status = 'Half Day' and ifnull(leave_application, '') != '' then attendance_date end),
            count(distinct case when late_entry = 1 and status in ('Present','Work From Home','Half Day') then attendance_date end),
            count(distinct case when status != 'On Leave' then attendance_date end)
            from `tabAttendance` where employee=%(e)s and docstatus=1 and attendance_date between %(f)s and %(t)s""", {"e": emp, "f": first, "t": today})[0]
        out["attendance"]["mtd"] = {"present_days": mt[0], "leave_days": U.flt(mt[1]) + 0.5 * U.flt(mt[2]), "late_days": mt[3], "processed": 1 if mt[4] else 0}

        lc = frappe.get_all("Employee Checkin", filters={"employee": emp}, fields=["time","log_type"], order_by="time desc", limit_page_length=1)
        out["checkin"] = {"last": lc[0].time if lc else None, "log_type": lc[0].log_type if lc else None, "month_count": frappe.db.count("Employee Checkin", {"employee": emp, "time": [">=", first]})}
        # tasks
        tasks = []
        dt = frappe.db.sql("select p.name, c.task_name, c.end_date, c.status from `tabDaily task management - child table` c join `tabDaily Task Management` p on c.parent=p.name where p.employee=%(e)s and p.docstatus<2 and coalesce(c.status,'') not in ('Completed','Cancelled') order by c.end_date asc limit 10", {"e": emp}, as_dict=True)
        for t in dt:
            tasks.append({"src": "Daily Task", "doctype": "Daily Task Management", "name": t.name, "title": t.task_name, "due": t.end_date, "status": t.status or "Open", "overdue": bool(t.end_date and U.getdate(t.end_date) < today)})
        et = frappe.get_all("Employee Task Management", filters={"employee": emp, "status": ["in", ["Open","Incomplete","Extended"]]}, fields=["name","task_category","date","status"], order_by="date asc", limit_page_length=10)
        for t in et:
            tasks.append({"src": "Assigned Task", "doctype": None, "name": t.name, "title": t.task_category or "Assigned task", "due": t.date, "status": t.status, "overdue": bool(t.date and U.getdate(t.date) < today)})
        out["tasks"] = tasks

        tr = frappe.get_all("Employee Training Progress", filters={"employee": emp}, fields=["training_title","mandatory","status","due_date","completed_on"], order_by="due_date asc", limit_page_length=20)
        out["training"] = tr

        it = frappe.get_all("IT Help Desk Request", filters={"employee": emp, "docstatus": ["<", 2], "status": ["not in", ["Resolved","Rejected"]]}, fields=["name","subject","status","date"], order_by="date desc", limit_page_length=10)
        out["it_requests"] = it

        out["assets"] = frappe.get_all("Asset", filters={"custodian": emp, "docstatus": 1}, fields=["asset_name","asset_category","location"], limit_page_length=20)

        deps = frappe.get_all("Health Insurance - Child Table", filters={"parent": emp, "parenttype": "Employee"}, fields=["dependent_name","relation"], limit_page_length=20)
        if not deps:
            deps = frappe.get_all("Employee Ticket Dependents", filters={"parent": emp, "parenttype": "Employee"}, fields=["dependent_full_name as dependent_name"], limit_page_length=20)
        out["dependents"] = deps

        out["memos"] = None  # disabled: no reliable publication/audience rule on DM Official Memo
        # ---- My Tasks period (dates only from browser; identity from session) ----
        pf = frappe.form_dict.get("from_date")
        pt = frappe.form_dict.get("to_date")
        try:
            p_from = U.getdate(pf) if pf else U.get_first_day(today)
            p_to = U.getdate(pt) if pt else U.get_last_day(today)
        except Exception:
            p_from = U.get_first_day(today)
            p_to = U.get_last_day(today)
        if p_to < p_from or U.date_diff(p_to, p_from) > 366:
            p_from = U.get_first_day(today)
            p_to = U.get_last_day(today)
        items = []
        seen = {}
        dtm = frappe.db.sql("select p.name as parent, c.task_name, coalesce(c.end_date, p.date) as due, c.status from `tabDaily task management - child table` c join `tabDaily Task Management` p on c.parent=p.name where p.employee=%(e)s and p.docstatus<2 and coalesce(c.status,'')<>'Cancelled' and coalesce(c.end_date, p.date) between %(f)s and %(t)s order by due desc limit 150", {"e": emp, "f": p_from, "t": p_to}, as_dict=True)
        for t in dtm:
            seen["Daily Task Management::" + t.parent] = 1
            items.append({"source": "Daily Task", "doctype": "Daily Task Management", "name": t.parent, "title": t.task_name, "due": t.due, "priority": None, "done": (t.status == "Completed"), "status": t.status or "Open"})
        etm = frappe.get_all("Employee Task Management", filters={"employee": emp, "status": ["!=", "Cancelled"], "date": ["between", [p_from, p_to]]}, fields=["name","task_category","date","status"], order_by="date desc", limit_page_length=100)
        for t in etm:
            seen["Employee Task Management::" + t.name] = 1
            items.append({"source": "Assigned Task", "doctype": None, "name": t.name, "title": t.task_category or "Assigned task", "due": t.date, "priority": None, "done": (t.status == "Complete"), "status": t.status})
        todos = frappe.db.sql("select name, description, date, priority, status, reference_type, reference_name from `tabToDo` where allocated_to=%(u)s and status in ('Open','Closed') and date between %(f)s and %(t)s order by date desc limit 150", {"u": user, "f": p_from, "t": p_to}, as_dict=True)
        undated = frappe.db.sql("select name, description, date, priority, status, reference_type, reference_name from `tabToDo` where allocated_to=%(u)s and status='Open' and date is null order by creation desc limit 25", {"u": user}, as_dict=True)
        dup = 0
        for t in todos + undated:
            if t.reference_type and (U.cstr(t.reference_type) + "::" + U.cstr(t.reference_name)) in seen:
                dup = dup + 1
                continue
            txt = frappe.utils.strip_html(U.cstr(t.description))[:160]
            items.append({"source": "ToDo", "doctype": "ToDo", "name": t.name, "title": txt or "ToDo", "due": t.date, "priority": t.priority, "done": (t.status == "Closed"), "status": t.status, "ref": (t.reference_type + " " + U.cstr(t.reference_name)) if t.reference_type else None})
        elig = 0
        comp = 0
        openc = 0
        over = 0
        for it in items:
            d = U.getdate(it["due"]) if it["due"] else None
            it["overdue"] = bool((not it["done"]) and d and d < today)
            if it["done"]:
                comp = comp + 1
            else:
                openc = openc + 1
            if it["overdue"]:
                over = over + 1
            if d and (it["done"] or d <= today):
                elig = elig + 1
        done_elig = len([1 for it in items if it["done"] and it["due"] and (U.getdate(it["due"]) <= today or it["done"])])
        rate = None
        if elig:
            rate = round(done_elig * 100.0 / elig, 1)
        out["task_period"] = {"from": p_from, "to": p_to, "items": items[:250], "completed": comp, "open": openc, "overdue": over, "eligible": elig, "eligible_completed": done_elig, "rate": rate, "duplicates_skipped": dup, "target": None}
        # ---- Salesperson daily reports + KPI (only for sales variant) ----
        if variant == "sales":
            try:
                D = "Sales Staff Daily Task Management"
                reps = frappe.get_all(D, filters={"employee_name": emp, "docstatus": ["<", 2], "date": ["between", [p_from, p_to]]}, fields=["name","date","visit_status","docstatus","order_received","delivery_pending"], order_by="date desc", limit_page_length=120)
                for rp in reps:
                    rp["visits"] = frappe.db.count("FSMD", {"parent": rp.name, "parenttype": D})
                    rp["new_customers"] = frappe.db.count("FSNC", {"parent": rp.name, "parenttype": D})
                tr = frappe.get_all(D, filters={"employee_name": emp, "docstatus": ["<", 2], "date": today}, fields=["name","visit_status","docstatus"], order_by="docstatus desc", limit_page_length=1)
                pend = frappe.db.count(D, {"employee_name": emp, "docstatus": 0, "date": ["between", [p_from, (p_to if p_to < today else today)]]})

                def kpi_doc(rec):
                    rows = frappe.get_all("KPI Child Table", filters={"parent": rec.name, "parenttype": "Sales Person KPI"}, fields=["kpi","target","achieved"], order_by="idx asc", limit_page_length=30)
                    lst = []
                    head = None
                    for r in rows:
                        t = U.flt(r.target)
                        a = U.flt(r.achieved) if U.cstr(r.achieved).replace(".", "", 1).strip().isdigit() else None
                        lower = "ar days" in U.cstr(r.kpi).lower()
                        pct = None
                        if t > 0 and a is not None and not lower:
                            pct = round(a * 100.0 / t, 1)
                        item = {"kpi": r.kpi, "pct": pct, "lower_is_better": lower}
                        lst.append(item)
                        if head is None and "sales vs monthly target" in U.cstr(r.kpi).lower() and pct is not None:
                            head = item
                    return {"name": rec.name, "from": rec.from_date, "to": rec.to_date, "rows": lst, "headline": head}

                kp = frappe.get_all("Sales Person KPI", filters={"user_email": user, "docstatus": 1, "from_date": ["<=", p_to], "to_date": [">=", p_from]}, fields=["name","from_date","to_date"], order_by="from_date desc", limit_page_length=1)
                cur = kpi_doc(kp[0]) if kp else None
                lk = frappe.get_all("Sales Person KPI", filters={"user_email": user, "docstatus": 1, "to_date": ["<", p_from]}, fields=["name","from_date","to_date"], order_by="from_date desc", limit_page_length=1)
                last = kpi_doc(lk[0]) if lk else None
                trend = []
                for tk in frappe.get_all("Sales Person KPI", filters={"user_email": user, "docstatus": 1}, fields=["name","from_date","to_date"], order_by="from_date desc", limit_page_length=6):
                    kd = kpi_doc(tk)
                    trend.append({"from": kd["from"], "to": kd["to"], "pct": kd["headline"]["pct"] if kd["headline"] else None})
                trend.reverse()

                # Daily reporting compliance: unique submitted report dates / expected working days
                comp = {"status": "not_configured"}
                end = p_to if p_to < today else today
                start = p_from
                if e.date_of_joining and U.getdate(e.date_of_joining) > start:
                    start = U.getdate(e.date_of_joining)
                hlname = e.holiday_list
                if hlname and end >= start:
                    hl = frappe.db.get_value("Holiday List", hlname, ["from_date","to_date"], as_dict=True)
                    if hl and U.getdate(hl.from_date) <= start and U.getdate(hl.to_date) >= end:
                        hols = {}
                        for h in frappe.get_all("Holiday", filters={"parent": hlname, "parenttype": "Holiday List", "holiday_date": ["between", [start, end]]}, fields=["holiday_date"], limit_page_length=400):
                            hols[U.cstr(h.holiday_date)] = 1
                        lv = {}
                        for la in frappe.get_all("Leave Application", filters={"employee": emp, "status": "Approved", "docstatus": 1, "from_date": ["<=", end], "to_date": [">=", start]}, fields=["from_date","to_date"], limit_page_length=50):
                            dd = U.getdate(la.from_date)
                            while dd <= U.getdate(la.to_date):
                                lv[U.cstr(dd)] = 1
                                dd = U.add_days(dd, 1)
                        expected = []
                        dd = start
                        while dd <= end:
                            k = U.cstr(dd)
                            if k not in hols and k not in lv:
                                expected.append(k)
                            dd = U.add_days(dd, 1)
                        subd = {}
                        for r in frappe.get_all(D, filters={"employee_name": emp, "docstatus": 1, "date": ["between", [start, end]]}, fields=["date"], limit_page_length=400):
                            subd[U.cstr(r.date)] = 1
                        hit = len([1 for k in expected if k in subd])
                        if expected:
                            comp = {"status": "ok", "expected": len(expected), "submitted": hit, "pct": round(hit * 100.0 / len(expected), 1), "from": start, "to": end, "holiday_list": hlname, "leave_days": len(lv)}
                        else:
                            comp = {"status": "no_working_days", "from": start, "to": end}
                    else:
                        comp = {"status": "not_configured", "reason": "Holiday list " + U.cstr(hlname) + (" covers " + U.cstr(hl.from_date) + " to " + U.cstr(hl.to_date) if hl else " not found") + ", not the selected period"}
                elif not hlname:
                    comp = {"status": "not_configured", "reason": "No holiday list on Employee record"}
                out["sales"] = {"reports": reps, "today": tr[0] if tr else None, "pending_drafts": pend, "kpi": cur, "last_kpi": last, "compliance": comp, "trend": trend}
            except Exception:
                out["sales"] = {"error": True}
        # ---- Assigned vehicles & company assets (all variants) ----
        try:
            myem = [x for x in [e.get("user_id") if e.get("user_id") else user] if x]
            ee = frappe.db.get_value("Employee", emp, ["personal_email","company_email"], as_dict=True) or {}
            mails = [m.lower() for m in [user, ee.get("personal_email"), ee.get("company_email")] if m]
            av = []
            for v in frappe.get_all("Vehicle", filters={"employee": emp, "custom_vehicle_status": ["!=", "Sold"]}, fields=["name","license_plate","plate_no","make","model","vehicle_model","custom_vehicle_status","current_odometer","last_odometer","custom_attach_image","registration_expiry","end_date","inspection_expiry_date","mvpi_date","driver_email","branch","location"], limit_page_length=10):
                asg = "Confirmed"
                why = None
                if v.custom_vehicle_status != "Active":
                    asg = "Requires confirmation"
                    why = "Vehicle status is " + U.cstr(v.custom_vehicle_status or "not set")
                elif v.driver_email and v.driver_email.lower() not in mails:
                    oth = frappe.db.sql("select name, status, designation from `tabEmployee` where name!=%(e)s and (lower(user_id)=%(m)s or lower(personal_email)=%(m)s or lower(company_email)=%(m)s) limit 3", {"e": emp, "m": v.driver_email.lower()}, as_dict=True)
                    if len(oth) == 1 and oth[0].status == "Active" and oth[0].designation in ["Driver", "Light Driver"]:
                        asg = "Requires confirmation"
                        why = "The vehicle's driver email belongs to another active driver"
                    elif len(oth) > 1:
                        why = "Driver email matches more than one employee record (fleet review recommended)"
                av.append({"name": v.name, "plate": v.license_plate or v.plate_no, "make": v.make, "model": v.vehicle_model or v.model, "image": v.custom_attach_image, "odometer": v.current_odometer or v.last_odometer, "branch": v.branch, "location": v.location, "assignment": asg, "reason": why,
                    "docs": [{"doc": "Istimara", "expiry": v.registration_expiry, "days": days_to(v.registration_expiry)}, {"doc": "Insurance", "expiry": v.end_date, "days": days_to(v.end_date)}, {"doc": "Fahas", "expiry": v.mvpi_date, "days": days_to(v.mvpi_date)}]})
            def cst(dt):
                if not dt:
                    return "Not recorded"
                dd = U.date_diff(dt, today)
                if dd < 0:
                    return "Expired"
                if dd <= 30:
                    return "Expiring soon"
                return "Valid"
            for x in av:
                if x["assignment"] != "Confirmed":
                    continue
                c = frappe.db.get_value("Vehicle", x["name"], ["mvpi_date","inspection_expiry_date","registration_expiry","end_date","expiry_date","op_card_expiry_date","driver_card_expiry_date","custom_authorization_expiry","standard_oild_changing","custom_odometer_value","last_oil_change_km","oil_change_date"], as_dict=True)
                comp = []
                for lbl, val, note in [["Istimara", c.registration_expiry, None], ["Insurance", c.end_date, None], ["Fahas / MVPI", c.mvpi_date, ("Vehicle record also shows inspection expiry " + U.cstr(c.inspection_expiry_date) + " — please confirm with fleet") if (c.inspection_expiry_date and c.mvpi_date and U.getdate(c.inspection_expiry_date) != U.getdate(c.mvpi_date)) else None], ["Driving Licence", c.expiry_date, None], ["Operation Card", c.op_card_expiry_date, None], ["Driver Card", c.driver_card_expiry_date, None], ["Authorization", c.custom_authorization_expiry, None]]:
                    comp.append({"doc": lbl, "expiry": val, "days": days_to(val), "status": cst(val), "note": note})
                x["compliance"] = comp
                std = U.flt(c.standard_oild_changing)
                last = c.last_oil_change_km
                odo = c.custom_odometer_value
                oil = {"status": "Unknown", "last_service_date": c.oil_change_date, "next_service_date": None}
                if std > 0 and last not in [None, ""] and odo not in [None, ""]:
                    dist = frappe.db.sql("select ifnull(max(distance),0) - ifnull(min(distance),0) from `tabVehicle Arabitra Logs` where vehicle=%(v)s and date(track_date_time)=%(d)s", {"v": x["name"], "d": U.add_days(today, -1)})
                    dist = U.flt(dist[0][0]) if dist else 0
                    cur = U.flt(odo) + dist
                    nxt = U.flt(last) + std
                    left = nxt - cur
                    oil.update({"current_odometer": cur, "last_oil_change_km": U.flt(last), "interval": std, "next_oil_change_km": nxt, "km_left": left, "status": "Overdue" if left < 0 else ("Due soon" if left < 1000 else "Not due")})
                x["oil"] = oil
            out["assigned_vehicles"] = av
            aa = []
            # Company Assets: Asset Acquisition Records (submitted only). Holder = item 'Assigned To', else the record's Employee.
            # An item is held by this employee when its latest submitted Issue New / Return line is an Issue New to them.
            acq = frappe.db.sql("""select p.name as rec, p.date, p.satus, p.request_type, c.item_name, c.brand_name, c.detail_desc, c.dmasset_no, c.ids, c.condition_item,
                    coalesce(nullif(c.life_cercle_end, ''), p.employee) as holder
                from `tabAsset Acquisition Table` c join `tabAsset Acquisition Records` p on c.parent = p.name
                where p.docstatus = 1 and p.satus in ('Issue New', 'Return') and ifnull(c.item_name, '') != ''
                  and c.item_name in (select c2.item_name from `tabAsset Acquisition Table` c2 join `tabAsset Acquisition Records` p2 on c2.parent = p2.name
                                      where p2.docstatus = 1 and coalesce(nullif(c2.life_cercle_end, ''), p2.employee) = %(e)s)
                order by p.date desc, p.modified desc, c.idx desc""", {"e": emp}, as_dict=True)
            seen_items = {}
            for r in acq:
                if r.item_name in seen_items:
                    continue
                seen_items[r.item_name] = 1
                if r.satus != "Issue New" or r.holder != emp:
                    continue
                ita = frappe.db.get_value("IT Asset", r.item_name, ["asset", "category", "brand", "serial_number", "location"], as_dict=True) or {}
                aa.append({"source": "Asset Acquisition", "id": r.item_name, "record": r.rec, "name": ita.get("asset") or r.detail_desc or r.item_name, "category": ita.get("category") or r.request_type, "brand": r.brand_name or ita.get("brand"), "serial": mask(r.ids or ita.get("serial_number"), 4), "location": ita.get("location"), "assignment": "Confirmed", "since": r.date, "condition": r.condition_item, "asset_no": r.dmasset_no})
            out["assigned_assets"] = aa
            def hrows(direction):
                rows = frappe.db.sql("select p.name, p.date, p.request_type, p.approval_status, p.satus, p.employee as h_emp, p.recieved_by as h_recv, c.item_name, c.brand_name, c.detail_desc, c.dmasset_no, c.condition_item, c.quanity from `tabAsset Acquisition Table` c join `tabAsset Acquisition Records` p on c.parent=p.name where p.docstatus=1 and p.satus=%(s)s and coalesce(nullif(c.life_cercle_end, ''), p.employee)=%(e)s order by p.date desc, p.modified desc, p.name desc, c.idx asc limit 60", {"s": direction, "e": emp}, as_dict=True)
                grp = {}
                order = []
                for r in rows:
                    if r.name not in grp:
                        hdr = (r.h_recv or r.h_emp) if direction == "Issue New" else r.h_emp
                        grp[r.name] = {"ref": r.name, "date": r.date, "type": r.request_type, "direction": direction, "approval": r.approval_status, "record": "Submitted", "header_differs": hdr != emp, "items": []}
                        order.append(r.name)
                    grp[r.name]["items"].append({"asset": r.item_name, "desc": " ".join([y for y in [r.brand_name, U.cstr(r.detail_desc)[:80]] if y]), "asset_no": r.dmasset_no, "condition": r.condition_item, "qty": r.quanity})
                return [grp[n] for n in order][:20]
            out["acquisition_history"] = {"received": hrows("Issue New"), "returned": hrows("Return")}
        except Exception:
            out["assigned_vehicles"] = None
            out["assigned_assets"] = None
        if variant == "driver":
            try:
                VF = ["name","license_plate","plate_no","registration_no","make","model","vehicle_model","custom_vehicle_status","current_odometer","last_odometer","custom_attach_image","registration_expiry","end_date","inspection_expiry_date","mvpi_status","driving_license_no","license_expiry_date","driver_card_no","driver_card_expiry_date","operation_card_no","op_card_expiry_date","km_to_oil_change","mvpi_date","expiry_date"]
                vs = frappe.get_all("Vehicle", filters={"employee": emp, "custom_vehicle_status": ["!=", "Sold"]}, fields=VF, order_by="modified desc", limit_page_length=10)
                vehicles = []
                for v in vs:
                    vehicles.append({"name": v.name, "plate": v.license_plate or v.plate_no, "registration_no": mask(v.registration_no, 4), "make": v.make, "model": v.vehicle_model or v.model, "status": v.custom_vehicle_status, "odometer": v.current_odometer or v.last_odometer, "image": v.custom_attach_image, "km_to_oil_change": v.km_to_oil_change, "next_oil_change_date": None,
                        "docs": [{"doc": "Istimara / Vehicle Registration", "expiry": v.registration_expiry, "days": days_to(v.registration_expiry)}, {"doc": "Vehicle Insurance", "expiry": v.end_date, "days": days_to(v.end_date)}, {"doc": "Fahas / Periodic Inspection", "expiry": v.mvpi_date, "days": days_to(v.mvpi_date), "note": v.mvpi_status}],
                        "driver_docs": [{"doc": "Driving Licence", "ref": mask(v.driving_license_no, 3), "expiry": v.expiry_date, "days": days_to(v.expiry_date)}, {"doc": "Professional Driver Card", "ref": mask(v.driver_card_no, 3), "expiry": v.driver_card_expiry_date, "days": days_to(v.driver_card_expiry_date)}, {"doc": "Operation Card", "ref": mask(v.operation_card_no, 3), "expiry": v.op_card_expiry_date, "days": days_to(v.op_card_expiry_date)}]})
                gps = None
                if False:
                    g = frappe.get_all("Vehicle Arabitra Logs", filters={"vehicle": vehicles[0]["name"]}, fields=["latitude","longitude","track_date_time","speed","ignition","location"], order_by="track_date_time desc, creation desc", limit_page_length=1)
                    if g:
                        gps = {"lat": g[0].latitude, "lng": g[0].longitude, "time": g[0].track_date_time, "speed": g[0].speed, "ignition": g[0].ignition, "location": g[0].location}
                drv = frappe.get_all("Driver", filters={"employee": emp}, fields=["name"], limit_page_length=1)
                trips = []
                t7 = U.add_days(today, -6)
                if drv:
                    trips = frappe.get_all("Delivery Trip", filters={"driver": drv[0].name, "docstatus": ["<", 2], "departure_time": ["between", [U.add_days(today, -30), U.add_days(today, 7)]]}, fields=["name","status","delivery_status","departure_time","custom_trip_code","vehicle","total_distance","custom_driver_reporting_time","custom_trip_type_"], order_by="departure_time desc", limit_page_length=80)
                    if trips:
                        stops = frappe.get_all("Delivery Stop", filters={"parent": ["in", [t.name for t in trips]], "parenttype": "Delivery Trip"}, fields=["parent","idx","customer","customer_address","visited","estimated_arrival","lat","lng","distance"], order_by="idx asc", limit_page_length=400)
                        bym = {}
                        for st in stops:
                            st["customer_address"] = frappe.utils.strip_html(U.cstr(st.customer_address)).strip()[:200]
                            bym.setdefault(st.parent, []).append(st)
                        for t in trips:
                            t["stops"] = bym.get(t.name, [])
                cond = None
                if vehicles:
                    cr = frappe.db.sql("select p.date, c.`condition`, c.remarks from `tabVehicle Condition Table` c join `tabVehicle Condition` p on c.parent=p.name where c.vehicle_no=%(v)s order by p.date desc, p.modified desc limit 1", {"v": vehicles[0]["name"]}, as_dict=True)
                    if cr:
                        cond = {"date": cr[0].date, "condition": cr[0].condition, "remarks": U.cstr(cr[0].remarks)[:200]}
                actv = [x["name"] for x in (out.get("assigned_vehicles") or []) if x["assignment"] == "Confirmed"]
                vv = None
                vreason = "No confirmed vehicle assignment. Assignments needing confirmation are listed in My Profile."
                if len(actv) == 1:
                    vv = actv[0]
                elif len(actv) > 1:
                    tv = [t.vehicle for t in trips if t.vehicle in actv and t.departure_time and U.date_diff(t.departure_time, today) in [-1, 0, 1]]
                    if tv:
                        vv = tv[0]
                    else:
                        vreason = "You have several active vehicles and no trip within a day of today identifies the current one."
                if vv:
                    g = frappe.get_all("Vehicle Arabitra Logs", filters={"vehicle": vv}, fields=["latitude","longitude","track_date_time","speed","ignition","location"], order_by="track_date_time desc, creation desc", limit_page_length=1)
                    if g:
                        gps = {"lat": g[0].latitude, "lng": g[0].longitude, "time": g[0].track_date_time, "speed": g[0].speed, "ignition": g[0].ignition, "location": g[0].location}
                chk = frappe.get_all("Driver Vehicle Check", filters={"driver": emp}, fields=["name","vehicle","check_datetime","result","fleet_review_status","odometer"], order_by="check_datetime desc", limit_page_length=10)
                iss = frappe.get_all("Driver Vehicle Issue Request", filters={"driver": emp}, fields=["name","vehicle","report_datetime","issue_category","severity","status","resolution_date"], order_by="report_datetime desc", limit_page_length=10)
                acc = []
                for x in frappe.get_all("Vehicle Accident", filters={"employee": emp, "docstatus": 1}, fields=["name","date","vehicle_name","location","accident_case_no","mistake_","liability","taqdeer","insurance_claim__investigation","remarks"], order_by="date desc", limit_page_length=20):
                    acc.append({"ref": x.name, "date": x.date, "vehicle": x.vehicle_name, "location": x.location, "case_no": mask(x.accident_case_no, 4), "fault_pct": x.mistake_, "liability": x.liability, "taqdeer": x.taqdeer, "insurance_claim": x.insurance_claim__investigation, "summary": U.cstr(x.remarks)[:300]})
                tvm = None
                if vv:
                    tdv = [t.vehicle for t in trips if t.vehicle and t.departure_time and U.date_diff(t.departure_time, today) == 0]
                    if tdv and vv not in tdv:
                        tvm = "Today's trip uses vehicle " + tdv[0] + ", which differs from your confirmed vehicle " + vv + ". GPS is shown only for your confirmed vehicle."
                out["driver"] = {"trip_vehicle_mismatch": tvm, "accidents": acc, "gps": gps, "verified_vehicle": vv, "vehicle_reason": vreason, "checks": chk, "issues": iss, "condition": cond, "vehicles": vehicles, "gps": gps, "has_driver_record": bool(drv), "trips": trips, "trips_from": t7, "trips_to": today}
            except Exception:
                out["driver"] = {"error": True}
        if variant == "sales":
            try:
                tar = {"status": "not_available"}
                sps = frappe.get_all("Sales Person", filters={"employee": emp, "enabled": 1}, fields=["name","custom_user_email"], limit_page_length=2)
                if len(sps) != 1 or (sps[0].custom_user_email and sps[0].custom_user_email != user):
                    tar = {"status": "mapping_not_verified"}
                else:
                    spn = sps[0].name
                    TD = "Tar VS Actual Report"
                    recs = frappe.get_all(TD, filters={"from_date": p_from, "to_date": p_to}, fields=["name","from_date","to_date","modified"], order_by="modified desc", limit_page_length=1)
                    hist = False
                    if not recs:
                        cands = frappe.get_all(TD, filters={"to_date": ["<", p_from]}, fields=["name","from_date","to_date","modified"], order_by="to_date desc, modified desc", limit_page_length=12)
                        recs = [c for c in cands if U.getdate(c.from_date) == U.get_first_day(c.from_date) and U.getdate(c.to_date) == U.get_last_day(c.from_date)][:1]
                        hist = True if recs else False
                    if recs:
                        rows = frappe.get_all("tar vs actual table", filters={"parent": recs[0].name, "parenttype": TD, "sales_person": spn}, fields=["particular","total"], order_by="idx asc", limit_page_length=40)
                        if not rows:
                            tar = {"status": "no_rows", "from": recs[0].from_date, "to": recs[0].to_date, "historical": hist}
                        else:
                            M = ["Sales Target","Actual Sales","Target Department Sales","% Achieved","Other Department Sales Total","Other Department %","Total Sales","Total %"]
                            v = {}
                            depts = []
                            for r in rows:
                                if r.particular in M:
                                    v[r.particular] = U.flt(r.total)
                                else:
                                    depts.append({"name": r.particular, "amount": U.flt(r.total)})
                            tgt = v.get("Sales Target", 0)
                            tot = v.get("Total Sales")
                            tar = {"status": "ok", "from": recs[0].from_date, "to": recs[0].to_date, "historical": hist, "target": tgt, "total_sales": tot, "target_dept_sales": v.get("Target Department Sales"), "other_dept_sales": v.get("Other Department Sales Total"), "actual_sales_row": v.get("Actual Sales"), "pct": round(tot * 100.0 / tgt, 1) if tgt and tot is not None else None, "target_dept_pct": round(v.get("Target Department Sales", 0) * 100.0 / tgt, 1) if tgt else None, "remaining": (tgt - tot) if tgt and tot is not None else None, "departments": depts}
                out["sales"]["tar"] = tar
            except Exception:
                out["sales"]["tar"] = {"status": "error"}
        out["ok"] = True
        frappe.response["message"] = out

    except Exception:
        frappe.response["message"] = {"ok": False, "reason": "error"}
