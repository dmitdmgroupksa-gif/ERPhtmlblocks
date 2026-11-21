# ERP User Access Dashboard - read-only User Directory API (Step 5)
# Endpoint: /api/method/user_access_directory  (GET)
# Params (all optional, all validated):
#   status=all|active|inactive|disabled|privileged   department=<reporting group>
#   user_type=System User|Website User   role=<role name>   search=<text, max 100>
#   inactivity=15|30|60|never   sort_by=full_name|user|department|user_type|status|last_login
#   sort_order=asc|desc   page=1..   page_size=20|50|100   ref_date=YYYY-MM-DD (today or yesterday)
ALLOWED = ["System Manager", "IT Coordinator", "Dashboard Manager"]
PRIV = ["System Manager", "IT Coordinator", "Dashboard Manager"]
NO_LINK = "Unassigned – No Employee Link"
NO_DEPT = "Unassigned – No Department"
CONFLICT = "Mapping Conflict"

# ---- 1. authorization (before any data query) ----
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

# ---- 2. input validation ----
fd = frappe.form_dict
def param(key):
    v = fd.get(key)
    return ("" if v is None else str(v)).strip()

status_f = param("status").lower() or "all"
if status_f not in ["all", "active", "inactive", "disabled", "privileged"]:
    frappe.throw("Invalid status filter", title="Invalid Request")
user_type_f = param("user_type")
if user_type_f and user_type_f not in ["System User", "Website User"]:
    frappe.throw("Invalid user type filter", title="Invalid Request")
inact_f = param("inactivity").lower()
if inact_f and inact_f not in ["15", "30", "60", "never", "b16_30", "b31_60", "b61"]:
    frappe.throw("Invalid inactivity filter", title="Invalid Request")
flag_f = param("flag").lower()
if flag_f and flag_f not in ["multi_priv", "conflict"]:
    frappe.throw("Invalid flag filter", title="Invalid Request")
# ---- optional date basis (inclusive Start/End dates, Asia/Riyadh) ----
date_basis = param("date_basis").lower()
if date_basis and date_basis not in ["created", "last_login"]:
    frappe.throw("Invalid date basis", title="Invalid Request")
db_from = None
db_to_excl = None
db_from_s = ""
db_to_s = ""
if date_basis:
    db_from_s = param("from_date")
    db_to_s = param("to_date")
    if not db_from_s or not db_to_s:
        frappe.throw("Both Start Date and End Date are required.", title="Invalid Date Range")
    for dv in [db_from_s, db_to_s]:
        if len(dv) != 10 or dv[4] != "-" or dv[7] != "-" or not (dv[0:4] + dv[5:7] + dv[8:10]).isdigit():
            frappe.throw("Dates must use the format YYYY-MM-DD.", title="Invalid Date Range")
    dbf = frappe.utils.getdate(db_from_s)
    dbt = frappe.utils.getdate(db_to_s)
    if str(dbf) != db_from_s or str(dbt) != db_to_s:
        frappe.throw("Invalid calendar date.", title="Invalid Date Range")
    if dbf > dbt:
        frappe.throw("Start Date cannot be after End Date.", title="Invalid Date Range")
    if dbf < frappe.utils.getdate("2000-01-01") or frappe.utils.date_diff(dbt, dbf) + 1 > 3660:
        frappe.throw("Unsupported date range (from 2000-01-01, maximum 10 years).", title="Invalid Date Range")
    db_from = frappe.utils.get_datetime(str(dbf) + " 00:00:00")
    db_to_excl = frappe.utils.get_datetime(str(frappe.utils.add_days(dbt, 1)) + " 00:00:00")
search_f = param("search").lower()
if len(search_f) > 100:
    frappe.throw("Search text too long", title="Invalid Request")
sort_by = param("sort_by") or "full_name"
if sort_by not in ["full_name", "user", "department", "user_type", "status", "last_login"]:
    frappe.throw("Invalid sort field", title="Invalid Request")
sort_order = param("sort_order").lower() or "asc"
if sort_order not in ["asc", "desc"]:
    frappe.throw("Invalid sort order", title="Invalid Request")
page_size_raw = param("page_size") or "20"
if page_size_raw not in ["20", "50", "100"]:
    frappe.throw("Invalid page size (allowed: 20, 50, 100)", title="Invalid Request")
page_size = int(page_size_raw)
page_raw = param("page") or "1"
if not page_raw.isdigit() or int(page_raw) < 1 or int(page_raw) > 100000:
    frappe.throw("Invalid page number", title="Invalid Request")
page = int(page_raw)

