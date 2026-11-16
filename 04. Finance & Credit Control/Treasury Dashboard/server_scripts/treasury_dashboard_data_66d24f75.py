# =====================================================================
# SERVER SCRIPT
#   Script Type : API
#   API Method  : treasury_dashboard_data
#   Allow Guest : OFF
# Runs inside the Frappe Server Script sandbox (no imports).
# =====================================================================

role_rows = frappe.db.sql("""
    select role from `tabHas Role` where parenttype = 'User' and parent = %(u)s
""", {"u": frappe.session.user}, as_dict=True)
user_roles = [x.role for x in role_rows]
if frappe.session.user != "Administrator" and not any(
        r in user_roles for r in ["Accounts Manager", "Treasury Manager", "System Manager"]):
    frappe.throw("Not permitted")

U = frappe.utils
fd = frappe.form_dict
today = U.getdate(U.nowdate())

# ---------- settings / filters ----------
buffer_amt = U.flt(frappe.db.get_single_value("Treasury Dashboard", "min_cash_buffer"))
excl_raw = frappe.db.get_single_value("Treasury Dashboard", "excluded_companies") or ""
excluded = [x.strip() for x in excl_raw.split(",") if x.strip()]
all_companies = [c for c in frappe.get_all("Company", pluck="name") if c not in excluded]
if not all_companies:
    frappe.throw("No companies available for the treasury dashboard")

sel = fd.get("company") or ""
companies = [sel] if sel in all_companies else all_companies
cparam = tuple(companies)
cur = frappe.db.get_value("Company", companies[0], "default_currency") or "SAR"

lookback = min(int(fd.get("lookback") or 30), 90)
horizon = min(int(fd.get("horizon") or 30), 91)
incl_od_rec = int(fd.get("include_overdue_receipts") or 0)
hend = U.add_days(today, 90)  # 13 weeks

# ---------- 1. bank + cash accounts ----------
rows = frappe.db.sql("""
    select a.name, a.company, a.account_type, a.account_currency,
           0 as restricted,
           ba.bank, ba.bank_account_no, ba.iban
    from `tabAccount` a
    left join `tabBank Account` ba on ba.account = a.name and ba.is_company_account = 1
    where a.is_group = 0 and a.disabled = 0
      and a.account_type in ('Bank', 'Cash')
      and a.company in %(c)s
""", {"c": cparam}, as_dict=True)

acc_names = [r.name for r in rows] or ["__none__"]
bals = frappe.db.sql("""
    select account, sum(debit - credit) as bal,
           sum(debit_in_account_currency - credit_in_account_currency) as bal_ac,
           max(posting_date) as last_txn
    from `tabGL Entry`
    where is_cancelled = 0 and posting_date <= %(today)s and account in %(a)s
    group by account
""", {"today": today, "a": tuple(acc_names)}, as_dict=True)
balmap = {}
for b in bals:
    balmap[b.account] = b

accounts = []
total_bal = 0
total_restricted = 0
for r in rows:
    b = balmap.get(r.name)
    bal = U.flt(b.bal) if b else 0
    bal_ac = U.flt(b.bal_ac) if b else 0
    rs = min(U.flt(r.restricted), max(bal, 0))
    total_bal = total_bal + (bal)
    total_restricted = total_restricted + (rs)
    accounts.append({
        "account": r.name, "company": r.company, "type": r.account_type,
        "bank": r.bank or "", "acc_no": r.bank_account_no or r.iban or "",
        "currency": r.account_currency, "balance_ac": U.flt(bal_ac, 2),
        "balance": U.flt(bal, 2), "restricted": U.flt(rs, 2),
        "available": U.flt(bal - rs, 2),
        "last_txn": U.cstr(b.last_txn) if b and b.last_txn else "",
    })
accounts.sort(key=lambda x: -x["balance"])
available = total_bal - total_restricted

# ---------- 2. actual daily receipts / payments ----------
frm_date = U.add_days(today, -(lookback - 1))
act = frappe.db.sql("""
    select gl.posting_date, sum(gl.debit) as receipts, sum(gl.credit) as payments
    from `tabGL Entry` gl
    where gl.is_cancelled = 0 and gl.account in %(a)s
      and gl.posting_date between %(f)s and %(t)s
      and not (gl.voucher_type = 'Payment Entry' and exists (
            select 1 from `tabPayment Entry` pe
            where pe.name = gl.voucher_no and pe.payment_type = 'Internal Transfer'))
    group by gl.posting_date
""", {"a": tuple(acc_names), "f": frm_date, "t": today}, as_dict=True)
actmap = {}
for a in act:
    actmap[U.cstr(a.posting_date)] = a

