# Admin & HR Dashboard API  (Server Script, type API, method: admin_hr_dashboard_data)
# Created 2026-10-25. READ-ONLY: no inserts/updates/deletes.
# Security:
#   * allow_guest = 0 (login required)
#   * role gate: System Manager, HR Manager, HR User, IT Coordinator
#   * every read uses frappe.get_list -> DocType permissions + User Permissions enforced for the caller
#   * employee-level rows and drill-downs only returned to HR Manager / HR User ("detail" tier)
#   * preview_tier=aggregate can only DOWNGRADE the caller's tier (used for testing)

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
    frappe.throw("Not permitted: the Admin & HR Dashboard requires System Manager, HR Manager, HR User or IT Coordinator.", title="Not Permitted")

detail = len([r for r in roles if r in DETAIL_ROLES]) > 0
fd = frappe.form_dict
if fd.get("preview_tier") == "aggregate":
    detail = False

today = U.getdate(U.nowdate())
if fd.get("date"):
    req_date = U.getdate(fd.get("date"))
    if req_date <= today:
        today = req_date
today_s = str(today)

ROWS = {}
ERRORS = []


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


def fetch(doctype, filters, fields, order_by, errors):
    # Phase 9.1: skip DocTypes the caller cannot read, before querying, so no permission pop-up is raised.
    if not can_read(doctype):
        errors.append({"doctype": doctype, "error": "No read permission or query error"})
        return None
    try:
        return frappe.get_list(doctype, filters=filters, fields=fields, limit_page_length=0, order_by=order_by)
    except Exception as e:
        errors.append({"doctype": doctype, "error": "No read permission or query error"})
        return None


def erow(e, extra):
    r = {"employee": e.get("name"), "employee_name": e.get("employee_name"), "department": e.get("department"),
         "branch": e.get("branch"), "job_location": e.get("custom_job_location")}
    for k in extra:
        r[k] = extra[k]
    return r


def kpi(key, label, value, state, note, sub, drill):
    return {"key": key, "label": label, "value": value, "state": state, "note": note or "", "sub": sub or "", "drill": drill}


def groupc(rows, field):
    c = {}
    for r in rows:
        k = r.get(field) or "(Not set)"
        c[k] = c.get(k, 0) + 1
    out = [{"label": k, "count": c[k]} for k in c]
    return sorted(out, key=lambda x: -x["count"])


def pct(a, b):
    if not b:
        return None
    return round(100.0 * a / b, 1)


# ---------------- company & filters ----------------
companies = frappe.get_all("Company", fields=["name"], order_by="name asc")  # names only; not employee data
company_names = [c.get("name") for c in companies]
company = fd.get("company") or DEFAULT_COMPANY
if company not in company_names:
    frappe.throw("Company not found or not permitted.", title="Not Permitted")

branch = fd.get("branch") or ""
job_location = fd.get("job_location") or ""
department = fd.get("department") or ""

EMP_FIELDS = ["name", "employee_name", "department", "designation", "branch", "custom_job_location",
              "custom_nationality", "custom_employee_nationality", "gender", "date_of_joining",
              "expiry_date", "passport_expiry_date", "valid_upto", "agreement_expiry_date", "contract_end_date",
              "insurance_expiry_date", "insurance_status", "attendance_device_id", "user_id", "default_shift",
              "holiday_list", "employment_type", "reports_to", "attach_iqama_copy", "passport_copy",
              "attch_contract_copy", "attach_medical", "relieving_date"]

base = fetch("Employee", {"status": "Active", "company": company}, EMP_FIELDS, "employee_name asc", ERRORS)
if base is None:
    frappe.throw("You do not have read permission on Employee.", title="Not Permitted")


def match(e, branch, job_location, department):
    if branch and e.get("branch") != branch:
        return False
    if job_location and e.get("custom_job_location") != job_location:
        return False
    if department and e.get("department") != department:
        return False
    return True


emps = [e for e in base if match(e, branch, job_location, department)]
ids = [e.get("name") for e in emps]
emap = {}
for e in emps:
    emap[e.get("name")] = e
total = len(emps)

filter_options = {
    "companies": company_names,
    "branches": sorted(list(dict.fromkeys([e.get("branch") for e in base if e.get("branch")]))),
    "job_locations": sorted(list(dict.fromkeys([e.get("custom_job_location") for e in base if e.get("custom_job_location")]))),
    "departments": sorted(list(dict.fromkeys([e.get("department") for e in base if e.get("department")]))),
}

# ---------------- system status (holiday lists / auto attendance) ----------------
hl_cover = fetch("Holiday List", [["from_date", "<=", today_s], ["to_date", ">=", today_s]], ["name"], "name asc", ERRORS)
covered_lists = [h.get("name") for h in (hl_cover or [])]
emp_hl_uncovered = [e for e in emps if e.get("holiday_list") not in covered_lists]
shift_types = fetch("Shift Type", [], ["name", "start_time", "enable_entry_grace_period", "late_entry_grace_period",
                                       "saturday_shift_start_time", "enable_auto_attendance", "last_sync_of_checkin"], "name asc", ERRORS)
smap = {}
stale_shifts = []
for s in (shift_types or []):
    smap[s.get("name")] = s
    if s.get("enable_auto_attendance"):
        ls = s.get("last_sync_of_checkin")
        if not ls or U.date_diff(today, U.getdate(ls)) > 2:
            stale_shifts.append({"shift": s.get("name"), "last_sync": str(ls or "never")})
