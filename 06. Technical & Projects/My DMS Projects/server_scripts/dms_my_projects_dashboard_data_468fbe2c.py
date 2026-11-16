# =========================================================
# DMS MY PROJECTS DASHBOARD
# API Method: dms_my_projects_dashboard_data
# Returns ONLY the logged-in user's own allocated projects.
# The employee is derived from the session - never from a request parameter.
# =========================================================

today = frappe.utils.today()
upcoming_end = frappe.utils.add_days(today, 7)

user = frappe.session.user
employee = frappe.db.get_value(
    "Employee",
    {"user_id": user},
    "name"
)

# =========================================================
# SALESPERSON DASHBOARD ACCESS CONTROL
# =========================================================

roles = frappe.db.get_all(
    "Has Role",
    filters={
        "parent": frappe.session.user,
        "parenttype": "User"
    },
    pluck="role"
)

allowed = False

if "DMS Sales Person Access" in roles:
    allowed = True

# Keep System Manager for administration/testing
if "System Manager" in roles:
    allowed = True

if not allowed:
    frappe.throw(
        "You are not permitted to access the My DMS Projects Dashboard."
    )


# ---------------------------------------------------------
# FIND EMPLOYEE
# ---------------------------------------------------------



if not employee:
    frappe.throw(
        "No Employee record is linked to your ERPNext user."
    )


employee_name = frappe.db.get_value(
    "Employee",
    employee,
    "employee_name"
)

if not employee_name:
    employee_name = employee


# ---------------------------------------------------------
# GET ONLY THIS EMPLOYEE'S PROJECTS
# ---------------------------------------------------------

projects = frappe.db.get_all(
    "DMS Project",
    filters={
        "sales_person": employee
    },
    fields=[
        "name",
        "project_code",
        "project_name",
        "follow_up_status",
        "last_follow_up_date",
        "next_follow_up_date",
        "allocation_date"
    ],
    limit_page_length=0
)


# ---------------------------------------------------------
# COUNTERS
# ---------------------------------------------------------

total_projects = 0
never_contacted = 0
contacted = 0
meeting_scheduled = 0
quotation_submitted = 0
negotiation = 0
won = 0
lost = 0
due_today = 0
overdue = 0
upcoming = 0


# ---------------------------------------------------------
# TABLE DATA
# ---------------------------------------------------------

due_today_projects = []
overdue_projects = []
upcoming_projects = []


for project in projects:

    total_projects = total_projects + 1

    status = project.get("follow_up_status")
    next_date = project.get("next_follow_up_date")

    if not status or status == "Not Contacted":
        never_contacted = never_contacted + 1

    elif status == "Contacted":
        contacted = contacted + 1

    elif status == "Meeting Scheduled":
        meeting_scheduled = meeting_scheduled + 1

    elif status == "Quotation Submitted":
        quotation_submitted = quotation_submitted + 1

    elif status == "Negotiation":
        negotiation = negotiation + 1

    elif status == "Won":
        won = won + 1

    elif status == "Lost":
        lost = lost + 1


    # -----------------------------------------------------
    # FOLLOW-UP DATE LOGIC
    # -----------------------------------------------------

    if next_date and status not in ["Won", "Lost"]:

        next_date_string = str(next_date)

        # Due Today
        if next_date_string == today:

            due_today = due_today + 1

            due_today_projects.append({
                "project": project.get("name"),
                "project_code": project.get("project_code"),
                "project_name": project.get("project_name"),
                "follow_up_status": status,
                "last_follow_up_date": project.get("last_follow_up_date"),
                "next_follow_up_date": next_date
            })


        # Overdue
        elif next_date_string < today:

            overdue = overdue + 1

            days_overdue = frappe.utils.date_diff(
                today,
                next_date
            )

            overdue_projects.append({
                "project": project.get("name"),
                "project_code": project.get("project_code"),
                "project_name": project.get("project_name"),
                "follow_up_status": status,
                "last_follow_up_date": project.get("last_follow_up_date"),
                "next_follow_up_date": next_date,
                "days_overdue": days_overdue
            })


        # Upcoming (after today, within the next 7 days)
        elif next_date_string <= str(upcoming_end):

            upcoming = upcoming + 1

            upcoming_projects.append({
                "project": project.get("name"),
                "project_code": project.get("project_code"),
                "project_name": project.get("project_name"),
                "follow_up_status": status,
                "last_follow_up_date": project.get("last_follow_up_date"),
                "next_follow_up_date": next_date
            })


