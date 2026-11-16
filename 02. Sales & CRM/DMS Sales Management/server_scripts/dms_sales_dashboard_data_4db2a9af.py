# DMS Sales Dashboard Data
# API Method: dms_sales_dashboard_data

today = frappe.utils.today()

# =========================================================
# DASHBOARD ACCESS CONTROL
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

# Dedicated dashboard access role
if "DMS Sales Dashboard Access" in roles:
    allowed = True

# Technical Department monitoring (read-only dashboard)
if "Technical Coordinator" in roles:
    allowed = True

# Emergency/admin access
if "System Manager" in roles:
    allowed = True

if not allowed:
    frappe.throw(
        "You are not permitted to access the DMS Sales Management Dashboard."
    )


# ---------------------------------------------------------
# BASIC COUNTS
# "Allocated" = a Sales Person is set (same rule used by the permission
# query and by dms_add_follow_up), so allocated + unallocated = total.
# ---------------------------------------------------------

total_projects = frappe.db.count("DMS Project")

allocated = frappe.db.count(
    "DMS Project",
    {
        "sales_person": ["is", "set"]
    }
)

unallocated = frappe.db.count(
    "DMS Project",
    {
        "sales_person": ["is", "not set"]
    }
)

# Data-quality flag: marked Allocated/Reallocated but no Sales Person
allocation_mismatch = frappe.db.count(
    "DMS Project",
    {
        "allocation_status": ["in", ["Allocated", "Reallocated"]],
        "sales_person": ["is", "not set"]
    }
)


# ---------------------------------------------------------
# FOLLOW-UP COUNTS
# ---------------------------------------------------------

not_contacted = frappe.db.count(
    "DMS Project",
    {
        "sales_person": ["is", "set"],
        "follow_up_status": ["is", "not set"]
    }
) + frappe.db.count(
    "DMS Project",
    {
        "sales_person": ["is", "set"],
        "follow_up_status": "Not Contacted"
    }
)

contacted = frappe.db.count("DMS Project", {"follow_up_status": "Contacted"})

meeting_scheduled = frappe.db.count("DMS Project", {"follow_up_status": "Meeting Scheduled"})

quotation_submitted = frappe.db.count("DMS Project", {"follow_up_status": "Quotation Submitted"})

negotiation = frappe.db.count("DMS Project", {"follow_up_status": "Negotiation"})

won = frappe.db.count("DMS Project", {"follow_up_status": "Won"})

lost = frappe.db.count("DMS Project", {"follow_up_status": "Lost"})


# ---------------------------------------------------------
# DUE / OVERDUE
# ---------------------------------------------------------

due_today = frappe.db.count(
    "DMS Project",
    {
        "next_follow_up_date": today,
        "follow_up_status": ["not in", ["Won", "Lost"]]
    }
)

overdue = frappe.db.count(
    "DMS Project",
    {
        "next_follow_up_date": ["between", ["1900-01-01", frappe.utils.add_days(today, -1)]],
        "follow_up_status": ["not in", ["Won", "Lost"]]
    }
)


# ---------------------------------------------------------
# SALES PERSON PERFORMANCE
# ---------------------------------------------------------

allocated_projects = frappe.db.get_all(
    "DMS Project",
    filters={
        "sales_person": ["is", "set"]
    },
    fields=[
        "name",
        "project_code",
        "sales_person",
        "follow_up_status",
        "next_follow_up_date"
    ]
)

sales_data = {}

