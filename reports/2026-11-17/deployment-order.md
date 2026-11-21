# Live deployment order — 17 November 2026

Compared with the live site read-only on 17 Nov 2026. Field = Desk field of the Custom HTML Block or Server Script; paste the whole local file. Branch `ceo-command-centre-v2-dashboard-shell`.

Safe to overwrite: live blocks edited on 16 Nov already equal the local code (minus the new generated design blocks). **Do not touch Durar Messenger** (edited live on 16 Nov 20:38, not in this repo's changes — re-export it instead).

## A. Server Scripts

1. [ ] **New** Server Script `ceo_command_center_api` — Script Type API, API Method `ceo_command_center_api`, Script ← `01. Leadership & Corporate/CEO Command Center/server_scripts/ceo_command_center_api.py`. Check `/api/method/ceo_command_center_api?action=source_health` as the CEO.
2. [ ] **Update** `exec_admin_api` ← `05. HR & Administration/Executive Secretary/exec_admin_api_server_script.py` (fix A17: no hidden 180-day/400-row cut-off).
3. [ ] **Update** `CEO Command Center Legal Taradhi API` ← `.../CEO Command Center/server_scripts/ceo_command_center_legal_taradhi_dee38552.py` (A13; only used by the v1 rollback).
4. [ ] DMCC prerequisites, in order: install DocType from `01. Leadership & Corporate/DMCC Dashboard/dmcc_integration_settings.json`; enter the key in DMCC Integration Settings; **new** Server Script `dmcc_dashboard_proxy` ← `.../DMCC Dashboard/server_scripts/dmcc_dashboard_proxy.py`; ask the DMCC owner to rotate the key that is exposed in the current live block.

## B. Blocks with code fixes (do these first)

5. [ ] **CEO Command Center** — HTML ← dashboard.html; Style ← dashboard.css; Script ← dashboard.js · v2 with Approvals tab (needs step 1 first)
6. [ ] **CP Blocked Customer** — Script ← dashboard.js · fix A18 (count each customer once) + design
7. [ ] **CSD Blocked Customer** — Script ← dashboard.js · fix A18 (count each customer once) + design
8. [ ] **EP Blocked Customer** — Script ← dashboard.js · fix A18 (count each customer once) + design
9. [ ] **MP Blocked Customer** — Script ← dashboard.js · fix A18 (count each customer once) + design
10. [ ] **SRD Blocked Customer** — Script ← dashboard.js · fix A18 (count each customer once) + design
11. [ ] **WP Blocked Customer** — Script ← dashboard.js · fix A18 (count each customer once) + design
12. [ ] **Inventory Dashboard** — HTML ← dashboard.html; Style ← dashboard.css; Script ← dashboard.js · fix A16 (native stock balances) + new header
13. [ ] **Pre-Procurement Command Center** — Style ← dashboard.css; Script ← dashboard.js · overdue/backlog basis fix + design
14. [ ] **Digital Marketing Dashboard** — Style ← dashboard.css; Script ← dashboard.js · fixes A03/A04 + design
15. [ ] **DM contracting Dept. Dashboard** — Style ← dashboard.css; Script ← dashboard.js · widget heading repair + design
16. [ ] **Scaffolding rental - Employee Dashboard** — Style ← dashboard.css; Script ← dashboard.js · widget heading repair + design
17. [ ] **DMCC Dashboard** — Script ← dashboard.js; Style ← dashboard.css · only after step 4, otherwise it cannot load data (removes the exposed key from the browser).

## C. Design only (header/filter bar, dark mode, language) — any order

18. [ ] **DMS Sales Manager Dashboard** — Style ← dashboard.css; Script ← dashboard.js
19. [ ] **Lead Management Dashboard** — Style ← dashboard.css; Script ← dashboard.js
20. [ ] **My Leads Dashboard** — Style ← dashboard.css; Script ← dashboard.js
21. [ ] **Sales CRM & Conversion Tracker Dashboard** — Style ← dashboard.css; Script ← dashboard.js
22. [ ] **Customs & Post-Procurement Dashboard** — Style ← dashboard.css; Script ← dashboard.js
23. [ ] **DN & GRN Tracker Dashboard** — Style ← dashboard.css; Script ← dashboard.js
24. [ ] **Accounts Payable Dashboard** — Style ← dashboard.css; Script ← dashboard.js
25. [ ] **SOA Collector** — Style ← dashboard.css
26. [ ] **Credit Controller Dashboard** — Style ← dashboard.css; Script ← dashboard.js
27. [ ] **Finance internal  controller** — Style ← dashboard.css; Script ← dashboard.js
28. [ ] **Finance Manager dashboard** — Style ← dashboard.css; Script ← dashboard.js
29. [ ] **Payroll cost center dashboard** — Style ← dashboard.css; Script ← dashboard.js
30. [ ] **SOA Manager** — Style ← dashboard.css
31. [ ] **SOA Request Dashboard** — Style ← dashboard.css
32. [ ] **Treasury Dashboard** — Script ← dashboard.js (its styles live inside the script)
33. [ ] **VAT & ZATCA Command Center** — Style ← dashboard.css; Script ← dashboard.js
34. [ ] **Admin & HR Platforms Expiry Dashboard** — Style ← dashboard.css; Script ← dashboard.js
35. [ ] **Admin HR Dashboard** — Style ← dashboard.css
36. [ ] **Employee Dashboard Prototype** — Style ← dashboard.css
37. [ ] **Employee Vacation Tracker** — Style ← dashboard.css
38. [ ] **Govt Relation Dashboard** — Style ← dashboard.css
39. [ ] **DMS Technical Department Dashboard** — Style ← dashboard.css; Script ← dashboard.js
40. [ ] **DMS My Projects Dashboard** — Style ← dashboard.css; Script ← dashboard.js
41. [ ] **DM Technical Department Command Center** — Style ← dashboard.css; Script ← dashboard.js
42. [ ] **ERP User Access Dashboard** — Style ← dashboard.css; Script ← dashboard.js
43. [ ] **DM IT Asset Acquisition Dashboard** — Style ← dashboard.css; Script ← dashboard.js
44. [ ] **IT Platforms Expiry Dashboard** — Style ← dashboard.css; Script ← dashboard.js
45. [ ] **Delivery Forklift Dashboard** — Style ← dashboard.css; Script ← dashboard.js
46. [ ] **Fleet Dashboard** — Style ← dashboard.css
47. [ ] **FM & Inventory Dashboard** — Style ← dashboard.css
48. [ ] **Logistics Dashboard** — Style ← dashboard.css
49. [ ] **Manufacturing Dashboard** — Style ← dashboard.css; Script ← dashboard.js
50. [ ] **Operation Dashboard** — Style ← dashboard.css
51. [ ] **Plant & Furniture Asset Dashboard** — Style ← dashboard.css; Script ← dashboard.js
52. [ ] **Production Dashboard** — Style ← dashboard.css; Script ← dashboard.js
53. [ ] **DM Document Control Command Center** — Style ← dashboard.css; Script ← dashboard.js
54. [ ] **Taradhi/Legal Dashboard** — Style ← dashboard.css

## Not needed / not yet fixed

- Already identical to local: CEO Agent, Durar Sheets, Executive Secretary block, all other Server Scripts.
- **Employee Dashboard ToDo API (`emp_todo_dashboard`) is still broken on live** (audit B01: min()/avg() rejected). No local fix exists yet.
- After everything is live, run the Rollback note in `reports/2026-11-16/ceo-command-centre-build.md` only if needed.
