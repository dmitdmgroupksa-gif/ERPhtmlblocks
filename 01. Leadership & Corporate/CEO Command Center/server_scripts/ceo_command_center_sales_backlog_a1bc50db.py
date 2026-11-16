# CEO Command Center - Sales Backlog API
# Read-only. Current backlog across all dates (not period-filtered).
# Pending Sales Orders and Pending Quotations, permission-aware get_list only.

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

kind = frappe.form_dict.get("kind") or "orders"

if kind not in ["orders", "delivery", "invoice", "quotations"]:
    frappe.throw("Invalid backlog type.")

company = frappe.form_dict.get("company") or ""
division = frappe.form_dict.get("division") or ""
location = frappe.form_dict.get("location") or ""
salesperson = frappe.form_dict.get("salesperson") or ""
level = frappe.form_dict.get("level") or "division"
summary_only = frappe.utils.cint(frappe.form_dict.get("summary_only") or 0)

if level not in ["company", "division", "location", "salesperson", "records"]:
    frappe.throw("Invalid drill-down level.")

record_page = max(
    0,
    frappe.utils.cint(frappe.form_dict.get("record_page") or 0)
)

doctype = "Sales Order"
date_field = "transaction_date"
location_field = "location_"
salesperson_field = "sales_persons"
customer_field = "customer_name"

if kind == "quotations":
    doctype = "Quotation"
    location_field = "location"
    salesperson_field = "sales_person"
    customer_field = "party_name"

# get_list enforces read permission.
frappe.get_list(doctype, fields=["name"], limit_page_length=1)

company_rows = frappe.get_list(
    "Company",
    fields=["name", "default_currency"],
    order_by="name asc",
    limit_page_length=501
)

company_currencies = {}

for row in company_rows:
    company_currencies[row.name] = row.default_currency

if company and company not in company_currencies:
    frappe.throw("The selected company is not accessible.")

scope = []

if company:
    scope.append([doctype, "company", "=", company])

# Optional document-date range (order / quotation date). Without it, all dates.
from_date = frappe.form_dict.get("from_date") or ""
to_date = frappe.form_dict.get("to_date") or ""

if from_date or to_date:
    if not (from_date and to_date):
        frappe.throw("Select both a start date and an end date.")
    from_date = str(frappe.utils.getdate(from_date))
    to_date = str(frappe.utils.getdate(to_date))
    if from_date > to_date:
        frappe.throw("The start date must be on or before the end date.")
    scope.append([doctype, date_field, "between", [from_date, to_date]])

for field, value in [
    ["custom_division", division],
    [location_field, location],
    [salesperson_field, salesperson]
]:
    if value:
        if value == "~unassigned~":
            scope.append([doctype, field, "is", "not set"])
        else:
            scope.append([doctype, field, "=", value])

open_order = [
    [doctype, "docstatus", "=", 1],
    [doctype, "status", "not in", ["Closed", "Cancelled"]]
]

pending_delivery = {
    "key": "pending_delivery",
    "label": "Pending Delivery",
    "filters": open_order + [[doctype, "per_delivered", "<", 100]]
}

awaiting_invoice = {
    "key": "awaiting_invoice",
    "label": "Delivered, awaiting invoice",
    "filters": open_order + [
        [doctype, "per_delivered", ">=", 100],
        [doctype, "per_billed", "<", 100]
    ]
}

if kind == "orders":
    # Parent total = two non-overlapping parts.
    categories = [pending_delivery, awaiting_invoice]
elif kind == "delivery":
    categories = [pending_delivery]
elif kind == "invoice":
    categories = [awaiting_invoice]
else:
    categories = [
        {
            "key": "approved_not_submitted",
            "label": "Approved, not submitted",
            "filters": [
                [doctype, "docstatus", "=", 0],
                [doctype, "workflow_state", "=", "Approved"]
            ]
        },
        {
            "key": "submitted_awaiting",
            "label": "Submitted, awaiting customer action",
            "filters": [
                [doctype, "docstatus", "=", 1],
                [doctype, "status", "not in", ["Ordered", "Lost", "Cancelled"]],
                [
                    doctype,
                    "workflow_state",
                    "not in",
                    ["Rejected By Customer", "cancelled"]
                ]
            ]
        }
    ]

used_currencies = {}
total_count = 0
total_amount = 0
category_results = []
category_counts = {}

for category in categories:
    category["all_filters"] = scope + category["filters"]

    rows = frappe.get_list(
        doctype,
        fields=[
            "company",
            "status",
            "count(name) as document_count",
            "sum(base_net_total) as amount"
        ],
        filters=category["all_filters"],
        group_by="company, status",
        order_by="company asc",
        limit_page_length=1001
    )

    if len(rows) >= 1001:
        frappe.throw("Summary exceeds its grouping limit.")

    count = 0
    amount = 0
    by_status = {}

    for row in rows:
        row_currency = company_currencies.get(row.company)

        if not row_currency:
            frappe.throw("Unable to verify company currency for " + row.company)

        used_currencies[row_currency] = True

        row_count = frappe.utils.cint(row.document_count)
        row_amount = frappe.utils.flt(row.amount)

        count = count + row_count
        amount = amount + row_amount

        status = row.status or "Unspecified"

        if status not in by_status:
            by_status[status] = {"status": status, "count": 0, "amount": 0}

        by_status[status]["count"] = by_status[status]["count"] + row_count
        by_status[status]["amount"] = by_status[status]["amount"] + row_amount

    statuses = sorted(
        list(by_status.values()),
        key=lambda item: item["count"],
        reverse=True
    )

    category_counts[category["key"]] = count

    category_results.append({
        "key": category["key"],
        "label": category["label"],
        "count": count,
        "amount": amount,
        "statuses": statuses
    })

    total_count = total_count + count
    total_amount = total_amount + amount

