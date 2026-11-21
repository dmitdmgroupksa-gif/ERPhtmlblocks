"""Graphic Design Studio DocType definitions, seed data and the generated System Console installer."""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
GDS = ROOT / "10. Communication & Productivity" / "Graphic Design Studio"
DOCTYPES = GDS / "doctypes"
BUILDER = ROOT / "tools" / "erp" / "design_studio" / "build_installer.py"
EXTERNAL = {"User", "Employee", "Company", "Designation"}
LINKING = {"Link", "Table", "Table MultiSelect"}


def definitions():
    defs = {}
    for path in sorted(DOCTYPES.glob("*.json")):
        if path.name in ("custom_fields.json", "seed.json"):
            continue
        d = json.loads(path.read_text(encoding="utf-8"))
        defs[d["name"]] = d
    return defs


def test_expected_doctypes_exist():
    assert set(definitions()) == {
        "Design Brand", "Design Brand Colour", "Design Brand Font", "Design Asset", "Design Asset Brand",
        "Design Request", "Design Request File", "Design Studio Settings", "Design Studio User", "Employee Allowed Brand",
    }


def test_every_link_target_exists():
    defs = definitions()
    fields = [f for d in defs.values() for f in d["fields"]]
    fields += json.loads((DOCTYPES / "custom_fields.json").read_text(encoding="utf-8"))
    for f in fields:
        if f["fieldtype"] in LINKING:
            assert f["options"] in defs or f["options"] in EXTERNAL, f


def test_table_multiselect_children_have_one_link():
    defs = definitions()
    for child in ("Design Asset Brand", "Employee Allowed Brand"):
        assert defs[child]["istable"] == 1
        links = [f for f in defs[child]["fields"] if f["fieldtype"] == "Link"]
        assert len(links) == 1 and links[0]["options"] == "Design Brand"


def test_tables_point_at_child_doctypes():
    defs = definitions()
    for d in defs.values():
        for f in d["fields"]:
            if f["fieldtype"] in ("Table", "Table MultiSelect"):
                assert defs[f["options"]].get("istable") == 1, f


def test_fieldnames_unique_and_safe():
    for name, d in definitions().items():
        names = [f["fieldname"] for f in d["fields"]]
        assert len(names) == len(set(names)), name
        for n in names:
            assert re.match(r"^[a-z][a-z0-9_]*$", n), (name, n)


def test_employee_permissions():
    defs = definitions()
    for name, d in defs.items():
        emp = [p for p in d.get("permissions", []) if p["role"] == "Employee"]
        if name == "Design Request":
            assert len(emp) == 1
            p = emp[0]
            assert p.get("if_owner") == 1 and p.get("read") == 1 and p.get("write") == 1 and p.get("create") == 1
            assert not p.get("delete") and not p.get("submit")
        elif name == "Design Brand":
            assert len(emp) == 1 and emp[0].get("read") == 1 and not emp[0].get("write") and not emp[0].get("create")
        else:
            assert emp == [], name


def test_manager_roles_have_full_access():
    for name, d in definitions().items():
        if d.get("istable"):
            continue
        roles = {p["role"]: p for p in d["permissions"]}
        for role in ("System Manager", "Design Manager"):
            p = roles[role]
            assert p.get("read") and p.get("write"), (name, role)


def test_custom_fields():
    cf = {(f["dt"], f["fieldname"]): f for f in json.loads((DOCTYPES / "custom_fields.json").read_text(encoding="utf-8"))}
    assert cf[("Employee", "custom_design_brands")]["fieldtype"] == "Table MultiSelect"
    assert cf[("Employee", "custom_design_brands")]["options"] == "Employee Allowed Brand"
    assert cf[("Employee", "custom_signature_brand")]["options"] == "Design Brand"
    assert cf[("Employee", "custom_name_ar")]["fieldtype"] == "Data"
    assert cf[("Employee", "custom_name_ar_verified")]["fieldtype"] == "Check"
    assert cf[("Designation", "custom_designation_ar")]["fieldtype"] == "Data"
    assert cf[("Designation", "custom_designation_ar_verified")]["fieldtype"] == "Check"
    first = [f for f in cf.values() if f["dt"] == "Employee" and f["insert_after"] == "company_email"]
    assert len(first) == 1 and first[0]["fieldtype"] == "Section Break"


