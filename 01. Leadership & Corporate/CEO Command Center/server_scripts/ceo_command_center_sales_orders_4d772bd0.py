# CEO Command Center - Sales Order API (read-only)
# api_method: ceo_command_center_sales_orders
#
# Scope: submitted Sales Orders only (docstatus 1). Drafts (0) and cancelled
# orders (2) are excluded; an amended order replaces its cancelled original,
# so only the amendment is counted. Closed orders are included (they were
# booked) and are reported separately. Sales Orders have no returns; returns
# happen on Delivery Notes / Sales Invoices and do not change these figures.
# Period: Sales Order transaction_date.
# Values: base_net_total / base_net_amount (company currency, excluding taxes).
# Salesperson: standard Sales Team rows x allocated_percentage.
# Brand: Sales Order Item.brand as saved on the order; blank rows use the
#        Item's current brand; otherwise "Unassigned Brand".
# Targets: CEO Sales Target, full calendar-month targets, never prorated.
# Access: frappe.get_list only (record permissions and user permissions
# applied). Users restricted by Sales Person user permissions see only their
# own allocated share.

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

flt = frappe.utils.flt
cint = frappe.utils.cint
getdate = frappe.utils.getdate

args = frappe.form_dict
company = args.get("company") or ""
sales_person = args.get("sales_person") or ""
brand = args.get("brand") or ""
sp_location = (args.get("sp_location") or "").strip()
page = max(0, cint(args.get("page") or 0))
PAGE_SIZE = 50
UNASSIGNED_BRAND = "Unassigned Brand"
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"]

if not args.get("from_date") or not args.get("to_date"):
    frappe.throw("Select a start date and an end date.")

from_date = str(getdate(args.get("from_date")))
to_date = str(getdate(args.get("to_date")))

if from_date > to_date:
    frappe.throw("The start date must be on or before the end date.")

if frappe.utils.date_diff(to_date, from_date) > 366:
    frappe.throw("Select a date range of 366 days or less.")

# ---------------------------------------------------------------- access
company_rows = frappe.get_list(
    "Company",
    fields=["name", "default_currency"],
    order_by="name asc",
    limit_page_length=0
)
company_currency = {}
for row in company_rows:
    company_currency[row.name] = row.default_currency

if company and company not in company_currency:
    frappe.throw("The selected company is not accessible.")

scope_companies = [company] if company else list(company_currency.keys())
currencies = sorted(list(set([company_currency[c] for c in scope_companies if company_currency.get(c)])))

# Sales Person user permissions limit the visible salespersons.
user_perms = frappe.get_all(
    "User Permission",
    filters={"user": user, "allow": "Sales Person"},
    fields=["for_value", "apply_to_all_doctypes", "applicable_for"]
)
allowed_sp = []
for up in user_perms:
    if up.apply_to_all_doctypes or up.applicable_for in ["Sales Order", "Sales Person", "Sales Team"]:
        if up.for_value not in allowed_sp:
            allowed_sp.append(up.for_value)
restricted = len(allowed_sp) > 0

if restricted and sales_person and sales_person not in allowed_sp:
    frappe.throw("You do not have access to this salesperson.")

if sales_person:
    sp_set = [sales_person]
elif restricted:
    sp_set = allowed_sp
else:
    sp_set = None

# Salesperson location filter (Sales Person > Location, current value). Orders are
# credited through the Sales Team allocation, so only the shares of salespersons at
# the selected location count.
loc_rows = frappe.get_list("Sales Person", filters=[["is_group", "=", 0]],
                           fields=["name", "location"], limit_page_length=0)
sp_location_options = sorted(list(set([(r.location or "").strip() for r in loc_rows
                                       if (r.location or "").strip()])))
loc_sp = []
if sp_location:
    loc_sp = [r.name for r in loc_rows if (r.location or "").strip() == sp_location]
    if sp_set is None:
        sp_set = loc_sp
    else:
        sp_set = [s for s in sp_set if s in loc_sp]

# Filter options
sp_options = frappe.get_list(
    "Sales Person",
    filters=[["is_group", "=", 0]],
    fields=["name", "enabled"],
    order_by="name asc",
    limit_page_length=0
)
sp_option_names = [r.name for r in sp_options if (not restricted or r.name in allowed_sp)]
brand_options = frappe.get_list("Brand", fields=["name"], order_by="name asc", limit_page_length=0)
brand_option_names = [r.name for r in brand_options]

