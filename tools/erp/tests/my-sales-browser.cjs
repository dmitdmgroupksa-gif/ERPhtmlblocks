/* Browser test + screenshot QA for "02. Sales & CRM/My Sales Dashboard" (new, on the DM kit).
   my_sales_dashboard_data is mocked in its response shape. Three sessions:
   - salesperson (roles Salesman): scope "own" — no Team tab, no salesperson filter, no salesperson column;
   - sales manager (roles Sales Manager): scope "team" — Team tab with two salespeople, salesperson filter sent to the API;
   - unlinked user: a clear "not linked to a Sales Person" message, no figures.
   Pending = overdue invoices 2 + orders on hold 1 + orders past delivery 1 + open quotations 2 = 6. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
function data(scope, sp) {
  const mine = !sp || sp === 'Ali Hassan', S = mine ? 'Ali Hassan' : 'Omar Saleh';
  const rows = {
    quotations: [{ name: 'SAL-QTN-0001', transaction_date: d(-3), customer_name: 'Najd Builders', status: 'Open', workflow_state: 'Pending', valid_till: d(10), value: 50000, sales_person: S },
      { name: 'SAL-QTN-0002', transaction_date: d(-5), customer_name: 'Riyadh Steel', status: 'Draft', workflow_state: 'Approved', valid_till: d(3), value: 20000, sales_person: S },
      { name: 'SAL-QTN-0003', transaction_date: d(-8), customer_name: 'Gulf Co', status: 'Ordered', workflow_state: 'Accepted By Customer', valid_till: d(-1), value: 30000, sales_person: S }],
    orders: [{ name: 'SAL-ORD-0001', transaction_date: d(-2), customer_name: 'Gulf Co', status: 'To Deliver and Bill', delivery_date: d(5), per_delivered: 0, per_billed: 0, value: 30000, sales_person: S }],
    open_orders: [{ name: 'SAL-ORD-0001', transaction_date: d(-2), customer_name: 'Gulf Co', status: 'To Deliver and Bill', delivery_date: d(5), per_delivered: 0, per_billed: 0, value: 30000, days_late: 0, sales_person: S },
      { name: 'SAL-ORD-0000', transaction_date: d(-40), customer_name: 'Najd Builders', status: 'On Hold', delivery_date: d(-10), per_delivered: 20, per_billed: 0, value: 15000, days_late: 10, sales_person: S },
      { name: 'SAL-ORD-0099', transaction_date: d(-30), customer_name: 'Riyadh Steel', status: 'To Deliver', delivery_date: d(-4), per_delivered: 50, per_billed: 50, value: 8000, days_late: 4, sales_person: S }],
    invoices: [{ name: 'ACC-SINV-0001', posting_date: d(-1), customer_name: 'Gulf Co', status: 'Unpaid', is_return: 0, due_date: d(29), value: 40000, sales_person: S },
      { name: 'ACC-SINV-0002', posting_date: d(-1), customer_name: 'Gulf Co', status: 'Return', is_return: 1, due_date: d(29), value: -1000, sales_person: S }],
    outstanding: [{ name: 'ACC-SINV-0090', posting_date: d(-60), due_date: d(-30), customer_name: 'Najd Builders', status: 'Overdue', value: 12000, days_overdue: 30, sales_person: S },
      { name: 'ACC-SINV-0091', posting_date: d(-40), due_date: d(-5), customer_name: 'Riyadh Steel', status: 'Overdue', value: 3000, days_overdue: 5, sales_person: S },
      { name: 'ACC-SINV-0001', posting_date: d(-1), due_date: d(29), customer_name: 'Gulf Co', status: 'Unpaid', value: 40000, days_overdue: 0, sales_person: S }]
  };
  const months = []; for (let i = 11; i >= 0; i--) { const x = new Date(TODAY + 'T00:00:00Z'); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() - i); months.push(x.toISOString().slice(0, 7)); }
  return {
    meta: { scope, user: 'u@dm.test', from: d(-25), to: TODAY, today: TODAY, company: '', companies: ['Durar Masagh Trading Company'], row_limit: 500,
      totals: { quotations: 3, orders: 1, open_orders: 3, invoices: 2, outstanding: 3 }, departments: scope === 'team' ? ['BMD - BUILDING - DMG'] : [],
      sales_persons: [{ sales_person: 'Ali Hassan', employee_name: 'Ali Hassan', department: 'BMD - BUILDING - DMG' }].concat(scope === 'team' ? [{ sales_person: 'Omar Saleh', employee_name: 'Omar Saleh', department: 'BMD - BUILDING - DMG' }] : []),
      options: scope === 'team' ? [{ sales_person: 'Ali Hassan', department: 'BMD - BUILDING - DMG' }, { sales_person: 'Omar Saleh', department: 'BMD - BUILDING - DMG' }] : [], basis: 'Values are base_net_total x the Sales Team share.' },
    kpi: { invoiced: 39000, invoices: 1, returns: -1000, booked: 30000, orders: 1, quotations: 3, quoted: 100000, quotations_won: 1, quotations_open: 2, collected: 25000, outstanding: 55000, outstanding_invoices: 3, overdue: 15000, overdue_invoices: 2, open_orders: 3, open_value: 45000, on_hold: 1, draft_invoices: 0 },
    quote_states: [{ state: 'Pending', count: 1, value: 50000 }, { state: 'Approved', count: 1, value: 20000 }, { state: 'Accepted By Customer', count: 1, value: 30000 }],
    trend: months.map((m, i) => ({ month: m, invoiced: i === 11 ? 39000 : 10000 * (i % 4), booked: i === 11 ? 30000 : 8000 * (i % 3) })),
    team: scope === 'team' ? [{ sales_person: 'Ali Hassan', employee_name: 'Ali Hassan', department: 'BMD - BUILDING - DMG', invoiced: 39000, booked: 30000, quoted: 100000, quotations: 3, collected: 25000, outstanding: 55000, overdue: 15000 },
      { sales_person: 'Omar Saleh', employee_name: 'Omar Saleh', department: 'BMD - BUILDING - DMG', invoiced: 12000, booked: 0, quoted: 5000, quotations: 1, collected: 0, outstanding: 2000, overdue: 0 }] : [],
    rows
  };
}
const CALLS = [];
const methods = {
  my_sales_dashboard_data: (a, db) => {
    CALLS.push(a);
    if (db.__scope === 'none') { const e = new Error('frappe.exceptions.ValidationError: Your user is not linked to a Sales Person. HR or IT must set Employee > User ID and Sales Person > Employee.'); e.status = 417; throw e; }
    return data(db.__scope || 'own', a.sales_person);
  }
};
const content = t => t.$('[data-ref="content"]').innerText();
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
run({
  slug: 'my-sales', folder: '02. Sales & CRM/My Sales Dashboard', methods, frappe: { user_roles: ['Salesman'] },
  build: () => ({ __scope: 'own' }),
  figures: async (t, H) => {
    const k = await Promise.all([0, 1, 4, 5, 6, 7].map(i => t.kpiVal(i)));
    H.assert.match(k[0], /39.0K/); H.assert.match(k[1], /30.0K/); H.assert.match(k[2], /25.0K/); H.assert.match(k[3], /55.0K/); H.assert.match(k[4], /15.0K/); H.assert.equal(k[5], '3');
    H.ok('own figures: invoiced 39K (returns net), booked 30K, collected 25K, outstanding 55K, overdue 15K, 3 open orders');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '6'); H.ok('pending = overdue invoices 2 + on hold 1 + past delivery 1 + open quotations 2');
    H.assert.match(await t.$('[data-ref="stamp"]').innerText(), /Your figures · Ali Hassan/); H.ok('header states the scope: your figures');
  },
  interactions: async (t, H) => {
    H.assert.equal(await t.$('[data-act="tab"][data-v="team"]').count(), 0); H.ok('salesperson: no Team tab');
    await t.$('[data-v="filters"]').click(); H.assert.equal(await t.$('select[data-fd="sp"]').count(), 0); await t.page.keyboard.press('Escape'); H.ok('salesperson: no salesperson filter');
    await t.$('[data-act="tab"][data-v="invoices"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_out'), 3); H.assert.doesNotMatch(await t.$('[data-tbl="t_out"]').innerText(), /Salesperson/); H.assert.match(await t.$('[data-tbl="t_out"] tbody tr').first().innerText(), /ACC-SINV-0090[\s\S]*30/);
    H.ok('outstanding sorted by days overdue; no salesperson column in the own view');
    await t.$('[data-act="tab"][data-v="orders"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_open'), 3); H.assert.match(await t.$('[data-tbl="t_open"]').innerText(), /10 days late/); H.ok('open orders with days late');
    await t.$('[data-act="tab"][data-v="quotes"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_q'), 3); H.ok('quotations in the period');
    H.assert.ok(CALLS.every(a => !a.sales_person)); H.ok('the page never asks the API for another salesperson');
  },
  after: async H => {
    let t = await H.open({ __scope: 'team' }, { frappe: { user_roles: ['Sales Manager', 'Salesman'] } }); await t.idle();
    H.assert.match(await t.$('[data-ref="stamp"]').innerText(), /Your department · BMD - BUILDING - DMG/);
    await t.$('[data-act="tab"][data-v="team"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_team'), 2); H.assert.match(await content(t), /Omar Saleh/);
    H.ok('sales manager: Team tab lists the department\'s salespeople');
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="sp"]').selectOption('Omar Saleh'); await t.$('[data-act="fapply"]').click(); await t.idle();
    H.assert.equal(CALLS[CALLS.length - 1].sales_person, 'Omar Saleh'); H.ok('manager picks a salesperson; the pick goes to the API (which checks it against the department)');
    H.assert.deepEqual(t.errors, []); await H.shot(t.page, 'state-manager-1440', { fullPage: false }); await t.ctx.close();
    t = await H.open({ __scope: 'none' }, { frappe: { user_roles: ['Sales User'] } }); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /not linked to a Sales Person/); H.assert.equal(await t.$('.dms-kpi').count(), 0);
    await t.ctx.close(); H.ok('unlinked user: a clear message and no figures');
  }
});
