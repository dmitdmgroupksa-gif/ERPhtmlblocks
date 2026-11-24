# EXEC ADMIN API  —  Server Script  (Script Type: API, API Method: exec_admin_api)
# Read-only backend for the "Executive Secretary & Admin" dashboard (exec_admin_dashboard.js / .css).
# One call (action=bootstrap) returns everything the dashboard shows:
#   requests       Materials Service General Request Form - open admin-type requests (types in CFG["request_types"])
#   renewals       DM Facilities Management expiry dates (lease, CR, licence, civil defence, permits, service contracts, national address)
#                  + IT Renewals Subscription + Procurement and Logistics Renewals
#   register       DM Letters + DM Official Memo (last CFG["register_days"] days, plus anything still waiting for approval)
#   rent           unpaid rent instalments from DM Facilities Management (overdue or due within CFG["rent_horizon_days"])
#   visitors       Daily Visitors Record for today and the next 7 days
#   approvals      every count card on the "Approvals Pending" workspace (/app/approvals-pending), as a list of the records each card
#                  counts, using the card's own filters; Material Requests Pending for PO and Pending PO are excluded (CFG)
# Nothing is changed here: rows open the original record in ERPNext, where the normal workflow and permissions apply.
#
# Frappe Server Script rules (RestrictedPython): no imports, no "+=", no f-strings, no names starting with "_".

CFG = {
    # who may open the dashboard: any of these roles, or a user listed in "users" (Administrator always can)
    "roles": ["System Manager", "Executive Secretary", "Administration Manager"],
    "users": [],                      # e.g. ["secretary@dmgroupksa.com"]
    # Materials Service General Request Form types that count as admin requests
    "request_types": ["General Payment/Service Requests", "Vehicle Related Requests", "General Requests", "Renewal Requests"],
    "closed_states": ["Rejected", "Cancelled", "Canceled", "Closed"],   # workflow states that are finished even while docstatus = 0
    "request_overdue_days": 7,        # an open request older than this is "overdue"
    "renewal_horizon_days": 120,      # renewals listed when they expire within this many days (expired ones are always listed)
    "renewal_due_days": 30,           # "due soon" window (amber) and the KPI
    "rent_horizon_days": 45,          # unpaid rent instalments listed when due within this many days (overdue always listed)
    "register_days": 90,              # letters / memos dated within this many days
    # approvals: every count card on this workspace (/app/approvals-pending) becomes a list, using the card's own filters,
    # so cards added or changed there show up here too. Cards named in "approvals_exclude" are left out.
    "approvals_workspace": "Approvals Pending",
    "approvals_exclude": ["Material Requests Pending for PO", "Purchase Order - To Receive and Bill"],
    "approvals_overdue_days": 3,      # waiting longer than this since the last update = "remind CEO" (red)
    "approvals_max_rows": 500,        # per card, safety limit
}
U = frappe.utils

# DM Facilities Management date field -> (label, category, vendor/authority field)
FACILITY_DATES = [
    ["rentdate_to", "Rent agreement", "Lease", "owner_name"],
    ["lease_end", "Lease contract", "Lease", "owner_name"],
    ["agreement_date_to", "Rent agreement", "Lease", "owner_name"],
    ["cr_date_to", "Commercial Registration (CR)", "Licence", "issued_authority"],
    ["com_lic_exp", "Commercial licence (Baladiya)", "Licence", "municipality"],
    ["cd_date_to", "Civil Defence certificate", "Licence", "authority"],
    ["national_adress_expiry", "National Address", "Licence", ""],
    ["industrial_expiry", "Industrial licence", "Permit", ""],
    ["construction_environmental_permit_expiry", "Construction environmental permit", "Permit", ""],
    ["operational_environmental_permit_expiry", "Operational environmental permit", "Permit", ""],
    ["fire_expiry", "Fire maintenance contract", "Service contract", "fire_contractor"],
    ["cleanig_exp_date", "Cleaning contract", "Service contract", "cleaning_cont"],
    ["camera_expiry", "Camera maintenance contract", "Service contract", "camera_contractor"],
]

