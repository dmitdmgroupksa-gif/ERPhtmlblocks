/* Browser test + screenshot QA for "04. Finance & Credit Control/Treasury Dashboard" (on the DM kit).
   The Server Script is mocked with a payload built from a seeded ledger the same way the script does (company scope,
   one currency per view, lookback/horizon windows); Expense Claims go through the get_list mock.
   The server script itself is exercised by tests/test_treasury_api.py. */
const { run, money, fmt, TODAY, add, rng } = require('./dms-harness.cjs');
const SAR = ['Alpha Contracting', 'Alpha Trading'], AED = 'Alpha Gulf FZE', BUF = 750000;

function build() {
  const r = rng(5), pick = a => a[Math.floor(r() * a.length)], db = { 'Expense Claim': [], L: {} };
  const co = SAR.concat([AED]);
  db.L.accounts = [];
  co.forEach((c, i) => ['Al Rajhi', 'SNB', 'Riyad Bank'].forEach((b, j) => db.L.accounts.push({ account: b + ' Current - ' + c.slice(0, 2).toUpperCase(), company: c, type: 'Bank', bank: b, acc_no: 'SA' + (i * 10 + j), currency: c === AED ? 'AED' : 'SAR', balance: Math.round(200000 + r() * 1800000) * (j === 2 && i === 1 ? -0.1 : 1), last_txn: add(TODAY, -Math.floor(r() * 90)) })));
  co.forEach(c => db.L.accounts.push({ account: 'Petty Cash - ' + c.slice(0, 2).toUpperCase(), company: c, type: 'Cash', bank: '', acc_no: '', currency: c === AED ? 'AED' : 'SAR', balance: Math.round(5000 + r() * 20000), last_txn: add(TODAY, -2) }));
  db.L.accounts.push({ account: 'Dormant - AC', company: SAR[0], type: 'Bank', bank: 'SNB', acc_no: '', currency: 'SAR', balance: 0, last_txn: '' });
  db.L.moves = []; for (let d = -95; d <= 0; d++) { co.forEach(c => { if (r() < 0.7) { db.L.moves.push({ date: add(TODAY, d), company: c, receipts: Math.round(r() * 120000), payments: Math.round(r() * 110000) }); } }); }
  db.L.pi = []; for (let i = 0; i < 120; i++) { const c = pick(co), due = add(TODAY, Math.floor(r() * 140) - 40); db.L.pi.push({ name: 'ACC-PINV-' + String(i + 1).padStart(4, '0'), company: c, supplier: pick(['Steel Co', 'Gulf Cement', 'Najd Transport', 'Red Sea Paints', 'Eastern Timber', 'Jeddah Glass']), bill_no: 'B' + i, due_date: due, amount: Math.round(3000 + r() * 90000), on_hold: r() < 0.08 ? 1 : 0 }); }
  db.L.si = []; for (let i = 0; i < 90; i++) { const c = pick(co); db.L.si.push({ company: c, due_date: add(TODAY, Math.floor(r() * 120) - 30), amount: Math.round(5000 + r() * 150000) }); }
  db.L.pp = [{ dn: 'TPP-0001', company: SAR[0], label: 'Rent - Head office', date: add(TODAY, -5), amount: 85000, overdue: 1 }, { dn: 'TPP-0002', company: SAR[1], label: 'Loan Repayment - SNB', date: add(TODAY, 9), amount: 240000, overdue: 0 }, { dn: 'TPP-0003', company: SAR[0], label: 'Government Fees', date: add(TODAY, 40), amount: 30000, overdue: 0 }, { dn: 'TPP-0004', company: AED, label: 'Rent - Dubai', date: add(TODAY, 3), amount: 60000, overdue: 0 }];
  db.L.payroll = co.map(c => ({ company: c, date: '2026-11-30', amount: c === AED ? 300000 : 900000, est: 0 }));
  for (let i = 0; i < 9; i++) { db['Expense Claim'].push({ name: 'HR-EXP-' + (i + 1), employee_name: pick(['Omar', 'Sara', 'Khalid', 'Lina']), posting_date: add(TODAY, -i * 6), total_sanctioned_amount: 1500 + i * 700, total_amount_reimbursed: i % 3 === 0 ? 500 : 0, company: pick(co), docstatus: i === 8 ? 0 : 1, status: i === 7 ? 'Paid' : 'Unpaid' }); }
  return db;
}
/* Mirrors the server script: scope, windows, buckets. */
function payload(a, db) {
  const L = db.L, sel = co => (a.company ? co === a.company : SAR.includes(co)), cur = a.company === AED ? 'AED' : 'SAR';
  const acc = L.accounts.filter(x => sel(x.company)).map(x => Object.assign({ balance_ac: x.balance, restricted: 0, available: x.balance }, x)).sort((x, y) => y.balance - x.balance);
  const total = acc.reduce((s, x) => s + x.balance, 0), lookback = Math.min(+a.lookback || 30, 90), horizon = Math.min(+a.horizon || 30, 91), incl = +a.include_overdue_receipts;
  const actual = []; let running = total;
  for (let i = 0; i < lookback; i++) { const d = add(TODAY, -i), m = L.moves.filter(x => x.date === d && sel(x.company)), rc = m.reduce((s, x) => s + x.receipts, 0), pm = m.reduce((s, x) => s + x.payments, 0); actual.push({ date: d, receipts: rc, payments: pm, net: rc - pm, closing: running }); running = running - rc + pm; }
  actual.reverse();
  const ev = [], addEv = (date, kind, cat, amt) => { const od = date < TODAY; if (kind === 'receipt' && od && !incl) { return; } const eff = od ? TODAY : date; if ((Date.parse(eff) - Date.parse(TODAY)) / 864e5 > 90) { return; } ev.push({ eff, kind, cat, amt }); };
  L.si.filter(x => sel(x.company) && x.due_date <= add(TODAY, 90)).forEach(x => addEv(x.due_date, 'receipt', 'receipts', x.amount));
  const pi = L.pi.filter(x => sel(x.company) && x.due_date <= add(TODAY, 90)), ag = { overdue: 0, d0_7: 0, d8_14: 0, d15_30: 0, d31_60: 0, d61_90: 0 }; let held = 0;
  const days = d => Math.round((Date.parse(d) - Date.parse(TODAY)) / 864e5);
  pi.forEach(x => { const n = days(x.due_date); if (x.on_hold) { held += x.amount; } else { addEv(x.due_date, 'payment', 'ap', x.amount); ag[n < 0 ? 'overdue' : n <= 7 ? 'd0_7' : n <= 14 ? 'd8_14' : n <= 30 ? 'd15_30' : n <= 60 ? 'd31_60' : 'd61_90'] += x.amount; } });
  const openAp = L.pi.filter(x => sel(x.company)).reduce((s, x) => s + x.amount, 0); ag.later = Math.max(openAp - held - Object.values(ag).reduce((s, v) => s + v, 0), 0);
  const pay = L.payroll.filter(x => sel(x.company)); pay.forEach(p => addEv(p.date, 'payment', 'payroll', p.amount));
  const pp = L.pp.filter(x => sel(x.company)); pp.forEach(p => addEv(p.date, 'payment', 'other', p.amount));
  const planned = [], map = {}; ev.forEach(e => { const m = map[e.eff] || (map[e.eff] = { receipts: 0, ap: 0, payroll: 0, other: 0 }); m[e.cat] += e.amt; });
  let cum = total; for (let i = 0; i < horizon; i++) { const d = add(TODAY, i), m = map[d] || { receipts: 0, ap: 0, payroll: 0, other: 0 }, out = m.ap + m.payroll + m.other; cum += m.receipts - out; planned.push(Object.assign({ date: d, payments: out, closing: cum }, m)); }
  const weeks = []; let open = total; for (let w = 0; w < 13; w++) { const f = add(TODAY, w * 7), t = add(f, 6), x = { week: w + 1, from: f, to: t, receipts: 0, ap: 0, payroll: 0, other: 0 }; ev.forEach(e => { if (e.eff >= f && e.eff <= t) { x[e.cat] += e.amt; } }); x.opening = open; x.net = x.receipts - x.ap - x.payroll - x.other; open += x.net; x.closing = open; x.below_buffer = open < BUF ? 1 : 0; weeks.push(x); }
  const s7 = k => ev.filter(e => e.kind === k && days(e.eff) < 7).reduce((s, e) => s + e.amt, 0);
  const pdate = pay.length ? pay[0].date : '', pamt = pay.filter(p => p.date === pdate).reduce((s, p) => s + p.amount, 0);
  return { currency: cur, as_of: TODAY, companies: SAR.concat([AED]), selected: a.company || '', excluded: [], company_currency: { [SAR[0]]: 'SAR', [SAR[1]]: 'SAR', [AED]: 'AED' }, other_currency_companies: a.company ? [] : [AED],
    summary: { total_balance: total, restricted: 0, available: total, buffer: BUF, receipts_7d: s7('receipt'), payments_7d: s7('payment'), open_ap: openAp, ap_held: held, payroll_amount: pamt, payroll_date: pdate, payroll_est: 0 },
    accounts: acc, actual_daily: actual, planned_daily: planned, weeks, ap_aging: ag,
    ap_list: pi.map(x => Object.assign({ days: days(x.due_date) }, x)), scheduled: pay.map(p => ({ date: p.date, overdue: 0, cat: 'Payroll', label: 'Payroll - ' + p.company, amount: p.amount, company: p.company, dt: 'Salary Slip', dn: '', est: 0 })).concat(pp.map(p => ({ date: p.date, overdue: p.overdue, cat: 'Other', label: p.label, amount: p.amount, company: p.company, dt: 'Treasury Planned Payment', dn: p.dn, est: 0 }))).sort((x, y) => x.date < y.date ? -1 : 1),
    alerts: (weeks.some(w => w.below_buffer) ? [{ level: 'danger', key: 'buf1', title: 'Projected cash below minimum buffer', text: 'Week x below buffer.' }] : []).concat(ag.overdue > 0 ? [{ level: 'warn', key: 'od' + TODAY, title: 'Overdue supplier payments', text: 'SAR x of AP is past due date.' }] : []) };
}
let lastArgs = null;
run({
  slug: 'treasury', folder: '04. Finance & Credit Control/Treasury Dashboard', build,
  methods: { treasury_dashboard_data: (a, db) => { lastArgs = a; return payload(a, db); } },
  frappe: { prompt: null },
  figures: async (t, H, db) => {
    const P = payload({ lookback: 31, horizon: 13 }, db), sm = P.summary;
    H.assert.equal(lastArgs.lookback, 31); H.assert.equal(lastArgs.horizon, 30); H.ok('default window 30 days back / 30 days ahead → lookback 31, horizon 30');
    const Q = payload({ lookback: 31, horizon: 30 }, db), low = Math.min(...Q.planned_daily.map(r => r.closing));
    H.assert.equal(await t.kpiVal(0), money(Q.summary.total_balance) + 'SAR'); H.ok('cash & bank balance = SAR companies only (' + money(Q.summary.total_balance) + '; the AED company is not added)');
    H.assert.equal(await t.kpiVal(1), money(low) + 'SAR'); H.ok('lowest projected balance = fixture');
    H.assert.equal(await t.kpiVal(2), money(sm.receipts_7d) + 'SAR'); H.assert.equal(await t.kpiVal(3), money(Q.summary.payments_7d) + 'SAR'); H.assert.equal(await t.kpiVal(4), money(sm.open_ap) + 'SAR'); H.ok('7-day receipts, payments and open payables = fixture');
    H.assert.match(await t.$('[data-ref="banner"]').innerText(), /Not included \(other currency\): Alpha Gulf FZE/); H.ok('banner names the other-currency company left out of the group total');
    const ap = Q.ap_list.filter(x => Math.round(x.amount)), od = ap.filter(x => !x.on_hold && x.days < 0).length, d7 = ap.filter(x => !x.on_hold && x.days >= 0 && x.days <= 7).length, hold = ap.filter(x => x.on_hold && x.days < 0).length;
    const ppod = Q.scheduled.filter(x => x.dn && x.overdue).length, pp14 = Q.scheduled.filter(x => x.dn && !x.overdue && x.date <= H.add(TODAY, 14)).length, exp = db['Expense Claim'].filter(x => x.docstatus === 1 && x.status === 'Unpaid').length;
    H.assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(od + d7 + hold + ppod + pp14 + exp)); H.ok('pending = overdue + due-in-7 + held supplier invoices + planned payments + unpaid claims (' + (od + d7 + hold + ppod + pp14 + exp) + ')');
    await t.$('.dms-col-hit').nth(5).hover(); await t.$('.dms-tip:not([hidden])').waitFor(); H.assert.match(await t.$('.dms-tip').innerText(), /Projected closing: SAR/); H.ok('projected balance line has hover values');
  },
  interactions: async (t, H, db) => {
    await t.$('[data-act="tab"][data-v="overview"]').click(); await t.idle();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption(AED); await t.$('[data-act="fapply"]').click(); await t.idle();
    H.assert.equal(lastArgs.company, AED); H.assert.match(await t.kpiVal(0), /AED$/); H.ok('choosing the AED company shows it in AED');
    await t.$('.dms-chip-x').click(); await t.idle();
    await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="month"]').click(); await t.idle();
    H.assert.equal(+lastArgs.lookback, 17); H.assert.equal(+lastArgs.horizon, 13); H.ok('This month → 17 days actual, 13 days forecast');
    await t.$('[data-act="kpi"][data-v="apb:overdue"]').first().click(); await t.idle();
    H.assert.equal(await t.$('#dms-tab-ap').getAttribute('aria-selected'), 'true'); H.assert.equal(await t.$('.dms-bchip.dms-on').getAttribute('data-v'), 'overdue'); H.ok('overdue payables open the Payables tab on the overdue bucket');
    await t.$('[data-tbl="t_sup"] [data-v^="sup:"]').first().click(); await t.$('.dms-modal').waitFor(); H.assert.ok(await t.$('.dms-modal tbody tr').count() > 0); H.assert.match(await t.$('.dms-modal a').first().getAttribute('href'), /purchase-invoice/); await t.page.keyboard.press('Escape'); H.ok('supplier drill-down lists its invoices with links');
    await t.$('[data-act="ack"]').first().click(); await t.page.waitForTimeout(100); H.ok('alerts can be acknowledged');
  },
  quiet: () => { const db = build(); db.L.pi = []; db.L.pp = []; db['Expense Claim'] = []; return db; }
});
