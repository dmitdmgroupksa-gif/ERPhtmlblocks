import pytest

from fixtures import DESIGNER, EMP, make_site
from sandbox import Denied, Thrown, run_api


def asset(name, status="Published", url=None, brands=("DM Group",), **kw):
    row = {"name": name, "title": "Asset " + name, "asset_type": "Logo", "status": status, "version": 1,
           "brands": [{"brand": b} for b in brands], "file": url, "tags": "logo, blue", "download_count": 0}
    row.update(kw)
    return row


def file_row(url, asset_name, private):
    return {"name": "F-" + url.rsplit("/", 1)[-1], "file_url": url, "is_private": private,
            "attached_to_doctype": "Design Asset", "attached_to_name": asset_name}


def library_site():
    site = make_site()
    site.rows["Design Asset"] = [
        asset("A1", url="/files/a1.png"),
        asset("A2", status="Draft", url="/private/files/a2.png"),
        asset("A3", status="Archived", url="/private/files/a3.png"),
        asset("A4", url="/files/a4.svg", brands=("Najd",), asset_type="Print", title="Najd flyer"),
    ]
    site.rows["File"] = [file_row("/files/a1.png", "A1", 0), file_row("/private/files/a2.png", "A2", 1),
                         file_row("/private/files/a3.png", "A3", 1), file_row("/files/a4.svg", "A4", 0)]
    return site


def test_employee_sees_only_published_assets():
    res = run_api(library_site(), EMP, "assets_list", {"status": "Draft"})
    assert sorted(r["name"] for r in res["rows"]) == ["A1", "A4"] and res["total"] == 2


def test_designer_filters_by_status_brand_and_query():
    site = library_site()
    assert [r["name"] for r in run_api(site, DESIGNER, "assets_list", {"status": "Draft"})["rows"]] == ["A2"]
    assert [r["name"] for r in run_api(site, DESIGNER, "assets_list", {"brand": "Najd"})["rows"]] == ["A4"]
    assert [r["name"] for r in run_api(site, DESIGNER, "assets_list", {"q": "flyer"})["rows"]] == ["A4"]
    assert run_api(site, DESIGNER, "assets_list", {"brand": "Najd"})["rows"][0]["brands"] == ["Najd"]


def test_publish_makes_file_public_and_archives_previous():
    site = library_site()
    site.rows["Design Asset"].append(asset("A5", status="Draft", url="/private/files/a5.png", previous_version="A1", version=2))
    site.rows["File"].append(file_row("/private/files/a5.png", "A5", 1))
    run_api(site, DESIGNER, "asset_publish", {"name": "A5"})
    a5 = site.find("Design Asset", "A5")
    assert a5["status"] == "Published" and a5["file"] == "/files/a5.png"
    assert site.files["/files/a5.png"]["is_private"] == 0
    a1 = site.find("Design Asset", "A1")
    assert a1["status"] == "Archived" and a1["file"] == "/private/files/a1.png"


def test_archive_makes_file_private():
    site = library_site()
    run_api(site, DESIGNER, "asset_archive", {"name": "A4"})
    a4 = site.find("Design Asset", "A4")
    assert a4["status"] == "Archived" and a4["file"] == "/private/files/a4.svg"
    assert site.files["/private/files/a4.svg"]["is_private"] == 1


def test_new_version_increments():
    site = library_site()
    new = run_api(site, DESIGNER, "asset_new_version", {"name": "A1"})["name"]
    row = site.find("Design Asset", new)
    assert row["version"] == 2 and row["previous_version"] == "A1" and row["status"] == "Draft"
    assert row["title"] == "Asset A1" and [b["brand"] for b in row["brands"]] == ["DM Group"] and not row.get("file")


def test_asset_save_creates_and_validates():
    site = library_site()
    name = run_api(site, DESIGNER, "asset_save", {"title": "New logo", "asset_type": "Logo", "brands": ["Najd", "DMCC"], "tags": "x"})["name"]
    row = site.find("Design Asset", name)
    assert row["status"] == "Draft" and [b["brand"] for b in row["brands"]] == ["Najd", "DMCC"]
    with pytest.raises(Thrown, match="Unknown brand"):
        run_api(site, DESIGNER, "asset_save", {"title": "Bad", "asset_type": "Logo", "brands": ["Nope"]})
    with pytest.raises(Thrown, match="Title"):
        run_api(site, DESIGNER, "asset_save", {"title": " ", "asset_type": "Logo"})


def test_asset_hit_counts_published_only():
    site = library_site()
    run_api(site, EMP, "asset_hit", {"name": "A1"})
    run_api(site, EMP, "asset_hit", {"name": "A1"})
    assert site.find("Design Asset", "A1")["download_count"] == 2
    with pytest.raises(Denied):
        run_api(site, EMP, "asset_hit", {"name": "A2"})


def test_brands_list_hides_unpublished_logo_file():
    site = library_site()
    dm = site.find("Design Brand", "DM Group")
    dm.update(logo_primary="A1", logo_dark="A2", website="www.dmgroupksa.com",
              colours=[{"colour_name": "Royal", "hex": "#103ba9", "rgb": "16 59 169", "cmyk": "", "role": "Primary"}],
              fonts=[{"family": "Montserrat", "weight": "700", "script": "Latin", "font_file": "A2"}])
    out = {b["name"]: b for b in run_api(site, EMP, "brands_list")}
    dmb = out["DM Group"]
    assert dmb["logos"]["primary"]["file"] == "/files/a1.png"
    assert dmb["logos"]["dark"] is None and dmb["logos"]["mono"] is None
    assert dmb["fonts"][0]["file"] is None and dmb["colours"][0]["hex"] == "#103ba9"
    assert list(out) == ["DM Group", "Najd", "Qimsco", "FCrystal", "DMCC", "Asas"]


def test_brand_save_replaces_tables():
    site = library_site()
    run_api(site, DESIGNER, "brand_save", {"name": "Najd", "website": "najd.test", "colours": [{"colour_name": "Navy", "hex": "#23468F"}], "fonts": []})
    najd = site.find("Design Brand", "Najd")
    assert najd["website"] == "najd.test" and [c["hex"] for c in najd["colours"]] == ["#23468F"]


def test_non_designer_cannot_save_assets_or_brands():
    site = library_site()
    for action, data in [("asset_save", {"title": "x", "asset_type": "Logo"}), ("asset_publish", {"name": "A2"}),
                         ("asset_archive", {"name": "A1"}), ("asset_new_version", {"name": "A1"}), ("brand_save", {"name": "Najd"})]:
        with pytest.raises(Denied):
            run_api(site, EMP, action, data)