holiday_ok = len(emp_hl_uncovered) == 0 and hl_cover is not None
auto_att_ok = len(stale_shifts) == 0 and shift_types is not None
system_status = {
    "holiday_lists": {"ok": holiday_ok, "covered_lists": covered_lists, "employees_without_valid_list": len(emp_hl_uncovered),
                      "readable": hl_cover is not None,
                      "note": ("Holiday List not readable with your permissions." if hl_cover is None else ("No holiday list covers " + today_s + " for " + str(len(emp_hl_uncovered)) + " of " + str(total) + " employees." if not holiday_ok else "Holiday lists cover today."))},
    "auto_attendance": {"ok": auto_att_ok, "stale_shifts": stale_shifts,
                        "readable": shift_types is not None,
                        "note": ("Shift Type not readable with your permissions." if shift_types is None else (str(len(stale_shifts)) + " shift type(s) with auto-attendance enabled have not synced in the last 2 days." if not auto_att_ok else "Auto-attendance is current."))},
}
absence_reliable = holiday_ok and auto_att_ok

# ---------------- leave applications ----------------
la = None
if ids:
    la = fetch("Leave Application", [["employee", "in", ids], ["docstatus", "<", 2]],
               ["name", "employee", "employee_name", "leave_type", "from_date", "to_date", "total_leave_days", "workflow_state", "status", "docstatus", "posting_date"],
               "from_date asc", ERRORS)
leave_ok = la is not None or not ids
la = la or []
on_leave_today = []
pending_approval = []
drafts = []
upcoming = []
status_mismatch = []
for l in la:
    ws = l.get("workflow_state") or ""
    fdt = U.getdate(l.get("from_date"))
    tdt = U.getdate(l.get("to_date"))
    approved = ws == "Approved" and l.get("docstatus") == 1
    row = {"leave_application": l.get("name"), "employee": l.get("employee"), "employee_name": l.get("employee_name"),
           "leave_type": l.get("leave_type"), "from_date": str(fdt), "to_date": str(tdt), "days": l.get("total_leave_days"), "workflow_state": ws}
    if approved and fdt <= today and tdt >= today:
        on_leave_today.append(row)
    if approved and fdt > today and fdt <= U.getdate(U.add_days(today, 30)):
        upcoming.append(row)
    if ws.startswith("Pending") or ws == "On-Hold":
        row["age_days"] = U.date_diff(today, U.getdate(l.get("posting_date") or fdt))
        pending_approval.append(row)
    elif (ws == "Draft" or not ws) and l.get("docstatus") == 0:
        drafts.append(row)
    if l.get("status") == "Approved" and ws != "Approved":
        status_mismatch.append(row)
on_leave_ids = {}
for r in on_leave_today:
    on_leave_ids[r["employee"]] = 1

alloc = None
if ids:
    alloc = fetch("Leave Allocation", [["employee", "in", ids], ["docstatus", "=", 1], ["from_date", "<=", today_s], ["to_date", ">=", today_s]],
                  ["employee", "leave_type", "total_leaves_allocated"], "employee asc", ERRORS)
alloc_emp = {}
for a in (alloc or []):
    alloc_emp[a.get("employee")] = 1
no_alloc = [e for e in emps if e.get("name") not in alloc_emp]

year_start = str(today.year) + "-01-01"
type_counts = {}
for l in la:
    if (l.get("workflow_state") == "Approved") and l.get("docstatus") == 1 and str(l.get("from_date")) >= year_start:
        k = l.get("leave_type") or "(Not set)"
        type_counts[k] = type_counts.get(k, 0) + (l.get("total_leave_days") or 0)
leave_by_type = sorted([{"label": k, "count": round(type_counts[k], 1)} for k in type_counts], key=lambda x: -x["count"])

# ---------------- attendance (Employee Checkin only; Phase 11 rules, 2026-10-27) ----------------
# Present  = at least one Employee Checkin on an eligible working day (several punches = one day).
# Absent   = no Employee Checkin on an eligible working day that has ended; today = "Not yet checked in".
# Holiday  = Friday for everyone; Saturday for custom_nationality = "Saudi Arabia". Not in any denominator.
# On leave = no punch but an approved Leave Application (workflow_state Approved, submitted) covers the day.
# Eligible = between date_of_joining and relieving_date; future days are never counted.
# Excluded = custom_job_location in ATT_EXCL_LOCATIONS (left out of every attendance figure).
# The Attendance DocType is not read anywhere in this calculation.
ATT_EXCL_LOCATIONS = ["Back Office", "Work At Home", "Work From Home"]
SAUDI_VALUE = "Saudi Arabia"
ATT_MAX_DAYS = 92
ATT_RULE = ("Employee Checkin only: 1+ punch on a working day = Present; no punch = Absent once the day has ended "
            "(today: Not yet checked in). Friday is a weekly holiday for everyone, Saturday also for Saudi employees "
            "(Nationality field). Approved leave without a punch = On Leave. Back Office, Work At Home and Work From Home "
            "are excluded. Days before joining or after relieving are not counted.")
real_today = U.getdate(U.nowdate())


def day_is_holiday(e, d):
    wd = d.weekday()
    if wd == 4:
        return True
    if wd == 5 and e.get("custom_nationality") == SAUDI_VALUE:
        return True
    return False


def in_service(e, d):
    j = e.get("date_of_joining")
    if j and d < U.getdate(j):
        return False
    r = e.get("relieving_date")
    if r and d > U.getdate(r):
        return False
    return True


def dlabel(d):
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.weekday()] + " " + str(d)[8:10]


att_to = today
if fd.get("to_date"):
    req_to = U.getdate(fd.get("to_date"))
    if req_to < att_to:
        att_to = req_to
att_from = U.getdate(U.add_days(att_to, -29))
if fd.get("from_date"):
    att_from = U.getdate(fd.get("from_date"))
if att_from > att_to:
    att_from = att_to
period_capped = False
if U.date_diff(att_to, att_from) + 1 > ATT_MAX_DAYS:
    att_from = U.getdate(U.add_days(att_to, 1 - ATT_MAX_DAYS))
    period_capped = True
start14 = U.getdate(U.add_days(today, -13))
win_from = att_from if att_from < start14 else start14
win_to = today

# scope: active employees in the current filter + employees relieved inside the window (history only)
rel = fetch("Employee", [["status", "!=", "Active"], ["company", "=", company], ["relieving_date", ">=", str(win_from)]],
            EMP_FIELDS + ["status"], "name asc", ERRORS) or []
