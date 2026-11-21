/* Browser test + screenshot QA for "05. HR & Administration/Employee Vacation" (v2 on the DM kit; Vacation, Air Ticket,
   Refund & Exit Re-entry Tracker). v1's rules are kept: approved, submitted Annual Leave DIRECT / INDIRECT only; matched to
   the Employee Vacation Record by leave application; leavers, back-office locations and test employees excluded; status
   from the vacation record or, without one, from the leave dates; the period shows overlapping vacations plus overdue ones.
   Fixture (default period: today − 60 to today + 60):
   - LA1 E1 overdue 5 days, re-entry expired, action comment, refund 2,000 claimed / 500 received / 1,500 pending;
   - LA2 E2 on vacation, re-entry expiring in 4 days; LA3 E3 not yet departed, re-entry not recorded;
   - LA4 E4 upcoming without a vacation record (derived "Upcoming"); LA5 E5 re-joined 2 days late;
   - LA6 E6 ended without a vacation record (derived "Return Unverified");
   - excluded: LA7 (employee Left), LA8 (Back Office), LA9 (outside the period), LA10 (Sick Leave, filtered by the query).
   Pending: overdue 1 + re-entry expired 1 + action comment 1 + expiring 1 + not recorded 1 + unverified 1 + refund 1 = 7. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
const DEPT = ['SAL - Sales - DMG', 'OPS - Operations - DMG'];
function build() {
  const emp = Array.from({ length: 10 }, (_, i) => ({ name: 'E' + (i + 1), employee_name: ['Ali Hassan', 'Omar Saleh', 'Sara Khan', 'Raj Patel', 'Lina Aziz', 'John Cruz', 'Maha Said', 'Pedro Silva', 'Gone Person', 'Desk Worker'][i], company: 'Durar Masagh Trading Company', department: DEPT[i % 2], custom_job_location: i === 9 ? 'Back Office' : i % 2 ? '28 Factory' : 'Head Office Riyadh', status: i === 8 ? 'Left' : 'Active' }));
  const la = (n, e, f, t, o) => Object.assign({ name: 'LA' + n, employee: 'E' + e, employee_name: emp[e - 1].employee_name, company: 'Durar Masagh Trading Company', department: emp[e - 1].department, leave_type: 'Annual Leave DIRECT', from_date: d(f), to_date: d(t), total_leave_days: t - f + 1, status: 'Approved', docstatus: 1, workflow_state: 'Approved', custom_destination: 'Cairo', custom_reentry_date_as_per_exitentry: null, custom_job_location: emp[e - 1].custom_job_location }, o || {});
  const evr = (n, o) => Object.assign({ name: 'EVR-' + n, employee: 'E' + n, leave_application: 'LA' + n, vacation_from: null, ticket_status: 'No Ticket Record', refund_claimed: 0, refund_received: 0, refund_pending: 0, refund_status: 'Not Applicable', days_overdue: 0 }, o);
  return {
    Employee: emp, Company: [{ name: 'Durar Masagh Trading Company' }, { name: 'DM Intl' }],
    'Leave Application': [la(1, 1, -20, -6), la(2, 2, -5, 10), la(3, 3, 5, 20), la(4, 4, 30, 44), la(5, 5, -40, -25), la(6, 6, -15, -2), la(7, 9, -3, 5), la(8, 10, -3, 5), la(9, 7, -200, -190), la(10, 8, -3, 2, { leave_type: 'Sick Leave' })],
    'Employee Vacation Record': [
      evr(1, { vacation_status: 'Overdue', expected_rejoin_date: d(-5), days_overdue: 5, reentry_status: 'Expired', reentry_expiry_date: d(-1), reentry_days_left: -1, action_comment: 'Call employee: 5 days overdue, exit re-entry not renewed', action_priority: 'High', ticket_status: 'Booked', ticket_no: 'TK-1', airline: 'Saudia', refund_claimed: 2000, refund_received: 500, refund_pending: 1500, refund_status: 'Partially Received' }),
      evr(2, { vacation_status: 'On Vacation', expected_rejoin_date: d(11), reentry_status: 'Expiring in 7 Days', reentry_expiry_date: d(4), reentry_days_left: 4, ticket_status: 'Booked' }),
      evr(3, { vacation_status: 'Not Yet Departed', expected_rejoin_date: d(21), reentry_status: 'Not Recorded' }),
      evr(5, { vacation_status: 'Re-joined', expected_rejoin_date: d(-24), actual_rejoin_date: d(-22), reentry_status: 'Returned' })]
  };
}
const content = t => t.$('[data-ref="content"]').innerText();
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
run({
  slug: 'employee-vacation', folder: '05. HR & Administration/Employee Vacation', build,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => t.kpiVal(i))), ['6', '1', '1', '1', '1', '1', '1', '1', '2,000', '500', '1,500']); H.ok('KPIs: 6 vacations in the period (leaver, back office, out-of-period and sick leave excluded); re-entry and refund figures from the vacation records');
    const q = t.log.find(x => x.a.doctype === 'Leave Application' && x.a.limit_page_length === 500); H.assert.ok(q.a.filters.some(f => f[0] === 'leave_type' && f[1] === 'in') && q.a.filters.some(f => f[0] === 'status' && f[2] === 'Approved')); H.ok('query: approved, submitted annual leave only (v1 filters)');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '7'); H.ok('pending = 7');
    const ov = await content(t); H.assert.match(ov, /Head Office Riyadh[\s\S]*% available/); H.ok('location coverage from active employees');
    await t.$('[data-act="calday"][data-v="' + TODAY + '"]').click(); await t.idle(); H.assert.match(await content(t), /Omar Saleh · OPS/); H.ok('calendar: today lists who is on leave');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="followup"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_follow'), 6);
    await t.$('[data-act="ftab"][data-v="Needs action"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_follow'), 1); H.ok('follow-up list: 6, "Needs action" narrows to the commented record');
    await t.$('[data-act="ftab"][data-v="All"]').click(); await t.idle();
    await t.$('[data-tbl="t_follow"] [data-v="r:LA6"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerText(), /No Employee Vacation Record exists for this leave/); H.ok('details: unmatched leave explains the derived status'); await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="timeline"]').click(); await t.idle(); H.assert.equal(await t.$('.ev-gantt rect[rx="8"]').count(), 2); H.ok('timeline: two vacations away now (overdue + on vacation)');
    await t.$('[data-act="tab"][data-v="depts"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_dept'), 2);
    await t.$('[data-act="tab"][data-v="travel"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_rf'), 1);
    await t.$('[data-act="tab"][data-v="reentry"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_re'), 5); H.ok('departments, refunds and re-entry lists');
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="dept"]').selectOption(DEPT[1]); await t.$('[data-act="fapply"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_re'), 3); H.ok('department filter (Operations: LA2, LA4 and LA6 not back with no valid re-entry)');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    t.ctl.fail = a => a.doctype === 'Employee Vacation Record'; await t.$('[data-ref="refresh"]').click(); await t.idle();
    H.assert.match(await content(t), /Source unavailable[\s\S]*Employee Vacation Record/); H.ok('a vacation-record permission failure is shown, not hidden as zero');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
  }
});
