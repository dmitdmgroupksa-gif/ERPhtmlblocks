# Server Script · type API · method: ceo_management_insights        (CEO Command Centre v2 · "Management Insights" tab)
# Replaces the number-card workspaces "Management Insights" and "Payments & Collections". Read-only.
# Access: CFG["roles"] only (CEO, Finance Manager) (company-wide money: sales, collections, payments, cash & bank, inventory value).
#
# Figures are anchored on the as-of date (to_date, default today): its month, the previous month, year to date, and the
# same year-to-date window last year. Company filter optional (all companies otherwise; every company is SAR).
#   Sales      : submitted Sales Invoices, base_net_total (before VAT), returns net.
#   Locations  : Sales Team share x base_net_total, grouped by Sales Person > location; monthly target = sum of
#                Sales Person > custom__sales_monthly_target of the location's salespeople (same source as the old
#                "DM Sales <location> Report - Monthly" reports); YTD target = monthly target x months elapsed.
#                Salespeople in CFG["exclude_from_locations"] are left out of the location table only (the old reports'
#                exclusion list); company totals always include everyone.
#   Company YTD target: CFG["ytd_target"] (the old "YTD report" used a fixed 250,000,000).
#   Orders     : Sales Orders created in the as-of month: new, fully invoiced, still pending billing, closed.
#   Collected  : submitted Payment Entries, payment_type Receive, base_received_amount (VAT included; the old card divided by 1.15).
#   Paid out   : submitted Payment Entries, payment_type Pay, base_paid_amount, by party type.
#   Petty cash : credits this month on Cash-type accounts (Journal Entries and Payment Entries), CFG["petty_exclude"] excluded.
#   Cash & bank: GL balance of every Bank / Cash account (account_type), opening = before the as-of date.
#   Receivables: submitted Sales Invoices with outstanding_amount > 0 today; overdue = due date passed.
#   Inventory  : stock value now (Bin.stock_value), purchases in the month (submitted Purchase Invoices, base_net_total),
#                delivered but not billed (Delivery Notes "To Bill", base_net_total).

CFG = {
    "roles": ["CEO", "Finance Manager"],
    "ytd_target": 250000000,
    "exclude_from_locations": ["Abdullakutty Shahnavas", "Afroze Nakwa", "Ashfak Nakwa", "All", "Basith Shaikh", "Mohsin Ismail",
                               "Arslan Abdul Shakoor", "Murad Ali", "Umar Sherrif", "Mohammed Ashfaq Shekabba", "Shakeel Ahmed Syed",
                               "Hossam Abud", "Mohammed Rahil", "Rihal Mohammed", "Said Al-Shama", "zia", "Muzammil Iqbal",
                               "accounts@dmgroupksa.com", "Ahmed Mohsen Shehata", "Samiulla Nakwa", "Mohammed Rafique",
                               "Mujahidul Islam", "Ramiz Arnoos", "Safan Siraj", "Shaikh Safwan", "Bahauddin", "Nurul Kabir"],
    "petty_exclude": ["10002 - Petty Cash Clearing - Ashfaq Nakwa - DMG", "10003 - Petty Cash Clearing - Yaseen - DMG",
                      "10017 - Petty Cash Clearing - Afzal - DMG"],
}

U = frappe.utils
user = frappe.session.user
roles = [r.role for r in frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, fields=["role"])]
if user == "Guest" or len([r for r in roles if r in CFG["roles"]]) == 0:
    frappe.throw("Management Insights are restricted to the CEO and the Finance Manager.", title="Not Permitted")
fd = frappe.form_dict
today = U.getdate(U.nowdate())
try:
    asof = U.getdate(fd.get("to_date")) if fd.get("to_date") else today
except Exception:
    frappe.throw("Invalid date.")
if asof > today:
    asof = today
company = fd.get("company") or ""
companies = [c.name for c in frappe.get_all("Company", fields=["name"], order_by="name asc")]
if company and company not in companies:
    frappe.throw("Company is not accessible.")

m_from = U.get_first_day(asof)
pm_from = U.get_first_day(U.add_months(asof, -1))
pm_to = U.add_days(m_from, -1)
y_from = U.getdate(str(asof.year) + "-01-01")
ly_from = U.getdate(str(asof.year - 1) + "-01-01")
ly_to = U.add_months(asof, -12)
V = {"mf": str(m_from), "pmf": str(pm_from), "pmt": str(pm_to), "yf": str(y_from), "lyf": str(ly_from), "lyt": str(ly_to),
     "asof": str(asof), "co": company, "today": str(today), "cf": str(min(pm_from, y_from))}
CO = lambda a: (" and " + a + ".company = %(co)s") if company else ""


def one(q):
    r = frappe.db.sql(q, V, as_dict=True)
    return r[0] if r else {}


def f(v):
    return U.flt(v)


