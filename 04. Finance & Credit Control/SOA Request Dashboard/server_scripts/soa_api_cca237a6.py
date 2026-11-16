# SOA Request API  —  Server Script  (Script Type: API, API Method: soa_api)
# Called by the SOA dashboards: frappe.call({method: "soa_api", args: {action: ...}})
# Requests: bootstrap, preview, create, list, review (manager), files (manager)
# Collections: coll_admin, coll_collectors, coll_assign, coll_lists, coll_build, coll_item, coll_approve (manager); coll_my, coll_log (collector)
# One-time: setup (Administrator / System Manager) - creates the collection DocTypes
# Collectors are employees Azrah picks in SOA Manager > Collections (the employee needs a User ID to log in). No role needed.
#
# EVERY request goes to Azrah: nothing is sent to the salesperson until she approves it.
# Approved files are emailed to the salesperson with finance in copy; there is no download in the sales dashboard.
# A salesperson can make CFG["daily_limit"] requests of EACH document type a day.
# Customer Outstanding: no PDF - total outstanding + ageing as of a date, shown to the salesperson once approved.
#
# How a request runs:
#   1. creates a "Customer Transaction Summary" (CTS) for the customer + dates; your "cs" Before Save script fills the rows
#   2. prints it with the print format of the customer's main brand (from the invoice-number prefixes)
#   3. compares the statement closing balance with the customer's Accounts Receivable outstanding
#      Customer Ledger also: opening, debit total, credit total and closing balance vs the General Ledger
#      Outstanding SOA has no start date: it covers everything up to the "as of" date
#      the result (match or not, with reasons) is shown to Azrah; she approves -> CTS Approved, PDF goes to the salesperson
#   Every request is logged in "SOA Request" with the PDF attached.
#
# Frappe Server Script rules (RestrictedPython): no imports, no "+=", no f-strings, no names starting with "_".

CFG = {
    "cts_doctype": "Customer Transaction Summary",
    # invoice-number prefix -> brand
    "brands": {"DMC": "DMCC", "DM": "DM", "CS": "DM", "NS": "Najd", "NB": "Nawat Al Bina"},
    "default_brand": "DM",
    # document -> brand -> print format (Customer Transaction Summary print formats)
    "print_formats": {
        "Outstanding SOA": {"DM": "Outstanding SOA", "Najd": "SOA - NAJD", "DMCC": "SOA - DMCC", "Nawat Al Bina": "SOA - Nawat Al Bina"},
        "Customer Ledger": {"DM": "Customer Ledger Report", "Najd": "Ledger - Najd", "DMCC": "Customer Ledger Report", "Nawat Al Bina": "Ledger - NB"},
    },
    "tolerance": 1.0,                 # SAR; statement vs Accounts Receivable difference above this goes to Azrah
    "default_credit_days": 30,        # used when the customer has no Payment Terms Template
    "company": "",                    # "" = all companies
    "sales_person_field": "",         # "" = auto: sales_person / custom_sales_person on Sales Invoice, else Sales Team table
    "manager_roles": ["SOA Manager", "Credit", "Accounts Manager", "System Manager"],
    "email_salesperson": 1,           # approved statements are EMAILED (salespeople cannot download them from the dashboard)
    "finance_email": "",              # finance address copied on every approved statement / outstanding, e.g. "finance@dmgroupksa.com"
    "daily_limit": 3,                 # requests per document type per salesperson per day (failed ones do not count; Azrah is not limited)
    "max_customers": 3000,
    # Customer -> Sales Person: "" = auto (the first field on Customer that links to Sales Person); customers where it is empty
    # fall back to the sales person on their invoices
    "customer_sales_person_field": "",
    # Collections
    "confirmation_doctype": "Customer Balance Confirmation",
    "confirmation_print_format": "Customer Balance Confirmation",
    "visit_doctype": "Daily Visit Collection",
    "visit_child_doctype": "daily visit table",
    "visit_table": "visit_table1",
    "visit_letterhead": "2026 DMG - NEW",
    "collections_company": "Durar Masagh Trading Company",
    "collect_after_days": 60,         # collectors get the open balance of invoices dated more than this many days ago
    "ageing_buckets": [30, 60, 90],   # Customer Outstanding ageing: 0-30, 31-60, 61-90, 90+
    # brand -> Letter Head used for the PDF (created by the "SOA Letterheads" script). Brands not listed use ERPNext's default.
    "letter_heads": {"DM": "SOA DM", "DMCC": "SOA DMCC", "Najd": "SOA Najd"},
    # files used by action=setup_letterheads (creates / updates the three Letter Heads above)
    "letter_head_files": {
        "SOA DM": "/files/WhatsApp%20Image%202026-08-20%20at%203.32.18%20PM.jpeg",
        "SOA DMCC": "/files/WhatsApp%20Image%202026-08-25%20at%202.47.14%20PM.jpeg",
        "SOA Najd": "/files/NajdLogo.jpeg",
    },
    "letter_head_width": 680,         # image width in px on the A4 page (header picture)
    "no_letterhead": 0,               # 1 = print without any Letter Head (use if the broken image comes from the Letter Head)
}

DOC_TYPES = list(CFG["print_formats"].keys())
OUTSTANDING = "Customer Outstanding"
ALL_TYPES = DOC_TYPES + [OUTSTANDING]
DT = CFG["cts_doctype"]
U = frappe.utils


# ------------------------------------------------------------------ helpers
def esc(v):
    s = "" if v is None else str(v)
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def letters(name):
    out = ""
    for ch in str(name or "").upper():
        if ch >= "A" and ch <= "Z":
            out = out + ch
        else:
            break
    return out


def brand_of(name):
    p = letters(name)
    keys = sorted(CFG["brands"].keys(), key=lambda k: -len(k))
    for k in keys:
        if p == k:
            return CFG["brands"][k]
    for k in keys:
        if p.startswith(k):
            return CFG["brands"][k]
    return CFG["default_brand"]


def format_for(doc_type, brand):
    m = CFG["print_formats"].get(doc_type) or {}
    return m.get(brand) or m.get(CFG["default_brand"])


def is_manager(user):
    # Server Scripts expose get_all; frappe.has_permission is not available in safe_exec.
    if user == "Administrator":
        return True
    for role in frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role"):
        if role in CFG["manager_roles"]:
            return True
    return False


def my_sales_persons(user):
    sps = []
    emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if emp:
        sps = frappe.get_all("Sales Person", filters={"employee": emp}, pluck="name")
    if not sps:
        full = frappe.db.get_value("User", user, "full_name")
        if full:
            sps = frappe.get_all("Sales Person", filters={"sales_person_name": full}, pluck="name")
    return sps


def is_collector(user):
    if not frappe.db.exists("DocType", "Collection Assignment"):
        return False
    return bool(frappe.db.exists("Collection Assignment", {"collector": user}))


def sp_field():
    if CFG["sales_person_field"]:
        return CFG["sales_person_field"]
    meta = frappe.get_meta("Sales Invoice")
    for f in ["sales_person", "custom_sales_person"]:
        if meta.has_field(f):
            return f
    return ""


def company_sql(alias):
    if CFG["company"]:
        return " and " + alias + "company = %(co)s"
    return ""


def scope_sql(sps, manager):
    if manager and not sps:
        return ""
    if not sps:
        return " and 1=0"
    f = sp_field()
    if f:
        inv = "si.`" + f + "` in %(sps)s"
    else:
        inv = "exists(select 1 from `tabSales Team` st where st.parent = si.name and st.parenttype = 'Sales Invoice' and st.sales_person in %(sps)s)"
    cf = cust_sp_field()
    if not cf:
        return " and " + inv
    # the Customer's own sales person decides; invoices only count for customers where that field is empty
    return (" and (si.customer in (select cu.name from `tabCustomer` cu where cu.`" + cf + "` in %(sps)s)"
            " or (si.customer in (select cu.name from `tabCustomer` cu where ifnull(cu.`" + cf + "`, '') = '') and " + inv + "))")


def customers_for(c):
    # get_list applies ERPNext role and user permissions. No Employee/Sales Person
    # mapping is required just to use the request dashboard.
    allowed = frappe.get_list("Customer", fields=["name"], limit_page_length=0)
    permitted = {}
    for row in allowed:
        permitted[row.name] = True
    if not permitted:
        return []
    filters = {"docstatus": 1, "customer": ["in", list(permitted.keys())]}
    if CFG["company"]:
        filters["company"] = CFG["company"]
    rows = frappe.get_list("Sales Invoice", filters=filters,
                           fields=["name", "customer", "customer_name", "outstanding_amount", "posting_date"],
                           order_by="posting_date desc", limit_page_length=0)
    by = {}
    for r in rows:
        k = r.customer
        if k not in by:
            by[k] = {"customer": k, "customer_name": r.customer_name or k, "invoices": 0,
                     "outstanding": 0.0, "last_invoice": None, "brands": {}}
        x = by[k]
        x["invoices"] = x["invoices"] + 1
        x["outstanding"] = x["outstanding"] + U.flt(r.outstanding_amount)
        if r.posting_date and (not x["last_invoice"] or str(r.posting_date) > x["last_invoice"]):
            x["last_invoice"] = str(r.posting_date)
        brand = brand_of(r.name)
        x["brands"][brand] = x["brands"].get(brand, 0) + 1
    return sorted(by.values(), key=lambda x: -abs(x["outstanding"]))[:CFG["max_customers"]]


def can_use_customer(c, customer):
    # The same permission-filtered source is used for listing, preview and create.
    filters = {"name": customer}
    if not frappe.get_list("Customer", filters=filters, fields=["name"], limit_page_length=1):
        return False
    filters = {"customer": customer, "docstatus": 1}
    if CFG["company"]:
        filters["company"] = CFG["company"]
    return bool(frappe.get_list("Sales Invoice", filters=filters, fields=["name"], limit_page_length=1))


def main_brand(customer, f, t):
    # brand with the highest invoice value in the period; else the brand of the latest invoice
    rows = frappe.db.sql("select substring_index(name, '-', 1) as p, sum(abs(grand_total)) as v, count(*) as n from `tabSales Invoice` "
                         "where customer = %(c)s and docstatus = 1 and posting_date between %(f)s and %(t)s" + company_sql("")
                         + " group by substring_index(name, '-', 1)", {"c": customer, "f": f, "t": t, "co": CFG["company"]}, as_dict=True)
    by = {}
    n = 0
    for r in rows:
        b = brand_of(r.p)
        by[b] = by.get(b, 0.0) + U.flt(r.v)
        n = n + U.cint(r.n)
    if by:
        best = sorted(by.keys(), key=lambda k: -by[k])[0]
        return {"brand": best, "invoices": n, "by_brand": by}
    last = frappe.db.sql("select name from `tabSales Invoice` where customer = %(c)s and docstatus = 1" + company_sql("")
                         + " order by posting_date desc, creation desc limit 1", {"c": customer, "co": CFG["company"]})
    return {"brand": brand_of(last[0][0]) if last else CFG["default_brand"], "invoices": 0, "by_brand": {}}


def credit_days_for(customer):
    tpl = frappe.db.get_value("Customer", customer, "payment_terms")
    if tpl:
        rows = frappe.get_all("Payment Terms Template Detail", filters={"parent": tpl, "parenttype": "Payment Terms Template"}, fields=["credit_days"], order_by="idx asc")
        days = [U.flt(r.credit_days) for r in rows]
        if days and max(days) > 0:
            return max(days)
    return CFG["default_credit_days"]


# ------------------------------------------------------------------ checks
def ar_outstanding(customer, t):
    # what the Accounts Receivable report totals: open amounts in the Payment Ledger up to the report date
    r = frappe.db.sql("select ifnull(sum(amount), 0) from `tabPayment Ledger Entry` where party_type = 'Customer' and party = %(c)s "
                      "and delinked = 0 and account_type = 'Receivable' and posting_date <= %(t)s" + company_sql(""),
                      {"c": customer, "t": t, "co": CFG["company"]})
    return U.flt(r[0][0] if r else 0, 2)


def gl_balance(customer, t):
    r = frappe.db.sql("select ifnull(sum(debit - credit), 0) from `tabGL Entry` where party_type = 'Customer' and party = %(c)s "
                      "and is_cancelled = 0 and posting_date <= %(t)s" + company_sql(""), {"c": customer, "t": t, "co": CFG["company"]})
    return U.flt(r[0][0] if r else 0, 2)


