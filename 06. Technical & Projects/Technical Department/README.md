# Technical Department

ERP Custom HTML Block: `DM Technical Department Command Center`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.

## v2 · moved onto the DM dashboard standard (19 Nov 2026)

v2 moves v1 (the Technical Department Command Center) onto the shared DM kit. v1 is in git history (commit `962142f`). The block stays read-only, and uses permission-checked `get_list` only.

**Kept from v1:**
- **Records:** one record per submittal line or approval line.
- **Salespeople:** matched to Sales Person names case-insensitively. Anything else counts as unattributed.
- **Statuses:** upper-cased, as in v1.
- **Rates:** conversion is approvals ÷ submittals.
- **Achievement:** 5 approvals = 100%, averaged over the reps with at least one approval ever. This is the Metabase card 664 rule.
- **DMS overdue:** open and past the required date.
- **Also kept:** the tabs (overview, submittals, approvals, pre-qualification, salesperson performance, location and product, DMS workflow) and the EN/AR dictionary (reused as is).

**Changed:**
- **Cancelled documents:** no longer counted. v1 counted documents with docstatus 2.
- **Child rows:** read from the child table with its parent's permission (`Submittal Request table`, `Approvals child table`), instead of the dotted-field syntax.
- **Shell:** the toolbar, filters (from and to as date filters), tabs, tables (search, sort, paging, CSV), status lists, RTL, dark mode and layout down to 320 px come from the kit.
  - Status colours now carry meaning: approved is green, under approval or pending is amber, rejected is red.
  - Excluded from `tools/erp/shell/shell_map.json`. Don't re-add it.
- **Failures:** a source that fails is named on the page, and nothing is shown as zero.
- **Actions pending:**
  - High: DMS submittals past the required date.
  - Medium: DMS submittals needing revision, and submittals under approval for more than 30 days.
  - Low: submittals not attributed to a salesperson.

**Test:** `npm --prefix tools/erp run test:technical-dept`. Screenshots are saved in `.local/qa/technical-dept`.