def test_seed_brands():
    seed = json.loads((DOCTYPES / "seed.json").read_text(encoding="utf-8"))
    assert seed["roles"] == ["Design Manager"]
    names = [b["brand_name"] for b in sorted(seed["brands"], key=lambda b: b["sort_order"])]
    assert names == ["DM Group", "Najd", "Qimsco", "FCrystal", "DMCC", "Asas"]
    dm = seed["brands"][0]
    assert dm["aramco_vid"] == "10064669" and dm["sabic_vid"] == "11047016"
    assert dm["erp_company"] == "Durar Masagh Trading Company"
    assert dm["website"] == "www.dmgroupksa.com"


def test_installer_up_to_date():
    r = subprocess.run([sys.executable, str(BUILDER), "--check"], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr


class FakeInstallSite:
    """Mimics what the installer touches: DocType insert validates that every Link/Table target exists
    (Frappe's check_link_table_options), Custom Field targets must exist, records are kept by doctype."""

    def __init__(self):
        self.records = {"DocType": {n: {"name": n, "fields": []} for n in EXTERNAL}, "Role": {}, "Custom Field": {}, "Design Brand": {}}
        self.single = {}
        self.messages = []

    def exists(self, doctype, name=None):
        if isinstance(name, dict):
            return any(all(r.get(k) == v for k, v in name.items()) for r in self.records.get(doctype, {}).values())
        return name in self.records.get(doctype, {})

    def get_doc(self, data, name=None):
        site = self
        if isinstance(data, str):
            if data == "Design Studio Settings":
                rec = site.single
            else:
                rec = site.records[data][name]
            return Doc(site, data, rec, stored=True)
        return Doc(site, data["doctype"], dict(data), stored=False)


class Doc:
    def __init__(self, site, doctype, values, stored):
        self.__dict__.update(site=site, doctype_=doctype, values=values, stored=stored)

    def __getattr__(self, name):
        return self.values.get(name)

    def __setattr__(self, name, value):
        self.values[name] = value

    def set(self, key, value):
        self.values[key] = value

    def append(self, table, row):
        self.values.setdefault(table, []).append(row)

    def check(self):
        if self.doctype_ == "DocType":
            for f in self.values.get("fields", []):
                if f["fieldtype"] in LINKING and f["options"] != self.values["name"] and f["options"] not in self.site.records["DocType"]:
                    raise AssertionError(self.values["name"] + "." + f["fieldname"] + " links missing " + f["options"])
        if self.doctype_ == "Custom Field":
            assert self.values["dt"] in self.site.records["DocType"]
            if self.values["fieldtype"] in LINKING:
                assert self.values["options"] in self.site.records["DocType"], self.values

    def insert(self, **kw):
        self.check()
        key = self.values.get("name") or self.values.get("role_name") or self.values.get("brand_name") or (self.values.get("dt") + "-" + self.values.get("fieldname"))
        self.site.records.setdefault(self.doctype_, {})[key] = self.values
        return self

    def save(self, **kw):
        self.check()
        if self.doctype_ == "Design Studio Settings":
            self.site.single.update(self.values)
        return self


def run_installer(site):
    src = (GDS / "install" / "install_design_studio.py").read_text(encoding="utf-8")
    db = type("DB", (), {"exists": staticmethod(site.exists), "commit": staticmethod(lambda: None),
                          "get_single_value": staticmethod(lambda dt, f: site.single.get(f))})
    frappe = type("F", (), {"db": db, "get_doc": staticmethod(site.get_doc), "msgprint": staticmethod(site.messages.append)})
    exec(compile(src, "installer", "exec"), {"frappe": frappe})


def test_installer_creates_everything_in_valid_order():
    site = FakeInstallSite()
    run_installer(site)
    defs = definitions()
    for name, d in defs.items():
        stored = site.records["DocType"][name]
        assert {f["fieldname"] for f in stored["fields"]} == {f["fieldname"] for f in d["fields"]}, name
    assert "Design Manager" in site.records["Role"]
    assert len(site.records["Custom Field"]) == 7
    assert set(site.records["Design Brand"]) == {"DM Group", "Najd", "Qimsco", "FCrystal", "DMCC", "Asas"}
    assert site.single.get("default_brand") == "DM Group"


def test_installer_is_idempotent():
    site = FakeInstallSite()
    run_installer(site)
    before = json.dumps(site.records, sort_keys=True, default=str)
    run_installer(site)
    assert json.dumps(site.records, sort_keys=True, default=str) == before


def test_installer_is_sandbox_safe():
    src = (GDS / "install" / "install_design_studio.py").read_text(encoding="utf-8")
    assert "import " not in src
    assert "+=" not in src and ".format(" not in src