def first_gl_date(customer):
    r = frappe.db.sql("select min(posting_date) from `tabGL Entry` where party_type = 'Customer' and party = %(c)s and is_cancelled = 0"
                      + company_sql(""), {"c": customer, "co": CFG["company"]})
    return str(r[0][0]) if r and r[0][0] else ""


def dates_for(doc_type, f, t):
    # Outstanding SOA: no start date, everything up to the as-of date
    t = str(t or U.nowdate())[:10]
    if doc_type == "Outstanding SOA":
        return {"f": "", "t": t}
    return {"f": str(f or "")[:10], "t": t}


def soa_from(customer, t):
    # Outstanding SOA starts on 1 January of the year of the oldest open voucher (as in Accounts Receivable); no open voucher -> 1 Jan of the as-of year
    r = frappe.db.sql("select min(x.d) from (select min(posting_date) as d from `tabPayment Ledger Entry` where party_type = 'Customer' and party = %(c)s "
                      "and delinked = 0 and account_type = 'Receivable' and posting_date <= %(t)s" + company_sql("")
                      + " group by against_voucher_type, against_voucher_no having abs(sum(amount)) > 0.005) x", {"c": customer, "t": t, "co": CFG["company"]})
    d = str(r[0][0]) if r and r[0][0] else str(t)
    return d[:4] + "-01-01"


def gl_period(customer, f, t):
    # same figures as the General Ledger report filtered on this party: opening, period debit / credit totals, closing
    p = {"c": customer, "f": f, "t": t, "co": CFG["company"]}
    base = "from `tabGL Entry` where party_type = 'Customer' and party = %(c)s and is_cancelled = 0" + company_sql("")
    o = frappe.db.sql("select ifnull(sum(debit), 0) - ifnull(sum(credit), 0) " + base + " and posting_date < %(f)s", p)
    m = frappe.db.sql("select ifnull(sum(debit), 0), ifnull(sum(credit), 0) " + base + " and posting_date between %(f)s and %(t)s", p)
    opening = U.flt(o[0][0] if o else 0, 2)
    debit = U.flt(m[0][0] if m else 0, 2)
    credit = U.flt(m[0][1] if m else 0, 2)
    return {"opening": opening, "debit": debit, "credit": credit, "closing": U.flt(opening + debit - credit, 2)}


VTYPE = {"Sales Invoice": "Sales Invoice", "Payment Entry": "Payment Entry", "Discount": "Payment Entry", "Journal Entry": "Journal Entry"}


def cts_period(cts):
    rows = cts.get("transaction_details") or []
    opening = 0.0
    debit = 0.0
    credit = 0.0
    by = {}
    for r in rows:
        if r.reference == "Opening Balance":
            opening = U.flt(r.balance, 2)
            continue
        debit = debit + U.flt(r.debit)
        credit = credit + U.flt(r.credit)
        k = r.reference or ""
        if k not in by:
            by[k] = {"net": 0.0, "debit": 0.0, "credit": 0.0, "type": VTYPE.get(r.transaction_type) or r.transaction_type or ""}
        by[k]["net"] = by[k]["net"] + U.flt(r.debit) - U.flt(r.credit)
        by[k]["debit"] = by[k]["debit"] + U.flt(r.debit)
        by[k]["credit"] = by[k]["credit"] + U.flt(r.credit)
    closing = U.flt(rows[-1].balance, 2) if rows else 0.0
    return {"opening": opening, "debit": U.flt(debit, 2), "credit": U.flt(credit, 2), "closing": closing, "by": by}


def ledger_check(customer, f, t, cts):
    st = cts_period(cts)
    gl = gl_period(customer, f, t)
    tol = U.flt(CFG["tolerance"])
    lines = []
    ok = True
    for k in ["opening", "debit", "credit", "closing"]:
        d = U.flt(st[k] - gl[k], 2)
        if abs(d) > tol:
            ok = False
        lines.append({"key": k, "statement": st[k], "gl": gl[k], "difference": d})
    vouchers = []
    if not ok:
        glv = {}
        for r in frappe.db.sql("select voucher_type, voucher_no, sum(debit) as d, sum(credit) as c, min(posting_date) as dt from `tabGL Entry` "
                               "where party_type = 'Customer' and party = %(c)s and is_cancelled = 0 and posting_date between %(f)s and %(t)s"
                               + company_sql("") + " group by voucher_type, voucher_no", {"c": customer, "f": f, "t": t, "co": CFG["company"]}, as_dict=True):
            glv[r.voucher_no] = {"debit": U.flt(r.d), "credit": U.flt(r.c), "type": r.voucher_type, "date": str(r.dt)}
        names = list(glv.keys())
        for k in st["by"]:
            if k not in glv:
                names.append(k)
        for k in names:
            a = st["by"].get(k) or {"debit": 0.0, "credit": 0.0, "type": ""}
            g = glv.get(k) or {"debit": 0.0, "credit": 0.0, "type": "", "date": ""}
            dd = U.flt(a["debit"] - g["debit"], 2)
            dc = U.flt(a["credit"] - g["credit"], 2)
            if abs(dd) > 0.005 or abs(dc) > 0.005:
                vouchers.append({"voucher": k, "voucher_type": g["type"] or a["type"], "date": g["date"],
                                 "st_debit": U.flt(a["debit"], 2), "st_credit": U.flt(a["credit"], 2), "gl_debit": U.flt(g["debit"], 2), "gl_credit": U.flt(g["credit"], 2),
                                 "difference": U.flt((a["debit"] - a["credit"]) - (g["debit"] - g["credit"]), 2),
                                 "kind": "Missing in statement" if k not in st["by"] else ("Not in General Ledger" if k not in glv else "Amount differs")})
        vouchers = sorted(vouchers, key=lambda x: -abs(x["difference"]) - abs(x["st_debit"] - x["gl_debit"]))[:50]
    return {"matched": ok, "lines": lines, "vouchers": vouchers}


def img_srcs(html):
    # image links in the printed HTML (to name the broken one when the PDF fails)
    out = []
    s = html or ""
    i = s.find("<img")
    while i >= 0 and len(out) < 20:
        j = s.find(">", i)
        if j < 0:
            break
        tag = s[i:j]
        k = tag.find("src=")
        if k >= 0:
            q = tag[k + 4:k + 5]
            if q == '"' or q == "'":
                e = tag.find(q, k + 5)
                src = tag[k + 5:e] if e > 0 else ""
            else:
                src = tag[k + 4:].split(" ")[0]
            if src and not src.startswith("data:") and src not in out:
                out.append(src)
        i = s.find("<img", j)
    return out


BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"


def src_path(src):
    p = str(src)
    if "://" in p:
        rest = p.split("://", 1)[1]
        p = "/" + rest.split("/", 1)[1] if "/" in rest else ""
    return p.split("?")[0].replace("%20", " ")


def image_sources(srcs, fmt):
    # tell where each broken image is defined
    out = []
    pf = frappe.db.get_value("Print Format", fmt, ["html", "css"], as_dict=True) or {}
    texts = [["print format '" + str(fmt) + "'", (pf.get("html") or "") + " " + (pf.get("css") or "")]]
    for lh in frappe.get_all("Letter Head", fields=["name", "content", "footer", "image", "footer_image"], limit_page_length=50):
        texts.append(["Letter Head '" + lh.name + "'", " ".join([str(lh.content or ""), str(lh.footer or ""), str(lh.image or ""), str(lh.footer_image or "")])])
    for co in frappe.get_all("Company", fields=["name", "company_logo"], limit_page_length=20):
        texts.append(["Company '" + co.name + "' logo", str(co.company_logo or "")])
    for st in frappe.get_all("Print Style", fields=["name", "css"], limit_page_length=20):
        texts.append(["Print Style '" + st.name + "'", str(st.css or "")])
    for src in srcs:
        key = src_path(src).split("/")[-1]
        where = []
        for t in texts:
            if key and key in t[1].replace("%20", " "):
                where.append(t[0])
        out.append(src + " <- " + (", ".join(where) if where else "not written as text in the print format or Letter Heads (comes from a Jinja expression / field). Run  /api/method/soa_api?action=find_image  to find it"))
    return out


def blank_images(html, srcs, only_missing):
    # replace picture links whose file is gone with a 1px picture so the PDF can still be made
    fixed = []
    for src in srcs:
        p = src_path(src)
        local = p.startswith("/files/") or p.startswith("/private/files/")
        if not local:
            continue
        if only_missing and frappe.db.exists("File", {"file_url": p}):
            continue
        for v in [src, p, p.replace(" ", "%20"), src.replace("%20", " ")]:
            if v:
                html = html.replace(v, BLANK)
        fixed.append(p)
    return {"html": html, "fixed": fixed}


def css_srcs(html):
    # picture links used as CSS backgrounds: url(...)
    out = []
    i = html.find("url(")
    while i >= 0 and len(out) < 20:
        j = html.find(")", i)
        if j < 0:
            break
        v = html[i + 4:j].strip().strip("'").strip('"').replace("&quot;", "")
        if v and not v.startswith("data:") and v not in out:
            out.append(v)
        i = html.find("url(", j)
    return out


def all_srcs(html):
    out = img_srcs(html)
    for v in css_srcs(html):
        if v not in out:
            out.append(v)
    return out


def make_pdf_inner(name, fmt, brand):
    nl = U.cint(CFG["no_letterhead"])
    lh = CFG["letter_heads"].get(brand)
    if lh and not frappe.db.exists("Letter Head", lh):
        lh = None
    html = frappe.get_print(DT, name, print_format=fmt, no_letterhead=nl, letterhead=lh)
    low = html.lower()
    if "not permitted" in low or "navbar-brand" in low or "page-not-found" in low:
        frappe.throw("ERPNext returned a website page (not permitted / not found) instead of the printed statement for " + name + " with print format '" + str(fmt)
                     + "'. The statement is printed with a one-day share key, so check that the print format '" + str(fmt) + "' exists, is enabled for " + DT + " and that Document Share Key can be created.")
    srcs = all_srcs(html)
    # skip pictures whose file is gone BEFORE printing, so ERPNext never raises the "broken image links" popup
    html = blank_images(html, srcs, True)["html"]
    first = ""
    try:
        return frappe.get_print(DT, name, print_format=fmt, html=html, as_pdf=True, letterhead=lh)
    except Exception as e:
        first = str(e)[:100]
    # last resort: drop every locally stored picture
    again = blank_images(html, srcs, False)
    try:
        if again["fixed"]:
            return frappe.get_print(DT, name, print_format=fmt, html=again["html"], as_pdf=True, letterhead=lh)
    except Exception as e2:
        first = str(e2)[:100]
    frappe.throw("PDF failed (" + first + "). Broken image: " + (" | ".join(image_sources(srcs, fmt)) or "none found in the printed page"))


def make_pdf(name, fmt, brand):
    # Salespeople have no access to Customer Transaction Summary. ERPNext lets a print through when it carries a valid share key
    # for that one document, so the script makes a one-day key, prints with it, then deletes it.
    sk = frappe.get_doc({"doctype": "Document Share Key", "reference_doctype": DT, "reference_docname": name,
                         "expires_on": U.add_days(U.nowdate(), 1)})
    sk.insert(ignore_permissions=True)
    frappe.form_dict["key"] = sk.key
    out = None
    try:
        out = make_pdf_inner(name, fmt, brand)
    finally:
        frappe.form_dict["key"] = ""
        frappe.delete_doc("Document Share Key", sk.name, ignore_permissions=True)
    return out


def mismatch_items(customer, t):
    p = {"c": customer, "t": t, "co": CFG["company"]}
    items = []
    for r in frappe.db.sql("select name, posting_date, unallocated_amount, payment_type from `tabPayment Entry` where party_type = 'Customer' "
                           "and party = %(c)s and docstatus = 1 and unallocated_amount > 0.005 and posting_date <= %(t)s" + company_sql("")
                           + " order by posting_date", p, as_dict=True):
        items.append({"kind": "Unallocated payment", "voucher_type": "Payment Entry", "voucher": r.name, "date": str(r.posting_date),
                      "amount": -U.flt(r.unallocated_amount) if r.payment_type == "Receive" else U.flt(r.unallocated_amount)})
    for r in frappe.db.sql("select voucher_no, min(posting_date) as d, sum(debit - credit) as amt from `tabGL Entry` where party_type = 'Customer' "
                           "and party = %(c)s and is_cancelled = 0 and voucher_type = 'Journal Entry' and ifnull(against_voucher, '') = '' "
                           "and posting_date <= %(t)s" + company_sql("") + " group by voucher_no having abs(sum(debit - credit)) > 0.005 order by d", p, as_dict=True):
        items.append({"kind": "Journal entry not linked to an invoice", "voucher_type": "Journal Entry", "voucher": r.voucher_no, "date": str(r.d), "amount": U.flt(r.amt)})
    return items[:50]


