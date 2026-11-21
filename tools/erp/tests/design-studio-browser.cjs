// Graphic Design Studio browser checks (synthetic data only; no live ERP records).
// Run from repository root: npm --prefix tools/erp run test:design
const path = require('path'), fs = require('fs'), assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('../../../.local/audit/node_modules/playwright')); }
const GDS = path.resolve(__dirname, '../../../10. Communication & Productivity/Graphic Design Studio') + '/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BRANDS = ['DM Group', 'Najd', 'Qimsco', 'FCrystal', 'DMCC', 'Asas'];

const emp = { name: 'E002', employee_name: 'Eman Employee', designation: 'Sales Executive', department: 'Sales - DMG', company_email: 'emp@dm.test', cell_number: '+966500000000' };
const boot = (o) => Object.assign({ user: 'x@dm.test', full_name: 'X', employee: emp, roles: { designer: false, admin: false, issuer: false, operator: false },
  tabs: ['brands', 'library'], allowed_brands: ['DM Group', 'Najd'], brands: BRANDS.map((b, i) => ({ name: b, sort_order: i + 1 })), designer_set: true, today: '2026-11-17', api_version: '1' }, o);
const BOOT = {
  designer: boot({ user: 'designer@dm.test', full_name: 'Dana Designer', roles: { designer: true, admin: false, issuer: false, operator: false }, tabs: ['overview', 'requests', 'brands', 'library', 'employees', 'access'], allowed_brands: BRANDS }),
  employee: boot({ user: 'emp@dm.test', full_name: 'Eman Employee' }),
  admin: boot({ user: 'admin@dm.test', full_name: 'Admin', employee: null, roles: { designer: false, admin: true, issuer: false, operator: false }, tabs: ['brands', 'access'], allowed_brands: [], designer_set: false }),
  noemp: boot({ user: 'noemp@dm.test', employee: null, allowed_brands: [] }),
  single: boot({ user: 'hr@dm.test', allowed_brands: ['DM Group'] }),
};
const req = (n, o) => Object.assign({ name: 'DR-0000' + n, title: 'Request ' + n, request_type: 'Flyer', brand: 'Najd', needed_by: '2026-11-30', priority: 'Normal', status: 'Submitted',
  designer_note: null, delivered_on: null, modified: '2026-11-17 09:00:00', creation: '2026-11-15 09:00:00', requested_by: 'emp@dm.test', employee: 'E002', employee_name: 'Eman Employee',
  notified: 0, notify_error: null, change_note: null, files: [], overdue: false, age_days: 2 }, o);
const BOARD = { columns: { Submitted: [req(1), req(2, { overdue: true, needed_by: '2026-11-10', title: '<img src=x onerror=alert(1)>' })], 'In progress': [req(3, { status: 'In progress' })],
  'Needs info': [req(4, { status: 'Needs info', designer_note: 'Which logo?' })], Delivered: [req(5, { status: 'Delivered', delivered_on: '2026-11-16 10:00:00', notified: 0, notify_error: 'SMTP not configured', files: [{ kind: 'Delivery', file: '/private/files/final.pdf', note: 'Print PDF', added_on: '2026-11-16 10:00:00' }] })] },
  counts: { Submitted: 2, 'In progress': 1, 'Needs info': 1, Delivered: 1 }, overdue: 1, due_this_week: 1, closed_recent: [] };
const ASSETS = { rows: [{ name: 'A1', title: 'Primary logo', asset_type: 'Logo', brands: ['DM Group'], tags: 'logo', status: 'Published', version: 1, file: '/files/a1.png', thumbnail: null, formats: 'PNG, SVG', download_count: 3, modified: '2026-11-10' },
  { name: 'A2', title: 'Draft banner', asset_type: 'Print', brands: ['Najd'], tags: '', status: 'Draft', version: 1, file: '/private/files/a2.pdf', thumbnail: null, formats: 'PDF', download_count: 0, modified: '2026-11-12' }], total: 2 };
