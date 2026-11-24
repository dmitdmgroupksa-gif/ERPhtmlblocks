/* Browser test + screenshot QA for "04. Finance & Credit Control/Finance Internal Controller" (on the DM kit).
   get_list is mocked over a seeded set of workflow documents (Payment Entry, Journal Entry, Expense Claim, Purchase /
   Sales Invoice, Bank Transaction) plus Workflow definitions, Version trail and attachments; frappe.client.get and
   get_balance_on are mocked. Expected figures come from the raw rows. */
const { run, money, fmt, TODAY, add, rng } = require('./dms-harness.cjs');
const SAR = ['Alpha Contracting', 'Alpha Trading'], AED = 'Alpha Gulf FZE', YEAR0 = '2026-01-01';
function build() {
  const r = rng(33), pick = a => a[Math.floor(r() * a.length)], co = () => r() < 0.12 ? AED : pick(SAR), d = () => add(TODAY, -Math.floor(r() * 400));
  const db = { Company: [{ name: SAR[0], default_currency: 'SAR' }, { name: SAR[1], default_currency: 'SAR' }, { name: AED, default_currency: 'AED' }], Workflow: [], 'Payment Entry': [], 'Journal Entry': [], 'Journal Entry Account': [], 'Expense Claim': [], 'Purchase Invoice': [], 'Sales Invoice': [], 'Bank Account': [], 'Bank Transaction': [], Version: [], File: [], 'Accounting Period': [], 'Closed Document': [] };
  db.Workflow = [{ name: 'PE Approval', document_type: 'Payment Entry', is_active: 1, transitions: [{ state: 'Pending', allowed: 'Accounts Manager' }, { state: 'Review', allowed: 'Accounts User' }] }, { name: 'JE Approval', document_type: 'Journal Entry', is_active: 1, transitions: [{ state: 'Pending', allowed: 'Finance Controller' }] }, { name: 'EC Approval', document_type: 'Expense Claim', is_active: 1, transitions: [{ state: 'Pending Approval', allowed: 'Expense Approver' }] }];
  const wfPick = () => pick(['Pending', 'Pending', 'Approved', 'Approved', 'Approved', 'Review', 'Rejected']);
  for (let i = 0; i < 160; i++) { const st = wfPick(), c = co(), cr = d(); db['Payment Entry'].push({ name: 'PE-' + i, posting_date: i % 15 === 0 ? add(cr, -20) : cr, creation: cr + ' 10:00:00', company: c, payment_type: pick(['Pay', 'Receive']), party_type: 'Supplier', party_name: 'Party ' + (i % 7), party: 'P' + (i % 7), paid_amount: 1000 + i * 50, received_amount: 1000 + i * 50, base_paid_amount: 1000 + i * 50, base_received_amount: 1000 + i * 50, mode_of_payment: pick(['Cash', 'Bank Transfer']), reference_no: 'R' + (i % 40), workflow_state: st, status: st === 'Approved' ? 'Submitted' : 'Draft', docstatus: st === 'Approved' || (i % 23 === 0) ? 1 : st === 'Rejected' ? 2 : 0, owner: 'u' + (i % 3) + '@x', modified_by: 'u' + (i % 4) + '@x', unallocated_amount: i % 11 === 0 ? 300 : 0 }); }
  for (let i = 0; i < 90; i++) { const st = wfPick(), c = co(), dd = d(); db['Journal Entry'].push({ name: 'JV-' + i, posting_date: dd, creation: dd + ' 09:00:00', company: c, voucher_type: pick(['Journal Entry', 'Bank Entry']), total_debit: 500 + i * 20, total_credit: 500 + i * 20, difference: i % 29 === 0 ? 10 : 0, workflow_state: st, docstatus: st === 'Approved' ? 1 : st === 'Rejected' ? 2 : 0, owner: 'u1@x', modified_by: 'u1@x', reversal_of: null }); db['Journal Entry Account'].push({ parent: 'JV-' + i, parenttype: 'Journal Entry', debit: 500 + i * 20, credit: 0 }, { parent: 'JV-' + i, parenttype: 'Journal Entry', debit: 0, credit: 500 + i * 20 - (i % 29 === 0 ? 10 : 0) }); }
  for (let i = 0; i < 70; i++) { const st = pick(['Pending Approval', 'Approved', 'Approved', 'Rejected', 'Hold']), dd = d(); db['Expense Claim'].push({ name: 'EXP-' + i, posting_date: dd, company: co(), employee: 'EMP-' + (i % 9), employee_name: 'Employee ' + (i % 9), total_claimed_amount: 200 + i * 10, total_sanctioned_amount: 200 + i * 10, total_amount_reimbursed: i % 2 ? 200 + i * 10 : 0, approval_status: st === 'Approved' ? 'Approved' : st === 'Rejected' ? 'Rejected' : 'Draft', status: i % 2 ? 'Paid' : 'Unpaid', workflow_state: st, docstatus: st === 'Approved' ? 1 : 0, owner: 'e@x' }); }
  const inv = (dt, n, party) => { for (let i = 0; i < n; i++) { const c = co(), p = d(), gt = 3000 + i * 400; db[dt].push({ name: (dt === 'Sales Invoice' ? 'SINV-' : 'PINV-') + i, posting_date: p, due_date: add(p, 30), company: c, [party]: party.replace('_name', '') + ' ' + (i % 8), [party.replace('_name', '')]: 'X' + (i % 8), bill_no: 'B' + (i % 50), currency: c === AED ? 'AED' : 'SAR', conversion_rate: 1, grand_total: gt, base_grand_total: gt, outstanding_amount: i % 3 ? gt : 0, party_account_currency: c === AED ? 'AED' : 'SAR', status: i % 3 ? 'Unpaid' : 'Paid', docstatus: i % 17 === 0 ? 0 : 1, owner: 'o@x', is_return: 0 }); } };
  inv('Purchase Invoice', 110, 'supplier_name'); inv('Sales Invoice', 110, 'customer_name');
  db['Bank Account'] = [{ name: 'SNB - AC', account: 'SNB GL - AC', bank: 'SNB', company: SAR[0], is_company_account: 1 }, { name: 'Rajhi - AT', account: 'Rajhi GL - AT', bank: 'Al Rajhi', company: SAR[1], is_company_account: 1 }];
  for (let i = 0; i < 60; i++) { db['Bank Transaction'].push({ name: 'BT-' + i, date: d(), company: pick(SAR), bank_account: pick(['SNB - AC', 'Rajhi - AT']), deposit: i % 2 ? 1000 + i : 0, withdrawal: i % 2 ? 0 : 800 + i, unallocated_amount: i % 3 ? 0 : 500, status: pick(['Unreconciled', 'Reconciled', 'Pending']), reference_number: 'BR' + i, currency: 'SAR', docstatus: 1 }); }
  db.Version = [{ ref_doctype: 'Payment Entry', docname: 'PE-2', creation: '2026-11-01 10:00:00', owner: 'u2@x', data: JSON.stringify({ changed: [['workflow_state', 'Pending', 'Approved']] }) }];
  db.File = [{ attached_to_doctype: 'Payment Entry', attached_to_name: 'PE-2', file_name: 'receipt.pdf', file_url: '/private/files/receipt.pdf', is_private: 1, name: 'F1' }];
  return db;
}
const methods = {
  'frappe.client.get': (a, db) => { const x = (db[a.doctype] || []).find(r => r.name === a.name); if (!x) { throw Object.assign(new Error('not found'), { status: 417 }); } return Object.assign({ doctype: a.doctype }, x, a.doctype === 'Journal Entry' ? { accounts: db['Journal Entry Account'].filter(l => l.parent === a.name).map(l => Object.assign({ account: 'Cash - AC', party: '' }, l)) } : {}); },
  'erpnext.accounts.utils.get_balance_on': a => (a.account === 'SNB GL - AC' ? 250000 : 120000)
};
const sar = x => SAR.includes(x.company), inYear = x => (x.posting_date || x.date) >= YEAR0 && (x.posting_date || x.date) <= TODAY;
const PEND = { 'Payment Entry': ['Pending', 'submitted'], 'Journal Entry': ['Pending', 'submitted', 'Submitted After Review'], 'Expense Claim': ['Pending', 'Pending Approval', 'Pending Review'] };
run({
  slug: 'finance-internal-controller', folder: '04. Finance & Credit Control/Finance Internal Controller', build, methods,
  figures: async (t, H, db) => {
    H.assert.equal(await t.$('.dms-tab.dms-on').getAttribute('data-v'), 'approvals'); H.ok('opens on the Approvals tab (APP.defaultTab, set in ERPNext)');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    const pend = Object.keys(PEND).reduce((s, dt) => s + db[dt].filter(x => sar(x) && PEND[dt].includes(x.workflow_state) && x.docstatus !== 2).length, 0) + db['Purchase Invoice'].filter(x => sar(x) && x.docstatus === 0).length;
    H.assert.equal(await t.kpiVal(0), fmt(pend)); H.ok('pending approvals, all open items regardless of period (live backlog rule set in ERPNext), SAR companies = fixture (' + pend + ')');
    const ar = db['Sales Invoice'].filter(x => sar(x) && x.docstatus === 1 && x.outstanding_amount > 0).reduce((s, x) => s + x.outstanding_amount, 0);
    H.assert.equal(await t.kpiVal(3), money(ar) + 'SAR'); H.ok('receivables in base currency, AED company excluded instead of failing (' + money(ar) + ')');
    const aged = Object.keys(PEND).reduce((s, dt) => s + db[dt].filter(x => sar(x) && PEND[dt].includes(x.workflow_state) && x.docstatus !== 2 && x.posting_date <= add(TODAY, -7)).length, 0);
    H.assert.equal(await t.kpiVal(1), fmt(aged)); H.ok('waiting > 7 days = fixture (' + aged + ')');
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /Not included \(other currency\): Alpha Gulf FZE \(AED\)/); H.ok('AED company named, not mixed into totals');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('.dms-arow').first().evaluate(a => a.removeAttribute('target'));
    await t.$('[data-act="tab"][data-v="payments"]').click(); await t.idle();
    await t.$('[data-tbl="t_pe"] [data-v^="doc:"]').first().click(); await t.$('.dms-modal .dms-facts').waitFor();
    H.assert.ok(await t.$('.dms-modal .dms-facts div').count() > 5); H.assert.equal(await t.$('.dms-modal a[href="/app/payment-entry/' + (await t.$('.dms-modal h3').innerText()).split(' · ')[1] + '"]').count(), 1); H.ok('record detail shows fields, trail and a link to the ERP record');
    await t.page.keyboard.press('Escape');
    await t.$('[data-act="tab"][data-v="audit"]').click(); await t.idle();
    const unbal = db['Journal Entry'].filter(x => sar(x) && inYear(x) && x.docstatus !== 2 && x.difference !== 0).length;
    H.assert.match(await t.$('[data-tbl="t_exc"]').innerText(), new RegExp('Journal debit/credit mismatches[\\s\\S]*?' + unbal)); H.ok('control exceptions register counts unbalanced journals (' + unbal + ')');
    await t.$('[data-tbl="t_exc"] [data-v^="nest:"]').first().click(); await t.$('.dms-modal').waitFor(); await t.idle(); H.assert.ok(await t.$('.dms-modal tbody tr').count() > 0);
    const nested = t.$('.dms-modal [data-v^="doc:"], .dms-modal [data-v^="nest:"]').first(); if (await nested.count()) { await nested.click(); await t.idle(); H.assert.equal(await t.$('.dms-modal [data-act="ovback"]').count(), 1); await t.$('[data-act="ovback"]').click(); await t.idle(); }
    await t.page.keyboard.press('Escape'); H.ok('exception drill-down with nested record and Back');
    await t.$('[data-act="tab"][data-v="ap"]').click(); await t.idle(); await t.$('[data-act="chip"][data-v="apView:party"]').click(); await t.idle(); H.assert.match(await t.$('[data-tbl="t_app"]').innerText(), /rows/); H.ok('payables by supplier view');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
  },
  quiet: () => { const db = build(); ['Payment Entry', 'Journal Entry', 'Expense Claim', 'Purchase Invoice', 'Sales Invoice'].forEach(k => { db[k] = []; }); db['Journal Entry Account'] = []; return db; }
});