def compare(statement, ar, available):
    diff = U.flt(statement - ar, 2)
    return {"available": available, "ledger_balance": U.flt(statement, 2), "invoice_outstanding": ar, "difference": diff,
            "matched": abs(diff) <= U.flt(CFG["tolerance"])}


# ------------------------------------------------------------------ CTS + PDF
def set_cts_state(name, state):
    vals = {"status": state}
    wf = frappe.db.get_value("Workflow", {"document_type": DT, "is_active": 1}, "workflow_state_field")
    if wf:
        vals[wf] = state
    frappe.db.set_value(DT, name, vals)


def ar_rows(customer, t, credit_days):
    # the rows the Accounts Receivable report shows: every voucher with an open amount (invoices, unallocated payments, credit notes, journals)
    rows = frappe.db.sql("select against_voucher_type as vt, against_voucher_no as vn, sum(amount) as o, min(posting_date) as d from `tabPayment Ledger Entry` "
                         "where party_type = 'Customer' and party = %(c)s and delinked = 0 and account_type = 'Receivable' and posting_date <= %(t)s"
                         + company_sql("") + " group by against_voucher_type, against_voucher_no having abs(sum(amount)) > 0.005 order by d, vn",
                         {"c": customer, "t": t, "co": CFG["company"]}, as_dict=True)
    names = []
    for r in rows:
        if r.vt == "Sales Invoice":
            names.append(r.vn)
    st = {}
    if names:
        for x in frappe.db.sql("select name, status from `tabSales Invoice` where name in %(n)s", {"n": tuple(names)}, as_dict=True):
            st[x.name] = x.status
    out = []
    run = 0.0
    for r in rows:
        o = U.flt(r.o, 2)
        run = U.flt(run + o, 2)
        due = U.add_days(r.d, U.cint(credit_days))
        out.append({"transaction_date": r.d, "transaction_type": r.vt, "reference": r.vn, "debit": o if o > 0 else 0, "credit": -o if o < 0 else 0,
                    "balance": run, "status": st.get(r.vn) or "", "mode": "", "actual_duedate": due,
                    "overdue_days": U.date_diff(t, r.d) if o > 0 else 0})
    return out


def use_ar_rows(cts, customer, t):
    # Outstanding SOA: the rows come from the Customer Transaction Summary. Accounts Receivable decides which of them stay:
    # a row stays only if its voucher is open in Accounts Receivable (amount = what is still open). Everything else is skipped.
    # The "cs" script skips rebuilding when doc.flags.ar_rows is set.
    ar = ar_rows(customer, t, cts.credit_days)
    armap = {}
    for a in ar:
        armap[a["reference"]] = a
    src = cts.get("transaction_details") or []
    first = {}
    for r in src:
        k = r.reference
        if k == "Opening Balance":
            continue
        if k not in first or (first[k].transaction_type == "Discount" and r.transaction_type != "Discount"):
            first[k] = r
    keep = []
    problems = []
    skipped = 0
    for r in src:
        k = r.reference
        if k in armap and first.get(k) is r:
            a = armap[k]
            o = U.flt(a["debit"] - a["credit"], 2)
            net = U.flt(r.debit, 2) - U.flt(r.credit, 2)
            if (o > 0 and net <= 0) or (o < 0 and net >= 0) or abs(net) + 0.005 < abs(o):
                problems.append({"kind": "Statement row differs from Accounts Receivable", "voucher_type": a["transaction_type"], "voucher": k,
                                 "date": str(a["transaction_date"]), "amount": o})
            keep.append({"transaction_date": r.transaction_date, "transaction_type": r.transaction_type or a["transaction_type"], "reference": k,
                         "status": r.status or a["status"], "mode": r.mode or "", "actual_duedate": r.actual_duedate or a["actual_duedate"],
                         "overdue_days": r.overdue_days if o > 0 else 0, "debit": a["debit"], "credit": a["credit"], "balance": 0})
        else:
            skipped = skipped + 1
    for k in armap:
        if k not in first:
            a = armap[k]
            problems.append({"kind": "Receivable missing from the statement rows", "voucher_type": a["transaction_type"], "voucher": k,
                             "date": str(a["transaction_date"]), "amount": U.flt(a["debit"] - a["credit"], 2)})
            keep.append({"transaction_date": a["transaction_date"], "transaction_type": a["transaction_type"], "reference": k, "status": a["status"], "mode": "",
                         "actual_duedate": a["actual_duedate"], "overdue_days": a["overdue_days"], "debit": a["debit"], "credit": a["credit"], "balance": 0})
    keep = sorted(keep, key=lambda x: str(x["transaction_date"]))
    run = 0.0
    for x in keep:
        run = U.flt(run + x["debit"] - x["credit"], 2)
        x["balance"] = run
    cts.flags.ar_rows = 1
    cts.set("transaction_details", [])
    for x in keep:
        cts.append("transaction_details", x)
    cts.save(ignore_permissions=True)
    n = len(cts.get("transaction_details") or [])
    if n != len(keep):
        frappe.throw("The Customer Transaction Summary script ('cs') rebuilt the rows (" + str(n) + " instead of " + str(len(keep))
                     + "). Replace the cs script with the latest version that skips rebuilding when doc.flags.ar_rows is set.")
    return {"rows": n, "problems": problems, "skipped": skipped}


def closing_balance(cts):
    rows = cts.get("transaction_details") or []
    return U.flt(rows[-1].balance, 2) if rows else 0.0


def remove_files(req):
    for f in (req.files or []):
        if f.file_id and frappe.db.exists("File", f.file_id):
            frappe.delete_doc("File", f.file_id, ignore_permissions=True)
    req.set("files", [])


def build(req, cts):
    # print the CTS with the main-brand format, attach the PDF to the SOA Request, compare with Accounts Receivable
    remove_files(req)
    mb = main_brand(req.customer, str(req.from_date), str(req.to_date))
    fmt = format_for(req.document_type, mb["brand"])
    if not frappe.db.exists("Print Format", fmt):
        req.status = "Failed"
        req.error = "Print format not found: " + str(fmt) + ". Fix print_formats in the SOA API server script."
        return None
    statement = closing_balance(cts)
    ar = ar_outstanding(req.customer, str(req.to_date))
    chk = compare(statement, ar, True)
    gl = None
    if req.document_type == "Customer Ledger":
        gl = ledger_check(req.customer, str(req.from_date), str(req.to_date), cts)
        chk["gl"] = gl
        chk["matched"] = chk["matched"] and gl["matched"]
    nrows = len(cts.get("transaction_details") or [])
    extra = []
    if req.document_type == "Outstanding SOA":
        sr = use_ar_rows(cts, req.customer, str(req.to_date))
        nrows = sr["rows"]
        extra = sr["problems"]
        if extra:
            chk["matched"] = False
    req.ledger_balance = chk["ledger_balance"]
    req.invoice_outstanding = chk["invoice_outstanding"]
    req.difference = chk["difference"]
    items = mismatch_items(req.customer, str(req.to_date)) if abs(chk["difference"]) > U.flt(CFG["tolerance"]) else []
    req.review_details = json.dumps({"items": items + extra, "gl": gl, "matched": bool(chk["matched"])})
    pdf = make_pdf(cts.name, fmt, mb["brand"])
    fname = cts.name + "_" + mb["brand"].replace(" ", "_") + "_" + req.document_type.replace(" ", "_") + ".pdf"
    fd = frappe.get_doc({"doctype": "File", "file_name": fname, "attached_to_doctype": "SOA Request", "attached_to_name": req.name,
                         "is_private": 1, "content": pdf}).insert(ignore_permissions=True)
    req.append("files", {"brand": mb["brand"], "letter_head": fmt, "file_id": fd.name, "file_url": fd.file_url, "file_name": fname,
                         "amount": statement, "rows": nrows})
    req.letterheads = mb["brand"]
    req.print_format = fmt
    req.error = ""
    return chk


def ageing(rows, t):
    # rows: open vouchers [{"o": amount, "d": date}] -> total + buckets by invoice date
    edges = CFG["ageing_buckets"]
    labels = []
    lo = 0
    for e in edges:
        labels.append(str(lo) + "-" + str(e))
        lo = e + 1
    labels.append(str(edges[-1]) + "+")
    amounts = [0.0 for x in labels]
    total = 0.0
    for r in rows:
        days = U.date_diff(t, r["d"])
        i = 0
        while i < len(edges) and days > edges[i]:
            i = i + 1
        amounts[i] = amounts[i] + U.flt(r["o"])
        total = total + U.flt(r["o"])
    out = []
    i = 0
    for lb in labels:
        out.append({"label": lb, "amount": U.flt(amounts[i], 2)})
        i = i + 1
    return {"total": U.flt(total, 2), "buckets": out, "vouchers": len(rows)}


def outstanding_request(req):
    t = str(req.to_date)
    rows = open_by_customer([req.customer], t).get(req.customer) or []
    ag = ageing(rows, t)
    chk = compare(gl_balance(req.customer, t), ag["total"], True)
    req.ledger_balance = chk["ledger_balance"]
    req.invoice_outstanding = chk["invoice_outstanding"]
    req.difference = chk["difference"]
    items = mismatch_items(req.customer, t) if abs(chk["difference"]) > U.flt(CFG["tolerance"]) else []
    req.review_details = json.dumps({"items": items, "gl": None, "matched": bool(chk["matched"]), "ageing": ag})
    req.error = ""
    return chk


def customer_contact(customer):
    # address + email shown in the "To" box of the confirmation letter (the print format prints doc.address / doc.email)
    cu = frappe.db.get_value("Customer", customer, ["customer_primary_address", "email_id"], as_dict=True) or {}
    an = cu.get("customer_primary_address")
    if not an:
        links = frappe.get_all("Dynamic Link", filters={"link_doctype": "Customer", "link_name": customer, "parenttype": "Address"},
                               pluck="parent", limit_page_length=1)
        an = links[0] if links else None
    email = cu.get("email_id") or ""
    addr = ""
    if an:
        a = frappe.db.get_value("Address", an, ["address_line1", "address_line2", "city", "email_id"], as_dict=True) or {}
        addr = ", ".join([x for x in [a.get("address_line1"), a.get("address_line2"), a.get("city")] if x])
        email = email or a.get("email_id") or ""
    return {"address": addr, "email": email}


def pdf_safe_html(html):
    # The PDF engine (wkhtmltopdf) has no flexbox, so the print format's flex layouts collapse in the PDF
    # (English and Arabic boxes overlap, Date drops under the address). Same layout, built with table cells instead.
    fix = ("<style>.bilingual-container{display:table!important;table-layout:fixed;width:100%}"
           ".bilingual-box{display:table-cell!important;width:50%;vertical-align:top}"
           "div[style*='display: flex']{display:-webkit-box!important;-webkit-box-pack:justify;-webkit-box-align:start}</style>")
    if "</head>" in html:
        return html.replace("</head>", fix + "</head>", 1)
    return fix + html


