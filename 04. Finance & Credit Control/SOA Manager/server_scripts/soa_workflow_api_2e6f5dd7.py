# Frappe API Server Script: API Method = soa_workflow_api. No imports.
# Run action=setup as Administrator/System Manager once before enabling the new tabs.
U = frappe.utils
MANAGER_ROLES = ['SOA Manager', 'Credit', 'Accounts Manager', 'System Manager']
EXCLUDED = ['Nahzan Ahmed Armar', 'Nurul Kabir', 'Abdul Khader Shabeeruddin', 'Ritesh Kaushik']
REPORT_DT = 'Outstanding Report - Location Wise'
REPORT_PRINT_FORMAT = 'Outstanding Report Customer wise'   # salesperson -> each customer, subtotal per salesperson
REQUEST_DT = 'SOA Workflow Request'
ACCESS_DT = 'SOA Transfer Access'
FINANCE_ACCESS_DT = 'SOA Finance Access'


def manager(user):
    return user == 'Administrator' or any(role in MANAGER_ROLES for role in frappe.get_all('Has Role', filters={'parent': user, 'parenttype': 'User'}, pluck='role'))


def need_manager():
    if not manager(frappe.session.user):
        frappe.throw('A configured SOA manager role is required.')


def salespeople(user):
    employee = frappe.db.get_value('Employee', {'user_id': user}, 'name')
    names = frappe.get_all('Sales Person', filters={'employee': employee}, pluck='name') if employee else []
    if not names:
        full_name = frappe.db.get_value('User', user, 'full_name')
        names = frappe.get_all('Sales Person', filters={'sales_person_name': full_name}, pluck='name') if full_name else []
    return names


def customer_field():
    for field in frappe.get_meta('Customer').fields:
        if field.fieldtype == 'Link' and field.options == 'Sales Person':
            return field.fieldname
    return ''


def customer_owners():
    field = customer_field()
    owners = {}
    direct = {}
    for row in frappe.get_all('Customer', fields=['name'] + ([field] if field else []), limit_page_length=0):
        direct[row.name] = row.get(field) if field else ''
        owners[row.name] = [{'sales_person': row.get(field), 'share': 100.0}] if field and row.get(field) else []
    for row in frappe.get_all('Sales Team', filters={'parenttype': 'Customer'}, fields=['parent', 'sales_person', 'allocated_percentage'], order_by='idx asc', limit_page_length=0):
        if not direct.get(row.parent):
            if row.parent not in owners:
                owners[row.parent] = []
            owners[row.parent].append({'sales_person': row.sales_person, 'share': U.flt(row.allocated_percentage)})
    return owners


def transfer_allowed(user):
    return manager(user) or bool(frappe.db.exists(ACCESS_DT, {'user': user, 'enabled': 1}))


def outstanding_rows(sps, date):
    # Current Customer assignment takes precedence, so approved transfers affect future
    # reports without editing Sales Invoices. Invoice Sales Team is the fallback.
    owners = customer_owners()
    invoices = frappe.db.sql("select si.name, si.customer, si.posting_date, sum(ple.amount) as balance "
        "from `tabPayment Ledger Entry` ple join `tabSales Invoice` si on si.name=ple.against_voucher_no and si.customer=ple.party "
        "where ple.against_voucher_type='Sales Invoice' and ple.party_type='Customer' and ple.account_type='Receivable' "
        "and ple.delinked=0 and si.docstatus=1 and ple.company=si.company and ple.posting_date<=%(date)s "
        "and si.posting_date<=%(date)s and si.company!='Al Qimmah for Safety Devices Company' "
        "group by si.name,si.customer,si.posting_date having abs(sum(ple.amount))>=1", {'date': date}, as_dict=True)
    fallback = {}
    if invoices:
        for row in frappe.get_all('Sales Team', filters={'parenttype': 'Sales Invoice', 'parent': ['in', [inv.name for inv in invoices]]}, fields=['parent', 'sales_person', 'allocated_percentage'], limit_page_length=0):
            if row.parent not in fallback:
                fallback[row.parent] = []
            fallback[row.parent].append({'sales_person': row.sales_person, 'share': U.flt(row.allocated_percentage)})
    locations = {}
    for sp in sps:
        locations[sp] = frappe.db.get_value('Sales Person', sp, 'location') or ''
    buckets = {}
    for inv in invoices:
        for owner in (owners.get(inv.customer) or fallback.get(inv.name) or []):
            sp = owner['sales_person']
            if sp not in sps or sp in EXCLUDED:
                continue
            value = U.flt(inv.balance) * owner['share'] / 100.0
            if abs(value) < 1:
                continue
            key = sp + '\n' + inv.customer
            if key not in buckets:
                buckets[key] = {'sales_person': sp, 'location': locations[sp], 'customer': inv.customer,
                    'sum_of_outstanding_amount': 0.0, 'sum_30': 0.0, 'sum_60': 0.0, 'sum_90': 0.0, 'sum_120': 0.0, 'sum_120_above': 0.0}
            days = U.date_diff(date, str(inv.posting_date))
            bucket = 'sum_30' if days <= 30 else 'sum_60' if days <= 60 else 'sum_90' if days <= 90 else 'sum_120' if days <= 120 else 'sum_120_above'
            buckets[key][bucket] = buckets[key][bucket] + value
            buckets[key]['sum_of_outstanding_amount'] = buckets[key]['sum_of_outstanding_amount'] + value
    result = []
    for key in sorted(buckets.keys()):
        row = buckets[key]
        for field in ['sum_of_outstanding_amount', 'sum_30', 'sum_60', 'sum_90', 'sum_120', 'sum_120_above']:
            row[field] = str(U.flt(row[field], 2))
        result.append(row)
    return result