# unpaid rent instalments: [due date column, paid tick column, amount column]
RENT_PAIRS = [
    ["installment_1_dues_on", "paid1_not", "amount_intallments", 1],
    ["installment_2_dues_on", "paid2_not", "amount_intallments", 2],
    ["installment_3_dues_on", "paid3_not", "amount_intallments", 3],
    ["installment_4_dues_on", "paid4_not", "amount_intallments", 4],
    ["rental_start_date", "paid", "", 1],
    ["2nd_rental_installment_date", "paid_2", "", 2],
    ["3_rent_installment_dues_on", "paid_3", "", 3],
]


def allowed(user):
    if user == "Administrator" or user in CFG["users"]:
        return True
    for role in frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role"):
        if role in CFG["roles"]:
            return True
    return False


def employee_names(ids):
    out = {}
    ids = [x for x in ids if x]
    if not ids:
        return out
    for e in frappe.get_all("Employee", filters={"name": ["in", list(set(ids))]}, fields=["name", "employee_name"], limit_page_length=0):
        out[e.name] = e.employee_name or e.name
    return out


METAS = {}


def has_col(doctype, col):
    # fields can be renamed on the live site; skip any that are gone instead of failing the whole section
    if doctype not in METAS:
        METAS[doctype] = frappe.get_meta(doctype)
    return bool(METAS[doctype].has_field(col))


def get_requests(today):
    rows = frappe.db.sql("select name, date, employee, department, branch_req, request_type, description_req, workflow_state, "
                         "total_amount, docstatus, prepared_by, modified from `tabMaterials Service General Request Form` "
                         "where docstatus = 0 and request_type in %(types)s and ifnull(workflow_state, '') not in %(closed)s "
                         "order by date asc, creation asc ",
                         {"types": tuple(CFG["request_types"]), "closed": tuple(CFG["closed_states"])}, as_dict=True)
    rows = [r for r in rows if (r.workflow_state or "") not in CFG["closed_states"]]
    names = employee_names([r.employee for r in rows] + [r.prepared_by for r in rows])
    out = []
    for r in rows:
        age = U.date_diff(today, r.date) if r.date else 0
        out.append({"name": r.name, "date": str(r.date or ""), "age": age, "overdue": age > U.cint(CFG["request_overdue_days"]),
                    "employee": names.get(r.employee) or names.get(r.prepared_by) or r.employee or "",
                    "department": r.department or "", "branch": r.branch_req or "", "type": r.request_type or "",
                    "subject": r.description_req or "", "state": r.workflow_state or "Draft",
                    "amount": U.flt(r.total_amount) if r.total_amount else 0, "modified": str(r.modified)})
    return out


def renewal_row(source, doctype, name, title, label, category, vendor, expiry, today, amount, owner):
    days = U.date_diff(expiry, today)
    return {"source": source, "doctype": doctype, "name": name, "title": title or name, "label": label, "category": category,
            "vendor": vendor or "", "expiry": str(expiry), "days": days, "amount": U.flt(amount), "owner": owner or ""}


