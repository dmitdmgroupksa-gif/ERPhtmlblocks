/* ===== DM Group KSA — Payroll Cost Center — SCRIPT field · v2 =====
   Read-only. The logged-in user's own Frappe APIs only (frappe.client.get_list, get_count, get, frappe.desk.reportview.get).
   No Server Script. The v1 payroll, GL, attendance (Employee Checkin), leave and control engines and the tab renderers
   are kept unchanged inside the PC closure; their UI helpers are re-implemented on the DM kit. The shared runtime between
   the "DMS kit" markers is generated from tools/erp/kit/dms-kit.js (edit the kit and run build_kit.py, not the copy). */
(function () {
  'use strict';
  var APP = {
    key: '__dmsPayrollCC',
    period: 'custom',
    tabs: [
      { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'cc', en: 'Cost centers', ar: 'مراكز التكلفة' }, { id: 'register', en: 'Payroll register', ar: 'سجل الرواتب' },
      { id: 'components', en: 'Components', ar: 'مكونات الراتب' }, { id: 'employees', en: 'Employees', ar: 'الموظفون' }, { id: 'attendance', en: 'Attendance', ar: 'الحضور' },
      { id: 'leaves', en: 'Leaves', ar: 'الإجازات' }, { id: 'trends', en: 'Monthly trends', ar: 'الاتجاهات الشهرية' }, { id: 'controls', en: 'Controls & audit', ar: 'الضوابط والتدقيق' },
      { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }
    ],
    filters: [
      { k: 'company', en: 'Company', ar: 'الشركة', none: ['All companies (system currency)', 'كل الشركات (عملة النظام)'], options: function () { return OPT.companies.map(function (c) { return { v: c.name, l: c.name + (c.cur && c.cur !== CUR ? ' (' + c.cur + ')' : '') }; }); } },
      { k: 'cc', en: 'Cost center', ar: 'مركز التكلفة', dependsOn: 'company', options: function (d) { return OPT.ccs.filter(function (x) { return !d.company || x.company === d.company; }).map(function (x) { return x.name; }); } },
      { k: 'branch', en: 'Branch', ar: 'الفرع', options: function () { return OPT.branches; } },
      { k: 'dept', en: 'Department', ar: 'القسم', dependsOn: 'company', options: function (d) { return OPT.depts.filter(function (x) { return !d.company || x.company === d.company; }).map(function (x) { return x.name; }); } },
      { k: 'q', en: 'Employee', ar: 'الموظف', type: 'text', ph: ['Name or ID', 'الاسم أو الرقم'] }
    ],
    sources: ['ctl'],
    dtLabels: { 'Salary Slip': ['Salary slip', 'قسيمة راتب'], 'Payroll Entry': ['Payroll entry', 'قيد رواتب'], 'Leave Application': ['Leave application', 'طلب إجازة'], 'Employee': ['Employee', 'موظف'] },
    title: function () { return tr('Payroll Cost Center', 'مراكز تكلفة الرواتب'); },
    stamp: function () { return tr('Payroll, attendance and leave · read-only', 'الرواتب والحضور والإجازات · للقراءة فقط'); },
    filterNote: function () { return tr('Without a company, payroll covers companies in the system currency, so amounts are never added across currencies. Branch, department and employee cannot be applied to GL entries.', 'بدون اختيار شركة تشمل الرواتب شركات عملة النظام فقط فلا تُجمع مبالغ بعملات مختلفة. لا يمكن تطبيق الفرع والقسم والموظف على قيود الأستاذ.'); },
    periodNote: function () { return tr('Salary slips overlapping the dates. Attendance uses the last 93 days of the range, up to today.', 'قسائم الرواتب المتداخلة مع التواريخ. الحضور يستخدم آخر 93 يومًا من النطاق حتى اليوم.'); },
    boot: function () { return PC.boot(); },
    load: function () { PC.load(); },
    onTab: function () { /* each tab renders on first view */ },
    actSpecs: function () { return PC.actSpecs(); },
    actions: function () { return actModel(PC.actSpecs(), 'act', PC.actClient()); },
    banner: function () { return PC.banner(); },
    content: function (t, AM) { return PC.content(t, AM); },
    drill: function (id) { return PC.drill(id); },
    onAct: function (a, v, n, id) { return PC.onAct(a, v, n, id); },
    onInput: function (n) { return PC.onInput(n); }
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

  /* Kit components, captured before the v1 closure re-uses some of their names. */
  var K = { kpi: kpi, panel: panel, regTable: regTable, alertBox: alertBox, stat: stat, barChart: barChart, lineChart: lineChart, shareList: shareList, hbars: hbars, skel: skel, esc: esc, cur: cur$, sum: sum };
  var OPT = { companies: [], ccs: [], branches: [], depts: [] };

  var PC = (function () {
    /* ============================================================ v1 constants and helpers (unchanged) */
    /* ---------- constants & state ---------- */
    var TABS = ['overview', 'cc', 'register', 'components', 'employees', 'attendance', 'leaves', 'trends', 'controls'];
    var PAL = ['#1f6feb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];
    var GL_MARK = '%Accrual Journal Entry for salaries%';
    var WFH_LOC = ['Work At Home', 'Work From Home'];
    var NATMAP = { 'saudi arabia': 'SA', 'saudi': 'SA', 'indian': 'IN', 'india': 'IN', 'bangladesh': 'BD', 'bangladeshi': 'BD', 'pakistan': 'PK', 'pakistani': 'PK', 'philippines': 'PH', 'filipino': 'PH', 'sri lankan': 'LK', 'sri lanka': 'LK', 'yemeni': 'YE', 'yemen': 'YE', 'syrian': 'SY', 'syria': 'SY', 'egyptian': 'EG', 'egypt': 'EG', 'jordan': 'JO', 'jordanian': 'JO', 'palestine': 'PS', 'palestinian': 'PS', 'palestinian territory, occupied': 'PS' };
    var S = { lang: 'en', tab: 'overview', f: {}, ver: 0, ui: {}, rendered: {}, opts: {} };
    var cache = new Map();
    var busy = 0;
    var AR = {}; /* filled at the bottom */
    var TB = {};

    /* ---------- small helpers ---------- */
    function t(s) { return LANG === 'ar' && AR[s] ? AR[s] : s; }
    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function n0(v) { return (+v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
    function n1(v) { return (+v || 0).toLocaleString('en-US', { maximumFractionDigits: 1 }); }
    function n2(v) { return (+v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function sar(v) { return vcur() + ' ' + n2(v); }
    function short(v) { v = +v || 0; var a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K' : String(Math.round(v)); }
    function U(s) { var p = String(s).slice(0, 10).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
    function Y(ms) { return new Date(ms).toISOString().slice(0, 10); }
    function addD(s, n) { return Y(U(s) + n * 864e5); }
    function dow(s) { return new Date(U(s)).getUTCDay(); }
    function diffDays(a, b) { return Math.round((U(b) - U(a)) / 864e5); }
    function today() { return TODAY; }
    function eachDay(a, b) { var r = []; for (var x = U(a); x <= U(b); x += 864e5) { r.push(Y(x)); } return r; }
    function monthStart(s) { return s.slice(0, 8) + '01'; }
    function monthEnd(s) { var d = new Date(U(s)); return Y(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); }
    function addMonths(s, n) { var d = new Date(U(s)); return Y(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)); }
    function monthName(ym, short_) { var l = LANG === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US'; return new Intl.DateTimeFormat(l, { month: short_ ? 'short' : 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(U(ym + '-01'))); }
    function wdNames() { return LANG === 'ar' ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; }
    function hm(ts) { return String(ts).slice(11, 19); }
    function chip(txt, cls) { return '<span class="chip ' + (cls || '') + '">' + esc(txt) + '</span>'; }
    function fk() { return JSON.stringify(S.f); }
    function sum(a, k) { var s = 0; for (var i = 0; i < a.length; i++) { s += +a[i][k] || 0; } return s; }
    function uniq(a) { return Array.from(new Set(a)); }
    function cmp(a, b) { if (a == null) { return -1; } if (b == null) { return 1; } return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)); }
    function $(s) { return HOST.querySelector(s); }
    function $$(s) { return Array.prototype.slice.call(HOST.querySelectorAll(s)); }

    /* ============================================================ API (kit transport; same calls as v1) */
    function busyInc(d) { busy += d; }
    function call(method, args) {
      busyInc(1);
      return callP(method, args).then(function (m) { busyInc(-1); return m; }, function (e) {
        busyInc(-1);
        if (e && (e.status === 403 || /No access/.test(e.message || ''))) { var pe = new Error(t('No access to') + ' ' + ((args && (args.doctype || args.report_name)) || method)); pe.status = 403; pe.perm = true; throw pe; }
        throw e;
      });
    }
    /* Scope: the chosen company, or (none chosen) the companies in the system currency. */
    var SYSCOS = [];
    function coF() { return S.f.company ? ['company', '=', S.f.company] : SYSCOS.length ? ['company', 'in', SYSCOS] : ['company', 'is', 'set']; }
    /* Currency of the view: the chosen company's, else the system currency (v1 always printed SAR). */
    function vcur() { var c = OPT.companies.filter(function (x) { return x.name === S.f.company; })[0]; return (c && c.cur) || CUR; }
    function excludedCos() { return S.f.company ? [] : OPT.companies.filter(function (c) { return c.cur && c.cur !== CUR; }); }
    function memo(key, fn) {
      if (!cache.has(key)) { cache.set(key, fn().catch(function (e) { cache.delete(key); throw e; })); }
      return cache.get(key);
    }
    function list(dt, fields, filters, o) {
      o = o || {};
      var a = { doctype: dt, fields: fields, filters: filters || [], limit_start: o.start || 0, limit_page_length: o.len == null ? 1000 : o.len };
      if (o.order) { a.order_by = o.order; } if (o.group) { a.group_by = o.group; } if (o.or) { a.or_filters = o.or; } if (o.parent) { a.parent = o.parent; }
      return call('frappe.client.get_list', a);
    }
    function all(dt, fields, filters, o) {
      o = o || {};
      var size = o.size || 1000, cap = o.cap || 30000, out = [], s = 0;
      function step() {
        return list(dt, fields, filters, { start: s, len: size, order: o.order, group: o.group, or: o.or, parent: o.parent }).then(function (r) {
          r = r || []; out = out.concat(r);
          if (r.length < size) { return out; }
          s += size;
          if (out.length >= cap) { out.truncated = true; return out; }
          return step();
        });
      }
      return step();
    }
    function rv(dt, fields, filters, o) {
      o = o || {};
      return call('frappe.desk.reportview.get', { doctype: dt, fields: fields, filters: filters || [], group_by: o.group, order_by: o.order, start: o.start || 0, page_length: o.len || 1000, with_comment_count: 0 }).then(function (r) {
        if (!r || !r.values) { return []; }
        return r.values.map(function (v) { var x = {}; r.keys.forEach(function (k, i) { x[k] = v[i]; }); return x; });
      });
    }
    function getDoc(dt, name) { return call('frappe.client.get', { doctype: dt, name: name }); }
    function count(dt, filters) { return call('frappe.client.get_count', { doctype: dt, filters: filters || [] }); }
    function safe(p) { return p.then(function (v) { return { ok: true, v: v }; }, function (e) { return { ok: false, err: e.message || String(e) }; }); }

    /* ---------- reference data ---------- */
    function fRestricted() { var F = S.f; return !!(F.cc || F.branch || F.dept || F.q); }
    function empFilters() {
      var F = S.f, fl = [];
      fl.push(coF());
      if (F.cc) { fl.push(['payroll_cost_center', '=', F.cc]); }
      if (F.branch) { fl.push(['branch', '=', F.branch]); }
      if (F.dept) { fl.push(['department', '=', F.dept]); }
      return fl;
    }
    function getEmployees() {
      var F = S.f;
      return memo('emp|' + fk(), function () {
        var or = F.q ? [['employee_name', 'like', '%' + F.q + '%'], ['name', 'like', '%' + F.q + '%']] : undefined;
        return all('Employee', ['name', 'employee_name', 'status', 'company', 'department', 'branch', 'designation', 'payroll_cost_center', 'custom_nationality', 'custom_employee_nationality', 'custom_job_location', 'date_of_joining', 'relieving_date', 'holiday_list', 'gender', 'employment_type', 'reports_to', 'custom_vacation_status', 'custom_category'], empFilters(), { or: or, order: 'employee_name asc' }).then(function (rows) {
          rows.forEach(function (e) { EMP[e.name] = e; });
          return rows;
        });
      });
    }
    var EMP = {};
    function idsIfNeeded() { return getEmployees().then(function (e) { return (S.f.company || fRestricted() || excludedCos().length) ? e.map(function (x) { return x.name; }) : null; }); }
    function natKey(v) { if (!v) { return ''; } var k = String(v).trim().toLowerCase(); return NATMAP[k] || k; }
    function isSaudi(e) { return natKey(e.custom_nationality) === 'SA'; }
    function natConflict(e) { var a = natKey(e.custom_nationality), b = natKey(e.custom_employee_nationality); return !!(a && b && a !== b); }
    function locOf(e) { return e.custom_job_location || ''; }
    function isBO(e) { return locOf(e) === 'Back Office'; }
    function isWFH(e) { return WFH_LOC.indexOf(locOf(e)) >= 0; }
    function ename(id) { var e = EMP[id]; return e ? e.employee_name : id; }

    var HOL = {};
    function loadHolidays(emps) {
      var names = uniq(emps.map(function (e) { return e.holiday_list; }).filter(Boolean)).filter(function (n) { return !HOL[n]; });
      return Promise.all(names.map(function (n) {
        return memo('hol|' + n, function () { return getDoc('Holiday List', n); }).then(function (d) {
          var s = new Set(); (d.holidays || []).forEach(function (h) { s.add(h.holiday_date); }); HOL[n] = { set: s, to: d.to_date, from: d.from_date };
        }).catch(function () { HOL[n] = { set: new Set(), to: null, err: true }; });
      }));
    }
    function isOff(e, d) {
      var w = dow(d); if (w === 5) { return true; } if (w === 6 && isSaudi(e)) { return true; }
      var h = e.holiday_list && HOL[e.holiday_list]; return !!(h && h.set.has(d));
    }
    var LTY = {};
    function leaveTypes() {
      return memo('lty', function () { return all('Leave Type', ['name', 'include_holiday', 'is_lwp']).then(function (r) { r.forEach(function (x) { LTY[x.name] = x; }); return r; }); });
    }
    function legDays(a, e, A, B) {
      var lt = LTY[a.leave_type] || {}, out = [], from = a.from_date > A ? a.from_date : A, to = a.to_date < B ? a.to_date : B;
      if (from > to) { return out; }
      eachDay(from, to).forEach(function (d) {
        if (!lt.include_holiday && isOff(e, d)) { return; }
        var f = 1; if (a.half_day && (a.half_day_date === d || a.from_date === a.to_date)) { f = 0.5; }
        out.push({ d: d, f: f });
      });
      return out;
    }
    /* overlap-safe: one value per employee/day, largest fraction wins */
    function dedupe(apps, A, B) {
      var m = new Map();
      apps.slice().sort(function (x, y) { return cmp(x.from_date, y.from_date); }).forEach(function (a) {
        var e = EMP[a.employee] || { holiday_list: null };
        legDays(a, e, A, B).forEach(function (x) {
          var k = a.employee + '|' + x.d, o = m.get(k);
          if (!o || x.f > o.f) { m.set(k, { emp: a.employee, d: x.d, f: x.f, type: a.leave_type, app: a.name }); }
        });
      });
      return Array.from(m.values());
    }

    /* ---------- payroll data ---------- */
    function searchIds() {
      var F = S.f; if (!F.q) { return Promise.resolve(null); }
      return memo('sid|' + F.q + '|' + F.company, function () {
        var fl = [coF()];
        return all('Employee', ['name'], fl, { or: [['employee_name', 'like', '%' + F.q + '%'], ['name', 'like', '%' + F.q + '%']] }).then(function (r) { return r.map(function (x) { return x.name; }); });
      });
    }
    function slipFilters(extra) {
      var F = S.f, fl = [['docstatus', '<', 2], ['start_date', '<=', F.to], ['end_date', '>=', F.from]];
      fl.push(coF());
      if (F.branch) { fl.push(['branch', '=', F.branch]); }
      if (F.dept) { fl.push(['department', '=', F.dept]); }
      return fl.concat(extra || []);
    }
    function getPayroll() {
      var F = S.f;
      return memo('pay|' + fk(), function () {
        var pef = [['docstatus', '<', 2], ['start_date', '<=', F.to], ['end_date', '>=', F.from]];
        pef.push(coF());
        if (F.cc) { pef.push(['cost_center', '=', F.cc]); }
        return Promise.all([all('Payroll Entry', ['name', 'company', 'cost_center', 'start_date', 'end_date', 'posting_date', 'docstatus', 'status', 'number_of_employees', 'salary_slips_created', 'salary_slips_submitted', 'branch', 'department'], pef), searchIds()]).then(function (r) {
          var pes = r[0], ids = r[1], peMap = {}; pes.forEach(function (p) { peMap[p.name] = p; });
          var sf = slipFilters();
          if (F.cc) { if (!pes.length) { return { pes: pes, slips: [], peMap: peMap }; } sf.push(['payroll_entry', 'in', pes.map(function (p) { return p.name; })]); }
          if (ids) { if (!ids.length) { return { pes: pes, slips: [], peMap: peMap }; } sf.push(['employee', 'in', ids]); }
          return all('Salary Slip', ['name', 'employee', 'employee_name', 'start_date', 'end_date', 'docstatus', 'status', 'gross_pay', 'net_pay', 'total_deduction', 'payroll_entry', 'department', 'branch', 'company', 'designation', 'posting_date'], sf, { order: 'employee_name asc' }).then(function (slips) {
            slips.forEach(function (s) { s.cc = (peMap[s.payroll_entry] && peMap[s.payroll_entry].cost_center) || ''; s.state = s.docstatus === 0 ? 'Draft' : 'Submitted'; });
            var miss = uniq(slips.map(function (s) { return s.payroll_entry; }).filter(function (n) { return n && !peMap[n]; }));
            if (!miss.length) { return { pes: pes, slips: slips, peMap: peMap }; }
            return all('Payroll Entry', ['name', 'cost_center', 'docstatus', 'status', 'start_date', 'end_date', 'number_of_employees', 'salary_slips_created', 'salary_slips_submitted'], [['name', 'in', miss]]).then(function (more) {
              more.forEach(function (p) { peMap[p.name] = p; }); slips.forEach(function (s) { if (!s.cc && peMap[s.payroll_entry]) { s.cc = peMap[s.payroll_entry].cost_center; } });
              return { pes: pes, slips: slips, peMap: peMap };
            });
          });
        });
      });
    }
    function expenseAccounts() {
      return memo('expacc', function () { return all('Account', ['name'], [['root_type', '=', 'Expense'], ['is_group', '=', 0]], { cap: 20000 }).then(function (r) { return new Set(r.map(function (x) { return x.name; })); }); });
    }
    /* Posted payroll expense = payroll-accrual journal GL rows (identified by the standard HRMS remark) on Expense accounts */
    function getGL(from, to, byCC) {
      var F = S.f;
      return memo('gl|' + from + to + F.company + F.cc + byCC, function () {
        var fl = [['remarks', 'like', GL_MARK], ['is_cancelled', '=', 0], ['posting_date', 'between', [from, to]]];
        fl.push(coF()); if (F.cc) { fl.push(['cost_center', '=', F.cc]); }
        return Promise.all([all('GL Entry', (byCC ? ['posting_date', 'cost_center', 'account'] : ['posting_date', 'account']).concat(['sum(debit) as debit', 'sum(credit) as credit']), fl, { group: byCC ? 'posting_date,cost_center,account' : 'posting_date,account', size: 1000, cap: 40000 }), expenseAccounts()]).then(function (r) {
          var rows = r[0].filter(function (x) { return r[1].has(x.account); }); rows.truncated = r[0].truncated; return rows;
        });
      });
    }
    function sumSlips(sl) {
      var o = { n: sl.length, gross: 0, net: 0, ded: 0, dn: 0, dg: 0, dnet: 0, sn: 0, sg: 0, snet: 0 };
      sl.forEach(function (s) {
        o.gross += +s.gross_pay || 0; o.net += +s.net_pay || 0; o.ded += +s.total_deduction || 0;
        if (s.docstatus === 0) { o.dn++; o.dg += +s.gross_pay || 0; o.dnet += +s.net_pay || 0; } else { o.sn++; o.sg += +s.gross_pay || 0; o.snet += +s.net_pay || 0; }
      });
      return o;
    }
    function groupCC(slips) {
      var m = {};
      slips.forEach(function (s) {
        var k = s.cc || '— ' + t('No payroll entry');
        var o = m[k] = m[k] || { cc: k, emps: new Set(), n: 0, gross: 0, net: 0, ded: 0, dg: 0, sg: 0, pes: new Set() };
        o.emps.add(s.employee); o.n++; o.gross += +s.gross_pay || 0; o.net += +s.net_pay || 0; o.ded += +s.total_deduction || 0;
        if (s.docstatus === 0) { o.dg += +s.gross_pay || 0; } else { o.sg += +s.gross_pay || 0; } if (s.payroll_entry) { o.pes.add(s.payroll_entry); }
      });
      return Object.keys(m).map(function (k) { var o = m[k]; o.employees = o.emps.size; o.pe = o.pes.size; return o; });
    }

    /* ============================================================ UI adapters: v1 helper names, kit components */
    var TONE = { ok: 'var(--dms-ok)', bad: 'var(--dms-bad)', warn: 'var(--dms-age3)', info: 'var(--dms-royal)' };
    function kpi(l, v, s, o) {
      o = o || {}; var m = /^([A-Z]{3}) (-?[\d,]+(?:\.\d+)?)$/.exec(String(v));
      return K.kpi({ label: t(l), val: m ? K.cur(+m[2].replace(/,/g, ''), m[1]) : v, sub: s || '', dot: TONE[o.tone] || null, act: o.go ? 'go:' + o.go : null });
    }
    function note(txt, cls) { return K.alertBox(cls === 'bad' ? 'err' : cls === 'info' ? 'info' : 'warn', txt); }
    function card(title, body, hint) { return K.panel(t(title), body, 'dms-mb', hint ? esc(t(hint)) : ''); }
    function seg(id, items, cur) { return '<div class="dms-chips dms-bchips pc-seg" role="group">' + items.map(function (i) { var on = i[0] === cur; return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="pseg" data-v="' + esc(id + '|' + i[0]) + '"><span>' + esc(t(i[1])) + '</span></button>'; }).join('') + '</div>'; }
    function chip(txt, cls) { return K.stat(cls === 'ok' || cls === 'bad' || cls === 'warn' ? cls : 'n', txt); }
    function stChip(s) { return s.docstatus === 0 ? chip(t('Draft / Not posted'), 'warn') : chip(t('Submitted'), 'ok'); }
    function skeleton() { return '<div class="dms-skel dms-skel-panel pc-loading" aria-busy="true"></div>'; }
    function failBox(r, what) { return K.alertBox('err', '<b>' + esc(t(what)) + '</b> — ' + esc(r.err) + ' (' + esc(t('check your ERPNext permissions')) + ')'); }
    function showErr(msg) { toast(msg, true); }
    function hideErr() { /* errors are shown in place */ }
    function empLink(id) { return '<button type="button" class="dms-linkbtn" data-act="pemp" data-v="' + esc(id) + '"><bdi>' + esc(ename(id)) + '</bdi></button> <span class="dms-sm">' + esc(id) + '</span>'; }
    function plot(cats, series, o) {
      o = o || {}; var seen = {}, ix = {};
      var keys = cats.map(function (c, i) { var k = String(c); while (seen[k]) { k += '​'; } seen[k] = 1; ix[k] = i; return k; });
      var ser = series.map(function (s) { return { label: s.name, color: s.color, val: function (k) { return s.data[ix[k]] || 0; } }; }), fmt = o.fmt || n0;
      return o.line ? K.lineChart(keys, 'cat', ser, fmt) : K.barChart(keys, 'cat', ser, fmt);
    }
    function donut(items, o) { o = o || {}; return K.shareList(items.map(function (i, ix) { return { label: i.l, value: i.v, color: i.color || PAL[ix % PAL.length], act: i.act ? 'pa:' + i.act + ':' + i.k : null }; }), '', o.fmt || n0); }
    function hbars(items, o) { o = o || {}; return K.hbars(items.map(function (i, ix) { return { label: i.l, value: i.v, color: i.color || PAL[ix % PAL.length], act: o.act ? 'pa:' + o.act + ':' + i.k : null }; }), o.fmt || n0); }
    /* v1 table spec → kit table; tables opened in dialogs use drill_ ids so the kit keeps them while a dialog is open. */
    var MODAL_IDS = { mslips: 1, mcomp: 1, mmonth: 1, emslips: 1, embal: 1, emleaves: 1 }, PSPEC = {}, ROWREF = {};
    function tspec(id, cols, rows, o) {
      o = o || {}; if (MODAL_IDS[id] || /^chk\d+$/.test(id)) { id = 'drill_' + id; }
      var wrapFirst = o.onRow && !cols[0].h, cs = cols.map(function (c, ci) {
        return { k: 'c' + ci, h: t(c.label), num: c.n ? 1 : 0, s: function (r) { return c.s ? c.s(r) : r[c.k]; },
          r: function (r) { var v = c.h ? c.h(r) : esc(c.f ? c.f(r[c.k], r) : (r[c.k] == null ? '' : r[c.k])); return ci === 0 && wrapFirst ? '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="prow" data-id="' + esc(id) + '" data-v="' + rows.indexOf(r) + '">' + v + '</button>' : v; },
          c: function (r) { return c.x ? c.x(r) : (c.s ? c.s(r) : r[c.k]); } };
      });
      if (o.onRow && !wrapFirst) { cs.push({ k: 'open', h: '', r: function (r) { return '<button type="button" class="dms-btn dms-btn-sm" data-act="prow" data-id="' + esc(id) + '" data-v="' + rows.indexOf(r) + '">' + esc(tr('Open', 'فتح')) + '</button>'; }, c: function () { return ''; } }); }
      if (o.onRow) { ROWREF[id] = { rows: rows, fn: o.onRow }; }
      var spec = { id: id, rows: rows, cols: cs, pageSize: o.size || 25, file: o.name || id, empty: o.empty || t('No records found'), text: function (r) { return cols.map(function (c) { var v = c.s ? c.s(r) : r[c.k]; return v == null ? '' : v; }).join(' '); } };
      if (o.foot) { spec.foot = function () { return '<tr>' + cols.map(function (c, i) { return '<td' + (c.n ? ' class="dms-td-n"' : '') + '>' + (i === 0 ? esc(t('Total')) : (o.foot[c.k] != null ? '<b>' + esc(c.f ? c.f(o.foot[c.k], o.foot) : o.foot[c.k]) + '</b>' : '')) + '</td>'; }).join('') + (cs.length > cols.length ? '<td></td>' : '') + '</tr>'; }; }
      PSPEC[id] = spec; return spec;
    }
    function tbl(id, cols, rows, o) { return K.regTable(tspec(id, cols, rows, o)); }
    /* Dialogs: kit overlay; a loading dialog is replaced in place, another one stacks (with Back). */
    var MOD = null, MODN = 0, CHK = [];
    /* In-place dialog updates replace the focused control; keep focus inside the dialog so Escape and Tab still work. */
    function keepFocus(sel) { var a = HOST.getRootNode && HOST.getRootNode().activeElement; if (a && HOST.contains(a) && a.isConnected) { return; } var el = (sel && HOST.querySelector(sel)) || HOST.querySelector('.dms-modal .dms-x'); if (el) { el.focus({ preventScroll: true }); } }
    function openModal(title, html) {
      var loading = html.indexOf('pc-loading') >= 0;
      if (OVL && OVL.pc && OVL.loading) { OVL.title = title; OVL.body = html; OVL.loading = loading; renderOverlay(); return; }
      MOD = { title: title, body: html, pc: true, loading: loading }; openDrill('pcm' + (++MODN));
    }
    function closeModal() { closeOverlay(); }

    /* ============================================================ v1 engines, dialogs and tab renderers */
    /* ---------- attendance engine (Employee Checkin only) ---------- */
    S.ui.att = { sub: 'sum', mode: 'any', day: '', dv: 'A' };
    S.ui.reg = { st: 'all' }; S.ui.cmp = { st: 'all' }; S.ui.emp = { st: 'Active', loc: '' };
    S.ui.lv = { sub: 'approved', ym: '' }; S.ui.em = { tab: 'profile' }; S.cal = { id: '', ym: '', sel: '' };
    var ATTLAB = { P: 'Present', A: 'Absent', L: 'Approved leave', HL: 'Half-day leave (½ absent)', H: 'Holiday / weekly off', W: 'Work from home (excluded)', B: 'Back Office (excluded)', F: 'Future date', T: 'Today – no punch yet', N: 'Not employed' };

    function dayStat(e, d, pe, lm, td, mode) {
      if (d > td) { return 'F'; }
      if ((e.date_of_joining && d < e.date_of_joining) || (e.relieving_date && d > e.relieving_date)) { return 'N'; }
      if (isBO(e)) { return 'B'; }
      if (isOff(e, d)) { return 'H'; }
      if (isWFH(e)) { return 'W'; }
      var ps = (pe && pe[d]) || [], ok = mode === 'in' ? ps.filter(function (p) { return p.log_type === 'IN'; }) : ps;
      if (ok.length) { return 'P'; }
      var lf = lm && lm[d]; if (lf >= 1) { return 'L'; } if (lf > 0) { return 'HL'; }
      if (d === td) { return 'T'; }
      return 'A';
    }
    function attRaw(only) {
      var F = S.f;
      return memo('att|' + (only ? 'd|' : '') + fk(), async function () {
        var td = today(), a = F.from, b = F.to, clipped = false;
        if (diffDays(a, b) > 92) { a = addD(b, -92); clipped = true; }
        var end = b > td ? td : b;
        if (only && end >= F.from) { a = end; clipped = false; }
        var emps = await getEmployees(); await Promise.all([loadHolidays(emps), leaveTypes()]);
        var list = emps.filter(function (e) { return (e.status === 'Active' || (e.relieving_date && e.relieving_date >= a)) && (!e.date_of_joining || e.date_of_joining <= end); });
        if (end < a) { return { empty: true, a: a, end: end, td: td, list: list }; }
        var ids = await idsIfNeeded();
        var pf = [['time', '>=', a + ' 00:00:00'], ['time', '<=', end + ' 23:59:59']], lf = [['docstatus', '=', 1], ['status', '=', 'Approved'], ['from_date', '<=', end], ['to_date', '>=', a]];
        if (ids) { pf.push(['employee', 'in', ids]); lf.push(['employee', 'in', ids]); }
        var res = await Promise.all([all('Employee Checkin', ['employee', 'time', 'log_type', 'device_id', 'custom_attendance_device'], pf, { size: 2000, cap: 60000, order: 'time asc' }), all('Leave Application', ['name', 'employee', 'leave_type', 'from_date', 'to_date', 'half_day', 'half_day_date'], lf)]);
        var P = {}, L = {};
        res[0].forEach(function (p) { var d = p.time.slice(0, 10); P[p.employee] = P[p.employee] || {}; (P[p.employee][d] = P[p.employee][d] || []).push(p); });
        dedupe(res[1], a, end).forEach(function (x) { L[x.emp] = L[x.emp] || {}; L[x.emp][x.d] = x.f; });
        return { a: a, end: end, td: td, clipped: clipped, list: list, P: P, L: L, punches: res[0], truncated: res[0].truncated, nLeaveApps: res[1].length };
      });
    }
    function attCompute(raw, mode) {
      var dates = eachDay(raw.a, raw.end), trend = dates.map(function (d) { return { d: d, P: 0, A: 0, L: 0, W: 0 }; }), rows = [], last = { P: 0, A: 0, L: 0, T: 0, H: 0, W: 0 };
      raw.list.forEach(function (e) {
        if (isBO(e)) { return; }
        var r = { id: e.name, name: e.employee_name, cc: e.payroll_cost_center || '', loc: locOf(e), nat: e.custom_nationality || '', nat2: e.custom_employee_nationality || '', conflict: natConflict(e), P: 0, A: 0, L: 0, W: 0, T: 0, wd: 0 };
        dates.forEach(function (d, i) {
          var s = dayStat(e, d, raw.P[e.name], raw.L[e.name], raw.td, mode);
          if (s === 'P') { r.P++; trend[i].P++; } else if (s === 'A') { r.A++; trend[i].A++; } else if (s === 'L') { r.L++; trend[i].L++; }
          else if (s === 'HL') { r.L += 0.5; r.A += 0.5; trend[i].L += 0.5; trend[i].A += 0.5; } else if (s === 'W') { r.W++; trend[i].W++; } else if (s === 'T') { r.T++; }
          if ('PALHLT'.indexOf(s) >= 0 && s !== 'H') { r.wd++; }
          if (i === dates.length - 1) { var k = s === 'HL' ? 'L' : s; if (last[k] != null) { last[k]++; } }
        });
        r.rate = (r.P + r.A) ? 100 * r.P / (r.P + r.A) : null; rows.push(r);
      });
      var elig = raw.list.filter(function (e) { return !isBO(e) && !isWFH(e); }).length;
      return { dates: dates, trend: trend, rows: rows, last: last, elig: elig, bo: raw.list.filter(isBO).length, wfh: raw.list.filter(function (e) { return !isBO(e) && isWFH(e); }).length, conflicts: raw.list.filter(natConflict) };
    }
    function ensureEmp(id) {
      if (EMP[id]) { return Promise.resolve(EMP[id]); }
      return list('Employee', ['name', 'employee_name', 'status', 'company', 'department', 'branch', 'designation', 'payroll_cost_center', 'custom_nationality', 'custom_employee_nationality', 'custom_job_location', 'date_of_joining', 'relieving_date', 'holiday_list', 'gender', 'employment_type', 'reports_to', 'custom_vacation_status'], [['name', '=', id]]).then(function (r) { if (r && r[0]) { EMP[id] = r[0]; } return EMP[id]; });
    }
    function empMonth(id, ym) {
      return memo('em|' + id + ym, async function () {
        var a = ym + '-01', b = monthEnd(a), e = await ensureEmp(id); await Promise.all([loadHolidays([e]), leaveTypes()]);
        var r = await Promise.all([all('Employee Checkin', ['employee', 'time', 'log_type', 'device_id', 'custom_attendance_device'], [['employee', '=', id], ['time', '>=', a + ' 00:00:00'], ['time', '<=', b + ' 23:59:59']], { order: 'time asc', size: 500 }), all('Leave Application', ['name', 'employee', 'leave_type', 'from_date', 'to_date', 'half_day', 'half_day_date'], [['employee', '=', id], ['docstatus', '=', 1], ['status', '=', 'Approved'], ['from_date', '<=', b], ['to_date', '>=', a]])]);
        var pe = {}, lm = {}; r[0].forEach(function (p) { var d = p.time.slice(0, 10); (pe[d] = pe[d] || []).push(p); });
        dedupe(r[1], a, b).forEach(function (x) { lm[x.d] = x.f; });
        return { pe: pe, lm: lm, a: a, b: b, e: e };
      });
    }
    async function calHtml() {
      var c = S.cal, d = await empMonth(c.id, c.ym), e = d.e, td = today(), mode = S.ui.att.mode, cells = '', cnt = { P: 0, A: 0, L: 0 };
      wdNames().forEach(function (w) { cells += '<div class="dh">' + esc(w) + '</div>'; });
      for (var i = 0; i < dow(d.a); i++) { cells += '<div class="d e"></div>'; }
      eachDay(d.a, d.b).forEach(function (day) {
        var s = dayStat(e, day, d.pe, d.lm, td, mode), ps = d.pe[day] || [];
        if (s === 'P') { cnt.P++; } else if (s === 'A') { cnt.A += 1; } else if (s === 'L') { cnt.L++; } else if (s === 'HL') { cnt.L += 0.5; cnt.A += 0.5; }
        var sub = ps.length ? hm(ps[0].time).slice(0, 5) + (ps.length > 1 ? '–' + hm(ps[ps.length - 1].time).slice(0, 5) : '') : '';
        cells += '<button type="button" class="d s-' + s + '" data-act="calday" data-k="' + day + '" data-tip="' + esc(t(ATTLAB[s])) + '"><b>' + (+day.slice(8)) + '</b><small>' + esc(s === 'P' ? sub : s === 'A' ? t('Absent') : s === 'L' || s === 'HL' ? t('Leave') : s === 'H' ? t('Off') : s === 'W' ? 'WFH' : '') + '</small></button>';
      });
      return '<div class="calnav"><button type="button" class="dms-btn dms-btn-sm" data-act="calnav" data-k="-1">‹</button><span>' + esc(monthName(c.ym)) + '</span><button type="button" class="dms-btn dms-btn-sm" data-act="calnav" data-k="1">›</button></div>' +
        '<div class="dms-grid dms-kpis">' + kpi('Present', n1(cnt.P), '', { tone: 'ok' }) + kpi('Absent', n1(cnt.A), '', { tone: 'bad' }) + kpi('Approved leave', n1(cnt.L), '', {}) + '</div>' +
        '<div class="cal">' + cells + '</div><div class="dms-legend pc-legend">' + ['P', 'A', 'L', 'H', 'W', 'T'].map(function (k) { return '<span><i class="s-' + k + '" style="border:1px solid #ccc"></i>' + esc(t(ATTLAB[k])) + '</span>'; }).join('') + '</div><div id="calDetail" style="margin-top:10px">' + esc(t('Click a day to see punch details.')) + '</div>';
    }
    async function calDay(day) {
      var d = await empMonth(S.cal.id, S.cal.ym), ps = d.pe[day] || [], s = dayStat(d.e, day, d.pe, d.lm, today(), S.ui.att.mode);
      var h = '<h4 class="dms-h4">' + esc(day) + ' · ' + esc(wdNames()[dow(day)]) + ' — ' + esc(t(ATTLAB[s])) + '</h4>';
      if (!ps.length) { return h + '<div class="dms-empty">' + esc(t('No punches recorded.')) + '</div>'; }
      return h + '<table class="pc-mini"><thead><tr><th>' + esc(t('Time')) + '</th><th>' + esc(t('Type')) + '</th><th>' + esc(t('Device')) + '</th></tr></thead><tbody>' + ps.map(function (p) { return '<tr><td>' + esc(hm(p.time)) + '</td><td>' + chip(p.log_type || '—', p.log_type === 'IN' ? 'ok' : 'info') + '</td><td>' + esc(p.custom_attendance_device || p.device_id || '') + '</td></tr>'; }).join('') + '</tbody></table>';
    }

    /* ---------- leave engine ---------- */
    var LV_FIELDS = ['name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'half_day', 'half_day_date', 'total_leave_days', 'status', 'docstatus', 'workflow_state', 'department', 'posting_date', 'company'];
    function leaveData() {
      var F = S.f;
      return memo('lv|' + fk(), async function () {
        var emps = await getEmployees(); await Promise.all([loadHolidays(emps), leaveTypes()]);
        var ids = await idsIfNeeded(), fl = [['docstatus', '<', 2], ['status', '!=', 'Cancelled'], ['from_date', '<=', F.to], ['to_date', '>=', F.from]];
        if (ids) { fl.push(['employee', 'in', ids]); }
        var apps = await all('Leave Application', LV_FIELDS, fl, { order: 'from_date asc', cap: 20000 });
        var appr = apps.filter(function (a) { return a.status === 'Approved' && a.docstatus === 1; });
        var days = dedupe(appr, F.from, F.to);
        return {
          apps: apps, appr: appr, days: days,
          pend: apps.filter(function (a) { return a.status === 'Open'; }),
          rej: apps.filter(function (a) { return a.status === 'Rejected'; }),
          unsub: apps.filter(function (a) { return a.status === 'Approved' && a.docstatus === 0; })
        };
      });
    }
    function leaveNow() {
      return memo('lvnow|' + fk(), async function () {
        var td = today(), ids = await idsIfNeeded(); await leaveTypes();
        var fl = [['docstatus', '=', 1], ['status', '=', 'Approved'], ['from_date', '<=', td], ['to_date', '>=', td]]; if (ids) { fl.push(['employee', 'in', ids]); }
        var r = await all('Leave Application', LV_FIELDS, fl);
        return r.filter(function (a) { var e = EMP[a.employee]; return !e || e.status === 'Active'; });
      });
    }
    function pendingCount() {
      var F = S.f;
      return memo('lvpend|' + fk(), async function () {
        var ids = await idsIfNeeded(), fl = [['docstatus', '<', 2], ['status', '=', 'Open'], ['from_date', '<=', F.to], ['to_date', '>=', F.from]]; if (ids) { fl.push(['employee', 'in', ids]); }
        return count('Leave Application', fl);
      });
    }
    async function balances(ids, ref) {
      var fl = [['docstatus', '=', 1], ['from_date', '<=', ref], ['to_date', '>=', ref]]; if (ids) { fl.push(['employee', 'in', ids]); }
      var al = await all('Leave Allocation', ['employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'total_leaves_allocated', 'new_leaves_allocated', 'unused_leaves'], fl);
      if (!al.length) { return []; }
      await leaveTypes();
      var minFrom = al.reduce(function (m, a) { return a.from_date < m ? a.from_date : m; }, al[0].from_date);
      var af = [['docstatus', '=', 1], ['status', '=', 'Approved'], ['to_date', '>=', minFrom], ['from_date', '<=', ref]]; if (ids) { af.push(['employee', 'in', ids]); }
      var apps = await all('Leave Application', LV_FIELDS, af, { cap: 20000 }), by = {};
      apps.forEach(function (a) { var k = a.employee + '|' + a.leave_type; (by[k] = by[k] || []).push(a); });
      return al.map(function (a) {
        var to = a.to_date < ref ? a.to_date : ref, taken = 0;
        dedupe(by[a.employee + '|' + a.leave_type] || [], a.from_date, to).forEach(function (x) { taken += x.f; });
        var tot = +a.total_leaves_allocated || 0; return { emp: a.employee, name: a.employee_name, type: a.leave_type, from: a.from_date, to: a.to_date, alloc: tot, taken: taken, bal: tot - taken };
      });
    }

    /* ---------- trends ---------- */
    function trendData() {
      var F = S.f;
      return memo('tr|' + fk(), async function () {
        var endM = monthStart(F.to), startM = addMonths(endM, -11), endD = monthEnd(F.to);
        var fl = [['docstatus', '<', 2], ['start_date', '>=', startM], ['start_date', '<=', endD]];
        fl.push(coF()); if (F.branch) { fl.push(['branch', '=', F.branch]); } if (F.dept) { fl.push(['department', '=', F.dept]); }
        if (F.cc) {
          var pf = [['docstatus', '<', 2], ['start_date', '>=', startM], ['start_date', '<=', endD], ['cost_center', '=', F.cc]]; pf.push(coF());
          var pes = await all('Payroll Entry', ['name'], pf); if (!pes.length) { fl.push(['name', '=', '__none__']); } else { fl.push(['payroll_entry', 'in', pes.map(function (p) { return p.name; })]); }
        }
        var ids = await searchIds(); if (ids) { fl.push(['employee', 'in', ids.length ? ids : ['__none__']]); }
        var res = await Promise.all([all('Salary Slip', ['start_date', 'docstatus', 'count(name) as n', 'sum(gross_pay) as g', 'sum(net_pay) as nt', 'sum(total_deduction) as d'], fl, { group: 'start_date,docstatus' }), safe(getGL(startM, endD, false))]);
        var m = {}; for (var i = 0; i < 12; i++) { var k = addMonths(startM, i).slice(0, 7); m[k] = { m: k, dn: 0, dg: 0, sn: 0, sg: 0, net: 0, ded: 0, gl: 0 }; }
        res[0].forEach(function (r) { var o = m[r.start_date.slice(0, 7)]; if (!o) { return; } if (r.docstatus === 0) { o.dn += r.n; o.dg += r.g; } else { o.sn += r.n; o.sg += r.g; } o.net += r.nt; o.ded += r.d; });
        if (res[1].ok) { res[1].v.forEach(function (r) { var o = m[String(r.posting_date).slice(0, 7)]; if (o) { o.gl += (+r.debit || 0) - (+r.credit || 0); } }); }
        return { months: Object.keys(m).map(function (k) { var o = m[k]; o.gross = o.dg + o.sg; o.n = o.dn + o.sn; return o; }), glOk: res[1].ok, glErr: res[1].err };
      });
    }
    /* ---------- drill-down & detail modals ---------- */
    var slipCols = [
      { k: 'name', label: 'Salary Slip' },
      { k: 'employee_name', label: 'Employee', h: function (r) { return empLink(r.employee); }, s: function (r) { return r.employee_name; } },
      { k: 'cc', label: 'Cost Center' }, { k: 'start_date', label: 'Period', f: function (v, r) { return r.start_date + ' → ' + r.end_date; } },
      { k: 'docstatus', label: 'Status', h: stChip, s: function (r) { return r.docstatus; }, x: function (r) { return r.docstatus === 0 ? 'Draft' : 'Submitted'; } },
      { k: 'gross_pay', label: 'Gross', n: 1, f: n2 }, { k: 'total_deduction', label: 'Deductions', n: 1, f: n2 }, { k: 'net_pay', label: 'Net Pay', n: 1, f: n2 }
    ];
    function openSlips(title, slips, id) {
      openModal(title, tbl(id || 'mslips', slipCols, slips, { name: 'salary_slips', size: 15, resetPage: true, onRow: function (r) { openSlip(r.name); }, foot: { gross_pay: sum(slips, 'gross_pay'), total_deduction: sum(slips, 'total_deduction'), net_pay: sum(slips, 'net_pay') } }));
    }
    async function openSlip(name) {
      openModal(name, skeleton());
      try {
        var d = await getDoc('Salary Slip', name), pe = d.payroll_entry ? ((await getPayroll()).peMap[d.payroll_entry] || {}) : {};
        var line = function (a) { return a.filter(function (x) { return !x.statistical_component; }).map(function (x) { return '<tr><td>' + esc(x.salary_component) + '</td><td class="n">' + n2(x.amount) + '</td></tr>'; }).join(''); };
        openModal(d.employee_name + ' · ' + name,
          '<div class="dms-facts">' + [['Employee', d.employee + ' — ' + d.employee_name], ['Payroll Entry', d.payroll_entry || '—'], ['Cost Center (payroll entry)', pe.cost_center || '—'], ['Department', d.department || '—'], ['Branch', d.branch || '—'], ['Period', d.start_date + ' → ' + d.end_date], ['Status', d.docstatus === 0 ? t('Draft / Not posted') : d.docstatus === 1 ? t('Submitted') : t('Cancelled')], ['Payment Days', d.payment_days]].map(function (x) { return '<div><span>' + esc(t(x[0])) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>' +
          '<div class="dms-cols-2 dms-grid"><div class="dms-panelbox"><h4 class="dms-h4">' + esc(t('Earnings')) + '</h4><table><tbody>' + line(d.earnings || []) + '</tbody><tfoot><tr><td>' + esc(t('Gross')) + '</td><td class="n">' + n2(d.gross_pay) + '</td></tr></tfoot></table></div>' +
          '<div class="dms-panelbox"><h4 class="dms-h4">' + esc(t('Deductions')) + '</h4><table><tbody>' + line(d.deductions || []) + '</tbody><tfoot><tr><td>' + esc(t('Total Deductions')) + '</td><td class="n">' + n2(d.total_deduction) + '</td></tr><tr><td>' + esc(t('Net Pay')) + '</td><td class="n">' + n2(d.net_pay) + '</td></tr></tfoot></table></div></div>');
      } catch (e) { openModal(name, note(esc(e.message), 'bad')); }
    }
    var leaveCols = [
      { k: 'employee_name', label: 'Employee', h: function (r) { return empLink(r.employee); }, s: function (r) { return r.employee_name; } },
      { k: 'leave_type', label: 'Leave Type' }, { k: 'from_date', label: 'From' }, { k: 'to_date', label: 'To' },
      { k: 'total_leave_days', label: 'Days', n: 1, f: n1 },
      { k: 'status', label: 'Status', h: function (r) { return chip(t(r.status) + (r.docstatus === 0 ? ' · ' + t('Unsubmitted') : ''), r.status === 'Approved' && r.docstatus === 1 ? 'ok' : r.status === 'Rejected' ? 'bad' : 'warn'); }, x: function (r) { return r.status; } },
      { k: 'workflow_state', label: 'Workflow' }, { k: 'name', label: 'Application' }
    ];
    async function openEmp(id, tab) {
      S.ui.em.tab = tab || 'profile'; S.cal = { id: id, ym: S.cal.id === id && S.cal.ym ? S.cal.ym : addD(S.f.to < today() ? S.f.to : today(), -1).slice(0, 7), sel: '' };
      var e = await ensureEmp(id); if (!e) { openModal(id, note(esc(t('Employee not found or not permitted.')), 'bad')); return; }
      openModal(e.employee_name + ' · ' + id, '<div id="emHead"></div><div id="emBody">' + skeleton() + '</div>');
      $('#emHead').innerHTML = seg('em', [['profile', 'Profile'], ['payroll', 'Payroll'], ['attendance', 'Attendance calendar'], ['leaves', 'Leave history']], S.ui.em.tab);
      await emTab();
    }
    async function emTab() {
      var id = S.cal.id, e = EMP[id], box = $('#emBody'), tab = S.ui.em.tab; if (!box) { return; }
      $('#emHead').innerHTML = seg('em', [['profile', 'Profile'], ['payroll', 'Payroll'], ['attendance', 'Attendance calendar'], ['leaves', 'Leave history']], tab);
      box.innerHTML = skeleton();
      try {
        if (tab === 'profile') {
          var rows = [['Employee ID', e.name], ['Status', e.status], ['Company', e.company], ['Department', e.department], ['Branch', e.branch], ['Designation', e.designation], ['Payroll Cost Center', e.payroll_cost_center], ['Job Location', e.custom_job_location], ['Nationality (primary)', e.custom_nationality], ['Nationality (secondary)', e.custom_employee_nationality], ['Employment Type', e.employment_type], ['Date of Joining', e.date_of_joining], ['Relieving Date', e.relieving_date], ['Reports To', e.reports_to], ['Holiday List', e.holiday_list], ['Vacation Status', e.custom_vacation_status]];
          box.innerHTML = (natConflict(e) ? note('<b>' + esc(t('Nationality conflict')) + '</b> — ' + esc(e.custom_nationality) + ' ≠ ' + esc(e.custom_employee_nationality), 'bad') : '') + (isBO(e) ? note(esc(t('Back Office employee — excluded from punch-based attendance.')), 'info') : '') + (isWFH(e) ? note(esc(t('Work from home employee — excluded from punch-based absence.')), 'info') : '') +
            '<div class="dms-facts">' + rows.map(function (x) { return '<div><span>' + esc(t(x[0])) + '</span><b>' + esc(x[1] || '—') + '</b></div>'; }).join('') + '</div>' +
            '<div class="dms-facts" style="margin-top:10px"><div><span>' + esc(t('Weekly off')) + '</span><b>' + esc(isSaudi(e) ? t('Friday + Saturday') : t('Friday')) + '</b></div></div>';
        } else if (tab === 'payroll') {
          var sl = await list('Salary Slip', ['name', 'employee', 'employee_name', 'start_date', 'end_date', 'docstatus', 'gross_pay', 'net_pay', 'total_deduction', 'payroll_entry'], [['employee', '=', id], ['docstatus', '<', 2]], { order: 'start_date desc', len: 36 });
          var pm = (await getPayroll()).peMap; sl.forEach(function (s) { s.cc = (pm[s.payroll_entry] && pm[s.payroll_entry].cost_center) || ''; });
          box.innerHTML = tbl('emslips', slipCols, sl, { name: 'employee_slips_' + id, size: 12, resetPage: true, onRow: function (r) { openSlip(r.name); }, empty: t('No salary slips (or no permission).') });
        } else if (tab === 'attendance') {
          box.innerHTML = '<div id="calBox"></div>'; $('#calBox').innerHTML = await calHtml();
        } else {
          var ap = await all('Leave Application', LV_FIELDS, [['employee', '=', id], ['docstatus', '<', 2], ['status', '!=', 'Cancelled']], { order: 'from_date desc', cap: 500 });
          var bal = await balances([id], today() < S.f.to ? today() : S.f.to);
          box.innerHTML = '<h4 class="dms-h4">' + esc(t('Leave balances')) + '</h4>' + tbl('embal', balCols, bal, { size: 10, name: 'leave_balance_' + id, resetPage: true }) + '<h4 style="margin-top:14px">' + esc(t('Leave applications')) + '</h4>' + tbl('emleaves', leaveCols, ap, { size: 10, name: 'leave_history_' + id, resetPage: true });
        }
      } catch (er) { box.innerHTML = note(esc(er.message), 'bad'); }
    }
    var balCols = [
      { k: 'name', label: 'Employee', h: function (r) { return empLink(r.emp); }, s: function (r) { return r.name; } }, { k: 'type', label: 'Leave Type' },
      { k: 'from', label: 'Period', f: function (v, r) { return r.from + ' → ' + r.to; } }, { k: 'alloc', label: 'Allocated', n: 1, f: n1 }, { k: 'taken', label: 'Taken', n: 1, f: n1 },
      { k: 'bal', label: 'Balance', n: 1, h: function (r) { return '<b class="' + (r.bal < 0 ? 'sev-high' : '') + '">' + n1(r.bal) + '</b>'; } }
    ];
    var _emTab0 = emTab;
    emTab = async function () { await _emTab0(); var b = $('#emBody'); if (b) { fillTables(b); } keepFocus('.dms-modal [data-act="pseg"].dms-on'); };
    var RT = {};
    var TLAB = { overview: 'Overview', cc: 'Cost Center Breakdown', register: 'Payroll Register', components: 'Salary Component Analysis', employees: 'Employees', attendance: 'Employee Attendance', leaves: 'Employee Leaves', trends: 'Monthly Trends', controls: 'Controls & Audit' };
    function glByCC(rows) {
      var m = {}; rows.forEach(function (r) { var k = r.cost_center || '—'; var o = m[k] = m[k] || { cc: k, dr: 0, cr: 0, net: 0 }; o.dr += +r.debit || 0; o.cr += +r.credit || 0; o.net += (+r.debit || 0) - (+r.credit || 0); });
      return Object.keys(m).map(function (k) { return m[k]; });
    }


    RT.cc = async function () {
      var F = S.f, r = await Promise.all([getPayroll(), safe(getGL(F.from, F.to, true))]), pay = r[0], gl = r[1];
      var alloc = groupCC(pay.slips), glr = gl.ok ? glByCC(gl.v) : [], m = {};
      alloc.forEach(function (a) { m[a.cc] = { cc: a.cc, gross: a.gross, dg: a.dg, sg: a.sg, gl: 0 }; });
      glr.forEach(function (x) { var o = m[x.cc] = m[x.cc] || { cc: x.cc, gross: 0, dg: 0, sg: 0, gl: 0 }; o.gl = x.net; });
      var comb = Object.keys(m).map(function (k) { var o = m[k]; o.gap = o.sg - o.gl; return o; });
      var h = note(esc(t('Section A shows where payroll entries allocate cost (Payroll Entry cost center). Section B shows where the accounting actually booked expense (GL Entry cost center). They are different sources and are never mixed.')), 'info');
      h += card('A. Payroll-entry allocation by cost center', tbl('ccA', [
        { k: 'cc', label: 'Cost Center' }, { k: 'pe', label: 'Payroll Entries', n: 1, f: n0 }, { k: 'employees', label: 'Employees', n: 1, f: n0 }, { k: 'gross', label: 'Gross', n: 1, f: n2 }, { k: 'ded', label: 'Deductions', n: 1, f: n2 }, { k: 'net', label: 'Net Pay', n: 1, f: n2 },
        { k: 'dg', label: 'Draft gross (not posted)', n: 1, f: n2 }, { k: 'sg', label: 'Submitted gross', n: 1, f: n2 }
      ], alloc, { name: 'cost_center_allocation', size: 15, resetPage: true, onRow: function (x) { drillCC(x.cc); }, foot: { gross: sum(alloc, 'gross'), ded: sum(alloc, 'ded'), net: sum(alloc, 'net'), dg: sum(alloc, 'dg'), sg: sum(alloc, 'sg'), employees: new Set(pay.slips.map(function (s) { return s.employee; })).size } }), 'Click a row to list its salary slips');
      h += card('B. Actual GL expense by GL cost center (posted payroll accrual journals)', gl.ok ? (note(esc(t('Branch, Department and Employee filters cannot be applied to GL entries; Company, dates and Cost Center are applied.')), '') + tbl('ccB', [
        { k: 'cc', label: 'GL Cost Center' }, { k: 'dr', label: 'Debits', n: 1, f: n2 }, { k: 'cr', label: 'Credits', n: 1, f: n2 }, { k: 'net', label: 'Net expense', n: 1, f: n2 }
      ], glr, { name: 'gl_expense_by_cost_center', size: 15, resetPage: true, foot: { dr: sum(glr, 'dr'), cr: sum(glr, 'cr'), net: sum(glr, 'net') }, empty: t('No payroll accrual journals posted in this period.') })) : failBox(gl, 'GL expense'));
      h += card('C. Allocation vs GL (side by side – not netted)', plot(comb.slice().sort(function (a, b) { return b.gross - a.gross; }).slice(0, 8).map(function (x) { return x.cc.split(' - ')[0]; }), [{ name: t('Payroll-entry gross'), color: '#1f6feb', data: comb.slice().sort(function (a, b) { return b.gross - a.gross; }).slice(0, 8).map(function (x) { return x.gross; }) }, { name: t('GL posted expense'), color: '#0f9d6b', data: comb.slice().sort(function (a, b) { return b.gross - a.gross; }).slice(0, 8).map(function (x) { return x.gl; }) }], {})) +
        tbl('ccC', [{ k: 'cc', label: 'Cost Center' }, { k: 'dg', label: 'Draft gross (not posted)', n: 1, f: n2 }, { k: 'sg', label: 'Submitted gross', n: 1, f: n2 }, { k: 'gl', label: 'GL posted expense', n: 1, f: n2 }, { k: 'gap', label: 'Submitted − GL', n: 1, f: n2 }], comb, { name: 'allocation_vs_gl', size: 15, resetPage: true });
      h += card('Payroll entries', tbl('pes', [{ k: 'name', label: 'Payroll Entry' }, { k: 'cost_center', label: 'Cost Center' }, { k: 'start_date', label: 'Period', f: function (v, x) { return x.start_date + ' → ' + x.end_date; } }, { k: 'number_of_employees', label: 'Employees', n: 1 }, { k: 'salary_slips_created', label: 'Slips created', n: 1 }, { k: 'salary_slips_submitted', label: 'Slips submitted', n: 1 }, { k: 'docstatus', label: 'Status', h: function (x) { return x.salary_slips_submitted >= x.salary_slips_created && x.salary_slips_created ? chip(t('Slips submitted'), 'ok') : chip(t('Slips not submitted'), 'warn'); }, s: function (x) { return x.salary_slips_submitted; } }], pay.pes, { name: 'payroll_entries', size: 10, resetPage: true }));
      return h;
    };
    function drillCC(cc) { getPayroll().then(function (p) { var key = cc.indexOf('— ') === 0 ? '' : cc; openSlips(cc, p.slips.filter(function (s) { return (s.cc || '') === key; })); }); }

    RT.register = async function () {
      var pay = await getPayroll(), st = S.ui.reg.st, rows = pay.slips.filter(function (s) { return st === 'all' || (st === 'draft' ? s.docstatus === 0 : s.docstatus === 1); }), sm = sumSlips(rows);
      var h = (sm.dn ? note('<b>' + esc(t('Draft / Not posted')) + ':</b> ' + n0(sm.dn) + ' ' + esc(t('slips')) + ' · ' + sar(sm.dg) + ' ' + esc(t('gross')) + '. ' + esc(t('Draft slips are not accounting expense until submitted and posted.'))) : '');
      h += '<div class="dms-grid dms-kpis">' + kpi('Slips', n0(sm.n), '', {}) + kpi('Gross', sar(sm.gross), '', { tone: 'info' }) + kpi('Deductions', sar(sm.ded), '') + kpi('Net Pay', sar(sm.net), '', { tone: 'ok' }) + kpi('Draft / Not posted', sar(sm.dg), n0(sm.dn) + ' ' + t('slips'), { tone: 'warn', go: 'register|draft' }) + kpi('Submitted', sar(sm.sg), n0(sm.sn) + ' ' + t('slips'), { tone: 'ok', go: 'register|submitted' }) + '</div>';
      h += seg('reg|st', [['all', 'All'], ['draft', 'Draft / Not posted'], ['submitted', 'Submitted']], st);
      h += tbl('reg', slipCols.concat([{ k: 'department', label: 'Department' }, { k: 'branch', label: 'Branch' }]), rows, { name: 'payroll_register', size: 25, resetPage: true, onRow: function (r) { openSlip(r.name); }, foot: { gross_pay: sm.gross, total_deduction: sm.ded, net_pay: sm.net } });
      return h;
    };

    function rvSlipFilters() {
      var F = S.f, st = S.ui.cmp.st, fl = [['Salary Slip', 'start_date', '<=', F.to], ['Salary Slip', 'end_date', '>=', F.from], ['Salary Slip', 'docstatus', st === 'draft' ? '=' : st === 'submitted' ? '=' : '<', st === 'draft' ? 0 : st === 'submitted' ? 1 : 2]];
      fl.push(['Salary Slip'].concat(coF())); if (F.branch) { fl.push(['Salary Slip', 'branch', '=', F.branch]); } if (F.dept) { fl.push(['Salary Slip', 'department', '=', F.dept]); }
      return fl;
    }
    async function rvScope() {
      var F = S.f, fl = rvSlipFilters(), pay = await getPayroll();
      if (F.cc) { fl.push(['Salary Slip', 'payroll_entry', 'in', pay.pes.length ? pay.pes.map(function (p) { return p.name; }) : ['__none__']]); }
      var ids = await searchIds(); if (ids) { fl.push(['Salary Slip', 'employee', 'in', ids.length ? ids : ['__none__']]); }
      return fl;
    }
    RT.components = async function () {
      var st = S.ui.cmp.st, key = 'cmp|' + fk() + st;
      var rows = await memo(key, async function () {
        var fl = await rvScope(), D = '`tabSalary Detail`.';
        return rv('Salary Slip', [D + 'salary_component as comp', D + 'parentfield as pf', D + 'statistical_component as stat', D + 'do_not_include_in_total as dni', 'sum(' + D + 'amount) as amt', 'count(' + D + 'name) as n'], fl, { group: [D + 'salary_component', D + 'parentfield', D + 'statistical_component', D + 'do_not_include_in_total'].join(','), len: 1000 });
      });
      var pay = await getPayroll(), slips = pay.slips.filter(function (s) { return st === 'all' || (st === 'draft' ? s.docstatus === 0 : s.docstatus === 1); }), sm = sumSlips(slips);
      var earn = rows.filter(function (r) { return r.pf === 'earnings'; }), ded = rows.filter(function (r) { return r.pf === 'deductions'; });
      var counted = function (r) { return !r.stat && !r.dni; };
      var te = earn.filter(counted).reduce(function (a, r) { return a + r.amt; }, 0), td_ = ded.filter(counted).reduce(function (a, r) { return a + r.amt; }, 0), diff = te - sm.gross;
      var h = seg('cmp|st', [['all', 'All'], ['draft', 'Draft / Not posted'], ['submitted', 'Submitted']], st);
      h += '<div class="dms-grid dms-kpis">' + kpi('Total earnings (components)', sar(te), '', { tone: 'info' }) + kpi('Total deductions (components)', sar(td_), '') + kpi('Gross per salary slips', sar(sm.gross), n0(sm.n) + ' ' + t('slips')) + kpi('Reconciliation difference', sar(diff), Math.abs(diff) < 0.5 ? t('Components reconcile to slip gross') : t('Check statistical / non-counted components'), { tone: Math.abs(diff) < 0.5 ? 'ok' : 'bad' }) + '</div>';
      var cols = function (name) { return [{ k: 'comp', label: 'Salary Component' }, { k: 'n', label: 'Lines', n: 1, f: n0 }, { k: 'amt', label: 'Amount', n: 1, f: n2 }, { k: 'stat', label: 'Flags', h: function (r) { return (r.stat ? chip(t('Statistical'), 'info') : '') + (r.dni ? chip(t('Not in total'), 'warn') : ''); }, s: function (r) { return (r.stat ? 1 : 0) + (r.dni ? 1 : 0); } }]; };
      var top = function (a) { return a.filter(counted).sort(function (x, y) { return y.amt - x.amt; }).slice(0, 10).map(function (x) { return { l: x.comp, v: x.amt, k: x.pf + '|' + x.comp }; }); };
      h += '<div class="dms-cols-2 dms-grid">' + card('Top earnings', hbars(top(earn), { act: 'comp' })) + card('Top deductions', hbars(top(ded), { act: 'comp', fmt: n0 })) + '</div>';
      h += card('Earnings by component', tbl('cEarn', cols(), earn, { name: 'earnings_by_component', size: 15, resetPage: true, onRow: function (r) { drillComp(r.pf, r.comp); } }), 'Click a row to see which employees receive it');
      h += card('Deductions by component', tbl('cDed', cols(), ded, { name: 'deductions_by_component', size: 15, resetPage: true, onRow: function (r) { drillComp(r.pf, r.comp); } }));
      return h;
    };
    async function drillComp(pf, comp) {
      openModal(comp, skeleton());
      try {
        var fl = await rvScope(); fl.push(['Salary Detail', 'salary_component', '=', comp], ['Salary Detail', 'parentfield', '=', pf]);
        var rows = await rv('Salary Slip', ['`tabSalary Slip`.name as slip', '`tabSalary Slip`.employee as employee', '`tabSalary Slip`.employee_name as ename', '`tabSalary Slip`.docstatus as ds', '`tabSalary Detail`.amount as amt'], fl, { len: 1000, order: '`tabSalary Detail`.amount desc' });
        openModal(comp + ' (' + t(pf === 'earnings' ? 'Earnings' : 'Deductions') + ')', tbl('mcomp', [{ k: 'ename', label: 'Employee', h: function (r) { return empLink(r.employee); }, s: function (r) { return r.ename; } }, { k: 'slip', label: 'Salary Slip' }, { k: 'ds', label: 'Status', h: function (r) { return stChip({ docstatus: r.ds }); }, s: function (r) { return r.ds; } }, { k: 'amt', label: 'Amount', n: 1, f: n2 }], rows, { name: 'component_detail', size: 15, resetPage: true, onRow: function (r) { openSlip(r.slip); }, foot: { amt: sum(rows, 'amt') } }));
      } catch (e) { openModal(comp, note(esc(e.message), 'bad')); }
    }

    RT.employees = async function () {
      var emps = await getEmployees(), u = S.ui.emp, locs = uniq(emps.map(locOf).filter(Boolean)).sort();
      var rows = emps.filter(function (e) { return (u.st === 'all' || e.status === u.st) && (!u.loc || locOf(e) === u.loc); });
      var h = '<div class="dms-grid dms-kpis">' + kpi('Employees', n0(rows.length), '') + kpi('Active', n0(emps.filter(function (e) { return e.status === 'Active'; }).length), '', { tone: 'ok' }) + kpi('Saudi nationals', n0(rows.filter(isSaudi).length), '', {}) + kpi('Nationality conflicts', n0(rows.filter(natConflict).length), t('primary ≠ secondary field'), { tone: 'bad' }) + '</div>';
      h += '<div class="dms-chips dms-bchips pc-seg"><select class="dms-input pc-sel" data-sel="emp|st">' + [['Active', 'Active'], ['Inactive', 'Inactive'], ['Left', 'Left'], ['all', 'All statuses']].map(function (o) { return '<option value="' + o[0] + '"' + (u.st === o[0] ? ' selected' : '') + '>' + esc(t(o[1])) + '</option>'; }).join('') + '</select>' +
        '<select class="dms-input pc-sel" data-sel="emp|loc"><option value="">' + esc(t('All job locations')) + '</option>' + locs.map(function (l) { return '<option' + (u.loc === l ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select></div>';
      h += tbl('emps', [
        { k: 'name', label: 'ID' }, { k: 'employee_name', label: 'Employee' }, { k: 'department', label: 'Department' }, { k: 'branch', label: 'Branch' }, { k: 'payroll_cost_center', label: 'Cost Center' }, { k: 'designation', label: 'Designation' },
        { k: 'custom_nationality', label: 'Nationality', h: function (e) { return esc(e.custom_nationality || '') + (natConflict(e) ? ' ' + chip(t('conflict'), 'bad') : ''); }, s: function (e) { return e.custom_nationality; } },
        { k: 'custom_job_location', label: 'Job Location' }, { k: 'status', label: 'Status', h: function (e) { return chip(t(e.status), e.status === 'Active' ? 'ok' : 'bad'); } }
      ], rows, { name: 'employees', size: 25, resetPage: true, onRow: function (e) { openEmp(e.name); } });
      return h;
    };

    RT.attendance = async function () {
      var u = S.ui.att, raw = await attRaw();
      if (raw.empty) { return note(esc(t('The selected period has no days up to today.')), 'info'); }
      var c = attCompute(raw, u.mode), h = '';
      if (raw.clipped) { h += note(esc(t('Range limited to the last 93 days to keep Employee Checkin queries small.')) + ' (' + raw.a + ' → ' + raw.end + ')'); }
      if (raw.truncated) { h += note(esc(t('Punch results were capped at 60,000 rows – narrow the date range.')), 'bad'); }
      if (raw.end < S.f.to) { h += note(esc(t('Future dates are never marked absent; the calculation stops at today.')) + ' (' + raw.end + ')', 'info'); }
      h += '<div class="dms-grid dms-kpis">' + kpi('Eligible employees', n0(c.elig), t('excl. Back Office & WFH'), {}) + kpi('Present', n0(c.last.P), raw.end, { tone: 'ok', go: 'attendance|day' }) + kpi('Absent', n0(c.last.A), raw.end + (c.last.T ? ' · ' + n0(c.last.T) + ' ' + t('pending punch') : ''), { tone: 'bad', go: 'attendance|day' }) + kpi('On approved leave', n0(c.last.L), raw.end, { tone: 'info' }) +
        kpi('Back Office – excluded', n0(c.bo), t('employees'), { tone: 'warn' }) + kpi('Work from home – excluded', n0(c.wfh), t('employees'), { tone: 'warn' }) + kpi('Nationality conflicts', n0(c.conflicts.length), t('primary ≠ secondary field'), { tone: 'bad', go: 'attendance|conf' }) + '</div>';
      h += '<div class="dms-chips dms-bchips pc-seg">' + [['sum', 'Employee summary'], ['day', 'Daily punch details'], ['conf', 'Nationality conflicts'], ['rules', 'Rules & limits']].map(function (x) { return '<button type="button" class="dms-bchip' + (u.sub === x[0] ? ' dms-on' : '') + '" data-act="pseg" data-v="att|sub|' + x[0] + '">' + esc(t(x[1])) + '</button>'; }).join('') +
        '<select class="dms-input pc-sel" data-sel="att|mode"><option value="any"' + (u.mode === 'any' ? ' selected' : '') + '>' + esc(t('Count any punch')) + '</option><option value="in"' + (u.mode === 'in' ? ' selected' : '') + '>' + esc(t('Count IN punches only')) + '</option></select></div>';
      if (u.sub === 'sum') {
        h += card('Daily trend', plot(c.trend.map(function (x) { return x.d.slice(5); }), [{ name: t('Present'), color: '#0f9d6b', data: c.trend.map(function (x) { return x.P; }) }, { name: t('Absent'), color: '#d92d20', data: c.trend.map(function (x) { return x.A; }) }, { name: t('Approved leave'), color: '#1f6feb', data: c.trend.map(function (x) { return x.L; }) }], { line: true, act: 'attday', keys: c.trend.map(function (x) { return x.d; }) }));
        h += tbl('attsum', [
          { k: 'name', label: 'Employee', h: function (r) { return empLink(r.id); }, s: function (r) { return r.name; } }, { k: 'cc', label: 'Cost Center' }, { k: 'loc', label: 'Job Location' },
          { k: 'nat', label: 'Nationality', h: function (r) { return esc(r.nat) + (r.conflict ? ' ' + chip(t('conflict'), 'bad') : ''); } },
          { k: 'wd', label: 'Working days', n: 1, f: n1 }, { k: 'P', label: 'Present', n: 1, f: n1 }, { k: 'A', label: 'Absent', n: 1, h: function (r) { return r.A ? '<b class="sev-high">' + n1(r.A) + '</b>' : '0'; } }, { k: 'L', label: 'Leave', n: 1, f: n1 }, { k: 'W', label: 'WFH (excluded)', n: 1, f: n0 },
          { k: 'rate', label: 'Attendance %', n: 1, f: function (v) { return v == null ? '—' : n1(v) + '%'; } }
        ], c.rows, { name: 'attendance_summary', size: 25, resetPage: true, onRow: function (r) { openEmp(r.id, 'attendance'); } });
      } else if (u.sub === 'day') {
        var day = u.day && u.day >= raw.a && u.day <= raw.end ? u.day : raw.end;
        h += '<div class="dms-chips dms-bchips pc-seg"><input type="date" class="dms-input pc-sel" min="' + raw.a + '" max="' + raw.end + '" value="' + day + '" data-sel="att|day"> ' + [['A', 'Absent'], ['P', 'Present'], ['L', 'Leave'], ['X', 'Excluded / off'], ['punch', 'All punches']].map(function (x) { return '<button type="button" class="dms-bchip' + (u.dv === x[0] ? ' dms-on' : '') + '" data-act="pseg" data-v="att|dv|' + x[0] + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div>';
        var byE = raw.list, pm = function (e) { return (raw.P[e.name] && raw.P[e.name][day]) || []; };
        if (u.dv === 'punch') {
          var pr = raw.punches.filter(function (p) { return p.time.slice(0, 10) === day; }).map(function (p) { return { t: hm(p.time), id: p.employee, name: ename(p.employee), type: p.log_type, dev: p.custom_attendance_device || p.device_id || '' }; });
          h += tbl('attday', [{ k: 't', label: 'Time' }, { k: 'name', label: 'Employee', h: function (r) { return empLink(r.id); }, s: function (r) { return r.name; } }, { k: 'type', label: 'Type' }, { k: 'dev', label: 'Device' }], pr, { name: 'punches_' + day, size: 30, resetPage: true });
        } else {
          var rows = byE.map(function (e) { return { e: e, s: dayStat(e, day, raw.P[e.name], raw.L[e.name], raw.td, u.mode) }; }).filter(function (x) { return u.dv === 'X' ? ['H', 'W', 'B', 'N'].indexOf(x.s) >= 0 : u.dv === 'L' ? (x.s === 'L' || x.s === 'HL') : u.dv === 'A' ? (x.s === 'A' || x.s === 'HL') : x.s === u.dv; }).map(function (x) { var ps = pm(x.e); return { id: x.e.name, name: x.e.employee_name, cc: x.e.payroll_cost_center || '', loc: locOf(x.e), nat: x.e.custom_nationality || '', st: t(ATTLAB[x.s]), first: ps.length ? hm(ps[0].time) : '', lastp: ps.length ? hm(ps[ps.length - 1].time) : '', n: ps.length }; });
          h += tbl('attday', [{ k: 'name', label: 'Employee', h: function (r) { return empLink(r.id); }, s: function (r) { return r.name; } }, { k: 'cc', label: 'Cost Center' }, { k: 'loc', label: 'Job Location' }, { k: 'nat', label: 'Nationality' }, { k: 'st', label: 'Status' }, { k: 'first', label: 'First punch' }, { k: 'lastp', label: 'Last punch' }, { k: 'n', label: 'Punches', n: 1 }], rows, { name: 'attendance_' + u.dv + '_' + day, size: 30, resetPage: true, onRow: function (r) { openEmp(r.id, 'attendance'); } });
        }
      } else if (u.sub === 'conf') {
        h += note(esc(t('Primary nationality is custom_nationality. Employees are flagged when custom_employee_nationality names a different country. Saturday off is applied from the primary field only.')), 'info');
        h += tbl('attconf', [{ k: 'employee_name', label: 'Employee', h: function (e) { return empLink(e.name); }, s: function (e) { return e.employee_name; } }, { k: 'custom_nationality', label: 'Nationality (primary)' }, { k: 'custom_employee_nationality', label: 'Nationality (secondary)' }, { k: 'x', label: 'Weekly off used', h: function (e) { return esc(isSaudi(e) ? t('Friday + Saturday') : t('Friday')); } }, { k: 'status', label: 'Status' }], c.conflicts, { name: 'nationality_conflicts', size: 25, resetPage: true, onRow: function (e) { openEmp(e.name); }, empty: t('No nationality conflicts in the selected employees.') });
      } else {
        h += card('Rules applied', '<ul><li>' + [t('Source: Employee Checkin only – the Attendance DocType is not used.'), t('Present = at least one punch on an eligible working day; Absent = none.'), t('Friday is a holiday for everyone; Saturday too for Saudi nationals (primary nationality field).'), t('Back Office employees are excluded; Work At Home / Work From Home employees are excluded from absence and counted separately.'), t('Approved, submitted leave is never counted as absence; a half-day leave without a punch counts ½ leave and ½ absent.'), t('Future dates are never absent; today with no punch yet is shown as pending.'), t('Holiday Lists are also honoured when they contain the date (they currently stop at 2024).')].map(esc).join('</li><li>') + '</li></ul>');
      }
      return h;
    };

    RT.leaves = async function () {
      var u = S.ui.lv, F = S.f, d = await leaveData(), r = await Promise.all([safe(leaveNow()), u.sub === 'balances' ? safe(idsIfNeeded().then(function (ids) { return balances(ids, F.to < today() ? F.to : today()); })) : Promise.resolve(null)]), now = r[0].ok ? r[0].v : [], taken = 0;
      d.days.forEach(function (x) { taken += x.f; });
      var h = '';
      if (d.unsub.length) { h += note('<b>' + n0(d.unsub.length) + '</b> ' + esc(t('applications have status Approved but are not submitted; they are excluded from approved leave.'))); }
      h += '<div class="dms-grid dms-kpis">' + kpi('Approved leaves', n0(d.appr.length), t('submitted applications'), { tone: 'ok', go: 'leaves|approved' }) + kpi('Leave days taken', n1(taken), t('de-duplicated, holidays & half-days applied'), { tone: 'info', go: 'leaves|types' }) + kpi('Pending leaves', n0(d.pend.length), '', { tone: 'warn', go: 'leaves|pending' }) + kpi('Rejected leaves', n0(d.rej.length), '', { tone: 'bad', go: 'leaves|rejected' }) + kpi('Employees currently on leave', r[0].ok ? n0(new Set(now.map(function (a) { return a.employee; })).size) : '—', today(), { tone: 'info', go: 'leaves|now' }) + '</div>';
      h += '<div class="dms-chips dms-bchips pc-seg">' + [['approved', 'Approved'], ['pending', 'Pending'], ['rejected', 'Rejected'], ['now', 'On leave now'], ['balances', 'Leave balances'], ['types', 'Leave type breakdown'], ['cal', 'Leave calendar']].map(function (x) { return '<button type="button" class="dms-bchip' + (u.sub === x[0] ? ' dms-on' : '') + '" data-act="pseg" data-v="lv|sub|' + x[0] + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div>';
      var lc = leaveCols;
      if (u.sub === 'approved') { h += tbl('lvA', lc, d.appr, { name: 'approved_leaves', size: 20, resetPage: true, onRow: function (a) { openEmp(a.employee, 'leaves'); } }); }
      else if (u.sub === 'pending') { h += tbl('lvP', lc, d.pend, { name: 'pending_leaves', size: 20, resetPage: true, onRow: function (a) { openEmp(a.employee, 'leaves'); } }); }
      else if (u.sub === 'rejected') { h += tbl('lvR', lc, d.rej, { name: 'rejected_leaves', size: 20, resetPage: true, onRow: function (a) { openEmp(a.employee, 'leaves'); } }); }
      else if (u.sub === 'now') { h += r[0].ok ? tbl('lvN', lc.concat([{ k: 'rd', label: 'Expected return', f: function (v, a) { return addD(a.to_date, 1); } }]).map(function (c) { return c; }), now.map(function (a) { return Object.assign({ rd: addD(a.to_date, 1) }, a); }), { name: 'on_leave_now', size: 20, resetPage: true, onRow: function (a) { openEmp(a.employee, 'leaves'); }, empty: t('Nobody is on approved leave today.') }) : failBox(r[0], 'Employees on leave'); }
      else if (u.sub === 'balances') { h += note(esc(t('Balance = total allocated (Leave Allocation, submitted) − approved leave days taken within the allocation period, computed with the same holiday / half-day rules. Encashment and expiry adjustments in ERPNext\'s leave ledger are not included.')), 'info') + (r[1].ok ? tbl('lvB', balCols, r[1].v, { name: 'leave_balances', size: 20, resetPage: true, onRow: function (b) { openEmp(b.emp, 'leaves'); } }) : failBox(r[1], 'Leave balances')); }
      else if (u.sub === 'types') {
        var m = {}; d.days.forEach(function (x) { var o = m[x.type] = m[x.type] || { type: x.type, days: 0, apps: new Set(), pend: 0, rej: 0 }; o.days += x.f; o.apps.add(x.app); });
        d.pend.forEach(function (a) { var o = m[a.leave_type] = m[a.leave_type] || { type: a.leave_type, days: 0, apps: new Set(), pend: 0, rej: 0 }; o.pend++; });
        d.rej.forEach(function (a) { var o = m[a.leave_type] = m[a.leave_type] || { type: a.leave_type, days: 0, apps: new Set(), pend: 0, rej: 0 }; o.rej++; });
        var tr = Object.keys(m).map(function (k) { var o = m[k]; o.na = o.apps.size; return o; }).sort(function (a, b) { return b.days - a.days; });
        h += '<div class="dms-cols-2 dms-grid">' + card('Approved leave days by type', donut(tr.filter(function (x) { return x.days > 0; }).map(function (x) { return { l: x.type, v: x.days }; }), { fmt: n1 })) + card('Applications by type', hbars(tr.map(function (x) { return { l: x.type, v: x.na + x.pend + x.rej, k: x.type }; }), {})) + '</div>';
        h += tbl('lvT', [{ k: 'type', label: 'Leave Type' }, { k: 'na', label: 'Approved apps', n: 1 }, { k: 'days', label: 'Days taken', n: 1, f: n1 }, { k: 'pend', label: 'Pending', n: 1 }, { k: 'rej', label: 'Rejected', n: 1 }], tr, { name: 'leave_types', size: 20, resetPage: true });
      } else { h += await leaveCalHtml(); }
      return h;
    };
    async function leaveCalHtml() {
      var u = S.ui.lv, td = today(); if (!u.ym) { u.ym = addD(S.f.to < td ? S.f.to : td, -1).slice(0, 7); }
      var a = u.ym + '-01', b = monthEnd(a), ids = await idsIfNeeded(), emps = await getEmployees(); await Promise.all([loadHolidays(emps), leaveTypes()]);
      var apps = await memo('lcal|' + fk() + u.ym, function () { var fl = [['docstatus', '=', 1], ['status', '=', 'Approved'], ['from_date', '<=', b], ['to_date', '>=', a]]; if (ids) { fl.push(['employee', 'in', ids]); } return all('Leave Application', LV_FIELDS, fl); });
      var days = dedupe(apps, a, b), by = {}; days.forEach(function (x) { (by[x.d] = by[x.d] || []).push(x); });
      var cells = ''; wdNames().forEach(function (w) { cells += '<div class="dh">' + esc(w) + '</div>'; }); for (var i = 0; i < dow(a); i++) { cells += '<div class="d e"></div>'; }
      eachDay(a, b).forEach(function (d) { var n = (by[d] || []).length; cells += '<button type="button" class="d ' + (n ? 's-L' : 's-N') + '" data-act="lcalday" data-k="' + d + '"><b>' + (+d.slice(8)) + '</b><small>' + (n ? n + ' ' + esc(t('on leave')) : '') + '</small></button>'; });
      LCAL = by;
      return '<div class="dms-panelbox"><div class="calnav"><button type="button" class="dms-btn dms-btn-sm" data-act="lcalnav" data-k="-1">‹</button><span>' + esc(monthName(u.ym)) + '</span><button type="button" class="dms-btn dms-btn-sm" data-act="lcalnav" data-k="1">›</button></div><div class="cal">' + cells + '</div><div id="lcalDetail" style="margin-top:10px">' + esc(t('Click a day to see who is on leave.')) + '</div></div>';
    }
    var LCAL = {};

    RT.trends = async function () {
      var tr = await trendData(), m = tr.months, li = m.length - 1; while (li > 0 && !m[li].n) { li--; } var last = m[li], prev = m[li - 1], mom = prev && prev.gross ? 100 * (last.gross - prev.gross) / prev.gross : null;
      var h = '';
      if (!tr.glOk) { h += failBox({ err: tr.glErr }, 'GL expense'); }
      if (S.f.branch || S.f.dept || S.f.q) { h += note(esc(t('Branch, Department and Employee filters cannot be applied to GL entries (they carry no such fields).')), 'info'); }
      h += '<div class="dms-grid dms-kpis">' + kpi('Latest month gross', sar(last.gross), monthName(last.m), { go: 'register' }) + kpi('Month-on-month', mom == null ? '—' : (mom >= 0 ? '+' : '') + n1(mom) + '%', t('vs previous month'), { tone: mom > 0 ? 'warn' : 'ok' }) + kpi('12-month gross', sar(sum(m, 'gross')), '') + kpi('Average monthly gross', sar(sum(m, 'gross') / 12), '') + kpi('12-month posted GL expense', tr.glOk ? sar(sum(m, 'gl')) : '—', t('Accrual journals'), { tone: 'ok', go: 'cc' }) + '</div>';
      var cats = m.map(function (x) { return monthName(x.m, true); }), keys = m.map(function (x) { return x.m; });
      h += '<div class="dms-cols-2 dms-grid">' + card('Gross payroll by status', plot(cats, [{ name: t('Draft / Not posted'), color: '#d98e04', data: m.map(function (x) { return x.dg; }) }, { name: t('Submitted'), color: '#0f9d6b', data: m.map(function (x) { return x.sg; }) }], { act: 'month', keys: keys })) + card('Gross vs Net vs Deductions', plot(cats, [{ name: t('Gross'), color: '#1f6feb', data: m.map(function (x) { return x.gross; }) }, { name: t('Net Pay'), color: '#10b981', data: m.map(function (x) { return x.net; }) }, { name: t('Deductions'), color: '#ef4444', data: m.map(function (x) { return x.ded; }) }], { line: true, act: 'month', keys: keys })) + '</div>';
      h += '<div class="dms-cols-2 dms-grid">' + card('Submitted gross vs posted GL expense', plot(cats, [{ name: t('Submitted gross'), color: '#1f6feb', data: m.map(function (x) { return x.sg; }) }, { name: t('GL posted expense'), color: '#0f9d6b', data: m.map(function (x) { return x.gl; }) }], { act: 'month', keys: keys })) + card('Payslips per month', plot(cats, [{ name: t('Slips'), color: '#8b5cf6', data: m.map(function (x) { return x.n; }) }], { line: true, act: 'month', keys: keys })) + '</div>';
      h += tbl('trT', [{ k: 'm', label: 'Month', f: function (v) { return monthName(v); } }, { k: 'n', label: 'Slips', n: 1, f: n0 }, { k: 'dg', label: 'Draft gross (not posted)', n: 1, f: n2 }, { k: 'sg', label: 'Submitted gross', n: 1, f: n2 }, { k: 'gross', label: 'Gross', n: 1, f: n2 }, { k: 'ded', label: 'Deductions', n: 1, f: n2 }, { k: 'net', label: 'Net Pay', n: 1, f: n2 }, { k: 'gl', label: 'GL posted expense', n: 1, f: n2 }], m, { name: 'monthly_trends', size: 12, resetPage: true, onRow: function (x) { drillMonth(x.m); } });
      return h;
    };
    async function drillMonth(ym) {
      openModal(monthName(ym), skeleton());
      try {
        var F = S.f, fl = [['docstatus', '<', 2], ['start_date', '>=', ym + '-01'], ['start_date', '<=', monthEnd(ym + '-01')]];
        fl.push(coF()); if (F.branch) { fl.push(['branch', '=', F.branch]); } if (F.dept) { fl.push(['department', '=', F.dept]); }
        var ids = await searchIds(); if (ids) { fl.push(['employee', 'in', ids.length ? ids : ['__none__']]); }
        var sl = await all('Salary Slip', ['name', 'employee', 'employee_name', 'start_date', 'end_date', 'docstatus', 'gross_pay', 'net_pay', 'total_deduction', 'payroll_entry'], fl, { order: 'employee_name asc' });
        var pes = uniq(sl.map(function (s) { return s.payroll_entry; }).filter(Boolean)), pm = {};
        if (pes.length) { (await all('Payroll Entry', ['name', 'cost_center'], [['name', 'in', pes]])).forEach(function (p) { pm[p.name] = p.cost_center; }); }
        sl.forEach(function (s) { s.cc = pm[s.payroll_entry] || ''; }); if (F.cc) { sl = sl.filter(function (s) { return s.cc === F.cc; }); }
        openSlips(monthName(ym), sl, 'mmonth');
      } catch (e) { openModal(monthName(ym), note(esc(e.message), 'bad')); }
    }

    function controlChecks() { return memo('ctl|' + fk(), async function () {
      var F = S.f, r = await Promise.all([getEmployees(), getPayroll(), safe(leaveData()), safe(list('Holiday List', ['name', 'from_date', 'to_date'])), safe(getGL(F.from, F.to, true))]);
      var emps = r[0], pay = r[1], lv = r[2], hl = r[3], gl = r[4], td = today(), checks = [];
      var slipC = slipCols, empC = [{ k: 'employee_name', label: 'Employee', h: function (e) { return empLink(e.name); }, s: function (e) { return e.employee_name; } }, { k: 'status', label: 'Status' }, { k: 'payroll_cost_center', label: 'Cost Center' }, { k: 'custom_job_location', label: 'Job Location' }, { k: 'custom_nationality', label: 'Nationality' }];
      var add = function (id, sev, title, desc, rows, cols, oRow) { checks.push({ id: id, sev: sev, title: title, desc: desc, rows: rows, cols: cols, onRow: oRow }); };
      var slips = pay.slips, byEmp = {}, dup = [];
      slips.forEach(function (s) { var k = s.employee + '|' + s.start_date + '|' + s.end_date; (byEmp[k] = byEmp[k] || []).push(s); }); Object.keys(byEmp).forEach(function (k) { if (byEmp[k].length > 1) { dup = dup.concat(byEmp[k]); } });
      add('draft', 'high', 'Draft / not posted salary slips', 'Draft slips exist for the period; they are not accounting expense until submitted and posted.', slips.filter(function (s) { return s.docstatus === 0; }), slipC, function (x) { openSlip(x.name); });
      add('pe', 'high', 'Payroll entries with unsubmitted slips', 'Payroll Entry shows fewer submitted than created slips.', pay.pes.filter(function (p) { return p.salary_slips_submitted < p.salary_slips_created; }), [{ k: 'name', label: 'Payroll Entry' }, { k: 'cost_center', label: 'Cost Center' }, { k: 'salary_slips_created', label: 'Slips created', n: 1 }, { k: 'salary_slips_submitted', label: 'Slips submitted', n: 1 }]);
      add('dup', 'high', 'Duplicate salary slips (same employee & period)', 'More than one non-cancelled slip for the same employee and period.', dup, slipC, function (x) { openSlip(x.name); });
      add('nope', 'med', 'Salary slips without a payroll entry', 'Cost center allocation cannot be derived for these slips.', slips.filter(function (s) { return !s.payroll_entry; }), slipC, function (x) { openSlip(x.name); });
      add('ccmis', 'med', 'Slip cost center ≠ employee master cost center', 'Payroll Entry cost center differs from Employee.payroll_cost_center.', slips.filter(function (s) { var e = EMP[s.employee]; return e && s.cc && e.payroll_cost_center && e.payroll_cost_center !== s.cc; }), slipC.concat([{ k: 'emc', label: 'Employee master CC', h: function (s) { return esc((EMP[s.employee] || {}).payroll_cost_center || ''); } }]), function (x) { openSlip(x.name); });
      add('inact', 'med', 'Salary slips for non-active employees', 'Employee status is Left / Inactive but a slip exists in the period.', slips.filter(function (s) { var e = EMP[s.employee]; return e && e.status !== 'Active'; }), slipC, function (x) { openSlip(x.name); });
      var paid = new Set(slips.map(function (s) { return s.employee; }));
      add('noslip', 'low', 'Active employees without a slip in the period', slips.length ? 'Active employees (joined before period end) with no slip – verify whether they should be paid.' : 'No slips found in the period.', slips.length ? emps.filter(function (e) { return e.status === 'Active' && !paid.has(e.name) && (!e.date_of_joining || e.date_of_joining <= S.f.to); }) : [], empC, function (x) { openEmp(x.name, 'payroll'); });
      var sg = sumSlips(slips).sg, glNet = gl.ok ? gl.v.reduce(function (a, x) { return a + (+x.debit || 0) - (+x.credit || 0); }, 0) : null;
      add('glgap', 'med', 'Submitted slips vs posted GL expense', gl.ok ? 'Submitted gross ' + sar(sg) + ' vs GL posted ' + sar(glNet) + ' (difference ' + sar(sg - glNet) + '). GL only holds Expense-account lines of standard payroll accrual journals.' : 'GL not readable: ' + gl.err, (gl.ok && Math.abs(sg - glNet) > Math.max(1, sg * 0.01)) ? [{ a: 'Submitted gross', b: sg }, { a: 'GL posted expense', b: glNet }, { a: 'Difference', b: sg - glNet }] : [], [{ k: 'a', label: 'Measure' }, { k: 'b', label: 'Amount', n: 1, f: n2 }]);
      var act = emps.filter(function (e) { return e.status === 'Active'; });
      add('natc', 'med', 'Nationality conflicts (custom_nationality vs custom_employee_nationality)', 'Primary field is used for the Saudi Saturday rule.', act.filter(natConflict), empC.concat([{ k: 'custom_employee_nationality', label: 'Nationality (secondary)' }]), function (x) { openEmp(x.name); });
      add('natm', 'low', 'Active employees missing primary nationality', 'Saturday rule cannot be applied.', act.filter(function (e) { return !e.custom_nationality; }), empC, function (x) { openEmp(x.name); });
      add('nocc', 'low', 'Active employees without payroll cost center', '', act.filter(function (e) { return !e.payroll_cost_center; }), empC, function (x) { openEmp(x.name); });
      add('noloc', 'low', 'Active employees without job location', 'Back Office / WFH exclusion cannot be applied.', act.filter(function (e) { return !e.custom_job_location; }), empC, function (x) { openEmp(x.name); });
      if (lv.ok) {
        var d = lv.v, ov = [], byE = {};
        d.appr.forEach(function (a) { (byE[a.employee] = byE[a.employee] || []).push(a); });
        Object.keys(byE).forEach(function (k) { var l = byE[k].sort(function (x, y) { return cmp(x.from_date, y.from_date); }); for (var i = 1; i < l.length; i++) { if (l[i].from_date <= l[i - 1].to_date) { ov.push(l[i - 1], l[i]); } } });
        var mism = d.appr.filter(function (a) { var e = EMP[a.employee] || {}, c = 0; legDays(a, e, a.from_date, a.to_date).forEach(function (x) { c += x.f; }); a.calc = c; return Math.abs(c - (+a.total_leave_days || 0)) > 0.01; });
        add('lpend', 'med', 'Pending leave requests', 'Status Open in period', d.pend, leaveCols, function (x) { openEmp(x.employee, 'leaves'); });
        add('lunsub', 'med', 'Leave approved but not submitted', 'Excluded from approved leave calculations.', d.unsub, leaveCols, function (x) { openEmp(x.employee, 'leaves'); });
        add('lopen', 'low', 'Pending leave older than 30 days', '', d.pend.filter(function (a) { return a.posting_date && diffDays(a.posting_date, td) > 30; }), leaveCols, function (x) { openEmp(x.employee, 'leaves'); });
        add('lov', 'med', 'Overlapping approved leaves (same employee)', 'Overlaps are de-duplicated in day counts.', uniq(ov.map(function (a) { return a.name; })).map(function (n) { return ov.filter(function (a) { return a.name === n; })[0]; }), leaveCols, function (x) { openEmp(x.employee, 'leaves'); });
        add('lmis', 'low', 'Stored leave days ≠ recalculated days', 'total_leave_days differs from the day count after Friday/Saturday/holiday and half-day rules.', mism, leaveCols.concat([{ k: 'calc', label: 'Recalculated', n: 1, f: n1 }]), function (x) { openEmp(x.employee, 'leaves'); });
      }
      var hlGap = hl.ok ? hl.v.filter(function (x) { return x.to_date < S.f.to; }) : [];
      add('hol', 'med', 'Holiday Lists do not cover the selected period', 'Lists end before the period; the Friday/Saturday rules are applied instead of listed holidays.', hlGap, [{ k: 'name', label: 'Holiday List' }, { k: 'from_date', label: 'From' }, { k: 'to_date', label: 'To' }]);
      var order = { high: 0, med: 1, low: 2 };
      checks.sort(function (a, b) { return (a.rows.length ? 0 : 1) - (b.rows.length ? 0 : 1) || order[a.sev] - order[b.sev]; });
      return checks; }); }
    RT.controls = async function () {
      var checks = await controlChecks(); CHK = checks;
      var open = checks.filter(function (c) { return c.rows.length; });
      var h = '<div class="dms-grid dms-kpis">' + kpi('Checks run', n0(checks.length), '') + kpi('Open findings', n0(open.length), '', { tone: open.length ? 'warn' : 'ok' }) + kpi('High severity', n0(open.filter(function (c) { return c.sev === 'high'; }).length), '', { tone: 'bad' }) + kpi('Medium severity', n0(open.filter(function (c) { return c.sev === 'med'; }).length), '', { tone: 'warn' }) + '</div>';
      h += '<div class="dms-panelbox dms-mb"><div class="dms-tablewrap"><table class="dms-table"><thead><tr><th>' + esc(t('Severity')) + '</th><th>' + esc(t('Control check')) + '</th><th class="n">' + esc(t('Findings')) + '</th><th></th></tr></thead><tbody>' + checks.map(function (c, i) {
        return '<tr><td>' + chip(t(c.sev === 'high' ? 'High' : c.sev === 'med' ? 'Medium' : 'Low'), c.rows.length ? (c.sev === 'high' ? 'bad' : c.sev === 'med' ? 'warn' : 'info') : 'ok') + '</td><td><b>' + esc(t(c.title)) + '</b><div class="dms-sm">' + esc(t(c.desc)) + '</div></td><td class="n">' + (c.rows.length ? '<b class="sev-' + c.sev + '">' + n0(c.rows.length) + '</b>' : chip(t('OK'), 'ok')) + '</td><td>' + (c.rows.length ? '<button type="button" class="dms-btn dms-btn-sm" data-act="chk" data-k="' + i + '">' + esc(t('View')) + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
      h += card('Data limitations (shown, not hidden)', '<ul><li>' + [
        t('Posted payroll expense is read from GL Entry rows of the standard HRMS payroll accrual journals (matched by their remark) on Expense accounts. Manually posted payroll journals with a different remark are not recognised.'),
        t('Branch, Department and Employee filters cannot be applied to GL entries (they carry no such fields).'),
        t('Leave balances are computed from submitted allocations minus approved applications; ERPNext leave-ledger encashment / expiry entries are not readable here.'),
        t('Holiday Lists in this site stop at 2024, so 2025+ public holidays are not known; only Friday/Saturday rules apply.'),
        t('Employee Checkin is queried only for the selected range (max 93 days), never the full history.'),
        t('Salary figures appear only if the logged-in user has Salary Slip permission.')].map(esc).join('</li><li>') + '</li></ul>');
      return h;
    };
    Object.assign(AR, {
    'Payroll Cost Center Dashboard': 'لوحة مراكز تكلفة الرواتب', 'DM Group KSA': 'مجموعة دي إم - المملكة العربية السعودية', 'Refresh': 'تحديث', 'Company': 'الشركة', 'From Date': 'من تاريخ', 'To Date': 'إلى تاريخ', 'Cost Center': 'مركز التكلفة', 'Branch': 'الفرع', 'Department': 'القسم', 'Employee search': 'بحث عن موظف', 'Name or ID': 'الاسم أو الرقم', 'Apply': 'تطبيق', 'Reset': 'إعادة ضبط',
    'Overview': 'نظرة عامة', 'Cost Center Breakdown': 'تفصيل مراكز التكلفة', 'Payroll Register': 'سجل الرواتب', 'Salary Component Analysis': 'تحليل مكونات الراتب', 'Employees': 'الموظفون', 'Employee Attendance': 'حضور الموظفين', 'Employee Leaves': 'إجازات الموظفين', 'Monthly Trends': 'الاتجاهات الشهرية', 'Controls & Audit': 'الضوابط والتدقيق',
    'All companies': 'جميع الشركات', 'All cost centers': 'جميع مراكز التكلفة', 'All branches': 'جميع الفروع', 'All departments': 'جميع الأقسام', 'All job locations': 'جميع مواقع العمل', 'All statuses': 'جميع الحالات', 'All': 'الكل',
    'Live data': 'بيانات مباشرة', 'Loading live data…': 'جارٍ تحميل البيانات المباشرة…', 'Could not load data': 'تعذر تحميل البيانات', 'Retry': 'إعادة المحاولة', 'check your ERPNext permissions': 'تحقق من صلاحياتك في ERPNext', 'No data': 'لا توجد بيانات', 'No records found': 'لا توجد سجلات', 'records': 'سجلات', 'Export CSV': 'تصدير CSV', 'Total': 'الإجمالي', 'View': 'عرض', 'From Date must be on or before To Date.': 'يجب أن يكون تاريخ البداية قبل أو يساوي تاريخ النهاية.',
    'Draft / Not posted': 'مسودة / غير مرحّل', 'Draft / Not posted payroll': 'رواتب مسودة / غير مرحّلة', 'Draft': 'مسودة', 'Submitted': 'مقدّم', 'Cancelled': 'ملغى', 'Not posted': 'غير مرحّل', 'slips': 'قسائم', 'gross': 'إجمالي', 'Gross': 'الإجمالي', 'Net Pay': 'صافي الراتب', 'Deductions': 'الاستقطاعات', 'Total Deductions': 'إجمالي الاستقطاعات', 'Earnings': 'المستحقات',
    'Shown separately from posted payroll expense (GL), which is': 'يُعرض بشكل منفصل عن مصروف الرواتب المرحّل (دفتر الأستاذ) البالغ', 'for this period.': 'لهذه الفترة.',
    'Active employees': 'الموظفون النشطون', 'in selection': 'ضمن التحديد', 'Draft payroll – gross (not posted)': 'رواتب المسودة – الإجمالي (غير مرحّل)', 'Draft payroll – net pay': 'رواتب المسودة – الصافي', 'Posted payroll expense (GL)': 'مصروف الرواتب المرحّل (دفتر الأستاذ)', 'Accrual journals in period': 'قيود الاستحقاق في الفترة', 'Accrual journals': 'قيود الاستحقاق', 'Submitted slips – gross': 'القسائم المقدّمة – الإجمالي',
    'Present': 'حاضر', 'Absent': 'غائب', 'Weekly off / holiday': 'عطلة أسبوعية / رسمية', 'of': 'من', 'eligible': 'مؤهل', 'pending punch': 'بانتظار البصمة', 'No days in range up to today': 'لا توجد أيام في النطاق حتى اليوم', 'On leave today': 'في إجازة اليوم', 'Approved, submitted': 'معتمدة ومقدّمة', 'Pending leave requests': 'طلبات الإجازة المعلّقة', 'Status Open in period': 'الحالة مفتوحة في الفترة',
    'Payroll': 'الرواتب', 'GL expense': 'مصروف دفتر الأستاذ', 'Attendance': 'الحضور', 'Employees on leave': 'الموظفون في إجازة', 'Pending leaves': 'الإجازات المعلّقة', 'Trends': 'الاتجاهات',
    'Gross payroll by cost center (payroll entry allocation)': 'إجمالي الرواتب حسب مركز التكلفة (توزيع قيد الرواتب)', 'Click a bar to list the salary slips': 'انقر على عمود لعرض قسائم الراتب', 'Payroll status': 'حالة الرواتب', 'Gross payroll – last 12 months': 'إجمالي الرواتب – آخر 12 شهراً',
    'Section A shows where payroll entries allocate cost (Payroll Entry cost center). Section B shows where the accounting actually booked expense (GL Entry cost center). They are different sources and are never mixed.': 'القسم أ يعرض مكان توزيع التكلفة في قيود الرواتب (مركز تكلفة قيد الرواتب). القسم ب يعرض مكان تسجيل المصروف فعلياً محاسبياً (مركز تكلفة قيد الأستاذ). هما مصدران مختلفان ولا يتم دمجهما أبداً.',
    'A. Payroll-entry allocation by cost center': 'أ. توزيع قيود الرواتب حسب مركز التكلفة', 'Payroll Entries': 'قيود الرواتب', 'Draft gross (not posted)': 'إجمالي المسودة (غير مرحّل)', 'Submitted gross': 'الإجمالي المقدّم', 'Click a row to list its salary slips': 'انقر على صف لعرض قسائم الراتب',
    'B. Actual GL expense by GL cost center (posted payroll accrual journals)': 'ب. المصروف الفعلي في دفتر الأستاذ حسب مركز التكلفة (قيود استحقاق الرواتب المرحّلة)', 'Branch, Department and Employee filters cannot be applied to GL entries; Company, dates and Cost Center are applied.': 'لا يمكن تطبيق مرشحات الفرع والقسم والموظف على قيود دفتر الأستاذ؛ يتم تطبيق الشركة والتواريخ ومركز التكلفة.', 'GL Cost Center': 'مركز التكلفة في الأستاذ', 'Debits': 'المدين', 'Credits': 'الدائن', 'Net expense': 'صافي المصروف', 'No payroll accrual journals posted in this period.': 'لا توجد قيود استحقاق رواتب مرحّلة في هذه الفترة.',
    'C. Allocation vs GL (side by side – not netted)': 'ج. التوزيع مقابل الأستاذ (جنباً إلى جنب – دون تسوية)', 'Payroll-entry gross': 'إجمالي قيود الرواتب', 'GL posted expense': 'المصروف المرحّل في الأستاذ', 'Submitted − GL': 'المقدّم − الأستاذ', 'Payroll entries': 'قيود الرواتب', 'Payroll Entry': 'قيد الرواتب', 'Period': 'الفترة', 'Slips created': 'القسائم المنشأة', 'Slips submitted': 'القسائم المقدّمة', 'Slips not submitted': 'قسائم غير مقدّمة', 'No payroll entry': 'بدون قيد رواتب',
    'Draft slips are not accounting expense until submitted and posted.': 'قسائم المسودة ليست مصروفاً محاسبياً حتى يتم تقديمها وترحيلها.', 'Slips': 'القسائم', 'Salary Slip': 'قسيمة الراتب', 'Employee': 'الموظف', 'Status': 'الحالة', 'Payment Days': 'أيام الدفع', 'Cost Center (payroll entry)': 'مركز التكلفة (قيد الرواتب)',
    'Total earnings (components)': 'إجمالي المستحقات (المكونات)', 'Total deductions (components)': 'إجمالي الاستقطاعات (المكونات)', 'Gross per salary slips': 'الإجمالي حسب قسائم الراتب', 'Reconciliation difference': 'فرق المطابقة', 'Components reconcile to slip gross': 'المكونات تطابق إجمالي القسائم', 'Check statistical / non-counted components': 'راجع المكونات الإحصائية / غير المحتسبة', 'Top earnings': 'أعلى المستحقات', 'Top deductions': 'أعلى الاستقطاعات',
    'Earnings by component': 'المستحقات حسب المكوّن', 'Deductions by component': 'الاستقطاعات حسب المكوّن', 'Click a row to see which employees receive it': 'انقر على صف لمعرفة الموظفين الذين يحصلون عليه', 'Salary Component': 'مكوّن الراتب', 'Lines': 'البنود', 'Amount': 'المبلغ', 'Flags': 'علامات', 'Statistical': 'إحصائي', 'Not in total': 'غير مشمول بالإجمالي',
    'Saudi nationals': 'السعوديون', 'Nationality conflicts': 'تعارضات الجنسية', 'primary ≠ secondary field': 'الحقل الأساسي ≠ الثانوي', 'Active': 'نشط', 'Inactive': 'غير نشط', 'Left': 'غادر', 'ID': 'الرقم', 'Designation': 'المسمى الوظيفي', 'Nationality': 'الجنسية', 'Job Location': 'موقع العمل', 'conflict': 'تعارض',
    'The selected period has no days up to today.': 'الفترة المحددة لا تحتوي أياماً حتى اليوم.', 'Range limited to the last 93 days to keep Employee Checkin queries small.': 'تم تقييد النطاق بآخر 93 يوماً للحفاظ على خفة استعلامات بصمات الموظفين.', 'Punch results were capped at 60,000 rows – narrow the date range.': 'تم تحديد نتائج البصمات بـ 60,000 سجل – ضيّق النطاق الزمني.', 'Future dates are never marked absent; the calculation stops at today.': 'لا يتم احتساب التواريخ المستقبلية غياباً؛ يتوقف الحساب عند اليوم.',
    'Eligible employees': 'الموظفون المؤهلون', 'excl. Back Office & WFH': 'بدون المكتب الخلفي والعمل من المنزل', 'On approved leave': 'في إجازة معتمدة', 'Back Office – excluded': 'المكتب الخلفي – مستثنى', 'Work from home – excluded': 'العمل من المنزل – مستثنى', 'employees': 'موظفين',
    'Employee summary': 'ملخص الموظفين', 'Daily punch details': 'تفاصيل البصمات اليومية', 'Nationality conflicts': 'تعارضات الجنسية', 'Rules & limits': 'القواعد والحدود', 'Count any punch': 'احتساب أي بصمة', 'Count IN punches only': 'احتساب بصمات الدخول فقط', 'Daily trend': 'الاتجاه اليومي', 'Approved leave': 'إجازة معتمدة',
    'Working days': 'أيام العمل', 'Leave': 'إجازة', 'WFH (excluded)': 'العمل من المنزل (مستثنى)', 'Attendance %': 'نسبة الحضور %', 'Excluded / off': 'مستثنى / عطلة', 'All punches': 'جميع البصمات', 'First punch': 'أول بصمة', 'Last punch': 'آخر بصمة', 'Punches': 'البصمات', 'Time': 'الوقت', 'Type': 'النوع', 'Device': 'الجهاز',
    'Primary nationality is custom_nationality. Employees are flagged when custom_employee_nationality names a different country. Saturday off is applied from the primary field only.': 'الجنسية الأساسية هي custom_nationality. يتم وسم الموظف عندما يذكر الحقل custom_employee_nationality بلداً مختلفاً. تُطبّق عطلة السبت من الحقل الأساسي فقط.', 'Nationality (primary)': 'الجنسية (الأساسية)', 'Nationality (secondary)': 'الجنسية (الثانوية)', 'Weekly off used': 'العطلة الأسبوعية المطبّقة', 'Friday': 'الجمعة', 'Friday + Saturday': 'الجمعة + السبت', 'Weekly off': 'العطلة الأسبوعية', 'No nationality conflicts in the selected employees.': 'لا توجد تعارضات جنسية بين الموظفين المحددين.',
    'Rules applied': 'القواعد المطبّقة', 'Source: Employee Checkin only – the Attendance DocType is not used.': 'المصدر: بصمات الموظفين (Employee Checkin) فقط – لا يتم استخدام مستند الحضور.', 'Present = at least one punch on an eligible working day; Absent = none.': 'حاضر = بصمة واحدة على الأقل في يوم عمل مؤهل؛ غائب = لا توجد بصمة.', 'Friday is a holiday for everyone; Saturday too for Saudi nationals (primary nationality field).': 'الجمعة عطلة للجميع؛ والسبت أيضاً للسعوديين (حقل الجنسية الأساسي).', 'Back Office employees are excluded; Work At Home / Work From Home employees are excluded from absence and counted separately.': 'يُستثنى موظفو المكتب الخلفي؛ ويُستثنى موظفو العمل من المنزل من احتساب الغياب ويُحسبون بشكل منفصل.', 'Approved, submitted leave is never counted as absence; a half-day leave without a punch counts ½ leave and ½ absent.': 'الإجازة المعتمدة والمقدّمة لا تُحتسب غياباً؛ وإجازة نصف اليوم دون بصمة تُحتسب ½ إجازة و½ غياب.', 'Future dates are never absent; today with no punch yet is shown as pending.': 'التواريخ المستقبلية لا تُحتسب غياباً؛ واليوم الحالي دون بصمة يظهر كمعلّق.', 'Holiday Lists are also honoured when they contain the date (they currently stop at 2024).': 'تُراعى قوائم العطل أيضاً عند احتوائها على التاريخ (وهي حالياً تنتهي عند 2024).',
    'Back Office': 'المكتب الخلفي', 'Back Office (excluded)': 'المكتب الخلفي (مستثنى)', 'Present (': 'حاضر (', 'Half-day leave (½ absent)': 'إجازة نصف يوم (½ غياب)', 'Holiday / weekly off': 'عطلة رسمية / أسبوعية', 'Work from home (excluded)': 'عمل من المنزل (مستثنى)', 'Future date': 'تاريخ مستقبلي', 'Today – no punch yet': 'اليوم – لا توجد بصمة بعد', 'Not employed': 'غير موظف', 'Off': 'عطلة', 'Click a day to see punch details.': 'انقر على يوم لعرض تفاصيل البصمات.', 'No punches recorded.': 'لا توجد بصمات مسجّلة.',
    'applications have status Approved but are not submitted; they are excluded from approved leave.': 'طلبات حالتها معتمدة لكنها غير مقدّمة؛ وهي مستثناة من الإجازات المعتمدة.', 'Approved leaves': 'الإجازات المعتمدة', 'submitted applications': 'طلبات مقدّمة', 'Leave days taken': 'أيام الإجازة المستخدمة', 'de-duplicated, holidays & half-days applied': 'بعد إزالة التداخل وتطبيق العطل ونصف اليوم', 'Rejected leaves': 'الإجازات المرفوضة', 'Employees currently on leave': 'الموظفون في إجازة حالياً',
    'Approved': 'معتمدة', 'Pending': 'معلّقة', 'Rejected': 'مرفوضة', 'On leave now': 'في إجازة الآن', 'Leave balances': 'أرصدة الإجازات', 'Leave type breakdown': 'تفصيل أنواع الإجازات', 'Leave calendar': 'تقويم الإجازات', 'Expected return': 'العودة المتوقعة', 'Nobody is on approved leave today.': 'لا أحد في إجازة معتمدة اليوم.',
    "Balance = total allocated (Leave Allocation, submitted) − approved leave days taken within the allocation period, computed with the same holiday / half-day rules. Encashment and expiry adjustments in ERPNext's leave ledger are not included.": 'الرصيد = إجمالي المخصص (تخصيص الإجازات المقدّم) − أيام الإجازة المعتمدة المستخدمة خلال فترة التخصيص، بنفس قواعد العطل ونصف اليوم. لا تشمل تسويات الصرف والانتهاء في سجل إجازات ERPNext.',
    'Approved leave days by type': 'أيام الإجازة المعتمدة حسب النوع', 'Applications by type': 'الطلبات حسب النوع', 'Leave Type': 'نوع الإجازة', 'Approved apps': 'الطلبات المعتمدة', 'Days taken': 'الأيام المستخدمة', 'Click a day to see who is on leave.': 'انقر على يوم لمعرفة من هو في إجازة.', 'on leave': 'في إجازة', 'Nobody on leave.': 'لا أحد في إجازة.', 'From': 'من', 'To': 'إلى', 'Days': 'الأيام', 'Workflow': 'سير العمل', 'Application': 'الطلب', 'Unsubmitted': 'غير مقدّم', 'Allocated': 'المخصص', 'Taken': 'المستخدم', 'Balance': 'الرصيد', 'Leave applications': 'طلبات الإجازة', 'Leave history': 'سجل الإجازات',
    'Latest month gross': 'إجمالي آخر شهر', 'Month-on-month': 'التغير الشهري', 'vs previous month': 'مقارنة بالشهر السابق', '12-month gross': 'إجمالي 12 شهراً', 'Average monthly gross': 'متوسط الإجمالي الشهري', '12-month posted GL expense': 'المصروف المرحّل خلال 12 شهراً', 'Gross payroll by status': 'إجمالي الرواتب حسب الحالة', 'Gross vs Net vs Deductions': 'الإجمالي مقابل الصافي والاستقطاعات', 'Submitted gross vs posted GL expense': 'الإجمالي المقدّم مقابل المصروف المرحّل', 'Submitted gross': 'الإجمالي المقدّم', 'Payslips per month': 'عدد القسائم شهرياً', 'Month': 'الشهر',
    'Checks run': 'الفحوصات المنفذة', 'Open findings': 'الملاحظات المفتوحة', 'High severity': 'خطورة عالية', 'Medium severity': 'خطورة متوسطة', 'Severity': 'الخطورة', 'Control check': 'فحص الرقابة', 'Findings': 'الملاحظات', 'High': 'عالية', 'Medium': 'متوسطة', 'Low': 'منخفضة', 'OK': 'سليم', 'Measure': 'المقياس', 'Difference': 'الفرق',
    'Draft / not posted salary slips': 'قسائم رواتب مسودة / غير مرحّلة', 'Draft slips exist for the period; they are not accounting expense until submitted and posted.': 'توجد قسائم مسودة للفترة؛ وهي ليست مصروفاً محاسبياً حتى تُقدَّم وتُرحَّل.', 'Payroll entries with unsubmitted slips': 'قيود رواتب بقسائم غير مقدّمة', 'Payroll Entry shows fewer submitted than created slips.': 'قيد الرواتب يُظهر قسائم مقدّمة أقل من المنشأة.', 'Duplicate salary slips (same employee & period)': 'قسائم راتب مكررة (نفس الموظف والفترة)', 'More than one non-cancelled slip for the same employee and period.': 'أكثر من قسيمة غير ملغاة لنفس الموظف والفترة.', 'Salary slips without a payroll entry': 'قسائم راتب بدون قيد رواتب', 'Cost center allocation cannot be derived for these slips.': 'لا يمكن استنتاج مركز التكلفة لهذه القسائم.',
    'Slip cost center ≠ employee master cost center': 'مركز تكلفة القسيمة ≠ مركز تكلفة بطاقة الموظف', 'Payroll Entry cost center differs from Employee.payroll_cost_center.': 'مركز تكلفة قيد الرواتب يختلف عن مركز تكلفة الموظف.', 'Employee master CC': 'مركز تكلفة بطاقة الموظف', 'Salary slips for non-active employees': 'قسائم راتب لموظفين غير نشطين', 'Employee status is Left / Inactive but a slip exists in the period.': 'حالة الموظف غادر / غير نشط لكن توجد قسيمة في الفترة.',
    'Active employees without a slip in the period': 'موظفون نشطون بدون قسيمة في الفترة', 'Active employees (joined before period end) with no slip – verify whether they should be paid.': 'موظفون نشطون (التحقوا قبل نهاية الفترة) بدون قسيمة – تحقق مما إذا كان يجب دفع راتبهم.', 'No slips found in the period.': 'لا توجد قسائم في الفترة.', 'Submitted slips vs posted GL expense': 'القسائم المقدّمة مقابل المصروف المرحّل في الأستاذ', 'GL not readable: ': 'تعذرت قراءة الأستاذ: ',
    'Nationality conflicts (custom_nationality vs custom_employee_nationality)': 'تعارضات الجنسية (الحقل الأساسي مقابل الثانوي)', 'Primary field is used for the Saudi Saturday rule.': 'يُستخدم الحقل الأساسي لقاعدة عطلة السبت للسعوديين.', 'Active employees missing primary nationality': 'موظفون نشطون بدون جنسية أساسية', 'Saturday rule cannot be applied.': 'لا يمكن تطبيق قاعدة السبت.', 'Active employees without payroll cost center': 'موظفون نشطون بدون مركز تكلفة رواتب', 'Active employees without job location': 'موظفون نشطون بدون موقع عمل', 'Back Office / WFH exclusion cannot be applied.': 'لا يمكن تطبيق استثناء المكتب الخلفي / العمل من المنزل.',
    'Leave approved but not submitted': 'إجازات معتمدة وغير مقدّمة', 'Excluded from approved leave calculations.': 'مستثناة من احتساب الإجازات المعتمدة.', 'Pending leave older than 30 days': 'إجازات معلّقة منذ أكثر من 30 يوماً', 'Overlapping approved leaves (same employee)': 'إجازات معتمدة متداخلة (نفس الموظف)', 'Overlaps are de-duplicated in day counts.': 'يتم إزالة التداخل عند احتساب الأيام.', 'Stored leave days ≠ recalculated days': 'أيام الإجازة المخزّنة ≠ الأيام المعاد احتسابها', 'total_leave_days differs from the day count after Friday/Saturday/holiday and half-day rules.': 'إجمالي أيام الإجازة يختلف عن الاحتساب بعد قواعد الجمعة والسبت والعطل ونصف اليوم.', 'Recalculated': 'المعاد احتسابه',
    'Holiday Lists do not cover the selected period': 'قوائم العطل لا تغطي الفترة المحددة', 'Lists end before the period; the Friday/Saturday rules are applied instead of listed holidays.': 'القوائم تنتهي قبل الفترة؛ وتُطبَّق قواعد الجمعة/السبت بدلاً من العطل المدرجة.', 'Holiday List': 'قائمة العطل',
    'Data limitations (shown, not hidden)': 'قيود البيانات (معروضة وغير مخفية)', 'Posted payroll expense is read from GL Entry rows of the standard HRMS payroll accrual journals (matched by their remark) on Expense accounts. Manually posted payroll journals with a different remark are not recognised.': 'يُقرأ مصروف الرواتب المرحّل من قيود الأستاذ لقيود استحقاق الرواتب القياسية (بحسب الملاحظة) على حسابات المصروفات. القيود اليدوية بملاحظة مختلفة لا يتم التعرف عليها.', 'Branch, Department and Employee filters cannot be applied to GL entries (they carry no such fields).': 'لا يمكن تطبيق مرشحات الفرع والقسم والموظف على قيود الأستاذ (لا تحتوي هذه الحقول).', 'Leave balances are computed from submitted allocations minus approved applications; ERPNext leave-ledger encashment / expiry entries are not readable here.': 'تُحسب الأرصدة من التخصيصات المقدّمة مطروحاً منها الطلبات المعتمدة؛ ولا يمكن قراءة قيود الصرف / الانتهاء في سجل إجازات ERPNext هنا.', 'Holiday Lists in this site stop at 2024, so 2025+ public holidays are not known; only Friday/Saturday rules apply.': 'قوائم العطل في هذا الموقع تنتهي عند 2024، لذا العطل الرسمية من 2025 غير معروفة؛ وتُطبَّق قواعد الجمعة/السبت فقط.', 'Employee Checkin is queried only for the selected range (max 93 days), never the full history.': 'يتم استعلام بصمات الموظفين للنطاق المحدد فقط (بحد أقصى 93 يوماً) وليس كامل السجل.', 'Salary figures appear only if the logged-in user has Salary Slip permission.': 'تظهر أرقام الرواتب فقط إذا كان للمستخدم صلاحية قسائم الراتب.',
    'Total gross payroll': 'إجمالي الرواتب (الإجمالي)', 'Total net pay': 'إجمالي صافي الرواتب', 'Cost per head (gross)': 'تكلفة الموظف الواحد (إجمالي)', 'Month-on-month (gross)': 'التغير الشهري (إجمالي)', 'Draft + submitted salary slips': 'قسائم الراتب (مسودة + مقدمة)', 'employees paid': 'موظف مصروف له', 'Total deductions': 'إجمالي الاستقطاعات', 'vs previous month': 'مقارنة بالشهر السابق', 'No previous month data': 'لا توجد بيانات للشهر السابق', 'Totals include every non-cancelled Salary Slip overlapping the selected dates. To reconcile a month, set From / To to its first and last day.': 'تشمل الإجماليات كل قسائم الراتب غير الملغاة المتداخلة مع التواريخ المحددة. للمطابقة الشهرية اضبط من/إلى على أول وآخر يوم في الشهر.', 'No access to': 'لا توجد صلاحية للوصول إلى', 'Request timed out': 'انتهت مهلة الطلب',
    'Profile': 'الملف', 'Attendance calendar': 'تقويم الحضور', 'Employee not found or not permitted.': 'الموظف غير موجود أو غير مصرّح به.', 'Back Office employee — excluded from punch-based attendance.': 'موظف مكتب خلفي — مستثنى من الحضور المبني على البصمات.', 'Work from home employee — excluded from punch-based absence.': 'موظف عمل من المنزل — مستثنى من الغياب المبني على البصمات.', 'Nationality conflict': 'تعارض في الجنسية', 'No salary slips (or no permission).': 'لا توجد قسائم راتب (أو لا توجد صلاحية).',
    'Employee ID': 'رقم الموظف', 'Payroll Cost Center': 'مركز تكلفة الرواتب', 'Employment Type': 'نوع التوظيف', 'Date of Joining': 'تاريخ الالتحاق', 'Relieving Date': 'تاريخ المغادرة', 'Reports To': 'يتبع إلى', 'Vacation Status': 'حالة الإجازة', 'Name': 'الاسم', 'Branch / Department / Search not applied': 'لا تُطبَّق مرشحات الفرع / القسم / البحث', 'Month-on-month ': 'التغير الشهري'
    });

    /* ============================================================ overview (v2: six KPIs, actions pending, charts) */
    RT.overview = async function () {
      var F = S.f, td = today(), latest = F.to < td ? F.to : td;
      var emps = await getEmployees();
      var r = await Promise.all([safe(getPayroll()), safe(getGL(F.from, F.to, true)), safe(attRaw(true)), safe(leaveNow()), safe(pendingCount()), safe(trendData())]);
      var pay = r[0], gl = r[1], att = r[2], lvn = r[3], pend = r[4], tr2 = r[5], h = '', k = [];
      var active = emps.filter(function (e) { return e.status === 'Active'; }).length;
      var sm = pay.ok ? sumSlips(pay.v.slips) : null, glNet = gl.ok ? gl.v.reduce(function (a, x) { return a + (+x.debit || 0) - (+x.credit || 0); }, 0) : null;
      [pay, gl, att, lvn, pend, tr2].forEach(function (x, i) { if (!x.ok) { h += failBox(x, ['Payroll', 'GL expense', 'Attendance', 'Employees on leave', 'Pending leaves', 'Trends'][i]); } });
      var emN = pay.ok ? new Set(pay.v.slips.map(function (s) { return s.employee; })).size : 0, mo = null;
      if (tr2.ok && tr2.v.months.length > 1) { var mc = tr2.v.months[tr2.v.months.length - 1], mp = tr2.v.months[tr2.v.months.length - 2]; mo = { cur: mc, prev: mp, pct: mp.gross > 0 ? (mc.gross - mp.gross) / mp.gross * 100 : null }; }
      k.push(kpi('Total gross payroll', sm ? sar(sm.gross) : '—', sm ? esc(n0(emN) + ' ' + t('employees paid') + (emN ? ' · ' + tr('per head ', 'للفرد ') + n0(sm.gross / emN) : '') + ' · ' + t('Total net pay') + ' ' + n0(sm.net)) : '', { go: 'register' }));
      k.push(kpi('Posted payroll expense (GL)', glNet == null ? '—' : sar(glNet), esc(t('Accrual journals in period') + (F.branch || F.dept || F.q ? ' · ' + t('Branch / Department / Search not applied') : '')), { tone: 'ok', go: 'cc' }));
      k.push(kpi('Draft payroll – gross (not posted)', sm ? sar(sm.dg) : '—', sm ? esc(n0(sm.dn) + ' ' + t('slips') + ' · ' + t('Net Pay') + ' ' + n0(sm.dnet)) : '', { tone: sm && sm.dn ? 'warn' : '', go: 'register|draft' }));
      k.push(kpi('Month-on-month (gross)', mo && mo.pct != null ? (mo.pct > 0 ? '+' : '') + mo.pct.toFixed(1) + '%' : '—', mo ? esc(mo.pct != null ? monthName(mo.cur.m, true) + ' ' + n0(mo.cur.gross) + ' · ' + monthName(mo.prev.m, true) + ' ' + n0(mo.prev.gross) : t('No previous month data')) : '', { tone: mo && mo.pct != null && mo.pct > 10 ? 'warn' : '', go: 'trends' }));
      if (att.ok && !att.v.empty) {
        var c = attCompute(att.v, S.ui.att.mode), dayOff = c.last.H > 0 && c.last.P + c.last.A + c.last.L === 0;
        k.push(kpi('Absent', n0(c.last.A), esc(latest + ' · ' + (dayOff ? t('Weekly off / holiday') : t('Present') + ' ' + n0(c.last.P) + ' ' + t('of') + ' ' + n0(c.elig) + ' ' + t('eligible')) + (c.last.T ? ' · ' + n0(c.last.T) + ' ' + t('pending punch') : '')), { tone: c.last.A ? 'bad' : 'ok', go: 'attendance|day' }));
      } else { k.push(kpi('Absent', '—', att.ok ? esc(t('No days in range up to today')) : '', { go: 'attendance' })); }
      k.push(kpi('Pending leave requests', pend.ok ? n0(pend.v) : '—', esc(t('On leave today') + ' ' + (lvn.ok ? n0(lvn.v.length) : '—') + ' · ' + n0(active) + ' ' + t('Active employees').toLowerCase()), { tone: 'warn', go: 'leaves|pending' }));
      h = '<div class="dms-grid dms-kpis dms-ov-kpis">' + k.join('') + '</div>' + h;
      if (sm && sm.dn) { h += note('<b>' + esc(t('Draft / Not posted payroll')) + ':</b> ' + n0(sm.dn) + ' ' + esc(t('slips')) + ' · ' + esc(t('Gross')) + ' ' + esc(sar(sm.dg)) + ' · ' + esc(t('Net Pay')) + ' ' + esc(sar(sm.dnet)) + '. ' + esc(t('Shown separately from posted payroll expense (GL), which is')) + ' ' + (glNet == null ? '—' : esc(sar(glNet))) + ' ' + esc(t('for this period.'))); }
      var g = pay.ok ? groupCC(pay.v.slips).sort(function (a, b) { return b.gross - a.gross; }).slice(0, 10) : [];
      var ch1 = pay.ok ? card('Gross payroll by cost center (payroll entry allocation)', hbars(g.map(function (x) { return { l: x.cc, v: x.gross, k: x.cc }; }), { act: 'cc', fmt: n0 }), 'Click a bar to list the salary slips') : '';
      var ch2 = sm ? card('Payroll status', donut([{ l: t('Draft / Not posted'), v: sm.dg, color: '#d98e04', act: 'status', k: 'draft' }, { l: t('Submitted'), v: sm.sg, color: '#0f9d6b', act: 'status', k: 'submitted' }], { fmt: n0 })) : '';
      h += '<div class="dms-main2"><!--ACT--><div class="dms-stackcol">' + ch1 + ch2 + '</div></div>';
      if (tr2.ok) { h += card('Gross payroll – last 12 months', plot(tr2.v.months.map(function (m) { return monthName(m.m, true); }), [{ name: t('Draft / Not posted'), color: '#d98e04', data: tr2.v.months.map(function (m) { return m.dg; }) }, { name: t('Submitted'), color: '#0f9d6b', data: tr2.v.months.map(function (m) { return m.sg; }) }], { fmt: n0 })); }
      return h + '<p class="dms-note">' + esc(t('Totals include every non-cancelled Salary Slip overlapping the selected dates. To reconcile a month, set From / To to its first and last day.')) + '</p>';
    };

    /* ============================================================ render cache: v1 renderers are async */
    var RH = {};
    function startRender(tab, soft) {
      var prev = RH[tab], me = { ver: S.ver, lang: LANG, html: soft && prev ? prev.html : null, err: null }, g = GEN;
      RH[tab] = me;
      Promise.resolve().then(function () { return RT[tab](); }).then(function (html) { if (RH[tab] !== me || g !== GEN) { return; } me.html = html; soon(); },
        function (e) { if (RH[tab] !== me || g !== GEN) { return; } me.err = e; if (G.console && !(e && e.status)) { console.error(APP.key, tab, e); } soon(); });
    }
    function rerender(tab) { if (RH[tab]) { RH[tab].ver = -1; } startRender(tab, true); soon(); }
    function reReg(html) { var re = /data-tbl="([^"]+)"/g, m; while ((m = re.exec(html))) { if (PSPEC[m[1]]) { K.regTable(PSPEC[m[1]]); } } }
    function content(tab, AM) {
      if (tab === 'actions') { return actionsTab(AM, tr('From the Controls & audit checks for the selected period and filters, plus open leave requests.', 'من فحوصات الضوابط والتدقيق للفترة والمرشحات المحددة، مع طلبات الإجازة المفتوحة.')); }
      var c = RH[tab];
      if (!c || c.ver !== S.ver || c.lang !== LANG) { startRender(tab, c && c.ver !== S.ver ? false : true); c = RH[tab]; }
      if (c.err) { var e = c.err; return K.alertBox('err', '<b>' + esc(t('Could not load data')) + '</b> — ' + esc(errText(errKind(e))) + ' (' + esc(e.message || '') + ') <button type="button" class="dms-linkbtn" data-act="pretry">' + esc(t('Retry')) + '</button>') + (tab === 'overview' ? actionsPanel(AM) : ''); }
      if (c.html == null) { return tab === 'overview' ? '<div class="dms-grid dms-kpis dms-ov-kpis" aria-busy="true">' + skel(6, 'dms-skel-kpi') + '</div><div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-skel dms-skel-panel"></div></div>' : skeleton(); }
      reReg(c.html);
      return tab === 'overview' ? c.html.replace('<!--ACT-->', actionsPanel(AM)) : c.html;
    }

    /* ============================================================ controls → actions pending */
    var ACTC = [['draft', 'high', 'Draft slips', 'مسودات رواتب'], ['pe', 'high', 'Unsubmitted payroll entries', 'قيود رواتب غير مكتملة'], ['dup', 'high', 'Duplicate slips', 'قسائم مكررة'], ['lpend', 'med', 'Leave requests to decide', 'طلبات إجازة للبت'],
      ['inact', 'med', 'Slips for non-active staff', 'قسائم لغير النشطين'], ['nope', 'med', 'Slips without payroll entry', 'قسائم بلا قيد رواتب'], ['lunsub', 'med', 'Approved leave not submitted', 'إجازات معتمدة غير مقدمة']];
    function actSpecs() { var by = {}; (D.ctl || []).forEach(function (c) { by[c.id] = c; }); return ACTC.map(function (x) { var c = by[x[0]]; return { id: 'c_' + x[0], client: true, short: tr(x[2], x[3]), title: c ? t(c.title) : tr(x[2], x[3]), why: c ? t(c.desc) : '' }; }); }
    function itemOf(chk, p) {
      return function (r) {
        var tone = p === 'high' ? 'bad' : 'warn';
        if (r.leave_type) { return { p: p, score: score(p, 0, ageOf(r.posting_date || r.from_date)), dt: 'Leave Application', name: r.name, title: r.employee_name || r.employee, desc: r.leave_type + ' · ' + r.from_date + ' → ' + r.to_date + ' · ' + n1(r.total_leave_days) + ' ' + t('Days'), who: r.department || null, due: agoTxt(r.posting_date || r.from_date, 'Waiting', 'منذ'), tone: tone }; }
        if (r.salary_slips_created != null) { return { p: p, score: score(p, 0, ageOf(r.end_date)), dt: 'Payroll Entry', name: r.name, title: r.name, desc: (r.cost_center || '') + ' · ' + t('Slips submitted') + ' ' + r.salary_slips_submitted + '/' + r.salary_slips_created, who: r.cost_center || null, due: agoTxt(r.end_date, 'Period ended', 'انتهت الفترة منذ'), tone: tone }; }
        return { p: p, score: score(p, r.gross_pay, ageOf(r.end_date)), dt: 'Salary Slip', name: r.name, title: r.employee_name || r.employee, desc: r.name + ' · ' + r.start_date + ' → ' + r.end_date + ' · ' + moneyFull(r.gross_pay), who: r.cc || r.department || null, due: r.end_date > TODAY ? tr('Current period', 'الفترة الحالية') : agoTxt(r.end_date, 'Period ended', 'انتهت الفترة منذ'), tone: tone };
      };
    }
    function actClient() {
      if (D.ctlErr) { return 'ERR:' + D.ctlErr; }
      if (!D.ctl) { return null; }
      var by = {}, o = {}; D.ctl.forEach(function (c) { by[c.id] = c; });
      ACTC.forEach(function (x) { var c = by[x[0]]; o['c_' + x[0]] = c ? { rows: c.rows, item: itemOf(c, x[1]) } : 'ERR:tech'; });
      return o;
    }
    function drill(id) {
      if (id.indexOf('pcm') === 0 && MOD) { return MOD; }
      if (id.indexOf('cli:c_') === 0 && D.ctl) {
        var c = D.ctl.filter(function (x) { return x.id === id.slice(6); })[0]; if (!c) { return null; }
        return { title: t(c.title), sub: t(c.desc), spec: tspec('drill', c.cols, c.rows, { onRow: c.onRow, size: 15, name: c.id }) };
      }
      return null;
    }

    /* ============================================================ boot, load, banner */
    function boot() {
      F.from = addMonths(monthStart(TODAY), -1); F.to = TODAY;
      return Promise.all([list('Company', ['name', 'default_currency'], [], { order: 'name asc', len: 200 }), list('Cost Center', ['name', 'company'], [['is_group', '=', 0], ['disabled', '=', 0]], { order: 'name asc', len: 3000 }),
        list('Branch', ['name'], [], { order: 'name asc', len: 500 }), list('Department', ['name', 'company'], [['is_group', '=', 0]], { order: 'name asc', len: 3000 })]).then(function (r) {
        OPT.companies = r[0].map(function (c) { return { name: c.name, cur: c.default_currency }; }); OPT.ccs = r[1]; OPT.branches = r[2].map(function (x) { return x.name; }); OPT.depts = r[3];
        SYSCOS = OPT.companies.filter(function (c) { return !c.cur || c.cur === CUR; }).map(function (c) { return c.name; });
      }, function () { /* options stay empty; data sources report their own errors */ });
    }
    function load() {
      S.f = { company: F.company || '', from: PERIOD[0], to: PERIOD[1], cc: F.cc || '', branch: F.branch || '', dept: F.dept || '', q: String(F.q || '').trim() };
      cache.clear(); EMP = {}; HOL = {}; S.ver++; RH = {}; MODN = 0;
      if (!S.f.from || !S.f.to || S.f.from > S.f.to) { D.ctl = []; return; }
      run('ctl', function () { return controlChecks(); });
    }
    function banner() {
      var ex = excludedCos();
      return ex.length ? K.alertBox('info', esc(tr('Shown in ' + CUR + '. Not included (other currency): ', 'المعروض بعملة ' + CUR + '. غير مشمولة (عملة أخرى): ') + ex.map(function (c) { return c.name + ' (' + c.cur + ')'; }).join(', ') + '. ' + tr('Choose one of them in Filters to see it in its own currency.', 'اخترها من المرشحات لعرضها بعملتها.'))) : '';
    }

    /* ============================================================ events */
    function goTo(spec) {
      var p = spec.split('|'), tb = p[0], sub = p[1];
      if (tb === 'register' && sub) { S.ui.reg.st = sub; }
      if (tb === 'attendance' && sub) { S.ui.att.sub = sub; S.ui.att.dv = 'A'; }
      if (tb === 'leaves' && sub) { S.ui.lv.sub = sub; }
      if (RH[tb]) { RH[tb].ver = -1; } goTab(tb, false, true);
    }
    function guard(p) { Promise.resolve(p).catch(function (e) { showErr(e && e.message ? e.message : String(e)); }); return true; }
    function onAct(a, v, n, id) {
      var k = n && n.getAttribute ? n.getAttribute('data-k') : null;
      if (a === 'kpi' && v && v.indexOf('go:') === 0) { goTo(v.slice(3)); return true; }
      if (a === 'kpi' && v && v.indexOf('pa:') === 0) {
        var p = v.slice(3), i = p.indexOf(':'), act = p.slice(0, i), key = p.slice(i + 1);
        if (act === 'cc') { drillCC(key); } else if (act === 'status') { goTo('register|' + key); } else if (act === 'comp') { var cp = key.split('|'); return guard(drillComp(cp[0], cp.slice(1).join('|'))); }
        return true;
      }
      if (a === 'pseg') { var s = v.split('|'); if (s[0] === 'em') { S.ui.em.tab = s[1]; return guard(emTab()); } S.ui[s[0]][s[1]] = s[2]; if (s[0] === 'att' && s[1] === 'sub') { S.ui.att.dv = S.ui.att.dv || 'A'; } rerender(tab); return true; }
      if (a === 'prow') { var rr = ROWREF[id]; if (rr) { var row = rr.rows[+v]; if (row) { guard(rr.fn(row)); } } return true; }
      if (a === 'pemp') { return guard(openEmp(v)); }
      if (a === 'pretry') { cache.clear(); rerender(tab); return true; }
      if (k == null) { return false; }
      if (a === 'calnav') { S.cal.ym = addMonths(S.cal.ym + '-01', +k).slice(0, 7); return guard(calHtml().then(function (h) { var b = $('#calBox'); if (b) { b.innerHTML = h; } keepFocus('.dms-modal [data-act="calnav"][data-k="' + k + '"]'); })); }
      if (a === 'calday') { return guard(calDay(k).then(function (h) { var b = $('#calDetail'); if (b) { b.innerHTML = h; } keepFocus(); })); }
      if (a === 'lcalnav') { S.ui.lv.ym = addMonths(S.ui.lv.ym + '-01', +k).slice(0, 7); rerender('leaves'); return true; }
      if (a === 'lcalday') {
        var l = LCAL[k] || [], box = $('#lcalDetail');
        if (box) { box.innerHTML = '<h4 class="dms-h4">' + esc(k) + '</h4>' + (l.length ? '<table class="pc-mini"><tbody>' + l.map(function (x) { return '<tr><td>' + empLink(x.emp) + '</td><td>' + esc(x.type) + '</td><td class="dms-td-n">' + (x.f < 1 ? '½' : '1') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="dms-empty">' + esc(t('Nobody on leave.')) + '</div>'); }
        return true;
      }
      if (a === 'chk') { var c = CHK[+k]; openModal(t(c.title), tbl('chk' + k, c.cols, c.rows, { name: c.id, size: 15, resetPage: true, onRow: c.onRow })); return true; }
      return false;
    }
    function onInput(n) {
      var sel = n.getAttribute && n.getAttribute('data-sel'); if (!sel) { return false; }
      var p = sel.split('|'); if (S.ui[p[0]][p[1]] === n.value) { return true; }
      S.ui[p[0]][p[1]] = n.value; rerender(tab); return true;
    }

    return { boot: boot, load: load, banner: banner, content: content, drill: drill, onAct: onAct, onInput: onInput, actSpecs: actSpecs, actClient: actClient };
  })();

  start();
})();

/* ==== DM theme sync (same as tools/erp/shell/dark_theme.py output; maintained here since this block left the generated shell) ==== */
;(function () {
  var r = typeof root_element !== 'undefined' ? root_element : null, h = r && r.host;
  if (!h || h.__dmsTheme) return; h.__dmsTheme = 1;
  var s = function () { h.setAttribute('data-dms-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'); };
  s(); new MutationObserver(s).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