# ---------------------------------------------------------------- months
months = []
cursor = getdate(from_date).replace(day=1)
end = getdate(to_date)
while cursor <= end:
    last = frappe.utils.get_last_day(cursor)
    start_cov = max(cursor, getdate(from_date))
    end_cov = min(last, end)
    days_in = last.day
    covered = frappe.utils.date_diff(end_cov, start_cov) + 1
    months.append({
        "year": cursor.year,
        "month": cursor.month,
        "label": MONTH_NAMES[cursor.month - 1] + " " + str(cursor.year),
        "days_in_month": days_in,
        "days_covered": covered,
        "partial": covered < days_in
    })
    cursor = frappe.utils.add_days(last, 1)

month_keys = [str(m["year"]) + "-" + ("%02d" % m["month"]) for m in months]
partial_months = [m for m in months if m["partial"]]


def build():
    result = {
        "from_date": from_date,
        "to_date": to_date,
        "company": company,
        "sales_person": sales_person,
        "brand": brand,
        "restricted": restricted,
        "currency": currencies[0] if len(currencies) == 1 else "",
        "currency_conflict": len(currencies) > 1,
        "months": months,
        "sp_location": sp_location,
        "options": {"sales_persons": [n for n in sp_option_names if (not sp_location or n in loc_sp)],
                    "brands": brand_option_names, "sp_locations": sp_location_options},
        "page_size": PAGE_SIZE,
        "page": page
    }

    if len(currencies) > 1:
        result["message"] = ("The permitted companies use different currencies (" +
                             ", ".join(currencies) + "). Select one company.")
        return result

    base = [
        ["Sales Order", "docstatus", "=", 1],
        ["Sales Order", "transaction_date", "between", [from_date, to_date]]
    ]
    if company:
        base.append(["Sales Order", "company", "=", company])

    # ---------------- orders with Sales Team allocation rows
    rows_a = frappe.get_list(
        "Sales Order",
        filters=base,
        fields=[
            "name", "transaction_date", "customer", "customer_name", "status",
            "delivery_date", "company", "base_net_total", "amended_from",
            "`tabSales Team`.sales_person as sp",
            "`tabSales Team`.allocated_percentage as pct"
        ],
        order_by="`tabSales Order`.transaction_date desc, `tabSales Order`.name desc",
        limit_page_length=0
    )

    orders = {}
    order_list = []
    for r in rows_a:
        o = orders.get(r.name)
        if not o:
            o = {
                "name": r.name,
                "date": str(r.transaction_date),
                "customer": r.customer_name or r.customer,
                "status": r.status,
                "delivery_date": str(r.delivery_date) if r.delivery_date else "",
                "value": flt(r.base_net_total),
                "company": r.company,
                "amended": 1 if r.amended_from else 0,
                "team": {},
                "pct": 0.0,
                "blank_sp": 0,
                "brands": {}
            }
            orders[r.name] = o
            order_list.append(o)
        if r.sp or r.pct:
            if not r.sp:
                o["blank_sp"] = 1
            else:
                o["team"][r.sp] = o["team"].get(r.sp, 0.0) + flt(r.pct)
            o["pct"] = o["pct"] + flt(r.pct)

    for o in order_list:
        if not o["team"] and not o["blank_sp"]:
            o["alloc"] = "missing"
        elif o["pct"] <= 0:
            o["alloc"] = "missing"
        elif o["blank_sp"] or o["pct"] > 100.001:
            o["alloc"] = "invalid"
        elif o["pct"] < 99.999:
            o["alloc"] = "partial"
        else:
            o["alloc"] = "ok"

    # ---------------- brand amounts per order (item net values)
    rows_b = frappe.get_list(
        "Sales Order",
        filters=base + [["Sales Order Item", "brand", "is", "set"]],
        fields=[
            "name",
            "`tabSales Order Item`.brand as brand",
            "sum(`tabSales Order Item`.base_net_amount) as amt"
        ],
        group_by="`tabSales Order`.name, `tabSales Order Item`.brand",
        limit_page_length=0
    )
    for r in rows_b:
        o = orders.get(r.name)
        if o:
            o["brands"][r.brand] = o["brands"].get(r.brand, 0.0) + flt(r.amt)

    rows_c = frappe.get_list(
        "Sales Order",
        filters=base + [["Sales Order Item", "brand", "is", "not set"]],
        fields=[
            "name",
            "`tabSales Order Item`.item_code as item_code",
            "sum(`tabSales Order Item`.base_net_amount) as amt"
        ],
        group_by="`tabSales Order`.name, `tabSales Order Item`.item_code",
        limit_page_length=0
    )
    item_brand = {}
    codes = list(set([r.item_code for r in rows_c if r.item_code]))
    if codes:
        item_rows = frappe.get_list(
            "Item",
            filters=[["name", "in", codes], ["brand", "is", "set"]],
            fields=["name", "brand"],
            limit_page_length=0
        )
        for r in item_rows:
            item_brand[r.name] = r.brand

    fallback_value = 0.0
    fallback_rows = 0
    for r in rows_c:
        o = orders.get(r.name)
        if not o:
            continue
        b = item_brand.get(r.item_code)
        if b:
            fallback_value = fallback_value + flt(r.amt)
            fallback_rows = fallback_rows + 1
        else:
            b = UNASSIGNED_BRAND
        o["brands"][b] = o["brands"].get(b, 0.0) + flt(r.amt)

    # Header vs item rounding differences go to Unassigned Brand so totals reconcile.
    rounding_diff = 0.0
    for o in order_list:
        diff = o["value"] - sum(o["brands"].values())
        if abs(diff) >= 0.005:
            rounding_diff = rounding_diff + diff
            o["brands"][UNASSIGNED_BRAND] = o["brands"].get(UNASSIGNED_BRAND, 0.0) + diff

    # ---------------- filters
    def share(o):
        # Fraction of the order credited to the selected / permitted salespersons.
        if sp_set is None:
            return 1.0
        if o["alloc"] not in ["ok", "partial"]:
            return 0.0
        total = 0.0
        for sp in sp_set:
            total = total + o["team"].get(sp, 0.0)
        return total / 100.0

    def view_value(o):
        if brand:
            return o["brands"].get(brand, 0.0)
        return o["value"]

    scoped = []
    for o in order_list:
        if brand and brand not in o["brands"]:
            continue
        s = share(o)
        if sp_set is not None and s <= 0:
            continue
        o["share"] = s
        o["view_value"] = view_value(o) * s
        scoped.append(o)

    achieved = sum([o["view_value"] for o in scoped])

    status_rows = {}
    closed = {"count": 0, "value": 0.0}
    on_hold = {"count": 0, "value": 0.0}
    amended = 0
    for o in scoped:
        st = status_rows.get(o["status"]) or {"status": o["status"], "count": 0, "value": 0.0}
        st["count"] = st["count"] + 1
        st["value"] = st["value"] + o["view_value"]
        status_rows[o["status"]] = st
        if o["status"] == "Closed":
            closed["count"] = closed["count"] + 1
            closed["value"] = closed["value"] + o["view_value"]
        if o["status"] == "On Hold":
            on_hold["count"] = on_hold["count"] + 1
            on_hold["value"] = on_hold["value"] + o["view_value"]
        if o["amended"]:
            amended = amended + 1

    # ---------------- trend
    trend_map = {}
    for o in scoped:
        t = trend_map.get(o["date"]) or {"date": o["date"], "amount": 0.0, "count": 0}
        t["amount"] = t["amount"] + o["view_value"]
        t["count"] = t["count"] + 1
        trend_map[o["date"]] = t
    trend = sorted(trend_map.values(), key=lambda x: x["date"])

    # ---------------- salesperson allocation
    sp_rows = {}
    unallocated = {"value": 0.0, "orders": 0, "partial_orders": 0}
    invalid = {"value": 0.0, "orders": 0, "examples": []}
    for o in scoped:
        v = view_value(o)
        if o["alloc"] in ["ok", "partial"]:
            for sp in o["team"]:
                if sp_set is not None and sp not in sp_set:
                    continue
                row = sp_rows.get(sp) or {"sales_person": sp, "achieved": 0.0, "orders": 0}
                row["achieved"] = row["achieved"] + v * o["team"][sp] / 100.0
                row["orders"] = row["orders"] + 1
                sp_rows[sp] = row
            if sp_set is None and o["alloc"] == "partial":
                unallocated["value"] = unallocated["value"] + v * (100.0 - o["pct"]) / 100.0
                unallocated["partial_orders"] = unallocated["partial_orders"] + 1
        elif sp_set is None:
            if o["alloc"] == "missing":
                unallocated["value"] = unallocated["value"] + v
                unallocated["orders"] = unallocated["orders"] + 1
            else:
                invalid["value"] = invalid["value"] + v
                invalid["orders"] = invalid["orders"] + 1
                if len(invalid["examples"]) < 10:
                    invalid["examples"].append(o["name"])

    # ---------------- brand performance
    brand_rows = {}
    for o in scoped:
        s = o["share"]
        for b in o["brands"]:
            if brand and b != brand:
                continue
            row = brand_rows.get(b) or {"brand": b, "achieved": 0.0, "orders": 0}
            row["achieved"] = row["achieved"] + o["brands"][b] * s
            row["orders"] = row["orders"] + 1
            brand_rows[b] = row

    # ---------------- who/what each target must cover
    # (company, salesperson) pairs with allocated value in this view, per brand,
    # and value that no salesperson target can cover (unallocated / invalid).
    sp_company = {}
    sp_brand_company = {}
    brand_uncovered = {}
    uncovered_value = 0.0
    for o in scoped:
        if o["alloc"] in ["ok", "partial"]:
            for sp in o["team"]:
                if sp_set is not None and sp not in sp_set:
                    continue
                sp_company.setdefault(sp, {})[o["company"]] = 1
                for b in o["brands"]:
                    sp_brand_company.setdefault(sp + "||" + b, {})[o["company"]] = 1
        if sp_set is None:
            if o["alloc"] in ["missing", "invalid"]:
                frac = 1.0
            elif o["alloc"] == "partial":
                frac = (100.0 - o["pct"]) / 100.0
            else:
                frac = 0.0
            if frac > 0:
                uncovered_value = uncovered_value + view_value(o) * frac
                for b in o["brands"]:
                    brand_uncovered[b] = brand_uncovered.get(b, 0.0) + o["brands"][b] * frac

    # ---------------- targets (full calendar months, never prorated)
    targets_readable = True
    target_rows = []
    years = list(set([m["year"] for m in months]))
    tfilters = [["target_year", "in", years]]
    if company:
        tfilters.append(["company", "=", company])
    else:
        tfilters.append(["company", "in", scope_companies])
    try:
        target_rows = frappe.get_list(
            "CEO Sales Target",
            filters=tfilters,
            fields=["name", "company", "target_year", "target_month", "sales_person",
                    "target_type", "brand", "target_amount", "currency"],
            limit_page_length=0
        )
    except Exception:
        targets_readable = False
        target_rows = []

    month_label = {}
    for m in months:
        month_label[str(m["year"]) + "-" + ("%02d" % m["month"])] = m["label"]

    seen = {}
    duplicates = []
    wrong_currency = []
    overall_tm = {}     # company||sp||month -> amount
    brand_tm = {}       # company||sp||brand||month -> amount
    for t in target_rows:
        mk = str(t.target_year) + "-" + (t.target_month or "")[:2]
        if mk not in month_keys:
            continue
        if restricted and t.sales_person not in allowed_sp:
            continue
        if t.currency and result["currency"] and t.currency != result["currency"]:
            wrong_currency.append(t.name)
            continue
        key = "|".join([t.company, mk, t.sales_person, t.target_type or "", t.brand or ""])
        if seen.get(key):
            duplicates.append(t.name)
            continue
        seen[key] = 1
        amt = flt(t.target_amount)
        if t.target_type == "Brand" and t.brand:
            brand_tm[t.company + "||" + t.sales_person + "||" + t.brand + "||" + mk] = amt
        elif t.target_type == "Overall":
            overall_tm[t.company + "||" + t.sales_person + "||" + mk] = amt

    def in_sp(sp):
        return sp_set is None or sp in sp_set

    def target_companies(sp, b):
        # companies where this salesperson has a target of the requested kind
        found = {}
        if b is None:
            for k in overall_tm:
                p = k.split("||")
                if p[1] == sp:
                    found[p[0]] = 1
        else:
            for k in brand_tm:
                p = k.split("||")
                if p[1] == sp and p[2] == b:
                    found[p[0]] = 1
        return found

    def coverage(pairs, b):
        # pairs: list of [company, sp]; b: None for overall targets, else brand
        cov = {"expected": 0, "present": 0, "amount": 0.0, "missing": [], "zero": []}
        for pair in pairs:
            for mk in month_keys:
                cov["expected"] = cov["expected"] + 1
                if b is None:
                    k = pair[0] + "||" + pair[1] + "||" + mk
                    amt = overall_tm.get(k)
                else:
                    k = pair[0] + "||" + pair[1] + "||" + b + "||" + mk
                    amt = brand_tm.get(k)
                label = pair[1] + " · " + pair[0] + " · " + month_label[mk]
                if amt is None:
                    cov["missing"].append(label)
                else:
                    cov["present"] = cov["present"] + 1
                    cov["amount"] = cov["amount"] + amt
                    if amt == 0:
                        cov["zero"].append(label)
        return cov

    def sp_pairs(sp, b):
        comps = {}
        if b is None:
            for c in sp_company.get(sp, {}):
                comps[c] = 1
        else:
            for c in sp_brand_company.get(sp + "||" + b, {}):
                comps[c] = 1
        for c in target_companies(sp, b):
            comps[c] = 1
        return [[c, sp] for c in sorted(comps.keys())]

    def measures(achieved_value, cov, uncovered):
        # target_state: set | zero | partial | not_set
        out = {
            "target": None, "achievement": None, "remaining": None, "excess": None,
            "coverage": {
                "expected": cov["expected"], "present": cov["present"],
                "missing": cov["missing"][:25], "missing_count": len(cov["missing"]),
                "zero": cov["zero"][:25], "zero_count": len(cov["zero"]),
                "uncovered_value": uncovered
            }
        }
        if cov["present"] == 0:
            out["target_state"] = "not_set"
            return out
        out["target"] = cov["amount"]
        if cov["missing"] or uncovered >= 0.005:
            # Some salesperson-months (or unallocated value) have no target:
            # not comparable as a complete result.
            out["target_state"] = "partial"
            return out
        if cov["amount"] <= 0:
            out["target_state"] = "zero"
            out["remaining"] = 0.0
            out["excess"] = max(achieved_value, 0.0)
            return out
        out["target_state"] = "set"
        out["achievement"] = achieved_value / cov["amount"] * 100.0
        out["remaining"] = max(cov["amount"] - achieved_value, 0.0)
        out["excess"] = max(achieved_value - cov["amount"], 0.0)
        return out

    # salespersons with targets but no orders are still listed
    for k in list(overall_tm.keys()) + list(brand_tm.keys()):
        p = k.split("||")
        sp = p[1]
        if not in_sp(sp) or sp in sp_rows:
            continue
        if brand and not (len(p) == 4 and p[2] == brand):
            continue
        sp_rows[sp] = {"sales_person": sp, "achieved": 0.0, "orders": 0}

    def brand_target_total(sp):
        total = None
        for k in brand_tm:
            p = k.split("||")
            if p[1] == sp:
                total = (total or 0.0) + brand_tm[k]
        return total

    sp_out = []
    for sp in sp_rows:
        row = sp_rows[sp]
        b = brand if brand else None
        row["target_basis"] = "brand" if brand else "overall"
        row.update(measures(row["achieved"], coverage(sp_pairs(sp, b), b), 0.0))
        bsum = brand_target_total(sp)
        row["brand_target_sum"] = bsum
        if not brand and row["target"] is not None and bsum is not None:
            row["overall_vs_brand_difference"] = row["target"] - bsum
        else:
            row["overall_vs_brand_difference"] = None
        sp_out.append(row)
    sp_out = sorted(sp_out, key=lambda x: -x["achieved"])

    # brand table
    for k in brand_tm:
        p = k.split("||")
        if in_sp(p[1]) and (not brand or p[2] == brand) and p[2] not in brand_rows:
            brand_rows[p[2]] = {"brand": p[2], "achieved": 0.0, "orders": 0}

    def brand_pairs(b):
        sps = {}
        for k in sp_brand_company:
            p = k.split("||")
            if p[1] == b and in_sp(p[0]):
                sps[p[0]] = 1
        for k in brand_tm:
            p = k.split("||")
            if p[2] == b and in_sp(p[1]):
                sps[p[1]] = 1
        pairs = []
        for sp in sorted(sps.keys()):
            pairs = pairs + sp_pairs(sp, b)
        return pairs

    brand_out = []
    for b in brand_rows:
        row = brand_rows[b]
        if b == UNASSIGNED_BRAND:
            row.update({"target": None, "achievement": None, "remaining": None, "excess": None,
                        "target_state": "not_applicable", "coverage": None})
        else:
            row.update(measures(row["achieved"], coverage(brand_pairs(b), b),
                                brand_uncovered.get(b, 0.0)))
        brand_out.append(row)
    brand_out = sorted(brand_out, key=lambda x: -x["achieved"])

    # headline target
    if brand:
        if brand == UNASSIGNED_BRAND:
            headline = {"target": None, "achievement": None, "remaining": None, "excess": None,
                        "target_state": "not_applicable", "coverage": None}
        else:
            headline = measures(achieved, coverage(brand_pairs(brand), brand),
                                brand_uncovered.get(brand, 0.0))
        target_basis = "brand"
    else:
        pairs = []
        for sp in sorted(sp_rows.keys()):
            pairs = pairs + sp_pairs(sp, None)
        headline = measures(achieved, coverage(pairs, None), uncovered_value)
        target_basis = "overall"
    headline["target_basis"] = target_basis

    # Comparable subset: salespersons whose targets are complete for this view.
    subset = {"salespersons": 0, "of": len(sp_out), "achieved": 0.0, "target": 0.0}
    for row in sp_out:
        if row["target_state"] == "set":
            subset["salespersons"] = subset["salespersons"] + 1
            subset["achieved"] = subset["achieved"] + row["achieved"]
            subset["target"] = subset["target"] + row["target"]
    subset["achievement"] = (subset["achieved"] / subset["target"] * 100.0) if subset["target"] > 0 else None
    headline["comparable_subset"] = subset

    # ---------------- order list (paginated)
    total_orders = len(scoped)
    page_rows = []
    for o in scoped[page * PAGE_SIZE:(page + 1) * PAGE_SIZE]:
        team = []
        for sp in o["team"]:
            if restricted and sp not in allowed_sp:
                continue
            team.append({"sales_person": sp, "pct": o["team"][sp]})
        page_rows.append({
            "name": o["name"],
            "date": o["date"],
            "customer": o["customer"],
            "status": o["status"],
            "value": o["value"] if not restricted else None,
            "view_value": o["view_value"],
            "delivery_date": o["delivery_date"],
            "team": team,
            "alloc": o["alloc"]
        })

    allocated_total = sum([r["achieved"] for r in sp_out])
    brand_total = sum([r["achieved"] for r in brand_out])

    result.update({
        "summary": {
            "value": achieved,
            "count": total_orders,
            "closed": closed,
            "on_hold": on_hold,
            "amended": amended,
            "statuses": sorted(status_rows.values(), key=lambda x: -x["value"])
        },
        "target": headline,
        "trend": trend,
        "sales_persons": sp_out,
        "unallocated": unallocated,
        "invalid_allocation": invalid,
        "brands": brand_out,
        "brand_source": {
            "fallback_value": fallback_value if sp_set is None and not brand else None,
            "fallback_rows": fallback_rows,
            "rounding_difference": rounding_diff
        },
        "targets_info": {
            "readable": targets_readable,
            "records_in_period": len(seen),
            "months": [m["label"] for m in months],
            "duplicates_ignored": duplicates,
            "wrong_currency_ignored": wrong_currency,
            "partial_months": [m["label"] + " (" + str(m["days_covered"]) + " of " +
                               str(m["days_in_month"]) + " days)" for m in partial_months]
        },
        "reconciliation": {
            "orders_total": achieved,
            "salesperson_allocated": allocated_total,
            "unallocated": unallocated["value"],
            "invalid_allocation": invalid["value"],
            "brand_total": brand_total
        },
        "orders": {"total": total_orders, "page": page, "page_size": PAGE_SIZE, "rows": page_rows}
    })
    return result


frappe.response["message"] = build()
