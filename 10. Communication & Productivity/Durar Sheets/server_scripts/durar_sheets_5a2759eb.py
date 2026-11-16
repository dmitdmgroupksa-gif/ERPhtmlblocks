# Durar Sheets storage. Server Script: Script Type=API, API Method=durar_sheets, Allow Guest=off.
# Keeps the workbooks of the "Durar Sheets" Custom HTML Block in ERPNext: one "Durar Spreadsheet"
# per workbook, every save as a numbered "Durar Spreadsheet Change", the latest snapshot and the
# saved versions in "Durar Spreadsheet Version", and who has a workbook open in
# "Durar Spreadsheet Presence". Frappe v14 sandbox only: no imports, read-only SQL.
# Setup: integrations/frappe/spreadsheet/README.md

# Who can use Durar Sheets: users holding one of these roles (System Managers always can). Frappe lets
# only the Administrator give a custom DocType to a broad role like All or Desk User, so the workbook
# DocType grants access to "Durar Sheets User", which you assign to the people who should have it.
ROLES = ["Durar Sheets User", "System Manager"]
# Characters. The block gzips snapshots above 100 KB, so 40 MB holds several hundred thousand rows.
MAX_SNAPSHOT = 40000000
MAX_OPS = 20000000
# Change rows kept below the latest snapshot: the activity log and slow clients read them.
KEEP_CHANGES = 400
TRIM_BATCH = 80
KEEP_AUTO_VERSIONS = 40
MAX_PULL = 400
MAX_OPEN = 5000
PRESENCE_SECONDS = 40

DOCTYPE = "Durar Spreadsheet"
CHANGE = "Durar Spreadsheet Change"
VERSION = "Durar Spreadsheet Version"
PRESENCE = "Durar Spreadsheet Presence"
NAMES = {}


def cint(value):
    return frappe.utils.cint(value)


def clean(value, limit):
    return str(value or "").strip()[:limit]


def stamp(value):
    # Whole seconds: every browser parses "YYYY-MM-DD HH:MM:SS".
    return str(value or "")[:19]


def full_name(user):
    if not user:
        return ""
    if user not in NAMES:
        NAMES[user] = frappe.get_fullname(user) or user
    return NAMES[user]


def safe_session(value):
    out = ""
    for ch in str(value or "")[:40]:
        if ch.isalnum() or ch in "-_":
            out = out + ch
    return out


def has_share(name, user):
    # Shared with this user, or with everyone.
    if frappe.get_all("DocShare", filters={"share_doctype": DOCTYPE, "share_name": name, "user": user}, limit_page_length=1):
        return True
    return bool(frappe.get_all("DocShare", filters={"share_doctype": DOCTYPE, "share_name": name, "everyone": 1}, limit_page_length=1))


def allowed_user():
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("Sign in to use Durar Sheets", frappe.PermissionError)
    if user == "Administrator":
        return user
    if frappe.db.get_value("User", user, "user_type") != "System User":
        frappe.throw("Durar Sheets is available to ERP users", frappe.PermissionError)
    found = frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User", "role": ["in", ROLES]}, limit_page_length=1)
    if not found:
        frappe.throw("Ask your administrator to give you the 'Durar Sheets User' role", frappe.PermissionError)
    return user


def load(name, permission):
    name = clean(name, 140)
    if not name or not frappe.db.exists(DOCTYPE, name):
        frappe.throw("This workbook no longer exists", frappe.DoesNotExistError)
    doc = frappe.get_doc(DOCTYPE, name)
    if not doc.has_permission(permission):
        frappe.throw("You don't have access to this workbook", frappe.PermissionError)
    # Inside Durar Sheets everyone, System Managers included, sees only their own workbooks and the
    # ones shared with them. System Managers still see every record in the DocType lists in Desk.
    user = frappe.session.user
    if doc.owner != user and not has_share(name, user):
        frappe.throw("You don't have access to this workbook", frappe.PermissionError)
    return doc


