// CEO Command Centre v2 browser check (synthetic data only; no live ERP records).
// Run from repository root: npm --prefix tools/erp run test:ceo
const path = require('path'), fs = require('fs'), assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('../../../.local/audit/node_modules/playwright')); }
const base = path.resolve(__dirname, '../../../01. Leadership & Corporate/CEO Command Center') + '/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const depts = [['sales', 'Sales'], ['procurement', 'Procurement'], ['finance', 'Finance'], ['people', 'People & Admin'], ['projects', 'Projects'], ['operations', 'Operations'], ['manufacturing', 'Manufacturing'], ['it', 'IT & Assets'], ['legal', 'Legal & Compliance'], ['dmcc', 'DMCC']];
const meta = { api_version: 't', policy: { version: 't', stale_days: 14, ar_followup_days: 60 }, retrieved: '2026-11-16 09:00:00', today: '2026-11-16', window: 7, horizon: '2026-11-23', company: '', currency: null, period: ['2026-11-01', '2026-11-16'] };
const act = (i, o) => Object.assign({ key: 'Doc::D' + i + '::x', source: 's', doctype: 'Doc', name: 'D' + i, type: 'x', dept: 'finance', group: 'followup', severity: 'pending', title: 'Action ' + i, reason: 'Reason ' + i, owner: '', owner_basis: 'unassigned', unowned: 1, due: '', due_basis: '', overdue_days: null, age_days: 3, amount: null, currency: null, amount_basis: '', company: 'Co A', status: 'Open', list: null, bundle: 0, extra: {} }, o);
const rows = [act(1, { group: 'decision', severity: 'pending', owner: 'CEO', owner_basis: 'Your workflow role', unowned: 0, extra: { actions: ['Approve', 'Reject'] }, amount: 1200, currency: 'SAR' }),
  act(2, { group: 'escalation', severity: 'critical', due: '2026-10-01', overdue_days: 46, due_basis: 'X.expiry' }),
  act(3, { group: 'followup', severity: 'overdue', due: '2026-11-01', overdue_days: 15, owner: 'Owner B', unowned: 0, owner_basis: 'Assigned' }),
  act(4, { group: 'followup', severity: 'pending', bundle: 120, name: 'bundle-x', list: { doctype: 'Doc', filters: [['status', '=', 'Open']] } }),
  act(5, { group: 'verification', severity: 'verify', type: 'data_check', name: '', extra: { count: 9 } })];
