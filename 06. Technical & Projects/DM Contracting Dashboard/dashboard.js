/* ===== DM Group KSA — DM Contracting Department Dashboard — SCRIPT field · v2 =====
   Moves v1 onto the DM dashboard standard. Read-only: permission-checked get_list (counts, sums, groups and pages)
   on Project, Task, ToDo, Timesheet, Employee, Attendance, Material Request / Purchase Order / Stock Entry lines,
   Delivery Note, Asset, Asset Repair, Vehicle, Sales / Purchase Invoice, Issue, Budget and their parents.
   v1's application layer is kept as it was: the contracting scope (Company "Durar Masagh Contracting Co." OR
   Project.custom_division "Contracting"), every KPI, rule, list, note and translation, the "not available in this ERP"
   statements, and the lazy, permission-checked loading per tab. Only its presentation layer is replaced by the kit
   (cards, panels, lists with search / sort / paging / CSV, charts, filters, tabs, RTL, dark mode). The shared runtime
   between the "DMS kit" markers is generated from tools/erp/kit/dms-kit.js (edit the kit, not the copy). */
(function () {
'use strict';
var R = (typeof root_element !== 'undefined' && root_element) ? root_element : document;

/* Repair only this block's own transient Frappe widget heading. No Workspace record is changed. */
function repairBlockHeading(blockRoot,label){
  if(!blockRoot)return;
  var shadow=blockRoot.getRootNode?blockRoot.getRootNode():blockRoot;
  var host=blockRoot.host||(shadow&&shadow.host);
  var widget=host&&host.closest?host.closest('.custom-block-widget-box'):null;
  var heading=widget&&widget.querySelector('.widget-head .widget-title');
  if(heading&&['','undefined','null'].indexOf(heading.textContent.trim())!==-1){heading.textContent=label;heading.setAttribute('title',label);}
}
repairBlockHeading(R, 'DM Contracting Dashboard');

var DCV = null;
function L(k) { return DCV ? DCV.t(k) : k; }
var APP = {
  key: '__dmsContracting',
  period: false,
  tabs: [{ id: 'ov', en: 'Department Overview', ar: 'نظرة عامة على القسم' }, { id: 'pr', en: 'Projects & Sites', ar: 'المشاريع والمواقع' }, { id: 'wp', en: 'Work Progress', ar: 'تقدم العمل' }, { id: 'mp', en: 'Manpower Management', ar: 'إدارة القوى العاملة' }, { id: 'mt', en: 'Materials & Procurement', ar: 'المواد والمشتريات' }, { id: 'eq', en: 'Equipment & Fleet', ar: 'المعدات والأسطول' }, { id: 'fi', en: 'Finance & Cost Control', ar: 'المالية وضبط التكاليف' }, { id: 'dl', en: 'Delays, Risks & Issues', ar: 'التأخيرات والمخاطر والمشاكل' }, { id: 'rp', en: 'Reports & Analytics', ar: 'التقارير والتحليلات' }, { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }],
  filters: [
    { k: 'company', en: 'Company', ar: 'الشركة', none: ['Contracting scope (default)', 'نطاق المقاولات (افتراضي)'], options: function () { return (DCV && DCV.ctx().companies) || []; } },
    { k: 'department', en: 'Department', ar: 'القسم', options: function () { return (DCV && DCV.ctx().departments) || []; } },
    { k: 'project', en: 'Project (ID / name contains)', ar: 'المشروع (يحتوي على)', type: 'text' },
    { k: 'customer', en: 'Customer (contains)', ar: 'العميل (يحتوي على)', type: 'text' },
    { k: 'supplier', en: 'Supplier (contains)', ar: 'المورد (يحتوي على)', type: 'text' },
    { k: 'employee', en: 'Employee (contains)', ar: 'الموظف (يحتوي على)', type: 'text' },
    { k: 'warehouse', en: 'Warehouse', ar: 'المستودع', options: function () { return (DCV && DCV.ctx().warehouses) || []; } },
    { k: 'from', en: 'Date From', ar: 'من تاريخ', type: 'date' },
    { k: 'to', en: 'Date To', ar: 'إلى تاريخ', type: 'date' },
    { k: 'ds', en: 'Document Status', ar: 'حالة المستند', none: ['All (excl. cancelled)', 'الكل (عدا الملغى)'], options: function () { return [{ v: '0', l: L('st_Draft') }, { v: '1', l: L('st_Submitted') }, { v: '2', l: L('st_Cancelled') }]; } }
  ],
  sources: ['dc'],
  dtLabels: { 'Project': ['Project', 'مشروع'], 'Task': ['Task', 'مهمة'], 'Purchase Order': ['Purchase order', 'أمر شراء'], 'Material Request': ['Material request', 'طلب مواد'], 'Issue': ['Issue', 'مشكلة'], 'Asset Repair': ['Asset repair', 'إصلاح أصل'] },
  title: function () { return L('title'); },
  stamp: function () { return L('subtitle'); },
  filterNote: function () { return L('n_scope'); },
  boot: function () { DCV = makeDC(); F.period = 'custom'; F.from = addMonths(TODAY, -11); F.to = TODAY; return Promise.resolve(); },
  load: function () {
    DCV.reset(); NODES = {};
    run('dc', function () { return DCV.init().then(function () { return DCV.prepare(); }).then(function () { return true; }); });
    run('act', function () { return DCV.ready().then(function () { return DCV.delayRows(); }); });
  },
  onTab: function () { DCV.drillClear(); },
  actions: function () { return actModel(actSpecs(), 'act', actClient()); },
  content: function (x, AM) { return view(x, AM); },
  afterRender: function (c) { mount(c); },
  drill: function () { return null; },
  drill: function (id) { return actDrill(id); },
  onAct: function (a, v) { return onAct(a, v); }
};

  /* ==== DMS kit v1 · generated from tools/erp/kit/dms-kit.js by build_kit.py — edit the kit, not this copy ==== */
  /* Shared runtime for DM dashboards on the standard (toolbar, period, filters, tabs, tables, drill-downs, charts,
     actions pending). Copied into each dashboard.js by tools/erp/kit/build_kit.py; the dashboard defines `APP` before
     this block. Read-only helpers: frappe.client.get_list / frappe.desk.query_report.run under the viewer's permissions. */
  var G = window;
  var ROOT = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
  var HOST = ROOT.querySelector('[data-dms-root]');
  if (!HOST) { return; }
  if (G[APP.key] && typeof G[APP.key].destroy === 'function') { try { G[APP.key].destroy(); } catch (e) { /* ignore */ } }
  var abort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var SIG = abort ? { signal: abort.signal } : false;
  var timers = [], destroyed = false, GEN = 0, BOOTED = false, LOADED = '';
  G[APP.key] = { destroy: function () { destroyed = true; GEN++; if (abort) { abort.abort(); } timers.forEach(clearTimeout); timers = []; } };
  var CFG = Object.assign({ conc: 6, pageSize: 25, modalPage: 15, weekStart: 0 }, APP.cfg || {});
  var CUR = 'SAR';
  try { CUR = (frappe.boot.sysdefaults && frappe.boot.sysdefaults.currency) || 'SAR'; } catch (e) { /* default */ }
  var LANG = 'en';
  try { var sv = G.localStorage.getItem('dms_lang'); if (sv === 'ar' || sv === 'en') { LANG = sv; } } catch (e) { /* storage unavailable */ }
  function tr(en, ar) { return LANG === 'ar' ? ar : en; }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function plain(s, n) { return clean(String(s || '').replace(/<[^>]*>/g, ' ')).slice(0, n || 90); }
  function $(sel) { return HOST.querySelector(sel); }
  function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) { fn(); } }, ms); timers.push(id); return id; }
  function bdi(s) { return '<bdi>' + esc(s) + '</bdi>'; }
  function num(n) { return (n == null || isNaN(n)) ? '—' : Math.round(n).toLocaleString('en-US'); }
  function money(v) {
    if (v == null || isNaN(v)) { return '—'; }
    var a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1e9) { return s + (a / 1e9).toFixed(2) + 'B'; }
    if (a >= 1e6) { return s + (a / 1e6).toFixed(2) + 'M'; }
    if (a >= 1e4) { return s + (a / 1e3).toFixed(1) + 'K'; }
    return s + Math.round(a).toLocaleString('en-US');
  }
  function amt(v) { return (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function moneyS(v, cur) { return (cur || CUR) + ' ' + money(v); }
  function moneyB(v, cur) { return '<bdi>' + esc(moneyS(v, cur)) + '</bdi>'; }
  function moneyFull(v, cur) { return (v == null || isNaN(v)) ? '' : (cur || CUR) + ' ' + amt(v); }
  function cur$(v, cur) { return '<bdi>' + esc(money(v)) + '<small>' + esc(cur || CUR) + '</small></bdi>'; }
  function pct(n, d, dp) { return (d > 0 && n != null) ? (n / d * 100).toFixed(dp == null ? 1 : dp) + '%' : tr('N/A', 'غير متاح'); }
  function sum(arr, f) { var t = 0; for (var i = 0; i < arr.length; i++) { t += (f ? f(arr[i]) : arr[i]) || 0; } return t; }
  function vals(o) { return Object.keys(o).map(function (k) { return o[k]; }); }
  function uniq(a) { var m = {}; a.forEach(function (x) { if (x) { m[x] = 1; } }); return Object.keys(m).sort(function (x, y) { return x.localeCompare(y); }); }
  function rep(s, n) { var o = ''; for (var i = 0; i < n; i++) { o += s; } return o; }
  function one(r) { return (r && r[0]) || {}; }
  function groupBy(rows, f) { var m = {}; rows.forEach(function (r) { var k = f(r); (m[k] || (m[k] = [])).push(r); }); return m; }
  var NAtxt = function () { return tr('Not assigned', 'غير مُعيَّن'); };

  /* ---------- dates (ERP site time zone, calendar arithmetic) ---------- */
  function siteTz() {
    try {
      if (G.frappe && frappe.boot) {
        if (frappe.boot.time_zone && frappe.boot.time_zone.system) { return frappe.boot.time_zone.system; }
        if (frappe.boot.sysdefaults && frappe.boot.sysdefaults.time_zone) { return frappe.boot.sysdefaults.time_zone; }
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  function siteParts() {
    var tz = siteTz(), o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }, p;
    if (tz) { o.timeZone = tz; }
    try { p = new Intl.DateTimeFormat('en-CA', o).formatToParts(new Date()); } catch (e) { delete o.timeZone; p = new Intl.DateTimeFormat('en-CA', o).formatToParts(new Date()); }
    var m = {}; p.forEach(function (x) { m[x.type] = x.value; }); if (m.hour === '24') { m.hour = '00'; } return m;
  }
  function parseISO(s) {
    if (!s || typeof s !== 'string') { return null; }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (!m) { return null; }
    var y = +m[1], mo = +m[2], d = +m[3], ms = Date.UTC(y, mo - 1, d), dt = new Date(ms);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) { return null; }
    return ms;
  }
  function isoOf(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
  function addDays(iso, n) { return isoOf(parseISO(iso) + n * 86400000); }
  function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  var TODAY = '', STAMP = '';
  function setToday() { var p = siteParts(); TODAY = p.year + '-' + p.month + '-' + p.day; STAMP = p.hour + ':' + p.minute; }
  function monthStart(iso) { return iso.slice(0, 8) + '01'; }
  function monthEnd(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return isoOf(Date.UTC(y, m, 0)); }
  function addMonths(iso, n) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n; return isoOf(Date.UTC(y, m, 1)); }
  function weekStartOf(iso) { var dow = new Date(parseISO(iso)).getUTCDay(); return addDays(iso, -((dow - CFG.weekStart + 7) % 7)); }
  function quarterStart(iso) { var m = +iso.slice(5, 7); return iso.slice(0, 5) + ('0' + (Math.floor((m - 1) / 3) * 3 + 1)).slice(-2) + '-01'; }
  function shiftMonths(iso, n) {
    var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n, d = +iso.slice(8, 10), last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return isoOf(Date.UTC(y, m, Math.min(d, last)));
  }
  function periodRange(key, cf, ct) {
    var t = TODAY, y = t.slice(0, 4), ws = weekStartOf(t), qs = quarterStart(t), lm = addMonths(monthStart(t), -1);
    switch (key) {
      case 'today': return [t, t];
      case 'yesterday': return [addDays(t, -1), addDays(t, -1)];
      case 'week': return [ws, addDays(ws, 6)];
      case 'lastWeek': return [addDays(ws, -7), addDays(ws, -1)];
      case 'month': return [monthStart(t), monthEnd(t)];
      case 'lastMonth': return [lm, monthEnd(lm)];
      case 'quarter': return [qs, monthEnd(addMonths(qs, 2))];
      case 'year': return [y + '-01-01', y + '-12-31'];
      case 'prevYear': return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
      case 'custom': return [cf, ct];
      default: return [y + '-01-01', t];   // ytd
    }
  }
  /* Comparison window: the same span one preset unit earlier; custom ranges compare with the equally long range before. */
  function prevRange(key, from, to) {
    switch (key) {
      case 'today': case 'yesterday': return [addDays(from, -1), addDays(to, -1)];
      case 'week': case 'lastWeek': return [addDays(from, -7), addDays(to, -7)];
      case 'month': case 'lastMonth': return [shiftMonths(from, -1), shiftMonths(to, -1)];
      case 'quarter': return [shiftMonths(from, -3), shiftMonths(to, -3)];
      case 'ytd': case 'year': case 'prevYear': return [shiftMonths(from, -12), shiftMonths(to, -12)];
      default: var n = diffDays(from, to) + 1; return [addDays(from, -n), addDays(from, -1)];
    }
  }
  /* In-progress periods stop at today, so this month to date compares with the same days of last month. */
  function clip(r) { return [r[0], r[1] > TODAY && r[0] <= TODAY ? TODAY : r[1]]; }
  function cmpRanges() { var c = clip(PERIOD); return { cur: c, prev: prevRange(F.period, c[0], c[1]) }; }
  function monthList(from, to) { var out = [], cur = monthStart(from); for (var i = 0; i < 72 && cur <= to; i++) { out.push(cur.slice(0, 7)); cur = addMonths(cur, 1); } return out; }
  function locale() { return LANG === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB'; }
  function fmtDate(iso, yr) {
    try { var o = { day: 'numeric', month: 'short', timeZone: 'UTC' }; if (yr) { o.year = 'numeric'; } return new Intl.DateTimeFormat(locale(), o).format(new Date(parseISO(String(iso).slice(0, 10)))); } catch (e) { return iso; }
  }
  function rangeLabel(r) {
    if (!r || !r[0] || !r[1]) { return ''; }
    return r[0] === r[1] ? fmtDate(r[0], true) : fmtDate(r[0], r[0].slice(0, 4) !== r[1].slice(0, 4)) + ' – ' + fmtDate(r[1], true);
  }
  var PLR = null;
  function daysTxt(n) {
    if (LANG !== 'ar') { return num(n) + (n === 1 ? ' day' : ' days'); }
    var c = 'other'; try { c = (PLR || (PLR = new Intl.PluralRules('ar'))).select(n); } catch (e) { /* generic form */ }
    return c === 'one' ? 'يوم واحد' : c === 'two' ? 'يومان' : c === 'few' ? n + ' أيام' : c === 'many' ? n + ' يومًا' : n + ' يوم';
  }
  function ageOf(iso) { var d = iso ? diffDays(String(iso).slice(0, 10), TODAY) : 0; return isNaN(d) ? 0 : Math.max(0, d); }
  function lateTxt(iso) {
    var d = diffDays(String(iso).slice(0, 10), TODAY); if (isNaN(d)) { return ''; }
    return d > 0 ? tr(daysTxt(d) + ' overdue', 'متأخر ' + daysTxt(d)) : d === 0 ? tr('Due today', 'مستحق اليوم') : tr('Due in ' + daysTxt(-d), 'مستحق خلال ' + daysTxt(-d));
  }
  function agoTxt(iso, en, ar) { var a = ageOf(iso); return a ? tr((en || 'Waiting') + ' ' + daysTxt(a), (ar || 'منذ') + ' ' + daysTxt(a)) : tr('Today', 'اليوم'); }

  /* ---------- ERP read-only API layer (bounded concurrency, one retry, cancellation) ---------- */
  var REQ_TIMEOUT = 180000;
  function callRaw(method, args) {
    return new Promise(function (resolve, reject) {
      var done = false, ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () { if (done) { return; } done = true; if (ctl) { try { ctl.abort(); } catch (x) { /* ignore */ } } var te = new Error('Request timed out'); te.timeout = true; reject(te); }, REQ_TIMEOUT);
      var body = new URLSearchParams();
      Object.keys(args || {}).forEach(function (k) { var v = args[k]; if (v === undefined || v === null) { return; } body.append(k, (typeof v === 'object') ? JSON.stringify(v) : String(v)); });
      fetch('/api/method/' + method, { method: 'POST', credentials: 'same-origin', signal: ctl ? ctl.signal : undefined,
        headers: { 'X-Frappe-CSRF-Token': (G.frappe && frappe.csrf_token) || '', 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() })
        .then(function (r) { return r.text().then(function (txt) { return { r: r, txt: txt }; }); })
        .then(function (o) {
          if (done) { return; } done = true; clearTimeout(timer);
          var j = null; try { j = JSON.parse(o.txt); } catch (x) { /* ignore */ }
          if (o.r.ok && j && !j.exc) { resolve(j.message === undefined ? null : j.message); return; }
          var ex = String((j && (j.exception || j.exc_type)) || '');
          var perm = o.r.status === 401 || o.r.status === 403 || /permission/i.test(ex);
          var e = new Error((perm ? 'No access to ' + ((args && (args.doctype || args.report_name)) || method) : (ex.split(':').slice(-1)[0].trim() || ('HTTP ' + o.r.status))));
          e.status = perm ? 403 : o.r.status; reject(e);
        })
        .catch(function (err) { if (done) { return; } done = true; clearTimeout(timer); reject(err || new Error('request failed')); });
    });
  }
  var PEND = {}, pendN = 0, PEND_T = null;
  function pendTick() {
    if (destroyed || !Object.keys(PEND).length) { PEND_T = null; return; }
    var s = $('[data-ref="stamp"]'); if (s) { s.textContent = stampText(busy()); }
    PEND_T = later(pendTick, 1000);
  }
  function callP(method, args) {
    var id = ++pendN, t0 = Date.now(); PEND[id] = { m: method, t0: t0 };
    if (!PEND_T) { PEND_T = later(pendTick, 1000); }
    function fin(tag) { delete PEND[id]; try { console.info('[' + APP.key + '] ' + method + ' ' + tag + ' ' + ((Date.now() - t0) / 1000).toFixed(1) + 's'); } catch (x) { /* ignore */ } }
    return callRaw(method, args).then(function (r) { fin('ok'); return r; }, function (e) { fin(e && e.timeout ? 'TIMEOUT' : 'FAILED' + (e && e.status ? ' ' + e.status : '')); if (e && typeof e === 'object') { e.method = method; } throw e; });
  }
  var active = 0, queue = [];
  function pump() {
    while (active < CFG.conc && queue.length) {
      var j = queue.shift(); active++;
      j.fn().then(j.res, j.rej).then(function () { active--; pump(); });
    }
  }
  function limited(fn) { return new Promise(function (res, rej) { queue.push({ fn: fn, res: res, rej: rej }); pump(); }); }
  function guarded(chk, method, args) {
    return limited(function () {
      if (destroyed || (chk && !chk())) { return Promise.resolve(null); }
      return callP(method, args).catch(function (e) { if (e && (e.status === 403 || e.timeout || e.status === 417 || e.status >= 500)) { throw e; } return new Promise(function (r) { setTimeout(r, 400); }).then(function () { return callP(method, args); }); });
    });
  }
  function errKind(e) {
    if (e && e.timeout) { return 'timeout'; }
    var txt = ''; try { txt = (e && (e.responseText || e.statusText || e.message)) || ''; } catch (x) { /* ignore */ }
    return (/PermissionError|not permitted|No access|403/i.test(String(txt)) || (e && e.status === 403)) ? 'perm' : 'tech';
  }
  function getList(args, chk) { return guarded(chk, 'frappe.client.get_list', args); }
  function getCount(dt, filters, chk) { return getList({ doctype: dt, fields: ['count(name) as n'], filters: filters || [], limit_page_length: 1 }, chk).then(function (r) { return +one(r).n || 0; }); }
  /* All rows of a bounded list (paged); rejects with e.tooLarge when the source exceeds `cap`. */
  function fetchAll(args, chk, cap) {
    cap = cap || 20000;
    return getCount(args.doctype, args.filters, chk).then(function (n) {
      if (n > cap) { var e = new Error('too large'); e.tooLarge = n; throw e; }
      var jobs = []; for (var i = 0; i < Math.ceil(n / 500); i++) { jobs.push(getList(Object.assign({}, args, { order_by: args.order_by || 'name asc', limit_start: i * 500, limit_page_length: 500 }), chk)); }
      return Promise.all(jobs).then(function (res) { var out = []; res.forEach(function (r) { if (r) { out = out.concat(r); } }); return out; });
    });
  }
  function docUrl(dt, name) {
    try { if (G.frappe && frappe.utils && frappe.utils.get_form_link) { return frappe.utils.get_form_link(dt, name); } } catch (e) { /* fall through */ }
    return '/app/' + dt.toLowerCase().replace(/ /g, '-') + '/' + encodeURIComponent(name);
  }
  function docLink(dt, name, label) { return '<a class="dms-link" href="' + esc(docUrl(dt, name)) + '" target="_blank" rel="noopener noreferrer"><bdi>' + esc(label || name) + '</bdi> ↗</a>'; }

  /* ---------- data store: each source loads and renders independently; stale generations are dropped ---------- */
  var D = {};
  var softT = null;
  function soon() { if (softT) { return; } softT = later(function () { softT = null; renderSoft(); }, 40); }
  function run(key, fn) {
    var g = GEN, chk = function () { return g === GEN && !destroyed; }, tok = {};
    D[key] = null; D[key + 'Err'] = null; D[key + 'Tok'] = tok;
    var mine = function () { return chk() && D[key + 'Tok'] === tok; };
    fn(mine).then(function (v) { if (!mine()) { return; } D[key] = v; if (APP.afterLoad) { APP.afterLoad(key); } soon(); },
      function (e) { if (!mine()) { return; } D[key + 'Err'] = e && e.tooLarge ? 'large:' + e.tooLarge : errKind(e); if (G.console && e && !e.status && !e.tooLarge) { console.error(APP.key, key, e); } soon(); });
  }
  function busy() { return !BOOTED || (APP.sources || []).some(function (k) { return D[k] == null && D[k + 'Err'] == null; }) || Object.keys(D).some(function (k) { return /Stale$/.test(k) && D[k] && D[k].live; }); }
  function errText(kind) { return /^large:/.test(String(kind)) ? tr('too many records (' + num(+String(kind).slice(6)) + ') — narrow the filters or period', 'عدد كبير من السجلات (' + num(+String(kind).slice(6)) + ') — ضيّق المرشحات أو الفترة') : kind === 'timeout' ? tr('the server did not answer within ' + Math.round(REQ_TIMEOUT / 1000) + 's — the Server Script is too slow or the request was cut off (see the browser console for timings)', 'لم يرد الخادم خلال ' + Math.round(REQ_TIMEOUT / 1000) + ' ثانية — السكربت بطيء أو تم قطع الطلب (راجع وحدة تحكم المتصفح)') : kind === 'perm' ? tr('permission denied for your user', 'لا تملك صلاحية القراءة') : tr('technical error while reading', 'خطأ تقني أثناء القراءة'); }

  /* ---------- UI primitives ---------- */
  var ICO = {
    refresh: '<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/>', filter: '<path d="M4 5h16l-6.2 7.6V19l-3.6 1.6v-8z"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>', down: '<path d="m6 9 6 6 6-6"/>',
    prev: '<path d="m15 6-6 6 6 6"/>', next: '<path d="m9 6 6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    up: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>', dn: '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>', dl: '<path d="M12 4v11M7 10.5 12 15.5l5-5M5 20h14"/>'
  };
  function ico(n, cls) { return '<svg class="dms-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICO[n] + '</svg>'; }
  function kpi(o) {
    var inner = '<span class="dms-kpi-h"><span class="dms-kpi-l">' + (o.dot ? '<i class="dms-dot" style="--dms-c:' + o.dot + '"></i>' : '') + esc(o.label) + '</span>' + (o.top || '') + '</span>' +
      '<span class="dms-kpi-n">' + o.val + '</span>' + (o.sub ? '<span class="dms-kpi-s">' + o.sub + '</span>' : '') + (o.foot != null ? '<span class="dms-kpi-f">' + o.foot + '</span>' : '');
    var t = o.tip ? ' title="' + esc(o.tip) + '"' : '';
    return o.act ? '<button type="button" class="dms-kpi" data-act="kpi" data-v="' + esc(o.act) + '"' + t + '>' + inner + '</button>' : '<div class="dms-kpi"' + t + '>' + inner + '</div>';
  }
  function kpis(list, ov) { return '<div class="dms-grid dms-kpis' + (ov ? ' dms-ov-kpis' : '') + '">' + list.join('') + '</div>'; }
  function tagc(txt) { return '<span class="dms-tag">' + txt + '</span>'; }
  function stat(k, txt) { return '<span class="dms-stat dms-stat-' + k + '">' + esc(txt) + '</span>'; }
  function ctx(html) { return '<span class="dms-kpi-ctx">' + html + '</span>'; }
  function badge(txt, color) { return '<span class="dms-badge" style="--dms-c:' + color + '">' + esc(txt) + '</span>'; }
  function wait() { return '<span class="dms-sm">' + esc(tr('Calculating…', 'جارٍ الحساب…')) + '</span>'; }
  function asOf() { return tagc(esc(tr('As of today', 'حتى اليوم'))); }
  /* Value of a source-backed KPI: '…' while loading, '—' when the source failed (never a false zero). */
  function kv(key, f) { return D[key + 'Err'] ? '—' : D[key] == null ? '…' : f(D[key]); }
  function ks(key, f) { return D[key + 'Err'] ? esc(tr('Unavailable', 'غير متاح')) : D[key] == null ? wait() : f(D[key]); }
  function spark(vs) {
    var n = vs.length, real = vs.filter(function (v) { return v != null; }), pts = [];
    if (n < 3 || real.length < 3 || !real.some(function (v) { return v > 0; })) { return ''; }
    var max = Math.max.apply(null, real), min = Math.min(0, Math.min.apply(null, real)), rng = (max - min) || 1;
    vs.forEach(function (v, i) { if (v != null) { pts.push([(i / (n - 1) * 100).toFixed(2), (26 - (v - min) / rng * 23).toFixed(2)]); } });
    var line = pts.map(function (p) { return p.join(','); }).join(' L');
    return '<svg class="dms-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="dms-spark-a" d="M' + pts[0][0] + ',28 L' + line + ' L' + pts[pts.length - 1][0] + ',28 Z"/><path class="dms-spark-l" d="M' + line + '"/></svg>';
  }
  /* Change vs the comparison window. fmt formats values; small count bases show "was N" instead of a percentage. */
  function deltaChip(cur, prev, R, fmt, isCount, lowerIsBetter) {
    if (cur == null || prev == null || !R) { return ''; }
    fmt = fmt || moneyS;
    var tip = tr('This period', 'هذه الفترة') + ' (' + rangeLabel(R[0]) + '): ' + fmt(cur) + '\n' + tr('Previous', 'السابقة') + ' (' + rangeLabel(R[1]) + '): ' + fmt(prev);
    var sr = '<span class="dms-sr"> ' + esc(tr('vs previous period', 'مقارنة بالفترة السابقة')) + '</span>';
    if (prev === 0 || (isCount && prev < 5)) { return '<span class="dms-delta dms-flat" data-tip="' + esc(tip) + '">' + esc(tr('was', 'كان')) + ' <bdi>' + esc(fmt(prev)) + '</bdi>' + sr + '</span>'; }
    var p = (cur - prev) / prev * 100, a = Math.abs(p), k = a < 0.05 ? 'flat' : p > 0 ? 'up' : 'down', tone = k === 'flat' ? 'flat' : ((k === 'up') !== !!lowerIsBetter ? 'up' : 'down');
    var txt = a > 999 ? '10×+' : (a < 10 ? a.toFixed(1) : Math.round(a)) + '%';
    return '<span class="dms-delta dms-' + tone + '" data-tip="' + esc(tip) + '">' + (k === 'flat' ? '' : ico(k === 'up' ? 'up' : 'dn')) + '<bdi>' + (k === 'down' ? '−' : '') + txt + '</bdi>' + sr + '</span>';
  }
  function panel(title, body, extra, meta) {
    return '<section class="dms-panelbox ' + (extra || '') + '"><div class="dms-ph"><h3 class="dms-h3">' + esc(title) + '</h3>' + (meta ? '<span class="dms-ph-meta">' + meta + '</span>' : '') + '</div>' + body + '</section>';
  }
  function note(txt) { return '<p class="dms-note">' + txt + '</p>'; }
  function alertBox(kind, html) { return '<div class="dms-alert dms-alert-' + kind + '" role="' + (kind === 'err' ? 'alert' : 'status') + '">' + html + '</div>'; }
  function empty(txt) { return '<div class="dms-empty">' + esc(txt || tr('No data for the current filters.', 'لا توجد بيانات للمرشحات الحالية.')) + '</div>'; }
  function srcErr(kind, what) { return alertBox('err', '<b>' + esc(tr('Source unavailable', 'المصدر غير متاح')) + ':</b> ' + esc(what) + ' — ' + esc(errText(kind)) + ' <button type="button" class="dms-linkbtn" data-act="refresh">' + esc(tr('Retry', 'إعادة المحاولة')) + '</button>'); }
  function skel(n, cls) { return rep('<div class="dms-skel ' + (cls || '') + '"></div>', n); }
  /* Body for a panel backed by source `key`: skeleton while loading, named error on failure, else f(data). */
  function src(key, what, f) { return D[key + 'Err'] ? srcErr(D[key + 'Err'], what) : D[key] == null ? skel(1, 'dms-skel-panel') : f(D[key]); }

  /* ---------- charts (HTML/CSS; hover details via the shared tooltip, data-tip) ---------- */
  function niceMax(v) { if (!(v > 0)) { return 1; } var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function axisFmt(v) { var a = Math.abs(v); return a >= 1e9 ? +(v / 1e9).toFixed(1) + 'B' : a >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? +(v / 1e3).toFixed(1) + 'K' : String(a < 10 ? +v.toFixed(2) : Math.round(v)); }
  function bucketLabel(k, g, short) {
    if (g === 'cat') { return String(k); }
    if (g === 'week' && !short) { return tr('Week of ', 'أسبوع ') + fmtDate(k, true); }
    if (g !== 'month') { return fmtDate(k, !short); }
    try { return new Intl.DateTimeFormat(locale(), { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(parseISO(k + '-01'))); } catch (e) { return k; }
  }
  /* Count charts get whole-number ticks (top is a multiple of 4), so small counts never show 0, 1, 1, 2, 2. */
  function countTop(max, fmt) { var t = niceMax(max); return fmt === num ? Math.max(4, Math.ceil(t / 4) * 4) : t; }
  function granName(g) { return g === 'day' ? tr('by day', 'يوميًا') : g === 'week' ? tr('by week', 'أسبوعيًا') : tr('by month', 'شهريًا'); }
  /* Time buckets for a range: daily up to 45 days, weekly up to 120 days, monthly beyond; stops at today. */
  function buckets(range) {
    var from = range[0], to = clip(range)[1], span = diffDays(from, to) + 1, g = span <= 45 ? 'day' : span <= 120 ? 'week' : 'month', keys = [], cur, i;
    function keyOf(iso) { iso = String(iso).slice(0, 10); return g === 'day' ? iso : g === 'week' ? weekStartOf(iso) : iso.slice(0, 7); }
    if (to < from) { return { keys: [], gran: g, keyOf: keyOf }; }
    if (g === 'month') { keys = monthList(from, to); } else { cur = keyOf(from); for (i = 0; i < 200 && cur <= to; i++) { keys.push(cur); cur = addDays(cur, g === 'day' ? 1 : 7); } }
    return { keys: keys, gran: g, keyOf: keyOf };
  }
  /* Grouped rows (one per date) folded into buckets: rows[dateField], rows[valField]. */
  function series(range, rows, dateF, valF) {
    var B = buckets(range), d = {}; B.keys.forEach(function (k) { d[k] = { v: 0, n: 0 }; });
    (rows || []).forEach(function (r) { var k = B.keyOf(r[dateF]); if (d[k]) { d[k].v += valF ? (+r[valF] || 0) : 1; d[k].n += +r.n || (valF ? 0 : 1); } });
    B.d = d; return B;
  }
  function legend(series) { return '<div class="dms-legend">' + series.map(function (s) { return '<span><i style="--dms-c:' + s.color + '"></i>' + esc(s.label) + '</span>'; }).join('') + '</div>'; }
  /* Column chart. ser = [{label, color, val: function (key) {}}]; fmt formats values (default money). */
  function barChart(keys, gran, ser, fmt, extraTip, emptyTxt) {
    if (!Array.isArray(ser)) { ser = [ser]; }
    fmt = fmt || moneyFull; var max = 0;
    keys.forEach(function (k) { ser.forEach(function (s) { max = Math.max(max, s.val(k) || 0); }); });
    if (!keys.length || !max) { return empty(emptyTxt || tr('Nothing in this range.', 'لا شيء في هذا النطاق.')); }
    var top = countTop(max, fmt), ticks = [0, 0.25, 0.5, 0.75, 1];
    var cols = keys.map(function (k) {
      var tip = bucketLabel(k, gran) + ser.map(function (s) { return '\n' + s.label + ': ' + fmt(s.val(k) || 0); }).join('') + (extraTip ? extraTip(k) : '');
      return '<div class="dms-col" data-tip="' + esc(tip) + '">' + ser.map(function (s) { var v = s.val(k) || 0; return '<i class="dms-bar' + (v ? '' : ' dms-bar-0') + '" style="height:' + (v / top * 100).toFixed(2) + '%;--dms-c:' + s.color + '"></i>'; }).join('') + '</div>';
    }).join('');
    var aria = ser.map(function (s) { return s.label + ': ' + keys.map(function (k) { return bucketLabel(k, gran, true) + ' ' + fmt(s.val(k) || 0); }).join(', '); }).join('; ');
    return '<div class="dms-chart" role="img" aria-label="' + esc(aria) + '"><div class="dms-yaxis" aria-hidden="true">' + ticks.map(function (t) { return '<span style="bottom:' + t * 100 + '%">' + axisFmt(top * t) + '</span>'; }).join('') + '</div>' +
      '<div class="dms-plot">' + ticks.map(function (t) { return '<i class="dms-gl" style="bottom:' + t * 100 + '%"></i>'; }).join('') + '<div class="dms-cols">' + cols + '</div></div><span></span>' +
      '<div class="dms-xaxis" aria-hidden="true">' + keys.map(function (k) { return '<span>' + esc(bucketLabel(k, gran, true)) + '</span>'; }).join('') + '</div></div>' + (ser.length > 1 ? legend(ser) : '');
  }
  /* Line chart for balances (may go negative). ser = [{label, color, val(key), dash?}]; the first series is the main line. */
  function lineChart(keys, gran, ser, fmt) {
    fmt = fmt || moneyFull; var all = [];
    keys.forEach(function (k) { ser.forEach(function (s) { var v = s.val(k); if (v != null) { all.push(v); } }); });
    if (!keys.length || !all.length) { return empty(); }
    var mx = Math.max.apply(null, all), mn = Math.min.apply(null, all), hi = mx > 0 ? niceMax(mx) : 0, lo = mn < 0 ? -niceMax(-mn) : 0;
    if (hi === lo) { hi = lo + 1; }
    var y = function (v) { return (100 - (v - lo) / (hi - lo) * 100).toFixed(2); }, x = function (i) { return (keys.length < 2 ? 50 : i / (keys.length - 1) * 100).toFixed(2); };
    var ticks = [0, 0.25, 0.5, 0.75, 1].map(function (t) { return lo + (hi - lo) * t; });
    var paths = ser.map(function (s) { var pts = keys.map(function (k, i) { var v = s.val(k); return v == null ? null : x(i) + ',' + y(v); }).filter(Boolean); return '<polyline class="dms-line' + (s.dash ? ' dms-line-ref' : '') + '" style="--dms-c:' + s.color + '" points="' + pts.join(' ') + '"/>'; }).join('');
    var zero = lo < 0 ? '<i class="dms-gl dms-gl-0" style="bottom:' + ((0 - lo) / (hi - lo) * 100).toFixed(2) + '%"></i>' : '';
    var hits = keys.map(function (k) { return '<div class="dms-col dms-col-hit" data-tip="' + esc(bucketLabel(k, gran) + ser.map(function (s) { return '\n' + s.label + ': ' + fmt(s.val(k)); }).join('')) + '"></div>'; }).join('');
    var aria = ser[0].label + ': ' + keys.map(function (k) { return bucketLabel(k, gran, true) + ' ' + fmt(ser[0].val(k)); }).join(', ');
    return '<div class="dms-chart" role="img" aria-label="' + esc(aria) + '"><div class="dms-yaxis" aria-hidden="true">' + ticks.map(function (v, i) { return '<span style="bottom:' + i * 25 + '%">' + axisFmt(v) + '</span>'; }).join('') + '</div>' +
      '<div class="dms-plot">' + [0, 25, 50, 75, 100].map(function (b) { return '<i class="dms-gl" style="bottom:' + b + '%"></i>'; }).join('') + zero + '<svg class="dms-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + paths + '</svg><div class="dms-cols">' + hits + '</div></div><span></span>' +
      '<div class="dms-xaxis" aria-hidden="true">' + keys.map(function (k) { return '<span>' + esc(bucketLabel(k, gran, true)) + '</span>'; }).join('') + '</div></div>' + (ser.length > 1 ? legend(ser) : '');
  }
  /* Stacked columns (one bar per key, segments per series). */
  function stackChart(keys, gran, ser, fmt) {
    fmt = fmt || num; var tot = {}, max = 0;
    keys.forEach(function (k) { tot[k] = sum(ser, function (s) { return s.val(k) || 0; }); max = Math.max(max, tot[k]); });
    if (!keys.length || !max) { return empty(); }
    var top = countTop(max, fmt), ticks = [0, 0.25, 0.5, 0.75, 1];
    var cols = keys.map(function (k) {
      var tip = bucketLabel(k, gran) + ser.filter(function (s) { return s.val(k); }).map(function (s) { return '\n' + s.label + ': ' + fmt(s.val(k)); }).join('');
      return '<div class="dms-col" data-tip="' + esc(tip) + '"><span class="dms-stackbar" style="height:' + (tot[k] / top * 100).toFixed(2) + '%">' + ser.map(function (s) { var v = s.val(k) || 0; return v ? '<i style="flex:' + v + ' 0 0;background:' + s.color + '"></i>' : ''; }).join('') + '</span></div>';
    }).join('');
    return '<div class="dms-chart" role="img" aria-label="' + esc(ser.map(function (s) { return s.label; }).join(', ')) + '"><div class="dms-yaxis" aria-hidden="true">' + ticks.map(function (t) { return '<span style="bottom:' + t * 100 + '%">' + axisFmt(top * t) + '</span>'; }).join('') + '</div>' +
      '<div class="dms-plot">' + ticks.map(function (t) { return '<i class="dms-gl" style="bottom:' + t * 100 + '%"></i>'; }).join('') + '<div class="dms-cols">' + cols + '</div></div><span></span>' +
      '<div class="dms-xaxis" aria-hidden="true">' + keys.map(function (k) { return '<span>' + esc(bucketLabel(k, gran, true)) + '</span>'; }).join('') + '</div></div>' + legend(ser);
  }
  function fitChartLabels() {
    HOST.querySelectorAll('.dms-xaxis').forEach(function (axis) {
      var labels = axis.querySelectorAll('span'), widest = 0;
      labels.forEach(function (label) { var range = document.createRange(); range.selectNodeContents(label); widest = Math.max(widest, range.getBoundingClientRect().width); });
      var slots = Math.max(1, Math.min(8, Math.floor(axis.clientWidth / (widest + 16)))), step = Math.max(1, Math.ceil(labels.length / slots));
      labels.forEach(function (label, i) { label.style.visibility = i % step ? 'hidden' : 'visible'; });
    });
  }
  /* Share rows: label · bar · value · %. items = [{label, value, color, act?, tip?}]; ordered=true keeps the given order. */
  function shareList(items, head, fmt, ordered) {
    fmt = fmt || num; var tot = sum(items, function (s) { return s.value; }), rows = items.filter(function (s) { return s.value; });
    if (!ordered) { rows = rows.slice().sort(function (a, b) { return b.value - a.value; }); }
    if (!tot) { return empty(); }
    return (head ? '<div class="dms-share-t">' + head + '</div>' : '') + rows.map(function (s) {
      var tip = s.tip || (s.label + ': ' + fmt(s.value) + ' (' + pct(s.value, tot) + ')');
      var inner = '<span class="dms-share-l"><i class="dms-dot" style="--dms-c:' + s.color + '"></i>' + bdi(s.label) + '</span><span class="dms-share-b"><i style="width:' + (s.value / tot * 100).toFixed(2) + '%;--dms-c:' + s.color + '"></i></span>' +
        '<span class="dms-num">' + esc(fmt(s.value)) + '</span><span class="dms-share-p dms-num">' + pct(s.value, tot, 0) + '</span>';
      return s.act ? '<button type="button" class="dms-share dms-share-btn" data-act="kpi" data-v="' + esc(s.act) + '" data-tip="' + esc(tip) + '">' + inner + '</button>' : '<div class="dms-share" data-tip="' + esc(tip) + '">' + inner + '</div>';
    }).join('');
  }
  /* Ranked horizontal bars: items = [{label, value, color?, act?}]. */
  function hbars(items, fmt, color) {
    if (!items.length) { return empty(); }
    var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); }).concat([1])); fmt = fmt || num;
    return items.map(function (i) {
      var inner = '<span class="dms-split-l">' + bdi(i.label) + '</span><span class="dms-split"><i style="width:' + (Math.abs(i.value) / max * 100).toFixed(2) + '%;background:' + (i.color || color || 'var(--dms-royal)') + '"></i></span><span class="dms-num dms-split-v">' + esc(fmt(i.value)) + '</span>';
      var tip = ' data-tip="' + esc(i.label + ': ' + fmt(i.value)) + '"';
      return i.act ? '<button type="button" class="dms-stack-row dms-split-row" data-act="kpi" data-v="' + esc(i.act) + '"' + tip + '>' + inner + '</button>' : '<div class="dms-stack-row dms-split-row"' + tip + '>' + inner + '</div>';
    }).join('');
  }
  /* Two-part bars ranked by total: items = [{label, total, part, act?}]; parts = [{label, color}] for part and remainder. */
  function splitBars(items, parts, fmt) {
    if (!items.length) { return empty(); }
    fmt = fmt || money; var max = Math.max.apply(null, items.map(function (i) { return i.total; }).concat([1]));
    return items.map(function (i) {
      var tip = i.label + '\n' + parts[0].label + ': ' + fmt(i.part) + '\n' + parts[1].label + ': ' + fmt(i.total - i.part);
      var bar = '<span class="dms-split"><i style="width:' + (i.part / max * 100).toFixed(2) + '%;background:' + parts[0].color + '"></i><i style="width:' + (Math.max(0, i.total - i.part) / max * 100).toFixed(2) + '%;background:' + parts[1].color + '"></i></span>';
      var inner = '<span class="dms-split-l">' + bdi(i.label) + '</span>' + bar + '<span class="dms-num dms-split-v">' + esc(fmt(i.total)) + '</span>';
      return i.act ? '<button type="button" class="dms-stack-row dms-split-row" data-act="kpi" data-v="' + esc(i.act) + '" data-tip="' + esc(tip) + '">' + inner + '</button>' : '<div class="dms-stack-row dms-split-row" data-tip="' + esc(tip) + '">' + inner + '</div>';
    }).join('') + legend(parts);
  }
  function mixBar(segs) {
    var tot = sum(segs, function (s) { return s.value; }); if (!tot) { return ''; }
    return '<span class="dms-mix"><span class="dms-mix-b">' + segs.map(function (s) { return s.value ? '<i style="width:' + (s.value / tot * 100).toFixed(2) + '%;background:' + s.color + '" data-tip="' + esc(s.label + ': ' + (s.fmt || num)(s.value)) + '"></i>' : ''; }).join('') + '</span></span>';
  }
  var PAL = ['var(--dms-royal)', '#6b8be0', '#1f8a5b', '#d97a1e', '#8a97a8', '#a3b4ef', '#c2412d', '#d6a419', '#4b5a6e', '#b6bfca'];

  /* ---------- tables: client-side (search / sort / pagination / PDF) and server-side (paginated, sortable, PDF) ---------- */
  var TBL = {}, TS = {}, SS = {}, focusId = null;
  function regTable(spec) { TBL[spec.id] = spec; return '<div class="dms-tbl" data-tbl="' + esc(spec.id) + '"></div>'; }
  function fillTables(scope) { var els = (scope || HOST).querySelectorAll('[data-tbl]'); for (var i = 0; i < els.length; i++) { fillTable(els[i].getAttribute('data-tbl'), els[i]); } }
  /* Optional column filters: spec.facets = [{k, h, get?(row), opts?: [v | [v, label]] or function}] render as selects
     beside the search box. Client tables filter their rows (options default to the distinct values); server tables
     pass the selected values to spec.loader as a fifth argument {k: v}, or add [dt, field || k, '=', v] filters. */
  function facetVal(f, r) { var v = f.get ? f.get(r) : r[f.k]; return v == null || v === '' ? '(Not set)' : String(v); }
  function facetOpts(sp, f) {
    if (f.opts) { var o = typeof f.opts === 'function' ? f.opts() : f.opts; return (o || []).map(function (x) { return Array.isArray(x) ? [String(x[0]), String(x[1])] : [String(x), String(x)]; }); }
    var m = {}; (sp.rows || []).forEach(function (r) { m[facetVal(f, r)] = 1; });
    return Object.keys(m).sort(function (a, b) { return a.localeCompare(b); }).map(function (v) { return [v, v === '(Not set)' ? tr('(Not set)', '(غير محدد)') : v]; });
  }
  function facetsOn(st) { var fv = st.fv || {}; return Object.keys(fv).some(function (k) { return fv[k]; }); }
  function facetsHTML(id, sp, st) {
    if (!sp.facets || !sp.facets.length) { return ''; }
    var fv = st.fv || {};
    return sp.facets.map(function (f) {
      var opts = facetOpts(sp, f), cur = fv[f.k] || '';
      if (!opts.length && !cur) { return ''; }
      if (cur && !opts.some(function (o) { return o[0] === cur; })) { opts = opts.concat([[cur, cur]]); }
      return '<select class="dms-input dms-facet' + (cur ? ' dms-facet-on' : '') + '" data-tf="' + esc(id) + '" data-tfk="' + esc(f.k) + '" aria-label="' + esc(f.h) + '"><option value="">' + esc(f.all || f.h + ': ' + tr('All', 'الكل')) + '</option>' +
        opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    }).join('');
  }
  function clientRows(sp, st) {
    var rows = sp.rows, q = st.q.trim().toLowerCase(), fv = st.fv || {};
    (sp.facets || []).forEach(function (f) { var v = fv[f.k]; if (v) { rows = rows.filter(function (r) { return facetVal(f, r) === v; }); } });
    if (q) { rows = rows.filter(function (r) { return sp.text(r).toLowerCase().indexOf(q) >= 0; }); }
    if (st.sk) { var col = sp.cols.filter(function (c) { return c.k === st.sk; })[0]; if (col && col.s) { rows = rows.slice().sort(function (a, b) { var x = col.s(a), y = col.s(b); return (x < y ? -1 : x > y ? 1 : 0) * st.dir; }); } }
    return rows;
  }
  function thead(sp, sk, dir, act, id) {
    return '<thead><tr>' + sp.cols.map(function (c) {
      var key = act === 'ssort' ? c.sf : c.k, can = act === 'ssort' ? !!c.sf : !!c.s, on = can && sk === key;
      return '<th class="' + (can ? 'dms-th-s' : '') + (c.num ? ' dms-th-n' : '') + '"' + (can ? ' data-act="' + act + '" data-id="' + esc(id) + '" data-v="' + esc(key) + '" tabindex="0" aria-sort="' + (on ? (dir > 0 ? 'ascending' : 'descending') : 'none') + '"' : '') + '>' + esc(c.h) + (on ? (dir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
    }).join('') + '</tr></thead>';
  }
  function tcells(sp, r) { return '<tr>' + sp.cols.map(function (c) { return '<td' + (c.num ? ' class="dms-td-n"' : '') + '>' + c.r(r) + '</td>'; }).join('') + '</tr>'; }
  function fillTable(id, el) {
    var sp = TBL[id]; el = el || HOST.querySelector('[data-tbl="' + id + '"]'); if (!sp || !el) { return; }
    if (sp.server) { return fillServer(id, el); }
    var st = TS[id] || (TS[id] = { q: '', page: 1, sk: sp.sk || '', dir: sp.dir || 1 }), rows = clientRows(sp, st);
    var ps = sp.pageSize || CFG.pageSize, pages = Math.max(1, Math.ceil(rows.length / ps)); if (st.page > pages) { st.page = pages; }
    var slice = rows.slice((st.page - 1) * ps, st.page * ps);
    var h = '<div class="dms-toolbar"><input type="search" class="dms-input" data-tq="' + esc(id) + '" placeholder="' + esc(tr('Search this table…', 'ابحث في الجدول…')) + '" value="' + esc(st.q) + '" aria-label="' + esc(tr('Search this table', 'ابحث في الجدول')) + '">' + facetsHTML(id, sp, st) + '<span class="dms-tb-r"><span class="dms-sm">' + num(rows.length) + ' ' + esc(rows.length === 1 ? tr('row', 'سجل') : tr('rows', 'سجل')) + (st.q || facetsOn(st) ? ' / ' + num(sp.rows.length) : '') + '</span>' +
      (rows.length ? '<button type="button" class="dms-btn dms-btn-sm" data-act="pdf" data-id="' + esc(id) + '" title="' + esc(tr('PDF on the company letterhead', 'ملف PDF على ترويسة الشركة')) + '">' + ico('dl') + '<span>' + esc(tr('Export PDF', 'تصدير PDF')) + '</span></button>' : '') + '</span></div>';
    if (sp.notice) { h += sp.notice; }
    if (!rows.length) { el.innerHTML = h + '<div class="dms-tablewrap">' + empty(sp.empty) + '</div>'; return restoreFocus(el, id); }
    h += '<div class="dms-tablewrap"><table class="dms-table' + (sp.cols.length <= 3 ? ' dms-table-sm' : '') + '">' + thead(sp, st.sk, st.dir, 'tsort', id) + '<tbody>' + slice.map(function (r) { return tcells(sp, r); }).join('') + '</tbody>' + (sp.foot ? '<tfoot>' + sp.foot(rows) + '</tfoot>' : '') + '</table></div>';
    h += pager(id, 'tpage', st.page, pages, rows.length, ps);
    el.innerHTML = h; restoreFocus(el, id);
  }
  function pager(id, act, pg, pages, total, ps) {
    if (total <= ps) { return ''; }
    return '<div class="dms-pager"><span>' + esc(tr('Showing', 'عرض')) + ' ' + num((pg - 1) * ps + 1) + '–' + num(Math.min(pg * ps, total)) + ' / ' + num(total) + '</span><span><button type="button" class="dms-btn" data-act="' + act + '" data-id="' + esc(id) + '" data-v="-1"' + (pg <= 1 ? ' disabled' : '') + '>‹ ' + esc(tr('Previous', 'السابق')) + '</button> ' +
      esc(tr('Page', 'صفحة')) + ' ' + pg + ' ' + esc(tr('of', 'من')) + ' ' + pages + ' <button type="button" class="dms-btn" data-act="' + act + '" data-id="' + esc(id) + '" data-v="1"' + (pg >= pages ? ' disabled' : '') + '>' + esc(tr('Next', 'التالي')) + ' ›</button></span></div>';
  }
  function restoreFocus(el, id) { if (focusId === id) { var i = el.querySelector('[data-tq]'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { /* ignore */ } } } }
  function srvArgs(sp, st) {
    var q = st.q.trim(), base = { doctype: sp.dt, filters: sp.filters };
    if (sp.parent) { base.parent = sp.parent; }
    if (q && sp.search) { base.or_filters = sp.search.map(function (f) { return [sp.dt, f, 'like', '%' + q + '%']; }); }
    if (sp.facets && !sp.loader) { var fv = st.fv || {}; sp.facets.forEach(function (f) { if (fv[f.k]) { base.filters = (base.filters || []).concat([[sp.dt, f.field || f.k, '=', fv[f.k]]]); } }); }
    return base;
  }
  function srvOrder(sp, st) { return st.sk ? st.sk + (st.dir > 0 ? ' asc' : ' desc') : sp.order; }
  function fillServer(id, el) {
    var sp = TBL[id], st = SS[id] || (SS[id] = { q: '', page: 1, total: null, rows: null, loading: false, err: null, req: 0, sk: '', dir: 1 });
    if (!st.dirty && st.rows && st.key === JSON.stringify(sp.filters)) { return paintServer(id, el); }
    st.dirty = false; st.key = JSON.stringify(sp.filters);
    var req = ++st.req; st.loading = true; st.err = null;
    var ps = sp.pageSize || CFG.modalPage, base = srvArgs(sp, st);
    paintServer(id, el);
    var chk = function () { return !destroyed && SS[id] && SS[id].req === req; };
    if (sp.loader) { sp.loader(st.page - 1, ps, st.q.trim(), srvOrder(sp, st), st.fv || {}).then(function (res) { if (!chk()) { return; } st.total = res.total; st.rows = res.rows || []; st.loading = false; paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); }, function (e) { if (chk()) { st.loading = false; st.err = errKind(e); paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); } }); return; }
    var cnt = getList(Object.assign({}, base, { fields: ['count(name) as n'], limit_page_length: 1 }), chk).then(function (r) { return r ? +one(r).n || 0 : null; });
    var rows = getList(Object.assign({}, base, { fields: sp.fields, order_by: srvOrder(sp, st), limit_start: (st.page - 1) * ps, limit_page_length: ps }), chk);
    Promise.all([cnt, rows]).then(function (res) {
      if (!chk()) { return; } st.total = res[0]; st.rows = res[1] || []; st.loading = false; paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]'));
    }).catch(function (e) { if (chk()) { st.loading = false; st.err = errKind(e); paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); } });
  }
  function paintServer(id, el) {
    if (!el) { return; } var sp = TBL[id], st = SS[id], ps = sp.pageSize || CFG.modalPage;
    var h = '<div class="dms-toolbar"><input type="search" class="dms-input" data-tq="' + esc(id) + '" placeholder="' + esc(sp.searchHint || tr('Search…', 'بحث…')) + '" value="' + esc(st.q) + '" aria-label="' + esc(tr('Search', 'بحث')) + '">' + facetsHTML(id, sp, st) + '<span class="dms-tb-r"><span class="dms-sm">' + (st.total == null ? '' : num(st.total) + ' ' + esc(st.total === 1 ? tr('record', 'سجل') : tr('records', 'سجل'))) + '</span>' +
      (st.total ? '<button type="button" class="dms-btn dms-btn-sm" data-act="pdfall" data-id="' + esc(id) + '" title="' + esc(tr('PDF on the company letterhead, up to 2,000 rows', 'ملف PDF على ترويسة الشركة، حتى 2,000 سجل')) + '">' + ico('dl') + '<span>' + esc(tr('Export PDF', 'تصدير PDF')) + '</span></button>' : '') + '</span></div>';
    if (st.err) { el.innerHTML = h + alertBox('err', esc(st.err === 'perm' ? tr('Permission denied for your user.', 'لا تملك صلاحية القراءة.') : tr('Technical error while reading this list.', 'خطأ تقني أثناء قراءة القائمة.')) + ' <button type="button" class="dms-linkbtn" data-act="sretry" data-id="' + esc(id) + '">' + esc(tr('Retry', 'إعادة المحاولة')) + '</button>'); return restoreFocus(el, id); }
    if (st.loading && !st.rows) { el.innerHTML = h + '<div class="dms-skel"></div>'; return restoreFocus(el, id); }
    if (!st.rows || !st.rows.length) { el.innerHTML = h + '<div class="dms-tablewrap">' + empty(sp.empty) + '</div>'; return restoreFocus(el, id); }
    var pages = Math.max(1, Math.ceil((st.total || 0) / ps));
    h += '<div class="dms-tablewrap" style="opacity:' + (st.loading ? .55 : 1) + '"' + (st.loading ? ' aria-busy="true"' : '') + '><table class="dms-table' + (sp.cols.length <= 3 ? ' dms-table-sm' : '') + '">' + thead(sp, st.sk, st.dir, 'ssort', id) + '<tbody>' + st.rows.map(function (r) { return tcells(sp, r); }).join('') + '</tbody></table></div>' + pager(id, 'spage', st.page, pages, st.total || 0, ps);
    el.innerHTML = h; restoreFocus(el, id);
  }
  /* ---------- PDF export on the DM letterhead (replaces CSV) ----------
     The table is laid out as HTML under the company Letter Head and ERPNext renders it to PDF through
     frappe.utils.print_format.report_to_pdf (the route Desk reports use); the browser saves the file.
     APP.letterHead names another Letter Head; the header and footer come from frappe.boot.letter_heads when Desk has them. */
  var PDF_MAX = 2000, LH_DEF = { name: '2026 DMG - NEW', img: '/files/WhatsApp Image 2026-08-20 at 3.32.18 PM.jpeg', foot: '/files/erp footer.jpeg' };
  function absUrl(h) { var o = G.location.origin; return String(h || '').replace(/(src|href)=(["'])\/(?!\/)/g, '$1=$2' + o + '/'); }
  function letterHead() {
    var b = G.frappe && frappe.boot && frappe.boot.letter_heads, lh = b && b[APP.letterHead || LH_DEF.name];
    var head = lh && lh.header ? lh.header : '<div style="text-align:center"><img src="' + encodeURI(LH_DEF.img) + '" style="max-width:100%"></div>';
    var foot = lh && lh.footer ? lh.footer : '<div style="text-align:center"><img src="' + encodeURI(LH_DEF.foot) + '" style="max-width:100%"></div>';
    return { head: absUrl(head), foot: absUrl(String(foot).replace(/position\s*:\s*fixed;?/gi, '')) };
  }
  function pdfCell(v, isNum) { if (v == null) { return ''; } if (isNum && v !== '' && !isNaN(v)) { return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }); } return String(v); }
  /* o: {title, sub, cols: [{h, c(row), num}], rows, note} or, for a report with several tables, {title, sub, facts: [[label, value]], sections: [{title, cols, rows, empty}], note} */
  function pdfHTML(o) {
    var lh = letterHead(), rtl = LANG === 'ar', st = rtl ? 'right' : 'left';
    return '<!DOCTYPE html><html lang="' + LANG + '" dir="' + (rtl ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><style>' +
      'body{font-family:Arial,"DejaVu Sans","Noto Naskh Arabic",sans-serif;font-size:10px;color:#1b2430;margin:0}.lh img{max-width:100%}' +
      '.t{font-size:15px;font-weight:bold;margin:12px 0 2px;color:#0f2147}.s{color:#5b6678;margin:0 0 10px;font-size:9.5px}' +
      'table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{page-break-inside:avoid}' +
      'th{background:#0f2147;color:#fff;font-weight:bold;text-align:' + st + ';padding:5px 6px;font-size:9.5px}td{padding:4px 6px;border-bottom:1px solid #dde2ea;vertical-align:top;text-align:' + st + '}' +
      'tbody tr:nth-child(even) td{background:#f4f6fa}th.n,td.n{text-align:right;white-space:nowrap}.f{margin-top:16px}.h{font-size:12px;font-weight:bold;color:#0f2147;margin:14px 0 6px}table.kv{width:auto;min-width:50%;margin-bottom:6px}table.kv td{background:none}</style></head><body>' +
      '<div class="lh">' + lh.head + '</div><div class="t">' + esc(o.title) + '</div>' + (o.sub ? '<div class="s">' + esc(o.sub) + '</div>' : '') +
      (o.facts && o.facts.length ? '<table class="kv"><tbody>' + o.facts.map(function (f) { return '<tr><td>' + esc(f[0]) + '</td><td class="n"><b>' + esc(pdfCell(f[1])) + '</b></td></tr>'; }).join('') + '</tbody></table>' : '') +
      (o.sections || [{ cols: o.cols, rows: o.rows }]).map(function (s) {
        return (s.title ? '<div class="h">' + esc(s.title) + '</div>' : '') + (!s.rows.length && s.empty ? '<div class="s">' + esc(s.empty) + '</div>' :
          '<table><thead><tr>' + s.cols.map(function (c) { return '<th' + (c.num ? ' class="n"' : '') + '>' + esc(c.h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          s.rows.map(function (r) { return '<tr>' + s.cols.map(function (c) { return '<td' + (c.num ? ' class="n"' : '') + '>' + esc(pdfCell(c.c(r), c.num)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>');
      }).join('') + (o.note ? '<div class="s" style="margin-top:8px">' + esc(o.note) + '</div>' : '') + '<div class="f">' + lh.foot + '</div></body></html>';
  }
  /* Render o (see pdfHTML) to a PDF through ERPNext and save it as <name>_<today>.pdf. Usable by dashboards for their own reports. */
  function exportPdf(name, o) {
    toast(tr('Preparing PDF…', 'جارٍ تجهيز ملف PDF…'));
    var body = 'html=' + encodeURIComponent(pdfHTML(o)) + '&orientation=' + (o.landscape != null ? (o.landscape ? 'Landscape' : 'Portrait') : Math.max.apply(null, (o.sections || [o]).map(function (s) { return s.cols.length; })) > 6 ? 'Landscape' : 'Portrait');
    return fetch('/api/method/frappe.utils.print_format.report_to_pdf', { method: 'POST', credentials: 'same-origin', body: body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Frappe-CSRF-Token': (G.frappe && frappe.csrf_token) || '', 'Accept': 'application/pdf' } })
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.blob(); })
      .then(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b.type === 'application/pdf' ? b : new Blob([b], { type: 'application/pdf' }));
        a.download = String(name).replace(/[^\w-]+/g, '_') + '_' + TODAY + '.pdf'; HOST.appendChild(a); a.click(); later(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      }, function () { toast(tr('PDF export failed. Try again or narrow the list.', 'تعذر تصدير PDF. أعد المحاولة أو ضيّق القائمة.'), true); });
  }
  /* Title and context line of a table, taken from its panel / dialog and the active filters. */
  function tableTitle(id) {
    var el = HOST.querySelector('[data-tbl="' + id + '"]'), m = el && el.closest('.dms-modal'), p = el && el.closest('.dms-panelbox');
    var h = m ? m.querySelector('#dms-dialog-title') : p ? p.querySelector('.dms-h3') : null; return h ? h.textContent.trim() : '';
  }
  function exportContext(id, st, n, total) {
    var bits = [], app = APP.title ? APP.title() : '';
    if (app && app !== tableTitle(id)) { bits.push(app); }
    if (APP.period !== false && PERIOD[0] && PERIOD[1]) { bits.push(tr('Period', 'الفترة') + ': ' + PERIOD[0] + ' → ' + PERIOD[1]); }
    (APP.filters || []).forEach(function (f) { if (F[f.k]) { bits.push(tr(f.en, f.ar) + ': ' + F[f.k]); } });
    var sp = TBL[id], fv = (st && st.fv) || {}; (sp && sp.facets || []).forEach(function (f) { if (fv[f.k]) { bits.push(f.h + ': ' + fv[f.k]); } });
    if (st && st.q && st.q.trim()) { bits.push(tr('Search', 'بحث') + ': "' + st.q.trim() + '"'); }
    bits.push(num(n) + ' ' + tr('rows', 'سجل') + (total > n ? ' ' + tr('of', 'من') + ' ' + num(total) : ''));
    bits.push(tr('Printed', 'طُبع') + ' ' + TODAY);
    return bits.join(' · ');
  }
  function download(name, sp, rows, id, total) {
    var cols = sp.cols.filter(function (c) { return c.c && c.h; }), st = sp.server ? SS[id] : TS[id], cut = rows.slice(0, PDF_MAX), all = total != null ? total : rows.length;
    exportPdf(name, { title: tableTitle(id) || (APP.title ? APP.title() : name), sub: exportContext(id, st, cut.length, all), cols: cols, rows: cut,
      note: all > cut.length ? tr('Only the first ' + num(cut.length) + ' rows are included. Narrow the filters to print the rest.', 'تم تضمين أول ' + num(cut.length) + ' سجل فقط. ضيّق المرشحات لطباعة الباقي.') : '' });
  }
  function exportServer(id) {
    var sp = TBL[id], st = SS[id], out = [], step = 500, base = srvArgs(sp, st), g = GEN;
    if (sp.loader) { toast(tr('Collecting rows…', 'جارٍ جمع السجلات…')); var acc = [], pg = function (p) { return sp.loader(p, 500, st.q.trim(), srvOrder(sp, st), st.fv || {}).then(function (res) { acc = acc.concat(res.rows || []); return (res.rows || []).length === 500 && acc.length < PDF_MAX ? pg(p + 1) : acc; }); }; pg(0).then(function (rows) { download(sp.file || id, sp, rows, id, st.total); }, function () { toast(tr('Export failed.', 'تعذر التصدير.'), true); }); return; }
    function next(s) {
      return getList(Object.assign({}, base, { fields: sp.fields, order_by: srvOrder(sp, st), limit_start: s, limit_page_length: step }), function () { return g === GEN; }).then(function (r) {
        out = out.concat(r || []); return (r && r.length === step && out.length < PDF_MAX) ? next(s + step) : out;
      });
    }
    toast(tr('Collecting rows…', 'جارٍ جمع السجلات…'));
    next(0).then(function (rows) { download(sp.file || id, sp, rows, id, st.total); }, function () { toast(tr('Export failed.', 'تعذر التصدير.'), true); });
  }
  function toast(msg, bad) { var e = document.createElement('div'); e.className = 'dms-toast' + (bad ? ' dms-toast-err' : ''); e.setAttribute('role', 'status'); e.textContent = msg; HOST.appendChild(e); later(function () { e.remove(); }, 3500); }
  /* common cells */
  function dtc(v) { return v ? '<span class="dms-num">' + esc(String(v).slice(0, 10)) + '</span>' : '<span class="dms-sm">—</span>'; }
  function who(v) { return v ? bdi(v) : '<span class="dms-sm">' + esc(NAtxt()) + '</span>'; }
  function txt(v) { return v ? bdi(v) : '<span class="dms-sm">—</span>'; }
  function amc(v) { return v == null || v === '' ? '<span class="dms-sm">—</span>' : '<span class="dms-num">' + esc(amt(v)) + '</span>'; }
  function overdueTag(due) { var d = diffDays(String(due || TODAY).slice(0, 10), TODAY); return d > 0 ? '<span class="dms-days ' + (d > 90 ? 'dms-days-bad' : 'dms-days-warn') + '">' + num(d) + '</span>' : '<span class="dms-sm">—</span>'; }
  function col(h, f, o) { o = o || {}; return Object.assign({ h: h, sf: o.sort === false ? undefined : f, r: function (x) { return o.fmt ? o.fmt(x[f], x) : txt(x[f]); }, c: function (x) { return x[f]; } }, o); }
  function linkCol(h, dt, f, labelF) { return { h: h, sf: f, r: function (x) { return docLink(typeof dt === 'function' ? dt(x) : dt, x[f], labelF ? x[labelF] || x[f] : x[f]); }, c: function (x) { return x[f]; } }; }

  /* ---------- actions pending ---------- */
  var PRIO = { high: ['High', 'عالية'], med: ['Medium', 'متوسطة'], low: ['Low', 'منخفضة'] };
  function score(p, amount, age) { return { high: 300, med: 200, low: 100 }[p] + Math.min(40, Math.log(1 + Math.abs(amount || 0)) / Math.LN10 * 6) + Math.min(20, (age || 0) / 10); }
  /* Server specs ({id, server:true, dt, filters, fields, order, it(row) → item}) load count + 6 most urgent rows each. */
  function loadActions(specs, key) {
    run(key || 'act', function (chk) {
      return Promise.all(specs.filter(function (s) { return s.server; }).map(function (s) {
        var c = getList({ doctype: s.dt, fields: ['count(name) as n'], filters: s.filters, limit_page_length: 1 }, chk).then(function (r) { return +one(r).n || 0; }, function (e) { return 'ERR:' + errKind(e); });
        var l = (s.rank ? fetchAll({ doctype: s.dt, fields: s.fields, filters: s.filters, order_by: s.order }, chk, 2000) : getList({ doctype: s.dt, fields: s.fields, filters: s.filters, order_by: s.order, limit_page_length: 6 }, chk)).then(function (r) { return r || []; }, function (e) { return 'ERR:' + errKind(e); });
        return Promise.all([c, l]).then(function (x) { return { id: s.id, count: typeof x[1] === 'string' ? x[1] : x[0], rows: Array.isArray(x[1]) ? x[1] : [] }; });
      })).then(function (res) { var o = {}; res.forEach(function (x) { o[x.id] = x; }); return o; });
    });
  }
  /* client: {id: {rows, item}} for client specs, null while their sources load, or 'ERR:kind'. */
  function actModel(specs, key, client) {
    var counts = {}, items = [], A = D[key || 'act'], AE = D[(key || 'act') + 'Err'];
    specs.forEach(function (s) {
      if (s.client) {
        var c = client == null ? null : typeof client === 'string' ? client : client[s.id];
        if (typeof c === 'string') { counts[s.id] = c; }
        else if (c) { counts[s.id] = c.count != null ? c.count : c.rows.length; c.rows.slice(0, 6).forEach(function (r) { items.push(c.item(r)); }); }
        return;
      }
      if (AE) { counts[s.id] = 'ERR:' + AE; return; }
      var x = A && A[s.id]; if (!x) { return; }
      counts[s.id] = x.count;
      x.rows.forEach(function (r) { var it = s.it(r); it.dt = it.dt || s.dt; it.name = it.name || r.name; items.push(it); });
    });
    items.sort(function (a, b) { return b.score - a.score; });
    var seen = {}; items = items.filter(function (it) { var k = it.dt + '|' + it.name; if (seen[k]) { return false; } seen[k] = 1; return true; });   /* one row per record, under its most urgent category */
    return { specs: specs, counts: counts, items: items, ready: specs.every(function (s) { return counts[s.id] !== undefined; }) };
  }
  function pendingTotal(AM) {
    if (!AM) { return null; }
    var t = 0, any = false; Object.keys(AM.counts).forEach(function (k) { var c = AM.counts[k]; if (typeof c === 'number') { t += c; any = true; } });
    return any ? t : null;
  }
  function dtLabel(dt) { var L = APP.dtLabels && APP.dtLabels[dt]; return L ? tr(L[0], L[1]) : dt; }
  function arow(it) {
    return '<a class="dms-arow" href="' + esc(it.href || docUrl(it.dt, it.name)) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="dms-prio dms-prio-' + it.p + '">' + esc(tr(PRIO[it.p][0], PRIO[it.p][1])) + '</span>' +
      '<span class="dms-arow-main"><span class="dms-arow-t"><bdi>' + esc(it.title || it.name) + '</bdi><span class="dms-arow-dt">' + esc(dtLabel(it.dt)) + '</span></span><span class="dms-arow-d">' + bdi(it.desc || '') + '</span></span>' +
      '<span class="dms-arow-who">' + (it.who ? bdi(it.who) : '<span class="dms-sm">' + esc(NAtxt()) + '</span>') + '</span>' +
      '<span class="dms-arow-due dms-tone-' + (it.tone || 'n') + '">' + esc(it.due || '') + '</span><span class="dms-sr"> (' + esc(tr('opens in a new tab', 'يفتح في علامة تبويب جديدة')) + ')</span></a>';
  }
  function drillId(s) { return s.drill || ((s.client ? 'cli:' : 'srv:') + s.id); }
  function catBtn(s, c) {
    var err = typeof c === 'string', inner = '<span class="dms-acat-t">' + esc(s.short) + '</span><b class="dms-num">' + (err || c == null ? '—' : num(c)) + '</b>';
    return (!err && c) ? '<button type="button" class="dms-acat" data-act="kpi" data-v="' + esc(drillId(s)) + '" title="' + esc(s.title + ' — ' + tr('view all', 'عرض الكل')) + '">' + inner + '</button>'
      : '<div class="dms-acat dms-acat-off" title="' + esc(err ? (c === 'ERR:perm' ? tr('Permission denied', 'لا صلاحية') : tr('Unavailable', 'غير متاح')) : s.title) + '">' + inner + '</div>';
  }
  function actionsPanel(AM) {
    var tot = pendingTotal(AM);
    var h = '<section class="dms-panelbox dms-actpanel" id="dms-pending" tabindex="-1" aria-labelledby="dms-pending-h"><div class="dms-ph"><h3 class="dms-h3" id="dms-pending-h">' + esc(tr('Actions pending', 'الإجراءات المعلقة')) +
      (tot != null ? ' <span class="dms-h3-n dms-num">' + num(tot) + '</span>' : '') + '</h3><span class="dms-ph-meta">' + esc(tr('As of today · most urgent first', 'حتى اليوم · الأكثر إلحاحًا أولًا')) + '</span>' +
      (tab !== 'actions' && APP.tabs.some(function (x) { return x.id === 'actions'; }) ? '<button type="button" class="dms-linkbtn" data-act="kpi" data-v="goto:actions">' + esc(tr('View all', 'عرض الكل')) + '</button>' : '') + '</div>';
    if (!AM) { return h + '<div class="dms-arows" aria-busy="true">' + skel(6, 'dms-skel-row') + '</div></section>'; }
    var known = AM.specs.filter(function (s) { return AM.counts[s.id] !== undefined; });
    if (!known.length) { return h + '<div class="dms-arows" aria-busy="true">' + skel(6, 'dms-skel-row') + '</div></section>'; }
    var errs = known.filter(function (s) { return typeof AM.counts[s.id] === 'string'; });
    if (AM.ready && errs.length === AM.specs.length) { return h + alertBox('err', esc(tr('Pending actions could not be loaded.', 'تعذر تحميل الإجراءات المعلقة.')) + ' <button type="button" class="dms-linkbtn" data-act="refresh">' + esc(tr('Retry', 'إعادة المحاولة')) + '</button>') + '</section>'; }
    var items = AM.items.slice(0, CFG.actRows || 7);
    h += items.length ? '<div class="dms-arows">' + items.map(arow).join('') + '</div>' : (AM.ready ? '<div class="dms-empty dms-empty-sm">' + esc(tr('Nothing pending for this selection.', 'لا توجد إجراءات معلقة لهذا الاختيار.')) + '</div>' : '<div class="dms-arows" aria-busy="true">' + skel(4, 'dms-skel-row') + '</div>');
    h += '<div class="dms-acats">' + AM.specs.map(function (s) { return catBtn(s, AM.counts[s.id]); }).join('') + '</div>';
    if (errs.length) { h += note(esc(tr('Could not load: ', 'تعذر التحميل: ') + errs.map(function (s) { return s.short; }).join(', '))); }
    return h + '</section>';
  }
  function actionsTab(AM, info) {
    var h = alertBox('info', esc(info || tr('Action lists are as of today and not filtered by the period. They follow the filters where the source supports them.', 'قوائم الإجراءات حتى اليوم وغير مرتبطة بالفترة، وتتبع المرشحات حيثما يدعمها المصدر.')));
    h += kpis((AM ? AM.specs : []).map(function (s) {
      var c = AM.counts[s.id], err = typeof c === 'string';
      return kpi({ label: s.title, val: c === undefined ? '…' : err ? '—' : num(c), sub: esc(err ? (c === 'ERR:perm' ? tr('Permission denied', 'لا صلاحية') : tr('Unavailable', 'غير متاح')) : s.why), act: (!err && c) ? drillId(s) : null });
    }));
    return h + actionsPanel(AM);
  }

  /* ---------- live cards: the count (or sum) an old Number Card showed, with that card's own filters, read under the
     viewer's ERP permissions and linked to the ERP list with the same filters. Used to move number-card workspaces onto
     dashboards without changing their figures. groups: [{ en, ar, cards: [{ en, ar, dt, f: [[field, op, value]], sum? }] }].
     Loaded once per key (day + extra filters), cleared by Refresh. ---------- */
  var LC = {};
  function lcList(c, f) {
    var q = f.map(function (x) { var v = x[1] === '=' ? x[2] : JSON.stringify([x[1], x[2]]); return encodeURIComponent(x[0]) + '=' + encodeURIComponent(v); }).join('&');
    return '/app/' + String(c.dt).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + (q ? '?' + q : '');
  }
  function liveCards(id, groups, extra) {
    var k = TODAY + '|' + JSON.stringify(extra || []), st = LC[id];
    if (!st || st.key !== k) {
      st = LC[id] = { key: k, v: {}, url: {} };
      var mine = function () { return !destroyed && LC[id] === st; };
      groups.forEach(function (g, gi) { g.cards.forEach(function (c, ci) {
        var f = (c.f || []).concat(c.noExtra ? [] : (extra || [])), kk = gi + ':' + ci; st.url[kk] = lcList(c, f);
        var p = c.sum ? getList({ doctype: c.dt, fields: ['sum(' + c.sum + ') as v'], filters: f, limit_page_length: 1 }, mine).then(function (r) { return +one(r).v || 0; }) : getCount(c.dt, f, mine);
        p.then(function (n) { if (mine()) { st.v[kk] = n; soon(); } }, function (e) { if (mine()) { st.v[kk] = errKind(e) === 'perm' ? 'ERR:perm' : 'ERR'; soon(); } });
      }); });
    }
    return groups.map(function (g, gi) {
      return panel(tr(g.en, g.ar || g.en), '<div class="dms-grid dms-kpis dms-lc">' + g.cards.map(function (c, ci) {
        var v = st.v[gi + ':' + ci], err = typeof v === 'string';
        return kpi({ label: tr(c.en, c.ar || c.en), val: v === undefined ? '…' : err ? '—' : (c.sum ? cur$(v) : num(v)), sub: err ? esc(v === 'ERR:perm' ? tr('No permission', 'لا صلاحية') : tr('Unavailable', 'غير متاح')) : (c.sub ? esc(tr(c.sub[0], c.sub[1] || c.sub[0])) : ''),
          act: err || v === undefined ? null : 'lc:' + id + ':' + gi + ':' + ci, tip: tr('Open the ERP list with these filters', 'افتح القائمة في النظام بهذه المرشحات') });
      }).join('') + '</div>', 'dms-lc-g');
    }).join('');
  }

  /* ---------- drill-downs (overlay) ---------- */
  var OVL = null;
  function openDrill(id) {
    if (id.indexOf('goto:') === 0) { goTab(id.slice(5)); return; }
    if (id.indexOf('lc:') === 0) { var lp = id.split(':'), ls = LC[lp[1]], lu = ls && ls.url[lp[2] + ':' + lp[3]]; if (lu) { try { G.open(lu, '_blank', 'noopener'); } catch (e) { /* blocked */ } } return; }
    var r = null;
    if (id.indexOf('srv:') === 0 && APP.actSpecs) {
      var s = APP.actSpecs().filter(function (x) { return x.id === id.slice(4); })[0];
      if (s && s.table) { delete SS.drill; r = { title: s.title, sub: s.why, spec: Object.assign({ id: 'drill', server: true, dt: s.dt, filters: s.filters, order: s.order, file: s.id }, s.table()) }; }
    }
    if (!r && APP.drill) { r = APP.drill(id); }
    if (!r || (!r.spec && r.body == null)) { return; }
    if (r.spec) { r.spec.id = 'drill'; if (!r.spec.server && !r.spec.pageSize) { r.spec.pageSize = CFG.modalPage; } }
    delete SS.drill; delete TS.drill;
    var opener = OVL ? OVL.opener : activeEl();
    OVL = Object.assign(r, { id: id, prev: OVL && r.stack !== false ? OVL : null, opener: opener, openerKey: OVL ? OVL.openerKey : opener && opener.getAttribute && opener.getAttribute('data-v') }); renderOverlay();
  }
  function overlayHTML() {
    if (!OVL) { return ''; }
    var link = OVL.link ? ' ' + docLink(OVL.link[0], OVL.link[1], OVL.link[2]) : '';
    return '<div class="dms-overlay" data-act="ovbg"><div class="dms-modal" role="dialog" aria-modal="true" aria-labelledby="dms-dialog-title"><div class="dms-dhead"><div>' + (OVL.prev ? '<button type="button" class="dms-linkbtn" data-act="ovback">‹ ' + esc(tr('Back', 'رجوع')) + '</button>' : '') + '<h3 id="dms-dialog-title">' + esc(OVL.title) + '</h3>' + (OVL.sub || link ? '<p class="dms-sm">' + esc(OVL.sub || '') + link + '</p>' : '') + '</div><button type="button" class="dms-x" data-act="closeov" aria-label="' + esc(tr('Close', 'إغلاق')) + '">×</button></div>' + (OVL.body || '') + (OVL.spec ? regTable(OVL.spec) : '') + '</div></div>';
  }
  function renderOverlay() { var el = $('[data-ref="overlay"]'); if (!el) { return; } var app = $('.dms-app'); if (app) { app.inert = !!OVL; } if (!OVL) { Object.keys(TBL).forEach(function (k) { if (k.indexOf('drill') === 0) { delete TBL[k]; } }); } else { delete TBL.drill; } el.innerHTML = overlayHTML(); fillTables(el); pinOverlay(); var x = el.querySelector('.dms-x'); if (x) { x.focus({ preventScroll: true }); } }
  /* A transformed or contained ERP ancestor turns position:fixed into "fixed to that ancestor", which can be far
     taller than the screen and put the modal out of view. Measure and shift the overlay back onto the viewport. */
  function pinOverlay() {
    var o = HOST.querySelector('.dms-overlay'); if (!o) { return; }
    o.style.top = o.style.left = o.style.width = o.style.height = o.style.right = o.style.bottom = '';
    var r = o.getBoundingClientRect(), vw = document.documentElement.clientWidth || G.innerWidth, vh = G.innerHeight;
    if (Math.abs(r.top) < 1 && Math.abs(r.left) < 1 && Math.abs(r.height - vh) < 2 && Math.abs(r.width - vw) < 2) { return; }
    o.style.right = o.style.bottom = 'auto'; o.style.top = (-r.top) + 'px'; o.style.left = (-r.left) + 'px'; o.style.width = vw + 'px'; o.style.height = vh + 'px';
  }
  function closeOverlay() {
    var previous = OVL; OVL = null; renderOverlay(); delete SS.drill; delete TS.drill;
    if (!previous) { return; }
    var opener = previous.opener;
    if (!opener || !opener.isConnected) { opener = Array.prototype.find.call(HOST.querySelectorAll('[data-act="kpi"]'), function (el) { return el.getAttribute('data-v') === previous.openerKey; }); }
    if (opener) { opener.focus({ preventScroll: true }); }
  }

  /* ---------- filters, period, toolbar, tabs ---------- */
  var F = { period: APP.period || 'month', from: '', to: '', ap: APP.defaultApprovalStatus || '' }, PERIOD = [];
  (APP.filters || []).forEach(function (f) { F[f.k] = ''; });
  /* Tabs limited by role: a tab {id, en, ar, roles: [...]} is shown only to users holding one of those roles. This hides the
     tab only; whatever data the tab reads must be checked again on the server (Server Script role check or ERP permissions). */
  function hasRole(rs) { var ur = (G.frappe && frappe.user_roles) || []; return !rs || !rs.length || rs.some(function (r) { return ur.indexOf(r) >= 0; }); }
  APP.tabs = APP.tabs.filter(function (x) { return hasRole(x.roles); });
  if (!APP.tabs.length) { APP.tabs = [{ id: '__none', en: 'No access', ar: 'لا صلاحية' }]; }
  if (APP.defaultTab && !APP.tabs.some(function (x) { return x.id === APP.defaultTab; })) { APP.defaultTab = null; }
  APP.hasRole = hasRole;
  var tab = APP.defaultTab || APP.tabs[0].id, POP = null, FD = null, FS = {}, CAL = null, ANIM = false, built = false, AMC = null;
  var PERIODS = [['today', 'Today', 'اليوم'], ['yesterday', 'Yesterday', 'أمس'], ['week', 'This week', 'هذا الأسبوع'], ['lastWeek', 'Last week', 'الأسبوع الماضي'],
    ['month', 'This month', 'هذا الشهر'], ['lastMonth', 'Last month', 'الشهر الماضي'], ['quarter', 'This quarter', 'هذا الربع'], ['ytd', 'Year to date', 'السنة حتى اليوم'],
    ['year', 'This year', 'هذه السنة'], ['prevYear', 'Previous year', 'السنة الماضية'], ['custom', 'Custom range', 'نطاق مخصص']];
  var PGROUPS = [['today', 'yesterday'], ['week', 'lastWeek'], ['month', 'lastMonth'], ['quarter', 'ytd', 'year', 'prevYear'], ['custom']];
  function curPeriod() { return periodRange(F.period, F.from, F.to); }
  function periodName(k) { var p = PERIODS.filter(function (x) { return x[0] === k; })[0]; return p ? tr(p[1], p[2]) : k; }
  function filterCount() { return (APP.filters || []).filter(function (f) { return F[f.k]; }).length; }
  function optList(f, draft) { var l = f.options ? f.options(draft || F) : []; return (l || []).map(function (x) { return typeof x === 'string' ? { v: x, l: x } : x; }); }
  function optLabel(f, v) { var o = optList(f).filter(function (x) { return x.v === v; })[0]; return o ? o.l : (f.label ? f.label(v) : v); }
  function pendingBtnHTML() {
    var n = pendingTotal(AMC), lbl = n == null ? (AMC && AMC.ready ? '—' : '…') : num(n);
    return '<button type="button" class="dms-pend' + (n ? ' dms-pend-on' : '') + '" data-act="pending" data-fk="pending" title="' + esc(tr('Pending actions as of today — show the list', 'الإجراءات المعلقة حتى اليوم — عرض القائمة')) + '">' +
      '<i class="dms-pend-dot" aria-hidden="true"></i><b class="dms-num">' + lbl + '</b><span class="dms-pend-l">' + esc(tr('pending', 'معلّقة')) + '</span></button>';
  }
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function ffield(f) {
    if (f.type === 'text' || f.type === 'date') { return '<div class="dms-ff"><label for="dms-fd-' + f.k + '">' + esc(tr(f.en, f.ar)) + '</label><input type="' + (f.type === 'date' ? 'date' : 'search') + '" id="dms-fd-' + f.k + '" class="dms-input" data-fd="' + f.k + '" data-fk="fd:' + f.k + '" value="' + esc(FD[f.k] || '') + '" placeholder="' + esc(f.ph ? tr(f.ph[0], f.ph[1]) : '') + '" autocomplete="off"></div>'; }
    var list = optList(f, FD), label = tr(f.en, f.ar), k = f.k;
    var q = clean(FS[k]).toLowerCase(), cur = FD[k], shown = list.filter(function (x) { return !q || String(x.l).toLowerCase().indexOf(q) >= 0 || String(x.v).toLowerCase().indexOf(q) >= 0; }), more = shown.length > 200;
    shown = shown.slice(0, 200);
    if (cur && !shown.some(function (x) { return x.v === cur; })) { shown.unshift({ v: cur, l: optLabel(f, cur) }); }
    var h = '<div class="dms-ff"><label for="dms-fd-' + k + '">' + esc(label) + '</label>';
    if (list.length > 8) { h += '<input type="search" class="dms-input" data-fs="' + k + '" data-fk="fs:' + k + '" value="' + esc(FS[k] || '') + '" placeholder="' + esc(tr('Search ' + num(list.length) + ' options', 'ابحث في ' + num(list.length) + ' خيار')) + '" aria-label="' + esc(tr('Search', 'بحث') + ' — ' + label) + '" autocomplete="off">'; }
    h += '<select id="dms-fd-' + k + '" class="dms-input" data-fd="' + k + '" data-fk="fd:' + k + '">' + opt('', f.none ? tr(f.none[0], f.none[1]) : tr('All', 'الكل'), cur) + shown.map(function (x) { return opt(x.v, x.l, cur); }).join('') + '</select>';
    if (q && !shown.length) { h += '<span class="dms-ff-hint">' + esc(tr('No matches', 'لا نتائج')) + '</span>'; }
    else if (more) { h += '<span class="dms-ff-hint">' + esc(tr('First 200 matches — type to narrow', 'أول 200 نتيجة — اكتب للتضييق')) + '</span>'; }
    return h + '</div>';
  }
  function filtersPopHTML() {
    var n = APP.filterNote ? APP.filterNote() : '';
    return '<div class="dms-pop dms-pop-filters" role="dialog" aria-label="' + esc(tr('Filters', 'المرشحات')) + '"><div class="dms-pop-b">' + APP.filters.map(ffield).join('') + '</div>' +
      (n ? '<p class="dms-pop-note">' + esc(n) + '</p>' : '') +
      '<div class="dms-pop-f"><button type="button" class="dms-btn" data-act="fclear" data-fk="fclear">' + esc(tr('Clear all', 'مسح الكل')) + '</button><button type="button" class="dms-btn dms-btn-primary" data-act="fapply" data-fk="fapply">' + esc(tr('Apply', 'تطبيق')) + '</button></div></div>';
  }
  function calendarHTML() {
    var v = CAL.view, first = weekStartOf(v), mon = v.slice(0, 7), fdy = CAL.focus && CAL.focus.slice(0, 7) === mon ? CAL.focus : (CAL.from && CAL.from.slice(0, 7) === mon ? CAL.from : v), wd = '', rows = '', r, c, d;
    for (c = 0; c < 7; c++) { try { wd += '<span role="columnheader">' + esc(new Intl.DateTimeFormat(locale(), { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(parseISO(addDays(first, c))))) + '</span>'; } catch (e) { wd += '<span></span>'; } }
    for (r = 0; r < 6; r++) {
      rows += '<div role="row" class="dms-cal-row">';
      for (c = 0; c < 7; c++) {
        d = addDays(first, r * 7 + c);
        var end = d === CAL.from || d === CAL.to, inR = CAL.from && CAL.to && d > CAL.from && d < CAL.to;
        rows += '<button type="button" role="gridcell" class="dms-day' + (d.slice(0, 7) !== mon ? ' dms-out' : '') + (d === TODAY ? ' dms-today' : '') + (inR ? ' dms-in' : '') + (end ? ' dms-end' : '') +
          (CAL.from && CAL.to && d === CAL.from && d !== CAL.to ? ' dms-s' : '') + (CAL.from && CAL.to && d === CAL.to && d !== CAL.from ? ' dms-e' : '') + '" data-act="calday" data-v="' + d + '" data-fk="day:' + d + '" tabindex="' + (d === fdy ? 0 : -1) +
          '" aria-pressed="' + end + '" aria-label="' + esc(fmtDate(d, true)) + '"><bdi>' + (+d.slice(8, 10)) + '</bdi></button>';
      }
      rows += '</div>';
    }
    var ok = CAL.from && CAL.to, msg = ok ? '<bdi>' + esc(rangeLabel([CAL.from, CAL.to])) + '</bdi> · ' + esc(daysTxt(diffDays(CAL.from, CAL.to) + 1)) : esc(CAL.from ? tr('Select an end date', 'اختر تاريخ النهاية') : tr('Select a start date', 'اختر تاريخ البداية'));
    var title = v; try { title = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(parseISO(v))); } catch (e) { /* ISO fallback */ }
    return '<div class="dms-cal"><div class="dms-cal-h"><button type="button" class="dms-btn dms-icobtn" data-act="calnav" data-v="-1" data-fk="calprev" aria-label="' + esc(tr('Previous month', 'الشهر السابق')) + '">' + ico('prev', 'dms-flip') + '</button>' +
      '<b aria-live="polite">' + esc(title) + '</b><button type="button" class="dms-btn dms-icobtn" data-act="calnav" data-v="1" data-fk="calnext" aria-label="' + esc(tr('Next month', 'الشهر التالي')) + '">' + ico('next', 'dms-flip') + '</button></div>' +
      '<div class="dms-cal-g" role="grid" aria-label="' + esc(title) + '"><div class="dms-cal-wd" role="row">' + wd + '</div>' + rows + '</div>' +
      '<div class="dms-cal-f"><span class="dms-cal-msg" aria-live="polite">' + msg + '</span><span class="dms-cal-btns"><button type="button" class="dms-btn" data-act="popclose" data-fk="calcancel">' + esc(tr('Cancel', 'إلغاء')) + '</button>' +
      '<button type="button" class="dms-btn dms-btn-primary" data-act="calapply" data-fk="calapply"' + (ok ? '' : ' disabled') + '>' + esc(tr('Apply', 'تطبيق')) + '</button></span></div></div>';
  }
  function periodPopHTML() {
    var n = APP.periodNote ? APP.periodNote() : '';
    return '<div class="dms-pop dms-pop-period' + (CAL ? ' dms-has-cal' : '') + '" role="dialog" aria-label="' + esc(tr('Select period', 'اختر الفترة')) + '"><div class="dms-presets">' +
      PGROUPS.map(function (g) {
        return '<div class="dms-pgroup">' + g.map(function (k) {
          var on = CAL ? k === 'custom' : F.period === k;
          return '<button type="button" class="dms-preset' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="preset" data-v="' + k + '" data-fk="preset:' + k + '"><span>' + esc(periodName(k)) + '</span>' +
            (k !== 'custom' ? '<small><bdi>' + esc(rangeLabel(periodRange(k))) + '</bdi></small>' : '') + '</button>';
        }).join('') + '</div>';
      }).join('') + '</div>' + (CAL ? calendarHTML() : '') + (n ? '<p class="dms-pop-note dms-pop-note-p">' + esc(n) + '</p>' : '') + '</div>';
  }
  function toolbarHTML() {
    var ac = filterCount(), R = PERIOD, hasF = APP.filters && APP.filters.length;
    return '<div class="dms-topbar"><div class="dms-tb-title"><h2 class="dms-title">' + esc(APP.title()) + '</h2><p class="dms-sub" data-ref="stamp"></p></div>' +
      '<div class="dms-tb-ctrls"><div class="dms-pendwrap" data-ref="pendwrap">' + pendingBtnHTML() + '</div>' +
      (APP.period === false ? '' : '<div class="dms-anchor"><button type="button" class="dms-btn dms-period" data-act="pop" data-v="period" data-fk="pop:period" aria-haspopup="dialog" aria-expanded="' + (POP === 'period') + '" aria-label="' + esc(tr('Period', 'الفترة') + ': ' + periodName(F.period) + ' ' + rangeLabel(R)) + '">' + ico('cal') +
        '<span class="dms-period-t"><b>' + esc(periodName(F.period)) + '</b><span class="dms-period-r"><bdi>' + esc(rangeLabel(R)) + '</bdi></span></span>' + ico('down', 'dms-chev') + '</button>' + (POP === 'period' ? periodPopHTML() : '') + '</div>') +
      (hasF ? '<div class="dms-anchor"><button type="button" class="dms-btn' + (ac ? ' dms-btn-on' : '') + '" data-act="pop" data-v="filters" data-fk="pop:filters" aria-haspopup="dialog" aria-expanded="' + (POP === 'filters') + '">' + ico('filter') +
        '<span class="dms-btn-t">' + esc(tr('Filters', 'المرشحات')) + '</span>' + (ac ? '<span class="dms-count" aria-label="' + esc(ac + ' ' + tr('active', 'نشط')) + '">' + ac + '</span>' : '') + '</button>' + (POP === 'filters' ? filtersPopHTML() : '') + '</div>' : '') +
      '<button type="button" class="dms-btn dms-icobtn" data-act="refresh" data-ref="refresh" data-fk="refresh" aria-label="' + esc(tr('Refresh data', 'تحديث البيانات')) + '" title="' + esc(tr('Refresh data (keeps filters)', 'تحديث البيانات (مع الإبقاء على المرشحات)')) + '">' + ico('refresh') + '</button></div>' +
      '<div class="dms-lang" role="group" aria-label="Language / اللغة"><button type="button" data-act="lang" data-v="en" data-fk="lang:en" lang="en" aria-pressed="' + (LANG === 'en') + '"' + (LANG === 'en' ? ' class="dms-on"' : '') + '>English</button>' +
        '<button type="button" data-act="lang" data-v="ar" data-fk="lang:ar" lang="ar" aria-pressed="' + (LANG === 'ar') + '"' + (LANG === 'ar' ? ' class="dms-on"' : '') + '>العربية</button></div></div>';
  }
  function chipsHTML() {
    var a = (APP.filters || []).filter(function (f) { return F[f.k]; }); if (!a.length) { return ''; }
    return '<div class="dms-chips">' + a.map(function (f) {
      var v = optLabel(f, F[f.k]), lab = tr(f.en, f.ar);
      return '<span class="dms-chip"><span class="dms-chip-k">' + esc(lab) + '</span><bdi>' + esc(v) + '</bdi><button type="button" class="dms-chip-x" data-act="rmf" data-v="' + f.k + '" data-fk="rmf:' + f.k + '" aria-label="' + esc(tr('Remove filter', 'إزالة المرشح') + ' ' + lab + ': ' + v) + '">' + ico('x') + '</button></span>';
    }).join('') + (a.length > 1 ? '<button type="button" class="dms-linkbtn" data-act="fclear">' + esc(tr('Clear all', 'مسح الكل')) + '</button>' : '') + '</div>';
  }
  function tabsHTML() {
    var pend = pendingTotal(AMC);
    return '<div class="dms-tabs" role="tablist" aria-label="' + esc(tr('Sections', 'الأقسام')) + '">' + APP.tabs.map(function (x) {
      var on = x.id === tab, lbl = tr(x.en, x.ar), b = x.id === 'actions' && pend ? '<span class="dms-tab-n dms-num" title="' + esc(tr('Pending actions as of today', 'الإجراءات المعلقة حتى اليوم')) + '">' + num(pend) + '</span>' : '';
      return '<button class="dms-tab' + (on ? ' dms-on' : '') + '" role="tab" id="dms-tab-' + x.id + '" aria-selected="' + on + '" aria-controls="dms-panel" tabindex="' + (on ? 0 : -1) + '" data-act="tab" data-v="' + x.id + '" data-fk="tab:' + x.id + '" title="' + esc(lbl) + '" type="button"><span>' + esc(lbl) + '</span>' + b + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- rendering: a fixed skeleton whose regions repaint independently (focus kept via data-fk) ---------- */
  function activeEl() { try { return ROOT.activeElement || null; } catch (e) { return null; } }
  function paint(el, html) {
    if (!el) { return; }
    var a = activeEl(), fk = a && el.contains(a) && a.getAttribute ? a.getAttribute('data-fk') : null, ss = null;
    if (fk && typeof a.selectionStart === 'number') { try { ss = [a.selectionStart, a.selectionEnd]; } catch (e) { /* not a text input */ } }
    el.innerHTML = html;
    if (fk) { focusFk(fk); if (ss) { var n = activeEl(); try { n.setSelectionRange(ss[0], ss[1]); } catch (e) { /* ignore */ } } }
  }
  function focusFk(k) { var n = HOST.querySelector('[data-fk="' + k + '"]'); if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } } }
  function skeleton() {
    HOST.innerHTML = '<div class="dms-app"><div data-ref="tb"></div><div data-ref="chips"></div><div data-ref="tabs"></div><div class="dms-sheet" role="tabpanel" id="dms-panel" data-ref="sheet"><div data-ref="banner"></div><div class="dms-content" data-ref="content"></div></div>' +
      '<div class="dms-tip" data-ref="tip" role="tooltip" hidden></div></div><div data-ref="overlay"></div>';
    built = true;
  }
  function stampText(bz) {
    var now = Date.now(), w = Object.keys(PEND).map(function (k) { return PEND[k]; }).filter(function (p) { return now - p.t0 > 5000; });
    return (APP.stamp ? APP.stamp() : tr('Read-only', 'للقراءة فقط')) + (LOADED ? ' · ' + tr('Updated ', 'آخر تحديث ') + LOADED : '') + (bz ? ' · ' + tr('loading…', 'جارٍ التحميل…') : '') +
      (w.length ? ' · ' + tr('waiting for ', 'بانتظار ') + w.map(function (p) { return p.m + ' ' + Math.round((now - p.t0) / 1000) + 's'; }).join(', ') : '');
  }
  function renderHeaderState() {
    var b = $('[data-ref="refresh"]'), s = $('[data-ref="stamp"]'), bz = busy();
    if (b) { b.classList.toggle('dms-busy', bz); b.setAttribute('aria-busy', String(bz)); }
    if (s) { s.textContent = stampText(bz); }
    paint($('[data-ref="pendwrap"]'), pendingBtnHTML());
    paint($('[data-ref="tabs"]'), tabsHTML());
  }
  function renderToolbar() { paint($('[data-ref="tb"]'), toolbarHTML()); paint($('[data-ref="chips"]'), chipsHTML()); renderHeaderState(); }
  function contentHTML() {
    if (!BOOTED) {
      return '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(CFG.kpiCount || 6, 'dms-skel-kpi') + '</div><div class="dms-main2"><div class="dms-skel dms-skel-panel"></div><div class="dms-skel dms-skel-panel"></div></div>' +
        note(esc(tr('Loading from ERPNext…', 'جارٍ التحميل من ERPNext…')));
    }
    if (APP.period !== false && (!PERIOD[0] || PERIOD[0] > PERIOD[1])) { return alertBox('err', esc(tr('Choose a valid date range.', 'اختر نطاق تاريخ صحيحًا.'))); }
    if (tab === '__none') { return empty(tr('You do not have access to any section of this dashboard.', 'لا تملك صلاحية الوصول إلى أي قسم في هذه اللوحة.')); }
    return APP.content(tab, AMC);
  }
  function renderSoft() {
    PERIOD = curPeriod(); AMC = APP.actions ? APP.actions() : null;
    var keep = {}; Object.keys(TBL).forEach(function (k) { if (k.indexOf('drill') === 0) { keep[k] = TBL[k]; } }); TBL = keep;
    var b = $('[data-ref="banner"]'), c = $('[data-ref="content"]'), sh = $('[data-ref="sheet"]');
    if (b) { b.innerHTML = BOOTED && APP.banner ? APP.banner() : ''; }
    if (c) { paint(c, contentHTML()); c.classList.remove('dms-enter'); if (ANIM) { void c.offsetWidth; c.classList.add('dms-enter'); } ANIM = false; fillTables(c); fitChartLabels(); if (APP.afterRender) { APP.afterRender(c); } }
    if (sh) { sh.setAttribute('aria-labelledby', 'dms-tab-' + tab); }
    renderHeaderState();
  }
  function renderAll() {
    HOST.setAttribute('dir', LANG === 'ar' ? 'rtl' : 'ltr'); HOST.setAttribute('lang', LANG);
    if (!built) { skeleton(); }
    PERIOD = curPeriod(); renderToolbar(); renderSoft();
  }
  /* Full reload (filters, refresh): new generation, empty store, tables back to page 1. */
  function reload() {
    setToday(); PERIOD = curPeriod(); GEN++; D = {}; LC = {}; LOADED = STAMP;
    Object.keys(SS).forEach(function (k) { SS[k].dirty = true; SS[k].page = 1; }); Object.keys(TS).forEach(function (k) { TS[k].page = 1; });
    APP.load(); ANIM = true; renderAll();
  }

  /* ---------- navigation and popovers ---------- */
  function goTab(id, focusTab, force) {
    if (!APP.tabs.some(function (x) { return x.id === id; })) { return; }
    if (tab !== id || force) { tab = id; ANIM = true; if (APP.onTab) { APP.onTab(id); } renderAll(); }
    var t = $('#dms-tab-' + id); if (!t) { return; }
    try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ }
    if (focusTab) { t.focus(); }
  }
  function openPop(w) {
    POP = w; CAL = null;
    if (w === 'filters') { FD = {}; APP.filters.forEach(function (f) { FD[f.k] = F[f.k]; }); FS = {}; }
    else if (F.period === 'custom' && F.from && F.to) { CAL = { from: F.from, to: F.to, view: monthStart(F.from), focus: F.from }; }
    renderToolbar(); focusFk(w === 'filters' ? 'fd:' + APP.filters[0].k : CAL ? 'day:' + CAL.focus : 'preset:' + F.period);
  }
  function closePop(restore) { var w = POP; if (!w) { return; } POP = null; CAL = null; renderToolbar(); if (restore) { focusFk('pop:' + w); } }
  function applyFilters(next) {
    var prev = {}; APP.filters.forEach(function (f) { prev[f.k] = F[f.k]; F[f.k] = (next && next[f.k]) || ''; }); POP = null;
    if (APP.onFilters) { APP.onFilters(prev); }
    reload();
  }
  function applyPeriod(key, from, to) {
    F.period = key; if (key === 'custom') { F.from = from; F.to = to; }
    POP = null; CAL = null; setToday(); PERIOD = curPeriod();
    Object.keys(SS).forEach(function (k) { if (TBL[k] && TBL[k].period) { SS[k].dirty = true; SS[k].page = 1; } });
    if (APP.onPeriod) { APP.onPeriod(); } else { reload(); return; }
    ANIM = true; renderAll(); focusFk('pop:period');
  }
  function calPick(d) {
    if (!CAL.from || CAL.to) { CAL.from = d; CAL.to = null; } else if (d < CAL.from) { CAL.to = CAL.from; CAL.from = d; } else { CAL.to = d; }
    CAL.focus = d;
  }
  function calMove(d) { CAL.focus = d; if (d.slice(0, 7) !== CAL.view.slice(0, 7)) { CAL.view = monthStart(d); } renderToolbar(); focusFk('day:' + d); }

  /* ---------- tooltip (one shared element; positioned against the dashboard, clamped to its width) ---------- */
  function showTip(n) {
    var tip = $('[data-ref="tip"]'), app = $('.dms-app'); if (!tip || !app) { return; }
    tip.textContent = n.getAttribute('data-tip'); tip.hidden = false;
    var a = app.getBoundingClientRect(), r = n.getBoundingClientRect(), w = tip.offsetWidth, hgt = tip.offsetHeight;
    var x = Math.max(4, Math.min(r.left - a.left + r.width / 2 - w / 2, a.width - w - 4)), y = r.top - a.top - hgt - 8;
    if (y < 0) { y = r.bottom - a.top + 8; }
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { var tip = $('[data-ref="tip"]'); if (tip) { tip.hidden = true; } }
  function onOver(ev) { var n = ev.target.closest ? ev.target.closest('[data-tip]') : null; if (n && HOST.contains(n)) { showTip(n); } else { hideTip(); } }

  /* ---------- events (single delegated set, removed on destroy) ---------- */
  function onClick(ev) {
    var n = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (POP && !(ev.target.closest && ev.target.closest('.dms-anchor'))) { closePop(false); }
    if (!n || !HOST.contains(n)) { return; }
    var a = n.getAttribute('data-act'), v = n.getAttribute('data-v'), id = n.getAttribute('data-id');
    if (APP.onAct && APP.onAct(a, v, n, id) === true) { return; }
    if (a === 'ovbg') { if (ev.target === n) { closeOverlay(); } return; }
    if (a === 'closeov') { closeOverlay(); return; }
    if (a === 'ovback' && OVL && OVL.prev) { var pv = OVL.prev; delete SS.drill; delete TS.drill; OVL = pv; if (OVL.spec) { regTable(OVL.spec); } renderOverlay(); return; }
    if (a === 'tab') { goTab(v); return; }
    if (a === 'lang') { if (LANG !== v) { LANG = v; try { G.localStorage.setItem('dms_lang', LANG); } catch (e) { /* ignore */ } POP = null; CAL = null; renderAll(); if (OVL) { var o = OVL; OVL = null; renderOverlay(); openDrill(o.id); } focusFk('lang:' + v); } return; }
    if (a === 'refresh') { if (APP.onRefresh) { APP.onRefresh(); } reload(); return; }
    if (a === 'pop') { if (POP === v) { closePop(true); } else { openPop(v); } return; }
    if (a === 'popclose') { closePop(true); return; }
    if (a === 'preset') {
      if (v !== 'custom') { applyPeriod(v); return; }
      var r0 = PERIOD[0] || TODAY, r1 = PERIOD[1] || TODAY; CAL = { from: r0, to: r1, view: monthStart(r1 > TODAY ? TODAY : r1), focus: r1 > TODAY ? TODAY : r1 };
      renderToolbar(); focusFk('day:' + CAL.focus); return;
    }
    if (a === 'calnav' && CAL) { CAL.view = addMonths(CAL.view, +v); CAL.focus = CAL.view; renderToolbar(); return; }
    if (a === 'calday' && CAL) { calPick(v); renderToolbar(); focusFk('day:' + v); return; }
    if (a === 'calapply' && CAL && CAL.from && CAL.to) { applyPeriod('custom', CAL.from, CAL.to); return; }
    if (a === 'fapply') { applyFilters(FD); focusFk('pop:filters'); return; }
    if (a === 'fclear') { applyFilters(null); focusFk('pop:filters'); return; }
    if (a === 'rmf') { var nf = {}; APP.filters.forEach(function (f) { nf[f.k] = F[f.k]; }); nf[v] = ''; applyFilters(nf); focusFk('pop:filters'); return; }
    if (a === 'pending') {
      goTab(APP.defaultTab || APP.tabs[0].id); var p = $('#dms-pending');
      if (p) { var still = G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches; try { p.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' }); } catch (e) { p.scrollIntoView(); } p.focus({ preventScroll: true }); }
      return;
    }
    if (a === 'kpi') { openDrill(v); return; }
    if (a === 'tpage') { TS[id].page = Math.max(1, TS[id].page + (+v)); fillTable(id); return; }
    if (a === 'tsort') { var st = TS[id]; if (st.sk === v) { st.dir = -st.dir; } else { st.sk = v; st.dir = 1; } st.page = 1; fillTable(id); focusHead(id, v); return; }
    if (a === 'spage') { var ss = SS[id]; ss.page = Math.max(1, ss.page + (+v)); ss.dirty = true; fillTable(id); return; }
    if (a === 'ssort') { var s2 = SS[id]; if (s2.sk === v) { s2.dir = -s2.dir; } else { s2.sk = v; s2.dir = 1; } s2.page = 1; s2.dirty = true; fillTable(id); focusHead(id, v); return; }
    if (a === 'sretry') { SS[id].dirty = true; fillTable(id); return; }
    if (a === 'pdf') { var sp = TBL[id]; download(sp.file || id, sp, clientRows(sp, TS[id]), id); return; }
    if (a === 'pdfall') { exportServer(id); return; }
  }
  function focusHead(id, v) { var th = HOST.querySelector('[data-tbl="' + id + '"] th[data-v="' + v + '"]'); if (th) { th.focus(); } }
  function onInput(ev) {
    var n = ev.target; if (!n || !n.getAttribute || !HOST.contains(n)) { return; }
    var fs = n.getAttribute('data-fs'), fd = n.getAttribute('data-fd'), tq = n.getAttribute('data-tq');
    if (APP.onInput && APP.onInput(n, ev) === true) { return; }
    var tf = n.getAttribute('data-tf');
    if (tf) {
      var spf = TBL[tf], tfk = n.getAttribute('data-tfk'); if (!spf) { return; }
      var stf = spf.server ? SS[tf] : (TS[tf] || (TS[tf] = { q: '', page: 1, sk: spf.sk || '', dir: spf.dir || 1 })); if (!stf) { return; }
      stf.fv = stf.fv || {}; if ((stf.fv[tfk] || '') === n.value) { return; }
      stf.fv[tfk] = n.value; stf.page = 1; if (spf.server) { stf.dirty = true; } focusId = null; fillTable(tf);
      var again = HOST.querySelector('[data-tf="' + tf + '"][data-tfk="' + tfk + '"]'); if (again) { again.focus(); }
      return;
    }
    if (fs) { if (FS[fs] === n.value) { return; } FS[fs] = n.value; renderToolbar(); return; }
    if (fd) { if (!FD || FD[fd] === n.value) { return; } FD[fd] = n.value; if (n.type === 'search') { return; } if (APP.filters.some(function (f) { return f.dependsOn === fd; })) { APP.filters.forEach(function (f) { if (f.dependsOn === fd && FD[f.k] && !optList(f, FD).some(function (x) { return x.v === FD[f.k]; })) { FD[f.k] = ''; } }); renderToolbar(); } return; }
    if (tq) {
      focusId = tq; var spx = TBL[tq]; if (!spx) { return; }
      if (spx.server) { var s2 = SS[tq]; if (s2.q === n.value) { return; } s2.q = n.value; s2.page = 1; clearTimeout(onInput.t); onInput.t = later(function () { s2.dirty = true; fillTable(tq); }, 350); }
      else { var s1 = TS[tq] || (TS[tq] = { q: '', page: 1, sk: spx.sk || '', dir: spx.dir || 1 }); if (s1.q === n.value) { return; } s1.q = n.value; s1.page = 1; fillTable(tq); }
    }
  }
  function onKey(ev) {
    var t = ev.target, act = t && t.getAttribute ? t.getAttribute('data-act') : null, rtl = LANG === 'ar', k = ev.key;
    if (k === 'Escape') {
      if (POP) { ev.preventDefault(); closePop(true); return; }
      if (OVL) { closeOverlay(); }
      return;
    }
    if ((k === 'Enter' || k === ' ') && (act === 'tsort' || act === 'ssort')) { ev.preventDefault(); t.click(); return; }
    if (k === 'Tab' && OVL) {
      var modal = $('.dms-modal'), controls = Array.prototype.filter.call(modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]'), function (el) { return el.getClientRects().length; });
      var first = controls[0], last = controls[controls.length - 1];
      if (ev.shiftKey && t === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && t === last) { ev.preventDefault(); first.focus(); }
    }
    if (act === 'tab' && /^(ArrowLeft|ArrowRight|Home|End)$/.test(k)) {
      var ids = APP.tabs.map(function (x) { return x.id; }), i = ids.indexOf(t.getAttribute('data-v')), L = ids.length;
      var d = k === 'Home' ? -i : k === 'End' ? L - 1 - i : ((k === 'ArrowRight') !== rtl ? 1 : -1);
      ev.preventDefault(); goTab(ids[(i + d + L) % L], true); return;
    }
    if (act === 'calday' && CAL) {
      var cur = t.getAttribute('data-v'), step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: -7, ArrowDown: 7 }[k];
      if (step) { ev.preventDefault(); calMove(addDays(cur, step)); return; }
      if (k === 'PageUp' || k === 'PageDown') { ev.preventDefault(); calMove(shiftMonths(cur, k === 'PageUp' ? -1 : 1)); return; }
      if (k === 'Home' || k === 'End') { ev.preventDefault(); calMove(k === 'Home' ? weekStartOf(cur) : addDays(weekStartOf(cur), 6)); }
    }
  }
  /* Start: wire events, render the skeleton, run APP.boot (reference lists), then the first load. */
  function start() {
    HOST.addEventListener('click', onClick, SIG);
    HOST.addEventListener('input', onInput, SIG);
    HOST.addEventListener('change', onInput, SIG);
    HOST.addEventListener('keydown', onKey, SIG);
    /* Keys typed in a dashboard field stop here: past the shadow root Frappe sees the block, not the field, and its
       global shortcuts would send the keystrokes to the ERP search bar. */
    ['keydown', 'keypress', 'keyup'].forEach(function (type) {
      HOST.addEventListener(type, function (ev) { var n = ev.composedPath ? ev.composedPath()[0] : ev.target; if (n && (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable)) { ev.stopPropagation(); } }, SIG);
    });
    G.addEventListener('scroll', function () { if (OVL) { pinOverlay(); } }, Object.assign({ capture: true, passive: true }, SIG || {}));
    G.addEventListener('resize', function () { if (OVL) { pinOverlay(); } }, SIG);
    HOST.addEventListener('pointerover', onOver, SIG);
    HOST.addEventListener('pointerleave', hideTip, SIG);
    HOST.addEventListener('focusin', function (ev) { var n = ev.target.closest && ev.target.closest('[data-tip]'); if (n) { showTip(n); } }, SIG);
    HOST.addEventListener('focusout', hideTip, SIG);
    document.addEventListener('pointerdown', function (ev) {
      if (!POP) { return; } var p = ev.composedPath ? ev.composedPath() : [];
      for (var i = 0; i < p.length; i++) { if (p[i] === HOST) { return; } }
      closePop(false);
    }, SIG);
    if (!G.frappe || !frappe.call) { HOST.innerHTML = '<div class="dms-empty">Frappe client API not available.</div>'; return; }
    setToday(); PERIOD = curPeriod();
    var chartResize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fitChartLabels) : null;
    if (chartResize) { chartResize.observe(HOST); if (abort) { abort.signal.addEventListener('abort', function () { chartResize.disconnect(); }); } }
    if (document.fonts) { document.fonts.ready.then(function () { if (!destroyed) { fitChartLabels(); } }); }
    renderAll();
    var g = GEN, chk = function () { return g === GEN && !destroyed; };
    Promise.resolve(APP.boot ? APP.boot(chk) : null).catch(function (e) { if (G.console) { console.error(APP.key, 'boot', e); } }).then(function () { if (destroyed) { return; } BOOTED = true; reload(); });
  }
  /* ==== end DMS kit ==== */

/* ============================================================ kit bridge: the v1 layer renders into persistent nodes */
var KIT = { kpi: kpi, kpis: kpis, panel: panel, hbars: hbars, mixBar: mixBar, barChart: barChart, regTable: regTable, fillTables: fillTables, stat: stat, alertBox: alertBox, note: note, skel: skel, esc: esc, empty: empty, docLink: docLink, callP: callP };
var NODES = {};
function nodeKey(x) { return x + '|' + LANG + '|' + (DCV ? DCV.drillKey() : ''); }
function view(x, AM) {
  if (D.dcErr) { return srcErr(D.dcErr, 'Project') + (x === 'ov' ? actionsPanel(AM) : ''); }
  if (!D.dc) { return x === 'ov' ? '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(7, 'dms-skel-kpi') + '</div><div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>' : '<div class="dms-skel dms-skel-panel"></div>'; }
  if (x === 'actions') { return actionsTab(AM, L('n_delay')); }
  return (x === 'ov' ? actionsPanel(AM) : '') + '<div class="dc-view" data-dcv="' + esc(x) + '"></div>';
}
function mount(c) {
  var ph = c && c.querySelector ? c.querySelector('[data-dcv]') : null; if (!ph || !DCV || !D.dc) { return; }
  var x = ph.getAttribute('data-dcv'), k = nodeKey(x), node = NODES[k];
  if (!node) { node = document.createElement('div'); node.className = 'dc-node'; NODES = {}; NODES[k] = node; ph.replaceWith(node); DCV.render(node, x); }
  else { ph.replaceWith(node); }
}
function rerender() { NODES = {}; renderSoft(); }

/* actions pending: v1's own delay / risk list (delayed projects, overdue and due-soon tasks, late PO / MR lines, open issues, pending repairs) */
var ACT = [['a_proj', 'high', 'Project', 'Overdue', 'Delayed Projects', 'المشاريع المتأخرة'], ['a_task', 'high', 'Task', 'Overdue', 'Overdue Tasks', 'المهام المتأخرة'], ['a_supply', 'med', 'supply', 'Overdue', 'Late material and purchase lines', 'بنود مواد ومشتريات متأخرة'], ['a_upc', 'low', 'Task', 'Upcoming', 'Task deadlines within 14 days', 'مواعيد مهام خلال 14 يوماً'], ['a_open', 'low', 'open', null, 'Open issues and pending repairs', 'مشاكل مفتوحة وإصلاحات معلقة']];
function actSpecs() { return ACT.map(function (a) { return { id: a[0], client: true, short: tr(a[4], a[5]), title: tr(a[4], a[5]), why: L(a[0] === 'a_proj' ? 'lt_delayed' : a[0] === 'a_task' ? 'lt_task' : a[0] === 'a_supply' ? 'lt_po' : a[0] === 'a_upc' ? 'lt_upc' : 'lt_issue') }; }); }
function actClient() {
  if (D.actErr) { return 'ERR:' + D.actErr; } if (!D.act) { return null; } var rows = D.act, o = {};
  var pick = { a_proj: function (r) { return r.dt === 'Project'; }, a_task: function (r) { return r.dt === 'Task' && r.status === 'Overdue'; }, a_supply: function (r) { return r.dt === 'Purchase Order' || r.dt === 'Material Request'; }, a_upc: function (r) { return r.dt === 'Task' && r.status === 'Upcoming'; }, a_open: function (r) { return r.dt === 'Issue' || r.dt === 'Asset Repair'; } };
  ACT.forEach(function (a) { o[a[0]] = { rows: rows.filter(pick[a[0]]), item: function (r) { return { p: a[1], score: score(a[1], 0, Number(r.over) || 0), dt: r.dt, name: r.doc, title: r.doc, desc: r.desc, who: r.project || r.resp || '', due: r.over ? r.over + ' ' + tr('days overdue', 'يوماً تأخير') : r.exp ? fmtDate(r.exp, true) : '', tone: a[1] === 'high' ? 'bad' : a[1] === 'med' ? 'warn' : 'n' }; } }; });
  return o;
}
/* Full list behind an action category (the kit opens 'cli:<id>' through APP.drill). */
function actDrill(id) {
  if (id.indexOf('cli:') !== 0) { return null; }
  var k = id.slice(4), cc = actClient(), y = cc && typeof cc === 'object' && cc[k], s = actSpecs().filter(function (z) { return z.id === k; })[0];
  if (!y || !s || !y.rows) { return null; }
  return { title: s.title, sub: s.why, spec: { rows: y.rows.map(y.item).filter(Boolean), file: k, text: function (it) { return [it.title, it.desc, it.who].join(' '); }, cols: [
    { h: tr('Record', 'السجل'), r: function (it) { return docLink(it.dt, it.name, it.title); }, c: function (it) { return it.name; } },
    { h: tr('Detail', 'التفاصيل'), r: function (it) { return '<span class="dms-sm">' + bdi(it.desc || '') + '</span>'; }, c: function (it) { return it.desc; } },
    { h: tr('Project / owner', 'المشروع / المسؤول'), r: function (it) { return bdi(it.who || '—'); }, c: function (it) { return it.who; } },
    { h: tr('Age / due', 'المدة / الاستحقاق'), r: function (it) { return esc(it.due || ''); }, c: function (it) { return it.due; } }] } };
}
function onAct(a, v) {
  if (a === 'kpi' && v.indexOf('dck:') === 0) { DCV.openKpi(+v.slice(4)); rerender(); return true; }
  if (a === 'dcback') { DCV.drillClear(); rerender(); return true; }
  if (a === 'dcpd') { DCV.openProject(v); rerender(); return true; }
  if (a === 'dcrep') { DCV.openReport(+v); rerender(); return true; }
  return false;
}

/* ============================================================ v1 application layer, in its own scope */
function KIT_TODAY() { return TODAY; }
function makeDC() {
var KTODAY = KIT_TODAY();
/* ---------- i18n ---------- */
var I18N = { en: {}, ar: {} };
function K(k, e, a) { I18N.en[k] = e; I18N.ar[k] = a; }
var S = { lang: 'en', tab: null, f: {}, drill: null, ctx: {}, lv: {} };
var epoch = 0, uid = 0, cache = {}, loadedAt = null;
try { var _l = localStorage.getItem('dmcon-lang'); if (_l === 'ar' || _l === 'en') { S.lang = _l; } } catch (e0) {}
function t(k, v) {
  var s = I18N[S.lang][k]; if (s === undefined) { s = I18N.en[k]; } if (s === undefined) { s = k; }
  if (v) { for (var x in v) { s = s.split('{' + x + '}').join(v[x]); } }
  return s;
}
function st(v) { var s = I18N[S.lang]['st_' + v]; return s !== undefined ? s : (v === null || v === undefined ? '' : v); }
K('loading', 'Loading…', 'جاري التحميل…'); K('empty', 'No records found.', 'لا توجد سجلات.');
K('error', 'Error', 'خطأ'); K('retry', 'Retry', 'إعادة المحاولة'); K('back', 'Back', 'رجوع');
K('search', 'Search…', 'بحث…'); K('records', 'records', 'سجل'); K('prev', 'Previous', 'السابق'); K('next', 'Next', 'التالي');
K('showing', 'Showing {a}–{b} of {n}', 'عرض {a}–{b} من {n}'); K('export', 'Export CSV', 'تصدير CSV');
K('exported', 'Exported {n} of {total} records.', 'تم تصدير {n} من {total} سجل.');
K('trunc', 'Export limited to the first {cap} records (partially loaded).', 'التصدير محدود بأول {cap} سجل (تحميل جزئي).');
K('unavailable', 'Unavailable', 'غير متاح'); K('refresh', 'Refresh', 'تحديث'); K('all', 'All', 'الكل');
K('from', 'Date From', 'من تاريخ'); K('to', 'Date To', 'إلى تاريخ'); K('docstatus', 'Document Status', 'حالة المستند');
K('st_Draft', 'Draft', 'مسودة'); K('st_Submitted', 'Submitted', 'مقدّم'); K('st_Cancelled', 'Cancelled', 'ملغى');
K('st_Open', 'Open', 'مفتوح'); K('st_Completed', 'Completed', 'مكتمل'); K('st_Working', 'Working', 'قيد العمل');
K('st_Pending Review', 'Pending Review', 'بانتظار المراجعة'); K('st_Overdue', 'Overdue', 'متأخر'); K('st_Template', 'Template', 'قالب');
K('st_Approved', 'Approved', 'موافق عليه'); K('st_Rejected', 'Rejected', 'مرفوض'); K('st_Present', 'Present', 'حاضر');
K('st_Absent', 'Absent', 'غائب'); K('st_On Leave', 'On Leave', 'في إجازة'); K('st_Half Day', 'Half Day', 'نصف يوم');
K('st_Work From Home', 'Work From Home', 'عمل من المنزل'); K('st_Closed', 'Closed', 'مغلق');
K('st_To Receive and Bill', 'To Receive and Bill', 'للاستلام والفوترة'); K('st_To Bill', 'To Bill', 'للفوترة');
K('st_To Receive', 'To Receive', 'للاستلام'); K('st_Pending', 'Pending', 'قيد الانتظار');
K('st_Partially Ordered', 'Partially Ordered', 'مطلوب جزئياً'); K('st_Ordered', 'Ordered', 'تم الطلب');
K('st_Stopped', 'Stopped', 'متوقف'); K('st_Received', 'Received', 'مستلم'); K('st_On Hold', 'On Hold', 'معلّق');
K('st_In Maintenance', 'In Maintenance', 'قيد الصيانة'); K('st_Out of Order', 'Out of Order', 'معطّل');
K('st_Partially Depreciated', 'Partially Depreciated', 'مستهلك جزئياً'); K('st_Fully Depreciated', 'Fully Depreciated', 'مستهلك بالكامل');
K('st_Sold', 'Sold', 'مباع'); K('st_Scrapped', 'Scrapped', 'مخرّد'); K('st_Issue', 'Issue', 'صرف'); K('st_Receipt', 'Receipt', 'استلام');
K('st_Capitalized', 'Capitalized', 'مرسمل'); K('st_Decapitalized', 'Decapitalized', 'غير مرسمل');
K('st_In Progress', 'In Progress', 'قيد التنفيذ');
K('foot_ro', 'Read-only dashboard. All data is loaded live from ERPNext and limited by your own permissions.', 'لوحة للقراءة فقط. تُحمَّل البيانات مباشرة من ERPNext وتخضع لصلاحياتك.');
K('loaded_at', 'Last loaded', 'آخر تحميل'); K('partial', 'Partially loaded: only the first {n} records were read.', 'تحميل جزئي: تمت قراءة أول {n} سجل فقط.');
K('auto5', 'Auto 5 min', 'تحديث كل 5 دقائق'); K('upd', 'Updated {t}', 'آخر تحديث {t}');
K('lang_btn', 'العربية', 'English');
K('open_doc', 'Open', 'فتح'); K('total', 'Total', 'الإجمالي');

/* ---------- utils ---------- */
function $(s, el) { return (el || ROOT).querySelector(s); }
function $$(s, el) { return Array.prototype.slice.call((el || ROOT).querySelectorAll(s)); }
function esc(v) { if (v === null || v === undefined) { return ''; } return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function slug(dt) { try { return frappe.router.slug(dt); } catch (e) { return String(dt).toLowerCase().replace(/[^a-z0-9]+/g, '-'); } }
function docUrl(dt, name) { return '/app/' + slug(dt) + '/' + encodeURIComponent(name); }
function link(dt, name) { return name ? '<a class="dmcon-lnk" target="_blank" rel="noopener" href="' + esc(docUrl(dt, name)) + '">' + esc(name) + '</a>' : ''; }
function n(v, d) { if (v === null || v === undefined || v === '') { return '—'; } var x = Number(v); if (!isFinite(x)) { return '—'; } return x.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d }); }
function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
var TODAY = KTODAY;
function addDays(s, k) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + k); return iso(d); }
function monthStart(s) { return s.slice(0, 8) + '01'; }
function monthEnd(s) { return iso(new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)), 0)); }
function addMonths(s, k) { var d = new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1 + k, 1); return iso(d); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
function dstr(v) { return v ? String(v).slice(0, 10) : ''; }
function tstr(v) { return v ? String(v).slice(11, 16) : ''; }
function errText(e) {
  try {
    var j = e && (e.responseJSON || e);
    if (j && j._server_messages) { var m = JSON.parse(j._server_messages); return m.map(function (x) { try { return JSON.parse(x).message; } catch (_) { return x; } }).join(' ').replace(/<[^>]+>/g, '').slice(0, 300); }
    if (j && j.exc_type) { return j.exc_type; }
    if (e && e.status === 403) { return 'Permission denied (403)'; }
    if (e && e.message) { return e.message; }
    if (e && e.statusText) { return e.statusText; }
  } catch (_) {}
  return 'Request failed';
}
function sum(arr, f) { var s = 0; arr.forEach(function (r) { s += Number(f(r)) || 0; }); return s; }
function group(rows, kf) { var o = {}; rows.forEach(function (r) { var k = kf(r); (o[k] = o[k] || []).push(r); }); return o; }
function chunk(a, k) { var o = []; for (var i = 0; i < a.length; i += k) { o.push(a.slice(i, i + k)); } return o; }
function uniq(a) { var o = {}; a.forEach(function (x) { if (x !== null && x !== undefined && x !== '') { o[x] = 1; } }); return Object.keys(o); }

/* ---------- API (client-side, permission-checked, read-only) ---------- */
var inflight = 0, queue = [], MAXPAR = 4;
function pump() { while (inflight < MAXPAR && queue.length) { (function (j) { inflight++; j.fn().then(function (r) { inflight--; j.res(r); pump(); }, function (e) { inflight--; j.rej(e); pump(); }); })(queue.shift()); } }
function sched(fn) { return new Promise(function (res, rej) { queue.push({ fn: fn, res: res, rej: rej }); pump(); }); }
function rpc(method, args) { return KIT.callP(method, args); }   /* kit transport (permission errors become states) */
function retry(fn, tries) {
  return fn().catch(function (e) {
    var denied = e && (e.status === 403 || e.status === 404 || (e.responseJSON && e.responseJSON.exc_type === 'PermissionError'));
    if (tries > 0 && !denied) { return new Promise(function (r) { setTimeout(r, 400); }).then(function () { return retry(fn, tries - 1); }); }
    throw e;
  });
}
function cached(key, fn) {
  if (!cache[key]) { cache[key] = sched(function () { return retry(fn, 1); }); cache[key].catch(function () { delete cache[key]; }); }
  return cache[key];
}
function memo(key, fn) { if (!cache[key]) { cache[key] = fn(); cache[key].catch(function () { delete cache[key]; }); } return cache[key]; }
function gl(dt, o) {
  o = o || {};
  var a = { doctype: dt, fields: o.fields || ['name'], filters: o.filters || [], limit_start: o.start || 0, limit_page_length: o.limit === undefined ? 20 : o.limit };
  if (o.or && o.or.length) { a.or_filters = o.or; }
  if (o.order) { a.order_by = o.order; }
  if (o.group) { a.group_by = o.group; }
  if (o.parent) { a.parent = o.parent; }
  return cached('gl|' + JSON.stringify(a), function () { return rpc('frappe.client.get_list', a); }).then(function (r) { return r || []; });
}
function cnt(dt, o) { o = o || {}; return gl(dt, { fields: ['count(name) as c'], filters: o.filters, or: o.or, parent: o.parent, limit: 1 }).then(function (r) { return (r[0] && r[0].c) || 0; }); }
function sumf(dt, field, o) { o = o || {}; return gl(dt, { fields: ['sum(' + field + ') as s'], filters: o.filters, or: o.or, parent: o.parent, limit: 1 }).then(function (r) { return (r[0] && Number(r[0].s)) || 0; }); }
function grp(dt, field, o) { o = o || {}; return gl(dt, { fields: [field + ' as k', 'count(name) as c'], filters: o.filters, or: o.or, parent: o.parent, group: field, limit: 500 }).then(function (r) { var m = {}; r.forEach(function (x) { m[x.k === null ? '' : x.k] = x.c; }); return m; }); }
function call(method, args) { return cached('rpc|' + method + '|' + JSON.stringify(args), function () { return rpc(method, args); }); }
/* load up to cap rows in pages of 500; returns {rows,total,truncated} */
function fetchAll(dt, o, cap) {
  cap = cap || 5000; o = o || {};
  return cnt(dt, o).then(function (total) {
    var pages = [], lim = Math.min(total, cap);
    for (var s = 0; s < lim; s += 500) { pages.push(s); }
    return Promise.all(pages.map(function (s) { return gl(dt, { fields: o.fields, filters: o.filters, or: o.or, order: o.order, parent: o.parent, start: s, limit: Math.min(500, lim - s) }); })).then(function (ps) {
      var rows = []; ps.forEach(function (p) { rows = rows.concat(p); });
      return { rows: rows, total: total, truncated: total > cap };
    });
  });
}
var NONE = ['__none__'];

var CAT = { g: ['Completed', 'Approved', 'Present', 'Submitted', 'Closed', 'Received', 'Paid', 'Delivered'], b: ['Working', 'In Progress', 'On Leave', 'Work From Home', 'To Receive and Bill', 'Partially Depreciated', 'Receipt', 'Ordered'], y: ['Open', 'Pending', 'Pending Review', 'Draft', 'Partially Ordered'], o: ['Half Day', 'To Bill', 'To Receive', 'In Maintenance'], r: ['Overdue', 'Rejected', 'Absent', 'Out of Order', 'Critical'], n: ['Cancelled', 'Template', 'On Hold', 'Stopped', 'Fully Depreciated', 'Sold', 'Scrapped'] };
function cat(s) { for (var k in CAT) { if (CAT[k].indexOf(s) >= 0) { return k; } } return 'n'; }
var COL = { g: '#16a34a', b: '#2b4fc1', y: '#eab308', o: '#ed8930', r: '#dc2626', n: '#94a3b8', l: '#60a5fa' };
/* ---------- presentation adapter: v1's helpers, same names and signatures, rendered with the kit ---------- */
var ROOT = HOST;
var SKEL = KIT.skel(1, 'dms-skel-panel');
var TONE = { g: 'ok', b: 'n', y: 'warn', o: 'warn', r: 'bad', n: 'n', l: 'n' };
function pill(label, c) { return KIT.stat(TONE[c] || 'n', label); }
function spill(s, c) { return s ? pill(st(s), c || cat(s)) : ''; }
function dpill(ds) { var m = { 0: ['Draft', 'y'], 1: ['Submitted', 'g'], 2: ['Cancelled', 'n'] }[ds]; return m ? pill(st(m[0]), m[1]) : ''; }
function pbar(v, c) { v = Math.max(0, Math.min(100, Number(v) || 0)); return '<span class="dc-pb"><i style="width:' + v + '%;background:' + (c || 'var(--dms-royal)') + '"></i></span><span class="dc-pbv dms-num">' + n(v, 0) + '%</span>'; }
function hbars(items, d) { if (!items.length) { return KIT.empty(t('empty')); } return KIT.hbars(items.map(function (i) { return { label: i.l, value: Number(i.v) || 0, color: i.c }; }), function (v) { return n(v, d); }); }
function donut(items) { var it = items.filter(function (i) { return i.v; }).map(function (i) { return { label: i.l, value: Number(i.v) || 0, color: i.c }; }); if (!it.length) { return KIT.empty(t('empty')); } return KIT.mixBar(it) + KIT.hbars(it, function (v) { return n(v, 0); }); }
function colchart(cols) {
  if (!cols.length) { return KIT.empty(t('empty')); }
  var names = [], col = {}; cols.forEach(function (c) { c.parts.forEach(function (p) { if (names.indexOf(p.l) < 0) { names.push(p.l); col[p.l] = p.c; } }); });
  var by = {}; cols.forEach(function (c) { by[c.l] = c; });
  return KIT.barChart(cols.map(function (c) { return c.l; }), 'cat', names.map(function (nm) { return { label: nm, color: col[nm], val: function (k) { var p = (by[k].parts || []).filter(function (q) { return q.l === nm; })[0]; return p ? Number(p.v) || 0 : 0; } }; }), function (v) { return n(v, 0); });
}
function errBox(e) { return KIT.alertBox('err', '<b>' + esc(t('error')) + ':</b> ' + esc(errText(e)) + ' <button type="button" class="dms-btn dms-btn-sm" data-retry="1">' + esc(t('retry')) + '</button>'); }
function fill(el, my, load, render) {
  var go = function () {
    el.innerHTML = SKEL;
    load().then(function (d) { if (my !== epoch) { return; } el.innerHTML = render(d); }, function (e) { if (my !== epoch) { return; } el.innerHTML = errBox(e); var b = el.querySelector('[data-retry]'); if (b) { b.onclick = go; } });
  };
  go();
}
function panel(title, cls) { var id = 'p' + (++uid); return { id: id, html: '<section class="dms-panelbox dc-card ' + (cls || '') + '"><div class="dms-ph"><h3 class="dms-h3">' + esc(t(title)) + '</h3></div><div class="dc-card-b" data-pid="' + id + '"></div></section>' }; }
function pel(p) { return ROOT.querySelector('[data-pid="' + p.id + '"]'); }
function note(key) { return KIT.note(esc(t(key))); }
var DCK = [];
function kpis(el, my, defs) {
  el.classList.add('dms-grid', 'dms-kpis');
  el.innerHTML = defs.map(function (d) {
    var un = !!d.unavail, i = DCK.length; DCK.push(d);
    return '<div class="dc-kw" data-dk="' + i + '">' + KIT.kpi({ label: t(d.label), val: un ? '<span class="dms-sm">' + esc(t('unavailable')) + '</span>' : '<span class="dms-skel dc-skv"></span>', sub: un ? esc(t(d.unavail)) : '', tip: un ? t(d.unavail) : '', act: d.spec && !un ? 'dck:' + i : null }) + '</div>';
  }).join('');
  Array.prototype.slice.call(el.querySelectorAll('[data-dk]')).forEach(function (w) {
    var d = DCK[+w.getAttribute('data-dk')]; if (d.unavail) { return; }
    d.load().then(function (r) {
      if (my !== epoch) { return; }
      var nv = w.querySelector('.dms-kpi-n'), sv = w.querySelector('.dms-kpi-s');
      if (nv) { nv.innerHTML = r.html !== undefined ? r.html : esc(r.fmt !== undefined ? r.fmt : n(r.v, r.d)); }
      if (r.sub) { if (sv) { sv.textContent = r.sub; } else { var s2 = document.createElement('span'); s2.className = 'dms-kpi-s'; s2.textContent = r.sub; (w.querySelector('.dms-kpi') || w).appendChild(s2); } }
      var lab = w.querySelector('.dms-kpi-l'); if (lab && d.tone && /red|orange/.test(r.tone || d.tone) && (r.v > 0 || r.fmt)) { w.classList.add('dc-tone-' + (r.tone || d.tone)); }
    }, function (e) {
      if (my !== epoch) { return; }
      var nv = w.querySelector('.dms-kpi-n'); if (nv) { nv.innerHTML = '<span class="dms-sm">' + esc(t('unavailable')) + '</span>'; }
      var b = w.querySelector('[data-act="kpi"]'); if (b) { b.removeAttribute('data-act'); b.setAttribute('title', errText(e)); }
    });
  });
}
function openDrill(d) { S.drill = { tk: d.label, mk: d.spec, tab: S.tab }; renderView(); }
function listView(el, my, spec) {
  if (spec.rowsP && !spec.rows) {
    el.innerHTML = SKEL;
    spec.rowsP().then(function (r) { if (my !== epoch) { return; } spec.rows = r; listView(el, my, spec); }, function (e) { if (my !== epoch) { return; } el.innerHTML = errBox(e); var b = el.querySelector('[data-retry]'); if (b) { b.onclick = function () { listView(el, my, spec); }; } });
    return;
  }
  var cols = spec.cols.map(function (c, i) { return { k: 'c' + i, h: t(c.h), num: c.num, s: spec.rows ? function (r) { var v = c.c(r); return c.num ? (Number(String(v).replace(/[^0-9.\-]/g, '')) || 0) : (v == null ? '' : String(v)); } : undefined, r: c.f || function (r) { var v = c.c(r); return v === null || v === undefined || v === '' ? '<span class="dms-sm">—</span>' : (c.num ? '<span class="dms-num">' + esc(v) + '</span>' : esc(v)); }, c: c.c }; });
  var tid = 'dc_' + spec.id;
  if (spec.rows) {
    el.innerHTML = KIT.regTable({ id: tid, rows: spec.rows, cols: cols, pageSize: 20, file: spec.id, empty: t('empty'), text: function (r) { return spec.cols.map(function (c) { var v = c.c(r); return v == null ? '' : v; }).join(' '); } });
  } else {
    el.innerHTML = KIT.regTable({ id: tid, server: true, dt: spec.dt, fields: spec.fields, filters: [spec.filters || [], spec.or || [], spec.parent || ''], pageSize: 20, file: spec.id, order: spec.order, searchHint: t('search'), cols: cols,
      loader: function (p, size, q, order) {
        var f = (spec.filters || []).slice(), or = spec.or;
        if (q && spec.search && spec.search.length) { if (or && or.length) { f.push([spec.search[0], 'like', '%' + q + '%']); } else { or = spec.search.map(function (s) { return [s, 'like', '%' + q + '%']; }); } }
        return Promise.all([cnt(spec.dt, { filters: f, or: or, parent: spec.parent }), gl(spec.dt, { fields: spec.fields, filters: f, or: or, order: spec.order, start: p * size, limit: size, parent: spec.parent })]).then(function (r) { return Promise.resolve(spec.post ? spec.post(r[1]) : r[1]).then(function (rows) { return { total: r[0], rows: rows }; }); });
      } });
  }
  KIT.fillTables(el);
}
function currentTab() { return APP.tabs.filter(function (x) { return x.id === S.tab; })[0] || APP.tabs[0]; }
function renderView() { rerender(); }
function renderDrill(v, my) {
  var d = S.drill;
  v.innerHTML = '<div class="dc-drillh"><button type="button" class="dms-btn dms-btn-sm" data-act="dcback">← ' + esc(t('back')) + '</button><h3 class="dms-h3">' + esc(d.title || t(d.tk)) + '</h3></div><section class="dms-panelbox"><div class="dc-dl"></div></section>';
  var b = v.querySelector('.dc-dl'); if (d.render) { d.render(b, my); } else { listView(b, my, d.mk()); }
}
function onceClick(fn) { if (ROOT.__dcpd) { return; } ROOT.__dcpd = 1; ROOT.addEventListener('click', fn); }

var DMCC = 'Durar Masagh Contracting Co.';
K('title', 'DM Contracting Department Dashboard', 'لوحة قسم المقاولات – دي إم');
K('subtitle', 'Projects, work progress, manpower, materials, equipment and cost control', 'المشاريع وسير العمل والقوى العاملة والمواد والمعدات وضبط التكاليف');
K('f_company', 'Company', 'الشركة'); K('f_scope', 'Contracting scope (default)', 'نطاق المقاولات (افتراضي)'); K('f_dept', 'Department', 'القسم'); K('f_project', 'Project (ID / name contains)', 'المشروع (يحتوي على)');
K('f_customer', 'Customer (contains)', 'العميل (يحتوي على)'); K('f_supplier', 'Supplier (contains)', 'المورد (يحتوي على)'); K('f_employee', 'Employee (contains)', 'الموظف (يحتوي على)'); K('f_wh', 'Warehouse', 'المستودع');
K('tab_ov', 'Department Overview', 'نظرة عامة على القسم'); K('tab_pr', 'Projects & Sites', 'المشاريع والمواقع'); K('tab_wp', 'Work Progress', 'تقدم العمل'); K('tab_mp', 'Manpower Management', 'إدارة القوى العاملة');
K('tab_mt', 'Materials & Procurement', 'المواد والمشتريات'); K('tab_eq', 'Equipment & Fleet', 'المعدات والأسطول'); K('tab_fi', 'Finance & Cost Control', 'المالية وضبط التكاليف');
K('tab_dl', 'Delays, Risks & Issues', 'التأخيرات والمخاطر والمشاكل'); K('tab_rp', 'Reports & Analytics', 'التقارير والتحليلات');
/* columns */
K('c_id', 'ID', 'الرقم'); K('c_name', 'Name', 'الاسم'); K('c_cust', 'Customer', 'العميل'); K('c_dept', 'Department', 'القسم'); K('c_start', 'Start Date', 'تاريخ البدء'); K('c_end', 'Expected End', 'الانتهاء المتوقع'); K('c_aend', 'Actual End', 'الانتهاء الفعلي');
K('c_status', 'Status', 'الحالة'); K('c_prio', 'Priority', 'الأولوية'); K('c_budget', 'Budget (Project.estimated_costing)', 'الميزانية (التكلفة المقدّرة)'); K('c_actual', 'Actual Cost', 'التكلفة الفعلية'); K('c_prog', 'Progress', 'التقدم'); K('c_method', 'Progress Method', 'طريقة التقدم');
K('c_subject', 'Task Subject', 'موضوع المهمة'); K('c_project', 'Project', 'المشروع'); K('c_asg', 'Assigned Employee', 'الموظف المسند'); K('c_tstart', 'Start Date', 'تاريخ البدء'); K('c_done', 'Completion Date', 'تاريخ الإنجاز'); K('c_over', 'Overdue Days', 'أيام التأخير');
K('c_emp', 'Employee', 'الموظف'); K('c_desig', 'Designation', 'المسمى الوظيفي'); K('c_branch', 'Branch', 'الفرع'); K('c_att', 'Attendance Today', 'حضور اليوم'); K('c_shift', 'Shift', 'الوردية'); K('c_hours', 'Working Hours', 'ساعات العمل'); K('c_tasks', 'Assigned Tasks', 'المهام المسندة'); K('c_tdone', 'Tasks Completed', 'المهام المكتملة'); K('c_ts', 'Timesheets', 'سجلات الوقت'); K('c_projs', 'Assigned Project(s)', 'المشاريع المسندة');
K('c_doc', 'Document', 'المستند'); K('c_type', 'Type', 'النوع'); K('c_item', 'Item Code', 'رمز الصنف'); K('c_iname', 'Item Name', 'اسم الصنف'); K('c_qty', 'Quantity', 'الكمية'); K('c_uom', 'UOM', 'الوحدة'); K('c_wh', 'Warehouse', 'المستودع'); K('c_date', 'Date', 'التاريخ'); K('c_sup', 'Supplier', 'المورد'); K('c_outq', 'Outstanding Qty', 'الكمية المتبقية'); K('c_recq', 'Received/Ordered Qty', 'الكمية المستلمة/المطلوبة');
K('c_sales', 'Sales Orders (Project)', 'أوامر البيع (المشروع)'); K('c_billed', 'Invoiced (Project)', 'المفوتر (المشروع)'); K('c_pcost', 'Purchase Cost', 'تكلفة الشراء'); K('c_mcost', 'Material Cost', 'تكلفة المواد'); K('c_tcost', 'Timesheet Cost', 'تكلفة الوقت'); K('c_margin', 'Gross Margin (ERP calc.)', 'هامش الربح (حساب ERP)'); K('c_util', 'Budget Utilization', 'استخدام الميزانية'); K('c_var', 'Cost Variance', 'انحراف التكلفة');
K('c_inv', 'Invoice', 'الفاتورة'); K('c_outst', 'Outstanding', 'المستحق'); K('c_due', 'Due Date', 'تاريخ الاستحقاق'); K('c_total', 'Grand Total', 'الإجمالي');
K('c_asset', 'Asset', 'الأصل'); K('c_aname', 'Asset Name', 'اسم الأصل'); K('c_cat', 'Category', 'الفئة'); K('c_loc', 'Location', 'الموقع'); K('c_cust2', 'Custodian', 'المسؤول'); K('c_img', 'Image', 'الصورة'); K('c_plate', 'Registration No.', 'رقم اللوحة'); K('c_model', 'Model', 'الطراز'); K('c_driver', 'Employee / Driver', 'الموظف / السائق'); K('c_odo', 'Last Odometer', 'آخر عداد'); K('c_failure', 'Failure Date', 'تاريخ العطل'); K('c_repair', 'Repair Status', 'حالة الإصلاح');
K('c_desc', 'Issue / Delay Description', 'وصف المشكلة / التأخير'); K('c_rdoc', 'Related Document', 'المستند المرتبط'); K('c_resp', 'Responsible', 'المسؤول'); K('c_exp', 'Expected Date', 'التاريخ المتوقع'); K('c_reason', 'Reason(s)', 'السبب'); K('c_count', 'Count', 'العدد'); K('c_pct', '%', '%'); K('c_month', 'Month', 'الشهر'); K('c_metric', 'Metric', 'المؤشر'); K('c_value', 'Value', 'القيمة');
K('c_bud', 'Budget', 'الميزانية'); K('c_fy', 'Fiscal Year', 'السنة المالية'); K('c_cc', 'Cost Center', 'مركز التكلفة'); K('c_against', 'Budget Against', 'الميزانية على');
/* KPI labels */
K('k_ptotal', 'Total Projects', 'إجمالي المشاريع'); K('k_pactive', 'Active Projects', 'المشاريع النشطة'); K('k_pdone', 'Completed Projects', 'المشاريع المكتملة'); K('k_phold', 'Projects on Hold', 'مشاريع معلّقة'); K('k_pdelay', 'Delayed Projects', 'مشاريع متأخرة');
K('k_pupc', 'Upcoming Project Deadlines (30 d)', 'مواعيد مشاريع قادمة (30 يوماً)'); K('k_pattn', 'Projects Requiring Attention', 'مشاريع تتطلب اهتماماً');
K('k_sites', 'Active Sites', 'المواقع النشطة'); K('k_sdone', 'Completed Site Activities (Tasks)', 'أنشطة موقع مكتملة (مهام)'); K('k_spend', 'Pending Site Activities (Tasks)', 'أنشطة موقع معلقة (مهام)'); K('k_sover', 'Overdue Site Activities (Tasks)', 'أنشطة موقع متأخرة (مهام)'); K('k_sappr', 'Pending Approvals', 'موافقات معلقة'); K('k_sissue', 'Open Issues / Site Requests', 'مشاكل / طلبات موقع مفتوحة');
K('k_massign', 'Total Assigned Employees', 'إجمالي الموظفين المسندين'); K('k_mactive', 'Employees on Active Projects', 'موظفون على مشاريع نشطة'); K('k_mpres', 'Assigned – Present Today', 'المسندون – حاضرون اليوم'); K('k_mabs', 'Assigned – Absent Today', 'المسندون – غائبون اليوم'); K('k_mleave', 'Assigned – On Leave Today', 'المسندون – في إجازة اليوم'); K('k_mts', 'Pending Timesheets (Draft)', 'سجلات وقت معلقة (مسودة)');
K('k_mdept', 'Department Roster (active employees)', 'قائمة القسم (موظفون نشطون)'); K('k_mdpres', 'Department – Present Today', 'القسم – حاضرون اليوم'); K('k_mdabs', 'Department – Absent Today', 'القسم – غائبون اليوم'); K('k_mdleave', 'Department – On Leave Today', 'القسم – في إجازة اليوم');
K('k_xmr', 'Pending Material Requests', 'طلبات مواد معلقة'); K('k_xpo', 'Pending Purchase Orders', 'أوامر شراء معلقة'); K('k_xrcpt', 'Pending Material Receipts (PO lines)', 'استلامات مواد معلقة (بنود أوامر الشراء)'); K('k_xissue', 'Material Issues (Stock Entry)', 'صرف مواد (قيد مخزون)'); K('k_xrecv', 'Material Receipts (Stock Entry)', 'استلام مواد (قيد مخزون)'); K('k_xret', 'Material Returns (Delivery Note returns)', 'مرتجعات مواد (مرتجعات إشعار التسليم)');
K('k_xout_order', 'Outstanding to Order (MR lines)', 'متبقٍ للطلب (بنود طلب المواد)'); K('k_xout_recv', 'Outstanding to Receive (PO lines)', 'متبقٍ للاستلام (بنود أوامر الشراء)'); K('k_xrepl', 'Materials Requiring Replenishment', 'مواد تحتاج إعادة تموين');
K('k_etotal', 'Assets (visible to you)', 'الأصول (المتاحة لك)'); K('k_emaint', 'Assets In Maintenance', 'أصول قيد الصيانة'); K('k_eooo', 'Assets Out of Order', 'أصول معطّلة'); K('k_erepair', 'Pending Asset Repairs', 'إصلاحات أصول معلقة'); K('k_vehicles', 'Vehicles (visible to you)', 'المركبات (المتاحة لك)');
K('k_euse', 'Equipment in Use / Available', 'معدات قيد الاستخدام / متاحة'); K('k_eoverret', 'Overdue Equipment Returns', 'مرتجعات معدات متأخرة'); K('k_ealloc', 'Equipment Allocation by Project / Site', 'توزيع المعدات حسب المشروع / الموقع'); K('k_esched', 'Maintenance Schedules / Visits / Plans', 'جداول / زيارات / خطط الصيانة');
K('k_fbudget', 'Project Budget (estimated costing)', 'ميزانية المشاريع (التكلفة المقدّرة)'); K('k_factual', 'Actual Project Cost (ERP-recorded)', 'التكلفة الفعلية (مسجلة في ERP)'); K('k_futil', 'Budget Utilization', 'استخدام الميزانية'); K('k_fvar', 'Cost Variance (budgeted projects)', 'انحراف التكلفة (المشاريع ذات الميزانية)');
K('k_fcommit', 'Open Purchase Commitments', 'التزامات الشراء المفتوحة'); K('k_fsup', 'Supplier Outstanding (submitted)', 'مستحقات الموردين (مقدّمة)'); K('k_fcust', 'Customer Outstanding (submitted)', 'مستحقات العملاء (مقدّمة)'); K('k_frev', 'Project Revenue (invoiced)', 'إيراد المشاريع (مفوتر)'); K('k_fsales', 'Sales Orders Value', 'قيمة أوامر البيع'); K('k_fmargin', 'Gross Margin (ERP-calculated estimate)', 'هامش الربح (تقدير محسوب)');
K('k_fdsi', 'Draft Sales Invoices (not included)', 'فواتير مبيعات مسودة (غير محسوبة)'); K('k_fdpi', 'Draft Purchase Invoices (not included)', 'فواتير شراء مسودة (غير محسوبة)');
K('k_tall', 'All Tasks', 'جميع المهام'); K('k_tdone', 'Completed Tasks', 'المهام المكتملة'); K('k_tpend', 'Pending Tasks', 'المهام المعلقة'); K('k_tover', 'Overdue Tasks', 'المهام المتأخرة');
/* notes */
K('na_hold', 'Project.status only has Open / Completed / Cancelled in this ERP — there is no On Hold status.', 'حالة المشروع في هذا النظام: مفتوح / مكتمل / ملغى فقط — لا توجد حالة معلّق.');
K('na_site', 'Projects and Tasks have no Site / Location field in this ERP, so sites cannot be counted or grouped.', 'لا يوجد حقل موقع في المشاريع أو المهام، لذا لا يمكن عدّ المواقع أو تجميعها.');
K('na_appr', 'Approvals run through per-DocType workflows with no project link, so project-level pending approvals cannot be identified reliably.', 'تتم الموافقات عبر مسارات عمل لكل مستند دون ربط بالمشروع، لذا لا يمكن تحديدها.');
K('na_repl', 'Reorder levels are held in custom Item fields and Bins are not project-specific, so a reliable department-level replenishment list is not possible.', 'مستويات إعادة الطلب في حقول مخصصة والأرصدة غير مرتبطة بالمشروع.');
K('na_equse', 'Assets have no project/site allocation, return date or usage-status field, so in-use / available / overdue-return / allocation metrics cannot be calculated.', 'لا تحتوي الأصول على حقول تخصيص مشروع/موقع أو تاريخ إرجاع أو حالة استخدام.');
K('na_load', 'Could not load.', 'تعذّر التحميل.');
K('n_scope', 'Scope: projects where Company = "Durar Masagh Contracting Co." OR Project.custom_division = "Contracting" (change the Company filter to view a single company). Every project-linked figure below is limited to these projects. The date filter applies to transactions and trends; project and budget totals are cumulative.', 'النطاق: المشاريع التي الشركة فيها "Durar Masagh Contracting Co." أو القسم "Contracting". كل الأرقام المرتبطة بالمشاريع محدودة بهذه المشاريع. يطبَّق مرشح التاريخ على المعاملات والاتجاهات؛ إجماليات المشاريع والميزانيات تراكمية.');
K('n_link', 'Most ERP records are not linked to these projects (tasks, orders, invoices, stock entries and timesheets carry a project reference only occasionally). Zero values therefore mean "no linked records", not "no activity".', 'معظم السجلات غير مرتبطة بهذه المشاريع، لذا تعني القيمة صفر "لا سجلات مرتبطة" وليس "لا نشاط".');
K('n_prog', 'Progress = Project.percent_complete as stored by ERPNext (method shown per project: Manual / Task Completion / Task Progress / Task Weight). No progress is derived from document statuses. Task completion % in the detail view = completed tasks ÷ total tasks of the project.', 'التقدم = قيمة percent_complete المخزنة في ERPNext (الطريقة تظهر لكل مشروع). لا يُشتق تقدم من حالات المستندات. نسبة المهام في التفاصيل = المكتملة ÷ الإجمالي.');
K('n_delay', 'Delay rules: a project is delayed only when Status = Open and a valid Expected End Date is earlier than today. A task is overdue when its status is Overdue, or when it is not Completed/Cancelled and its Expected End Date is earlier than today. Missing dates are never treated as overdue.', 'قواعد التأخير: المشروع متأخر فقط إذا كانت حالته مفتوحة وتاريخ الانتهاء المتوقع قبل اليوم. لا تُعتبر التواريخ الفارغة تأخيراً.');
K('n_man', 'Assigned employees = distinct employees reached through Project User (user → Employee.user_id), ToDo assignments on the projects\' tasks, and Timesheets with that project. Department roster = active employees whose Department matches the projects\' departments (NOT a project assignment). Salary and contact details are never loaded.', 'الموظفون المسندون = الموظفون عبر مستخدمي المشروع وتكليفات ToDo وسجلات الوقت. قائمة القسم = موظفون نشطون في أقسام المشاريع (وليست تكليفاً). لا تُحمَّل الرواتب ولا بيانات الاتصال.');
K('n_mat', 'Quantities are shown per UOM and are never added across different UOMs. MR lines ("to order") and PO lines ("to receive") are different pipeline stages and are never summed together. Lines are read from the item tables where Project is set.', 'تُعرض الكميات لكل وحدة قياس ولا تُجمع عبر وحدات مختلفة. بنود طلب المواد وبنود أمر الشراء مراحل مختلفة ولا تُجمع.');
K('n_fin', 'Methodology — Budget: Project.estimated_costing. Actual cost: Project.total_costing_amount + total_purchase_cost + total_consumed_material_cost (values ERPNext maintains from submitted Timesheets, Purchase Invoices and Stock Entries). Utilization and variance use only projects whose budget is > 0. Revenue: Project.total_billed_amount (submitted Sales Invoices). Customer/Supplier outstanding: submitted Sales/Purchase Invoices linked to the projects (draft invoices are listed separately and excluded). Commitments: Σ(PO line amount − billed amount) on submitted POs, not double-counted with invoices. Gross margin is ERPNext\'s own estimate. Company-wide transactions are never allocated to projects.', 'المنهجية — الميزانية: estimated_costing. التكلفة الفعلية: مجموع total_costing_amount و total_purchase_cost و total_consumed_material_cost (تحدّثها ERPNext من المستندات المقدّمة). الإيراد: total_billed_amount. المستحقات: فواتير مقدّمة مرتبطة بالمشاريع (المسودات تُعرض منفصلة). الالتزامات: مجموع (مبلغ بند أمر الشراء − المفوتر). هامش الربح تقدير من ERPNext. لا تُوزَّع معاملات الشركة على المشاريع.');
K('n_bud', 'Budget DocTypes in this ERP are Cost-Center budgets (FY2024); no Project budgets exist, so budget-vs-actual by cost center is not computed — the budgets are listed for reference.', 'ميزانيات النظام مرتبطة بمراكز التكلفة (2024) ولا توجد ميزانيات مشاريع، لذا لا يُحسب الفعلي مقابل الميزانية لمراكز التكلفة؛ تُعرض الميزانيات للمرجع.');
K('n_eq', 'Equipment is not linked to projects in this ERP. Assets / Vehicles shown are all records visible to you (Company / Department filters apply to Assets). Images appear only where the record has an image file.', 'المعدات غير مرتبطة بالمشاريع. تُعرض كل الأصول/المركبات المتاحة لك. تظهر الصور فقط عند وجود ملف صورة.');
K('n_color', 'Colors — Green: completed · Blue: in progress · Yellow: pending · Orange: partial · Red: overdue/critical · Grey: on hold/cancelled.', 'الألوان — أخضر: مكتمل · أزرق: قيد التنفيذ · أصفر: معلق · برتقالي: جزئي · أحمر: متأخر/حرج · رمادي: معلّق/ملغى.');
K('n_rep', 'Reports use the filters above. Exports contain the fully loaded rows (up to 5,000 per report); a notice appears if a report was truncated.', 'تستخدم التقارير المرشحات أعلاه. يحتوي التصدير على الصفوف المحمّلة (حتى 5000)، ويظهر تنبيه عند الاقتطاع.');
K('scope_cap', 'Project scope was truncated at 2,000 projects.', 'تم اقتطاع نطاق المشاريع عند 2000 مشروع.');
K('sel_wh', 'Select a Warehouse in the filter bar to list its stock.', 'اختر مستودعاً من المرشحات لعرض مخزونه.');
/* panels */
K('p_status', 'Project Status Distribution', 'توزيع حالات المشاريع'); K('p_monthly', 'Monthly Project Activity (projects created)', 'النشاط الشهري للمشاريع (المشاريع المنشأة)'); K('p_compare', 'Project Completion Comparison (stored progress)', 'مقارنة إنجاز المشاريع (التقدم المخزّن)'); K('p_manpow', 'Manpower Allocation by Project', 'توزيع القوى العاملة حسب المشروع');
K('p_issued', 'Materials Issued by Project (Stock Entries)', 'المواد المصروفة حسب المشروع (قيود المخزون)'); K('p_equtil', 'Asset Status Distribution', 'توزيع حالات الأصول'); K('p_proc', 'Monthly Procurement Activity (POs)', 'النشاط الشهري للمشتريات (أوامر الشراء)'); K('p_attn', 'Projects Requiring Attention', 'مشاريع تتطلب اهتماماً');
K('p_recent', 'Recent Department Activity', 'النشاط الأخير للقسم'); K('p_plist', 'Project List', 'قائمة المشاريع'); K('p_pcards', 'Project Status Cards', 'بطاقات حالة المشاريع'); K('p_site', 'Site-wise Overview', 'نظرة عامة حسب الموقع'); K('p_dept', 'Department-wise Overview (substitute for sites)', 'نظرة عامة حسب القسم (بديل عن المواقع)');
K('p_timeline', 'Project Timeline (expected start → end)', 'الجدول الزمني للمشاريع (البدء ← الانتهاء المتوقع)'); K('p_upc', 'Upcoming Deadlines', 'المواعيد القادمة'); K('p_delayed', 'Delayed Projects', 'المشاريع المتأخرة'); K('p_tcomp', 'Completed vs Pending Tasks', 'المهام المكتملة مقابل المعلقة'); K('p_tproj', 'Project-wise Task Progress', 'تقدم المهام حسب المشروع');
K('p_temp', 'Employee-wise Task Allocation', 'توزيع المهام حسب الموظف'); K('p_tlist', 'Task List', 'قائمة المهام'); K('p_overd', 'Overdue Activities', 'الأنشطة المتأخرة'); K('p_miles', 'Upcoming Milestones (tasks flagged milestone)', 'المعالم القادمة (مهام محددة كمعلم)');
K('p_emptable', 'Employee Allocation', 'توزيع الموظفين'); K('p_roster', 'Department Roster (not a project assignment)', 'قائمة القسم (ليست تكليفاً بمشروع)'); K('p_atrend', 'Attendance Trend – Department (last 6 months)', 'اتجاه الحضور – القسم (آخر 6 أشهر)'); K('p_tspend', 'Pending Timesheets', 'سجلات الوقت المعلقة'); K('p_avail', 'Today\'s Availability – Assigned Employees', 'توفر اليوم – الموظفون المسندون');
K('p_mr', 'Material Request Lines', 'بنود طلبات المواد'); K('p_po', 'Purchase Order Lines', 'بنود أوامر الشراء'); K('p_se', 'Stock Entry Lines (issues / receipts / transfers)', 'بنود قيود المخزون (صرف / استلام / نقل)'); K('p_pipe', 'Procurement Pipeline (documents)', 'مسار المشتريات (مستندات)'); K('p_itemw', 'Item-wise Consumption (Stock Entry issues, per UOM)', 'الاستهلاك حسب الصنف (صرف المخزون، لكل وحدة)'); K('p_bin', 'Warehouse Stock (Bin)', 'مخزون المستودع (Bin)');
K('p_assets', 'Assets', 'الأصول'); K('p_vehicles', 'Vehicles', 'المركبات'); K('p_repairs', 'Asset Repairs', 'إصلاحات الأصول');
K('p_pfin', 'Project-wise Financial Summary', 'الملخص المالي حسب المشروع'); K('p_mtrend', 'Monthly Income & Expense (project-linked, submitted invoices)', 'الدخل والمصروف الشهري (فواتير مقدّمة مرتبطة بالمشاريع)'); K('p_bva', 'Budget vs Actual (projects with a budget)', 'الميزانية مقابل الفعلي (مشاريع ذات ميزانية)'); K('p_psi', 'Pending Customer Invoices', 'فواتير العملاء المعلقة'); K('p_ppi', 'Pending Supplier Invoices', 'فواتير الموردين المعلقة'); K('p_budgets', 'Cost-Center Budgets (reference)', 'ميزانيات مراكز التكلفة (للمرجع)');
K('p_delays', 'Delays, Risks & Open Items', 'التأخيرات والمخاطر والبنود المفتوحة'); K('p_dna', 'Not available in this ERP', 'غير متاح في هذا النظام');
K('p_det', 'Project Detail', 'تفاصيل المشروع'); K('p_dtasks', 'Related Tasks', 'المهام المرتبطة'); K('p_dman', 'Related Manpower', 'القوى العاملة المرتبطة'); K('p_dmat', 'Related Material Transactions', 'معاملات المواد المرتبطة'); K('p_deq', 'Related Equipment', 'المعدات المرتبطة'); K('p_dfin', 'Related Financial Records', 'السجلات المالية المرتبطة');
K('inc', 'Income', 'الدخل'); K('exp', 'Expense', 'المصروف'); K('lt_delayed', 'Delayed project', 'مشروع متأخر'); K('lt_task', 'Overdue task', 'مهمة متأخرة'); K('lt_po', 'PO line past required date, not fully received', 'بند أمر شراء تجاوز التاريخ المطلوب دون استلام كامل'); K('lt_mr', 'MR line past required date, not fully ordered', 'بند طلب مواد تجاوز التاريخ المطلوب دون طلب كامل'); K('lt_upc', 'Deadline within 14 days', 'موعد خلال 14 يوماً'); K('lt_overrun', 'Cost exceeds budget', 'التكلفة تتجاوز الميزانية'); K('lt_issue', 'Open issue', 'مشكلة مفتوحة'); K('lt_repair', 'Pending asset repair', 'إصلاح أصل معلق');
K('st_Critical', 'Critical', 'حرج'); K('st_Partially Completed', 'Partially Completed', 'مكتمل جزئياً'); K('st_Upcoming', 'Upcoming', 'قادم'); K('st_Active', 'Active', 'نشط'); K('st_Medium', 'Medium', 'متوسط'); K('st_High', 'High', 'عالٍ'); K('st_Low', 'Low', 'منخفض'); K('st_Urgent', 'Urgent', 'عاجل');
K('rep_perf', 'Project performance report', 'تقرير أداء المشاريع'); K('rep_tproj', 'Project-wise task completion', 'إنجاز المهام حسب المشروع'); K('rep_site', 'Site-wise progress', 'التقدم حسب الموقع'); K('rep_man', 'Manpower allocation report', 'تقرير توزيع القوى العاملة'); K('rep_att', 'Attendance summary (department)', 'ملخص الحضور (القسم)');
K('rep_mat', 'Material consumption report', 'تقرير استهلاك المواد'); K('rep_proc', 'Procurement status report', 'تقرير حالة المشتريات'); K('rep_equip', 'Equipment status report', 'تقرير حالة المعدات'); K('rep_bva', 'Project budget vs actual report', 'تقرير الميزانية مقابل الفعلي'); K('rep_delay', 'Delayed activities report', 'تقرير الأنشطة المتأخرة'); K('rep_month', 'Monthly department performance', 'الأداء الشهري للقسم');
K('open_report', 'Open report', 'فتح التقرير'); K('back_list', 'Open project detail', 'فتح تفاصيل المشروع'); K('erp_doc', 'Open in ERP', 'فتح في ERP'); K('proj_created', 'Projects created', 'مشاريع أنشأت'); K('tasks_completed', 'Tasks completed', 'مهام مكتملة'); K('projs_completed', 'Projects completed', 'مشاريع مكتملة'); K('pos_created', 'Purchase orders', 'أوامر شراء'); K('no_proj', 'No projects match the current scope and filters.', 'لا توجد مشاريع ضمن النطاق والمرشحات الحالية.');
K('st_Not marked', 'Not marked', 'غير مسجل'); K('dt_Task', 'Task', 'مهمة'); K('dt_Project', 'Project', 'مشروع'); K('dt_Purchase Order', 'Purchase Order', 'أمر شراء'); K('dt_Material Request', 'Material Request', 'طلب مواد'); K('dt_Stock Entry', 'Stock Entry', 'قيد مخزون'); K('dt_Issue', 'Issue', 'مشكلة');

var APP = { filters: [], tabs: [] };
APP.filters = [
  { k: 'company', type: 'select', lbl: 'f_company', opts: function () { return [{ v: '', lk: 'f_scope' }].concat((S.ctx.companies || []).map(function (c) { return { v: c, l: c }; })); } },
  { k: 'department', type: 'select', lbl: 'f_dept', opts: function () { return [{ v: '', lk: 'all' }].concat((S.ctx.departments || []).map(function (c) { return { v: c, l: c }; })); } },
  { k: 'project', type: 'text', lbl: 'f_project' }, { k: 'customer', type: 'text', lbl: 'f_customer' }, { k: 'supplier', type: 'text', lbl: 'f_supplier' }, { k: 'employee', type: 'text', lbl: 'f_employee' },
  { k: 'warehouse', type: 'select', lbl: 'f_wh', opts: function () { return [{ v: '', lk: 'all' }].concat((S.ctx.warehouses || []).map(function (c) { return { v: c, l: c }; })); } },
  { k: 'from', type: 'date', lbl: 'from' }, { k: 'to', type: 'date', lbl: 'to' },
  { k: 'ds', type: 'select', lbl: 'docstatus', opts: function () { return [{ v: '', lk: 'all' }, { v: '0', lk: 'st_Draft' }, { v: '1', lk: 'st_Submitted' }, { v: '2', lk: 'st_Cancelled' }]; } }
];
APP.tabs = [
  { id: 'ov', label: 'tab_ov', render: tabOverview }, { id: 'pr', label: 'tab_pr', render: tabProjects }, { id: 'wp', label: 'tab_wp', render: tabWork }, { id: 'mp', label: 'tab_mp', render: tabManpower },
  { id: 'mt', label: 'tab_mt', render: tabMaterials }, { id: 'eq', label: 'tab_eq', render: tabEquipment }, { id: 'fi', label: 'tab_fi', render: tabFinance }, { id: 'dl', label: 'tab_dl', render: tabDelays }, { id: 'rp', label: 'tab_rp', render: tabReports }
];

/* ---------- scope ---------- */
var PF = ['name', 'project_name', 'status', 'percent_complete', 'percent_complete_method', 'expected_start_date', 'expected_end_date', 'actual_end_date', 'customer', 'company', 'department', 'cost_center', 'priority', 'project_type', 'custom_division', 'estimated_costing', 'total_costing_amount', 'total_purchase_cost', 'total_consumed_material_cost', 'total_sales_amount', 'total_billed_amount', 'gross_margin', 'creation'];
APP.init = function () {
  /* period and filters come from the kit filter bar */
  onceClick(function (e) { var a = e.target.closest && e.target.closest('[data-pd]'); if (a) { e.preventDefault(); openProject(a.getAttribute('data-pd')); } });
  return Promise.all([
    gl('Company', { fields: ['name'], limit: 100 }).then(function (r) { S.ctx.companies = r.map(function (x) { return x.name; }); }),
    gl('Department', { fields: ['name'], filters: [['disabled', '=', 0]], order: 'name asc', limit: 300 }).then(function (r) { S.ctx.departments = r.map(function (x) { return x.name; }); }, function () { S.ctx.departments = []; }),
    gl('Warehouse', { fields: ['name'], filters: [['disabled', '=', 0], ['is_group', '=', 0]], order: 'name asc', limit: 300 }).then(function (r) { S.ctx.warehouses = r.map(function (x) { return x.name; }); }, function () { S.ctx.warehouses = []; })
  ]);
};
function loadScope() {
  var f = [], or = null;
  if (S.f.company) { f.push(['company', '=', S.f.company]); } else { or = [['company', '=', DMCC], ['custom_division', '=', 'Contracting']]; }
  if (S.f.department) { f.push(['department', '=', S.f.department]); }
  return fetchAll('Project', { fields: PF, filters: f, or: or, order: 'modified desc' }, 2000).then(function (r) {
    var rows = r.rows, pt = (S.f.project || '').toLowerCase(), cu = (S.f.customer || '').toLowerCase();
    if (pt) { rows = rows.filter(function (p) { return (p.name + ' ' + (p.project_name || '')).toLowerCase().indexOf(pt) >= 0; }); }
    if (cu) { rows = rows.filter(function (p) { return (p.customer || '').toLowerCase().indexOf(cu) >= 0; }); }
    S.ctx.scope = { projects: rows, names: rows.map(function (p) { return p.name; }), total: r.total, truncated: r.truncated };
    S.ctx.pmap = {}; rows.forEach(function (p) { S.ctx.pmap[p.name] = p; });
  });
}
APP.prepare = function () { var key = JSON.stringify([S.f.company, S.f.department, S.f.project, S.f.customer]); if (S.ctx.key !== key || !S.ctx.scopeP) { S.ctx.key = key; S.ctx.scopeP = loadScope(); } return S.ctx.scopeP; };
function SC() { return S.ctx.scope; }
function PIN() { return SC().names.length ? SC().names : NONE; }
function SK() { return JSON.stringify([S.ctx.key, S.f.from, S.f.to, S.f.ds, S.f.supplier, S.f.warehouse, S.f.employee]); }
function mm(name, fn) { return memo(name + '|' + SK(), fn); }
function dsF(field) { var f = [[field || 'docstatus', '<', 2]]; if (S.f.ds !== '' && S.f.ds !== undefined) { f = [['docstatus', '=', Number(S.f.ds)]]; } return f; }
function inRange(d) { return d && d >= (S.f.from || '0000') && d <= (S.f.to || '9999'); }
function isOpen(p) { return p.status === 'Open'; }
function isDelayed(p) { return isOpen(p) && p.expected_end_date && p.expected_end_date < TODAY; }
function isUpcoming(p) { return isOpen(p) && p.expected_end_date && p.expected_end_date >= TODAY && p.expected_end_date <= addDays(TODAY, 30); }
function projPill(p) { if (p.status === 'Completed') { return pill(st('Completed'), 'g'); } if (p.status === 'Cancelled') { return pill(st('Cancelled'), 'n'); } return isDelayed(p) ? pill(st('Overdue'), 'r') : pill(st('In Progress'), 'b'); }
function projLink(p) { return '<a href="#" class="dmcon-lnk" data-pd="' + esc(p.name) + '">' + esc(p.name) + '</a> <a class="dmcon-lnk" target="_blank" rel="noopener" title="' + esc(t('erp_doc')) + '" href="' + esc(docUrl('Project', p.name)) + '">↗</a>'; }
function projCols() {
  return [
    { h: 'c_id', c: function (p) { return p.name; }, f: projLink }, { h: 'c_name', c: function (p) { return p.project_name || ''; } }, { h: 'c_cust', c: function (p) { return p.customer || ''; } }, { h: 'c_dept', c: function (p) { return p.department || ''; } },
    { h: 'c_start', c: function (p) { return p.expected_start_date || ''; } }, { h: 'c_end', c: function (p) { return p.expected_end_date || ''; } }, { h: 'c_aend', c: function (p) { return p.actual_end_date || ''; } },
    { h: 'c_status', c: function (p) { return p.status === 'Open' && isDelayed(p) ? st('Overdue') : st(p.status); }, f: projPill }, { h: 'c_prio', c: function (p) { return p.priority || ''; } },
    { h: 'c_budget', num: true, c: function (p) { return p.estimated_costing > 0 ? n(p.estimated_costing, 2) : ''; } },
    { h: 'c_actual', num: true, c: function (p) { return actualCost(p) > 0 ? n(actualCost(p), 2) : ''; } },
    { h: 'c_prog', c: function (p) { return n(p.percent_complete, 0) + '%'; }, f: function (p) { return pbar(p.percent_complete, p.status === 'Completed' ? COL.g : COL.b); } }, { h: 'c_method', c: function (p) { return p.percent_complete_method || ''; } }
  ];
}
function actualCost(p) { return (Number(p.total_costing_amount) || 0) + (Number(p.total_purchase_cost) || 0) + (Number(p.total_consumed_material_cost) || 0); }
function pSpec(id, pred, order) { var rows = SC().projects.filter(pred || function () { return true; }); if (order) { rows = rows.slice().sort(order); } return { id: id, rows: rows, cols: projCols() }; }
function byEnd(a, b) { return String(a.expected_end_date || '9999').localeCompare(String(b.expected_end_date || '9999')); }
function sSpec(id, rowsP, cols) { return { id: id, rowsP: rowsP, cols: cols }; }
function simple(items, k) { return items.length ? '<ul class="dmcon-list">' + items.join('') + '</ul>' : '<div class="dmcon-empty">' + esc(t(k || 'empty')) + '</div>'; }
function addPanel(el, k, cls) { var p = panel(k, cls); el.insertAdjacentHTML('beforeend', p.html); return pel(p); }
function addGrid(v, cls) { var g = document.createElement('div'); g.className = 'dmcon-grid ' + cls; v.appendChild(g); return g; }
function addKpis(v, my, defs) { var g = addGrid(v, 'dmcon-kg'); kpis(g, my, defs); }
function listPanel(el, my, k, spec) { listView(addPanel(el, k), my, spec); }
function infoBox(v, keys, cls) { v.insertAdjacentHTML('beforeend', '<div class="dmcon-' + (cls || 'info') + '">' + keys.map(function (k) { return esc(t(k)); }).join(' ') + '</div>'); }
function scopeNote(v) { infoBox(v, ['n_scope', 'n_link']); if (SC().truncated) { infoBox(v, ['scope_cap'], 'note'); } if (!SC().names.length) { infoBox(v, ['no_proj'], 'note'); } }
function kv(label, value) { return '<div><span>' + esc(t(label)) + '</span><b>' + esc(value === null || value === undefined || value === '' ? '—' : value) + '</b></div>'; }
function moneyHtml(v) { return n(v, 2); }
function qtyHtml(m) { var ks = Object.keys(m).filter(function (k) { return m[k]; }); return ks.length ? ks.map(function (u) { return n(m[u], 2) + ' <small>' + esc(u) + '</small>'; }).join(' · ') : '0'; }

/* ---------- tasks (server-side) ---------- */
var OPEN_ST = ['Open', 'Working', 'Pending Review'], DONE_ST = ['Completed', 'Cancelled', 'Template'];
function tkF(extra) { return [['project', 'in', PIN()]].concat(extra || []); }
var OVR = function () { return [['status', '=', 'Overdue'], ['exp_end_date', '<', TODAY]]; };
function empNames(users) { if (!users.length) { return Promise.resolve({}); } return gl('Employee', { fields: ['user_id', 'employee_name'], filters: [['user_id', 'in', users]], limit: 500 }).then(function (r) { var m = {}; r.forEach(function (e) { m[e.user_id] = e.employee_name; }); return m; }, function () { return {}; }); }
function tkPost(rows) {
  if (!rows.length) { return rows; }
  return gl('ToDo', { fields: ['reference_name', 'allocated_to'], filters: [['reference_type', '=', 'Task'], ['reference_name', 'in', rows.map(function (r) { return r.name; })], ['status', '!=', 'Cancelled']], limit: 500 }).then(function (td) {
    var m = {}; td.forEach(function (x) { (m[x.reference_name] = m[x.reference_name] || []).push(x.allocated_to); });
    return empNames(uniq(td.map(function (x) { return x.allocated_to; }))).then(function (en) { rows.forEach(function (r) { r._asg = (m[r.name] || []).map(function (u) { return en[u] || u; }).join(', '); }); return rows; });
  }, function () { return rows; });
}
function tOver(r) { return r.exp_end_date && DONE_ST.indexOf(r.status) < 0 && r.exp_end_date < TODAY ? daysBetween(r.exp_end_date, TODAY) : ''; }
function tkSpec(id, extra, order, orf) {
  return {
    id: id, dt: 'Task', fields: ['name', 'subject', 'project', 'priority', 'exp_start_date', 'exp_end_date', 'act_end_date', 'completed_on', 'progress', 'status'], filters: tkF(extra), or: orf, order: order || 'exp_end_date asc', search: ['subject', 'name'], post: tkPost,
    cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Task', r.name); } }, { h: 'c_subject', c: function (r) { return r.subject; } }, { h: 'c_project', c: function (r) { return r.project || ''; }, f: function (r) { return r.project ? '<a href="#" class="dmcon-lnk" data-pd="' + esc(r.project) + '">' + esc(r.project) + '</a>' : ''; } },
      { h: 'c_asg', c: function (r) { return r._asg || ''; } }, { h: 'c_prio', c: function (r) { return r.priority || ''; } }, { h: 'c_tstart', c: function (r) { return r.exp_start_date || ''; } }, { h: 'c_end', c: function (r) { return r.exp_end_date || ''; } }, { h: 'c_done', c: function (r) { return r.completed_on || r.act_end_date || ''; } },
      { h: 'c_prog', c: function (r) { return r.progress === null ? '' : n(r.progress, 0) + '%'; }, f: function (r) { return pbar(r.progress, COL.b); } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_over', num: true, c: tOver }]
  };
}
var TK = {
  all: function () { return { label: 'k_tall', tone: 'blue', load: function () { return cnt('Task', { filters: tkF() }).then(function (v) { return { v: v }; }); }, spec: function () { return tkSpec('tk_all', []); } }; },
  done: function (lab) { return { label: lab || 'k_tdone', tone: 'green', load: function () { return cnt('Task', { filters: tkF([['status', '=', 'Completed']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return tkSpec('tk_done', [['status', '=', 'Completed']], 'modified desc'); } }; },
  pend: function (lab) { return { label: lab || 'k_tpend', tone: 'yellow', load: function () { return cnt('Task', { filters: tkF([['status', 'in', OPEN_ST]]) }).then(function (v) { return { v: v }; }); }, spec: function () { return tkSpec('tk_pend', [['status', 'in', OPEN_ST]]); } }; },
  over: function (lab) { return { label: lab || 'k_tover', tone: 'red', load: function () { return cnt('Task', { filters: tkF([['status', 'not in', DONE_ST]]), or: OVR() }).then(function (v) { return { v: v }; }); }, spec: function () { return tkSpec('tk_over', [['status', 'not in', DONE_ST]], 'exp_end_date asc', OVR()); } }; }
};
/* ---------- projects KPIs ---------- */
var PK = {
  total: function () { return { label: 'k_ptotal', tone: 'blue', load: function () { return Promise.resolve({ v: SC().projects.length }); }, spec: function () { return pSpec('pk_total'); } }; },
  active: function () { return { label: 'k_pactive', tone: 'blue', load: function () { return Promise.resolve({ v: SC().projects.filter(isOpen).length }); }, spec: function () { return pSpec('pk_act', isOpen); } }; },
  done: function () { return { label: 'k_pdone', tone: 'green', load: function () { return Promise.resolve({ v: SC().projects.filter(function (p) { return p.status === 'Completed'; }).length }); }, spec: function () { return pSpec('pk_done', function (p) { return p.status === 'Completed'; }); } }; },
  hold: function () { return { label: 'k_phold', tone: 'grey', unavail: 'na_hold' }; },
  delay: function () { return { label: 'k_pdelay', tone: 'red', load: function () { return Promise.resolve({ v: SC().projects.filter(isDelayed).length }); }, spec: function () { return pSpec('pk_delay', isDelayed, byEnd); } }; },
  upc: function () { return { label: 'k_pupc', tone: 'orange', load: function () { return Promise.resolve({ v: SC().projects.filter(isUpcoming).length }); }, spec: function () { return pSpec('pk_upc', isUpcoming, byEnd); } }; },
  attn: function () { return { label: 'k_pattn', tone: 'red', load: function () { return attention().then(function (a) { return { v: a.length }; }); }, spec: function () { return attnSpec('pk_attn'); } }; }
};
/* projects requiring attention = delayed OR overdue task OR PO line past date OR cost above a stated budget (all measurable) */
function attention() {
  return mm('attn', function () {
    return Promise.all([
      SC().names.length ? fetchAll('Task', { fields: ['project'], filters: tkF([['status', 'not in', DONE_ST]]), or: OVR() }, 2000) : Promise.resolve({ rows: [] }),
      poLines()
    ]).then(function (r) {
      var reasons = {}; function add(p, k) { (reasons[p] = reasons[p] || []).indexOf(k) < 0 && reasons[p].push(k); }
      SC().projects.forEach(function (p) { if (isDelayed(p)) { add(p.name, 'lt_delayed'); } if (p.estimated_costing > 0 && actualCost(p) > p.estimated_costing) { add(p.name, 'lt_overrun'); } });
      r[0].rows.forEach(function (x) { add(x.project, 'lt_task'); });
      r[1].filter(function (l) { return l.open && l.schedule_date && l.schedule_date < TODAY && l.qty > l.received_qty; }).forEach(function (l) { add(l.project, 'lt_po'); });
      return Object.keys(reasons).filter(function (k) { return SC().names.indexOf(k) >= 0; }).map(function (k) { return { p: S.ctx.pmap[k], reasons: reasons[k] }; });
    });
  });
}
function attnSpec(id) { return sSpec(id, function () { return attention(); }, [{ h: 'c_id', c: function (r) { return r.p.name; }, f: function (r) { return projLink(r.p); } }, { h: 'c_name', c: function (r) { return r.p.project_name || ''; } }, { h: 'c_cust', c: function (r) { return r.p.customer || ''; } }, { h: 'c_end', c: function (r) { return r.p.expected_end_date || ''; } }, { h: 'c_reason', c: function (r) { return r.reasons.map(function (k) { return t(k); }).join('; '); }, f: function (r) { return r.reasons.map(function (k) { return pill(t(k), 'r'); }).join(' '); } }]); }

/* ---------- materials loaders (line tables carry the project; headers carry status) ---------- */
function withHeaders(dt, hfields, lines) {
  var parents = uniq(lines.map(function (l) { return l.parent; }));
  if (!parents.length) { return Promise.resolve([]); }
  return Promise.all(chunk(parents, 400).map(function (c) { return gl(dt, { fields: hfields, filters: [['name', 'in', c]], limit: 400 }); })).then(function (ps) {
    var hm = {}; ps.forEach(function (p) { p.forEach(function (h) { hm[h.name] = h; }); });
    return lines.map(function (l) { return { l: l, h: hm[l.parent] || {} }; });
  });
}
function poLines() {
  return mm('polines', function () {
    if (!SC().names.length) { return Promise.resolve([]); }
    return fetchAll('Purchase Order Item', { parent: 'Purchase Order', fields: ['parent', 'item_code', 'item_name', 'qty', 'received_qty', 'billed_amt', 'amount', 'uom', 'warehouse', 'project', 'schedule_date', 'docstatus'], filters: [['project', 'in', PIN()], ['docstatus', '<', 2]] }, 2000).then(function (r) {
      return withHeaders('Purchase Order', ['name', 'status', 'transaction_date', 'supplier', 'docstatus'], r.rows).then(function (rows) {
        return rows.map(function (x) { var l = x.l, h = x.h; return { parent: l.parent, item_code: l.item_code, item_name: l.item_name, qty: Number(l.qty) || 0, received_qty: Number(l.received_qty) || 0, billed_amt: Number(l.billed_amt) || 0, amount: Number(l.amount) || 0, uom: l.uom, warehouse: l.warehouse, project: l.project, schedule_date: l.schedule_date, docstatus: h.docstatus === undefined ? l.docstatus : h.docstatus, status: h.status, date: h.transaction_date, supplier: h.supplier, open: h.docstatus === 1 && ['Closed', 'Cancelled', 'Completed'].indexOf(h.status) < 0 }; });
      });
    });
  });
}
function mrLines() {
  return mm('mrlines', function () {
    if (!SC().names.length) { return Promise.resolve([]); }
    return fetchAll('Material Request Item', { parent: 'Material Request', fields: ['parent', 'item_code', 'item_name', 'qty', 'ordered_qty', 'uom', 'warehouse', 'project', 'schedule_date', 'docstatus'], filters: [['project', 'in', PIN()], ['docstatus', '<', 2]] }, 2000).then(function (r) {
      return withHeaders('Material Request', ['name', 'status', 'transaction_date', 'material_request_type', 'docstatus'], r.rows).then(function (rows) {
        return rows.map(function (x) { var l = x.l, h = x.h; return { parent: l.parent, item_code: l.item_code, item_name: l.item_name, qty: Number(l.qty) || 0, ordered_qty: Number(l.ordered_qty) || 0, uom: l.uom, warehouse: l.warehouse, project: l.project, schedule_date: l.schedule_date, docstatus: h.docstatus === undefined ? l.docstatus : h.docstatus, status: h.status, date: h.transaction_date, open: h.docstatus === 1 && ['Pending', 'Partially Ordered'].indexOf(h.status) >= 0 }; });
      });
    });
  });
}
function seLines() {
  return mm('selines', function () {
    if (!SC().names.length) { return Promise.resolve([]); }
    return fetchAll('Stock Entry', { fields: ['name', 'stock_entry_type', 'posting_date', 'docstatus', 'project'], filters: [['project', 'in', PIN()], ['docstatus', '<', 2]] }, 2000).then(function (h) {
      if (!h.rows.length) { return []; }
      var hm = {}; h.rows.forEach(function (x) { hm[x.name] = x; });
      return Promise.all(chunk(h.rows.map(function (x) { return x.name; }), 300).map(function (c) { return fetchAll('Stock Entry Detail', { parent: 'Stock Entry', fields: ['parent', 'item_code', 'item_name', 'qty', 'uom', 's_warehouse', 't_warehouse'], filters: [['parent', 'in', c]] }, 2000); })).then(function (ps) {
        var rows = []; ps.forEach(function (p) { p.rows.forEach(function (l) { var x = hm[l.parent] || {}; rows.push({ parent: l.parent, type: x.stock_entry_type, item_code: l.item_code, item_name: l.item_name, qty: Number(l.qty) || 0, uom: l.uom, warehouse: l.s_warehouse || l.t_warehouse, s_wh: l.s_warehouse, t_wh: l.t_warehouse, project: x.project, date: x.posting_date, docstatus: x.docstatus }); }); });
        return rows;
      });
    });
  });
}
function whOk(w) { return !S.f.warehouse || (w && w.indexOf(S.f.warehouse) === 0 && w === S.f.warehouse); }
function supOk(s) { return !S.f.supplier || (s || '').toLowerCase().indexOf(S.f.supplier.toLowerCase()) >= 0; }
function dsOk(d) { return S.f.ds === '' || S.f.ds === undefined ? d < 2 : d === Number(S.f.ds); }
function poView() { return poLines().then(function (rows) { return rows.filter(function (r) { return (!r.date || inRange(r.date)) && supOk(r.supplier) && whOk(r.warehouse) && dsOk(r.docstatus); }); }); }
function mrView() { return mrLines().then(function (rows) { return rows.filter(function (r) { return (!r.date || inRange(r.date)) && whOk(r.warehouse) && dsOk(r.docstatus); }); }); }
function seView() { return seLines().then(function (rows) { return rows.filter(function (r) { return inRange(r.date) && (!S.f.warehouse || r.s_wh === S.f.warehouse || r.t_wh === S.f.warehouse) && dsOk(r.docstatus); }); }); }
function lineCols(kind) {
  var c = [{ h: 'c_doc', c: function (r) { return r.parent; }, f: function (r) { return link(kind === 'po' ? 'Purchase Order' : kind === 'mr' ? 'Material Request' : 'Stock Entry', r.parent); } }];
  if (kind === 'se') { c.push({ h: 'c_type', c: function (r) { return r.type || ''; } }); }
  c = c.concat([{ h: 'c_project', c: function (r) { return r.project || ''; }, f: function (r) { return r.project ? '<a href="#" class="dmcon-lnk" data-pd="' + esc(r.project) + '">' + esc(r.project) + '</a>' : ''; } }, { h: 'c_item', c: function (r) { return r.item_code || ''; } }, { h: 'c_iname', c: function (r) { return r.item_name || ''; } }, { h: 'c_qty', num: true, c: function (r) { return n(r.qty, 2); } }, { h: 'c_uom', c: function (r) { return r.uom || ''; } }, { h: 'c_wh', c: function (r) { return r.warehouse || ''; } }, { h: 'c_date', c: function (r) { return r.date || ''; } }]);
  if (kind === 'po') { c.push({ h: 'c_sup', c: function (r) { return r.supplier || ''; } }); }
  if (kind === 'po' || kind === 'mr') { c.push({ h: 'c_outq', num: true, c: function (r) { return n(Math.max(0, r.qty - (kind === 'po' ? r.received_qty : r.ordered_qty)), 2); } }); }
  c.push({ h: 'c_status', c: function (r) { return r.status ? st(r.status) : (r.docstatus === 1 ? st('Submitted') : st('Draft')); }, f: function (r) { return r.status ? spill(r.status) : dpill(r.docstatus); } });
  return c;
}
function poPendingHeaders(rows) { var m = {}; rows.filter(function (r) { return r.docstatus === 1 && ['To Receive and Bill', 'To Receive'].indexOf(r.status) >= 0; }).forEach(function (r) { m[r.parent] = r; }); return Object.keys(m).map(function (k) { return m[k]; }); }
function uomOut(rows, f) { var m = {}; rows.forEach(function (r) { var o = f(r); if (o > 0) { m[r.uom || '—'] = (m[r.uom || '—'] || 0) + o; } }); return m; }
var XK = {
  mr: function () { return { label: 'k_xmr', tone: 'yellow', load: function () { return mrView().then(function (rows) { var u = {}; rows.filter(function (r) { return r.open; }).forEach(function (r) { u[r.parent] = 1; }); return { v: Object.keys(u).length }; }); }, spec: function () { return sSpec('xk_mr', function () { return mrView().then(function (r) { return r.filter(function (x) { return x.open; }); }); }, lineCols('mr')); } }; },
  po: function () { return { label: 'k_xpo', tone: 'yellow', load: function () { return poView().then(function (rows) { return { v: poPendingHeaders(rows).length }; }); }, spec: function () { return sSpec('xk_po', function () { return poView().then(poPendingHeaders); }, lineCols('po')); } }; },
  rcpt: function () { return { label: 'k_xrcpt', tone: 'orange', load: function () { return poView().then(function (rows) { return { v: rows.filter(function (r) { return r.open && r.qty > r.received_qty; }).length }; }); }, spec: function () { return sSpec('xk_rcpt', function () { return poView().then(function (r) { return r.filter(function (x) { return x.open && x.qty > x.received_qty; }); }); }, lineCols('po')); } }; },
  issue: function () { return { label: 'k_xissue', tone: 'blue', load: function () { return seView().then(function (rows) { return { v: uniq(rows.filter(function (r) { return r.type === 'Material Issue' && r.docstatus === 1; }).map(function (r) { return r.parent; })).length }; }); }, spec: function () { return sSpec('xk_issue', function () { return seView().then(function (r) { return r.filter(function (x) { return x.type === 'Material Issue'; }); }); }, lineCols('se')); } }; },
  recv: function () { return { label: 'k_xrecv', tone: 'green', load: function () { return seView().then(function (rows) { return { v: uniq(rows.filter(function (r) { return r.type === 'Material Receipt' && r.docstatus === 1; }).map(function (r) { return r.parent; })).length }; }); }, spec: function () { return sSpec('xk_recv', function () { return seView().then(function (r) { return r.filter(function (x) { return x.type === 'Material Receipt'; }); }); }, lineCols('se')); } }; },
  ret: function () { return { label: 'k_xret', tone: 'orange', load: function () { return cnt('Delivery Note', { filters: [['project', 'in', PIN()], ['is_return', '=', 1], ['docstatus', '=', 1]] }).then(function (v) { return { v: v }; }); }, spec: function () { return { id: 'xk_ret', dt: 'Delivery Note', fields: ['name', 'posting_date', 'customer', 'project', 'docstatus'], filters: [['project', 'in', PIN()], ['is_return', '=', 1], ['docstatus', '=', 1]], order: 'posting_date desc', search: ['name', 'customer'], cols: [{ h: 'c_doc', c: function (r) { return r.name; }, f: function (r) { return link('Delivery Note', r.name); } }, { h: 'c_date', c: function (r) { return r.posting_date; } }, { h: 'c_cust', c: function (r) { return r.customer || ''; } }, { h: 'c_project', c: function (r) { return r.project || ''; } }] }; } }; },
  outOrder: function () { return { label: 'k_xout_order', tone: 'orange', load: function () { return mrView().then(function (rows) { return { html: qtyHtml(uomOut(rows.filter(function (r) { return r.open; }), function (r) { return r.qty - r.ordered_qty; })) }; }); }, spec: function () { return sSpec('xk_oo', function () { return mrView().then(function (r) { return r.filter(function (x) { return x.open && x.qty > x.ordered_qty; }); }); }, lineCols('mr')); } }; },
  outRecv: function () { return { label: 'k_xout_recv', tone: 'orange', load: function () { return poView().then(function (rows) { return { html: qtyHtml(uomOut(rows.filter(function (r) { return r.open; }), function (r) { return r.qty - r.received_qty; })) }; }); }, spec: function () { return sSpec('xk_or', function () { return poView().then(function (r) { return r.filter(function (x) { return x.open && x.qty > x.received_qty; }); }); }, lineCols('po')); } }; },
  repl: function () { return { label: 'k_xrepl', tone: 'grey', unavail: 'na_repl' }; }
};

/* ---------- manpower ---------- */
var EF = ['name', 'employee_name', 'designation', 'department', 'branch', 'user_id'];
function assigned(openOnly) {
  return mm('assigned' + openOnly, function () {
    var names = openOnly ? SC().projects.filter(isOpen).map(function (p) { return p.name; }) : SC().names;
    if (!names.length) { return Promise.resolve([]); }
    return Promise.all([
      fetchAll('Project User', { parent: 'Project', fields: ['parent', 'user'], filters: [['parent', 'in', names]] }, 2000).catch(function () { return { rows: [] }; }),
      fetchAll('Task', { fields: ['name', 'project', 'status'], filters: [['project', 'in', names]] }, 2000),
      fetchAll('Timesheet', { fields: ['employee', 'parent_project', 'status', 'docstatus'], filters: [['parent_project', 'in', names], ['docstatus', '<', 2]] }, 2000)
    ]).then(function (r) {
      var pu = r[0].rows, tk = r[1].rows, ts = r[2].rows, tkm = {}; tk.forEach(function (x) { tkm[x.name] = x; });
      return (tk.length ? Promise.all(chunk(tk.map(function (x) { return x.name; }), 400).map(function (c) { return gl('ToDo', { fields: ['reference_name', 'allocated_to'], filters: [['reference_type', '=', 'Task'], ['reference_name', 'in', c], ['status', '!=', 'Cancelled']], limit: 2000 }); })) : Promise.resolve([])).then(function (tds) {
        var td = []; tds.forEach(function (x) { td = td.concat(x); });
        var users = uniq(pu.map(function (x) { return x.user; }).concat(td.map(function (x) { return x.allocated_to; })));
        return (users.length ? gl('Employee', { fields: EF, filters: [['user_id', 'in', users], ['status', '=', 'Active']], limit: 1000 }) : Promise.resolve([])).then(function (ers) {
          var byUser = {}, map = {}; ers.forEach(function (e) { byUser[e.user_id] = e; });
          function row(e) { return map[e.name] || (map[e.name] = { id: e.name, name: e.employee_name, designation: e.designation, department: e.department, branch: e.branch, projects: {}, tasks: 0, done: 0, ts: 0, tsDraft: 0 }); }
          pu.forEach(function (x) { if (byUser[x.user]) { row(byUser[x.user]).projects[x.parent] = 1; } });
          td.forEach(function (x) { var e = byUser[x.allocated_to], tkx = tkm[x.reference_name]; if (e && tkx) { var q = row(e); q.projects[tkx.project] = 1; q.tasks++; if (tkx.status === 'Completed') { q.done++; } } });
          var tsIds = uniq(ts.map(function (x) { return x.employee; }));
          return (tsIds.length ? gl('Employee', { fields: EF, filters: [['name', 'in', tsIds]], limit: 1000 }) : Promise.resolve([])).then(function (es) {
            var em = {}; es.forEach(function (e) { em[e.name] = e; });
            ts.forEach(function (x) { if (em[x.employee]) { var q = row(em[x.employee]); q.projects[x.parent_project] = 1; q.ts++; if (x.docstatus === 0) { q.tsDraft++; } } });
            return Object.keys(map).map(function (k) { var q = map[k]; q.projects = Object.keys(q.projects); return q; });
          });
        });
      });
    });
  });
}
function empFilter(rows) { var q = (S.f.employee || '').toLowerCase(); return q ? rows.filter(function (r) { return (r.id + ' ' + r.name).toLowerCase().indexOf(q) >= 0; }) : rows; }
function todayAtt(ids) {
  if (!ids.length) { return Promise.resolve([]); }
  return Promise.all(chunk(ids, 400).map(function (c) { return gl('Attendance', { fields: ['employee', 'status', 'shift', 'working_hours'], filters: [['employee', 'in', c], ['attendance_date', '=', TODAY], ['docstatus', '=', 1]], limit: 500 }); })).then(function (ps) { var o = []; ps.forEach(function (p) { o = o.concat(p); }); return o; });
}
function deptSet() { var d = S.f.department ? [S.f.department] : uniq(SC().projects.map(function (p) { return p.department; })); return d.length ? d : NONE; }
function rosterF(extra) { var f = [['status', '=', 'Active'], ['department', 'in', deptSet()]]; if (S.f.employee) { f.push(['employee_name', 'like', '%' + S.f.employee + '%']); } return extra ? f.concat(extra) : f; }
function empCols(withAtt) {
  var c = [{ h: 'c_emp', c: function (r) { return r.name; }, f: function (r) { return link('Employee', r.id) + ' ' + esc(r.name); } }, { h: 'c_id', c: function (r) { return r.id; } }, { h: 'c_desig', c: function (r) { return r.designation || ''; } }, { h: 'c_dept', c: function (r) { return r.department || ''; } }, { h: 'c_projs', c: function (r) { return (r.projects || []).join(', '); } }];
  if (withAtt) { c.push({ h: 'c_att', c: function (r) { return r.att ? st(r.att.status) : t('st_Not marked'); }, f: function (r) { return r.att ? spill(r.att.status) : pill(t('st_Not marked'), 'n'); } }, { h: 'c_shift', c: function (r) { return r.att && r.att.shift || ''; } }, { h: 'c_hours', num: true, c: function (r) { return r.att && r.att.working_hours > 0 ? n(r.att.working_hours, 2) : ''; } }); }
  c.push({ h: 'c_tasks', num: true, c: function (r) { return r.tasks; } }, { h: 'c_tdone', num: true, c: function (r) { return r.done; } }, { h: 'c_ts', num: true, c: function (r) { return r.ts + (r.tsDraft ? ' (' + r.tsDraft + ' ' + t('st_Draft') + ')' : ''); } });
  return c;
}
function assignedRows(openOnly) { return assigned(openOnly).then(function (rows) { rows = empFilter(rows); return todayAtt(rows.map(function (r) { return r.id; })).then(function (at) { var m = {}; at.forEach(function (a) { m[a.employee] = a; }); rows.forEach(function (r) { r.att = m[r.id]; }); return rows; }); }); }
function assignedAtt(status) { return assignedRows(false).then(function (rows) { return rows.filter(function (r) { return r.att && (Array.isArray(status) ? status.indexOf(r.att.status) >= 0 : r.att.status === status); }); }); }
function rosterAttF(extra) { return [['attendance_date', '=', TODAY], ['docstatus', '=', 1], ['department', 'in', deptSet()]].concat(extra || []); }
function attSpecDept(id, extra) { return { id: id, dt: 'Attendance', fields: ['name', 'attendance_date', 'employee', 'employee_name', 'status', 'shift', 'working_hours', 'department'], filters: rosterAttF(extra), order: 'employee_name asc', search: ['employee_name', 'employee'], cols: [{ h: 'c_emp', c: function (r) { return r.employee_name; }, f: function (r) { return link('Employee', r.employee) + ' ' + esc(r.employee_name); } }, { h: 'c_dept', c: function (r) { return r.department || ''; } }, { h: 'c_att', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_shift', c: function (r) { return r.shift || ''; } }, { h: 'c_hours', num: true, c: function (r) { return r.working_hours > 0 ? n(r.working_hours, 2) : ''; } }] }; }
function tsSpec(draftOnly) { var f = [['parent_project', 'in', PIN()]].concat(draftOnly ? [['docstatus', '=', 0]] : [['docstatus', '<', 2]]); return { id: draftOnly ? 'ts_draft' : 'ts_all', dt: 'Timesheet', fields: ['name', 'employee', 'employee_name', 'parent_project', 'start_date', 'end_date', 'total_hours', 'status', 'docstatus'], filters: f, order: 'modified desc', search: ['name', 'employee_name'], cols: [{ h: 'c_doc', c: function (r) { return r.name; }, f: function (r) { return link('Timesheet', r.name); } }, { h: 'c_emp', c: function (r) { return r.employee_name || r.employee; } }, { h: 'c_project', c: function (r) { return r.parent_project || ''; } }, { h: 'c_start', c: function (r) { return r.start_date || ''; } }, { h: 'c_end', c: function (r) { return r.end_date || ''; } }, { h: 'c_hours', num: true, c: function (r) { return n(r.total_hours, 2); } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }] }; }
function empSpecStatic(id, rowsP, withAtt) { return sSpec(id, rowsP, empCols(withAtt)); }
var MK = {
  assign: function () { return { label: 'k_massign', tone: 'blue', load: function () { return assignedRows(false).then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_assign', function () { return assignedRows(false); }, true); } }; },
  active: function () { return { label: 'k_mactive', tone: 'blue', load: function () { return assignedRows(true).then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_active', function () { return assignedRows(true); }, true); } }; },
  pres: function () { return { label: 'k_mpres', tone: 'green', load: function () { return assignedAtt(['Present', 'Work From Home']).then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_pres', function () { return assignedAtt(['Present', 'Work From Home']); }, true); } }; },
  abs: function () { return { label: 'k_mabs', tone: 'red', load: function () { return assignedAtt('Absent').then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_abs', function () { return assignedAtt('Absent'); }, true); } }; },
  leave: function () { return { label: 'k_mleave', tone: 'blue', load: function () { return assignedAtt('On Leave').then(function (r) { return { v: r.length }; }); }, spec: function () { return empSpecStatic('mk_leave', function () { return assignedAtt('On Leave'); }, true); } }; },
  ts: function () { return { label: 'k_mts', tone: 'yellow', load: function () { return cnt('Timesheet', { filters: [['parent_project', 'in', PIN()], ['docstatus', '=', 0]] }).then(function (v) { return { v: v }; }); }, spec: function () { return tsSpec(true); } }; },
  dept: function () { return { label: 'k_mdept', tone: 'blue', load: function () { return cnt('Employee', { filters: rosterF() }).then(function (v) { return { v: v }; }); }, spec: function () { return rosterSpec(); } }; },
  dpres: function () { return { label: 'k_mdpres', tone: 'green', load: function () { return cnt('Attendance', { filters: rosterAttF([['status', 'in', ['Present', 'Work From Home']]]) }).then(function (v) { return { v: v }; }); }, spec: function () { return attSpecDept('mk_dp', [['status', 'in', ['Present', 'Work From Home']]]); } }; },
  dabs: function () { return { label: 'k_mdabs', tone: 'red', load: function () { return cnt('Attendance', { filters: rosterAttF([['status', '=', 'Absent']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return attSpecDept('mk_da', [['status', '=', 'Absent']]); } }; },
  dleave: function () { return { label: 'k_mdleave', tone: 'blue', load: function () { return cnt('Attendance', { filters: rosterAttF([['status', '=', 'On Leave']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return attSpecDept('mk_dl', [['status', '=', 'On Leave']]); } }; }
};
function rosterSpec() { return { id: 'roster', dt: 'Employee', fields: ['name', 'employee_name', 'designation', 'department', 'branch'], filters: rosterF(), order: 'employee_name asc', search: ['employee_name', 'name'], cols: [{ h: 'c_emp', c: function (r) { return r.employee_name; }, f: function (r) { return link('Employee', r.name) + ' ' + esc(r.employee_name); } }, { h: 'c_id', c: function (r) { return r.name; } }, { h: 'c_desig', c: function (r) { return r.designation || ''; } }, { h: 'c_dept', c: function (r) { return r.department || ''; } }, { h: 'c_branch', c: function (r) { return r.branch || ''; } }] }; }

/* ---------- equipment ---------- */
function assetF(extra) { var f = [['docstatus', '<', 2]]; if (S.f.company) { f.push(['company', '=', S.f.company]); } if (S.f.department) { f.push(['department', '=', S.f.department]); } return extra ? f.concat(extra) : f; }
function imgOk(v) { return v && /^\/(private\/)?files\/[^"'<>\s]+$/.test(v); }
function assetSpec(id, extra) { return { id: id, dt: 'Asset', fields: ['name', 'asset_name', 'asset_category', 'status', 'location', 'custodian', 'department', 'image'], filters: assetF(extra), order: 'modified desc', search: ['asset_name', 'name'], cols: [{ h: 'c_asset', c: function (r) { return r.name; }, f: function (r) { return link('Asset', r.name); } }, { h: 'c_aname', c: function (r) { return r.asset_name || ''; } }, { h: 'c_cat', c: function (r) { return r.asset_category || ''; } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return spill(r.status); } }, { h: 'c_loc', c: function (r) { return r.location || ''; } }, { h: 'c_cust2', c: function (r) { return r.custodian || ''; } }, { h: 'c_dept', c: function (r) { return r.department || ''; } }, { h: 'c_img', c: function (r) { return imgOk(r.image) ? r.image : ''; }, f: function (r) { return imgOk(r.image) ? '<img src="' + esc(r.image) + '" alt="" style="height:34px;border-radius:5px">' : ''; } }] }; }
function vehSpec() { return { id: 'veh', dt: 'Vehicle', fields: ['name', 'license_plate', 'model', 'employee', 'last_odometer', 'location'], filters: [], order: 'modified desc', search: ['license_plate', 'model', 'name'], cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Vehicle', r.name); } }, { h: 'c_plate', c: function (r) { return r.license_plate || ''; } }, { h: 'c_model', c: function (r) { return r.model || ''; } }, { h: 'c_driver', c: function (r) { return r.employee || ''; } }, { h: 'c_odo', num: true, c: function (r) { return r.last_odometer === null ? '' : n(r.last_odometer, 0); } }, { h: 'c_loc', c: function (r) { return r.location || ''; } }] }; }
function repairSpec() { return { id: 'repairs', dt: 'Asset Repair', fields: ['name', 'asset', 'asset_name', 'failure_date', 'repair_status', 'docstatus'], filters: [['repair_status', '!=', 'Completed'], ['docstatus', '<', 2]], order: 'failure_date desc', search: ['name', 'asset_name'], cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Asset Repair', r.name); } }, { h: 'c_asset', c: function (r) { return r.asset; }, f: function (r) { return link('Asset', r.asset) + ' ' + esc(r.asset_name || ''); } }, { h: 'c_failure', c: function (r) { return r.failure_date || ''; } }, { h: 'c_repair', c: function (r) { return r.repair_status || ''; }, f: function (r) { return pill(r.repair_status || '', 'o'); } }] }; }
var EK = {
  total: function () { return { label: 'k_etotal', tone: 'blue', load: function () { return cnt('Asset', { filters: assetF() }).then(function (v) { return { v: v }; }); }, spec: function () { return assetSpec('ek_all'); } }; },
  maint: function () { return { label: 'k_emaint', tone: 'orange', load: function () { return cnt('Asset', { filters: assetF([['status', '=', 'In Maintenance']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return assetSpec('ek_m', [['status', '=', 'In Maintenance']]); } }; },
  ooo: function () { return { label: 'k_eooo', tone: 'red', load: function () { return cnt('Asset', { filters: assetF([['status', '=', 'Out of Order']]) }).then(function (v) { return { v: v }; }); }, spec: function () { return assetSpec('ek_o', [['status', '=', 'Out of Order']]); } }; },
  repair: function () { return { label: 'k_erepair', tone: 'orange', load: function () { return cnt('Asset Repair', { filters: repairSpec().filters }).then(function (v) { return { v: v }; }); }, spec: repairSpec }; },
  veh: function () { return { label: 'k_vehicles', tone: 'blue', load: function () { return cnt('Vehicle', {}).then(function (v) { return { v: v }; }); }, spec: vehSpec }; },
  use: function () { return { label: 'k_euse', tone: 'grey', unavail: 'na_equse' }; }, over: function () { return { label: 'k_eoverret', tone: 'grey', unavail: 'na_equse' }; }, alloc: function () { return { label: 'k_ealloc', tone: 'grey', unavail: 'na_equse' }; },
  sched: function () { return { label: 'k_esched', tone: 'blue', load: function () { return Promise.all([cnt('Maintenance Schedule', {}), cnt('Maintenance Visit', {}), cnt('Asset Maintenance', {})]).then(function (a) { return { fmt: a.join(' / '), sub: 'Schedules / Visits / Plans' }; }); } }; }
};

/* ---------- finance ---------- */
function sumP(f) { return sum(SC().projects, f); }
function budgeted() { return SC().projects.filter(function (p) { return p.estimated_costing > 0; }); }
function siF(extra) { return [['project', 'in', PIN()]].concat(extra || []); }
function invSpec(dt, id, extra) {
  var isSI = dt === 'Sales Invoice', pf = isSI ? 'customer' : 'supplier';
  return { id: id, dt: dt, fields: ['name', 'posting_date', pf, 'project', 'grand_total', 'outstanding_amount', 'due_date', 'docstatus'], filters: siF(extra), order: 'posting_date desc', search: ['name', pf], cols: [{ h: 'c_inv', c: function (r) { return r.name; }, f: function (r) { return link(dt, r.name); } }, { h: 'c_date', c: function (r) { return r.posting_date; } }, { h: isSI ? 'c_cust' : 'c_sup', c: function (r) { return r[pf] || ''; } }, { h: 'c_project', c: function (r) { return r.project || ''; } }, { h: 'c_total', num: true, c: function (r) { return n(r.grand_total, 2); } }, { h: 'c_outst', num: true, c: function (r) { return n(r.outstanding_amount, 2); } }, { h: 'c_due', c: function (r) { return r.due_date || ''; } }, { h: 'c_status', c: function (r) { return r.docstatus === 1 ? st('Submitted') : st('Draft'); }, f: function (r) { return dpill(r.docstatus); } }] };
}
function finProjSpec(id) { return { id: id, rows: SC().projects, cols: [{ h: 'c_id', c: function (p) { return p.name; }, f: projLink }, { h: 'c_name', c: function (p) { return p.project_name || ''; } }, { h: 'c_budget', num: true, c: function (p) { return p.estimated_costing > 0 ? n(p.estimated_costing, 2) : ''; } }, { h: 'c_tcost', num: true, c: function (p) { return n(p.total_costing_amount, 2); } }, { h: 'c_pcost', num: true, c: function (p) { return n(p.total_purchase_cost, 2); } }, { h: 'c_mcost', num: true, c: function (p) { return n(p.total_consumed_material_cost, 2); } }, { h: 'c_actual', num: true, c: function (p) { return n(actualCost(p), 2); } }, { h: 'c_util', num: true, c: function (p) { return p.estimated_costing > 0 ? n(actualCost(p) / p.estimated_costing * 100, 1) + '%' : ''; } }, { h: 'c_var', num: true, c: function (p) { return p.estimated_costing > 0 ? n(p.estimated_costing - actualCost(p), 2) : ''; } }, { h: 'c_sales', num: true, c: function (p) { return n(p.total_sales_amount, 2); } }, { h: 'c_billed', num: true, c: function (p) { return n(p.total_billed_amount, 2); } }, { h: 'c_margin', num: true, c: function (p) { return n(p.gross_margin, 2); } }] }; }
function commitments() { return poLines().then(function (rows) { return rows.filter(function (r) { return r.open; }); }); }
var FK = {
  budget: function () { return { label: 'k_fbudget', tone: 'blue', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(function (p) { return p.estimated_costing; })), sub: budgeted().length + ' / ' + SC().projects.length + ' ' + t('records') }); }, spec: function () { var s = finProjSpec('fk_b'); s.rows = budgeted(); return s; } }; },
  actual: function () { return { label: 'k_factual', tone: 'orange', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(actualCost)) }); }, spec: function () { return finProjSpec('fk_a'); } }; },
  util: function () { return { label: 'k_futil', tone: 'blue', load: function () { var b = budgeted(), bud = sum(b, function (p) { return p.estimated_costing; }); return Promise.resolve(bud ? { fmt: n(sum(b, actualCost) / bud * 100, 1) + '%', sub: b.length + ' ' + t('records') } : { fmt: '—', sub: t('empty') }); }, spec: function () { var s = finProjSpec('fk_u'); s.rows = budgeted(); return s; } }; },
  variance: function () { return { label: 'k_fvar', tone: 'blue', load: function () { var b = budgeted(); return Promise.resolve(b.length ? { fmt: moneyHtml(sum(b, function (p) { return p.estimated_costing - actualCost(p); })) } : { fmt: '—', sub: t('empty') }); }, spec: function () { var s = finProjSpec('fk_v'); s.rows = budgeted(); return s; } }; },
  commit: function () { return { label: 'k_fcommit', tone: 'orange', load: function () { return commitments().then(function (rows) { return { fmt: moneyHtml(sum(rows, function (r) { return Math.max(0, r.amount - r.billed_amt); })) }; }); }, spec: function () { return sSpec('fk_c', function () { return commitments().then(function (r) { return r.filter(function (x) { return x.amount > x.billed_amt; }); }); }, lineCols('po')); } }; },
  sup: function () { return { label: 'k_fsup', tone: 'red', load: function () { return sumf('Purchase Invoice', 'outstanding_amount', { filters: siF([['docstatus', '=', 1], ['outstanding_amount', '>', 0]]) }).then(function (v) { return { fmt: moneyHtml(v) }; }); }, spec: function () { return invSpec('Purchase Invoice', 'fk_s', [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]); } }; },
  cust: function () { return { label: 'k_fcust', tone: 'red', load: function () { return sumf('Sales Invoice', 'outstanding_amount', { filters: siF([['docstatus', '=', 1], ['outstanding_amount', '>', 0]]) }).then(function (v) { return { fmt: moneyHtml(v) }; }); }, spec: function () { return invSpec('Sales Invoice', 'fk_cu', [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]); } }; },
  rev: function () { return { label: 'k_frev', tone: 'green', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(function (p) { return p.total_billed_amount; })) }); }, spec: function () { return finProjSpec('fk_r'); } }; },
  sales: function () { return { label: 'k_fsales', tone: 'green', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(function (p) { return p.total_sales_amount; })) }); }, spec: function () { return finProjSpec('fk_so'); } }; },
  margin: function () { return { label: 'k_fmargin', tone: 'grey', load: function () { return Promise.resolve({ fmt: moneyHtml(sumP(function (p) { return p.gross_margin; })), sub: 'ERPNext estimate' }); }, spec: function () { return finProjSpec('fk_m'); } }; },
  dsi: function () { return { label: 'k_fdsi', tone: 'yellow', load: function () { return cnt('Sales Invoice', { filters: siF([['docstatus', '=', 0]]) }).then(function (v) { return { v: v }; }); }, spec: function () { return invSpec('Sales Invoice', 'fk_dsi', [['docstatus', '=', 0]]); } }; },
  dpi: function () { return { label: 'k_fdpi', tone: 'yellow', load: function () { return cnt('Purchase Invoice', { filters: siF([['docstatus', '=', 0]]) }).then(function (v) { return { v: v }; }); }, spec: function () { return invSpec('Purchase Invoice', 'fk_dpi', [['docstatus', '=', 0]]); } }; }
};
function monthSeries(rows, df) { var m = {}; rows.forEach(function (r) { var k = String(r[df] || '').slice(0, 7); if (k) { m[k] = (m[k] || 0) + 1; } }); return m; }
function last12() { var o = [], s = monthStart(TODAY); for (var i = 11; i >= 0; i--) { o.push(addMonths(s, -i).slice(0, 7)); } return o; }

/* ---------- delays / risks ---------- */
function delayRows() {
  return mm('delays', function () {
    return Promise.all([
      SC().names.length ? fetchAll('Task', { fields: ['name', 'subject', 'project', 'priority', 'exp_end_date', 'status', 'is_milestone'], filters: tkF([['status', 'not in', DONE_ST]]), or: OVR().concat([['exp_end_date', 'between', [TODAY, addDays(TODAY, 14)]]]), order: 'exp_end_date asc' }, 1000) : Promise.resolve({ rows: [] }),
      poLines(), mrLines(),
      SC().names.length ? gl('Issue', { fields: ['name', 'subject', 'project', 'priority', 'status', 'opening_date'], filters: [['project', 'in', PIN()], ['status', '!=', 'Closed']], limit: 500 }).catch(function () { return []; }) : Promise.resolve([]),
      gl('Asset Repair', { fields: ['name', 'asset', 'failure_date', 'repair_status'], filters: [['repair_status', '!=', 'Completed'], ['docstatus', '<', 2]], limit: 200 }).catch(function () { return []; })
    ]).then(function (r) {
      return tkPost(r[0].rows).then(function (tasks) {
        var rows = [];
        function over(d) { return d && d < TODAY ? daysBetween(d, TODAY) : ''; }
        SC().projects.filter(isDelayed).forEach(function (p) { rows.push({ project: p.name, desc: t('lt_delayed') + ' – ' + (p.project_name || ''), dt: 'Project', doc: p.name, resp: '', exp: p.expected_end_date, status: 'Overdue', over: over(p.expected_end_date), prio: p.priority || '' }); });
        tasks.forEach(function (x) { var late = x.exp_end_date && x.exp_end_date < TODAY || x.status === 'Overdue'; rows.push({ project: x.project, desc: (late ? t('lt_task') : t('lt_upc')) + ' – ' + x.subject, dt: 'Task', doc: x.name, resp: x._asg || '', exp: x.exp_end_date, status: late ? 'Overdue' : 'Upcoming', over: late ? over(x.exp_end_date) : '', prio: x.priority || '' }); });
        r[1].filter(function (l) { return l.open && l.schedule_date && l.schedule_date < TODAY && l.qty > l.received_qty; }).forEach(function (l) { rows.push({ project: l.project, desc: t('lt_po') + ' – ' + (l.item_code || ''), dt: 'Purchase Order', doc: l.parent, resp: l.supplier || '', exp: l.schedule_date, status: 'Overdue', over: over(l.schedule_date), prio: '' }); });
        r[2].filter(function (l) { return l.open && l.schedule_date && l.schedule_date < TODAY && l.qty > l.ordered_qty; }).forEach(function (l) { rows.push({ project: l.project, desc: t('lt_mr') + ' – ' + (l.item_code || ''), dt: 'Material Request', doc: l.parent, resp: '', exp: l.schedule_date, status: 'Overdue', over: over(l.schedule_date), prio: '' }); });
        r[3].forEach(function (x) { rows.push({ project: x.project, desc: t('lt_issue') + ' – ' + x.subject, dt: 'Issue', doc: x.name, resp: '', exp: '', status: 'Open', over: '', prio: x.priority || '' }); });
        r[4].forEach(function (x) { rows.push({ project: '', desc: t('lt_repair') + ' – ' + x.asset, dt: 'Asset Repair', doc: x.name, resp: '', exp: x.failure_date, status: 'Pending', over: '', prio: '' }); });
        rows.sort(function (a, b) { return (b.over || 0) - (a.over || 0); });
        return rows;
      });
    });
  });
}
function delayCols() { return [{ h: 'c_project', c: function (r) { return r.project || ''; }, f: function (r) { return r.project ? '<a href="#" class="dmcon-lnk" data-pd="' + esc(r.project) + '">' + esc(r.project) + '</a>' : '—'; } }, { h: 'c_desc', c: function (r) { return r.desc; } }, { h: 'c_rdoc', c: function (r) { return r.doc; }, f: function (r) { return link(r.dt, r.doc); } }, { h: 'c_resp', c: function (r) { return r.resp || ''; } }, { h: 'c_exp', c: function (r) { return r.exp || ''; } }, { h: 'c_status', c: function (r) { return st(r.status); }, f: function (r) { return pill(st(r.status), r.status === 'Overdue' ? 'r' : r.status === 'Upcoming' ? 'b' : r.status === 'Open' ? 'y' : 'y'); } }, { h: 'c_over', num: true, c: function (r) { return r.over; } }, { h: 'c_prio', c: function (r) { return r.prio ? st(r.prio) : ''; } }]; }

/* ---------- TAB: overview ---------- */
function tabOverview(v, my) {
  scopeNote(v);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_pr')) + '</div>');
  addKpis(v, my, [PK.total(), PK.active(), PK.done(), PK.hold(), PK.delay(), PK.upc(), PK.attn()]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_wp')) + '</div>');
  addKpis(v, my, [{ label: 'k_sites', tone: 'grey', unavail: 'na_site' }, TK.done('k_sdone'), TK.pend('k_spend'), TK.over('k_sover'), { label: 'k_sappr', tone: 'grey', unavail: 'na_appr' }, { label: 'k_sissue', tone: 'yellow', load: function () { return cnt('Issue', { filters: [['project', 'in', PIN()], ['status', '!=', 'Closed']] }).then(function (x) { return { v: x }; }); }, spec: function () { return { id: 'issues', dt: 'Issue', fields: ['name', 'subject', 'project', 'priority', 'status', 'opening_date'], filters: [['project', 'in', PIN()], ['status', '!=', 'Closed']], order: 'opening_date desc', search: ['name', 'subject'], cols: [{ h: 'c_id', c: function (r) { return r.name; }, f: function (r) { return link('Issue', r.name); } }, { h: 'c_subject', c: function (r) { return r.subject; } }, { h: 'c_project', c: function (r) { return r.project || ''; } }, { h: 'c_prio', c: function (r) { return r.priority || ''; } }, { h: 'c_status', c: function (r) { return r.status; }, f: function (r) { return spill(r.status); } }] }; } }]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_mp')) + '</div>');
  addKpis(v, my, [MK.assign(), MK.active(), MK.pres(), MK.abs(), MK.leave(), MK.ts()]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_mt')) + '</div>');
  addKpis(v, my, [XK.mr(), XK.po(), XK.rcpt(), XK.issue(), XK.ret(), XK.outOrder(), XK.outRecv(), XK.repl()]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_eq')) + '</div>');
  addKpis(v, my, [EK.total(), EK.maint(), EK.ooo(), EK.repair(), EK.use(), EK.over()]);
  v.insertAdjacentHTML('beforeend', '<div class="dmcon-sech">' + esc(t('tab_fi')) + '</div>');
  addKpis(v, my, [FK.budget(), FK.actual(), FK.util(), FK.commit(), FK.sup(), FK.cust(), FK.rev(), FK.margin()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_status'); a.innerHTML = donut([{ l: st('Open'), v: SC().projects.filter(function (p) { return isOpen(p) && !isDelayed(p); }).length, c: COL.b }, { l: st('Overdue'), v: SC().projects.filter(isDelayed).length, c: COL.r }, { l: st('Completed'), v: SC().projects.filter(function (p) { return p.status === 'Completed'; }).length, c: COL.g }, { l: st('Cancelled'), v: SC().projects.filter(function (p) { return p.status === 'Cancelled'; }).length, c: COL.n }]);
  var b = addPanel(g, 'p_monthly'); var ms = monthSeries(SC().projects, 'creation'); b.innerHTML = colchart(last12().map(function (m) { return { l: m.slice(2), parts: [{ l: t('proj_created'), c: COL.b, v: ms[m] || 0 }] }; }));
  var c = addPanel(g, 'p_compare'); c.innerHTML = hbars(SC().projects.slice().sort(function (x, y) { return y.percent_complete - x.percent_complete; }).slice(0, 10).map(function (p) { return { l: p.name + ' ' + (p.project_name || ''), v: Number(p.percent_complete) || 0, c: p.status === 'Completed' ? COL.g : COL.b }; }), 0);
  var d = addPanel(g, 'p_manpow'); fill(d, my, function () { return assigned(false); }, function (rows) { var m = {}; rows.forEach(function (r) { r.projects.forEach(function (p) { m[p] = (m[p] || 0) + 1; }); }); return hbars(Object.keys(m).map(function (k) { return { l: k, v: m[k] }; }).sort(function (x, y) { return y.v - x.v; }).slice(0, 10), 0); });
  var e = addPanel(g, 'p_issued'); fill(e, my, seView, function (rows) { var m = {}; uniq(rows.map(function (r) { return r.parent; })).forEach(function (p) { var r0 = rows.filter(function (r) { return r.parent === p; })[0]; m[r0.project] = (m[r0.project] || 0) + 1; }); return hbars(Object.keys(m).map(function (k) { return { l: k, v: m[k] }; }), 0); });
  var f = addPanel(g, 'p_equtil'); fill(f, my, function () { return grp('Asset', 'status', { filters: assetF() }); }, function (m) { return donut(Object.keys(m).map(function (k) { return { l: st(k), v: m[k], c: COL[cat(k)] }; })); });
  var h = addPanel(g, 'p_proc'); fill(h, my, poLines, function (rows) { var hd = {}; rows.forEach(function (r) { hd[r.parent] = r; }); var ms2 = monthSeries(Object.keys(hd).map(function (k) { return hd[k]; }).filter(function (r) { return inRange(r.date); }), 'date'); return colchart(last12().map(function (m) { return { l: m.slice(2), parts: [{ l: t('pos_created'), c: COL.o, v: ms2[m] || 0 }] }; })); });
  var i = addPanel(g, 'p_recent'); fill(i, my, function () { return Promise.all([gl('Project', { fields: ['name', 'modified'], filters: [['name', 'in', PIN()]], order: 'modified desc', limit: 4 }), gl('Task', { fields: ['name', 'modified'], filters: tkF(), order: 'modified desc', limit: 4 })]).then(function (r) { var o = r[0].map(function (x) { return { dt: 'Project', name: x.name, m: x.modified }; }).concat(r[1].map(function (x) { return { dt: 'Task', name: x.name, m: x.modified }; })); o.sort(function (x, y) { return String(y.m).localeCompare(String(x.m)); }); return o; }); }, function (rows) { return simple(rows.map(function (r) { return '<li><span>' + esc(t('dt_' + r.dt)) + ' ' + link(r.dt, r.name) + '</span><small>' + esc(dstr(r.m)) + '</small></li>'; })); });
  listPanel(v, my, 'p_attn', attnSpec('ov_attn'));
}

/* ---------- TAB: projects & sites ---------- */
function tabProjects(v, my) {
  scopeNote(v); infoBox(v, ['n_prog', 'n_color']);
  addKpis(v, my, [PK.total(), PK.active(), PK.done(), PK.hold(), PK.delay(), PK.upc(), PK.attn(), { label: 'k_sites', tone: 'grey', unavail: 'na_site' }]);
  var g = addGrid(v, 'dmcon-g2');
  var pc = addPanel(g, 'p_pcards'); pc.innerHTML = '<div class="dmcon-prof">' + [['Open', SC().projects.filter(function (p) { return isOpen(p) && !isDelayed(p); }).length, 'b'], ['Overdue', SC().projects.filter(isDelayed).length, 'r'], ['Completed', SC().projects.filter(function (p) { return p.status === 'Completed'; }).length, 'g'], ['Cancelled', SC().projects.filter(function (p) { return p.status === 'Cancelled'; }).length, 'n']].map(function (x) { return '<div>' + pill(st(x[0] === 'Open' ? 'In Progress' : x[0]), x[2]) + '<b style="font-size:22px;display:block">' + n(x[1], 0) + '</b></div>'; }).join('') + '</div>';
  var pd = addPanel(g, 'p_dept'); var dm = group(SC().projects, function (p) { return p.department || '—'; }); pd.innerHTML = hbars(Object.keys(dm).map(function (k) { return { l: k, v: dm[k].length }; }).sort(function (a, b2) { return b2.v - a.v; }).slice(0, 12), 0);
  var ps = addPanel(v, 'p_site'); ps.innerHTML = '<div class="dmcon-note">' + esc(t('na_site')) + '</div>';
  var pt = addPanel(v, 'p_timeline'); pt.innerHTML = timeline(SC().projects.filter(function (p) { return p.expected_start_date && p.expected_end_date; }).sort(byEnd).slice(0, 15));
  var g2 = addGrid(v, 'dmcon-g2'); listView(addPanel(g2, 'p_upc'), my, pSpec('pr_upc', isUpcoming, byEnd)); listView(addPanel(g2, 'p_delayed'), my, pSpec('pr_delay', isDelayed, byEnd));
  listPanel(v, my, 'p_plist', pSpec('pr_list'));
}
function timeline(rows) {
  if (!rows.length) { return '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; }
  var mn = rows.reduce(function (a, p) { return p.expected_start_date < a ? p.expected_start_date : a; }, rows[0].expected_start_date), mx = rows.reduce(function (a, p) { return p.expected_end_date > a ? p.expected_end_date : a; }, rows[0].expected_end_date), span = Math.max(1, daysBetween(mn, mx));
  return '<div class="dmcon-hb">' + rows.map(function (p) { var l = Math.max(0, daysBetween(mn, p.expected_start_date)) / span * 100, w = Math.max(1.5, daysBetween(p.expected_start_date, p.expected_end_date) / span * 100); return '<div class="dmcon-hr" style="grid-template-columns:minmax(80px,28%) 1fr"><span class="dmcon-hl" title="' + esc(p.name + ' ' + (p.project_name || '')) + '"><a href="#" class="dmcon-lnk" data-pd="' + esc(p.name) + '">' + esc(p.name) + '</a></span><span class="dmcon-ht" style="position:relative"><i style="position:absolute;left:' + l + '%;width:' + w + '%;background:' + (isDelayed(p) ? COL.r : p.status === 'Completed' ? COL.g : COL.b) + '"></i></span></div>'; }).join('') + '</div><div class="dmcon-ks" style="margin-top:6px">' + esc(mn + ' → ' + mx) + '</div>';
}
function openProject(name) { S.drill = { tk: 'p_det', title: t('p_det') + ': ' + name, tab: S.tab, render: function (el, my) { projectDetail(el, my, name); } }; renderView(); }
function projectDetail(el, my, name) {
  var p = S.ctx.pmap[name];
  if (!p) { el.innerHTML = '<div class="dmcon-note">' + esc(t('na_load')) + '</div>'; return; }
  var u = actualCost(p);
  el.innerHTML = '<div class="dmcon-prof">' + kv('c_id', p.name) + kv('c_name', p.project_name) + kv('c_cust', p.customer) + kv('c_dept', p.department) + kv('c_start', p.expected_start_date) + kv('c_end', p.expected_end_date) + kv('c_aend', p.actual_end_date) + kv('c_prio', p.priority) + '<div><span>' + esc(t('c_status')) + '</span>' + projPill(p) + '</div><div><span>' + esc(t('c_prog')) + ' (' + esc(p.percent_complete_method || '—') + ')</span>' + pbar(p.percent_complete, COL.b) + '</div><div><a class="dmcon-lnk" target="_blank" rel="noopener" href="' + esc(docUrl('Project', p.name)) + '">' + esc(t('erp_doc')) + ' ↗</a></div></div>';
  var one = function (extra) { return [['project', '=', name]].concat(extra || []); };
  var k = addGrid(el, 'dmcon-kg');
  kpis(k, my, [
    { label: 'k_tall', tone: 'blue', load: function () { return cnt('Task', { filters: one() }).then(function (x) { return { v: x }; }); }, spec: function () { var s = tkSpec('pd_t'); s.filters = one(); return s; } },
    { label: 'k_tdone', tone: 'green', load: function () { return Promise.all([cnt('Task', { filters: one([['status', '=', 'Completed']]) }), cnt('Task', { filters: one() })]).then(function (r) { return { v: r[0], sub: r[1] ? n(r[0] / r[1] * 100, 0) + '% ' + t('k_tdone') : '' }; }); }, spec: function () { var s = tkSpec('pd_td'); s.filters = one([['status', '=', 'Completed']]); return s; } },
    { label: 'k_tover', tone: 'red', load: function () { return cnt('Task', { filters: one([['status', 'not in', DONE_ST]]), or: OVR() }).then(function (x) { return { v: x }; }); }, spec: function () { var s = tkSpec('pd_to'); s.filters = one([['status', 'not in', DONE_ST]]); s.or = OVR(); return s; } },
    { label: 'k_fbudget', tone: 'blue', load: function () { return Promise.resolve(p.estimated_costing > 0 ? { fmt: n(p.estimated_costing, 2) } : { fmt: '—', sub: t('empty') }); } },
    { label: 'k_factual', tone: 'orange', load: function () { return Promise.resolve({ fmt: n(u, 2) }); } },
    { label: 'k_frev', tone: 'green', load: function () { return Promise.resolve({ fmt: n(p.total_billed_amount, 2) }); } }
  ]);
  var pm = addPanel(el, 'p_dtasks'); var s1 = tkSpec('pd_tasks'); s1.filters = one(); listView(pm, my, s1);
  var mp = addPanel(el, 'p_dman'); fill(mp, my, function () { return assigned(false); }, function (rows) { rows = rows.filter(function (r) { return r.projects.indexOf(name) >= 0; }); return rows.length ? '<div class="dmcon-tw"><table class="dmcon-tbl"><thead><tr><th>' + esc(t('c_emp')) + '</th><th>' + esc(t('c_desig')) + '</th><th class="dmcon-num">' + esc(t('c_tasks')) + '</th><th class="dmcon-num">' + esc(t('c_ts')) + '</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + link('Employee', r.id) + ' ' + esc(r.name) + '</td><td>' + esc(r.designation || '') + '</td><td class="dmcon-num">' + r.tasks + '</td><td class="dmcon-num">' + r.ts + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; });
  var mt = addPanel(el, 'p_dmat'); fill(mt, my, function () { return Promise.all([poLines(), mrLines(), seLines()]); }, function (r) { var rows = []; r[0].filter(function (x) { return x.project === name; }).forEach(function (x) { rows.push({ t: 'Purchase Order', d: x.parent, i: x.item_code, q: x.qty, u: x.uom, s: x.status }); }); r[1].filter(function (x) { return x.project === name; }).forEach(function (x) { rows.push({ t: 'Material Request', d: x.parent, i: x.item_code, q: x.qty, u: x.uom, s: x.status }); }); r[2].filter(function (x) { return x.project === name; }).forEach(function (x) { rows.push({ t: 'Stock Entry', d: x.parent, i: x.item_code, q: x.qty, u: x.uom, s: x.type }); }); return rows.length ? '<div class="dmcon-tw"><table class="dmcon-tbl"><thead><tr><th>' + esc(t('c_type')) + '</th><th>' + esc(t('c_doc')) + '</th><th>' + esc(t('c_item')) + '</th><th class="dmcon-num">' + esc(t('c_qty')) + '</th><th>' + esc(t('c_uom')) + '</th><th>' + esc(t('c_status')) + '</th></tr></thead><tbody>' + rows.slice(0, 200).map(function (x) { return '<tr><td>' + esc(t('dt_' + x.t)) + '</td><td>' + link(x.t, x.d) + '</td><td>' + esc(x.i) + '</td><td class="dmcon-num">' + n(x.q, 2) + '</td><td>' + esc(x.u) + '</td><td>' + esc(x.s ? st(x.s) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="dmcon-empty">' + esc(t('empty')) + '</div>'; });
  addPanel(el, 'p_deq').innerHTML = '<div class="dmcon-note">' + esc(t('na_equse')) + '</div>';
  var fp = addPanel(el, 'p_dfin'); var si = invSpec('Sales Invoice', 'pd_si', []); si.filters = [['project', '=', name]]; listView(fp, my, si);
  var pp = addPanel(el, 'p_ppi'); var pi = invSpec('Purchase Invoice', 'pd_pi', []); pi.filters = [['project', '=', name]]; listView(pp, my, pi);
}

/* ---------- TAB: work progress ---------- */
function tabWork(v, my) {
  scopeNote(v); infoBox(v, ['n_prog', 'n_delay']);
  addKpis(v, my, [TK.all(), TK.done(), TK.pend(), TK.over()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_tcomp'); fill(a, my, function () { return grp('Task', 'status', { filters: tkF() }); }, function (m) { return donut(Object.keys(m).map(function (k) { return { l: st(k), v: m[k], c: COL[cat(k)] }; })); });
  var b = addPanel(g, 'p_tproj'); fill(b, my, function () { return fetchAll('Task', { fields: ['project', 'status'], filters: tkF() }, 2000); }, function (x) { var by = group(x.rows, function (r) { return r.project; }); return hbars(Object.keys(by).map(function (k) { return { l: k, v: by[k].filter(function (r) { return r.status === 'Completed'; }).length / by[k].length * 100, c: COL.g }; }).sort(function (p, q) { return q.v - p.v; }).slice(0, 12), 0) + '<div class="dmcon-ks">% = completed ÷ total tasks per project</div>'; });
  var c = addPanel(g, 'p_temp'); fill(c, my, function () { return assigned(false); }, function (rows) { return hbars(rows.map(function (r) { return { l: r.name, v: r.tasks }; }).filter(function (x) { return x.v; }).sort(function (p, q) { return q.v - p.v; }).slice(0, 12), 0); });
  var d = addPanel(g, 'p_miles'); fill(d, my, function () { return gl('Task', { fields: ['name', 'subject', 'project', 'exp_end_date', 'status'], filters: tkF([['is_milestone', '=', 1], ['status', 'not in', DONE_ST]]), order: 'exp_end_date asc', limit: 8 }); }, function (rows) { return simple(rows.map(function (r) { return '<li><span>' + link('Task', r.name) + ' ' + esc(r.subject) + '</span><b>' + esc(r.exp_end_date || '') + '</b></li>'; })); });
  listPanel(v, my, 'p_overd', tkSpec('wp_over', [['status', 'not in', DONE_ST]], 'exp_end_date asc', OVR()));
  listPanel(v, my, 'p_tlist', tkSpec('wp_all', []));
  listPanel(v, my, 'p_plist', pSpec('wp_proj'));
}

/* ---------- TAB: manpower ---------- */
function tabManpower(v, my) {
  scopeNote(v); infoBox(v, ['n_man']);
  addKpis(v, my, [MK.assign(), MK.active(), MK.pres(), MK.abs(), MK.leave(), MK.ts(), MK.dept(), MK.dpres(), MK.dabs(), MK.dleave()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_avail'); fill(a, my, function () { return assignedRows(false); }, function (rows) { var m = {}; rows.forEach(function (r) { var k = r.att ? r.att.status : 'Not marked'; m[k] = (m[k] || 0) + 1; }); return donut(Object.keys(m).map(function (k) { return { l: st(k), v: m[k], c: COL[cat(k)] }; })); });
  var b = addPanel(g, 'p_manpow'); fill(b, my, function () { return assigned(false); }, function (rows) { var m = {}; rows.forEach(function (r) { r.projects.forEach(function (p) { m[p] = (m[p] || 0) + 1; }); }); return hbars(Object.keys(m).map(function (k) { return { l: k, v: m[k] }; }).sort(function (x, y) { return y.v - x.v; }).slice(0, 12), 0); });
  var c = addPanel(v, 'p_atrend'); fill(c, my, function () { var months = []; for (var i = 5; i >= 0; i--) { months.push(addMonths(monthStart(TODAY), -i)); } return Promise.all(months.map(function (m) { return grp('Attendance', 'status', { filters: [['docstatus', '=', 1], ['department', 'in', deptSet()], ['attendance_date', '>=', m], ['attendance_date', '<=', monthEnd(m) > TODAY ? TODAY : monthEnd(m)]] }).then(function (g2) { return { l: m.slice(2, 7), g: g2 }; }); })); }, function (rows) { return colchart(rows.map(function (r) { return { l: r.l, parts: ['Present', 'Work From Home', 'Half Day', 'On Leave', 'Absent'].map(function (s) { return { l: st(s), c: COL[cat(s)], v: r.g[s] || 0 }; }) }; })); });
  listPanel(v, my, 'p_emptable', empSpecStatic('mp_alloc', function () { return assignedRows(false); }, true));
  listPanel(v, my, 'p_roster', rosterSpec());
  listPanel(v, my, 'p_tspend', tsSpec(true));
}

/* ---------- TAB: materials ---------- */
function tabMaterials(v, my) {
  scopeNote(v); infoBox(v, ['n_mat']);
  addKpis(v, my, [XK.mr(), XK.po(), XK.rcpt(), XK.recv(), XK.issue(), XK.ret(), XK.outOrder(), XK.outRecv(), XK.repl()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_pipe'); fill(a, my, function () { return Promise.all([mrView(), poView()]); }, function (r) { var mrh = {}; r[0].filter(function (x) { return x.open; }).forEach(function (x) { mrh[x.parent] = 1; }); return hbars([{ l: t('k_xmr'), v: Object.keys(mrh).length, c: COL.y }, { l: t('k_xpo'), v: poPendingHeaders(r[1]).length, c: COL.b }, { l: t('k_xrcpt'), v: r[1].filter(function (x) { return x.open && x.qty > x.received_qty; }).length, c: COL.o }], 0); });
  var b = addPanel(g, 'p_itemw'); fill(b, my, seView, function (rows) { var by = group(rows.filter(function (r) { return r.type === 'Material Issue' && r.docstatus === 1; }), function (r) { return r.item_code + '||' + r.uom; }); var out = Object.keys(by).map(function (k) { return { l: by[k][0].item_code + ' (' + by[k][0].uom + ')', v: sum(by[k], function (r) { return r.qty; }) }; }).sort(function (x, y) { return y.v - x.v; }).slice(0, 12); return hbars(out, 2); });
  listPanel(v, my, 'p_mr', sSpec('mt_mr', mrView, lineCols('mr')));
  listPanel(v, my, 'p_po', sSpec('mt_po', poView, lineCols('po')));
  listPanel(v, my, 'p_se', sSpec('mt_se', seView, lineCols('se')));
  var pb = addPanel(v, 'p_bin');
  if (!S.f.warehouse) { pb.innerHTML = '<div class="dmcon-note">' + esc(t('sel_wh')) + '</div>'; } else { listView(pb, my, { id: 'bin', dt: 'Bin', fields: ['item_code', 'actual_qty', 'projected_qty', 'reserved_qty', 'ordered_qty', 'stock_uom', 'warehouse'], filters: [['warehouse', '=', S.f.warehouse], ['actual_qty', '!=', 0]], order: 'item_code asc', search: ['item_code'], cols: [{ h: 'c_item', c: function (r) { return r.item_code; }, f: function (r) { return link('Item', r.item_code); } }, { h: 'c_wh', c: function (r) { return r.warehouse; } }, { h: 'c_qty', num: true, c: function (r) { return n(r.actual_qty, 2); } }, { h: 'c_uom', c: function (r) { return r.stock_uom; } }] }); }
}

/* ---------- TAB: equipment ---------- */
function tabEquipment(v, my) {
  infoBox(v, ['n_eq']); infoBox(v, ['na_equse'], 'note');
  addKpis(v, my, [EK.total(), EK.maint(), EK.ooo(), EK.repair(), EK.veh(), EK.use(), EK.over(), EK.alloc(), EK.sched()]);
  var a = addPanel(v, 'p_equtil'); fill(a, my, function () { return grp('Asset', 'status', { filters: assetF() }); }, function (m) { return donut(Object.keys(m).map(function (k) { return { l: st(k), v: m[k], c: COL[cat(k)] }; })); });
  listPanel(v, my, 'p_assets', assetSpec('eq_assets')); listPanel(v, my, 'p_vehicles', vehSpec()); listPanel(v, my, 'p_repairs', repairSpec());
}

/* ---------- TAB: finance ---------- */
function tabFinance(v, my) {
  scopeNote(v); infoBox(v, ['n_fin']);
  addKpis(v, my, [FK.budget(), FK.actual(), FK.util(), FK.variance(), FK.commit(), FK.sup(), FK.cust(), FK.rev(), FK.sales(), FK.margin(), FK.dsi(), FK.dpi()]);
  var g = addGrid(v, 'dmcon-g2');
  var a = addPanel(g, 'p_mtrend'); fill(a, my, function () { return Promise.all(['Sales Invoice', 'Purchase Invoice'].map(function (dt) { return SC().names.length ? fetchAll(dt, { fields: ['posting_date', 'base_net_total'], filters: siF([['docstatus', '=', 1], ['posting_date', '>=', S.f.from], ['posting_date', '<=', S.f.to]]) }, 2000) : Promise.resolve({ rows: [], truncated: false }); })); }, function (r) { var inc = {}, ex = {}, ms = {}; r[0].rows.forEach(function (x) { var k = x.posting_date.slice(0, 7); inc[k] = (inc[k] || 0) + (Number(x.base_net_total) || 0); ms[k] = 1; }); r[1].rows.forEach(function (x) { var k = x.posting_date.slice(0, 7); ex[k] = (ex[k] || 0) + (Number(x.base_net_total) || 0); ms[k] = 1; }); return colchart(Object.keys(ms).sort().map(function (k) { return { l: k.slice(2), parts: [{ l: t('inc'), c: COL.g, v: inc[k] || 0 }, { l: t('exp'), c: COL.o, v: ex[k] || 0 }] }; })) + (r[0].truncated || r[1].truncated ? '<div class="dmcon-note">' + esc(t('partial', { n: 2000 })) + '</div>' : ''); });
  var b = addPanel(g, 'p_bva'); b.innerHTML = hbars(budgeted().map(function (p) { return { l: p.name + ' ' + (p.project_name || ''), v: actualCost(p) / p.estimated_costing * 100, c: actualCost(p) > p.estimated_costing ? COL.r : COL.b }; }).slice(0, 12), 1) + '<div class="dmcon-ks">% of budget used</div>';
  listPanel(v, my, 'p_pfin', finProjSpec('fi_proj'));
  listPanel(v, my, 'p_psi', invSpec('Sales Invoice', 'fi_psi', [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]));
  listPanel(v, my, 'p_ppi', invSpec('Purchase Invoice', 'fi_ppi', [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]));
  infoBox(v, ['n_bud'], 'note');
  listPanel(v, my, 'p_budgets', { id: 'budgets', dt: 'Budget', fields: ['name', 'budget_against', 'cost_center', 'project', 'fiscal_year', 'company', 'docstatus'], filters: [['docstatus', '=', 1]], order: 'fiscal_year desc', search: ['name'], cols: [{ h: 'c_bud', c: function (r) { return r.name; }, f: function (r) { return link('Budget', r.name); } }, { h: 'c_against', c: function (r) { return r.budget_against; } }, { h: 'c_cc', c: function (r) { return r.cost_center || r.project || ''; } }, { h: 'c_fy', c: function (r) { return r.fiscal_year; } }] });
}

/* ---------- TAB: delays ---------- */
function tabDelays(v, my) {
  scopeNote(v); infoBox(v, ['n_delay', 'n_color']);
  addKpis(v, my, [PK.delay(), PK.upc(), TK.over(), XK.rcpt(), EK.over(), { label: 'k_sappr', tone: 'grey', unavail: 'na_appr' }]);
  listPanel(v, my, 'p_delays', sSpec('dl_all', delayRows, delayCols()));
}

/* ---------- TAB: reports ---------- */
function tabReports(v, my) {
  scopeNote(v); infoBox(v, ['n_rep']);
  var reps = [
    ['rep_perf', function () { return pSpec('rp_perf'); }],
    ['rep_tproj', function () { return sSpec('rp_tproj', function () { return fetchAll('Task', { fields: ['project', 'status', 'exp_end_date'], filters: tkF() }, 5000).then(function (x) { var by = group(x.rows, function (r) { return r.project; }); return Object.keys(by).map(function (k) { var a = by[k], d = a.filter(function (r) { return r.status === 'Completed'; }).length, o = a.filter(function (r) { return DONE_ST.indexOf(r.status) < 0 && (r.status === 'Overdue' || (r.exp_end_date && r.exp_end_date < TODAY)); }).length; return { project: k, total: a.length, done: d, over: o, pct: d / a.length * 100 }; }); }); }, [{ h: 'c_project', c: function (r) { return r.project; } }, { h: 'c_count', num: true, c: function (r) { return r.total; } }, { h: 'c_tdone', num: true, c: function (r) { return r.done; } }, { h: 'k_tover', num: true, c: function (r) { return r.over; } }, { h: 'c_pct', num: true, c: function (r) { return n(r.pct, 1); } }]); }],
    ['rep_site', null],
    ['rep_man', function () { return empSpecStatic('rp_man', function () { return assignedRows(false); }, true); }],
    ['rep_att', function () { return sSpec('rp_att', function () { return grp('Attendance', 'status', { filters: [['docstatus', '=', 1], ['department', 'in', deptSet()], ['attendance_date', '>=', S.f.from], ['attendance_date', '<=', S.f.to]] }).then(function (m) { return Object.keys(m).map(function (k) { return { s: k, c: m[k] }; }); }); }, [{ h: 'c_status', c: function (r) { return st(r.s); } }, { h: 'c_count', num: true, c: function (r) { return r.c; } }]); }],
    ['rep_mat', function () { return sSpec('rp_mat', seView, lineCols('se')); }],
    ['rep_proc', function () { return sSpec('rp_proc', poView, lineCols('po')); }],
    ['rep_equip', function () { return assetSpec('rp_equip'); }],
    ['rep_bva', function () { var s = finProjSpec('rp_bva'); s.rows = budgeted(); return s; }],
    ['rep_delay', function () { return sSpec('rp_delay', delayRows, delayCols()); }],
    ['rep_month', function () { return sSpec('rp_month', function () { return Promise.all([SC().names.length ? fetchAll('Task', { fields: ['completed_on'], filters: tkF([['status', '=', 'Completed'], ['completed_on', 'is', 'set']]) }, 5000) : Promise.resolve({ rows: [] }), poLines()]).then(function (r) { var tm = monthSeries(r[0].rows, 'completed_on'), pm = monthSeries(SC().projects, 'creation'), dm = monthSeries(SC().projects.filter(function (p) { return p.status === 'Completed' && p.actual_end_date; }), 'actual_end_date'), hd = {}; r[1].forEach(function (x) { hd[x.parent] = x; }); var om = monthSeries(Object.keys(hd).map(function (k) { return hd[k]; }), 'date'); var all = uniq(Object.keys(tm).concat(Object.keys(pm), Object.keys(dm), Object.keys(om))).sort(); return all.filter(function (m) { return m >= (S.f.from || '').slice(0, 7) && m <= (S.f.to || '9999').slice(0, 7); }).map(function (m) { return { m: m, p: pm[m] || 0, d: dm[m] || 0, t: tm[m] || 0, o: om[m] || 0 }; }); }); }, [{ h: 'c_month', c: function (r) { return r.m; } }, { h: 'proj_created', num: true, c: function (r) { return r.p; } }, { h: 'projs_completed', num: true, c: function (r) { return r.d; } }, { h: 'tasks_completed', num: true, c: function (r) { return r.t; } }, { h: 'pos_created', num: true, c: function (r) { return r.o; } }]); }]
  ];
  var host = addPanel(v, 'tab_rp');
  host.innerHTML = reps.map(function (r, i) { return '<div class="dmcon-rep"><div><b>' + esc(t(r[0])) + '</b>' + (r[1] ? '' : '<small>' + esc(t('na_site')) + '</small>') + '</div>' + (r[1] ? '<button class="dmcon-btn" data-rep="' + i + '">' + esc(t('open_report')) + '</button>' : '<span class="dmcon-na">' + esc(t('unavailable')) + '</span>') + '</div>'; }).join('');
  $$('[data-rep]', host).forEach(function (b) { b.onclick = function () { var r = reps[Number(b.getAttribute('data-rep'))]; S.drill = { tk: r[0], mk: r[1], tab: S.tab }; renderView(); }; });
}

/* ---------- interface to the kit shell ---------- */
function syncF() { S.lang = LANG; S.f = { company: F.company || '', department: F.department || '', project: F.project || '', customer: F.customer || '', supplier: F.supplier || '', employee: F.employee || '', warehouse: F.warehouse || '', from: F.from || '', to: F.to || '', ds: F.ds || '' }; }
var INITP = null;
return {
  t: function (k) { S.lang = LANG; return t(k); },
  ctx: function () { return S.ctx; },
  reset: function () { cache = {}; S.lv = {}; var keep = { companies: S.ctx.companies, departments: S.ctx.departments, warehouses: S.ctx.warehouses }; S.ctx = keep; S.drill = null; DCK = []; syncF(); },
  init: function () { syncF(); if (!INITP) { INITP = Promise.resolve(APP.init()); INITP.catch(function () { INITP = null; }); } return INITP; },
  prepare: function () { syncF(); return APP.prepare(); },
  ready: function () { return (INITP || Promise.resolve()).then(function () { return APP.prepare(); }); },
  delayRows: function () { return delayRows(); },
  render: function (node, x) {
    syncF(); S.tab = x; var my = ++epoch; node.innerHTML = SKEL;
    Promise.resolve().then(function () { return APP.prepare(); }).then(function () { if (my !== epoch) { return; } node.innerHTML = ''; if (S.drill) { renderDrill(node, my); } else { currentTab().render(node, my); } }, function (e) { if (my !== epoch) { return; } node.innerHTML = errBox(e); });
  },
  drillKey: function () { return S.drill ? (S.drill.tk + '|' + (S.drill.title || '')) : ''; },
  drillClear: function () { S.drill = null; },
  openKpi: function (i) { var d = DCK[i]; if (d && d.spec) { S.drill = { tk: d.label, mk: d.spec, tab: S.tab }; } },
  openProject: function (name) { openProject(name); }
};

}

start();
})();

/* ==== DM theme sync (same as tools/erp/shell/dark_theme.py output; maintained here since this block is built on the standard) ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