def check_snapshot(snapshot):
    if not isinstance(snapshot, str) or not snapshot:
        frappe.throw("The workbook snapshot is missing")
    if len(snapshot) > MAX_SNAPSHOT:
        frappe.throw("This workbook is too large to save in ERPNext")
    if not (snapshot.startswith("gz:") or snapshot.startswith("{")):
        frappe.throw("The workbook snapshot is unreadable")
    return snapshot


def parse_json(text, empty):
    try:
        return json.loads(text) if text else empty
    except Exception:
        return empty


# ---------- presence: who has the workbook open, and where they are ----------

def touch(doc, data, user):
    if "presence" not in data:
        return
    session = safe_session(data.get("session"))
    if not session:
        return
    values = {"spreadsheet": doc.name, "user": user, "info": json.dumps(data.get("presence"))[:4000], "seen": frappe.utils.now()}
    try:
        if frappe.db.exists(PRESENCE, session):
            frappe.db.set_value(PRESENCE, session, values, update_modified=False)
        else:
            row = {"doctype": PRESENCE, "session": session}
            row.update(values)
            frappe.get_doc(row).insert(ignore_permissions=True)
    except Exception:
        # A second request from the same tab inserted the row first; presence is best effort.
        pass


def others(doc, data):
    session = safe_session(data.get("session"))
    cutoff = frappe.utils.add_to_date(frappe.utils.now_datetime(), seconds=-PRESENCE_SECONDS)
    rows = frappe.get_all(PRESENCE, filters={"spreadsheet": doc.name, "seen": [">", cutoff]}, fields=["session", "user", "info"], limit_page_length=50)
    out = []
    for row in rows:
        if row.get("session") == session:
            continue
        out.append({"session": row.get("session"), "user": row.get("user"), "name": full_name(row.get("user")), "info": parse_json(row.get("info"), None)})
    return out


def sweep_presence():
    cutoff = frappe.utils.add_to_date(frappe.utils.now_datetime(), days=-1)
    for name in frappe.get_all(PRESENCE, filters={"seen": ["<", cutoff]}, pluck="name", limit_page_length=20):
        frappe.delete_doc(PRESENCE, name, ignore_permissions=True, delete_permanently=True)


# ---------- snapshots, versions and changes ----------

def new_version(sheet, kind, label, revision, snapshot, user):
    row = frappe.get_doc({"doctype": VERSION, "spreadsheet": sheet, "kind": kind, "label": label, "revision": revision, "data": snapshot, "size": len(snapshot), "user": user})
    row.insert(ignore_permissions=True)
    return row.name


def store_checkpoint(doc, snapshot, revision, user):
    # One "Checkpoint" row per workbook, rewritten in place: the latest snapshot never makes
    # "Durar Spreadsheet" itself heavy, so loading it for a permission check stays cheap.
    name = doc.get("checkpoint")
    if name and frappe.db.exists(VERSION, name):
        frappe.db.set_value(VERSION, name, {"data": snapshot, "revision": revision, "size": len(snapshot), "user": user})
        return name
    return new_version(doc.name, "Checkpoint", "", revision, snapshot, user)


def snapshot_of(doc):
    name = doc.get("checkpoint")
    return frappe.db.get_value(VERSION, name, "data") if name else None


def changes_after(sheet, since, limit):
    rows = frappe.get_all(CHANGE, filters={"spreadsheet": sheet, "revision": [">", since]}, fields=["revision", "user", "session", "ops", "summary"], order_by="revision asc", limit_page_length=limit + 1)
    out = []
    for row in rows:
        out.append({"rev": cint(row.get("revision")), "user": row.get("user"), "name": full_name(row.get("user")), "session": row.get("session") or "", "ops": parse_json(row.get("ops"), []), "summary": row.get("summary") or ""})
    return out


def trim_changes(sheet, below):
    # Deletes the oldest rows at or below `below`, a batch at a time. Returns the highest revision
    # deleted: clients whose base is older can no longer be caught up row by row and reload.
    if below <= 0:
        return 0
    top = 0
    rows = frappe.get_all(CHANGE, filters={"spreadsheet": sheet, "revision": ["<=", below]}, fields=["name", "revision"], order_by="revision asc", limit_page_length=TRIM_BATCH)
    for row in rows:
        frappe.delete_doc(CHANGE, row.get("name"), ignore_permissions=True, delete_permanently=True)
        top = max(top, cint(row.get("revision")))
    return top


