"""Shared Graphic Design Studio test data: one designer, staff with and without Employee records, six brands."""
from sandbox import FakeSite

BRANDS = ["DM Group", "Najd", "Qimsco", "FCrystal", "DMCC", "Asas"]
DESIGNER = "designer@dm.test"
EMP = "emp@dm.test"
HR = "hr@dm.test"
IT = "it@dm.test"
ADMIN = "admin@dm.test"
NOEMP = "noemp@dm.test"
OFF = "off@dm.test"


def employee(eid, name, user, **kw):
    row = {"name": eid, "employee_name": name, "user_id": user, "status": "Active", "designation": "Sales Executive",
           "department": "Sales - DMG", "custom_job_location": "Head Office Riyadh", "company_email": user,
           "cell_number": "+966500000000", "company": "Durar Masagh Trading Company", "custom_design_brands": [],
           "custom_signature_brand": None, "custom_name_ar": None, "custom_name_ar_verified": 0}
    row.update(kw)
    return row


def make_site(designer=DESIGNER, **settings):
    users = {
        DESIGNER: {"roles": ["Employee", "Design Manager"], "full_name": "Dana Designer"},
        EMP: {"roles": ["Employee"], "full_name": "Eman Employee"},
        HR: {"roles": ["Employee", "HR Manager"], "full_name": "Hadi HR"},
        IT: {"roles": ["Employee", "IT Coordinator"], "full_name": "Ilyas IT"},
        ADMIN: {"roles": ["System Manager"], "full_name": "Admin"},
        NOEMP: {"roles": ["Employee"], "full_name": "No Employee"},
        OFF: {"roles": ["Employee"], "full_name": "Disabled", "enabled": 0},
    }
    rows = {
        "Design Brand": [{"name": b, "brand_name": b, "sort_order": i + 1} for i, b in enumerate(BRANDS)],
        "Employee": [
            employee("E001", "Dana Designer", DESIGNER, department="Marketing - DMG"),
            employee("E002", "Eman Employee", EMP, custom_design_brands=[{"brand": "Najd"}, {"brand": "DM Group"}]),
            employee("E003", "Hadi HR", HR, department="HR - DMG"),
            employee("E004", "Ilyas IT", IT, department="IT - DMG"),
            employee("E005", "Old Staff", None, status="Left"),
            employee("E006", "Nomail Staff", None, company_email=None, cell_number=None),
        ],
        "Designation": [{"name": "Sales Executive", "custom_designation_ar": None, "custom_designation_ar_verified": 0}],
    }
    base = {"designer": designer, "default_brand": "DM Group", "notify_designer_on_new": 1, "certificate_issuers": [], "card_operators": []}
    base.update(settings)
    return FakeSite(rows=rows, users=users, settings=base)
