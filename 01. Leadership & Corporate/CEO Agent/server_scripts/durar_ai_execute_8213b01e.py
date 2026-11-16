# Durar AI approved-write executor. Server Script: Script Type=API, API Method=durar_ai_execute, Allow Guest=off.
# Ships ENABLED for production: employee email, scheduled email and draft writes for the CEO role are on, so a re-paste
# needs no edits. To switch one off set its flag to False (or "" for a role); to stop everything tick Disabled on the script.
# Frappe v14 sandbox only: no imports, hashlib, hmac, frappe.conf or time. Secrets live in "Durar AI Relay Settings".
# It runs as the employee, so Frappe's own permissions decide every write. Protocol: apps/ceopanel/docs/AI-OPERATIONS.md

ENABLED = True
# THIS LIST IS THE FINAL GATE for what the AI can change. The assistant's approval cards
# use the DocType name as the module id. Anything not listed here is refused, whatever
# the panel sends, and only draft records can be created or edited. Empty means nothing
# is writable. Each entry: the one DocType and the only fields it may create or update.
# Example (add only what you are happy for an approved AI request to change):
# MODULES = {
#     "Issue": {
#         "doctype": "Issue",
#         "company_field": "company",   # forced to the request's company; omit if the DocType has none
#         "create": ["subject", "description", "priority"],
#         "update": ["priority", "status"],
#     },
#     "ToDo": {
#         "doctype": "ToDo",
#         "create": ["description", "date", "allocated_to"],
#         "update": ["description", "date", "status"],
#     },
# }
# Lets the CEO cancel a scheduled email from chat (set its Active field to 0). Every other DocType is covered by
# ANY_DRAFTS_ROLE below, which allows draft create/update only.
MODULES = {
    "Durar Scheduled Email": {"doctype": "Durar Scheduled Email", "update": ["active"]},
}
# Draft create/update of ANY DocType for users holding this role, beyond MODULES.
# Still drafts only, still run as the employee (ERP permissions decide), and never
# the DocTypes in BLOCKED. Set ANY_DRAFTS_ROLE to "" to keep this off.
ANY_DRAFTS_ROLE = "CEO"
BLOCKED = [
    "User", "Role", "Has Role", "DocPerm", "Custom DocPerm", "User Permission", "DocType",
    "Customize Form", "System Settings", "Server Script", "Client Script", "Custom Field",
    "Property Setter", "Workflow", "Email Account", "OAuth Client", "API Key", "Patch Log",
    "Durar AI Relay Settings", "Durar Scheduled Email", "Comment", "Version", "Communication", "Email Queue",
]
SYSTEM_FIELDS = [
    "name", "owner", "docstatus", "creation", "modified", "modified_by", "parent",
    "parenttype", "parentfield", "idx", "doctype",
]
# Scheduled and repeating emails: stored in the DocType "Durar Scheduled Email" and sent by
# the scheduler script durar_scheduled_emails. Only users holding this role may schedule.
# To let the CEO cancel one, also add to MODULES:
#   "Durar Scheduled Email": {"doctype": "Durar Scheduled Email", "update": ["active"]},
SCHEDULE_ROLE = "CEO"
# Submitting a draft (docstatus 0 to 1): one exact draft, only a submittable DocType outside BLOCKED, only
# if unchanged since the user saw it, and ERP's own submit permission still applies. Never cancels.
SUBMIT_ROLE = "CEO"
# Email to employees (approved by the CEO in the chat).
EMAIL_ENABLED = True
# Durar Messenger to employees (approved by the CEO in the chat): this script checks each Employee with the
# CEO's permissions and signs who may receive it; the panel then posts it from the CEO's own account.
MESSENGER_ENABLED = True
# Also put a bell notification on each recipient's ERP desk (Notification Log, type Alert: never emailed).
MESSENGER_NOTIFY = True

HEX = "0123456789abcdef"
AUTH_WINDOW = 60
ROUND = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]


def rotate(value, count):
    return ((value >> count) | (value << (32 - count))) & 0xffffffff