def get_renewals(today):
    horizon = U.add_days(today, U.cint(CFG["renewal_horizon_days"]))
    out = []
    cols = [x for x in FACILITY_DATES if has_col("DM Facilities Management", x[0])]
    extra = []
    for x in cols:
        if x[3] and x[3] not in extra and has_col("DM Facilities Management", x[3]):
            extra.append(x[3])
    sel = ", ".join(["`" + x[0] + "`" for x in cols] + ["`" + x + "`" for x in extra])
    facs = frappe.db.sql("select name, facility_name, facility_detail, location, " + sel + " from `tabDM Facilities Management` "
                         "where docstatus < 2 and ifnull(facility_contract_status, '') != 'Closed'", as_dict=True)
    for f in facs:
        seen = {}
        title = f.facility_name or f.name
        if f.location:
            title = title + " - " + f.location
        for x in cols:
            d = f.get(x[0])
            if not d or str(d) > str(horizon):
                continue
            key = x[1] + str(d)
            if seen.get(key):
                continue
            seen[key] = 1
            out.append(renewal_row("Facility", "DM Facilities Management", f.name, title, x[1], x[2],
                                   f.get(x[3]) if x[3] in extra else "", d, today, 0, f.facility_detail or ""))
    for dt, cat in [["IT Renewals Subscription", "IT subscription"], ["Procurement and Logistics Renewals", "Procurement"]]:
        for r in frappe.db.sql("select name, renewal_name, type_renewal, expiry_date, total_amount, provider__source, responsible_person "
                               "from `tab" + dt + "` where docstatus < 2 and expiry_date is not null and expiry_date <= %(h)s",
                               {"h": horizon}, as_dict=True):
            out.append(renewal_row(cat, dt, r.name, r.renewal_name or r.name, r.type_renewal or cat, cat,
                                   r.provider__source, r.expiry_date, today, r.total_amount, r.responsible_person))
    names = employee_names([r["owner"] for r in out if r["source"] == "Procurement"])
    for r in out:
        if r["source"] == "Procurement" and names.get(r["owner"]):
            r["owner"] = names.get(r["owner"])
    return sorted(out, key=lambda r: r["days"])


def get_register(today):
    since = U.add_days(today, -U.cint(CFG["register_days"]))
    out = []
    letters = frappe.db.sql("select name, date, company, subject, request_by, workflow_state, docstatus, printed as was_printed, under_review, filed "
                            "from `tabDM Letters` where docstatus < 2 and (date >= %(s)s or docstatus = 0) "
                            "order by date desc ", {"s": since}, as_dict=True)
    memos = frappe.db.sql("select name, memo_date, memo_type, to_whome, memo_subject, issued_by, workflow_state, docstatus, "
                          "attch_signed, received, under_review, filed from `tabDM Official Memo` "
                          "where docstatus < 2 and (memo_date >= %(s)s or docstatus = 0) "
                          "order by memo_date desc ", {"s": since}, as_dict=True)
    names = employee_names([r.request_by for r in letters] + [r.issued_by for r in memos])
    for r in letters:
        out.append(register_row("Letter", "DM Letters", r.name, r.date, r.subject, r.company, names.get(r.request_by) or r.request_by,
                                r.workflow_state, r.docstatus, r.was_printed, r.under_review, r.filed, None, today))
    for r in memos:
        to = r.memo_type or ""
        if r.to_whome:
            to = (to + " - " if to else "") + r.to_whome
        out.append(register_row("Memo", "DM Official Memo", r.name, r.memo_date, r.memo_subject, to, names.get(r.issued_by) or r.issued_by,
                                r.workflow_state, r.docstatus, r.received, r.under_review, r.filed, r.attch_signed, today))
    return sorted(out, key=lambda r: r["date"], reverse=True)


def register_row(kind, doctype, name, date, subject, party, by, state, docstatus, was_printed, review, filed, signed, today):
    state = state or ""
    if state in CFG["closed_states"]:
        status = "Rejected"
    elif U.cint(docstatus) == 0:
        status = "Awaiting approval"
    elif kind == "Memo" and not signed:
        status = "Awaiting signed copy"
    elif filed == "Yes":
        status = "Filed"
    elif review == "Yes":
        status = "Under review"
    elif was_printed == "Yes":
        status = "Received" if kind == "Memo" else "Printed"
    else:
        status = "To file"
    return {"kind": kind, "doctype": doctype, "name": name, "date": str(date or ""), "age": U.date_diff(today, date) if date else 0,
            "subject": subject or "", "party": party or "", "by": by or "", "state": state, "status": status,
            "pending_signature": status in ["Awaiting approval", "Awaiting signed copy"]}


