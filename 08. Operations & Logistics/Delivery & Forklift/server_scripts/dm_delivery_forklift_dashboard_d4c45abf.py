# DM Delivery & Forklift Dashboard - data API (read-only)  v2 (field-level permission checks)
# api_method: dm_delivery_forklift_dashboard
# Record access: frappe.get_list (role + user-permission checked).
# Field access: every requested field is checked against the user's readable permlevels
#   (meta.permissions incl. Custom DocPerm + frappe.get_roles). permlevel 0 is covered by the
#   record read check. If a field's access cannot be verified it is DENIED (fail closed) and every
#   metric that depends on it is returned as null (unavailable) - never as zero.
# No writes.

args = frappe.form_dict
action = (args.get("action") or "data").strip()

FL_FIELDS = ["loading_trailer", "unloading_trailer", "loading_dayana", "unloading_dayana",
             "loading_container", "unloading_container", "loading_pickup", "unloading_pickup"]
FL_LABELS = {"loading_trailer": "Loading Trailer", "unloading_trailer": "Unloading Trailer",
             "loading_dayana": "Loading Dayana", "unloading_dayana": "Unloading Dayana",
             "loading_container": "Loading Container", "unloading_container": "Unloading Container",
             "loading_pickup": "Loading Pick Up", "unloading_pickup": "Unloading Pick Up"}
ROW_CAP = 3000
STD_FIELDS = ["name", "docstatus"]

DT_FIELDS = ["name", "docstatus", "status", "delivery_status", "company", "custom_trip_type_",
             "custom_delivery_date", "driver", "driver_name", "vehicle", "custom_total_amount_earned",
             "custom_driver_reporting_time__at_warehouse", "departure_time", "custom_delivered_time",
             "custom_driver__out_of_site", "custom_source_warehouse", "custom_delivery_to_warehouse"]
FLK_FIELDS = ["name", "docstatus", "status", "date", "warehouse", "forklift_no", "driver", "driver_name"] + FL_FIELDS
WH_FIELDS = ["name", "company", "is_group"]

# Optional test hook: can only REMOVE fields from what the user may read (never grants access).
test_deny = [x.strip() for x in str(args.get("test_deny_fields") or "").split(",") if x.strip()]


def fetch(dt, fields, filters, or_filters):
    out = []
    start = 0
    size = 2000
    while True:
        batch = frappe.get_list(dt, fields=fields, filters=filters, or_filters=or_filters,
                                limit_start=start, limit_page_length=size, order_by="name asc")
        out.extend(batch)
        if len(batch) < size:
            break
        start = start + size
    return out


def can_read(dt):
    # permission-checked probe: get_list raises PermissionError without record read access
    try:
        frappe.get_list(dt, fields=["name"], limit_page_length=1)
        return True
    except Exception:
        return False


def field_access(dt, fields, record_ok):
    # returns {"allowed": [...], "denied": {field: reason}, "check": "..."}
    res = {"allowed": [], "denied": {}, "check": "verified"}
    if not record_ok:
        for f in fields:
            res["denied"][f] = "no record read access"
        res["check"] = "no record access"
        return res
    meta = None
    levels = None
    try:
        meta = frappe.get_meta(dt)
    except Exception:
        meta = None
    roles = None
    try:
        # current user's own roles (used only to RESTRICT field output; never grants access)
        roles = ["All", "Guest"] + [x.role for x in frappe.get_doc("User", frappe.session.user).roles]
    except Exception:
        roles = None
    levels = None
    if roles is not None and meta is not None:
        try:
            lvls = []
            for p in meta.permissions:
                lv = p.permlevel or 0
                if p.role in roles and p.read and lv not in lvls:
                    lvls.append(lv)
            levels = lvls
        except Exception:
            levels = None
    if meta is None:
        res["check"] = "field metadata unavailable - all fields denied"
    elif levels is None:
        res["check"] = "permlevel access could not be verified - fields above level 0 denied"
    for f in fields:
        if f in test_deny:
            res["denied"][f] = "denied by test_deny_fields"
            continue
        if meta is None:
            res["denied"][f] = "field metadata unavailable"
            continue
        if f in STD_FIELDS:
            res["allowed"].append(f)
            continue
        df = meta.get_field(f)
        if not df:
            res["denied"][f] = "field not found"
            continue
        lv = df.permlevel or 0
        if lv == 0:
            res["allowed"].append(f)
        elif levels is None:
            res["denied"][f] = "cannot verify read access at permlevel " + str(lv)
        elif lv in levels:
            res["allowed"].append(f)
        else:
            res["denied"][f] = "no read access at permlevel " + str(lv)
    return res


