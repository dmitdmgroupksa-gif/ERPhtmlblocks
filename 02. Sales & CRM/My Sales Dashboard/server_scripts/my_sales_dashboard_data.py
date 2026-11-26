# Server Script · type API · method: my_sales_dashboard_data            (My Sales Dashboard, replaces "Sales Person Dashboard")
#
# Who sees what (decided on the server from the logged-in user; nothing the page sends can widen it):
#   own  : a salesperson sees only the Sales Person(s) linked to them (Sales Person > Employee > User ID).
#   team : a user with a MANAGER_ROLES role sees the salespeople whose Employee is in their own department(s), plus any
#          departments granted in CFG["extra_departments"].
#   all  : a user with an ALL_ROLES role (or listed in CFG["full_access_users"]) sees every salesperson.
#   A user with none of these gets "not linked" and no data.
#   The optional sales_person argument can only narrow the scope, never widen it.
#
# Attribution and values (same rule as the CEO Command Centre sales tabs):
#   Sales Order / Sales Invoice: standard Sales Team rows x allocated_percentage, base_net_total (company currency, before VAT).
#   Quotation: Quotation.sales_person (custom link), base_net_total.
#   Invoiced = submitted Sales Invoices by posting date, returns net. Booked = submitted Sales Orders by transaction date.
#   Outstanding / overdue = submitted invoices with outstanding_amount > 0 today (overdue: due_date before today), x share.
#   Collected = submitted Payment Entries posted in the period, allocated to the salesperson's invoices, x share
#   (invoices settled by Journal Entry are not counted).
#   Open orders = submitted, not Closed / Completed, less than 100% delivered (snapshot, not period).
# Read-only. No document numbers outside the scope are ever returned.

CFG = {
    "all_roles": ["CEO", "Executive Manager", "Sales Master Manager", "Finance Manager"],
    "manager_roles": ["Sales Manager", "Section Manager"],
    "full_access_users": [],
    "extra_departments": {},      # {"user@dmgroupksa.com": ["BMD - BUILDING - DMG", ...]}
    "row_limit": 500,
}

U = frappe.utils
user = frappe.session.user
if user == "Guest":
    frappe.throw("Not permitted.", title="Not Permitted")
fd = frappe.form_dict
roles = [r.role for r in frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, fields=["role"])]
today = U.getdate(U.nowdate())
today_s = str(today)

# ---------------- period
try:
    p_from = U.getdate(fd.get("from_date")) if fd.get("from_date") else U.get_first_day(today)
    p_to = U.getdate(fd.get("to_date")) if fd.get("to_date") else today
except Exception:
    frappe.throw("Invalid date.")
if p_from > p_to:
    frappe.throw("Invalid date range.")
f_s = str(p_from)
t_s = str(p_to)
trend_from = str(U.get_first_day(U.add_months(p_to, -11)))
q_from = min(f_s, trend_from)

company = fd.get("company") or ""
companies = [c.name for c in frappe.get_all("Company", fields=["name"], order_by="name asc")]
if company and company not in companies:
    frappe.throw("Company not found.")

# ---------------- scope
sp_all = frappe.get_all("Sales Person", filters={"is_group": 0}, fields=["name", "employee", "enabled"], order_by="name asc", limit_page_length=0)
emp_ids = [s.employee for s in sp_all if s.employee]
emp_rows = frappe.get_all("Employee", filters={"name": ["in", emp_ids or ["-"]]}, fields=["name", "employee_name", "department", "user_id"], limit_page_length=0)
EMP = {}
for e in emp_rows:
    EMP[e.name] = e
my_emps = frappe.get_all("Employee", filters={"user_id": user}, fields=["name", "employee_name", "department"], limit_page_length=0)
my_emp_ids = [e.name for e in my_emps]
own_sp = [s.name for s in sp_all if s.employee and s.employee in my_emp_ids]

is_all = user in CFG["full_access_users"] or len([r for r in roles if r in CFG["all_roles"]]) > 0
is_mgr = len([r for r in roles if r in CFG["manager_roles"]]) > 0
my_depts = [e.department for e in my_emps if e.department] + (CFG["extra_departments"].get(user) or [])