def balance_confirmation_pdf(req):
    doctype = CFG["confirmation_doctype"]
    pf = CFG["confirmation_print_format"]
    # the SOA Request name already starts with "SOA-": name the confirmation like the hand-made ones (CBC-<customer>-<no.>)
    base = req.name[4:] if req.name.startswith("SOA-") else req.name
    name = "CBC-" + base
    # Reuse one managed confirmation per SOA Request. Manual documents are untouched.
    frappe.db.sql("select name from `tabSOA Request` where name = %(name)s for update", {"name": req.name})
    old = "SOA-" + req.name
    if not frappe.db.exists(doctype, name) and frappe.db.get_value(doctype, old, "docstatus") == 0:
        # draft made by the earlier version of this script under the "SOA-SOA-..." name
        try:
            frappe.delete_doc(doctype, old, ignore_permissions=True)
        except Exception:
            pass
    exists = frappe.db.exists(doctype, name)
    confirmation = frappe.get_doc(doctype, name) if exists else frappe.get_doc({"doctype": doctype})
    if U.cint(confirmation.docstatus):
        frappe.throw("The generated Customer Balance Confirmation must remain a draft for dashboard updates.")
    confirmation.customer = req.customer
    confirmation.date = req.to_date
    confirmation.amount_due = U.flt(req.invoice_outstanding, 2)
    ct = customer_contact(req.customer)
    if ct["address"]:
        confirmation.address = ct["address"]
    if ct["email"]:
        confirmation.email = ct["email"]
    if not confirmation.address:
        confirmation.address = ""      # the print format prints "None" for an empty address
    if exists:
        confirmation.save(ignore_permissions=True)
    else:
        confirmation.insert(ignore_permissions=True, set_name=name)
    # The site's Before Save script computes an unrestricted all-date GL balance.
    # Preserve the approved as-of snapshot after that hook, without changing the hook
    # for manually created confirmations or triggering it recursively.
    amount = U.flt(req.invoice_outstanding, 2)
    frappe.db.set_value(doctype, confirmation.name, {"amount_due": amount, "date": req.to_date}, update_modified=False)
    confirmation.amount_due = amount
    if not frappe.db.exists("Print Format", pf):
        frappe.throw("Print format not found: " + pf + " (Customer Balance Confirmation).")
    html = pdf_safe_html(frappe.get_print(doctype, confirmation.name, print_format=pf))
    pdf = frappe.get_print(doctype, confirmation.name, print_format=pf, html=html, as_pdf=True)
    # Keep existing attachments if rendering fails; replace only after a new PDF exists.
    remove_files(req)
    filename = base + "_Customer_Balance_Confirmation.pdf"
    file = frappe.get_doc({"doctype": "File", "file_name": filename, "attached_to_doctype": "SOA Request",
                           "attached_to_name": req.name, "is_private": 1, "content": pdf}).insert(ignore_permissions=True)
    req.append("files", {"brand": "", "letter_head": pf, "file_id": file.name,
                         "file_url": file.file_url, "file_name": filename, "amount": amount, "rows": 1})
    req.print_format = pf


def mail(req, subject, message, attachments):
    if not attachments:
        frappe.throw("The PDF attachment is missing. Re-check the request before sending.")
    to = [req.requested_by] if req.requested_by and "@" in req.requested_by else []
    cc = [CFG["finance_email"]] if CFG["finance_email"] else []
    if not to and cc:
        to = cc
        cc = []
    if not to:
        frappe.throw("No email address for " + str(req.requested_by) + " - the statement cannot be emailed.")
    frappe.sendmail(recipients=to, cc=cc, subject=subject, message=message, attachments=attachments,
                    reference_doctype="SOA Request", reference_name=req.name)


def send_to_salesperson(req, how):
    req.status = "Sent" if how == "auto" else "Approved"
    req.sent_on = U.now_datetime()
    if req.cts:
        set_cts_state(req.cts, "Approved")
    what = "Outstanding approved: " if req.document_type == OUTSTANDING else "Statement ready: "
    try:
        frappe.get_doc({"doctype": "Notification Log", "for_user": req.requested_by, "type": "Alert", "document_type": "SOA Request",
                        "document_name": req.name, "subject": what + (req.customer_name or req.customer) + " (" + req.document_type + ")"}).insert(ignore_permissions=True)
    except Exception:
        pass
    if req.document_type == OUTSTANDING:
        ag = (json.loads(req.review_details or "{}") or {}).get("ageing") or {}
        lines = ""
        for b in (ag.get("buckets") or []):
            lines = lines + "<tr><td>" + esc(b["label"]) + " days</td><td style='text-align:right'>" + esc(U.fmt_money(b["amount"])) + "</td></tr>"
        if not req.files:
            balance_confirmation_pdf(req)
        mail(req, "Customer Balance Confirmation - " + (req.customer_name or req.customer) + " as of " + U.formatdate(req.to_date),
             "Customer Balance Confirmation for <b>" + esc(req.customer_name or req.customer) + "</b> as of " + esc(U.formatdate(req.to_date)) + ": <b>"
             + esc(U.fmt_money(req.invoice_outstanding)) + " SAR</b><table>" + lines + "</table><p>Requested by " + esc(user_name(req.requested_by))
             + ", approved by " + esc(user_name(req.reviewed_by or user)) + ". The PDF is attached.</p>",
             [{"fid": file.file_id} for file in (req.files or [])])
        return
    mail(req, req.document_type + " - " + (req.customer_name or req.customer) + " (" + str(req.cts) + ")",
         "The " + esc(req.document_type) + " for <b>" + esc(req.customer_name or req.customer) + "</b> ("
         + (esc(U.formatdate(req.from_date)) + " - " if req.document_type == "Customer Ledger" else "as of ") + esc(U.formatdate(req.to_date))
         + ") is attached.<p>Requested by " + esc(user_name(req.requested_by)) + ", approved by " + esc(user_name(req.reviewed_by or user)) + ".</p>",
         [{"fid": x.file_id} for x in (req.files or [])])


def run_request(req, resave):
    # (re)build: resave=True re-runs the cs script on the existing CTS
    try:
        if req.cts and frappe.db.exists(DT, req.cts):
            cts = frappe.get_doc(DT, req.cts)
            if resave:
                cts.save(ignore_permissions=True)
        else:
            cts = frappe.get_doc({"doctype": DT, "statement_date": U.nowdate(), "from_date": req.from_date, "to_date": req.to_date,
                                  "customer_name": req.customer, "credit_days": credit_days_for(req.customer)})
            cts.insert(ignore_permissions=True)
            req.cts = cts.name
        return build(req, cts)
    except Exception as e:
        req.status = "Failed"
        req.error = str(e)[:1000]
        frappe.log_error(title="SOA build failed " + str(req.name))
        return None


NAMES = {}


def user_name(u):
    if u not in NAMES:
        NAMES[u] = frappe.db.get_value("User", u, "full_name") or u
    return NAMES[u]


def req_dict(d, files, with_details, show_amounts=True):
    out = {"name": d.name, "cts": d.cts, "customer": d.customer, "customer_name": d.customer_name, "document_type": d.document_type,
           "from_date": str(d.from_date or ""), "to_date": str(d.to_date or ""), "status": d.status, "requested_by": d.requested_by,
           "requested_by_name": user_name(d.requested_by) if d.requested_by else "",
           "sales_person": d.sales_person, "ledger_balance": U.flt(d.ledger_balance), "invoice_outstanding": U.flt(d.invoice_outstanding),
           "difference": U.flt(d.difference), "letterheads": d.letterheads, "print_format": d.print_format, "creation": str(d.creation),
           "sent_on": str(d.sent_on or ""), "reviewed_by": d.reviewed_by, "reviewed_on": str(d.reviewed_on or ""), "review_note": d.review_note,
           "request_note": d.request_note, "error": d.error, "files": files}
    det = {}
    try:
        det = json.loads(d.review_details or "{}")
    except Exception:
        det = {}
    if isinstance(det, list):
        det = {"items": det, "gl": None}
    out["matched"] = det.get("matched")
    if show_amounts:
        out["ageing"] = det.get("ageing")
    elif d.document_type == OUTSTANDING:
        # the salesperson sees the amount only after Azrah approves it
        out["ledger_balance"] = 0
        out["invoice_outstanding"] = 0
        out["difference"] = 0
    if with_details:
        out["details"] = det.get("items") or []
        out["gl"] = det.get("gl")
    return out


def files_of(names):
    by = {}
    if not names:
        return by
    for f in frappe.get_all("SOA Request File", filters={"parent": ["in", names], "parenttype": "SOA Request"},
                            fields=["parent", "brand", "letter_head", "file_url", "file_name", "amount", "rows"], order_by="idx asc"):
        if f.parent not in by:
            by[f.parent] = []
        by[f.parent].append({"brand": f.brand, "letter_head": f.letter_head, "file_url": f.file_url, "file_name": f.file_name, "amount": U.flt(f.amount), "rows": U.cint(f.rows)})
    return by



# ------------------------------------------------------------------ COLLECTIONS CORE START
# (the "Collections Daily Build" scheduler script is generated from this block - keep it self-contained)
def cust_sp_field():
    if CFG["customer_sales_person_field"]:
        return CFG["customer_sales_person_field"]
    for f in frappe.get_meta("Customer").fields:
        if f.fieldtype == "Link" and f.options == "Sales Person":
            return f.fieldname
    return ""


def open_by_customer(customers, t):
    # open vouchers per customer as Accounts Receivable sees them (Payment Ledger, up to date t)
    out = {}
    if not customers:
        return out
    for r in frappe.db.sql("select ple.party, ple.against_voucher_type as vt, ple.against_voucher_no as vn, "
                           "sum(ple.amount) as o, si.posting_date as d from `tabPayment Ledger Entry` ple "
                           "join `tabSales Invoice` si on si.name = ple.against_voucher_no and si.customer = ple.party "
                           "where ple.against_voucher_type = 'Sales Invoice' and si.docstatus = 1 "
                           "and si.company = %(co)s and ple.company = %(co)s "
                           "and ple.party_type = 'Customer' and ple.party in %(p)s and ple.delinked = 0 "
                           "and ple.account_type = 'Receivable' and ple.posting_date <= %(t)s and si.posting_date <= %(t)s "
                           "group by ple.party, ple.against_voucher_type, ple.against_voucher_no, si.posting_date "
                           "having abs(sum(ple.amount)) > 0.005",
                           {"p": tuple(customers), "t": t, "co": CFG["collections_company"]}, as_dict=True):
        if r.party not in out:
            out[r.party] = []
        out[r.party].append({"vt": r.vt, "vn": r.vn, "o": U.flt(r.o, 2), "d": str(r.d)})
    vouchers = []
    for customer in out:
        for row in out[customer]:
            vouchers.append(row["vn"])
    people = invoice_salespeople(vouchers)
    for customer in out:
        for row in out[customer]:
            row["salespeople"] = people.get(row["vn"]) or []
    return out


def invoice_salespeople(vouchers):
    out = {}
    if not vouchers:
        return out
    f = sp_field()
    if f:
        query = ("select si.name as invoice, si.`" + f + "` as sp from `tabSales Invoice` si "
                 "where si.name in %(v)s and si.company = %(co)s and si.docstatus = 1")
    else:
        query = ("select si.name as invoice, st.sales_person as sp from `tabSales Invoice` si "
                 "join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice' "
                 "where si.name in %(v)s and si.company = %(co)s and si.docstatus = 1 order by st.idx asc")
    for r in frappe.db.sql(query, {"v": tuple(vouchers), "co": CFG["collections_company"]}, as_dict=True):
        if r.sp:
            if r.invoice not in out:
                out[r.invoice] = []
            if r.sp not in out[r.invoice]:
                out[r.invoice].append(r.sp)
    return out


def collection_queue_history(day):
    # Only released lists advance the rotation. Draft rebuilds never consume a turn.
    latest = {}
    previous = {}
    reserved = {}
    for r in frappe.db.sql("select cl.collector, ci.customer, cl.list_date, cl.status "
                           "from `tabCollection List Item` ci join `tabCollection List` cl on cl.name = ci.parent "
                           "where ifnull(ci.removed, 0) = 0 and cl.list_date <= %(day)s "
                           "and (cl.status in ('Approved', 'Closed') or cl.list_date = %(day)s)",
                           {"day": day}, as_dict=True):
        date = str(r.list_date)
        if date == day:
            if r.customer not in reserved:
                reserved[r.customer] = []
            reserved[r.customer].append(r.collector)
            continue
        if U.date_diff(day, date) == 1:
            previous[r.customer] = True
        if r.collector not in latest:
            latest[r.collector] = {}
        if date > latest[r.collector].get(r.customer, ""):
            latest[r.collector][r.customer] = date
    return {"latest": latest, "previous": previous, "reserved": reserved}


