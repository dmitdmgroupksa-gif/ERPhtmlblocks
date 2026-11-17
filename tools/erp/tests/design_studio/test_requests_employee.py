import pytest

from fixtures import DESIGNER, EMP, HR, NOEMP, make_site
from sandbox import Denied, Thrown, run_api

GOOD = {"title": "Ramadan flyer", "request_type": "Flyer", "brand": "Najd", "needed_by": "2026-11-30", "priority": "High",
        "brief": "A5 flyer for the showroom with the Ramadan offer."}


def submit(site, user=EMP, **over):
    return run_api(site, user, "request_submit", dict(GOOD, **over))["name"]


def attach_file(site, name, url):
    site.rows.setdefault("File", []).append({"name": "F" + url, "file_url": url, "is_private": 1,
                                             "attached_to_doctype": "Design Request", "attached_to_name": name})


def test_submit_valid():
    site = make_site()
    name = submit(site)
    row = site.find("Design Request", name)
    assert name == "DR-00001"
    assert row["status"] == "Submitted" and row["requested_by"] == EMP and row["employee"] == "E002"
    assert row["employee_name"] == "Eman Employee" and row["brand"] == "Najd" and row["priority"] == "High"
    mail = site.sent_mail[-1]
    assert mail["recipients"] == [DESIGNER] and mail["subject"] == "New design request DR-00001: Ramadan flyer"


def test_submit_defaults_brand_when_only_one_allowed():
    site = make_site()
    name = submit(site, user=HR, brand=None)
    assert site.find("Design Request", name)["brand"] == "DM Group"


def test_submit_without_designer_notification():
    site = make_site(notify_designer_on_new=0)
    submit(site)
    assert site.sent_mail == []


def test_submit_rejects_brand_not_allowed():
    with pytest.raises(Thrown, match="brand"):
        submit(make_site(), brand="DMCC")


def test_submit_rejects_past_date_and_short_title():
    with pytest.raises(Thrown, match="date"):
        submit(make_site(), needed_by="2026-11-01")
    with pytest.raises(Thrown, match="Title"):
        submit(make_site(), title="ab")
    with pytest.raises(Thrown, match="brief"):
        submit(make_site(), brief="short")
    with pytest.raises(Thrown, match="type"):
        submit(make_site(), request_type="Tattoo")


def test_submit_requires_employee():
    with pytest.raises(Thrown, match="employee record"):
        submit(make_site(), user=NOEMP)


def test_submit_survives_mail_failure():
    site = make_site()
    site.mail_fails = True
    assert submit(site) == "DR-00001"


def test_my_requests_only_own():
    site = make_site()
    submit(site)
    submit(site, user=HR, brand=None)
    mine = run_api(site, EMP, "my_requests")
    assert [r["name"] for r in mine] == ["DR-00001"]
    assert mine[0]["status"] == "Submitted" and mine[0]["files"] == []


def test_request_get_other_user_denied():
    site = make_site()
    name = submit(site)
    with pytest.raises(Denied):
        run_api(site, HR, "request_get", {"name": name})
    assert run_api(site, DESIGNER, "request_get", {"name": name})["brief"] == GOOD["brief"]
    assert run_api(site, EMP, "request_get", {"name": name})["title"] == "Ramadan flyer"


def test_attach_reference_file():
    site = make_site()
    name = submit(site)
    attach_file(site, name, "/private/files/ref.png")
    run_api(site, EMP, "request_attach", {"name": name, "file_url": "/private/files/ref.png", "kind": "Reference", "note": "logo"})
    files = run_api(site, EMP, "request_get", {"name": name})["files"]
    assert files == [{"kind": "Reference", "file": "/private/files/ref.png", "note": "logo", "added_on": "2026-11-17 10:00:00"}]


def test_attach_other_users_request_denied():
    site = make_site()
    name = submit(site)
    attach_file(site, name, "/private/files/x.png")
    with pytest.raises(Denied):
        run_api(site, HR, "request_attach", {"name": name, "file_url": "/private/files/x.png", "kind": "Reference"})


def test_attach_file_not_on_request_denied():
    site = make_site()
    name = submit(site)
    attach_file(site, "DR-09999", "/private/files/other.png")
    with pytest.raises(Thrown, match="not attached"):
        run_api(site, EMP, "request_attach", {"name": name, "file_url": "/private/files/other.png", "kind": "Reference"})


def test_requester_cannot_attach_delivery():
    site = make_site()
    name = submit(site)
    attach_file(site, name, "/private/files/d.png")
    with pytest.raises(Denied):
        run_api(site, EMP, "request_attach", {"name": name, "file_url": "/private/files/d.png", "kind": "Delivery"})


def test_cancel_only_when_submitted():
    site = make_site()
    name = submit(site)
    run_api(site, EMP, "request_cancel", {"name": name})
    assert site.find("Design Request", name)["status"] == "Cancelled"
    with pytest.raises(Thrown, match="Submitted"):
        run_api(site, EMP, "request_cancel", {"name": name})


def test_changes_only_when_delivered_and_emails_designer():
    site = make_site()
    name = submit(site)
    with pytest.raises(Thrown, match="delivered"):
        run_api(site, EMP, "request_changes", {"name": name, "note": "Bigger logo"})
    site.find("Design Request", name)["status"] = "Delivered"
    with pytest.raises(Thrown, match="note"):
        run_api(site, EMP, "request_changes", {"name": name, "note": " "})
    run_api(site, EMP, "request_changes", {"name": name, "note": "Bigger logo please"})
    row = site.find("Design Request", name)
    assert row["status"] == "Submitted" and row["change_note"] == "Bigger logo please"
    assert site.sent_mail[-1]["recipients"] == [DESIGNER] and "Bigger logo please" in site.sent_mail[-1]["message"]


def test_reply_to_needs_info():
    site = make_site()
    name = submit(site)
    with pytest.raises(Thrown, match="Needs info"):
        run_api(site, EMP, "request_reply", {"name": name, "text": "Here"})
    site.find("Design Request", name)["status"] = "Needs info"
    run_api(site, EMP, "request_reply", {"name": name, "text": "Use the blue logo"})
    assert site.find("Design Request", name)["status"] == "Submitted"
    timeline = run_api(site, EMP, "request_get", {"name": name})["timeline"]
    assert timeline[-1]["text"] == "Use the blue logo" and timeline[-1]["by"] == "Eman Employee"
