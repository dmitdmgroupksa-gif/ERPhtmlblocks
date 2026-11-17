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


# ---------------------------------------------------------------- brands

ASSET_TYPES = ["Logo", "Background", "Print", "Social post", "Signage", "Vehicle branding", "Presentation", "Photo",
               "Packaging", "Font", "Other"]
BRAND_FIELDS = ["erp_company", "website", "phone", "fax", "address_en", "address_ar", "aramco_vid", "sabic_vid",
                "logo_primary", "logo_dark", "logo_mono", "usage_notes"]


def check_brands(names):
    known = brand_names()
    for b in names or []:
        if b not in known:
            fail("Unknown brand: " + str(b))
    return [b for b in known if b in (names or [])]


def published_asset(name):
    if not name:
        return None
    row = frappe.db.get_value("Design Asset", name, ["name", "title", "file", "thumbnail", "status"], as_dict=True)
    if not row or row.get("status") != "Published":
        return None
    return {"name": row.get("name"), "title": row.get("title"), "file": row.get("file"), "thumbnail": row.get("thumbnail")}


def brands_list(data):
    out = []
    for name in brand_names():
        b = frappe.get_doc("Design Brand", name)
        fonts = []
        for f in b.get("fonts") or []:
            asset = published_asset(f.font_file)
            fonts.append({"family": f.family, "weight": f.weight, "script": f.script, "file": asset.get("file") if asset else None,
                          "licence": f.licence, "licence_expiry": f.licence_expiry})
        out.append({"name": name, "website": b.website, "phone": b.phone, "fax": b.fax, "address_en": b.address_en,
                    "address_ar": b.address_ar, "aramco_vid": b.aramco_vid, "sabic_vid": b.sabic_vid, "erp_company": b.erp_company,
                    "logos": {"primary": published_asset(b.logo_primary), "dark": published_asset(b.logo_dark), "mono": published_asset(b.logo_mono)},
                    "logo_names": {"primary": b.logo_primary, "dark": b.logo_dark, "mono": b.logo_mono} if is_designer(USER) else {},
                    "colours": [{"colour_name": c.colour_name, "hex": c.hex, "rgb": c.rgb, "cmyk": c.cmyk, "role": c.role} for c in (b.get("colours") or [])],
                    "fonts": fonts, "usage_notes": b.usage_notes})
    return out


def brand_save(data):
    require_designer()
    name = data.get("name")
    if name not in brand_names():
        fail("Unknown brand: " + str(name))
    b = frappe.get_doc("Design Brand", name)
    for field in BRAND_FIELDS:
        if field in data:
            value = data.get(field)
            if field.startswith("logo_") and value and not frappe.db.exists("Design Asset", value):
                fail("Unknown asset: " + str(value))
            b.set(field, value)
    if "colours" in data:
        b.set("colours", [{"colour_name": c.get("colour_name"), "hex": c.get("hex"), "rgb": c.get("rgb"), "cmyk": c.get("cmyk"),
                           "role": c.get("role")} for c in data.get("colours") or []])
    if "fonts" in data:
        b.set("fonts", [{"family": f.get("family"), "weight": f.get("weight"), "script": f.get("script"), "font_file": f.get("font_file"),
                         "licence": f.get("licence"), "licence_expiry": f.get("licence_expiry")} for f in data.get("fonts") or []])
    b.save(ignore_permissions=True)
    return {"name": name}


# ---------------------------------------------------------------- library

ASSET_FIELDS = ["name", "title", "asset_type", "tags", "status", "version", "previous_version", "file", "source_link", "thumbnail",
                "preview", "formats", "licence_expiry", "download_count", "description", "modified"]


def asset_brand_map(names=None):
    filters = {"parenttype": "Design Asset"}
    if names is not None:
        filters["parent"] = ["in", names or ["-"]]
    out = {}
    for r in frappe.get_all("Design Asset Brand", filters=filters, fields=["parent", "brand"], order_by="idx asc"):
        out.setdefault(r["parent"], []).append(r["brand"])
    return out