rel = [e for e in rel if e.get("relieving_date") and U.getdate(e.get("relieving_date")) >= win_from and match(e, branch, job_location, department)]
att_pool = emps + rel
att_excluded_active = [e for e in emps if (e.get("custom_job_location") or "") in ATT_EXCL_LOCATIONS]
att_emps = [e for e in att_pool if (e.get("custom_job_location") or "") not in ATT_EXCL_LOCATIONS]
att_ids = [e.get("name") for e in att_emps]
att_map = {}
for e in att_emps:
    att_map[e.get("name")] = e

chk = None
if att_ids:
    chk = fetch("Employee Checkin", [["employee", "in", att_ids], ["time", ">=", str(win_from) + " 00:00:00"], ["time", "<=", str(win_to) + " 23:59:59"]],
                ["employee", "time", "log_type", "custom_attendance_device"], "time asc", ERRORS)
chk_ok = chk is not None or not att_ids
punched = {}
first_today = {}
punches_today = 0
src_mobile = 0
src_other = 0
for c in (chk or []):
    t = U.get_datetime(c.get("time"))
    dk = str(t.date())
    punched[c.get("employee") + "|" + dk] = 1
    if dk == today_s:
        punches_today = punches_today + 1
        if (c.get("custom_attendance_device") or "") == "Mobile Device":
            src_mobile = src_mobile + 1
        else:
            src_other = src_other + 1
        if c.get("employee") not in first_today:
            first_today[c.get("employee")] = {"time": t, "log_type": c.get("log_type")}

lv_win = None
if att_ids:
    lv_win = fetch("Leave Application", [["employee", "in", att_ids], ["docstatus", "=", 1], ["workflow_state", "=", "Approved"],
                                         ["from_date", "<=", str(win_to)], ["to_date", ">=", str(win_from)]],
                   ["employee", "from_date", "to_date"], "from_date asc", ERRORS)
on_leave_day = {}
for l in (lv_win or []):
    ld = U.getdate(l.get("from_date"))
    if ld < win_from:
        ld = win_from
    lend = U.getdate(l.get("to_date"))
    if lend > win_to:
        lend = win_to
    while ld <= lend:
        on_leave_day[l.get("employee") + "|" + str(ld)] = 1
        ld = U.getdate(U.add_days(ld, 1))


def day_status(e, d):
    if d > real_today or not in_service(e, d):
        return None
    if day_is_holiday(e, d):
        return "holiday"
    k = e.get("name") + "|" + str(d)
    if k in punched:
        return "present"
    if k in on_leave_day:
        return "leave"
    if d == real_today:
        return "not_yet"
    return "absent"


win_days = []
cur_d = win_from
while cur_d <= win_to:
    win_days.append(cur_d)
    cur_d = U.getdate(U.add_days(cur_d, 1))
day_tot = {}
emp_tot = {}
for e in att_emps:
    emp_tot[e.get("name")] = {"present": 0, "absent": 0, "leave": 0, "holiday": 0, "not_yet": 0}
for d in win_days:
    o = {"present": 0, "absent": 0, "leave": 0, "holiday": 0, "not_yet": 0}
    in_period = d >= att_from and d <= att_to
    for e in att_emps:
        st = day_status(e, d)
        if st:
            o[st] = o[st] + 1
            if in_period:
                et = emp_tot[e.get("name")]
                et[st] = et[st] + 1
    day_tot[str(d)] = o


def trend_row(d):
    o = day_tot.get(str(d)) or {"present": 0, "absent": 0, "leave": 0, "holiday": 0, "not_yet": 0}
    return {"date": str(d), "label": dlabel(d), "count": o["present"], "present": o["present"], "absent": o["absent"],
            "on_leave": o["leave"], "not_yet": o["not_yet"], "holiday": o["holiday"],
            "expected": o["present"] + o["absent"] + o["not_yet"], "pct": pct(o["present"], o["present"] + o["absent"] + o["not_yet"])}


trend = [trend_row(U.getdate(U.add_days(start14, i))) for i in range(14)]
period_trend = [trend_row(d) for d in win_days if d >= att_from and d <= att_to]
p_present = 0
p_absent = 0
p_leave = 0
p_holiday = 0
p_not_yet = 0
for k in emp_tot:
    p_present = p_present + emp_tot[k]["present"]
    p_absent = p_absent + emp_tot[k]["absent"]
    p_leave = p_leave + emp_tot[k]["leave"]
    p_holiday = p_holiday + emp_tot[k]["holiday"]
    p_not_yet = p_not_yet + emp_tot[k]["not_yet"]
att_period = {"from": str(att_from), "to": str(att_to), "days": U.date_diff(att_to, att_from) + 1, "capped": period_capped,
              "max_days": ATT_MAX_DAYS, "present_days": p_present, "absent_days": p_absent, "leave_days": p_leave,
              "holiday_days": p_holiday, "not_yet_days": p_not_yet, "pct": pct(p_present, p_present + p_absent),
              "pct_basis": "Present days / (Present + Absent days). Weekly holidays, approved leave and today's not-yet-checked-in are excluded."}

today_status = {}
for e in att_emps:
    st = day_status(e, today)
    if st:
        today_status[e.get("name")] = st
present_today = [k for k in today_status if today_status[k] == "present"]
not_yet_today = [k for k in today_status if today_status[k] == "not_yet"]
absent_today = [k for k in today_status if today_status[k] == "absent"]
leave_today_att = [k for k in today_status if today_status[k] == "leave"]
holiday_today = [k for k in today_status if today_status[k] == "holiday"]
expected_today = len(present_today) + len(not_yet_today) + len(absent_today)
today_final = today < real_today
checked = {}
for k in present_today:
    checked[k] = 1
no_punch = [att_map[k] for k in not_yet_today]
absence_reliable = True

