# Lead Management

ERP Custom HTML Block: `Lead Management Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit: toolbar, filters, browser tabs, actions pending, RTL, Desk dark mode, and layouts down to 320px. It replaces the v1 page that relied on the generated shell. v1's filter logic, column set, allocation and unassign rules are kept.

**Data:**
- `Leads Generation List` through `frappe.client.get_list`, with the user's own permissions. Fields used: `date`, `customer_name`, `contact_person`, `designation`, `city`, `phone`, `telephone`, `customer_email`, `customer_email_2`, `source`, `action_taken`, `activities`, `catalogue_status`, `remarks`. All checked against the ERP map.
- Server Script `bulk_allocate_leads`, unchanged. It answers only Lead Allocation Coordinators and System Managers.
  - Read actions: `report_lead_ids`, `report_allocations`, `search_salespersons`, `fu_monitor`, `fu_history`.
  - The only two writes, both as in v1:
    - **Allocate:** the plain call with `leads`, `salesperson_user`, `assignment_date`, `priority` and `next_follow_up`. The server skips leads that already have an active allocation.
    - **Unassign:** `unassign_allocations` with the ticked allocations and a reason of at least 5 characters. Allocations end as "Unassigned" and are never deleted.

**Filters:** lead date from / to, city (or missing city), source, assigned salesperson, allocation (assigned / never allocated) and a search.

**Tabs:**
- **Overview:** six KPIs:
  - Total leads.
  - Assigned (at least one current allocation).
  - Never allocated. Previously allocated leads are counted apart.
  - Catalogue sent.
  - Missing contact details.
  - Overdue follow-ups.

  Also leads over time (by day or month), leads by source and by city (each bar applies the filter), and data quality: missing phone and email, missing city, missing contact person, and duplicate email or phone groups.
- **Leads:** a server-paged table. Coordinators get row selection, **Allocate** (salesperson search, then review, then confirm) and **Unassign**. A lead with several active allocations needs the allocations to end ticked one by one.
- **Detailed report:** v1's report filters: date basis, allocation status, salesperson, allocated by, catalogue, priority and follow-up status. It has count cards, v1's 35-column chooser (remembered in the browser), per-lead allocation history, CSV export and a printable view.
- **Follow-up monitoring:** `fu_monitor` with its filters and six cards: active, overdue, due today, upcoming, no follow-up scheduled and no recorded follow-up. Rows are allocations, and each has a follow-up history.
- **Actions pending:** five categories:
  - Overdue follow-ups.
  - Due today.
  - Never allocated.
  - No follow-up scheduled.
  - Missing contact details.

  They are not limited by the filters.

**Without the coordinator role:** lead counts, charts and data quality still show. Allocation figures show "—" with an explanation instead of 0, and the selection and allocate controls are hidden.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields.

**Test:** `npm --prefix tools/erp run test:lead-mgmt` (34 checks), with screenshots in `.local/qa/lead-mgmt/`. The fixture follows the server script's real outputs. The test checks the allocate and unassign payloads and also runs a session without the coordinator role.

## Server scripts

- [Bulk Allocate Leads](server_scripts/bulk_allocate_leads_6deda7fb.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.
