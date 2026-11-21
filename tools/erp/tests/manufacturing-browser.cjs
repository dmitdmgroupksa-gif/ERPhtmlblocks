/* Browser test + screenshot QA for "08. Operations & Logistics/Manufacturing Dashboard" (v3 on the DM kit).
   The block reads the unchanged Server Script APIs mfg_dashboard_performance, mfg_dashboard_jobs and mfg_dashboard_plan.
   The mocks return responses in the servers' shapes. Figures reconcile: category costs add up to the production cost
   (30,000 + 16,200 − 1,200 = 45,000) and the employees' achieved amounts add up to the labour card (18,000 + 2,400). */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
function perf(a, quiet) {
  return { company: 'DM Factory Co', factory: a.factory || '', period: a.period, start: a.from_date, end: a.to_date, to_date_end: a.to_date, partial: false, future: false, today: TODAY, week_start: 'Sunday', notes: [], is_admin: false,
    factory_options: [{ name: 'MF-28', label: '28 Factory' }, { name: 'MF-34', label: '34 Factory' }], scope_label: a.factory ? '28 Factory' : 'All Factories (28 Factory + 34 Factory)', mapping: [{ warehouse: 'FG - 28', factory: '28 Factory' }, { warehouse: 'FG - 34', factory: '34 Factory' }],
    output: { access: 'ok', entries: 12, value_difference: 45000, fg_valuation: 125000, material_cost: 80000, additional_costs: 5000, additional_cost_entries: [{ se: 'MAT-STE-0001', amount: 5000 }],
      negative_value_difference_entries: quiet ? [] : [{ se: 'MAT-STE-0009', date: d(-2), value_difference: -1200 }], by_uom: [{ uom: 'Nos', qty: 1200 }, { uom: 'Kg', qty: 3500 }],
      output_categories: [{ category: 'Scaffold frames', uom: 'Nos', qty: 800 }, { category: 'Couplers', uom: 'Nos', qty: 400 }, { category: 'Steel tubes', uom: 'Kg', qty: 3500 }],
      categories: [{ category: 'Scaffold frames', value_difference: 30000 }, { category: 'Couplers', value_difference: 16200 }, { category: 'Multiple categories', value_difference: -1200 }],
      output_review_entries: quiet ? [] : [{ se: 'MAT-STE-0005', groups: ['Frames', 'Couplers'] }], output_unclassified_rows: quiet ? [] : [{ se: 'MAT-STE-0007', item: 'Bracket', uom: 'Nos' }], multiple_category_count: 1, unclassified_count: 1, truncated: false },
    labour: { access: 'ok', records: 6, approved: 18000, unapproved: 2400, approved_records: 5, unapproved_records: 1, excluded_records: 0, combined_not_attributable: 0, hours_access: 'ok',
      employees: [{ employee: 'HR-EMP-0001', earnings: 9500, earn_approved: 9000, earn_unapproved: 500, achieved: 9000, ot_amount: 500, shortfall: 0, ck_hours: 96, ck_ot_hours: 8, ck_days: 10, ck_incomplete_days: quiet ? 0 : 1, ck_long_days: 0, ck_no_shift_days: 0 },
        { employee: 'HR-EMP-0002', earnings: 11400, earn_approved: 9500, earn_unapproved: 1900, achieved: 11400, ot_amount: 0, shortfall: 300, ck_hours: 88, ck_ot_hours: 0, ck_days: 11, ck_incomplete_days: 0, ck_long_days: 1, ck_no_shift_days: 0 }] },
    targets: { access: 'ok', cost: { records: 2, basis: 40000, basis_label: '2 target records', produced_without_cost_target_count: 0, records_without_cost: 0 } } };
}
const jo = (n, o) => Object.assign({ jo: 'FJO-000' + n, factory: '28 Factory', start_date: d(-3), end_date: d(4), status: 'Assigned', rows: 3, employees: 2 }, o);
function jobs(a, quiet) {
  const carry = [jo(4, { start_date: d(-20), end_date: d(-5), days_overdue: quiet ? 0 : 5 }), jo(5, { start_date: d(-6), end_date: d(-1), days_overdue: 0, status: 'Open' })];
  return { company: 'DM Factory Co', from_date: a.from_date, to_date: a.to_date, today: TODAY, notes: [], truncated: false,
    active: [jo(1), jo(2, { status: 'Inprogress', factory: '34 Factory' })], pending: [jo(3, { status: 'Open' })], carryover: carry, schedule_review: quiet ? [] : [jo(6, { issue: 'End date before start date', start_date: d(2), end_date: d(-2) })],
    summary: { active: 2, pending: 1, carryover: 2 } };
}
const prow = (n, o) => Object.assign({ jo: 'FJO-000' + n, factory: '28 Factory', employee: 'Hassan', designation: 'Welder', item_code: 'FG-FRAME', item: 'Scaffold frame', size: '1.8 m', activity: 'Welding', qty_numeric: 1, qty_req: 40, qty_basis: 'Order total', start_date: d(0), end_date: d(3), jo_status: 'Assigned', docstatus: 1 }, o);
function plan(a) {
  return { company: 'DM Factory Co', plan_start: a.plan_start, plan_end: a.plan_end, plan_days: 1, today: TODAY, plan_is_future: true, notes: [], truncated: false, uom_note: 'No UOM is recorded on job order rows.',
    summary: { job_orders: 2, activity_rows: 3, unique_employees: 3, activities: [{ activity: 'Welding', rows: 2 }, { activity: 'Cutting', rows: 1 }], draft_job_orders: 1, draft_activity_rows: 1, draft_unique_employees: 1 },
    scheduled: [prow(1), prow(1, { employee: 'Karim' }), prow(2, { employee: 'Nabil', activity: 'Cutting', item_code: null, item: 'Free-text bracket', qty_numeric: 0, qty_req_text: 'as needed' })], draft_rows: [prow(8, { docstatus: 0, jo_status: 'Draft' })],
    carryover: [Object.assign(jo(4, { end_date: d(-5) }), { kind: 'Overdue', days_overdue: 5, ageing: '1-7 days', jo_status: 'Assigned', activity_rows: 3, unique_employees: 2, activities: ['Welding'] }), Object.assign(jo(7, { end_date: d(0) }), { kind: 'Potential', days_overdue: 0, ageing: 'Not yet overdue', jo_status: 'Open', activity_rows: 1, unique_employees: 1, activities: ['Cutting'] })],
    schedule_review: [Object.assign(jo(6), { reason: 'No end date', jo_status: 'Open', activity_rows: 1, unique_employees: 1, activities: [] })] };
}
const build = () => ({ 'Manufacturing Factory': [{ name: 'MF-28', company: 'DM Factory Co' }, { name: 'MF-34', company: 'DM Factory Co' }], Company: [{ name: 'DM Factory Co', default_currency: 'SAR' }] });
const methods = { mfg_dashboard_performance: (a, db) => perf(a, db.__quiet), mfg_dashboard_jobs: (a, db) => jobs(a, db.__quiet), mfg_dashboard_plan: a => plan(a) };
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
run({
  slug: 'manufacturing', folder: '08. Operations & Logistics/Manufacturing Dashboard', build, methods,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5].map(i => t.kpiVal(i))), ['45.0KSAR', '3,500Kg', '80.0KSAR', '18.0KSAR', '2', '2']); H.ok('overview KPIs: production cost, output per unit, material, labour (approved), active and carryover jobs');
    const p = t.log.find(x => x.method === 'mfg_dashboard_performance'); H.assert.equal(p.a.period, 'Custom'); H.assert.equal(p.a.from_date, TODAY); H.ok('the kit period (today) goes to the API as a custom range');
    /* overdue job 4 + schedule review 6 + negative entry 9 + classify 5 and 7 + incomplete check-ins (employee 1) */
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '6'); H.ok('pending = 6 from the API review data');
    const ov = await t.$('[data-ref="content"]').innerText();
    H.assert.match(ov, /Target cost\s*40\.0KSAR[\s\S]*Over target\s*5,000SAR\s*12\.5%/); H.assert.match(ov, /Steel tubes\s*3,500/); H.assert.doesNotMatch(ov, /does not match the card/); H.ok('cost against target (over by 5,000, 12.5%); output categories for the largest unit (Kg, as v2); category costs reconcile');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="uom"][data-v="Nos"]').click(); await t.idle(); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Scaffold frames\s*800[\s\S]*Couplers\s*400/); H.ok('unit chips switch the output categories (never mixed)');
    await t.$('[data-act="tab"][data-v="labour"]').click(); await t.idle();
    H.assert.deepEqual(await kpisIn(t), ['20.9KSAR', '20.4KSAR', '500SAR', '300SAR', '184 h', '2']); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Reconciles with the labour card/); H.ok('labour: earned, achieved (reconciles), OT, shortfall apart, check-in hours');
    await t.$('[data-act="tab"][data-v="jobs"]').click(); await t.idle();
    H.assert.deepEqual(await kpisIn(t), ['2', '1', '2', '1']); await t.$('[data-act="jt"][data-v="carryover"]').click(); await t.idle(); H.assert.match(await t.$('[data-ref="content"]').innerText(), /5 days overdue today[\s\S]*Potential carryover/); H.ok('jobs lists with carryover notes');
    await t.$('[data-act="tab"][data-v="plan"]').click(); await t.idle();
    const pl = t.log.filter(x => x.method === 'mfg_dashboard_plan').pop(); H.assert.equal(pl.a.plan_start, d(1)); H.ok('plan defaults to tomorrow, as v2');
    H.assert.deepEqual(await kpisIn(t), ['2', '3', '3', '2', '1']); H.assert.match(await t.$('[data-ref="content"]').innerText(), /as needed\s*not numeric/); H.ok('plan summary; free-text quantities flagged, not totalled');
    await t.$('[data-act="pt"][data-v="carry"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_carry'), 2);
    await t.$('[data-act="age"][data-v="1-7 days"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_carry'), 1); H.ok('carryover with ageing filter');
    await H.shot(t.page, 'state-plan-carry-1440');
    await t.$('[data-act="pm"][data-v="week"]').click(); await t.idle(); const pw = t.log.filter(x => x.method === 'mfg_dashboard_plan').pop(); H.assert.deepEqual([pw.a.plan_start, pw.a.plan_end], [d(1), d(7)]); H.ok('plan dates: next 7 days');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="factory"]').selectOption('MF-28'); await t.$('[data-act="fapply"]').click(); await t.idle();
    H.assert.equal(t.log.filter(x => x.method === 'mfg_dashboard_jobs').pop().a.factory, 'MF-28'); H.ok('factory filter goes to every API');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  },
  quiet: () => Object.assign(build(), { __quiet: true })
});