def collection_salesperson_options(day):
    cmap = customer_map()
    opn = open_by_customer(list(cmap.keys()), day)
    pending = {}
    for customer in opn:
        for row in opn[customer]:
            if row["o"] <= U.flt(CFG["tolerance"]) or U.date_diff(day, row["d"]) <= U.cint(CFG["collect_after_days"]):
                continue
            people = row.get("salespeople") or ([cmap[customer]["sp"]] if cmap[customer]["sp"] else [])
            for sp in people:
                if sp not in pending:
                    pending[sp] = {}
                pending[sp][row["vn"]] = True
    saved = []
    amap = assignments()
    for col in amap:
        saved = saved + amap[col]
    details = {}
    for sp in frappe.get_all("Sales Person", fields=["name", "enabled", "is_group", "employee"], order_by="name asc", limit_page_length=0):
        left = not U.cint(sp.enabled)
        if sp.employee:
            status = frappe.db.get_value("Employee", sp.employee, "status")
            if status and status != "Active":
                left = True
        if (not U.cint(sp.is_group) and not left) or sp.name in pending or sp.name in saved:
            details[sp.name] = {"left": left, "pending_invoices": len(pending.get(sp.name) or {})}
    # Historical invoice names stay selectable even if their Sales Person record no longer exists.
    for sp in list(pending.keys()) + saved:
        if sp not in details:
            details[sp] = {"left": True, "pending_invoices": len(pending.get(sp) or {})}
    return details


def collector_users():
    # collectors = employees Azrah picked (one Collection Assignment row each, sales person empty), plus anyone with assignments
    seen = {}
    out = []
    for a in frappe.get_all("Collection Assignment", fields=["collector", "collector_name", "employee", "max_customers"], order_by="collector_name asc", limit_page_length=0):
        if a.collector in seen:
            continue
        seen[a.collector] = 1
        out.append({"user": a.collector, "full_name": a.collector_name or a.collector, "employee": a.employee or "", "max_customers": U.cint(a.max_customers)})
    return out


def collector_limits():
    # max customers per day per collector (0 = no limit), set by Azrah
    out = {}
    for a in frappe.get_all("Collection Assignment", fields=["collector", "max_customers"], limit_page_length=0):
        if U.cint(a.max_customers) > U.cint(out.get(a.collector)):
            out[a.collector] = U.cint(a.max_customers)
    return out


def assignments():
    by = {}
    for a in frappe.get_all("Collection Assignment", fields=["collector", "sales_person"], order_by="sales_person asc", limit_page_length=0):
        if a.collector not in by:
            by[a.collector] = []
        if a.sales_person:
            by[a.collector].append(a.sales_person)
    return by


def legal_customers():
    # customers with an ongoing Legal Case List record (Opened, Underway or no status yet) - kept out of collections
    out = {}
    for r in frappe.db.sql("select distinct customer from `tabLegal Case List` where ifnull(customer, '') != '' and docstatus < 2 "
                           "and ifnull(legal_case_status, '') in ('', 'Opened', 'Underway')", as_dict=True):
        out[r.customer] = True
    return out


def customer_map():
    # customer -> {sp, name, phone}: the Customer's sales person field; empty ones fall back to the sales person on their latest invoice
    # customers with an ongoing legal case are left out, so no collection flow (build, replace, diagnostics) can pick them
    out = {}
    cf = cust_sp_field()
    fields = ["name", "customer_name", "mobile_no"]
    if cf:
        fields.append(cf)
    missing = 0
    legal = legal_customers()
    for r in frappe.get_all("Customer", filters={"disabled": 0}, fields=fields, limit_page_length=0):
        if legal.get(r.name):
            continue
        sp = r.get(cf) if cf else ""
        out[r.name] = {"sp": sp or "", "name": r.customer_name or r.name, "phone": r.mobile_no or ""}
        if not sp:
            missing = missing + 1
    f = sp_field()
    if missing:
        latest = {}
        if f:
            query = ("select si.customer, si.`" + f + "` as sp from `tabSales Invoice` si "
                     "where si.docstatus = 1 and ifnull(si.`" + f + "`, '') != '' "
                     "and si.company = %(co)s order by si.posting_date asc, si.creation asc, si.name asc")
        else:
            # Standard ERPNext stores invoice salespeople in Sales Team, not a direct invoice field.
            # For a multi-person invoice use its first Sales Team row, consistently.
            query = ("select si.customer, st.sales_person as sp from `tabSales Invoice` si "
                     "join `tabSales Team` st on st.parent = si.name and st.parenttype = 'Sales Invoice' "
                     "where si.docstatus = 1 and ifnull(st.sales_person, '') != '' and si.company = %(co)s "
                     "order by si.posting_date asc, si.creation asc, si.name asc, st.idx desc")
        for r in frappe.db.sql(query, {"co": CFG["collections_company"]}, as_dict=True):
            latest[r.customer] = r.sp
        for k in out:
            if not out[k]["sp"] and latest.get(k):
                out[k]["sp"] = latest.get(k)
    return out


def last_updates(customers):
    # the latest collector log per customer, carried into the next day's list
    out = {}
    if not customers:
        return out
    for r in frappe.db.sql("select ci.customer, ci.result, ci.note, ci.promise_date, ci.collected_amount, cl.list_date, cl.collector "
                           "from `tabCollection List Item` ci join `tabCollection List` cl on cl.name = ci.parent "
                           "where ci.customer in %(c)s and (ifnull(ci.result, '') != '' or ifnull(ci.note, '') != '') order by cl.list_date desc, ci.modified desc",
                           {"c": tuple(customers)}, as_dict=True):
        if r.customer in out:
            continue
        txt = str(r.result or "Remark") + " on " + str(r.list_date)
        if U.flt(r.collected_amount):
            txt = txt + " - " + U.fmt_money(r.collected_amount)
        if r.promise_date:
            txt = txt + " - promised " + str(r.promise_date)
        if r.note:
            txt = txt + " - " + str(r.note)[:120]
        out[r.customer] = txt
    return out


def collection_candidates(col, day, cmap=None, opn=None, last=None, amap=None, history=None):
    if amap is None:
        amap = assignments()
    if cmap is None:
        cmap = customer_map()
    mine = {col: list(cmap.keys())}
    if opn is None:
        opn = open_by_customer(mine[col], day)
    if last is None:
        last = last_updates(mine[col])
    if history is None:
        history = collection_queue_history(day)
    limit = U.cint(CFG["collect_after_days"])
    tol = U.flt(CFG["tolerance"])
    items = []
    for k in mine[col]:
        if history["previous"].get(k) or any(owner != col for owner in history["reserved"].get(k, [])):
            continue
        rows = []
        matched = []
        for row in (opn.get(k) or []):
            people = row.get("salespeople") or ([cmap[k]["sp"]] if cmap[k]["sp"] else [])
            owners = [sp for sp in people if sp in (amap.get(col) or [])]
            if owners:
                rows.append(row)
                for sp in owners:
                    if sp not in matched:
                        matched.append(sp)
        total = 0.0
        due = 0.0
        inv = []
        for r in rows:
            total = total + r["o"]
            days = U.date_diff(day, r["d"])
            if days > limit:
                due = due + r["o"]
                if r["o"] > 0:
                    inv.append({"voucher": r["vn"], "type": r["vt"], "date": r["d"], "amount": r["o"], "days": days})
        if due > total:
            due = total
        if due <= tol:
            continue
        inv = sorted(inv, key=lambda x: x["date"])
        items.append({"customer": k, "customer_name": cmap[k]["name"], "sales_person": ", ".join(matched), "phone": cmap[k]["phone"],
                      "due_amount": U.flt(due, 2), "total_outstanding": U.flt(total, 2), "oldest_date": inv[0]["date"] if inv else None,
                      "invoice_details": json.dumps(inv), "last_update": last.get(k) or "", "result": "", "removed": 0})
    # Persistent least-recently-assigned queue: unseen customers first, then oldest turns.
    turns = history["latest"].get(col) or {}
    items = sorted(items, key=lambda x: (turns.get(x["customer"], ""), -x["due_amount"], x["customer"]))
    return items


def validate_collection_turn(doc, customer=None):
    history = collection_queue_history(str(doc.list_date))
    legal = legal_customers()
    for it in (doc.get("items") or []):
        if customer and it.customer != customer:
            continue
        if not customer and U.cint(it.removed):
            continue
        if legal.get(it.customer):
            frappe.throw("Customer " + it.customer + " has an ongoing legal case and cannot be collected. Remove this customer or rebuild the draft list.")
        if history["previous"].get(it.customer):
            frappe.throw("Customer " + it.customer + " was assigned yesterday. Remove this customer and assign another, or rebuild the draft list.")
        if any(owner != doc.collector for owner in history["reserved"].get(it.customer, [])):
            frappe.throw("Customer " + it.customer + " is already assigned to another collector for this day.")


def validate_collection_company():
    if not CFG["collections_company"] or not frappe.db.exists("Company", CFG["collections_company"]):
        frappe.throw("Collection Company not found: " + str(CFG["collections_company"])
                     + ". Set collections_company to the exact Company name in both SOA API and Collections Daily Build scripts.")


def build_collections(day, only_missing):
    validate_collection_company()
    # one list per collector for "day": their salespeople's customers with a balance older than collect_after_days
    amap = assignments()
    built = []
    if not amap:
        return built
    cmap = customer_map()
    every = list(cmap.keys())
    opn = open_by_customer(every, day)
    last = last_updates(every)
    caps = collector_limits()
    history = collection_queue_history(day)
    names = {}
    for u in frappe.get_all("User", filters={"name": ["in", list(amap.keys())]}, fields=["name", "full_name"]):
        names[u.name] = u.full_name or u.name
    for col in amap:
        if not amap[col]:
            continue
        ex = frappe.db.get_value("Collection List", {"list_date": day, "collector": col}, ["name", "status"], as_dict=True)
        if ex and (ex.status != "Draft" or only_missing):
            continue
        items = collection_candidates(col, day, cmap, opn, last, amap, history)
        cap = U.cint(caps.get(col))
        skipped = 0
        if cap and len(items) > cap:
            skipped = len(items) - cap
            items = items[:cap]
        if ex:
            doc = frappe.get_doc("Collection List", ex.name)
            doc.set("items", [])
        else:
            doc = frappe.get_doc({"doctype": "Collection List", "list_date": day, "collector": col, "status": "Draft"})
        doc.collector_name = names.get(col) or col
        for it in items:
            doc.append("items", it)
            if it["customer"] not in history["reserved"]:
                history["reserved"][it["customer"]] = []
            history["reserved"][it["customer"]].append(col)
        doc.customers = len(items)
        doc.skipped = skipped
        tot = 0.0
        for x in items:
            tot = tot + x["due_amount"]
        doc.total_due = U.flt(tot, 2)
        doc.total_collected = 0
        if ex:
            doc.save(ignore_permissions=True)
        else:
            doc.insert(ignore_permissions=True)
        built.append(doc.name)
    return built
# ------------------------------------------------------------------ COLLECTIONS CORE END


def list_dict(doc, with_items):
    out = {"name": doc.name, "list_date": str(doc.list_date), "collector": doc.collector, "collector_name": doc.collector_name, "status": doc.status,
           "approved_by": doc.approved_by, "approved_on": str(doc.approved_on or ""), "customers": U.cint(doc.customers),
           "total_due": U.flt(doc.total_due), "total_collected": U.flt(doc.total_collected),
           "skipped": U.cint(doc.get("skipped"))}
    if with_items:
        items = []
        done = 0
        for it in (doc.get("items") or []):
            if it.result or it.note:
                done = done + 1
            items.append({"name": it.name, "customer": it.customer, "customer_name": it.customer_name, "sales_person": it.sales_person, "phone": it.phone,
                          "due_amount": U.flt(it.due_amount), "total_outstanding": U.flt(it.total_outstanding), "oldest_date": str(it.oldest_date or ""),
                          "invoices": json.loads(it.invoice_details or "[]"), "last_update": it.last_update or "", "removed": U.cint(it.removed),
                          "result": it.result or "", "collected_amount": U.flt(it.collected_amount), "payment_mode": it.payment_mode or "",
                          "promise_date": str(it.promise_date or ""), "note": it.note or "", "updated_on": str(it.updated_on or "")})
        out["items"] = items
        out["done"] = done
    return out