# late check-ins
assigned = {}
sa = fetch("Shift Assignment", [["docstatus", "=", 1], ["status", "=", "Active"], ["start_date", "<=", today_s]], ["employee", "shift_type", "end_date"], "start_date asc", ERRORS)
for a in (sa or []):
    if not a.get("end_date") or U.getdate(a.get("end_date")) >= today:
        assigned[a.get("employee")] = a.get("shift_type")
is_saturday = today.weekday() == 5
late_rows = []
late_no_rule = 0
late_ambiguous = 0
late_evaluated = 0
for emp in first_today:
    e = att_map.get(emp)
    if not e or today_status.get(emp) != "present":
        continue
    shift = assigned.get(emp) or e.get("default_shift")
    s = smap.get(shift) if shift else None
    if not s or s.get("start_time") is None:
        late_no_rule = late_no_rule + 1
        continue
    if is_saturday and s.get("saturday_shift_start_time"):
        late_ambiguous = late_ambiguous + 1
        continue
    st_min = int(str(s.get("start_time")).split(":")[0]) * 60 + int(str(s.get("start_time")).split(":")[1])
    grace = (s.get("late_entry_grace_period") or 0) if s.get("enable_entry_grace_period") else 0
    t = first_today[emp]["time"]
    m = t.hour * 60 + t.minute
    late_evaluated = late_evaluated + 1
    if m > st_min + grace:
        late_rows.append(erow(e, {"shift": shift, "first_punch": str(t)[11:16], "late_by_min": m - st_min - grace}))

# ---------------- documents & compliance ----------------
# Saudi nationals have open-ended contracts: with no contract expiry recorded, the contract runs to today + 60 days
# (moves forward daily), shows 60 days remaining and counts as valid, not missing.
OPEN_ENDED_DAYS = 60
SAUDI_NAMES = ["saudi", "saudi arabia", "saudi arabian", "المملكة العربية السعودية", "السعودية", "سعودي"]


def open_ended_contract(e):
    return str(e.get("custom_nationality") or "").strip().lower() in SAUDI_NAMES and not e.get("agreement_expiry_date") and not e.get("contract_end_date")


DOCS = [["iqama", "Iqama / ID", "expiry_date", None, "attach_iqama_copy", "Primary: expiry_date"],
        ["passport", "Passport", "passport_expiry_date", "valid_upto", "passport_copy", "Provisional: passport_expiry_date; compared with valid_upto"],
        ["contract", "Contract", "agreement_expiry_date", "contract_end_date", "attch_contract_copy", "Primary: agreement_expiry_date; compared with contract_end_date. Saudi with no date: open-ended (today + 60 days), counted as valid"],
        ["insurance", "Medical insurance", "insurance_expiry_date", None, "attach_medical", "Primary: insurance_expiry_date; compared with insurance_status"]]
compliance = []
exp_total = 0
exp_expired = 0
exp_60 = 0
for dd in DOCS:
    key = dd[0]
    b = {"expired": 0, "d30": 0, "d60": 0, "d90": 0, "later": 0, "missing": 0}
    r_exp = []
    r_missing = []
    r_conf = []
    att_missing = 0
    fallback = 0
    for e in emps:
        v = e.get(dd[2])
        days = None
        if key == "contract" and open_ended_contract(e):
            b["later"] = b["later"] + 1
        elif not v:
            b["missing"] = b["missing"] + 1
            r_missing.append(erow(e, {"document": dd[1]}))
        else:
            days = U.date_diff(v, today)
            if days < 0:
                b["expired"] = b["expired"] + 1
            elif days <= 30:
                b["d30"] = b["d30"] + 1
            elif days <= 60:
                b["d60"] = b["d60"] + 1
            elif days <= 90:
                b["d90"] = b["d90"] + 1
            else:
                b["later"] = b["later"] + 1
            if days <= 90:
                r_exp.append(erow(e, {"document": dd[1], "expiry_date": str(v), "days_left": days}))
        if dd[3]:
            v2 = e.get(dd[3])
            if v and v2 and str(v) != str(v2):
                r_conf.append(erow(e, {"document": dd[1], dd[2]: str(v), dd[3]: str(v2)}))
            elif v2 and not v:
                fallback = fallback + 1
                r_conf.append(erow(e, {"document": dd[1], dd[2]: "", dd[3]: str(v2)}))
        if key == "insurance":
            stt = e.get("insurance_status") or ""
            if v and days is not None and days < 0 and stt == "Valid":
                r_conf.append(erow(e, {"document": dd[1], "insurance_status": stt, "insurance_expiry_date": str(v)}))
            elif v and days is not None and days >= 0 and stt == "Expired":
                r_conf.append(erow(e, {"document": dd[1], "insurance_status": stt, "insurance_expiry_date": str(v)}))
        if not e.get(dd[4]):
            att_missing = att_missing + 1
    exp_expired = exp_expired + b["expired"]
    exp_60 = exp_60 + b["d30"] + b["d60"]
    compliance.append({"key": key, "label": dd[1], "field": dd[2], "secondary": dd[3], "rule": dd[5], "buckets": b,
                       "conflicts": len(r_conf), "fallback_only": fallback, "attachment_missing": att_missing,
                       "state": "partial" if (b["missing"] or r_conf) else "actual"})
    if detail:
        ROWS["exp_" + key] = sorted(r_exp, key=lambda x: x["days_left"])
        ROWS["missing_" + key] = r_missing
        ROWS["conflict_" + key] = r_conf
exp_total = exp_expired + exp_60

# ---------------- training ----------------
tp = None
if ids:
    tp = fetch("Employee Training Progress", [["employee", "in", ids]],
               ["name", "employee", "employee_name", "training_title", "mandatory", "status", "due_date", "completed_on"], "due_date asc", ERRORS)
training_ok = tp is not None or not ids
tp = tp or []
t_done = len([t for t in tp if t.get("status") == "Completed"])
t_over = [t for t in tp if t.get("status") != "Completed" and t.get("due_date") and U.getdate(t.get("due_date")) < today]
t_emp = {}
for t in tp:
    t_emp[t.get("employee")] = 1