# Pure Python, used only for short envelopes. Payloads are hashed by MariaDB.
def sha256(message):
    state = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]
    bits = len(message) * 8
    padded = list(message) + [0x80] + [0] * ((55 - len(message)) % 64)
    for shift in range(56, -8, -8):
        padded.append((bits >> shift) & 0xff)
    for start in range(0, len(padded), 64):
        w = []
        for i in range(16):
            at = start + i * 4
            w.append((padded[at] << 24) | (padded[at + 1] << 16) | (padded[at + 2] << 8) | padded[at + 3])
        for i in range(16, 64):
            s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >> 3)
            s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >> 10)
            w.append((w[i - 16] + s0 + w[i - 7] + s1) & 0xffffffff)
        v = list(state)
        for i in range(64):
            s1 = rotate(v[4], 6) ^ rotate(v[4], 11) ^ rotate(v[4], 25)
            choice = (v[4] & v[5]) ^ (~v[4] & 0xffffffff & v[6])
            t1 = v[7] + s1 + choice + ROUND[i] + w[i]
            s0 = rotate(v[0], 2) ^ rotate(v[0], 13) ^ rotate(v[0], 22)
            majority = (v[0] & v[1]) ^ (v[0] & v[2]) ^ (v[1] & v[2])
            v = [
                (t1 + s0 + majority) & 0xffffffff, v[0], v[1], v[2],
                (v[3] + t1) & 0xffffffff, v[4], v[5], v[6],
            ]
        state = [(state[i] + v[i]) & 0xffffffff for i in range(8)]
    digest = []
    for word in state:
        for shift in (24, 16, 8, 0):
            digest.append((word >> shift) & 0xff)
    return digest


def hmac_sha256_hex(key, message):
    key = list(key)
    if len(key) > 64:
        key = sha256(key)
    key = key + [0] * (64 - len(key))
    inner = sha256([b ^ 0x36 for b in key] + list(message))
    outer = sha256([b ^ 0x5c for b in key] + inner)
    return "".join([hex(b + 256)[3:] for b in outer])


def same(left, right):
    if not isinstance(left, str) or not isinstance(right, str) or len(left) != len(right):
        return False
    diff = 0
    for i in range(len(left)):
        diff = diff | (ord(left[i]) ^ ord(right[i]))
    return diff == 0


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sign(secret, prefix, value):
    return hmac_sha256_hex(secret.encode("utf-8"), (prefix + canonical(value)).encode("utf-8"))


def refuse(message):
    frappe.throw(message, frappe.PermissionError)


def is_uuid(value):
    if not isinstance(value, str) or len(value) != 36:
        return False
    for i in range(36):
        if i in (8, 13, 18, 23):
            if value[i] != "-":
                return False
        elif value[i] not in HEX:
            return False
    return True


def scalar(value):
    return value is None or isinstance(value, (str, int, float, bool))


def has_role(user, role):
    # frappe.get_roles is not available in the Server Script sandbox, so ask the roles table.
    # The Administrator account holds every role.
    if user == "Administrator":
        return True
    rows = frappe.db.sql(
        "select 1 from `tabHas Role` where parent=%s and parenttype='User' and role=%s limit 1",
        (user, role),
    )
    return len(rows) > 0


def own_sender(user):
    # Send as the employee only when ERP has an enabled outgoing Email Account for that
    # exact address. Otherwise the default account sends and replies go to the employee.
    address = frappe.db.get_value("User", user, "email") or user
    if frappe.db.exists("Email Account", {"email_id": address, "enable_outgoing": 1}):
        return address
    return ""


def resolve_many(ids, company):
    # Work addresses of the Employees the user may read, in one permission-aware query.
    # Anyone who cannot be emailed (not readable, other company, not active, no valid work
    # address) is skipped and counted, so one bad record never blocks a broadcast.
    clean = []
    for employee in ids:
        if isinstance(employee, str) and employee and len(employee) <= 140 and employee not in clean:
            clean.append(employee)
    rows = frappe.get_list(
        "Employee",
        filters={"name": ["in", clean]},
        fields=["name", "status", "company", "company_email", "user_id"],
        limit_page_length=len(clean) + 1,
    )
    recipients = []
    for row in rows:
        address = row.get("company_email") or row.get("user_id")
        active = not row.get("status") or row.get("status") == "Active"
        same_company = not row.get("company") or row.get("company") == company
        if active and same_company and address and "@" in address and address not in recipients:
            recipients.append(address)
    return {"recipients": recipients, "skipped": len(clean) - len(recipients)}


