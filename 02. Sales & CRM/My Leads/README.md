# My Leads

ERP Custom HTML Block: `My Leads Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## 2026-11-18 · v2 on the DM dashboard standard

Rebuilt on the shared DM kit: toolbar, filters, browser tabs, actions pending, RTL, Desk dark mode, and layouts down to 320px. It replaces the v1 page that relied on the generated shell and `frappe.ui.Dialog`.

**Data:**
- Server Script `bulk_allocate_leads` only, unchanged. The server takes your identity from your session; the dashboard never sends a user ID.
  - Read actions: `my_summary`, `my_list` (`pane` = leads / fu / hist), `my_get`, `my_followups`.
  - The only two writes, both as in v1:
    - **Add follow-up:** `my_add_followup` with a request token, so a repeated click never creates a second entry.
    - **Update follow-up / status:** `my_update` sends only the fields you changed: status, outcome, last contacted, next follow-up or remarks.
- Fields checked against the ERP map:
  - Lead Allocation: `lead`, `customer_name`, `contact_person`, `customer_phone_1/2`, `customer_email`, `source`, `action_taken`, `original_activities`, `assigned_user`, `assigned_by`, `assignment_date`, `priority`, `status`, `outcome`, `last_contacted`, `next_follow_up`, `remarks`.
  - Lead Follow-up Log: `followup_datetime`, `contact_method`, `contact_result`, `contact_person`, `outcome`, `notes`, `next_action`, `next_follow_up`, `status_before`, `status_after`, `recorded_by`.

**Filters** (on My leads): follow-up (overdue / today / upcoming / not scheduled), status, priority, city, assigned from / to, and a search.

**Tabs:**
- **Overview:** six cards: active, overdue, due today, no follow-up scheduled, converted and closed. Each card opens the matching list. Also allocations by status and recent assignments. If a lead has more than one active allocation for you, a banner says so.
- **My leads:** your open allocations, server-paged. Each row has View and + Follow-up.
- **Follow-ups:** v1's follow-up filters: follow-up, status, outcome, last method, and a date that refers to the next follow-up or to the recorded activity. It shows each lead's last recorded follow-up.
- **History:** converted, closed and unassigned allocations. A closed allocation is hidden once the lead is active with someone else (server rule).
- **Lead details:** call, WhatsApp (966 format) and email links, Open lead (only if you can read lead records), lead activities, allocation remarks and the follow-up timeline.
- **Actions pending:** four categories:
  - Overdue follow-ups.
  - Due today.
  - Duplicate allocations.
  - No follow-up scheduled.

  They always cover all your active allocations.

**Follow-up form:** it checks the same rules as the server before saving:
- Notes are required.
- The follow-up time cannot be in the future.
- An unanswered attempt is recorded as No Response and cannot set Contacted / Interested / Converted.
- A next follow-up is required when the status or outcome needs one, and it must be after the follow-up time.

**Without a sales role:** an access message, never zeros.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields.

**Test:** `npm --prefix tools/erp run test:my-leads` (31 checks), with screenshots in `.local/qa/my-leads/`. The fixture follows the server script's real `my_*` logic. The test checks the follow-up and update payloads.

## Server scripts

- [Bulk Allocate Leads](server_scripts/bulk_allocate_leads_6deda7fb.py)

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.
