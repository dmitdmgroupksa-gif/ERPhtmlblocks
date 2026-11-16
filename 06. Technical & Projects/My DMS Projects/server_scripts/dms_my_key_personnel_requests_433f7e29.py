# API: dms_my_key_personnel_requests  (READ-ONLY)
# Returns ONLY the logged-in user's own requests. Contact details and manager
# are intentionally NOT returned (rejection remarks only, for Rejected requests);
# a separate, secured API releases contact details.
user = frappe.session.user
if user == "Guest":
    frappe.throw("Please log in")

roles = frappe.db.get_all(
    "Has Role",
    filters={"parent": user, "parenttype": "User"},
    pluck="role"
)
if (
    "DMS Sales Person Access" not in roles
    and "System Manager" not in roles
    and "DMS Sales Dashboard Access" not in roles
):
    frappe.throw("Not authorized")

DT = "DMS Key Personnel Request"
LIMIT = 200

counts = {"total": frappe.db.count(DT, {"requested_by": user})}
for s in ["Pending", "In Progress", "Shared", "Rejected"]:
    counts[s] = frappe.db.count(DT, {"requested_by": user, "status": s})

rows = frappe.db.get_all(
    DT,
    filters={"requested_by": user},
    fields=[
        "name",
        "dms_project",
        "project_name",
        "required_designation",
        "request_date",
        "status",
        "manager_remarks"
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
    # Number of contacts shared (a count only; details come from the secured API).
    r["contact_count"] = child_counts.get(r.get("name"), 1) if r.get("status") == "Shared" else 0
    # Rejection remarks are returned only for Rejected requests; for every other
    # status the Level-1 remarks field is blanked. Contact details are never returned.
    if r.get("status") != "Rejected":
        r["manager_remarks"] = None

frappe.response["message"] = {
    "counts": counts,
    "requests": rows,
    "shown": len(rows),
    "truncated": counts["total"] > len(rows)
}