t_by_title = {}
for t in tp:
    k = t.get("training_title") or "(Untitled)"
    if k not in t_by_title:
        t_by_title[k] = {"label": k, "assigned": 0, "completed": 0, "overdue": 0}
    t_by_title[k]["assigned"] = t_by_title[k]["assigned"] + 1
    if t.get("status") == "Completed":
        t_by_title[k]["completed"] = t_by_title[k]["completed"] + 1
    elif t.get("due_date") and U.getdate(t.get("due_date")) < today:
        t_by_title[k]["overdue"] = t_by_title[k]["overdue"] + 1
t_by_dept = {}
for t in tp:
    e = emap.get(t.get("employee")) or {}
    k = e.get("department") or "(Not set)"
    if k not in t_by_dept:
        t_by_dept[k] = {"label": k, "assigned": 0, "completed": 0}
    t_by_dept[k]["assigned"] = t_by_dept[k]["assigned"] + 1
    if t.get("status") == "Completed":
        t_by_dept[k]["completed"] = t_by_dept[k]["completed"] + 1
videos = fetch("Training Video", [], ["name", "active", "mandatory"], "name asc", ERRORS)
courses = fetch("Training Course", [], ["name", "active"], "name asc", ERRORS)

# ---------------- HR requests ----------------
TERMINAL = ["Approved", "Rejected", "Cancelled", "cancelled", "Completed", "Resolved", "Closed"]
REQ = [["Leave Request Form", 0, "employee_name"], ["DM Letter Forms", 0, "employee"], ["Attendance Request", 0, "employee"],
       ["Employee Clearance", 0, "employee"], ["Qiwa contract renewal request", 1, "emp_name"],
       ["IT Help Desk Request", 1, "employee"], ["Resignation Letter", 1, "employee"]]
requests = []
req_rows = []
for rq in REQ:
    if rq[1]:
        data = fetch(rq[0], [["docstatus", "<", 2]], ["name", "workflow_state", "docstatus", "creation", rq[2] + " as employee"], "creation asc", ERRORS)
    else:
        data = fetch(rq[0], [["docstatus", "=", 0]], ["name", "docstatus", "creation", rq[2] + " as employee"], "creation asc", ERRORS)
    if data is None:
        requests.append({"doctype": rq[0], "state": "unavailable", "open": None, "note": "No read permission"})
        continue
    if rq[1]:
        open_rows = [d for d in data if (d.get("workflow_state") or "Draft") not in TERMINAL]
        open_states = sorted(list(dict.fromkeys([(d.get("workflow_state") or "Draft") for d in open_rows])))
    else:
        open_rows = data
        open_states = ["Draft (not submitted)"]
    oldest = 0
    for d in open_rows:
        age = U.date_diff(today, U.getdate(d.get("creation")))
        if age > oldest:
            oldest = age
        req_rows.append({"doctype": rq[0], "name": d.get("name"), "state": d.get("workflow_state") or "Draft",
                         "employee": d.get("employee"), "age_days": age})
    requests.append({"doctype": rq[0], "state": "actual", "open": len(open_rows), "oldest_days": oldest, "workflow": bool(rq[1]),
                     "open_states": open_states, "total": len(data)})
if detail:
    ROWS["requests_open"] = sorted(req_rows, key=lambda x: -x["age_days"])

# ---------------- analytics ----------------
left = fetch("Employee", {"status": ["in", ["Left", "Inactive", "Suspended"]], "company": company},
             ["name", "date_of_joining", "relieving_date", "branch", "custom_job_location", "department", "status"], "name asc", ERRORS) or []
left = [e for e in left if match(e, branch, job_location, department)]
months = []
for i in range(11, -1, -1):
    m0 = U.getdate(U.get_first_day(U.add_months(today, -i)))
    months.append(str(m0)[:7])
join_m = {}
leave_m = {}
for e in emps + left:
    if e.get("date_of_joining"):
        k = str(U.getdate(e.get("date_of_joining")))[:7]
        join_m[k] = join_m.get(k, 0) + 1
left_no_date = 0
for e in left:
    if e.get("status") == "Left":
        if e.get("relieving_date"):
            k = str(U.getdate(e.get("relieving_date")))[:7]
            leave_m[k] = leave_m.get(k, 0) + 1
        else:
            left_no_date = left_no_date + 1
movement = [{"month": m, "joiners": join_m.get(m, 0), "leavers": leave_m.get(m, 0)} for m in months]
leavers12 = sum([x["leavers"] for x in movement])
joiners12 = sum([x["joiners"] for x in movement])

# ---- Phase 8: monthly turnover (reconstructed headcount) ----
def headcount_on(dd):
    ds_ = str(dd)
    n = 0
    for e in emps:
        if e.get("date_of_joining") and str(e.get("date_of_joining")) <= ds_:
            n = n + 1
    for e in left:
        if e.get("date_of_joining") and str(e.get("date_of_joining")) <= ds_ and e.get("relieving_date") and str(e.get("relieving_date")) > ds_:
            n = n + 1
    return n


turnover = []
for m in months:
    ms = U.getdate(m + "-01")
    me = U.getdate(U.get_last_day(ms))
    h0 = headcount_on(U.add_days(ms, -1))
    h1 = headcount_on(me)
    sep = leave_m.get(m, 0)
    avg_h = (h0 + h1) / 2.0
    turnover.append({"month": m, "separations": sep, "headcount_start": h0, "headcount_end": h1, "rate": round(100.0 * sep / avg_h, 2) if avg_h else None})
tb = {"< 1 yr": 0, "1-3 yrs": 0, "3-5 yrs": 0, "5-10 yrs": 0, "10+ yrs": 0, "(Not set)": 0}
for e in emps:
    if not e.get("date_of_joining"):
        tb["(Not set)"] = tb["(Not set)"] + 1
        continue
    y = U.date_diff(today, e.get("date_of_joining")) / 365.25
    k = "< 1 yr" if y < 1 else ("1-3 yrs" if y < 3 else ("3-5 yrs" if y < 5 else ("5-10 yrs" if y < 10 else "10+ yrs")))
    tb[k] = tb[k] + 1
