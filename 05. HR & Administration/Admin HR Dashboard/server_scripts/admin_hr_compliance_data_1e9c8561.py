# Admin & HR Dashboard - Documents & Compliance API (Server Script, API method: admin_hr_compliance_data)
# READ-ONLY. Login required. Never writes to Employee or any other record.
# Tiers: HR Manager / HR User -> employee-level rows ("detail");
#        System Manager / IT Coordinator without an HR role -> counts and charts only ("aggregate").
# Employee data is read only with frappe.get_list (DocType permissions + Employee User Permissions).
# frappe.get_all is used only for the caller's own roles and Company names.
# ID / Iqama / passport NUMBERS are read only to detect duplicates; they are never returned.
# Attachments are reported only as attached / not attached (no file URLs). No bank, salary or medical details.
#
# Document rules (Active employees only):
#   Iqama / Saudi ID : expiry_date                       (all employees)
#   Passport         : passport_expiry_date, vs valid_upto (non-Saudi only; Saudi = not required)
#   Contract         : agreement_expiry_date, vs contract_end_date
#   Insurance        : insurance_expiry_date, vs insurance_status
# Status from the PRIMARY date only: expired (<0 days) | due_30 (0-30) | due_60 (31-60) | due_90 (61-90) | valid (>90) | missing
# modes: summary (default) | list | detail

ALLOWED_ROLES = ["System Manager", "HR Manager", "HR User", "IT Coordinator","Dashboard Manager"]
DETAIL_ROLES = ["HR Manager", "HR User","Dashboard Manager"]
DEFAULT_COMPANY = "Durar Masagh Trading Company"
U = frappe.utils

user = frappe.session.user
role_rows = frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, fields=["role"])
disabled_roles = [x.get("name") for x in frappe.get_all("Role", filters={"disabled": 1}, fields=["name"])]
roles = [x.get("role") for x in role_rows if x.get("role") not in disabled_roles]
if user == "Administrator":
    roles = roles + ALLOWED_ROLES
if user == "Guest" or len([r for r in roles if r in ALLOWED_ROLES]) == 0:
    frappe.throw("Not permitted.", title="Not Permitted")
detail = len([r for r in roles if r in DETAIL_ROLES]) > 0
fd = frappe.form_dict
if detail and fd.get("preview_tier") == "aggregate":
    detail = False
mode = fd.get("mode") or "summary"
if mode not in ["summary", "list", "detail"]:
    frappe.throw("Invalid mode.")
if mode != "summary" and not detail:
    frappe.throw("Employee-level compliance data is restricted to HR Manager / HR User.", title="Restricted")

today = U.getdate(U.nowdate())
REAL_TODAY = today
if fd.get("as_of"):
    try:
        ao = U.getdate(fd.get("as_of"))
    except Exception:
        frappe.throw("Invalid date.")
    if str(ao) < "2000-01-01" or U.date_diff(ao, today) > 1100:
        frappe.throw("As-of date out of range.")
    today = ao
today_s = str(today)
companies = [c.get("name") for c in frappe.get_all("Company", fields=["name"], order_by="name asc")]
company = fd.get("company") or DEFAULT_COMPANY
if company != "All" and company not in companies:
    frappe.throw("Company not found.", title="Not Permitted")
cfilter = [] if company == "All" else [["company", "=", company]]

# ---- Phase 8: global dashboard filters (applied to the employee's current Employee record) ----
GF = {"department": fd.get("g_department") or "", "branch": fd.get("g_branch") or "", "custom_job_location": fd.get("g_job_location") or ""}
GF_ON = len([k for k in GF if GF[k]]) > 0
GF_FILTERS = [([k, "is", "not set"] if GF[k] == "(Not set)" else [k, "=", GF[k]]) for k in GF if GF[k]]


# ---- Phase 8: small-group privacy for the aggregate tier ----
SUPPRESS_MIN = 3
NUMK = ["count", "open", "overdue", "expired", "due", "total", "done", "days", "headcount", "assigned", "mand_open", "per_head", "pct", "avg", "timed", "closed", "paid", "lwp"]


# Phase 9.1: role-based read pre-check (frappe.has_permission is not exposed to Server Scripts on this site).
# Mirrors Frappe's DocType-level rule: Custom DocPerm replaces DocPerm when present; permlevel 0 "read" for one of the caller's roles.
# It only decides whether to attempt the query; frappe.get_list still enforces all permissions and User Permissions.
PERM_CACHE = {}