def trim_versions(sheet):
    names = frappe.get_all(VERSION, filters={"spreadsheet": sheet, "kind": "Auto"}, pluck="name", order_by="creation desc", limit_page_length=KEEP_AUTO_VERSIONS + 10)
    for name in names[KEEP_AUTO_VERSIONS:]:
        frappe.delete_doc(VERSION, name, ignore_permissions=True, delete_permanently=True)


# ---------- operations ----------

def op_ping(data, user):
    for doctype in (DOCTYPE, CHANGE, VERSION, PRESENCE):
        if not frappe.db.exists("DocType", doctype):
            frappe.throw("Durar Sheets is not installed: the DocType " + doctype + " is missing", frappe.DoesNotExistError)
    return {"version": "1", "user": user}


def op_list(data, user):
    fields = ["name", "title", "folder", "is_template", "modified", "modified_by", "owner", "revision", "size"]
    rows = frappe.get_list(DOCTYPE, filters={"owner": user}, fields=fields, order_by="modified desc", limit_page_length=1000)
    writable = {}
    shares = frappe.get_all("DocShare", filters={"share_doctype": DOCTYPE, "user": user}, fields=["share_name", "write"], limit_page_length=2000)
    shares = shares + frappe.get_all("DocShare", filters={"share_doctype": DOCTYPE, "everyone": 1}, fields=["share_name", "write"], limit_page_length=2000)
    for share in shares:
        writable[share.get("share_name")] = writable.get(share.get("share_name")) or cint(share.get("write"))
    mine = set([row.get("name") for row in rows])
    shared = [name for name in writable if name not in mine]
    if shared:
        # get_list applies ERP permissions, so a share that no longer grants access drops out.
        rows = rows + frappe.get_list(DOCTYPE, filters={"name": ["in", shared]}, fields=fields, limit_page_length=1000)
    files = []
    for row in rows:
        own = row.get("owner") == user
        files.append({
            "name": row.get("name"), "title": row.get("title"), "folder": row.get("folder") or "",
            "is_template": cint(row.get("is_template")), "modified": stamp(row.get("modified")),
            "modified_by": row.get("modified_by"), "owner": row.get("owner"), "owner_name": full_name(row.get("owner")),
            "revision": cint(row.get("revision")), "size": cint(row.get("size")), "shared": 0 if own else 1,
            "can_write": 1 if own or writable.get(row.get("name")) else 0, "can_delete": 1 if own else 0,
        })
    return {"files": sorted(files, key=lambda f: f["modified"], reverse=True)}


def op_create(data, user):
    snapshot = data.get("snapshot") or ""
    if snapshot:
        check_snapshot(snapshot)
    doc = frappe.get_doc({
        "doctype": DOCTYPE, "title": clean(data.get("title"), 140) or "Book1", "folder": clean(data.get("folder"), 140),
        "is_template": 1 if data.get("is_template") else 0, "revision": 0, "snapshot_rev": 0, "trimmed_rev": 0, "size": len(snapshot),
    })
    doc.insert()
    if snapshot:
        doc.db_set("checkpoint", new_version(doc.name, "Checkpoint", "", 0, snapshot, user), update_modified=False)
    return {"name": doc.name, "revision": 0}


def op_open(data, user):
    doc = load(data.get("name"), "read")
    touch(doc, data, user)
    sweep_presence()
    return {
        "name": doc.name, "title": doc.title, "folder": doc.get("folder") or "", "is_template": cint(doc.get("is_template")),
        "owner": doc.owner, "owner_name": full_name(doc.owner), "creation": stamp(doc.creation), "modified": stamp(doc.modified),
        "revision": cint(doc.get("revision")), "snapshot": snapshot_of(doc), "snapshot_rev": cint(doc.get("snapshot_rev")),
        "changes": changes_after(doc.name, cint(doc.get("snapshot_rev")), MAX_OPEN), "last_version": stamp(doc.get("last_version")) or None,
        "can_write": 1 if doc.has_permission("write") else 0, "can_share": 1 if doc.has_permission("share") else 0,
        "presence": others(doc, data),
    }


