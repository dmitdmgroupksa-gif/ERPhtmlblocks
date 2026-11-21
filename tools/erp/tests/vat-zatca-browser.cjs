/* Browser test + screenshot QA for "04. Finance & Credit Control/VAT & ZATCA Compliance" (on the DM kit).
   get_list is mocked over seeded Sales / Purchase Invoices (ZATCA statuses, credit notes, zero-VAT and wrong-rate lines),
   VAT Summary Forms and a WHT ledger (Account + GL Entry); the native "DM KSA VAT Report" is mocked from the same
   invoices, except that it shows no VAT for Beta Industrial (a company the report does not cover).
   get_balance_on is computed from the GL entries. Expected figures are computed here from the raw rows. */
const { run, money, fmt, TODAY, add, rng } = require('./dms-harness.cjs');
const CO = [
  { name: 'Alpha Contracting', abbr: 'AC', tax_id: '300000000000003', default_currency: 'SAR' },
  { name: 'Alpha Trading', abbr: 'AT', tax_id: '300000000000003', default_currency: 'SAR' },
  { name: 'Beta Industrial', abbr: 'BI', tax_id: '311111111111113', default_currency: 'SAR' },
  { name: 'Alpha Gulf FZE', abbr: 'AG', tax_id: '', default_currency: 'AED' }
];
const SAR = CO.filter(c => c.default_currency === 'SAR').map(c => c.name), M0 = '2026-11-01', M1 = '2026-11-30';
const ST = ['Cleared', 'Cleared', 'Cleared', 'Cleared with warnings', 'Reported', 'Reported', 'Reported with warnings', 'Pending', 'Rejected', 'Overdue', 'Draft', null];
function build() {
  const r = rng(71), pick = a => a[Math.floor(r() * a.length)];
  const db = { Company: CO.map(c => Object.assign({}, c)), 'Sales Invoice': [], 'Purchase Invoice': [], 'VAT Summary Form': [], Account: [], 'GL Entry': [], Supplier: [] };
  for (let i = 0; i < 420; i++) {
    const co = r() < 0.1 ? 'Alpha Gulf FZE' : pick(SAR), old = i % 9 === 0, pd = old ? add(TODAY, -40 - Math.floor(r() * 330)) : add(TODAY, -Math.floor(r() * 75));
    const ret = i % 17 === 0 ? 1 : 0, net = Math.round((ret ? -1 : 1) * (800 + r() * 40000)), st = old ? pick(['Pending', 'Draft', 'Cleared', 'Rejected']) : pick(ST);
    let tax = Math.round(net * 0.15 * 100) / 100; if (i % 23 === 0 && !ret) { tax = 0; } else if (i % 29 === 0 && !ret) { tax = Math.round(net * 0.05 * 100) / 100; }
    const ds = i % 41 === 0 ? 2 : i % 37 === 0 ? 0 : 1, time = pd + ' 10:15:00';
    db['Sales Invoice'].push({ name: 'SINV-' + String(i + 1).padStart(4, '0'), customer: 'CUST-' + (i % 12), customer_name: 'Customer ' + (i % 12), company: co, posting_date: pd, creation: time, is_return: ret, return_against: ret && i % 34 !== 0 ? 'SINV-0001' : null,
      base_net_total: net, base_total_taxes_and_charges: tax, base_grand_total: Math.round((net + tax) * 100) / 100, zatca_status: ds === 1 ? st : (ds === 2 ? 'Cancelled' : null), docstatus: ds,
      custom_clearing_to_zatka_time: /^Cleared/.test(st) && i % 13 ? time : null, custom_reporting_to_zatka_time: /^Reported/.test(st) ? time : null, uuid: st && i % 19 ? 'u-' + i : null,
      customer_vat_id: i % 5 ? '3' + String(i).padStart(14, '0') : null, is_internal_customer: i % 31 === 0 ? 1 : 0, owner: 'acc' + (i % 3) + '@example.com',
      custom_zatca_warnings: /warnings/.test(st || '') ? (i % 2 ? '<p>BR-KSA-F-06 buyer address</p>' : '<p>BR-KSA-08 buyer VAT format</p>') : null });
  }
  for (let i = 0; i < 160; i++) {
    const co = r() < 0.1 ? 'Alpha Gulf FZE' : pick(SAR), net = Math.round(500 + r() * 30000), ret = i % 21 === 0 ? 1 : 0, n = ret ? -net : net;
    db['Purchase Invoice'].push({ name: 'PINV-' + i, company: co, posting_date: add(TODAY, -Math.floor(r() * 75)), is_return: ret, base_net_total: n, base_total_taxes_and_charges: Math.round(n * 0.15 * 100) / 100, docstatus: i % 25 === 0 ? 0 : 1 });
  }
  db['VAT Summary Form'] = [{ name: 'VSF-2026-10', from_date: '2026-10-01', to_date: '2026-10-31', docstatus: 1, modified: '2026-11-05 09:00:00' }, { name: 'VSF-2026-11', from_date: M0, to_date: M1, docstatus: 0, modified: '2026-11-16 09:00:00' }];
  /* withholding tax ledger */
  db.Account = [{ name: 'Withholding Tax Payable - AC', company: 'Alpha Contracting', account_type: 'Tax', root_type: 'Liability', is_group: 0, disabled: 0 }, { name: 'WHT Payable - AT', company: 'Alpha Trading', account_type: 'Tax', root_type: 'Liability', is_group: 0, disabled: 0 },
    { name: 'SNB - AC', company: 'Alpha Contracting', account_type: 'Bank', root_type: 'Asset', is_group: 0, disabled: 0 }, { name: 'Rajhi - AT', company: 'Alpha Trading', account_type: 'Bank', root_type: 'Asset', is_group: 0, disabled: 0 },
    { name: 'Creditors - AC', company: 'Alpha Contracting', account_type: 'Payable', root_type: 'Liability', is_group: 0, disabled: 0 }, { name: 'Creditors - AT', company: 'Alpha Trading', account_type: 'Payable', root_type: 'Liability', is_group: 0, disabled: 0 }];
  db.Supplier = [{ name: 'SUP-1', supplier_name: 'Gulf Consulting' }, { name: 'SUP-2', supplier_name: 'Euro Software GmbH' }, { name: 'SUP-3', supplier_name: 'Cairo Design' }];
  let g = 0; const gle = (v, acc, co, d, dr, cr, pt, p) => db['GL Entry'].push({ name: 'GLE-' + (++g), voucher_type: 'Journal Entry', voucher_no: v, account: acc, company: co, posting_date: d, debit: dr, credit: cr, party_type: pt || null, party: p || null, is_cancelled: 0, creation: d + ' 08:00:' + String(g % 60).padStart(2, '0') });
  for (let i = 0; i < 40; i++) {
    const co = i % 3 ? 'Alpha Contracting' : 'Alpha Trading', ab = co === 'Alpha Contracting' ? 'AC' : 'AT', wht = co === 'Alpha Contracting' ? 'Withholding Tax Payable - AC' : 'WHT Payable - AT', bank = ab === 'AC' ? 'SNB - AC' : 'Rajhi - AT';
    const d = add(TODAY, -Math.floor(r() * 120)), amt = Math.round(200 + r() * 4000), sup = 'SUP-' + (1 + (i % 3)), v = 'JV-W' + i;
    gle(v, wht, co, d, 0, amt); gle(v, 'Creditors - ' + ab, co, d, amt, 0, 'Supplier', sup);
    if (i % 2 === 0) { const pdx = add(d, 10) > TODAY ? TODAY : add(d, 10), pv = 'JV-P' + i; gle(pv, wht, co, pdx, amt, 0); gle(pv, bank, co, pdx, 0, amt); }
    else if (i % 7 === 0) { const av = 'JV-A' + i; gle(av, wht, co, d, Math.round(amt / 4), 0); gle(av, 'Creditors - ' + ab, co, d, 0, Math.round(amt / 4), 'Supplier', sup); }
  }
  return db;
}
const sarIn = x => SAR.includes(x.company), inM = x => x.posting_date >= M0 && x.posting_date <= M1, sub = x => x.docstatus === 1;
const sumf = (rows, f) => rows.reduce((s, x) => s + (+x[f] || 0), 0);
function ksa(db, co, from, to) {
  const si = db['Sales Invoice'].filter(x => x.company === co && sub(x) && x.posting_date >= from && x.posting_date <= to), pi = db['Purchase Invoice'].filter(x => x.company === co && sub(x) && x.posting_date >= from && x.posting_date <= to);
  const covered = co !== 'Beta Industrial', sNet = covered ? sumf(si, 'base_net_total') : 0, sVat = covered ? sumf(si, 'base_total_taxes_and_charges') : 0, pNet = covered ? sumf(pi, 'base_net_total') : 0, pVat = covered ? sumf(pi, 'base_total_taxes_and_charges') : 0;
  const adj = covered ? sumf(si.filter(x => x.is_return), 'base_net_total') : 0;
  return [{ title: 'VAT on Sales', amount: null, vat_amount: null }, { title: 'Standard rated sales', amount: sNet, adjustment: adj, vat_amount: sVat }, { title: 'Grand Total', amount: sNet, adjustment: adj, vat_amount: sVat },
    { title: 'VAT on Purchases', amount: null, vat_amount: null }, { title: 'Standard rated purchases', amount: pNet, adjustment: 0, vat_amount: pVat }, { title: 'Grand Total', amount: pNet, adjustment: 0, vat_amount: pVat }, { title: 'Difference', amount: null, vat_amount: sVat - pVat }];
}
const methods = {
  'frappe.desk.query_report.run': (a, db) => { if (a.report_name !== 'DM KSA VAT Report') { throw Object.assign(new Error('report'), { status: 417 }); } return { columns: [], result: ksa(db, a.filters.company, a.filters.from_date, a.filters.to_date) }; },
  'erpnext.accounts.utils.get_balance_on': (a, db) => db['GL Entry'].filter(x => x.account === a.account && !x.is_cancelled && x.posting_date <= a.date).reduce((s, x) => s + x.debit - x.credit, 0)
};
function preset(db, p) {
  const si = db['Sales Invoice'].filter(x => sarIn(x) && sub(x)), per = si.filter(inM);
  return { rejected_all: si.filter(x => ['Rejected', 'Overdue'].includes(x.zatca_status)), missing_uuid: per.filter(x => x.zatca_status && !x.uuid), cn_unresolved: si.filter(x => x.is_return && ['Pending', 'Draft', 'Rejected', 'Overdue'].includes(x.zatca_status)),
    stuck_draft: si.filter(x => x.zatca_status === 'Draft'), pending_all: si.filter(x => x.zatca_status === 'Pending'), zero_vat: per.filter(x => !x.is_return && x.base_net_total > 0 && x.base_total_taxes_and_charges === 0),
    cn_no_return: per.filter(x => x.is_return && !x.return_against), missing_buyer_vat: per.filter(x => x.zatca_status && !x.customer_vat_id) }[p];
}
const sarM = n => money(n) + 'SAR';
run({
  slug: 'vat-zatca', folder: '04. Finance & Credit Control/VAT & ZATCA Compliance', build, methods, frappe: { user_roles: ['Accounts Manager'] },
  figures: async (t, H, db) => {
    const rec = ['Alpha Contracting', 'Alpha Trading'], si = db['Sales Invoice'].filter(x => rec.includes(x.company) && sub(x) && inM(x)), pi = db['Purchase Invoice'].filter(x => rec.includes(x.company) && sub(x) && inM(x));
    const out = sumf(si, 'base_total_taxes_and_charges'), inp = sumf(pi, 'base_total_taxes_and_charges');
    H.assert.equal(await t.kpiVal(0), sarM(out)); H.ok('output VAT = reconciled companies only (' + money(out) + '; Beta Industrial not covered by the report, AED company out of scope)');
    H.assert.equal(await t.kpiVal(1), sarM(inp)); H.ok('input VAT = fixture (' + money(inp) + ')');
    H.assert.equal(await t.kpiVal(2), sarM(Math.abs(out - inp))); H.assert.match(await t.$('.dms-ov-kpis .dms-kpi').nth(2).innerText(), /Net VAT (Payable|Refundable)[\s\S]*Partial · 2\/3/); H.ok('net VAT labelled payable/refundable and marked partial 2/3');
    const zs = db['Sales Invoice'].filter(x => sarIn(x) && sub(x) && inM(x) && x.zatca_status), acc = zs.filter(x => /^(Cleared|Reported)/.test(x.zatca_status)).length, rej = zs.filter(x => ['Rejected', 'Overdue'].includes(x.zatca_status)).length;
    H.assert.equal(await t.kpiVal(3), fmt(zs.length)); H.assert.equal(await t.kpiVal(4), fmt(acc)); H.assert.equal(await t.kpiVal(5), fmt(rej)); H.ok('ZATCA sent / accepted / rejected-or-overdue = fixture (' + zs.length + ' / ' + acc + ' / ' + rej + ')');
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /Not included \(other currency\): Alpha Gulf FZE \(AED\)/); H.ok('AED company named in the banner, not added to SAR totals');
    const P = ['rejected_all', 'missing_uuid', 'cn_unresolved', 'stuck_draft', 'pending_all', 'zero_vat', 'cn_no_return', 'missing_buyer_vat'].reduce((s, p) => s + preset(db, p).length, 0) + 1;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = 8 invoice categories + 1 unreconciled VAT return (' + P + ')');
    H.assert.match(await t.$('.dms-actpanel').innerText(), /Beta Industrial[\s\S]*VAT return|VAT return[\s\S]*Beta Industrial/); H.ok('unreconciled company listed in actions with a link to its VAT report');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="vat"]').click(); await t.idle();
    const vt = await t.$('[data-tbl="t_vat"]').innerText(); H.assert.match(vt, /Beta Industrial[\s\S]*Not covered by report/); H.assert.match(vt, /2\/3 companies verified/); H.ok('VAT returns: per-company verdicts, total over verified companies only');
    await t.$('[data-act="chip"][data-v="cmp:1"]').click(); await t.idle();
    const prev = db['Sales Invoice'].filter(x => x.company === 'Alpha Contracting' && sub(x) && x.posting_date >= '2026-10-01' && x.posting_date <= '2026-10-31'), pprev = db['Purchase Invoice'].filter(x => x.company === 'Alpha Contracting' && sub(x) && x.posting_date >= '2026-10-01' && x.posting_date <= '2026-10-31');
    const pn = sumf(prev, 'base_total_taxes_and_charges') - sumf(pprev, 'base_total_taxes_and_charges');
    H.assert.ok((await t.$('[data-tbl="t_vat"]').innerText()).includes(pn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))); H.ok('compare with the previous month adds the October net VAT (' + pn.toFixed(2) + ')');
    await t.$('[data-act="chip"][data-v="vview:groups"]').click(); await t.idle(); H.assert.match(await t.$('[data-tbl="t_grp"]').innerText(), /300000000000003[\s\S]*Alpha Contracting, Alpha Trading/); H.ok('VAT group view joins companies sharing a tax ID');
    await t.$('[data-act="tab"][data-v="zatca"]').click(); await t.idle();
    const rj = db['Sales Invoice'].filter(x => sarIn(x) && sub(x) && inM(x) && x.zatca_status === 'Rejected').length;
    await t.$('.dms-kpi[data-v="reg:|Rejected|"]').click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.match(await t.$('.dms-modal').innerText(), new RegExp(fmt(rj) + ' records')); H.assert.equal(await t.$('.dms-modal a[href^="/app/sales-invoice?"]').count(), 1); H.ok('Rejected card lists ' + rj + ' invoices with an ERPNext list link');
    await t.page.keyboard.press('Escape');
    H.assert.match(await t.$('[data-tbl="t_rej"]').innerText(), new RegExp('^' + fmt(preset(db, 'rejected_all').length) + ' records')); H.ok('rejected/overdue backlog covers all dates (' + preset(db, 'rejected_all').length + ')');
    await t.$('[data-act="loadwarn"]').click(); await t.idle(); H.assert.match(await t.$('[data-tbl="t_warn"]').innerText(), /BR-KSA-F-06 buyer address/); H.ok('warning texts load on demand, grouped');
    await t.$('[data-act="tab"][data-v="register"]').click(); await t.idle();
    await t.$('select[data-rs]').selectOption('Pending'); await t.idle();
    const pm = db['Sales Invoice'].filter(x => sarIn(x) && sub(x) && inM(x) && x.zatca_status === 'Pending').length;
    H.assert.match(await t.$('[data-tbl="t_reg"]').innerText(), new RegExp('^' + fmt(pm) + ' records')); H.ok('register status filter (' + pm + ' pending this month)');
    await t.$('[data-act="tab"][data-v="compliance"]').click(); await t.idle();
    await t.$('.dms-kpi[data-v="runrate"]').click(); await t.idle(); await t.page.waitForTimeout(150);
    const bad = db['Sales Invoice'].filter(x => sarIn(x) && sub(x) && inM(x) && !x.is_return && x.base_net_total > 0 && x.base_total_taxes_and_charges > 0 && Math.abs(x.base_total_taxes_and_charges - 0.15 * x.base_net_total) > 1 + 0.001 * x.base_net_total).length;
    H.assert.equal((await t.$('.dms-kpi[data-v="rate"] .dms-kpi-n, .dms-kpi:has-text("VAT not equal to 15%") .dms-kpi-n').first().innerText()).trim(), fmt(bad)); H.ok('15% rate scan finds ' + bad + ' invoices');
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /VSF-2026-11[\s\S]*Draft/); H.ok('VAT Summary Forms for the period shown as filing evidence (not proof of filing)');
    await t.$('[data-act="tab"][data-v="wht"]').click(); await t.idle();
    const whtA = ['Withholding Tax Payable - AC', 'WHT Payable - AT'], gl = db['GL Entry'].filter(x => whtA.includes(x.account) && x.posting_date >= M0 && x.posting_date <= TODAY);
    const cr = gl.reduce((s, x) => s + x.credit, 0), paidV = new Set(db['GL Entry'].filter(x => /^(SNB|Rajhi)/.test(x.account) && x.credit > 0).map(x => x.voucher_no)), paid = gl.filter(x => x.debit > 0 && paidV.has(x.voucher_no)).reduce((s, x) => s + x.debit, 0);
    const close = -db['GL Entry'].filter(x => whtA.includes(x.account) && x.posting_date <= TODAY).reduce((s, x) => s + x.debit - x.credit, 0);
    const kv = async i => (await t.$('[data-ref="content"] .dms-kpis .dms-kpi').nth(i).locator('.dms-kpi-n').innerText()).trim();
    H.assert.equal(await kv(0), sarM(cr)); H.assert.equal(await kv(1), sarM(paid)); H.assert.equal(await kv(2), sarM(close)); H.ok('WHT recorded / paid / GL balance = ledger (' + money(cr) + ' / ' + money(paid) + ' / ' + money(close) + ', reconciled to get_balance_on)');
    await t.$('select[data-wf="sup"]').selectOption('SUP-1'); await t.idle(); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Supplier filter active/); H.assert.equal(await kv(2), '—'); H.ok('supplier filter: balances shown as not available, not invented');
    await t.$('select[data-wf="sup"]').selectOption(''); await t.idle();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('Alpha Gulf FZE'); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    const ag = db['Sales Invoice'].filter(x => x.company === 'Alpha Gulf FZE' && sub(x) && inM(x));
    H.assert.equal(await t.kpiVal(0), money(sumf(ag, 'base_total_taxes_and_charges')) + 'AED'); H.assert.doesNotMatch(await t.$('[data-ref="banner"]').innerText(), /Not included/); H.ok('choosing the AED company shows its VAT in AED');
    await t.$('.dms-chip-x').first().click(); await t.idle();
  },
  quiet: () => { const db = build(); db['Sales Invoice'] = []; db['Purchase Invoice'] = []; return db; }
});
