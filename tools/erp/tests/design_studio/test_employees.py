import pytest

from fixtures import DESIGNER, EMP, employee, make_site
from sandbox import Denied, Thrown, run_api


def test_employees_list_active_only_with_brands():
    rows = {r["employee"]: r for r in run_api(make_site(), DESIGNER, "employees_list")}
    assert "E005" not in rows  # Left
    assert rows["E002"]["allowed_brands"] == ["DM Group", "Najd"]
    assert rows["E003"]["allowed_brands"] == []


def test_employees_gaps():
    site = make_site()
    site.rows["Employee"].append(employee("E007", "Gap Person", "gap@dm.test", company_email=None, cell_number=None))
    rows = {r["employee"]: r for r in run_api(site, DESIGNER, "employees_list")}
    assert rows["E007"]["gaps"] == ["no_email", "no_mobile", "no_name_ar", "no_designation_ar"]
    assert rows["E006"]["gaps"][0] == "no_user"
    only = run_api(site, DESIGNER, "employees_list", {"gap": "no_email"})
    assert sorted(r["employee"] for r in only) == ["E006", "E007"]


def test_employees_filters_query_and_brand():
    site = make_site()
    assert [r["employee"] for r in run_api(site, DESIGNER, "employees_list", {"brand": "Najd"})] == ["E002"]
    assert [r["employee"] for r in run_api(site, DESIGNER, "employees_list", {"q": "hadi"})] == ["E003"]


def test_set_brands_add_replace_remove():
    site = make_site()
    run_api(site, DESIGNER, "employees_set_brands", {"employees": ["E003", "E004"], "brands": ["Najd"], "mode": "add"})
    assert [b["brand"] for b in site.find("Employee", "E003")["custom_design_brands"]] == ["Najd"]
    run_api(site, DESIGNER, "employees_set_brands", {"employees": ["E002"], "brands": ["Qimsco"], "mode": "add"})
    assert [b["brand"] for b in site.find("Employee", "E002")["custom_design_brands"]] == ["Najd", "DM Group", "Qimsco"]
    run_api(site, DESIGNER, "employees_set_brands", {"employees": ["E002"], "brands": ["Najd"], "mode": "remove"})
    assert [b["brand"] for b in site.find("Employee", "E002")["custom_design_brands"]] == ["DM Group", "Qimsco"]


def test_set_brands_replace_clears_invalid_signature_brand():
    site = make_site()
    site.find("Employee", "E002")["custom_signature_brand"] = "Najd"
    res = run_api(site, DESIGNER, "employees_set_brands", {"employees": ["E002"], "brands": ["DMCC"], "mode": "replace"})
    e = site.find("Employee", "E002")
    assert [b["brand"] for b in e["custom_design_brands"]] == ["DMCC"] and e["custom_signature_brand"] is None
    assert res == {"updated": 1, "failed": []}


def test_set_brands_validates():
    with pytest.raises(Thrown, match="Unknown brand"):
        run_api(make_site(), DESIGNER, "employees_set_brands", {"employees": ["E002"], "brands": ["Nope"], "mode": "add"})
    with pytest.raises(Thrown, match="mode"):
        run_api(make_site(), DESIGNER, "employees_set_brands", {"employees": ["E002"], "brands": ["Najd"], "mode": "x"})


def test_arabic_save_marks_verified():
    site = make_site()
    run_api(site, DESIGNER, "arabic_save", {"employee": "E002", "name_ar": "إيمان", "designation": "Sales Executive", "designation_ar": "تنفيذي مبيعات"})
    e = site.find("Employee", "E002")
    d = site.find("Designation", "Sales Executive")
    assert e["custom_name_ar"] == "إيمان" and e["custom_name_ar_verified"] == 1
    assert d["custom_designation_ar"] == "تنفيذي مبيعات" and d["custom_designation_ar_verified"] == 1
    row = [r for r in run_api(site, DESIGNER, "employees_list") if r["employee"] == "E002"][0]
    assert "no_name_ar" not in row["gaps"] and "no_designation_ar" not in row["gaps"]


def test_employee_actions_designer_only():
    for action, data in [("employees_list", {}), ("employees_set_brands", {"employees": [], "brands": [], "mode": "add"}), ("arabic_save", {})]:
        with pytest.raises(Denied):
            run_api(make_site(), EMP, action, data)
