# Admin & HR Dashboard - Employee Detail API (Server Script, API method: admin_hr_employee_detail)
# READ-ONLY. Login required. HR Manager / HR User only.
# The employee is first read with frappe.get_list (DocType permission + Employee User Permission); if the caller
# cannot read that employee, nothing is returned. All other reads also use frappe.get_list.
# Never returned: ID / Iqama / passport numbers, bank details, salary or cost fields, medical/health details,
# attachment URLs (only "attached: yes/no").

ALLOWED_ROLES = ["System Manager", "HR Manager", "HR User", "IT Coordinator","Dashboard Manager"]
DETAIL_ROLES = ["HR Manager", "HR User","Dashboard Manager"]
U = frappe.utils

user = frappe.session.user
role_rows = frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, fields=["role"])
disabled_roles = [x.get("name") for x in frappe.get_all("Role", filters={"disabled": 1}, fields=["name"])]
roles = [x.get("role") for x in role_rows if x.get("role") not in disabled_roles]
if user == "Administrator":
    roles = roles + ALLOWED_ROLES
if user == "Guest" or len([r for r in roles if r in ALLOWED_ROLES]) == 0:
    frappe.throw("Not permitted.", title="Not Permitted")
if len([r for r in roles if r in DETAIL_ROLES]) == 0:
    frappe.throw("Employee details are restricted to HR Manager / HR User.", title="Restricted")
if frappe.form_dict.get("preview_tier") == "aggregate":
    frappe.throw("Employee-level data is not shown in the aggregate preview.", title="Restricted")

fd = frappe.form_dict
emp_id = (fd.get("employee") or "").strip()
if not emp_id:
    frappe.throw("Employee is required.")

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


def fetch(doctype, filters, fields, order_by, limit, errors):
    # Phase 9.1: skip DocTypes the caller cannot read, before querying, so no permission pop-up is raised.
    if not can_read(doctype):
        errors.append(doctype)
        return None
    try:
        return frappe.get_list(doctype, filters=filters, fields=fields, order_by=order_by, limit_page_length=limit)
    except Exception as e:
        errors.append(doctype)
        return None


ERR = []
emp = fetch("Employee", {"name": emp_id},
            ["name", "employee_name", "company", "department", "designation", "branch", "custom_job_location",
             "custom_nationality", "date_of_joining", "status", "employment_type", "gender", "reports_to",
             "relieving_date", "expiry_date", "passport_expiry_date", "valid_upto", "agreement_expiry_date",
             "contract_end_date", "insurance_expiry_date", "insurance_status", "attach_iqama_copy", "passport_copy",
             "attch_contract_copy", "attach_medical", "default_shift", "holiday_list"], "name asc", 1, ERR)
if not emp:
    frappe.throw("Employee not found or not permitted.", title="Not Permitted")
e = emp[0]

manager_name = None
if e.get("reports_to"):
    m = fetch("Employee", {"name": e.get("reports_to")}, ["employee_name"], "name asc", 1, [])
    manager_name = m[0].get("employee_name") if m else None

basic = {"employee": e.get("name"), "employee_name": e.get("employee_name"), "company": e.get("company"),
         "department": e.get("department"), "designation": e.get("designation"), "branch": e.get("branch"),
         "job_location": e.get("custom_job_location"), "nationality": e.get("custom_nationality"),
         "date_of_joining": str(e.get("date_of_joining") or ""), "status": e.get("status"),
         "employment_type": e.get("employment_type"), "gender": e.get("gender"),
         "reports_to": manager_name or (e.get("reports_to") and "(not visible)"), "relieving_date": str(e.get("relieving_date") or ""),
         "default_shift": e.get("default_shift"), "holiday_list": e.get("holiday_list"),
         "service_years": round(U.date_diff(today, e.get("date_of_joining")) / 365.25, 1) if e.get("date_of_joining") else None}

