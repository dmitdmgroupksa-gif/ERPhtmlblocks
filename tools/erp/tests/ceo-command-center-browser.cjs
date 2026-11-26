// CEO Command Centre v3 browser check (synthetic data only; no live ERP records).
// Run from repository root: npm --prefix tools/erp run test:ceo   (CEO_SHOTS=<dir> to change where screenshots go)
// The block runs in a shadow root like a Frappe Custom HTML Block; /api/method/ceo_command_center_api is served from
// tools/erp/tests/ceo-fixture.cjs, whose totals are computed independently of the dashboard code.
const path = require('path'), fs = require('fs'), assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('../../../.local/audit/node_modules/playwright')); }
const fx = require('./ceo-fixture.cjs');
const base = path.resolve(__dirname, '../../../01. Leadership & Corporate/CEO Command Center') + '/';
const SHOTS = process.env.CEO_SHOTS || path.resolve(__dirname, '../../../.local/qa/ceo');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SRC = { html: fs.readFileSync(base + 'dashboard.html', 'utf8'), css: fs.readFileSync(base + 'dashboard.css', 'utf8'), js: fs.readFileSync(base + 'dashboard.js', 'utf8') };

/* synthetic Management Insights payload (shape of ceo_management_insights) */
const INSIGHTS = { meta: { asof: '2026-11-17', month_from: '2026-11-01', prev_month: ['2026-10-01', '2026-10-31'], ytd_from: '2026-01-01', ly_window: ['2025-01-01', '2025-11-17'], company: '', currency: 'SAR', months_elapsed: 11 },
  sales: { month: 3000000, prev_month: 6000000, ytd: 60000000, ly_ytd: 80000000, ytd_target: 250000000, ytd_target_to_date: 229166667, months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, current: i < 11 ? 5000000 + i * 100000 : null, previous: 7000000 })) },
  locations: [{ location: 'CP', salespeople: 6, target: 3000000, month: 1500000, prev_month: 2500000, ytd: 20000000, ytd_target: 33000000, pct_month: 50, pct_ytd: 60.6 }, { location: 'Not set', salespeople: 3, target: 0, month: 10000, prev_month: 0, ytd: 90000, ytd_target: 0, pct_month: null, pct_ytd: null }],
  orders: { new: 40, invoiced: 30, pending: 8, closed: 2, value: 900000 }, collections: { month: 4000000, prev_month: 7000000, ytd: 90000000 },
  payments: { total: 2500000, by_party: [{ party_type: 'Supplier', value: 2400000, count: 50 }, { party_type: 'Employee', value: 100000, count: 9 }], petty_cash: 50000 },
  cash_bank: { opening: 9000000, in: 100000, out: 50000, closing: 9050000, bank: 8800000, cash: 250000, accounts: [{ account: 'A1', name: 'Al Rajhi Bank', type: 'Bank', company: 'DM Trading', opening: 8750000, in: 100000, out: 50000, closing: 8800000 }, { account: 'A2', name: 'Main Cash', type: 'Cash', company: 'DM Trading', opening: 250000, in: 0, out: 0, closing: 250000 }] },
  receivables: { outstanding: 10000000, overdue: 8000000, invoices: 500 }, inventory: { stock_value: 22000000, purchased_month: 3000000, to_bill: 1500000, to_bill_n: 100 } };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync(EDGE) ? EDGE : undefined, headless: true });
  let passed = 0; const ok = m => { passed++; console.log('  ✓ ' + m); };
  async function open(viewport, opts = {}) {
    const ctx = opts.ctx || await browser.newContext({ viewport, deviceScaleFactor: opts.dpr || 1, reducedMotion: 'reduce', hasTouch: !!opts.touch, isMobile: !!opts.touch });
    const page = await ctx.newPage(), errors = [], log = [];
    page.on('pageerror', e => errors.push(e.message));
    page.writes = []; page.ctl = { delay: 0, fail: null };
    await page.route('**/api/method/frappe.**', r => { const q = new URLSearchParams(r.request().postData()); page.writes.push([r.request().url().split('/').pop(), q.get('action') || q.get('content')]); r.fulfill({ status: 200, contentType: 'application/json', body: '{"message":{}}' }); });
    await page.route('**/api/method/ceo_command_center_api', async r => {
      const q = new URLSearchParams(r.request().postData()), a = q.get('action'); log.push([a, q.get('company'), q.get('from_date'), q.get('to_date'), q.get('window'), q.get('department'), q.get('page_size'), q.get('q')]);
      const delay = typeof page.ctl.delay === 'function' ? page.ctl.delay(a, q) : page.ctl.delay;
      if (delay) await new Promise(res => setTimeout(res, delay));
      if (page.ctl.fail && page.ctl.fail(a)) return r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ exc_type: 'ValidationError', _server_messages: JSON.stringify([JSON.stringify({ message: 'Server busy' })]) }) });
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: fx.respond(a, q) }) });
    });
    await page.route('**/api/method/ceo_management_insights', r => { log.push(['insights']); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: INSIGHTS }) }); });
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await page.route('http://cc.test/', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html data-theme="' + (opts.dark ? 'dark' : 'light') + '"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:10px;background:#f3f4f6"><div id="t"></div></body></html>' }));
    await page.goto('http://cc.test/');
    await page.evaluate(({ html, css, state }) => {
      if (state) localStorage.setItem('cc-v2-state', JSON.stringify(state));
      const sh = document.querySelector('#t').attachShadow({ mode: 'open' }); sh.innerHTML = '<style>' + css + '</style>' + html; window.root_element = sh;
      window.frappe = { csrf_token: 't', session: { user: 'ceo@example.com', user_fullname: 'CEO' }, datetime: { get_today: () => '2026-11-17' }, set_route: (...a) => { window.__route = a; }, show_alert: () => {}, msgprint: () => {} }; window.__ = s => s;
    }, { html: SRC.html, css: SRC.css, state: opts.state });
    if (opts.roles) await page.evaluate(r => { window.frappe.user_roles = r; }, opts.roles);
    await page.addScriptTag({ content: SRC.js });
    const $ = s => page.locator('#t').locator(s);
    const idle = async () => { await page.waitForTimeout(80); await $('.cc-view').first().waitFor(); for (let i = 0; i < 100 && await $('.cc-btn.busy').count(); i++) await page.waitForTimeout(50); await page.waitForTimeout(80); };
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    return { ctx, page, errors, log, $, idle, noOverflow };
  }
  const shot = (p, n, full) => p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: full !== false });
  const rows = fx.ROWS, sum = fx.summarize(rows).total;

  /* 1. overview: figures, toolbar order, queue, drawer, matrix */
  let { ctx, page, errors, $, idle, log, noOverflow } = await open({ width: 1440, height: 900 }, { dpr: 2 });
  await idle();
  assert.equal(await $('.cc-tabs [role=tab]').count(), 12); ok('12 tabs (overview, approvals, 10 departments)');
  const kv = async i => (await $('.cc-kpis > .cc-kpi').nth(i).locator('.cc-kpi-v').innerText()).trim();
  assert.equal(await kv(1), String(sum.critical)); assert.equal(await kv(2), String(sum.overdue)); assert.equal(await kv(4), String(sum.unowned)); ok('critical / overdue / unowned cards = fixture (' + [sum.critical, sum.overdue, sum.unowned].join(' / ') + ')');
  await page.waitForTimeout(500);
  assert.equal(await kv(0), String(fx.APPROVALS.length)); assert.ok(log.some(l => l[0] === 'approvals'), 'approvals prefetched after the overview'); ok('decisions card uses the prefetched approvals inbox (' + fx.APPROVALS.length + ')');
  const bx = async s => (await $(s).first().boundingBox());
  const [pe, pr, fi, rf, la] = await Promise.all(['.cc-pend', '[data-pop="period"]', '[data-pop="filters"]', '[data-action="refresh"]', '.cc-lang'].map(bx));
  assert.ok(la.x > rf.x && rf.x > fi.x && fi.x > pr.x && pr.x > pe.x); ok('toolbar order right→left: language, refresh, filters, period, decisions');
  await $('.cc-row').first().click(); await $('.cc-drawer').waitFor(); assert((await $('.cc-drawer').innerText()).includes('Approve, Reject'));
  await page.keyboard.press('Escape'); assert.equal(await $('.cc-drawer').count(), 0); ok('row opens the evidence drawer; Escape closes it');
  await $('[data-group="followup"]').click(); assert.ok((await $('.cc-rows').innerText()).length > 50); ok('queue groups switch');
  assert((await $('.cc-matrix').innerText()).includes('1 source unavailable'), 'restricted source flagged in matrix'); ok('matrix flags restricted sources');
  await $('[data-att="overdue"]').click(); assert.ok(await $('.cc-row .cc-pill.overdue, .cc-row .cc-pill.critical').count() > 0); await $('[data-att="overdue"]').click(); ok('attention cards filter the queue');
  await shot(page, 'overview-en-1440');

  /* 2. View all: one heavy server call per 4 local pages */
  const n0 = log.length; await $('[data-action="view-all"]').click(); await idle();
  await $('[data-page="1"]').click(); await $('[data-page="1"]').click(); await $('[data-page="1"]').click(); await page.waitForTimeout(100);
  assert.equal(log.slice(n0).filter(l => l[0] === 'actions').length, 1); assert.equal(log.slice(n0).find(l => l[0] === 'actions')[6], '100'); ok('View all: 4 pages from one 100-row actions call');
  await $('[data-page="1"]').click(); await idle(); assert.equal(log.slice(n0).filter(l => l[0] === 'actions').length, 2); ok('page 5 fetches the next 100 rows');
  await $('[data-action="view-top"]').click();

  /* 3. period presets, custom calendar, filters (scope sent to the API) */
  await $('[data-pop="period"]').click(); await $('.cc-pop-p').waitFor(); await shot(page, 'state-period-1440', false);
  await $('[data-preset="lastMonth"]').click(); await idle();
  assert.deepEqual(log.filter(l => l[0] === 'overview').pop().slice(2, 4), ['2026-10-01', '2026-10-31']); ok('Last month preset → 2026-10-01 … 2026-10-31');
  await $('[data-pop="period"]').click(); await $('[data-preset="custom"]').click(); await $('.cc-cal').waitFor();
  await $('[data-calnav="1"]').click();   // opens on the current range (October); step to November
  assert.equal(await $('[data-day="2026-11-20"]').isDisabled(), true); assert.equal(await $('[data-calnav="1"]').isDisabled(), true); ok('future days and months are not selectable');
  await $('[data-calnav="-1"]').click(); await $('[data-calnav="-1"]').click(); await $('[data-day="2026-09-03"]').click(); await shot(page, 'state-calendar-1440', false);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');   // 09-11
  await $('[data-calapply]').click(); await idle();
  assert.deepEqual(log.filter(l => l[0] === 'overview').pop().slice(2, 4), ['2026-09-03', '2026-09-11']); ok('custom range with keyboard → 2026-09-03 … 2026-09-11');
  await $('[data-pop="filters"]').click(); await $('.cc-pop-f').waitFor(); await $('[data-fd="company"]').selectOption('Alpha Trading'); await $('[data-fw="14"]').click();
  await shot(page, 'state-filters-1440', false); await $('[data-fapply]').click(); await idle();
  const lo = log.filter(l => l[0] === 'overview').pop(); assert.equal(lo[1], 'Alpha Trading'); assert.equal(lo[4], '14');
  assert.equal(await $('.cc-chip').count(), 1); assert.equal(await kv(2), String(fx.summarize(rows.filter(a => !a.company || a.company === 'Alpha Trading')).total.overdue)); ok('company + 14-day window reach the API; chip shown; counts follow');
  await $('[data-rmco]').click(); await idle(); assert.equal(await $('.cc-chip').count(), 0); ok('chip removes the company filter');

  /* 4. department tab, sections, keyboard tabs */
  await $('.cc-tabs [data-tab=finance]').click(); await $('.cc-dept-head').waitFor(); await idle();
  assert.equal(await $('.cc-rows .cc-row').count(), Math.min(25, rows.filter(a => a.dept === 'finance' && a.group !== 'verification').length)); ok('finance actions page = fixture rows');
  await $('.cc-seg [data-sub=performance]').click(); assert((await $('.cc-view').innerText()).includes('Overdue share'));
  await $('.cc-seg [data-sub=checks]').click(); await $('.cc-seg [data-sub=actions]').click(); ok('department sections render');
  await shot(page, 'finance-en-1440');
  await $('.cc-tabs [data-tab=it]').click(); await idle(); await $('.cc-seg [data-sub=checks]').click(); assert((await $('.cc-view').innerText()).includes('Permission restricted')); ok('restricted source shown, not zero');
  await $('.cc-tabs [data-tab=dmcc]').click(); await idle(); assert((await $('.cc-view').innerText()).includes('Not configured')); ok('DMCC not configured state');
  await $('.cc-tabs [data-tab=dmcc]').focus(); await page.keyboard.press('ArrowLeft'); await idle(); assert.equal(await $('#cc-tab-legal').getAttribute('aria-selected'), 'true'); ok('arrow keys move between tabs');

  /* Every native Performance view: headline cards, per-source count + value, status split, monthly series; restricted sources stay labelled. */
  for (const dept of ['sales', 'procurement', 'finance', 'people', 'projects', 'operations', 'manufacturing', 'it', 'legal']) {
    await $('.cc-tabs [data-tab="' + dept + '"]').click(); await idle();
    await $('.cc-seg [data-sub=performance]').click();
    const money = ['sales', 'procurement', 'finance'].includes(dept), src = $('.cc-executive-source').first();
    assert.equal(await $('.cc-executive-source').count(), 2);
    assert.equal((await src.locator('.cc-kpi-v').first().innerText()).trim(), '30');
    if (money) {
      assert.match(await src.locator('.cc-kpi-v').nth(1).innerText(), /SAR 3M/, dept + ' largest currency leads');
      assert.match(await src.locator('.cc-kpi-s').nth(1).innerText(), /AED 500K/, dept + ' second currency kept separate, never added');
      assert.match(await src.locator('.cc-perf-legend').innerText(), /SAR 2M/, 'legend shows status value');
    } else assert.match(await src.locator('.cc-perf-legend').innerText(), /20[\s\S]*66\.7%/);
    assert.match(await src.locator('.cc-trend-b').getAttribute('aria-label'), money ? /Oct 26: SAR 1\.2M, Nov 26: SAR 1\.8M/ : /Oct 26: 12, Nov 26: 18/);
    assert.equal(await $('.cc-donut').count(), dept === 'it' ? 1 : 2);
    if (dept === 'it') assert.match(await $('.cc-executive-source').nth(1).innerText(), /Permission restricted/);
    if (dept === 'finance') assert.equal(await $('.cc-performance-kpis .cc-kpi').count(), 4, 'one headline card per finance measure');
    assert.ok(await noOverflow()); await shot(page, 'performance-' + dept + '-1440');
  }
  ok('nine Performance views: counts, values per currency, status split, monthly trend; restricted source labelled');
  await $('.cc-tabs [data-tab=dmcc]').click(); await idle();
  await page.route('**/api/method/dmcc_dashboard_proxy?**', r => { const e = new URL(r.request().url()).searchParams.get('entity'); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: e === 'Project' ? { error: 'Not configured' } : { total: 2, data: [{ status: 'paid', total_amount: 1500 }, { status: 'sent', total_amount: 500 }] } }) }); });
  await $('.cc-seg [data-sub=actions]').click(); await $('.cc-seg [data-sub=performance]').click();
  await $('.cc-executive-source').first().waitFor();
  assert.equal(await $('.cc-executive-source').count(), 3); assert.equal((await $('.cc-executive-source .cc-kpi-v').first().innerText()).trim(), '2');
  assert.match(await $('.cc-executive-source').first().innerText(), /SAR 2,000/); assert.match(await $('.cc-executive-source').nth(2).innerText(), /Source unavailable/);
  await shot(page, 'performance-dmcc-1440'); ok('DMCC: external snapshots with billed value via its proxy; a failing entity is labelled, never zero');

  /* 5. approvals: priority groups, reject needs a reason, comment before rejection, bulk via native workflow */
  await $('.cc-tabs [data-tab=approvals]').click(); await $('.ap-card').first().waitFor(); await idle();
  const urgent = fx.APPROVALS.filter(a => a.priority === 'urgent').length, bulk = fx.APPROVALS.filter(a => a.bulk).length;
  assert.equal(await $('.ap-group.urgent .ap-card').count(), urgent); assert.equal(await $('[data-apsel]').count(), bulk, 'only bulk-eligible items selectable'); ok('approvals: ' + urgent + ' urgent, ' + bulk + ' bulk-eligible');
  await shot(page, 'approvals-en-1440');
  await $('.ap-card [data-apaction="Reject"]').first().click(); await $('.ap-modal').waitFor();
  await $('[data-apgo]').focus(); await page.keyboard.press('Tab');
  assert.equal(await $('[data-apcomment]').evaluate(el => el.getRootNode().activeElement === el), true, 'Tab wraps inside the confirmation dialog');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await $('[data-apgo]').evaluate(el => el.getRootNode().activeElement === el), true); ok('confirmation traps forward and backward keyboard focus');
  await $('[data-apgo]').click(); await page.waitForTimeout(150); assert.equal(page.writes.length, 0, 'reject blocked without reason');
  await $('[data-apcomment]').fill('Not justified'); await $('[data-apgo]').click(); await $('[data-apdone]').waitFor(); await $('[data-apdone]').click();
  assert.deepEqual(page.writes.map(w => w[0]), ['frappe.desk.form.utils.add_comment', 'frappe.model.workflow.apply_workflow'], 'reason saved before the rejection is applied'); ok('reject requires a reason, saved before the workflow call');
  const boxes = await $('[data-apsel]').all(); for (const b of boxes.slice(0, 3)) await b.check();
  await $('[data-apbulk]').click(); await $('[data-apgo]').click(); await $('[data-apdone]').waitFor(); await $('[data-apdone]').click();
  assert.equal(page.writes.filter(w => w[0] === 'frappe.model.workflow.apply_workflow').length, 4); ok('bulk approve applies the native workflow per item');
  assert.deepEqual(errors, []); await ctx.close();

  /* 6. saved results: repeat visit paints at once from cache; decisions stay disabled until fresh data arrives */
  ({ ctx, page, errors, $, idle, log } = await open({ width: 1440, height: 900 }, {}));
  await idle(); await page.waitForTimeout(400);
  const page2 = await ctx.newPage(); page2.on('pageerror', e => errors.push(e.message));
  await page2.route('**/api/method/ceo_command_center_api', async r => { await new Promise(res => setTimeout(res, 2500)); const q = new URLSearchParams(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: fx.respond(q.get('action'), q) }) }); });
  await page2.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page2.route('http://cc.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><div id="t"></div></body></html>' }));
  await page2.goto('http://cc.test/'); const t0 = Date.now();
  await page2.evaluate(({ html, css }) => { const sh = document.querySelector('#t').attachShadow({ mode: 'open' }); sh.innerHTML = '<style>' + css + '</style>' + html; window.root_element = sh; window.frappe = { csrf_token: 't', session: { user: 'ceo@example.com' }, datetime: { get_today: () => '2026-11-17' }, set_route() {} }; }, { html: SRC.html, css: SRC.css });
  await page2.addScriptTag({ content: SRC.js }); await page2.locator('#t').locator('.cc-kpi').first().waitFor();
  const paint = Date.now() - t0; assert.ok(paint < 1000, 'saved overview painted in ' + paint + ' ms despite a 2.5 s server');
  assert.match(await page2.locator('#t').locator('.cc-top-t p').innerText(), /Saved .*Updating/); ok('repeat visit paints saved data in ' + paint + ' ms and says it is updating');
  await page2.locator('#t').locator('.cc-tabs [data-tab=approvals]').click(); await page2.locator('#t').locator('.ap-card').first().waitFor();
  assert.equal(await page2.locator('#t').locator('.ap-card [data-apaction="Approve"]').first().isDisabled(), true); ok('saved approvals cannot be acted on until refreshed');
  await page2.waitForTimeout(2800); assert.equal(await page2.locator('#t').locator('.ap-card [data-apaction="Approve"]').first().isDisabled(), false); ok('decisions enabled once fresh data arrives');
  await page2.close();

  /* 7. refresh failure keeps the view and says so */
  page.ctl.fail = a => a === 'overview'; await $('[data-fk="refresh"]').click(); await page.waitForTimeout(300);
  assert.match(await $('.cc-sheet').innerText(), /Could not refresh: .*Server busy/); assert.ok(await $('.cc-kpis').count()); ok('failed refresh keeps the last data and shows the error');
  page.ctl.fail = null;
  await $('[data-group="followup"]').click(); await $('[data-action="view-all"]').click(); await idle();
  page.ctl.delay = (a, q) => a === 'actions' ? (q.get('q') === 'Najd' ? 900 : 50) : 0;
  await $('[data-search]').fill('Najd');
  await page.waitForFunction(() => document.querySelector('#t').shadowRoot.querySelector('.cc-dim'));
  await $('[data-search]').fill('Oasis');
  await page.waitForResponse(r => r.url().endsWith('/ceo_command_center_api') && new URLSearchParams(r.request().postData()).get('q') === 'Oasis');
  await page.waitForTimeout(1000);
  const titles = await $('.cc-row-t').allTextContents();
  assert.ok(titles.length && titles.every(t => t.includes('Oasis')), 'slow earlier search must not replace newer results'); ok('out-of-order queue responses keep the latest search');
  const beforeRefresh = log.filter(l => l[0] === 'actions').length;
  await $('[data-fk="refresh"]').click(); await idle();
  assert.equal(log.filter(l => l[0] === 'actions').length, beforeRefresh + 1);
  assert.equal(await $('[data-search]').inputValue(), 'Oasis'); assert.ok(await $('[data-action="view-top"]').count()); ok('refresh reloads the full queue and preserves search');
  page.ctl.delay = 0;
  await $('.cc-tabs [data-tab=finance]').click(); await idle();
  page.ctl.fail = a => a === 'department'; await $('[data-fk="refresh"]').click(); await idle();
  assert.ok(await $('.cc-dept-head').count()); assert.match(await $('.cc-sheet').innerText(), /Could not refresh/); ok('department refresh failure retains the current view');
  assert.deepEqual(errors, []); await ctx.close();

  /* 8. Arabic / RTL, dark, phone and tablet widths */
  for (const [w, h, lang, dark] of [[1440, 900, 'ar', false], [1440, 900, 'en', true], [768, 1000, 'en', false], [375, 812, 'en', false], [375, 812, 'ar', false], [320, 740, 'en', false], [812, 375, 'ar', false], [1024, 768, 'en', false], [1920, 1080, 'en', false], [3440, 1440, 'en', false]]) {
    ({ ctx, page, errors, $, idle, noOverflow } = await open({ width: w, height: h }, { dpr: w < 800 ? 2 : 1, dark, touch: w < 800, state: { lang } }));
    await idle();
    if (lang === 'ar') { assert.equal(await $('.cc').evaluate(el => getComputedStyle(el).direction), 'rtl'); assert.equal(await $('#cc-tab-overview').innerText(), 'نظرة عامة'); }
    assert.ok(await noOverflow(), 'no horizontal page scroll at ' + w + ' ' + lang);
    const tag = (dark ? 'dark-' : '') + lang + '-' + w;
    await shot(page, 'overview-' + tag);
    if (w <= 768) {
      const tgt = await page.evaluate(() => { const sh = document.querySelector('#t').shadowRoot; return [...sh.querySelectorAll('.cc-top button, .cc-tabs button')].filter(b => b.getBoundingClientRect().height < 44).map(b => b.className + '/' + (b.dataset.tab || b.dataset.lang || '') + ':' + Math.round(b.getBoundingClientRect().height)); });
      assert.deepEqual(tgt, [], 'toolbar and tab targets ≥ 44 px on touch');
      await $('.cc-row').first().click(); await $('.cc-drawer').waitFor(); const d = await $('.cc-drawer').boundingBox(); assert.ok(d.x >= -1 && d.x + d.width <= w + 1 && (w > 640 || d.width >= w - 1), 'drawer inside the viewport, full width on phones');
      await shot(page, 'state-drawer-' + tag, false); await page.keyboard.press('Escape');
      await $('[data-pop="period"]').click(); await $('[data-preset="custom"]').click(); await $('.cc-cal').waitFor(); const p = await $('.cc-pop').boundingBox();
      assert.ok(p.x >= 0 && p.x + p.width <= w + 1, 'calendar inside the viewport'); await shot(page, 'state-calendar-' + tag, false); await page.keyboard.press('Escape');
      await $('.cc-tabs [data-tab=approvals]').click(); await $('.ap-card').first().waitFor(); await idle(); assert.ok(await noOverflow()); await shot(page, 'approvals-' + tag);
      await $('.cc-tabs [data-tab=sales]').click(); await idle(); assert.ok(await noOverflow()); await shot(page, 'sales-' + tag);
    }
    if (lang === 'ar' && w === 1440) { await $('.cc-tabs [data-tab=approvals]').click(); await $('.ap-card').first().waitFor(); await idle(); await shot(page, 'approvals-' + tag); }
    await $('.cc-tabs [data-tab=finance]').click(); await idle(); await $('.cc-seg [data-sub=performance]').click();
    assert.ok(await noOverflow()); await shot(page, 'performance-finance-' + tag);
    assert.equal(await $('.cc-executive-source').count(), 2);
    assert.deepEqual(errors, []); await ctx.close();
    ok('layout ' + tag + ': no overflow' + (w <= 768 ? ', touch targets, drawer and calendar in view' : ''));
  }
  /* Management Insights + Reports: CEO role only */
  {
    const a = await open({ width: 1440, height: 1000 }); await a.idle();
    assert.equal(await a.$('.cc-tabs [data-tab=insights]').count(), 0); assert.equal(await a.$('.cc-tabs [data-tab=reports]').count(), 0);
    assert.ok(!a.log.some(x => x[0] === 'insights')); await a.ctx.close(); ok('without the CEO role: no Management Insights / Reports tabs and the insights API is never called');
    const c = await open({ width: 1440, height: 1000 }, { roles: ['CEO'] }); await c.idle();
    await c.$('.cc-tabs [data-tab=insights]').click(); await c.idle(); const tx = await c.$('.cc-view').innerText();
    assert.match(tx, /Sales year to date[\s\S]*60M/); assert.match(tx, /vs last year -25\.0%/); assert.match(tx, /Receivables outstanding[\s\S]*10M/); assert.match(tx, /Cash & bank[\s\S]*9\.05M/);
    assert.match(tx, /CP[\s\S]*50\.0%[\s\S]*60\.6%/); assert.match(tx, /Not set/); assert.ok(await c.noOverflow()); await shot(c.page, 'insights-en-1440');
    ok('CEO: Management Insights (sales vs last year, locations vs target, collections, receivables, cash & bank, stock)');
    await c.$('.cc-tabs [data-tab=reports]').click(); await c.idle(); const hrefs = await c.$('.cc-linkcard').evaluateAll(xs => xs.map(x => x.getAttribute('href')));
    assert.ok(hrefs.length >= 20); assert.ok(hrefs.includes('/app/query-report/Approvals%20Report')); assert.ok(hrefs.includes('/app/weekly-sales-report')); assert.ok(hrefs.includes('/app/dashboard-view/Collection%20Analysis%20Dashboard'));
    await shot(c.page, 'reports-en-1440'); assert.deepEqual(c.errors, []); await c.ctx.close(); ok('CEO: Reports tab links the ' + hrefs.length + ' working reports of the old Management Reports / Sales Comparison workspaces');
  }
  await browser.close(); console.log('\nCEO Command Centre: ' + passed + ' browser checks passed · screenshots in ' + SHOTS);
})().catch(e => { console.error(e); process.exit(1); });