for project in allocated_projects:

    employee = project.get("sales_person")

    if not employee:
        continue

    if employee not in sales_data:

        employee_name = frappe.db.get_value(
            "Employee",
            employee,
            "employee_name"
        )

        sales_data[employee] = {
            "employee": employee,
            "employee_name": employee_name or employee,
            "assigned": 0,
            "contacted": 0,
            "meetings": 0,
            "quotations": 0,
            "negotiation": 0,
            "won": 0,
            "lost": 0,
            "due_today": 0,
            "overdue": 0,
            "never_contacted": 0
        }

    row = sales_data[employee]

    row["assigned"] = row["assigned"] + 1

    status = project.get("follow_up_status")
    next_date = project.get("next_follow_up_date")

    if not status or status == "Not Contacted":
        row["never_contacted"] = row["never_contacted"] + 1

    elif status == "Contacted":
        row["contacted"] = row["contacted"] + 1

    elif status == "Meeting Scheduled":
        row["meetings"] = row["meetings"] + 1

    elif status == "Quotation Submitted":
        row["quotations"] = row["quotations"] + 1

    elif status == "Negotiation":
        row["negotiation"] = row["negotiation"] + 1

    elif status == "Won":
        row["won"] = row["won"] + 1

    elif status == "Lost":
        row["lost"] = row["lost"] + 1

    if next_date and status not in ["Won", "Lost"]:

        next_date_string = str(next_date)

        if next_date_string == today:
            row["due_today"] = row["due_today"] + 1

        elif next_date_string < today:
            row["overdue"] = row["overdue"] + 1


sales_people = []

for employee in sales_data:
    sales_people.append(sales_data[employee])


# ---------------------------------------------------------
# DASHBOARD OPERATIONAL TABLES
# ---------------------------------------------------------

upcoming_end_date = frappe.utils.add_days(today, 7)


# ---------------------------------------------------------
# 1. RECENT FOLLOW-UP ACTIVITY (latest 20 history rows)
# ---------------------------------------------------------

recent_followups = []

history_rows = frappe.db.get_all(
    "DMS Follow Up History",
    filters={
        "parenttype": "DMS Project"
    },
    fields=[
        "parent",
        "follow_up_date",
        "follow_up_status",
        "next_follow_up_date",
        "remarks",
        "followed_up_by",
        "sales_person",
        "created_on"
    ],
    order_by="created_on desc",
    limit_page_length=20
)

for row in history_rows:

    proj = frappe.db.get_value(
        "DMS Project",
        row.get("parent"),
        ["project_code", "project_name"],
        as_dict=True
    ) or {}

    employee_name = ""

    if row.get("sales_person"):
        employee_name = frappe.db.get_value(
            "Employee",
            row.get("sales_person"),
            "employee_name"
        ) or row.get("sales_person")

    recent_followups.append({
        "project": row.get("parent"),
        "project_code": proj.get("project_code"),
        "project_name": proj.get("project_name"),
        "follow_up_date": row.get("follow_up_date"),
        "follow_up_status": row.get("follow_up_status"),
        "next_follow_up_date": row.get("next_follow_up_date"),
        "remarks": row.get("remarks"),
        "followed_up_by": row.get("followed_up_by"),
        "sales_person": row.get("sales_person"),
        "sales_person_name": " ".join((employee_name or "").split()),
        "created_on": row.get("created_on")
    })


# ---------------------------------------------------------
# 2. OVERDUE FOLLOW-UPS (oldest first, max 50)
# ---------------------------------------------------------

overdue_followups = []

overdue_projects = frappe.db.get_all(
    "DMS Project",
    filters={
        "next_follow_up_date": ["between", ["2000-01-01", frappe.utils.add_days(today, -1)]],
        "follow_up_status": ["not in", ["Won", "Lost"]],
        "sales_person": ["is", "set"]
    },
    fields=[
        "name",
        "project_code",
        "project_name",
        "sales_person",
        "follow_up_status",
        "last_follow_up_date",
        "next_follow_up_date"
    ],
    order_by="next_follow_up_date asc",
    limit_page_length=50
)