DIRECT = 25
BATCH = 50


def deliver(recipients, title, body, user, company):
    # Up to 25 recipients: one email, all in To. More: batches of 50 with the recipients hidden
    # (BCC) and a copy to the sender. Each batch is sent now; one that ERP cannot send now goes
    # to ERP's email queue instead, which retries on its own, so a mail-server hiccup does not
    # lose it. Returns how many were delivered, queued for retry, and not accepted at all.
    sender = own_sender(user)
    copy_to = frappe.db.get_value("User", user, "email") or user
    hidden = len(recipients) > DIRECT
    batches = []
    if hidden:
        start = 0
        while start < len(recipients):
            batches.append(recipients[start:start + BATCH])
            start = start + BATCH
    else:
        batches.append(recipients)
    sent = 0
    queued = 0
    failed = 0
    for batch in batches:
        done = False
        for now in (True, False):
            if done:
                continue
            try:
                if hidden:
                    frappe.sendmail(recipients=[copy_to], bcc=batch, subject=title, message=body, sender=sender, reply_to=user, reference_doctype="Company", reference_name=company, now=now)
                else:
                    frappe.sendmail(recipients=batch, subject=title, message=body, sender=sender, reply_to=user, reference_doctype="Company", reference_name=company, now=now)
                if now:
                    sent = sent + len(batch)
                else:
                    queued = queued + len(batch)
                done = True
            except Exception:
                pass
        if not done:
            failed = failed + len(batch)
    return {"sent": sent, "queued": queued, "failed": failed}


def delivery_summary(result, skipped):
    parts = ["Delivered to " + str(result["sent"])]
    if result["queued"]:
        parts.append("queued for retry " + str(result["queued"]))
    if result["failed"]:
        parts.append("failed " + str(result["failed"]))
    if skipped:
        parts.append("skipped " + str(skipped) + " (no usable work email)")
    text = "; ".join(parts)
    if result["failed"]:
        text = "Partly sent: " + text
    return text


def submit_document(action, user, company, proposal, payload_hash, secret, comment_subject):
    if not SUBMIT_ROLE or not has_role(user, SUBMIT_ROLE):
        refuse("Submitting documents is not enabled for you")
    doctype = action.get("module")
    name = action.get("name")
    if not isinstance(doctype, str) or not doctype or doctype in BLOCKED or not isinstance(name, str) or not name or len(name) > 140:
        refuse("This document cannot be submitted by AI actions")
    meta = frappe.get_meta(doctype)
    if not meta.get("is_submittable"):
        refuse(doctype + " is not a submittable document")
    doc = frappe.get_doc(doctype, name)
    doc.check_permission("submit")
    if meta.has_field("company") and doc.get("company") != company:
        refuse("Document belongs to another company")
    if str(doc.modified) != action.get("modified"):
        frappe.throw("Document changed. Prepare a new request.")
    if int(doc.docstatus or 0) != 0:
        frappe.throw("Only a draft can be submitted.")
    doc.submit()
    receipt = {
        "actor": user,
        "company": company,
        "modified": str(doc.modified),
        "module": doctype,
        "name": doc.name,
        "payloadHash": payload_hash,
        "proposal": proposal,
    }
    data = {"receipt": receipt, "signature": sign(secret, "", receipt)}
    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Info",
        "reference_doctype": "Company",
        "reference_name": company,
        "subject": comment_subject,
        "content": json.dumps(data),
    }).insert(ignore_permissions=True)
    frappe.response["message"] = data


