# DMS Project Explorer - Sector Tags API (read only)
# API Method: dms_project_explorer_sectors
# Returns each DMS Project id, its exact sector tags and an allocated flag (1/0).
# No contact, contractor or commercial data.

roles = frappe.db.get_all(
    "Has Role",
    filters={"parent": frappe.session.user, "parenttype": "User"},
    pluck="role"
)

allowed = False
if "DMS Sales Dashboard Access" in roles:
    allowed = True
if "Technical Coordinator" in roles:
    allowed = True
if "System Manager" in roles:
    allowed = True

if not allowed:
    frappe.throw("You are not permitted to access the DMS Sales Management Dashboard.")

rows = frappe.db.get_all("DMS Project", fields=["name", "sector", "sales_person"], limit_page_length=0)

sector_list = []
sector_index = {}
projects = []
for row in rows:
    idx = []
    for raw_tag in (row.get("sector") or "").split(","):
        tag = raw_tag.strip()
        if tag:
            if tag not in sector_index:
                sector_index[tag] = len(sector_list)
                sector_list.append(tag)
            tag_i = sector_index[tag]
            if tag_i not in idx:
                idx.append(tag_i)
    alloc_flag = 1 if row.get("sales_person") else 0
    projects.append([row.get("name"), idx, alloc_flag])

frappe.response["message"] = {
    "status": "success",
    "sectors": sector_list,
    "projects": projects
}
