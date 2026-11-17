"""In-memory Frappe v14 for running design_studio_api.py under RestrictedPython, one request per call.

Guards mirror frappe/utils/safe_exec.py v14.100 (copied semantics from ceopanel's test_server_script_relay.py).
Rows are plain dicts per DocType; get_doc returns Doc objects that write through to those dicts.
"""
import copy
import datetime
import html
import json
import pathlib
import types

import RestrictedPython
from RestrictedPython import compile_restricted, safe_globals

ROOT = pathlib.Path(__file__).resolve().parents[4]
SCRIPT = ROOT / "10. Communication & Productivity" / "Graphic Design Studio" / "server_scripts" / "design_studio_api.py"
UNSAFE = {"format", "format_map", "gi_frame", "gi_code", "f_globals", "f_locals", "f_back", "f_code", "tb_frame"}
NOW = datetime.datetime(2026, 11, 17, 10, 0, 0)
SINGLE = "Design Studio Settings"
CHILD_TABLES = {
    "Design Request": {"files": "Design Request File"},
    "Design Asset": {"brands": "Design Asset Brand"},
    "Design Brand": {"colours": "Design Brand Colour", "fonts": "Design Brand Font"},
    "Employee": {"custom_design_brands": "Employee Allowed Brand"},
    SINGLE: {"certificate_issuers": "Design Studio User", "card_operators": "Design Studio User"},
}


class Thrown(Exception):
    pass


class Denied(Thrown):
    pass


def getattr_guard(obj, name, default=None):
    if name in UNSAFE:
        raise SyntaxError(name)
    if isinstance(obj, (types.ModuleType, types.CodeType, types.TracebackType, types.FrameType)):
        raise SyntaxError(name)
    if name.startswith("_"):
        raise AttributeError(name)
    return RestrictedPython.Guards.safer_getattr(obj, name, default=default)


def getitem_guard(obj, key):
    if isinstance(key, str) and key.startswith("_"):
        raise SyntaxError(key)
    return obj[key]


class Row(dict):
    """frappe._dict: key and attribute access."""

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self.get(name)


def as_date(v):
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    return datetime.date.fromisoformat(str(v)[:10])


def comparable(v):
    return str(v) if isinstance(v, (datetime.date, datetime.datetime)) else v


def match(row, field, op, arg):
    value = row.get(field)
    op = op.lower()
    if op == "=":
        return value == arg
    if op == "!=":
        return value != arg
    if op == "in":
        return value in arg
    if op == "not in":
        return value not in arg
    if op == "like":
        needle = str(arg).strip("%").lower()
        return needle in str(value or "").lower()
    if op == "is":
        return bool(value) if arg == "set" else not value
    if value is None:
        return False
    a, b = comparable(value), comparable(arg)
    return {">": a > b, "<": a < b, ">=": a >= b, "<=": a <= b}[op]


def normalise(filters):
    out = []
    if not filters:
        return out
    if isinstance(filters, dict):
        for k, v in filters.items():
            if isinstance(v, (list, tuple)):
                out.append((k, v[0], v[1] if len(v) > 1 else None))
            else:
                out.append((k, "=", v))
        return out
    for f in filters:
        f = list(f)
        if len(f) == 4:
            f = f[1:]
        out.append((f[0], f[1], f[2] if len(f) > 2 else None))
    return out


class Doc:
    def __init__(self, site, doctype, values, stored):
        self.__dict__["site_"] = site
        self.__dict__["doctype_"] = doctype
        self.__dict__["values_"] = values
        self.__dict__["stored_"] = stored
        for table, child in CHILD_TABLES.get(doctype, {}).items():
            values[table] = [r if isinstance(r, Row) else Row(r, doctype=child) for r in values.get(table) or []]

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        if name == "doctype":
            return self.__dict__["doctype_"]
        return self.__dict__["values_"].get(name)

    def __setattr__(self, name, value):
        self.__dict__["values_"][name] = value

    def get(self, name, default=None):
        v = self.__dict__["values_"].get(name)
        return default if v is None else v

    def set(self, name, value):
        if name in CHILD_TABLES.get(self.__dict__["doctype_"], {}):
            child = CHILD_TABLES[self.__dict__["doctype_"]][name]
            value = [Row(r, doctype=child) for r in value]
        self.__dict__["values_"][name] = value

    def append(self, table, row):
        child = CHILD_TABLES.get(self.__dict__["doctype_"], {}).get(table, "")
        r = Row(row, doctype=child)
        self.__dict__["values_"].setdefault(table, []).append(r)
        return r

    def as_dict(self):
        return copy.deepcopy(dict(self.__dict__["values_"]))

    def insert(self, ignore_permissions=False, **kw):
        site, dt, v = self.__dict__["site_"], self.__dict__["doctype_"], self.__dict__["values_"]
        site.check_write(dt, v, ignore_permissions)
        if not v.get("name"):
            v["name"] = site.new_name(dt, v)
        v.setdefault("owner", site.user)
        v.setdefault("creation", str(NOW))
        v["modified"] = str(NOW)
        site.rows.setdefault(dt, []).append(v)
        self.__dict__["stored_"] = True
        return self

    def save(self, ignore_permissions=False, **kw):
        site, dt, v = self.__dict__["site_"], self.__dict__["doctype_"], self.__dict__["values_"]
        site.check_write(dt, v, ignore_permissions)
        if dt == "File":
            # Frappe moves the physical file when is_private changes, and the URL follows it.
            url = v.get("file_url") or ""
            if not v.get("is_private") and url.startswith("/private/files/"):
                v["file_url"] = url[len("/private"):]
            if v.get("is_private") and url.startswith("/files/"):
                v["file_url"] = "/private" + url
        v["modified"] = str(NOW)
        site.saves.append((dt, v.get("name")))
        return self

    def add_comment(self, comment_type="Comment", text=None, **kw):
        site = self.__dict__["site_"]
        site.rows.setdefault("Comment", []).append({
            "name": "C" + str(len(site.rows.get("Comment", [])) + 1), "comment_type": comment_type,
            "reference_doctype": self.__dict__["doctype_"], "reference_name": self.__dict__["values_"].get("name"),
            "content": text, "owner": site.user, "creation": str(NOW)})


