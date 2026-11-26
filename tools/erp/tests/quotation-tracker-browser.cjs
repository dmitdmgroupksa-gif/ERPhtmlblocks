/* Browser test + screenshot QA for "02. Sales & CRM/Quotation & SO Tracker".
   Runs the real block (HTML/CSS/JS) inside a shadow root, like a Frappe Custom HTML Block, against a mock
   /api/method endpoint that evaluates frappe.client.get_list / get_count filters over a seeded fixture.
   Expected figures are computed from the fixture here, independently of the dashboard code.
   Usage: node tools/erp/tests/quotation-tracker-browser.cjs   (QT_SHOTS=<dir> to change the screenshot folder) */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
let engine; try { engine = require('playwright'); } catch { engine = require('../../../.local/audit/node_modules/playwright'); }
const { chromium } = engine;
const repo = path.resolve(__dirname, '../../..');
const dir = path.join(repo, '02. Sales & CRM/Quotation & SO Tracker');
const SHOTS = process.env.QT_SHOTS || path.join(repo, '.local/qa/quotation-tracker');
const TODAY = '2026-11-17';
const SRC = { html: fs.readFileSync(path.join(dir, 'dashboard.html'), 'utf8'), css: fs.readFileSync(path.join(dir, 'dashboard.css'), 'utf8'), js: fs.readFileSync(path.join(dir, 'dashboard.js'), 'utf8') };

