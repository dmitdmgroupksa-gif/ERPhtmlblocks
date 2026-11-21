"""Exercise the CEO Command Centre executive-performance collector (department Performance tabs).

The real functions are extracted from the Server Script and run against an in-memory `get_list` double that applies
filters (=, <, between, in), group_by and count()/sum() aliases, like frappe.get_list. `meta_fields` mirrors the live
helper: meta.fields lists custom/doc fields only, not standard columns such as docstatus or creation.
Expected figures are computed here from the raw rows, independently of the collector.
"""
import ast
import datetime
import pathlib
from types import SimpleNamespace

API = pathlib.Path(__file__).resolve().parents[3] / "01. Leadership & Corporate/CEO Command Center/server_scripts/ceo_command_center_api.py"
NAMES = {"EXECUTIVE_SOURCES", "EXEC_STD_TYPES", "exec_months", "exec_buckets", "exec_add", "executive_performance"}
COMPANIES = [SimpleNamespace(name="Alpha Contracting", default_currency="SAR"), SimpleNamespace(name="Alpha Trading", default_currency="SAR"), SimpleNamespace(name="Alpha Gulf FZE", default_currency="AED")]
ROWS = {
    "Sales Invoice": [
        {"name": "SI1", "status": "Paid", "posting_date": "2026-10-05", "base_grand_total": 1000, "company": "Alpha Contracting", "docstatus": 1},
        {"name": "SI2", "status": "Overdue", "posting_date": "2026-11-02", "base_grand_total": 500, "company": "Alpha Trading", "docstatus": 1},
        {"name": "SI3", "status": "Overdue", "posting_date": "2026-11-03", "base_grand_total": 300, "company": "Alpha Gulf FZE", "docstatus": 1},
        {"name": "SI4", "status": "Cancelled", "posting_date": "2026-11-03", "base_grand_total": 999, "company": "Alpha Trading", "docstatus": 2},
        {"name": "SI5", "status": "Draft", "posting_date": "2026-11-04", "base_grand_total": 777, "company": "Alpha Trading", "docstatus": 0},
        {"name": "SI6", "status": "Paid", "posting_date": "2026-09-30", "base_grand_total": 50, "company": "Alpha Trading", "docstatus": 1},
    ],
    "Task": [
        {"name": "T1", "status": "Open", "creation": "2026-10-10 09:00:00", "docstatus": 0},
        {"name": "T2", "status": "Completed", "creation": "2026-11-16 18:30:00", "docstatus": 0},
        {"name": "T3", "status": "Open", "creation": "2026-11-17 23:00:00", "docstatus": 0},
        {"name": "T4", "status": "Open", "creation": "2026-09-01 09:00:00", "docstatus": 0},
    ],
    "Employee": [{"name": "E1", "status": "Active", "docstatus": 0, "company": "Alpha Trading"}, {"name": "E2", "status": "Left", "docstatus": 0, "company": "Alpha Gulf FZE"}],
}
META = {
    "Sales Invoice": {"status": "Select", "posting_date": "Date", "base_grand_total": "Currency", "company": "Link"},
    "Task": {"status": "Select"},
    "Employee": {"status": "Select", "company": "Link"},
}


def match(row, f):
    field, op, value = f[-3], f[-2], f[-1]
    x = row.get(field)
    if op == "=":
        return x == value
    if op == "<":
        return x is not None and x < value
    if op == "in":
        return x in value
    if op == "between":
        return x is not None and value[0] <= str(x) <= (value[1] if len(value[1]) > 10 else value[1] + "~")
    raise AssertionError(op)


