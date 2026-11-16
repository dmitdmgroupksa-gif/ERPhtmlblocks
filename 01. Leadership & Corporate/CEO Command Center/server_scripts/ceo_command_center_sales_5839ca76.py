# CEO Command Center Sales API
# Read-only, permission-aware grouped queries.
# No business records are created or modified.

user = frappe.session.user

if user == "Guest":
    frappe.throw("Please log in.")

roles = frappe.get_all(
    "Has Role",
    filters={"parent": user, "parenttype": "User"},
    pluck="role"
)

if (
    user != "info@dmgroupksa.com"
    and "System Manager" not in roles
    and "IT Coordinator" not in roles
    and "CEO Command Center Viewer" not in roles
):
    frappe.throw(
        "This dashboard is restricted to the CEO, System Manager, "
        "IT Coordinator and CEO Command Center Viewer."
    )

measure = frappe.form_dict.get("measure") or "invoiced"

if measure not in ["invoiced", "booked"]:
    frappe.throw("Invalid sales measure.")

doctype = "Sales Invoice"
date_field = "posting_date"
location_field = "location"
salesperson_field = "sales_person"

if measure == "booked":
    doctype = "Sales Order"
    date_field = "transaction_date"
    location_field = "location_"
    salesperson_field = "sales_persons"

# get_list checks read permission.
# Let genuine permission/database errors surface without relabelling them.
frappe.get_list(
    doctype,
    fields=["name"],
    limit_page_length=1
)

today = frappe.utils.getdate(frappe.utils.today())

from_date = frappe.utils.getdate(
    frappe.form_dict.get("from_date")
    or str(today)[:4] + "-01-01"
)

to_date = frappe.utils.getdate(
    frappe.form_dict.get("to_date") or today
)

days = frappe.utils.date_diff(to_date, from_date) + 1

if days < 1 or days > 366:
    frappe.throw("Select a valid date range of 366 days or less.")

company = frappe.form_dict.get("company") or ""
division = frappe.form_dict.get("division") or ""
location = frappe.form_dict.get("location") or ""
salesperson = frappe.form_dict.get("salesperson") or ""
level = frappe.form_dict.get("level") or "division"

if level not in ["company", "division", "location", "salesperson", "records"]:
    frappe.throw("Invalid drill-down level.")

period_type = frappe.form_dict.get("period") or ""

# Support old direct test URLs without a period parameter.
# Infer Yearly only for a full calendar-year range.
if not period_type:
    period_type = "Custom"

    if (
        str(from_date)[5:] == "01-01"
        and str(to_date)[5:] == "12-31"
        and str(from_date)[:4] == str(to_date)[:4]
    ):
        period_type = "Yearly"

if period_type not in ["Daily", "Weekly", "Monthly", "Yearly", "Custom"]:
    frappe.throw("Invalid period.")

previous_from = frappe.utils.add_days(from_date, -days)
previous_to = frappe.utils.add_days(from_date, -1)
previous_label = "Previous equal-length period"

last_year_from = frappe.utils.add_to_date(
    from_date,
    years=-1,
    as_string=True
)

last_year_to = frappe.utils.add_to_date(
    to_date,
    years=-1,
    as_string=True
)

# Full Yearly: previous calendar year, including leap day.
# Current Yearly: previous year through the same month/day.
if period_type == "Yearly":
    full_year = str(to_date)[5:] == "12-31"

    current_ytd = (
        str(to_date) == str(today)
        and str(from_date)[:4] == str(today)[:4]
    )

    if (
        str(from_date)[5:] != "01-01"
        or str(from_date)[:4] != str(to_date)[:4]
        or not (full_year or current_ytd)
    ):
        frappe.throw(
            "Yearly requires a full calendar year "
            "or the current year through today."
        )

    previous_from = str(last_year_from)[:4] + "-01-01"
    previous_to = last_year_to
    previous_label = "Previous year to date"

    if full_year:
        previous_to = str(last_year_from)[:4] + "-12-31"
        previous_label = "Previous calendar year"