if is_all:
    scope = "all"
    allowed = [s.name for s in sp_all]
elif is_mgr and my_depts:
    scope = "team"
    allowed = [s.name for s in sp_all if s.name in own_sp or (s.employee and EMP.get(s.employee) and EMP[s.employee].department in my_depts)]
elif own_sp:
    scope = "own"
    allowed = own_sp
else:
    frappe.throw("Your user is not linked to a Sales Person. HR or IT must set Employee > User ID and Sales Person > Employee.", title="Not linked")

pick = fd.get("sales_person") or ""
if pick and pick not in allowed:
    frappe.throw("That salesperson is outside your access.", title="Not Permitted")
sp_scope = [pick] if pick else allowed
# "all" without a narrowing pick needs no salesperson condition (every document has a Sales Team / sales_person);
# a list is still used so the rule is the same everywhere.
SP = tuple(sp_scope or ["-"])
V = {"f": f_s, "t": t_s, "qf": q_from, "sp": SP, "co": company, "today": today_s}
CO_SI = " and si.company = %(co)s" if company else ""
CO_SO = " and so.company = %(co)s" if company else ""
CO_Q = " and q.company = %(co)s" if company else ""
LIM = CFG["row_limit"]


def flt(v):
    return U.flt(v)


def ds(v):
    return str(v) if v else ""


def sp_info(name):
    s = [x for x in sp_all if x.name == name]
    e = EMP.get(s[0].employee) if s and s[0].employee else None
    return {"sales_person": name, "employee_name": e.employee_name if e else "", "department": e.department if e else ""}


# ---------------- invoices (period + 12-month trend)
inv = frappe.db.sql("""select si.name, si.posting_date, si.customer, si.customer_name, si.company, si.is_return, si.status,
        si.due_date, si.base_net_total * st.allocated_percentage / 100 as val, st.sales_person as sp
    from `tabSales Invoice` si join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice'
    where si.docstatus = 1 and si.posting_date between %(qf)s and %(t)s and st.sales_person in %(sp)s""" + CO_SI
    + " order by si.posting_date desc, si.name desc", V, as_dict=True)
orders = frappe.db.sql("""select so.name, so.transaction_date, so.customer, so.customer_name, so.company, so.status, so.delivery_date,
        so.per_delivered, so.per_billed, so.base_net_total * st.allocated_percentage / 100 as val, st.sales_person as sp
    from `tabSales Order` so join `tabSales Team` st on st.parent = so.name and st.parenttype = 'Sales Order'
    where so.docstatus = 1 and so.transaction_date between %(qf)s and %(t)s and st.sales_person in %(sp)s""" + CO_SO
    + " order by so.transaction_date desc, so.name desc", V, as_dict=True)
quotes = frappe.db.sql("""select q.name, q.transaction_date, q.party_name, q.customer_name, q.company, q.status, q.workflow_state,
        q.valid_till, q.base_net_total as val, q.sales_person as sp, q.docstatus
    from `tabQuotation` q where q.docstatus < 2 and q.transaction_date between %(f)s and %(t)s and q.sales_person in %(sp)s""" + CO_Q
    + " order by q.transaction_date desc, q.name desc", V, as_dict=True)
outst = frappe.db.sql("""select si.name, si.posting_date, si.due_date, si.customer, si.customer_name, si.company, si.status,
        si.outstanding_amount * st.allocated_percentage / 100 as val, st.sales_person as sp
    from `tabSales Invoice` si join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice'
    where si.docstatus = 1 and si.outstanding_amount > 0 and st.sales_person in %(sp)s""" + CO_SI
    + " order by si.due_date asc, si.name asc", V, as_dict=True)
