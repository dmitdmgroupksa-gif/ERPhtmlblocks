# Graphic Design Studio API. Server Script: Script Type = API, API Method = design_studio_api.
# Frappe v14 sandbox: no imports, no +=, no del, no attributes starting with "_", no str.format.
# Every call is POST action=<name> data=<JSON>. frappe.get_all is not permission-checked, so every action
# checks the caller itself. Setup: 10. Communication & Productivity/Graphic Design Studio/README.md

API_VERSION = "1"
SETTINGS = "Design Studio Settings"
USER = frappe.session.user


# ---------------------------------------------------------------- helpers

def require(condition, message):
    if not condition:
        frappe.throw(message, frappe.PermissionError)


def fail(message):
    frappe.throw(message)


def settings_value(field):
    return frappe.db.get_single_value(SETTINGS, field)


def settings_users(table):
    doc = frappe.get_doc(SETTINGS)
    return [r.user for r in (doc.get(table) or []) if r.user]


def has_role(user, role):
    return bool(frappe.db.exists("Has Role", {"parent": user, "parenttype": "User", "role": role}))


def is_admin(user):
    return user == "Administrator" or has_role(user, "System Manager")


def is_designer(user):
    designer = settings_value("designer")
    return bool(designer) and designer == user


def require_designer():
    require(is_designer(USER), "Only the designer can do this.")


def enabled_user(user):
    return bool(user) and bool(frappe.db.exists("User", {"name": user, "enabled": 1}))


def brand_names():
    return frappe.get_all("Design Brand", fields=["name"], order_by="sort_order asc", pluck="name")


def employee_of(user):
    rows = frappe.get_all("Employee", filters={"user_id": user, "status": "Active"},
                          fields=["name", "employee_name", "designation", "department", "company_email", "cell_number"],
                          limit_page_length=1)
    return rows[0] if rows else None


def allowed_brands(user, employee):
    if is_designer(user):
        return brand_names()
    if not employee:
        return []
    doc = frappe.get_doc("Employee", employee["name"])
    chosen = [r.brand for r in (doc.get("custom_design_brands") or []) if r.brand]
    if not chosen:
        chosen = [settings_value("default_brand") or "DM Group"]
    return [b for b in brand_names() if b in chosen]


# ---------------------------------------------------------------- bootstrap and access

def bootstrap(data):
    designer = is_designer(USER)
    admin = is_admin(USER)
    designer_set = bool(settings_value("designer"))
    employee = employee_of(USER)
    roles = {"designer": designer, "admin": admin, "issuer": USER in settings_users("certificate_issuers"),
             "operator": USER in settings_users("card_operators")}
    if designer:
        tabs = ["overview", "requests", "brands", "library", "employees", "access"]
    elif admin and not designer_set:
        tabs = ["brands", "access"]
    else:
        tabs = ["brands", "library"]
    brands = frappe.get_all("Design Brand", fields=["name", "sort_order"], order_by="sort_order asc")
    return {"user": USER, "full_name": frappe.get_fullname(USER), "employee": employee, "roles": roles, "tabs": tabs,
            "allowed_brands": allowed_brands(USER, employee), "brands": brands, "designer_set": designer_set,
            "today": frappe.utils.nowdate(), "api_version": API_VERSION}


def can_manage_access():
    return is_designer(USER) or (is_admin(USER) and not settings_value("designer"))


def access_get(data):
    require(can_manage_access(), "Only the designer can manage access.")
    doc = frappe.get_doc(SETTINGS)
    pack = lambda table: [{"user": r.user, "full_name": r.full_name} for r in (doc.get(table) or [])]
    candidates = frappe.get_all("Employee", filters={"status": "Active", "user_id": ["is", "set"]},
                                fields=["user_id", "employee_name", "department"], order_by="employee_name asc")
    return {"designer": doc.designer, "certificate_issuers": pack("certificate_issuers"), "card_operators": pack("card_operators"),
            "candidates": [{"user": c["user_id"], "full_name": c["employee_name"], "department": c["department"]} for c in candidates]}


def access_set(data):
    require(can_manage_access(), "Only the designer can manage access.")
    doc = frappe.get_doc(SETTINGS)
    changes = []
    if data.get("designer"):
        require(not doc.designer or is_designer(USER), "Only the current designer can hand the role over.")
        if not enabled_user(data.get("designer")):
            fail(str(data.get("designer")) + " is not an enabled user.")
        doc.designer = data.get("designer")
        changes.append("designer")
    for table in ("certificate_issuers", "card_operators"):
        if table in data:
            require(is_designer(USER) or not doc.designer or data.get("designer") == USER, "Only the designer can manage access.")
            rows = []
            for user in data.get(table) or []:
                if not enabled_user(user):
                    fail(str(user) + " is not an enabled user.")
                if user not in [r["user"] for r in rows]:
                    rows.append({"user": user, "full_name": frappe.get_fullname(user)})
            doc.set(table, rows)
            changes.append(table)
    doc.save(ignore_permissions=True)
    doc.add_comment("Comment", "Access changed by " + frappe.get_fullname(USER) + ": " + ", ".join(changes))
    return access_get({}) if can_manage_access() else {"ok": True}


ACTIONS = {
    "bootstrap": bootstrap,
    "access_get": access_get,
    "access_set": access_set,
}

action = frappe.form_dict.get("action")
data = json.loads(frappe.form_dict.get("data") or "{}")
if action not in ACTIONS:
    frappe.throw("Unknown action: " + str(action))
frappe.response["message"] = ACTIONS[action](data)
