# CEO Finance details: permission-aware, read-only, no posted-record changes.
user = frappe.session.user
if user == 'Guest':
    frappe.throw('Please log in.')
roles = frappe.get_all('Has Role', filters={'parent':user,'parenttype':'User'}, pluck='role')
if user != 'info@dmgroupksa.com' and 'System Manager' not in roles and 'IT Coordinator' not in roles and 'CEO Command Center Viewer' not in roles:
    frappe.throw('CEO dashboard access required.')
mode = frappe.form_dict.get('mode') or 'payables'
if mode not in ['payables','cash','plans']:
    frappe.throw('Invalid Finance view.')
today = frappe.utils.today()
start = str(frappe.utils.getdate(frappe.form_dict.get('from_date') or today))
end = str(frappe.utils.getdate(frappe.form_dict.get('to_date') or today))
if frappe.utils.date_diff(end,start) < 0 or frappe.utils.date_diff(end,start) > 365:
    frappe.throw('Select a date range of 366 days or less.')
company = frappe.form_dict.get('company') or ''
companies = frappe.get_list('Company', fields=['name','default_currency'], limit_page_length=501)
if len(companies) >= 501:
    frappe.throw('Company scope too large.')
company_map = {}
for c in companies:
    company_map[c.name] = c.default_currency
if company and company not in company_map:
    frappe.throw('Company is not accessible.')
used_currency = {}
for c in companies:
    if not company or c.name == company:
        used_currency[c.default_currency] = 1
if len(used_currency) > 1:
    frappe.throw('Select one company; mixed company currencies cannot be added.')
currency = None
for cur in used_currency:
    currency = cur
out = {'mode':mode,'as_of':today,'from_date':start,'to_date':end,'currency':currency,'company':company,'permission_scope':'Records accessible to the requesting user'}
if mode == 'payables':
    filters = [['docstatus','=',1],['posting_date','<=',today],['outstanding_amount','!=',0]]
    if company:
        filters.append(['company','=',company])
    rows = frappe.get_list('Purchase Invoice', fields=['name','company','supplier','supplier_name','posting_date','due_date','outstanding_amount','party_account_currency','on_hold'], filters=filters, order_by='due_date asc, name asc', limit_page_length=20001)
    if len(rows) >= 20001:
        frappe.throw('Too many invoices; select one company. No partial totals shown.')
    summary = {'amount':0,'count':0,'overdue':0,'overdue_count':0,'credits':0,'credit_count':0,'on_hold':0,'missing_due':0}
    groups = {}
    buckets = {}
    for label in ['Not due','1–30 days overdue','31–60 days overdue','61–90 days overdue','Over 90 days overdue','Missing due date']:
        buckets[label] = {'label':label,'amount':0,'count':0}
    records = []
    for r in rows:
        if r.party_account_currency != company_map.get(r.company):
            frappe.throw('Supplier account and company currencies differ or are missing; cannot combine balances.')
        amt = frappe.utils.flt(r.outstanding_amount)
        days = frappe.utils.date_diff(today,r.due_date) if r.due_date else None
        if amt < 0:
            summary['credits'] = summary['credits'] + amt
            summary['credit_count'] = summary['credit_count'] + 1
        elif amt > 0:
            summary['amount'] = summary['amount'] + amt
            summary['count'] = summary['count'] + 1
            label = 'Not due'
            if days is None:
                label = 'Missing due date'
                summary['missing_due'] = summary['missing_due'] + amt
            elif days > 0:
                summary['overdue'] = summary['overdue'] + amt
                summary['overdue_count'] = summary['overdue_count'] + 1
                label = 'Over 90 days overdue'
                if days <= 30:
                    label = '1–30 days overdue'
                elif days <= 60:
                    label = '31–60 days overdue'
                elif days <= 90:
                    label = '61–90 days overdue'
            buckets[label]['amount'] = buckets[label]['amount'] + amt
            buckets[label]['count'] = buckets[label]['count'] + 1
            if r.on_hold:
                summary['on_hold'] = summary['on_hold'] + amt
            key = r.company + ' | ' + r.supplier
            if key not in groups:
                groups[key] = {'key':key,'label':r.supplier_name or r.supplier,'company':r.company,'supplier':r.supplier,'amount':0,'count':0,'overdue':0}
            groups[key]['amount'] = groups[key]['amount'] + amt
            groups[key]['count'] = groups[key]['count'] + 1
            if days is not None and days > 0:
                groups[key]['overdue'] = groups[key]['overdue'] + amt
        records.append({'name':r.name,'company':r.company,'supplier':r.supplier,'supplier_name':r.supplier_name,'date':str(r.posting_date),'due_date':str(r.due_date) if r.due_date else '', 'amount':amt,'days_overdue':max(0,days) if days is not None else None,'on_hold':r.on_hold})
    out['summary'] = summary
    out['groups'] = list(groups.values())
    out['ageing'] = list(buckets.values())
    out['records'] = records
    out['basis'] = 'Current submitted purchase-invoice balances, posting date through today. Supplier advances and journal adjustments are separate; negative balances are not netted.'
