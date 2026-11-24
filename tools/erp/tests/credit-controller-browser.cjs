/* Browser test + screenshot QA for "04. Finance & Credit Control/Credit Controller Dashboard".
   Runs the real block (HTML/CSS/JS) inside a shadow root, like a Frappe Custom HTML Block, against a mock /api/method
   endpoint that evaluates frappe.client.get_list filters, multi-column group_by and count()/sum() over a seeded fixture.
   Expected figures are computed from the raw fixture rows here, independently of the dashboard code.
   Usage: node tools/erp/tests/credit-controller-browser.cjs   (CC_SHOTS=<dir> to change the screenshot folder) */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
let engine; try { engine = require('playwright'); } catch { engine = require('../../../.local/audit/node_modules/playwright'); }
const { chromium } = engine;
const repo = path.resolve(__dirname, '../../..');
const dir = path.join(repo, '04. Finance & Credit Control/Credit Controller Dashboard');
const SHOTS = process.env.CC_SHOTS || path.join(repo, '.local/qa/credit-controller');
const TODAY = '2026-11-17';
const SRC = { html: fs.readFileSync(path.join(dir, 'dashboard.html'), 'utf8'), css: fs.readFileSync(path.join(dir, 'dashboard.css'), 'utf8'), js: fs.readFileSync(path.join(dir, 'dashboard.js'), 'utf8') };