def s(v):
    if v is None:
        return ""
    return str(v)


def bump(d, k, n):
    d[k] = d.get(k, 0) + n


def parse_count(v):
    if v is None:
        return (0, None)
    t = str(v).strip()
    if t == "":
        return (0, None)
    try:
        n = float(t)
    except Exception:
        return (0, "nonnumeric")
    if n < 0:
        return (0, "negative")
    return (n, None)


def secs(a, b):
    da = frappe.utils.get_datetime(a)
    db_ = frappe.utils.get_datetime(b)
    return (db_ - da).total_seconds()


def tolist(d, keyname):
    return [dict([(keyname, k)] + list(v.items())) if isinstance(v, dict) else {keyname: k, "value": v}
            for k, v in sorted(d.items(), key=lambda x: str(x[0]))]


def null_keys(d, keys):
    for k in keys:
        if k in d:
            d[k] = None


from_date = s(args.get("from_date"))[:10]
to_date = s(args.get("to_date"))[:10]
company = s(args.get("company")).strip()
warehouse = s(args.get("warehouse")).strip()
driver = s(args.get("driver")).strip()
vehicle = s(args.get("vehicle")).strip()
forklift = s(args.get("forklift")).strip().upper()
trip_type = s(args.get("trip_type")).strip()

access = {"delivery_trip": can_read("Delivery Trip"), "forklift": can_read("ForkLift"),
          "warehouse": can_read("Warehouse")}
FA = {"Delivery Trip": field_access("Delivery Trip", DT_FIELDS, access["delivery_trip"]),
      "ForkLift": field_access("ForkLift", FLK_FIELDS, access["forklift"]),
      "Warehouse": field_access("Warehouse", WH_FIELDS, access["warehouse"])}
ADT = FA["Delivery Trip"]["allowed"]
AFL = FA["ForkLift"]["allowed"]
AWH = FA["Warehouse"]["allowed"]
field_report = {}
for k in FA:
    field_report[k] = {"check": FA[k]["check"], "denied": FA[k]["denied"]}

# ---------------- options (filter choices, permission-checked) ----------------
if action == "options":
    opts = {"access": access, "field_access": field_report, "companies": [], "warehouses": [],
            "drivers": [], "vehicles": [], "forklifts": [], "trip_types": []}
    if access["warehouse"]:
        wcols = [x for x in ["name", "company", "is_group"] if x in AWH]
        whs = fetch("Warehouse", wcols, {"is_group": 0} if "is_group" in AWH else {}, None)
        opts["warehouses"] = [{"name": w.name, "company": w.get("company")} for w in whs]
    try:
        opts["companies"] = [c.name for c in frappe.get_list("Company", fields=["name"], limit_page_length=0)]
    except Exception:
        opts["companies"] = []
    drv = {}
    if access["delivery_trip"]:
        cols = [x for x in ["driver", "driver_name", "vehicle"] if x in ADT]
        if cols:
            for r in fetch("Delivery Trip", cols, {"docstatus": ["!=", 2]}, None):
                if r.get("driver"):
                    drv[r.driver] = r.get("driver_name") or r.driver
                if r.get("vehicle"):
                    opts["vehicles"].append(r.vehicle)
        if "custom_trip_type_" in ADT:
            df = frappe.get_meta("Delivery Trip").get_field("custom_trip_type_")
            opts["trip_types"] = [x for x in s(df.options).split("\n") if x.strip()]
    fk = {}
    if access["forklift"]:
        cols = [x for x in ["driver", "driver_name", "forklift_no"] if x in AFL]
        if cols:
            for r in fetch("ForkLift", cols, {"docstatus": ["!=", 2]}, None):
                if r.get("driver"):
                    drv[r.driver] = r.get("driver_name") or r.driver
                k = s(r.get("forklift_no")).strip().upper()
                if k:
                    fk[k] = 1
    opts["drivers"] = [{"name": k, "label": v} for k, v in sorted(drv.items(), key=lambda x: str(x[1]))]
    opts["vehicles"] = sorted(list(set(opts["vehicles"])))
    opts["forklifts"] = sorted(fk.keys())
    frappe.response["message"] = opts

