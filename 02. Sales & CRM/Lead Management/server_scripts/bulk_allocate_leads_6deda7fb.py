# ============================================================
# BULK ALLOCATE LEADS  (API Server Script)
# 2026-11-02: added server-side role authorization, input validation,
# eligible-salesperson validation and action=get_salespersons.
# Backup of previous version: "Bulk Allocate Leads BACKUP 2026-11-02"
# ============================================================

ALLOWED_ROLES = ["Lead Allocation Coordinator", "System Manager"]
SALES_ROLES = ["Sales User", "Salesman"]  # eligible to RECEIVE leads: either role

authorized = bool(frappe.get_all(
    "Has Role",
    filters={"parent": frappe.session.user, "parenttype": "User", "role": ["in", ALLOWED_ROLES]},
    fields=["name"],
    limit=1
))
if frappe.session.user == "Administrator":
    authorized = True
# My Leads self-service actions (prefix my_) have their own gate below and are scoped to the session user
if not authorized and not str(frappe.form_dict.get("action") or "").startswith("my_"):
    frappe.throw("You are not authorized to allocate leads.")


def eligible_salespersons(txt=None, start=0, page_len=0):
    # 2026-11-02 v3: eligible recipient = enabled User holding "Sales User" OR
    # "Salesman" (direct Has Role, or via the user's Role Profile), linked to
    # exactly ONE Active Employee (Lead Allocation.sales_person stores Employee ID).
    role_users = set([d.parent for d in frappe.get_all(
        "Has Role",
        filters={"role": ["in", SALES_ROLES], "parenttype": "User"},
        fields=["parent"],
        limit_page_length=0
    )])
    profiles = list(set([d.parent for d in frappe.get_all(
        "Has Role",
        filters={"role": ["in", SALES_ROLES], "parenttype": "Role Profile"},
        fields=["parent"],
        limit_page_length=0
    )]))
    if profiles:
        for u in frappe.get_all("User", filters={"role_profile_name": ["in", profiles]}, fields=["name"], limit_page_length=0):
            role_users.add(u.name)
    role_users = [u for u in role_users if u not in ["Administrator", "Guest"]]
    if not role_users:
        return []
    users = frappe.get_all("User", filters={"name": ["in", role_users], "enabled": 1}, fields=["name", "full_name", "email"], limit_page_length=0)
    if not users:
        return []
    emp_by_user = {}
    for e in frappe.get_all("Employee", filters={"status": "Active", "user_id": ["in", [u.name for u in users]]}, fields=["name", "user_id"], limit_page_length=0):
        emp_by_user.setdefault(e.user_id, []).append(e.name)
    out = []
    q = (txt or "").strip().lower()
    for u in users:
        emps = emp_by_user.get(u.name) or []
        if len(emps) != 1:
            continue
        fn = (u.full_name or u.name).strip()
        em = u.email or u.name
        if q and q not in fn.lower() and q not in em.lower() and q not in u.name.lower():
            continue
        out.append({"name": emps[0], "user": u.name, "user_id": u.name, "full_name": fn, "employee_name": fn, "email": em})
    out = sorted(out, key=lambda x: (" ".join(x["full_name"].lower().split()), x["user"]))
    if page_len:
        return out[start:start + page_len]
    return out