open_so = frappe.db.sql("""select so.name, so.transaction_date, so.customer, so.customer_name, so.company, so.status, so.delivery_date,
        so.per_delivered, so.per_billed, so.base_net_total * st.allocated_percentage / 100 as val, st.sales_person as sp
    from `tabSales Order` so join `tabSales Team` st on st.parent = so.name and st.parenttype = 'Sales Order'
    where so.docstatus = 1 and so.status not in ('Closed', 'Completed') and so.per_delivered < 100 and st.sales_person in %(sp)s""" + CO_SO
    + " order by so.delivery_date asc, so.name asc", V, as_dict=True)
coll = frappe.db.sql("""select pe.name, pe.posting_date, si.name as invoice, si.customer_name, si.company,
        per.allocated_amount * st.allocated_percentage / 100 as val, st.sales_person as sp
    from `tabPayment Entry Reference` per join `tabPayment Entry` pe on pe.name = per.parent
    join `tabSales Invoice` si on si.name = per.reference_name
    join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice'
    where per.reference_doctype = 'Sales Invoice' and pe.docstatus = 1 and pe.posting_date between %(f)s and %(t)s
      and st.sales_person in %(sp)s""" + CO_SI, V, as_dict=True)
drafts = frappe.db.sql("""select count(distinct si.name) as n from `tabSales Invoice` si
    join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice'
    where si.docstatus = 0 and st.sales_person in %(sp)s""" + CO_SI, V, as_dict=True)

inv_p = [r for r in inv if ds(r.posting_date) >= f_s]
so_p = [r for r in orders if ds(r.transaction_date) >= f_s]
WON = ["Accepted By Customer"]
WON_STATUS = ["Ordered", "Partially Ordered"]


def qwon(r):
    return r.workflow_state in WON or r.status in WON_STATUS


def qopen(r):
    return (not qwon(r)) and r.status in ["Draft", "Open"] and r.workflow_state not in ["Lost", "Rejected By Customer", "Closed", "cancelled"]


overdue = [r for r in outst if r.due_date and ds(r.due_date) < today_s]
kpi = {
    "invoiced": sum([flt(r.val) for r in inv_p]),
    "invoices": len(set([r.name for r in inv_p if not r.is_return])),
    "returns": sum([flt(r.val) for r in inv_p if r.is_return]),
    "booked": sum([flt(r.val) for r in so_p]),
    "orders": len(set([r.name for r in so_p])),
    "quotations": len(quotes),
    "quoted": sum([flt(r.val) for r in quotes]),
    "quotations_won": len([r for r in quotes if qwon(r)]),
    "quotations_open": len([r for r in quotes if qopen(r)]),
    "collected": sum([flt(r.val) for r in coll]),
    "outstanding": sum([flt(r.val) for r in outst]),
    "outstanding_invoices": len(set([r.name for r in outst])),
    "overdue": sum([flt(r.val) for r in overdue]),
    "overdue_invoices": len(set([r.name for r in overdue])),
    "open_orders": len(set([r.name for r in open_so])),
    "open_value": sum([flt(r.val) * (100 - flt(r.per_delivered)) / 100 for r in open_so]),
    "on_hold": len(set([r.name for r in open_so if r.status == "On Hold"])),
    "draft_invoices": (drafts[0].n if drafts else 0) or 0,
}

# ---------------- breakdowns
qs = {}
for r in quotes:
    k = r.workflow_state or r.status or "Draft"
    cur = qs.get(k) or {"state": k, "count": 0, "value": 0.0}
    cur["count"] = cur["count"] + 1
    cur["value"] = cur["value"] + flt(r.val)
    qs[k] = cur
quote_states = sorted(qs.values(), key=lambda x: -x["count"])

months = []
m0 = U.getdate(trend_from)
i = 0
while i < 12:
    months.append(str(U.add_months(m0, i))[:7])
    i = i + 1
trend = []
for mk in months:
    trend.append({"month": mk, "invoiced": sum([flt(r.val) for r in inv if ds(r.posting_date)[:7] == mk]),
                  "booked": sum([flt(r.val) for r in orders if ds(r.transaction_date)[:7] == mk])})