elif mode == 'cash':
    filters = [['is_group','=',0],['disabled','=',0],['account_type','in',['Bank','Cash']]]
    if company:
        filters.append(['company','=',company])
    accounts = frappe.get_list('Account', fields=['name','company','account_type','account_currency'], filters=filters, limit_page_length=2001)
    if len(accounts) >= 2001:
        frappe.throw('Account scope too large.')
    names = []
    for a in accounts:
        names.append(a.name)
    out['accounts'] = []
    out['daily'] = []
    total = 0
    debit = 0
    credit = 0
    if names:
        gl = frappe.get_list('GL Entry', fields=['account','sum(debit) as debit','sum(credit) as credit'], filters=[['account','in',names],['is_cancelled','=',0],['posting_date','<=',today]], group_by='account', order_by='account asc', limit_page_length=2001)
        if len(gl) >= 2001:
            frappe.throw('Bank ledger scope too large.')
        gmap = {}
        for r in gl:
            gmap[r.account] = frappe.utils.flt(r.debit) - frappe.utils.flt(r.credit)
        for a in accounts:
            bal = gmap.get(a.name,0)
            total = total + bal
            out['accounts'].append({'name':a.name,'company':a.company,'type':a.account_type,'account_currency':a.account_currency,'amount':bal})
        daily = frappe.get_list('GL Entry', fields=['posting_date','sum(debit) as debit','sum(credit) as credit'], filters=[['account','in',names],['is_cancelled','=',0],['posting_date','between',[start,end]]], group_by='posting_date', order_by='posting_date asc', limit_page_length=367)
        for r in daily:
            dr = frappe.utils.flt(r.debit)
            cr = frappe.utils.flt(r.credit)
            debit = debit + dr
            credit = credit + cr
            out['daily'].append({'date':str(r.posting_date),'debit':dr,'credit':cr,'amount':dr-cr})
    account = frappe.form_dict.get('account') or ''
    if account:
        if account not in names:
            frappe.throw('Bank/cash account is not accessible in this scope.')
        lf = [['account','=',account],['is_cancelled','=',0],['posting_date','between',[start,end]]]
        page = max(0,frappe.utils.cint(frappe.form_dict.get('record_page') or 0))
        counts = frappe.get_list('GL Entry', fields=['count(name) as n'], filters=lf, limit_page_length=1)
        out['record_count'] = frappe.utils.cint(counts[0].n) if counts else 0
        out['records'] = frappe.get_list('GL Entry', fields=['name','posting_date','account','debit','credit','voucher_type','voucher_no','party_type','party'], filters=lf, order_by='posting_date desc, name asc', limit_start=page*50, limit_page_length=50)
        out['record_page'] = page
    out['summary'] = {'balance':total,'debit':debit,'credit':credit,'net':debit-credit,'account_count':len(accounts)}
    out['basis'] = 'Current bank/cash GL balance in company currency; cancelled ledger entries excluded. Period debits/credits include transfers and are not customer collections. Not a bank-reconciled available balance.'
    # Invoice due-date scenario, not a complete treasury forecast.
    weeks = []
    for n in range(13):
        ws = str(frappe.utils.add_days(today,n*7))
        weeks.append({'week':n+1,'from':ws,'to':str(frappe.utils.add_days(ws,6)),'receipts':0,'payments':0,'overdue_payments':0})
    forecast_to = str(frappe.utils.add_days(today,90))
    scenario_available = True
    scenario_error = ''
    for dt,party,kind in [['Sales Invoice','customer','receipts'],['Purchase Invoice','supplier','payments']]:
        try:
            fs = [['docstatus','=',1],['posting_date','<=',today],['outstanding_amount','>',0],['due_date','<=',forecast_to]]
            if company:
                fs.append(['company','=',company])
            invs = frappe.get_list(dt, fields=['name','company','due_date','outstanding_amount','party_account_currency'], filters=fs, limit_page_length=20001)
            if len(invs) >= 20001:
                frappe.throw('Forecast scope too large.')
            for r in invs:
                if r.party_account_currency != company_map.get(r.company):
                    frappe.throw('Forecast currency mismatch.')
                days = frappe.utils.date_diff(r.due_date,today) if r.due_date else None
                if days is None or (kind == 'receipts' and days < 0):
                    continue
                idx = max(0,days)//7
                if idx < 13:
                    weeks[idx][kind] = weeks[idx][kind] + frappe.utils.flt(r.outstanding_amount)
                    if kind == 'payments' and days < 0:
                        weeks[idx]['overdue_payments'] = weeks[idx]['overdue_payments'] + frappe.utils.flt(r.outstanding_amount)
        except Exception:
            scenario_available = False
            scenario_error = 'Invoice due-date scenario unavailable: read permission, scope limit or currency validation failed. No partial scenario is displayed.'
    closing = total
    for w in weeks:
        closing = closing + w['receipts'] - w['payments']
        w['closing'] = closing
    out['weeks'] = weeks if scenario_available else []
    out['scenario_available'] = scenario_available
    out['scenario_error'] = scenario_error
    out['scenario_basis'] = 'Invoice due-date scenario only: future invoice receipts and invoice payments; overdue payables placed in week 1, overdue receivables excluded. Includes on-hold bills. Payroll, expense claims and Treasury Planned Payments excluded. Not an approved funding forecast.'
