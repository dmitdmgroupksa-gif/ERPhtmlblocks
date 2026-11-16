# API: dms_manager_contact_requests  (READ-ONLY)
# Manager view of Key Personnel Contact Requests: status counters + latest requests.
# Contact details (Level 1 fields) are never returned here.
user = frappe.session.user
roles = frappe.db.get_all(
    "Has Role",
    filters={"parent": user, "parenttype": "User"},
    pluck="role"
)
allowed = (
    user == "Administrator"
    or "System Manager" in roles
    or "DMS Sales Dashboard Access" in roles
    or "Technical Coordinator" in roles
)
if not allowed:
    frappe.throw("Not authorized")

DT = "DMS Key Personnel Request"
LIMIT = 200

# Counters come from the database, so they cover ALL requests, not only the rows shown.
counts = {"total": frappe.db.count(DT)}
for s in ["Pending", "In Progress", "Shared", "Rejected"]:
    counts[s] = frappe.db.count(DT, {"status": s})

rows = frappe.db.get_all(
    DT,
    fields=[
        "name",
        "dms_project",
        "project_name",
        "sales_person",
        "requested_by",
        "required_designation",
        "request_reason",
        "request_date",
        "status"
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
shared_ids = [r.get("name") for r in rows if r.get("status") == "Shared"]
child_counts = {}
if shared_ids:
    for c in frappe.db.get_all(
        "DMS Shared Personnel Contact",
        filters={"parent": ["in", shared_ids], "parenttype": DT},
        fields=["parent"],
        limit_page_length=0
    ):
        child_counts[c.parent] = child_counts.get(c.parent, 0) + 1

for r in rows:
    r["project_code"] = codes.get(r.get("dms_project"))
    r["contact_count"] = child_counts.get(r.get("name"), 1) if r.get("status") == "Shared" else 0

frappe.response["message"] = {
    "counts": counts,
    "requests": rows,
    "shown": len(rows),
    "truncated": counts["total"] > len(rows)
}