actual_daily = []
running = total_bal
for i in range(lookback):
    d = U.add_days(today, -i)
    a = actmap.get(U.cstr(d))
    rc = U.flt(a.receipts) if a else 0
    pm = U.flt(a.payments) if a else 0
    actual_daily.append({"date": U.cstr(d), "receipts": U.flt(rc, 2), "payments": U.flt(pm, 2),
                         "net": U.flt(rc - pm, 2), "closing": U.flt(running, 2)})
    running = running - rc + pm
actual_daily.reverse()

# ---------- 3. planned events ----------
events = []

def add_event(d, kind, cat, amt, label, dt="", dn="", company="", party="", est=0):
    d = U.getdate(d)
    amt = U.flt(amt)
    if amt <= 0:
        return
    overdue = 1 if d < today else 0
    if kind == "receipt" and overdue and not incl_od_rec:
        return
    eff = today if overdue else d
    if U.date_diff(eff, today) > 90:
        return
    events.append({"date": U.cstr(d), "eff": eff, "kind": kind, "cat": cat, "amount": amt,
                   "label": label, "dt": dt, "dn": dn, "company": company, "party": party,
                   "overdue": overdue, "est": est})

# 3a. expected receipts (Sales Invoice due dates)
# outstanding_amount is stored in the party account currency, so it is only
# converted when that currency differs from the company currency.
si = frappe.db.sql("""
    select name, company, customer, customer_name, due_date,
           outstanding_amount * if(party_account_currency = (select c.default_currency from `tabCompany` c where c.name = `tabSales Invoice`.company), 1, conversion_rate) as amt
    from `tabSales Invoice`
    where docstatus = 1 and outstanding_amount > 0 and company in %(c)s and due_date <= %(e)s
""", {"c": cparam, "e": hend}, as_dict=True)
for r in si:
    add_event(r.due_date, "receipt", "Receipts", r.amt, r.customer_name or r.customer,
              "Sales Invoice", r.name, r.company, r.customer)

# 3b. AP due dates (Purchase Invoice)
pi = frappe.db.sql("""
    select name, company, supplier, supplier_name, bill_no, due_date, on_hold,
           outstanding_amount * if(party_account_currency = (select c.default_currency from `tabCompany` c where c.name = `tabPurchase Invoice`.company), 1, conversion_rate) as amt
    from `tabPurchase Invoice`
    where docstatus = 1 and outstanding_amount > 0 and company in %(c)s and due_date <= %(e)s
    order by due_date
""", {"c": cparam, "e": hend}, as_dict=True)
ap_list = []
aging = {"overdue": 0, "d0_7": 0, "d8_14": 0, "d15_30": 0, "d31_60": 0, "d61_90": 0}
held_total = 0
for r in pi:
    dd = U.getdate(r.due_date)
    days = U.date_diff(dd, today)
    amt = U.flt(r.amt)
    if r.on_hold:
        held_total = held_total + (amt)
    else:
        add_event(dd, "payment", "AP", amt, r.supplier_name or r.supplier,
                  "Purchase Invoice", r.name, r.company, r.supplier)
        if days < 0: aging["overdue"] = aging["overdue"] + amt
        elif days <= 7: aging["d0_7"] = aging["d0_7"] + amt
        elif days <= 14: aging["d8_14"] = aging["d8_14"] + amt
        elif days <= 30: aging["d15_30"] = aging["d15_30"] + amt
        elif days <= 60: aging["d31_60"] = aging["d31_60"] + amt
        else: aging["d61_90"] = aging["d61_90"] + amt
    ap_list.append({"name": r.name, "company": r.company, "supplier": r.supplier_name or r.supplier,
                    "bill_no": r.bill_no or "", "due_date": U.cstr(dd), "days": days,
                    "amount": U.flt(amt, 2), "on_hold": 1 if r.on_hold else 0})

open_ap_total = U.flt(frappe.db.sql("""
    select ifnull(sum(outstanding_amount * if(party_account_currency = (select c.default_currency from `tabCompany` c where c.name = `tabPurchase Invoice`.company), 1, conversion_rate)), 0)
    from `tabPurchase Invoice`
    where docstatus = 1 and outstanding_amount > 0 and company in %(c)s
""", {"c": cparam})[0][0])
aging["later"] = max(open_ap_total - held_total - sum(aging.values()), 0)

