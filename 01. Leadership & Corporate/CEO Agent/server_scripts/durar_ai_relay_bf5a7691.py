# Durar AI relay. Server Script: Script Type=API, API Method=durar_ai_relay, Allow Guest=off.
# Frappe v14 sandbox only: no imports, hashlib, hmac, frappe.conf or frappe.session.sid.
# The relay secret lives in the Single DocType "Durar AI Relay Settings" (Password field relay_secret).
# Protocol and rollout: apps/ceopanel/docs/AI-OPERATIONS.md

SITE = "https://dmgroup.frappe.cloud"
ENDPOINT = "https://panel.durar.ai/api/ai/v1/relay"
MAX_DATA_CHARS = 14000000
# approvals.decide is deliberately absent: ERP writes and WhatsApp sends stay disabled.
OPERATIONS = {
    "data.heartbeat", "data.summary", "data.status", "data.refresh",
    "bootstrap", "chats.list", "chats.create", "chats.load", "chats.rename", "chats.delete",
    "messages.submit", "runs.events", "runs.cancel", "attachments.register",
    "attachments.download", "files.download", "feedback.save",
    "preferences.list", "preferences.save", "preferences.delete",
    # Approval cards: the decision, a fresh signed instruction, and ERP's receipt coming
    # back. The change itself is made only by durar_ai_execute, as the employee.
    "requests.decide", "requests.edit", "requests.execute", "requests.complete",
}
# Each block asks for one agent. Durar still checks the employee's current roles,
# so this only chooses among agents the roles already allow.
AGENTS = {"ceo", "executive", "finance", "sales", "operations", "support"}
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


def relay():
    # Frappe already enforced the session and, for POST, its CSRF token.
    if frappe.request.method != "POST" or frappe.session.user == "Guest":
        frappe.throw("Sign in required", frappe.PermissionError)
    # Frappe prefers form_dict.sid over the cookie, so the two must not be able to differ.
    if frappe.form_dict.get("sid"):
        frappe.throw("Invalid AI request", frappe.PermissionError)
    sid = frappe.request.cookies.get("sid")
    if not sid or sid == "Guest":
        frappe.throw("An ERP browser session is required", frappe.PermissionError)

    operation = frappe.form_dict.get("operation")
    company = frappe.form_dict.get("company")
    agent = frappe.form_dict.get("agent")
    raw_data = frappe.form_dict.get("data") or "{}"
    if operation not in OPERATIONS:
        frappe.throw("This AI operation is not available", frappe.PermissionError)
    if not isinstance(raw_data, str) or len(raw_data) > MAX_DATA_CHARS:
        frappe.throw("AI request is too large")
    if company and (not isinstance(company, str) or len(company) > 180):
        frappe.throw("Invalid company")
    if agent and (not isinstance(agent, str) or agent not in AGENTS):
        frappe.throw("This AI agent is not available", frappe.PermissionError)
    data = json.loads(raw_data)
    if not isinstance(data, dict):
        frappe.throw("AI data must be an object")

    # json.dumps escapes non-ASCII, so SQL, hashing and HTTP all see identical bytes.
    # Only the data part enters SQL: never the secret, the sid or the envelope.
    data_json = json.dumps(data, separators=(",", ":"))
    row = frappe.db.sql("select sha2(%s, 256), unix_timestamp(), uuid()", (data_json,))[0]
    envelope = {
        "site": SITE,
        "user": frappe.session.user,
        "sid": sid,
        "timestamp": int(row[1]),
        "nonce": str(row[2]),
        "operation": operation,
        "dataSha256": str(row[0]),
    }
    if company:
        envelope["company"] = company
    if agent:
        envelope["agent"] = agent
    signed = json.dumps(envelope, separators=(",", ":"))

    secret = frappe.get_doc("Durar AI Relay Settings").get_password("relay_secret")
    if not secret or len(secret) < 32:
        frappe.throw("AI relay configuration is incomplete")
    signature = hmac_sha256_hex(secret.encode("utf-8"), ("durar.ai.v2:" + signed).encode("utf-8"))

    result = None
    try:
        result = frappe.make_post_request(
            ENDPOINT,
            data=signed + "\n" + data_json,
            headers={
                "Content-Type": "text/plain; charset=us-ascii",
                "X-Durar-Relay-Version": "2",
                "X-Durar-Signature": signature,
            },
        )
    except Exception:
        result = None
    if not isinstance(result, dict) or not isinstance(result.get("ok"), bool):
        frappe.throw("AI backend is unavailable. Retry using the same message request.")
    if not result["ok"]:
        frappe.throw(str(result.get("error") or "AI request failed")[:300])
    frappe.response["message"] = result.get("result")


relay()