# ---- 3. reference date / cutoffs (same rule as Summary API) ----
now = frappe.utils.now_datetime()
today = frappe.utils.getdate(now)
ref_raw = param("ref_date")
ref = today
if ref_raw:
    if len(ref_raw) != 10 or ref_raw[4] != "-" or ref_raw[7] != "-" or not (ref_raw[0:4] + ref_raw[5:7] + ref_raw[8:10]).isdigit():
        frappe.throw("Invalid reference date", title="Invalid Request")
    ref = frappe.utils.getdate(ref_raw)
    if ref != today and ref != frappe.utils.getdate(frappe.utils.add_days(today, -1)):
        frappe.throw("Reference date must be today or yesterday", title="Invalid Request")
cut15 = frappe.utils.get_datetime(frappe.utils.add_days(ref, -15))
cut30 = frappe.utils.get_datetime(frappe.utils.add_days(ref, -30))
cut60 = frappe.utils.get_datetime(frappe.utils.add_days(ref, -60))

# ---- 4. read-only data (3 static/parameterized queries) ----
users = frappe.db.sql(
    """select name, full_name, email, enabled, user_type, last_login, creation from `tabUser`
       where name not in ('Administrator', 'Guest')""",
    as_dict=True,
)
role_rows = frappe.db.sql(
    """select parent, role from `tabHas Role`
       where parenttype = 'User' and parent not in ('Administrator', 'Guest')""",
    as_dict=True,
)
roles_by_user = {}
for r in role_rows:
    roles_by_user.setdefault(r.parent, []).append(r.role)
emps = frappe.db.sql(
    """select name, user_id, status, department from `tabEmployee`
       where ifnull(user_id, '') != ''""",
    as_dict=True,
)
emp_map = {}
for e in emps:
    emp_map.setdefault(e.user_id, []).append(e)

def map_emp(name):
    links = emp_map.get(name) or []
    if not links:
        return {"dept": NO_LINK, "emp": None, "conflict": False, "links": 0}
    if len(links) == 1:
        return {"dept": links[0].department or NO_DEPT, "emp": links[0].name, "conflict": False, "links": 1}
    active = [l for l in links if l.status == "Active"]
    if len(active) == 1:
        return {"dept": active[0].department or NO_DEPT, "emp": active[0].name, "conflict": True, "links": len(links)}
    return {"dept": CONFLICT, "emp": None, "conflict": True, "links": len(links)}

rows = []
dept_set = {}
role_set = {}
for u in users:
    m = map_emp(u.name)
    dept_set[m["dept"]] = 1
    ll = frappe.utils.get_datetime(u.last_login) if u.last_login else None
    if u.enabled:
        status = "Active" if (ll and ll >= cut15) else "Inactive"
    else:
        status = "Disabled"
    roles = sorted(roles_by_user.get(u.name) or [])
    for rn in roles:
        role_set[rn] = 1
    rows.append({
        "user": u.name,
        "full_name": u.full_name or u.name,
        "email": u.email or u.name,
        "user_type": u.user_type,
        "enabled": 1 if u.enabled else 0,
        "status": status,
        "last_login": str(ll)[0:19] if ll else None,
        "ll": ll,
        "created": frappe.utils.get_datetime(u.creation) if u.creation else None,
        "employee": m["emp"],
        "department": m["dept"],
        "roles": roles,
        "privileged": 1 if (u.enabled and [x for x in roles if x in PRIV]) else 0,
        "mapping_conflict": 1 if m["conflict"] else 0,
        "employee_links": m["links"],
    })

dept_f = param("department")
if dept_f and dept_f not in dept_set:
    frappe.throw("Invalid department filter", title="Invalid Request")
role_f = param("role")
if role_f and role_f not in role_set:
    frappe.throw("Invalid role filter", title="Invalid Request")

