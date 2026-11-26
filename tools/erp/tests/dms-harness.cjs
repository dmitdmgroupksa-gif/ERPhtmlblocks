/* Shared browser-test harness for dashboards built on the DM kit.
   Runs the real block (HTML/CSS/JS) inside a shadow root like a Frappe Custom HTML Block, against a mock /api/method
   endpoint that evaluates frappe.client.get_list filters, multi-column group_by and count()/sum() over a fixture db.
   Dashboards supply the fixture and independent expectations; standardChecks covers toolbar, tabs, RTL, dark mode,
   the responsive sweep (overflow, chart labels, touch targets, popovers) and the empty state. */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
let engine; try { engine = require('playwright'); } catch { engine = require('../../../.local/audit/node_modules/playwright'); }
const repo = path.resolve(__dirname, '../../..');
const TODAY = '2026-11-17';
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const add = (d, n) => iso(Date.parse(d + 'T00:00:00Z') + n * 864e5);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const nz = x => (x == null ? '' : x);
function cond(x, op, v) {
  /* dates compare by day; a datetime bound (YYYY-MM-DD HH:MM:SS) compares against the full row value */
  const full = typeof v === 'string' && v.length > 10, d = s => (full ? String(s) : String(s).slice(0, 10)), isNum = typeof v === 'number';
  switch (op) {
    case '=': return nz(x) == v;
    case '!=': return nz(x) != v;
    case 'in': return v.map(String).includes(String(nz(x)));
    case 'not in': return !v.map(String).includes(String(nz(x)));
    case 'between': return x != null && x !== '' && d(x) >= v[0] && d(x) <= v[1];
    case '<=': return x != null && x !== '' && (isNum ? +x <= v : d(x) <= v); case '<': return x != null && x !== '' && (isNum ? +x < v : d(x) < v);
    case '>=': return x != null && x !== '' && (isNum ? +x >= v : d(x) >= v); case '>': return x != null && x !== '' && (isNum ? +x > v : d(x) > v);
    case 'is': return v === 'set' ? nz(x) !== '' : nz(x) === '';
    case 'like': return new RegExp('^' + String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i').test(String(nz(x)));
    case 'not like': return !cond(x, 'like', v);
    case 'Timespan': {   /* Frappe relative date ranges, against the fixed test day */
      const y = TODAY.slice(0, 4), wd = new Date(TODAY + 'T00:00:00Z').getUTCDay(), ws = add(TODAY, -wd), ms = TODAY.slice(0, 8) + '01';
      const R = { today: [TODAY, TODAY], yesterday: [add(TODAY, -1), add(TODAY, -1)], 'this week': [ws, add(ws, 6)], 'last week': [add(ws, -7), add(ws, -1)],
        'this month': [ms, add(add(ms, 32).slice(0, 8) + '01', -1)], 'this year': [y + '-01-01', y + '-12-31'] }[v];
      if (!R) { throw new Error('timespan ' + v); } return x != null && x !== '' && d(x) >= R[0] && d(x) <= R[1];
    }
    default: throw new Error('op ' + op);
  }
}
function match(db, dt, r, f) {
  if (f.length === 4 && f[0] !== dt && db[f[0]] && db[f[0]].some(c => c.parent)) { const ch = db[f[0]].filter(c => c.parent === r.name); return ch.some(c => cond(c[f[1]], f[2], f[3])); }
  const g = f.length === 4 ? f.slice(1) : f; return cond(r[g[0]], g[1], g[2]);
}
function getList(db, a) {
  const dt = a.doctype; if (!db[dt]) { const e = new Error('unknown doctype ' + dt); e.status = 417; throw e; }
  /* the live site rejects min()/max() in get_list fields: fail the same way so dashboards never depend on them */
  if ((a.fields || []).some(f => /^\s*(min|max)\s*\(/i.test(String(f)))) { const e = new Error('Function not allowed in get_list fields'); e.status = 417; throw e; }
  let rows = db[dt].filter(r => !a.parent || r.parenttype === a.parent);
  rows = rows.filter(r => (a.filters || []).every(f => match(db, dt, r, f)));
  if (a.or_filters && a.or_filters.length) { rows = rows.filter(r => a.or_filters.some(f => match(db, dt, r, f))); }
  const fields = a.fields || ['name']; let out;
  if (fields.some(f => f.includes('('))) {
    const gb = a.group_by ? a.group_by.split(',').map(s => s.trim()) : null, groups = new Map();
    rows.forEach(r => { const k = gb ? JSON.stringify(gb.map(g => r[g])) : '_'; if (!groups.has(k)) { groups.set(k, []); } groups.get(k).push(r); });
    if (!gb && !groups.size) { groups.set('_', []); }
    out = [...groups].map(([, rs]) => { const o = {}; if (gb) { gb.forEach(g => { o[g] = rs[0][g] === undefined ? null : rs[0][g]; }); } fields.forEach(f => { const al = /^(\w+) as (\w+)$/.exec(f); if (al) { o[al[2]] = rs.length ? (rs[0][al[1]] === undefined ? null : rs[0][al[1]]) : null; } }); fields.forEach(f => { const m = /^(count|sum|min|max)\((\w+)\) as (\w+)$/.exec(f); if (m) { const vs = rs.map(x => x[m[2]]).filter(v => v != null && v !== '').sort(); o[m[3]] = m[1] === 'count' ? rs.length : m[1] === 'sum' ? (rs.length ? rs.reduce((s, x) => s + (+x[m[2]] || 0), 0) : null) : vs.length ? (m[1] === 'min' ? vs[0] : vs[vs.length - 1]) : null; } else if (!f.includes('(')) { o[f] = rs[0][f] === undefined ? null : rs[0][f]; } }); return o; });
  } else { out = rows.map(r => { const o = {}; fields.forEach(f => { const k = String(f).replace(/`/g, ''); o[k] = r[k] === undefined ? null : r[k]; }); return o; }); } /* `from`-style quoted names come back unquoted, as on the live site */
  if (a.order_by) { const [f, dir] = String(a.order_by).split(',')[0].trim().split(' '); out.sort((x, y) => (nz(x[f]) < nz(y[f]) ? -1 : nz(x[f]) > nz(y[f]) ? 1 : 0) * (dir === 'desc' ? -1 : 1)); }
  const s = +a.limit_start || 0, lim = String(a.limit_page_length) === '0' ? Infinity : (+a.limit_page_length || 20); return out.slice(s, s + lim);
}
function money(v) { const a = Math.abs(v), s = v < 0 ? '-' : ''; return s + (a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'K' : Math.round(a).toLocaleString('en-US')); }
const fmt = n => Math.round(n).toLocaleString('en-US');

function source(folder) {
  const dir = path.join(repo, folder);
  return { html: fs.readFileSync(path.join(dir, 'dashboard.html'), 'utf8'), css: fs.readFileSync(path.join(dir, 'dashboard.css'), 'utf8'), js: fs.readFileSync(path.join(dir, 'dashboard.js'), 'utf8') };
}
async function openPage(browser, SRC, db, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 1000 }, deviceScaleFactor: opts.dpr || 1, reducedMotion: 'reduce', hasTouch: !!opts.touch, isMobile: !!opts.touch, acceptDownloads: true });
  const page = await ctx.newPage(), errors = [], log = [], ctl = { delay: opts.delay || (() => 0), fail: () => false }; let inflight = 0;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) { errors.push(m.text()); } });
  await page.clock.setFixedTime(new Date(TODAY + 'T09:30:00+03:00'));
  await page.route('http://dms.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f3f4f6}html[data-theme=dark] body{background:#0b0f14}</style></head><body><div id="host"></div></body></html>' }));
  if (opts.noFonts !== false) { await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' })); }
  for (const [pat, fn] of opts.routes || []) { await page.route(pat, fn); } /* extra fixtures, e.g. map tiles, so tests never reach the network */
  await page.route('**/api/method/**', async route => {
    const req = route.request(), method = req.url().split('/api/method/')[1].split('?')[0], a = {};
    const body = req.postData() || '';
    if (/^\s*\{/.test(body)) { try { Object.assign(a, JSON.parse(body)); Object.keys(a).forEach(k => { if (typeof a[k] === 'string') { try { a[k] = JSON.parse(a[k]); } catch { /* plain string */ } } }); } catch { /* not JSON */ } }
    else { for (const [k, v] of new URLSearchParams(body)) { try { a[k] = JSON.parse(v); } catch { a[k] = v; } } }
    inflight++; log.push({ method, a });
    try {
      const d = ctl.delay(a, method); if (d) { await new Promise(res => setTimeout(res, d)); }
      /* PDF export: ERPNext renders the posted HTML; the mock keeps it in the log and returns a minimal PDF */
      if (method === 'frappe.utils.print_format.report_to_pdf' && !ctl.fail(a, method)) { await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\n% mock\n' }); return; }
      if (ctl.fail(a, method)) { await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ exc_type: 'PermissionError', exception: 'frappe.exceptions.PermissionError: Not permitted' }) }); return; }
      const msg = opts.methods && opts.methods[method] ? opts.methods[method](a, db) : getList(db, a);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: msg }) });
    } catch (e) { if (e.status !== 417) { errors.push('mock: ' + e.message); } await route.fulfill({ status: e.status || 500, contentType: 'application/json', body: JSON.stringify({ exc_type: 'DoesNotExistError', exception: e.message }) }); } finally { inflight--; }
  });
  await page.goto('http://dms.test/');
  if (opts.lang) { await page.evaluate(l => localStorage.setItem('dms_lang', l), opts.lang); }
  await page.evaluate(([src, boot]) => {
    const sh = document.querySelector('#host').attachShadow({ mode: 'open' }); sh.innerHTML = '<style>' + src.css + '</style>' + src.html;
    window.root_element = sh; window.frappe = Object.assign({ csrf_token: 't', boot: { time_zone: { system: 'Asia/Riyadh' }, sysdefaults: { currency: 'SAR' } }, session: { user: 'ceo@example.com' }, call() {} }, boot || {});
    new Function(src.js)();
  }, [SRC, opts.frappe]);
  const idle = async () => { for (let i = 0; i < 400; i++) { if (inflight === 0) { await page.waitForTimeout(400); if (inflight === 0) { return; } } await page.waitForTimeout(40); } throw new Error('requests never settled'); };
  const $ = s => page.locator('#host').locator(s);
  const kpiVal = async i => (await $('.dms-ov-kpis .dms-kpi').nth(i).locator('.dms-kpi-n').innerText()).trim();
  const noOverflow = async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  return { ctx, page, errors, log, ctl, idle, $, kpiVal, noOverflow };
}
const box = async l => (await l.boundingBox());

/* Runs a dashboard test: name, folder, build() → db, specific(t, helpers) for figures. */
async function run(cfg) {
  const SHOTS = process.env.DMS_SHOTS || path.join(repo, '.local/qa', cfg.slug);
  fs.mkdirSync(SHOTS, { recursive: true });
  const SRC = source(cfg.folder);
  const browser = await engine.chromium.launch({ executablePath: process.env.DMS_BROWSER || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined), headless: true });
  const shot = (p, n, o) => p.screenshot(Object.assign({ path: path.join(SHOTS, n + '.png'), fullPage: true }, o || {}));
  let passed = 0, t = null; const ok = m => { passed++; console.log('  ✓ ' + m); };
  const open = async (db, opts) => { t = await openPage(browser, SRC, db, Object.assign({ methods: cfg.methods, frappe: cfg.frappe, routes: cfg.routes }, opts || {})); return t; };
  const H = { open, ok, shot, assert, TODAY, add, money, fmt, box, rng };
  try {
    const db = cfg.build();
    /* loading skeleton, then figures */
    t = await open(db, { dpr: 2, delay: () => 700 });
    await t.$('.dms-skel').first().waitFor(); ok('loading skeleton rendered');
    await t.idle(); t.ctl.delay = () => 0;
    if (cfg.figures) { await cfg.figures(t, H, db); }
    const tabs = await t.$('.dms-tab').evaluateAll(b => b.map(x => x.getAttribute('data-v')));
    if (await t.$('[data-v="period"]').count()) {
      const [pe, pr, fi, rf, la] = await Promise.all(['[data-act="pending"]', '[data-v="period"]', '[data-v="filters"]', '[data-ref="refresh"]', '.dms-lang'].map(s => t.$(s).count().then(n => n ? box(t.$(s)) : null)));
      assert.ok(la.x > rf.x && (!fi || rf.x > fi.x) && (!fi || fi.x > pr.x) && pr.x > pe.x); ok('toolbar order right→left: language, refresh, filters, period, pending');
    }
    assert.ok(await t.$('#dms-pending').count() === 1, 'actions pending panel on the first tab'); ok('actions pending section on the first tab');
    const hrefs = await t.$('.dms-arow').evaluateAll(a => a.map(x => x.getAttribute('href')));
    if (cfg.expectActions !== false) { assert.ok(hrefs.length > 0 && hrefs.every(h => /^\/app\/[a-z0-9-]+\/[^/]+$/.test(h)), 'action rows link to records'); ok('action rows link to ERP records (' + hrefs[0] + ')'); }
    await shot(t.page, 'overview-en-1440');
    for (const id of tabs.slice(1).concat([tabs[0]])) {
      await t.$('[data-act="tab"][data-v="' + id + '"]').click(); await t.idle();
      assert.equal(await t.$('#dms-tab-' + id).getAttribute('aria-selected'), 'true'); const txt = await t.$('[data-ref="content"]').innerText(); assert.ok(txt.length > 40, id); assert.ok(!/">|<\/?[a-z]+[ >]/i.test(txt), 'markup leaked into visible text on ' + id);
      await shot(t.page, 'tab-' + id + '-1440');
    }
    ok('all ' + tabs.length + ' sections render');
    if (await t.$('.dms-acat:not(.dms-acat-off)').count()) {
      await t.$('.dms-acat:not(.dms-acat-off)').first().click(); await t.$('.dms-modal').waitFor(); await t.idle();
      assert.ok((await t.$('.dms-modal').innerText()).length > 30); assert.equal(await t.$('.dms-app').evaluate(el => el.inert), true);
      await shot(t.page, 'state-drill-1440', { fullPage: false }); await t.page.keyboard.press('Escape'); assert.equal(await t.$('.dms-modal').count(), 0); ok('action category opens its full list; Escape closes');
    }
    if (cfg.interactions) { await cfg.interactions(t, H, db); }
    /* permission errors become states, never zeros */
    t.ctl.fail = () => true; await t.$('[data-ref="refresh"]').click(); await t.idle();
    assert.ok(!/(^|\n)0(SAR)?\n/.test(await t.$('.dms-ov-kpis').innerText().catch(() => '')), 'no false zeros when every source is denied');
    assert.match(await t.$('[data-ref="sheet"]').innerText(), /permission denied|Permission denied|could not be loaded|unavailable|Unavailable/); await shot(t.page, 'state-denied-1440', { fullPage: false }); ok('denied sources show as unavailable, not zero');
    t.ctl.fail = () => false; await t.$('[data-ref="refresh"]').click(); await t.idle();
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* Arabic / RTL / dark */
    t = await open(db, { dpr: 2 }); await t.idle();
    await t.$('[data-act="lang"][data-v="ar"]').click(); await t.idle();
    assert.equal(await t.$('[data-dms-root]').getAttribute('dir'), 'rtl');
    const [pe2, rf2, la2] = await Promise.all(['[data-act="pending"]', '[data-ref="refresh"]', '.dms-lang'].map(s => box(t.$(s)))); assert.ok(la2.x < rf2.x && rf2.x < pe2.x); ok('Arabic switches to RTL with a mirrored toolbar');
    await shot(t.page, 'overview-ar-1440');
    await t.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await t.page.waitForTimeout(150); await shot(t.page, 'overview-ar-dark-1440');
    await t.$('[data-act="lang"][data-v="en"]').click(); await t.idle(); await shot(t.page, 'overview-en-dark-1440'); ok('dark theme follows Desk');
    assert.deepEqual(t.errors, []); await t.ctx.close();

    /* responsive sweep */
    for (const w of [3440, 1920, 1440, 1024, 768, 375, 320]) {
      for (const lang of ['en', 'ar']) {
        t = await open(db, { viewport: { width: w, height: w <= 375 ? 812 : w > 1920 ? 1440 : 1000 }, dpr: w === 3440 ? 1 : 2, touch: w <= 768, lang }); await t.idle();
        assert.ok(await t.noOverflow(), 'no horizontal overflow at ' + w + ' ' + lang);
        const collisions = await t.page.evaluate(() => [...document.querySelector('#host').shadowRoot.querySelectorAll('.dms-xaxis')].flatMap(axis => {
          const rs = [...axis.querySelectorAll('span')].filter(el => getComputedStyle(el).visibility === 'visible').map(el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); }).sort((a, b) => a.left - b.left);
          return rs.filter((r, i) => i && r.left < rs[i - 1].right);
        }).length);
        assert.equal(collisions, 0, 'chart labels overlap at ' + w + ' ' + lang);
        if (w === 375 || w === 1920 || w === 768) { await shot(t.page, 'overview-' + lang + '-' + w); }
        if (w <= 768) {
          const small = await t.page.evaluate(() => [...document.querySelector('#host').shadowRoot.querySelectorAll('.dms-topbar button, .dms-tab, .dms-acat, .dms-share-btn, button.dms-split-row, .dms-bchip')].filter(el => el.getBoundingClientRect().height < 44).map(el => el.className + ':' + el.textContent.slice(0, 20)));
          assert.deepEqual(small, [], 'touch targets ≥ 44px at ' + w + lang);
          if (await t.$('[data-v="filters"]').count()) { await t.$('[data-v="filters"]').click(); await t.$('.dms-pop-filters').waitFor(); const p = await box(t.$('.dms-pop')); assert.ok(p.x >= 0 && p.x + p.width <= w + 1, 'filters popover in viewport'); await t.page.keyboard.press('Escape'); }
          if (await t.$('[data-v="period"]').count()) { await t.$('[data-v="period"]').click(); await t.$('[data-act="preset"][data-v="custom"]').click(); const c = await box(t.$('.dms-pop')); assert.ok(c.x >= 0 && c.x + c.width <= w + 1, 'calendar in viewport'); assert.ok(await t.noOverflow()); await t.page.keyboard.press('Escape'); }
          for (const id of tabs.slice(1)) { await t.$('[data-act="tab"][data-v="' + id + '"]').click(); await t.idle(); assert.ok(await t.noOverflow(), id + ' overflow at ' + w + lang); }
          if (w === 375) { await shot(t.page, 'tab-' + tabs[tabs.length - 1] + '-' + lang + '-375'); }
        }
        assert.deepEqual(t.errors, []); await t.ctx.close();
      }
      ok('no overflow, EN + AR at ' + w + 'px');
    }
    /* empty state */
    if (cfg.quiet) {
      t = await open(cfg.quiet()); await t.idle(); await t.$('[data-act="tab"]').first().click(); await t.idle();   /* a dashboard may open on another tab (APP.defaultTab) */
      assert.match(await t.$('.dms-actpanel').innerText(), /Nothing pending/); assert.equal((await t.$('[data-act="pending"] b').innerText()).trim(), '0'); await shot(t.page, 'state-empty-1440', { fullPage: false }); ok('empty state when nothing is pending');
      assert.deepEqual(t.errors, []); await t.ctx.close();
    }
    /* extra sessions (other roles, other fixtures) */
    if (cfg.after) { await cfg.after(H); t = null; }
    console.log('\n' + cfg.slug + ': ' + passed + ' checks passed · screenshots in ' + SHOTS);
  } catch (e) {
    console.error(e); if (t) { console.error('page errors:', t.errors); try { fs.writeFileSync(path.join(SHOTS, 'failure.html'), await t.page.evaluate(() => document.querySelector('#host').shadowRoot.innerHTML)); await shot(t.page, 'failure'); } catch (x) { /* closed */ } }
    process.exitCode = 1;
  } finally { await browser.close(); }
}
module.exports = { run, getList, cond, money, fmt, TODAY, add, iso, rng, repo };