def recount(doc):
    tot = 0.0
    due = 0.0
    n = 0
    for it in (doc.get("items") or []):
        if U.cint(it.removed):
            continue
        n = n + 1
        due = due + U.flt(it.due_amount)
        tot = tot + U.flt(it.collected_amount)
    doc.customers = n
    doc.total_due = U.flt(due, 2)
    doc.total_collected = U.flt(tot, 2)


def daily_visit_document(doc):
    # One managed print document per source list; repeat downloads reuse it.
    # Lock the source list so concurrent clicks cannot create duplicate documents.
    frappe.db.sql("select name from `tabCollection List` where name = %(n)s for update", {"n": doc.name})
    meta = frappe.get_meta(CFG["visit_doctype"])
    table = meta.get_field(CFG["visit_table"])
    if not table or table.fieldtype != "Table" or table.options != CFG["visit_child_doctype"]:
        frappe.throw("Check visit_doctype, visit_child_doctype and visit_table in the SOA API configuration.")
    rows = []
    customers = [it.customer for it in (doc.get("items") or []) if not U.cint(it.removed)]
    balances = open_by_customer(customers, str(doc.list_date))
    for it in (doc.get("items") or []):
        if U.cint(it.removed):
            continue
        row = {"name_of_company": it.customer, "age_60": 0.0, "age_90": 0.0, "age_120": 0.0,
               "age_150": 0.0, "age_151": 0.0, "balance": 0.0}
        vouchers = []
        for v in json.loads(it.invoice_details or "[]"):
            if v.get("type") != "Sales Invoice" or v.get("voucher") in vouchers:
                continue
            invoice = frappe.db.get_value("Sales Invoice", {"name": v.get("voucher"), "customer": it.customer,
                                              "company": CFG["collections_company"], "docstatus": 1},
                                              ["name", "posting_date"], as_dict=True)
            if not invoice:
                continue
            days = U.date_diff(str(doc.list_date), str(invoice.posting_date))
            if days < 0:
                continue
            vouchers.append(invoice.name)
        if not vouchers:
            continue
        # The Link accepts a single Sales Person; for shared assignments use the
        # first assigned salesperson actually present on the approved invoices.
        people = invoice_salespeople(vouchers)
        selected = str(it.sales_person or "").split(", ")
        salesman = ""
        for voucher in vouchers:
            for sp in (people.get(voucher) or []):
                if not salesman and sp in selected:
                    salesman = sp
        if not salesman and it.sales_person and frappe.db.exists("Sales Person", it.sales_person):
            salesman = it.sales_person
        # Age all still-open assigned invoices as of the visit date, including
        # recent balances, rather than only the 60+ day invoices used to qualify.
        for balance in (balances.get(it.customer) or []):
            owners = balance.get("salespeople") or selected
            if not any(sp in selected for sp in owners):
                continue
            days = U.date_diff(str(doc.list_date), balance["d"])
            if days < 0:
                continue
            bucket = "age_151"
            if days <= 60:
                bucket = "age_60"
            elif days <= 90:
                bucket = "age_90"
            elif days <= 120:
                bucket = "age_120"
            elif days <= 150:
                bucket = "age_150"
            row[bucket] = row[bucket] + balance["o"]
        if sum([row[key] for key in ["age_60", "age_90", "age_120", "age_150", "age_151"]]) <= U.flt(CFG["tolerance"]):
            continue
        row["salesman"] = salesman
        for bucket in ["age_60", "age_90", "age_120", "age_150", "age_151"]:
            row[bucket] = U.flt(row[bucket], 2)
            row["balance"] = row["balance"] + row[bucket]
        row["balance"] = U.flt(row["balance"], 2)
        row["expected_date"] = it.promise_date or None
        row["visit_time"] = str(U.get_time(it.updated_on)) if it.updated_on else None
        row["remarks"] = str(it.note or "")[:140]
        rows.append(row)
    if not rows:
        frappe.throw("No eligible Sales Invoices for " + CFG["collections_company"] + " on this list. Rebuild draft lists if needed.")
    name = str(doc.list_date) + "-SOA-" + doc.name
    exists = frappe.db.exists(CFG["visit_doctype"], name)
    target = frappe.get_doc(CFG["visit_doctype"], name) if exists else frappe.get_doc({"doctype": CFG["visit_doctype"]})
    if U.cint(target.docstatus):
        frappe.throw("The generated Daily Visit Collection is submitted or cancelled. It must remain a draft for dashboard updates.")
    target.set(CFG["visit_table"], [])
    for row in rows:
        target.append(CFG["visit_table"], row)
    if exists:
        target.save(ignore_permissions=True)
    else:
        target.insert(ignore_permissions=True, set_name=name)
    return target


def used_today_by_type(u):
    counts = {}
    for dt in ALL_TYPES:
        counts[dt] = 0
    today = U.nowdate()
    tomorrow = U.add_days(today, 1)
    for row in frappe.get_all("SOA Request", filters=[["requested_by", "=", u], ["creation", ">=", today],
                              ["creation", "<", tomorrow], ["status", "!=", "Failed"]],
                              fields=["document_type"], limit_page_length=0):
        if row.document_type in counts:
            counts[row.document_type] = counts[row.document_type] + 1
    return counts


def used_today(u, document_type=None):
    counts = used_today_by_type(u)
    return counts.get(document_type, 0) if document_type else sum(counts.values())


def need_manager():
    if not c["manager"]:
        frappe.throw("A configured manager role (SOA Manager / Credit / Accounts Manager / System Manager) is required.")


def notify(to, subject, name):
    try:
        frappe.get_doc({"doctype": "Notification Log", "for_user": to, "type": "Alert", "document_type": "Collection List",
                        "document_name": name, "subject": subject}).insert(ignore_permissions=True)
    except Exception:
        pass



def notify_azrah(doctype, name, kind):
    recipient = 'sales.wp2@dmgroupksa.com'
    if not frappe.db.exists('User', {'name':recipient, 'enabled':1}):
        frappe.throw('The configured approval recipient is not an enabled user: ' + recipient)
    subject = 'Approval needed: ' + str(kind)
    if not frappe.db.exists('Notification Log', {'for_user':recipient, 'document_type':doctype, 'document_name':name, 'subject':subject}):
        frappe.get_doc({'doctype':'Notification Log','for_user':recipient,'type':'Alert',
            'document_type':doctype,'document_name':name,'subject':subject}).insert(ignore_permissions=True)

# ------------------------------------------------------------------ actions
args = frappe.form_dict
action = args.get("action") or "bootstrap"
user = frappe.session.user
c = {"user": user, "sps": my_sales_persons(user), "manager": is_manager(user), "collector": is_collector(user) if action.startswith("coll_") else False}
res = {}

if action == "bootstrap":
    missing = []
    for dt_ in CFG["print_formats"]:
        for b in CFG["print_formats"][dt_]:
            pf = CFG["print_formats"][dt_][b]
            if pf not in missing and not frappe.db.exists("Print Format", pf):
                missing.append(pf)
    res = {"user": user, "full_name": frappe.db.get_value("User", user, "full_name"), "is_manager": c["manager"], "sales_persons": c["sps"],
           "doc_types": ALL_TYPES, "is_collector": c["collector"], "daily_limit": 0 if c["manager"] else CFG["daily_limit"],
           "used_today": used_today(user), "used_today_by_type": used_today_by_type(user), "finance_email": CFG["finance_email"], "brands": CFG["brands"], "tolerance": CFG["tolerance"], "missing_letterheads": missing, "today": U.nowdate(),
           "customers": customers_for(c)}

elif action == "preview":
    cust = args.get("customer")
    if not cust or not can_use_customer(c, cust):
        frappe.throw("ERPNext permissions do not allow access to this customer or their Sales Invoices.")
    dt = args.get("document_type") or DOC_TYPES[0]
    ft = dates_for(dt, args.get("from_date"), args.get("to_date"))
    f = ft["f"]
    t = ft["t"]
    if not f:
        f = soa_from(cust, t)
    expected = gl_balance(cust, t)
    res = {"check": compare(expected, ar_outstanding(cust, t), True), "from_date": f, "to_date": t}

elif action == "create":
    cust = args.get("customer")
    dt = args.get("document_type")
    if dt not in ALL_TYPES:
        frappe.throw("Choose a document type.")
    # Serialize requests by this user so simultaneous tabs cannot exceed the quota.
    frappe.db.sql("select name from `tabUser` where name = %(u)s for update", {"u": user})
    if not c["manager"] and U.cint(CFG["daily_limit"]) > 0 and used_today(user, dt) >= U.cint(CFG["daily_limit"]):
        frappe.throw("You have used your " + str(CFG["daily_limit"]) + " " + dt + " requests for today. You can request this type again tomorrow.")
    if not cust or not can_use_customer(c, cust):
        frappe.throw("ERPNext permissions do not allow access to this customer or their Sales Invoices.")
    if dt == OUTSTANDING:
        args["from_date"] = args.get("to_date") or U.nowdate()
    ft = dates_for(dt, args.get("from_date"), args.get("to_date"))
    f = ft["f"]
    t = ft["t"]
    if not f:
        f = soa_from(cust, t) if dt != OUTSTANDING else t
    if not f or not t or str(f) > str(t):
        frappe.throw("Choose a valid date range.")
    req = frappe.get_doc({"doctype": "SOA Request", "customer": cust, "customer_name": frappe.db.get_value("Customer", cust, "customer_name"),
                          "document_type": dt, "from_date": f, "to_date": t, "status": "Processing", "requested_by": user,
                          "sales_person": ", ".join(c["sps"]), "request_note": (args.get("note") or "")[:500]})
    req.insert()
    if dt == OUTSTANDING:
        outstanding_request(req)
        req.status = "Needs Review"
    else:
        chk = run_request(req, False)
        if req.status != "Failed" and chk:
            req.status = "Needs Review"      # every request is checked by Azrah before the salesperson gets it
    req.save(ignore_permissions=True)
    if req.status == "Needs Review":
        notify_azrah("SOA Request", req.name, "Customer Balance Confirmation" if dt == OUTSTANDING else dt)
    res = req_dict(req, [], False, False)
    res["used_today_by_type"] = used_today_by_type(user)

elif action == "list":
    filters = {}
    if (args.get("scope") or "mine") == "all":
        if not c["manager"]:
            frappe.throw("Not permitted")
        if args.get("status"):
            filters["status"] = args.get("status")
    else:
        filters["requested_by"] = user
    rows = frappe.get_list("SOA Request", filters=filters, fields=["*"], order_by="creation desc", limit_page_length=U.cint(args.get("limit") or 300))
    fb = files_of([r.name for r in rows]) if c["manager"] else {}
    out = []
    for r in rows:
        visible = c["manager"] or r.status in ["Sent", "Approved"]
        # no downloads for salespeople: approved files are emailed to them (finance in copy)
        out.append(req_dict(r, fb.get(r.name, []) if c["manager"] else [], c["manager"] and r.status in ["Needs Review", "Failed"], visible))
    res = {"requests": out}

elif action == "manager_file":
    if not c["manager"]:
        frappe.throw("A configured SOA manager role is required.")
    req = frappe.get_doc("SOA Request",args.get("name"))
    file_id = None
    for row in (req.get("files") or []):
        if row.file_url == args.get("file") or row.file_id == args.get("file"):
            file_id = row.file_id
    if not file_id:
        frappe.throw("This attachment does not belong to the request.")
    file = frappe.get_doc("File",file_id)
    if file.attached_to_doctype != "SOA Request" or file.attached_to_name != req.name:
        frappe.throw("This attachment does not belong to the request.")
    frappe.response["filename"] = file.file_name
    frappe.response["filecontent"] = file.get_content()
    frappe.response["type"] = "download"
    frappe.response["display_content_as"] = "inline"
    res = None

elif action == "manager_preview":
    if not c["manager"]:
        frappe.throw("A configured SOA manager role is required.")
    frappe.db.sql("select name from `tabSOA Request` where name=%(name)s for update", {"name":args.get("name")})
    req = frappe.get_doc("SOA Request", args.get("name"))
    if req.status not in ["Needs Review", "Failed"]:
        frappe.throw("This request is no longer waiting for review.")
    if req.document_type == OUTSTANDING:
        balance_confirmation_pdf(req)
    elif not req.files:
        run_request(req, True)
    req.save(ignore_permissions=True)
    res = {"files":files_of([req.name]).get(req.name, [])}

