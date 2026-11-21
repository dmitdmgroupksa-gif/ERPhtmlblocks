/* Browser test + screenshot QA for "08. Operations & Logistics/Plant & Furniture Asset Dashboard" (v2 on the DM kit).
   Keeps v1's rules: active = submitted and not sold / scrapped / decapitalized; DM Assets chairs and tables are counted
   apart from Asset records (never merged); book value is verified only when cost − opening − journal-posted depreciation
   equals the ERP value field (±1); amounts stay in each company's currency.
   Fixture: two companies (SAR, USD); six plant and three fixtures assets covering every v1 exception (no location, no
   custodian, draft, zero cost, no purchase date, maintenance flag without a plan, unproven zero value, duplicates,
   disposed, cancelled); four DM Assets furniture records (missing ID, duplicate ID, no employee) plus one laptop that
   is out of scope; a maintenance plan with an overdue task and a completed log missing its certificate; one repair;
   two movements (one outside scope); and an acquisition record. frappe.client.get returns the asset with its finance
   book and depreciation schedule rows. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const S = { plant: 'Plant and Machinery Direct', furn: 'Fixtures & Fittings-Indirect' };
function asset(name, o) {
  return Object.assign({ name, asset_name: name + ' unit', asset_category: S.plant, company: 'DM Trading', location: 'Head Office', custodian: 'E1', department: 'Operations', status: 'Partially Depreciated', docstatus: 1, purchase_date: '2024-03-10', available_for_use_date: '2024-03-12', total_asset_cost: 1000, gross_purchase_amount: 1000, additional_asset_cost: 0, value_after_depreciation: 1000, opening_accumulated_depreciation: 0, is_fully_depreciated: 0, calculate_depreciation: 1, maintenance_required: 0, asset_quantity: 1, disposal_date: null, insurance_end_date: null, default_finance_book: null, item_code: 'ITM', item_name: 'Item' }, o);
}
function build() {
  const db = {
    Company: [{ name: 'DM Trading', default_currency: 'SAR' }, { name: 'DM Intl', default_currency: 'USD' }],
    'Asset Category': [{ name: S.plant }, { name: S.furn }, { name: 'IT Equipment' }],
    Asset: [
      asset('P1', { asset_name: 'Generator 250 kVA', total_asset_cost: 100000, opening_accumulated_depreciation: 10000, value_after_depreciation: 80000, maintenance_required: 1 }),
      asset('P2', { asset_name: 'Forklift 3 t', status: 'In Maintenance', location: '28 Factory', custodian: null, total_asset_cost: 50000, value_after_depreciation: 50000, purchase_date: '2025-06-01', maintenance_required: 1 }),
      asset('P3', { asset_name: 'Welding set', status: 'Out of Order', company: 'DM Intl', location: null, custodian: 'E2', total_asset_cost: 20000, value_after_depreciation: 0, purchase_date: '2023-01-05' }),
      asset('P4', { asset_name: 'Compressor', status: 'Draft', docstatus: 0, total_asset_cost: 0, purchase_date: null }),
      asset('P5', { asset_name: 'Old crane', status: 'Scrapped', total_asset_cost: 40000, disposal_date: '2026-02-01', purchase_date: '2015-04-01' }),
      asset('P6', { asset_name: 'Cancelled pump', status: 'Cancelled', docstatus: 2, total_asset_cost: 7000 }),
      asset('X1', { asset_name: 'Reception desk', asset_category: S.furn, status: 'Submitted', custodian: 'E3', total_asset_cost: 3000, value_after_depreciation: 3000, calculate_depreciation: 0, purchase_date: '2026-09-15' }),
      asset('X2', { asset_name: 'Meeting table', asset_category: S.furn, status: 'Submitted', total_asset_cost: 2000, value_after_depreciation: 2000, purchase_date: '2026-10-02' }),
      asset('X3', { asset_name: 'Meeting table', asset_category: S.furn, status: 'Submitted', total_asset_cost: 2000, value_after_depreciation: 2000, purchase_date: '2026-10-02' }),
      asset('IT9', { asset_name: 'Laptop', asset_category: 'IT Equipment' })
    ],
    'Asset Finance Book': [{ name: 'FB1', parent: 'P1', parenttype: 'Asset', finance_book: null, value_after_depreciation: 80000 }],
    'Depreciation Schedule': [
      { name: 'DS1', parent: 'P1', parenttype: 'Asset', schedule_date: '2025-03-31', depreciation_amount: 5000, journal_entry: 'ACC-JV-0001', finance_book: null },
      { name: 'DS2', parent: 'P1', parenttype: 'Asset', schedule_date: '2026-03-31', depreciation_amount: 5000, journal_entry: 'ACC-JV-0002', finance_book: null },
      { name: 'DS3', parent: 'P1', parenttype: 'Asset', schedule_date: '2027-03-31', depreciation_amount: 5000, journal_entry: null, finance_book: null }
    ],
    'DM Assets': [
      { name: 'DMA-1', asset_id: 'CH-1', date: '2026-01-10', employee: 'E1', location: 'Head Office', category: 'Chair', description: 'Office chair', docstatus: 1 },
      { name: 'DMA-2', asset_id: 'TB-1', date: '2026-02-11', employee: null, location: 'Head Office', category: 'Table', description: 'Desk', docstatus: 1 },
      { name: 'DMA-3', asset_id: null, date: '2026-03-12', employee: 'E2', location: '28 Factory', category: 'Chair', description: 'Stool', docstatus: 1 },
      { name: 'DMA-4', asset_id: 'CH-1', date: '2026-04-13', employee: 'E3', location: '28 Factory', category: 'Chair', description: 'Chair', docstatus: 1 },
      { name: 'DMA-5', asset_id: 'LP-1', date: '2026-05-14', employee: 'E1', location: 'Head Office', category: 'Laptop', description: 'Laptop', docstatus: 1 }
    ],
    'Asset Maintenance': [{ name: 'AM-P1', asset_name: 'P1', asset_category: S.plant, company: 'DM Trading', maintenance_team: 'Workshop', maintenance_manager: 'm@dm.test', maintenance_manager_name: 'Manager' }],
    'Asset Maintenance Task': [
      { name: 'T1', parent: 'AM-P1', parenttype: 'Asset Maintenance', maintenance_task: 'Oil change', maintenance_type: 'Preventive Maintenance', maintenance_status: 'Planned', start_date: '2026-01-01', end_date: '2027-12-31', periodicity: 'Monthly', next_due_date: add(TODAY, -5), last_completion_date: null, certificate_required: 0 },
      { name: 'T2', parent: 'AM-P1', parenttype: 'Asset Maintenance', maintenance_task: 'Load test', maintenance_type: 'Calibration', maintenance_status: 'Planned', start_date: '2026-01-01', end_date: '2027-12-31', periodicity: 'Yearly', next_due_date: add(TODAY, 40), last_completion_date: '2026-06-01', certificate_required: 1 }
    ],
    'Asset Maintenance Log': [
      { name: 'AML-1', asset_maintenance: 'AM-P1', asset_name: 'P1', task: 'T2', task_name: 'Load test', maintenance_type: 'Calibration', maintenance_status: 'Completed', due_date: '2026-06-01', completion_date: '2026-06-01', has_certificate: 0, certificate_attachement: null, docstatus: 1 },
      { name: 'AML-2', asset_maintenance: 'AM-P1', asset_name: 'P1', task: 'T1', task_name: 'Oil change', maintenance_type: 'Preventive Maintenance', maintenance_status: 'Planned', due_date: add(TODAY, -5), completion_date: null, has_certificate: 0, docstatus: 0 }
    ],
    'Asset Repair': [{ name: 'REP-1', asset: 'P2', company: 'DM Trading', repair_status: 'Pending', failure_date: '2026-11-01', completion_date: null, repair_cost: 1500, total_repair_cost: 1500, capitalize_repair_cost: 0, downtime: '3 days', description: 'Hydraulics', docstatus: 0 }],
    'Asset Movement': [{ name: 'MV-1', company: 'DM Trading', purpose: 'Transfer', transaction_date: '2026-07-01 10:00:00', reference_doctype: null, reference_name: null, docstatus: 1 }, { name: 'MV-2', company: 'DM Trading', purpose: 'Issue', transaction_date: '2026-08-01 10:00:00', docstatus: 1 }],
    'Asset Movement Item': [{ name: 'MI-1', parent: 'MV-1', parenttype: 'Asset Movement', asset: 'P1', asset_name: 'Generator 250 kVA', source_location: 'Head Office', target_location: '28 Factory', from_employee: null, to_employee: 'E1', company: 'DM Trading' }, { name: 'MI-2', parent: 'MV-2', parenttype: 'Asset Movement', asset: 'IT9', asset_name: 'Laptop', source_location: 'Head Office', target_location: 'Head Office', to_employee: 'E2', company: 'DM Trading' }],
    'Asset Acquisition Records': [{ name: 'AAR-1', date: '2026-05-01', employee: 'E1', branch: 'HO', custom_job_location: 'Head Office', workflow_state: 'Assigned', satus: 'Issue New', docstatus: 1 }],
    'Asset Acquisition Table': [{ name: 'AAT-1', parent: 'AAR-1', parenttype: 'Asset Acquisition Records', item_name: 'Chair', dmasset_no: 'CH-1', quanity: 1, life_cercle_end: 'E1', ids: 'Head Office' }, { name: 'AAT-2', parent: 'AAR-1', parenttype: 'Asset Acquisition Records', item_name: 'Laptop', dmasset_no: 'LP-1', quanity: 1, life_cercle_end: 'E1', ids: 'Head Office' }]
  };
  return db;
}
const methods = {
  'frappe.client.get': (a, db) => {
    const r = (db[a.doctype] || []).find(x => x.name === a.name); if (!r) { const e = new Error('not found'); e.status = 417; throw e; }
    if (a.doctype !== 'Asset') { return r; }
    return Object.assign({}, r, { finance_books: db['Asset Finance Book'].filter(x => x.parent === r.name), schedules: db['Depreciation Schedule'].filter(x => x.parent === r.name) });
  }
};
const content = t => t.$('[data-ref="content"]').innerText();
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
async function filter(t, k, v) { await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="' + k + '"]').selectOption(v); await t.$('[data-act="fapply"]').click(); await t.idle(); }
run({
  slug: 'plant-furniture', folder: '08. Operations & Logistics/Plant & Furniture Asset Dashboard', build, methods,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 4, 5].map(i => t.kpiVal(i))), ['3', '7', '1', '1']); H.ok('overview KPIs: 3 active plant (draft, scrapped, cancelled out), 7 furniture (3 Asset + 4 DM Assets, laptop out), 1 without custodian, 1 overdue task');
    const cost = await t.kpiVal(2), nbv = await t.kpiVal(3);
    H.assert.match(cost, /157[,.]?0?K?\s*SAR/); H.assert.match(cost, /20[,.]?0?K?\s*USD/); H.ok('recorded cost kept per currency: SAR 157,000 and USD 20,000 (' + cost + ')');
    H.assert.match(nbv, /134[,.]?0?K?\s*SAR/); H.assert.doesNotMatch(nbv, /USD/); H.ok('verified book value only from verified assets (P1 80,000 + P2 50,000 + X2/X3 2,000 each); the unproven zero is not counted');
    H.assert.match(await content(t), /Reconciled: ERP count 6 = records used for KPIs and charts 6/); H.ok('count reconciles with the records used');
    /* noloc 1 + nocost 1 + duplicates 4 (X2, X3, DMA-1, DMA-4) + overdue 1 + unverified 2 (P3, X1) + no ID 1 + no custodian 1 + draft 1 + no plan 1 + no certificate 1 + no date 1 + DM incomplete 1 */
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '16'); H.ok('pending = 16 from the v1 exception checks');
    const vlog = t.log.filter(x => x.method === 'frappe.client.get' && x.a.doctype === 'Asset').map(x => x.a.name).sort();
    H.assert.deepEqual([...new Set(vlog)], ['P1', 'P2', 'P3', 'X1', 'X2', 'X3']); H.ok('valuation reads only submitted, active assets');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="register"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_reg'), 6); H.ok('register: 6 active records (server paged)');
    await t.$('[data-tbl="t_reg"] [data-act="kpi"][data-v="asset:P1"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const det = await t.$('.dms-modal').innerText(); H.assert.match(det, /80,000\.00[\s\S]*Verified/); H.assert.match(det, /ACC-JV-0002/); H.ok('asset detail: book value verified (100,000 − 10,000 opening − 10,000 posted), schedule rows link to journals');
    await H.shot(t.page, 'state-detail-1440', { fullPage: false }); await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="valuation"]').click(); await t.idle();
    const v = await content(t); H.assert.match(v, /P3[\s\S]*Unverified\s*Book value field is 0 but posted depreciation does not support it/); H.assert.match(v, /X1[\s\S]*Unverified/); H.ok('valuation: unproven zero (P3) and no depreciation basis (X1) are unverified, not guessed');
    H.assert.equal(await rowsIn(t, 't_disp'), 2); H.ok('scrapped and cancelled assets listed apart and excluded');
    await t.$('[data-act="tab"][data-v="furniture"]').click(); await t.idle();
    H.assert.deepEqual((await kpisIn(t)).slice(0, 5), ['3', '1', '3', '3', '1']); H.ok('furniture: 3 chairs, 1 table (laptop excluded), 3 fixtures assets, 3 assigned, 1 without an employee');
    await t.$('[data-act="tab"][data-v="movement"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_mv'), 1); await t.$('[data-act="opt"][data-v="mvAll:1"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_mv'), 2); H.ok('movement: scope only by default; all categories on request');
    await t.$('[data-act="opt"][data-v="mvAll:0"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="audit"]').click(); await t.idle();
    await t.$('.pf-qf [data-act="sev"][data-v="high"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_exc'), 9); H.ok('audit: high-severity filter (no location, zero cost, 4 duplicates, overdue, unproven zero value, missing ID; X1 without a depreciation basis stays medium as in v1)');
    await t.$('.pf-qf [data-act="sev"][data-v=""]').click(); await t.idle();
    await filter(t, 'category', S.plant);
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle(); H.assert.deepEqual(await Promise.all([0, 1].map(i => t.kpiVal(i))), ['3', '0']); H.ok('category filter: plant only, DM Assets furniture not mixed in');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await filter(t, 'status', 'all');
    await t.$('[data-act="tab"][data-v="register"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_reg'), 9); H.ok('status "all incl. cancelled": 9 records');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    t.ctl.fail = a => a.doctype === 'Asset Movement'; await t.$('[data-ref="refresh"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="movement"]').click(); await t.idle(); H.assert.match(await content(t), /Source unavailable[\s\S]*Asset Movement/);
    await t.$('[data-act="tab"][data-v="register"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_reg'), 6); H.ok('a movement permission failure is isolated: the register still loads');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('[data-act="lang"][data-v="ar"]').click(); await t.idle();
    H.assert.match(await t.$('#dms-pending').innerText(), /الموقع غير محدد/); H.assert.doesNotMatch(await t.$('#dms-pending').innerText(), /Missing location/); H.ok('pending findings switch language without reloading');
    await t.$('[data-act="lang"][data-v="en"]').click(); await t.idle();
  }
});
