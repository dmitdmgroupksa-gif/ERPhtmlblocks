/* Browser test + screenshot QA for "04. Finance & Credit Control/SOA Request Dashboard" (on the DM kit).
   The salesperson side of soa_api and soa_workflow_api is mocked with a stateful fixture (customers, own requests,
   balance preview, create with a daily limit, outstanding report and customer transfer requests). */
const { run, fmt, money, TODAY, add, rng } = require('./dms-harness.cjs');
const DOCS = ['Outstanding SOA', 'Customer Ledger', 'Customer Outstanding'];
function build() {
  const r = rng(12), pick = a => a[Math.floor(r() * a.length)];
  const db = { customers: [], reqs: [], wf: [], calls: [], used: { 'Outstanding SOA': 1 } };
  for (let i = 0; i < 24; i++) { db.customers.push({ customer: 'CUST-' + String(i).padStart(3, '0'), customer_name: ['Najd Steel', 'Gulf Cement', 'Red Sea Paints', 'Eastern Timber', 'Jeddah Glass', 'Riyadh Cables'][i % 6] + ' ' + (i + 1), outstanding: i % 5 === 4 ? 0 : Math.round(2000 + r() * 180000), invoices: 1 + (i % 7), last_invoice: add(TODAY, -i * 3) }); }
  for (let i = 0; i < 40; i++) {
    const c = db.customers[(i * 7) % 24], d = add(TODAY, -Math.floor(r() * 80)), st = i < 3 ? 'Rejected' : i < 5 ? 'Needs Review' : i === 5 ? 'Failed' : pick(['Sent', 'Approved', 'Sent']);
    db.reqs.push({ name: 'SOA-REQ-' + String(i + 1).padStart(4, '0'), customer: c.customer, customer_name: c.customer_name, document_type: i < 6 ? 'Outstanding SOA' : pick(DOCS), from_date: add(d, -90), to_date: d, status: st, creation: (i < 6 ? add(TODAY, -(i + 1)) : d) + ' 10:00:00',
      sent_on: ['Sent', 'Approved'].includes(st) ? d + ' 12:00:00' : null, review_note: st === 'Rejected' ? 'Use the October period' : '', reviewed_by: st === 'Rejected' ? 'azrah@dm.sa' : null, error: st === 'Failed' ? 'Letter head missing' : '', invoice_outstanding: c.outstanding,
      ageing: { total: c.outstanding, buckets: [{ label: '0-30', amount: c.outstanding / 2 }, { label: '31-60', amount: c.outstanding / 2 }] } });
  }
  db.wf = [{ name: 'SWR-0010', kind: 'Customer Outstanding Report', status: 'Approved', report_date: add(TODAY, -5), review_note: '' }];
  return db;
}
const methods = {
  soa_api: (a, db) => {
    db.calls.push(a);
    switch (a.action) {
      case 'bootstrap': return { user: 'sara@dm.sa', full_name: 'Sara Ali', customers: db.customers, daily_limit: 3, used_today_by_type: db.used, today: TODAY, warning: false };
      case 'list': return { requests: db.reqs };
      case 'preview': return { check: { matched: a.document_type !== 'Customer Ledger', invoice_outstanding: 50000, ledger_balance: 51200, difference: -1200 }, from_date: '2026-01-01' };
      case 'create': { const c = db.customers.find(x => x.customer === a.customer); db.used[a.document_type] = (db.used[a.document_type] || 0) + 1; const q = { name: 'SOA-REQ-NEW', customer: a.customer, customer_name: c.customer_name, document_type: a.document_type, from_date: a.from_date || a.to_date, to_date: a.to_date, status: 'Needs Review', creation: TODAY + ' 11:00:00' }; db.reqs.unshift(q); return Object.assign({ used_today_by_type: db.used }, q); }
      default: throw Object.assign(new Error('unexpected ' + a.action), { status: 500 });
    }
  },
  soa_workflow_api: (a, db) => {
    db.calls.push(Object.assign({ wf: 1 }, a));
    if (a.action === 'bootstrap') { return { today: TODAY, transfer_allowed: true, salespeople: [{ name: 'Sara Ali', enabled: 1 }, { name: 'Omar Khan', enabled: 1 }, { name: 'Fahad Noor', enabled: 0 }] }; }
    if (a.action === 'mine') { return { requests: db.wf }; }
    if (a.action === 'customers') { return { customers: a.source === 'Fahad Noor' ? ['CUST-900', 'CUST-901', 'CUST-902'] : [] }; }
    if (a.action === 'request_report' || a.action === 'request_transfer') { db.wf.unshift({ name: 'SWR-' + (100 + db.wf.length), kind: a.action === 'request_report' ? 'Customer Outstanding Report' : 'Customer Transfer', status: 'Pending', report_date: a.date, from_sales_person: a.source, to_sales_person: a.target }); return { ok: 1 }; }
    throw Object.assign(new Error('unexpected wf ' + a.action), { status: 500 });
  }
};
const arr = v => (typeof v === 'string' ? JSON.parse(v) : v);
function expectPending(db) {
  const latest = {}; db.reqs.forEach(q => { const k = q.customer + '|' + q.document_type; if (!latest[k] || q.creation > latest[k].creation) { latest[k] = q; } });
  const age = d => Math.round((Date.parse(TODAY) - Date.parse(String(d).slice(0, 10))) / 864e5);
  const fix = Object.values(latest).filter(q => ['Rejected', 'Failed'].includes(q.status) && age(q.creation) <= 60).length;
  const last = {}; db.reqs.forEach(q => { const d = q.creation.slice(0, 10); if (!last[q.customer] || d > last[q.customer]) { last[q.customer] = d; } });
  const stale = db.customers.filter(c => c.outstanding > 0.5 && (!last[c.customer] || age(last[c.customer]) > 30)).length;
  const wait = db.reqs.filter(q => ['Needs Review', 'Processing'].includes(q.status)).length;
  return { fix, stale, wait, all: fix + stale + wait };
}
run({
  slug: 'soa-request', folder: '04. Finance & Credit Control/SOA Request Dashboard', build, methods,
  figures: async (t, H, db) => {
    H.assert.equal(await t.kpiVal(0), fmt(db.customers.length)); H.assert.equal(await t.kpiVal(1), money(db.customers.reduce((s, c) => s + c.outstanding, 0)) + 'SAR'); H.ok('customers and open balance = bootstrap');
    const mine = db.reqs.filter(q => q.creation.slice(0, 7) === TODAY.slice(0, 7)); H.assert.equal(await t.kpiVal(2), fmt(mine.length)); H.ok('requests this month (' + mine.length + ')');
    const P = expectPending(db); H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(P.all)); H.ok('pending = to fix ' + P.fix + ' + no statement in 30 days ' + P.stale + ' + with Azrah ' + P.wait);
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('button.dms-split-row').first().click(); await t.idle();
    H.assert.equal(await t.$('#dms-tab-new').getAttribute('aria-selected'), 'true'); H.assert.equal(await t.$('.sr-c.dms-on').count(), 1); H.ok('a top-balance customer opens a new request for it');
    await t.$('[data-act="dt"][data-v="Customer Ledger"]').click(); await t.idle();
    H.assert.match(await t.$('.sr-form').innerText(), /differ by 1,200\.00 SAR/); H.ok('balance preview warns about the difference before sending');
    const cust = await t.$('.sr-c.dms-on').getAttribute('data-v');
    await t.$('[data-act="submit"]').click(); await t.idle();
    const cr = db.calls.filter(c => c.action === 'create').pop(); H.assert.equal(cr.customer, cust); H.assert.equal(cr.document_type, 'Customer Ledger'); H.assert.ok(cr.from_date && cr.to_date);
    H.assert.match(await t.$('.sr-form').innerText(), /Sent to Azrah for review/); H.ok('request created with customer, document and period; result shown');
    await t.$('[data-act="again"]').click(); await t.$('[data-act="dt"][data-v="Outstanding SOA"]').click(); await t.idle();
    H.assert.match(await t.$('.sr-form').innerText(), /2 of 3 Outstanding SOA requests left today/); H.ok('daily limit shown per document type');
    await t.$('[data-act="tab"][data-v="log"]').click(); await t.idle(); H.assert.match(await t.$('[data-tbl="t_log"]').innerText(), /SOA-REQ-NEW/); H.ok('new request appears in My requests');
    await t.$('[data-act="tab"][data-v="transfer"]').click(); await t.idle();
    await t.$('select[data-wfd="source"]').selectOption('Fahad Noor'); await t.idle();
    await t.$('select[data-wfd="target"]').selectOption('Omar Khan'); await t.idle();
    await t.$('input[data-wcust="CUST-900"]').check(); await t.$('input[data-wcust="CUST-902"]').check(); await t.$('textarea[data-wfd="note"]').fill('Fahad left the company');
    await t.$('[data-act="wsubmit"][data-v="transfer"]').click(); await t.idle();
    const tr = db.calls.filter(c => c.action === 'request_transfer').pop(); H.assert.equal(tr.source, 'Fahad Noor'); H.assert.equal(tr.target, 'Omar Khan'); H.assert.deepEqual(arr(tr.customers), ['CUST-900', 'CUST-902']); H.assert.equal(tr.note, 'Fahad left the company');
    H.ok('customer transfer request sends source, target, chosen customers and reason');
    await t.$('[data-act="tab"][data-v="report"]').click(); await t.idle(); await t.$('[data-act="wsubmit"][data-v="report"]').click(); await t.idle();
    H.assert.equal(db.calls.filter(c => c.action === 'request_report').pop().date, TODAY); H.ok('outstanding report requested as of today');
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
  },
  quiet: () => { const db = build(); db.reqs = db.customers.map((c, i) => ({ name: 'Q' + i, customer: c.customer, customer_name: c.customer_name, document_type: 'Outstanding SOA', to_date: TODAY, status: 'Sent', creation: add(TODAY, -2) + ' 10:00:00' })); return db; }
});
