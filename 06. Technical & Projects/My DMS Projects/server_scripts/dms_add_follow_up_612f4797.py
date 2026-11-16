# API: dms_add_follow_up
# Logs a sales follow-up on a DMS Project: updates the follow-up fields on the
# project AND appends a row to follow_up_history in one save.
args = frappe.form_dict
project = args.get("project")
status = args.get("follow_up_status")
next_date = args.get("next_follow_up_date")
remarks = (args.get("remarks") or "").strip()

allowed = ["Contacted", "Meeting Scheduled", "Quotation Submitted", "Negotiation", "Won", "Lost"]
closed = ["Won", "Lost"]

if not project or not frappe.db.exists("DMS Project", project):
    frappe.throw("DMS Project not found.")
if status not in allowed:
    frappe.throw("Please select a valid Follow-Up Status.")
if not remarks:
    frappe.throw("Remarks are required.")

today = frappe.utils.today()
if next_date:
    if frappe.utils.getdate(next_date) < frappe.utils.getdate(today):
        frappe.throw("Next Follow-Up Date cannot be in the past.")
elif status not in closed:
    frappe.throw("Next Follow-Up Date is required unless the project is Won or Lost.")

doc = frappe.get_doc("DMS Project", project)
if not doc.sales_person:
    frappe.throw("Allocate a Sales Person to this project before logging a follow-up.")

# Permission: allocated sales person, or System Manager / IT Coordinator
user = frappe.session.user
roles = frappe.db.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role")
is_manager = "System Manager" in roles or "IT Coordinator" in roles
my_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
if not is_manager and my_employee != doc.sales_person:
    frappe.throw("Only the allocated Sales Person can log a follow-up for this project.")

doc.follow_up_status = status
doc.last_follow_up_date = today
doc.next_follow_up_date = next_date or None
doc.follow_up_remarks = remarks
doc.last_follow_up_by = user
doc.append("follow_up_history", {
    "follow_up_date": today,
    "follow_up_status": status,
    "next_follow_up_date": next_date or None,
    "remarks": remarks,
    "followed_up_by": user,
    "sales_person": doc.sales_person,
    "created_on": frappe.utils.now_datetime()
})
doc.save(ignore_permissions=True)

frappe.response["message"] = {"ok": 1, "project": doc.name, "history_rows": len(doc.follow_up_history)}