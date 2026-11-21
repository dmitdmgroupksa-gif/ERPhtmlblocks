/* Browser test + screenshot QA for "08. Operations & Logistics/FM & Inventory Dashboard" (v6, aligning the v5 redesign).
   Fixture: facilities (expired / ending / closed / no end date, unpaid instalments, licence dates) in SAR and AED companies,
   assets and a pending repair, Bins with shortage / negative / low / dead stock, Stock Ledger Entries in the 30/90/180/365-day
   windows, open sales and purchase invoices, bank / cash and P&L accounts with GL entries, and payment entries. Also checks
   that a filter change does not refetch (v5 filters client-side) and that Refresh does. */
const { run, fmt, money, TODAY, add } = require('./dms-harness.cjs');
const SAR = ['DM Group KSA', 'DM Steel'];
function build() {
  const db = { Company: [{ name: 'DM Group KSA', default_currency: 'SAR' }, { name: 'DM Steel', default_currency: 'SAR' }, { name: 'DM Dubai', default_currency: 'AED' }],
    'DM Facilities Management': [], Asset: [], 'Asset Repair': [], Bin: [], Warehouse: [], Item: [], 'Stock Ledger Entry': [], 'Sales Invoice': [], 'Purchase Invoice': [], Account: [], 'GL Entry': [], 'Payment Entry': [] };
  const types = ['Warehouse', 'Showroom', 'Office', 'Land'], locs = ['Riyadh', 'Jeddah', 'Dammam'];
  for (let i = 0; i < 14; i++) {
    const co = i === 13 ? 'DM Dubai' : SAR[i % 2], end = i === 5 ? null : add(TODAY, [-40, 20, 75, 200, 400, 0, -5, 30, 120, 60, 365, 500, 15, 90][i]), start = add(TODAY, -365 + (i % 3) * 10);
    db['DM Facilities Management'].push({ name: 'FAC-' + String(i + 1).padStart(3, '0'), docstatus: 0, modified: TODAY, company: co, facility_detail: types[i % 4], facility_name: types[i % 4] + ' ' + locs[i % 3] + ' ' + (i + 1), facility_catogory: 'Operational', facility_contract_status: i === 11 ? 'Closed' : 'Active',
      facility_type: 'Rented', location: locs[i % 3], area_in_sqm: String(500 + i * 100), agreement_type: i % 4 === 0 ? 'Lease Agreement' : 'Rent Agreement', contract_number: 'C-' + i, auto_renewal: i % 2 ? 'Yes' : 'No', date_frm: start, rentdate_to: end, lease_start: i % 4 === 0 ? start : null, lease_end: i % 4 === 0 ? end : null,
      rent_amount: 120000 + i * 10000, rental_amount: 0, rent_installments: '4', amount_intallments: (120000 + i * 10000) / 4, rent_mode: 'Bank transfer', owner_name: 'Landlord ' + i, owner_number: '0500000' + String(i).padStart(3, '0'), additional_notes: '',
      installment_1_dues_on: add(start, 0), installment_2_dues_on: add(start, 91), installment_3_dues_on: add(TODAY, i % 2 ? -10 : 12), installment_4_dues_on: add(TODAY, 80), paid1_not: 1, paid2_not: 1, paid3_not: i % 3 === 0 ? 1 : 0, paid4_not: 0,
      com_lic_exp: add(TODAY, [-10, 30, 200][i % 3]), cr_date_to: add(TODAY, 300), cd_date_to: i % 4 === 1 ? add(TODAY, -3) : add(TODAY, 120), national_adress_expiry: null, fire_expiry: add(TODAY, 45), cleanig_exp_date: null, camera_expiry: null, industrial_expiry: null, construction_environmental_permit_expiry: null, operational_environmental_permit_expiry: null,
      fire_contractor: 'SafeFire', cleaning_cont: '', camera_contractor: '', fire_layout: 1, sign_board: i % 2, medical_kit: 1 });
  }
  for (let i = 0; i < 5; i++) { db.Asset.push({ name: 'AST-' + i, docstatus: 1, asset_name: 'Forklift ' + i, company: SAR[i % 2], asset_category: ['Vehicles', 'Machinery'][i % 2], location: 'Riyadh', status: 'Submitted', gross_purchase_amount: 90000 + i * 5000, value_after_depreciation: 50000 + i * 4000, insurance_end_date: add(TODAY, i * 30), maintenance_required: 0 }); }
  db['Asset Repair'].push({ name: 'REP-1', docstatus: 0, asset: 'AST-1', company: 'DM Group KSA', repair_status: 'Pending', failure_date: add(TODAY, -6), total_repair_cost: 3000 });
  [['Stores - DMG', 'DM Group KSA'], ['Yard - DMG', 'DM Group KSA'], ['Stores - DMS', 'DM Steel'], ['Stores - DXB', 'DM Dubai']].forEach(w => db.Warehouse.push({ name: w[0], warehouse_name: w[0].split(' - ')[0], company: w[1], is_group: 0, disabled: 0, warehouse_type: '' }));
  for (let i = 0; i < 12; i++) { db.Item.push({ name: 'ITM-' + i, item_name: ['Tube', 'Coupler', 'Board', 'Clamp'][i % 4] + ' ' + i, item_group: ['Scaffolding', 'Formwork'][i % 2], stock_uom: 'Nos', custom_reorder_level_qty: i % 4 === 2 ? 50 : 0, safety_stock: 0 }); }
  let n = 0;
  db.Item.forEach((it, i) => ['Stores - DMG', 'Yard - DMG', 'Stores - DMS', 'Stores - DXB'].forEach((w, j) => {
    if ((i + j) % 3 === 0) { return; }
    const qty = i === 3 && j === 1 ? -4 : 10 + ((i * 5 + j * 7) % 30), proj = i === 7 ? -15 : qty;
    db.Bin.push({ name: 'BIN-' + (++n), item_code: it.name, warehouse: w, actual_qty: qty, projected_qty: proj, reserved_qty: i === 7 ? qty + 15 : 0, ordered_qty: 0, stock_value: qty * (10 + i), stock_uom: 'Nos' });
  }));
  db.Item.forEach((it, i) => { const days = [5, 60, 150, 300, null, 20][i % 6]; if (days != null) { db['Stock Ledger Entry'].push({ name: 'SLE-' + i, item_code: it.name, warehouse: 'Stores - DMG', posting_date: add(TODAY, -days), is_cancelled: 0 }); } });
  const cust = ['Al Rajhi Towers', 'Najd Builders', 'Red Sea Marine'], sup = ['Riyadh Steel Co', 'Gulf Fasteners'];
  for (let i = 0; i < 10; i++) { const co = i === 9 ? 'DM Dubai' : SAR[i % 2]; db['Sales Invoice'].push({ name: 'ACC-SINV-' + i, docstatus: 1, customer: 'C' + (i % 3), customer_name: cust[i % 3], company: co, posting_date: add(TODAY, -(i * 25 + 5)), due_date: add(TODAY, -(i * 25 + 5) + 30), base_grand_total: 50000 + i * 5000, outstanding_amount: 20000 + i * 1000, conversion_rate: 1, status: 'Unpaid' }); }
  for (let i = 0; i < 6; i++) { db['Purchase Invoice'].push({ name: 'ACC-PINV-' + i, docstatus: 1, supplier: 'S' + (i % 2), supplier_name: sup[i % 2], company: SAR[i % 2], posting_date: add(TODAY, -(i * 12 + 2)), due_date: add(TODAY, [-20, 3, 5, 40, -2, 60][i]), base_grand_total: 30000 + i * 1000, outstanding_amount: 15000 + i * 500, conversion_rate: 1, status: 'Unpaid', bill_no: 'B' + i }); }
  [['1110 - Bank - DMG', 'Bank', 'DM Group KSA'], ['1120 - Cash - DMG', 'Cash', 'DM Group KSA'], ['1110 - Bank - DMS', 'Bank', 'DM Steel']].forEach(a => db.Account.push({ name: a[0], account_name: a[0].split(' - ')[1], company: a[2], account_type: a[1], is_group: 0, disabled: 0, report_type: 'Balance Sheet', root_type: 'Asset' }));
  [['4100 - Sales - DMG', 'Income', 'DM Group KSA'], ['5100 - COGS - DMG', 'Expense', 'DM Group KSA'], ['4100 - Sales - DMS', 'Income', 'DM Steel'], ['5100 - COGS - DMS', 'Expense', 'DM Steel']].forEach(a => db.Account.push({ name: a[0], account_name: a[0], company: a[2], account_type: '', is_group: 0, disabled: 0, report_type: 'Profit and Loss', root_type: a[1] }));
  for (let m = 0; m < 12; m++) { const d = add(TODAY.slice(0, 8) + '05', -30 * m); ['DMG', 'DMS'].forEach((c, k) => { db['GL Entry'].push({ name: 'GL-' + (++n), account: '4100 - Sales - ' + c, debit: 0, credit: 100000 + m * 1000 + k * 5000, posting_date: d, is_cancelled: 0, voucher_type: 'Sales Invoice' }); db['GL Entry'].push({ name: 'GL-' + (++n), account: '5100 - COGS - ' + c, debit: 70000 + m * 2000, credit: 0, posting_date: d, is_cancelled: 0, voucher_type: 'Purchase Invoice' }); }); }
  db['GL Entry'].push({ name: 'GL-b1', account: '1110 - Bank - DMG', debit: 250000, credit: 40000, posting_date: add(TODAY, -10), is_cancelled: 0, voucher_type: 'Payment Entry' });
  db['GL Entry'].push({ name: 'GL-b2', account: '1120 - Cash - DMG', debit: 1000, credit: 4000, posting_date: add(TODAY, -10), is_cancelled: 0, voucher_type: 'Journal Entry' });
  db['GL Entry'].push({ name: 'GL-b3', account: '1110 - Bank - DMS', debit: 90000, credit: 10000, posting_date: add(TODAY, -10), is_cancelled: 0, voucher_type: 'Payment Entry' });
  for (let m = 0; m < 12; m++) { const d = add(TODAY.slice(0, 8) + '05', -30 * m); db['Payment Entry'].push({ name: 'PE-r' + m, docstatus: 1, company: 'DM Group KSA', payment_type: 'Receive', base_paid_amount: 0, base_received_amount: 60000 + m * 1000, posting_date: d }); db['Payment Entry'].push({ name: 'PE-p' + m, docstatus: 1, company: 'DM Steel', payment_type: 'Pay', base_paid_amount: 40000 + m * 500, base_received_amount: 0, posting_date: d }); }
  return db;
}
/* v5 rules, re-derived */
const inScope = c => SAR.includes(c) || !c;
function facts(db) {
  const days = d => (d ? Math.round((Date.parse(d) - Date.parse(TODAY)) / 864e5) : null);
  const A = db['DM Facilities Management'].filter(r => inScope(r.company) && r.facility_contract_status !== 'Closed').map(r => Object.assign({}, r, { _end: (r.agreement_type === 'Lease Agreement' && r.lease_start && r.lease_end) ? r.lease_end : (r.rentdate_to || r.lease_end || ''), _start: (r.agreement_type === 'Lease Agreement' && r.lease_start) ? r.lease_start : r.date_frm }));
  A.forEach(r => { r._days = r._end ? days(r._end) : null; });
  const end90 = A.filter(r => r._days != null && r._days <= 90);
  const DOCS = ['com_lic_exp', 'cr_date_to', 'cd_date_to', 'national_adress_expiry', 'fire_expiry', 'cleanig_exp_date', 'camera_expiry', 'industrial_expiry', 'construction_environmental_permit_expiry', 'operational_environmental_permit_expiry'];
  const docs = A.reduce((s, r) => s + DOCS.filter(k => r[k] && days(r[k]) <= 60).length, 0);
  const inst = A.reduce((s, r) => s + [1, 2, 3, 4].filter(k => { const due = r['installment_' + k + '_dues_on']; return due && !r['paid' + k + '_not'] && ((due < TODAY && (!r._start || due >= r._start)) || (due >= TODAY && due <= add(TODAY, 30))); }).length, 0);
  const sar = db.Bin.filter(b => b.warehouse !== 'Stores - DXB'), items = {};
  sar.forEach(b => { const g = items[b.item_code] || (items[b.item_code] = { qty: 0, proj: 0, neg: false }); g.qty += b.actual_qty; g.proj += b.projected_qty; if (b.actual_qty < 0) { g.neg = true; } });
  const it = db.Item.reduce((m, i) => (m[i.name] = i, m), {}), list = Object.keys(items).map(k => Object.assign({ k }, items[k]));
  const short = list.filter(g => g.neg || g.proj < 0).length, low = list.filter(g => !g.neg && g.proj >= 0 && it[g.k].custom_reorder_level_qty > 0 && g.qty <= it[g.k].custom_reorder_level_qty).length;
  const si = db['Sales Invoice'].filter(r => inScope(r.company)), pi = db['Purchase Invoice'].filter(r => inScope(r.company));
  const arOver = si.filter(r => r.due_date < TODAY), apDue = pi.filter(r => r.due_date < TODAY || r.due_date <= add(TODAY, 7));
  return { A, end90, docs, inst, short, low, arOver, apDue, cashNeg: 1, sar };
}
const fmLoads = t => t.log.filter(x => x.method === 'frappe.client.get_list' && x.a.doctype === 'DM Facilities Management').length;
run({
  slug: 'fm-inventory', folder: '08. Operations & Logistics/FM & Inventory Dashboard', build,
  figures: async (t, H, db) => {
    const f = facts(db);
    H.assert.equal(await t.kpiVal(0), fmt(f.A.length)); H.assert.equal(await t.kpiVal(1), fmt(f.end90.filter(r => r._days >= 0).length)); H.ok('active facilities and contracts ending within 90 days (SAR companies; closed and AED left out)');
    H.assert.equal((await t.kpiVal(2)).replace(/\s/g, ''), money(f.sar.reduce((a, b) => a + b.stock_value, 0)) + 'SAR'); H.ok('stock value from Bin, SAR-company warehouses only');
    H.assert.equal((await t.kpiVal(5)).replace(/\s/g, ''), money(f.arOver.reduce((a, r) => a + r.outstanding_amount, 0)) + 'SAR'); H.ok('overdue receivable in SAR; the AED invoice is not added');
    const P = f.end90.length + f.docs + f.inst + f.short + f.low + f.arOver.length + f.apDue.length + f.cashNeg;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = v5 "Needs attention" lists (' + P + ')');
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /not included: DM Dubai \(AED\)/); H.ok('AED company named, not added');
  },
  interactions: async (t, H, db) => {
    const f = facts(db);
    await t.$('[data-act="tab"][data-v="fm"]').click(); await t.idle();
    await t.$('.dms-kpi[data-v="qf2:fm:expired"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_fm"]').innerText(), new RegExp('\\b' + f.A.filter(r => r._days != null && r._days < 0).length + ' rows')); H.ok('past-end card filters the facility table');
    await t.$('[data-tbl="t_fm"] [data-act="kpi"]').first().click(); await t.$('.dms-modal').waitFor();
    H.assert.match(await t.$('.dms-modal').innerText(), /Agreement[\s\S]*Rent instalments[\s\S]*Licences and compliance[\s\S]*Safety and services/); H.ok('facility drill keeps v5 drawer sections');
    await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="inventory"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Stock value by last movement[\s\S]*0–30 days/); await t.$('[data-act="qf"][data-v="inventory:short"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_inv"]').innerText(), new RegExp('\\b' + f.short + ' rows')); H.ok('inventory: movement windows and short-or-negative chip (' + f.short + ')');
    await t.$('[data-act="tab"][data-v="finance"]').click(); await t.idle(); await t.$('.dms-kpi[data-v="qf2:finance:arover"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_fin"]').innerText(), new RegExp('\\b' + f.arOver.length + ' rows')); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Net position[\s\S]*Bank and cash balances/); H.ok('finance: overdue receivables, net position and bank balances');
    const before = fmLoads(t);
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('DM Steel'); await t.$('[data-act="fapply"]').click(); await t.idle();
    H.assert.equal(fmLoads(t), before); H.ok('a filter change re-renders without refetching (v5 behaviour)');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    H.assert.equal(await t.kpiVal(0), fmt(f.A.filter(r => r.company === 'DM Steel').length)); H.ok('company filter applies client-side');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await t.$('[data-ref="refresh"]').click(); await t.idle(); H.assert.equal(fmLoads(t), before + 1); H.ok('Refresh refetches');
  }
});