def can_read(dt):
    if dt in PERM_CACHE:
        return PERM_CACHE[dt]
    u = frappe.session.user
    if u == "Administrator":
        PERM_CACHE[dt] = True
        return True
    my_roles = [x.get("role") for x in frappe.get_all("Has Role", filters={"parent": u, "parenttype": "User"}, fields=["role"])] + ["All"]
    tbl = "Custom DocPerm" if frappe.get_all("Custom DocPerm", filters={"parent": dt}, fields=["name"], limit_page_length=1) else "DocPerm"
    ok = len(frappe.get_all(tbl, filters=[["parent", "=", dt], ["permlevel", "=", 0], ["read", "=", 1], ["role", "in", my_roles]], fields=["name"], limit_page_length=1)) > 0
    PERM_CACHE[dt] = ok
    return ok


def suppress(o):
    if isinstance(o, dict):
        for k in list(o.keys()):
            o[k] = suppress(o[k])
        return o
    if isinstance(o, list):
        for it in o:
            if isinstance(it, dict) and ("label" in it) and not ("key" in it or "severity" in it or "month" in it or "date" in it):
                small = False
                for k in ["count", "total", "headcount"]:
                    v = it.get(k)
                    if v is not None and isinstance(v, (int, float)) and 0 < v < SUPPRESS_MIN:
                        small = True
                if small:
                    for k in NUMK:
                        if k in it:
                            it[k] = None
                    it["suppressed"] = 1
            else:
                suppress(it)
        return o
    return o


def small_scope_guard(n):
    if not detail and GF_ON and n < 5:
        frappe.throw("Fewer than 5 employees match these filters. Aggregate figures are not shown for groups this small.", title="Too few employees")


DOCS = [["iqama", "Iqama / Saudi ID", "expiry_date", None, "attach_iqama_copy"],
        ["passport", "Passport", "passport_expiry_date", "valid_upto", "passport_copy"],
        ["contract", "Employment Contract", "agreement_expiry_date", "contract_end_date", "attch_contract_copy"],
        ["insurance", "Medical Insurance", "insurance_expiry_date", None, "attach_medical"]]
DOC_LABEL = {}
for dd in DOCS:
    DOC_LABEL[dd[0]] = dd[1]
STATUS_LABEL = {"expired": "Expired", "due_30": "Expiring ≤30 days", "due_60": "Expiring 31–60 days", "due_90": "Expiring 61–90 days",
                "valid": "Valid (>90 days)", "missing": "Missing expiry date", "not_required": "Not required"}
ISSUE_STATUSES = ["expired", "due_30", "due_60", "missing"]

BASE_FIELDS = ["name", "employee_name", "company", "department", "branch", "custom_job_location", "custom_nationality",
               "date_of_joining", "expiry_date", "passport_expiry_date", "valid_upto", "agreement_expiry_date", "contract_end_date",
               "insurance_expiry_date", "insurance_status", "insurance_company", "health_insurance_provider",
               "attach_iqama_copy", "passport_copy", "attch_contract_copy", "attach_medical"]
ID_FIELDS = ["passport_number", "custom_saudi_id", "iqama__visa_number", "passport_no"]


def status_of(v):
    if not v:
        return ["missing", None]
    d = U.date_diff(v, today)
    if d < 0:
        return ["expired", d]
    if d <= 30:
        return ["due_30", d]
    if d <= 60:
        return ["due_60", d]
    if d <= 90:
        return ["due_90", d]
    return ["valid", d]


def yr(v):
    return int(str(v)[:4]) if v else None