# ---------------- attendance (Employee Checkin only; same rules as admin_hr_dashboard_data, Phase 11) ----------------
# Present = 1+ punch on a working day; Absent = no punch on a working day that has ended (today = Not yet checked in);
# Friday = weekly holiday; Saturday = weekly holiday when custom_nationality = "Saudi Arabia"; approved leave without
# a punch = On Leave; only days between date_of_joining and relieving_date; excluded job locations are not calculated.
# The Attendance DocType is not read.
ATT_EXCL_LOCATIONS = ["Back Office", "Work At Home", "Work From Home"]
SAUDI_VALUE = "Saudi Arabia"
d90 = U.getdate(U.add_days(today, -89))
d30 = U.getdate(U.add_days(today, -29))
attendance = {"available": True, "source": "Employee Checkin", "excluded": False}
if (e.get("custom_job_location") or "") in ATT_EXCL_LOCATIONS:
    attendance["excluded"] = True
    attendance["note"] = "Job location '" + (e.get("custom_job_location") or "") + "' is excluded from attendance calculations."
else:
    chk = fetch("Employee Checkin", [["employee", "=", emp_id], ["time", ">=", str(d90) + " 00:00:00"], ["time", "<=", today_s + " 23:59:59"]],
                ["time"], "time desc", 0, ERR)
    if chk is None:
        attendance["available"] = False
    else:
        punch_day = {}
        for c in chk:
            punch_day[str(c.get("time"))[:10]] = 1
        lvs = fetch("Leave Application", [["employee", "=", emp_id], ["docstatus", "=", 1], ["workflow_state", "=", "Approved"],
                                          ["from_date", "<=", today_s], ["to_date", ">=", str(d90)]], ["from_date", "to_date"], "from_date asc", 0, ERR) or []
        leave_day = {}
        for l in lvs:
            ld = U.getdate(l.get("from_date"))
            lend = U.getdate(l.get("to_date"))
            while ld <= lend:
                leave_day[str(ld)] = 1
                ld = U.getdate(U.add_days(ld, 1))
        doj = U.getdate(e.get("date_of_joining")) if e.get("date_of_joining") else None
        rld = U.getdate(e.get("relieving_date")) if e.get("relieving_date") else None
        LBL = {"present": "Present", "absent": "Absent", "leave": "On Leave", "holiday": "Weekly holiday", "not_yet": "Not yet checked in"}
        c30 = {"present": 0, "absent": 0, "leave": 0, "holiday": 0, "not_yet": 0}
        c90 = {"present": 0, "absent": 0, "leave": 0, "holiday": 0, "not_yet": 0}
        dd = d90
        while dd <= today:
            st = None
            if (doj and dd < doj) or (rld and dd > rld):
                st = None
            elif dd.weekday() == 4 or (dd.weekday() == 5 and e.get("custom_nationality") == SAUDI_VALUE):
                st = "holiday"
            elif str(dd) in punch_day:
                st = "present"
            elif str(dd) in leave_day:
                st = "leave"
            elif dd == today:
                st = "not_yet"
            else:
                st = "absent"
            if st:
                c90[st] = c90[st] + 1
                if dd >= d30:
                    c30[st] = c30[st] + 1
            dd = U.getdate(U.add_days(dd, 1))
        attendance["last_30_days"] = dict([(LBL[k], c30[k]) for k in ["present", "absent", "leave", "holiday", "not_yet"] if c30[k] or k in ["present", "absent"]])
        attendance["last_90_days"] = dict([(LBL[k], c90[k]) for k in ["present", "absent", "leave", "holiday", "not_yet"] if c90[k] or k in ["present", "absent"]])
        attendance["pct_30"] = round(100.0 * c30["present"] / (c30["present"] + c30["absent"]), 1) if (c30["present"] + c30["absent"]) else None
        attendance["pct_90"] = round(100.0 * c90["present"] / (c90["present"] + c90["absent"]), 1) if (c90["present"] + c90["absent"]) else None
        attendance["punch_days_30d"] = len([k for k in punch_day if k >= str(d30)])
        attendance["punches_30d"] = len([c for c in chk if str(c.get("time"))[:10] >= str(d30)])
        attendance["last_punch"] = str(chk[0].get("time"))[:16] if chk else None
        attendance["weekly_holidays"] = "Friday and Saturday" if e.get("custom_nationality") == SAUDI_VALUE else "Friday"
    attendance["note"] = ("From Employee Checkin only. Present = 1+ punch on a working day; Absent = no punch on a completed working day; "
                          "weekly holiday: " + ("Friday and Saturday (Saudi)" if e.get("custom_nationality") == SAUDI_VALUE else "Friday") +
                          "; approved leave without a punch = On Leave. Attendance % = Present / (Present + Absent).")

