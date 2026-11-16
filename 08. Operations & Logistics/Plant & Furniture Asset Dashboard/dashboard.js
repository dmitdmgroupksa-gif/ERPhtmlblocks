/* Plant & Furniture Asset Dashboard — DM Group KSA
   Frappe Custom HTML Block (JS field). root_element is the block's shadow root.
   Read-only: uses only frappe.call -> frappe.client.get_list / get / get_count (permission-checked). No writes. */
(function () {
'use strict';
const R = root_element;
if (R.__pfadDestroy) { try { R.__pfadDestroy(); } catch (e) {} }
const ac = new AbortController();
R.__pfadDestroy = () => ac.abort();
const root = R.querySelector('#pfad');
if (!root) return;

/* ---------- constants ---------- */
const SC = { plant: 'Plant and Machinery Direct', furn: 'Fixtures & Fittings-Indirect' };
const SCOPE_CATS = [SC.plant, SC.furn];
const DM_FURN = ['Chair', 'Table'];
const DISPOSED = ['Sold', 'Scrapped', 'Decapitalized'];
const CAP = 5000;
const TABS = [
  ['overview', 'grid'], ['register', 'list'], ['plant', 'layers'], ['furniture', 'box'], ['valuation', 'dollar'],
  ['assign', 'users'], ['movement', 'swap'], ['audit', 'shield']
];
const IC = {
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  warn: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};
const ic = n => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>';

/* ---------- state ---------- */
let lsLang = 'en';
try { lsLang = localStorage.getItem('pfad_lang') || 'en'; } catch (e) {}
const today = new Date(); const TODAY = isoDate(today);
const S = {
  lang: lsLang === 'ar' ? 'ar' : 'en', tab: 'overview', tok: 0,
  f: { company: '', category: '', location: '', department: '', custodian: '', status: 'active', from: '', to: '', q: '' },
  T: {}, cal: { y: today.getFullYear(), m: today.getMonth() }, opt: { mvAll: false, dmAll: false, acqAll: false },
  meta: null, detail: null
};
const MEMO = new Map();
const DOCS = new Map();
let METRIC = {}; // per-render scratch

/* ---------- utils ---------- */
function isoDate(d) { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n, d) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d });
const dstr = v => v ? String(v).slice(0, 10) : '';
const isNum = v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
const num = v => isNum(v) ? Number(v) : 0;
const uniq = a => [...new Set(a.filter(x => x !== null && x !== undefined && x !== ''))];
const sum = (a, f) => a.reduce((s, x) => s + num(f(x)), 0);
const dayDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / 864e5);
function slug(dt) { try { return frappe.router.slug(dt); } catch (e) { return String(dt).toLowerCase().replace(/ /g, '-'); } }
const formUrl = (dt, name) => '/app/' + slug(dt) + '/' + encodeURIComponent(name);
const link = (dt, name, txt) => name ? '<a class="lk" target="_blank" rel="noopener" href="' + esc(formUrl(dt, name)) + '">' + esc(txt || name) + '</a>' : '';
const canRead = dt => { try { return frappe.model.can_read(dt); } catch (e) { return true; } };
const cmp = (a, b) => {
  const an = a === null || a === undefined || a === '', bn = b === null || b === undefined || b === '';
  if (an && bn) return 0; if (an) return 1; if (bn) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
};
function pool(items, n, fn) {
  let i = 0; const out = new Array(items.length);
  const w = async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = { __err: e }; } } };
  return Promise.all(Array.from({ length: Math.min(n, items.length) }, w)).then(() => out);
}
function memo(key, fn) { if (!MEMO.has(key)) { const p = Promise.resolve().then(fn); MEMO.set(key, p); p.catch(() => MEMO.delete(key)); } return MEMO.get(key); }

/* ---------- ERP access (read only, permission-checked) ---------- */
function call(method, args) {
  return new Promise((res, rej) => frappe.call({ method, args, silent: true, no_spinner: true, callback: r => res(r.message), error: e => rej(e || new Error('call failed')) }));
}
async function list(dt, o) {
  o = o || {};
  const a = { doctype: dt, fields: JSON.stringify(o.fields || ['name']), filters: JSON.stringify(o.filters || []), limit_start: o.start || 0, limit_page_length: o.limit || 500 };
  if (o.or) a.or_filters = JSON.stringify(o.or);
  if (o.order) a.order_by = o.order;
  if (o.parent) a.parent = o.parent;
  if (o.group) a.group_by = o.group;
  return (await call('frappe.client.get_list', a)) || [];
}
async function fetchAll(dt, o, cap) {
  cap = cap || CAP; const out = []; let start = 0; const step = 500;
  for (;;) {
    const page = await list(dt, Object.assign({}, o, { start, limit: step }));
    out.push(...page);
    if (page.length < step || out.length >= cap) break;
    start += step;
  }
  return { rows: out.slice(0, cap), capped: out.length >= cap };
}
async function countOf(dt, o) {
  const r = await list(dt, { fields: ['count(name) as n'], filters: o.filters, or: o.or, limit: 1 });
  return r && r[0] ? num(r[0].n) : 0;
}
const getDoc = (dt, name) => { const k = dt + '|' + name; if (!DOCS.has(k)) { const p = call('frappe.client.get', { doctype: dt, name }); DOCS.set(k, p); p.catch(() => DOCS.delete(k)); } return DOCS.get(k); };

/* ---------- i18n ---------- */
let I = { en: {}, ar: {} };
const tr = (k, ...a) => {
  const d = I[S.lang] || I.en; let s = d[k] != null ? d[k] : (I.en[k] != null ? I.en[k] : k);
  return a.length ? s.replace(/[{]([0-9]+)[}]/g, (m, i) => a[+i]) : s;
};

/* ---------- filters ---------- */
const ASSET_F = ['name', 'asset_name', 'asset_category', 'company', 'location', 'custodian', 'department', 'status', 'docstatus', 'purchase_date', 'available_for_use_date', 'total_asset_cost', 'gross_purchase_amount', 'additional_asset_cost', 'value_after_depreciation', 'opening_accumulated_depreciation', 'is_fully_depreciated', 'calculate_depreciation', 'maintenance_required', 'asset_quantity', 'disposal_date', 'insurance_end_date', 'default_finance_book'];
const STATUS_OPTS = ['Submitted', 'Partially Depreciated', 'Fully Depreciated', 'Sold', 'Scrapped', 'In Maintenance', 'Out of Order', 'Issue', 'Receipt', 'Capitalized', 'Decapitalized'];
function aFilters(o) {
  o = o || {}; const f = S.f, F = [];
  F.push(['asset_category', 'in', f.category ? [f.category] : SCOPE_CATS]);
  if (f.company) F.push(['company', '=', f.company]);
  const nz = (fld, v) => F.push(v === '__none__' ? [fld, 'is', 'not set'] : [fld, '=', v]);
  if (f.location) nz('location', f.location);
  if (f.department) nz('department', f.department);
  if (f.custodian) nz('custodian', f.custodian);
  const st = o.status || f.status;
  if (st === 'active') { F.push(['docstatus', '=', 1]); F.push(['status', 'not in', DISPOSED]); }
  else if (st === 'cancelled') F.push(['docstatus', '=', 2]);
  else if (st === 'draft') F.push(['docstatus', '=', 0]);
  else if (st === 'noncancelled') F.push(['docstatus', '<', 2]);
  else if (st.indexOf('st:') === 0) { F.push(['docstatus', '=', 1]); F.push(['status', '=', st.slice(3)]); }
  if (!o.noDate) { if (f.from) F.push(['purchase_date', '>=', f.from]); if (f.to) F.push(['purchase_date', '<=', f.to]); }
  return F;
}
const aOr = () => S.f.q ? [['name', 'like', '%' + S.f.q + '%'], ['asset_name', 'like', '%' + S.f.q + '%']] : null;
function dmFilters(all) {
  const f = S.f, F = [['docstatus', '<', 2]];
  if (!all) F.push(['category', 'in', DM_FURN]);
  if (f.location) F.push(f.location === '__none__' ? ['location', 'is', 'not set'] : ['location', '=', f.location]);
  if (f.custodian) F.push(f.custodian === '__none__' ? ['employee', 'is', 'not set'] : ['employee', '=', f.custodian]);
  if (f.from) F.push(['date', '>=', f.from]); if (f.to) F.push(['date', '<=', f.to]);
  if (f.category && SCOPE_CATS.indexOf(f.category) >= 0 && f.category === SC.plant) F.push(['name', '=', '__none__']); // plant category selected -> no furniture rows
  return F;
}
const dmOr = () => S.f.q ? [['name', 'like', '%' + S.f.q + '%'], ['asset_id', 'like', '%' + S.f.q + '%'], ['description', 'like', '%' + S.f.q + '%']] : null;
const filterKey = () => JSON.stringify(S.f);

/* ---------- loaders ---------- */
const L = {};
L.meta = () => memo('meta', async () => {
  const [companies, cats] = await Promise.all([
    list('Company', { fields: ['name', 'default_currency'], limit: 200 }).catch(() => []),
    list('Asset Category', { fields: ['name'], limit: 200 }).catch(() => [])
  ]);
  const cur = {}; companies.forEach(c => cur[c.name] = c.default_currency);
  const perms = {}; ['Asset', 'DM Assets', 'Asset Maintenance', 'Asset Maintenance Log', 'Asset Repair', 'Asset Movement', 'Asset Acquisition Records'].forEach(d => perms[d] = canRead(d));
  const dmRows = perms['DM Assets'] ? (await fetchAll('DM Assets', { fields: ['location', 'employee'], filters: [['docstatus', '<', 2]] }).catch(() => ({ rows: [] }))).rows : [];
  const dmLoc = dmRows.map(x => ({ location: x.location })), dmEmp = dmRows.map(x => ({ employee: x.employee }));
  return { companies, cur, catNames: cats.map(c => c.name), perms, dmLoc: uniq(dmLoc.map(x => x.location)), dmEmp: uniq(dmEmp.map(x => x.employee)) };
});
L.scope = () => memo('scope', async () => {
  const r = await fetchAll('Asset', { fields: ASSET_F, filters: [['asset_category', 'in', SCOPE_CATS]], order: 'modified desc' });
  const map = {}; r.rows.forEach(a => map[a.name] = a);
  return { rows: r.rows, map, capped: r.capped };
});
L.assets = o => memo('assets|' + filterKey() + '|' + JSON.stringify(o || {}), async () => {
  const r = await fetchAll('Asset', { fields: ASSET_F, filters: aFilters(o), or: aOr(), order: 'purchase_date desc, modified desc' });
  return r;
});
L.mnt = () => memo('mnt', async () => {
  const sc = (await L.scope()).map; const P = (await L.meta()).perms; const out = { denied: {}, plans: [], tasks: [], logs: [], repairs: [], consumed: [] };
  const ld = async (key, dt, fn) => { if (!canRead(dt)) { out.denied[key] = true; return; } try { await fn(); } catch (e) { out.denied[key] = true; out.err = out.err || {}; out.err[key] = errText(e); } };
  await Promise.all([
    ld('plans', 'Asset Maintenance', async () => {
      const p = (await fetchAll('Asset Maintenance', { fields: ['name', 'asset_name', 'asset_category', 'company', 'maintenance_team', 'maintenance_manager', 'maintenance_manager_name'] })).rows.filter(x => sc[x.asset_name]);
      out.plans = p; const names = new Set(p.map(x => x.name));
      const t = (await fetchAll('Asset Maintenance Task', { parent: 'Asset Maintenance', fields: ['name', 'parent', 'maintenance_task', 'maintenance_type', 'maintenance_status', 'start_date', 'end_date', 'periodicity', 'next_due_date', 'last_completion_date', 'certificate_required', 'assign_to', 'assign_to_name', 'description'] })).rows;
      out.tasks = t.filter(x => names.has(x.parent));
    }),
    ld('logs', 'Asset Maintenance Log', async () => {
      out.logs = (await fetchAll('Asset Maintenance Log', { fields: ['name', 'asset_maintenance', 'asset_name', 'task', 'task_name', 'maintenance_type', 'maintenance_status', 'due_date', 'completion_date', 'actions_performed', 'has_certificate', 'certificate_attachement', 'assign_to_name', 'docstatus'] })).rows.filter(x => sc[x.asset_name]);
    }),
    ld('repairs', 'Asset Repair', async () => {
      out.repairs = (await fetchAll('Asset Repair', { fields: ['name', 'asset', 'company', 'repair_status', 'failure_date', 'completion_date', 'repair_cost', 'total_repair_cost', 'capitalize_repair_cost', 'downtime', 'description', 'actions_performed', 'docstatus'] })).rows.filter(x => sc[x.asset]);
      const names = new Set(out.repairs.map(x => x.name));
      if (names.size) out.consumed = (await fetchAll('Asset Repair Consumed Item', { parent: 'Asset Repair', fields: ['parent', 'item_code', 'consumed_quantity', 'valuation_rate', 'total_value'] })).rows.filter(x => names.has(x.parent));
      out.repairsTotalAll = await countOf('Asset Repair', { filters: [] }).catch(() => null);
    })
  ]);
  return out;
});
L.dm = all => memo('dm|' + filterKey() + '|' + !!all, async () => {
  if (!canRead('DM Assets')) return { denied: true, rows: [] };
  const r = await fetchAll('DM Assets', { fields: ['name', 'asset_id', 'date', 'employee', 'location', 'category', 'description', 'docstatus'], filters: dmFilters(all), or: dmOr(), order: 'date desc' });
  return r;
});
L.mv = () => memo('mv', async () => {
  if (!canRead('Asset Movement')) return { denied: true, rows: [] };
  const p = (await fetchAll('Asset Movement', { fields: ['name', 'company', 'purpose', 'transaction_date', 'reference_doctype', 'reference_name', 'docstatus'] })).rows;
  const pm = {}; p.forEach(x => pm[x.name] = x);
  const it = (await fetchAll('Asset Movement Item', { parent: 'Asset Movement', fields: ['name', 'parent', 'asset', 'asset_name', 'source_location', 'target_location', 'from_employee', 'to_employee', 'request_category', 'company'] })).rows;
  const rows = it.filter(x => pm[x.parent]).map(x => Object.assign({}, x, { _p: pm[x.parent] }));
  return { rows, parents: p };
});
L.acq = () => memo('acq', async () => {
  if (!canRead('Asset Acquisition Records')) return { denied: true, rows: [] };
  const p = (await fetchAll('Asset Acquisition Records', { fields: ['name', 'date', 'employee', 'branch', 'custom_job_location', 'workflow_state', 'satus', 'approval_status', 'emp_status', 'request_type', 'docstatus'] })).rows;
  const pm = {}; p.forEach(x => pm[x.name] = x);
  const it = (await fetchAll('Asset Acquisition Table', { parent: 'Asset Acquisition Records', fields: ['name', 'parent', 'item_name', 'dmasset_no', 'quanity', 'life_cercle_end', 'ids', 'condition_item', 'detail_desc', 'life_cercle_frm'] })).rows;
  return { rows: it.filter(x => pm[x.parent]).map(x => Object.assign({}, x, { _p: pm[x.parent] })), parents: p };
});
function errText(e) {
  try { if (e && e.responseJSON && e.responseJSON._server_messages) { const m = JSON.parse(JSON.parse(e.responseJSON._server_messages)[0]); return String(m.message || '').replace(/<[^>]+>/g, '').slice(0, 160); } } catch (x) {}
  return (e && (e.message || e.statusText)) ? String(e.message || e.statusText).slice(0, 160) : tr('err_generic');
}

/* ---------- valuation (read-only, transparent rule) ---------- */
function valuate(d) {
  const r = { name: d.name, status: d.status, cost: num(d.total_asset_cost), company: d.company, verified: false, nbv: null, acc: null, reason: '', disposed: false, multiFB: false, sched: [], fb: null, posted: 0 };
  if (d.docstatus !== 1) { r.reason = 'not_submitted'; return r; }
  if (DISPOSED.indexOf(d.status) >= 0) { r.disposed = true; r.reason = 'disposed'; return r; }
  const fbs = d.finance_books || []; r.multiFB = fbs.length > 1;
  const fb = fbs.find(x => x.finance_book && x.finance_book === d.default_finance_book) || fbs[0] || null; r.fb = fb ? (fb.finance_book || '(default)') : null;
  let sched = d.schedules || [];
  if (fbs.length > 1 && fb) sched = sched.filter(s => (s.finance_book || null) === (fb.finance_book || null));
  r.sched = sched;
  const posted = sched.filter(s => s.journal_entry);
  r.posted = sum(posted, s => s.depreciation_amount);
  r.acc = num(d.opening_accumulated_depreciation) + r.posted;
  const field = fb && isNum(fb.value_after_depreciation) ? num(fb.value_after_depreciation) : num(d.value_after_depreciation);
  const derived = r.cost - r.acc; r.field = field; r.derived = derived;
  if (!(r.cost > 0)) { r.reason = 'no_cost'; return r; }
  if (!d.calculate_depreciation && !num(d.opening_accumulated_depreciation) && !sched.length) { r.reason = 'no_dep_calc'; return r; }
  if (Math.abs(field - derived) <= 1) { r.verified = true; r.nbv = Math.max(0, derived); return r; }
  r.reason = field <= 0.5 ? 'zero_unproven' : 'mismatch';
  return r;
}
L.val = () => memo('val|' + filterKey(), async () => {
  const a = (await L.assets()).rows.filter(x => x.docstatus === 1);
  const sel = a.slice(0, 150);
  const docs = await pool(sel, 5, x => getDoc('Asset', x.name));
  const vals = docs.map((d, i) => d && !d.__err ? valuate(d) : { name: sel[i].name, verified: false, reason: 'load_failed', cost: num(sel[i].total_asset_cost), company: sel[i].company, status: sel[i].status, sched: [] });
  const vm = {}; vals.forEach(v => vm[v.name] = v);
  return { vals, vm, partial: a.length > sel.length, total: a.length, docs: docs.filter(d => d && !d.__err) };
});

/* ---------- money helpers ---------- */
function curOf(company) { const m = S.meta; return (m && m.cur[company]) || ''; }
function byCur(rows, f) { const o = {}; rows.forEach(r => { const c = curOf(r.company) || '—'; o[c] = (o[c] || 0) + num(f(r)); }); return o; }
function moneyMap(o, d) { const k = Object.keys(o); if (!k.length) return nf(0, d); return k.map(c => (c === '—' ? '' : c + ' ') + (d == null ? mf2(o[c]) : nf(o[c], d))).join(' · '); }
const mf2 = n => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n, company) => (curOf(company) ? curOf(company) + ' ' : '') + mf2(n);