def report_pdf(req, send_email=True):
    sps = salespeople(req.requested_by)
    if not sps:
        frappe.throw('No Sales Person is linked to the requesting employee.')
    rows = outstanding_rows(sps, str(req.report_date))
    if not rows:
        frappe.throw('No outstanding balances for the requesting salesperson on this date.')
    meta = frappe.get_meta(REPORT_DT)
    table = meta.get_field('outstanding_table')
    if not table:
        frappe.throw('Outstanding Report is missing outstanding_table.')
    child = frappe.get_meta(table.options)
    for field in rows[0]:
        if not child.has_field(field):
            frappe.throw('Outstanding Report child field is missing: ' + field)
    name = 'SOA-' + req.name
    exists = frappe.db.exists(REPORT_DT, name)
    doc = frappe.get_doc(REPORT_DT, name) if exists else frappe.get_doc({'doctype': REPORT_DT})
    if U.cint(doc.docstatus):
        frappe.throw('The generated outstanding report must remain a draft.')
    doc.posting_date = req.report_date
    doc.sales_person = sps[0] if len(sps) == 1 else None
    doc.location = None
    doc.set('outstanding_table', [])
    for row in rows:
        doc.append('outstanding_table', row)
    if exists:
        doc.save(ignore_permissions=True)
    else:
        doc.insert(ignore_permissions=True, set_name=name)
    pdf = frappe.get_print(REPORT_DT, doc.name, print_format=REPORT_PRINT_FORMAT, as_pdf=True, pdf_options={'orientation': 'Landscape'})
    file = frappe.get_doc({'doctype': 'File', 'file_name': req.name + '_Customer_Outstanding_Report.pdf', 'is_private': 1,
        'attached_to_doctype': REQUEST_DT, 'attached_to_name': req.name, 'content': pdf}).insert(ignore_permissions=True)
    req.report_document = doc.name
    req.file_url = file.file_url
    req.file_id = file.name
    if not send_email:
        return
    if not req.requested_by or '@' not in req.requested_by:
        frappe.throw('The requesting user needs a valid email address.')
    frappe.sendmail(recipients=[req.requested_by], subject='Customer Outstanding Report - ' + str(req.report_date),
        message='Your approved Customer Outstanding Report is attached as a PDF.', attachments=[{'fid': file.name}],
        reference_doctype=REQUEST_DT, reference_name=req.name)


def apply_transfer(req):
    # Revalidate all selections under locks before modifying any Customer.
    ids = json.loads(req.customers or '[]')
    if not ids:
        frappe.throw('Choose customers to transfer.')
    target = frappe.db.get_value('Sales Person', req.to_sales_person, ['enabled', 'is_group'], as_dict=True)
    if not target or not target.enabled or target.is_group:
        frappe.throw('The destination salesperson must be enabled and not a group.')
    frappe.db.sql('select name from `tabCustomer` where name in %(ids)s order by name for update', {'ids': tuple(ids)})
    owners = customer_owners()
    for name in ids:
        if req.from_sales_person not in [row['sales_person'] for row in (owners.get(name) or [])]:
            frappe.throw('Customer assignment changed since the request: ' + name)
    field = customer_field()
    for name in ids:
        doc = frappe.get_doc('Customer', name)
        if field and doc.get(field) == req.from_sales_person:
            doc.set(field, req.to_sales_person)
        team = doc.get('sales_team') or []
        if any(row.sales_person == req.to_sales_person for row in team) and any(row.sales_person == req.from_sales_person for row in team):
            frappe.throw('Destination already appears in Customer Sales Team: ' + name + '. Resolve its allocation first.')
        for row in team:
            if row.sales_person == req.from_sales_person:
                row.sales_person = req.to_sales_person
        doc.save(ignore_permissions=True)
    # Deliberately no Sales Invoice writes.


def request_dict(doc):
    return {'name': doc.name, 'kind': doc.kind, 'requested_by': doc.requested_by, 'status': doc.status,
        'report_date': str(doc.report_date or ''), 'to_date': str(doc.get('to_date') or ''), 'company': doc.get('company') or '', 'from_sales_person': doc.from_sales_person or '',
        'to_sales_person': doc.to_sales_person or '', 'customers': json.loads(doc.customers or '[]'),
        'creation':str(doc.creation or ''), 'file_url':doc.file_url if manager(frappe.session.user) else '', 'note': doc.note or '', 'review_note': doc.review_note or '', 'report_document': doc.report_document or ''}



def finance_allowed(user):
    return manager(user) or bool(frappe.db.exists(FINANCE_ACCESS_DT, {"user": user, "enabled": 1}))


