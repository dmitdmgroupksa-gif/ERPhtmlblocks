"""Run the Treasury Dashboard Server Script against an in-memory frappe double.

Checks that the group view never adds balances from companies in another currency, that a selected company is shown in
its own currency, and that the script keeps to the live sandbox rules (no tuple-unpacking or augmented assignment).
"""
import ast
import datetime
import pathlib
from types import SimpleNamespace

import pytest

SCRIPT = pathlib.Path(__file__).resolve().parents[3] / "04. Finance & Credit Control/Treasury Dashboard/server_scripts/treasury_dashboard_data_66d24f75.py"
COMPANIES = {"Alpha Contracting": "SAR", "Alpha Trading": "SAR", "Alpha Gulf FZE": "AED"}
ACCOUNTS = [
    ("Bank A - AC", "Alpha Contracting", 1000.0), ("Bank B - AT", "Alpha Trading", 2500.0),
    ("Cash - AT", "Alpha Trading", 40.0), ("Bank C - AG", "Alpha Gulf FZE", 9000.0),
]


class R(dict):
    __getattr__ = dict.get


def d(v):
    return v if isinstance(v, datetime.date) else datetime.date.fromisoformat(str(v)[:10])


def add_months(v, n):
    v = d(v)
    m = v.month - 1 + n
    y = v.year + m // 12
    m = m % 12 + 1
    last = (datetime.date(y + (m == 12), m % 12 + 1, 1) - datetime.timedelta(days=1)).day
    return datetime.date(y, m, min(v.day, last))


def last_day(v):
    v = d(v)
    return add_months(v.replace(day=1), 1) - datetime.timedelta(days=1)


def run(form):
    out = {}

    def sql(q, params=None, as_dict=False):
        params = params or {}
        if "tabHas Role" in q:
            return []
        if "from `tabAccount`" in q:
            return [R(name=a, company=c, account_type="Cash" if a.startswith("Cash") else "Bank", account_currency=COMPANIES[c], restricted=0) for a, c, _ in ACCOUNTS if c in params["c"]]
        if "from `tabGL Entry`" in q and "group by account" in q:
            return [R(account=a, bal=b, bal_ac=b, last_txn=datetime.date(2026, 11, 10)) for a, c, b in ACCOUNTS if a in params["a"]]
        if "ifnull(sum(outstanding_amount" in q:
            return [[0]]
        return []

    frappe = SimpleNamespace(
        session=SimpleNamespace(user="Administrator"), form_dict=form, response=out,
        db=SimpleNamespace(sql=sql, get_single_value=lambda dt, f: 0 if f == "min_cash_buffer" else "", get_default=lambda k: "SAR"),
        get_all=lambda dt, fields=None, pluck=None: [R(name=n, default_currency=c) for n, c in COMPANIES.items()],
        throw=lambda m: (_ for _ in ()).throw(Exception(m)), log_error=lambda **k: None,
        utils=SimpleNamespace(getdate=d, nowdate=lambda: "2026-11-17", flt=lambda v, p=None: round(float(v or 0), p) if p is not None else float(v or 0),
                              add_days=lambda v, n: d(v) + datetime.timedelta(days=n), cstr=lambda v: "" if v is None else str(v),
                              add_months=add_months, get_last_day=last_day, date_diff=lambda a, b: (d(a) - d(b)).days))
    exec(compile(SCRIPT.read_text(encoding="utf-8"), str(SCRIPT), "exec"), {"frappe": frappe})
    return out["message"]


def test_group_view_adds_only_system_currency_companies():
    m = run({})
    assert m["currency"] == "SAR"
    assert m["summary"]["total_balance"] == 3540.0
    assert {a["company"] for a in m["accounts"]} == {"Alpha Contracting", "Alpha Trading"}
    assert m["other_currency_companies"] == ["Alpha Gulf FZE"]


def test_selected_company_uses_its_own_currency():
    m = run({"company": "Alpha Gulf FZE"})
    assert m["currency"] == "AED" and m["summary"]["total_balance"] == 9000.0 and m["other_currency_companies"] == []


@pytest.mark.parametrize("node", [ast.AugAssign])
def test_sandbox_rules(node):
    tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    assert [n.lineno for n in ast.walk(tree) if isinstance(n, node)] == []
    assert [n.lineno for n in ast.walk(tree) if isinstance(n, ast.Assign) and any(isinstance(t, (ast.Tuple, ast.List)) for t in n.targets)] == []