action = frappe.form_dict.get("action")
if str(action or "").startswith("my_"):
    # ================= MY LEADS (salesperson self-service) — 2026-11-02 =================
    # Identity comes ONLY from the authenticated session (frappe.session.user);
    # no user id is accepted from the browser. Scope = Lead Allocation.assigned_user == me.
    me = frappe.session.user
    MY_ROLES = ["Sales User", "Salesman", "Lead Sales User", "Lead Allocation Coordinator", "System Manager"]
    if me == "Guest" or not frappe.get_all("Has Role", filters={"parent": me, "parenttype": "User", "role": ["in", MY_ROLES]}, fields=["name"], limit=1):
        frappe.throw("You are not permitted to use My Leads.")
    CLOSED_ST = ["Converted", "Closed", "Unassigned"]
    ST_OPTS = ["Assigned", "Contacted", "Follow Up", "Interested", "Quotation Required", "No Response", "Not Interested", "Converted", "Closed"]
    OUT_OPTS = ["Pending", "Follow Up Required", "Meeting Required", "Quotation Required", "Customer Interested", "Customer Not Interested", "No Response", "Converted", "Lost"]
    MYF = ["name", "lead", "customer_name", "contact_person", "customer_phone_1", "customer_phone_2", "customer_email", "source", "action_taken", "original_activities",
           "assigned_by", "assignment_date", "priority", "status", "outcome", "last_contacted", "next_follow_up", "remarks", "creation", "modified"]
    mine = frappe.get_all("Lead Allocation", filters={"assigned_user": me}, fields=MYF, order_by="creation desc", limit_page_length=5000)
    lead_ids = list(set([a.lead for a in mine if a.lead]))
    other_active = set()
    if lead_ids:
        for o in frappe.get_all("Lead Allocation", filters={"lead": ["in", lead_ids], "assigned_user": ["!=", me], "status": ["not in", CLOSED_ST]}, fields=["lead"], limit_page_length=0):
            other_active.add(o.lead)
    my_active_leads = set([a.lead for a in mine if a.status not in CLOSED_ST])
    # History rule: a closed allocation whose lead is now actively assigned to someone else is hidden (access revoked on reassignment)
    visible = [a for a in mine if not (a.status in CLOSED_ST and a.lead in other_active and a.lead not in my_active_leads)]
    vl = list(set([a.lead for a in visible if a.lead]))
    det = {}
    if vl:
        for l in frappe.get_all("Leads Generation List", filters={"name": ["in", vl]}, fields=["name", "city", "designation", "catalogue_status", "customer_email_2"], limit_page_length=0):
            det[l.name] = l
    abn = {}
    abu = list(set([a.assigned_by for a in visible if a.assigned_by]))
    if abu:
        for u in frappe.get_all("User", filters={"name": ["in", abu]}, fields=["name", "full_name"], limit_page_length=0):
            abn[u.name] = u.full_name or u.name
    today = frappe.utils.nowdate()  # system time zone = Asia/Riyadh
    ds = today + " 00:00:00"
    de = today + " 23:59:59"
    act_count = {}
    for a in visible:
        if a.status not in CLOSED_ST and a.lead:
            act_count[a.lead] = act_count.get(a.lead, 0) + 1

    def s19(v):
        return str(v)[:19] if v else ""

    def grp(a):
        if a.status in CLOSED_ST:
            return "closed_grp"
        nf = s19(a.next_follow_up)
        if not nf:
            return "nofu"
        if nf < ds:
            return "overdue"
        if nf <= de:
            return "today"
        return "upcoming"

    def row(a):
        d = det.get(a.lead) or {}
        return {"name": a.name, "lead": a.lead, "customer_name": a.customer_name, "contact_person": a.contact_person,
                "customer_phone_1": a.customer_phone_1, "customer_phone_2": a.customer_phone_2, "customer_email": a.customer_email,
                "customer_email_2": d.get("customer_email_2"), "city": d.get("city"), "designation": d.get("designation"),
                "catalogue_status": d.get("catalogue_status"), "source": a.source, "action_taken": a.action_taken, "original_activities": a.original_activities,
                "assigned_by": a.assigned_by, "assigned_by_name": abn.get(a.assigned_by) or a.assigned_by, "assignment_date": str(a.assignment_date or ""),
                "priority": a.priority, "status": a.status, "outcome": a.outcome, "last_contacted": s19(a.last_contacted), "next_follow_up": s19(a.next_follow_up),
                "remarks": a.remarks, "fu_group": grp(a), "dup": (a.status not in CLOSED_ST and act_count.get(a.lead, 0) > 1), "fu_count": fu_cnt.get(a.name, 0), "last_fu": fu_last.get(a.name)}

    def parse(v):
        if isinstance(v, str):
            return json.loads(v or "{}")
        return v or {}

    # ---- follow-up log (Lead Follow-up Log) for my visible allocations ----
    FUL = "Lead Follow-up Log"
    LOGF = ["name", "lead", "allocation", "followup_datetime", "contact_method", "contact_result", "contact_person", "outcome", "notes", "next_action", "next_follow_up", "status_before", "status_after", "recorded_by", "creation"]
    vnames = [a.name for a in visible]
    fu_last = {}
    fu_cnt = {}
    if vnames:
        for lg in frappe.get_all(FUL, filters={"allocation": ["in", vnames]}, fields=["name", "allocation", "followup_datetime", "contact_method", "contact_result", "outcome", "notes", "next_action"], order_by="followup_datetime desc, creation desc", limit_page_length=0):
            fu_cnt[lg.allocation] = fu_cnt.get(lg.allocation, 0) + 1
            if lg.allocation not in fu_last:
                fu_last[lg.allocation] = {"date": s19(lg.followup_datetime), "method": lg.contact_method, "result": lg.contact_result, "outcome": lg.outcome, "notes": lg.notes, "next_action": lg.next_action}

    if action == "my_summary":
        active = [a for a in visible if a.status not in CLOSED_ST]
        cards = {"active": len(active), "today": len([a for a in active if grp(a) == "today"]), "overdue": len([a for a in active if grp(a) == "overdue"]),
                 "nofu": len([a for a in active if grp(a) == "nofu"]), "converted": len([a for a in visible if a.status == "Converted"]), "closed": len([a for a in visible if a.status == "Closed"])}
        over = sorted([a for a in active if grp(a) == "overdue"], key=lambda a: s19(a.next_follow_up))[:10]
        tod = sorted([a for a in active if grp(a) == "today"], key=lambda a: s19(a.next_follow_up))[:10]
        bs = {}
        for a in visible:
            bs[a.status] = bs.get(a.status, 0) + 1
        recent = sorted(visible, key=lambda a: (str(a.assignment_date or ""), str(a.creation)), reverse=True)[:8]
        cities = sorted(list(set([(det.get(a.lead) or {}).get("city") for a in visible if (det.get(a.lead) or {}).get("city") and str((det.get(a.lead) or {}).get("city")).strip(" -.")])))
        frappe.response["message"] = {"cards": cards, "dups": dict([(k, v) for k, v in act_count.items() if v > 1]), "attention": [row(a) for a in over] + [row(a) for a in tod],
                                      "by_status": sorted([{"k": k, "c": v} for k, v in bs.items()], key=lambda x: -x["c"]), "recent": [row(a) for a in recent], "cities": cities, "today": today}
    elif action == "my_list":
        f = parse(frappe.form_dict.get("f"))
        pane = frappe.form_dict.get("pane") or "leads"
        rows = [row(a) for a in visible]
        if pane == "hist":
            rows = [r for r in rows if r["status"] in CLOSED_ST]
        else:
            rows = [r for r in rows if r["status"] not in CLOSED_ST]
        if f.get("status"):
            rows = [r for r in rows if r["status"] == f.get("status")]
        if f.get("priority"):
            rows = [r for r in rows if r["priority"] == f.get("priority")]
        if f.get("from"):
            rows = [r for r in rows if r["assignment_date"] and r["assignment_date"] >= f.get("from")]
        if f.get("to"):
            rows = [r for r in rows if r["assignment_date"] and r["assignment_date"] <= f.get("to")]
        if f.get("fu"):
            rows = [r for r in rows if r["fu_group"] == f.get("fu")]
        if f.get("city"):
            rows = [r for r in rows if (r["city"] or "") == f.get("city")]
        if f.get("outcome"):
            rows = [r for r in rows if (r["outcome"] or "") == f.get("outcome")]
        if f.get("method"):
            rows = [r for r in rows if (r.get("last_fu") or {}).get("method") == f.get("method")]
        if f.get("dfrom") or f.get("dto"):
            dkey = "activity" if f.get("dbasis") == "activity" else "next_follow_up"
            def dval(r):
                if dkey == "next_follow_up":
                    return (r["next_follow_up"] or "")[:10]
                return ((r.get("last_fu") or {}).get("date") or "")[:10]
            rows = [r for r in rows if dval(r) and (not f.get("dfrom") or dval(r) >= f.get("dfrom")) and (not f.get("dto") or dval(r) <= f.get("dto"))]
        qq = (f.get("q") or "").strip().lower()
        if qq:
            rows = [r for r in rows if qq in " ".join([str(r.get(k) or "") for k in ["lead", "customer_name", "contact_person", "customer_phone_1", "customer_phone_2", "customer_email", "customer_email_2"]]).lower()]
        sort = frappe.form_dict.get("sort") or "assignment_date"
        if sort not in ["lead", "customer_name", "assignment_date", "priority", "status", "last_contacted", "next_follow_up", "city"]:
            sort = "assignment_date"
        rev = (frappe.form_dict.get("dir") or "desc") == "desc"
        filled = sorted([r for r in rows if r.get(sort)], key=lambda r: str(r.get(sort)).lower(), reverse=rev)
        empty = [r for r in rows if not r.get(sort)]
        rows = filled + empty
        start = max(frappe.utils.cint(frappe.form_dict.get("start")), 0)
        plen = min(max(frappe.utils.cint(frappe.form_dict.get("page_len") or 20), 1), 100)
        frappe.response["message"] = {"rows": rows[start:start + plen], "total": len(rows)}
    elif action == "my_get":
        nm = frappe.form_dict.get("name")
        hit = [a for a in visible if a.name == nm]
        if not hit:
            frappe.throw("This allocation is not assigned to you.")
        frappe.response["message"] = row(hit[0])
    elif action == "my_update":
        nm = frappe.form_dict.get("name")
        hit = [a for a in visible if a.name == nm]
        if not hit:
            frappe.throw("This allocation is not assigned to you.")
        if hit[0].status in CLOSED_ST:
            frappe.throw("This allocation is already " + hit[0].status + " and cannot be updated here.")
        vals = parse(frappe.form_dict.get("values"))
        allowed = ["status", "outcome", "last_contacted", "next_follow_up", "remarks"]
        bad = [k for k in vals.keys() if k not in allowed]
        if bad:
            frappe.throw("Field(s) not allowed: " + ", ".join(bad))
        if "status" in vals and vals.get("status") not in ST_OPTS:
            frappe.throw("Invalid status.")
        if vals.get("outcome") and vals.get("outcome") not in OUT_OPTS:
            frappe.throw("Invalid outcome.")
        d = frappe.get_doc("Lead Allocation", nm)
        if d.assigned_user != me:
            frappe.throw("This allocation is not assigned to you.")
        for k in vals.keys():
            d.set(k, vals.get(k) or None)
        if d.status == "Follow Up" and not d.next_follow_up:
            frappe.throw("Next Follow-up is required when status is Follow Up.")
        # ownership verified above; salesperson roles have no direct write permission on Lead Allocation,
        # so the save is performed for this single owned record only. Before Save guard still runs.
        d.save(ignore_permissions=True)
        frappe.response["message"] = {"ok": True, "name": d.name}
    elif action == "my_followups":
        nm = frappe.form_dict.get("name")
        hit = [a for a in visible if a.name == nm]
        if not hit:
            frappe.throw("This allocation is not assigned to you.")
        # timeline = entries on MY visible allocations for this lead (never other salespersons' allocations)
        mine_for_lead = [a.name for a in visible if a.lead == hit[0].lead]
        logs = frappe.get_all(FUL, filters={"allocation": ["in", mine_for_lead]}, fields=LOGF, order_by="followup_datetime desc, creation desc", limit_page_length=500)
        rb = list(set([l.recorded_by for l in logs if l.recorded_by]))
        rbn = {}
        if rb:
            for u in frappe.get_all("User", filters={"name": ["in", rb]}, fields=["name", "full_name"], limit_page_length=0):
                rbn[u.name] = u.full_name or u.name
        out = []
        for l in logs:
            out.append({"name": l.name, "allocation": l.allocation, "followup_datetime": s19(l.followup_datetime), "contact_method": l.contact_method, "contact_result": l.contact_result,
                        "contact_person": l.contact_person, "outcome": l.outcome, "notes": l.notes, "next_action": l.next_action, "next_follow_up": s19(l.next_follow_up),
                        "status_before": l.status_before, "status_after": l.status_after, "recorded_by": rbn.get(l.recorded_by) or l.recorded_by})
        frappe.response["message"] = out
    elif action == "my_add_followup":
        v = parse(frappe.form_dict.get("values"))
        nm = v.get("allocation")
        hit = [a for a in visible if a.name == nm]
        if not hit:
            frappe.throw("This allocation is not assigned to you.")
        al = hit[0]
        if v.get("lead") and v.get("lead") != al.lead:
            frappe.throw("The allocation does not belong to the selected lead.")
        if al.status in CLOSED_ST:
            frappe.throw("This allocation is already " + al.status + "; follow-ups cannot reopen it.")
        tok = str(v.get("client_token") or "")[:60]
        if not tok:
            frappe.throw("Missing request token.")
        prev = frappe.get_all(FUL, filters={"client_token": tok}, fields=["name", "recorded_by"], limit=1)
        if prev:
            # repeated click / retry: return the already-saved entry, do not create a duplicate
            frappe.response["message"] = {"ok": True, "name": prev[0].name, "duplicate": True}
        else:
            METHODS = ["Call", "WhatsApp", "Email", "Visit", "Meeting", "Other"]
            RESULTS = ["Conversation held", "Attempted - no response"]
            NEED_NEXT_OUT = ["Follow Up Required", "Meeting Required", "Quotation Required", "No Response", "Pending"]
            fdt = (v.get("followup_datetime") or "").strip()
            if not fdt:
                fdt = str(frappe.utils.now_datetime())[:19]
            fdt = str(frappe.utils.get_datetime(fdt))[:19]
            if fdt > str(frappe.utils.add_to_date(frappe.utils.now_datetime(), minutes=10))[:19]:
                frappe.throw("Follow-up date/time cannot be in the future.")
            if v.get("contact_method") not in METHODS:
                frappe.throw("Select a valid contact method.")
            if v.get("contact_result") not in RESULTS:
                frappe.throw("Select whether a conversation was held or the attempt got no response.")
            notes = (v.get("notes") or "").strip()
            if not notes:
                frappe.throw("Discussion notes are required.")
            outc = v.get("outcome") or ""
            if outc and outc not in OUT_OPTS:
                frappe.throw("Invalid outcome.")
            attempted = v.get("contact_result") == "Attempted - no response"
            if attempted and outc not in ["", "No Response"]:
                frappe.throw("An attempt with no response can only have the outcome 'No Response'.")
            if attempted:
                outc = "No Response"
            if (not attempted) and outc == "No Response":
                frappe.throw("Outcome 'No Response' conflicts with 'Conversation held'.")
            new_status = v.get("status") or al.status
            if new_status not in ST_OPTS:
                frappe.throw("Invalid status.")
            if attempted and new_status in ["Contacted", "Interested", "Converted"]:
                frappe.throw("An unanswered attempt cannot set status " + new_status + ".")
            if new_status == "Converted" and outc in ["Customer Not Interested", "Lost"]:
                frappe.throw("Outcome conflicts with status Converted.")
            nxt = (v.get("next_follow_up") or "").strip()
            if nxt:
                nxt = str(frappe.utils.get_datetime(nxt))[:19]
                if nxt <= fdt:
                    frappe.throw("Next follow-up must be after the follow-up date/time.")
            closing = new_status in CLOSED_ST
            if (not closing) and (new_status in ["Follow Up", "No Response"] or attempted or outc in NEED_NEXT_OUT) and not nxt:
                frappe.throw("A next follow-up date/time is required for this status/outcome.")
            if closing:
                nxt = ""
            # 1) update the allocation (ownership re-checked), 2) insert the log.
            # Both happen in this single request: any error rolls back the whole transaction.
            d = frappe.get_doc("Lead Allocation", al.name)
            if d.assigned_user != me:
                frappe.throw("This allocation is not assigned to you.")
            before = d.status
            d.status = new_status
            if outc:
                d.outcome = outc
            d.next_follow_up = nxt or None
            if not attempted:
                # only a real conversation counts as "last contacted"
                if (not d.last_contacted) or str(d.last_contacted)[:19] < fdt:
                    d.last_contacted = fdt
            d.save(ignore_permissions=True)
            lg = frappe.get_doc({"doctype": FUL, "lead": al.lead, "allocation": al.name, "followup_datetime": fdt, "contact_method": v.get("contact_method"),
                                 "contact_result": v.get("contact_result"), "contact_person": (v.get("contact_person") or "")[:140], "outcome": outc or None,
                                 "notes": notes, "next_action": (v.get("next_action") or "").strip(), "next_follow_up": nxt or None,
                                 "status_before": before, "status_after": new_status, "recorded_by": me, "assigned_user": me, "client_token": tok})
            lg.insert(ignore_permissions=True)
            frappe.response["message"] = {"ok": True, "name": lg.name, "status": new_status}
    else:
        frappe.throw("Unknown action.")