def finance_advance_rows(report_date, company):
    
    
    
    MIN_OUTSTANDING = 1
    EXCLUDE_VOUCHERS = [
        "SINV-S2-2023-00528",
        "SINV-DM-2022-00081",
    ]
    
    HOLD_REMARK = "ERP next consultant-Consulted to not touch this Due to Audit resons."
    HOLD_VOUCHERS = [
        "SCN-S2-2023-00013",
        "SCN-DM-2022-00094",
        "JV-DM-2024-19670-2",
        "SINV-DM-2022-00241",
        "SCN-DM-2022-00014",
        "SCN-DM-2022-00040-3",
        "JV-DM-2022-04883",
        "JV-DM-2022-07890-2",
        "JV-DM-2023-13942",
        "JV-DM-2023-13983-2",
        "JV-DM-2024-15950-2",
        "SINV-DM-2026-24563",
        "SINV-DM-2024-14215",
        "DT2876"
    ]
    # JV entries your sheet shows as a negative figure under "Paid Amount"
    PAID_REVERSAL = ["JV-DM-2024-19670-2", "JV-DM-2022-04883"]
    
    args = {
        "company": company,
        "date": report_date,
        "hold": tuple(HOLD_VOUCHERS),
        "skip": tuple(HOLD_VOUCHERS + EXCLUDE_VOUCHERS),
        "minamt": MIN_OUTSTANDING,
    }
    out = []
    
    # ---------- 1. Advances from the payment ledger ----------
    rows = frappe.db.sql("""
        SELECT ple.party,
               ple.against_voucher_type AS voucher_type,
               ple.against_voucher_no  AS voucher_no,
               MIN(ple.posting_date)   AS posting_date,
               SUM(ple.amount)         AS outstanding,
               SUM(CASE WHEN ple.voucher_no = ple.against_voucher_no
                        THEN ple.amount ELSE 0 END) AS original,
               (SELECT st.sales_person FROM `tabSales Team` st
                 WHERE st.parenttype = 'Customer' AND st.parent = ple.party
                 ORDER BY st.idx LIMIT 1) AS sales_person
        FROM `tabPayment Ledger Entry` ple
        WHERE ple.docstatus = 1 AND ple.delinked = 0
          AND ple.account_type = 'Receivable'
          AND ple.company = %(company)s
          AND ple.posting_date <= %(date)s
          AND ple.against_voucher_no NOT IN %(skip)s
        GROUP BY ple.against_voucher_type, ple.against_voucher_no, ple.party
        HAVING SUM(ple.amount) < 0
        ORDER BY outstanding ASC
    """, args, as_dict=True)
    
    for r in rows:
        is_cn = False
        if r.voucher_type == "Sales Invoice":
            si = frappe.db.get_value("Sales Invoice", r.voucher_no, ["posting_date", "is_return"], as_dict=True)
            if si:
                # an invoice dated after the report date did not exist on that date;
                # its payment is added back in section 1b under the payment's own name
                if frappe.utils.date_diff(si.posting_date, report_date) > 0:
                    continue
                is_cn = bool(si.is_return)
        if abs(r.outstanding or 0) <= MIN_OUTSTANDING:
            continue
        orig = abs(r.original or 0)
        out.append({
            "posting_date": r.posting_date,
            "party": r.party,
            "sales_person": r.sales_person,
            "voucher_type": r.voucher_type,
            "voucher_no": r.voucher_no,
            "invoiced_amount": 0,
            "paid_amount": 0 if is_cn else orig,
            "credit_note": orig if is_cn else 0,
            "outstanding_amount": r.outstanding,
            "aging_days": frappe.utils.date_diff(report_date, r.posting_date),
            "remarks": "",
        })
    
    # ---------- 1b. Payments that were advances on the report date
    #            but were allocated later to invoices dated after it ----------
    later_rows = frappe.db.sql("""
        SELECT pe.name AS voucher_no, pe.party, pe.posting_date,
               SUM(per.allocated_amount) AS later_amt,
               (SELECT st.sales_person FROM `tabSales Team` st
                 WHERE st.parenttype = 'Customer' AND st.parent = pe.party
                 ORDER BY st.idx LIMIT 1) AS sales_person
        FROM `tabPayment Entry` pe
        INNER JOIN `tabPayment Entry Reference` per ON per.parent = pe.name
        INNER JOIN `tabSales Invoice` si
                ON si.name = per.reference_name AND per.reference_doctype = 'Sales Invoice'
        WHERE pe.docstatus = 1
          AND pe.payment_type = 'Receive'
          AND pe.party_type = 'Customer'
          AND pe.company = %(company)s
          AND pe.posting_date <= %(date)s
          AND si.docstatus = 1
          AND si.posting_date > %(date)s
        GROUP BY pe.name, pe.party, pe.posting_date
    """, args, as_dict=True)
    
    idx = {}
    n = 0
    for row in out:
        idx[row["voucher_no"]] = n
        n = n + 1
    
    for r in later_rows:
        if r.voucher_no in HOLD_VOUCHERS or r.voucher_no in EXCLUDE_VOUCHERS:
            continue
        amt = frappe.utils.flt(r.later_amt, 2)
        if r.voucher_no in idx:
            # same payment is also partly unallocated today: add the two parts together
            row = out[idx[r.voucher_no]]
            row["paid_amount"] = row["paid_amount"] + amt
            row["outstanding_amount"] = row["outstanding_amount"] - amt
        else:
            if amt <= MIN_OUTSTANDING:
                continue
            out.append({
                "posting_date": r.posting_date,
                "party": r.party,
                "sales_person": r.sales_person,
                "voucher_type": "Payment Entry",
                "voucher_no": r.voucher_no,
                "invoiced_amount": 0,
                "paid_amount": amt,
                "credit_note": 0,
                "outstanding_amount": -amt,
                "aging_days": frappe.utils.date_diff(report_date, r.posting_date),
                "remarks": "",
            })
    
    # ---------- 2. Audit-hold vouchers (always at the bottom) ----------
    def hold_row(v, vtype, party, posting_date, sales_person, dr, cr):
        dr = frappe.utils.flt(dr, 2)
        cr = frappe.utils.flt(cr, 2)
        amt = frappe.utils.flt(dr - cr, 2)
        inv = 0
        paid = 0
        cn = 0
        if v.startswith("SCN"):
            cn = abs(amt)
        elif v in PAID_REVERSAL:
            base = dr if dr else abs(amt)
            amt = base
            paid = -base
        elif amt > 0:
            inv = amt
        elif amt < 0:
            paid = abs(amt)
        elif dr > 0:
            inv = dr
            amt = dr
        return {
            "posting_date": posting_date,
            "party": party,
            "sales_person": sales_person,
            "voucher_type": vtype,
            "voucher_no": v,
            "invoiced_amount": inv,
            "paid_amount": paid,
            "credit_note": cn,
            "outstanding_amount": amt,
            "aging_days": frappe.utils.date_diff(report_date, posting_date),
            "remarks": HOLD_REMARK,
        }
    
    # 2a. from GL Entry
    gl_rows = frappe.db.sql("""
        SELECT gle.voucher_type, gle.voucher_no, gle.party,
               MIN(gle.posting_date) AS posting_date,
               SUM(gle.debit) AS dr,
               SUM(gle.credit) AS cr,
               (SELECT st.sales_person FROM `tabSales Team` st
                 WHERE st.parenttype = 'Customer' AND st.parent = gle.party
                 ORDER BY st.idx LIMIT 1) AS sales_person
        FROM `tabGL Entry` gle
        INNER JOIN `tabAccount` acc ON acc.name = gle.account
        WHERE gle.is_cancelled = 0
          AND (acc.account_type = 'Receivable' OR gle.party_type = 'Customer')
          AND gle.voucher_no IN %(hold)s
          AND gle.posting_date <= %(date)s
        GROUP BY gle.voucher_type, gle.voucher_no, gle.party
    """, args, as_dict=True)
    
    found = []
    hold_out = {}
    for r in gl_rows:
        found.append(r.voucher_no)
        row = hold_row(r.voucher_no, r.voucher_type, r.party, r.posting_date,
                       r.sales_person, r.dr, r.cr)
        if r.voucher_no in hold_out:
            prev = hold_out[r.voucher_no]
            prev["invoiced_amount"] = prev["invoiced_amount"] + row["invoiced_amount"]
            prev["paid_amount"] = prev["paid_amount"] + row["paid_amount"]
            prev["credit_note"] = prev["credit_note"] + row["credit_note"]
            prev["outstanding_amount"] = prev["outstanding_amount"] + row["outstanding_amount"]
        else:
            hold_out[r.voucher_no] = row
    
    # 2b. not in GL: read the Journal Entry account lines directly
    missing = []
    for v in HOLD_VOUCHERS:
        if v not in found:
            missing.append(v)
    
    if missing:
        je_rows = frappe.db.sql("""
            SELECT je.name AS voucher_no, je.posting_date, jea.party,
                   SUM(jea.debit) AS dr, SUM(jea.credit) AS cr,
                   (SELECT st.sales_person FROM `tabSales Team` st
                     WHERE st.parenttype = 'Customer' AND st.parent = jea.party
                     ORDER BY st.idx LIMIT 1) AS sales_person
            FROM `tabJournal Entry Account` jea
            INNER JOIN `tabJournal Entry` je ON je.name = jea.parent
            WHERE je.name IN %(missing)s
              AND je.docstatus = 1
              AND jea.party_type = 'Customer'
              AND je.posting_date <= %(date)s
            GROUP BY je.name, je.posting_date, jea.party
        """, {"missing": tuple(missing), "date": report_date}, as_dict=True)
        for r in je_rows:
            found.append(r.voucher_no)
            hold_out[r.voucher_no] = hold_row(r.voucher_no, "Journal Entry", r.party,
                                              r.posting_date, r.sales_person, r.dr, r.cr)
    
    # 2c. add in sheet order; skip cancelled; placeholder if still not found
    for v in HOLD_VOUCHERS:
        if v in hold_out:
            out.append(hold_out[v])
        else:
            ds = frappe.db.get_value("Journal Entry", v, "docstatus")
            if ds is None:
                ds = frappe.db.get_value("Sales Invoice", v, "docstatus")
            if ds == 2:
                continue
            if ds is None:
                reason = "Voucher not found (no such document)"
            else:
                reason = "Voucher not found in GL or JE party lines"
            out.append({
                "posting_date": None,
                "party": "",
                "sales_person": "",
                "voucher_type": "",
                "voucher_no": v,
                "invoiced_amount": 0,
                "paid_amount": 0,
                "credit_note": 0,
                "outstanding_amount": 0,
                "aging_days": 0,
                "remarks": reason,
            })
    
    return out