def schedule_email(action, user, company, proposal, payload_hash, secret, comment_subject):
    if not SCHEDULE_ROLE or not has_role(user, SCHEDULE_ROLE):
        refuse("Scheduling email is not enabled for you")
    ids = action.get("employees")
    to_self = action.get("toSelf") is True
    title = action.get("subject")
    text = action.get("text")
    repeat = action.get("repeat")
    first = action.get("firstSendAt")
    until = action.get("until")
    if not isinstance(ids, list) or len(ids) > 150 or (not ids and not to_self) or not isinstance(title, str) or not title or len(title) > 200 or not isinstance(text, str) or not text or len(text) > 4000:
        refuse("A subject, a message and recipients are required")
    if repeat not in ("once", "daily", "weekly", "monthly") or not isinstance(first, str) or len(first) != 16:
        refuse("A valid schedule is required")
    when = frappe.utils.get_datetime(first)
    if when <= frappe.utils.now_datetime():
        refuse("The first send time must be in the future (ERP time)")
    if until:
        if not isinstance(until, str) or len(until) != 10:
            refuse("Invalid end date")
        frappe.utils.getdate(until)
    if ids and not resolve_many(ids, company)["recipients"]:
        refuse("None of these employees can be emailed (not readable, inactive or no work email)")
    doc = frappe.get_doc({
        "doctype": "Durar Scheduled Email",
        "company": company,
        "created_by_user": user,
        "employees": json.dumps(ids),
        "to_self": 1 if to_self else 0,
        "subject": title,
        "message": text,
        "next_run": when,
        "repeat": repeat,
        "until": until or None,
        "active": 1,
        "proposal": proposal,
    })
    doc.insert(ignore_permissions=True)
    receipt = {
        "actor": user,
        "company": company,
        "modified": str(doc.modified),
        "module": action.get("module"),
        "name": doc.name,
        "payloadHash": payload_hash,
        "proposal": proposal,
    }
    data = {"receipt": receipt, "signature": sign(secret, "", receipt)}
    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Info",
        "reference_doctype": "Company",
        "reference_name": company,
        "subject": comment_subject,
        "content": json.dumps(data),
    }).insert(ignore_permissions=True)
    frappe.response["message"] = data


def send_email(action, user, company, proposal, payload_hash, secret, comment_subject):
    # Email goes only to the work address stored on each Employee the user can read.
    if not EMAIL_ENABLED:
        refuse("AI email is disabled")
    ids = action.get("employees")
    title = action.get("subject")
    text = action.get("text")
    if not isinstance(ids, list) or not ids or len(ids) > 150 or not isinstance(title, str) or not title or len(title) > 200 or not isinstance(text, str) or not text or len(text) > 4000:
        refuse("A subject, a message and one to 150 employees are required")
    found = resolve_many(ids, company)
    if not found["recipients"]:
        refuse("None of these employees can be emailed (not readable, inactive or no work email)")
    body = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    result = deliver(found["recipients"], title, body, user, company)
    if result["sent"] + result["queued"] == 0:
        # Nothing went out and nothing is queued, so the request can safely be retried.
        refuse("The email could not be sent or queued. Nothing was delivered. Check ERP's outgoing Email Account.")
    stamp = str(frappe.utils.now_datetime())
    receipt = {
        "actor": user,
        "company": company,
        "modified": stamp,
        "module": action.get("module"),
        "name": "email-" + proposal,
        "detail": delivery_summary(result, found["skipped"]),
        "payloadHash": payload_hash,
        "proposal": proposal,
    }
    data = {"receipt": receipt, "signature": sign(secret, "", receipt)}
    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Info",
        "reference_doctype": "Company",
        "reference_name": company,
        "subject": comment_subject,
        "content": json.dumps(data),
    }).insert(ignore_permissions=True)
    frappe.response["message"] = data


def profile(row):
    # Same shape as the durar_messenger script sends, so the chat shows the same name and photo.
    person = {"user": row.get("user_id"), "employee": row.get("name"), "name": row.get("employee_name") or row.get("name")}
    for key in ("department", "designation", "image"):
        if row.get(key):
            person[key] = str(row.get(key))[:500 if key == "image" else 200]
    return person


def notify(users, sender, text):
    # Best effort: a missing bell never stops the message itself.
    preview = text.replace("\n", " ")
    if len(preview) > 120:
        preview = preview[:117] + "..."
    for target in users:
        try:
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": target,
                "from_user": frappe.session.user,
                "type": "Alert",
                "subject": frappe.utils.escape_html(sender + " (Durar Messenger): " + preview),
            }).insert(ignore_permissions=True)
        except Exception:
            pass


