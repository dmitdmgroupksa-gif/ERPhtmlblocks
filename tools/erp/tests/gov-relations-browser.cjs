/* Browser test + screenshot QA for "05. HR & Administration/Government Relations Dashboard" (v2 on the DM kit).
   v1's rules are kept: Expired < 0 days, Expiring Soon within the alert window (60 days by default), Valid beyond it;
   closed EJAR contracts and records without a date are not counted; licences only for Active facilities; cancelled CRs
   excluded; service contracts (fire, camera, cleaning) shown on the licence tab but not counted in the overview.
   Fixture:
   - facilities: F1 Active (EJAR in 20 d, commercial licence expired 5 d ago, civil defence valid, fire contract in 40 d);
     F2 Active (EJAR ended 10 d ago, no licence or civil defence dates); F3 Closed (not counted); F4 Active accommodation (valid);
   - entities: C1 (CR in 30 d, MISA expired 2 d ago); C2 branch (CR valid, MISA number without expiry, no National Address,
     no zakat); C3 cancelled (CR excluded, MISA "Cancelled");
   - no Prepaid Expense records.
   Overview counted items: EJAR 3 + government licences 2 + CR 2 + MISA 1 = 8 (expired 3, expiring 2, valid 3).
   Pending: expired 3 + expiring 2 + data gaps 4 (C2 MISA expiry, C2 National Address, F2 licence, F2 civil defence) = 9. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
function build() {
  const f = (name, o) => Object.assign({ name, facility_name: name + ' site', company: 'DM Trading', facility_detail: 'Warehouse', facility_type: 'Rented', location: 'Riyadh', contract_number: 'EJ-' + name, date_frm: d(-345), rent_amount: 0, auto_renewal: 'Yes', facility_contract_status: 'Active', municipality: 'Riyadh Municipality' }, o);
  return {
    'DM Facilities Management': [
      f('F1', { rentdate_to: d(20), rent_amount: 100000, auto_renewal: 'No', com_act_no: 'LIC-1', com_lic_exp: d(-5), civil_def_no: 'CD-1', cd_date_to: d(200), fire_expiry: d(40) }),
      f('F2', { facility_detail: 'Office', rentdate_to: d(-10), rent_amount: 50000 }),
      f('F3', { facility_detail: 'Showroom', facility_contract_status: 'Closed', rentdate_to: d(-100), com_lic_exp: d(-90) }),
      f('F4', { facility_detail: 'Accomadation', rentdate_to: d(300), rent_amount: 20000 })],
    'DM Companies Management': [
      { name: 'C1', company_name: 'DM Trading', type: 'Company', location: 'Riyadh', cr_number: '1010101010', unified_number: '7001', riyadh_chamber: 'CH-1', cr_expiry: d(30), national_address_expiry: d(400), misa: 'M1', misa_expiry: d(-2), zakat_details: 'Z-1', cr_cancelled: 0 },
      { name: 'C2', company_name: 'DM Jeddah Branch', type: 'DM - Branch', location: 'Jeddah', cr_number: '4030303030', cr_expiry: d(500), national_address_expiry: null, misa: 'M1', misa_expiry: null, zakat_details: null, cr_cancelled: 0 },
      { name: 'C3', company_name: 'Old Entity', type: 'Company', location: 'Dammam', cr_number: '2050505050', cr_expiry: d(-50), misa: 'M3', misa_expiry: d(100), zakat_details: 'Z-3', cr_cancelled: 1, cancellation_date: d(-40) }],
    'Prepaid Expense': []
  };
}
const content = t => t.$('[data-ref="content"]').innerText();
const kpisIn = async t => (await t.$('[data-ref="content"] .dms-kpis').first().locator('.dms-kpi-n').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
async function filter(t, k, v) { await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="' + k + '"]').selectOption(v); await t.$('[data-act="fapply"]').click(); await t.idle(); }
run({
  slug: 'gov-relations', folder: '05. HR & Administration/Government Relations Dashboard', build,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5].map(i => t.kpiVal(i))), ['8', '3', '2', '3', '38%', '3']); H.ok('overview: 8 counted (closed EJAR, service contracts, cancelled CR and undated MISA not counted); compliance 3 / 8');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '9'); H.ok('pending = expired 3 + expiring 2 + data gaps 4');
    const ov = await content(t); H.assert.match(ov, /MISA expiry missing[\s\S]*Zakat details empty|Zakat details empty[\s\S]*MISA expiry missing/); H.assert.match(ov, /No Prepaid Expense records/); H.ok('data-gap checks from v1');
    await t.$('[data-ref="content"] .dms-kpi[data-v="st:all:Expired"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const m = await t.$('.dms-modal').innerText(); H.assert.match(m, /\(3\)/); H.assert.match(m, /F2 site[\s\S]*F1 site[\s\S]*DM Trading/); await t.page.keyboard.press('Escape'); H.ok('expired KPI lists the 3 items, most overdue first');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="licenses"]').click(); await t.idle(); H.assert.deepEqual((await kpisIn(t)).slice(0, 4), ['3', '1', '1', '1']); H.ok('licences: 3 for active facilities (fire contract expiring in 40 days)');
    await filter(t, 'win', '30'); H.assert.deepEqual((await kpisIn(t)).slice(0, 4), ['3', '1', '0', '2']); H.ok('a 30-day alert window moves the fire contract to valid');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await t.$('[data-act="tab"][data-v="ejar"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_ejar'), 3);
    await t.$('[data-act="ejf"][data-v="all"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_ejar'), 4); H.ok('EJAR: active contracts by default, closed ones on request');
    H.assert.match(await content(t), /No Prepaid Expense records exist in ERP yet/); H.ok('prepaid: empty source says so');
    await t.$('[data-act="tab"][data-v="misa"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_misa'), 3); H.assert.match(await content(t), /No MISA expiry on record in ERP/); H.ok('MISA: undated and cancelled entries listed, not counted');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await filter(t, 'range', 'overdue'); H.assert.equal(await t.kpiVal(0), '3'); H.ok('range preset "Overdue": only the 3 expired items');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    t.ctl.fail = a => a.doctype === 'DM Companies Management'; await t.$('[data-ref="refresh"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /Source unavailable[\s\S]*DM Companies Management/); H.assert.equal(await t.kpiVal(0), '5'); H.ok('an entity-source failure is reported; facility items still count (5)');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
  }
});
