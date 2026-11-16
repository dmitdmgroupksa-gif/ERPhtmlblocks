# DMS Daily Sales Activity Report (read-only)
# API Method: dms_daily_sales_activity_report
# Source: DMS Follow Up History rows on DMS Project (follow-up date entered by the salesperson).
# Nothing is created, changed or sent by this API.

user = frappe.session.user
roles = frappe.db.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role")
is_admin = (user == "Administrator") or ("System Manager" in roles)
if not (is_admin or ("DMS Sales Dashboard Access" in roles) or ("Technical Coordinator" in roles)):
    frappe.throw("You are not permitted to view the Daily DMS Sales Activity Report.")
can_send = is_admin or ("DMS Sales Dashboard Access" in roles)

args = frappe.form_dict
raw_date = (args.get("date") or "").strip()
filter_person = (args.get("sales_person") or "").strip()

weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
today_date = frappe.utils.getdate(frappe.utils.today())

# Working week: Sunday to Thursday (Python weekday: Friday = 4, Saturday = 5)
if raw_date:
    report_date = frappe.utils.getdate(raw_date)
else:
    report_date = frappe.utils.getdate(frappe.utils.add_days(today_date, -1))
    for step in range(7):
        if report_date.weekday() in (4, 5):
            report_date = frappe.utils.getdate(frappe.utils.add_days(report_date, -1))

report_date_str = str(report_date)
weekday_name = weekday_names[report_date.weekday()]
is_working_day = report_date.weekday() not in (4, 5)
date_label = frappe.utils.formatdate(report_date_str, "dd MMMM yyyy")


def esc_text(value):
    text = str(value if value is not None else "")
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def emp_name_for(emp, cache):
    if emp not in cache:
        erow = frappe.db.get_value("Employee", emp, ["employee_name", "status"], as_dict=True) or {}
        cache[emp] = " ".join((erow.get("employee_name") or emp).split())
        cache[emp + "|status"] = erow.get("status") or ""
    return cache[emp]


emp_names = {}
people = {}
project_info = {}


def new_person(emp, cache):
    pname = emp_name_for(emp, cache)
    pstatus = cache.get(emp + "|status") or ""
    # Employees whose status is not Active (for example Inactive or Left) are flagged separately.
    return {"employee": emp, "employee_name": pname, "projects": 0, "activities": 0, "overdue": 0, "late": 0, "inactive": 1 if (pstatus and pstatus != "Active") else 0, "employee_status": pstatus}


# Allocated projects: per-salesperson project counts and current overdue follow-ups
projects = frappe.db.get_all(
    "DMS Project",
    filters={"sales_person": ["is", "set"]},
    fields=["name", "project_code", "project_name", "sales_person", "follow_up_status", "next_follow_up_date"],
    limit_page_length=0
)

overdue_total = 0
for pr in projects:
    project_info[pr.get("name")] = pr
    emp = pr.get("sales_person")
    if filter_person and emp != filter_person:
        continue
    if emp not in people:
        people[emp] = new_person(emp, emp_names)
    people[emp]["projects"] = people[emp]["projects"] + 1
    nfd = pr.get("next_follow_up_date")
    if nfd and frappe.utils.getdate(nfd) < today_date and pr.get("follow_up_status") not in ("Won", "Lost"):
        people[emp]["overdue"] = people[emp]["overdue"] + 1
        overdue_total = overdue_total + 1

# Activities recorded for the selected date
history = frappe.db.get_all(
    "DMS Follow Up History",
    filters={"parenttype": "DMS Project", "follow_up_date": report_date_str},
    fields=["name", "parent", "follow_up_status", "next_follow_up_date", "remarks", "followed_up_by", "sales_person", "created_on"],
    limit_page_length=0
)

status_counts = {"Contacted": 0, "Meeting Scheduled": 0, "Quotation Submitted": 0, "Negotiation": 0, "Won": 0, "Lost": 0}
activities = []
projects_with_activity = {}
late_total = 0