def send_messenger(action, user, company, proposal, payload_hash, secret, comment_subject):
    if not MESSENGER_ENABLED:
        refuse("Durar Messenger from the assistant is disabled")
    ids = action.get("employees")
    text = action.get("text")
    if not isinstance(ids, list) or not ids or len(ids) > 150 or not isinstance(text, str) or not text.strip() or len(text) > 4000:
        refuse("A message and one to 150 employees are required")
    clean = []
    for employee in ids:
        if isinstance(employee, str) and employee and len(employee) <= 140 and employee not in clean:
            clean.append(employee)
    # Permission-aware: only Employees the CEO may read, active, in this company, with an enabled ERP user.
    rows = frappe.get_list(
        "Employee",
        filters={"name": ["in", clean]},
        fields=["name", "employee_name", "status", "company", "user_id", "department", "designation", "image"],
        limit_page_length=len(clean) + 1,
    )
    people = []
    seen = []
    for row in rows:
        target = row.get("user_id")
        active = not row.get("status") or row.get("status") == "Active"
        same_company = not row.get("company") or row.get("company") == company
        if active and same_company and target and target != user and target not in seen and frappe.db.get_value("User", target, "enabled"):
            seen.append(target)
            people.append(profile(row))
    if not people:
        refuse("None of these employees can be messaged (not readable, inactive, or no enabled ERP user)")
    mine = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, ["name", "employee_name", "user_id", "department", "designation", "image"], as_dict=True)
    if mine:
        me = profile(mine)
    else:
        me = {"user": user, "employee": user, "name": frappe.db.get_value("User", user, "full_name") or user}
    if MESSENGER_NOTIFY:
        notify(seen, me["name"], text)
    skipped = len(clean) - len(people)
    detail = "Sent in Durar Messenger to " + str(len(people))
    if skipped:
        detail = detail + "; skipped " + str(skipped) + " (not readable, inactive, or no enabled ERP user)"
    receipt = {
        "actor": user,
        "company": company,
        "modified": str(frappe.utils.now_datetime()),
        "module": action.get("module"),
        "name": "messenger-" + proposal,
        "detail": detail,
        "payloadHash": payload_hash,
        "people": canonical({"me": me, "to": people}),
        "proposal": proposal,
    }
    data = {"receipt": receipt, "signature": sign(secret, "", receipt)}
    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Info",
        "reference_doctype": "Company",
        "reference_name": company,
        "subject": comment_subject,
        "content": json.dumps(data),
    }).insert(ignore_permissions=True)
    frappe.response["message"] = data