def op_push(data, user):
    doc = load(data.get("name"), "write")
    ops = data.get("ops") or []
    if not isinstance(ops, list):
        frappe.throw("Durar Sheets sent unreadable changes")
    text = json.dumps(ops, separators=(",", ":"))
    if len(text) > MAX_OPS:
        frappe.throw("This change is too large to save at once")
    snapshot = data.get("snapshot")
    if snapshot:
        check_snapshot(snapshot)
    # The row lock makes pushes to one workbook take turns until this request commits.
    head = frappe.db.get_value(DOCTYPE, doc.name, ["revision", "trimmed_rev"], as_dict=True, for_update=True)
    revision = cint(head.get("revision"))
    trimmed = cint(head.get("trimmed_rev"))
    base = cint(data.get("base"))
    touch(doc, data, user)
    if base != revision:
        # Someone saved first. The client rebases its changes over theirs and pushes again.
        if base < trimmed or base > revision:
            return {"conflict": True, "reload": True, "revision": revision}
        changes = changes_after(doc.name, base, MAX_PULL)
        if len(changes) > MAX_PULL:
            return {"conflict": True, "reload": True, "revision": revision}
        return {"conflict": True, "revision": revision, "changes": changes}
    updates = {}
    if ops:
        revision = revision + 1
        frappe.get_doc({
            "doctype": CHANGE, "spreadsheet": doc.name, "revision": revision, "user": user,
            "session": safe_session(data.get("session")), "ops": text, "summary": clean(data.get("summary"), 280),
        }).insert(ignore_permissions=True)
        updates["revision"] = revision
    if snapshot:
        updates["checkpoint"] = store_checkpoint(doc, snapshot, revision, user)
        updates["snapshot_rev"] = revision
        updates["size"] = len(snapshot)
        if data.get("version") == "auto":
            new_version(doc.name, "Auto", "", revision, snapshot, user)
            updates["last_version"] = frappe.utils.now()
            trim_versions(doc.name)
        top = trim_changes(doc.name, revision - KEEP_CHANGES)
        if top > trimmed:
            updates["trimmed_rev"] = top
    if updates:
        # notify: Frappe's socket tells every open copy to pull now instead of at its next poll.
        doc.db_set(updates, notify=True)
    return {"revision": revision, "presence": others(doc, data)}


def op_pull(data, user):
    doc = load(data.get("name"), "read")
    touch(doc, data, user)
    revision = cint(doc.get("revision"))
    since = cint(data.get("since"))
    out = {"revision": revision, "title": doc.title, "can_write": True if doc.has_permission("write") else False, "presence": others(doc, data), "changes": []}
    if since < cint(doc.get("trimmed_rev")) or since > revision:
        out["reload"] = True
    elif since < revision:
        changes = changes_after(doc.name, since, MAX_PULL)
        if len(changes) > MAX_PULL:
            out["reload"] = True
        else:
            out["changes"] = changes
    return out


def op_rename(data, user):
    doc = load(data.get("name"), "write")
    title = clean(data.get("title"), 140)
    if not title:
        frappe.throw("Give the workbook a name")
    doc.db_set("title", title, notify=True)
    return {"name": doc.name}


def op_move(data, user):
    doc = load(data.get("name"), "write")
    doc.db_set("folder", clean(data.get("folder"), 140), notify=True)
    return {"name": doc.name}


def op_delete(data, user):
    doc = load(data.get("name"), "delete")
    if doc.owner != user:
        frappe.throw("Only the owner can delete a workbook", frappe.PermissionError)
    name = doc.name
    for doctype in (CHANGE, VERSION, PRESENCE):
        for row in frappe.get_all(doctype, filters={"spreadsheet": name}, pluck="name"):
            frappe.delete_doc(doctype, row, ignore_permissions=True, delete_permanently=True)
    frappe.delete_doc(DOCTYPE, name, delete_permanently=True)
    return {"name": name}