elif action == "review":
    if not c["manager"]:
        frappe.throw("A configured manager role (SOA Manager / Credit / Accounts Manager / System Manager) is required to review requests.")
    frappe.db.sql("select name from `tabSOA Request` where name=%(name)s for update", {"name":args.get("name")})
    req = frappe.get_doc("SOA Request", args.get("name"))
    op = args.get("op")
    note = (args.get("note") or "")[:500]
    if op == "approve":
        if req.status not in ["Needs Review", "Failed", "Rejected"]:
            frappe.throw("This request is already " + req.status)
        if req.document_type == OUTSTANDING:
            if req.status == "Failed" or not req.review_details:
                outstanding_request(req)
        elif not req.files:
            run_request(req, True)
        if req.files or req.document_type == OUTSTANDING:
            req.reviewed_by = user
            req.reviewed_on = U.now_datetime()
            req.review_note = note
            send_to_salesperson(req, "manual")
    elif op == "reject":
        if not note:
            frappe.throw("Write a reason so the salesperson knows what to fix.")
        req.status = "Rejected"
        req.reviewed_by = user
        req.reviewed_on = U.now_datetime()
        req.review_note = note
        if req.cts:
            set_cts_state(req.cts, "Rejected")
        try:
            frappe.get_doc({"doctype": "Notification Log", "for_user": req.requested_by, "type": "Alert", "document_type": "SOA Request",
                            "document_name": req.name, "subject": "Statement request rejected: " + (req.customer_name or req.customer) + " - " + note}).insert(ignore_permissions=True)
        except Exception:
            pass
    elif op == "recheck":
        req.status = "Processing"
        if req.document_type == OUTSTANDING:
            outstanding_request(req)
            req.status = "Needs Review"
        else:
            chk = run_request(req, True)
            if req.status != "Failed" and chk:
                req.status = "Needs Review"
    else:
        frappe.throw("Unknown review action")
    req.save(ignore_permissions=True)
    res = req_dict(req, files_of([req.name]).get(req.name, []), True)

elif action == "files":
    if not c["manager"]:
        frappe.throw("Not permitted")
    reqs = {}
    for q in frappe.get_list("SOA Request", filters={"status": ["in", ["Sent", "Approved"]]},
                            fields=["name", "customer", "customer_name", "document_type", "requested_by", "sent_on", "status", "from_date", "to_date"],
                            order_by="sent_on desc", limit_page_length=1000):
        reqs[q.name] = q
    out = []
    if reqs:
        fb = files_of(list(reqs.keys()))
        for nm in reqs:
            q = reqs[nm]
            for f in (fb.get(nm) or []):
                out.append({"request": nm, "brand": f["brand"], "letter_head": f["letter_head"], "file_url": f["file_url"], "file_name": f["file_name"],
                            "amount": f["amount"], "rows": f["rows"], "customer": q.customer, "customer_name": q.customer_name,
                            "document_type": q.document_type, "requested_by": q.requested_by, "sent_on": str(q.sent_on or ""), "status": q.status,
                            "from_date": str(q.from_date or ""), "to_date": str(q.to_date or "")})
    res = {"files": out}

elif action == "coll_admin":
    need_manager()
    emps = []
    for e in frappe.get_all("Employee", filters={"status": "Active"}, fields=["name", "employee_name", "user_id", "designation", "department"],
                            order_by="employee_name asc", limit_page_length=0):
        emps.append({"employee": e.name, "name": e.employee_name, "user": e.user_id or "", "designation": e.designation or "", "department": e.department or ""})
    people = collection_salesperson_options(U.nowdate())
    res = {"collectors": collector_users(), "assignments": assignments(), "customer_field": cust_sp_field(), "employees": emps,
           "sales_persons": sorted(people.keys(), key=lambda sp: (not (people[sp]["left"] and people[sp]["pending_invoices"]), sp)),
           "sales_person_details": people,
           "collect_after_days": CFG["collect_after_days"]}

elif action == "coll_collectors":
    # Azrah adds / removes a collector (an Employee with a User ID)
    need_manager()
    emp = frappe.db.get_value("Employee", args.get("employee"), ["name", "employee_name", "user_id"], as_dict=True)
    if not emp:
        frappe.throw("Employee not found.")
    if args.get("op") == "remove":
        for n in frappe.get_all("Collection Assignment", filters={"employee": emp.name}, pluck="name"):
            frappe.delete_doc("Collection Assignment", n, ignore_permissions=True)
    else:
        if not emp.user_id:
            frappe.throw(emp.employee_name + " has no User ID on the Employee form, so they cannot log in to see their list. Set it first.")
        if not frappe.db.exists("Collection Assignment", {"collector": emp.user_id}):
            frappe.get_doc({"doctype": "Collection Assignment", "collector": emp.user_id, "collector_name": emp.employee_name,
                            "employee": emp.name, "sales_person": ""}).insert(ignore_permissions=True)
    res = {"collectors": collector_users(), "assignments": assignments()}

elif action == "coll_assign":
    need_manager()
    col = args.get("collector")
    sps = json.loads(args.get("sales_persons") or "[]")
    who = None
    for x in collector_users():
        if x["user"] == col:
            who = x
    if not who:
        frappe.throw("Add this employee as a collector first.")
    for n in frappe.get_all("Collection Assignment", filters={"collector": col}, pluck="name"):
        frappe.delete_doc("Collection Assignment", n, ignore_permissions=True)
    cap = U.cint(args.get("max_customers")) if args.get("max_customers") not in [None, ""] else who["max_customers"]
    rows = sps or [""]      # keep one empty row so the collector stays on the list
    for sp in rows:
        frappe.get_doc({"doctype": "Collection Assignment", "collector": col, "collector_name": who["full_name"], "employee": who["employee"],
                        "sales_person": sp, "max_customers": cap}).insert(ignore_permissions=True)
    res = {"assignments": assignments(), "collectors": collector_users()}

elif action == "coll_lists":
    need_manager()
    day = str(args.get("date") or U.nowdate())[:10]
    if day == U.nowdate() and not frappe.db.exists("Collection List", {"list_date": day}):
        build_collections(day, True)     # safety net if the 7:00 scheduled build did not run
    out = []
    for n in frappe.get_all("Collection List", filters={"list_date": day}, pluck="name", order_by="collector_name asc"):
        out.append(list_dict(frappe.get_doc("Collection List", n), True))
    days = frappe.db.sql("select list_date, count(*), sum(total_due), sum(total_collected) from `tabCollection List` group by list_date order by list_date desc limit 14")
    res = {"date": day, "today": U.nowdate(), "lists": out,
           "history": [{"date": str(d[0]), "lists": U.cint(d[1]), "due": U.flt(d[2]), "collected": U.flt(d[3])} for d in days]}

elif action == "coll_diagnostics":
    need_manager()
    day = U.nowdate()
    co = CFG["collections_company"]
    valid_company = bool(frappe.db.exists("Company", co))
    report = []
    if valid_company:
        amap = assignments()
        cmap = customer_map()
        opn = open_by_customer(list(cmap.keys()), day)
        for col in amap:
            customers = [k for k in cmap if cmap[k]["sp"] in amap[col]]
            eligible = collection_candidates(col, day, cmap, opn, {}, amap)
            saved = frappe.db.get_value("Collection List", {"list_date": day, "collector": col}, ["name", "status", "customers"], as_dict=True)
            report.append({"collector": col, "assigned_salespeople": amap[col], "assigned_customers": len(customers),
                           "customers_with_open_invoices": len([k for k in customers if opn.get(k)]),
                           "eligible_overdue_customers": len(eligible), "existing_list": saved})
    res = {"company": co, "company_exists": valid_company, "date": day, "collect_after_days": CFG["collect_after_days"],
           "invoice_salesperson_source": sp_field() or "Sales Team", "customer_salesperson_field": cust_sp_field(),
           "collectors": report}

elif action == "coll_build":
    need_manager()
    day = U.nowdate()
    built = build_collections(day, False)
    res = {"built": built}

elif action in ["coll_candidates", "coll_replace"]:
    need_manager()
    frappe.db.sql("select name from `tabCollection List` where name = %(n)s for update", {"n": args.get("list")})
    doc = frappe.get_doc("Collection List", args.get("list"))
    if doc.status != "Draft":
        frappe.throw("Only draft lists can be changed.")
    removed = None
    for it in (doc.get("items") or []):
        if it.name == args.get("item") and U.cint(it.removed):
            removed = it
    if not removed:
        frappe.throw("Remove a customer first, then assign another.")
    existing = [it.customer for it in (doc.get("items") or [])]
    candidates = [it for it in collection_candidates(doc.collector, str(doc.list_date)) if it["customer"] not in existing]
    if action == "coll_candidates":
        res = {"customers": [{"customer": it["customer"], "customer_name": it["customer_name"], "due_amount": it["due_amount"]} for it in candidates]}
    else:
        replacement = None
        for it in candidates:
            if it["customer"] == args.get("customer"):
                replacement = it
        if not replacement:
            frappe.throw("This customer is no longer eligible. Choose another customer.")
        # Reuse the removed slot: one replacement per removal, without exceeding the daily maximum.
        removed.update(replacement)
        removed.result = ""
        removed.collected_amount = 0
        removed.payment_mode = ""
        removed.promise_date = None
        removed.note = ""
        removed.updated_on = None
        recount(doc)
        doc.save(ignore_permissions=True)
        res = list_dict(doc, True)

elif action == "coll_pdf":
    doc = frappe.get_doc("Collection List", args.get("list"))
    if not c["manager"] and (not c["collector"] or doc.collector != user or doc.status not in ["Approved", "Closed"]):
        frappe.throw("You can only download your own approved collection lists.")
    target = daily_visit_document(doc)
    pdf = frappe.get_print(CFG["visit_doctype"], target.name, print_format="Standard", as_pdf=True,
                           no_letterhead=0, letterhead=CFG["visit_letterhead"] or None, pdf_options={"orientation": "Landscape"})
    frappe.response["filename"] = "Daily_Visit_Collection_" + str(doc.list_date) + ".pdf"
    frappe.response["filecontent"] = pdf
    frappe.response["type"] = "pdf"
    res = None

elif action == "coll_item":
    need_manager()
    doc = frappe.get_doc("Collection List", args.get("list"))
    if doc.status != "Draft":
        frappe.throw("This list is already approved.")
    for it in (doc.get("items") or []):
        if it.name == args.get("item"):
            if not U.cint(args.get("removed")):
                validate_collection_turn(doc, it.customer)
            it.removed = 1 if U.cint(args.get("removed")) else 0
    recount(doc)
    doc.save(ignore_permissions=True)
    res = list_dict(doc, True)

elif action == "coll_approve":
    need_manager()
    names = json.loads(args.get("lists") or "[]")
    out = []
    for n in names:
        doc = frappe.get_doc("Collection List", n)
        if doc.status == "Draft":
            validate_collection_turn(doc)
            recount(doc)
            doc.status = "Approved"
            doc.approved_by = user
            doc.approved_on = U.now_datetime()
            doc.save(ignore_permissions=True)
            notify(doc.collector, "Collection list for " + U.formatdate(doc.list_date) + ": " + str(doc.customers) + " customers, "
                   + U.fmt_money(doc.total_due) + " SAR", doc.name)
        out.append(list_dict(doc, True))
    res = {"lists": out}

elif action == "coll_my":
    if not c["collector"] and not c["manager"]:
        frappe.throw("You are not on the collectors list. Ask Azrah to add you in SOA Manager > Collections.")
    day = str(args.get("date") or U.nowdate())[:10]
    who = args.get("collector") if (c["manager"] and args.get("collector")) else user
    n = frappe.db.get_value("Collection List", {"list_date": day, "collector": who, "status": ["in", ["Approved", "Closed"]]}, "name")
    pending = frappe.db.exists("Collection List", {"list_date": day, "collector": who, "status": "Draft"})
    recent = frappe.get_all("Collection List", filters={"collector": who, "status": ["in", ["Approved", "Closed"]]},
                            fields=["name", "list_date", "customers", "total_due", "total_collected"], order_by="list_date desc", limit_page_length=10)
    res = {"date": day, "today": U.nowdate(), "full_name": frappe.db.get_value("User", who, "full_name"), "pending": bool(pending),
           "collect_after_days": CFG["collect_after_days"],
           "list": list_dict(frappe.get_doc("Collection List", n), True) if n else None,
           "recent": [{"name": r.name, "date": str(r.list_date), "customers": U.cint(r.customers), "due": U.flt(r.total_due), "collected": U.flt(r.total_collected)} for r in recent]}