for h in history:
    parent_id = h.get("parent")
    info = project_info.get(parent_id)
    if not info:
        info = frappe.db.get_value("DMS Project", parent_id, ["name", "project_code", "project_name", "sales_person"], as_dict=True) or {}
    emp = h.get("sales_person") or info.get("sales_person")
    if filter_person and emp != filter_person:
        continue
    if emp and emp not in people:
        people[emp] = new_person(emp, emp_names)
    late = False
    created = h.get("created_on")
    if created and frappe.utils.getdate(created) > report_date:
        late = True
        late_total = late_total + 1
    if emp:
        people[emp]["activities"] = people[emp]["activities"] + 1
        if late:
            people[emp]["late"] = people[emp]["late"] + 1
    status_value = h.get("follow_up_status") or ""
    if status_value in status_counts:
        status_counts[status_value] = status_counts[status_value] + 1
    projects_with_activity[parent_id] = 1
    nfd_value = h.get("next_follow_up_date")
    activities.append({
        "project": parent_id,
        "project_code": info.get("project_code") or parent_id,
        "project_name": info.get("project_name") or "",
        "employee": emp or "",
        "employee_name": emp_name_for(emp, emp_names) if emp else "",
        "status": status_value,
        "remarks": h.get("remarks") or "",
        "next_follow_up_date": str(nfd_value) if nfd_value else "",
        "late": late,
        "created_on": str(created)[:16] if created else ""
    })

people_rows = []
no_activity = []
active_count = 0
inactive_total = 0
for emp in people:
    people_rows.append(people[emp])
    if people[emp]["inactive"]:
        inactive_total = inactive_total + 1
        continue
    if people[emp]["activities"] > 0:
        active_count = active_count + 1
    elif is_working_day:
        no_activity.append({"employee": emp, "employee_name": people[emp]["employee_name"], "projects": people[emp]["projects"]})

people_rows.sort(key=lambda p: (-p["activities"], -p["overdue"], p["employee_name"]))
no_activity.sort(key=lambda p: p["employee_name"])
activities.sort(key=lambda a: (a["employee_name"], a["project_code"]))

summary = {
    "activities": len(activities),
    "active_salespeople": active_count,
    "total_salespeople": len(people_rows) - inactive_total,
    "inactive_salespeople": inactive_total,
    "projects_with_activity": len(projects_with_activity),
    "overdue_followups": overdue_total,
    "overdue_as_of": str(today_date),
    "overdue_as_of_label": frappe.utils.formatdate(today_date, "dd MMMM yyyy"),
    "late_entries": late_total
}


