/* Browser test + screenshot QA for "06. Technical & Projects/DMS Technical Department" (v2 on the DM kit).
   The block reads the unchanged Server Script API dms_technical_dashboard_data. The mock below applies the server's own
   rules to a fixture (see server_scripts/dms_technical_dashboard_data_*.py): status counts ignore the status filter;
   overdue = Requested / In Preparation / Revision Required and past the required date; Action Required = open or
   overdue, overdue then priority then required date; Under Review = Submitted / Under Review by submittal date;
   Recently Approved = Approved* by decision date (25); Recent Requests = latest 25.
   Fixture: TS1 Requested, required 3 days ago (overdue, urgent); TS2 Revision Required (due in 5 days); TS3 In Preparation
   due tomorrow; TS4 Under Review submitted 20 days ago; TS5 Submitted 3 days ago; TS6 Approved; TS7 Rejected; TS8 Cancelled.
   Pending = overdue 1 + revision 1 + due within 2 days 1 + waiting > 14 days 1 = 4. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
const OPEN = ['Requested', 'In Preparation', 'Revision Required'], WAIT = ['Submitted', 'Under Review'], APPR = ['Approved', 'Approved with Comments'];
const STATUSES = ['Requested', 'In Preparation', 'Submitted', 'Under Review', 'Revision Required', 'Approved', 'Approved with Comments', 'Rejected', 'Cancelled'];
const rec = (n, status, o) => Object.assign({ name: 'TS-000' + n, status, priority: 'Normal', dms_project: 'PRJ-' + (n % 2 ? 1 : 2), project_code: n % 2 ? 'DMS-001' : 'DMS-002', project_name: n % 2 ? 'Tower A' : 'Mall B', client: 'Client ' + n, sales_person: n % 2 ? 'E1' : 'E2', sales_person_name: n % 2 ? 'Ahmed Ali' : 'Sara Noor', requested_by: 'Eng ' + n, department: n % 2 ? 'Technical' : 'Sales', required_date: null, submittal_date: null, approval_date: null, request_date: d(-30 + n), submission_type: 'Material', revision_no: '0', products: n }, o);
const DB = [rec(1, 'Requested', { priority: 'Urgent', required_date: d(-3) }), rec(2, 'Revision Required', { required_date: d(5), revision_no: '1' }), rec(3, 'In Preparation', { required_date: d(1), priority: 'High' }), rec(4, 'Under Review', { submittal_date: d(-20) }), rec(5, 'Submitted', { submittal_date: d(-3) }), rec(6, 'Approved', { approval_date: d(-2) }), rec(7, 'Rejected', { approval_date: d(-6) }), rec(8, 'Cancelled')];
function api(a) {
  const dd = (x, y) => Math.round((Date.parse(x) - Date.parse(y)) / 864e5);
  let rows = DB.filter(r => (!a.department || r.department === a.department) && (!a.sales_person || r.sales_person === a.sales_person) && (!a.dms_project || r.dms_project === a.dms_project) && (!a.priority || r.priority === a.priority) && (!a.from_date || r.request_date >= a.from_date) && (!a.to_date || r.request_date <= a.to_date))
    .map(r => Object.assign({}, r, { days_left: r.required_date ? dd(r.required_date, TODAY) : null, overdue: !!(r.required_date && OPEN.includes(r.status) && r.required_date < TODAY), waiting_days: WAIT.includes(r.status) && r.submittal_date ? dd(TODAY, r.submittal_date) : null }));
  const counts = { total: rows.length, overdue: rows.filter(r => r.overdue).length }; STATUSES.forEach(s => { counts[s] = rows.filter(r => r.status === s).length; });
  const sf = a.status || '', vis = rows.filter(r => !sf || (sf === 'Overdue' ? r.overdue : r.status === sf)), rank = { Urgent: 0, High: 1, Normal: 2 };
  const action = vis.filter(r => OPEN.includes(r.status) || r.overdue).sort((x, y) => ((x.overdue ? '0' : '1') + rank[x.priority] + (x.required_date || '9999')).localeCompare((y.overdue ? '0' : '1') + rank[y.priority] + (y.required_date || '9999')));
  return { counts, action, review: vis.filter(r => WAIT.includes(r.status)).sort((x, y) => (x.submittal_date || '9').localeCompare(y.submittal_date || '9')), approved: vis.filter(r => APPR.includes(r.status)).slice(0, 25), recent: vis.slice(0, 25),
    options: { department: [{ value: 'Sales', label: 'Sales' }, { value: 'Technical', label: 'Technical' }], sales_person: [{ value: 'E1', label: 'Ahmed Ali' }, { value: 'E2', label: 'Sara Noor' }], dms_project: [{ value: 'PRJ-1', label: 'DMS-001 - Tower A' }, { value: 'PRJ-2', label: 'DMS-002 - Mall B' }] }, today: TODAY };
}
const methods = { dms_technical_dashboard_data: a => api(a) };
const content = t => t.$('[data-ref="content"]').innerText();
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
run({
  slug: 'dms-technical', folder: '06. Technical & Projects/DMS Technical Department', build: () => ({}), methods,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => t.kpiVal(i))), ['8', '1', '1', '1', '1', '1', '1', '0', '1', '1']); H.ok('status cards from the API counts (total, 8 statuses, overdue)');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '4'); H.ok('pending = overdue + revision + due within 2 days + waiting > 14 days');
    H.assert.match(await content(t), /TS-0001[\s\S]*3 days overdue[\s\S]*TS-0003[\s\S]*in 1 day/); H.ok('Action Required: overdue first, then due soon');
  },
  interactions: async (t, H) => {
    await t.$('[data-ref="content"] .dms-kpi[data-v="stf:Under Review"]').click(); await t.idle();
    const call = t.log.filter(x => x.method === 'dms_technical_dashboard_data').pop(); H.assert.equal(call.a.status, 'Under Review'); H.assert.equal(await t.kpiVal(0), '8'); H.ok('a status card sets the status filter; counts ignore it (as v1)');
    await t.$('[data-act="tab"][data-v="review"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_review'), 1); H.ok('Under Review list follows the filter');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await t.$('[data-act="tab"][data-v="recent"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_recent'), 8);
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="sales_person"]').selectOption('E2'); await t.$('[data-act="fapply"]').click(); await t.idle();
    H.assert.equal(t.log.filter(x => x.method === 'dms_technical_dashboard_data').pop().a.sales_person, 'E2'); H.assert.equal(await rowsIn(t, 't_recent'), 4); H.ok('salesperson filter goes to the API');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  }
});