def assets_list(data):
    filters = {}
    if is_designer(USER):
        if data.get("status"):
            filters["status"] = data.get("status")
    else:
        filters["status"] = "Published"
    if data.get("asset_type"):
        filters["asset_type"] = data.get("asset_type")
    if data.get("tag"):
        filters["tags"] = ["like", "%" + data.get("tag") + "%"]
    rows = frappe.get_all("Design Asset", filters=filters, fields=ASSET_FIELDS, order_by="modified desc")
    brands = asset_brand_map()
    q = (data.get("q") or "").strip().lower()
    out = []
    for r in rows:
        r["brands"] = brands.get(r["name"], [])
        if data.get("brand") and data.get("brand") not in r["brands"]:
            continue
        if q and q not in ((r.get("title") or "") + " " + (r.get("tags") or "")).lower():
            continue
        out.append(r)
    start = int(data.get("start") or 0)
    limit = int(data.get("limit") or 48)
    return {"rows": out[start:start + limit], "total": len(out)}


def asset_files(asset, private):
    # Saving the File (not db.set_value) makes Frappe move it between /private/files and /files;
    # the asset keeps pointing at wherever the file now lives.
    for field in ("file", "thumbnail", "preview"):
        url = asset.get(field)
        if not url:
            continue
        found = frappe.get_all("File", filters={"file_url": url, "attached_to_doctype": "Design Asset", "attached_to_name": asset.name},
                               fields=["name"], limit_page_length=1)
        if not found:
            continue
        f = frappe.get_doc("File", found[0]["name"])
        if bool(f.is_private) != private:
            f.is_private = 1 if private else 0
            f.save(ignore_permissions=True)
        asset.set(field, f.file_url)


def asset_doc(name):
    if not name or not frappe.db.exists("Design Asset", name):
        fail("Asset not found.")
    return frappe.get_doc("Design Asset", name)


def asset_save(data):
    require_designer()
    title = (data.get("title") or "").strip()
    if not title:
        fail("Title is required.")
    if data.get("asset_type") not in ASSET_TYPES:
        fail("Choose an asset type.")
    brands = check_brands(data.get("brands") or [])
    doc = asset_doc(data.get("name")) if data.get("name") else frappe.get_doc({"doctype": "Design Asset", "status": "Draft", "version": 1})
    doc.title = title
    doc.asset_type = data.get("asset_type")
    doc.set("brands", [{"brand": b} for b in brands])
    for field in ("tags", "file", "source_link", "thumbnail", "preview", "formats", "licence_expiry", "description"):
        if field in data:
            doc.set(field, data.get(field))
    if doc.name:
        if doc.status == "Published":
            asset_files(doc, False)
        doc.save(ignore_permissions=True)
    else:
        doc.insert(ignore_permissions=True)
    return {"name": doc.name}


def archive(doc):
    doc.status = "Archived"
    asset_files(doc, True)
    doc.save(ignore_permissions=True)


def asset_publish(data):
    require_designer()
    doc = asset_doc(data.get("name"))
    if not doc.file and not doc.source_link:
        fail("Add a file or a source link before publishing.")
    doc.status = "Published"
    asset_files(doc, False)
    doc.save(ignore_permissions=True)
    previous = doc.previous_version
    if previous and frappe.db.get_value("Design Asset", previous, "status") == "Published":
        archive(asset_doc(previous))
    return {"name": doc.name, "file": doc.file}


def asset_archive(data):
    require_designer()
    doc = asset_doc(data.get("name"))
    archive(doc)
    return {"name": doc.name}


def asset_new_version(data):
    require_designer()
    old = asset_doc(data.get("name"))
    new = frappe.get_doc({"doctype": "Design Asset", "title": old.title, "asset_type": old.asset_type, "tags": old.tags,
                          "source_link": old.source_link, "formats": old.formats, "description": old.description,
                          "licence_expiry": old.licence_expiry, "status": "Draft", "version": (old.version or 1) + 1,
                          "previous_version": old.name, "brands": [{"brand": r.brand} for r in (old.get("brands") or [])]})
    new.insert(ignore_permissions=True)
    return {"name": new.name}


def asset_hit(data):
    name = data.get("name")
    require(bool(name) and frappe.db.get_value("Design Asset", name, "status") == "Published", "This asset is not published.")
    count = frappe.db.get_value("Design Asset", name, "download_count") or 0
    frappe.db.set_value("Design Asset", name, "download_count", count + 1)
    return {"ok": True}


# ---------------------------------------------------------------- employees

GAP_ORDER = ["no_user", "no_email", "no_mobile", "no_name_ar", "no_designation_ar"]


def employee_brand_map():
    out = {}
    for r in frappe.get_all("Employee Allowed Brand", filters={"parenttype": "Employee"}, fields=["parent", "brand"], order_by="idx asc"):
        out.setdefault(r["parent"], []).append(r["brand"])
    return out


