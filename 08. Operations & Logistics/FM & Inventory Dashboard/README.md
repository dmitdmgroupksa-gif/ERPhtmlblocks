# FM & Inventory Dashboard

ERP Custom HTML Block: `FM & Inventory Dashboard`

- [JavaScript](dashboard.js)
- [CSS](dashboard.css)
- [HTML](dashboard.html)
- [Original record](source.json)

## v5 redesign (17 Nov 2026)

- **Design.** Fleet dashboard palette inside the shared DM shell. The navy header is one line, with the royal-blue tab bar and ERP links below it. Built to the [unslop](https://github.com/heydamir/unslop) rules (CC BY 4.0, Damir Sokolovsky): separate KPI cards with 12 px gaps, no decorative icons or gradients, sentence case, weights 400–600, one accent per chart, and ordinal grey → amber → red scales for aging. Light/dark follows the desk theme (`THEME_MODE = 'auto'`).
- **Shared shell.** Excluded from `tools/erp/shell/shell_map.json` because the block is built on the standard directly. Don't re-add it; the generator would inject the old `#rail` overrides.
- **Speed.** The overview is ready in about 6 s, down from about 32 s, and transfers 1.7 MB instead of 8.8 MB.
  - Stock age comes from 4 grouped Stock Ledger Entry counts (30 / 90 / 180 / 365-day windows) instead of a full ledger scan, and loads in the background. Its cards show "Calculating…" until it arrives.
  - Items are fetched only for codes in Bin.
  - Payment entries are 12 grouped monthly queries.
  - The last result is cached per user in `localStorage` (`fif-cache-v1:<user>`, same day, 12 h) and shown immediately while fresh data loads.
- **Behaviour change.** "Last moved" is now a window ("Within 30 days", "91–180 days ago", "Over 1 year ago") instead of an exact date. The site rejects `max()` in `get_list`, so the exact date would need a full ledger scan.

## v6 · aligned with the DM dashboard standard (18 Nov 2026)

v6 builds on the v5 redesign above rather than replacing it. The v5 files (uncommitted at the time) are backed up unchanged in `.local/backups/fm-inventory-v5-2026-11-18/`.

**Kept from v5:**
- Every data source and field.
- The thresholds: contracts 90 days, licences 60, rent 30, dead stock 180, payables 7.
- The rules: annualised rent, instalments from the Paid tick-boxes, licence flags, stock condition (negative, shortage, low, dead), the AR/AP buckets, P&L from grouped GL Entry, payments from grouped Payment Entry, and cash from the GL balance.
- The speed work:
  - last movement from 30 / 90 / 180 / 365-day windows, because the site rejects `max()`;
  - items only for codes in Bin;
  - grouped monthly queries.
- The per-user browser cache (now `fif-cache-v2:<user>`, same day, 12 h). It is labelled "saved data" while fresh data loads.
- Client-side filtering: changing a filter does not refetch; Refresh does.
- The detail drawer's sections, now shown as a dialog.

**Changed:**
- **Shell:** the toolbar, period, filters, tabs, tables, dialogs, RTL, dark mode and layout down to 320px come from the shared DM kit, so the block matches the other dashboards.
- **Actions pending:** v5's "Needs attention" lists became eight categories, each linking to its ERP record:
  - Facility contracts ending.
  - Licences and permits.
  - Rent instalments.
  - Shortage or negative stock.
  - Low stock.
  - Overdue receivables.
  - Payables due.
  - Negative cash / bank.
- **One currency per view (fixed):** v5 added amounts from all companies under one currency label.
  - Now amounts cover the companies in the system currency, and a banner names the companies left out.
  - Picking a company shows it on its own, in its own currency.
- **Period:** the kit period (default year to date) replaces v5's period select. It applies to revenue, expenses and payments within the 12 loaded months. Balances, stock and contracts are as of today.

**Deploy:** paste `dashboard.html`, `dashboard.css` and `dashboard.js` into the Custom HTML Block's HTML, Style and Script fields. The block stays out of `tools/erp/shell/shell_map.json`.

**Test:** `npm --prefix tools/erp run test:fm-inventory` (28 checks), with screenshots in `.local/qa/fm-inventory/`.

## Server scripts

No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.

Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.