company_rows = frappe.get_list(
    "Company",
    fields=["name", "default_currency"],
    order_by="name asc",
    limit_page_length=501
)

if len(company_rows) >= 501:
    frappe.throw(
        "Company list exceeds the supported limit. "
        "Configuration review required."
    )

company_currencies = {}

for row in company_rows:
    company_currencies[row.name] = row.default_currency

if company and company not in company_currencies:
    frappe.throw("The selected company is not accessible.")

base_filters = [
    [doctype, "docstatus", "=", 1]
]

if company:
    base_filters.append([doctype, "company", "=", company])

for field, value in [
    ["custom_division", division],
    [location_field, location],
    [salesperson_field, salesperson]
]:
    if value:
        if value == "~unassigned~":
            base_filters.append([doctype, field, "is", "not set"])
        else:
            base_filters.append([doctype, field, "=", value])

# Salesperson location filter (Sales Person > Location, current value) on the header salesperson.
sp_location = (frappe.form_dict.get("sp_location") or "").strip()
if sp_location:
    sp_loc_names = [r.name for r in frappe.get_list("Sales Person", filters=[["location", "=", sp_location]],
                                                     fields=["name"], limit_page_length=0)]
    if not sp_loc_names:
        sp_loc_names = ["~no salesperson~"]
    base_filters.append([doctype, salesperson_field, "in", sp_loc_names])

dept_view = frappe.form_dict.get("view") or ""