def build_docs(emps):
    out = []
    for e in emps:
        saudi = e.get("custom_nationality") == "Saudi Arabia"
        for dd in DOCS:
            key = dd[0]
            v = e.get(dd[2])
            v2 = e.get(dd[3]) if dd[3] else None
            if key == "passport" and saudi and not v:
                st = ["not_required", None]
            else:
                st = status_of(v)
            conflicts = []
            unusual = []
            if dd[3]:
                if v and v2 and str(v) != str(v2):
                    conflicts.append(dd[3] + " differs (" + str(v2) + ")")
                elif v2 and not v:
                    conflicts.append("Only " + dd[3] + " is set (" + str(v2) + ")")
            if key == "insurance":
                ist = e.get("insurance_status") or ""
                if ist == "Valid" and st[0] == "expired":
                    conflicts.append("insurance_status says Valid but the date has passed")
                if ist == "Expired" and st[0] in ["due_30", "due_60", "due_90", "valid"]:
                    conflicts.append("insurance_status says Expired but the date is in the future")
            if v:
                y = yr(v)
                if y < 2000 or y > 2045:
                    unusual.append("Year " + str(y) + " is outside 2000–2045")
                if key in ["iqama", "contract", "insurance"] and e.get("date_of_joining") and str(v) < str(e.get("date_of_joining")):
                    unusual.append("Expiry is before the date of joining (" + str(e.get("date_of_joining")) + ")")
                if key == "iqama" and not saudi and st[1] is not None and st[1] > 730:
                    unusual.append("Iqama expiry more than 2 years ahead - verify (Iqama is normally renewed yearly)")
                if key == "passport" and st[1] is not None and st[1] > 3653:
                    unusual.append("Passport expiry more than 10 years ahead")
            out.append({"employee": e.get("name"), "employee_name": e.get("employee_name"), "company": e.get("company"),
                        "department": e.get("department"), "branch": e.get("branch"), "job_location": e.get("custom_job_location"),
                        "doc": key, "document": dd[1], "expiry_date": str(v) if v else "", "days": st[1], "status": st[0],
                        "status_label": STATUS_LABEL[st[0]], "conflict": "; ".join(conflicts), "unusual": "; ".join(unusual),
                        "attached": 1 if e.get(dd[4]) else 0})
    return out


def employees(with_ids):
    f = BASE_FIELDS + (ID_FIELDS if with_ids else [])
    try:
        return frappe.get_list("Employee", filters=[["status", "=", "Active"]] + cfilter + GF_FILTERS, fields=f, order_by="name asc", limit_page_length=0)
    except Exception as e:
        frappe.throw("Employee records are not readable with your permissions.", title="Not Permitted")


def norm(v):
    return "".join(str(v or "").split()).upper()


def dq_sets(emps, docs):
    S = {"passport_conflict": [], "contract_conflict": [], "ins_valid_expired": [], "ins_expired_future": [], "missing": [],
         "unusual": [], "dup_id_across": [], "dup_id_fields": [], "provider_mismatch": []}
    for r in docs:
        if r["doc"] == "passport" and r["conflict"]:
            S["passport_conflict"].append([r, r["conflict"]])
        if r["doc"] == "contract" and r["conflict"]:
            S["contract_conflict"].append([r, r["conflict"]])
        if r["doc"] == "insurance" and "says Valid" in r["conflict"]:
            S["ins_valid_expired"].append([r, r["conflict"]])
        if r["doc"] == "insurance" and "says Expired" in r["conflict"]:
            S["ins_expired_future"].append([r, r["conflict"]])
        if r["status"] == "missing":
            S["missing"].append([r, r["document"] + " expiry date is empty"])
        if r["unusual"]:
            S["unusual"].append([r, r["unusual"]])
    # duplicate ID numbers across employees (values never returned)
    byid = {}
    for e in emps:
        seen = {}
        for f in ID_FIELDS:
            v = norm(e.get(f))
            if v and len(v) > 3 and not seen.get(v):
                seen[v] = 1
                byid[v] = (byid.get(v) or []) + [e.get("name")]
    dup_emp = {}
    for k in byid:
        if len(byid[k]) > 1:
            for n in byid[k]:
                dup_emp[n] = len(byid[k])
    first_doc = {}
    for r in docs:
        if r["doc"] == "iqama":
            first_doc[r["employee"]] = r
    for n in dup_emp:
        if first_doc.get(n):
            S["dup_id_across"].append([first_doc[n], "An ID / passport number on this employee is also recorded on another employee"])
    for e in emps:
        vals = [norm(e.get(f)) for f in ["passport_number", "custom_saudi_id", "iqama__visa_number"]]
        vals = [v for v in vals if v]
        uniq = {}
        for v in vals:
            uniq[v] = 1
        r = first_doc.get(e.get("name"))
        if r and len(vals) > 1 and len(uniq) == 1:
            S["dup_id_fields"].append([r, "Same Iqama / ID number entered in " + str(len(vals)) + " fields (IQAMA Number, Saudi ID / Iqama Number, Iqama Visa Number)"])
        elif r and len(uniq) > 1:
            S["dup_id_fields"].append([r, "Iqama / ID number fields hold different values"])
        ic = (e.get("insurance_company") or "").strip().lower()
        hp = (e.get("health_insurance_provider") or "").strip().lower()
        ins = [x for x in docs if x["employee"] == e.get("name") and x["doc"] == "insurance"]
        if ic and hp and ic != hp and ins:
            S["provider_mismatch"].append([ins[0], "insurance_company and health_insurance_provider hold different text"])
    return S


