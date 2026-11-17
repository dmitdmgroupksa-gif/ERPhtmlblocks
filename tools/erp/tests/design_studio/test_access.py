import pytest

from fixtures import ADMIN, BRANDS, DESIGNER, EMP, HR, IT, NOEMP, OFF, make_site
from sandbox import Denied, Thrown, run_api


def test_designer_bootstrap_tabs():
    b = run_api(make_site(), DESIGNER, "bootstrap")
    assert b["tabs"] == ["overview", "requests", "brands", "library", "employees", "access"]
    assert b["roles"]["designer"] is True
    assert b["allowed_brands"] == BRANDS
    assert b["employee"]["name"] == "E001"
    assert b["designer_set"] is True and b["api_version"] == "1" and b["today"] == "2026-11-17"


def test_employee_bootstrap_tabs_and_allowed_brands():
    b = run_api(make_site(), EMP, "bootstrap")
    assert b["tabs"] == ["brands", "library"]
    assert b["roles"] == {"designer": False, "admin": False, "issuer": False, "operator": False}
    assert b["allowed_brands"] == ["DM Group", "Najd"]  # brand sort order, not assignment order
    assert b["employee"]["employee_name"] == "Eman Employee"


def test_employee_allowed_brands_default():
    b = run_api(make_site(), HR, "bootstrap")
    assert b["allowed_brands"] == ["DM Group"]


def test_bootstrap_without_employee():
    b = run_api(make_site(), NOEMP, "bootstrap")
    assert b["employee"] is None
    assert b["tabs"] == ["brands", "library"]
    assert b["allowed_brands"] == []


def test_no_designer_configured():
    site = make_site(designer=None)
    b = run_api(site, ADMIN, "bootstrap")
    assert b["designer_set"] is False
    assert b["tabs"] == ["brands", "access"]
    assert b["roles"]["admin"] is True and b["roles"]["designer"] is False
    with pytest.raises(Denied):
        run_api(site, EMP, "access_get")
    # nobody gets designer actions while unset, not even the Design Manager role holder
    assert run_api(site, DESIGNER, "bootstrap")["roles"]["designer"] is False


def test_admin_sets_first_designer_only():
    site = make_site(designer=None)
    run_api(site, ADMIN, "access_set", {"designer": DESIGNER})
    assert site.settings["designer"] == DESIGNER
    with pytest.raises(Denied):
        run_api(site, ADMIN, "access_set", {"designer": EMP})


def test_access_get_lists_candidates():
    a = run_api(make_site(), DESIGNER, "access_get")
    assert a["designer"] == DESIGNER
    users = [c["user"] for c in a["candidates"]]
    assert EMP in users and HR in users and NOEMP not in users  # active employees with a user only


def test_access_set_requires_designer():
    with pytest.raises(Denied):
        run_api(make_site(), EMP, "access_set", {"certificate_issuers": [EMP]})


def test_access_set_rejects_disabled_user():
    with pytest.raises(Thrown, match="not an enabled user"):
        run_api(make_site(), DESIGNER, "access_set", {"certificate_issuers": [OFF]})


def test_issuer_and_operator_flags():
    site = make_site()
    run_api(site, DESIGNER, "access_set", {"certificate_issuers": [HR], "card_operators": [IT]})
    assert [r["user"] for r in site.settings["certificate_issuers"]] == [HR]
    assert run_api(site, HR, "bootstrap")["roles"]["issuer"] is True
    assert run_api(site, IT, "bootstrap")["roles"]["operator"] is True
    assert run_api(site, EMP, "bootstrap")["roles"]["issuer"] is False
    comments = [c for c in site.rows.get("Comment", []) if c["reference_doctype"] == "Design Studio Settings"]
    assert comments and "Access changed by" in comments[-1]["content"]
