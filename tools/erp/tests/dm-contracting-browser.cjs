/* Browser test + screenshot QA for "06. Technical & Projects/DM Contracting Dashboard" (v2 on the DM kit).
   v1's application layer is kept as it was (scope, KPIs, rules, lists, notes); v2 replaces its presentation with the kit.
   Fixture (scope = Company "Durar Masagh Contracting Co." OR custom_division "Contracting"):
   - PRJ-1 contracting company, open, ended 10 days ago (delayed), budget 100,000, actual 110,000 (over budget);
   - PRJ-2 other company with division Contracting, open, ends in 20 days (upcoming); PRJ-3 completed; PRJ-4 out of scope;
   - tasks: T1 PRJ-1 overdue, T2 PRJ-2 due in 5 days, T3 / T4 completed;
   - PO-1 line for PRJ-2 past its required date, nothing received; MR-1 line for PRJ-1 past date, nothing ordered;
   - one open Issue on PRJ-2 and one pending Asset Repair;
   - manpower: E1 via Project User (present today), E2 via a ToDo on T1 (absent today), E3 via a draft Timesheet.
   Projects requiring attention = PRJ-1 (delayed, over budget, overdue task) + PRJ-2 (late PO line) = 2.
   Pending = delayed project 1 + overdue task 1 + late PO / MR lines 2 + task due within 14 days 1 + issue / repair 2 = 7. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
const DMCC = 'Durar Masagh Contracting Co.';
function build() {
  const P = (name, o) => Object.assign({ name, project_name: name + ' tower', status: 'Open', percent_complete: 40, percent_complete_method: 'Task Completion', expected_start_date: d(-120), expected_end_date: d(60), actual_end_date: null, customer: 'Client A', company: DMCC, department: 'Projects - DMCC', cost_center: 'Main - DMCC', priority: 'Medium', project_type: 'External', custom_division: '', estimated_costing: 0, total_costing_amount: 0, total_purchase_cost: 0, total_consumed_material_cost: 0, total_sales_amount: 0, total_billed_amount: 0, gross_margin: 0, creation: d(-130) + ' 10:00:00', modified: d(-2) + ' 10:00:00' }, o);
  const T = (name, project, status, end, o) => Object.assign({ name, subject: name + ' works', project, priority: 'Medium', exp_start_date: d(-30), exp_end_date: end, act_end_date: null, completed_on: status === 'Completed' ? d(-4) : null, progress: status === 'Completed' ? 100 : 30, status, is_milestone: 0, modified: d(-1) + ' 09:00:00' }, o || {});
  return {
    Company: [{ name: DMCC }, { name: 'DM Trading' }], Department: [{ name: 'Projects - DMCC', disabled: 0 }], Warehouse: [{ name: 'Site Store - DMCC', disabled: 0, is_group: 0 }],
    Project: [P('PRJ-1', { expected_end_date: d(-10), percent_complete: 60, estimated_costing: 100000, total_costing_amount: 50000, total_purchase_cost: 40000, total_consumed_material_cost: 20000, total_sales_amount: 120000, total_billed_amount: 80000, gross_margin: 10000 }),
      P('PRJ-2', { company: 'DM Trading', custom_division: 'Contracting', expected_end_date: d(20), creation: d(-40) + ' 10:00:00' }), P('PRJ-3', { status: 'Completed', percent_complete: 100, expected_end_date: d(-60), actual_end_date: d(-62) }), P('PRJ-4', { company: 'DM Trading' })],
    'Project User': [{ name: 'PU1', parent: 'PRJ-1', parenttype: 'Project', user: 'u1@dm.test' }],
    Task: [T('T1', 'PRJ-1', 'Open', d(-3)), T('T2', 'PRJ-2', 'Working', d(5)), T('T3', 'PRJ-1', 'Completed', d(-8)), T('T4', 'PRJ-3', 'Completed', d(-70))],
    ToDo: [{ name: 'TD1', reference_type: 'Task', reference_name: 'T1', allocated_to: 'u2@dm.test', status: 'Open' }],
    Employee: [{ name: 'E1', employee_name: 'Ali Hassan', designation: 'Site Engineer', department: 'Projects - DMCC', branch: 'Riyadh', user_id: 'u1@dm.test', status: 'Active' }, { name: 'E2', employee_name: 'Omar Saleh', designation: 'Foreman', department: 'Projects - DMCC', branch: 'Riyadh', user_id: 'u2@dm.test', status: 'Active' }, { name: 'E3', employee_name: 'Raj Patel', designation: 'Technician', department: 'Projects - DMCC', branch: 'Jeddah', user_id: null, status: 'Active' }],
    Attendance: [{ name: 'ATT1', employee: 'E1', employee_name: 'Ali Hassan', status: 'Present', shift: 'Day', working_hours: 8, attendance_date: TODAY, docstatus: 1, department: 'Projects - DMCC' }, { name: 'ATT2', employee: 'E2', employee_name: 'Omar Saleh', status: 'Absent', shift: 'Day', working_hours: 0, attendance_date: TODAY, docstatus: 1, department: 'Projects - DMCC' }],
    Timesheet: [{ name: 'TS-1', employee: 'E3', employee_name: 'Raj Patel', parent_project: 'PRJ-2', start_date: d(-2), end_date: d(-1), total_hours: 9, status: 'Draft', docstatus: 0, modified: d(-1) }],
    'Purchase Order': [{ name: 'PO-1', status: 'To Receive and Bill', transaction_date: d(-20), supplier: 'Steel Co', docstatus: 1 }],
    'Purchase Order Item': [{ name: 'POI1', parent: 'PO-1', parenttype: 'Purchase Order', item_code: 'STL-10', item_name: 'Steel bar', qty: 10, received_qty: 0, billed_amt: 0, amount: 5000, uom: 'Ton', warehouse: 'Site Store - DMCC', project: 'PRJ-2', schedule_date: d(-2), docstatus: 1 }],
    'Material Request': [{ name: 'MR-1', status: 'Pending', transaction_date: d(-10), material_request_type: 'Purchase', docstatus: 1 }],
    'Material Request Item': [{ name: 'MRI1', parent: 'MR-1', parenttype: 'Material Request', item_code: 'CEM-1', item_name: 'Cement', qty: 5, ordered_qty: 0, uom: 'Bag', warehouse: 'Site Store - DMCC', project: 'PRJ-1', schedule_date: d(-1), docstatus: 1 }],
    'Stock Entry': [], 'Stock Entry Detail': [], 'Delivery Note': [], 'Sales Invoice': [], 'Purchase Invoice': [], Budget: [], Bin: [], Vehicle: [], 'Maintenance Schedule': [], 'Maintenance Visit': [], 'Asset Maintenance': [],
    Asset: [{ name: 'AST-1', asset_name: 'Crane', asset_category: 'Equipment', status: 'In Maintenance', location: 'Riyadh', custodian: 'E1', department: 'Projects - DMCC', image: null, docstatus: 1, company: DMCC, modified: d(-1) }],
    'Asset Repair': [{ name: 'AR-1', asset: 'AST-1', asset_name: 'Crane', failure_date: d(-6), repair_status: 'Pending', docstatus: 0 }],
    Issue: [{ name: 'ISS-1', subject: 'Water leak at level 3', project: 'PRJ-2', priority: 'High', status: 'Open', opening_date: d(-4) }]
  };
}
const content = t => t.$('[data-ref="content"]').innerText();
const kpiN = async (t, nth) => (await t.$('[data-ref="content"] .dms-kpis').nth(nth || 0).locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
run({
  slug: 'dm-contracting', folder: '06. Technical & Projects/DM Contracting Dashboard', build,
  figures: async (t, H) => {
    H.assert.deepEqual(await kpiN(t, 0), ['3', '2', '1', 'Unavailable', '1', '1', '2']); H.ok('projects: 3 in scope (or-filter on company / division; PRJ-4 out), 2 active, 1 completed, hold unavailable (no such status), 1 delayed, 1 upcoming, 2 needing attention');
    H.assert.deepEqual((await kpiN(t, 1)).slice(1, 4), ['2', '2', '1']); H.ok('work progress: 2 completed, 2 pending (Open + Working), 1 overdue task');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '7'); H.ok('pending = v1 delay and risk list (7)');
    H.assert.match(await content(t), /Most ERP records are not linked to these projects/); H.ok('v1 scope and link notes kept');
  },
  interactions: async (t, H) => {
    await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi').nth(4).click(); await t.idle();
    H.assert.match(await content(t), /Delayed Projects[\s\S]*PRJ-1/); H.assert.equal(await rowsIn(t, 'dc_pk_delay'), 1); H.ok('a KPI opens its list in place (v1 drill)');
    await t.$('[data-act="dcback"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="mp"]').click(); await t.idle(); H.assert.deepEqual((await kpiN(t, 0)).slice(0, 6), ['3', '2', '1', '1', '0', '1']); H.ok('manpower: 3 assigned (project user, ToDo, timesheet), 2 on active projects, 1 present, 1 absent, 0 on leave, 1 draft timesheet');
    await t.$('[data-act="tab"][data-v="mt"]').click(); await t.idle(); H.assert.deepEqual((await kpiN(t, 0)).slice(0, 3), ['1', '1', '1']); H.ok('materials: 1 pending MR, 1 pending PO, 1 PO line to receive');
    await t.$('[data-act="tab"][data-v="fi"]').click(); await t.idle(); H.assert.deepEqual((await kpiN(t, 0)).slice(0, 3), ['100,000.00', '110,000.00', '110.0%']); H.ok('finance: budget, actual (costing + purchase + material) and utilisation for budgeted projects');
    await t.$('[data-act="tab"][data-v="dl"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 'dc_dl_all'), 7);
    await t.$('[data-tbl="dc_dl_all"] [data-pd="PRJ-1"]').first().click(); await t.idle(); H.assert.match(await content(t), /Project Detail: PRJ-1[\s\S]*Related Tasks/); H.ok('delays list (7 rows); project links open the v1 project detail');
    await t.$('[data-act="dcback"]').click(); await t.idle();
    t.ctl.fail = a => a.doctype === 'Task'; await t.$('[data-ref="refresh"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="ov"]').click(); await t.idle(); const k = await kpiN(t, 1); H.assert.equal(k[1], 'Unavailable'); H.assert.equal((await kpiN(t, 0))[0], '3'); H.ok('a Task permission failure marks the task figures unavailable; project figures still load');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
  }
});