const BRANDS_LIST = BRANDS.map((b) => ({ name: b, website: b === 'DM Group' ? 'www.dmgroupksa.com' : null, phone: null, fax: null, address_en: null, address_ar: null, aramco_vid: b === 'DM Group' ? '10064669' : null, sabic_vid: null,
  logos: { primary: b === 'DM Group' ? { name: 'A1', title: 'Primary logo', file: '/files/a1.png', thumbnail: null } : null, dark: null, mono: null }, logo_names: {},
  colours: b === 'DM Group' ? [{ colour_name: 'Royal', hex: '#103ba9', rgb: '16 59 169', cmyk: '90 65 0 34', role: 'Primary' }] : [], fonts: [], usage_notes: null }));
const EMPLOYEES = [{ employee: 'E002', employee_name: 'Eman Employee', designation: 'Sales Executive', department: 'Sales - DMG', location: 'Head Office Riyadh', user_id: 'emp@dm.test', company_email: 'emp@dm.test', cell_number: '+966', allowed_brands: ['DM Group', 'Najd'], signature_brand: null, name_ar: null, name_ar_verified: 0, designation_ar: null, designation_ar_verified: 0, gaps: ['no_name_ar', 'no_designation_ar'] },
  { employee: 'E003', employee_name: 'Hadi HR', designation: 'HR Officer', department: 'HR - DMG', location: 'Head Office Riyadh', user_id: 'hr@dm.test', company_email: null, cell_number: null, allowed_brands: [], signature_brand: null, name_ar: 'هادي', name_ar_verified: 1, designation_ar: null, designation_ar_verified: 0, gaps: ['no_email', 'no_mobile', 'no_designation_ar'] }];
const ACCESS = { designer: 'designer@dm.test', certificate_issuers: [], card_operators: [], candidates: [{ user: 'hr@dm.test', full_name: 'Hadi HR', department: 'HR - DMG' }, { user: 'it@dm.test', full_name: 'Ilyas IT', department: 'IT - DMG' }] };
const MINE = [req(7, { status: 'Delivered', files: [{ kind: 'Delivery', file: '/private/files/done.pdf', note: 'Final', added_on: '2026-11-16' }], designer_note: 'Enjoy' }), req(8, { status: 'Needs info', designer_note: 'Which size?' }), req(9)];

function responder(role, over) {
  const base = {
    bootstrap: BOOT[role], requests_board: BOARD, assets_list: ASSETS, brands_list: BRANDS_LIST, employees_list: EMPLOYEES, access_get: ACCESS, my_requests: MINE,
    request_get: (d) => Object.assign({}, BOARD.columns.Submitted[0], { name: d.name, brief: 'Line one\nLine two', timeline: [{ by: 'Eman Employee', at: '2026-11-15', text: 'Hello' }] }),
    request_update: { status: 'In progress' }, request_attach: { files: [] }, request_deliver: { name: 'DR-00001', notified: 1, notify_error: null },
    request_submit: { name: 'DR-00042' }, asset_publish: { name: 'A2' }, employees_set_brands: { updated: 2, failed: [] }, access_set: ACCESS, asset_hit: { ok: true },
  };
  return Object.assign(base, over || {});
}