for project in overdue_projects:

    employee_name = frappe.db.get_value(
        "Employee",
        project.get("sales_person"),
        "employee_name"
    ) or project.get("sales_person")

    due_date = project.get("next_follow_up_date")

    days_overdue = 0

    if due_date:
        days_overdue = frappe.utils.date_diff(today, due_date)

    overdue_followups.append({
        "project": project.get("name"),
        "project_code": project.get("project_code"),
        "project_name": project.get("project_name"),
        "sales_person": project.get("sales_person"),
        "sales_person_name": " ".join((employee_name or "").split()),
        "follow_up_status": project.get("follow_up_status"),
        "last_follow_up_date": project.get("last_follow_up_date"),
        "next_follow_up_date": due_date,
        "days_overdue": days_overdue
    })


# ---------------------------------------------------------
# 3. UPCOMING FOLLOW-UPS (today through next 7 days, inclusive)
# ---------------------------------------------------------

upcoming_followups = []

upcoming_projects = frappe.db.get_all(
    "DMS Project",
    filters={
        "next_follow_up_date": ["between", [today, upcoming_end_date]],
        "follow_up_status": ["not in", ["Won", "Lost"]],
        "sales_person": ["is", "set"]
    },
    fields=[
        "name",
        "project_code",
        "project_name",
        "sales_person",
        "follow_up_status",
        "last_follow_up_date",
        "next_follow_up_date"
    ],
    order_by="next_follow_up_date asc",
    limit_page_length=50
)

for project in upcoming_projects:

    employee_name = frappe.db.get_value(
        "Employee",
        project.get("sales_person"),
        "employee_name"
    ) or project.get("sales_person")

    upcoming_followups.append({
        "project": project.get("name"),
        "project_code": project.get("project_code"),
        "project_name": project.get("project_name"),
        "sales_person": project.get("sales_person"),
        "sales_person_name": " ".join((employee_name or "").split()),
        "follow_up_status": project.get("follow_up_status"),
        "last_follow_up_date": project.get("last_follow_up_date"),
        "next_follow_up_date": project.get("next_follow_up_date")
    })


# ---------------------------------------------------------
# PROJECTS BY SECTOR (read-only classification counts)
# A project can carry several comma-separated sector tags, so
# it is counted once under each of its tags.
# ---------------------------------------------------------

sector_rows = frappe.db.get_all(
    "DMS Project",
    fields=["sector", "sales_person"],
    limit_page_length=0
)

sector_counts = {}
sector_allocated = {}
sector_unclassified = 0
sector_unclassified_allocated = 0

for sector_row in sector_rows:
    tags = []
    for raw_tag in (sector_row.get("sector") or "").split(","):
        tag = raw_tag.strip()
        if tag and tag not in tags:
            tags.append(tag)
    is_allocated = 1 if sector_row.get("sales_person") else 0
    if not tags:
        sector_unclassified = sector_unclassified + 1
        sector_unclassified_allocated = sector_unclassified_allocated + is_allocated
    for tag in tags:
        sector_counts[tag] = sector_counts.get(tag, 0) + 1
        sector_allocated[tag] = sector_allocated.get(tag, 0) + is_allocated

sector_cards = []
for tag in sector_counts:
    sector_cards.append({
        "sector": tag,
        "count": sector_counts[tag],
        "allocated": sector_allocated[tag],
        "unallocated": sector_counts[tag] - sector_allocated[tag]
    })

# Sector taxonomy confirmed for the dashboard: always show a card, even at zero.
known_sectors = ["Exploration & Upstream Production", "Petrochemicals", "Power", "Water", "Refining", "Chemicals", "Gas", "Plastics", "Mining", "Industrial", "Renewable", "Construction", "Onshore", "Offshore", "Pipeline", "Infrastructure", "Food & Agriculture"]
for known_sector in known_sectors:
    if known_sector not in sector_counts:
        sector_cards.append({"sector": known_sector, "count": 0, "allocated": 0, "unallocated": 0})

sector_cards = sorted(sector_cards, key=lambda x: (-x["count"], x["sector"]))


