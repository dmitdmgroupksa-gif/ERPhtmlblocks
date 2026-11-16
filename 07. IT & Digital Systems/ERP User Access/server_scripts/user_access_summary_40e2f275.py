# ERP User Access Dashboard - read-only summary API (Step 4)
# Endpoint: /api/method/user_access_summary   (GET)
# Optional param: department (reporting group name) - filters every figure.
ALLOWED = ["System Manager", "IT Coordinator", "Dashboard Manager"]
PRIV = ["System Manager", "IT Coordinator", "Dashboard Manager"]
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

dept_filter = (frappe.form_dict.get("department") or "").strip()

now = frappe.utils.now_datetime()
today = frappe.utils.getdate(now)
cut15 = frappe.utils.get_datetime(frappe.utils.add_days(today, -15))
cut30 = frappe.utils.get_datetime(frappe.utils.add_days(today, -30))

users = frappe.db.sql(
    """select name, enabled, user_type, last_login from `tabUser`
       where name not in ('Administrator', 'Guest')""",
    as_dict=True,
)
priv_rows = frappe.db.sql(
    """select distinct parent from `tabHas Role`
       where parenttype = 'User' and role in %(roles)s""",
    {"roles": PRIV},
    as_dict=True,
)
priv_set = set([r.parent for r in priv_rows])
emps = frappe.db.sql(
    """select user_id, status, department from `tabEmployee`
       where ifnull(user_id, '') != ''""",
    as_dict=True,
)
emp_map = {}
for e in emps:
    emp_map.setdefault(e.user_id, []).append(e)

def dept_of(name):
    links = emp_map.get(name) or []
    if not links:
        return NO_LINK, False
    if len(links) == 1:
        return (links[0].department or NO_DEPT), False
    active = [l for l in links if l.status == "Active"]
    if len(active) == 1:
        return (active[0].department or NO_DEPT), True
    return CONFLICT, True

rows = []
all_groups = {}
for u in users:
    dm = dept_of(u.name)
    grp = dm[0]
    conflict = dm[1]
    all_groups[grp] = all_groups.get(grp, 0) + 1
    if u.enabled:
        ll = frappe.utils.get_datetime(u.last_login) if u.last_login else None
        status = "Active" if (ll and ll >= cut15) else "Inactive"
    else:
        ll = None
        status = "Disabled"
    rows.append({
        "dept": grp, "conflict": conflict, "status": status,
        "enabled": u.enabled, "ll": ll, "type": u.user_type,
        "priv": 1 if (u.enabled and u.name in priv_set) else 0,
        "no_link": grp == NO_LINK,
    })

if dept_filter:
    rows = [r for r in rows if r["dept"] == dept_filter]

def cnt(fn):
    return len([r for r in rows if fn(r)])

total = len(rows)
active = cnt(lambda r: r["status"] == "Active")
inactive = cnt(lambda r: r["status"] == "Inactive")
disabled = cnt(lambda r: r["status"] == "Disabled")

dist = []
for pair in [["Active", active], ["Inactive", inactive], ["Disabled", disabled]]:
    dist.append({"status": pair[0], "count": pair[1],
                 "percent": round(pair[1] * 100.0 / total, 1) if total else 0})

dept_counts = {}
for r in rows:
    dept_counts[r["dept"]] = dept_counts.get(r["dept"], 0) + 1
dept_dist = [{"department": k, "count": dept_counts[k]} for k in dept_counts]
dept_dist.sort(key=lambda d: -d["count"])

frappe.response["message"] = {
    "scope": "All User accounts except Administrator and Guest",
    "department_filter": dept_filter or None,
    "report_timestamp": str(now),
    "cutoff_15_days": str(cut15),
    "cutoff_30_days": str(cut30),
    "timezone": frappe.utils.get_time_zone(),
    "total_users": total,
    "enabled_users": active + inactive,
    "active_users": active,
    "inactive_users": inactive,
    "disabled_users": disabled,
    "privileged_users": cnt(lambda r: r["priv"]),
    "system_users": cnt(lambda r: r["type"] == "System User"),
    "website_users": cnt(lambda r: r["type"] == "Website User"),
    "status_distribution": dist,
    "department_distribution": dept_dist,
    "department_options": sorted(all_groups.keys()),
    "data_quality": {
        "enabled_inactive_15_plus": inactive,
        "enabled_inactive_30_plus": cnt(lambda r: r["enabled"] and (r["ll"] is None or r["ll"] < cut30)),
        "never_logged_in_enabled": cnt(lambda r: r["enabled"] and r["ll"] is None),
        "without_employee_link": cnt(lambda r: r["no_link"]),
        "without_department": cnt(lambda r: r["dept"] == NO_DEPT),
        "mapping_conflicts": cnt(lambda r: r["conflict"]),
        "privileged_enabled": cnt(lambda r: r["priv"]),
    },
    "overlap_notes": [
        "Privileged users are also counted in Active or Inactive.",
        "Inactive 30+ is a subset of Inactive 15+.",
        "Data-quality categories may overlap with each other and with any status; they are not additive.",
        "Mapping conflicts resolved to a single Active Employee are reported under that department and still counted as conflicts.",
    ],
}