def get_rent(today):
    horizon = U.add_days(today, U.cint(CFG["rent_horizon_days"]))
    pairs = [p for p in RENT_PAIRS if has_col("DM Facilities Management", p[0]) and has_col("DM Facilities Management", p[1])]
    if not pairs:
        return []
    sel = []
    for i in range(len(pairs)):
        sel.append("`" + pairs[i][0] + "` as d" + str(i))
        sel.append("`" + pairs[i][1] + "` as p" + str(i))
    facs = frappe.db.sql("select name, facility_name, facility_detail, location, owner_name, owner_number, rent_mode, rent_paid_mode, "
                         "amount_intallments, rental_amount, rent_amount, no_installments, rent_installments, " + ", ".join(sel)
                         + " from `tabDM Facilities Management` where docstatus < 2 and ifnull(facility_contract_status, '') != 'Closed'",
                         as_dict=True)
    out = []
    for f in facs:
        seen = {}
        for i in range(len(pairs)):
            d = f.get("d" + str(i))
            if not d or U.cint(f.get("p" + str(i))) or str(d) > str(horizon) or seen.get(str(d)):
                continue
            seen[str(d)] = 1
            amt = U.flt(f.amount_intallments)
            if pairs[i][2] == "":
                n = U.cint(f.no_installments) or 1
                amt = U.flt(f.rental_amount) / n if U.flt(f.rental_amount) else amt
            title = f.facility_name or f.name
            out.append({"name": f.name, "title": title, "type": f.facility_detail or "", "location": f.location or "",
                        "landlord": f.owner_name or "", "phone": f.owner_number or "", "installment": pairs[i][3],
                        "due": str(d), "days": U.date_diff(d, today), "amount": U.flt(amt, 2),
                        "mode": f.rent_mode or f.rent_paid_mode or ""})
    return sorted(out, key=lambda r: r["days"])


def get_visitors(today):
    until = U.add_days(today, 7)
    out = []
    for r in frappe.db.sql("select v.name, v.appointment_date, d.visitor_name, d.visitor_company, d.visitor_department, "
                           "d.visitor_phone_no, d.employee, d.department from `tabDaily Visitors Record` v "
                           "join `tabDaily Visitor Detail` d on d.parent = v.name and d.parenttype = 'Daily Visitors Record' "
                           "where v.docstatus < 2 and v.appointment_date between %(t)s and %(u)s "
                           "order by v.appointment_date asc, d.idx asc", {"t": today, "u": until}, as_dict=True):
        out.append({"name": r.name, "date": str(r.appointment_date), "today": str(r.appointment_date) == str(today),
                    "visitor": r.visitor_name or "", "company": r.visitor_company or "", "phone": r.visitor_phone_no or "",
                    "host": r.employee or "", "department": r.department or r.visitor_department or ""})
    names = employee_names([r["host"] for r in out])
    for r in out:
        r["host"] = names.get(r["host"]) or r["host"]
    return out


# title / detail / person / amount / date fields, first one present on the DocType wins
APPROVAL_TITLE = ["description_req", "memo_subject", "subject", "event_name", "applicant_name", "customer_name", "purpose_of_travel", "employee_name", "title"]
APPROVAL_TYPE = ["request_type", "leave_type", "memo_type", "travel_type", "designation"]
APPROVAL_AMOUNT = ["total_amount", "grand_total"]
APPROVAL_DATE = ["date", "memo_date", "posting_date", "offer_date", "event_date", "from_date"]


def first_col(doctype, cols):
    for c in cols:
        if has_col(doctype, c):
            return c
    return ""