DQ_LABELS = [["passport_conflict", "Passport expiry conflicts (passport_expiry_date vs valid_upto)", "high"],
             ["contract_conflict", "Contract expiry conflicts (agreement_expiry_date vs contract_end_date)", "high"],
             ["ins_valid_expired", "Insurance marked Valid but already expired", "high"],
             ["ins_expired_future", "Insurance marked Expired but date in the future", "medium"],
             ["missing", "Missing expiry dates (required documents)", "high"],
             ["unusual", "Unusual or invalid expiry dates", "medium"],
             ["dup_id_across", "Same ID / passport number on more than one employee", "high"],
             ["dup_id_fields", "Iqama / ID number duplicated across fields", "low"],
             ["provider_mismatch", "Insurance provider fields hold different text", "low"]]


def emp_issues(docs):
    m = {}
    for r in docs:
        k = r["employee"]
        cur = m.get(k) or {"issues": 0, "expired": 0, "due": 0, "missing": 0, "conflict": 0}
        bad = False
        if r["status"] == "expired":
            cur["expired"] = cur["expired"] + 1
            bad = True
        if r["status"] in ["due_30", "due_60"]:
            cur["due"] = cur["due"] + 1
            bad = True
        if r["status"] == "missing":
            cur["missing"] = cur["missing"] + 1
            bad = True
        if r["conflict"]:
            cur["conflict"] = cur["conflict"] + 1
            bad = True
        if bad:
            cur["issues"] = cur["issues"] + 1
        m[k] = cur
    return m


