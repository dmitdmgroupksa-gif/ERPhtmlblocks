# Graphic Design Studio API. Server Script: Script Type = API, API Method = design_studio_api.
# Frappe v14 sandbox: no imports, no +=, no del, no attributes starting with "_", no str.format.
# Every call is POST action=<name> data=<JSON>. frappe.get_all is not permission-checked, so every action
# checks the caller itself. Setup: 10. Communication & Productivity/Graphic Design Studio/README.md

ACTIONS = {}

action = frappe.form_dict.get("action")
data = json.loads(frappe.form_dict.get("data") or "{}")
if action not in ACTIONS:
    frappe.throw("Unknown action: " + str(action))
frappe.response["message"] = ACTIONS[action](data)