def finance_sales_rows(from_date, to_date):
    
    
    
    
    if not from_date or not to_date:
        frappe.throw("From Date and To Date are required")
    
    EXCLUDED = (
        'Zia Ur-Rehman','Sibtul Hassan','Sales Team','Sabry Younes','Saddam',
        'Ramiz Arnoos','Parvez Abdul Khader','Mohammed Ashfaq Shekabba','Mahamed Sait',
        'Internal Sales','General','Fouzan','DMM Showroom','Asrar Ahmad','All','Afroze Nakwa',
        'accounts@dmgroupksa.com','Abdul Khader Rizwan','Mohammed Ismath','Ritesh Kaushik',
        'Safwat Abdelrehim','Ashfak Nakwa','Basith Shaikh','Mohsin Ismail','Arslan Abdul Shakoor',
        'Murad Ali','Umar Sherrif','Shakeel Ahmed Syed','Mohammed Rahil','Rihal Mohammed',
        'Said Al-Shama','zia','Muzammil Iqbal','Ahmed Mohsen Shehata','Samiulla Nakwa',
        'Mohammed Rafique','Mujahidul Islam','Safan Siraj','Shaikh Safwan','Bahauddin',
        'Mohammed Afzal','Riyaz Mohammed Sagar','Haider Muhammed Ihsan','Gulshair Ashfaq',
        'Atta Ul Monim','Abdullakutty Shahnavas','Hisham Moohammed Nayeem Moula','Mohammed Umar',
        'Nahzan Ahmed Armar','Sheik Mohammed Jahir Saheb','Maged Mohamed Zakaria','Mohammad Danial',
        'Youssef Fathy Youssef Abdalla','Irfan Nakwa','Salah Alhussain',
        'RITESH KUMAR KAUSHIK','SATNAM SINGH','Abdulmunim Mohammed',
        'account@dmgroupksa.com','Firoz Khan','Hossam Abud','Legal'
    )
    
    def norm_brand(name):
        return " ".join(str(name or "").lower().split())
    
    month_field_map = {
        1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr',
        5: 'may', 6: 'jun', 7: 'jul', 8: 'aug',
        9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec'
    }
    
    # --------------------------------------------------
    # DATE VALIDATION
    # --------------------------------------------------
    fd = frappe.utils.getdate(from_date)
    td = frappe.utils.getdate(to_date)
    
    if fd > td:
        frappe.throw("From Date cannot be later than To Date")
    
    active_months = [
        m for m in month_field_map
        if fd.month <= m <= td.month
    ]
    
    # --------------------------------------------------
    # SALES PERSONS
    # --------------------------------------------------
    sp_rows = frappe.db.sql("""
        SELECT
            name,
            IFNULL(location, '') AS location,
            IFNULL(custom__sales_monthly_target, 0) AS monthly_target
        FROM `tabSales Person`
        WHERE name NOT IN %(excluded)s
        ORDER BY location, name
    """, {
        "excluded": EXCLUDED
    }, as_dict=True)
    
    # --------------------------------------------------
    # BRAND TARGETS FROM SALES PERSON CHILD TABLE
    # Child table fieldname: targets
    # Child DocType: Target Detail
    # Target fields: brand, fiscal_year, target_amount
    # --------------------------------------------------
    target_rows = frappe.db.sql("""
        SELECT
            td.parent AS sales_person,
            td.brand AS brand,
            IFNULL(td.target_amount, 0) AS target_amount,
            td.fiscal_year AS fiscal_year
        FROM `tabTarget Detail` td
        INNER JOIN `tabFiscal Year` fy
            ON fy.name = td.fiscal_year
        WHERE td.parenttype = 'Sales Person'
          AND td.parentfield = 'targets'
          AND fy.year_start_date <= %s
          AND fy.year_end_date >= %s
          AND IFNULL(td.brand, '') != ''
    """, (to_date, from_date), as_dict=True)
    
    person_target_map = {}
    person_brand_names = {}
    
    for t in target_rows:
        sp_name = t.sales_person
        brand_name = t.brand
        brand_key = norm_brand(brand_name)
        target_amount = t.target_amount or 0
    
        if not brand_key:
            continue
    
        person_target_map.setdefault(sp_name, {})
        person_brand_names.setdefault(sp_name, {})
    
        person_target_map[sp_name][brand_key] = (
            person_target_map[sp_name].get(brand_key, 0)
            + target_amount
        )
    
        person_brand_names[sp_name][brand_key] = brand_name
    
    # --------------------------------------------------
    # BRAND-WISE ACTUAL SALES
    # --------------------------------------------------
    brand_rows = frappe.db.sql("""
        SELECT
            st.sales_person,
            YEAR(si.posting_date) AS year_num,
            MONTH(si.posting_date) AS month_num,
            IFNULL(NULLIF(it.brand, ''), 'No Brand') AS brand,
            SUM(sii.net_amount) AS net_amount
        FROM `tabSales Invoice` si
        JOIN `tabSales Team` st
            ON st.parent = si.name
           AND st.parenttype = 'Sales Invoice'
        JOIN `tabSales Invoice Item` sii
            ON sii.parent = si.name
        JOIN `tabItem` it
            ON it.name = sii.item_code
        WHERE si.docstatus = 1
          AND si.posting_date BETWEEN %s AND %s
        GROUP BY
            st.sales_person,
            YEAR(si.posting_date),
            MONTH(si.posting_date),
            IFNULL(NULLIF(it.brand, ''), 'No Brand')
    """, (from_date, to_date), as_dict=True)
    
    brand_map = {}
    
    for b in brand_rows:
        sp_name = b.sales_person
        brand_name = b.brand
        month_key = (b.year_num, b.month_num)
    
        brand_map.setdefault(sp_name, {})
        brand_map[sp_name].setdefault(brand_name, {})
    
        brand_map[sp_name][brand_name][month_key] = (
            brand_map[sp_name][brand_name].get(month_key, 0)
            + (b.net_amount or 0)
        )
    
    # --------------------------------------------------
    # TOTAL SALES BY SALESPERSON
    # --------------------------------------------------
    invoice_rows = frappe.db.sql("""
        SELECT
            st.sales_person,
            YEAR(si.posting_date) AS year_num,
            MONTH(si.posting_date) AS month_num,
            SUM(si.net_total) AS total_net
        FROM `tabSales Invoice` si
        JOIN `tabSales Team` st
            ON st.parent = si.name
           AND st.parenttype = 'Sales Invoice'
        WHERE si.docstatus = 1
          AND si.posting_date BETWEEN %s AND %s
        GROUP BY
            st.sales_person,
            YEAR(si.posting_date),
            MONTH(si.posting_date)
    """, (from_date, to_date), as_dict=True)
    
    invoice_map = {}
    
    for r in invoice_rows:
        sp_name = r.sales_person
        month_key = (r.year_num, r.month_num)
    
        invoice_map.setdefault(sp_name, {})
    
        invoice_map[sp_name][month_key] = (
            invoice_map[sp_name].get(month_key, 0)
            + (r.total_net or 0)
        )
    
    # --------------------------------------------------
    # BUILD REPORT
    # --------------------------------------------------
    rows = []
    
    for sp in sp_rows:
        sp_name = sp.name
        target = sp.monthly_target or 0
        target_total = target * len(active_months)
    
        person_bt = person_target_map.get(sp_name, {})
        person_names = person_brand_names.get(sp_name, {})
        person_brands = brand_map.get(sp_name, {})
        person_invoice = invoice_map.get(sp_name, {})
    
        if not person_brands and not target and not person_bt:
            continue
    
        # SALES TARGET
        target_row = {
            "sales_person": sp_name,
            "particular": "Sales Target"
        }
    
        for m_num, field in month_field_map.items():
            target_row[field] = target if m_num in active_months else 0
    
        target_row["total"] = target_total
        rows.append(target_row)
    
        # HEADER
        rows.append({
            "sales_person": sp_name,
            "particular": "Actual Sales (Brand Wise)"
        })
    
        # Sort brands by total sales, highest first
        brand_totals = {}
    
        for brand_name, months in person_brands.items():
            brand_total = 0
    
            for amount in months.values():
                brand_total = brand_total + amount
    
            brand_totals[brand_name] = brand_total
    
        sorted_brands = sorted(
            brand_totals.keys(),
            key=lambda brand_name: -brand_totals[brand_name]
        )
    
        month_total = {}
        for m_num in month_field_map:
            month_total[m_num] = 0
    
        grand_total = 0
        sold_keys = []
    
        # BRAND SALES ROWS
        for brand_name in sorted_brands:
            brand_key = norm_brand(brand_name)
    
            brand_row = {
                "sales_person": sp_name,
                "particular": brand_name,
                "brand_target": person_bt.get(brand_key, 0)
            }
    
            sold_keys.append(brand_key)
            row_total = 0
    
            for m_num, field in month_field_map.items():
                amt = 0
    
                for month_key, value in person_brands[brand_name].items():
                    year_num = month_key[0]
                    month_num = month_key[1]
    
                    if month_num == m_num and (
                        (fd.year < year_num < td.year)
                        or (year_num == fd.year and month_num >= fd.month)
                        or (year_num == td.year and month_num <= td.month)
                    ):
                        amt = amt + value
    
                brand_row[field] = amt
                row_total = row_total + amt
                month_total[m_num] = month_total[m_num] + amt
    
            brand_row["total"] = row_total
            grand_total = grand_total + row_total
            rows.append(brand_row)
    
        # TARGETED BRANDS WITH NO SALES
        for brand_key, target_amount in person_bt.items():
            if brand_key not in sold_keys:
                brand_name = person_names.get(brand_key, brand_key.title())
    
                extra = {
                    "sales_person": sp_name,
                    "particular": brand_name,
                    "brand_target": target_amount
                }
    
                for m_num, field in month_field_map.items():
                    extra[field] = 0
    
                extra["total"] = 0
                rows.append(extra)
    
        # BRAND TOTAL
        brand_target_total = 0
    
        for target_amount in person_bt.values():
            brand_target_total = brand_target_total + target_amount
    
        brand_total_row = {
            "sales_person": sp_name,
            "particular": "Brand Sales Total",
            "brand_target": brand_target_total
        }
    
        for m_num, field in month_field_map.items():
            brand_total_row[field] = month_total[m_num]
    
        brand_total_row["total"] = grand_total
        rows.append(brand_total_row)
    
        # % ACHIEVED
        pct_row = {
            "sales_person": sp_name,
            "particular": "% Achieved"
        }
    
        for m_num, field in month_field_map.items():
            pct_row[field] = (
                round((month_total[m_num] / target) * 100, 1)
                if target and m_num in active_months else 0
            )
    
        pct_row["total"] = (
            round((grand_total / target_total) * 100, 1)
            if target_total else 0
        )
    
        rows.append(pct_row)
    
        # TOTAL SALES
        total_sales_row = {
            "sales_person": sp_name,
            "particular": "Total Sales"
        }
    
        total_sales = 0
    
        for m_num, field in month_field_map.items():
            amt = 0
    
            for month_key, value in person_invoice.items():
                year_num = month_key[0]
                month_num = month_key[1]
    
                if month_num == m_num and (
                    (fd.year < year_num < td.year)
                    or (year_num == fd.year and month_num >= fd.month)
                    or (year_num == td.year and month_num <= td.month)
                ):
                    amt = amt + value
    
            total_sales_row[field] = amt
            total_sales = total_sales + amt
    
        total_sales_row["total"] = total_sales
        rows.append(total_sales_row)
    
        # TOTAL %
        total_pct_row = {
            "sales_person": sp_name,
            "particular": "Total %"
        }
    
        for m_num, field in month_field_map.items():
            amt = total_sales_row[field]
    
            total_pct_row[field] = (
                round((amt / target) * 100, 1)
                if target and m_num in active_months else 0
            )
    
        total_pct_row["total"] = (
            round((total_sales / target_total) * 100, 1)
            if target_total else 0
        )
    
        rows.append(total_pct_row)
    
    return rows


