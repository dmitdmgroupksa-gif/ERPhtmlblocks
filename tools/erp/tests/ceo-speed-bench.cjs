/* Loading-speed benchmark for the CEO Command Centre block under simulated server latency.
   Measures time to first useful content (attention cards) on a first and a repeat visit, the Approvals tab switch
   after the overview, and "View all" paging. Usage: node tools/erp/tests/ceo-speed-bench.cjs [dir-with-dashboard-files]
   The latencies model the API's relative cost: overview runs every source, actions re-runs them, bootstrap is metadata only. */
const fs = require('fs'), path = require('path');
let engine; try { engine = require('playwright'); } catch { engine = require('../../../.local/audit/node_modules/playwright'); }
const dir = path.resolve(process.argv[2] || path.join(__dirname, '../../../01. Leadership & Corporate/CEO Command Center'));
const LAT = { bootstrap: 300, overview: 1800, approvals: 1200, department: 900, actions: 1800, drilldown: 250, approval_detail: 300 };
const fx = require('./ceo-fixture.cjs');

(async () => {
  const browser = await engine.chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const src = f => fs.readFileSync(path.join(dir, f), 'utf8');
  const calls = [];
  await ctx.route('**/api/method/ceo_command_center_api', async r => {
    const q = new URLSearchParams(r.request().postData()), a = q.get('action'); calls.push(a);
    await new Promise(res => setTimeout(res, LAT[a] || 200));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: fx.respond(a, q) }) });
  });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await ctx.route('http://cc.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html data-theme="light"><body style="margin:0"><div id="t"></div></body></html>' }));
  async function visit(page) {
    calls.length = 0; const t0 = Date.now();
    await page.evaluate(({ html, css }) => { const h = document.querySelector('#t'); const sh = h.shadowRoot || h.attachShadow({ mode: 'open' }); sh.innerHTML = '<style>' + css + '</style>' + html; window.root_element = sh;
      window.frappe = { csrf_token: 't', session: { user: 'ceo@example.com' }, datetime: { get_today: () => '2026-11-17', get_day_diff: (a, b) => (Date.parse(a) - Date.parse(b)) / 864e5 }, set_route() {}, msgprint() {}, show_alert() {} }; window.__ = s => s; },
      { html: src('dashboard.html'), css: src('dashboard.css') });
    await page.addScriptTag({ content: src('dashboard.js') });
    await page.locator('#t').locator('.cc-att, .cc-kpi').first().waitFor({ timeout: 20000 });
    return Date.now() - t0;
  }
  const page = await ctx.newPage(); await page.goto('http://cc.test/');
  const first = await visit(page), firstCalls = calls.slice();
  await page.waitForTimeout(2500);   // let any background prefetch settle
  const repeat = await visit(page);
  await page.waitForTimeout(2500);
  let t0 = Date.now(); await page.locator('#t').locator('.cc-tabs [data-tab="approvals"]').click(); await page.locator('#t').locator('.ap-card').first().waitFor(); const apprSwitch = Date.now() - t0;
  t0 = Date.now(); await page.locator('#t').locator('.cc-tabs [data-tab="finance"]').hover(); await page.waitForTimeout(400); await page.locator('#t').locator('.cc-tabs [data-tab="finance"]').click();
  await page.locator('#t').locator('.cc-dept-head').waitFor(); const deptSwitch = Date.now() - t0 - 400;
  await page.locator('#t').locator('.cc-tabs [data-tab="overview"]').click(); await page.locator('#t').locator('[data-group="followup"]').first().click();
  await page.locator('#t').locator('[data-action="view-all"]').waitFor();
  calls.length = 0; t0 = Date.now(); await page.locator('#t').locator('[data-action="view-all"]').click();
  await page.locator('#t').locator('[data-key]').first().waitFor();
  for (let i = 0; i < 2; i++) {
    await page.locator('#t').locator('[data-page="1"]:not([disabled])').click();
    await page.waitForFunction(() => {
      const sh = document.querySelector('#t').shadowRoot;
      return !sh.querySelector('.cc-rows.cc-dim, .cc-dim .cc-rows, .cc-skel, .cc-skeleton') && sh.querySelector('[data-key]');
    });
  }
  const pagingMs = Date.now() - t0, pagingCalls = calls.filter(c => c === 'actions').length;
  console.log(JSON.stringify({ dir: path.basename(dir), firstVisitMs: first, firstVisitCalls: firstCalls, repeatVisitMs: repeat, approvalsTabMs: apprSwitch, departmentTabMs: Math.max(0, deptSwitch), viewAllPlus2PagesMs: pagingMs, viewAllActionCalls: pagingCalls }, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
