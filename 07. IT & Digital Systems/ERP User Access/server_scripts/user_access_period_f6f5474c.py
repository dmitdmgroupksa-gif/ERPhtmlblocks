# ERP User Access Dashboard - read-only Selected Period API
# Endpoint: /api/method/user_access_period   (GET)
# Params: from_date, to_date (YYYY-MM-DD, inclusive, Asia/Riyadh), department (optional reporting group)
# Returns aggregates only (no per-user rows).
ALLOWED = ["System Manager", "IT Coordinator", "Dashboard Manager"]
NO_LINK = "Unassigned – No Employee Link"
NO_DEPT = "Unassigned – No Department"
CONFLICT = "Mapping Conflict"
MAX_DAYS = 3660

user = frappe.session.user
has_allowed = 0
user_enabled = 0
if user != "Guest":
    has_allowed = frappe.db.sql(
        """select count(*) from `tabHas Role`
           where parenttype = 'User' and parent = %(u)s and role in %(roles)s""",
        {"u": user, "roles": ALLOWED},
    )[0][0]
    user_enabled = frappe.db.get_value("User", user, "enabled")
if user == "Guest" or not user_enabled or not has_allowed:
    frappe.throw("Not permitted to view the ERP User Access Dashboard", title="Access Denied")

fd = frappe.form_dict
def param(key):
    v = fd.get(key)
    return ("" if v is None else str(v)).strip()

def valid_iso(v):
    return len(v) == 10 and v[4] == "-" and v[7] == "-" and (v[0:4] + v[5:7] + v[8:10]).isdigit()

fr = param("from_date")
to = param("to_date")
if not fr or not to:
    frappe.throw("Both Start Date and End Date are required.", title="Invalid Date Range")
if not valid_iso(fr) or not valid_iso(to):
    frappe.throw("Dates must use the format YYYY-MM-DD.", title="Invalid Date Range")
d_from = frappe.utils.getdate(fr)
d_to = frappe.utils.getdate(to)
if str(d_from) != fr or str(d_to) != to:
    frappe.throw("Invalid calendar date.", title="Invalid Date Range")
if d_from > d_to:
    frappe.throw("Start Date cannot be after End Date.", title="Invalid Date Range")
now = frappe.utils.now_datetime()
today = frappe.utils.getdate(now)
if d_from < frappe.utils.getdate("2000-01-01"):
    frappe.throw("Start Date is before the supported range (2000-01-01).", title="Invalid Date Range")
if d_to > frappe.utils.getdate(frappe.utils.add_days(today, 366)):
    frappe.throw("End Date is too far in the future.", title="Invalid Date Range")
days = frappe.utils.date_diff(d_to, d_from) + 1
if days > MAX_DAYS:
    frappe.throw("Date range is too long (maximum 10 years).", title="Invalid Date Range")

start_dt = frappe.utils.get_datetime(str(d_from) + " 00:00:00")
end_excl = frappe.utils.get_datetime(str(frappe.utils.add_days(d_to, 1)) + " 00:00:00")
gran = "day" if days <= 62 else "month"
dept_f = param("department")

# ---- in-scope users + department mapping (same rules as summary API) ----
users = frappe.db.sql(
    """select name, enabled, user_type, creation, last_login from `tabUser`
       where name not in ('Administrator', 'Guest')""",
    as_dict=True,
)
emps = frappe.db.sql(
    """select user_id, status, department from `tabEmployee` where ifnull(user_id, '') != ''""",
    as_dict=True,
)
emp_map = {}
for e in emps:
    emp_map.setdefault(e.user_id, []).append(e)

def dept_of(name):
    links = emp_map.get(name) or []
    if not links:
        return NO_LINK
    if len(links) == 1:
        return links[0].department or NO_DEPT
    act = [l for l in links if l.status == "Active"]
    if len(act) == 1:
        return act[0].department or NO_DEPT
    return CONFLICT