def employees_list(data):
    require_designer()
    rows = frappe.get_all("Employee", filters={"status": "Active"},
                          fields=["name", "employee_name", "designation", "department", "custom_job_location", "user_id", "company_email",
                                  "cell_number", "custom_signature_brand", "custom_name_ar", "custom_name_ar_verified"],
                          order_by="employee_name asc")
    designations = {}
    for d in frappe.get_all("Designation", fields=["name", "custom_designation_ar", "custom_designation_ar_verified"]):
        designations[d["name"]] = d
    brands = employee_brand_map()
    order = brand_names()
    q = (data.get("q") or "").strip().lower()
    out = []
    for r in rows:
        des = designations.get(r.get("designation")) or {}
        allowed = [b for b in order if b in brands.get(r["name"], [])]
        gaps = []
        if not r.get("user_id"):
            gaps.append("no_user")
        if not r.get("company_email"):
            gaps.append("no_email")
        if not r.get("cell_number"):
            gaps.append("no_mobile")
        if not (r.get("custom_name_ar") and r.get("custom_name_ar_verified")):
            gaps.append("no_name_ar")
        if not (des.get("custom_designation_ar") and des.get("custom_designation_ar_verified")):
            gaps.append("no_designation_ar")
        item = {"employee": r["name"], "employee_name": r.get("employee_name"), "designation": r.get("designation"),
                "department": r.get("department"), "location": r.get("custom_job_location"), "user_id": r.get("user_id"),
                "company_email": r.get("company_email"), "cell_number": r.get("cell_number"), "allowed_brands": allowed,
                "signature_brand": r.get("custom_signature_brand"), "name_ar": r.get("custom_name_ar"),
                "name_ar_verified": 1 if r.get("custom_name_ar_verified") else 0, "designation_ar": des.get("custom_designation_ar"),
                "designation_ar_verified": 1 if des.get("custom_designation_ar_verified") else 0, "gaps": gaps}
        text = " ".join([item["employee_name"] or "", item["designation"] or "", item["department"] or "", item["location"] or "", r["name"]]).lower()
        if q and q not in text:
            continue
        if data.get("brand") and data.get("brand") not in allowed:
            continue
        if data.get("gap") and data.get("gap") not in gaps:
            continue
        out.append(item)
    return out


def employees_set_brands(data):
    require_designer()
    mode = data.get("mode")
    if mode not in ("add", "replace", "remove"):
        fail("mode must be add, replace or remove.")
    chosen = check_brands(data.get("brands") or [])
    order = brand_names()
    updated = 0
    failed = []
    for emp in data.get("employees") or []:
        try:
            doc = frappe.get_doc("Employee", emp)
            current = [r.brand for r in (doc.get("custom_design_brands") or [])]
            if mode == "add":
                new = current + [b for b in chosen if b not in current]
            elif mode == "remove":
                new = [b for b in current if b not in chosen]
            else:
                new = [b for b in order if b in chosen]
            doc.set("custom_design_brands", [{"brand": b} for b in new])
            if doc.custom_signature_brand and doc.custom_signature_brand not in new:
                doc.custom_signature_brand = None
            doc.save(ignore_permissions=True)
            updated = updated + 1
        except Exception as e:
            failed.append({"employee": emp, "error": str(e)})
    return {"updated": updated, "failed": failed}


def arabic_save(data):
    require_designer()
    if data.get("employee"):
        if not frappe.db.exists("Employee", data.get("employee")):
            fail("Employee not found.")
        name_ar = (data.get("name_ar") or "").strip()
        frappe.db.set_value("Employee", data.get("employee"), {"custom_name_ar": name_ar or None, "custom_name_ar_verified": 1 if name_ar else 0})
    if data.get("designation"):
        if not frappe.db.exists("Designation", data.get("designation")):
            fail("Designation not found.")
        des_ar = (data.get("designation_ar") or "").strip()
        frappe.db.set_value("Designation", data.get("designation"), {"custom_designation_ar": des_ar or None,
                                                                       "custom_designation_ar_verified": 1 if des_ar else 0})
    return {"ok": True}


# ---------------------------------------------------------------- requests: shared