currencies = list(used_currencies.keys())

if len(currencies) > 1:
    frappe.throw(
        "These companies use different currencies. Select one company."
    )

currency = None

if len(currencies) == 1:
    currency = currencies[0]
elif company:
    currency = company_currencies.get(company)

# Age of approved drafts by quotation issue date.
age_buckets = []

if kind == "quotations":
    today = frappe.utils.getdate(frappe.utils.today())

    bands = [
        ["Dated after today", None, -1],
        ["0-30 days", 0, 30],
        ["31-90 days", 31, 90],
        ["91-365 days", 91, 365],
        ["Over 365 days", 366, None]
    ]

    for label, low, high in bands:
        band_filters = list(categories[0]["all_filters"])

        if label == "Dated after today":
            band_filters.append([doctype, date_field, ">", str(today)])
        else:
            band_filters.append([
                doctype, date_field, "<=", str(frappe.utils.add_days(today, -low))
            ])

            if high is not None:
                band_filters.append([
                    doctype, date_field, ">=", str(frappe.utils.add_days(today, -high))
                ])

        band_rows = frappe.get_list(
            doctype,
            fields=[
                "count(name) as document_count",
                "sum(base_net_total) as amount"
            ],
            filters=band_filters,
            limit_page_length=1
        )

        band_count = 0
        band_amount = 0

        if band_rows:
            band_count = frappe.utils.cint(band_rows[0].document_count)
            band_amount = frappe.utils.flt(band_rows[0].amount)

        if band_count or label != "Dated after today":
            age_buckets.append({
                "label": label,
                "count": band_count,
                "amount": band_amount
            })

groups = []

if not summary_only and level != "records":
    group_field = "custom_division"

    if level == "company":
        group_field = "company"
    elif level == "location":
        group_field = location_field
    elif level == "salesperson":
        group_field = salesperson_field

    merged = {}

    for category in categories:
        group_rows = frappe.get_list(
            doctype,
            fields=[
                group_field,
                "count(name) as document_count",
                "sum(base_net_total) as amount"
            ],
            filters=category["all_filters"],
            group_by=group_field,
            order_by=group_field + " asc",
            limit_page_length=10001
        )

        if len(group_rows) >= 10001:
            frappe.throw("Breakdown exceeds its grouping limit.")

        for row in group_rows:
            value = row.get(group_field)
            key = value or "~unassigned~"

            if key not in merged:
                merged[key] = {
                    "key": key,
                    "label": value or "Unassigned",
                    "count": 0,
                    "amount": 0,
                    "by_category": {}
                }

            row_count = frappe.utils.cint(row.document_count)
            row_amount = frappe.utils.flt(row.amount)

            merged[key]["count"] = merged[key]["count"] + row_count
            merged[key]["amount"] = merged[key]["amount"] + row_amount
            merged[key]["by_category"][category["key"]] = (
                merged[key]["by_category"].get(category["key"], 0) + row_count
            )

    groups = list(merged.values())

records = []

if not summary_only and level == "records":
    offset = record_page * 50
    remaining = 50

    for category in categories:
        category_count = category_counts.get(category["key"]) or 0

        if remaining <= 0:
            break

        if offset >= category_count:
            offset = offset - category_count
            continue

        fields = [
            "name",
            date_field,
            "company",
            customer_field,
            "status",
            "base_net_total"
        ]

        if kind != "quotations":
            fields.append("per_delivered")
            fields.append("per_billed")
            fields.append("delivery_date")
        else:
            fields.append("workflow_state")
            fields.append("valid_till")

        record_rows = frappe.get_list(
            doctype,
            fields=fields,
            filters=category["all_filters"],
            order_by=date_field + " desc, name asc",
            limit_start=offset,
            limit_page_length=remaining
        )

        for row in record_rows:
            detail = ""

            if kind != "quotations":
                detail = (
                    str(frappe.utils.flt(row.per_delivered, 1))
                    + "% delivered · "
                    + str(frappe.utils.flt(row.per_billed, 1))
                    + "% billed"
                )

                if row.delivery_date:
                    detail = detail + " · due " + str(row.delivery_date)

                if (
                    frappe.utils.flt(row.per_billed) >= 100
                    and frappe.utils.flt(row.per_delivered) < 100
                ):
                    detail = "Billed before delivery · " + detail
            else:
                detail = row.workflow_state or ""

                if row.valid_till:
                    detail = detail + " · valid till " + str(row.valid_till)

            records.append({
                "name": row.name,
                "date": str(row.get(date_field)),
                "company": row.company,
                "customer": row.get(customer_field),
                "status": row.status,
                "category": category["label"],
                "detail": detail,
                "amount": frappe.utils.flt(row.base_net_total)
            })

        remaining = remaining - len(record_rows)
        offset = 0

frappe.response["message"] = {
    "kind": kind,
    "from_date": from_date,
    "to_date": to_date,
    "doctype": doctype,
    "currency": currency,
    "company": company,
    "division": division,
    "location": location,
    "salesperson": salesperson,
    "level": level,
    "summary": {
        "count": total_count,
        "amount": total_amount
    },
    "categories": category_results,
    "age_buckets": age_buckets,
    "groups": groups,
    "records": records,
    "record_page": record_page,
    "record_page_size": 50,
    "basis": "Current backlog · All dates",
    "value_basis": (
        "Net quotation value"
        if kind == "quotations"
        else "Full order net value"
    ),
    "permission_scope": "Records accessible to the requesting user"
}