/* Browser test + screenshot QA for "03. Procurement & Supply Chain/Customs & Post-Processing" (on the DM kit).
   Fixture: purchase orders with the custom shipment/customs fields across two SAR companies and one AED company,
   shipping documents, receipts, PO lines, landed cost vouchers (one manufacturing-only voucher that must be excluded),
   purchase invoices, payments and files. Expected figures re-derive v1's rules in plain JS. */
const { run, fmt, money, TODAY, add } = require('./dms-harness.cjs');
const Y0 = TODAY.slice(0, 4) + '-01-01', SAR = ['DM Group KSA', 'DM Steel'];
const SUPS = [['SUP-CN1', 'Shanghai Scaffold Ltd', 'China'], ['SUP-TR1', 'Istanbul Formwork', 'Turkey'], ['SUP-SA1', 'Riyadh Steel Co', 'Saudi Arabia'], ['SUP-IN1', 'Mumbai Couplers', 'India']];
const SST = ['Order Received', 'In Transit', 'In Customs', 'Shipped Full Qty', 'Delivered', 'Shipment Delayed', '', 'Awaiting Pickup'];
const SHIPPED = ['Shipped Full Qty', 'Shipped Partial Qty', 'In Transit', 'In Customs', 'Out for Delivery', 'Delivered', 'Awaiting Pickup', 'Shipment Delayed'];
function build() {
  const db = { Company: [{ name: 'DM Group KSA', default_currency: 'SAR' }, { name: 'DM Steel', default_currency: 'SAR' }, { name: 'DM Dubai', default_currency: 'AED' }], Supplier: SUPS.map(s => ({ name: s[0], supplier_name: s[1], country: s[2] })),
    'Purchase Order': [], 'Purchase Order Item': [], 'Shipping Documents': [], 'Purchase Receipt': [], 'Purchase Receipt Item': [], 'Landed Cost Voucher': [], 'Landed Cost Taxes and Charges': [], 'Landed Cost Purchase Receipt': [],
    'Purchase Invoice': [], 'Purchase Invoice Item': [], 'Payment Entry': [], File: [] };
  let n = 0; const child = (dt, parent, ptype, o) => { n++; db[dt].push(Object.assign({ name: 'R' + n, parent, parenttype: ptype }, o)); };
  for (let i = 0; i < 28; i++) {
    const s = SUPS[i % 4], co = i >= 24 ? 'DM Dubai' : i % 2 ? 'DM Steel' : 'DM Group KSA', d = add(TODAY, -(i * 11 + 4)), rec = i % 5 === 0 ? 100 : i % 5 === 1 ? 50 : 0, foreign = s[0] !== 'SUP-SA1';
    const po = { name: 'PUR-ORD-' + String(i + 1).padStart(4, '0'), docstatus: 1, supplier: s[0], supplier_name: s[1], company: co, transaction_date: d, schedule_date: add(d, 40), currency: foreign ? 'USD' : 'SAR', grand_total: 10000 + i * 1000, base_grand_total: (10000 + i * 1000) * (foreign ? 3.75 : 1), status: rec >= 100 ? 'Completed' : 'To Receive and Bill', per_received: rec, per_billed: rec >= 100 ? 100 : 0,
      custom_supplier_type: foreign ? 'Foreign' : 'Local', custom_shipment_status: foreign ? SST[i % 8] : '', custom_customs_status: !foreign ? '' : i % 4 === 0 ? 'Cleared' : i % 4 === 1 ? 'Under Inspection' : '', custom_estimated_arrival_time: foreign && i % 6 !== 5 ? add(TODAY, ((i % 6) - 3) * 4) : null, custom_loading_date: foreign ? add(d, 10) : null,
      custom_customs_charges: foreign ? 500 * (i % 5 + 1) : 0, custom_customs_charges_paid: foreign && i % 2 ? 1 : 0, custom_inspection_status: i % 3 ? 'Inspected' : 'Waiting For Inspection', custom_clearing_document_status: ['Documents in courier', 'Documents Received', 'Submitted to Customs', ''][i % 4], custom_saber_status: i % 3 === 0 ? 'Submitted' : '', custom_original_bl_status: i % 7 === 3 ? 'Not Matching' : i % 2 ? 'Received' : '',
      custom_invoice_number: i % 2 ? 'CI-' + i : '', custom_bl_invoice_verification: 'Verified', custom_bl_weight_varification: i % 9 === 4 ? 'Not Matching' : 'Verified', custom_hs_code_verification: 'Verified', custom_price_verification: 'Verified', custom_shipment_terms: 'CIF' };
    db['Purchase Order'].push(po);
    child('Purchase Order Item', po.name, 'Purchase Order', { item_code: 'TUBE-48', item_name: 'Scaffold tube 48mm', qty: 100, received_qty: rec, warehouse: 'Stores - DMG', schedule_date: add(d, 40), uom: 'Nos' });
    if (foreign && i % 2 === 0) { child('Shipping Documents', po.name, 'Purchase Order', { container_no: 'MSKU' + (100000 + i), bl_no: 'BL-' + i }); }
    if (rec > 0) { const pr = 'MAT-PRE-' + String(i + 1).padStart(4, '0'); db['Purchase Receipt'].push({ name: pr, docstatus: 1, posting_date: add(d, 45), status: 'Completed', is_return: 0, supplier: s[0], custom_container_no: 'MSKU' + (100000 + i) }); child('Purchase Receipt Item', pr, 'Purchase Receipt', { docstatus: 1, purchase_order: po.name, purchase_order_item: 'R' + (n - (foreign && i % 2 === 0 ? 1 : 0)) }); db.File.push({ name: 'F' + i, file_name: 'grn_' + i + '.pdf', attached_to_doctype: 'Purchase Receipt', attached_to_name: pr }); }
  }
  /* an older open shipment past ETA (outside the period, counts in actions) */
  db['Purchase Order'].push(Object.assign({}, db['Purchase Order'][1], { name: 'PUR-ORD-2025-0099', transaction_date: '2025-10-01', custom_shipment_status: 'In Transit', custom_customs_status: '', custom_estimated_arrival_time: '2025-11-20', per_received: 0, status: 'To Receive', company: 'DM Group KSA' }));
  const lcv = (i, co, charges, recs) => { const nm = 'LCV-' + i; db['Landed Cost Voucher'].push({ name: nm, docstatus: 1, company: co, posting_date: add(TODAY, -(i * 20 + 3)), total_taxes_and_charges: charges.reduce((s, c) => s + c[2], 0), custom_po_number: recs[0][0] }); charges.forEach(c => child('Landed Cost Taxes and Charges', nm, 'Landed Cost Voucher', { description: c[0], expense_account: c[1], base_amount: c[2] })); recs.forEach(r => child('Landed Cost Purchase Receipt', nm, 'Landed Cost Voucher', { receipt_document: r[1], supplier: r[2], grand_total: r[3] })); };
  lcv(1, 'DM Group KSA', [['Customs duty', 'Customs Or Expense Clearing - DMG', 4200], ['Freight', 'Freight - DMG', 1800]], [['PUR-ORD-0001', 'MAT-PRE-0001', 'SUP-CN1', 37500]]);
  lcv(2, 'DM Steel', [['Clearing', 'Customs Or Expense Clearing - DMS', 2500]], [['PUR-ORD-0006', 'MAT-PRE-0006', 'SUP-TR1', 56250], ['PUR-ORD-0007', 'MAT-PRE-0007', 'SUP-SA1', 16000]]);
  lcv(3, 'DM Group KSA', [['Operating Cost as per Work Order / BOM', 'Manufacturing - DMG', 9000]], [['PUR-ORD-0011', 'MAT-PRE-0011', 'SUP-SA1', 20000]]);
  lcv(4, 'DM Group KSA', [['Insurance', 'Insurance - DMG', 700]], [['PUR-ORD-0001', 'MAT-PRE-0001', 'SUP-CN1', 37500]]);
  for (let i = 0; i < 12; i++) {
    const s = SUPS[i % 4], co = i === 11 ? 'DM Dubai' : SAR[i % 2], tot = 20000 + i * 2500, out = [0, tot, tot / 2][i % 3];
    db['Purchase Invoice'].push({ name: 'ACC-PINV-' + String(i + 1).padStart(4, '0'), docstatus: 1, supplier: s[0], supplier_name: s[1], company: co, posting_date: add(TODAY, -(i * 17 + 2)), due_date: add(TODAY, -(i * 17 + 2) + 30), currency: 'SAR', conversion_rate: 1, grand_total: tot, base_grand_total: tot, outstanding_amount: out, party_account_currency: co === 'DM Dubai' ? 'AED' : 'SAR', is_return: 0, status: out ? 'Unpaid' : 'Paid', bill_no: 'SINV-' + i });
    child('Purchase Invoice Item', 'ACC-PINV-' + String(i + 1).padStart(4, '0'), 'Purchase Invoice', { purchase_order: 'PUR-ORD-' + String(i + 1).padStart(4, '0') });
  }
  for (let i = 0; i < 6; i++) { db['Payment Entry'].push({ name: 'ACC-PAY-' + (i + 1), docstatus: 1, posting_date: add(TODAY, -(i * 30 + 5)), company: SAR[i % 2], party: SUPS[i % 4][0], party_name: SUPS[i % 4][1], payment_type: 'Pay', party_type: 'Supplier', base_paid_amount: 15000 + i * 1000, paid_amount: 15000 + i * 1000, unallocated_amount: i === 2 ? 5000 : 0, status: 'Submitted' }); }
  db['Purchase Order'].forEach(p => { if (p.name.endsWith('3')) { db.File.push({ name: 'FP' + p.name, file_name: 'ci_' + p.name + '.pdf', attached_to_doctype: 'Purchase Order', attached_to_name: p.name }); } });
  return db;
}
/* v1 rules, re-derived */
const VER = ['custom_bl_invoice_verification', 'custom_bl_weight_varification', 'custom_hs_code_verification', 'custom_price_verification', 'custom_original_bl_status'];
function ship(db, opt = {}) {
  return db['Purchase Order'].filter(p => p.docstatus === 1 && SAR.includes(p.company) && p.transaction_date >= Y0 && p.transaction_date <= TODAY).map(p => {
    const sst = p.custom_shipment_status || '', cst = p.custom_customs_status || '', eta = p.custom_estimated_arrival_time || '', rec = +p.per_received || 0, shipped = SHIPPED.includes(sst) || !!cst, cleared = cst === 'Cleared';
    const late = eta && eta < TODAY && !cleared && rec < 100 && shipped && sst !== 'Delivered' ? 1 : (sst === 'Shipment Delayed' && !cleared ? 0.5 : 0);
    return Object.assign({}, p, { sst, cst, eta, rec, shipped, cleared, isShip: p.custom_supplier_type === 'Foreign' || SHIPPED.includes(sst) || !!cst || !!p.custom_loading_date || !!eta, hold: VER.some(k => p[k] === 'Not Matching'), delayed: late > 0, pend: shipped && !cleared && rec < 100 && sst !== 'Delivered' });
  }).filter(p => p.isShip && (!opt.status || (opt.status === '__none' ? !p.sst : p.sst === opt.status)));
}
run({
  slug: 'customs', folder: '03. Procurement & Supply Chain/Customs & Post-Processing', build,
  figures: async (t, H, db) => {
    const Sh = ship(db);
    H.assert.equal(await t.kpiVal(0), fmt(Sh.length)); H.assert.equal(await t.kpiVal(2), fmt(Sh.filter(p => p.pend).length)); H.assert.equal(await t.kpiVal(3), fmt(Sh.filter(p => p.shipped && !p.cleared && p.rec < 100 && (p.hold || p.delayed)).length)); H.ok('shipments / clearance pending / holds and delays follow v1 rules (SAR companies, this year)');
    const lc = db['Landed Cost Voucher'].filter(v => SAR.includes(v.company) && v.name !== 'LCV-3'), rec = {}; lc.forEach(v => db['Landed Cost Purchase Receipt'].filter(r => r.parent === v.name).forEach(r => { rec[r.receipt_document] = r.grand_total; }));
    const landed = Object.values(rec).reduce((a, b) => a + b, 0) + db['Landed Cost Taxes and Charges'].filter(c => lc.some(v => v.name === c.parent)).reduce((a, c) => a + c.base_amount, 0);
    H.assert.equal((await t.kpiVal(4)).replace(/\s/g, ''), money(landed) + 'SAR'); H.ok('landed cost counts each receipt once and leaves out the manufacturing-only voucher (' + money(landed) + ')');
    const out = db['Purchase Invoice'].filter(x => SAR.includes(x.company) && x.posting_date >= Y0).reduce((a, x) => a + x.outstanding_amount, 0);
    H.assert.equal((await t.kpiVal(5)).replace(/\s/g, ''), money(out) + 'SAR'); H.assert.match(await t.$('[data-ref="banner"]').innerText(), /not included: DM Dubai \(AED\)/); H.ok('supplier outstanding in SAR only; the AED company is named, not added');
    const allPo = db['Purchase Order'].filter(p => SAR.includes(p.company) && p.per_received < 100 && !['Closed', 'Completed'].includes(p.status));
    const hold = allPo.filter(p => p.custom_customs_status !== 'Cleared' && VER.some(k => p[k] === 'Not Matching')).length;
    const pastEta = allPo.filter(p => SHIPPED.filter(s => s !== 'Delivered').includes(p.custom_shipment_status) && p.custom_estimated_arrival_time && p.custom_estimated_arrival_time < TODAY && p.custom_customs_status !== 'Cleared').length;
    const soon = allPo.filter(p => p.custom_estimated_arrival_time && p.custom_estimated_arrival_time >= TODAY && p.custom_estimated_arrival_time <= add(TODAY, 7) && p.custom_customs_status !== 'Cleared').length;
    const inv = db['Purchase Invoice'].filter(x => SAR.includes(x.company) && x.outstanding_amount > 0 && x.due_date < TODAY).length;
    const nost = allPo.filter(p => p.custom_supplier_type === 'Foreign' && !p.custom_shipment_status).length, P = hold + pastEta + soon + inv + nost;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = not matching + past ETA (last year included) + arriving in 7 days + overdue invoices + foreign without status (' + P + ')');
  },
  interactions: async (t, H, db) => {
    const Sh = ship(db);
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('.dms-ov-kpis .dms-kpi[data-v="go:customs:hold"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_cus"]').innerText(), new RegExp('\\b' + Sh.filter(p => p.hold && !p.cleared).length + ' rows')); H.ok('holds card opens customs filtered to “not matching”');
    H.assert.match(await t.$('[data-tbl="t_docs"]').innerText(), /Commercial invoice[\s\S]*BL \/ AWB[\s\S]*\/6/); H.assert.match(await t.$('[data-ref="content"]').innerText(), /With attachments\s*\d+/); H.ok('document compliance panel with the six ERP-recorded documents and attachments');
    await t.$('[data-act="tab"][data-v="ship"]').click(); await t.idle(); await t.$('[data-act="qf"][data-v="ship:delayed"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_ship"]').innerText(), new RegExp('\\b' + Sh.filter(p => p.delayed).length + ' rows')); H.assert.match(await t.$('[data-tbl="t_ship"]').innerText(), /MSKU\d+|BL /); H.ok('delayed chip and container / BL from Shipping Documents');
    await t.$('[data-act="tab"][data-v="grn"]').click(); await t.idle();
    const lines = db['Purchase Order'].filter(p => SAR.includes(p.company) && p.transaction_date >= Y0).length;
    H.assert.match(await t.$('[data-tbl="t_grn"]').innerText(), new RegExp('\\b' + lines + ' rows')); H.ok('receiving lists every PO line in scope (' + lines + ')');
    await t.$('[data-act="tab"][data-v="landed"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Manufacturing operating-cost vouchers excluded: 1/); H.assert.match(await t.$('[data-tbl="t_lcv"]').innerText(), /\b3 rows/); H.ok('landed cost tab: 3 vouchers, manufacturing voucher excluded and said so');
    await t.$('[data-act="tab"][data-v="pay"]').click(); await t.idle(); await t.$('[data-act="qf"][data-v="pay:over"]').click(); await t.idle();
    const over = db['Purchase Invoice'].filter(x => SAR.includes(x.company) && x.outstanding_amount > 0 && x.due_date < TODAY).length;
    H.assert.match(await t.$('[data-tbl="t_pi"]').innerText(), new RegExp('\\b' + over + ' rows[\\s\\S]*PUR-ORD-')); H.ok('overdue invoices with their linked PO (' + over + ')');
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="status"]').selectOption('__none'); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="ship"]').click(); await t.idle(); await t.$('[data-act="qf"][data-v="ship:"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_ship"]').innerText(), new RegExp('\\b' + ship(db, { status: '__none' }).length + ' rows')); H.ok('Shipment status “Not set” keeps shipments without a status');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  }
});