/* ---------- fixture ---------- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const add = (d, n) => iso(Date.parse(d + 'T00:00:00Z') + n * 864e5);
function build() {
  const r = rng(7), pick = a => a[Math.floor(r() * a.length)];
  const COS = ['Alpha Contracting', 'Alpha Trading'], DIVS = ['Projects', 'Supply', 'Services'], LOCS = ['Riyadh', 'Jeddah', 'Dammam'];
  const SPS = ['Ahmed Saleh', 'Sara Qahtani', 'Omar Haddad', 'Lina Farouk', 'Khalid Nasser', 'Rana Aziz'];
  const CUS = ['Al Noor Facilities', 'Gulf Build Co.', 'Najd Logistics', 'Red Sea Marine', 'Eastern Steel', 'Qassim Foods', 'Tihama Retail', 'Sahara Energy', 'Asir Hospitals', 'Delta Systems', 'Oasis Hotels', 'Harbor Works'];
  const db = { Quotation: [], 'Sales Order': [], 'Sales Order Item': [], 'Sales Team': [], 'Sales Person': [], BDM: [], Division: [], Lead: [], Customer: [], Opportunity: [], ToDo: [] };
  SPS.forEach((n, i) => db['Sales Person'].push({ name: n, enabled: 1, is_group: 0, custom_sales_persons_bdm: i < 3 ? 'BDM North' : 'BDM West', custom__sales_monthly_target: 400000 + i * 50000, custom_bdm_team_target_: 0 }));
  db.BDM.push({ name: 'BDM North', sales_person: SPS[0], type_bdm: 'Regional' }, { name: 'BDM West', sales_person: SPS[3], type_bdm: 'Regional' });
  DIVS.forEach(d => db.Division.push({ name: d }));
  const WFS = [['Approved', 25], ['Accepted By Customer', 20], ['Rejected By Customer', 10], ['Lost', 8], ['Closed', 7], ['Review With Sales Manager', 8], ['Pending', 5], ['cancelled', 2], ['Make Sales Order from Customer Accepted Quotation', 5]];
  const wTot = WFS.reduce((s, w) => s + w[1], 0);
  const wf = () => { let x = r() * wTot; for (const w of WFS) { if ((x -= w[1]) < 0) { return w[0]; } } return 'Approved'; };
  const start = Date.parse('2024-11-01T00:00:00Z'), span = (Date.parse(TODAY + 'T00:00:00Z') - start) / 864e5;
  for (let i = 0; i < 1000; i++) {
    const date = add('2024-11-01', Math.floor(Math.pow(r(), 0.8) * (span + 1))), w = wf(), cust = pick(CUS);
    const draft = w === 'Approved' || /Review|Pending/.test(w);
    const q = { name: 'QTN-' + String(i + 1).padStart(4, '0'), transaction_date: date, valid_till: add(date, 30), workflow_state: w, docstatus: r() < 0.03 ? 2 : draft ? 0 : 1, status: 'Open',
      sales_person: r() < 0.06 ? null : pick(SPS), quotation_to: 'Customer', party_name: cust, customer_name: cust, company: pick(COS), custom_division: r() < 0.05 ? null : pick(DIVS), location: pick(LOCS),
      base_net_total: Math.round((20000 + Math.pow(r(), 2) * 900000) / 10) * 10 };
    if (q.valid_till < TODAY && q.docstatus === 1 && /Accepted|Make Sales/.test(w)) { q.status = 'Expired'; }
    db.Quotation.push(q);
  }
  let so = 0;
  const mkSO = (date, cust, co, div, loc, val, qname, i) => {
    const name = 'SO-' + String(++so).padStart(4, '0'), st = pick(['To Deliver and Bill', 'To Deliver and Bill', 'To Bill', 'Completed', 'Completed', 'To Deliver', 'Closed']);
    const s = { name, transaction_date: date, delivery_date: add(date, 10 + Math.floor(r() * 40)), status: st, docstatus: r() < 0.04 ? 2 : r() < 0.03 ? 0 : 1, customer: cust, customer_name: cust, company: co, custom_division: div, location_: loc,
      sales_persons: '', base_net_total: val, per_delivered: st === 'Completed' || st === 'To Bill' ? 100 : st === 'To Deliver' ? 40 : 0, per_billed: st === 'Completed' ? 100 : st === 'To Deliver' ? 100 : 0, amended_from: null };
    if (s.docstatus === 2) { s.status = 'Cancelled'; }
    const a = Math.round(val * 0.6);
    db['Sales Order Item'].push({ parent: name, parenttype: 'Sales Order', prevdoc_docname: qname, base_net_amount: a, docstatus: s.docstatus }, { parent: name, parenttype: 'Sales Order', prevdoc_docname: qname, base_net_amount: val - a, docstatus: s.docstatus });
    const p1 = pick(SPS), team = r() < 0.25 ? [[p1, 60], [pick(SPS.filter(x => x !== p1)), 40]] : [[p1, 100]];
    if (r() < 0.05) { team.length = 0; }
    team.forEach(t => db['Sales Team'].push({ name: 'TEAM-' + db['Sales Team'].length, parent: name, parenttype: 'Sales Order', sales_person: t[0], allocated_percentage: t[1] }));
    s.sales_persons = team.map(t => t[0]).join(', ');
    db['Sales Order'].push(s); return s;
  };
  db.Quotation.forEach((q, i) => {
    if (q.docstatus === 1 && /Accepted|Make Sales/.test(q.workflow_state) && r() < 0.7) {
      const d = add(q.transaction_date, Math.floor(r() * 10)); if (d > TODAY) { return; }
      mkSO(d, q.customer_name, q.company, q.custom_division, q.location, Math.round(q.base_net_total * (0.8 + r() * 0.3)), q.name, i); q.status = 'Ordered';
    }
  });
  for (let i = 0; i < 70; i++) { const d = add('2024-11-01', Math.floor(r() * (span + 1))); mkSO(d, pick(CUS), pick(COS), pick(DIVS), pick(LOCS), Math.round(30000 + r() * 400000), null, i); }
  db['Sales Order Item'].forEach(x => { if (!x.prevdoc_docname) { x.prevdoc_docname = null; } });
  CUS.forEach((c, i) => db.Customer.push({ name: c, customer_name: c, customer_group: pick(['Commercial', 'Government', 'Individual']), territory: pick(['Riyadh', 'Western', 'Eastern']), custom_sales_person: pick(SPS),
    custom_customer_account_status: pick(['Active', 'Active', 'On hold']), custom_collection_status: [null, 'Follow up', 'Critical', null, 'Escalated', null][i % 6], disabled: 0, creation: add('2025-01-01', i * 20) + ' 10:00:00', modified: add('2026-10-01', i) + ' 10:00:00' }));
  for (let i = 0; i < 70; i++) {
    db.Lead.push({ name: 'CRM-LEAD-' + String(i + 1).padStart(4, '0'), lead_name: 'Lead ' + (i + 1), company_name: pick(CUS), source: pick(['Website', 'Referral', 'Exhibition', null]), status: pick(['Lead', 'Open', 'Replied', 'Do Not Contact']),
      qualification_status: 'Unqualified', custom_allocation_status: pick([null, 'Non Allocated', 'Allocated', 'Allocated', 'Irrelevant']), lead_owner: pick(SPS), custom_sales_person_: pick(SPS), customer: null, custom_expected_value: 0, company: pick(COS),
      creation: add('2026-01-05', Math.floor(r() * 300)) + ' 09:00:00' });
  }
  for (let i = 0; i < 5; i++) { db.Opportunity.push({ name: 'CRM-OPP-' + (i + 1), party_name: pick(CUS), opportunity_from: 'Customer', status: i < 4 ? 'Open' : 'Lost', transaction_date: add('2026-09-01', i * 9), modified: add('2026-11-01', i) }); }
  [['High', add(TODAY, -3)], ['Medium', add(TODAY, 4)], ['Low', null], ['High', add(TODAY, 2)]].forEach((t, i) => db.ToDo.push({ name: 'todo' + (i + 1), description: '<p>Follow up ' + CUS[i] + ' on revised offer</p>', allocated_to: SPS[i] + '@example.com', date: t[1], priority: t[0], reference_type: 'Quotation', reference_name: db.Quotation[i].name, status: 'Open', modified: add('2026-11-10', i) }));
  return db;
}

/* ---------- mock get_list / get_count with Frappe filter semantics ---------- */
const nz = x => (x == null ? '' : x);
function cond(x, op, v) {
  const d = s => String(s).slice(0, 10);
  switch (op) {
    case '=': return nz(x) == v;
    case '!=': return nz(x) != v;           // Frappe wraps != with ifnull(field, '')
    case 'in': return v.map(String).includes(String(nz(x)));
    case 'not in': return !v.map(String).includes(String(nz(x)));
    case 'between': return x != null && d(x) >= v[0] && d(x) <= v[1];
    case '<=': return x != null && d(x) <= v; case '<': return x != null && d(x) < v;
    case '>=': return x != null && d(x) >= v; case '>': return x != null && d(x) > v;
    case 'is': return v === 'set' ? nz(x) !== '' : nz(x) === '';
    case 'Timespan': return x != null && (v === 'today' ? d(x) === TODAY : v === 'this year' ? d(x).slice(0, 4) === TODAY.slice(0, 4) : (() => { throw new Error('timespan ' + v); })());
    case 'like': return new RegExp('^' + String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i').test(String(nz(x)));
    default: throw new Error('op ' + op);
  }
}
function match(db, dt, r, f) {
  if (f.length === 4 && f[0] !== dt) { const children = db[f[0]].filter(c => c.parent === r.name); return children.length ? children.some(c => cond(c[f[1]], f[2], f[3])) : cond(null, f[2], f[3]); }   // child-table filter
  const g = f.length === 4 ? f.slice(1) : f; return cond(r[g[0]], g[1], g[2]);
}
function getList(db, a) {
  const dt = a.doctype; let rows = (db[dt] || []).filter(r => !a.parent || r.parenttype === a.parent);
  rows = rows.filter(r => (a.filters || []).every(f => match(db, dt, r, f)));
  if (a.or_filters && a.or_filters.length) { rows = rows.filter(r => a.or_filters.some(f => match(db, dt, r, f))); }
  const fields = a.fields || ['name']; let out;
  if (fields.some(f => f.includes('('))) {
    const gb = a.group_by, groups = new Map();
    rows.forEach(r => { const k = gb ? r[gb] : '_'; if (!groups.has(k)) { groups.set(k, []); } groups.get(k).push(r); });
    if (!gb && !groups.size) { groups.set('_', []); }
    out = [...groups].map(([k, rs]) => { const o = {}; if (gb) { o[gb] = k; } fields.forEach(f => { const m = /^(count|sum)\((\w+)\) as (\w+)$/.exec(f); if (m) { o[m[3]] = m[1] === 'count' ? rs.length : (rs.length ? rs.reduce((s, x) => s + (+x[m[2]] || 0), 0) : null); } }); return o; });
  } else { out = rows.map(r => { const o = {}; fields.forEach(f => { o[f] = r[f] === undefined ? null : r[f]; }); return o; }); }
  if (a.order_by) { const [f, dir] = String(a.order_by).split(' '); out.sort((x, y) => (nz(x[f]) < nz(y[f]) ? -1 : nz(x[f]) > nz(y[f]) ? 1 : 0) * (dir === 'desc' ? -1 : 1)); }
  const s = +a.limit_start || 0; return out.slice(s, s + (+a.limit_page_length || 20));
}

/* ---------- independent expectations ---------- */
const inR = (d, r) => d >= r[0] && d <= r[1];
const fmt = n => Math.round(n).toLocaleString('en-US');
function money(v) { const a = Math.abs(v); return a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'K' : Math.round(a).toLocaleString('en-US'); }
function expQuotes(db, r, co) { return db.Quotation.filter(q => inR(q.transaction_date, r) && q.docstatus !== 2 && q.workflow_state !== 'cancelled' && (!co || q.company === co)).length; }
function expSO(db, r, co) { return db['Sales Order'].filter(s => inR(s.transaction_date, r) && s.docstatus === 1 && (!co || s.company === co)).reduce((t, s) => t + s.base_net_total, 0); }
function expPending(db, co) {
  const Q = db.Quotation.filter(q => !co || q.company === co), S = db['Sales Order'].filter(s => s.docstatus === 1 && (!co || s.company === co));
  return Q.filter(q => q.docstatus === 1 && ['Open', 'Expired'].includes(q.status) && ['Accepted By Customer', 'Make Sales Order from Customer Accepted Quotation'].includes(q.workflow_state)).length +
    Q.filter(q => q.docstatus === 0 && q.workflow_state === 'Approved' && q.transaction_date >= add(TODAY, -90) && q.valid_till <= add(TODAY, 14)).length +
    S.filter(s => ['To Deliver', 'To Deliver and Bill'].includes(s.status) && s.delivery_date < TODAY).length + S.filter(s => s.status === 'To Bill').length +
    db.Customer.filter(c => ['Follow up', 'Critical', 'Escalated'].includes(c.custom_collection_status)).length + db.ToDo.filter(t => t.status === 'Open').length +
    db.Lead.filter(l => l.status !== 'Do Not Contact' && ['', 'Non Allocated'].includes(nz(l.custom_allocation_status))).length + db.Opportunity.filter(o => o.status === 'Open').length;
}

/* ---------- harness ---------- */
async function open(browser, db, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 1000 }, deviceScaleFactor: opts.dpr || 1, reducedMotion: 'reduce', hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const page = await ctx.newPage(), errors = [], log = [], ctl = { delay: () => 0, fail: () => false }; let inflight = 0;
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
      const d = ctl.delay(a); if (d) { await new Promise(res => setTimeout(res, d)); }
      if (ctl.fail(a)) { await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ exc_type: 'PermissionError', exception: 'frappe.exceptions.PermissionError: Not permitted' }) }); return; }
      const msg = method === 'frappe.client.get_count' ? getList(db, { doctype: a.doctype, filters: a.filters, fields: ['count(name) as n'], limit_page_length: 1 })[0].n : getList(db, a);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: msg }) });
    } catch (e) { errors.push('mock: ' + e.message); await route.fulfill({ status: 500, body: '{}' }); } finally { inflight--; }
  });
  await page.goto('http://dms.test/');
  if (opts.lang) { await page.evaluate(l => localStorage.setItem('dms_lang', l), opts.lang); }
  await page.evaluate(src => {
    const sh = document.querySelector('#host').attachShadow({ mode: 'open' }); sh.innerHTML = '<style>' + src.css + '</style>' + src.html;
    window.root_element = sh; window.frappe = { csrf_token: 't', boot: { time_zone: { system: 'Asia/Riyadh' } }, call() {} };
    new Function(src.js)();
  }, SRC);
  const idle = async () => { for (let i = 0; i < 300; i++) { if (inflight === 0) { await page.waitForTimeout(1100); if (inflight === 0) { return; } } await page.waitForTimeout(60); } throw new Error('requests never settled'); };
  const $ = s => page.locator('#host').locator(s);
  const kpiVal = async i => (await $('.dms-ov-kpis .dms-kpi').nth(i).locator('.dms-kpi-n').innerText()).trim();
  const noOverflow = async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  return { ctx, page, errors, log, ctl, idle, $, kpiVal, noOverflow };
}
const box = async l => (await l.boundingBox());

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.QT_BROWSER || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined), headless: true });
  const db = build(), ytd = ['2026-01-01', TODAY], shot = (p, n, o) => p.screenshot(Object.assign({ path: path.join(SHOTS, n + '.png'), fullPage: true }, o || {}));
  let passed = 0; const ok = m => { passed++; console.log('  ✓ ' + m); };
  try {
    /* 1. loading state, then overview figures */
    let t = await open(browser, db, { viewport: { width: 1440, height: 1000 }, dpr: 2 });
    t.ctl.delay = () => 900;
    await t.$('.dms-skel-kpi').first().waitFor(); await shot(t.page, 'state-loading-1440', { fullPage: false }); ok('loading skeleton rendered');
    await t.idle(); t.ctl.delay = () => 0;
    assert.equal(await t.kpiVal(0), fmt(expQuotes(db, ytd)), 'quotations KPI'); ok('quotations KPI = fixture (' + fmt(expQuotes(db, ytd)) + ')');
    assert.equal(await t.kpiVal(1), money(expSO(db, ytd)) + 'SAR', 'SO value KPI'); ok('sales-order value KPI = fixture');
    assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(expPending(db)), 'pending total'); ok('pending indicator = fixture (' + expPending(db) + ')');
    assert.equal(await t.$('.dms-ov-kpis .dms-kpi').count(), 6); assert.equal(await t.$('.dms-ov-kpis .dms-spark').count() >= 3, true); ok('6 KPI cards, sparklines from monthly series');
    assert.equal(await t.$('.dms-ov-kpis .dms-delta').count(), 2); ok('comparison deltas on count and value cards');
    const [pe, pr, fi, rf, la] = await Promise.all(['[data-act="pending"]', '[data-v="period"]', '[data-v="filters"]', '[data-act="refresh"]', '.dms-lang'].map(s => box(t.$(s))));
    assert.ok(la.x > rf.x && rf.x > fi.x && fi.x > pr.x && pr.x > pe.x, 'toolbar order (right → left): language, refresh, filters, period, pending'); ok('toolbar order right→left: language, refresh, filters, period, pending');
    const href = await t.$('.dms-arow').first().getAttribute('href'); assert.match(href, /^\/app\/(quotation|sales-order|customer|todo|lead|opportunity)\/[^/]+$/); ok('pending action rows link to ERP records (' + href + ')');
    await t.$('.dms-col').nth(3).hover(); await t.$('.dms-tip:not([hidden])').waitFor(); assert.match(await t.$('.dms-tip').innerText(), /Quoted value: SAR/); ok('chart tooltip shows bucket values');
    await shot(t.page, 'overview-en-1440');
    await t.$('.dms-ov-kpis .dms-kpi').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
    const m = await box(t.$('.dms-modal')); assert.ok(m.y >= 0 && m.y + 40 < 1000, 'modal within viewport'); assert.ok(await t.$('.dms-modal .dms-table tbody tr').count() > 0);
    assert.equal(await t.$('.dms-modal').getAttribute('aria-labelledby'), 'dms-dialog-title');
    await t.$('.dms-x').focus(); await t.page.keyboard.press('Shift+Tab');
    assert.equal(await t.$('.dms-modal').evaluate(el => el.contains(el.getRootNode().activeElement)), true);
    await t.page.keyboard.press('Tab'); assert.equal(await t.$('.dms-x').evaluate(el => el.getRootNode().activeElement === el), true);
    assert.equal(await t.$('.dms-app').evaluate(el => el.inert), true); ok('named modal contains forward/backward focus and isolates background');
    await shot(t.page, 'state-drilldown-1440', { fullPage: false }); await t.page.keyboard.press('Escape'); assert.equal(await t.$('.dms-modal').count(), 0); ok('KPI drill-down modal opens in the viewport, closes on Escape');
    assert.equal(await t.$('.dms-ov-kpis .dms-kpi').first().evaluate(el => el.getRootNode().activeElement === el), true); ok('closing drill-down restores the KPI opener');
    await t.$('[data-act="pending"]').click(); await t.page.waitForTimeout(200);
    assert.equal(await t.page.evaluate(() => document.querySelector('#host').shadowRoot.activeElement.id), 'dms-pending'); ok('pending indicator focuses the actions panel');

    /* 2. filters popover, dependent options, apply, chips */
    await t.$('[data-v="filters"]').click(); await t.$('.dms-pop-filters').waitFor();
    await shot(t.page, 'state-filters-open-1440', { fullPage: false });
    await t.$('select[data-fd="company"]').selectOption('Alpha Trading');
    const divOpts = await t.$('select[data-fd="division"] option').allInnerTexts(); assert.ok(divOpts.includes('Projects'));
    await t.$('[data-act="fapply"]').click(); await t.idle();
    assert.equal(await t.kpiVal(0), fmt(expQuotes(db, ytd, 'Alpha Trading'))); assert.equal(await t.$('.dms-count').innerText(), '1'); assert.equal(await t.$('.dms-chip').count(), 1);
    assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), fmt(expPending(db, 'Alpha Trading'))); ok('company filter updates KPIs, pending count, badge and chip');
    const soAct = t.log.filter(x => x.a.doctype === 'Sales Order' && JSON.stringify(x.a.filters || []).includes('"To Bill"')).pop();
    assert.ok(JSON.stringify(soAct.a.filters).includes('Alpha Trading')); ok('action queries carry the company filter');

    /* 3. refresh keeps filters */
    const n0 = t.log.length; await t.$('[data-act="refresh"]').click(); await t.idle();
    assert.ok(t.log.length > n0 + 5); assert.equal(await t.$('.dms-chip').count(), 1); assert.equal(await t.kpiVal(0), fmt(expQuotes(db, ytd, 'Alpha Trading'))); ok('refresh reloads data and keeps filters');

    /* 4. period presets and custom range */
    await t.$('[data-v="period"]').click(); await t.$('.dms-pop-period').waitFor(); await shot(t.page, 'state-period-open-1440', { fullPage: false });
    await t.$('[data-act="preset"][data-v="lastMonth"]').click(); await t.idle();
    assert.ok(t.log.some(x => x.a.doctype === 'Quotation' && JSON.stringify(x.a.filters || []).includes('["transaction_date","between",["2026-10-01","2026-10-31"]]')));
    assert.equal(await t.kpiVal(0), fmt(expQuotes(db, ['2026-10-01', '2026-10-31'], 'Alpha Trading'))); ok('Last month preset reloads with 2026-10-01 → 2026-10-31');
    await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="custom"]').click(); await t.$('.dms-cal').waitFor();
    await t.$('[data-act="calnav"][data-v="-1"]').click(); await t.$('[data-act="calday"][data-v="2026-09-01"]').click();
    await shot(t.page, 'state-calendar-midpick-1440', { fullPage: false });
    await t.page.keyboard.press('ArrowRight'); await t.page.keyboard.press('ArrowDown'); await t.page.keyboard.press('ArrowDown'); await t.page.keyboard.press('Enter');   // 09-02 → 09-16
    assert.equal(await t.$('[data-act="calday"].dms-e').getAttribute('data-v'), '2026-09-16'); await shot(t.page, 'state-calendar-complete-1440', { fullPage: false }); ok('calendar keyboard navigation and range selection');
    await t.$('[data-act="calapply"]').click(); await t.idle();
    assert.equal(await t.kpiVal(0), fmt(expQuotes(db, ['2026-09-01', '2026-09-16'], 'Alpha Trading'))); assert.match(await t.$('.dms-period-r').innerText(), /1.*16 Sept? 2026/); ok('custom range applies and shows in the control');

    /* 5. stale responses cannot overwrite a newer selection */
    await t.$('[data-act="preset"]').count(); await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="ytd"]').click(); await t.idle();
    t.ctl.delay = a => (JSON.stringify(a.filters || []).includes('Alpha Contracting') && /count\(name\)/.test(JSON.stringify(a.fields || [])) ? 1500 : 0);
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('Alpha Contracting'); await t.$('[data-act="fapply"]').click();
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="company"]').selectOption('Alpha Trading'); await t.$('[data-act="fapply"]').click();
    await t.page.waitForTimeout(1800); await t.idle(); t.ctl.delay = () => 0;
    assert.match(await t.$('.dms-recon .dms-stat').innerText(), /Matches ERP/);
    assert.match(await t.$('.dms-ov-kpis .dms-kpi').first().locator('.dms-delta').getAttribute('data-tip'), new RegExp(': ' + fmt(expQuotes(db, ytd, 'Alpha Trading')) + '\\n')); ok('slow responses for an older filter are discarded (reconciliation, deltas)');
    await t.$('.dms-chip-x').click(); await t.idle(); assert.equal(await t.$('.dms-chip').count(), 0); ok('chip removes the filter');

    /* 6. tabs: every section renders; arrow keys; browser-tab geometry */
    for (const id of ['leads', 'customers', 'quotes', 'orders', 'conv', 'team', 'actions', 'overview']) {
      await t.$('[data-act="tab"][data-v="' + id + '"]').click(); await t.idle();
      assert.equal(await t.$('#dms-tab-' + id).getAttribute('aria-selected'), 'true'); assert.ok((await t.$('[data-ref="content"]').innerText()).length > 40, id + ' content');
    }
    ok('all 8 sections render');
    /* Sales Operations: the old Sales Operation / Quotation Team card filters, counted under the viewer's permissions */
    await t.$('[data-act="tab"][data-v="ops"]').click(); await t.idle(); await t.page.waitForTimeout(300); await t.idle();
    const opsTxt = await t.$('[data-ref="content"]').innerText(), hold = db['Sales Order'].filter(s => s.status === 'On Hold').length;
    const nd = db['Sales Order'].filter(s => s.delivery_status === 'Not Delivered' && s.per_billed != 100 && !['cancelled', 'Pending'].includes(s.workflow_state || '') && !['On Hold', 'Closed'].includes(s.status)).length;
    assert.match(opsTxt, new RegExp('On hold\\s*' + hold + '\\b')); assert.match(opsTxt, new RegExp('Not delivered\\s*' + nd + '\\b')); assert.doesNotMatch(opsTxt, /Unavailable/);
    assert.match(opsTxt, /Sales orders and invoices by location\s*(Location|No data)/); assert.ok(await t.noOverflow()); await shot(t.page, 'tab-ops-1440');
    ok('Sales Operations: old card filters counted live (on hold ' + hold + ', not delivered ' + nd + '), location table');
    const on = await box(t.$('.dms-tab.dms-on')), off = await box(t.$('.dms-tab:not(.dms-on)').first()); assert.ok(on.y < off.y, 'active tab sits higher'); ok('active tab raised above inactive tabs');
    await t.$('#dms-tab-overview').focus(); await t.page.keyboard.press('ArrowRight'); await t.idle();
    assert.equal(await t.$('#dms-tab-leads').getAttribute('aria-selected'), 'true'); await t.page.keyboard.press('Home'); await t.idle(); ok('arrow / Home keys move between tabs');

    /* 7. permission errors and retry in Actions pending */
    t.ctl.fail = a => ['Opportunity', 'ToDo'].includes(a.doctype); await t.$('[data-act="refresh"]').click(); await t.idle();
    assert.match(await t.$('.dms-actpanel').innerText(), /Could not load: Open ToDos, Open opportunities/); ok('partial permission errors are disclosed, not shown as 0');
    const isAction = a => a.limit_page_length === 6 || (JSON.stringify(a.fields) === '["count(name) as n"]' && !JSON.stringify(a.filters || []).includes('between'));
    t.ctl.fail = isAction; await t.$('[data-act="refresh"]').click(); await t.idle();
    await t.$('[data-act="actretry"]').waitFor(); await shot(t.page, 'state-actions-error-1440', { fullPage: false });
    t.ctl.fail = () => false; await t.$('[data-act="actretry"]').click(); await t.idle();
    assert.ok(await t.$('.dms-arow').count() > 0); ok('error state with working Retry');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* 8. Arabic / RTL */
    t = await open(browser, db, { viewport: { width: 1440, height: 1000 }, dpr: 2 }); await t.idle();
    await t.$('[data-act="lang"][data-v="ar"]').click(); await t.idle();
    assert.equal(await t.$('[data-dms-root]').getAttribute('dir'), 'rtl'); assert.equal(await t.$('#dms-tab-overview').innerText(), 'نظرة عامة');
    const [pe2, rf2, la2] = await Promise.all(['[data-act="pending"]', '[data-act="refresh"]', '.dms-lang'].map(s => box(t.$(s)))); assert.ok(la2.x < rf2.x && rf2.x < pe2.x, 'mirrored in RTL'); ok('Arabic switches to RTL with a mirrored toolbar');
    await shot(t.page, 'overview-ar-1440');
    await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="custom"]').click(); await t.$('.dms-cal').waitFor();
    const pop = await box(t.$('.dms-pop')); assert.ok(pop.x >= 0 && pop.x + pop.width <= 1440); await shot(t.page, 'state-calendar-ar-1440', { fullPage: false }); ok('Arabic calendar opens inside the viewport');
    await t.page.keyboard.press('Escape'); assert.equal(await t.$('.dms-pop').count(), 0); ok('Escape closes the popover');
    await t.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await t.page.waitForTimeout(150); await shot(t.page, 'overview-ar-dark-1440');
    await t.$('[data-act="lang"][data-v="en"]').click(); await t.idle(); await shot(t.page, 'overview-en-dark-1440'); ok('dark theme follows Desk');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* 9. responsive sweep: overflow + screenshots */
    for (const w of [3440, 1920, 1440, 1024, 768, 375, 320]) {
      for (const lang of ['en', 'ar']) {
        t = await open(browser, db, { viewport: { width: w, height: w === 375 ? 812 : w > 1920 ? 1440 : 1000 }, dpr: w === 3440 ? 1 : 2, touch: w <= 768, lang }); await t.idle();
        assert.ok(await t.noOverflow(), 'no horizontal overflow at ' + w + ' ' + lang);
        const tb = await box(t.$('.dms-topbar')); assert.ok(tb.width <= w, 'toolbar fits');
        const collisions = await t.page.evaluate(() => {
          const sh = document.querySelector('#host').shadowRoot;
          return [...sh.querySelectorAll('.dms-xaxis')].flatMap(axis => {
            const ranges = [...axis.querySelectorAll('span')].filter(el => getComputedStyle(el).visibility === 'visible').map(el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); }).sort((a, b) => a.left - b.left);
            return ranges.filter((r, i) => i && r.left < ranges[i - 1].right);
          }).length;
        });
        assert.equal(collisions, 0, 'chart labels do not overlap at ' + w + ' ' + lang);
        await shot(t.page, 'overview-' + lang + '-' + w);
        if (w <= 768) {
          const smallTargets = await t.page.evaluate(() => [...document.querySelector('#host').shadowRoot.querySelectorAll('.dms-topbar button, .dms-tab')].filter(el => el.getBoundingClientRect().height < 44).map(el => el.textContent));
          assert.deepEqual(smallTargets, [], 'touch toolbar and tabs ≥ 44px');
          await t.$('[data-v="filters"]').click(); await t.$('.dms-pop-filters').waitFor(); const p = await box(t.$('.dms-pop'));
          assert.ok(p.x >= 0 && p.x + p.width <= w + 1, 'filters popover in viewport ' + w + lang); await shot(t.page, 'state-filters-' + lang + '-' + w, { fullPage: false });
          await t.page.keyboard.press('Escape');
          await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="custom"]').click(); const c = await box(t.$('.dms-pop'));
          assert.ok(c.x >= 0 && c.x + c.width <= w + 1, 'calendar in viewport ' + w + lang); assert.ok(await t.noOverflow());
          assert.equal(await t.$('.dms-cal').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'calendar has no inner overflow');
          await shot(t.page, 'state-calendar-' + lang + '-' + w, { fullPage: false }); await t.page.keyboard.press('Escape');
        }
        assert.deepEqual(t.errors, []); await t.ctx.close();
      }
      ok('no overflow, EN + AR at ' + w + 'px');
    }

    /* 10. empty state (nothing actionable) */
    const quiet = build(); quiet.Customer.forEach(c => { c.custom_collection_status = null; }); quiet.ToDo = []; quiet.Opportunity = []; quiet.Lead = [];
    quiet.Quotation = quiet.Quotation.filter(q => !(q.docstatus === 1 && /Accepted|Make Sales/.test(q.workflow_state)) && q.workflow_state !== 'Approved');
    quiet['Sales Order'].forEach(s => { if (s.docstatus === 1) { s.status = 'Completed'; } });
    t = await open(browser, quiet); await t.idle();
    assert.match(await t.$('.dms-actpanel').innerText(), /Nothing pending/); assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '0'); await shot(t.page, 'state-empty-1440', { fullPage: false }); ok('empty state when nothing is pending');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* 11. Unassigned Sales Team scope applies to counts, rows and drill-downs. */
    t = await open(browser, db, { noFonts: true }); await t.idle();
    const withoutTeam = s => !db['Sales Team'].some(c => c.parent === s.name);
    const overdue = db['Sales Order'].filter(s => s.docstatus === 1 && ['To Deliver', 'To Deliver and Bill'].includes(s.status) && s.delivery_date < TODAY && withoutTeam(s));
    const toBill = db['Sales Order'].filter(s => s.docstatus === 1 && s.status === 'To Bill' && withoutTeam(s));
    await t.$('[data-v="filters"]').click(); await t.$('select[data-fd="sp"]').selectOption('__NA__'); await t.$('[data-act="fapply"]').click(); await t.idle();
    assert.equal(await t.$('[data-v="srv:a_deliv"] b').innerText(), String(overdue.length));
    assert.equal(await t.$('[data-v="srv:a_bill"] b').innerText(), String(toBill.length));
    await t.$('[data-v="srv:a_deliv"]').click(); await t.idle();
    const rows = await t.$('.dms-modal tbody tr').allTextContents(); assert.equal(rows.length, overdue.length);
    rows.forEach(row => assert.ok(overdue.some(s => row.includes(s.name))));
    ok('Not Assigned filters both order-action counts and the full drill-down');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* 12. An older successful range must not hide the current source failure. */
    t = await open(browser, db, { noFonts: true }); await t.idle();
    const primary = a => ['Quotation', 'Sales Order'].includes(a.doctype) && (a.fields || []).includes('base_net_total');
    t.ctl.delay = a => primary(a) && JSON.stringify(a.filters || []).includes('2026-10-01') ? 1500 : 0;
    t.ctl.fail = a => primary(a) && a.doctype === 'Sales Order' && JSON.stringify(a.filters || []).includes('2026-11-01');
    await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="lastMonth"]').click();
    for (let i = 0; i < 100 && !t.log.some(x => primary(x.a) && x.a.doctype === 'Sales Order' && JSON.stringify(x.a.filters).includes('2026-10-01')); i++) await t.page.waitForTimeout(30);
    assert.ok(t.log.some(x => primary(x.a) && x.a.doctype === 'Sales Order' && JSON.stringify(x.a.filters).includes('2026-10-01')));
    await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="month"]').click(); await t.idle();
    assert.match(await t.$('[data-ref="banner"]').innerText(), /Source unavailable: Sales Orders/);
    assert.match(await t.$('[data-ref="content"]').innerText(), /Analysis unavailable/); assert.equal(await t.$('.dms-ov-kpis').count(), 0);
    ok('late primary results cannot erase the current error or show false zero analytics');
    t.ctl.fail = () => false; await t.$('[data-act="refresh"]').click(); await t.idle();
    assert.equal(await t.kpiVal(1), money(expSO(db, ['2026-11-01', TODAY])) + 'SAR'); ok('primary-source error recovers through Refresh');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* 13. Urgency must be applied before sampling, including mixed ToDo priorities. */
    const ranked = build(), template = ranked.Quotation[0];
    for (const key of ['Sales Order', 'Sales Order Item', 'Sales Team', 'Customer', 'Lead', 'Opportunity']) ranked[key] = [];
    ranked.Quotation = ['2025-01-01', '2026-11-01', '2026-11-02', '2026-11-03'].map((date, i) => ({ ...template, name: 'URG-' + i, transaction_date: date, docstatus: 1, status: 'Open', workflow_state: 'Accepted By Customer' }));
    ranked.ToDo = Array.from({ length: 8 }, (_, i) => ({ name: 'TODO-' + i, description: i ? 'Routine recent task' : 'Urgent old task', allocated_to: 'owner@example.com', date: i ? add(TODAY, 1) : add(TODAY, -1), priority: i ? 'Low' : 'High', status: 'Open', modified: i ? TODAY : '2025-01-01' }));
    t = await open(browser, ranked, { noFonts: true }); await t.idle();
    assert.equal(await t.$('.dms-arow').count(), 6); assert.match(await t.$('.dms-arow').first().innerText(), /URG-0/);
    assert.match(await t.$('.dms-arows').innerText(), /Urgent old task/); ok('old accepted quotation and old urgent ToDo survive candidate selection');
    ranked.Quotation.push(...['2024-01-01', '2024-02-01', '2024-03-01'].map((date, i) => ({ ...template, name: 'OLDER-' + i, transaction_date: date, docstatus: 1, status: 'Open', workflow_state: 'Accepted By Customer' })));
    await t.$('[data-act="refresh"]').click(); await t.idle();
    assert.equal(await t.$('.dms-arow').count(), 6); assert.ok((await t.$('.dms-arow').allTextContents()).every(row => row.includes('Quotation'))); ok('one category can supply all six most urgent records');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    console.log('\nquotation tracker: ' + passed + ' checks passed · screenshots in ' + SHOTS);
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await browser.close(); }
})();
