# Admin & HR Dashboard - Employee Directory API (Server Script, API method: admin_hr_employee_directory)
# READ-ONLY. Login required. Employee-level data: HR Manager / HR User only.
# Every query uses frappe.get_list -> DocType permissions + Employee User Permissions enforced.
# Server-side filtering, sorting (whitelisted fields) and pagination.

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
    frappe.throw("Not permitted.", title="Not Permitted")
if len([r for r in roles if r in DETAIL_ROLES]) == 0:
    frappe.throw("The employee directory is restricted to HR Manager / HR User.", title="Restricted")
if frappe.form_dict.get("preview_tier") == "aggregate":
    frappe.throw("Employee-level data is not shown in the aggregate preview.", title="Restricted")

fd = frappe.form_dict
companies = [c.get("name") for c in frappe.get_all("Company", fields=["name"], order_by="name asc")]  # names only
company = fd.get("company") or DEFAULT_COMPANY
if company not in companies:
    frappe.throw("Company not found.", title="Not Permitted")

STATUSES = ["Active", "Inactive", "Suspended", "Left"]
status = fd.get("status") or "Active"
if status != "All" and status not in STATUSES:
    frappe.throw("Invalid status.")

FILTER_FIELDS = [["department", "department"], ["designation", "designation"], ["branch", "branch"],
                 ["job_location", "custom_job_location"], ["nationality", "custom_nationality"]]
SORTABLE = {"name": "name", "employee_name": "employee_name", "company": "company", "department": "department",
            "designation": "designation", "branch": "branch", "job_location": "custom_job_location",
            "nationality": "custom_nationality", "date_of_joining": "date_of_joining", "status": "status"}

base_filters = [["company", "=", company]]
if status != "All":
    base_filters.append(["status", "=", status])
filters = list(base_filters)
for pair in FILTER_FIELDS:
    v = fd.get(pair[0])
    if v:
        if v == "(Not set)":
            filters.append([pair[1], "is", "not set"])
        else:
            filters.append([pair[1], "=", v])

search = (fd.get("search") or "").strip()[:60]
or_filters = None
if search:
    or_filters = [["name", "like", "%" + search + "%"], ["employee_name", "like", "%" + search + "%"]]

page_length = U.cint(fd.get("page_length")) or 25
if page_length < 10:
    page_length = 10
if page_length > 100:
    page_length = 100
page = U.cint(fd.get("page")) or 1
if page < 1:
    page = 1
sort_field = SORTABLE.get(fd.get("sort_by") or "employee_name") or "employee_name"
sort_order = "desc" if fd.get("sort_order") == "desc" else "asc"

count_rows = frappe.get_list("Employee", filters=filters, or_filters=or_filters, fields=["count(name) as total"], limit_page_length=1)
total = count_rows[0].get("total") if count_rows else 0
pages = int((total + page_length - 1) / page_length) if total else 1
if page > pages:
    page = pages

rows = frappe.get_list("Employee", filters=filters, or_filters=or_filters,
                       fields=["name", "employee_name", "company", "department", "designation", "branch",
                               "custom_job_location", "custom_nationality", "date_of_joining", "status"],
                       order_by=sort_field + " " + sort_order + ", name asc",
                       limit_start=(page - 1) * page_length, limit_page_length=page_length)
out_rows = []
for r in rows:
    out_rows.append({"employee": r.get("name"), "employee_name": r.get("employee_name"), "company": r.get("company"),
                     "department": r.get("department"), "designation": r.get("designation"), "branch": r.get("branch"),
                     "job_location": r.get("custom_job_location"), "nationality": r.get("custom_nationality"),
                     "date_of_joining": str(r.get("date_of_joining") or ""), "status": r.get("status")})

result = {"total": total, "page": page, "pages": pages, "page_length": page_length, "rows": out_rows,
          "sort_by": fd.get("sort_by") or "employee_name", "sort_order": sort_order, "company": company, "status": status}

if U.cint(fd.get("with_options")):
    opts = {"companies": companies, "statuses": ["Active", "Inactive", "Suspended", "Left", "All"]}
    for pair in FILTER_FIELDS:
        vals = frappe.get_list("Employee", filters=base_filters, fields=[pair[1] + " as v", "count(name) as n"],
                               group_by=pair[1], order_by=pair[1] + " asc", limit_page_length=0)
        opts[pair[0]] = [(x.get("v") or "(Not set)") for x in vals]
    result["options"] = opts

frappe.response["message"] = result