# ---------------------------------------------------------
# PROJECTS BY REGION (reporting classification from the City field)
# Reporting only: the City values and DMS data are never changed.
# Each project falls in exactly one region. A City that is not in
# the table below is counted as Unclassified and listed in
# region_unmapped so the table can be extended.
# Medium/Low confidence cities are listed in region_review_cities.
# ---------------------------------------------------------

region_map = {
    "": "Unclassified",
    "abha": "Other",
    "abqaiq": "Eastern",
    "abqaiq - sitra": "Eastern",
    "abu arish": "Other",
    "abu safah": "Eastern",
    "abu safah, berri, manifa and safaniya fields": "Eastern",
    "ad'diriyah": "Riyadh",
    "afif": "Riyadh",
    "al aflaj": "Riyadh",
    "al ahsa": "Eastern",
    "al ahsa, eastern province (ash sharqiyah)": "Eastern",
    "al baha": "Other",
    "al dammam": "Eastern",
    "al faisaliah": "Riyadh",
    "al ghat": "Riyadh",
    "al hinakiyah": "Western",
    "al jafurah": "Eastern",
    "al jalamid": "Other",
    "al jouf": "Other",
    "al jubail": "Eastern",
    "al kahfah": "Other",
    "al khafaji": "Eastern",
    "al khafji": "Eastern",
    "al kharj": "Riyadh",
    "al khobar": "Eastern",
    "al khobar, eastern province": "Eastern",
    "al khuzama, riyadh": "Riyadh",
    "al majmaah": "Riyadh",
    "al majmaah governorate riyadh": "Riyadh",
    "al masa'a": "Unclassified",
    "al qatif": "Eastern",
    "al qurayyat": "Other",
    "al rass": "Other",
    "al saad": "Unclassified",
    "al sharqiya": "Eastern",
    "al shuqaiq": "Other",
    "al taif": "Western",
    "al uqair port, eastern province": "Eastern",
    "alula": "Western",
    "ar rass": "Other",
    "arabiyah": "Eastern",
    "arar": "Other",
    "as saffaniyah": "Eastern",
    "asir": "Other",
    "berri": "Eastern",
    "bilghah, madinah province": "Western",
    "bish": "Other",
    "bisha": "Other",
    "buraidah": "Other",
    "central region": "Unclassified",
    "dammam": "Eastern",
    "dammam 3rd industrial city": "Eastern",
    "dhahran": "Eastern",
    "dhurma": "Riyadh",
    "diriyah": "Riyadh",
    "duba": "Other",
    "east - west pipeline": "Unclassified",
    "eastern a cluster": "Eastern",
    "eastern province": "Eastern",
    "eastern province to qassim region": "Unclassified",
    "eastern province/jeddah/madinah": "Unclassified",
    "eastern region": "Eastern",
    "empty quarter": "Unclassified",
    "empty quarter (rub al-khali)": "Unclassified",
    "erga": "Unclassified",
    "farasan": "Other",
    "hafr al-batin governorate and al-qaysumah governorate": "Eastern",
    "hail": "Other",
    "hail region": "Other",
    "haql": "Other",
    "haradh": "Eastern",
    "hasbah": "Eastern",
    "hawiyah": "Eastern",
    "jabal farasan": "Other",
    "jafurah": "Eastern",
    "jafurah gas field": "Eastern",
    "jazan": "Other",
    "jazan city for primary and downstream industries": "Other",
    "jazan city for primary and downstream industries (jcpdi)": "Other",
    "jazan industrial city, jazan province": "Other",
    "jeddah": "Western",
    "jeddah third industrial city": "Western",
    "jeddah/makkah": "Western",
    "jilah": "Unclassified",
    "jizan": "Other",
    "juaymah": "Eastern",
    "jubail": "Eastern",
    "jubail industrial city": "Eastern",
    "karan": "Eastern",
    "khafji": "Eastern",
    "khamis mushait": "Other",
    "khobar": "Eastern",
    "khurais": "Eastern",
    "khursaniyah": "Eastern",
    "king abdullah economic city": "Western",
    "knowledge economic city, madinah": "Western",
    "madinah": "Western",
    "madinah province": "Western",
    "mahd governorate, al madinah province, al suwayriqiyah and al aqiliyah.": "Western",
    "makkah": "Western",
    "makkah province": "Western",
    "makkah region": "Western",
    "makkah-taif": "Western",
    "manifa": "Eastern",
    "marjan": "Eastern",
    "mawqaq, hail province": "Other",
    "medina": "Western",
    "moyeath": "Unclassified",
    "najran": "Other",
    "neom": "Other",
    "neom, tabuk province": "Other",
    "neutral zone": "Eastern",
    "north": "Other",
    "north jeddah, makkah": "Western",
    "north western a cluster": "Other",
    "north western b cluster": "Other",
    "north western c cluster": "Other",
    "northern border with iraq": "Other",
    "northern cluster": "Other",
    "northwestern region": "Other",
    "nuayyim": "Unclassified",
    "olaya district, riyadh": "Riyadh",
    "oxagon, neom": "Other",
    "qaisumah - rafha": "Unclassified",
    "qassim": "Other",
    "qassim province": "Other",
    "qassim region": "Other",
    "qatif": "Eastern",
    "qiddiya": "Riyadh",
    "qiddiya city": "Riyadh",
    "qunfudah": "Western",
    "qurayyah": "Eastern",
    "rabigh": "Western",
    "rafah": "Other",
    "rafha": "Other",
    "rafna": "Unclassified",
    "rahima": "Eastern",
    "ras al khair": "Eastern",
    "ras al khair industrial city": "Eastern",
    "ras al zour": "Eastern",
    "ras az zawr": "Eastern",
    "ras hamid": "Unclassified",
    "ras tanura": "Eastern",
    "red sea": "Unclassified",
    "riyadh": "Riyadh",
    "rub al khali": "Unclassified",
    "safaniyah": "Eastern",
    "salbukh": "Unclassified",
    "saudi arabia": "Unclassified",
    "shagran, madinah province": "Western",
    "shaybah": "Eastern",
    "shedgum": "Eastern",
    "shoaibah": "Western",
    "shuaibah": "Western",
    "shuqaiq": "Other",
    "south al-ula": "Western",
    "south ghawar": "Eastern",
    "southern region": "Other",
    "sudair": "Riyadh",
    "tabarjal": "Other",
    "tabrijal, al-jouf province": "Other",
    "tabuk": "Other",
    "tabuk province": "Other",
    "taiba - western medina region": "Western",
    "taif": "Western",
    "tathleeth, aseer province": "Other",
    "thawul": "Unclassified",
    "thuwal": "Western",
    "turaif": "Other",
    "turaif, arar, sakaka": "Other",
    "umm wu'al": "Unclassified",
    "urubah road/makkah al mukarramah road/olaya street/king fahd road": "Riyadh",
    "uthmaniyah": "Eastern",
    "various": "Unclassified",
    "waad al shamaal": "Other",
    "wadi al dawasir": "Riyadh",
    "western region": "Western",
    "yanbu": "Western",
    "yanbu al bahr": "Western",
    "zuluf": "Eastern"
}