# ======================================================================= SUMMARY
if mode == "summary":
    emps = employees(True)
    small_scope_guard(len(emps))
    docs = build_docs(emps)
    req = [r for r in docs if r["status"] != "not_required"]
    EM = emp_issues(docs)

    def cnt(rows, sts):
        return len([r for r in rows if r["status"] in sts])

    def ecnt(rows, sts):
        d = {}
        for r in rows:
            if r["status"] in sts:
                d[r["employee"]] = 1
        return len(d)

    def kpi(key, label, value, emp_value, sub, basis, preset, unit):
        return {"key": key, "label": label, "value": value, "employees": emp_value, "sub": sub, "basis": basis,
                "unit": unit, "preset": preset if detail else None}

    n_issue_emp = len([k for k in EM if EM[k]["issues"] > 0])
    conf_docs = [r for r in req if r["conflict"]]
    kpis = [
        kpi("active", "Total Active Employees", len(emps), len(emps), str(len(req)) + " required documents tracked (" + str(len(docs) - len(req)) + " Saudi passports not required)",
            "Employee.status = Active in the selected company.", None, "employees"),
        kpi("valid", "Valid Documents", cnt(req, ["valid"]), ecnt(req, ["valid"]), "more than 90 days remaining",
            "Primary expiry date more than 90 days after today.", "st_valid", "documents"),
        kpi("expired", "Expired Documents", cnt(req, ["expired"]), ecnt(req, ["expired"]), "expiry date before today",
            "Primary expiry date earlier than today.", "st_expired", "documents"),
        kpi("d30", "Expiring Within 30 Days", cnt(req, ["due_30"]), ecnt(req, ["due_30"]), "0–30 days (today counts as due, not expired)",
            "0 to 30 days remaining.", "st_due_30", "documents"),
        kpi("d60", "Expiring Within 60 Days", cnt(req, ["due_30", "due_60"]), ecnt(req, ["due_30", "due_60"]), str(cnt(req, ["due_60"])) + " in 31–60 days + " + str(cnt(req, ["due_30"])) + " within 30",
            "0 to 60 days remaining (cumulative, includes the 30-day window).", "st_le60", "documents"),
        kpi("d90", "Expiring Within 90 Days", cnt(req, ["due_30", "due_60", "due_90"]), ecnt(req, ["due_30", "due_60", "due_90"]), str(cnt(req, ["due_90"])) + " in 61–90 days",
            "0 to 90 days remaining (cumulative).", "st_le90", "documents"),
        kpi("missing", "Missing Expiry Information", cnt(req, ["missing"]), ecnt(req, ["missing"]), "required documents with no primary expiry date",
            "Empty primary date. Saudi passports are not required and not counted.", "st_missing", "documents"),
        kpi("issues", "Employees with Compliance Issues", n_issue_emp, n_issue_emp,
            str(len([k for k in EM if EM[k]["issues"] > 1])) + " with 2+ documents affected · each employee counted once",
            "Distinct active employees with at least one document expired, expiring within 60 days, missing, or conflicting.", "emp_issues", "employees"),
    ]
    identity = {"documents": len(req), "valid": cnt(req, ["valid"]), "expired": cnt(req, ["expired"]), "within_90": cnt(req, ["due_30", "due_60", "due_90"]),
                "missing": cnt(req, ["missing"])}
    identity["check"] = identity["valid"] + identity["expired"] + identity["within_90"] + identity["missing"] == identity["documents"]

    cats = []
    for dd in DOCS:
        rr = [r for r in docs if r["doc"] == dd[0]]
        cats.append({"key": dd[0], "label": dd[1], "field": dd[2], "secondary": dd[3],
                     "valid": cnt(rr, ["valid"]), "expired": cnt(rr, ["expired"]), "due_30": cnt(rr, ["due_30"]), "due_60": cnt(rr, ["due_60"]),
                     "due_90": cnt(rr, ["due_90"]), "missing": cnt(rr, ["missing"]), "not_required": cnt(rr, ["not_required"]),
                     "conflict": len([r for r in rr if r["conflict"]]), "attached": len([r for r in rr if r["attached"]]), "total": len(rr),
                     "required": len([r for r in rr if r["status"] != "not_required"]),
                     "completion_pct": round(100.0 * len([r for r in rr if r["status"] in ["valid", "due_30", "due_60", "due_90"] and not r["conflict"]]) /
                                             max(1, len([r for r in rr if r["status"] != "not_required"])), 1)})

    # forecast: next 12 months by category, plus already expired
    months = []
    m0 = U.getdate(today_s[:7] + "-01")
    i = 0
    while i < 12:
        months.append(str(U.add_months(m0, i))[:7])
        i = i + 1
    fc = []
    for m in months:
        row = {"month": m}
        for dd in DOCS:
            row[dd[0]] = len([r for r in req if r["doc"] == dd[0] and r["expiry_date"][:7] == m and r["status"] != "expired"])
        fc.append(row)

    def group(field):
        g = {}
        for r in req:
            if r["status"] in ["expired", "due_30", "due_60", "due_90"]:
                k = r[field] or "(Not set)"
                cur = g.get(k) or {"label": k, "expired": 0, "due": 0, "count": 0}
                if r["status"] == "expired":
                    cur["expired"] = cur["expired"] + 1
                else:
                    cur["due"] = cur["due"] + 1
                cur["count"] = cur["count"] + 1
                g[k] = cur
        return sorted([g[k] for k in g], key=lambda x: -x["count"])

    dist = [{"key": s, "label": STATUS_LABEL[s], "count": cnt(docs, [s])} for s in ["valid", "due_90", "due_60", "due_30", "expired", "missing", "not_required"]]
    multi = {}
    for k in EM:
        n = EM[k]["issues"]
        lab = "0" if n == 0 else ("1" if n == 1 else ("2" if n == 2 else "3+"))
        multi[lab] = multi.get(lab, 0) + 1
    ok_docs = len([r for r in req if r["status"] in ["valid", "due_30", "due_60", "due_90"] and not r["conflict"]])
    analytics = {"forecast": fc, "overdue_now": cnt(req, ["expired"]), "by_department": group("department"), "by_branch": group("branch"),
                 "by_location": group("job_location"), "distribution": dist,
                 "completion": {"documents_pct": round(100.0 * ok_docs / max(1, len(req)), 1), "documents_ok": ok_docs, "documents": len(req),
                                "employees_pct": round(100.0 * (len(emps) - n_issue_emp) / max(1, len(emps)), 1),
                                "employees_ok": len(emps) - n_issue_emp, "employees": len(emps)},
                 "multi_issue": [{"label": l, "count": multi.get(l, 0)} for l in ["0", "1", "2", "3+"]]}

    # alert threshold preview (Step 8): documents per window, by category
    win = [["expired", None, -1], ["d0_7", 0, 7], ["d8_15", 8, 15], ["d16_30", 16, 30], ["d31_60", 31, 60], ["d61_90", 61, 90]]
    alerts = []
    for dd in DOCS:
        rr = [r for r in req if r["doc"] == dd[0]]
        row = {"label": dd[1]}
        for w in win:
            if w[0] == "expired":
                row[w[0]] = len([r for r in rr if r["status"] == "expired"])
            else:
                row[w[0]] = len([r for r in rr if r["days"] is not None and w[1] <= r["days"] <= w[2]])
        alerts.append(row)
    for w in [["d90", 90], ["d60", 60], ["d30", 30], ["d15", 15], ["d7", 7]]:
        for a_ in alerts:
            a_["exact_" + w[0]] = len([r for r in req if r["document"] == a_["label"] and r["days"] == w[1]])

    # existing expiry notifications (configuration only)
    notifs = frappe.get_all("Notification", filters=[["document_type", "=", "Employee"], ["event", "in", ["Days Before", "Days After"]]],
                            fields=["name", "enabled", "days_in_advance", "date_changed", "channel", "event", "condition"])
    nrec = {}
    if notifs:
        for x in frappe.get_all("Notification Recipient", filters=[["parent", "in", [n.get("name") for n in notifs]]],
                                fields=["parent", "receiver_by_role", "receiver_by_document_field", "cc"]):
            t = ("role: " + x.get("receiver_by_role")) if x.get("receiver_by_role") else (("employee field: " + x.get("receiver_by_document_field")) if x.get("receiver_by_document_field") else "fixed address")
            nrec[x.get("parent")] = (nrec.get(x.get("parent")) or []) + [t + (" + cc" if x.get("cc") else "")]
    notifications = [{"name": n.get("name"), "enabled": n.get("enabled"), "event": n.get("event"), "days": n.get("days_in_advance"),
                      "field": n.get("date_changed"), "channel": n.get("channel"), "has_condition": 1 if n.get("condition") else 0,
                      "recipients": ", ".join(nrec.get(n.get("name")) or [])} for n in notifs]

    S = dq_sets(emps, docs)
    dq = [{"key": d_[0], "label": d_[1], "severity": d_[2], "count": len(S[d_[0]]), "preset": ("dq_" + d_[0]) if detail else None} for d_ in DQ_LABELS]
    res = {"meta": {"tier": "detail" if detail else "aggregate", "company": company, "companies": companies, "today": today_s,
                    "generated": str(U.now_datetime())[:19]},
           "kpis": kpis, "identity": identity, "categories": cats, "analytics": analytics, "dq": dq, "alerts": alerts, "notifications": notifications,
           "rules": {"buckets": "expired <0 · ≤30 = 0–30 · 31–60 · 61–90 · valid >90 days (from the primary date only)",
                     "passport": "Primary passport_expiry_date; valid_upto only compared. Saudi nationals: passport not required.",
                     "contract": "Primary agreement_expiry_date (Qiwa); contract_end_date only compared.",
                     "insurance": "Primary insurance_expiry_date; insurance_status only compared.",
                     "iqama": "expiry_date (Iqama for non-Saudi, Saudi ID for Saudi)."}}
    if detail:
        opts = {}
        for f in ["department", "branch", "job_location"]:
            opts[f] = sorted(list(dict([(e.get("custom_job_location" if f == "job_location" else f) or "(Not set)", 1) for e in emps]).keys()))
        res["options"] = opts
    res["meta"]["as_of"] = today_s
    res["meta"]["filters"] = {"department": GF["department"], "branch": GF["branch"], "job_location": GF["custom_job_location"]}
    if not detail:
        res = suppress(res)
    frappe.response["message"] = res

