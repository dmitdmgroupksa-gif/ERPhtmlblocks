import pytest

from sandbox import FakeSite, Thrown, run_api


def test_unknown_action_throws():
    site = FakeSite()
    with pytest.raises(Thrown, match="Unknown action"):
        run_api(site, "a@x.com", "nope")


def test_fake_filters_and_paging():
    site = FakeSite(rows={"Thing": [{"name": "a", "n": 1, "tag": "red"}, {"name": "b", "n": 5, "tag": "blue"}, {"name": "c", "n": 9, "tag": "red"}]})
    f = site.frappe("x@x.com")
    assert [r["name"] for r in f.get_all("Thing", filters={"tag": "red"}, fields=["name"], order_by="n desc")] == ["c", "a"]
    assert [r["name"] for r in f.get_all("Thing", filters=[["n", ">=", 5]], fields=["name"])] == ["b", "c"]
    assert [r["name"] for r in f.get_all("Thing", filters={"name": ["in", ["a", "b"]]}, fields=["name"], limit_start=1, limit_page_length=1)] == ["b"]
    assert f.db.count("Thing", {"tag": ["like", "%e%"]}) == 3