def get_approvals(today):
    ws = frappe.get_doc("Workspace", CFG["approvals_workspace"])
    cards = []
    recs = {}
    order = []
    users = []
    emps = []
    for c in ws.number_cards:
        card_name = c.number_card_name
        if not card_name or card_name in CFG["approvals_exclude"]:
            continue
        label = (c.label or card_name).strip()
        item = {"card": card_name, "label": label, "doctype": "", "count": 0, "error": ""}
        cards.append(item)
        try:
            nc = frappe.get_doc("Number Card", card_name)
            dt = nc.document_type
            item["doctype"] = dt or ""
            if nc.type != "Document Type" or not dt:
                item["error"] = "Card type not supported"
                continue
            flt = []
            for f in json.loads(nc.filters_json or "[]"):
                flt.append(f[:4] if len(f) > 4 else f)
            cols = {"title": first_col(dt, APPROVAL_TITLE), "type": first_col(dt, APPROVAL_TYPE), "amount": first_col(dt, APPROVAL_AMOUNT),
                    "date": first_col(dt, APPROVAL_DATE), "emp": "employee" if has_col(dt, "employee") else "",
                    "state": "workflow_state" if has_col(dt, "workflow_state") else ("status" if has_col(dt, "status") else "")}
            fields = ["name", "owner", "creation", "modified"]
            for k in cols:
                if cols[k] and cols[k] not in fields:
                    fields.append(cols[k])
            rows = frappe.get_all(dt, filters=flt, fields=fields, order_by="modified asc", limit_page_length=U.cint(CFG["approvals_max_rows"]))
            item["count"] = len(rows)
            for r in rows:
                key = dt + "::" + r.name
                rec = recs.get(key)
                if not rec:
                    d = r.get(cols["date"]) if cols["date"] else None
                    d = d or r.creation
                    waiting = U.date_diff(today, r.modified)
                    rec = {"doctype": dt, "name": r.name, "title": (r.get(cols["title"]) if cols["title"] else "") or r.name,
                           "type": (r.get(cols["type"]) if cols["type"] else "") or "", "state": (r.get(cols["state"]) if cols["state"] else "") or "",
                           "amount": U.flt(r.get(cols["amount"])) if cols["amount"] else 0, "date": str(d)[:10],
                           "age": U.date_diff(today, r.creation), "waiting": waiting, "overdue": waiting > U.cint(CFG["approvals_overdue_days"]),
                           "employee": (r.get("employee") if cols["emp"] else "") or "", "owner": r.owner or "", "cards": []}
                    recs[key] = rec
                    order.append(key)
                    users.append(r.owner)
                    emps.append(rec["employee"])
                rec["cards"].append(label)
        except Exception as e:
            item["error"] = str(e)[:200]
    names = employee_names(emps)
    full = {}
    owners = [u for u in users if u]
    if owners:
        for u in frappe.get_all("User", filters={"name": ["in", list(set(owners))]}, fields=["name", "full_name"], limit_page_length=0):
            full[u.name] = u.full_name or u.name
    out = []
    for key in order:
        rec = recs[key]
        rec["by"] = names.get(rec["employee"]) or full.get(rec["owner"]) or rec["owner"]
        out.append(rec)
    return {"cards": cards, "items": sorted(out, key=lambda r: -r["waiting"])}


def section(key, fn, today, data, errors):
    try:
        data[key] = fn(today)
    except Exception as e:
        data[key] = []
        errors[key] = str(e)[:300]


args = frappe.form_dict
action = args.get("action") or "bootstrap"
user = frappe.session.user
if not allowed(user):
    frappe.throw("You do not have access to the Executive Secretary dashboard. Ask the system manager to add your role in the EXEC ADMIN API script.")

res = {}
if action == "bootstrap":
    today = U.nowdate()
    errors = {}
    section("requests", get_requests, today, res, errors)
    section("renewals", get_renewals, today, res, errors)
    section("register", get_register, today, res, errors)
    section("rent", get_rent, today, res, errors)
    section("visitors", get_visitors, today, res, errors)
    section("approvals", get_approvals, today, res, errors)
    res["errors"] = errors
    res["today"] = today
    res["user"] = frappe.db.get_value("User", user, "full_name") or user
    res["cfg"] = {"due_days": U.cint(CFG["renewal_due_days"]), "overdue_days": U.cint(CFG["request_overdue_days"]),
                  "horizon_days": U.cint(CFG["renewal_horizon_days"]), "rent_days": U.cint(CFG["rent_horizon_days"]),
                  "register_days": U.cint(CFG["register_days"]), "approvals_overdue_days": U.cint(CFG["approvals_overdue_days"])}
else:
    frappe.throw("Unknown action: " + str(action))

frappe.response["message"] = res
