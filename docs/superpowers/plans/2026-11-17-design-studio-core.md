# Design Studio Core & Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ERP side of the Graphic Design Studio that needs no render engine:
- data model, access and brand assignment;
- brand kits and library;
- the full design-request flow (employee form → designer board → delivery with email → "My requests").

**Architecture:**
- **Data:** new custom DocTypes are defined as JSON and installed by a generated System Console script.
- **API:** one API Server Script `design_studio_api` (action dispatch, Frappe v14 sandbox) enforces every access rule.
- **UI:** a new Custom HTML Block "Graphic Design Studio" for the designer, IT and HR, plus a Design section in the existing Employee Dashboard.

**Tech Stack:**
- Frappe/ERPNext v14 Custom HTML Blocks (shadow root `root_element`, vanilla JS).
- API Server Scripts under RestrictedPython.
- Python 3.11 + pytest + RestrictedPython for script tests.
- Playwright (Edge) for browser tests.

**Spec:** `docs/superpowers/specs/2026-11-17-graphic-design-studio-design.md`

**Follow-up plans (not in this one):**
- Plan 2: ceopanel engine, template editor and email signatures.
- Plan 3: business cards and the Base44 migration.
- Plan 4: certificates, usage analytics, campaigns and stale detection.

## Global Constraints

- **Server Script sandbox (Frappe v14.100):** only names in the sandbox allowlist. No `+=`, no `del`, no attributes starting with `_`, no `re`, no `str.format`/f-string `format`.
  - `frappe.get_all` is not permission-checked, so `design_studio_api` must check access itself on every action.
  - `frappe.get_roles` is not available; the designer is identified by `Design Studio Settings.designer`, or System Manager via `frappe.db.exists("Has Role", {"parent": user, "role": "System Manager"})`.
- **Live ERP is read-only for this work.** Nothing is installed or pasted on the live site without the owner's approval; deployment steps go in the README.
- **Brands** are the six Design Brands: DM Group, Najd, Qimsco, FCrystal, DMCC, Asas. They are never derived from `Employee.company`. All 122 active employees are on Durar Masagh Trading Company.
- **Files:**
  - request files are private;
  - a Design Asset's file becomes public (unlisted URL) only when the asset is Published, and goes private again when Archived.
- **Email:** `frappe.sendmail` through the site's default outgoing account. Delivery must never be rolled back because an email failed; record `notified = 0` and tell the designer.
- **UI:**
  - shared DM shell built directly into the block: navy header on one line, royal-blue tab bar, white filter card. Not added to `tools/erp/shell/shell_map.json`; add it to that file's `_about` exclusion text;
  - Fleet palette tokens and unslop rules exactly as in `08. Operations & Logistics/FM & Inventory Dashboard/dashboard.css` (v5);
  - EN/AR with RTL;
  - `THEME_MODE = 'auto'` (follows desk theme);
  - all user text escaped before insertion.
- **One designer.** No approval step anywhere in this plan.
- **Folder:** `10. Communication & Productivity/Graphic Design Studio/` (written below as `GDS/`). Tests live in `tools/erp/tests/design_studio/` (Python) and `tools/erp/tests/design-studio-browser.cjs`.

## Review Focus

1. **An employee with no linked ERP user, or a user with no Employee record**, opens the Employee Dashboard. The Design section explains why requests are unavailable; there is no error and no blank panel. → Task 5 test `test_bootstrap_without_employee`; Task 11 browser case.
2. **A requester calls the API with another person's request name** (`request_get`, `request_attach`, `request_changes`). Denied with PermissionError, and no data leaks. → Task 5 tests.
3. **The delivery email fails** (sendmail raises, or the requester has no email). The request is still Delivered with `notified = 0`, and the designer sees "Email not sent". → Task 6 test `test_deliver_email_failure_keeps_delivered`; Task 8 browser case.
4. **Fresh install with no designer set.** System Manager sees the Access tab with a "Set the designer" prompt; nobody else gets designer actions. → Task 3 test `test_no_designer_configured`.
5. **A request title or brief containing HTML/script, and Arabic text.** It renders as plain text in the board, drawer, My requests and the email body, and Arabic text keeps its direction. → Task 6 test `test_email_body_escapes_html`; Task 8 and Task 11 browser cases.

---

### Task 1: DocType definitions and generated installer

