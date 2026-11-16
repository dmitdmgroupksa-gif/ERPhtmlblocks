# ERP User Access Dashboard - read-only Role Access API (Step 6)
# Endpoint: /api/method/user_access_roles   (GET)
# mode=list (default)            -> role distribution + headline KPIs
# mode=users&role=<Role>         -> in-scope users assigned to that role (approved fields only)
# mode=permissions&role=<Role>   -> role-level DocType permission CONFIGURATION (permlevel 0)
# Optional: ref_date=YYYY-MM-DD (today or yesterday) to align cutoffs with the Overview.
ALLOWED = ["System Manager", "IT Coordinator", "Dashboard Manager"]
PRIV = ["System Manager", "IT Coordinator", "Dashboard Manager"]
IMPORTANT = ["System Manager", "IT Coordinator", "Dashboard Manager", "ERP AI User"]
NO_LINK = "Unassigned – No Employee Link"
NO_DEPT = "Unassigned – No Department"
CONFLICT = "Mapping Conflict"

# ---- authorization first ----
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

mode = param("mode").lower() or "list"
if mode not in ["list", "users", "permissions"]:
    frappe.throw("Invalid mode", title="Invalid Request")

role_f = param("role")
if mode != "list":
    if not role_f or len(role_f) > 140:
        frappe.throw("Role is required", title="Invalid Request")
    if not frappe.db.sql("""select count(*) from `tabRole` where name = %(r)s""", {"r": role_f})[0][0]:
        frappe.throw("Invalid role", title="Invalid Request")

# ---- cutoff (same rule as Summary / Directory APIs) ----
now = frappe.utils.now_datetime()
today = frappe.utils.getdate(now)
ref = today
ref_raw = param("ref_date")
if ref_raw:
    if len(ref_raw) != 10 or ref_raw[4] != "-" or ref_raw[7] != "-" or not (ref_raw[0:4] + ref_raw[5:7] + ref_raw[8:10]).isdigit():
        frappe.throw("Invalid reference date", title="Invalid Request")
    ref = frappe.utils.getdate(ref_raw)
    if ref != today and ref != frappe.utils.getdate(frappe.utils.add_days(today, -1)):
        frappe.throw("Reference date must be today or yesterday", title="Invalid Request")
cut15 = frappe.utils.get_datetime(frappe.utils.add_days(ref, -15))

def status_of(u):
    if not u.enabled:
        return "Disabled"
    if u.last_login and frappe.utils.get_datetime(u.last_login) >= cut15:
        return "Active"
    return "Inactive"

base = {"report_timestamp": str(now)[0:19], "ref_date": str(ref), "cutoff_15_days": str(cut15),
        "timezone": frappe.utils.get_time_zone(), "privileged_roles": PRIV, "important_roles": IMPORTANT}

# =====================================================================
if mode == "permissions":
    custom_parents = set([r[0] for r in frappe.db.sql("""select distinct parent from `tabCustom DocPerm`""")])
    rows = frappe.db.sql(
        """select parent, `read`, `write`, `create`, `delete`, `submit`, `export`, 'Custom' as src
           from `tabCustom DocPerm` where role = %(r)s and permlevel = 0""",
        {"r": role_f}, as_dict=True)
    std = frappe.db.sql(
        """select parent, `read`, `write`, `create`, `delete`, `submit`, `export`, 'Standard' as src
           from `tabDocPerm` where role = %(r)s and permlevel = 0""",
        {"r": role_f}, as_dict=True)
    # Frappe rule: if a DocType has ANY Custom DocPerm rows, standard DocPerm rows are ignored for it.
    for s in std:
        if s.parent not in custom_parents:
            rows.append(s)
    merged = {}
    for r in rows:
        m = merged.get(r.parent)
        if not m:
            m = {"doctype": r.parent, "source": r.src, "read": 0, "write": 0, "create": 0,
                 "delete": 0, "submit": 0, "export": 0}
            merged[r.parent] = m
        for k in ["read", "write", "create", "delete", "submit", "export"]:
            if r[k]:
                m[k] = 1
    perms = [merged[k] for k in merged]
    perms = sorted(perms, key=lambda p: p["doctype"].lower())
    base.update({"mode": "permissions", "role": role_f, "doctype_count": len(perms), "permissions": perms,
                 "note": "Role-level permission configuration (permission level 0) from DocPerm / Custom DocPerm. "
                         "This is not guaranteed effective access: User Permissions, ownership rules, sharing, "
                         "permission levels and other roles also affect what a user can actually do."})
    frappe.response["message"] = base

