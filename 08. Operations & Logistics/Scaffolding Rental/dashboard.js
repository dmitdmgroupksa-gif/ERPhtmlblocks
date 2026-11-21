/* ===== DM Group KSA — Scaffolding Rental · Employee Dashboard — SCRIPT field · v2 =====
   Moves v1 onto the DM dashboard standard. Read-only; the logged-in user's own permissions. Personal data appears only when an
   Employee record is linked to the user (Employee.user_id). Kept from v1: every source and field, the links (tasks through ToDo
   assignments, rental documents through the Employee fields "From" and "Prepared By"), the attendance % formula, leave balance
   from the HR app, quantities per UOM (never mixed), and the return metrics shown as unavailable because the rental DocTypes
   have no return fields. The shared runtime between the "DMS kit" markers is generated from tools/erp/kit/dms-kit.js. */
(function () {
  'use strict';
  var APP = {
    key: '__dmsScaffoldEmployee',
    period: 'month',
    tabs: [{ id: 'overview', en: 'My overview', ar: 'نظرة عامة' }, { id: 'att', en: 'Attendance', ar: 'الحضور' }, { id: 'leave', en: 'Leave', ar: 'الإجازات' }, { id: 'tasks', en: 'Tasks', ar: 'المهام' }, { id: 'rental', en: 'Rental documents', ar: 'مستندات التأجير' }, { id: 'dispatch', en: 'Dispatch', ar: 'الصرف' }, { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }],
    filters: [
      { k: 'project', en: 'Project / site', ar: 'المشروع / الموقع', options: function () { return (C.projOpts || []).map(function (p) { return { v: p.name, l: p.name + (p.project_name ? ' – ' + p.project_name : '') }; }); } },
      { k: 'customer', en: 'Customer (rental)', ar: 'العميل (التأجير)', type: 'text', ph: ['contains…', 'يحتوي…'] },
      { k: 'taskst', en: 'Task status', ar: 'حالة المهمة', options: function () { return ['Open', 'Working', 'Pending Review', 'Overdue', 'Completed', 'Cancelled'].map(function (s) { return { v: s, l: stl(s) }; }); } },
      { k: 'attst', en: 'Attendance status', ar: 'حالة الحضور', options: function () { return ATT_ST.map(function (s) { return { v: s, l: stl(s) }; }); } },
      { k: 'ds', en: 'Document status (rental)', ar: 'حالة المستند (التأجير)', options: function () { return [{ v: '0', l: tr('Draft', 'مسودة') }, { v: '1', l: tr('Submitted', 'مقدّم') }, { v: '2', l: tr('Cancelled', 'ملغى') }]; } }
    ],
    sources: ['att'],
    dtLabels: { 'Task': ['Task', 'مهمة'], 'Leave Application': ['Leave application', 'طلب إجازة'], 'Attendance Request': ['Attendance request', 'طلب حضور'], 'Rental Quotation': ['Rental quotation', 'عرض سعر تأجير'], 'Rental Delivery Note': ['Rental delivery note', 'إشعار تسليم تأجير'], 'Rental Sales Invoice': ['Rental sales invoice', 'فاتورة تأجير'], 'Rental Purchase Order': ['Rental purchase order', 'أمر شراء تأجير'] },
    title: function () { return tr('Scaffolding Rental – Employee Dashboard', 'لوحة موظف تأجير السقالات'); },
    stamp: function () { return C.emp ? tr('Welcome, ', 'مرحبًا، ') + C.emp.employee_name : tr('Your attendance, leave, tasks and rental work', 'حضورك وإجازاتك ومهامك وأعمال التأجير'); },
    periodNote: function () { return tr('Attendance, leave in range, rental documents, timesheets and daily task logs follow the period. Tasks, pending applications and leave balance are as of today.', 'الحضور والإجازات ومستندات التأجير وسجلات الوقت والمهام اليومية تتبع الفترة. المهام والطلبات المعلقة ورصيد الإجازات حتى اليوم.'); },
    filterNote: function () { return tr('Project applies to tasks and timesheets; customer and document status apply to rental documents; task and attendance status apply to their tables.', 'المشروع للمهام وسجلات الوقت؛ العميل وحالة المستند لمستندات التأجير؛ حالتا المهمة والحضور لجداولهما.'); },
    boot: function () { return loadCtx(); },
    load: function () { if (C.emp) { loadAll(); } else { D.att = []; } },
    actions: function () { return C.emp ? actModel(actSpecs(), 'act', actClient()) : actModel([], 'act', {}); },
    banner: function () { return C.emp ? '' : alertBox('warn', esc(tr('No Employee record is linked to your user account (Employee.user_id). Ask HR to link it. Personal data is never shown without this link.', 'لا يوجد سجل موظف مرتبط بحسابك (Employee.user_id). اطلب من الموارد البشرية ربطه. لا تُعرض البيانات الشخصية دون هذا الربط.'))); },
    content: function (t, AM) { if (!C.emp) { return empty(tr('Nothing to show until an Employee record is linked to your user.', 'لا شيء للعرض حتى يُربط سجل موظف بمستخدمك.')); } return ({ overview: tabOverview, att: tabAtt, leave: tabLeave, tasks: tabTasks, rental: tabRental, dispatch: tabDispatch, actions: tabActions })[t](AM); },
    drill: function (id) { return drill(id); },
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
  var REQ_TIMEOUT = 90000;
  function callP(method, args) {
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
      return callP(method, args).catch(function (e) { if (e && (e.status === 403 || e.timeout || e.status === 417)) { throw e; } return new Promise(function (r) { setTimeout(r, 400); }).then(function () { return callP(method, args); }); });
    });
  }
  function errKind(e) {
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
  function busy() { return !BOOTED || (APP.sources || []).some(function (k) { return D[k] == null && D[k + 'Err'] == null; }); }
  function errText(kind) { return /^large:/.test(String(kind)) ? tr('too many records (' + num(+String(kind).slice(6)) + ') — narrow the filters or period', 'عدد كبير من السجلات (' + num(+String(kind).slice(6)) + ') — ضيّق المرشحات أو الفترة') : kind === 'perm' ? tr('permission denied for your user', 'لا تملك صلاحية القراءة') : tr('technical error while reading', 'خطأ تقني أثناء القراءة'); }

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
  function srcErr(kind, what) { return alertBox('err', '<b>' + esc(tr('Source unavailable', 'المصدر غير متاح')) + ':</b> ' + esc(what) + ' — ' + esc(errText(kind))); }
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

  /* ---------- tables: client-side (search / sort / pagination / CSV) and server-side (paginated, sortable, CSV) ---------- */
  var TBL = {}, TS = {}, SS = {}, focusId = null;
  function regTable(spec) { TBL[spec.id] = spec; return '<div class="dms-tbl" data-tbl="' + esc(spec.id) + '"></div>'; }
  function fillTables(scope) { var els = (scope || HOST).querySelectorAll('[data-tbl]'); for (var i = 0; i < els.length; i++) { fillTable(els[i].getAttribute('data-tbl'), els[i]); } }
  function clientRows(sp, st) {
    var rows = sp.rows, q = st.q.trim().toLowerCase();
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
    var h = '<div class="dms-toolbar"><input type="search" class="dms-input" data-tq="' + esc(id) + '" placeholder="' + esc(tr('Search this table…', 'ابحث في الجدول…')) + '" value="' + esc(st.q) + '" aria-label="' + esc(tr('Search this table', 'ابحث في الجدول')) + '"><span class="dms-tb-r"><span class="dms-sm">' + num(rows.length) + ' ' + esc(rows.length === 1 ? tr('row', 'سجل') : tr('rows', 'سجل')) + (st.q ? ' / ' + num(sp.rows.length) : '') + '</span>' +
      (rows.length ? '<button type="button" class="dms-btn dms-btn-sm" data-act="csv" data-id="' + esc(id) + '">' + ico('dl') + '<span>' + esc(tr('Export CSV', 'تصدير CSV')) + '</span></button>' : '') + '</span></div>';
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
    if (sp.loader) { sp.loader(st.page - 1, ps, st.q.trim(), srvOrder(sp, st)).then(function (res) { if (!chk()) { return; } st.total = res.total; st.rows = res.rows || []; st.loading = false; paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); }, function (e) { if (chk()) { st.loading = false; st.err = errKind(e); paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); } }); return; }
    var cnt = getList(Object.assign({}, base, { fields: ['count(name) as n'], limit_page_length: 1 }), chk).then(function (r) { return r ? +one(r).n || 0 : null; });
    var rows = getList(Object.assign({}, base, { fields: sp.fields, order_by: srvOrder(sp, st), limit_start: (st.page - 1) * ps, limit_page_length: ps }), chk);
    Promise.all([cnt, rows]).then(function (res) {
      if (!chk()) { return; } st.total = res[0]; st.rows = res[1] || []; st.loading = false; paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]'));
    }).catch(function (e) { if (chk()) { st.loading = false; st.err = errKind(e); paintServer(id, HOST.querySelector('[data-tbl="' + id + '"]')); } });
  }
  function paintServer(id, el) {
    if (!el) { return; } var sp = TBL[id], st = SS[id], ps = sp.pageSize || CFG.modalPage;
    var h = '<div class="dms-toolbar"><input type="search" class="dms-input" data-tq="' + esc(id) + '" placeholder="' + esc(sp.searchHint || tr('Search…', 'بحث…')) + '" value="' + esc(st.q) + '" aria-label="' + esc(tr('Search', 'بحث')) + '"><span class="dms-tb-r"><span class="dms-sm">' + (st.total == null ? '' : num(st.total) + ' ' + esc(st.total === 1 ? tr('record', 'سجل') : tr('records', 'سجل'))) + '</span>' +
      (st.total ? '<button type="button" class="dms-btn dms-btn-sm" data-act="csvall" data-id="' + esc(id) + '" title="' + esc(tr('Export up to 5,000 rows', 'تصدير حتى 5,000 سجل')) + '">' + ico('dl') + '<span>' + esc(tr('Export CSV', 'تصدير CSV')) + '</span></button>' : '') + '</span></div>';
    if (st.err) { el.innerHTML = h + alertBox('err', esc(st.err === 'perm' ? tr('Permission denied for your user.', 'لا تملك صلاحية القراءة.') : tr('Technical error while reading this list.', 'خطأ تقني أثناء قراءة القائمة.')) + ' <button type="button" class="dms-linkbtn" data-act="sretry" data-id="' + esc(id) + '">' + esc(tr('Retry', 'إعادة المحاولة')) + '</button>'); return restoreFocus(el, id); }
    if (st.loading && !st.rows) { el.innerHTML = h + '<div class="dms-skel"></div>'; return restoreFocus(el, id); }
    if (!st.rows || !st.rows.length) { el.innerHTML = h + '<div class="dms-tablewrap">' + empty(sp.empty) + '</div>'; return restoreFocus(el, id); }
    var pages = Math.max(1, Math.ceil((st.total || 0) / ps));
    h += '<div class="dms-tablewrap" style="opacity:' + (st.loading ? .55 : 1) + '"' + (st.loading ? ' aria-busy="true"' : '') + '><table class="dms-table' + (sp.cols.length <= 3 ? ' dms-table-sm' : '') + '">' + thead(sp, st.sk, st.dir, 'ssort', id) + '<tbody>' + st.rows.map(function (r) { return tcells(sp, r); }).join('') + '</tbody></table></div>' + pager(id, 'spage', st.page, pages, st.total || 0, ps);
    el.innerHTML = h; restoreFocus(el, id);
  }
  function csvCell(v) { v = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(v) && !/^-?[\d.,]+$/.test(v)) { v = "'" + v; } return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(name, sp, rows) {
    var cols = sp.cols.filter(function (c) { return c.c; }), lines = [cols.map(function (c) { return csvCell(c.h); }).join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return csvCell(c.c(r)); }).join(','); }));
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = String(name).replace(/[^\w-]+/g, '_') + '_' + TODAY + '.csv'; HOST.appendChild(a); a.click(); later(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportServer(id) {
    var sp = TBL[id], st = SS[id], out = [], step = 500, base = srvArgs(sp, st), g = GEN;
    if (sp.loader) { toast(tr('Preparing export…', 'جارٍ تجهيز التصدير…')); var acc = [], pg = function (p) { return sp.loader(p, 500, st.q.trim(), srvOrder(sp, st)).then(function (res) { acc = acc.concat(res.rows || []); return (res.rows || []).length === 500 && acc.length < 5000 ? pg(p + 1) : acc; }); }; pg(0).then(function (rows) { download(sp.file || id, sp, rows.slice(0, 5000)); }, function () { toast(tr('Export failed.', 'تعذر التصدير.'), true); }); return; }
    function next(s) {
      return getList(Object.assign({}, base, { fields: sp.fields, order_by: srvOrder(sp, st), limit_start: s, limit_page_length: step }), function () { return g === GEN; }).then(function (r) {
        out = out.concat(r || []); return (r && r.length === step && out.length < 5000) ? next(s + step) : out;
      });
    }
    toast(tr('Preparing export…', 'جارٍ تجهيز التصدير…'));
    next(0).then(function (rows) { download(sp.file || id, sp, rows.slice(0, 5000)); }, function () { toast(tr('Export failed.', 'تعذر التصدير.'), true); });
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

  /* ---------- drill-downs (overlay) ---------- */
  var OVL = null;
  function openDrill(id) {
    if (id.indexOf('goto:') === 0) { goTab(id.slice(5)); return; }
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
  function renderOverlay() { var el = $('[data-ref="overlay"]'); if (!el) { return; } var app = $('.dms-app'); if (app) { app.inert = !!OVL; } if (!OVL) { Object.keys(TBL).forEach(function (k) { if (k.indexOf('drill') === 0) { delete TBL[k]; } }); } else { delete TBL.drill; } el.innerHTML = overlayHTML(); fillTables(el); var x = el.querySelector('.dms-x'); if (x) { x.focus(); } }
  function closeOverlay() {
    var previous = OVL; OVL = null; renderOverlay(); delete SS.drill; delete TS.drill;
    if (!previous) { return; }
    var opener = previous.opener;
    if (!opener || !opener.isConnected) { opener = Array.prototype.find.call(HOST.querySelectorAll('[data-act="kpi"]'), function (el) { return el.getAttribute('data-v') === previous.openerKey; }); }
    if (opener) { opener.focus({ preventScroll: true }); }
  }

  /* ---------- filters, period, toolbar, tabs ---------- */
  var F = { period: APP.period || 'month', from: '', to: '' }, PERIOD = [];
  (APP.filters || []).forEach(function (f) { F[f.k] = ''; });
  var tab = APP.tabs[0].id, POP = null, FD = null, FS = {}, CAL = null, ANIM = false, built = false, AMC = null;
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
  function renderHeaderState() {
    var b = $('[data-ref="refresh"]'), s = $('[data-ref="stamp"]'), bz = busy();
    if (b) { b.classList.toggle('dms-busy', bz); b.setAttribute('aria-busy', String(bz)); }
    if (s) { s.textContent = (APP.stamp ? APP.stamp() : tr('Read-only', 'للقراءة فقط')) + (LOADED ? ' · ' + tr('Updated ', 'آخر تحديث ') + LOADED : '') + (bz ? ' · ' + tr('loading…', 'جارٍ التحميل…') : ''); }
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
    setToday(); PERIOD = curPeriod(); GEN++; D = {}; LOADED = STAMP;
    Object.keys(SS).forEach(function (k) { SS[k].dirty = true; SS[k].page = 1; }); Object.keys(TS).forEach(function (k) { TS[k].page = 1; });
    APP.load(); ANIM = true; renderAll();
  }

  /* ---------- navigation and popovers ---------- */
  function goTab(id, focusTab, force) {
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
      goTab(APP.tabs[0].id); var p = $('#dms-pending');
      if (p) { var still = G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches; try { p.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' }); } catch (e) { p.scrollIntoView(); } p.focus({ preventScroll: true }); }
      return;
    }
    if (a === 'kpi') { openDrill(v); return; }
    if (a === 'tpage') { TS[id].page = Math.max(1, TS[id].page + (+v)); fillTable(id); return; }
    if (a === 'tsort') { var st = TS[id]; if (st.sk === v) { st.dir = -st.dir; } else { st.sk = v; st.dir = 1; } st.page = 1; fillTable(id); focusHead(id, v); return; }
    if (a === 'spage') { var ss = SS[id]; ss.page = Math.max(1, ss.page + (+v)); ss.dirty = true; fillTable(id); return; }
    if (a === 'ssort') { var s2 = SS[id]; if (s2.sk === v) { s2.dir = -s2.dir; } else { s2.sk = v; s2.dir = 1; } s2.page = 1; s2.dirty = true; fillTable(id); focusHead(id, v); return; }
    if (a === 'sretry') { SS[id].dirty = true; fillTable(id); return; }
    if (a === 'csv') { var sp = TBL[id]; download(sp.file || id, sp, clientRows(sp, TS[id])); return; }
    if (a === 'csvall') { exportServer(id); return; }
  }
  function focusHead(id, v) { var th = HOST.querySelector('[data-tbl="' + id + '"] th[data-v="' + v + '"]'); if (th) { th.focus(); } }
  function onInput(ev) {
    var n = ev.target; if (!n || !n.getAttribute || !HOST.contains(n)) { return; }
    var fs = n.getAttribute('data-fs'), fd = n.getAttribute('data-fd'), tq = n.getAttribute('data-tq');
    if (APP.onInput && APP.onInput(n, ev) === true) { return; }
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

  var C = { emp: null, taskNames: [], todoMap: {}, projAll: [], projOpts: [] }, NONE = ['__none__'];
  var ATT_ST = ['Present', 'Absent', 'On Leave', 'Half Day', 'Work From Home'], OPEN_ST = ['Open', 'Working', 'Pending Review'], DONE_ST = ['Completed', 'Cancelled', 'Template'];
  var ST_AR = { Present: 'حاضر', Absent: 'غائب', 'On Leave': 'في إجازة', 'Half Day': 'نصف يوم', 'Work From Home': 'عمل من المنزل', Open: 'مفتوح', Working: 'قيد العمل', 'Pending Review': 'بانتظار المراجعة', Overdue: 'متأخر', Completed: 'مكتمل', Cancelled: 'ملغى', Template: 'قالب', Approved: 'موافق عليه', Rejected: 'مرفوض', Active: 'نشط', Submitted: 'مقدّم', Draft: 'مسودة' };
  function stl(s) { return LANG === 'ar' && ST_AR[s] ? ST_AR[s] : s; }
  function stTone(s) { return /^(Completed|Approved|Present|Submitted|Active)$/.test(s) ? 'ok' : /^(Overdue|Rejected|Absent)$/.test(s) ? 'bad' : /^(Open|Pending Review|Draft|Half Day)$/.test(s) ? 'warn' : 'n'; }
  function chip(s) { return s ? stat(stTone(s), stl(s)) : '<span class="dms-sm">—</span>'; }
  function dsChip(d) { return d === 1 ? stat('ok', stl('Submitted')) : d === 2 ? stat('n', stl('Cancelled')) : stat('warn', stl('Draft')); }
  function n0(v) { return Number(v) || 0; }
  function hm(v) { return v ? String(v).slice(11, 16) : ''; }
  function two(a, b) { return '<div class="dms-cols-2 dms-grid">' + a + b + '</div>'; }
  function bar(p) { var x = Math.max(0, Math.min(100, Math.round(n0(p)))); return '<span class="sr-prog" role="img" aria-label="' + x + '%"><i style="width:' + x + '%"></i></span><span class="dms-num sr-pct">' + x + '%</span>'; }
  function list(items, emptyTxt) { return items.length ? '<ul class="sr-list">' + items.join('') + '</ul>' : empty(emptyTxt); }
  function facts(rows) { return '<div class="dms-facts sr-facts">' + rows.map(function (r) { return '<div><span class="dms-sm">' + esc(r[0]) + '</span><b class="dms-num' + (r[2] ? ' dms-tone-' + r[2] : '') + '">' + r[1] + '</b>' + (r[3] ? '<span class="dms-sm">' + r[3] + '</span>' : '') + '</div>'; }).join('') + '</div>'; }
  function rngTo() { return PERIOD[1] > TODAY ? TODAY : PERIOD[1]; }
  function gl(dt, a) { return getList(Object.assign({ doctype: dt, limit_page_length: 0 }, a), null); }
  function cnt(dt, f, or) { return getList({ doctype: dt, fields: ['count(name) as n'], filters: f, or_filters: or, limit_page_length: 1 }, null).then(function (r) { return +((r || [])[0] || {}).n || 0; }); }

  /* ============================================================ context: employee, assigned tasks, projects */
  function loadCtx() {
    var u = (G.frappe && frappe.session && frappe.session.user) || '';
    return gl('Employee', { fields: ['name', 'employee_name', 'designation', 'department', 'branch', 'reports_to', 'status', 'company', 'holiday_list'], filters: [['user_id', '=', u]], limit_page_length: 1 }).then(function (r) {
      var e = (r || [])[0] || null; C.emp = e; if (!e) { return null; }
      var p1 = e.reports_to ? gl('Employee', { fields: ['employee_name'], filters: [['name', '=', e.reports_to]], limit_page_length: 1 }).then(function (x) { e.manager = x[0] ? x[0].employee_name : e.reports_to; }, function () { e.manager = e.reports_to; }) : Promise.resolve();
      var p2 = gl('ToDo', { fields: ['reference_name', 'assigned_by', 'assigned_by_full_name', 'status', 'priority', 'modified'], filters: [['allocated_to', '=', u], ['reference_type', '=', 'Task'], ['status', '!=', 'Cancelled']] }).then(function (x) { C.todoMap = {}; (x || []).forEach(function (q) { C.todoMap[q.reference_name] = q; }); C.taskNames = Object.keys(C.todoMap); }, function () { C.todoErr = true; });
      var p3 = gl('Project User', { parent: 'Project', fields: ['parent'], filters: [['user', '=', u]] }).then(function (x) { return uniq((x || []).map(function (q) { return q.parent; })); }, function () { return []; });
      return Promise.all([p1, p2, p3]).then(function (res) {
        return (C.taskNames.length ? gl('Task', { fields: ['project'], filters: [['name', 'in', C.taskNames], ['project', 'is', 'set']] }) : Promise.resolve([])).then(function (x) {
          C.projAll = uniq(res[2].concat((x || []).map(function (q) { return q.project; })));
          return C.projAll.length ? gl('Project', { fields: ['name', 'project_name', 'status'], filters: [['name', 'in', C.projAll]] }).then(function (pp) { C.projOpts = pp || []; }, function () { C.projOpts = []; }) : null;
        });
      });
    }, function (e) { C.empErr = errKind(e); C.emp = null; });
  }

  /* ============================================================ filters per source (v1 rules) */
  function attF(extra) { return [['employee', '=', C.emp.name], ['docstatus', '=', 1], ['attendance_date', '>=', PERIOD[0]], ['attendance_date', '<=', rngTo()]].concat(extra || []); }
  function lvF(extra) { return [['employee', '=', C.emp.name], ['docstatus', '<', 2], ['from_date', '<=', PERIOD[1]], ['to_date', '>=', PERIOD[0]]].concat(extra || []); }
  function lvBase(extra) { return [['employee', '=', C.emp.name], ['docstatus', '<', 2]].concat(extra || []); }
  function tkBase(extra, useSt) { var f = [['name', 'in', C.taskNames.length ? C.taskNames : NONE]]; if (F.project) { f.push(['project', '=', F.project]); } if (useSt && F.taskst) { f.push(['status', '=', F.taskst]); } return f.concat(extra || []); }
  function overdueOr() { return [['status', '=', 'Overdue'], ['exp_end_date', '<', TODAY]]; }
  var RENT = {
    'Rental Quotation': { dateF: 'date', custF: 'ms', fields: ['name', 'date', 'ms', 'project_and_address', 'subject', 'total', '`from`', 'prepared_by', 'docstatus'], emp: ['from', 'prepared_by'], party: 'ms', total: 'total' },
    'Rental Delivery Note': { dateF: 'date', custF: 'customer', fields: ['name', 'date', 'delivery_date', 'customer', 'project_and_address', '`from`', 'prepared_by', 'docstatus'], emp: ['from', 'prepared_by'], party: 'customer' },
    'Rental Sales Invoice': { dateF: 'invoice_date', custF: 'customer', fields: ['name', 'invoice_date', 'customer', 'project_and_address', 'total', 'prepared_by', 'docstatus'], emp: ['prepared_by'], party: 'customer', total: 'total' },
    'Rental Purchase Order': { dateF: 'date', custF: null, fields: ['name', 'date', 'supplier', 'project_and_address', 'total', '`from`', 'prepared_by', 'docstatus'], emp: ['from', 'prepared_by'], party: 'supplier', total: 'total' }
  };
  var RDT = Object.keys(RENT), RDN = 'Rental Delivery Note';
  function rentF(dt, ds) { var m = RENT[dt], f = [[m.dateF, '>=', PERIOD[0]], [m.dateF, '<=', PERIOD[1]]], d = ds != null ? ds : F.ds; f.push(d !== '' && d != null ? ['docstatus', '=', Number(d)] : ['docstatus', '<', 2]); if (F.customer && m.custF) { f.push([m.custF, 'like', '%' + F.customer + '%']); } return f; }
  function rentOr(dt) { return RENT[dt].emp.map(function (c) { return [c, '=', C.emp.name]; }); }

  /* ============================================================ loading */
  function loadAll() {
    var e = C.emp;
    run('att', function () { return gl('Attendance', { fields: ['status', 'count(name) as n'], filters: attF(), group_by: 'status' }).then(function (r) { var m = {}; (r || []).forEach(function (x) { m[x.status] = n0(x.n); }); return m; }); });
    run('attx', function () { return Promise.all([cnt('Attendance', attF([['late_entry', '=', 1]])), cnt('Attendance', attF([['early_exit', '=', 1]])), gl('Attendance', { fields: ['count(name) as n', 'sum(working_hours) as h'], filters: attF([['working_hours', '>', 0]]) }), cnt('Attendance Request', [['employee', '=', e.name], ['docstatus', '=', 0]]).catch(function () { return null; }), gl('Attendance', { fields: ['status', 'in_time', 'out_time'], filters: [['employee', '=', e.name], ['attendance_date', '=', TODAY], ['docstatus', '=', 1]], limit_page_length: 1 })])
      .then(function (r) { var h = (r[2] || [])[0] || {}; return { late: r[0], early: r[1], hrsN: n0(h.n), hrs: n0(h.h), req: r[3], today: (r[4] || [])[0] || null }; }); });
    run('attRows', function () { return fetchAll({ doctype: 'Attendance', fields: ['attendance_date', 'status'], filters: attF(), order_by: 'attendance_date asc' }, null, 5000); });
    run('lv', function () { return callP('hrms.hr.doctype.leave_application.leave_application.get_leave_details', { employee: e.name, date: TODAY }).then(function (d) { return (d && d.leave_allocation) || {}; }); });
    run('lvx', function () { return Promise.all([gl('Leave Application', { fields: ['sum(total_leave_days) as s'], filters: lvF([['status', '=', 'Approved'], ['docstatus', '=', 1]]) }), gl('Leave Application', { fields: ['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'workflow_state', 'leave_approver_name', 'modified'], filters: lvBase([['status', '=', 'Open']]), order_by: 'from_date asc' }), gl('Leave Application', { fields: ['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days'], filters: lvBase([['status', '=', 'Approved'], ['docstatus', '=', 1], ['from_date', '>=', TODAY]]), order_by: 'from_date asc' }), cnt('Leave Application', lvF([['status', '=', 'Rejected']])), gl('Leave Application', { fields: ['from_date', 'total_leave_days'], filters: lvF([['status', '=', 'Approved'], ['docstatus', '=', 1]]) }),
      gl('Leave Application', { fields: ['name', 'employee_name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'modified'], filters: [['leave_approver', '=', frappe.session.user], ['status', '=', 'Open'], ['docstatus', '<', 2]], order_by: 'from_date asc' })])
      .then(function (r) { return { taken: n0(((r[0] || [])[0] || {}).s), pend: r[1] || [], up: r[2] || [], rej: r[3], dist: r[4] || [], appr: r[5] || [] }; }); });
    run('tk', function () { return Promise.all([gl('Task', { fields: ['status', 'count(name) as n'], filters: tkBase(), group_by: 'status' }), gl('Task', { fields: ['name', 'subject', 'project', 'priority', 'exp_end_date', 'status', 'modified'], filters: tkBase([['status', 'not in', DONE_ST]]), or_filters: overdueOr(), order_by: 'exp_end_date asc' }), gl('Task', { fields: ['name', 'subject', 'exp_end_date', 'status', 'project'], filters: tkBase([['status', 'not in', DONE_ST], ['exp_end_date', '>=', TODAY]]), order_by: 'exp_end_date asc', limit_page_length: 6 }), C.projAll.length ? cnt('Project', [['name', 'in', C.projAll], ['status', '=', 'Open']]) : Promise.resolve(0)])
      .then(function (r) { var m = {}; (r[0] || []).forEach(function (x) { m[x.status] = n0(x.n); }); return { by: m, over: r[1] || [], next: r[2] || [], proj: r[3] }; }); });
    run('rent', function () { return Promise.all(RDT.map(function (dt) { var m = RENT[dt]; return Promise.all([cnt(dt, rentF(dt), rentOr(dt)), cnt(dt, rentF(dt, '0'), rentOr(dt)), gl(dt, { fields: m.fields, filters: rentF(dt), or_filters: rentOr(dt), order_by: m.dateF + ' desc', limit_page_length: 500 })]).then(function (x) { return { dt: dt, n: x[0], draft: x[1], rows: (x[2] || []).map(function (r) { return { dt: dt, name: r.name, date: r[m.dateF], party: r[m.party] || '', site: r.project_and_address || '', total: m.total ? r.total : null, emp: r['from'] || r.prepared_by || '', docstatus: r.docstatus }; }) }; }); })).then(function (parts) { var o = { by: {}, rows: [] }; parts.forEach(function (p) { o.by[p.dt] = p; o.rows = o.rows.concat(p.rows); }); o.rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }); return o; }); });
    run('items', function () { return fetchAll({ doctype: RDN, fields: RENT[RDN].fields, filters: rentF(RDN), or_filters: rentOr(RDN) }, null, 2000).then(function (h) { if (!h.length) { return []; } var hmap = {}; h.forEach(function (x) { hmap[x.name] = x; }); return getList({ doctype: 'Rental Delivery Note Table', parent: RDN, fields: ['parent', 'item_code', 'item_name', 'quantity', 'uom'], filters: [['parent', 'in', h.map(function (x) { return x.name; })]], limit_page_length: 0 }, null).then(function (c) { return (c || []).map(function (x) { var p = hmap[x.parent] || {}; return { parent: x.parent, item_code: x.item_code, item_name: x.item_name, quantity: n0(x.quantity), uom: x.uom || '—', customer: p.customer, site: p.project_and_address, delivery_date: p.delivery_date, docstatus: p.docstatus }; }); }); }); });
    run('hol', function () { if (!e.holiday_list) { return Promise.resolve([]); } return callP('frappe.client.get', { doctype: 'Holiday List', name: e.holiday_list }).then(function (d) { return ((d && d.holidays) || []).filter(function (h) { return h.holiday_date >= TODAY; }).sort(function (a, b) { return a.holiday_date < b.holiday_date ? -1 : 1; }).slice(0, 6); }); });
    run('recent', function () { var s = [gl('Leave Application', { fields: ['name', 'modified'], filters: [['employee', '=', e.name]], order_by: 'modified desc', limit_page_length: 4 }).then(function (r) { return (r || []).map(function (x) { return { dt: 'Leave Application', name: x.name, modified: x.modified }; }); }), gl('Daily Task Management', { fields: ['name', 'modified'], filters: [['employee', '=', e.name]], order_by: 'modified desc', limit_page_length: 4 }).then(function (r) { return (r || []).map(function (x) { return { dt: 'Daily Task Management', name: x.name, modified: x.modified }; }); }), gl('Task', { fields: ['name', 'modified'], filters: tkBase(), order_by: 'modified desc', limit_page_length: 4 }).then(function (r) { return (r || []).map(function (x) { return { dt: 'Task', name: x.name, modified: x.modified }; }); })];
      ['Rental Quotation', RDN].forEach(function (dt) { s.push(gl(dt, { fields: ['name', 'modified'], or_filters: rentOr(dt), order_by: 'modified desc', limit_page_length: 3 }).then(function (r) { return (r || []).map(function (x) { return { dt: dt, name: x.name, modified: x.modified }; }); })); });
      return Promise.all(s.map(function (p) { return p.catch(function () { return []; }); })).then(function (a) { return [].concat.apply([], a).sort(function (p, q) { return String(q.modified).localeCompare(String(p.modified)); }).slice(0, 8); }); });
    run('cal', function () { return calLoad(); });
    run('attreqRows', function () { return gl('Attendance Request', { fields: ['name', 'from_date', 'to_date', 'reason'], filters: [['employee', '=', e.name], ['docstatus', '=', 0]], order_by: 'modified desc', limit_page_length: 200 }).catch(function () { return []; }); });
  }
  var CALM = '';
  function calMonth() { return CALM || rngTo().slice(0, 8) + '01'; }
  function calLoad() { var m0 = calMonth(), m1 = addDays(addMonths(m0, 1), -1); return gl('Attendance', { fields: ['attendance_date', 'status', 'in_time', 'out_time'], filters: [['employee', '=', C.emp.name], ['docstatus', '=', 1], ['attendance_date', '>=', m0], ['attendance_date', '<=', m1]] }); }

  /* ============================================================ figures */
  function attPct(m) { var p = n0(m.Present) + n0(m['Work From Home']), h = n0(m['Half Day']), a = n0(m.Absent), den = p + h + a; return den ? (p + 0.5 * h) / den * 100 : null; }
  function kval(key, f) { return D[key + 'Err'] ? '—' : D[key] == null ? '…' : f(D[key]); }
  function balTotal(la) { var ks = Object.keys(la); return ks.length ? ks.reduce(function (s, k) { return s + n0(la[k].remaining_leaves); }, 0) : null; }
  function tkOpen(by) { return OPEN_ST.reduce(function (s, k) { return s + n0(by[k]); }, 0); }
  function tkAll(by) { return Object.keys(by).reduce(function (s, k) { return s + by[k]; }, 0); }
  function qtyUom(rows) { var m = {}; rows.forEach(function (r) { m[r.uom] = (m[r.uom] || 0) + r.quantity; }); return m; }
  function qtyHtml(m) { var ks = Object.keys(m); return ks.length ? ks.map(function (u) { return esc(amt(m[u]).replace(/\.00$/, '')) + ' <small>' + esc(u) + '</small>'; }).join(' · ') : '0'; }
  function NA() { return tr('Not tracked: the rental DocTypes have no return date, returned quantity or return status field.', 'غير متتبَّع: لا توجد في مستندات التأجير حقول تاريخ أو كمية أو حالة الإرجاع.'); }

  /* ============================================================ tables */
  function srv(id, dt, fields, filters, cols, o) { o = o || {}; return regTable(Object.assign({ id: id, server: true, dt: dt, fields: fields, filters: filters, order: o.order, search: o.search || ['name'], cols: cols, pageSize: o.pageSize || 10, file: o.file || id, parent: o.parent }, o.x || {})); }
  function srvOr(id, dt, fields, filters, or, cols, o) {
    o = o || {}; return regTable({ id: id, server: true, dt: dt, fields: fields, filters: filters, cols: cols, pageSize: o.pageSize || 10, file: o.file || id, order: o.order, searchHint: tr('Document number…', 'رقم المستند…'),
      loader: function (p, size, q, order) { var f = filters.concat(q ? [['name', 'like', '%' + q + '%']] : []); return Promise.all([cnt(dt, f, or), getList({ doctype: dt, fields: fields, filters: f, or_filters: or, order_by: order || o.order, limit_start: p * size, limit_page_length: size }, null)]).then(function (r) { return { total: r[0], rows: r[1] || [] }; }); } });
  }
  var ATTF = ['name', 'attendance_date', 'status', 'in_time', 'out_time', 'working_hours', 'late_entry', 'early_exit', 'shift', 'leave_type'];
  function attCols() { return [linkCol(tr('Date', 'التاريخ'), 'Attendance', 'name', 'attendance_date'), col(tr('Status', 'الحالة'), 'status', { fmt: chip }), col(tr('Check-in', 'الدخول'), 'in_time', { fmt: function (v) { return '<span class="dms-num">' + esc(hm(v)) + '</span>'; } }), col(tr('Check-out', 'الخروج'), 'out_time', { fmt: function (v) { return '<span class="dms-num">' + esc(hm(v)) + '</span>'; } }), col(tr('Working hours', 'ساعات العمل'), 'working_hours', { num: 1, fmt: function (v) { return v > 0 ? '<span class="dms-num">' + esc(amt(v)) + '</span>' : ''; } }), col(tr('Late / early', 'تأخر / خروج مبكر'), 'late_entry', { sort: false, fmt: function (v, r) { return (v ? stat('warn', tr('Late', 'متأخر')) + ' ' : '') + (r.early_exit ? stat('warn', tr('Early exit', 'خروج مبكر')) : ''); } }), col(tr('Shift', 'الوردية'), 'shift'), col(tr('Leave type', 'نوع الإجازة'), 'leave_type')]; }
  var LVF = ['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'status', 'workflow_state', 'leave_approver_name', 'leave_approver', 'description', 'docstatus'];
  function lvCols() { return [linkCol(tr('Application', 'الطلب'), 'Leave Application', 'name'), col(tr('Leave type', 'نوع الإجازة'), 'leave_type'), col(tr('From', 'من'), 'from_date', { fmt: dtc }), col(tr('To', 'إلى'), 'to_date', { fmt: dtc }), col(tr('Days', 'الأيام'), 'total_leave_days', { num: 1, fmt: function (v) { return '<span class="dms-num">' + esc(num(v)) + '</span>'; } }), col(tr('Status', 'الحالة'), 'status', { fmt: chip }), col(tr('Approval', 'الموافقة'), 'workflow_state', { fmt: function (v, r) { return bdi(v || (r.docstatus === 1 ? stl('Submitted') : stl('Draft'))); } }), col(tr('Approver', 'المعتمد'), 'leave_approver_name', { fmt: function (v, r) { return bdi(v || r.leave_approver || '—'); } })]; }
  var TKF = ['name', 'subject', 'project', 'priority', 'exp_start_date', 'exp_end_date', 'act_end_date', 'completed_on', 'progress', 'status'];
  function tkCols() { return [linkCol(tr('Task', 'المهمة'), 'Task', 'name', 'subject'), col(tr('Project', 'المشروع'), 'project', { fmt: function (v) { return v ? docLink('Project', v) : '—'; } }), col(tr('Assigned by', 'أسندها'), 'name', { sort: false, fmt: function (v) { var q = C.todoMap[v]; return bdi(q ? q.assigned_by_full_name || q.assigned_by : '—'); } }), col(tr('Priority', 'الأولوية'), 'priority'), col(tr('Expected end', 'الانتهاء المتوقع'), 'exp_end_date', { fmt: function (v, r) { return dtc(v) + (v && v < TODAY && DONE_ST.indexOf(r.status) < 0 ? ' ' + overdueTag(v) : ''); } }), col(tr('Progress', 'التقدم'), 'progress', { fmt: function (v) { return v == null ? '—' : bar(v); } }), col(tr('Status', 'الحالة'), 'status', { fmt: chip })]; }
  function rentCols(dt) { var m = RENT[dt], c = [linkCol(tr('Document', 'المستند'), dt, 'name'), col(tr('Date', 'التاريخ'), m.dateF, { fmt: dtc }), col(tr('Customer / supplier', 'العميل / المورد'), m.party), col(tr('Project / site', 'المشروع / الموقع'), 'project_and_address')]; if (dt === RDN) { c.push(col(tr('Dispatch date', 'تاريخ الصرف'), 'delivery_date', { fmt: dtc })); } if (m.total) { c.push(col(tr('Total', 'الإجمالي'), 'total', { num: 1, fmt: function (v) { return '<span class="dms-num">' + esc(amt(v)) + '</span>'; } })); } c.push(col(tr('Employee', 'الموظف'), 'prepared_by', { sort: false, fmt: function (v, r) { return bdi(r['from'] || v || '—'); } })); c.push(col(tr('Status', 'الحالة'), 'docstatus', { fmt: dsChip })); return c; }

  /* ============================================================ actions pending */
  function actSpecs() {
    return [
      { id: 'a_appr', client: true, short: tr('Leave approvals for me', 'موافقات إجازة لي'), title: tr('Leave applications waiting for your approval', 'طلبات إجازة بانتظار موافقتك'), why: tr('You are the leave approver and the application is open.', 'أنت معتمد الإجازة والطلب مفتوح.') },
      { id: 'a_over', client: true, short: tr('Overdue tasks', 'مهام متأخرة'), title: tr('Your overdue tasks', 'مهامك المتأخرة'), why: tr('Assigned to you (ToDo); past the expected end date or marked Overdue.', 'مسندة إليك؛ تجاوزت تاريخ الانتهاء أو حالتها متأخرة.') },
      { id: 'a_attreq', client: true, short: tr('Draft attendance requests', 'طلبات حضور مسودة'), title: tr('Your attendance requests still in draft', 'طلبات حضورك ما زالت مسودة'), why: tr('Submit them so attendance can be approved.', 'قدّمها ليتم اعتماد الحضور.') },
      { id: 'a_rdraft', client: true, short: tr('Draft rental documents', 'مستندات تأجير مسودة'), title: tr('Rental documents you prepared that are still drafts', 'مستندات تأجير أعددتها ما زالت مسودة'), why: tr('In the period; linked to you through From or Prepared By.', 'في الفترة؛ مرتبطة بك عبر From أو Prepared By.') },
      { id: 'a_lpend', client: true, short: tr('Your open leave applications', 'طلبات إجازتك المفتوحة'), title: tr('Your leave applications awaiting a decision', 'طلبات إجازتك بانتظار القرار'), why: tr('Follow up with your approver if the leave is close.', 'تابع مع المعتمد إن اقترب موعد الإجازة.') }
    ];
  }
  function actClient() {
    var o = {}, item = function (p, dt, f) { return function (r) { var x = f(r); return Object.assign({ p: p, score: score(p, 0, ageOf(x.d)), dt: dt, name: r.name, tone: p === 'high' ? 'bad' : p === 'med' ? 'warn' : 'n' }, x); }; };
    if (D.lvxErr) { o.a_appr = o.a_lpend = 'ERR:' + D.lvxErr; } else if (D.lvx) {
      o.a_appr = { rows: D.lvx.appr, item: item('high', 'Leave Application', function (r) { return { title: r.employee_name || r.name, desc: r.leave_type + ' · ' + num(r.total_leave_days) + tr(' days', ' يوم'), who: r.name, due: r.from_date + ' → ' + r.to_date, d: r.from_date }; }) };
      o.a_lpend = { rows: D.lvx.pend, item: item('low', 'Leave Application', function (r) { return { title: r.leave_type, desc: r.name + ' · ' + (r.workflow_state || stl('Open')), who: r.leave_approver_name || null, due: r.from_date + ' → ' + r.to_date, d: r.from_date }; }) };
    }
    if (D.tkErr) { o.a_over = 'ERR:' + D.tkErr; } else if (D.tk) { o.a_over = { rows: D.tk.over, item: item('high', 'Task', function (r) { return { title: r.subject || r.name, desc: [r.name, r.project].filter(Boolean).join(' · '), who: (C.todoMap[r.name] || {}).assigned_by_full_name || null, due: r.exp_end_date ? tr('Due ', 'مستحقة ') + r.exp_end_date : stl('Overdue'), d: r.exp_end_date || TODAY }; }) }; }
    if (D.attxErr) { o.a_attreq = 'ERR:' + D.attxErr; } else if (D.attx) { o.a_attreq = D.attx.req == null ? 'ERR:perm' : { rows: D.attreqRows || [], count: D.attx.req, item: item('med', 'Attendance Request', function (r) { return { title: r.name, desc: (r.from_date || '') + ' → ' + (r.to_date || ''), who: null, due: r.reason || '', d: r.from_date }; }) }; }
    if (D.rentErr) { o.a_rdraft = 'ERR:' + D.rentErr; } else if (D.rent) { var dr = D.rent.rows.filter(function (r) { return r.docstatus === 0; }); o.a_rdraft = { rows: dr, count: RDT.reduce(function (s, dt) { return s + D.rent.by[dt].draft; }, 0), item: function (r) { return { p: 'med', score: score('med', 0, ageOf(r.date)), dt: r.dt, name: r.name, title: r.party || r.name, desc: r.name + ' · ' + (r.site || ''), who: null, due: r.date || '', tone: 'warn' }; } }; }
    return o;
  }

  /* ============================================================ overview */
  function tabOverview(AM) {
    var e = C.emp, x = D.attx;
    var h = kpis([
      kpi({ label: tr("Today's attendance", 'حضور اليوم'), val: x ? (x.today ? chip(x.today.status) : stat('n', tr('Not marked yet', 'لم يُسجَّل بعد'))) : kval('attx', function () { return ''; }), sub: esc(x && x.today ? [hm(x.today.in_time), hm(x.today.out_time)].filter(Boolean).join(' → ') : TODAY), act: 'goto:att' }),
      kpi({ label: tr('Present days', 'أيام الحضور'), dot: 'var(--dms-ok)', val: kval('att', function (m) { return num(n0(m.Present) + n0(m['Work From Home'])); }), sub: esc(tr('Including work from home', 'يشمل العمل من المنزل')) }),
      kpi({ label: tr('Absent days', 'أيام الغياب'), dot: 'var(--dms-bad)', val: kval('att', function (m) { return num(n0(m.Absent)); }) }),
      kpi({ label: tr('Attendance %', 'نسبة الحضور'), val: kval('att', function (m) { var p = attPct(m); return p == null ? '—' : p.toFixed(1) + '%'; }), sub: esc(tr('Leave days excluded', 'أيام الإجازة مستبعدة')) }),
      kpi({ label: tr('Leave balance', 'رصيد الإجازات'), dot: 'var(--dms-royal)', val: kval('lv', function (la) { var b = balTotal(la); return b == null ? '—' : num(b); }), sub: esc(D.lv ? num(Object.keys(D.lv).length) + tr(' leave types · as of today', ' أنواع · حتى اليوم') : D.lvErr ? tr('Could not be read from the HR app', 'تعذرت القراءة من تطبيق الموارد البشرية') : ''), act: 'goto:leave' }),
      kpi({ label: tr('Overdue tasks', 'مهام متأخرة'), dot: 'var(--dms-bad)', val: kval('tk', function (t) { return num(t.over.length); }), sub: esc(D.tk ? num(tkOpen(D.tk.by)) + tr(' open of ', ' مفتوحة من ') + num(tkAll(D.tk.by)) : ''), act: 'goto:tasks' })
    ], true);
    var prof = facts([[tr('Employee', 'الموظف'), bdi(e.employee_name)], [tr('Employee ID', 'رقم الموظف'), bdi(e.name)], [tr('Designation', 'المسمى'), bdi(e.designation || '—')], [tr('Department', 'القسم'), bdi(e.department || '—')], [tr('Branch / location', 'الفرع / الموقع'), bdi(e.branch || '—')], [tr('Reporting manager', 'المدير المباشر'), bdi(e.manager || e.reports_to || '—')]]);
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' + panel(tr('Employee profile', 'بطاقة الموظف'), prof) + panel(tr('Attendance in the period', 'الحضور في الفترة'), src('att', 'Attendance', attMix)) + '</div></div>';
    h += two(panel(tr('My tasks by status', 'مهامي حسب الحالة'), src('tk', 'Task', function (t) { var ks = Object.keys(t.by); return ks.length ? hbars(ks.map(function (k) { return { label: stl(k), value: t.by[k], color: stTone(k) === 'bad' ? 'var(--dms-bad)' : stTone(k) === 'ok' ? 'var(--dms-ok)' : null }; }).sort(function (a, b) { return b.value - a.value; }), num) : empty(tr('No tasks are assigned to you.', 'لا مهام مسندة إليك.')); })),
      panel(tr('Upcoming holidays', 'العطلات القادمة'), src('hol', 'Holiday List', function (r) { return list(r.map(function (x) { return '<li><span>' + bdi(x.description ? String(x.description).replace(/<[^>]*>/g, '') : '') + '</span><b class="dms-num">' + esc(x.holiday_date) + '</b></li>'; }), tr('No upcoming holidays, or the holiday list is not accessible.', 'لا عطلات قادمة أو قائمة العطلات غير متاحة.')); })));
    h += two(panel(tr('Upcoming deadlines', 'المواعيد القادمة'), src('tk', 'Task', function (t) { return list(t.next.map(function (r) { return '<li><span>' + docLink('Task', r.name, r.subject || r.name) + '</span><b class="dms-num">' + esc(r.exp_end_date) + '</b></li>'; }), tr('No upcoming deadlines.', 'لا مواعيد قادمة.')); })),
      panel(tr('Recent rental documents', 'أحدث مستندات التأجير'), src('rent', tr('Rental documents', 'مستندات التأجير'), function (r) { return list(r.rows.slice(0, 6).map(function (x) { return '<li><span>' + esc(rentLabel(x.dt)) + ' ' + docLink(x.dt, x.name) + ' · ' + bdi(x.party) + '</span>' + dsChip(x.docstatus) + '</li>'; }), tr('No rental documents linked to you in the period.', 'لا مستندات تأجير مرتبطة بك في الفترة.')); })));
    return h + panel(tr('Recent activity', 'النشاط الأخير'), src('recent', tr('Recent activity', 'النشاط الأخير'), function (r) { return list(r.map(function (x) { return '<li><span>' + esc(rentLabel(x.dt)) + ' ' + docLink(x.dt, x.name) + '</span><b class="dms-num">' + esc(String(x.modified || '').slice(0, 10)) + '</b></li>'; }), tr('No recent activity.', 'لا نشاط حديث.')); }));
  }
  function rentLabel(dt) { var l = APP.dtLabels[dt] || { 'Daily Task Management': ['Daily task log', 'سجل المهام اليومية'] }[dt]; return l ? tr(l[0], l[1]) : dt; }
  function attMix(m) { var segs = ATT_ST.map(function (s, i) { return { label: stl(s), value: n0(m[s]), color: ['var(--dms-ok)', 'var(--dms-bad)', 'var(--dms-royal)', 'var(--dms-age3)', '#6b8be0'][i] }; }); var tot = segs.reduce(function (s, x) { return s + x.value; }, 0); return tot ? mixBar(segs) + hbars(segs.filter(function (x) { return x.value; }), num) : empty(tr('No submitted attendance in the period.', 'لا حضور مقدّم في الفترة.')); }

  /* ============================================================ attendance */
  function tabAtt() {
    var x = D.attx, m = D.att || {};
    var h = note(esc(tr('Counts include submitted attendance up to today. Attendance % = (present + work from home + ½ half day) ÷ (present + work from home + half day + absent); leave days are excluded. Working hours exist only on rows that carry them.', 'تشمل الأعداد الحضور المقدّم حتى اليوم. النسبة = (حاضر + من المنزل + ½ نصف يوم) ÷ (حاضر + من المنزل + نصف يوم + غائب)؛ أيام الإجازة مستبعدة. الساعات موجودة فقط في الصفوف التي تحملها.')));
    h += kpis([kpi({ label: tr('Present days', 'أيام الحضور'), dot: 'var(--dms-ok)', val: kval('att', function () { return num(n0(m.Present) + n0(m['Work From Home'])); }) }), kpi({ label: tr('Absent days', 'أيام الغياب'), dot: 'var(--dms-bad)', val: kval('att', function () { return num(n0(m.Absent)); }) }), kpi({ label: tr('Late arrivals', 'مرات التأخر'), dot: 'var(--dms-age3)', val: kval('attx', function (a) { return num(a.late); }) }), kpi({ label: tr('Early check-outs', 'خروج مبكر'), dot: 'var(--dms-age3)', val: kval('attx', function (a) { return num(a.early); }) }),
      kpi({ label: tr('Attendance %', 'نسبة الحضور'), val: kval('att', function () { var p = attPct(m); return p == null ? '—' : p.toFixed(1) + '%'; }) }), kpi({ label: tr('Working hours', 'ساعات العمل'), val: kval('attx', function (a) { return a.hrsN ? amt(a.hrs).replace(/\.00$/, '') + ' h' : '—'; }), sub: esc(x && D.att ? num(x.hrsN) + tr(' of ', ' من ') + num(n0(m.Present) + n0(m['Work From Home'])) + tr(' present days have hours', ' يوم حضور لها ساعات') : '') }),
      kpi({ label: tr('On-leave days', 'أيام الإجازة'), val: kval('att', function () { return num(n0(m['On Leave'])); }) }), kpi({ label: tr('Half days', 'أنصاف الأيام'), val: kval('att', function () { return num(n0(m['Half Day'])); }) }), kpi({ label: tr('Draft attendance requests', 'طلبات حضور مسودة'), val: kval('attx', function (a) { return a.req == null ? '—' : num(a.req); }), sub: esc(x && x.req == null ? tr('Attendance Request is not accessible', 'طلبات الحضور غير متاحة') : '') })]);
    h += two(panel(tr('Attendance calendar', 'تقويم الحضور'), calendar()), panel(tr('Attendance by month', 'الحضور حسب الشهر'), src('attRows', 'Attendance', function (rows) { var mm = {}, keys = monthList(PERIOD[0], rngTo()); rows.forEach(function (r) { var k = String(r.attendance_date).slice(0, 7); var o = mm[k] || (mm[k] = {}); o[r.status] = (o[r.status] || 0) + 1; }); return barChart(keys, 'month', [{ label: tr('Present', 'حاضر'), color: 'var(--dms-ok)', val: function (k) { return n0((mm[k] || {}).Present) + n0((mm[k] || {})['Work From Home']); } }, { label: tr('Absent', 'غائب'), color: 'var(--dms-bad)', val: function (k) { return n0((mm[k] || {}).Absent); } }, { label: tr('Leave or half day', 'إجازة أو نصف يوم'), color: 'var(--dms-age3)', val: function (k) { return n0((mm[k] || {})['On Leave']) + n0((mm[k] || {})['Half Day']); } }], num); })));
    return h + panel(tr('Daily attendance', 'الحضور اليومي'), srv('t_att', 'Attendance', ATTF, attF(F.attst ? [['status', '=', F.attst]] : []), attCols(), { order: 'attendance_date desc', search: ['name', 'status', 'shift'], file: 'attendance' }));
  }
  function calendar() {
    if (D.calErr) { return srcErr(D.calErr, 'Attendance'); } if (!D.cal) { return skel(1, 'dms-skel-panel'); }
    var m0 = calMonth(), map = {}; D.cal.forEach(function (q) { map[q.attendance_date] = q; });
    var first = new Date(m0 + 'T00:00:00Z'), pad = first.getUTCDay(), days = diffDays(m0, addMonths(m0, 1)), loc = LANG === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', h;
    var title = (function () { try { return new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first); } catch (e) { return m0.slice(0, 7); } })();
    h = '<div class="sr-calh"><button type="button" class="dms-btn dms-btn-sm" data-act="calm" data-v="-1">‹ ' + esc(tr('Previous', 'السابق')) + '</button><b>' + esc(title) + '</b><button type="button" class="dms-btn dms-btn-sm" data-act="calm" data-v="1">' + esc(tr('Next', 'التالي')) + ' ›</button></div><div class="sr-cal" role="grid">';
    for (var i = 0; i < 7; i++) { h += '<div class="sr-dh">' + esc(new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + i)))) + '</div>'; }
    for (i = 0; i < pad; i++) { h += '<div></div>'; }
    for (var d = 1; d <= days; d++) { var ds = m0.slice(0, 8) + ('0' + d).slice(-2), q = map[ds]; h += '<div class="sr-cd' + (q ? ' sr-' + stTone(q.status) : '') + (ds === TODAY ? ' sr-today' : '') + '"' + (q ? ' title="' + esc(stl(q.status) + ' ' + hm(q.in_time) + ' ' + hm(q.out_time)) + '"' : '') + '><b>' + d + '</b><span>' + (q ? esc(stl(q.status)) : '') + '</span></div>'; }
    return h + '</div>';
  }

  /* ============================================================ leave */
  function tabLeave() {
    var L = D.lvx;
    var h = note(esc(tr('Leave balance is read from the HR app (get_leave_details) for today. The total adds the remaining days of every leave type.', 'يُقرأ الرصيد من تطبيق الموارد البشرية لليوم. الإجمالي يجمع المتبقي لكل الأنواع.')));
    h += kpis([kpi({ label: tr('Available leave balance', 'رصيد الإجازات المتاح'), dot: 'var(--dms-ok)', val: kval('lv', function (la) { var b = balTotal(la); return b == null ? '—' : num(b); }), sub: esc(D.lv && !Object.keys(D.lv).length ? tr('No allocation found', 'لا يوجد تخصيص') : '') }), kpi({ label: tr('Leave taken in the period', 'الإجازات المستخدمة في الفترة'), val: kval('lvx', function (l) { return num(l.taken); }), sub: esc(tr('Approved days', 'أيام معتمدة')) }), kpi({ label: tr('Pending applications', 'طلبات معلقة'), dot: 'var(--dms-age3)', val: kval('lvx', function (l) { return num(l.pend.length); }) }), kpi({ label: tr('Approved upcoming', 'معتمدة قادمة'), dot: 'var(--dms-royal)', val: kval('lvx', function (l) { return num(l.up.length); }) }), kpi({ label: tr('Rejected in the period', 'مرفوضة في الفترة'), dot: 'var(--dms-bad)', val: kval('lvx', function (l) { return num(l.rej); }) }), kpi({ label: tr('Approvals assigned to me', 'موافقات مسندة إليّ'), dot: 'var(--dms-bad)', val: kval('lvx', function (l) { return num(l.appr.length); }) })]);
    h += panel(tr('Leave balance by type', 'الرصيد حسب النوع'), src('lv', tr('Leave balance', 'رصيد الإجازات'), function (la) { var ks = Object.keys(la); return ks.length ? '<div class="dms-tablewrap"><table class="dms-table"><thead><tr><th scope="col">' + esc(tr('Leave type', 'نوع الإجازة')) + '</th><th scope="col" class="dms-num">' + esc(tr('Allocated', 'المخصص')) + '</th><th scope="col" class="dms-num">' + esc(tr('Taken', 'المستخدم')) + '</th><th scope="col" class="dms-num">' + esc(tr('Pending approval', 'بانتظار الموافقة')) + '</th><th scope="col" class="dms-num">' + esc(tr('Remaining', 'المتبقي')) + '</th></tr></thead><tbody>' + ks.map(function (k) { var x = la[k]; return '<tr><th scope="row">' + bdi(k) + '</th><td class="dms-num">' + esc(num(x.total_leaves)) + '</td><td class="dms-num">' + esc(num(x.leaves_taken)) + '</td><td class="dms-num">' + esc(num(x.leaves_pending_approval)) + '</td><td class="dms-num"><b>' + esc(num(x.remaining_leaves)) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' : empty(tr('No leave allocation found for today.', 'لا تخصيص إجازات لليوم.')); }));
    var li = function (r, extra) { return '<li><span>' + docLink('Leave Application', r.name) + ' ' + bdi(r.leave_type) + '</span><b class="dms-num">' + esc(r.from_date + ' → ' + r.to_date) + ' (' + num(r.total_leave_days) + ')</b>' + (extra || '') + '</li>'; };
    h += two(panel(tr('Upcoming approved leave', 'الإجازات المعتمدة القادمة'), src('lvx', 'Leave Application', function (l) { return list(l.up.slice(0, 8).map(function (r) { return li(r); }), tr('No upcoming approved leave.', 'لا إجازات معتمدة قادمة.')); })), panel(tr('Pending applications', 'الطلبات المعلقة'), src('lvx', 'Leave Application', function (l) { return list(l.pend.slice(0, 8).map(function (r) { return li(r, ' ' + stat('warn', r.workflow_state || stl('Open'))); }), tr('No pending applications.', 'لا طلبات معلقة.')); })));
    h += panel(tr('Approved leave days by month', 'أيام الإجازة المعتمدة شهريًا'), src('lvx', 'Leave Application', function (l) { var mm = {}; l.dist.forEach(function (r) { var k = String(r.from_date).slice(0, 7); mm[k] = (mm[k] || 0) + n0(r.total_leave_days); }); var ks = Object.keys(mm).sort(); return ks.length ? barChart(ks, 'month', [{ label: tr('Approved days', 'أيام معتمدة'), color: 'var(--dms-royal)', val: function (k) { return mm[k] || 0; } }], num) : empty(tr('No approved leave in the period.', 'لا إجازات معتمدة في الفترة.')); }), '', esc(tr('By start month', 'حسب شهر البدء')));
    return h + panel(tr('Leave history', 'سجل الإجازات'), srv('t_lv', 'Leave Application', LVF, lvF(), lvCols(), { order: 'from_date desc', search: ['name', 'leave_type'], file: 'leave_applications' }));
  }

  /* ============================================================ tasks */
  function tabTasks() {
    var h = note(esc(tr('Tasks are linked to you through ToDo assignments (allocated to your user), not through the task owner. The task status filter applies to the tables; the cards cover all your tasks in the selected project.', 'ترتبط المهام بك عبر تكليفات ToDo لا عبر مالك المهمة. مرشح الحالة للجداول؛ البطاقات تشمل كل مهامك في المشروع المحدد.')));
    if (C.todoErr) { h += alertBox('warn', esc(tr('Your task assignments (ToDo) could not be read, so no tasks are listed.', 'تعذرت قراءة تكليفاتك، فلا مهام معروضة.'))); }
    h += kpis([kpi({ label: tr('Assigned tasks', 'المهام المسندة'), val: kval('tk', function (t) { return num(tkAll(t.by)); }) }), kpi({ label: tr('Completed', 'مكتملة'), dot: 'var(--dms-ok)', val: kval('tk', function (t) { return num(n0(t.by.Completed)); }) }), kpi({ label: tr('Pending', 'معلقة'), dot: 'var(--dms-age3)', val: kval('tk', function (t) { return num(tkOpen(t.by)); }), sub: esc(tr('Open, working or pending review', 'مفتوحة أو قيد العمل أو المراجعة')) }), kpi({ label: tr('Overdue', 'متأخرة'), dot: 'var(--dms-bad)', val: kval('tk', function (t) { return num(t.over.length); }) }), kpi({ label: tr('Active projects', 'مشاريع نشطة'), val: kval('tk', function (t) { return num(t.proj); }), sub: esc(tr('Project user or task project', 'مستخدم المشروع أو مشروع المهمة')) }), kpi({ label: tr('Leave approvals for me', 'موافقات إجازة لي'), val: kval('lvx', function (l) { return num(l.appr.length); }), act: 'cli:a_appr' })]);
    h += panel(tr('My active tasks', 'مهامي النشطة'), srv('t_tka', 'Task', TKF, tkBase([['status', 'in', OPEN_ST]], true), tkCols(), { order: 'exp_end_date asc', search: ['subject', 'name'], file: 'active_tasks' }));
    h += two(panel(tr('Completed tasks', 'المهام المكتملة'), srv('t_tkc', 'Task', TKF, tkBase([['status', '=', 'Completed']]), tkCols(), { order: 'modified desc', search: ['subject', 'name'], file: 'completed_tasks', pageSize: 8 })), panel(tr('Project assignments', 'تكليفات المشاريع'), srv('t_proj', 'Project', ['name', 'project_name', 'customer', 'status', 'expected_end_date', 'percent_complete'], [['name', 'in', C.projAll.length ? C.projAll : NONE]], [linkCol(tr('Project', 'المشروع'), 'Project', 'name', 'project_name'), col(tr('Customer', 'العميل'), 'customer'), col(tr('Status', 'الحالة'), 'status', { fmt: chip }), col(tr('Expected end', 'الانتهاء المتوقع'), 'expected_end_date', { fmt: dtc }), col(tr('Progress', 'التقدم'), 'percent_complete', { fmt: bar })], { order: 'modified desc', search: ['name', 'project_name'], file: 'projects', pageSize: 8 })));
    h += panel(tr('All my tasks', 'جميع مهامي'), srv('t_tkall', 'Task', TKF, tkBase([], true), tkCols(), { order: 'exp_end_date asc', search: ['subject', 'name'], file: 'all_tasks' }));
    var tsF = [['employee', '=', C.emp.name], ['docstatus', '<', 2], ['start_date', '>=', PERIOD[0]], ['start_date', '<=', PERIOD[1]]].concat(F.project ? [['parent_project', '=', F.project]] : []);
    return h + two(panel(tr('Timesheets', 'سجلات الوقت'), srv('t_ts', 'Timesheet', ['name', 'start_date', 'end_date', 'total_hours', 'status', 'parent_project', 'docstatus'], tsF, [linkCol(tr('Timesheet', 'سجل الوقت'), 'Timesheet', 'name'), col(tr('From', 'من'), 'start_date', { fmt: dtc }), col(tr('Project', 'المشروع'), 'parent_project'), col(tr('Hours', 'الساعات'), 'total_hours', { num: 1, fmt: function (v) { return '<span class="dms-num">' + esc(amt(v)) + '</span>'; } }), col(tr('Status', 'الحالة'), 'status', { fmt: chip })], { order: 'start_date desc', file: 'timesheets', pageSize: 8 })),
      panel(tr('Daily task logs', 'سجلات المهام اليومية'), srv('t_dtm', 'Daily Task Management', ['name', 'date', 'line_manager', 'designation', 'docstatus'], [['employee', '=', C.emp.name], ['docstatus', '<', 2], ['date', '>=', PERIOD[0]], ['date', '<=', PERIOD[1]]], [linkCol(tr('Log', 'السجل'), 'Daily Task Management', 'name'), col(tr('Date', 'التاريخ'), 'date', { fmt: dtc }), col(tr('Line manager', 'المدير المباشر'), 'line_manager'), col(tr('Status', 'الحالة'), 'docstatus', { fmt: dsChip })], { order: 'date desc', file: 'daily_task_logs', pageSize: 8 })));
  }

  /* ============================================================ rental documents and dispatch */
  function tabRental() {
    var R = D.rent, by = R ? R.by : null;
    var h = note(esc(tr('Rental documents are linked to you only through the Employee fields "From" and "Prepared By" (Rental Sales Invoice: "Prepared By"). Statuses are document states; the rental DocTypes have no rental-status field.', 'ترتبط مستندات التأجير بك فقط عبر حقلي "From" و"Prepared By" (فاتورة التأجير: "Prepared By"). الحالات حالات المستند؛ لا يوجد حقل حالة تأجير.')));
    h += kpis(RDT.map(function (dt) { return kpi({ label: rentLabel(dt), val: kval('rent', function () { return num(by[dt].n); }), sub: esc(by ? tr('Drafts: ', 'مسودات: ') + num(by[dt].draft) : '') }); }).concat([kpi({ label: tr('Drafts pending', 'مسودات معلقة'), dot: 'var(--dms-age3)', val: kval('rent', function () { return num(RDT.reduce(function (s, dt) { return s + by[dt].draft; }, 0)); }), act: 'cli:a_rdraft' }), kpi({ label: tr('Equipment dispatched', 'المعدات المصروفة'), val: kval('items', function (it) { return qtyHtml(qtyUom(it.filter(function (r) { return r.docstatus === 1; }))); }), sub: esc(tr('Submitted delivery notes, per unit', 'إشعارات مقدّمة، لكل وحدة')) })]));
    h += panel(tr('Return tracking', 'تتبع الإرجاع'), facts([[tr('Active rentals', 'تأجير نشط'), '—'], [tr('Awaiting return', 'بانتظار الإرجاع'), '—'], [tr('Overdue returns', 'مرتجعات متأخرة'), '—']]) + note(esc(NA())));
    h += panel(tr('All rental documents linked to me', 'كل مستندات التأجير المرتبطة بي'), src('rent', tr('Rental documents', 'مستندات التأجير'), function (r) { return regTable({ id: 't_rall', rows: r.rows, pageSize: 10, file: 'rental_documents', text: function (x) { return [x.name, x.party, x.site].join(' '); }, empty: tr('No rental documents linked to you in the period.', 'لا مستندات تأجير مرتبطة بك في الفترة.'), cols: [
      { k: 't', h: tr('Type', 'النوع'), s: function (x) { return x.dt; }, r: function (x) { return esc(rentLabel(x.dt)); }, c: function (x) { return x.dt; } },
      { k: 'n', h: tr('Document', 'المستند'), s: function (x) { return x.name; }, r: function (x) { return docLink(x.dt, x.name); }, c: function (x) { return x.name; } },
      { k: 'd', h: tr('Date', 'التاريخ'), s: function (x) { return x.date || ''; }, r: function (x) { return dtc(x.date); }, c: function (x) { return x.date; } },
      { k: 'p', h: tr('Customer / supplier', 'العميل / المورد'), s: function (x) { return x.party; }, r: function (x) { return bdi(x.party || '—'); }, c: function (x) { return x.party; } },
      { k: 's', h: tr('Project / site', 'المشروع / الموقع'), r: function (x) { return '<span class="dms-sm">' + bdi(x.site || '—') + '</span>'; }, c: function (x) { return x.site; } },
      { k: 'v', h: tr('Total', 'الإجمالي'), num: 1, s: function (x) { return n0(x.total); }, r: function (x) { return x.total == null ? '' : '<span class="dms-num">' + esc(amt(x.total)) + '</span>'; }, c: function (x) { return x.total; } },
      { k: 'st', h: tr('Status', 'الحالة'), s: function (x) { return x.docstatus; }, r: function (x) { return dsChip(x.docstatus); }, c: function (x) { return x.docstatus; } }] }) + (r.rows.length >= 500 ? note(esc(tr('Each type lists its latest 500 documents here; the per-type tables below are complete.', 'كل نوع يعرض أحدث 500 مستند هنا؛ الجداول أدناه كاملة.'))) : ''); }));
    RDT.forEach(function (dt, i) { var m = RENT[dt]; h += panel(rentLabel(dt), srvOr('t_r' + i, dt, m.fields, rentF(dt), rentOr(dt), rentCols(dt), { order: m.dateF + ' desc', file: dt.toLowerCase().replace(/ /g, '_') })); });
    return h;
  }
  function tabDispatch() {
    var h = kpis([kpi({ label: tr('Rental delivery notes', 'إشعارات تسليم التأجير'), val: kval('rent', function (r) { return num(r.by[RDN].n); }) }), kpi({ label: tr('Equipment dispatched', 'المعدات المصروفة'), dot: 'var(--dms-ok)', val: kval('items', function (it) { return qtyHtml(qtyUom(it.filter(function (r) { return r.docstatus === 1; }))); }), sub: esc(tr('Submitted notes, per unit; units are never added together', 'إشعارات مقدّمة، لكل وحدة؛ لا تُجمع الوحدات')) }), kpi({ label: tr('Dispatch notes in draft', 'إشعارات صرف مسودة'), dot: 'var(--dms-age3)', val: kval('rent', function (r) { return num(r.by[RDN].draft); }) }),
      kpi({ label: tr('Returned quantity', 'الكمية المرتجعة'), val: '—', sub: esc(tr('Not tracked', 'غير متتبَّع')) }), kpi({ label: tr('Outstanding quantity', 'الكمية المتبقية'), val: '—', sub: esc(tr('Not tracked', 'غير متتبَّع')) }), kpi({ label: tr('Overdue returns', 'مرتجعات متأخرة'), val: '—', sub: esc(tr('Not tracked', 'غير متتبَّع')) })]) + note(esc(NA()));
    h += panel(tr('Dispatch history', 'سجل الصرف'), srvOr('t_dn', RDN, RENT[RDN].fields, rentF(RDN), rentOr(RDN), rentCols(RDN), { order: 'date desc', file: 'rental_delivery_notes' }));
    var it = function (f) { return src('items', 'Rental Delivery Note Table', f); };
    h += panel(tr('Dispatched items', 'الأصناف المصروفة'), it(function (rows) { return regTable({ id: 't_items', rows: rows, pageSize: 10, file: 'dispatched_items', text: function (r) { return [r.parent, r.item_code, r.item_name, r.customer, r.site].join(' '); }, cols: [
      { k: 'p', h: tr('Delivery note', 'الإشعار'), s: function (r) { return r.parent; }, r: function (r) { return docLink(RDN, r.parent); }, c: function (r) { return r.parent; } },
      { k: 'c', h: tr('Customer', 'العميل'), s: function (r) { return r.customer || ''; }, r: function (r) { return bdi(r.customer || '—') + '<span class="dms-sm sr-sub">' + bdi(r.site || '') + '</span>'; }, c: function (r) { return r.customer; } },
      { k: 'd', h: tr('Dispatch date', 'تاريخ الصرف'), s: function (r) { return r.delivery_date || ''; }, r: function (r) { return dtc(r.delivery_date); }, c: function (r) { return r.delivery_date; } },
      { k: 'i', h: tr('Item', 'الصنف'), s: function (r) { return r.item_code || ''; }, r: function (r) { return bdi(r.item_code || '—') + '<span class="dms-sm sr-sub">' + bdi(r.item_name || '') + '</span>'; }, c: function (r) { return r.item_code + ' ' + (r.item_name || ''); } },
      { k: 'q', h: tr('Quantity', 'الكمية'), num: 1, s: function (r) { return r.quantity; }, r: function (r) { return '<span class="dms-num">' + esc(num(r.quantity)) + '</span> <small>' + esc(r.uom) + '</small>'; }, c: function (r) { return r.quantity + ' ' + r.uom; } },
      { k: 's', h: tr('Status', 'الحالة'), s: function (r) { return r.docstatus; }, r: function (r) { return dsChip(r.docstatus); }, c: function (r) { return r.docstatus; } }] }); }));
    var sumBy = function (rows, kf) { var m = {}; rows.forEach(function (r) { var k = kf(r) + '||' + r.uom, o = m[k] || (m[k] = { a: r, q: 0, docs: {} }); o.q += r.quantity; o.docs[r.parent] = 1; }); return Object.keys(m).map(function (k) { return m[k]; }); };
    return h + two(panel(tr('By item (per unit)', 'حسب الصنف (لكل وحدة)'), it(function (rows) { return regTable({ id: 't_isum', rows: sumBy(rows, function (r) { return r.item_code; }), pageSize: 8, file: 'items_summary', sk: 'q', dir: -1, text: function (o) { return o.a.item_code + ' ' + (o.a.item_name || ''); }, cols: [{ k: 'i', h: tr('Item', 'الصنف'), s: function (o) { return o.a.item_code || ''; }, r: function (o) { return bdi(o.a.item_code || '—') + '<span class="dms-sm sr-sub">' + bdi(o.a.item_name || '') + '</span>'; }, c: function (o) { return o.a.item_code; } }, { k: 'u', h: tr('Unit', 'الوحدة'), s: function (o) { return o.a.uom; }, r: function (o) { return esc(o.a.uom); }, c: function (o) { return o.a.uom; } }, { k: 'q', h: tr('Quantity', 'الكمية'), num: 1, s: function (o) { return o.q; }, r: function (o) { return '<span class="dms-num">' + esc(num(o.q)) + '</span>'; }, c: function (o) { return o.q; } }] }); })),
      panel(tr('By customer (per unit)', 'حسب العميل (لكل وحدة)'), it(function (rows) { return regTable({ id: 't_csum', rows: sumBy(rows, function (r) { return r.customer || ''; }), pageSize: 8, file: 'customers_summary', sk: 'q', dir: -1, text: function (o) { return o.a.customer || ''; }, cols: [{ k: 'c', h: tr('Customer', 'العميل'), s: function (o) { return o.a.customer || ''; }, r: function (o) { return bdi(o.a.customer || '—'); }, c: function (o) { return o.a.customer; } }, { k: 'd', h: tr('Documents', 'المستندات'), num: 1, s: function (o) { return Object.keys(o.docs).length; }, r: function (o) { return '<span class="dms-num">' + Object.keys(o.docs).length + '</span>'; }, c: function (o) { return Object.keys(o.docs).length; } }, { k: 'u', h: tr('Unit', 'الوحدة'), s: function (o) { return o.a.uom; }, r: function (o) { return esc(o.a.uom); }, c: function (o) { return o.a.uom; } }, { k: 'q', h: tr('Quantity', 'الكمية'), num: 1, s: function (o) { return o.q; }, r: function (o) { return '<span class="dms-num">' + esc(num(o.q)) + '</span>'; }, c: function (o) { return o.q; } }] }); })));
  }
  function tabActions(AM) { return actionsTab(AM, tr('Your own items: approvals waiting for you, overdue tasks, drafts to submit and leave awaiting a decision.', 'بنودك الخاصة: موافقات بانتظارك ومهام متأخرة ومسودات للتقديم وإجازات بانتظار القرار.')); }

  /* ============================================================ drills and events */
  function drill(id) {
    if (id.indexOf('cli:') !== 0) { return null; }
    var k = id.slice(4), cc = actClient(), x = cc && cc[k], s = actSpecs().filter(function (y) { return y.id === k; })[0];
    if (!x || typeof x === 'string' || !s) { return null; }
    return { title: s.title, sub: s.why, spec: { rows: x.rows.map(x.item), file: k, text: function (it) { return [it.title, it.desc, it.who].join(' '); }, cols: [
      { h: tr('Record', 'السجل'), r: function (it) { return docLink(it.dt, it.name, it.title); }, c: function (it) { return it.name; } },
      { h: tr('Details', 'التفاصيل'), r: function (it) { return '<span class="dms-sm">' + bdi(it.desc) + '</span>'; }, c: function (it) { return it.desc; } },
      { h: tr('Who', 'من'), r: function (it) { return bdi(it.who || '—'); }, c: function (it) { return it.who; } },
      { h: tr('When', 'متى'), r: function (it) { return '<span class="dms-tone-' + it.tone + '">' + esc(it.due) + '</span>'; }, c: function (it) { return it.due; } }] } };
  }
  function onAct(a, v) {
    if (a === 'kpi' && v.indexOf('goto:') === 0) { goTab(v.slice(5), false, true); return true; }
    if (a === 'calm') { CALM = addMonths(calMonth(), +v); run('cal', function () { return calLoad(); }); renderSoft(); return true; }
    return false;
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

/* ==== v1 kept: repair only this block's own transient Frappe widget heading when it reads "undefined". No Workspace record is changed. ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host, w = h && h.closest ? h.closest('.custom-block-widget-box') : null, t = w && w.querySelector('.widget-head .widget-title');
  if (t && ['', 'undefined', 'null'].indexOf(t.textContent.trim()) !== -1) { t.textContent = 'Scaffolding Rental — Employee Dashboard'; t.setAttribute('title', t.textContent); }
})();