**Files:**
- Create: `GDS/doctypes/design_brand.json`, `design_brand_colour.json`, `design_brand_font.json`, `design_asset.json`, `design_asset_brand.json`, `design_request.json`, `design_request_file.json`, `design_studio_settings.json`, `design_studio_user.json`, `employee_allowed_brand.json`
- Create: `GDS/doctypes/custom_fields.json` (Employee and Designation custom fields)
- Create: `GDS/doctypes/seed.json` (role and brands)
- Create: `tools/erp/design_studio/build_installer.py`
- Create (generated): `GDS/install/install_design_studio.py`
- Test: `tools/erp/tests/design_studio/test_doctypes.py`

**Interfaces:**
- Produces:
  - DocType and field names used by every later task (tables below);
  - role `Design Manager`;
  - `build_installer.py [--check]`, which exits 1 when the generated file is stale.

DocTypes (module `Custom`, `custom: 1`):

| DocType | Naming | Fields (fieldname: type → options) |
|---|---|---|
| Design Brand | `field:brand_name` | brand_name: Data (reqd, unique); erp_company: Link → Company; website: Data; phone: Data; fax: Data; address_en: Small Text; address_ar: Small Text; aramco_vid: Data; sabic_vid: Data; logo_primary / logo_dark / logo_mono: Link → Design Asset; colours: Table → Design Brand Colour; fonts: Table → Design Brand Font; usage_notes: Text Editor; sort_order: Int |
| Design Brand Colour (istable) | – | colour_name: Data; hex: Data; rgb: Data; cmyk: Data; role: Select `Primary\nSecondary\nAccent\nNeutral\nText` |
| Design Brand Font (istable) | – | family: Data; weight: Data; script: Select `Latin\nArabic`; font_file: Link → Design Asset; licence: Data; licence_expiry: Date |
| Design Asset | `hash`, title_field `title` | title: Data (reqd); asset_type: Select `Logo\nBackground\nPrint\nSocial post\nSignage\nVehicle branding\nPresentation\nPhoto\nPackaging\nFont\nOther`; brands: Table MultiSelect → Design Asset Brand; tags: Data; status: Select `Draft\nPublished\nArchived` (default Draft); version: Int (default 1); previous_version: Link → Design Asset; file: Attach; source_link: Data; preview: Attach Image; thumbnail: Attach Image; formats: Data; licence_expiry: Date; download_count: Int; description: Small Text |
| Design Asset Brand (istable) | – | brand: Link → Design Brand (reqd) |
| Design Request | `DR-.#####`, title_field `title` | title: Data (reqd); request_type: Select `Flyer\nBanner\nSocial post\nSignage\nPresentation\nPrinted business cards\nOther`; brand: Link → Design Brand; needed_by: Date; priority: Select `Low\nNormal\nHigh\nUrgent` (default Normal); brief: Text; files: Table → Design Request File; requested_by: Link → User; employee: Link → Employee; employee_name: Data; status: Select `Submitted\nIn progress\nNeeds info\nDelivered\nClosed\nCancelled` (default Submitted); designer_note: Small Text; change_note: Small Text; delivered_on: Datetime; notified: Check; notify_error: Small Text |
| Design Request File (istable) | – | kind: Select `Reference\nDelivery`; file: Attach (reqd); note: Data; added_by: Link → User; added_on: Datetime |
| Design Studio Settings (issingle) | – | designer: Link → User; certificate_issuers: Table → Design Studio User; card_operators: Table → Design Studio User; notify_designer_on_new: Check (default 1); default_brand: Link → Design Brand |
| Design Studio User (istable) | – | user: Link → User (reqd); full_name: Data |
| Employee Allowed Brand (istable) | – | brand: Link → Design Brand (reqd) |

**Custom fields:**
- Employee: `custom_name_ar` (Data), `custom_name_ar_verified` (Check), `custom_design_brands` (Table MultiSelect → Employee Allowed Brand), `custom_signature_brand` (Link → Design Brand). Insert them in a new section "Design" placed after `company_email`.
- Designation: `custom_designation_ar` (Data), `custom_designation_ar_verified` (Check).

**Permissions:**
- System Manager and Design Manager: full on all of the above.
- Employee:
  - Design Request: create, plus read and write with `if_owner`;
  - Design Brand: read.
- No other role gets permissions.