# ---------------- sales
s = one("""select
    sum(case when si.posting_date between %(mf)s and %(asof)s then si.base_net_total else 0 end) as month,
    sum(case when si.posting_date between %(pmf)s and %(pmt)s then si.base_net_total else 0 end) as prev_month,
    sum(case when si.posting_date between %(yf)s and %(asof)s then si.base_net_total else 0 end) as ytd,
    sum(case when si.posting_date between %(lyf)s and %(lyt)s then si.base_net_total else 0 end) as ly_ytd
    from `tabSales Invoice` si where si.docstatus = 1 and si.posting_date between %(lyf)s and %(asof)s""" + CO("si"))
mon = frappe.db.sql("""select date_format(si.posting_date, '%%Y-%%m') as m, sum(si.base_net_total) as v
    from `tabSales Invoice` si where si.docstatus = 1 and si.posting_date between %(lyf)s and %(asof)s""" + CO("si")
    + " group by date_format(si.posting_date, '%%Y-%%m')", V, as_dict=True)
MON = {}
for r in mon:
    MON[r.m] = f(r.v)
months = []
i = 1
while i <= 12:
    mk = str(asof.year) + "-" + ("0" + str(i))[-2:]
    lk = str(asof.year - 1) + "-" + ("0" + str(i))[-2:]
    months.append({"month": i, "current": MON.get(mk) if mk <= str(asof)[:7] else None, "previous": MON.get(lk, 0.0)})
    i = i + 1
elapsed = asof.month
sales = {"month": f(s.get("month")), "prev_month": f(s.get("prev_month")), "ytd": f(s.get("ytd")), "ly_ytd": f(s.get("ly_ytd")),
         "ytd_target": CFG["ytd_target"], "ytd_target_to_date": CFG["ytd_target"] * elapsed / 12.0, "months": months}

# ---------------- locations vs target
sp = frappe.get_all("Sales Person", filters={"is_group": 0}, fields=["name", "location", "custom__sales_monthly_target"], limit_page_length=0)
EX = CFG["exclude_from_locations"]
LOC = {}
SPL = {}
for p in sp:
    if p.name in EX:
        continue
    loc = p.location or "Not set"
    SPL[p.name] = loc
    x = LOC.get(loc) or {"location": loc, "target": 0.0, "month": 0.0, "prev_month": 0.0, "ytd": 0.0, "salespeople": 0}
    x["target"] = x["target"] + f(p.custom__sales_monthly_target)
    x["salespeople"] = x["salespeople"] + 1
    LOC[loc] = x
lrows = frappe.db.sql("""select st.sales_person as sp,
    sum(case when si.posting_date between %(mf)s and %(asof)s then si.base_net_total * st.allocated_percentage / 100 else 0 end) as month,
    sum(case when si.posting_date between %(pmf)s and %(pmt)s then si.base_net_total * st.allocated_percentage / 100 else 0 end) as prev_month,
    sum(si.base_net_total * st.allocated_percentage / 100) as ytd
    from `tabSales Invoice` si join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice'
    where si.docstatus = 1 and si.posting_date between %(yf)s and %(asof)s""" + CO("si") + " group by st.sales_person", V, as_dict=True)
for r in lrows:
    loc = SPL.get(r.sp)
    if not loc:
        continue
    x = LOC[loc]
    x["month"] = x["month"] + f(r.month)
    x["prev_month"] = x["prev_month"] + f(r.prev_month)
    x["ytd"] = x["ytd"] + f(r.ytd)
locations = []
for k in LOC:
    x = LOC[k]
    if not (x["target"] or x["month"] or x["ytd"]):
        continue
    x["ytd_target"] = x["target"] * elapsed
    x["pct_month"] = (100.0 * x["month"] / x["target"]) if x["target"] else None
    x["pct_ytd"] = (100.0 * x["ytd"] / x["ytd_target"]) if x["target"] else None
    locations.append(x)
locations = sorted(locations, key=lambda x: -x["ytd"])

# ---------------- sales orders (created in the as-of month)
o = one("""select count(*) as new, sum(case when so.per_billed >= 100 then 1 else 0 end) as invoiced,
    sum(case when so.per_billed < 100 and so.status not in ('Closed', 'Completed') then 1 else 0 end) as pending,
    sum(case when so.status = 'Closed' then 1 else 0 end) as closed, sum(so.base_net_total) as value
    from `tabSales Order` so where so.docstatus = 1 and so.transaction_date between %(mf)s and %(asof)s""" + CO("so"))
orders = {"new": int(o.get("new") or 0), "invoiced": int(o.get("invoiced") or 0), "pending": int(o.get("pending") or 0),
          "closed": int(o.get("closed") or 0), "value": f(o.get("value"))}

# ---------------- collections and payments
c = one("""select
    sum(case when pe.payment_type = 'Receive' and pe.posting_date between %(mf)s and %(asof)s then pe.base_received_amount else 0 end) as month,
    sum(case when pe.payment_type = 'Receive' and pe.posting_date between %(pmf)s and %(pmt)s then pe.base_received_amount else 0 end) as prev_month,
    sum(case when pe.payment_type = 'Receive' and pe.posting_date between %(yf)s and %(asof)s then pe.base_received_amount else 0 end) as ytd
    from `tabPayment Entry` pe where pe.docstatus = 1 and pe.posting_date between %(cf)s and %(asof)s""" + CO("pe"))