# ======================================================================= LIST
elif mode == "list":
    preset = fd.get("preset") or ""
    PRESETS = ["", "st_valid", "st_expired", "st_due_30", "st_le60", "st_le90", "st_missing", "emp_issues", "attention", "multi"] + ["dq_" + d_[0] for d_ in DQ_LABELS]
    if preset not in PRESETS:
        frappe.throw("Invalid preset.")
    emps = employees(preset in ["dq_dup_id_across", "dq_dup_id_fields", "dq_provider_mismatch"])
    docs = build_docs(emps)
    sel = [r for r in docs if r["status"] != "not_required"]
    if fd.get("include_not_required") == "1" or fd.get("status") == "conflict":
        sel = docs
    PMAP = {"st_valid": ["valid"], "st_expired": ["expired"], "st_due_30": ["due_30"], "st_le60": ["due_30", "due_60"],
            "st_le90": ["due_30", "due_60", "due_90"], "st_missing": ["missing"], "attention": ["expired", "due_30", "due_60", "due_90"]}
    if PMAP.get(preset):
        sel = [r for r in sel if r["status"] in PMAP[preset]]
    elif preset in ["emp_issues", "multi"]:
        EM = emp_issues(docs)
        need = 1 if preset == "emp_issues" else 2
        sel = [r for r in sel if (EM.get(r["employee"]) or {}).get("issues", 0) >= need and (r["status"] in ISSUE_STATUSES or r["conflict"])]
    elif preset.startswith("dq_"):
        S = dq_sets(emps, docs)
        sel = []
        for x in S[preset[3:]]:
            r = dict(x[0])
            r["note"] = x[1]
            sel.append(r)
    for pair in [["department", "department"], ["branch", "branch"], ["job_location", "job_location"], ["doc", "doc"]]:
        v = fd.get(pair[0])
        if v:
            if v == "(Not set)":
                sel = [r for r in sel if not r[pair[1]]]
            else:
                sel = [r for r in sel if r[pair[1]] == v]
    stf = fd.get("status") or ""
    if stf:
        if stf == "conflict":
            sel = [r for r in sel if r["conflict"]]
        elif stf in STATUS_LABEL:
            sel = [r for r in sel if r["status"] == stf]
        else:
            frappe.throw("Invalid status.")
    rf = fd.get("range_from")
    rt = fd.get("range_to")
    if rf or rt:
        try:
            rf = str(U.getdate(rf)) if rf else "0000-00-00"
            rt = str(U.getdate(rt)) if rt else "9999-12-31"
        except Exception:
            frappe.throw("Invalid date.")
        sel = [r for r in sel if r["expiry_date"] and rf <= r["expiry_date"] <= rt]
    search = (fd.get("search") or "").strip()[:60].lower()
    if search:
        sel = [r for r in sel if search in (r["employee"] or "").lower() or search in (r["employee_name"] or "").lower()]
    SORTABLE = ["employee", "employee_name", "company", "department", "branch", "job_location", "document", "expiry_date", "days", "status"]
    sort_by = fd.get("sort_by") or "days"
    if sort_by not in SORTABLE:
        sort_by = "days"
    desc = fd.get("sort_order") == "desc"
    if sort_by == "days":
        has = [r for r in sel if r["days"] is not None]
        nonev = [r for r in sel if r["days"] is None]
        sel = sorted(has, key=lambda r: (r["days"], r["employee"]), reverse=desc) + nonev
    elif sort_by == "status":
        ORDER = {"expired": 0, "due_30": 1, "due_60": 2, "due_90": 3, "missing": 4, "valid": 5, "not_required": 6}
        sel = sorted(sel, key=lambda r: (ORDER.get(r["status"], 9), r["days"] if r["days"] is not None else 99999, r["employee"]), reverse=desc)
    else:
        sel = sorted(sel, key=lambda r: ((r[sort_by] or "").lower(), r["employee"], r["doc"]), reverse=desc)
    total = len(sel)
    emp_count = len(dict([(r["employee"], 1) for r in sel]))
    page_length = U.cint(fd.get("page_length")) or 25
    if page_length < 10:
        page_length = 10
    if page_length > 100:
        page_length = 100
    pages = int((total + page_length - 1) / page_length) if total else 1
    page = U.cint(fd.get("page")) or 1
    if page < 1:
        page = 1
    if page > pages:
        page = pages
    rows = sel[(page - 1) * page_length: page * page_length]
    out = [{"employee": r["employee"], "employee_name": r["employee_name"], "company": r["company"], "department": r["department"],
            "branch": r["branch"], "job_location": r["job_location"], "doc": r["doc"], "document": r["document"], "expiry_date": r["expiry_date"],
            "days": r["days"], "status": r["status"], "status_label": r["status_label"], "conflict": r["conflict"], "unusual": r["unusual"],
            "note": r.get("note") or ""} for r in rows]
    frappe.response["message"] = {"total": total, "employees": emp_count, "page": page, "pages": pages, "page_length": page_length,
                                  "rows": out, "sort_by": sort_by, "sort_order": "desc" if desc else "asc", "preset": preset, "company": company}