const matrix = {}; depts.forEach(([k]) => { matrix[k] = { decision: 0, escalation: 0, followup: 0, verification: 0, critical: 0, overdue: 0, due_soon: 0, unowned: 0, oldest_due: '', items: 0 }; });
Object.assign(matrix.finance, { decision: 1, escalation: 1, followup: 2, verification: 1, critical: 1, overdue: 2, unowned: 2, oldest_due: '2026-10-01' });
const sources = [{ key: 'a', dept: 'finance', label: 'Receivables', doctypes: ['Sales Invoice'], state: 'complete', message: '', scope: 'all', rows: 3 }, { key: 'b', dept: 'finance', label: 'SOA workflow', doctypes: ['SOA Workflow Request'], state: 'restricted', message: 'Your ERP role cannot read this source.', scope: 'all', rows: 0 }];
const top = { decision: [rows[0]], escalation: [rows[1]], followup: [rows[2], rows[3]], verification: [rows[4]] };
const fx = {
  bootstrap: Object.assign({}, meta, { companies: [{ name: 'Co A', currency: 'SAR' }], departments: depts.map(([key, label]) => ({ key, label, dashboards: [{ label: label + ' dashboard', route: '/app/x' }] })), groups: ['decision', 'escalation', 'followup', 'verification'] }),
  overview: Object.assign({}, meta, { totals: { critical: 1, overdue: 2, due_soon: 0 }, counts_by_group: { decision: 1, escalation: 1, followup: 2, verification: 1 }, matrix, top, upcoming: [{ dept: 'finance', doctype: 'Supplier', name: 'S1', date: '2026-11-18', kind: 'Supplier payment due', title: 'Supplier One', amount: 500, currency: 'SAR', owner: '', list: null }], upcoming_total: 1, sources, indicators: {}, performance: { finance: { cash: { rows: [{ company: 'Co A', amount: 10, currency: 'SAR' }], basis: 'GL' } } }, workflow: {} }),
  department: Object.assign({}, meta, { totals: {}, matrix, rows, row_total: rows.length, upcoming: [], sources, indicators: { finance: [{ label: 'Overdue customers', value: 3, basis: 'b', tone: 'bad' }] }, performance: { finance: { receivables: { rows: [{ company: 'Co A', currency: 'SAR', outstanding: 100, overdue: 40 }], basis: 'b' } }, dmcc: { connection: { state: 'not_configured', message: 'Not installed' } } }, dashboards: [{ label: 'Finance dashboard', route: '/app/x' }] }),
  actions: Object.assign({}, meta, { total: 1, page: 0, page_size: 25, rows: [rows[1]] })
};
(async () => {
  const browser = await chromium.launch({ executablePath: fs.existsSync(EDGE) ? EDGE : undefined, headless: true });
  async function open(viewport, lang) {
    const page = await browser.newPage({ viewport }); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/method/ceo_command_center_api', r => { const a = new URLSearchParams(r.request().postData()).get('action'); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: a === 'drilldown' ? { fields: {}, assigned: [], todos: [], related: [], created_by: 'x', modified_by: 'y' } : fx[a] }) }); });
    await page.route('http://cc.test/', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html data-theme="light"><body><div id="t"></div></body></html>' }));
    await page.goto('http://cc.test/');
    await page.evaluate(({ html, css, lang }) => { localStorage.setItem('cc-v2-state', JSON.stringify({ lang })); const sh = document.querySelector('#t').attachShadow({ mode: 'open' }); sh.innerHTML = '<style>' + css + '</style>' + html; window.root_element = sh; window.__ = s => s; window.routes = []; window.frappe = { csrf_token: 'x', datetime: { get_today: () => '2026-11-16', get_day_diff: () => 1 }, msgprint() {}, set_route: (...a) => window.routes.push(a) }; },
      { html: fs.readFileSync(base + 'dashboard.html', 'utf8'), css: fs.readFileSync(base + 'dashboard.css', 'utf8'), lang });
    await page.addScriptTag({ content: fs.readFileSync(base + 'dashboard.js', 'utf8') });
    return { page, errors, $: s => page.locator('#t').locator(s) };
  }
  let { page, errors, $ } = await open({ width: 1366, height: 900 }, 'en');
  await $('.cc-attention').waitFor();
  assert.equal(await $('.cc-tabs [role=tab]').count(), 11);
  assert.equal((await $('.cc-att strong').first().innerText()), '1');
  await $('tbody tr[data-key]').first().click(); await $('.cc-drawer').waitFor();
  assert((await $('.cc-drawer').innerText()).includes('Approve, Reject'));
  await page.keyboard.press('Escape'); assert.equal(await $('.cc-drawer').count(), 0);
  await $('.cc-chips [data-group=followup]').click();
  assert((await $('tbody').first().innerText()).includes('120'), 'bundle count shown');
  assert((await $('.cc-matrix').innerText()).includes('1 source unavailable'), 'restricted source flagged in matrix');
  await $('.cc-tabs [data-tab=finance]').click(); await $('.cc-dept-head').waitFor();
  await $('.cc-seg [data-sub=performance]').click(); assert((await $('.cc-view').innerText()).includes('Overdue share'));
  await $('.cc-seg [data-sub=checks]').click(); assert((await $('.cc-view').innerText()).includes('Permission restricted'));
  await $('.cc-tabs [data-tab=dmcc]').click(); await page.waitForTimeout(100); assert((await $('.cc-view').innerText()).includes('Not configured'));
  assert.deepEqual(errors, []); await page.close();
  ({ page, errors, $ } = await open({ width: 390, height: 800 }, 'ar'));
  await $('.cc-attention').waitFor();
  assert.equal(await $('.cc').evaluate(el => getComputedStyle(el).direction), 'rtl');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'no horizontal page scroll');
  assert.deepEqual(errors, []);
  await browser.close(); console.log('CEO Command Centre browser checks passed.');
})().catch(e => { console.error(e); process.exit(1); });