REQUEST_TYPES = ["Flyer", "Banner", "Social post", "Signage", "Presentation", "Printed business cards", "Other"]
PRIORITIES = ["Low", "Normal", "High", "Urgent"]
REQUEST_FIELDS = ["name", "title", "request_type", "brand", "needed_by", "priority", "status", "designer_note", "delivered_on",
                  "modified", "creation", "requested_by", "employee", "employee_name", "notified", "notify_error", "change_note"]


def esc(value):
    return frappe.utils.escape_html(value or "")


def user_email(user):
    return frappe.db.get_value("User", user, "email") if user else None


def send_mail(recipients, subject, english, arabic, name):
    # english / arabic are lists of already-escaped HTML paragraphs. Raises if ERP cannot queue the email.
    link = frappe.utils.get_url_to_form("Design Request", name)
    body = "<div>" + "".join(["<p>" + p + "</p>" for p in english]) + "</div>"
    body = body + "<div dir=\"rtl\" lang=\"ar\">" + "".join(["<p>" + p + "</p>" for p in arabic]) + "</div>"
    body = body + "<p><a href=\"" + esc(link) + "\">" + esc(name) + "</a></p>"
    frappe.sendmail(recipients=recipients, subject=subject, message=body, reference_doctype="Design Request", reference_name=name)


def notify_designer(subject, english, arabic, name):
    # Best effort: a request must never fail because the designer could not be emailed.
    email = user_email(settings_value("designer"))
    if not email:
        return
    try:
        send_mail([email], subject, english, arabic, name)
    except Exception:
        frappe.log_error("Design Studio: designer email failed for " + name)


def request_doc(name):
    if not name or not frappe.db.exists("Design Request", name):
        fail("Request not found.")
    return frappe.get_doc("Design Request", name)


def require_requester(doc):
    require(doc.requested_by == USER, "This is not your request.")


def require_requester_or_designer(doc):
    require(doc.requested_by == USER or is_designer(USER), "This is not your request.")


def file_rows(doc):
    return [{"kind": f.kind, "file": f.file, "note": f.note, "added_on": f.added_on} for f in (doc.get("files") or [])]


def request_row(doc_or_row, files):
    out = {}
    for field in REQUEST_FIELDS:
        out[field] = doc_or_row.get(field)
    out["files"] = files
    return out


def timeline(name):
    rows = frappe.get_all("Comment", filters={"reference_doctype": "Design Request", "reference_name": name, "comment_type": "Comment"},
                          fields=["owner", "creation", "content"], order_by="creation asc")
    return [{"by": frappe.get_fullname(r["owner"]), "at": r["creation"], "text": r["content"]} for r in rows]


def clean_text(value, label, low, high):
    text = (value or "").strip()
    if len(text) < low or len(text) > high:
        fail(label + " must be " + str(low) + " to " + str(high) + " characters.")
    return text


# ---------------------------------------------------------------- requests: requester side

def request_submit(data):
    employee = employee_of(USER)
    if not employee:
        fail("Design requests need an ERP user linked to your employee record. Ask HR.")
    allowed = allowed_brands(USER, employee)
    brand = data.get("brand") or (allowed[0] if len(allowed) == 1 else None)
    if brand not in allowed:
        fail("Choose one of your brands.")
    title = clean_text(data.get("title"), "Title", 3, 140)
    brief = clean_text(data.get("brief"), "The brief", 10, 4000)
    if data.get("request_type") not in REQUEST_TYPES:
        fail("Choose a request type.")
    priority = data.get("priority") or "Normal"
    if priority not in PRIORITIES:
        fail("Choose a priority.")
    needed_by = data.get("needed_by") or None
    if needed_by and str(frappe.utils.getdate(needed_by)) < frappe.utils.nowdate():
        fail("The needed-by date cannot be in the past.")
    doc = frappe.get_doc({"doctype": "Design Request", "title": title, "request_type": data.get("request_type"), "brand": brand,
                          "needed_by": needed_by, "priority": priority, "brief": brief, "requested_by": USER,
                          "employee": employee["name"], "employee_name": employee["employee_name"], "status": "Submitted"})
    doc.insert(ignore_permissions=True)
    if settings_value("notify_designer_on_new"):
        notify_designer("New design request " + doc.name + ": " + title,
                        [esc(employee["employee_name"]) + " asked for a " + esc(data.get("request_type")).lower() + " (" + esc(brand) + ", " + esc(priority) + ").",
                         "<b>" + esc(title) + "</b>", esc(brief).replace("\n", "<br>"), "Needed by: " + esc(needed_by or "not set")],
                        ["طلب تصميم جديد من " + esc(employee["employee_name"]) + ".", "<b>" + esc(title) + "</b>"], doc.name)
    return {"name": doc.name}


