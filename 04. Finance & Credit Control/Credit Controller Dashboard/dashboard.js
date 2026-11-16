/* DM Credit Controller Dashboard - read-only, client-side only. Uses existing Frappe APIs; permissions are enforced by the server. */
(function () {
'use strict';
var ROOT = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
var host = ROOT.querySelector('#dmcc') || document.querySelector('#dmcc');
if (!host) { return; }
if (host.getAttribute('data-ready') === '1') { return; }
host.setAttribute('data-ready', '1');

/* ---------- utils ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fmt(n) { return (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function p2(n) { return (n < 10 ? '0' : '') + n; }
function todayStr() { try { return frappe.datetime.get_today(); } catch (e) { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); } }
function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
function dayDiff(a, b) { return Math.round((Date.parse(b.slice(0, 10) + 'T00:00:00Z') - Date.parse(a.slice(0, 10) + 'T00:00:00Z')) / 86400000); }
function monthStart(s, back) { var y = +s.slice(0, 4), m = +s.slice(5, 7) - 1 - (back || 0); var d = new Date(Date.UTC(y, m, 1)); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-01'; }
function monthEnd(s, back) { return addDays(monthStart(s, (back || 0) - 1), -1); }
function slug(dt) { try { return frappe.router.slug(dt); } catch (e) { return String(dt).toLowerCase().replace(/ /g, '-'); } }
function docUrl(dt, n) { return '/app/' + slug(dt) + '/' + encodeURIComponent(n); }
function $(sel, el) { return (el || host).querySelector(sel); }
function $$(sel, el) { return Array.prototype.slice.call((el || host).querySelectorAll(sel)); }
function sum(a, f) { var s = 0; a.forEach(function (x) { s += f(x) || 0; }); return s; }
var PAL = ['#1d4ed8', '#3b82f6', '#0ea5e9', '#64748b', '#93c5fd', '#0b2a5b', '#94a3b8', '#38bdf8'];

/* ---------- i18n ---------- */
var L = {
 title: ['CREDIT CONTROLLER DASHBOARD', 'لوحة مراقب الائتمان'], sub: ['Receivables, Overdue Aging, Credit Limits & Collections', 'الذمم المدينة وأعمار الديون وحدود الائتمان والتحصيلات'],
 refresh: ['Refresh', 'تحديث'], updated: ['Last updated', 'آخر تحديث'], reset: ['Reset Filters', 'إعادة ضبط الفلاتر'],
 company: ['Company', 'الشركة'], division: ['Division', 'القسم / الشعبة'], location: ['Location', 'الموقع'], customer: ['Customer', 'العميل'], asof: ['Current balance date', 'تاريخ الرصيد الحالي'], all: ['All', 'الكل'],
 t_overview: ['Overview', 'نظرة عامة'], t_aging: ['Customer Aging', 'أعمار ديون العملاء'], t_invoices: ['Open Invoices', 'الفواتير المفتوحة'], t_limits: ['Credit Limits', 'حدود الائتمان'], t_coll: ['Collections', 'التحصيلات'],
 k_out: ['Total Outstanding', 'إجمالي المستحق'], k_nd: ['Not Yet Due', 'غير مستحق بعد'], k_od: ['Overdue', 'متأخر'], k_odp: ['Overdue %', 'نسبة المتأخر'], k_90: ['Overdue > 90 days', 'متأخر أكثر من 90 يومًا'],
 k_inv: ['Open Invoices', 'فواتير مفتوحة'], k_cust: ['Customers with Balance', 'عملاء لديهم رصيد'], k_cr: ['Unapplied Credit Notes', 'إشعارات دائنة غير مطبقة'], k_mtd: ['Customer receipts this month — gross', 'متحصلات العملاء هذا الشهر — إجمالي'], k_30: ['Collected Last 30 Days', 'المحصّل آخر 30 يومًا'],
 k_lm: ['Collected Last Month', 'المحصّل الشهر الماضي'], k_rc: ['Receipts This Month', 'عدد السندات هذا الشهر'],
 c_age: ['Aging of Receivables', 'أعمار الذمم المدينة'], c_top: ['Top 10 Customers by Outstanding', 'أعلى 10 عملاء حسب المستحق'], c_comp: ['Outstanding by Company', 'المستحق حسب الشركة'], c_coll: ['Collections – last 6 months', 'التحصيلات – آخر 6 أشهر'],
 b_nd: ['Not yet due', 'غير مستحق'], b_1: ['1–30 days', '1–30 يومًا'], b_2: ['31–60 days', '31–60 يومًا'], b_3: ['61–90 days', '61–90 يومًا'], b_4: ['91–180 days', '91–180 يومًا'], b_5: ['Over 180 days', 'أكثر من 180 يومًا'],
 overdue_all: ['All overdue', 'كل المتأخر'], total: ['Total', 'الإجمالي'], search: ['Search…', 'بحث…'], csv: ['Export CSV', 'تصدير CSV'], exportall: ['Export all (max 5,000)', 'تصدير الكل (حتى 5,000)'], open: ['Open', 'فتح'], close: ['Close', 'إغلاق'],
 page: ['Page', 'صفحة'], of: ['of', 'من'], prev: ['Prev', 'السابق'], next: ['Next', 'التالي'], showing: ['Showing', 'عرض'], loading: ['Loading…', 'جارٍ التحميل…'], empty: ['No records found for the selected filters.', 'لا توجد سجلات للفلاتر المحددة.'],
 err: ['Could not load some data', 'تعذر تحميل بعض البيانات'], inv: ['Invoice', 'الفاتورة'], posting: ['Posting Date', 'تاريخ الفاتورة'], due: ['Due Date', 'تاريخ الاستحقاق'], dover: ['Days Overdue', 'أيام التأخير'], outst: ['Outstanding', 'المستحق'], gt: ['Invoice Total', 'إجمالي الفاتورة'],
 invs: ['Invoices', 'الفواتير'], limit: ['Credit Limit', 'حد الائتمان'], util: ['Utilization', 'نسبة الاستخدام'], status: ['Status', 'الحالة'], overdue: ['Overdue', 'المتأخر'], over: ['Above positive limit — selected company', 'تجاوز حد موجب — الشركة المحددة'], near: ['Near limit (≥80%)', 'قريب من الحد (≥80%)'], okk: ['Within limit', 'ضمن الحد'], nolimit: ['No limit set', 'لا يوجد حد'],
 receipt: ['Receipt', 'السند'], date: ['Date', 'التاريخ'], amount: ['Amount', 'المبلغ'], mode: ['Mode of Payment', 'طريقة الدفع'], ref: ['Reference', 'المرجع'], party: ['Customer', 'العميل'],
 note_l: ['Outstanding = submitted Sales Invoices with a positive outstanding amount. Overdue is measured from the Due Date against the As-of date. Credit limits come from the Customer Credit Limit table. Current balances only; party accounts are restricted to the displayed currency. Collections use company-base receipts. Historical and foreign-currency ageing: native Accounts Receivable report.', 'المستحق = فواتير مبيعات معتمدة برصيد موجب. التأخير يُحسب من تاريخ الاستحقاق مقابل تاريخ "كما في". حدود الائتمان من جدول حد ائتمان العميل. المبالغ كما هي مخزنة (بعملة الشركة).'],
 note_c: ['Collections use submitted Payment Entries of type Receive (Division filter does not apply to them).', 'التحصيلات من سندات الدفع المعتمدة من نوع Receive (فلتر القسم لا ينطبق عليها).'],
 nolimits: ['No credit limits are defined (or not visible to your user).', 'لا توجد حدود ائتمان معرّفة (أو غير مرئية لمستخدمك).'], openc: ['Open customer', 'فتح العميل'], partial: ['Showing the first rows only – narrow the filters for the full list.', 'عرض الصفوف الأولى فقط – ضيّق الفلاتر لعرض القائمة كاملة.']
};
function t(k) { var v = L[k]; return v ? v[S.lang === 'ar' ? 1 : 0] : k; }
var DISPLAY_CURRENCY=(frappe.boot.sysdefaults||{}).currency||'SAR';
var S = { lang: window.__dmccLang || 'en', tab: 'overview', ts: null, ready: false, epoch: 0, bucket: 'od', f: { company: '', division: '', location: '', customer: '', asof: todayStr() } };
var D = {}, OPT = { company: [], division: [], location: [] }, HAS = {};

/* ---------- API layer (queue + cache) ---------- */
var Q = { run: 0, q: [], max: 4 }, CACHE = {};
function pump() { while (Q.run < Q.max && Q.q.length) { (function (j) { Q.run++; j.fn().then(j.ok, j.no).then(function () { Q.run--; pump(); }); })(Q.q.shift()); } }
function api(method, args) {
  var key = method + '|' + JSON.stringify(args);
  if (CACHE[key]) { return CACHE[key]; }
  var p = new Promise(function (ok, no) { Q.q.push({ fn: function () { return new Promise(function (res, rej) { frappe.call({ method: method, args: JSON.parse(JSON.stringify(args)), silent: true, callback: function (r) { res(r ? r.message : null); }, error: function (e) { rej(e || new Error('api')); } }); }); }, ok: ok, no: no }); pump(); });
  CACHE[key] = p; p.catch(function () { if (CACHE[key] === p) { delete CACHE[key]; } }); return p;
}
function gcount(dt, f) { if(dt==='Sales Invoice')f=(f||[]).concat([['party_account_currency','=',DISPLAY_CURRENCY]]);return api('frappe.client.get_count', { doctype: dt, filters: f || [] }); }
function glist(dt, o) {
 if(dt==='Sales Invoice')o=Object.assign({},o,{filters:(o.filters||[]).concat([['party_account_currency','=',DISPLAY_CURRENCY]])});
 var a = { doctype: dt, fields: o.fields, filters: o.filters || [], limit_start: o.start || 0, limit_page_length: o.limit || 20 }; ['order_by', 'group_by', 'or_filters', 'parent'].forEach(function (k) { if (o[k]) { a[k] = o[k]; } }); return api('frappe.client.get_list', a); }
function loadMeta(dt) { return new Promise(function (res) { var to = setTimeout(res, 15000); try { frappe.model.with_doctype(dt, function () { try { var f = {}; frappe.get_meta(dt).fields.forEach(function (x) { f[x.fieldname] = 1; }); HAS[dt] = f; } catch (e) { } clearTimeout(to); res(); }); } catch (e) { clearTimeout(to); res(); } }); }
function has(dt, f) { return !!(HAS[dt] && HAS[dt][f]); }

/* ---------- filters & aging buckets ---------- */
var SI = 'Sales Invoice', PE = 'Payment Entry';
var BK = [{ id: 'nd', k: 'b_nd', c: '#16a34a' }, { id: 'b1', k: 'b_1', lo: 1, hi: 30, c: '#3b82f6' }, { id: 'b2', k: 'b_2', lo: 31, hi: 60, c: '#0ea5e9' }, { id: 'b3', k: 'b_3', lo: 61, hi: 90, c: '#d97706' }, { id: 'b4', k: 'b_4', lo: 91, hi: 180, c: '#ea580c' }, { id: 'b5', k: 'b_5', lo: 181, c: '#dc2626' }];
function bFilter(b) {
  var a = todayStr();
  if (b.id === 'nd') { return [[SI, 'due_date', '>=', a]]; }
  if (b.id === 'od') { return [[SI, 'due_date', '<', a]]; }
  if (!b.hi) { return [[SI, 'due_date', '<', addDays(a, -(b.lo - 1))]]; }
  return [[SI, 'due_date', 'between', [addDays(a, -b.hi), addDays(a, -b.lo)]]];
}
function siBase() {
  var q = S.f, f = [[SI, 'docstatus', '=', 1], [SI, 'outstanding_amount', '>', 0], [SI, 'posting_date', '<=', todayStr()]];
  if (q.company) { f.push([SI, 'company', '=', q.company]); }
  if (q.division && has(SI, 'custom_division')) { f.push([SI, 'custom_division', '=', q.division]); }
  if (q.location && has(SI, 'location')) { f.push([SI, 'location', '=', q.location]); }
  if (q.customer) { f.push([SI, 'customer_name', 'like', '%' + q.customer + '%']); }
  return f;
}
function peBase() {
  var q = S.f, f = [[PE, 'docstatus', '=', 1], [PE, 'payment_type', '=', 'Receive'], [PE,'party_type','=','Customer']];
  if (q.company) { f.push([PE, 'company', '=', q.company]); }
  if (q.location && has(PE, 'location')) { f.push([PE, 'location', '=', q.location]); }
  if (q.customer) { f.push([PE, 'party_name', 'like', '%' + q.customer + '%']); }
  return f;
}

/* ---------- data loaders ---------- */
function sumOf(r) { return r && r[0] ? (r[0].amt || 0) : 0; }
function sched() { clearTimeout(sched.t); sched.t = setTimeout(renderBody, 150); }
function loadAging() {
  if (D.agP) { return D.agP; }
  D.agP = Promise.all(BK.map(function (b) {
    return glist(SI, { fields: ['customer', 'customer_name', 'sum(outstanding_amount) as amt', 'count(name) as n'], filters: siBase().concat(bFilter(b)), group_by: 'customer, customer_name', limit: 5000 }).then(function (r) { return r || []; });
  })).then(function (res) {
    var m = {}, tot = {}, cnt = 0;
    res.forEach(function (rows, i) { var b = BK[i]; tot[b.id] = 0; rows.forEach(function (x) { var c = m[x.customer] || (m[x.customer] = { customer: x.customer, name: x.customer_name || x.customer, b: {}, total: 0, n: 0 }); c.b[b.id] = (c.b[b.id] || 0) + x.amt; c.total += x.amt; c.n += x.n; tot[b.id] += x.amt; cnt += x.n; }); });
    D.ag = { cust: Object.keys(m).map(function (k) { return m[k]; }), tot: tot, count: cnt, truncated: res.some(function (r) { return r.length >= 5000; }) };
    sched();
  }).catch(function () { D.ag = { err: 1, cust: [], tot: {}, count: 0 }; sched(); });
  return D.agP;
}
function loadMisc() {
  if (D.miscP) { return D.miscP; }
  var a = S.f.asof, td = todayStr(), ms = monthStart(td, 0);
  var sumPE = function (from, to) { return glist(PE, { fields: ['sum(base_received_amount) as amt', 'count(name) as n'], filters: peBase().concat([[PE, 'posting_date', 'between', [from, to]]]), limit: 1 }).then(function (r) { return { amt: r && r[0] ? r[0].amt || 0 : 0, n: r && r[0] ? r[0].n || 0 : 0 }; }).catch(function () { return null; }); };
  var months = []; for (var i = 5; i >= 0; i--) { months.push({ from: monthStart(td, i), to: i === 0 ? td : monthEnd(td, i), lab: monthStart(td, i).slice(0, 7) }); }
  D.miscP = Promise.all([
    glist(SI, { fields: ['sum(outstanding_amount) as amt', 'count(name) as n'], filters: [[SI, 'docstatus', '=', 1], [SI, 'outstanding_amount', '<', 0]].concat(siBase().slice(2)), limit: 1 }).catch(function () { return null; }),
    glist(SI, { fields: ['company', 'sum(outstanding_amount) as amt'], filters: siBase(), group_by: 'company', limit: 50 }).catch(function () { return null; }),
    sumPE(ms, td), sumPE(addDays(td, -29), td), sumPE(monthStart(td, 1), monthEnd(td, 1))
  ].concat(months.map(function (m) { return sumPE(m.from, m.to); }))).then(function (r) {
    D.misc = { credits: r[0] ? Math.abs(sumOf(r[0])) : null, byCompany: r[1] || [], mtd: r[2], d30: r[3], lm: r[4], months: months.map(function (m, i) { return { lab: m.lab, v: r[5 + i] ? r[5 + i].amt : 0 }; }) };
    sched();
  }).catch(function () { D.misc = { err: 1, byCompany: [], months: [] }; sched(); });
  return D.miscP;
}
function loadLimits() {
  if (D.limP) { return D.limP; }
  D.limP = glist('Customer Credit Limit', { parent: 'Customer', fields: ['parent', 'company', 'credit_limit'], filters: S.f.company ? [['Customer Credit Limit', 'company', '=', S.f.company]] : [], limit: 5000 }).then(function (r) { D.lim = { rows: r || [] }; sched(); })
    .catch(function () { D.lim = { rows: [], err: 1 }; sched(); });
  return D.limP;
}

/* ---------- charts ---------- */
function donut(items, total) {
  var R = 60, C = 2 * Math.PI * R, cum = 0, s = '<svg viewBox="0 0 170 170" role="img"><g transform="rotate(-90 85 85)">';
  items.forEach(function (i) { var dash = total ? C * i.v / total : 0; s += '<circle cx="85" cy="85" r="' + R + '" fill="none" stroke="' + i.c + '" stroke-width="26" stroke-dasharray="' + dash.toFixed(2) + ' ' + (C - dash).toFixed(2) + '" stroke-dashoffset="' + (-cum).toFixed(2) + '" style="cursor:pointer"' + (i.a ? ' data-act="' + i.a + '" data-v="' + esc(i.v2 || '') + '"' : '') + '><title>' + esc(i.l) + ': ' + fmt(i.v) + '</title></circle>'; cum += dash; });
  s += '</g><text x="85" y="82" text-anchor="middle" font-size="15" font-weight="800" fill="#12408c">' + fmt(total) + '</text><text x="85" y="100" text-anchor="middle" font-size="10" fill="#64748b">' + esc(t('total')) + '</text></svg>';
  return '<div class="cc-donut">' + s + '<div class="cc-lg">' + items.map(function (i) { return '<div' + (i.a ? ' data-act="' + i.a + '" data-v="' + esc(i.v2 || '') + '"' : '') + '><i style="background:' + i.c + '"></i>' + esc(i.l) + '<b>' + fmt(i.v) + '</b></div>'; }).join('') + '</div></div>';
}
function bars(items) {
  var mx = 0; items.forEach(function (i) { mx = Math.max(mx, i.v); }); if (!items.length || !mx) { return '<div class="cc-empty">' + t('empty') + '</div>'; }
  return '<div class="cc-bars">' + items.map(function (i) { return '<div class="cc-br"' + (i.a ? ' data-act="' + i.a + '" data-v="' + esc(i.v2 || '') + '"' : '') + ' title="' + esc(i.l) + '"><span class="n">' + esc(i.l) + '</span><span class="t"><i style="width:' + (i.v / mx * 100).toFixed(2) + '%;background:' + (i.c || '#1d4ed8') + '"></i></span><span class="c">' + fmt(i.v) + '</span></div>'; }).join('') + '</div>';
}
function kpi(label, val, cls, act, v2, sub) { return '<button class="cc-kpi ' + (cls || '') + (act ? '' : ' dis') + '"' + (act ? ' data-act="' + act + '" data-v="' + esc(v2 || '') + '"' : '') + '><div class="l">' + esc(label) + '</div><div class="v">' + (val == null ? '<span class="cc-sp"></span>' : (typeof val === 'string' ? val : fmt(val))) + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</button>'; }
function loadingBlock() { return '<div class="cc-ld"><div class="cc-sp"></div>' + t('loading') + '</div>'; }

/* ---------- table component (client rows or server paging) ---------- */
var TB = {};
function mk(id, cfg) { TB[id] = Object.assign({ id: id, page: 1, size: 20, q: '', rows: [], all: [], total: 0, sort: { k: '', d: 'desc' }, dirty: true, tok: 0 }, cfg); return TB[id]; }
function tshell(id) { var tb = TB[id]; return '<div class="cc-tb"><input class="cc-in" style="max-width:260px" data-tq="' + id + '" placeholder="' + esc(t('search')) + '" value="' + esc(tb.q) + '"><div><button class="cc-btn" data-act="csv" data-v="' + id + '">' + t('csv') + '</button> ' + (tb.exportAll ? '<button class="cc-btn" data-act="csvall" data-v="' + id + '">' + t('exportall') + '</button>' : '') + '</div></div><div data-tbb="' + id + '"></div>'; }
function view(tb) {
  if (tb.mode === 'server') { return tb.rows; }
  var rows = tb.all.slice(), q = (tb.q || '').toLowerCase();
  if (q) { rows = rows.filter(function (r) { return tb.cols.some(function (c) { return c.c && String(c.c(r) == null ? '' : c.c(r)).toLowerCase().indexOf(q) >= 0; }); }); }
  var sc = tb.cols.filter(function (c) { return c.k === tb.sort.k; })[0];
  if (sc && sc.sk) { var d = tb.sort.d === 'asc' ? 1 : -1; rows.sort(function (a, b) { var x = sc.sk(a), y = sc.sk(b); return (x > y ? 1 : x < y ? -1 : 0) * d; }); }
  tb.vt = rows.length; return rows;
}
function draw(id) {
  var tb = TB[id], el = $('[data-tbb="' + id + '"]'); if (!tb || !el) { return; }
  if (tb.mode === 'server' && tb.dirty) {
    tb.dirty = false; tb.loading = true; var tok = ++tb.tok; paint(tb, el);
    tb.loader(tb).then(function (r) { if (tok !== tb.tok) { return; } tb.rows = r.rows; tb.total = r.total; tb.loading = false; tb.err = 0; paint(tb, $('[data-tbb="' + id + '"]')); })
      .catch(function () { if (tok !== tb.tok) { return; } tb.loading = false; tb.err = 1; paint(tb, $('[data-tbb="' + id + '"]')); });
    return;
  }
  paint(tb, el);
}
function paint(tb, el) {
  if (!el) { return; }
  if (tb.loading) { el.innerHTML = loadingBlock(); return; }
  if (tb.err) { el.innerHTML = '<div class="cc-note err">' + t('err') + '</div>'; return; }
  var rows = view(tb), total = tb.mode === 'server' ? tb.total : tb.vt, page = tb.mode === 'server' ? rows : rows.slice((tb.page - 1) * tb.size, tb.page * tb.size);
  var pages = Math.max(1, Math.ceil(total / tb.size)); if (tb.page > pages) { tb.page = pages; }
  if (!page.length) { el.innerHTML = '<div class="cc-empty">' + t('empty') + '</div>'; return; }
  var h = '<div class="cc-tw"><table class="cc-t"><thead><tr>' + tb.cols.map(function (c) {
    var can = tb.mode === 'server' ? !!c.sf : !!c.sk; return '<th class="' + (can ? 's' : '') + (c.num ? ' num' : '') + '"' + (can ? ' data-act="sort" data-v="' + tb.id + '|' + c.k + '"' : '') + '>' + esc(t(c.h)) + (tb.sort.k === c.k ? (tb.sort.d === 'asc' ? ' ▲' : ' ▼') : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
  page.forEach(function (r) { h += '<tr>' + tb.cols.map(function (c) { return '<td' + (c.num ? ' class="num"' : '') + '>' + c.r(r) + '</td>'; }).join('') + '</tr>'; });
  h += '</tbody>' + (tb.foot ? '<tfoot>' + tb.foot(rows) + '</tfoot>' : '') + '</table></div><div class="cc-pg"><span>' + t('showing') + ' ' + fmt((tb.page - 1) * tb.size + 1) + '–' + fmt(Math.min(total, tb.page * tb.size)) + ' ' + t('of') + ' ' + fmt(total) + '</span><span><button class="cc-btn" data-act="pg" data-v="' + tb.id + '|-1"' + (tb.page <= 1 ? ' disabled' : '') + '>' + t('prev') + '</button> ' + t('page') + ' ' + tb.page + ' ' + t('of') + ' ' + pages + ' <button class="cc-btn" data-act="pg" data-v="' + tb.id + '|1"' + (tb.page >= pages ? ' disabled' : '') + '>' + t('next') + '</button></span></div>';
  el.innerHTML = h;
}
function csvCell(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function dl(name, tb, rows) {
  var cols = tb.cols.filter(function (c) { return c.c; }), lines = [cols.map(function (c) { return csvCell(t(c.h)); }).join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return csvCell(c.c(r)); }).join(','); }));
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })); a.download = name + '_' + todayStr() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function toast(m, bad) { var e = document.createElement('div'); e.className = 'cc-toast' + (bad ? ' err' : ''); e.textContent = m; host.appendChild(e); setTimeout(function () { e.remove(); }, 4000); }
function openForm(dt, n) { try { closeModal(); frappe.set_route('Form', dt, n); } catch (e) { window.open(docUrl(dt, n), '_blank'); } }
function lnk(dt, n) { return '<a href="' + docUrl(dt, n) + '" data-act="open" data-v="' + esc(dt) + '|' + esc(n) + '">' + esc(n) + '</a>'; }
function tag(cls, txt) { return '<span class="cc-tag ' + cls + '">' + esc(txt) + '</span>'; }

/* ---------- customer drill-down modal ---------- */
var MD = null;
function closeModal() { MD = null; var m = $('#cc-modal'); if (m) { m.innerHTML = ''; } }
function openCustomer(cust, name) {
  var m = $('#cc-modal'); m.innerHTML = '<div class="cc-ov" data-act="mbg"><div class="cc-md"><div class="cc-mh"><h2>' + esc(name || cust) + '</h2><button class="cc-btn" data-act="mclose">' + t('close') + '</button></div>' + loadingBlock() + '</div></div>'; MD = 1;
  glist(SI, { fields: ['name', 'posting_date', 'due_date', 'outstanding_amount', 'grand_total'], filters: siBase().filter(function (x) { return x[1] !== 'customer_name'; }).concat([[SI, 'customer', '=', cust]]), order_by: 'due_date asc', limit: 300 }).then(function (rows) {
    if (!MD) { return; } rows = rows || []; var a = S.f.asof, tot = sum(rows, function (r) { return r.outstanding_amount; });
    var h = '<div class="cc-mh"><h2>' + esc(name || cust) + ' – ' + fmt(tot) + '</h2><span><button class="cc-btn" data-act="open" data-v="Customer|' + esc(cust) + '">' + t('openc') + '</button> <button class="cc-btn" data-act="mclose">' + t('close') + '</button></span></div>';
    h += rows.length ? '<div class="cc-tw"><table class="cc-t"><thead><tr><th>' + t('inv') + '</th><th>' + t('posting') + '</th><th>' + t('due') + '</th><th class="num">' + t('dover') + '</th><th class="num">' + t('outst') + '</th></tr></thead><tbody>' + rows.map(function (r) { var d = dayDiff(r.due_date, a); return '<tr><td>' + lnk(SI, r.name) + '</td><td>' + esc(r.posting_date) + '</td><td>' + esc(r.due_date) + '</td><td class="num">' + (d > 0 ? tag(d > 90 ? 'bad' : 'warn', d) : '–') + '</td><td class="num">' + fmt(r.outstanding_amount) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="cc-empty">' + t('empty') + '</div>';
    m.innerHTML = '<div class="cc-ov" data-act="mbg"><div class="cc-md">' + h + '</div></div>';
  }).catch(function () { if (MD) { m.innerHTML = '<div class="cc-ov" data-act="mbg"><div class="cc-md"><div class="cc-note err">' + t('err') + '</div></div></div>'; } });
}

/* ---------- tabs ---------- */
function note(txt) { return '<div class="cc-note info">' + txt + '</div>'; }
function tabOverview() {
  loadAging(); loadMisc(); var A = D.ag, M = D.misc, h = note(t('note_l'));
  if (A && A.err) { h += '<div class="cc-note err">' + t('err') + '</div>'; }
  var tot = A ? sum(BK, function (b) { return A.tot[b.id]; }) : null, nd = A ? A.tot.nd : null, od = A ? tot - nd : null, o90 = A ? A.tot.b4 + A.tot.b5 + A.tot.b3 * 0 : null;
  if (A) { o90 = A.tot.b4 + A.tot.b5; var b90 = A.tot.b3; }
  h += '<div class="cc-kpis">' + kpi(t('k_out'), tot, '', 'tab', 'aging') + kpi(t('k_nd'), nd, 'ok', 'bk', 'nd') + kpi(t('k_od'), od, 'bad', 'bk', 'od') + kpi(t('k_odp'), A ? (tot ? (od / tot * 100).toFixed(1) + '%' : '0%') : null, od / (tot || 1) > 0.5 ? 'bad' : 'warn') +
    kpi(t('k_90'), o90, 'bad', 'bk', 'b4') + kpi(t('k_inv'), A ? A.count : null, '', 'tab', 'invoices') + kpi(t('k_cust'), A ? A.cust.length : null, '', 'tab', 'aging') + kpi(t('k_cr'), M ? M.credits : null, 'warn') +
    kpi(t('k_mtd'), M && M.mtd ? M.mtd.amt : (M ? 0 : null), 'ok', 'tab', 'coll') + kpi(t('k_30'), M && M.d30 ? M.d30.amt : (M ? 0 : null), 'ok', 'tab', 'coll') + '</div>';
  var age = A ? donut(BK.map(function (b) { return { l: t(b.k), v: A.tot[b.id], c: b.c, a: 'bk', v2: b.id }; }), tot) : loadingBlock();
  var top = A ? bars(A.cust.slice().sort(function (a, b) { return b.total - a.total; }).slice(0, 10).map(function (c) { return { l: c.name, v: c.total, c: PAL[0], a: 'cust', v2: c.customer + '|' + c.name }; })) : loadingBlock();
  var comp = M ? bars(M.byCompany.map(function (r) { return { l: r.company, v: r.amt, c: PAL[1] }; }).sort(function (a, b) { return b.v - a.v; })) : loadingBlock();
  var col = M ? bars(M.months.map(function (m) { return { l: m.lab, v: m.v, c: '#16a34a' }; })) : loadingBlock();
  return h + '<div class="cc-grid"><div class="cc-card"><h3>' + t('c_age') + '</h3>' + age + '</div><div class="cc-card"><h3>' + t('c_top') + '</h3>' + top + '</div><div class="cc-card"><h3>' + t('c_comp') + '</h3>' + comp + '</div><div class="cc-card"><h3>' + t('c_coll') + '</h3>' + col + '</div></div>';
}
function custCols() {
  var cols = [{ k: 'name', h: 'party', r: function (x) { return '<a data-act="cust" data-v="' + esc(x.customer + '|' + x.name) + '">' + esc(x.name) + '</a>'; }, c: function (x) { return x.name; }, sk: function (x) { return x.name; } }];
  BK.forEach(function (b) { cols.push({ k: b.id, h: b.k, num: 1, r: function (x) { return x.b[b.id] ? fmt(x.b[b.id]) : '<span style="color:#cbd5e1">–</span>'; }, c: function (x) { return Math.round(x.b[b.id] || 0); }, sk: function (x) { return x.b[b.id] || 0; } }); });
  cols.push({ k: 'total', h: 'total', num: 1, r: function (x) { return '<b>' + fmt(x.total) + '</b>'; }, c: function (x) { return Math.round(x.total); }, sk: function (x) { return x.total; } });
  cols.push({ k: 'n', h: 'invs', num: 1, r: function (x) { return fmt(x.n); }, c: function (x) { return x.n; }, sk: function (x) { return x.n; } });
  return cols;
}
function tabAging() {
  loadAging(); var A = D.ag; if (!A) { return note(t('note_l')) + loadingBlock(); }
  var h = note(t('note_l')) + (A.truncated ? '<div class="cc-note">' + t('partial') + '</div>' : '');
  h += '<div class="cc-card"><div data-tbx="t_aging"></div></div>';
  var sg = JSON.stringify(S.f) + S.lang;
  if (!TB.t_aging || TB.t_aging.sig !== sg) { mk('t_aging', { mode: 'client', cols: custCols(), sort: { k: 'total', d: 'desc' }, size: 25, sig: sg, dirty: false, foot: function () { return '<tr><td>' + t('total') + '</td>' + BK.map(function (b) { return '<td class="num">' + fmt(A.tot[b.id]) + '</td>'; }).join('') + '<td class="num">' + fmt(sum(BK, function (b) { return A.tot[b.id]; })) + '</td><td class="num">' + fmt(A.count) + '</td></tr>'; } }); }
  TB.t_aging.all = A.cust; return h;
}
function tabInvoices() {
  loadAging(); var A = D.ag, h = note(t('note_l')), chips = [{ id: 'od', k: 'overdue_all' }].concat(BK);
  h += '<div class="cc-chips">' + chips.map(function (b) { var n = A ? (b.id === 'od' ? sum(BK.slice(1), function (x) { return A.tot[x.id]; }) : A.tot[b.id]) : null; return '<button class="cc-chip' + (S.bucket === b.id ? ' on' : '') + '" data-act="bk" data-v="' + b.id + '">' + t(b.k) + '<b>' + (n == null ? '…' : fmt(n)) + '</b></button>'; }).join('') + '</div>';
  h += '<div class="cc-card"><div data-tbx="t_inv"></div></div>';
  var sg = S.bucket + JSON.stringify(S.f) + S.lang;
  if (!TB.t_inv || TB.t_inv.sig !== sg) {
    var b = chips.filter(function (x) { return x.id === S.bucket; })[0] || chips[0], fl = function () { return siBase().concat(bFilter(b)); };
    var fields = ['name', 'customer', 'customer_name', 'company', 'posting_date', 'due_date', 'outstanding_amount', 'grand_total'];
    var cols = [{ k: 'name', h: 'inv', sf: 'name', r: function (x) { return lnk(SI, x.name); }, c: function (x) { return x.name; } },
      { k: 'customer_name', h: 'party', sf: 'customer_name', r: function (x) { return '<a data-act="cust" data-v="' + esc(x.customer + '|' + (x.customer_name || x.customer)) + '">' + esc(x.customer_name || x.customer) + '</a>'; }, c: function (x) { return x.customer_name; } },
      { k: 'company', h: 'company', sf: 'company', r: function (x) { return esc(x.company); }, c: function (x) { return x.company; } },
      { k: 'posting_date', h: 'posting', sf: 'posting_date', r: function (x) { return esc(x.posting_date); }, c: function (x) { return x.posting_date; } },
      { k: 'due_date', h: 'due', sf: 'due_date', r: function (x) { return esc(x.due_date); }, c: function (x) { return x.due_date; } },
      { k: 'dover', h: 'dover', num: 1, r: function (x) { var d = dayDiff(x.due_date, S.f.asof); return d > 0 ? tag(d > 90 ? 'bad' : 'warn', d) : tag('ok', '0'); }, c: function (x) { return Math.max(0, dayDiff(x.due_date, S.f.asof)); } },
      { k: 'outstanding_amount', h: 'outst', num: 1, sf: 'outstanding_amount', r: function (x) { return '<b>' + fmt(x.outstanding_amount) + '</b>'; }, c: function (x) { return x.outstanding_amount; } },
      { k: 'grand_total', h: 'gt', num: 1, sf: 'grand_total', r: function (x) { return fmt(x.grand_total); }, c: function (x) { return x.grand_total; } }];
    var load = function (o) { var q = {}; if (o.q) { q.or_filters = [[SI, 'name', 'like', '%' + o.q + '%'], [SI, 'customer_name', 'like', '%' + o.q + '%']]; } return Promise.all([glist(SI, Object.assign({ fields: fields, filters: fl(), order_by: o.order, start: o.start, limit: o.limit }, q)), gcount(SI, fl())]).then(function (x) { return { rows: x[0] || [], total: x[1] || 0 }; }); };
    mk('t_inv', { mode: 'server', cols: cols, sig: sg, sort: { k: 'due_date', d: 'asc', sf: 'due_date' },
      loader: function (tb) { return load({ q: tb.q, order: (tb.sort.sf || 'due_date') + ' ' + tb.sort.d, start: (tb.page - 1) * tb.size, limit: tb.size }); },
      exportAll: function () { var out = [], step = 500; function nx(s) { return load({ order: 'due_date asc', start: s, limit: step }).then(function (r) { out = out.concat(r.rows); return out.length < r.total && out.length < 5000 ? nx(s + step) : out; }); } return nx(0); } });
  }
  return h;
}
function reportReferenceTotal(response,field){
  if(!response||!Array.isArray(response.result))throw new Error('Reference report unavailable');
  var first=response.columns&&response.columns[0];first=first&&first.fieldname;
  return response.result.reduce(function(sum,row){
    if(!row||Array.isArray(row))throw new Error('Unsupported reference report response');
    if(row.is_total_row||row._is_total_row||(first&&String(row[first]||'').trim().toLowerCase()==='total'))return sum;
    if(row[field]===undefined)throw new Error('Reference report field unavailable');
    var value=Number(row[field]);if(!isFinite(value))throw new Error('Invalid reference report value');
    return sum+value;
  },0);
}
function loadSharedReference(){
  if(D.sharedReferenceP)return D.sharedReferenceP;
  D.sharedReferenceP=Promise.all(['Over Credit Limit Customer','Collection Analysis Report'].map(function(name){return api('frappe.desk.query_report.run',{report_name:name,filters:{},ignore_prepared_report:true});})).then(function(r){
    D.sharedReference={over:reportReferenceTotal(r[0],'over_credit_limit_customer_count'),collections:reportReferenceTotal(r[1],'total_collection')};sched();
  }).catch(function(){D.sharedReference={unavailable:true};sched();});
  return D.sharedReferenceP;
}
function sharedReferencePanel(){
  loadSharedReference();var ref=D.sharedReference;
  var heading=S.lang==='ar'?'مرجع الصفحات الأخرى — جميع الشركات':'Cross-page reference — all companies';
  var overLabel=S.lang==='ar'?'تجاوز الحد، بما فيه الحد الصفري':'Over credit limit, including zero limits';
  var collectionLabel=S.lang==='ar'?'تحصيل مندوبي المبيعات — التقرير القديم':'Salesperson collections — legacy adjusted report';
  var basis=S.lang==='ar'?'هذه مراجع عامة ولا تتأثر بمرشحات هذه الصفحة. تقرير التحصيل يستبعد مندوبي مبيعات محددين ويقسم المقبوضات على 1.15؛ لا يمثل إجمالي المقبوضات.':'These are the same report definitions used by the native pages, across all companies. They do not follow this page’s company/division/location filters. The collection report excludes selected salespeople and divides receipts by 1.15; it is not gross customer receipts.';
  if(ref&&ref.unavailable)return note(heading+': '+(S.lang==='ar'?'غير متاح لصلاحيات المستخدم':'unavailable for this user'));
  return '<section class="cc-card"><h3>'+heading+'</h3>'+note(basis)+'<div class="cc-kpis">'+kpi(overLabel,ref?ref.over:null,'bad')+kpi(collectionLabel,ref?ref.collections:null,'')+'</div></section>';
}
function tabLimits() {
  loadAging(); loadLimits(); var A = D.ag, LM = D.lim, h = sharedReferencePanel()+note(t('note_l'));
  if (!A || !LM) { return h + loadingBlock(); }
  if (!LM.rows.length) { return h + '<div class="cc-empty">' + t('nolimits') + '</div>'; }
  var lim = {}; LM.rows.forEach(function (r) { lim[r.parent] = (lim[r.parent] || 0) + (r.credit_limit || 0); });
  var rows = A.cust.map(function (c) { var l = lim[c.customer] || 0, od = c.total - (c.b.nd || 0), u = l ? c.total / l * 100 : null; return { customer: c.customer, name: c.name, limit: l, total: c.total, od: od, util: u, st: !l ? 'nolimit' : u > 100 ? 'over' : u >= 80 ? 'near' : 'okk' }; });
  var cnt = function (s) { return rows.filter(function (r) { return r.st === s; }).length; };
  h += '<div class="cc-kpis">' + kpi(t('over'), cnt('over'), 'bad') + kpi(t('near'), cnt('near'), 'warn') + kpi(t('okk'), cnt('okk'), 'ok') + kpi(t('nolimit'), cnt('nolimit'), '') + '</div><div class="cc-card"><div data-tbx="t_lim"></div></div>';
  var sg = JSON.stringify(S.f) + S.lang;
  if (!TB.t_lim || TB.t_lim.sig !== sg) {
    mk('t_lim', { mode: 'client', sig: sg, dirty: false, size: 25, sort: { k: 'util', d: 'desc' }, cols: [
      { k: 'name', h: 'party', r: function (x) { return '<a data-act="cust" data-v="' + esc(x.customer + '|' + x.name) + '">' + esc(x.name) + '</a>'; }, c: function (x) { return x.name; }, sk: function (x) { return x.name; } },
      { k: 'limit', h: 'limit', num: 1, r: function (x) { return x.limit ? fmt(x.limit) : '–'; }, c: function (x) { return x.limit; }, sk: function (x) { return x.limit; } },
      { k: 'total', h: 'outst', num: 1, r: function (x) { return '<b>' + fmt(x.total) + '</b>'; }, c: function (x) { return Math.round(x.total); }, sk: function (x) { return x.total; } },
      { k: 'od', h: 'overdue', num: 1, r: function (x) { return fmt(x.od); }, c: function (x) { return Math.round(x.od); }, sk: function (x) { return x.od; } },
      { k: 'util', h: 'util', num: 1, r: function (x) { return x.util == null ? '–' : x.util.toFixed(0) + '%'; }, c: function (x) { return x.util == null ? '' : x.util.toFixed(1); }, sk: function (x) { return x.util == null ? -1 : x.util; } },
      { k: 'st', h: 'status', r: function (x) { return tag(x.st === 'over' ? 'bad' : x.st === 'near' ? 'warn' : x.st === 'okk' ? 'ok' : 'na', t(x.st)); }, c: function (x) { return t(x.st); }, sk: function (x) { return x.st; } }] });
  }
  TB.t_lim.all = rows; return h;
}
function tabColl() {
  loadMisc(); var M = D.misc, h = sharedReferencePanel()+note(t('note_c'));
  h += '<div class="cc-kpis">' + kpi(t('k_mtd'), M && M.mtd ? M.mtd.amt : (M ? 0 : null), 'ok') + kpi(t('k_rc'), M && M.mtd ? M.mtd.n : (M ? 0 : null), '') + kpi(t('k_lm'), M && M.lm ? M.lm.amt : (M ? 0 : null), '') + kpi(t('k_30'), M && M.d30 ? M.d30.amt : (M ? 0 : null), 'ok') + '</div><div class="cc-card"><div data-tbx="t_pe"></div></div>';
  var sg = JSON.stringify(S.f) + S.lang;
  if (!TB.t_pe || TB.t_pe.sig !== sg) {
    var fields = ['name', 'party', 'party_name', 'posting_date', 'base_received_amount', 'mode_of_payment', 'reference_no', 'company'].filter(function (f) { return f === 'name' || has(PE, f); });
    var load = function (o) { var q = {}; if (o.q) { q.or_filters = [[PE, 'name', 'like', '%' + o.q + '%'], [PE, 'party_name', 'like', '%' + o.q + '%']]; } return Promise.all([glist(PE, Object.assign({ fields: fields, filters: peBase(), order_by: o.order, start: o.start, limit: o.limit }, q)), gcount(PE, peBase())]).then(function (x) { return { rows: x[0] || [], total: x[1] || 0 }; }); };
    mk('t_pe', { mode: 'server', sig: sg, sort: { k: 'posting_date', d: 'desc', sf: 'posting_date' }, cols: [
      { k: 'name', h: 'receipt', sf: 'name', r: function (x) { return '<a href="' + docUrl(PE, x.name) + '" data-act="open" data-v="Payment Entry|' + esc(x.name) + '">' + esc(x.name) + '</a>'; }, c: function (x) { return x.name; } },
      { k: 'party_name', h: 'party', sf: 'party_name', r: function (x) { return esc(x.party_name || x.party); }, c: function (x) { return x.party_name; } },
      { k: 'posting_date', h: 'date', sf: 'posting_date', r: function (x) { return esc(x.posting_date); }, c: function (x) { return x.posting_date; } },
      { k: 'base_received_amount', h: 'amount', num: 1, sf: 'base_received_amount', r: function (x) { return '<b>' + fmt(x.base_received_amount) + '</b>'; }, c: function (x) { return x.base_received_amount; } },
      { k: 'mode_of_payment', h: 'mode', sf: 'mode_of_payment', r: function (x) { return esc(x.mode_of_payment || ''); }, c: function (x) { return x.mode_of_payment; } },
      { k: 'reference_no', h: 'ref', r: function (x) { return esc(x.reference_no || ''); }, c: function (x) { return x.reference_no; } },
      { k: 'company', h: 'company', sf: 'company', r: function (x) { return esc(x.company || ''); }, c: function (x) { return x.company; } }],
      loader: function (tb) { return load({ q: tb.q, order: (tb.sort.sf || 'posting_date') + ' ' + tb.sort.d, start: (tb.page - 1) * tb.size, limit: tb.size }); },
      exportAll: function () { var out = []; function nx(s) { return load({ order: 'posting_date desc', start: s, limit: 500 }).then(function (r) { out = out.concat(r.rows); return out.length < r.total && out.length < 5000 ? nx(s + 500) : out; }); } return nx(0); } });
  }
  return h;
}
L.company = L.company; L.invs = L.invs; L.company = ['Company', 'الشركة'];

/* ---------- shell, filters, events ---------- */
var TABS = [['overview', 't_overview', tabOverview], ['aging', 't_aging', tabAging], ['invoices', 't_invoices', tabInvoices], ['limits', 't_limits', tabLimits], ['coll', 't_coll', tabColl]];
function opt(v, l, s) { return '<option value="' + esc(v) + '"' + (s ? ' selected' : '') + '>' + esc(l) + '</option>'; }
function drawFilters() {
  var f = S.f, el = $('#cc-fl'); if (!el) { return; }
  function sel(k, lab, list) { return '<div><label>' + t(lab) + '</label><select data-f="' + k + '">' + opt('', t('all'), !f[k]) + list.map(function (x) { return opt(x, x, f[k] === x); }).join('') + '</select></div>'; }
  el.innerHTML = sel('company', 'company', OPT.company) + sel('division', 'division', OPT.division) + sel('location', 'location', OPT.location) +
    '<div><label>' + t('customer') + '</label><input type="search" data-f="customer" value="' + esc(f.customer) + '" placeholder="' + esc(t('search')) + '"></div><div><label>' + t('asof') + '</label><input type="date" data-f="asof" disabled value="' + esc(todayStr()) + '"></div><div><button class="cc-btn" data-act="reset" style="width:100%">' + t('reset') + '</button></div>';
}
function drawTabs() { $('#cc-tabs').innerHTML = TABS.map(function (x) { return '<button class="cc-tab' + (S.tab === x[0] ? ' on' : '') + '" data-act="tab" data-v="' + x[0] + '">' + t(x[1]) + '</button>'; }).join(''); }
function shellHtml() {
  host.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr');
  host.innerHTML = '<div class="cc-hd"><div class="cc-brand"><div class="cc-logo">DM GROUP</div><div><h1>' + esc(t('title')) + '</h1><p>' + esc(t('sub')) + '</p></div></div><div class="cc-hr"><span class="cc-ts" id="cc-ts"></span><button class="cc-btn" data-act="refresh">⟳ ' + t('refresh') + '</button><button class="cc-btn" data-act="lang">' + (S.lang === 'ar' ? 'English' : 'العربية') + '</button></div></div><div class="cc-fl" id="cc-fl"></div><div class="cc-tabs" id="cc-tabs"></div><div class="cc-body" id="cc-body"></div><div id="cc-modal"></div>';
  drawFilters(); drawTabs(); ts();
}
function ts() { var e = $('#cc-ts'); if (e && S.ts) { e.textContent = t('updated') + ': ' + S.ts.toLocaleString('en-GB'); } }
function renderBody() { if(!S.f.company){$('#cc-body').innerHTML='<div class="cc-note">Select one company. Current receivables are limited to '+esc(DISPLAY_CURRENCY)+' party accounts; use the <a href="/app/query-report/Accounts%20Receivable">native Accounts Receivable report</a> for historical or foreign-currency balances.</div>';return;}
  var b = $('#cc-body'); if (!b) { return; } if (!S.ready) { b.innerHTML = loadingBlock(); return; }
  var h; try { h = TABS.filter(function (x) { return x[0] === S.tab; })[0][2](); } catch (e) { h = '<div class="cc-note err">' + esc(t('err')) + ': ' + esc(e && e.message) + '</div>'; if (window.console) { console.error('Credit Controller', e); } }
  b.innerHTML = h; $$('[data-tbx]', b).forEach(function (box) { var id = box.getAttribute('data-tbx'); if (TB[id]) { box.innerHTML = tshell(id); draw(id); } });
}
function resetData() { S.epoch++; CACHE = {}; D = {}; TB = {}; closeModal(); }
function onFilters() { S.f.asof=todayStr(); resetData(); renderBody(); }
host.addEventListener('click', function (ev) {
  var el = ev.target.closest ? ev.target.closest('[data-act]') : null; if (!el || !host.contains(el)) { return; }
  var act = el.getAttribute('data-act'), v = el.getAttribute('data-v') || '';
  if (act === 'mbg' && ev.target !== el) { return; }
  if (act === 'open') { ev.preventDefault(); var p = v.split('|'); if (!p[1] && el.getAttribute('data-name')) { p = [el.getAttribute('data-dt'), el.getAttribute('data-name')]; } openForm(p[0], p.slice(1).join('|')); return; }
  ev.preventDefault();
  if (act === 'tab') { S.tab = v; drawTabs(); renderBody(); }
  else if (act === 'bk') { S.bucket = v; S.tab = 'invoices'; delete TB.t_inv; drawTabs(); renderBody(); }
  else if (act === 'cust') { var c = v.split('|'); openCustomer(c[0], c.slice(1).join('|')); }
  else if (act === 'lang') { S.lang = S.lang === 'ar' ? 'en' : 'ar'; window.__dmccLang = S.lang; TB = {}; shellHtml(); renderBody(); }
  else if (act === 'refresh') { S.ts = new Date(); resetData(); ts(); renderBody(); }
  else if (act === 'reset') { S.f = { company: '', division: '', location: '', customer: '', asof: todayStr() }; drawFilters(); onFilters(); }
  else if (act === 'mclose' || act === 'mbg') { closeModal(); }
  else if (act === 'sort') { var s = v.split('|'), tb = TB[s[0]], col = tb.cols.filter(function (x) { return x.k === s[1]; })[0]; tb.sort = { k: s[1], d: (tb.sort.k === s[1] && tb.sort.d === 'asc') ? 'desc' : 'asc', sf: col.sf }; tb.page = 1; if (tb.mode === 'server') { tb.dirty = true; } draw(tb.id); }
  else if (act === 'pg') { var g = v.split('|'), tb2 = TB[g[0]]; tb2.page += +g[1]; if (tb2.mode === 'server') { tb2.dirty = true; } draw(tb2.id); }
  else if (act === 'csv') { var tb3 = TB[v]; dl(v, tb3, tb3.mode === 'server' ? tb3.rows : view(tb3)); }
  else if (act === 'csvall') { var tb4 = TB[v]; toast(t('loading')); tb4.exportAll().then(function (rows) { dl(v, tb4, rows); }).catch(function () { toast(t('err'), 1); }); }
});
host.addEventListener('change', function (ev) { var k = ev.target.getAttribute && ev.target.getAttribute('data-f'); if (!k) { return; } S.f[k] = ev.target.value; if (k !== 'customer') { onFilters(); } });
var qt = null;
host.addEventListener('input', function (ev) {
  var el = ev.target, k = el.getAttribute && el.getAttribute('data-f'), id = el.getAttribute && el.getAttribute('data-tq');
  if (k === 'customer') { clearTimeout(qt); qt = setTimeout(function () { S.f.customer = el.value; onFilters(); }, 600); return; }
  if (!id || !TB[id]) { return; } clearTimeout(qt); qt = setTimeout(function () { var tb = TB[id]; if (!tb) { return; } tb.q = el.value; tb.page = 1; if (tb.mode === 'server') { tb.dirty = true; } draw(id); }, 350);
});
host.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && MD) { closeModal(); } });