tenure = [{"label": k, "count": tb[k]} for k in ["< 1 yr", "1-3 yrs", "3-5 yrs", "5-10 yrs", "10+ yrs", "(Not set)"]]

NAT_MAP = {"Indian": "India", "Bangladesh": "Bangladesh", "Pakistan": "Pakistan", "Egyptian": "Egypt", "Saudi Arabia": "Saudi Arabia",
           "Sri Lankan": "Sri Lanka", "Philippines": "Philippines", "Syrian": "Syria", "Palestine": "Palestinian Territory, Occupied",
           "Jordanian": "Jordan", "Sudanese": "Sudan", "Yemeni": "Yemen", "Nepali": "Nepal"}
saudi = [e for e in emps if e.get("custom_nationality") == "Saudi Arabia"]
saudi_verified = [e for e in saudi if e.get("custom_employee_nationality") == "Saudi Arabia"]
nat_conflict = []
nat_link_missing = []
for e in emps:
    s1 = e.get("custom_nationality")
    s2 = e.get("custom_employee_nationality")
    if not s2:
        nat_link_missing.append(erow(e, {"custom_nationality": s1 or ""}))
    elif s1 and NAT_MAP.get(s1) and NAT_MAP.get(s1) != s2:
        nat_conflict.append(erow(e, {"custom_nationality": s1, "custom_employee_nationality": s2}))


def saud_by(rows, field):
    g = {}
    for e in rows:
        k = e.get(field) or "(Not set)"
        if k not in g:
            g[k] = {"label": k, "total": 0, "saudi": 0}
        g[k]["total"] = g[k]["total"] + 1
        if e.get("custom_nationality") == "Saudi Arabia":
            g[k]["saudi"] = g[k]["saudi"] + 1
    out = []
    for k in g:
        x = g[k]
        x["pct"] = round(100.0 * x["saudi"] / x["total"], 1) if x["total"] else None
        out.append(x)
    return sorted(out, key=lambda x: -x["total"])


saudization = {
    "rule": "Provisional: Saudi = custom_nationality 'Saudi Arabia' / active headcount in current filter. Not Nitaqat-weighted; awaiting approved calculation rule.",
    "saudi": len(saudi), "total": total, "pct": pct(len(saudi), total),
    "verified_both_fields": len(saudi_verified), "conflicts": len(nat_conflict), "link_missing": len(nat_link_missing),
    "by_branch": saud_by(emps, "branch"), "by_location": saud_by(emps, "custom_job_location"),
}

# ---------------- data quality ----------------
def missing(rows, field, label):
    out = []
    for e in rows:
        if not e.get(field):
            out.append(erow(e, {"missing": label}))
    return out


dq = []
dq_defs = [["missing_department", "Department missing", missing(emps, "department", "department"), "medium"],
           ["missing_designation", "Designation missing", missing(emps, "designation", "designation"), "medium"],
           ["missing_employment_type", "Employment type missing", missing(emps, "employment_type", "employment_type"), "low"],
           ["missing_user", "No ERPNext user linked", missing(emps, "user_id", "user_id"), "medium"],
           ["missing_device_id", "Biometric device ID missing", missing(emps, "attendance_device_id", "attendance_device_id"), "medium"],
           ["missing_shift", "Default shift missing", missing(emps, "default_shift", "default_shift"), "low"],
           ["missing_reports_to", "Reports-to missing", missing(emps, "reports_to", "reports_to"), "low"],
           ["nat_conflict", "Nationality fields disagree", nat_conflict, "high"],
           ["nat_link_missing", "Nationality (link field) missing", nat_link_missing, "low"],
           ["no_leave_allocation", "No current leave allocation", [erow(e, {}) for e in no_alloc], "medium"],
           ["holiday_list_expired", "Assigned holiday list does not cover today", [erow(e, {"holiday_list": e.get("holiday_list")}) for e in emp_hl_uncovered], "high"],
           ["leave_status_mismatch", "Leave status 'Approved' but workflow not Approved", status_mismatch, "medium"]]
for c in compliance:
    dq_defs.append(["missing_" + c["key"], c["label"] + " expiry missing", None, "high" if c["key"] in ["iqama", "contract"] else "medium", c["buckets"]["missing"]])
    dq_defs.append(["conflict_" + c["key"], c["label"] + " conflicting values", None, "high", c["conflicts"]])
for d in dq_defs:
    cnt = len(d[2]) if d[2] is not None else d[4]
    dq.append({"key": d[0], "label": d[1], "count": cnt, "severity": d[3], "pct": pct(cnt, total)})
    if detail and d[2] is not None:
        ROWS["dq_" + d[0]] = d[2]