elif action == "coll_remark":
    frappe.db.sql("select name from `tabCollection List` where name = %(n)s for update", {"n": args.get("list")})
    doc = frappe.get_doc("Collection List", args.get("list"))
    if doc.collector != user and not c["manager"]:
        frappe.throw("This is not your list.")
    if doc.status != "Approved":
        frappe.throw("This list is not open for updates.")
    if str(doc.list_date) < U.add_days(U.nowdate(), -2):
        frappe.throw("Lists can only be updated for 3 days.")
    note = str(args.get("note") or "").strip()
    if len(note) > 140:
        frappe.throw("Remarks must be 140 characters or fewer to fit the Daily Visit Collection Remarks field.")
    found = None
    for it in (doc.get("items") or []):
        if it.name == args.get("item") and not U.cint(it.removed):
            found = it
    if not found:
        frappe.throw("Customer not on this list.")
    found.note = note
    found.updated_on = U.now_datetime()
    doc.save(ignore_permissions=True)
    res = list_dict(doc, True)

elif action == "coll_log":
    doc = frappe.get_doc("Collection List", args.get("list"))
    if doc.collector != user and not c["manager"]:
        frappe.throw("This is not your list.")
    if doc.status != "Approved":
        frappe.throw("This list is not open for updates.")
    if str(doc.list_date) < U.add_days(U.nowdate(), -2):
        frappe.throw("Lists can only be updated for 3 days.")
    result = args.get("result") or ""
    if result not in ["", "Collected", "Part collected", "Promised", "Not reachable", "Refused"]:
        frappe.throw("Choose a result.")
    amt = U.flt(args.get("collected_amount"))
    if result in ["Collected", "Part collected"] and amt <= 0:
        frappe.throw("Enter the amount collected.")
    if result == "Promised" and not args.get("promise_date"):
        frappe.throw("Enter the date the customer promised to pay.")
    found = None
    for it in (doc.get("items") or []):
        if it.name == args.get("item"):
            found = it
    if not found or U.cint(found.removed):
        frappe.throw("Customer not on this list.")
    found.result = result
    found.collected_amount = amt if result in ["Collected", "Part collected"] else 0
    found.payment_mode = (args.get("payment_mode") or "") if result in ["Collected", "Part collected"] else ""
    found.promise_date = args.get("promise_date") if result == "Promised" else None
    found.note = (args.get("note") or "")[:500]
    found.updated_on = U.now_datetime()
    recount(doc)
    doc.save(ignore_permissions=True)
    res = list_dict(doc, True)

elif action == "setup":
    # one-time: /api/method/soa_api?action=setup   (Administrator / System Manager). Safe to run again.
    myroles = frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role")
    if user != "Administrator" and "System Manager" not in myroles:
        frappe.throw("Run this as Administrator or a System Manager.")
    log = []
    dtd = frappe.get_doc("DocType", "SOA Request")
    for f in dtd.fields:
        if f.fieldname == "document_type" and OUTSTANDING not in (f.options or ""):
            f.options = (f.options or "").strip() + "\n" + OUTSTANDING
            dtd.save(ignore_permissions=True)
            log.append("SOA Request: document option " + OUTSTANDING + " added")
    defs = [
        ["Collection Assignment", {"autoname": "hash", "title_field": "collector_name"}, [
            {"fieldname": "employee", "label": "Employee", "fieldtype": "Link", "options": "Employee", "in_standard_filter": 1},
            {"fieldname": "collector", "label": "Collector (User)", "fieldtype": "Link", "options": "User", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "collector_name", "label": "Collector Name", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "sales_person", "label": "Sales Person", "fieldtype": "Link", "options": "Sales Person", "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "max_customers", "label": "Max Customers per Day (0 = no limit)", "fieldtype": "Int"}]],
        ["Collection List Item", {"istable": 1}, [
            {"fieldname": "customer", "label": "Customer", "fieldtype": "Link", "options": "Customer", "in_list_view": 1, "columns": 2},
            {"fieldname": "customer_name", "label": "Customer Name", "fieldtype": "Data"},
            {"fieldname": "sales_person", "label": "Sales Person", "fieldtype": "Data", "in_list_view": 1, "columns": 1},
            {"fieldname": "phone", "label": "Phone", "fieldtype": "Data"},
            {"fieldname": "due_amount", "label": "To Collect (60+ days)", "fieldtype": "Currency", "in_list_view": 1, "columns": 2},
            {"fieldname": "total_outstanding", "label": "Total Outstanding", "fieldtype": "Currency"},
            {"fieldname": "oldest_date", "label": "Oldest Invoice", "fieldtype": "Date"},
            {"fieldname": "invoice_details", "label": "Invoices (JSON)", "fieldtype": "Long Text", "hidden": 1},
            {"fieldname": "last_update", "label": "Last Update", "fieldtype": "Small Text"},
            {"fieldname": "removed", "label": "Removed by Azrah", "fieldtype": "Check"},
            {"fieldname": "result", "label": "Result", "fieldtype": "Select", "options": "\nCollected\nPart collected\nPromised\nNot reachable\nRefused", "in_list_view": 1, "columns": 1},
            {"fieldname": "collected_amount", "label": "Collected", "fieldtype": "Currency", "in_list_view": 1, "columns": 2},
            {"fieldname": "payment_mode", "label": "Payment Mode", "fieldtype": "Data"},
            {"fieldname": "promise_date", "label": "Promise Date", "fieldtype": "Date"},
            {"fieldname": "note", "label": "Note", "fieldtype": "Small Text"},
            {"fieldname": "updated_on", "label": "Updated On", "fieldtype": "Datetime"}]],
        ["Collection List", {"autoname": "format:COL-{#####}", "title_field": "collector_name", "sort_field": "list_date", "sort_order": "DESC", "track_changes": 1}, [
            {"fieldname": "list_date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "collector", "label": "Collector", "fieldtype": "Link", "options": "User", "reqd": 1, "in_standard_filter": 1},
            {"fieldname": "collector_name", "label": "Collector Name", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "Draft\nApproved\nClosed", "default": "Draft", "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "cb1", "fieldtype": "Column Break"},
            {"fieldname": "customers", "label": "Customers", "fieldtype": "Int"},
            {"fieldname": "skipped", "label": "Over the daily maximum (not on the list)", "fieldtype": "Int"},
            {"fieldname": "total_due", "label": "To Collect", "fieldtype": "Currency", "in_list_view": 1},
            {"fieldname": "total_collected", "label": "Collected", "fieldtype": "Currency", "in_list_view": 1},
            {"fieldname": "approved_by", "label": "Approved By", "fieldtype": "Link", "options": "User"},
            {"fieldname": "approved_on", "label": "Approved On", "fieldtype": "Datetime"},
            {"fieldname": "sb1", "fieldtype": "Section Break"},
            {"fieldname": "items", "label": "Customers", "fieldtype": "Table", "options": "Collection List Item"}]],
    ]
    for d in defs:
        if frappe.db.exists("DocType", d[0]):
            # repair a DocType made by an earlier version: add missing fields, drop "mandatory" where it changed
            dtx = frappe.get_doc("DocType", d[0])
            want = {}
            for f in d[2]:
                want[f["fieldname"]] = f
            have = []
            changed = []
            for f in dtx.fields:
                have.append(f.fieldname)
                w = want.get(f.fieldname)
                if w and U.cint(f.reqd) != U.cint(w.get("reqd")):
                    f.reqd = U.cint(w.get("reqd"))
                    changed.append(f.fieldname + " mandatory=" + str(f.reqd))
            for f in d[2]:
                if f["fieldname"] not in have:
                    dtx.append("fields", f)
                    changed.append("+" + f["fieldname"])
            if changed:
                dtx.save(ignore_permissions=True)
                log.append("DocType " + d[0] + " repaired: " + ", ".join(changed))
            else:
                log.append("DocType " + d[0] + " already complete")
            continue
        doc = {"doctype": "DocType", "name": d[0], "module": "Selling", "custom": 1, "fields": d[2]}
        doc.update(d[1])
        frappe.get_doc(doc).insert(ignore_permissions=True)
        log.append("DocType " + d[0] + " created")
    log.append("Manage DocType access in ERPNext Role Permission Manager; existing permissions were preserved.")
    log.append("Customer field used for the sales person: " + (cust_sp_field() or "none found - invoices are used"))
    frappe.db.commit()
    log.append("done - now add the collectors and their salespeople in SOA Manager > Collections")
    res = log

elif action == "setup_letterheads":
    # one-time: open  /api/method/soa_api?action=setup_letterheads  as Administrator / System Manager
    myroles = frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role")
    if user != "Administrator" and "System Manager" not in myroles:
        frappe.throw("Run this as Administrator or a System Manager.")
    heads = CFG["letter_head_files"]
    log = []
    for nm in heads:
        vals = {"source": "Image", "image": heads[nm], "image_width": CFG["letter_head_width"], "image_height": 0, "align": "Center", "disabled": 0}
        if frappe.db.exists("Letter Head", nm):
            d = frappe.get_doc("Letter Head", nm)
            d.update(vals)
            d.save(ignore_permissions=True)
            log.append(nm + " updated")
        else:
            vals["doctype"] = "Letter Head"
            vals["letter_head_name"] = nm
            vals["is_default"] = 0
            d = frappe.get_doc(vals)
            d.insert(ignore_permissions=True)
            log.append(nm + " created")
        log.append("  header HTML: " + (str(d.content or "EMPTY"))[:140].replace("\n", " "))
        fu = heads[nm].replace("%20", " ")
        if frappe.db.exists("File", {"file_url": fu}):
            log.append("  file " + fu + " found")
        else:
            log.append("  file " + fu + " NOT found in the File list - check the name or upload it again")
    frappe.db.commit()
    res = log

elif action == "find_image":
    # /api/method/soa_api?action=find_image&key=dm group of com copy    (Administrator / System Manager)
    myroles = frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role")
    if user != "Administrator" and "System Manager" not in myroles:
        frappe.throw("Run this as Administrator or a System Manager.")
    key = (args.get("key") or "dm group of com copy").replace("%20", " ")
    pat = "%" + key.replace(" ", "%") + "%"
    found = []
    for t in [["Company", "company_logo"], ["Print Format", "html"], ["Print Format", "css"], ["Print Style", "css"], ["Letter Head", "content"],
              ["Letter Head", "footer"], ["Letter Head", "image"], ["Letter Head", "footer_image"], ["Customer", "image"], ["Brand", "image"],
              ["Item", "image"], ["Employee", "image"], ["Custom HTML Block", "html"], ["Custom HTML Block", "style"], ["Web Page", "main_section"]]:
        try:
            for r in frappe.db.sql("select name from `tab" + t[0] + "` where `" + t[1] + "` like %(k)s limit 10", {"k": pat}):
                found.append(t[0] + " '" + str(r[0]) + "' field " + t[1])
        except Exception:
            pass
    for r in frappe.db.sql("select doctype, field from `tabSingles` where value like %(k)s limit 20", {"k": pat}):
        found.append("Single " + str(r[0]) + " field " + str(r[1]))
    for r in frappe.db.sql("select name, file_url, is_private, attached_to_doctype, attached_to_name from `tabFile` where file_url like %(k)s limit 10", {"k": pat}):
        found.append("File '" + str(r[0]) + "' " + str(r[1]) + " private=" + str(r[2]) + " attached to " + str(r[3]) + " " + str(r[4]))
    for r in frappe.db.sql("select name, html from `tabPrint Format` where name in %(n)s", {"n": tuple(["Outstanding SOA", "Customer Ledger Report", "SOA - NAJD", "SOA - DMCC", "Ledger - Najd"])}):
        h = str(r[1] or "")
        k = h.find("<img")
        found.append("Print format '" + str(r[0]) + "' first image tag: " + (h[k:k + 220].replace("\n", " ") if k >= 0 else "none") + " | letterhead in HTML: " + str("letter_head" in h or "letterhead" in h))
    res = {"searched_for": key, "found": found or ["nothing found"]}

else:
    frappe.throw("Unknown action")

if res is not None:
    frappe.response["message"] = res
