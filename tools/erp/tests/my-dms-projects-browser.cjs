/* Browser test + screenshot QA for "06. Technical & Projects/My DMS Projects" (v2 on the DM kit).
   The five Server Script APIs are mocked in their response shapes (see server_scripts). The fixture is one salesperson
   (E1 Ahmed Ali) with 10 projects: P1 and P2 overdue (5 and 1 days), P3 due today, P4 upcoming, P5 never contacted,
   the rest in later stages; three technical submittals (one Revision Required, one Rejected from a previous salesperson
   that cannot be opened, one Approved); three contact requests (Pending, Shared with two contacts, Rejected).
   Pending = overdue 2 + technical action 2 + due today 1 + never contacted 1 (count only) = 6.
   The follow-up form is exercised end to end: validation messages, Won clears the next date, the save call carries the
   v1 arguments, and the page reloads afterwards. Nothing is written anywhere: dms_add_follow_up is a mock. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
const P = (n, st, next, o) => Object.assign({ project: 'PRJ-' + n, project_code: 'DMS-00' + n, project_name: 'Project ' + n, follow_up_status: st, next_follow_up_date: next }, o || {});
const SAVED = [];
function myData() {
  return { status: 'success', employee: { name: 'E1', employee_name: 'Ahmed   Ali' },
    summary: { total_projects: 10, never_contacted: 1, contacted: 3, meeting_scheduled: 2, quotation_submitted: 1, negotiation: 1, won: 1, lost: 1, due_today: 1, overdue: 2, upcoming: 1 },
    due_today_projects: [P(3, 'Contacted', TODAY)], overdue_projects: [P(1, 'Negotiation', d(-5), { days_overdue: 5 }), P(2, 'Contacted', d(-1), { days_overdue: 1 })], upcoming_projects: [P(4, 'Meeting Scheduled', d(3))],
    technical: { total: 3, action_required: 2, requested: 0, in_preparation: 0, submitted: 0, under_review: 0, approved: 1, approved_with_comments: 0, revision_required: 1, rejected: 1,
      rows: [{ name: 'TS-0101', project: 'PRJ-1', project_code: 'DMS-001', project_name: 'Project 1', status: 'Revision Required', required_date: d(4), submittal_date: d(-6), revision_no: 1, can_open: true, products: [{ submittal_product: 'Panel A', brand: 'ABB', approval_product: '' }, { submittal_product: 'Panel B', brand: 'ABB' }] },
        { name: 'TS-0102', project: 'PRJ-2', project_code: 'DMS-002', project_name: 'Project 2', status: 'Rejected', required_date: d(-2), submittal_date: d(-20), revision_no: 0, can_open: false, products: [] },
        { name: 'TS-0103', project: 'PRJ-6', project_code: 'DMS-006', project_name: 'Project 6', status: 'Approved', required_date: d(-30), submittal_date: d(-40), revision_no: 0, can_open: true, products: [{ submittal_product: 'Cable', brand: 'Nexans', approval_product: 'Cable' }] }] } };
}
const methods = {
  dms_my_projects_dashboard_data: () => myData(),
  dms_my_key_personnel_requests: () => ({ counts: { total: 3, Pending: 1, 'In Progress': 0, Shared: 1, Rejected: 1 }, truncated: false, requests: [
    { name: 'KPR-001', dms_project: 'PRJ-1', project_code: 'DMS-001', project_name: 'Project 1', required_designation: 'Project Manager', request_date: d(-3), status: 'Pending' },
    { name: 'KPR-002', dms_project: 'PRJ-2', project_code: 'DMS-002', project_name: 'Project 2', required_designation: 'MEP Engineer', request_date: d(-10), status: 'Shared' },
    { name: 'KPR-003', dms_project: 'PRJ-3', project_code: 'DMS-003', project_name: 'Project 3', required_designation: 'Owner', request_date: d(-12), status: 'Rejected', manager_remarks: 'Client asked not to share' }] }),
  dms_project_shared_contacts: () => ({ requests: [{ name: 'KPR-002', status: 'Shared', is_mine: true, shared_date: d(-8) + ' 10:00:00', contact: { contact_name: 'Yousef Karim', mobile_number: '+966 50 000 0000', email_address: 'yousef@example.com' }, contacts: [{ contact_name: 'Yousef Karim' }, { contact_name: 'Hana Saleh', designation: 'Engineer', mobile_number: '0501111111', email_address: 'hana@example.com' }] }] }),
  dms_get_shared_key_personnel_contact: a => ({ request_id: a.request_id, project_code: 'DMS-002', project_name: 'Project 2', requested_designation: 'MEP Engineer', contacts: [{ contact_name: 'Yousef Karim', designation: 'MEP Lead', company: 'Consultant Co', mobile_number: '+966 50 000 0000', email_address: 'yousef@example.com' }, { contact_name: 'Hana Saleh', designation: 'Engineer', company: 'Consultant Co', mobile_number: '0501111111', email_address: 'hana@example.com' }] }),
  dms_add_follow_up: a => { SAVED.push(a); return { ok: 1, project: a.project, history_rows: 1 }; }
};
const content = t => t.$('[data-ref="content"]').innerText();
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
run({
  slug: 'my-dms-projects', folder: '06. Technical & Projects/My DMS Projects', build: () => ({}), methods,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => t.kpiVal(i))), ['10', '1', '1', '2', '1', '3', '2', '1', '1', '1', '1']); H.ok('project cards from the API summary');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '6'); H.ok('pending = overdue 2 + technical 2 + due today 1 + never contacted 1');
    H.assert.match(await t.$('[data-dms-root]').innerText(), /Welcome, Ahmed Ali/); H.ok('greeting uses the linked employee (spaces cleaned, as v1)');
  },
  interactions: async (t, H) => {
    await t.$('[data-tbl="t_over_ov"] [data-act="fu"]').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    await t.$('[data-act="fusave"]').click(); await t.idle(); H.assert.match(await t.$('.dms-modal').innerText(), /Please enter Remarks/); H.assert.equal(SAVED.length, 0); H.ok('remarks are required (v1 rule); nothing is sent');
    await t.$('[data-fu="status"]').selectOption('Won'); await t.idle(); H.assert.equal(await t.$('[data-fu="date"]').isDisabled(), true);
    await t.$('[data-fu="remarks"]').fill('Signed the order'); await t.$('[data-act="fusave"]').click(); await t.idle();
    H.assert.deepEqual(SAVED[0], { project: 'PRJ-1', follow_up_status: 'Won', next_follow_up_date: '', remarks: 'Signed the order' }); H.assert.equal(await t.$('.dms-modal').count(), 0);
    H.assert.ok(t.log.filter(x => x.method === 'dms_my_projects_dashboard_data').length >= 2); H.ok('Won clears the next date; save sends the v1 arguments, closes and reloads');
    await t.$('[data-act="tab"][data-v="technical"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_ts'), 3);
    H.assert.match(await content(t), /2 Technical Submittals need your action/); H.assert.match(await content(t), /Panel A\s*\+1\s*more/); H.ok('technical submittals: action banner, product summary');
    await t.$('[data-act="tab"][data-v="contacts"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_kcr'), 3);
    H.assert.match(await content(t), /Yousef Karim[\s\S]*\+1 more contact/); H.assert.doesNotMatch(await content(t), /Client asked not to share[\s\S]*Yousef/); H.ok('contacts appear only for the shared request');
    await t.$('[data-ref="content"] .dms-kpi[data-v="kf:Shared"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_kcr'), 1); H.ok('request cards filter the list');
    await t.$('[data-act="kview"]').click(); await t.$('.dms-modal').waitFor(); await t.idle(); H.assert.match(await t.$('.dms-modal').innerText(), /Contacts Shared - KPR-002[\s\S]*Hana Saleh/); await t.page.keyboard.press('Escape'); H.ok('view contact loads the shared contacts on demand');
    await t.$('[data-ref="content"] .dms-kpi[data-v="kf:all"]').click(); await t.idle();
  }
});