/* ---------- UI components ---------- */
const PAL = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)'];
const attrSet = o => ' data-set="' + esc(JSON.stringify(o || {})) + '"';
function kpi(o) {
  const cls = 'kpi ' + (o.cls || '') + (o.na ? ' na' : '');
  const inner = '<div class="l"><span class="dot"></span>' + esc(o.l) + '</div><div class="v">' + (o.raw ? o.v : esc(o.v)) + '</div>' + (o.s ? '<div class="s">' + esc(o.s) + '</div>' : '');
  if (o.go) return '<button class="' + cls + '" data-act="drill" data-go="' + o.go + '"' + attrSet(o.set) + ' title="' + esc(tr('drill_hint')) + '">' + inner + '</button>';
  return '<div class="' + cls + '">' + inner + '</div>';
}
const empty = (t, s) => '<div class="empty"><b>' + esc(t || tr('empty')) + '</b>' + (s ? esc(s) : '') + '</div>';
const nc = (t, s) => '<div class="nc"><b>' + esc(t || tr('not_configured')) + '</b><div>' + esc(s || '') + '</div></div>';
const chip = (t, c) => '<span class="chip ' + (c || '') + '">' + esc(t) + '</span>';
const banner = (t, c) => '<div class="banner ' + (c || 'info') + '">' + (t.indexOf('<') === 0 ? t : esc(t)) + '</div>';
const card = (title, hint, body, extra) => '<div class="card"><div class="top"><div><h3>' + esc(title) + '</h3>' + (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>' + (extra || '') + '</div>' + body + '</div>';

function bars(items, o) {
  o = o || {}; if (!items.length || !items.some(i => i.value > 0)) return empty();
  const max = Math.max.apply(null, items.map(i => i.value)) || 1;
  return '<div class="bars">' + items.map((i, k) => {
    const inner = '<span class="bl" title="' + esc(i.label) + '">' + esc(i.label) + '</span><span class="track"><span class="fill" style="display:block;width:' + Math.max(1, Math.round(i.value / max * 100)) + '%;background:' + (i.color || PAL[k % PAL.length]) + '"></span></span><span class="bv">' + esc(i.disp != null ? i.disp : nf(i.value)) + '</span>';
    return i.go ? '<button class="bar" data-act="drill" data-go="' + i.go + '"' + attrSet(i.set) + '>' + inner + '</button>' : '<div class="bar">' + inner + '</div>';
  }).join('') + '</div>';
}
function donut(items) {
  items = items.filter(i => i.value > 0); const tot = sum(items, i => i.value);
  if (!tot) return empty();
  let off = 0, segs = '';
  items.forEach((i, k) => {
    const p = i.value / tot * 100, col = PAL[k % PAL.length];
    const d = '<circle class="hit" r="15.9155" cx="21" cy="21" fill="none" stroke="' + col + '" stroke-width="6" stroke-dasharray="' + p.toFixed(3) + ' ' + (100 - p).toFixed(3) + '" stroke-dashoffset="' + (25 - off).toFixed(3) + '"' + (i.go ? ' data-act="drill" data-go="' + i.go + '"' + attrSet(i.set) : '') + '><title>' + esc(i.label + ': ' + nf(i.value)) + '</title></circle>';
    segs += d; off += p; i._c = col;
  });
  return '<div class="donutw"><svg viewBox="0 0 42 42" role="img"><circle r="15.9155" cx="21" cy="21" fill="none" stroke="#eef1f7" stroke-width="6"/>' + segs + '<text x="21" y="21.5" text-anchor="middle" font-size="6.5" font-weight="700" fill="#16213a">' + nf(tot) + '</text><text x="21" y="26.5" text-anchor="middle" font-size="2.6" fill="#64708a">' + esc(tr('records')) + '</text></svg><div class="leg">' +
    items.map(i => '<button' + (i.go ? ' data-act="drill" data-go="' + i.go + '"' + attrSet(i.set) + '' : '') + '><i style="background:' + i._c + '"></i><span>' + esc(i.label) + '</span><b>' + nf(i.value) + '</b></button>').join('') + '</div></div>';
}
function lineChart(items, o) {
  o = o || {}; if (!items.length) return empty();
  const W = 600, H = 190, pl = 40, pr = 12, pt = 14, pb = 28; const max = Math.max.apply(null, items.map(i => i.value)) || 1;
  const x = k => items.length === 1 ? W / 2 : pl + k * (W - pl - pr) / (items.length - 1), y = v => H - pb - v / max * (H - pb - pt);
  const pts = items.map((i, k) => x(k).toFixed(1) + ',' + y(i.value).toFixed(1)).join(' ');
  const step = Math.ceil(items.length / 8);
  let s = '<div class="linew"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  [0, .5, 1].forEach(g => { const yy = y(max * g); s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '" stroke="#e4e8f1"/><text x="' + (pl - 5) + '" y="' + (yy + 3) + '" text-anchor="end" font-size="10" fill="#64708a">' + esc(o.axis ? o.axis(max * g) : nf(max * g)) + '</text>'; });
  s += '<polygon points="' + pl + ',' + (H - pb) + ' ' + pts + ' ' + x(items.length - 1) + ',' + (H - pb) + '" fill="rgba(43,95,217,.10)"/><polyline points="' + pts + '" fill="none" stroke="#2b5fd9" stroke-width="2.2"/>';
  items.forEach((i, k) => {
    s += '<g class="hit"' + (i.go ? ' data-act="drill" data-go="' + i.go + '"' + attrSet(i.set) : '') + '><circle cx="' + x(k) + '" cy="' + y(i.value) + '" r="4.5" fill="#fff" stroke="#2b5fd9" stroke-width="2"/><title>' + esc(i.label + ': ' + (i.disp || nf(i.value))) + '</title></g>';
    if (k % step === 0 || k === items.length - 1) s += '<text x="' + x(k) + '" y="' + (H - 9) + '" text-anchor="' + (k === 0 && items.length > 1 ? 'start' : k === items.length - 1 && items.length > 1 ? 'end' : 'middle') + '" font-size="10" fill="#64708a">' + esc(i.label) + '</text>';
  });
  return s + '</svg></div>';
}

/* generic client-side table with sort + pagination + CSV */
const REG = {};
function table(id, cols, rows, o) {
  o = o || {}; const st = S.T[id] || (S.T[id] = { page: 1, sort: o.sort || null, dir: o.dir || 1, size: o.size || 10 });
  REG[id] = { cols, rows, name: o.name || id };
  if (!rows.length) return empty(o.emptyTitle, o.emptyMsg);
  let data = rows;
  if (st.sort) { const c = cols.find(c => c.id === st.sort); if (c) { const g = c.v || (r => r[c.id]); data = rows.slice().sort((a, b) => cmp(g(a), g(b)) * st.dir); } }
  const pages = Math.max(1, Math.ceil(data.length / st.size)); if (st.page > pages) st.page = pages;
  const slice = data.slice((st.page - 1) * st.size, st.page * st.size);
  return tableMarkup(id, cols, slice, { total: data.length, page: st.page, size: st.size, pages, sort: st.sort, dir: st.dir, csv: !o.noCsv });
}
function tableMarkup(id, cols, slice, p) {
  let h = '<div class="tw"><table class="t"><thead><tr>' + cols.map(c => '<th class="' + (c.n ? 'n ' : '') + (c.nosort ? '' : 's') + '"' + (c.nosort ? '' : ' data-act="sort" data-t="' + id + '" data-c="' + c.id + '"') + '>' + esc(c.label) + (p.sort === c.id ? (p.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr></thead><tbody>';
  h += slice.map(r => '<tr>' + cols.map(c => '<td class="' + (c.n ? 'n ' : '') + (c.nw ? 'nw' : '') + '">' + (c.h ? c.h(r) : esc(r[c.id] == null ? '' : r[c.id])) + '</td>').join('') + '</tr>').join('');
  h += '</tbody></table></div>';
  const from = p.total ? (p.page - 1) * p.size + 1 : 0, to = Math.min(p.total, p.page * p.size);
  h += '<div class="pg"><span>' + esc(tr('showing', from, to, nf(p.total))) + '</span><span class="pb">' +
    '<button class="btn sm" data-act="pg" data-t="' + id + '" data-d="-1"' + (p.page <= 1 ? ' disabled' : '') + '>‹</button><span>' + p.page + ' / ' + p.pages + '</span><button class="btn sm" data-act="pg" data-t="' + id + '" data-d="1"' + (p.page >= p.pages ? ' disabled' : '') + '>›</button>' +
    '<select data-act="size" data-t="' + id + '" style="font:inherit;font-size:11px;border:1px solid var(--line);border-radius:6px;padding:2px">' + [10, 25, 50, 100].map(n => '<option' + (n === p.size ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>' +
    (p.csv === false ? '' : '<button class="btn sm" data-act="csv" data-t="' + id + '">' + ic('download') + esc(tr('export_csv')) + '</button>') + '</span></div>';
  return h;
}
function csvText(cols, rows) {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const cs = cols.filter(c => !c.noExport);
  return String.fromCharCode(65279) + [cs.map(c => q(c.label)).join(',')].concat(rows.map(r => cs.map(c => q(c.x ? c.x(r) : c.v ? c.v(r) : r[c.id])).join(','))).join(String.fromCharCode(13, 10));
}
function download(name, text) {
  const b = new Blob([text], { type: 'text/csv;charset=utf-8' }); const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u; a.download = name + '_' + TODAY + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500);
}

/* status chips (ERP values preserved) */
function stChip(s, docstatus) {
  if (docstatus === 2 || s === 'Cancelled') return chip(s || 'Cancelled', 'bad');
  const m = { 'Fully Depreciated': 'warn', 'In Maintenance': 'info', 'Out of Order': 'bad', Sold: '', Scrapped: '', Submitted: 'ok', 'Partially Depreciated': 'ok', Draft: 'warn', Completed: 'ok', Planned: 'pri', Overdue: 'bad', Pending: 'warn' };
  return chip(s || '—', m[s] || '');
}
const sevChip = s => chip(tr('sev_' + s), s === 'high' ? 'bad' : s === 'medium' ? 'warn' : s === 'low' ? 'info' : '');
const actBtns = (dt, name, kind) => '<span class="nw"><button class="btn sm" data-act="detail" data-dt="' + esc(dt) + '" data-n="' + esc(name) + '">' + ic('eye') + esc(tr('view')) + '</button> <a class="btn sm" target="_blank" rel="noopener" href="' + esc(formUrl(dt, name)) + '">' + ic('ext') + esc(tr('open_erp')) + '</a></span>';

/* ---------- maintenance helpers ---------- */
function taskState(t) {
  if (t.maintenance_status === 'Cancelled') return 'cancelled';
  if (t.end_date && t.end_date < TODAY) return 'ended';
  if (t.next_due_date && t.next_due_date < TODAY) return 'overdue';
  if (t.maintenance_status === 'Overdue') return 'overdue';
  return 'planned';
}
function inRange(d) { if (!d) return !(S.f.from || S.f.to); const x = dstr(d); return (!S.f.from || x >= S.f.from) && (!S.f.to || x <= S.f.to); }
/* maintenance dataset restricted to the assets currently selected by the global filters (status/category/company/location/etc.; date range applies to event dates) */
async function mScope() {
  const [M, A, sc] = await Promise.all([L.mnt(), L.assets({ noDate: true }), L.scope()]);
  const set = new Set(A.rows.map(a => a.name));
  const plans = M.plans.filter(p => set.has(p.asset_name)); const pn = new Set(plans.map(p => p.name)); const pmap = {}; plans.forEach(p => pmap[p.name] = p);
  const dr = !!(S.f.from || S.f.to);
  const tasks = M.tasks.filter(t => pn.has(t.parent) && (!dr || inRange(t.next_due_date))).map(t => Object.assign({}, t, { _asset: pmap[t.parent].asset_name, _plan: pmap[t.parent], _state: taskState(t) }));
  const logs = M.logs.filter(l => set.has(l.asset_name) && l.docstatus !== 2 && (!dr || inRange(l.due_date || l.completion_date)));
  const repairs = M.repairs.filter(r => set.has(r.asset) && r.docstatus !== 2 && (!dr || inRange(r.failure_date)));
  const rn = new Set(repairs.map(r => r.name)); const consumed = M.consumed.filter(c => rn.has(c.parent));
  const od = new Map();
  logs.forEach(l => { if (['Planned', 'Overdue'].indexOf(l.maintenance_status) >= 0 && l.due_date && dstr(l.due_date) < TODAY) od.set(l.task || l.name, { asset: l.asset_name, task: l.task_name, due: dstr(l.due_date), src: 'Asset Maintenance Log', ref: l.name }); });
  tasks.forEach(t => { if (t._state === 'overdue' && !od.has(t.name)) od.set(t.name, { asset: t._asset, task: t.maintenance_task, due: dstr(t.next_due_date), src: 'Asset Maintenance', ref: t.parent }); });
  return { M, A, assetRows: A.rows, set, plans, tasks, logs, repairs, consumed, overdue: [...od.values()], denied: M.denied, sc };
}
const repCost = r => num(r.total_repair_cost) || num(r.repair_cost);
function lastNext(M) {
  const last = {}, next = {};
  M.tasks.forEach(t => { const a = (M.plans.find(p => p.name === t.parent) || {}).asset_name; if (!a) return; if (t.last_completion_date && (!last[a] || t.last_completion_date > last[a])) last[a] = dstr(t.last_completion_date); if (t.maintenance_status !== 'Cancelled' && t.next_due_date && (!next[a] || t.next_due_date < next[a])) next[a] = dstr(t.next_due_date); });
  M.logs.forEach(l => { if (l.maintenance_status === 'Completed' && l.completion_date && (!last[l.asset_name] || dstr(l.completion_date) > last[l.asset_name])) last[l.asset_name] = dstr(l.completion_date); });
  return { last, next };
}
const grp = (rows, f) => { const o = {}; rows.forEach(r => { const k = f(r); o[k] = (o[k] || 0) + 1; }); return o; };
const NONE = () => tr('none_set');

/* ---------- drill / filters ---------- */
function drill(go, set) {
  Object.keys(set || {}).forEach(k => { S.f[k] = set[k]; });
  S.T = {}; syncFilterInputs(); show(go || 'register');
}
function syncFilterInputs() {
  root.querySelectorAll('[data-f]').forEach(el => { const v = S.f[el.dataset.f]; if (el.tagName === 'SELECT' && v && !Array.from(el.options).some(o => o.value === v)) { const o = document.createElement('option'); o.value = v; o.textContent = v === '__none__' ? NONE() : v; el.appendChild(o); } el.value = v || ''; });
}

/* ---------- OVERVIEW ---------- */
const DRAW = {};
DRAW.overview = async () => {
  const [A, M, V, dm, total] = await Promise.all([L.assets(), mScope(), L.val(), L.dm(false), countOf('Asset', { filters: aFilters(), or: aOr() })]);
  const rows = A.rows, plant = rows.filter(r => r.asset_category === SC.plant), furn = rows.filter(r => r.asset_category === SC.furn);
  const cost = byCur(rows.filter(r => r.docstatus === 1), r => r.total_asset_cost);
  const verified = V.vals.filter(v => v.verified), unver = V.vals.filter(v => !v.verified && !v.disposed);
  const nbv = byCur(verified, v => v.nbv);
  const fd = rows.filter(r => r.status === 'Fully Depreciated'), im = rows.filter(r => r.status === 'In Maintenance');
  const nocust = rows.filter(r => !r.custodian), nofin = rows.filter(r => !r.location || !(num(r.total_asset_cost) > 0));
  const calib = M.tasks.filter(t => t.maintenance_type === 'Calibration' && t._state !== 'cancelled');
  const recOk = total === rows.length && !A.capped;
  let h = banner(tr('measures_note'), 'info');
  h += '<div class="kpis">' +
    kpi({ l: tr('k_plant'), v: nf(plant.length), s: tr('s_qty', nf(sum(plant, r => r.asset_quantity)), nf(plant.length)), go: 'plant', cls: 'ok' }) +
    kpi({ l: tr('k_furn'), v: nf(furn.length + dm.rows.length), s: tr('s_furn', nf(furn.length), nf(dm.rows.length)), go: 'furniture' }) +
    kpi({ l: tr('k_cost'), v: moneyMap(cost, 0), s: tr('s_hist'), go: 'valuation' }) +
    kpi({ l: tr('k_nbv'), v: verified.length ? moneyMap(nbv, 0) : tr('unavailable'), s: tr('s_nbv', nf(verified.length), nf(V.vals.length)) + (V.partial ? ' · ' + tr('partial') : ''), go: 'valuation', cls: verified.length ? '' : 'warn', na: !verified.length }) +
    kpi({ l: tr('k_fd'), v: nf(fd.length), s: tr('s_status'), go: 'register', set: { status: 'st:Fully Depreciated' } }) +
    kpi({ l: tr('k_im'), v: nf(im.length), s: tr('s_status'), go: 'register', set: { status: 'st:In Maintenance' }, cls: im.length ? 'warn' : '' }) +
    kpi({ l: tr('k_nocust'), v: nf(nocust.length), s: tr('s_of', nf(rows.length)), go: 'audit', cls: nocust.length ? 'warn' : 'ok' }) +
    kpi({ l: tr('k_nofin'), v: nf(nofin.length), s: tr('s_nofin'), go: 'audit', cls: nofin.length ? 'warn' : 'ok' }) + '</div>';
  h += banner(recOk ? tr('recon_ok', nf(total), nf(rows.length)) : tr('recon_bad', nf(total), nf(rows.length)), recOk ? 'ok' : 'warn');
  if (!rows.length && !dm.rows.length) h += empty(tr('empty_scope'), tr('empty_scope_s'));

  const cat = grp(rows, r => r.asset_category); const catItems = Object.keys(cat).map(k => ({ label: k, value: cat[k], go: 'register', set: { category: k } }));
  if (dm.rows.length) catItems.push({ label: tr('dm_furn_lbl'), value: dm.rows.length, go: 'furniture', set: {} });
  const loc = grp(rows, r => r.location || '__none__'); const locItems = Object.keys(loc).map(k => ({ label: k === '__none__' ? NONE() : k, value: loc[k], go: 'register', set: { location: k } })).sort((a, b) => b.value - a.value).slice(0, 12);
  const cc = {}; rows.filter(r => r.docstatus === 1).forEach(r => { const k = r.asset_category + ((Object.keys(cost).length > 1) ? ' (' + (curOf(r.company) || '—') + ')' : ''); cc[k] = cc[k] || { v: 0, cat: r.asset_category, company: r.company }; cc[k].v += num(r.total_asset_cost); });
  const costItems = Object.keys(cc).map(k => ({ label: k, value: cc[k].v, disp: nf(cc[k].v, 0), go: 'register', set: { category: cc[k].cat } }));
  const st = grp(rows, r => r.docstatus === 2 ? 'Cancelled' : r.status || '—'); const stItems = Object.keys(st).map(k => ({ label: k, value: st[k], go: 'register', set: { status: k === 'Cancelled' ? 'cancelled' : 'st:' + k } }));
  const mo = {}; let nodate = 0; rows.forEach(r => { if (!r.purchase_date) { nodate++; return; } const k = dstr(r.purchase_date).slice(0, 7); mo[k] = mo[k] || { n: 0, c: 0 }; mo[k].n++; mo[k].c += num(r.total_asset_cost); });
  const trend = Object.keys(mo).sort().map(k => { const last = new Date(+k.slice(0, 4), +k.slice(5, 7), 0).getDate(); return { label: k, value: mo[k].n, disp: nf(mo[k].n) + ' · ' + nf(mo[k].c, 0), go: 'register', set: { from: k + '-01', to: k + '-' + last } }; });
  const ms = {}; M.tasks.forEach(t => { ms[t._state] = (ms[t._state] || 0) + 1; }); const msItems = Object.keys(ms).map(k => ({ label: tr('ts_' + k), value: ms[k], go: 'maintenance', set: {} }));
  const ls = grp(M.logs, l => l.maintenance_status); const lsItems = Object.keys(ls).map(k => ({ label: k, value: ls[k], go: 'maintenance', set: {} }));

  h += '<div class="grid g2">' +
    card(tr('c_cat'), tr('h_records'), donut(catItems)) +
    card(tr('c_loc'), tr('h_records'), bars(locItems)) +
    card(tr('c_costcat'), tr('h_hist'), bars(costItems)) +
    card(tr('ch_status'), tr('h_records'), donut(stItems)) +
    card(tr('c_trend'), tr('h_trend') + (nodate ? ' · ' + tr('n_nodate', nf(nodate)) : ''), lineChart(trend)) +
    '</div>';
  return h;
};

/* ---------- REGISTER (server-side pagination) ---------- */
const REG_SORT = { id: 'name', asset_name: 'asset_name', asset_category: 'asset_category', company: 'company', location: 'location', custodian: 'custodian', purchase_date: 'purchase_date', cost: 'total_asset_cost', status: 'status' };
function nbvCell(v) {
  if (!v) return '<span class="mut">—</span>';
  if (v.disposed) return chip(tr('disposed'), '');
  if (v.verified) return '<span title="' + esc(tr('nbv_rule')) + '">' + esc(money(v.nbv, v.company)) + '</span>';
  return '<span title="' + esc(tr('r_' + v.reason)) + '">' + chip(tr('unverified'), 'warn') + '</span>';
}
DRAW.register = async () => {
  const st = S.T.register || (S.T.register = { page: 1, sort: 'purchase_date', dir: -1, size: 25 });
  const F = aFilters(), OR = aOr();
  const key = 'reg|' + JSON.stringify([F, OR, st.page, st.sort, st.dir, st.size]);
  const { total, rows } = await memo(key, async () => ({ total: await countOf('Asset', { filters: F, or: OR }), rows: await list('Asset', { fields: ASSET_F, filters: F, or: OR, order: (REG_SORT[st.sort] || 'purchase_date') + ' ' + (st.dir > 0 ? 'asc' : 'desc') + ', name asc', start: (st.page - 1) * st.size, limit: st.size }) }));
  const M = await L.mnt(); const ln = lastNext(M);
  const docs = await pool(rows.filter(r => r.docstatus === 1), 5, r => getDoc('Asset', r.name));
  const vm = {}; docs.forEach(d => { if (d && !d.__err) vm[d.name] = valuate(d); });
  const cols = [
    { id: 'id', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(r.name) + '">' + esc(r.name) + '</a>', x: r => r.name },
    { id: 'asset_name', label: tr('c_name') }, { id: 'asset_category', label: tr('c_category') }, { id: 'company', label: tr('c_company') },
    { id: 'location', label: tr('c_location'), h: r => r.location ? esc(r.location) : '<span class="mut">' + esc(NONE()) + '</span>' },
    { id: 'custodian', label: tr('c_custodian'), h: r => r.custodian ? esc(r.custodian) : '<span class="mut">' + esc(NONE()) + '</span>' },
    { id: 'purchase_date', label: tr('c_pdate'), nw: 1, h: r => esc(dstr(r.purchase_date)) },
    { id: 'cost', label: tr('c_cost'), n: 1, nw: 1, h: r => esc(money(r.total_asset_cost, r.company)), x: r => num(r.total_asset_cost) },
    { id: 'nbv', label: tr('c_nbv'), n: 1, nosort: 1, h: r => r.docstatus === 1 ? nbvCell(vm[r.name]) : '<span class="mut">—</span>', x: r => vm[r.name] && vm[r.name].verified ? vm[r.name].nbv : '' },
    { id: 'status', label: tr('c_status'), h: r => stChip(r.docstatus === 2 ? 'Cancelled' : r.status, r.docstatus), x: r => r.status },
    { id: 'lm', label: tr('c_lastm'), nosort: 1, nw: 1, h: r => esc(ln.last[r.name] || '—'), x: r => ln.last[r.name] || '' },
    { id: 'nm', label: tr('c_nextm'), nosort: 1, nw: 1, h: r => esc(ln.next[r.name] || '—'), x: r => ln.next[r.name] || '' },
    { id: 'act', label: tr('c_actions'), nosort: 1, noExport: 1, h: r => actBtns('Asset', r.name) + ' <button class="btn sm" data-act="detail" data-dt="Asset" data-n="' + esc(r.name) + '" data-hist="1">' + ic('clock') + esc(tr('history')) + '</button>' }
  ];
  REG.register = { cols, rows, name: 'asset_register', exportAll: async () => (await fetchAll('Asset', { fields: ASSET_F, filters: F, or: OR, order: 'name asc' })).rows };
  const costs = byCur(rows, r => r.total_asset_cost);
  let h = card(tr('t_register'), tr('h_register'), (rows.length ? tableMarkup('register', cols, rows, { total, page: st.page, size: st.size, pages: Math.max(1, Math.ceil(total / st.size)), sort: st.sort, dir: st.dir }) : empty(tr('empty_filter'), tr('empty_filter_s'))));
  h += '<div class="banner info" style="margin-top:10px">' + esc(tr('reg_foot', nf(total), moneyMap(costs, 2))) + '</div>';
  return h;
};

/* ---------- PLANT ---------- */
DRAW.plant = async () => {
  const [A, M] = await Promise.all([L.assets({ status: 'noncancelled' }), mScope()]);
  const rows = A.rows.filter(r => r.asset_category === SC.plant);
  const act = rows.filter(r => r.docstatus === 1 && DISPOSED.indexOf(r.status) < 0);
  const set = new Set(rows.map(r => r.name)); const logs = M.logs.filter(l => set.has(l.asset_name)), rep = M.repairs.filter(r => set.has(r.asset)), tasks = M.tasks.filter(t => set.has(t._asset));
  const cost = byCur(act, r => r.total_asset_cost);
  let h = banner(tr('note_nostatus'), 'info');
  h += '<div class="kpis">' +
    kpi({ l: tr('p_total'), v: nf(rows.length), s: tr('s_nodisp', nf(rows.length - act.length)), go: 'register', set: { category: SC.plant, status: 'noncancelled' } }) +
    kpi({ l: tr('p_active'), v: nf(act.length), s: tr('s_active_def'), cls: 'ok', go: 'register', set: { category: SC.plant, status: 'active' } }) +
    kpi({ l: tr('k_im'), v: nf(rows.filter(r => r.status === 'In Maintenance').length), go: 'register', set: { category: SC.plant, status: 'st:In Maintenance' } }) +
    kpi({ l: tr('p_ooo'), v: nf(rows.filter(r => r.status === 'Out of Order').length), go: 'register', set: { category: SC.plant, status: 'st:Out of Order' }, cls: 'bad' }) +
    kpi({ l: tr('k_fd'), v: nf(rows.filter(r => r.status === 'Fully Depreciated').length), go: 'register', set: { category: SC.plant, status: 'st:Fully Depreciated' } }) +
    kpi({ l: tr('p_cost'), v: moneyMap(cost, 0), s: tr('s_hist') }) + '</div>';
  if (!rows.length) return h + empty(tr('empty_plant'), tr('empty_filter_s'));
  const loc = grp(rows, r => r.location || '__none__'), st = grp(rows, r => r.docstatus === 1 ? r.status : 'Cancelled');
  h += '<div class="grid g2">' +
    card(tr('c_loc'), tr('h_records'), bars(Object.keys(loc).map(k => ({ label: k === '__none__' ? NONE() : k, value: loc[k], go: 'register', set: { category: SC.plant, location: k, status: 'noncancelled' } })))) +
    card(tr('ch_status'), tr('h_records'), donut(Object.keys(st).map(k => ({ label: k, value: st[k], go: 'register', set: { category: SC.plant, status: 'st:' + k } })))) + '</div>';
  const cols = [
    { id: 'name', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(r.name) + '">' + esc(r.name) + '</a>' },
    { id: 'asset_name', label: tr('c_name') }, { id: 'company', label: tr('c_company') }, { id: 'location', label: tr('c_location') },
    { id: 'custodian', label: tr('c_custodian'), h: r => r.custodian ? esc(r.custodian) : '<span class="mut">' + esc(NONE()) + '</span>' },
    { id: 'status', label: tr('c_status'), h: r => stChip(r.status, r.docstatus) }, { id: 'purchase_date', label: tr('c_pdate'), h: r => esc(dstr(r.purchase_date)) },
    { id: 'cost', label: tr('c_cost'), n: 1, v: r => num(r.total_asset_cost), h: r => esc(money(r.total_asset_cost, r.company)) },
    { id: 'mreq', label: tr('c_mreq'), v: r => r.maintenance_required ? 1 : 0, h: r => r.maintenance_required ? chip(tr('yes'), 'warn') : chip(tr('no'), '') + (M.plans.some(p => p.asset_name === r.name) ? ' ' + chip(tr('has_plan'), 'ok') : ''), x: r => r.maintenance_required ? 'Yes' : 'No' },
    { id: 'a', label: tr('c_actions'), nosort: 1, noExport: 1, h: r => actBtns('Asset', r.name) }
  ];
  h += '<div class="sec">' + esc(tr('t_inventory')) + '</div>' + table('plantInv', cols, rows, { name: 'plant_inventory', sort: 'purchase_date', dir: -1 });
  const cu = grp(rows.filter(r => r.docstatus === 1), r => r.custodian || '__none__');
  h += '<div class="grid g2"><div>' + '<div class="sec">' + esc(tr('t_custodian')) + '</div>' + table('plantCust', [{ id: 'k', label: tr('c_custodian'), h: r => r.k === '__none__' ? '<span class="mut">' + esc(NONE()) + '</span>' : esc(r.k) }, { id: 'n', label: tr('c_count'), n: 1 }], Object.keys(cu).map(k => ({ k, n: cu[k] })), { name: 'plant_custodians' }) + '</div><div>' +
    '<div class="sec">' + esc(tr('t_mreq')) + '</div>' + (M.denied.plans ? nc(tr('no_access'), 'Asset Maintenance') : card(tr('t_mreq'), '', '<div class="kv"><dt>' + esc(tr('mreq_flag')) + '</dt><dd>' + nf(rows.filter(r => r.maintenance_required).length) + '</dd><dt>' + esc(tr('k_plans')) + '</dt><dd>' + nf(M.plans.filter(p => set.has(p.asset_name)).length) + '</dd><dt>' + esc(tr('mreq_noplan')) + '</dt><dd>' + nf(rows.filter(r => r.maintenance_required && !M.plans.some(p => p.asset_name === r.name)).length) + '</dd></div>')) + '</div></div>';
  h += '<div class="sec">' + esc(tr('t_mhist')) + '</div>' + (logs.length ? table('plantLogs', [{ id: 'asset_name', label: tr('c_id') }, { id: 'task_name', label: tr('c_task') }, { id: 'maintenance_type', label: tr('c_mtype') }, { id: 'maintenance_status', label: tr('c_status'), h: r => stChip(r.maintenance_status) }, { id: 'due_date', label: tr('c_due'), h: r => esc(dstr(r.due_date)) }, { id: 'completion_date', label: tr('c_completed'), h: r => esc(dstr(r.completion_date)) }], logs, { name: 'plant_maintenance_history' }) : empty(tr('no_logs')));
  h += '<div class="sec">' + esc(tr('t_repairs')) + '</div>' + repairTable('plantRep', rep);
  h += '<div class="grid g2" style="margin-top:12px">' + card(tr('c_avail'), '', nc(tr('unsupported'), tr('avail_msg', rep.filter(r => r.downtime).length ? rep.filter(r => r.downtime).map(r => r.asset + ': ' + r.downtime).join('; ') : tr('no_downtime')))) + '</div>';
  return h;
};
function repairTable(id, rep) {
  if (!rep.length) return empty(tr('no_repairs'), tr('no_repairs_s'));
  const cols = [
    { id: 'name', label: tr('c_ref'), h: r => link('Asset Repair', r.name) }, { id: 'asset', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(r.asset) + '">' + esc(r.asset) + '</a>', x: r => r.asset },
    { id: 'repair_status', label: tr('c_status'), h: r => stChip(r.repair_status) }, { id: 'failure_date', label: tr('c_failure'), h: r => esc(dstr(r.failure_date)) }, { id: 'completion_date', label: tr('c_completed'), h: r => esc(dstr(r.completion_date)) },
    { id: 'cost', label: tr('c_repcost'), n: 1, v: r => repCost(r), h: r => esc(money(repCost(r), r.company)) + (r.capitalize_repair_cost ? ' ' + chip(tr('capitalized'), 'info') : '') },
    { id: 'downtime', label: tr('c_downtime') }, { id: 'description', label: tr('c_desc'), h: r => esc(String(r.description || '').replace(/<[^>]+>/g, '').slice(0, 90)), x: r => String(r.description || '').replace(/<[^>]+>/g, '') }
  ];
  return table(id, cols, rep, { name: 'asset_repairs', sort: 'failure_date', dir: -1 });
}

/* ---------- FURNITURE ---------- */
DRAW.furniture = async () => {
  const [dm, A] = await Promise.all([L.dm(false), L.assets({ status: 'noncancelled' })]);
  const fx = A.rows.filter(r => r.asset_category === SC.furn);
  let h = banner(tr('note_dm'), 'info');
  if (dm.denied) return h + nc(tr('no_access'), 'DM Assets');
  const R_ = dm.rows, chairs = R_.filter(r => r.category === 'Chair'), tables = R_.filter(r => r.category === 'Table');
  const assigned = R_.filter(r => r.employee), unassigned = R_.length - assigned.length, nodesc = R_.filter(r => !String(r.description || '').trim());
  h += '<div class="kpis">' +
    kpi({ l: tr('f_chairs'), v: nf(chairs.length), s: tr('s_records_only'), cls: 'ok' }) + kpi({ l: tr('f_tables'), v: nf(tables.length), s: tr('s_records_only'), cls: 'ok' }) +
    kpi({ l: tr('f_other'), v: nf(fx.length), s: tr('s_other', SC.furn), go: 'register', set: { category: SC.furn, status: 'noncancelled' } }) +
    kpi({ l: tr('f_assigned'), v: nf(assigned.length), s: tr('s_assigned_note') }) + kpi({ l: tr('f_unassigned'), v: nf(unassigned), cls: unassigned ? 'warn' : '' }) +
    kpi({ l: tr('f_incomplete'), v: nf(nodesc.length), s: tr('s_nodesc'), cls: nodesc.length ? 'warn' : '' }) + '</div>';
  const loc = grp(R_, r => r.location || '__none__'), emp = grp(R_, r => r.employee || '__none__');
  h += '<div class="grid g2">' + card(tr('f_byloc'), tr('h_records'), bars(Object.keys(loc).map(k => ({ label: k === '__none__' ? NONE() : k, value: loc[k], go: 'furniture', set: { location: k } })))) +
    card(tr('f_byemp'), tr('h_records'), bars(Object.keys(emp).map(k => ({ label: k === '__none__' ? NONE() : k, value: emp[k], go: 'furniture', set: { custodian: k } })))) + '</div>';
  const cols = [
    { id: 'asset_id', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="DM Assets" data-n="' + esc(r.name) + '">' + esc(r.asset_id || r.name) + '</a>', x: r => r.asset_id }, { id: 'category', label: tr('c_category') },
    { id: 'description', label: tr('c_desc'), h: r => esc(String(r.description || '').slice(0, 120)) }, { id: 'employee', label: tr('c_employee') }, { id: 'location', label: tr('c_location') },
    { id: 'date', label: tr('c_recdate'), h: r => esc(dstr(r.date)) }, { id: 'cond', label: tr('c_condition'), nosort: 1, h: () => '<span class="mut">' + esc(tr('not_recorded')) + '</span>', x: () => '' },
    { id: 'a', label: tr('c_actions'), nosort: 1, noExport: 1, h: r => actBtns('DM Assets', r.name) }
  ];
  h += '<div class="sec">' + esc(tr('t_furn_reg')) + '</div>' + table('furnReg', cols, R_, { name: 'furniture_register', sort: 'date', dir: -1, emptyTitle: tr('empty_furn'), emptyMsg: tr('empty_filter_s') });
  h += '<div class="sec">' + esc(tr('t_fx')) + '</div>' + (fx.length ? table('fx', [{ id: 'name', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(r.name) + '">' + esc(r.name) + '</a>' }, { id: 'asset_name', label: tr('c_name') }, { id: 'location', label: tr('c_location') }, { id: 'custodian', label: tr('c_custodian') }, { id: 'status', label: tr('c_status'), h: r => stChip(r.status, r.docstatus) }, { id: 'cost', label: tr('c_cost'), n: 1, v: r => num(r.total_asset_cost), h: r => esc(money(r.total_asset_cost, r.company)) }], fx, { name: 'fixtures_assets' }) : empty(tr('empty_fx'), tr('empty_fx_s', SC.furn)));
  return h;
};

/* ---------- VALUATION ---------- */
const AGE = [['<1', 0, 1], ['1-3', 1, 3], ['3-5', 3, 5], ['5-10', 5, 10], ['10+', 10, 1e9]];
DRAW.valuation = async () => {
  const [A, V, allA] = await Promise.all([L.assets(), L.val(), L.assets({ status: 'all' })]);
  const rows = A.rows.filter(r => r.docstatus === 1), cost = byCur(rows, r => r.total_asset_cost);
  const ver = V.vals.filter(v => v.verified), unv = V.vals.filter(v => !v.verified && !v.disposed);
  const acc = byCur(ver, v => v.acc), nbv = byCur(ver, v => v.nbv);
  const fd = A.rows.filter(r => r.status === 'Fully Depreciated');
  const disp = allA.rows.filter(r => DISPOSED.indexOf(r.status) >= 0 || r.docstatus === 2);
  let h = banner(tr('val_rule'), 'info');
  if (V.partial) h += banner(tr('val_partial', nf(V.total)), 'warn');
  h += '<div class="kpis">' +
    kpi({ l: tr('v_cost'), v: moneyMap(cost, 0), s: tr('s_hist') + ' · ' + tr('s_excl_cancel') }) +
    kpi({ l: tr('v_acc'), v: ver.length ? moneyMap(acc, 0) : tr('unavailable'), s: tr('s_verified_only', nf(ver.length)), na: !ver.length }) +
    kpi({ l: tr('k_nbv'), v: ver.length ? moneyMap(nbv, 0) : tr('unavailable'), s: tr('s_nbv', nf(ver.length), nf(V.vals.length)), na: !ver.length, cls: 'ok' }) +
    kpi({ l: tr('v_unver'), v: nf(unv.length), s: tr('s_unver_cost', moneyMap(byCur(unv, v => v.cost), 0)), cls: unv.length ? 'warn' : 'ok', go: 'audit' }) +
    kpi({ l: tr('k_fd'), v: nf(fd.length), s: tr('s_status'), go: 'register', set: { status: 'st:Fully Depreciated' } }) +
    kpi({ l: tr('v_disp'), v: nf(disp.length), s: tr('s_disp'), go: 'audit' }) + '</div>';
  if (!rows.length) return h + empty(tr('empty_scope'), tr('empty_scope_s'));
  const cc = {}; rows.forEach(r => { const k = r.asset_category + (Object.keys(cost).length > 1 ? ' (' + (curOf(r.company) || '—') + ')' : ''); cc[k] = cc[k] || { v: 0, c: r.asset_category }; cc[k].v += num(r.total_asset_cost); });
  const yr = {}; V.vals.forEach(v => (v.sched || []).forEach(s => { const y = String(s.schedule_date || '').slice(0, 4); if (!y) return; yr[y] = yr[y] || { p: 0, s: 0 }; if (s.journal_entry) yr[y].p += num(s.depreciation_amount); else yr[y].s += num(s.depreciation_amount); }));
  const yItems = Object.keys(yr).sort().map(y => ({ label: y, value: yr[y].p + yr[y].s, disp: nf(yr[y].p, 0) + ' ' + tr('posted') + ' / ' + nf(yr[y].s, 0) + ' ' + tr('scheduled') }));
  const ages = AGE.map(a => ({ label: a[0] + ' ' + tr('yrs'), value: 0, color: 'var(--c1)' })); let noAge = 0;
  rows.forEach(r => { const d = r.available_for_use_date || r.purchase_date; if (!d) { noAge++; return; } const y = dayDiff(TODAY, dstr(d)) / 365.25; const i = AGE.findIndex(a => y >= a[1] && y < a[2]); if (i >= 0) ages[i].value++; });
  h += '<div class="grid g2">' + card(tr('v_costcat'), tr('h_hist'), bars(Object.keys(cc).map(k => ({ label: k, value: cc[k].v, disp: nf(cc[k].v, 0), go: 'register', set: { category: cc[k].c } })))) +
    card(tr('v_depyear'), tr('h_depyear'), yItems.length ? bars(yItems) : empty(tr('no_sched'))) +
    card(tr('v_age'), noAge ? tr('n_nodate', nf(noAge)) : tr('h_age'), bars(ages)) + '</div>';
  const reason = v => v.reason ? tr('r_' + v.reason) : '';
  const cols = [
    { id: 'name', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(r.name) + '">' + esc(r.name) + '</a>' },
    { id: 'cost', label: tr('c_cost'), n: 1, h: r => esc(money(r.cost, r.company)), v: r => r.cost },
    { id: 'open', label: tr('v_open'), n: 1, v: r => r.open, h: r => esc(mf2(r.open)) }, { id: 'posted', label: tr('v_posted'), n: 1, v: r => r.posted, h: r => esc(mf2(r.posted)) },
    { id: 'derived', label: tr('v_derived'), n: 1, v: r => r.derived, h: r => r.derived == null ? '—' : esc(mf2(r.derived)) }, { id: 'field', label: tr('v_field'), n: 1, v: r => r.field, h: r => r.field == null ? '—' : esc(mf2(r.field)) },
    { id: 'fb', label: tr('v_fb'), h: r => esc(r.fb || '—') + (r.multiFB ? ' ' + chip(tr('multi_fb'), 'info') : '') },
    { id: 'res', label: tr('v_result'), v: r => r.verified ? 1 : 0, h: r => r.verified ? chip(tr('verified'), 'ok') : chip(tr('unverified'), r.disposed ? '' : 'warn') + ' <span class="mut">' + esc(reason(r)) + '</span>', x: r => r.verified ? 'Verified' : 'Unverified: ' + reason(r) }
  ];
  const docMap = {}; V.docs.forEach(d => docMap[d.name] = d);
  const vrows = V.vals.map(v => Object.assign({}, v, { open: num((docMap[v.name] || {}).opening_accumulated_depreciation) }));
  h += '<div class="sec">' + esc(tr('t_valuation')) + '</div>' + table('valTbl', cols, vrows, { name: 'valuation', emptyTitle: tr('empty') });
  h += '<div class="sec">' + esc(tr('t_disposed')) + '</div>' + (disp.length ? table('dispTbl', [{ id: 'name', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(r.name) + '">' + esc(r.name) + '</a>' }, { id: 'asset_name', label: tr('c_name') }, { id: 'status', label: tr('c_status'), h: r => stChip(r.docstatus === 2 ? 'Cancelled' : r.status, r.docstatus) }, { id: 'disposal_date', label: tr('c_disposal'), h: r => esc(dstr(r.disposal_date)) }, { id: 'cost', label: tr('c_cost'), n: 1, v: r => num(r.total_asset_cost), h: r => esc(money(r.total_asset_cost, r.company)) + ' ' + chip(tr('excluded'), '') }], disp, { name: 'disposed_cancelled' }) : empty(tr('no_disposed')));
  return h;
};

/* ---------- MAINTENANCE ---------- */
function calendarHTML(M) {
  const y = S.cal.y, m = S.cal.m, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), lead = first.getDay();
  const ev = {}; const push = (d, label, cls, ref) => { d = dstr(d); if (!d) return; (ev[d] = ev[d] || []).push({ label, cls, ref }); };
  M.tasks.forEach(t => { if (t._state !== 'cancelled') push(t.next_due_date, t._asset + ' · ' + t.maintenance_task, t._state === 'overdue' ? 'bad' : '', t.parent); });
  M.logs.forEach(l => { if (l.maintenance_status === 'Completed') push(l.completion_date, l.asset_name + ' ✓', 'ok', l.name); });
  M.repairs.forEach(r => push(r.failure_date, r.asset + ' ⚠', 'warn', r.name));
  const names = tr('weekdays').split(','); let g = '<div class="calh"><button class="btn sm" data-act="calnav" data-d="-1">‹</button><span>' + esc(new Date(y, m, 1).toLocaleString(S.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'long', year: 'numeric' })) + '</span><button class="btn sm" data-act="calnav" data-d="1">›</button></div><div class="cal">' + names.map(n => '<div class="dh">' + esc(n) + '</div>').join('');
  for (let i = 0; i < lead; i++) g += '<div class="d o"></div>';
  for (let d = 1; d <= days; d++) { const k = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); g += '<div class="d' + (k === TODAY ? ' today' : '') + '"><b>' + d + '</b>' + (ev[k] || []).slice(0, 3).map(e => '<span class="ev ' + e.cls + '" title="' + esc(e.label) + '">' + esc(e.label) + '</span>').join('') + ((ev[k] || []).length > 3 ? '<span class="mut">+' + ((ev[k] || []).length - 3) + '</span>' : '') + '</div>'; }
  return g + '</div>';
}
DRAW.maintenance = async () => {
  const M = await mScope(); let h = banner(tr('note_mnt'), 'info');
  if (M.denied.plans && M.denied.logs && M.denied.repairs) return h + nc(tr('no_access'), 'Asset Maintenance · Asset Maintenance Log · Asset Repair');
  ['plans', 'logs', 'repairs'].forEach(k => { if (M.denied[k]) h += banner(tr('partial_denied', k), 'warn'); });
  const planned = M.tasks.filter(t => t._state === 'planned'), done = M.logs.filter(l => l.maintenance_status === 'Completed'), pend = M.repairs.filter(r => r.repair_status === 'Pending'), comp = M.repairs.filter(r => r.repair_status === 'Completed');
  const needs = M.assetRows.filter(a => a.maintenance_required), rc = byCur(M.repairs.filter(r => r.repair_status !== 'Cancelled'), r => repCost(r));
  h += '<div class="kpis">' + kpi({ l: tr('k_plans'), v: nf(M.plans.length), s: tr('s_tasks', nf(M.tasks.length)) }) + kpi({ l: tr('m_planned'), v: nf(planned.length), cls: 'ok' }) +
    kpi({ l: tr('k_od'), v: nf(M.overdue.length), s: tr('s_od'), cls: M.overdue.length ? 'bad' : '' }) + kpi({ l: tr('m_done'), v: nf(done.length) }) +
    kpi({ l: tr('m_pend'), v: nf(pend.length), cls: pend.length ? 'warn' : '' }) + kpi({ l: tr('m_comp'), v: nf(comp.length) }) +
    kpi({ l: tr('m_repcost'), v: moneyMap(rc, 0), s: tr('s_repcost') }) + kpi({ l: tr('m_needs'), v: nf(needs.length), s: tr('s_needs'), go: 'audit' }) + '</div>';
  if (!M.plans.length && !M.logs.length && !M.repairs.length) h += empty(tr('no_maint_plans'), tr('no_maint_plans_s'));
  const stc = t => (t._state === 'overdue' ? chip(tr('overdue_c'), 'bad') + ' ' : '') + stChip(t.maintenance_status);
  const cols = [
    { id: 'asset', label: tr('c_id'), v: t => t._asset, h: t => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(t._asset) + '">' + esc(t._asset) + '</a>', x: t => t._asset },
    { id: 'an', label: tr('c_name'), v: t => (M.sc.map[t._asset] || {}).asset_name, h: t => esc((M.sc.map[t._asset] || {}).asset_name) },
    { id: 'maintenance_task', label: tr('c_task') }, { id: 'maintenance_type', label: tr('c_mtype') }, { id: 'periodicity', label: tr('c_freq') },
    { id: 'last_completion_date', label: tr('c_last'), h: t => esc(dstr(t.last_completion_date)) }, { id: 'next_due_date', label: tr('c_next'), h: t => esc(dstr(t.next_due_date)) },
    { id: 'tech', label: tr('c_tech'), v: t => t.assign_to_name || t.assign_to, h: t => esc(t.assign_to_name || t.assign_to || '') || '<span class="mut">' + esc(NONE()) + '</span>', x: t => t.assign_to_name || t.assign_to || '' },
    { id: 'st', label: tr('c_status'), v: t => t._state, h: stc, x: t => t.maintenance_status + (t._state === 'overdue' ? ' (overdue)' : '') },
    { id: 'a', label: tr('c_actions'), nosort: 1, noExport: 1, h: t => link('Asset Maintenance', t.parent, tr('open_erp')) }
  ];
  const prev = M.tasks.filter(t => t.maintenance_type === 'Preventive Maintenance');
  h += '<div class="sec">' + esc(tr('t_schedule')) + '</div><div class="hint mut" style="margin:-4px 2px 6px">' + esc(tr('h_overdue_rule')) + '</div>' + table('mSched', cols, M.tasks, { name: 'maintenance_schedule', sort: 'next_due_date', emptyTitle: tr('no_maint_plans'), emptyMsg: tr('no_maint_plans_s') });
  const soon = M.tasks.filter(t => t._state === 'planned' && t.next_due_date && dayDiff(dstr(t.next_due_date), TODAY) <= 30);
  h += '<div class="grid g2" style="margin-top:12px">' + card(tr('t_calendar'), tr('h_calendar'), calendarHTML(M)) +
    card(tr('t_alerts'), tr('h_alerts'), (M.overdue.length || soon.length) ? '<div class="bars">' + M.overdue.map(o => '<div class="bar" style="grid-template-columns:1fr auto"><span>' + chip(tr('overdue_c'), 'bad') + ' ' + esc(o.asset + ' · ' + o.task) + '</span><span class="bv">' + esc(o.due) + '</span></div>').join('') + soon.map(t => '<div class="bar" style="grid-template-columns:1fr auto"><span>' + chip(tr('due_soon'), 'warn') + ' ' + esc(t._asset + ' · ' + t.maintenance_task) + '</span><span class="bv">' + esc(dstr(t.next_due_date)) + '</span></div>').join('') + '</div>' : empty(tr('no_alerts'))) + '</div>';
  const cat = grp(M.plans, p => (M.sc.map[p.asset_name] || {}).asset_category || p.asset_category || '—');
  const rbyA = {}; M.repairs.filter(r => r.repair_status !== 'Cancelled').forEach(r => { rbyA[r.asset] = (rbyA[r.asset] || 0) + repCost(r); });
  const tech = grp(M.tasks.filter(t => t._state !== 'cancelled'), t => t.assign_to_name || t.assign_to || '__none__');
  h += '<div class="grid g3">' + card(tr('m_bycat'), tr('h_plans'), bars(Object.keys(cat).map(k => ({ label: k, value: cat[k] })))) +
    card(tr('m_costasset'), tr('h_costasset'), bars(Object.keys(rbyA).map(k => ({ label: k, value: rbyA[k], disp: nf(rbyA[k], 2) })))) +
    card(tr('m_tech'), tr('h_tech'), bars(Object.keys(tech).map(k => ({ label: k === '__none__' ? NONE() : k, value: tech[k] })))) + '</div>';
  h += '<div class="sec">' + esc(tr('t_prev')) + '</div>' + (prev.length ? '<div class="banner ok">' + esc(tr('prev_count', nf(prev.length))) + '</div>' : empty(tr('no_prev')));
  h += '<div class="sec">' + esc(tr('t_comp_hist')) + '</div>' + (done.length ? table('mDone', [{ id: 'asset_name', label: tr('c_id') }, { id: 'task_name', label: tr('c_task') }, { id: 'maintenance_type', label: tr('c_mtype') }, { id: 'due_date', label: tr('c_due'), h: r => esc(dstr(r.due_date)) }, { id: 'completion_date', label: tr('c_completed'), h: r => esc(dstr(r.completion_date)) }, { id: 'assign_to_name', label: tr('c_tech') }, { id: 'actions_performed', label: tr('c_actions_done'), h: r => esc(String(r.actions_performed || '').replace(/<[^>]+>/g, '').slice(0, 100)), x: r => String(r.actions_performed || '').replace(/<[^>]+>/g, '') }, { id: 'cert', label: tr('c_cert'), nosort: 1, noExport: 1, h: r => r.certificate_attachement ? '<a class="lk" target="_blank" rel="noopener" href="' + esc(r.certificate_attachement) + '">' + esc(tr('view_cert')) + '</a>' : '<span class="mut">' + esc(tr('no_cert')) + '</span>' }], done, { name: 'maintenance_completed' }) : empty(tr('no_logs')));
  h += '<div class="sec">' + esc(tr('t_corrective')) + '</div>' + repairTable('mRep', M.repairs);
  const sp = M.consumed;
  h += '<div class="sec">' + esc(tr('t_spares')) + '</div>' + (sp.length ? table('mSpares', [{ id: 'parent', label: tr('c_ref'), h: r => link('Asset Repair', r.parent) }, { id: 'item_code', label: tr('c_item') }, { id: 'consumed_quantity', label: tr('c_qty'), n: 1 }, { id: 'total_value', label: tr('c_value'), n: 1, v: r => num(r.total_value), h: r => esc(nf(r.total_value, 2)) }], sp, { name: 'spare_parts' }) : empty(tr('no_spares'), tr('no_spares_s')));
  if (M.M.repairsTotalAll != null && M.M.repairsTotalAll > M.M.repairs.length) h += banner(tr('repairs_other', nf(M.M.repairsTotalAll - M.M.repairs.length)), 'info');
  return h;
};

/* ---------- INSPECTION ---------- */
DRAW.inspection = async () => {
  const M = await mScope(); const cal = M.tasks.filter(t => t.maintenance_type === 'Calibration' && t._state !== 'cancelled'), calLogs = M.logs.filter(l => l.maintenance_type === 'Calibration');
  const calDone = calLogs.filter(l => l.maintenance_status === 'Completed'), calOd = cal.filter(t => t._state === 'overdue');
  let h = banner(tr('insp_audit'), 'warn');
  h += '<div class="kpis">' + ['i_sched', 'i_done', 'i_pass', 'i_fail', 'i_over', 'i_corr'].map(k => kpi({ l: tr(k), v: tr('not_configured'), na: true, s: tr('insp_no_src') })).join('') + '</div>';
  h += '<div class="sec">' + esc(tr('insp_real')) + '</div><div class="kpis">' + kpi({ l: tr('cal_sched'), v: nf(cal.length), s: tr('s_cal_src') }) + kpi({ l: tr('cal_done'), v: nf(calDone.length), s: tr('s_cal_src') }) + kpi({ l: tr('cal_over'), v: nf(calOd.length), cls: calOd.length ? 'bad' : '' }) + '</div>';
  const cats = [['insp_plant', 0], ['insp_elec', 0], ['insp_mech', 0], ['insp_safety', 0], ['insp_furn', 0], ['insp_cal', 1]];
  h += '<div class="grid g3">' + cats.map(c => card(tr(c[0]), '', c[1] ? chip(tr('partial_src'), 'info') + '<div class="hint" style="margin-top:6px">' + esc(tr('cal_hint')) + '</div>' : chip(tr('not_configured'), '') + '<div class="hint" style="margin-top:6px">' + esc(tr('insp_no_src')) + '</div>')).join('') + '</div>';
  h += '<div class="grid g2">' + card(tr('insp_check'), tr('insp_check_h'), '<ul style="margin:0;padding-inline-start:18px;color:var(--mut)">' + ['ck1', 'ck2', 'ck3', 'ck4', 'ck5', 'ck6', 'ck7', 'ck8', 'ck9', 'ck10'].map(k => '<li>' + esc(tr(k)) + ' — <i>' + esc(tr('not_configured')) + '</i></li>').join('') + '</ul>', '<button class="btn pri" disabled title="' + esc(tr('not_configured')) + '">' + esc(tr('create_insp')) + '</button>') +
    card(tr('insp_sources'), tr('insp_sources_h'), '<div class="kv"><dt>Asset Maintenance Task / Log</dt><dd>' + chip(tr('partial_src'), 'info') + ' ' + esc(tr('src_cal')) + '</dd><dt>Vehicle Inspection</dt><dd>' + chip(tr('not_applicable'), '') + ' ' + esc(tr('src_vehicle')) + '</dd><dt>Quality Inspection</dt><dd>' + chip(tr('not_applicable'), '') + ' ' + esc(tr('src_qi')) + '</dd><dt>Asset Inspection</dt><dd>' + chip(tr('missing'), 'bad') + ' ' + esc(tr('src_none')) + '</dd></div>') + '</div>';
  const cols = [
    { id: 'a', label: tr('c_id'), v: t => t._asset, h: t => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(t._asset) + '">' + esc(t._asset) + '</a>', x: t => t._asset }, { id: 'an', label: tr('c_name'), v: t => (M.sc.map[t._asset] || {}).asset_name, h: t => esc((M.sc.map[t._asset] || {}).asset_name) },
    { id: 'type', label: tr('c_itype'), v: () => 'Calibration', h: () => esc('Calibration') }, { id: 'last_completion_date', label: tr('c_idate'), h: t => esc(dstr(t.last_completion_date)) }, { id: 'next_due_date', label: tr('c_next'), h: t => esc(dstr(t.next_due_date)) },
    { id: 'insp', label: tr('c_inspector'), v: t => t.assign_to_name || t.assign_to, h: t => esc(t.assign_to_name || t.assign_to || '') }, { id: 'res', label: tr('c_result'), nosort: 1, h: () => '<span class="mut">' + esc(tr('not_recorded')) + '</span>', x: () => '' },
    { id: 'rem', label: tr('c_remarks'), h: t => esc(String(t.description || '').replace(/<[^>]+>/g, '').slice(0, 80)), x: t => String(t.description || '').replace(/<[^>]+>/g, '') },
    { id: 'cert', label: tr('c_cert'), nosort: 1, h: t => t.certificate_required ? chip(tr('cert_required'), 'info') : '<span class="mut">—</span>', x: t => t.certificate_required ? 'Required' : '' },
    { id: 'act', label: tr('c_actions'), nosort: 1, noExport: 1, h: t => link('Asset Maintenance', t.parent, tr('open_erp')) }
  ];
  h += '<div class="sec">' + esc(tr('t_insp')) + '</div>' + table('inspTbl', cols, cal, { name: 'calibration_inspections', emptyTitle: tr('no_insp_rows'), emptyMsg: tr('no_insp_rows_s') });
  return h;
};

/* ---------- EMPLOYEE ASSIGNMENTS ---------- */
L.dmRaw = () => memo('dmRaw', async () => canRead('DM Assets') ? (await fetchAll('DM Assets', { fields: ['name', 'asset_id', 'category', 'description', 'employee', 'location', 'docstatus'], filters: [['docstatus', '<', 2]] })).rows : []);
const segHTML = (key, a, b, la, lb) => '<span class="seg"><button class="' + (!S.opt[key] ? 'on' : '') + '" data-act="opt" data-k="' + key + '" data-v="0">' + esc(la) + '</button><button class="' + (S.opt[key] ? 'on' : '') + '" data-act="opt" data-k="' + key + '" data-v="1">' + esc(lb) + '</button></span>';
DRAW.assign = async () => {
  const [A, mv, dm, acq, raw] = await Promise.all([L.assets(), L.mv(), L.dm(S.opt.dmAll), L.acq(), L.dmRaw()]);
  let h = banner(tr('note_assign'), 'info');
  const cust = A.rows.filter(r => r.custodian && r.docstatus === 1);
  const lastMv = {}; (mv.rows || []).forEach(m => { if (m._p.docstatus === 1 && m.asset && m.to_employee) { const k = m.asset + '|' + m.to_employee, d = dstr(m._p.transaction_date); if (!lastMv[k] || d > lastMv[k]) lastMv[k] = d; } });
  const q = (S.f.q || '').toLowerCase(), f = S.f;
  let ar = (acq.rows || []).filter(r => r._p.docstatus < 2);
  if (!S.opt.acqAll) ar = ar.filter(r => ['chair', 'table'].indexOf(String(r.item_name || '').toLowerCase()) >= 0);
  if (f.custodian) ar = ar.filter(r => f.custodian === '__none__' ? !(r.life_cercle_end || r._p.employee) : (r.life_cercle_end === f.custodian || r._p.employee === f.custodian));
  if (f.from) ar = ar.filter(r => dstr(r._p.date) >= f.from); if (f.to) ar = ar.filter(r => dstr(r._p.date) <= f.to);
  if (f.location) ar = ar.filter(r => (r.ids || r._p.custom_job_location || '') === f.location);
  if (q) ar = ar.filter(r => [r.item_name, r.dmasset_no, r._p.name, r._p.employee, r.life_cercle_end].join(' ').toLowerCase().indexOf(q) >= 0);
  const dmIds = new Set(raw.map(r => r.asset_id)), linked = (acq.rows || []).filter(r => r.dmasset_no && dmIds.has(r.dmasset_no)).length, withNo = (acq.rows || []).filter(r => r.dmasset_no).length;
  const emps = uniq([].concat(cust.map(r => r.custodian), (dm.rows || []).map(r => r.employee), ar.map(r => r.life_cercle_end || r._p.employee)));
  h += '<div class="kpis">' + kpi({ l: tr('as_asset'), v: nf(cust.length), s: 'Asset' }) + kpi({ l: tr('as_dm'), v: nf((dm.rows || []).length), s: 'DM Assets' }) + kpi({ l: tr('as_acq'), v: nf(ar.length), s: 'Asset Acquisition Records' }) + kpi({ l: tr('as_emps'), v: nf(emps.length), s: tr('s_distinct') }) + '</div>';
  h += banner(tr('link_check', nf(linked), nf(withNo)), linked ? 'warn' : 'info');
  const empH = e => e ? esc(e) : '<span class="mut">' + esc(NONE()) + '</span>';
  h += '<div class="sec">' + esc(tr('as_t1')) + '</div>' + table('asA', [
    { id: 'custodian', label: tr('c_employee'), h: r => empH(r.custodian) }, { id: 'name', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(r.name) + '">' + esc(r.name) + '</a>' }, { id: 'asset_category', label: tr('c_category') },
    { id: 'cl', label: tr('c_comploc'), v: r => r.company + ' / ' + r.location, h: r => esc(r.company) + ' / ' + esc(r.location || '—') },
    { id: 'ad', label: tr('c_assigned'), v: r => lastMv[r.name + '|' + r.custodian] || '', h: r => lastMv[r.name + '|' + r.custodian] ? esc(lastMv[r.name + '|' + r.custodian]) + ' <span class="mut">(' + esc(tr('via_mv')) + ')</span>' : '<span class="mut">' + esc(tr('not_recorded')) + '</span>', x: r => lastMv[r.name + '|' + r.custodian] || '' },
    { id: 'ret', label: tr('c_return'), nosort: 1, h: () => '<span class="mut">' + esc(tr('not_recorded')) + '</span>', x: () => '' }
  ], cust, { name: 'asset_custodians', emptyTitle: tr('empty_cust') });
  h += '<div class="sec">' + esc(tr('as_t2')) + ' ' + segHTML('dmAll', 0, 1, tr('furn_only'), tr('all_cats')) + '</div>' + table('asD', [
    { id: 'employee', label: tr('c_employee') }, { id: 'asset_id', label: tr('c_id'), h: r => '<a class="lk" href="#" data-act="detail" data-dt="DM Assets" data-n="' + esc(r.name) + '">' + esc(r.asset_id || r.name) + '</a>', x: r => r.asset_id }, { id: 'category', label: tr('c_category') }, { id: 'location', label: tr('c_location') },
    { id: 'date', label: tr('c_assigned'), h: r => esc(dstr(r.date)) }, { id: 'ret', label: tr('c_return'), nosort: 1, h: () => '<span class="mut">' + esc(tr('not_recorded')) + '</span>', x: () => '' }
  ], dm.rows || [], { name: 'dm_assets_assignments', emptyTitle: tr('empty_dm') });
  h += '<div class="sec">' + esc(tr('as_t3')) + ' ' + segHTML('acqAll', 0, 1, tr('furn_only'), tr('all_items')) + '</div>' + table('asR', [
    { id: 'emp', label: tr('c_employee'), v: r => r.life_cercle_end || r._p.employee, h: r => empH(r.life_cercle_end || r._p.employee) }, { id: 'item_name', label: tr('c_item') }, { id: 'dmasset_no', label: tr('c_dmno') },
    { id: 'rec', label: tr('c_ref'), v: r => r.parent, h: r => link('Asset Acquisition Records', r.parent), x: r => r.parent }, { id: 'loc', label: tr('c_location'), v: r => r.ids || r._p.custom_job_location, h: r => esc(r.ids || r._p.custom_job_location || '') },
    { id: 'd', label: tr('c_assigned'), v: r => r._p.date, h: r => esc(dstr(r._p.date)) }, { id: 'ws', label: tr('c_wstate'), v: r => r._p.workflow_state, h: r => chip(r._p.workflow_state || '—', r._p.workflow_state === 'Assigned' ? 'ok' : '') },
    { id: 'ret', label: tr('c_return'), v: r => r._p.satus, h: r => r._p.satus === 'Return' ? chip(tr('returned'), 'warn') : r._p.satus === 'Issue New' ? chip(tr('issued'), 'ok') : '<span class="mut">' + esc(tr('not_recorded')) + '</span>', x: r => r._p.satus || '' }
  ], ar, { name: 'acquisition_assignments', sort: 'd', dir: -1, emptyTitle: tr('empty_acq') });
  return h;
};

/* ---------- MOVEMENT ---------- */
DRAW.movement = async () => {
  const [mv, sc] = await Promise.all([L.mv(), L.scope()]); if (mv.denied) return nc(tr('no_access'), 'Asset Movement');
  const f = S.f, q = (f.q || '').toLowerCase();
  let rows = mv.rows.map(m => Object.assign({}, m, { _cat: (sc.map[m.asset] || {}).asset_category || '' }));
  const total = rows.length; if (!S.opt.mvAll) rows = rows.filter(m => m._cat);
  if (f.company) rows = rows.filter(m => (m.company || m._p.company) === f.company);
  if (f.category) rows = rows.filter(m => m._cat === f.category);
  if (f.location) rows = rows.filter(m => f.location === '__none__' ? !(m.source_location || m.target_location) : (m.source_location === f.location || m.target_location === f.location));
  if (f.from) rows = rows.filter(m => dstr(m._p.transaction_date) >= f.from); if (f.to) rows = rows.filter(m => dstr(m._p.transaction_date) <= f.to);
  if (q) rows = rows.filter(m => [m.asset, m.asset_name, m.parent, m._p.reference_name].join(' ').toLowerCase().indexOf(q) >= 0);
  const can = rows.filter(m => m._p.docstatus === 2).length, inS = rows.filter(m => m._cat).length;
  let h = banner(tr('note_move'), 'info') + '<div class="kpis">' + kpi({ l: tr('mv_lines'), v: nf(rows.length), s: tr('s_of_all', nf(total)) }) + kpi({ l: tr('mv_docs'), v: nf(uniq(rows.map(m => m.parent)).length) }) + kpi({ l: tr('mv_in'), v: nf(inS) }) + kpi({ l: tr('mv_out'), v: nf(rows.length - inS) }) + kpi({ l: tr('mv_can'), v: nf(can), cls: can ? 'warn' : '' }) + '</div>';
  h += '<div style="margin:0 0 8px">' + segHTML('mvAll', 0, 1, tr('scope_only'), tr('all_cats')) + '</div>';
  const cols = [
    { id: 'd', label: tr('c_mdate'), v: m => m._p.transaction_date, h: m => esc(dstr(m._p.transaction_date)) }, { id: 'asset', label: tr('c_id'), h: m => m._cat ? '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(m.asset) + '">' + esc(m.asset) + '</a>' : link('Asset', m.asset), x: m => m.asset },
    { id: 'asset_name', label: tr('c_name') }, { id: 'cat', label: tr('c_category'), v: m => m._cat, h: m => m._cat ? esc(m._cat) : '<span class="mut">' + esc(tr('outside_scope')) + '</span>', x: m => m._cat },
    { id: 'purpose', label: tr('c_mtype2'), v: m => m._p.purpose, h: m => chip(m._p.purpose || '—', 'pri') }, { id: 'source_location', label: tr('c_src') }, { id: 'target_location', label: tr('c_dst') },
    { id: 'from_employee', label: tr('c_from') }, { id: 'to_employee', label: tr('c_to') },
    { id: 'doc', label: tr('c_doc'), v: m => m.parent, h: m => link('Asset Movement', m.parent), x: m => m.parent }, { id: 'ref', label: tr('c_refdoc'), v: m => m._p.reference_name, h: m => m._p.reference_doctype && m._p.reference_name ? link(m._p.reference_doctype, m._p.reference_name, m._p.reference_doctype + ' · ' + m._p.reference_name) : '', x: m => m._p.reference_name || '' },
    { id: 'st', label: tr('c_status'), v: m => m._p.docstatus, h: m => m._p.docstatus === 1 ? chip(tr('submitted'), 'ok') : m._p.docstatus === 2 ? chip('Cancelled', 'bad') : chip('Draft', 'warn'), x: m => ['Draft', 'Submitted', 'Cancelled'][m._p.docstatus] }
  ];
  return h + table('mvTbl', cols, rows, { name: 'asset_movements', sort: 'd', dir: -1, emptyTitle: tr('empty_mv'), emptyMsg: S.opt.mvAll ? tr('empty_filter_s') : tr('empty_mv_s') });
};

/* ---------- EXCEPTIONS & AUDIT ---------- */
DRAW.audit = async () => {
  const [A, M, V, dmRaw, dmF, sc] = await Promise.all([L.assets({ status: 'all', noDate: true }), L.mnt(), L.val(), L.dmRaw(), L.dm(false), L.scope()]);
  const X = []; const add = (sev, ref, issue, source, fix, dt, name) => X.push({ sev, ref, issue, source, fix, dt, name });
  const live = A.rows.filter(a => a.docstatus < 2), dup = {};
  live.forEach(a => { const k = [a.asset_name, a.company, dstr(a.purchase_date), num(a.total_asset_cost)].join('|'); (dup[k] = dup[k] || []).push(a); });
  const planAssets = new Set(M.plans.map(p => p.asset_name));
  A.rows.forEach(a => {
    if (a.docstatus === 2) { add('info', a.name, tr('x_cancelled'), 'Asset', tr('f_cancelled'), 'Asset', a.name); return; }
    if (a.docstatus === 0) add('medium', a.name, tr('x_draft'), 'Asset', tr('f_draft'), 'Asset', a.name);
    if (!a.location) add('high', a.name, tr('x_noloc'), 'Asset', tr('f_noloc'), 'Asset', a.name);
    if (!a.custodian) add('medium', a.name, tr('x_nocust'), 'Asset', tr('f_nocust'), 'Asset', a.name);
    if (!a.purchase_date) add('medium', a.name, tr('x_nodate'), 'Asset', tr('f_nodate'), 'Asset', a.name);
    if (!(num(a.total_asset_cost) > 0)) add('high', a.name, tr('x_nocost'), 'Asset', tr('f_nocost'), 'Asset', a.name);
    if (a.status === 'Fully Depreciated' && !a.is_fully_depreciated) add('low', a.name, tr('x_fdflag'), 'Asset', tr('f_fdflag'), 'Asset', a.name);
    if (a.maintenance_required && !planAssets.has(a.name) && !M.denied.plans) add('medium', a.name, tr('x_nomplan'), 'Asset / Asset Maintenance', tr('f_nomplan'), 'Asset', a.name);
    if (DISPOSED.indexOf(a.status) >= 0) add('info', a.name, tr('x_disposed', a.status), 'Asset', tr('f_disposed'), 'Asset', a.name);
  });
  Object.keys(dup).forEach(k => { if (dup[k].length > 1) dup[k].forEach(a => add('high', a.name, tr('x_dup', dup[k].map(x => x.name).filter(n => n !== a.name).join(', ')), 'Asset', tr('f_dup'), 'Asset', a.name)); });
  V.vals.forEach(v => { if (!v.verified && !v.disposed && v.reason) add(v.reason === 'mismatch' || v.reason === 'zero_unproven' ? 'high' : 'medium', v.name, tr('x_unver') + ': ' + tr('r_' + v.reason), 'Asset (finance books / schedules)', tr('f_unver'), 'Asset', v.name); });
  const set = new Set(live.map(a => a.name));
  const mset = new Set(A.rows.map(a => a.name));
  const oset = new Map(); M.logs.forEach(l => { if (mset.has(l.asset_name) && ['Planned', 'Overdue'].indexOf(l.maintenance_status) >= 0 && l.due_date && dstr(l.due_date) < TODAY && l.docstatus !== 2) oset.set(l.task || l.name, [l.asset_name, l.task_name, dstr(l.due_date), 'Asset Maintenance Log', l.name]); });
  const pm = {}; M.plans.forEach(p => pm[p.name] = p);
  M.tasks.forEach(t => { const p = pm[t.parent]; if (p && mset.has(p.asset_name) && taskState(t) === 'overdue' && !oset.has(t.name)) oset.set(t.name, [p.asset_name, t.maintenance_task, dstr(t.next_due_date), 'Asset Maintenance', t.parent]); });
  oset.forEach(o => add('high', o[0], tr('x_overdue', o[1], o[2]), o[3], tr('f_overdue'), o[3], o[4]));
  const tmap = {}; M.tasks.forEach(t => tmap[t.name] = t);
  M.logs.forEach(l => { if (mset.has(l.asset_name) && l.maintenance_status === 'Completed' && tmap[l.task] && tmap[l.task].certificate_required && !l.certificate_attachement) add('medium', l.asset_name, tr('x_nocert', l.task_name), 'Asset Maintenance Log', tr('f_nocert'), 'Asset Maintenance Log', l.name); });
  const idCount = {}; dmRaw.forEach(r => { if (r.asset_id) idCount[r.asset_id] = (idCount[r.asset_id] || 0) + 1; });
  dmRaw.filter(r => DM_FURN.indexOf(r.category) >= 0).forEach(r => {
    if (!r.asset_id) add('high', r.name, tr('x_noid'), 'DM Assets', tr('f_noid'), 'DM Assets', r.name);
    if (r.asset_id && idCount[r.asset_id] > 1) add('high', r.asset_id, tr('x_dmdup'), 'DM Assets', tr('f_dup'), 'DM Assets', r.name);
    if (!String(r.description || '').trim()) add('low', r.asset_id || r.name, tr('x_furn_inc', tr('c_desc')), 'DM Assets', tr('f_furn_inc'), 'DM Assets', r.name);
    if (!r.employee) add('medium', r.asset_id || r.name, tr('x_furn_inc', tr('c_employee')), 'DM Assets', tr('f_furn_inc'), 'DM Assets', r.name);
    if (!r.location) add('medium', r.asset_id || r.name, tr('x_furn_inc', tr('c_location')), 'DM Assets', tr('f_furn_inc'), 'DM Assets', r.name);
  });
  const rank = { high: 0, medium: 1, low: 2, info: 3 }; X.sort((a, b) => rank[a.sev] - rank[b.sev] || String(a.ref).localeCompare(String(b.ref)));
  const sevSel = S.sev || ''; const shown = sevSel ? X.filter(x => x.sev === sevSel) : X; const cnt = k => X.filter(x => x.sev === k).length;
  const srcs = [['Asset', sc.rows.length], ['DM Assets', dmRaw.length], ['Asset Maintenance', M.plans.length], ['Asset Maintenance Log', M.logs.length], ['Asset Repair', M.repairs.length], ['Asset Movement', (await L.mv()).parents ? (await L.mv()).parents.length : 0], ['Asset Acquisition Records', (await L.acq()).parents ? (await L.acq()).parents.length : 0]];
  let h = banner(tr('note_audit'), 'info') + '<div class="kpis">' + kpi({ l: tr('x_total'), v: nf(X.length) }) + ['high', 'medium', 'low', 'info'].map(k => kpi({ l: tr('sev_' + k), v: nf(cnt(k)), cls: k === 'high' && cnt(k) ? 'bad' : k === 'medium' && cnt(k) ? 'warn' : '' })).join('') + '</div>';
  h += '<div style="margin:0 0 8px"><span class="seg">' + [['', tr('all')], ['high', tr('sev_high')], ['medium', tr('sev_medium')], ['low', tr('sev_low')], ['info', tr('sev_info')]].map(s => '<button class="' + (sevSel === s[0] ? 'on' : '') + '" data-act="sev" data-v="' + s[0] + '">' + esc(s[1]) + '</button>').join('') + '</span></div>';
  h += table('exc', [
    { id: 'sev', label: tr('c_severity'), v: x => rank[x.sev], h: x => sevChip(x.sev), x: x => x.sev }, { id: 'ref', label: tr('c_asset'), h: x => x.dt === 'Asset' ? '<a class="lk" href="#" data-act="detail" data-dt="Asset" data-n="' + esc(x.name) + '">' + esc(x.ref) + '</a>' : esc(x.ref), x: x => x.ref },
    { id: 'issue', label: tr('c_issue') }, { id: 'source', label: tr('c_source') }, { id: 'fix', label: tr('c_fix') }, { id: 'view', label: tr('c_view'), nosort: 1, noExport: 1, h: x => link(x.dt, x.name, tr('open_erp')) }
  ], shown, { name: 'exceptions', emptyTitle: tr('no_exceptions'), emptyMsg: tr('no_exceptions_s'), size: 25 });
  h += '<div class="sec">' + esc(tr('t_sources')) + '</div><div class="tw"><table class="t"><thead><tr><th>' + esc(tr('c_source')) + '</th><th>' + esc(tr('c_access')) + '</th><th class="n">' + esc(tr('c_count')) + '</th></tr></thead><tbody>' + srcs.map(s => '<tr><td>' + esc(s[0]) + '</td><td>' + (canRead(s[0]) ? chip(tr('readable'), 'ok') : chip(tr('no_access'), 'bad')) + '</td><td class="n">' + nf(s[1]) + '</td></tr>').join('') + '<tr><td>Asset Category</td><td>' + chip(S.meta.catNames.indexOf(SC.plant) >= 0 ? SC.plant : SC.plant + ' ✗', S.meta.catNames.indexOf(SC.plant) >= 0 ? 'ok' : 'bad') + ' ' + chip(S.meta.catNames.indexOf(SC.furn) >= 0 ? SC.furn : SC.furn + ' ✗', S.meta.catNames.indexOf(SC.furn) >= 0 ? 'ok' : 'bad') + '</td><td class="n">—</td></tr></tbody></table></div>';
  return h;
};

/* ---------- translations (labels only; ERP values are never translated) ---------- */
I.en = {
title: 'Plant & Furniture Asset Dashboard', subtitle: 'DM Group KSA · live ERP data (read-only)', asof: 'as of', refresh: 'Refresh', loading: 'Loading from ERP…', retry: 'Retry', close: 'Close',
tab_overview: 'Overview', tab_register: 'Asset Register', tab_plant: 'Plant & Machinery', tab_furniture: 'Furniture & Fixtures', tab_valuation: 'Valuation & Depreciation', tab_maintenance: 'Maintenance', tab_inspection: 'Inspection', tab_assign: 'Employee Assignments', tab_movement: 'Transfers & Movement', tab_audit: 'Exceptions & Audit',
all: 'All', f_company: 'Company', f_category: 'Asset category', f_location: 'Location / branch', f_dept: 'Department', f_custodian: 'Custodian / employee', f_status: 'Asset status', f_from: 'Date from', f_to: 'Date to', f_search: 'Search', f_search_ph: 'Asset name or ID', reset: 'Reset filters',
st_active: 'Active (submitted, not disposed)', st_noncancelled: 'All except cancelled', st_all: 'All incl. cancelled', st_cancelled: 'Cancelled only', st_draft: 'Draft only', none_set: '(not set)',
records: 'records', empty: 'No data', drill_hint: 'Click to drill down', showing: 'Showing {0}–{1} of {2}', export_csv: 'CSV', view: 'View', open_erp: 'Open in ERP', history: 'History', yes: 'Yes', no: 'No',
no_access: 'No access', unavailable: 'Unavailable', unsupported: 'Not supported', not_configured: 'Not configured', not_recorded: 'Not recorded', not_applicable: 'Not applicable', missing: 'Missing', readable: 'Readable', partial: 'partial', partial_src: 'Partial data', none_found: 'None found', err_load: 'Could not load data:', err_generic: 'Request failed', cat_missing: 'Asset Category not found in ERP: {0}',
measures_note: 'Measures are kept separate: record counts, quantities (Asset Quantity), historical cost (Total Asset Cost) and verified book value. Cancelled records are excluded from active totals.',
k_plant: 'Plant & machinery assets', k_furn: 'Furniture assets', k_cost: 'Recorded asset cost', k_nbv: 'Verified net book value', k_fd: 'Fully depreciated assets', k_im: 'Assets under maintenance', k_od: 'Overdue maintenance tasks', k_insp: 'Scheduled inspections', k_nocust: 'Assets missing custodians', k_nofin: 'Missing financial / location info', k_plans: 'Maintenance plans',
s_qty: 'Quantity {0} · records {1}', s_furn: '{0} Asset records · {1} DM Assets records (not merged)', s_hist: 'historical cost', s_nbv: '{0} of {1} assets verified', s_status: 'by ERP status', s_od: 'due date before today, not completed', s_noplans: 'no maintenance plans exist', s_calib: 'calibration plans: {0}', s_of: 'of {0} records', s_nofin: 'no location or cost ≤ 0', s_of_all: 'of {0} total', s_distinct: 'distinct employees', s_excl_cancel: 'excl. cancelled', s_verified_only: '{0} verified assets only', s_unver_cost: 'cost {0}', s_disp: 'sold / scrapped / cancelled', s_tasks: '{0} tasks', s_repcost: 'repair cost (not added to asset cost)', s_needs: 'maintenance_required flag', s_nodisp: '{0} disposed', s_active_def: 'submitted, not sold/scrapped', s_records_only: 'records (no quantity field)', s_other: 'Asset category {0}', s_assigned_note: 'employee is mandatory in DM Assets', s_nodesc: 'missing description', s_cal_src: 'Asset Maintenance (Calibration)',
recon_ok: 'Reconciled: ERP count {0} = records used for KPIs and charts {1}.', recon_bad: 'ERP count {0}; records loaded {1} (list capped or changed). Narrow the filters.',
empty_scope: 'No plant or furniture assets match the current filters', empty_scope_s: 'Try resetting the filters or choosing another status.', empty_filter: 'No records match the filters', empty_filter_s: 'Adjust or reset the filters.', dm_furn_lbl: 'Furniture (DM Assets register)',
c_cat: 'Asset distribution by category', c_loc: 'Asset distribution by location', c_costcat: 'Acquisition cost by asset category', ch_status: 'Asset status distribution', c_trend: 'Asset acquisition trend (monthly)', c_mstatus: 'Maintenance status', c_istatus: 'Inspection status',
h_records: 'record counts — click to drill down', h_hist: 'historical cost, active records', h_trend: 'by purchase date; label shows records · cost', h_mstatus: 'plan tasks (left) · maintenance logs (right)', h_register: 'Server-side pagination; click an ID for details', h_depyear: 'from depreciation schedules: posted vs scheduled', h_age: 'by available-for-use / purchase date', h_calendar: 'due dates, completions, failures', h_alerts: 'overdue and due within 30 days', h_plans: 'maintenance plans', h_costasset: 'repair cost, excl. cancelled', h_tech: 'tasks by assignee', h_overdue_rule: 'Overdue is computed: next due date < today, status not Cancelled/Completed.',
n_nodate: '{0} without date', no_maint_plans: 'No maintenance plans configured', no_maint_plans_s: 'No Asset Maintenance records exist for these assets.', insp_none_short: 'No inspection records exist in ERP.',
t_register: 'Asset master register', c_id: 'Asset ID', c_name: 'Asset Name', c_category: 'Asset Category', c_company: 'Company', c_location: 'Location', c_custodian: 'Custodian', c_pdate: 'Purchase Date', c_cost: 'Original Cost', c_nbv: 'Verified Book Value', c_status: 'Status', c_lastm: 'Last Maintenance', c_nextm: 'Next Maintenance', c_actions: 'Actions', c_dept: 'Department', c_count: 'Count',
reg_foot: '{0} records match · total cost on this page: {1}', unverified: 'Unverified', verified: 'Verified', disposed: 'Disposed', excluded: 'excluded', nbv_rule: 'Cost minus opening and posted (journal-linked) depreciation, equal to the ERP value field.',
r_not_submitted: 'Not a submitted record', r_disposed: 'Sold / scrapped / decapitalized', r_no_cost: 'No cost recorded', r_no_dep_calc: 'No depreciation configured', r_zero_unproven: 'Book value field is 0 but posted depreciation does not support it', r_mismatch: 'Book value field differs from cost minus posted depreciation', r_load_failed: 'Asset document could not be read',
note_nostatus: 'The Status filter is not applied on this tab; the cards break records down by ERP status.',
p_total: 'Total registered equipment', p_active: 'Active equipment', p_ooo: 'Out of order', p_cost: 'Recorded acquisition cost', s_active_def2: '',
empty_plant: 'No plant & machinery assets match the filters', t_inventory: 'Machinery inventory', c_mreq: 'Maintenance required', has_plan: 'has plan', t_custodian: 'Custodian / responsible person', t_mreq: 'Maintenance requirements', mreq_flag: 'Assets flagged "maintenance required"', mreq_noplan: 'Flagged but without a maintenance plan', t_mhist: 'Maintenance history', t_repairs: 'Breakdown & repair history', c_avail: 'Operational availability',
unsupported_avail: '', avail_msg: 'Availability/uptime cannot be derived from accounting status. Recorded repair downtime text: {0}', no_downtime: 'none recorded', no_logs: 'No maintenance logs for these assets', no_repairs: 'No repair records for these assets', no_repairs_s: 'Asset Repair has no matching entries.', repairs_other: '{0} repair record(s) exist for assets outside plant & furniture scope and are excluded.',
c_task: 'Maintenance Task', c_mtype: 'Maintenance Type', c_due: 'Due Date', c_completed: 'Completion Date', c_ref: 'Document', c_failure: 'Failure Date', c_repcost: 'Repair Cost', c_downtime: 'Downtime', c_desc: 'Description', capitalized: 'capitalized',
note_dm: 'Furniture records come from DM Assets (Chair, Table) and Asset category Fixtures & Fittings. Company, department and status filters do not apply to DM Assets (no such fields). DM Assets has no quantity, cost or condition fields: counts are records; nothing is estimated.',
f_chairs: 'Total chairs', f_tables: 'Total tables', f_other: 'Other furniture (Asset records)', f_assigned: 'Assigned to an employee', f_unassigned: 'Unassigned', f_incomplete: 'Incomplete records', f_byloc: 'Furniture by location', f_byemp: 'Furniture by employee', t_furn_reg: 'Furniture register (DM Assets)', c_employee: 'Employee', c_recdate: 'Recorded Date', c_condition: 'Condition', t_fx: 'Fixtures & Fittings assets (Asset DocType)', empty_furn: 'No furniture records match', empty_fx: 'No Fixtures & Fittings assets', empty_fx_s: 'No Asset records exist in category {0}. Furniture value is therefore not available.',
val_rule: 'Book value is "verified" only when cost − opening depreciation − journal-posted schedule depreciation equals the ERP value field (±1). A 0 value without supporting postings is shown as unverified. One finance book per asset is used (default, else first) to avoid double counting. Repair cost is never added to asset cost. Amounts are in each company’s currency.',
val_partial: 'Valuation checked for the first 150 of {0} assets.', v_cost: 'Total acquisition cost', v_acc: 'Accumulated depreciation (verified)', v_unver: 'Unverified valuations', v_disp: 'Disposed / cancelled', v_costcat: 'Cost by asset category', v_depyear: 'Depreciation by year', v_age: 'Asset age distribution', yrs: 'yrs', posted: 'posted', scheduled: 'scheduled', no_sched: 'No depreciation schedules',
t_valuation: 'Valuation detail & financial exceptions', v_open: 'Opening accum. dep.', v_posted: 'Posted depreciation', v_derived: 'Cost − posted', v_field: 'ERP value field', v_fb: 'Finance book', v_result: 'Result', multi_fb: 'multiple books', t_disposed: 'Sold, scrapped and cancelled assets', c_disposal: 'Disposal Date', no_disposed: 'No sold, scrapped or cancelled assets in scope',
note_mnt: 'Source: Asset Maintenance (plans & tasks), Asset Maintenance Log and Asset Repair. Restricted to the assets selected by the filters; the date range filters due/failure dates. Nothing is inferred.',
partial_denied: 'No access to {0}; related figures are incomplete.', m_planned: 'Planned maintenance', m_done: 'Completed maintenance logs', m_pend: 'Pending repairs', m_comp: 'Completed repairs', m_repcost: 'Total repair cost', m_needs: 'Assets requiring maintenance',
t_schedule: 'Maintenance schedule', c_freq: 'Frequency', c_last: 'Last Completion', c_next: 'Next Due', c_tech: 'Assigned Technician', overdue_c: 'overdue', due_soon: 'due soon', t_calendar: 'Maintenance calendar', t_alerts: 'Next-service & overdue alerts', no_alerts: 'No alerts', weekdays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
m_bycat: 'Maintenance by asset category', m_costasset: 'Repair cost by asset', m_tech: 'Technician assignment', t_prev: 'Preventive-maintenance schedule', prev_count: '{0} preventive task(s) shown in the schedule above.', no_prev: 'No preventive maintenance tasks', t_comp_hist: 'Maintenance completion history', c_actions_done: 'Actions performed', c_cert: 'Certificate', view_cert: 'View certificate', no_cert: 'none attached', t_corrective: 'Corrective maintenance, breakdown & repair history', t_spares: 'Spare parts consumed (Asset Repair)', c_item: 'Item', c_qty: 'Quantity', c_value: 'Value', no_spares: 'No spare parts consumed', no_spares_s: 'No Asset Repair consumed items recorded.',
ts_planned: 'Planned', ts_overdue: 'Overdue (computed)', ts_cancelled: 'Cancelled', ts_ended: 'Ended',
insp_audit: 'Audit result: ERP has no dedicated plant/furniture inspection DocType (no pass/fail, checklist, photo or corrective-action fields). Vehicle Inspection and Quality Inspection exist but do not relate to these assets. Only Calibration tasks in Asset Maintenance are real, partial inspection-like data. Creating inspections is not configured, and nothing was created.',
i_sched: 'Inspections scheduled', i_done: 'Inspections completed', i_pass: 'Passed inspections', i_fail: 'Failed inspections', i_over: 'Overdue inspections', i_corr: 'Requiring corrective action', insp_no_src: 'No ERP source', insp_real: 'Real data available: calibration (Asset Maintenance)', cal_sched: 'Calibration plans', cal_done: 'Calibrations completed (logs)', cal_over: 'Calibrations overdue',
insp_plant: 'Plant & machinery inspection', insp_elec: 'Electrical inspection', insp_mech: 'Mechanical inspection', insp_safety: 'Safety inspection', insp_furn: 'Furniture condition inspection', insp_cal: 'Calibration inspection', cal_hint: 'Calibration tasks and logs from Asset Maintenance.',
insp_check: 'Proposed checklist', insp_check_h: 'Display only — no ERP storage exists', create_insp: 'Create inspection', ck1: 'Physical condition', ck2: 'Mechanical condition', ck3: 'Electrical safety', ck4: 'Operational condition', ck5: 'Visible damage', ck6: 'Safety equipment', ck7: 'Calibration or certification', ck8: 'Inspector observations', ck9: 'Inspection photographs', ck10: 'Corrective actions required',
insp_sources: 'Sources checked', insp_sources_h: 'Existing ERP DocTypes reviewed', src_cal: 'Calibration tasks/logs only; no pass/fail result.', src_vehicle: 'Vehicles only, no asset link.', src_qi: 'Stock/item quality, not fixed assets.', src_none: 'Asset Inspection DocType does not exist.',
t_insp: 'Inspection table (calibration records)', c_itype: 'Inspection Type', c_idate: 'Last Inspection', c_inspector: 'Inspector', c_result: 'Result', c_remarks: 'Remarks', cert_required: 'required', no_insp_rows: 'No calibration inspection records', no_insp_rows_s: 'No Calibration tasks exist for these assets.',
note_assign: 'Three separate sources are shown and never merged: Asset custodian, DM Assets, and Asset Acquisition Records. Dates and return status are shown only when a source records them.',
as_asset: 'Assets with a custodian', as_dm: 'DM Assets records', as_acq: 'Acquisition record items', as_emps: 'Employees', link_check: 'Identifier check: {0} of {1} acquisition items with a DM asset number match a DM Assets ID. Records are not combined, so nothing is counted twice.',
as_t1: 'Asset custodians (Asset DocType)', as_t2: 'DM Assets register', as_t3: 'Asset Acquisition Records (issue / return)', furn_only: 'Furniture only', all_cats: 'All categories', all_items: 'All items', c_assigned: 'Assigned Date', c_return: 'Return Status', c_comploc: 'Company / Location', via_mv: 'via Asset Movement', empty_cust: 'No assets with a custodian', empty_dm: 'No DM Assets records', empty_acq: 'No acquisition records', c_dmno: 'DM Asset No', c_wstate: 'State', returned: 'Returned', issued: 'Issued',
note_move: 'Source: Asset Movement and its asset lines. Date range filters the transaction date; Location matches source or destination.',
mv_lines: 'Movement lines', mv_docs: 'Movement documents', mv_in: 'Plant/furniture assets', mv_out: 'Other categories', mv_can: 'Cancelled', scope_only: 'Plant & furniture only', c_mdate: 'Movement Date', c_mtype2: 'Movement Type', c_src: 'Source Location', c_dst: 'Destination', c_from: 'From Employee', c_to: 'Assigned To', c_doc: 'Movement Doc', c_refdoc: 'Reference', submitted: 'Submitted', outside_scope: 'outside scope', empty_mv: 'No movements match', empty_mv_s: 'No Asset Movement lines exist for plant or furniture assets. Switch to all categories to see the rest.',
note_audit: 'Read-only findings. Nothing is changed automatically; each row links to the ERP record to correct. Status and date filters are not applied here.',
x_total: 'Total findings', sev_high: 'High', sev_medium: 'Medium', sev_low: 'Low', sev_info: 'Info', c_severity: 'Severity', c_asset: 'Asset', c_issue: 'Issue', c_source: 'Source', c_fix: 'Suggested correction', c_view: 'View record', no_exceptions: 'No exceptions found', no_exceptions_s: 'All checks passed for the current filters.',
x_cancelled: 'Cancelled asset record', f_cancelled: 'Informational: excluded from active totals. Keep for audit trail.', x_draft: 'Asset is still a draft', f_draft: 'Submit or delete the draft.', x_noloc: 'Missing location', f_noloc: 'Set the Location on the asset.', x_nocust: 'Missing custodian', f_nocust: 'Assign a custodian (employee).', x_nodate: 'Missing purchase date', f_nodate: 'Enter the purchase date.', x_nocost: 'Missing or zero cost', f_nocost: 'Review the asset cost with finance.',
x_fdflag: 'Status is Fully Depreciated but the is-fully-depreciated flag is unchecked', f_fdflag: 'Review the flag with finance; do not edit without checking depreciation entries.', x_nomplan: 'Maintenance required but no maintenance plan', f_nomplan: 'Create an Asset Maintenance plan.', x_disposed: 'Asset is {0}', f_disposed: 'Excluded from active totals.', x_dup: 'Possible duplicate of {0} (same name, company, date and cost)', f_dup: 'Confirm whether this is a true duplicate; cancel the extra record.',
x_unver: 'Book value unverifiable', f_unver: 'Check depreciation schedule and journal entries with finance.', x_overdue: 'Overdue maintenance "{0}" (due {1})', f_overdue: 'Complete the task or update its schedule.', x_nocert: 'Completed "{0}" without a required certificate', f_nocert: 'Attach the certificate to the log.', x_noid: 'Missing asset identifier', f_noid: 'Set the Asset ID.', x_dmdup: 'Duplicate Asset ID in DM Assets', x_furn_inc: 'Incomplete furniture record: {0} missing', f_furn_inc: 'Complete the missing field.',
t_sources: 'Verified ERP data sources & access', c_access: 'Access',
d_title: 'Asset details', d_identity: 'Identity', d_operational: 'Operational information', d_financial: 'Financial information', d_history: 'History', d_avail: 'Available for use', d_qty: 'Asset quantity', d_insend: 'Insurance end', d_disposal: 'Disposal date', d_hist: 'Historical cost (Total Asset Cost)', d_gross: 'Gross purchase amount', d_addl: 'Additional asset cost', d_field: 'ERP value after depreciation', d_calc: 'Calculate depreciation', d_fbooks: 'Finance books', d_date: 'Schedule date', d_amount: 'Amount', d_posted: 'Journal entry', d_mv: 'Movements', d_mnt: 'Maintenance logs', d_acqlink: 'Acquisition records with a matching DM asset number', d_cost: 'Acquisition cost', dm_nofin: 'DM Assets has no verified cost, depreciation or condition fields; none are shown or estimated.'
};
I.ar = {
title: 'لوحة أصول المصانع والأثاث', subtitle: 'مجموعة DM السعودية · بيانات حية من النظام (قراءة فقط)', asof: 'حتى', refresh: 'تحديث', loading: 'جارٍ التحميل من النظام…', retry: 'إعادة المحاولة', close: 'إغلاق',
tab_overview: 'نظرة عامة', tab_register: 'سجل الأصول', tab_plant: 'المصانع والآلات', tab_furniture: 'الأثاث والتجهيزات', tab_valuation: 'التقييم والإهلاك', tab_maintenance: 'الصيانة', tab_inspection: 'الفحص', tab_assign: 'عهد الموظفين', tab_movement: 'التحويلات والحركة', tab_audit: 'الاستثناءات والتدقيق',
all: 'الكل', f_company: 'الشركة', f_category: 'فئة الأصل', f_location: 'الموقع / الفرع', f_dept: 'القسم', f_custodian: 'المسؤول / الموظف', f_status: 'حالة الأصل', f_from: 'من تاريخ', f_to: 'إلى تاريخ', f_search: 'بحث', f_search_ph: 'اسم الأصل أو رقمه', reset: 'إعادة ضبط المرشحات',
st_active: 'نشط (معتمد وغير مستبعد)', st_noncancelled: 'الكل عدا الملغي', st_all: 'الكل بما فيه الملغي', st_cancelled: 'الملغي فقط', st_draft: 'المسودات فقط', none_set: '(غير محدد)',
records: 'سجل', empty: 'لا توجد بيانات', drill_hint: 'انقر للتفاصيل', showing: 'عرض {0}–{1} من {2}', export_csv: 'CSV', view: 'عرض', open_erp: 'فتح في النظام', history: 'السجل', yes: 'نعم', no: 'لا',
no_access: 'لا توجد صلاحية', unavailable: 'غير متاح', unsupported: 'غير مدعوم', not_configured: 'غير مُهيّأ', not_recorded: 'غير مسجل', not_applicable: 'لا ينطبق', missing: 'غير موجود', readable: 'متاح للقراءة', partial: 'جزئي', partial_src: 'بيانات جزئية', none_found: 'لا يوجد', err_load: 'تعذر تحميل البيانات:', err_generic: 'فشل الطلب', cat_missing: 'فئة الأصل غير موجودة في النظام: {0}',
measures_note: 'تُعرض المقاييس منفصلة: عدد السجلات، والكميات (كمية الأصل)، والتكلفة التاريخية (إجمالي تكلفة الأصل)، والقيمة الدفترية الموثقة. تُستبعد السجلات الملغاة من الإجماليات النشطة.',
k_plant: 'أصول المصانع والآلات', k_furn: 'أصول الأثاث', k_cost: 'تكلفة الأصول المسجلة', k_nbv: 'صافي القيمة الدفترية الموثقة', k_fd: 'أصول مهلكة بالكامل', k_im: 'أصول تحت الصيانة', k_od: 'مهام صيانة متأخرة', k_insp: 'عمليات الفحص المجدولة', k_nocust: 'أصول بدون مسؤول', k_nofin: 'نقص بيانات مالية / موقع', k_plans: 'خطط الصيانة',
s_qty: 'الكمية {0} · السجلات {1}', s_furn: '{0} سجل أصول · {1} سجل في DM Assets (دون دمج)', s_hist: 'تكلفة تاريخية', s_nbv: 'تم التحقق من {0} من {1} أصل', s_status: 'حسب حالة النظام', s_od: 'تاريخ الاستحقاق قبل اليوم وغير مكتملة', s_noplans: 'لا توجد خطط صيانة', s_calib: 'خطط المعايرة: {0}', s_of: 'من {0} سجل', s_nofin: 'بدون موقع أو التكلفة ≤ 0', s_of_all: 'من {0} إجمالاً', s_distinct: 'موظفون مختلفون', s_excl_cancel: 'دون الملغي', s_verified_only: '{0} أصل موثق فقط', s_unver_cost: 'التكلفة {0}', s_disp: 'مباع / مخردة / ملغي', s_tasks: '{0} مهمة', s_repcost: 'تكلفة الإصلاح (لا تُضاف لتكلفة الأصل)', s_needs: 'حقل الصيانة المطلوبة', s_nodisp: '{0} مستبعد', s_active_def: 'معتمد وغير مباع أو مخردة', s_records_only: 'سجلات (لا يوجد حقل كمية)', s_other: 'فئة الأصل {0}', s_assigned_note: 'الموظف إلزامي في DM Assets', s_nodesc: 'بدون وصف', s_cal_src: 'صيانة الأصول (معايرة)',
recon_ok: 'مطابقة: عدد النظام {0} = السجلات المستخدمة في المؤشرات والرسوم {1}.', recon_bad: 'عدد النظام {0}؛ السجلات المحملة {1} (القائمة محدودة أو تغيرت). ضيّق المرشحات.',
empty_scope: 'لا توجد أصول مصانع أو أثاث مطابقة للمرشحات الحالية', empty_scope_s: 'جرّب إعادة ضبط المرشحات أو اختيار حالة أخرى.', empty_filter: 'لا توجد سجلات مطابقة للمرشحات', empty_filter_s: 'عدّل المرشحات أو أعد ضبطها.', dm_furn_lbl: 'الأثاث (سجل DM Assets)',
c_cat: 'توزيع الأصول حسب الفئة', c_loc: 'توزيع الأصول حسب الموقع', c_costcat: 'تكلفة الاقتناء حسب فئة الأصل', ch_status: 'توزيع حالات الأصول', c_trend: 'اتجاه اقتناء الأصول (شهري)', c_mstatus: 'حالة الصيانة', c_istatus: 'حالة الفحص',
h_records: 'عدد السجلات — انقر للتفاصيل', h_hist: 'تكلفة تاريخية للسجلات النشطة', h_trend: 'حسب تاريخ الشراء؛ التسمية: السجلات · التكلفة', h_mstatus: 'مهام الخطط (يسار) · سجلات الصيانة (يمين)', h_register: 'ترقيم الصفحات من الخادم؛ انقر على الرقم للتفاصيل', h_depyear: 'من جداول الإهلاك: المرحّل مقابل المجدول', h_age: 'حسب تاريخ الاستخدام / الشراء', h_calendar: 'الاستحقاقات والإنجازات والأعطال', h_alerts: 'متأخرة ومستحقة خلال 30 يوماً', h_plans: 'خطط الصيانة', h_costasset: 'تكلفة الإصلاح دون الملغي', h_tech: 'المهام حسب المسؤول', h_overdue_rule: 'التأخر محسوب: تاريخ الاستحقاق القادم قبل اليوم والحالة ليست ملغاة/مكتملة.',
n_nodate: '{0} بدون تاريخ', no_maint_plans: 'لا توجد خطط صيانة مُهيّأة', no_maint_plans_s: 'لا توجد سجلات صيانة أصول لهذه الأصول.', insp_none_short: 'لا توجد سجلات فحص في النظام.',
t_register: 'السجل الرئيسي للأصول', c_id: 'رقم الأصل', c_name: 'اسم الأصل', c_category: 'فئة الأصل', c_company: 'الشركة', c_location: 'الموقع', c_custodian: 'المسؤول', c_pdate: 'تاريخ الشراء', c_cost: 'التكلفة الأصلية', c_nbv: 'القيمة الدفترية الموثقة', c_status: 'الحالة', c_lastm: 'آخر صيانة', c_nextm: 'الصيانة القادمة', c_actions: 'إجراءات', c_dept: 'القسم', c_count: 'العدد',
reg_foot: '{0} سجل مطابق · إجمالي تكلفة هذه الصفحة: {1}', unverified: 'غير موثق', verified: 'موثق', disposed: 'مستبعد', excluded: 'مستبعد', nbv_rule: 'التكلفة ناقص الإهلاك الافتتاحي والمرحّل (المرتبط بقيد يومية)، ويساوي حقل القيمة في النظام.',
r_not_submitted: 'سجل غير معتمد', r_disposed: 'مباع / مخردة / مستبعد رسمياً', r_no_cost: 'لا توجد تكلفة مسجلة', r_no_dep_calc: 'لا يوجد إهلاك مهيأ', r_zero_unproven: 'حقل القيمة الدفترية = 0 لكن الإهلاك المرحّل لا يدعمه', r_mismatch: 'حقل القيمة الدفترية يختلف عن التكلفة ناقص الإهلاك المرحّل', r_load_failed: 'تعذرت قراءة مستند الأصل',
note_nostatus: 'مرشح الحالة غير مطبق في هذه الصفحة؛ تقسّم البطاقات السجلات حسب حالة النظام.',
p_total: 'إجمالي المعدات المسجلة', p_active: 'المعدات النشطة', p_ooo: 'خارج الخدمة', p_cost: 'تكلفة الاقتناء المسجلة',
empty_plant: 'لا توجد أصول مصانع وآلات مطابقة للمرشحات', t_inventory: 'جرد الآلات', c_mreq: 'صيانة مطلوبة', has_plan: 'لها خطة', t_custodian: 'المسؤول / الشخص المسؤول', t_mreq: 'متطلبات الصيانة', mreq_flag: 'أصول معلّمة «صيانة مطلوبة»', mreq_noplan: 'معلّمة لكن بدون خطة صيانة', t_mhist: 'سجل الصيانة', t_repairs: 'سجل الأعطال والإصلاحات', c_avail: 'الجاهزية التشغيلية',
avail_msg: 'لا يمكن استنتاج الجاهزية أو وقت التشغيل من الحالة المحاسبية. نص التوقف المسجل في الإصلاحات: {0}', no_downtime: 'لا يوجد', no_logs: 'لا توجد سجلات صيانة لهذه الأصول', no_repairs: 'لا توجد سجلات إصلاح لهذه الأصول', no_repairs_s: 'لا توجد مدخلات مطابقة في إصلاح الأصول.', repairs_other: 'يوجد {0} سجل إصلاح لأصول خارج نطاق المصانع والأثاث وهي مستبعدة.',
c_task: 'مهمة الصيانة', c_mtype: 'نوع الصيانة', c_due: 'تاريخ الاستحقاق', c_completed: 'تاريخ الإنجاز', c_ref: 'المستند', c_failure: 'تاريخ العطل', c_repcost: 'تكلفة الإصلاح', c_downtime: 'مدة التوقف', c_desc: 'الوصف', capitalized: 'مرسملة',
note_dm: 'سجلات الأثاث من DM Assets (كرسي، طاولة) وفئة الأصل Fixtures & Fittings. مرشحات الشركة والقسم والحالة لا تنطبق على DM Assets (لا توجد حقول مقابلة). لا يحتوي DM Assets على كمية أو تكلفة أو حالة: الأعداد سجلات وليست تقديرات.',
f_chairs: 'إجمالي الكراسي', f_tables: 'إجمالي الطاولات', f_other: 'أثاث آخر (سجلات الأصول)', f_assigned: 'مسندة لموظف', f_unassigned: 'غير مسندة', f_incomplete: 'سجلات ناقصة', f_byloc: 'الأثاث حسب الموقع', f_byemp: 'الأثاث حسب الموظف', t_furn_reg: 'سجل الأثاث (DM Assets)', c_employee: 'الموظف', c_recdate: 'تاريخ التسجيل', c_condition: 'الحالة الفنية', t_fx: 'أصول الأثاث والتجهيزات (نوع Asset)', empty_furn: 'لا توجد سجلات أثاث مطابقة', empty_fx: 'لا توجد أصول أثاث وتجهيزات', empty_fx_s: 'لا توجد سجلات أصول في الفئة {0}، لذلك قيمة الأثاث غير متاحة.',
val_rule: 'تُعد القيمة الدفترية «موثقة» فقط عندما تساوي (التكلفة − الإهلاك الافتتاحي − إهلاك الجدول المرحّل بقيد يومية) حقل القيمة في النظام (±1). القيمة صفر بلا ترحيلات داعمة تظهر غير موثقة. يُستخدم دفتر مالي واحد لكل أصل (الافتراضي وإلا الأول) لمنع التكرار. لا تُضاف تكلفة الإصلاح إلى تكلفة الأصل. المبالغ بعملة كل شركة.',
val_partial: 'تم فحص التقييم لأول 150 أصلاً من {0}.', v_cost: 'إجمالي تكلفة الاقتناء', v_acc: 'مجمع الإهلاك (موثق)', v_unver: 'تقييمات غير موثقة', v_disp: 'مستبعد / ملغي', v_costcat: 'التكلفة حسب فئة الأصل', v_depyear: 'الإهلاك حسب السنة', v_age: 'توزيع أعمار الأصول', yrs: 'سنة', posted: 'مرحّل', scheduled: 'مجدول', no_sched: 'لا توجد جداول إهلاك',
t_valuation: 'تفاصيل التقييم والاستثناءات المالية', v_open: 'مجمع إهلاك افتتاحي', v_posted: 'الإهلاك المرحّل', v_derived: 'التكلفة − المرحّل', v_field: 'حقل القيمة في النظام', v_fb: 'الدفتر المالي', v_result: 'النتيجة', multi_fb: 'عدة دفاتر', t_disposed: 'الأصول المباعة والمخردة والملغاة', c_disposal: 'تاريخ الاستبعاد', no_disposed: 'لا توجد أصول مباعة أو مخردة أو ملغاة ضمن النطاق',
note_mnt: 'المصدر: صيانة الأصول (الخطط والمهام) وسجل الصيانة وإصلاح الأصول، للأصول المحددة بالمرشحات؛ ويطبق نطاق التاريخ على تواريخ الاستحقاق/العطل. لا يتم استنتاج أي شيء.',
partial_denied: 'لا توجد صلاحية على {0}؛ الأرقام المرتبطة غير مكتملة.', m_planned: 'صيانة مخططة', m_done: 'سجلات صيانة مكتملة', m_pend: 'إصلاحات معلقة', m_comp: 'إصلاحات مكتملة', m_repcost: 'إجمالي تكلفة الإصلاح', m_needs: 'أصول تحتاج صيانة',
t_schedule: 'جدول الصيانة', c_freq: 'التكرار', c_last: 'آخر إنجاز', c_next: 'الاستحقاق القادم', c_tech: 'الفني المسؤول', overdue_c: 'متأخرة', due_soon: 'قريباً', t_calendar: 'تقويم الصيانة', t_alerts: 'تنبيهات الخدمة القادمة والمتأخرة', no_alerts: 'لا توجد تنبيهات', weekdays: 'أحد,اثنين,ثلاثاء,أربعاء,خميس,جمعة,سبت',
m_bycat: 'الصيانة حسب فئة الأصل', m_costasset: 'تكلفة الإصلاح حسب الأصل', m_tech: 'إسناد الفنيين', t_prev: 'جدول الصيانة الوقائية', prev_count: 'يظهر {0} مهمة وقائية في الجدول أعلاه.', no_prev: 'لا توجد مهام صيانة وقائية', t_comp_hist: 'سجل إنجاز الصيانة', c_actions_done: 'الإجراءات المنفذة', c_cert: 'الشهادة', view_cert: 'عرض الشهادة', no_cert: 'لا توجد شهادة', t_corrective: 'الصيانة التصحيحية وسجل الأعطال والإصلاح', t_spares: 'قطع الغيار المستهلكة (إصلاح الأصول)', c_item: 'الصنف', c_qty: 'الكمية', c_value: 'القيمة', no_spares: 'لا توجد قطع غيار مستهلكة', no_spares_s: 'لا توجد أصناف مستهلكة مسجلة في إصلاح الأصول.',
ts_planned: 'مخططة', ts_overdue: 'متأخرة (محسوبة)', ts_cancelled: 'ملغاة', ts_ended: 'منتهية',
insp_audit: 'نتيجة التدقيق: لا يوجد في النظام نوع مستند مخصص لفحص المصانع/الأثاث (لا نجاح/رسوب ولا قائمة تحقق ولا صور ولا إجراءات تصحيحية). يوجد فحص المركبات وفحص الجودة لكنهما لا يرتبطان بهذه الأصول. المتاح فعلياً جزئياً هو مهام المعايرة في صيانة الأصول فقط. إنشاء الفحوصات غير مُهيّأ ولم يتم إنشاء أي شيء.',
i_sched: 'فحوصات مجدولة', i_done: 'فحوصات مكتملة', i_pass: 'فحوصات ناجحة', i_fail: 'فحوصات راسبة', i_over: 'فحوصات متأخرة', i_corr: 'تتطلب إجراءً تصحيحياً', insp_no_src: 'لا يوجد مصدر في النظام', insp_real: 'بيانات فعلية متاحة: المعايرة (صيانة الأصول)', cal_sched: 'خطط المعايرة', cal_done: 'معايرات مكتملة (السجلات)', cal_over: 'معايرات متأخرة',
insp_plant: 'فحص المصانع والآلات', insp_elec: 'الفحص الكهربائي', insp_mech: 'الفحص الميكانيكي', insp_safety: 'فحص السلامة', insp_furn: 'فحص حالة الأثاث', insp_cal: 'فحص المعايرة', cal_hint: 'مهام وسجلات المعايرة من صيانة الأصول.',
insp_check: 'قائمة التحقق المقترحة', insp_check_h: 'للعرض فقط — لا يوجد تخزين في النظام', create_insp: 'إنشاء فحص', ck1: 'الحالة المادية', ck2: 'الحالة الميكانيكية', ck3: 'السلامة الكهربائية', ck4: 'الحالة التشغيلية', ck5: 'الأضرار الظاهرة', ck6: 'معدات السلامة', ck7: 'المعايرة أو الاعتماد', ck8: 'ملاحظات الفاحص', ck9: 'صور الفحص', ck10: 'الإجراءات التصحيحية المطلوبة',
insp_sources: 'المصادر التي تم فحصها', insp_sources_h: 'أنواع المستندات الموجودة في النظام', src_cal: 'مهام/سجلات المعايرة فقط، دون نتيجة نجاح/رسوب.', src_vehicle: 'للمركبات فقط، دون ربط بالأصول.', src_qi: 'جودة المخزون/الأصناف وليست أصولاً ثابتة.', src_none: 'نوع مستند فحص الأصول غير موجود.',
t_insp: 'جدول الفحص (سجلات المعايرة)', c_itype: 'نوع الفحص', c_idate: 'آخر فحص', c_inspector: 'الفاحص', c_result: 'النتيجة', c_remarks: 'ملاحظات', cert_required: 'مطلوبة', no_insp_rows: 'لا توجد سجلات معايرة', no_insp_rows_s: 'لا توجد مهام معايرة لهذه الأصول.',
note_assign: 'تُعرض ثلاثة مصادر منفصلة دون دمج: مسؤول الأصل، وDM Assets، وسجلات اقتناء الأصول. التواريخ وحالة الإرجاع تظهر فقط عندما يسجلها المصدر.',
as_asset: 'أصول لها مسؤول', as_dm: 'سجلات DM Assets', as_acq: 'بنود سجلات الاقتناء', as_emps: 'الموظفون', link_check: 'فحص المعرّفات: {0} من {1} بند اقتناء له رقم أصل DM يطابق معرّفاً في DM Assets. لا تُدمج السجلات لذا لا يوجد عدّ مزدوج.',
as_t1: 'مسؤولو الأصول (نوع Asset)', as_t2: 'سجل DM Assets', as_t3: 'سجلات اقتناء الأصول (صرف / إرجاع)', furn_only: 'الأثاث فقط', all_cats: 'كل الفئات', all_items: 'كل البنود', c_assigned: 'تاريخ الإسناد', c_return: 'حالة الإرجاع', c_comploc: 'الشركة / الموقع', via_mv: 'عبر حركة الأصل', empty_cust: 'لا توجد أصول لها مسؤول', empty_dm: 'لا توجد سجلات DM Assets', empty_acq: 'لا توجد سجلات اقتناء', c_dmno: 'رقم أصل DM', c_wstate: 'الوضع', returned: 'مرتجع', issued: 'مصروف',
note_move: 'المصدر: حركة الأصول وبنودها. نطاق التاريخ يطبق على تاريخ المعاملة؛ والموقع يطابق المصدر أو الوجهة.',
mv_lines: 'بنود الحركة', mv_docs: 'مستندات الحركة', mv_in: 'أصول المصانع/الأثاث', mv_out: 'فئات أخرى', mv_can: 'ملغاة', scope_only: 'المصانع والأثاث فقط', c_mdate: 'تاريخ الحركة', c_mtype2: 'نوع الحركة', c_src: 'الموقع المصدر', c_dst: 'الوجهة', c_from: 'من موظف', c_to: 'مسندة إلى', c_doc: 'مستند الحركة', c_refdoc: 'المرجع', submitted: 'معتمد', outside_scope: 'خارج النطاق', empty_mv: 'لا توجد حركات مطابقة', empty_mv_s: 'لا توجد بنود حركة لأصول المصانع أو الأثاث. اختر كل الفئات لعرض الباقي.',
note_audit: 'نتائج للقراءة فقط. لا يتم تغيير أي شيء تلقائياً؛ كل صف يرتبط بسجل النظام لتصحيحه. مرشحا الحالة والتاريخ غير مطبقين هنا.',
x_total: 'إجمالي الملاحظات', sev_high: 'عالية', sev_medium: 'متوسطة', sev_low: 'منخفضة', sev_info: 'معلومة', c_severity: 'الخطورة', c_asset: 'الأصل', c_issue: 'المشكلة', c_source: 'المصدر', c_fix: 'التصحيح المقترح', c_view: 'عرض السجل', no_exceptions: 'لا توجد استثناءات', no_exceptions_s: 'اجتازت جميع الفحوصات للمرشحات الحالية.',
x_cancelled: 'سجل أصل ملغي', f_cancelled: 'للعلم: مستبعد من الإجماليات النشطة. يُحفظ لأغراض التدقيق.', x_draft: 'الأصل ما زال مسودة', f_draft: 'اعتمد المسودة أو احذفها.', x_noloc: 'الموقع غير محدد', f_noloc: 'حدد موقع الأصل.', x_nocust: 'لا يوجد مسؤول', f_nocust: 'أسند مسؤولاً (موظفاً).', x_nodate: 'تاريخ الشراء غير محدد', f_nodate: 'أدخل تاريخ الشراء.', x_nocost: 'التكلفة غير مسجلة أو صفر', f_nocost: 'راجع تكلفة الأصل مع المالية.',
x_fdflag: 'الحالة مهلك بالكامل لكن علامة «مهلك بالكامل» غير مفعّلة', f_fdflag: 'راجع العلامة مع المالية؛ لا تعدّلها قبل فحص قيود الإهلاك.', x_nomplan: 'صيانة مطلوبة بدون خطة صيانة', f_nomplan: 'أنشئ خطة صيانة أصول.', x_disposed: 'الأصل {0}', f_disposed: 'مستبعد من الإجماليات النشطة.', x_dup: 'احتمال تكرار مع {0} (نفس الاسم والشركة والتاريخ والتكلفة)', f_dup: 'تأكد إن كان تكراراً فعلياً وألغِ السجل الزائد.',
x_unver: 'تعذر التحقق من القيمة الدفترية', f_unver: 'راجع جدول الإهلاك وقيود اليومية مع المالية.', x_overdue: 'صيانة متأخرة «{0}» (الاستحقاق {1})', f_overdue: 'أكمل المهمة أو حدّث جدولها.', x_nocert: 'أُنجزت «{0}» بدون الشهادة المطلوبة', f_nocert: 'أرفق الشهادة بالسجل.', x_noid: 'معرّف الأصل غير موجود', f_noid: 'حدد رقم الأصل.', x_dmdup: 'رقم أصل مكرر في DM Assets', x_furn_inc: 'سجل أثاث ناقص: {0} غير موجود', f_furn_inc: 'أكمل الحقل الناقص.',
t_sources: 'مصادر بيانات النظام الموثقة والصلاحيات', c_access: 'الصلاحية',
d_title: 'تفاصيل الأصل', d_identity: 'التعريف', d_operational: 'المعلومات التشغيلية', d_financial: 'المعلومات المالية', d_history: 'السجل', d_avail: 'تاريخ الجاهزية للاستخدام', d_qty: 'كمية الأصل', d_insend: 'انتهاء التأمين', d_disposal: 'تاريخ الاستبعاد', d_hist: 'التكلفة التاريخية (إجمالي تكلفة الأصل)', d_gross: 'إجمالي مبلغ الشراء', d_addl: 'تكلفة إضافية للأصل', d_field: 'القيمة بعد الإهلاك في النظام', d_calc: 'احتساب الإهلاك', d_fbooks: 'الدفاتر المالية', d_date: 'تاريخ الجدول', d_amount: 'المبلغ', d_posted: 'قيد اليومية', d_mv: 'الحركات', d_mnt: 'سجلات الصيانة', d_acqlink: 'سجلات اقتناء بنفس رقم أصل DM', d_cost: 'تكلفة الاقتناء', dm_nofin: 'لا يحتوي DM Assets على تكلفة أو إهلاك أو حالة موثقة؛ لذلك لا تُعرض ولا تُقدّر.'
};
['sev_high', 'sev_medium', 'sev_low', 'sev_info'].forEach(k => { });

/* ---------- detail drawer ---------- */
const kv = rows => '<dl class="kv">' + rows.map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : (r[1] === '' || r[1] == null ? '<span class="mut">' + esc(tr('not_recorded')) + '</span>' : esc(r[1]))) + '</dd>').join('') + '</dl>';
const sub = (id, t, body) => '<h4 id="' + id + '">' + esc(t) + '</h4>' + body;
const miniTbl = (heads, rows) => rows.length ? '<div class="tw"><table class="t"><thead><tr>' + heads.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '<div class="mut">' + esc(tr('none_found')) + '</div>';
async function assetDetail(name) {
  const d = await getDoc('Asset', name), v = valuate(d); const [M, mv] = await Promise.all([L.mnt(), L.mv()]);
  const cur = curOf(d.company), m = n => (cur ? cur + ' ' : '') + mf2(n);
  let h = '<h2>' + esc(d.asset_name || d.name) + '</h2><div class="mut">' + esc(d.name) + ' · ' + stChip(d.docstatus === 2 ? 'Cancelled' : d.status, d.docstatus) + '</div>';
  h += sub('d-id', tr('d_identity'), kv([[tr('c_category'), d.asset_category], [tr('c_company'), d.company], ['Item', d.item_name || d.item_code], [tr('c_pdate'), dstr(d.purchase_date)], [tr('d_avail'), dstr(d.available_for_use_date)], [tr('d_qty'), d.asset_quantity]]));
  h += sub('d-op', tr('d_operational'), kv([[tr('c_status'), d.docstatus === 2 ? 'Cancelled' : d.status], [tr('c_location'), d.location], [tr('c_custodian'), d.custodian], [tr('c_dept'), d.department], [tr('c_mreq'), d.maintenance_required ? tr('yes') : tr('no')], [tr('d_insend'), dstr(d.insurance_end_date)], [tr('d_disposal'), dstr(d.disposal_date)]]));
  h += sub('d-fin', tr('d_financial'), kv([[tr('d_hist'), m(d.total_asset_cost)], [tr('d_gross'), d.gross_purchase_amount != null ? m(d.gross_purchase_amount) : ''], [tr('d_addl'), d.additional_asset_cost != null ? m(d.additional_asset_cost) : ''], [tr('v_open'), m(d.opening_accumulated_depreciation)], [tr('v_posted'), m(v.posted)], [tr('d_field'), d.value_after_depreciation != null ? m(d.value_after_depreciation) : ''], [tr('v_derived'), v.derived != null ? m(v.derived) : ''],
    [tr('c_nbv'), v.verified ? '<b>' + esc(m(v.nbv)) + '</b> ' + chip(tr('verified'), 'ok') : (v.disposed ? chip(tr('disposed'), '') : chip(tr('unverified'), 'warn') + ' <span class="mut">' + esc(tr('r_' + v.reason)) + '</span>'), 1], [tr('d_calc'), d.calculate_depreciation ? tr('yes') : tr('no')], [tr('d_fbooks'), (d.finance_books || []).map(f => (f.finance_book || '(default)') + ' · ' + (f.depreciation_method || '') + ' · ' + (f.total_number_of_depreciations || 0) + ' × ' + (f.frequency_of_depreciation || 0) + 'm').join('<br>'), 1]]));
  if (d.docstatus === 1 && v.sched.length) h += miniTbl([tr('d_date'), tr('d_amount'), tr('d_posted')], v.sched.slice(0, 40).map(s => [esc(dstr(s.schedule_date)), esc(nf(s.depreciation_amount, 2)), s.journal_entry ? link('Journal Entry', s.journal_entry) : '<span class="mut">—</span>']));
  const mvs = mv.rows ? mv.rows.filter(x => x.asset === name) : [], plans = M.plans.filter(p => p.asset_name === name), logs = M.logs.filter(l => l.asset_name === name), reps = M.repairs.filter(r => r.asset === name);
  h += sub('d-hist', tr('d_history'), '<div class="mut" style="margin:4px 0">' + esc(tr('d_mv')) + '</div>' + miniTbl([tr('c_mdate'), tr('c_mtype2'), tr('c_src'), tr('c_dst'), tr('c_to'), tr('c_doc')], mvs.map(x => [esc(dstr(x._p.transaction_date)), esc(x._p.purpose || ''), esc(x.source_location || ''), esc(x.target_location || ''), esc(x.to_employee || ''), link('Asset Movement', x.parent)])) +
    '<div class="mut" style="margin:8px 0 4px">' + esc(tr('d_mnt')) + '</div>' + miniTbl([tr('c_task'), tr('c_status'), tr('c_due'), tr('c_completed')], logs.map(l => [esc(l.task_name || ''), esc(l.maintenance_status), esc(dstr(l.due_date)), esc(dstr(l.completion_date))]).concat(plans.length && !logs.length ? [] : [])) +
    '<div class="mut" style="margin:8px 0 4px">' + esc(tr('t_repairs')) + '</div>' + miniTbl([tr('c_ref'), tr('c_status'), tr('c_failure'), tr('c_repcost')], reps.map(r => [link('Asset Repair', r.name), esc(r.repair_status), esc(dstr(r.failure_date)), esc(nf(repCost(r), 2))])));
  return { html: h, dt: 'Asset', name };
}
async function dmDetail(name) {
  const d = await getDoc('DM Assets', name), acq = await L.acq();
  const hits = (acq.rows || []).filter(r => r.dmasset_no && r.dmasset_no === d.asset_id);
  let h = '<h2>' + esc(d.asset_id || d.name) + '</h2><div class="mut">' + esc(d.category) + ' · DM Assets</div>';
  h += sub('d-id', tr('d_identity'), kv([[tr('c_id'), d.asset_id], [tr('c_category'), d.category], [tr('c_desc'), d.description], [tr('c_employee'), d.employee], [tr('c_location'), d.location], [tr('c_recdate'), dstr(d.date)], [tr('c_condition'), ''], [tr('d_cost'), '']]));
  h += '<div class="banner info">' + esc(tr('dm_nofin')) + '</div>';
  h += sub('d-hist', tr('d_history'), '<div class="mut" style="margin:4px 0">' + esc(tr('d_acqlink')) + '</div>' + miniTbl([tr('c_ref'), tr('c_assigned'), tr('c_return')], hits.map(r => [link('Asset Acquisition Records', r.parent), esc(dstr(r._p.date)), esc(r._p.satus || '')])));
  return { html: h, dt: 'DM Assets', name };
}
async function openDetail(dt, name, hist) {
  const dr = root.querySelector('#drawer'); const tok = ++S.dtok;
  const head = '<div class="drawer" data-act="closebg"><div class="pnl" role="dialog" aria-modal="true" dir="' + (S.lang === 'ar' ? 'rtl' : 'ltr') + '"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px"><span class="chip pri">' + esc(tr('d_title')) + '</span><button class="btn sm" data-act="close">' + ic('x') + esc(tr('close')) + '</button></div>';
  dr.innerHTML = head + '<div class="load"><div class="spin"></div><div>' + esc(tr('loading')) + '</div></div></div></div>';
  try {
    const r = dt === 'Asset' ? await assetDetail(name) : await dmDetail(name); if (tok !== S.dtok) return;
    dr.innerHTML = head + r.html + '<div style="margin-top:14px"><a class="btn pri" target="_blank" rel="noopener" href="' + esc(formUrl(r.dt, r.name)) + '">' + ic('ext') + esc(tr('open_erp')) + '</a></div></div></div>';
    if (hist) { const el = dr.querySelector('#d-hist'); if (el && el.scrollIntoView) el.scrollIntoView(); }
  } catch (e) { if (tok !== S.dtok) return; dr.innerHTML = head + banner(errText(e), 'bad') + '</div></div>'; }
}

/* ---------- shell ---------- */
S.dtok = 0;
function paintShell() {
  root.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr'); root.setAttribute('lang', S.lang);
  root.innerHTML = '<div class="hdr"><div><h1>' + esc(tr('title')) + '</h1><div class="sub">' + esc(tr('subtitle')) + ' · ' + esc(tr('asof')) + ' ' + TODAY + '</div></div><div class="acts"><button class="btn" data-act="refresh">' + ic('refresh') + esc(tr('refresh')) + '</button><div class="lang" role="group" aria-label="Language"><button data-act="lang" data-v="en" class="' + (S.lang === 'en' ? 'on' : '') + '">English</button><button data-act="lang" data-v="ar" class="' + (S.lang === 'ar' ? 'on' : '') + '">العربية</button></div></div></div>' +
    '<nav class="tabs" role="tablist"></nav><div id="fbar"></div><div id="body"></div><div id="drawer"></div>';
  paintTabs();
}
function paintTabs() {
  root.querySelector('.tabs').innerHTML = TABS.map(t => '<button role="tab" data-act="tab" data-v="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '" aria-selected="' + (S.tab === t[0]) + '">' + ic(t[1]) + esc(tr('tab_' + t[0])) + '</button>').join('');
}
async function paintFilters() {
  const sc = await L.scope(), m = S.meta;
  const sel = (k, label, opts, none) => '<label>' + esc(label) + '<select data-f="' + k + '"><option value="">' + esc(tr('all')) + '</option>' + (none ? '<option value="__none__">' + esc(NONE()) + '</option>' : '') + opts.map(o => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>').join('') + '</select></label>';
  const loc = uniq(sc.rows.map(r => r.location).concat(m.dmLoc)).sort(), dep = uniq(sc.rows.map(r => r.department)).sort(), cus = uniq(sc.rows.map(r => r.custodian).concat(m.dmEmp)).sort();
  const stO = [['active', tr('st_active')], ['noncancelled', tr('st_noncancelled')], ['all', tr('st_all')], ['cancelled', tr('st_cancelled')], ['draft', tr('st_draft')]].concat(STATUS_OPTS.map(s => ['st:' + s, s]));
  root.querySelector('#fbar').innerHTML = '<div class="filters">' + sel('company', tr('f_company'), m.companies.map(c => [c.name, c.name])) + sel('category', tr('f_category'), SCOPE_CATS.map(c => [c, c])) + sel('location', tr('f_location'), loc.map(x => [x, x]), 1) +
    sel('department', tr('f_dept'), dep.map(x => [x, x]), 1) + sel('custodian', tr('f_custodian'), cus.map(x => [x, x]), 1) + sel('status', tr('f_status'), stO).replace('<option value="">' + esc(tr('all')) + '</option>', '') +
    '<label>' + esc(tr('f_from')) + '<input type="date" data-f="from"></label><label>' + esc(tr('f_to')) + '<input type="date" data-f="to"></label><label class="wide">' + esc(tr('f_search')) + '<input type="search" data-f="q" placeholder="' + esc(tr('f_search_ph')) + '"></label><div class="fa"><button class="btn" data-act="reset">' + esc(tr('reset')) + '</button></div></div>';
  syncFilterInputs();
}
const LOADING = () => '<div class="load"><div class="spin"></div><div>' + esc(tr('loading')) + '</div></div>';
async function show(tab, quiet) {
  const body = root.querySelector('#body'); if (!body) return;
  if (!quiet) { S.tab = tab; paintTabs(); body.innerHTML = LOADING(); }
  const tok = ++S.tok;
  try {
    const html = await DRAW[S.tab](); if (tok !== S.tok) return; body.innerHTML = html;
  } catch (e) { if (tok !== S.tok) return; body.innerHTML = banner(tr('err_load') + ' ' + errText(e), 'bad') + '<button class="btn" data-act="refresh">' + esc(tr('retry')) + '</button>'; }
}

/* ---------- events (single delegated set, removed on re-run) ---------- */
let qTimer = null;
function onClick(e) {
  const el = e.target.closest('[data-act]'); if (!el || !root.contains(el)) return; const a = el.dataset.act;
  if (a === 'size') return;
  if (a === 'closebg') { if (e.target === el) root.querySelector('#drawer').innerHTML = ''; return; }
  if (el.tagName === 'A' && a === 'detail') e.preventDefault();
  if (a === 'tab') show(el.dataset.v);
  else if (a === 'lang') { S.lang = el.dataset.v === 'ar' ? 'ar' : 'en'; try { localStorage.setItem('pfad_lang', S.lang); } catch (x) {} paintShell(); paintFilters().then(() => show(S.tab)); }
  else if (a === 'refresh') { MEMO.clear(); DOCS.clear(); S.T = {}; L.meta().then(m => { S.meta = m; return paintFilters(); }).then(() => show(S.tab)); }
  else if (a === 'drill') { if (TABS.some(t => t[0] === el.dataset.go)) { let set = {}; try { set = JSON.parse(el.dataset.set || '{}'); } catch (x) {} drill(el.dataset.go, set); } }
  else if (a === 'sort') { const st = S.T[el.dataset.t]; if (!st) return; if (st.sort === el.dataset.c) st.dir = -st.dir; else { st.sort = el.dataset.c; st.dir = 1; } st.page = 1; show(S.tab, true); }
  else if (a === 'pg') { const st = S.T[el.dataset.t]; if (!st) return; st.page = Math.max(1, st.page + Number(el.dataset.d)); show(S.tab, true); }
  else if (a === 'csv') exportCsv(el.dataset.t);
  else if (a === 'detail') openDetail(el.dataset.dt, el.dataset.n, el.dataset.hist);
  else if (a === 'close') { S.dtok++; root.querySelector('#drawer').innerHTML = ''; }
  else if (a === 'calnav') { S.cal.m += Number(el.dataset.d); if (S.cal.m < 0) { S.cal.m = 11; S.cal.y--; } if (S.cal.m > 11) { S.cal.m = 0; S.cal.y++; } show(S.tab, true); }
  else if (a === 'opt') { S.opt[el.dataset.k] = el.dataset.v === '1'; show(S.tab, true); }
  else if (a === 'sev') { S.sev = el.dataset.v; if (S.T.exc) S.T.exc.page = 1; show(S.tab, true); }
  else if (a === 'reset') { S.f = { company: '', category: '', location: '', department: '', custodian: '', status: 'active', from: '', to: '', q: '' }; S.T = {}; syncFilterInputs(); show(S.tab); }
}
async function exportCsv(id) {
  const r = REG[id]; if (!r) return;
  try { const rows = r.exportAll ? await r.exportAll() : r.rows; download(r.name, csvText(r.cols, rows)); } catch (e) { alert(errText(e)); }
}
function onChange(e) {
  const el = e.target;
  if (el.dataset.act === 'size') { const st = S.T[el.dataset.t]; if (st) { st.size = Number(el.value); st.page = 1; show(S.tab, true); } return; }
  if (el.dataset.f && el.dataset.f !== 'q') { S.f[el.dataset.f] = el.value; S.T = {}; show(S.tab); }
}
function onInput(e) {
  const el = e.target; if (el.dataset.f !== 'q') return;
  clearTimeout(qTimer); qTimer = setTimeout(() => { S.f.q = el.value.trim(); S.T = {}; show(S.tab); }, 400);
}
function onKey(e) { if (e.key === 'Escape') { const d = root.querySelector('#drawer'); if (d && d.innerHTML) { S.dtok++; d.innerHTML = ''; } } }
root.addEventListener('click', onClick, { signal: ac.signal });
root.addEventListener('change', onChange, { signal: ac.signal });
root.addEventListener('input', onInput, { signal: ac.signal });
root.addEventListener('keydown', onKey, { signal: ac.signal });
ac.signal.addEventListener('abort', () => clearTimeout(qTimer));

/* ---------- boot ---------- */
(async function boot() {
  paintShell(); root.querySelector('#body').innerHTML = LOADING();
  try {
    if (!canRead('Asset')) { root.querySelector('#body').innerHTML = banner(tr('no_access') + ': Asset', 'bad'); return; }
    S.meta = await L.meta(); await paintFilters();
    const miss = SCOPE_CATS.filter(c => S.meta.catNames.indexOf(c) < 0);
    await show('overview');
    if (miss.length) root.querySelector('#body').insertAdjacentHTML('afterbegin', banner(tr('cat_missing', miss.join(', ')), 'warn'));
  } catch (e) { root.querySelector('#body').innerHTML = banner(tr('err_load') + ' ' + errText(e), 'bad') + '<button class="btn" data-act="refresh">' + esc(tr('retry')) + '</button>'; }
})();
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
