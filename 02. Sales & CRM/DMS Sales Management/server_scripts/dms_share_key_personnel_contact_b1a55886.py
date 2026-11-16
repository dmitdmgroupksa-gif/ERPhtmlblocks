# DMS Share Key Personnel Contact  (API: dms_share_key_personnel_contact)
# Manager-only. Moves a request Pending -> In Progress -> Shared / Rejected and,
# when sharing, stores one or more contacts in the Level-1 (manager-only) child table
# shared_contacts (and the first one also in the original single-contact fields).
# It can NEVER change the salesperson's original request (project, designation, reason).
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
    or "Technical Coordinator" in roles
)
if not is_manager:
    frappe.throw("Only authorized managers can process contact requests.")

args = frappe.form_dict
request_id = (args.get("request_id") or "").strip()
action = (args.get("action") or "").strip()

if not request_id:
    frappe.throw("Request ID is required.")

allowed_actions = ["In Progress", "Shared", "Rejected"]
if action not in allowed_actions:
    frappe.throw("Action must be one of: In Progress, Shared, Rejected.")

DT = "DMS Key Personnel Request"
if not frappe.db.exists(DT, request_id):
    frappe.throw("Request not found.")

doc = frappe.get_doc(DT, request_id)

if doc.status in ["Shared", "Rejected"]:
    frappe.throw("This request is already " + doc.status + " and cannot be processed again.")
if action == "In Progress" and doc.status == "In Progress":
    frappe.throw("This request is already In Progress.")

def clean(key, maxlen):
    v = " ".join((args.get(key) or "").split())
    if len(v) > maxlen:
        frappe.throw(key.replace("_", " ").title() + " is too long (maximum " + str(maxlen) + " characters).")
    return v

remarks = (args.get("manager_remarks") or "").strip()
if len(remarks) > 1000:
    frappe.throw("Manager remarks are too long (maximum 1000 characters).")

if action == "Shared":
    # One request can carry several contacts (child table shared_contacts).
    # The old single-contact arguments are still accepted for compatibility.
    def clean_val(raw, label, maxlen):
        v = " ".join(str(raw or "").split())
        if len(v) > maxlen:
            frappe.throw(label + " is too long (maximum " + str(maxlen) + " characters).")
        return v

    raw_contacts = args.get("contacts")
    contact_list = []
    if raw_contacts:
        if isinstance(raw_contacts, str):
            try:
                contact_list = json.loads(raw_contacts)
            except Exception:
                frappe.throw("The contact list could not be read. Please try again.")
        else:
            contact_list = raw_contacts
    elif (args.get("contact_name") or "").strip():
        contact_list = [{
            "contact_name": args.get("contact_name"),
            "designation": args.get("designation"),
            "company": args.get("company"),
            "mobile_number": args.get("mobile_number"),
            "email_address": args.get("email_address")
        }]

    if not isinstance(contact_list, list) or not contact_list:
        frappe.throw("Add at least one contact to share.")
    if len(contact_list) > 10:
        frappe.throw("A maximum of 10 contacts can be shared in one request.")

    cleaned = []
    seen = []
    pos = 0
    for item in contact_list:
        pos = pos + 1
        label = "Contact " + str(pos)
        if not isinstance(item, dict):
            frappe.throw(label + " is not valid.")
        c_name = clean_val(item.get("contact_name"), label + " name", 140)
        c_desig = clean_val(item.get("designation"), label + " designation", 140)
        c_company = clean_val(item.get("company"), label + " company", 140)
        c_mobile = clean_val(item.get("mobile_number"), label + " mobile number", 40)
        c_email = clean_val(item.get("email_address"), label + " email address", 140)
        if not c_name:
            frappe.throw(label + ": Contact Name is required.")
        if not c_mobile and not c_email:
            frappe.throw(label + ": provide at least a mobile number or an email address.")
        if c_email and ("@" not in c_email or "." not in c_email.split("@")[-1] or " " in c_email):
            frappe.throw(label + ": email address is not valid.")
        dup_key = c_name.lower() + "|" + c_mobile + "|" + c_email.lower()
        if dup_key in seen:
            frappe.throw(label + " is a duplicate of an earlier contact.")
        seen.append(dup_key)
        cleaned.append({
            "contact_name": c_name,
            "designation": c_desig,
            "company": c_company,
            "mobile_number": c_mobile,
            "email_address": c_email
        })

    doc.set("shared_contacts", [])
    for c in cleaned:
        doc.append("shared_contacts", c)

    # The first contact is also kept in the original single-contact fields (compatibility).
    first = cleaned[0]
    doc.contact_name = first["contact_name"]
    doc.designation = first["designation"]
    doc.company = first["company"]
    doc.mobile_number = first["mobile_number"]
    doc.email_address = first["email_address"]
    doc.shared_by = user
    doc.shared_date = frappe.utils.now()

doc.status = action
if remarks:
    doc.manager_remarks = remarks

# Only status + manager-response fields were touched above.
doc.save(ignore_permissions=True)

frappe.response["message"] = {
    "success": True,
    "request_id": doc.name,
    "status": doc.status,
    "contacts_shared": len(doc.get("shared_contacts") or [])
}