else:
    if not from_date or not to_date or from_date > to_date:
        frappe.throw("Valid From Date and To Date are required")

    res = {"version": 2,
           "filters": {"from_date": from_date, "to_date": to_date, "company": company,
                       "warehouse": warehouse, "driver": driver, "vehicle": vehicle,
                       "forklift": forklift, "trip_type": trip_type},
           "access": access, "field_access": field_report,
           "generated_at": str(frappe.utils.now_datetime()), "timezone": "Asia/Riyadh",
           "limitations": [], "delivery": None, "forklift": None}

    # warehouse -> company map (permission-checked)
    wh_company = {}
    wh_company_ok = access["warehouse"] and ("company" in AWH)
    if wh_company_ok:
        for w in fetch("Warehouse", ["name", "company"], {}, None):
            wh_company[w.name] = w.company

    # ======================= DELIVERY TRIP =======================
    if not access["delivery_trip"]:
        res["delivery"] = {"available": False, "reason": "No read access to Delivery Trip"}
    else:
        need = ["name", "docstatus", "custom_delivery_date", "departure_time"]
        if company:
            need.append("company")
        if driver:
            need.append("driver")
        if vehicle:
            need.append("vehicle")
        if trip_type:
            need.append("custom_trip_type_")
        if warehouse:
            need = need + ["custom_source_warehouse", "custom_delivery_to_warehouse"]
        miss = [x for x in need if x not in ADT]
        if miss:
            res["delivery"] = {"available": False,
                               "reason": "Field access required for the trip date or the selected filters is unavailable: " + ", ".join(miss)}
        else:
            f = {"docstatus": ["!=", 2]}
            if company:
                f["company"] = company
            if driver:
                f["driver"] = driver
            if vehicle:
                f["vehicle"] = vehicle
            if trip_type:
                f["custom_trip_type_"] = trip_type
            orf = [["custom_delivery_date", "between", [from_date, to_date]],
                   ["departure_time", "between", [from_date + " 00:00:00", to_date + " 23:59:59.999999"]]]
            cand = fetch("Delivery Trip", ADT, f, orf)

            has_ds = "delivery_status" in ADT
            has_amt = "custom_total_amount_earned" in ADT
            has_drv = "driver" in ADT
            has_veh = "vehicle" in ADT
            has_type = "custom_trip_type_" in ADT
            has_o = "custom_source_warehouse" in ADT
            has_d = "custom_delivery_to_warehouse" in ADT
            pairs = [["warehouse_wait", "custom_driver_reporting_time__at_warehouse", "departure_time"],
                     ["travel", "departure_time", "custom_delivered_time"],
                     ["site_wait", "custom_delivered_time", "custom_driver__out_of_site"]]
            pair_ok = {}
            for p in pairs:
                pair_ok[p[0]] = (p[1] in ADT) and (p[2] in ADT)

            sub = {"trips": 0, "delivered": 0, "partially_delivered": 0, "not_delivered": 0, "no_status": 0,
                   "amount": 0.0, "fallback_date": 0, "date_mismatch": 0}
            dr = {"trips": 0, "delivered": 0, "amount": 0.0, "fallback_date": 0}
            by_status = {}
            by_docstatus_status = {}
            by_date = {}
            by_driver = {}
            by_vehicle = {}
            by_origin = {}
            by_dest = {}
            by_wh = {}
            by_type = {}
            timing = {}
            for p in pairs:
                timing[p[0]] = {"valid_pairs": 0, "total_seconds": 0.0, "missing": 0, "reversed": 0,
                                "over_24h": 0, "avg_minutes": None}
            drv_time = {}
            attention = {"missing_driver": 0, "missing_trip_type": 0, "missing_origin": 0,
                         "missing_destination": 0, "reversed_timestamps": 0, "over_24h": 0,
                         "date_mismatch": 0, "draft_marked_delivered": 0}
            rows = []
            for r in cand:
                dep = s(r.get("departure_time"))[:10]
                dd = s(r.get("custom_delivery_date"))[:10]
                eff = dd if dd else dep
                fallback = 0 if dd else 1
                if not eff or eff < from_date or eff > to_date:
                    continue
                o = r.get("custom_source_warehouse") or ""
                d = r.get("custom_delivery_to_warehouse") or ""
                if warehouse and o != warehouse and d != warehouse:
                    continue
                mismatch = 1 if (dd and dep and dd != dep) else 0
                amt = frappe.utils.flt(r.get("custom_total_amount_earned"))
                ds = r.get("delivery_status") or "(blank)"
                bump(by_docstatus_status, ("Submitted" if r.docstatus == 1 else "Draft") + " | " + ds, 1)
                flags = []
                if has_drv and not r.get("driver"):
                    flags.append("missing driver")
                if has_type and not r.get("custom_trip_type_"):
                    flags.append("missing trip type")
                if has_o and not o:
                    flags.append("missing origin")
                if has_d and not d:
                    flags.append("missing destination")
                if mismatch:
                    flags.append("delivery date differs from departure date")
                tvals = {}
                for p in pairs:
                    if not pair_ok[p[0]]:
                        tvals[p[0]] = None
                        continue
                    a = r.get(p[1])
                    b = r.get(p[2])
                    if not a or not b:
                        tvals[p[0]] = None
                        if r.docstatus == 1:
                            timing[p[0]]["missing"] = timing[p[0]]["missing"] + 1
                        continue
                    sec = secs(a, b)
                    if sec < 0:
                        tvals[p[0]] = None
                        flags.append(p[0].replace("_", " ") + " reversed")
                        if r.docstatus == 1:
                            timing[p[0]]["reversed"] = timing[p[0]]["reversed"] + 1
                        continue
                    tvals[p[0]] = round(sec / 60.0, 1)
                    if sec > 86400:
                        flags.append(p[0].replace("_", " ") + " over 24h")
                    if r.docstatus == 1:
                        t = timing[p[0]]
                        t["valid_pairs"] = t["valid_pairs"] + 1
                        t["total_seconds"] = t["total_seconds"] + sec
                        if sec > 86400:
                            t["over_24h"] = t["over_24h"] + 1
                        dk = r.get("driver") or "(no driver)"
                        if dk not in drv_time:
                            drv_time[dk] = {}
                        if p[0] not in drv_time[dk]:
                            drv_time[dk][p[0]] = [0, 0.0]
                        drv_time[dk][p[0]][0] = drv_time[dk][p[0]][0] + 1
                        drv_time[dk][p[0]][1] = drv_time[dk][p[0]][1] + sec

                if r.docstatus == 1:
                    sub["trips"] = sub["trips"] + 1
                    sub["amount"] = sub["amount"] + amt
                    sub["fallback_date"] = sub["fallback_date"] + fallback
                    sub["date_mismatch"] = sub["date_mismatch"] + mismatch
                    if ds == "Delivered":
                        sub["delivered"] = sub["delivered"] + 1
                    elif ds == "Partially Delivered":
                        sub["partially_delivered"] = sub["partially_delivered"] + 1
                    elif ds == "Not Delivered":
                        sub["not_delivered"] = sub["not_delivered"] + 1
                    else:
                        sub["no_status"] = sub["no_status"] + 1
                    bump(by_status, ds, 1)
                    if eff not in by_date:
                        by_date[eff] = {"trips": 0, "delivered": 0, "amount": 0.0}
                    by_date[eff]["trips"] = by_date[eff]["trips"] + 1
                    by_date[eff]["amount"] = by_date[eff]["amount"] + amt
                    if ds == "Delivered":
                        by_date[eff]["delivered"] = by_date[eff]["delivered"] + 1
                    dk = r.get("driver") or "(no driver)"
                    if dk not in by_driver:
                        by_driver[dk] = {"driver_name": r.get("driver_name") or "", "trips": 0, "delivered": 0, "amount": 0.0}
                    by_driver[dk]["trips"] = by_driver[dk]["trips"] + 1
                    by_driver[dk]["amount"] = by_driver[dk]["amount"] + amt
                    if ds == "Delivered":
                        by_driver[dk]["delivered"] = by_driver[dk]["delivered"] + 1
                    vk = r.get("vehicle") or "(no vehicle)"
                    if vk not in by_vehicle:
                        by_vehicle[vk] = {"trips": 0, "delivered": 0, "amount": 0.0}
                    by_vehicle[vk]["trips"] = by_vehicle[vk]["trips"] + 1
                    by_vehicle[vk]["amount"] = by_vehicle[vk]["amount"] + amt
                    if ds == "Delivered":
                        by_vehicle[vk]["delivered"] = by_vehicle[vk]["delivered"] + 1
                    bump(by_origin, o or "(no origin)", 1)
                    bump(by_dest, d or "(no destination)", 1)
                    for wk in list(set([x for x in [o, d] if x])):
                        bump(by_wh, wk, 1)
                    bump(by_type, r.get("custom_trip_type_") or "(blank)", 1)
                    for k in ["missing driver", "missing trip type", "missing origin", "missing destination"]:
                        if k in flags:
                            attention[k.replace(" ", "_")] = attention[k.replace(" ", "_")] + 1
                    if mismatch:
                        attention["date_mismatch"] = attention["date_mismatch"] + 1
                    if [x for x in flags if x.endswith("reversed")]:
                        attention["reversed_timestamps"] = attention["reversed_timestamps"] + 1
                    if [x for x in flags if x.endswith("over 24h")]:
                        attention["over_24h"] = attention["over_24h"] + 1
                else:
                    dr["trips"] = dr["trips"] + 1
                    dr["amount"] = dr["amount"] + amt
                    dr["fallback_date"] = dr["fallback_date"] + fallback
                    if ds == "Delivered":
                        dr["delivered"] = dr["delivered"] + 1
                        attention["draft_marked_delivered"] = attention["draft_marked_delivered"] + 1

                rows.append({"name": r.name, "docstatus": r.docstatus, "doc_status": r.get("status"),
                             "delivery_status": r.get("delivery_status"), "effective_date": eff,
                             "date_source": "departure_time (fallback)" if fallback else "custom_delivery_date",
                             "company": r.get("company"), "trip_type": r.get("custom_trip_type_"),
                             "driver": r.get("driver"), "driver_name": r.get("driver_name"),
                             "vehicle": r.get("vehicle"), "origin": r.get("custom_source_warehouse"),
                             "destination": r.get("custom_delivery_to_warehouse"),
                             "amount": amt if has_amt else None,
                             "warehouse_wait_min": tvals.get("warehouse_wait"),
                             "travel_min": tvals.get("travel"), "site_wait_min": tvals.get("site_wait"),
                             "flags": flags})

            for k in timing:
                t = timing[k]
                if t["valid_pairs"]:
                    t["avg_minutes"] = round(t["total_seconds"] / t["valid_pairs"] / 60.0, 1)
                t["total_seconds"] = round(t["total_seconds"], 0)
            driver_timing = []
            for dk in sorted(drv_time.keys()):
                e = {"driver": dk}
                for pk in drv_time[dk]:
                    e[pk + "_pairs"] = drv_time[dk][pk][0]
                    e[pk + "_avg_min"] = round(drv_time[dk][pk][1] / drv_time[dk][pk][0] / 60.0, 1)
                driver_timing.append(e)
            rows.sort(key=lambda x: (x["effective_date"], x["name"]), reverse=True)
            sub["amount"] = round(sub["amount"], 2)
            dr["amount"] = round(dr["amount"], 2)
            bd = tolist(by_date, "date")
            bdrv = tolist(by_driver, "driver")
            bveh = tolist(by_vehicle, "vehicle")
            # ---- fail closed: null every metric that depends on a denied field ----
            if not has_ds:
                null_keys(sub, ["delivered", "partially_delivered", "not_delivered", "no_status"])
                null_keys(dr, ["delivered"])
                by_status = None
                by_docstatus_status = None
                null_keys(attention, ["draft_marked_delivered"])
                for x in bd + bdrv + bveh:
                    x["delivered"] = None
            if not has_amt:
                null_keys(sub, ["amount"])
                null_keys(dr, ["amount"])
                for x in bd + bdrv + bveh:
                    x["amount"] = None
            if not has_drv:
                bdrv = None
                driver_timing = None
                null_keys(attention, ["missing_driver"])
            elif "driver_name" not in ADT:
                for x in bdrv:
                    x["driver_name"] = None
            if not has_veh:
                bveh = None
            if not has_type:
                by_type = None
                null_keys(attention, ["missing_trip_type"])
            if not has_o:
                by_origin = None
                null_keys(attention, ["missing_origin"])
            if not has_d:
                by_dest = None
                null_keys(attention, ["missing_destination"])
            if not (has_o and has_d):
                by_wh = None
            for p in pairs:
                if not pair_ok[p[0]]:
                    timing[p[0]] = None
            if [p for p in pairs if not pair_ok[p[0]]]:
                null_keys(attention, ["reversed_timestamps", "over_24h"])
                driver_timing = None
            res["delivery"] = {
                "available": True, "label": "Submitted records", "submitted": sub, "draft": dr,
                "by_delivery_status": by_status, "by_docstatus_and_delivery_status": by_docstatus_status,
                "by_date": bd, "by_driver": bdrv, "by_vehicle": bveh,
                "by_origin": by_origin, "by_destination": by_dest,
                "by_warehouse_either": by_wh, "by_trip_type": by_type, "timing": timing,
                "driver_timing": driver_timing, "attention": attention,
                "unavailable_fields": FA["Delivery Trip"]["denied"],
                "row_count": len(rows), "rows_truncated": len(rows) > ROW_CAP, "rows": rows[:ROW_CAP]}

    # ======================= FORKLIFT =======================
    if not access["forklift"]:
        res["forklift"] = {"available": False, "reason": "No read access to ForkLift"}
    else:
        need = ["name", "docstatus", "date"] + FL_FIELDS
        if company or warehouse:
            need.append("warehouse")
        if driver:
            need.append("driver")
        if forklift:
            need.append("forklift_no")
        miss = [x for x in need if x not in AFL]
        if company and not wh_company_ok:
            res["forklift"] = {"available": False,
                               "reason": "Company filter: warehouse company cannot be verified (no read access to Warehouse company), so ForkLift records cannot be matched to a company."}
        elif miss:
            res["forklift"] = {"available": False,
                               "reason": "Field access required for forklift date, loading/unloading counts or the selected filters is unavailable: " + ", ".join(miss)}
        else:
            base = {"docstatus": ["!=", 2]}
            if driver:
                base["driver"] = driver
            if company:
                allowed_wh = [w for w in wh_company if wh_company[w] == company]
                if warehouse:
                    allowed_wh = [w for w in allowed_wh if w == warehouse]
                base["warehouse"] = ["in", allowed_wh or ["__none__"]]
            elif warehouse:
                base["warehouse"] = warehouse
            f = dict(base)
            f["date"] = ["between", [from_date, to_date]]
            recs = fetch("ForkLift", AFL, f, None)
            uf = dict(base)
            uf["date"] = ["is", "not set"]
            ucols = ["name", "docstatus"] + (["forklift_no"] if "forklift_no" in AFL else [])
            undated = fetch("ForkLift", ucols, uf, None)
            if forklift:
                recs = [r for r in recs if s(r.get("forklift_no")).strip().upper() == forklift]
                undated = [r for r in undated if s(r.get("forklift_no")).strip().upper() == forklift]
            has_fk = "forklift_no" in AFL
            has_wh = "warehouse" in AFL
            has_dr = "driver" in AFL

            sub = {"records": 0, "loading": 0.0, "unloading": 0.0, "operations": 0.0, "zero_activity": 0}
            dr = {"records": 0, "loading": 0.0, "unloading": 0.0, "operations": 0.0}
            by_field = {}
            for x in FL_FIELDS:
                by_field[x] = 0.0
            by_date = {}
            by_fk = {}
            by_wh = {}
            by_drv = {}
            dup = {}
            bad = []
            rows = []
            for r in recs:
                ld = 0.0
                ul = 0.0
                vals = {}
                rflags = []
                for x in FL_FIELDS:
                    pc = parse_count(r.get(x))
                    n = pc[0]
                    if pc[1]:
                        rflags.append(FL_LABELS[x] + " " + pc[1] + " (" + s(r.get(x)) + ")")
                        bad.append({"name": r.name, "field": x, "value": s(r.get(x)), "problem": pc[1]})
                    vals[x] = n
                    if x.startswith("loading"):
                        ld = ld + n
                    else:
                        ul = ul + n
                tot = ld + ul
                fk = (s(r.get("forklift_no")).strip().upper() or "(blank)") if has_fk else "(unavailable)"
                if has_fk and fk == "(blank)":
                    rflags.append("missing forklift no")
                if has_dr and not r.get("driver"):
                    rflags.append("missing driver")
                if tot == 0:
                    rflags.append("no loading/unloading recorded")
                if r.docstatus == 1:
                    sub["records"] = sub["records"] + 1
                    sub["loading"] = sub["loading"] + ld
                    sub["unloading"] = sub["unloading"] + ul
                    sub["operations"] = sub["operations"] + tot
                    if tot == 0:
                        sub["zero_activity"] = sub["zero_activity"] + 1
                    for x in FL_FIELDS:
                        by_field[x] = by_field[x] + vals[x]
                    dk = s(r.date)[:10]
                    if dk not in by_date:
                        by_date[dk] = {"loading": 0.0, "unloading": 0.0, "operations": 0.0, "records": 0}
                    by_date[dk]["loading"] = by_date[dk]["loading"] + ld
                    by_date[dk]["unloading"] = by_date[dk]["unloading"] + ul
                    by_date[dk]["operations"] = by_date[dk]["operations"] + tot
                    by_date[dk]["records"] = by_date[dk]["records"] + 1
                    for grp, key in [[by_fk, fk], [by_wh, r.get("warehouse") or "(no warehouse)"],
                                     [by_drv, r.get("driver") or "(no driver)"]]:
                        if key not in grp:
                            grp[key] = {"loading": 0.0, "unloading": 0.0, "operations": 0.0, "records": 0}
                        grp[key]["loading"] = grp[key]["loading"] + ld
                        grp[key]["unloading"] = grp[key]["unloading"] + ul
                        grp[key]["operations"] = grp[key]["operations"] + tot
                        grp[key]["records"] = grp[key]["records"] + 1
                    if r.get("driver") and "driver_name" not in by_drv[r.driver]:
                        by_drv[r.driver]["driver_name"] = r.get("driver_name") if "driver_name" in AFL else None
                    if has_fk and fk != "(blank)":
                        dkk = dk + " | " + fk
                        if dkk not in dup:
                            dup[dkk] = []
                        dup[dkk].append(r.name)
                else:
                    dr["records"] = dr["records"] + 1
                    dr["loading"] = dr["loading"] + ld
                    dr["unloading"] = dr["unloading"] + ul
                    dr["operations"] = dr["operations"] + tot
                row = {"name": r.name, "docstatus": r.docstatus, "status": r.get("status"), "date": s(r.date)[:10],
                       "warehouse": r.get("warehouse"), "forklift_no": r.get("forklift_no"),
                       "forklift_group": fk if has_fk else None,
                       "driver": r.get("driver"), "driver_name": r.get("driver_name"), "loading": ld,
                       "unloading": ul, "operations": tot, "flags": rflags}
                for x in FL_FIELDS:
                    row[x] = vals[x]
                rows.append(row)
            dups = [{"key": k, "records": v} for k, v in dup.items() if len(v) > 1]
            for rw in rows:
                k = rw["date"] + " | " + s(rw["forklift_group"])
                if k in dup and len(dup[k]) > 1 and rw["docstatus"] == 1:
                    rw["flags"].append("repeated date/forklift - review")
            rows.sort(key=lambda x: (x["date"], x["name"]), reverse=True)
            att = {"invalid_values": bad, "repeated_date_forklift": dups if has_fk else None,
                   "missing_driver": len([x for x in rows if "missing driver" in x["flags"]]) if has_dr else None,
                   "missing_forklift_no": len([x for x in rows if "missing forklift no" in x["flags"]]) if has_fk else None,
                   "zero_activity_submitted": sub["zero_activity"]}
            res["forklift"] = {
                "available": True, "label": "Submitted records", "submitted": sub, "draft": dr,
                "by_field": [{"field": x, "label": FL_LABELS[x], "value": by_field[x]} for x in FL_FIELDS],
                "by_date": tolist(by_date, "date"),
                "by_forklift": tolist(by_fk, "forklift") if has_fk else None,
                "by_warehouse": tolist(by_wh, "warehouse") if has_wh else None,
                "by_driver": tolist(by_drv, "driver") if has_dr else None,
                "undated": {"label": "Undated records (outside selected date range)",
                            "submitted": len([u for u in undated if u.docstatus == 1]),
                            "draft": len([u for u in undated if u.docstatus == 0])},
                "attention": att, "unavailable_fields": FA["ForkLift"]["denied"],
                "row_count": len(rows), "rows_truncated": len(rows) > ROW_CAP, "rows": rows[:ROW_CAP]}
            if company:
                res["limitations"].append("ForkLift has no company field; it is filtered through its warehouse's company. ForkLift records without a warehouse, or whose warehouse you cannot read, are excluded under the company filter.")
            if forklift:
                res["limitations"].append("Forklift filter compares trimmed, uppercased numbers; different identifiers (e.g. FK0041 vs FKJ0041) are not merged.")
    if warehouse:
        res["limitations"].append("Warehouse filter matches Delivery Trip origin OR destination (each trip counted once) and ForkLift warehouse.")
    if vehicle or trip_type:
        res["limitations"].append("Vehicle and trip type filters apply to Delivery Trip only.")
    if forklift:
        res["limitations"].append("Forklift number filter applies to ForkLift only.")
    frappe.response["message"] = res