class FakeSite:
    def __init__(self, rows=None, users=None, settings=None):
        self.rows = copy.deepcopy(rows or {})
        self.users = users or {}
        self.settings = settings if settings is not None else {}
        self.sent_mail = []
        self.mail_fails = False
        self.saves = []
        self.user = "Guest"
        self.counter = {}
        self.rows.setdefault("User", [])
        self.rows.setdefault("Has Role", [])
        for user, info in self.users.items():
            self.rows["User"].append({"name": user, "email": info.get("email", user), "enabled": info.get("enabled", 1),
                                      "full_name": info.get("full_name", user.split("@")[0].title())})
            for role in info.get("roles", []):
                self.rows["Has Role"].append({"name": user + role, "parent": user, "parenttype": "User", "role": role})

    @property
    def files(self):
        return {f["file_url"]: f for f in self.rows.get("File", [])}

    # ---- storage helpers
    def table(self, doctype):
        if doctype == SINGLE:
            return [dict(self.settings, name=SINGLE)]
        children = []
        for parent, tables in CHILD_TABLES.items():
            for field, child in tables.items():
                if child == doctype:
                    for row in self.table(parent):
                        for i, r in enumerate(row.get(field) or []):
                            children.append(dict(r, parent=row.get("name"), parenttype=parent, parentfield=field, idx=i + 1))
        if children:
            return children
        return self.rows.get(doctype, [])

    def find(self, doctype, name):
        for r in self.table(doctype):
            if r.get("name") == name:
                return r
        return None

    def new_name(self, doctype, v):
        n = self.counter.get(doctype, 0) + 1
        self.counter[doctype] = n
        if doctype == "Design Request":
            return "DR-" + str(n).zfill(5)
        if doctype == "Design Brand":
            return v.get("brand_name")
        return doctype.replace(" ", "")[:4].upper() + str(n).zfill(4)

    def check_write(self, doctype, values, ignore_permissions):
        # Mirrors the DocType permissions: Employees may only create/write their own Design Request.
        if ignore_permissions:
            return
        roles = set(self.users.get(self.user, {}).get("roles", []))
        if roles & {"System Manager", "Design Manager"}:
            return
        if doctype == "Design Request" and "Employee" in roles and values.get("owner", self.user) == self.user:
            return
        raise Denied("No permission to write " + doctype)

    # ---- the frappe object for one request
    def frappe(self, user, form=None):
        site = self
        site.user = user
        response = {}

        def get_all(doctype, filters=None, fields=None, order_by=None, limit_start=0, limit_page_length=None,
                    or_filters=None, pluck=None, limit=None, **kw):
            rows = [r for r in site.table(doctype) if all(match(r, *f) for f in normalise(filters))]
            if or_filters:
                rows = [r for r in rows if any(match(r, *f) for f in normalise(or_filters))]
            if order_by:
                for part in reversed([p.strip() for p in order_by.split(",")]):
                    bits = part.split()
                    key = bits[0].split(".")[-1].strip("`")
                    rows = sorted(rows, key=lambda r: (r.get(key) is None, comparable(r.get(key)) if r.get(key) is not None else ""),
                                  reverse=len(bits) > 1 and bits[1].lower() == "desc")
            page = limit_page_length if limit_page_length is not None else limit
            rows = rows[limit_start:]
            if page:
                rows = rows[:page]
            if pluck:
                return [r.get(pluck) for r in rows]
            names = fields or ["name"]
            if names == ["*"]:
                return [Row(copy.deepcopy(r)) for r in rows]
            return [Row({f: copy.deepcopy(r.get(f)) for f in names}) for r in rows]

        def get_doc(arg, name=None):
            if isinstance(arg, dict):
                return Doc(site, arg["doctype"], {k: v for k, v in arg.items() if k != "doctype"}, False)
            if arg == SINGLE:
                return Doc(site, SINGLE, site.settings, True)
            row = site.find(arg, name)
            if row is None:
                raise Thrown(arg + " " + str(name) + " not found")
            return Doc(site, arg, row, True)

        def get_value(doctype, name, fieldname="name", as_dict=False):
            if isinstance(name, dict):
                found = get_all(doctype, filters=name, fields=["*"], limit_page_length=1)
                row = found[0] if found else None
            else:
                row = site.find(doctype, name)
            if row is None:
                return None
            if isinstance(fieldname, (list, tuple)):
                vals = {f: row.get(f) for f in fieldname}
                return Row(vals) if as_dict else tuple(vals[f] for f in fieldname)
            return row.get(fieldname)

        def exists(doctype, name=None):
            if isinstance(name, dict):
                found = get_all(doctype, filters=name, limit_page_length=1)
                return found[0]["name"] if found else None
            return name if site.find(doctype, name) else None

        def set_value(doctype, name, field, value=None):
            row = site.find(doctype, name)
            if row is None:
                raise Thrown("missing " + doctype + " " + str(name))
            if isinstance(field, dict):
                row.update(field)
            else:
                row[field] = value

        def count(doctype, filters=None):
            return len(get_all(doctype, filters=filters))

        def sendmail(recipients=None, subject=None, message=None, **kw):
            if site.mail_fails:
                raise Thrown("SMTP not configured")
            site.sent_mail.append(dict(recipients=recipients, subject=subject, message=message, **kw))

        def throw(message, exc=None, title=None):
            raise (exc or Thrown)(message)

        def add_days(d, n):
            return as_date(d) + datetime.timedelta(days=int(n))

        def date_diff(a, b):
            return (as_date(a) - as_date(b)).days

        utils = types.SimpleNamespace(
            now=lambda: str(NOW), nowdate=lambda: str(NOW.date()), today=lambda: str(NOW.date()), now_datetime=lambda: NOW,
            getdate=lambda v=None: as_date(v) if v else NOW.date(), add_days=add_days, date_diff=date_diff,
            escape_html=lambda s: html.escape(str(s or ""), quote=True), cint=lambda v: int(float(v or 0)),
            cstr=lambda v: "" if v is None else str(v), strip_html=lambda s: str(s or ""),
            get_url_to_form=lambda dt, n: "https://erp.test/app/" + dt.lower().replace(" ", "-") + "/" + n,
            get_url=lambda path="": "https://erp.test" + (path or ""))
        db = types.SimpleNamespace(get_value=get_value, get_single_value=lambda dt, f: site.settings.get(f), exists=exists,
                                   set_value=set_value, count=count, get_all=get_all, get_list=get_all,
                                   commit=lambda: None, rollback=lambda: None)
        return types.SimpleNamespace(
            get_all=get_all, get_list=get_all, get_doc=get_doc, db=db, utils=utils, sendmail=sendmail, throw=throw,
            PermissionError=Denied, ValidationError=Thrown, DoesNotExistError=Thrown,
            session=types.SimpleNamespace(user=user), form_dict=form or {}, response=response,
            get_fullname=lambda u=None: (site.find("User", u or user) or {}).get("full_name", u), log_error=lambda *a, **k: None)


CODE = None


def run_api(site, user, action, data=None, **extra):
    global CODE
    if CODE is None or CODE[0] != SCRIPT.stat().st_mtime:
        CODE = (SCRIPT.stat().st_mtime, compile_restricted(SCRIPT.read_text(encoding="utf-8"), "<serverscript>", "exec"))
    form = {"action": action, "data": json.dumps(data if data is not None else extra, default=str)}
    frappe = site.frappe(user, form)
    scope = {
        **safe_globals, "frappe": frappe, "json": types.SimpleNamespace(loads=json.loads, dumps=json.dumps),
        "_getattr_": getattr_guard, "_getitem_": getitem_guard, "_write_": lambda o: o, "_getiter_": iter,
        "_iter_unpack_sequence_": RestrictedPython.Guards.guarded_iter_unpack_sequence,
        "list": list, "dict": dict, "set": set, "range": range, "max": max, "min": min, "sorted": sorted,
        "sum": sum, "any": any, "all": all, "enumerate": enumerate, "isinstance": isinstance, "tuple": tuple,
    }
    exec(CODE[1], scope)
    return json.loads(json.dumps(frappe.response.get("message"), default=str))
