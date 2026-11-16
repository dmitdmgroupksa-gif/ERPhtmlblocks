# CEO Command Center - Sales Support / Quotation API
# Read-only. Workflow state is interpreted within docstatus.
# owner is labelled Created By, not Preparer.

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

# Enforces Quotation read permission.
frappe.get_list(
    "Quotation",
    fields=["name"],
    limit_page_length=1
)


view_mode = frappe.form_dict.get("view") or ""

if view_mode == "expired":
    # Expired Quotations (current backlog as of today; issue dates are NOT filtered).
    # Expired = valid_till set and before today. Valid through today is not expired;
    # a missing valid_till is not expired (counted separately).
    # Actionable = not cancelled (docstatus 2), status not Lost/Ordered/Cancelled and
    # workflow state not Lost / Rejected By Customer / cancelled. Approved drafts and
    # Partially Ordered quotations are included and identified separately.
    # Read-only; frappe.get_list applies Quotation permissions and user permissions.
    xf = frappe.form_dict
    xtoday = frappe.utils.getdate(frappe.utils.today())
    xtoday_s = str(xtoday)
    xcompany = xf.get("company") or ""
    xscope = xf.get("scope") or "actionable"
    if xscope not in ["actionable", "all"]:
        frappe.throw("Invalid expired view.")
    xlevel = xf.get("level") or ("division" if xcompany else "company")
    if xlevel not in ["company", "division", "location", "salesperson", "records"]:
        frappe.throw("Invalid drill-down level.")
    xpage = max(0, frappe.utils.cint(xf.get("record_page") or 0))
    XPAGE = 50
    XUN = "~unassigned~"
    XEXCL_WF = ["Lost", "Rejected By Customer", "Rejected", "cancelled", "Cancelled"]
    XFIELD = {"company": "company", "division": "custom_division", "location": "location",
              "salesperson": "sales_person"}

    xcompanies = frappe.get_list("Company", fields=["name", "default_currency"], limit_page_length=0)
    xcur = {}
    for c in xcompanies:
        xcur[c.name] = c.default_currency
    if xcompany and xcompany not in xcur:
        frappe.throw("The selected company is not accessible.")
    xscope_companies = [xcompany] if xcompany else list(xcur.keys())
    xcurrencies = sorted(list(set([xcur[c] for c in xscope_companies if xcur.get(c)])))
    if len(xcurrencies) > 1:
        frappe.throw("The permitted companies use different currencies. Select one company.")

    xbase = []
    if xcompany:
        xbase.append(["Quotation", "company", "=", xcompany])
    xpath = {}
    for dim in ["division", "location", "salesperson"]:
        v = xf.get(dim) or ""
        if v:
            xpath[dim] = v
            if v == XUN:
                xbase.append(["Quotation", XFIELD[dim], "is", "not set"])
            else:
                xbase.append(["Quotation", XFIELD[dim], "=", v])

    xor = None
    xstatus = []
    if xscope == "actionable":
        xstatus = [["Quotation", "docstatus", "<", 2],
                   ["Quotation", "status", "not in", ["Lost", "Ordered", "Cancelled"]]]
        xor = [["Quotation", "workflow_state", "not in", XEXCL_WF],
               ["Quotation", "workflow_state", "is", "not set"]]

    xexpired = [["Quotation", "valid_till", "is", "set"], ["Quotation", "valid_till", "<", xtoday_s]]

    def xcategory(ds, st, ws):
        if ds == 2:
            return "cancelled"
        if st == "Partially Ordered":
            return "partially_ordered"
        if ds == 0:
            if ws == "Approved":
                return "approved_draft"
            if ws == "Lost":
                return "lost_draft"
            return "other_draft"
        if st in ["Ordered", "Lost"] or ws in XEXCL_WF:
            return "closed_outcome"
        return "submitted"

    xbuckets = [
        {"key": "d1_30", "label": "Expired 1-30 days",
         "filters": [["Quotation", "valid_till", ">=", str(frappe.utils.add_days(xtoday, -30))]]},
        {"key": "d31_90", "label": "Expired 31-90 days",
         "filters": [["Quotation", "valid_till", "<", str(frappe.utils.add_days(xtoday, -30))],
                     ["Quotation", "valid_till", ">=", str(frappe.utils.add_days(xtoday, -90))]]},
        {"key": "d90", "label": "Expired more than 90 days",
         "filters": [["Quotation", "valid_till", "<", str(frappe.utils.add_days(xtoday, -90))]]}
    ]

    xgfield = XFIELD.get(xlevel) if xlevel != "records" else None
    xgroups = {}
    xcats = {}
    xcombos = {}
    xbucket_out = []
    xtotal = {"count": 0, "amount": 0.0}
    for bk in xbuckets:
        flds = ["docstatus", "status", "workflow_state", "count(name) as n", "sum(base_net_total) as v"]
        gb = "docstatus, status, workflow_state"
        if xgfield:
            flds = [xgfield + " as k"] + flds
            gb = xgfield + ", " + gb
        rows = frappe.get_list("Quotation", filters=xbase + xstatus + xexpired + bk["filters"],
                               or_filters=xor, fields=flds, group_by=gb, limit_page_length=0)
        bc = {"key": bk["key"], "label": bk["label"], "count": 0, "amount": 0.0}
        for r in rows:
            n = frappe.utils.cint(r.n)
            v = frappe.utils.flt(r.v)
            bc["count"] = bc["count"] + n
            bc["amount"] = bc["amount"] + v
            cat = xcategory(frappe.utils.cint(r.docstatus), r.status, r.workflow_state)
            ce = xcats.get(cat) or {"key": cat, "count": 0, "amount": 0.0}
            ce["count"] = ce["count"] + n
            ce["amount"] = ce["amount"] + v
            xcats[cat] = ce
            ck = str(r.docstatus) + "||" + (r.status or "") + "||" + (r.workflow_state or "")
            co = xcombos.get(ck) or {"docstatus": frappe.utils.cint(r.docstatus), "status": r.status,
                                     "workflow_state": r.workflow_state, "category": cat, "count": 0, "amount": 0.0}
            co["count"] = co["count"] + n
            co["amount"] = co["amount"] + v
            xcombos[ck] = co
            if xgfield:
                gk = r.k if r.k else XUN
                g = xgroups.get(gk) or {"key": gk, "label": r.k if r.k else "Unassigned", "count": 0,
                                        "amount": 0.0, "approved_draft_count": 0, "partially_ordered_count": 0}
                g["count"] = g["count"] + n
                g["amount"] = g["amount"] + v
                if cat == "approved_draft":
                    g["approved_draft_count"] = g["approved_draft_count"] + n
                if cat == "partially_ordered":
                    g["partially_ordered_count"] = g["partially_ordered_count"] + n
                xgroups[gk] = g
        xtotal["count"] = xtotal["count"] + bc["count"]
        xtotal["amount"] = xtotal["amount"] + bc["amount"]
        xbucket_out.append(bc)

    # Not expired / not classifiable, shown for transparency (same scope and path).
    def xcount(extra):
        r = frappe.get_list("Quotation", filters=xbase + xstatus + extra, or_filters=xor,
                            fields=["count(name) as n", "sum(base_net_total) as v"], limit_page_length=1)
        return {"count": frappe.utils.cint(r[0].n) if r else 0, "amount": frappe.utils.flt(r[0].v) if r else 0.0}

    xmissing = xcount([["Quotation", "valid_till", "is", "not set"]])
    xvalid_today = xcount([["Quotation", "valid_till", "=", xtoday_s]])

    xrecords = []
    if xlevel == "records":
        rr = frappe.get_list("Quotation", filters=xbase + xstatus + xexpired, or_filters=xor,
                             fields=["name", "customer_name", "party_name", "transaction_date", "valid_till",
                                     "workflow_state", "docstatus", "status", "custom_division", "location",
                                     "sales_person", "owner", "base_net_total", "company"],
                             order_by="valid_till asc, name asc",
                             limit_start=xpage * XPAGE, limit_page_length=XPAGE)
        for r in rr:
            xrecords.append({
                "name": r.name, "customer": r.customer_name or r.party_name, "date": str(r.transaction_date),
                "valid_till": str(r.valid_till), "days_expired": frappe.utils.date_diff(xtoday, r.valid_till),
                "workflow_state": r.workflow_state, "docstatus": frappe.utils.cint(r.docstatus), "status": r.status,
                "category": xcategory(frappe.utils.cint(r.docstatus), r.status, r.workflow_state),
                "division": r.custom_division, "location": r.location, "salesperson": r.sales_person,
                "created_by": r.owner, "amount": frappe.utils.flt(r.base_net_total), "company": r.company
            })

    frappe.response["message"] = {
        "view": "expired", "scope": xscope, "as_of": xtoday_s, "company": xcompany,
        "currency": xcurrencies[0] if xcurrencies else "", "level": xlevel, "path": xpath,
        "summary": xtotal, "buckets": xbucket_out,
        "categories": sorted(xcats.values(), key=lambda z: -z["count"]),
        "combinations": sorted(xcombos.values(), key=lambda z: -z["count"]),
        "groups": sorted(xgroups.values(), key=lambda z: -z["amount"]),
        "missing_validity": xmissing, "valid_today": xvalid_today,
        "records": xrecords, "record_page": xpage, "record_page_size": XPAGE,
        "definition": ("Expired = Valid Till before " + xtoday_s + ". Valid through today is not expired; a missing "
                       "Valid Till is not expired. " + ("Actionable excludes cancelled, lost, rejected and fully "
                       "ordered quotations." if xscope == "actionable" else "All outcomes included.") +
                       " Current backlog across all issue dates; the period filter is not applied."),
        "value_basis": "Full net quotation value (base_net_total, company currency, excluding taxes) - not remaining value.",
        "permission_scope": "Records accessible to the requesting user"
    }
