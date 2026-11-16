# ERP User Access Dashboard - read-only analytics API (aggregates only, no per-user rows)
# Endpoint: /api/method/user_access_analytics   (GET)
# Snapshot filters (apply to status, user type, department, ageing, roles): department, user_type, status
# Date filters (apply ONLY to the creation trend): from_date, to_date (YYYY-MM-DD; default last 12 months)
# Same access rule and status rules as user_access_summary.
ALLOWED = ["System Manager", "IT Coordinator", "Dashboard Manager"]
PRIV = ["System Manager", "IT Coordinator", "Dashboard Manager"]
AUTO_ROLES = ["All", "Guest", "Desk User"]
NO_LINK = "Unassigned – No Employee Link"
NO_DEPT = "Unassigned – No Department"
CONFLICT = "Mapping Conflict"

user = frappe.session.user
has_allowed = frappe.db.sql(
    """select count(*) from `tabHas Role`
       where parenttype = 'User' and parent = %(u)s and role in %(roles)s""",
    {"u": user, "roles": ALLOWED},
)[0][0]
user_enabled = frappe.db.get_value("User", user, "enabled") if user != "Guest" else 0
if user == "Guest" or not user_enabled or not has_allowed:
    frappe.throw("Not permitted to view the ERP User Access Dashboard", title="Access Denied")

dept_f = (frappe.form_dict.get("department") or "").strip()
type_f = (frappe.form_dict.get("user_type") or "").strip()
status_f = (frappe.form_dict.get("status") or "").strip()
if type_f and type_f not in ["System User", "Website User"]:
    frappe.throw("Invalid user type filter", title="Invalid Request")
if status_f and status_f not in ["Active", "Inactive", "Disabled"]:
    frappe.throw("Invalid status filter", title="Invalid Request")

now = frappe.utils.now_datetime()
today = frappe.utils.getdate(now)
cut15 = frappe.utils.get_datetime(frappe.utils.add_days(today, -15))
cut30 = frappe.utils.get_datetime(frappe.utils.add_days(today, -30))
cut60 = frappe.utils.get_datetime(frappe.utils.add_days(today, -60))

try:
    d_to = frappe.utils.getdate(frappe.form_dict.get("to_date")) if frappe.form_dict.get("to_date") else today
    d_from = frappe.utils.getdate(frappe.form_dict.get("from_date")) if frappe.form_dict.get("from_date") else frappe.utils.get_first_day(frappe.utils.add_months(today, -11))
except Exception:
    frappe.throw("Invalid date range", title="Invalid Request")
if d_from > d_to or frappe.utils.date_diff(d_to, d_from) > 3660:
    frappe.throw("Invalid date range", title="Invalid Request")

users = frappe.db.sql(
    """select name, enabled, user_type, last_login, creation from `tabUser`
       where name not in ('Administrator', 'Guest')""",
    as_dict=True,
)
emps = frappe.db.sql(
    """select user_id, status, department from `tabEmployee`
       where ifnull(user_id, '') != ''""",
    as_dict=True,
)
emp_map = {}
for e in emps:
    emp_map.setdefault(e.user_id, []).append(e)
role_rows = frappe.db.sql(
    """select parent, role from `tabHas Role`
       where parenttype = 'User' and role not in %(auto)s""",
    {"auto": AUTO_ROLES},
    as_dict=True,
)
roles_of = {}
for r in role_rows:
    roles_of.setdefault(r.parent, set()).add(r.role)

def dept_of(name):
    links = emp_map.get(name) or []
    if not links:
        return NO_LINK
    if len(links) == 1:
        return links[0].department or NO_DEPT
    active = [l for l in links if l.status == "Active"]
    if len(active) == 1:
        return active[0].department or NO_DEPT
    return CONFLICT

rows = []
for u in users:
    ll = frappe.utils.get_datetime(u.last_login) if (u.enabled and u.last_login) else None
    if u.enabled:
        st = "Active" if (ll and ll >= cut15) else "Inactive"
    else:
        st = "Disabled"
    rows.append({"name": u.name, "dept": dept_of(u.name), "status": st, "enabled": u.enabled,
                 "type": u.user_type, "ll": ll, "created": u.creation,
                 "roles": roles_of.get(u.name) or set()})

def keep(r, use_status=True, use_type=True, use_dept=True):
    if use_dept and dept_f and r["dept"] != dept_f:
        return False
    if use_type and type_f and r["type"] != type_f:
        return False
    if use_status and status_f and r["status"] != status_f:
        return False
    return True