region_review_cities = [
    "al faisaliah",
    "al masa'a",
    "al saad",
    "al shuqaiq",
    "alula",
    "arabiyah",
    "central region",
    "east - west pipeline",
    "eastern province to qassim region",
    "eastern province/jeddah/madinah",
    "empty quarter",
    "empty quarter (rub al-khali)",
    "erga",
    "hasbah",
    "jilah",
    "karan",
    "moyeath",
    "neutral zone",
    "north",
    "northern cluster",
    "nuayyim",
    "qaisumah - rafha",
    "qurayyah",
    "rafna",
    "rahima",
    "ras hamid",
    "red sea",
    "rub al khali",
    "salbukh",
    "saudi arabia",
    "shuqaiq",
    "south al-ula",
    "thawul",
    "umm wu'al",
    "various"
]

region_order = ["Riyadh", "Eastern", "Western", "Other", "Unclassified"]

region_rows = frappe.db.get_all(
    "DMS Project",
    fields=["name", "city", "sales_person"],
    limit_page_length=0
)

region_data = {}
for region_name in region_order:
    region_data[region_name] = {"region": region_name, "count": 0, "allocated": 0, "review": 0, "ids": [], "cities": [], "dirty": False, "mode": "cities"}

region_unmapped_counts = {}
for region_row in region_rows:
    city_key = (region_row.get("city") or "").strip().lower()
    region_name = region_map.get(city_key)
    if not region_name:
        region_name = "Unclassified"
        region_unmapped_counts[city_key] = region_unmapped_counts.get(city_key, 0) + 1
    region_entry = region_data[region_name]
    region_entry["count"] = region_entry["count"] + 1
    if region_row.get("sales_person"):
        region_entry["allocated"] = region_entry["allocated"] + 1
    if city_key in region_review_cities:
        region_entry["review"] = region_entry["review"] + 1
    region_entry["ids"].append(region_row.get("name"))
    region_city = region_row.get("city")
    if region_city and region_city not in region_entry["cities"]:
        region_entry["cities"].append(region_city)
    if region_city and (region_city != region_city.lstrip() or "," in region_city):
        region_entry["dirty"] = True