# 3c. month-end payroll (Salary Slip, 26th-25th period -> paid on last day of the month)
payroll_rows = []
try:
    slips = frappe.db.sql("""
        select company, end_date, sum(base_net_pay) as amt
        from `tabSalary Slip`
        where docstatus in (0, 1) and company in %(c)s and end_date >= %(f)s
        group by company, end_date
    """, {"c": cparam, "f": U.add_months(today, -2)}, as_dict=True)
    pay = {}
    latest = {}
    for s in slips:
        pd = U.get_last_day(s.end_date)
        key = s.company + "|" + U.cstr(pd)
        pay[key] = pay.get(key, 0) + U.flt(s.amt)
        if s.company not in latest or pd > latest[s.company][0]:
            latest[s.company] = (pd, U.flt(s.amt))
    # estimate months with no slips yet from the latest known payroll
    for comp in companies:
        if comp not in latest:
            continue
        pd = U.get_last_day(today)
        for m in range(0, 4):
            key = comp + "|" + U.cstr(pd)
            if key not in pay and pd >= today and pd <= hend:
                pay[key] = latest[comp][1]
                payroll_rows.append({"company": comp, "date": U.cstr(pd), "amount": latest[comp][1], "est": 1})
            pd = U.get_last_day(U.add_months(pd, 1))
    for key in pay:
        comp, ds = key.split("|")
        pd = U.getdate(ds)
        if pd < today:
            continue
        is_est = 0
        for pr in payroll_rows:
            if pr["company"] == comp and pr["date"] == ds:
                is_est = 1
        if not is_est:
            payroll_rows.append({"company": comp, "date": ds, "amount": pay[key], "est": 0})
        add_event(pd, "payment", "Payroll", pay[key], "Payroll - " + comp, "Salary Slip", "", comp, "", is_est)
except Exception:
    frappe.log_error(message="Payroll section failed", title="Treasury dashboard: payroll section skipped")

# 3d. other expenses: planned payments (rent, loans, govt fees, ...)
pp = frappe.db.sql("""
    select name, company, category, description, due_date, amount, recurrence, end_date
    from `tabTreasury Planned Payment`
    where status = 'Planned' and company in %(c)s
""", {"c": cparam}, as_dict=True)
for p in pp:
    base = U.getdate(p.due_date)
    step = {"Monthly": 1, "Quarterly": 3, "Yearly": 12}.get(p.recurrence or "", 0)
    last = U.getdate(p.end_date) if p.end_date else hend
    label = (p.category or "Other") + ((" - " + p.description) if p.description else "")
    i = 0
    while i < 120:
        d = U.add_months(base, step * i) if step else base
        if d > hend or d > last:
            break
        if d >= today or not step:
            add_event(d, "payment", "Other", p.amount, label, "Treasury Planned Payment", p.name, p.company)
        if not step:
            break
        i = i + (1)

# 3e. approved, unpaid expense claims -> due now
try:
    ec = frappe.db.sql("""
        select company, sum(total_sanctioned_amount - total_amount_reimbursed - ifnull(total_advance_amount, 0)) as amt
        from `tabExpense Claim`
        where docstatus = 1 and status = 'Unpaid' and company in %(c)s
        group by company
    """, {"c": cparam}, as_dict=True)
    for e in ec:
        add_event(today, "payment", "Other", e.amt, "Expense claims (approved, unpaid)", "Expense Claim", "", e.company)
except Exception:
    pass

# ---------- 4. bucket into days / weeks ----------
planned_map = {}
weeks = []
for w in range(13):
    ws = U.add_days(today, w * 7)
    weeks.append({"week": w + 1, "from": U.cstr(ws), "to": U.cstr(U.add_days(ws, 6)),
                  "receipts": 0, "ap": 0, "payroll": 0, "other": 0})

def money(v):
    n = int(round(U.flt(v)))
    digits = str(abs(n))
    out = ""
    while len(digits) > 3:
        out = "," + digits[-3:] + out
        digits = digits[:-3]
    out = digits + out
    if n < 0:
        out = "-" + out
    return cur + " " + out

def key_of(cat):
    return {"Receipts": "receipts", "AP": "ap", "Payroll": "payroll", "Other": "other"}[cat]