function names(dt) { return glist(dt, { fields: dt==='Company'?['name','default_currency']:['name'], limit: 500, order_by: 'name asc' }).then(function (r) { return (r || []).filter(function(x){return dt!=='Company'||x.default_currency===DISPLAY_CURRENCY;}).map(function (x) { return x.name; }); }).catch(function () { return []; }); }
function init() {
  if (typeof frappe === 'undefined' || !frappe.call) { host.innerHTML = '<div class="cc-note err">Frappe client not available.</div>'; return; }
  shellHtml(); renderBody();
  Promise.all([loadMeta(SI), loadMeta(PE), names('Company'), names('Division'),
    glist(SI, { fields: ['location', 'count(name) as c'], group_by: 'location', filters: [[SI, 'docstatus', '=', 1], [SI, 'outstanding_amount', '>', 0]], limit: 100 }).catch(function () { return []; })]).then(function (r) {
    OPT.company = r[2]; OPT.division = has(SI, 'custom_division') ? r[3] : []; OPT.location = has(SI, 'location') ? (r[4] || []).map(function (x) { return x.location; }).filter(Boolean).sort() : [];
    S.ready = true; S.ts = new Date(); drawFilters(); ts(); renderBody();
  }).catch(function (e) { $('#cc-body').innerHTML = '<div class="cc-note err">' + esc(t('err')) + ': ' + esc(e && (e.message || e)) + '</div>'; });
}
init();
})();

/* ==== DM theme sync v1 · generated by tools/erp/shell/dark_theme.py ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
/* ==== end DM theme sync v1 ==== */