/* ---------- fixture ---------- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const add = (d, n) => iso(Date.parse(d + 'T00:00:00Z') + n * 864e5);
const SAR_COS = ['Alpha Contracting', 'Alpha Trading'], AED_CO = 'Alpha Gulf FZE';
function build() {
  const r = rng(11), pick = a => a[Math.floor(r() * a.length)];
  const DIVS = ['Projects', 'Supply', 'Services'], LOCS = ['CP', 'EP', 'WP'], SPS = ['Ahmed Saleh', 'Sara Qahtani', 'Omar Haddad', 'Lina Farouk'];
  const CUS = ['Al Noor Facilities', 'Gulf Build Co.', 'Najd Logistics', 'Red Sea Marine', 'Eastern Steel', 'Qassim Foods', 'Tihama Retail', 'Sahara Energy', 'Asir Hospitals', 'Delta Systems', 'Oasis Hotels', 'Harbor Works', 'Jazan Agro', 'Hail Cement'];
  const db = { Company: [{ name: SAR_COS[0], default_currency: 'SAR' }, { name: SAR_COS[1], default_currency: 'SAR' }, { name: AED_CO, default_currency: 'AED' }], Division: DIVS.map(n => ({ name: n })),
    Customer: [], 'Customer Credit Limit': [], 'Sales Invoice': [], 'Payment Entry': [] };
  CUS.forEach((c, i) => db.Customer.push({ name: 'CUST-' + String(i + 1).padStart(3, '0'), customer_name: c, custom_collection_status: [null, 'Follow up', 'Critical', null, 'Escalated', null, null][i % 7], custom_sales_person: SPS[i % 4], custom_division: DIVS[i % 3], disabled: i === 13 ? 1 : 0, modified: add('2026-10-01', i) + ' 10:00:00' }));
  const C = db.Customer;
  for (let i = 0; i < 360; i++) {
    const cu = pick(C), co = r() < 0.12 ? AED_CO : pick(SAR_COS), post = add('2025-03-01', Math.floor(Math.pow(r(), 0.6) * 640)), terms = pick([30, 30, 60, 90]), gt = Math.round(5000 + Math.pow(r(), 2) * 240000);
    const paid = r(), out = paid < 0.45 ? 0 : paid < 0.6 ? Math.round(gt * 0.4) : gt;
    db['Sales Invoice'].push({ name: 'ACC-SINV-' + String(i + 1).padStart(4, '0'), customer: cu.name, customer_name: cu.customer_name, company: co, posting_date: post, due_date: add(post, terms), outstanding_amount: out, grand_total: gt, base_grand_total: gt,
      currency: r() < 0.05 ? 'USD' : 'SAR', party_account_currency: r() < 0.04 ? 'USD' : (co === AED_CO ? 'AED' : 'SAR'), custom_division: r() < 0.08 ? null : pick(DIVS), location: pick(LOCS), sales_person: r() < 0.1 ? null : pick(SPS), docstatus: r() < 0.04 ? 2 : r() < 0.04 ? 0 : 1, is_return: 0 });
  }
  // fixed rows for deterministic actions: due soon, credit notes, a future-dated invoice
  db['Sales Invoice'].push({ name: 'ACC-SINV-9001', customer: C[0].name, customer_name: C[0].customer_name, company: SAR_COS[0], posting_date: add(TODAY, -25), due_date: add(TODAY, 3), outstanding_amount: 42000, grand_total: 42000, base_grand_total: 42000, currency: 'SAR', party_account_currency: 'SAR', custom_division: 'Projects', location: 'CP', sales_person: SPS[0], docstatus: 1, is_return: 0 },
    { name: 'ACC-SINV-9002', customer: C[2].name, customer_name: C[2].customer_name, company: SAR_COS[1], posting_date: add(TODAY, -10), due_date: add(TODAY, -10), outstanding_amount: -7500, grand_total: -7500, base_grand_total: -7500, currency: 'SAR', party_account_currency: 'SAR', custom_division: 'Supply', location: 'EP', sales_person: SPS[1], docstatus: 1, is_return: 1 },
    { name: 'ACC-SINV-9003', customer: C[1].name, customer_name: C[1].customer_name, company: SAR_COS[0], posting_date: add(TODAY, 4), due_date: add(TODAY, 34), outstanding_amount: 9999, grand_total: 9999, base_grand_total: 9999, currency: 'SAR', party_account_currency: 'SAR', custom_division: 'Projects', location: 'CP', sales_person: SPS[0], docstatus: 1, is_return: 0 });
  for (let i = 0; i < 300; i++) {
    const cu = pick(C), co = r() < 0.1 ? AED_CO : pick(SAR_COS), d = add('2025-11-01', Math.floor(r() * 382)), a = Math.round(2000 + r() * 90000);
    db['Payment Entry'].push({ name: 'ACC-PAY-' + String(i + 1).padStart(4, '0'), payment_type: r() < 0.08 ? 'Pay' : 'Receive', party_type: r() < 0.05 ? 'Supplier' : 'Customer', party: cu.name, party_name: cu.customer_name, posting_date: d, base_received_amount: a,
      unallocated_amount: r() < 0.12 ? Math.round(a * 0.3) : 0, paid_from_account_currency: co === AED_CO ? 'AED' : 'SAR', mode_of_payment: pick(['Bank Transfer', 'Cheque', 'Cash']), reference_no: 'REF' + i, company: co, location: pick(LOCS), sales_person: pick(SPS), owner: 'accounts@example.com', docstatus: r() < 0.05 ? 2 : 1 });
  }
  C.forEach((cu, i) => SAR_COS.concat([AED_CO]).forEach((co, j) => {
    if ((i + j) % 4 === 3) { return; }
    db['Customer Credit Limit'].push({ name: 'CCL-' + i + '-' + j, parent: cu.name, parenttype: 'Customer', company: co, credit_limit: i % 5 === 4 ? 0 : [60000, 150000, 400000, 90000][(i + j) % 4],
      custom_credit_status: ['Active', 'Active', 'Expired', 'Active', 'Under Review', 'Missing', 'Active'][(i + j) % 7], custom_credit_expiry_date: [add(TODAY, 200), add(TODAY, -20), add(TODAY, 12), null][(i * 3 + j) % 4], custom_credit_type: 'Credit Facility' });
  }));
  return db;
}

/* ---------- mock get_list with Frappe filter semantics (multi-column group_by, aggregates) ---------- */
const nz = x => (x == null ? '' : x);
function cond(x, op, v) {
  const d = s => String(s).slice(0, 10), isNum = typeof v === 'number';
  switch (op) {
    case '=': return nz(x) == v;
    case '!=': return nz(x) != v;
    case 'in': return v.map(String).includes(String(nz(x)));
    case 'between': return x != null && d(x) >= v[0] && d(x) <= v[1];
    case '<=': return x != null && (isNum ? +x <= v : d(x) <= v); case '<': return x != null && (isNum ? +x < v : d(x) < v);
    case '>=': return x != null && (isNum ? +x >= v : d(x) >= v); case '>': return x != null && (isNum ? +x > v : d(x) > v);
    case 'like': return new RegExp('^' + String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i').test(String(nz(x)));
    default: throw new Error('op ' + op);
  }
}
function match(r, f) { const g = f.length === 4 ? f.slice(1) : f; return cond(r[g[0]], g[1], g[2]); }
function getList(db, a) {
  const dt = a.doctype; if (!db[dt]) { throw new Error('unknown doctype ' + dt); }
  let rows = db[dt].filter(r => !a.parent || r.parenttype === a.parent);
  rows = rows.filter(r => (a.filters || []).every(f => match(r, f)));
  if (a.or_filters && a.or_filters.length) { rows = rows.filter(r => a.or_filters.some(f => match(r, f))); }
  const fields = a.fields || ['name']; let out;
  if (fields.some(f => f.includes('('))) {
    const gb = a.group_by ? a.group_by.split(',').map(s => s.trim()) : null, groups = new Map();
    rows.forEach(r => { const k = gb ? JSON.stringify(gb.map(g => r[g])) : '_'; if (!groups.has(k)) { groups.set(k, []); } groups.get(k).push(r); });
    if (!gb && !groups.size) { groups.set('_', []); }
    out = [...groups].map(([, rs]) => { const o = {}; if (gb) { gb.forEach(g => { o[g] = rs[0][g] === undefined ? null : rs[0][g]; }); } fields.forEach(f => { const m = /^(count|sum)\((\w+)\) as (\w+)$/.exec(f); if (m) { o[m[3]] = m[1] === 'count' ? rs.length : (rs.length ? rs.reduce((s, x) => s + (+x[m[2]] || 0), 0) : null); } }); return o; });
  } else { out = rows.map(r => { const o = {}; fields.forEach(f => { o[f] = r[f] === undefined ? null : r[f]; }); return o; }); }
  if (a.order_by) { const [f, dir] = String(a.order_by).split(' '); out.sort((x, y) => (nz(x[f]) < nz(y[f]) ? -1 : nz(x[f]) > nz(y[f]) ? 1 : 0) * (dir === 'desc' ? -1 : 1)); }
  const s = +a.limit_start || 0; return out.slice(s, s + (+a.limit_page_length || 20));
}
function report(name) {
  if (name === 'Over Credit Limit Customer') { return { columns: [{ fieldname: 'customer_code' }], result: [{ customer_code: 'C1', over_credit_limit_customer_count: 1 }, { customer_code: 'C2', over_credit_limit_customer_count: 1 }, { customer_code: 'C3', over_credit_limit_customer_count: 1 }, { customer_code: 'Total', over_credit_limit_customer_count: 3 }] }; }
  return { columns: [{ fieldname: 'sales_person' }], result: [{ sales_person: 'A', total_collection: 1000 }, { sales_person: 'B', total_collection: 2500 }, { sales_person: 'Total', total_collection: 3500 }] };
}

/* ---------- independent expectations ---------- */
const fmt = n => Math.round(n).toLocaleString('en-US');
function money(v) { const a = Math.abs(v), s = v < 0 ? '-' : ''; return s + (a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'K' : Math.round(a).toLocaleString('en-US')); }
const coOk = (x, co) => co ? x.company === co : SAR_COS.includes(x.company);
const siBase = (db, co) => db['Sales Invoice'].filter(s => s.docstatus === 1 && s.party_account_currency === 'SAR' && coOk(s, co));
const open = (db, co) => siBase(db, co).filter(s => s.outstanding_amount > 0 && s.posting_date <= TODAY);
const tot = rows => rows.reduce((t, s) => t + s.outstanding_amount, 0);
const receipts = (db, range, co) => db['Payment Entry'].filter(p => p.docstatus === 1 && p.payment_type === 'Receive' && p.party_type === 'Customer' && coOk(p, co) && p.posting_date >= range[0] && p.posting_date <= range[1]);
function pairsOver(db, co) {
  const out = {}; open(db, co).forEach(s => { const k = s.customer + '|' + s.company; out[k] = (out[k] || 0) + s.outstanding_amount; });
  const lim = {}; db['Customer Credit Limit'].filter(l => !co || l.company === co).forEach(l => { const k = l.parent + '|' + l.company; lim[k] = (lim[k] || 0) + l.credit_limit; });
  return { over: Object.keys(out).filter(k => lim[k] > 0 && out[k] > lim[k]), out, lim };
}
function facility(db, co) {
  const { out } = pairsOver(db, co), rows = db['Customer Credit Limit'].filter(l => (!co || l.company === co) && out[l.parent + '|' + l.company]);
  return rows.filter(l => l.custom_credit_status === 'Expired' || l.custom_credit_status === 'Missing' || l.custom_credit_status === 'Under Review' || (l.custom_credit_expiry_date && l.custom_credit_expiry_date <= add(TODAY, 30))).length;
}
function pending(db, co) {
  const o = open(db, co), od = (lo, hi) => o.filter(s => s.due_date >= add(TODAY, -hi) && s.due_date <= add(TODAY, -lo)).length;
  const flagged = db.Customer.filter(c => ['Follow up', 'Escalated', 'Critical'].includes(c.custom_collection_status) && !c.disabled).length;
  const unalloc = db['Payment Entry'].filter(p => p.docstatus === 1 && p.payment_type === 'Receive' && p.party_type === 'Customer' && coOk(p, co) && p.unallocated_amount > 0 && p.paid_from_account_currency === 'SAR').length;
  const due = o.filter(s => s.due_date >= TODAY && s.due_date <= add(TODAY, 7)).length, cn = siBase(db, co).filter(s => s.outstanding_amount < 0).length;
  return pairsOver(db, co).over.length + o.filter(s => s.due_date < add(TODAY, -90)).length + flagged + facility(db, co) + od(1, 30) + unalloc + due + cn;
}

/* ---------- harness ---------- */
async function openPage(browser, db, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 1000 }, deviceScaleFactor: opts.dpr || 1, reducedMotion: 'reduce', hasTouch: !!opts.touch, isMobile: !!opts.touch, acceptDownloads: true });
  const page = await ctx.newPage(), errors = [], log = [], ctl = { delay: opts.delay || (() => 0), fail: () => false }; let inflight = 0;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) { errors.push(m.text()); } });
  await page.clock.setFixedTime(new Date(TODAY + 'T09:30:00+03:00'));
  await page.route('http://dms.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f3f4f6}html[data-theme=dark] body{background:#0b0f14}</style></head><body><div id="host"></div></body></html>' }));
  if (opts.noFonts) { await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' })); }
  await page.route('**/api/method/**', async route => {
    const req = route.request(), method = req.url().split('/api/method/')[1], a = {};
    for (const [k, v] of new URLSearchParams(req.postData() || '')) { try { a[k] = JSON.parse(v); } catch { a[k] = v; } }
    inflight++; log.push({ method, a });
    try {
      const d = ctl.delay(a, method); if (d) { await new Promise(res => setTimeout(res, d)); }
      if (ctl.fail(a, method)) { await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ exc_type: 'PermissionError', exception: 'frappe.exceptions.PermissionError: Not permitted' }) }); return; }
      if (method === 'frappe.utils.print_format.report_to_pdf') { await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\n% mock\n' }); return; }
      const msg = method === 'frappe.desk.query_report.run' ? report(a.report_name) : getList(db, a);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: msg }) });
    } catch (e) { errors.push('mock: ' + e.message); await route.fulfill({ status: 500, body: '{}' }); } finally { inflight--; }
  });
  await page.goto('http://dms.test/');
  if (opts.lang) { await page.evaluate(l => localStorage.setItem('dms_lang', l), opts.lang); }
  await page.evaluate(src => {
    const sh = document.querySelector('#host').attachShadow({ mode: 'open' }); sh.innerHTML = '<style>' + src.css + '</style>' + src.html;
    window.root_element = sh; window.frappe = { csrf_token: 't', boot: { time_zone: { system: 'Asia/Riyadh' }, sysdefaults: { currency: 'SAR' } }, call() {} };
    new Function(src.js)();
  }, SRC);
  const idle = async () => { for (let i = 0; i < 300; i++) { if (inflight === 0) { await page.waitForTimeout(500); if (inflight === 0) { return; } } await page.waitForTimeout(40); } throw new Error('requests never settled'); };
  const $ = s => page.locator('#host').locator(s);
  const kpiVal = async i => (await $('.dms-ov-kpis .dms-kpi').nth(i).locator('.dms-kpi-n').innerText()).trim();
  const noOverflow = async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  return { ctx, page, errors, log, ctl, idle, $, kpiVal, noOverflow };
}
const box = async l => (await l.boundingBox());

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CC_BROWSER || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined), headless: true });
  const db = build(), month = ['2026-11-01', TODAY], shot = (p, n, o) => p.screenshot(Object.assign({ path: path.join(SHOTS, n + '.png'), fullPage: true }, o || {}));
  let passed = 0, t = null; const ok = m => { passed++; console.log('  ✓ ' + m); };
  try {
    /* 1. loading state, then overview figures */
    t = await openPage(browser, db, { dpr: 2, delay: () => 900 });
    await t.$('.dms-skel-kpi').first().waitFor(); await shot(t.page, 'state-loading-1440', { fullPage: false }); ok('loading skeleton rendered');
    await t.idle(); t.ctl.delay = () => 0;
    const O = open(db), T = tot(O), OD = tot(O.filter(s => s.due_date < TODAY)), O90 = tot(O.filter(s => s.due_date < add(TODAY, -90)));
    assert.equal(await t.kpiVal(0), money(T) + 'SAR'); ok('total outstanding = fixture (SAR ' + money(T) + '; drafts, cancelled, USD party accounts, AED company and future-dated excluded)');
    assert.equal(await t.kpiVal(1), money(OD) + 'SAR'); assert.equal(await t.kpiVal(2), money(O90) + 'SAR'); ok('overdue and > 90 days = fixture');
    const coll = receipts(db, month).reduce((s, p) => s + p.base_received_amount, 0), prevColl = receipts(db, ['2026-10-01', '2026-10-17']).reduce((s, p) => s + p.base_received_amount, 0);
    assert.equal(await t.kpiVal(3), money(coll) + 'SAR'); ok('collected this month = fixture (month to date)');
    assert.match(await t.$('.dms-ov-kpis .dms-kpi').nth(3).locator('.dms-delta').getAttribute('data-tip'), new RegExp('Previous \\(1 Oct – 17 Oct 2026\\): SAR ' + money(prevColl).replace('.', '\\.'))); ok('collection delta compares the same days of last month');
    const PO = pairsOver(db); assert.equal(await t.kpiVal(4), String(PO.over.length)); ok('over credit limit = fixture (' + PO.over.length + ' customer–company pairs, zero limits excluded)');
    const billed = siBase(db).filter(s => s.posting_date >= add(TODAY, -89) && s.posting_date <= TODAY).reduce((x, s) => x + s.base_grand_total, 0);
    assert.equal(await t.kpiVal(5), fmt(T / billed * 90) + 'days'); ok('DSO = outstanding ÷ 90-day net billing × 90 (' + fmt(T / billed * 90) + ' days)');
    assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(pending(db))); ok('pending indicator = fixture (' + pending(db) + ')');
    assert.equal(await t.$('.dms-ov-kpis .dms-kpi').count(), 6); ok('6 KPI cards');
    const [pe, pr, fi, rf, la] = await Promise.all(['[data-act="pending"]', '[data-v="period"]', '[data-v="filters"]', '[data-act="refresh"]', '.dms-lang'].map(s => box(t.$(s))));
    assert.ok(la.x > rf.x && rf.x > fi.x && fi.x > pr.x && pr.x > pe.x); ok('toolbar order right→left: language, refresh, filters, period, pending');
    const hrefs = await t.$('.dms-arow').evaluateAll(a => a.map(x => x.getAttribute('href')));
    assert.ok(hrefs.length >= 6 && hrefs.every(h => /^\/app\/(sales-invoice|customer|payment-entry)\/[^/]+$/.test(h))); ok('actions pending rows link to ERP records (' + hrefs[0] + ')');
    assert.equal(await t.$('.dms-arow .dms-prio-high').first().count(), 1); assert.match(await t.$('.dms-arow').first().innerText(), /High/); ok('most urgent action first');
    assert.equal(await t.$('.dms-acat').count(), 8); ok('8 action categories with counts');
    await t.$('.dms-col').last().hover(); await t.$('.dms-tip:not([hidden])').waitFor(); assert.match(await t.$('.dms-tip').innerText(), /Collected: SAR/); ok('collections chart tooltip shows the value');
    await shot(t.page, 'overview-en-1440');
    assert.equal(t.log.filter(x => x.method === 'frappe.desk.query_report.run').length, 0); ok('native report references are not loaded until opened');
    await t.$('[data-act="recon"]').click(); await t.idle();
    const rec = await t.$('.dms-recon .dms-kpi-n').allInnerTexts(); assert.deepEqual(rec.map(x => x.trim()), ['3', '3,500SAR']); ok('reconciliation loads both native reports on demand and excludes their total row');

    /* 2. drill-downs */
    await t.$('.dms-ov-kpis .dms-kpi').nth(4).click(); await t.$('.dms-modal').waitFor(); await t.idle();
    assert.match(await t.$('.dms-modal .dms-toolbar .dms-sm').first().innerText(), new RegExp('^' + PO.over.length + ' rows'));
    await shot(t.page, 'state-drill-overlimit-1440', { fullPage: false });
    await t.page.keyboard.press('Escape'); assert.equal(await t.$('.dms-modal').count(), 0);
    assert.equal(await t.$('.dms-ov-kpis .dms-kpi').nth(4).evaluate(el => el.getRootNode().activeElement === el), true); ok('over-limit drill-down lists every pair, closes on Escape, restores focus');
    const top = Object.entries(O.reduce((m, s) => { m[s.customer] = (m[s.customer] || 0) + s.outstanding_amount; return m; }, {})).sort((a, b) => b[1] - a[1])[0];
    await t.$('.dms-split-row').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const nTop = O.filter(s => s.customer === top[0]).length;
    assert.match(await t.$('.dms-modal').innerText(), new RegExp(nTop + ' records')); assert.equal(await t.$('.dms-modal a[href="/app/customer/' + top[0] + '"]').count(), 1);
    assert.equal(await t.$('.dms-app').evaluate(el => el.inert), true); ok('top customer opens its ' + nTop + ' open invoices with a link to the customer');
    await t.$('.dms-x').click();
    await t.$('.dms-share-btn').nth(5).click(); await t.idle();
    assert.equal(await t.$('#dms-tab-invoices').getAttribute('aria-selected'), 'true'); assert.equal(await t.$('.dms-bchip.dms-on').getAttribute('data-v'), 'b5');
    const n180 = O.filter(s => s.due_date < add(TODAY, -180)).length; assert.match(await t.$('[data-tbl="t_inv"]').innerText(), new RegExp(fmt(n180) + ' records')); ok('aging row opens the Over 180 days invoices (' + n180 + ')');
    await t.$('[data-tbl="t_inv"] th[data-v="outstanding_amount"]').click(); await t.idle();
    const sorted = await t.$('[data-tbl="t_inv"] tbody tr td:nth-child(7)').allInnerTexts(), nums = sorted.map(x => +x.replace(/,/g, ''));
    assert.deepEqual(nums, nums.slice().sort((a, b) => a - b)); ok('server table sorts by outstanding (ascending after click)');

    /* 3. filters popover, apply, chips */
    await t.$('[data-v="filters"]').click(); await t.$('.dms-pop-filters').waitFor();
    const coOpts = await t.$('select[data-fd="company"] option').allInnerTexts(); assert.ok(!coOpts.includes(AED_CO) && coOpts.includes('Alpha Trading')); ok('only SAR companies are offered');
    await shot(t.page, 'state-filters-open-1440', { fullPage: false });
    await t.$('select[data-fd="company"]').selectOption('Alpha Trading'); await t.$('[data-act="fapply"]').click(); await t.idle();
    await t.$('#dms-tab-overview').click(); await t.idle();
    assert.equal(await t.kpiVal(0), money(tot(open(db, 'Alpha Trading'))) + 'SAR'); assert.equal(await t.$('.dms-chip').count(), 1);
    assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(pending(db, 'Alpha Trading'))); ok('company filter updates KPIs, pending count and chip');
    assert.ok(t.log.filter(x => x.a.doctype === 'Payment Entry').slice(-3).every(x => JSON.stringify(x.a.filters).includes('Alpha Trading'))); ok('receipt queries carry the company filter');

    /* 4. period: only collections reload */
    const before = t.log.length;
    await t.$('[data-v="period"]').click(); await t.$('.dms-pop-period').waitFor(); await shot(t.page, 'state-period-open-1440', { fullPage: false });
    await t.$('[data-act="preset"][data-v="lastMonth"]').click(); await t.idle();
    const after = t.log.slice(before);
    assert.ok(after.length > 0 && after.every(x => x.a.doctype === 'Payment Entry')); ok('period change reloads only receipts (' + after.length + ' requests)');
    assert.equal(await t.kpiVal(3), money(receipts(db, ['2026-10-01', '2026-10-31'], 'Alpha Trading').reduce((s, p) => s + p.base_received_amount, 0)) + 'SAR'); ok('Last month collected = fixture');
    await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="custom"]').click(); await t.$('.dms-cal').waitFor();
    await t.$('[data-act="calnav"][data-v="-1"]').click(); await t.$('[data-act="calday"][data-v="2026-09-01"]').click();
    await t.page.keyboard.press('ArrowRight'); await t.page.keyboard.press('ArrowDown'); await t.page.keyboard.press('ArrowDown'); await t.page.keyboard.press('Enter');
    assert.equal(await t.$('[data-act="calday"].dms-e').getAttribute('data-v'), '2026-09-16'); await shot(t.page, 'state-calendar-1440', { fullPage: false });
    await t.$('[data-act="calapply"]').click(); await t.idle();
    assert.equal(await t.kpiVal(3), money(receipts(db, ['2026-09-01', '2026-09-16'], 'Alpha Trading').reduce((s, p) => s + p.base_received_amount, 0)) + 'SAR'); ok('custom range via calendar keyboard applies');

    /* 5. stale responses cannot overwrite a newer selection */
    t.ctl.delay = a => (JSON.stringify(a.filters || []).includes('Alpha Contracting') ? 1200 : 0);
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('Alpha Contracting'); await t.$('[data-act="fapply"]').click();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('Alpha Trading'); await t.$('[data-act="fapply"]').click();
    await t.page.waitForTimeout(1500); await t.idle(); t.ctl.delay = () => 0;
    assert.equal(await t.kpiVal(0), money(tot(open(db, 'Alpha Trading'))) + 'SAR'); ok('slow responses for an older filter are discarded');
    await t.$('.dms-chip-x').click(); await t.idle(); assert.equal(await t.$('.dms-chip').count(), 0); ok('chip removes the filter');

    /* 6. every tab; tables; CSV */
    for (const id of ['aging', 'invoices', 'limits', 'coll', 'actions', 'overview']) {
      await t.$('[data-act="tab"][data-v="' + id + '"]').click(); await t.idle();
      assert.equal(await t.$('#dms-tab-' + id).getAttribute('aria-selected'), 'true'); assert.ok((await t.$('[data-ref="content"]').innerText()).length > 60, id);
      await shot(t.page, 'tab-' + id + '-1440');
    }
    ok('all 6 sections render');
    await t.$('#dms-tab-aging').click(); await t.idle();
    const foot = await t.$('[data-tbl="t_aging"] tfoot td').allInnerTexts(); assert.equal(foot[7].replace(/,/g, ''), T.toFixed(2)); ok('customer aging footer total = fixture');
    const [dl] = await Promise.all([t.page.waitForEvent('download'), t.$('[data-tbl="t_aging"] [data-act="pdf"]').click()]);
    assert.match(dl.suggestedFilename(), /\.pdf$/); assert.match(fs.readFileSync(await dl.path(), 'latin1'), /^%PDF/);
    const pdf = t.log.filter(x => x.method === 'frappe.utils.print_format.report_to_pdf').pop().a, html = String(pdf.html), nCust = new Set(O.map(s => s.customer)).size;
    assert.match(html, /<img[^>]+2026-08-20/); assert.match(html, /<th>Customer<\/th><th[^>]*>Not yet due<\/th><th[^>]*>1–30 days/);
    assert.equal((html.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr>/g) || []).length, nCust); assert.equal(pdf.orientation, 'Landscape');
    ok('PDF export of the aging table on the DM letterhead (' + nCust + ' customers)');
    await t.$('#dms-tab-limits').click(); await t.idle();
    const pairsN = Object.keys(PO.out).length; assert.match(await t.$('[data-tbl="t_lim"]').innerText(), new RegExp(pairsN + ' rows')); ok('credit-limit table lists every customer–company pair with a balance (' + pairsN + ')');
    await t.$('#dms-tab-coll').click(); await t.idle();
    assert.match(await t.$('[data-tbl="t_pe"]').innerText(), new RegExp('^' + fmt(receipts(db, ['2026-09-01', '2026-09-16']).length) + ' records')); ok('receipts table = fixture for the selected period');
    await t.$('#dms-tab-overview').focus(); await t.page.keyboard.press('ArrowRight'); await t.idle(); assert.equal(await t.$('#dms-tab-aging').getAttribute('aria-selected'), 'true'); ok('arrow keys move between tabs');
    const on = await box(t.$('.dms-tab.dms-on')), off = await box(t.$('.dms-tab:not(.dms-on)').first()); assert.ok(on.y < off.y); ok('active tab raised above inactive tabs');

    /* 7. permission errors are states, not zeros */
    t.ctl.fail = a => a.doctype === 'Customer Credit Limit'; await t.$('#dms-tab-overview').click(); await t.$('[data-ref="refresh"]').click(); await t.idle();
    assert.equal(await t.kpiVal(4), '—'); assert.match(await t.$('.dms-actpanel').innerText(), /Could not load: Over credit limit, Facility renewal/); ok('credit-limit permission error shows "—" and is disclosed in actions');
    await t.$('#dms-tab-limits').click(); await t.idle(); assert.match(await t.$('[data-ref="content"]').innerText(), /Source unavailable: Customer credit limits — permission denied/); await shot(t.page, 'state-limits-error-1440', { fullPage: false }); ok('limits tab names the restricted source');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle(); assert.match(await t.$('[data-ref="content"]').innerText(), /Credit limits and utilisation/); ok('refresh recovers');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* 8. Arabic / RTL / dark */
    t = await openPage(browser, db, { dpr: 2 }); await t.idle();
    await t.$('[data-act="lang"][data-v="ar"]').click(); await t.idle();
    assert.equal(await t.$('[data-dms-root]').getAttribute('dir'), 'rtl'); assert.equal(await t.$('#dms-tab-overview').innerText(), 'نظرة عامة');
    const [pe2, rf2, la2] = await Promise.all(['[data-act="pending"]', '[data-act="refresh"]', '.dms-lang'].map(s => box(t.$(s)))); assert.ok(la2.x < rf2.x && rf2.x < pe2.x); ok('Arabic switches to RTL with a mirrored toolbar');
    await shot(t.page, 'overview-ar-1440');
    await t.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await t.page.waitForTimeout(150); await shot(t.page, 'overview-ar-dark-1440');
    await t.$('[data-act="lang"][data-v="en"]').click(); await t.idle(); await shot(t.page, 'overview-en-dark-1440'); ok('dark theme follows Desk');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* 9. responsive sweep */
    for (const w of [3440, 1920, 1440, 1024, 768, 375, 320]) {
      for (const lang of ['en', 'ar']) {
        t = await openPage(browser, db, { viewport: { width: w, height: w <= 375 ? 812 : w > 1920 ? 1440 : 1000 }, dpr: w === 3440 ? 1 : 2, touch: w <= 768, lang, noFonts: w !== 1440 }); await t.idle();
        assert.ok(await t.noOverflow(), 'no horizontal overflow at ' + w + ' ' + lang);
        const collisions = await t.page.evaluate(() => [...document.querySelector('#host').shadowRoot.querySelectorAll('.dms-xaxis')].flatMap(axis => {
          const rs = [...axis.querySelectorAll('span')].filter(el => getComputedStyle(el).visibility === 'visible').map(el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); }).sort((a, b) => a.left - b.left);
          return rs.filter((r, i) => i && r.left < rs[i - 1].right);
        }).length);
        assert.equal(collisions, 0, 'chart labels overlap at ' + w + ' ' + lang);
        await shot(t.page, 'overview-' + lang + '-' + w);
        if (w <= 768) {
          const small = await t.page.evaluate(() => [...document.querySelector('#host').shadowRoot.querySelectorAll('.dms-topbar button, .dms-tab, .dms-acat, .dms-share-btn, button.dms-split-row')].filter(el => el.getBoundingClientRect().height < 44).map(el => el.className + ':' + el.textContent.slice(0, 20)));
          assert.deepEqual(small, [], 'touch targets ≥ 44px at ' + w + lang);
          await t.$('[data-v="filters"]').click(); await t.$('.dms-pop-filters').waitFor(); const p = await box(t.$('.dms-pop'));
          assert.ok(p.x >= 0 && p.x + p.width <= w + 1, 'filters popover in viewport'); await shot(t.page, 'state-filters-' + lang + '-' + w, { fullPage: false }); await t.page.keyboard.press('Escape');
          await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="custom"]').click(); const c = await box(t.$('.dms-pop'));
          assert.ok(c.x >= 0 && c.x + c.width <= w + 1, 'calendar in viewport'); assert.ok(await t.noOverflow()); await t.page.keyboard.press('Escape');
          for (const id of ['aging', 'invoices', 'limits', 'coll', 'actions']) { await t.$('[data-act="tab"][data-v="' + id + '"]').click(); await t.idle(); assert.ok(await t.noOverflow(), id + ' overflow at ' + w + lang); }
          await shot(t.page, 'tab-actions-' + lang + '-' + w);
          await t.$('[data-act="tab"][data-v="invoices"]').click(); await t.idle(); await shot(t.page, 'tab-invoices-' + lang + '-' + w);
        }
        assert.deepEqual(t.errors, []); await t.ctx.close();
      }
      ok('no overflow, EN + AR at ' + w + 'px');
    }

    /* 10. empty state */
    const quiet = build(); quiet['Sales Invoice'] = []; quiet.Customer.forEach(c => { c.custom_collection_status = null; }); quiet['Payment Entry'].forEach(p => { p.unallocated_amount = 0; });
    t = await openPage(browser, quiet, { noFonts: true }); await t.idle();
    assert.match(await t.$('.dms-actpanel').innerText(), /Nothing pending/); assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '0');
    assert.match(await t.$('[data-ref="content"]').innerText(), /No open receivables/); assert.equal(await t.kpiVal(5), 'N/A'); await shot(t.page, 'state-empty-1440', { fullPage: false }); ok('empty state: nothing pending, no receivables, DSO N/A (not 0)');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    console.log('\ncredit controller: ' + passed + ' checks passed · screenshots in ' + SHOTS);
  } catch (e) { console.error(e); if (t) { console.error('page errors:', t.errors); try { fs.writeFileSync(path.join(SHOTS, 'failure.html'), await t.page.evaluate(() => document.querySelector('#host').shadowRoot.innerHTML)); await shot(t.page, 'failure'); } catch (x) { /* page closed */ } } process.exitCode = 1; } finally { await browser.close(); }
})();