# ---------------------------------------------------------
# SORT TABLES
# ---------------------------------------------------------

due_today_projects = sorted(
    due_today_projects,
    key=lambda x: str(x.get("next_follow_up_date") or "")
)

overdue_projects = sorted(
    overdue_projects,
    key=lambda x: str(x.get("next_follow_up_date") or "")
)

upcoming_projects = sorted(
    upcoming_projects,
    key=lambda x: str(x.get("next_follow_up_date") or "")
)


# ---------------------------------------------------------
# TECHNICAL SUBMITTALS - every submittal on the projects CURRENTLY
# allocated to this employee (visibility follows the current allocation,
# so a reassigned project brings its submittal history with it)
# ---------------------------------------------------------

TS_KEYS = {
    "Requested": "requested",
    "In Preparation": "in_preparation",
    "Submitted": "submitted",
    "Under Review": "under_review",
    "Approved": "approved",
    "Approved with Comments": "approved_with_comments",
    "Revision Required": "revision_required",
    "Rejected": "rejected",
}
technical = {"total": 0, "action_required": 0, "rows": []}
for k in TS_KEYS.values():
    technical[k] = 0

ts_privileged = ("System Manager" in roles or "Technical Coordinator" in roles
                 or "IT Coordinator" in roles or "DMS Sales Dashboard Access" in roles)
project_info = {}
for p in projects:
    project_info[p.name] = p

if project_info:
    ts_list = frappe.db.get_all(
        "DMS Technical Submittal",
        filters={"dms_project": ["in", list(project_info.keys())], "status": ["!=", "Cancelled"], "docstatus": ["<", 2]},
        fields=["name", "dms_project", "status", "required_date", "submittal_date",
                "revision_no", "sales_person", "creation"],
        order_by="creation desc",
        limit_page_length=0,
    )
    ts_products = {}
    if ts_list:
        for r in frappe.db.get_all(
            "DMS Technical Submittal Product",
            filters={"parent": ["in", [t.name for t in ts_list]], "parenttype": "DMS Technical Submittal"},
            fields=["parent", "idx", "submittal_product", "brand", "approval_product",
                    "product_status", "item_code", "item_name"],
            order_by="parent asc, idx asc",
            limit_page_length=0,
        ):
            ts_products.setdefault(r.parent, []).append({
                "submittal_product": r.submittal_product, "brand": r.brand,
                "approval_product": r.approval_product, "product_status": r.product_status,
                "item_code": r.item_code, "item_name": r.item_name,
            })
    for t in ts_list:
        technical["total"] = technical["total"] + 1
        key = TS_KEYS.get(t.status)
        if key:
            technical[key] = technical[key] + 1
        if t.status in ("Revision Required", "Rejected"):
            technical["action_required"] = technical["action_required"] + 1
        proj = project_info.get(t.dms_project)
        technical["rows"].append({
            "name": t.name,
            "project": t.dms_project,
            "project_code": proj.project_code if proj else t.dms_project,
            "project_name": proj.project_name if proj else "",
            "status": t.status,
            "required_date": t.required_date,
            "submittal_date": t.submittal_date,
            "revision_no": t.revision_no or 0,
            # the TS form itself is still protected by the TS permission query
            "can_open": bool(ts_privileged or t.sales_person == employee),
            "products": ts_products.get(t.name, []),
        })


# ---------------------------------------------------------
# RESPONSE
# ---------------------------------------------------------

frappe.response["message"] = {

    "status": "success",

    "technical": technical,

    "employee": {
        "name": employee,
        "employee_name": employee_name
    },

    "summary": {
        "total_projects": total_projects,
        "never_contacted": never_contacted,
        "contacted": contacted,
        "meeting_scheduled": meeting_scheduled,
        "quotation_submitted": quotation_submitted,
        "negotiation": negotiation,
        "won": won,
        "lost": lost,
        "due_today": due_today,
        "overdue": overdue,
        "upcoming": upcoming
    },

    "due_today_projects": due_today_projects,
    "overdue_projects": overdue_projects,
    "upcoming_projects": upcoming_projects
}
