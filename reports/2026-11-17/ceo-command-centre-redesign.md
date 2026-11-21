# CEO Command Centre v3 — delivery and verification

Date: 17 November 2026. Continuation of the supplied Claude handoff, whose latest request was the CEO redesign with compact mobile layouts and faster loading. The completed Quotation tracker and unrelated workspace changes were preserved.

## Result and product context

The dashboard answers: what needs the executive's attention, who owns it, and what decision or follow-up comes next? It runs as a Frappe Custom HTML Block in a shadow root. It uses the existing `ceo_command_center_api` for all dashboard data; workflow decisions and comments use Frappe's native endpoints.

The interface uses the repository's navy/royal-blue shell, IBM Plex Sans and Arabic, semantic status colors with text labels, thin borders and restrained animation. The hierarchy is toolbar → tabs → five attention indicators → action queue and department matrix → commitments and company performance → source health. This is an operational dashboard; record reasons, amount basis and source limitations remain visible where necessary for decisions.

Desktop uses the available width. Narrow containers stack the main panels and use two-column indicators. On phones the title/language row sits above controls, rows fold into readable blocks, drawers fill the viewport, and the calendar scrolls within the popover. Toolbar and tab touch targets are at least 44px high. Calendar columns shrink at 320px rather than forcing page overflow. Form inputs use 16px text on coarse-pointer devices to avoid automatic focus zoom on mobile browsers.

## Implementation

- `01. Leadership & Corporate/CEO Command Center/dashboard.js`: retained the v3 redesign; completed queue response ordering, refresh behavior, confirmation focus trapping, focus restoration, and comment retention across repaints. Background content becomes inert while a modal/drawer is open. Approval totals stay unknown until their own source is available; department queue entries are labelled “Workflow actions.”
- `01. Leadership & Corporate/CEO Command Center/dashboard.css`: retained the v3 visual system; enlarged touch targets, tightened phone indicator sublines, and made the touch calendar columns fluid.
- `01. Leadership & Corporate/CEO Command Center/README.md`: updated the interface, cache, testing and benchmark documentation.
- `tools/erp/tests/ceo-command-center-browser.cjs`: expanded the inherited 33 checks to 41, including queue races, full-queue refresh, department refresh failures, confirmation focus and additional widths.
- `tools/erp/tests/ceo-fixture.cjs`: inherited deterministic synthetic fixture, shared by browser tests and benchmarks. Expected counts are computed outside the dashboard implementation.
- `tools/erp/tests/ceo-speed-bench.cjs`: completed the unfinished benchmark, fixed ambiguous tab selectors and awaited completed paging in both old and new layouts.
- `tools/erp/package.json`: added `bench:ceo`, preserving other scripts.

The HTML scaffold remains compatible. No new runtime dependencies were added. Existing uncommitted API sandbox fixes were preserved; this continuation did not change the server API.

## Loading comparison

Both versions ran in headless Edge at 1440×900 against the same fixture and latency model: bootstrap 300ms, overview/actions 1800ms, approvals 1200ms and department 900ms. The baseline files were extracted from repository HEAD into `.local/qa/ceo/baseline/`.

| Measurement | Baseline | v3 |
| --- | ---: | ---: |
| First useful content | 2,510ms | 2,054ms |
| Repeat visit to useful content | 2,379ms | 52ms |
| Approvals switch after Overview settles | 1,354ms | 54ms |
| Department switch with 400ms hover intent | 1,438ms | 876ms |
| View all + two page changes | 5,634ms | 2,007ms |
| Actions calls for that paging sequence | 3 | 1 |

Repeat visits paint saved data while revalidation continues; 52ms is not fresh-server-response time. Approvals timing benefits from the documented prefetch after Overview. Department timing excludes the 400ms hover dwell. Measurements are single-run observations under simulation, not production latency guarantees. Raw results: `.local/qa/ceo/speed-before.json` and `speed-after.json`.

The implementation parallelizes metadata and first-view requests, deduplicates concurrent view requests, caches per viewer/scope for the same site day (maximum 12 hours), and batches actions into four local pages per server fetch. Cached approvals remain disabled until a fresh response arrives. Native ERP checks still enforce each workflow decision.

## Verification