# ======================================================================= DETAIL
else:
    emp_id = (fd.get("employee") or "").strip()
    if not emp_id:
        frappe.throw("Employee is required.")
    try:
        e = frappe.get_list("Employee", filters={"name": emp_id}, fields=BASE_FIELDS + ["designation", "status", "employment_type",
                                                                                         "custom_contract_type", "medical_provided_by"], limit_page_length=1)
    except Exception:
        e = []
    if not e:
        frappe.throw("Employee not found or not permitted.", title="Not Permitted")
    e = e[0]
    docs = build_docs([e])
    for r in docs:
        dd = [x for x in DOCS if x[0] == r["doc"]][0]
        r["primary_field"] = dd[2]
        r["secondary_field"] = dd[3]
        r["secondary_value"] = str(e.get(dd[3]) or "") if dd[3] else ""
        if r["doc"] == "insurance":
            r["secondary_field"] = "insurance_status"
            r["secondary_value"] = e.get("insurance_status") or ""
            r["provider"] = e.get("insurance_company") or e.get("health_insurance_provider") or ""
            r["provided_by"] = e.get("medical_provided_by") or ""
        if r["doc"] == "contract":
            r["contract_type"] = e.get("custom_contract_type") or ""
        r["attached"] = "attached" if r["attached"] else "not attached"

    def safe(doctype, filters, fields, order_by):
        # Phase 9.1: skip DocTypes the caller cannot read, before querying, so no permission pop-up is raised.
        if not can_read(doctype):
            return None
        try:
            return frappe.get_list(doctype, filters=filters, fields=fields, order_by=order_by, limit_page_length=10)
        except Exception:
            return None

    qiwa = safe("Qiwa contract renewal request", [["emp_name", "=", emp_id]], ["name", "workflow_state", "docstatus", "contract_end_date", "creation"], "creation desc")
    ins = safe("Employee Health Insurance", {"name": e.get("health_insurance_provider")}, ["name"], "name asc") if e.get("health_insurance_provider") else []
    clr = safe("Employee Clearance", [["employee", "=", emp_id]], ["name", "docstatus", "creation"], "creation desc")
    res = safe("Resignation Letter", [["employee", "=", emp_id]], ["name", "workflow_state", "creation"], "creation desc")
    frappe.response["message"] = {
        "basic": {"employee": e.get("name"), "employee_name": e.get("employee_name"), "company": e.get("company"), "department": e.get("department"),
                  "designation": e.get("designation"), "branch": e.get("branch"), "job_location": e.get("custom_job_location"),
                  "nationality": e.get("custom_nationality"), "status": e.get("status"), "date_of_joining": str(e.get("date_of_joining") or ""),
                  "employment_type": e.get("employment_type")},
        "documents": docs,
        "renewals": {"qiwa": [{"name": q.get("name"), "state": q.get("workflow_state") or ["Draft", "Submitted", "Cancelled"][q.get("docstatus") or 0],
                               "contract_end_date": str(q.get("contract_end_date") or ""), "created": str(q.get("creation"))[:10]} for q in (qiwa or [])] if qiwa is not None else None,
                     "note": "Only Qiwa contract renewal requests exist as a renewal workflow. No Iqama, passport or insurance renewal DocType was found."},
        "related": {"health_insurance_provider": e.get("health_insurance_provider") if ins else None,
                    "clearance": [{"name": x.get("name"), "state": ["Draft", "Submitted", "Cancelled"][x.get("docstatus") or 0]} for x in (clr or [])] if clr is not None else None,
                    "resignation": [{"name": x.get("name"), "state": x.get("workflow_state") or ""} for x in (res or [])] if res is not None else None},
        "note": "Only expiry dates, status and attachment presence are shown. ID / Iqama / passport numbers, bank, salary and medical details and attachment files are never returned."}