else:
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
    level = frappe.form_dict.get("level") or "status"
    selected_status = frappe.form_dict.get("status_key") or ""
    created_by = frappe.form_dict.get("created_by") or ""

    if level not in ["status", "creator", "records"]:
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

    base_filters = [
        ["Quotation", "transaction_date", "between", [
            str(from_date),
            str(to_date)
        ]]
    ]

    if company:
        base_filters.append(["Quotation", "company", "=", company])

    # Draft buckets used for the four cards.
    review_states = [
        "Approval Pending With Sales Supervisor",
        "Review With Sales Manager",
        "Review With CEO"
    ]

    draft_mapping = {
        "Approval Pending With Sales Supervisor": "draft_review",
        "Review With Sales Manager": "draft_review",
        "Review With CEO": "draft_review",
        "Approved": "draft_approved",
        "Lost": "draft_lost",
        "Pending": "draft_pending"
    }

    # Explicit submitted groups.
    submitted_mapping = {
        "Accepted By Customer": "submitted_accepted",
        "Rejected By Customer": "submitted_rejected",
        "Make Sales Order from Customer Accepted Quotation": "submitted_make_order",
        "cancelled": "submitted_cancelled_state"
    }

    labels = {
        "draft_review": "Awaiting approval / In review",
        "draft_approved": "Approved, not submitted",
        "draft_lost": "Lost drafts",
        "draft_pending": "Not yet sent for approval",
        "draft_other": "Draft / Other or Unmapped",
        "submitted_accepted": "Submitted / Accepted By Customer",
        "submitted_rejected": "Submitted / Rejected By Customer",
        "submitted_make_order": "Submitted / Make Sales Order",
        "submitted_cancelled_state": "Submitted / Cancelled state - inconsistent",
        "submitted_other": "Submitted / Other or Unmapped",
        "cancelled": "Cancelled documents",
        "other_docstatus": "Other document state"
    }

    if selected_status and selected_status not in labels:
        frappe.throw("Invalid status group.")

    if level in ["creator", "records"] and not selected_status:
        frappe.throw("Select a status group first.")

    if created_by and level != "records":
        frappe.throw("Created By filtering is supported at Records level.")

    # Build status filter without unrestricted SQL.
    scope_filters = list(base_filters)
    scope_or_filters = []

    if selected_status == "draft_review":
        scope_filters.append(["Quotation", "docstatus", "=", 0])
        scope_filters.append(["Quotation", "workflow_state", "in", review_states])

    elif selected_status == "draft_approved":
        scope_filters.append(["Quotation", "docstatus", "=", 0])
        scope_filters.append(["Quotation", "workflow_state", "=", "Approved"])

    elif selected_status == "draft_lost":
        scope_filters.append(["Quotation", "docstatus", "=", 0])
        scope_filters.append(["Quotation", "workflow_state", "=", "Lost"])

    elif selected_status == "draft_pending":
        scope_filters.append(["Quotation", "docstatus", "=", 0])
        scope_filters.append(["Quotation", "workflow_state", "=", "Pending"])

    elif selected_status == "draft_other":
        scope_filters.append(["Quotation", "docstatus", "=", 0])
        scope_or_filters = [
            [
                "Quotation",
                "workflow_state",
                "not in",
                list(draft_mapping.keys())
            ],
            [
                "Quotation",
                "workflow_state",
                "is",
                "not set"
            ]
        ]

    elif selected_status == "submitted_accepted":
        scope_filters.append(["Quotation", "docstatus", "=", 1])
        scope_filters.append([
            "Quotation", "workflow_state", "=", "Accepted By Customer"
        ])

    elif selected_status == "submitted_rejected":
        scope_filters.append(["Quotation", "docstatus", "=", 1])
        scope_filters.append([
            "Quotation", "workflow_state", "=", "Rejected By Customer"
        ])

    elif selected_status == "submitted_make_order":
        scope_filters.append(["Quotation", "docstatus", "=", 1])
        scope_filters.append([
            "Quotation",
            "workflow_state",
            "=",
            "Make Sales Order from Customer Accepted Quotation"
        ])

    elif selected_status == "submitted_cancelled_state":
        scope_filters.append(["Quotation", "docstatus", "=", 1])
        scope_filters.append(["Quotation", "workflow_state", "=", "cancelled"])

    elif selected_status == "submitted_other":
        scope_filters.append(["Quotation", "docstatus", "=", 1])
        scope_or_filters = [
            [
                "Quotation",
                "workflow_state",
                "not in",
                list(submitted_mapping.keys())
            ],
            [
                "Quotation",
                "workflow_state",
                "is",
                "not set"
            ]
        ]

    elif selected_status == "cancelled":
        scope_filters.append(["Quotation", "docstatus", "=", 2])

    elif selected_status == "other_docstatus":
        scope_filters.append(["Quotation", "docstatus", "not in", [0, 1, 2]])

    if created_by:
        scope_filters.append(["Quotation", "owner", "=", created_by])

    # Summary and detailed workflow combinations for the selected scope.
    summary_rows = frappe.get_list(
        "Quotation",
        fields=[
            "company",
            "docstatus",
            "workflow_state",
            "sum(base_net_total) as amount",
            "count(name) as document_count"
        ],
        filters=scope_filters,
        or_filters=scope_or_filters,
        group_by="company, docstatus, workflow_state",
        order_by="company asc, docstatus asc, workflow_state asc",
        limit_page_length=10001
    )

    if len(summary_rows) >= 10001:
        frappe.throw(
            "Summary exceeds its grouping limit. "
            "Partial totals are not displayed."
        )

    groups = {}
    workflow_combinations = []
    used_currencies = {}

    total_count = 0
    total_amount = 0
    draft_count = 0
    submitted_count = 0
    cancelled_count = 0
    inconsistent_count = 0

    for row in summary_rows:
        row_currency = company_currencies.get(row.company)

        if not row_currency:
            frappe.throw("Unable to verify company currency for " + row.company)

        used_currencies[row_currency] = True

        docstatus = frappe.utils.cint(row.docstatus)
        workflow = row.workflow_state or ""
        count = frappe.utils.cint(row.document_count)
        amount = frappe.utils.flt(row.amount)

        bucket = "other_docstatus"
        inconsistent = False

        if docstatus == 0:
            bucket = draft_mapping.get(workflow) or "draft_other"
            draft_count = draft_count + count

            if workflow == "Accepted By Customer":
                inconsistent = True

        elif docstatus == 1:
            bucket = submitted_mapping.get(workflow) or "submitted_other"
            submitted_count = submitted_count + count

            if workflow == "cancelled":
                inconsistent = True

        elif docstatus == 2:
            # Cancellation is determined by docstatus, regardless of workflow.
            bucket = "cancelled"
            cancelled_count = cancelled_count + count

        if bucket not in groups:
            groups[bucket] = {
                "key": bucket,
                "label": labels[bucket],
                "count": 0,
                "amount": 0,
                "inconsistent_count": 0
            }

        groups[bucket]["count"] = groups[bucket]["count"] + count
        groups[bucket]["amount"] = groups[bucket]["amount"] + amount

        if inconsistent:
            groups[bucket]["inconsistent_count"] = (
                groups[bucket]["inconsistent_count"] + count
            )
            inconsistent_count = inconsistent_count + count

        total_count = total_count + count
        total_amount = total_amount + amount

        workflow_combinations.append({
            "company": row.company,
            "docstatus": docstatus,
            "workflow_state": workflow or "Unassigned",
            "bucket": bucket,
            "count": count,
            "amount": amount,
            "inconsistent": inconsistent
        })

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

    # The four cards use the same date/company/status/creator scope.
    cards = []

    for key in [
        "draft_review",
        "draft_approved",
        "draft_lost",
        "draft_pending"
    ]:
        bucket = groups.get(key) or {}

        cards.append({
            "key": key,
            "label": labels[key],
            "count": bucket.get("count") or 0,
            "amount": bucket.get("amount") or 0
        })

    # Ordered and Partially Ordered are separate conversion indicators.
    conversion_rows = frappe.get_list(
        "Quotation",
        fields=[
            "status",
            "count(name) as document_count",
            "sum(base_net_total) as amount"
        ],
        filters=scope_filters + [
            ["Quotation", "docstatus", "=", 1],
            ["Quotation", "status", "in", ["Ordered", "Partially Ordered"]]
        ],
        or_filters=scope_or_filters,
        group_by="status",
        order_by="status asc",
        limit_page_length=3
    )

    conversion = []

    for row in conversion_rows:
        conversion.append({
            "status": row.status,
            "count": frappe.utils.cint(row.document_count),
            "amount": frappe.utils.flt(row.amount)
        })

    creator_groups = []

    if level == "creator":
        creator_rows = frappe.get_list(
            "Quotation",
            fields=[
                "owner",
                "count(name) as document_count",
                "sum(base_net_total) as amount"
            ],
            filters=scope_filters,
            or_filters=scope_or_filters,
            group_by="owner",
            order_by="owner asc",
            limit_page_length=10001
        )

        if len(creator_rows) >= 10001:
            frappe.throw("Creator breakdown exceeds its grouping limit.")

        for row in creator_rows:
            creator_groups.append({
                "key": row.owner,
                "label": row.owner,
                "count": frappe.utils.cint(row.document_count),
                "amount": frappe.utils.flt(row.amount)
            })

    trend_rows = frappe.get_list(
        "Quotation",
        fields=[
            "transaction_date",
            "count(name) as document_count",
            "sum(base_net_total) as amount"
        ],
        filters=scope_filters,
        or_filters=scope_or_filters,
        group_by="transaction_date",
        order_by="transaction_date asc",
        limit_page_length=367
    )

    if len(trend_rows) >= 367:
        frappe.throw("Trend exceeds its date limit.")

    trend = []

    for row in trend_rows:
        trend.append({
            "date": str(row.transaction_date),
            "count": frappe.utils.cint(row.document_count),
            "amount": frappe.utils.flt(row.amount)
        })

    record_page = max(
        0,
        frappe.utils.cint(frappe.form_dict.get("record_page") or 0)
    )

    records = []

    if level == "records":
        record_rows = frappe.get_list(
            "Quotation",
            fields=[
                "name",
                "transaction_date",
                "company",
                "owner",
                "party_name",
                "docstatus",
                "workflow_state",
                "status",
                "base_net_total",
                "custom_division",
                "location",
                "sales_person"
            ],
            filters=scope_filters,
            or_filters=scope_or_filters,
            order_by="transaction_date desc, name asc",
            limit_start=record_page * 50,
            limit_page_length=50
        )

        for row in record_rows:
            records.append({
                "name": row.name,
                "date": str(row.transaction_date),
                "company": row.company,
                "created_by": row.owner,
                "party": row.party_name,
                "docstatus": row.docstatus,
                "workflow_state": row.workflow_state,
                "status": row.status,
                "amount": frappe.utils.flt(row.base_net_total),
                "division": row.custom_division,
                "location": row.location,
                "salesperson": row.sales_person
            })

    frappe.response["message"] = {
        "doctype": "Quotation",
        "from_date": str(from_date),
        "to_date": str(to_date),
        "company": company,
        "currency": currency,
        "level": level,
        "status_key": selected_status,
        "created_by": created_by,
        "cards": cards,
        "summary": {
            "count": total_count,
            "amount": total_amount,
            "draft_count": draft_count,
            "submitted_count": submitted_count,
            "cancelled_count": cancelled_count,
            "inconsistent_count": inconsistent_count
        },
        "status_groups": list(groups.values()),
        "workflow_combinations": workflow_combinations,
        "creator_groups": creator_groups,
        "order_conversion": conversion,
        "trend": trend,
        "records": records,
        "record_page": record_page,
        "record_page_size": 50,
        "date_basis": "Quotation Issue Date: transaction_date",
        "creator_basis": "Created By: owner; not a dedicated preparer field",
        "value_basis": "Company-currency net quotation value, excluding taxes",
        "completion_rule": (
            "Approved draft is not finalized completion. "
            "Enquiry SLA metrics are not connected."
        ),
        "permission_scope": "Records accessible to the requesting user"
    }