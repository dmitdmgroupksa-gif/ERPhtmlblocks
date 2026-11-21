/* Browser test + screenshot QA for "04. Finance & Credit Control/SOA Manager" (on the DM kit).
   The two Server Scripts the block calls (soa_api, soa_workflow_api) are mocked with a stateful fixture: statement
   requests, emailed files, collection lists and workflow requests. Write actions (review, list approval, access) change
   the fixture, and the test checks both the request the block sent and what it shows afterwards. */
const { run, fmt, TODAY, add, rng } = require('./dms-harness.cjs');
const SP = [['sara@dm.sa', 'Sara Ali'], ['omar@dm.sa', 'Omar Khan'], ['huda@dm.sa', 'Huda Saleh'], ['fahad@dm.sa', 'Fahad Noor']];
const DOCS = ['Outstanding SOA', 'Customer Ledger', 'Customer Outstanding'];
function build() {
  const r = rng(5), pick = a => a[Math.floor(r() * a.length)];
  const db = { reqs: [], lists: [], wf: [], access: ['sara@dm.sa'], finance_access: [], calls: [] };
  for (let i = 0; i < 90; i++) {
    const sp = pick(SP), d = add(TODAY, -Math.floor(r() * 70)), st = i < 6 ? (i % 3 === 0 ? 'Failed' : 'Needs Review') : pick(['Sent', 'Sent', 'Approved', 'Rejected', 'Sent']), diff = st === 'Needs Review' && i % 2 ? 1250.5 : 0;
    db.reqs.push({ name: 'SOA-REQ-' + String(i + 1).padStart(4, '0'), customer: 'CUST-' + (i % 15), customer_name: 'Customer ' + (i % 15), document_type: pick(DOCS), from_date: add(d, -60), to_date: d, status: st,
      requested_by: sp[0], requested_by_name: sp[1], creation: d + ' 0' + (i % 9) + ':15:00', sent_on: ['Sent', 'Approved'].includes(st) ? (i % 11 === 0 ? TODAY : d) + ' 10:00:00' : null, difference: diff, invoice_outstanding: 5000 + i * 731, matched: st === 'Sent' || (st === 'Needs Review' && !diff),
      reviewed_by: st === 'Approved' || st === 'Rejected' ? 'azrah@dm.sa' : null, reviewed_on: st === 'Approved' ? d + ' 12:00:00' : null, review_note: st === 'Rejected' ? 'Wrong period' : '', letterheads: 'Najd', error: st === 'Failed' ? 'Print format missing' : '',
      files: ['Sent', 'Approved'].includes(st) ? [{ file_url: '/private/files/soa' + i + '.pdf', file_name: 'SOA-' + i + '.pdf', brand: 'Najd' }] : [],
      gl: { matched: !diff, lines: [{ key: 'opening', statement: 0, gl: 0, difference: 0 }, { key: 'closing', statement: 5000 + i * 731, gl: 5000 + i * 731 - diff, difference: diff }], vouchers: diff ? [{ kind: 'Payment Entry', voucher: 'PE-' + i, voucher_type: 'Payment Entry', difference: diff, st_debit: 0, st_credit: diff, gl_debit: 0, gl_credit: 0 }] : [] } });
  }
  const items = n => Array.from({ length: n }, (_, k) => ({ name: 'CLI-' + n + '-' + k, customer: 'CUST-' + k, customer_name: 'Customer ' + k, sales_person: SP[k % 4][1], due_amount: 3000 + k * 410, total_outstanding: 5000 + k * 500, oldest_date: add(TODAY, -40 - k), invoices: [{ voucher: 'SINV-' + k, amount: 3000 + k * 410, days: 40 + k }], result: k === 0 ? 'Collected' : k === 1 ? 'Promised' : null, collected_amount: k === 0 ? 3000 : 0, promise_date: k === 1 ? add(TODAY, 3) : null }));
  db.lists = [
    { name: 'CL-0001', collector: 'nasser@dm.sa', collector_name: 'Nasser Ali', status: 'Draft', total_due: 41000, total_collected: 0, customers: 6, done: 0, items: items(6) },
    { name: 'CL-0002', collector: 'majed@dm.sa', collector_name: 'Majed Saad', status: 'Draft', total_due: 26000, total_collected: 3000, customers: 4, done: 2, items: items(4) },
    { name: 'CL-0003', collector: 'turki@dm.sa', collector_name: 'Turki Fahd', status: 'Approved', total_due: 18000, total_collected: 9500, customers: 3, done: 3, approved_by: 'azrah@dm.sa', items: items(3) }
  ];
  db.wf = [
    { name: 'SWR-0001', kind: 'Customer Outstanding Report', status: 'Pending', requested_by: 'omar@dm.sa', report_date: add(TODAY, -1), creation: add(TODAY, -1) + ' 09:00:00', company: 'Alpha Contracting', customers: ['CUST-1'] },
    { name: 'SWR-0002', kind: 'Customer Transfer', status: 'Pending', requested_by: 'sara@dm.sa', from_sales_person: 'Sara Ali', to_sales_person: 'Omar Khan', creation: add(TODAY, -3) + ' 09:00:00', customers: ['CUST-2', 'CUST-3'] },
    { name: 'SWR-0003', kind: 'Advance Report', status: 'Pending', requested_by: 'huda@dm.sa', report_date: TODAY, creation: TODAY + ' 08:00:00', company: 'Alpha Trading', customers: [] },
    { name: 'SWR-0004', kind: 'Customer Transfer', status: 'Approved', requested_by: 'omar@dm.sa', from_sales_person: 'Omar Khan', to_sales_person: 'Huda Saleh', creation: add(TODAY, -9) + ' 09:00:00', customers: ['CUST-9'] }
  ];
  return db;
}
const methods = {
  soa_api: (a, db) => {
    db.calls.push(a);
    switch (a.action) {
      case 'bootstrap': return { user: 'azrah@dm.sa', full_name: 'Azrah Manager', is_manager: true, missing_letterheads: [], today: TODAY };
      case 'list': return { requests: db.reqs };
      case 'files': return { files: db.reqs.filter(q => ['Sent', 'Approved'].includes(q.status)).flatMap(q => q.files.map(f => Object.assign({ request: q.name, letter_head: 'Najd Letter Head', amount: q.invoice_outstanding, customer: q.customer, customer_name: q.customer_name, document_type: q.document_type, requested_by: q.requested_by, sent_on: q.sent_on, status: q.status, from_date: q.from_date, to_date: q.to_date }, f))) };
      case 'review': { const q = db.reqs.find(x => x.name === a.name); q.status = a.op === 'approve' ? 'Approved' : a.op === 'reject' ? 'Rejected' : q.status; q.review_note = a.note; q.reviewed_by = 'azrah@dm.sa'; if (a.op === 'approve') { q.sent_on = TODAY + ' 11:00:00'; } return q; }
      case 'coll_admin': return { collectors: [{ user: 'nasser@dm.sa', employee: 'EMP-1', full_name: 'Nasser Ali', max_customers: 8 }, { user: 'majed@dm.sa', employee: 'EMP-2', full_name: 'Majed Saad' }, { user: 'turki@dm.sa', employee: 'EMP-3', full_name: 'Turki Fahd' }],
        assignments: { 'nasser@dm.sa': ['Sara Ali'], 'majed@dm.sa': ['Omar Khan', 'Huda Saleh'], 'turki@dm.sa': ['Fahad Noor'] }, employees: [{ employee: 'EMP-9', name: 'Khalid Omar', user: 'khalid@dm.sa', designation: 'Collector' }],
        sales_persons: SP.map(s => s[1]), sales_person_details: { 'Fahad Noor': { left: 1, pending_invoices: 4 } }, collect_after_days: 30 };
      case 'coll_lists': return { date: a.date || TODAY, today: TODAY, lists: a.date && a.date !== TODAY ? [] : db.lists, history: [{ date: TODAY, lists: 3, due: 85000, collected: 12500 }, { date: add(TODAY, -1), lists: 2, due: 40000, collected: 22000 }] };
      case 'coll_approve': arr(a.lists).forEach(n => { const l = db.lists.find(x => x.name === n); l.status = 'Approved'; l.approved_by = 'azrah@dm.sa'; }); return { ok: 1 };
      default: throw Object.assign(new Error('unexpected action ' + a.action), { status: 500 });
    }
  },
  soa_workflow_api: (a, db) => {
    db.calls.push(Object.assign({ wf: 1 }, a));
    if (a.action === 'admin') { return { requests: db.wf, users: SP.map(s => ({ name: s[0], full_name: s[1] })).concat([{ name: 'azrah@dm.sa', full_name: 'Azrah Manager' }]), access: db.access, finance_access: db.finance_access }; }
    if (a.action === 'access' || a.action === 'finance_access') { const k = a.action; db[k] = +a.enabled ? [...new Set(db[k].concat(a.user))] : db[k].filter(u => u !== a.user); return { ok: 1 }; }
    if (a.action === 'review') { const w = db.wf.find(x => x.name === a.name); w.status = a.op === 'approve' ? 'Approved' : 'Rejected'; w.review_note = a.note; return { ok: 1 }; }
    throw Object.assign(new Error('unexpected wf action ' + a.action), { status: 500 });
  }
};
const arr = v => (typeof v === 'string' ? JSON.parse(v) : v);
const waitingOf = db => db.reqs.filter(q => ['Needs Review', 'Failed'].includes(q.status)).length;
run({
  slug: 'soa-manager', folder: '04. Finance & Credit Control/SOA Manager', build, methods,
  figures: async (t, H, db) => {
    H.assert.equal(await t.kpiVal(0), fmt(waitingOf(db))); H.ok('waiting for review = Needs Review + Failed (' + waitingOf(db) + ')');
    const today = db.reqs.filter(q => String(q.sent_on).slice(0, 10) === TODAY).length; H.assert.equal(await t.kpiVal(1), fmt(today)); H.ok('approved/sent today = fixture (' + today + ')');
    H.assert.equal(await t.kpiVal(4), '2'); H.assert.equal(await t.kpiVal(5), '12.5KSAR'); H.ok('collections: 2 lists to approve, 12.5K collected today');
    const P = waitingOf(db) + 2 + 1 + 1 + 1; H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P)); H.ok('pending = statements + draft lists + outstanding report + transfer + finance request (' + P + ')');
    H.assert.match(await t.$('.dms-actpanel').innerText(), /Collection list[\s\S]*Nasser Ali|Nasser Ali[\s\S]*Collection list/); H.ok('draft collection lists appear in actions pending');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="queue"]').click(); await t.idle();
    H.assert.equal(await t.$('.sm-card[data-card]').count(), waitingOf(db)); H.ok('review queue shows every waiting request');
    const first = await t.$('.sm-card[data-card]').first().getAttribute('data-card');
    const calls0 = db.calls.length;
    await t.$('.sm-card[data-card="' + first + '"] [data-act="op"][data-v="reject"]').click(); await t.page.waitForTimeout(200);
    H.assert.equal(db.calls.filter((c, i) => i >= calls0 && c.action === 'review').length, 0); H.assert.match(await t.$('.dms-toast').first().innerText(), /Write a reason/); H.ok('reject without a reason is blocked before any request');
    await t.$('.sm-card[data-card="' + first + '"] textarea').fill('Period should end in October'); await t.$('.sm-card[data-card="' + first + '"] [data-act="op"][data-v="reject"]').click(); await t.idle();
    const rv = db.calls.filter(c => c.action === 'review').pop(); H.assert.equal(rv.name, first); H.assert.equal(rv.op, 'reject'); H.assert.equal(rv.note, 'Period should end in October');
    H.assert.equal(await t.$('.sm-card[data-card="' + first + '"]').count(), 0); H.ok('reject sends the note to soa_api review and removes the card');
    const second = await t.$('.sm-card[data-card]').first().getAttribute('data-card');
    await t.$('.sm-card[data-card="' + second + '"] [data-act="op"][data-v="approve"]').click(); await t.idle();
    H.assert.equal(db.reqs.find(q => q.name === second).status, 'Approved'); H.assert.equal(await t.$('.sm-card[data-card]').count(), waitingOf(db)); H.ok('approve & email updates the request and the queue');
    await t.$('[data-act="tab"][data-v="all"]').click(); await t.idle();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="st"]').selectOption('Rejected'); await t.$('[data-act="fapply"]').click(); await t.idle(); await t.$('[data-act="tab"][data-v="all"]').click(); await t.idle();
    const rej = db.reqs.filter(q => q.status === 'Rejected' && q.creation.slice(0, 7) === TODAY.slice(0, 7)).length;
    H.assert.match(await t.$('[data-tbl="t_all"]').innerText(), new RegExp('^' + fmt(rej) + ' rows')); H.ok('request log filtered by status and period (' + rej + ' rejected this month)');
    await t.$('.dms-chip-x').first().click(); await t.idle();
    await t.$('[data-act="tab"][data-v="coll"]').click(); await t.idle();
    H.assert.equal(await t.$('details.sm-cl').count(), 3); await t.$('[data-act="capproveall"]').click(); await t.idle();
    const ap = db.calls.filter(c => c.action === 'coll_approve').pop(); H.assert.deepEqual(arr(ap.lists), ['CL-0001', 'CL-0002']); H.assert.equal(await t.$('[data-act="capproveall"]').count(), 0); H.ok('approve all sends the two draft lists and clears the button');
    await t.$('[data-act="tab"][data-v="transfers"]').click(); await t.idle();
    await t.$('[data-act="wop"][data-v="approve"][data-id="SWR-0002"]').click(); await t.idle();
    H.assert.equal(db.wf.find(w => w.name === 'SWR-0002').status, 'Approved'); H.ok('customer transfer approved through soa_workflow_api review');
    await t.$('[data-act="tab"][data-v="access"]').click(); await t.idle();
    await t.$('input[data-acc="finance_access"][value="omar@dm.sa"]').check(); await t.idle();
    H.assert.deepEqual(db.finance_access, ['omar@dm.sa']); H.ok('finance access toggle saved');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
  },
  quiet: () => { const db = build(); db.reqs = db.reqs.filter(q => !['Needs Review', 'Failed'].includes(q.status)); db.lists.forEach(l => { l.status = 'Approved'; }); db.wf.forEach(w => { w.status = 'Approved'; }); return db; }
});