def op_copy(data, user):
    source = load(data.get("name"), "read")
    snapshot = snapshot_of(source) or ""
    rows = frappe.get_all(CHANGE, filters={"spreadsheet": source.name, "revision": [">", cint(source.get("snapshot_rev"))]}, fields=["ops", "summary"], order_by="revision asc", limit_page_length=MAX_OPEN)
    doc = frappe.get_doc({
        "doctype": DOCTYPE, "title": clean(data.get("title"), 140) or source.title, "folder": source.get("folder") or "",
        "is_template": cint(source.get("is_template")), "revision": len(rows), "snapshot_rev": 0, "trimmed_rev": 0, "size": len(snapshot),
    })
    doc.insert()
    if snapshot:
        doc.db_set("checkpoint", new_version(doc.name, "Checkpoint", "", 0, snapshot, user), update_modified=False)
    revision = 0
    for row in rows:
        revision = revision + 1
        frappe.get_doc({"doctype": CHANGE, "spreadsheet": doc.name, "revision": revision, "user": user, "session": "", "ops": row.get("ops"), "summary": row.get("summary")}).insert(ignore_permissions=True)
    return {"name": doc.name}


def op_versions(data, user):
    doc = load(data.get("name"), "read")
    rows = frappe.get_all(VERSION, filters={"spreadsheet": doc.name, "kind": ["in", ["Auto", "Saved"]]}, fields=["name", "label", "revision", "creation", "user", "size", "kind"], order_by="creation desc", limit_page_length=200)
    out = []
    for row in rows:
        out.append({"name": row.get("name"), "label": row.get("label") or "", "revision": cint(row.get("revision")), "creation": stamp(row.get("creation")), "user": row.get("user"), "user_name": full_name(row.get("user")), "size": cint(row.get("size")), "kind": row.get("kind")})
    return out


def op_version_save(data, user):
    doc = load(data.get("name"), "write")
    snapshot = check_snapshot(data.get("snapshot"))
    return {"name": new_version(doc.name, "Saved", clean(data.get("label"), 140), cint(data.get("revision")), snapshot, user)}


def op_version_get(data, user):
    doc = load(data.get("name"), "read")
    row = frappe.db.get_value(VERSION, clean(data.get("version"), 140), ["spreadsheet", "data"], as_dict=True)
    if not row or row.get("spreadsheet") != doc.name:
        frappe.throw("That version no longer exists", frappe.DoesNotExistError)
    return {"snapshot": row.get("data")}


def op_activity(data, user):
    doc = load(data.get("name"), "read")
    limit = min(max(cint(data.get("limit")) or 200, 1), 500)
    rows = frappe.get_all(CHANGE, filters={"spreadsheet": doc.name}, fields=["revision", "user", "creation", "summary"], order_by="revision desc", limit_page_length=limit)
    out = []
    for row in rows:
        out.append({"revision": cint(row.get("revision")), "user": row.get("user"), "user_name": full_name(row.get("user")), "creation": stamp(row.get("creation")), "summary": row.get("summary") or ""})
    return out


def erp_meta(doctype, user):
    if not isinstance(doctype, str) or not doctype or len(doctype) > 140:
        frappe.throw("Choose a DocType", frappe.PermissionError)
    # The browser's boot.can_read list is only a suggestion. Check the current session
    # on every request, including refreshes and requests edited in developer tools.
    access = frappe.call("frappe.client.has_permission", doctype=doctype, docname=None, perm_type="read")
    if not access or not access.get("has_permission"):
        frappe.throw("You don't have read access to this DocType", frappe.PermissionError)
    meta = frappe.get_meta(doctype)
    if meta.istable or meta.issingle:
        frappe.throw("Choose a regular DocType list", frappe.PermissionError)
    return meta


def erp_fields(meta, user):
    permitted = meta.get_permitted_fieldnames(user=user, permission_type="read")
    out = [{"name": "name", "label": "ID", "type": "Data"}]
    for field in meta.fields:
        if field.fieldname in permitted and field.fieldtype not in ["Password", "Section Break", "Column Break", "Tab Break", "HTML", "Button", "Table", "Table MultiSelect", "Fold", "Image", "Heading"]:
            out.append({"name": field.fieldname, "label": field.label or field.fieldname, "type": field.fieldtype})
    for fieldname in ["owner", "creation", "modified", "modified_by", "docstatus", "idx"]:
        out.append({"name": fieldname, "label": fieldname, "type": "Data"})
    return out


