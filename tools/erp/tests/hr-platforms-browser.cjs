/* Browser test + screenshot QA for "05. HR & Administration/Admin & HR Platform" (v2 on the DM kit; Admin & HR Platforms
   Expiry Dashboard). v1's rules are kept: one item per expiry field, buckets expired / 0–7 / 8–30 / 31–60 / 61–90 / > 90 /
   not recorded, "missing" only for required slots, inactive records hidden unless asked for, lease = rent counted once.
   Fixture (active items 18, inactive 4):
   - companies: C1 (Company) CR in 5 d, National Address expired 3 d ago, MISA missing; C2 (DM - Branch) CR valid, National
     Address missing, no MISA slot; C3 cancelled (CR expired, hidden);
   - facilities: F1 commercial licence in 20 d, rent in 100 d with the same lease end (counted once), fire in 60 d; F2 Closed (hidden);
   - employees: E1 Iqama expired 2 d ago, contract in 80 d, passport in 45 d, insurance missing; E2 insurance in 7 d, the rest
     valid; E3 Left (hidden);
   - subscriptions: Qiwa in 10 d; GOSI cancelled (hidden); Microsoft 365 with no expiry date (missing).
   Status counts: expired 2, 0–7 d 2, 8–30 d 2, 31–60 d 2, 61–90 d 1, valid 5, not recorded 4. Pending = 2 + 2 + 2 + 4 = 10. */