# ---------------- detail rows ----------------
if detail:
    ROWS["active"] = [erow(e, {"designation": e.get("designation"), "nationality": e.get("custom_nationality"), "date_of_joining": str(e.get("date_of_joining") or "")}) for e in emps]
    ROWS["checked_in"] = [erow(att_map[k], {"first_punch": str(first_today[k]["time"])[11:16] if k in first_today else ""}) for k in present_today]
    ROWS["no_punch"] = [erow(e, {"status": "Not yet checked in", "nationality": e.get("custom_nationality")}) for e in no_punch]
    ROWS["absent_today"] = [erow(att_map[k], {"status": "Absent", "nationality": att_map[k].get("custom_nationality")}) for k in absent_today]
    ROWS["att_leave_today"] = [erow(att_map[k], {"status": "On leave (no punch)"}) for k in leave_today_att]
    ROWS["att_holiday_today"] = [erow(att_map[k], {"status": "Weekly holiday", "nationality": att_map[k].get("custom_nationality")}) for k in holiday_today]
    ROWS["att_excluded"] = [erow(e, {"reason": "Job location excluded from attendance"}) for e in att_excluded_active]
    att_rows = []
    for k in emp_tot:
        et = emp_tot[k]
        if et["present"] + et["absent"] + et["leave"] + et["not_yet"] == 0:
            continue
        att_rows.append(erow(att_map[k], {"nationality": att_map[k].get("custom_nationality"), "present_days": et["present"], "absent_days": et["absent"],
                                          "leave_days": et["leave"], "holiday_days": et["holiday"], "attendance_pct": pct(et["present"], et["present"] + et["absent"])}))
    ROWS["att_period"] = sorted(att_rows, key=lambda x: (-x["absent_days"], x["employee"]))
    ROWS["att_absent_period"] = [r for r in ROWS["att_period"] if r["absent_days"] > 0]
    ROWS["late"] = sorted(late_rows, key=lambda x: -x["late_by_min"])
    ROWS["on_leave"] = on_leave_today
    ROWS["leave_pending"] = sorted(pending_approval, key=lambda x: -x["age_days"])
    ROWS["leave_drafts"] = drafts
    ROWS["leave_upcoming"] = upcoming
    ROWS["training_overdue"] = [{"employee": t.get("employee"), "employee_name": t.get("employee_name"), "training": t.get("training_title"),
                                 "status": t.get("status"), "due_date": str(t.get("due_date")), "mandatory": t.get("mandatory")} for t in t_over]
    ROWS["training_all"] = [{"employee": t.get("employee"), "employee_name": t.get("employee_name"), "training": t.get("training_title"),
                             "status": t.get("status"), "due_date": str(t.get("due_date") or "")} for t in tp]
    ROWS["saudi"] = [erow(e, {"custom_nationality": e.get("custom_nationality"), "custom_employee_nationality": e.get("custom_employee_nationality") or ""}) for e in saudi]


def dr(detail, doctype, key, filters):
    if not detail:
        return None
    return {"doctype": doctype, "rows": key, "filters": filters}


# ---------------- overview KPIs ----------------
late_state = "actual" if late_evaluated and not late_no_rule else ("partial" if late_evaluated else "unavailable")
if shift_types is None:
    late_rows = []
    late_evaluated = 0
    late_state = "unavailable"
overview = [
    kpi("active", "Total Active Employees", total, "actual", "Employee.status = Active", "", dr(detail, "Employee", "active", None)),
    kpi("checked_in", "Present Today", len(present_today) if chk_ok else None, "actual" if chk_ok else "unavailable",
        ATT_RULE, (str(pct(len(present_today), expected_today)) + "% of " + str(expected_today) + " expected at work") if chk_ok and expected_today else ("Weekly holiday for everyone in scope" if chk_ok else ""),
        dr(detail, "Employee", "checked_in", None)),
    (kpi("absent", "Absent", len(absent_today) if chk_ok else None, "actual" if chk_ok else "unavailable",
         ATT_RULE, "Working day, no punch, no approved leave", dr(detail, "Employee", "absent_today", None)) if today_final else
     kpi("absent", "Not Yet Checked In", len(not_yet_today) if chk_ok else None, "actual" if chk_ok else "unavailable",
         ATT_RULE, "Working day, no punch yet · becomes Absent after today", dr(detail, "Employee", "no_punch", None))),
    kpi("on_leave", "On Approved Leave Today", len(on_leave_today) if leave_ok else None, "actual" if leave_ok else "unavailable",
        "Leave Application: workflow_state Approved, submitted, covering today", "", dr(detail, "Leave Application", "on_leave", [["workflow_state", "=", "Approved"], ["docstatus", "=", 1], ["from_date", "<=", today_s], ["to_date", ">=", today_s]])),
    kpi("late", "Late Check-ins", len(late_rows) if late_evaluated else None, late_state,
        "First punch after shift start + entry grace (Shift Type). " + (str(late_no_rule) + " punched employees have no shift rule. " if late_no_rule else "") + (str(late_ambiguous) + " skipped: Saturday start time unclear." if late_ambiguous else ""),
        str(late_evaluated) + " evaluated", dr(detail, "Employee", "late", None)),
    kpi("leave_pending", "Pending Leave Applications", len(pending_approval) if leave_ok else None, "actual" if leave_ok else "unavailable",
        "Workflow state Pending* or On-Hold", "+" + str(len(drafts)) + " drafts not yet sent", dr(detail, "Leave Application", "leave_pending", [["workflow_state", "like", "Pending%"]])),
    kpi("training", "Training Completion", pct(t_done, len(tp)) if training_ok and tp else None,
        "actual" if training_ok and tp else ("missing" if training_ok else "unavailable"),
        "Completed / assigned (Employee Training Progress)" if training_ok else "No read permission on Employee Training Progress",
        (str(t_done) + " of " + str(len(tp)) + " assignments · " + str(len(t_over)) + " overdue") if training_ok else "", dr(detail, "Employee Training Progress", "training_all", None)),
    kpi("expiring", "Expiring Documents (≤60 days)", exp_total, "partial",
        "Iqama, passport, contract, insurance: expired + due within 60 days. Some records missing/conflicting (see Data Quality).",
        str(exp_expired) + " expired · " + str(exp_60) + " due ≤60d", dr(detail, "Employee", "exp_iqama", None)),
]

# ---------------- employee management KPIs (Phase 3) ----------------
dept_set = {}
for e in emps:
    if e.get("department"):
        dept_set[e.get("department")] = 1
non_saudi = [e for e in emps if e.get("custom_nationality") and e.get("custom_nationality") != "Saudi Arabia"]
nat_missing_rows = [e for e in emps if not e.get("custom_nationality")]
EXP_FIELDS = [["expiry_date", "Iqama/ID"], ["passport_expiry_date", "Passport"], ["agreement_expiry_date", "Contract"], ["insurance_expiry_date", "Insurance"]]
exp_emp_rows = []
for e in emps:
    items = []
    soonest = None
    for ef in EXP_FIELDS:
        v = e.get(ef[0])
        if v:
            dl = U.date_diff(v, today)
            if dl <= 60:
                items.append(ef[1] + (" expired" if dl < 0 else " in " + str(dl) + "d"))
                soonest = dl if soonest is None or dl < soonest else soonest
    if items:
        exp_emp_rows.append(erow(e, {"documents": ", ".join(items), "soonest_days": soonest}))
