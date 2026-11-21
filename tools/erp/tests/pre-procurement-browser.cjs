/* Browser test + screenshot QA for "03. Procurement & Supply Chain/Pre-Procurement" (on the DM kit).
   Fixture: two SAR companies and one AED company; purchase material requests (plus a Closed-workflow one, a non-purchase
   one and last year's open ones that must stay out of the period figures but count in actions pending); purchase orders
   including a USD order of a SAR company and AED orders that must never be summed with SAR. frappe.client.get is mocked
   for the document drill (items). */
const { run, fmt, money, TODAY, add, rng } = require('./dms-harness.cjs');
const COS = [{ name: 'DM Group KSA', default_currency: 'SAR' }, { name: 'DM Steel', default_currency: 'SAR' }, { name: 'DM Dubai', default_currency: 'AED' }];
const SUPS = [['SUP-001', 'Riyadh Steel Co', 'Raw Material'], ['SUP-002', 'Gulf Fasteners', 'Hardware'], ['SUP-003', 'Najd Timber', 'Raw Material'], ['SUP-004', 'Eastern Paints', 'Consumables'], ['SUP-005', 'Hail Logistics', 'Services'], ['SUP-006', 'Old Vendor LLC', 'Hardware']];
const MR_OPEN = ['Pending', 'Partially Ordered'], PO_OPEN = ['To Receive and Bill', 'To Receive'];
function build(quiet) {
  const R = rng(7), mr = [], po = [], items = {};
  const co = i => (i % 9 === 8 ? 'DM Dubai' : i % 2 ? 'DM Steel' : 'DM Group KSA');
  for (let i = 0; i < 46; i++) {
    const d = add(TODAY, -Math.floor(R() * 300)), st = quiet ? 'Ordered' : ['Pending', 'Partially Ordered', 'Ordered', 'Ordered', 'Stopped', 'Pending', 'Received'][i % 7], draft = !quiet && i % 11 === 5;
    mr.push({ name: 'MAT-MR-2026-' + String(i + 1).padStart(4, '0'), material_request_type: 'Purchase', workflow_state: draft ? 'Draft' : 'Approved', status: draft ? 'Draft' : st, docstatus: draft ? 0 : 1, transaction_date: d, schedule_date: quiet ? add(TODAY, 10) : add(d, 14 + (i % 4) * 10), company: co(i), per_ordered: st === 'Ordered' || st === 'Received' ? 100 : st === 'Partially Ordered' ? 40 : 0, per_received: st === 'Received' ? 100 : 0, owner: ['ali@dm.sa', 'sara@dm.sa', 'omar@dm.sa'][i % 3] });
  }
  mr.push({ name: 'MAT-MR-2026-9001', material_request_type: 'Purchase', workflow_state: 'Closed', status: 'Pending', docstatus: 1, transaction_date: add(TODAY, -40), schedule_date: add(TODAY, -20), company: 'DM Group KSA', per_ordered: 0, per_received: 0, owner: 'ali@dm.sa' });
  mr.push({ name: 'MAT-MR-2026-9002', material_request_type: 'Material Transfer', workflow_state: 'Approved', status: 'Pending', docstatus: 1, transaction_date: add(TODAY, -30), schedule_date: add(TODAY, -10), company: 'DM Group KSA', per_ordered: 0, per_received: 0, owner: 'ali@dm.sa' });
  if (!quiet) { mr.push({ name: 'MAT-MR-2025-0777', material_request_type: 'Purchase', workflow_state: 'Approved', status: 'Pending', docstatus: 1, transaction_date: '2025-10-02', schedule_date: '2025-10-20', company: 'DM Steel', per_ordered: 0, per_received: 0, owner: 'omar@dm.sa' }); }
  for (let i = 0; i < 38; i++) {
    const d = add(TODAY, -Math.floor(R() * 300)), s = SUPS[i % 5], c = co(i + 1), draft = !quiet && i % 12 === 7, st = quiet ? 'Completed' : draft ? 'Draft' : ['To Receive and Bill', 'To Receive', 'Completed', 'To Bill', 'Completed', 'On Hold'][i % 6];
    const cur = c === 'DM Dubai' ? 'AED' : i === 3 ? 'USD' : 'SAR', gt = Math.round(5000 + R() * 180000), rate = cur === 'USD' ? 3.75 : 1;
    const p = { name: 'PUR-ORD-2026-' + String(i + 1).padStart(4, '0'), supplier: s[0], supplier_name: s[1], status: st, docstatus: draft ? 0 : 1, transaction_date: d, schedule_date: quiet ? add(TODAY, 20) : add(d, 21 + (i % 3) * 15), grand_total: gt, base_grand_total: gt * rate, currency: cur, per_received: st === 'Completed' || st === 'To Bill' ? 100 : st === 'To Receive' ? 30 : 0, per_billed: st === 'Completed' ? 100 : 0, company: c };
    po.push(p); items[p.name] = [{ item_code: 'STL-' + (100 + i), item_name: 'Steel tube 48mm', qty: 10 + i, uom: 'Nos', received_qty: p.per_received ? 10 + i : 0, schedule_date: p.schedule_date, rate: gt / (10 + i), amount: gt }];
  }
  if (!quiet) { po.push({ name: 'PUR-ORD-2025-0555', supplier: 'SUP-002', supplier_name: 'Gulf Fasteners', status: 'To Receive and Bill', docstatus: 1, transaction_date: '2025-09-01', schedule_date: '2025-09-30', grand_total: 12000, base_grand_total: 12000, currency: 'SAR', per_received: 0, per_billed: 0, company: 'DM Group KSA' }); }
  mr.forEach(m => { items[m.name] = [{ item_code: 'PNT-01', item_name: 'Primer grey', qty: 25, uom: 'Ltr', ordered_qty: m.per_ordered ? 25 * m.per_ordered / 100 : 0, schedule_date: m.schedule_date }]; });
  return { Company: COS.map(c => Object.assign({}, c)), 'Material Request': mr, 'Purchase Order': po, Supplier: SUPS.map(s => ({ name: s[0], supplier_name: s[1], supplier_group: s[2], disabled: s[0] === 'SUP-006' ? 1 : 0 })), items, gets: [] };
}
const methods = { 'frappe.client.get': (a, db) => { db.gets.push(a); const d = (db['Material Request'].concat(db['Purchase Order'])).find(x => x.name === a.name); if (!d) { const e = new Error('not found'); e.status = 404; throw e; } return Object.assign({ doctype: a.doctype, owner: 'ali@dm.sa' }, d, { items: db.items[a.name] || [] }); } };
const Y0 = TODAY.slice(0, 4) + '-01-01';
const SARCOS = ['DM Group KSA', 'DM Steel'];
const scopeMr = db => db['Material Request'].filter(r => r.material_request_type === 'Purchase' && r.workflow_state !== 'Closed' && r.docstatus < 2 && SARCOS.includes(r.company) && r.transaction_date >= Y0 && r.transaction_date <= TODAY);
const scopePo = (db, cos) => db['Purchase Order'].filter(r => r.docstatus < 2 && (cos || SARCOS).includes(r.company) && r.transaction_date >= Y0 && r.transaction_date <= TODAY);
const mrOpen = r => r.docstatus === 1 && MR_OPEN.includes(r.status), mrOver = r => mrOpen(r) && r.schedule_date < TODAY;
const poOpen = r => r.docstatus === 1 && PO_OPEN.includes(r.status), poOver = r => poOpen(r) && r.schedule_date < TODAY && r.per_received < 100;
run({
  slug: 'pre-procurement', folder: '03. Procurement & Supply Chain/Pre-Procurement', build: () => build(false), methods,
  figures: async (t, H, db) => {
    const mr = scopeMr(db), po = scopePo(db), sub = po.filter(r => r.docstatus === 1), val = sub.reduce((a, r) => a + r.base_grand_total, 0);
    H.assert.equal(await t.kpiVal(0), fmt(mr.filter(mrOpen).length)); H.assert.equal(await t.kpiVal(1), fmt(mr.filter(mrOver).length));
    H.assert.equal(await t.kpiVal(2), fmt(po.filter(poOpen).length)); H.assert.equal(await t.kpiVal(3), fmt(po.filter(poOver).length)); H.ok('open / overdue MRs and POs: purpose Purchase, workflow not Closed, SAR companies, issued this year');
    H.assert.equal((await t.kpiVal(4)).replace(/\s/g, ''), money(val) + 'SAR'); H.ok('PO value = submitted SAR-company POs in company currency (USD order counted at its base amount, AED never added): ' + money(val));
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /Companies in another currency are not included: DM Dubai \(AED\)/); H.ok('banner names the AED company left out');
    const all = db['Material Request'].filter(r => r.material_request_type === 'Purchase' && r.workflow_state !== 'Closed' && SARCOS.includes(r.company)), allPo = db['Purchase Order'].filter(r => SARCOS.includes(r.company));
    const P = allPo.filter(poOver).length + all.filter(mrOver).length + all.filter(r => r.docstatus === 0).length + allPo.filter(r => r.docstatus === 0).length + allPo.filter(r => r.docstatus === 1 && r.status === 'On Hold').length;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending covers all open documents, last year included (' + P + ')');
  },
  interactions: async (t, H, db) => {
    const mr = scopeMr(db);
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('.dms-ov-kpis .dms-kpi[data-v="go:mr:over"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_mr"]').innerText(), new RegExp('\\b' + mr.filter(mrOver).length + ' rows')); H.ok('overdue MR card opens the MR tab filtered (' + mr.filter(mrOver).length + ')');
    await t.$('[data-tbl="t_mr"] [data-act="doc"]').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerText(), /Items \(1\)[\s\S]*Primer grey/); H.assert.equal(db.gets.pop().doctype, 'Material Request'); H.ok('document drill loads the record and its items');
    await t.page.keyboard.press('Escape');
    await t.$('[data-act="kpi"][data-v="mrage:3"]').click(); await t.idle();
    const old = mr.filter(r => mrOpen(r) && (Date.parse(TODAY) - Date.parse(r.transaction_date)) / 864e5 > 60).length;
    H.assert.match(await t.$('[data-tbl="t_mr"]').innerText(), new RegExp('\\b' + old + ' rows')); H.ok('aging bar filters open MRs older than 60 days (' + old + ')');
    await t.$('[data-act="clrmr"]').click(); await t.idle();
    /* purchase orders: USD order shows both amounts */
    await t.$('[data-act="tab"][data-v="po"]').click(); await t.idle();
    await t.$('[data-tbl="t_po"] input[data-tq]').fill('PUR-ORD-2026-0004'); await t.page.waitForTimeout(400);
    H.assert.match(await t.$('[data-tbl="t_po"] tbody').innerText(), /USD[\s\S]*SAR/); H.ok('foreign-currency PO shows its own and its company-currency amount');
    await t.$('[data-tbl="t_po"] input[data-tq]').fill(''); await t.page.waitForTimeout(400);
    await t.$('[data-act="kpi"][data-v="pos:On Hold"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_po"]').innerText(), new RegExp('\\b' + scopePo(db).filter(r => r.status === 'On Hold' && r.docstatus === 1).length + ' rows')); H.ok('status bar filters the PO table');
    /* suppliers: supplier drill, then a stacked document drill with Back */
    await t.$('[data-act="tab"][data-v="sup"]').click(); await t.idle();
    await t.$('[data-tbl="t_sup"] [data-act="kpi"][data-v="sup:SUP-001"]').click(); await t.$('.dms-modal').waitFor();
    const n1 = scopePo(db).filter(r => r.supplier === 'SUP-001').length;
    H.assert.match(await t.$('.dms-modal').innerText(), new RegExp('Riyadh Steel Co[\\s\\S]*Orders\\s*' + n1)); await t.$('.dms-modal [data-act="doc"]').first().click(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerText(), /Steel tube 48mm/); await t.$('[data-act="ovback"]').click(); H.assert.match(await t.$('.dms-modal').innerText(), /Riyadh Steel Co/); H.ok('supplier drill lists its POs; a PO opens on top with Back');
    await t.page.keyboard.press('Escape');
    /* company filter: the AED company on its own, in AED */
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('DM Dubai'); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    const aed = scopePo(db, ['DM Dubai']).filter(r => r.docstatus === 1).reduce((a, r) => a + r.base_grand_total, 0);
    H.assert.equal((await t.kpiVal(4)).replace(/\s/g, ''), money(aed) + 'AED'); H.assert.equal(await t.$('[data-ref="banner"]').innerText().catch(() => ''), ''); H.ok('one AED company: values in AED, no exclusion banner');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    /* action category opens ERPNext with the same filters */
    await t.page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
    await t.$('.dms-acat[data-v="cli:a_poo"], [data-act="kpi"][data-v="cli:a_poo"]').first().click(); await t.$('.dms-modal').waitFor();
    await t.$('[data-act="erp"]').click(); const u = decodeURIComponent(await t.page.evaluate(() => window.__opened.pop()));
    H.assert.match(u, /^\/app\/purchase-order\?.*status=\["in",\["To Receive and Bill","To Receive"\]\].*schedule_date=\["<","2026-11-17"\]/); H.ok('“Open all in ERPNext” carries the overdue-delivery filters');
    await t.page.keyboard.press('Escape');
  },
  quiet: () => build(true)
});
