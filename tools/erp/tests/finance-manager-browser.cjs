/* Browser test + screenshot QA for "04. Finance & Credit Control/Finance Manager Dashboard" (on the DM kit).
   get_list is mocked over a seeded ledger; the shared Server Script soa_workflow_api (finance_bootstrap, mine,
   request_finance) is mocked with the same validation rules. Expected figures come from the raw rows. */
const { run, money, fmt, TODAY, add, rng } = require('./dms-harness.cjs');
const SAR = ['Alpha Contracting', 'Alpha Trading'], AED = 'Alpha Gulf FZE';
function build() {
  const r = rng(21), pick = a => a[Math.floor(r() * a.length)], co = () => r() < 0.12 ? AED : pick(SAR);
  const db = { Company: [{ name: SAR[0], default_currency: 'SAR' }, { name: SAR[1], default_currency: 'SAR' }, { name: AED, default_currency: 'AED' }], Account: [], 'GL Entry': [], 'Sales Invoice': [], 'Purchase Invoice': [], 'Payment Entry': [], 'Journal Entry': [], REQ: [] };
  db.Company.forEach((c, i) => ['Bank', 'Cash'].forEach(tp => db.Account.push({ name: tp + ' - ' + i, company: c.name, account_type: tp, is_group: 0, disabled: 0 })));
  db.Account.push({ name: 'Debtors - 0', company: SAR[0], account_type: 'Receivable', is_group: 0, disabled: 0 });
  for (let i = 0; i < 300; i++) { const a = pick(db.Account); db['GL Entry'].push({ account: a.name, company: a.company, debit: r() < 0.6 ? Math.round(r() * 90000) : 0, credit: r() < 0.4 ? Math.round(r() * 60000) : 0, is_cancelled: r() < 0.05 ? 1 : 0, posting_date: add(TODAY, -Math.floor(r() * 300) + (i === 0 ? 400 : 0)) }); }
  const inv = (dt, n, party) => { for (let i = 0; i < n; i++) { const c = co(), post = add(TODAY, -Math.floor(r() * 300)), due = add(post, pick([30, 60])), gt = Math.round(4000 + r() * 120000), out = r() < 0.4 ? 0 : gt; db[dt].push({ name: (dt === 'Sales Invoice' ? 'SINV-' : 'PINV-') + i, [party]: party + ' ' + (i % 9), company: c, posting_date: post, due_date: due, outstanding_amount: out, party_account_currency: c === AED ? 'AED' : (r() < 0.04 ? 'USD' : 'SAR'), docstatus: r() < 0.05 ? 0 : 1, on_hold: dt === 'Purchase Invoice' && r() < 0.08 ? 1 : 0, sales_person: 'SP ' + (i % 4), bill_no: 'B' + i }); } };
  inv('Sales Invoice', 160, 'customer_name'); inv('Purchase Invoice', 140, 'supplier_name');
  for (let i = 0; i < 200; i++) { db['Payment Entry'].push({ name: 'PE-' + i, payment_type: pick(['Receive', 'Pay']), party_name: 'P' + (i % 11), company: co(), posting_date: add(TODAY, -Math.floor(r() * 70)), base_paid_amount: Math.round(1000 + r() * 80000), docstatus: i % 17 === 0 ? 0 : 1, workflow_state: i % 17 === 0 ? 'Pending CFO' : 'Approved', owner: 'ap@example.com' }); }
  for (let i = 0; i < 12; i++) { db['Journal Entry'].push({ name: 'JV-' + i, title: 'Accrual ' + i, voucher_type: 'Journal Entry', company: co(), posting_date: add(TODAY, -i * 3), total_debit: 5000 + i * 900, docstatus: i % 3 === 0 ? 0 : 1, owner: 'gl@example.com' }); }
  db.REQ = [{ name: 'REQ-1', kind: 'Advance Report', status: 'Pending', report_date: add(TODAY, -2), to_date: add(TODAY, -2), company: SAR[0], creation: add(TODAY, -2) + ' 10:00:00', review_note: '' }, { name: 'REQ-2', kind: 'Sales vs Target Report', status: 'Approved', report_date: '2026-10-01', to_date: '2026-10-31', company: '', creation: '2026-11-01 09:00:00', review_note: 'Sent' }, { name: 'REQ-3', kind: 'Customer Outstanding Report', status: 'Pending', report_date: TODAY, creation: TODAY + ' 08:00:00' }];
  return db;
}
const methods = { soa_workflow_api: (a, db) => {
  if (a.action === 'finance_bootstrap') { return { today: TODAY, companies: db.Company.map(c => c.name) }; }
  if (a.action === 'mine') { return { requests: db.REQ }; }
  if (a.action === 'request_finance') { if (a.date > TODAY || a.to_date < a.date) { throw Object.assign(new Error('Choose a valid date range through today.'), { status: 417 }); } const x = { name: 'REQ-' + (db.REQ.length + 1), kind: a.kind, status: 'Pending', report_date: a.date, to_date: a.to_date, company: a.company, creation: TODAY + ' 09:31:00', review_note: '' }; db.REQ.unshift(x); return x; }
  throw new Error('action ' + a.action);
} };
const sar = x => SAR.includes(x.company);
run({
  slug: 'finance-manager', folder: '04. Finance & Credit Control/Finance Manager Dashboard', build, methods,
  figures: async (t, H, db) => {
    const acc = db.Account.filter(a => ['Bank', 'Cash'].includes(a.account_type) && SAR.includes(a.company)).map(a => a.name);
    const cash = db['GL Entry'].filter(g => acc.includes(g.account) && !g.is_cancelled && g.posting_date <= TODAY).reduce((s, g) => s + g.debit - g.credit, 0);
    H.assert.equal(await t.kpiVal(0), money(cash) + 'SAR'); H.ok('cash & bank = GL of SAR-company bank/cash accounts (' + money(cash) + ')');
    const open = dt => db[dt].filter(x => x.docstatus === 1 && x.outstanding_amount > 0 && x.party_account_currency === 'SAR' && sar(x));
    const ar = open('Sales Invoice').reduce((s, x) => s + x.outstanding_amount, 0), ap = open('Purchase Invoice').reduce((s, x) => s + x.outstanding_amount, 0);
    H.assert.equal(await t.kpiVal(1), money(ar) + 'SAR'); H.assert.equal(await t.kpiVal(2), money(ap) + 'SAR'); H.ok('receivables and payables = SAR party accounts in SAR companies');
    const pe = type => db['Payment Entry'].filter(x => x.docstatus === 1 && x.payment_type === type && sar(x) && x.posting_date >= '2026-11-01' && x.posting_date <= TODAY).reduce((s, x) => s + x.base_paid_amount, 0);
    H.assert.equal(await t.kpiVal(3), money(pe('Receive')) + 'SAR'); H.assert.equal(await t.kpiVal(4), money(pe('Pay')) + 'SAR'); H.assert.equal(await t.kpiVal(5), money(pe('Receive') - pe('Pay')) + 'SAR'); H.ok('collected, paid out and net cash flow for this month');
    const n = open('Sales Invoice').filter(x => x.due_date < add(TODAY, -90)).length + open('Purchase Invoice').filter(x => x.due_date < TODAY && !x.on_hold).length + db['Payment Entry'].filter(x => x.docstatus === 0 && sar(x)).length + db['Journal Entry'].filter(x => x.docstatus === 0 && sar(x)).length + open('Purchase Invoice').filter(x => x.on_hold).length + 1;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(n)); H.ok('pending = AR > 90 + overdue AP + draft payments + draft journals + held invoices + my pending request (' + n + ')');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="requests"]').click(); await t.idle();
    H.assert.match(await t.$('[data-tbl="t_req"]').innerText(), /^2 rows/); H.ok('my finance requests exclude other request kinds');
    await t.$('[data-act="rsend"]').click(); H.assert.match(await t.$('[data-ref="content"]').innerText(), /Choose the required company and valid dates/); H.ok('request needs a company for the Advance report');
    await t.$('select[data-req="company"]').selectOption(SAR[1]); await t.$('textarea[data-req="note"]').fill('Board pack'); await t.$('[data-act="rsend"]').click(); await t.idle();
    const call = t.log.filter(x => x.a.action === 'request_finance').pop(); H.assert.equal(call.a.company, SAR[1]); H.assert.equal(call.a.note, 'Board pack');
    H.assert.match(await t.$('[data-ref="content"]').innerText(), /Request sent to Azrah/); H.assert.match(await t.$('[data-tbl="t_req"]').innerText(), /^3 rows/); H.ok('request is sent through soa_workflow_api and appears in the list');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
  },
  quiet: () => { const db = build(); db['Sales Invoice'].forEach(x => { x.outstanding_amount = 0; }); db['Purchase Invoice'].forEach(x => { x.outstanding_amount = 0; }); db['Payment Entry'].forEach(x => { x.docstatus = 1; }); db['Journal Entry'].forEach(x => { x.docstatus = 1; }); db.REQ = []; return db; }
});