def finance_pdf(req, send_email=True):
    if not finance_allowed(req.requested_by):
        frappe.throw('Finance report access has been revoked for this requester.')
    if req.kind == 'Advance Report':
        doctype = 'Advance Receivable Report'
        fmt = 'Advance Receivable Report'
        table = 'items'
        rows = finance_advance_rows(str(req.report_date), req.company)
    else:
        doctype = 'Sales vs Target Report - Brand Wise'
        fmt = 'Sales VS Target - brand wise'
        table = 'report_rows'
        rows = finance_sales_rows(str(req.report_date), str(req.to_date))
    if not rows:
        frappe.throw('The report returned no rows for the selected filters.')
    name = 'SOA-' + req.name
    exists = frappe.db.exists(doctype, name)
    doc = frappe.get_doc(doctype, name) if exists else frappe.get_doc({'doctype': doctype})
    if U.cint(doc.docstatus):
        frappe.throw('The generated Finance report must remain a draft.')
    if req.kind == 'Advance Report':
        doc.report_date = req.report_date
        doc.company = req.company
    else:
        doc.from_date = req.report_date
        doc.to_date = req.to_date
    doc.set(table, [])
    for row in rows:
        doc.append(table, row)
    if exists:
        doc.save(ignore_permissions=True)
    else:
        doc.insert(ignore_permissions=True, set_name=name)
    pdf = frappe.get_print(doctype, doc.name, print_format=fmt, as_pdf=True, pdf_options={'orientation':'Landscape'})
    file = frappe.get_doc({'doctype':'File', 'file_name':req.name + '_' + req.kind.replace(' ', '_') + '.pdf',
        'is_private':1, 'attached_to_doctype':REQUEST_DT, 'attached_to_name':req.name, 'content':pdf}).insert(ignore_permissions=True)
    req.finance_document = doc.name
    req.file_id = file.name
    req.file_url = file.file_url
    if not send_email:
        return
    if not req.requested_by or '@' not in req.requested_by:
        frappe.throw('The requester needs an email address.')
    frappe.sendmail(recipients=[req.requested_by], subject=req.kind + ' - ' + str(req.report_date),
        message='Your Finance report approved by the SOA Manager is attached as a PDF.',
        attachments=[{'fid':file.name}], reference_doctype=REQUEST_DT, reference_name=req.name)