if dept_view == "department":
    # Item Department breakdown from individual invoice / order lines.
    # Value: line base_net_amount (company currency, excl. taxes, after document discount
    # allocation; returns negative). Same header filters as the Sales Breakdown.
    # Department: Sales Invoice Item.custom_item_department (saved on the line); blank
    # lines and all Sales Order lines use Item.item_department (current classification).
    dlevel = frappe.form_dict.get("dept_level") or "department"
    if dlevel not in ["department", "salesperson", "item", "records"]:
        frappe.throw("Invalid Item Department level.")
    dsel = frappe.form_dict.get("department") or ""
    ssel = frappe.form_dict.get("dept_salesperson") or ""
    SUN = "~unassigned~"
    isel = frappe.form_dict.get("item") or ""
    dpage = max(0, frappe.utils.cint(frappe.form_dict.get("record_page") or 0))
    DPAGE = 50
    DUN = "~unassigned~"
    DUN_LABEL = "Unassigned Item Department"
    child = "Sales Invoice Item" if measure == "invoiced" else "Sales Order Item"
    CT = "`tab" + child + "`"
    PT = "`tab" + doctype + "`"
    line_dept = measure == "invoiced"

    dfilters = list(base_filters) + [
        [doctype, date_field, ">=", str(from_date)],
        [doctype, date_field, "<=", str(to_date)]
    ]

    # Header total for reconciliation (same filters as the Sales Breakdown).
    hrows = frappe.get_list(doctype, filters=dfilters,
                            fields=["company", "count(name) as n", "sum(base_net_total) as v"],
                            group_by="company", limit_page_length=0)
    header_total = 0.0
    header_docs = 0
    dcur = {}
    for h in hrows:
        header_total = header_total + frappe.utils.flt(h.v)
        header_docs = header_docs + frappe.utils.cint(h.n)
        if company_currencies.get(h.company):
            dcur[company_currencies.get(h.company)] = 1
    if len(dcur) > 1:
        frappe.throw("The selected scope contains different company currencies. Select one company.")
    dcurrency = list(dcur.keys())[0] if dcur else (company_currencies.get(company) if company else "")

    lfields = [PT + ".name as doc", PT + "." + salesperson_field + " as sp", CT + ".item_code as item", CT + ".item_name as item_name",
               CT + ".stock_uom as uom", "sum(" + CT + ".stock_qty) as qty",
               "sum(" + CT + ".base_net_amount) as v", "count(" + CT + ".name) as nl"]
    lgroup = PT + ".name, " + PT + "." + salesperson_field + ", " + CT + ".item_code, " + CT + ".stock_uom"
    if line_dept:
        lfields = [CT + ".custom_item_department as ld"] + lfields
        lgroup = CT + ".custom_item_department, " + lgroup
    lrows = frappe.get_list(doctype, filters=dfilters, fields=lfields, group_by=lgroup,
                            limit_page_length=0)

    # Current Item Department for items that need it.
    need = {}
    for r in lrows:
        if not line_dept or not r.get("ld"):
            if r.item:
                need[r.item] = 1
    item_dept = {}
    codes = list(need.keys())
    i0 = 0
    while i0 < len(codes):
        chunk = codes[i0:i0 + 500]
        for it in frappe.get_list("Item", filters=[["name", "in", chunk]],
                                  fields=["name", "item_department"], limit_page_length=0):
            item_dept[it.name] = it.item_department or ""
        i0 = i0 + 500

    fallback_value = 0.0
    fallback_lines = 0
    depts = {}
    items = {}
    sps = {}
    line_total = 0.0
    for r in lrows:
        v = frappe.utils.flt(r.v)
        line_total = line_total + v
        d = r.get("ld") if line_dept else ""
        if not d:
            d = item_dept.get(r.item) or ""
            if d:
                fallback_value = fallback_value + v
                fallback_lines = fallback_lines + frappe.utils.cint(r.nl)
        dk = d if d else DUN
        de = depts.get(dk)
        if not de:
            de = {"key": dk, "label": d if d else DUN_LABEL, "amount": 0.0, "docs": {}, "lines": 0}
            depts[dk] = de
        de["amount"] = de["amount"] + v
        de["docs"][r.doc] = 1
        de["lines"] = de["lines"] + frappe.utils.cint(r.nl)
        spk = r.sp if r.sp else SUN
        if dlevel != "department" and dk == dsel:
            se = sps.get(spk)
            if not se:
                se = {"key": spk, "label": r.sp if r.sp else "Unassigned salesperson", "amount": 0.0,
                      "docs": {}, "lines": 0}
                sps[spk] = se
            se["amount"] = se["amount"] + v
            se["docs"][r.doc] = 1
            se["lines"] = se["lines"] + frappe.utils.cint(r.nl)
        if (dlevel == "item" or dlevel == "records") and dk == dsel and spk == ssel:
            ik = r.item or ""
            ie = items.get(ik)
            if not ie:
                ie = {"key": ik, "item_code": ik, "item_name": r.item_name, "amount": 0.0, "docs": {},
                      "uoms": {}, "lines": 0}
                items[ik] = ie
            ie["amount"] = ie["amount"] + v
            ie["docs"][r.doc] = 1
            ie["lines"] = ie["lines"] + frappe.utils.cint(r.nl)
            u = r.uom or ""
            ie["uoms"][u] = ie["uoms"].get(u, 0.0) + frappe.utils.flt(r.qty)

    dept_out = []
    for dk in depts:
        de = depts[dk]
        dept_out.append({"key": de["key"], "label": de["label"], "amount": de["amount"],
                         "docs": len(de["docs"]), "lines": de["lines"]})
    dept_out = sorted(dept_out, key=lambda z: -z["amount"])

    item_out = []
    for ik in items:
        ie = items[ik]
        item_out.append({"key": ie["key"], "item_code": ie["item_code"], "item_name": ie["item_name"],
                         "amount": ie["amount"], "docs": len(ie["docs"]), "lines": ie["lines"],
                         "qty_by_uom": [{"uom": u, "qty": ie["uoms"][u]} for u in sorted(ie["uoms"].keys())]})
    item_out = sorted(item_out, key=lambda z: -z["amount"])

    # Targets: no target source defined by Company + Salesperson + Item Department + period
    # exists, so every salesperson shows "Target not set" (no allocation, no proration).
    sp_out = []
    for sk in sps:
        se = sps[sk]
        sp_out.append({"key": se["key"], "label": se["label"], "amount": se["amount"],
                       "docs": len(se["docs"]), "lines": se["lines"],
                       "target": None, "target_status": "not_set"})
    sp_out = sorted(sp_out, key=lambda z: -z["amount"])
    sel_sp = None
    for se in sp_out:
        if se["key"] == ssel:
            sel_sp = se

    sel_dept = None
    for de in dept_out:
        if de["key"] == dsel:
            sel_dept = de

    records = []
    rec_total = {"count": 0, "amount": 0.0}
    if dlevel == "records":
        rf = list(dfilters) + [[child, "item_code", "=", isel]]
        if ssel == SUN:
            rf.append([doctype, salesperson_field, "is", "not set"])
        else:
            rf.append([doctype, salesperson_field, "=", ssel])
        ror = None
        if line_dept:
            cur_d = item_dept.get(isel)
            if cur_d is None:
                cur_d = ""
                for it in frappe.get_list("Item", filters=[["name", "=", isel]], fields=["item_department"]):
                    cur_d = it.item_department or ""
            if dsel == DUN:
                rf.append([child, "custom_item_department", "is", "not set"])
            elif cur_d == dsel:
                ror = [[child, "custom_item_department", "=", dsel],
                       [child, "custom_item_department", "is", "not set"]]
            else:
                rf.append([child, "custom_item_department", "=", dsel])
        tot = frappe.get_list(doctype, filters=rf, or_filters=ror,
                              fields=["count(" + CT + ".name) as n", "sum(" + CT + ".base_net_amount) as v"],
                              limit_page_length=1)
        if tot:
            rec_total = {"count": frappe.utils.cint(tot[0].n), "amount": frappe.utils.flt(tot[0].v)}
        rfields = [PT + ".name as doc", PT + "." + date_field + " as d", PT + ".customer_name as customer",
                   PT + "." + location_field + " as loc", PT + "." + salesperson_field + " as sp",
                   CT + ".item_code as item", CT + ".item_name as item_name", CT + ".qty as qty",
                   CT + ".uom as uom", CT + ".base_net_amount as v", CT + ".idx as idx"]
        if measure == "invoiced":
            rfields.append(PT + ".is_return as is_return")
        for r in frappe.get_list(doctype, filters=rf, or_filters=ror, fields=rfields,
                                 order_by=PT + "." + date_field + " desc, " + PT + ".name desc, " + CT + ".idx asc",
                                 limit_start=dpage * DPAGE, limit_page_length=DPAGE):
            records.append({"doc": r.doc, "date": str(r.d), "customer": r.customer, "location": r.loc,
                            "salesperson": r.sp, "item_code": r.item, "item_name": r.item_name,
                            "qty": frappe.utils.flt(r.qty), "uom": r.uom, "amount": frappe.utils.flt(r.v),
                            "is_return": 1 if r.get("is_return") else 0})

    frappe.response["message"] = {
        "view": "department", "measure": measure, "doctype": doctype, "currency": dcurrency,
        "from_date": str(from_date), "to_date": str(to_date), "company": company,
        "location": location, "salesperson": salesperson,
        "level": dlevel, "department": dsel, "item": isel,
        "header_total": header_total, "header_docs": header_docs, "line_total": line_total,
        "difference": header_total - line_total,
        "departments": dept_out, "selected_department": sel_dept, "items": item_out,
        "dept_salesperson": ssel, "salespersons": sp_out, "selected_salesperson": sel_sp,
        "salesperson_source": (doctype + "." + salesperson_field + " (document header, 100% of each line)"),
        "target_info": {
            "basis": "Net Invoiced Sales" if measure == "invoiced" else "Booked Sales",
            "source": "", "status": "not_configured",
            "message": ("No target records are defined by Company, Salesperson, Item Department and period. "
                        "CEO Sales Target supports Overall and Brand only; Sales Person > Targets rows have "
                        "a department and fiscal year but no company or Booked/Invoiced basis, so they are not used.")
        },
        "records": records, "record_total": rec_total, "record_page": dpage, "record_page_size": DPAGE,
        "department_source": ("Sales Invoice Item.custom_item_department (saved on the invoice line)"
                              if line_dept else "Item.item_department (current Item classification)"),
        "fallback_value": fallback_value, "fallback_lines": fallback_lines,
        "unassigned_label": DUN_LABEL
    }