def op_erp_fields(data, user):
    return erp_fields(erp_meta(data.get("doctype"), user), user)


def op_erp_list(data, user):
    doctype = data.get("doctype")
    meta = erp_meta(doctype, user)
    allowed = [field.get("name") for field in erp_fields(meta, user)]
    fields = data.get("fields") or ["name"]
    if not isinstance(fields, list) or len(fields) > 300:
        frappe.throw("Choose permitted fields", frappe.PermissionError)
    for field in fields:
        if not isinstance(field, str) or field not in allowed:
            frappe.throw("A requested field is not readable", frappe.PermissionError)
    # No SQL expressions, linked-table traversal or filters on hidden fields. The
    # native permission-aware list API still applies User Permissions and row rules.
    filters = data.get("filters") or []
    if isinstance(filters, dict):
        for field in filters:
            if field not in allowed:
                frappe.throw("A filter field is not readable", frappe.PermissionError)
    elif isinstance(filters, list):
        for rule in filters:
            if not isinstance(rule, list) or len(rule) not in [3, 4]:
                frappe.throw("Invalid ERPNext filter")
            if len(rule) == 4 and rule[0] != doctype:
                frappe.throw("Cross-DocType filters are not allowed", frappe.PermissionError)
            if rule[-3] not in allowed:
                frappe.throw("A filter field is not readable", frappe.PermissionError)
    else:
        frappe.throw("Invalid ERPNext filters")
    order = data.get("order") or "modified desc"
    if not isinstance(order, str):
        frappe.throw("Invalid sort order")
    for part in order.split(","):
        terms = part.strip().split()
        if len(terms) not in [1, 2] or terms[0] not in allowed or (len(terms) == 2 and terms[1].lower() not in ["asc", "desc"]):
            frappe.throw("A sort field is not readable", frappe.PermissionError)
    # Only forward this fixed argument list. Never accept user, ignore_permissions,
    # parent, arbitrary methods or query options from the caller.
    return frappe.call("frappe.client.get_list", doctype=doctype, fields=fields, filters=filters,
                       order_by=order, limit_start=max(0, cint(data.get("start"))),
                       limit_page_length=min(5000, max(1, cint(data.get("limit")) or 500)))


def op_erp_report(data, user):
    report_name = clean(data.get("report"), 140)
    report = frappe.get_doc("Report", report_name)
    for depth in range(10):
        erp_meta(report.ref_doctype, user)
        if report.report_type != "Custom Report":
            break
        report = frappe.get_doc("Report", report.reference_report)
    else:
        frappe.throw("Invalid report reference")
    filters = data.get("filters") or {}
    if not isinstance(filters, dict):
        frappe.throw("Report filters must be an object")
    # Frappe checks report roles and report permission, and executes as this session.
    return frappe.call("frappe.desk.query_report.run", report_name=report_name, filters=filters,
                       user=user, ignore_prepared_report=True)


OPERATIONS = {
    "ping": op_ping, "list": op_list, "create": op_create, "open": op_open, "push": op_push, "pull": op_pull,
    "rename": op_rename, "move": op_move, "delete": op_delete, "copy": op_copy, "versions": op_versions,
    "version_save": op_version_save, "version_get": op_version_get, "activity": op_activity,
    "erp_fields": op_erp_fields, "erp_list": op_erp_list, "erp_report": op_erp_report,
}


def main():
    user = allowed_user()
    op = str(frappe.form_dict.get("op") or "")
    if op not in OPERATIONS:
        frappe.throw("Unknown Durar Sheets operation")
    raw = frappe.form_dict.get("data") or "{}"
    if len(raw) > MAX_SNAPSHOT + MAX_OPS + 100000:
        frappe.throw("This request is too large to save")
    data = parse_json(raw, None)
    if not isinstance(data, dict):
        frappe.throw("Durar Sheets sent unreadable data")
    frappe.response["message"] = OPERATIONS[op](data, user)


main()
