# DM dashboard shell — header and filter bar standard

One header and filter-bar pattern for every ERP Custom HTML Block dashboard, so dashboards look and behave alike. Reference implementations: **Fleet Dashboard** (origin of the pattern) and **CEO Command Centre v2** (same structure with an executive navy header).

## Structure (top to bottom)

```
┌ Header ─────────────────────────────────────────────────────────────┐
│ eyebrow (department) · Title (20–24px) · status line                │  [العربية] [⟳ Refresh]
│ "Loaded 09:12 · 4 sources · 1 needs attention"                      │
├ Tab bar (royal blue #2b4fc1, sticky, scrolls sideways on small screens) ┤
│ [Overview] [Section] [Section] …   active tab = white pill, blue text │
├ Filter bar (one card; labels above controls; one baseline) ─────────┤
│ Company | <primary scope filter> | From | To | [Apply] | Search…     │
├ Scope line ─────────────────────────────────────────────────────────┤
│ ● Read-only · Company X · Activity 2026-11-01 → 2026-11-16 · Balances as of today │
├ Source status (collapsed unless something failed) ───────────────────┤
└ Content …                         Footnote: date basis / read-only   ┘
```

## Rules

| Element | Rule |
| --- | --- |
| Header | Title + one status line (loaded time, record/source counts, background loading). Right side: Language toggle (English ⇄ العربية), then a primary **Refresh** button. No filters in the header. |
| Tabs | Royal-blue bar `#2b4fc1`; active tab white with `#1d3a9f` text; badges only for counts that need action, with a tooltip saying what they count. `role="tablist"`, arrow keys move between tabs. On narrow widths the bar scrolls horizontally with arrow buttons; no left sidebar. |
| Filter bar | Single card. Each control is `label > text + select/input`, 38px tall (44px on touch widths). Order: **Company** (when any source has a Company link) → domain scope (branch / factory / salesperson …) → **From / To** dates → **Apply** (only when changing filters triggers a reload) → **Search** (live, debounced 250ms) last. Changing select filters applies immediately; date ranges apply with Apply. |
| Scope line | States what the figures cover: permissions, company, the date basis of each kind of figure (period activity vs current balance vs all-open work). |
| States | Distinct wording for: No matching records · Source unavailable · Permission restricted · Not configured · Data incomplete. Never render these as 0. |
| Theme | Follow Desk: observe `<html data-theme>` and toggle a `-dark` class. Tokens in one `:root`-style block on the dashboard root class. |
| RTL | `dir="rtl"` on the dashboard root; logical CSS properties; dates, IDs and amounts in `<bdi>`/`direction:ltr`. |
| Responsive | Container queries on the dashboard root (blocks can sit in narrow Workspace columns): filter grid 6 → 3 → 2 → 1 columns at 1100 / 760 / 520px. No horizontal page scroll at 390px. |
| Fonts | IBM Plex Sans / IBM Plex Sans Arabic (with system fallbacks). |
| Bootstrapping | `const root = typeof root_element !== 'undefined' ? root_element : document;` dispose previous instance on re-render; abort pending requests. |

## Class names

Keep each dashboard's own prefix to avoid collisions inside Workspaces, but use the same suffixes: `-header`, `-hdr-btns`, `-tabs` (or `-tabbar`), `-filters`, `-search`, `-scope`, `-source-status`, `-footnote`, `-btn` / `-btn.primary`, `-pill`, `-state`.

## How it is applied (v1, 16 Nov 2026)

`tools/erp/shell/apply_shell.py` writes one generated CSS block, between `DM shell standard v1` markers, at the end of each dashboard's stylesheet. Treasury has no CSS file, so its block goes inside the JS-injected `<style>`. `tools/erp/shell/shell_map.json` maps each dashboard's existing header / tab bar / filter elements onto the standard. Data and script logic are unchanged; Inventory's HTML gained a header and filter wrapper.

```powershell
python tools/erp/shell/apply_shell.py            # apply / refresh after editing shell_map.json
python tools/erp/shell/apply_shell.py --check    # npm --prefix tools/erp run test:shell
python tools/erp/shell/apply_shell.py --remove   # roll back every block
```

- **Covered (43):** every dashboard except those excluded below. Where header, tabs and filters are siblings, they're reordered to Fleet's header → tabs → filters.
- **Variants:** Collector, SOA Manager and SOA Request keep a royal top strip (tabs + Refresh + Language) because they have no title. DM Contracting and Scaffolding keep their title band plus a royal tab strip. FM & Inventory and Legal keep tabs inside the navy header. Treasury's hero balance card is the navy header.
- **Excluded on purpose:** CEO Command Centre (built on the standard), CEO Agent, Durar Messenger and Durar Sheets (apps with their own chrome), and the six compact Blocked Customer cards.
- **Dark mode (28 dashboards that had none):** `tools/erp/shell/dark_theme.py` turns each stylesheet's colour rules into a dark variant. Light surfaces become dark, dark text becomes light, and hue is kept so status colours stay recognisable; brand colours and anything already dark are left alone. A two-line script mirrors Desk's `<html data-theme>` onto the block host, and the rules apply only in Desk dark mode. Light mode is unchanged (screenshot diff ≤ 0.02%, which is the refresh timestamps). Colours set inline from JavaScript (some chart bars, inline `style=` attributes) are not converted.
- **Language button (8 dashboards that had none):** DMCC, DMS Sales Management, Inventory, Finance Manager, DMS Technical Department, My DMS Projects, Delivery & Forklift and Manufacturing. `tools/erp/shell/i18n.py` adds an English / العربية button to the header, translates interface text after every render from `tools/erp/shell/i18n_ar.json`, and switches to RTL. The choice is remembered per viewer and shared across these dashboards. ERP data stays as recorded; dynamic text assembled from several pieces (for example "Updated 20:36") stays English.

```powershell
python tools/erp/shell/dark_theme.py   # / --check / --remove
python tools/erp/shell/i18n.py         # / --check / --remove   (edit i18n_ar.json to add or correct wording)
```

Deploy: paste each changed `dashboard.css` into the block's Style field (Treasury: its Script field; Inventory: HTML and Style).

## Colour roles

Red = critical / overdue · amber = due soon / review · blue = ordinary pending · green = healthy / complete · grey = unavailable / unverified. Colour is always paired with a text label.