elif action == "get_salespersons":
    frappe.response["message"] = eligible_salespersons()
elif action == "search_salespersons":
    # Same eligibility function as server-side allocation validation.
    # Returns only user id, full name and email.
    s_txt = (frappe.form_dict.get("txt") or "").strip()[:100]
    s_len = min(max(frappe.utils.cint(frappe.form_dict.get("page_len") or 25), 1), 50)
    s_start = max(frappe.utils.cint(frappe.form_dict.get("start") or 0), 0)
    allr = eligible_salespersons(s_txt)
    page = allr[s_start:s_start + s_len]
    frappe.response["message"] = {
        "results": [{"user": r["user"], "full_name": r["full_name"], "email": r["email"]} for r in page],
        "has_more": s_start + len(page) < len(allr),
        "total": len(allr)
    }
elif action == "unassign_allocations":
    # 2026-11-09: end selected ACTIVE allocations (coordinator action; allocator gate above).
    # The allocation is NOT deleted: status -> "Unassigned" (allocation state, not a customer outcome),
    # outcome / next follow-up / remarks / follow-up log are kept; who/when/why recorded.
    ENDED = ["Closed", "Converted", "Unassigned"]
    reason = (frappe.form_dict.get("reason") or "").strip()
    if len(reason) < 5:
        frappe.throw("Please enter an unassignment reason (at least 5 characters).")
    items = frappe.form_dict.get("allocations")
    if isinstance(items, str):
        items = json.loads(items or "[]")
    if not isinstance(items, list) or not items or len(items) > 500:
        frappe.throw("Select between 1 and 500 allocations.")
    seen = []
    results = []
    now = frappe.utils.now_datetime()
    for it in items:
        an = (it or {}).get("allocation") if isinstance(it, dict) else None
        ld = (it or {}).get("lead") if isinstance(it, dict) else None
        if not an or an in seen:
            continue
        seen.append(an)
        cur = frappe.db.get_value("Lead Allocation", an, ["name", "lead", "status", "assigned_user", "sales_person"], as_dict=True)
        if not cur:
            results.append({"allocation": an, "lead": ld, "ok": False, "message": "Allocation not found."})
            continue
        if ld and cur.lead != ld:
            results.append({"allocation": an, "lead": ld, "ok": False, "message": "Allocation does not belong to this lead."})
            continue
        if not frappe.get_list("Leads Generation List", filters={"name": cur.lead}, pluck="name", limit_page_length=1):
            results.append({"allocation": an, "lead": cur.lead, "ok": False, "message": "You do not have access to this lead."})
            continue
        if cur.status in ENDED:
            results.append({"allocation": an, "lead": cur.lead, "ok": False, "message": "Already ended (" + str(cur.status) + "); nothing changed."})
            continue
        d = frappe.get_doc("Lead Allocation", an)
        d.status_before_unassign = d.status
        d.status = "Unassigned"
        d.unassigned_on = now
        d.unassigned_by = frappe.session.user
        d.unassign_reason = reason[:1000]
        # coordinator-only action authorized above; coordinators have no general write permission on Lead Allocation
        d.save(ignore_permissions=True)
        still = frappe.get_all("Lead Allocation", filters={"lead": cur.lead, "status": ["not in", ENDED]}, fields=["name"], limit_page_length=0)
        results.append({"allocation": an, "lead": cur.lead, "ok": True, "message": "Unassigned.", "remaining_active": len(still)})
    frappe.response["message"] = {"results": results, "ok": len([r for r in results if r["ok"]]), "failed": len([r for r in results if not r["ok"]])}