**Seed data:**
- Role `Design Manager`.
- Brands with `sort_order` 1–6: DM Group, Najd, Qimsco, FCrystal, DMCC, Asas.
- DM Group details (from the card artwork):
  - erp_company: Durar Masagh Trading Company
  - website: www.dmgroupksa.com
  - phone: +966 11 - 241 4446; fax: +966 11 - 241 0523
  - address_en: `3314 Al-Madina Al-Munawwara Road - Al Farooq Dist - Riyadh 12864-6375`
  - address_ar: `٣٣١٤ – طريق المدينة المنورة حي الفاروق الرياض ١٢٨٦٤ – ٦٣٧٥`
  - aramco_vid: 10064669; sabic_vid: 11047016
- Other brands' erp_company: Najd → Najd Scaffolding Trading Company, DMCC → Durar Masagh Contracting Co., Asas → Asas Al Daam Rental Equipment Co.; Qimsco and FCrystal left blank.

- [ ] **Step 1: Write failing tests** in `test_doctypes.py`:
  - `test_every_link_target_exists`: every Link/Table/Table MultiSelect `options` is a DocType defined here or one of {User, Employee, Company, Designation}.
  - `test_table_multiselect_children_have_one_link`: Design Asset Brand and Employee Allowed Brand each have exactly one Link field.
  - `test_fieldnames_unique_and_safe`: within each DocType, fieldnames match `^[a-z][a-z0-9_]*$` and are unique.
  - `test_employee_permissions`: the Employee role has only create/read/write with `if_owner: 1` on Design Request, and read on Design Brand.
  - `test_seed_brands`: the six names in order, and DM Group's VIDs equal `10064669` / `11047016`.
  - `test_installer_up_to_date`: `build_installer.py --check` exits 0.