team = []
if scope != "own":
    T = {}
    for sp in sp_scope:
        T[sp] = sp_info(sp)
        for k in ["invoiced", "booked", "quoted", "collected", "outstanding", "overdue"]:
            T[sp][k] = 0.0
        T[sp]["quotations"] = 0
    for r in inv_p:
        if r.sp in T:
            T[r.sp]["invoiced"] = T[r.sp]["invoiced"] + flt(r.val)
    for r in so_p:
        if r.sp in T:
            T[r.sp]["booked"] = T[r.sp]["booked"] + flt(r.val)
    for r in quotes:
        if r.sp in T:
            T[r.sp]["quoted"] = T[r.sp]["quoted"] + flt(r.val)
            T[r.sp]["quotations"] = T[r.sp]["quotations"] + 1
    for r in coll:
        if r.sp in T:
            T[r.sp]["collected"] = T[r.sp]["collected"] + flt(r.val)
    for r in outst:
        if r.sp in T:
            T[r.sp]["outstanding"] = T[r.sp]["outstanding"] + flt(r.val)
            if r.due_date and ds(r.due_date) < today_s:
                T[r.sp]["overdue"] = T[r.sp]["overdue"] + flt(r.val)
    team = [T[k] for k in T if T[k]["invoiced"] or T[k]["booked"] or T[k]["quotations"] or T[k]["outstanding"] or T[k]["collected"]]
    team = sorted(team, key=lambda x: -x["invoiced"])


# ---------------- rows (one row per document; the salesperson's share as value)
def merge(rows, key_fields):
    out = {}
    order = []
    for r in rows:
        o = out.get(r.name)
        if not o:
            o = {"name": r.name, "value": 0.0, "sales_person": []}
            for k in key_fields:
                v = r.get(k)
                o[k] = ds(v) if k.endswith("date") or k in ["valid_till"] else v
            out[r.name] = o
            order.append(r.name)
        o["value"] = o["value"] + flt(r.val)
        if r.sp and r.sp not in o["sales_person"]:
            o["sales_person"].append(r.sp)
    res = []
    for n in order:
        o = out[n]
        o["sales_person"] = ", ".join(o["sales_person"])
        res.append(o)
    return res


R = {
    "quotations": merge(quotes, ["transaction_date", "customer_name", "party_name", "company", "status", "workflow_state", "valid_till"]),
    "orders": merge(so_p, ["transaction_date", "customer_name", "company", "status", "delivery_date", "per_delivered", "per_billed"]),
    "open_orders": merge(open_so, ["transaction_date", "customer_name", "company", "status", "delivery_date", "per_delivered", "per_billed"]),
    "invoices": merge(inv_p, ["posting_date", "customer_name", "company", "status", "is_return", "due_date"]),
    "outstanding": merge(outst, ["posting_date", "due_date", "customer_name", "company", "status"]),
}
for r in R["outstanding"]:
    r["days_overdue"] = U.date_diff(today, U.getdate(r["due_date"])) if r["due_date"] and r["due_date"] < today_s else 0
for r in R["open_orders"]:
    r["days_late"] = U.date_diff(today, U.getdate(r["delivery_date"])) if r["delivery_date"] and r["delivery_date"] < today_s else 0
truncated = {}
for k in R:
    truncated[k] = len(R[k])
    R[k] = R[k][:LIM]

opts = [sp_info(s) for s in allowed] if scope != "own" else []
frappe.response["message"] = {
    "meta": {"scope": scope, "user": user, "from": f_s, "to": t_s, "today": today_s, "company": company, "companies": companies,
             "sales_persons": [sp_info(s) for s in (own_sp if scope == "own" else sp_scope)], "options": opts,
             "departments": my_depts if scope == "team" else [], "row_limit": LIM, "totals": truncated,
             "basis": "Values are base_net_total (company currency, before VAT) x the Sales Team share. Invoiced nets returns. Outstanding and open orders are as of today; collected counts Payment Entries only."},
    "kpi": kpi, "quote_states": quote_states, "trend": trend, "team": team, "rows": R,
}
