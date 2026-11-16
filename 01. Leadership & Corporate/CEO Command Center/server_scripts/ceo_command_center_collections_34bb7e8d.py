# CEO Command Center - Collections
# Read-only, permission-aware Payment Entry queries.
# Receipts and customer refunds remain separate.
# No Journal Entries are included.

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

frappe.get_list(
    "Payment Entry",
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
location = frappe.form_dict.get("location") or ""
salesperson = frappe.form_dict.get("salesperson") or ""
customer = frappe.form_dict.get("customer") or ""

measure = frappe.form_dict.get("measure") or "receipts"

if measure not in ["receipts", "refunds"]:
    frappe.throw("Invalid collections measure.")

level = frappe.form_dict.get("level")

if not level:
    level = "location" if company else "company"

if level not in [
    "company",
    "location",
    "salesperson",
    "customer",
    "records"
]:
    frappe.throw("Invalid drill-down level.")

company_rows = frappe.get_list(
    "Company",
    fields=["name", "default_currency"],
    order_by="name asc",
    limit_page_length=501
)

if len(company_rows) >= 501:
    frappe.throw("Company list exceeds the supported limit.")

company_currencies = {}

for row in company_rows:
    company_currencies[row.name] = row.default_currency

if company and company not in company_currencies:
    frappe.throw("The selected company is not accessible.")

scope_filters = [
    ["Payment Entry", "docstatus", "=", 1],
    ["Payment Entry", "party_type", "=", "Customer"],
    ["Payment Entry", "payment_type", "in", ["Receive", "Pay"]],
    [
        "Payment Entry",
        "posting_date",
        "between",
        [str(from_date), str(to_date)]
    ]
]

if company:
    scope_filters.append(["Payment Entry", "company", "=", company])

for field, value in [
    ["location", location],
    ["sales_person", salesperson],
    ["party", customer]
]:
    if value:
        if value == "~unassigned~":
            scope_filters.append([
                "Payment Entry", field, "is", "not set"
            ])
        else:
            scope_filters.append([
                "Payment Entry", field, "=", value
            ])

# Group by company and source-account currency so unallocated
# amounts are validated before any cross-company summation.
summary_rows = frappe.get_list(
    "Payment Entry",
    fields=[
        "company",
        "payment_type",
        "paid_from_account_currency",
        "count(name) as document_count",
        "sum(base_received_amount) as received",
        "sum(base_paid_amount) as paid",
        "sum(unallocated_amount) as unallocated"
    ],
    filters=scope_filters,
    group_by="company, payment_type, paid_from_account_currency",
    order_by="company asc, payment_type asc",
    limit_page_length=10001
)

if len(summary_rows) >= 10001:
    frappe.throw(
        "Summary exceeds its grouping limit. "
        "Partial totals are not displayed."
    )

receipts_count = 0
receipts_amount = 0
unallocated_amount = 0
refunds_count = 0
refunds_amount = 0
used_currencies = {}

for row in summary_rows:
    company_currency = company_currencies.get(row.company)

    if not company_currency:
        frappe.throw(
            "Unable to verify company currency for " + row.company
        )

    used_currencies[company_currency] = True

    count = frappe.utils.cint(row.document_count)

    if row.payment_type == "Receive":
        if row.paid_from_account_currency != company_currency:
            frappe.throw(
                "Cannot combine unallocated amounts: "
                "a customer receipt in " + row.company +
                " uses a party account currency different from "
                "the company currency, or its currency is missing."
            )

        receipts_count = receipts_count + count

        receipts_amount = (
            receipts_amount + frappe.utils.flt(row.received)
        )

        unallocated_amount = (
            unallocated_amount + frappe.utils.flt(row.unallocated)
        )

    elif row.payment_type == "Pay":
        refunds_count = refunds_count + count

        # Company-currency amount paid out for customer refunds.
        refunds_amount = (
            refunds_amount + frappe.utils.flt(row.paid)
        )

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

payment_type = "Receive"
amount_field = "base_received_amount"

if measure == "refunds":
    payment_type = "Pay"
    amount_field = "base_paid_amount"

measure_filters = list(scope_filters)

measure_filters.append([
    "Payment Entry", "payment_type", "=", payment_type
])

selected_count = receipts_count
selected_amount = receipts_amount

if measure == "refunds":
    selected_count = refunds_count
    selected_amount = refunds_amount

groups = []

if level != "records":
    group_field = "company"

    if level == "location":
        group_field = "location"
    elif level == "salesperson":
        group_field = "sales_person"
    elif level == "customer":
        group_field = "party"

    group_fields = [
        group_field,
        "count(name) as document_count",
        "sum(" + amount_field + ") as amount"
    ]

    if measure == "receipts":
        group_fields.append(
            "sum(unallocated_amount) as unallocated"
        )

    group_rows = frappe.get_list(
        "Payment Entry",
        fields=group_fields,
        filters=measure_filters,
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

    for row in group_rows:
        value = row.get(group_field)
        key = value or "~unassigned~"

        if key not in grouped:
            grouped[key] = {
                "key": key,
                "label": value or "Unassigned",
                "count": 0,
                "amount": 0,
                "unallocated_amount": 0
            }

        grouped[key]["count"] = (
            grouped[key]["count"]
            + frappe.utils.cint(row.document_count)
        )

        grouped[key]["amount"] = (
            grouped[key]["amount"]
            + frappe.utils.flt(row.amount)
        )

        if measure == "receipts":
            grouped[key]["unallocated_amount"] = (
                grouped[key]["unallocated_amount"]
                + frappe.utils.flt(row.unallocated)
            )

    groups = list(grouped.values())

trend_fields = [
    "posting_date",
    "count(name) as document_count",
    "sum(" + amount_field + ") as amount"
]

trend_rows = frappe.get_list(
    "Payment Entry",
    fields=trend_fields,
    filters=measure_filters,
    group_by="posting_date",
    order_by="posting_date asc",
    limit_page_length=367
)

if len(trend_rows) >= 367:
    frappe.throw("Trend exceeds its date limit.")

trend = []

for row in trend_rows:
    trend.append({
        "date": str(row.posting_date),
        "count": frappe.utils.cint(row.document_count),
        "amount": frappe.utils.flt(row.amount)
    })

record_page = max(
    0,
    frappe.utils.cint(frappe.form_dict.get("record_page") or 0)
)

records = []

if level == "records":
    record_fields = [
        "name",
        "posting_date",
        "company",
        "party",
        "party_name",
        "payment_type",
        "location",
        "sales_person",
        amount_field
    ]

    if measure == "receipts":
        record_fields.append("unallocated_amount")

    record_rows = frappe.get_list(
        "Payment Entry",
        fields=record_fields,
        filters=measure_filters,
        order_by="posting_date desc, name asc",
        limit_start=record_page * 50,
        limit_page_length=50
    )

    for row in record_rows:
        record = {
            "name": row.name,
            "date": str(row.posting_date),
            "company": row.company,
            "customer": row.party,
            "customer_name": row.party_name,
            "payment_type": row.payment_type,
            "location": row.location,
            "salesperson": row.sales_person,
            "amount": frappe.utils.flt(row.get(amount_field))
        }

        if measure == "receipts":
            record["unallocated_amount"] = frappe.utils.flt(
                row.unallocated_amount
            )

        records.append(record)

frappe.response["message"] = {
    "doctype": "Payment Entry",
    "measure": measure,
    "level": level,
    "from_date": str(from_date),
    "to_date": str(to_date),
    "company": company,
    "location": location,
    "salesperson": salesperson,
    "customer": customer,
    "currency": currency,
    "summary": {
        "receipts_count": receipts_count,
        "receipts_amount": receipts_amount,
        "unallocated_amount": unallocated_amount,
        "refunds_count": refunds_count,
        "refunds_amount": refunds_amount
    },
    "selected": {
        "count": selected_count,
        "amount": selected_amount
    },
    "groups": groups,
    "trend": trend,
    "records": records,
    "record_page": record_page,
    "record_page_size": 50,
    "receipt_label": "Customer receipts - Payment Entries",
    "unallocated_label": (
        "Currently unallocated from receipts in this period"
    ),
    "refund_label": "Customer refunds - shown separately",
    "unallocated_as_of": str(today),
    "date_basis": "Payment Entry posting_date",
    "currency_basis": "Company currency",
    "journal_entries_included": False,
    "permission_scope": (
        "Records accessible to the requesting user"
    )
}