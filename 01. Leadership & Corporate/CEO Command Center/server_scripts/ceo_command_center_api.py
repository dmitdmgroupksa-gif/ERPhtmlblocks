# API method: ceo_command_center_api
# CEO Command Centre - single read-only API (Server Script, Script Type = API).
#
# Read actions: bootstrap | overview | department | actions | drilldown | source_health
# - Business records are read with frappe.get_list (native read permissions + user permissions).
# - frappe.get_all is used only for configuration/metadata (Workflow definitions, Has Role, display names).
# - Nothing is written. No approve/submit/assign/notify capability exists in this release.
# - Every source runs in isolation; a failure is reported as restricted / not configured / unavailable,
#   never as a zero. Partial lists say so.

API_VERSION = "2026.11-1"
POLICY = {
    "version": "2026.11-1",
    "upcoming_days": 7,          # default "due soon" / upcoming window (7, 14 or 30 selectable)
    "stale_days": 14,            # pending approval with another role, untouched this long = stalled
    "recent_overdue_days": 30,   # overdue within this window = individual rows; older = backlog bundle
    "ar_followup_days": 60,      # receivables overdue beyond this = collection follow-up
    "ar_escalation_days": 120,   # receivables overdue beyond this = escalation
    "ap_escalation_days": 90,
    "bundle_limit": 25,          # more rows than this for one source/state = one bundled action
    "expiry_window_days": 30,    # documents/renewals expiring within this window = due soon
}
VIEW_ROLES = ["System Manager", "IT Coordinator", "CEO Command Center Viewer", "CEO"]
VIEW_USERS = ["info@dmgroupksa.com"]
DEPTS = [
    ["sales", "Sales"], ["procurement", "Procurement"], ["finance", "Finance"], ["people", "People & Admin"],
    ["projects", "Projects"], ["operations", "Operations"], ["manufacturing", "Manufacturing"],
    ["it", "IT & Assets"], ["legal", "Legal & Compliance"], ["dmcc", "DMCC"],
]
DEPT_KEYS = [d[0] for d in DEPTS]
GROUPS = ["decision", "escalation", "followup", "verification"]
SEV_RANK = {"critical": 0, "overdue": 1, "due_soon": 2, "pending": 3, "verify": 4}
GROUP_RANK = {"decision": 0, "escalation": 1, "followup": 2, "verification": 3}
# Department dashboards (public Workspaces) used for "Open department dashboard".
DASHBOARDS = {
    "sales": [["Sales CRM & Conversion Tracker", "sales-crm-&-conversion-tracker"], ["Lead Management", "lead-management"], ["DMS Sales Management", "dms-sales-management"]],
    "procurement": [["Pre-Procurement", "pre-procurement-command-center"], ["Customs & Post-Procurement", "customs-&-post-procurement-dashboard"], ["DN & GRN Tracker", "dn-&-grn-tracker-dashboard"], ["Inventory", "inventory-dashboard"]],
    "finance": [["Credit Controller", "credit-controller-dashboard"], ["Accounts Payable", "accounts-payable-dashboard"], ["Treasury", "treasury-dashboard"], ["SOA Manager", "soa-manager"], ["VAT & ZATCA", "vat-&-zatca-command-center"]],
    "people": [["Admin HR", "admin-hr-dashboard"], ["Employee Vacation Tracker", "employee-vacation-tracker"], ["Govt Relations", "govt-relation-dashboard"], ["Admin & HR Platforms Expiry", "admin-&-hr-platforms-expiry"], ["Executive Secretary", "executive-secretary-dashboard"]],
    "projects": [["Technical Department", "technical-department-command-center"], ["DMS Technical Department", "dms-technical-department"], ["DM Contracting", "dm-contracting-dept.-dashboard"]],
    "operations": [["Fleet", "fleet-dashboard"], ["Logistics", "logistics-dashboard"], ["Delivery & Forklift", "delivery-&-forklift-dashboard"], ["Operation", "operation-dashboard"], ["Scaffolding Rental", "scaffolding-rental---employee-dashboard"]],
    "manufacturing": [["Manufacturing", "manufacturing-dashboard"]],
    "it": [["IT Platforms Expiry", "it-platforms-expiry-dashboard"], ["IT Asset Acquisition", "it-asset-acquisition-dashboard"], ["Plant & Furniture Assets", "plant-&-furniture-asset-dashboard"], ["ERP User Access", "erp-user-access-dashboard"]],
    "legal": [["Legal / Taradhi", "legal-dashboard"], ["Document Control", "document-control-dashboard"]],
    "dmcc": [["DMCC", "dmcc-dashboard"]],
}
# Workflow DocType -> department. Unknown workflow DocTypes are reported under People & Admin with a data check.
WF_DEPT = {
    "Bank Account": "finance", "Bank": "finance", "Credit Note Request - Sales Return": "finance", "Journal Entry": "finance",
    "Payment Entry": "finance", "Customer Transaction Summary": "finance", "Loan Application": "people",
    "Daily Production Cost": "manufacturing", "Factory Daily Production": "manufacturing",
    "DM Letters": "people", "DM Official Memo": "people", "DMG Event Management Schedule": "people",
    "Materials Service General Request Form": "people", "Leave Application": "people", "Qiwa contract renewal request": "people",
    "Resignation Letter": "people", "Training": "people", "Travel Request": "people",
    "DM Vehicle Booking Schedule System": "operations", "Logistics Daily Report": "operations", "Vehicle Maintenance Schedule": "operations",
    "IT Help Desk Request": "it", "Landed Costing Calculator": "procurement", "Material Request": "procurement", "Purchase Order": "procurement",
    "Quotation": "sales", "Sales Order": "sales", "Sample Board Request": "sales", "Target Vs Actual Report": "sales",
    "Project Overview": "projects", "Submittal Request": "projects",
}
# Preferred human title field per workflow DocType (checked against live metadata before use).
WF_TITLE = {
    "Quotation": "customer_name", "Sales Order": "customer_name", "Leave Application": "employee_name", "Travel Request": "employee_name",
    "DM Letters": "subject", "DM Official Memo": "memo_subject", "Materials Service General Request Form": "description_req",
    "IT Help Desk Request": "subject", "Resignation Letter": "employee", "Qiwa contract renewal request": "emp_name",
    "DMG Event Management Schedule": "event_name", "Material Request": "title", "Payment Entry": "party_name", "Journal Entry": "title",
    "Expense Claim": "employee_name", "Credit Note Request - Sales Return": "customer_name", "Loan Application": "applicant_name",
    "Training": "trainee", "Landed Costing Calculator": "title", "Customer Transaction Summary": "customer",
}
# Verified company-currency amount fields (Currency options = Company:company:default_currency).
WF_AMOUNT = {
    "Quotation": "base_grand_total", "Sales Order": "base_grand_total", "Purchase Order": "base_grand_total",
    "Payment Entry": "base_paid_amount", "Journal Entry": "total_debit", "Expense Claim": "grand_total", "Loan Application": "loan_amount",
    "Credit Note Request - Sales Return": "difference_value_inc_vat",
}
# Amount fields whose Currency options are empty on this site: shown with "currency not recorded".
WF_AMOUNT_NO_CURRENCY = ["Credit Note Request - Sales Return"]
APPROVE_ACTIONS = ["approve", "first approve", "final approval", "accept", "review", "submit for review"]
DONE_PREFIXES = ["approved", "accepted", "completed", "complete", "closed", "rejected", "lost", "cancel", "finally rejected"]
STD_FIELDS = ["name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "_assign"]

# ----------------------------------------------------------------------------- request + access
user = frappe.session.user
if user == "Guest":
    frappe.throw("Please log in.")
user_roles = frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role")
allowed = user in VIEW_USERS or user == "Administrator"
for r in VIEW_ROLES:
    if r in user_roles:
        allowed = True
if not allowed:
    frappe.throw("CEO Command Centre access required.")

fd = frappe.form_dict
action = fd.get("action") or "overview"
if action not in ["bootstrap", "overview", "department", "actions", "drilldown", "source_health", "approvals", "approval_detail"]:
    frappe.throw("Unsupported action.")
today = frappe.utils.today()
now_s = str(frappe.utils.now())[:19]


def clean_date(value, fallback):
    if not value:
        return fallback
    try:
        return str(frappe.utils.getdate(value))
    except Exception:
        frappe.throw("Invalid date: " + str(value)[:20])


window = frappe.utils.cint(fd.get("window") or POLICY["upcoming_days"])
if window not in [7, 14, 30]:
    window = POLICY["upcoming_days"]
horizon = str(frappe.utils.add_days(today, window))
p_to = clean_date(fd.get("to_date"), today)
p_from = clean_date(fd.get("from_date"), p_to[:8] + "01")
if p_from > p_to:
    frappe.throw("Performance period start is after its end.")
if frappe.utils.date_diff(p_to, p_from) > 400:
    frappe.throw("Performance period is limited to 400 days.")
dept_arg = fd.get("department") or ""
if dept_arg and dept_arg not in DEPT_KEYS:
    frappe.throw("Unknown department.")

companies = frappe.get_list("Company", fields=["name", "default_currency", "abbr"], order_by="name asc", limit_page_length=200)
company_currency = {}
for c in companies:
    company_currency[c.name] = c.default_currency
company = fd.get("company") or ""
if company and company not in company_currency:
    frappe.throw("Company is not accessible.")

# ----------------------------------------------------------------------------- helpers
SOURCES = []
ACTIONS = []
UPCOMING = []
INDICATORS = {}
PERFORMANCE = {}
CHECKS = []
NAME_CACHE = {"User": {}, "Employee": {}}
META_CACHE = {}
META_OPTS = {}


def slug(dt):
    return dt.lower().replace(" ", "-")


def list_route(dt, filters):
    # Structured list target; the browser opens it with frappe.route_options (no hand-built URLs).
    return {"doctype": dt, "filters": filters or []}


def meta_fields(dt):
    if dt in META_CACHE:
        return META_CACHE[dt]
    out = None
    try:
        meta = frappe.get_meta(dt)
        out = {}
        for f in meta.fields:
            out[f.fieldname] = f.fieldtype
            META_OPTS[dt + "." + f.fieldname] = f.options or ""
    except Exception:
        out = None
    META_CACHE[dt] = out
    return out


def missing_fields(dt, fields):
    mf = meta_fields(dt)
    if mf is None:
        return ["(DocType " + dt + " not installed)"]
    out = []
    for f in fields:
        base = f.split(" as ")[0].strip()
        if "(" in base or "." in base:
            continue
        if base not in STD_FIELDS and base not in mf:
            out.append(base)
    return out


def has_field(dt, field):
    mf = meta_fields(dt)
    return bool(mf) and field in mf


def gl(dt, fields, filters, order_by=None, group_by=None, limit=500, start=0):
    return frappe.get_list(dt, fields=fields, filters=filters, order_by=order_by or "modified desc",
                           group_by=group_by, limit_start=start, limit_page_length=limit)


def count(dt, filters):
    rows = frappe.get_list(dt, fields=["count(name) as n"], filters=filters, limit_page_length=1)
    return frappe.utils.cint(rows[0].n) if rows else 0


def fetch(dt, fields, filters, order_by, cap=2000):
    rows = []
    start = 0
    while True:
        batch = gl(dt, fields, filters, order_by=order_by, limit=500, start=start)
        rows.extend(batch)
        if len(batch) < 500:
            return rows, True
        start = start + 500
        if start >= cap:
            return rows, False


def group_rows(rows, keys, sum_field=None, date_field=None):
    """Aggregate fetched rows in Python. This ERP rejects min()/max() inside get_list fields."""
    out = {}
    order = []
    for r in rows:
        k = "|".join([str(r.get(x) or "") for x in keys])
        if k not in out:
            e = {"n": 0, "amt": 0.0, "oldest": "", "latest": "", "names": []}
            for x in keys:
                e[x] = r.get(x)
            out[k] = e
            order.append(k)
        e = out[k]
        e["n"] = e["n"] + 1
        if len(e["names"]) < 50:
            e["names"].append(r.get("name"))
        if sum_field:
            e["amt"] = e["amt"] + frappe.utils.flt(r.get(sum_field))
        if date_field and r.get(date_field):
            d = dstr(r.get(date_field))
            if not e["oldest"] or d < e["oldest"]:
                e["oldest"] = d
            if not e["latest"] or d > e["latest"]:
                e["latest"] = d
    return [out[k] for k in order]


def prime(kind, ids):
    """Batch-load display names (User.full_name / Employee.employee_name) to avoid one query per row."""
    cache = NAME_CACHE[kind]
    todo = [i for i in set([x for x in ids if x]) if i not in cache]
    field = "full_name" if kind == "User" else "employee_name"
    for i in range(0, len(todo), 200):
        chunk = todo[i:i + 200]
        for r in frappe.get_all(kind, filters={"name": ["in", chunk]}, fields=["name", field], limit_page_length=200):
            cache[r.name] = r.get(field) or r.name
        for x in chunk:
            if x not in cache:
                cache[x] = x


def prime_assign(rows):
    ids = []
    for r in rows:
        ids.extend(assigned(r))
    prime("User", ids)


def days_between(a, b):
    try:
        return frappe.utils.date_diff(a, b)
    except Exception:
        return None


def dstr(value):
    return str(value)[:10] if value else ""


def user_name(uid):
    if not uid:
        return ""
    cache = NAME_CACHE["User"]
    if uid not in cache:
        rows = frappe.get_all("User", filters={"name": uid}, fields=["full_name"], limit_page_length=1)
        cache[uid] = (rows[0].full_name if rows and rows[0].full_name else uid)
    return cache[uid]


def employee_name(eid):
    if not eid:
        return ""
    cache = NAME_CACHE["Employee"]
    if eid not in cache:
        rows = frappe.get_all("Employee", filters={"name": eid}, fields=["employee_name"], limit_page_length=1)
        cache[eid] = (rows[0].employee_name if rows and rows[0].employee_name else eid)
    return cache[eid]


def assigned(row):
    raw = row.get("_assign")
    if not raw:
        return []
    try:
        vals = frappe.parse_json(raw)
        return [v for v in vals if v]
    except Exception:
        return []


def owner_of(row, field=None, kind="User", label=""):
    """Return (display, basis). Never treats the record creator as the owner."""
    if field and row.get(field):
        val = row.get(field)
        if kind == "User":
            return user_name(val), label or ("Assigned in " + field)
        if kind == "Employee":
            return employee_name(val), label or ("Employee in " + field)
        return str(val), label or ("Recorded in " + field)
    users = assigned(row)
    if users:
        return ", ".join([user_name(u) for u in users[:3]]), "ERP assignment"
    return "", "unassigned"


def company_filter(dt, filters):
    """Adds a company filter when the DocType has a verified Company link. Returns scope state."""
    if not company:
        return "all"
    mf = meta_fields(dt) or {}
    if mf.get("company") == "Link":
        filters.append([dt, "company", "=", company])
        return "company"
    return "unscoped"


def act(src, dt, name, atype, dept, group, sev, title, reason, owner="", owner_basis="unassigned", due=None, due_basis="",
        amount=None, currency=None, amount_basis="", company_name=None, status="", age_from=None, extra=None, link=None, bundle=0):
    od = None
    if due:
        diff = days_between(today, dstr(due))
        if diff is not None and diff > 0:
            od = diff
    age = None
    if age_from:
        age = days_between(today, dstr(age_from))
    row = {
        "key": dt + "::" + str(name) + "::" + atype, "source": src, "doctype": dt, "name": str(name), "type": atype,
        "dept": dept, "group": group, "severity": sev, "title": title or str(name), "reason": reason,
        "owner": owner or "", "owner_basis": owner_basis if owner else "unassigned", "unowned": 0 if owner else 1,
        "due": dstr(due), "due_basis": due_basis, "overdue_days": od, "age_days": age,
        "amount": amount, "currency": currency, "amount_basis": amount_basis,
        "company": company_name or "", "status": status or "", "list": link,
        "bundle": bundle, "extra": extra or {},
    }
    ACTIONS.append(row)
    return row


def upcoming(src, dept, dt, name, date, kind, title, amount=None, currency=None, owner="", link=None):
    UPCOMING.append({"source": src, "dept": dept, "doctype": dt, "name": str(name), "date": dstr(date), "kind": kind,
                     "title": title, "amount": amount, "currency": currency, "owner": owner, "list": link})


def check(src, dept, label, count_value, detail, link=None, severity="verify"):
    CHECKS.append({"source": src, "dept": dept, "label": label, "count": count_value, "detail": detail, "list": link, "severity": severity})


def indicator(dept, key, label, value, basis, state="complete", tone="", unit="", currency=None):
    INDICATORS.setdefault(dept, []).append({"key": key, "label": label, "value": value, "basis": basis, "state": state,
                                            "tone": tone, "unit": unit, "currency": currency})


def perf(dept, key, payload):
    PERFORMANCE.setdefault(dept, {})[key] = payload


def classify(err):
    text = str(err)
    low = text.lower()
    if "field not permitted in query" in low or "unknown column" in low:
        return "unavailable", "ERP rejected the query: " + text[:200]
    if "permissionerror" in low or "no permission" in low or "insufficient permission" in low or "not permitted to" in low:
        return "restricted", "Your ERP role cannot read this source."
    if "doesn't exist" in low or "does not exist" in low or "not found" in low:
        return "not_configured", "Source DocType or field is not available on this site."
    return "unavailable", text[:240]


def run(src, dept, label, doctypes, fields_by_dt, fn):
    entry = {"key": src, "dept": dept, "label": label, "doctypes": doctypes, "state": "complete", "message": "",
             "scope": "company" if company else "all", "retrieved": now_s, "rows": 0}
    for dt in fields_by_dt:
        miss = missing_fields(dt, fields_by_dt[dt])
        if miss:
            entry["state"] = "not_configured"
            entry["message"] = dt + " is missing: " + ", ".join(miss[:6])
            SOURCES.append(entry)
            return entry
    before = len(ACTIONS)
    try:
        res = fn() or {}
        if res.get("partial"):
            entry["state"] = "partial"
            entry["message"] = res.get("message") or "List limited; totals shown are counted separately."
        if res.get("scope"):
            entry["scope"] = res.get("scope")
        if res.get("message") and not entry["message"]:
            entry["message"] = res.get("message")
    except Exception as e:
        while len(ACTIONS) > before:
            ACTIONS.pop()
        unpacked = classify(e)
        st = unpacked[0]
        msg = unpacked[1]
        entry["state"] = st
        entry["message"] = msg
    entry["rows"] = len(ACTIONS) - before
    SOURCES.append(entry)
    return entry


def want(dept):
    return (not dept_arg) or dept_arg == dept


def bundle_rows(rows, src, dt, dept, group, sev, title, reason, list_filters, oldest=None, amount=None, currency=None):
    """Replace many similar rows with a single bundled action linking to the filtered list."""
    for r in rows:
        if r in ACTIONS:
            ACTIONS.remove(r)
    return act(src, dt, "bundle-" + src + "-" + str(len(rows)), "bundle", dept, group, sev, title, reason,
               owner="", due=oldest, due_basis="Oldest due date in bundle" if oldest else "", amount=amount, currency=currency,
               link=list_route(dt, list_filters), bundle=len(rows), extra={"count": len(rows)})


# ----------------------------------------------------------------------------- 1. workflow decisions
WF_STATE = {"decision_states": 0, "pending_states": 0, "workflows": 0}


# CEO inbox is stage-specific: other roles held by the CEO must not widen it.
CEO_APPROVAL_ROLES = ["CEO"]
CEO_DECISION_ACTIONS = ["approve", "first approve", "final approval", "accept"]


def ceo_stage_transitions(workflow_name, state):
    """Return only CEO approval transitions from the document's CURRENT state."""
    transitions = frappe.get_all("Workflow Transition", filters={
        "parenttype": "Workflow", "parent": workflow_name, "state": state,
        "allowed": ["in", CEO_APPROVAL_ROLES]},
        fields=["action", "next_state", "allow_self_approval", "condition"],
        limit_page_length=100)
    return [t for t in transitions if (t.action or "").strip().lower() in CEO_DECISION_ACTIONS
            and t.next_state != state]


def ceo_stage_policy(workflow_name, state, owner):
    if "CEO" not in user_roles:
        return None
    transitions = ceo_stage_transitions(workflow_name, state)
    eligible = [t for t in transitions if owner != user or t.allow_self_approval]
    if not eligible:
        return None
    return {"mine": sorted(list(set(t.action for t in eligible))), "others": [],
            "self_ok": True, "conditional": any(bool(t.condition) for t in eligible)}


def workflow_pending():
    """Active workflows with their pending-approval states and who may act on each (shared by overview and approvals)."""
    wfs = frappe.get_all("Workflow", filters={"is_active": 1}, fields=["name", "document_type", "workflow_state_field"], limit_page_length=200)
    WF_STATE["workflows"] = len(wfs)
    all_tr = frappe.get_all("Workflow Transition", filters={"parenttype": "Workflow", "parent": ["in", [w.name for w in wfs] or ["-"]]},
                            fields=["parent", "state", "action", "next_state", "allowed", "allow_self_approval", "condition"], limit_page_length=5000)
    by_wf = {}
    for t in all_tr:
        by_wf.setdefault(t.parent, []).append(t)
    out = []
    for wf in wfs:
        transitions = by_wf.get(wf.name) or []
        pending = {}
        for t in transitions:
            st = t.state or ""
            low = st.lower()
            done = False
            for p in DONE_PREFIXES:
                if low.startswith(p):
                    done = True
            if done:
                continue
            a = (t.action or "").lower()
            if (a in APPROVE_ACTIONS and t.next_state != st) or a == "resume":
                pending.setdefault(st, {"mine": [], "others": [], "self_ok": False, "conditional": False})
        for t in transitions:
            if t.state not in pending or (t.action or "").lower() == "cancel":
                continue
            p = pending[t.state]
            if t.allowed in user_roles:
                p["mine"].append(t.action)
                if t.allow_self_approval:
                    p["self_ok"] = True
                if t.condition:
                    p["conditional"] = True
            else:
                p["others"].append(t.allowed)
        if pending:
            out.append({"workflow": wf.name, "doctype": wf.document_type, "sfield": wf.workflow_state_field or "workflow_state", "pending": pending})
    return out


def src_workflows():
    problems = []
    for w in workflow_pending():
        unpacked = w["doctype"], w["sfield"], w["pending"]
        dt = unpacked[0]
        sfield = unpacked[1]
        pending = unpacked[2]
        dept = WF_DEPT.get(dt) or "people"
        if not want(dept):
            continue
        mf = meta_fields(dt)
        if mf is None or sfield not in mf:
            problems.append(dt + " (" + sfield + " missing)")
            continue
        title_f = WF_TITLE.get(dt) if WF_TITLE.get(dt) in mf else ("title" if "title" in mf else None)
        amount_f = WF_AMOUNT.get(dt) if WF_AMOUNT.get(dt) in mf else None
        fields = ["name", "owner", "creation", "modified", "_assign", sfield + " as wf_state"]
        if title_f:
            fields.append(title_f + " as wf_title")
        if amount_f:
            fields.append(amount_f + " as wf_amount")
        has_co = mf.get("company") == "Link"
        if has_co:
            fields.append("company")
        filters = [[dt, sfield, "in", list(pending.keys())], [dt, "docstatus", "<", 2]]
        scope = company_filter(dt, filters)
        if scope == "unscoped":
            continue
        try:
            unpacked = fetch(dt, fields, filters, "modified asc", cap=2000)
            rows = unpacked[0]
            complete = unpacked[1]
            prime_assign(rows)
        except Exception as e:
            unpacked = classify(e)
            st = unpacked[0]
            msg = unpacked[1]
            problems.append(dt + " (" + st + ")")
            continue
        WF_STATE["pending_states"] = WF_STATE["pending_states"] + len(pending)
        stalled = {}
        for r in rows:
            p = pending.get(r.wf_state)
            if not p:
                continue
            amt = frappe.utils.flt(r.get("wf_amount")) if amount_f else None
            cur = company_currency.get(r.get("company")) if (amount_f and has_co and dt not in WF_AMOUNT_NO_CURRENCY) else None
            title = (str(r.get("wf_title") or "")[:140] or r.name)
            if "CEO" in user_roles:
                p = ceo_stage_policy(w["workflow"], r.wf_state, r.owner)
            if p and p["mine"] and not (r.owner == user and not p["self_ok"]):
                WF_STATE["decision_states"] = WF_STATE["decision_states"] + 1
                acts = sorted(list(set(p["mine"])))
                reason = "Waiting at '" + r.wf_state + "'. Your permitted actions: " + ", ".join(acts) + "."
                if p["conditional"]:
                    reason = reason + " A transition condition applies; the ERP form makes the final check."
                sev = "pending"
                age = days_between(today, dstr(r.modified))
                if age is not None and age > POLICY["stale_days"]:
                    sev = "overdue"
                act("workflow", dt, r.name, "decision", dept, "decision", sev, title, reason,
                    owner=user_name(user), owner_basis="Your workflow role", due=None, due_basis="No due date; age since last change",
                    amount=amt, currency=cur, amount_basis=(("Currency not recorded · " if dt in WF_AMOUNT_NO_CURRENCY else "Company currency · ") + amount_f) if amount_f else "",
                    company_name=r.get("company"), status=r.wf_state, age_from=r.modified,
                    extra={"actions": acts, "self_approval_blocked": 0})
            elif p["others"]:
                age = days_between(today, dstr(r.modified))
                if age is not None and age > POLICY["stale_days"]:
                    unpacked = owner_of(r)
                    o = unpacked[0]
                    ob = unpacked[1]
                    roles = sorted(list(set(p["others"])))
                    if not o:
                        unpacked = " / ".join(roles[:2]) + " (role)", "Workflow role"
                        o = unpacked[0]
                        ob = unpacked[1]
                    row = act("workflow", dt, r.name, "stalled_approval", dept, "followup", "pending", title,
                              "Pending at '" + r.wf_state + "' for " + str(age) + " days without change. Next action belongs to: " + ", ".join(roles[:4]) + ".",
                              owner=o, owner_basis=ob, due_basis="No due date; age since last change",
                              amount=amt, currency=cur, amount_basis=(("Currency not recorded · " if dt in WF_AMOUNT_NO_CURRENCY else "Company currency · ") + amount_f) if amount_f else "",
                              company_name=r.get("company"), status=r.wf_state, age_from=r.modified)
                    stalled.setdefault(r.wf_state, []).append(row)
        for st in stalled:
            group_rows = stalled[st]
            if len(group_rows) > POLICY["bundle_limit"]:
                bundle_rows(group_rows, "workflow", dt, dept, "followup", "pending",
                            str(len(group_rows)) + " " + dt + " documents stalled at '" + st + "'",
                            "More than " + str(POLICY["stale_days"]) + " days without change. Open the filtered list to work through them.",
                            [[sfield, "=", st], ["docstatus", "<", 2]])
        if not complete:
            problems.append(dt + " (over 2,000 pending documents; list limited)")
    if problems:
        return {"partial": 1, "message": "Workflow sources with issues: " + "; ".join(problems[:8])}
    return {}


# ----------------------------------------------------------------------------- 2. sales
def src_lead_allocation():
    unpacked = fetch("Leads Generation List", ["name", "customer_name", "date", "creation"], [["docstatus", "<", 2]], "creation asc", cap=10000)
    leads = unpacked[0]
    c1 = unpacked[1]
    unpacked = fetch("Lead Allocation", ["name", "lead", "status"], [["lead", "is", "set"]], "creation asc", cap=20000)
    allocs = unpacked[0]
    c2 = unpacked[1]
    active = {}
    for a in allocs:
        if a.status != "Unassigned":
            active.setdefault(a.lead, []).append(a.name)
    unalloc = [l for l in leads if l.name not in active]
    dup = [k for k in active if len(active[k]) > 1]
    indicator("sales", "unallocated_leads", "Unallocated leads", len(unalloc), "Leads Generation List without an active Lead Allocation", tone="warn" if unalloc else "")
    rows = []
    for l in unalloc:
        rows.append(act("lead_allocation", "Leads Generation List", l.name, "unallocated", "sales", "followup", "pending",
                        l.customer_name or l.name, "Lead has no active Lead Allocation (status other than Unassigned).",
                        due_basis="No due date; age since lead date", age_from=l.date or l.creation, status="Unallocated"))
    if len(rows) > POLICY["bundle_limit"]:
        oldest = min([dstr(l.date or l.creation) for l in unalloc])
        bundle_rows(rows, "lead_allocation", "Leads Generation List", "sales", "followup", "pending",
                    str(len(rows)) + " leads without an active allocation",
                    "Oldest lead dated " + oldest + ". Allocate through Lead Management; no owner exists until then.", [])
    if dup:
        check("lead_allocation", "sales", "Leads with more than one active allocation", len(dup),
              "Same Leads Generation List record linked to several active Lead Allocations. Example: " + ", ".join(dup[:3]),
              list_route("Lead Allocation", [["status", "!=", "Unassigned"]]))
    if not (c1 and c2):
        return {"partial": 1, "message": "Lead lists exceeded the read limit; counts may be low."}
    return {"scope": "unscoped" if company else "all"}


def src_lead_followup():
    act_states = ["Assigned", "Contacted", "Follow Up", "Interested", "Quotation Required", "No Response"]
    unpacked = fetch("Lead Allocation", ["name", "customer_name", "assigned_user", "sales_person", "next_follow_up", "priority", "status", "creation"],
                           [["status", "in", act_states], ["next_follow_up", "<", now_s]], "next_follow_up asc", cap=5000)
    rows = unpacked[0]
    complete = unpacked[1]
    prime("User", [r.assigned_user for r in rows])
    prime("Employee", [r.sales_person for r in rows])
    for r in rows:
        unpacked = owner_of(r, "assigned_user", "User", "Lead Allocation.assigned_user")
        o = unpacked[0]
        ob = unpacked[1]
        if not o:
            unpacked = owner_of(r, "sales_person", "Employee", "Lead Allocation.sales_person")
            o = unpacked[0]
            ob = unpacked[1]
        hi = r.priority in ["High", "Urgent"]
        act("lead_followup", "Lead Allocation", r.name, "followup_overdue", "sales", "escalation" if hi else "followup", "overdue",
            r.customer_name or r.name, "Lead follow-up date has passed while status is '" + (r.status or "") + "'.",
            owner=o, owner_basis=ob, due=r.next_follow_up, due_basis="Lead Allocation.next_follow_up", status=r.status, age_from=r.creation)
    indicator("sales", "lead_followups_overdue", "Lead follow-ups overdue", len(rows), "Active Lead Allocation past next_follow_up", tone="bad" if rows else "")
    return {"partial": 0 if complete else 1, "scope": "unscoped" if company else "all"}


def src_dms():
    open_f = [["follow_up_status", "not in", ["Won", "Lost"]]]
    total_open = count("DMS Project", open_f)
    unalloc = count("DMS Project", open_f + [["allocation_status", "=", "Unallocated"]])
    unpacked = fetch("DMS Project", ["name", "sales_person", "next_follow_up_date"],
                          open_f + [["next_follow_up_date", "<", today], ["allocation_status", "!=", "Unallocated"]], "next_follow_up_date asc", cap=10000)
    raw = unpacked[0]
    complete = unpacked[1]
    overdue_rows = group_rows(raw, ["sales_person"], date_field="next_follow_up_date")
    prime("Employee", [g["sales_person"] for g in overdue_rows])
    indicator("sales", "dms_open", "Open DMS projects", total_open, "DMS Project follow-up status not Won/Lost")
    indicator("sales", "dms_unallocated", "DMS projects unallocated", unalloc, "allocation_status = Unallocated", tone="warn" if unalloc else "")
    if unalloc:
        act("dms", "DMS Project", "unallocated", "bundle", "sales", "followup", "pending", str(unalloc) + " open DMS projects unallocated",
            "No salesperson allocated. Allocate in DMS Sales Management before follow-up can be owned.",
            link=list_route("DMS Project", [["allocation_status", "=", "Unallocated"]]), bundle=unalloc, extra={"count": unalloc})
    for g in overdue_rows:
        n = g["n"]
        sp = g["sales_person"]
        who = employee_name(sp) if sp else ""
        act("dms", "DMS Project", "overdue-" + (sp or "none"), "bundle", "sales", "followup", "overdue",
            str(n) + " allocated DMS projects past follow-up date" + ((" · " + who) if who else " · salesperson not set"),
            "Allocated projects whose next_follow_up_date has passed. Oldest " + g["oldest"] + ".",
            owner=who, owner_basis="DMS Project.sales_person" if who else "unassigned", due=g["oldest"], due_basis="Oldest DMS Project.next_follow_up_date",
            link=list_route("DMS Project", [["sales_person", "=", sp] if sp else ["sales_person", "is", "not set"], ["next_follow_up_date", "<", today], ["follow_up_status", "not in", ["Won", "Lost"]]]),
            bundle=n, extra={"count": n})
    indicator("sales", "dms_overdue", "DMS projects past follow-up", len(raw), "Allocated, open, next_follow_up_date before today", tone="bad" if raw else "")
    return {"scope": "unscoped" if company else "all", "partial": 0 if complete else 1}


def src_sales_orders():
    filters = [["Sales Order", "docstatus", "=", 1], ["Sales Order", "status", "in", ["To Deliver and Bill", "To Deliver"]], ["Sales Order", "delivery_date", "<", today]]
    company_filter("Sales Order", filters)
    unpacked = fetch("Sales Order", ["name", "customer_name", "company", "delivery_date", "per_delivered", "base_grand_total", "sales_persons", "_assign", "transaction_date"],
                           filters, "delivery_date asc", cap=3000)
    rows = unpacked[0]
    complete = unpacked[1]
    prime_assign(rows)
    old = []
    for r in rows:
        unpacked = owner_of(r, "sales_persons", "Text", "Sales Order.sales_persons")
        o = unpacked[0]
        ob = unpacked[1]
        od = days_between(today, dstr(r.delivery_date)) or 0
        row = act("sales_orders", "Sales Order", r.name, "delivery_overdue", "sales", "followup", "overdue", r.customer_name or r.name,
                  "Planned delivery date passed; " + str(round(frappe.utils.flt(r.per_delivered), 1)) + "% delivered.",
                  owner=o, owner_basis=ob, due=r.delivery_date, due_basis="Sales Order.delivery_date",
                  amount=frappe.utils.flt(r.base_grand_total), currency=company_currency.get(r.company), amount_basis="Order value in company currency (not undelivered value)",
                  company_name=r.company, status="To Deliver", age_from=r.transaction_date)
        if od > POLICY["recent_overdue_days"]:
            old.append(row)
    indicator("sales", "so_delivery_overdue", "Sales orders past delivery date", len(rows), "Submitted, To Deliver, delivery_date before today", tone="bad" if rows else "")
    if len(old) > POLICY["bundle_limit"]:
        bundle_rows(old, "sales_orders", "Sales Order", "sales", "followup", "overdue", str(len(old)) + " sales orders overdue more than " + str(POLICY["recent_overdue_days"]) + " days",
                    "Older delivery backlog shown as one item; recent overdue orders remain individual.", [["status", "in", ["To Deliver and Bill", "To Deliver"]], ["delivery_date", "<", str(frappe.utils.add_days(today, -POLICY["recent_overdue_days"]))]],
                    oldest=min([o["due"] for o in old]))
    return {"partial": 0 if complete else 1}


def src_quotations():
    filters = [["Quotation", "docstatus", "=", 1], ["Quotation", "status", "in", ["Open", "Replied"]], ["Quotation", "valid_till", "between", [today, horizon]]]
    company_filter("Quotation", filters)
    rows = gl("Quotation", ["name", "customer_name", "valid_till", "company", "base_grand_total", "sales_person"], filters, order_by="valid_till asc", limit=500)
    for r in rows:
        upcoming("quotations", "sales", "Quotation", r.name, r.valid_till, "Quotation validity ends", r.customer_name or r.name,
                 frappe.utils.flt(r.base_grand_total), company_currency.get(r.company), r.sales_person or "")
    indicator("sales", "quotes_expiring", "Quotations expiring in " + str(window) + " days", len(rows), "Submitted Open/Replied quotations by valid_till")
    return {}


def perf_sales():
    by_co = {}
    f = [["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "posting_date", "between", [p_from, p_to]]]
    company_filter("Sales Invoice", f)
    for r in gl("Sales Invoice", ["company", "sum(base_net_total) as amt", "count(name) as n"], f, order_by="company asc", group_by="company", limit=200):
        by_co.setdefault(r.company, {"company": r.company, "currency": company_currency.get(r.company)})["invoiced"] = frappe.utils.flt(r.amt)
    f = [["Sales Order", "docstatus", "=", 1], ["Sales Order", "transaction_date", "between", [p_from, p_to]]]
    company_filter("Sales Order", f)
    for r in gl("Sales Order", ["company", "sum(base_net_total) as amt", "count(name) as n"], f, order_by="company asc", group_by="company", limit=200):
        by_co.setdefault(r.company, {"company": r.company, "currency": company_currency.get(r.company)})["booked"] = frappe.utils.flt(r.amt)
    f = [["Quotation", "docstatus", "=", 1], ["Quotation", "transaction_date", "between", [p_from, p_to]]]
    company_filter("Quotation", f)
    q_total = 0
    q_ordered = 0
    for r in gl("Quotation", ["status", "count(name) as n"], f, order_by="status asc", group_by="status", limit=50):
        q_total = q_total + frappe.utils.cint(r.n)
        if r.status in ["Ordered", "Partially Ordered"]:
            q_ordered = q_ordered + frappe.utils.cint(r.n)
    target_state = "not_configured"
    try:
        tf = [["target_type", "=", "Overall"]]
        if company:
            tf.append(["company", "=", company])
        trows = gl("CEO Sales Target", ["company", "target_year", "target_month", "sales_person", "target_amount", "currency"], tf, limit=2000)
        if trows:
            target_state = "available"
            months = []
            y = frappe.utils.cint(p_from[:4])
            m = frappe.utils.cint(p_from[5:7])
            while (y * 100 + m) <= frappe.utils.cint(p_to[:4]) * 100 + frappe.utils.cint(p_to[5:7]):
                months.append([y, str(m).zfill(2)])
                m = m + 1
                if m > 12:
                    m = 1
                    y = y + 1
            for t in trows:
                for m in months:
                    if frappe.utils.cint(t.target_year) == m[0] and str(t.target_month or "")[:2] == m[1]:
                        e = by_co.setdefault(t.company, {"company": t.company, "currency": company_currency.get(t.company)})
                        if t.currency and t.currency != e["currency"]:
                            e["target_currency_mismatch"] = 1
                            continue
                        key = "target_company" if not t.sales_person else "target_salespeople"
                        e[key] = frappe.utils.flt(e.get(key)) + frappe.utils.flt(t.target_amount)
    except Exception:
        target_state = "restricted"
    for k in by_co:
        e = by_co[k]
        e["target"] = e.get("target_company") if e.get("target_company") else e.get("target_salespeople")
        e["target_basis"] = "Company Overall target" if e.get("target_company") else ("Sum of salesperson Overall targets" if e.get("target_salespeople") else "")
        if e.get("target") and e.get("invoiced") is not None:
            e["attainment"] = round(100.0 * frappe.utils.flt(e.get("invoiced")) / e["target"], 1)
    perf("sales", "by_company", {"rows": sorted(list(by_co.values()), key=lambda x: x["company"]), "period": [p_from, p_to],
                                  "basis": "Invoiced = submitted Sales Invoice base_net_total by posting date (returns net). Booked = submitted Sales Order base_net_total by order date. Each company in its own currency.",
                                  "target_state": target_state})
    perf("sales", "quotation_conversion", {"submitted": q_total, "ordered": q_ordered,
                                           "rate": round(100.0 * q_ordered / q_total, 1) if q_total else None,
                                           "basis": "Submitted quotations dated in the period whose status is Ordered or Partially Ordered."})


# ----------------------------------------------------------------------------- 3. procurement
def src_material_requests():
    filters = [["Material Request", "docstatus", "=", 1], ["Material Request", "material_request_type", "=", "Purchase"],
               ["Material Request", "status", "in", ["Pending", "Partially Ordered"]], ["Material Request", "schedule_date", "<", today]]
    company_filter("Material Request", filters)
    total = count("Material Request", filters)
    cutoff = str(frappe.utils.add_days(today, -POLICY["recent_overdue_days"]))
    recent = gl("Material Request", ["name", "title", "company", "schedule_date", "transaction_date", "per_ordered", "custom_priority", "_assign", "status"],
                filters + [["Material Request", "schedule_date", ">=", cutoff]], order_by="schedule_date asc", limit=500)
    prime_assign(recent)
    for r in recent:
        unpacked = owner_of(r)
        o = unpacked[0]
        ob = unpacked[1]
        act("material_requests", "Material Request", r.name, "order_overdue", "procurement", "escalation" if r.custom_priority == "High" else "followup", "overdue",
            r.title or r.name, "Required-by date passed; " + str(round(frappe.utils.flt(r.per_ordered), 1)) + "% ordered.",
            owner=o, owner_basis=ob, due=r.schedule_date, due_basis="Material Request.schedule_date", company_name=r.company, status=r.status, age_from=r.transaction_date)
    backlog = total - len(recent)
    if backlog > 0:
        old = gl("Material Request", ["schedule_date as oldest"], filters + [["Material Request", "schedule_date", "<", cutoff]], order_by="schedule_date asc", limit=1)
        act("material_requests", "Material Request", "backlog", "bundle", "procurement", "followup", "overdue",
            str(backlog) + " purchase requests overdue more than " + str(POLICY["recent_overdue_days"]) + " days",
            "Old backlog kept separate from newly overdue demand. Original required-by dates are unchanged.",
            due=old[0].oldest if old else None, due_basis="Oldest Material Request.schedule_date",
            link=list_route("Material Request", [["material_request_type", "=", "Purchase"], ["status", "in", ["Pending", "Partially Ordered"]], ["schedule_date", "<", cutoff]]),
            bundle=backlog, extra={"count": backlog})
    indicator("procurement", "mr_overdue", "Purchase requests overdue", total, "Submitted Purchase MRs, Pending/Partially Ordered, past schedule_date", tone="bad" if total else "")
    return {}


def src_purchase_orders():
    filters = [["Purchase Order", "docstatus", "=", 1], ["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive"]], ["Purchase Order", "schedule_date", "<", today]]
    company_filter("Purchase Order", filters)
    unpacked = fetch("Purchase Order", ["name", "supplier_name", "company", "schedule_date", "transaction_date", "per_received", "base_grand_total",
                                              "custom_po_in_charge_", "custom_purchaser_name", "custom_shipment_status", "_assign"], filters, "schedule_date asc", cap=3000)
    rows = unpacked[0]
    complete = unpacked[1]
    prime_assign(rows)
    old = []
    for r in rows:
        unpacked = owner_of(r, "custom_po_in_charge_", "Text", "Purchase Order.custom_po_in_charge_")
        o = unpacked[0]
        ob = unpacked[1]
        if not o:
            unpacked = owner_of(r, "custom_purchaser_name", "Text", "Purchase Order.custom_purchaser_name")
            o = unpacked[0]
            ob = unpacked[1]
        od = days_between(today, dstr(r.schedule_date)) or 0
        row = act("purchase_orders", "Purchase Order", r.name, "receipt_overdue", "procurement", "escalation" if od > POLICY["ap_escalation_days"] else "followup", "overdue",
                  r.supplier_name or r.name, "Expected receipt date passed; " + str(round(frappe.utils.flt(r.per_received), 1)) + "% received" +
                  ((" · shipment: " + r.custom_shipment_status) if r.custom_shipment_status else "") + ".",
                  owner=o, owner_basis=ob, due=r.schedule_date, due_basis="Purchase Order.schedule_date",
                  amount=frappe.utils.flt(r.base_grand_total), currency=company_currency.get(r.company), amount_basis="PO value in company currency (not unreceived value)",
                  company_name=r.company, status="To Receive", age_from=r.transaction_date)
        if od > POLICY["recent_overdue_days"]:
            old.append(row)
    if len(old) > POLICY["bundle_limit"]:
        bundle_rows(old, "purchase_orders", "Purchase Order", "procurement", "followup", "overdue", str(len(old)) + " purchase orders overdue more than " + str(POLICY["recent_overdue_days"]) + " days",
                    "Older receipt backlog shown as one item.", [["status", "in", ["To Receive and Bill", "To Receive"]], ["schedule_date", "<", str(frappe.utils.add_days(today, -POLICY["recent_overdue_days"]))]],
                    oldest=min([o["due"] for o in old]))
    indicator("procurement", "po_overdue", "Purchase orders past receipt date", len(rows), "Submitted, To Receive, schedule_date before today", tone="bad" if rows else "")
    return {"partial": 0 if complete else 1}


def src_shipments():
    filters = [["Purchase Order", "docstatus", "=", 1], ["Purchase Order", "status", "not in", ["Completed", "Closed", "Cancelled"]],
               ["Purchase Order", "custom_shipment_status", "in", ["Shipment Delayed", "In Customs", "In Transit", "Shipped Full Qty", "Shipped Partial Qty", "Awaiting Pickup"]]]
    company_filter("Purchase Order", filters)
    rows = gl("Purchase Order", ["name", "supplier_name", "company", "custom_shipment_status", "custom_estimated_arrival_time", "custom_clearing_document_status", "custom_po_in_charge_", "transaction_date"],
              filters, order_by="custom_estimated_arrival_time asc", limit=500)
    in_customs = 0
    for r in rows:
        late = r.custom_estimated_arrival_time and dstr(r.custom_estimated_arrival_time) < today
        unpacked = owner_of(r, "custom_po_in_charge_", "Text", "Purchase Order.custom_po_in_charge_")
        o = unpacked[0]
        ob = unpacked[1]
        if r.custom_shipment_status == "In Customs":
            in_customs = in_customs + 1
            if r.custom_clearing_document_status in [None, "", "Documents in courier"]:
                act("shipments", "Purchase Order", r.name, "clearance_docs", "procurement", "followup", "pending", r.supplier_name or r.name,
                    "Shipment is in customs but clearing documents are '" + (r.custom_clearing_document_status or "not recorded") + "'.",
                    owner=o, owner_basis=ob, company_name=r.company, status=r.custom_shipment_status, age_from=r.transaction_date)
        if r.custom_shipment_status == "Shipment Delayed" or late:
            act("shipments", "Purchase Order", r.name, "shipment_late", "procurement", "escalation" if r.custom_shipment_status == "Shipment Delayed" else "followup", "overdue",
                r.supplier_name or r.name, "Shipment status '" + (r.custom_shipment_status or "") + "'" + (" and estimated arrival has passed." if late else "."),
                owner=o, owner_basis=ob, due=r.custom_estimated_arrival_time, due_basis="Purchase Order.custom_estimated_arrival_time", company_name=r.company,
                status=r.custom_shipment_status, age_from=r.transaction_date)
        elif r.custom_estimated_arrival_time and dstr(r.custom_estimated_arrival_time) <= horizon:
            upcoming("shipments", "procurement", "Purchase Order", r.name, r.custom_estimated_arrival_time, "Shipment arrival", r.supplier_name or r.name, owner=o)
    indicator("procurement", "in_customs", "Shipments in customs", in_customs, "Open POs with custom_shipment_status = In Customs")
    indicator("procurement", "shipments_tracked", "Shipments in transit/customs", len(rows), "Open POs with an in-flight custom_shipment_status")
    return {}


def perf_procurement():
    f = [["Purchase Order", "docstatus", "=", 1], ["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive"]]]
    company_filter("Purchase Order", f)
    rows = gl("Purchase Order", ["company", "count(name) as n", "sum(base_grand_total) as amt"], f, order_by="company asc", group_by="company", limit=200)
    perf("procurement", "open_commitments", {"rows": [{"company": r.company, "count": frappe.utils.cint(r.n), "amount": frappe.utils.flt(r.amt), "currency": company_currency.get(r.company)} for r in rows],
                                             "basis": "Submitted POs still to receive · full PO value in company currency (partly received POs included at full value)."})
    f = [["Purchase Receipt", "docstatus", "=", 1], ["Purchase Receipt", "posting_date", "between", [p_from, p_to]]]
    company_filter("Purchase Receipt", f)
    rows = gl("Purchase Receipt", ["company", "count(name) as n", "sum(base_net_total) as amt"], f, order_by="company asc", group_by="company", limit=200)
    perf("procurement", "receipts", {"rows": [{"company": r.company, "count": frappe.utils.cint(r.n), "amount": frappe.utils.flt(r.amt), "currency": company_currency.get(r.company)} for r in rows],
                                     "basis": "Submitted Purchase Receipts posted in the period · base_net_total."})


# ----------------------------------------------------------------------------- 4. finance
def src_receivables():
    cut = str(frappe.utils.add_days(today, -POLICY["ar_followup_days"]))
    f = [["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "outstanding_amount", ">", 0], ["Sales Invoice", "due_date", "<", cut]]
    company_filter("Sales Invoice", f)
    unpacked = fetch("Sales Invoice", ["name", "customer", "customer_name", "company", "party_account_currency", "outstanding_amount", "due_date"], f, "due_date asc", cap=20000)
    raw = unpacked[0]
    complete = unpacked[1]
    rows = group_rows(raw, ["customer", "customer_name", "company", "party_account_currency"], "outstanding_amount", "due_date")
    custs = list(set([r["customer"] for r in rows]))
    owners = {}
    for i in range(0, len(custs), 200):
        for c in gl("Customer", ["name", "custom_sales_person"], [["name", "in", custs[i:i + 200]]], limit=200):
            owners[c.name] = c.custom_sales_person
    for r in rows:
        od = days_between(today, r["oldest"]) or 0
        esc = od > POLICY["ar_escalation_days"]
        sp = owners.get(r["customer"])
        act("receivables", "Customer", r["customer"], "collection_" + (r["company"] or "") + "_" + (r["party_account_currency"] or ""), "finance",
            "escalation" if esc else "followup", "overdue", r["customer_name"] or r["customer"],
            str(r["n"]) + " invoices overdue more than " + str(POLICY["ar_followup_days"]) + " days; oldest due " + r["oldest"] + ".",
            owner=sp or "", owner_basis="Customer.custom_sales_person" if sp else "unassigned", due=r["oldest"], due_basis="Oldest Sales Invoice.due_date in group",
            amount=round(r["amt"], 2), currency=r["party_account_currency"], amount_basis="Invoice outstanding in party account currency (invoice-only, excludes unallocated advances)",
            company_name=r["company"], status="Overdue", link=list_route("Sales Invoice", [["customer", "=", r["customer"]], ["outstanding_amount", ">", 0], ["due_date", "<", cut]]),
            extra={"invoices": r["n"]})
    indicator("finance", "ar_customers_overdue", "Customers overdue > " + str(POLICY["ar_followup_days"]) + " days", len(rows), "Grouped by customer, company and party currency", tone="bad" if rows else "")
    return {"partial": 0 if complete else 1}


def src_credit_limits():
    f = [["Customer Credit Limit", "credit_limit", ">", 0]]
    if company:
        f.append(["Customer Credit Limit", "company", "=", company])
    lims = gl("Customer", ["name", "customer_name", "custom_sales_person", "`tabCustomer Credit Limit`.company as cl_company", "`tabCustomer Credit Limit`.credit_limit as cl_limit",
                           "`tabCustomer Credit Limit`.bypass_credit_limit_check as cl_bypass"], f, order_by="name asc", limit=10000)
    if not lims:
        indicator("finance", "credit_breaches", "Credit-limit breaches", 0, "No positive company credit limits readable")
        return {}
    sf = [["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "outstanding_amount", "!=", 0]]
    company_filter("Sales Invoice", sf)
    bal = {}
    for r in gl("Sales Invoice", ["customer", "company", "party_account_currency", "sum(outstanding_amount) as amt"], sf, order_by="customer asc",
                group_by="customer, company, party_account_currency", limit=20000):
        bal[r.customer + "|" + r.company + "|" + (r.party_account_currency or "")] = frappe.utils.flt(r.amt)
    breaches = 0
    foreign = 0
    for l in lims:
        cur = company_currency.get(l.cl_company)
        other_cur = [k for k in bal if k.startswith(l.name + "|" + (l.cl_company or "") + "|") and not k.endswith("|" + (cur or ""))]
        if other_cur:
            foreign = foreign + 1
        out = bal.get(l.name + "|" + (l.cl_company or "") + "|" + (cur or ""))
        if out is None:
            continue
        lim = frappe.utils.flt(l.cl_limit)
        if out > lim:
            breaches = breaches + 1
            act("credit_limits", "Customer", l.name, "credit_breach_" + (l.cl_company or ""), "finance", "escalation", "critical", l.customer_name or l.name,
                "Invoice outstanding exceeds the approved " + (l.cl_company or "") + " credit limit by " + str(round(out - lim, 2)) + " " + (cur or "") + "." +
                (" Credit check bypass is enabled." if l.cl_bypass else ""),
                owner=l.custom_sales_person or "", owner_basis="Customer.custom_sales_person" if l.custom_sales_person else "unassigned",
                amount=round(out - lim, 2), currency=cur, amount_basis="Excess over company credit limit (invoice outstanding minus limit)",
                company_name=l.cl_company, status="Over limit", extra={"limit": lim, "outstanding": out})
    if foreign:
        check("credit_limits", "finance", "Customers with foreign-currency balances under a company limit", foreign,
              "Balances in a currency other than the company currency are not compared with the credit limit.")
    indicator("finance", "credit_breaches", "Credit-limit breaches", breaches, "Company limit > 0 and invoice outstanding above it (same currency only)", tone="bad" if breaches else "")
    return {}


def src_payables():
    f = [["Purchase Invoice", "docstatus", "=", 1], ["Purchase Invoice", "outstanding_amount", ">", 0], ["Purchase Invoice", "due_date", "<=", horizon]]
    company_filter("Purchase Invoice", f)
    unpacked = fetch("Purchase Invoice", ["name", "supplier", "supplier_name", "company", "party_account_currency", "on_hold", "outstanding_amount", "due_date"], f, "due_date asc", cap=20000)
    raw = unpacked[0]
    complete = unpacked[1]
    rows = group_rows([r for r in raw if dstr(r.due_date) < today], ["supplier", "supplier_name", "company", "party_account_currency", "on_hold"], "outstanding_amount", "due_date")
    for r in rows:
        od = days_between(today, r["oldest"]) or 0
        act("payables", "Supplier", r["supplier"], "payable_" + (r["company"] or "") + "_" + (r["party_account_currency"] or "") + ("_hold" if r["on_hold"] else ""), "finance",
            "escalation" if od > POLICY["ap_escalation_days"] else "followup", "overdue", r["supplier_name"] or r["supplier"],
            str(r["n"]) + " supplier invoices past due" + (" (on hold)" if r["on_hold"] else "") + "; oldest due " + r["oldest"] + ".",
            due=r["oldest"], due_basis="Oldest Purchase Invoice.due_date in group", amount=round(r["amt"], 2), currency=r["party_account_currency"],
            amount_basis="Outstanding in party account currency (no re-conversion)", company_name=r["company"], status="On hold" if r["on_hold"] else "Overdue",
            link=list_route("Purchase Invoice", [["supplier", "=", r["supplier"]], ["outstanding_amount", ">", 0], ["due_date", "<", today]]))
    up = group_rows([r for r in raw if dstr(r.due_date) >= today], ["supplier", "supplier_name", "company", "party_account_currency"], "outstanding_amount", "due_date")
    for r in up:
        upcoming("payables", "finance", "Supplier", r["supplier"], r["oldest"], "Supplier payment due", r["supplier_name"] or r["supplier"], round(r["amt"], 2), r["party_account_currency"],
                 link=list_route("Purchase Invoice", [["supplier", "=", r["supplier"]], ["outstanding_amount", ">", 0], ["due_date", "between", [today, horizon]]]))
    indicator("finance", "ap_suppliers_overdue", "Suppliers with overdue invoices", len(set([r["supplier"] for r in rows])), "Submitted Purchase Invoices past due_date", tone="warn" if rows else "")
    return {"partial": 0 if complete else 1}


def src_soa():
    rows = gl("SOA Request", ["name", "customer_name", "status", "requested_by", "reviewed_by", "posting_date", "error", "creation"],
              [["status", "in", ["Failed", "Needs Review"]], ["docstatus", "<", 2]], order_by="creation asc", limit=500)
    prime("User", [r.reviewed_by for r in rows])
    for r in rows:
        unpacked = owner_of(r, "reviewed_by", "User", "SOA Request.reviewed_by")
        o = unpacked[0]
        ob = unpacked[1]
        act("soa", "SOA Request", r.name, "soa_" + (r.status or "").lower().replace(" ", "_"), "finance", "followup", "pending", r.customer_name or r.name,
            ("SOA generation failed: " + str(r.error or "")[:120]) if r.status == "Failed" else "Statement needs finance review before sending.",
            owner=o, owner_basis=ob, status=r.status, age_from=r.creation)
    indicator("finance", "soa_exceptions", "SOA failed / needs review", len(rows), "SOA Request status Failed or Needs Review", tone="warn" if rows else "")
    return {"scope": "unscoped" if company else "all"}


def src_soa_workflow():
    rows = gl("SOA Workflow Request", ["name", "kind", "requested_by", "report_date", "company", "creation"], [["status", "=", "Pending"]], order_by="creation asc", limit=500)
    prime("User", [r.requested_by for r in rows])
    for r in rows:
        if company and r.company and r.company != company:
            continue
        act("soa_workflow", "SOA Workflow Request", r.name, "review", "finance", "followup", "pending", (r.kind or "SOA request") + " · " + user_name(r.requested_by),
            "Finance review pending.", owner="", status="Pending", company_name=r.company, age_from=r.creation)
    return {}


def src_collection_lists():
    rows = gl("Collection List", ["name", "collector_name", "list_date", "total_due", "customers", "creation"], [["status", "=", "Draft"]], order_by="list_date asc", limit=500)
    for r in rows:
        act("collection_lists", "Collection List", r.name, "approval", "finance", "followup", "pending", "Collection list · " + (r.collector_name or ""),
            str(frappe.utils.cint(r.customers)) + " customers awaiting collection-list approval.", owner="", status="Draft", age_from=r.list_date or r.creation,
            amount=frappe.utils.flt(r.total_due) if r.total_due else None, currency=None, amount_basis="Total due recorded on list (currency not recorded)")
    return {"scope": "unscoped" if company else "all"}


def perf_finance():
    acc_f = [["account_type", "in", ["Bank", "Cash"]], ["is_group", "=", 0]]
    if company:
        acc_f.append(["company", "=", company])
    accounts = gl("Account", ["name", "company"], acc_f, order_by="name asc", limit=1000)
    cash = []
    if accounts:
        rows = gl("GL Entry", ["company", "sum(debit) as d", "sum(credit) as c"], [["account", "in", [a.name for a in accounts]], ["is_cancelled", "=", 0], ["posting_date", "<=", today]],
                  order_by="company asc", group_by="company", limit=200)
        cash = [{"company": r.company, "amount": round(frappe.utils.flt(r.d) - frappe.utils.flt(r.c), 2), "currency": company_currency.get(r.company)} for r in rows]
    perf("finance", "cash", {"rows": cash, "basis": "Bank and Cash ledger balances (GL debit − credit, company currency) as of today."})
    f = [["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "outstanding_amount", ">", 0]]
    company_filter("Sales Invoice", f)
    ar = {}
    for r in gl("Sales Invoice", ["company", "party_account_currency", "sum(outstanding_amount) as amt"], f, order_by="company asc", group_by="company, party_account_currency", limit=500):
        ar.setdefault(r.company + "|" + (r.party_account_currency or ""), {"company": r.company, "currency": r.party_account_currency, "outstanding": 0, "overdue": 0})["outstanding"] = frappe.utils.flt(r.amt)
    for r in gl("Sales Invoice", ["company", "party_account_currency", "sum(outstanding_amount) as amt"], f + [["Sales Invoice", "due_date", "<", today]], order_by="company asc",
                group_by="company, party_account_currency", limit=500):
        ar.setdefault(r.company + "|" + (r.party_account_currency or ""), {"company": r.company, "currency": r.party_account_currency, "outstanding": 0, "overdue": 0})["overdue"] = frappe.utils.flt(r.amt)
    perf("finance", "receivables", {"rows": sorted(list(ar.values()), key=lambda x: (x["company"], x["currency"] or "")),
                                    "basis": "Positive Sales Invoice outstanding (party account currency), current. Overdue = due date before today. Not the full party ledger."})
    f = [["Payment Entry", "docstatus", "=", 1], ["Payment Entry", "payment_type", "=", "Receive"], ["Payment Entry", "party_type", "=", "Customer"], ["Payment Entry", "posting_date", "between", [p_from, p_to]]]
    company_filter("Payment Entry", f)
    rows = gl("Payment Entry", ["company", "sum(base_received_amount) as amt", "count(name) as n"], f, order_by="company asc", group_by="company", limit=200)
    perf("finance", "collections", {"rows": [{"company": r.company, "amount": frappe.utils.flt(r.amt), "count": frappe.utils.cint(r.n), "currency": company_currency.get(r.company)} for r in rows],
                                    "basis": "Gross customer receipts: submitted Payment Entries (Receive, Customer) posted in the period, base_received_amount."})


# ----------------------------------------------------------------------------- 5. people & admin
def src_vacations():
    rows = gl("Employee Vacation Record", ["name", "employee", "employee_name", "department", "company", "vacation_status", "vacation_to", "expected_rejoin_date", "revised_rejoin_date",
                                           "actual_rejoin_date", "days_overdue", "reentry_status", "reentry_expiry_date", "refund_status", "refund_pending", "action_required",
                                           "action_priority", "action_comment", "creation"],
              [["vacation_status", "in", ["Upcoming", "On Vacation", "Overdue", "Not Yet Departed", ""]]], order_by="expected_rejoin_date asc", limit=2000)
    overdue = 0
    for r in rows:
        due = r.revised_rejoin_date or r.expected_rejoin_date
        title = (r.employee_name or r.employee or r.name) + ((" · " + r.department) if r.department else "")
        if not r.actual_rejoin_date and due and dstr(due) < today and r.vacation_status in ["On Vacation", "Overdue"]:
            overdue = overdue + 1
            act("vacations", "Employee Vacation Record", r.name, "return_overdue", "people", "escalation" if (r.days_overdue or 0) > 7 else "followup", "overdue", title,
                "Expected return " + dstr(due) + " has passed and no rejoin date is recorded.", owner="HR (role)", owner_basis="HR follow-up role",
                due=due, due_basis="revised_rejoin_date, else expected_rejoin_date", status=r.vacation_status, company_name=r.company, age_from=r.creation)
        elif due and today <= dstr(due) <= horizon and not r.actual_rejoin_date:
            upcoming("vacations", "people", "Employee Vacation Record", r.name, due, "Expected return from leave", title, owner="HR")
        if r.reentry_status in ["Expired", "Expiring in 7 Days"] and r.vacation_status in ["On Vacation", "Overdue"]:
            act("vacations", "Employee Vacation Record", r.name, "reentry", "people", "escalation", "critical" if r.reentry_status == "Expired" else "due_soon", title,
                "Re-entry visa " + r.reentry_status.lower() + " while employee is away.", owner="Government Relations / HR (role)", owner_basis="Role",
                due=r.reentry_expiry_date, due_basis="Employee Vacation Record.reentry_expiry_date", status=r.reentry_status, age_from=r.creation)
        if r.action_required:
            act("vacations", "Employee Vacation Record", r.name, "action_required", "people", "escalation" if r.action_priority == "High" else "followup", "pending", title,
                "Flagged for action" + ((": " + str(r.action_comment)[:120]) if r.action_comment else "."), owner="HR (role)", owner_basis="HR follow-up role",
                status=r.vacation_status, age_from=r.creation)
        if r.refund_status in ["To Be Claimed", "Claim Submitted", "Awaiting Airline", "Partially Received"] and frappe.utils.flt(r.refund_pending) > 0:
            act("vacations", "Employee Vacation Record", r.name, "refund", "people", "followup", "pending", title, "Ticket refund " + r.refund_status.lower() + ".",
                owner="HR (role)", owner_basis="HR follow-up role", amount=frappe.utils.flt(r.refund_pending), currency=None, amount_basis="refund_pending (currency not recorded)",
                status=r.refund_status, age_from=r.creation)
    indicator("people", "returns_overdue", "Returns from leave overdue", overdue, "No rejoin date after expected/revised return", tone="bad" if overdue else "")
    return {"scope": "unscoped" if company else "all", "message": "Company on vacation records is free text, so company selection does not filter it."}


FACILITY_EXPIRY = [["rentdate_to", "Rent agreement end", 0], ["lease_end", "Lease end", 0], ["cr_date_to", "Commercial registration", 1], ["com_lic_exp", "Municipality licence", 1],
                   ["cd_date_to", "Civil defence certificate", 1], ["industrial_expiry", "Industrial licence", 1], ["operational_environmental_permit_expiry", "Operational environmental permit", 1],
                   ["construction_environmental_permit_expiry", "Construction environmental permit", 1], ["fire_expiry", "Fire safety contract", 0], ["cleanig_exp_date", "Cleaning contract", 0],
                   ["camera_expiry", "Camera contract", 0], ["national_adress_expiry", "National address", 1]]


def src_facilities():
    fields = ["name", "facility_name", "facility_type", "company", "amount_intallments"] + [f[0] for f in FACILITY_EXPIRY] + \
             ["installment_1_dues_on", "installment_2_dues_on", "installment_3_dues_on", "installment_4_dues_on", "paid1_not", "paid2_not", "paid3_not", "paid4_not"]
    fields = [f for f in fields if f in ["name"] or has_field("DM Facilities Management", f)]
    f = [["docstatus", "<", 2], ["facility_contract_status", "=", "Active"]]
    if company:
        f.append(["company", "=", company])
    rows = gl("DM Facilities Management", fields, f, order_by="facility_name asc", limit=1000)
    exp_window = str(frappe.utils.add_days(today, POLICY["expiry_window_days"]))
    for r in rows:
        title = r.get("facility_name") or r.name
        for spec in FACILITY_EXPIRY:
            d = r.get(spec[0])
            if not d:
                continue
            ds = dstr(d)
            if ds < today:
                act("facilities", "DM Facilities Management", r.name, "expired_" + spec[0], "people", "escalation", "critical" if spec[2] else "overdue", title,
                    spec[1] + " expired on " + ds + ".", owner="Admin / Government Relations (role)", owner_basis="Role", due=ds, due_basis="DM Facilities Management." + spec[0],
                    company_name=r.get("company"), status="Expired")
            elif ds <= exp_window:
                act("facilities", "DM Facilities Management", r.name, "expiring_" + spec[0], "people", "followup", "due_soon", title, spec[1] + " expires on " + ds + ".",
                    owner="Admin / Government Relations (role)", owner_basis="Role", due=ds, due_basis="DM Facilities Management." + spec[0], company_name=r.get("company"), status="Expiring")
                if ds <= horizon:
                    upcoming("facilities", "people", "DM Facilities Management", r.name, ds, spec[1] + " expiry", title)
        if r.get("facility_type") in ["Rented", "Leased"]:
            for i in ["1", "2", "3", "4"]:
                d = r.get("installment_" + i + "_dues_on")
                if not d or r.get("paid" + i + "_not"):
                    continue
                ds = dstr(d)
                amt = frappe.utils.flt(r.get("amount_intallments")) or None
                if ds < today:
                    act("facilities", "DM Facilities Management", r.name, "rent_" + i, "people", "escalation", "overdue", title, "Rent instalment " + i + " due " + ds + " is not marked paid.",
                        owner="Admin (role)", owner_basis="Role", due=ds, due_basis="installment_" + i + "_dues_on", amount=amt, currency=None,
                        amount_basis="amount_intallments (currency not recorded)", company_name=r.get("company"), status="Unpaid")
                elif ds <= horizon:
                    upcoming("facilities", "people", "DM Facilities Management", r.name, ds, "Rent instalment " + i, title, amt, None)
    check("facilities", "people", "Second rent schedule not read", None,
          "Fields rental_start_date / 2nd_rental_installment_date / 3_rent_installment_dues_on use a separate paid flag set; confirm which schedule is authoritative before adding it.")
    return {}


def src_company_docs():
    rows = gl("DM Companies Management", ["name", "company_name", "cr_expiry", "national_address_expiry", "misa_expiry", "cr_cancelled"], [["cr_cancelled", "=", 0]], order_by="company_name asc", limit=500)
    exp_window = str(frappe.utils.add_days(today, POLICY["expiry_window_days"]))
    for r in rows:
        for spec in [["cr_expiry", "Commercial registration"], ["national_address_expiry", "National address"], ["misa_expiry", "MISA licence"]]:
            d = r.get(spec[0])
            if not d:
                continue
            ds = dstr(d)
            if ds < today:
                act("company_docs", "DM Companies Management", r.name, "expired_" + spec[0], "legal", "escalation", "critical", r.company_name or r.name, spec[1] + " expired on " + ds + ".",
                    owner="Government Relations (role)", owner_basis="Role", due=ds, due_basis="DM Companies Management." + spec[0], status="Expired")
            elif ds <= exp_window:
                act("company_docs", "DM Companies Management", r.name, "expiring_" + spec[0], "legal", "followup", "due_soon", r.company_name or r.name, spec[1] + " expires on " + ds + ".",
                    owner="Government Relations (role)", owner_basis="Role", due=ds, due_basis="DM Companies Management." + spec[0], status="Expiring")
                if ds <= horizon:
                    upcoming("company_docs", "legal", "DM Companies Management", r.name, ds, spec[1] + " expiry", r.company_name or r.name)
    return {"scope": "unscoped" if company else "all", "message": "Company records here are free text names, not Company links."}


def src_leave_upcoming():
    f = [["Leave Application", "status", "=", "Approved"], ["Leave Application", "docstatus", "=", 1], ["Leave Application", "from_date", "between", [today, horizon]]]
    company_filter("Leave Application", f)
    rows = gl("Leave Application", ["name", "employee_name", "department", "from_date", "to_date", "leave_type"], f, order_by="from_date asc", limit=500)
    for r in rows:
        upcoming("leave", "people", "Leave Application", r.name, r.from_date, "Leave starts (" + (r.leave_type or "") + ")", (r.employee_name or "") + ((" · " + r.department) if r.department else ""))
    indicator("people", "leave_starting", "Approved leave starting in " + str(window) + " days", len(rows), "Leave Application Approved by from_date")
    return {}


def perf_people():
    f = [["Employee", "status", "=", "Active"]]
    company_filter("Employee", f)
    rows = gl("Employee", ["company", "count(name) as n"], f, order_by="company asc", group_by="company", limit=200)
    perf("people", "workforce", {"rows": [{"company": r.company, "count": frappe.utils.cint(r.n)} for r in rows], "basis": "Active Employee records readable by you."})
    first = today[:8] + "01"
    f = [["Payroll Entry", "docstatus", "<", 2], ["Payroll Entry", "start_date", "<=", today], ["Payroll Entry", "end_date", ">=", first]]
    company_filter("Payroll Entry", f)
    rows = gl("Payroll Entry", ["name", "company", "status", "docstatus", "posting_date", "start_date", "end_date"], f, order_by="posting_date desc", limit=50)
    perf("people", "payroll", {"rows": [{"name": r.name, "company": r.company, "status": r.status, "docstatus": r.docstatus, "period": dstr(r.start_date) + " – " + dstr(r.end_date)} for r in rows],
                               "basis": "Payroll Entries covering the current month. No entry means payroll has not been run yet — not a zero salary cost. Salary detail is not shown here."})


# ----------------------------------------------------------------------------- 6. projects
def src_submittals():
    rows = gl("DMS Technical Submittal", ["name", "project_name", "client", "status", "required_date", "priority", "submitted_by", "sales_person", "creation"],
              [["docstatus", "<", 2], ["status", "in", ["Requested", "In Preparation", "Revision Required"]]], order_by="required_date asc", limit=1000)
    prime("Employee", [r.submitted_by for r in rows] + [r.sales_person for r in rows])
    for r in rows:
        unpacked = owner_of(r, "submitted_by", "Employee", "DMS Technical Submittal.submitted_by")
        o = unpacked[0]
        ob = unpacked[1]
        if not o:
            unpacked = owner_of(r, "sales_person", "Employee", "DMS Technical Submittal.sales_person (requester side)")
            o = unpacked[0]
            ob = unpacked[1]
        ds = dstr(r.required_date)
        title = (r.project_name or r.name)[:120]
        if ds and ds < today:
            act("submittals", "DMS Technical Submittal", r.name, "submittal_overdue", "projects", "escalation" if r.priority == "Urgent" else "followup", "overdue", title,
                "Submittal '" + r.status + "' past its required date.", owner=o, owner_basis=ob, due=ds, due_basis="DMS Technical Submittal.required_date", status=r.status, age_from=r.creation)
        elif ds and ds <= horizon:
            act("submittals", "DMS Technical Submittal", r.name, "submittal_due", "projects", "followup", "due_soon", title, "Submittal '" + r.status + "' due soon.",
                owner=o, owner_basis=ob, due=ds, due_basis="DMS Technical Submittal.required_date", status=r.status, age_from=r.creation)
            upcoming("submittals", "projects", "DMS Technical Submittal", r.name, ds, "Submittal due", title, owner=o)
        elif not ds:
            act("submittals", "DMS Technical Submittal", r.name, "submittal_nodate", "projects", "verification", "verify", title, "Open submittal has no required date.",
                owner=o, owner_basis=ob, status=r.status, age_from=r.creation)
    indicator("projects", "submittals_open", "Submittals awaiting internal work", len(rows), "Requested / In Preparation / Revision Required")
    return {"scope": "unscoped" if company else "all"}


def src_key_personnel():
    rows = gl("DMS Key Personnel Request", ["name", "project_name", "required_designation", "status", "request_date", "requested_by", "creation"],
              [["status", "in", ["Pending", "In Progress"]]], order_by="request_date asc", limit=500)
    for r in rows:
        act("key_personnel", "DMS Key Personnel Request", r.name, "contact_request", "projects", "followup", "pending", (r.project_name or r.name)[:120],
            "Contact request for '" + (r.required_designation or "key personnel") + "' is " + (r.status or "").lower() + ".",
            owner="", status=r.status, age_from=r.request_date or r.creation)
    return {"scope": "unscoped" if company else "all"}


def src_tasks():
    f = [["Task", "status", "in", ["Open", "Working", "Pending Review", "Overdue"]], ["Task", "exp_end_date", "<", horizon]]
    company_filter("Task", f)
    rows = gl("Task", ["name", "subject", "project", "status", "exp_end_date", "priority", "company", "_assign", "creation"], f, order_by="exp_end_date asc", limit=1000)
    prime_assign(rows)
    for r in rows:
        unpacked = owner_of(r)
        o = unpacked[0]
        ob = unpacked[1]
        ds = dstr(r.exp_end_date)
        if ds < today:
            act("tasks", "Task", r.name, "task_overdue", "projects", "escalation" if r.priority in ["High", "Urgent"] else "followup", "overdue", r.subject or r.name,
                "Project task past expected end" + ((" · " + r.project) if r.project else "") + ".", owner=o, owner_basis=ob, due=ds, due_basis="Task.exp_end_date",
                company_name=r.company, status=r.status, age_from=r.creation)
        else:
            upcoming("tasks", "projects", "Task", r.name, ds, "Task due", r.subject or r.name, owner=o)
    return {}


def perf_projects():
    rows = gl("DMS Technical Submittal", ["status", "count(name) as n"], [["docstatus", "<", 2]], order_by="status asc", group_by="status", limit=50)
    perf("projects", "submittal_status", {"rows": [{"label": r.status, "count": frappe.utils.cint(r.n)} for r in rows], "basis": "All DMS Technical Submittals by current status."})
    rows = gl("DMS Technical Submittal", ["count(name) as n"], [["approval_date", "between", [p_from, p_to]], ["status", "in", ["Approved", "Approved with Comments"]]], limit=1)
    perf("projects", "approvals", {"count": frappe.utils.cint(rows[0].n) if rows else 0, "basis": "Submittals approved (approval_date) in the period."})


# ----------------------------------------------------------------------------- 7. operations
def src_vehicle_issues():
    rows = gl("Driver Vehicle Issue Request", ["name", "vehicle", "driver_name", "issue_category", "severity", "status", "report_datetime", "fleet_supervisor"],
              [["status", "in", ["Open", "In Progress"]]], order_by="report_datetime asc", limit=1000)
    prime("User", [r.fleet_supervisor for r in rows])
    for r in rows:
        unpacked = owner_of(r, "fleet_supervisor", "User", "Driver Vehicle Issue Request.fleet_supervisor")
        o = unpacked[0]
        ob = unpacked[1]
        crit = r.severity in ["High", "Critical"]
        act("vehicle_issues", "Driver Vehicle Issue Request", r.name, "vehicle_issue", "operations", "escalation" if crit else "followup", "critical" if r.severity == "Critical" else ("overdue" if crit else "pending"),
            (r.vehicle or "") + " · " + (r.issue_category or "Issue"), (r.severity or "") + " severity issue reported by " + (r.driver_name or "driver") + "; status " + (r.status or "") + ".",
            owner=o, owner_basis=ob, status=r.status, age_from=r.report_datetime)
    indicator("operations", "vehicle_issues", "Open vehicle issues", len(rows), "Driver Vehicle Issue Request Open / In Progress", tone="bad" if rows else "")
    return {"scope": "unscoped" if company else "all"}


def src_vehicle_maintenance():
    cutoff = str(frappe.utils.add_days(today, -POLICY["recent_overdue_days"]))
    base = [["docstatus", "<", 2], ["status", "in", ["Scheduled", "Approved"]]]
    recent = gl("Vehicle Maintenance Schedule", ["name", "vehicle", "employee_name", "status", "date", "reviewed_by", "_assign"],
                base + [["date", "<", now_s], ["date", ">=", cutoff]], order_by="date asc", limit=500)
    prime_assign(recent)
    for r in recent:
        unpacked = owner_of(r)
        o = unpacked[0]
        ob = unpacked[1]
        act("vehicle_maintenance", "Vehicle Maintenance Schedule", r.name, "maintenance_overdue", "operations", "followup", "overdue", (r.vehicle or r.name),
            "Scheduled maintenance date has passed while status is '" + (r.status or "") + "'.", owner=o or (r.employee_name or ""), owner_basis=ob if o else ("Vehicle Maintenance Schedule.employee_name" if r.employee_name else "unassigned"),
            due=r.date, due_basis="Vehicle Maintenance Schedule.date", status=r.status)
    stale = count("Vehicle Maintenance Schedule", base + [["date", "<", cutoff]])
    if stale:
        check("vehicle_maintenance", "operations", "Maintenance schedules not closed after " + str(POLICY["recent_overdue_days"]) + " days", stale,
              "Still Scheduled/Approved long after their date. Likely completed without status update; confirm and close in Fleet.",
              list_route("Vehicle Maintenance Schedule", [["status", "in", ["Scheduled", "Approved"]], ["date", "<", cutoff]]))
    up = gl("Vehicle Maintenance Schedule", ["name", "vehicle", "date"], base + [["date", ">=", now_s], ["date", "<=", horizon + " 23:59:59"]], order_by="date asc", limit=200)
    for r in up:
        upcoming("vehicle_maintenance", "operations", "Vehicle Maintenance Schedule", r.name, r.date, "Vehicle maintenance", r.vehicle or r.name)
    return {"scope": "unscoped" if company else "all"}


# Same document fields and labels as the Fleet dashboard (no fallback between dates).
VEHICLE_EXPIRY = [["registration_expiry", "Istimara / RC"], ["end_date", "Insurance"], ["mvpi_date", "Inspection · MVPI / Fahas"],
                  ["expiry_date", "Driving licence · expiry_date"], ["license_expiry_date", "Driving licence · license_expiry_date"],
                  ["op_card_expiry_date", "Operation card"], ["driver_card_expiry_date", "Driver card"]]


def src_vehicle_docs():
    fields = ["name", "license_plate", "branch"] + [v[0] for v in VEHICLE_EXPIRY if has_field("Vehicle", v[0])]
    rows = gl("Vehicle", fields, [["custom_vehicle_status", "=", "Active"]], order_by="license_plate asc", limit=2000)
    exp_window = str(frappe.utils.add_days(today, POLICY["expiry_window_days"]))
    expired = 0
    for r in rows:
        for spec in VEHICLE_EXPIRY:
            d = r.get(spec[0])
            if not d:
                continue
            ds = dstr(d)
            if ds < today:
                expired = expired + 1
                act("vehicle_docs", "Vehicle", r.name, "expired_" + spec[0], "operations", "escalation", "critical", r.license_plate or r.name, spec[1] + " expired on " + ds + ".",
                    owner="Fleet (role)", owner_basis="Role", due=ds, due_basis="Vehicle." + spec[0], status="Expired")
            elif ds <= exp_window:
                act("vehicle_docs", "Vehicle", r.name, "expiring_" + spec[0], "operations", "followup", "due_soon", r.license_plate or r.name, spec[1] + " expires on " + ds + ".",
                    owner="Fleet (role)", owner_basis="Role", due=ds, due_basis="Vehicle." + spec[0], status="Expiring")
                if ds <= horizon:
                    upcoming("vehicle_docs", "operations", "Vehicle", r.name, ds, spec[1] + " expiry", r.license_plate or r.name)
    indicator("operations", "vehicle_docs_expired", "Expired vehicle documents", expired, "Active vehicles (Fleet definition); expiry date before today", tone="bad" if expired else "")
    return {"scope": "unscoped" if company else "all"}


def src_delivery_trips():
    f = [["Delivery Trip", "docstatus", "=", 1], ["Delivery Trip", "status", "in", ["Scheduled", "In Transit"]]]
    company_filter("Delivery Trip", f)
    cutoff = str(frappe.utils.add_days(today, -7))
    recent = gl("Delivery Trip", ["name", "driver_name", "vehicle", "departure_time", "status", "company", "custom_trip_type_"],
                f + [["Delivery Trip", "departure_time", "<", now_s], ["Delivery Trip", "departure_time", ">=", cutoff]], order_by="departure_time asc", limit=500)
    for r in recent:
        act("delivery_trips", "Delivery Trip", r.name, "trip_open", "operations", "followup", "overdue", (r.vehicle or "") + " · " + (r.driver_name or "driver not set"),
            "Departed " + str(r.departure_time)[:16] + " and still '" + r.status + "'.", owner=r.driver_name or "", owner_basis="Delivery Trip.driver_name" if r.driver_name else "unassigned",
            due=r.departure_time, due_basis="Delivery Trip.departure_time", company_name=r.company, status=r.status)
    stale = count("Delivery Trip", f + [["Delivery Trip", "departure_time", "<", cutoff]])
    if stale:
        check("delivery_trips", "operations", "Delivery trips never closed", stale,
              "Scheduled / In Transit more than 7 days after departure. Trip status is not being maintained, so delivery completion cannot be measured from trips.",
              list_route("Delivery Trip", [["status", "in", ["Scheduled", "In Transit"]], ["departure_time", "<", cutoff]]))
    ev = [["Delivery Trip", "docstatus", "=", 1], ["Delivery Trip", "status", "=", "Completed"], ["Delivery Trip", "departure_time", ">=", str(frappe.utils.add_days(today, -30))],
          ["Delivery Trip", "custom_signed_delivery_note", "is", "not set"]]
    company_filter("Delivery Trip", ev)
    missing = count("Delivery Trip", ev)
    if missing:
        act("delivery_trips", "Delivery Trip", "missing-evidence", "bundle", "operations", "followup", "pending", str(missing) + " completed trips without a signed delivery note",
            "Completed in the last 30 days with no custom_signed_delivery_note attachment.", link=list_route("Delivery Trip", [["status", "=", "Completed"], ["custom_signed_delivery_note", "is", "not set"]]),
            bundle=missing, extra={"count": missing})
    indicator("operations", "trips_open", "Trips open after departure (7 days)", len(recent), "Scheduled / In Transit with departure in the last 7 days")
    return {}


def perf_operations():
    f = [["Delivery Trip", "docstatus", "=", 1], ["Delivery Trip", "departure_time", "between", [p_from, p_to + " 23:59:59"]]]
    company_filter("Delivery Trip", f)
    rows = gl("Delivery Trip", ["status", "count(name) as n"], f, order_by="status asc", group_by="status", limit=20)
    perf("operations", "trips", {"rows": [{"label": r.status, "count": frappe.utils.cint(r.n)} for r in rows], "basis": "Submitted Delivery Trips departing in the period, by status. A Scheduled trip is not a completed delivery."})
    rows = gl("Vehicle", ["custom_vehicle_status", "count(name) as n"], [], order_by="custom_vehicle_status asc", group_by="custom_vehicle_status", limit=20)
    perf("operations", "fleet", {"rows": [{"label": r.custom_vehicle_status or "Status not set", "count": frappe.utils.cint(r.n)} for r in rows], "basis": "Vehicle master by custom_vehicle_status."})


# ----------------------------------------------------------------------------- 8. manufacturing
def src_work_orders():
    f = [["Work Order", "docstatus", "=", 1], ["Work Order", "status", "in", ["Not Started", "In Process"]], ["Work Order", "expected_delivery_date", "<", today]]
    company_filter("Work Order", f)
    rows = gl("Work Order", ["name", "item_name", "production_item", "qty", "produced_qty", "stock_uom", "expected_delivery_date", "company", "status", "_assign", "creation"], f,
              order_by="expected_delivery_date asc", limit=1000)
    prime_assign(rows)
    for r in rows:
        unpacked = owner_of(r)
        o = unpacked[0]
        ob = unpacked[1]
        act("work_orders", "Work Order", r.name, "wo_overdue", "manufacturing", "followup", "overdue", r.item_name or r.production_item,
            "Produced " + str(frappe.utils.flt(r.produced_qty)) + " of " + str(frappe.utils.flt(r.qty)) + " " + (r.stock_uom or "") + " after expected delivery date.",
            owner=o, owner_basis=ob, due=r.expected_delivery_date, due_basis="Work Order.expected_delivery_date", company_name=r.company, status=r.status, age_from=r.creation)
    nodate = count("Work Order", [["docstatus", "=", 1], ["status", "in", ["Not Started", "In Process"]], ["expected_delivery_date", "is", "not set"]])
    if nodate:
        check("work_orders", "manufacturing", "Open work orders without an expected delivery date", nodate, "Overdue status cannot be determined.",
              list_route("Work Order", [["status", "in", ["Not Started", "In Process"]], ["expected_delivery_date", "is", "not set"]]))
    indicator("manufacturing", "wo_overdue", "Work orders overdue", len(rows), "Not Started / In Process past expected_delivery_date", tone="bad" if rows else "")
    return {}


def src_job_orders():
    rows = gl("Factory Job Order", ["name", "branch", "jo_type", "jo_status", "start_date", "end_date", "prepared_by", "creation"],
              [["docstatus", "<", 2], ["jo_status", "in", ["Open", "Inprogress", "Assigned"]]], order_by="end_date asc", limit=1000)
    prime("Employee", [r.prepared_by for r in rows])
    over = 0
    for r in rows:
        title = (r.branch or "") + " · " + (r.jo_type or "Job order")
        unpacked = owner_of(r, "prepared_by", "Employee", "Factory Job Order.prepared_by (preparer)")
        o = unpacked[0]
        ob = unpacked[1]
        ds = dstr(r.end_date)
        if ds and ds < today:
            over = over + 1
            act("job_orders", "Factory Job Order", r.name, "jo_overdue", "manufacturing", "followup", "overdue", title, "Job order '" + r.jo_status + "' past its end date.",
                owner=o, owner_basis=ob, due=ds, due_basis="Factory Job Order.end_date", status=r.jo_status, age_from=r.creation)
        elif r.jo_status == "Open" and r.start_date and dstr(r.start_date) <= today:
            act("job_orders", "Factory Job Order", r.name, "jo_unassigned", "manufacturing", "followup", "pending", title, "Start date reached but job order is still Open (not Assigned).",
                owner=o, owner_basis=ob, due=r.start_date, due_basis="Factory Job Order.start_date", status=r.jo_status, age_from=r.creation)
    old = [a for a in ACTIONS if a["source"] == "job_orders" and a["type"] == "jo_overdue" and (a["overdue_days"] or 0) > POLICY["recent_overdue_days"]]
    if len(old) > POLICY["bundle_limit"]:
        bundle_rows(old, "job_orders", "Factory Job Order", "manufacturing", "followup", "overdue", str(len(old)) + " job orders overdue more than " + str(POLICY["recent_overdue_days"]) + " days",
                    "Older job-order backlog shown as one item.", [["jo_status", "in", ["Open", "Inprogress", "Assigned"]], ["end_date", "<", str(frappe.utils.add_days(today, -POLICY["recent_overdue_days"]))]],
                    oldest=min([o["due"] for o in old]))
    indicator("manufacturing", "jo_overdue", "Factory job orders overdue", over, "Open/Inprogress/Assigned past end_date", tone="bad" if over else "")
    return {"scope": "unscoped" if company else "all"}


def src_production_reporting():
    since = str(frappe.utils.add_days(today, -30))
    unpacked = fetch("Factory Daily Production", ["name", "branch", "date"], [["date", ">=", since], ["docstatus", "<", 2]], "date asc", cap=5000)
    raw = unpacked[0]
    complete = unpacked[1]
    rows = group_rows(raw, ["branch"], date_field="date")
    factories = gl("Manufacturing Factory", ["name"], [], order_by="name asc", limit=50)
    for r in rows:
        gap = days_between(today, r["latest"]) or 0
        if gap > 2:
            check("production_reporting", "manufacturing", "No daily production report from " + (r["branch"] or "unnamed branch") + " since " + r["latest"], gap,
                  "Days since the last Factory Daily Production record. Missing reports are a data gap, not zero production.", severity="verify")
    month_first = today[:8] + "01"
    tg = gl("Manufacturing Production Target", ["factory", "count(name) as n"], [["target_date", ">=", month_first], ["docstatus", "<", 2]], order_by="factory asc", group_by="factory", limit=50)
    has_t = [t.factory for t in tg]
    for fct in factories:
        if fct.name not in has_t:
            check("production_reporting", "manufacturing", "No production target this month · " + fct.name, None,
                  "Manufacturing Production Target has no record dated this month for this factory; attainment cannot be calculated.")
    perf("manufacturing", "reporting", {"rows": [{"label": r["branch"] or "Not set", "last": r["latest"], "count": r["n"]} for r in rows],
                                        "basis": "Factory Daily Production records in the last 30 days by branch. Production-vs-target by item/UOM is in the Production dashboard."})
    perf("manufacturing", "targets", {"rows": [{"label": t.factory, "count": frappe.utils.cint(t.n)} for t in tg], "basis": "Manufacturing Production Target records dated this month."})
    return {"scope": "unscoped" if company else "all"}


# ----------------------------------------------------------------------------- 9. IT & assets
def src_it_tickets():
    rows = gl("IT Help Desk Request", ["name", "subject", "priority", "status", "request_type", "assigned_technician", "due_date", "date", "creation"],
              [["docstatus", "<", 2], ["status", "not in", ["Resolved", "Rejected"]]], order_by="due_date asc", limit=1000)
    prime("User", [r.assigned_technician for r in rows])
    for r in rows:
        unpacked = owner_of(r, "assigned_technician", "User", "IT Help Desk Request.assigned_technician")
        o = unpacked[0]
        ob = unpacked[1]
        late = r.due_date and str(r.due_date)[:19] < now_s
        hi = r.priority in ["High", "Critical"]
        grp = "escalation" if (hi and late) or r.priority == "Critical" else "followup"
        sev = "critical" if r.priority == "Critical" else ("overdue" if late else "pending")
        act("it_tickets", "IT Help Desk Request", r.name, "ticket", "it", grp, sev, r.subject or r.name,
            (r.priority or "") + " priority " + (r.request_type or "request").lower() + " · " + (r.status or "status not set") + (" · past due" if late else ""),
            owner=o, owner_basis=ob, due=r.due_date, due_basis="IT Help Desk Request.due_date" if r.due_date else "No due date recorded", status=r.status or "Open", age_from=r.date or r.creation)
    indicator("it", "it_open", "Open IT requests", len(rows), "Not Resolved / Rejected")
    return {"scope": "unscoped" if company else "all"}


def src_it_renewals():
    exp_window = str(frappe.utils.add_days(today, POLICY["expiry_window_days"]))
    rows = gl("IT Renewals Subscription", ["name", "renewal_name", "type_renewal", "expiry_date", "next_renewal", "total_amount", "currency", "responsible_person"],
              [["docstatus", "<", 2], ["expiry_date", "<=", exp_window]], order_by="expiry_date asc", limit=500)
    for r in rows:
        ds = dstr(r.expiry_date)
        title = r.renewal_name or r.type_renewal or r.name
        expired = ds < today
        act("it_renewals", "IT Renewals Subscription", r.name, "renewal", "it", "escalation" if expired else "followup", "overdue" if expired else "due_soon", title,
            ("Subscription expired on " if expired else "Subscription expires on ") + ds + ".", owner=r.responsible_person or "",
            owner_basis="IT Renewals Subscription.responsible_person (text)" if r.responsible_person else "unassigned", due=ds, due_basis="IT Renewals Subscription.expiry_date",
            amount=frappe.utils.flt(r.total_amount) or None, currency=r.currency or None, amount_basis="Recorded renewal amount", status="Expired" if expired else "Expiring")
        if not expired and ds <= horizon:
            upcoming("it_renewals", "it", "IT Renewals Subscription", r.name, ds, "IT renewal", title, frappe.utils.flt(r.total_amount) or None, r.currency or None)
    return {"scope": "unscoped" if company else "all"}


def src_assets():
    rows = gl("Asset Acquisition Records", ["name", "employee", "request_type", "satus", "date", "creation"], [["approval_status", "=", "Pending"], ["docstatus", "<", 2]], order_by="date asc", limit=500)
    prime("Employee", [r.employee for r in rows])
    for r in rows:
        act("assets", "Asset Acquisition Records", r.name, "acquisition", "it", "followup", "pending", (r.request_type or "Asset") + " · " + employee_name(r.employee),
            "Asset " + ((r.satus or "request").lower()) + " awaiting approval.", owner="", status="Pending", age_from=r.date or r.creation)
    f = [["Asset Repair", "repair_status", "=", "Pending"], ["Asset Repair", "docstatus", "<", 2]]
    company_filter("Asset Repair", f)
    for r in gl("Asset Repair", ["name", "asset_name", "asset", "failure_date", "company", "_assign"], f, order_by="failure_date asc", limit=500):
        unpacked = owner_of(r)
        o = unpacked[0]
        ob = unpacked[1]
        act("assets", "Asset Repair", r.name, "repair", "it", "followup", "pending", r.asset_name or r.asset, "Repair pending since failure on " + dstr(r.failure_date) + ".",
            owner=o, owner_basis=ob, company_name=r.company, status="Pending", age_from=r.failure_date)
    indicator("it", "asset_requests", "Asset requests awaiting approval", len(rows), "Asset Acquisition Records approval_status = Pending")
    return {"scope": "unscoped" if company else "all"}


# ----------------------------------------------------------------------------- 10. legal & compliance
def src_taradhi():
    rows = gl("Taradhi Cases", ["name", "customer", "first_session_date", "second_session_date", "first_payment_date", "second_payment_date", "payment_status", "remaining_balance", "sales_person", "order_no"],
              [["docstatus", "<", 2]], order_by="name asc", limit=1000)
    for r in rows:
        for spec in [["first_session_date", "First Taradhi session"], ["second_session_date", "Second Taradhi session"]]:
            d = r.get(spec[0])
            if d and today <= dstr(d) <= horizon:
                upcoming("taradhi", "legal", "Taradhi Cases", r.name, d, spec[1], r.customer or r.name, owner=r.sales_person or "")
        if r.payment_status not in ["Paid", "Lost"]:
            for spec in [["first_payment_date", "First case payment"], ["second_payment_date", "Second case payment"]]:
                d = r.get(spec[0])
                if not d:
                    continue
                ds = dstr(d)
                if ds < today:
                    act("taradhi", "Taradhi Cases", r.name, "payment_" + spec[0], "legal", "followup", "overdue", r.customer or r.name,
                        spec[1] + " date passed; payment status '" + (r.payment_status or "not set") + "'.", owner=r.sales_person or "",
                        owner_basis="Taradhi Cases.sales_person" if r.sales_person else "unassigned", due=ds, due_basis="Taradhi Cases." + spec[0],
                        amount=frappe.utils.flt(r.remaining_balance) or None, currency=None, amount_basis="Recorded remaining balance (no currency field; not ledger outstanding)",
                        status=r.payment_status or "")
                elif ds <= horizon:
                    upcoming("taradhi", "legal", "Taradhi Cases", r.name, ds, spec[1], r.customer or r.name, frappe.utils.flt(r.remaining_balance) or None, None)
    indicator("legal", "taradhi_cases", "Taradhi cases", len(rows), "Taradhi Cases readable by you")
    return {"scope": "unscoped" if company else "all"}


def src_legal_cases():
    rows = gl("Legal Case List", ["name", "customer", "legal_case_authority", "legal_case_status", "assigned_lawyer", "case_filing_date", "sales_person"],
              [["legal_case_status", "in", ["Opened", "Underway", ""]]], order_by="case_filing_date asc", limit=1000)
    nostatus = 0
    for r in rows:
        if not r.legal_case_status:
            nostatus = nostatus + 1
            continue
        act("legal_cases", "Legal Case List", r.name, "case_open", "legal", "followup", "pending", r.customer or r.name,
            (r.legal_case_authority or "Case") + " case " + r.legal_case_status.lower() + " since " + dstr(r.case_filing_date) + ".",
            owner=r.assigned_lawyer or "", owner_basis="Legal Case List.assigned_lawyer (text)" if r.assigned_lawyer else "unassigned", status=r.legal_case_status, age_from=r.case_filing_date)
    if nostatus:
        check("legal_cases", "legal", "Legal cases without a status", nostatus, "Legal Case List records with legal_case_status empty.", list_route("Legal Case List", [["legal_case_status", "is", "not set"]]))
    indicator("legal", "legal_open", "Open legal cases", len(rows) - nostatus, "Legal Case List Opened / Underway")
    court = count("Court Cases", [["docstatus", "<", 2]])
    check("legal_cases", "legal", "Court Cases have no status or session date", court, "Court Cases records can be counted but not followed up: the DocType has no status, hearing date or owner fields.")
    return {"scope": "unscoped" if company else "all"}


def src_documents():
    exp_window = str(frappe.utils.add_days(today, POLICY["expiry_window_days"]))
    rows = gl("Document Record", ["name", "document_title__document_no", "category", "expired_date", "owner__department", "status"],
              [["docstatus", "<", 2], ["status", "not in", ["Archieved"]], ["expired_date", "<=", exp_window]], order_by="expired_date asc", limit=500)
    for r in rows:
        ds = dstr(r.expired_date)
        exp = ds < today
        act("documents", "Document Record", r.name, "document_expiry", "legal", "escalation" if exp else "followup", "overdue" if exp else "due_soon",
            r.document_title__document_no or r.name, (r.category or "Document") + (" expired on " if exp else " expires on ") + ds + ".",
            owner=r.owner__department or "", owner_basis="Document Record.owner__department (text)" if r.owner__department else "unassigned",
            due=ds, due_basis="Document Record.expired_date", status=r.status or "")
    for dt, field in [["DM Letters", "filed"], ["DM Official Memo", "filed"]]:
        f = [[dt, "workflow_state", "=", "Approved"], [dt, field, "!=", "Yes"]]
        n = count(dt, f)
        if n:
            act("documents", dt, "not-filed", "bundle", "legal", "followup", "pending", str(n) + " approved " + dt + " not marked filed",
                "Approved documents whose '" + field + "' flag is not Yes.", link=list_route(dt, [["workflow_state", "=", "Approved"], [field, "!=", "Yes"]]), bundle=n, extra={"count": n})
    return {"scope": "unscoped" if company else "all"}


# ----------------------------------------------------------------------------- 11. DMCC (external)
def src_dmcc():
    state = "not_configured"
    msg = "DMCC Integration Settings is not installed or not enabled. External DMCC figures are never mixed into ERP totals."
    mf = meta_fields("DMCC Integration Settings")
    if mf is not None:
        try:
            enabled = frappe.db.get_single_value("DMCC Integration Settings", "enabled") if "enabled" in mf else None
            if enabled:
                state = "configured"
                msg = "Connector configured. External exception counts stay off until DMCC entity, status, currency and date mappings are verified."
        except Exception:
            state = "restricted"
            msg = "DMCC settings are not readable for your role."
    perf("dmcc", "connection", {"state": state, "message": msg})
    return {"partial": 0, "message": msg, "scope": "external"}


# ----------------------------------------------------------------------------- approvals inbox
# Everything awaiting a workflow decision by the current user, summarised per document type, auto-categorised and
# prioritised by explicit rules (deadline, amount, waiting time, staleness). Actions themselves are taken in the browser
# through Frappe's native frappe.model.workflow.apply_workflow, which re-checks roles, conditions and self-approval.
APPROVAL_POLICY = {"urgent_amount": 50000, "high_amount": 10000, "routine_amount": 1000, "overdue_days": 30,
                   "urgent_deadline_days": 3, "high_deadline_days": 14, "stale_quote_days": 180}
CAT_LABEL = {"money": "Money & credit", "sales": "Sales & pricing", "people": "People & HR", "requests": "Requests & admin", "other": "Other approvals"}
TIER_RANK = {"urgent": 0, "high": 1, "normal": 2, "stale": 3}
# title/sub/requester: [field, kind]; kind Employee/User resolves display names. deadline: [field, label, kind].
PROFILES = {
    "Credit Note Request - Sales Return": {
        "cat": "money", "label": "Credit note request", "title": ["customer_name", ""], "requester": ["owner", "User"], "date": "date",
        "amount": "difference_value_inc_vat", "amount_label": "Credit difference (incl. VAT)", "amount_alt": ["invoice_value_before_correction_inc_vat", "Invoice value before correction"],
        "facts": [["sales_invoice_no", "Invoice"], ["delivery_note_no", "Delivery note"], ["item_returning_warehouse", "Return to"]], "note": "remark_if_any",
        "reasons": [["material_rejected", "Material rejected"], ["invoicing_error", "Invoicing error"], ["discounting_error", "Discount error"], ["store_counting_error", "Store counting error"],
                    ["driver_counting_error", "Driver counting error"], ["system_calculation_error", "System calculation error"], ["typing_error", "Typing error"], ["salesman_error", "Salesman error"],
                    ["quotation_revised", "Quotation revised"], ["repeated_order", "Repeated order"], ["po_cancelled", "PO cancelled"], ["others", "Other reason"]],
        "currency_default": True},
    "Loan Application": {"cat": "money", "label": "Loan application", "title": ["applicant_name", ""], "requester": ["applicant_name", ""], "date": "posting_date",
                         "amount": "loan_amount", "amount_label": "Loan amount", "facts": [["loan_type", "Loan type"], ["repayment_periods", "Repayment periods"], ["repayment_amount", "Instalment"]],
                         "note": "description"},
    "Quotation": {"cat": "sales", "label": "Quotation", "title": ["customer_name", ""], "requester": ["sales_person", ""], "date": "transaction_date",
                  "amount": "base_grand_total", "amount_label": "Quotation value", "facts": [["valid_till", "Valid till"], ["payment_term", "Payment term"]],
                  "stale_date": ["valid_till", "Quotation validity ended on "]},
    "Sales Order": {"cat": "sales", "label": "Sales order", "title": ["customer_name", ""], "requester": ["sales_persons", ""], "date": "transaction_date",
                    "amount": "base_grand_total", "amount_label": "Order value", "deadline": ["delivery_date", "Delivery due", "start"]},
    "Leave Application": {"cat": "people", "label": "Leave", "title": ["employee_name", ""], "requester": ["employee_name", ""], "date": "posting_date",
                          "deadline": ["from_date", "Leave starts", "start"], "end": "to_date",
                          "facts": [["leave_type", "Type"], ["total_leave_days", "Days"], ["from_date", "From"], ["to_date", "To"], ["custom_replacement_person", "Replacement"]], "note": "description"},
    "Travel Request": {"cat": "people", "label": "Travel request", "title": ["employee_name", ""], "requester": ["employee_name", ""],
                       "facts": [["travel_type", "Travel type"], ["purpose_of_travel", "Purpose"], ["travel_funding", "Funding"]], "note": "description"},
    "Resignation Letter": {"cat": "people", "label": "Resignation", "title": ["employee", "Employee"], "requester": ["employee", "Employee"], "date": "resignation_date",
                           "deadline": ["expected_date", "Last working day", "end"], "facts": [["designation", "Designation"], ["department", "Department"]], "note": "reason"},
    "Qiwa contract renewal request": {"cat": "people", "label": "Contract renewal (Qiwa)", "title": ["emp_name", "Employee"], "requester": ["hr_manager", "Employee"],
                                      "deadline": ["contract_end_date", "Contract ends", "end"],
                                      "facts": [["designation", "Designation"], ["contract_type", "Contract type"], ["contract_duration", "Duration"]], "note": "additional_changes"},
    "Training": {"cat": "people", "label": "Training", "title": ["trainee", "Employee"], "requester": ["trainer", "Employee"], "deadline": ["date", "Training date", "start"]},
    "Materials Service General Request Form": {"cat": "requests", "label": "General request", "title": ["description_req", ""], "requester": ["employee", "Employee"], "date": "date",
                                               "amount": "total_amount", "amount_text": True, "amount_label": "Requested amount (as entered)",
                                               "facts": [["request_type", "Type"], ["department", "Department"], ["branch_req", "Branch"]], "note": "additional_desc"},
    "DM Letters": {"cat": "requests", "label": "Letter", "title": ["subject", ""], "requester": ["request_by", "Employee"], "date": "date",
                   "facts": [["company", "Company"]], "note": "reason"},
    "DM Official Memo": {"cat": "requests", "label": "Official memo", "title": ["memo_subject", ""], "requester": ["issued_by", "Employee"], "date": "memo_date",
                         "facts": [["memo_type", "Memo type"], ["to_whome", "Addressed to"]]},
    "DMG Event Management Schedule": {"cat": "requests", "label": "Event", "title": ["event_name", ""], "requester": ["managed_by", "Employee"],
                                      "deadline": ["event_date", "Event date", "start"], "stale_date": ["event_date", "Event date passed on "],
                                      "facts": [["event_catogory", "Category"], ["venue", "Venue"], ["attendees", "Attendees"]]},
}


SYSTEM_CURRENCY = ""
try:
    SYSTEM_CURRENCY = frappe.db.get_default("currency") or ""
except Exception:
    SYSTEM_CURRENCY = ""


def parse_amount(v):
    if v is None or v == "":
        return None
    s = "".join([ch for ch in str(v) if ch in "0123456789.-"])
    try:
        return frappe.utils.flt(float(s)) if s not in ["", ".", "-"] else None
    except Exception:
        return None


def resolve(kind, value):
    if not value:
        return ""
    if kind == "Employee":
        return employee_name(value)
    if kind == "User":
        return user_name(value)
    return str(value)


def build_approvals():
    items = []
    problems = []
    for w in workflow_pending():
        unpacked = w["doctype"], w["sfield"], w["pending"]
        dt = unpacked[0]
        sfield = unpacked[1]
        pending = unpacked[2]
        mine = {}
        for st in pending:
            if "CEO" in user_roles:
                # Only fetch states with an explicit CEO approval transition.
                if ceo_stage_transitions(w["workflow"], st):
                    mine[st] = pending[st]
            elif pending[st]["mine"]:
                mine[st] = pending[st]
        if not mine:
            continue
        mf = meta_fields(dt)
        if mf is None or sfield not in mf:
            problems.append(dt)
            continue
        pr = PROFILES.get(dt) or {"cat": "other", "label": dt, "title": [WF_TITLE.get(dt) or "title", ""]}
        want_f = [pr.get("title", ["", ""])[0], pr.get("requester", ["", ""])[0], pr.get("date"), pr.get("amount"), pr.get("note"),
                  (pr.get("amount_alt") or ["", ""])[0], (pr.get("deadline") or ["", ""])[0], pr.get("end"), (pr.get("stale_date") or ["", ""])[0]]
        want_f = want_f + [f[0] for f in pr.get("facts", [])] + [f[0] for f in pr.get("reasons", [])]
        if not pr.get("amount") and WF_AMOUNT.get(dt):
            pr = dict(pr)
            pr["amount"] = WF_AMOUNT.get(dt)
            want_f.append(pr["amount"])
        fields = ["name", "owner", "creation", "modified", sfield + " as wf_state"]
        for f in want_f:
            if f and f in mf and mf[f] not in ["Table", "Table MultiSelect"] and f not in fields:
                fields.append(f)
        has_co = mf.get("company") == "Link"
        if has_co and "company" not in fields:
            fields.append("company")
        filters = [[dt, sfield, "in", list(mine.keys())], [dt, "docstatus", "<", 2]]
        if company and has_co:
            filters.append([dt, "company", "=", company])
        try:
            unpacked = fetch(dt, fields, filters, "modified asc", cap=1000)
            rows = unpacked[0]
            complete = unpacked[1]
        except Exception as e:
            problems.append(dt + " (" + classify(e)[0] + ")")
            continue
        ids = {"Employee": [], "User": []}
        for r in rows:
            for spec in [pr.get("title"), pr.get("requester")]:
                if spec and spec[1] in ids:
                    ids[spec[1]].append(r.get(spec[0]))
            ids["User"].append(r.owner)
        prime("Employee", ids["Employee"])
        prime("User", ids["User"])
        for r in rows:
            p = mine.get(r.wf_state)
            if "CEO" in user_roles and p:
                p = ceo_stage_policy(w["workflow"], r.wf_state, r.owner)
            if not p or (r.owner == user and not p["self_ok"]):
                continue
            items.append(approval_item(dt, pr, r, p, mf))
    items.sort(key=lambda a: (TIER_RANK[a["priority"]], a["days_to_deadline"] if a["days_to_deadline"] is not None else 9999,
                              -(a["amount"] or 0), -(a["waiting_days"] or 0)))
    return items, problems


def approval_item(dt, pr, r, p, mf):
    P = APPROVAL_POLICY
    title = resolve((pr.get("title") or ["", ""])[1], r.get((pr.get("title") or ["", ""])[0])) or r.name
    req_spec = pr.get("requester") or ["", ""]
    requester = resolve(req_spec[1], r.get(req_spec[0])) or user_name(r.owner)
    waiting = days_between(today, dstr(r.modified)) or 0
    amount = None
    amount_label = pr.get("amount_label") or "Amount"
    if pr.get("amount") and pr["amount"] in mf:
        amount = parse_amount(r.get(pr["amount"])) if pr.get("amount_text") else frappe.utils.flt(r.get(pr["amount"]))
        if amount is not None:
            amount = abs(amount)
        if not amount and pr.get("amount_alt") and r.get(pr["amount_alt"][0]):
            amount = None
    currency = None
    amount_basis = ""
    if amount is not None and pr.get("amount_text"):
        amount_basis = "As typed in a text field; currency not recorded"
    elif amount is not None and r.get("company") and dt not in WF_AMOUNT_NO_CURRENCY:
        currency = company_currency.get(r.get("company"))
    elif SYSTEM_CURRENCY and (amount is not None or dt in WF_AMOUNT_NO_CURRENCY):
        currency = SYSTEM_CURRENCY
        amount_basis = "Field has no currency setting; shown in the system default currency"
    facts = []
    if amount is None and pr.get("amount_alt") and r.get(pr["amount_alt"][0]):
        facts.append([pr["amount_alt"][1], frappe.utils.flt(r.get(pr["amount_alt"][0]))])
    for f in pr.get("facts", []):
        v = r.get(f[0])
        if v not in [None, ""]:
            if f[0] in ["custom_replacement_person", "employee", "trainer"]:
                v = employee_name(v)
            facts.append([f[1], str(v)[:120]])
    tags = [x[1] for x in pr.get("reasons", []) if r.get(x[0])]
    note = str(r.get(pr.get("note")) or "")[:400] if pr.get("note") else ""
    deadline = None
    deadline_label = ""
    dtd = None
    if pr.get("deadline") and r.get(pr["deadline"][0]):
        deadline = dstr(r.get(pr["deadline"][0]))
        deadline_label = pr["deadline"][1]
        dtd = days_between(deadline, today)
    tier = "normal"
    why = []
    end = dstr(r.get(pr["end"])) if pr.get("end") and r.get(pr["end"]) else ""
    stale_date = dstr(r.get(pr["stale_date"][0])) if pr.get("stale_date") and r.get(pr["stale_date"][0]) else ""
    if end and end < today:
        tier = "stale"
        why.append("Already ended on " + end + " — decision only regularises the record")
    elif stale_date and stale_date < today:
        tier = "stale"
        why.append(pr["stale_date"][1] + stale_date)
    elif dt == "Quotation" and waiting > P["stale_quote_days"]:
        tier = "stale"
        why.append("Unchanged for " + str(waiting) + " days")
    elif end and deadline and deadline <= today <= end:
        tier = "urgent"
        why.append("In progress since " + deadline + " (until " + end + ")")
    elif dtd is not None and dtd <= P["urgent_deadline_days"]:
        tier = "urgent"
        why.append(deadline_label + (" today" if dtd == 0 else (" in " + str(dtd) + " day" + ("" if dtd == 1 else "s") if dtd > 0 else " passed " + str(-dtd) + " days ago")))
    elif amount and amount >= P["urgent_amount"]:
        tier = "urgent"
        why.append("High value")
    else:
        if dtd is not None and dtd <= P["high_deadline_days"]:
            tier = "high"
            why.append(deadline_label + " in " + str(dtd) + " days")
        if amount and amount >= P["high_amount"]:
            tier = "high"
            why.append("Significant value")
    if waiting >= P["overdue_days"]:
        why.append("Waiting " + str(waiting) + " days")  # shown and used for sorting; never raises the tier on its own
    acts = sorted(list(set(p["mine"])))
    approve = [a for a in acts if a.lower() in ["approve", "final approval", "first approve", "accept"]]
    routine = pr.get("cat") == "requests" and amount is not None and amount < P["routine_amount"] and tier in ["normal", "high"] and not p["conditional"]
    return {
        "key": dt + "::" + r.name, "doctype": dt, "name": r.name, "type_label": pr.get("label") or dt, "category": pr.get("cat") or "other",
        "category_label": CAT_LABEL.get(pr.get("cat") or "other"), "title": str(title)[:140], "requester": requester, "state": r.wf_state,
        "actions": acts, "approve_action": approve[0] if approve else "", "conditional": 1 if p["conditional"] else 0,
        "amount": amount, "amount_label": amount_label, "currency": currency, "amount_basis": amount_basis,
        "facts": facts, "tags": tags, "note": note, "date": dstr(r.get(pr.get("date"))) if pr.get("date") else dstr(r.creation),
        "deadline": deadline, "deadline_label": deadline_label, "days_to_deadline": dtd, "waiting_days": waiting,
        "priority": tier, "why": why, "routine": 1 if routine else 0,
        "bulk": 1 if (approve and not p["conditional"] and tier in ["normal", "high"] and (amount is None or amount < P["high_amount"])) else 0,
        "company": r.get("company") or "", "modified": str(r.modified)[:19],
    }


def approval_summary(items):
    s = {"total": len(items), "tiers": {"urgent": 0, "high": 0, "normal": 0, "stale": 0}, "categories": {}, "types": {}, "value": {}, "oldest": 0, "routine": 0, "bulk": 0}
    for a in items:
        s["tiers"][a["priority"]] = s["tiers"][a["priority"]] + 1
        s["categories"][a["category"]] = s["categories"].get(a["category"], 0) + 1
        s["types"][a["type_label"]] = s["types"].get(a["type_label"], 0) + 1
        if a["amount"] and a["currency"]:
            s["value"][a["currency"]] = s["value"].get(a["currency"], 0) + a["amount"]
        s["oldest"] = max(s["oldest"], a["waiting_days"] or 0)
        s["routine"] = s["routine"] + a["routine"]
        s["bulk"] = s["bulk"] + a["bulk"]
    return s


def approval_detail(dt, name):
    mf = meta_fields(dt)
    if mf is None:
        frappe.throw("Unknown document type.")
    if not gl(dt, ["name"], [[dt, "name", "=", name]], limit=1):
        frappe.throw("Record not found or not readable.")
    meta = frappe.get_meta(dt)
    skip_types = ["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Fold", "Heading", "Table", "Table MultiSelect", "Signature", "Password"]
    plain = [f.fieldname for f in meta.fields if f.fieldtype not in skip_types and f.fieldname not in ["amended_from", "naming_series"]]
    row = gl(dt, ["name", "owner", "creation", "modified", "modified_by", "docstatus"] + plain[:120], [[dt, "name", "=", name]], limit=1)[0]
    fields = []
    for f in meta.fields:
        if f.fieldname in plain and row.get(f.fieldname) not in [None, "", 0] and not (f.fieldtype == "Check" and not row.get(f.fieldname)):
            fields.append({"label": f.label or f.fieldname, "type": f.fieldtype, "value": str(row.get(f.fieldname))[:2000], "options": f.options or ""})
    tables = []
    for f in meta.fields:
        if f.fieldtype != "Table" or not f.options:
            continue
        cm = frappe.get_meta(f.options)
        cols = [c for c in cm.fields if c.in_list_view and c.fieldtype not in skip_types][:7]
        if len(cols) < 3:
            cols = [c for c in cm.fields if c.fieldtype not in skip_types][:6]
        rows = frappe.get_all(f.options, filters={"parent": name, "parenttype": dt, "parentfield": f.fieldname},
                              fields=[c.fieldname for c in cols], order_by="idx asc", limit_page_length=50)
        if rows:
            tables.append({"label": f.label or f.fieldname, "columns": [{"field": c.fieldname, "label": c.label or c.fieldname, "type": c.fieldtype} for c in cols],
                           "rows": [{c.fieldname: (str(x.get(c.fieldname)) if x.get(c.fieldname) is not None else "") for c in cols} for x in rows]})
    comments = []
    try:
        for c in gl("Comment", ["comment_type", "content", "owner", "creation"], [["reference_doctype", "=", dt], ["reference_name", "=", name],
                                                                                 ["comment_type", "in", ["Comment", "Workflow"]]], order_by="creation desc", limit=8):
            comments.append({"type": c.comment_type, "by": user_name(c.owner), "when": str(c.creation)[:16], "content": str(c.content or "")[:600]})
    except Exception:
        comments = []
    return {"doctype": dt, "name": name, "fields": fields, "tables": tables, "comments": comments,
            "created_by": user_name(row.owner), "created": str(row.creation)[:16], "modified": str(row.modified)[:16], "modified_by": user_name(row.modified_by)}


# ----------------------------------------------------------------------------- registry + execution
REGISTRY = [
    ["workflow", None, "Workflow approvals", ["Workflow", "Workflow Transition"], {}, src_workflows],
    ["lead_allocation", "sales", "Lead allocation", ["Leads Generation List", "Lead Allocation"], {"Leads Generation List": ["customer_name", "date"], "Lead Allocation": ["lead", "status"]}, src_lead_allocation],
    ["lead_followup", "sales", "Lead follow-ups", ["Lead Allocation"], {"Lead Allocation": ["assigned_user", "sales_person", "next_follow_up", "priority", "status"]}, src_lead_followup],
    ["dms", "sales", "DMS project follow-up", ["DMS Project"], {"DMS Project": ["sales_person", "allocation_status", "follow_up_status", "next_follow_up_date"]}, src_dms],
    ["sales_orders", "sales", "Sales order delivery", ["Sales Order"], {"Sales Order": ["delivery_date", "per_delivered", "base_grand_total", "sales_persons"]}, src_sales_orders],
    ["quotations", "sales", "Quotation validity", ["Quotation"], {"Quotation": ["valid_till", "base_grand_total", "sales_person"]}, src_quotations],
    ["material_requests", "procurement", "Purchase requests", ["Material Request"], {"Material Request": ["schedule_date", "per_ordered", "custom_priority", "material_request_type"]}, src_material_requests],
    ["purchase_orders", "procurement", "Purchase order receipts", ["Purchase Order"], {"Purchase Order": ["schedule_date", "per_received", "custom_po_in_charge_", "custom_purchaser_name", "custom_shipment_status"]}, src_purchase_orders],
    ["shipments", "procurement", "Shipments & customs", ["Purchase Order"], {"Purchase Order": ["custom_shipment_status", "custom_estimated_arrival_time", "custom_clearing_document_status"]}, src_shipments],
    ["receivables", "finance", "Receivables follow-up", ["Sales Invoice", "Customer"], {"Sales Invoice": ["outstanding_amount", "party_account_currency", "due_date"], "Customer": ["custom_sales_person"]}, src_receivables],
    ["credit_limits", "finance", "Credit-limit breaches", ["Customer", "Customer Credit Limit", "Sales Invoice"], {"Customer Credit Limit": ["company", "credit_limit", "bypass_credit_limit_check"]}, src_credit_limits],
    ["payables", "finance", "Supplier payables", ["Purchase Invoice"], {"Purchase Invoice": ["outstanding_amount", "party_account_currency", "due_date", "on_hold"]}, src_payables],
    ["soa", "finance", "SOA exceptions", ["SOA Request"], {"SOA Request": ["status", "reviewed_by", "error"]}, src_soa],
    ["soa_workflow", "finance", "SOA workflow requests", ["SOA Workflow Request"], {"SOA Workflow Request": ["kind", "status", "company"]}, src_soa_workflow],
    ["collection_lists", "finance", "Collection list approvals", ["Collection List"], {"Collection List": ["status", "collector_name", "total_due"]}, src_collection_lists],
    ["vacations", "people", "Leave returns & re-entry", ["Employee Vacation Record"], {"Employee Vacation Record": ["vacation_status", "expected_rejoin_date", "revised_rejoin_date", "actual_rejoin_date", "reentry_status", "refund_status", "action_required"]}, src_vacations],
    ["facilities", "people", "Facility rent & renewals", ["DM Facilities Management"], {"DM Facilities Management": ["facility_contract_status", "facility_type"]}, src_facilities],
    ["leave", "people", "Upcoming leave", ["Leave Application"], {"Leave Application": ["from_date", "status"]}, src_leave_upcoming],
    ["submittals", "projects", "Technical submittals", ["DMS Technical Submittal"], {"DMS Technical Submittal": ["status", "required_date", "priority", "submitted_by"]}, src_submittals],
    ["key_personnel", "projects", "DMS contact requests", ["DMS Key Personnel Request"], {"DMS Key Personnel Request": ["status", "required_designation"]}, src_key_personnel],
    ["tasks", "projects", "Project tasks", ["Task"], {"Task": ["exp_end_date", "status", "priority"]}, src_tasks],
    ["vehicle_issues", "operations", "Vehicle issues", ["Driver Vehicle Issue Request"], {"Driver Vehicle Issue Request": ["severity", "status", "fleet_supervisor"]}, src_vehicle_issues],
    ["vehicle_maintenance", "operations", "Vehicle maintenance", ["Vehicle Maintenance Schedule"], {"Vehicle Maintenance Schedule": ["status", "date", "employee_name"]}, src_vehicle_maintenance],
    ["vehicle_docs", "operations", "Vehicle documents", ["Vehicle"], {"Vehicle": ["license_plate", "custom_vehicle_status"]}, src_vehicle_docs],
    ["delivery_trips", "operations", "Delivery trips", ["Delivery Trip"], {"Delivery Trip": ["departure_time", "status", "custom_signed_delivery_note"]}, src_delivery_trips],
    ["work_orders", "manufacturing", "Work orders", ["Work Order"], {"Work Order": ["expected_delivery_date", "produced_qty", "status"]}, src_work_orders],
    ["job_orders", "manufacturing", "Factory job orders", ["Factory Job Order"], {"Factory Job Order": ["jo_status", "end_date", "start_date", "prepared_by"]}, src_job_orders],
    ["production_reporting", "manufacturing", "Production reporting & targets", ["Factory Daily Production", "Manufacturing Production Target", "Manufacturing Factory"],
     {"Factory Daily Production": ["branch", "date"], "Manufacturing Production Target": ["factory", "target_date"]}, src_production_reporting],
    ["it_tickets", "it", "IT help desk", ["IT Help Desk Request"], {"IT Help Desk Request": ["priority", "status", "assigned_technician", "due_date"]}, src_it_tickets],
    ["it_renewals", "it", "IT renewals", ["IT Renewals Subscription"], {"IT Renewals Subscription": ["expiry_date", "total_amount", "responsible_person"]}, src_it_renewals],
    ["assets", "it", "Asset requests & repairs", ["Asset Acquisition Records", "Asset Repair"], {"Asset Acquisition Records": ["approval_status"], "Asset Repair": ["repair_status"]}, src_assets],
    ["taradhi", "legal", "Taradhi sessions & payments", ["Taradhi Cases"], {"Taradhi Cases": ["first_session_date", "second_session_date", "payment_status", "remaining_balance"]}, src_taradhi],
    ["legal_cases", "legal", "Legal cases", ["Legal Case List", "Court Cases"], {"Legal Case List": ["legal_case_status", "assigned_lawyer"]}, src_legal_cases],
    ["company_docs", "legal", "Company registrations", ["DM Companies Management"], {"DM Companies Management": ["cr_expiry", "cr_cancelled"]}, src_company_docs],
    ["documents", "legal", "Document control", ["Document Record", "DM Letters", "DM Official Memo"], {"Document Record": ["expired_date", "status"]}, src_documents],
    ["dmcc", "dmcc", "DMCC external connector", ["DMCC Integration Settings"], {}, src_dmcc],
]
PERF = [["sales", perf_sales], ["procurement", perf_procurement], ["finance", perf_finance], ["people", perf_people], ["projects", perf_projects], ["operations", perf_operations]]


# ----------------------------------------------------------------------------- executive performance (department Performance tabs)
# The measures each department's own dashboard leads with, read as grouped server aggregates (no row downloads, no row cap).
# Values use verified company-currency base fields and are kept per currency, never added across currencies.
# Spec: [doctype, status field, date field ("" = current snapshot), value field ("" = counts only), submitted only (1/0),
#        title, source dashboard, value label]
# Sandbox rules (live Server Script): no tuple-unpacking assignment and no augmented assignment; use x = x + y.
EXECUTIVE_SOURCES = {
    "sales": [["Quotation", "workflow_state", "transaction_date", "base_grand_total", 0, "Quotation pipeline", "Quotation & SO Tracker", "Quoted value"],
              ["Sales Order", "status", "transaction_date", "base_grand_total", 1, "Sales orders booked", "Quotation & SO Tracker", "Order value"]],
    "procurement": [["Purchase Order", "status", "transaction_date", "base_grand_total", 1, "Purchase orders placed", "Pre-Procurement", "PO value"],
                    ["Purchase Receipt", "status", "posting_date", "base_grand_total", 1, "Goods received", "DN & GRN Tracker", "Received value"]],
    "finance": [["Sales Invoice", "status", "posting_date", "base_grand_total", 1, "Customer invoices", "Credit Controller", "Invoiced value"],
                ["Purchase Invoice", "status", "posting_date", "base_grand_total", 1, "Supplier invoices", "Accounts Payable", "Supplier billing"]],
    "people": [["Employee", "status", "", "", 0, "Workforce", "Admin HR", ""],
               ["Leave Application", "status", "from_date", "", 0, "Leave applications", "Employee Vacation Tracker", ""]],
    "projects": [["DMS Technical Submittal", "status", "creation", "", 0, "Technical submittals", "DMS Technical Department", ""],
                 ["Task", "status", "creation", "", 0, "Project tasks", "Technical Department", ""]],
    "operations": [["Delivery Trip", "status", "departure_time", "", 0, "Delivery trips", "Logistics", ""],
                   ["Vehicle", "custom_vehicle_status", "", "", 0, "Fleet availability", "Fleet", ""]],
    "manufacturing": [["Work Order", "status", "planned_start_date", "", 0, "Work orders", "Manufacturing", ""],
                      ["Factory Job Order", "jo_status", "start_date", "", 0, "Factory job orders", "Manufacturing", ""]],
    "it": [["IT Help Desk Request", "status", "creation", "", 0, "IT help-desk requests", "IT Platforms Expiry", ""],
           ["Asset Acquisition Records", "approval_status", "creation", "", 0, "Asset requests", "IT Asset Acquisition", ""]],
    "legal": [["Legal Case List", "legal_case_status", "creation", "", 0, "Legal cases", "Legal / Taradhi", ""],
              ["Document Record", "status", "creation", "", 0, "Controlled documents", "Document Control", ""]],
}
# meta.fields does not list standard columns, so their types are declared here.
EXEC_STD_TYPES = {"creation": "Datetime", "modified": "Datetime"}


def exec_months():
    out = []
    cursor = p_from[:7] + "-01"
    while cursor <= p_to:
        out.append(cursor[:7])
        cursor = str(frappe.utils.add_months(cursor, 1))[:10]
    return out


def exec_buckets(dt, mf, base, with_value):
    """Value sums need one query per company currency; counts-only sources use the normal company scope."""
    if not with_value or mf.get("company") != "Link":
        return [["", base, company_filter(dt, base)]]
    groups = {}
    for c in companies:
        if company and c.name != company:
            continue
        cur = c.default_currency or ""
        groups[cur] = (groups.get(cur) or []) + [c.name]
    return [[cur, base + [[dt, "company", "in", groups[cur]]], "company" if company else "all"] for cur in sorted(groups.keys())]


def exec_add(store, key_, cur, n, v):
    entry = store.get(key_) or {"label": key_, "count": 0, "values": {}}
    entry["count"] = entry["count"] + n
    if cur:
        entry["values"][cur] = (entry["values"].get(cur) or 0) + v
    store[key_] = entry


def executive_performance(dept):
    sections = []
    months = exec_months()
    for spec in EXECUTIVE_SOURCES.get(dept, []):
        dt = spec[0]
        sf = spec[1]
        df = spec[2]
        vf = spec[3]
        section = {"title": spec[5], "source": spec[6], "doctype": dt, "date_field": df, "value_label": spec[7], "state": "complete", "scope": "all"}
        try:
            mf = meta_fields(dt)
            dtype = EXEC_STD_TYPES.get(df) or ((mf or {}).get(df) if df else "")
            if mf is None:
                section.update({"state": "not_configured", "message": dt + " is not installed on this site."})
            elif sf not in mf or (df and dtype not in ["Date", "Datetime"]):
                section.update({"state": "not_configured", "message": "Required fields are not installed: " + ", ".join([f for f in [sf, df] if f and f not in mf and f not in EXEC_STD_TYPES]) + "."})
            else:
                if vf and mf.get(vf) not in ["Currency", "Float"]:
                    vf = ""
                base = [[dt, "docstatus", "=", 1]] if spec[4] else [[dt, "docstatus", "<", 2]]
                if df:
                    base.append([dt, df, "between", [p_from, p_to + " 23:59:59"] if dtype == "Datetime" else [p_from, p_to]])
                statuses = {}
                trend = {}
                totals = {}
                total = 0
                for b in exec_buckets(dt, mf, base, bool(vf)):
                    cur = b[0]
                    flt_ = b[1]
                    section["scope"] = b[2]
                    agg = ["count(name) as n"] + (["sum(" + vf + ") as v"] if vf else [])
                    for r in gl(dt, [sf] + agg, flt_, order_by=sf + " asc", group_by=sf, limit=500):
                        n = frappe.utils.cint(r.get("n"))
                        v = frappe.utils.flt(r.get("v")) if vf else 0
                        total = total + n
                        exec_add(statuses, str(r.get(sf) or "Not set"), cur, n, v)
                        if cur:
                            totals[cur] = (totals.get(cur) or 0) + v
                    if not df:
                        continue
                    if dtype == "Date":   # one row per day (period is at most 400 days), folded into months here
                        for r in gl(dt, [df] + agg, flt_, order_by=df + " asc", group_by=df, limit=500):
                            exec_add(trend, str(r.get(df) or "")[:7], cur, frappe.utils.cint(r.get("n")), frappe.utils.flt(r.get("v")) if vf else 0)
                    else:                 # datetime columns: one grouped-free aggregate per month
                        for m in months:
                            last = str(frappe.utils.get_last_day(m + "-01"))[:10]
                            lo = p_from if m == p_from[:7] else m + "-01"
                            hi = p_to if m == p_to[:7] else last
                            rows = gl(dt, agg, [x for x in flt_ if x[1] != df] + [[dt, df, "between", [lo, hi + " 23:59:59"]]], order_by="creation asc", limit=1)
                            if rows:
                                exec_add(trend, m, cur, frappe.utils.cint(rows[0].get("n")), frappe.utils.flt(rows[0].get("v")) if vf else 0)
                section.update({
                    "total": total, "values": totals, "currencies": sorted(totals.keys()),
                    "statuses": sorted(statuses.values(), key=lambda s: -s["count"]),
                    "trend": [trend.get(m) or {"label": m, "count": 0, "values": {}} for m in months] if df else [],
                })
        except Exception as e:
            classified = classify(e)
            section.update({"state": classified[0], "message": classified[1]})
        sections.append(section)
    perf(dept, "executive", {"sections": sections, "period": [p_from, p_to]})

def execute(with_perf):
    for spec in REGISTRY:
        if spec[1] and not want(spec[1]):
            continue
        run(spec[0], spec[1] or "all", spec[2], spec[3], spec[4], spec[5])
    if with_perf:
        for p in PERF:
            if want(p[0]):
                try:
                    p[1]()
                except Exception as e:
                    unpacked = classify(e)
                    st = unpacked[0]
                    msg = unpacked[1]
                    perf(p[0], "error", {"state": st, "message": msg})
    if with_perf and action == "department":
        executive_performance(dept_arg)
    # De-duplicate by stable key: a record/action pair counts once even if two sources raise it.
    seen = {}
    out = []
    for a in ACTIONS:
        k = a["key"]
        if k in seen:
            prev = seen[k]
            if (GROUP_RANK[a["group"]], SEV_RANK[a["severity"]]) < (GROUP_RANK[prev["group"]], SEV_RANK[prev["severity"]]):
                out[out.index(prev)] = a
                seen[k] = a
            continue
        seen[k] = a
        out.append(a)
    # Unavailable/restricted sources become data-verification rows so they are never silent zeros.
    for s in SOURCES:
        if s["state"] in ["restricted", "unavailable", "not_configured", "partial"] and s["key"] != "dmcc":
            out.append({"key": "source::" + s["key"], "source": s["key"], "doctype": ", ".join(s["doctypes"][:2]), "name": "", "type": "source_state",
                        "dept": s["dept"] if s["dept"] != "all" else "overview", "group": "verification", "severity": "verify",
                        "title": s["label"] + " — " + s["state"].replace("_", " "), "reason": s["message"] or "", "owner": "", "owner_basis": "unassigned", "unowned": 0,
                        "due": "", "due_basis": "", "overdue_days": None, "age_days": None, "amount": None, "currency": None, "amount_basis": "",
                        "company": "", "status": s["state"], "list": None, "bundle": 0, "extra": {}})
    for c in CHECKS:
        out.append({"key": "check::" + c["source"] + "::" + c["label"], "source": c["source"], "doctype": "", "name": "", "type": "data_check", "dept": c["dept"],
                    "group": "verification", "severity": "verify", "title": c["label"], "reason": c["detail"], "owner": "", "owner_basis": "unassigned", "unowned": 0,
                    "due": "", "due_basis": "", "overdue_days": None, "age_days": None, "amount": None, "currency": None, "amount_basis": "",
                    "company": "", "status": "Data check", "list": c["list"], "bundle": c["count"] or 0, "extra": {"count": c["count"]}})
    out.sort(key=lambda a: (GROUP_RANK[a["group"]], SEV_RANK[a["severity"]], -(a["overdue_days"] or 0), a["due"] or "9999", -(a["age_days"] or 0)))
    return out


def summarize(rows):
    def blank():
        return {"decision": 0, "escalation": 0, "followup": 0, "verification": 0, "critical": 0, "overdue": 0, "due_soon": 0, "unowned": 0, "oldest_due": "", "items": 0}
    matrix = {}
    for d in DEPT_KEYS + ["overview"]:
        matrix[d] = blank()
    total = blank()
    for a in rows:
        n = a["bundle"] if (a["bundle"] and a["group"] != "verification") else 1
        for m in [matrix.setdefault(a["dept"], blank()), total]:
            m[a["group"]] = m[a["group"]] + 1
            m["items"] = m["items"] + n
            if a["severity"] == "critical":
                m["critical"] = m["critical"] + 1
            if a["overdue_days"]:
                m["overdue"] = m["overdue"] + 1
                if a["due"] and (not m["oldest_due"] or a["due"] < m["oldest_due"]):
                    m["oldest_due"] = a["due"]
            if a["due"] and today <= a["due"] <= horizon:
                m["due_soon"] = m["due_soon"] + 1
            if a["unowned"] and a["group"] in ["escalation", "followup"]:
                m["unowned"] = m["unowned"] + 1
    return total, matrix


def health(rows_sources):
    states = {}
    for s in rows_sources:
        states[s["state"]] = states.get(s["state"], 0) + 1
    return {"sources": rows_sources, "counts": states}


def page_of(rows, page, size):
    start = page * size
    return rows[start:start + size]


def respond(payload):
    out = dict(base_meta)
    out.update(payload)
    frappe.response["message"] = out


base_meta = {"api_version": API_VERSION, "policy": POLICY, "retrieved": now_s, "today": today, "window": window, "horizon": horizon,
             "company": company, "currency": company_currency.get(company) if company else None, "period": [p_from, p_to], "user": user,
             "user_name": user_name(user)}

if action == "bootstrap":
    respond({
        "companies": [{"name": c.name, "currency": c.default_currency, "abbr": c.abbr} for c in companies],
        "departments": [{"key": d[0], "label": d[1], "dashboards": [{"label": x[0], "route": "/app/" + x[1]} for x in DASHBOARDS.get(d[0], [])]} for d in DEPTS],
        "groups": GROUPS, "roles": [r for r in user_roles if r in VIEW_ROLES or r in ["CEO", "Final Approver", "Executive Manager"]],
    })
elif action == "approvals":
    unpacked = build_approvals()
    appr = unpacked[0]
    problems = unpacked[1]
    respond({"items": appr, "summary": approval_summary(appr), "policy_approvals": APPROVAL_POLICY, "categories": CAT_LABEL,
             "problems": problems, "user_roles": [r for r in user_roles if r in ["CEO", "Final Approver", "Executive Manager"]]})
elif action == "approval_detail":
    respond(approval_detail(fd.get("doctype") or "", fd.get("name") or ""))
elif action == "drilldown":
    dt = fd.get("doctype") or ""
    name = fd.get("name") or ""
    if not dt or not name or meta_fields(dt) is None:
        frappe.throw("Unknown record.")
    mf = meta_fields(dt)
    fields = ["name", "owner", "creation", "modified", "modified_by", "docstatus", "_assign"]
    for f in ["workflow_state", "status", "company", "customer", "supplier", "employee", "project", "sales_order", "purchase_order", "remarks"]:
        if f in mf and mf[f] not in ["Table", "Table MultiSelect"]:
            fields.append(f)
    rows = gl(dt, fields, [[dt, "name", "=", name]], limit=1)
    if not rows:
        frappe.throw("Record not found or not readable.")
    r = rows[0]
    todos = gl("ToDo", ["allocated_to", "date", "status", "description"], [["reference_type", "=", dt], ["reference_name", "=", name], ["status", "=", "Open"]], limit=10)
    related = []
    for f in ["customer", "supplier", "employee", "project", "sales_order", "purchase_order"]:
        if r.get(f) and f in mf:
            related.append({"label": f.replace("_", " ").title(), "value": r.get(f), "doctype": META_OPTS.get(dt + "." + f) if mf[f] == "Link" else ""})
    respond({
        "doctype": dt, "name": name, "fields": {k: (str(r.get(k)) if r.get(k) is not None else "") for k in fields if k != "_assign"},
        "assigned": [{"user": u, "name": user_name(u)} for u in assigned(r)],
        "todos": [{"user": user_name(t.allocated_to), "date": dstr(t.date), "description": str(t.description or "")[:300]} for t in todos],
        "related": related, "created_by": user_name(r.owner), "modified_by": user_name(r.modified_by),
    })
else:
    rows = execute(action in ["overview", "department"])
    unpacked = summarize(rows)
    total = unpacked[0]
    matrix = unpacked[1]
    if action == "source_health":
        respond(health(SOURCES))
    elif action == "actions":
        grp = fd.get("group") or ""
        sev = fd.get("severity") or ""
        q = (fd.get("q") or "").strip().lower()[:80]
        sel = [a for a in rows if (not grp or a["group"] == grp) and (not sev or a["severity"] == sev or (sev == "unowned" and a["unowned"]))]
        if q:
            sel = [a for a in sel if q in (a["title"] + " " + a["owner"] + " " + a["name"] + " " + a["doctype"] + " " + a["reason"]).lower()]
        size = min(max(frappe.utils.cint(fd.get("page_size") or 25), 5), 100)
        page = max(frappe.utils.cint(fd.get("page") or 0), 0)
        respond({"total": len(sel), "page": page, "page_size": size, "rows": page_of(sel, page, size)})
    else:
        UPCOMING.sort(key=lambda u: (u["date"], u["title"]))
        payload = {"totals": total, "matrix": matrix, "upcoming": UPCOMING[:200], "upcoming_total": len(UPCOMING), "sources": SOURCES,
                   "indicators": INDICATORS, "performance": PERFORMANCE, "workflow": WF_STATE}
        if action == "overview":
            top = {}
            for g in GROUPS:
                top[g] = [a for a in rows if a["group"] == g][:12]
            payload["top"] = top
            payload["counts_by_group"] = {g: len([a for a in rows if a["group"] == g]) for g in GROUPS}
        else:
            payload["rows"] = rows[:1500]
            payload["row_total"] = len(rows)
            payload["department"] = dept_arg
            payload["dashboards"] = [{"label": x[0], "route": "/app/" + x[1]} for x in DASHBOARDS.get(dept_arg, [])]
        respond(payload)
