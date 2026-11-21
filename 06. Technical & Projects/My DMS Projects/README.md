# My DMS Projects

ERP Custom HTML Block: `DMS My Projects Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

- [DMS Add Follow Up](server_scripts/dms_add_follow_up_612f4797.py)
- [DMS Get Shared Key Personnel Contact](server_scripts/dms_get_shared_key_personnel_contact_64396b8b.py)
- [DMS My Contact Requests API](server_scripts/dms_my_key_personnel_requests_433f7e29.py)
- [DMS My Projects Dashboard Data](server_scripts/dms_my_projects_dashboard_data_468fbe2c.py)
- [DMS Shared Key Personnel Contacts](server_scripts/dms_project_shared_contacts_009e0ef0.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 · moved onto the DM dashboard standard (19 Nov 2026)

v2 moves v1 onto the shared DM kit. v1 is in git history (commit `962142f`). The five Server Script APIs are called unchanged:

| API | Used for |
|---|---|
| `dms_my_projects_dashboard_data` | Cards, follow-up lists and technical submittals. |
| `dms_my_key_personnel_requests` and `dms_project_shared_contacts` | My contact requests. Contact details are returned only for requests shared with me. |
| `dms_get_shared_key_personnel_contact` | One request's contacts, loaded on demand. |
| `dms_add_follow_up` | Saving a follow-up. This is the only write. Authorisation, the date rules and the Follow-Up History row stay on the server. |

**Kept from v1:**
- **Figures and lists:** all of them, unchanged.
- **Follow-up form rules:** a status is required, and so are remarks. A next date is required unless the status is Won or Lost, and it can't be in the past.
- **Card links:** cards open the DMS Project list, scoped to the employee.
- **Language:** the Arabic labels from v1's generated language block are reused.
  - Correction: "Submitted" was shown as the Arabic word for "Approved". It now reads مُقدَّم.

**Changed:**
- **Shell:** the toolbar, search, tabs (projects, follow-ups, technical submittals, contact requests), tables (search, sort, paging, CSV), overlays, RTL, dark mode and layout down to 320 px come from the kit.
  - Excluded from `tools/erp/shell/shell_map.json` (also from the generated language list). Don't re-add it.
- **Dialogs:** the follow-up form and the contact view open as kit overlays instead of Desk dialogs. They follow the dashboard's language, theme and keyboard handling.
- **Actions pending:**
  - High: overdue follow-ups, and technical submittals marked Revision Required or Rejected.
  - Medium: follow-ups due today.
  - Low: never contacted (a count; the API returns no rows for it).

**Test:** `npm --prefix tools/erp run test:my-dms-projects`. The save call is a mock, so the test writes nothing. Screenshots are saved in `.local/qa/my-dms-projects`.