else:
    comparisons_available = (
        level in ["company", "division", "location"]
        and not division
        and not location
        and not salesperson
    )

    periods = [
        {
            "key": "current",
            "from": str(from_date),
            "to": str(to_date),
            "label": "Selected period"
        }
    ]

    if comparisons_available:
        periods.append({
            "key": "previous",
            "from": str(previous_from),
            "to": str(previous_to),
            "label": previous_label
        })

        periods.append({
            "key": "last_year",
            "from": str(last_year_from),
            "to": str(last_year_to),
            "label": "Same dates last year"
        })

    results = {}
    summary_cache = {}
    used_currencies = {}
    current_filters = []

    for period in periods:
        filters = list(base_filters)

        filters.append([
            doctype,
            date_field,
            "between",
            [period["from"], period["to"]]
        ])

        if period["key"] == "current":
            current_filters = filters

        cache_key = period["from"] + "|" + period["to"]

        # Reuse an identical comparison range within this request.
        if cache_key not in summary_cache:
            summary_fields = [
                "company",
                "sum(base_net_total) as amount",
                "count(name) as document_count"
            ]

            summary_group = "company"

            if measure == "invoiced":
                summary_fields.append("is_return")
                summary_group = "company, is_return"

            summary_rows = frappe.get_list(
                doctype,
                fields=summary_fields,
                filters=filters,
                group_by=summary_group,
                order_by="company asc",
                limit_page_length=1001
            )

            if len(summary_rows) >= 1001:
                frappe.throw(
                    "Summary exceeds its grouping limit. "
                    "Partial totals are not displayed."
                )

            total = 0
            count = 0
            returns_total = 0
            returns_count = 0

            for row in summary_rows:
                row_currency = company_currencies.get(row.company)

                if not row_currency:
                    frappe.throw(
                        "Unable to verify company currency for " + row.company
                    )

                used_currencies[row_currency] = True

                value = frappe.utils.flt(row.amount)
                row_count = frappe.utils.cint(row.document_count)

                total = total + value
                count = count + row_count

                if measure == "invoiced" and row.get("is_return"):
                    returns_total = returns_total + value
                    returns_count = returns_count + row_count

            summary_cache[cache_key] = {
                "amount": total,
                "count": count,
                "returns_amount": returns_total,
                "returns_count": returns_count
            }

        result = dict(summary_cache[cache_key])

        result["from_date"] = period["from"]
        result["to_date"] = period["to"]
        result["label"] = period["label"]
        result["available"] = True

        results[period["key"]] = result

    currencies = list(used_currencies.keys())

    if len(currencies) > 1:
        frappe.throw(
            "These companies use different currencies. "
            "Select one company."
        )

    currency = None

    if len(currencies) == 1:
        currency = currencies[0]
    elif company:
        currency = company_currencies.get(company)

    # Preserve the response shape without running historical queries.
    # These amounts are unavailable placeholders, not actual zero sales.
    if not comparisons_available:
        for key, start_date, end_date, label in [
            [
                "previous",
                previous_from,
                previous_to,
                previous_label
            ],
            [
                "last_year",
                last_year_from,
                last_year_to,
                "Same dates last year"
            ]
        ]:
            results[key] = {
                "from_date": str(start_date),
                "to_date": str(end_date),
                "amount": 0,
                "count": 0,
                "returns_amount": 0,
                "returns_count": 0,
                "label": label,
                "available": False
            }

    current = results["current"]

    current["groups"] = []
    current["trend"] = []
    current["records"] = []

    record_page = max(
        0,
        frappe.utils.cint(frappe.form_dict.get("record_page") or 0)
    )

    current["record_page"] = record_page
    current["record_page_size"] = 50

    if level != "records":
        group_field = "custom_division"

        if level == "company":
            group_field = "company"
        elif level == "location":
            group_field = location_field
        elif level == "salesperson":
            group_field = salesperson_field

        group_rows = frappe.get_list(
            doctype,
            fields=[
                group_field,
                "sum(base_net_total) as amount",
                "count(name) as document_count"
            ],
            filters=current_filters,
            group_by=group_field,
            order_by=group_field + " asc",
            limit_page_length=10001
        )

        if len(group_rows) >= 10001:
            frappe.throw(
                "Breakdown exceeds its grouping limit. "
                "Partial totals are not displayed."
            )

        grouped = {}

        # Combine NULL and empty-string groups into Unassigned.
        for row in group_rows:
            value = row.get(group_field)
            group_key = value or "~unassigned~"

            if group_key not in grouped:
                grouped[group_key] = {
                    "key": group_key,
                    "label": value or "Unassigned",
                    "amount": 0,
                    "count": 0
                }

            grouped[group_key]["amount"] = (
                grouped[group_key]["amount"]
                + frappe.utils.flt(row.amount)
            )

            grouped[group_key]["count"] = (
                grouped[group_key]["count"]
                + frappe.utils.cint(row.document_count)
            )

        current["groups"] = list(grouped.values())

    trend_rows = frappe.get_list(
        doctype,
        fields=[
            date_field,
            "sum(base_net_total) as amount",
            "count(name) as document_count"
        ],
        filters=current_filters,
        group_by=date_field,
        order_by=date_field + " asc",
        limit_page_length=367
    )

    if len(trend_rows) >= 367:
        frappe.throw(
            "Trend exceeds its date limit. "
            "Partial totals are not displayed."
        )

    for row in trend_rows:
        current["trend"].append({
            "date": str(row.get(date_field)),
            "amount": frappe.utils.flt(row.amount),
            "count": frappe.utils.cint(row.document_count)
        })

    if level == "records":
        fields = [
            "name",
            "company",
            "customer_name",
            "base_net_total",
            date_field
        ]

        if measure == "invoiced":
            fields.append("is_return")

        record_rows = frappe.get_list(
            doctype,
            fields=fields,
            filters=current_filters,
            order_by=date_field + " desc, name asc",
            limit_start=record_page * 50,
            limit_page_length=50
        )

        for row in record_rows:
            current["records"].append({
                "name": row.name,
                "date": str(row.get(date_field)),
                "company": row.company,
                "customer": row.customer_name,
                "amount": frappe.utils.flt(row.base_net_total),
                "is_return": row.get("is_return") or 0
            })

    frappe.response["message"] = {
        "measure": measure,
        "doctype": doctype,
        "currency": currency,
        "period": period_type,
        "level": level,
        "company": company,
        "division": division,
        "location": location,
        "salesperson": salesperson,
        "current": current,
        "previous": results["previous"],
        "last_year": results["last_year"],
        "comparisons_available": comparisons_available,
        "comparison_status": (
            "Available overall; historical Division coverage incomplete"
            if comparisons_available
            else "Not comparable: historical Division coverage incomplete"
        ),
        "targets_status": "Pending validation",
        "location_status": "Fence/CSD mapping pending confirmation",
        "permission_scope": "Records accessible to the requesting user"
    }