# ---- 5. filters (in memory, no user input reaches SQL) ----
def keep(r):
    if date_basis == "created" and not (r["created"] and r["created"] >= db_from and r["created"] < db_to_excl):
        return False
    if date_basis == "last_login" and not (r["ll"] and r["ll"] >= db_from and r["ll"] < db_to_excl):
        return False
    if status_f == "active" and r["status"] != "Active":
        return False
    if status_f == "inactive" and r["status"] != "Inactive":
        return False
    if status_f == "disabled" and r["status"] != "Disabled":
        return False
    if status_f == "privileged" and not r["privileged"]:
        return False
    if dept_f and r["department"] != dept_f:
        return False
    if user_type_f and r["user_type"] != user_type_f:
        return False
    if role_f and role_f not in r["roles"]:
        return False
    if inact_f:
        # inactivity filters apply to enabled accounts only (same as Overview)
        if not r["enabled"]:
            return False
        if inact_f == "never" and r["ll"] is not None:
            return False
        if inact_f == "15" and not (r["ll"] is None or r["ll"] < cut15):
            return False
        if inact_f == "30" and not (r["ll"] is None or r["ll"] < cut30):
            return False
        if inact_f == "60" and not (r["ll"] is None or r["ll"] < cut60):
            return False
        # mutually exclusive login-ageing buckets used by the Overview chart
        if inact_f == "b16_30" and not (r["ll"] is not None and cut30 <= r["ll"] < cut15):
            return False
        if inact_f == "b31_60" and not (r["ll"] is not None and cut60 <= r["ll"] < cut30):
            return False
        if inact_f == "b61" and not (r["ll"] is not None and r["ll"] < cut60):
            return False
    if flag_f == "multi_priv" and not (r["enabled"] and len([p for p in PRIV if p in r["roles"]]) >= 2):
        return False
    if flag_f == "conflict" and not r.get("mapping_conflict"):
        return False
    if search_f:
        hay = (r["full_name"] + " " + r["email"] + " " + r["user"]).lower()
        if search_f not in hay:
            return False
    return True

matched = [r for r in rows if keep(r)]

# ---- 6. sorting (whitelisted) ----
status_rank = {"Active": 1, "Inactive": 2, "Disabled": 3}
def sort_key(r):
    if sort_by == "last_login":
        return r["last_login"] or ""
    if sort_by == "status":
        return str(status_rank.get(r["status"], 9)) + r["full_name"].lower()
    if sort_by == "user":
        return r["user"].lower()
    if sort_by == "department":
        return r["department"].lower() + "|" + r["full_name"].lower()
    if sort_by == "user_type":
        return r["user_type"] + "|" + r["full_name"].lower()
    return r["full_name"].lower()
matched = sorted(matched, key=sort_key, reverse=(sort_order == "desc"))

# ---- 7. pagination ----
total = len(matched)
total_pages = (total + page_size - 1) // page_size if total else 0
start = (page - 1) * page_size
page_rows = matched[start:start + page_size]

# Doctype-level read permission on User for the CURRENT user (Custom DocPerm overrides DocPerm, as in Frappe)
my_roles = [x[0] for x in frappe.db.sql("""select role from `tabHas Role` where parenttype = 'User' and parent = %(u)s""", {"u": user})]
perm_table = "Custom DocPerm" if frappe.db.sql("""select count(*) from `tabCustom DocPerm` where parent = 'User'""")[0][0] else "DocPerm"
if perm_table == "Custom DocPerm":
    can_read_user = frappe.db.sql("""select count(*) from `tabCustom DocPerm` where parent = 'User' and `read` = 1 and permlevel = 0 and role in %(r)s""", {"r": my_roles or ["-"]})[0][0] > 0
else:
    can_read_user = frappe.db.sql("""select count(*) from `tabDocPerm` where parent = 'User' and `read` = 1 and permlevel = 0 and role in %(r)s""", {"r": my_roles or ["-"]})[0][0] > 0

out_rows = []
for r in page_rows:
    # Step 6: only System Manager holders who can read User records get the "Open in ERPNext" action
    can_open = True if (can_read_user and "System Manager" in my_roles) else False
    out_rows.append({
        "user": r["user"], "full_name": r["full_name"], "email": r["email"],
        "user_type": r["user_type"], "enabled": r["enabled"], "status": r["status"],
        "last_login": r["last_login"], "created": str(r["created"])[0:19] if r["created"] else None, "employee": r["employee"],
        "department": r["department"], "roles": r["roles"],
        "privileged": r["privileged"], "mapping_conflict": r["mapping_conflict"],
        "employee_links": r["employee_links"], "can_open": can_open,
    })

frappe.response["message"] = {
    "report_timestamp": str(now)[0:19],
    "ref_date": str(ref),
    "cutoff_15_days": str(cut15),
    "cutoff_30_days": str(cut30),
    "cutoff_60_days": str(cut60),
    "timezone": frappe.utils.get_time_zone(),
    "filters": {"date_basis": date_basis or None, "from_date": db_from_s or None, "to_date": db_to_s or None, "status": status_f, "department": dept_f or None, "user_type": user_type_f or None,
                "role": role_f or None, "search": search_f or None, "inactivity": inact_f or None},
    "sort_by": sort_by, "sort_order": sort_order,
    "page": page, "page_size": page_size,
    "total_matching": total, "total_pages": total_pages,
    "rows": out_rows,
    "options": {"departments": sorted(dept_set.keys()), "roles": sorted(role_set.keys()),
                "user_types": ["System User", "Website User"]},
}