elif action in ["fu_monitor", "fu_history"]:
    # 2026-11-09: coordinator follow-up monitoring (read-only). Same allocator gate as above.
    # Lead scope = leads the requesting user may read (permission-aware frappe.get_list).
    FUL = "Lead Follow-up Log"
    CLOSED = ["Closed", "Converted", "Unassigned"]

    def fu_permitted(ids):
        out_ids = []
        i = 0
        while i < len(ids):
            out_ids = out_ids + frappe.get_list("Leads Generation List", filters={"name": ["in", ids[i:i + 1000]]}, pluck="name", limit_page_length=0)
            i = i + 1000
        return set(out_ids)

    def s19(v):
        return str(v)[:19] if v else ""

    if action == "fu_history":
        ld = frappe.form_dict.get("lead")
        if not ld or ld not in fu_permitted([ld]):
            frappe.throw("You do not have access to this lead.")
        logs = frappe.get_all(FUL, filters={"lead": ld}, fields=["name", "allocation", "followup_datetime", "contact_method", "contact_result", "contact_person", "outcome", "notes", "next_action", "next_follow_up", "status_before", "status_after", "recorded_by", "assigned_user"], order_by="followup_datetime desc, creation desc", limit_page_length=1000)
        us = list(set([l.recorded_by for l in logs if l.recorded_by]))
        un = {}
        if us:
            for u in frappe.get_all("User", filters={"name": ["in", us]}, fields=["name", "full_name"], limit_page_length=0):
                un[u.name] = u.full_name or u.name
        frappe.response["message"] = [{"name": l.name, "allocation": l.allocation, "followup_datetime": s19(l.followup_datetime), "contact_method": l.contact_method, "contact_result": l.contact_result,
                                       "contact_person": l.contact_person, "outcome": l.outcome, "notes": l.notes, "next_action": l.next_action, "next_follow_up": s19(l.next_follow_up),
                                       "status_before": l.status_before, "status_after": l.status_after, "recorded_by": un.get(l.recorded_by) or l.recorded_by} for l in logs]
    else:
        fd = frappe.form_dict
        f = fd.get("f")
        if isinstance(f, str):
            f = json.loads(f or "{}")
        f = f or {}
        allocs = frappe.get_all("Lead Allocation", filters={"status": ["not in", CLOSED]}, fields=["name", "lead", "customer_name", "sales_person", "assigned_user", "assigned_by", "assignment_date", "priority", "status", "outcome", "next_follow_up", "last_contacted"], limit_page_length=20001)
        truncated = len(allocs) > 20000
        allocs = allocs[:20000]
        ok = fu_permitted(list(set([a.lead for a in allocs if a.lead])))
        allocs = [a for a in allocs if a.lead in ok]
        sp_all = list(set([a.assigned_user for a in allocs if a.assigned_user]))
        if f.get("sp_user"):
            allocs = [a for a in allocs if a.assigned_user == f.get("sp_user")]
        if f.get("alloc_by"):
            allocs = [a for a in allocs if a.assigned_by == f.get("alloc_by")]
        if f.get("status"):
            allocs = [a for a in allocs if a.status == f.get("status")]
        if f.get("priority"):
            allocs = [a for a in allocs if a.priority == f.get("priority")]
        qq = (f.get("q") or "").strip().lower()
        if qq:
            allocs = [a for a in allocs if qq in ((a.lead or "") + " " + (a.customer_name or "")).lower()]
        names = [a.name for a in allocs]
        last = {}
        cnt = {}
        i = 0
        while i < len(names):
            for lg in frappe.get_all(FUL, filters={"allocation": ["in", names[i:i + 1000]]}, fields=["allocation", "followup_datetime", "contact_method", "contact_result", "outcome", "notes", "next_action"], order_by="followup_datetime desc, creation desc", limit_page_length=0):
                cnt[lg.allocation] = cnt.get(lg.allocation, 0) + 1
                if lg.allocation not in last:
                    last[lg.allocation] = lg
            i = i + 1000
        leads_all = list(set([a.lead for a in allocs]))
        lead_logs = {}
        i = 0
        while i < len(leads_all):
            for r in frappe.get_all(FUL, filters={"lead": ["in", leads_all[i:i + 1000]]}, fields=["lead", "count(name) as c"], group_by="lead", limit_page_length=0):
                lead_logs[r.lead] = r.c
            i = i + 1000
        now = str(frappe.utils.now_datetime())[:19]
        today = frappe.utils.nowdate()
        ds = today + " 00:00:00"
        de = today + " 23:59:59"

        def due(a):
            nf = s19(a.next_follow_up)
            if not nf:
                return "nofu"
            if nf < ds:
                return "overdue"
            if nf <= de:
                return "today"
            return "upcoming"
        # date range: dbasis 'next' (scheduled next follow-up) or 'activity' (latest recorded follow-up)
        if f.get("dfrom") or f.get("dto"):
            def dv(a):
                if f.get("dbasis") == "activity":
                    lg = last.get(a.name)
                    return s19(lg.followup_datetime)[:10] if lg else ""
                return s19(a.next_follow_up)[:10]
            allocs = [a for a in allocs if dv(a) and (not f.get("dfrom") or dv(a) >= f.get("dfrom")) and (not f.get("dto") or dv(a) <= f.get("dto"))]
        # cards: DISTINCT LEADS in the filtered scope (before the due-category filter)
        by_lead = {}
        for a in allocs:
            by_lead.setdefault(a.lead, []).append(a)
        def lead_has(cat):
            return len([l for l, al in by_lead.items() if any([due(x) == cat for x in al])])
        cards = {"active": len(by_lead), "overdue": lead_has("overdue"), "today": lead_has("today"), "upcoming": lead_has("upcoming"),
                 "nofu": len([l for l, al in by_lead.items() if all([due(x) == "nofu" for x in al])]),
                 "nolog": len([l for l in by_lead.keys() if not lead_logs.get(l)]),
                 "activities": sum([lead_logs.get(l, 0) for l in by_lead.keys()])}
        dcat = f.get("due") or ""
        if dcat == "nolog":
            allocs = [a for a in allocs if not lead_logs.get(a.lead)]
        elif dcat == "nofu":
            allocs = [a for a in allocs if all([due(x) == "nofu" for x in by_lead.get(a.lead, [a])])]
        elif dcat:
            allocs = [a for a in allocs if due(a) == dcat]
        users = list(set(sp_all + [a.assigned_user for a in allocs if a.assigned_user] + [a.assigned_by for a in allocs if a.assigned_by]))
        un = {}
        if users:
            for u in frappe.get_all("User", filters={"name": ["in", users]}, fields=["name", "full_name"], limit_page_length=0):
                un[u.name] = u.full_name or u.name
        dupc = {}
        for a in allocs:
            dupc[a.lead] = dupc.get(a.lead, 0) + 1
        rows = []
        for a in allocs:
            lg = last.get(a.name)
            nf = s19(a.next_follow_up)
            od = 0
            if nf and nf < now:
                od = frappe.utils.date_diff(today, nf[:10])
            rows.append({"allocation": a.name, "lead": a.lead, "customer_name": a.customer_name, "salesperson": un.get(a.assigned_user) or a.assigned_user, "salesperson_user": a.assigned_user,
                         "allocated_by": un.get(a.assigned_by) or a.assigned_by, "assignment_date": str(a.assignment_date or ""), "status": a.status, "priority": a.priority,
                         "last_fu_date": s19(lg.followup_datetime) if lg else "", "last_fu_method": lg.contact_method if lg else "", "last_fu_result": lg.contact_result if lg else "",
                         "last_fu_outcome": lg.outcome if lg else "", "last_notes": lg.notes if lg else "", "next_action": lg.next_action if lg else "",
                         "next_follow_up": nf, "overdue_days": od, "due": due(a), "fu_count": cnt.get(a.name, 0), "lead_fu_count": lead_logs.get(a.lead, 0), "dup": dupc.get(a.lead, 0) > 1})
        sort = fd.get("sort") or "next_follow_up"
        if sort not in ["lead", "customer_name", "salesperson", "assignment_date", "status", "priority", "last_fu_date", "next_follow_up", "overdue_days", "fu_count"]:
            sort = "next_follow_up"
        rev = (fd.get("dir") or "asc") == "desc"
        filled = sorted([r for r in rows if r.get(sort) not in [None, ""]], key=lambda r: r.get(sort) if sort in ["overdue_days", "fu_count"] else str(r.get(sort)).lower(), reverse=rev)
        rows = filled + [r for r in rows if r.get(sort) in [None, ""]]
        start = max(frappe.utils.cint(fd.get("start")), 0)
        plen = min(max(frappe.utils.cint(fd.get("page_len") or 25), 1), 100)
        alb = list(set([a.assigned_by for a in frappe.get_all("Lead Allocation", fields=["assigned_by"], limit_page_length=20000) if a.assigned_by]))
        frappe.response["message"] = {"cards": cards, "rows": rows[start:start + plen], "total": len(rows), "truncated": truncated, "today": today,
                                      "salespersons": sorted([{"user": u, "name": un.get(u) or u} for u in sp_all], key=lambda x: x["name"].lower()),
                                      "allocators": [{"user": u.name, "name": u.full_name or u.name} for u in frappe.get_all("User", filters={"name": ["in", alb or ["__none__"]]}, fields=["name", "full_name"], order_by="full_name asc", limit_page_length=0)]}
