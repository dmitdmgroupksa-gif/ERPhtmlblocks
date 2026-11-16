# CEO Command Center Collections tab - invoice-only current balances. Read-only, permission aware.
user = frappe.session.user
if user == 'Guest':
    frappe.throw('Please log in.')
roles = frappe.get_all('Has Role', filters={'parent': user, 'parenttype': 'User'}, pluck='role')
if user != 'info@dmgroupksa.com' and 'System Manager' not in roles and 'IT Coordinator' not in roles and 'CEO Command Center Viewer' not in roles:
    frappe.throw('CEO dashboard access required.')
frappe.get_list('Sales Invoice', fields=['name'], limit_page_length=1)
today = frappe.utils.today()
company = frappe.form_dict.get('company') or ''
measure = frappe.form_dict.get('measure') or 'outstanding'
if measure not in ['outstanding', 'overdue', 'credits']:
    frappe.throw('Invalid balance measure.')
level = frappe.form_dict.get('level') or ('division' if company else 'company')
field_map = {'company': 'company', 'division': 'custom_division', 'location': 'location', 'salesperson': 'sales_person', 'customer': 'customer'}
if level not in ['company', 'division', 'location', 'salesperson', 'customer', 'records']:
    frappe.throw('Invalid drill-down level.')
companies = frappe.get_list('Company', fields=['name','default_currency'], limit_page_length=501)
if len(companies) >= 501:
    frappe.throw('Company scope too large.')
currencies = {}
for c in companies:
    currencies[c.name] = c.default_currency
if company and company not in currencies:
    frappe.throw('Company is not accessible.')
filters = [['Sales Invoice','docstatus','=',1],['Sales Invoice','posting_date','<=',today],['Sales Invoice','outstanding_amount','!=',0]]
if company:
    filters.append(['Sales Invoice','company','=',company])
for arg in ['division','location','salesperson','customer']:
    value = frappe.form_dict.get(arg) or ''
    if value:
        if value == '~unassigned~':
            filters.append(['Sales Invoice',field_map[arg],'is','not set'])
        else:
            filters.append(['Sales Invoice',field_map[arg],'=',value])
rows = frappe.get_list('Sales Invoice', fields=['name','posting_date','due_date','company','currency','customer','customer_name','custom_division','location','sales_person','outstanding_amount'], filters=filters, order_by='due_date asc, name asc', limit_page_length=20001)
if len(rows) >= 20001:
    frappe.throw('Balance scope exceeds 20,000 invoices. Select a company. No partial totals shown.')
summary = {'outstanding_amount':0,'outstanding_count':0,'overdue_amount':0,'overdue_count':0,'credits_amount':0,'credits_count':0,'missing_due_count':0,'missing_due_amount':0}
buckets = {}
for key,label in [['not_due','Not due'],['days_1_30','1–30 days overdue'],['days_31_60','31–60 days overdue'],['days_61_90','61–90 days overdue'],['days_91_120','91–120 days overdue'],['days_120_plus','Over 120 days overdue'],['unknown','Missing due date']]:
    buckets[key] = {'key':key,'label':label,'amount':0,'count':0}
selected = []
used = {}
for row in rows:
    curr = currencies.get(row.company)
    if not curr or row.currency != curr:
        frappe.throw('Invoice and company currencies differ or are missing. Select a supported currency scope before summing balances.')
    used[curr] = True
    amount = frappe.utils.flt(row.outstanding_amount)
    due_days = None
    if row.due_date:
        due_days = frappe.utils.date_diff(today,row.due_date)
    if amount > 0:
        summary['outstanding_amount'] = summary['outstanding_amount'] + amount
        summary['outstanding_count'] = summary['outstanding_count'] + 1
        bucket = 'not_due'
        if due_days is None:
            bucket = 'unknown'
            summary['missing_due_count'] = summary['missing_due_count'] + 1
            summary['missing_due_amount'] = summary['missing_due_amount'] + amount
        elif due_days > 0:
            summary['overdue_amount'] = summary['overdue_amount'] + amount
            summary['overdue_count'] = summary['overdue_count'] + 1
            bucket = 'days_120_plus'
            if due_days <= 30:
                bucket = 'days_1_30'
            elif due_days <= 60:
                bucket = 'days_31_60'
            elif due_days <= 90:
                bucket = 'days_61_90'
            elif due_days <= 120:
                bucket = 'days_91_120'
        buckets[bucket]['amount'] = buckets[bucket]['amount'] + amount
        buckets[bucket]['count'] = buckets[bucket]['count'] + 1
    elif amount < 0:
        summary['credits_amount'] = summary['credits_amount'] + amount
        summary['credits_count'] = summary['credits_count'] + 1
    include = (measure == 'outstanding' and amount > 0) or (measure == 'overdue' and amount > 0 and due_days is not None and due_days > 0) or (measure == 'credits' and amount < 0)
    if include:
        selected.append({'name':row.name,'date':str(row.posting_date),'due_date':str(row.due_date) if row.due_date else '', 'company':row.company,'division':row.custom_division,'location':row.location,'salesperson':row.sales_person,'customer':row.customer,'customer_name':row.customer_name,'amount':amount,'days_overdue':max(0,due_days) if due_days is not None else None})
if len(used) > 1:
    frappe.throw('Companies use different currencies. Select one company.')
currency = currencies.get(company) if company else None
for key in used:
    currency = key
grouped = {}
total = 0
for row in selected:
    total = total + row['amount']
    if level != 'records':
        value = row.get(level) or '~unassigned~'
        if value not in grouped:
            grouped[value] = {'key':value,'label':value if value != '~unassigned~' else 'Unassigned','amount':0,'count':0}
        grouped[value]['amount'] = grouped[value]['amount'] + row['amount']
        grouped[value]['count'] = grouped[value]['count'] + 1
page = max(0,frappe.utils.cint(frappe.form_dict.get('record_page') or 0))
records = []
if level == 'records':
    records = selected[page * 50:(page + 1) * 50]
frappe.response['message'] = {'as_of':today,'currency':currency,'measure':measure,'level':level,'summary':summary,'selected':{'count':len(selected),'amount':total},'groups':list(grouped.values()),'ageing':list(buckets.values()),'records':records,'record_page':page,'record_page_size':50,'basis':'Current submitted invoice balances, posting date through today. Invoice-only, not the full customer ledger. Overdue means due date before today; missing due dates are separate. Negative balances are not netted against positive balances.','permission_scope':'Records accessible to the requesting user'}


if frappe.utils.cint(frappe.form_dict.get('reconcile') or 0):
    frappe.response['message']['reconciliation_records'] = [{'name': r.name, 'amount': frappe.utils.flt(r.outstanding_amount)} for r in rows]