let browser;
async function open({ role = 'designer', lang = 'en', width = 1440, over, html = 'dashboard.html', css = 'dashboard.css', js = 'dashboard.js', dir = GDS, failActions = [] } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  page.errors = []; page.calls = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  const api = responder(role, over);
  await page.route('**/api/method/design_studio_api', (r) => {
    const q = new URLSearchParams(r.request().postData()); const action = q.get('action'); const data = JSON.parse(q.get('data') || '{}');
    page.calls.push([action, data]);
    if (failActions.includes(action)) return r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ exc_type: 'Exception', _server_messages: JSON.stringify([JSON.stringify({ message: 'Server exploded' })]) }) });
    const v = api[action]; const message = typeof v === 'function' ? v(data) : v;
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: message === undefined ? {} : message }) });
  });
  await page.route('**/api/method/upload_file', (r) => { page.calls.push(['upload_file', {}]); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: { file_url: '/private/files/up-' + page.calls.length + '.pdf', name: 'F1' } }) }); });
  page.otherRoutes = page.route.bind(page);
  await page.route('http://gds.test/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html data-theme="light"><body style="margin:0"><div id="t"></div></body></html>' }));
  await page.goto('http://gds.test/');
  await page.evaluate(({ html, css, lang }) => {
    try { localStorage.setItem('gds-lang', lang); localStorage.setItem('emp-lang', lang); } catch (e) { }
    const sh = document.querySelector('#t').attachShadow({ mode: 'open' }); sh.innerHTML = '<style>' + css + '</style>' + html; window.root_element = sh;
    window.__ = (s) => s; window.routes = [];
    window.frappe = { csrf_token: 'x', session: { user: 'x@dm.test', user_fullname: 'X' }, boot: { sysdefaults: { currency: 'SAR' } }, datetime: { get_today: () => '2026-11-17' },
      msgprint() { }, show_alert() { }, set_route: (...a) => window.routes.push(a), call: () => Promise.resolve({ message: {} }) };
  }, { html: fs.readFileSync(dir + html, 'utf8'), css: fs.readFileSync(dir + css, 'utf8'), lang });
  await page.addScriptTag({ content: fs.readFileSync(dir + js, 'utf8') });
  await page.waitForTimeout(400);
  return page;
}
const $ = (page, sel) => page.locator('#t').locator(sel);
const texts = (page, sel) => page.evaluate((s) => [...window.root_element.querySelectorAll(s)].map((e) => e.textContent.trim()), sel);
const calls = (page, action) => page.calls.filter((c) => c[0] === action).map((c) => c[1]);

const CASES = [];
const test = (name, fn) => CASES.push([name, fn]);

// ---------------------------------------------------------------- Task 7: shell, tabs, overview
test('designer sees six tabs and overview KPIs', async () => {
  const page = await open();
  assert.deepEqual(await texts(page, '.tab .lbl'), ['Overview', 'Requests', 'Brand kits', 'Library', 'Employees', 'Access']);
  const kpis = await page.evaluate(() => Object.fromEntries([...window.root_element.querySelectorAll('#view-overview .metric')].map((m) => [m.querySelector('.ml').textContent.trim(), m.querySelector('.mv').textContent.trim()])));
  assert.equal(kpis['Open requests'], '4');
  assert.equal(kpis['Overdue'], '1');
  assert.equal(kpis['Due this week'], '1');
  assert.equal(kpis['Published assets'], '1');
  assert.equal(kpis['Employees missing data'], '2');
  const headH = await page.evaluate(() => window.root_element.querySelector('.head').getBoundingClientRect().height);
  assert.ok(headH <= 72, 'header is one line: ' + headH);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('employee sees only brand kits and library', async () => {
  const page = await open({ role: 'employee' });
  assert.deepEqual(await texts(page, '.tab .lbl'), ['Brand kits', 'Library']);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('system manager without designer is asked to set one', async () => {
  const page = await open({ role: 'admin' });
  assert.deepEqual(await texts(page, '.tab .lbl'), ['Brand kits', 'Access']);
  await $(page, '.tab[data-tab="access"]').click();
  await page.waitForTimeout(200);
  assert.match(await $(page, '#view-access').innerText(), /Set the designer/);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('arabic switches direction and labels', async () => {
  const page = await open({ lang: 'ar' });
  assert.equal(await page.evaluate(() => window.root_element.querySelector('#gds').getAttribute('dir')), 'rtl');
  assert.equal((await texts(page, '.tab .lbl'))[0], 'نظرة عامة');
  assert.deepEqual(page.errors, []);
  await page.close();
});

module.exports = { open, $, texts, calls, test, CASES, BOOT, BOARD };

(async () => {
  browser = await chromium.launch({ executablePath: fs.existsSync(EDGE) ? EDGE : undefined, headless: true });
  let failed = 0;
  const only = process.argv[2];
  for (const [name, fn] of CASES) {
    if (only && !name.includes(only)) continue;
    try { await fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '\n   ', (e && e.message || String(e)).split('\n').slice(0, 4).join('\n    ')); }
  }
  await browser.close();
  if (failed) { console.log(failed + ' failed'); process.exit(1); }
  console.log('Graphic Design Studio browser checks passed.');
})();