def build_email(date_text, weekday_text, working, sm, counts, rows, none_list, acts, esc):
    th = "padding:6px 10px;text-align:left;background:#f1f5f9;border-bottom:1px solid #d1d5db;font-size:12px;"
    td = "padding:6px 10px;border-bottom:1px solid #eef2f7;font-size:12px;vertical-align:top;"
    tile = "padding:10px 14px;background:#f8fafc;border:1px solid #e5e7eb;text-align:center;"
    h = '<div style="font-family:Arial,Helvetica,sans-serif;color:#17365d;max-width:800px;">'
    h = h + '<h2 style="margin:0 0 4px 0;">Daily DMS Sales Activity Report</h2>'
    day_note = ""
    if not working:
        day_note = " - non-working day"
    h = h + '<div style="font-size:12px;color:#64748b;margin-bottom:14px;">' + esc(date_text) + " (" + esc(weekday_text) + ")" + day_note + "</div>"
    h = h + '<table style="border-collapse:separate;border-spacing:6px;width:100%;margin-bottom:8px;"><tr>'
    tiles = [
        ["Activities", sm["activities"]],
        ["Active Salespeople", str(sm["active_salespeople"]) + " / " + str(sm["total_salespeople"])],
        ["Projects with Activity", sm["projects_with_activity"]],
        ["Overdue Follow-ups (as of " + str(sm["overdue_as_of_label"]) + ")", sm["overdue_followups"]]
    ]
    for item in tiles:
        h = h + '<td style="' + tile + '"><div style="font-size:20px;font-weight:bold;">' + esc(item[1]) + '</div><div style="font-size:11px;color:#64748b;">' + esc(item[0]) + "</div></td>"
    h = h + "</tr></table>"
    h = h + '<div style="font-size:12px;margin-bottom:14px;">Recorded statuses: Contacted ' + str(counts["Contacted"]) + ", Meeting Scheduled " + str(counts["Meeting Scheduled"]) + ", Quotation Submitted " + str(counts["Quotation Submitted"]) + ", Negotiation " + str(counts["Negotiation"]) + ", Won " + str(counts["Won"]) + ", Lost " + str(counts["Lost"]) + ".</div>"

    h = h + '<h3 style="margin:16px 0 6px 0;font-size:14px;">Salesperson Activity Summary</h3>'
    h = h + '<table style="border-collapse:collapse;width:100%;"><tr><th style="' + th + '">Salesperson</th><th style="' + th + '">Projects</th><th style="' + th + '">Activities</th><th style="' + th + '">Overdue</th></tr>'
    shown = 0
    for p in rows:
        if p["activities"] > 0 or p["overdue"] > 0:
            shown = shown + 1
            act_text = str(p["activities"])
            if p["activities"] == 0 and working:
                act_text = "No activity recorded"
            h = h + '<tr><td style="' + td + '">' + esc(p["employee_name"]) + '</td><td style="' + td + '">' + str(p["projects"]) + '</td><td style="' + td + '">' + esc(act_text) + '</td><td style="' + td + '">' + str(p["overdue"]) + "</td></tr>"
    if shown == 0:
        h = h + '<tr><td style="' + td + '" colspan="4">No activity or overdue follow-ups to report.</td></tr>'
    h = h + "</table>"
    if len(none_list) > 0:
        names = []
        for n in none_list:
            names.append(esc(n["employee_name"]))
        h = h + '<div style="font-size:12px;margin-top:8px;color:#475569;"><strong>No activity recorded (' + str(len(none_list)) + "):</strong> " + ", ".join(names) + "</div>"

    h = h + '<h3 style="margin:16px 0 6px 0;font-size:14px;">Project-wise Activities</h3>'
    h = h + '<table style="border-collapse:collapse;width:100%;"><tr><th style="' + th + '">Project</th><th style="' + th + '">Salesperson</th><th style="' + th + '">Activity</th><th style="' + th + '">Remarks</th><th style="' + th + '">Next follow-up</th></tr>'
    if len(acts) == 0:
        h = h + '<tr><td style="' + td + '" colspan="5">No project activity was recorded for this date.</td></tr>'
    for a in acts:
        late_text = ""
        if a["late"]:
            late_text = ' <span style="color:#b45309;font-size:11px;">(late entry)</span>'
        h = h + '<tr><td style="' + td + '">' + esc(a["project_code"]) + "<br>" + esc(a["project_name"]) + '</td><td style="' + td + '">' + esc(a["employee_name"]) + '</td><td style="' + td + '">' + esc(a["status"]) + late_text + '</td><td style="' + td + '">' + esc(a["remarks"]) + '</td><td style="' + td + '">' + esc(a["next_follow_up_date"] or "-") + "</td></tr>"
    h = h + "</table>"
    h = h + '<div style="font-size:11px;color:#64748b;margin-top:14px;">Source: DMS follow-up records dated ' + esc(date_text) + ". Statuses such as Won are salesperson-recorded pipeline statuses; they do not confirm an ERPNext Sales Order. This report covers DMS activity only, not other daily sales responsibilities.</div>"
    h = h + "</div>"
    return h


email_html = build_email(date_label, weekday_name, is_working_day, summary, status_counts, people_rows, no_activity, activities, esc_text)

frappe.response["message"] = {
    "status": "success",
    "date": report_date_str,
    "date_label": date_label,
    "weekday": weekday_name,
    "is_working_day": is_working_day,
    "can_send": can_send,
    "filter_person": filter_person,
    "summary": summary,
    "status_counts": status_counts,
    "salespeople": people_rows,
    "activities": activities,
    "no_activity": no_activity,
    "email_subject": "Daily DMS Sales Activity Report - " + date_label,
    "email_html": email_html
}
