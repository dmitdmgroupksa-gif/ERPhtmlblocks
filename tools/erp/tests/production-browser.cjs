/* Browser test + screenshot QA for "08. Operations & Logistics/Production Dashboard" (v3 on the DM kit).
   Replaces the v2 test (custom page markup) and keeps its coverage: monthly default, 125-row paging, factory filtering through
   Confirmed warehouse mappings and branch labels, quality records, and an isolated permission failure on one source.
   Fixture: three factories (one with no Confirmed warehouse and no branch label), 125 work orders split across two warehouses,
   factory job orders with utilisation rows (one without an employee), manufacture entries with finished, consumed and scrap
   rows (one linking a missing inspection), daily production rows inside and outside the period, a cost document and a target. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const M = TODAY.slice(0, 8);
function build() {
  const db = { 'Manufacturing Factory': [{ name: 'F1', factory_name: 'Factory One', company: 'DM', legacy_branch_label: '28 Factory', is_active: 1 }, { name: 'F2', factory_name: 'Factory Two', company: 'DM', legacy_branch_label: '34 Factory', is_active: 1 }, { name: 'F3', factory_name: 'Factory Three', company: 'DM', legacy_branch_label: '', is_active: 1 }],
    'Manufacturing Factory Warehouse': [{ name: 'MW1', parent: 'F1', parenttype: 'Manufacturing Factory', warehouse: 'WH1', mapping_status: 'Confirmed' }, { name: 'MW2', parent: 'F2', parenttype: 'Manufacturing Factory', warehouse: 'WH2', mapping_status: 'Confirmed' }, { name: 'MW3', parent: 'F2', parenttype: 'Manufacturing Factory', warehouse: 'WH3', mapping_status: 'Pending' }],
    Company: [{ name: 'DM', default_currency: 'SAR' }], 'Work Order': [], 'Factory Job Order': [], 'Daily Factory Utilization Table': [], 'Stock Entry': [], 'Stock Entry Detail': [], 'Quality Inspection': [],
    'Factory Daily Production': [], 'Daily Production Table': [], 'Daily Production Cost': [], 'Daily Production Cost Table': [], 'Manufacturing Production Target': [] };
  /* 125 work orders: odd → WH2 (factory two), even → WH1 (factory one, 63); every fifth completed (25) */
  for (let i = 0; i < 125; i++) { db['Work Order'].push({ name: 'WO' + String(i).padStart(3, '0'), docstatus: 1, company: 'DM', status: i % 5 === 0 ? 'Completed' : 'In Process', production_item: i % 3 ? 'A' : 'B', stock_uom: i % 3 ? 'Kg' : 'Nos', qty: 10, produced_qty: i % 5 === 0 ? 10 : 2, fg_warehouse: i % 2 ? 'WH2' : 'WH1', planned_start_date: M + String(1 + (i % 16)).padStart(2, '0') + ' 08:00:00', total_operating_cost: 0 }); }
  db['Work Order'].push({ name: 'WO-DRAFT', docstatus: 0, company: 'DM', status: 'Draft', fg_warehouse: 'WH1', planned_start_date: M + '05 08:00:00' });
  /* job orders: J1 (28, open, ended the 10th → overdue), J2 (34, completed), J3 (28, open, ends later) */
  db['Factory Job Order'].push({ name: 'J1', docstatus: 1, branch: '28 Factory', date: M + '01', start_date: M + '01', end_date: M + '10', jo_status: 'Open' }, { name: 'J2', docstatus: 1, branch: '34 Factory', date: M + '02', start_date: M + '02', end_date: M + '05', jo_status: 'Completed' }, { name: 'J3', docstatus: 1, branch: '28 Factory', date: M + '12', start_date: M + '12', end_date: add(TODAY, 13), jo_status: 'Open' });
  [['J1', 'E1'], ['J1', ''], ['J3', 'E2']].forEach((x, i) => db['Daily Factory Utilization Table'].push({ name: 'DU' + i, parent: x[0], parenttype: 'Factory Job Order', employee: x[1], activity: 'Welding' }));
  db['Stock Entry'].push({ name: 'SE1', docstatus: 1, company: 'DM', stock_entry_type: 'Manufacture', posting_date: M + '05' }, { name: 'SE2', docstatus: 1, company: 'DM', stock_entry_type: 'Manufacture', posting_date: M + '08' }, { name: 'SE3', docstatus: 1, company: 'DM', stock_entry_type: 'Material Transfer', posting_date: M + '08' });
  [['SE1', 'A', 'Kg', 7, 1, 0, 'WH1', null, 70, 'QI1'], ['SE1', 'Raw', 'Kg', 9, 0, 0, null, 'WH1', 50, null], ['SE2', 'B', 'Nos', 4, 1, 0, 'WH2', null, 40, 'QI2'], ['SE2', 'S', 'Kg', 1, 0, 1, 'WH2', null, 2, null]]
    .forEach((x, i) => db['Stock Entry Detail'].push({ name: 'SED' + i, parent: x[0], parenttype: 'Stock Entry', item_code: x[1], stock_uom: x[2], transfer_qty: x[3], is_finished_item: x[4], is_scrap_item: x[5], t_warehouse: x[6], s_warehouse: x[7], amount: x[8], quality_inspection: x[9] }));
  db['Quality Inspection'].push({ name: 'QI1', docstatus: 1, status: 'Accepted', item_code: 'A', report_date: M + '05', reference_name: 'SE1' }); // QI2 is missing
  db['Factory Daily Production'].push({ name: 'D1', docstatus: 1, branch: '28 Factory', date: M + '03', workflow_state: 'Approved' });
  db['Daily Production Table'].push({ name: 'DP1', parent: 'D1', parenttype: 'Factory Daily Production', docstatus: 1, date: M + '03', employee: 'E1', duty_hours: 8, ot_hrs: 2, total_price: 20, activity: 'Cutting' }, { name: 'DP2', parent: 'D1', parenttype: 'Factory Daily Production', docstatus: 1, date: add(M + '01', -12), employee: 'E9', duty_hours: 8, ot_hrs: 0, total_price: 99 });
  db['Daily Production Cost'].push({ name: 'C1', docstatus: 1, date: M + '03', branch: '28 Factory', total_cost_summary: 20 });
  db['Daily Production Cost Table'].push({ name: 'CT1', parent: 'C1', parenttype: 'Daily Production Cost', activity: 'Cutting', total_cost: 20 });
  db['Manufacturing Production Target'].push({ name: 'T1', docstatus: 1, factory: 'F1', target_date: M + '10', target_qty: 10, item_code: 'A', uom: 'Kg' });
  return db;
}
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
async function factory(t, v) { await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="factory"]').selectOption(v); await t.$('[data-act="fapply"]').click(); await t.idle(); }
run({
  slug: 'production', folder: '08. Operations & Logistics/Production Dashboard', build,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5].map(i => t.kpiVal(i))), ['125', '100', '3', '1', '2', '1']); H.ok('overview KPIs: work orders (draft excluded), open, job orders, overdue jobs, manufacture entries, targets');
    const wo = t.log.find(x => x.a.doctype === 'Work Order' && x.a.limit_start === 0 && x.a.limit_page_length === 500); H.assert.ok(wo && wo.a.filters.some(f => f[0] === 'planned_start_date' && f[2] === M + '01 00:00:00')); H.ok('monthly default; planned start compared as datetime');
    /* overdue J1 + J1 row without employee + SE2 linking missing QI2 + factory three without mapping */
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '4'); H.ok('pending = 4');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="wo"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_wo'), 125); await t.$('[data-tbl="t_wo"] [data-act="tpage"][data-v="1"]').first().click(); H.assert.match(await t.$('[data-tbl="t_wo"]').innerText(), /Showing 26–50 \/ 125/); H.ok('125 work orders, paged');
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /A \/ Kg[\s\S]*B \/ Nos/); H.ok('remaining quantity grouped by item and unit, never mixed');
    await t.$('[data-act="tab"][data-v="output"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /A \/ Kg\s*7[\s\S]*B \/ Nos\s*4[\s\S]*DM \/ SAR\s*110\.00/); H.ok('finished output by item and unit; valuation per company currency (scrap and consumed rows excluded)');
    await factory(t, 'F1');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle(); H.assert.deepEqual((await Promise.all([0, 2, 4, 5].map(i => t.kpiVal(i)))), ['63', '2', '1', '1']); H.ok('factory one: 63 work orders (WH1), 2 job orders (28 label), 1 manufacture entry, 1 target');
    await factory(t, 'F3');
    await t.$('[data-act="tab"][data-v="wo"]').click(); await t.idle(); H.assert.match(await t.$('[data-ref="content"]').innerText(), /no Confirmed warehouse mapping[\s\S]*suppressed rather than shown as zero/); H.ok('a factory without a mapping suppresses figures instead of showing zero');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await t.$('[data-act="tab"][data-v="quality"]').click(); await t.idle();
    const q = await t.$('[data-ref="content"]').innerText(); H.assert.match(q, /Some linked inspections are cancelled, missing or inaccessible/); H.assert.match(q, /QI1/); H.ok('quality: linked inspection listed, missing one reported');
    t.ctl.fail = a => a.doctype === 'Stock Entry'; await t.$('[data-ref="refresh"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="output"]').click(); await t.idle(); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Source unavailable[\s\S]*Stock Entry/);
    await t.$('[data-act="tab"][data-v="wo"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_wo'), 125); H.ok('a stock permission failure is isolated: output shows the error, work orders still load');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
  }
});