def my_requests(data):
    filters = {"requested_by": USER}
    if data.get("status"):
        filters["status"] = data.get("status")
    out = []
    for r in frappe.get_all("Design Request", filters=filters, fields=["name"], order_by="creation desc"):
        doc = frappe.get_doc("Design Request", r["name"])
        out.append(request_row(doc, file_rows(doc)))
    return out


def request_get(data):
    doc = request_doc(data.get("name"))
    require_requester_or_designer(doc)
    row = request_row(doc, file_rows(doc))
    row["brief"] = doc.brief
    row["timeline"] = timeline(doc.name)
    return row


def request_attach(data):
    doc = request_doc(data.get("name"))
    kind = data.get("kind")
    if kind not in ("Reference", "Delivery"):
        fail("Choose Reference or Delivery.")
    if is_designer(USER):
        pass
    else:
        require_requester(doc)
        require(kind == "Reference", "Only the designer can add finished files.")
        if doc.status not in ("Submitted", "Needs info", "In progress"):
            fail("Files can only be added before the design is delivered.")
    url = data.get("file_url")
    if not url or not frappe.db.exists("File", {"file_url": url, "attached_to_doctype": "Design Request", "attached_to_name": doc.name}):
        fail("That file is not attached to this request.")
    doc.append("files", {"kind": kind, "file": url, "note": (data.get("note") or "").strip()[:140], "added_by": USER,
                         "added_on": frappe.utils.now()})
    doc.save(ignore_permissions=True)
    return {"files": file_rows(doc)}


def request_cancel(data):
    doc = request_doc(data.get("name"))
    require_requester(doc)
    if doc.status != "Submitted":
        fail("Only a Submitted request can be cancelled.")
    doc.status = "Cancelled"
    doc.save(ignore_permissions=True)
    return {"status": doc.status}


def request_reply(data):
    doc = request_doc(data.get("name"))
    require_requester(doc)
    if doc.status != "Needs info":
        fail("You can reply only when the designer marked the request Needs info.")
    text = clean_text(data.get("text"), "Your reply", 1, 2000)
    doc.status = "Submitted"
    doc.save(ignore_permissions=True)
    doc.add_comment("Comment", text)
    notify_designer("Reply on " + doc.name + ": " + doc.title, [esc(doc.employee_name) + " replied:", esc(text).replace("\n", "<br>")],
                    ["رد من " + esc(doc.employee_name) + "."], doc.name)
    return {"status": doc.status}


def request_changes(data):
    doc = request_doc(data.get("name"))
    require_requester(doc)
    if doc.status != "Delivered":
        fail("Changes can be requested only after the design is delivered.")
    note = (data.get("note") or "").strip()
    if not note:
        fail("Add a note saying what should change.")
    doc.status = "Submitted"
    doc.change_note = note[:2000]
    doc.save(ignore_permissions=True)
    doc.add_comment("Comment", "Changes requested: " + note)
    notify_designer("Changes requested on " + doc.name + ": " + doc.title,
                    [esc(doc.employee_name) + " asked for changes:", esc(note).replace("\n", "<br>")],
                    ["طلب تعديل من " + esc(doc.employee_name) + "."], doc.name)
    return {"status": doc.status}


ACTIONS = {
    "request_submit": request_submit,
    "my_requests": my_requests,
    "request_get": request_get,
    "request_attach": request_attach,
    "request_cancel": request_cancel,
    "request_reply": request_reply,
    "request_changes": request_changes,
    "bootstrap": bootstrap,
    "access_get": access_get,
    "access_set": access_set,
    "brands_list": brands_list,
    "brand_save": brand_save,
    "assets_list": assets_list,
    "asset_save": asset_save,
    "asset_publish": asset_publish,
    "asset_archive": asset_archive,
    "asset_new_version": asset_new_version,
    "asset_hit": asset_hit,
    "employees_list": employees_list,
    "employees_set_brands": employees_set_brands,
    "arabic_save": arabic_save,
}

action = frappe.form_dict.get("action")
data = json.loads(frappe.form_dict.get("data") or "{}")
if action not in ACTIONS:
    frappe.throw("Unknown action: " + str(action))
frappe.response["message"] = ACTIONS[action](data)