groups = {}
scope = []
for u in users:
    g = dept_of(u.name)
    groups[g] = 1
    if dept_f and g != dept_f:
        continue
    scope.append(u)
if dept_f and dept_f not in groups:
    frappe.throw("Invalid department filter", title="Invalid Request")
scope_names = {}
for u in scope:
    scope_names[u.name] = 1

def bucket_key(dt):
    s = str(dt)
    return s[0:10] if gran == "day" else s[0:7]

def empty_buckets():
    keys = []
    if gran == "day":
        d = d_from
        while d <= d_to:
            keys.append(str(d))
            d = frappe.utils.getdate(frappe.utils.add_days(d, 1))
    else:
        y = d_from.year
        m = d_from.month
        while (y < d_to.year) or (y == d_to.year and m <= d_to.month):
            keys.append(str(y) + "-" + ("0" + str(m) if m < 10 else str(m)))
            m = m + 1
            if m > 12:
                m = 1
                y = y + 1
    out = {}
    for k in keys:
        out[k] = 0
    return [keys, out]

created_b = empty_buckets()
login_b = empty_buckets()
new_users = 0
new_enabled = 0
new_system = 0
ll_count = 0
for u in scope:
    c = frappe.utils.get_datetime(u.creation) if u.creation else None
    if c and c >= start_dt and c < end_excl:
        new_users = new_users + 1
        if u.enabled:
            new_enabled = new_enabled + 1
        if u.user_type == "System User":
            new_system = new_system + 1
        k = bucket_key(c)
        if k in created_b[1]:
            created_b[1][k] = created_b[1][k] + 1
    l = frappe.utils.get_datetime(u.last_login) if u.last_login else None
    if l and l >= start_dt and l < end_excl:
        ll_count = ll_count + 1
        k2 = bucket_key(l)
        if k2 in login_b[1]:
            login_b[1][k2] = login_b[1][k2] + 1

# ---- login events: only when Activity Log retention covers the whole range ----
first_log = frappe.db.sql(
    """select min(creation) from `tabActivity Log` where operation = 'Login'""")[0][0]
events = {"available": False, "reason": None, "earliest_record": str(first_log)[0:10] if first_log else None}
if not first_log:
    events["reason"] = "no_records"
elif frappe.utils.get_datetime(first_log) > start_dt:
    events["reason"] = "outside_retention"
else:
    rows = frappe.db.sql(
        """select user, status, count(*) as n from `tabActivity Log`
           where operation = 'Login' and creation >= %(s)s and creation < %(e)s
           group by user, status""",
        {"s": start_dt, "e": end_excl},
        as_dict=True,
    )
    succ = 0
    fail = 0
    distinct = 0
    for r in rows:
        if r.user not in scope_names:
            continue
        if r.status == "Success":
            succ = succ + r.n
            distinct = distinct + 1
        elif r.status == "Failed":
            fail = fail + r.n
    events = {"available": True, "reason": None, "earliest_record": str(first_log)[0:10],
              "successful_logins": succ, "failed_logins": fail, "users_with_logins": distinct}

frappe.response["message"] = {
    "from_date": str(d_from), "to_date": str(d_to), "days": days, "granularity": gran,
    "timezone": frappe.utils.get_time_zone(), "report_timestamp": str(now)[0:19],
    "department_filter": dept_f or None, "scope_users": len(scope),
    "new_users_created": new_users, "new_users_enabled_now": new_enabled, "new_system_users": new_system,
    "last_login_in_period": ll_count,
    "login_events": events,
    "creation_trend": [{"period": k, "count": created_b[1][k]} for k in created_b[0]],
    "last_login_distribution": [{"period": k, "count": login_b[1][k]} for k in login_b[0]],
    "notes": [
        "New Users Created uses User.creation within the selected dates (inclusive, Asia/Riyadh).",
        "Last login in selected period uses each user's CURRENT last_login only; earlier logins are overwritten and are not login events.",
        "Login events are shown only when the Activity Log retention covers the whole selected range.",
    ],
}
