/* Browser test + screenshot QA for "04. Finance & Credit Control/Collector" (on the DM kit).
   soa_api (coll_my, coll_remark) is mocked with a stateful collection list for the logged-in collector. */
const { run, fmt, money, TODAY, add } = require('./dms-harness.cjs');
function build() {
  const items = Array.from({ length: 9 }, (_, k) => ({ name: 'CLI-' + k, customer: 'CUST-' + (100 + k), customer_name: ['Najd Steel', 'Gulf Cement', 'Red Sea Paints', 'Eastern Timber', 'Jeddah Glass', 'Riyadh Cables', 'Qassim Foods', 'Tabuk Tiles', 'Hail Motors'][k], sales_person: ['Sara Ali', 'Omar Khan'][k % 2],
    phone: k === 3 ? '' : '+9665000000' + k, due_amount: 4000 + k * 2750, total_outstanding: 6000 + k * 3000, oldest_date: add(TODAY, -65 - k * 4), invoices: [{ voucher: 'SINV-' + k, amount: 4000 + k * 2750, days: 65 + k * 4 }], last_update: k === 1 ? 'Called on 15 Nov, no answer' : '', removed: k === 8 ? 1 : 0,
    result: k === 0 ? 'Collected' : k === 2 ? 'Promised' : '', collected_amount: k === 0 ? 4000 : 0, payment_mode: k === 0 ? 'Cash' : '', promise_date: k === 2 ? add(TODAY, -1) : '', note: k === 5 ? 'Visit after 4 pm' : '' }));
  return { list: { name: 'CL-2026-0042', list_date: TODAY, collector: 'nasser@dm.sa', collector_name: 'Nasser Ali', status: 'Approved', items }, recent: [{ name: 'CL-2026-0042', date: TODAY, customers: 8, due: 0, collected: 4000 }, { name: 'CL-2026-0037', date: add(TODAY, -1), customers: 6, due: 52000, collected: 18000 }, { name: 'CL-2026-0031', date: add(TODAY, -2), customers: 7, due: 61000, collected: 9000 }], calls: [] };
}
const methods = {
  soa_api: (a, db) => {
    db.calls.push(a);
    if (a.action === 'coll_my') { const day = a.date || TODAY; return { date: day, today: TODAY, full_name: 'Nasser Ali', pending: false, collect_after_days: 60, list: day === TODAY ? db.list : null, recent: db.recent }; }
    if (a.action === 'coll_remark') { const it = db.list.items.find(x => x.name === a.item); if (String(a.note).length > 140) { throw Object.assign(new Error('too long'), { status: 417 }); } it.note = a.note; return db.list; }
    throw Object.assign(new Error('unexpected ' + a.action), { status: 500 });
  }
};
const active = db => db.list.items.filter(x => !x.removed), done = x => !!(x.result || x.note);
run({
  slug: 'collector', folder: '04. Finance & Credit Control/Collector', build, methods,
  figures: async (t, H, db) => {
    const its = active(db), due = its.reduce((s, x) => s + x.due_amount, 0), left = its.filter(x => !done(x)).length;
    H.assert.equal(await t.kpiVal(0), money(due) + 'SAR'); H.assert.equal(await t.kpiVal(1), money(4000) + 'SAR'); H.assert.equal(await t.kpiVal(2), fmt(left)); H.ok('to collect / collected / left to visit = list (removed customer excluded; ' + left + ' left)');
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(left + 1)); H.ok('pending = customers to visit + promise due yesterday (' + (left + 1) + ')');
    H.assert.match(await t.$('.dms-actpanel').innerText(), /Red Sea Paints[\s\S]*1 day overdue|1 day overdue[\s\S]*Red Sea Paints/); H.ok('promised payment past its date flagged');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="list"]').click(); await t.idle();
    const todo = active(db).filter(x => !done(x)).length; H.assert.equal(await t.$('.cl-card').count(), todo); H.ok('visit list opens on "To visit" (' + todo + ')');
    await t.$('[data-act="cflt"][data-v="all"]').click(); await t.idle(); H.assert.equal(await t.$('.cl-card').count(), active(db).length); H.ok('All shows every customer still on the list');
    H.assert.equal(await t.$('.cl-card[data-card="CLI-1"] a[href="tel:+96650000001"]').count(), 1); H.ok('call link on each card with a phone');
    await t.$('.cl-card[data-card="CLI-4"] [data-act="copen"]').click(); await t.$('[data-cnote]').fill('Paid half by transfer, rest Thursday'); await t.$('[data-act="csave"]').click(); await t.idle();
    const rc = db.calls.filter(c => c.action === 'coll_remark').pop(); H.assert.equal(rc.list, 'CL-2026-0042'); H.assert.equal(rc.item, 'CLI-4'); H.assert.equal(rc.note, 'Paid half by transfer, rest Thursday');
    H.assert.match(await t.$('.cl-card[data-card="CLI-4"]').innerText(), /Paid half by transfer/); H.ok('remark saved through coll_remark and shown on the card');
    H.assert.equal(await t.$('[data-cnote]').count(), 0); await t.$('.cl-card[data-card="CLI-6"] [data-act="copen"]').click(); H.assert.equal(await t.$('[data-cnote]').getAttribute('maxlength'), '140'); await t.$('[data-act="ccancel"]').click(); H.ok('remark limited to 140 characters, cancel closes it');
    await t.$('[data-act="cday"][data-v="' + add(TODAY, -1) + '"]').click(); await t.idle(); H.assert.match(await t.$('[data-ref="content"]').innerText(), /No list for this day/); H.ok('earlier day without a list says so');
    await t.$('[data-act="cday"][data-v="' + TODAY + '"]').click(); await t.idle();
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
  },
  quiet: () => { const db = build(); db.list.items.forEach(x => { x.note = x.note || 'Visited'; x.result = x.result === 'Promised' ? '' : x.result; x.promise_date = ''; }); return db; }
});
