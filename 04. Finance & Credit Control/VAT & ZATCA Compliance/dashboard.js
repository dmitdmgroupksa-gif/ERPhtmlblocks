/* ===== DM Group KSA — VAT & ZATCA Compliance — SCRIPT field · v2 =====
   Read-only. Standard Frappe endpoints only, always as the logged-in user: frappe.client.get_list,
   frappe.desk.query_report.run ("DM KSA VAT Report") and erpnext.accounts.utils.get_balance_on (withholding tax).
   No Server Script, no custom API. Built on the DM dashboard standard; the shared runtime between the "DMS kit"
   markers is generated from tools/erp/kit/dms-kit.js (edit the kit and run build_kit.py, not the copy).
   The VAT engine (per-company report + document cross-check, ZATCA counts, exception presets, rate scan) and the
   withholding-tax ledger model are carried over unchanged from v1; the views are rebuilt on the kit. */
(function () {
  'use strict';
  var APP = {
    key: '__dmsVatZatca',
    period: 'month',
    tabs: [
      { id: 'overview', en: 'Overview', ar: 'نظرة عامة' }, { id: 'vat', en: 'VAT returns', ar: 'الإقرارات الضريبية' },
      { id: 'zatca', en: 'ZATCA status', ar: 'حالة زاتكا' }, { id: 'register', en: 'Invoice register', ar: 'سجل الفواتير' },
      { id: 'compliance', en: 'Compliance', ar: 'الامتثال والاستثناءات' }, { id: 'wht', en: 'Withholding tax', ar: 'ضريبة الاستقطاع' },
      { id: 'actions', en: 'Actions pending', ar: 'الإجراءات المعلقة' }
    ],
    filters: [
      { k: 'company', en: 'Company', ar: 'الشركة', none: ['All companies (system currency)', 'كل الشركات (عملة النظام)'], options: function () { return companyOpts(); } },
      { k: 'group', en: 'VAT group (tax ID)', ar: 'المجموعة الضريبية (الرقم الضريبي)', none: ['All VAT groups', 'كل المجموعات الضريبية'], options: function () { return groupOpts(); } }
    ],
    sources: ['zatca', 'exc', 'act'],
    dtLabels: { 'Sales Invoice': ['Sales invoice', 'فاتورة مبيعات'], 'Company': ['VAT return', 'إقرار ضريبي'] },
    title: function () { return tr('VAT & ZATCA Compliance', 'ضريبة القيمة المضافة وزاتكا'); },
    stamp: function () { return tr('Read-only · ', 'للقراءة فقط · ') + scopeText(); },
    filterNote: function () { return tr('Without a company, the view covers companies in the system currency so amounts are never added across currencies. A VAT group narrows it to the companies sharing that tax ID. A company choice overrides the group.', 'بدون اختيار شركة يشمل العرض شركات عملة النظام فقط فلا تُجمع مبالغ بعملات مختلفة. المجموعة الضريبية تحصره في الشركات التي تشترك في الرقم الضريبي. اختيار الشركة يتقدم على المجموعة.'); },
    periodNote: function () { return tr('Posting-date basis, up to ' + MAX_DAYS + ' days. Backlog lists (pending, draft, rejected, unresolved credit notes) always cover all dates.', 'على أساس تاريخ الترحيل، حتى ' + MAX_DAYS + ' يومًا. قوائم المتأخرات (المعلقة والمسودة والمرفوضة والإشعارات الدائنة غير المحسومة) تشمل كل التواريخ دائمًا.'); },
    boot: function () { return boot(); },
    load: function () { loadAll(); },
    onPeriod: function () { reload(); },
    onTab: function (id) { if (id === 'wht') { WHT.ensure(); } },
    actSpecs: function () { return actSpecs(); },
    actions: function () { return actModel(actSpecs(), 'act', actClient()); },
    banner: function () { return banner(); },
    content: function (t, AM) { return content(t, AM); },
    drill: function (id) { return drill(id); },
    onAct: function (a, v, n) { return onAct(a, v, n); },
    onInput: function (n) { return onInputApp(n); }
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
    setToday(); PERIOD = curPeriod(); GEN++; D = {}; LOADED = STAMP;
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

  /* ================================================================== translations (v1, unchanged) */
  var I18N = {
    en: {
      err_truncated: 'The result reached the safe row limit, so the figure is not shown (it would be incomplete)',
      restricted: 'Access to this dashboard is limited to the roles: System Manager, CEO, Internal Controller, Accounts Manager and Dashboard Manager.',
      x_run: 'Run check', x_scanning: 'Scanning invoices...', x_rate_not_run: 'Run the check first (it scans the period in bounded pages).',
      x_rate_cap: 'Not calculated: the period has more invoices than the 3,000-invoice scan limit. Narrow the period or company.', x_rate_done: 'Scanned',
      x_unavail: 'Unavailable', arch_note: 'All figures are read live with your own ERPNext permissions; no backend scripts are used.',
      cov_note: 'DM KSA VAT Report coverage: results are checked against Sales and Purchase Invoices for each company. Each company is cross-checked against its Sales and Purchase Invoices; only companies that reconcile are included in the totals. Unverified companies are listed separately and never added to consolidated figures.',
      eyebrow: 'DM GROUP / FINANCE & COMPLIANCE', title: 'VAT & ZATCA Command Center',
      subtitle: 'Live VAT return figures and e-invoicing compliance across your companies',
      f_company: 'Company', f_group: 'VAT registration group', all_companies: 'All companies', all_groups: 'All groups',
      p_today: 'Today', p_week: 'This Week', p_month: 'This Month', p_lastmonth: 'Last Month', p_quarter: 'This Quarter', p_year: 'This Year', p_custom: 'Custom Period',
      f_from: 'Start date', f_to: 'End date', refresh: 'Refresh', refreshing: 'Refreshing...',
      last_refresh: 'Last successful refresh', never: 'Not refreshed yet', partial_fail: 'section(s) failed on the last attempt',
      c_owner: 'Owner', c_reason: 'Reason', noaccess: 'No access to', timeout: 'Request timed out', tab_overview: 'Overview', tab_vat: 'VAT Returns', tab_zatca: 'ZATCA Status', tab_register: 'Invoice Register', tab_compliance: 'Compliance & Exceptions',
      scope: 'Scope', period: 'Period', basis: 'Posting-date basis', all_permitted: 'All permitted companies', companies_n: 'companies', vat_group_scope: 'VAT group',
      loading: 'Loading...', retry: 'Retry', close: 'Close', details: 'Details', open_erp: 'Open in ERPNext', open_report: 'Open native report',
      sar: 'SAR', unavailable: 'Unavailable', unverified: 'Unverified', verified: 'Verified', partial: 'Partial',
      err_empty: 'The server returned an empty response.', err_section: 'This section could not be loaded', no_data: 'No records for the selected scope and period.',
      /* KPI */
      k_taxable: 'Taxable Sales', k_taxable_sub: 'Net of credit notes, DM KSA VAT Report', k_output: 'Output VAT', k_output_sub: 'Sales VAT, DM KSA VAT Report',
      k_input: 'Input VAT', k_input_sub: 'Purchases + expenses VAT, DM KSA VAT Report', k_net_pay: 'Net VAT Payable', k_net_ref: 'Net VAT Refundable', k_net: 'Net VAT Payable / Refundable',
      k_net_sub: 'Output VAT minus Input VAT', k_verified_of: 'companies verified', k_not_verified: 'Not verified - see VAT Returns tab',
      k_total: 'Total ZATCA Invoices', k_total_sub: 'Submitted invoices with a ZATCA status', k_cleared: 'Cleared', k_cleared_w: 'Cleared with Warnings',
      k_cleared_w_sub: 'Accepted, but warnings need review', k_pending: 'Pending Invoices', k_pending_sub: 'All-dates open backlog', k_rejected: 'Rejected / Failed',
      k_rejected_sub: 'Rejected + Overdue (no "Failed" status exists)', k_reported: 'Reported', k_reported_w: 'Reported with Warnings', k_overdue: 'Overdue', k_failed: 'Failed',
      k_failed_sub: 'Not a status of the installed integration', k_draft: 'Draft (submitted invoices)', k_draft_sub: 'Submitted but never transmitted', k_other: 'Other / Unknown Status',
      k_other_sub: 'Status value not in the integration list', k_nostatus: 'No ZATCA status', k_nostatus_sub: 'Typically invoices before e-invoicing', k_cancelled: 'Cancelled (excluded)',
      k_draft_unsub: 'Unsubmitted drafts (excluded)', invoices: 'invoices',
      /* sections */
      s_vat_kpis: 'VAT position', s_zatca_kpis: 'ZATCA e-invoicing', s_alerts: 'VAT and ZATCA compliance alerts', s_attention: 'Needs attention',
      s_out_in: 'Output vs Input VAT', s_out_in_sub: 'Per company, DM KSA VAT Report (verified companies only)', s_trend: 'Monthly VAT trend', s_trend_sub: 'Document-based (Sales / Purchase Invoices); the VAT return itself comes from the DM KSA VAT Report',
      s_status_dist: 'ZATCA status distribution', s_compare: 'Company comparison', s_groups: 'VAT registration groups', s_breakdown: 'Complete VAT report breakdown', s_recon: 'Reconciliation: report vs documents',
      s_unavail: 'Not attributable by company', s_status_cards: 'Status counts', s_monthly_status: 'Status by month', s_ageing: 'Pending invoice ageing', s_by_company: 'Status by company',
      s_timestamps: 'Reporting / clearance timestamps', s_warnings: 'Warning details', s_rejected_list: 'Rejected & overdue invoices', s_pending_list: 'Oldest pending invoices', s_meanings: 'What the statuses mean',
      s_exceptions: 'Exceptions', s_filing: 'VAT filing and payment verification', s_tax_recon: 'Tax reconciliation issues', s_register: 'Sales invoices',
      /* alerts */
      al_none: 'No active alerts for this scope.', al_unrecon: 'VAT report not reconciled for', al_unrecon_sub: 'The KSA VAT report does not agree with the documents, so these figures are excluded from the totals.',
      al_backlog: 'Pending ZATCA invoices older than 7 days', al_backlog_sub: 'Open backlog across all dates. Oldest posting date:', al_rejected: 'Rejected or overdue ZATCA invoices',
      al_warn_pct: 'Cleared with warnings is', al_warn_pct_sub: 'of ZATCA invoices in this period - "cleared with warnings" is accepted by ZATCA but is not error-free compliance.',
      al_filing: 'VAT filing and payment are not verified', al_filing_sub: 'No reliable ERP record proves a VAT return was filed or paid for this period.',
      al_report_bug: 'Native report "Sales Invoices and Zatca" ignores its company filter', al_report_bug_sub: 'This dashboard reads Sales Invoices directly by company; do not use that report for company-level counts.',
      al_missing: 'ZATCA invoices missing UUID / hash / QR data', al_cn: 'Credit notes with problems',
      /* VAT tab */
      v_scope_total: 'Sum of verified companies', v_compare_prev: 'Compare with previous period', v_prev: 'Previous period', v_delta: 'Change',
      v_taxable_base: 'Taxable base', v_adjust: 'Adjustments (returns)', v_vat: 'VAT', v_section: 'Section', v_line: 'Line', v_company: 'Company', v_net: 'Net VAT', v_status: 'Status',
      v_sales_vat: 'Output VAT (report)', v_si_vat: 'Sales Invoice VAT', v_diff: 'Difference', v_purch_vat: 'Input VAT, std purchases (report)', v_pi_vat: 'Purchase Invoice VAT',
      v_group_tax: 'VAT number', v_group_members: 'Companies', v_group_note: 'Group totals are an internal aggregation of per-company ledger figures. They are NOT an officially filed group VAT return. Companies sharing a VAT number are summed once each - no company is counted twice. Inter-company invoices are not eliminated.',
      v_view_companies: 'By company', v_view_groups: 'By VAT group', v_base_note: 'DM KSA VAT Report: the sales Amount is already net of credit notes; adjustments are shown separately for reference and are not deducted again.',
      v_native_report: 'Open DM KSA VAT Report', v_unavail_foreign: 'Foreign purchases (prepared report "VAT Report - Purchase Foreign")', v_unavail_expense: 'Expense VAT (prepared report "VAT Report - Expense")',
      v_unavail_why: 'These prepared reports have no company field, so they cannot be attributed to a company. The company-attributed lines from the KSA VAT report (reverse-charge imports, customs charges, expenses with VAT) are shown in the breakdown above.',
      v_intercompany: 'Inter-company invoices', v_no_verified: 'No company is reconciled for this scope, so no consolidated figure is shown.',
      v_sales_ok: 'Output VAT agrees with Sales Invoices', v_status_reconciled: 'Reconciled', v_status_mismatch: 'Mismatch', v_status_not_covered: 'Not covered by report', v_status_error: 'Report error', v_status_unverified: 'Unverified',
      v_tol: 'Tolerance', v_loading_company: 'Loading company...', v_net_unverified: 'Net VAT cannot be confirmed',
      /* ZATCA tab */
      z_total_inv: 'Total invoices', z_by_status: 'By status', z_all_dates: 'All dates', z_oldest: 'Oldest', z_ageing_note: 'Ageing covers all pending and stuck-draft invoices regardless of the selected period.',
      z_last_clear: 'Latest clearing time', z_last_report: 'Latest reporting time', z_cleared_nots: 'Cleared without clearing timestamp', z_reported_nots: 'Reported without reporting timestamp',
      z_load_warn: 'Load warning details', z_warn_none: 'No warnings in this scope and period.', z_warn_count: 'Invoices', z_status_note: 'Statuses are read from Sales Invoice "zatca_status" written by the installed ZATCA app.',
      m_cleared: 'Cleared: accepted by ZATCA clearance without warnings.', m_cleared_w: 'Cleared with warnings: accepted, but ZATCA returned warnings (for example buyer data issues). Review them - this is not error-free compliance.',
      m_reported: 'Reported: simplified invoice reported to ZATCA.', m_reported_w: 'Reported with warnings: reported, with warnings to review.', m_pending: 'Pending: submitted in ERP but not yet cleared/reported.',
      m_rejected: 'Rejected: ZATCA refused the invoice; it must be corrected and re-sent.', m_overdue: 'Overdue: the transmission deadline has passed without acceptance.', m_draft: 'Draft: set on a submitted invoice means it was never transmitted.',
      m_cancelled: 'Cancelled: invoice cancelled in ERP.', m_failed: 'Failed: the installed integration has no such status; failures appear as Rejected, Overdue or remain Pending.',
      st_Draft: 'Draft', st_Pending: 'Pending', st_Reported: 'Reported', st_Cleared: 'Cleared', 'st_Reported with warnings': 'Reported with warnings', 'st_Cleared with warnings': 'Cleared with warnings',
      st_Rejected: 'Rejected', st_Overdue: 'Overdue', st_Cancelled: 'Cancelled', st___none__: 'No ZATCA status', st_other: 'Other / Unknown',
      /* Register */
      r_search: 'Search invoice or customer', r_status: 'ZATCA status', r_all_status: 'All statuses', r_page_size: 'Rows per page', r_showing: 'Showing', r_of: 'of', r_page: 'Page', r_prev: 'Previous', r_next: 'Next',
      c_invoice: 'Invoice Number', c_customer: 'Customer', c_company: 'Company', c_date: 'Posting Date', c_type: 'Invoice Type', c_taxable: 'Taxable Amount', c_vat: 'VAT Amount', c_total: 'Grand Total',
      c_status: 'ZATCA Status', c_time: 'Reporting / Clearing Time', c_action: 'Action', c_warning: 'Warning', c_clearing: 'clearing', c_reporting: 'reporting', t_invoice: 'Tax Invoice', t_credit: 'Credit Note',
      /* Compliance */
      ex_pending_all: 'Pending ZATCA invoices', exd_pending_all: 'Submitted but not cleared or reported (all dates)', ex_stuck_draft: 'Submitted invoices still in Draft ZATCA status', exd_stuck_draft: 'Never transmitted (all dates)',
      ex_rejected_all: 'Rejected or overdue transmissions', exd_rejected_all: 'ZATCA refused or deadline missed (all dates)', ex_warnings: 'Cleared / reported with warnings', exd_warnings: 'Accepted but warnings need review',
      ex_missing_uuid: 'Missing ZATCA details (UUID)', exd_missing_uuid: 'Has a ZATCA status but no UUID/hash was recorded', ex_missing_buyer_vat: 'Missing buyer VAT number', exd_missing_buyer_vat: 'Customer VAT ID empty on the invoice',
      ex_cn_no_return: 'Credit notes without original invoice', exd_cn_no_return: 'Return invoice with no "Return Against"', ex_cn_unresolved: 'Credit notes not cleared / reported', exd_cn_unresolved: 'Pending, Draft, Rejected or Overdue (all dates)',
      ex_zero_vat: 'Taxable invoices with zero VAT', exd_zero_vat: 'Net amount but no VAT - verify zero-rating / exemption', ex_rate_mismatch: 'VAT not equal to 15% of net', exd_rate_mismatch: 'Possible wrong rate, discount or mixed-rate lines',
      ex_no_status: 'Submitted invoices with no ZATCA status', exd_no_status: 'Typically before e-invoicing; confirm none belong to the e-invoicing period',
      f_status: 'Filing status', f_payment: 'Payment status', f_not_verified: 'NOT VERIFIED', f_forms: 'VAT Summary Forms overlapping this period', f_form_name: 'Form', f_form_period: 'Period', f_form_state: 'State',
      f_none: 'No VAT Summary Form overlaps this period.', f_note: 'A VAT Summary Form in ERP does not prove that a return was filed with ZATCA, and no ERP record links a payment to a filing. This dashboard therefore never shows a filing or payment as completed.',
      x_category: 'Exception', x_count: 'Count', x_amount: 'Amount', x_view: 'View documents', x_all_dates_tag: 'all dates', x_ok: 'None found', x_failed: 'Check failed',
      tx_none: 'All in-scope companies reconcile to their documents.', tx_reason: 'Reason',
      /* modal */
      d_title_vat: 'VAT detail', d_records: 'documents', d_all_dates: 'All dates (open backlog)', d_period: 'Selected period', d_company_drill: 'Click a company to drill into its records',
      d_view_invoices: 'View all sales invoices in scope', d_open_pi: 'Purchase Invoices in ERPNext'
    },
    ar: {
      err_truncated: 'وصلت النتيجة إلى الحد الآمن للصفوف، لذلك لا يُعرض الرقم (لأنه سيكون ناقصاً)',
      restricted: 'الوصول إلى هذه اللوحة مقصور على الأدوار: System Manager وCEO وInternal Controller وAccounts Manager وDashboard Manager.',
      x_run: 'تشغيل الفحص', x_scanning: 'جارٍ فحص الفواتير...', x_rate_not_run: 'شغّل الفحص أولاً (يفحص الفترة على دفعات محدودة).',
      x_rate_cap: 'لم يُحسب: عدد فواتير الفترة يتجاوز حد الفحص (3,000 فاتورة). ضيّق الفترة أو الشركة.', x_rate_done: 'تم فحص',
      x_unavail: 'غير متاح', arch_note: 'تُقرأ كل الأرقام مباشرة بصلاحياتك في ERPNext؛ ولا تُستخدم أي سكربتات خلفية.',
      cov_note: 'تغطية تقرير DM KSA VAT Report: تتم مطابقة النتائج مع فواتير البيع والشراء لكل شركة. تتم مطابقة كل شركة مع فواتير البيع والشراء، ولا تدخل في الإجماليات إلا الشركات المطابقة. الشركات غير الموثّقة تُعرض منفصلة ولا تُضاف أبداً إلى الأرقام المجمّعة.',
      eyebrow: 'مجموعة دي إم / المالية والامتثال', title: 'مركز قيادة ضريبة القيمة المضافة وزاتكا',
      subtitle: 'أرقام الإقرار الضريبي المباشرة والامتثال للفوترة الإلكترونية عبر شركاتك',
      f_company: 'الشركة', f_group: 'مجموعة التسجيل الضريبي', all_companies: 'كل الشركات', all_groups: 'كل المجموعات',
      p_today: 'اليوم', p_week: 'هذا الأسبوع', p_month: 'هذا الشهر', p_lastmonth: 'الشهر الماضي', p_quarter: 'هذا الربع', p_year: 'هذه السنة', p_custom: 'فترة مخصصة',
      f_from: 'تاريخ البداية', f_to: 'تاريخ النهاية', refresh: 'تحديث', refreshing: 'جارٍ التحديث...',
      last_refresh: 'آخر تحديث ناجح', never: 'لم يتم التحديث بعد', partial_fail: 'قسم/أقسام فشلت في آخر محاولة',
      c_owner: 'المالك', c_reason: 'السبب', noaccess: 'لا توجد صلاحية للوصول إلى', timeout: 'انتهت مهلة الطلب', tab_overview: 'نظرة عامة', tab_vat: 'الإقرارات الضريبية', tab_zatca: 'حالة زاتكا', tab_register: 'سجل الفواتير', tab_compliance: 'الامتثال والاستثناءات',
      scope: 'النطاق', period: 'الفترة', basis: 'الأساس: تاريخ الترحيل', all_permitted: 'كل الشركات المسموح بها', companies_n: 'شركات', vat_group_scope: 'مجموعة ضريبية',
      loading: 'جارٍ التحميل...', retry: 'إعادة المحاولة', close: 'إغلاق', details: 'التفاصيل', open_erp: 'فتح في ERPNext', open_report: 'فتح التقرير الأصلي',
      sar: 'ر.س', unavailable: 'غير متاح', unverified: 'غير موثّق', verified: 'موثّق', partial: 'جزئي',
      err_empty: 'أعاد الخادم استجابة فارغة.', err_section: 'تعذر تحميل هذا القسم', no_data: 'لا توجد سجلات للنطاق والفترة المحددين.',
      k_taxable: 'المبيعات الخاضعة للضريبة', k_taxable_sub: 'بعد خصم إشعارات الدائن، تقرير ضريبة المملكة', k_output: 'ضريبة المخرجات', k_output_sub: 'ضريبة المبيعات، تقرير ضريبة المملكة',
      k_input: 'ضريبة المدخلات', k_input_sub: 'ضريبة المشتريات والمصروفات، تقرير ضريبة المملكة', k_net_pay: 'صافي الضريبة المستحقة', k_net_ref: 'صافي الضريبة المستردة', k_net: 'صافي الضريبة المستحقة / المستردة',
      k_net_sub: 'ضريبة المخرجات ناقص ضريبة المدخلات', k_verified_of: 'شركات موثّقة', k_not_verified: 'غير موثّق - راجع تبويب الإقرارات الضريبية',
      k_total: 'إجمالي فواتير زاتكا', k_total_sub: 'فواتير مرحّلة لها حالة زاتكا', k_cleared: 'تم التخليص', k_cleared_w: 'تم التخليص مع تحذيرات',
      k_cleared_w_sub: 'مقبولة لكن التحذيرات تحتاج مراجعة', k_pending: 'الفواتير المعلّقة', k_pending_sub: 'المتراكم المفتوح لكل التواريخ', k_rejected: 'مرفوضة / فاشلة',
      k_rejected_sub: 'مرفوضة + متأخرة (لا توجد حالة "فاشلة")', k_reported: 'تم الإبلاغ', k_reported_w: 'تم الإبلاغ مع تحذيرات', k_overdue: 'متأخرة', k_failed: 'فاشلة',
      k_failed_sub: 'ليست حالة في نظام الربط المثبّت', k_draft: 'مسودة (فواتير مرحّلة)', k_draft_sub: 'مرحّلة ولم تُرسل أبداً', k_other: 'حالة أخرى / غير معروفة',
      k_other_sub: 'قيمة غير موجودة في قائمة النظام', k_nostatus: 'بدون حالة زاتكا', k_nostatus_sub: 'غالباً فواتير قبل الفوترة الإلكترونية', k_cancelled: 'ملغاة (مستبعدة)',
      k_draft_unsub: 'مسودات غير مرحّلة (مستبعدة)', invoices: 'فاتورة',
      s_vat_kpis: 'الموقف الضريبي', s_zatca_kpis: 'الفوترة الإلكترونية - زاتكا', s_alerts: 'تنبيهات الامتثال للضريبة وزاتكا', s_attention: 'يحتاج إلى اهتمام',
      s_out_in: 'ضريبة المخرجات مقابل المدخلات', s_out_in_sub: 'لكل شركة، تقرير ضريبة المملكة (الشركات الموثّقة فقط)', s_trend: 'اتجاه الضريبة الشهري', s_trend_sub: 'مبني على المستندات (فواتير البيع والشراء)؛ الإقرار نفسه من تقرير ضريبة المملكة',
      s_status_dist: 'توزيع حالات زاتكا', s_compare: 'مقارنة الشركات', s_groups: 'مجموعات التسجيل الضريبي', s_breakdown: 'التفصيل الكامل لتقرير الضريبة', s_recon: 'المطابقة: التقرير مقابل المستندات',
      s_unavail: 'غير قابلة للتوزيع على الشركات', s_status_cards: 'أعداد الحالات', s_monthly_status: 'الحالات حسب الشهر', s_ageing: 'أعمار الفواتير المعلّقة', s_by_company: 'الحالات حسب الشركة',
      s_timestamps: 'أوقات الإبلاغ / التخليص', s_warnings: 'تفاصيل التحذيرات', s_rejected_list: 'الفواتير المرفوضة والمتأخرة', s_pending_list: 'أقدم الفواتير المعلّقة', s_meanings: 'معاني الحالات',
      s_exceptions: 'الاستثناءات', s_filing: 'التحقق من تقديم الإقرار وسداد الضريبة', s_tax_recon: 'مشكلات مطابقة الضريبة', s_register: 'فواتير المبيعات',
      al_none: 'لا توجد تنبيهات نشطة لهذا النطاق.', al_unrecon: 'تقرير الضريبة غير مطابق لـ', al_unrecon_sub: 'تقرير ضريبة المملكة لا يتفق مع المستندات، لذلك استُبعدت هذه الأرقام من الإجماليات.',
      al_backlog: 'فواتير زاتكا معلّقة منذ أكثر من 7 أيام', al_backlog_sub: 'متراكم مفتوح لكل التواريخ. أقدم تاريخ ترحيل:', al_rejected: 'فواتير زاتكا مرفوضة أو متأخرة',
      al_warn_pct: 'نسبة التخليص مع تحذيرات', al_warn_pct_sub: 'من فواتير زاتكا في هذه الفترة - "تم التخليص مع تحذيرات" مقبولة لدى زاتكا لكنها ليست امتثالاً خالياً من الأخطاء.',
      al_filing: 'تقديم الإقرار والسداد غير موثّقين', al_filing_sub: 'لا يوجد سجل موثوق في النظام يثبت تقديم الإقرار أو سداده لهذه الفترة.',
      al_report_bug: 'تقرير "Sales Invoices and Zatca" يتجاهل فلتر الشركة', al_report_bug_sub: 'هذه اللوحة تقرأ فواتير المبيعات مباشرة حسب الشركة؛ لا تستخدم ذلك التقرير لأعداد الشركات.',
      al_missing: 'فواتير زاتكا ينقصها UUID / التجزئة / رمز QR', al_cn: 'إشعارات دائن بها مشكلات',
      v_scope_total: 'مجموع الشركات الموثّقة', v_compare_prev: 'مقارنة بالفترة السابقة', v_prev: 'الفترة السابقة', v_delta: 'التغيّر',
      v_taxable_base: 'الوعاء الخاضع', v_adjust: 'التسويات (المرتجعات)', v_vat: 'الضريبة', v_section: 'القسم', v_line: 'البند', v_company: 'الشركة', v_net: 'صافي الضريبة', v_status: 'الحالة',
      v_sales_vat: 'ضريبة المخرجات (التقرير)', v_si_vat: 'ضريبة فواتير المبيعات', v_diff: 'الفرق', v_purch_vat: 'ضريبة المدخلات - مشتريات قياسية (التقرير)', v_pi_vat: 'ضريبة فواتير الشراء',
      v_group_tax: 'الرقم الضريبي', v_group_members: 'الشركات', v_group_note: 'إجماليات المجموعة تجميع داخلي لأرقام دفاتر كل شركة وليست إقراراً ضريبياً مجمّعاً مقدّماً رسمياً. الشركات التي تشترك في رقم ضريبي تُجمع مرة واحدة لكل شركة دون ازدواج. فواتير ما بين الشركات لا تُستبعد.',
      v_view_companies: 'حسب الشركة', v_view_groups: 'حسب المجموعة الضريبية', v_base_note: 'تقرير DM KSA VAT Report: مبلغ المبيعات صافٍ بالفعل من المرتجعات، والتسويات للعرض فقط ولا تخصم مرة أخرى.',
      v_native_report: 'فتح تقرير DM KSA VAT Report', v_unavail_foreign: 'المشتريات الأجنبية (التقرير المُعدّ "VAT Report - Purchase Foreign")', v_unavail_expense: 'ضريبة المصروفات (التقرير المُعدّ "VAT Report - Expense")',
      v_unavail_why: 'هذه التقارير المُعدّة مسبقاً لا تحتوي على حقل الشركة، فلا يمكن نسبتها إلى شركة. بنود تقرير ضريبة المملكة المنسوبة للشركة (الاستيراد بالاحتساب العكسي، رسوم الجمارك، المصروفات بالضريبة) ظاهرة في التفصيل أعلاه.',
      v_intercompany: 'فواتير ما بين الشركات', v_no_verified: 'لا توجد شركة مطابقة في هذا النطاق، لذلك لا يُعرض رقم مجمّع.',
      v_sales_ok: 'ضريبة المخرجات تتفق مع فواتير المبيعات', v_status_reconciled: 'مطابق', v_status_mismatch: 'غير مطابق', v_status_not_covered: 'غير مشمول بالتقرير', v_status_error: 'خطأ في التقرير', v_status_unverified: 'غير موثّق',
      v_tol: 'هامش السماح', v_loading_company: 'جارٍ تحميل الشركة...', v_net_unverified: 'لا يمكن تأكيد صافي الضريبة',
      z_total_inv: 'إجمالي الفواتير', z_by_status: 'حسب الحالة', z_all_dates: 'كل التواريخ', z_oldest: 'الأقدم', z_ageing_note: 'تشمل الأعمار كل الفواتير المعلّقة والمسودات العالقة بغض النظر عن الفترة المحددة.',
      z_last_clear: 'آخر وقت تخليص', z_last_report: 'آخر وقت إبلاغ', z_cleared_nots: 'تم تخليصها بدون ختم وقت التخليص', z_reported_nots: 'تم الإبلاغ عنها بدون ختم وقت الإبلاغ',
      z_load_warn: 'تحميل تفاصيل التحذيرات', z_warn_none: 'لا توجد تحذيرات في هذا النطاق والفترة.', z_warn_count: 'الفواتير', z_status_note: 'تُقرأ الحالات من الحقل "zatca_status" في فاتورة المبيعات الذي يكتبه تطبيق زاتكا المثبّت.',
      m_cleared: 'تم التخليص: قبلتها زاتكا عبر التخليص دون تحذيرات.', m_cleared_w: 'تم التخليص مع تحذيرات: مقبولة لكن زاتكا أعادت تحذيرات (مثل بيانات المشتري). يجب مراجعتها - هذا ليس امتثالاً خالياً من الأخطاء.',
      m_reported: 'تم الإبلاغ: فاتورة مبسّطة أُبلغ عنها لزاتكا.', m_reported_w: 'تم الإبلاغ مع تحذيرات: أُبلغ عنها مع تحذيرات للمراجعة.', m_pending: 'معلّقة: مرحّلة في النظام ولم تُخلّص أو يُبلغ عنها بعد.',
      m_rejected: 'مرفوضة: رفضتها زاتكا ويجب تصحيحها وإعادة إرسالها.', m_overdue: 'متأخرة: انتهت مهلة الإرسال دون قبول.', m_draft: 'مسودة: عند ظهورها على فاتورة مرحّلة فهذا يعني أنها لم تُرسل أبداً.',
      m_cancelled: 'ملغاة: أُلغيت في النظام.', m_failed: 'فاشلة: لا توجد هذه الحالة في الربط المثبّت؛ الإخفاقات تظهر كمرفوضة أو متأخرة أو تبقى معلّقة.',
      st_Draft: 'مسودة', st_Pending: 'معلّقة', st_Reported: 'تم الإبلاغ', st_Cleared: 'تم التخليص', 'st_Reported with warnings': 'تم الإبلاغ مع تحذيرات', 'st_Cleared with warnings': 'تم التخليص مع تحذيرات',
      st_Rejected: 'مرفوضة', st_Overdue: 'متأخرة', st_Cancelled: 'ملغاة', st___none__: 'بدون حالة زاتكا', st_other: 'أخرى / غير معروفة',
      r_search: 'ابحث برقم الفاتورة أو العميل', r_status: 'حالة زاتكا', r_all_status: 'كل الحالات', r_page_size: 'الصفوف في الصفحة', r_showing: 'عرض', r_of: 'من', r_page: 'صفحة', r_prev: 'السابق', r_next: 'التالي',
      c_invoice: 'رقم الفاتورة', c_customer: 'العميل', c_company: 'الشركة', c_date: 'تاريخ الترحيل', c_type: 'نوع الفاتورة', c_taxable: 'المبلغ الخاضع', c_vat: 'مبلغ الضريبة', c_total: 'الإجمالي',
      c_status: 'حالة زاتكا', c_time: 'وقت الإبلاغ / التخليص', c_action: 'إجراء', c_warning: 'تحذير', c_clearing: 'تخليص', c_reporting: 'إبلاغ', t_invoice: 'فاتورة ضريبية', t_credit: 'إشعار دائن',
      ex_pending_all: 'فواتير زاتكا المعلّقة', exd_pending_all: 'مرحّلة ولم تُخلّص أو يُبلغ عنها (كل التواريخ)', ex_stuck_draft: 'فواتير مرحّلة بحالة زاتكا مسودة', exd_stuck_draft: 'لم تُرسل أبداً (كل التواريخ)',
      ex_rejected_all: 'عمليات إرسال مرفوضة أو متأخرة', exd_rejected_all: 'رفضتها زاتكا أو فاتت المهلة (كل التواريخ)', ex_warnings: 'مخلّصة / مبلّغ عنها مع تحذيرات', exd_warnings: 'مقبولة لكن التحذيرات تحتاج مراجعة',
      ex_missing_uuid: 'بيانات زاتكا ناقصة (UUID)', exd_missing_uuid: 'لها حالة زاتكا ولكن لم يُسجّل UUID/التجزئة', ex_missing_buyer_vat: 'الرقم الضريبي للمشتري ناقص', exd_missing_buyer_vat: 'الرقم الضريبي للعميل فارغ في الفاتورة',
      ex_cn_no_return: 'إشعارات دائن بدون فاتورة أصلية', exd_cn_no_return: 'فاتورة مرتجع بلا "مرتجع مقابل"', ex_cn_unresolved: 'إشعارات دائن لم تُخلّص / يُبلغ عنها', exd_cn_unresolved: 'معلّقة أو مسودة أو مرفوضة أو متأخرة (كل التواريخ)',
      ex_zero_vat: 'فواتير خاضعة بضريبة صفرية', exd_zero_vat: 'مبلغ صافٍ بدون ضريبة - تحقق من النسبة الصفرية / الإعفاء', ex_rate_mismatch: 'الضريبة لا تساوي 15% من الصافي', exd_rate_mismatch: 'احتمال نسبة خاطئة أو خصم أو بنود بنسب مختلطة',
      ex_no_status: 'فواتير مرحّلة بدون حالة زاتكا', exd_no_status: 'غالباً قبل الفوترة الإلكترونية؛ تأكد أنها لا تخص فترة الفوترة الإلكترونية',
      f_status: 'حالة تقديم الإقرار', f_payment: 'حالة السداد', f_not_verified: 'غير موثّق', f_forms: 'نماذج ملخص الضريبة المتداخلة مع هذه الفترة', f_form_name: 'النموذج', f_form_period: 'الفترة', f_form_state: 'الحالة',
      f_none: 'لا يوجد نموذج ملخص ضريبة متداخل مع هذه الفترة.', f_note: 'وجود نموذج ملخص ضريبة في النظام لا يثبت تقديم الإقرار لدى زاتكا، ولا يوجد سجل يربط السداد بالإقرار. لذلك لا تعرض هذه اللوحة أي إقرار أو سداد على أنه مكتمل.',
      x_category: 'الاستثناء', x_count: 'العدد', x_amount: 'المبلغ', x_view: 'عرض المستندات', x_all_dates_tag: 'كل التواريخ', x_ok: 'لا يوجد', x_failed: 'فشل الفحص',
      tx_none: 'كل الشركات ضمن النطاق مطابقة لمستنداتها.', tx_reason: 'السبب',
      d_title_vat: 'تفاصيل الضريبة', d_records: 'مستند', d_all_dates: 'كل التواريخ (متراكم مفتوح)', d_period: 'الفترة المحددة', d_company_drill: 'اضغط على شركة لعرض سجلاتها',
      d_view_invoices: 'عرض كل فواتير المبيعات ضمن النطاق', d_open_pi: 'فواتير الشراء في ERPNext'
    }
  };
  function t(k) { var d = I18N[LANG]; return (d && d[k] !== undefined) ? d[k] : ((I18N.en[k] !== undefined) ? I18N.en[k] : k); }

  /* ================================================================== engine (v1, unchanged apart from the runtime calls) */
  function htmlToText(h) {
    if (!h) { return ''; }
    var s = String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n');
    var doc = new DOMParser().parseFromString(s, 'text/html');
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }
  var STATUS_ORDER = ['Cleared', 'Cleared with warnings', 'Reported', 'Reported with warnings', 'Pending', 'Rejected', 'Overdue', 'Draft', 'Cancelled'];
  function stLabel(s) { var k = 'st_' + (s === '' || s === null || s === undefined ? '__none__' : s); return (I18N.en[k] !== undefined) ? t(k) : (s || t('st___none__')); }
  var KSA_REPORT = 'DM KSA VAT Report', VAT_RATE = 15, TOL = 5, MAX_DAYS = 400, GROUP_CAP = 5000, SCAN_CAP = 3000, SCAN_PAGE = 500, PAGE_MAX = 100;
  var STATUSES = ['Draft', 'Pending', 'Reported', 'Cleared', 'Reported with warnings', 'Cleared with warnings', 'Rejected', 'Overdue', 'Cancelled'];
  var ALL_DATES_PRESETS = ['pending_all', 'stuck_draft', 'rejected_all', 'cn_unresolved'];
  var EXC_PRESETS = ['pending_all', 'stuck_draft', 'rejected_all', 'warnings', 'missing_uuid', 'missing_buyer_vat', 'cn_no_return', 'cn_unresolved', 'zero_vat', 'no_status'];
  var REG_FIELDS = ['name', 'customer', 'customer_name', 'company', 'posting_date', 'is_return', 'base_net_total', 'base_total_taxes_and_charges', 'base_grand_total',
    'zatca_status', 'custom_clearing_to_zatka_time', 'custom_reporting_to_zatka_time', 'return_against', 'owner'];
  function callQ(method, args) { return guarded(null, method, args).then(function (r) { if (r == null) { throw new Error(t('err_empty')); } return r; }); }
  /* o: {limit,start,group_by,order_by,or_filters,strict} */
  function gl(doctype, fields, filters, o) {
    o = o || {};
    var lim = o.limit || GROUP_CAP, a = { doctype: doctype, fields: fields, filters: filters, limit_page_length: lim };
    if (o.group_by) { a.group_by = o.group_by; }
    if (o.order_by) { a.order_by = o.order_by; }
    if (o.or_filters && o.or_filters.length) { a.or_filters = o.or_filters; }
    if (o.start) { a.limit_start = o.start; }
    return callQ('frappe.client.get_list', a).then(function (rows) {
      if (o.strict && rows.length >= lim) { throw new Error(t('err_truncated') + ' (' + lim + ')'); }
      return rows;
    });
  }
  function pool(items, limit, worker) {
    var i = 0, running = 0;
    return new Promise(function (resolve) {
      if (!items.length) { resolve(); return; }
      function next() {
        while (running < limit && i < items.length) { (function (it) { running++; worker(it).then(done, done); })(items[i++]); }
        if (running === 0 && i >= items.length) { resolve(); }
      }
      function done() { running--; next(); }
      next();
    });
  }
  function r2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
  function f0(x) { return Number(x) || 0; }
  function mapRow(r) {
    var w = r.custom_zatca_warnings, ct = r.custom_clearing_to_zatka_time, rt = r.custom_reporting_to_zatka_time;
    return { name: r.name, customer: r.customer, customer_name: r.customer_name, company: r.company, posting_date: String(r.posting_date),
      invoice_type: r.is_return ? 'Credit Note' : 'Tax Invoice', taxable: r2(r.base_net_total), vat: r2(r.base_total_taxes_and_charges), grand_total: r2(r.base_grand_total),
      zatca_status: r.zatca_status || '', zatca_time: ct || rt || '', time_kind: ct ? 'clearing' : (rt ? 'reporting' : ''), return_against: r.return_against || '', owner: r.owner || '', warnings: w ? String(w).slice(0, 600) : '' };
  }
  function checkDates(a) {
    if (!a.from_date || !a.to_date) { throw new Error('from_date and to_date are required.'); }
    if (a.from_date > a.to_date) { throw new Error('Start date must be on or before end date.'); }
    if (diffDays(a.from_date, a.to_date) > MAX_DAYS) { throw new Error('Select a period of ' + MAX_DAYS + ' days or less.'); }
  }
  function siBase(a, withDates) {
    var f = [['company', 'in', a.scope], ['docstatus', '=', 1]];
    if (withDates) { f.push(['posting_date', 'between', [a.from_date, a.to_date]]); }
    return f;
  }

  /* ---- meta */
  function engMeta() {
    return gl('Company', ['name', 'tax_id', 'default_currency', 'abbr'], [], { limit: 501, strict: true }).then(function (rows) {
      var comps = rows.map(function (c) { return { name: c.name, tax_id: c.tax_id || '', currency: c.default_currency || 'SAR', abbr: c.abbr || '' }; })
        .sort(function (x, y) { return x.name < y.name ? -1 : 1; });
      var groups = {};
      comps.forEach(function (c) { (groups[c.tax_id] = groups[c.tax_id] || []).push(c.name); });
      return { user: frappe.session.user, companies: comps, vat_groups: Object.keys(groups).sort().map(function (k) { return { tax_id: k, companies: groups[k] }; }), can_run_ksa_vat_report: true, vat_rate: VAT_RATE };
    });
  }

  /* ---- VAT per company: native report + independent document cross-check */
  function parseKsa(rep) {
    var ksa = { ok: false, error: null, rows: [] };
    if (rep && rep.result) {
      ksa.ok = true; var section = 'sales';
      rep.result.forEach(function (r) {
        if (r.title === 'VAT on Purchases') { section = 'purchases'; }
        ksa.rows.push({ section: section, title: r.title || '', amount: r2(r.amount), adjustment: r2(r.adjustment !== undefined ? r.adjustment : r.adjustment_amount), vat: r2(r.vat_amount),
          header: ((r.amount === null || r.amount === undefined || r.amount === '') && (r.vat_amount === null || r.vat_amount === undefined || r.vat_amount === '')) });
      });
    } else { ksa.error = 'Report returned no result (it may be running as a prepared report).'; }
    return ksa;
  }
  function engVat(a) {
    checkDates(a);
    var comp = a.company, from = a.from_date, to = a.to_date;
    var base = [['company', '=', comp], ['docstatus', '=', 1], ['posting_date', 'between', [from, to]]];
    var ksaP = callQ('frappe.desk.query_report.run', { report_name: KSA_REPORT, filters: { company: comp, from_date: from, to_date: to } }).then(parseKsa,
      function (e) { return { ok: false, error: 'DM KSA VAT Report failed: ' + e.message, rows: [] }; });
    var siP = gl('Sales Invoice', ['is_return', 'count(name) as n', 'sum(base_net_total) as net', 'sum(base_total_taxes_and_charges) as tax'], base, { group_by: 'is_return', limit: 10, strict: true })
      .then(function (g) {
        var si = { invoices: 0, credit_notes: 0, net_invoices: 0, vat_invoices: 0, net_credit_notes: 0, vat_credit_notes: 0 };
        g.forEach(function (x) {
          if (x.is_return) { si.credit_notes = x.n; si.net_credit_notes = f0(x.net); si.vat_credit_notes = f0(x.tax); } else { si.invoices = x.n; si.net_invoices = f0(x.net); si.vat_invoices = f0(x.tax); }
        });
        si.net_total = r2(si.net_invoices + si.net_credit_notes); si.vat_total = r2(si.vat_invoices + si.vat_credit_notes);
        ['net_invoices', 'vat_invoices', 'net_credit_notes', 'vat_credit_notes'].forEach(function (k) { si[k] = r2(si[k]); });
        return gl('Sales Invoice', ['count(name) as n', 'sum(base_total_taxes_and_charges) as tax'], base.concat([['is_internal_customer', '=', 1]]), { limit: 1 }).then(function (ig) {
          si.intercompany_invoices = ig.length ? ig[0].n : 0; si.intercompany_vat = ig.length ? r2(ig[0].tax) : 0; return si;
        });
      }).then(null, function (e) { return { error: e.message }; });
    var piP = gl('Purchase Invoice', ['is_return', 'count(name) as n', 'sum(base_net_total) as net', 'sum(base_total_taxes_and_charges) as tax'], base, { group_by: 'is_return', limit: 10, strict: true })
      .then(function (g) {
        var pi = { invoices: 0, debit_notes: 0, net_total: 0, vat_total: 0 };
        g.forEach(function (x) { if (x.is_return) { pi.debit_notes = x.n; } else { pi.invoices = x.n; } pi.net_total += f0(x.net); pi.vat_total += f0(x.tax); });
        pi.net_total = r2(pi.net_total); pi.vat_total = r2(pi.vat_total); return pi;
      }).then(null, function (e) { return { error: e.message }; });
    return Promise.all([ksaP, siP, piP]).then(function (x) {
      var ksa = x[0], si = x[1], pi = x[2];
      var res = { company: comp, from_date: from, to_date: to, ksa: ksa };
      var k = { sales_base: 0, sales_adj: 0, output_vat: 0, customs: 0, import_rc: 0, purch_base: 0, purch_vat: 0, exp_base: 0, exp_vat: 0, input_total_base: 0, input_vat: 0, difference: 0 }, foundDiff = false;
      ksa.rows.forEach(function (r) {
        var tt = r.title;
        if (r.section === 'sales' && tt.indexOf('Standard rated sales') === 0) { k.sales_base = r.amount; k.sales_adj = r.adjustment; k.output_vat = r.vat; }
        else if (tt.indexOf('Custom and Clearing') === 0) { k.customs = r.amount; }
        else if (tt.indexOf('Import subject to VAT') === 0) { k.import_rc = r.amount; }
        else if (tt.indexOf('Standard rated purchases') === 0) { k.purch_base = r.amount; k.purch_vat = r.vat; }
        else if (tt.indexOf('Expenses with VAT') === 0) { k.exp_base = r.amount; k.exp_vat = r.vat; }
        else if (r.section === 'purchases' && tt.indexOf('Grand Total') === 0) { k.input_total_base = r.amount; k.input_vat = r.vat; }
        else if (tt.indexOf('Difference') === 0) { k.difference = r.vat; foundDiff = true; }
      });
      // DM KSA VAT Report's Amount is already net of returns; adjustment is for display only.
       k.taxable_sales_net_of_returns = r2(k.sales_base);
      res.ksa_summary = k;
      var siOk = si && !si.error, piOk = pi && !pi.error;
      res.documents = { sales_invoice: siOk ? si : null, purchase_invoice: piOk ? pi : null, sales_invoice_error: siOk ? null : (si && si.error), purchase_invoice_error: piOk ? null : (pi && pi.error) };
      var v = { status: 'unverified', sales_check: null, purchase_check: null, reasons: [] };
      if (!ksa.ok) { v.status = 'error'; v.reasons.push(ksa.error); }
      else {
        var salesOk = null, purchOk = null;
        if (!siOk) { v.reasons.push('Sales Invoices could not be read (' + (si && si.error) + ') - output VAT could not be cross-checked.'); }
        else {
          var d = r2(k.output_vat - si.vat_total); salesOk = Math.abs(d) <= TOL; v.sales_check = { report: k.output_vat, documents: si.vat_total, difference: d, ok: salesOk };
          if (!salesOk) {
            v.reasons.push(k.output_vat === 0 && si.vat_total !== 0 ? 'DM KSA VAT Report shows no output VAT for this company, but Sales Invoices carry VAT of ' + si.vat_total + '. The report does not appear to cover this company.' : 'Output VAT differs from Sales Invoice VAT by ' + d + '.');
          }
        }
        if (!piOk) { v.reasons.push('Purchase Invoices could not be read (' + (pi && pi.error) + ') - input VAT could not be cross-checked.'); }
        else {
          var d2 = r2(k.purch_vat - pi.vat_total); purchOk = Math.abs(d2) <= TOL; v.purchase_check = { report: k.purch_vat, documents: pi.vat_total, difference: d2, ok: purchOk };
          if (!purchOk) {
            v.reasons.push(k.purch_vat === 0 && pi.vat_total !== 0 ? 'DM KSA VAT Report shows no purchase VAT for this company, but Purchase Invoices carry VAT of ' + pi.vat_total + '.' : 'Standard-rated purchase VAT differs from Purchase Invoice VAT by ' + d2 + '.');
          }
        }
        if (salesOk === true && purchOk === true) { v.status = 'reconciled'; }
        else if (salesOk === false || purchOk === false) { v.status = (k.output_vat === 0 && k.purch_vat === 0) ? 'not_covered' : 'mismatch'; }
        var calc = r2(k.output_vat - k.input_vat);
        if (foundDiff && Math.abs(calc - k.difference) > 0.05) { v.reasons.push('Report difference (' + k.difference + ') is not output minus input (' + calc + ').'); if (v.status === 'reconciled') { v.status = 'mismatch'; } }
      }
      res.verdict = v;
      res.net_vat = { value: r2(k.output_vat - k.input_vat), verified: v.status === 'reconciled', label: (k.output_vat - k.input_vat) >= 0 ? 'Payable' : 'Refundable' };
      return res;
    });
  }

  /* ---- monthly document-based trend */
  function engTrend(a) {
    checkDates(a);
    var base = siBase(a, true), months = {};
    function mrow(m) { return months[m] || (months[m] = { month: m, sales_net: 0, output_vat: 0, invoices: 0, purchase_net: 0, input_vat: 0 }); }
    var res = { basis: 'documents', months: [] };
    var sP = gl('Sales Invoice', ['posting_date', 'sum(base_net_total) as net', 'sum(base_total_taxes_and_charges) as tax', 'count(name) as n'], base, { group_by: 'posting_date', strict: true })
      .then(function (g) { g.forEach(function (x) { var r = mrow(String(x.posting_date).slice(0, 7)); r.sales_net += f0(x.net); r.output_vat += f0(x.tax); r.invoices += x.n; }); }, function (e) { res.sales_error = e.message; });
    var pP = gl('Purchase Invoice', ['posting_date', 'sum(base_net_total) as net', 'sum(base_total_taxes_and_charges) as tax'], [['company', 'in', a.scope], ['docstatus', '=', 1], ['posting_date', 'between', [a.from_date, a.to_date]]], { group_by: 'posting_date', strict: true })
      .then(function (g) { g.forEach(function (x) { var r = mrow(String(x.posting_date).slice(0, 7)); r.purchase_net += f0(x.net); r.input_vat += f0(x.tax); }); }, function (e) { res.purchase_error = e.message; });
    return Promise.all([sP, pP]).then(function () {
      if (res.sales_error && res.purchase_error) { throw new Error(res.sales_error); }
      Object.keys(months).sort().forEach(function (m) { var r = months[m]; ['sales_net', 'output_vat', 'purchase_net', 'input_vat'].forEach(function (k) { r[k] = r2(r[k]); }); r.net_vat = r2(r.output_vat - r.input_vat); res.months.push(r); });
      return res;
    });
  }

  /* ---- ZATCA summary (Sales Invoice, actual company field) */
  function bucketFilters(today, i) {
    var d = function (n) { return addDays(today, -n); };
    if (i === 0) { return [['posting_date', '>=', d(1)]]; }
    if (i === 1) { return [['posting_date', 'between', [d(3), d(2)]]]; }
    if (i === 2) { return [['posting_date', 'between', [d(7), d(4)]]]; }
    if (i === 3) { return [['posting_date', 'between', [d(30), d(8)]]]; }
    if (i === 4) { return [['posting_date', 'between', [d(90), d(31)]]]; }
    return [['posting_date', '<', d(90)]];
  }
  function engZatca(a) {
    checkDates(a);
    var today = TODAY, base = [['company', 'in', a.scope], ['posting_date', 'between', [a.from_date, a.to_date]]];
    var res = { from_date: a.from_date, to_date: a.to_date, status_note: 'x' };
    var main = gl('Sales Invoice', ['company', 'zatca_status', 'count(name) as n', 'sum(base_grand_total) as gt', 'sum(base_total_taxes_and_charges) as tax'], base.concat([['docstatus', '=', 1]]), { group_by: 'company, zatca_status', strict: true })
      .then(function (g) {
        var bs = {}, bc = {}, other = 0, total = 0;
        g.forEach(function (x) {
          var st = x.zatca_status || '__none__'; bs[st] = bs[st] || { count: 0, grand_total: 0, vat: 0 };
          bs[st].count += x.n; bs[st].grand_total += f0(x.gt); bs[st].vat += f0(x.tax);
          (bc[x.company] = bc[x.company] || {})[st] = x.n;
        });
        Object.keys(bs).forEach(function (st) {
          bs[st].grand_total = r2(bs[st].grand_total); bs[st].vat = r2(bs[st].vat);
          if (st !== '__none__') { total += bs[st].count; if (STATUSES.indexOf(st) < 0) { other += bs[st].count; } }
        });
        res.by_status = bs; res.by_company = bc; res.total_with_status = total; res.unknown_status_count = other; res.no_status_count = bs.__none__ ? bs.__none__.count : 0;
      });
    var excl = gl('Sales Invoice', ['docstatus', 'count(name) as n'], base.concat([['docstatus', 'in', [0, 2]]]), { group_by: 'docstatus', limit: 5, strict: true })
      .then(function (g) { res.excluded = { draft_unsubmitted: 0, cancelled: 0 }; g.forEach(function (x) { if (x.docstatus === 0) { res.excluded.draft_unsubmitted = x.n; } if (x.docstatus === 2) { res.excluded.cancelled = x.n; } }); });
    var b1 = base.concat([['docstatus', '=', 1]]);
    var lc = gl('Sales Invoice', ['custom_clearing_to_zatka_time'], b1.concat([['custom_clearing_to_zatka_time', 'is', 'set']]), { order_by: 'custom_clearing_to_zatka_time desc', limit: 1 })
      .then(function (g) { res.last_clearing_time = g.length ? String(g[0].custom_clearing_to_zatka_time) : null; });
    var lr = gl('Sales Invoice', ['custom_reporting_to_zatka_time'], b1.concat([['custom_reporting_to_zatka_time', 'is', 'set']]), { order_by: 'custom_reporting_to_zatka_time desc', limit: 1 })
      .then(function (g) { res.last_reporting_time = g.length ? String(g[0].custom_reporting_to_zatka_time) : null; });
    var cn = gl('Sales Invoice', ['count(name) as n'], b1.concat([['zatca_status', 'in', ['Cleared', 'Cleared with warnings']], ['custom_clearing_to_zatka_time', 'is', 'not set']]), { limit: 1 })
      .then(function (g) { res.cleared_without_timestamp = g[0].n; });
    var rn = gl('Sales Invoice', ['count(name) as n'], b1.concat([['zatca_status', 'in', ['Reported', 'Reported with warnings']], ['custom_reporting_to_zatka_time', 'is', 'not set']]), { limit: 1 })
      .then(function (g) { res.reported_without_timestamp = g[0].n; });
    var mon = gl('Sales Invoice', ['posting_date', 'zatca_status', 'count(name) as n'], b1, { group_by: 'posting_date, zatca_status', strict: true })
      .then(function (g) {
        var mt = {}; g.forEach(function (x) { var m = String(x.posting_date).slice(0, 7), st = x.zatca_status || '__none__'; mt[m] = mt[m] || {}; mt[m][st] = (mt[m][st] || 0) + x.n; });
        res.monthly_status = Object.keys(mt).sort().map(function (m) { return { month: m, counts: mt[m] }; });
      });
    /* open backlog ageing, ALL dates: exact counts per bucket (no row cap involved) */
    var ageing = { labels: ['0-1 days', '2-3 days', '4-7 days', '8-30 days', '31-90 days', 'Over 90 days'], pending: [0, 0, 0, 0, 0, 0], stuck_draft: [0, 0, 0, 0, 0, 0], all_dates: true, oldest_posting_date: null, as_of: today };
    var ageJobs = [];
    [['Pending', 'pending'], ['Draft', 'stuck_draft']].forEach(function (st) {
      for (var i = 0; i < 6; i++) {
        (function (i) {
          ageJobs.push(gl('Sales Invoice', ['count(name) as n'], siBase(a, false).concat([['zatca_status', '=', st[0]]], bucketFilters(today, i)), { limit: 1 }).then(function (g) { ageing[st[1]][i] = g[0].n; }));
        })(i);
      }
    });
    ageJobs.push(gl('Sales Invoice', ['posting_date'], siBase(a, false).concat([['zatca_status', 'in', ['Pending', 'Draft']]]), { order_by: 'posting_date asc', limit: 1 })
      .then(function (g) { ageing.oldest_posting_date = g.length ? String(g[0].posting_date) : null; }));
    res.ageing = ageing;
    var bl = gl('Sales Invoice', ['company', 'zatca_status', 'count(name) as n'], siBase(a, false).concat([['zatca_status', 'in', ['Pending', 'Draft', 'Rejected', 'Overdue']]]), { group_by: 'company, zatca_status', strict: true })
      .then(function (g) { var o = {}; g.forEach(function (x) { (o[x.company] = o[x.company] || {})[x.zatca_status] = x.n; }); res.backlog_by_company = o; });
    return Promise.all([main, excl, lc, lr, cn, rn, mon, bl].concat(ageJobs)).then(function () { return res; });
  }

  /* ---- warning groups (top 25 distinct warning texts) */
  function engWarnings(a) {
    checkDates(a);
    var LIM = 25;
    return gl('Sales Invoice', ['custom_zatca_warnings', 'count(name) as n'], siBase(a, true).concat([['zatca_status', 'in', ['Cleared with warnings', 'Reported with warnings']]]),
      { group_by: 'custom_zatca_warnings', order_by: 'n desc', limit: LIM }).then(function (g) {
      return { groups: g.map(function (x) { return { html: String(x.custom_zatca_warnings || '').slice(0, 4000), count: x.n }; }),
        note: 'Counts are grouped by the exact warning text stored on the invoice. Top ' + LIM + ' groups by invoice count' + (g.length >= LIM ? ' (more distinct texts exist and are not shown).' : '.') };
    });
  }

  /* ---- VAT filing evidence */
  function engFiling(a) {
    checkDates(a);
    return gl('VAT Summary Form', ['name', 'from_date', 'to_date', 'docstatus', 'modified'], [['from_date', '<=', a.to_date], ['to_date', '>=', a.from_date]], { order_by: 'modified desc', limit: 20 }).then(function (fl) {
      var forms = fl.map(function (f) { return { name: f.name, from_date: String(f.from_date), to_date: String(f.to_date), docstatus: f.docstatus, state: f.docstatus === 1 ? 'Submitted' : (f.docstatus === 2 ? 'Cancelled' : 'Draft') }; });
      return { verified_filing: false, verified_payment: false, available: true, forms: forms, submitted_forms: forms.filter(function (f) { return f.docstatus === 1; }).length, draft_forms: forms.filter(function (f) { return f.docstatus === 0; }).length };
    }, function (e) { return { verified_filing: false, verified_payment: false, available: false, forms: [], error: e.message }; });
  }

  /* ---- presets -> filters (shared by exception counts, drill-downs and the register) */
  function presetFilters(p, a, statusReq) {
    var docstat = 1;
    if (p === '' && statusReq.indexOf('Cancelled') >= 0) { docstat = 2; }
    var f = [['company', 'in', a.scope], ['docstatus', '=', docstat]];
    if (ALL_DATES_PRESETS.indexOf(p) < 0) { f.push(['posting_date', 'between', [a.from_date, a.to_date]]); }
    if (p === 'pending' || p === 'pending_all') { f.push(['zatca_status', '=', 'Pending']); }
    else if (p === 'with_status') { f.push(['zatca_status', 'is', 'set']); }
    else if (p === 'stuck_draft') { f.push(['zatca_status', '=', 'Draft']); }
    else if (p === 'rejected_all') { f.push(['zatca_status', 'in', ['Rejected', 'Overdue']]); }
    else if (p === 'warnings') { f.push(['zatca_status', 'in', ['Cleared with warnings', 'Reported with warnings']]); }
    else if (p === 'missing_uuid') { f.push(['zatca_status', 'is', 'set']); f.push(['uuid', 'is', 'not set']); }
    else if (p === 'missing_buyer_vat') { f.push(['zatca_status', 'is', 'set']); f.push(['customer_vat_id', 'is', 'not set']); }
    else if (p === 'cn_no_return') { f.push(['is_return', '=', 1]); f.push(['return_against', 'is', 'not set']); }
    else if (p === 'cn_unresolved') { f.push(['is_return', '=', 1]); f.push(['zatca_status', 'in', ['Pending', 'Draft', 'Rejected', 'Overdue']]); }
    else if (p === 'zero_vat') { f.push(['is_return', '=', 0]); f.push(['base_net_total', '>', 0]); f.push(['base_total_taxes_and_charges', '=', 0]); }
    else if (p === 'no_status') { f.push(['zatca_status', 'is', 'not set']); }
    else if (p === '') {
      var real = statusReq.filter(function (s) { return s !== 'Cancelled'; });
      if (real.length) { f.push(real.indexOf('__none__') >= 0 ? ['zatca_status', 'is', 'not set'] : ['zatca_status', 'in', real]); }
      if (docstat === 2) { f.push(['zatca_status', '=', 'Cancelled']); }
    }
    return f;
  }
  function engCount(p, a) {
    return gl('Sales Invoice', ['count(name) as n', 'sum(base_grand_total) as gt'], presetFilters(p, a, []), { limit: 1 }).then(function (g) { return { preset: p, total: g.length ? g[0].n : 0, grand_total: g.length ? r2(g[0].gt) : 0 }; });
  }
  function engExceptions(a) {
    checkDates(a);
    var out = {};
    return pool(EXC_PRESETS, 4, function (p) {
      return engCount(p, a).then(function (x) { out[p] = x; }, function (e) { out[p] = { preset: p, total: 0, grand_total: 0, error: e.message }; });
    }).then(function () { out.rate_mismatch = { preset: 'rate_mismatch', total: 0, grand_total: 0, unavailable: true }; return { counts: out }; });
  }

  /* ---- register / drill-down pages (bounded server-side pages + exact count) */
  function engRegister(a) {
    var p = a.preset || '';
    if (p !== '' && p !== 'rate_mismatch' && p !== 'pending' && p !== 'with_status' && EXC_PRESETS.indexOf(p) < 0) { return Promise.reject(new Error('Invalid preset.')); }
    checkDates(a);
    var page = Math.max(1, parseInt(a.page, 10) || 1), ps = Math.min(PAGE_MAX, Math.max(1, parseInt(a.page_size, 10) || 25));
    var sortBy = ['posting_date', 'name', 'base_grand_total', 'customer_name', 'zatca_status', 'company', 'creation'].indexOf(a.sort_by) >= 0 ? a.sort_by : 'posting_date';
    var dir = a.sort_dir === 'asc' ? 'asc' : 'desc', q = String(a.search || '').trim().slice(0, 60);
    var statusReq = String(a.status || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s && (STATUSES.indexOf(s) >= 0 || s === '__none__'); });
    if (p === 'rate_mismatch') {
      var R = RATE;
      if (!R || R.st !== 'ok') { return Promise.resolve({ preset: p, total: 0, grand_total: 0, rows: [], page: 1, page_size: ps, pages: 0, error: t('x_rate_not_run') }); }
      var gt = 0; R.rows.forEach(function (r) { gt += r.grand_total; });
      return Promise.resolve({ preset: p, total: R.rows.length, grand_total: r2(gt), rows: R.rows.slice((page - 1) * ps, page * ps), page: page, page_size: ps, pages: Math.ceil(R.rows.length / ps) });
    }
    var f = presetFilters(p, a, statusReq), orf = q ? [['name', 'like', '%' + q + '%'], ['customer_name', 'like', '%' + q + '%'], ['customer', 'like', '%' + q + '%']] : [];
    var fields = REG_FIELDS.slice(); if (p === 'warnings') { fields.push('custom_zatca_warnings'); }
    return gl('Sales Invoice', ['count(name) as n', 'sum(base_grand_total) as gt'], f, { limit: 1, or_filters: orf }).then(function (c) {
      var total = c.length ? c[0].n : 0, out = { preset: p, total: total, grand_total: c.length ? r2(c[0].gt) : 0, page: page, page_size: ps, pages: total ? Math.ceil(total / ps) : 0, rows: [] };
      if (!total) { return out; }
      return gl('Sales Invoice', fields, f, { limit: ps, start: (page - 1) * ps, order_by: sortBy + ' ' + dir + ', name desc', or_filters: orf }).then(function (rows) { out.rows = rows.map(mapRow); return out; });
    });
  }

  /* ---- bounded on-demand scan: VAT not equal to 15% of net (needs a field comparison that the
         standard filters cannot express). Calculated only when the whole period fits the cap. */
  function engRateScan(a, onProgress) {
    checkDates(a);
    var f = [['company', 'in', a.scope], ['docstatus', '=', 1], ['posting_date', 'between', [a.from_date, a.to_date]], ['is_return', '=', 0], ['base_net_total', '>', 0], ['base_total_taxes_and_charges', '>', 0]];
    return gl('Sales Invoice', ['count(name) as n'], f, { limit: 1 }).then(function (c) {
      var total = c.length ? c[0].n : 0;
      if (total > SCAN_CAP) { return { st: 'unavailable', total: total }; }
      var rows = [], start = 0;
      function next() {
        return gl('Sales Invoice', REG_FIELDS, f, { limit: SCAN_PAGE, start: start, order_by: 'posting_date desc, name desc' }).then(function (g) {
          rows = rows.concat(g); start += SCAN_PAGE; if (onProgress) { onProgress(Math.min(start, total), total); }
          return (g.length === SCAN_PAGE && start < total) ? next() : null;
        });
      }
      return next().then(function () {
        var bad = rows.filter(function (r) { var n = f0(r.base_net_total), tx = f0(r.base_total_taxes_and_charges); return Math.abs(tx - (VAT_RATE / 100) * n) > (1 + 0.001 * n); }).map(mapRow);
        return { st: 'ok', rows: bad, scanned: rows.length, total: total };
      });
    });
  }
  var RT = [
    ['VAT on Sales', 'ضريبة المبيعات'], ['Standard rated sales', 'المبيعات الخاضعة للنسبة الأساسية 15%'], ['VAT on Purchases', 'ضريبة المشتريات'],
    ['Custom and Clearing', 'رسوم الجمارك والتخليص'], ['Import subject to VAT', 'استيراد خاضع للضريبة بالاحتساب العكسي'], ['Standard rated purchases', 'المشتريات الخاضعة للنسبة الأساسية 15%'],
    ['Expenses with VAT', 'المصروفات الخاضعة للضريبة 15%'], ['Grand Total', 'الإجمالي'], ['Difference', 'مبلغ الفرق (المخرجات - المدخلات)']
  ];
  function rtTitle(s) {
    if (LANG !== 'ar') { return s; }
    for (var i = 0; i < RT.length; i++) { if (String(s).indexOf(RT[i][0]) === 0) { return RT[i][1]; } }
    return s;
  }
  function vatAgg(src, comps) {
    var a = { n: comps.length, ok: 0, verified: 0, errors: 0, loading: 0, unverified: [], sales_base: 0, sales_adj: 0, taxable: 0, output: 0, input: 0, net: 0,
      customs: 0, import_rc: 0, purch_vat: 0, exp_vat: 0, doc_output: 0 };
    comps.forEach(function (c) {
      var r = src[c];
      if (!r || r.st === 'loading') { a.loading++; return; }
      if (r.st === 'error') { a.errors++; a.unverified.push({ company: c, status: 'error', reasons: [r.err] }); return; }
      a.ok++;
      var d = r.data, k = d.ksa_summary, v = d.verdict;
      if (v.status === 'reconciled') {
        a.verified++; a.sales_base += k.sales_base; a.sales_adj += k.sales_adj; a.taxable += k.taxable_sales_net_of_returns;
        a.output += k.output_vat; a.input += k.input_vat; a.customs += k.customs; a.import_rc += k.import_rc; a.purch_vat += k.purch_vat; a.exp_vat += k.exp_vat;
      } else {
        a.unverified.push({ company: c, status: v.status, reasons: v.reasons || [], doc_output: d.documents && d.documents.sales_invoice ? d.documents.sales_invoice.vat_total : null });
      }
    });
    a.net = a.output - a.input;
    return a;
  }
  function erpFilterLink(spec) {
    var q = [], p = spec.preset || '', st = spec.status || '';
    var allDates = ['pending_all', 'stuck_draft', 'rejected_all', 'cn_unresolved'].indexOf(p) >= 0;
    var unsupported = ['zero_vat', 'rate_mismatch'].indexOf(p) >= 0;
    function add(k, v) { q.push(k + '=' + encodeURIComponent(typeof v === 'string' ? v : JSON.stringify(v))); }
    add('docstatus', '1');
    var comps = spec.company ? [spec.company] : scopeCompanies();
    if (comps.length === 1) { add('company', comps[0]); } else if (comps.length > 1) { add('company', ['in', comps]); }
    if (!allDates) { add('posting_date', ['Between', [PERIOD[0], PERIOD[1]]]); }
    if (p === 'pending' || p === 'pending_all') { add('zatca_status', 'Pending'); }
    else if (p === 'stuck_draft') { add('zatca_status', 'Draft'); }
    else if (p === 'rejected_all') { add('zatca_status', ['in', ['Rejected', 'Overdue']]); }
    else if (p === 'warnings') { add('zatca_status', ['in', ['Cleared with warnings', 'Reported with warnings']]); }
    else if (p === 'with_status') { add('zatca_status', ['is', 'set']); }
    else if (p === 'missing_uuid') { add('zatca_status', ['is', 'set']); add('uuid', ['is', 'not set']); }
    else if (p === 'missing_buyer_vat') { add('zatca_status', ['is', 'set']); add('customer_vat_id', ['is', 'not set']); }
    else if (p === 'cn_no_return') { add('is_return', '1'); add('return_against', ['is', 'not set']); }
    else if (p === 'cn_unresolved') { add('is_return', '1'); add('zatca_status', ['in', ['Pending', 'Draft', 'Rejected', 'Overdue']]); }
    else if (p === 'no_status') { add('zatca_status', ['is', 'not set']); }
    else if (st && st !== '__none__' && st !== 'Cancelled') { add('zatca_status', st.indexOf(',') >= 0 ? ['in', st.split(',')] : st); }
    else if (st === '__none__') { add('zatca_status', ['is', 'not set']); }
    if (unsupported) { return ''; }
    return '/app/sales-invoice?' + q.join('&');
  }
  function reportLink(company) {
    return '/app/query-report/' + encodeURIComponent(KSA_REPORT) + '?company=' + encodeURIComponent(company || '') +
      '&from_date=' + encodeURIComponent(PERIOD[0]) + '&to_date=' + encodeURIComponent(PERIOD[1]);
  }
  function piLink(company) {
    return '/app/purchase-invoice?docstatus=1&company=' + encodeURIComponent(company) + '&posting_date=' + encodeURIComponent(JSON.stringify(['Between', [PERIOD[0], PERIOD[1]]]));
  }

  /* ================================================================== scope, state and loading */
  var ALLOWED_ROLES = ['System Manager', 'CEO', 'Internal Controller', 'Accounts Manager', 'Dashboard Manager'];
  var META = null, METAERR = null, VAT = {}, VATP = {}, CMP = false, VVIEW = 'companies', RATE = null, WARN = null, REGST = '';
  var SI = 'Sales Invoice';
  function roleOk() {
    try {
      if (frappe.session && frappe.session.user === 'Administrator') { return true; }
      var ur = frappe.user_roles || [];
      return ALLOWED_ROLES.some(function (r) { return ur.indexOf(r) >= 0; });
    } catch (e) { return false; }
  }
  function boot() {
    if (!roleOk()) { return null; }
    return engMeta().then(function (m) { META = m; }, function (e) { METAERR = errKind(e); });
  }
  function coOf(n) { return META ? META.companies.filter(function (c) { return c.name === n; })[0] : null; }
  function curOf(n) { var c = coOf(n); return (c && c.currency) || CUR; }
  function taxIdOf(n) { var c = coOf(n); return c ? c.tax_id : ''; }
  function abbrOf(n) { var c = coOf(n); return (c && c.abbr) || n; }
  function companyOpts() { return META ? META.companies.map(function (c) { return { v: c.name, l: c.name + (c.currency !== CUR ? ' (' + c.currency + ')' : '') }; }) : []; }
  function groupOpts() { return META ? META.vat_groups.filter(function (g) { return g.tax_id; }).map(function (g) { return { v: g.tax_id, l: g.tax_id + ' · ' + g.companies.length + ' ' + tr(g.companies.length === 1 ? 'company' : 'companies', 'شركة') }; }) : []; }
  /* Companies in view: the chosen company; otherwise system-currency companies (of the VAT group, if one is chosen). */
  function scopeCompanies() {
    if (!META) { return []; }
    if (F.company) { return coOf(F.company) ? [F.company] : []; }
    return META.companies.filter(function (c) { return c.currency === CUR && (!F.group || c.tax_id === F.group); }).map(function (c) { return c.name; }).sort();
  }
  function excludedCos() { return (!META || F.company) ? [] : META.companies.filter(function (c) { return c.currency !== CUR && (!F.group || c.tax_id === F.group); }); }
  function viewCur() { return F.company ? curOf(F.company) : CUR; }
  function scopeText() {
    if (!META) { return tr('VAT returns, ZATCA e-invoicing and withholding tax', 'الإقرارات الضريبية والفوترة الإلكترونية والاستقطاع'); }
    var n = scopeCompanies().length;
    return F.company ? F.company : (F.group ? tr('VAT group ', 'المجموعة الضريبية ') + F.group : tr('All companies', 'كل الشركات')) + ' (' + num(n) + ')';
  }
  function rangeBad() { return !PERIOD[0] || !PERIOD[1] || PERIOD[0] > PERIOD[1] || diffDays(PERIOD[0], PERIOD[1]) > MAX_DAYS; }
  function canLoad() { return roleOk() && META && scopeCompanies().length && !rangeBad(); }
  function args(co) { return { scope: co ? [co] : scopeCompanies(), from_date: PERIOD[0], to_date: PERIOD[1] }; }
  /* Runs an engine call; engine errors re-thrown as plain messages keep their permission meaning. */
  function safe(f) { return new Promise(function (res) { res(f()); }).catch(function (e) { if (e && !e.status && /No access to|permission/i.test(e.message || '')) { e.status = 403; } throw e; }); }
  function loadVat(store, range) {
    var g = GEN, sc = scopeCompanies();
    sc.forEach(function (c) { store[c] = { st: 'loading' }; });
    pool(sc, 3, function (c) {
      return safe(function () { return engVat({ company: c, scope: [c], from_date: range[0], to_date: range[1] }); }).then(function (r) { if (g !== GEN) { return; } store[c] = { st: 'ok', data: r }; soon(); },
        function (e) { if (g !== GEN) { return; } store[c] = { st: 'error', err: (e && e.message) || 'error', kind: errKind(e) }; soon(); });
    });
  }
  function loadAll() {
    VAT = {}; VATP = {}; RATE = null; WARN = null; WHT.reset();
    if (!canLoad()) { D.zatca = D.exc = D.act = D.trend = D.filing = {}; return; }
    var a = args();
    run('zatca', function () { return safe(function () { return engZatca(a); }); });
    var tr6 = trendRange();
    run('trend', function () { return safe(function () { return engTrend({ scope: a.scope, from_date: tr6[0], to_date: tr6[1] }); }); });
    run('filing', function () { return safe(function () { return engFiling(a); }); });
    run('exc', function () { return safe(function () { return engExceptions(a); }); });
    loadActions(actSpecs());
    loadVat(VAT, PERIOD);
    if (CMP) { loadVat(VATP, prevP()); }
    if (tab === 'wht') { WHT.ensure(); }
  }
  /* VAT returns compare whole periods: the previous calendar month / quarter, else the equally long range before. */
  /* The trend gives context: at least the six months ending with the period. */
  function trendRange() { var end = PERIOD[1], s6 = addMonths(monthStart(clip(PERIOD)[1]), -5); return [s6 < PERIOD[0] ? s6 : PERIOD[0], end]; }
  function prevP() {
    var p = F.period;
    if (p === 'month' || p === 'lastMonth') { var m = addMonths(monthStart(PERIOD[0]), -1); return [m, monthEnd(m)]; }
    if (p === 'quarter') { var q = addMonths(monthStart(PERIOD[0]), -3); return [q, monthEnd(addMonths(q, 2))]; }
    return prevRange(p, PERIOD[0], PERIOD[1]);
  }
  function ready(k) { return D[k] && !D[k + 'Err'] && D[k].by_status !== undefined; }
  function cnt(st) { var z = D.zatca; return (z && z.by_status && z.by_status[st]) ? z.by_status[st].count : 0; }
  function excC(k) { var e = D.exc; return e && e.counts ? e.counts[k] : null; }

  /* ================================================================== small renderers */
  var STATUS_COLOR = { 'Cleared': '#1f8a5b', 'Cleared with warnings': '#d6a419', 'Reported': 'var(--dms-royal)', 'Reported with warnings': '#6b8be0', 'Pending': '#d97a1e',
    'Rejected': '#c2412d', 'Overdue': '#8f2a1c', 'Draft': '#8a97a8', 'Cancelled': '#b6bfca', '__none__': '#cfd6df', 'other': '#7a5bd0' };
  var STATUS_TONE = { 'Cleared': 'ok', 'Cleared with warnings': 'warn', 'Reported': 'ok', 'Reported with warnings': 'warn', 'Pending': 'warn', 'Rejected': 'bad', 'Overdue': 'bad', 'Draft': 'n', 'Cancelled': 'n', '': 'n' };
  function stBadge(s) { return stat(STATUS_TONE[s || ''] || 'n', stLabel(s || '')); }
  var VST = { reconciled: ['ok', 'v_status_reconciled'], mismatch: ['bad', 'v_status_mismatch'], not_covered: ['warn', 'v_status_not_covered'], error: ['bad', 'v_status_error'], unverified: ['n', 'v_status_unverified'] };
  function vStatus(s) { var x = VST[s] || VST.unverified; return stat(x[0], t(x[1])); }
  function vStatusText(s) { return t((VST[s] || VST.unverified)[1]); }
  function m2(v, cur) { return '<span class="dms-num">' + esc(amt(v)) + '</span>' + (cur ? ' <small class="dms-sm">' + esc(cur) + '</small>' : ''); }
  function amc2(v) { return '<span class="dms-num">' + esc(amt(v)) + '</span>'; }
  function fmtTime(s) { return s ? String(s).slice(0, 16).replace('T', ' ') : '—'; }
  function erpBtn(href, label) { return href ? '<a class="dms-btn dms-btn-sm" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(label || tr('Open in ERPNext', 'فتح في ERPNext')) + ' ↗</a>' : ''; }
  function chipRow(key, cur, opts) {
    return '<div class="dms-chips dms-bchips" role="group">' + opts.map(function (o) { var on = String(cur) === String(o[0]); return '<button type="button" class="dms-bchip' + (on ? ' dms-on' : '') + '" aria-pressed="' + on + '" data-act="chip" data-v="' + esc(key + ':' + o[0]) + '"><span>' + esc(o[1]) + '</span></button>'; }).join('') + '</div>';
  }
  function regId(preset, status, co) { return 'reg:' + (preset || '') + '|' + (status || '') + '|' + (co || ''); }
  function siCols(o) {
    o = o || {};
    var c = [
      linkCol(t('c_invoice'), SI, 'name'), col(t('c_customer'), 'customer_name', { fmt: function (v, x) { return bdi(v || x.customer); } }), col(t('c_company'), 'company'),
      col(t('c_date'), 'posting_date', { fmt: dtc }), col(t('c_type'), 'is_return', { sort: false, fmt: function (v) { return esc(v ? t('t_credit') : t('t_invoice')); } }),
      col(t('c_taxable'), 'base_net_total', { num: 1, fmt: amc2 }), col(t('c_vat'), 'base_total_taxes_and_charges', { num: 1, fmt: amc2 }), col(t('c_total'), 'base_grand_total', { num: 1, fmt: amc2 }),
      col(t('c_status'), 'zatca_status', { fmt: function (v) { return stBadge(v); } }),
      { h: t('c_time'), r: function (x) { var ct = x.custom_clearing_to_zatka_time, rt = x.custom_reporting_to_zatka_time; return ct || rt ? '<span class="dms-num">' + esc(fmtTime(ct || rt)) + '</span><span class="dms-sm"> ' + esc(ct ? t('c_clearing') : t('c_reporting')) + '</span>' : '<span class="dms-sm">—</span>'; }, c: function (x) { return x.custom_clearing_to_zatka_time || x.custom_reporting_to_zatka_time || ''; } },
      col(t('c_owner'), 'owner', { fmt: function (v) { return who(v); } })
    ];
    if (o.warnings) { c.push({ h: t('s_warnings'), r: function (x) { return '<span class="dms-sm">' + esc(htmlToText(x.custom_zatca_warnings).slice(0, 220)) + '</span>'; }, c: function (x) { return htmlToText(x.custom_zatca_warnings); } }); }
    if (o.reason) { c.push({ h: t('c_reason'), r: function () { return '<span class="dms-sm dms-tone-warn">' + esc(o.reason) + '</span>'; }, c: function () { return o.reason; } }); }
    return c;
  }
  function siFields(p) { var f = REG_FIELDS.slice(); if (p === 'warnings') { f.push('custom_zatca_warnings'); } return f; }
  function siSpec(id, preset, statusReq, co, extra) {
    var a = args(co);
    return Object.assign({ id: id, server: true, dt: SI, filters: presetFilters(preset, a, statusReq || []), fields: siFields(preset), order: 'posting_date desc', search: ['name', 'customer_name', 'customer'],
      searchHint: tr('Invoice or customer…', 'رقم الفاتورة أو العميل…'), cols: siCols({ warnings: preset === 'warnings', reason: preset === 'missing_uuid' ? t('exd_missing_uuid') : preset === 'missing_buyer_vat' ? t('exd_missing_buyer_vat') : '' }), file: 'sales_invoices_' + (preset || 'zatca'), pageSize: 15 }, extra || {});
  }

  /* ================================================================== actions pending */
  function siItem(p, tone, dueEn, dueAr) {
    return function (r) {
      return { p: p, score: score(p, r.base_grand_total, ageOf(r.posting_date)), title: r.customer_name || r.customer || r.name,
        desc: r.name + ' · ' + moneyFull(r.base_grand_total, curOf(r.company)) + ' · ' + stLabel(r.zatca_status || '') + ' · ' + abbrOf(r.company), who: r.owner, due: agoTxt(r.posting_date, dueEn, dueAr), tone: tone };
    };
  }
  var ACTS = [
    ['a_rej', 'rejected_all', 'high', 'bad', ['Rejected / overdue at ZATCA', 'مرفوضة / متأخرة لدى زاتكا'], 'posting_date asc'],
    ['a_uuid', 'missing_uuid', 'high', 'bad', ['Missing UUID', 'بدون UUID'], 'posting_date asc'],
    ['a_cnu', 'cn_unresolved', 'high', 'bad', ['Credit notes not accepted', 'إشعارات دائنة غير مقبولة'], 'posting_date asc'],
    ['a_draft', 'stuck_draft', 'med', 'warn', ['Never transmitted', 'لم تُرسل إطلاقًا'], 'posting_date asc'],
    ['a_pend', 'pending_all', 'med', 'warn', ['Pending at ZATCA', 'معلقة لدى زاتكا'], 'posting_date asc'],
    ['a_zero', 'zero_vat', 'med', 'warn', ['Taxable with zero VAT', 'خاضعة بضريبة صفر'], 'base_grand_total desc'],
    ['a_cnr', 'cn_no_return', 'med', 'warn', ['Credit notes without original', 'إشعارات بلا فاتورة أصلية'], 'posting_date asc'],
    ['a_bvat', 'missing_buyer_vat', 'low', 'n', ['Missing buyer VAT number', 'بدون رقم ضريبي للمشتري'], 'base_grand_total desc']
  ];
  function actSpecs() {
    if (!canLoad()) { return []; }
    var a = args();
    var specs = [{ id: 'a_vat', client: true, short: tr('VAT not reconciled', 'ضريبة غير مطابقة'), title: tr('Companies whose VAT does not reconcile', 'شركات لا تتطابق ضريبتها'),
      why: tr('DM KSA VAT Report differs from the invoices, does not cover the company or failed, for the selected period. Their VAT is left out of the totals.', 'تقرير DM KSA VAT يختلف عن الفواتير أو لا يغطي الشركة أو فشل، للفترة المحددة. ضريبتها مستبعدة من الإجماليات.') }];
    ACTS.forEach(function (x) {
      var all = ALL_DATES_PRESETS.indexOf(x[1]) >= 0;
      specs.push({ id: x[0], server: true, dt: SI, short: tr(x[4][0], x[4][1]), title: t('ex_' + x[1]), why: t('exd_' + x[1]) + (all ? '' : ' · ' + tr('selected period', 'الفترة المحددة')),
        filters: presetFilters(x[1], a, []), fields: siFields(x[1]), order: x[5],
        table: function () { return { fields: siFields(x[1]), search: ['name', 'customer_name', 'customer'], searchHint: tr('Invoice or customer…', 'رقم الفاتورة أو العميل…'), cols: siCols({ warnings: x[1] === 'warnings' }), pageSize: 15 }; },
        it: siItem(x[2], x[3], 'Posted', 'مرحّلة منذ') });
    });
    return specs;
  }
  function actClient() {
    if (!canLoad()) { return null; }
    var A = vatAgg(VAT, scopeCompanies());
    if (A.loading) { return null; }
    return { a_vat: { rows: A.unverified, item: function (u) {
      return { p: 'high', score: 345, dt: 'Company', name: u.company, href: reportLink(u.company), title: u.company, desc: vStatusText(u.status) + ' · ' + plain((u.reasons || []).join(' '), 150), who: taxIdOf(u.company) || null, due: rangeLabel(PERIOD), tone: 'bad' };
    } } };
  }

  /* ================================================================== banner */
  function banner() {
    var h = '', ex = excludedCos();
    if (ex.length) { h += alertBox('info', esc(tr('Shown in ' + CUR + '. Not included (other currency): ', 'المعروض بعملة ' + CUR + '. غير مشمولة (عملة أخرى): ') + ex.map(function (c) { return c.name + ' (' + c.currency + ')'; }).join(', ') + '. ' + tr('Choose one of them in Filters to see it in its own currency.', 'اخترها من المرشحات لعرضها بعملتها.'))); }
    if (roleOk() && META && rangeBad()) { h += alertBox('warn', esc(tr('Select a period of ' + MAX_DAYS + ' days or less.', 'اختر فترة لا تتجاوز ' + MAX_DAYS + ' يومًا.'))); }
    var z = D.zatca;
    if (ready('zatca') && z.total_with_status > 0) {
      var w = cnt('Cleared with warnings') + cnt('Reported with warnings');
      if (w / z.total_with_status > 0.2) { h += alertBox('warn', '<b>' + esc(t('al_warn_pct') + ' ' + (w / z.total_with_status * 100).toFixed(1) + '%') + '</b> ' + esc(num(w) + ' / ' + num(z.total_with_status) + ' ' + t('al_warn_pct_sub')) + ' <button type="button" class="dms-linkbtn" data-act="kpi" data-v="' + esc(regId('warnings')) + '">' + esc(tr('Review', 'مراجعة')) + '</button>'); }
    }
    return h;
  }

  /* ================================================================== views */
  function content(tb, AM) {
    if (!roleOk()) { return alertBox('err', esc(t('restricted'))); }
    if (METAERR) { return srcErr(METAERR, tr('Companies', 'الشركات')); }
    if (!META) { return skel(1, 'dms-skel-panel'); }
    if (!scopeCompanies().length) { return empty(tr('No company in this selection uses the system currency. Choose a company in Filters.', 'لا توجد شركة بعملة النظام في هذا الاختيار. اختر شركة من المرشحات.')); }
    if (rangeBad()) { return empty(tr('Choose a shorter period.', 'اختر فترة أقصر.')); }
    return { overview: tabOverview, vat: tabVat, zatca: tabZatca, register: tabRegister, compliance: tabCompliance, wht: function () { return WHT.view(); }, actions: tabActions }[tb](AM);
  }
  function vatKpis(A) {
    var cur = viewCur(), L = A.ok === 0 && A.loading > 0, has = A.verified > 0;
    var vsub = esc(num(A.verified) + '/' + num(A.n) + ' ' + t('k_verified_of')), top = L ? '' : A.n && A.verified === A.n ? stat('ok', t('verified')) : has ? stat('warn', t('partial')) : stat('bad', tr('Not verified', 'غير متحقق'));
    function v(x) { return L ? '…' : has ? cur$(x, cur) : '—'; }
    return [
      kpi({ label: t('k_output'), val: v(A.output), top: top, sub: vsub, act: 'vat:output', tip: t('cov_note') }),
      kpi({ label: t('k_input'), val: v(A.input), sub: vsub, act: 'vat:input', tip: t('cov_note') }),
      kpi({ label: has ? (A.net >= 0 ? t('k_net_pay') : t('k_net_ref')) : t('k_net'), dot: has ? (A.net >= 0 ? 'var(--dms-age3)' : 'var(--dms-ok)') : null, val: L ? '…' : has ? cur$(Math.abs(A.net), cur) : '—',
        sub: esc(has ? (A.verified < A.n ? t('partial') + ' · ' + num(A.verified) + '/' + num(A.n) : t('k_net_sub')) : t('k_not_verified')), act: 'vat:net' })
    ];
  }
  function zKpis() {
    var z = D.zatca, zl = !ready('zatca'), e = D.zatcaErr;
    function zv(n) { return e ? '—' : zl ? '…' : num(n); }
    var acc = cnt('Cleared') + cnt('Cleared with warnings') + cnt('Reported') + cnt('Reported with warnings'), tot = zl ? 0 : z.total_with_status, rej = cnt('Rejected') + cnt('Overdue');
    return [
      kpi({ label: tr('Sent to ZATCA', 'المرسلة إلى زاتكا'), val: zv(tot), sub: esc(t('k_total_sub')), act: tot ? regId('with_status') : null }),
      kpi({ label: tr('Accepted', 'المقبولة'), dot: 'var(--dms-ok)', val: zv(acc), top: !zl && tot ? tagc(esc(pct(acc, tot, 1))) : '', sub: esc(num(cnt('Cleared with warnings') + cnt('Reported with warnings')) + ' ' + tr('with warnings', 'مع تحذيرات')),
        foot: zl ? null : mixBar(['Cleared', 'Cleared with warnings', 'Reported', 'Reported with warnings', 'Pending', 'Rejected', 'Overdue', 'Draft'].map(function (s) { return { label: stLabel(s), value: cnt(s), color: STATUS_COLOR[s] }; })), act: 'goto:zatca' }),
      kpi({ label: tr('Rejected / overdue', 'مرفوضة / متأخرة'), dot: rej ? 'var(--dms-bad)' : 'var(--dms-ok)', val: zv(rej), sub: esc(tr('Fix and resend to ZATCA', 'صحّحها وأعد إرسالها إلى زاتكا')), act: rej ? regId('', 'Rejected,Overdue') : null })
    ];
  }
  function tabOverview(AM) {
    var sc = scopeCompanies(), A = vatAgg(VAT, sc);
    var h = kpis(vatKpis(A).concat(zKpis()), true);
    h += '<div class="dms-main2">' + actionsPanel(AM) + '<div class="dms-stackcol">' +
      panel(t('s_trend'), trendChart(), '', esc(rangeLabel([trendRange()[0], clip(PERIOD)[1]]))) +
      panel(t('s_status_dist'), src('zatca', t('s_status_dist'), statusShare), '', esc(rangeLabel(PERIOD))) + '</div></div>';
    h += '<div class="dms-cols-2 dms-grid">' + panel(t('s_out_in'), outInChart(A, sc), '', esc(t('s_out_in_sub'))) +
      panel(t('s_ageing'), src('zatca', t('s_ageing'), ageingChart), '', esc(t('z_all_dates'))) + '</div>';
    return h + note(esc(t('cov_note')));
  }
  function trendChart() {
    return src('trend', t('s_trend'), function (T) {
      var m = T.months || [], by = {}; m.forEach(function (x) { by[x.month] = x; });
      var R6 = trendRange(), keys = monthList(R6[0], clip(R6)[1]);
      var cur = viewCur(), f = function (v) { return moneyFull(v, cur); };
      return barChart(keys, 'month', [{ label: t('k_output'), color: 'var(--dms-royal)', val: function (k) { return by[k] ? by[k].output_vat : 0; } }, { label: t('k_input'), color: '#a3b4ef', val: function (k) { return by[k] ? by[k].input_vat : 0; } }], f,
        function (k) { return by[k] ? '\n' + t('v_net') + ': ' + f(by[k].net_vat) + '\n' + t('invoices') + ': ' + num(by[k].invoices) : ''; }, t('no_data')) +
        (T.sales_error || T.purchase_error ? alertBox('warn', esc(T.sales_error || T.purchase_error)) : '');
    });
  }
  function statusShare(z) {
    var items = STATUS_ORDER.map(function (s) { return { label: stLabel(s), value: cnt(s), color: STATUS_COLOR[s], act: regId('', s) }; });
    var used = {}; STATUS_ORDER.forEach(function (s) { used[s] = 1; });
    var other = 0; Object.keys(z.by_status).forEach(function (s) { if (!used[s] && s !== '__none__') { other += z.by_status[s].count; } });
    if (other) { items.push({ label: stLabel('other'), value: other, color: STATUS_COLOR.other }); }
    items.push({ label: stLabel('__none__'), value: z.no_status_count || 0, color: STATUS_COLOR.__none__, act: regId('', '__none__') });
    return shareList(items, '<b class="dms-num">' + num(z.total_with_status) + '</b> ' + esc(tr('with a ZATCA status', 'بحالة زاتكا')), num, true);
  }
  function ageingChart(z) {
    var ag = z.ageing, L = [tr('0–1 days', '0–1 يوم'), tr('2–3 days', '2–3 أيام'), tr('4–7 days', '4–7 أيام'), tr('8–30 days', '8–30 يومًا'), tr('31–90 days', '31–90 يومًا'), tr('Over 90 days', 'أكثر من 90 يومًا')], by = {};
    L.forEach(function (l, i) { by[l] = i; });
    return barChart(L, 'cat', [{ label: stLabel('Pending'), color: STATUS_COLOR.Pending, val: function (k) { return ag.pending[by[k]]; } }, { label: stLabel('Draft'), color: STATUS_COLOR.Draft, val: function (k) { return ag.stuck_draft[by[k]]; } }], num, null, tr('No pending or stuck-draft invoices.', 'لا توجد فواتير معلقة أو مسودة عالقة.')) +
      note(esc(t('z_ageing_note')) + (ag.oldest_posting_date ? ' ' + esc(t('z_oldest')) + ': <b>' + esc(fmtDate(ag.oldest_posting_date, true)) + '</b>' : ''));
  }
  function outInChart(A, sc) {
    var rows = sc.filter(function (c) { var r = VAT[c]; return r && r.st === 'ok' && r.data.verdict.status === 'reconciled'; });
    if (!rows.length) { return A.loading ? skel(1, 'dms-skel-panel') : empty(t('v_no_verified')); }
    var keys = rows.map(abbrOf), by = {}; rows.forEach(function (c) { by[abbrOf(c)] = VAT[c].data.ksa_summary; });
    var cur = viewCur(), f = function (v) { return moneyFull(v, cur); };
    return barChart(keys, 'cat', [{ label: t('k_output'), color: 'var(--dms-royal)', val: function (k) { return by[k].output_vat; } }, { label: t('k_input'), color: '#a3b4ef', val: function (k) { return by[k].input_vat; } }], f, function (k) { return '\n' + t('v_net') + ': ' + f(by[k].output_vat - by[k].input_vat); });
  }

  /* ---------- VAT returns ---------- */
  function vatRowsOf(sc) { return sc.map(function (c) { return { c: c, tax: taxIdOf(c), r: VAT[c], p: VATP[c] }; }); }
  function vk(x) { return x.r && x.r.st === 'ok' ? x.r.data.ksa_summary : null; }
  function vcell(x, f) { var k = vk(x); if (!x.r || x.r.st === 'loading') { return '<span class="dms-sm">…</span>'; } if (!k) { return '<span class="dms-sm">—</span>'; } var v = f(k); return '<span class="dms-num' + (x.r.data.verdict.status === 'reconciled' ? '' : ' dms-sm') + '">' + esc(amt(v)) + '</span>'; }
  function tabVat() {
    var sc = scopeCompanies(), A = vatAgg(VAT, sc), cur = viewCur();
    var h = '<div class="dms-actions-row">' + chipRow('vview', VVIEW, [['companies', t('v_view_companies')], ['groups', t('v_view_groups')]]) +
      chipRow('cmp', CMP ? '1' : '0', [['1', t('v_compare_prev') + (CMP ? ' · ' + rangeLabel(prevP()) : '')]]) +
      erpBtn(reportLink(F.company || (sc.length === 1 ? sc[0] : '')), t('v_native_report')) + '</div>';
    if (!A.loading && A.verified === 0) { h += alertBox('warn', esc(t('v_no_verified'))); }
    h += kpis(vatKpis(A).concat([kpi({ label: tr('Taxable sales', 'المبيعات الخاضعة'), val: A.ok === 0 && A.loading ? '…' : A.verified ? cur$(A.taxable, cur) : '—', sub: esc(t('k_taxable_sub')), act: 'vat:taxable' })]));
    h += VVIEW === 'groups' ? panel(t('s_groups'), groupsTable(sc), 'dms-mb', esc(rangeLabel(PERIOD))) : panel(t('s_compare'), companyTable(sc, A, cur), 'dms-mb', esc(rangeLabel(PERIOD) + ' · ' + cur));
    h += panel(t('s_breakdown'), breakdownTable(sc), 'dms-mb', esc(sc.length === 1 ? sc[0] : t('v_scope_total')));
    return h + panel(t('s_recon'), reconTable(sc), '', esc(t('v_tol') + ': 5.00 ' + cur));
  }
  function companyTable(sc, A, cur) {
    var cols = [
      { k: 'c', h: t('v_company'), s: function (x) { return x.c; }, r: function (x) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="pickco" data-v="' + esc(x.c) + '"><bdi>' + esc(x.c) + '</bdi></button>'; }, c: function (x) { return x.c; } },
      { k: 'tax', h: t('v_group_tax'), s: function (x) { return x.tax; }, r: function (x) { return txt(x.tax); }, c: function (x) { return x.tax; } },
      { k: 'taxable', h: t('k_taxable'), num: 1, s: function (x) { var k = vk(x); return k ? k.taxable_sales_net_of_returns : -1e18; }, r: function (x) { return vcell(x, function (k) { return k.taxable_sales_net_of_returns; }); }, c: function (x) { var k = vk(x); return k ? k.taxable_sales_net_of_returns : ''; } },
      { k: 'adj', h: t('v_adjust'), num: 1, r: function (x) { return vcell(x, function (k) { return k.sales_adj; }); }, c: function (x) { var k = vk(x); return k ? k.sales_adj : ''; } },
      { k: 'out', h: t('k_output'), num: 1, s: function (x) { var k = vk(x); return k ? k.output_vat : -1e18; }, r: function (x) { return vcell(x, function (k) { return k.output_vat; }); }, c: function (x) { var k = vk(x); return k ? k.output_vat : ''; } },
      { k: 'in', h: t('k_input'), num: 1, s: function (x) { var k = vk(x); return k ? k.input_vat : -1e18; }, r: function (x) { return vcell(x, function (k) { return k.input_vat; }); }, c: function (x) { var k = vk(x); return k ? k.input_vat : ''; } },
      { k: 'net', h: t('v_net'), num: 1, s: function (x) { var k = vk(x); return k ? k.output_vat - k.input_vat : -1e18; }, r: function (x) { return vcell(x, function (k) { return k.output_vat - k.input_vat; }); }, c: function (x) { var k = vk(x); return k ? r2(k.output_vat - k.input_vat) : ''; } },
      { k: 'st', h: t('v_status'), s: function (x) { return x.r && x.r.st === 'ok' ? x.r.data.verdict.status : x.r ? x.r.st : ''; }, r: function (x) { return !x.r || x.r.st === 'loading' ? '<span class="dms-sm">' + esc(t('v_loading_company')) + '</span>' : x.r.st === 'error' ? stat('bad', t('v_status_error')) + '<span class="dms-sm"> ' + esc(plain(x.r.err, 120)) + '</span>' : vStatus(x.r.data.verdict.status); }, c: function (x) { return x.r && x.r.st === 'ok' ? x.r.data.verdict.status : x.r ? x.r.st : ''; } }
    ];
    if (CMP) {
      cols.push({ k: 'pnet', h: t('v_prev') + ' · ' + t('v_net'), num: 1, r: function (x) { var p = x.p; if (!p || p.st === 'loading') { return '<span class="dms-sm">…</span>'; } if (p.st === 'error') { return stat('bad', t('v_status_error')); } var k = p.data.ksa_summary; return '<span class="dms-num' + (p.data.verdict.status === 'reconciled' ? '' : ' dms-sm') + '">' + esc(amt(k.output_vat - k.input_vat)) + '</span>'; }, c: function (x) { return x.p && x.p.st === 'ok' ? r2(x.p.data.ksa_summary.output_vat - x.p.data.ksa_summary.input_vat) : ''; } });
      cols.push({ k: 'dnet', h: t('v_delta'), num: 1, r: function (x) { var k = vk(x), p = x.p; if (!k || !p || p.st !== 'ok') { return '<span class="dms-sm">—</span>'; } var d = (k.output_vat - k.input_vat) - (p.data.ksa_summary.output_vat - p.data.ksa_summary.input_vat); return '<span class="dms-num' + (d > 0 ? ' dms-tone-warn' : '') + '">' + esc((d > 0 ? '+' : '') + amt(d)) + '</span>'; }, c: function (x) { var k = vk(x), p = x.p; return k && p && p.st === 'ok' ? r2((k.output_vat - k.input_vat) - (p.data.ksa_summary.output_vat - p.data.ksa_summary.input_vat)) : ''; } });
    }
    return regTable({ id: 't_vat', rows: vatRowsOf(sc), cols: cols, sk: 'c', dir: 1, file: 'vat_by_company', text: function (x) { return x.c + ' ' + x.tax; },
      foot: function () { return '<tr><td colspan="2">' + esc(t('v_scope_total')) + ' (' + num(A.verified) + '/' + num(A.n) + ' ' + esc(t('k_verified_of')) + ')</td><td class="dms-td-n">' + amc2(A.taxable) + '</td><td class="dms-td-n">' + amc2(A.sales_adj) + '</td><td class="dms-td-n">' + amc2(A.output) + '</td><td class="dms-td-n">' + amc2(A.input) + '</td><td class="dms-td-n"><b>' + amc2(A.net) + '</b></td><td' + (CMP ? ' colspan="3"' : '') + '></td></tr>'; } }) +
      note(esc(tr('Totals include reconciled companies only. Select a company to scope the whole dashboard to it.', 'الإجماليات تشمل الشركات المطابقة فقط. اختر شركة لحصر اللوحة كلها فيها.')));
  }
  function groupsTable(sc) {
    var rows = META.vat_groups.map(function (g) {
      var members = g.companies.filter(function (c) { return sc.indexOf(c) >= 0; }); if (!members.length) { return null; }
      var A = vatAgg(VAT, members), ic = 0;
      members.forEach(function (c) { var r = VAT[c]; if (r && r.st === 'ok' && r.data.documents.sales_invoice) { ic += r.data.documents.sales_invoice.intercompany_invoices || 0; } });
      return { g: g.tax_id, m: members, A: A, ic: ic };
    }).filter(Boolean);
    return regTable({ id: 't_grp', rows: rows, file: 'vat_groups', text: function (x) { return x.g + ' ' + x.m.join(' '); }, cols: [
      { k: 'g', h: t('v_group_tax'), s: function (x) { return x.g; }, r: function (x) { return x.g ? '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="pickgroup" data-v="' + esc(x.g) + '"><bdi>' + esc(x.g) + '</bdi></button>' : '<span class="dms-sm">' + esc(tr('No tax ID', 'بدون رقم ضريبي')) + '</span>'; }, c: function (x) { return x.g; } },
      { h: t('v_group_members'), r: function (x) { return bdi(x.m.join(', ')); }, c: function (x) { return x.m.join('; '); } },
      { h: t('k_verified_of'), num: 1, r: function (x) { return '<span class="dms-num">' + num(x.A.verified) + '/' + num(x.A.n) + '</span>'; }, c: function (x) { return x.A.verified + '/' + x.A.n; } },
      { h: t('k_taxable'), num: 1, r: function (x) { return amc2(x.A.taxable); }, c: function (x) { return r2(x.A.taxable); } },
      { h: t('k_output'), num: 1, r: function (x) { return amc2(x.A.output); }, c: function (x) { return r2(x.A.output); } },
      { h: t('k_input'), num: 1, r: function (x) { return amc2(x.A.input); }, c: function (x) { return r2(x.A.input); } },
      { h: t('v_net'), num: 1, r: function (x) { return '<b>' + amc2(x.A.net) + '</b>'; }, c: function (x) { return r2(x.A.net); } },
      { h: t('v_status'), r: function (x) { return (x.A.loading ? '<span class="dms-sm">' + esc(t('loading')) + '</span>' : x.A.verified === x.A.n ? stat('ok', t('verified')) : stat('warn', t('partial'))) + (x.ic ? '<span class="dms-sm"> ' + esc(t('v_intercompany')) + ': ' + num(x.ic) + '</span>' : ''); }, c: function (x) { return x.A.verified === x.A.n ? 'Verified' : 'Partial'; } }
    ] }) + note(esc(t('v_group_note')));
  }
  function breakdownTable(sc) {
    var single = sc.length === 1, list = sc.filter(function (c) { var r = VAT[c]; return r && r.st === 'ok' && (single || r.data.verdict.status === 'reconciled'); });
    if (!list.length) { return vatAgg(VAT, sc).loading ? skel(1, 'dms-skel-panel') : empty(t('v_no_verified')); }
    var order = [], map = {};
    list.forEach(function (c) {
      var seen = {};
      VAT[c].data.ksa.rows.forEach(function (r) {
        if (!r.title) { return; }
        var base = r.section + '|' + r.title; seen[base] = (seen[base] || 0) + 1; var key = base + '#' + seen[base];
        if (!map[key]) { map[key] = { section: r.section, title: r.title, header: r.header, amount: 0, adjustment: 0, vat: 0 }; order.push(key); }
        map[key].amount += r.amount; map[key].adjustment += r.adjustment; map[key].vat += r.vat;
      });
    });
    var body = order.map(function (k) {
      var m = map[k];
      if (m.header) { return '<tr class="vz-trh"><th colspan="4" scope="colgroup">' + esc(rtTitle(m.title)) + '</th></tr>'; }
      var tot = m.title.indexOf('Grand Total') === 0 || m.title.indexOf('Difference') === 0, w = function (s) { return tot ? '<b>' + s + '</b>' : s; };
      return '<tr><td>' + w(esc(rtTitle(m.title))) + '</td><td class="dms-td-n">' + (m.title.indexOf('Difference') === 0 ? '' : w(amc2(m.amount))) + '</td><td class="dms-td-n">' + (m.adjustment ? amc2(m.adjustment) : '<span class="dms-sm">—</span>') + '</td><td class="dms-td-n">' + w(amc2(m.vat)) + '</td></tr>';
    }).join('');
    return '<div class="dms-tablewrap"><table class="dms-table"><thead><tr><th>' + esc(t('v_line')) + '</th><th class="dms-th-n">' + esc(t('v_taxable_base')) + '</th><th class="dms-th-n">' + esc(t('v_adjust')) + '</th><th class="dms-th-n">' + esc(t('v_vat')) + '</th></tr></thead><tbody>' + body + '</tbody></table></div>' + note(esc(t('v_base_note')));
  }
  function reconTable(sc) {
    var rows = sc.filter(function (c) { return VAT[c] && VAT[c].st === 'ok'; }).map(function (c) { return { c: c, v: VAT[c].data.verdict }; });
    if (!rows.length) { return vatAgg(VAT, sc).loading ? skel(1, 'dms-skel-panel') : empty(); }
    function three(k, lbl) {
      return [{ h: lbl, num: 1, r: function (x) { var c = x.v[k]; return c ? amc2(c.report) : '<span class="dms-sm">' + esc(t('unavailable')) + '</span>'; }, c: function (x) { return x.v[k] ? x.v[k].report : ''; } },
        { h: k === 'sales_check' ? t('v_si_vat') : t('v_pi_vat'), num: 1, r: function (x) { var c = x.v[k]; return c ? amc2(c.documents) : ''; }, c: function (x) { return x.v[k] ? x.v[k].documents : ''; } },
        { h: t('v_diff'), num: 1, r: function (x) { var c = x.v[k]; return c ? '<span class="dms-num' + (c.ok ? '' : ' dms-tone-bad') + '">' + esc(amt(c.difference)) + '</span>' : ''; }, c: function (x) { return x.v[k] ? x.v[k].difference : ''; } }];
    }
    return regTable({ id: 't_rec', rows: rows, file: 'vat_reconciliation', text: function (x) { return x.c; }, cols: [{ k: 'c', h: t('v_company'), s: function (x) { return x.c; }, r: function (x) { return bdi(x.c); }, c: function (x) { return x.c; } }]
      .concat(three('sales_check', t('v_sales_vat'))).concat(three('purchase_check', t('v_purch_vat'))).concat([
        { k: 'st', h: t('v_status'), s: function (x) { return x.v.status; }, r: function (x) { return vStatus(x.v.status) + (x.v.reasons && x.v.reasons.length ? '<span class="dms-sm"> ' + esc(plain(x.v.reasons.join(' '), 400)) + '</span>' : ''); }, c: function (x) { return x.v.status + ' ' + (x.v.reasons || []).join(' '); } }]) });
  }

  /* ---------- ZATCA ---------- */
  function tabZatca() {
    if (D.zatcaErr) { return srcErr(D.zatcaErr, tr('ZATCA status (Sales Invoice)', 'حالة زاتكا (فواتير المبيعات)')); }
    if (!ready('zatca')) { return '<div class="dms-grid dms-kpis" aria-busy="true">' + skel(10, 'dms-skel-kpi') + '</div>' + skel(1, 'dms-skel-panel'); }
    var z = D.zatca, sc = scopeCompanies();
    var cards = [
      ['k_total', z.total_with_status, '', 'k_total_sub', regId('with_status')], ['k_cleared', cnt('Cleared'), 'var(--dms-ok)', '', regId('', 'Cleared')],
      ['k_cleared_w', cnt('Cleared with warnings'), STATUS_COLOR['Cleared with warnings'], 'k_cleared_w_sub', regId('', 'Cleared with warnings')], ['k_reported', cnt('Reported'), 'var(--dms-ok)', '', regId('', 'Reported')],
      ['k_reported_w', cnt('Reported with warnings'), STATUS_COLOR['Reported with warnings'], '', regId('', 'Reported with warnings')], ['k_pending', cnt('Pending'), STATUS_COLOR.Pending, '', regId('pending')],
      ['st_Rejected', cnt('Rejected'), 'var(--dms-bad)', '', regId('', 'Rejected')], ['k_overdue', cnt('Overdue'), 'var(--dms-bad)', '', regId('', 'Overdue')],
      ['k_draft', cnt('Draft'), STATUS_COLOR.Draft, 'k_draft_sub', regId('', 'Draft')], ['k_nostatus', z.no_status_count, STATUS_COLOR.__none__, 'k_nostatus_sub', regId('', '__none__')]
    ];
    var h = '<div class="vz-wrapk">' + kpis(cards.map(function (c) { return kpi({ label: t(c[0]), dot: c[2] || null, val: num(c[1]), sub: c[3] ? esc(t(c[3])) : '', act: c[1] ? c[4] : null }); })) + '</div>';
    h += note(esc(t('z_status_note')) + ' ' + esc(t('k_draft_unsub')) + ': <b class="dms-num">' + num(z.excluded ? z.excluded.draft_unsubmitted : 0) + '</b> · ' + esc(t('k_cancelled')) + ': <b class="dms-num">' + num(z.excluded ? z.excluded.cancelled : 0) + '</b>');
    var months = (z.monthly_status || []).map(function (m) { return m.month; }), byM = {}; (z.monthly_status || []).forEach(function (m) { byM[m.month] = m.counts; });
    var present = STATUS_ORDER.concat(['__none__']).filter(function (s) { return months.some(function (m) { return byM[m][s]; }); });
    h += '<div class="dms-cols-2 dms-grid">' + panel(t('s_status_dist'), statusShare(z)) + panel(t('s_monthly_status'), stackChart(months, 'month', present.map(function (s) { return { label: stLabel(s), color: STATUS_COLOR[s], val: function (k) { return byM[k][s] || 0; } }; }), num)) + '</div>';
    h += '<div class="dms-cols-2 dms-grid">' + panel(t('s_ageing'), ageingChart(z), '', esc(t('z_all_dates'))) + panel(t('s_timestamps'), '<div class="dms-facts">' +
      fact(t('z_last_clear'), fmtTime(z.last_clearing_time)) + fact(t('z_last_report'), fmtTime(z.last_reporting_time)) + fact(t('z_cleared_nots'), num(z.cleared_without_timestamp), z.cleared_without_timestamp) + fact(t('z_reported_nots'), num(z.reported_without_timestamp), z.reported_without_timestamp) + '</div>') + '</div>';
    h += panel(t('s_by_company'), byCompanyTable(z, sc), 'dms-mb', esc(rangeLabel(PERIOD)));
    h += panel(t('s_warnings'), warnBlock(), 'dms-mb', esc(rangeLabel(PERIOD)));
    h += panel(t('s_rejected_list'), regTable(siSpec('t_rej', 'rejected_all', [], '', { file: 'zatca_rejected' })), 'dms-mb', esc(t('z_all_dates')) + ' · ' + erpBtn(erpFilterLink({ preset: 'rejected_all' })));
    h += panel(t('s_pending_list'), regTable(siSpec('t_pend', 'pending_all', [], '', { order: 'posting_date asc', file: 'zatca_pending' })), 'dms-mb', esc(t('z_all_dates')) + ' · ' + esc(tr('oldest first', 'الأقدم أولًا')));
    return h + panel(t('s_meanings'), '<ul class="dms-list">' + ['cleared', 'cleared_w', 'reported', 'reported_w', 'pending', 'rejected', 'overdue', 'draft', 'cancelled', 'failed'].map(function (k) { return '<li>' + esc(t('m_' + k)) + '</li>'; }).join('') + '</ul>' + note(esc(t('al_report_bug')) + ': ' + esc(t('al_report_bug_sub'))));
  }
  function fact(l, v, bad) { return '<div><span class="dms-sm">' + esc(l) + '</span><b class="dms-num' + (bad ? ' dms-tone-warn' : '') + '">' + esc(v) + '</b></div>'; }
  function byCompanyTable(z, sc) {
    var cols = STATUS_ORDER.slice(0, 8).concat(['__none__']);
    return regTable({ id: 't_zco', rows: sc.map(function (c) { return { c: c, m: z.by_company[c] || {} }; }), file: 'zatca_by_company', text: function (x) { return x.c; }, cols: [
      { k: 'c', h: t('v_company'), s: function (x) { return x.c; }, r: function (x) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="pickco" data-v="' + esc(x.c) + '"><bdi>' + esc(x.c) + '</bdi></button>'; }, c: function (x) { return x.c; } }
    ].concat(cols.map(function (s) {
      return { k: s, h: stLabel(s), num: 1, s: function (x) { return x.m[s] || 0; }, r: function (x) { var n = x.m[s] || 0; return n ? '<button type="button" class="dms-linkbtn dms-num" data-act="kpi" data-v="' + esc(regId('', s, x.c)) + '">' + num(n) + '</button>' : '<span class="dms-sm">0</span>'; }, c: function (x) { return x.m[s] || 0; } };
    })) });
  }
  function warnBlock() {
    if (!WARN) { return '<button type="button" class="dms-btn" data-act="loadwarn">' + esc(t('z_load_warn')) + '</button>'; }
    if (WARN.st === 'loading') { return skel(1, 'dms-skel-panel'); }
    if (WARN.st === 'error') { return srcErr(WARN.kind, t('s_warnings')) + ' <button type="button" class="dms-linkbtn" data-act="loadwarn">' + esc(tr('Retry', 'إعادة المحاولة')) + '</button>'; }
    if (!WARN.data.groups.length) { return empty(t('z_warn_none')); }
    return regTable({ id: 't_warn', rows: WARN.data.groups, file: 'zatca_warnings', text: function (x) { return htmlToText(x.html); }, sk: 'count', dir: -1, cols: [
      { k: 'count', h: t('z_warn_count'), num: 1, s: function (x) { return x.count; }, r: function (x) { return '<b class="dms-num">' + num(x.count) + '</b>'; }, c: function (x) { return x.count; } },
      { h: t('s_warnings'), r: function (x) { return '<span class="vz-pre">' + esc(htmlToText(x.html) || '—') + '</span>'; }, c: function (x) { return htmlToText(x.html); } }] }) + note(esc(WARN.data.note) + ' <button type="button" class="dms-linkbtn" data-act="kpi" data-v="' + esc(regId('warnings')) + '">' + esc(tr('List the invoices', 'عرض الفواتير')) + '</button>');
  }
  function loadWarn() {
    var g = GEN; WARN = { st: 'loading' }; renderSoft();
    safe(function () { return engWarnings(args()); }).then(function (r) { if (g !== GEN) { return; } WARN = { st: 'ok', data: r }; renderSoft(); }, function (e) { if (g !== GEN) { return; } WARN = { st: 'error', kind: errKind(e) }; renderSoft(); });
  }

  /* ---------- register ---------- */
  function tabRegister() {
    var opts = [['', t('r_all_status')]].concat(STATUS_ORDER.map(function (s) { return [s, stLabel(s)]; })).concat([['__none__', stLabel('__none__')]]);
    var h = '<div class="dms-actions-row"><div class="dms-ff vz-ff"><label for="vz-rs">' + esc(t('r_status')) + '</label><select id="vz-rs" class="dms-input" data-rs="1">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (REGST === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      erpBtn(erpFilterLink({ status: REGST, preset: REGST ? '' : 'with_status' })) + '</div>';
    return h + panel(tr('Sales invoices', 'فواتير المبيعات'), regTable(siSpec('t_reg', '', REGST ? [REGST] : [], '', { pageSize: 25, file: 'invoice_register' })), '', esc(rangeLabel(PERIOD) + ' · ' + tr('submitted invoices', 'الفواتير المعتمدة') + (REGST === 'Cancelled' ? ' · ' + tr('cancelled', 'الملغاة') : '')));
  }

  /* ---------- compliance ---------- */
  var EXC_ORDER = [['rejected_all', 'bad', 1], ['stuck_draft', 'warn', 1], ['pending_all', 'warn', 1], ['warnings', 'warn', 0], ['missing_uuid', 'bad', 0], ['missing_buyer_vat', 'warn', 0],
    ['cn_no_return', 'bad', 0], ['cn_unresolved', 'warn', 1], ['zero_vat', 'warn', 0], ['rate_mismatch', 'bad', 0], ['no_status', 'n', 0]];
  var TONEC = { bad: 'var(--dms-bad)', warn: 'var(--dms-age3)', n: '#8a97a8' };
  function tabCompliance() {
    var sc = scopeCompanies(), A = vatAgg(VAT, sc), h = '';
    if (D.excErr) { h += srcErr(D.excErr, t('s_exceptions')); }
    else if (!D.exc || !D.exc.counts) { h += '<div class="dms-grid dms-kpis" aria-busy="true">' + skel(11, 'dms-skel-kpi') + '</div>'; }
    else {
      h += '<div class="vz-wrapk">' + kpis(EXC_ORDER.map(function (x) {
        if (x[0] === 'rate_mismatch') { return rateCard(); }
        var c = excC(x[0]) || {}, failed = !!c.error, n = c.total || 0;
        return kpi({ label: t('ex_' + x[0]), dot: failed ? null : n ? TONEC[x[1]] : 'var(--dms-ok)', val: failed ? '—' : num(n),
          sub: esc(failed ? tr('Could not be counted: ', 'تعذر العد: ') + plain(c.error, 90) : t('exd_' + x[0])), act: !failed && n ? regId(x[0]) : null });
      })) + '</div>';
    }
    h += '<div class="dms-cols-2 dms-grid">' + panel(t('s_ageing'), src('zatca', t('s_ageing'), ageingChart), '', esc(t('z_all_dates'))) + panel(tr('VAT filing evidence', 'دليل تقديم الإقرار'), filingBlock(), '', esc(rangeLabel(PERIOD))) + '</div>';
    var un = A.unverified;
    h += panel(t('s_tax_recon'), A.loading && !A.ok ? skel(1, 'dms-skel-panel') : !un.length ? alertBox('info', esc(t('tx_none'))) : regTable(unvSpec('t_unv', un)), 'dms-mb');
    return h + note(esc(t('arch_note')));
  }
  function unvSpec(id, rows) {
    return { id: id, rows: rows, file: 'vat_unreconciled', text: function (u) { return u.company + ' ' + (u.reasons || []).join(' '); }, cols: [
      { k: 'c', h: t('v_company'), s: function (u) { return u.company; }, r: function (u) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="pickco" data-v="' + esc(u.company) + '"><bdi>' + esc(u.company) + '</bdi></button>'; }, c: function (u) { return u.company; } },
      { h: t('v_status'), r: function (u) { return vStatus(u.status); }, c: function (u) { return u.status; } },
      { h: t('tx_reason'), r: function (u) { return '<span class="dms-sm">' + esc((u.reasons || []).join(' ')) + '</span>'; }, c: function (u) { return (u.reasons || []).join(' '); } },
      { h: '', r: function (u) { return erpBtn(reportLink(u.company), t('open_report')); }, c: function () { return ''; } }] };
  }
  function filingBlock() {
    return src('filing', tr('VAT Summary Form', 'نموذج ملخص الضريبة'), function (f) {
      var h = alertBox('warn', '<b>' + esc(t('al_filing')) + '.</b> ' + esc(t('al_filing_sub')));
      if (!f.available) { return h + srcErr('perm', tr('VAT Summary Form', 'نموذج ملخص الضريبة')); }
      if (!f.forms.length) { return h + empty(tr('No VAT Summary Form overlaps this period.', 'لا يوجد نموذج ملخص ضريبة يغطي هذه الفترة.')); }
      return h + '<div class="vz-forms">' + f.forms.map(function (x) {
        return '<a class="vz-form" href="' + esc(docUrl('VAT Summary Form', x.name)) + '" target="_blank" rel="noopener noreferrer"><bdi>' + esc(x.name) + '</bdi><span class="dms-sm">' + esc(rangeLabel([x.from_date, x.to_date])) + '</span>' + stat(x.docstatus === 1 ? 'ok' : x.docstatus === 2 ? 'n' : 'warn', x.docstatus === 1 ? tr('Submitted', 'معتمد') : x.docstatus === 2 ? tr('Cancelled', 'ملغى') : tr('Draft', 'مسودة')) + '</a>';
      }).join('') + '</div>' + note(esc(tr('A submitted form records the computation only; it does not prove filing or payment at ZATCA.', 'النموذج المعتمد يسجل الاحتساب فقط ولا يثبت التقديم أو السداد لدى زاتكا.')));
    });
  }
  function rateCard() {
    var R = RATE, L = t('ex_rate_mismatch'), d = t('exd_rate_mismatch');
    if (!R) { return kpi({ label: L, val: '—', sub: esc(d) + ' · <b>' + esc(t('x_run')) + '</b>', act: 'runrate', tip: tr('Scans the period in pages of 500 (up to 3,000 invoices).', 'يفحص الفترة على دفعات من 500 (حتى 3,000 فاتورة).') }); }
    if (R.st === 'scanning') { return kpi({ label: L, val: '…', sub: esc(t('x_scanning')) + (R.total ? ' ' + num(R.done) + ' / ' + num(R.total) : '') }); }
    if (R.st === 'unavailable') { return kpi({ label: L, val: '—', sub: esc(t('x_rate_cap') + ' (' + num(R.total) + ')') }); }
    if (R.st === 'error') { return kpi({ label: L, val: '—', sub: esc(tr('Scan failed · run again', 'فشل الفحص · أعد التشغيل')), act: 'runrate' }); }
    var n = R.rows.length;
    return kpi({ label: L, dot: n ? 'var(--dms-bad)' : 'var(--dms-ok)', val: num(n), sub: esc(d + ' · ' + t('x_rate_done') + ' ' + num(R.scanned)), act: n ? 'rate' : null });
  }
  function runRate() {
    if (RATE && RATE.st === 'scanning') { return; }
    var g = GEN; RATE = { st: 'scanning', done: 0, total: 0 }; renderSoft();
    safe(function () { return engRateScan(args(), function (d, tot) { if (g === GEN && RATE && RATE.st === 'scanning') { RATE.done = d; RATE.total = tot; soon(); } }); }).then(function (r) {
      if (g !== GEN) { return; } RATE = r;
      if (r.st === 'ok' && D.exc && D.exc.counts) { D.exc.counts.rate_mismatch = { preset: 'rate_mismatch', total: r.rows.length, grand_total: r2(sum(r.rows, function (x) { return x.grand_total; })) }; }
      renderSoft();
    }, function () { if (g !== GEN) { return; } RATE = { st: 'error' }; renderSoft(); });
  }
  function tabActions(AM) { return actionsTab(AM, tr('Backlog categories (rejected, never transmitted, pending, unresolved credit notes) cover all dates; the others follow the selected period. VAT reconciliation follows the period. All follow the company and VAT group filters.', 'فئات المتأخرات (المرفوضة وغير المرسلة والمعلقة والإشعارات الدائنة غير المحسومة) تشمل كل التواريخ؛ والبقية تتبع الفترة المحددة. مطابقة الضريبة تتبع الفترة. وكلها تتبع مرشحي الشركة والمجموعة الضريبية.')); }

  /* ================================================================== drill-downs */
  function drill(id) {
    if (id === 'cli:a_vat') { var un = vatAgg(VAT, scopeCompanies()).unverified; return { title: tr('Companies whose VAT does not reconcile', 'شركات لا تتطابق ضريبتها'), sub: rangeLabel(PERIOD) + ' · ' + tr('left out of the VAT totals', 'مستبعدة من إجماليات الضريبة'), spec: unvSpec('drill', un) }; }
    if (id.indexOf('reg:') === 0) {
      var p = id.slice(4).split('|'), preset = p[0], status = p[1], co = p[2], all = ALL_DATES_PRESETS.indexOf(preset) >= 0;
      var title = preset ? (I18N.en['ex_' + preset] !== undefined ? t('ex_' + preset) : preset === 'with_status' ? t('k_total') : preset === 'pending' ? t('k_pending') : preset) : status.split(',').map(stLabel).join(' + ');
      var link = erpFilterLink({ preset: preset, status: status, company: co });
      return { title: (co ? co + ' · ' : '') + title, sub: (co || scopeText()) + ' · ' + (all ? t('d_all_dates') : rangeLabel(PERIOD)), body: link ? '<div class="dms-actions-row">' + erpBtn(link) + '</div>' : '',
        spec: siSpec('drill', preset, status ? status.split(',') : [], co, { file: preset || 'zatca_status' }) };
    }
    if (id === 'rate' && RATE && RATE.rows) {
      return { title: t('ex_rate_mismatch'), sub: t('exd_rate_mismatch') + ' · ' + rangeLabel(PERIOD), spec: { rows: RATE.rows, file: 'vat_rate_mismatch', text: function (r) { return [r.name, r.customer_name, r.company].join(' '); }, sk: 'posting_date', dir: -1, cols: [
        { k: 'name', h: t('c_invoice'), s: function (r) { return r.name; }, r: function (r) { return docLink(SI, r.name); }, c: function (r) { return r.name; } },
        { k: 'cust', h: t('c_customer'), s: function (r) { return r.customer_name; }, r: function (r) { return bdi(r.customer_name || r.customer); }, c: function (r) { return r.customer_name; } },
        { k: 'posting_date', h: t('c_date'), s: function (r) { return r.posting_date; }, r: function (r) { return dtc(r.posting_date); }, c: function (r) { return r.posting_date; } },
        { k: 'tx', h: t('c_taxable'), num: 1, s: function (r) { return r.taxable; }, r: function (r) { return amc2(r.taxable); }, c: function (r) { return r.taxable; } },
        { k: 'vat', h: t('c_vat'), num: 1, s: function (r) { return r.vat; }, r: function (r) { return amc2(r.vat); }, c: function (r) { return r.vat; } },
        { k: 'exp', h: tr('15% of net', '15% من الصافي'), num: 1, r: function (r) { return amc2(r2(r.taxable * VAT_RATE / 100)); }, c: function (r) { return r2(r.taxable * VAT_RATE / 100); } },
        { k: 'st', h: t('c_status'), r: function (r) { return stBadge(r.zatca_status); }, c: function (r) { return r.zatca_status; } }] } };
    }
    if (id.indexOf('vat:') === 0) {
      var kind = id.slice(4), sc = scopeCompanies(), A = vatAgg(VAT, sc), key = { taxable: 'k_taxable', output: 'k_output', input: 'k_input', net: 'k_net' }[kind];
      var val = function (k) { return kind === 'taxable' ? k.taxable_sales_net_of_returns : kind === 'output' ? k.output_vat : kind === 'input' ? k.input_vat : k.output_vat - k.input_vat; };
      var docv = function (d) { return kind === 'output' ? (d.sales_invoice ? d.sales_invoice.vat_total : null) : kind === 'taxable' ? (d.sales_invoice ? d.sales_invoice.net_total : null) : kind === 'input' ? (d.purchase_invoice ? d.purchase_invoice.vat_total : null) : null; };
      return { title: t(key), sub: rangeLabel(PERIOD) + ' · ' + viewCur(), body: A.unverified.length ? alertBox('warn', esc(t('v_net_unverified') + ': ' + A.unverified.map(function (u) { return u.company; }).join(', '))) : '', spec: { rows: vatRowsOf(sc), file: 'vat_' + kind, text: function (x) { return x.c; }, cols: [
        { k: 'c', h: t('v_company'), s: function (x) { return x.c; }, r: function (x) { return bdi(x.c); }, c: function (x) { return x.c; } },
        { k: 'v', h: t(key), num: 1, s: function (x) { var k = vk(x); return k ? val(k) : -1e18; }, r: function (x) { return vcell(x, val); }, c: function (x) { var k = vk(x); return k ? r2(val(k)) : ''; } },
        { h: tr('From documents', 'من المستندات'), num: 1, r: function (x) { var v = x.r && x.r.st === 'ok' ? docv(x.r.data.documents) : null; return v == null ? '<span class="dms-sm">—</span>' : amc2(v); }, c: function (x) { var v = x.r && x.r.st === 'ok' ? docv(x.r.data.documents) : null; return v == null ? '' : v; } },
        { h: t('v_status'), r: function (x) { return !x.r || x.r.st === 'loading' ? '…' : x.r.st === 'error' ? stat('bad', t('v_status_error')) : vStatus(x.r.data.verdict.status); }, c: function (x) { return x.r && x.r.st === 'ok' ? x.r.data.verdict.status : ''; } },
        { h: '', r: function (x) { return (kind === 'input' ? erpBtn(piLink(x.c), t('d_open_pi')) : '<button type="button" class="dms-btn dms-btn-sm" data-act="kpi" data-v="' + esc(regId('', '', x.c)) + '">' + esc(t('x_view')) + '</button>') + ' ' + erpBtn(reportLink(x.c), t('open_report')); }, c: function () { return ''; } }] } };
    }
    return null;
  }

  /* ================================================================== events */
  function onAct(a, v) {
    if (a === 'kpi' && v === 'runrate') { runRate(); return true; }
    if (a === 'loadwarn') { loadWarn(); return true; }
    if (a === 'pickco') { applyFilters({ company: v, group: '' }); return true; }
    if (a === 'pickgroup') { applyFilters({ company: '', group: v }); return true; }
    if (a === 'chip') {
      var p = v.split(':');
      if (p[0] === 'vview') { VVIEW = p[1]; renderSoft(); }
      else if (p[0] === 'wk') { WHT.chip(p[1]); }
      else if (p[0] === 'cmp') { CMP = !CMP; if (CMP && canLoad()) { VATP = {}; loadVat(VATP, prevP()); } renderSoft(); }
      var b = HOST.querySelector('[data-act="chip"][data-v^="' + p[0] + ':"]'); if (b) { b.focus(); }
      return true;
    }
    if (a === 'kpi' && v.indexOf('whk:') === 0) { WHT.kpi(v.slice(4)); return true; }
    if (a && a.indexOf('w') === 0 && WHT.act(a, v)) { return true; }
    return false;
  }
  function onInputApp(n) {
    if (n.getAttribute('data-rs')) { if (REGST !== n.value) { REGST = n.value; if (SS.t_reg) { SS.t_reg.page = 1; } renderSoft(); var s = HOST.querySelector('[data-rs]'); if (s) { s.focus(); } } return true; }
    if (n.getAttribute('data-wf')) { return WHT.input(n); }
    return false;
  }

  /* ================================================================== withholding tax (v1 ledger model, kit views) */
  var WHT = (function () {
    var PAGE = 500, ROW_CAP = 5000, CTX_CHUNK = 80, CTX_LIMIT = 5000, TIMEOUT = 60000;
    var WHT_LIKE = ['%with holding tax%', '%withholding tax%', '%withhold%', '%wht%'];
    var MEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var MAR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    var I18N = {
      en: {
        tab: 'Withholding Tax', title: 'Withholding Tax (WHT)', sub: 'General Ledger view of the WHT liability: recorded, paid and outstanding, by company, account and supplier',
        restricted: 'Access to this section is limited to authorised finance roles.', loading: 'Loading withholding tax data...',
        f_company: 'Company', all_co: 'All companies', f_from: 'From date', f_to: 'To date', f_acc: 'GL account', all_acc: 'All WHT accounts', f_sup: 'Supplier', all_sup: 'All suppliers',
        sup_none: 'Unassigned (no supplier link)', sup_multi: 'Multiple suppliers', p_year: 'This year', p_last: 'Last year', p_12m: 'Last 12 months', p_all: 'All history',
        refresh: 'Refresh', updated: 'Last updated', never: 'not yet', retry: 'Retry',
        k_rec: 'Total WHT Recorded', k_paid: 'Total WHT Paid', k_bal: 'WHT GL Balance', k_out: 'Outstanding WHT Payable', k_cnt: 'WHT Transaction Count', k_adj: 'WHT Adjustments', na: 'Not Available',
        s_rec: 'Credit entries in period: {n}', s_recb: 'incl. {x} on bank/cash-linked credits (possible reversals)', s_paid: 'Bank/cash-linked debits: {n} (settlement not confirmed)',
        s_bal: 'Opening {o} / period net {p}', s_out: 'Reconciled credit balance, not necessarily overdue', s_over: 'Net debit balance (advance / overpaid)', s_cnt: 'GL entries in period',
        s_adj: 'Debits with no bank/cash link: {n}', s_noadj: 'No adjustments in period',
        na_cls: 'Debit classification could not be verified', na_trunc: 'Too many rows to verify in one load', na_sup: 'Not defined per supplier', na_recon: 'Could not be reconciled to get_balance_on', na_err: 'Data unavailable',
        sec_over: 'WHT Overview', sec_co: 'WHT by Company', sec_acc: 'WHT by GL Account', sec_sup: 'WHT by Supplier', sec_trend: 'WHT Trends', sec_tx: 'WHT Transaction Details',
        r_open: 'Opening balance', r_rec: 'Recorded (credits)', r_paid: 'Paid (bank/cash-linked)', r_adj: 'Adjustments', r_deb: 'Debits (unclassified)', r_close: 'Closing balance',
        r_ok: 'Reconciled to ERPNext get_balance_on', r_bad: 'Difference to get_balance_on - investigate', r_unv: 'Not verified', r_liab: 'Credit balance = liability to the tax authority',
        c_company: 'Company', c_account: 'GL account', c_open: 'Opening', c_dr: 'Debit', c_cr: 'Credit', c_close: 'Closing (credit)', c_cnt: 'Entries', c_paid: 'Paid', c_adj: 'Adjust.', c_check: 'GL check',
        c_supplier: 'Supplier', c_vouchers: 'Vouchers', c_net: 'Net (Cr-Dr)', c_last: 'Last posting', c_date: 'Posting date', c_vtype: 'Voucher type', c_vno: 'Voucher no.', c_class: 'Type',
        cl_rec: 'Recorded', cl_paid: 'Paid (bank/cash)', cl_adj: 'Adjustment', cl_deb: 'Debit', cl_zero: 'Zero',
        search: 'Search...', per_page: 'Rows', showing: 'Showing {a}-{b} of {n}', prev: 'Previous', next: 'Next', export: 'Export CSV',
        empty: 'No records match.', empty_tx: 'No WHT transactions for the selected company, account and period.', empty_acc: 'No WHT liability account was found (or none is permitted for your user).',
        empty_sup: 'No supplier-linked WHT in this period.', empty_chart: 'No WHT activity in this period to chart.', view_all: 'All transactions', view_rec: 'Recorded (credits)', view_paid: 'Paid (bank/cash-linked debits)', view_adj: 'Adjustments', view_bal: 'Ledger: opening balance, period entries, closing balance',
        showing_view: 'Showing', clear: 'Clear', month: 'Month', ch_act: 'Monthly WHT activity', ch_bal: 'Month-end WHT liability balance', ch_na: 'Not available with a supplier filter',
        lg_rec: 'Recorded', lg_paid: 'Paid (bank/cash)', lg_adj: 'Adjustments', lg_deb: 'Debits', lg_bal: 'Closing balance',
        n_trunc: 'More than {n} entries matched; detail tables and classification are limited, totals still come from GL aggregates.', n_mismatch: 'Row detail did not agree with GL totals (data changed during load). Press Refresh.',
        n_ctx: 'Voucher context was incomplete, so Paid / Adjustment classification is not shown.', n_mixed: 'Companies in scope use different currencies, so totals are not combined.',
        n_sup: 'Supplier filter active: balances are not defined per supplier and are not shown.', n_scope: 'Scope', n_range: 'From date is after To date.', n_nopay: 'Not a ZATCA settlement confirmation: classification is based on the Journal Entry posting a bank or cash account.',
        m_title: 'How figures are calculated',
        m_1: 'Source: GL Entry on WHT liability accounts discovered at run time (non-group Liability accounts whose name contains withholding / with holding tax / WHT), cancelled entries excluded.',
        m_2: 'Closing balance = opening balance + credits - debits (credit shown positive). Every account is checked against ERPNext get_balance_on; unverified balances show Not Available.',
        m_3: 'Paid = debit entries whose voucher also credits a Bank/Cash account. Adjustments = other debits. Neither is proof of settlement with the tax authority.',
        m_4: 'Supplier comes from the Supplier party on the same voucher; entries without one are Unassigned. Period figures are shown separately from cumulative balances.',
        err_timeout: 'The request timed out', err_perm: 'You do not have permission to read this data', err_generic: 'Request failed', err_section: 'Could not load WHT data'
      },
      ar: {
        tab: 'ضريبة الاستقطاع', title: 'ضريبة الاستقطاع (WHT)', sub: 'عرض دفتر الأستاذ لالتزام ضريبة الاستقطاع: المسجّل والمسدّد والمستحق، حسب الشركة والحساب والمورد',
        restricted: 'الوصول إلى هذا القسم مقتصر على أدوار المالية المصرّح لها.', loading: 'جارٍ تحميل بيانات ضريبة الاستقطاع...',
        f_company: 'الشركة', all_co: 'جميع الشركات', f_from: 'من تاريخ', f_to: 'إلى تاريخ', f_acc: 'حساب الأستاذ', all_acc: 'جميع حسابات الاستقطاع', f_sup: 'المورد', all_sup: 'جميع الموردين',
        sup_none: 'غير مرتبط بمورد', sup_multi: 'عدة موردين', p_year: 'هذه السنة', p_last: 'السنة الماضية', p_12m: 'آخر 12 شهراً', p_all: 'كل الفترات',
        refresh: 'تحديث', updated: 'آخر تحديث', never: 'لم يتم بعد', retry: 'إعادة المحاولة',
        k_rec: 'إجمالي الاستقطاع المسجّل', k_paid: 'إجمالي الاستقطاع المسدّد', k_bal: 'رصيد دفتر الأستاذ', k_out: 'الاستقطاع المستحق غير المسدّد', k_cnt: 'عدد حركات الاستقطاع', k_adj: 'تسويات الاستقطاع', na: 'غير متاح',
        s_rec: 'القيود الدائنة في الفترة: {n}', s_recb: 'منها {x} دائن مرتبط بالبنك/النقد (احتمال عكس)', s_paid: 'مدين مرتبط بالبنك/النقد: {n} (السداد غير مؤكد)',
        s_bal: 'افتتاحي {o} / صافي الفترة {p}', s_out: 'رصيد دائن مطابق، وليس بالضرورة متأخراً', s_over: 'رصيد مدين صافٍ (دفعة مقدمة / زيادة سداد)', s_cnt: 'قيود الأستاذ في الفترة',
        s_adj: 'مدين غير مرتبط بالبنك/النقد: {n}', s_noadj: 'لا توجد تسويات في الفترة',
        na_cls: 'تعذّر التحقق من تصنيف المدين', na_trunc: 'عدد الصفوف أكبر من أن يُتحقق منه في تحميل واحد', na_sup: 'غير محدد حسب المورد', na_recon: 'تعذّرت المطابقة مع get_balance_on', na_err: 'البيانات غير متاحة',
        sec_over: 'نظرة عامة على الاستقطاع', sec_co: 'الاستقطاع حسب الشركة', sec_acc: 'الاستقطاع حسب حساب الأستاذ', sec_sup: 'الاستقطاع حسب المورد', sec_trend: 'اتجاهات الاستقطاع', sec_tx: 'تفاصيل حركات الاستقطاع',
        r_open: 'الرصيد الافتتاحي', r_rec: 'المسجّل (دائن)', r_paid: 'المسدّد (مرتبط بالبنك/النقد)', r_adj: 'التسويات', r_deb: 'المدين (غير مصنّف)', r_close: 'الرصيد الختامي',
        r_ok: 'مطابق لـ get_balance_on في ERPNext', r_bad: 'فرق عن get_balance_on - يلزم التحقق', r_unv: 'غير محقق', r_liab: 'الرصيد الدائن = التزام تجاه الجهة الضريبية',
        c_company: 'الشركة', c_account: 'حساب الأستاذ', c_open: 'افتتاحي', c_dr: 'مدين', c_cr: 'دائن', c_close: 'ختامي (دائن)', c_cnt: 'القيود', c_paid: 'مسدّد', c_adj: 'تسويات', c_check: 'مطابقة الأستاذ',
        c_supplier: 'المورد', c_vouchers: 'المستندات', c_net: 'الصافي (دائن-مدين)', c_last: 'آخر ترحيل', c_date: 'تاريخ الترحيل', c_vtype: 'نوع المستند', c_vno: 'رقم المستند', c_class: 'النوع',
        cl_rec: 'مسجّل', cl_paid: 'مسدّد (بنك/نقد)', cl_adj: 'تسوية', cl_deb: 'مدين', cl_zero: 'صفر',
        search: 'بحث...', per_page: 'الصفوف', showing: 'عرض {a}-{b} من {n}', prev: 'السابق', next: 'التالي', export: 'تصدير CSV',
        empty: 'لا توجد سجلات مطابقة.', empty_tx: 'لا توجد حركات استقطاع للشركة والحساب والفترة المحددة.', empty_acc: 'لم يُعثر على حساب التزام ضريبة استقطاع (أو غير مصرّح به لمستخدمك).',
        empty_sup: 'لا توجد ضريبة استقطاع مرتبطة بموردين في هذه الفترة.', empty_chart: 'لا توجد حركة استقطاع في هذه الفترة لعرضها.', view_all: 'جميع الحركات', view_rec: 'المسجّل (دائن)', view_paid: 'المسدّد (مدين مرتبط بالبنك/النقد)', view_adj: 'التسويات', view_bal: 'الأستاذ: الرصيد الافتتاحي وقيود الفترة والرصيد الختامي',
        showing_view: 'المعروض', clear: 'مسح', month: 'الشهر', ch_act: 'نشاط الاستقطاع الشهري', ch_bal: 'رصيد التزام الاستقطاع في نهاية كل شهر', ch_na: 'غير متاح مع فلتر المورد',
        lg_rec: 'مسجّل', lg_paid: 'مسدّد (بنك/نقد)', lg_adj: 'تسويات', lg_deb: 'مدين', lg_bal: 'الرصيد الختامي',
        n_trunc: 'تجاوز عدد القيود {n}؛ جداول التفاصيل والتصنيف محدودة، بينما الإجماليات من تجميع الأستاذ.', n_mismatch: 'تفاصيل الصفوف لا تطابق إجماليات الأستاذ (تغيّرت البيانات أثناء التحميل). اضغط تحديث.',
        n_ctx: 'سياق المستندات غير مكتمل، لذلك لا يُعرض تصنيف المسدّد / التسويات.', n_mixed: 'الشركات ضمن النطاق تستخدم عملات مختلفة، لذلك لا تُجمع الإجماليات.',
        n_sup: 'فلتر المورد مفعّل: الأرصدة غير محددة حسب المورد ولذلك لا تُعرض.', n_scope: 'النطاق', n_range: 'تاريخ البداية بعد تاريخ النهاية.', n_nopay: 'ليس تأكيداً للسداد إلى الهيئة: التصنيف مبني على قيد اليومية الذي يرحّل حساب بنك أو نقد.',
        m_title: 'كيف تُحسب الأرقام',
        m_1: 'المصدر: قيود الأستاذ (GL Entry) على حسابات التزام الاستقطاع المكتشفة وقت التشغيل (حسابات التزامات غير مجمّعة يتضمن اسمها ضريبة الاستقطاع / WHT)، مع استبعاد القيود الملغاة.',
        m_2: 'الرصيد الختامي = الافتتاحي + الدائن - المدين (الدائن موجب). تتم مطابقة كل حساب مع get_balance_on في ERPNext، والأرصدة غير المحققة تظهر غير متاح.',
        m_3: 'المسدّد = قيود مدينة يرحّل مستندها أيضاً دائناً على حساب بنك/نقد. التسويات = بقية القيود المدينة. وليس أي منهما إثباتاً للسداد إلى الجهة الضريبية.',
        m_4: 'المورد يؤخذ من طرف المورد في المستند نفسه، والقيود بدونه تظهر غير مرتبطة. وتُعرض أرقام الفترة منفصلة عن الأرصدة التراكمية.',
        err_timeout: 'انتهت مهلة الطلب', err_perm: 'ليست لديك صلاحية قراءة هذه البيانات', err_generic: 'فشل الطلب', err_section: 'تعذّر تحميل بيانات الاستقطاع'
      }
    };
    var S = { lang: 'en', co: '', from: '', to: '', acc: '', sup: '', k: 'all', mon: '', accounts: [], companies: [], data: null, st: 'idle', err: '', rid: 0, started: false, supNames: {} };
    function t(k) { var d = I18N[LANG] || I18N.en; return d[k] !== undefined ? d[k] : (I18N.en[k] !== undefined ? I18N.en[k] : k); }
    function tf(k, m) { var s = t(k); Object.keys(m).forEach(function (x) { s = s.split('{' + x + '}').join(m[x]); }); return s; }
    function r2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
    function money(x) { return amt(r2(x)); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function call(method, a) { return guarded(null, method, a).catch(function (e) { throw new Error(errKind(e) === 'perm' ? t('err_perm') : (e && e.message) || t('err_generic')); }); }
    function list(doctype, fields, filters, o) {
      o = o || {};
      var a = { doctype: doctype, fields: fields, filters: filters, limit_page_length: o.limit || PAGE, limit_start: o.start || 0 };
      if (o.group_by) { a.group_by = o.group_by; }
      if (o.order_by) { a.order_by = o.order_by; }
      if (o.or_filters) { a.or_filters = o.or_filters; }
      if (o.parent) { a.parent = o.parent; }
      return call('frappe.client.get_list', a).then(function (r) { return r || []; });
    }

    function discover() {
      var or = WHT_LIKE.map(function (p) { return ['name', 'like', p]; });
      return list('Account', ['name', 'company', 'account_type', 'root_type', 'disabled'], [['is_group', '=', 0], ['root_type', '=', 'Liability']], { or_filters: or, limit: 500, order_by: 'company asc, name asc' }).then(function (a) {
        S.accounts = a;
        var seen = {}; a.forEach(function (x) { seen[x.company] = 1; });
        var names = Object.keys(seen).sort();
        if (!names.length) { S.companies = []; return; }
        return list('Company', ['name', 'abbr', 'default_currency'], [['name', 'in', names]], { limit: 200 }).catch(function () { return []; }).then(function (c) {
          S.companies = names.map(function (n) { var r = c.filter(function (z) { return z.name === n; })[0] || {}; return { name: n, abbr: r.abbr || '', cur: r.default_currency || '' }; });
        });
      });
    }
    function scopeAccounts() {
      return S.accounts.filter(function (a) { return (!S.co || a.company === S.co) && (!S.acc || a.name === S.acc); });
    }
    var ROW_FIELDS = ['name', 'posting_date', 'company', 'account', 'voucher_type', 'voucher_no', 'debit', 'credit'];
    function pagedRows(filters) {
      var all = [], seen = {};
      function step(start) {
        return list('GL Entry', ROW_FIELDS, filters, { limit: PAGE, start: start, order_by: 'posting_date asc, creation asc, name asc' }).then(function (r) {
          r.forEach(function (x) { if (!seen[x.name]) { seen[x.name] = 1; all.push(x); } });
          if (r.length < PAGE) { return { rows: all, truncated: false }; }
          if (all.length >= ROW_CAP) { return { rows: all, truncated: true }; }
          return step(start + PAGE);
        });
      }
      return step(0);
    }
    function fetchCtx(rows) {
      var seen = {}, vs = [], types = {};
      rows.forEach(function (r) { if (!seen[r.voucher_type + '|' + r.voucher_no]) { seen[r.voucher_type + '|' + r.voucher_no] = 1; vs.push(r.voucher_no); types[r.voucher_type] = 1; } });
      var chunks = []; for (var i = 0; i < vs.length; i += CTX_CHUNK) { chunks.push(vs.slice(i, i + CTX_CHUNK)); }
      var map = {}, incomplete = false, tl = Object.keys(types);
      return chunks.reduce(function (p, ch) {
        return p.then(function () {
          return list('GL Entry', ['voucher_type', 'voucher_no', 'account', 'party_type', 'party', 'debit', 'credit'], [['voucher_no', 'in', ch], ['voucher_type', 'in', tl], ['is_cancelled', '=', 0]], { limit: CTX_LIMIT }).then(function (r) {
            if (r.length >= CTX_LIMIT) { incomplete = true; }
            r.forEach(function (l) { var k = l.voucher_type + '|' + l.voucher_no; (map[k] = map[k] || []).push(l); });
          });
        });
      }, Promise.resolve()).then(function () { return { map: map, incomplete: incomplete }; });
    }
    function balOn(a, date) {
      return call('erpnext.accounts.utils.get_balance_on', { account: a.name, date: date, company: a.company }).then(function (v) { return (v === undefined || v === null) ? null : Number(v); }).catch(function () { return null; });
    }
    function fetchAll() {
      var acs = scopeAccounts();
      var D = { accs: [], rows: [], cur: '', mixed: false, truncated: false, clsOk: true, aggMismatch: false, from: S.from, to: S.to, noAccounts: !acs.length };
      var cos = {}; acs.forEach(function (a) { cos[a.company] = 1; });
      var cur = {}; Object.keys(cos).forEach(function (c) { var o = S.companies.filter(function (z) { return z.name === c; })[0]; if (o && o.cur) { cur[o.cur] = 1; } });
      var cl = Object.keys(cur); D.cur = cl.length === 1 ? cl[0] : ''; D.mixed = cl.length > 1;
      if (!acs.length) { return Promise.resolve(D); }
      var names = acs.map(function (a) { return a.name; });
      var base = [['is_cancelled', '=', 0], ['account', 'in', names]];
      var per = base.slice(); if (S.from) { per.push(['posting_date', '>=', S.from]); } per.push(['posting_date', '<=', S.to]);
      var AG = ['account', 'sum(debit) as dr', 'sum(credit) as cr', 'count(name) as n'];
      var pOpen = S.from ? list('GL Entry', AG, base.concat([['posting_date', '<', S.from]]), { group_by: 'account', limit: 500 }) : Promise.resolve([]);
      var pPer = list('GL Entry', AG, per, { group_by: 'account', limit: 500 });
      var pRows = pagedRows(per);
      var pBank = list('Account', ['name'], [['account_type', 'in', ['Bank', 'Cash']], ['company', 'in', Object.keys(cos)]], { limit: 3000 }).catch(function () { return null; });
      var pClose = Promise.all(acs.map(function (a) { return balOn(a, S.to); }));
      var pOpenB = Promise.all(acs.map(function (a) { return S.from ? balOn(a, addDays(S.from, -1)) : Promise.resolve(0); }));
      return Promise.all([pOpen, pPer, pRows, pBank, pClose, pOpenB]).then(function (x) {
        var om = {}, pm = {};
        x[0].forEach(function (g) { om[g.account] = g; }); x[1].forEach(function (g) { pm[g.account] = g; });
        D.accs = acs.map(function (a, i) {
          var o = om[a.name] || {}, p = pm[a.name] || {};
          var open = r2(r2(o.cr) - r2(o.dr)), close = r2(open + r2(p.cr) - r2(p.dr));
          return { name: a.name, company: a.company, disabled: a.disabled, open: open, dr: r2(p.dr), cr: r2(p.cr), n: +p.n || 0, close: close,
            okClose: x[4][i] !== null && Math.abs(r2(-x[4][i]) - close) < 0.01, okOpen: x[5][i] !== null && Math.abs(r2(-x[5][i]) - open) < 0.01 };
        });
        D.rows = x[2].rows; D.truncated = x[2].truncated;
        if (!D.truncated) {
          var sd = 0, sc = 0, ad = 0, ac = 0;
          D.rows.forEach(function (r) { sd += r.debit; sc += r.credit; });
          D.accs.forEach(function (a) { ad += a.dr; ac += a.cr; });
          if (Math.abs(r2(sd) - r2(ad)) > 0.01 || Math.abs(r2(sc) - r2(ac)) > 0.01 || D.rows.length !== D.accs.reduce(function (s, a) { return s + a.n; }, 0)) { D.aggMismatch = true; }
        }
        var bank = {}; if (x[3] === null) { D.clsOk = false; } else { x[3].forEach(function (b) { bank[b.name] = 1; }); }
        if (!D.rows.length) { return D; }
        return fetchCtx(D.rows).then(function (ctx) {
          var wht = {}; S.accounts.forEach(function (a) { wht[a.name] = 1; });
          if (ctx.incomplete) { D.clsOk = false; }
          D.rows.forEach(function (r) {
            var L = ctx.map[r.voucher_type + '|' + r.voucher_no] || [], other = L.filter(function (l) { return !wht[l.account]; }), sp = {};
            L.forEach(function (l) { if (l.party_type === 'Supplier' && l.party) { sp[l.party] = 1; } });
            r.sups = Object.keys(sp);
            var bcr = other.some(function (l) { return l.credit > 0 && bank[l.account]; }), bdr = other.some(function (l) { return l.debit > 0 && bank[l.account]; });
            r.cls = r.debit > 0 ? (bcr ? 'paid' : 'adj') : (r.credit > 0 ? 'rec' : 'zero');
            r.bankCr = r.credit > 0 && bdr;
            r.net = r2(r.credit - r.debit);
          });
          return D;
        }).catch(function () { D.clsOk = false; D.rows.forEach(function (r) { r.sups = []; r.cls = r.debit > 0 ? 'deb' : 'rec'; r.net = r2(r.credit - r.debit); }); return D; });
      });
    }
    function loadSupNames(D) {
      var ids = {}; D.rows.forEach(function (r) { (r.sups || []).forEach(function (s) { if (!S.supNames[s]) { ids[s] = 1; } }); });
      var l = Object.keys(ids); if (!l.length) { return Promise.resolve(); }
      return list('Supplier', ['name', 'supplier_name'], [['name', 'in', l]], { limit: 1000 }).then(function (r) { r.forEach(function (s) { S.supNames[s.name] = s.supplier_name || s.name; }); }).catch(function () { l.forEach(function (s) { S.supNames[s] = s; }); });
    }
    function monthsBetween(a, b) {
      var out = [], y = +a.slice(0, 4), m = +a.slice(5, 7), ey = +b.slice(0, 4), em = +b.slice(5, 7);
      while ((y < ey || (y === ey && m <= em)) && out.length < 600) { out.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } }
      return out;
    }
    function supKey(r) { var s = r.sups || []; return s.length === 0 ? '__none__' : (s.length > 1 ? '__multi__' : s[0]); }
    function supLabel(k) { if (k === '__none__') { return t('sup_none'); } if (k === '__multi__') { return t('sup_multi'); } var n = S.supNames[k]; return n && n !== k ? k + ' - ' + n : k; }
    function supOptions() {
      var D = S.data; if (!D) { return []; }
      var m = {}; D.rows.forEach(function (r) { m[supKey(r)] = 1; });
      var out = Object.keys(m).filter(function (k) { return k.indexOf('__') !== 0; }).sort().map(function (k) { return { v: k, l: supLabel(k) }; });
      if (m.__multi__) { out.push({ v: '__multi__', l: t('sup_multi') }); }
      if (m.__none__) { out.push({ v: '__none__', l: t('sup_none') }); }
      return out;
    }
    function sumBy(rows, f) { var s = 0; rows.forEach(function (r) { s += f(r); }); return r2(s); }
    function sumAcc(accs, k) { var s = 0; accs.forEach(function (a) { s += a[k]; }); return r2(s); }
    function model() {
      var D = S.data, M = {}, supOn = !!S.sup, mixed = D.mixed;
      M.supOn = supOn; M.rowsOk = !D.truncated && !D.aggMismatch; M.clsOk = D.clsOk && M.rowsOk && !D.noAccounts;
      M.rs = supOn ? D.rows.filter(function (r) { return supKey(r) === S.sup; }) : D.rows;
      var rs = M.rs;
      function nz(v) { return mixed ? null : v; }
      M.cnt = nz(supOn ? (M.rowsOk ? rs.length : null) : D.accs.reduce(function (s, a) { return s + a.n; }, 0));
      M.rec = nz(supOn ? (M.rowsOk ? sumBy(rs, function (r) { return r.credit; }) : null) : sumAcc(D.accs, 'cr'));
      M.deb = nz(supOn ? (M.rowsOk ? sumBy(rs, function (r) { return r.debit; }) : null) : sumAcc(D.accs, 'dr'));
      M.paid = nz(M.clsOk ? sumBy(rs, function (r) { return r.cls === 'paid' ? r.debit : 0; }) : null);
      M.adj = nz(M.clsOk ? sumBy(rs, function (r) { return r.cls === 'adj' ? r.debit : 0; }) : null);
      M.nPaid = M.clsOk ? rs.filter(function (r) { return r.cls === 'paid'; }).length : 0;
      M.nAdj = M.clsOk ? rs.filter(function (r) { return r.cls === 'adj'; }).length : 0;
      M.nRec = rs.filter(function (r) { return r.credit > 0; }).length;
      M.recBank = M.clsOk ? sumBy(rs, function (r) { return r.bankCr ? r.credit : 0; }) : 0;
      var allClose = D.accs.length > 0 && D.accs.every(function (a) { return a.okClose; });
      var allOpen = D.accs.every(function (a) { return a.okOpen; });
      M.reconClose = allClose; M.reconOpen = allOpen;
      M.open = nz(supOn ? null : sumAcc(D.accs, 'open'));
      M.close = nz(supOn || !allClose ? null : sumAcc(D.accs, 'close'));
      M.out = M.close === null ? null : Math.max(M.close, 0);
      M.net = (M.rec !== null && M.deb !== null) ? r2(M.rec - M.deb) : null;
      return M;
    }
    function why(M, kind) {
      var D = S.data;
      if (D.mixed) { return t('n_mixed'); }
      if (kind === 'cls') { return D.truncated ? t('na_trunc') : (D.aggMismatch ? t('n_mismatch') : t('na_cls')); }
      if (kind === 'bal') { return M.supOn ? t('na_sup') : t('na_recon'); }
      if (kind === 'sup') { return D.truncated ? t('na_trunc') : t('na_err'); }
      return t('na_err');
    }
    function cur() { return S.data && S.data.cur ? S.data.cur + ' ' : ''; }
    function cell(x) { return x === null || x === undefined ? '<span class="wh-na">' + esc(t('na')) + '</span>' : esc(money(x)); }
    function series(M) {
      var D = S.data, first = S.from ? S.from.slice(0, 7) : (D.rows.length ? D.rows[0].posting_date.slice(0, 7) : S.to.slice(0, 7)), last = S.to.slice(0, 7);
      var ms = monthsBetween(first, last), by = {};
      M.rs.forEach(function (r) { var m = r.posting_date.slice(0, 7), o = by[m] || (by[m] = { rec: 0, paid: 0, adj: 0, deb: 0 }); o.rec += r.credit; if (r.debit > 0) { if (M.clsOk) { o[r.cls === 'paid' ? 'paid' : 'adj'] += r.debit; } else { o.deb += r.debit; } } });
      var run = M.open === null ? null : M.open, out = ms.map(function (m) {
        var o = by[m] || { rec: 0, paid: 0, adj: 0, deb: 0 };
        if (run !== null) { run = r2(run + o.rec - o.paid - o.adj - o.deb); }
        return { m: m, rec: r2(o.rec), paid: r2(o.paid), adj: r2(o.adj), deb: r2(o.deb), bal: run };
      });
      var cut = out.length > 60; return { s: cut ? out.slice(out.length - 60) : out, cut: cut };
    }
    var CLS = { rec: 'cl_rec', paid: 'cl_paid', adj: 'cl_adj', deb: 'cl_deb', zero: 'cl_zero' };
    function viewRows(M) {
      var rows = M.rs.filter(function (r) {
        if (S.mon && r.posting_date.slice(0, 7) !== S.mon) { return false; }
        if (S.k === 'rec') { return r.credit > 0; }
        if (S.k === 'paid') { return M.clsOk ? r.cls === 'paid' : r.debit > 0; }
        if (S.k === 'adj') { return M.clsOk ? r.cls === 'adj' : r.debit > 0; }
        return true;
      });
      var asc = S.k === 'bal' || S.k === 'out';
      return rows.slice().sort(function (a, b) { var d = a.posting_date < b.posting_date ? -1 : (a.posting_date > b.posting_date ? 1 : 0); if (!d) { d = a.voucher_no < b.voucher_no ? -1 : (a.voucher_no > b.voucher_no ? 1 : 0); } return asc ? d : -d; });
    }
    /* Scope: the dashboard company, or (no company) the WHT accounts of system-currency companies; period = dashboard period up to today. */
    function inScope(a) { if (S.co) { return a.company === S.co; } var c = S.companies.filter(function (z) { return z.name === a.company; })[0]; return !c || !c.cur || c.cur === CUR; }
    var baseScope = scopeAccounts;
    scopeAccounts = function () { return baseScope().filter(inScope); };
    function sync() { var p = clip(PERIOD); S.co = F.company || ''; S.from = p[0]; S.to = p[1] > TODAY ? TODAY : p[1]; }
    function load() {
      sync();
      var id = ++S.rid, g = GEN; S.st = 'loading'; S.err = ''; soon();
      return discover().then(function () {
        if (S.acc && !S.accounts.some(function (a) { return a.name === S.acc; })) { S.acc = ''; }
        return fetchAll();
      }).then(function (Dx) {
        if (id !== S.rid || g !== GEN) { return; }
        return loadSupNames(Dx).then(function () { if (id !== S.rid || g !== GEN) { return; } S.data = Dx; S.st = 'ok'; if (S.sup && !supOptions().some(function (o) { return o.v === S.sup; })) { S.sup = ''; } soon(); });
      }).catch(function (e) { if (id !== S.rid || g !== GEN) { return; } S.st = 'err'; S.err = e && e.message ? e.message : t('err_generic'); soon(); });
    }
    function c$(v) { return v == null ? '—' : cur$(v, S.data && S.data.cur || CUR); }
    function cellv(x) { return x == null ? '<span class="dms-sm">' + esc(t('na')) + '</span>' : amc2(x); }
    function chkb(ok) { return ok ? stat('ok', tr('Reconciled', 'مطابق')) : stat('bad', tr('Check', 'راجع')); }
    function coLabel(n) { var c = S.companies.filter(function (z) { return z.name === n; })[0]; return c && c.abbr ? c.abbr + ' · ' + n : n; }
    function kpisW(M) {
      function k(id, label, v, sub, dot) { return kpi({ label: label, dot: dot || null, val: v == null ? '—' : id === 'cnt' ? num(v) : c$(v), sub: esc(sub), act: 'whk:' + id }); }
      var over = M.close !== null && M.close < 0;
      return kpis([
        k('rec', t('k_rec'), M.rec, M.rec === null ? why(M, 'sup') : tf('s_rec', { n: M.rowsOk ? M.nRec : '' }) + (M.recBank > 0 ? ' · ' + tf('s_recb', { x: money(M.recBank) }) : ''), 'var(--dms-royal)'),
        k('paid', t('k_paid'), M.paid, M.paid === null ? why(M, 'cls') : tf('s_paid', { n: M.nPaid }), 'var(--dms-ok)'),
        k('bal', t('k_bal'), M.close, M.close === null ? why(M, 'bal') : tf('s_bal', { o: money(M.open), p: money(M.net) })),
        k('out', t('k_out'), M.out, M.out === null ? why(M, 'bal') : (over ? t('s_over') + ': ' + money(-M.close) : t('s_out')), 'var(--dms-age3)'),
        k('cnt', t('k_cnt'), M.cnt, t('s_cnt')),
        k('adj', t('k_adj'), M.adj, M.adj === null ? why(M, 'cls') : (M.nAdj ? tf('s_adj', { n: M.nAdj }) : t('s_noadj')), 'var(--dms-bad)')
      ]);
    }
    function pickers() {
      var acO = S.accounts.filter(inScope).map(function (a) { return [a.name, a.name]; });
      var sel = function (key, label, none, list, cur) { return '<div class="dms-ff vz-ff"><label for="wh-' + key + '">' + esc(label) + '</label><select id="wh-' + key + '" class="dms-input" data-wf="' + key + '"' + (S.data ? '' : ' disabled') + '>' + '<option value="">' + esc(none) + '</option>' + list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>'; };
      return '<div class="dms-actions-row">' + sel('acc', t('f_acc'), t('all_acc'), acO, S.acc) + sel('sup', t('f_sup'), t('all_sup'), supOptions().map(function (o) { return [o.v, o.l]; }), S.sup) +
        (S.k !== 'all' || S.mon ? '<span class="dms-chip"><span class="dms-chip-k">' + esc(t('showing_view')) + '</span> ' + esc(viewTitle()) + (S.mon ? ' · ' + esc(bucketLabel(S.mon, 'month')) : '') + ' <button type="button" class="dms-chip-x" data-act="wclear" aria-label="' + esc(t('clear')) + '">×</button></span>' : '') + '</div>';
    }
    function viewTitle() { return t({ all: 'view_all', cnt: 'view_all', rec: 'view_rec', paid: 'view_paid', adj: 'view_adj', bal: 'view_bal', out: 'view_bal' }[S.k] || 'view_all'); }
    function view() {
      if (!S.started) { ensure(); }
      if (S.st === 'err') { return alertBox('err', esc(t('err_section') + ': ' + S.err) + ' <button type="button" class="dms-linkbtn" data-act="wrefresh">' + esc(t('retry')) + '</button>'); }
      if (!S.data) { return '<div class="dms-grid dms-kpis" aria-busy="true">' + skel(6, 'dms-skel-kpi') + '</div>' + skel(1, 'dms-skel-panel'); }
      var Dx = S.data;
      if (Dx.noAccounts) { return empty(t('empty_acc')); }
      var M = model(), h = '';
      if (Dx.truncated) { h += alertBox('warn', esc(tf('n_trunc', { n: ROW_CAP }))); } else if (Dx.aggMismatch) { h += alertBox('warn', esc(t('n_mismatch'))); } else if (!Dx.clsOk) { h += alertBox('warn', esc(t('n_ctx'))); }
      if (Dx.mixed) { h += alertBox('warn', esc(t('n_mixed'))); }
      if (M.supOn) { h += alertBox('info', esc(t('n_sup'))); }
      h += pickers() + kpisW(M);
      var mid = M.clsOk ? [[t('r_paid'), M.paid, '−'], [t('r_adj'), M.adj, '−']] : [[t('r_deb'), M.deb, '−']];
      var roll = [[t('r_open'), M.open, ''], [t('r_rec'), M.rec, '+']].concat(mid).concat([[t('r_close'), M.close, '=']]);
      h += panel(t('sec_over'), '<div class="dms-facts">' + roll.map(function (r) { return '<div><span class="dms-sm">' + esc((r[2] ? r[2] + ' ' : '') + r[0]) + '</span><b class="dms-num">' + (r[1] == null ? esc(t('na')) : esc(money(r[1]))) + '</b></div>'; }).join('') + '</div>' +
        note(esc(M.supOn ? t('n_sup') : M.reconClose ? t('r_ok') : Dx.accs.length ? t('r_bad') : t('r_unv')) + ' · ' + esc(t('r_liab')) + ' · ' + esc(t('n_nopay'))), 'dms-mb', esc((Dx.cur || '') + ' · ' + rangeLabel([S.from, S.to])));
      h += trends(M);
      h += panel(t('sec_co'), coTable(M), 'dms-mb') + panel(t('sec_acc'), accTable(M), 'dms-mb');
      h += panel(t('sec_sup'), (M.rowsOk ? '' : alertBox('warn', esc(t('na_trunc')))) + supTable(M) + note(esc(t('m_4'))), 'dms-mb');
      h += panel(t('sec_tx'), txTable(M), 'dms-mb', esc(viewTitle()));
      return h + panel(t('m_title'), '<ul class="dms-list"><li>' + esc(t('m_1')) + '</li><li>' + esc(t('m_2')) + '</li><li>' + esc(t('m_3')) + '</li><li>' + esc(t('m_4')) + '</li></ul>');
    }
    function trends(M) {
      if (!M.rowsOk) { return panel(t('sec_trend'), alertBox('warn', esc(t('na_trunc'))), 'dms-mb'); }
      var sr = series(M), ser = sr.s, by = {}; ser.forEach(function (s) { by[s.m] = s; });
      var keys = ser.map(function (s) { return s.m; }), f = function (v) { return moneyFull(v, S.data.cur || CUR); };
      var bars = M.clsOk ? [{ label: t('lg_rec'), color: 'var(--dms-royal)', val: function (k) { return by[k].rec; } }, { label: t('lg_paid'), color: 'var(--dms-ok)', val: function (k) { return by[k].paid; } }, { label: t('lg_adj'), color: 'var(--dms-bad)', val: function (k) { return by[k].adj; } }]
        : [{ label: t('lg_rec'), color: 'var(--dms-royal)', val: function (k) { return by[k].rec; } }, { label: t('lg_deb'), color: '#8a97a8', val: function (k) { return by[k].deb; } }];
      var balOk = M.open !== null && M.close !== null;
      return '<div class="dms-cols-2 dms-grid">' + panel(t('ch_act'), barChart(keys, 'month', bars, f, null, t('empty_chart')) + note(esc(tr('Select a month in the transactions table filter to list its entries.', 'اختر شهرًا من جدول القيود لعرض قيوده.'))), '', esc(S.data.cur || '')) +
        panel(t('ch_bal'), balOk && keys.length < 2 ? empty(tr('Choose a period covering two months or more to see the month-end trend.', 'اختر فترة تغطي شهرين أو أكثر لعرض اتجاه نهاية الشهر.')) : balOk ? lineChart(keys, 'month', [{ label: t('lg_bal'), color: 'var(--dms-royal)', val: function (k) { return by[k].bal; } }], f) : empty(M.supOn ? t('ch_na') : t('na')), '', esc(S.data.cur || '')) + '</div>';
    }
    function coTable(M) {
      var Dx = S.data, names = S.co ? [S.co] : uniq(Dx.accs.map(function (a) { return a.company; }));
      var rows = names.map(function (n) {
        var A = Dx.accs.filter(function (a) { return a.company === n; }), R = M.rs.filter(function (r) { return r.company === n; }), allOk = A.length && A.every(function (a) { return a.okClose; });
        return { n: n, open: (M.supOn || Dx.mixed) ? null : sumAcc(A, 'open'), cr: M.supOn ? (M.rowsOk ? sumBy(R, function (r) { return r.credit; }) : null) : sumAcc(A, 'cr'), dr: M.supOn ? (M.rowsOk ? sumBy(R, function (r) { return r.debit; }) : null) : sumAcc(A, 'dr'),
          paid: M.clsOk ? sumBy(R, function (r) { return r.cls === 'paid' ? r.debit : 0; }) : null, close: (M.supOn || Dx.mixed || !allOk) ? null : sumAcc(A, 'close'), cnt: M.supOn ? R.length : sumAcc(A, 'n'), ok: !!allOk, hasAcc: A.length > 0 };
      });
      return regTable({ id: 'w_co', rows: rows, file: 'wht_by_company', text: function (r) { return coLabel(r.n); }, empty: t('empty_acc'), cols: [
        { k: 'n', h: t('c_company'), s: function (r) { return r.n; }, r: function (r) { return bdi(coLabel(r.n)); }, c: function (r) { return r.n; } },
        { h: t('c_open'), num: 1, r: function (r) { return cellv(r.open); }, c: function (r) { return r.open; } }, { h: t('c_cr'), num: 1, r: function (r) { return cellv(r.cr); }, c: function (r) { return r.cr; } },
        { h: t('c_dr'), num: 1, r: function (r) { return cellv(r.dr); }, c: function (r) { return r.dr; } }, { h: t('c_paid'), num: 1, r: function (r) { return cellv(r.paid); }, c: function (r) { return r.paid; } },
        { k: 'close', h: t('c_close'), num: 1, s: function (r) { return r.close == null ? -1e18 : r.close; }, r: function (r) { return cellv(r.close); }, c: function (r) { return r.close; } },
        { h: t('c_check'), r: function (r) { return r.hasAcc ? chkb(r.ok) : ''; }, c: function (r) { return r.ok ? 'OK' : 'Check'; } }] });
    }
    function accTable(M) {
      var Dx = S.data;
      return regTable({ id: 'w_acc', rows: Dx.accs, file: 'wht_by_account', text: function (a) { return a.name + ' ' + a.company; }, empty: t('empty_acc'), cols: [
        { k: 'name', h: t('c_account'), s: function (a) { return a.name; }, r: function (a) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="wacc" data-v="' + esc(a.name) + '"><bdi>' + esc(a.name) + '</bdi></button>' + (a.disabled ? ' <span class="dms-sm">(' + esc(tr('disabled', 'معطل')) + ')</span>' : ''); }, c: function (a) { return a.name; } },
        { h: t('c_dr'), num: 1, r: function (a) { return cellv(a.dr); }, c: function (a) { return a.dr; } }, { h: t('c_cr'), num: 1, r: function (a) { return cellv(a.cr); }, c: function (a) { return a.cr; } },
        { k: 'close', h: t('c_close'), num: 1, s: function (a) { return a.close; }, r: function (a) { return (M.supOn || !a.okClose) ? cellv(null) : cellv(a.close); }, c: function (a) { return a.close; } },
        { h: t('c_cnt'), num: 1, r: function (a) { return '<span class="dms-num">' + num(a.n) + '</span>'; }, c: function (a) { return a.n; } },
        { h: t('c_check'), r: function (a) { return chkb(a.okClose); }, c: function (a) { return a.okClose ? 'OK' : 'Check'; } }] });
    }
    function supTable(M) {
      var g = {};
      M.rs.forEach(function (r) { var k = supKey(r), o = g[k] || (g[k] = { k: k, cr: 0, dr: 0, v: {}, last: '' }); o.cr += r.credit; o.dr += r.debit; o.v[r.voucher_type + r.voucher_no] = 1; if (r.posting_date > o.last) { o.last = r.posting_date; } });
      var rows = Object.keys(g).map(function (k) { var o = g[k]; return { k: k, cr: r2(o.cr), dr: r2(o.dr), net: r2(o.cr - o.dr), vc: Object.keys(o.v).length, last: o.last }; });
      return regTable({ id: 'w_sup', rows: rows, file: 'wht_by_supplier', sk: 'cr', dir: -1, text: function (r) { return supLabel(r.k); }, empty: t('empty_sup'), cols: [
        { k: 'k', h: t('c_supplier'), s: function (r) { return supLabel(r.k); }, r: function (r) { return '<button type="button" class="dms-linkbtn dms-cell-btn" data-act="wsup" data-v="' + esc(r.k) + '"><bdi>' + esc(supLabel(r.k)) + '</bdi></button>'; }, c: function (r) { return supLabel(r.k); } },
        { k: 'vc', h: t('c_vouchers'), num: 1, s: function (r) { return r.vc; }, r: function (r) { return '<span class="dms-num">' + num(r.vc) + '</span>'; }, c: function (r) { return r.vc; } },
        { k: 'cr', h: t('c_cr'), num: 1, s: function (r) { return r.cr; }, r: function (r) { return cellv(r.cr); }, c: function (r) { return r.cr; } }, { k: 'dr', h: t('c_dr'), num: 1, s: function (r) { return r.dr; }, r: function (r) { return cellv(r.dr); }, c: function (r) { return r.dr; } },
        { k: 'net', h: t('c_net'), num: 1, s: function (r) { return r.net; }, r: function (r) { return '<b>' + cellv(r.net) + '</b>'; }, c: function (r) { return r.net; } }, { k: 'last', h: t('c_last'), s: function (r) { return r.last; }, r: function (r) { return dtc(r.last); }, c: function (r) { return r.last; } }] });
    }
    var CLSK = { rec: 'ok', paid: 'ok', adj: 'warn', deb: 'n', zero: 'n' };
    function txTable(M) {
      var rows = viewRows(M), months = uniq(M.rs.map(function (r) { return r.posting_date.slice(0, 7); })).sort();
      function sp(r) { var k = supKey(r); return k === '__none__' ? '' : supLabel(k); }
      var mon = '<div class="dms-ff vz-ff"><label for="wh-mon">' + esc(t('month')) + '</label><select id="wh-mon" class="dms-input" data-wf="mon"><option value="">' + esc(tr('All months', 'كل الأشهر')) + '</option>' + months.map(function (m) { return '<option value="' + m + '"' + (S.mon === m ? ' selected' : '') + '>' + esc(bucketLabel(m, 'month')) + '</option>'; }).join('') + '</select></div>';
      var kv = chipRow('wk', S.k === 'cnt' ? 'all' : S.k === 'out' ? 'bal' : S.k, [['all', t('view_all')], ['rec', t('view_rec')], ['paid', t('view_paid')], ['adj', t('view_adj')]]);
      var ledger = (S.k === 'bal' || S.k === 'out') && M.open !== null ? note(esc(t('r_open') + ': ' + money(M.open) + '  +  ' + t('r_rec') + ': ' + money(M.rec) + '  −  ' + t('lg_deb') + ': ' + money(M.deb) + '  =  ' + t('r_close') + ': ' + (M.close == null ? t('na') : money(M.close)))) : '';
      return '<div class="dms-actions-row">' + kv + mon + '</div>' + ledger + regTable({ id: 'w_tx', rows: rows, file: 'wht_transactions', text: function (r) { return [r.posting_date, r.company, r.account, r.voucher_type, r.voucher_no, sp(r), t(CLS[r.cls] || 'cl_deb')].join(' '); }, empty: t('empty_tx'), cols: [
        { k: 'd', h: t('c_date'), s: function (r) { return r.posting_date; }, r: function (r) { return dtc(r.posting_date); }, c: function (r) { return r.posting_date; } },
        { h: t('c_company'), r: function (r) { return bdi(coLabel(r.company)); }, c: function (r) { return r.company; } }, { h: t('c_account'), r: function (r) { return bdi(r.account); }, c: function (r) { return r.account; } },
        { h: t('c_vno'), r: function (r) { return docLink(r.voucher_type, r.voucher_no) + '<span class="dms-sm"> ' + esc(r.voucher_type) + '</span>'; }, c: function (r) { return r.voucher_type + ' ' + r.voucher_no; } },
        { h: t('c_supplier'), r: function (r) { return sp(r) ? bdi(sp(r)) : '<span class="dms-sm">—</span>'; }, c: function (r) { return sp(r); } },
        { k: 'dr', h: t('c_dr'), num: 1, s: function (r) { return r.debit; }, r: function (r) { return r.debit ? amc2(r.debit) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.debit; } },
        { k: 'cr', h: t('c_cr'), num: 1, s: function (r) { return r.credit; }, r: function (r) { return r.credit ? amc2(r.credit) : '<span class="dms-sm">—</span>'; }, c: function (r) { return r.credit; } },
        { k: 'net', h: t('c_net'), num: 1, s: function (r) { return r.net; }, r: function (r) { return '<b>' + amc2(r.net) + '</b>'; }, c: function (r) { return r.net; } },
        { h: t('c_class'), r: function (r) { return stat(CLSK[r.cls] || 'n', t(CLS[r.cls] || 'cl_deb')); }, c: function (r) { return r.cls; } }],
        foot: function (f) { return '<tr><td colspan="5">' + esc(tr('Total', 'الإجمالي')) + ' (' + num(f.length) + ')</td><td class="dms-td-n">' + amc2(sumBy(f, function (r) { return r.debit; })) + '</td><td class="dms-td-n">' + amc2(sumBy(f, function (r) { return r.credit; })) + '</td><td class="dms-td-n"><b>' + amc2(sumBy(f, function (r) { return r.net; })) + '</b></td><td></td></tr>'; } });
    }
    function ensure() { if (!S.started && canLoad0()) { S.started = true; load(); } }
    function canLoad0() { return roleOk() && META; }
    function act(a, v) {
      if (a === 'wrefresh') { S.started = true; load(); return true; }
      if (a === 'wclear') { S.k = 'all'; S.mon = ''; renderSoft(); return true; }
      if (a === 'wacc') { S.acc = S.acc === v ? '' : v; S.started = true; load(); return true; }
      if (a === 'wsup') { S.sup = S.sup === v ? '' : v; renderSoft(); return true; }
      return false;
    }
    return {
      reset: function () { S.started = false; S.data = null; S.st = 'idle'; S.rid++; S.mon = ''; },
      ensure: ensure, view: view, act: act,
      kpi: function (k) { S.k = k; S.mon = ''; renderSoft(); var el = HOST.querySelector('[data-tbl="w_tx"]'); if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'start' }); } catch (e) { /* ignore */ } } },
      chip: function (k) { S.k = k; renderSoft(); },
      input: function (n) {
        var f = n.getAttribute('data-wf'), v = n.value, was = f === 'acc' ? S.acc : f === 'sup' ? S.sup : S.mon; if (was === v) { return true; }
        if (f === 'acc') { S.acc = v; load(); } else if (f === 'sup') { S.sup = v; } else { S.mon = v; }
        renderSoft(); var el = HOST.querySelector('[data-wf="' + f + '"]'); if (el) { el.focus(); } return true;
      }
    };
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
