# Server Script · type API · method: daily_tasks_dashboard_data          (Daily Tasks & Visits dashboard; replaces "Task Dashboard")
#
# Sources: Employee Task Management (task submissions; DocType readable by System Manager only, so this API applies the
# scope below) and Sales Staff Daily Task Management (salesperson daily updates).
# Who sees what (decided here from the logged-in user):
#   all   : CFG["all_roles"] or CFG["full_access_users"]
#   dept  : CFG["manager_roles"] -> records of employees in the user's own Employee department(s) (+ CFG["extra_departments"]);
#           for sales updates also those where the user is the section manager.
#   own   : everyone else -> only their own records.
# Read-only.

CFG = {
    "all_roles": ["CEO", "ED - Afroze"],
    "manager_roles": ["Line Manager", "Section Manager", "Sales Manager"],
    "full_access_users": [],
    "extra_departments": {},
    "row_limit": 1000,
}

U = frappe.utils
user = frappe.session.user
if user == "Guest":
    frappe.throw("Not permitted.", title="Not Permitted")
fd = frappe.form_dict
roles = [r.role for r in frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, fields=["role"])]
today = U.getdate(U.nowdate())
try:
    p_from = str(U.getdate(fd.get("from_date"))) if fd.get("from_date") else str(U.add_days(today, -1))
    p_to = str(U.getdate(fd.get("to_date"))) if fd.get("to_date") else str(U.add_days(today, -1))
except Exception:
    frappe.throw("Invalid date.")
if p_from > p_to:
    frappe.throw("Invalid date range.")

me = frappe.get_all("Employee", filters={"user_id": user}, fields=["name", "employee_name", "department"], limit_page_length=0)
my_ids = [e.name for e in me]
my_depts = [e.department for e in me if e.department] + (CFG["extra_departments"].get(user) or [])
if user in CFG["full_access_users"] or len([r for r in roles if r in CFG["all_roles"]]) > 0:
    scope = "all"
elif len([r for r in roles if r in CFG["manager_roles"]]) > 0 and my_depts:
    scope = "dept"
elif my_ids:
    scope = "own"
else:
    frappe.throw("Your user is not linked to an Employee record.", title="Not linked")

emp_ids = []
if scope == "dept":
    emp_ids = [e.name for e in frappe.get_all("Employee", filters={"department": ["in", my_depts]}, fields=["name"], limit_page_length=0)]
elif scope == "own":
    emp_ids = my_ids
EMP = {}
for e in frappe.get_all("Employee", fields=["name", "employee_name", "department", "branch"], limit_page_length=0):
    EMP[e.name] = e

# ---------------- task submissions
tf = [["date", "between", [p_from, p_to]]]
if scope == "dept":
    tf.append(["employee", "in", emp_ids or ["-"]])
elif scope == "own":
    tf.append(["employee", "in", my_ids])
tasks = frappe.get_all("Employee Task Management", filters=tf, fields=["name", "employee", "employee_division", "date", "status", "task_category", "branch", "assigned_by", "customer"],
                       order_by="date desc, name desc", limit_page_length=0)
# ---------------- salesperson daily updates
sf = [["date", "between", [p_from, p_to]], ["docstatus", "<", 2]]
sales = frappe.get_all("Sales Staff Daily Task Management", filters=sf, fields=["name", "date", "employee_name", "sec_manager", "visit_status", "emp_branch", "docstatus",
                       "sales_invoice_amount", "collection_amount", "sales_order_amount", "order_received", "delivery_pending"], order_by="date desc, name desc", limit_page_length=0)
if scope == "dept":
    sales = [r for r in sales if r.employee_name in emp_ids or r.sec_manager in my_ids]
elif scope == "own":
    sales = [r for r in sales if r.employee_name in my_ids]


def ename(eid):
    e = EMP.get(eid)
    return e.employee_name if e else (eid or "")


def edept(eid):
    e = EMP.get(eid)
    return e.department if e else ""


def count_by(rows, key):
    m = {}
    for r in rows:
        k = r.get(key) or "Not set"
        m[k] = m.get(k, 0) + 1
    return sorted([{"label": k, "count": m[k]} for k in m], key=lambda x: -x["count"])


trows = [{"name": r.name, "date": str(r.date or ""), "employee": r.employee, "employee_name": ename(r.employee), "department": r.employee_division or edept(r.employee),
          "status": r.status or "", "category": r.task_category or "", "branch": r.branch or "", "assigned_by": r.assigned_by or "", "customer": r.customer or ""} for r in tasks]
srows = [{"name": r.name, "date": str(r.date or ""), "employee": r.employee_name, "employee_name": ename(r.employee_name), "section_manager": ename(r.sec_manager),
          "status": r.visit_status or "", "branch": r.emp_branch or "", "draft": 1 if r.docstatus == 0 else 0, "invoiced": U.flt(r.sales_invoice_amount),
          "collected": U.flt(r.collection_amount), "ordered": U.flt(r.sales_order_amount), "orders": r.order_received or 0, "deliveries_pending": r.delivery_pending or 0} for r in sales]
LIM = CFG["row_limit"]
frappe.response["message"] = {
    "meta": {"scope": scope, "from": p_from, "to": p_to, "departments": my_depts if scope == "dept" else [], "row_limit": LIM,
             "totals": {"tasks": len(trows), "sales": len(srows)}},
    "tasks": {"total": len(trows), "employees": len(set([r["employee"] for r in trows])), "by_department": count_by(trows, "department"),
              "by_status": count_by(trows, "status"), "rows": trows[:LIM]},
    "sales": {"total": len(srows), "employees": len(set([r["employee"] for r in srows])), "by_branch": count_by(srows, "branch"), "by_status": count_by(srows, "status"),
              "invoiced": sum([r["invoiced"] for r in srows]), "collected": sum([r["collected"] for r in srows]), "ordered": sum([r["ordered"] for r in srows]), "rows": srows[:LIM]},
}
