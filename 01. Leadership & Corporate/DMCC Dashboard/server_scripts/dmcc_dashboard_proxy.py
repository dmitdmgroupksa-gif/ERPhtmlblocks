# Server Script API method: dmcc_dashboard_proxy. Requires DMCC Integration Settings.
# Keep the external key exclusively in the Password field on that Single DocType.
user = frappe.session.user
if user == "Guest":
    frappe.throw("Authentication required")
roles = [r.role for r in frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, fields=["role"])]
if user != "Administrator" and not any(r in roles for r in ["System Manager", "Accounts Manager", "CEO"]):
    frappe.throw("DMCC dashboard access denied")
entity = frappe.form_dict.get("entity") or ""
allowed = ["Invoice", "Project", "Quotation", "RFQ", "PurchaseOrder", "DeliveryNote", "ReturnNote", "ManpowerTimesheet", "Manpower", "PurchasePO", "PurchaseInvoice", "Equipment", "Customer", "Salesperson", "RentalAdjustment"]
if entity not in allowed:
    frappe.throw("Invalid DMCC entity")
skip = frappe.utils.cint(frappe.form_dict.get("skip") or 0)
if skip < 0 or skip > 100000:
    frappe.throw("DMCC scope limit exceeded")
settings = frappe.get_doc("DMCC Integration Settings")
if not settings.enabled:
    frappe.throw("DMCC integration is not configured")
key = settings.get_password("api_key")
if not key:
    frappe.throw("DMCC server credential is not configured")
try:
    payload = frappe.make_get_request("https://dmccerp.base44.app/functions/erpDataApi?entity=" + entity + "&limit=500&skip=" + str(skip), headers={"x-api-key": key})
except Exception:
    # Do not leak upstream request headers or response bodies to the browser.
    frappe.throw("DMCC upstream request failed")
if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
    frappe.throw("Invalid DMCC upstream response")
total = frappe.utils.cint(payload.get("total"))
rows = payload.get("data")
if total < 0 or len(rows) > 500:
    frappe.throw("Invalid DMCC pagination response")
frappe.response["message"] = {"data": rows, "count": len(rows), "total": total, "source": "External DMCC Base44 integration"}