# =====================================================================
elif mode == "users":
    users = frappe.db.sql(
        """select u.name, u.full_name, u.email, u.enabled, u.user_type, u.last_login
           from `tabUser` u
           where u.name not in ('Administrator', 'Guest')
             and exists (select 1 from `tabHas Role` hr
                         where hr.parenttype = 'User' and hr.parent = u.name and hr.role = %(r)s)""",
        {"r": role_f}, as_dict=True)
    names = [u.name for u in users] or ["-"]
    emps = frappe.db.sql(
        """select name, user_id, status, department from `tabEmployee` where user_id in %(n)s""",
        {"n": names}, as_dict=True)
    emp_map = {}
    for e in emps:
        emp_map.setdefault(e.user_id, []).append(e)
    out = []
    for u in users:
        links = emp_map.get(u.name) or []
        conflict = 0
        if not links:
            dept = NO_LINK
        elif len(links) == 1:
            dept = links[0].department or NO_DEPT
        else:
            conflict = 1
            act = [l for l in links if l.status == "Active"]
            dept = (act[0].department or NO_DEPT) if len(act) == 1 else CONFLICT
        out.append({"user": u.name, "full_name": u.full_name or u.name, "email": u.email or u.name,
                    "department": dept, "status": status_of(u), "user_type": u.user_type,
                    "last_login": str(u.last_login)[0:19] if u.last_login else None,
                    "mapping_conflict": conflict})
    out = sorted(out, key=lambda x: x["full_name"].lower())
    base.update({"mode": "users", "role": role_f, "privileged": 1 if role_f in PRIV else 0,
                 "total": len(out), "users": out})
    frappe.response["message"] = base

# =====================================================================
else:
    roles = frappe.db.sql("""select name, disabled, desk_access from `tabRole`""", as_dict=True)
    users = frappe.db.sql(
        """select name, enabled, last_login from `tabUser` where name not in ('Administrator', 'Guest')""",
        as_dict=True)
    st = {}
    for u in users:
        st[u.name] = status_of(u)
    hr = frappe.db.sql(
        """select distinct parent, role from `tabHas Role`
           where parenttype = 'User' and parent not in ('Administrator', 'Guest')""",
        as_dict=True)
    per_role = {}
    for h in hr:
        s = st.get(h.parent)
        if not s:
            continue
        per_role.setdefault(h.role, {})[h.parent] = s   # dict keyed by user -> each user once per role
    out = []
    priv_users = {}
    for r in roles:
        members = per_role.get(r.name) or {}
        a = 0
        i = 0
        d = 0
        for k in members:
            v = members[k]
            if v == "Active":
                a = a + 1
            elif v == "Inactive":
                i = i + 1
            else:
                d = d + 1
            if r.name in PRIV and v != "Disabled":
                priv_users[k] = 1
        out.append({"role": r.name, "total": len(members), "enabled": a + i, "disabled": d,
                    "active": a, "inactive": i, "privileged": 1 if r.name in PRIV else 0,
                    "important": 1 if r.name in IMPORTANT else 0, "role_disabled": 1 if r.disabled else 0,
                    "desk_access": 1 if r.desk_access else 0})
    assigned = len([x for x in out if x["total"] > 0])
    base.update({"mode": "list", "total_roles": len(roles), "roles_assigned": assigned,
                 "roles_unassigned": len(roles) - assigned,
                 "disabled_roles": len([r for r in roles if r.disabled]),
                 "privileged_role_count": len([r for r in roles if r.name in PRIV]),
                 "users_with_privileged_access": len(priv_users),
                 "scope_users": len(users), "roles": out})
    frappe.response["message"] = base
