# CEO Command Center - Collections > Legal / Taradhi (STATIC reference data).
# Fixed reference copied from Journal Entry JV-DM-2026-39728. NOT live outstanding
# balances: never refreshed from invoices, payments or the ledger, and never added to
# Collections receipts, outstanding or achievement calculations.
# Classification: each entry is "legal", "taradhi" or "" (pending). Entries are shown
# only in the tab they are classified for; pending entries are not shown in either tab.
# 2026-10-24: all 14 entries confirmed by the CEO as Legal. No Taradhi entries confirmed yet.
# Access: returned only when the user can read the reference Journal Entry and the
# reference company (standard role permissions + user permissions apply).
REF_DOC = "JV-DM-2026-39728"
REF_COMPANY = "Durar Masagh Trading Company"
ROWS = [
    ["Saudi Arabian Baytur Construction Co. (MISK)", 585095.61, "legal"],
    ["Saudi Arabian Baytur Construction Co. (KAUST)", 148605.88, "legal"],
    ["Yaris General Contracting Company", 193563.91, "legal"],
    ["Sarh Al-Mostaqble Trading Company", 276525.00, "legal"],
    ["Riyadh Meadows Agricultural Corporation", 17748.40, "legal"],
    ["Overseas Construction Company Pvt. Ltd. (OCC)", 11070.50, "legal"],
    ["Condor Arabia Contracting Est.", 20142.50, "legal"],
    ["AUR Wire Steel Factory", 219563.11, "legal"],
    ["Arabian Varieties Trading Company", 471408.00, "legal"],
    ["Alfen Construction Company", 100000.00, "legal"],
    ["Shapoorji Pallonji Mideast LLC (NIC Water Reservoir)", 19692.72, "legal"],
    ["Shapoorji Pallonji Mideast LLC (SEC PROJECT)", 20040.55, "legal"],
    ["Shapoorji Pallonji Mideast LLC (Salwa PROJECT)", 20700.00, "legal"],
    ["Saudi Arabian Oil Company (Saudi Aramco)", 43715.93, "legal"]
]

company = frappe.form_dict.get("company") or ""
category = frappe.form_dict.get("category") or ""
if category not in ["legal", "taradhi"]:
    frappe.throw("Invalid category.")
out = {"view": "legal_taradhi", "category": category, "reference": REF_DOC,
       "reference_company": REF_COMPANY, "selected_company": company, "available": 0,
       "reason": "", "rows": [], "count": 0, "total": 0.0, "currency": "",
       "dataset_count": len(ROWS), "pending_count": 0}

comp = frappe.get_list("Company", filters=[["name", "=", REF_COMPANY]],
                       fields=["name", "default_currency"], limit_page_length=1)
ref = frappe.get_list("Journal Entry", filters=[["name", "=", REF_DOC]],
                      fields=["name", "company", "docstatus", "posting_date"], limit_page_length=1)

if not comp or not ref:
    out["reason"] = "no_access"
elif company != REF_COMPANY:
    out["reason"] = "other_company"
else:
    total = 0.0
    rows = []
    pending = 0
    for r in ROWS:
        if not r[2]:
            pending = pending + 1
        elif r[2] == category:
            rows.append({"label": r[0], "amount": r[1]})
            total = total + r[1]
    out["available"] = 1
    out["rows"] = rows
    out["count"] = len(rows)
    out["total"] = frappe.utils.flt(total, 2)
    out["pending_count"] = pending
    out["currency"] = comp[0].default_currency
    out["reference_docstatus"] = ref[0].docstatus
    out["reference_posting_date"] = str(ref[0].posting_date)

frappe.response["message"] = out