def run():
    # Layer 1: nothing below runs unless this script was deliberately enabled.
    if not ENABLED or not (MODULES or EMAIL_ENABLED or MESSENGER_ENABLED or ANY_DRAFTS_ROLE or SCHEDULE_ROLE or SUBMIT_ROLE):
        refuse("AI actions are disabled")
    if frappe.session.user == "Guest":
        refuse("Sign in required")
    user = frappe.session.user
    mode = frappe.form_dict.get("mode") or "execute"
    proposal = frappe.form_dict.get("proposal")
    company = frappe.form_dict.get("company")
    if mode not in ("execute", "receipt") or not is_uuid(proposal) or not isinstance(company, str) or not company or len(company) > 180:
        refuse("Invalid AI action request")
    payload = frappe.form_dict.get("payload") if mode == "execute" else ""
    if mode == "execute" and (not isinstance(payload, str) or not payload or len(payload) > 100000):
        refuse("An exact serialized payload is required")
    if not frappe.get_list("Company", filters={"name": company}, fields=["name"], limit_page_length=1):
        refuse("Company access denied")

    secret = frappe.get_doc("Durar AI Relay Settings").get_password("receipt_secret")
    if not secret or len(secret) < 32:
        refuse("Receipt signing is not configured")
    row = frappe.db.sql("select sha2(%s, 256), unix_timestamp()", (payload,))[0]
    payload_hash = str(row[0])
    now = int(row[1])

    if mode == "execute":
        try:
            authorization = json.loads(frappe.form_dict.get("authorization") or "")
        except Exception:
            authorization = None
        stamp = authorization.get("timestamp") if isinstance(authorization, dict) else None
        if isinstance(stamp, bool) or not isinstance(stamp, int) or abs(now - stamp) > AUTH_WINDOW:
            refuse("Execution authorization expired or missing")
        expected = {"actor": user, "company": company, "payloadHash": payload_hash, "proposal": proposal, "timestamp": stamp}
        if not same(authorization.get("signature"), sign(secret, "ceopanel.execute.v1:", expected)):
            refuse("Execution authorization mismatch")

    # One lock per company serializes retries, so the receipt check below cannot race.
    frappe.db.get_value("Company", company, "name", for_update=True)
    subject = "ceopanel-proposal-" + proposal
    stored = frappe.db.get_value(
        "Comment",
        {"comment_type": "Info", "reference_doctype": "Company", "reference_name": company, "subject": subject},
        "content",
    )
    if stored:
        data = json.loads(stored)
        receipt = data.get("receipt") or {}
        if receipt.get("actor") != user or (mode == "execute" and receipt.get("payloadHash") != payload_hash):
            refuse("Receipt does not belong to this request")
        frappe.response["message"] = data
        return
    if mode == "receipt":
        absent = {"actor": user, "asOf": now, "company": company, "proposal": proposal}
        frappe.response["message"] = {"absent": absent, "signature": sign(secret, "ceopanel.absent.v1:", absent)}
        return

    try:
        action = json.loads(payload)
    except Exception:
        action = None
    if not isinstance(action, dict) or action.get("kind") not in ("create", "update", "email", "messenger", "coordinate", "schedule", "submit"):
        refuse("This AI action is not available")
    kind = action.get("kind")
    if kind == "email":
        send_email(action, user, company, proposal, payload_hash, secret, subject)
        return
    # A coordination task needs exactly the same check: who may be messaged, signed.
    if kind in ("messenger", "coordinate"):
        send_messenger(action, user, company, proposal, payload_hash, secret, subject)
        return
    if kind == "schedule":
        schedule_email(action, user, company, proposal, payload_hash, secret, subject)
        return
    if kind == "submit":
        submit_document(action, user, company, proposal, payload_hash, secret, subject)
        return
    spec = MODULES.get(action.get("module"))
    open_draft = False
    if not spec and ANY_DRAFTS_ROLE and has_role(user, ANY_DRAFTS_ROLE):
        target = action.get("module")
        if isinstance(target, str) and target not in BLOCKED and frappe.db.get_value("DocType", target, "istable") == 0 and frappe.db.get_value("DocType", target, "issingle") == 0:
            spec = {"doctype": target}
            open_draft = True
    if not spec:
        refuse("This module is not approved for AI actions")
    doctype = spec.get("doctype")
    allowed = spec.get(kind) or []
    given = action.get("values")
    if not isinstance(given, dict) or not given or len(given) > 40:
        refuse("Record values are required")
    values = {}
    for key in given:
        if not isinstance(key, str) or not scalar(given[key]):
            refuse("Field is not approved for AI changes: " + str(key))
        if open_draft:
            if key in SYSTEM_FIELDS or key.startswith("_") or not frappe.get_meta(doctype).has_field(key):
                refuse("Field is not approved for AI changes: " + key)
        elif key not in allowed:
            refuse("Field is not approved for AI changes: " + key)
        values[key] = given[key]
    company_field = spec.get("company_field")
    if open_draft and frappe.get_meta(doctype).has_field("company"):
        company_field = "company"
    if company_field:
        values[company_field] = company

    if kind == "create":
        doc = frappe.new_doc(doctype)
        doc.update(values)
        doc.insert()
    else:
        name = action.get("name")
        if not isinstance(name, str) or not name or len(name) > 140:
            refuse("Record identity is required")
        doc = frappe.get_doc(doctype, name)
        doc.check_permission("write")
        if company_field and doc.get(company_field) != company:
            refuse("Record belongs to another company")
        if str(doc.modified) != action.get("modified"):
            frappe.throw("Record changed. Prepare a new proposal.")
        if int(doc.docstatus or 0) != 0:
            frappe.throw("Only draft records can be changed by AI actions.")
        doc.update(values)
        doc.save()

    receipt = {
        "actor": user,
        "company": company,
        "modified": str(doc.modified),
        "module": action.get("module"),
        "name": doc.name,
        "payloadHash": payload_hash,
        "proposal": proposal,
    }
    data = {"receipt": receipt, "signature": sign(secret, "", receipt)}
    # Same transaction as the record change: both commit, or neither does.
    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Info",
        "reference_doctype": "Company",
        "reference_name": company,
        "subject": subject,
        "content": json.dumps(data),
    }).insert(ignore_permissions=True)
    frappe.response["message"] = data


run()