def notify_azrah(doctype, name, kind):
    recipient = 'sales.wp2@dmgroupksa.com'
    if not frappe.db.exists('User', {'name':recipient, 'enabled':1}):
        frappe.throw('The configured approval recipient is not an enabled user: ' + recipient)
    subject = 'Approval needed: ' + str(kind)
    if not frappe.db.exists('Notification Log', {'for_user':recipient, 'document_type':doctype, 'document_name':name, 'subject':subject}):
        frappe.get_doc({'doctype':'Notification Log','for_user':recipient,'type':'Alert',
            'document_type':doctype,'document_name':name,'subject':subject}).insert(ignore_permissions=True)


def email_reviewed_pdf(req):
    if not req.requested_by or '@' not in req.requested_by or not frappe.db.exists('File', req.file_id):
        frappe.throw('The reviewed attachment or recipient is missing. Generate the preview again.')
    frappe.sendmail(recipients=[req.requested_by], subject=req.kind + ' - ' + str(req.report_date),
        message='Your approved report is attached as a PDF.', attachments=[{'fid':req.file_id}],
        reference_doctype=REQUEST_DT, reference_name=req.name)

args = frappe.form_dict
user = frappe.session.user
action = args.get('action') or 'bootstrap'
if user == 'Guest':
    frappe.throw('Sign in to use SOA requests.')