elif action in ["report_lead_ids", "report_allocations"]:
    # 2026-11-02: READ-ONLY reporting for the Lead Management "Detailed Report" tab.
    # Same allocator role gate as above (checked at the top of this script).
    # Lead Allocation records are never modified here.
    # Every lead ID returned is first intersected with frappe.get_list on
    # "Leads Generation List" (permission-aware) so only leads the requesting
    # user may read are reported.
    CLOSED = ["Closed", "Converted", "Unassigned"]
    MAX_IDS = 20000

    def permitted(ids):
        out_ids = []
        i = 0
        while i < len(ids):
            chunk = ids[i:i + 1000]
            out_ids = out_ids + frappe.get_list("Leads Generation List", filters={"name": ["in", chunk]}, pluck="name", limit_page_length=0)
            i = i + 1000
        return out_ids

    if action == "report_lead_ids":
        fd = frappe.form_dict
        af = {}
        if fd.get("salesperson_user"):
            af["assigned_user"] = fd.get("salesperson_user")
        if fd.get("allocated_by"):
            af["assigned_by"] = fd.get("allocated_by")
        if fd.get("priority"):
            af["priority"] = fd.get("priority")
        if fd.get("fu_status"):
            af["status"] = fd.get("fu_status")
        if fd.get("asg_from") and fd.get("asg_to"):
            af["assignment_date"] = ["between", [fd.get("asg_from"), fd.get("asg_to")]]
        elif fd.get("asg_from"):
            af["assignment_date"] = [">=", fd.get("asg_from")]
        elif fd.get("asg_to"):
            af["assignment_date"] = ["<=", fd.get("asg_to")]
        allrows = frappe.get_all("Lead Allocation", fields=["lead", "status"], limit_page_length=MAX_IDS + 1)
        truncated = len(allrows) > MAX_IDS
        cur = set()
        anyalloc = set()
        for r in allrows[:MAX_IDS]:
            if not r.lead:
                continue
            anyalloc.add(r.lead)
            if r.status not in CLOSED:
                cur.add(r.lead)
        hist = [x for x in anyalloc if x not in cur]
        matched = None
        if af:
            matched = list(set([r.lead for r in frappe.get_all("Lead Allocation", filters=af, fields=["lead"], limit_page_length=MAX_IDS) if r.lead]))
        abu = list(set([r.assigned_by for r in frappe.get_all("Lead Allocation", fields=["assigned_by"], limit_page_length=MAX_IDS) if r.assigned_by]))
        allocators = []
        if abu:
            for u in frappe.get_all("User", filters={"name": ["in", abu]}, fields=["name", "full_name"], order_by="full_name asc", limit_page_length=0):
                allocators.append({"user": u.name, "full_name": u.full_name or u.name})
        frappe.response["message"] = {
            "allocators": allocators,
            "current": permitted(list(cur)),
            "history_only": permitted(hist),
            "matched": permitted(matched) if matched is not None else None,
            "truncated": truncated
        }
    else:
        leads = frappe.form_dict.get("leads")
        if isinstance(leads, str):
            leads = json.loads(leads)
        if not isinstance(leads, list) or len(leads) > 500:
            frappe.throw("Provide a list of at most 500 lead IDs.")
        ok = permitted([l for l in leads if isinstance(l, str)])
        res = {}
        if ok:
            rows = frappe.get_all(
                "Lead Allocation",
                filters={"lead": ["in", ok]},
                fields=["name", "lead", "sales_person", "assigned_user", "assigned_by", "assignment_date", "priority", "status", "outcome", "last_contacted", "next_follow_up", "remarks", "converted", "conversion_date", "creation"],
                order_by="creation desc",
                limit_page_length=0
            )
            rfl = {}
            rfc = {}
            for lg in frappe.get_all("Lead Follow-up Log", filters={"allocation": ["in", [r.name for r in rows]]}, fields=["allocation", "followup_datetime", "contact_method", "contact_result", "outcome", "notes", "next_action"], order_by="followup_datetime desc, creation desc", limit_page_length=0) if rows else []:
                rfc[lg.allocation] = rfc.get(lg.allocation, 0) + 1
                if lg.allocation not in rfl:
                    rfl[lg.allocation] = {"date": str(lg.followup_datetime)[:19], "method": lg.contact_method, "result": lg.contact_result, "outcome": lg.outcome, "notes": lg.notes, "next_action": lg.next_action}
            users = list(set([r.assigned_user for r in rows if r.assigned_user] + [r.assigned_by for r in rows if r.assigned_by]))
            un = {}
            if users:
                for u in frappe.get_all("User", filters={"name": ["in", users]}, fields=["name", "full_name", "email"], limit_page_length=0):
                    un[u.name] = {"full_name": u.full_name or u.name, "email": u.email or u.name}
            emps = list(set([r.sales_person for r in rows if r.sales_person]))
            en = {}
            if emps:
                for e in frappe.get_all("Employee", filters={"name": ["in", emps]}, fields=["name", "employee_name"], limit_page_length=0):
                    en[e.name] = e.employee_name
            for r in rows:
                au = un.get(r.assigned_user) or {}
                ab = un.get(r.assigned_by) or {}
                res.setdefault(r.lead, []).append({
                    "allocation": r.name,
                    "current": r.status not in CLOSED,
                    "sales_person": r.sales_person,
                    "sales_person_name": au.get("full_name") or en.get(r.sales_person) or r.sales_person,
                    "sales_person_email": au.get("email") or r.assigned_user,
                    "allocated_by": ab.get("full_name") or r.assigned_by,
                    "allocated_by_user": r.assigned_by,
                    "assignment_date": r.assignment_date,
                    "priority": r.priority,
                    "status": r.status,
                    "outcome": r.outcome,
                    "last_contacted": r.last_contacted,
                    "next_follow_up": r.next_follow_up,
                    "remarks": r.remarks,
                    "converted": r.converted,
                    "conversion_date": r.conversion_date,
                    "created": r.creation, "fu_count": rfc.get(r.name, 0), "fu_latest": rfl.get(r.name)
                })
        frappe.response["message"] = res
