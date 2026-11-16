# API: dms_project_shared_contacts  (READ-ONLY)
# Multi-request retrieval used by the DMS Project form and the My DMS Projects dashboard.
#
# ACCESS RULES (allocation of the project is deliberately NOT part of the check):
#   - A salesperson sees ONLY the requests they created themselves, so a contact
#     shared with the original requester stays with them after a re-allocation, and
#     a newly assigned salesperson sees nothing until they request it themselves.
#   - An authorised manager (Administrator / System Manager / DMS Sales Dashboard
#     Access) sees every request on a project when a project is given; without a
#     project a manager only gets their own requests.
#   - Contact details are returned ONLY for requests with status "Shared".
#     Pending / In Progress rows carry no contact data. Rejected rows carry the
#     rejection remark only.
user = frappe.session.user
if user == "Guest":
    frappe.throw("Please log in.")

roles = frappe.db.get_all(
    "Has Role",
    filters={"parent": user, "parenttype": "User"},
    pluck="role"
)
is_manager = (
    user == "Administrator"
    or "System Manager" in roles
    or "DMS Sales Dashboard Access" in roles
)
if not (is_manager or "DMS Sales Person Access" in roles):
    frappe.throw("Not authorized.")

project = (frappe.form_dict.get("project") or frappe.form_dict.get("dms_project") or "").strip()
if project and not frappe.db.exists("DMS Project", project):
    frappe.throw("DMS Project not found.")

DT = "DMS Key Personnel Request"
LIMIT = 200

filters = {}
if project:
    filters["dms_project"] = project
see_all = bool(is_manager and project)
if not see_all:
    filters["requested_by"] = user

rows = frappe.db.get_all(
    DT,
    filters=filters,
    fields=[
        "name", "dms_project", "project_name", "requested_by", "sales_person",
        "required_designation", "request_date", "status",
        "contact_name", "designation", "company", "mobile_number", "email_address",
        "shared_by", "shared_date", "manager_remarks"
    ],
    order_by="creation desc",
    limit_page_length=LIMIT
)

ids = []
for r in rows:
    if r.get("dms_project") and r.get("dms_project") not in ids:
        ids.append(r.get("dms_project"))
codes = {}
if ids:
    for p in frappe.db.get_all("DMS Project", filters={"name": ["in", ids]}, fields=["name", "project_code"]):
        codes[p.name] = p.project_code

# Contacts of Shared requests: child table first, original single-contact fields for older requests.
shared_ids = [r.name for r in rows if r.status == "Shared"]
child_map = {}
if shared_ids:
    for c in frappe.db.get_all(
        "DMS Shared Personnel Contact",
        filters={"parent": ["in", shared_ids], "parenttype": DT},
        fields=["parent", "contact_name", "designation", "company", "mobile_number", "email_address"],
        order_by="idx asc",
        limit_page_length=0
    ):
        child_map.setdefault(c.parent, []).append({
            "contact_name": c.contact_name,
            "designation": c.designation,
            "company": c.company,
            "mobile_number": c.mobile_number,
            "email_address": c.email_address
        })

out = []
for r in rows:
    item = {
        "name": r.name,
        "dms_project": r.dms_project,
        "project_code": codes.get(r.dms_project),
        "project_name": r.project_name,
        "sales_person": r.sales_person,
        "requested_by": r.requested_by,
        "is_mine": r.requested_by == user,
        "required_designation": r.required_designation,
        "request_date": str(r.request_date or ""),
        "status": r.status,
        "contact": None,
        "contacts": [],
        "shared_by": None,
        "shared_date": None,
        "manager_remarks": None
    }
    if r.status == "Shared":
        contact_list = child_map.get(r.name) or []
        if not contact_list and r.contact_name:
            contact_list = [{
                "contact_name": r.contact_name,
                "designation": r.designation,
                "company": r.company,
                "mobile_number": r.mobile_number,
                "email_address": r.email_address
            }]
        item["contacts"] = contact_list
        item["contact"] = contact_list[0] if contact_list else None
        item["shared_by"] = r.shared_by
        item["shared_date"] = str(r.shared_date or "")
        item["manager_remarks"] = r.manager_remarks
    elif r.status == "Rejected":
        item["manager_remarks"] = r.manager_remarks
    out.append(item)

frappe.response["message"] = {
    "scope": "project" if see_all else "own",
    "is_manager": bool(is_manager),
    "requests": out,
    "shown": len(out),
    "truncated": frappe.db.count(DT, filters) > len(out)
}