# ---------------- leave ----------------
la = fetch("Leave Application", [["employee", "=", emp_id], ["docstatus", "<", 2]],
           ["name", "leave_type", "from_date", "to_date", "total_leave_days", "workflow_state", "status", "docstatus", "posting_date"],
           "from_date desc", 0, ERR)
leave = {"available": la is not None}
if la is not None:
    approved = []
    pending = []
    drafts = 0
    for l in la:
        ws = l.get("workflow_state") or ""
        row = {"name": l.get("name"), "leave_type": l.get("leave_type"), "from_date": str(l.get("from_date")),
               "to_date": str(l.get("to_date")), "days": l.get("total_leave_days"), "workflow_state": ws}
        if ws == "Approved" and l.get("docstatus") == 1 and l.get("status") != "Rejected":
            approved.append(row)
        elif ws.startswith("Pending") or ws == "On-Hold":
            pending.append(row)
        elif (ws == "Draft" or not ws) and l.get("docstatus") == 0:
            drafts = drafts + 1
    leave["approved_history"] = approved[:25]
    leave["approved_total"] = len(approved)
    leave["pending"] = pending
    leave["drafts"] = drafts
alloc = fetch("Leave Allocation", [["employee", "=", emp_id], ["docstatus", "=", 1], ["from_date", "<=", today_s], ["to_date", ">=", today_s]],
              ["leave_type", "from_date", "to_date", "total_leaves_allocated"], "leave_type asc", 0, ERR)
balances = []
balance_state = "unavailable"
if alloc is not None:
    if not alloc:
        balance_state = "no_allocation"
    else:
        balance_state = "actual"
        for a in alloc:
            led = fetch("Leave Ledger Entry", [["employee", "=", emp_id], ["leave_type", "=", a.get("leave_type")], ["docstatus", "=", 1],
                                               ["is_expired", "=", 0], ["from_date", ">=", str(a.get("from_date"))], ["to_date", "<=", str(a.get("to_date"))]],
                        ["leaves", "transaction_type", "transaction_name"], "from_date asc", 0, ERR)
            if led is None:
                balance_state = "unavailable"
                balances = []
                break
            # approved usage only: ledger debits from applications still pending workflow approval are reported separately
            app_ws = {}
            app_names = [x.get("transaction_name") for x in led if x.get("transaction_type") == "Leave Application"]
            if app_names:
                for z in (fetch("Leave Application", [["name", "in", app_names]], ["name", "workflow_state", "status", "docstatus"], "name asc", 0, ERR) or []):
                    ok = z.get("docstatus") == 1 and z.get("workflow_state") == "Approved" and z.get("status") != "Rejected"
                    app_ws[z.get("name")] = "approved" if ok else "other"
            base = 0
            pend = 0
            for x in led:
                v = x.get("leaves") or 0
                if x.get("transaction_type") == "Leave Application" and app_ws.get(x.get("transaction_name")) != "approved":
                    pend = pend + v
                else:
                    base = base + v
            if pend:
                balance_state = "partial"
            balances.append({"leave_type": a.get("leave_type"), "allocated": a.get("total_leaves_allocated"),
                             "balance": round(base, 2), "pending_deducted": round(-pend, 2),
                             "period": str(a.get("from_date")) + " → " + str(a.get("to_date"))})
leave["balance_state"] = balance_state
leave["balances"] = balances
leave["balance_note"] = {"actual": "Allocation minus APPROVED leave only (submitted Leave Ledger entries in the current allocation period).",
                         "partial": "Partial: some ledger debits come from applications not fully approved (pending workflow). They are shown as 'pending' and NOT subtracted from the balance.",
                         "no_allocation": "No submitted Leave Allocation covers today, so a balance cannot be calculated reliably.",
                         "unavailable": "Leave Allocation / Ledger not readable with your permissions."}[balance_state]

# ---------------- documents & compliance (dates and status only; no numbers) ----------------
# Saudi nationals have open-ended contracts: with no contract expiry recorded, the contract runs to today + 60 days
# (moves forward daily), shows 60 days remaining and counts as valid, not missing.
OPEN_ENDED_DAYS = 60
SAUDI_NAMES = ["saudi", "saudi arabia", "saudi arabian", "المملكة العربية السعودية", "السعودية", "سعودي"]


def open_ended_contract(e):
    return str(e.get("custom_nationality") or "").strip().lower() in SAUDI_NAMES and not e.get("agreement_expiry_date") and not e.get("contract_end_date")