res = {}
if action == 'setup':
    roles = frappe.get_all('Has Role', filters={'parent': user, 'parenttype': 'User'}, pluck='role')
    if user != 'Administrator' and 'System Manager' not in roles:
        frappe.throw('Run setup as Administrator or System Manager.')
    definitions = [
        ['SOA Approval Reminder', [{'fieldname':'request_key','fieldtype':'Data','unique':1,'reqd':1}, {'fieldname':'stage','fieldtype':'Int'}, {'fieldname':'last_sent','fieldtype':'Datetime'}]],
        [FINANCE_ACCESS_DT, [{'fieldname':'user','fieldtype':'Link','options':'User','reqd':1,'unique':1}, {'fieldname':'enabled','fieldtype':'Check','default':'1'}]],
        [ACCESS_DT, [{'fieldname':'user','fieldtype':'Link','options':'User','reqd':1,'unique':1}, {'fieldname':'enabled','fieldtype':'Check','default':'1'}]],
        [REQUEST_DT, [
            {'fieldname':'kind','fieldtype':'Select','options':'Customer Outstanding Report\nCustomer Transfer\nAdvance Report\nSales vs Target Report','reqd':1},
            {'fieldname':'requested_by','fieldtype':'Link','options':'User','reqd':1},
            {'fieldname':'status','fieldtype':'Select','options':'Pending\nApproved\nRejected','default':'Pending'},
            {'fieldname':'report_date','fieldtype':'Date'}, {'fieldname':'to_date','fieldtype':'Date'}, {'fieldname':'company','fieldtype':'Link','options':'Company'}, {'fieldname':'finance_document','fieldtype':'Data'}, {'fieldname':'from_sales_person','fieldtype':'Link','options':'Sales Person'},
            {'fieldname':'to_sales_person','fieldtype':'Link','options':'Sales Person'}, {'fieldname':'customers','fieldtype':'Long Text'},
            {'fieldname':'note','fieldtype':'Small Text'}, {'fieldname':'review_note','fieldtype':'Small Text'},
            {'fieldname':'reviewed_by','fieldtype':'Link','options':'User'}, {'fieldname':'reviewed_on','fieldtype':'Datetime'},
            {'fieldname':'report_document','fieldtype':'Link','options':REPORT_DT}, {'fieldname':'file_url','fieldtype':'Data'}, {'fieldname':'file_id','fieldtype':'Link','options':'File'}]]]
    for definition in definitions:
        if not frappe.db.exists('DocType', definition[0]):
            for field in definition[1]:
                field['label'] = field['fieldname'].replace('_', ' ').title()
            frappe.get_doc({'doctype':'DocType','name':definition[0],'custom':1,'module':'Selling','autoname':'hash',
                'track_changes':1,'fields':definition[1]}).insert(ignore_permissions=True)
    existing = frappe.get_doc('DocType', REQUEST_DT)
    desired = definitions[-1][1]
    changed = False
    for field in desired:
        found = None
        for current in existing.fields:
            if current.fieldname == field['fieldname']:
                found = current
        if not found:
            field['label'] = field['fieldname'].replace('_',' ').title()
            existing.append('fields', field)
            changed = True
        elif field['fieldname'] == 'kind':
            options = (found.options or '').split('\n')
            for kind in ['Advance Report','Sales vs Target Report']:
                if kind not in options:
                    options.append(kind)
                    changed = True
            found.options = '\n'.join(options)
    if changed:
        existing.save(ignore_permissions=True)
    frappe.db.commit()
    res = {'ready': True}
elif not frappe.db.exists('DocType', REQUEST_DT) or not frappe.db.exists('DocType', ACCESS_DT):
    frappe.throw('Run soa_workflow_api action=setup once as Administrator or System Manager.')
elif action == 'finance_bootstrap':
    if not frappe.db.exists('DocType', FINANCE_ACCESS_DT):
        frappe.throw('Run workflow setup again for the Finance dashboard.')
    if not finance_allowed(user):
        frappe.throw('Ask Azrah to enable Finance report access for your user.')
    res = {'today':U.nowdate(), 'companies':frappe.get_list('Company', pluck='name', limit_page_length=0)}
elif action == 'request_finance':
    if not finance_allowed(user):
        frappe.throw('Finance report access is required.')
    kind = args.get('kind')
    if kind not in ['Advance Report','Sales vs Target Report']:
        frappe.throw('Choose a Finance report.')
    date = str(U.getdate(args.get('date') or U.nowdate()))
    end = str(U.getdate(args.get('to_date') or date))
    if date > U.nowdate() or end > U.nowdate() or date > end:
        frappe.throw('Choose a valid date range through today.')
    company = args.get('company') if kind == 'Advance Report' else None
    if kind == 'Advance Report' and company not in frappe.get_list('Company', pluck='name', limit_page_length=0):
        frappe.throw('Choose an accessible company.')
    doc = frappe.get_doc({'doctype':REQUEST_DT,'kind':kind,'requested_by':user,'status':'Pending',
        'report_date':date,'to_date':end,'company':company,'note':str(args.get('note') or '')[:500]}).insert(ignore_permissions=True)
    notify_azrah(REQUEST_DT, doc.name, doc.kind)
    res = request_dict(doc)
elif action == 'bootstrap':
    allowed = transfer_allowed(user)
    res = {'transfer_allowed': allowed, 'salespeople': frappe.get_all('Sales Person', fields=['name','enabled'], filters={'is_group':0}, order_by='name asc', limit_page_length=0) if allowed else [],
           'my_salespeople': salespeople(user), 'today': U.nowdate()}
elif action == 'customers':
    if not transfer_allowed(user):
        frappe.throw('Azrah has not enabled customer transfer requests for your user.')
    source = args.get('source')
    res = {'customers': [name for name, owners in customer_owners().items() if source in [row['sales_person'] for row in owners]]}
