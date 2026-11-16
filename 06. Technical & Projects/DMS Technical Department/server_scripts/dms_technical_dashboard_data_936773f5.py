# ============================================================
# DMS Technical Dashboard Data
# Script Type: API   |   API Method: dms_technical_dashboard_data
# Source: DMS Technical Submittal (list read with the user's own
# permissions + permission query, so salespeople only see their own)
# ============================================================

args = frappe.form_dict
today = frappe.utils.getdate(frappe.utils.nowdate())

OPEN = ["Requested", "In Preparation", "Revision Required"]
WAITING = ["Submitted", "Under Review"]
APPROVED = ["Approved", "Approved with Comments"]
STATUSES = ["Requested", "In Preparation", "Submitted", "Under Review",
            "Revision Required", "Approved", "Approved with Comments", "Rejected", "Cancelled"]
PRIORITY_RANK = {"Urgent": 0, "High": 1, "Normal": 2}

# ---------------- filters ----------------
base = []
if args.get("department"):
    base.append(["department", "=", args.get("department")])
if args.get("sales_person"):
    base.append(["sales_person", "=", args.get("sales_person")])
if args.get("dms_project"):
    base.append(["dms_project", "=", args.get("dms_project")])
if args.get("priority"):
    base.append(["priority", "=", args.get("priority")])
if args.get("from_date"):
    base.append(["creation", ">=", args.get("from_date")])
if args.get("to_date"):
    base.append(["creation", "<", frappe.utils.add_days(args.get("to_date"), 1)])
status_filter = args.get("status") or ""

FIELDS = ["name", "status", "priority", "dms_project", "project_name", "client",
          "sales_person", "requested_by", "department", "required_date",
          "submittal_date", "approval_date", "submission_type", "revision_no",
          "creation", "modified"]

# frappe.get_list applies role permissions + the DMS permission query
rows = frappe.get_list("DMS Technical Submittal", filters=base, fields=FIELDS,
                       order_by="creation desc", limit_page_length=0)

# ---------------- lookups (names, project codes, product counts) ----------------
names = [r.name for r in rows]
product_count = {}
if names:
    for c in frappe.get_all("DMS Technical Submittal Product",
                            filters={"parent": ["in", names], "parenttype": "DMS Technical Submittal"},
                            fields=["parent"], limit_page_length=0):
        product_count[c.parent] = product_count.get(c.parent, 0) + 1

proj_ids = list(set([r.dms_project for r in rows if r.dms_project]))
proj_code = {}
if proj_ids:
    for p in frappe.get_all("DMS Project", filters={"name": ["in", proj_ids]},
                            fields=["name", "project_code"], limit_page_length=0):
        proj_code[p.name] = p.project_code or p.name

users = list(set([r.requested_by for r in rows if r.requested_by]))
user_name = {}
if users:
    for u in frappe.get_all("User", filters={"name": ["in", users]},
                            fields=["name", "full_name"], limit_page_length=0):
        user_name[u.name] = u.full_name or u.name

emps = list(set([r.sales_person for r in rows if r.sales_person]))
emp_name = {}
if emps:
    for e in frappe.get_all("Employee", filters={"name": ["in", emps]},
                            fields=["name", "employee_name"], limit_page_length=0):
        emp_name[e.name] = e.employee_name or e.name

