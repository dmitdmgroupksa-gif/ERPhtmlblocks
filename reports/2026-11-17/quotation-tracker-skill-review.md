# Quotation & SO Tracker — design and engineering review

## Resolution — 17 November 2026

All six findings below are fixed in the dashboard JavaScript/CSS and covered by the expanded browser suite. The original review remains below as the record of the reproduced defects.

- Primary-load success/error handlers use their own data object and check their request token. A failed required source suppresses dependent analytics instead of rendering false zero values; Refresh restores the view after recovery.
- “Not Assigned” applies a no-Sales-Team-row filter to order-action counts, candidates and drill-downs. Fixture verification now returns 7 overdue deliveries rather than the unfiltered 99; the second order-action category is checked too. Actual ERP compatibility of the child-table query still needs live verification; failures display unavailable.
- Dialog headings provide accessible names. The background is inert, Tab/Shift+Tab stay within the modal, and dismissal restores the KPI opener.
- Category queries order by urgency before sampling up to six records. ToDos rank their complete bounded dataset by the existing priority/overdue rule. Tests cover an older accepted quotation, an older urgent ToDo, and six visible actions from one category.
- Touch toolbar/tab controls meet the 44px height target. Fluid calendar columns fit 320px without inner overflow; touch form inputs use 16px text.
- Chart labels use measured localized text widths to choose tick spacing, with updates on font loading and container resizing. English and Arabic text-range checks find no collisions across the tested widths.

Final validation: **43 browser checks passed**, **23 repository regression checks passed**, shell/dark-theme/language generation checks passed, ES5 parsing passed, and scoped whitespace checks passed. Fresh screenshots are in `.local/qa/quotation-tracker/`; Arabic phone overview and 320px calendar captures were opened for visual inspection. Browser checks use Edge/Chromium with touch enabled for 320px, 375px and 768px contexts. No new dependencies or server changes were needed.

Nothing deployed or committed. Live ERP permissions/query behavior, physical devices and Safari remain unverified.

---

17 November 2026. Scope: the current Quotation & SO Tracker HTML, JavaScript, CSS, README and browser harness. Review only: no production source was changed.

## Verdict

The redesign has a coherent corporate visual system and a useful hierarchy, but needs correctness and accessibility fixes before release. The existing 35 browser checks pass; targeted browser probes reproduce six gaps below.

The review applies the published Dashboard Design, UI/UX Pro Max, Impeccable and Ponytail instructions read during this session. References are cached under `.local/qa/ceo/skills/`. Impeccable slash commands, binary context loader and automated detectors are not installed; this is a manual skill-guided review, not a claim that those commands ran. No new design-system search was needed to assess the existing system.

## Findings

### 1. [P1] Older date-range responses corrupt the current source status

Location: `02. Sales & CRM/Quotation & SO Tracker/dashboard.js:278` and the following Sales Order handler.

The two per-source completion handlers write into the mutable global `DATA` before checking the load token. Only the outer `Promise.all` checks whether the response belongs to the current load.

Reproduction: delay October's quotation/order list responses, switch to November, and return a permission failure for November's Sales Order list. After the older response arrives, the current model reports Sales Orders as `{ok: true, n: 11, expected: 11}` even though the current order array is empty. The visible order-value KPI reads `0 SAR`.

Impact: a failed source can look healthy and a financial total can look like a real zero. The existing stale-response test covers company-filter reconciliation and deltas; it does not cover primary date-range loads.

Smallest fix: capture the load's data object and check `chk()` before every per-source success/error mutation. Also gate dependent KPIs on their individual source availability. Add the delayed-success/current-failure scenario to the browser suite.

### 2. [P1] “Not Assigned” does not filter Sales Order actions

Location: `dashboard.js:412`.

Named salespeople receive a Sales Team filter, but `F.sp === NA` skips that filter entirely. The main Sales Order model correctly interprets that selection as orders without a Sales Team, so the pending panel disagrees with the selected scope.

Reproduction with the existing fixture: choose Salesperson → Not Assigned. The expected all-time overdue-delivery action count without a team is **7**. The panel displays **99**, the unfiltered total.

Impact: users following up missing ownership see assigned orders as well. They cannot trust the filter across the dashboard.

Smallest fix: implement a permission-aware no-Sales-Team predicate for both order-action categories. If that cannot be supported by the existing endpoint, explicitly mark those categories unavailable for this selection rather than display all orders. Test the no-team case independently of named-person filtering.

### 3. [P1] Drill-down dialogs allow focus behind the overlay

Locations: `dashboard.js:908` and `dashboard.js:1448`.

The dialog declares `aria-modal="true"` but has neither an accessible name nor a Tab focus boundary. Background controls remain active. Closing also lacks explicit focus restoration to the opener.

Reproduction: open the Quotations KPI drill-down. Focus starts on Close. Press Shift+Tab: focus moves to the background Data reconciliation button while the modal remains open. Both `aria-label` and `aria-labelledby` are absent on the dialog.

Impact: keyboard and assistive-technology users lose the dialog's context and can interact with obscured content.

Smallest fix: associate the heading with the dialog, make the background inert, contain forward/backward Tab navigation, and restore the opener when dismissed. Add keyboard checks beyond Escape.