elif action in ['request_report','request_transfer']:
    frappe.db.sql('select name from `tabUser` where name=%(user)s for update', {'user':user})
    kind = 'Customer Outstanding Report' if action == 'request_report' else 'Customer Transfer'
    values = {'doctype':REQUEST_DT,'kind':kind,'requested_by':user,'status':'Pending','note':str(args.get('note') or '')[:500]}
    if action == 'request_report':
        if not salespeople(user):
            frappe.throw('Link the requesting Employee to a Sales Person first.')
        date = str(U.getdate(args.get('date') or U.nowdate()))
        if date > U.nowdate():
            frappe.throw('The report date cannot be in the future.')
        used = frappe.get_all(REQUEST_DT, filters={'requested_by':user,'kind':kind,'creation':['>=',U.nowdate()]}, pluck='name',limit_page_length=0)
        if not manager(user) and len(used) >= 3:
            frappe.throw('You have used your 3 Customer Outstanding Report requests for today.')
        values['report_date'] = date
    else:
        if not transfer_allowed(user):
            frappe.throw('Azrah has not enabled customer transfer requests for your user.')
        source = args.get('source'); target = args.get('target')
        if not source or not target or source == target:
            frappe.throw('Choose different source and destination salespeople.')
        ids = []
        for customer in json.loads(args.get('customers') or '[]'):
            if customer not in ids:
                ids.append(customer)
        owners = customer_owners()
        if not ids or any(source not in [row['sales_person'] for row in owners.get(name, [])] for name in ids):
            frappe.throw('Choose valid customers belonging to the source salesperson.')
        values.update({'from_sales_person':source,'to_sales_person':target,'customers':json.dumps(ids)})
    doc = frappe.get_doc(values).insert(ignore_permissions=True)
    notify_azrah(REQUEST_DT, doc.name, doc.kind)
    res = request_dict(doc)
elif action == 'mine':
    res = {'requests':[request_dict(frappe.get_doc(REQUEST_DT, name)) for name in frappe.get_all(REQUEST_DT,filters={'requested_by':user},pluck='name',order_by='creation desc',limit_page_length=100)]}
elif action == 'admin':
    need_manager()
    res = {'requests':[request_dict(frappe.get_doc(REQUEST_DT,name)) for name in frappe.get_all(REQUEST_DT,pluck='name',order_by='creation desc',limit_page_length=300)],
           'users':frappe.get_all('User',filters={'enabled':1,'user_type':'System User'},fields=['name','full_name'],order_by='full_name asc',limit_page_length=0),
           'finance_access':frappe.get_all(FINANCE_ACCESS_DT,filters={'enabled':1},pluck='user',limit_page_length=0) if frappe.db.exists('DocType',FINANCE_ACCESS_DT) else [],
           'access':frappe.get_all(ACCESS_DT,filters={'enabled':1},pluck='user',limit_page_length=0)}
elif action in ['access','finance_access']:
    need_manager()
    who = args.get('user')
    if not who or not frappe.db.exists('User', {'name':who,'enabled':1}):
        frappe.throw('Choose an enabled user.')
    access_type = FINANCE_ACCESS_DT if action == 'finance_access' else ACCESS_DT
    name = frappe.db.get_value(access_type,{'user':who},'name')
    doc = frappe.get_doc(access_type,name) if name else frappe.get_doc({'doctype':access_type,'user':who})
    doc.enabled = 1 if U.cint(args.get('enabled')) else 0
    doc.save(ignore_permissions=True) if name else doc.insert(ignore_permissions=True)
    res = {'saved':True}
elif action == 'open_pdf':
    need_manager()
    doc = frappe.get_doc(REQUEST_DT,args.get('name'))
    if not doc.file_id:
        frappe.throw('Generate the PDF preview first.')
    file = frappe.get_doc('File',doc.file_id)
    if file.attached_to_doctype != REQUEST_DT or file.attached_to_name != doc.name:
        frappe.throw('This file does not belong to the request.')
    frappe.response['filename'] = file.file_name
    frappe.response['filecontent'] = file.get_content()
    frappe.response['type'] = 'download'
    frappe.response['display_content_as'] = 'inline'
    res = None
elif action == 'preview':
    need_manager()
    frappe.db.sql('select name from `tabSOA Workflow Request` where name=%(name)s for update', {'name':args.get('name')})
    doc = frappe.get_doc(REQUEST_DT,args.get('name'))
    if doc.status != 'Pending':
        frappe.throw('This request is no longer pending.')
    if doc.kind == 'Customer Outstanding Report':
        report_pdf(doc, False)
    elif doc.kind in ['Advance Report','Sales vs Target Report']:
        finance_pdf(doc, False)
    else:
        # Transfers have no PDF yet: create a review copy from the request itself.
        pdf = frappe.get_print(REQUEST_DT, doc.name, print_format='Standard', as_pdf=True)
        file = frappe.get_doc({'doctype':'File','file_name':doc.name+'_Transfer_Review.pdf','is_private':1,
            'attached_to_doctype':REQUEST_DT,'attached_to_name':doc.name,'content':pdf}).insert(ignore_permissions=True)
        doc.file_id = file.name
        doc.file_url = file.file_url
    doc.save(ignore_permissions=True)
    res = {'file_url':doc.file_url}
elif action == 'review':
    need_manager()
    frappe.db.sql('select name from `tabSOA Workflow Request` where name=%(name)s for update', {'name':args.get('name')})
    doc = frappe.get_doc(REQUEST_DT,args.get('name'))
    if doc.status != 'Pending':
        frappe.throw('This request has already been reviewed.')
    if args.get('op') == 'approve':
        if doc.kind == 'Customer Outstanding Report':
            if doc.file_id:
                email_reviewed_pdf(doc)
            else:
                report_pdf(doc)
        elif doc.kind in ['Advance Report','Sales vs Target Report']:
            if not finance_allowed(doc.requested_by):
                frappe.throw('Finance access has been revoked.')
            if doc.file_id:
                email_reviewed_pdf(doc)
            else:
                finance_pdf(doc)
        elif doc.kind == 'Customer Transfer':
            if not transfer_allowed(doc.requested_by):
                frappe.throw('Transfer access was revoked. Reject this request or restore access first.')
            apply_transfer(doc)
        else:
            frappe.throw('Unsupported request type.')
        doc.status = 'Approved'
    elif args.get('op') == 'reject':
        if not str(args.get('note') or '').strip():
            frappe.throw('Enter a rejection reason.')
        doc.status = 'Rejected'
    else:
        frappe.throw('Choose approve or reject.')
    doc.review_note = str(args.get('note') or '')[:500]
    doc.reviewed_by = user
    doc.reviewed_on = U.now_datetime()
    doc.save(ignore_permissions=True)
    res = request_dict(doc)
else:
    frappe.throw('Unknown workflow action.')
if res is not None:
    frappe.response['message'] = res