for e in events:
    idx = U.date_diff(e["eff"], today)
    k = key_of(e["cat"])
    ds = U.cstr(e["eff"])
    if ds not in planned_map:
        planned_map[ds] = {"receipts": 0, "ap": 0, "payroll": 0, "other": 0}
    planned_map[ds][k] = planned_map[ds][k] + (e["amount"])
    weeks[idx // 7][k] = weeks[idx // 7][k] + (e["amount"])

planned_daily = []
cum = available
for i in range(horizon):
    ds = U.cstr(U.add_days(today, i))
    m = planned_map.get(ds, {"receipts": 0, "ap": 0, "payroll": 0, "other": 0})
    out = m["ap"] + m["payroll"] + m["other"]
    cum = cum + m["receipts"] - out
    planned_daily.append({"date": ds, "receipts": U.flt(m["receipts"], 2), "ap": U.flt(m["ap"], 2),
                          "payroll": U.flt(m["payroll"], 2), "other": U.flt(m["other"], 2),
                          "payments": U.flt(out, 2), "closing": U.flt(cum, 2)})

opening = available
for w in weeks:
    w["opening"] = U.flt(opening, 2)
    w["net"] = U.flt(w["receipts"] - w["ap"] - w["payroll"] - w["other"], 2)
    opening = opening + w["net"]
    w["closing"] = U.flt(opening, 2)
    w["below_buffer"] = 1 if opening < buffer_amt else 0
    for k in ["receipts", "ap", "payroll", "other"]:
        w[k] = U.flt(w[k], 2)

# ---------- 5. summary + alerts ----------
def sum_events(kind, days, cats=None):
    t = 0
    for e in events:
        if e["kind"] == kind and U.date_diff(e["eff"], today) < days and (cats is None or e["cat"] in cats):
            t = t + (e["amount"])
    return t

next_payroll = None
for pr in sorted(payroll_rows, key=lambda x: x["date"]):
    next_payroll = pr
    break
payroll_same_date = 0
if next_payroll:
    for pr in payroll_rows:
        if pr["date"] == next_payroll["date"]:
            payroll_same_date = payroll_same_date + (pr["amount"])

alerts = []
for w in weeks:
    if w["below_buffer"]:
        alerts.append({"level": "danger", "key": "buf" + str(w["week"]),
                       "title": "Projected cash below minimum buffer",
                       "text": "Week %s (%s - %s): projected closing %s vs buffer %s." % (
                           w["week"], w["from"], w["to"], money(w["closing"]), money(buffer_amt))})
        break
if next_payroll and U.date_diff(U.getdate(next_payroll["date"]), today) <= 14:
    alerts.append({"level": "warn", "key": "pay" + next_payroll["date"],
                   "title": "Month-end funding review",
                   "text": "Payroll of %s%s is due on %s. Confirm payroll funding and supplier payment dates before the next cash forecast run." % (
                       money(payroll_same_date), " (estimated)" if next_payroll["est"] else "", next_payroll["date"])})
if aging["overdue"] > 0:
    alerts.append({"level": "warn", "key": "od" + U.cstr(today),
                   "title": "Overdue supplier payments",
                   "text": "%s of AP is past due date." % money(aging["overdue"])})

result = {
    "currency": cur, "as_of": U.cstr(today), "companies": all_companies, "selected": sel if sel in all_companies else "",
    "excluded": excluded,
    "summary": {
        "total_balance": U.flt(total_bal, 2), "restricted": U.flt(total_restricted, 2),
        "available": U.flt(available, 2), "buffer": U.flt(buffer_amt, 2),
        "receipts_7d": U.flt(sum_events("receipt", 7), 2),
        "payments_7d": U.flt(sum_events("payment", 7), 2),
        "open_ap": U.flt(open_ap_total, 2), "ap_held": U.flt(held_total, 2),
        "payroll_amount": U.flt(payroll_same_date, 2),
        "payroll_date": next_payroll["date"] if next_payroll else "",
        "payroll_est": next_payroll["est"] if next_payroll else 0,
    },
    "accounts": accounts,
    "actual_daily": actual_daily,
    "planned_daily": planned_daily,
    "weeks": weeks,
    "ap_aging": {k: U.flt(v, 2) for k, v in aging.items()},
    "ap_list": ap_list[:500],
    "scheduled": sorted([{"date": e["date"], "overdue": e["overdue"], "cat": e["cat"], "label": e["label"],
                          "amount": U.flt(e["amount"], 2), "company": e["company"], "dt": e["dt"], "dn": e["dn"],
                          "est": e["est"]} for e in events if e["cat"] in ("Payroll", "Other")],
                        key=lambda x: x["date"]),
    "alerts": alerts,
}
frappe.response["message"] = result