- `npm --prefix tools/erp run test:ceo`: **41 checks passed** in Edge/Chromium, using actual dashboard source in a shadow root with intercepted synthetic API responses.
- `npm --prefix tools/erp test`: **23 regression checks passed**.
- `npm --prefix tools/erp run test:shell`: shell, dark-theme and language generators report no stale/missing output.
- `python -m pytest tools/erp/tests/test_server_script_unpacking.py -q`: **2 passed**.
- `node --check "01. Leadership & Corporate/CEO Command Center/dashboard.js"`: passed.
- Scoped `git diff --check`: passed for the continued CEO frontend and browser-test files.
- No application compilation/build step exists for these Custom HTML Blocks. Browser execution and syntax validation are the applicable checks.

Browser coverage includes fixture counts; all primary navigation; department sections; presets/custom dates; company/due-window filters; queue pagination; details; rejection reason before workflow; eligible bulk approvals; disabled cached approvals; stale-data refresh failure; and a deliberately delayed older search that must not overwrite a newer one.

Widths: 320, 375, 768, 812 landscape, 1024, 1440, 1920 and 3440 CSS pixels. Arabic captures include desktop, phone and landscape. Dark mode is checked separately. Tests assert no horizontal page overflow; wide tables and tab strips retain local horizontal scrolling.

## Design and engineering reviews

The published instructions were read from these requested sources, with dashboard QA/layout/tokens and Impeccable refinement/hardening references:

- [Dashboard Design](https://github.com/abdiraimov-otabek/dashboard-design-skill/blob/main/skills/dashboard-design/SKILL.md)
- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md)
- [Impeccable](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/SKILL.md)
- [Ponytail](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md), [review](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail-review/SKILL.md), [audit](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail-audit/SKILL.md)

These were applied as manual design and engineering reviews. The requested slash commands and Impeccable binary/detectors are not installed. The attempted context launcher failed, so the review used the existing source, README, build notes, browser behavior and rendered captures directly. No claim is made that those commands or automated skill audits ran.

**Design critique:** the hierarchy puts pending decisions, critical/overdue work and ownership before supporting metrics. Colors retain text labels, currencies stay separate, no historical series is invented, and phone content reflows. Browser-style scrolling tabs intentionally follow the user's requested interaction instead of the dashboard skill's default phone menu. Explanatory record and policy copy remains where removing it would weaken an executive decision.

**Technical audit:** keyboard focus in confirmations and late queue responses were defects and are now fixed with browser regressions. Refresh retains the current department on failure and reloads a full queue without clearing the query. Static token contrast checks for normal text on the actual base surfaces are at least 4.64:1 in light mode and 5.59:1 in dark mode; this is not a complete WCAG certification. No unnecessary dependencies, server caching layer or invented analytics were introduced.

**Ponytail review/audit verdict:** the continued client-side paths pass the listed checks. The expensive server collectors remain unchanged; 100-row batching reduces repeated work without adding an unverified server cache. Audit scope is the CEO frontend, its existing API contract and native workflow callers; this is not a whole-ERP audit.

## Visual evidence and limits

Screenshots: `.local/qa/ceo/` (33 PNGs), including `overview-en-1440.png`, `overview-en-375.png`, `overview-ar-375.png`, `approvals-ar-375.png`, `state-calendar-en-320.png`, drawer states and dark mode. Existing pre-redesign reference images are in `before/`. A contact sheet is in `contact-sheet.jpg`; representative desktop, phone, Arabic approvals and calendar captures were opened for visual review.

No live records were read or changed and nothing was deployed or committed in this continuation. Fixture tests do not verify live totals, production permissions, real workflow outcomes or server response times. Physical iOS/Android devices, Safari and screen readers were not available; mobile checks use Chromium emulation. Core controls are localized; source data, analytic labels and some explanatory text can remain in their recorded English form. Historical attention-count snapshots are unavailable from the API, so attention cards have no fabricated sparklines/deltas.

To deploy, update the existing CEO Custom HTML Block's Script and Style fields from the dashboard files using the repository's deployment process, then verify totals, permissions, cache freshness and native workflows on the live site. Review the separately inherited API sandbox fixes before deciding whether to include that server script in a deployment.