const { run, TODAY, add } = require('./dms-harness.cjs');
const d = n => add(TODAY, n);
function build() {
  return {
    'DM Companies Management': [
      { name: 'C1', company_name: 'DM Trading', type: 'Company', location: 'Riyadh', cr_number: '1010', cr_expiry: d(5), national_address_expiry: d(-3), misa_expiry: null, cr_cancelled: 0 },
      { name: 'C2', company_name: 'DM Branch Jeddah', type: 'DM - Branch', location: 'Jeddah', cr_number: '4030', cr_expiry: d(200), national_address_expiry: null, misa_expiry: null, cr_cancelled: 0 },
      { name: 'C3', company_name: 'Old Co', type: 'Company', location: 'Dammam', cr_expiry: d(-100), cr_cancelled: 1, cancellation_date: d(-90) }],
    'DM Facilities Management': [
      { name: 'F1', facility_name: 'Warehouse 30', facility_contract_status: 'Active', company: 'DM Trading', location: 'Riyadh', com_act_no: 'LIC-9', com_lic_exp: d(20), rentdate_to: d(100), lease_end: d(100), fire_expiry: d(60) },
      { name: 'F2', facility_name: 'Old Store', facility_contract_status: 'Closed', company: 'DM Trading', com_lic_exp: d(-10) }],
    Employee: [
      { name: 'E1', employee_name: 'Ali Hassan', status: 'Active', company: 'DM Trading', department: 'Sales', branch: 'Riyadh', expiry_date: d(-2), agreement_expiry_date: d(80), passport_expiry_date: d(45), insurance_expiry_date: null },
      { name: 'E2', employee_name: 'Omar Saleh', status: 'Active', company: 'DM Trading', department: 'Admin', branch: 'Jeddah', expiry_date: d(400), agreement_expiry_date: d(400), passport_expiry_date: d(400), insurance_expiry_date: d(7) },
      { name: 'E4', employee_name: 'Faisal Saud', status: 'Active', company: 'DM Trading', department: 'Admin', branch: 'Riyadh', custom_nationality: 'Saudi Arabia', expiry_date: d(400), agreement_expiry_date: null, passport_expiry_date: d(400), insurance_expiry_date: d(400) },
      { name: 'E3', employee_name: 'Left Person', status: 'Left', company: 'DM Trading', expiry_date: d(-50) }],
    'IT Renewals Subscription': [
      { name: 'P1', type_renewal: 'Government', renewal_name: 'Qiwa subscription', expiry_date: d(10), next_renewal: d(10), responsible_person: 'it@dm.test', total_amount: 1200, currency: 'SAR', docstatus: 1 },
      { name: 'P2', type_renewal: 'Government', renewal_name: 'GOSI portal', expiry_date: d(-5), docstatus: 2 },
      { name: 'P3', type_renewal: 'Software', renewal_name: 'Microsoft 365', expiry_date: null, responsible_person: 'it@dm.test', docstatus: 1 }]
  };
}
const content = t => t.$('[data-ref="content"]').innerText();
const rowsIn = async (t, id) => +((await t.$('[data-tbl="' + id + '"]').innerText()).match(/([\d,]+) (?:rows?|records?)\b/)[1].replace(/,/g, ''));
async function filter(t, k, v) { await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="' + k + '"]').selectOption(v); await t.$('[data-act="fapply"]').click(); await t.idle(); }
run({
  slug: 'hr-platforms', folder: '05. HR & Administration/Admin & HR Platform', build,
  figures: async (t, H) => {
    H.assert.deepEqual(await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map(i => t.kpiVal(i))), ['22', '2', '2', '2', '2', '1', '9', '4']); H.ok('status buckets: 22 active items (Saudi open-ended contract counted valid, not missing) (4 inactive hidden), lease = rent counted once');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '10'); H.ok('pending = expired 2 + 0–7 d 2 + 8–30 d 2 + not recorded 4');
    const ov = await content(t); H.assert.match(ov, /Microsoft 365|Qiwa subscription/); H.assert.match(ov, /DM Trading[\s\S]*DM Branch Jeddah/); H.ok('priority list and company summary');
    await t.$('[data-ref="content"] .dms-kpi[data-v="st:expired"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const m = await t.$('.dms-modal').innerText(); H.assert.match(m, /\(2\)/); H.assert.match(m, /Ali Hassan[\s\S]*DM Trading|DM Trading[\s\S]*Ali Hassan/); await t.page.keyboard.press('Escape'); H.ok('a status KPI opens its list');
  },
  interactions: async (t, H) => {
    await t.$('[data-act="tab"][data-v="hr"]').click(); await t.idle();
    H.assert.equal(await rowsIn(t, 't_hr'), 12); await t.$('.hp-chip[data-v="expired"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_hr'), 1); H.ok('HR tab: 12 employee items; the expired chip narrows to 1');
    await t.$('.hp-chip[data-v="expired"]').click(); await t.idle();
    const sa = (await t.$('[data-tbl="t_hr"] tr').filter({ hasText: 'Faisal Saud' }).filter({ hasText: 'Qiwa Contract' }).innerText()).replace(/\s+/g, ' ');
    H.assert.match(sa, new RegExp(add(TODAY, 60) + '.* 60 days Valid · Open-ended')); H.ok('Saudi contract with no expiry: today + 60 days, 60 days left, Valid · Open-ended');
    await t.$('[data-tbl="t_hr"] [data-v^="it:Employee::E1::expiry_date"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const det = await t.$('.dms-modal').innerText(); H.assert.match(det, /Iqama[\s\S]*2 days overdue/); H.assert.match(det, /Passport/); H.ok('details: selected expiry first, other expiries of the record listed');
    await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="facilities"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_facilities'), 3); H.ok('facilities: closed facility hidden, lease end equal to rent not double counted');
    await t.$('[data-act="tab"][data-v="it"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_it'), 1);
    const itx = await content(t); H.assert.match(itx, /Microsoft 365/); H.assert.doesNotMatch(itx, /Qiwa subscription/); H.ok('IT Subscriptions tab: IT renewals that are not government platforms');
    await t.$('[data-act="tab"][data-v="platforms"]').click(); await t.idle(); H.assert.equal(await rowsIn(t, 't_platforms'), 6);
    H.assert.doesNotMatch(await t.$('[data-tbl="t_platforms"]').innerText(), /Microsoft 365/); H.ok('Government Platforms: company documents + government renewals only (IT subscriptions excluded)');
    const pl = await content(t); H.assert.match(pl, /Qiwa\s*Tracked \(1\)/); H.assert.match(pl, /MISA\s*Tracked per company/); H.assert.match(pl, /Mudad\s*Not Configured/); H.ok('platform coverage chips (tracked, tracked per company, not configured)');
    await filter(t, 'inactive', '1');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle(); H.assert.equal(await t.kpiVal(0), '26'); H.ok('including inactive / historical records: 26');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    t.ctl.fail = a => a.doctype === 'Employee'; await t.$('[data-ref="refresh"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /Source unavailable[\s\S]*Employee/); H.assert.equal(await t.kpiVal(0), '10'); H.ok('an Employee permission failure is reported and the other three sources still count');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
  }
});
