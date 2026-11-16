# Manufacturing Dashboard - performance API v2 (2026-10-19). Read-only, Guest off, permission-checked get_list only. Scope: confirmed factories only.
LIMIT = 5000
def S(v):
    if v is None:
        return ""
    return str(v)

def addto(d, k, v):
    d[k] = frappe.utils.flt(d.get(k)) + frappe.utils.flt(v)

def is_admin():
    return len(frappe.get_all("Has Role", filters={"parenttype": "User", "parent": frappe.session.user, "role": "System Manager"}, pluck="name", limit_page_length=1)) > 0

def load_scope(company, factory):
    # Factories in scope = active factories of this company (user permissions on Company/Factory apply via get_list)
    # that have at least one Confirmed warehouse mapping. Branch labels come only from these factories.
    flt = [["Manufacturing Factory", "company", "=", company], ["Manufacturing Factory", "is_active", "=", 1]]
    if frappe.form_dict.get("dashboard_scope") == "28_34":
        flt.append(["Manufacturing Factory", "legacy_branch_label", "in", ["28 Factory", "34 Factory"]])
    facs = frappe.get_list("Manufacturing Factory", filters=flt, fields=["name", "company", "legacy_branch_label"], order_by="legacy_branch_label asc", limit_page_length=200)
    rows = frappe.get_list("Manufacturing Factory", filters=flt + [["Manufacturing Factory Warehouse", "mapping_status", "=", "Confirmed"]],
        fields=["name", "`tabManufacturing Factory Warehouse`.warehouse as warehouse"], limit_page_length=1000)
    wh_by_fac = {}
    for r in rows:
        if r.get("warehouse"):
            if r.get("name") not in wh_by_fac:
                wh_by_fac[r.get("name")] = []
            wh_by_fac[r.get("name")].append(r.get("warehouse"))
    options = []
    label = {}
    for f in facs:
        if f.get("name") in wh_by_fac and f.get("company") == company:
            lb = f.get("legacy_branch_label") or f.get("name")
            options.append({"name": f.get("name"), "label": lb, "branch_label": f.get("legacy_branch_label"), "warehouses": wh_by_fac[f.get("name")]})
            label[f.get("name")] = lb
    options = sorted(options, key=lambda x: x["label"])
    if factory and factory not in label:
        frappe.throw("Factory not found, inactive, without a Confirmed mapping, outside this company, or not permitted: " + S(factory))
    scope = [o for o in options if (not factory) or o["name"] == factory]
    wh_map = {}
    branch_map = {}
    for o in scope:
        for w in o["warehouses"]:
            wh_map[w] = o["label"]
        if o["branch_label"]:
            branch_map[o["branch_label"]] = o["label"]
    return {"options": options, "scope": scope, "wh_map": wh_map, "branch_map": branch_map}
form = frappe.form_dict
company = form.get("company") or frappe.db.get_single_value("Manufacturing Dashboard Settings", "default_company")
factory = form.get("factory") or ""
period = form.get("period") or "Daily"
if period not in ["Daily", "Weekly", "Monthly", "Custom"]:
    frappe.throw("Invalid period")
today = frappe.utils.getdate(frappe.utils.nowdate())
ref = frappe.utils.getdate(form.get("ref_date") or frappe.utils.nowdate())
admin = is_admin()

ws = frappe.db.get_single_value("Manufacturing Dashboard Settings", "week_start") or "Sunday"
anchors = {"Sunday": "2023-01-01", "Saturday": "2022-12-31", "Monday": "2023-01-02"}
if period == "Custom":
    if not form.get("from_date") or not form.get("to_date"):
        frappe.throw("From Date and To Date are required for a custom range")
    start = frappe.utils.getdate(form.get("from_date"))
    end = frappe.utils.getdate(form.get("to_date"))
    if start > end:
        frappe.throw("From Date must be on or before To Date")
    if frappe.utils.date_diff(end, start) > 366:
        frappe.throw("Date range cannot exceed 367 days")
elif period == "Daily":
    start = ref
    end = ref
