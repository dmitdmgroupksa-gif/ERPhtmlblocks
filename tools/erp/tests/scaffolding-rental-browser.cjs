/* Browser test + screenshot QA for "08. Operations & Logistics/Scaffolding Rental" (employee dashboard, v2 on the DM kit).
   Fixture: one employee linked to the session user, with attendance in November (and records outside the period or in draft),
   attendance requests, leave applications (approved, open, upcoming, rejected, and one waiting for this user's approval), the
   HR leave balance, ToDo-assigned tasks, project membership, timesheets, daily task logs, holidays, and rental documents linked
   through "From" / "Prepared By" (plus documents of another employee that must not appear), with dispatch lines in two units.
   A second session signs in as a user with no Employee record. Expected figures are worked out by hand (see the comments). */
const { run, TODAY, add } = require('./dms-harness.cjs');
const ME = 'ali@dm.test', EMP = 'HR-EMP-0007', d = n => add(TODAY, n), M = TODAY.slice(0, 8);
function build() {
  const db = { Employee: [{ name: EMP, employee_name: 'Ali Hassan', user_id: ME, designation: 'Rental Coordinator', department: 'Rental', branch: 'Riyadh Yard', reports_to: 'HR-EMP-0001', status: 'Active', company: 'DM Trading', holiday_list: 'KSA 2026' }, { name: 'HR-EMP-0001', employee_name: 'Sara Al-Qahtani', user_id: 'sara@dm.test', status: 'Active' }],
    Attendance: [], 'Attendance Request': [], 'Leave Application': [], ToDo: [], Task: [], 'Project User': [], Project: [], Timesheet: [], 'Daily Task Management': [],
    'Rental Quotation': [], 'Rental Delivery Note': [], 'Rental Delivery Note Table': [], 'Rental Sales Invoice': [], 'Rental Purchase Order': [] };
  /* November 1–17: present 9 (two late, one early exit, five with 8 h), work from home 1, absent 2, on leave 2, half day 1 → 15 rows; today is present */
  const st = ['Present', 'Present', 'Absent', 'Present', 'Work From Home', 'Present', 'On Leave', 'On Leave', 'Present', 'Half Day', 'Present', 'Absent', 'Present', 'Present', 'Present'];
  st.forEach((s, i) => { const day = i + 3; db.Attendance.push({ name: 'HR-ATT-' + day, employee: EMP, employee_name: 'Ali Hassan', docstatus: 1, attendance_date: M + String(day).padStart(2, '0'), status: s, in_time: s === 'Present' ? M + String(day).padStart(2, '0') + ' 07:55:00' : null, out_time: null, working_hours: s === 'Present' && i < 9 ? 8 : 0, late_entry: [1, 5].includes(i) ? 1 : 0, early_exit: i === 8 ? 1 : 0, shift: 'Day', leave_type: s === 'On Leave' ? 'Annual Leave' : null }); });
  db.Attendance.push({ name: 'HR-ATT-OCT', employee: EMP, docstatus: 1, attendance_date: d(-40), status: 'Absent' }, { name: 'HR-ATT-DRAFT', employee: EMP, docstatus: 0, attendance_date: d(-1), status: 'Absent' });
  db['Attendance Request'].push({ name: 'HR-ARQ-1', employee: EMP, docstatus: 0, from_date: d(-6), to_date: d(-6), reason: 'Site visit', modified: TODAY }, { name: 'HR-ARQ-2', employee: EMP, docstatus: 1, from_date: d(-9), to_date: d(-9) });
  const la = (n, o) => db['Leave Application'].push(Object.assign({ name: 'HR-LAP-' + n, employee: EMP, employee_name: 'Ali Hassan', leave_type: 'Annual Leave', docstatus: 1, status: 'Approved', leave_approver: 'sara@dm.test', leave_approver_name: 'Sara Al-Qahtani', modified: TODAY }, o));
  la(1, { from_date: M + '09', to_date: M + '10', total_leave_days: 2 });                                   // taken in the period
  la(2, { docstatus: 0, status: 'Open', from_date: d(14), to_date: d(16), total_leave_days: 3, workflow_state: 'Pending' }); // pending
  la(3, { from_date: d(33), to_date: d(35), total_leave_days: 3 });                                        // approved upcoming
  la(4, { status: 'Rejected', from_date: d(3), to_date: d(3), total_leave_days: 1 });                      // rejected in the period
  la(5, { employee: 'HR-EMP-0042', employee_name: 'Omar Siddiqui', docstatus: 0, status: 'Open', leave_approver: ME, from_date: d(5), to_date: d(6), total_leave_days: 2 }); // waiting for me
  /* tasks 1–5 assigned to me; 6 assigned but cancelled ToDo; 7 not assigned. Overdue: 2 (end passed), 3 (status Overdue) */
  [['TASK-1', 'Open', 5, 'PRJ-1'], ['TASK-2', 'Working', -3, 'PRJ-1'], ['TASK-3', 'Overdue', -1, null], ['TASK-4', 'Completed', -5, 'PRJ-1'], ['TASK-5', 'Pending Review', 10, null], ['TASK-6', 'Open', 2, null], ['TASK-7', 'Open', -9, null]]
    .forEach((x, i) => db.Task.push({ name: x[0], subject: 'Prepare scaffold handover ' + (i + 1), status: x[1], exp_start_date: d(-10), exp_end_date: d(x[2]), project: x[3], priority: 'Medium', progress: x[1] === 'Completed' ? 100 : 40, modified: d(-i) }));
  ['TASK-1', 'TASK-2', 'TASK-3', 'TASK-4', 'TASK-5'].forEach((t, i) => db.ToDo.push({ name: 'TD-' + i, allocated_to: ME, reference_type: 'Task', reference_name: t, status: 'Open', assigned_by: 'sara@dm.test', assigned_by_full_name: 'Sara Al-Qahtani', modified: TODAY }));
  db.ToDo.push({ name: 'TD-6', allocated_to: ME, reference_type: 'Task', reference_name: 'TASK-6', status: 'Cancelled' });
  db['Project User'].push({ name: 'PU-1', parent: 'PRJ-2', parenttype: 'Project', user: ME });
  db.Project.push({ name: 'PRJ-1', project_name: 'Tower A', status: 'Open', customer: 'Najd Builders', percent_complete: 40 }, { name: 'PRJ-2', project_name: 'Hospital wing', status: 'Open', percent_complete: 10 }, { name: 'PRJ-3', project_name: 'Old site', status: 'Completed' });
  db.Timesheet.push({ name: 'TS-1', employee: EMP, docstatus: 1, start_date: M + '05', end_date: M + '05', total_hours: 8, status: 'Submitted', parent_project: 'PRJ-1' });
  db['Daily Task Management'].push({ name: 'DTM-1', employee: EMP, docstatus: 1, date: M + '10', line_manager: 'Sara Al-Qahtani', designation: 'Rental Coordinator', modified: d(-7) });
  /* rental: quotations 1 (from me) + 2 (draft, prepared by me), 3 another employee; notes 1 (submitted) + 2 (draft); invoice 1; PO 1 */
  db['Rental Quotation'].push({ name: 'RQ-0001', date: M + '03', ms: 'Najd Builders', project_and_address: 'Tower A, Riyadh', total: 5000, from: EMP, prepared_by: null, docstatus: 1, modified: d(-14) }, { name: 'RQ-0002', date: M + '12', ms: 'Red Sea Marine', project_and_address: 'Jeddah port', total: 1200, from: null, prepared_by: EMP, docstatus: 0, modified: d(-5) }, { name: 'RQ-0003', date: M + '12', ms: 'Other', from: 'HR-EMP-0099', prepared_by: 'HR-EMP-0099', docstatus: 1 });
  db['Rental Delivery Note'].push({ name: 'RDN-0001', date: M + '04', delivery_date: M + '05', customer: 'Najd Builders', project_and_address: 'Tower A, Riyadh', from: EMP, prepared_by: null, docstatus: 1, modified: d(-12) }, { name: 'RDN-0002', date: M + '14', delivery_date: M + '15', customer: 'Red Sea Marine', project_and_address: 'Jeddah port', from: null, prepared_by: EMP, docstatus: 0, modified: d(-3) });
  [['RDN-0001', 'TUBE-6M', 'Tube 6 m', 100, 'Nos'], ['RDN-0001', 'COUPLER', 'Coupler', 50, 'Nos'], ['RDN-0001', 'BOARD', 'Board', 30, 'm'], ['RDN-0002', 'TUBE-6M', 'Tube 6 m', 40, 'Nos']]
    .forEach((x, i) => db['Rental Delivery Note Table'].push({ name: 'RDT-' + i, parent: x[0], parenttype: 'Rental Delivery Note', item_code: x[1], item_name: x[2], quantity: x[3], uom: x[4] }));
  db['Rental Sales Invoice'].push({ name: 'RSI-0001', invoice_date: M + '10', customer: 'Najd Builders', project_and_address: 'Tower A, Riyadh', total: 3000, prepared_by: EMP, docstatus: 1 });
  db['Rental Purchase Order'].push({ name: 'RPO-0001', date: M + '08', supplier: 'Gulf Scaffold', project_and_address: 'Yard', total: 2000, from: EMP, prepared_by: null, docstatus: 1 });
  return db;
}
const methods = {
  'hrms.hr.doctype.leave_application.leave_application.get_leave_details': () => ({ leave_allocation: { 'Annual Leave': { total_leaves: 30, leaves_taken: 10, leaves_pending_approval: 3, remaining_leaves: 17 }, 'Sick Leave': { total_leaves: 15, leaves_taken: 0, leaves_pending_approval: 0, remaining_leaves: 15 } } }),
  'frappe.client.get': a => (a.doctype === 'Holiday List' ? { name: a.name, holidays: [{ holiday_date: d(-16), description: 'Past' }, { holiday_date: d(15), description: 'National holiday' }] } : null)
};
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
run({
  slug: 'scaffolding-rental', folder: '08. Operations & Logistics/Scaffolding Rental', build, methods, frappe: { session: { user: ME } },
  figures: async (t, H) => {
    /* present 9 + WFH 1; absent 2; % = (10 + ½) ÷ (10 + 1 + 2) = 80.8; balance 17 + 15; overdue tasks 2 and 3 */
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5].map(i => t.kpiVal(i))), ['Present', '10', '2', '80.8%', '32', '2']); H.ok("overview KPIs: today's attendance, present, absent, attendance %, leave balance, overdue tasks");
    /* approvals for me 1 + overdue tasks 2 + draft attendance requests 1 + draft rental documents 2 + my open leave 1 */
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '7'); H.ok('pending = 7 personal items');
    const ov = await t.$('[data-ref="content"]').innerText();
    H.assert.match(ov, /Reporting manager\s*Sara Al-Qahtani/); H.assert.match(ov, /Upcoming holidays[\s\S]*National holiday/); H.assert.doesNotMatch(ov, /RQ-0003/); H.ok('profile with manager, upcoming holidays only, and another employee\'s rental documents excluded');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="att"]').click(); await t.idle();
    H.assert.deepEqual(await kpisIn(t), ['10', '2', '2', '1', '80.8%', '40 h', '2', '1', '1']); H.ok('attendance KPIs: present, absent, late, early, %, hours, leave, half day, draft requests');
    H.assert.equal(await rowsIn(t, 't_att'), 15); H.assert.equal(await t.$('.sr-cd.sr-ok').count(), 9); H.ok('daily attendance (15 submitted rows in the period) and calendar');
    await t.$('[data-act="calm"][data-v="1"]').click(); await t.idle(); H.assert.equal(await t.$('.sr-cd.sr-ok').count(), 0); H.ok('calendar moves to the next month');
    await t.$('[data-act="tab"][data-v="leave"]').click(); await t.idle();
    H.assert.deepEqual(await kpisIn(t), ['32', '2', '1', '1', '1', '1']); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Annual Leave\s*30\s*10\s*3\s*17/); H.ok('leave KPIs and the balance table from the HR app');
    await t.$('[data-act="tab"][data-v="tasks"]').click(); await t.idle();
    /* tasks 1–5: completed 4; pending 1, 2, 5; overdue 2, 3; projects 1 (task) and 2 (member) */
    H.assert.deepEqual(await kpisIn(t), ['5', '1', '3', '2', '2', '1']); H.assert.equal(await rowsIn(t, 't_tkall'), 5); H.ok('task KPIs follow ToDo assignments only (cancelled ToDo and unassigned task excluded)');
    await t.$('[data-act="tab"][data-v="rental"]').click(); await t.idle();
    H.assert.deepEqual(await kpisIn(t), ['2', '2', '1', '1', '2', '150 Nos · 30 m']); H.assert.equal(await rowsIn(t, 't_rall'), 6); H.ok('rental counts through From / Prepared By; dispatched quantity per unit, never added across units');
    await H.shot(t.page, 'state-rental-1440');
    await t.$('[data-act="tab"][data-v="dispatch"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_items'), 4); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Returned quantity\s*—\s*Not tracked/); H.ok('dispatched items; return metrics shown as not tracked, never estimated');
  },
  after: async H => {
    const t = await H.open(build(), { frappe: { session: { user: 'nobody@dm.test' } } }); await t.idle();
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /No Employee record is linked/); H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '—'); /* nothing personal can be evaluated without the link */
    H.assert.deepEqual(t.errors, []); await H.shot(t.page, 'state-no-employee-1440', { fullPage: false }); await t.ctx.close(); H.ok('a user with no Employee record sees the link note and no personal data');
  },
  quiet: () => { const db = build(); db['Leave Application'] = db['Leave Application'].filter(x => x.status === 'Approved'); db.ToDo = []; db['Attendance Request'] = []; db['Rental Quotation'] = db['Rental Quotation'].filter(x => x.docstatus === 1); db['Rental Delivery Note'] = db['Rental Delivery Note'].filter(x => x.docstatus === 1); return db; }
});