elif mode == 'plans':
    dt = 'Sales person weekly collection - Invoice wise'
    parents = frappe.get_list(dt, fields=['name','sales_person','posting_date','modified'], filters=[['docstatus','=',1],['posting_date','between',[start,end]]], order_by='posting_date desc, modified desc, name desc', limit_page_length=2001)
    if len(parents) >= 2001:
        frappe.throw('Plan scope too large. Narrow the dates.')
    seen = {}
    latest = []
    for p in parents:
        key = p.sales_person or '~unassigned~'
        if key not in seen:
            seen[key] = 1
            latest.append(p)
    if len(latest) > 200:
        frappe.throw('Too many preparers in plan scope.')
    out['plans'] = []
    out['rows'] = []
    out['unresolved_rows'] = 0
    out['duplicate_rows'] = 0
    estimates = {}
    invoice_seen = {}
    docs = {}
    all_invoice_names = []
    for p in latest:
        doc = frappe.get_doc(dt,p.name)
        doc.check_permission('read')
        docs[p.name] = doc
        for row in doc.get('outstanding') or []:
            for name in (row.get('invoices') or '').replace('\n',',').replace(';',',').split(','):
                if name.strip() and name.strip() not in all_invoice_names:
                    all_invoice_names.append(name.strip())
    if len(all_invoice_names) > 10000:
        frappe.throw('Plan invoice scope too large; narrow the dates.')
    invoice_map = {}
    if all_invoice_names:
        invoice_rows = frappe.get_list('Sales Invoice', fields=['name','company','customer','outstanding_amount','party_account_currency'], filters=[['name','in',all_invoice_names]], limit_page_length=10001)
        for invoice in invoice_rows:
            invoice_map[invoice.name] = invoice
    allocated_map = {}
    allocations_available = True
    try:
        receipt_filters = [['Payment Entry','docstatus','=',1],['Payment Entry','party_type','=','Customer'],['Payment Entry','payment_type','=','Receive'],['Payment Entry','posting_date','between',[start,end]]]
        if company:
            receipt_filters.append(['Payment Entry','company','=',company])
        receipt_currencies = frappe.get_list('Payment Entry', fields=['company','paid_from_account_currency'], filters=receipt_filters, group_by='company, paid_from_account_currency', limit_page_length=1001)
        if len(receipt_currencies) >= 1001:
            frappe.throw('Receipt currency scope too large.')
        for rc in receipt_currencies:
            if rc.paid_from_account_currency != company_map.get(rc.company):
                frappe.throw('Receipt allocation currency mismatch.')
        if all_invoice_names:
            allocation_filters = list(receipt_filters)
            allocation_filters.append(['Payment Entry Reference','reference_doctype','=','Sales Invoice'])
            allocation_filters.append(['Payment Entry Reference','reference_name','in',all_invoice_names])
            allocation_rows = frappe.get_list('Payment Entry', fields=['`tabPayment Entry Reference`.reference_name as invoice','sum(`tabPayment Entry Reference`.allocated_amount) as amount'], filters=allocation_filters, group_by='`tabPayment Entry Reference`.reference_name', order_by='`tabPayment Entry Reference`.reference_name asc', limit_page_length=10001)
            if len(allocation_rows) >= 10001:
                frappe.throw('Receipt allocation scope too large.')
            for ar in allocation_rows:
                allocated_map[ar.invoice] = frappe.utils.flt(ar.amount)
    except Exception:
        allocations_available = False
    out['allocations_available'] = allocations_available
    out['matched_allocated_receipts'] = 0
    for p in latest:
        doc = docs[p.name]
        parent_count = 0
        for r in doc.get('outstanding') or []:
            inv_text = r.get('invoices') or ''
            inv_names = inv_text.replace('\n',',').replace(';',',').split(',')
            clean = []
            for name in inv_names:
                if name.strip():
                    clean.append(name.strip())
            matched = []
            for name in clean:
                if name in invoice_map:
                    matched.append(invoice_map[name])
            if len(clean) != 1 or len(matched) != 1:
                out['unresolved_rows'] = out['unresolved_rows'] + 1
                if company:
                    continue
            row_company = matched[0].company if len(matched) == 1 else ''
            if company and row_company != company:
                continue
            unique = row_company + '|' + (clean[0] if len(clean) == 1 else p.name+'|'+r.name)
            duplicate = unique in invoice_seen
            if duplicate:
                out['duplicate_rows'] = out['duplicate_rows'] + 1
            invoice_seen[unique] = 1
            matched_receipts = allocated_map.get(clean[0],0) if len(clean) == 1 and len(matched) == 1 and allocations_available and not duplicate else None
            if matched_receipts is not None:
                out['matched_allocated_receipts'] = out['matched_allocated_receipts'] + matched_receipts
            saved = []
            for field in r.as_dict():
                if field.startswith('est_') or field.startswith('mar_est_') or field.startswith('apr_est_'):
                    if field != 'est_amt_weekly_total':
                        value = frappe.utils.flt(r.get(field))
                        if value:
                            saved.append({'field':field,'amount':value})
                            if not duplicate:
                                estimates[field] = estimates.get(field,0) + value
            current = None
            if len(matched) == 1 and matched[0].party_account_currency == company_map.get(row_company):
                current = frappe.utils.flt(matched[0].outstanding_amount)
            out['rows'].append({'plan':p.name,'salesperson':p.sales_person,'plan_date':str(p.posting_date),'company':row_company,'customer':r.get('customer'),'invoice':inv_text,'saved_outstanding':frappe.utils.flt(r.get('outstanding_amount')),'current_outstanding':current,'allocated_receipts':matched_receipts,'saved_received':frappe.utils.flt(r.get('rcvd_weekly_total')),'saved_estimate_total':frappe.utils.flt(r.get('est_amt_weekly_total')),'estimates':saved,'remarks':r.get('remarks') or '', 'duplicate':duplicate})
            parent_count = parent_count + 1
        if parent_count:
            out['plans'].append({'name':p.name,'salesperson':p.sales_person,'date':str(p.posting_date),'rows':parent_count})
    out['estimates'] = []
    for field in estimates:
        out['estimates'].append({'field':field,'amount':estimates[field]})
    out['summary'] = {'plan_count':len(out['plans']),'row_count':len(out['rows']),'salesperson_count':len(out['plans'])}
    out['basis'] = 'Latest submitted plan per salesperson issued in the selected dates; older snapshots are not added. Company mapping uses the linked readable invoice. Saved estimate fields are shown separately because legacy monthly/week fields overlap. Saved received totals are historical fields, not verified Payment Entry collections. Duplicate invoice rows flagged and excluded from estimate totals. Allocated receipts are matched through Payment Entry References to each distinct invoice for the selected receipt dates; unallocated receipts and Journal Entries excluded. No achievement percentage is inferred.'
frappe.response['message'] = out