exp_emp_rows = sorted(exp_emp_rows, key=lambda x: x["soonest_days"])
month_prefix = today_s[:7]
joined_month_rows = [erow(e, {"date_of_joining": str(e.get("date_of_joining"))}) for e in emps if str(e.get("date_of_joining") or "")[:7] == month_prefix]
d90_ago = str(U.add_days(today, -90))
recent_joiners = [e for e in emps if e.get("date_of_joining") and str(e.get("date_of_joining")) >= d90_ago]
status_distribution = groupc([{"status": "Active"} for e in emps] + left, "status")  # base query is status=Active
probation_info = {"state": "unavailable",
                  "note": "No reliable probation data: probation custom fields are empty for all employees, and confirmation dates are inconsistent (several before the joining date, none in the future).",
                  "recent_joiners_90d": len(recent_joiners)}
if detail:
    ROWS["non_saudi"] = [erow(e, {"nationality": e.get("custom_nationality")}) for e in non_saudi]
    ROWS["nationality_missing"] = [erow(e, {}) for e in nat_missing_rows]
    ROWS["expiring_employees"] = exp_emp_rows
    ROWS["joined_month"] = joined_month_rows

result = {
    "meta": {"generated_at": str(U.now_datetime())[:19], "date": today_s, "company": company,
             "filters": {"branch": branch, "job_location": job_location, "department": department},
             "tier": "detail" if detail else "aggregate", "user": user, "filter_options": filter_options, "errors": ERRORS},
    "system_status": system_status,
    "overview": overview,
    "employees": {
        "active": total, "inactive_or_left_in_filter": len(left), "joiners_12m": joiners12, "leavers_12m": leavers12,
        "joined_this_month": join_m.get(months[-1], 0), "with_user": total - len([e for e in emps if not e.get("user_id")]),
        "by_department": groupc(emps, "department"), "by_branch": groupc(emps, "branch"),
        "by_location": groupc(emps, "custom_job_location"), "by_designation": groupc(emps, "designation")[:15],
        "by_employment_type": groupc(emps, "employment_type"), "by_gender": groupc(emps, "gender"),
        "departments_count": len(dept_set), "saudi": len(saudi), "non_saudi": len(non_saudi), "nationality_missing": len(nat_missing_rows),
        "expiring_employees": len(exp_emp_rows), "status_distribution": status_distribution, "probation": probation_info,
        "joining_trend": [{"label": m["month"], "count": m["joiners"]} for m in movement],
    },
    "attendance": {
        "ok": chk_ok, "rule": ATT_RULE, "source": "Employee Checkin", "excluded_locations": ATT_EXCL_LOCATIONS, "saudi_field": "custom_nationality",
        "checked_in": len(present_today), "present_today": len(present_today), "not_yet_today": len(not_yet_today), "absent_today": len(absent_today),
        "on_leave_today_att": len(leave_today_att), "holiday_today": len(holiday_today), "expected_today": expected_today, "today_final": today_final,
        "in_scope_active": total - len(att_excluded_active), "excluded_active": len(att_excluded_active),
        "punches_today": punches_today, "mobile_punches": src_mobile, "other_punches": src_other,
        "no_punch_unconfirmed": len(not_yet_today), "absent_recorded": len(absent_today), "on_leave": len(on_leave_today),
        "late": len(late_rows), "late_evaluated": late_evaluated, "late_no_rule": late_no_rule, "late_ambiguous": late_ambiguous,
        "trend": trend, "period": att_period, "period_trend": period_trend, "absence_reliable": absence_reliable,
    },
    "leave": {
        "ok": leave_ok, "on_leave_today": len(on_leave_today), "pending": len(pending_approval), "drafts": len(drafts),
        "upcoming_30d": len(upcoming), "status_mismatch": len(status_mismatch), "by_type_days_ytd": leave_by_type,
        "pending_by_state": groupc(pending_approval, "workflow_state"), "no_allocation": len(no_alloc),
        "allocation_ok": alloc is not None,
    },
    "compliance": compliance,
    "training": {
        "ok": training_ok, "assignments": len(tp), "completed": t_done, "overdue": len(t_over), "pct": pct(t_done, len(tp)),
        "employees_assigned": len(t_emp), "employees_not_assigned": total - len(t_emp),
        "by_title": sorted([t_by_title[k] for k in t_by_title], key=lambda x: -x["assigned"]),
        "by_department": sorted([t_by_dept[k] for k in t_by_dept], key=lambda x: -x["assigned"]),
        "videos_active": len([v for v in (videos or []) if v.get("active")]) if videos is not None else None,
        "videos_total": len(videos) if videos is not None else None, "courses_total": len(courses) if courses is not None else None,
    },
    "requests": requests,
    "analytics": {
        "nationality": groupc(emps, "custom_nationality"), "saudization": saudization, "tenure": tenure,
        "movement": movement, "left_without_relieving_date": left_no_date,
        "attrition_12m_pct": pct(leavers12, total), "attrition_note": "Approximate: leavers with relieving_date in last 12 months / current active headcount.",
    },
    "data_quality": dq,
    "rows": ROWS if detail else {},
}
result["analytics"]["turnover"] = turnover
result["analytics"]["turnover_note"] = {"state": "partial" if left_no_date else "actual", "missing_relieving_date": left_no_date,
    "basis": "Separations = status Left with relieving_date in the month. Rate = separations / average of reconstructed headcount at the start and end of the month (date_of_joining <= day and not relieved by that day). Status changes other than Left are not counted as separations."}


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
    if not detail and (branch or job_location or department) and n < 5:
        frappe.throw("Fewer than 5 employees match these filters. Aggregate figures are not shown for groups this small.", title="Too few employees")


small_scope_guard(total)
if not detail:
    result = suppress(result)
frappe.response["message"] = result