scope = [r for r in rows if keep(r)]

def pct(n, d):
    return round(n * 100.0 / d, 1) if d else 0

# A - account status (filters: department, user type, status)
st_counts = {"Active": 0, "Inactive": 0, "Disabled": 0}
for r in scope:
    st_counts[r["status"]] = st_counts[r["status"]] + 1
status_total = len(scope)

# B - user type (filters: department, status, user type)
tp_counts = {"System User": 0, "Website User": 0}
for r in scope:
    tp_counts[r["type"]] = tp_counts.get(r["type"], 0) + 1

# C - department x status (filters: user type, status; department filter narrows to one row)
dm = {}
for r in scope:
    x = dm.setdefault(r["dept"], {"department": r["dept"], "Active": 0, "Inactive": 0, "Disabled": 0, "total": 0})
    x[r["status"]] = x[r["status"]] + 1
    x["total"] = x["total"] + 1
dept_rows = sorted(dm.values(), key=lambda x: (-x["total"], x["department"]))

# D - login ageing, enabled accounts only (mutually exclusive)
age = {"within_15": 0, "d16_30": 0, "d31_60": 0, "over_60": 0, "never": 0}
for r in scope:
    if not r["enabled"]:
        continue
    ll = r["ll"]
    if ll is None:
        age["never"] = age["never"] + 1
    elif ll >= cut15:
        age["within_15"] = age["within_15"] + 1
    elif ll >= cut30:
        age["d16_30"] = age["d16_30"] + 1
    elif ll >= cut60:
        age["d31_60"] = age["d31_60"] + 1
    else:
        age["over_60"] = age["over_60"] + 1
disabled_in_scope = len([1 for r in scope if not r["enabled"]])

# E - top 10 roles by distinct users (automatic roles All / Guest / Desk User excluded)
rc = {}
for r in scope:
    for role in r["roles"]:
        rc[role] = rc.get(role, 0) + 1
top_roles = [{"role": k, "users": v} for k, v in sorted(rc.items(), key=lambda kv: (-kv[1], kv[0]))[:10]]

# F - monthly user creation (date range applies here only)
months = {}
m = frappe.utils.get_first_day(d_from)
while m <= d_to:
    months[str(m)[:7]] = 0
    m = frappe.utils.add_months(m, 1)
for r in scope:
    if not r["created"]:
        continue
    cd = frappe.utils.getdate(r["created"])
    if d_from <= cd <= d_to:
        k = str(cd)[:7]
        if k in months:
            months[k] = months[k] + 1
trend = [{"month": k, "count": months[k]} for k in sorted(months.keys())]

# Security / data quality (whole user scope, no filters, snapshot)
dq = {"without_employee_link": 0, "without_department": 0, "mapping_conflicts": 0,
      "enabled_inactive_30_plus": 0, "privileged_inactive": 0, "multiple_privileged_roles": 0}
for r in rows:
    if r["dept"] == NO_LINK:
        dq["without_employee_link"] = dq["without_employee_link"] + 1
    elif r["dept"] == NO_DEPT:
        dq["without_department"] = dq["without_department"] + 1
    if len(emp_map.get(r["name"]) or []) > 1:
        dq["mapping_conflicts"] = dq["mapping_conflicts"] + 1
    if r["enabled"] and (r["ll"] is None or r["ll"] < cut30):
        dq["enabled_inactive_30_plus"] = dq["enabled_inactive_30_plus"] + 1
    npriv = len([p for p in PRIV if p in r["roles"]])
    if r["enabled"] and npriv and r["status"] == "Inactive":
        dq["privileged_inactive"] = dq["privileged_inactive"] + 1
    if r["enabled"] and npriv >= 2:
        dq["multiple_privileged_roles"] = dq["multiple_privileged_roles"] + 1
frappe.response["message"] = {
    "report_timestamp": str(now),
    "filters": {"department": dept_f or None, "user_type": type_f or None, "status": status_f or None,
                "from_date": str(d_from), "to_date": str(d_to)},
    "total_in_scope": status_total,
    "status": [{"status": k, "count": st_counts[k], "percent": pct(st_counts[k], status_total)} for k in ["Active", "Inactive", "Disabled"]],
    "user_type": [{"user_type": k, "count": v, "percent": pct(v, status_total)} for k, v in tp_counts.items()],
    "department_status": dept_rows,
    "login_ageing": age,
    "login_ageing_disabled_excluded": disabled_in_scope,
    "top_roles": top_roles,
    "creation_trend": trend,
    "data_quality": dq,
}