collections = {"month": f(c.get("month")), "prev_month": f(c.get("prev_month")), "ytd": f(c.get("ytd"))}
pays = frappe.db.sql("""select ifnull(pe.party_type, 'Other') as pt, sum(pe.base_paid_amount) as v, count(*) as n
    from `tabPayment Entry` pe where pe.docstatus = 1 and pe.payment_type = 'Pay' and pe.posting_date between %(mf)s and %(asof)s""" + CO("pe")
    + " group by ifnull(pe.party_type, 'Other')", V, as_dict=True)
petty_ex = tuple(CFG["petty_exclude"] or ["-"])
V["px"] = petty_ex
petty = one("""select sum(gl.credit) as v from `tabGL Entry` gl join `tabAccount` a on a.name = gl.account
    where a.account_type = 'Cash' and gl.is_cancelled = 0 and gl.docstatus = 1 and gl.posting_date between %(mf)s and %(asof)s
      and gl.account not in %(px)s""" + CO("gl"))
payments = {"total": sum([f(r.v) for r in pays]), "by_party": [{"party_type": r.pt, "value": f(r.v), "count": r.n} for r in pays],
            "petty_cash": f(petty.get("v"))}

# ---------------- cash & bank
cb = frappe.db.sql("""select a.name as account, a.account_name, a.account_type, a.company,
    sum(case when gl.posting_date < %(asof)s then gl.debit - gl.credit else 0 end) as opening,
    sum(case when gl.posting_date = %(asof)s then gl.debit else 0 end) as debit,
    sum(case when gl.posting_date = %(asof)s then gl.credit else 0 end) as credit
    from `tabAccount` a join `tabGL Entry` gl on gl.account = a.name and gl.is_cancelled = 0 and gl.docstatus = 1 and gl.posting_date <= %(asof)s
    where a.account_type in ('Bank', 'Cash') and a.is_group = 0""" + CO("a") + " group by a.name, a.account_name, a.account_type, a.company", V, as_dict=True)
accounts = []
for r in cb:
    close = f(r.opening) + f(r.debit) - f(r.credit)
    if abs(close) < 0.005 and not f(r.debit) and not f(r.credit):
        continue
    accounts.append({"account": r.account, "name": r.account_name, "type": r.account_type, "company": r.company, "opening": f(r.opening),
                     "in": f(r.debit), "out": f(r.credit), "closing": close})
accounts = sorted(accounts, key=lambda x: -x["closing"])
cash_bank = {"opening": sum([x["opening"] for x in accounts]), "in": sum([x["in"] for x in accounts]), "out": sum([x["out"] for x in accounts]),
             "closing": sum([x["closing"] for x in accounts]), "bank": sum([x["closing"] for x in accounts if x["type"] == "Bank"]),
             "cash": sum([x["closing"] for x in accounts if x["type"] == "Cash"]), "accounts": accounts}

# ---------------- receivables (today)
ar = one("""select sum(si.outstanding_amount) as total, sum(case when si.due_date < %(today)s then si.outstanding_amount else 0 end) as overdue,
    count(*) as n from `tabSales Invoice` si where si.docstatus = 1 and si.outstanding_amount > 0""" + CO("si"))
receivables = {"outstanding": f(ar.get("total")), "overdue": f(ar.get("overdue")), "invoices": int(ar.get("n") or 0)}

# ---------------- inventory
stock = one("select sum(b.stock_value) as v from `tabBin` b" + (" join `tabWarehouse` w on w.name = b.warehouse where w.company = %(co)s" if company else ""))
pur = one("""select sum(pi.base_net_total) as v from `tabPurchase Invoice` pi where pi.docstatus = 1 and pi.posting_date between %(mf)s and %(asof)s""" + CO("pi"))
dnb = one("""select sum(dn.base_net_total) as v, count(*) as n from `tabDelivery Note` dn where dn.docstatus = 1 and dn.status = 'To Bill'""" + CO("dn"))
inventory = {"stock_value": f(stock.get("v")), "purchased_month": f(pur.get("v")), "to_bill": f(dnb.get("v")), "to_bill_n": int(dnb.get("n") or 0)}

frappe.response["message"] = {
    "meta": {"asof": str(asof), "month_from": str(m_from), "prev_month": [str(pm_from), str(pm_to)], "ytd_from": str(y_from),
             "ly_window": [str(ly_from), str(ly_to)], "company": company, "currency": "SAR", "months_elapsed": elapsed},
    "sales": sales, "locations": locations, "orders": orders, "collections": collections, "payments": payments,
    "cash_bank": cash_bank, "receivables": receivables, "inventory": inventory,
}