def doc_status(v):
    if not v:
        return {"date": "", "days_left": None, "status": "missing"}
    dl = U.date_diff(v, today)
    st = "expired" if dl < 0 else ("due_30" if dl <= 30 else ("due_60" if dl <= 60 else ("due_90" if dl <= 90 else "valid")))
    return {"date": str(v), "days_left": dl, "status": st}

docs = []
for spec in [["Iqama / ID", "expiry_date", None, "attach_iqama_copy"], ["Passport", "passport_expiry_date", "valid_upto", "passport_copy"],
             ["Contract", "agreement_expiry_date", "contract_end_date", "attch_contract_copy"], ["Medical insurance", "insurance_expiry_date", None, "attach_medical"]]:
    d = doc_status(e.get(spec[1]))
    if spec[1] == "agreement_expiry_date" and open_ended_contract(e):
        d = {"date": str(U.add_days(today, OPEN_ENDED_DAYS)), "days_left": OPEN_ENDED_DAYS, "status": "valid", "status_label": "Valid · Open-ended"}
    d["document"] = spec[0]
    d["attachment"] = "attached" if e.get(spec[3]) else "not attached"
    warn = ""
    if spec[2]:
        v2 = e.get(spec[2])
        if v2 and e.get(spec[1]) and str(v2) != str(e.get(spec[1])):
            warn = "Conflicts with " + spec[2] + " (" + str(v2) + ")"
        elif v2 and not e.get(spec[1]):
            warn = "Only " + spec[2] + " is set (" + str(v2) + ")"
    if spec[1] == "insurance_expiry_date":
        ist = e.get("insurance_status") or ""
        if d["status"] == "expired" and ist == "Valid":
            warn = "insurance_status says Valid but the date has passed"
        elif d["status"] not in ["expired", "missing"] and ist == "Expired":
            warn = "insurance_status says Expired but the date is in the future"
    d["warning"] = warn
    docs.append(d)

# ---------------- training ----------------
tp = fetch("Employee Training Progress", [["employee", "=", emp_id]], ["training_title", "status", "mandatory", "due_date", "completed_on"], "due_date asc", 0, ERR)
training = {"available": tp is not None}
if tp is not None:
    training["assigned"] = len(tp)
    training["completed"] = len([t for t in tp if t.get("status") == "Completed"])
    training["pending"] = len([t for t in tp if t.get("status") != "Completed"])
    training["overdue"] = len([t for t in tp if t.get("status") != "Completed" and t.get("due_date") and U.getdate(t.get("due_date")) < today])
    training["items"] = [{"training": t.get("training_title"), "status": t.get("status"), "mandatory": t.get("mandatory"),
                          "due_date": str(t.get("due_date") or ""), "completed_on": str(t.get("completed_on") or "")[:10]} for t in tp]

# ---------------- HR requests linked to this employee ----------------
TERMINAL = ["Approved", "Rejected", "Cancelled", "cancelled", "Completed", "Resolved", "Closed"]
REQ = [["Leave Request Form", 0, "employee_name"], ["DM Letter Forms", 0, "employee"], ["Attendance Request", 0, "employee"],
       ["Employee Clearance", 0, "employee"], ["Qiwa contract renewal request", 1, "emp_name"],
       ["IT Help Desk Request", 1, "employee"], ["Resignation Letter", 1, "employee"]]
requests = []
req_unavailable = []
for rq in REQ:
    fields = ["name", "docstatus", "creation"] + (["workflow_state"] if rq[1] else [])
    rows = fetch(rq[0], [[rq[2], "=", emp_id]], fields, "creation desc", 10, [])
    if rows is None:
        req_unavailable.append(rq[0])
        continue
    for r in rows:
        if rq[1]:
            state = r.get("workflow_state") or "Draft"
            is_open = state not in TERMINAL and r.get("docstatus") != 2
        else:
            state = ["Draft", "Submitted", "Cancelled"][r.get("docstatus") or 0]
            is_open = r.get("docstatus") == 0
        requests.append({"doctype": rq[0], "name": r.get("name"), "state": state, "open": is_open, "created": str(r.get("creation"))[:10]})

frappe.response["message"] = {
    "basic": basic, "attendance": attendance, "leave": leave, "documents": docs, "training": training,
    "requests": {"items": requests, "open": len([r for r in requests if r["open"]]), "unavailable": req_unavailable},
    "unreadable": ERR,
}
