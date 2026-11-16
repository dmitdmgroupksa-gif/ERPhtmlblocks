# Durar Messenger relay. Server Script: Script Type=API, API Method=durar_messenger, Allow Guest=off.
# Separate from durar_ai_relay: its own operations, its own secret ("Durar Messenger Settings",
# Password field relay_secret) and its own panel endpoint. It sends no ERP session id, so the
# panel can never act inside ERP through it. Frappe v14 sandbox only: no imports, hashlib or hmac.
# Setup and protocol: apps/ceopanel/docs/MESSENGER.md

SITE = "https://dmgroup.frappe.cloud"
ENDPOINT = "https://panel.durar.ai/api/messenger/v1/relay"
MAX_DATA_CHARS = 200000
# Empty: every active employee can message every other one. Otherwise only employees
# of these exact ERP companies appear in the directory and can be added to chats.
COMPANIES = []
OPERATIONS = {
    "bootstrap", "directory",
    "conversations.list", "conversations.get", "conversations.direct", "conversations.settings",
    "conversations.members",
    "groups.create", "groups.update", "groups.image", "groups.add", "groups.remove", "groups.admin", "groups.leave",
    "messages.list", "messages.send", "messages.edit", "messages.delete", "messages.react",
    "messages.read", "messages.delivered", "messages.info", "messages.search", "messages.find", "messages.translate",
    "messages.pin", "messages.pins", "messages.shared",
    "typing", "presence", "files.ticket", "stream.ticket",
    "calls.start", "calls.join", "calls.decline", "calls.leave", "calls.list", "calls.live",
    "devices.register", "devices.unregister",
}
# Ring the ERP bell (Notification Log, type Alert: shown on every ERP page, never emailed) for a new message
# or an incoming call when the recipient has no Messenger open. The panel decides who and throttles a busy chat.
NOTIFY = True
# Show the message text in the bell. False shows only who wrote.
NOTIFY_PREVIEW = True
# Operations whose data names other employees: each one must be an active employee.
NAMES_USERS = {"conversations.direct": "user", "groups.create": "users", "groups.add": "users"}
EMPLOYEE_FIELDS = ["name", "employee_name", "user_id", "department", "designation", "image", "company"]
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


# Pure Python runs only over the short envelope; MariaDB hashes the large data part.
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


def employees(users):
    filters = {"status": "Active", "user_id": ["in", users] if users is not None else ["is", "set"]}
    if COMPANIES:
        filters["company"] = ["in", COMPANIES]
    rows = frappe.get_all("Employee", filters=filters, fields=EMPLOYEE_FIELDS, limit_page_length=20000)
    ids = list(set([r.user_id for r in rows if r.user_id]))
    enabled = set()
    if ids:
        for u in frappe.get_all("User", filters={"name": ["in", ids], "enabled": 1}, fields=["name"], limit_page_length=len(ids) + 1):
            enabled.add(u.name)
    people = {}
    for r in rows:
        if r.user_id in enabled and r.user_id not in people:
            person = {"user": r.user_id, "employee": r.name, "name": r.employee_name or r.user_id}
            for key in ["department", "designation", "image"]:
                if r.get(key):
                    person[key] = str(r.get(key))[:200]
            people[r.user_id] = person
    return people


def relay():
    # Frappe already enforced the session and, for POST, its CSRF token.
    if frappe.request.method != "POST" or frappe.session.user == "Guest":
        frappe.throw("Sign in required", frappe.PermissionError)
    operation = frappe.form_dict.get("operation")
    raw_data = frappe.form_dict.get("data") or "{}"
    if operation not in OPERATIONS:
        frappe.throw("This messenger operation is not available", frappe.PermissionError)
    if not isinstance(raw_data, str) or len(raw_data) > MAX_DATA_CHARS:
        frappe.throw("Messenger request is too large")
    data = json.loads(raw_data)
    if not isinstance(data, dict):
        frappe.throw("Messenger data must be an object")

    user = frappe.session.user
    me = employees([user]).get(user)
    if not me:
        frappe.throw("Messenger is available to active employees with an ERP user", frappe.PermissionError)
    # Only this script writes "verified"; anything the browser sent under it is discarded.
    verified = {"me": me}
    field = NAMES_USERS.get(operation)
    if field:
        wanted = data.get(field)
        wanted = [wanted] if field == "user" else wanted
        if not isinstance(wanted, list) or not wanted or len(wanted) > 256:
            frappe.throw("Choose employees to chat with")
        for value in wanted:
            if not isinstance(value, str) or len(value) > 320:
                frappe.throw("Choose employees to chat with")
        found = employees(wanted)
        if len([u for u in set(wanted) if u in found]) != len(set(wanted)):
            frappe.throw("Only active employees can be added to a chat")
        verified["users"] = [found[u] for u in set(wanted)]
    if operation == "directory":
        verified["directory"] = list(employees(None).values())
    data["verified"] = verified

    # json.dumps escapes non-ASCII, so SQL, hashing and HTTP all see identical bytes.
    data_json = json.dumps(data, separators=(",", ":"))
    row = frappe.db.sql("select sha2(%s, 256), unix_timestamp(), uuid()", (data_json,))[0]
    envelope = {
        "site": SITE,
        "user": user,
        "timestamp": int(row[1]),
        "nonce": str(row[2]),
        "operation": operation,
        "dataSha256": str(row[0]),
    }
    signed = json.dumps(envelope, separators=(",", ":"))
    secret = frappe.get_doc("Durar Messenger Settings").get_password("relay_secret")
    if not secret or len(secret) < 32:
        frappe.throw("Messenger relay configuration is incomplete")
    signature = hmac_sha256_hex(secret.encode("utf-8"), ("durar.messenger.v1:" + signed).encode("utf-8"))

    result = None
    try:
        result = frappe.make_post_request(
            ENDPOINT,
            data=signed + "\n" + data_json,
            headers={
                "Content-Type": "text/plain; charset=us-ascii",
                "X-Durar-Signature": signature,
            },
        )
    except Exception:
        result = None
    if not isinstance(result, dict) or not isinstance(result.get("ok"), bool):
        frappe.throw("Messenger is unavailable. Check your connection and try again.")
    if not result["ok"]:
        frappe.throw(str(result.get("error") or "Messenger request failed")[:300])
    answer = result.get("result")
    if isinstance(answer, dict) and "notify" in answer:
        notice = answer.pop("notify")
        if NOTIFY and operation in ("messages.send", "calls.start"):
            ring(notice, me)
    frappe.response["message"] = answer


def ring(notice, me):
    # Best effort: a missing bell never fails the send the employee already sees.
    if not isinstance(notice, dict) or not isinstance(notice.get("users"), list):
        return
    who = me["name"]
    if isinstance(notice.get("group"), str) and notice.get("group"):
        who = who + " @ " + notice.get("group")[:100]
    subject = who + " (Durar Messenger)"
    preview = notice.get("preview")
    if NOTIFY_PREVIEW and isinstance(preview, str) and preview:
        subject = who + ": " + preview[:120]
    for target in notice["users"][:256]:
        if not isinstance(target, str) or not target or target == me["user"] or len(target) > 320:
            continue
        try:
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": target,
                "from_user": me["user"],
                "type": "Alert",
                "subject": frappe.utils.escape_html(subject),
            }).insert(ignore_permissions=True)
        except Exception:
            pass


relay()
