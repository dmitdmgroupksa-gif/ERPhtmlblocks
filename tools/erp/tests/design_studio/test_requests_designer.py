import pytest

from fixtures import DESIGNER, EMP, HR, make_site
from sandbox import Denied, Thrown, run_api
from test_requests_employee import attach_file, submit


def deliverable(site, **over):
    name = submit(site, **over)
    attach_file(site, name, "/private/files/final.pdf")
    run_api(site, DESIGNER, "request_attach", {"name": name, "file_url": "/private/files/final.pdf", "kind": "Delivery", "note": "Print PDF"})
    site.sent_mail.clear()
    return name


def test_board_groups_and_counts():
    site = make_site()
    a = submit(site)
    b = submit(site, title="Showroom banner", needed_by="2026-11-20")
    c = submit(site, user=HR, brand=None, title="Late poster", needed_by="2026-11-18")
    site.find("Design Request", b)["status"] = "In progress"
    site.find("Design Request", c)["needed_by"] = "2026-11-10"  # now overdue
    board = run_api(site, DESIGNER, "requests_board")
    assert [r["name"] for r in board["columns"]["Submitted"]] == [a, c] or [r["name"] for r in board["columns"]["Submitted"]] == [c, a]
    assert [r["name"] for r in board["columns"]["In progress"]] == [b]
    assert board["counts"] == {"Submitted": 2, "In progress": 1, "Needs info": 0, "Delivered": 0}
    assert board["overdue"] == 1 and board["due_this_week"] == 1
    late = [r for r in board["columns"]["Submitted"] if r["name"] == c][0]
    assert late["overdue"] is True and late["employee_name"] == "Hadi HR"
    assert [r["name"] for r in run_api(site, DESIGNER, "requests_board", {"q": "banner"})["columns"]["In progress"]] == [b]


def test_board_non_designer_denied():
    with pytest.raises(Denied):
        run_api(make_site(), EMP, "requests_board")


def test_update_statuses():
    site = make_site()
    name = submit(site)
    run_api(site, DESIGNER, "request_update", {"name": name, "status": "In progress"})
    assert site.find("Design Request", name)["status"] == "In progress"
    with pytest.raises(Thrown, match="status"):
        run_api(site, DESIGNER, "request_update", {"name": name, "status": "Delivered"})
    with pytest.raises(Denied):
        run_api(site, EMP, "request_update", {"name": name, "status": "Closed"})


def test_needs_info_requires_note_and_emails():
    site = make_site()
    name = submit(site)
    site.sent_mail.clear()
    with pytest.raises(Thrown, match="question"):
        run_api(site, DESIGNER, "request_update", {"name": name, "status": "Needs info"})
    run_api(site, DESIGNER, "request_update", {"name": name, "status": "Needs info", "note": "Which logo version?"})
    row = site.find("Design Request", name)
    assert row["status"] == "Needs info" and row["designer_note"] == "Which logo version?"
    assert site.sent_mail[-1]["recipients"] == [EMP] and "Which logo version?" in site.sent_mail[-1]["message"]


def test_deliver_requires_delivery_file():
    site = make_site()
    name = submit(site)
    with pytest.raises(Thrown, match="finished file"):
        run_api(site, DESIGNER, "request_deliver", {"name": name})


def test_deliver_sends_email_with_links():
    site = make_site()
    name = deliverable(site)
    res = run_api(site, DESIGNER, "request_deliver", {"name": name, "note": "Enjoy"})
    row = site.find("Design Request", name)
    assert row["status"] == "Delivered" and row["delivered_on"] == "2026-11-17 10:00:00" and row["designer_note"] == "Enjoy"
    assert res == {"name": name, "notified": 1, "notify_error": None}
    mail = site.sent_mail[-1]
    assert mail["recipients"] == [EMP] and mail["subject"] == "Your design is ready: Ramadan flyer"
    assert "https://erp.test/private/files/final.pdf" in mail["message"] and "Enjoy" in mail["message"]
    assert row["notified"] == 1


def test_deliver_email_failure_keeps_delivered():
    site = make_site()
    name = deliverable(site)
    site.mail_fails = True
    res = run_api(site, DESIGNER, "request_deliver", {"name": name})
    row = site.find("Design Request", name)
    assert row["status"] == "Delivered" and row["notified"] == 0 and res["notified"] == 0
    assert "SMTP" in row["notify_error"] and res["notify_error"] == row["notify_error"]


def test_deliver_requester_without_email():
    site = make_site()
    name = deliverable(site)
    [u for u in site.rows["User"] if u["name"] == EMP][0]["email"] = None
    res = run_api(site, DESIGNER, "request_deliver", {"name": name})
    assert res["notified"] == 0 and res["notify_error"] == "Requester has no email address"
    assert site.find("Design Request", name)["status"] == "Delivered"


def test_email_body_escapes_html():
    site = make_site()
    name = deliverable(site, title="<script>x</script> flyer")
    run_api(site, DESIGNER, "request_deliver", {"name": name, "note": "<b>hi</b>"})
    msg = site.sent_mail[-1]["message"]
    assert "<script>" not in msg and "&lt;script&gt;" in msg and "&lt;b&gt;hi&lt;/b&gt;" in msg


def test_delivered_shows_in_my_requests():
    site = make_site()
    name = deliverable(site)
    run_api(site, DESIGNER, "request_deliver", {"name": name})
    mine = run_api(site, EMP, "my_requests")[0]
    assert mine["status"] == "Delivered" and mine["files"][0]["kind"] == "Delivery"


def test_save_to_library_creates_draft_asset():
    site = make_site()
    name = deliverable(site)
    res = run_api(site, DESIGNER, "request_save_to_library", {"name": name, "file_url": "/private/files/final.pdf",
                                                                "title": "Ramadan flyer A5", "asset_type": "Print", "brands": ["Najd"]})
    asset = site.find("Design Asset", res["asset"])
    assert asset["status"] == "Draft" and asset["file"] == "/private/files/final.pdf" and [b["brand"] for b in asset["brands"]] == ["Najd"]
    assert any(f["attached_to_doctype"] == "Design Asset" and f["attached_to_name"] == res["asset"] for f in site.rows["File"])
    with pytest.raises(Thrown, match="finished file"):
        run_api(site, DESIGNER, "request_save_to_library", {"name": name, "file_url": "/private/files/nope.pdf", "title": "x", "asset_type": "Print"})
