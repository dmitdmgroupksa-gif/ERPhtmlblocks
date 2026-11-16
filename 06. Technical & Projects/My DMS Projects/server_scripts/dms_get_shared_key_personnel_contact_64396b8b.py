# API: dms_get_shared_key_personnel_contact  (READ-ONLY)
# Releases contact details ONLY to the salesperson who made the request, and ONLY
# once a manager has marked it Shared. Anyone else gets the same generic error,
# so the existence of other people's requests is not revealed.
user = frappe.session.user
if user == "Guest":
    frappe.throw("Please log in.")

request_id = (frappe.form_dict.get("request_id") or "").strip()
if not request_id:
    frappe.throw("Request ID is required.")

DT = "DMS Key Personnel Request"
row = frappe.db.get_value(
    DT,
    request_id,
    ["name", "requested_by", "status", "dms_project", "project_name", "required_designation",
     "contact_name", "designation", "company", "mobile_number", "email_address",
     "shared_date", "manager_remarks"],
    as_dict=True
)
if not row or row.requested_by != user:
    frappe.throw("Request not found or you are not permitted to view it.")

if row.status != "Shared":
    frappe.throw("Contact details have not been shared yet. Current status: " + str(row.status) + ".")

project_code = frappe.db.get_value("DMS Project", row.dms_project, "project_code")

# New requests keep their contacts in the child table; older single-contact requests
# still use the original fields, so both are supported.
contacts = frappe.db.get_all(
    "DMS Shared Personnel Contact",
    filters={"parent": request_id, "parenttype": DT},
    fields=["contact_name", "designation", "company", "mobile_number", "email_address"],
    order_by="idx asc",
    limit_page_length=20
)
if not contacts and row.contact_name:
    contacts = [{
        "contact_name": row.contact_name,
        "designation": row.designation,
        "company": row.company,
        "mobile_number": row.mobile_number,
        "email_address": row.email_address
    }]
contacts = [dict(c) for c in contacts]

frappe.response["message"] = {
    "request_id": row.name,
    "status": row.status,
    "project_code": project_code,
    "project_name": row.project_name,
    "requested_designation": row.required_designation,
    "contact": contacts[0] if contacts else None,
    "contacts": contacts,
    "shared_date": str(row.shared_date or ""),
    "manager_remarks": row.manager_remarks
}
