/* Browser test + screenshot QA for "04. Finance & Credit Control/Accounts Payable" (on the DM kit).
   The native "Accounts Payable" and "Accounts Payable Summary" reports are mocked from a seeded ledger of Purchase
   Invoices and supplier Payment Entries (open balances, advances as negative rows, native range columns by due date);
   lists go through the get_list mock. Expected figures are computed from the raw rows. */
const { run, money, fmt, TODAY, add, rng } = require('./dms-harness.cjs');
const SAR = ['Alpha Contracting', 'Alpha Trading'], AED = 'Alpha Gulf FZE';
const days = d => Math.round((Date.parse(TODAY) - Date.parse(d)) / 864e5);

function build() {
  const r = rng(9), pick = a => a[Math.floor(r() * a.length)];
  const db = { Company: [{ name: SAR[0], default_currency: 'SAR' }, { name: SAR[1], default_currency: 'SAR' }, { name: AED, default_currency: 'AED' }], 'Supplier Group': [{ name: 'Raw Material' }, { name: 'Services' }, { name: 'Logistics' }], Supplier: [], 'Purchase Invoice': [], 'Payment Entry': [] };
  ['Steel Co', 'Gulf Cement', 'Najd Transport', 'Red Sea Paints', 'Eastern Timber', 'Jeddah Glass', 'Sharjah Cables', 'Intra DM Fabrication'].forEach((n, i) => db.Supplier.push({ name: 'SUP-' + (i + 1), supplier_name: n, supplier_group: ['Raw Material', 'Services', 'Logistics'][i % 3], is_internal_supplier: i === 7 ? 1 : 0, country: i === 6 ? 'UAE' : 'Saudi Arabia', disabled: 0, default_currency: i === 6 ? 'AED' : 'SAR', custom_type_of_supplier_: i === 6 ? 'Foreign' : i === 5 ? null : 'Local' }));
  for (let i = 0; i < 220; i++) {
    const s = pick(db.Supplier), co = r() < 0.12 ? AED : pick(SAR), post = add(TODAY, -Math.floor(Math.pow(r(), 0.7) * 420)), due = i % 37 === 0 ? null : add(post, pick([30, 45, 60, 90])), gt = Math.round(3000 + r() * 160000), p = r();
    const out = p < 0.4 ? 0 : p < 0.55 ? Math.round(gt * 0.5) : gt, ds = r() < 0.04 ? 2 : r() < 0.03 ? 0 : 1;
    db['Purchase Invoice'].push({ name: 'ACC-PINV-' + String(i + 1).padStart(4, '0'), supplier: s.name, supplier_name: s.supplier_name, company: co, posting_date: post, due_date: due, grand_total: gt, base_grand_total: gt, outstanding_amount: out, party_account_currency: co === AED ? 'AED' : 'SAR', conversion_rate: 1, currency: co === AED ? 'AED' : 'SAR', status: ds !== 1 ? (ds === 2 ? 'Cancelled' : 'Draft') : out === 0 ? 'Paid' : out < gt ? 'Partly Paid' : (due && due < TODAY ? 'Overdue' : 'Unpaid'), is_return: 0, bill_no: 'B' + i, docstatus: ds });
  }
  for (let i = 0; i < 160; i++) {
    const s = pick(db.Supplier), co = r() < 0.12 ? AED : pick(SAR), d = add(TODAY, -Math.floor(r() * 400)), a = Math.round(2000 + r() * 90000), ds = i % 23 === 0 ? 0 : 1;
    db['Payment Entry'].push({ name: 'ACC-PAY-' + String(i + 1).padStart(4, '0'), payment_type: 'Pay', party_type: 'Supplier', party: s.name, party_name: s.supplier_name, company: co, posting_date: d, base_paid_amount: a, unallocated_amount: i % 9 === 0 ? Math.round(a * 0.4) : 0, mode_of_payment: pick(['Bank Transfer', 'Cheque']), reference_no: 'R' + i, workflow_state: ds ? 'Approved' : pick(['Pending Finance Manager', 'Pending CEO']), docstatus: ds, owner: 'ap@example.com' });
  }
  return db;
}
/* The native report: open invoices (positive) and unallocated payments (negative advances) as of the report date. */
function apReport(db, co, asof) {
  const sup = id => db.Supplier.find(s => s.name === id) || {};
  const rows = db['Purchase Invoice'].filter(x => x.docstatus === 1 && x.company === co && x.outstanding_amount && x.posting_date <= asof).map(x => ({ party: x.supplier, supplier_name: x.supplier_name, supplier_group: sup(x.supplier).supplier_group, voucher_type: 'Purchase Invoice', voucher_no: x.name, posting_date: x.posting_date, due_date: x.due_date, bill_no: x.bill_no, invoiced: x.grand_total, paid: x.grand_total - x.outstanding_amount, credit_note: 0, outstanding: x.outstanding_amount }))
    .concat(db['Payment Entry'].filter(x => x.docstatus === 1 && x.company === co && x.unallocated_amount && x.posting_date <= asof).map(x => ({ party: x.party, supplier_name: x.party_name, supplier_group: sup(x.party).supplier_group, voucher_type: 'Payment Entry', voucher_no: x.name, posting_date: x.posting_date, due_date: x.posting_date, bill_no: '', invoiced: 0, paid: x.unallocated_amount, credit_note: 0, outstanding: -x.unallocated_amount })));
  rows.forEach(x => { const a = Math.round((Date.parse(asof) - Date.parse(x.due_date || x.posting_date)) / 864e5); ['range1', 'range2', 'range3', 'range4', 'range5'].forEach(k => { x[k] = 0; }); if (a > 0) { x[a <= 30 ? 'range1' : a <= 60 ? 'range2' : a <= 90 ? 'range3' : a <= 120 ? 'range4' : 'range5'] = x.outstanding; } });
  return rows;
}
const methods = {
  'frappe.desk.query_report.run': (a, db) => {
    const f = a.filters, rows = apReport(db, f.company, f.report_date);
    if (a.report_name === 'Accounts Payable') { return { columns: [], result: rows }; }
    const m = {}; rows.forEach(x => { m[x.party] = (m[x.party] || 0) + x.outstanding; });
    return { columns: [], result: Object.keys(m).map(k => ({ party: k, outstanding: m[k], advance: 0 })) };
  }
};
run({
  slug: 'accounts-payable', folder: '04. Finance & Credit Control/Accounts Payable', build, methods,
  figures: async (t, H, db) => {
    const rows = SAR.flatMap(c => apReport(db, c, TODAY)), net = rows.reduce((s, x) => s + x.outstanding, 0), over = rows.filter(x => x.outstanding > 0 && days(x.due_date || x.posting_date) > 0).reduce((s, x) => s + x.outstanding, 0);
    H.assert.equal(await t.kpiVal(0), money(net) + 'SAR'); H.ok('total payables = SAR companies from the native report (' + money(net) + '; AED company not added)');
    H.assert.equal(await t.kpiVal(1), money(over) + 'SAR'); H.ok('overdue = fixture');
    const cr = rows.filter(x => x.outstanding < 0).reduce((s, x) => s + x.outstanding, 0); H.assert.equal(await t.kpiVal(3), money(cr) + 'SAR'); H.ok('advances and credits shown apart (' + money(cr) + ')');
    const pe = db['Payment Entry'].filter(x => x.docstatus === 1 && SAR.includes(x.company) && x.posting_date >= '2026-11-01' && x.posting_date <= TODAY).reduce((s, x) => s + x.base_paid_amount, 0);
    H.assert.equal(await t.kpiVal(5), money(pe) + 'SAR'); H.ok('payments made this month = fixture');
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /Not included \(other currency\): Alpha Gulf FZE \(AED\)/); H.ok('banner names the AED company left out');
    const long = rows.filter(x => x.outstanding > 0 && days(x.due_date || x.posting_date) > 90).length, d7 = rows.filter(x => x.outstanding > 0 && days(x.due_date || x.posting_date) <= 0 && days(x.due_date || x.posting_date) >= -7).length, od = rows.filter(x => x.outstanding > 0 && days(x.due_date || x.posting_date) > 0 && days(x.due_date || x.posting_date) <= 90).length;
    const wf = db['Payment Entry'].filter(x => x.docstatus === 0 && SAR.includes(x.company)).length, un = db['Payment Entry'].filter(x => x.docstatus === 1 && SAR.includes(x.company) && x.unallocated_amount > 0.01).length;
    const dueQ = rows.filter(x => x.voucher_type === 'Purchase Invoice' && !x.due_date).length;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(long + d7 + od + wf + un + dueQ)); H.ok('pending = >90 + due in 7 + overdue ≤90 + awaiting approval + unallocated + missing due dates (' + (long + d7 + od + wf + un + dueQ) + ')');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('.dms-split-row').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    H.assert.ok(await t.$('.dms-modal .dms-facts').count() === 1 && await t.$('.dms-modal [data-tbl="drill_docs"] tbody tr').count() > 0 && await t.$('.dms-modal [data-tbl="drill"] tbody tr').count() > 0); H.ok('supplier panel: facts, open documents and latest payments');
    await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="ageing"]').click(); await t.idle();
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Aged total equals the reported outstanding\.[\s\S]*Buckets above 30 days match the native/); H.ok('ageing reconciles with the native report buckets');
    await t.$('[data-act="tab"][data-v="invoices"]').click(); await t.idle();
    const open = db['Purchase Invoice'].filter(x => x.docstatus === 1 && SAR.includes(x.company) && x.status === 'Overdue').length;
    await t.$('.dms-kpi[data-v="pi:Overdue"]').click(); await t.idle(); H.assert.match(await t.$('[data-tbl="t_pi"]').innerText(), new RegExp('^' + fmt(open) + ' records')); H.ok('Overdue invoices card filters the server table (' + open + ')');
    await t.$('[data-act="tab"][data-v="exceptions"]').click(); await t.idle();
    const before = await t.$('[data-tbl="t_ex"] .dms-sm').first().innerText();
    await t.$('[data-rule="warn"]').fill('30'); await t.$('[data-rule="warn"]').dispatchEvent('change'); await t.idle(); await t.page.waitForTimeout(100);
    H.assert.match(await t.$('[data-tbl="t_ex"]').innerText(), /Overdue balance > 30 days/); H.assert.doesNotMatch(await t.$('[data-tbl="t_ex"]').innerText(), /> 90 days/); H.ok('exception rules can be edited and re-evaluate the register');
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption(AED); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle(); H.assert.match(await t.kpiVal(0), /AED$/); H.ok('choosing the AED company shows its payables in AED');
    await t.$('.dms-chip-x').click(); await t.idle();
  },
  quiet: () => { const db = build(); db['Purchase Invoice'] = []; db['Payment Entry'] = []; return db; }
});