# Click-through filter: a short exact city list when every stored City
# value matches cleanly in the database; otherwise (Unclassified, or a
# City with a leading space or a comma, which the list filter cannot
# match exactly) the
# exact project IDs, so counts stay exact.
for region_name in region_order:
    region_entry = region_data[region_name]
    if region_name == "Unclassified" or region_entry["dirty"]:
        region_entry["mode"] = "ids"
        region_entry["cities"] = []
    else:
        region_entry["mode"] = "cities"
        # ids are kept for every region so the Project Explorer can combine region and sector exactly

region_cards = []
for region_name in region_order:
    region_cards.append(region_data[region_name])

region_unmapped = []
for unmapped_key in region_unmapped_counts:
    region_unmapped.append({"city": unmapped_key, "projects": region_unmapped_counts[unmapped_key]})


# ---------------------------------------------------------
# CONTRACTING COMPANIES (read-only aggregation, display aliases only)
# Original DMS company names are never modified.
# ---------------------------------------------------------

contractor_alias_rules = [
    {"label": "Nesma Group", "exact": ["nesma"], "prefix": ["nesma "]},
    {"label": "Al Bawani", "exact": ["albawani", "al bawani"], "prefix": []},
    {"label": "China Harbour (CHEC)", "exact": ["china harbour engineering co. ltd (chec)"], "prefix": []}
]

contractor_allocated = {}
for alloc_row in frappe.db.get_all("DMS Project", filters={"allocation_status": "Allocated"}, fields=["name"], limit_page_length=0):
    contractor_allocated[alloc_row.get("name")] = 1