# ---------------- shape rows ----------------
items = []
for r in rows:
    req = frappe.utils.getdate(r.required_date) if r.required_date else None
    days_left = frappe.utils.date_diff(req, today) if req else None
    overdue = bool(req and r.status in OPEN and req < today)
    waiting_days = None
    if r.status in WAITING and r.submittal_date:
        waiting_days = frappe.utils.date_diff(today, r.submittal_date)
    items.append({
        "name": r.name,
        "status": r.status or "Requested",
        "priority": r.priority or "Normal",
        "dms_project": r.dms_project,
        "project_code": proj_code.get(r.dms_project, r.dms_project),
        "project_name": r.project_name,
        "client": r.client,
        "sales_person": r.sales_person,
        "sales_person_name": emp_name.get(r.sales_person, r.sales_person),
        "requested_by": user_name.get(r.requested_by, r.requested_by),
        "department": r.department,
        "required_date": str(r.required_date) if r.required_date else None,
        "submittal_date": str(r.submittal_date) if r.submittal_date else None,
        "approval_date": str(r.approval_date) if r.approval_date else None,
        "request_date": str(r.creation)[:10],
        "submission_type": r.submission_type,
        "revision_no": r.revision_no or "0",
        "products": product_count.get(r.name, 0),
        "days_left": days_left,
        "overdue": overdue,
        "waiting_days": waiting_days,
    })

# ---------------- summary cards (ignore the status filter) ----------------
counts = {"total": len(items), "overdue": 0}
for s in STATUSES:
    counts[s] = 0
for it in items:
    counts[it["status"]] = counts.get(it["status"], 0) + 1
    if it["overdue"]:
        counts["overdue"] = counts["overdue"] + 1

# ---------------- tables (respect the status filter) ----------------
# (explicit loops: server-script sandbox functions/comprehensions can't see script variables)
action = []
review = []
approved = []
recent = []
for it in items:
    if status_filter == "Overdue" and not it["overdue"]:
        continue
    if status_filter and status_filter != "Overdue" and it["status"] != status_filter:
        continue
    recent.append(it)
    if it["status"] in OPEN or it["overdue"]:
        it["sort_key"] = ("0" if it["overdue"] else "1") + str(PRIORITY_RANK.get(it["priority"], 3)) + (it["required_date"] or "9999-12-31")
        action.append(it)
    if it["status"] in WAITING:
        review.append(it)
    if it["status"] in APPROVED:
        approved.append(it)

action = sorted(action, key=lambda x: x["sort_key"])
review = sorted(review, key=lambda x: x["submittal_date"] or "9999-12-31")
approved = sorted(approved, key=lambda x: x["approval_date"] or "", reverse=True)

# ---------------- filter options (from what this user can see) ----------------
# options come from ALL records this user may see (not the filtered set),
# so a selected filter can be switched without pressing Reset
opt_dept = {}
opt_sp = {}
opt_proj = {}
all_rows = frappe.get_list("DMS Technical Submittal",
                           fields=["department", "sales_person", "dms_project", "project_name"],
                           limit_page_length=0)
extra_emp = list(set([r.sales_person for r in all_rows if r.sales_person]))
extra_proj = list(set([r.dms_project for r in all_rows if r.dms_project]))
if extra_emp:
    for e in frappe.get_all("Employee", filters={"name": ["in", extra_emp]},
                            fields=["name", "employee_name"], limit_page_length=0):
        emp_name[e.name] = e.employee_name or e.name
if extra_proj:
    for p in frappe.get_all("DMS Project", filters={"name": ["in", extra_proj]},
                            fields=["name", "project_code"], limit_page_length=0):
        proj_code[p.name] = p.project_code or p.name
for r in all_rows:
    if r.department:
        opt_dept[r.department] = r.department
    if r.sales_person:
        opt_sp[r.sales_person] = emp_name.get(r.sales_person, r.sales_person)
    if r.dms_project:
        opt_proj[r.dms_project] = (proj_code.get(r.dms_project) or r.dms_project) + " - " + (r.project_name or "")

options = {"department": [], "sales_person": [], "dms_project": []}
for k in sorted(opt_dept.keys()):
    options["department"].append({"value": k, "label": opt_dept[k]})
for k in sorted(opt_sp.keys()):
    options["sales_person"].append({"value": k, "label": opt_sp[k]})
for k in sorted(opt_proj.keys()):
    options["dms_project"].append({"value": k, "label": opt_proj[k]})

frappe.response["message"] = {
    "counts": counts,
    "action": action[:100],
    "review": review[:100],
    "approved": approved[:25],
    "recent": recent[:25],
    "options": options,
    "today": str(today),
}