def make(company="", denied=(), missing=None):
    tree = ast.parse(API.read_text(encoding="utf-8"))
    body = [n for n in tree.body if (isinstance(n, ast.FunctionDef) and n.name in NAMES) or (isinstance(n, ast.Assign) and any(getattr(t, "id", "") in NAMES for t in n.targets))]
    out, calls = {}, []

    def gl(dt, fields, filters, order_by=None, group_by=None, limit=500, start=0):
        calls.append((dt, fields, filters, group_by))
        if dt in denied:
            raise PermissionError("No access to " + dt)
        rows = [r for r in ROWS.get(dt, []) if all(match(r, f) for f in filters)]
        groups = {}
        for r in rows:
            groups.setdefault(r.get(group_by) if group_by else "_", []).append(r)
        if not group_by and not groups:
            groups["_"] = []
        res = []
        for k, rs in groups.items():
            o = {group_by: k} if group_by else {}
            for f in fields:
                if f.startswith("count("):
                    o["n"] = len(rs)
                elif f.startswith("sum("):
                    o["v"] = sum(x[f[4:f.index(")")]] for x in rs) if rs else None
            res.append(o)
        return res

    def company_filter(dt, filters):
        if not company:
            return "all"
        if (META.get(dt) or {}).get("company") == "Link":
            filters.append([dt, "company", "=", company])
            return "company"
        return "unscoped"

    def add_months(value, n):
        d = datetime.date.fromisoformat(str(value)[:10])
        m = d.month - 1 + n
        return datetime.date(d.year + m // 12, m % 12 + 1, 1)

    def last_day(value):
        d = datetime.date.fromisoformat(str(value)[:10])
        return add_months(d, 1) - datetime.timedelta(days=1)

    meta = dict(META, **(missing or {}))
    env = dict(meta_fields=lambda dt: meta.get(dt), gl=gl, company_filter=company_filter, companies=COMPANIES, company=company, p_from="2026-10-01", p_to="2026-11-17",
               perf=lambda dept, key, payload: out.update({dept: payload}), classify=lambda e: ("restricted", str(e)),
               frappe=SimpleNamespace(utils=SimpleNamespace(add_months=add_months, get_last_day=last_day, cint=lambda v: int(v or 0), flt=lambda v: float(v or 0))))
    exec(compile(ast.Module(body=body, type_ignores=[]), str(API), "exec"), env)
    env["EXECUTIVE_SOURCES"].update({"t_fin": [["Sales Invoice", "status", "posting_date", "base_grand_total", 1, "Customer invoices", "Credit Controller", "Invoiced value"]],
                                     "t_task": [["Task", "status", "creation", "", 0, "Project tasks", "Technical Department", ""]],
                                     "t_emp": [["Employee", "status", "", "", 0, "Workforce", "Admin HR", ""]]})
    return env, out, calls


def section(env, out, key):
    env["executive_performance"](key)
    return out[key]["sections"][0]


def test_values_stay_per_currency_and_exclude_drafts_and_cancelled():
    env, out, calls = make()
    s = section(env, out, "t_fin")
    in_period = [r for r in ROWS["Sales Invoice"] if r["docstatus"] == 1 and "2026-10-01" <= r["posting_date"] <= "2026-11-17"]
    assert s["state"] == "complete" and s["total"] == len(in_period) == 3
    assert s["values"] == {"SAR": 1500.0, "AED": 300.0}
    overdue = next(x for x in s["statuses"] if x["label"] == "Overdue")
    assert overdue["count"] == 2 and overdue["values"] == {"SAR": 500.0, "AED": 300.0}
    assert [t["label"] for t in s["trend"]] == ["2026-10", "2026-11"]
    assert s["trend"][1]["count"] == 2 and s["trend"][1]["values"] == {"SAR": 500.0, "AED": 300.0}
    assert all(q[3] for q in calls), "only grouped aggregates, never a row download"


def test_company_scope_limits_currency_groups():
    env, out, _ = make(company="Alpha Gulf FZE")
    s = section(env, out, "t_fin")
    assert s["scope"] == "company" and s["values"] == {"AED": 300.0} and s["total"] == 1


def test_standard_datetime_field_is_supported_and_month_edges_hold():
    env, out, _ = make()
    s = section(env, out, "t_task")
    assert s["state"] == "complete", s.get("message")
    assert s["total"] == 3                                    # T4 is before the period; T3 at 23:00 on the last day counts
    assert [(t["label"], t["count"]) for t in s["trend"]] == [("2026-10", 1), ("2026-11", 2)]
    assert s["values"] == {} and s["statuses"][0] == {"label": "Open", "count": 2, "values": {}}


def test_snapshot_without_date_has_no_trend():
    env, out, _ = make()
    s = section(env, out, "t_emp")
    assert s["total"] == 2 and s["trend"] == []


def test_missing_fields_and_permissions_are_states_not_zero():
    env, out, _ = make(missing={"Task": {}})
    s = section(env, out, "t_task")
    assert s["state"] == "not_configured" and "status" in s["message"] and "total" not in s
    env, out, _ = make(denied=("Sales Invoice",))
    s = section(env, out, "t_fin")
    assert s["state"] == "restricted" and "total" not in s


def test_every_department_source_runs():
    env, out, _ = make()
    for dept in ["sales", "procurement", "finance", "people", "projects", "operations", "manufacturing", "it", "legal"]:
        env["executive_performance"](dept)
        assert len(out[dept]["sections"]) == 2
        assert all(s["state"] in ("complete", "not_configured") for s in out[dept]["sections"])


def test_sandbox_rules_in_the_whole_api():
    tree = ast.parse(API.read_text(encoding="utf-8"))
    assert [n.lineno for n in ast.walk(tree) if isinstance(n, ast.AugAssign)] == [], "the live sandbox has no in-place operator guard"