def build_company_list(table_name, with_flags, alias_rules, allocated_map, pid_index, pid_list):
    fields = ["parent", "company"]
    if with_flags:
        fields = ["parent", "company", "pre_qualified", "bidding", "awarded"]
    rows = frappe.db.get_all(table_name, filters={"parenttype": "DMS Project"}, fields=fields, limit_page_length=0)
    groups = {}
    group_order = []
    exact_names = {}
    for row in rows:
        raw_name = " ".join((row.get("company") or "").strip().split())
        if not raw_name:
            continue
        exact_names[row.get("company") or ""] = 1
        norm_key = raw_name.lower()
        label = raw_name
        for rule in alias_rules:
            matched = norm_key in rule["exact"]
            if not matched:
                for pfx in rule["prefix"]:
                    if norm_key.startswith(pfx):
                        matched = True
            if matched:
                label = rule["label"]
                norm_key = "alias:" + rule["label"].lower()
        group = groups.get(norm_key)
        if not group:
            group = {"name": label, "projects": {}, "entities": {}, "aliased": norm_key.startswith("alias:")}
            groups[norm_key] = group
            group_order.append(norm_key)
        elif (not group["aliased"]) and group["name"].isupper() and (not raw_name.isupper()):
            group["name"] = raw_name
        flag = 0
        if with_flags:
            if row.get("pre_qualified"):
                flag = flag | 1
            if row.get("bidding"):
                flag = flag | 2
            if row.get("awarded"):
                flag = flag | 4
        parent_id = row.get("parent")
        group["projects"][parent_id] = (group["projects"].get(parent_id) or 0) | flag
        entity = group["entities"].get(raw_name)
        if not entity:
            entity = {}
            group["entities"][raw_name] = entity
        entity[parent_id] = 1

    companies = []
    covered = {}
    for key in group_order:
        group = groups[key]
        project_list = []
        alloc_count = 0
        for pid in group["projects"]:
            if pid not in pid_index:
                pid_index[pid] = len(pid_list)
                pid_list.append(pid)
            project_list.append(pid_index[pid] * 8 + group["projects"][pid])
            covered[pid] = 1
            if allocated_map.get(pid):
                alloc_count = alloc_count + 1
        entity_list = []
        for entity_name in group["entities"]:
            entity_list.append({"name": entity_name, "projects": len(group["entities"][entity_name])})
        if len(entity_list) < 2 and (not group["aliased"]):
            entity_list = []
        companies.append({
            "name": group["name"],
            "count": len(project_list),
            "allocated": alloc_count,
            "entities": entity_list,
            "p": project_list
        })
    return {
        "companies": companies,
        "exact_names": len(exact_names),
        "normalized_names": len(companies),
        "projects_covered": len(covered),
        "records": len(rows)
    }


contractor_allocated_ids = []
for alloc_id in contractor_allocated:
    contractor_allocated_ids.append(alloc_id)

contractor_pid_index = {}
contractor_pid_list = []
contractor_main = build_company_list("DMS Project Contractor", True, contractor_alias_rules, contractor_allocated, contractor_pid_index, contractor_pid_list)
contractor_sub = build_company_list("DMS Project Subcontractor", False, contractor_alias_rules, contractor_allocated, contractor_pid_index, contractor_pid_list)

contractor_data = {
    "contractors": contractor_main,
    "subcontractors": contractor_sub,
    "project_ids": contractor_pid_list,
    "allocated_ids": contractor_allocated_ids,
    "pinned": ["Al Bawani", "Nesma Group", "China Harbour (CHEC)"]
}


# ---------------------------------------------------------
# RESPONSE
# ---------------------------------------------------------

frappe.response["message"] = {
    "status": "success",

    "summary": {
        "total_projects": total_projects,
        "allocated": allocated,
        "unallocated": unallocated,
        "never_contacted": not_contacted,

        "contacted": contacted,
        "meeting_scheduled": meeting_scheduled,
        "quotation_submitted": quotation_submitted,
        "negotiation": negotiation,

        "won": won,
        "lost": lost,
        "due_today": due_today,
        "overdue": overdue,

        "allocation_mismatch": allocation_mismatch
    },

    "sales_people": sales_people,

    "recent_followups": recent_followups,

    "overdue_followups": overdue_followups,

    "upcoming_followups": upcoming_followups,
    "sector_cards": sector_cards,
    "region_cards": region_cards,
    "contractor_data": contractor_data,
    "region_unmapped": region_unmapped,
    "sector_unclassified": {
        "count": sector_unclassified,
        "allocated": sector_unclassified_allocated
    }
}