else:
    leads = frappe.form_dict.get("leads")
    sales_person = frappe.form_dict.get("sales_person")
    # 2026-11-02 v2: dialog sends the selected User; resolve to the Employee ID
    # that Lead Allocation.sales_person stores (via Employee.user_id).
    salesperson_user = frappe.form_dict.get("salesperson_user")
    if salesperson_user:
        elig = [r for r in eligible_salespersons() if r["user"] == salesperson_user]
        if not elig:
            frappe.throw("The selected salesperson <b>" + str(salesperson_user) + "</b> is not eligible (needs an enabled user with Sales User or Salesman role and exactly one Active Employee record).")
        sp_emp = frappe.get_all("Employee", filters={"user_id": salesperson_user, "status": "Active"}, fields=["name"], limit_page_length=2)
        if not sp_emp:
            frappe.throw("The selected salesperson <b>" + str(salesperson_user) + "</b> has no Active Employee record linked to their user, so leads cannot be allocated to them. Please link an Employee (User ID) first.")
        if len(sp_emp) > 1:
            frappe.throw("The selected salesperson <b>" + str(salesperson_user) + "</b> is linked to more than one Active Employee. Please correct the Employee records first.")
        sales_person = sp_emp[0].name
    assignment_date = frappe.form_dict.get("assignment_date")
    priority = frappe.form_dict.get("priority")
    next_follow_up = frappe.form_dict.get("next_follow_up")


    # ------------------------------------------------------------
    # VALIDATION
    # ------------------------------------------------------------

    if not leads:
        frappe.throw("Please select at least one lead.")

    if not sales_person:
        frappe.throw("Please select a Sales Person.")


    # ------------------------------------------------------------
    # HANDLE LEADS PARAMETER
    # ------------------------------------------------------------

    if isinstance(leads, str):
        leads = json.loads(leads)


    if not leads:
        frappe.throw("No leads were received for allocation.")

    if not isinstance(leads, list) or len(leads) > 500:
        frappe.throw("Invalid lead selection (a list of at most 500 leads is required).")
    clean_leads = []
    for l in leads:
        if not isinstance(l, str) or not l.strip():
            frappe.throw("Invalid lead identifier received.")
        if l not in clean_leads:
            clean_leads.append(l)
    leads = clean_leads

    eligible_ids = [e["name"] for e in eligible_salespersons()]
    if sales_person not in eligible_ids:
        frappe.throw("Sales Person <b>" + str(sales_person) + "</b> is not an eligible salesperson (must be an Active Employee linked to an enabled user with the Sales User or Salesman role).")


    # ------------------------------------------------------------
    # CHECK EMPLOYEE USER ACCOUNT
    # ------------------------------------------------------------

    employee_user = frappe.db.get_value(
        "Employee",
        sales_person,
        "user_id"
    )

    if not employee_user:
        frappe.throw(
            "The selected Sales Person does not have an ERPNext User account linked.<br><br>"
            "Employee: <b>" + str(sales_person) + "</b><br><br>"
            "Please link a User ID to this Employee before assigning leads."
        )


    # ------------------------------------------------------------
    # DEFAULT VALUES
    # ------------------------------------------------------------

    if not assignment_date:
        assignment_date = frappe.utils.today()

    if not priority:
        priority = "Medium"


    # ------------------------------------------------------------
    # COUNTERS
    # ------------------------------------------------------------

    created = 0
    skipped = 0
    skipped_leads = []


    # ------------------------------------------------------------
    # PROCESS SELECTED LEADS
    # ------------------------------------------------------------

    for lead in leads:

        # Confirm source lead exists
        if not frappe.db.exists("Leads Generation List", lead):
            skipped = skipped + 1
            skipped_leads.append(
                str(lead) + " - Lead does not exist"
            )
            continue


        # Check existing active allocation
        existing = frappe.db.get_value(
            "Lead Allocation",
            {
                "lead": lead,
                "status": ["not in", ["Closed", "Converted", "Unassigned"]]
            },
            ["name", "sales_person"],
            as_dict=True
        )


        if existing:
            skipped = skipped + 1

            skipped_leads.append(
                str(lead) + " - Already allocated to " + str(existing.sales_person)
            )

            continue


        # --------------------------------------------------------
        # CREATE ALLOCATION
        # --------------------------------------------------------

        allocation = frappe.get_doc({
            "doctype": "Lead Allocation",

            "lead": lead,

            "sales_person": sales_person,

            "assigned_user": employee_user,

            "assigned_by": frappe.session.user,

            "assignment_date": assignment_date,

            "priority": priority,

            "status": "Assigned",

            "outcome": "Pending"
        })


        if next_follow_up:
            allocation.next_follow_up = next_follow_up


        allocation.insert()

        created = created + 1


    # ------------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------------

    frappe.response["message"] = {
        "success": True,
        "created": created,
        "skipped": skipped,
        "total": len(leads),
        "sales_person": sales_person,
        "assigned_user": employee_user,
        "skipped_leads": skipped_leads
    }