### 4. [P2] “Most urgent first” excludes older accepted quotations before ranking

Locations: `dashboard.js:416`, `dashboard.js:460`, `dashboard.js:468`.

Accepted/no-order quotations are fetched with `transaction_date desc` and a limit of three. Their score then grows with age. Sorting after the fetch cannot recover older, higher-scoring records that were excluded by the query. ToDo sampling by most recently modified has a similar mismatch with priority/deadline scoring.

Reproduction: provide four accepted quotations without orders dated 1 January 2025 and 1–3 November 2026. The panel shows the three November records and omits the January record, although its score would be highest under the implementation's own rule.

Impact: the executive can miss the most overdue work despite the panel's explicit urgency claim.

Smallest fix: align server ordering with each category's urgency policy before limiting. Where the ranking is more complex, retrieve a sufficient bounded candidate set or rank server-side. Test four-plus candidates where modification/creation order differs from urgency.

### 5. [P2] Mobile controls miss the requested touch-size standard

Location: `02. Sales & CRM/Quotation & SO Tracker/dashboard.css:402`; test gap at `tools/erp/tests/quotation-tracker-browser.cjs:128`.

Under actual Chromium touch emulation (`hasTouch: true`, `isMobile: true`, `(pointer: coarse)` confirmed), inactive tabs are **34px** high, the selected tab **38px**, and language controls **38px**. These fall below UI/UX Pro Max's 44px target recommendation. This observation alone is not a claim of a WCAG AA target-size violation.

The responsive suite changes viewport size but does not enable touch. It therefore does not validate the coarse-pointer rules. At 320px, the calendar also has a 274px scroll width inside a 268px client width, despite no page-level overflow.

Impact: compactness is achieved partly by shrinking touch controls, and inner overflow escapes the current assertions.

Smallest fix: enlarge touch targets without shrinking the readable content, make calendar columns fluid, and run the mobile suite in a touch-enabled browser context with target-size and inner-overflow assertions.

### 6. [P2] Arabic chart labels overlap on phones

Locations: `dashboard.js:655` and `dashboard.css:278`.

The chart decides label frequency from bucket count alone (`ceil(keys.length / 8)`), without accounting for available width or localized text length. Labels use `white-space: nowrap` and visible overflow.

Reproduction: Arabic, 375px, year to date. Browser text-range measurements show overlapping month labels, including May and November. The full-page Arabic screenshot also shows those collisions.

Impact: users cannot reliably identify the month associated with a bar on the target mobile layout.

Smallest fix: reduce ticks based on plot width and localized label measurement, or use a shorter mobile label format with full dates in accessible details. Add a label-collision check in Arabic.

## Design critique and audit

What works: the toolbar groups controls consistently; six indicators establish a clear overview; pending records carry actions and ownership; ranked breakdowns are easier to compare than donuts; Arabic mirrors the layout; dark and reduced-motion states exist. Sparklines use the loaded time series rather than decorative values.

The main weakness is information trust, not visual identity. Incorrect source health, a filter that silently broadens one section, and sampling that contradicts urgency deserve priority over more visual polish. Phone KPI context is frequently ellipsized and the initial indicator block is tall, but these are secondary to the verified defects above.

Manual Impeccable audit scores (review judgments, not automated measurements or certification):

| Dimension | Score / 4 | Evidence |
| --- | ---: | --- |
| Accessibility | 2 | Modal name and focus boundary missing |
| Performance | 3 | Bounded requests and period cache; no live latency benchmark in this review |
| Theming | 3 | Light/dark rendering and semantic tokens; not every rendered contrast pair measured |
| Responsive design | 2 | Desktop/tablet/phone layouts exist; touch and Arabic label gaps reproduced |
| Implementation integrity | 2 | Primary-load status race, inconsistent filter and urgency selection |
| Total | **12 / 20** | Significant fixes needed |

Ponytail verdict: fix findings 1–3 before release, then 4–6 before claiming the requested mobile and urgency behavior is complete. These can be addressed within the current architecture; no new frontend framework or component library is justified.

## Evidence and limits

- `npm --prefix tools/erp run test:quotation`: **35 passed** against the synthetic fixture.
- `node --check "02. Sales & CRM/Quotation & SO Tracker/dashboard.js"`: passed.
- Targeted Edge/Chromium probes reproduced the status race, no-team filter mismatch, focus escape, urgency omission, touch measurements and Arabic label overlaps.
- Fresh full-suite screenshots: `.local/qa/quotation-tracker/`. Desktop overview and Arabic phone overview were opened for visual review.
- Reproduction scripts and output: `.local/qa/quotation-review/probe.cjs`, `probe-results.txt`, `filter-probe.cjs`, `filter-results.txt`. Screenshots include `race.png` and `touch-calendar-320.png`.
- The probe exposes a read-only getter in the in-memory test copy to inspect the status race; the dashboard file on disk is unchanged.

Not checked: live ERP totals/permissions, actual Sales Team child-query compatibility, physical devices, Safari, screen readers or production server latency. Currency formatting is hardcoded to SAR; confirm that all selectable companies use SAR base currency before relying on combined-company values. No deployment, workflow writes, commits or production-source fixes were made.