- [ ] **Step 2: Run** `python -m pytest tools/erp/tests/design_studio/test_doctypes.py -q`. Expected: FAIL (files missing).
- [ ] **Step 3: Write the JSON definitions and `build_installer.py`.** The installer:
  - embeds the definitions;
  - creates the role, then child DocTypes before parents (so `insert` resolves links);
  - leaves existing DocTypes untouched;
  - creates Custom Fields with `frappe.get_doc({"doctype": "Custom Field", ...}).insert()`, skipping any that exist;
  - inserts seed brands only if missing;
  - prints a summary line per item;
  - uses only System Console-safe Python (same sandbox rules).
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(design-studio): doctypes, seed and installer`.

### Task 2: Server-script test sandbox

**Files:**
- Create: `tools/erp/tests/design_studio/sandbox.py`
- Create: `tools/erp/tests/design_studio/test_allowlist.py`
- Create (stub): `GDS/server_scripts/design_studio_api.py` with an action dispatch that throws `Unknown action` for every action

**Interfaces:**
- Produces:
  - `FakeSite(rows: dict[str, list[dict]], users: dict[str, dict])`, the in-memory store. Users map to `{"roles": [...], "email": str}`.
  - `run_api(site, user: str, action: str, **form) -> dict`. Executes the script once under RestrictedPython with v14 guards (copy `getattr_guard`/`getitem_guard` semantics from ceopanel `integrations/frappe/tests/test_server_script_relay.py`) and returns `frappe.response["message"]`.
  - `site.sent_mail`: the list of `sendmail` kwargs.
  - `site.files`: a dict `file_url → {"is_private": int, "attached_to_name": str}`.
- The fake implements:
  - `frappe.get_all`/`get_list` with dict and list filters (`=`, `!=`, `in`, `like`, `>=`, `<=`, `is set`), fields, order_by, limit_start/limit_page_length;
  - `get_doc` (dict or (doctype, name)) with `.insert()`, `.save()`, `.append()`, attribute access, child tables as lists;
  - `frappe.db.get_value`, `get_single_value`, `exists`, `set_value`, `count`;
  - `get_single`-style `get_doc("Design Studio Settings")`;
  - `utils` (`now`, `nowdate`, `getdate`, `add_days`, `escape_html`, `get_url_to_form`, `cint`, `cstr`);
  - `sendmail` (records, or raises when `site.mail_fails = True`);
  - `throw`, `PermissionError`, `session.user`, `form_dict`, `response`.

- [ ] **Step 1: Write `test_allowlist.py`** that parses `design_studio_api.py` with `ast` and fails on:
  - any `frappe.<x>`, `frappe.db.<x>` or `frappe.utils.<x>` outside the v14 allowlists (copy the sets from ceopanel `tests/test_sandbox_allowlist.py`);
  - any `AugAssign`, `Delete`, `import`, or attribute starting with `_`;
  - any `.format(` call.
- [ ] **Step 2: Add a smoke test** `test_unknown_action_throws`: `run_api(site, "a@x", "nope")` raises `Thrown` with message containing `Unknown action`.
- [ ] **Step 3: Run** `python -m pytest tools/erp/tests/design_studio -q`. Expected: PASS for the allowlist test and smoke test once the sandbox and stub exist (FAIL before).
- [ ] **Step 4: Commit** — `test(design-studio): restricted-python sandbox and allowlist`.

### Task 3: API — bootstrap, roles and access

**Files:**
- Modify: `GDS/server_scripts/design_studio_api.py`
- Create: `GDS/server_scripts/design_studio_api.json` (Server Script meta: `script_type: API`, `api_method: design_studio_api`, `allow_guest: 0`)
- Test: `tools/erp/tests/design_studio/test_access.py`

**Interfaces:**
- Produces (used by every UI task). All actions are called by POST `/api/method/design_studio_api` with `action` and a JSON `data` field.

  `bootstrap()` returns:
  ```
  {user, full_name, employee: {name, employee_name, designation, department, company_email, cell_number} | null,
   roles: {designer: bool, admin: bool, issuer: bool, operator: bool},
   tabs: [..],
   allowed_brands: [brand_name..],
   brands: [{name, sort_order}],
   designer_set: bool, today, api_version: "1"}
  ```
  - `tabs` order: `overview, requests, brands, library, employees, access` for the designer.
  - A System Manager without a designer configured gets `brands, access` only.
  - Others get `brands, library`; Plan 3 adds `cards`, Plan 4 adds `certificates`.
  - `allowed_brands`:
    - the Employee's `custom_design_brands`;
    - if that's empty, `[default_brand or "DM Group"]`;
    - the designer gets all brands.

  `access_get()` (designer or System Manager) returns `{designer, certificate_issuers: [{user, full_name}], card_operators: [..], candidates: [{user, full_name, department}]}`. Candidates are active employees that have a `user_id`.

  `access_set(data={designer?, certificate_issuers: [user], card_operators: [user]})`:
  - designer only, except that a System Manager may set `designer` when none is set;
  - every user must be an enabled User;
  - adds a timeline Comment on the settings: "Access changed by …".

- [ ] **Step 1: Write failing tests:**
  - `test_designer_bootstrap_tabs`;
  - `test_employee_bootstrap_tabs_and_allowed_brands_default` (no brands assigned → `["DM Group"]`);
  - `test_bootstrap_without_employee` (user with no Employee → `employee` is null, tabs `brands, library`);
  - `test_no_designer_configured` (System Manager tabs = `brands, access`; a plain employee's `access_get` raises PermissionError);
  - `test_access_set_requires_designer`;
  - `test_access_set_rejects_disabled_user`;
  - `test_issuer_and_operator_flags`.
- [ ] **Step 2: Run** `python -m pytest tools/erp/tests/design_studio/test_access.py -q`. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers `settings()`, `is_designer(user)`, `is_admin(user)`, `employee_of(user)` and `require(cond, message)`, plus the three actions. Read input with `json.loads(frappe.form_dict.get("data") or "{}")`.
- [ ] **Step 4: Run tests.** Expected: PASS (and the allowlist test still passes).
- [ ] **Step 5: Commit** — `feat(design-studio): bootstrap and access control`.

### Task 4: API — brands, library and employee brand assignment

**Files:**
- Modify: `GDS/server_scripts/design_studio_api.py`
- Test: `tools/erp/tests/design_studio/test_library.py`, `test_employees.py`

**Interfaces:**
- Produces:
  - **`brands_list()`** (anyone) returns `[{name, website, phone, fax, address_en, address_ar, aramco_vid, sabic_vid, logos: {primary, dark, mono} → {name, title, file, thumbnail} | null, colours: [...], fonts: [{family, weight, script, file|null}], usage_notes}]`.
    - Logo and font files are returned only when that asset is Published.
  - **`brand_save(data)`** (designer) updates one brand, replacing its colours and fonts.
  - **`assets_list(data={brand?, asset_type?, tag?, status?, q?, start=0, limit=48})`** returns `{rows: [{name, title, asset_type, brands, tags, status, version, file, source_link, thumbnail, formats, licence_expiry, download_count, modified}], total}`.
    - Non-designers always get `status = Published` (any `status` argument is ignored).
    - `q` matches title or tags.
  - **`asset_save(data)`** (designer) creates or updates metadata. `file` is the `file_url` the block got from `/api/method/upload_file` with `is_private=1`.
  - **`asset_publish(name)`** (designer): sets Published, sets the attached File (`file` and `thumbnail`) to `is_private = 0`, and archives `previous_version` if it is Published.
  - **`asset_archive(name)`** (designer): sets Archived and makes its files private.
  - **`asset_new_version(name)`** (designer): copies metadata into a new Draft with `version + 1` and `previous_version = name`, and returns the new name.
  - **`asset_hit(name)`** (anyone, Published only) increments `download_count`.
  - **`employees_list(data={q?, brand?, gap?})`** (designer): active employees as `[{employee, employee_name, designation, department, location, user_id, company_email, cell_number, allowed_brands, signature_brand, name_ar, name_ar_verified, designation_ar, designation_ar_verified, gaps: [..]}]`.
    - `gaps` uses the codes `no_user`, `no_email`, `no_mobile`, `no_name_ar`, `no_designation_ar`.
    - `gap` filters to a single code.
  - **`employees_set_brands(data={employees: [..], brands: [..], mode: "add" | "replace" | "remove"})`** (designer). Brands must exist. If `custom_signature_brand` is no longer allowed, it is cleared.
  - **`arabic_save(data={employee?, name_ar?, designation?, designation_ar?})`** (designer): saves the values with the verified flag set to 1.

- [ ] **Step 1: Write failing tests:**
  - `test_employee_sees_only_published_assets`;
  - `test_publish_makes_file_public_and_archives_previous`;
  - `test_archive_makes_file_private`;
  - `test_new_version_increments`;
  - `test_brands_list_hides_unpublished_logo_file`;
  - `test_employees_gaps` (fixture: one employee missing email and mobile → `gaps == ["no_email", "no_mobile", "no_name_ar", "no_designation_ar"]`);
  - `test_set_brands_replace_clears_invalid_signature_brand`;
  - `test_non_designer_cannot_save_assets_or_brands`.
- [ ] **Step 2: Run** `python -m pytest tools/erp/tests/design_studio -q`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement the actions.** File privacy goes through `frappe.get_all("File", filters={"file_url": url, "attached_to_doctype": "Design Asset"})`, then `frappe.db.set_value("File", name, "is_private", 0 or 1)`.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(design-studio): brands, library and employee brands API`.

### Task 5: API — requester side of design requests

**Files:**
- Modify: `GDS/server_scripts/design_studio_api.py`
- Test: `tools/erp/tests/design_studio/test_requests_employee.py`

**Interfaces:**
- Produces:
  - **`request_submit(data={title, request_type, brand, needed_by, priority, brief})`** returns `{name}`.
    - Requires an Employee linked to the session user.
    - `brand` must be in `allowed_brands`.
    - `title` is 3–140 chars after trimming; `brief` is 10–4000 chars.
    - `needed_by` is today or later (or empty).
    - Sets `requested_by`, `employee`, `employee_name` and `status = Submitted`.
    - Emails the designer if `notify_designer_on_new` is set and a designer exists. Subject: `New design request DR-#####: <title>`.
  - **`my_requests(data={status?})`** returns the session user's requests, newest first: `[{name, title, request_type, brand, needed_by, priority, status, designer_note, delivered_on, modified, files: [{kind, file, note, added_on}]}]`.
  - **`request_get(name)`**: the requester or the designer only. Returns a row as above plus `brief`, `change_note` and `timeline: [{by, at, text}]` (Comments on the request).
  - **`request_attach(data={name, file_url, kind, note})`**:
    - the requester may add `Reference` while status is Submitted, Needs info or In progress;
    - the designer may add either kind;
    - `file_url` must be a File attached to this request.
  - **`request_cancel(name)`**: the requester, while Submitted.
  - **`request_reply(data={name, text})`**: the requester, while Needs info. Adds a Comment, sets the status back to Submitted, and emails the designer.
  - **`request_changes(data={name, note})`**: the requester, while Delivered. Sets status Submitted, stores `change_note`, adds a Comment, and emails the designer.

- [ ] **Step 1: Write failing tests:**
  - `test_submit_valid`;
  - `test_submit_rejects_brand_not_allowed`;
  - `test_submit_rejects_past_date_and_short_title`;
  - `test_submit_requires_employee`;
  - `test_my_requests_only_own`;
  - `test_request_get_other_user_denied`;
  - `test_attach_other_users_request_denied`;
  - `test_attach_file_not_on_request_denied`;
  - `test_cancel_only_when_submitted`;
  - `test_changes_only_when_delivered_and_emails_designer`;
  - `test_reply_to_needs_info`.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.** Email bodies are built with `frappe.utils.escape_html` around every user value. Each body has an English paragraph, then an Arabic paragraph (`<div dir="rtl">`), and a link from `frappe.utils.get_url_to_form("Design Request", name)`.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(design-studio): employee request API`.

### Task 6: API — designer side of design requests

**Files:**
- Modify: `GDS/server_scripts/design_studio_api.py`
- Test: `tools/erp/tests/design_studio/test_requests_designer.py`

**Interfaces:**
- Produces:
  - **`requests_board(data={status?, brand?, q?})`** (designer) returns `{columns: {Submitted: [...], "In progress": [...], "Needs info": [...], Delivered: [...]}, counts: {...}, due_this_week, overdue, closed_recent: [...]}`.
    - Rows use the `my_requests` shape plus `employee_name`, `requested_by`, `age_days`, `overdue: bool` and `notified`.
    - Delivered keeps the last 30 days; Closed and Cancelled appear only in `closed_recent` (last 20).
  - **`request_update(data={name, status, note?})`** (designer):
    - status ∈ {In progress, Needs info, Closed, Cancelled};
    - Needs info requires `note`, sets `designer_note` and emails the requester.
  - **`request_deliver(data={name, note?})`** (designer):
    1. requires at least one `Delivery` file;
    2. sets `status = Delivered`, `delivered_on = now` and `designer_note = note`;
    3. saves;
    4. then emails the requester: subject `Your design is ready: <title>`, with each delivery file listed as an absolute link and the note;
    5. on success sets `notified = 1`; on any exception sets `notified = 0` and `notify_error` (short message);
    6. returns `{name, notified, notify_error}`.

    A missing requester email counts as a failure with message `Requester has no email address`.
  - **`request_save_to_library(data={name, file_url, title, asset_type, brands})`** (designer): creates a Draft Design Asset pointing at a copy of the delivery file (a new File row attached to the asset with the same `file_url`) and returns `{asset}`.

- [ ] **Step 1: Write failing tests:**
  - `test_board_groups_and_counts`;
  - `test_board_non_designer_denied`;
  - `test_needs_info_requires_note_and_emails`;
  - `test_deliver_requires_delivery_file`;
  - `test_deliver_sends_email_with_links` (assert recipients == [requester email], every delivery file URL is in the message, `notified == 1`);
  - `test_deliver_email_failure_keeps_delivered` (`site.mail_fails = True` → status Delivered, `notified == 0`, `notify_error` set);
  - `test_email_body_escapes_html` (title `<script>x</script>` appears escaped in the message);
  - `test_save_to_library_creates_draft_asset`.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.** Do the status save before `sendmail` in its own step, so an email exception can't undo it. Wrap only `sendmail` in try/except.
- [ ] **Step 4: Run** `python -m pytest tools/erp/tests/design_studio -q`. Expected: all PASS.
- [ ] **Step 5: Commit** — `feat(design-studio): designer request board and delivery email`.

### Task 7: Studio block — shell, bootstrap, tab gating and Overview

**Files:**
- Create: `GDS/dashboard.html`, `GDS/dashboard.css`, `GDS/dashboard.js`
- Test: `tools/erp/tests/design-studio-browser.cjs`
- Modify: `tools/erp/package.json` (add the script `"test:design": "python -m pytest tests/design_studio -q && node tests/design-studio-browser.cjs"`)

**Interfaces:**
- Consumes: the `bootstrap` and `requests_board` shapes (Tasks 3 and 6).
- Produces:
  - JS helpers reused by Tasks 8–10:
    - `api(action, data) -> Promise<message>` (POST with `X-Frappe-CSRF-Token`, throws `Error(server message)`);
    - `upload(file, doctype, docname, isPrivate) -> Promise<file_url>` (POST multipart to `/api/method/upload_file`);
    - `esc(s)`, `t(s)` (AR dictionary), `$(sel)` (scoped to `root_element`);
    - `openDrawer(html)`, `closeDrawer()`, `toast(msg, tone)`.
  - DOM ids: `#gds`, `#tabs`, `#view-<tab>`, `#lastUpdated`, `#btnRefresh`, `#btnLang`, `#drawer`, `#scrim`.

Layout:
- Header: title "Graphic Design Studio", subtitle "Brand assets, templates and design requests for DM Group".
- Tabs come from `bootstrap.tabs` with labels Overview, Requests, Brand kits, Library, Employees, Access.
- Overview KPI cards: Open requests, Due this week, Overdue, Delivered (30 days), Published assets, Employees missing data.
- "Needs attention" list: overdue requests first, then Needs info older than 3 days, then employees with gaps (count).

- [ ] **Step 1: Write the browser test** with fixtures for designer, employee and System-Manager-without-designer bootstraps. Assert:
  - designer: 6 tabs in order; KPI "Open requests" shows the fixture count; header height ≤ 72 px;
  - employee: only Brand kits and Library;
  - System Manager without designer: the Access tab shows the "Set the designer" prompt;
  - no `pageerror`;
  - AR: `dir="rtl"` on `#gds`.
- [ ] **Step 2: Run** `npm --prefix tools/erp run test:design`. Expected: the browser part FAILs.
- [ ] **Step 3: Implement** the HTML, CSS (copy token/shell/card/table/drawer rules from FM v5 `dashboard.css` and keep only the classes used) and JS skeleton.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(design-studio): studio block shell and overview`.

### Task 8: Studio block — Requests board and delivery

**Files:**
- Modify: `GDS/dashboard.js`, `GDS/dashboard.css`
- Test: `tools/erp/tests/design-studio-browser.cjs`

**Interfaces:**
- Consumes: `requests_board`, `request_get`, `request_update`, `request_attach`, `request_deliver`, `request_save_to_library`, `upload`.

Behaviour:
- Board columns: Submitted, In progress, Needs info, Delivered, each with a count. Cards show title, requester, brand, type, needed-by, priority badge and overdue marker.
- Filters: search, brand.
- The card drawer shows:
  - brief (plain text, `white-space: pre-wrap`);
  - reference files;
  - timeline;
  - actions: Start (→ In progress), Ask for info (note required), Upload finished files (multiple, each private on the request, then `request_attach` kind Delivery), Deliver (enabled only with ≥ 1 delivery file; note optional), Save to library, Close, Cancel.
- After delivery: a toast reading "Delivered — email sent" or "Delivered — email not sent: <reason>". When `notified = 0`, the card carries an "Email not sent" badge.

- [ ] **Step 1: Extend the test:**
  - open a Submitted card → Start → the route log contains `request_update` with `In progress`;
  - upload is stubbed via a `/api/method/upload_file` route, then Deliver → `request_deliver` called;
  - a fixture returning `notified: 0` shows the "Email not sent" badge;
  - a fixture title `<img src=x onerror=alert(1)>` renders as text, with no `img` element in the card.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(design-studio): requests board and delivery UI`.

### Task 9: Studio block — Brand kits and Library

**Files:**
- Modify: `GDS/dashboard.js`, `GDS/dashboard.css`
- Test: `tools/erp/tests/design-studio-browser.cjs`

**Interfaces:**
- Consumes: `brands_list`, `brand_save`, `assets_list`, `asset_save`, `asset_publish`, `asset_archive`, `asset_new_version`, `asset_hit`, `upload`.

Behaviour:
- **Brand kits:**
  - brand switcher (segmented control);
  - logos with download (calls `asset_hit`);
  - colour swatches with copy buttons for HEX, RGB and CMYK (clipboard plus toast "Copied");
  - fonts; contact block (website, phone, fax, addresses EN/AR, VIDs); usage notes;
  - the designer gets an Edit drawer for brand fields, colours, fonts and logo pickers (Published assets only).
- **Library:**
  - filter card: search, brand, type, status (designer only);
  - grid of cards: thumbnail or file-type tile, title, brand chips, version, status badge (designer);
  - drawer: preview, details, download, versions (walking `previous_version`);
  - designer actions: Upload (create asset → upload file attached to it → `asset_save` with file), Edit, Publish, Archive, New version;
  - paging at 48 per page.

- [ ] **Step 1: Extend the test:**
  - employee library fixture: every card shows no status badge and no Upload button;
  - designer: Publish calls `asset_publish`;
  - copying a colour calls `navigator.clipboard.writeText` with `#103ba9` (stub clipboard);
  - at 390 px width, no horizontal page scroll.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(design-studio): brand kits and library UI`.

### Task 10: Studio block — Employees and Access

**Files:**
- Modify: `GDS/dashboard.js`, `GDS/dashboard.css`
- Test: `tools/erp/tests/design-studio-browser.cjs`

**Interfaces:**
- Consumes: `employees_list`, `employees_set_brands`, `arabic_save`, `access_get`, `access_set`.

Behaviour:
- **Employees:**
  - table: name, designation, department, location, allowed brands (chips), signature brand, gap badges;
  - filters: search, brand, gap;
  - row checkboxes plus "Select all shown", then a bulk bar "Brands: Add / Replace / Remove" with a brand multi-select;
  - a row drawer to edit the Arabic name and Arabic designation (saving marks them verified) and per-row brands;
  - a "Missing Arabic" quick filter.
- **Access:**
  - the designer picker, shown only when there's no designer or the viewer is the designer;
  - two user pickers (from candidates): "Certificate issuers (HR)" and "Business card operators (IT)";
  - Save calls `access_set`;
  - explanation text: "Only these people see the Certificates / Business cards tabs."

- [ ] **Step 1: Extend the test:**
  - selecting 2 rows → Add "Najd" → `employees_set_brands` called with `{mode: "add", brands: ["Najd"]}` and both employee ids;
  - the gap filter `no_email` sends `gap: "no_email"`;
  - Access Save sends the chosen users.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(design-studio): employees brand assignment and access UI`.

### Task 11: Employee Dashboard — Design section (request form and My requests)

**Files:**
- Modify: `05. HR & Administration/Employee Dashboard/dashboard.js`, `dashboard.css`
- Test: `tools/erp/tests/design-studio-browser.cjs` (new case that loads the Employee Dashboard with its own existing API calls stubbed)

**Interfaces:**
- Consumes: `bootstrap`, `request_submit`, `my_requests`, `request_get`, `request_attach`, `request_cancel`, `request_reply`, `request_changes`, and `upload`. Copy the small helpers into the Employee Dashboard script; it does not share code with the Studio block.

Behaviour:
- Read the existing block first and add the section in its existing navigation style, as a "Design" tab or card group next to the employee's own sections. It contains:
  1. **Request a design:**
     - fields: title, type, brand (only `allowed_brands`; hidden when there's one), needed by, priority, brief, reference files (uploaded after the request is created, then `request_attach` with kind Reference);
     - submit shows "Request DR-##### sent to the designer".
  2. **My requests:** status chips with counts, then a list with status badge, needed-by and designer note. Delivered items show download links for delivery files and a "Request changes" button (note required). Needs info items show the designer's question with a reply box. Submitted items can be cancelled.
- If `bootstrap.employee` is null, show "Design requests need an ERP user linked to your employee record. Ask HR." and no form.
- The Studio API is a separate script, so the Employee Dashboard's existing loading must not wait on it. Load the Design section on demand. A failure in it shows inline and doesn't break the rest of the dashboard.

- [ ] **Step 1: Write the browser case:**
  - submit with brand list `["DM Group"]` → no brand select visible, and the payload has `brand: "DM Group"`;
  - a Delivered fixture shows a download link and "Request changes";
  - a null-employee fixture shows the explanation;
  - when `design_studio_api` returns 500, the rest of the Employee Dashboard still renders (an existing heading is present);
  - AR: section headings translated, `dir="rtl"`.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm --prefix tools/erp run test:design` and `npm --prefix tools/erp test`. Expected: PASS (regression still 23 checks).
- [ ] **Step 5: Commit** — `feat(employee-dashboard): design requests section`.

### Task 12: Registration, docs and full check

**Files:**
- Create: `GDS/README.md`
- Modify: `DASHBOARDS.md`, `tools/erp/dashboard_directory_manifest.json`, `tools/erp/shell/shell_map.json` (`_about` exclusion text), `10. Communication & Productivity/README.md`

`GDS/README.md` covers:
- **Install order** (all on staging first, only with the owner's approval):
  1. paste `install/install_design_studio.py` in System Console;
  2. create the API Server Script `design_studio_api` from `server_scripts/design_studio_api.py`;
  3. create the Custom HTML Block "Graphic Design Studio" (html/css/js) and add it to a workspace;
  4. give the designer's user the role Design Manager and set Design Studio Settings → designer;
  5. update the Employee Dashboard block.
- What each role sees.
- Email requirements (default outgoing account).
- What arrives in Plans 2–4.

- [ ] **Step 1: Write the docs and registrations.**
- [ ] **Step 2: Run** the full checks:
  ```
  npm --prefix tools/erp test
  npm --prefix tools/erp run test:shell
  npm --prefix tools/erp run test:ceo
  npm --prefix tools/erp run test:design
  python tools/erp/design_studio/build_installer.py --check
  ```
  Expected: all PASS.
- [ ] **Step 3: Commit** — `docs(design-studio): install guide and registration`.
