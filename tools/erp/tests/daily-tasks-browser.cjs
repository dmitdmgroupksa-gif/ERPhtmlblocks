/* Browser test + screenshot QA for "05. HR & Administration/Daily Tasks & Visits" (new, on the DM kit).
   daily_tasks_dashboard_data is mocked in its response shape (scope "dept" for a line manager). Default period = yesterday.
   Pending = sales updates waiting approval 2 + incomplete tasks 1 = 3. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const Y = add(TODAY, -1), CALLS = [];
function data() {
  const sales = [['SSDT-0001', 'E1', 'Ahmed Ali', 'CP', 'Submit', 1200, 500, 3000, 2], ['SSDT-0002', 'E2', 'Omar Saleh', 'MP', 'Approved', 0, 0, 0, 0], ['SSDT-0003', 'E3', 'Faisal Saud', 'CP', 'Submit', 800, 200, 0, 1]]
    .map(r => ({ name: r[0], date: Y, employee: r[1], employee_name: r[2], section_manager: 'Bilal Khan', status: r[4], branch: r[3], draft: 0, invoiced: r[5], collected: r[6], ordered: r[7], orders: r[8], deliveries_pending: 0 }));
  const tasks = [{ name: 'TASK-0001', date: Y, employee: 'E1', employee_name: 'Ahmed Ali', department: 'BMD - BUILDING - DMG', status: 'Complete', category: 'Site visit', branch: 'HO', assigned_by: 'Manager', customer: '' },
    { name: 'TASK-0002', date: Y, employee: 'E3', employee_name: 'Faisal Saud', department: 'BMD - BUILDING - DMG', status: 'Incomplete', category: 'Follow-up', branch: 'HO', assigned_by: 'Manager', customer: 'Gulf Co' }];
  return { meta: { scope: 'dept', from: Y, to: Y, departments: ['BMD - BUILDING - DMG'], row_limit: 1000, totals: { tasks: 2, sales: 3 } },
    tasks: { total: 2, employees: 2, by_department: [{ label: 'BMD - BUILDING - DMG', count: 2 }], by_status: [{ label: 'Complete', count: 1 }, { label: 'Incomplete', count: 1 }], rows: tasks },
    sales: { total: 3, employees: 3, by_branch: [{ label: 'CP', count: 2 }, { label: 'MP', count: 1 }], by_status: [{ label: 'Submit', count: 2 }, { label: 'Approved', count: 1 }], invoiced: 2000, collected: 700, ordered: 3000, rows: sales } };
}
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
run({
  slug: 'daily-tasks', folder: '05. HR & Administration/Daily Tasks & Visits', build: () => ({}),
  methods: { daily_tasks_dashboard_data: a => { CALLS.push(a); return data(); } },
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 4, 5].map(i => t.kpiVal(i))), ['3', '2', '2', '1']); H.ok('sales updates 3 (2 waiting approval), tasks 2 (1 incomplete)');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '3'); H.ok('pending = waiting approval 2 + incomplete 1');
    H.assert.equal(CALLS[0].from_date, Y); H.assert.equal(CALLS[0].to_date, Y); H.ok('default period is yesterday, as the old cards');
    H.assert.match(await t.$('[data-ref="stamp"]').innerText(), /Your department · BMD/); H.ok('header states the scope');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="sales"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_sales'), 3);
    await t.$('[data-tf="t_sales"][data-tfk="branch"]').selectOption('CP'); await t.idle(); H.assert.equal(await rowsIn(t, 't_sales'), 2); H.ok('sales updates list with branch filter');
    await t.$('[data-act="tab"][data-v="tasks"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_tasks'), 2); H.ok('task submissions list');
  }
});