elif period == "Weekly":
    off = frappe.utils.date_diff(ref, anchors.get(ws, "2023-01-01")) % 7
    start = frappe.utils.getdate(frappe.utils.add_days(ref, 0 - off))
    end = frappe.utils.getdate(frappe.utils.add_days(start, 6))
else:
    start = frappe.utils.getdate(frappe.utils.get_first_day(ref))
    end = frappe.utils.getdate(frappe.utils.get_last_day(ref))
future = start > today
to_date_end = None
if not future:
    to_date_end = end
    if end > today:
        to_date_end = today
partial = (not future) and end > today

res = {"company": company, "factory": factory or "", "period": period, "ref_date": S(ref),
       "start": S(start), "end": S(end), "to_date_end": S(to_date_end) if to_date_end else None,
       "partial": partial, "future": future, "today": S(today), "week_start": ws, "timezone": "Asia/Riyadh",
       "notes": [], "is_admin": admin}

sc = None
try:
    sc = load_scope(company, factory)
except Exception as e:
    if "Factory not found" in S(e):
        raise
    res["access"] = "Access unavailable: Manufacturing Factory mapping"

if sc is not None:
    res["factory_options"] = [{"name": o["name"], "label": o["label"]} for o in sc["options"]]
    res["scope_label"] = (sc["scope"][0]["label"] if factory else "All Factories (" + " + ".join([o["label"] for o in sc["options"]]) + ")")
    if not sc["scope"]:
        res["notes"].append("No permitted factory with a Confirmed warehouse mapping for this company.")
    whs = [w for w in sc["wh_map"]]
    labels = [b for b in sc["branch_map"]]
    res["mapping"] = [{"warehouse": w, "factory": sc["wh_map"][w]} for w in whs]
    diag = {}

    out = {"access": "ok"}
    by_item = {}
    try:
        base = [["Stock Entry", "docstatus", "=", 1], ["Stock Entry", "company", "=", company],
                ["Stock Entry", "purpose", "=", "Manufacture"],
                ["Stock Entry", "posting_date", ">=", S(start)], ["Stock Entry", "posting_date", "<=", S(end)],
                ["Stock Entry Detail", "is_finished_item", "=", 1]]
        rows = []
        if whs:
            rows = frappe.get_list("Stock Entry", filters=base + [["Stock Entry Detail", "t_warehouse", "in", whs]],
                fields=["`tabStock Entry`.name as se", "`tabStock Entry`.posting_date as d",
                        "`tabStock Entry Detail`.t_warehouse as wh", "`tabStock Entry Detail`.item_code as item",
                        "`tabStock Entry Detail`.item_name as item_name", "`tabStock Entry Detail`.stock_uom as uom",
                        "`tabStock Entry Detail`.transfer_qty as qty",
                        "`tabStock Entry`.total_outgoing_value as mat", "`tabStock Entry`.total_additional_costs as addl",
                        "`tabStock Entry`.total_incoming_value as val", "`tabStock Entry`.value_difference as vdiff", "`tabStock Entry Detail`.item_group as grp"],
                order_by="`tabStock Entry`.posting_date asc", limit_page_length=LIMIT + 1)
        out["truncated"] = len(rows) > LIMIT
        rows = rows[:LIMIT]
        by_uom = {}
        output_categories = {}
        out_uncl = []
        series = {}
        cost_series = {}
        seen = {}
        multi = []
        addl_docs = []
        vdiff = 0.0
        negs = []
        se_grp = {}
        se_vd = {}
        mat = 0.0
        addl = 0.0
        val = 0.0
        for r in rows:
            fac = sc["wh_map"].get(r.get("wh"))
            if not fac:
                continue
            k = fac + "||" + S(r.get("item")) + "||" + S(r.get("uom"))
            if k not in by_item:
                by_item[k] = {"item_name": r.get("item_name"), "actual": 0.0}
            by_item[k]["actual"] = by_item[k]["actual"] + frappe.utils.flt(r.get("qty"))
            addto(by_uom, S(r.get("uom")), r.get("qty"))
            ck = S(r.get("grp") or "Unclassified") + "||" + S(r.get("uom"))
            addto(output_categories, ck, r.get("qty"))
            if not r.get("grp") and len(out_uncl) < 200:
                out_uncl.append({"se": r.get("se"), "item": r.get("item"), "uom": r.get("uom"), "qty": frappe.utils.flt(r.get("qty"))})
            addto(series, S(r.get("d")) + "||" + S(r.get("uom")), r.get("qty"))
            se = r.get("se")
            if se not in se_grp:
                se_grp[se] = []
            if r.get("grp") and r.get("grp") not in se_grp[se]:
                se_grp[se].append(r.get("grp"))
            if se in seen:
                multi.append(se)
                continue
            seen[se] = 1
            mat = mat + frappe.utils.flt(r.get("mat"))
            addl = addl + frappe.utils.flt(r.get("addl"))
            if frappe.utils.flt(r.get("addl")) and len(addl_docs) < 25:
                addl_docs.append({"se": se, "amount": frappe.utils.flt(r.get("addl"))})
            val = val + frappe.utils.flt(r.get("val"))
            vdiff = vdiff + frappe.utils.flt(r.get("vdiff"))
            se_vd[se] = frappe.utils.flt(r.get("vdiff"))
            if frappe.utils.flt(r.get("vdiff")) < 0:
                negs.append({"se": se, "date": S(r.get("d")), "factory": fac, "value_difference": frappe.utils.flt(r.get("vdiff"))})
            addto(cost_series, S(r.get("d")), frappe.utils.flt(r.get("mat")) + frappe.utils.flt(r.get("addl")))
        out["entries"] = len(seen)
        out["multi_fg_entries"] = multi
        out["by_uom"] = [{"uom": u, "qty": by_uom[u]} for u in by_uom]
        out["output_categories"] = [{"category": k.split("||")[0], "uom": k.split("||")[1], "qty": output_categories[k]} for k in output_categories]
        out["output_category_field"] = "Item Group of each finished-goods row (Stock Entry Detail.item_group); Item.item_main_group is not populated for produced items"
        out["output_review_entries"] = [{"se": k, "groups": se_grp[k]} for k in se_grp if len(se_grp[k]) > 1][:50]
        out["output_unclassified_rows"] = out_uncl
        out["series"] = [{"date": k.split("||")[0], "uom": k.split("||")[1], "qty": series[k]} for k in series]
        out["cost_series"] = [{"date": k, "material": cost_series[k]} for k in cost_series]
        out["material_cost"] = mat
        out["additional_costs"] = addl
        out["additional_cost_entries"] = addl_docs
        out["fg_valuation"] = val
        out["value_difference"] = vdiff
        out["negative_value_difference_entries"] = negs
        cat = {}
        catn = {}
        multi_cat = []
        uncl = []
        for k in se_vd:
            gl = se_grp.get(k) or []
            if len(gl) == 0:
                c = "Unclassified"
                uncl.append(k)
            elif len(gl) > 1:
                c = "Multiple categories"
                multi_cat.append({"se": k, "groups": gl})
            else:
                c = gl[0]
            cat[c] = frappe.utils.flt(cat.get(c)) + se_vd[k]
            catn[c] = frappe.utils.cint(catn.get(c)) + 1
        out["category_field"] = "Item Group of the finished-goods row (Stock Entry Detail.item_group)"
        out["categories"] = sorted([{"category": c, "value_difference": cat[c], "entries": catn[c]} for c in cat], key=lambda x: x["value_difference"], reverse=True)
        out["multiple_category_entries"] = multi_cat[:25]
        out["multiple_category_count"] = len(multi_cat)
        out["unclassified_entries"] = uncl[:25]
        out["unclassified_count"] = len(uncl)
        if admin and not factory:
            ex = frappe.get_list("Stock Entry", filters=base + ([["Stock Entry Detail", "t_warehouse", "not in", whs]] if whs else []),
                fields=["`tabStock Entry Detail`.t_warehouse as wh", "`tabStock Entry Detail`.stock_uom as uom",
                        "sum(`tabStock Entry Detail`.transfer_qty) as qty", "count(`tabStock Entry`.name) as n", "sum(`tabStock Entry`.total_outgoing_value) as mat"],
                group_by="`tabStock Entry Detail`.t_warehouse, `tabStock Entry Detail`.stock_uom", limit_page_length=200)
            diag["excluded_output"] = ex
    except Exception:
        out = {"access": "Access unavailable: Stock Entry"}
        by_item = {}
    res["output"] = out

    # Labour / process cost = Factory Daily Production "Total Achieved Amount"
    # (print format "Factory Output and Overtime - Management": SUM(actual_qty x rate) per employee; document total = SUM over all rows).
    def lnorm(v):
        return S(v).lower().replace(" ", "")
    def liso(v):
        t = S(v)
        if len(t) != 10 or t[4] != "-" or t[7] != "-":
            return False
        return (t[0:4] + t[5:7] + t[8:10]).isdigit()
    lab = {"access": "ok", "source": "Factory Daily Production - Total Achieved Amount"}
    try:
        LP = "`tabFactory Daily Production`"
        LC = "`tabDaily Production Table`"
        lsingle = {}
        for o in sc["scope"]:
            if o["branch_label"]:
                lsingle[lnorm(o["branch_label"])] = o["label"]
        lall = [o["label"] for o in sc["options"]]
        lcomb = {"28/34stores": ["28 Factory", "34 Factory"]}
        lraw = frappe.get_list("Factory Daily Production", filters=[["Factory Daily Production", "docstatus", "<", 2], ["Factory Daily Production", "date", ">=", S(start)], ["Factory Daily Production", "date", "<=", S(end)]],
            fields=[LP + ".name as doc", LP + ".date as d", LP + ".branch as branch", LP + ".workflow_state as ws", LP + ".docstatus as ds", LC + ".actual_qty as aq", LC + ".rate as rate", LC + ".employee as emp", LC + ".duty_hours as dh", LC + ".ot_type as ott", LC + ".additional as ad", LC + ".ot_amount as oa"],
            limit_page_length=20001)
        lab["truncated"] = len(lraw) > 20000
        ldocs = {}
        lorder = []
        for r in lraw[:20000]:
            k = r.get("doc")
            if k not in ldocs:
                ldocs[k] = {"d": S(r.get("d")), "branch": r.get("branch"), "ws": r.get("ws"), "ds": r.get("ds"), "amt": 0.0, "rows": []}
                lorder.append(k)
            ldocs[k]["amt"] = ldocs[k]["amt"] + frappe.utils.flt(r.get("aq")) * frappe.utils.flt(r.get("rate"))
            ldocs[k]["rows"].append(r)
        appr = 0.0
        unap = 0.0
        lemp = {}
        napp = 0
        nun = 0
        bad_d = 0
        amb = 0
        exst = []
        exbr = {}
        lseries = {}
        ldoclist = []
        for k in lorder:
            x = ldocs[k]
            if not liso(x["d"]):
                bad_d = bad_d + 1
                continue
            nb = lnorm(x["branch"])
            fac = lsingle.get(nb)
            if not fac and nb in lcomb:
                okc = True
                for n in lcomb[nb]:
                    if n not in lall:
                        okc = False
                if okc and not factory:
                    fac = " + ".join(lcomb[nb]) + " (combined record)"
                elif okc:
                    amb = amb + 1
                    continue
            if not fac:
                exbr[S(x["branch"])] = frappe.utils.cint(exbr.get(S(x["branch"]))) + 1
                continue
            amt = x["amt"]
            if x["ds"] == 1 and x["ws"] == "Approved":
                state = "Approved"
            elif x["ds"] == 0 and (x["ws"] in ["Draft", "Pending Review"] or not x["ws"]):
                state = "Unapproved"
            else:
                exst.append({"doc": k, "state": S(x["ws"]), "docstatus": x["ds"]})
                continue
            # Per-employee earnings, hours and overtime (same records, factories and states as the cost card).
            for rr in x["rows"]:
                ename = S(rr.get("emp")) or "(No employee)"
                ag = lemp.get(ename)
                if not ag:
                    ag = {"achieved": 0.0, "ot_amount": 0.0, "shortfall": 0.0, "earn_approved": 0.0,
                          "earn_unapproved": 0.0, "ot_hours": 0.0, "ot_short_hours": 0.0, "days": {},
                          "bad_hours": 0, "rows": 0, "incentive_rows": 0}
                    lemp[ename] = ag
                ach = frappe.utils.flt(rr.get("aq")) * frappe.utils.flt(rr.get("rate"))
                oa = frappe.utils.flt(rr.get("oa"))
                pos = oa if oa > 0 else 0.0
                ag["achieved"] = ag["achieved"] + ach
                ag["ot_amount"] = ag["ot_amount"] + pos
                if oa < 0:
                    ag["shortfall"] = ag["shortfall"] - oa
                if state == "Approved":
                    ag["earn_approved"] = ag["earn_approved"] + ach + pos
                else:
                    ag["earn_unapproved"] = ag["earn_unapproved"] + ach + pos
                ott = S(rr.get("ott")).strip().lower()
                adv = frappe.utils.flt(rr.get("ad"))
                if ott == "hourly":
                    if adv > 0:
                        ag["ot_hours"] = ag["ot_hours"] + adv
                    elif adv < 0:
                        ag["ot_short_hours"] = ag["ot_short_hours"] - adv
                elif ott == "incentive":
                    ag["incentive_rows"] = ag["incentive_rows"] + 1
                dh = rr.get("dh")
                if dh is None or frappe.utils.flt(dh) < 0:
                    ag["bad_hours"] = ag["bad_hours"] + 1
                else:
                    prev = ag["days"].get(x["d"])
                    if prev is None or frappe.utils.flt(dh) > prev:
                        ag["days"][x["d"]] = frappe.utils.flt(dh)
                ag["rows"] = ag["rows"] + 1
            if x["d"] not in lseries:
                lseries[x["d"]] = {"approved": 0.0, "unapproved": 0.0}
            if state == "Approved":
                appr = appr + amt
                napp = napp + 1
                lseries[x["d"]]["approved"] = lseries[x["d"]]["approved"] + amt
            else:
                unap = unap + amt
                nun = nun + 1
                lseries[x["d"]]["unapproved"] = lseries[x["d"]]["unapproved"] + amt
            if len(ldoclist) < 60:
                ldoclist.append({"doc": k, "date": x["d"], "factory": fac, "state": state, "amount": amt})
        lab["approved"] = appr
        lab["unapproved"] = unap
        lab["approved_records"] = napp
        lab["unapproved_records"] = nun
        lemp_out = []
        for ename in lemp:
            ag = lemp[ename]
            hrs = 0.0
            worked = 0
            for dd in ag["days"]:
                hrs = hrs + ag["days"][dd]
                if ag["days"][dd] > 0:
                    worked = worked + 1
            lemp_out.append({"employee": ename, "achieved": ag["achieved"], "ot_amount": ag["ot_amount"],
                             "earnings": ag["achieved"] + ag["ot_amount"], "earn_approved": ag["earn_approved"],
                             "earn_unapproved": ag["earn_unapproved"], "shortfall": ag["shortfall"],
                             "duty_hours": hrs, "days": worked, "ot_hours": ag["ot_hours"],
                             "ot_short_hours": ag["ot_short_hours"], "incentive_rows": ag["incentive_rows"],
                             "bad_hours_rows": ag["bad_hours"], "rows": ag["rows"]})
        lab["employees"] = sorted(lemp_out, key=lambda z: -z["earnings"])
        # Hours and overtime from biometric Employee Checkin: first to last punch per employee per day.
        # Overtime = hours beyond the shift length (checkin shift, else Employee default shift).
        # Single-punch days and spans over 16 hours are "incomplete" and not counted.
        lab["hours_source"] = "Employee Checkin"
        try:
            enames = [z["employee"] for z in lemp_out if z["employee"] != "(No employee)"]
            ckrows = []
            if enames:
                ckrows = frappe.get_list("Employee Checkin",
                    filters=[["employee", "in", enames], ["time", ">=", S(start) + " 00:00:00"], ["time", "<=", S(end) + " 23:59:59"]],
                    fields=["employee", "time", "shift"], order_by="time asc", limit_page_length=50000)
            shift_len = {}
            for sh in frappe.get_list("Shift Type", fields=["name", "start_time", "end_time"], limit_page_length=500):
                if sh.start_time is not None and sh.end_time is not None:
                    ln = (sh.end_time.total_seconds() - sh.start_time.total_seconds()) / 3600.0
                    if ln <= 0:
                        ln = ln + 24.0
                    shift_len[sh.name] = ln
            default_shift = {}
            try:
                for ee in frappe.get_list("Employee", filters=[["name", "in", enames]], fields=["name", "default_shift"], limit_page_length=0):
                    default_shift[ee.name] = ee.default_shift
            except Exception:
                default_shift = {}
            cdays = {}
            for c in ckrows:
                dk = S(c.employee) + "||" + S(c.time)[:10]
                cd = cdays.get(dk)
                if not cd:
                    cd = {"first": c.time, "last": c.time, "n": 0, "shift": None}
                    cdays[dk] = cd
                cd["last"] = c.time
                cd["n"] = cd["n"] + 1
                if c.shift and not cd["shift"]:
                    cd["shift"] = c.shift
            cagg = {}
            for dk in cdays:
                cd = cdays[dk]
                en = dk.split("||")[0]
                a = cagg.get(en) or {"hours": 0.0, "ot": 0.0, "days": 0, "incomplete": 0, "no_shift": 0, "long": 0}
                cagg[en] = a
                span = (cd["last"] - cd["first"]).total_seconds() / 3600.0
                if cd["n"] < 2 or span <= 0 or span > 16:
                    a["incomplete"] = a["incomplete"] + 1
                    continue
                a["days"] = a["days"] + 1
                a["hours"] = a["hours"] + span
                if span > 13:
                    a["long"] = a["long"] + 1
                sl = shift_len.get(cd["shift"] or default_shift.get(en))
                if sl:
                    if span > sl:
                        a["ot"] = a["ot"] + (span - sl)
                else:
                    a["no_shift"] = a["no_shift"] + 1
            for z in lemp_out:
                a = cagg.get(z["employee"])
                z["ck_hours"] = a["hours"] if a else 0.0
                z["ck_ot_hours"] = a["ot"] if a else 0.0
                z["ck_days"] = a["days"] if a else 0
                z["ck_incomplete_days"] = a["incomplete"] if a else 0
                z["ck_no_shift_days"] = a["no_shift"] if a else 0
                z["ck_long_days"] = a["long"] if a else 0
            lab["hours_access"] = "ok"
            lab["checkins_truncated"] = len(ckrows) >= 50000
        except Exception:
            lab["hours_access"] = "Access unavailable: Employee Checkin"
        lab["excluded_records"] = len(exst)
        lab["excluded_status_docs"] = exst[:20]
        lab["records"] = napp + nun + len(exst)
        lab["invalid_text_dates"] = bad_d
        lab["combined_not_attributable"] = amb
        lab["docs"] = ldoclist
        lab["series"] = [{"date": k, "approved": lseries[k]["approved"], "unapproved": lseries[k]["unapproved"]} for k in lseries]
        if admin and not factory:
            diag["excluded_labour"] = [{"branch": b, "n": exbr[b], "amount": None} for b in exbr]
    except Exception:
        lab = {"access": "Access unavailable: Factory Daily Production"}
    res["labour"] = lab

    tgt = {"access": "ok"}
    try:
        scope_names = [o["name"] for o in sc["scope"]]
        name_to_label = {}
        for o in sc["scope"]:
            name_to_label[o["name"]] = o["label"]
        trows = []
        dcount = 0
        if scope_names:
            tf = [["company", "=", company], ["target_date", ">=", S(start)], ["target_date", "<=", S(end)], ["factory", "in", scope_names]]
            trows = frappe.get_list("Manufacturing Production Target", filters=tf + [["docstatus", "=", 1]],
                fields=["name", "factory", "item_code", "item_name", "uom", "target_date", "target_qty", "target_cost"], limit_page_length=LIMIT)
            dcount = len(frappe.get_list("Manufacturing Production Target", filters=tf + [["docstatus", "=", 0]], pluck="name", limit_page_length=LIMIT))
        tgt["draft_count"] = dcount
        tc = {"full": 0.0, "to_date": 0.0, "records": 0, "records_without_cost": 0, "keys": {}}
        tg = {}
        for t in trows:
            k = S(name_to_label.get(t.get("factory"))) + "||" + S(t.get("item_code")) + "||" + S(t.get("uom"))
            if k not in tg:
                tg[k] = {"full": 0.0, "to_date": 0.0, "item_name": t.get("item_name")}
            tg[k]["full"] = tg[k]["full"] + frappe.utils.flt(t.get("target_qty"))
            tcv = frappe.utils.flt(t.get("target_cost"))
            if tcv > 0:
                tc["full"] = tc["full"] + tcv
                tc["records"] = tc["records"] + 1
                tc["keys"][k] = 1
                if to_date_end and frappe.utils.getdate(t.get("target_date")) <= to_date_end:
                    tc["to_date"] = tc["to_date"] + tcv
            else:
                tc["records_without_cost"] = tc["records_without_cost"] + 1
            if to_date_end and frappe.utils.getdate(t.get("target_date")) <= to_date_end:
                tg[k]["to_date"] = tg[k]["to_date"] + frappe.utils.flt(t.get("target_qty"))
        rows = []
        keys = [k for k in by_item]
        for k in tg:
            if k not in by_item:
                keys.append(k)
        uom_sum = {}
        for k in keys:
            parts = k.split("||")
            a = by_item.get(k)
            actual = a["actual"] if a else 0.0
            row = {"factory": parts[0], "item": parts[1], "uom": parts[2], "item_name": (a["item_name"] if a else tg[k]["item_name"]), "actual": actual,
                   "target_full": None, "target_to_date": None, "basis": None, "achievement": None, "status": "No target"}
            if k in tg:
                row["target_full"] = tg[k]["full"]
                row["target_to_date"] = tg[k]["to_date"]
                basis = tg[k]["to_date"] if partial else tg[k]["full"]
                if future:
                    basis = 0
                row["basis"] = basis
                if basis <= 0:
                    row["status"] = "N/A"
                else:
                    row["achievement"] = actual / basis * 100.0
                    row["status"] = "Achieved" if actual >= basis else "Not Achieved"
                u = parts[2]
                if u not in uom_sum:
                    uom_sum[u] = {"uom": u, "actual": 0.0, "basis": 0.0, "full": 0.0, "to_date": 0.0}
                uom_sum[u]["full"] = uom_sum[u]["full"] + tg[k]["full"]
                uom_sum[u]["to_date"] = uom_sum[u]["to_date"] + tg[k]["to_date"]
                if basis > 0:
                    uom_sum[u]["basis"] = uom_sum[u]["basis"] + basis
                    uom_sum[u]["actual"] = uom_sum[u]["actual"] + actual
            rows.append(row)
        summ = []
        for u in uom_sum:
            s = uom_sum[u]
            s["achievement"] = (s["actual"] / s["basis"] * 100.0) if s["basis"] > 0 else None
            summ.append(s)
        unt = {}
        for k in by_item:
            if k not in tg:
                u = k.split("||")[2]
                unt[u] = frappe.utils.flt(unt.get(u)) + by_item[k]["actual"]
        tgt["untargeted_by_uom"] = [{"uom": u, "qty": unt[u]} for u in unt]
        tgt["rows"] = rows
        tgt["by_uom"] = summ
        tgt["configured"] = len(trows) > 0
        # Target production cost (Manufacturing Production Target.target_cost), same basis as target qty.
        cbasis = tc["to_date"] if partial else tc["full"]
        if future:
            cbasis = 0.0
        missing_items = []
        for k in by_item:
            if k not in tc["keys"]:
                missing_items.append(k.replace("||", " · "))
        tgt["cost"] = {"full": tc["full"], "to_date": tc["to_date"], "basis": cbasis,
                       "basis_label": "targets dated up to today" if partial else "full-period targets",
                       "records": tc["records"], "records_without_cost": tc["records_without_cost"],
                       "produced_without_cost_target": missing_items[:30],
                       "produced_without_cost_target_count": len(missing_items),
                       "complete": tc["records"] > 0 and len(missing_items) == 0}
    except Exception:
        tgt = {"access": "Access unavailable: Manufacturing Production Target"}
    res["targets"] = tgt
    if admin:
        res["diagnostics"] = diag
frappe.response["message"] = res
